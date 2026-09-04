"use client";

import { useBoard } from "@/board/context/BoardProvider";
import { AlertBar } from "@/board/components/AlertBar";
import { BedGrid } from "@/board/components/BedGrid";
import { BoardHeader } from "@/board/components/BoardHeader";
import { KpiBar } from "@/board/components/KpiBar";
import { StaffList } from "@/board/components/StaffList";

export function BoardShell() {
  const { ward, error, reload, patchBed, patchStaff, raiseCodeBlue } =
    useBoard();

  if (!ward) {
    return (
      <div className="board-shell flex min-h-dvh items-center justify-center">
        <p className="text-sm text-[var(--board-muted)]">Loading unit board…</p>
      </div>
    );
  }

  return (
    <div className="board-shell flex min-h-dvh flex-col">
      <BoardHeader />

      {error && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {error}{" "}
          <button
            type="button"
            onClick={() => void reload()}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 md:p-6">
        <KpiBar />
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <BedGrid ward={ward} onUpdate={patchBed} />
          </div>
          <div className="lg:col-span-4">
            <StaffList ward={ward} onUpdate={patchStaff} />
          </div>
        </div>
        <AlertBar
          ward={ward}
          onRaiseCodeBlue={raiseCodeBlue}
          onRefresh={() => void reload()}
        />
      </main>
    </div>
  );
}
