"use client";

import type { Alert, WardSnapshot } from "@/lib/dashboard/types";
import { alertAgeMin } from "@/lib/dashboard/layout";

interface Summary {
  bedsAvailable: number;
  bedsOccupied: number;
  staffFree: number;
  staffResponding: number;
  openAlerts: number;
}

interface Props {
  ward: WardSnapshot;
  summary: Summary;
  now: number;
  roomLabel: (id: string) => string;
  onFocusAlert: (id: string) => void;
  onAckAlert: (id: string) => void;
}

export function KpiStrip({ ward, summary, now, roomLabel, onFocusAlert, onAckAlert }: Props) {
  const critical =
    ward.alerts.find(
      (a) =>
        (a.kind === "emergency" || a.severity === "critical") &&
        a.lifecycle !== "resolved",
    ) ?? null;

  if (critical) {
    return (
      <EmergencyBanner
        alert={critical}
        age={alertAgeMin(critical.raisedAt, now)}
        zone={roomLabel(critical.roomId)}
        onFocus={() => onFocusAlert(critical.id)}
        onAck={() => onAckAlert(critical.id)}
      />
    );
  }

  return (
    <div className="ops-kpi-strip flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
      <Kpi value={summary.staffFree} label="staff free" tone="ok" />
      <Divider />
      <Kpi
        value={summary.staffResponding}
        label="responding"
        tone={summary.staffResponding > 0 ? "alert" : "muted"}
      />
      <Divider />
      <Kpi value={summary.bedsAvailable} label="beds ready" tone="ok" />
      <Divider />
      <Kpi
        value={summary.openAlerts}
        label="open alerts"
        tone={summary.openAlerts > 0 ? "alert" : "muted"}
      />
      <span className="ml-auto hidden text-[11px] text-[var(--ops-muted)] sm:inline">
        All clear · tap map to inspect
      </span>
    </div>
  );
}

function EmergencyBanner({
  alert,
  age,
  zone,
  onFocus,
  onAck,
}: {
  alert: Alert;
  age: number;
  zone: string;
  onFocus: () => void;
  onAck: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-red-900/60 bg-red-950/40 px-4 py-3">
      <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold tracking-[0.14em] text-red-300 uppercase">
          Code Blue · {zone} · {age}m
        </p>
        <p className="truncate text-sm font-semibold text-white">{alert.title}</p>
        {alert.dispatched && (
          <p className="text-[11px] text-red-100/80">
            {alert.acknowledged
              ? `${alert.dispatched.staffName} responding`
              : `${alert.dispatched.staffName} dispatched · awaiting confirm`}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {!alert.acknowledged && (
          <button
            type="button"
            onClick={onAck}
            className="border border-red-400/50 bg-red-900/50 px-3 py-1.5 text-[11px] font-semibold text-red-100 transition hover:bg-red-800/60"
          >
            Confirm
          </button>
        )}
        <button
          type="button"
          onClick={onFocus}
          className="border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10"
        >
          Details
        </button>
      </div>
    </div>
  );
}

function Kpi({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "ok" | "alert" | "muted";
}) {
  const color =
    tone === "alert"
      ? "text-[#f87171]"
      : tone === "ok"
        ? "text-[#34d399]"
        : "text-[var(--ops-text)]";

  return (
    <div className="flex items-baseline gap-2">
      <span className={`font-display text-2xl font-semibold tabular-nums ${color}`}>
        {value}
      </span>
      <span className="text-[11px] text-[var(--ops-muted)]">{label}</span>
    </div>
  );
}

function Divider() {
  return <span className="hidden h-4 w-px bg-white/10 sm:block" />;
}
