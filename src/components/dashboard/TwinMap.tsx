"use client";

import type { Focus, WardSnapshot } from "@/lib/dashboard/types";
import { mapViewBox } from "@/lib/dashboard/layout";
import { roomCenter } from "@/lib/dashboard/status";
import { ROLE_PRESETS, resolveRoleCategory } from "@/lib/dashboard/roles";

interface Props {
  ward: WardSnapshot;
  focus: Focus;
  onFocus: (focus: Focus) => void;
  focusLabel?: string;
}

export function TwinMap({ ward, focus, onFocus, focusLabel }: Props) {
  const viewBox = mapViewBox(ward.rooms);

  const focusRoomId =
    focus.type === "room"
      ? focus.id
      : focus.type === "bed"
        ? ward.beds.find((b) => b.id === focus.id)?.roomId
        : focus.type === "staff"
          ? ward.staff.find((s) => s.id === focus.id)?.roomId
          : focus.type === "asset"
            ? ward.assets.find((a) => a.id === focus.id)?.roomId
            : focus.type === "alert"
              ? ward.alerts.find((a) => a.id === focus.id)?.roomId
              : undefined;

  const emergency =
    ward.alerts.find(
      (a) =>
        a.kind === "emergency" &&
        a.lifecycle !== "resolved" &&
        !a.acknowledged,
    ) ??
    ward.alerts.find(
      (a) =>
        (a.kind === "emergency" || a.severity === "critical") &&
        a.lifecycle !== "resolved",
    );

  const alertRoomId = emergency?.roomId;
  const dispatchedStaffId = emergency?.dispatched?.staffId;

  const roomFill = (roomId: string, active: boolean) => {
    if (alertRoomId === roomId) return "rgba(127, 29, 29, 0.22)";
    if (active) return "rgba(71, 85, 105, 0.45)";
    const room = ward.rooms.find((r) => r.id === roomId);
    if (room?.kind === "nursing") return "rgba(30, 41, 59, 0.95)";
    if (room?.kind === "store") return "rgba(28, 36, 48, 0.95)";
    return "rgba(36, 45, 58, 0.92)";
  };

  const roomStroke = (roomId: string, active: boolean) => {
    if (alertRoomId === roomId) return "#b91c1c";
    if (active) return "#94a3b8";
    return "rgba(100, 116, 139, 0.55)";
  };

  const bedStyle = (status: string) => {
    if (status === "occupied")
      return { fill: "#475569", stroke: "#94a3b8", label: "#e2e8f0" };
    if (status === "cleaning")
      return { fill: "#3f3f46", stroke: "#a8a29e", label: "#d6d3d1" };
    if (status === "reserved")
      return { fill: "#334155", stroke: "#64748b", label: "#cbd5e1" };
    return { fill: "rgba(15, 23, 42, 0.35)", stroke: "#64748b", label: "#94a3b8" };
  };

  return (
    <section className="ops-panel relative flex min-h-[420px] flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div>
          <p className="ops-panel-title">Live floor plan</p>
          <p className="mt-0.5 text-[11px] text-[var(--ops-muted)]">
            Realtime zones · tap a person, bed, or asset to act
          </p>
        </div>
        <div className="hidden items-center gap-4 text-[10px] text-[var(--ops-muted)] sm:flex">
          {ROLE_PRESETS.filter((r) =>
            ["physician", "nurse", "charge", "tech"].includes(r.id),
          ).map((preset) => (
            <span key={preset.id} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: preset.color }}
              />
              {preset.short}
            </span>
          ))}
          <LegendDot color="#a33b3b" label="Responding" />
        </div>
      </div>

      <div className="ops-floor-stage relative flex flex-1 items-center justify-center overflow-hidden p-4 md:p-6">
        <div className="relative w-full max-w-3xl">
          <svg
            viewBox={viewBox.attr}
            className="h-auto w-full"
            role="img"
            aria-label={`${ward.ward} floor plan`}
          >
            <defs>
              <pattern
                id="ops-floor-grid"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="rgba(148,163,184,0.06)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>

            <rect
              x="4"
              y="4"
              width={viewBox.width - 8}
              height={viewBox.height - 8}
              rx="2"
              fill="#111827"
              stroke="rgba(148,163,184,0.2)"
              strokeWidth="1"
            />
            <rect
              x="4"
              y="4"
              width={viewBox.width - 8}
              height={viewBox.height - 8}
              rx="2"
              fill="url(#ops-floor-grid)"
            />

            {ward.rooms.map((room) => {
              const center = roomCenter(room.path);
              const active = focusRoomId === room.id;
              const hasAlert = alertRoomId === room.id;
              return (
                <g key={room.id}>
                  <path
                    d={room.path}
                    fill={roomFill(room.id, active)}
                    stroke={roomStroke(room.id, active)}
                    strokeWidth={hasAlert ? 2 : active ? 1.75 : 1}
                    strokeDasharray={hasAlert ? "6 3" : undefined}
                    className="cursor-pointer"
                    onClick={() => onFocus({ type: "room", id: room.id })}
                  />
                  <text
                    x={center.x}
                    y={center.y - 56}
                    textAnchor="middle"
                    fill="rgba(203, 213, 225, 0.75)"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.04em",
                    }}
                    className="pointer-events-none"
                  >
                    {room.label.toUpperCase()}
                  </text>
                </g>
              );
            })}

            {ward.beds.map((bed) => {
              const selected = focus.type === "bed" && focus.id === bed.id;
              const style = bedStyle(bed.status);
              return (
                <g
                  key={bed.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocus({ type: "bed", id: bed.id });
                  }}
                >
                  <rect
                    x={bed.position.x - 18}
                    y={bed.position.y - 12}
                    width={36}
                    height={24}
                    rx={1}
                    fill={style.fill}
                    stroke={selected ? "#cbd5e1" : style.stroke}
                    strokeWidth={selected ? 1.5 : 1}
                  />
                  <text
                    x={bed.position.x}
                    y={bed.position.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={style.label}
                    style={{ fontSize: 8, fontWeight: 600 }}
                    className="pointer-events-none"
                  >
                    {bed.status === "occupied" && bed.patientInitials
                      ? bed.patientInitials
                      : bed.label}
                  </text>
                </g>
              );
            })}

            {ward.staff
              .filter((s) => s.status !== "off-floor")
              .map((person) => {
                const selected =
                  focus.type === "staff" && focus.id === person.id;
                const isDispatched = person.id === dispatchedStaffId;
                const initial = person.name.trim().charAt(0).toUpperCase() || "?";
                const roleColor = resolveRoleCategory(
                  person.role,
                  person.name,
                ).color;
                const fill =
                  person.status === "responding" || isDispatched
                    ? "#7f1d1d"
                    : roleColor;
                return (
                  <g
                    key={person.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFocus({ type: "staff", id: person.id });
                    }}
                  >
                    <circle
                      cx={person.position.x}
                      cy={person.position.y}
                      r={selected || isDispatched ? 8 : 6.5}
                      fill={fill}
                      stroke={
                        selected
                          ? "#e2e8f0"
                          : isDispatched
                            ? "#fca5a5"
                            : "rgba(226,232,240,0.4)"
                      }
                      strokeWidth={selected || isDispatched ? 1.5 : 1}
                    />
                    <text
                      x={person.position.x}
                      y={person.position.y + 0.5}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#f8fafc"
                      style={{ fontSize: 7, fontWeight: 600 }}
                      className="pointer-events-none"
                    >
                      {initial}
                    </text>
                  </g>
                );
              })}

            {ward.assets.map((asset) => {
              const selected = focus.type === "asset" && focus.id === asset.id;
              const isNearest = emergency?.nearestAssets?.some(
                (n) => n.assetId === asset.id,
              );
              return (
                <g
                  key={asset.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocus({ type: "asset", id: asset.id });
                  }}
                >
                  <rect
                    x={asset.position.x - 6}
                    y={asset.position.y - 6}
                    width={12}
                    height={12}
                    rx={1}
                    fill={
                      asset.status === "missing"
                        ? "#7f1d1d"
                        : isNearest
                          ? "#334155"
                          : "#1e293b"
                    }
                    stroke={
                      selected
                        ? "#e2e8f0"
                        : isNearest
                          ? "#94a3b8"
                          : "rgba(148,163,184,0.55)"
                    }
                    strokeWidth={selected || isNearest ? 1.5 : 1}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {emergency && (
          <div className="pointer-events-none absolute top-4 right-4 max-w-[240px] border border-red-900/50 bg-[#0f1419]/95 px-3 py-2.5">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-red-300/90 uppercase">
              {emergency.acknowledged
                ? "Responder confirmed"
                : emergency.dispatched
                  ? "Dispatched"
                  : "Emergency"}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-100">
              {emergency.title}
            </p>
            {emergency.dispatched ? (
              <p className="mt-1 text-[11px] text-slate-300">
                {emergency.acknowledged
                  ? `${emergency.dispatched.staffName} is responding`
                  : `${emergency.dispatched.staffName} · awaiting acknowledgement`}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">
                No free responder located
              </p>
            )}
            {emergency.nearestAssets?.[0] && (
              <p className="mt-1 text-[10px] text-slate-400">
                {emergency.nearestAssets[0].name} ·{" "}
                {ward.rooms.find(
                  (r) => r.id === emergency.nearestAssets![0].roomId,
                )?.label ?? emergency.nearestAssets[0].roomId}
                , {emergency.nearestAssets[0].lastSeenMin}m ago
              </p>
            )}
          </div>
        )}

        {focusLabel && (
          <div className="absolute bottom-4 left-4 border border-white/10 bg-[#0f1419]/90 px-3 py-1.5 text-[11px] text-slate-300">
            {focusLabel}
          </div>
        )}
      </div>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
