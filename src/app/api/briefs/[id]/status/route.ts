import { NextRequest } from "next/server";
import { requireProjectWritePermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";
import { sanitizeRequestBody } from "@/lib/sanitize-request-body";
import { getBriefStatusError } from "@/lib/brief-status";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireProjectWritePermission();
  if (denied) return denied;
  const body = await sanitizeRequestBody(req);
  if (typeof body?.status !== "string" || !["waiting_assignment", "in_progress", "completed", "paused"].includes(body.status)) {
    return new Response("需求单状态无效", { status: 400 });
  }
  const { id } = await params;
  try {
    return await prisma.$transaction(async (tx) => {
      const brief = await tx.brief.findUnique({
        where: { id },
        select: { workItems: { select: { status: true } } },
      });
      if (!brief) return new Response("需求单不存在", { status: 404 });
      const error = getBriefStatusError(brief.workItems, body.status);
      if (error) return new Response(error, { status: 409 });
      await tx.brief.update({ where: { id }, data: { status: body.status } });
      return Response.json({ id, status: body.status });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      return new Response("需求单内容已发生变化，请刷新后重试", { status: 409 });
    }
    throw error;
  }
}
