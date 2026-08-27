"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ViewerRole } from "@/lib/dashboard/types";

const roles: { id: ViewerRole; label: string }[] = [
  { id: "nurse", label: "Nurse" },
  { id: "charge", label: "Charge" },
  { id: "ops", label: "Ops" },
];

interface UnitOption {
  floorId: string;
  unitId: string;
  label: string;
  active: boolean;
}

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
  onRaiseEmergency?: () => void;
  unitOptions?: UnitOption[];
  onUnitChange?: (floorId: string, unitId: string) => void;
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
  onRaiseEmergency,
  unitOptions,
  onUnitChange,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activeUnit =
    unitOptions?.find((o) => o.active) ?? unitOptions?.[0];

  return (
    <header className="shrink-0 border-b border-[var(--ops-border)] bg-[#0a101c]">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-5">
        {/* Left: brand + ward identity */}
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image src="/icon.png" alt="" width={26} height={26} className="h-6 w-6" />
            <span className="font-display text-[10px] font-semibold tracking-[0.2em] text-[#f04343]">
              DOQTO
            </span>
          </Link>
          <span className="hidden h-6 w-px bg-white/10 sm:block" />
          <div className="min-w-0">
            {unitOptions && unitOptions.length > 1 && onUnitChange ? (
              <select
                value={activeUnit?.unitId ?? ""}
                onChange={(e) => {
                  const opt = unitOptions.find((o) => o.unitId === e.target.value);
                  if (opt) onUnitChange(opt.floorId, opt.unitId);
                }}
                className="max-w-[220px] truncate bg-transparent font-display text-lg font-semibold text-[var(--ops-text)] outline-none md:text-xl"
              >
                {unitOptions.map((opt) => (
                  <option key={opt.unitId} value={opt.unitId}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <h1 className="truncate font-display text-lg font-semibold text-[var(--ops-text)] md:text-xl">
                {ward}
              </h1>
            )}
            <p className="truncate text-[11px] text-[var(--ops-muted)]">
              {hospital} · {floor}
            </p>
          </div>
        </div>

        {/* Right: status + actions */}
        <div className="flex shrink-0 items-center gap-2">
          <div
            className={`hidden items-center gap-1.5 px-2.5 py-1 sm:flex ${
              trackingLive
                ? "border border-emerald-500/30 bg-emerald-500/10"
                : "border border-white/8 bg-white/5"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                trackingLive ? "ops-live-dot bg-emerald-400" : "bg-emerald-500/60"
              }`}
            />
            <span className="text-[10px] font-medium text-[var(--ops-muted)]">
              {trackingLive ? "Tracking" : "Live"} · {lastUpdateLabel}
            </span>
          </div>

          <div className="hidden text-right sm:block">
            <p className="font-display text-sm tabular-nums text-[var(--ops-text)]">
              {clock}
            </p>
            <p className="text-[9px] text-[var(--ops-muted)]">{dateLabel}</p>
          </div>

          {onRaiseEmergency && (
            <button
              type="button"
              onClick={onRaiseEmergency}
              className="border border-red-700/60 bg-red-950/50 px-3 py-1.5 text-[11px] font-bold tracking-wide text-red-200 transition hover:bg-red-900/60"
            >
              Code Blue
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)] transition hover:border-white/25 hover:text-[var(--ops-text)]"
              aria-label="More options"
            >
              ···
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 z-50 mt-1 min-w-[160px] border border-white/10 bg-[#0d1524] py-1 shadow-xl">
                  {onRemap && (
                    <MenuItem onClick={() => { onRemap(); setMenuOpen(false); }}>
                      Edit setup
                    </MenuItem>
                  )}
                  <MenuLink href="/ops">Hospital ops</MenuLink>
                  <MenuLink href="/staff">My board</MenuLink>
                  <MenuLink href="/audit">Audit</MenuLink>
                </div>
              </>
            )}
          </div>

          <div className="hidden border border-white/10 bg-black/20 p-0.5 md:flex">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onRoleChange(r.id)}
                className={`px-2 py-0.5 text-[10px] font-semibold transition ${
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

function MenuItem({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-2 text-left text-[11px] font-medium text-[var(--ops-muted)] transition hover:bg-white/5 hover:text-[var(--ops-text)]"
    >
      {children}
    </button>
  );
}

function MenuLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 text-[11px] font-medium text-[var(--ops-muted)] transition hover:bg-white/5 hover:text-[var(--ops-text)]"
    >
      {children}
    </Link>
  );
}
