"use client";

import type { Focus, WardSnapshot } from "@/lib/dashboard/types";
import type { wardSummary } from "@/lib/dashboard/layout";

type Summary = ReturnType<typeof wardSummary>;

interface ZoneRow {
  id: string;
  label: string;
  occupied: number;
  total: number;
  freeStaff: number;
  heat: "ok" | "watch" | "critical";
}

interface Props {
  summary: Summary;
  zones: ZoneRow[];
  focus: Focus;
  onFocusZone: (id: string) => void;
}

export function OpsLeftRail({ summary, zones, focus, onFocusZone }: Props) {
  const occupancy =
    summary.bedsTotal === 0
      ? 0
      : Math.round((summary.bedsOccupied / summary.bedsTotal) * 100);

  return (
    <div className="flex flex-col gap-3">
      <section className="ops-panel p-4">
        <p className="ops-panel-title">Live ward status</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Kpi label="Beds free" value={String(summary.bedsAvailable)} tone="green" />
          <Kpi label="Staff free" value={String(summary.staffFree)} tone="cyan" />
          <Kpi
            label="Open alerts"
            value={String(summary.openAlerts)}
            tone={summary.openAlerts > 0 ? "red" : "muted"}
          />
        </div>
        <div className="mt-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--ops-muted)]">Occupancy</span>
            <span className="font-semibold tabular-nums text-[var(--ops-text)]">
              {occupancy}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all"
              style={{ width: `${occupancy}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-[var(--ops-muted)]">
            {summary.bedsOccupied}/{summary.bedsTotal} beds ·{" "}
            {summary.staffOnFloor} on floor
          </p>
        </div>
      </section>

      <section className="ops-panel flex min-h-0 flex-1 flex-col p-4">
        <p className="ops-panel-title">Zone load monitor</p>
        <div className="mt-3 overflow-hidden rounded-lg border border-white/5">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-black/30 text-[var(--ops-muted)]">
              <tr>
                <th className="px-2.5 py-2 font-medium">Zone</th>
                <th className="px-2.5 py-2 font-medium">Beds</th>
                <th className="px-2.5 py-2 font-medium">Wait*</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => {
                const active = focus.type === "room" && focus.id === z.id;
                const wait =
                  z.heat === "critical" ? "High" : z.heat === "watch" ? "Med" : "Ok";
                return (
                  <tr
                    key={z.id}
                    onClick={() => onFocusZone(z.id)}
                    className={`cursor-pointer border-t border-white/5 transition ${
                      z.heat === "critical"
                        ? "bg-red-500/15"
                        : active
                          ? "bg-sky-500/10"
                          : "hover:bg-white/5"
                    }`}
                  >
                    <td className="px-2.5 py-2 font-medium text-[var(--ops-text)]">
                      {z.label}
                    </td>
                    <td className="px-2.5 py-2 tabular-nums text-[var(--ops-muted)]">
                      {z.occupied}/{z.total}
                    </td>
                    <td
                      className={`px-2.5 py-2 font-semibold ${
                        z.heat === "critical"
                          ? "text-[#f04343]"
                          : z.heat === "watch"
                            ? "text-[#fbbf24]"
                            : "text-[#34d399]"
                      }`}
                    >
                      {wait}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-[var(--ops-muted)]">
          *Pilot proxy from bed pressure (not OPD queue yet)
        </p>
      </section>

      <section className="ops-panel p-4">
        <p className="ops-panel-title">Flagged red</p>
        <ul className="mt-3 space-y-2">
          {zones
            .filter((z) => z.heat !== "ok")
            .slice(0, 3)
            .map((z) => (
              <li key={z.id}>
                <button
                  type="button"
                  onClick={() => onFocusZone(z.id)}
                  className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-left text-[11px] transition hover:border-red-400/60 hover:bg-red-500/15"
                >
                  <p className="font-semibold text-[#f04343]">{z.label}</p>
                  <p className="mt-0.5 text-[var(--ops-muted)]">
                    {z.occupied}/{z.total} beds occupied · pressure{" "}
                    {z.heat === "critical" ? "high" : "elevated"}
                  </p>
                </button>
              </li>
            ))}
          {zones.every((z) => z.heat === "ok") && (
            <li className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">
              No zones above pressure threshold
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "cyan" | "red" | "muted";
}) {
  const color =
    tone === "green"
      ? "text-[#34d399]"
      : tone === "cyan"
        ? "text-[#38bdf8]"
        : tone === "red"
          ? "text-[#f04343]"
          : "text-[var(--ops-muted)]";
  return (
    <div className="rounded-lg border border-white/5 bg-black/25 px-2 py-2.5 text-center">
      <p className={`font-display text-xl font-semibold tabular-nums ${color}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-[var(--ops-muted)]">{label}</p>
    </div>
  );
}

export function buildZoneRows(ward: WardSnapshot): ZoneRow[] {
  return ward.rooms
    .filter((r) => r.kind === "clinical" || ward.beds.some((b) => b.roomId === r.id))
    .map((room) => {
      const beds = ward.beds.filter((b) => b.roomId === room.id);
      const occupied = beds.filter((b) => b.status === "occupied").length;
      const total = beds.length;
      const ratio = total === 0 ? 0 : occupied / total;
      const freeStaff = ward.staff.filter(
        (s) => s.roomId === room.id && s.status === "free",
      ).length;
      const heat: ZoneRow["heat"] =
        ratio >= 0.85 || (total > 0 && occupied === total)
          ? "critical"
          : ratio >= 0.6
            ? "watch"
            : "ok";
      return {
        id: room.id,
        label: room.label,
        occupied,
        total,
        freeStaff,
        heat,
      };
    })
    .filter((z) => z.total > 0 || ward.rooms.find((r) => r.id === z.id)?.kind === "clinical");
}
