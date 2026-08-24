import type {
  LayoutZone,
  MapCalibration,
  Point,
  Room,
  ZoneKind,
} from "@/lib/dashboard/types";

const DEFAULT_PPM = 40;
const MAP_PAD = 28;
const GAP = 16;
const CLINICAL_W = 220;
const CLINICAL_H = 170;
const SERVICE_W = 180;

export function defaultPixelsPerMetre(calibration?: MapCalibration): number {
  return calibration?.pixelsPerMetre ?? DEFAULT_PPM;
}

export function polygonCentroid(vertices: Point[]): Point {
  if (!vertices.length) return { x: 0, y: 0 };
  if (vertices.length < 3) {
    const sum = vertices.reduce(
      (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }),
      { x: 0, y: 0 },
    );
    return { x: sum.x / vertices.length, y: sum.y / vertices.length };
  }
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % vertices.length]!;
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-9) {
    const sum = vertices.reduce(
      (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }),
      { x: 0, y: 0 },
    );
    return { x: sum.x / vertices.length, y: sum.y / vertices.length };
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

export function metresToDisplay(
  point: Point,
  ppm: number,
  offset: Point = { x: MAP_PAD, y: MAP_PAD },
): Point {
  return { x: offset.x + point.x * ppm, y: offset.y + point.y * ppm };
}

export function displayToMetres(
  point: Point,
  ppm: number,
  offset: Point = { x: MAP_PAD, y: MAP_PAD },
): Point {
  return {
    x: (point.x - offset.x) / ppm,
    y: (point.y - offset.y) / ppm,
  };
}

export function verticesToSvgPath(
  vertices: Point[],
  ppm: number,
  offset: Point = { x: MAP_PAD, y: MAP_PAD },
): string {
  if (vertices.length < 3) return "";
  const pts = vertices.map((v) => metresToDisplay(v, ppm, offset));
  const [first, ...rest] = pts;
  return (
    `M ${first!.x} ${first!.y} ` +
    rest.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    " Z"
  );
}

export function computeCalibration(
  a: Point,
  b: Point,
  distanceMetres: number,
): MapCalibration {
  const pixelDist = Math.hypot(b.x - a.x, b.y - a.y);
  const pixelsPerMetre = distanceMetres > 0 ? pixelDist / distanceMetres : DEFAULT_PPM;
  return {
    pixelsPerMetre,
    reference: { a, b, distanceMetres },
  };
}

function rectPath(x: number, y: number, w: number, h: number): string {
  return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
}

function isClinicalKind(kind: ZoneKind): boolean {
  return (
    kind === "clinical" ||
    kind === "opd_registration" ||
    kind === "opd_waiting" ||
    kind === "opd_triage" ||
    kind === "opd_consultation"
  );
}

function isServiceKind(kind: ZoneKind): boolean {
  return kind === "nursing" || kind === "store" || kind === "other" || kind === "opd";
}

/** Build rooms + centres from zones; uses polygon vertices when present, else rect grid. */
export function layoutGeometry(
  zones: LayoutZone[],
  calibration?: MapCalibration,
): {
  rooms: Room[];
  centers: Record<string, Point>;
  centersM: Record<string, Point>;
} {
  const ppm = defaultPixelsPerMetre(calibration);
  const hasAnyPolygon = zones.some(
    (z) => z.verticesM && z.verticesM.length >= 3,
  );

  if (!hasAnyPolygon) {
    return layoutRectGrid(zones, ppm);
  }

  const rooms: Room[] = [];
  const centers: Record<string, Point> = {};
  const centersM: Record<string, Point> = {};
  const withoutPolygon: LayoutZone[] = [];

  for (const zone of zones) {
    if (zone.verticesM && zone.verticesM.length >= 3) {
      const path = verticesToSvgPath(zone.verticesM, ppm);
      const centreM = polygonCentroid(zone.verticesM);
      const centre = metresToDisplay(centreM, ppm);
      rooms.push({
        id: zone.id,
        label: zone.label,
        kind: zone.kind,
        path,
        parentId: zone.parentId,
        verticesM: zone.verticesM,
      });
      centers[zone.id] = centre;
      centersM[zone.id] = centreM;
    } else {
      withoutPolygon.push(zone);
    }
  }

  if (withoutPolygon.length) {
    const fallback = layoutRectGrid(withoutPolygon, ppm);
    rooms.push(...fallback.rooms);
    Object.assign(centers, fallback.centers);
    Object.assign(centersM, fallback.centersM);
  }

  return { rooms, centers, centersM };
}

function layoutRectGrid(
  zones: LayoutZone[],
  ppm: number,
): {
  rooms: Room[];
  centers: Record<string, Point>;
  centersM: Record<string, Point>;
} {
  const clinical = zones.filter((z) => isClinicalKind(z.kind));
  const services = zones.filter((z) => isServiceKind(z.kind));

  const rooms: Room[] = [];
  const centers: Record<string, Point> = {};
  const centersM: Record<string, Point> = {};
  const cols = clinical.length <= 2 ? clinical.length || 1 : 2;
  const rows = Math.ceil(clinical.length / cols) || 1;
  const mapH = Math.max(
    MAP_PAD * 2 + rows * CLINICAL_H + (rows - 1) * GAP,
    MAP_PAD * 2 + services.length * 100 + Math.max(0, services.length - 1) * GAP,
  );

  clinical.forEach((zone, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MAP_PAD + col * (CLINICAL_W + GAP);
    const y = MAP_PAD + row * (CLINICAL_H + GAP);
    const wM = CLINICAL_W / ppm;
    const hM = CLINICAL_H / ppm;
    const verticesM: Point[] = [
      { x: (x - MAP_PAD) / ppm, y: (y - MAP_PAD) / ppm },
      { x: (x - MAP_PAD) / ppm + wM, y: (y - MAP_PAD) / ppm },
      { x: (x - MAP_PAD) / ppm + wM, y: (y - MAP_PAD) / ppm + hM },
      { x: (x - MAP_PAD) / ppm, y: (y - MAP_PAD) / ppm + hM },
    ];
    rooms.push({
      id: zone.id,
      label: zone.label,
      kind: zone.kind,
      path: rectPath(x, y, CLINICAL_W, CLINICAL_H),
      parentId: zone.parentId,
      verticesM,
    });
    centers[zone.id] = { x: x + CLINICAL_W / 2, y: y + CLINICAL_H / 2 };
    centersM[zone.id] = polygonCentroid(verticesM);
  });

  const serviceX =
    MAP_PAD + cols * CLINICAL_W + (cols > 0 ? (cols - 1) * GAP : 0) + GAP;
  const serviceH = Math.max(
    90,
    (mapH - MAP_PAD * 2 - Math.max(0, services.length - 1) * GAP) /
      Math.max(services.length, 1),
  );

  services.forEach((zone, i) => {
    const y = MAP_PAD + i * (serviceH + GAP);
    const wM = SERVICE_W / ppm;
    const hM = serviceH / ppm;
    const verticesM: Point[] = [
      { x: (serviceX - MAP_PAD) / ppm, y: (y - MAP_PAD) / ppm },
      { x: (serviceX - MAP_PAD) / ppm + wM, y: (y - MAP_PAD) / ppm },
      { x: (serviceX - MAP_PAD) / ppm + wM, y: (y - MAP_PAD) / ppm + hM },
      { x: (serviceX - MAP_PAD) / ppm, y: (y - MAP_PAD) / ppm + hM },
    ];
    rooms.push({
      id: zone.id,
      label: zone.label,
      kind: zone.kind,
      path: rectPath(serviceX, y, SERVICE_W, serviceH),
      parentId: zone.parentId,
      verticesM,
    });
    centers[zone.id] = {
      x: serviceX + SERVICE_W / 2,
      y: y + serviceH / 2,
    };
    centersM[zone.id] = polygonCentroid(verticesM);
  });

  return { rooms, centers, centersM };
}

/** Distance between zone centres; uses metres when both rooms have verticesM. */
export function zoneDistanceMetres(
  rooms: Room[],
  fromRoomId: string,
  toRoomId: string,
): number {
  if (fromRoomId === toRoomId) return 0;
  const a = rooms.find((r) => r.id === fromRoomId);
  const b = rooms.find((r) => r.id === toRoomId);
  if (a?.verticesM?.length && b?.verticesM?.length) {
    const ca = polygonCentroid(a.verticesM);
    const cb = polygonCentroid(b.verticesM);
    return Math.hypot(ca.x - cb.x, ca.y - cb.y);
  }
  return -1;
}
