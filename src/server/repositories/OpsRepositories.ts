import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export class StaffRepository {
  constructor(private db: Db) {}

  list(tenantId: string) {
    return this.db.staffMember.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  }

  find(tenantId: string, id: string) {
    return this.db.staffMember.findFirst({ where: { tenantId, id } });
  }

  async upsertMany(
    tenantId: string,
    rows: {
      externalId: string;
      name: string;
      role: string;
      status?: string;
      roomKey?: string;
      posX?: number;
      posY?: number;
      lastSeenMin?: number;
    }[],
  ) {
    for (const row of rows) {
      await this.db.staffMember.upsert({
        where: {
          tenantId_externalId: { tenantId, externalId: row.externalId },
        },
        create: {
          tenantId,
          externalId: row.externalId,
          name: row.name,
          role: row.role,
          status: row.status ?? "free",
          roomKey: row.roomKey ?? "",
          posX: row.posX ?? 0,
          posY: row.posY ?? 0,
          lastSeenMin: row.lastSeenMin ?? 0,
        },
        update: {
          name: row.name,
          role: row.role,
          status: row.status,
          roomKey: row.roomKey,
          posX: row.posX,
          posY: row.posY,
          lastSeenMin: row.lastSeenMin,
        },
      });
    }
  }

  setStatus(tenantId: string, id: string, status: string, roomKey?: string) {
    return this.db.staffMember.updateMany({
      where: { tenantId, id },
      data: {
        status,
        ...(roomKey !== undefined ? { roomKey } : {}),
      },
    });
  }
}

export class IncidentRepository {
  constructor(private db: Db) {}

  listActive(tenantId: string) {
    return this.db.incident.findMany({
      where: { tenantId, lifecycle: { not: "resolved" } },
      orderBy: { raisedAt: "desc" },
    });
  }

  list(tenantId: string, limit = 50) {
    return this.db.incident.findMany({
      where: { tenantId },
      orderBy: { raisedAt: "desc" },
      take: limit,
    });
  }

  find(tenantId: string, id: string) {
    return this.db.incident.findFirst({ where: { tenantId, id } });
  }

  create(
    tenantId: string,
    data: Prisma.IncidentCreateWithoutTenantInput,
  ) {
    return this.db.incident.create({
      data: { ...data, tenantId },
    });
  }

  update(tenantId: string, id: string, data: Prisma.IncidentUpdateInput) {
    return this.db.incident.updateMany({
      where: { tenantId, id },
      data,
    });
  }
}

export class MessageRepository {
  constructor(private db: Db) {}

  list(tenantId: string, limit = 200) {
    return this.db.message.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  createMany(tenantId: string, rows: Prisma.MessageCreateManyInput[]) {
    return this.db.message.createMany({
      data: rows.map((r) => ({ ...r, tenantId })),
    });
  }

  create(tenantId: string, data: Prisma.MessageCreateWithoutTenantInput) {
    return this.db.message.create({
      data: { ...data, tenantId },
    });
  }
}

export class LayoutRepository {
  constructor(private db: Db) {}

  getById(layoutId: string) {
    return this.db.wardLayout.findUnique({
      where: { id: layoutId },
      include: { floor: true },
    });
  }

  listForTenant(tenantId: string) {
    return this.db.wardLayout.findMany({
      where: { tenantId },
      include: { floor: true },
      orderBy: [{ floor: { sortOrder: "asc" } }, { wardName: "asc" }],
    });
  }

  /** @deprecated use getById */
  get(tenantId: string) {
    return this.db.wardLayout.findFirst({
      where: { tenantId },
      include: { floor: true },
    });
  }

  upsertForFloor(
    tenantId: string,
    floorId: string,
    layoutId: string | undefined,
    data: {
      hospitalName: string;
      contactName: string;
      contactRole: string;
      wardName: string;
      wardType: string;
      unitKind?: string;
      floorLabel: string;
      layoutStyle: string;
      trackAssets: boolean;
      zonesJson: unknown;
      calibrationJson?: unknown | null;
      mapVersion?: number;
    },
  ) {
    const payload = {
      hospitalName: data.hospitalName,
      contactName: data.contactName,
      contactRole: data.contactRole,
      wardName: data.wardName,
      wardType: data.wardType,
      unitKind: data.unitKind ?? data.wardType,
      floorLabel: data.floorLabel,
      layoutStyle: data.layoutStyle,
      trackAssets: data.trackAssets,
      zonesJson: data.zonesJson as Prisma.InputJsonValue,
      calibrationJson: data.calibrationJson as Prisma.InputJsonValue | undefined,
      mapVersion: data.mapVersion ?? 2,
    };

    return this.db.wardLayout.upsert({
      where: {
        floorId_wardName: { floorId, wardName: data.wardName },
      },
      create: {
        ...(layoutId ? { id: layoutId } : {}),
        tenantId,
        floorId,
        ...payload,
      },
      update: payload,
    });
  }

  async replaceRooms(
    tenantId: string,
    layoutId: string,
    rooms: {
      key: string;
      label: string;
      kind: string;
      path: string;
      parentKey?: string | null;
      verticesJson?: unknown | null;
    }[],
  ) {
    await this.db.room.deleteMany({ where: { layoutId } });
    if (rooms.length) {
      await this.db.room.createMany({
        data: rooms.map((r) => ({
          tenantId,
          layoutId,
          key: r.key,
          label: r.label,
          kind: r.kind,
          path: r.path,
          parentKey: r.parentKey ?? null,
          verticesJson: r.verticesJson as Prisma.InputJsonValue | undefined,
        })),
      });
    }
  }

  listRooms(layoutId: string) {
    return this.db.room.findMany({
      where: { layoutId },
      orderBy: { label: "asc" },
    });
  }

  listRoomsForTenant(tenantId: string) {
    return this.db.room.findMany({ where: { tenantId }, orderBy: { label: "asc" } });
  }

  deleteLayoutsExcept(tenantId: string, keepIds: string[]) {
    return this.db.wardLayout.deleteMany({
      where: {
        tenantId,
        id: keepIds.length ? { notIn: keepIds } : undefined,
      },
    });
  }
}

export class AlertRepository {
  constructor(private db: Db) {}

  list(tenantId: string) {
    return this.db.alert.findMany({
      where: { tenantId },
      orderBy: { raisedAt: "desc" },
      take: 100,
    });
  }

  create(tenantId: string, data: Prisma.AlertCreateWithoutTenantInput) {
    return this.db.alert.create({ data: { ...data, tenantId } });
  }

  update(tenantId: string, id: string, data: Prisma.AlertUpdateInput) {
    return this.db.alert.updateMany({ where: { tenantId, id }, data });
  }

  findByExternal(tenantId: string, externalId: string) {
    return this.db.alert.findFirst({ where: { tenantId, externalId } });
  }
}
