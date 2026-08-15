import type { AlertLifecycle, StaffStatus } from "@/lib/dashboard/types";

export type HospitalCode =
  | "code_blue"
  | "doctor_needed"
  | "critical_patient"
  | "security"
  | "info";

export interface HospitalStaffEntry {
  id: string;
  name: string;
  role: string;
  status: StaffStatus;
  unitId: string;
  roomId?: string;
}

export interface HospitalUnit {
  id: string;
  name: string;
  floorLabel: string;
  wardType?: string;
}

export interface IncidentAck {
  staffId: string;
  staffName: string;
  at: string;
  note?: string;
}

export interface TimelineEvent {
  id: string;
  at: string;
  label: string;
  detail?: string;
}

export interface HospitalIncident {
  id: string;
  code: HospitalCode;
  title: string;
  detail: string;
  lifecycle: AlertLifecycle;
  sourceWard: string;
  unitId: string;
  roomId: string;
  roomLabel: string;
  raisedAt: string;
  /** Linked ward-board alert id when raised from /dashboard */
  wardAlertId?: string;
  pagedStaffIds: string[];
  acks: IncidentAck[];
  timeline: TimelineEvent[];
  resolvedAt?: string;
  /** Postgres incident id when dual-written to tenant DB */
  dbId?: string;
}

export interface HospitalTenant {
  version: 1;
  hospitalName: string;
  units: HospitalUnit[];
  staffDirectory: HospitalStaffEntry[];
  incidents: HospitalIncident[];
  updatedAt: string;
}

export const CODE_LABELS: Record<HospitalCode, string> = {
  code_blue: "Code Blue",
  doctor_needed: "Doctor needed",
  critical_patient: "Critical patient",
  security: "Security",
  info: "Info broadcast",
};

export const CODE_HINTS: Record<HospitalCode, string> = {
  code_blue: "Cardiac / respiratory emergency — page nearest help",
  doctor_needed: "Clinician required at bedside",
  critical_patient: "Patient deteriorating — escalate now",
  security: "Security response needed",
  info: "Non-urgent staff message",
};
