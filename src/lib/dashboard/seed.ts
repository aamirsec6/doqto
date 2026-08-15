import {
  TRAINING_STORAGE_KEY,
  type TrainingEvent,
} from "./training";
import { LAYOUT_STORAGE_KEY, OPS_STORAGE_KEY } from "./layout";
import type { LayoutConfig } from "./types";

/** Realistic pilot day for admin benchmarks — internal sample only. */
export function buildSeedEvents(): TrainingEvent[] {
  const sessionId = "sess-seed-citycare-icu2";
  const base = Date.now() - 1000 * 60 * 90; // last ~90 minutes
  const hospital = "City Care Hospital";
  const ward = "ICU Ward 2";
  const floor = "Floor 3 · B Block";

  const mk = (
    i: number,
    partial: Omit<
      TrainingEvent,
      "id" | "sessionId" | "seq" | "ts" | "hospital" | "ward" | "floor" | "labels"
    > & { labels?: TrainingEvent["labels"] },
  ): TrainingEvent => ({
    id: `evt-seed-${i}`,
    sessionId,
    seq: i,
    ts: new Date(base + i * 3 * 60 * 1000).toISOString(),
    hospital,
    ward,
    floor,
    actorRole: partial.actorRole,
    action: partial.action,
    entityType: partial.entityType,
    entityId: partial.entityId,
    entityLabel: partial.entityLabel,
    before: partial.before,
    after: partial.after,
    features: partial.features,
    labels: partial.labels ?? {},
  });

  const features = (
    occ: number,
    free: number,
    openAlerts: number,
    pressure: Record<string, number> = {
      "bay-a": 0.5,
      "bay-b": 0.75,
      "bay-c": 0.5,
      "bay-d": 0.25,
    },
  ): TrainingEvent["features"] => ({
    bedsOccupied: Math.round(occ * 16),
    bedsAvailable: 16 - Math.round(occ * 16),
    bedsTotal: 16,
    occupancyRate: occ,
    staffFree: free,
    staffBusy: Math.max(0, 4 - free - 1),
    staffResponding: free < 2 ? 1 : 0,
    staffOnFloor: 4,
    openAlerts,
    assetsMissing: openAlerts > 1 ? 1 : 0,
    assetsInUse: 2,
    zonePressure: pressure,
  });

  const events: TrainingEvent[] = [
    mk(1, {
      actorRole: "ops",
      action: "layout.saved",
      entityType: "system",
      entityId: "layout",
      entityLabel: ward,
      before: {},
      after: { zones: 6, beds: 16, roster: 4 },
      features: features(0, 4, 0),
    }),
    mk(2, {
      actorRole: "charge",
      action: "session.start",
      entityType: "system",
      entityId: "session",
      entityLabel: ward,
      before: {},
      after: {},
      features: features(0.25, 3, 0),
    }),
    mk(3, {
      actorRole: "nurse",
      action: "bed.status_change",
      entityType: "bed",
      entityId: "bay-a-bed-1",
      entityLabel: "BA1",
      before: { status: "available", patientInitials: null },
      after: { status: "occupied", patientInitials: "RK" },
      features: features(0.31, 3, 0),
      labels: { isBedAdmit: true },
    }),
    mk(4, {
      actorRole: "nurse",
      action: "bed.status_change",
      entityType: "bed",
      entityId: "bay-a-bed-2",
      entityLabel: "BA2",
      before: { status: "available", patientInitials: null },
      after: { status: "occupied", patientInitials: "SM" },
      features: features(0.38, 3, 0),
      labels: { isBedAdmit: true },
    }),
    mk(5, {
      actorRole: "nurse",
      action: "bed.status_change",
      entityType: "bed",
      entityId: "bay-b-bed-1",
      entityLabel: "BB1",
      before: { status: "available", patientInitials: null },
      after: { status: "occupied", patientInitials: "PN" },
      features: features(0.44, 2, 0, {
        "bay-a": 0.5,
        "bay-b": 0.5,
        "bay-c": 0.25,
        "bay-d": 0.25,
      }),
      labels: { isBedAdmit: true },
    }),
    mk(6, {
      actorRole: "charge",
      action: "staff.status_change",
      entityType: "staff",
      entityId: "roster-1",
      entityLabel: "Nurse Fatima",
      before: { status: "free", roomId: "nursing" },
      after: { status: "busy", roomId: "bay-a" },
      features: features(0.5, 2, 0),
    }),
    mk(7, {
      actorRole: "charge",
      action: "staff.move",
      entityType: "staff",
      entityId: "roster-2",
      entityLabel: "Dr. Mehta",
      before: { status: "free", roomId: "nursing" },
      after: { status: "busy", roomId: "bay-b" },
      features: features(0.56, 1, 0, {
        "bay-a": 0.75,
        "bay-b": 0.75,
        "bay-c": 0.25,
        "bay-d": 0.25,
      }),
    }),
    mk(8, {
      actorRole: "nurse",
      action: "bed.status_change",
      entityType: "bed",
      entityId: "bay-b-bed-2",
      entityLabel: "BB2",
      before: { status: "available", patientInitials: null },
      after: { status: "occupied", patientInitials: "AV" },
      features: features(0.62, 1, 0, {
        "bay-a": 0.75,
        "bay-b": 1,
        "bay-c": 0.25,
        "bay-d": 0.25,
      }),
      labels: { isBedAdmit: true },
    }),
    mk(9, {
      actorRole: "charge",
      action: "alert.raise",
      entityType: "alert",
      entityId: "al-seed-1",
      entityLabel: "Assist needed — Bay B",
      before: {},
      after: {
        severity: "critical",
        roomId: "bay-b",
        title: "Assist needed — Bay B",
        acknowledged: false,
      },
      features: features(0.69, 1, 1, {
        "bay-a": 0.75,
        "bay-b": 1,
        "bay-c": 0.5,
        "bay-d": 0.25,
      }),
      labels: { isCriticalEscalation: true },
    }),
    mk(10, {
      actorRole: "nurse",
      action: "staff.status_change",
      entityType: "staff",
      entityId: "roster-3",
      entityLabel: "Nurse Rohan",
      before: { status: "free", roomId: "nursing" },
      after: { status: "responding", roomId: "bay-b" },
      features: features(0.69, 0, 1, {
        "bay-a": 0.75,
        "bay-b": 1,
        "bay-c": 0.5,
        "bay-d": 0.25,
      }),
    }),
    mk(11, {
      actorRole: "charge",
      action: "alert.acknowledge",
      entityType: "alert",
      entityId: "al-seed-1",
      entityLabel: "Assist needed — Bay B",
      before: { acknowledged: false, severity: "critical", roomId: "bay-b" },
      after: {
        acknowledged: true,
        severity: "critical",
        roomId: "bay-b",
        acknowledgedAt: new Date(base + 11 * 3 * 60 * 1000).toISOString(),
      },
      features: features(0.69, 1, 0, {
        "bay-a": 0.75,
        "bay-b": 1,
        "bay-c": 0.5,
        "bay-d": 0.25,
      }),
      labels: {
        alertAckLatencySec: 42,
        isCriticalEscalation: true,
      },
    }),
    mk(12, {
      actorRole: "ops",
      action: "asset.status_change",
      entityType: "asset",
      entityId: "as-vent",
      entityLabel: "Ventilator",
      before: { status: "available", roomId: "store" },
      after: { status: "in-use", roomId: "bay-b" },
      features: features(0.75, 1, 0),
    }),
    mk(13, {
      actorRole: "nurse",
      action: "bed.status_change",
      entityType: "bed",
      entityId: "bay-c-bed-1",
      entityLabel: "BC1",
      before: { status: "available", patientInitials: null },
      after: { status: "occupied", patientInitials: "JK" },
      features: features(0.81, 1, 0, {
        "bay-a": 0.75,
        "bay-b": 1,
        "bay-c": 0.75,
        "bay-d": 0.25,
      }),
      labels: { isBedAdmit: true },
    }),
    mk(14, {
      actorRole: "charge",
      action: "alert.raise",
      entityType: "alert",
      entityId: "al-seed-2",
      entityLabel: "Infusion pump missing",
      before: {},
      after: {
        severity: "urgent",
        roomId: "corridor",
        title: "Infusion pump missing",
        acknowledged: false,
      },
      features: features(0.81, 1, 1),
    }),
    mk(15, {
      actorRole: "ops",
      action: "asset.move",
      entityType: "asset",
      entityId: "as-crash",
      entityLabel: "Crash cart",
      before: { status: "available", roomId: "nursing" },
      after: { status: "available", roomId: "bay-c" },
      features: features(0.81, 2, 1),
    }),
    mk(16, {
      actorRole: "charge",
      action: "alert.acknowledge",
      entityType: "alert",
      entityId: "al-seed-2",
      entityLabel: "Infusion pump missing",
      before: { acknowledged: false, severity: "urgent" },
      after: { acknowledged: true, severity: "urgent" },
      features: features(0.81, 2, 0),
      labels: { alertAckLatencySec: 78 },
    }),
    mk(17, {
      actorRole: "nurse",
      action: "bed.status_change",
      entityType: "bed",
      entityId: "bay-a-bed-1",
      entityLabel: "BA1",
      before: { status: "occupied", patientInitials: "RK" },
      after: { status: "cleaning", patientInitials: null },
      features: features(0.75, 2, 0),
      labels: { isBedRelease: true },
    }),
    mk(18, {
      actorRole: "nurse",
      action: "bed.status_change",
      entityType: "bed",
      entityId: "bay-a-bed-1",
      entityLabel: "BA1",
      before: { status: "cleaning", patientInitials: null },
      after: { status: "available", patientInitials: null },
      features: features(0.69, 3, 0, {
        "bay-a": 0.5,
        "bay-b": 1,
        "bay-c": 0.75,
        "bay-d": 0.25,
      }),
    }),
    mk(19, {
      actorRole: "ops",
      action: "role.change",
      entityType: "system",
      entityId: "role",
      entityLabel: "ops",
      before: { role: "charge" },
      after: { role: "ops" },
      features: features(0.69, 3, 0),
    }),
    mk(20, {
      actorRole: "ops",
      action: "focus.set",
      entityType: "zone",
      entityId: "bay-b",
      entityLabel: "Bay B",
      before: {},
      after: {},
      features: features(0.69, 3, 0, {
        "bay-a": 0.5,
        "bay-b": 1,
        "bay-c": 0.75,
        "bay-d": 0.25,
      }),
    }),
  ];

  return events;
}

export function buildSeedLayout(): LayoutConfig {
  return {
    version: 1,
    hospitalName: "City Care Hospital",
    contactName: "Nurse Fatima",
    contactRole: "Charge nurse",
    wardName: "ICU Ward 2",
    wardType: "icu",
    floorLabel: "Floor 3 · B Block",
    layoutStyle: "bays",
    zones: [
      { id: "bay-a", label: "Bay A", kind: "clinical", bedCount: 4 },
      { id: "bay-b", label: "Bay B", kind: "clinical", bedCount: 4 },
      { id: "bay-c", label: "Bay C", kind: "clinical", bedCount: 4 },
      { id: "bay-d", label: "Bay D", kind: "clinical", bedCount: 4 },
      { id: "nursing", label: "Nursing station", kind: "nursing", bedCount: 0 },
      { id: "store", label: "Equipment store", kind: "store", bedCount: 0 },
    ],
    trackAssets: true,
    staffRoster: [
      { id: "roster-1", name: "Nurse Fatima", role: "Charge nurse" },
      { id: "roster-2", name: "Dr. Mehta", role: "Intensivist" },
      { id: "roster-3", name: "Nurse Rohan", role: "Staff nurse" },
      { id: "roster-4", name: "Dr. Iyer", role: "Resident" },
    ],
    createdAt: new Date().toISOString(),
  };
}

export function seedAdminDemo(): { events: number } {
  if (typeof window === "undefined") return { events: 0 };
  const events = buildSeedEvents();
  window.localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(events));

  // Also seed layout so ward board matches sample site if empty
  if (!window.localStorage.getItem(LAYOUT_STORAGE_KEY)) {
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify(buildSeedLayout()),
    );
  }

  window.dispatchEvent(
    new CustomEvent("doqto-training-updated", {
      detail: { count: events.length },
    }),
  );
  return { events: events.length };
}

export function seedAdminDemoForce(): { events: number } {
  if (typeof window === "undefined") return { events: 0 };
  window.localStorage.removeItem(OPS_STORAGE_KEY);
  window.localStorage.setItem(
    LAYOUT_STORAGE_KEY,
    JSON.stringify(buildSeedLayout()),
  );
  return seedAdminDemo();
}
