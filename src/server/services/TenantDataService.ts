import { prisma } from "@/server/db/prisma";
import type { ActorContext } from "@/server/domain/types";
import { AuditRepository } from "@/server/repositories/AuditRepository";
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
  async getSnapshot(tenantId: string) {
    const layoutRepo = new LayoutRepository(prisma);
    const staffRepo = new StaffRepository(prisma);
    const [tenant, layout, rooms, staff, incidents, messages, alerts, audits] =
      await Promise.all([
        prisma.tenant.findUnique({ where: { id: tenantId } }),
        layoutRepo.get(tenantId),
        layoutRepo.listRooms(tenantId),
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

    return {
      tenant,
      layout,
      rooms,
      staff,
      incidents,
      messages,
      alerts,
      recentAudits: audits,
    };
  }

  async saveLayout(input: {
    tenantId: string;
    layout: LayoutPayload;
    actor: ActorContext;
  }) {
    return prisma.$transaction(async (tx) => {
      const layouts = new LayoutRepository(tx);
      const staff = new StaffRepository(tx);
      const audits = new AuditRepository(tx);

      await layouts.upsert(input.tenantId, {
        hospitalName: input.layout.hospitalName,
        contactName: input.layout.contactName,
        contactRole: input.layout.contactRole,
        wardName: input.layout.wardName,
        wardType: input.layout.wardType,
        floorLabel: input.layout.floorLabel,
        layoutStyle: input.layout.layoutStyle,
        trackAssets: input.layout.trackAssets,
        zonesJson: input.layout.zones,
        calibrationJson: input.layout.calibration ?? null,
        mapVersion: 2,
      });

      const ppm = defaultPixelsPerMetre(
        input.layout.calibration as { pixelsPerMetre: number } | undefined,
      );

      await layouts.replaceRooms(
        input.tenantId,
        input.layout.zones.map((z) => ({
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

      const roster = input.layout.staffRoster.filter((s) => s.name.trim());
      await staff.upsertMany(
        input.tenantId,
        roster.map((s) => ({
          externalId: s.id,
          name: s.name.trim(),
          role: s.role || "Staff",
          status: "free",
          roomKey:
            input.layout.zones.find((z) => z.kind === "nursing")?.id ||
            input.layout.zones.find((z) => z.kind === "opd_registration")?.id ||
            input.layout.zones[0]?.id ||
            "",
        })),
      );

      await audits.append({
        tenantId: input.tenantId,
        actor: input.actor,
        action: "layout.save",
        entityType: "layout",
        entityId: input.tenantId,
        entityLabel: input.layout.wardName,
        after: {
          zones: input.layout.zones.length,
          roster: roster.length,
        },
      });

      return layouts.get(input.tenantId);
    });
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
