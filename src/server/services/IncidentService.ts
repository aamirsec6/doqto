import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { ActorContext, IncidentCode } from "@/server/domain/types";
import { AuditRepository } from "@/server/repositories/AuditRepository";
import {
  AlertRepository,
  IncidentRepository,
  LayoutRepository,
  MessageRepository,
  StaffRepository,
} from "@/server/repositories/OpsRepositories";

const CODE_LABELS: Record<IncidentCode, string> = {
  code_blue: "Code Blue",
  doctor_needed: "Doctor needed",
  critical_patient: "Critical patient",
  security: "Security",
  info: "Info broadcast",
};

export class IncidentService {
  async raise(input: {
    tenantId: string;
    code: IncidentCode;
    roomKey: string;
    roomLabel?: string;
    sourceWard?: string;
    title?: string;
    detail?: string;
    pageStaffIds?: string[];
    actor: ActorContext;
  }) {
    return prisma.$transaction(async (tx) => {
      const incidents = new IncidentRepository(tx);
      const messages = new MessageRepository(tx);
      const alerts = new AlertRepository(tx);
      const staff = new StaffRepository(tx);
      const audits = new AuditRepository(tx);
      const layout = new LayoutRepository(tx);

      const rooms = await layout.listRooms(input.tenantId);
      const room =
        rooms.find((r) => r.key === input.roomKey) ||
        rooms.find((r) => r.id === input.roomKey);
      const roomLabel =
        input.roomLabel || room?.label || input.roomKey || "Unknown";
      const wardLayout = await layout.get(input.tenantId);
      const sourceWard =
        input.sourceWard || wardLayout?.wardName || "Ward";

      let pageStaffIds = input.pageStaffIds ?? [];
      if (!pageStaffIds.length && input.code !== "info") {
        const directory = await staff.list(input.tenantId);
        const free = directory.filter((s) => s.status === "free");
        const preferDoctor =
          input.code === "doctor_needed" ||
          input.code === "code_blue" ||
          input.code === "critical_patient";
        const ranked = [...free].sort((a, b) => {
          const score = (role: string) => {
            if (/physician|doctor|dr\.?|registrar|resident/i.test(role)) return 0;
            if (/nurse|charge/i.test(role)) return 1;
            return 2;
          };
          return preferDoctor ? score(a.role) - score(b.role) : 0;
        });
        if (ranked[0]) pageStaffIds = [ranked[0].id];
      }

      const raisedAt = new Date();
      const title =
        input.title ?? `${CODE_LABELS[input.code]} · ${roomLabel}`;
      const detail =
        input.detail ?? `${CODE_LABELS[input.code]} in ${roomLabel}`;
      const lifecycle = pageStaffIds.length ? "dispatched" : "open";

      const timeline = [
        {
          id: `tl-${Date.now()}`,
          at: raisedAt.toISOString(),
          label: "Raised",
          detail,
        },
        ...(pageStaffIds.length
          ? [
              {
                id: `tl-${Date.now()}-p`,
                at: raisedAt.toISOString(),
                label: "Paged",
                detail: pageStaffIds.join(", "),
              },
            ]
          : []),
      ];

      const incident = await incidents.create(input.tenantId, {
        code: input.code,
        title,
        detail,
        lifecycle,
        sourceWard,
        roomKey: input.roomKey,
        roomLabel,
        raisedAt,
        pagedStaffIds: pageStaffIds,
        acksJson: [],
        timelineJson: timeline,
      });

      for (const sid of pageStaffIds) {
        await staff.setStatus(input.tenantId, sid, "responding");
      }

      const severity =
        input.code === "info"
          ? "info"
          : input.code === "doctor_needed"
            ? "urgent"
            : "critical";
      const kind =
        input.code === "security"
          ? "security"
          : input.code === "info"
            ? "clinical"
            : "emergency";

      const alert = await alerts.create(input.tenantId, {
        externalId: `al-${incident.id}`,
        severity,
        kind,
        title,
        detail,
        roomKey: input.roomKey,
        raisedAt,
        lifecycle,
        hospitalIncidentId: incident.id,
        dispatchedJson: pageStaffIds[0]
          ? {
              staffId: pageStaffIds[0],
              dispatchedAt: raisedAt.toISOString(),
            }
          : undefined,
      });

      await tx.incident.update({
        where: { id: incident.id },
        data: { wardAlertId: alert.id },
      });

      const body = `${CODE_LABELS[input.code]} · ${roomLabel} · ${sourceWard}`;
      const priority =
        input.code === "code_blue" || input.code === "critical_patient"
          ? "critical"
          : input.code === "info"
            ? "normal"
            : "urgent";

      const msgRows: Prisma.MessageCreateManyInput[] = [
        {
          tenantId: input.tenantId,
          channelId: `ch-incident-${incident.id}`,
          channelKind: "incident",
          body,
          kind: "code_raise",
          authorId: input.actor.id || "system",
          authorName: input.actor.name || "Hospital ops",
          authorRole: input.actor.type,
          incidentId: incident.id,
          priority,
        },
        {
          tenantId: input.tenantId,
          channelId: "ch-broadcast",
          channelKind: "broadcast",
          body,
          kind: "code_raise",
          authorId: input.actor.id || "system",
          authorName: input.actor.name || "Hospital ops",
          authorRole: input.actor.type,
          incidentId: incident.id,
          priority,
        },
      ];
      for (const sid of pageStaffIds) {
        msgRows.push({
          tenantId: input.tenantId,
          channelId: `ch-staff-${sid}`,
          channelKind: "staff",
          body: `You were paged: ${body}`,
          kind: "concern",
          authorId: input.actor.id || "system",
          authorName: input.actor.name || "Hospital ops",
          authorRole: input.actor.type,
          incidentId: incident.id,
          targetStaffId: sid,
          priority,
        });
      }
      await messages.createMany(input.tenantId, msgRows);

      await audits.append({
        tenantId: input.tenantId,
        actor: input.actor,
        action: "incident.raise",
        entityType: "incident",
        entityId: incident.id,
        entityLabel: title,
        after: {
          code: input.code,
          roomKey: input.roomKey,
          lifecycle,
          pageStaffIds,
        },
      });

      return { incident, alert };
    });
  }

  async acknowledge(input: {
    tenantId: string;
    incidentId: string;
    actor: ActorContext;
    staffId?: string;
    staffName: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const incidents = new IncidentRepository(tx);
      const alerts = new AlertRepository(tx);
      const staff = new StaffRepository(tx);
      const messages = new MessageRepository(tx);
      const audits = new AuditRepository(tx);

      const incident = await incidents.find(input.tenantId, input.incidentId);
      if (!incident) throw new Error("Incident not found");
      if (incident.lifecycle === "resolved") return incident;

      const at = new Date();
      const acks = Array.isArray(incident.acksJson)
        ? [...(incident.acksJson as object[])]
        : [];
      acks.push({
        staffId: input.staffId ?? "",
        staffName: input.staffName,
        at: at.toISOString(),
      });
      const timeline = Array.isArray(incident.timelineJson)
        ? [...(incident.timelineJson as object[])]
        : [];
      timeline.push({
        id: `tl-ack-${Date.now()}`,
        at: at.toISOString(),
        label: "Acknowledged",
        detail: input.staffName,
      });

      await incidents.update(input.tenantId, incident.id, {
        lifecycle: "responding",
        acksJson: acks,
        timelineJson: timeline,
      });

      if (input.staffId) {
        await staff.setStatus(input.tenantId, input.staffId, "responding");
      }

      if (incident.wardAlertId) {
        await alerts.update(input.tenantId, incident.wardAlertId, {
          acknowledged: true,
          acknowledgedAt: at,
          acknowledgedBy: input.staffName,
          lifecycle: "responding",
        });
      }

      await messages.create(input.tenantId, {
        channelId: `ch-incident-${incident.id}`,
        channelKind: "incident",
        body: `${input.staffName} acknowledged`,
        kind: "ack",
        authorId: input.staffId || input.actor.id || "staff",
        authorName: input.staffName,
        authorRole: input.actor.type,
        incidentId: incident.id,
        priority: "urgent",
      });

      await audits.append({
        tenantId: input.tenantId,
        actor: { ...input.actor, name: input.staffName },
        action: "incident.acknowledge",
        entityType: "incident",
        entityId: incident.id,
        entityLabel: incident.title,
        after: { lifecycle: "responding", by: input.staffName },
      });

      return incidents.find(input.tenantId, incident.id);
    });
  }

  async resolve(input: {
    tenantId: string;
    incidentId: string;
    actor: ActorContext;
    resolvedBy?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const incidents = new IncidentRepository(tx);
      const alerts = new AlertRepository(tx);
      const staff = new StaffRepository(tx);
      const audits = new AuditRepository(tx);

      const incident = await incidents.find(input.tenantId, input.incidentId);
      if (!incident) throw new Error("Incident not found");
      if (incident.lifecycle === "resolved") return incident;

      const at = new Date();
      const timeline = Array.isArray(incident.timelineJson)
        ? [...(incident.timelineJson as object[])]
        : [];
      timeline.push({
        id: `tl-res-${Date.now()}`,
        at: at.toISOString(),
        label: "Resolved",
        detail: input.resolvedBy ? `By ${input.resolvedBy}` : undefined,
      });

      const paged = Array.isArray(incident.pagedStaffIds)
        ? (incident.pagedStaffIds as string[])
        : [];
      for (const sid of paged) {
        await staff.setStatus(input.tenantId, sid, "free");
      }

      await incidents.update(input.tenantId, incident.id, {
        lifecycle: "resolved",
        resolvedAt: at,
        timelineJson: timeline,
      });

      if (incident.wardAlertId) {
        await alerts.update(input.tenantId, incident.wardAlertId, {
          lifecycle: "resolved",
          acknowledged: true,
        });
      }

      await audits.append({
        tenantId: input.tenantId,
        actor: input.actor,
        action: "incident.resolve",
        entityType: "incident",
        entityId: incident.id,
        entityLabel: incident.title,
        after: { lifecycle: "resolved", by: input.resolvedBy },
      });

      return incidents.find(input.tenantId, incident.id);
    });
  }
}
