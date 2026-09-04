import type { WardSnapshot } from "@/lib/dashboard/types";
import type { CampusPayload } from "@/server/domain/campus";

export interface TenantLayoutRow {
  id: string;
  wardName: string;
  wardType: string;
  unitKind: string;
  floorLabel: string;
  floor?: { id: string; label: string };
}

export interface TenantSnapshot {
  tenant: { id: string; name: string; inviteCode?: string } | null;
  layouts: TenantLayoutRow[];
}

export interface BoardResponse {
  ward: WardSnapshot;
  revision: number;
  layoutId: string;
}

export interface PatchBedInput {
  action: "bed";
  bedId: string;
  status: string;
  patientInitials?: string;
}

export interface PatchStaffInput {
  action: "staff";
  staffId: string;
  status: string;
  roomKey?: string;
}

export type BoardPatchInput = PatchBedInput | PatchStaffInput;

export interface RaiseIncidentInput {
  action: "raise";
  code: "code_blue" | "doctor_needed" | "critical_patient" | "info";
  roomKey: string;
  roomLabel?: string;
  sourceWard?: string;
}

export interface SaveCampusInput {
  campus: CampusPayload;
}
