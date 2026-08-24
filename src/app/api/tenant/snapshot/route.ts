import { NextRequest } from "next/server";
import { TenantDataService } from "@/server/services/TenantDataService";
import type { CampusPayload } from "@/server/domain/campus";
import { jsonError, requireTenantSession } from "@/server/tenancy/guards";

export async function GET(req: NextRequest) {
  try {
    const session = await requireTenantSession();
    const layoutId = req.nextUrl.searchParams.get("layoutId") ?? undefined;
    const snap = await new TenantDataService().getSnapshot(
      session.tenantId,
      layoutId,
    );
    return Response.json({ session, ...snap });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireTenantSession();
    const body = await req.json();

    if (body.campus) {
      const saved = await new TenantDataService().saveCampus({
        tenantId: session.tenantId,
        campus: body.campus as CampusPayload,
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
      return Response.json(saved);
    }

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
