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

  get(tenantId: string) {
    return this.db.wardLayout.findUnique({ where: { tenantId } });
  }

  upsert(
    tenantId: string,
    data: {
      hospitalName: string;
      contactName: string;
      contactRole: string;
      wardName: string;
      wardType: string;
      floorLabel: string;
      layoutStyle: string;
      trackAssets: boolean;
      zonesJson: unknown;
    },
  ) {
    return this.db.wardLayout.upsert({
      where: { tenantId },
      create: {
        tenantId,
        hospitalName: data.hospitalName,
        contactName: data.contactName,
        contactRole: data.contactRole,
        wardName: data.wardName,
        wardType: data.wardType,
        floorLabel: data.floorLabel,
        layoutStyle: data.layoutStyle,
        trackAssets: data.trackAssets,
        zonesJson: data.zonesJson as Prisma.InputJsonValue,
      },
      update: {
        hospitalName: data.hospitalName,
        contactName: data.contactName,
        contactRole: data.contactRole,
        wardName: data.wardName,
        wardType: data.wardType,
        floorLabel: data.floorLabel,
        layoutStyle: data.layoutStyle,
        trackAssets: data.trackAssets,
        zonesJson: data.zonesJson as Prisma.InputJsonValue,
      },
    });
  }

  async replaceRooms(
    tenantId: string,
    rooms: { key: string; label: string; kind: string; path: string }[],
  ) {
    await this.db.room.deleteMany({ where: { tenantId } });
    if (rooms.length) {
      await this.db.room.createMany({
        data: rooms.map((r) => ({ ...r, tenantId })),
      });
    }
  }

  listRooms(tenantId: string) {
    return this.db.room.findMany({ where: { tenantId }, orderBy: { label: "asc" } });
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
