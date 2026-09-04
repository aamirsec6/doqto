"use client";

import { BoardProvider, useBoard } from "@/board/context/BoardProvider";
import { BoardShell } from "@/board/components/BoardShell";
import { OnboardingFlow } from "@/board/components/OnboardingFlow";

function BoardRouter() {
  const { snapshot, loading, error, reload } = useBoard();

  if (loading && !snapshot) {
    return (
      <div className="board-shell flex min-h-dvh items-center justify-center">
        <p className="text-sm text-[var(--board-muted)]">Loading hospital…</p>
      </div>
    );
  }

  if (error && !snapshot?.layouts.length) {
    return (
      <div className="board-shell flex min-h-dvh items-center justify-center px-4">
        <div className="board-card max-w-sm p-6 text-center">
          <p className="text-sm text-red">{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-4 rounded-lg bg-red px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot?.layouts.length) {
    return <OnboardingFlow onComplete={() => void reload()} />;
  }

  return <BoardShell />;
}

export function BoardApp() {
  return (
    <BoardProvider>
      <BoardRouter />
    </BoardProvider>
  );
}
