import { NextRequest } from "next/server";
import { TenantDataService } from "@/server/services/TenantDataService";
import { jsonError, requireTenantSession } from "@/server/tenancy/guards";

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireTenantSession();
    const body = await req.json();
    const staff = await new TenantDataService().setStaffStatus({
      tenantId: session.tenantId,
      staffId: String(body.staffId || ""),
      status: String(body.status || "free"),
      roomKey: body.roomKey ? String(body.roomKey) : undefined,
      actor: {
        type:
          session.role === "hospital_admin"
            ? "hospital_admin"
            : session.role === "staff"
              ? "staff"
              : "device",
        id: session.adminId || session.staffId,
        name: session.staffName || session.email || "device",
      },
    });
    return Response.json({ staff });
  } catch (err) {
    if (err instanceof Error) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return jsonError(err);
  }
}
