import { NextRequest } from "next/server";
import { TenantDataService } from "@/server/services/TenantDataService";
import { jsonError, requireTenantSession } from "@/server/tenancy/guards";

export async function GET() {
  try {
    const session = await requireTenantSession();
    const snap = await new TenantDataService().getSnapshot(session.tenantId);
    return Response.json({ session, ...snap });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireTenantSession();
    const body = await req.json();
    const layout = await new TenantDataService().saveLayout({
      tenantId: session.tenantId,
      layout: body.layout,
      actor: {
        type:
          session.role === "hospital_admin"
            ? "hospital_admin"
            : session.role === "staff"
              ? "staff"
              : "device",
        id: session.adminId || session.staffId,
        name: session.email || session.staffName || "device",
      },
    });
    return Response.json({ layout });
  } catch (err) {
    return jsonError(err);
  }
}
