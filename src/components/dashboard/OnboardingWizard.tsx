"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  allUnits,
  campusToApiPayload,
  defaultUnitForFloor,
  emptyCampusDraft,
  emptyFloor,
  finalizeCampus,
  layoutConfigToCampus,
  newId,
  saveCampus,
  unitToLayoutConfig,
} from "@/lib/dashboard/campus";
import { defaultZonesForStyle } from "@/lib/dashboard/layout";
import { defaultZonesForOpd } from "@/lib/map/opd-template";
import { MapZoneEditor } from "@/components/dashboard/MapZoneEditor";
import type {
  CampusConfig,
  FloorConfig,
  LayoutConfig,
  LayoutStyle,
  LayoutZone,
  MapCalibration,
  StaffRosterEntry,
  UnitLayoutConfig,
  WardType,
  ZoneKind,
} from "@/lib/dashboard/types";
import { ROLE_PRESETS, resolveRoleCategory } from "@/lib/dashboard/roles";

const STEPS = [
  { id: "welcome", title: "Who are you?", caption: "Takes about 5–10 minutes" },
  { id: "hospital", title: "Your hospital", caption: "Name used across all floors" },
  { id: "floors", title: "Which floors?", caption: "Add every floor you want on the board" },
  { id: "units", title: "Wards on each floor", caption: "Name each unit staff recognise" },
  { id: "shape", title: "How is this unit laid out?", caption: "Per unit · pick the closest match" },
  { id: "zones", title: "Name the spaces", caption: "Per unit · use names staff already say" },
  { id: "calibrate", title: "Set real-world scale", caption: "Per unit · mark a known wall length" },
  { id: "map", title: "Draw zone boundaries", caption: "Per unit · trace rooms on the floor plan" },
  { id: "team", title: "Who is on duty?", caption: "Hospital-wide staff directory" },
  { id: "review", title: "Ready to go live?", caption: "Check once, then open the board" },
] as const;

const CONFIGURE_START = 4;
const CONFIGURE_END = 7;

const wardTypes: { id: WardType; label: string; hint: string }[] = [
  { id: "icu", label: "ICU / HDU", hint: "Critical care bays" },
  { id: "emergency", label: "Emergency", hint: "Triage & resus" },
  { id: "general", label: "General ward", hint: "Rooms or shared bays" },
  { id: "ot", label: "OT complex", hint: "Theatres & recovery" },
  { id: "maternity", label: "Maternity", hint: "Labour / postpartum" },
  { id: "opd", label: "OPD", hint: "Outpatient · waiting-time alerts" },
  { id: "other", label: "Other", hint: "Custom unit" },
];

const layoutStyles: { id: LayoutStyle; label: string; hint: string }[] = [
  {
    id: "opd",
    label: "OPD department",
    hint: "Registration, waiting, triage, consultation rooms",
  },
  {
    id: "bays",
    label: "Open bays",
    hint: "Shared bays with multiple beds (typical ICU)",
  },
  {
    id: "rooms",
    label: "Private rooms",
    hint: "Corridor of rooms with 1–2 beds each",
  },
  {
    id: "mixed",
    label: "Mixed",
    hint: "Bays plus isolation / side rooms",
  },
];

interface Props {
  onComplete: (campus: CampusConfig) => void;
  initial?: LayoutConfig | CampusConfig | null;
}

export function OnboardingWizard({ onComplete, initial }: Props) {
  const [step, setStep] = useState(0);
  const [unitIndex, setUnitIndex] = useState(0);
  const [draft, setDraft] = useState(() => {
    if (initial && "floors" in initial && initial.version === 3) {
      const { createdAt: _, ...rest } = initial;
      return rest;
    }
    if (initial && "zones" in initial) {
      const campus = layoutConfigToCampus(initial);
      const { createdAt: _, ...rest } = campus;
      return rest;
    }
    return emptyCampusDraft();
  });
  const [error, setError] = useState("");

  const units = useMemo(() => allUnits(draft as CampusConfig), [draft]);
  const current = units[unitIndex] ?? units[0];
  const progress = ((step + 1) / STEPS.length) * 100;

  const totalBeds = useMemo(
    () => current?.unit.zones.reduce((sum, z) => sum + z.bedCount, 0) ?? 0,
    [current],
  );

  const updateCampus = (patch: Partial<typeof draft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setError("");
  };

  const updateCurrentUnit = (patch: Partial<UnitLayoutConfig>) => {
    if (!current) return;
    setDraft((prev) => ({
      ...prev,
      floors: prev.floors.map((floor) =>
        floor.id === current.floor.id
          ? {
              ...floor,
              units: floor.units.map((unit) =>
                unit.id === current.unit.id ? { ...unit, ...patch } : unit,
              ),
            }
          : floor,
      ),
    }));
    setError("");
  };

  const setWardType = (wardType: WardType) => {
    if (wardType === "opd") {
      updateCurrentUnit({
        wardType,
        layoutStyle: "opd",
        zones: defaultZonesForOpd(),
      });
    } else {
      updateCurrentUnit({ wardType });
    }
  };

  const setLayoutStyle = (style: LayoutStyle) => {
    updateCurrentUnit({
      layoutStyle: style,
      zones: defaultZonesForStyle(style),
    });
  };

  const updateZone = (id: string, patch: Partial<LayoutZone>) => {
    if (!current) return;
    updateCurrentUnit({
      zones: current.unit.zones.map((z) =>
        z.id === id ? { ...z, ...patch } : z,
      ),
    });
  };

  const addZone = (kind: ZoneKind = "clinical") => {
    if (!current) return;
    const zones = current.unit.zones;
    const n = zones.filter((z) => z.kind === kind).length + 1;
    const id = `${kind}-${Date.now()}`;
    const label =
      kind === "clinical"
        ? current.unit.layoutStyle === "rooms"
          ? `Room ${100 + n}`
          : `Bay ${String.fromCharCode(64 + n)}`
        : kind === "nursing"
          ? "Nursing station"
          : kind === "store"
            ? "Equipment store"
            : `Zone ${n}`;
    updateCurrentUnit({
      zones: [
        ...zones,
        { id, label, kind, bedCount: kind === "clinical" ? 2 : 0 },
      ],
    });
  };

  const removeZone = (id: string) => {
    if (!current) return;
    updateCurrentUnit({
      zones: current.unit.zones.filter((z) => z.id !== id),
    });
  };

  const validateStep = () => {
    if (step === 0) {
      if (!draft.contactName.trim()) return "Please enter your name.";
      if (!draft.contactRole.trim()) return "Please enter your role.";
    }
    if (step === 1) {
      if (!draft.hospitalName.trim()) return "Please enter the hospital name.";
    }
    if (step === 2) {
      if (!draft.floors.length) return "Add at least one floor.";
      if (draft.floors.some((f) => !f.label.trim())) {
        return "Every floor needs a label.";
      }
    }
    if (step === 3) {
      if (!units.length) return "Add at least one ward/unit.";
      if (units.some((u) => !u.unit.wardName.trim())) {
        return "Every unit needs a ward name.";
      }
    }
    if (step >= CONFIGURE_START && step <= CONFIGURE_END && current) {
      const unit = current.unit;
      if (step === 5) {
        if (unit.layoutStyle === "opd") {
          const opdSubs = unit.zones.filter((z) => z.kind !== "opd");
          if (opdSubs.length < 2) {
            return "OPD needs at least registration and waiting sub-zones.";
          }
        } else {
          if (unit.zones.filter((z) => z.kind === "clinical").length === 0) {
            return "Add at least one clinical bay or room.";
          }
          if (totalBeds < 1) return "Add at least one bed to a clinical zone.";
        }
        if (unit.zones.some((z) => !z.label.trim())) {
          return "Every zone needs a name staff will recognise.";
        }
      }
      if (step === 6) {
        if (!unit.calibration?.pixelsPerMetre) {
          return "Set the floor scale by marking a reference wall or use default scale.";
        }
      }
    }
    if (step === 8) {
      if (!draft.staffRoster.some((s) => s.name.trim())) {
        return "Add at least one on-duty team member.";
      }
    }
    return "";
  };

  const next = () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError("");

    if (step === CONFIGURE_END && unitIndex < units.length - 1) {
      setUnitIndex((i) => i + 1);
      setStep(CONFIGURE_START);
      return;
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setError("");
    if (step === CONFIGURE_START && unitIndex > 0) {
      setUnitIndex((i) => i - 1);
      setStep(CONFIGURE_END);
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  const finish = () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    const campus = finalizeCampus(draft);
    const first = allUnits(campus)[0];
    if (first) {
      campus.activeFloorId = first.floor.id;
      campus.activeUnitId = first.unit.id;
    }
    saveCampus(campus);
    onComplete(campus);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-peach-light">
      <header className="border-b border-red/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/icon.png" alt="" width={32} height={32} className="h-8 w-8" />
            <span className="font-display text-sm font-semibold tracking-[0.18em] text-red">
              DOQTO
            </span>
          </Link>
          <p className="text-xs font-medium text-text-muted">
            Hospital setup · Step {step + 1} of {STEPS.length}
          </p>
        </div>
        <div className="h-1 bg-red/10">
          <div
            className="h-full bg-red transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
        <div className="mb-8">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-red uppercase">
            {STEPS[step].caption}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text">
            {STEPS[step].title}
          </h1>
          {step >= CONFIGURE_START && step <= CONFIGURE_END && current && (
            <p className="mt-2 text-sm text-text-muted">
              Configuring{" "}
              <span className="font-semibold text-text">
                {current.unit.wardName || "Unnamed unit"}
              </span>{" "}
              · {current.floor.label} ({unitIndex + 1} of {units.length})
            </p>
          )}
        </div>

        <div className="flex-1 rounded-2xl border border-red/15 bg-white p-6 shadow-[0_20px_50px_-36px_rgba(124,0,0,0.35)] md:p-8">
          {step === 0 && (
            <WelcomeStep
              contactName={draft.contactName}
              contactRole={draft.contactRole}
              onChange={(key, value) => updateCampus({ [key]: value })}
            />
          )}
          {step === 1 && (
            <HospitalStep
              hospitalName={draft.hospitalName}
              onChange={(v) => updateCampus({ hospitalName: v })}
            />
          )}
          {step === 2 && (
            <FloorsStep
              floors={draft.floors}
              onChange={(floors) => updateCampus({ floors })}
            />
          )}
          {step === 3 && (
            <UnitsStep
              floors={draft.floors}
              wardTypes={wardTypes}
              onChange={(floors) => updateCampus({ floors })}
            />
          )}
          {step === 4 && current && (
            <ShapeStep
              layoutStyle={current.unit.layoutStyle}
              trackAssets={current.unit.trackAssets}
              onStyle={setLayoutStyle}
              onTrackAssets={(v) => updateCurrentUnit({ trackAssets: v })}
              styles={layoutStyles}
            />
          )}
          {step === 5 && current && (
            <ZonesStep
              zones={current.unit.zones}
              layoutStyle={current.unit.layoutStyle}
              totalBeds={totalBeds}
              onUpdate={updateZone}
              onAdd={addZone}
              onRemove={removeZone}
            />
          )}
          {step === 6 && current && (
            <MapZoneEditor
              mode="calibrate"
              zones={current.unit.zones}
              calibration={current.unit.calibration}
              onCalibrationChange={(calibration: MapCalibration) =>
                updateCurrentUnit({ calibration })
              }
              onZonesChange={(zones) => updateCurrentUnit({ zones })}
            />
          )}
          {step === 7 && current && (
            <MapZoneEditor
              mode="draw"
              zones={current.unit.zones}
              calibration={current.unit.calibration}
              onCalibrationChange={(calibration: MapCalibration) =>
                updateCurrentUnit({ calibration })
              }
              onZonesChange={(zones) => updateCurrentUnit({ zones })}
            />
          )}
          {step === 8 && (
            <TeamStep
              roster={draft.staffRoster}
              onChange={(roster) => updateCampus({ staffRoster: roster })}
            />
          )}
          {step === 9 && <ReviewStep campus={draft as CampusConfig} />}

          {error && (
            <p className="mt-6 rounded-xl border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
              {error}
            </p>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-text-muted transition enabled:hover:bg-white enabled:hover:text-red disabled:opacity-30"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-dark"
            >
              {step === CONFIGURE_END && unitIndex < units.length - 1
                ? "Next unit"
                : "Continue"}
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="rounded-xl bg-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-dark"
            >
              Open live board
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-text">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-text-muted">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-red/15 bg-peach-light/50 px-4 py-3 text-sm text-text outline-none transition placeholder:text-text-muted/50 focus:border-red focus:bg-white";

function WelcomeStep({
  contactName,
  contactRole,
  onChange,
}: {
  contactName: string;
  contactRole: string;
  onChange: (key: "contactName" | "contactRole", value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-base leading-relaxed text-text-muted">
        Anyone on the ward can set this up. You will add floors, name each unit,
        and draw maps. After that, the live board shows where staff and equipment
        are in real time.
      </p>
      <Field label="Your name" hint="So the team knows who opened this board">
        <input
          className={inputClass}
          value={contactName}
          onChange={(e) => onChange("contactName", e.target.value)}
          placeholder="e.g. Fatima"
          autoFocus
        />
      </Field>
      <div>
        <p className="text-sm font-medium text-text">Your role</p>
        <p className="mt-0.5 text-xs text-text-muted">
          Tap one. Colours match the live staff directory.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ROLE_PRESETS.filter((r) => r.id !== "other").map((preset) => {
            const active =
              resolveRoleCategory(contactRole).id === preset.id &&
              contactRole.length > 0;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange("contactRole", preset.label)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-red bg-red/5 text-text"
                    : "border-red/15 text-text-muted hover:border-red/40"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: preset.color }}
                />
                {preset.short}
              </button>
            );
          })}
        </div>
        <input
          className={`${inputClass} mt-3`}
          value={contactRole}
          onChange={(e) => onChange("contactRole", e.target.value)}
          placeholder="Or type your role"
        />
      </div>
    </div>
  );
}

function HospitalStep({
  hospitalName,
  onChange,
}: {
  hospitalName: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-text-muted">
        This name appears on every floor and unit board in your hospital.
      </p>
      <Field label="Hospital name">
        <input
          className={inputClass}
          value={hospitalName}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. City Care Hospital"
          autoFocus
        />
      </Field>
    </div>
  );
}

function FloorsStep({
  floors,
  onChange,
}: {
  floors: FloorConfig[];
  onChange: (floors: FloorConfig[]) => void;
}) {
  const updateFloor = (id: string, patch: Partial<FloorConfig>) => {
    onChange(floors.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-muted">
        Add each floor you want on the live board. You can name units on the next
        step.
      </p>
      <ul className="space-y-3">
        {floors.map((floor, index) => (
          <li
            key={floor.id}
            className="grid gap-3 rounded-xl border border-red/10 bg-peach-light/40 p-4 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                Floor label
              </p>
              <input
                className={inputClass}
                value={floor.label}
                onChange={(e) => updateFloor(floor.id, { label: e.target.value })}
                placeholder={`e.g. Floor ${index + 1}`}
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                Building / block
              </p>
              <input
                className={inputClass}
                value={floor.building}
                onChange={(e) => updateFloor(floor.id, { building: e.target.value })}
                placeholder="e.g. B Block"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => onChange(floors.filter((f) => f.id !== floor.id))}
                disabled={floors.length <= 1}
                className="rounded-lg px-3 py-3 text-xs font-medium text-text-muted transition hover:bg-white hover:text-red disabled:opacity-30"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...floors, emptyFloor(`Floor ${floors.length + 1}`, floors.length)])}
        className="rounded-xl border border-red/20 bg-white px-4 py-2 text-xs font-semibold text-red transition hover:border-red"
      >
        + Add floor
      </button>
    </div>
  );
}

function UnitsStep({
  floors,
  wardTypes: types,
  onChange,
}: {
  floors: FloorConfig[];
  wardTypes: { id: WardType; label: string; hint: string }[];
  onChange: (floors: FloorConfig[]) => void;
}) {
  const updateUnit = (
    floorId: string,
    unitId: string,
    patch: Partial<UnitLayoutConfig>,
  ) => {
    onChange(
      floors.map((floor) =>
        floor.id === floorId
          ? {
              ...floor,
              units: floor.units.map((u) =>
                u.id === unitId ? { ...u, ...patch } : u,
              ),
            }
          : floor,
      ),
    );
  };

  const addUnit = (floorId: string) => {
    onChange(
      floors.map((floor) =>
        floor.id === floorId
          ? {
              ...floor,
              units: [...floor.units, defaultUnitForFloor(floorId)],
            }
          : floor,
      ),
    );
  };

  const removeUnit = (floorId: string, unitId: string) => {
    onChange(
      floors.map((floor) =>
        floor.id === floorId
          ? {
              ...floor,
              units:
                floor.units.length <= 1
                  ? floor.units
                  : floor.units.filter((u) => u.id !== unitId),
            }
          : floor,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-muted">
        Each floor can have one or more wards / units. Staff will switch between
        them on the live board.
      </p>
      {floors.map((floor) => (
        <div key={floor.id} className="rounded-xl border border-red/10 p-4">
          <p className="mb-3 text-sm font-semibold text-text">
            {floor.label}
            {floor.building ? ` · ${floor.building}` : ""}
          </p>
          <ul className="space-y-3">
            {floor.units.map((unit) => (
              <li
                key={unit.id}
                className="grid gap-3 rounded-xl border border-red/10 bg-peach-light/40 p-4 sm:grid-cols-[1fr_auto]"
              >
                <div className="space-y-3">
                  <input
                    className={inputClass}
                    value={unit.wardName}
                    onChange={(e) =>
                      updateUnit(floor.id, unit.id, { wardName: e.target.value })
                    }
                    placeholder="Ward / unit name"
                  />
                  <div className="flex flex-wrap gap-2">
                    {types.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          const patch: Partial<UnitLayoutConfig> = {
                            wardType: type.id,
                          };
                          if (type.id === "opd") {
                            patch.layoutStyle = "opd";
                            patch.zones = defaultZonesForOpd();
                          }
                          updateUnit(floor.id, unit.id, patch);
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          unit.wardType === type.id
                            ? "border-red bg-red/5 text-text"
                            : "border-red/10 text-text-muted hover:border-red/30"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-start">
                  <button
                    type="button"
                    onClick={() => removeUnit(floor.id, unit.id)}
                    disabled={floor.units.length <= 1}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-text-muted transition hover:bg-white hover:text-red disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => addUnit(floor.id)}
            className="mt-3 rounded-xl border border-red/15 px-4 py-2 text-xs font-semibold text-red transition hover:border-red"
          >
            + Add unit on {floor.label}
          </button>
        </div>
      ))}
    </div>
  );
}

function ShapeStep({
  layoutStyle,
  trackAssets,
  onStyle,
  onTrackAssets,
  styles,
}: {
  layoutStyle: LayoutStyle;
  trackAssets: boolean;
  onStyle: (style: LayoutStyle) => void;
  onTrackAssets: (value: boolean) => void;
  styles: { id: LayoutStyle; label: string; hint: string }[];
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-text-muted">
        Pick the shape that matches this unit. You can rename every space on the
        next step.
      </p>
      <div className="grid gap-3">
        {styles.map((style) => (
          <button
            key={style.id}
            type="button"
            onClick={() => onStyle(style.id)}
            className={`rounded-xl border px-5 py-4 text-left transition ${
              layoutStyle === style.id
                ? "border-red bg-red/5"
                : "border-red/10 hover:border-red/30"
            }`}
          >
            <p className="text-sm font-semibold text-text">{style.label}</p>
            <p className="mt-1 text-xs text-text-muted">{style.hint}</p>
          </button>
        ))}
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-red/10 px-4 py-3">
        <input
          type="checkbox"
          checked={trackAssets}
          onChange={(e) => onTrackAssets(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[#cc0000]"
        />
        <span>
          <span className="block text-sm font-medium text-text">
            Track key equipment on the map
          </span>
          <span className="mt-0.5 block text-xs text-text-muted">
            Crash cart, ventilators, monitors — you can skip this for a people &
            beds-only pilot.
          </span>
        </span>
      </label>
    </div>
  );
}

function ZonesStep({
  zones,
  layoutStyle,
  totalBeds,
  onUpdate,
  onAdd,
  onRemove,
}: {
  zones: LayoutZone[];
  layoutStyle: LayoutStyle;
  totalBeds: number;
  onUpdate: (id: string, patch: Partial<LayoutZone>) => void;
  onAdd: (kind?: ZoneKind) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-text-muted">
          Use names staff already use when they page or shout down the corridor.
        </p>
        <p className="text-sm font-semibold tabular-nums text-red">
          {totalBeds} beds total
        </p>
      </div>

      <ul className="space-y-3">
        {zones.map((zone) => (
          <li
            key={zone.id}
            className="grid gap-3 rounded-xl border border-red/10 bg-peach-light/40 p-4 sm:grid-cols-[1fr_110px_auto]"
          >
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                {zone.kind}
              </p>
              <input
                className={inputClass}
                value={zone.label}
                onChange={(e) => onUpdate(zone.id, { label: e.target.value })}
                placeholder="Zone name"
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                Beds
              </p>
              <input
                type="number"
                min={0}
                max={12}
                disabled={zone.kind !== "clinical"}
                className={`${inputClass} disabled:opacity-40`}
                value={zone.bedCount}
                onChange={(e) =>
                  onUpdate(zone.id, {
                    bedCount: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => onRemove(zone.id)}
                disabled={
                  zones.length <= 2 ||
                  zone.kind === "opd" ||
                  (layoutStyle === "opd" &&
                    zone.kind.startsWith("opd_") &&
                    zones.filter((z) => z.kind.startsWith("opd_")).length <= 2)
                }
                className="rounded-lg px-3 py-3 text-xs font-medium text-text-muted transition hover:bg-white hover:text-red disabled:opacity-30"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onAdd("clinical")}
          className="rounded-xl border border-red/20 bg-white px-4 py-2 text-xs font-semibold text-red transition hover:border-red"
        >
          + Add {layoutStyle === "rooms" ? "room" : "bay"}
        </button>
        {!zones.some((z) => z.kind === "opd_consultation") && layoutStyle === "opd" && (
          <button
            type="button"
            onClick={() => onAdd("opd_consultation")}
            className="rounded-xl border border-red/15 px-4 py-2 text-xs font-semibold text-text-muted transition hover:border-red hover:text-red"
          >
            + Consultation room
          </button>
        )}
        {!zones.some((z) => z.kind === "nursing") && layoutStyle !== "opd" && (
          <button
            type="button"
            onClick={() => onAdd("nursing")}
            className="rounded-xl border border-red/15 px-4 py-2 text-xs font-semibold text-text-muted transition hover:border-red hover:text-red"
          >
            + Nursing station
          </button>
        )}
        {!zones.some((z) => z.kind === "store") && (
          <button
            type="button"
            onClick={() => onAdd("store")}
            className="rounded-xl border border-red/15 px-4 py-2 text-xs font-semibold text-text-muted transition hover:border-red hover:text-red"
          >
            + Equipment store
          </button>
        )}
      </div>
    </div>
  );
}

function TeamStep({
  roster,
  onChange,
}: {
  roster: StaffRosterEntry[];
  onChange: (roster: StaffRosterEntry[]) => void;
}) {
  const updatePerson = (id: string, patch: Partial<StaffRosterEntry>) => {
    onChange(roster.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-text-muted">
        This becomes your hospital-wide staff directory. Add everyone on this
        shift.
      </p>
      <div className="flex flex-wrap gap-2 rounded-xl border border-red/10 bg-peach-light/50 px-3 py-2.5">
        {ROLE_PRESETS.filter((r) => r.id !== "other").map((preset) => (
          <span
            key={preset.id}
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-text-muted"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: preset.color }}
            />
            {preset.short}
          </span>
        ))}
      </div>
      <ul className="space-y-3">
        {roster.map((person, index) => {
          const preset = resolveRoleCategory(person.role, person.name);
          return (
            <li
              key={person.id}
              className="rounded-xl border border-red/10 bg-peach-light/40 p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: preset.color }}
                />
                <p className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                  Person {index + 1} · {preset.short}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                    Full name
                  </p>
                  <input
                    className={inputClass}
                    value={person.name}
                    onChange={(e) =>
                      updatePerson(person.id, { name: e.target.value })
                    }
                    placeholder="e.g. Dr. Mehta"
                  />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                    Role
                  </p>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {ROLE_PRESETS.filter((r) => r.id !== "other").map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => updatePerson(person.id, { role: r.label })}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          preset.id === r.id
                            ? "text-text"
                            : "text-text-muted opacity-70 hover:opacity-100"
                        }`}
                        style={{
                          backgroundColor:
                            preset.id === r.id ? r.bg : "transparent",
                          border: `1px solid ${preset.id === r.id ? r.color : "transparent"}`,
                        }}
                      >
                        {r.short}
                      </button>
                    ))}
                  </div>
                  <input
                    className={inputClass}
                    value={person.role}
                    onChange={(e) =>
                      updatePerson(person.id, { role: e.target.value })
                    }
                    placeholder="Or type exact title"
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onChange([
              ...roster,
              {
                id: `roster-${newId("r")}`,
                name: "",
                role: "Nurse",
              },
            ])
          }
          className="rounded-xl border border-red/20 bg-white px-4 py-2 text-xs font-semibold text-red transition hover:border-red"
        >
          + Add staff member
        </button>
        {roster.length > 1 && (
          <button
            type="button"
            onClick={() => onChange(roster.slice(0, -1))}
            className="rounded-xl border border-red/15 px-4 py-2 text-xs font-semibold text-text-muted transition hover:border-red hover:text-red"
          >
            Remove last
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewStep({ campus }: { campus: CampusConfig }) {
  const team = campus.staffRoster.filter((s) => s.name.trim());
  const unitEntries = allUnits(campus);

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-text-muted">
        Live data mode starts empty: beds free, team on floor, no fake
        incidents. You update the board as the shift runs.
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        {[
          ["Hospital", campus.hospitalName],
          ["Set up by", `${campus.contactName} · ${campus.contactRole}`],
          ["Floors", String(campus.floors.length)],
          ["Units", String(unitEntries.length)],
          ["Team on board", String(team.length)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-red/10 bg-peach-light/50 px-4 py-3"
          >
            <dt className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">
              {label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-text">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-xl border border-red/10 px-4 py-3">
        <p className="mb-3 text-[11px] font-semibold tracking-wider text-text-muted uppercase">
          Campus tree
        </p>
        <ul className="space-y-2 text-sm">
          {campus.floors.map((floor) => (
            <li key={floor.id}>
              <p className="font-semibold text-text">
                {floor.label}
                {floor.building ? ` · ${floor.building}` : ""}
              </p>
              <ul className="mt-1 ml-4 space-y-1 text-text-muted">
                {floor.units.map((unit) => {
                  const beds = unit.zones.reduce((n, z) => n + z.bedCount, 0);
                  const mapped = unit.zones.filter(
                    (z) => (z.verticesM?.length ?? 0) >= 3,
                  ).length;
                  return (
                    <li key={unit.id}>
                      {unit.wardName} · {unit.wardType} · {beds} beds ·{" "}
                      {mapped} mapped
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
