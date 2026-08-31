import { NextRequest } from "next/server";
import { UnitBoardService } from "@/server/services/UnitBoardService";
import { jsonError, requireTenantSession } from "@/server/tenancy/guards";

type RouteCtx = { params: Promise<{ layoutId: string }> };

function actorFromSession(session: Awaited<ReturnType<typeof requireTenantSession>>) {
  return {
    type:
      session.role === "hospital_admin"
        ? ("hospital_admin" as const)
        : session.role === "staff"
          ? ("staff" as const)
          : ("device" as const),
    id: session.adminId || session.staffId,
    name: session.staffName || session.email || "device",
  };
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await requireTenantSession();
    const { layoutId } = await ctx.params;
    const board = await new UnitBoardService().getBoard(session.tenantId, layoutId);
    return Response.json(board);
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const session = await requireTenantSession();
    const { layoutId } = await ctx.params;
    const body = await req.json();
    const svc = new UnitBoardService();
    const actor = actorFromSession(session);

    if (body.action === "bed") {
      const result = await svc.setBedStatus(
        session.tenantId,
        layoutId,
        String(body.bedId),
        body.status,
        body.patientInitials,
        actor,
      );
      return Response.json(result);
    }

    if (body.action === "staff") {
      const result = await svc.setStaffStatus(
        session.tenantId,
        layoutId,
        String(body.staffId),
        body.status,
        body.roomKey,
        actor,
      );
      return Response.json(result);
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    if (err instanceof Error) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return jsonError(err);
  }
}
