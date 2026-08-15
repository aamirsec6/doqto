import { NextResponse } from "next/server";
import {
  getTrackingState,
  ingestSighting,
  listLocations,
  seedPilotTrackingConfig,
  setTrackingConfig,
  simulateRandomSighting,
} from "@/lib/tracking/store";

export async function GET() {
  const state = getTrackingState();
  return NextResponse.json({
    config: state.config,
    locations: listLocations(),
    recentSightings: state.recentSightings.slice(0, 40),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? "ingest");

    if (action === "seed-config") {
      const rooms = Array.isArray(body.rooms) ? body.rooms : [];
      const config = seedPilotTrackingConfig(
        rooms.map((r: { id: string; label: string }) => ({
          id: String(r.id),
          label: String(r.label),
        })),
        {
          staff: Array.isArray(body.staff)
            ? body.staff.map((s: { id: string; name: string }) => ({
                id: String(s.id),
                name: String(s.name),
              }))
            : undefined,
          assets: Array.isArray(body.assets)
            ? body.assets.map((a: { id: string; name: string }) => ({
                id: String(a.id),
                name: String(a.name),
              }))
            : undefined,
        },
      );
      return NextResponse.json({ ok: true, config });
    }

    if (action === "set-config") {
      const config = setTrackingConfig(body.config);
      return NextResponse.json({ ok: true, config });
    }

    if (action === "simulate") {
      const count = Math.min(20, Math.max(1, Number(body.count) || 1));
      const resolved = [];
      for (let i = 0; i < count; i += 1) {
        const hit = simulateRandomSighting();
        if (hit) resolved.push(hit);
      }
      return NextResponse.json({
        ok: true,
        resolved,
        locations: listLocations(),
      });
    }

    // Single or batch ingest from BLE gateway / phone
    const sights = Array.isArray(body.sightings)
      ? body.sightings
      : [body];

    const resolved = [];
    for (const s of sights) {
      if (!s?.tagHardwareId) continue;
      const hit = ingestSighting({
        tagHardwareId: String(s.tagHardwareId),
        beaconHardwareId: s.beaconHardwareId
          ? String(s.beaconHardwareId)
          : undefined,
        roomId: s.roomId ? String(s.roomId) : undefined,
        rssi: typeof s.rssi === "number" ? s.rssi : undefined,
        batteryPct: typeof s.batteryPct === "number" ? s.batteryPct : undefined,
        source: s.source,
        seenAt: s.seenAt,
      });
      if (hit) resolved.push(hit);
    }

    return NextResponse.json({
      ok: true,
      resolved,
      locations: listLocations(),
    });
  } catch {
    return NextResponse.json({ error: "Invalid tracking payload" }, { status: 400 });
  }
}
