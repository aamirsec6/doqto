import { getSession } from "@/server/auth/session";
import type { AppSession } from "@/server/domain/types";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireTenantSession(): Promise<AppSession & { tenantId: string }> {
  const session = await getSession();
  if (!session?.tenantId) {
    throw new AuthError("Join a hospital or sign in as admin first", 401);
  }
  return session as AppSession & { tenantId: string };
}

export async function requireHospitalAdmin(): Promise<
  AppSession & { tenantId: string; adminId: string }
> {
  const session = await requireTenantSession();
  if (session.role !== "hospital_admin" || !session.adminId) {
    throw new AuthError("Hospital admin required", 403);
  }
  return session as AppSession & { tenantId: string; adminId: string };
}

export async function requireDoqtoAdmin(): Promise<AppSession> {
  const session = await getSession();
  if (!session || session.role !== "doqto_admin") {
    throw new AuthError("DOQTO admin required", 403);
  }
  return session;
}

export function jsonError(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  const message =
    err instanceof Error && process.env.NODE_ENV !== "production"
      ? err.message
      : "Internal server error";
  return Response.json({ error: message }, { status: 500 });
}
