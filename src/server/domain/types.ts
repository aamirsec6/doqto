export type SessionRole = "hospital_admin" | "staff" | "device" | "doqto_admin";

export interface AppSession {
  role: SessionRole;
  tenantId?: string;
  adminId?: string;
  staffId?: string;
  staffName?: string;
  staffRole?: string;
  email?: string;
}

export type IncidentCode =
  | "code_blue"
  | "doctor_needed"
  | "critical_patient"
  | "security"
  | "info";

export type Lifecycle = "open" | "dispatched" | "responding" | "resolved";

export interface ActorContext {
  type: "hospital_admin" | "staff" | "system" | "doqto_admin" | "device";
  id?: string;
  name?: string;
  ip?: string;
}
