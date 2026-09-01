"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUnitBoard } from "@/board/hooks/useUnitBoard";
import type { TenantLayoutRow } from "@/board/hooks/useTenantSnapshot";
import { AlertBar } from "@/board/components/AlertBar";
import { BedGrid } from "@/board/components/BedGrid";
import { StaffList } from "@/board/components/StaffList";
import { UnitTabs } from "@/board/components/UnitTabs";

interface Props {
  hospitalName: string;
  layouts: TenantLayoutRow[];
  layoutId: string;
  onLayoutChange: (id: string) => void;
}

export function BoardShell({
  hospitalName,
  layouts,
  layoutId,
  onLayoutChange,
}: Props) {
  const { ward, connection, error, refresh, patch } = useUnitBoard(layoutId);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const raiseCodeBlue = async () => {
    if (!ward) return;
    const room =
      ward.rooms.find((r) => r.kind === "clinical") ?? ward.rooms[0];
    if (!room) return;
    const res = await fetch("/api/tenant/incidents", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "raise",
        code: "code_blue",
        roomKey: room.id,
        roomLabel: room.label,
        sourceWard: ward.ward,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Could not raise alert");
    }
    await refresh();
  };

  if (!ward) {
    return (
      <div className="ops-shell flex min-h-dvh items-center justify-center">
        <p className="text-sm text-slate-500">Loading unit board…</p>
      </div>
    );
  }

  return (
    <div className="ops-shell flex min-h-dvh flex-col bg-[#f4f6f9]">
      <header className="border-b border-slate-200 bg-white px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/icon.png" alt="" width={24} height={24} />
              <span className="font-display text-[10px] font-semibold tracking-[0.18em] text-red">
                DOQTO
              </span>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {hospitalName}
              </h1>
              <p className="text-xs text-slate-500">
                {ward.ward} · {ward.floor}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 ${
                connection === "live"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connection === "live" ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
              {connection === "live" ? "Live" : connection}
            </span>
            <span className="tabular-nums">{clock}</span>
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-6xl">
          <UnitTabs
            layouts={layouts}
            activeId={layoutId}
            onChange={onLayoutChange}
          />
        </div>
      </header>

      {error && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {error}{" "}
          <button
            type="button"
            onClick={() => void refresh()}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <BedGrid
              ward={ward}
              onUpdate={(bedId, status, initials) =>
                void patch({ action: "bed", bedId, status, patientInitials: initials })
              }
            />
          </div>
          <div className="lg:col-span-4">
            <StaffList
              ward={ward}
              onUpdate={(staffId, status) =>
                void patch({ action: "staff", staffId, status })
              }
            />
          </div>
        </div>
        <AlertBar
          ward={ward}
          onRaiseCodeBlue={raiseCodeBlue}
          onRefresh={() => void refresh()}
        />
      </main>
    </div>
  );
}
