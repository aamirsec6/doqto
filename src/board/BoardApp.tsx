"use client";

import { OnboardingFlow } from "@/board/components/OnboardingFlow";
import { BoardShell } from "@/board/components/BoardShell";
import { useTenantSnapshot } from "@/board/hooks/useTenantSnapshot";

export function BoardApp() {
  const {
    snapshot,
    activeLayoutId,
    setActiveLayoutId,
    loading,
    error,
    reload,
  } = useTenantSnapshot();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f4f6f9]">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f4f6f9]">
        <p className="text-sm text-red">{error}</p>
      </div>
    );
  }

  if (!snapshot?.layouts.length || !activeLayoutId) {
    return <OnboardingFlow onComplete={() => void reload()} />;
  }

  return (
    <BoardShell
      hospitalName={snapshot.tenant?.name ?? "Oncology"}
      layouts={snapshot.layouts}
      layoutId={activeLayoutId}
      onLayoutChange={setActiveLayoutId}
    />
  );
}
