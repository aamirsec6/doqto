import { NextRequest } from "next/server";
import type { IncidentCode } from "@/server/domain/types";
import { IncidentService } from "@/server/services/IncidentService";
import { jsonError, requireTenantSession } from "@/server/tenancy/guards";

function actorFromSession(session: {
  role: string;
  adminId?: string;
  staffId?: string;
  staffName?: string;
  email?: string;
}) {
  return {
    type:
      session.role === "hospital_admin"
        ? ("hospital_admin" as const)
        : session.role === "staff"
          ? ("staff" as const)
          : ("device" as const),
    id: session.adminId || session.staffId,
    name: session.staffName || session.email || "ops",
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireTenantSession();
    const body = await req.json();
    const action = String(body.action || "raise");
    const svc = new IncidentService();

    if (action === "raise") {
      const result = await svc.raise({
        tenantId: session.tenantId,
        code: String(body.code || "code_blue") as IncidentCode,
        roomKey: String(body.roomKey || ""),
        roomLabel: body.roomLabel ? String(body.roomLabel) : undefined,
        sourceWard: body.sourceWard ? String(body.sourceWard) : undefined,
        title: body.title ? String(body.title) : undefined,
        detail: body.detail ? String(body.detail) : undefined,
        pageStaffIds: Array.isArray(body.pageStaffIds)
          ? body.pageStaffIds.map(String)
          : undefined,
        actor: actorFromSession(session),
      });
      return Response.json(result);
    }

    if (action === "acknowledge") {
      const incident = await svc.acknowledge({
        tenantId: session.tenantId,
        incidentId: String(body.incidentId || ""),
        staffId: body.staffId ? String(body.staffId) : session.staffId,
        staffName: String(
          body.staffName || session.staffName || session.email || "Staff",
        ),
        actor: actorFromSession(session),
      });
      return Response.json({ incident });
    }

    if (action === "resolve") {
      const incident = await svc.resolve({
        tenantId: session.tenantId,
        incidentId: String(body.incidentId || ""),
        resolvedBy: body.resolvedBy
          ? String(body.resolvedBy)
          : session.staffName || session.email,
        actor: actorFromSession(session),
      });
      return Response.json({ incident });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    return jsonError(err);
  }
}
