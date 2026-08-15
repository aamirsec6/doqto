"use client";

import type { ReactNode } from "react";
import type { Focus, WardSnapshot } from "@/lib/dashboard/types";
import {
  assetLabel,
  bedLabel,
  staffLabel,
} from "@/lib/dashboard/status";

interface Props {
  ward: WardSnapshot;
  focus: Focus;
  roomLabel: (roomId: string) => string;
  onClear: () => void;
}

export function FocusDetail({ ward, focus, roomLabel, onClear }: Props) {
  if (focus.type === "none") {
    return (
      <div className="rounded-2xl border border-dashed border-red/20 bg-white/60 px-4 py-3 text-sm text-text-muted">
        Select a bay, person, alert, or asset to see details here.
      </div>
    );
  }

  let title = "";
  let body: ReactNode = null;

  if (focus.type === "room") {
    const room = ward.rooms.find((r) => r.id === focus.id);
    const beds = ward.beds.filter((b) => b.roomId === focus.id);
    const people = ward.staff.filter(
      (s) => s.roomId === focus.id && s.status !== "off-floor",
    );
    title = room?.label ?? "Room";
    body = (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">
            Beds
          </p>
          <ul className="mt-1 space-y-1">
            {beds.map((b) => (
              <li key={b.id} className="text-sm text-text">
                <span className="font-medium">{b.label}</span>
                {" — "}
                {bedLabel[b.status]}
                {b.patientInitials ? ` (${b.patientInitials})` : ""}
              </li>
            ))}
            {beds.length === 0 && (
              <li className="text-sm text-text-muted">No beds in this zone</li>
            )}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">
            People here
          </p>
          <ul className="mt-1 space-y-1">
            {people.map((p) => (
              <li key={p.id} className="text-sm text-text">
                {p.name} · {staffLabel[p.status]}
              </li>
            ))}
            {people.length === 0 && (
              <li className="text-sm text-text-muted">No one checked in</li>
            )}
          </ul>
        </div>
      </div>
    );
  }

  if (focus.type === "staff") {
    const person = ward.staff.find((s) => s.id === focus.id);
    if (person) {
      title = person.name;
      body = (
        <p className="text-sm text-text-muted">
          {person.role} · {staffLabel[person.status]} ·{" "}
          {roomLabel(person.roomId)}
          {person.status === "off-floor"
            ? ` · last seen ${person.lastSeenMin}m ago`
            : " · on floor now"}
        </p>
      );
    }
  }

  if (focus.type === "asset") {
    const asset = ward.assets.find((a) => a.id === focus.id);
    if (asset) {
      title = asset.name;
      body = (
        <p className="text-sm text-text-muted">
          {assetLabel[asset.status]} · {roomLabel(asset.roomId)}
        </p>
      );
    }
  }

  if (focus.type === "alert") {
    const alert = ward.alerts.find((a) => a.id === focus.id);
    if (alert) {
      title = alert.title;
      body = (
        <p className="text-sm text-text-muted">
          {alert.detail} · {roomLabel(alert.roomId)} · raised{" "}
          {alert.raisedMinAgo}m ago
          {alert.acknowledged ? " · acknowledged" : " · awaiting ack"}
        </p>
      );
    }
  }

  return (
    <div className="rounded-2xl border border-red/15 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-red uppercase">
            Focus
          </p>
          <p className="mt-0.5 font-display text-lg font-semibold text-text">
            {title}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg px-2 py-1 text-xs font-medium text-text-muted transition hover:bg-peach-light hover:text-red"
        >
          Clear
        </button>
      </div>
      <div className="mt-2">{body}</div>
    </div>
  );
}
