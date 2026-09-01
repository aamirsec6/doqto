"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  campusToApiPayload,
  defaultUnitForFloor,
  emptyCampusDraft,
  finalizeCampus,
  newId,
} from "@/board/campus";
import type {
  FloorConfig,
  StaffRosterEntry,
  UnitLayoutConfig,
} from "@/lib/dashboard/types";
import { ONCOLOGY_UNIT_KINDS } from "@/lib/oncology/constants";

const STEPS = [
  { title: "Who are you?", caption: "Quick setup" },
  { title: "Hospital", caption: "Oncology department" },
  { title: "Units", caption: "Pick units for today" },
  { title: "Team", caption: "Staff on shift" },
] as const;

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-red focus:bg-white";

interface Props {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(emptyCampusDraft);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const floor = draft.floors[0];
  const progress = ((step + 1) / STEPS.length) * 100;

  const validate = () => {
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

  const next = async () => {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    setBusy(true);
    try {
      const campus = finalizeCampus({
        ...draft,
        floors: draft.floors.map((f) => ({
          ...f,
          units: f.units.filter((u) => u.wardName.trim()),
        })),
      });
      const res = await fetch("/api/tenant/snapshot", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campus: campusToApiPayload(campus) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not save setup");
      }
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
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
            <div className="space-y-4">
              <Field label="Your name">
                <input
                  className={input}
                  value={draft.contactName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, contactName: e.target.value }))
                  }
                  autoFocus
                />
              </Field>
              <Field label="Your role">
                <input
                  className={input}
                  value={draft.contactRole}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, contactRole: e.target.value }))
                  }
                  placeholder="Charge nurse"
                />
              </Field>
            </div>
          )}
          {step === 1 && (
            <Field label="Hospital name">
              <input
                className={input}
                value={draft.hospitalName}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, hospitalName: e.target.value }))
                }
                autoFocus
              />
            </Field>
          )}
          {step === 2 && floor && (
            <UnitsStep
              floor={floor}
              onChange={(units) =>
                setDraft((d) => ({
                  ...d,
                  floors: d.floors.map((f) =>
                    f.id === floor.id ? { ...f, units } : f,
                  ),
                }))
              }
            />
          )}
          {step === 3 && (
            <TeamStep
              roster={draft.staffRoster}
              onChange={(staffRoster) =>
                setDraft((d) => ({ ...d, staffRoster }))
              }
            />
          )}
          {error && <p className="mt-4 text-sm text-red">{error}</p>}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            disabled={step === 0 || busy}
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
            disabled={busy}
            onClick={() => void next()}
            className="rounded-lg bg-red px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy
              ? "Saving…"
              : step === STEPS.length - 1
                ? "Open board"
                : "Continue"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
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
                      defaultUnitForFloor(
                        floor.id,
                        kind.id,
                        floor.units.length + 1,
                      ),
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
                      u.id === unit.id
                        ? { ...u, wardName: e.target.value }
                        : u,
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
