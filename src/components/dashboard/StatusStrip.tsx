import type { wardSummary } from "@/lib/dashboard/layout";

type Summary = ReturnType<typeof wardSummary>;

const items: {
  key: keyof Summary;
  label: string;
  format: (s: Summary) => string;
  warn?: (s: Summary) => boolean;
}[] = [
  {
    key: "openAlerts",
    label: "Open alerts",
    format: (s) => String(s.openAlerts),
    warn: (s) => s.openAlerts > 0,
  },
  {
    key: "staffFree",
    label: "Staff free",
    format: (s) => `${s.staffFree} / ${s.staffOnFloor}`,
  },
  {
    key: "bedsAvailable",
    label: "Beds free",
    format: (s) => `${s.bedsAvailable} / ${s.bedsTotal}`,
  },
  {
    key: "assetsMissing",
    label: "Assets missing",
    format: (s) => String(s.assetsMissing),
    warn: (s) => s.assetsMissing > 0,
  },
];

export function StatusStrip({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => {
        const warn = item.warn?.(summary);
        return (
          <div
            key={item.key}
            className={`rounded-xl border px-4 py-3 ${
              warn
                ? "border-red/30 bg-red/5"
                : "border-red/10 bg-white"
            }`}
          >
            <p className="text-[11px] font-medium tracking-wide text-text-muted uppercase">
              {item.label}
            </p>
            <p
              className={`mt-1 font-display text-2xl font-semibold tabular-nums ${
                warn ? "text-red" : "text-text"
              }`}
            >
              {item.format(summary)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
