import { NextRequest } from "next/server";
import { setSessionCookie } from "@/server/auth/session";
import { AuthService } from "@/server/services/AuthService";
import { jsonError } from "@/server/tenancy/guards";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenant = await new AuthService().joinByInvite({
      inviteCode: String(body.inviteCode || ""),
      actor: {
        type: "device",
        ip: req.headers.get("x-forwarded-for") || undefined,
      },
    });
    await setSessionCookie({
      role: "device",
      tenantId: tenant.id,
    });
    return Response.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        inviteCode: tenant.inviteCode,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return jsonError(err);
  }
}
