import { NextRequest } from "next/server";
import { subscribeUnitRevision } from "@/server/realtime/unitBus";
import { UnitBoardService } from "@/server/services/UnitBoardService";
import { requireTenantSession } from "@/server/tenancy/guards";

type RouteCtx = { params: Promise<{ layoutId: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  let session;
  try {
    session = await requireTenantSession();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { layoutId } = await ctx.params;
  const tenantId = session.tenantId;
  const encoder = new TextEncoder();

  let revision = 0;
  try {
    const initial = await new UnitBoardService().getBoard(tenantId, layoutId);
    revision = initial.revision;
  } catch {
    return new Response("Unit not found", { status: 404 });
  }

  let closed = false;
  let unsubscribe = () => {};
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = async (rev: number) => {
        if (closed) return;
        try {
          const { ward, revision: r } = await new UnitBoardService().getBoard(
            tenantId,
            layoutId,
          );
          revision = r;
          controller.enqueue(
            encoder.encode(
              `event: board\ndata: ${JSON.stringify({ revision: r, ward })}\n\n`,
            ),
          );
        } catch {
          controller.enqueue(
            encoder.encode(`event: error\ndata: {"message":"refresh failed"}\n\n`),
          );
        }
      };

      await send(revision);
      controller.enqueue(encoder.encode(`event: ready\ndata: {"revision":${revision}}\n\n`));

      unsubscribe = subscribeUnitRevision(layoutId, (payload) => {
        if (payload.revision > revision) void send(payload.revision);
      });

      pollTimer = setInterval(() => {
        void send(revision);
      }, 5000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        unsubscribe();
        if (pollTimer) clearInterval(pollTimer);
        controller.close();
      });
    },
    cancel() {
      closed = true;
      unsubscribe();
      if (pollTimer) clearInterval(pollTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
