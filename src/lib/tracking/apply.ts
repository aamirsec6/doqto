import type { ResolvedLocation } from "@/lib/tracking/types";
import { roomCenter } from "@/lib/dashboard/status";
import type { WardSnapshot } from "@/lib/dashboard/types";

/** Apply BLE-resolved locations onto staff/assets on the live ward. */
export function applyTrackingLocations(
  ward: WardSnapshot,
  locations: ResolvedLocation[],
): WardSnapshot {
  if (!locations.length) return ward;

  let staff = [...ward.staff];
  let assets = [...ward.assets];
  let changed = false;

  for (const loc of locations) {
    if (!loc.entityId || loc.entityType === "unknown") continue;
    const room = ward.rooms.find((r) => r.id === loc.roomId);
    if (!room) continue;
    const center = roomCenter(room.path);
    const ageMin = Math.max(
      0,
      Math.floor((Date.now() - Date.parse(loc.seenAt)) / 60000),
    );

    if (loc.entityType === "staff") {
      staff = staff.map((person, index) => {
        if (person.id !== loc.entityId) return person;
        if (person.roomId === loc.roomId && person.lastSeenMin === ageMin) {
          return person;
        }
        changed = true;
        return {
          ...person,
          roomId: loc.roomId,
          lastSeenMin: ageMin,
          status: person.status === "off-floor" ? "free" : person.status,
          position: {
            x: center.x + ((index % 3) - 1) * 14,
            y: center.y + ((index % 2) * 12 - 6),
          },
        };
      });
    }

    if (loc.entityType === "asset") {
      assets = assets.map((asset) => {
        if (asset.id !== loc.entityId) return asset;
        if (asset.roomId === loc.roomId && asset.lastSeenMin === ageMin) {
          return asset;
        }
        changed = true;
        return {
          ...asset,
          roomId: loc.roomId,
          lastSeenMin: ageMin,
          status: asset.status === "missing" ? "available" : asset.status,
          position: { x: center.x + 10, y: center.y + 10 },
        };
      });
    }
  }

  if (!changed) return ward;
  return {
    ...ward,
    staff,
    assets,
    updatedAt: new Date().toISOString(),
  };
}
