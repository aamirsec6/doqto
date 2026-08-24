import {
  findNearestEmergencyAssets,
  findNearestResponder,
  responderLabel,
} from "./dispatch";
import {
  OPS_STORAGE_KEY,
  buildWardFromLayout,
  mergeWardWithLayout,
  opsStorageKey,
  wardSummary,
} from "./layout";
import { roomCenter } from "./status";
import { logTrainingEvent } from "./training";
import type {
  Alert,
  AlertKind,
  AlertSeverity,
  AssetStatus,
  BedStatus,
  LayoutConfig,
  StaffStatus,
  ViewerRole,
  WardSnapshot,
} from "./types";

export type OpsContext = {
  actorRole: ViewerRole;
};

export function loadOps(layout: LayoutConfig): WardSnapshot {
  if (typeof window === "undefined") return buildWardFromLayout(layout);
  const key = opsStorageKey(layout.layoutId);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return buildWardFromLayout(layout);
    const previous = JSON.parse(raw) as WardSnapshot;
    previous.alerts = (previous.alerts ?? []).map((a) => normalizeAlert(a));
    previous.assets = (previous.assets ?? []).map((asset) => ({
      ...asset,
      lastSeenMin: asset.lastSeenMin ?? 0,
    }));
    if (!previous.metrics) previous.metrics = [];
    return mergeWardWithLayout(layout, previous);
  } catch {
    return buildWardFromLayout(layout);
  }
}

export function saveOps(ward: WardSnapshot, layoutId?: string) {
  if (typeof window === "undefined") return;
  const key = opsStorageKey(layoutId);
  window.localStorage.setItem(key, JSON.stringify(ward));
  window.dispatchEvent(
    new CustomEvent("doqto-ops-updated", { detail: { layoutId } }),
  );
}

function stamp(ward: WardSnapshot): WardSnapshot {
  const summary = wardSummary(ward);
  const point = {
    at: new Date().toISOString(),
    responseMin: null as number | null,
    locateMin: null as number | null,
    bedsOccupied: summary.bedsOccupied,
    staffFree: summary.staffFree,
  };
  const metrics = [...ward.metrics, point].slice(-48);
  return {
    ...ward,
    updatedAt: point.at,
    metrics,
  };
}

export function setBedStatus(
  ward: WardSnapshot,
  bedId: string,
  status: BedStatus,
  patientInitials: string | undefined,
  ctx: OpsContext,
): WardSnapshot {
  const bed = ward.beds.find((b) => b.id === bedId);
  if (!bed) return ward;

  const beds = ward.beds.map((b) => {
    if (b.id !== bedId) return b;
    return {
      ...b,
      status,
      patientInitials:
        status === "occupied"
          ? (patientInitials || b.patientInitials || "PT")
              .slice(0, 3)
              .toUpperCase()
          : undefined,
    };
  });

  const next = stamp({ ...ward, beds });
  const updated = next.beds.find((b) => b.id === bedId)!;

  logTrainingEvent({
    ward: next,
    actorRole: ctx.actorRole,
    action: "bed.status_change",
    entityType: "bed",
    entityId: bed.id,
    entityLabel: bed.label,
    before: {
      status: bed.status,
      patientInitials: bed.patientInitials ?? null,
      roomId: bed.roomId,
    },
    after: {
      status: updated.status,
      patientInitials: updated.patientInitials ?? null,
      roomId: updated.roomId,
    },
    labels: {
      isBedAdmit: bed.status !== "occupied" && status === "occupied",
      isBedRelease: bed.status === "occupied" && status !== "occupied",
    },
  });

  return next;
}

export function setStaffStatus(
  ward: WardSnapshot,
  staffId: string,
  status: StaffStatus,
  roomId: string | undefined,
  ctx: OpsContext,
): WardSnapshot {
  const person = ward.staff.find((s) => s.id === staffId);
  if (!person) return ward;

  const nextRoom = roomId ?? person.roomId;
  const moved = nextRoom !== person.roomId;

  const staff = ward.staff.map((p) => {
    if (p.id !== staffId) return p;
    const room = ward.rooms.find((r) => r.id === nextRoom);
    const center = room ? roomCenter(room.path) : p.position;
    const index = ward.staff.findIndex((x) => x.id === staffId);
    return {
      ...p,
      status,
      roomId: nextRoom,
      lastSeenMin: 0,
      position: {
        x: center.x + ((index % 3) - 1) * 14,
        y: center.y + ((index % 2) * 12 - 6),
      },
    };
  });

  const next = stamp({ ...ward, staff });
  const updated = next.staff.find((s) => s.id === staffId)!;

  logTrainingEvent({
    ward: next,
    actorRole: ctx.actorRole,
    action: moved ? "staff.move" : "staff.status_change",
    entityType: "staff",
    entityId: person.id,
    entityLabel: person.name,
    before: {
      status: person.status,
      roomId: person.roomId,
      role: person.role,
    },
    after: {
      status: updated.status,
      roomId: updated.roomId,
      role: updated.role,
    },
  });

  return next;
}

export function setAssetStatus(
  ward: WardSnapshot,
  assetId: string,
  status: AssetStatus,
  roomId: string | undefined,
  ctx: OpsContext,
): WardSnapshot {
  const asset = ward.assets.find((a) => a.id === assetId);
  if (!asset) return ward;

  const nextRoom = roomId ?? asset.roomId;
  const moved = nextRoom !== asset.roomId;

  const assets = ward.assets.map((a) => {
    if (a.id !== assetId) return a;
    const room = ward.rooms.find((r) => r.id === nextRoom);
    const center = room ? roomCenter(room.path) : a.position;
    return {
      ...a,
      status,
      roomId: nextRoom,
      lastSeenMin: moved ? 0 : a.lastSeenMin,
      position: {
        x: center.x + (moved ? 8 : 0),
        y: center.y + (moved ? 8 : 0),
      },
    };
  });

  const next = stamp({ ...ward, assets });
  const updated = next.assets.find((a) => a.id === assetId)!;

  logTrainingEvent({
    ward: next,
    actorRole: ctx.actorRole,
    action: moved ? "asset.move" : "asset.status_change",
    entityType: "asset",
    entityId: asset.id,
    entityLabel: asset.name,
    before: {
      status: asset.status,
      roomId: asset.roomId,
      kind: asset.kind,
    },
    after: {
      status: updated.status,
      roomId: updated.roomId,
      kind: updated.kind,
    },
  });

  return next;
}

function normalizeAlert(raw: Alert): Alert {
  return {
    ...raw,
    kind: raw.kind ?? (raw.severity === "critical" ? "emergency" : "clinical"),
    lifecycle:
      raw.lifecycle ??
      (raw.acknowledged ? "responding" : raw.dispatched ? "dispatched" : "open"),
    raisedAt:
      raw.raisedAt ??
      new Date(Date.now() - (raw.raisedMinAgo ?? 0) * 60000).toISOString(),
  };
}

export function raiseAlert(
  ward: WardSnapshot,
  input: {
    severity: AlertSeverity;
    title: string;
    detail: string;
    roomId: string;
    kind?: AlertKind;
    /** When true (default for critical/emergency), run nearest-responder dispatch */
    autoDispatch?: boolean;
  },
  ctx: OpsContext,
): WardSnapshot {
  const kind =
    input.kind ??
    (input.severity === "critical" ? "emergency" : "clinical");
  const shouldDispatch =
    input.autoDispatch ?? (kind === "emergency" || input.severity === "critical");

  const raisedAt = new Date().toISOString();
  let alert: Alert = {
    id: `al-${Date.now()}`,
    severity: input.severity,
    kind,
    title: input.title,
    detail: input.detail,
    roomId: input.roomId,
    raisedAt,
    lifecycle: "open",
    acknowledged: false,
  };

  let staff = ward.staff;

  if (shouldDispatch) {
    const nearest = findNearestResponder(ward, input.roomId);
    const nearestAssets = findNearestEmergencyAssets(ward, input.roomId);
    alert = {
      ...alert,
      nearestAssets,
      ...(nearest
        ? {
            lifecycle: "dispatched" as const,
            dispatched: {
              staffId: nearest.id,
              staffName: responderLabel(nearest),
              staffRole: nearest.role,
              roomId: nearest.roomId,
              dispatchedAt: raisedAt,
            },
          }
        : {}),
    };

    if (nearest) {
      staff = ward.staff.map((person) =>
        person.id === nearest.id
          ? { ...person, status: "responding" as const }
          : person,
      );
    }

    const assetHint =
      nearestAssets.length > 0
        ? nearestAssets
            .map((a) => {
              const zone =
                ward.rooms.find((r) => r.id === a.roomId)?.label ?? a.roomId;
              return `${a.name} → ${zone}, ${a.lastSeenMin}m ago`;
            })
            .join("; ")
        : "No emergency equipment located";

    const responderHint = nearest
      ? `Dispatched ${responderLabel(nearest)} (${nearest.role})`
      : "No free responder available";

    alert = {
      ...alert,
      detail: `${input.detail} · ${responderHint}. Equipment: ${assetHint}`,
    };
  }

  const next = stamp({
    ...ward,
    staff,
    alerts: [alert, ...ward.alerts],
  });

  logTrainingEvent({
    ward: next,
    actorRole: ctx.actorRole,
    action: shouldDispatch ? "alert.dispatch" : "alert.raise",
    entityType: "alert",
    entityId: alert.id,
    entityLabel: alert.title,
    before: {},
    after: {
      severity: alert.severity,
      kind: alert.kind,
      roomId: alert.roomId,
      title: alert.title,
      lifecycle: alert.lifecycle,
      dispatchedStaffId: alert.dispatched?.staffId ?? null,
      acknowledged: false,
    },
    labels: {
      isCriticalEscalation: alert.severity === "critical",
    },
  });

  return next;
}

/** Code Blue wedge: patient down → nearest responder + crash cart. */
export function raiseEmergency(
  ward: WardSnapshot,
  roomId: string,
  ctx: OpsContext,
  title = "Code Blue",
): WardSnapshot {
  const zone = ward.rooms.find((r) => r.id === roomId)?.label ?? roomId;
  return raiseAlert(
    ward,
    {
      severity: "critical",
      kind: "emergency",
      title,
      detail: `Code Blue in ${zone}`,
      roomId,
      autoDispatch: true,
    },
    ctx,
  );
}

export function acknowledgeAlert(
  ward: WardSnapshot,
  alertId: string,
  ctx: OpsContext,
): WardSnapshot {
  const alert = ward.alerts.find((a) => a.id === alertId);
  if (!alert || alert.acknowledged) return ward;

  const acknowledgedAt = new Date().toISOString();
  const latencySec = Math.max(
    0,
    Math.round((Date.parse(acknowledgedAt) - Date.parse(alert.raisedAt)) / 1000),
  );

  const responderName =
    alert.dispatched?.staffName ??
    (ctx.actorRole === "nurse" ? "Nurse" : "Charge");

  let staff = ward.staff;
  if (alert.dispatched?.staffId) {
    staff = ward.staff.map((person) =>
      person.id === alert.dispatched!.staffId
        ? { ...person, status: "responding" as const }
        : person,
    );
  }

  const next = stamp({
    ...ward,
    staff,
    alerts: ward.alerts.map((a) =>
      a.id === alertId
        ? {
            ...a,
            acknowledged: true,
            acknowledgedAt,
            acknowledgedBy: responderName,
            lifecycle: "responding" as const,
          }
        : a,
    ),
    metrics: ward.metrics.map((m, i, arr) =>
      i === arr.length - 1
        ? { ...m, responseMin: Number((latencySec / 60).toFixed(2)) }
        : m,
    ),
  });

  logTrainingEvent({
    ward: next,
    actorRole: ctx.actorRole,
    action: "alert.acknowledge",
    entityType: "alert",
    entityId: alert.id,
    entityLabel: alert.title,
    before: {
      acknowledged: false,
      severity: alert.severity,
      roomId: alert.roomId,
      raisedAt: alert.raisedAt,
      lifecycle: alert.lifecycle,
    },
    after: {
      acknowledged: true,
      acknowledgedAt,
      acknowledgedBy: responderName,
      severity: alert.severity,
      roomId: alert.roomId,
      lifecycle: "responding",
    },
    labels: {
      alertAckLatencySec: latencySec,
      isCriticalEscalation: alert.severity === "critical",
    },
  });

  return next;
}
