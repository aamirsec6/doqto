import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export class FloorRepository {
  constructor(private db: Db) {}

  list(tenantId: string) {
    return this.db.floor.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      include: {
        layouts: { orderBy: { wardName: "asc" } },
      },
    });
  }

  create(
    tenantId: string,
    data: { label: string; building?: string; sortOrder?: number },
  ) {
    return this.db.floor.create({
      data: {
        tenantId,
        label: data.label,
        building: data.building ?? "",
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  upsert(
    tenantId: string,
    id: string,
    data: { label: string; building?: string; sortOrder?: number },
  ) {
    return this.db.floor.upsert({
      where: { id },
      create: {
        id,
        tenantId,
        label: data.label,
        building: data.building ?? "",
        sortOrder: data.sortOrder ?? 0,
      },
      update: {
        label: data.label,
        building: data.building ?? "",
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  deleteExcept(tenantId: string, keepIds: string[]) {
    return this.db.floor.deleteMany({
      where: {
        tenantId,
        id: keepIds.length ? { notIn: keepIds } : undefined,
      },
    });
  }
}
