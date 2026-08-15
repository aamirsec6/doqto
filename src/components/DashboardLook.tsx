"use client";

import { useState } from "react";

const zones = [
  { name: "Bay A", beds: "3/4", heat: "ok" },
  { name: "Bay B", beds: "4/4", heat: "watch" },
  { name: "Bay C", beds: "2/4", heat: "ok" },
  { name: "Nursing", beds: "—", heat: "ok" },
];

const staff = [
  { name: "Dr. Mehta", role: "Physician", status: "Available", zone: "Bay A" },
  { name: "Sr. Nair", role: "Charge nurse", status: "Responding", zone: "Bay B" },
  { name: "Dr. Rao", role: "Registrar", status: "Busy", zone: "OT prep" },
  { name: "R. Khan", role: "Nurse", status: "Available", zone: "Nursing" },
];

const assets = [
  { name: "Crash cart", zone: "Nursing", ago: "0m" },
  { name: "Defibrillator", zone: "Bay A", ago: "2m" },
  { name: "Ventilator", zone: "Store", ago: "8m" },
];

export function DashboardLook() {
  const [tab, setTab] = useState<"floor" | "alert">("floor");

  return (
    <section id="dashboard" className="bg-peach-light py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold tracking-widest text-red uppercase">
            Product look
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-text md:text-4xl">
            The ward board hospitals actually use
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-text-muted">
            A live floor plan, who is free, where equipment was last seen, and
            emergency response timed in one place. This is a demo preview, not
            live hospital data.
          </p>
        </div>

        <div className="mt-10 overflow-hidden border border-[#2a3340] bg-[#0c1017] text-[#c5ced9] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)]">
          {/* Title bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a3340] bg-[#161d27] px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="font-display text-xs font-semibold tracking-[0.16em] text-[#e5484d]">
                DOQTO
              </span>
              <span className="hidden h-4 w-px bg-white/10 sm:block" />
              <p className="text-[12px] font-medium text-[#f5f7fa]">
                Ward 3 · Floor L1
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
              <span className="rounded border border-[#2a3340] px-2 py-0.5 font-mono text-amber-300/90">
                DEMO
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#2a3340] bg-[#121821]">
            {(
              [
                ["floor", "Floor plan"],
                ["alert", "Emergency view"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`px-4 py-2.5 text-[11px] font-medium transition ${
                  tab === id
                    ? "border-b-2 border-[#c62828] bg-[#181f29] text-[#f5f7fa]"
                    : "border-b-2 border-transparent text-[#6b7785] hover:text-[#c5ced9]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "floor" ? <FloorPreview /> : <AlertPreview />}

          <div className="border-t border-[#2a3340] bg-[#161d27] px-4 py-2 font-mono text-[10px] text-[#5c6b7e]">
            doqto.control · preview for doqto.in
          </div>
        </div>

        <p className="mt-5 text-sm text-text-muted">
          Want the interactive modules? Open any path in{" "}
          <a href="#solution" className="font-semibold text-red hover:text-red-dark">
            What DOQTO does
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function FloorPreview() {
  return (
    <div className="grid gap-0 lg:grid-cols-12">
      {/* Left rail */}
      <aside className="border-b border-[#2a3340] p-4 lg:col-span-3 lg:border-r lg:border-b-0">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-[#6b7785] uppercase">
          Zones
        </p>
        <ul className="mt-3 space-y-2">
          {zones.map((z) => (
            <li
              key={z.name}
              className="flex items-center justify-between border border-white/5 bg-black/25 px-3 py-2"
            >
              <span className="text-[12px] font-medium text-[#e8eef8]">
                {z.name}
              </span>
              <span className="text-[11px] text-[#8b97a8]">{z.beds}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[10px] font-semibold tracking-[0.12em] text-[#6b7785] uppercase">
          Equipment last seen
        </p>
        <ul className="mt-3 space-y-2">
          {assets.map((a) => (
            <li key={a.name} className="text-[11px] text-[#8b97a8]">
              <span className="text-[#c5ced9]">{a.name}</span>
              <br />
              {a.zone}, {a.ago} ago
            </li>
          ))}
        </ul>
      </aside>

      {/* Map */}
      <div className="relative min-h-[280px] border-b border-[#2a3340] p-4 lg:col-span-6 lg:border-b-0 lg:border-r">
        <p className="mb-3 text-[10px] font-semibold tracking-[0.12em] text-[#6b7785] uppercase">
          Ward floor plan
        </p>
        <svg
          viewBox="0 0 480 280"
          className="h-auto w-full"
          role="img"
          aria-label="Sample ward floor plan"
        >
          <rect width="480" height="280" fill="#111827" />
          <path
            d="M20 20 H230 V140 H20 Z"
            fill="rgba(36,45,58,0.95)"
            stroke="rgba(100,116,139,0.55)"
          />
          <path
            d="M250 20 H460 V140 H250 Z"
            fill="rgba(127,29,29,0.18)"
            stroke="#b91c1c"
            strokeDasharray="6 3"
          />
          <path
            d="M20 160 H230 V260 H20 Z"
            fill="rgba(36,45,58,0.95)"
            stroke="rgba(100,116,139,0.55)"
          />
          <path
            d="M250 160 H460 V260 H250 Z"
            fill="rgba(30,41,59,0.95)"
            stroke="rgba(100,116,139,0.55)"
          />
          <text x="125" y="45" textAnchor="middle" fill="rgba(203,213,225,0.7)" fontSize="11">
            BAY A
          </text>
          <text x="355" y="45" textAnchor="middle" fill="rgba(252,165,165,0.85)" fontSize="11">
            BAY B · ALERT
          </text>
          <text x="125" y="185" textAnchor="middle" fill="rgba(203,213,225,0.7)" fontSize="11">
            BAY C
          </text>
          <text x="355" y="185" textAnchor="middle" fill="rgba(203,213,225,0.7)" fontSize="11">
            NURSING
          </text>
          {/* beds */}
          <rect x="50" y="70" width="36" height="24" fill="#475569" stroke="#94a3b8" />
          <rect x="100" y="70" width="36" height="24" fill="#475569" stroke="#94a3b8" />
          <rect x="150" y="70" width="36" height="24" fill="rgba(15,23,42,0.35)" stroke="#64748b" />
          <rect x="280" y="70" width="36" height="24" fill="#475569" stroke="#94a3b8" />
          <rect x="330" y="70" width="36" height="24" fill="#475569" stroke="#94a3b8" />
          <rect x="380" y="70" width="36" height="24" fill="#475569" stroke="#94a3b8" />
          {/* staff dots */}
          <circle cx="90" cy="120" r="7" fill="#14532d" stroke="rgba(226,232,240,0.35)" />
          <circle cx="340" cy="115" r="8" fill="#7f1d1d" stroke="#fca5a5" />
          <circle cx="400" cy="210" r="7" fill="#14532d" stroke="rgba(226,232,240,0.35)" />
          {/* asset */}
          <rect x="370" y="200" width="12" height="12" fill="#1e293b" stroke="#94a3b8" />
        </svg>
        <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-[#6b7785]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#14532d]" /> Available staff
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#7f1d1d]" /> Responding
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 border border-[#64748b]" /> Ready bed
          </span>
        </div>
      </div>

      {/* Right rail */}
      <aside className="p-4 lg:col-span-3">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-[#6b7785] uppercase">
          On duty
        </p>
        <ul className="mt-3 space-y-2">
          {staff.map((person) => (
            <li
              key={person.name}
              className="border border-white/5 bg-black/25 px-3 py-2"
            >
              <p className="text-[12px] font-medium text-[#e8eef8]">
                {person.name}
              </p>
              <p className="mt-0.5 text-[10px] text-[#8b97a8]">
                {person.role} · {person.zone}
              </p>
              <p
                className={`mt-1 text-[10px] font-semibold ${
                  person.status === "Responding"
                    ? "text-red-300"
                    : person.status === "Available"
                      ? "text-emerald-400/90"
                      : "text-amber-300/80"
                }`}
              >
                {person.status}
              </p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function AlertPreview() {
  return (
    <div className="grid gap-0 lg:grid-cols-12">
      <div className="border-b border-[#2a3340] p-5 lg:col-span-5 lg:border-r lg:border-b-0">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-red-300/90 uppercase">
          Emergency response
        </p>
        <p className="mt-3 text-lg font-semibold text-white">
          Patient collapsed
        </p>
        <p className="mt-2 text-sm text-slate-300">Zone Bay B · raised 1m ago</p>
        <p className="mt-4 text-sm text-slate-200">
          Sr. Nair is responding
        </p>
        <ul className="mt-3 space-y-1 text-[11px] text-[#8b97a8]">
          <li>Crash cart → Nursing, 0m ago</li>
          <li>Defibrillator → Bay A, 2m ago</li>
        </ul>
        <button
          type="button"
          className="mt-5 border border-red-800/60 bg-red-950/40 px-3 py-1.5 text-[11px] font-semibold text-red-200"
        >
          Confirm responding
        </button>
      </div>
      <div className="p-5 lg:col-span-7">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-[#6b7785] uppercase">
          Incident log
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[11px]">
            <thead className="text-[#6b7785]">
              <tr className="border-b border-white/5">
                <th className="pb-2 pr-3 font-medium">Event</th>
                <th className="pb-2 pr-3 font-medium">Zone</th>
                <th className="pb-2 pr-3 font-medium">Responder</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-2.5 pr-3 text-[#e8eef8]">Patient collapsed</td>
                <td className="py-2.5 pr-3 text-[#8b97a8]">Bay B</td>
                <td className="py-2.5 pr-3 text-[#8b97a8]">Sr. Nair</td>
                <td className="py-2.5 text-red-300">Responding</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2.5 pr-3 text-[#e8eef8]">Infusion pump locate</td>
                <td className="py-2.5 pr-3 text-[#8b97a8]">Store</td>
                <td className="py-2.5 pr-3 text-[#8b97a8]">—</td>
                <td className="py-2.5 text-[#8b97a8]">Resolved</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 text-[#e8eef8]">Bed ready Bay C</td>
                <td className="py-2.5 pr-3 text-[#8b97a8]">Bay C</td>
                <td className="py-2.5 pr-3 text-[#8b97a8]">—</td>
                <td className="py-2.5 text-[#8b97a8]">Logged</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
