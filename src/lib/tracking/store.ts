import type {
  LocationSighting,
  MobileTag,
  ResolvedLocation,
  TrackingConfig,
  TrackingState,
  ZoneBeacon,
} from "./types";

const g = globalThis as typeof globalThis & {
  __doqtoTracking?: TrackingState;
};

function defaultConfig(): TrackingConfig {
  return {
    version: 1,
    wardKey: "default",
    beacons: [],
    tags: [],
    updatedAt: new Date().toISOString(),
  };
}

export function getTrackingState(): TrackingState {
  if (!g.__doqtoTracking) {
    g.__doqtoTracking = {
      config: defaultConfig(),
      locations: {},
      recentSightings: [],
    };
  }
  return g.__doqtoTracking;
}

export function setTrackingConfig(config: TrackingConfig) {
  const state = getTrackingState();
  state.config = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  return state.config;
}

export function seedPilotTrackingConfig(
  rooms: { id: string; label: string }[],
  bindings?: {
    staff?: { id: string; name: string }[];
    assets?: { id: string; name: string }[];
  },
): TrackingConfig {
  const clinical = rooms.filter(
    (r) => !/nurs|store|corridor|other/i.test(r.label + r.id),
  );
  const zones = (clinical.length ? clinical : rooms).slice(0, 6);
  const nursing =
    rooms.find((r) => /nurs/i.test(r.label)) ?? rooms[rooms.length - 1];

  const beacons: ZoneBeacon[] = zones.map((room, i) => ({
    id: `bcn-${room.id}`,
    hardwareId: `BEACON-${String(i + 1).padStart(2, "0")}`,
    label: `${room.label} beacon`,
    roomId: room.id,
    rssiFloor: -85,
  }));

  if (nursing && !beacons.some((b) => b.roomId === nursing.id)) {
    beacons.push({
      id: `bcn-${nursing.id}`,
      hardwareId: "BEACON-NS",
      label: `${nursing.label} beacon`,
      roomId: nursing.id,
      rssiFloor: -85,
    });
  }

  const staffList = bindings?.staff?.length
    ? bindings.staff.slice(0, 4)
    : [
        { id: "roster-1", name: "Staff 1" },
        { id: "roster-2", name: "Staff 2" },
      ];

  const assetList = bindings?.assets?.length
    ? bindings.assets.slice(0, 4)
    : [
        { id: "as-crash", name: "Crash cart" },
        { id: "as-vent", name: "Ventilator" },
      ];

  const tags: MobileTag[] = [
    ...staffList.map((s, i) => ({
      id: `tag-staff-${i + 1}`,
      hardwareId: `TAG-STAFF-${String(i + 1).padStart(2, "0")}`,
      label: `${s.name} badge`,
      bindsTo: "staff" as const,
      entityId: s.id,
      kind: "staff-tag" as const,
    })),
    ...assetList.map((a, i) => ({
      id: `tag-asset-${i + 1}`,
      hardwareId: `TAG-ASSET-${String(i + 1).padStart(2, "0")}`,
      label: `${a.name} tag`,
      bindsTo: "asset" as const,
      entityId: a.id,
      kind: "asset-tag" as const,
    })),
  ];

  return setTrackingConfig({
    version: 1,
    wardKey: "pilot",
    beacons,
    tags,
    updatedAt: new Date().toISOString(),
  });
}

function resolveRoom(
  sighting: LocationSighting,
  config: TrackingConfig,
): string | null {
  if (sighting.roomId) {
    return sighting.roomId;
  }
  if (!sighting.beaconHardwareId) return null;
  const beacon = config.beacons.find(
    (b) =>
      b.hardwareId.toLowerCase() ===
      sighting.beaconHardwareId!.toLowerCase(),
  );
  return beacon?.roomId ?? null;
}

export function ingestSighting(raw: {
  tagHardwareId: string;
  beaconHardwareId?: string;
  roomId?: string;
  rssi?: number;
  batteryPct?: number;
  source?: LocationSighting["source"];
  seenAt?: string;
}): ResolvedLocation | null {
  const state = getTrackingState();
  const sighting: LocationSighting = {
    id: `sight-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tagHardwareId: raw.tagHardwareId.trim(),
    beaconHardwareId: raw.beaconHardwareId?.trim(),
    roomId: raw.roomId?.trim(),
    rssi: raw.rssi,
    batteryPct: raw.batteryPct,
    source: raw.source ?? "ble-gateway",
    seenAt: raw.seenAt ?? new Date().toISOString(),
  };

  const roomId = resolveRoom(sighting, state.config);
  if (!roomId) return null;

  const tag = state.config.tags.find(
    (t) =>
      t.hardwareId.toLowerCase() === sighting.tagHardwareId.toLowerCase(),
  );

  const resolved: ResolvedLocation = {
    tagHardwareId: sighting.tagHardwareId,
    roomId,
    entityType: tag?.bindsTo ?? "unknown",
    entityId: tag?.entityId ?? null,
    label: tag?.label ?? sighting.tagHardwareId,
    rssi: sighting.rssi ?? null,
    seenAt: sighting.seenAt,
    source: sighting.source,
  };

  state.locations[sighting.tagHardwareId.toLowerCase()] = resolved;
  state.recentSightings = [sighting, ...state.recentSightings].slice(0, 200);
  return resolved;
}

export function listLocations(): ResolvedLocation[] {
  return Object.values(getTrackingState().locations).sort((a, b) =>
    b.seenAt.localeCompare(a.seenAt),
  );
}

/** Simulate one tag moving into a random beacon zone (lab / no hardware yet). */
export function simulateRandomSighting(): ResolvedLocation | null {
  const { config } = getTrackingState();
  if (!config.beacons.length || !config.tags.length) return null;
  const tag = config.tags[Math.floor(Math.random() * config.tags.length)]!;
  const beacon =
    config.beacons[Math.floor(Math.random() * config.beacons.length)]!;
  return ingestSighting({
    tagHardwareId: tag.hardwareId,
    beaconHardwareId: beacon.hardwareId,
    rssi: -55 - Math.floor(Math.random() * 25),
    source: "simulator",
  });
}
