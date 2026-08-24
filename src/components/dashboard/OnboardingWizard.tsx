"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  defaultZonesForStyle,
  emptyLayoutDraft,
  saveLayout,
} from "@/lib/dashboard/layout";
import { defaultZonesForOpd } from "@/lib/map/opd-template";
import { MapZoneEditor } from "@/components/dashboard/MapZoneEditor";
import type {
  LayoutConfig,
  LayoutStyle,
  LayoutZone,
  MapCalibration,
  StaffRosterEntry,
  WardType,
  ZoneKind,
} from "@/lib/dashboard/types";
import { ROLE_PRESETS, resolveRoleCategory } from "@/lib/dashboard/roles";

const STEPS = [
  { id: "welcome", title: "Who are you?", caption: "Takes about 5 minutes" },
  { id: "unit", title: "Which ward?", caption: "Hospital and unit names" },
  { id: "shape", title: "How is the floor laid out?", caption: "Pick the closest match" },
  { id: "zones", title: "Name the spaces", caption: "Use names staff already say" },
  { id: "calibrate", title: "Set real-world scale", caption: "Mark a known wall length" },
  { id: "map", title: "Draw zone boundaries", caption: "Trace rooms on the floor plan" },
  { id: "team", title: "Who is on duty?", caption: "Staff directory for this shift" },
  { id: "review", title: "Ready to go live?", caption: "Check once, then open the board" },
] as const;

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
  onComplete: (config: LayoutConfig) => void;
  initial?: LayoutConfig | null;
}

export function OnboardingWizard({ onComplete, initial }: Props) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() =>
    initial
      ? {
          version: 2 as const,
          hospitalName: initial.hospitalName,
          contactName: initial.contactName,
          contactRole: initial.contactRole,
          wardName: initial.wardName,
          wardType: initial.wardType,
          floorLabel: initial.floorLabel,
          layoutStyle: initial.layoutStyle,
          zones: initial.zones,
          trackAssets: initial.trackAssets,
          calibration: initial.calibration,
          staffRoster: initial.staffRoster?.length
            ? initial.staffRoster
            : [
                {
                  id: "roster-contact",
                  name: initial.contactName,
                  role: initial.contactRole || "Charge nurse",
                },
              ],
        }
      : emptyLayoutDraft(),
  );
  const [error, setError] = useState("");

  const progress = ((step + 1) / STEPS.length) * 100;

  const totalBeds = useMemo(
    () => draft.zones.reduce((sum, z) => sum + z.bedCount, 0),
    [draft.zones],
  );

  const update = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const setWardType = (wardType: WardType) => {
    if (wardType === "opd") {
      setDraft((prev) => ({
        ...prev,
        wardType,
        layoutStyle: "opd",
        zones: defaultZonesForOpd(),
      }));
    } else {
      update("wardType", wardType);
    }
    setError("");
  };

  const setLayoutStyle = (style: LayoutStyle) => {
    setDraft((prev) => ({
      ...prev,
      layoutStyle: style,
      zones: defaultZonesForStyle(style),
    }));
    setError("");
  };

  const updateZone = (id: string, patch: Partial<LayoutZone>) => {
    setDraft((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)),
    }));
  };

  const addZone = (kind: ZoneKind = "clinical") => {
    const n = draft.zones.filter((z) => z.kind === kind).length + 1;
    const id = `${kind}-${Date.now()}`;
    const label =
      kind === "clinical"
        ? draft.layoutStyle === "rooms"
          ? `Room ${100 + n}`
          : `Bay ${String.fromCharCode(64 + n)}`
        : kind === "nursing"
          ? "Nursing station"
          : kind === "store"
            ? "Equipment store"
            : `Zone ${n}`;
    setDraft((prev) => ({
      ...prev,
      zones: [
        ...prev.zones,
        {
          id,
          label,
          kind,
          bedCount: kind === "clinical" ? 2 : 0,
        },
      ],
    }));
  };

  const removeZone = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      zones: prev.zones.filter((z) => z.id !== id),
    }));
  };

  const validateStep = () => {
    if (step === 0) {
      if (!draft.contactName.trim()) return "Please enter your name.";
      if (!draft.contactRole.trim()) return "Please enter your role.";
    }
    if (step === 1) {
      if (!draft.hospitalName.trim()) return "Please enter the hospital name.";
      if (!draft.wardName.trim()) return "Please name this ward or unit.";
      if (!draft.floorLabel.trim()) return "Please enter the floor / block.";
    }
    if (step === 3) {
      if (draft.layoutStyle === "opd") {
        const opdSubs = draft.zones.filter((z) => z.kind !== "opd");
        if (opdSubs.length < 2) {
          return "OPD needs at least registration and waiting sub-zones.";
        }
      } else {
        if (draft.zones.filter((z) => z.kind === "clinical").length === 0) {
          return "Add at least one clinical bay or room.";
        }
        if (totalBeds < 1) return "Add at least one bed to a clinical zone.";
      }
      if (draft.zones.some((z) => !z.label.trim())) {
        return "Every zone needs a name staff will recognise.";
      }
    }
    if (step === 4) {
      if (!draft.calibration?.pixelsPerMetre) {
        return "Set the floor scale by marking a reference wall or use default scale.";
      }
    }
    if (step === 6) {
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
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const finish = () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    const config: LayoutConfig = {
      ...draft,
      version: 2,
      hospitalName: draft.hospitalName.trim(),
      contactName: draft.contactName.trim(),
      contactRole: draft.contactRole.trim(),
      wardName: draft.wardName.trim(),
      floorLabel: draft.floorLabel.trim(),
      zones: draft.zones.map((z) => ({
        ...z,
        label: z.label.trim(),
        bedCount: Math.max(0, Math.min(12, Number(z.bedCount) || 0)),
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
    saveLayout(config);
    onComplete(config);
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
          Ward board setup · Step {step + 1} of {STEPS.length}
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
        </div>

        <div className="flex-1 rounded-2xl border border-red/15 bg-white p-6 shadow-[0_20px_50px_-36px_rgba(124,0,0,0.35)] md:p-8">
          {step === 0 && (
            <WelcomeStep
              contactName={draft.contactName}
              contactRole={draft.contactRole}
              onChange={update}
            />
          )}
          {step === 1 && (
            <UnitStep
              draft={draft}
              onChange={update}
              onWardType={setWardType}
              wardTypes={wardTypes}
            />
          )}
          {step === 2 && (
            <ShapeStep
              layoutStyle={draft.layoutStyle}
              trackAssets={draft.trackAssets}
              onStyle={setLayoutStyle}
              onTrackAssets={(v) => update("trackAssets", v)}
              styles={layoutStyles}
            />
          )}
          {step === 3 && (
            <ZonesStep
              zones={draft.zones}
              layoutStyle={draft.layoutStyle}
              totalBeds={totalBeds}
              onUpdate={updateZone}
              onAdd={addZone}
              onRemove={removeZone}
            />
          )}
          {step === 4 && (
            <MapZoneEditor
              mode="calibrate"
              zones={draft.zones}
              calibration={draft.calibration}
              onCalibrationChange={(calibration: MapCalibration) =>
                update("calibration", calibration)
              }
              onZonesChange={(zones) => update("zones", zones)}
            />
          )}
          {step === 5 && (
            <MapZoneEditor
              mode="draw"
              zones={draft.zones}
              calibration={draft.calibration}
              onCalibrationChange={(calibration: MapCalibration) =>
                update("calibration", calibration)
              }
              onZonesChange={(zones) => update("zones", zones)}
            />
          )}
          {step === 6 && (
            <TeamStep
              roster={draft.staffRoster}
              onChange={(roster) => update("staffRoster", roster)}
            />
          )}
          {step === 7 && (
            <ReviewStep draft={draft} totalBeds={totalBeds} />
          )}

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
              Continue
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
  onChange: <K extends keyof ReturnType<typeof emptyLayoutDraft>>(
    key: K,
    value: ReturnType<typeof emptyLayoutDraft>[K],
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-base leading-relaxed text-text-muted">
        Anyone on the ward can set this up. You will name the spaces and the
        people on this shift. After that, the live board shows where staff and
        equipment are in real time.
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

function UnitStep({
  draft,
  onChange,
  onWardType,
  wardTypes,
}: {
  draft: ReturnType<typeof emptyLayoutDraft>;
  onChange: <K extends keyof ReturnType<typeof emptyLayoutDraft>>(
    key: K,
    value: ReturnType<typeof emptyLayoutDraft>[K],
  ) => void;
  onWardType: (wardType: WardType) => void;
  wardTypes: { id: WardType; label: string; hint: string }[];
}) {
  return (
    <div className="space-y-6">
      <Field label="Hospital name">
        <input
          className={inputClass}
          value={draft.hospitalName}
          onChange={(e) => onChange("hospitalName", e.target.value)}
          placeholder="e.g. City Care Hospital"
          autoFocus
        />
      </Field>
      <Field label="Ward / unit name" hint="Exactly as staff say it">
        <input
          className={inputClass}
          value={draft.wardName}
          onChange={(e) => onChange("wardName", e.target.value)}
          placeholder="e.g. ICU Ward 2"
        />
      </Field>
      <Field label="Floor / block">
        <input
          className={inputClass}
          value={draft.floorLabel}
          onChange={(e) => onChange("floorLabel", e.target.value)}
          placeholder="e.g. Floor 3 · B Block"
        />
      </Field>
      <div>
        <p className="text-sm font-medium text-text">Unit type</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {wardTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => onWardType(type.id)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                draft.wardType === type.id
                  ? "border-red bg-red/5"
                  : "border-red/10 hover:border-red/30"
              }`}
            >
              <p className="text-sm font-semibold text-text">{type.label}</p>
              <p className="mt-0.5 text-xs text-text-muted">{type.hint}</p>
            </button>
          ))}
        </div>
      </div>
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
        Pick the shape that matches this ward. You can rename every space on
        the next step.
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
            Crash cart, ventilators, monitors — you can skip this for a people
            & beds-only pilot.
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
                  (layoutStyle === "opd" && zone.kind.startsWith("opd_") && zones.filter((z) => z.kind.startsWith("opd_")).length <= 2)
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
        This becomes your staff directory. Add everyone on this shift. Each role
        gets a colour so you can spot doctors, nurses, and others instantly on
        the live map.
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
                id: `roster-${Date.now()}`,
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

function ReviewStep({
  draft,
  totalBeds,
}: {
  draft: ReturnType<typeof emptyLayoutDraft>;
  totalBeds: number;
}) {
  const clinical = draft.zones.filter((z) => z.kind === "clinical").length;
  const opdZones = draft.zones.filter((z) => z.kind.startsWith("opd")).length;
  const mapped = draft.zones.filter((z) => (z.verticesM?.length ?? 0) >= 3).length;
  const team = draft.staffRoster.filter((s) => s.name.trim());
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-text-muted">
        Live data mode starts empty: beds free, team on floor, no fake
        incidents. You update the board as the shift runs.
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        {[
          ["Hospital", draft.hospitalName],
          ["Ward", draft.wardName],
          ["Floor", draft.floorLabel],
          ["Set up by", `${draft.contactName} · ${draft.contactRole}`],
          ["Layout", draft.layoutStyle],
          draft.layoutStyle === "opd"
            ? ["OPD sub-zones", String(opdZones)]
            : ["Clinical zones", String(clinical)],
          ["Beds", String(totalBeds)],
          ["Scale", draft.calibration?.pixelsPerMetre ? `${draft.calibration.pixelsPerMetre.toFixed(1)} px/m` : "Default"],
          ["Mapped polygons", String(mapped)],
          ["Team on board", String(team.length)],
          ["Equipment layer", draft.trackAssets ? "On" : "Off"],
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
      <ul className="rounded-xl border border-red/10 px-4 py-3">
        <p className="mb-2 text-[11px] font-semibold tracking-wider text-text-muted uppercase">
          Staff directory
        </p>
        {team.map((z) => {
          const preset = resolveRoleCategory(z.role, z.name);
          return (
            <li
              key={z.id}
              className="flex items-center justify-between gap-3 border-t border-red/5 py-2 text-sm first:border-0"
            >
              <span className="flex items-center gap-2 text-text">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: preset.color }}
                />
                {z.name}
              </span>
              <span className="text-text-muted">{z.role}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
