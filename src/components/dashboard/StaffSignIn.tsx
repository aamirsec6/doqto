"use client";

import { useEffect, useState } from "react";
import { DEFAULT_STAFF_PIN } from "@/lib/oncology/constants";

export function StaffSignIn({ onSignedIn }: { onSignedIn?: () => void }) {
  const [staff, setStaff] = useState<
    { externalId: string; name: string; role: string }[]
  >([]);
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/staff", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStaff(d.staff ?? []))
      .catch(() => setStaff([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/staff", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign-in failed");
      onSignedIn?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  if (!staff.length) return null;

  return (
    <div className="border-b border-[var(--ops-border)] bg-[var(--ops-panel)] px-4 py-2">
      <form onSubmit={submit} className="mx-auto flex max-w-[1680px] flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <label className="text-[10px] font-semibold text-[var(--ops-muted)] uppercase">
            Sign in as staff
          </label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--ops-border)] bg-white px-2 py-1.5 text-sm text-[var(--ops-text)]"
            required
          >
            <option value="">Select your name</option>
            {staff.map((s) => (
              <option key={s.externalId} value={s.externalId}>
                {s.name} · {s.role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-[var(--ops-muted)] uppercase">
            PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={DEFAULT_STAFF_PIN}
            className="mt-1 w-24 rounded-md border border-[var(--ops-border)] bg-white px-2 py-1.5 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-[var(--ops-cyan)] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "…" : "Sign in"}
        </button>
        {error && (
          <p className="w-full text-sm text-[var(--ops-red)]">{error}</p>
        )}
        <p className="w-full text-[10px] text-[var(--ops-muted)]">
          Pilot default PIN: {DEFAULT_STAFF_PIN} (set per staff in a future release)
        </p>
      </form>
    </div>
  );
}
