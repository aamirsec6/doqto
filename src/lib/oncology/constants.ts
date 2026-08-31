/** Oncology department unit kinds (v1). */
export type OncologyUnitKind = "infusion" | "ward" | "opd";

export const ONCOLOGY_UNIT_KINDS: {
  id: OncologyUnitKind;
  label: string;
  hint: string;
  layoutStyle: "bays" | "rooms" | "opd";
  seatLabel: string;
}[] = [
  {
    id: "infusion",
    label: "Infusion / chemo day unit",
    hint: "Chairs, prep, waiting, nursing station",
    layoutStyle: "bays",
    seatLabel: "chair",
  },
  {
    id: "ward",
    label: "Inpatient oncology ward",
    hint: "Beds, isolation rooms, nursing station",
    layoutStyle: "rooms",
    seatLabel: "bed",
  },
  {
    id: "opd",
    label: "Oncology OPD",
    hint: "Registration, waiting, triage, consult rooms",
    layoutStyle: "opd",
    seatLabel: "room",
  },
];

export function unitKindLabel(kind: OncologyUnitKind): string {
  return ONCOLOGY_UNIT_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

export function seatLabelForKind(kind: OncologyUnitKind): string {
  return ONCOLOGY_UNIT_KINDS.find((k) => k.id === kind)?.seatLabel ?? "bed";
}

/** Default PIN for pilot staff until changed by admin. */
export const DEFAULT_STAFF_PIN = "0000";
