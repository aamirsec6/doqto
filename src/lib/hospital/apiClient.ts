/** Best-effort dual-write of clinical actions to tenant Postgres APIs. */

export async function apiRaiseIncident(input: {
  code: string;
  roomKey: string;
  roomLabel?: string;
  sourceWard?: string;
  title?: string;
  detail?: string;
}) {
  try {
    const res = await fetch("/api/tenant/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "raise", ...input }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function apiAckIncident(input: {
  incidentId: string;
  staffId?: string;
  staffName?: string;
}) {
  try {
    const res = await fetch("/api/tenant/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "acknowledge", ...input }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function apiResolveIncident(input: {
  incidentId: string;
  resolvedBy?: string;
}) {
  try {
    const res = await fetch("/api/tenant/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", ...input }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
