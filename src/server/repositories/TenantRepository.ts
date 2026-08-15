import type { Prisma, PrismaClient, Tenant } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "hospital"
  );
}

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export class TenantRepository {
  constructor(private db: Db) {}

  async findByInviteCode(code: string): Promise<Tenant | null> {
    return this.db.tenant.findUnique({
      where: { inviteCode: code.trim().toUpperCase() },
    });
  }

  async findById(id: string) {
    return this.db.tenant.findUnique({ where: { id } });
  }

  async listAll() {
    return this.db.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { staff: true, incidents: true, audits: true } } },
    });
  }

  async create(input: { name: string; slug?: string }): Promise<Tenant> {
    const base = input.slug || slugify(input.name);
    let slug = base;
    let n = 0;
    while (await this.db.tenant.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${base}-${n}`;
    }
    let code = inviteCode();
    while (await this.db.tenant.findUnique({ where: { inviteCode: code } })) {
      code = inviteCode();
    }
    return this.db.tenant.create({
      data: {
        name: input.name.trim(),
        slug,
        inviteCode: code,
      },
    });
  }
}
