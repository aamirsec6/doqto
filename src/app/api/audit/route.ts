import { NextRequest } from "next/server";
import { AuditService } from "@/server/services/AuditService";
import {
  jsonError,
  requireDoqtoAdmin,
  requireTenantSession,
} from "@/server/tenancy/guards";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "tenant";
    const action = searchParams.get("action") || undefined;
    const q = searchParams.get("q") || undefined;
    const format = searchParams.get("format") || "json";
    const limit = Number(searchParams.get("limit") || 200);
    const svc = new AuditService();

    if (scope === "all") {
      await requireDoqtoAdmin();
      const tenantId = searchParams.get("tenantId") || undefined;
      const rows = await svc.listAll({ tenantId, action, q, limit });
      if (format === "csv") {
        const csv = svc.toCsv(
          rows.map((r) => ({
            createdAt: r.createdAt,
            tenantId: r.tenantId,
            action: r.action,
            actorType: r.actorType,
            actorName: r.actorName,
            entityType: r.entityType,
            entityLabel: r.entityLabel,
            entityId: r.entityId,
          })),
        );
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="doqto-audit-all.csv"',
          },
        });
      }
      return Response.json({ rows });
    }

    const session = await requireTenantSession();
    const rows = await svc.listTenant(session.tenantId, { action, q, limit });
    if (format === "csv") {
      const csv = svc.toCsv(
        rows.map((r) => ({
          createdAt: r.createdAt,
          tenantId: r.tenantId,
          action: r.action,
          actorType: r.actorType,
          actorName: r.actorName,
          entityType: r.entityType,
          entityLabel: r.entityLabel,
          entityId: r.entityId,
        })),
      );
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="hospital-audit.csv"',
        },
      });
    }
    return Response.json({ rows });
  } catch (err) {
    return jsonError(err);
  }
}
