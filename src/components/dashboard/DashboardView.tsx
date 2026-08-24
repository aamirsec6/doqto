"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import { OpsHeader } from "@/components/dashboard/OpsHeader";
import { TwinMap } from "@/components/dashboard/TwinMap";
import { OpsAlerts } from "@/components/dashboard/OpsAlerts";
import { LiveInspector } from "@/components/dashboard/LiveInspector";
import { StaffDirectory } from "@/components/dashboard/StaffDirectory";
import { ActionStrip } from "@/components/dashboard/ActionStrip";
import { TrackingControl } from "@/components/dashboard/TrackingControl";
import {
  allUnits,
  campusToApiPayload,
  getActiveUnit,
  loadCampus,
  saveCampus,
  setActiveUnit,
  unitToLayoutConfig,
} from "@/lib/dashboard/campus";
import {
  OPS_STORAGE_KEY,
  loadLayout,
  opsStorageKey,
  wardSummary,
} from "@/lib/dashboard/layout";
import {
  loadOps,
  raiseAlert,
  raiseEmergency,
  saveOps,
  setAssetStatus,
  setBedStatus,
  setStaffStatus,
} from "@/lib/dashboard/ops";
import {
  acknowledgeFromWard,
  publishWardAlertToHospital,
} from "@/lib/hospital/bridge";
import {
  ensureHospitalTenant,
  subscribeHospitalTenant,
} from "@/lib/hospital/store";
import { applyTrackingLocations } from "@/lib/tracking/apply";
import type { ResolvedLocation } from "@/lib/tracking/types";
import { logTrainingEvent } from "@/lib/dashboard/training";
import type {
  CampusConfig,
  Focus,
  LayoutConfig,
  ViewerRole,
  WardSnapshot,
} from "@/lib/dashboard/types";

export function DashboardApp() {
  const [ready, setReady] = useState(false);
  const [campus, setCampus] = useState<CampusConfig | null>(null);
  const [forceOnboard, setForceOnboard] = useState(false);

  useEffect(() => {
    setCampus(loadCampus());
    setReady(true);
  }, []);

  const layout = useMemo(() => {
    if (!campus) return loadLayout();
    const active = getActiveUnit(campus);
    if (!active) return null;
    return unitToLayoutConfig(campus, active.floor, active.unit);
  }, [campus]);

  if (!ready) {
    return (
      <div className="ops-shell flex min-h-dvh items-center justify-center">
        <p className="text-sm text-[var(--ops-muted)]">Loading live board…</p>
      </div>
    );
  }

  if (!campus || !layout || forceOnboard) {
    return (
      <OnboardingWizard
        initial={forceOnboard ? campus ?? layout : null}
        onComplete={async (config) => {
          saveCampus(config);
          try {
            await fetch("/api/tenant/snapshot", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ campus: campusToApiPayload(config) }),
            });
          } catch {
            /* local campus still saved */
          }
          const first = getActiveUnit(config);
          const activeLayout = first
            ? unitToLayoutConfig(config, first.floor, first.unit)
            : null;
          logTrainingEvent({
            ward: {
              hospital: config.hospitalName,
              ward: activeLayout?.wardName ?? "",
              floor: activeLayout?.floorLabel ?? "",
              layoutFingerprint: "",
              updatedAt: new Date().toISOString(),
              rooms: [],
              beds: [],
              staff: [],
              assets: [],
              alerts: [],
              metrics: [],
            },
            actorRole: "ops",
            action: "campus.saved",
            entityType: "system",
            entityId: "campus",
            entityLabel: config.hospitalName,
            after: {
              floors: config.floors.length,
              units: allUnits(config).length,
              roster: config.staffRoster.filter((s) => s.name.trim()).length,
            },
          });
          setCampus(config);
          setForceOnboard(false);
        }}
      />
    );
  }

  return (
    <CommandCenter
      campus={campus}
      layout={layout}
      onCampusChange={setCampus}
      onRemap={() => setForceOnboard(true)}
    />
  );
}

function CommandCenter({
  campus,
  layout,
  onCampusChange,
  onRemap,
}: {
  campus: CampusConfig;
  layout: LayoutConfig;
  onCampusChange: (campus: CampusConfig) => void;
  onRemap: () => void;
}) {
  const [role, setRole] = useState<ViewerRole>("charge");
  const [focus, setFocus] = useState<Focus>({ type: "none" });
  const [clock, setClock] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [now, setNow] = useState(Date.now());
  const [ward, setWard] = useState<WardSnapshot | null>(null);
  const [trackingLive, setTrackingLive] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutId = layout.layoutId;

  const switchUnit = (floorId: string, unitId: string) => {
    const next = setActiveUnit(campus, floorId, unitId);
    saveCampus(next);
    onCampusChange(next);
    setFocus({ type: "none" });
  };

  useEffect(() => {
    const loaded = loadOps(layout);
    setWard(loaded);
    ensureHospitalTenant(layout, loaded);
    logTrainingEvent({
      ward: loaded,
      actorRole: "charge",
      action: "session.start",
      entityType: "system",
      entityId: "session",
      entityLabel: loaded.ward,
    });
  }, [layout]);

  useEffect(() => {
    return subscribeHospitalTenant(() => {
      setWard(loadOps(layout));
    });
  }, [layout]);

  useEffect(() => {
    const onOps = () => setWard(loadOps(layout));
    window.addEventListener("doqto-ops-updated", onOps);
    const onStorage = (e: StorageEvent) => {
      if (e.key === opsStorageKey(layoutId) || e.key === OPS_STORAGE_KEY) onOps();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("doqto-ops-updated", onOps);
      window.removeEventListener("storage", onStorage);
    };
  }, [layout, layoutId]);

  const persistWard = (next: WardSnapshot) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveOps(next, layoutId), 300);
  };

  const apply = (updater: (prev: WardSnapshot) => WardSnapshot) => {
    setWard((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      persistWard(next);
      ensureHospitalTenant(layout, next);
      return next;
    });
  };

  const setFocusLogged = (next: Focus) => {
    setFocus(next);
    if (!ward || next.type === "none") return;
    const label =
      next.type === "room"
        ? ward.rooms.find((r) => r.id === next.id)?.label
        : next.type === "bed"
          ? ward.beds.find((b) => b.id === next.id)?.label
          : next.type === "staff"
            ? ward.staff.find((s) => s.id === next.id)?.name
            : next.type === "asset"
              ? ward.assets.find((a) => a.id === next.id)?.name
              : ward.alerts.find((a) => a.id === next.id)?.title;
    logTrainingEvent({
      ward,
      actorRole: role,
      action: "focus.set",
      entityType:
        next.type === "room"
          ? "zone"
          : next.type === "bed"
            ? "bed"
            : next.type === "staff"
              ? "staff"
              : next.type === "asset"
                ? "asset"
                : "alert",
      entityId: next.id,
      entityLabel: label ?? next.id,
    });
  };

  const summary = useMemo(() => (ward ? wardSummary(ward) : null), [ward]);

  const roomLabel = (roomId: string) =>
    ward?.rooms.find((r) => r.id === roomId)?.label ?? roomId;

  const focusLabel = (() => {
    if (!ward || focus.type === "none") return undefined;
    if (focus.type === "room") return `Zone · ${roomLabel(focus.id)}`;
    if (focus.type === "bed") {
      const b = ward.beds.find((x) => x.id === focus.id);
      return b
        ? `Bed ${b.label} · ${b.status}${b.patientInitials ? ` · ${b.patientInitials}` : ""}`
        : undefined;
    }
    if (focus.type === "staff") {
      const s = ward.staff.find((x) => x.id === focus.id);
      return s ? `${s.name} · ${s.status}` : undefined;
    }
    if (focus.type === "asset") {
      const a = ward.assets.find((x) => x.id === focus.id);
      return a ? `${a.name} · ${a.status}` : undefined;
    }
    const al = ward.alerts.find((x) => x.id === focus.id);
    return al ? `Alert · ${al.title}` : undefined;
  })();

  const lastUpdateLabel = useMemo(() => {
    if (!ward) return "—";
    const ageSec = Math.max(
      0,
      Math.round((now - Date.parse(ward.updatedAt)) / 1000),
    );
    if (ageSec < 5) return "just now";
    if (ageSec < 60) return `${ageSec}s ago`;
    return `${Math.floor(ageSec / 60)}m ago`;
  }, [ward, now]);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d.getTime());
      setClock(
        d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      setDateLabel(
        d
          .toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          .toUpperCase(),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!ward || !summary) {
    return (
      <div className="ops-shell flex min-h-dvh items-center justify-center">
        <p className="text-sm text-[var(--ops-muted)]">Preparing live data…</p>
      </div>
    );
  }

  const ctx = { actorRole: role };

  const publishAlert = (next: WardSnapshot, code?: Parameters<typeof publishWardAlertToHospital>[3]) => {
    const alert = next.alerts[0];
    if (!alert) {
      saveOps(next, layoutId);
      setWard(next);
      return next;
    }
    const tenant = publishWardAlertToHospital(layout, next, alert, code);
    const incident = tenant.incidents.find((i) => i.wardAlertId === alert.id);
    const stamped = incident
      ? {
          ...next,
          alerts: next.alerts.map((a) =>
            a.id === alert.id
              ? { ...a, hospitalIncidentId: incident.id }
              : a,
          ),
        }
      : next;
    saveOps(stamped, layoutId);
    setWard(stamped);
    return stamped;
  };

  const raiseEmergencyOnFocusOrFirst = () => {
    const roomId =
      focus.type === "room"
        ? focus.id
        : focus.type === "bed"
          ? ward.beds.find((b) => b.id === focus.id)?.roomId
          : focus.type === "staff"
            ? ward.staff.find((s) => s.id === focus.id)?.roomId
            : (ward.rooms.find((r) => r.kind === "clinical")?.id ??
              ward.rooms[0]?.id);
    if (!roomId) return;
    const next = raiseEmergency(ward, roomId, ctx);
    const stamped = publishAlert(next, "code_blue");
    if (stamped.alerts[0]) {
      setFocusLogged({ type: "alert", id: stamped.alerts[0].id });
    }
  };

  const ackAlert = (id: string) => {
    const { ward: next } = acknowledgeFromWard(layout, ward, id, role);
    setWard(next);
  };

  const unitOptions = allUnits(campus).map(({ floor, unit }) => ({
    floorId: floor.id,
    unitId: unit.id,
    label: `${unit.wardName} · ${floor.label}`,
    active:
      campus.activeFloorId === floor.id && campus.activeUnitId === unit.id,
  }));

  return (
    <div className="ops-shell flex min-h-dvh flex-col">
      <OpsHeader
        hospital={ward.hospital}
        ward={ward.ward}
        floor={ward.floor}
        role={role}
        onRoleChange={(nextRole) => {
          logTrainingEvent({
            ward,
            actorRole: nextRole,
            action: "role.change",
            entityType: "system",
            entityId: "role",
            entityLabel: nextRole,
            before: { role },
            after: { role: nextRole },
          });
          setRole(nextRole);
        }}
        clock={clock}
        dateLabel={dateLabel}
        trackingLive={trackingLive}
        lastUpdateLabel={lastUpdateLabel}
        onRemap={onRemap}
        unitOptions={unitOptions}
        onUnitChange={switchUnit}
      />

      <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-3 p-3 md:p-4">
        <ActionStrip
          ward={ward}
          summary={summary}
          now={now}
          roomLabel={roomLabel}
          onFocusAlert={(id) => setFocusLogged({ type: "alert", id })}
          onAckAlert={ackAlert}
          onRaiseEmergency={raiseEmergencyOnFocusOrFirst}
        />

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-12">
          <div className="flex min-h-[460px] flex-col gap-3 lg:col-span-8">
            <TwinMap
              ward={ward}
              focus={focus}
              onFocus={setFocusLogged}
              focusLabel={focusLabel}
            />
            <LiveInspector
              ward={ward}
              focus={focus}
              now={now}
              onClear={() => setFocus({ type: "none" })}
              actions={{
                onSetBed: (bedId, status, initials) =>
                  apply((prev) =>
                    setBedStatus(prev, bedId, status, initials, ctx),
                  ),
                onSetStaff: (staffId, status, roomId) =>
                  apply((prev) =>
                    setStaffStatus(prev, staffId, status, roomId, ctx),
                  ),
                onSetAsset: (assetId, status, roomId) =>
                  apply((prev) =>
                    setAssetStatus(prev, assetId, status, roomId, ctx),
                  ),
                onAckAlert: ackAlert,
                onRaiseAlert: (input) => {
                  const next = raiseAlert(ward, input, ctx);
                  const stamped = publishAlert(next);
                  if (stamped.alerts[0]) {
                    setFocusLogged({ type: "alert", id: stamped.alerts[0].id });
                  }
                },
                onRaiseEmergency: (roomId) => {
                  const next = raiseEmergency(ward, roomId, ctx);
                  const stamped = publishAlert(next, "code_blue");
                  if (stamped.alerts[0]) {
                    setFocusLogged({ type: "alert", id: stamped.alerts[0].id });
                  }
                },
              }}
            />
          </div>

          <div className="lg:col-span-4">
            <StaffDirectory
              ward={ward}
              focus={focus}
              onFocusStaff={(id) => setFocusLogged({ type: "staff", id })}
              onSetStaffStatus={(id, status) =>
                apply((prev) =>
                  setStaffStatus(prev, id, status, undefined, ctx),
                )
              }
            />
          </div>
        </div>

        <OpsAlerts
          ward={ward}
          focus={focus}
          now={now}
          onFocusAlert={(id) => setFocusLogged({ type: "alert", id })}
          onAckAlert={ackAlert}
          roomLabel={roomLabel}
        />

        <div className="ops-panel">
          <button
            type="button"
            onClick={() => setShowTracking((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span>
              <span className="ops-panel-title">Realtime tracking setup</span>
              <span className="mt-1 block text-[11px] text-[var(--ops-muted)]">
                Beacons, tags, and simulator for live location updates
              </span>
            </span>
            <span className="text-[11px] font-semibold text-[var(--ops-muted)]">
              {showTracking ? "Hide" : "Show"}
            </span>
          </button>
          {showTracking && (
            <div className="border-t border-white/5 px-2 pb-2">
              <TrackingControl
                rooms={ward.rooms.map((r) => ({ id: r.id, label: r.label }))}
                staff={ward.staff.map((s) => ({ id: s.id, name: s.name }))}
                assets={ward.assets.map((a) => ({ id: a.id, name: a.name }))}
                onLocations={(locations: ResolvedLocation[]) => {
                  setTrackingLive(true);
                  apply((prev) => applyTrackingLocations(prev, locations));
                }}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
