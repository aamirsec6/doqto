"use client";

import type { CampusConfig } from "@/lib/dashboard/types";
import { allUnits } from "@/lib/dashboard/campus";
import { unitKindLabel } from "@/lib/oncology/constants";

interface Props {
  campus: CampusConfig;
  activeUnitId: string;
  onSelectUnit: (floorId: string, unitId: string) => void;
}

/** All oncology units at a glance — tap to switch the live board. */
export function CampusOverview({ campus, activeUnitId, onSelectUnit }: Props) {
  const entries = allUnits(campus);

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {entries.map(({ floor, unit }) => {
        const active = unit.id === activeUnitId;
        const beds = unit.zones.reduce((n, z) => n + z.bedCount, 0);
        return (
          <button
            key={unit.id}
            type="button"
            onClick={() => onSelectUnit(floor.id, unit.id)}
            className={`rounded-lg border px-3 py-2.5 text-left transition ${
              active
                ? "border-[var(--ops-cyan)] bg-sky-50 ring-1 ring-sky-200"
                : "border-[var(--ops-border)] bg-[var(--ops-panel)] hover:border-slate-300"
            }`}
          >
            <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
              {unit.wardName || "Unnamed"}
            </p>
            <p className="text-[11px] text-[var(--ops-muted)]">
              {unitKindLabel(unit.unitKind)} · {floor.label}
            </p>
            <p className="mt-1 text-[10px] text-[var(--ops-muted)]">
              {beds} {unit.unitKind === "infusion" ? "chairs" : unit.unitKind === "opd" ? "rooms" : "beds"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
