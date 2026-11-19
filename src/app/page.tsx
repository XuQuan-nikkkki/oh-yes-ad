"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AppstoreOutlined, ArrowRightOutlined, ClockCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Drawer, Empty, Space, Spin, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import isoWeek from "dayjs/plugin/isoWeek";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import HomeSiteMap from "@/components/home/HomeSiteMap";
import MilestoneCard, { type MilestoneCardRow } from "@/components/project-detail/MilestoneCard";
import ProjectBriefProgressContent, { type ProjectBrief, type ProjectBriefWorkItem } from "@/components/project-detail/ProjectBriefProgressContent";
import WorkItemEditModal from "@/components/project-detail/WorkItemEditModal";
import type { WorkItemEditPayload } from "@/components/project-detail/WorkItemEditForm";
import WorkLogsCalendar from "@/components/work-logs/WorkLogsCalendar";
import { getActualWorkEntryHours } from "@/lib/actual-workdays";
import { canManageProjectResources } from "@/lib/role-permissions";
import { getRoleCodesFromUser, useAuthStore } from "@/stores/authStore";
import { useEmployeesStore } from "@/stores/employeesStore";
import { useNavigationStore } from "@/stores/navigationStore";
import "./home-workbench.css";

dayjs.extend(isoWeek);

type HomeProject = { id: string; name: string; ownerId: string | null; personalOpenWorkItemCount: number; statusOption?: { value: string; color?: string | null } | null };
type HomeWorkItem = { id: string; title: string; type: string; status: string; submissionEnabled: boolean; firstDraftAt?: string | null; revisionAt?: string | null; finalAt: string; brief: { id: string; title: string; project: { id: string; name: string } }; submissions: Array<{ id: string; versionNumber: number; versionTitle?: string | null; submittedAt: string; submittedBy: { name: string } }> };
type HomeMilestone = MilestoneCardRow & { project: { id: string; name: string }; date: string | null };
type ActualEntry = { id: string; startDate: string; endDate: string; project: { id: string; name: string } };
type HomeData = { projects: HomeProject[]; workItems: HomeWorkItem[]; milestones: HomeMilestone[]; actualWorkEntries: ActualEntry[] };
type DateNode = { label: "初稿" | "修改" | "终稿" | "截止"; date: string };

const dayKey = (date: string) => dayjs(date).format("YYYY-MM-DD");
const dateNodes = (item: HomeWorkItem): DateNode[] => {
  if (!item.firstDraftAt && !item.revisionAt) return [{ label: "截止", date: item.finalAt }];
  const nodes: DateNode[] = [];
  if (item.firstDraftAt) nodes.push({ label: "初稿", date: item.firstDraftAt });
  if (item.revisionAt) nodes.push({ label: "修改", date: item.revisionAt });
  nodes.push({ label: "终稿", date: item.finalAt });
  return nodes;
};
const focusNodes = (item: HomeWorkItem, today: string) => {
  const nodes = dateNodes(item);
  if (item.status === "completed" || dayKey(item.finalAt) < today) return nodes.slice(-1);
  const next = nodes.find((node) => dayKey(node.date) >= today);
  return nodes.filter((node) => dayKey(node.date) === dayKey(next?.date ?? item.finalAt));
};
const hoursText = (value: number) => Number(value.toFixed(1)).toString();

function HomePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const employees = useEmployeesStore((state) => state.employees);
  const fetchEmployees = useEmployeesStore((state) => state.fetchEmployees);
  const setNavigating = useNavigationStore((state) => state.setNavigating);
  const roleCodes = useMemo(() => getRoleCodesFromUser(currentUser), [currentUser]);
  const canManageProject = canManageProjectResources(roleCodes);
  const canViewOwnedProjects = roleCodes.includes("PROJECT_MANAGER");
  const canViewWork = roleCodes.includes("ADMIN") || (!roleCodes.includes("HR") && !roleCodes.includes("FINANCE"));
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllWork, setShowAllWork] = useState(false);
  const [selectedWork, setSelectedWork] = useState<HomeWorkItem | null>(null);
  const [selectedBrief, setSelectedBrief] = useState<ProjectBrief | null>(null);
  const [editingWorkItem, setEditingWorkItem] = useState<ProjectBriefWorkItem | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [createWorkLogRequest, setCreateWorkLogRequest] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();
  const allowedTabs = new Set(["site-map", ...(canViewOwnedProjects ? ["owned-projects"] : []), ...(canViewWork ? ["participation", "participation-milestones", "work-logs"] : [])]);
  const activeTab = searchParams.get("tab");
  const drawer = activeTab && allowedTabs.has(activeTab) ? activeTab : null;
  const today = dayjs().format("YYYY-MM-DD");
  const weekStart = dayjs().startOf("isoWeek");
  const weekEnd = weekStart.add(7, "day");
  const weekStartKey = weekStart.format("YYYY-MM-DD");
  const weekEndKey = weekEnd.format("YYYY-MM-DD");

  const loadHome = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/home-workbench?weekStart=${weekStartKey}&weekEnd=${weekEndKey}`, { cache: "no-store" });
      if (!response.ok) throw new Error((await response.text()) || "首页加载失败");
      setData(await response.json() as HomeData);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "首页加载失败");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, weekStartKey, weekEndKey]);
  useEffect(() => { void loadHome(); }, [loadHome]);

  const setDrawer = (next: string | null) => {
    if (next !== "work-logs") setCreateWorkLogRequest(0);
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("tab", next); else params.delete("tab");
    if (next !== "work-logs") { params.delete("workLogView"); params.delete("workLogDate"); }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const openWork = async (item: HomeWorkItem) => {
    setSelectedWork(item);
    setSelectedBrief(null);
    setBriefLoading(true);
    try {
      const response = await fetch(`/api/briefs/${item.brief.id}`, { cache: "no-store" });
      if (!response.ok) throw new Error((await response.text()) || "需求单加载失败");
      setSelectedBrief(await response.json() as ProjectBrief);
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : "需求单加载失败");
    } finally { setBriefLoading(false); }
  };
  const refreshBrief = async () => {
    if (!selectedWork) return;
    const response = await fetch(`/api/briefs/${selectedWork.brief.id}`, { cache: "no-store" });
    if (!response.ok) throw new Error("需求单刷新失败");
    setSelectedBrief(await response.json() as ProjectBrief);
    await loadHome();
  };
  const openWorkItemEditor = async (workItem: ProjectBriefWorkItem) => {
    await fetchEmployees();
    setEditingWorkItem(workItem);
  };
  const saveWorkItem = async (payload: WorkItemEditPayload) => {
    if (!editingWorkItem) return;
    try {
      const response = await fetch(`/api/work-items/${editingWorkItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error((await response.text()) || "更新工作项失败");
      messageApi.success("工作项已更新");
      setEditingWorkItem(null);
      await refreshBrief();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "保存工作项失败，请重试");
    }
  };
  const openCalendar = (record = false) => {
    setDrawer("work-logs");
    if (record) setCreateWorkLogRequest((value) => value + 1);
  };

  const workItems = data?.workItems ?? [];
  const visibleWork = showAllWork ? workItems : workItems.filter((item) => item.status !== "completed" && (dayKey(item.finalAt) < today || dayKey(focusNodes(item, today)[0].date) < weekEndKey));
  const groups = [
    { label: "已逾期", key: "overdue", color: "#ef5656", items: visibleWork.filter((item) => item.status !== "completed" && dayKey(item.finalAt) < today) },
    { label: "今天到期", key: "today", color: "#ee963b", items: visibleWork.filter((item) => item.status !== "completed" && dayKey(item.finalAt) >= today && dayKey(focusNodes(item, today)[0].date) === today) },
    { label: "本周内", key: "week", color: "#2974e6", items: visibleWork.filter((item) => item.status !== "completed" && dayKey(focusNodes(item, today)[0].date) > today && dayKey(focusNodes(item, today)[0].date) < weekEndKey) },
    { label: "之后", key: "later", color: "#8d9aae", items: visibleWork.filter((item) => item.status !== "completed" && dayKey(focusNodes(item, today)[0].date) >= weekEndKey) },
    { label: "已完成", key: "completed", color: "#8d9aae", items: visibleWork.filter((item) => item.status === "completed") },
  ].filter((group) => group.items.length > 0);
  const futureMilestones = (data?.milestones ?? []).filter((item) => item.date && dayKey(item.date) >= today).sort((left, right) => (left.date ?? "").localeCompare(right.date ?? ""));
  const recentMilestones = futureMilestones.filter((item) => item.date && dayKey(item.date) <= dayjs().add(2, "day").format("YYYY-MM-DD"));
  const entries = data?.actualWorkEntries ?? [];
  const dailyHours = Array.from({ length: 7 }, (_, index) => {
    const date = weekStart.add(index, "day").format("YYYY-MM-DD");
    return { date, hours: entries.filter((entry) => dayKey(entry.startDate) === date).reduce((sum, entry) => sum + getActualWorkEntryHours(entry.startDate, entry.endDate), 0) };
  });
  const totalHours = dailyHours.reduce((sum, item) => sum + item.hours, 0);
  const projectHours = Array.from(entries.reduce((map, entry) => {
    const previous = map.get(entry.project.id);
    map.set(entry.project.id, { project: entry.project, hours: (previous?.hours ?? 0) + getActualWorkEntryHours(entry.startDate, entry.endDate) });
    return map;
  }, new Map<string, { project: ActualEntry["project"]; hours: number }>()).values()).sort((left, right) => right.hours - left.hours);

  const workRow = (item: HomeWorkItem) => {
    const highlighted = focusNodes(item, today);
    const latest = item.submissions[0];
    const overdue = item.status !== "completed" && dayKey(item.finalAt) < today;
    const typeLabel: Record<string, string> = { DESIGN: "设计", COPY: "文案", PROJECT_MANAGEMENT: "项目管理", NEW_MEDIA: "新媒体" };
    const typeColor: Record<string, string> = { DESIGN: "purple", COPY: "orange", PROJECT_MANAGEMENT: "blue", NEW_MEDIA: "cyan" };
    return <div className="home-work-row" key={item.id}>
      <div className="home-work-main"><div className="home-work-name"><button onClick={() => void openWork(item)}>{item.title}</button><Tag color={typeColor[item.type]}>{typeLabel[item.type] ?? item.type}</Tag></div><button className="home-work-context" onClick={() => void openWork(item)}>{item.brief.project.name}　›　{item.brief.title}</button>{item.submissionEnabled ? <div className={`home-work-submission ${latest ? "" : "is-empty"}`}>{latest ? `最近提交 V${latest.versionNumber}${latest.versionTitle ? ` · ${latest.versionTitle}` : ""} · ${dayjs(latest.submittedAt).format("M/D HH:mm")} · ${latest.submittedBy.name}` : "尚未提交"}</div> : null}</div>
      <div className="home-work-dates" aria-label="日期安排">{dateNodes(item).map((node) => <div key={node.label} className={`${highlighted.some((focus) => focus.label === node.label) ? "is-focused" : ""} ${overdue ? "is-overdue" : ""}`} style={{ gridColumn: { 初稿: 1, 修改: 2, 终稿: 3, 截止: 3 }[node.label] }}><span>{node.label}</span><strong>{dayjs(node.date).format("M/D")}</strong></div>)}</div>
      <Button size="small" onClick={() => void openWork(item)}>打开工作项</Button>
    </div>;
  };
  const milestoneRow = (item: HomeMilestone) => {
    return <MilestoneCard key={item.id} milestone={item} projectName={item.project.name} />;
  };

  return <div className="home-workbench">
    {contextHolder}
    <div className="home-heading"><div><h1>我的工作台</h1><p>{dayjs().locale("zh-cn").format("YYYY年M月D日 ddd")} · <span>{groups.find((group) => group.key === "overdue")?.items.length ?? 0} 项工作逾期，{groups.find((group) => group.key === "today")?.items.length ?? 0} 项今日到期</span></p></div><Space wrap><Button icon={<AppstoreOutlined />} onClick={() => setDrawer("site-map")}>全部功能</Button>{canViewWork ? <Button type="primary" icon={<PlusOutlined />} onClick={() => openCalendar(true)}>记录工时</Button> : null}</Space></div>
    {error ? <Card><Typography.Text type="danger">{error}</Typography.Text><Button type="link" onClick={() => void loadHome()}>重试</Button></Card> : null}
    <Spin spinning={loading}><div className="home-dashboard">
      <Card className="home-panel home-work-panel" title={<span>我的工作 {canViewWork ? <button className="home-participation-link" onClick={() => setDrawer("participation")}>参与项目 {data?.projects.length ?? 0}</button> : null}</span>}>{!canViewWork ? <Empty description="当前角色暂无个人工作项" /> : groups.length ? groups.map((group) => <section className="home-work-group" key={group.key}><div className="home-group-title"><i style={{ backgroundColor: group.color }} />{group.label}<small>{group.items.length}</small></div>{group.items.map(workRow)}</section>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="目前没有待处理的工作项" />}{canViewWork && workItems.length > 0 ? <div className="home-panel-footer"><Button type="link" onClick={() => setShowAllWork((value) => !value)}>{showAllWork ? "收起工作项" : "查看全部工作项"} <ArrowRightOutlined /></Button></div> : null}</Card>
      <div className="home-side">{canViewWork ? <Card className="home-panel home-milestone-panel" title="近三天里程碑" extra={<Button type="link" onClick={() => setDrawer("participation-milestones")}>查看全部{futureMilestones.length > recentMilestones.length ? `（共 ${futureMilestones.length} 条）` : ""} <ArrowRightOutlined /></Button>}>{recentMilestones.length ? <div className="home-milestone-list">{recentMilestones.map(milestoneRow)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="今天、明天和后天暂无里程碑" />}</Card> : null}
      {canViewWork ? <Card className="home-panel home-hours-panel" title="本周工时" extra={<Button type="link" onClick={() => openCalendar()}>查看日历 <ArrowRightOutlined /></Button>}><p className="home-hours-period">{weekStart.format("M月D日")} - {weekEnd.subtract(1, "day").format("M月D日")}</p><div className="home-hours-total"><strong>{hoursText(totalHours)}</strong><b>小时</b><span>已记录</span></div><div className="home-hours-chart">{dailyHours.map((item) => <button key={item.date} className={item.date === today ? "is-today" : undefined} aria-label={`${dayjs(item.date).format("M月D日")}，已记录 ${hoursText(item.hours)} 小时，查看日历`} onClick={() => { const params = new URLSearchParams(searchParams.toString()); params.set("tab", "work-logs"); params.set("workLogView", "timeGridDay"); params.set("workLogDate", item.date); router.replace(`${pathname}?${params.toString()}`, { scroll: false }); }}><span>{item.hours ? `${hoursText(item.hours)}h` : "—"}</span><i><b style={{ height: `${item.hours ? Math.max(8, item.hours / Math.max(8, ...dailyHours.map((day) => day.hours)) * 48) : 4}px`, opacity: item.hours ? 1 : 0.2 }} /></i><small>{dayjs(item.date).format("dd D")}</small></button>)}</div><div className="home-project-hours"><div className="home-project-hours-title">已记项目 <small>{projectHours.length} 个</small></div>{projectHours.length ? projectHours.map(({ project, hours }) => <div className="home-project-hours-row" key={project.id}><i className="home-project-hours-dot" aria-hidden="true" /><span>{project.name}</span><strong>{hoursText(hours)} 小时</strong></div>) : <p className="home-hours-empty">本周还没有工时记录</p>}</div></Card> : null}</div>
    </div></Spin>

    <Drawer title="项目需求单" open={Boolean(selectedWork)} onClose={() => { setEditingWorkItem(null); setSelectedWork(null); setSelectedBrief(null); }} size="min(1060px, 100vw)" destroyOnHidden extra={selectedWork && canViewWork ? <Button icon={<ClockCircleOutlined />} onClick={() => openCalendar(true)}>记录工时</Button> : null}>{selectedWork ? <><p className="home-drawer-path">{selectedWork.brief.project.name}　›　需求单</p><Spin spinning={briefLoading}>{selectedBrief ? <ProjectBriefProgressContent key={selectedWork.id} briefs={[selectedBrief]} project={selectedWork.brief.project} initialExpandedWorkItemId={selectedWork.id} includeCompletedWorkItems canManagePlannedWork={canManageProject} onEditBrief={canManageProject ? () => router.push(`/projects/${selectedWork.brief.project.id}`) : undefined} onEditWorkItem={canManageProject ? (workItem) => { void openWorkItemEditor(workItem); } : undefined} onAfterSubmissionChange={refreshBrief} onAfterStatusChange={refreshBrief} onAfterPlannedWorkChange={refreshBrief} onAfterAssignmentChange={refreshBrief} /> : null}</Spin></> : null}</Drawer>
    {editingWorkItem ? <WorkItemEditModal open workItem={editingWorkItem} employees={employees} projectOwnerId={data?.projects.find((project) => project.id === selectedWork?.brief.project.id)?.ownerId} onCancel={() => setEditingWorkItem(null)} onSubmit={saveWorkItem} /> : null}
    <Drawer title="实际工时" open={drawer === "work-logs" && canViewWork} onClose={() => setDrawer(null)} size="min(1220px, 100vw)" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateWorkLogRequest((value) => value + 1)}>记录工时</Button>} destroyOnHidden>{drawer === "work-logs" && <WorkLogsCalendar employee={currentUser ? { id: currentUser.id, name: currentUser.name } : null} createRequest={createWorkLogRequest} onEntryChanged={() => void loadHome()} />}</Drawer>
    <Drawer title="全部功能" open={drawer === "site-map"} onClose={() => setDrawer(null)} size="min(900px, 100vw)" destroyOnHidden><HomeSiteMap onNavigate={(path) => { setNavigating(true); router.push(path); }} /></Drawer>
    <Drawer title={`参与项目 · ${data?.projects.length ?? 0}`} open={drawer === "participation" && canViewWork} onClose={() => setDrawer(null)} size="min(720px, 100vw)" destroyOnHidden><div className="home-project-list">{data?.projects.length ? data.projects.map((project) => <div className="home-project-row" key={project.id}><div><strong>{project.name}</strong><small>{project.personalOpenWorkItemCount ? `${project.personalOpenWorkItemCount} 项未完成工作项` : "暂无个人工作项"}</small></div>{project.statusOption?.value ? <Tag color={project.statusOption.color ?? undefined}>{project.statusOption.value}</Tag> : null}{workItems.find((item) => item.brief.project.id === project.id && item.status !== "completed") ? <Button size="small" onClick={() => { const first = workItems.find((item) => item.brief.project.id === project.id && item.status !== "completed"); if (first) { setDrawer(null); void openWork(first); } }}>打开工作项</Button> : null}<Button size="small" onClick={() => router.push(`/projects/${project.id}`)}>查看项目</Button></div>) : <Empty description="暂无参与项目" />}</div></Drawer>
    <Drawer title="负责项目" open={drawer === "owned-projects" && canViewOwnedProjects} onClose={() => setDrawer(null)} size="min(720px, 100vw)" destroyOnHidden><div className="home-project-list">{data?.projects.filter((project) => project.ownerId === currentUser?.id).length ? data.projects.filter((project) => project.ownerId === currentUser?.id).map((project) => <div className="home-project-row" key={project.id}><div><strong>{project.name}</strong><small>{project.personalOpenWorkItemCount} 项个人未完成工作项</small></div><Button size="small" onClick={() => router.push(`/projects/${project.id}`)}>查看项目</Button></div>) : <Empty description="暂无负责项目" />}</div></Drawer>
    <Drawer title="全部未来里程碑" open={drawer === "participation-milestones" && canViewWork} onClose={() => setDrawer(null)} size="min(720px, 100vw)" destroyOnHidden><p className="home-drawer-path">今天起共 {futureMilestones.length} 条</p>{futureMilestones.length ? <div className="home-milestone-list">{futureMilestones.map((item) => <MilestoneCard key={item.id} milestone={item} projectName={item.project.name} />)}</div> : <Empty description="暂无未来里程碑" />}</Drawer>
  </div>;
}
export default function Home() { return <Suspense fallback={<Card loading />}><HomePageContent /></Suspense>; }
