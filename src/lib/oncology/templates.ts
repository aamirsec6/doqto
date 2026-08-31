import { defaultZonesForOpd } from "@/lib/map/opd-template";
import { defaultZonesForStyle } from "@/lib/dashboard/layout";
import type { LayoutZone } from "@/lib/dashboard/types";
import type { OncologyUnitKind } from "./constants";

export function zonesForOncologyUnit(kind: OncologyUnitKind): LayoutZone[] {
  if (kind === "opd") return defaultZonesForOpd();
  if (kind === "infusion") {
    return [
      { id: "waiting", label: "Waiting", kind: "other", bedCount: 0 },
      { id: "prep", label: "Prep area", kind: "nursing", bedCount: 0 },
      { id: "chair-a", label: "Chair row A", kind: "clinical", bedCount: 6 },
      { id: "chair-b", label: "Chair row B", kind: "clinical", bedCount: 6 },
      { id: "nursing", label: "Nursing station", kind: "nursing", bedCount: 0 },
      { id: "store", label: "Equipment store", kind: "store", bedCount: 0 },
    ];
  }
  return defaultZonesForStyle("rooms");
}

export function defaultWardName(kind: OncologyUnitKind, index = 1): string {
  if (kind === "infusion") return `Infusion suite ${index}`;
  if (kind === "opd") return `Oncology OPD ${index}`;
  return `Oncology ward ${index}`;
}
