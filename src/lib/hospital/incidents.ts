import {
  findNearestResponder,
  responderLabel,
} from "@/lib/dashboard/dispatch";
import type { WardSnapshot } from "@/lib/dashboard/types";
import type {
  HospitalCode,
  HospitalIncident,
  HospitalTenant,
  TimelineEvent,
} from "./types";
import { CODE_LABELS } from "./types";
import { saveHospitalTenant } from "./store";

function stampTimeline(
  label: string,
  detail?: string,
): TimelineEvent {
  return {
    id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    label,
    detail,
  };
}

function autoPageStaffIds(
  tenant: HospitalTenant,
  ward: WardSnapshot | null,
  roomId: string,
  code: HospitalCode,
): string[] {
  if (code === "info" || code === "security") return [];

  if (ward) {
    const nearest = findNearestResponder(ward, roomId);
    if (nearest) return [nearest.id];
  }

  const free = tenant.staffDirectory.filter((s) => s.status === "free");
  const preferDoctor =
    code === "doctor_needed" || code === "code_blue" || code === "critical_patient";
  const ranked = [...free].sort((a, b) => {
    const score = (role: string) => {
      if (/physician|doctor|dr\.?|registrar|resident|consultant/i.test(role))
        return 0;
      if (/nurse|charge/i.test(role)) return 1;
      return 2;
    };
    if (!preferDoctor) return 0;
    return score(a.role) - score(b.role);
  });
  return ranked[0] ? [ranked[0].id] : [];
}

export function raiseCode(
  tenant: HospitalTenant,
  input: {
    code: HospitalCode;
    roomId: string;
    roomLabel: string;
    sourceWard: string;
    unitId: string;
    title?: string;
    detail?: string;
    wardAlertId?: string;
    ward?: WardSnapshot | null;
    pageStaffIds?: string[];
  },
): { tenant: HospitalTenant; incident: HospitalIncident } {
  const raisedAt = new Date().toISOString();
  const title =
    input.title ??
    `${CODE_LABELS[input.code]} · ${input.roomLabel || input.sourceWard}`;
  const detail =
    input.detail ??
    `${CODE_LABELS[input.code]} in ${input.roomLabel || input.sourceWard}`;

  const pagedStaffIds =
    input.pageStaffIds ??
    autoPageStaffIds(tenant, input.ward ?? null, input.roomId, input.code);

  const pagedNames = pagedStaffIds
    .map((id) => tenant.staffDirectory.find((s) => s.id === id)?.name)
    .filter(Boolean) as string[];

  const lifecycle =
    pagedStaffIds.length > 0 ? ("dispatched" as const) : ("open" as const);

  const timeline: TimelineEvent[] = [
    stampTimeline("Raised", detail),
  ];
  if (pagedNames.length) {
    timeline.push(
      stampTimeline(
        "Paged",
        pagedNames.join(", "),
      ),
    );
  }

  let staffDirectory = tenant.staffDirectory;
  if (pagedStaffIds.length) {
    staffDirectory = tenant.staffDirectory.map((s) =>
      pagedStaffIds.includes(s.id)
        ? { ...s, status: "responding" as const }
        : s,
    );
  }

  const incident: HospitalIncident = {
    id: `hi-${Date.now()}`,
    code: input.code,
    title,
    detail,
    lifecycle,
    sourceWard: input.sourceWard,
    unitId: input.unitId,
    roomId: input.roomId,
    roomLabel: input.roomLabel,
    raisedAt,
    wardAlertId: input.wardAlertId,
    pagedStaffIds,
    acks: [],
    timeline,
  };

  const next: HospitalTenant = {
    ...tenant,
    staffDirectory,
    incidents: [incident, ...tenant.incidents],
    updatedAt: raisedAt,
  };

  saveHospitalTenant(next);
  return { tenant: next, incident };
}

export function pageStaff(
  tenant: HospitalTenant,
  incidentId: string,
  staffIds: string[],
): HospitalTenant {
  const incident = tenant.incidents.find((i) => i.id === incidentId);
  if (!incident || incident.lifecycle === "resolved") return tenant;

  const merged = [
    ...new Set([...incident.pagedStaffIds, ...staffIds]),
  ];
  const names = staffIds
    .map((id) => tenant.staffDirectory.find((s) => s.id === id)?.name)
    .filter(Boolean);

  const next: HospitalTenant = {
    ...tenant,
    staffDirectory: tenant.staffDirectory.map((s) =>
      staffIds.includes(s.id) ? { ...s, status: "responding" as const } : s,
    ),
    incidents: tenant.incidents.map((i) =>
      i.id === incidentId
        ? {
            ...i,
            pagedStaffIds: merged,
            lifecycle:
              i.lifecycle === "open" ? ("dispatched" as const) : i.lifecycle,
            timeline: [
              ...i.timeline,
              stampTimeline("Paged", names.join(", ") || undefined),
            ],
          }
        : i,
    ),
  };

  saveHospitalTenant(next);
  return next;
}

export function acknowledgeIncident(
  tenant: HospitalTenant,
  incidentId: string,
  actor: { staffId?: string; staffName: string },
): HospitalTenant {
  const incident = tenant.incidents.find((i) => i.id === incidentId);
  if (!incident || incident.lifecycle === "resolved") return tenant;
  if (incident.acks.some((a) => a.staffName === actor.staffName)) {
    return tenant;
  }

  const at = new Date().toISOString();
  const next: HospitalTenant = {
    ...tenant,
    staffDirectory: tenant.staffDirectory.map((s) => {
      if (actor.staffId && s.id === actor.staffId) {
        return { ...s, status: "responding" as const };
      }
      if (
        !actor.staffId &&
        incident.pagedStaffIds.includes(s.id) &&
        s.name === actor.staffName
      ) {
        return { ...s, status: "responding" as const };
      }
      return s;
    }),
    incidents: tenant.incidents.map((i) =>
      i.id === incidentId
        ? {
            ...i,
            lifecycle: "responding" as const,
            acks: [
              ...i.acks,
              {
                staffId: actor.staffId ?? i.pagedStaffIds[0] ?? "unknown",
                staffName: actor.staffName,
                at,
              },
            ],
            timeline: [
              ...i.timeline,
              stampTimeline("Acknowledged", actor.staffName),
            ],
          }
        : i,
    ),
  };

  saveHospitalTenant(next);
  return next;
}

export function resolveIncident(
  tenant: HospitalTenant,
  incidentId: string,
  resolvedBy?: string,
): HospitalTenant {
  const incident = tenant.incidents.find((i) => i.id === incidentId);
  if (!incident || incident.lifecycle === "resolved") return tenant;

  const at = new Date().toISOString();
  const next: HospitalTenant = {
    ...tenant,
    staffDirectory: tenant.staffDirectory.map((s) =>
      incident.pagedStaffIds.includes(s.id) && s.status === "responding"
        ? { ...s, status: "free" as const }
        : s,
    ),
    incidents: tenant.incidents.map((i) =>
      i.id === incidentId
        ? {
            ...i,
            lifecycle: "resolved" as const,
            resolvedAt: at,
            timeline: [
              ...i.timeline,
              stampTimeline(
                "Resolved",
                resolvedBy ? `By ${resolvedBy}` : undefined,
              ),
            ],
          }
        : i,
    ),
  };

  saveHospitalTenant(next);
  return next;
}

/** Prefer free clinician label from ward dispatch helpers when available. */
export function defaultAckName(
  tenant: HospitalTenant,
  incident: HospitalIncident,
  ward?: WardSnapshot | null,
): string {
  if (incident.pagedStaffIds[0]) {
    const fromDir = tenant.staffDirectory.find(
      (s) => s.id === incident.pagedStaffIds[0],
    );
    if (fromDir) return fromDir.name;
  }
  if (ward) {
    const nearest = findNearestResponder(ward, incident.roomId);
    if (nearest) return responderLabel(nearest);
  }
  return "Staff";
}

export function activeIncidents(tenant: HospitalTenant): HospitalIncident[] {
  return tenant.incidents.filter((i) => i.lifecycle !== "resolved");
}
