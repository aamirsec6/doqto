import type { RoleCategory } from "@/lib/dashboard/roles";
import { resolveRoleCategory } from "@/lib/dashboard/roles";

export const STAFF_SESSION_KEY = "doqto.staff.session.v1";

export interface StaffSession {
  staffId: string;
  name: string;
  role: string;
  roleCategory: RoleCategory;
  signedInAt: string;
}

export function loadStaffSession(): StaffSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STAFF_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StaffSession;
    if (!parsed?.staffId || !parsed?.name) return null;
    return {
      ...parsed,
      roleCategory:
        parsed.roleCategory ?? resolveRoleCategory(parsed.role, parsed.name).id,
    };
  } catch {
    return null;
  }
}

export function saveStaffSession(session: StaffSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent("doqto-staff-session"));
}

export function clearStaffSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STAFF_SESSION_KEY);
  window.dispatchEvent(new CustomEvent("doqto-staff-session"));
}

export function createStaffSession(input: {
  staffId: string;
  name: string;
  role: string;
}): StaffSession {
  const roleCategory = resolveRoleCategory(input.role, input.name).id;
  return {
    staffId: input.staffId,
    name: input.name,
    role: input.role,
    roleCategory,
    signedInAt: new Date().toISOString(),
  };
}
