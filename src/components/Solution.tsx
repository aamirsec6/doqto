"use client";

import { useState, type ReactNode } from "react";

type ModeId = "safety" | "ops" | "assets" | "command";

const portfolio: {
  id: ModeId;
  title: string;
  short: string;
  description: string;
}[] = [
  {
    id: "safety",
    title: "Safety & Emergency Response",
    short: "Alerts that find the nearest responder",
    description:
      "One-tap alerts, locate the nearest responder, dispatch, and auto-log everything for compliance.",
  },
  {
    id: "ops",
    title: "Operations & Flow",
    short: "Live load without phone chains",
    description:
      "Find any clinician in seconds, see live load across the hospital, and move patients without phone calls.",
  },
  {
    id: "assets",
    title: "Assets & Patients",
    short: "End the search, end the loss",
    description:
      "Track equipment and patient movement. End the search, end the loss.",
  },
  {
    id: "command",
    title: "The Trackable Hospital",
    short: "One command centre for the floor",
    description:
      "A real-time operational view, the hospital's command centre.",
  },
];

function DashboardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-red/15 bg-[#1a1212] text-white shadow-[0_24px_60px_-28px_rgba(124,0,0,0.4)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-[11px] text-white/50">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-emerald-300 uppercase">
            Tracking
          </span>
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function SafetyDashboard() {
  return (
    <DashboardShell
      title="Emergency response"
      subtitle="Alert → nearest responder → dispatch"
    >
      <div className="mb-4 rounded-xl border border-red/40 bg-red/20 px-4 py-3">
        <p className="text-[10px] font-semibold tracking-wider text-red uppercase">
          Active alert
        </p>
        <p className="mt-1 text-sm font-medium">Code response · ER Bay 2</p>
        <p className="mt-1 text-xs text-white/60">Raised 12s ago · auto-logging on</p>
      </div>
      <div className="space-y-2.5">
        {[
          { name: "Dr. Mehta", dist: "18m", eta: "22s", selected: true },
          { name: "Nurse Rao", dist: "41m", eta: "48s", selected: false },
          { name: "Security desk", dist: "62m", eta: "1m", selected: false },
        ].map((r) => (
          <div
            key={r.name}
            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
              r.selected
                ? "border-emerald-400/40 bg-emerald-400/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  r.selected ? "bg-emerald-400" : "bg-white/30"
                }`}
              />
              <div>
                <p className="text-sm text-white">{r.name}</p>
                <p className="text-[10px] text-white/50">{r.dist} away</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-emerald-300">ETA {r.eta}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] text-white/45">
        Nearest responder highlighted · dispatch ready
      </p>
    </DashboardShell>
  );
}

function OpsDashboard() {
  const wards = [
    { name: "ER", load: 82, people: 9 },
    { name: "ICU", load: 91, people: 6 },
    { name: "Ward 3B", load: 48, people: 11 },
    { name: "OT corridor", load: 27, people: 4 },
  ];
  return (
    <DashboardShell
      title="Operations & flow"
      subtitle="Clinician locations · live ward load"
    >
      <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
        <p className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
          Searching
        </p>
        <p className="mt-1 text-sm">
          Dr. Iyer ·{" "}
          <span className="font-semibold text-emerald-300">Ward 3B · Bay 4</span>
        </p>
        <p className="mt-1 text-xs text-white/50">Found in 3s · no phone call needed</p>
      </div>
      <div className="space-y-3">
        {wards.map((w) => (
          <div key={w.name}>
            <div className="mb-1 flex justify-between text-xs">
              <span>{w.name}</span>
              <span className="text-white/50">
                {w.people} staff · {w.load}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${
                  w.load > 85 ? "bg-red" : w.load > 60 ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${w.load}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

function AssetsDashboard() {
  const items = [
    { name: "Defibrillator D-12", place: "Utility bay", tone: "bg-red" },
    { name: "Ventilator V-04", place: "ICU · Bed 2", tone: "bg-emerald-400" },
    { name: "Patient · Bed 3", place: "Corridor → Radiology", tone: "bg-amber-400" },
    { name: "Infusion pump P-9", place: "Ward 3B", tone: "bg-emerald-400" },
  ];
  return (
    <DashboardShell
      title="Assets & patients"
      subtitle="Where things and people are right now"
    >
      <div className="relative mb-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <svg viewBox="0 0 280 120" className="h-auto w-full">
          <rect x="10" y="12" width="70" height="40" rx="4" fill="none" stroke="rgba(255,255,255,0.2)" />
          <rect x="100" y="12" width="70" height="40" rx="4" fill="none" stroke="rgba(255,255,255,0.2)" />
          <rect x="190" y="12" width="70" height="40" rx="4" fill="none" stroke="rgba(255,255,255,0.2)" />
          <rect x="10" y="68" width="120" height="40" rx="4" fill="none" stroke="rgba(255,255,255,0.2)" />
          <rect x="150" y="68" width="110" height="40" rx="4" fill="none" stroke="rgba(255,255,255,0.2)" />
          <text x="20" y="36" fill="rgba(255,255,255,0.45)" fontSize="9">ER</text>
          <text x="110" y="36" fill="rgba(255,255,255,0.45)" fontSize="9">ICU</text>
          <text x="200" y="36" fill="rgba(255,255,255,0.45)" fontSize="9">OT</text>
          <text x="20" y="92" fill="rgba(255,255,255,0.45)" fontSize="9">Ward</text>
          <text x="160" y="92" fill="rgba(255,255,255,0.45)" fontSize="9">Utility</text>
          <circle cx="45" cy="48" r="4" fill="#cc0000">
            <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="135" cy="30" r="4" fill="#34d399" />
          <circle cx="175" cy="88" r="4" fill="#f59e0b">
            <animate attributeName="cx" values="120;175;220;175" dur="8s" repeatCount="indefinite" />
          </circle>
          <circle cx="210" cy="88" r="4" fill="#cc0000" />
        </svg>
        <p className="mt-1 text-center text-[10px] text-white/40">
          Live map · patient movement animated
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.name}
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          >
            <span className={`h-2 w-2 rounded-full ${item.tone}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{item.name}</p>
              <p className="text-[10px] text-white/50">{item.place}</p>
            </div>
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}

function CommandDashboard() {
  return (
    <DashboardShell
      title="Trackable hospital"
      subtitle="Full floor command centre"
    >
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Staff", value: "24", tone: "text-emerald-300" },
          { label: "Patients", value: "41", tone: "text-amber-300" },
          { label: "Assets", value: "18", tone: "text-red" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center"
          >
            <p className={`font-display text-2xl font-semibold ${s.tone}`}>
              {s.value}
            </p>
            <p className="mt-0.5 text-[10px] text-white/50">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          "ER · 4 free beds",
          "ICU · 1 divert risk",
          "Theatre · on time",
          "Radiology · queue 3",
        ].map((row) => (
          <div
            key={row}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/80"
          >
            {row}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
        <p className="text-[10px] font-semibold tracking-wider text-white/45 uppercase">
          Cross-floor signal
        </p>
        <div className="mt-2 flex items-center gap-2 overflow-hidden">
          {["ER", "ICU", "Ward", "OT", "Rad"].map((n, i) => (
            <div key={n} className="flex items-center gap-2">
              <span className="rounded-md bg-white/10 px-2 py-1 text-[10px]">{n}</span>
              {i < 4 && (
                <span className="h-px w-4 bg-emerald-400/60">
                  <span className="sr-only">linked</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

function ModeDashboard({ mode }: { mode: ModeId }) {
  switch (mode) {
    case "safety":
      return <SafetyDashboard />;
    case "ops":
      return <OpsDashboard />;
    case "assets":
      return <AssetsDashboard />;
    case "command":
      return <CommandDashboard />;
  }
}

export function Solution() {
  const [active, setActive] = useState<ModeId | null>(null);
  const [flipped, setFlipped] = useState<ModeId | null>(null);

  return (
    <section id="solution" className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold tracking-widest text-red uppercase">
            What DOQTO does
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-text md:text-4xl">
            One platform, four ways in
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-text-muted">
            Click a card to open how that path is tracked live. Flip for the full
            description.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Dashboard stage */}
          <div className="lg:sticky lg:top-28">
            {active ? (
              <ModeDashboard mode={active} />
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-red/25 bg-peach-light px-6 py-12 text-center">
                <p className="font-display text-lg font-semibold text-text">
                  Pick a path to track
                </p>
                <p className="mt-2 max-w-sm text-sm text-text-muted">
                  Select one of the four cards. Each opens its own live-style
                  dashboard showing how that part of the hospital is tracked.
                </p>
              </div>
            )}
          </div>

          {/* Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {portfolio.map((item, i) => {
              const isActive = active === item.id;
              const isFlipped = flipped === item.id;

              return (
                <div
                  key={item.id}
                  className="h-[210px] w-full [perspective:1200px]"
                >
                  <div
                    className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                      isFlipped ? "[transform:rotateY(180deg)]" : ""
                    }`}
                  >
                    {/* Front */}
                    <div
                      className={`absolute inset-0 flex flex-col justify-between rounded-2xl border p-5 [backface-visibility:hidden] ${
                        isActive
                          ? "border-red bg-red text-white shadow-lg shadow-red/20"
                          : "border-red/15 bg-peach-light text-text"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex h-full flex-col text-left"
                        onClick={() => {
                          setActive(item.id);
                          setFlipped(null);
                        }}
                      >
                        <p
                          className={`font-mono text-xs font-semibold tracking-wider ${
                            isActive ? "text-white/70" : "text-red"
                          }`}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </p>
                        <h3 className="mt-2 font-display text-lg font-semibold leading-snug">
                          {item.title}
                        </h3>
                        <p
                          className={`mt-2 text-sm ${
                            isActive ? "text-white/80" : "text-text-muted"
                          }`}
                        >
                          {item.short}
                        </p>
                        <span
                          className={`mt-auto pt-4 text-[11px] font-semibold tracking-wide uppercase ${
                            isActive ? "text-white" : "text-red"
                          }`}
                        >
                          {isActive ? "Tracking now" : "Click to track →"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlipped(isFlipped ? null : item.id);
                        }}
                        className={`mt-2 self-start text-[10px] font-medium underline-offset-2 hover:underline ${
                          isActive ? "text-white/70" : "text-text-muted"
                        }`}
                      >
                        Flip for details
                      </button>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-red/20 bg-white p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      <div>
                        <p className="font-mono text-xs font-semibold tracking-wider text-red">
                          {String(i + 1).padStart(2, "0")}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-text-muted">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActive(item.id);
                            setFlipped(null);
                          }}
                          className="rounded-lg bg-red px-3 py-2 text-[11px] font-semibold text-white"
                        >
                          Show tracking
                        </button>
                        <button
                          type="button"
                          onClick={() => setFlipped(null)}
                          className="rounded-lg border border-red/20 px-3 py-2 text-[11px] font-semibold text-red"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
