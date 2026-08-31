import { NextRequest } from "next/server";
import { setSessionCookie, getSession } from "@/server/auth/session";
import { UnitBoardService } from "@/server/services/UnitBoardService";
import { prisma } from "@/server/db/prisma";
import { jsonError, requireTenantSession } from "@/server/tenancy/guards";

export async function GET() {
  try {
    const session = await requireTenantSession();
    const staff = await prisma.staffMember.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { name: "asc" },
      select: { externalId: true, name: true, role: true, layoutId: true },
    });
    return Response.json({ staff });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireTenantSession();
    const body = await req.json();
    const staff = await new UnitBoardService().loginStaff(
      session.tenantId,
      String(body.staffId || ""),
      String(body.pin || ""),
    );

    const existing = await getSession();
    await setSessionCookie({
      ...existing,
      role: "staff",
      tenantId: session.tenantId,
      staffId: staff.externalId,
      staffName: staff.name,
      staffRole: staff.role,
    });

    return Response.json({
      ok: true,
      staff: {
        id: staff.externalId,
        name: staff.name,
        role: staff.role,
        layoutId: staff.layoutId,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      return Response.json({ error: err.message }, { status: 401 });
    }
    return jsonError(err);
  }
}
