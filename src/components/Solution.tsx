"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

type ModeId = "safety" | "ops" | "assets" | "command";

const portfolio: {
  id: ModeId;
  title: string;
  short: string;
  description: string;
  accent: string;
  module: string;
}[] = [
  {
    id: "safety",
    title: "Safety & Emergency Response",
    short: "Alerts that find the nearest responder",
    description:
      "One-tap alerts, locate the nearest responder, dispatch, and auto-log everything for compliance.",
    accent: "Emergency desk",
    module: "SAFETY / CODE RESPONSE",
  },
  {
    id: "ops",
    title: "Operations & Flow",
    short: "Live load without phone chains",
    description:
      "Find any clinician in seconds, see live load across the hospital, and move patients without phone calls.",
    accent: "Ops console",
    module: "OPERATIONS / FLOW",
  },
  {
    id: "assets",
    title: "Assets & Patients",
    short: "End the search, end the loss",
    description:
      "Track equipment and patient movement. End the search, end the loss.",
    accent: "Asset locator",
    module: "ASSET & PATIENT RTLS",
  },
  {
    id: "command",
    title: "The Trackable Hospital",
    short: "One command centre for the floor",
    description:
      "A real-time operational view, the hospital's command centre.",
    accent: "Command centre",
    module: "COMMAND CENTRE",
  },
];

function Clock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setT(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="font-mono tabular-nums tracking-tight">
      {t.toLocaleTimeString("en-GB", { hour12: false })}
    </span>
  );
}

function FloorMap({ mode }: { mode: ModeId }) {
  return (
    <div className="relative h-full min-h-[280px] overflow-hidden rounded border border-[#2a3340] bg-[#0c1017]">
      {/* Map chrome */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-[#2a3340] bg-[#121821]/95 px-3 py-1.5 backdrop-blur">
        <div className="flex items-center gap-3 text-[10px] text-[#8b97a8]">
          <span className="font-medium text-[#c5ced9]">L1 · Tower A</span>
          <span className="hidden sm:inline">Scale 1:250</span>
          <span>Zone grid · 12m</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="inline-flex items-center gap-1 text-[#8b97a8]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Active
          </span>
          <span className="inline-flex items-center gap-1 text-[#8b97a8]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Busy
          </span>
          <span className="inline-flex items-center gap-1 text-[#8b97a8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e5484d]" />
            Alert
          </span>
        </div>
      </div>

      <svg viewBox="0 0 640 420" className="h-full w-full pt-8" aria-hidden>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="rgba(255,255,255,0.035)"
              strokeWidth="1"
            />
          </pattern>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="640" height="420" fill="#0c1017" />
        <rect width="640" height="420" fill="url(#grid)" />

        {/* Outer shell */}
        <rect
          x="28"
          y="36"
          width="584"
          height="352"
          fill="#141b24"
          stroke="#3a4656"
          strokeWidth="2"
        />

        {/* Corridor */}
        <rect x="28" y="190" width="584" height="44" fill="#1a222d" />
        <text x="310" y="216" fill="#5c6b7e" fontSize="10" textAnchor="middle">
          MAIN CORRIDOR
        </text>

        {/* Rooms */}
        {[
          { x: 28, y: 36, w: 168, h: 154, label: "EMERGENCY", sub: "Bays 1–6", fill: "#18202a" },
          { x: 196, y: 36, w: 148, h: 154, label: "ICU", sub: "12 beds", fill: "#161e27" },
          { x: 344, y: 36, w: 140, h: 154, label: "THEATRE", sub: "OT-1 / OT-2", fill: "#161e27" },
          { x: 484, y: 36, w: 128, h: 154, label: "RADIOLOGY", sub: "CT · XR", fill: "#18202a" },
          { x: 28, y: 234, w: 220, h: 154, label: "WARD 3B", sub: "Beds 1–18", fill: "#161e27" },
          { x: 248, y: 234, w: 180, h: 154, label: "WARD 3A", sub: "Beds 1–14", fill: "#18202a" },
          { x: 428, y: 234, w: 184, h: 74, label: "UTILITY", sub: "Stores", fill: "#151c25" },
          { x: 428, y: 308, w: 184, h: 80, label: "LOBBY", sub: "Security", fill: "#151c25" },
        ].map((r) => (
          <g key={r.label}>
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              fill={r.fill}
              stroke="#2f3a49"
              strokeWidth="1.5"
            />
            <text
              x={r.x + 10}
              y={r.y + 18}
              fill="#9aa8b8"
              fontSize="10"
              fontFamily="ui-sans-serif, system-ui"
              fontWeight="600"
            >
              {r.label}
            </text>
            <text
              x={r.x + 10}
              y={r.y + 32}
              fill="#5c6b7e"
              fontSize="9"
              fontFamily="ui-monospace, monospace"
            >
              {r.sub}
            </text>
          </g>
        ))}

        {/* Door gaps on corridor */}
        {[112, 270, 414, 540, 120, 340, 500].map((x, i) => (
          <rect
            key={i}
            x={x}
            y={i < 4 ? 186 : 230}
            width="28"
            height="8"
            fill="#0c1017"
          />
        ))}

        {/* Mode-specific overlays */}
        {mode === "safety" && (
          <g>
            <circle cx="98" cy="118" r="28" fill="rgba(229,72,77,0.12)" filter="url(#softGlow)">
              <animate attributeName="r" values="22;34;22" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="98" cy="118" r="7" fill="#e5484d" stroke="#fff" strokeWidth="1.5" />
            <text x="112" y="112" fill="#ff8a8a" fontSize="9" fontFamily="ui-monospace, monospace">
              CODE · ER-B2
            </text>
            {/* Responder path */}
            <path
              d="M140 300 C 140 220, 110 160, 98 118"
              fill="none"
              stroke="#3ecf8e"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="24;0"
                dur="0.9s"
                repeatCount="indefinite"
              />
            </path>
            <g>
              <circle cx="140" cy="300" r="8" fill="#1a3d2e" stroke="#3ecf8e" strokeWidth="1.5" />
              <text
                x="140"
                y="303"
                textAnchor="middle"
                fill="#3ecf8e"
                fontSize="7"
                fontWeight="700"
              >
                SM
              </text>
              <text x="152" y="304" fill="#8b97a8" fontSize="8">
                Dr. Mehta · 22s
              </text>
            </g>
            <g opacity="0.85">
              <circle cx="200" cy="320" r="7" fill="#1e2936" stroke="#6b7785" strokeWidth="1" />
              <text x="200" y="323" textAnchor="middle" fill="#c5ced9" fontSize="6" fontWeight="700">
                NR
              </text>
            </g>
          </g>
        )}

        {mode === "ops" && (
          <g>
            {[
              { x: 90, y: 300, id: "AI", color: "#3ecf8e" },
              { x: 160, y: 340, id: "KP", color: "#3ecf8e" },
              { x: 70, y: 360, id: "RJ", color: "#f5a524" },
              { x: 410, y: 100, id: "VT", color: "#3ecf8e" },
              { x: 520, y: 120, id: "DN", color: "#f5a524" },
            ].map((p) => (
              <g key={p.id}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="9"
                  fill="#121821"
                  stroke={p.color}
                  strokeWidth="1.5"
                />
                <text
                  x={p.x}
                  y={p.y + 3}
                  textAnchor="middle"
                  fill={p.color}
                  fontSize="7"
                  fontWeight="700"
                >
                  {p.id}
                </text>
              </g>
            ))}
            {/* Search highlight */}
            <rect
              x="118"
              y="286"
              width="86"
              height="28"
              rx="2"
              fill="rgba(62,207,142,0.12)"
              stroke="#3ecf8e"
              strokeWidth="1"
            />
            <text x="128" y="304" fill="#3ecf8e" fontSize="9" fontFamily="ui-monospace, monospace">
              IYER · W3B-04
            </text>
          </g>
        )}

        {mode === "assets" && (
          <g>
            <g>
              <rect
                x="470"
                y="256"
                width="72"
                height="22"
                rx="2"
                fill="rgba(229,72,77,0.18)"
                stroke="#e5484d"
              />
              <text x="478" y="271" fill="#ff8a8a" fontSize="9" fontFamily="ui-monospace, monospace">
                DEFIB-D12
              </text>
              <circle cx="460" cy="267" r="5" fill="#e5484d">
                <animate
                  attributeName="opacity"
                  values="1;0.35;1"
                  dur="1.2s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <g>
              <circle cx="250" cy="100" r="5" fill="#f5a524" stroke="#fff" strokeWidth="1">
                <animate
                  attributeName="cx"
                  values="90;200;300;430;520;430;300;200;90"
                  dur="18s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values="300;210;118;210;100;210;118;210;300"
                  dur="18s"
                  repeatCount="indefinite"
                />
              </circle>
              <text x="36" y="400" fill="#6b7785" fontSize="9">
                Patient transfer · Bed 3 → Radiology · tag PAT-3B-03
              </text>
            </g>
            <g>
              <circle cx="280" cy="90" r="4" fill="#3ecf8e" />
              <text x="288" y="93" fill="#8b97a8" fontSize="8">
                VENT-04
              </text>
            </g>
          </g>
        )}

        {mode === "command" && (
          <g>
            {[
              { x: 80, y: 90, c: "#3ecf8e" },
              { x: 130, y: 140, c: "#3ecf8e" },
              { x: 260, y: 80, c: "#f5a524" },
              { x: 300, y: 130, c: "#3ecf8e" },
              { x: 400, y: 95, c: "#e5484d" },
              { x: 530, y: 110, c: "#f5a524" },
              { x: 100, y: 300, c: "#3ecf8e" },
              { x: 180, y: 340, c: "#3ecf8e" },
              { x: 320, y: 300, c: "#f5a524" },
              { x: 500, y: 270, c: "#e5484d" },
              { x: 520, y: 340, c: "#3ecf8e" },
            ].map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r="3.5" fill={d.c} opacity="0.95" />
            ))}
            {/* Heat-ish wards */}
            <rect
              x="28"
              y="36"
              width="168"
              height="154"
              fill="rgba(229,72,77,0.08)"
              pointerEvents="none"
            />
            <rect
              x="196"
              y="36"
              width="148"
              height="154"
              fill="rgba(245,165,36,0.1)"
              pointerEvents="none"
            />
          </g>
        )}
      </svg>

      <div className="absolute bottom-2 left-2 rounded border border-[#2a3340] bg-[#121821]/90 px-2 py-1 font-mono text-[9px] text-[#8b97a8]">
        GPS/ble fuse · ±2.4m · refreshed <Clock />
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded border border-[#2a3340] bg-[#121821]">
      <div className="flex items-center justify-between border-b border-[#2a3340] bg-[#161d27] px-3 py-2">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-[#8b97a8] uppercase">
          {title}
        </p>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </div>
  );
}

function SafetyBody() {
  return (
    <div className="grid h-full gap-3 lg:grid-cols-[1.45fr_1fr]">
      <FloorMap mode="safety" />
      <div className="flex flex-col gap-3">
        <div className="rounded border border-[#e5484d]/50 bg-[#2a1418] px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-[#ff8a8a] uppercase">
                Active incident · PRI-1
              </p>
              <p className="mt-1 text-sm font-semibold text-[#f5f7fa]">
                CODE BLUE · ER Bay 2
              </p>
              <p className="mt-1 font-mono text-[11px] text-[#8b97a8]">
                INC-2026-0714-0042 · opened 00:00:12
              </p>
            </div>
            <span className="rounded bg-[#e5484d] px-2 py-0.5 text-[10px] font-bold text-white">
              OPEN
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#e5484d]/20 pt-3 text-center">
            {[
              ["Elapsed", "00:12"],
              ["Ack", "1 / 3"],
              ["Audit", "ON"],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="font-mono text-xs text-[#f5f7fa]">{v}</p>
                <p className="text-[9px] text-[#8b97a8]">{k}</p>
              </div>
            ))}
          </div>
        </div>

        <Panel title="Nearest responders · ranked by ETA">
          <div className="overflow-hidden rounded border border-[#2a3340]">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-[#0c1017] text-[9px] tracking-wider text-[#6b7785] uppercase">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Staff</th>
                  <th className="px-2 py-1.5 font-medium">Zone</th>
                  <th className="px-2 py-1.5 font-medium">ETA</th>
                  <th className="px-2 py-1.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a3340] text-[#c5ced9]">
                {[
                  ["Dr. S. Mehta", "Ward 3B", "0:22", true],
                  ["N. Rao, RN", "Ward 3A", "0:48", false],
                  ["Sec. Team 2", "Lobby", "1:05", false],
                ].map(([name, zone, eta, best]) => (
                  <tr
                    key={String(name)}
                    className={best ? "bg-[#143026]/60" : "bg-[#121821]"}
                  >
                    <td className="px-2 py-2 font-medium text-[#f5f7fa]">{name}</td>
                    <td className="px-2 py-2 font-mono text-[#8b97a8]">{zone}</td>
                    <td className="px-2 py-2 font-mono text-emerald-400">{eta}</td>
                    <td className="px-2 py-2 text-right">
                      {best ? (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
                          BEST
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded bg-[#c62828] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#b71c1c]"
          >
            Dispatch nearest · log to incident
          </button>
        </Panel>
      </div>
    </div>
  );
}

function OpsBody() {
  return (
    <div className="grid h-full gap-3 lg:grid-cols-[1.4fr_1fr]">
      <FloorMap mode="ops" />
      <div className="flex flex-col gap-3">
        <Panel
          title="Staff locator"
          action={
            <span className="font-mono text-[10px] text-emerald-400">MATCH 1</span>
          }
        >
          <div className="flex items-center gap-2 rounded border border-[#2a3340] bg-[#0c1017] px-2.5 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#6b7785]">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="text-xs text-[#f5f7fa]">Iyer</span>
            <span className="ml-auto font-mono text-[10px] text-[#6b7785]">staff · all floors</span>
          </div>
          <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[#f5f7fa]">Dr. A. Iyer</p>
                <p className="mt-0.5 font-mono text-[11px] text-[#8b97a8]">
                  MED-CARD · STAFF-1842
                </p>
              </div>
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
                ON FLOOR
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <dt className="text-[#6b7785]">Location</dt>
                <dd className="font-medium text-[#c5ced9]">Ward 3B · Bay 4</dd>
              </div>
              <div>
                <dt className="text-[#6b7785]">Last seen</dt>
                <dd className="font-mono text-[#c5ced9]">3s ago</dd>
              </div>
              <div>
                <dt className="text-[#6b7785]">Role</dt>
                <dd className="text-[#c5ced9]">Attending · Medicine</dd>
              </div>
              <div>
                <dt className="text-[#6b7785]">Tag batt.</dt>
                <dd className="font-mono text-[#c5ced9]">87%</dd>
              </div>
            </dl>
          </div>
        </Panel>

        <Panel title="Unit census load">
          <ul className="space-y-2.5">
            {[
              { name: "Emergency", load: 82, beds: "14/17" },
              { name: "ICU", load: 91, beds: "11/12" },
              { name: "Ward 3B", load: 48, beds: "9/18" },
              { name: "OT corridor", load: 27, beds: "—" },
            ].map((w) => (
              <li key={w.name}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-[#c5ced9]">{w.name}</span>
                  <span className="font-mono text-[#6b7785]">
                    {w.beds} · {w.load}%
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-sm bg-[#0c1017]">
                  <div
                    className={`h-full ${
                      w.load > 85
                        ? "bg-[#e5484d]"
                        : w.load > 60
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                    }`}
                    style={{ width: `${w.load}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function AssetsBody() {
  const rows = [
    {
      id: "DEFIB-D12",
      name: "Defibrillator",
      zone: "Utility · Bay U2",
      status: "MISSING",
      seen: "46m",
      tone: "text-[#ff8a8a]",
    },
    {
      id: "VENT-V04",
      name: "Ventilator",
      zone: "ICU · Bed 2",
      status: "IN USE",
      seen: "4s",
      tone: "text-emerald-300",
    },
    {
      id: "PAT-3B-03",
      name: "Patient · Bed 3",
      zone: "Corridor → Rad",
      status: "MOVING",
      seen: "1s",
      tone: "text-amber-300",
    },
    {
      id: "INF-P09",
      name: "Infusion pump",
      zone: "Ward 3B · Bay 7",
      status: "IDLE",
      seen: "12s",
      tone: "text-emerald-300",
    },
    {
      id: "US-U2",
      name: "Ultrasound",
      zone: "ER storage",
      status: "IDLE",
      seen: "2m",
      tone: "text-emerald-300",
    },
  ];

  return (
    <div className="grid h-full gap-3 lg:grid-cols-[1.35fr_1fr]">
      <FloorMap mode="assets" />
      <Panel
        title="Tracked inventory"
        action={<span className="font-mono text-[10px] text-[#6b7785]">n=218 · floor</span>}
      >
        <div className="overflow-hidden rounded border border-[#2a3340]">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-[#0c1017] text-[9px] tracking-wider text-[#6b7785] uppercase">
              <tr>
                <th className="px-2 py-1.5 font-medium">Asset</th>
                <th className="px-2 py-1.5 font-medium">Zone</th>
                <th className="px-2 py-1.5 font-medium">Status</th>
                <th className="px-2 py-1.5 font-medium">Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a3340]">
              {rows.map((r) => (
                <tr key={r.id} className="bg-[#121821] hover:bg-[#161d27]">
                  <td className="px-2 py-2">
                    <p className="font-medium text-[#f5f7fa]">{r.name}</p>
                    <p className="font-mono text-[10px] text-[#6b7785]">{r.id}</p>
                  </td>
                  <td className="px-2 py-2 text-[#8b97a8]">{r.zone}</td>
                  <td className={`px-2 py-2 font-semibold ${r.tone}`}>{r.status}</td>
                  <td className="px-2 py-2 font-mono text-[#6b7785]">{r.seen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function CommandBody() {
  return (
    <div className="grid h-full gap-3 lg:grid-cols-[1.45fr_1fr]">
      <FloorMap mode="command" />
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Staff on floor", value: "24", delta: "+2", color: "text-emerald-300" },
            { label: "Patients", value: "41", delta: "0", color: "text-amber-300" },
            { label: "Open alerts", value: "3", delta: "+1", color: "text-[#ff8a8a]" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded border border-[#2a3340] bg-[#121821] px-2.5 py-2.5"
            >
              <p className={`font-mono text-xl font-semibold tracking-tight ${s.color}`}>
                {s.value}
              </p>
              <p className="mt-0.5 text-[10px] text-[#8b97a8]">{s.label}</p>
              <p className="mt-1 font-mono text-[9px] text-[#6b7785]">{s.delta} 15m</p>
            </div>
          ))}
        </div>

        <Panel title="Unit status board">
          <ul className="space-y-1.5">
            {[
              ["Emergency", "4 free beds", "border-l-[#e5484d]"],
              ["ICU", "Divert watch", "border-l-amber-400"],
              ["Theatre", "On schedule", "border-l-emerald-400"],
              ["Radiology", "Queue 3", "border-l-amber-400"],
            ].map(([u, s, border]) => (
              <li
                key={u}
                className={`flex items-center justify-between border-l-2 bg-[#0c1017] px-3 py-2 ${border}`}
              >
                <span className="text-xs font-medium text-[#c5ced9]">{u}</span>
                <span className="font-mono text-[11px] text-[#8b97a8]">{s}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Event stream">
          <ul className="space-y-2 font-mono text-[10px] leading-relaxed text-[#8b97a8]">
            <li>
              <span className="text-[#6b7785]">16:47:02</span>{" "}
              <span className="text-[#c5ced9]">PAT-3B-03</span> enter corridor → RAD
            </li>
            <li>
              <span className="text-[#6b7785]">16:46:41</span>{" "}
              <span className="text-[#c5ced9]">DEFIB-D12</span> last ping Utility U2
            </li>
            <li>
              <span className="text-[#6b7785]">16:46:18</span>{" "}
              <span className="text-emerald-300">BED-4B</span> released · Emergency
            </li>
            <li>
              <span className="text-[#6b7785]">16:45:55</span>{" "}
              <span className="text-[#c5ced9]">STAFF-1842</span> Ward 3B Bay 4
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function DashboardContent({ mode }: { mode: ModeId }) {
  switch (mode) {
    case "safety":
      return <SafetyBody />;
    case "ops":
      return <OpsBody />;
    case "assets":
      return <AssetsBody />;
    case "command":
      return <CommandBody />;
  }
}

function DashboardModal({
  mode,
  onClose,
  onSwitch,
}: {
  mode: ModeId;
  onClose: () => void;
  onSwitch: (id: ModeId) => void;
}) {
  const titleId = useId();
  const item = portfolio.find((p) => p.id === mode)!;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        aria-label="Close dashboard"
        onClick={onClose}
      />

      <div className="animate-fade-up relative flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-lg border border-[#2a3340] bg-[#0c1017] text-[#c5ced9] shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:h-[min(860px,92vh)] sm:rounded-lg">
        {/* App title bar — OS-like */}
        <div className="flex items-center gap-3 border-b border-[#2a3340] bg-[#161d27] px-3 py-2">
          <div className="hidden items-center gap-1.5 sm:flex">
            <button
              type="button"
              onClick={onClose}
              className="h-3 w-3 rounded-full bg-[#e5484d]"
              aria-label="Close"
            />
            <span className="h-3 w-3 rounded-full bg-[#f5a524]/80" />
            <span className="h-3 w-3 rounded-full bg-[#3ecf8e]/80" />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p id={titleId} className="truncate text-xs font-medium text-[#f5f7fa]">
              DOQTO Control · CityCare Medical Center
            </p>
          </div>
          <div className="hidden items-center gap-3 text-[10px] text-[#6b7785] md:flex">
            <span className="font-mono">FAC-CC-01</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Systems nominal
            </span>
            <Clock />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#2a3340] px-2.5 py-1 text-[11px] text-[#8b97a8] hover:bg-[#1c2530] sm:hidden"
          >
            Close
          </button>
        </div>

        {/* Module nav + context bar */}
        <div className="flex flex-col gap-0 border-b border-[#2a3340] bg-[#121821]">
          <div className="flex gap-0 overflow-x-auto">
            {portfolio.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSwitch(p.id)}
                className={`shrink-0 border-b-2 px-4 py-2.5 text-[11px] font-medium transition ${
                  p.id === mode
                    ? "border-[#c62828] bg-[#181f29] text-[#f5f7fa]"
                    : "border-transparent text-[#6b7785] hover:bg-[#161d27] hover:text-[#c5ced9]"
                }`}
              >
                {p.accent}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#2a3340] px-4 py-2 text-[10px] text-[#6b7785]">
            <span className="font-semibold tracking-wider text-[#8b97a8]">
              {item.module}
            </span>
            <span>Floor L1 · Tower A</span>
            <span className="hidden sm:inline">Shift B · Day</span>
            <span className="hidden md:inline max-w-md truncate text-[#5c6b7e]">
              {item.description}
            </span>
            <span className="ml-auto rounded border border-[#2a3340] bg-[#0c1017] px-2 py-0.5 font-mono text-[9px] text-amber-300/90">
              DEMO · not live hospital data
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
          <div className="min-h-[460px]">
            <DashboardContent mode={mode} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#2a3340] bg-[#161d27] px-4 py-2 font-mono text-[10px] text-[#5c6b7e]">
          <span>doqto.control · build 0.9.4-demo</span>
          <span className="hidden sm:inline">Esc to exit · preview session</span>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  item,
  index,
  onOpen,
}: {
  item: (typeof portfolio)[number];
  index: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col rounded-2xl border border-red/15 bg-peach-light p-6 text-left transition hover:border-red hover:bg-white hover:shadow-lg hover:shadow-red/10"
    >
      <p className="font-mono text-xs font-semibold tracking-wider text-red">
        {String(index + 1).padStart(2, "0")}
      </p>
      <h3 className="mt-3 font-display text-xl font-semibold text-text">
        {item.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">
        {item.short}
      </p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-red">
        Open live dashboard
        <span className="transition group-hover:translate-x-0.5">→</span>
      </span>
    </button>
  );
}

export function Solution() {
  const [openMode, setOpenMode] = useState<ModeId | null>(null);

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
            Open any path to step into a live-style dashboard and see how that
            part of the hospital is tracked.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {portfolio.map((item, i) => (
            <FeatureCard
              key={item.id}
              item={item}
              index={i}
              onOpen={() => setOpenMode(item.id)}
            />
          ))}
        </div>
      </div>

      {openMode && (
        <DashboardModal
          mode={openMode}
          onClose={() => setOpenMode(null)}
          onSwitch={setOpenMode}
        />
      )}
    </section>
  );
}
