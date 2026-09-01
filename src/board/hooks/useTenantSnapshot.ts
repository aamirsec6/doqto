"use client";

import { useCallback, useEffect, useState } from "react";

export interface TenantLayoutRow {
  id: string;
  wardName: string;
  wardType: string;
  unitKind: string;
  floorLabel: string;
  floor?: { id: string; label: string };
}

export interface TenantSnapshot {
  tenant: { id: string; name: string; inviteCode?: string } | null;
  layouts: TenantLayoutRow[];
}

export function useTenantSnapshot() {
  const [snapshot, setSnapshot] = useState<TenantSnapshot | null>(null);
  const [activeLayoutId, setActiveLayoutId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/snapshot", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not load hospital data");
      const data = await res.json();
      const layouts: TenantLayoutRow[] = (data.layouts ?? []).map(
        (l: {
          id: string;
          wardName: string;
          wardType: string;
          unitKind?: string;
          floorLabel: string;
          floor?: { id: string; label: string };
        }) => ({
          id: l.id,
          wardName: l.wardName,
          wardType: l.wardType,
          unitKind: l.unitKind ?? l.wardType,
          floorLabel: l.floorLabel,
          floor: l.floor,
        }),
      );
      setSnapshot({
        tenant: data.tenant ?? null,
        layouts,
      });
      setActiveLayoutId((prev) => {
        if (prev && layouts.some((x) => x.id === prev)) return prev;
        return layouts[0]?.id;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    snapshot,
    activeLayoutId,
    setActiveLayoutId,
    loading,
    error,
    reload,
  };
}
