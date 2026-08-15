"use client";

import Image from "next/image";
import Link from "next/link";
import type { ViewerRole } from "@/lib/dashboard/types";

const roles: { id: ViewerRole; label: string; hint: string }[] = [
  { id: "nurse", label: "Nurse", hint: "Floor view" },
  { id: "charge", label: "Charge", hint: "Full board" },
  { id: "ops", label: "Ops", hint: "Admin" },
];

interface Props {
  hospital: string;
  ward: string;
  floor: string;
  role: ViewerRole;
  onRoleChange: (role: ViewerRole) => void;
  clock: string;
  dateLabel: string;
  trackingLive: boolean;
  lastUpdateLabel: string;
  onRemap?: () => void;
}

export function OpsHeader({
  hospital,
  ward,
  floor,
  role,
  onRoleChange,
  clock,
  dateLabel,
  trackingLive,
  lastUpdateLabel,
  onRemap,
}: Props) {
  return (
    <header className="shrink-0 border-b border-[var(--ops-border)] bg-[#0d1524]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image src="/icon.png" alt="" width={28} height={28} className="h-7 w-7" />
            <span className="font-display text-xs font-semibold tracking-[0.18em] text-[#f04343]">
              DOQTO
            </span>
          </Link>
          <span className="hidden h-5 w-px bg-white/10 sm:block" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-wide text-[var(--ops-text)] md:text-base">
              {ward}
            </h1>
            <p className="truncate text-[11px] text-[var(--ops-muted)]">
              {hospital} · {floor}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div
            className={`flex items-center gap-2 border px-3 py-1.5 ${
              trackingLive
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                trackingLive
                  ? "ops-live-dot bg-emerald-400"
                  : "bg-[var(--ops-muted)]"
              }`}
            />
            <div>
              <p
                className={`text-[10px] font-bold tracking-[0.12em] uppercase ${
                  trackingLive ? "text-emerald-300" : "text-[var(--ops-muted)]"
                }`}
              >
                {trackingLive ? "Realtime tracking" : "Board live"}
              </p>
              <p className="text-[9px] text-[var(--ops-muted)]">
                Updated {lastUpdateLabel}
              </p>
            </div>
          </div>

          <div className="hidden text-right sm:block">
            <p className="font-display text-sm tabular-nums text-[var(--ops-text)]">
              {clock}
            </p>
            <p className="text-[10px] tracking-wider text-[var(--ops-muted)] uppercase">
              {dateLabel}
            </p>
          </div>

          {onRemap && (
            <button
              type="button"
              onClick={onRemap}
              className="border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)] transition hover:border-white/25 hover:text-[var(--ops-text)]"
            >
              Edit setup
            </button>
          )}

          <Link
            href="/ops"
            className="border border-sky-700/40 bg-sky-950/30 px-2.5 py-1.5 text-[11px] font-semibold text-sky-100 transition hover:bg-sky-900/40"
          >
            Hospital ops
          </Link>

          <Link
            href="/staff"
            className="border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)] transition hover:border-white/25 hover:text-[var(--ops-text)]"
          >
            My board
          </Link>

          <Link
            href="/audit"
            className="border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)] transition hover:border-white/25 hover:text-[var(--ops-text)]"
          >
            Audit
          </Link>

          <div className="flex border border-white/10 bg-black/20 p-0.5">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                title={r.hint}
                onClick={() => onRoleChange(r.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold transition ${
                  role === r.id
                    ? "bg-white/15 text-[var(--ops-text)]"
                    : "text-[var(--ops-muted)] hover:text-[var(--ops-text)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
