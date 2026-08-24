import { layoutGeometry } from "@/lib/map/geometry";
import { defaultZonesForOpd } from "@/lib/map/opd-template";
import { roomCenter } from "./status";
import type {
  Asset,
  Bed,
  BedStatus,
  LayoutConfig,
  LayoutZone,
  MetricPoint,
  Point,
  Room,
  StaffMember,
  WardSnapshot,
  ZoneKind,
} from "./types";

export const LAYOUT_STORAGE_KEY = "doqto.ward.layout.v2";
export const OPS_STORAGE_KEY = "doqto.ward.ops.v1";

export { layoutGeometry } from "@/lib/map/geometry";

export const defaultZonesForStyle = (
  style: LayoutConfig["layoutStyle"],
): LayoutZone[] => {
  if (style === "opd") return defaultZonesForOpd();
  if (style === "rooms") {
    return [
      { id: "room-101", label: "Room 101", kind: "clinical", bedCount: 2 },
      { id: "room-102", label: "Room 102", kind: "clinical", bedCount: 2 },
      { id: "room-103", label: "Room 103", kind: "clinical", bedCount: 2 },
      { id: "room-104", label: "Room 104", kind: "clinical", bedCount: 2 },
      { id: "nursing", label: "Nursing station", kind: "nursing", bedCount: 0 },
      { id: "store", label: "Equipment store", kind: "store", bedCount: 0 },
    ];
  }

  if (style === "mixed") {
    return [
      { id: "bay-a", label: "Bay A", kind: "clinical", bedCount: 4 },
      { id: "isolation", label: "Isolation", kind: "clinical", bedCount: 1 },
      { id: "room-1", label: "Side room 1", kind: "clinical", bedCount: 1 },
      { id: "nursing", label: "Nursing station", kind: "nursing", bedCount: 0 },
      { id: "store", label: "Equipment store", kind: "store", bedCount: 0 },
    ];
  }

  return [
    { id: "bay-a", label: "Bay A", kind: "clinical", bedCount: 4 },
    { id: "bay-b", label: "Bay B", kind: "clinical", bedCount: 4 },
    { id: "bay-c", label: "Bay C", kind: "clinical", bedCount: 4 },
    { id: "bay-d", label: "Bay D", kind: "clinical", bedCount: 4 },
    { id: "nursing", label: "Nursing station", kind: "nursing", bedCount: 0 },
    { id: "store", label: "Equipment store", kind: "store", bedCount: 0 },
  ];
};

export const emptyLayoutDraft = (): Omit<LayoutConfig, "createdAt"> => ({
  version: 2,
  hospitalName: "",
  contactName: "",
  contactRole: "",
  wardName: "",
  wardType: "icu",
  floorLabel: "",
  layoutStyle: "bays",
  zones: defaultZonesForStyle("bays"),
  trackAssets: true,
  staffRoster: [
    { id: "roster-1", name: "", role: "Charge nurse" },
    { id: "roster-2", name: "", role: "Staff nurse" },
    { id: "roster-3", name: "", role: "Doctor" },
  ],
  calibration: undefined,
});

export function layoutFingerprint(config: LayoutConfig): string {
  return JSON.stringify({
    ward: config.wardName,
    floor: config.floorLabel,
    zones: config.zones.map((z) => [
      z.id,
      z.label,
      z.kind,
      z.bedCount,
      z.verticesM,
      z.parentId,
    ]),
    calibration: config.calibration?.pixelsPerMetre,
    trackAssets: config.trackAssets,
    roster: config.staffRoster.map((s) => [s.id, s.name, s.role]),
  });
}

export function loadLayout(): LayoutConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(LAYOUT_STORAGE_KEY) ??
      window.localStorage.getItem("doqto.ward.layout.v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LayoutConfig;
    if (!parsed?.zones?.length) return null;
    if (parsed.version !== 1 && parsed.version !== 2) return null;
    if (!parsed.staffRoster) {
      parsed.staffRoster = [
        {
          id: "roster-contact",
          name: parsed.contactName,
          role: parsed.contactRole || "Charge nurse",
        },
      ];
    }
    return { ...parsed, version: 2 };
  } catch {
    return null;
  }
}

export function saveLayout(config: LayoutConfig) {
  window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(config));
}

export function clearLayout() {
  window.localStorage.removeItem(LAYOUT_STORAGE_KEY);
  window.localStorage.removeItem("doqto.ward.layout.v1");
  window.localStorage.removeItem(OPS_STORAGE_KEY);
}

function bedPositions(
  center: Point,
  count: number,
  zoneKind: ZoneKind,
): Point[] {
  if (count <= 0 || zoneKind !== "clinical") return [];
  const cols = count <= 2 ? count : Math.min(4, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  const startX = center.x - ((cols - 1) * 52) / 2;
  const startY = center.y - ((rows - 1) * 44) / 2 + 8;
  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { x: startX + col * 52, y: startY + row * 44 };
  });
}

function offset(point: Point | undefined, dx: number, dy: number): Point {
  return {
    x: (point?.x ?? 100) + dx,
    y: (point?.y ?? 100) + dy,
  };
}

/** Fresh real ward: empty beds, roster staff on floor, no fake incidents. */
export function buildWardFromLayout(config: LayoutConfig): WardSnapshot {
  const { rooms, centers } = layoutGeometry(config.zones, config.calibration);
  const fingerprint = layoutFingerprint(config);

  const beds: Bed[] = [];
  config.zones.forEach((zone) => {
    const center = centers[zone.id] ?? { x: 100, y: 100 };
    const positions = bedPositions(center, zone.bedCount, zone.kind);
    positions.forEach((pos, i) => {
      beds.push({
        id: `${zone.id}-bed-${i + 1}`,
        label: `${zone.label.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "B"}${i + 1}`,
        roomId: zone.id,
        status: "available",
        position: pos,
      });
    });
  });

  const nursingId =
    config.zones.find((z) => z.kind === "nursing")?.id ??
    config.zones.find((z) => z.kind === "opd_registration")?.id ??
    config.zones[0]?.id ??
    "ward";
  const clinicalIds = config.zones
    .filter(
      (z) =>
        z.kind === "clinical" ||
        z.kind === "opd_consultation" ||
        z.kind === "opd_triage",
    )
    .map((z) => z.id);
  const storeId =
    config.zones.find((z) => z.kind === "store")?.id ?? nursingId;

  const roster =
    config.staffRoster.filter((s) => s.name.trim()).length > 0
      ? config.staffRoster.filter((s) => s.name.trim())
      : [
          {
            id: "roster-contact",
            name: config.contactName || "Charge nurse",
            role: config.contactRole || "Charge nurse",
          },
        ];

  const staff: StaffMember[] = roster.map((person, i) => {
    const roomId =
      i === 0
        ? nursingId
        : (clinicalIds[i % Math.max(clinicalIds.length, 1)] ?? nursingId);
    const jitter = i * 18;
    return {
      id: person.id || `staff-${i + 1}`,
      name: person.name.trim(),
      role: person.role.trim() || "Staff",
      status: "free" as const,
      roomId,
      lastSeenMin: 0,
      position: offset(centers[roomId], (i % 3) * 16 - 16, jitter - 20),
    };
  });

  const assets: Asset[] = config.trackAssets
    ? [
        {
          id: "as-crash",
          name: "Crash cart",
          kind: "crash-cart",
          status: "available",
          roomId: nursingId,
          lastSeenMin: 0,
          position: offset(centers[nursingId], -28, -24),
        },
        {
          id: "as-defib",
          name: "Defibrillator",
          kind: "defibrillator",
          status: "available",
          roomId: nursingId,
          lastSeenMin: 2,
          position: offset(centers[nursingId], 22, -18),
        },
        {
          id: "as-vent",
          name: "Ventilator",
          kind: "ventilator",
          status: "available",
          roomId: storeId,
          lastSeenMin: 8,
          position: offset(centers[storeId], 0, -10),
        },
        {
          id: "as-monitor",
          name: "Monitor",
          kind: "monitor",
          status: "available",
          roomId: storeId,
          lastSeenMin: 5,
          position: offset(centers[storeId], 20, 16),
        },
      ]
    : [];

  const now = new Date().toISOString();
  const metrics: MetricPoint[] = [
    {
      at: now,
      responseMin: null,
      locateMin: null,
      bedsOccupied: 0,
      staffFree: staff.length,
    },
  ];

  return {
    hospital: config.hospitalName,
    ward: config.wardName,
    floor: config.floorLabel,
    layoutFingerprint: fingerprint,
    updatedAt: now,
    rooms,
    beds,
    staff,
    assets,
    alerts: [
      {
        id: `al-open-${Date.now()}`,
        severity: "info",
        kind: "clinical",
        title: "Ward board opened",
        detail: "Live data mode — update beds, staff, and raise alerts from this screen.",
        roomId: nursingId,
        raisedAt: now,
        lifecycle: "resolved",
        acknowledged: true,
      },
    ],
    metrics,
  };
}

/** Rebuild room geometry from layout; keep live status where IDs still match. */
export function mergeWardWithLayout(
  config: LayoutConfig,
  previous: WardSnapshot | null,
): WardSnapshot {
  const fresh = buildWardFromLayout(config);
  if (!previous || previous.layoutFingerprint !== fresh.layoutFingerprint) {
    if (!previous) return fresh;
  }

  const centers = Object.fromEntries(
    fresh.rooms.map((r) => [r.id, roomCenter(r.path)]),
  ) as Record<string, Point>;

  const prevBeds = new Map(previous.beds.map((b) => [b.id, b]));
  const beds = fresh.beds.map((bed) => {
    const old = prevBeds.get(bed.id);
    if (!old) return bed;
    return {
      ...bed,
      status: old.status,
      patientInitials: old.patientInitials,
    };
  });

  const prevStaff = new Map(previous.staff.map((s) => [s.id, s]));
  const staff = fresh.staff.map((person) => {
    const old = prevStaff.get(person.id);
    if (!old) return person;
    const roomStillExists = fresh.rooms.some((r) => r.id === old.roomId);
    return {
      ...person,
      status: old.status,
      roomId: roomStillExists ? old.roomId : person.roomId,
      lastSeenMin: old.lastSeenMin,
    };
  });

  const positionedStaff = staff.map((person, i) => ({
    ...person,
    position: offset(
      centers[person.roomId],
      (i % 3) * 16 - 16,
      (i % 4) * 12 - 12,
    ),
  }));

  const prevAssets = new Map(previous.assets.map((a) => [a.id, a]));
  const assets = fresh.assets.map((asset) => {
    const old = prevAssets.get(asset.id);
    if (!old) return asset;
    const roomStillExists = fresh.rooms.some((r) => r.id === old.roomId);
    const roomId = roomStillExists ? old.roomId : asset.roomId;
    return {
      ...asset,
      status: old.status,
      roomId,
      lastSeenMin: old.lastSeenMin ?? 0,
      position: offset(centers[roomId], 0, 0),
    };
  });

  return {
    ...fresh,
    beds,
    staff: positionedStaff,
    assets,
    alerts: previous.alerts.length ? previous.alerts : fresh.alerts,
    metrics: previous.metrics.length ? previous.metrics : fresh.metrics,
    updatedAt: new Date().toISOString(),
  };
}

export function mapViewBox(rooms: Room[]): {
  minX: number;
  minY: number;
  width: number;
  height: number;
  attr: string;
} {
  let maxX = 640;
  let maxY = 360;
  for (const room of rooms) {
    const nums = room.path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    for (let i = 0; i < nums.length; i += 1) {
      if (i % 2 === 0) maxX = Math.max(maxX, nums[i]! + 28);
      else maxY = Math.max(maxY, nums[i]! + 28);
    }
  }
  const width = Math.ceil(maxX);
  const height = Math.ceil(maxY);
  return {
    minX: 0,
    minY: 0,
    width,
    height,
    attr: `0 0 ${width} ${height}`,
  };
}

export function wardSummary(ward: WardSnapshot) {
  const bedsAvailable = ward.beds.filter((b) => b.status === "available").length;
  const bedsOccupied = ward.beds.filter((b) => b.status === "occupied").length;
  const staffFree = ward.staff.filter((s) => s.status === "free").length;
  const staffResponding = ward.staff.filter(
    (s) => s.status === "responding",
  ).length;
  const openAlerts = ward.alerts.filter((a) => !a.acknowledged).length;
  const assetsMissing = ward.assets.filter((a) => a.status === "missing").length;

  return {
    bedsAvailable,
    bedsOccupied,
    bedsTotal: ward.beds.length,
    staffFree,
    staffResponding,
    staffOnFloor: ward.staff.filter((s) => s.status !== "off-floor").length,
    openAlerts,
    assetsMissing,
  };
}

export function alertAgeMin(raisedAt: string, now = Date.now()): number {
  const t = Date.parse(raisedAt);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 60000));
}

export const BED_STATUSES: BedStatus[] = [
  "available",
  "occupied",
  "cleaning",
  "reserved",
];
