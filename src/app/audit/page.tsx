"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RequireTenant } from "@/components/tenant/RequireTenant";

interface AuditRow {
  id: string;
  createdAt: string;
  action: string;
  actorType: string;
  actorName: string;
  entityType: string;
  entityLabel: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

function AuditPageInner() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [tenantName, setTenantName] = useState("");

  const load = async () => {
    setError("");
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (action) params.set("action", action);
    const res = await fetch(`/api/audit?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load audit");
      return;
    }
    setRows(data.rows || []);
  };

  useEffect(() => {
    load();
    fetch("/api/tenant/snapshot")
      .then((r) => r.json())
      .then((d) => {
        if (d.tenant?.name) setTenantName(d.tenant.name);
      })
      .catch(() => {});
  }, []);

  const actions = useMemo(() => {
    const set = new Set(rows.map((r) => r.action));
    return [...set].sort();
  }, [rows]);

  return (
    <div className="ops-shell flex min-h-dvh flex-col">
      <header className="border-b border-[var(--ops-border)] bg-[#0d1524] px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/icon.png" alt="" width={28} height={28} className="h-7 w-7" />
              <span className="font-display text-xs font-semibold tracking-[0.18em] text-[#f04343]">
                DOQTO
              </span>
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-[var(--ops-text)]">
                Hospital audit
              </h1>
              <p className="text-[11px] text-[var(--ops-muted)]">
                {tenantName || "Your hospital"} · compliance timeline
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)]"
            >
              Ward floor
            </Link>
            <Link
              href="/ops"
              className="border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)]"
            >
              Hospital ops
            </Link>
            <a
              href={`/api/audit?format=csv${action ? `&action=${encodeURIComponent(action)}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="border border-sky-700/40 bg-sky-950/30 px-2.5 py-1.5 text-[11px] font-semibold text-sky-100"
            >
              Export CSV
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4">
        <section className="ops-panel mb-4 p-4">
          <p className="text-sm text-[var(--ops-muted)]">
            This log records who raised codes, who acknowledged, layout changes,
            and sign-ins for this hospital only. Use it for quality reviews. DOQTO
            does not issue accreditation certificates.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search actor or label"
              className="min-w-[180px] flex-1 border border-white/10 bg-black/30 px-3 py-2 text-sm text-[var(--ops-text)]"
            />
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="border border-white/10 bg-black/30 px-3 py-2 text-sm text-[var(--ops-text)]"
            >
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={load}
              className="border border-white/15 bg-white/10 px-3 py-2 text-[12px] font-semibold"
            >
              Filter
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-300">{error}</p>
          )}
        </section>

        <div className="ops-panel overflow-x-auto">
          <table className="min-w-full text-left text-[12px]">
            <thead className="border-b border-white/10 text-[10px] tracking-wider text-[var(--ops-muted)] uppercase">
              <tr>
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Actor</th>
                <th className="px-3 py-2 font-semibold">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums text-[var(--ops-muted)]">
                    {new Date(r.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--ops-text)]">
                    {r.action}
                  </td>
                  <td className="px-3 py-2 text-[var(--ops-muted)]">
                    {r.actorName || r.actorType}
                  </td>
                  <td className="px-3 py-2 text-[var(--ops-text)]">
                    {r.entityLabel || r.entityType}
                    {r.entityId ? (
                      <span className="ml-1 text-[10px] text-[var(--ops-muted)]">
                        {r.entityId.slice(0, 8)}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-[var(--ops-muted)]"
                  >
                    No audit events yet for this hospital.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default function AuditPage() {
  return (
    <RequireTenant redirectTo="/audit">
      <AuditPageInner />
    </RequireTenant>
  );
}
