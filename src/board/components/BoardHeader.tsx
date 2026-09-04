"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useBoard } from "@/board/context/BoardProvider";
import { UnitTabs } from "@/board/components/UnitTabs";

export function BoardHeader() {
  const {
    snapshot,
    ward,
    activeLayoutId,
    connection,
    saving,
    setActiveLayoutId,
  } = useBoard();
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

  if (!ward || !snapshot || !activeLayoutId) return null;

  return (
    <header className="border-b border-[var(--board-border)] bg-[var(--board-surface)] px-4 py-3 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.png" alt="" width={24} height={24} />
            <span className="font-display text-[10px] font-semibold tracking-[0.18em] text-red">
              DOQTO
            </span>
          </Link>
          <div>
            <h1 className="font-display text-lg font-semibold text-[var(--board-text)]">
              {snapshot.tenant?.name ?? "Oncology"}
            </h1>
            <p className="text-xs text-[var(--board-muted)]">
              {ward.ward} · {ward.floor}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--board-muted)]">
          {saving && (
            <span className="rounded-full bg-slate-100 px-2 py-1">Saving…</span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 ${
              connection === "live"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connection === "live"
                  ? "animate-pulse bg-emerald-500"
                  : "bg-slate-400"
              }`}
            />
            {connection === "live" ? "Live" : connection}
          </span>
          <span className="tabular-nums">{clock}</span>
        </div>
      </div>
      <div className="mx-auto mt-3 max-w-6xl">
        <UnitTabs
          layouts={snapshot.layouts}
          activeId={activeLayoutId}
          onChange={setActiveLayoutId}
        />
      </div>
    </header>
  );
}
