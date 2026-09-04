import type {
  BoardPatchInput,
  BoardResponse,
  RaiseIncidentInput,
  SaveCampusInput,
  TenantSnapshot,
} from "./types";

export class BoardApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BoardApiError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: string }).error ||
      `Request failed (${res.status})`;
    throw new BoardApiError(message, res.status);
  }
  return data as T;
}

export const boardApi = {
  getTenantSnapshot(): Promise<TenantSnapshot> {
    return request<{
      tenant?: TenantSnapshot["tenant"];
      layouts?: Array<{
        id: string;
        wardName: string;
        wardType: string;
        unitKind?: string;
        floorLabel: string;
        floor?: { id: string; label: string };
      }>;
    }>("/api/tenant/snapshot").then((data) => ({
      tenant: data.tenant ?? null,
      layouts: (data.layouts ?? []).map((l) => ({
          id: l.id,
          wardName: l.wardName,
          wardType: l.wardType,
        unitKind: l.unitKind ?? l.wardType,
        floorLabel: l.floorLabel,
        floor: l.floor,
      })),
    }));
  },

  saveCampus(input: SaveCampusInput): Promise<unknown> {
    return request("/api/tenant/snapshot", {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  getBoard(layoutId: string): Promise<BoardResponse> {
    return request(`/api/units/${layoutId}/board`);
  },

  patchBoard(layoutId: string, patch: BoardPatchInput): Promise<BoardResponse> {
    return request(`/api/units/${layoutId}/board`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  raiseIncident(input: RaiseIncidentInput): Promise<unknown> {
    return request("/api/tenant/incidents", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
