"use client";

import { useEffect, useState } from "react";
import { TenantGate } from "@/components/tenant/TenantGate";

export function RequireTenant({
  children,
  redirectTo,
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const [state, setState] = useState<"loading" | "gated" | "ready">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        if (data.session?.tenantId || data.session?.role === "doqto_admin") {
          setState("ready");
        } else {
          setState("gated");
        }
      } catch {
        if (!cancelled) setState("gated");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="ops-shell flex min-h-dvh items-center justify-center">
        <p className="text-sm text-[var(--ops-muted)]">Checking hospital access…</p>
      </div>
    );
  }

  if (state === "gated") {
    return <TenantGate redirectTo={redirectTo} />;
  }

  return <>{children}</>;
}
