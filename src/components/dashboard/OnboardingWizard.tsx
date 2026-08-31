"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  allUnits,
  campusToApiPayload,
  defaultUnitForFloor,
  emptyCampusDraft,
  finalizeCampus,
  layoutConfigToCampus,
  newId,
  saveCampus,
} from "@/lib/dashboard/campus";
import type {
  CampusConfig,
  FloorConfig,
  LayoutConfig,
  StaffRosterEntry,
  UnitLayoutConfig,
} from "@/lib/dashboard/types";
import { ONCOLOGY_UNIT_KINDS } from "@/lib/oncology/constants";
import { ROLE_PRESETS, resolveRoleCategory } from "@/lib/dashboard/roles";

const STEPS = [
  { title: "Who are you?", caption: "Quick setup · ~2 min" },
  { title: "Hospital", caption: "Oncology department" },
  { title: "Units", caption: "Pick which units to run today" },
  { title: "Team", caption: "Staff on shift" },
] as const;

interface Props {
  onComplete: (campus: CampusConfig) => void;
  initial?: LayoutConfig | CampusConfig | null;
}

export { campusToApiPayload };

export function OnboardingWizard({ onComplete, initial }: Props) {
  const [step, setStep] = useState(0);
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

  const floor = draft.floors[0];
  const progress = ((step + 1) / STEPS.length) * 100;

  const updateCampus = (patch: Partial<typeof draft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setError("");
  };

  const validateStep = () => {
    if (step === 0) {
      if (!draft.contactName.trim()) return "Enter your name.";
      if (!draft.contactRole.trim()) return "Enter your role.";
    }
    if (step === 1 && !draft.hospitalName.trim()) {
      return "Enter the hospital name.";
    }
    if (step === 2) {
      const enabled = floor?.units.filter((u) => u.wardName.trim()) ?? [];
      if (!enabled.length) return "Enable at least one unit.";
    }
    if (step === 3 && !draft.staffRoster.some((s) => s.name.trim())) {
      return "Add at least one team member.";
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
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    const campus = finalizeCampus({
      ...draft,
      floors: draft.floors.map((f) => ({
        ...f,
        units: f.units.filter((u) => u.wardName.trim()),
      })),
    });
    const first = allUnits(campus)[0];
    if (first) {
      campus.activeFloorId = first.floor.id;
      campus.activeUnitId = first.unit.id;
    }
    saveCampus(campus);
    onComplete(campus);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#f4f6f9]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.png" alt="" width={28} height={28} />
            <span className="font-display text-xs font-semibold tracking-[0.18em] text-red">
              DOQTO
            </span>
          </Link>
          <span className="text-xs text-slate-500">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <div className="h-1 bg-red/10">
          <div
            className="h-full bg-red transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-red">
          {STEPS[step].caption}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-slate-900">
          {STEPS[step].title}
        </h1>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {step === 0 && (
            <WelcomeStep
              contactName={draft.contactName}
              contactRole={draft.contactRole}
              onChange={(p) => updateCampus(p)}
            />
          )}
          {step === 1 && (
            <HospitalStep
              value={draft.hospitalName}
              onChange={(hospitalName) => updateCampus({ hospitalName })}
            />
          )}
          {step === 2 && floor && (
            <UnitsStep
              floor={floor}
              onChange={(units) =>
                updateCampus({
                  floors: draft.floors.map((f) =>
                    f.id === floor.id ? { ...f, units } : f,
                  ),
                })
              }
            />
          )}
          {step === 3 && (
            <TeamStep
              roster={draft.staffRoster}
              onChange={(staffRoster) => updateCampus({ staffRoster })}
            />
          )}
          {error && (
            <p className="mt-4 text-sm text-red">{error}</p>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => {
              setError("");
              setStep((s) => s - 1);
            }}
            className="text-sm text-slate-500 disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-lg bg-red px-5 py-2.5 text-sm font-semibold text-white"
          >
            {step === STEPS.length - 1 ? "Open board" : "Continue"}
          </button>
        </div>
      </main>
    </div>
  );
}

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-red focus:bg-white";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function WelcomeStep({
  contactName,
  contactRole,
  onChange,
}: {
  contactName: string;
  contactRole: string;
  onChange: (p: { contactName?: string; contactRole?: string }) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        No maps or floor plans to draw — we use ready-made oncology layouts.
      </p>
      <Field label="Your name">
        <input
          className={input}
          value={contactName}
          onChange={(e) => onChange({ contactName: e.target.value })}
          autoFocus
        />
      </Field>
      <Field label="Your role">
        <input
          className={input}
          value={contactRole}
          onChange={(e) => onChange({ contactRole: e.target.value })}
          placeholder="Charge nurse"
        />
      </Field>
    </div>
  );
}

function HospitalStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Hospital name">
      <input
        className={input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="City Care Hospital"
        autoFocus
      />
    </Field>
  );
}

function UnitsStep({
  floor,
  onChange,
}: {
  floor: FloorConfig;
  onChange: (units: UnitLayoutConfig[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Toggle units for today and name them how your team speaks.
      </p>
      {ONCOLOGY_UNIT_KINDS.map((kind) => {
        const unit = floor.units.find((u) => u.unitKind === kind.id);
        const on = Boolean(unit);
        return (
          <div
            key={kind.id}
            className={`rounded-xl border p-3 ${on ? "border-red/30 bg-red/5" : "border-slate-200"}`}
          >
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([
                      ...floor.units,
                      defaultUnitForFloor(floor.id, kind.id, floor.units.length + 1),
                    ]);
                  } else if (unit) {
                    onChange(floor.units.filter((u) => u.id !== unit.id));
                  }
                }}
                className="h-4 w-4 accent-red"
              />
              <span className="text-sm font-semibold text-slate-900">
                {kind.label}
              </span>
            </label>
            {on && unit && (
              <input
                className={`${input} mt-2`}
                value={unit.wardName}
                onChange={(e) =>
                  onChange(
                    floor.units.map((u) =>
                      u.id === unit.id ? { ...u, wardName: e.target.value } : u,
                    ),
                  )
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TeamStep({
  roster,
  onChange,
}: {
  roster: StaffRosterEntry[];
  onChange: (r: StaffRosterEntry[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Staff sign in on the board with PIN <strong>0000</strong> (pilot).
      </p>
      {roster.map((p, i) => (
        <div key={p.id} className="grid gap-2 sm:grid-cols-2">
          <input
            className={input}
            value={p.name}
            placeholder={`Name ${i + 1}`}
            onChange={(e) =>
              onChange(
                roster.map((x) =>
                  x.id === p.id ? { ...x, name: e.target.value } : x,
                ),
              )
            }
          />
          <input
            className={input}
            value={p.role}
            onChange={(e) =>
              onChange(
                roster.map((x) =>
                  x.id === p.id ? { ...x, role: e.target.value } : x,
                ),
              )
            }
          />
        </div>
      ))}
      <button
        type="button"
        className="text-xs font-semibold text-red"
        onClick={() =>
          onChange([...roster, { id: newId("r"), name: "", role: "Nurse" }])
        }
      >
        + Add person
      </button>
    </div>
  );
}
