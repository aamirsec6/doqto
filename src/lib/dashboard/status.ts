import type {
  AlertSeverity,
  AssetStatus,
  BedStatus,
  StaffStatus,
} from "./types";

export const bedFill: Record<BedStatus, string> = {
  available: "#64748b",
  occupied: "#475569",
  cleaning: "#78716c",
  reserved: "#5b6b7c",
};

export const bedLabel: Record<BedStatus, string> = {
  available: "Ready",
  occupied: "Occupied",
  cleaning: "Cleaning",
  reserved: "Reserved",
};

export const staffFill: Record<StaffStatus, string> = {
  free: "#3d7a5f",
  busy: "#8a6a3d",
  responding: "#a33b3b",
  "off-floor": "#6b7280",
};

export const staffLabel: Record<StaffStatus, string> = {
  free: "Available",
  busy: "Busy",
  responding: "Responding",
  "off-floor": "Off floor",
};

export const assetFill: Record<AssetStatus, string> = {
  available: "#4a667a",
  "in-use": "#5c6b7a",
  missing: "#8b4545",
};

export const assetLabel: Record<AssetStatus, string> = {
  available: "Available",
  "in-use": "In use",
  missing: "Missing",
};

export const alertTone: Record<
  AlertSeverity,
  { border: string; bg: string; text: string; badge: string }
> = {
  critical: {
    border: "border-red",
    bg: "bg-red/10",
    text: "text-red",
    badge: "Critical",
  },
  urgent: {
    border: "border-amber-500/60",
    bg: "bg-amber-50",
    text: "text-amber-800",
    badge: "Urgent",
  },
  info: {
    border: "border-red/15",
    bg: "bg-peach-light",
    text: "text-text-muted",
    badge: "Info",
  },
};

/** Parse SVG path and return center (rect or polygon). */
export function roomCenter(path: string): { x: number; y: number } {
  const nums = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length < 4) return { x: 0, y: 0 };
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < nums.length; i += 2) {
    if (nums[i] !== undefined && nums[i + 1] !== undefined) {
      xs.push(nums[i]!);
      ys.push(nums[i + 1]!);
    }
  }
  if (!xs.length) return { x: 0, y: 0 };
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}
