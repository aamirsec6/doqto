"use client";

import Link from "next/link";
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
  onFocusAlert: (id: string) => void;
  onAckAlert: (id: string) => void;
  onRaiseEmergency: () => void;
  roomLabel: (id: string) => string;
}

export function ActionStrip({
  ward,
  summary,
  now,
  onFocusAlert,
  onAckAlert,
  onRaiseEmergency,
  roomLabel,
}: Props) {
  const critical =
    ward.alerts.find(
      (a) =>
        (a.kind === "emergency" || a.severity === "critical") &&
        a.lifecycle !== "resolved",
    ) ?? null;

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <div className="lg:col-span-5">
        {critical ? (
          <CriticalCard
            alert={critical}
            age={alertAgeMin(critical.raisedAt, now)}
            zone={roomLabel(critical.roomId)}
            onFocus={() => onFocusAlert(critical.id)}
            onAck={() => onAckAlert(critical.id)}
          />
        ) : (
          <div className="ops-panel flex h-full flex-col justify-between p-4">
            <div>
              <p className="ops-panel-title">Act now</p>
              <p className="mt-2 text-sm text-[var(--ops-muted)]">
                No open emergency. Raise a Code Blue from the map zone, or use
                the button below.
              </p>
            </div>
            <button
              type="button"
              onClick={onRaiseEmergency}
              className="mt-4 w-full border border-red-800/50 bg-red-950/35 px-3 py-2.5 text-[12px] font-semibold text-red-200 transition hover:bg-red-900/40"
            >
              Raise Code Blue · page nearest help
            </button>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
              <Link
                href="/ops"
                className="font-semibold text-sky-300 underline-offset-2 hover:underline"
              >
                Staff net
              </Link>
              <Link
                href="/staff"
                className="font-semibold text-[var(--ops-muted)] underline-offset-2 hover:underline"
              >
                Open my board
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-7">
        <Metric
          label="Available staff"
          value={String(summary.staffFree)}
          hint="Ready to respond"
          tone={summary.staffFree === 0 ? "warn" : "ok"}
        />
        <Metric
          label="Responding"
          value={String(summary.staffResponding)}
          hint="On an alert"
          tone={summary.staffResponding > 0 ? "alert" : "muted"}
        />
        <Metric
          label="Ready beds"
          value={String(summary.bedsAvailable)}
          hint={`${summary.bedsOccupied} occupied`}
          tone="ok"
        />
        <Metric
          label="Open alerts"
          value={String(summary.openAlerts)}
          hint="Need attention"
          tone={summary.openAlerts > 0 ? "alert" : "muted"}
        />
      </div>
    </div>
  );
}

function CriticalCard({
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
    <div className="ops-panel border-red-900/50 p-4">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-red-300/90 uppercase">
        Act now · Code Blue
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{alert.title}</p>
      <p className="mt-1 text-[12px] text-slate-300">
        {zone} · {age}m ago
      </p>
      {alert.dispatched ? (
        <p className="mt-3 text-sm text-slate-100">
          {alert.acknowledged
            ? `${alert.dispatched.staffName} is responding`
            : `Dispatched ${alert.dispatched.staffName} · awaiting confirm`}
        </p>
      ) : (
        <p className="mt-3 text-sm text-slate-400">No free responder found</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {!alert.acknowledged && (
          <button
            type="button"
            onClick={onAck}
            className="border border-red-800/60 bg-red-950/40 px-3 py-1.5 text-[11px] font-semibold text-red-200"
          >
            Confirm responding
          </button>
        )}
        <button
          type="button"
          onClick={onFocus}
          className="text-[11px] text-[var(--ops-muted)] underline-offset-2 hover:underline"
        >
          Open details
        </button>
        <Link
          href="/ops"
          className="text-[11px] font-semibold text-sky-300 underline-offset-2 hover:underline"
        >
          Staff net
        </Link>
        <Link
          href="/staff"
          className="text-[11px] font-semibold text-[var(--ops-muted)] underline-offset-2 hover:underline"
        >
          My board
        </Link>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "ok" | "warn" | "alert" | "muted";
}) {
  const color =
    tone === "alert"
      ? "text-[#f04343]"
      : tone === "warn"
        ? "text-[#fbbf24]"
        : tone === "ok"
          ? "text-[#34d399]"
          : "text-[var(--ops-text)]";

  return (
    <div className="ops-panel px-3 py-3">
      <p className="text-[10px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl font-semibold tabular-nums ${color}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-[var(--ops-muted)]">{hint}</p>
    </div>
  );
}
