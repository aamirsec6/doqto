"use client";

import { useState } from "react";
import type { Focus, WardSnapshot } from "@/lib/dashboard/types";
import { alertAgeMin } from "@/lib/dashboard/layout";
import { alertTone } from "@/lib/dashboard/status";
import type { Alert } from "@/lib/dashboard/types";

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
  const [expanded, setExpanded] = useState(false);
  const open = ward.alerts.filter(
    (a) => a.lifecycle !== "resolved" && !a.acknowledged,
  );
  const sorted = [...ward.alerts].sort((a, b) => {
    const order = { critical: 0, urgent: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  if (open.length === 0 && sorted.length <= 1) {
    return null;
  }

  return (
    <div className="ops-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-[11px] font-semibold text-[var(--ops-muted)]">
          Incident log
          {open.length > 0 && (
            <span className="ml-2 text-red-300">{open.length} open</span>
          )}
        </span>
        <span className="text-[10px] text-[var(--ops-muted)]">
          {expanded ? "Hide" : "Show"} · {sorted.length} events
        </span>
      </button>
      {expanded && (
        <div className="border-t border-white/5 px-4 pb-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[11px]">
              <thead className="text-[var(--ops-muted)]">
                <tr className="border-b border-white/5">
                  <th className="pb-2 pr-3 font-medium">Severity</th>
                  <th className="pb-2 pr-3 font-medium">Event</th>
                  <th className="pb-2 pr-3 font-medium">Zone</th>
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
        </div>
      )}
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
      ? `${alert.dispatched.staffName.split(" ")[0]} on scene`
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
      <td className="py-2 pr-3">
        <span
          className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
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
      <td className="py-2 pr-3 font-medium text-[var(--ops-text)]">{alert.title}</td>
      <td className="py-2 pr-3 text-[var(--ops-muted)]">{room}</td>
      <td className="py-2 pr-3 tabular-nums text-[var(--ops-muted)]">{age}m</td>
      <td className="py-2">
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
