"use client";

import { useEffect, useState } from "react";
import type { ResolvedLocation, TrackingConfig } from "@/lib/tracking/types";

interface Props {
  rooms: { id: string; label: string }[];
  staff: { id: string; name: string }[];
  assets: { id: string; name: string }[];
  onLocations: (locations: ResolvedLocation[]) => void;
}

export function TrackingControl({
  rooms,
  staff,
  assets,
  onLocations,
}: Props) {
  const [config, setConfig] = useState<TrackingConfig | null>(null);
  const [locations, setLocations] = useState<ResolvedLocation[]>([]);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = async () => {
    const res = await fetch("/api/tracking", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setConfig(data.config);
    setLocations(data.locations ?? []);
    onLocations(data.locations ?? []);
  };

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (live) void refresh();
    }, 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const seedConfig = async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "seed-config",
          rooms,
          staff,
          assets,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setConfig(data.config);
      setMessage(
        `Tracking ready · ${data.config.beacons.length} beacons · ${data.config.tags.length} tags`,
      );
      setLive(true);
      await refresh();
    } catch {
      setMessage("Could not configure tracking.");
    } finally {
      setBusy(false);
    }
  };

  const simulate = async () => {
    setBusy(true);
    try {
      if (!config?.beacons.length) await seedConfig();
      const res = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulate", count: 3 }),
      });
      const data = await res.json();
      setLocations(data.locations ?? []);
      onLocations(data.locations ?? []);
      setLive(true);
      setMessage(`Live fix · ${data.resolved?.length ?? 0} tag(s) moved`);
    } catch {
      setMessage("Simulate failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ops-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-panel-title">Real-time tracking (BLE)</p>
          <p className="mt-1 text-[11px] text-[var(--ops-muted)]">
            Room-level · gateway posts to{" "}
            <code className="text-sky-300">/api/tracking</code>
            {live ? " · polling every 2s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void seedConfig()}
            className="rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)] hover:border-sky-400/40 hover:text-sky-300 disabled:opacity-40"
          >
            Bind beacons to map
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void simulate()}
            className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
          >
            Simulate live move
          </button>
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${
              live
                ? "border-red-400/40 bg-red-500/10 text-[#f04343]"
                : "border-white/10 text-[var(--ops-muted)]"
            }`}
          >
            {live ? "Stop poll" : "Start poll"}
          </button>
        </div>
      </div>

      {message && (
        <p className="mt-2 text-[11px] text-sky-300">{message}</p>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
          <p className="text-[10px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
            Zone beacons
          </p>
          <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[11px]">
            {(config?.beacons ?? []).map((b) => (
              <li key={b.id} className="flex justify-between gap-2">
                <span className="text-[var(--ops-text)]">{b.label}</span>
                <span className="font-mono text-[var(--ops-muted)]">
                  {b.hardwareId}
                </span>
              </li>
            ))}
            {!config?.beacons?.length && (
              <li className="text-[var(--ops-muted)]">
                Not bound yet — click “Bind beacons to map”
              </li>
            )}
          </ul>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
          <p className="text-[10px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
            Live tag positions
          </p>
          <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[11px]">
            {locations.map((loc) => (
              <li key={loc.tagHardwareId} className="flex justify-between gap-2">
                <span className="text-[var(--ops-text)]">{loc.label}</span>
                <span className="text-[var(--ops-muted)]">
                  {rooms.find((r) => r.id === loc.roomId)?.label ?? loc.roomId}
                  {loc.rssi != null ? ` · ${loc.rssi}dBm` : ""}
                </span>
              </li>
            ))}
            {!locations.length && (
              <li className="text-[var(--ops-muted)]">
                Waiting for gateway or simulator
              </li>
            )}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-[var(--ops-muted)]">
        Gateway payload example:{" "}
        <code className="text-sky-300/90">
          {`{"tagHardwareId":"TAG-STAFF-01","beaconHardwareId":"BEACON-01","rssi":-62}`}
        </code>
      </p>
    </section>
  );
}
