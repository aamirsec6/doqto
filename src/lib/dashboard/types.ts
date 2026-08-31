import type { OncologyUnitKind } from "@/lib/oncology/constants";

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

export type WardType = OncologyUnitKind | "general" | "other";

export type LayoutStyle = "bays" | "rooms" | "mixed" | "opd";

export type ZoneKind =
  | "clinical"
  | "nursing"
  | "store"
  | "other"
  | "opd"
  | "opd_registration"
  | "opd_waiting"
  | "opd_triage"
  | "opd_consultation";

export interface MapCalibration {
  pixelsPerMetre: number;
  reference?: {
    a: Point;
    b: Point;
    distanceMetres: number;
  };
}

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
  parentId?: string;
  /** Polygon vertices in real-world metres (when calibrated). */
  verticesM?: Point[];
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
  parentId?: string;
  /** Polygon vertices in real-world metres. */
  verticesM?: Point[];
}

export interface StaffRosterEntry {
  id: string;
  name: string;
  role: string;
}

export interface LayoutConfig {
  version: 1 | 2 | 3;
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
  calibration?: MapCalibration;
  /** Multi-floor: server/client ids */
  layoutId?: string;
  floorId?: string;
}

/** One ward/unit on a floor. */
export interface UnitLayoutConfig {
  id: string;
  floorId: string;
  wardName: string;
  unitKind: OncologyUnitKind;
  wardType: WardType;
  layoutStyle: LayoutStyle;
  zones: LayoutZone[];
  trackAssets: boolean;
  calibration?: MapCalibration;
}

export interface FloorConfig {
  id: string;
  label: string;
  building: string;
  sortOrder: number;
  units: UnitLayoutConfig[];
}

/** Hospital-wide campus with multiple floors and units. */
export interface CampusConfig {
  version: 3;
  hospitalName: string;
  contactName: string;
  contactRole: string;
  staffRoster: StaffRosterEntry[];
  floors: FloorConfig[];
  activeFloorId: string;
  activeUnitId: string;
  createdAt: string;
}
