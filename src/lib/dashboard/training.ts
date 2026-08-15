import type {
  ViewerRole,
  WardSnapshot,
} from "./types";
import { wardSummary } from "./layout";

export const TRAINING_STORAGE_KEY = "doqto.ward.training.v1";
export const SESSION_STORAGE_KEY = "doqto.ward.session.v1";

export type TrainingAction =
  | "session.start"
  | "role.change"
  | "focus.set"
  | "bed.status_change"
  | "staff.status_change"
  | "staff.move"
  | "asset.status_change"
  | "asset.move"
  | "alert.raise"
  | "alert.dispatch"
  | "alert.acknowledge"
  | "layout.saved";

export interface TrainingEvent {
  /** Unique event id */
  id: string;
  /** Session id for one continuous board use */
  sessionId: string;
  /** Monotonic sequence within session */
  seq: number;
  /** ISO timestamp */
  ts: string;
  hospital: string;
  ward: string;
  floor: string;
  actorRole: ViewerRole;
  action: TrainingAction;
  entityType: "bed" | "staff" | "asset" | "alert" | "zone" | "system";
  entityId: string;
  entityLabel: string;
  /** Prior values (for supervised before→after learning) */
  before: Record<string, string | number | boolean | null>;
  /** New values */
  after: Record<string, string | number | boolean | null>;
  /** Ward snapshot features at event time */
  features: {
    bedsOccupied: number;
    bedsAvailable: number;
    bedsTotal: number;
    occupancyRate: number;
    staffFree: number;
    staffBusy: number;
    staffResponding: number;
    staffOnFloor: number;
    openAlerts: number;
    assetsMissing: number;
    assetsInUse: number;
    zonePressure: Record<string, number>;
  };
  /** Optional derived labels useful for ML */
  labels: {
    alertAckLatencySec?: number;
    isCriticalEscalation?: boolean;
    isBedRelease?: boolean;
    isBedAdmit?: boolean;
  };
}

function zonePressure(ward: WardSnapshot): Record<string, number> {
  const out: Record<string, number> = {};
  for (const room of ward.rooms) {
    const beds = ward.beds.filter((b) => b.roomId === room.id);
    if (!beds.length) continue;
    const occ = beds.filter((b) => b.status === "occupied").length;
    out[room.id] = Number((occ / beds.length).toFixed(3));
  }
  return out;
}

function featuresFrom(ward: WardSnapshot): TrainingEvent["features"] {
  const s = wardSummary(ward);
  const staffBusy = ward.staff.filter((p) => p.status === "busy").length;
  return {
    bedsOccupied: s.bedsOccupied,
    bedsAvailable: s.bedsAvailable,
    bedsTotal: s.bedsTotal,
    occupancyRate:
      s.bedsTotal === 0
        ? 0
        : Number((s.bedsOccupied / s.bedsTotal).toFixed(3)),
    staffFree: s.staffFree,
    staffBusy,
    staffResponding: s.staffResponding,
    staffOnFloor: s.staffOnFloor,
    openAlerts: s.openAlerts,
    assetsMissing: s.assetsMissing,
    assetsInUse: ward.assets.filter((a) => a.status === "in-use").length,
    zonePressure: zonePressure(ward),
  };
}

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

export function loadTrainingEvents(): TrainingEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRAINING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrainingEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearTrainingEvents() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TRAINING_STORAGE_KEY);
}

function nextSeq(events: TrainingEvent[], sessionId: string): number {
  const same = events.filter((e) => e.sessionId === sessionId);
  if (!same.length) return 1;
  return Math.max(...same.map((e) => e.seq)) + 1;
}

export function logTrainingEvent(input: {
  ward: WardSnapshot;
  actorRole: ViewerRole;
  action: TrainingAction;
  entityType: TrainingEvent["entityType"];
  entityId: string;
  entityLabel: string;
  before?: TrainingEvent["before"];
  after?: TrainingEvent["after"];
  labels?: TrainingEvent["labels"];
}): TrainingEvent {
  const events = loadTrainingEvents();
  const sessionId = getSessionId();
  const event: TrainingEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sessionId,
    seq: nextSeq(events, sessionId),
    ts: new Date().toISOString(),
    hospital: input.ward.hospital,
    ward: input.ward.ward,
    floor: input.ward.floor,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    before: input.before ?? {},
    after: input.after ?? {},
    features: featuresFrom(input.ward),
    labels: input.labels ?? {},
  };

  const next = [...events, event].slice(-5000);
  window.localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent("doqto-training-updated", { detail: { count: next.length } }),
  );
  return event;
}

export function exportTrainingJsonl(events = loadTrainingEvents()): string {
  return events.map((e) => JSON.stringify(e)).join("\n");
}

export function exportTrainingCsv(events = loadTrainingEvents()): string {
  const header = [
    "id",
    "sessionId",
    "seq",
    "ts",
    "hospital",
    "ward",
    "floor",
    "actorRole",
    "action",
    "entityType",
    "entityId",
    "entityLabel",
    "before",
    "after",
    "bedsOccupied",
    "bedsTotal",
    "occupancyRate",
    "staffFree",
    "staffResponding",
    "openAlerts",
    "assetsMissing",
    "alertAckLatencySec",
    "isBedAdmit",
    "isBedRelease",
    "isCriticalEscalation",
  ];

  const rows = events.map((e) =>
    [
      e.id,
      e.sessionId,
      e.seq,
      e.ts,
      csv(e.hospital),
      csv(e.ward),
      csv(e.floor),
      e.actorRole,
      e.action,
      e.entityType,
      e.entityId,
      csv(e.entityLabel),
      csv(JSON.stringify(e.before)),
      csv(JSON.stringify(e.after)),
      e.features.bedsOccupied,
      e.features.bedsTotal,
      e.features.occupancyRate,
      e.features.staffFree,
      e.features.staffResponding,
      e.features.openAlerts,
      e.features.assetsMissing,
      e.labels.alertAckLatencySec ?? "",
      e.labels.isBedAdmit ?? "",
      e.labels.isBedRelease ?? "",
      e.labels.isCriticalEscalation ?? "",
    ].join(","),
  );

  return [header.join(","), ...rows].join("\n");
}

function csv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function trainingStats(events = loadTrainingEvents()) {
  const byAction: Record<string, number> = {};
  for (const e of events) {
    byAction[e.action] = (byAction[e.action] ?? 0) + 1;
  }
  const sessions = new Set(events.map((e) => e.sessionId)).size;
  const ackLatencies = events
    .map((e) => e.labels.alertAckLatencySec)
    .filter((n): n is number => typeof n === "number");
  const avgAck =
    ackLatencies.length === 0
      ? null
      : Math.round(
          ackLatencies.reduce((a, b) => a + b, 0) / ackLatencies.length,
        );

  return {
    total: events.length,
    sessions,
    byAction,
    avgAckLatencySec: avgAck,
  };
}

/** Pilot SLA targets — used for internal benchmark scoring only. */
export const BENCHMARK_TARGETS = {
  alertAckSec: 60,
  maxOccupancyRate: 0.9,
  minStaffFreeShare: 0.2,
  bedUpdatesPerSession: 5,
};

export type BenchmarkStatus = "pass" | "watch" | "fail" | "na";

export interface BenchmarkRow {
  id: string;
  label: string;
  metric: string;
  target: string;
  actual: string;
  status: BenchmarkStatus;
  detail: string;
}

export function computeBenchmarks(events = loadTrainingEvents()): {
  rows: BenchmarkRow[];
  score: number;
  hospitals: string[];
  wards: string[];
} {
  const stats = trainingStats(events);
  const admits = events.filter((e) => e.labels.isBedAdmit).length;
  const releases = events.filter((e) => e.labels.isBedRelease).length;
  const critical = events.filter((e) => e.labels.isCriticalEscalation).length;
  const last = events[events.length - 1];

  const occupancy = last?.features.occupancyRate ?? null;
  const staffFreeShare =
    last && last.features.staffOnFloor > 0
      ? last.features.staffFree / last.features.staffOnFloor
      : null;

  const ackActual = stats.avgAckLatencySec;
  const ackStatus: BenchmarkStatus =
    ackActual == null
      ? "na"
      : ackActual <= BENCHMARK_TARGETS.alertAckSec
        ? "pass"
        : ackActual <= BENCHMARK_TARGETS.alertAckSec * 2
          ? "watch"
          : "fail";

  const occStatus: BenchmarkStatus =
    occupancy == null
      ? "na"
      : occupancy <= BENCHMARK_TARGETS.maxOccupancyRate
        ? "pass"
        : occupancy <= 0.95
          ? "watch"
          : "fail";

  const freeStatus: BenchmarkStatus =
    staffFreeShare == null
      ? "na"
      : staffFreeShare >= BENCHMARK_TARGETS.minStaffFreeShare
        ? "pass"
        : staffFreeShare >= 0.1
          ? "watch"
          : "fail";

  const activityStatus: BenchmarkStatus =
    stats.total === 0
      ? "na"
      : (stats.byAction["bed.status_change"] ?? 0) >=
          BENCHMARK_TARGETS.bedUpdatesPerSession
        ? "pass"
        : "watch";

  const rows: BenchmarkRow[] = [
    {
      id: "ack",
      label: "Alert acknowledgment",
      metric: "Avg time to ack",
      target: `≤ ${BENCHMARK_TARGETS.alertAckSec}s`,
      actual: ackActual == null ? "—" : `${ackActual}s`,
      status: ackStatus,
      detail: "From raise → acknowledge on the live board",
    },
    {
      id: "occupancy",
      label: "Ward occupancy pressure",
      metric: "Latest occupancy rate",
      target: `≤ ${Math.round(BENCHMARK_TARGETS.maxOccupancyRate * 100)}%`,
      actual: occupancy == null ? "—" : `${Math.round(occupancy * 100)}%`,
      status: occStatus,
      detail: "Occupied beds / total beds at last event",
    },
    {
      id: "staff-flex",
      label: "Staff flexibility",
      metric: "Share of on-floor staff free",
      target: `≥ ${Math.round(BENCHMARK_TARGETS.minStaffFreeShare * 100)}%`,
      actual:
        staffFreeShare == null
          ? "—"
          : `${Math.round(staffFreeShare * 100)}%`,
      status: freeStatus,
      detail: "Capacity to respond without delay",
    },
    {
      id: "bed-activity",
      label: "Bed board usage",
      metric: "Bed status updates",
      target: `≥ ${BENCHMARK_TARGETS.bedUpdatesPerSession} / session`,
      actual: String(stats.byAction["bed.status_change"] ?? 0),
      status: activityStatus,
      detail: "How actively the board is driven live",
    },
    {
      id: "flow",
      label: "Patient flow signals",
      metric: "Admits / releases",
      target: "Tracked",
      actual: `${admits} / ${releases}`,
      status: admits + releases === 0 ? "na" : "pass",
      detail: "Bed occupy vs release events",
    },
    {
      id: "critical",
      label: "Critical escalations",
      metric: "Critical alerts logged",
      target: "Monitor",
      actual: String(critical),
      status: critical === 0 ? "pass" : critical <= 3 ? "watch" : "fail",
      detail: "Volume of critical severity events",
    },
  ];

  const scored = rows.filter((r) => r.status !== "na");
  const points = scored.reduce((sum, r) => {
    if (r.status === "pass") return sum + 1;
    if (r.status === "watch") return sum + 0.5;
    return sum;
  }, 0);
  const score =
    scored.length === 0 ? 0 : Math.round((points / scored.length) * 100);

  const hospitals = [...new Set(events.map((e) => e.hospital).filter(Boolean))];
  const wards = [...new Set(events.map((e) => e.ward).filter(Boolean))];

  return { rows, score, hospitals, wards };
}
