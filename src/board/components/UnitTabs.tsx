"use client";

import type { TenantLayoutRow } from "@/board/hooks/useTenantSnapshot";
import { unitKindLabel } from "@/lib/oncology/constants";
import type { OncologyUnitKind } from "@/lib/oncology/constants";

interface Props {
  layouts: TenantLayoutRow[];
  activeId: string;
  onChange: (id: string) => void;
}

export function UnitTabs({ layouts, activeId, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {layouts.map((layout) => {
        const active = layout.id === activeId;
        return (
          <button
            key={layout.id}
            type="button"
            onClick={() => onChange(layout.id)}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              active
                ? "border-sky-400 bg-sky-50 text-slate-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            <span className="block text-sm font-semibold">{layout.wardName}</span>
            <span className="text-[10px] text-slate-500">
              {unitKindLabel(layout.unitKind as OncologyUnitKind)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
