import { NextRequest } from "next/server";
import { requireAuthenticatedEmployee } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";
import { canManageProjectResourcesByRoles } from "@/lib/role-permissions";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedEmployee();
  if (auth.response || !auth.employee) return auth.response;
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") || auth.employee.id;
  if (employeeId !== auth.employee.id && !canManageProjectResourcesByRoles(auth.employee)) {
    return new Response("Forbidden", { status: 403 });
  }
  const weekStart = searchParams.get("weekStart");
  const weekEnd = searchParams.get("weekEnd");
  if (!weekStart || !weekEnd || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !/^\d{4}-\d{2}-\d{2}$/.test(weekEnd)) {
    return new Response("日期范围无效", { status: 400 });
  }
  const from = new Date(`${weekStart}T00:00:00.000Z`);
  const to = new Date(`${weekEnd}T00:00:00.000Z`);
  if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || to <= from || to.valueOf() - from.valueOf() !== 7 * 86400000) {
    return new Response("日期范围无效", { status: 400 });
  }
  const inWeek = { gte: from, lt: to };
  const items = await prisma.workItem.findMany({
    where: {
      assigneeId: employeeId,
      status: { not: "completed" },
      brief: { project: { isArchived: false } },
      OR: [{ firstDraftAt: inWeek }, { revisionAt: inWeek }, { finalAt: inWeek }],
    },
    select: {
      id: true, title: true, firstDraftAt: true, revisionAt: true, finalAt: true,
      brief: { select: { project: { select: { id: true, name: true } } } },
    },
  });
  const rows = items.map((item) => {
    const dates = [
      item.firstDraftAt && { label: "初稿", date: item.firstDraftAt },
      item.revisionAt && { label: "修改", date: item.revisionAt },
      { label: item.firstDraftAt || item.revisionAt ? "终稿" : "截止", date: item.finalAt },
    ].filter((entry): entry is { label: string; date: Date } => Boolean(entry))
      .filter((entry) => entry.date >= from && entry.date < to)
      .sort((left, right) => left.date.valueOf() - right.date.valueOf());
    const next = dates[0];
    return {
      workItemId: item.id,
      workItemName: item.title,
      projectId: item.brief.project.id,
      projectName: item.brief.project.name,
      dateLabel: next ? `${dates.filter((entry) => entry.date.valueOf() === next.date.valueOf()).map((entry) => entry.label).join(" / ")} · ${next.date.toISOString().slice(5, 10).replace("-", "/")}` : "",
      sortDate: next?.date.toISOString() ?? item.finalAt.toISOString(),
    };
  });
  rows.sort((left, right) => left.sortDate.localeCompare(right.sortDate) || left.workItemName.localeCompare(right.workItemName, "zh-CN"));
  return Response.json(rows);
}
