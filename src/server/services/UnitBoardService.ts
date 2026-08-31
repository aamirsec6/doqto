import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import type { ActorContext } from "@/server/domain/types";
import { publishUnitRevision } from "@/server/realtime/unitBus";
import { AuditRepository } from "@/server/repositories/AuditRepository";
import { buildWardFromLayout } from "@/lib/dashboard/layout";
import type {
  Alert,
  AssetStatus,
  BedStatus,
  LayoutConfig,
  LayoutZone,
  StaffStatus,
  WardSnapshot,
} from "@/lib/dashboard/types";
import { DEFAULT_STAFF_PIN } from "@/lib/oncology/constants";

function layoutToConfig(row: {
  id: string;
  hospitalName: string;
  contactName: string;
  contactRole: string;
  wardName: string;
  wardType: string;
  floorLabel: string;
  layoutStyle: string;
  trackAssets: boolean;
  zonesJson: unknown;
  calibrationJson: unknown;
}): LayoutConfig {
  return {
    version: 3,
    hospitalName: row.hospitalName,
    contactName: row.contactName,
    contactRole: row.contactRole,
    wardName: row.wardName,
    wardType: row.wardType as LayoutConfig["wardType"],
    floorLabel: row.floorLabel,
    layoutStyle: row.layoutStyle as LayoutConfig["layoutStyle"],
    zones: row.zonesJson as LayoutZone[],
    trackAssets: row.trackAssets,
    staffRoster: [],
    calibration: row.calibrationJson as LayoutConfig["calibration"],
    layoutId: row.id,
    createdAt: new Date().toISOString(),
  };
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw === "object") return raw as T;
  return fallback;
}

export class UnitBoardService {
  async getBoard(tenantId: string, layoutId: string) {
    const layout = await prisma.wardLayout.findFirst({
      where: { id: layoutId, tenantId },
    });
    if (!layout) throw new Error("Unit not found");

    await this.ensureSeeded(tenantId, layoutId, layout);

    const [beds, staff, assets, alerts] = await Promise.all([
      prisma.bed.findMany({ where: { tenantId, layoutId } }),
      prisma.staffMember.findMany({ where: { tenantId, layoutId } }),
      prisma.asset.findMany({ where: { tenantId, layoutId } }),
      prisma.alert.findMany({
        where: { tenantId, layoutId },
        orderBy: { raisedAt: "desc" },
        take: 50,
      }),
    ]);

    const config = layoutToConfig(layout);
    const fresh = buildWardFromLayout(config);

    const bedMap = new Map(beds.map((b) => [b.externalId, b]));
    const staffMap = new Map(staff.map((s) => [s.externalId, s]));
    const assetMap = new Map(assets.map((a) => [a.externalId, a]));

    const mergedBeds = fresh.beds.map((bed) => {
      const row = bedMap.get(bed.id);
      if (!row) return bed;
      return {
        ...bed,
        status: row.status as BedStatus,
        patientInitials: row.patientInitials ?? undefined,
        position:
          row.posX || row.posY
            ? { x: row.posX, y: row.posY }
            : bed.position,
      };
    });

    const mergedStaff = fresh.staff.map((person) => {
      const row = staffMap.get(person.id);
      if (!row) return person;
      return {
        ...person,
        status: row.status as StaffStatus,
        roomId: row.roomKey || person.roomId,
        lastSeenMin: row.lastSeenMin,
        position:
          row.posX || row.posY
            ? { x: row.posX, y: row.posY }
            : person.position,
      };
    });

    const mergedAssets = fresh.assets.map((asset) => {
      const row = assetMap.get(asset.id);
      if (!row) return asset;
      return {
        ...asset,
        status: row.status as AssetStatus,
        roomId: row.roomKey || asset.roomId,
        lastSeenMin: row.lastSeenMin,
      };
    });

    const mergedAlerts: Alert[] = alerts.map((a) => ({
      id: a.externalId,
      severity: a.severity as Alert["severity"],
      kind: a.kind as Alert["kind"],
      title: a.title,
      detail: a.detail,
      roomId: a.roomKey,
      raisedAt: a.raisedAt.toISOString(),
      lifecycle: a.lifecycle as Alert["lifecycle"],
      acknowledged: a.acknowledged,
      acknowledgedAt: a.acknowledgedAt?.toISOString(),
      acknowledgedBy: a.acknowledgedBy ?? undefined,
      dispatched: parseJson(a.dispatchedJson, undefined),
      nearestAssets: parseJson(a.nearestAssetsJson, undefined),
      hospitalIncidentId: a.hospitalIncidentId ?? undefined,
    }));

    const ward: WardSnapshot = {
      ...fresh,
      beds: mergedBeds,
      staff: mergedStaff,
      assets: mergedAssets,
      alerts: mergedAlerts.length ? mergedAlerts : fresh.alerts,
      updatedAt: new Date().toISOString(),
    };

    return { ward, revision: layout.revision, layoutId };
  }

  async ensureSeeded(
    tenantId: string,
    layoutId: string,
    layout?: Awaited<ReturnType<typeof prisma.wardLayout.findFirst>>,
  ) {
    const row =
      layout ??
      (await prisma.wardLayout.findFirst({ where: { id: layoutId, tenantId } }));
    if (!row) return;

    const existing = await prisma.bed.count({ where: { tenantId, layoutId } });
    if (existing > 0) return;

    const config = layoutToConfig(row);
    const fresh = buildWardFromLayout(config);

    await prisma.$transaction([
      prisma.bed.createMany({
        data: fresh.beds.map((b) => ({
          tenantId,
          layoutId,
          externalId: b.id,
          label: b.label,
          roomKey: b.roomId,
          status: b.status,
          posX: b.position.x,
          posY: b.position.y,
        })),
      }),
      prisma.asset.createMany({
        data: fresh.assets.map((a) => ({
          tenantId,
          layoutId,
          externalId: a.id,
          name: a.name,
          kind: a.kind,
          status: a.status,
          roomKey: a.roomId,
          posX: a.position.x,
          posY: a.position.y,
        })),
      }),
    ]);
  }

  private async bumpRevision(tenantId: string, layoutId: string) {
    const updated = await prisma.wardLayout.update({
      where: { id: layoutId },
      data: { revision: { increment: 1 } },
    });
    publishUnitRevision(layoutId, updated.revision);
    return updated.revision;
  }

  async setBedStatus(
    tenantId: string,
    layoutId: string,
    bedId: string,
    status: BedStatus,
    patientInitials: string | undefined,
    actor: ActorContext,
  ) {
    const bed = await prisma.bed.findFirst({
      where: { tenantId, layoutId, externalId: bedId },
    });
    if (!bed) throw new Error("Bed not found");

    await prisma.bed.update({
      where: { id: bed.id },
      data: {
        status,
        patientInitials: status === "occupied" ? patientInitials ?? "PT" : null,
      },
    });

    await new AuditRepository(prisma).append({
      tenantId,
      actor,
      action: "bed.status_change",
      entityType: "bed",
      entityId: bedId,
      entityLabel: bed.label,
      after: { status, patientInitials },
    });

    await this.bumpRevision(tenantId, layoutId);
    return this.getBoard(tenantId, layoutId);
  }

  async setStaffStatus(
    tenantId: string,
    layoutId: string,
    staffId: string,
    status: StaffStatus,
    roomKey: string | undefined,
    actor: ActorContext,
  ) {
    const staff = await prisma.staffMember.findFirst({
      where: { tenantId, externalId: staffId },
    });
    if (!staff) throw new Error("Staff not found");

    await prisma.staffMember.update({
      where: { id: staff.id },
      data: {
        status,
        ...(roomKey !== undefined ? { roomKey } : {}),
        layoutId,
      },
    });

    await new AuditRepository(prisma).append({
      tenantId,
      actor,
      action: "staff.status_change",
      entityType: "staff",
      entityId: staffId,
      entityLabel: staff.name,
      after: { status, roomKey },
    });

    await this.bumpRevision(tenantId, layoutId);
    return this.getBoard(tenantId, layoutId);
  }

  async syncStaffRoster(
    tenantId: string,
    layoutId: string,
    roster: { id: string; name: string; role: string }[],
    defaultRoomKey: string,
  ) {
    const pinHash = await bcrypt.hash(DEFAULT_STAFF_PIN, 10);
    for (const person of roster.filter((s) => s.name.trim())) {
      await prisma.staffMember.upsert({
        where: {
          tenantId_externalId: { tenantId, externalId: person.id },
        },
        create: {
          tenantId,
          layoutId,
          externalId: person.id,
          name: person.name.trim(),
          role: person.role.trim() || "Staff",
          status: "free",
          roomKey: defaultRoomKey,
          pinHash,
        },
        update: {
          name: person.name.trim(),
          role: person.role.trim() || "Staff",
          layoutId,
        },
      });
    }
  }

  async loginStaff(tenantId: string, staffId: string, pin: string) {
    const staff = await prisma.staffMember.findFirst({
      where: { tenantId, externalId: staffId },
    });
    if (!staff) throw new Error("Staff not found");
    const hash = staff.pinHash ?? (await bcrypt.hash(DEFAULT_STAFF_PIN, 10));
    const ok = await bcrypt.compare(pin, hash);
    if (!ok) throw new Error("Invalid PIN");
    return staff;
  }
}
