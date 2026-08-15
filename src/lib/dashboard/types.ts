export type StaffStatus = "free" | "busy" | "responding" | "off-floor";
export type BedStatus = "available" | "occupied" | "cleaning" | "reserved";
export type AssetStatus = "available" | "in-use" | "missing";
export type AlertSeverity = "critical" | "urgent" | "info";
export type AlertKind = "clinical" | "emergency" | "security";
export type AlertLifecycle = "open" | "dispatched" | "responding" | "resolved";
export type ViewerRole = "nurse" | "charge" | "ops";

export type Focus =
  | { type: "none" }
  | { type: "room"; id: string }
  | { type: "staff"; id: string }
  | { type: "asset"; id: string }
  | { type: "alert"; id: string }
  | { type: "bed"; id: string };

export type WardType =
  | "icu"
  | "emergency"
  | "general"
  | "ot"
  | "maternity"
  | "other";

export type LayoutStyle = "bays" | "rooms" | "mixed";

export type ZoneKind = "clinical" | "nursing" | "store" | "other";

export interface Point {
  x: number;
  y: number;
}

export interface Bed {
  id: string;
  label: string;
  roomId: string;
  status: BedStatus;
  patientInitials?: string;
  position: Point;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: StaffStatus;
  roomId: string;
  lastSeenMin: number;
  position: Point;
}

export interface Asset {
  id: string;
  name: string;
  kind: "crash-cart" | "defibrillator" | "ventilator" | "monitor" | "pump";
  status: AssetStatus;
  roomId: string;
  /** Minutes since last RFID/BLE sighting — last-known, not live GPS */
  lastSeenMin: number;
  position: Point;
}

export interface AlertDispatch {
  staffId: string;
  staffName: string;
  staffRole: string;
  roomId: string;
  dispatchedAt: string;
}

export interface NearestAssetHint {
  assetId: string;
  name: string;
  kind: Asset["kind"];
  roomId: string;
  lastSeenMin: number;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  kind: AlertKind;
  title: string;
  detail: string;
  roomId: string;
  /** ISO timestamp — age is derived live */
  raisedAt: string;
  lifecycle: AlertLifecycle;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  dispatched?: AlertDispatch;
  nearestAssets?: NearestAssetHint[];
  /** Linked hospital ops incident (same-tenant staff net) */
  hospitalIncidentId?: string;
  /** @deprecated use raisedAt */
  raisedMinAgo?: number;
}

export interface Room {
  id: string;
  label: string;
  kind: ZoneKind;
  path: string;
}

export interface MetricPoint {
  at: string;
  responseMin: number | null;
  locateMin: number | null;
  bedsOccupied: number;
  staffFree: number;
}

export interface WardSnapshot {
  hospital: string;
  ward: string;
  floor: string;
  layoutFingerprint: string;
  updatedAt: string;
  rooms: Room[];
  beds: Bed[];
  staff: StaffMember[];
  assets: Asset[];
  alerts: Alert[];
  metrics: MetricPoint[];
}

export interface LayoutZone {
  id: string;
  label: string;
  kind: ZoneKind;
  bedCount: number;
}

export interface StaffRosterEntry {
  id: string;
  name: string;
  role: string;
}

export interface LayoutConfig {
  version: 1;
  hospitalName: string;
  contactName: string;
  contactRole: string;
  wardName: string;
  wardType: WardType;
  floorLabel: string;
  layoutStyle: LayoutStyle;
  zones: LayoutZone[];
  trackAssets: boolean;
  staffRoster: StaffRosterEntry[];
  createdAt: string;
}
