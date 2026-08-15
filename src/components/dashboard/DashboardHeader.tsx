"use client";

import Link from "next/link";
import Image from "next/image";
import type { ViewerRole } from "@/lib/dashboard/types";

const roles: { id: ViewerRole; label: string }[] = [
  { id: "nurse", label: "Nurse" },
  { id: "charge", label: "Charge" },
  { id: "ops", label: "Ops" },
];

interface Props {
  hospital: string;
  ward: string;
  floor: string;
  role: ViewerRole;
  onRoleChange: (role: ViewerRole) => void;
  clock: string;
  onRemap?: () => void;
}

export function DashboardHeader({
  hospital,
  ward,
  floor,
  role,
  onRoleChange,
  clock,
  onRemap,
}: Props) {
  return (
    <header className="shrink-0 border-b border-red/10 bg-white/90 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/icon.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="font-display text-sm font-semibold tracking-[0.18em] text-red">
              DOQTO
            </span>
          </Link>
          <span className="hidden h-5 w-px bg-red/15 sm:block" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-text">{ward}</p>
            <p className="text-xs text-text-muted">
              {hospital} · {floor}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold tracking-wider text-emerald-800 uppercase">
              Live
            </span>
          </div>

          <p className="hidden font-display text-sm tabular-nums text-text-muted md:block">
            {clock}
          </p>

          {onRemap && (
            <button
              type="button"
              onClick={onRemap}
              className="hidden rounded-xl border border-red/15 px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:border-red hover:text-red sm:inline-flex"
            >
              Edit layout
            </button>
          )}

          <div
            className="flex rounded-xl border border-red/15 bg-peach-light p-0.5"
            role="group"
            aria-label="Viewer role"
          >
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onRoleChange(r.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  role === r.id
                    ? "bg-red text-white"
                    : "text-text-muted hover:text-red"
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
