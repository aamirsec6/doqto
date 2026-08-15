"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadLayout } from "@/lib/dashboard/layout";
import { loadOps } from "@/lib/dashboard/ops";
import { resolveRoleCategory, ROLE_PRESETS } from "@/lib/dashboard/roles";
import type { LayoutConfig, WardSnapshot } from "@/lib/dashboard/types";
import {
  acknowledgeFromHospital,
  raiseHospitalCodeWithWard,
  resolveFromHospital,
} from "@/lib/hospital/bridge";
import {
  apiAckIncident,
  apiRaiseIncident,
  apiResolveIncident,
} from "@/lib/hospital/apiClient";
import { activeIncidents, pageStaff } from "@/lib/hospital/incidents";
import {
  postQuickReplyMessage,
} from "@/lib/hospital/intercom";
import {
  buildDefaultChannels,
  channelIdBroadcast,
  channelIdIncident,
  QUICK_REPLIES,
  type IntercomChannel,
  type IntercomMessage,
} from "@/lib/hospital/messageTypes";
import {
  appendMessages,
  loadMessages,
  messagesForChannel,
  subscribeMessages,
} from "@/lib/hospital/messages";
import {
  connectRealtime,
  isRealtimeConnected,
  onRealtime,
} from "@/lib/hospital/realtimeClient";
import {
  ensureHospitalTenant,
  subscribeHospitalTenant,
} from "@/lib/hospital/store";
import type {
  HospitalCode,
  HospitalIncident,
  HospitalTenant,
} from "@/lib/hospital/types";
import { CODE_HINTS, CODE_LABELS } from "@/lib/hospital/types";

const RAISE_CODES: HospitalCode[] = [
  "code_blue",
  "doctor_needed",
  "critical_patient",
  "info",
];

type PresenceMap = Record<
  string,
  { staffId: string; name: string; online?: boolean }
>;

export function OpsBoard() {
  const [ready, setReady] = useState(false);
  const [layout, setLayout] = useState<LayoutConfig | null>(null);
  const [ward, setWard] = useState<WardSnapshot | null>(null);
  const [tenant, setTenant] = useState<HospitalTenant | null>(null);
  const [messages, setMessages] = useState<IntercomMessage[]>([]);
  const [channelId, setChannelId] = useState(channelIdBroadcast());
  const [zoneId, setZoneId] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState("all");
  const [presence, setPresence] = useState<PresenceMap>({});
  const [rtLive, setRtLive] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const cfg = loadLayout();
    setLayout(cfg);
    if (cfg) {
      const loaded = loadOps(cfg);
      setWard(loaded);
      const t = ensureHospitalTenant(cfg, loaded);
      setTenant(t);
      setZoneId(
        loaded.rooms.find((r) => r.kind === "clinical")?.id ??
          loaded.rooms[0]?.id ??
          "",
      );
    }
    setMessages(loadMessages());
    setReady(true);
  }, []);

  useEffect(() => {
    return subscribeHospitalTenant((next) => {
      setTenant(next);
      const cfg = loadLayout();
      if (cfg) setWard(loadOps(cfg));
    });
  }, []);

  useEffect(() => subscribeMessages(setMessages), []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    (async () => {
      const ok = await connectRealtime({
        staffId: "ops-desk",
        name: "Ops desk",
        role: "Ops",
      });
      setRtLive(ok || isRealtimeConnected());
      unsubs.push(
        onRealtime("message:new", (p) => {
          const msg = p as IntercomMessage;
          if (msg?.id) appendMessages([msg]);
        }),
        onRealtime("message:batch", (p) => {
          if (Array.isArray(p)) appendMessages(p as IntercomMessage[]);
        }),
        onRealtime("messages:sync", (p) => {
          if (Array.isArray(p)) appendMessages(p as IntercomMessage[]);
        }),
        onRealtime("presence:update", (p) => {
          const row = p as { staffId: string; name: string; online?: boolean };
          if (row?.staffId) {
            setPresence((prev) => ({ ...prev, [row.staffId]: row }));
          }
        }),
        onRealtime("presence:sync", (p) => {
          if (p && typeof p === "object") setPresence(p as PresenceMap);
        }),
      );
    })();
    return () => unsubs.forEach((u) => u());
  }, []);

  const open = useMemo(
    () => (tenant ? activeIncidents(tenant) : []),
    [tenant],
  );
  const primary = open[0] ?? null;

  const channels: IntercomChannel[] = useMemo(() => {
    if (!tenant) return [];
    const unit = tenant.units[0];
    return buildDefaultChannels({
      unitId: unit?.id,
      unitName: unit?.name,
      incidentIds: open.map((i) => ({
        id: i.id,
        label: `${CODE_LABELS[i.code]} · ${i.roomLabel}`,
      })),
    });
  }, [tenant, open]);

  useEffect(() => {
    if (primary) {
      setChannelId(channelIdIncident(primary.id));
    }
  }, [primary?.id]);

  const thread = useMemo(
    () => messagesForChannel(messages, channelId),
    [messages, channelId],
  );

  const filteredStaff = useMemo(() => {
    if (!tenant) return [];
    return tenant.staffDirectory.filter((s) => {
      if (filterRole === "all") return true;
      return resolveRoleCategory(s.role, s.name).id === filterRole;
    });
  }, [tenant, filterRole]);

  if (!ready) {
    return (
      <div className="ops-shell flex min-h-dvh items-center justify-center">
        <p className="text-sm text-[var(--ops-muted)]">Loading staff net…</p>
      </div>
    );
  }

  if (!layout || !ward || !tenant) {
    return (
      <div className="ops-shell flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold text-[var(--ops-text)]">
          Set up the ward board first
        </p>
        <p className="max-w-md text-sm text-[var(--ops-muted)]">
          Hospital ops uses the same tenant roster from ward setup.
        </p>
        <Link
          href="/dashboard"
          className="border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold"
        >
          Open ward board setup
        </Link>
      </div>
    );
  }

  const raise = async (code: HospitalCode) => {
    const roomId = zoneId || ward.rooms[0]?.id;
    if (!roomId) return;
    const roomLabel =
      ward.rooms.find((r) => r.id === roomId)?.label ?? roomId;
    const api = await apiRaiseIncident({
      code,
      roomKey: roomId,
      roomLabel,
      sourceWard: ward.ward,
    });
    const result = raiseHospitalCodeWithWard(layout, ward, {
      code,
      roomId,
      actorRole: "ops",
    });
    if (api?.incident?.id && result.tenant.incidents[0]) {
      const patched = {
        ...result.tenant,
        incidents: result.tenant.incidents.map((inc, i) =>
          i === 0 ? { ...inc, dbId: api.incident.id as string } : inc,
        ),
      };
      setTenant(patched);
    } else {
      setTenant(result.tenant);
    }
    setWard(result.ward);
    setChannelId(channelIdIncident(result.incidentId));
  };

  const ack = async (incident: HospitalIncident) => {
    const name =
      incident.pagedStaffIds[0]
        ? tenant.staffDirectory.find((s) => s.id === incident.pagedStaffIds[0])
            ?.name ?? "Staff"
        : "Ops desk";
    if (incident.dbId) {
      await apiAckIncident({
        incidentId: incident.dbId,
        staffId: incident.pagedStaffIds[0],
        staffName: name,
      });
    }
    const result = acknowledgeFromHospital(layout, ward, tenant, incident.id, {
      staffId: incident.pagedStaffIds[0],
      staffName: name,
      actorRole: "ops",
    });
    setWard(result.ward);
    setTenant(result.tenant);
    postQuickReplyMessage({
      body: `${name} acknowledged`,
      kind: "ack",
      channelId: channelIdIncident(incident.id),
      channelKind: "incident",
      authorId: "ops-desk",
      authorName: "Ops desk",
      authorRole: "Ops",
      incidentId: incident.id,
      priority: "urgent",
    });
  };

  const resolve = async (incident: HospitalIncident) => {
    if (incident.dbId) {
      await apiResolveIncident({
        incidentId: incident.dbId,
        resolvedBy: "Ops desk",
      });
    }
    const result = resolveFromHospital(
      layout,
      ward,
      tenant,
      incident.id,
      "Ops desk",
    );
    setWard(result.ward);
    setTenant(result.tenant);
  };

  const sendText = () => {
    const body = draft.trim();
    if (!body) return;
    const ch = channels.find((c) => c.id === channelId);
    postQuickReplyMessage({
      body,
      kind: "text",
      channelId,
      channelKind: ch?.kind ?? "broadcast",
      authorId: "ops-desk",
      authorName: "Ops desk",
      authorRole: "Ops",
      incidentId: ch?.incidentId,
      priority: primary ? "urgent" : "normal",
    });
    setDraft("");
  };

  const ageLabel = (iso: string) => {
    const sec = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  };

  return (
    <div className="ops-shell flex min-h-dvh flex-col">
      <header className="shrink-0 border-b border-[var(--ops-border)] bg-[#0d1524]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <Image src="/icon.png" alt="" width={28} height={28} className="h-7 w-7" />
              <span className="font-display text-xs font-semibold tracking-[0.18em] text-[#f04343]">
                DOQTO
              </span>
            </Link>
            <span className="hidden h-5 w-px bg-white/10 sm:block" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-[var(--ops-text)] md:text-base">
                Hospital ops · Intercom
              </h1>
              <p className="truncate text-[11px] text-[var(--ops-muted)]">
                {tenant.hospitalName} · {ward.ward}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-2 border px-3 py-1.5 ${
                rtLive
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  rtLive ? "ops-live-dot bg-emerald-400" : "bg-[var(--ops-muted)]"
                }`}
              />
              <p
                className={`text-[10px] font-bold tracking-[0.12em] uppercase ${
                  rtLive ? "text-emerald-300" : "text-[var(--ops-muted)]"
                }`}
              >
                {rtLive ? "Staff net live" : "Local sync"}
              </p>
            </div>
            <Link
              href="/staff"
              className="border border-sky-700/40 bg-sky-950/30 px-2.5 py-1.5 text-[11px] font-semibold text-sky-100"
            >
              My board
            </Link>
            <Link
              href="/audit"
              className="border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)]"
            >
              Audit
            </Link>
            <Link
              href="/dashboard"
              className="border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)]"
            >
              Ward floor →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-3 p-3 md:p-4">
        {primary ? (
          <section className="ops-panel border-red-900/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-red-300/90 uppercase">
                  Active · {CODE_LABELS[primary.code]} · {ageLabel(primary.raisedAt)}
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {primary.title}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {primary.roomLabel} · {primary.sourceWard} · {primary.lifecycle}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {primary.lifecycle !== "responding" &&
                  primary.lifecycle !== "resolved" && (
                    <button
                      type="button"
                      onClick={() => ack(primary)}
                      className="border border-red-800/60 bg-red-950/40 px-4 py-2 text-[12px] font-semibold text-red-100"
                    >
                      Ack response
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => resolve(primary)}
                  className="border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold"
                >
                  Resolve
                </button>
                {selectedStaffId && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = pageStaff(tenant, primary.id, [
                        selectedStaffId,
                      ]);
                      setTenant(next);
                      postQuickReplyMessage({
                        body: `Paged ${
                          tenant.staffDirectory.find(
                            (s) => s.id === selectedStaffId,
                          )?.name ?? "staff"
                        }`,
                        kind: "system",
                        channelId: channelIdIncident(primary.id),
                        channelKind: "incident",
                        authorId: "ops-desk",
                        authorName: "Ops desk",
                        authorRole: "Ops",
                        incidentId: primary.id,
                        priority: "critical",
                      });
                    }}
                    className="border border-sky-700/50 bg-sky-950/40 px-4 py-2 text-[12px] font-semibold text-sky-100"
                  >
                    Page selected
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    postQuickReplyMessage({
                      body: q.body,
                      kind: q.ack ? "ack" : "quick_reply",
                      channelId: channelIdIncident(primary.id),
                      channelKind: "incident",
                      authorId: "ops-desk",
                      authorName: "Ops desk",
                      authorRole: "Ops",
                      incidentId: primary.id,
                      priority: "urgent",
                    });
                    if (q.ack) ack(primary);
                  }}
                  className="border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="ops-panel p-4">
            <p className="ops-panel-title">No active hospital code</p>
            <p className="mt-2 text-sm text-[var(--ops-muted)]">
              Raise a code or wait for staff boards to escalate.
            </p>
          </section>
        )}

        <section className="ops-panel p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="ops-panel-title">Raise to whole staff</p>
              <p className="mt-1 text-[11px] text-[var(--ops-muted)]">
                Opens an incident thread on the intercom
              </p>
            </div>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-[var(--ops-text)]"
            >
              {ward.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {RAISE_CODES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => raise(code)}
                className={`border px-3 py-3 text-left ${
                  code === "code_blue"
                    ? "border-red-800/50 bg-red-950/35"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <p className="text-[12px] font-semibold">{CODE_LABELS[code]}</p>
                <p className="mt-1 text-[10px] text-[var(--ops-muted)]">
                  {CODE_HINTS[code]}
                </p>
              </button>
            ))}
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-12">
          <aside className="ops-panel flex max-h-[560px] flex-col lg:col-span-3">
            <div className="border-b border-white/5 px-3 py-3">
              <p className="ops-panel-title">Channels</p>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {channels.map((ch) => (
                <li key={ch.id}>
                  <button
                    type="button"
                    onClick={() => setChannelId(ch.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] ${
                      channelId === ch.id
                        ? "bg-white/10 text-[var(--ops-text)]"
                        : "text-[var(--ops-muted)] hover:bg-white/5"
                    }`}
                  >
                    {ch.kind === "incident" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    )}
                    <span className="truncate">{ch.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="ops-panel flex max-h-[560px] flex-col lg:col-span-5">
            <div className="border-b border-white/5 px-4 py-3">
              <p className="ops-panel-title">
                {channels.find((c) => c.id === channelId)?.label ?? "Thread"}
              </p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {thread.length === 0 && (
                <p className="text-sm text-[var(--ops-muted)]">
                  No messages in this channel yet.
                </p>
              )}
              {thread.map((m) => (
                <div key={m.id}>
                  <p className="text-[10px] text-[var(--ops-muted)]">
                    {m.authorName} · {m.kind}
                    {m.priority !== "normal" ? ` · ${m.priority}` : ""} ·{" "}
                    {new Date(m.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                  <p className="text-sm text-[var(--ops-text)]">{m.body}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-white/5 p-3">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendText();
                }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message this channel…"
                  className="min-w-0 flex-1 border border-white/10 bg-black/30 px-3 py-2 text-sm text-[var(--ops-text)]"
                />
                <button
                  type="submit"
                  className="border border-white/15 bg-white/10 px-3 py-2 text-[12px] font-semibold"
                >
                  Send
                </button>
              </form>
            </div>
          </section>

          <section className="ops-panel flex max-h-[560px] flex-col lg:col-span-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
              <div>
                <p className="ops-panel-title">Staff directory</p>
                <p className="mt-0.5 text-[11px] text-[var(--ops-muted)]">
                  Presence · tap to select for paging
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <FilterChip
                  active={filterRole === "all"}
                  onClick={() => setFilterRole("all")}
                  label="All"
                />
                {ROLE_PRESETS.filter((r) => r.id !== "other").map((r) => (
                  <FilterChip
                    key={r.id}
                    active={filterRole === r.id}
                    onClick={() => setFilterRole(r.id)}
                    label={r.short}
                    color={r.color}
                  />
                ))}
              </div>
            </div>
            <ul className="flex-1 divide-y divide-white/5 overflow-y-auto">
              {filteredStaff.map((s) => {
                const role = resolveRoleCategory(s.role, s.name);
                const online = presence[s.id]?.online;
                const selected = selectedStaffId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedStaffId((prev) =>
                          prev === s.id ? null : s.id,
                        )
                      }
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
                        selected ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      <span className="relative">
                        <span
                          className="block h-2.5 w-2.5 rounded-full"
                          style={{ background: role.color }}
                        />
                        <span
                          className={`absolute -right-0.5 -bottom-0.5 h-1.5 w-1.5 rounded-full ${
                            online ? "bg-emerald-400" : "bg-slate-600"
                          }`}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {s.name}
                        </span>
                        <span className="block truncate text-[11px] text-[var(--ops-muted)]">
                          {s.role}
                        </span>
                      </span>
                      <span className="text-[10px] font-semibold uppercase text-[var(--ops-muted)]">
                        {s.status}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 border px-2 py-1 text-[10px] font-semibold ${
        active
          ? "border-white/25 bg-white/10 text-[var(--ops-text)]"
          : "border-white/10 text-[var(--ops-muted)]"
      }`}
    >
      {color && (
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      )}
      {label}
    </button>
  );
}
