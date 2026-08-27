"use client";

import { useMemo, useState } from "react";
import type { Focus, StaffMember, StaffStatus, WardSnapshot } from "@/lib/dashboard/types";
import { ROLE_PRESETS, resolveRoleCategory } from "@/lib/dashboard/roles";
import { staffLabel } from "@/lib/dashboard/status";

interface Props {
  ward: WardSnapshot;
  focus: Focus;
  onFocusStaff: (id: string) => void;
  onSetStaffStatus: (id: string, status: StaffStatus) => void;
  variant?: "full" | "compact";
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

type FilterId = "all" | RoleCategoryFilter;
type RoleCategoryFilter =
  | "physician"
  | "nurse"
  | "charge"
  | "tech"
  | "security"
  | "admin"
  | "other";

export function StaffDirectory({
  ward,
  focus,
  onFocusStaff,
  onSetStaffStatus,
  variant = "full",
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [statusOnly, setStatusOnly] = useState<"all" | StaffStatus>("all");

  const roomLabel = (id: string) =>
    ward.rooms.find((r) => r.id === id)?.label ?? id;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...ward.staff]
      .filter((person) => {
        const cat = resolveRoleCategory(person.role, person.name).id;
        if (filter !== "all" && cat !== filter) return false;
        if (statusOnly !== "all" && person.status !== statusOnly) return false;
        if (!q) return true;
        return (
          person.name.toLowerCase().includes(q) ||
          person.role.toLowerCase().includes(q) ||
          roomLabel(person.roomId).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const order = { responding: 0, free: 1, busy: 2, "off-floor": 3 };
        const byStatus = order[a.status] - order[b.status];
        if (byStatus !== 0) return byStatus;
        return a.name.localeCompare(b.name);
      });
  }, [ward, query, filter, statusOnly]);

  const counts = useMemo(() => {
    const free = ward.staff.filter((s) => s.status === "free").length;
    const responding = ward.staff.filter((s) => s.status === "responding").length;
    return { free, responding, total: ward.staff.length };
  }, [ward.staff]);

  const compact = variant === "compact";

  return (
    <section
      className={`ops-panel flex flex-col overflow-hidden ${
        compact ? "max-h-[280px]" : "min-h-0 flex-1"
      }`}
    >
      <div className="border-b border-white/5 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
              Staff
            </p>
            <p className="text-[11px] text-[var(--ops-muted)]">
              {counts.free} free · {counts.responding} responding
            </p>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="text-[10px] font-semibold text-[var(--ops-muted)] hover:text-[var(--ops-text)]"
            >
              {collapsed ? "Show" : "Hide"}
            </button>
          )}
        </div>
        {!collapsed && !compact && (
          <>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, role, or zone"
              className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-1.5 text-[12px] text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-muted)] focus:border-white/25"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              <FilterChip
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label="All"
              />
              {ROLE_PRESETS.filter((r) => r.id !== "other").map((preset) => (
                <FilterChip
                  key={preset.id}
                  active={filter === preset.id}
                  onClick={() => setFilter(preset.id)}
                  label={preset.short}
                  color={preset.color}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {!collapsed && (
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <li className="px-3 py-4 text-center text-[11px] text-[var(--ops-muted)]">
              No staff match.
            </li>
          )}
          {filtered.map((person) => (
            <DirectoryRow
              key={person.id}
              person={person}
              zone={roomLabel(person.roomId)}
              active={focus.type === "staff" && focus.id === person.id}
              onFocus={() => onFocusStaff(person.id)}
              onSetStatus={(status) => onSetStaffStatus(person.id, status)}
              compact={compact}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
        active
          ? "border-white/25 bg-white/10 text-[var(--ops-text)]"
          : "border-white/10 text-[var(--ops-muted)] hover:border-white/20"
      }`}
    >
      {color ? (
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      ) : null}
      {label}
    </button>
  );
}

function DirectoryRow({
  person,
  zone,
  active,
  onFocus,
  onSetStatus,
  compact = false,
}: {
  person: StaffMember;
  zone: string;
  active: boolean;
  onFocus: () => void;
  onSetStatus: (status: StaffStatus) => void;
  compact?: boolean;
}) {
  const preset = resolveRoleCategory(person.role, person.name);

  return (
    <li
      className={`rounded border px-2 py-1.5 transition ${
        active
          ? "border-white/25 bg-white/10"
          : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"
      }`}
    >
      <button type="button" onClick={onFocus} className="flex w-full gap-2 text-left">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: preset.color }}
        >
          {person.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <p className="truncate text-[12px] font-semibold text-[var(--ops-text)]">
              {person.name}
            </p>
            <span
              className={`shrink-0 text-[9px] font-semibold ${
                person.status === "responding"
                  ? "text-[#f04343]"
                  : person.status === "free"
                    ? "text-[#34d399]"
                    : person.status === "busy"
                      ? "text-[#fbbf24]"
                      : "text-[var(--ops-muted)]"
              }`}
            >
              {staffLabel[person.status]}
            </span>
          </div>
          {!compact && (
            <p className="truncate text-[10px] text-[var(--ops-muted)]">
              {preset.short} · {zone}
            </p>
          )}
        </div>
      </button>
      {!compact && (
        <div className="mt-1.5 flex flex-wrap gap-1 pl-8">
          {(["free", "busy", "responding", "off-floor"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onSetStatus(status)}
              className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                person.status === status
                  ? "bg-white/15 text-[var(--ops-text)]"
                  : "bg-black/25 text-[var(--ops-muted)] hover:text-[var(--ops-text)]"
              }`}
            >
              {staffLabel[status]}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
