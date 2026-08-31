import { NextRequest } from "next/server";
import { setSessionCookie } from "@/server/auth/session";
import { AuthService } from "@/server/services/AuthService";
import { jsonError } from "@/server/tenancy/guards";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const svc = new AuthService();
    const { tenant, admin } = await svc.registerHospital({
      hospitalName: String(body.hospitalName || ""),
      adminEmail: String(body.adminEmail || ""),
      adminPassword: String(body.adminPassword || ""),
      adminName: body.adminName ? String(body.adminName) : undefined,
      actor: {
        type: "system",
        name: "bootstrap",
        ip: req.headers.get("x-forwarded-for") || undefined,
      },
    });
    await setSessionCookie({
      role: "hospital_admin",
      tenantId: tenant.id,
      adminId: admin.id,
      email: admin.email,
    });
    return Response.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        inviteCode: tenant.inviteCode,
      },
      admin: { id: admin.id, email: admin.email },
    });
  } catch (err) {
    if (err instanceof Error) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return jsonError(err);
  }
}
