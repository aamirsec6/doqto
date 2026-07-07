"use client";

const rooms = [
  { id: "er", label: "Emergency", x: 24, y: 24, w: 168, h: 120 },
  { id: "icu", label: "ICU", x: 208, y: 24, w: 120, h: 120 },
  { id: "or", label: "Theatre", x: 344, y: 24, w: 192, h: 120 },
  { id: "ward", label: "Ward 3B", x: 24, y: 164, w: 148, h: 172 },
  { id: "rad", label: "Radiology", x: 188, y: 164, w: 140, h: 100 },
  { id: "pharm", label: "Pharmacy", x: 344, y: 164, w: 88, h: 100 },
  { id: "lab", label: "Lab", x: 448, y: 164, w: 88, h: 100 },
  { id: "recv", label: "Reception", x: 188, y: 280, w: 348, h: 56 },
];

const rfidNodes = [
  { x: 108, y: 152, label: "RF-01" },
  { x: 200, y: 152, label: "RF-02" },
  { x: 340, y: 152, label: "RF-03" },
  { x: 340, y: 280, label: "RF-04" },
];

const trackers = [
  {
    id: "clinician",
    label: "Dr. on call",
    color: "#cc0000",
    path: "M 90 80 Q 140 80 140 140 T 200 140 T 260 90",
    dur: "14s",
    delay: "0s",
  },
  {
    id: "patient",
    label: "Patient",
    color: "#e67e22",
    path: "M 268 80 L 268 140 L 248 210",
    dur: "11s",
    delay: "2s",
  },
  {
    id: "equipment",
    label: "Defibrillator",
    color: "#7c0000",
    path: "M 388 210 L 300 210 L 200 210 L 120 120",
    dur: "16s",
    delay: "1s",
  },
  {
    id: "nurse",
    label: "Nurse",
    color: "#cc0000",
    path: "M 96 240 L 96 200 L 188 200 L 260 200 L 340 200",
    dur: "13s",
    delay: "3.5s",
  },
];

const liveEvents = [
  { time: "now", text: "Clinician located — ER Bay 2", type: "clinician" },
  { time: "12s", text: "Defibrillator — en route to ICU", type: "equipment" },
  { time: "28s", text: "Bed 4B marked available", type: "bed" },
  { time: "41s", text: "Patient transfer — Ward → Radiology", type: "patient" },
];

export function HospitalTracker() {
  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-2xl border border-red/15 bg-white/60 shadow-xl shadow-red/5 backdrop-blur-sm">
        {/* Status bar */}
        <div className="flex items-center justify-between border-b border-red/10 bg-peach-light/80 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red" />
            </span>
            <span className="text-xs font-semibold tracking-wider text-red uppercase">
              Live tracking
            </span>
          </div>
          <span className="font-mono text-[10px] text-text-muted">
            RFID mesh · 4 nodes active
          </span>
        </div>

        <div className="relative p-3 md:p-4">
          <svg
            viewBox="0 0 560 340"
            className="h-auto w-full"
            aria-label="Animated hospital floor plan with real-time RFID tracking"
          >
            <defs>
              <pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="rgba(204,0,0,0.04)"
                  strokeWidth="0.5"
                />
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width="560" height="340" fill="url(#grid)" rx="8" />

            {/* Corridors */}
            <rect
              x="172"
              y="148"
              width="216"
              height="12"
              rx="2"
              fill="rgba(204,0,0,0.06)"
            />
            <rect
              x="172"
              y="268"
              width="216"
              height="8"
              rx="2"
              fill="rgba(204,0,0,0.06)"
            />

            {/* Rooms */}
            {rooms.map((room) => (
              <g key={room.id}>
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.w}
                  height={room.h}
                  rx="6"
                  fill="#ffffff"
                  stroke="rgba(204,0,0,0.35)"
                  strokeWidth="1.5"
                />
                <text
                  x={room.x + room.w / 2}
                  y={room.y + room.h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#5c3d3d"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="system-ui, sans-serif"
                >
                  {room.label}
                </text>
              </g>
            ))}

            {/* RFID scanner nodes */}
            {rfidNodes.map((node, i) => (
              <g key={node.label}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="14"
                  fill="none"
                  stroke="rgba(204,0,0,0.3)"
                  strokeWidth="1"
                >
                  <animate
                    attributeName="r"
                    values="8;20;8"
                    dur="2.5s"
                    begin={`${i * 0.6}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.6;0;0.6"
                    dur="2.5s"
                    begin={`${i * 0.6}s`}
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="5"
                  fill="rgba(204,0,0,0.15)"
                  stroke="#cc0000"
                  strokeWidth="1.5"
                />
                <text
                  x={node.x}
                  y={node.y + 22}
                  textAnchor="middle"
                  fontSize="8"
                  fill="rgba(124,0,0,0.6)"
                  fontFamily="monospace"
                >
                  {node.label}
                </text>
              </g>
            ))}

            {/* Movement paths (subtle) */}
            {trackers.map((t) => (
              <path
                key={`path-${t.id}`}
                d={t.path}
                fill="none"
                stroke="rgba(204,0,0,0.08)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            ))}

            {/* Tracked entities */}
            {trackers.map((t) => (
              <g key={t.id} filter="url(#glow)">
                <circle r="7" fill={t.color} opacity="0.9">
                  <animateMotion
                    dur={t.dur}
                    repeatCount="indefinite"
                    begin={t.delay}
                    path={t.path}
                  />
                </circle>
                <circle r="12" fill="none" stroke={t.color} strokeWidth="1" opacity="0.4">
                  <animateMotion
                    dur={t.dur}
                    repeatCount="indefinite"
                    begin={t.delay}
                    path={t.path}
                  />
                  <animate
                    attributeName="r"
                    values="7;14;7"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.5;0;0.5"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            ))}
          </svg>

          {/* Live event feed */}
          <div className="mt-3 space-y-1.5 border-t border-red/10 pt-3">
            {liveEvents.map((event, i) => (
              <div
                key={event.text}
                className="flex items-center gap-3 rounded-lg bg-peach-light/60 px-3 py-2"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    event.type === "clinician"
                      ? "bg-red"
                      : event.type === "equipment"
                        ? "bg-red-dark"
                        : event.type === "patient"
                          ? "bg-orange-500"
                          : "bg-red/40"
                  }`}
                />
                <span className="flex-1 text-xs text-text-muted">
                  {event.text}
                </span>
                <span className="font-mono text-[10px] text-red/50">
                  {event.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red" />
          Clinician
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          Patient
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-dark" />
          Equipment
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-red/40 bg-red/10" />
          RFID node
        </span>
      </div>
    </div>
  );
}
