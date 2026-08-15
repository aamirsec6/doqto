"use client";

import type { Alert, Focus, WardSnapshot } from "@/lib/dashboard/types";
import { alertAgeMin } from "@/lib/dashboard/layout";
import { alertTone } from "@/lib/dashboard/status";

interface Props {
  ward: WardSnapshot;
  focus: Focus;
  onFocusAlert: (id: string) => void;
  onAckAlert: (id: string) => void;
  roomLabel: (id: string) => string;
  now: number;
}

export function OpsAlerts({
  ward,
  focus,
  onFocusAlert,
  onAckAlert,
  roomLabel,
  now,
}: Props) {
  const critical = ward.alerts.find(
    (a) =>
      (a.kind === "emergency" || a.severity === "critical") &&
      a.lifecycle !== "resolved",
  );
  const sorted = [...ward.alerts].sort((a, b) => {
    const order = { critical: 0, urgent: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      {critical ? (
        <div className="ops-panel border-red-900/40 p-4 lg:col-span-5">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-red-300/90 uppercase">
            {critical.kind === "emergency" ? "Emergency response" : "Critical alert"}
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {critical.title}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Zone {roomLabel(critical.roomId)} ·{" "}
            {alertAgeMin(critical.raisedAt, now)}m ago
          </p>

          {critical.dispatched ? (
            <p className="mt-3 text-sm text-slate-200">
              {critical.acknowledged
                ? `${critical.dispatched.staffName} is responding`
                : `Dispatched: ${critical.dispatched.staffName} · awaiting acknowledgement`}
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              No free responder available for dispatch
            </p>
          )}

          {critical.nearestAssets && critical.nearestAssets.length > 0 && (
            <ul className="mt-2 space-y-1">
              {critical.nearestAssets.map((asset) => (
                <li
                  key={asset.assetId}
                  className="text-[11px] text-[var(--ops-muted)]"
                >
                  {asset.name} → {roomLabel(asset.roomId)}, {asset.lastSeenMin}m
                  ago
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {!critical.acknowledged && (
              <button
                type="button"
                onClick={() => onAckAlert(critical.id)}
                className="border border-red-800/60 bg-red-950/40 px-3 py-1.5 text-[11px] font-semibold text-red-200 transition hover:bg-red-900/40"
              >
                {critical.dispatched
                  ? `Confirm ${critical.dispatched.staffName.split(" ")[0]} responding`
                  : "Acknowledge"}
              </button>
            )}
            <button
              type="button"
              onClick={() => onFocusAlert(critical.id)}
              className="text-[11px] text-[var(--ops-muted)] underline-offset-2 hover:underline"
            >
              View details
            </button>
          </div>
        </div>
      ) : (
        <div className="ops-panel p-4 lg:col-span-5">
          <p className="ops-panel-title">Emergency response</p>
          <p className="mt-2 text-sm text-[var(--ops-muted)]">
            No open emergencies. Select a zone and raise a patient-down alert to
            dispatch the nearest responder.
          </p>
        </div>
      )}

      <div className="ops-panel p-4 lg:col-span-7">
        <div className="mb-3 flex items-center justify-between">
          <p className="ops-panel-title">Incident log</p>
          <span className="text-[10px] text-[var(--ops-muted)]">
            {sorted.length} events
          </span>
        </div>
        {sorted.length === 0 ? (
          <p className="text-[12px] text-[var(--ops-muted)]">No incidents yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[11px]">
              <thead className="text-[var(--ops-muted)]">
                <tr className="border-b border-white/5">
                  <th className="pb-2 pr-3 font-medium">Severity</th>
                  <th className="pb-2 pr-3 font-medium">Event</th>
                  <th className="pb-2 pr-3 font-medium">Zone</th>
                  <th className="pb-2 pr-3 font-medium">Responder</th>
                  <th className="pb-2 pr-3 font-medium">Age</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    active={focus.type === "alert" && focus.id === alert.id}
                    room={roomLabel(alert.roomId)}
                    age={alertAgeMin(alert.raisedAt, now)}
                    onClick={() => onFocusAlert(alert.id)}
                    onAck={() => onAckAlert(alert.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertRow({
  alert,
  active,
  room,
  age,
  onClick,
  onAck,
}: {
  alert: Alert;
  active: boolean;
  room: string;
  age: number;
  onClick: () => void;
  onAck: () => void;
}) {
  const tone = alertTone[alert.severity];
  const statusLabel = alert.acknowledged
    ? alert.dispatched
      ? `${alert.dispatched.staffName.split(" ")[0]} responding`
      : "Ack"
    : alert.dispatched
      ? "Dispatched"
      : "Open";

  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer border-b border-white/5 transition last:border-0 ${
        active ? "bg-white/5" : "hover:bg-white/[0.03]"
      }`}
    >
      <td className="py-2.5 pr-3">
        <span
          className={`px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
            alert.severity === "critical"
              ? "bg-red-950/50 text-red-300"
              : alert.severity === "urgent"
                ? "bg-amber-950/40 text-amber-200/90"
                : "bg-white/10 text-[var(--ops-muted)]"
          }`}
        >
          {tone.badge}
        </span>
      </td>
      <td className="py-2.5 pr-3 font-medium text-[var(--ops-text)]">
        {alert.title}
      </td>
      <td className="py-2.5 pr-3 text-[var(--ops-muted)]">{room}</td>
      <td className="py-2.5 pr-3 text-[var(--ops-muted)]">
        {alert.dispatched?.staffName ?? "—"}
      </td>
      <td className="py-2.5 pr-3 tabular-nums text-[var(--ops-muted)]">{age}m</td>
      <td className="py-2.5">
        {alert.acknowledged ? (
          <span className="text-[var(--ops-muted)]">{statusLabel}</span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAck();
            }}
            className="border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-slate-300"
          >
            {alert.dispatched ? "Confirm" : "Ack"}
          </button>
        )}
      </td>
    </tr>
  );
}
