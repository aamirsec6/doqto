"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadLayout } from "@/lib/dashboard/layout";
import { loadOps, saveOps, setStaffStatus } from "@/lib/dashboard/ops";
import { resolveRoleCategory } from "@/lib/dashboard/roles";
import type {
  LayoutConfig,
  StaffStatus,
  WardSnapshot,
} from "@/lib/dashboard/types";
import {
  acknowledgeFromHospital,
  raiseHospitalCodeWithWard,
} from "@/lib/hospital/bridge";
import {
  apiAckIncident,
  apiRaiseIncident,
} from "@/lib/hospital/apiClient";
import {
  incidentsForStaff,
  postQuickReplyMessage,
} from "@/lib/hospital/intercom";
import {
  channelIdIncident,
  QUICK_REPLIES,
} from "@/lib/hospital/messageTypes";
import {
  loadMessages,
  messagesForStaffInbox,
  subscribeMessages,
} from "@/lib/hospital/messages";
import {
  connectRealtime,
  isRealtimeConnected,
  onRealtime,
} from "@/lib/hospital/realtimeClient";
import {
  clearStaffSession,
  createStaffSession,
  loadStaffSession,
  saveStaffSession,
  type StaffSession,
} from "@/lib/hospital/session";
import {
  ensureHospitalTenant,
  loadHospitalTenant,
  saveHospitalTenant,
  subscribeHospitalTenant,
  syncTenantFromWard,
} from "@/lib/hospital/store";
import type {
  HospitalCode,
  HospitalIncident,
  HospitalTenant,
} from "@/lib/hospital/types";
import { CODE_HINTS, CODE_LABELS } from "@/lib/hospital/types";
import type { IntercomMessage } from "@/lib/hospital/messageTypes";
import { appendMessages } from "@/lib/hospital/messages";

const RAISE_CODES: HospitalCode[] = [
  "code_blue",
  "doctor_needed",
  "critical_patient",
  "info",
];

export function StaffBoard() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<StaffSession | null>(null);
  const [layout, setLayout] = useState<LayoutConfig | null>(null);
  const [ward, setWard] = useState<WardSnapshot | null>(null);
  const [tenant, setTenant] = useState<HospitalTenant | null>(null);
  const [messages, setMessages] = useState<IntercomMessage[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [rtLive, setRtLive] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [flash, setFlash] = useState("");

  useEffect(() => {
    const cfg = loadLayout();
    setLayout(cfg);
    setSession(loadStaffSession());
    if (cfg) {
      const loaded = loadOps(cfg);
      setWard(loaded);
      setTenant(ensureHospitalTenant(cfg, loaded));
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
    return subscribeHospitalTenant((t) => {
      setTenant(t);
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
    if (!session) return;
    let unsubs: (() => void)[] = [];
    (async () => {
      const ok = await connectRealtime({
        staffId: session.staffId,
        name: session.name,
        role: session.role,
      });
      setRtLive(ok || isRealtimeConnected());
      unsubs.push(
        onRealtime("message:new", (payload) => {
          const msg = payload as IntercomMessage;
          if (msg?.id) appendMessages([msg]);
        }),
        onRealtime("message:batch", (payload) => {
          if (Array.isArray(payload)) appendMessages(payload as IntercomMessage[]);
        }),
        onRealtime("messages:sync", (payload) => {
          if (Array.isArray(payload)) appendMessages(payload as IntercomMessage[]);
        }),
        onRealtime("page:staff", (payload) => {
          const p = payload as { staffId?: string };
          if (p.staffId === session.staffId) {
            setFlash("You were paged — check For you now");
            setTimeout(() => setFlash(""), 4000);
          }
        }),
      );
    })();
    return () => unsubs.forEach((u) => u());
  }, [session]);

  const myIncidents = useMemo(() => {
    if (!tenant || !session) return [];
    return incidentsForStaff(tenant, session.staffId, session.roleCategory);
  }, [tenant, session]);

  const inbox = useMemo(() => {
    if (!session || !tenant) return [];
    const unitId = tenant.units[0]?.id;
    return messagesForStaffInbox(
      messages,
      session.staffId,
      session.roleCategory,
      unitId ? `ch-unit-${unitId}` : undefined,
    ).slice(0, 40);
  }, [messages, session, tenant]);

  if (!ready) {
    return (
      <div className="ops-shell flex min-h-dvh items-center justify-center">
        <p className="text-sm text-[var(--ops-muted)]">Loading my board…</p>
      </div>
    );
  }

  if (!layout || !ward || !tenant) {
    return (
      <div className="ops-shell flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold text-[var(--ops-text)]">
          Ward setup required
        </p>
        <p className="max-w-sm text-sm text-[var(--ops-muted)]">
          Complete ward board setup once so the staff roster exists, then open
          your personal board.
        </p>
        <Link
          href="/dashboard"
          className="border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold"
        >
          Open ward setup
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <StaffPicker
        tenant={tenant}
        onPick={async (entry) => {
          const next = createStaffSession(entry);
          saveStaffSession(next);
          setSession(next);
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "staff_identity",
              staffId: entry.staffId,
              staffName: entry.name,
              staffRole: entry.role,
            }),
          }).catch(() => {});
        }}
      />
    );
  }

  const role = resolveRoleCategory(session.role, session.name);
  const me = tenant.staffDirectory.find((s) => s.id === session.staffId);

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
      title: `${CODE_LABELS[code]} · raised by ${session.name}`,
    });
    const result = raiseHospitalCodeWithWard(layout, ward, {
      code,
      roomId,
      actorRole: session.roleCategory === "nurse" ? "nurse" : "charge",
      title: `${CODE_LABELS[code]} · raised by ${session.name}`,
    });
    if (api?.incident?.id && result.tenant.incidents[0]) {
      setTenant({
        ...result.tenant,
        incidents: result.tenant.incidents.map((inc, i) =>
          i === 0 ? { ...inc, dbId: api.incident.id as string } : inc,
        ),
      });
    } else {
      setTenant(result.tenant);
    }
    setWard(result.ward);
    setFlash(`${CODE_LABELS[code]} sent to staff net`);
    setTimeout(() => setFlash(""), 3000);
  };

  const setStatus = (status: StaffStatus) => {
    const nextWard = setStaffStatus(
      ward,
      session.staffId,
      status,
      undefined,
      { actorRole: "nurse" },
    );
    saveOps(nextWard);
    setWard(nextWard);
    const nextTenant = syncTenantFromWard(
      layout,
      nextWard,
      loadHospitalTenant() ?? tenant,
    );
    saveHospitalTenant(nextTenant);
    setTenant(nextTenant);
  };

  const reply = async (incident: HospitalIncident, body: string, doAck: boolean) => {
    postQuickReplyMessage({
      body,
      kind: doAck ? "ack" : "quick_reply",
      channelId: channelIdIncident(incident.id),
      channelKind: "incident",
      authorId: session.staffId,
      authorName: session.name,
      authorRole: session.role,
      incidentId: incident.id,
      priority: "urgent",
    });
    if (doAck) {
      if (incident.dbId) {
        await apiAckIncident({
          incidentId: incident.dbId,
          staffId: session.staffId,
          staffName: session.name,
        });
      }
      const result = acknowledgeFromHospital(
        layout,
        ward,
        tenant,
        incident.id,
        {
          staffId: session.staffId,
          staffName: session.name,
          actorRole: session.roleCategory === "nurse" ? "nurse" : "charge",
        },
      );
      setWard(result.ward);
      setTenant(result.tenant);
    }
  };

  const age = (iso: string) => {
    const sec = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m`;
  };

  return (
    <div className="ops-shell flex min-h-dvh flex-col">
      <header className="shrink-0 border-b border-[var(--ops-border)] bg-[#0d1524]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <Image src="/icon.png" alt="" width={28} height={28} className="h-7 w-7" />
              <span className="font-display text-xs font-semibold tracking-[0.18em] text-[#f04343]">
                DOQTO
              </span>
            </Link>
            <span className="hidden h-5 w-px bg-white/10 sm:block" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-[var(--ops-text)]">
                My board
              </h1>
              <p className="truncate text-[11px] text-[var(--ops-muted)]">
                {tenant.hospitalName} · {session.name}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`border px-2 py-1 text-[10px] font-bold uppercase ${
                rtLive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 text-[var(--ops-muted)]"
              }`}
            >
              {rtLive ? "Live" : "Local"}
            </span>
            <Link
              href="/ops"
              className="border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)]"
            >
              Hospital ops
            </Link>
            <Link
              href="/dashboard"
              className="border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)]"
            >
              Ward floor
            </Link>
            <button
              type="button"
              onClick={() => {
                clearStaffSession();
                setSession(null);
              }}
              className="border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)]"
            >
              Switch person
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 p-3 md:max-w-2xl md:p-4">
        {flash && (
          <p className="border border-sky-700/40 bg-sky-950/40 px-3 py-2 text-sm text-sky-100">
            {flash}
          </p>
        )}

        <section className="ops-panel flex items-center gap-3 p-4">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ background: role.color }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[var(--ops-text)]">
              {session.name}
            </p>
            <p className="text-[12px] text-[var(--ops-muted)]">
              {session.role} · {me?.status ?? "free"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {(["free", "busy", "responding", "off-floor"] as StaffStatus[]).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`border px-2 py-1 text-[10px] font-semibold uppercase ${
                    (me?.status ?? "free") === s
                      ? "border-white/30 bg-white/15 text-[var(--ops-text)]"
                      : "border-white/10 text-[var(--ops-muted)]"
                  }`}
                >
                  {s}
                </button>
              ),
            )}
          </div>
        </section>

        <section className="space-y-2">
          <p className="ops-panel-title px-1">For you now</p>
          {myIncidents.length === 0 ? (
            <div className="ops-panel p-4 text-sm text-[var(--ops-muted)]">
              No open pages for you. Raise a concern below if something needs
              attention.
            </div>
          ) : (
            myIncidents.map((inc) => (
              <div
                key={inc.id}
                className="ops-panel border-red-900/40 p-4"
              >
                <p className="text-[11px] font-semibold tracking-wider text-red-300 uppercase">
                  {CODE_LABELS[inc.code]} · {age(inc.raisedAt)} · {inc.lifecycle}
                </p>
                <p className="mt-1 text-base font-semibold text-white">
                  {inc.title}
                </p>
                <p className="mt-1 text-[12px] text-slate-300">
                  {inc.roomLabel} · {inc.sourceWard}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => reply(inc, q.body, q.ack)}
                      className="border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-text)]"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        <section className="ops-panel p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="ops-panel-title">Raise a concern</p>
              <p className="mt-1 text-[11px] text-[var(--ops-muted)]">
                Pages the staff net for your hospital
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
          <div className="mt-3 grid grid-cols-2 gap-2">
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
                <p className="text-[12px] font-semibold text-[var(--ops-text)]">
                  {CODE_LABELS[code]}
                </p>
                <p className="mt-1 text-[10px] text-[var(--ops-muted)]">
                  {CODE_HINTS[code]}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="ops-panel flex flex-col">
          <div className="border-b border-white/5 px-4 py-3">
            <p className="ops-panel-title">My inbox</p>
            <p className="mt-0.5 text-[11px] text-[var(--ops-muted)]">
              Broadcast · role · pages · incident traffic
            </p>
          </div>
          <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
            {inbox.length === 0 && (
              <li className="px-4 py-6 text-sm text-[var(--ops-muted)]">
                No messages yet
              </li>
            )}
            {inbox.map((m) => (
              <li key={m.id} className="px-4 py-3">
                <p className="text-[11px] text-[var(--ops-muted)]">
                  {m.authorName} · {m.kind}
                  {m.priority !== "normal" ? ` · ${m.priority}` : ""}
                </p>
                <p className="text-sm text-[var(--ops-text)]">{m.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function StaffPicker({
  tenant,
  onPick,
}: {
  tenant: HospitalTenant;
  onPick: (entry: { staffId: string; name: string; role: string }) => void;
}) {
  return (
    <div className="ops-shell flex min-h-dvh flex-col">
      <header className="border-b border-[var(--ops-border)] px-4 py-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <Image src="/icon.png" alt="" width={28} height={28} className="h-7 w-7" />
          <span className="font-display text-xs font-semibold tracking-[0.18em] text-[#f04343]">
            DOQTO
          </span>
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-[var(--ops-text)]">
          Who are you?
        </h1>
        <p className="mt-1 text-sm text-[var(--ops-muted)]">
          Pick your name to open your personal board on this device.
        </p>
      </header>
      <ul className="mx-auto w-full max-w-lg flex-1 divide-y divide-white/5 overflow-y-auto p-2">
        {tenant.staffDirectory.map((s) => {
          const role = resolveRoleCategory(s.role, s.name);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() =>
                  onPick({ staffId: s.id, name: s.name, role: s.role })
                }
                className="flex w-full items-center gap-3 px-3 py-3.5 text-left hover:bg-white/5"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: role.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-[var(--ops-text)]">
                    {s.name}
                  </span>
                  <span className="block text-[12px] text-[var(--ops-muted)]">
                    {s.role}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {tenant.staffDirectory.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-[var(--ops-muted)]">
            No staff in directory — add people in ward setup.
          </li>
        )}
      </ul>
    </div>
  );
}
