"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  clearTrainingEvents,
  computeBenchmarks,
  downloadText,
  exportTrainingCsv,
  exportTrainingJsonl,
  loadTrainingEvents,
  trainingStats,
  type BenchmarkStatus,
  type TrainingEvent,
} from "@/lib/dashboard/training";
import { seedAdminDemo, seedAdminDemoForce } from "@/lib/dashboard/seed";

const ADMIN_SESSION_KEY = "doqto.admin.unlocked";
const ADMIN_PASS =
  process.env.NEXT_PUBLIC_DOQTO_ADMIN_PASS?.trim() || "doqto-internal";

export function AdminConsole() {
  const [unlocked, setUnlocked] = useState(false);
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [query, setQuery] = useState("");
  const [seedNote, setSeedNote] = useState("");

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(ADMIN_SESSION_KEY) === "1");
  }, []);

  const refresh = () => setEvents(loadTrainingEvents());

  useEffect(() => {
    if (!unlocked) return;
    const existing = loadTrainingEvents();
    if (existing.length === 0) {
      const { events: n } = seedAdminDemo();
      setSeedNote(`Loaded ${n} sample pilot events for City Care · ICU Ward 2.`);
    }
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("doqto-training-updated", onUpdate);
    window.addEventListener("doqto-ops-updated", onUpdate);
    return () => {
      window.removeEventListener("doqto-training-updated", onUpdate);
      window.removeEventListener("doqto-ops-updated", onUpdate);
    };
  }, [unlocked]);

  const stats = useMemo(() => trainingStats(events), [events]);
  const benchmarks = useMemo(() => computeBenchmarks(events), [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...events].reverse().slice(0, 100);
    return [...events]
      .reverse()
      .filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.entityLabel.toLowerCase().includes(q) ||
          e.ward.toLowerCase().includes(q) ||
          e.hospital.toLowerCase().includes(q) ||
          e.actorRole.toLowerCase().includes(q),
      )
      .slice(0, 100);
  }, [events, query]);

  if (!unlocked) {
    return (
      <div className="ops-shell flex min-h-dvh items-center justify-center px-6">
        <form
          className="ops-panel w-full max-w-md p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (pass === ADMIN_PASS) {
              sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
              setUnlocked(true);
              setError("");
              return;
            }
            setError("Incorrect passcode.");
          }}
        >
          <div className="flex items-center gap-2">
            <Image src="/icon.png" alt="" width={28} height={28} />
            <p className="font-display text-sm font-semibold tracking-[0.16em] text-[#f04343]">
              DOQTO INTERNAL
            </p>
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold text-[var(--ops-text)]">
            Admin console
          </h1>
          <p className="mt-2 text-sm text-[var(--ops-muted)]">
            Benchmarks and event intelligence. Not linked from the hospital
            product UI.
          </p>
          <label className="mt-6 block">
            <span className="text-[11px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
              Passcode
            </span>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-[var(--ops-text)] outline-none focus:border-sky-400/40"
              placeholder="Enter admin passcode"
              autoFocus
            />
          </label>
          {error && (
            <p className="mt-3 text-sm text-[#f04343]">{error}</p>
          )}
          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-sky-500/20 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/30"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="ops-shell min-h-dvh">
      <header className="border-b border-[var(--ops-border)] bg-[#0d1524]/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <Image src="/icon.png" alt="" width={28} height={28} />
            <div>
              <p className="font-display text-sm font-semibold text-[var(--ops-text)]">
                Admin · benchmarks & intelligence
              </p>
              <p className="text-[11px] text-[var(--ops-muted)]">
                Internal only · hospitals never see this surface
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)] hover:text-sky-300"
            >
              Ward board
            </Link>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem(ADMIN_SESSION_KEY);
                setUnlocked(false);
              }}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)] hover:text-[#f04343]"
            >
              Lock
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:p-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Events" value={String(stats.total)} />
          <Kpi label="Sessions" value={String(stats.sessions)} />
          <Kpi
            label="Benchmark score"
            value={`${benchmarks.score}`}
            suffix="/100"
          />
          <Kpi
            label="Avg ack"
            value={
              stats.avgAckLatencySec == null
                ? "—"
                : `${stats.avgAckLatencySec}`
            }
            suffix={stats.avgAckLatencySec == null ? "" : "s"}
          />
        </section>

        <section className="ops-panel p-4 md:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="ops-panel-title">Pilot benchmarks</p>
              <p className="mt-1 text-[12px] text-[var(--ops-muted)]">
                {benchmarks.hospitals.length
                  ? `${benchmarks.hospitals.join(", ")} · ${benchmarks.wards.join(", ")}`
                  : "No hospital data yet — run the ward board first"}
              </p>
              {seedNote ? (
                <p className="mt-1 text-[11px] text-sky-300">{seedNote}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const { events: n } = seedAdminDemoForce();
                  setSeedNote(`Reloaded ${n} sample pilot events.`);
                  refresh();
                }}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)] hover:border-sky-400/40 hover:text-sky-300"
              >
                Load sample pilot
              </button>
              <ScoreBadge score={benchmarks.score} />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[12px]">
              <thead className="text-[var(--ops-muted)]">
                <tr className="border-b border-white/5">
                  <th className="pb-2 pr-3 font-medium">Benchmark</th>
                  <th className="pb-2 pr-3 font-medium">Metric</th>
                  <th className="pb-2 pr-3 font-medium">Target</th>
                  <th className="pb-2 pr-3 font-medium">Actual</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.rows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 last:border-0">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-[var(--ops-text)]">
                        {row.label}
                      </p>
                      <p className="text-[10px] text-[var(--ops-muted)]">
                        {row.detail}
                      </p>
                    </td>
                    <td className="py-3 pr-3 text-[var(--ops-muted)]">
                      {row.metric}
                    </td>
                    <td className="py-3 pr-3 text-[var(--ops-muted)]">
                      {row.target}
                    </td>
                    <td className="py-3 pr-3 font-semibold tabular-nums text-[var(--ops-text)]">
                      {row.actual}
                    </td>
                    <td className="py-3">
                      <StatusPill status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ops-panel p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="ops-panel-title">Ops event feed</p>
              <p className="mt-1 text-[12px] text-[var(--ops-muted)]">
                Silent board activity · export for analysis (never shown to sites)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border border-sky-400/30 bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-sky-300"
                onClick={() =>
                  downloadText(
                    `doqto-ops-${Date.now()}.jsonl`,
                    exportTrainingJsonl(events),
                    "application/x-ndjson",
                  )
                }
              >
                Export JSONL
              </button>
              <button
                type="button"
                className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300"
                onClick={() =>
                  downloadText(
                    `doqto-ops-${Date.now()}.csv`,
                    exportTrainingCsv(events),
                    "text/csv",
                  )
                }
              >
                Export CSV
              </button>
              <button
                type="button"
                className="rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)] hover:text-[#f04343]"
                onClick={() => {
                  if (!window.confirm("Clear all stored events on this device?")) {
                    return;
                  }
                  clearTrainingEvents();
                  refresh();
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by action, ward, label…"
            className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-[var(--ops-text)] outline-none focus:border-sky-400/40"
          />

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-[11px]">
              <thead className="text-[var(--ops-muted)]">
                <tr className="border-b border-white/5">
                  <th className="pb-2 pr-2 font-medium">Time</th>
                  <th className="pb-2 pr-2 font-medium">Action</th>
                  <th className="pb-2 pr-2 font-medium">Entity</th>
                  <th className="pb-2 pr-2 font-medium">Role</th>
                  <th className="pb-2 pr-2 font-medium">Ward</th>
                  <th className="pb-2 font-medium">Delta</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-2 tabular-nums text-[var(--ops-muted)]">
                      {new Date(e.ts).toLocaleString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                    <td className="py-2 pr-2 font-medium text-sky-300">
                      {e.action}
                    </td>
                    <td className="py-2 pr-2 text-[var(--ops-text)]">
                      {e.entityLabel}
                    </td>
                    <td className="py-2 pr-2 text-[var(--ops-muted)]">
                      {e.actorRole}
                    </td>
                    <td className="py-2 pr-2 text-[var(--ops-muted)]">
                      {e.ward}
                    </td>
                    <td className="py-2 text-[var(--ops-muted)]">
                      {formatDelta(e.before, e.after)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-[var(--ops-muted)]"
                    >
                      No events yet. Use the ward board to generate activity.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Kpi({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="ops-panel px-4 py-3">
      <p className="text-[10px] tracking-wider text-[var(--ops-muted)] uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ops-text)]">
        {value}
        {suffix ? (
          <span className="ml-1 text-sm font-medium text-[var(--ops-muted)]">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 80
      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
      : score >= 50
        ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
        : "border-red-400/40 bg-red-500/15 text-[#f04343]";
  return (
    <div className={`rounded-full border px-3 py-1 text-[11px] font-bold ${tone}`}>
      SCORE {score}
    </div>
  );
}

function StatusPill({ status }: { status: BenchmarkStatus }) {
  const map = {
    pass: "bg-emerald-500/15 text-emerald-300",
    watch: "bg-amber-500/15 text-amber-300",
    fail: "bg-red-500/15 text-[#f04343]",
    na: "bg-white/5 text-[var(--ops-muted)]",
  } as const;
  return (
    <span
      className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${map[status]}`}
    >
      {status}
    </span>
  );
}

function formatDelta(
  before: TrainingEvent["before"],
  after: TrainingEvent["after"],
): string {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  if (!keys.length) return "—";
  return keys
    .slice(0, 3)
    .map((k) => `${k}: ${String(before[k] ?? "∅")}→${String(after[k] ?? "∅")}`)
    .join(" · ");
}
