import {
  defaultZonesForStyle,
  emptyLayoutDraft,
} from "@/lib/dashboard/layout";
import type {
  CampusConfig,
  FloorConfig,
  LayoutConfig,
  UnitLayoutConfig,
  WardType,
} from "@/lib/dashboard/types";

export const CAMPUS_STORAGE_KEY = "doqto.campus.v3";
export const ACTIVE_UNIT_KEY = "doqto.campus.active.v1";

export function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyFloor(label = "Ground", sortOrder = 0): FloorConfig {
  const floorId = newId("floor");
  const unitId = newId("unit");
  return {
    id: floorId,
    label,
    building: "",
    sortOrder,
    units: [
      {
        id: unitId,
        floorId,
        wardName: "",
        wardType: "general",
        layoutStyle: "bays",
        zones: defaultZonesForStyle("bays"),
        trackAssets: true,
      },
    ],
  };
}

export function emptyCampusDraft(): Omit<CampusConfig, "createdAt"> {
  const floor = emptyFloor("Ground", 0);
  const unit = floor.units[0]!;
  return {
    version: 3,
    hospitalName: "",
    contactName: "",
    contactRole: "",
    staffRoster: [
      { id: "roster-1", name: "", role: "Charge nurse" },
      { id: "roster-2", name: "", role: "Staff nurse" },
      { id: "roster-3", name: "", role: "Doctor" },
    ],
    floors: [floor],
    activeFloorId: floor.id,
    activeUnitId: unit.id,
  };
}

export function unitToLayoutConfig(
  campus: CampusConfig,
  floor: FloorConfig,
  unit: UnitLayoutConfig,
): LayoutConfig {
  return {
    version: 3,
    hospitalName: campus.hospitalName,
    contactName: campus.contactName,
    contactRole: campus.contactRole,
    wardName: unit.wardName,
    wardType: unit.wardType,
    floorLabel: floor.label,
    layoutStyle: unit.layoutStyle,
    zones: unit.zones,
    trackAssets: unit.trackAssets,
    staffRoster: campus.staffRoster,
    calibration: unit.calibration,
    layoutId: unit.id,
    floorId: floor.id,
    createdAt: campus.createdAt,
  };
}

export function layoutConfigToCampus(config: LayoutConfig): CampusConfig {
  const floorId = config.floorId ?? newId("floor");
  const unitId = config.layoutId ?? newId("unit");
  return {
    version: 3,
    hospitalName: config.hospitalName,
    contactName: config.contactName,
    contactRole: config.contactRole,
    staffRoster: config.staffRoster,
    floors: [
      {
        id: floorId,
        label: config.floorLabel || "Ground",
        building: "",
        sortOrder: 0,
        units: [
          {
            id: unitId,
            floorId,
            wardName: config.wardName,
            wardType: config.wardType,
            layoutStyle: config.layoutStyle,
            zones: config.zones,
            trackAssets: config.trackAssets,
            calibration: config.calibration,
          },
        ],
      },
    ],
    activeFloorId: floorId,
    activeUnitId: unitId,
    createdAt: config.createdAt || new Date().toISOString(),
  };
}

export function loadCampus(): CampusConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CAMPUS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CampusConfig;
      if (parsed?.version === 3 && parsed.floors?.length) return parsed;
    }
    const legacy = window.localStorage.getItem("doqto.ward.layout.v2");
    if (legacy) {
      const layout = JSON.parse(legacy) as LayoutConfig;
      if (layout?.zones?.length) return layoutConfigToCampus(layout);
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveCampus(campus: CampusConfig) {
  window.localStorage.setItem(CAMPUS_STORAGE_KEY, JSON.stringify(campus));
}

export function getActiveUnit(campus: CampusConfig): {
  floor: FloorConfig;
  unit: UnitLayoutConfig;
} | null {
  const floor =
    campus.floors.find((f) => f.id === campus.activeFloorId) ??
    campus.floors[0];
  if (!floor) return null;
  const unit =
    floor.units.find((u) => u.id === campus.activeUnitId) ?? floor.units[0];
  if (!unit) return null;
  return { floor, unit };
}

export function setActiveUnit(
  campus: CampusConfig,
  floorId: string,
  unitId: string,
): CampusConfig {
  return { ...campus, activeFloorId: floorId, activeUnitId: unitId };
}

export function allUnits(campus: CampusConfig): {
  floor: FloorConfig;
  unit: UnitLayoutConfig;
}[] {
  const out: { floor: FloorConfig; unit: UnitLayoutConfig }[] = [];
  for (const floor of campus.floors) {
    for (const unit of floor.units) {
      out.push({ floor, unit });
    }
  }
  return out;
}

export function defaultUnitForFloor(
  floorId: string,
  wardType: WardType = "general",
): UnitLayoutConfig {
  return {
    id: newId("unit"),
    floorId,
    wardName: "",
    wardType,
    layoutStyle: wardType === "opd" ? "opd" : "bays",
    zones: defaultZonesForStyle(wardType === "opd" ? "opd" : "bays"),
    trackAssets: true,
  };
}

export function campusToApiPayload(campus: CampusConfig) {
  return {
    hospitalName: campus.hospitalName,
    contactName: campus.contactName,
    contactRole: campus.contactRole,
    staffRoster: campus.staffRoster,
    floors: campus.floors.map((floor, fi) => ({
      id: floor.id,
      label: floor.label,
      building: floor.building,
      sortOrder: floor.sortOrder ?? fi,
      units: floor.units.map((unit) => ({
        id: unit.id,
        floorId: floor.id,
        wardName: unit.wardName,
        wardType: unit.wardType,
        layoutStyle: unit.layoutStyle,
        trackAssets: unit.trackAssets,
        calibration: unit.calibration,
        zones: unit.zones,
      })),
    })),
  };
}

export function finalizeCampus(
  draft: Omit<CampusConfig, "createdAt">,
): CampusConfig {
  return {
    ...draft,
    hospitalName: draft.hospitalName.trim(),
    contactName: draft.contactName.trim(),
    contactRole: draft.contactRole.trim(),
    floors: draft.floors.map((floor, fi) => ({
      ...floor,
      label: floor.label.trim(),
      sortOrder: fi,
      units: floor.units.map((unit) => ({
        ...unit,
        wardName: unit.wardName.trim(),
        zones: unit.zones.map((z) => ({
          ...z,
          label: z.label.trim(),
          bedCount: Math.max(0, Math.min(12, Number(z.bedCount) || 0)),
        })),
      })),
    })),
    staffRoster: draft.staffRoster
      .filter((s) => s.name.trim())
      .map((s) => ({
        ...s,
        name: s.name.trim(),
        role: s.role.trim() || "Staff",
      })),
    createdAt: new Date().toISOString(),
  };
}
