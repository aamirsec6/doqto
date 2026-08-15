export type TrackerKind = "beacon" | "staff-tag" | "asset-tag" | "phone";

/** Fixed BLE beacon installed in a zone (room-level anchor). */
export interface ZoneBeacon {
  id: string;
  /** BLE MAC or iBeacon UUID+major+minor key */
  hardwareId: string;
  label: string;
  roomId: string;
  rssiFloor: number;
}

/** Wearable / asset tag that moves. */
export interface MobileTag {
  id: string;
  hardwareId: string;
  label: string;
  bindsTo: "staff" | "asset";
  entityId: string;
  kind: TrackerKind;
}

export interface LocationSighting {
  id: string;
  /** Tag / phone hardware id */
  tagHardwareId: string;
  /** Nearest beacon hardware id (or roomId if gateway resolves it) */
  beaconHardwareId?: string;
  roomId?: string;
  rssi?: number;
  batteryPct?: number;
  source: "ble-gateway" | "phone" | "simulator" | "qr";
  seenAt: string;
}

export interface ResolvedLocation {
  tagHardwareId: string;
  roomId: string;
  entityType: "staff" | "asset" | "unknown";
  entityId: string | null;
  label: string;
  rssi: number | null;
  seenAt: string;
  source: LocationSighting["source"];
}

export interface TrackingConfig {
  version: 1;
  wardKey: string;
  beacons: ZoneBeacon[];
  tags: MobileTag[];
  updatedAt: string;
}

export interface TrackingState {
  config: TrackingConfig;
  /** Latest resolved location per tag */
  locations: Record<string, ResolvedLocation>;
  /** Recent raw sightings for debug */
  recentSightings: LocationSighting[];
}
