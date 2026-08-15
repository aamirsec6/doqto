"use client";

import type { ReactNode } from "react";
import type {
  Alert,
  Asset,
  Focus,
  StaffMember,
  ViewerRole,
} from "@/lib/dashboard/types";
import {
  alertTone,
  assetLabel,
  staffLabel,
} from "@/lib/dashboard/status";

interface Props {
  role: ViewerRole;
  alerts: Alert[];
  staff: StaffMember[];
  assets: Asset[];
  focus: Focus;
  onFocus: (focus: Focus) => void;
  roomLabel: (roomId: string) => string;
}

export function ActionRail({
  role,
  alerts,
  staff,
  assets,
  focus,
  onFocus,
  roomLabel,
}: Props) {
  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { critical: 0, urgent: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const sortedStaff = [...staff].sort((a, b) => {
    const order = { responding: 0, free: 1, busy: 2, "off-floor": 3 };
    return order[a.status] - order[b.status];
  });

  const showAssets = role !== "nurse" || assets.some((a) => a.status === "missing");

  return (
    <aside className="flex min-h-0 flex-col gap-3">
      <Panel title="Alerts" hint="Act on these first">
        <ul className="space-y-2">
          {sortedAlerts.map((alert) => {
            const tone = alertTone[alert.severity];
            const active = focus.type === "alert" && focus.id === alert.id;
            return (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => onFocus({ type: "alert", id: alert.id })}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${tone.border} ${tone.bg} ${
                    active ? "ring-2 ring-red/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-semibold tracking-wider uppercase ${tone.text}`}
                    >
                      {tone.badge}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {alert.raisedMinAgo}m ago
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-text">
                    {alert.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                    {alert.detail}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Who’s free" hint="Nearest help at a glance">
        <ul className="divide-y divide-red/10">
          {sortedStaff.map((person) => {
            const active = focus.type === "staff" && focus.id === person.id;
            return (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => onFocus({ type: "staff", id: person.id })}
                  className={`flex w-full items-center gap-3 px-1 py-2.5 text-left transition hover:bg-peach-light/80 ${
                    active ? "bg-peach-light" : ""
                  }`}
                >
                  <StatusDot status={person.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {person.name}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {person.role} · {roomLabel(person.roomId)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-text-muted">
                    {staffLabel[person.status]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      {showAssets && (
        <Panel title="Find equipment" hint="Crash cart & devices">
          <ul className="divide-y divide-red/10">
            {assets.map((asset) => {
              const active = focus.type === "asset" && focus.id === asset.id;
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => onFocus({ type: "asset", id: asset.id })}
                    className={`flex w-full items-center gap-3 px-1 py-2.5 text-left transition hover:bg-peach-light/80 ${
                      active ? "bg-peach-light" : ""
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rotate-45 rounded-[2px]"
                      style={{
                        background:
                          asset.status === "available"
                            ? "#16a34a"
                            : asset.status === "missing"
                              ? "#cc0000"
                              : "#2563eb",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">
                        {asset.name}
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        {roomLabel(asset.roomId)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[11px] font-medium ${
                        asset.status === "missing" ? "text-red" : "text-text-muted"
                      }`}
                    >
                      {assetLabel[asset.status]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </aside>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-red/15 bg-white">
      <div className="border-b border-red/10 px-4 py-3">
        <p className="text-sm font-semibold text-text">{title}</p>
        <p className="text-xs text-text-muted">{hint}</p>
      </div>
      <div className="max-h-56 overflow-y-auto px-3 py-2">{children}</div>
    </section>
  );
}

function StatusDot({ status }: { status: StaffMember["status"] }) {
  const color =
    status === "free"
      ? "bg-emerald-500"
      : status === "busy"
        ? "bg-amber-500"
        : status === "responding"
          ? "bg-red"
          : "bg-neutral-300";
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {status === "responding" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red opacity-50" />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}
