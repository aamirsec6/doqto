"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WardSnapshot } from "@/lib/dashboard/types";

export type BoardConnection = "connecting" | "live" | "polling" | "offline";

export function useUnitBoard(layoutId: string | undefined) {
  const [ward, setWard] = useState<WardSnapshot | null>(null);
  const [revision, setRevision] = useState(0);
  const [connection, setConnection] = useState<BoardConnection>("connecting");
  const [error, setError] = useState<string | null>(null);
  const revisionRef = useRef(0);

  const applyBoard = useCallback((next: WardSnapshot, rev: number) => {
    if (rev < revisionRef.current) return;
    revisionRef.current = rev;
    setRevision(rev);
    setWard(next);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!layoutId) return;
    try {
      const res = await fetch(`/api/units/${layoutId}/board`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not load board");
      const data = await res.json();
      applyBoard(data.ward as WardSnapshot, data.revision as number);
      setConnection((c) => (c === "offline" ? "polling" : c));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setConnection("offline");
    }
  }, [layoutId, applyBoard]);

  useEffect(() => {
    if (!layoutId) return;
    revisionRef.current = 0;
    setWard(null);
    setConnection("connecting");
    void refresh();
  }, [layoutId, refresh]);

  useEffect(() => {
    if (!layoutId) return;
    let es: EventSource | null = null;
    let closed = false;

    es = new EventSource(`/api/units/${layoutId}/stream`, {
      withCredentials: true,
    });

    es.addEventListener("board", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          revision: number;
          ward: WardSnapshot;
        };
        applyBoard(data.ward, data.revision);
        setConnection("live");
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("ready", () => setConnection("live"));

    es.onerror = () => {
      if (closed) return;
      setConnection("polling");
      es?.close();
    };

    const poll = setInterval(() => void refresh(), 5000);

    return () => {
      closed = true;
      es?.close();
      clearInterval(poll);
    };
  }, [layoutId, applyBoard, refresh]);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      if (!layoutId) return;
      const res = await fetch(`/api/units/${layoutId}/board`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Update failed");
      }
      const data = await res.json();
      applyBoard(data.ward as WardSnapshot, data.revision as number);
    },
    [layoutId, applyBoard],
  );

  return { ward, revision, connection, error, refresh, patch };
}
