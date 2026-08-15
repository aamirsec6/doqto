import { prisma } from "@/server/db/prisma";
import { AuditRepository } from "@/server/repositories/AuditRepository";

export class AuditService {
  async listTenant(
    tenantId: string,
    opts: { action?: string; q?: string; limit?: number } = {},
  ) {
    return new AuditRepository(prisma).listForTenant(tenantId, opts);
  }

  async listAll(opts: {
    tenantId?: string;
    action?: string;
    q?: string;
    limit?: number;
  } = {}) {
    return new AuditRepository(prisma).listAll(opts);
  }

  toCsv(
    rows: {
      createdAt: Date;
      tenantId: string;
      action: string;
      actorType: string;
      actorName: string;
      entityType: string;
      entityLabel: string;
      entityId: string;
    }[],
  ) {
    const header = [
      "createdAt",
      "tenantId",
      "action",
      "actorType",
      "actorName",
      "entityType",
      "entityLabel",
      "entityId",
    ];
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.createdAt.toISOString(),
          r.tenantId,
          r.action,
          r.actorType,
          r.actorName,
          r.entityType,
          r.entityLabel,
          r.entityId,
        ]
          .map(escape)
          .join(","),
      ),
    ];
    return lines.join("\n");
  }
}
