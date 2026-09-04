"use client";

import type { StaffStatus, WardSnapshot } from "@/lib/dashboard/types";

const STATUSES: StaffStatus[] = ["free", "busy", "responding", "off-floor"];

interface Props {
  ward: WardSnapshot;
  onUpdate: (staffId: string, status: StaffStatus) => void;
}

export function StaffList({ ward, onUpdate }: Props) {
  return (
    <div className="board-card overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Staff</h2>
        <p className="text-xs text-slate-500">{ward.staff.length} on board</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {ward.staff.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between gap-2 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {member.name}
              </p>
              <p className="truncate text-xs text-slate-500">{member.role}</p>
            </div>
            <select
              value={member.status}
              onChange={(e) =>
                onUpdate(member.id, e.target.value as StaffStatus)
              }
              className="shrink-0 rounded border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
