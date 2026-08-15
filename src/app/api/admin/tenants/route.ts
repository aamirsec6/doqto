import { TenantRepository } from "@/server/repositories/TenantRepository";
import { prisma } from "@/server/db/prisma";
import { jsonError, requireDoqtoAdmin } from "@/server/tenancy/guards";

export async function GET() {
  try {
    await requireDoqtoAdmin();
    const tenants = await new TenantRepository(prisma).listAll();
    return Response.json({ tenants });
  } catch (err) {
    return jsonError(err);
  }
}
