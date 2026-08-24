import type { CampusConfig, UnitLayoutConfig } from "@/lib/dashboard/types";

export interface CampusUnitPayload {
  id?: string;
  floorId: string;
  wardName: string;
  wardType: string;
  layoutStyle: string;
  trackAssets: boolean;
  calibration?: { pixelsPerMetre: number; reference?: unknown };
  zones: UnitLayoutConfig["zones"];
}

export interface CampusFloorPayload {
  id?: string;
  label: string;
  building?: string;
  sortOrder?: number;
  units: CampusUnitPayload[];
}

export interface CampusPayload {
  hospitalName: string;
  contactName: string;
  contactRole: string;
  staffRoster: { id: string; name: string; role: string }[];
  floors: CampusFloorPayload[];
}
