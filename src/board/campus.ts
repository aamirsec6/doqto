import {
  zonesForOncologyUnit,
  defaultWardName,
} from "@/lib/oncology/templates";
import type { OncologyUnitKind } from "@/lib/oncology/constants";
import { ONCOLOGY_UNIT_KINDS } from "@/lib/oncology/constants";
import type {
  CampusConfig,
  FloorConfig,
  MapCalibration,
  UnitLayoutConfig,
} from "@/lib/dashboard/types";
import type { CampusPayload } from "@/server/domain/campus";

const DEFAULT_CALIBRATION: MapCalibration = { pixelsPerMetre: 40 };

export function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyFloor(label = "Ground", sortOrder = 0): FloorConfig {
  const floorId = newId("floor");
  const units: UnitLayoutConfig[] = ONCOLOGY_UNIT_KINDS.map((kind, i) =>
    defaultUnitForFloor(floorId, kind.id, i + 1),
  );
  return {
    id: floorId,
    label,
    building: "",
    sortOrder,
    units,
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

export function defaultUnitForFloor(
  floorId: string,
  kind: OncologyUnitKind = "ward",
  index = 1,
): UnitLayoutConfig {
  const meta = ONCOLOGY_UNIT_KINDS.find((k) => k.id === kind)!;
  return {
    id: newId("unit"),
    floorId,
    wardName: defaultWardName(kind, index),
    unitKind: kind,
    wardType: kind,
    layoutStyle: meta.layoutStyle,
    zones: zonesForOncologyUnit(kind),
    trackAssets: kind !== "opd",
    calibration: DEFAULT_CALIBRATION,
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
        calibration: unit.calibration ?? DEFAULT_CALIBRATION,
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

export function campusToApiPayload(campus: CampusConfig): CampusPayload {
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
        wardType: unit.unitKind,
        unitKind: unit.unitKind,
        layoutStyle: unit.layoutStyle,
        trackAssets: unit.trackAssets,
        calibration: unit.calibration,
        zones: unit.zones,
      })),
    })),
  };
}
