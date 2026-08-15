"use client";

import type { Focus, StaffMember, WardSnapshot } from "@/lib/dashboard/types";
import { staffLabel } from "@/lib/dashboard/status";

interface Props {
  ward: WardSnapshot;
  focus: Focus;
  onFocusStaff: (id: string) => void;
  onSetStaffStatus?: (id: string, status: StaffMember["status"]) => void;
}

export function OpsRightRail({
  ward,
  focus,
  onFocusStaff,
  onSetStaffStatus,
}: Props) {
  const occupiedSeries = ward.metrics.map((m) => m.bedsOccupied);
  const freeSeries = ward.metrics.map((m) => m.staffFree);
  const pad = (series: number[], minLen = 8) => {
    if (series.length >= minLen) return series.slice(-12);
    return [...Array(minLen - series.length).fill(series[0] ?? 0), ...series];
  };

  const staff = [...ward.staff].sort((a, b) => {
    const order = { responding: 0, free: 1, busy: 2, "off-floor": 3 };
    return order[a.status] - order[b.status];
  });

  const latestOcc = occupiedSeries[occupiedSeries.length - 1] ?? 0;
  const latestFree = freeSeries[freeSeries.length - 1] ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <section className="ops-panel p-4">
        <p className="ops-panel-title">Beds occupied · live</p>
        <p className="mt-1 text-[10px] text-[var(--ops-muted)]">
          From your updates (last {pad(occupiedSeries).length} samples)
        </p>
        <MiniChart
          current={pad(occupiedSeries)}
          color="#f04343"
          unit="beds"
          latest={latestOcc}
        />
      </section>

      <section className="ops-panel p-4">
        <p className="ops-panel-title">Staff free · live</p>
        <MiniChart
          current={pad(freeSeries)}
          color="#34d399"
          unit="people"
          latest={latestFree}
        />
      </section>

      <section className="ops-panel flex min-h-0 flex-1 flex-col p-4">
        <p className="ops-panel-title">Staff availability</p>
        <ul className="mt-3 space-y-1.5">
          {staff.map((person) => (
            <StaffRow
              key={person.id}
              person={person}
              roomLabel={
                ward.rooms.find((r) => r.id === person.roomId)?.label ?? "—"
              }
              active={focus.type === "staff" && focus.id === person.id}
              onClick={() => onFocusStaff(person.id)}
              onQuickStatus={
                onSetStaffStatus
                  ? (status) => onSetStaffStatus(person.id, status)
                  : undefined
              }
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function StaffRow({
  person,
  roomLabel,
  active,
  onClick,
  onQuickStatus,
}: {
  person: StaffMember;
  roomLabel: string;
  active: boolean;
  onClick: () => void;
  onQuickStatus?: (status: StaffMember["status"]) => void;
}) {
  const tone =
    person.status === "responding"
      ? "text-[#f04343]"
      : person.status === "free"
        ? "text-[#34d399]"
        : person.status === "busy"
          ? "text-[#fbbf24]"
          : "text-[var(--ops-muted)]";

  return (
    <div
      className={`rounded-lg border px-2.5 py-2 transition ${
        active
          ? "border-sky-400/40 bg-sky-500/10"
          : "border-transparent hover:border-white/10 hover:bg-white/5"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2 text-left"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            person.status === "responding"
              ? "bg-[#f04343]"
              : person.status === "free"
                ? "bg-[#34d399]"
                : person.status === "busy"
                  ? "bg-[#fbbf24]"
                  : "bg-slate-500"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-[var(--ops-text)]">
            {person.name}
          </p>
          <p className="truncate text-[10px] text-[var(--ops-muted)]">
            {person.role} · {roomLabel}
          </p>
        </div>
        <span className={`text-[10px] font-semibold ${tone}`}>
          {staffLabel[person.status]}
        </span>
      </button>
      {onQuickStatus && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(["free", "busy", "responding"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onQuickStatus(status)}
              className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                person.status === status
                  ? "bg-sky-500/20 text-sky-300"
                  : "bg-black/30 text-[var(--ops-muted)] hover:text-[var(--ops-text)]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniChart({
  current,
  color,
  unit,
  latest,
}: {
  current: number[];
  color: string;
  unit: string;
  latest: number;
}) {
  const w = 240;
  const h = 72;
  const max = Math.max(...current, 1);

  const toPoints = (series: number[]) =>
    series
      .map((v, i) => {
        const x = (i / Math.max(series.length - 1, 1)) * w;
        const y = h - (v / max) * (h - 8) - 4;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="mt-3">
      <p className="font-display text-2xl font-semibold tabular-nums" style={{ color }}>
        {latest}
        <span className="ml-1 text-xs font-medium text-[var(--ops-muted)]">
          {unit}
        </span>
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-16 w-full">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={toPoints(current)}
        />
      </svg>
    </div>
  );
}
