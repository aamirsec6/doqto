/** Clinical role directory colors — consistent across map, list, and onboarding. */

export type RoleCategory =
  | "physician"
  | "nurse"
  | "charge"
  | "tech"
  | "security"
  | "admin"
  | "other";

export interface RolePreset {
  id: RoleCategory;
  label: string;
  /** Short label for chips */
  short: string;
  /** Hex fill for markers / dots */
  color: string;
  /** Soft background for badges */
  bg: string;
  /** Text color on dark UI */
  text: string;
  /** Match against free-text role strings */
  match: RegExp;
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: "physician",
    label: "Doctor / Physician",
    short: "Doctor",
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.18)",
    text: "#93c5fd",
    match: /physician|doctor|dr\.?|registrar|resident|consultant|mo\b|medical officer|surgeon/i,
  },
  {
    id: "charge",
    label: "Charge / Supervisor",
    short: "Charge",
    color: "#a78bfa",
    bg: "rgba(167, 139, 250, 0.18)",
    text: "#ddd6fe",
    match: /charge|supervisor|ward in.?charge|sister.?in.?charge|matron/i,
  },
  {
    id: "nurse",
    label: "Nurse",
    short: "Nurse",
    color: "#34d399",
    bg: "rgba(52, 211, 153, 0.16)",
    text: "#6ee7b7",
    match: /nurse|staff nurse|rn\b|anm|gnm/i,
  },
  {
    id: "tech",
    label: "Technician",
    short: "Tech",
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.16)",
    text: "#fcd34d",
    match: /tech|technician|radiographer|lab|ot tech|perfusion/i,
  },
  {
    id: "security",
    label: "Security",
    short: "Security",
    color: "#f87171",
    bg: "rgba(248, 113, 113, 0.16)",
    text: "#fca5a5",
    match: /security|guard|warden/i,
  },
  {
    id: "admin",
    label: "Admin / Ops",
    short: "Admin",
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.16)",
    text: "#cbd5e1",
    match: /admin|ops|operations|coordinator|clerk|receptionist/i,
  },
  {
    id: "other",
    label: "Other staff",
    short: "Staff",
    color: "#64748b",
    bg: "rgba(100, 116, 139, 0.2)",
    text: "#94a3b8",
    match: /.*/,
  },
];

export function resolveRoleCategory(role: string, name = ""): RolePreset {
  const hay = `${role} ${name}`;
  for (const preset of ROLE_PRESETS) {
    if (preset.id === "other") continue;
    if (preset.match.test(hay)) return preset;
  }
  return ROLE_PRESETS[ROLE_PRESETS.length - 1]!;
}

export function roleDotStyle(role: string, name = "") {
  const preset = resolveRoleCategory(role, name);
  return {
    backgroundColor: preset.color,
    boxShadow: `0 0 0 2px ${preset.bg}`,
  };
}
