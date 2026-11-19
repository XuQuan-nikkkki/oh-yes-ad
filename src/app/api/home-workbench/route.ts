import { NextRequest } from "next/server";
import { requireAuthenticatedEmployee } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedEmployee();
  if (auth.response || !auth.employee) return auth.response;
  const employeeId = auth.employee.id;
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart");
  const weekEnd = searchParams.get("weekEnd");
  if (!weekStart || !weekEnd || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !/^\d{4}-\d{2}-\d{2}$/.test(weekEnd)) {
    return new Response("工时周范围无效", { status: 400 });
  }
  const from = new Date(`${weekStart}T00:00:00+08:00`);
  const to = new Date(`${weekEnd}T00:00:00+08:00`);
  const todayInShanghai = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const milestoneStart = new Date(`${todayInShanghai}T00:00:00+08:00`);
  if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || to <= from || to.valueOf() - from.valueOf() > 8 * 86400000) {
    return new Response("工时周范围无效", { status: 400 });
  }

  const [projects, workItems, milestones, actualWorkEntries] = await Promise.all([
    prisma.project.findMany({
      where: {
        isArchived: false,
        OR: [
          { members: { some: { id: employeeId } } },
          { ownerId: employeeId },
          { briefs: { some: { workItems: { some: { assigneeId: employeeId } } } } },
        ],
      },
      select: { id: true, name: true, ownerId: true, statusOption: { select: { value: true, color: true } }, briefs: { select: { workItems: { where: { assigneeId: employeeId, status: { not: "completed" } }, select: { id: true } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.workItem.findMany({
      where: {
        assigneeId: employeeId,
        brief: { project: { isArchived: false } },
        OR: [
          { status: { not: "completed" } },
          {
            status: "completed",
            finalAt: {
              gte: new Date(`${weekStart}T00:00:00.000Z`),
              lt: new Date(`${weekEnd}T00:00:00.000Z`),
            },
          },
        ],
      },
      select: {
        id: true, title: true, type: true, status: true, submissionEnabled: true,
        firstDraftAt: true, revisionAt: true, finalAt: true,
        brief: { select: { id: true, title: true, project: { select: { id: true, name: true } } } },
        submissions: { take: 1, orderBy: [{ versionNumber: "desc" }], select: { id: true, versionNumber: true, versionTitle: true, submittedAt: true, submittedBy: { select: { name: true } } } },
      },
      orderBy: [{ finalAt: "asc" }, { title: "asc" }],
    }),
    prisma.projectMilestone.findMany({
      where: { startAt: { gte: milestoneStart }, project: { isArchived: false }, internalParticipants: { some: { id: employeeId } } },
      select: {
        id: true, name: true, startAt: true, datePrecision: true, location: true, detail: true,
        project: { select: { id: true, name: true } },
        typeOption: { select: { id: true, value: true, color: true } },
        methodOption: { select: { value: true } },
        internalParticipants: { select: { id: true, name: true } },
        clientParticipants: { select: { id: true, name: true, title: true } },
        vendorParticipants: { select: { id: true, name: true } },
      },
      orderBy: [{ startAt: "asc" }, { name: "asc" }],
    }),
    prisma.actualWorkEntry.findMany({
      where: { employeeId, startDate: { gte: from, lt: to } },
      select: { id: true, title: true, startDate: true, endDate: true, project: { select: { id: true, name: true } } },
      orderBy: { startDate: "asc" },
    }),
  ]);
  return Response.json({
    projects: projects.map((project) => ({ ...project, personalOpenWorkItemCount: project.briefs.reduce((count, brief) => count + brief.workItems.length, 0), briefs: undefined })),
    workItems,
    milestones: milestones.map(({ startAt, methodOption, typeOption, ...milestone }) => ({ ...milestone, date: startAt, method: methodOption?.value ?? null, type: typeOption?.value ?? null, typeOption })),
    actualWorkEntries,
  });
}
