"use client";

import { useState } from "react";
import type { Alert, WardSnapshot } from "@/lib/dashboard/types";

interface Props {
  ward: WardSnapshot;
  onRaiseCodeBlue: () => Promise<void>;
  onRefresh: () => void;
}

export function AlertBar({ ward, onRaiseCodeBlue, onRefresh }: Props) {
  const [busy, setBusy] = useState(false);
  const open = ward.alerts.filter((a) => a.lifecycle !== "resolved");

  const raise = async () => {
    setBusy(true);
    try {
      await onRaiseCodeBlue();
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="board-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Alerts</h2>
          <p className="text-xs text-slate-500">
            {open.length} open · synced live
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void raise()}
          className="rounded-lg bg-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Code Blue
        </button>
      </div>
      {open.length > 0 && (
        <ul className="mt-3 space-y-2">
          {open.map((alert) => (
            <AlertRow key={alert.id} alert={alert} ward={ward} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AlertRow({ alert, ward }: { alert: Alert; ward: WardSnapshot }) {
  const zone =
    ward.rooms.find((r) => r.id === alert.roomId)?.label ?? alert.roomId;
  return (
    <li className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm">
      <p className="font-semibold text-red-900">{alert.title}</p>
      <p className="text-xs text-red-800/80">
        {zone} · {alert.severity}
        {alert.dispatched ? ` · ${alert.dispatched.staffName}` : ""}
      </p>
    </li>
  );
}
