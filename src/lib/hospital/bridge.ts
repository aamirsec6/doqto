import { acknowledgeAlert, raiseAlert, saveOps } from "@/lib/dashboard/ops";
import type {
  Alert,
  LayoutConfig,
  ViewerRole,
  WardSnapshot,
} from "@/lib/dashboard/types";
import {
  acknowledgeIncident,
  raiseCode,
  resolveIncident,
} from "./incidents";
import { postIncidentRaiseMessages } from "./intercom";
import {
  ensureHospitalTenant,
  loadHospitalTenant,
  saveHospitalTenant,
  syncTenantFromWard,
} from "./store";
import type { HospitalCode, HospitalTenant } from "./types";
import { CODE_LABELS } from "./types";

export function codeFromWardAlert(alert: Alert): HospitalCode {
  const t = alert.title.toLowerCase();
  if (/doctor\s*needed|need(s)?\s*(a\s*)?doctor/i.test(t)) return "doctor_needed";
  if (/critical\s*patient|deteriorat/i.test(t)) return "critical_patient";
  if (/security/i.test(t) || alert.kind === "security") return "security";
  if (alert.kind === "emergency" || alert.severity === "critical") {
    return "code_blue";
  }
  return "info";
}

/** After ward raise: mirror into hospital tenant bus. */
export function publishWardAlertToHospital(
  layout: LayoutConfig,
  ward: WardSnapshot,
  alert: Alert,
  code?: HospitalCode,
): HospitalTenant {
  const tenant = ensureHospitalTenant(layout, ward);
  const unitId =
    tenant.units[0]?.id ??
    `unit-${layout.wardName.toLowerCase().replace(/\s+/g, "-") || "ward"}`;
  const roomLabel =
    ward.rooms.find((r) => r.id === alert.roomId)?.label ?? alert.roomId;

  // Skip if already linked
  if (tenant.incidents.some((i) => i.wardAlertId === alert.id)) {
    return tenant;
  }

  const resolvedCode = code ?? codeFromWardAlert(alert);
  const { tenant: next, incident } = raiseCode(tenant, {
    code: resolvedCode,
    roomId: alert.roomId,
    roomLabel,
    sourceWard: ward.ward,
    unitId,
    title: alert.title.startsWith(CODE_LABELS[resolvedCode])
      ? alert.title
      : `${CODE_LABELS[resolvedCode]} · ${roomLabel}`,
    detail: alert.detail,
    wardAlertId: alert.id,
    ward,
    pageStaffIds: alert.dispatched ? [alert.dispatched.staffId] : undefined,
  });

  postIncidentRaiseMessages(next, incident);
  return next;
}

/** Ops board raised an incident — also create a ward alert when layout/ops exist. */
export function raiseHospitalCodeWithWard(
  layout: LayoutConfig,
  ward: WardSnapshot,
  input: {
    code: HospitalCode;
    roomId: string;
    actorRole: ViewerRole;
    title?: string;
    detail?: string;
  },
): { ward: WardSnapshot; tenant: HospitalTenant; alertId: string; incidentId: string } {
  const roomLabel =
    ward.rooms.find((r) => r.id === input.roomId)?.label ?? input.roomId;
  const title =
    input.title ?? `${CODE_LABELS[input.code]} · ${roomLabel}`;
  const detail =
    input.detail ?? `${CODE_LABELS[input.code]} in ${roomLabel}`;

  const severity =
    input.code === "info"
      ? ("info" as const)
      : input.code === "doctor_needed"
        ? ("urgent" as const)
        : ("critical" as const);
  const kind =
    input.code === "security"
      ? ("security" as const)
      : input.code === "info"
        ? ("clinical" as const)
        : ("emergency" as const);

  const nextWard = raiseAlert(
    ward,
    {
      severity,
      kind,
      title,
      detail,
      roomId: input.roomId,
      autoDispatch:
        input.code === "code_blue" ||
        input.code === "critical_patient" ||
        input.code === "doctor_needed",
    },
    { actorRole: input.actorRole },
  );

  const alert = nextWard.alerts[0]!;
  saveOps(nextWard);

  let tenant = syncTenantFromWard(
    layout,
    nextWard,
    loadHospitalTenant() ?? ensureHospitalTenant(layout, nextWard),
  );

  const unitId =
    tenant.units[0]?.id ??
    `unit-${layout.wardName.toLowerCase().replace(/\s+/g, "-") || "ward"}`;

  const { tenant: withIncident, incident } = raiseCode(tenant, {
    code: input.code,
    roomId: input.roomId,
    roomLabel,
    sourceWard: nextWard.ward,
    unitId,
    title,
    detail: alert.detail,
    wardAlertId: alert.id,
    ward: nextWard,
    pageStaffIds: alert.dispatched ? [alert.dispatched.staffId] : undefined,
  });

  // Stamp hospitalIncidentId onto alert via ops save
  const stamped: WardSnapshot = {
    ...nextWard,
    alerts: nextWard.alerts.map((a) =>
      a.id === alert.id ? { ...a, hospitalIncidentId: incident.id } : a,
    ),
  };
  saveOps(stamped);

  // Keep incident wardAlertId (already set)
  const linked = {
    ...withIncident,
    incidents: withIncident.incidents.map((i) =>
      i.id === incident.id ? { ...i, wardAlertId: alert.id } : i,
    ),
  };
  saveHospitalTenant(linked);
  postIncidentRaiseMessages(linked, {
    ...incident,
    wardAlertId: alert.id,
  });

  return {
    ward: stamped,
    tenant: linked,
    alertId: alert.id,
    incidentId: incident.id,
  };
}

/** Ack on hospital board → mirror ward alert if linked. */
export function acknowledgeFromHospital(
  layout: LayoutConfig,
  ward: WardSnapshot,
  tenant: HospitalTenant,
  incidentId: string,
  actor: { staffId?: string; staffName: string; actorRole: ViewerRole },
): { ward: WardSnapshot; tenant: HospitalTenant } {
  const nextTenant = acknowledgeIncident(tenant, incidentId, actor);
  const incident = nextTenant.incidents.find((i) => i.id === incidentId);
  let nextWard = syncStaffStatuses(ward, nextTenant);

  if (incident?.wardAlertId) {
    nextWard = acknowledgeAlert(nextWard, incident.wardAlertId, {
      actorRole: actor.actorRole,
    });
    // Ensure hospitalIncidentId retained
    nextWard = {
      ...nextWard,
      alerts: nextWard.alerts.map((a) =>
        a.id === incident.wardAlertId
          ? { ...a, hospitalIncidentId: incident.id }
          : a,
      ),
    };
  }

  saveOps(nextWard);
  const synced = syncTenantFromWard(layout, nextWard, nextTenant);
  saveHospitalTenant(synced);
  return { ward: nextWard, tenant: synced };
}

/** Ack on ward board → mirror hospital incident if linked. */
export function acknowledgeFromWard(
  layout: LayoutConfig,
  ward: WardSnapshot,
  alertId: string,
  actorRole: ViewerRole,
): { ward: WardSnapshot; tenant: HospitalTenant } {
  const nextWard = acknowledgeAlert(ward, alertId, { actorRole });
  saveOps(nextWard);

  let tenant = ensureHospitalTenant(layout, nextWard);
  const alert = nextWard.alerts.find((a) => a.id === alertId);
  const incident =
    tenant.incidents.find((i) => i.wardAlertId === alertId) ??
    (alert?.hospitalIncidentId
      ? tenant.incidents.find((i) => i.id === alert.hospitalIncidentId)
      : undefined);

  if (incident && incident.lifecycle !== "resolved" && incident.acks.length === 0) {
    const name =
      alert?.dispatched?.staffName ??
      (actorRole === "nurse" ? "Nurse" : "Charge");
    tenant = acknowledgeIncident(tenant, incident.id, {
      staffId: alert?.dispatched?.staffId,
      staffName: name,
    });
  }

  tenant = syncTenantFromWard(layout, nextWard, tenant);
  saveHospitalTenant(tenant);
  return { ward: nextWard, tenant };
}

export function resolveFromHospital(
  layout: LayoutConfig,
  ward: WardSnapshot,
  tenant: HospitalTenant,
  incidentId: string,
  resolvedBy?: string,
): { ward: WardSnapshot; tenant: HospitalTenant } {
  const nextTenant = resolveIncident(tenant, incidentId, resolvedBy);
  const incident = nextTenant.incidents.find((i) => i.id === incidentId);
  let nextWard = syncStaffStatuses(ward, nextTenant);

  if (incident?.wardAlertId) {
    nextWard = {
      ...nextWard,
      alerts: nextWard.alerts.map((a) =>
        a.id === incident.wardAlertId
          ? {
              ...a,
              lifecycle: "resolved" as const,
              acknowledged: true,
              hospitalIncidentId: incident.id,
            }
          : a,
      ),
      updatedAt: new Date().toISOString(),
    };
  }

  saveOps(nextWard);
  const synced = syncTenantFromWard(layout, nextWard, nextTenant);
  saveHospitalTenant(synced);
  return { ward: nextWard, tenant: synced };
}

function syncStaffStatuses(
  ward: WardSnapshot,
  tenant: HospitalTenant,
): WardSnapshot {
  const byId = new Map(tenant.staffDirectory.map((s) => [s.id, s.status]));
  return {
    ...ward,
    staff: ward.staff.map((s) => {
      const status = byId.get(s.id);
      return status ? { ...s, status } : s;
    }),
    updatedAt: new Date().toISOString(),
  };
}
