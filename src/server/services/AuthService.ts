import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { AuditRepository } from "@/server/repositories/AuditRepository";
import { TenantRepository } from "@/server/repositories/TenantRepository";
import type { ActorContext } from "@/server/domain/types";

export class AuthService {
  async registerHospital(input: {
    hospitalName: string;
    adminEmail: string;
    adminPassword: string;
    adminName?: string;
    actor: ActorContext;
  }) {
    if (input.adminPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    return prisma.$transaction(async (tx) => {
      const tenants = new TenantRepository(tx);
      const audits = new AuditRepository(tx);
      const tenant = await tenants.create({ name: input.hospitalName });
      const passwordHash = await bcrypt.hash(input.adminPassword, 12);
      const admin = await tx.adminUser.create({
        data: {
          tenantId: tenant.id,
          email: input.adminEmail.trim().toLowerCase(),
          passwordHash,
          name: input.adminName?.trim() || "Hospital admin",
        },
      });
      await audits.append({
        tenantId: tenant.id,
        actor: input.actor,
        action: "tenant.register",
        entityType: "tenant",
        entityId: tenant.id,
        entityLabel: tenant.name,
        after: {
          slug: tenant.slug,
          inviteCode: tenant.inviteCode,
          adminEmail: admin.email,
        },
      });
      return { tenant, admin };
    });
  }

  async loginAdmin(input: {
    email: string;
    password: string;
    actor: ActorContext;
  }) {
    const email = input.email.trim().toLowerCase();
    const admin = await prisma.adminUser.findFirst({
      where: { email },
      include: { tenant: true },
    });
    if (!admin) throw new Error("Invalid email or password");
    const ok = await bcrypt.compare(input.password, admin.passwordHash);
    if (!ok) throw new Error("Invalid email or password");

    await new AuditRepository(prisma).append({
      tenantId: admin.tenantId,
      actor: { ...input.actor, id: admin.id, name: admin.name || admin.email },
      action: "auth.admin_login",
      entityType: "admin",
      entityId: admin.id,
      entityLabel: admin.email,
    });

    return { admin, tenant: admin.tenant };
  }

  async joinByInvite(input: { inviteCode: string; actor: ActorContext }) {
    const tenant = await new TenantRepository(prisma).findByInviteCode(
      input.inviteCode,
    );
    if (!tenant) throw new Error("Invalid invite code");

    await new AuditRepository(prisma).append({
      tenantId: tenant.id,
      actor: input.actor,
      action: "auth.join",
      entityType: "tenant",
      entityId: tenant.id,
      entityLabel: tenant.name,
    });

    return tenant;
  }

  async loginDoqtoAdmin(passcode: string) {
    const expected =
      process.env.DOQTO_ADMIN_PASS?.trim() ||
      process.env.NEXT_PUBLIC_DOQTO_ADMIN_PASS?.trim() ||
      "doqto-internal";
    if (passcode !== expected) throw new Error("Invalid passcode");
    return true;
  }
}
