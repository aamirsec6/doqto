import { prisma } from "@/server/db/prisma";
import type { ActorContext } from "@/server/domain/types";
import type { CampusPayload, CampusUnitPayload } from "@/server/domain/campus";
import { AuditRepository } from "@/server/repositories/AuditRepository";
import { FloorRepository } from "@/server/repositories/FloorRepository";
import {
  LayoutRepository,
  StaffRepository,
} from "@/server/repositories/OpsRepositories";

import { verticesToSvgPath, defaultPixelsPerMetre } from "@/lib/map/geometry";
import type { Point } from "@/lib/dashboard/types";

/** Shape matching client LayoutConfig for import/save. */
export interface LayoutPayload {
  hospitalName: string;
  contactName: string;
  contactRole: string;
  wardName: string;
  wardType: string;
  floorLabel: string;
  layoutStyle: string;
  trackAssets: boolean;
  calibration?: { pixelsPerMetre: number; reference?: unknown };
  zones: {
    id: string;
    label: string;
    kind: string;
    bedCount: number;
    parentId?: string;
    verticesM?: Point[];
  }[];
  staffRoster: { id: string; name: string; role: string }[];
}

export class TenantDataService {
  async getSnapshot(tenantId: string, layoutId?: string) {
    const layoutRepo = new LayoutRepository(prisma);
    const floorRepo = new FloorRepository(prisma);
    const staffRepo = new StaffRepository(prisma);

    const [
      tenant,
      floors,
      layouts,
      staff,
      incidents,
      messages,
      alerts,
      audits,
    ] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      floorRepo.list(tenantId),
      layoutRepo.listForTenant(tenantId),
      staffRepo.list(tenantId),
      prisma.incident.findMany({
        where: { tenantId },
        orderBy: { raisedAt: "desc" },
        take: 50,
      }),
      prisma.message.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.alert.findMany({
        where: { tenantId },
        orderBy: { raisedAt: "desc" },
        take: 100,
      }),
      prisma.auditEvent.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const activeLayoutId =
      layoutId ?? layouts[0]?.id ?? floors[0]?.layouts[0]?.id;
    const rooms = activeLayoutId
      ? await layoutRepo.listRooms(activeLayoutId)
      : [];

    return {
      tenant,
      floors,
      layouts,
      layout: activeLayoutId
        ? layouts.find((l) => l.id === activeLayoutId) ?? layouts[0] ?? null
        : null,
      rooms,
      staff,
      incidents,
      messages,
      alerts,
      recentAudits: audits,
    };
  }

  async saveCampus(input: {
    tenantId: string;
    campus: CampusPayload;
    actor: ActorContext;
  }) {
    return prisma.$transaction(async (tx) => {
      const floors = new FloorRepository(tx);
      const layouts = new LayoutRepository(tx);
      const staff = new StaffRepository(tx);
      const audits = new AuditRepository(tx);

      const floorIds: string[] = [];
      const layoutIds: string[] = [];

      for (const [fi, floor] of input.campus.floors.entries()) {
        const floorId = floor.id ?? `floor-${fi}`;
        floorIds.push(floorId);
        await floors.upsert(input.tenantId, floorId, {
          label: floor.label,
          building: floor.building ?? "",
          sortOrder: floor.sortOrder ?? fi,
        });

        for (const unit of floor.units) {
          const layoutId =
            unit.id ?? `unit-${floorId}-${unit.wardName.replace(/\s+/g, "-").toLowerCase()}`;
          layoutIds.push(layoutId);
          const saved = await layouts.upsertForFloor(
            input.tenantId,
            floorId,
            layoutId,
            {
              hospitalName: input.campus.hospitalName,
              contactName: input.campus.contactName,
              contactRole: input.campus.contactRole,
              wardName: unit.wardName,
              wardType: unit.wardType,
              floorLabel: floor.label,
              layoutStyle: unit.layoutStyle,
              trackAssets: unit.trackAssets,
              zonesJson: unit.zones,
              calibrationJson: unit.calibration ?? null,
              mapVersion: 2,
            },
          );

          const ppm = defaultPixelsPerMetre(
            unit.calibration as { pixelsPerMetre: number } | undefined,
          );

          await layouts.replaceRooms(
            input.tenantId,
            saved.id,
            unit.zones.map((z) => ({
              key: z.id,
              label: z.label,
              kind: z.kind,
              path:
                z.verticesM && z.verticesM.length >= 3
                  ? verticesToSvgPath(z.verticesM, ppm)
                  : "",
              parentKey: z.parentId ?? null,
              verticesJson: z.verticesM ?? null,
            })),
          );
        }
      }

      await layouts.deleteLayoutsExcept(input.tenantId, layoutIds);
      await floors.deleteExcept(input.tenantId, floorIds);

      const roster = input.campus.staffRoster.filter((s) => s.name.trim());
      const firstUnit = input.campus.floors[0]?.units[0];
      const defaultRoomKey =
        firstUnit?.zones.find((z) => z.kind === "nursing")?.id ||
        firstUnit?.zones.find((z) => z.kind === "opd_registration")?.id ||
        firstUnit?.zones[0]?.id ||
        "";

      await staff.upsertMany(
        input.tenantId,
        roster.map((s) => ({
          externalId: s.id,
          name: s.name.trim(),
          role: s.role || "Staff",
          status: "free",
          roomKey: defaultRoomKey,
        })),
      );

      await audits.append({
        tenantId: input.tenantId,
        actor: input.actor,
        action: "campus.save",
        entityType: "campus",
        entityId: input.tenantId,
        entityLabel: input.campus.hospitalName,
        after: {
          floors: input.campus.floors.length,
          units: layoutIds.length,
          roster: roster.length,
        },
      });

      return {
        floors: await floors.list(input.tenantId),
        layouts: await layouts.listForTenant(input.tenantId),
      };
    });
  }

  /** @deprecated use saveCampus */
  async saveLayout(input: {
    tenantId: string;
    layout: LayoutPayload;
    actor: ActorContext;
  }) {
    const campus: CampusPayload = {
      hospitalName: input.layout.hospitalName,
      contactName: input.layout.contactName,
      contactRole: input.layout.contactRole,
      staffRoster: input.layout.staffRoster,
      floors: [
        {
          label: input.layout.floorLabel || "Ground",
          units: [
            {
              floorId: "legacy-floor",
              wardName: input.layout.wardName,
              wardType: input.layout.wardType,
              layoutStyle: input.layout.layoutStyle,
              trackAssets: input.layout.trackAssets,
              calibration: input.layout.calibration,
              zones: input.layout.zones as CampusUnitPayload["zones"],
            },
          ],
        },
      ],
    };
    const result = await this.saveCampus({
      tenantId: input.tenantId,
      campus,
      actor: input.actor,
    });
    return result.layouts[0] ?? null;
  }

  async setStaffStatus(input: {
    tenantId: string;
    staffId: string;
    status: string;
    roomKey?: string;
    actor: ActorContext;
  }) {
    return prisma.$transaction(async (tx) => {
      const staff = new StaffRepository(tx);
      const audits = new AuditRepository(tx);
      const before = await staff.find(input.tenantId, input.staffId);
      if (!before) throw new Error("Staff not found");
      await staff.setStatus(
        input.tenantId,
        input.staffId,
        input.status,
        input.roomKey,
      );
      await audits.append({
        tenantId: input.tenantId,
        actor: input.actor,
        action: "staff.status_change",
        entityType: "staff",
        entityId: input.staffId,
        entityLabel: before.name,
        before: { status: before.status, roomKey: before.roomKey },
        after: { status: input.status, roomKey: input.roomKey ?? before.roomKey },
      });
      return staff.find(input.tenantId, input.staffId);
    });
  }
}
