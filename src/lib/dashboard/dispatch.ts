import { roomCenter } from "./status";
import { zoneDistanceMetres } from "@/lib/map/geometry";
import type {
  Asset,
  NearestAssetHint,
  StaffMember,
  WardSnapshot,
} from "./types";

const CLINICIAN_HINT =
  /physician|doctor|dr\.?|registrar|resident|mo\b|medical officer|consultant/i;

const EMERGENCY_KINDS: Asset["kind"][] = ["crash-cart", "defibrillator"];

function zoneCenter(ward: WardSnapshot, roomId: string) {
  const room = ward.rooms.find((r) => r.id === roomId);
  if (!room) return { x: 0, y: 0 };
  return roomCenter(room.path);
}

export function zoneDistance(
  ward: WardSnapshot,
  fromRoomId: string,
  toRoomId: string,
): number {
  const metres = zoneDistanceMetres(ward.rooms, fromRoomId, toRoomId);
  if (metres >= 0) return metres;
  if (fromRoomId === toRoomId) return 0;
  const a = zoneCenter(ward, fromRoomId);
  const b = zoneCenter(ward, toRoomId);
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Prefer free clinicians; fall back to any free staff by zone distance. */
export function findNearestResponder(
  ward: WardSnapshot,
  alertRoomId: string,
): StaffMember | null {
  const candidates = ward.staff.filter((s) => s.status === "free");
  if (!candidates.length) return null;

  const ranked = [...candidates].sort((a, b) => {
    const clinicianA = CLINICIAN_HINT.test(`${a.role} ${a.name}`) ? 0 : 1;
    const clinicianB = CLINICIAN_HINT.test(`${b.role} ${b.name}`) ? 0 : 1;
    if (clinicianA !== clinicianB) return clinicianA - clinicianB;
    return (
      zoneDistance(ward, alertRoomId, a.roomId) -
      zoneDistance(ward, alertRoomId, b.roomId)
    );
  });

  return ranked[0] ?? null;
}

export function findNearestEmergencyAssets(
  ward: WardSnapshot,
  alertRoomId: string,
  limit = 2,
): NearestAssetHint[] {
  const pool = ward.assets.filter(
    (a) =>
      EMERGENCY_KINDS.includes(a.kind) &&
      a.status !== "missing",
  );

  return [...pool]
    .sort(
      (a, b) =>
        zoneDistance(ward, alertRoomId, a.roomId) -
        zoneDistance(ward, alertRoomId, b.roomId),
    )
    .slice(0, limit)
    .map((a) => ({
      assetId: a.id,
      name: a.name,
      kind: a.kind,
      roomId: a.roomId,
      lastSeenMin: a.lastSeenMin ?? 0,
    }));
}

export function responderLabel(staff: StaffMember): string {
  const role = staff.role.trim();
  if (/^dr\.?\b/i.test(staff.name)) return staff.name;
  if (CLINICIAN_HINT.test(role)) return `Dr. ${staff.name.replace(/^dr\.?\s*/i, "")}`;
  return staff.name;
}
