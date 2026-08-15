import { NextRequest } from "next/server";
import {
  clearSessionCookie,
  getSession,
  setSessionCookie,
} from "@/server/auth/session";
import { AuthService } from "@/server/services/AuthService";
import { jsonError } from "@/server/tenancy/guards";

export async function GET() {
  const session = await getSession();
  return Response.json({ session });
}

export async function DELETE() {
  await clearSessionCookie();
  return Response.json({ ok: true });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === "doqto_admin") {
      await new AuthService().loginDoqtoAdmin(String(body.passcode || ""));
      await setSessionCookie({ role: "doqto_admin" });
      return Response.json({ ok: true, role: "doqto_admin" });
    }
    if (body.action === "staff_identity") {
      const session = await getSession();
      if (!session?.tenantId) {
        return Response.json({ error: "Join hospital first" }, { status: 401 });
      }
      await setSessionCookie({
        ...session,
        role: "staff",
        staffId: String(body.staffId || ""),
        staffName: String(body.staffName || ""),
        staffRole: String(body.staffRole || ""),
      });
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    if (err instanceof Error) {
      return Response.json({ error: err.message }, { status: 401 });
    }
    return jsonError(err);
  }
}
