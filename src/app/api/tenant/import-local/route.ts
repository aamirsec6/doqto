import { NextRequest } from "next/server";
import { TenantDataService, type LayoutPayload } from "@/server/services/TenantDataService";
import { jsonError, requireTenantSession } from "@/server/tenancy/guards";

export async function POST(req: NextRequest) {
  try {
    const session = await requireTenantSession();
    const body = await req.json();
    const layout = body.layout as LayoutPayload;
    if (!layout?.wardName || !layout?.hospitalName) {
      return Response.json({ error: "Invalid layout payload" }, { status: 400 });
    }
    const saved = await new TenantDataService().saveLayout({
      tenantId: session.tenantId,
      layout,
      actor: {
        type: "device",
        name: "local-import",
        ip: req.headers.get("x-forwarded-for") || undefined,
      },
    });
    return Response.json({ layout: saved, imported: true });
  } catch (err) {
    return jsonError(err);
  }
}
