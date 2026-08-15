import type { AuditEvent, Prisma, PrismaClient } from "@prisma/client";
import type { ActorContext } from "@/server/domain/types";

type Db = PrismaClient | Prisma.TransactionClient;

export class AuditRepository {
  constructor(private db: Db) {}

  async append(input: {
    tenantId: string;
    actor: ActorContext;
    action: string;
    entityType: string;
    entityId?: string;
    entityLabel?: string;
    before?: unknown;
    after?: unknown;
  }): Promise<AuditEvent> {
    return this.db.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        actorType: input.actor.type,
        actorId: input.actor.id ?? "",
        actorName: input.actor.name ?? "",
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? "",
        entityLabel: input.entityLabel ?? "",
        before: input.before ? (input.before as Prisma.InputJsonValue) : undefined,
        after: input.after ? (input.after as Prisma.InputJsonValue) : undefined,
        ip: input.actor.ip,
      },
    });
  }

  async listForTenant(
    tenantId: string,
    opts: {
      action?: string;
      q?: string;
      limit?: number;
      before?: Date;
    } = {},
  ) {
    return this.db.auditEvent.findMany({
      where: {
        tenantId,
        ...(opts.action ? { action: opts.action } : {}),
        ...(opts.before ? { createdAt: { lt: opts.before } } : {}),
        ...(opts.q
          ? {
              OR: [
                { actorName: { contains: opts.q, mode: "insensitive" } },
                { entityLabel: { contains: opts.q, mode: "insensitive" } },
                { action: { contains: opts.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 200,
    });
  }

  async listAll(opts: {
    tenantId?: string;
    action?: string;
    q?: string;
    limit?: number;
  } = {}) {
    return this.db.auditEvent.findMany({
      where: {
        ...(opts.tenantId ? { tenantId: opts.tenantId } : {}),
        ...(opts.action ? { action: opts.action } : {}),
        ...(opts.q
          ? {
              OR: [
                { actorName: { contains: opts.q, mode: "insensitive" } },
                { entityLabel: { contains: opts.q, mode: "insensitive" } },
                { action: { contains: opts.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 300,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }
}
