"use client";

import type { Focus, WardSnapshot } from "@/lib/dashboard/types";
import { mapViewBox } from "@/lib/dashboard/layout";
import { assetFill, bedFill, roomCenter, staffFill } from "@/lib/dashboard/status";

interface Props {
  ward: WardSnapshot;
  focus: Focus;
  onFocusRoom: (roomId: string) => void;
}

export function WardFloorMap({ ward, focus, onFocusRoom }: Props) {
  const focusRoomId =
    focus.type === "room"
      ? focus.id
      : focus.type === "staff"
        ? ward.staff.find((s) => s.id === focus.id)?.roomId
        : focus.type === "asset"
          ? ward.assets.find((a) => a.id === focus.id)?.roomId
          : focus.type === "alert"
            ? ward.alerts.find((a) => a.id === focus.id)?.roomId
            : undefined;

  const criticalRoom = ward.alerts.find(
    (a) => a.severity === "critical" && !a.acknowledged,
  )?.roomId;

  const viewBox = mapViewBox(ward.rooms);

  return (
    <div className="flex h-full min-h-[360px] flex-col rounded-2xl border border-red/15 bg-white">
      <div className="flex items-center justify-between border-b border-red/10 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-red uppercase">
            Floor map
          </p>
          <p className="text-sm text-text-muted">
            Tap a zone to focus · built from your layout
          </p>
        </div>
        <MapLegend />
      </div>

      <div className="relative flex-1 overflow-auto p-3 sm:p-5">
        <svg
          viewBox={viewBox.attr}
          className="mx-auto h-auto w-full max-w-4xl"
          role="img"
          aria-label={`${ward.ward} floor layout`}
        >
          <rect
            x="8"
            y="8"
            width={viewBox.width - 16}
            height={viewBox.height - 16}
            rx="16"
            fill="#fff5f0"
            stroke="rgba(204,0,0,0.12)"
          />

          {ward.rooms.map((room) => {
            const center = roomCenter(room.path);
            const active = focusRoomId === room.id;
            const alertHere =
              criticalRoom === room.id ||
              ward.alerts.some(
                (a) => a.roomId === room.id && a.severity !== "info",
              );
            return (
              <g key={room.id}>
                <path
                  d={room.path}
                  fill={active ? "rgba(204,0,0,0.08)" : "#ffffff"}
                  stroke={
                    alertHere
                      ? "#cc0000"
                      : active
                        ? "#cc0000"
                        : "rgba(204,0,0,0.18)"
                  }
                  strokeWidth={alertHere || active ? 2.5 : 1.5}
                  className="cursor-pointer transition-colors"
                  onClick={() => onFocusRoom(room.id)}
                />
                <text
                  x={center.x}
                  y={center.y - 62}
                  textAnchor="middle"
                  className="fill-text-muted pointer-events-none select-none"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {room.label}
                </text>
              </g>
            );
          })}

          {ward.beds.map((bed) => (
            <g key={bed.id} className="pointer-events-none">
              <rect
                x={bed.position.x - 22}
                y={bed.position.y - 16}
                width={44}
                height={32}
                rx={6}
                fill={bedFill[bed.status]}
                opacity={0.9}
              />
              <text
                x={bed.position.x}
                y={bed.position.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                style={{ fontSize: 11, fontWeight: 700 }}
              >
                {bed.status === "occupied" && bed.patientInitials
                  ? bed.patientInitials
                  : bed.label}
              </text>
            </g>
          ))}

          {ward.staff
            .filter((s) => s.status !== "off-floor")
            .map((person) => {
              const focused = focus.type === "staff" && focus.id === person.id;
              return (
                <g key={person.id} className="pointer-events-none">
                  {person.status === "responding" && (
                    <circle
                      cx={person.position.x}
                      cy={person.position.y}
                      r={14}
                      fill="none"
                      stroke="#cc0000"
                      strokeWidth={2}
                      className="rfid-pulse"
                      style={{ opacity: 0.5 }}
                    />
                  )}
                  <circle
                    cx={person.position.x}
                    cy={person.position.y}
                    r={focused ? 9 : 7}
                    fill={staffFill[person.status]}
                    stroke="white"
                    strokeWidth={2}
                  />
                </g>
              );
            })}

          {ward.assets.map((asset) => {
            const focused = focus.type === "asset" && focus.id === asset.id;
            return (
              <g key={asset.id} className="pointer-events-none">
                <rect
                  x={asset.position.x - 7}
                  y={asset.position.y - 7}
                  width={14}
                  height={14}
                  rx={3}
                  fill={assetFill[asset.status]}
                  stroke="white"
                  strokeWidth={focused ? 2.5 : 1.5}
                  transform={`rotate(45 ${asset.position.x} ${asset.position.y})`}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function MapLegend() {
  const items = [
    { color: "#16a34a", label: "Free" },
    { color: "#d97706", label: "Busy / clean" },
    { color: "#cc0000", label: "Occupied / alert" },
    { color: "#2563eb", label: "Reserved / in-use" },
  ];
  return (
    <div className="hidden items-center gap-3 lg:flex">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: item.color }}
          />
          <span className="text-[10px] text-text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
