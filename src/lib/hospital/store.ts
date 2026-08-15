import type { LayoutConfig, WardSnapshot } from "@/lib/dashboard/types";
import type {
  HospitalStaffEntry,
  HospitalTenant,
  HospitalUnit,
} from "./types";

export const HOSPITAL_STORAGE_KEY = "doqto.hospital.tenant.v1";
export const HOSPITAL_UPDATED_EVENT = "doqto-hospital-updated";

export function emptyTenant(hospitalName = ""): HospitalTenant {
  return {
    version: 1,
    hospitalName,
    units: [],
    staffDirectory: [],
    incidents: [],
    updatedAt: new Date().toISOString(),
  };
}

export function loadHospitalTenant(): HospitalTenant | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HOSPITAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HospitalTenant;
    if (!parsed || parsed.version !== 1) return null;
    return {
      ...parsed,
      units: parsed.units ?? [],
      staffDirectory: parsed.staffDirectory ?? [],
      incidents: parsed.incidents ?? [],
    };
  } catch {
    return null;
  }
}

export function saveHospitalTenant(tenant: HospitalTenant) {
  if (typeof window === "undefined") return;
  const next = { ...tenant, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(HOSPITAL_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(HOSPITAL_UPDATED_EVENT));
}

/** Keep tenant staff/units aligned with the configured ward layout + live ops. */
export function syncTenantFromWard(
  layout: LayoutConfig,
  ward: WardSnapshot,
  existing?: HospitalTenant | null,
): HospitalTenant {
  const unitId = `unit-${layout.wardName.toLowerCase().replace(/\s+/g, "-") || "ward"}`;
  const unit: HospitalUnit = {
    id: unitId,
    name: layout.wardName || ward.ward,
    floorLabel: layout.floorLabel || ward.floor,
    wardType: layout.wardType,
  };

  const statusById = new Map(ward.staff.map((s) => [s.id, s]));
  const staffDirectory: HospitalStaffEntry[] = ward.staff.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    status: s.status,
    unitId,
    roomId: s.roomId,
  }));

  // Preserve roster people not yet on the live floor (name-only entries)
  for (const roster of layout.staffRoster) {
    if (!roster.name.trim()) continue;
    if (staffDirectory.some((s) => s.id === roster.id || s.name === roster.name)) {
      continue;
    }
    staffDirectory.push({
      id: roster.id,
      name: roster.name.trim(),
      role: roster.role || "Staff",
      status: "free",
      unitId,
    });
  }

  const base = existing ?? emptyTenant(layout.hospitalName || ward.hospital);
  return {
    ...base,
    hospitalName: layout.hospitalName || ward.hospital || base.hospitalName,
    units: [unit, ...base.units.filter((u) => u.id !== unitId)],
    staffDirectory: staffDirectory.map((s) => {
      const live = statusById.get(s.id);
      return live
        ? {
            ...s,
            status: live.status,
            roomId: live.roomId,
            name: live.name,
            role: live.role,
          }
        : s;
    }),
    incidents: base.incidents,
  };
}

export function ensureHospitalTenant(
  layout: LayoutConfig,
  ward: WardSnapshot,
): HospitalTenant {
  const existing = loadHospitalTenant();
  const next = syncTenantFromWard(layout, ward, existing);
  saveHospitalTenant(next);
  return next;
}

/** Subscribe to same-tab custom events + cross-tab storage. */
export function subscribeHospitalTenant(
  onChange: (tenant: HospitalTenant | null) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const refresh = () => onChange(loadHospitalTenant());

  const onCustom = () => refresh();
  const onStorage = (e: StorageEvent) => {
    if (e.key === HOSPITAL_STORAGE_KEY) refresh();
  };

  window.addEventListener(HOSPITAL_UPDATED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(HOSPITAL_UPDATED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
