"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { boardApi, BoardApiError } from "@/board/api/client";
import type {
  BoardPatchInput,
  TenantLayoutRow,
  TenantSnapshot,
} from "@/board/api/types";
import type { BedStatus, StaffStatus, WardSnapshot } from "@/lib/dashboard/types";
import { wardSummary } from "@/lib/dashboard/layout";

export type ConnectionState = "connecting" | "live" | "polling" | "offline";

interface BoardContextValue {
  snapshot: TenantSnapshot | null;
  ward: WardSnapshot | null;
  activeLayoutId: string | undefined;
  connection: ConnectionState;
  loading: boolean;
  saving: boolean;
  error: string | null;
  summary: ReturnType<typeof wardSummary> | null;
  setActiveLayoutId: (id: string) => void;
  reload: () => Promise<void>;
  patchBed: (
    bedId: string,
    status: BedStatus,
    patientInitials?: string,
  ) => Promise<void>;
  patchStaff: (staffId: string, status: StaffStatus) => Promise<void>;
  raiseCodeBlue: () => Promise<void>;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<TenantSnapshot | null>(null);
  const [ward, setWard] = useState<WardSnapshot | null>(null);
  const [activeLayoutId, setActiveLayoutId] = useState<string | undefined>();
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revisionRef = useRef(0);

  const applyBoard = useCallback((next: WardSnapshot, rev: number) => {
    if (rev < revisionRef.current) return;
    revisionRef.current = rev;
    setWard(next);
    setError(null);
  }, []);

  const loadSnapshot = useCallback(async () => {
    const data = await boardApi.getTenantSnapshot();
    setSnapshot(data);
    setActiveLayoutId((prev) => {
      if (prev && data.layouts.some((l) => l.id === prev)) return prev;
      return data.layouts[0]?.id;
    });
    return data;
  }, []);

  const loadBoard = useCallback(
    async (layoutId: string) => {
      const data = await boardApi.getBoard(layoutId);
      applyBoard(data.ward, data.revision);
      setConnection((c) => (c === "offline" ? "polling" : c));
    },
    [applyBoard],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadSnapshot();
      if (data.layouts[0]?.id) {
        revisionRef.current = 0;
        await loadBoard(data.layouts[0].id);
      } else {
        setWard(null);
      }
    } catch (e) {
      setError(
        e instanceof BoardApiError ? e.message : "Could not load board",
      );
      setConnection("offline");
    } finally {
      setLoading(false);
    }
  }, [loadSnapshot, loadBoard]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!activeLayoutId) return;
    revisionRef.current = 0;
    setWard(null);
    setConnection("connecting");
    void loadBoard(activeLayoutId).catch((e) => {
      setError(e instanceof BoardApiError ? e.message : "Board load failed");
      setConnection("offline");
    });
  }, [activeLayoutId, loadBoard]);

  useEffect(() => {
    if (!activeLayoutId) return;
    let closed = false;
    const es = new EventSource(`/api/units/${activeLayoutId}/stream`, {
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
      es.close();
    };

    const poll = setInterval(() => {
      void loadBoard(activeLayoutId).catch(() => setConnection("offline"));
    }, 5000);

    return () => {
      closed = true;
      es.close();
      clearInterval(poll);
    };
  }, [activeLayoutId, applyBoard, loadBoard]);

  const patch = useCallback(
    async (body: BoardPatchInput) => {
      if (!activeLayoutId) return;
      setSaving(true);
      try {
        const data = await boardApi.patchBoard(activeLayoutId, body);
        applyBoard(data.ward, data.revision);
      } catch (e) {
        setError(e instanceof BoardApiError ? e.message : "Update failed");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [activeLayoutId, applyBoard],
  );

  const patchBed = useCallback(
    async (bedId: string, status: BedStatus, patientInitials?: string) => {
      await patch({ action: "bed", bedId, status, patientInitials });
    },
    [patch],
  );

  const patchStaff = useCallback(
    async (staffId: string, status: StaffStatus) => {
      await patch({ action: "staff", staffId, status });
    },
    [patch],
  );

  const raiseCodeBlue = useCallback(async () => {
    if (!ward) return;
    const room =
      ward.rooms.find((r) => r.kind === "clinical") ?? ward.rooms[0];
    if (!room) return;
    setSaving(true);
    try {
      await boardApi.raiseIncident({
        action: "raise",
        code: "code_blue",
        roomKey: room.id,
        roomLabel: room.label,
        sourceWard: ward.ward,
      });
      if (activeLayoutId) await loadBoard(activeLayoutId);
    } catch (e) {
      setError(e instanceof BoardApiError ? e.message : "Could not raise alert");
      throw e;
    } finally {
      setSaving(false);
    }
  }, [ward, activeLayoutId, loadBoard]);

  const summary = ward ? wardSummary(ward) : null;

  return (
    <BoardContext.Provider
      value={{
        snapshot,
        ward,
        activeLayoutId,
        connection,
        loading,
        saving,
        error,
        summary,
        setActiveLayoutId,
        reload,
        patchBed,
        patchStaff,
        raiseCodeBlue,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used within BoardProvider");
  return ctx;
}

export type { TenantLayoutRow };
