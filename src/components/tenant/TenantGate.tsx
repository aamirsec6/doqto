"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

type Mode = "join" | "login" | "register";

export function TenantGate({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const [mode, setMode] = useState<Mode>("join");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [adminName, setAdminName] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "join") {
        const res = await fetch("/api/auth/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ inviteCode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Join failed");
      } else if (mode === "login") {
        const res = await fetch("/api/auth/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");
      } else {
        const res = await fetch("/api/auth/admin/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            hospitalName,
            adminEmail: email,
            adminPassword: password,
            adminName,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Register failed");
      }
      // Full reload so RequireTenant remounts and re-reads the session cookie.
      // router.push to the same URL (e.g. already on /audit) leaves the gate stuck.
      window.location.assign(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="ops-shell flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <Image src="/icon.png" alt="" width={32} height={32} className="h-8 w-8" />
          <span className="font-display text-xs font-semibold tracking-[0.18em] text-[#f04343]">
            DOQTO
          </span>
        </Link>
        <div className="ops-panel p-6">
          <h1 className="text-lg font-semibold text-[var(--ops-text)]">
            {mode === "join"
              ? "Join your hospital"
              : mode === "login"
                ? "Hospital admin sign-in"
                : "Register hospital tenant"}
          </h1>
          <p className="mt-2 text-sm text-[var(--ops-muted)]">
            Each hospital’s data is stored separately. Staff use an invite code;
            admins sign in to manage the tenant.
          </p>

          <div className="mt-4 flex gap-1 border border-white/10 p-0.5">
            {(
              [
                ["join", "Invite code"],
                ["login", "Admin login"],
                ["register", "Register"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id);
                  setError("");
                }}
                className={`flex-1 px-2 py-1.5 text-[11px] font-semibold ${
                  mode === id
                    ? "bg-white/15 text-[var(--ops-text)]"
                    : "text-[var(--ops-muted)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === "join" && (
              <label className="block text-[11px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
                Invite code
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="mt-1 w-full border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-[var(--ops-text)]"
                  placeholder="ABCD2345"
                  required
                />
              </label>
            )}

            {mode === "register" && (
              <>
                <label className="block text-[11px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
                  Hospital name
                  <input
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className="mt-1 w-full border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-[var(--ops-text)]"
                    required
                  />
                </label>
                <label className="block text-[11px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
                  Your name
                  <input
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="mt-1 w-full border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-[var(--ops-text)]"
                  />
                </label>
              </>
            )}

            {(mode === "login" || mode === "register") && (
              <>
                <label className="block text-[11px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
                  Admin email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-[var(--ops-text)]"
                    required
                  />
                </label>
                <label className="block text-[11px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-[var(--ops-text)]"
                    required
                    minLength={8}
                  />
                </label>
              </>
            )}

            {error && (
              <p className="border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-semibold text-[var(--ops-text)] disabled:opacity-50"
            >
              {busy
                ? "Please wait…"
                : mode === "join"
                  ? "Join hospital"
                  : mode === "login"
                    ? "Sign in"
                    : "Create tenant"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
