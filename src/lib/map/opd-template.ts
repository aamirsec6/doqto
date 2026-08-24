import type { LayoutZone } from "@/lib/dashboard/types";

/** OPD department with sub-zones for waiting-time alerts. */
export function defaultZonesForOpd(): LayoutZone[] {
  return [
    { id: "opd", label: "OPD", kind: "opd", bedCount: 0 },
    {
      id: "opd-registration",
      label: "Registration",
      kind: "opd_registration",
      bedCount: 0,
      parentId: "opd",
    },
    {
      id: "opd-waiting",
      label: "Waiting area",
      kind: "opd_waiting",
      bedCount: 0,
      parentId: "opd",
    },
    {
      id: "opd-triage",
      label: "Triage",
      kind: "opd_triage",
      bedCount: 0,
      parentId: "opd",
    },
    {
      id: "opd-consult-1",
      label: "Consultation 1",
      kind: "opd_consultation",
      bedCount: 0,
      parentId: "opd",
    },
    {
      id: "opd-consult-2",
      label: "Consultation 2",
      kind: "opd_consultation",
      bedCount: 0,
      parentId: "opd",
    },
  ];
}

export function isOpdZoneKind(kind: string): boolean {
  return kind === "opd" || kind.startsWith("opd_");
}
