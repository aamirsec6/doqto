"use client";

import { useBoard } from "@/board/context/BoardProvider";

export function KpiBar() {
  const { summary } = useBoard();
  if (!summary) return null;

  const items = [
    {
      label: "Beds free",
      value: summary.bedsAvailable,
      hint: `${summary.bedsOccupied} occupied`,
      tone: summary.bedsAvailable === 0 ? "warn" : "ok",
    },
    {
      label: "Staff free",
      value: summary.staffFree,
      hint: `${summary.staffResponding} responding`,
      tone: summary.staffFree === 0 ? "warn" : "ok",
    },
    {
      label: "On floor",
      value: summary.staffOnFloor,
      hint: "staff visible",
      tone: "neutral",
    },
    {
      label: "Open alerts",
      value: summary.openAlerts,
      hint: "need attention",
      tone: summary.openAlerts > 0 ? "alert" : "neutral",
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="board-kpi">
          <p className="board-kpi-label">{item.label}</p>
          <p
            className={`board-kpi-value ${
              item.tone === "alert"
                ? "text-red"
                : item.tone === "warn"
                  ? "text-amber-600"
                  : item.tone === "ok"
                    ? "text-emerald-600"
                    : "text-[var(--board-text)]"
            }`}
          >
            {item.value}
          </p>
          <p className="board-kpi-hint">{item.hint}</p>
        </div>
      ))}
    </div>
  );
}
