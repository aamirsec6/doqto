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

  return (
    <section className="ops-panel flex h-full min-h-[420px] flex-col overflow-hidden">
      <div className="border-b border-white/5 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="ops-panel-title">Staff directory</p>
            <p className="mt-1 text-[11px] text-[var(--ops-muted)]">
              {counts.total} on board · {counts.free} available ·{" "}
              {counts.responding} responding
            </p>
          </div>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, role, or zone"
          className="mt-3 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-muted)] focus:border-white/25"
        />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
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
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(
            [
              ["all", "Any status"],
              ["free", "Available"],
              ["busy", "Busy"],
              ["responding", "Responding"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusOnly(id)}
              className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                statusOnly === id
                  ? "bg-white/10 text-[var(--ops-text)]"
                  : "text-[var(--ops-muted)] hover:text-[var(--ops-text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {filtered.length === 0 && (
          <li className="px-3 py-6 text-center text-[12px] text-[var(--ops-muted)]">
            No staff match this filter.
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
          />
        ))}
      </ul>
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
}: {
  person: StaffMember;
  zone: string;
  active: boolean;
  onFocus: () => void;
  onSetStatus: (status: StaffStatus) => void;
}) {
  const preset = resolveRoleCategory(person.role, person.name);
  const age =
    person.lastSeenMin === 0
      ? "Just now"
      : `${person.lastSeenMin}m ago`;

  return (
    <li
      className={`rounded-md border px-2.5 py-2.5 transition ${
        active
          ? "border-white/25 bg-white/10"
          : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"
      }`}
    >
      <button type="button" onClick={onFocus} className="flex w-full gap-2.5 text-left">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ backgroundColor: preset.color }}
          title={preset.label}
        >
          {person.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-semibold text-[var(--ops-text)]">
              {person.name}
            </p>
            <span
              className={`shrink-0 text-[10px] font-semibold ${
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
          <p className="mt-0.5 truncate text-[11px] text-[var(--ops-muted)]">
            <span style={{ color: preset.text }}>{preset.short}</span>
            {" · "}
            {zone}
            {" · "}
            seen {age}
          </p>
        </div>
      </button>
      <div className="mt-2 flex flex-wrap gap-1 pl-10">
        {(["free", "busy", "responding", "off-floor"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onSetStatus(status)}
            className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
              person.status === status
                ? "bg-white/15 text-[var(--ops-text)]"
                : "bg-black/25 text-[var(--ops-muted)] hover:text-[var(--ops-text)]"
            }`}
          >
            {staffLabel[status]}
          </button>
        ))}
      </div>
    </li>
  );
}
