import { prisma } from "@/server/db/prisma";
import { jsonError, requireDoqtoAdmin } from "@/server/tenancy/guards";

/** Wipe all tenant data (pilot reset). Requires DOQTO admin session. */
export async function POST() {
  try {
    await requireDoqtoAdmin();
    await prisma.$transaction([
      prisma.auditEvent.deleteMany(),
      prisma.message.deleteMany(),
      prisma.alert.deleteMany(),
      prisma.incident.deleteMany(),
      prisma.bed.deleteMany(),
      prisma.asset.deleteMany(),
      prisma.staffMember.deleteMany(),
      prisma.room.deleteMany(),
      prisma.wardLayout.deleteMany(),
      prisma.floor.deleteMany(),
      prisma.adminUser.deleteMany(),
      prisma.tenant.deleteMany(),
    ]);
    return Response.json({ wiped: true });
  } catch (err) {
    return jsonError(err);
  }
}
