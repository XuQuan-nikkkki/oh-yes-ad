import { useState } from "react";
import dayjs from "dayjs";
import { Badge as AntBadge, Button, Checkbox, Collapse, ConfigProvider, DatePicker, Drawer, Empty, Form, Image, Input, InputNumber, Modal, Pagination, Progress, Segmented, Select, Table, Tabs, Tag, Tooltip } from "antd";
import {
  AppstoreOutlined, BankOutlined, CalendarOutlined, ClockCircleOutlined,
  DeleteOutlined, DollarOutlined, EditOutlined, FileTextOutlined, FolderOpenOutlined, InfoCircleOutlined, PlusOutlined, RightOutlined,
  SearchOutlined, TeamOutlined, UserOutlined, WalletOutlined,
} from "@ant-design/icons";
import { project, projectPeriod, activeEmployees, briefs, briefWorkItemDetails, milestones, milestoneScheduleDates, milestoneTimelinePreview, submissions, finance, money } from "./data";
import workEntrySnapshot from "./workEntries.snapshot.json";
import { complexSubmissionBriefs } from "./submissionScenario";
import CostTrackingPreview from "./CostTrackingPreview";
import QuotePreview from "./QuotePreview";

const executionNav = [
  ["overview", "执行概览", AppstoreOutlined, ""], ["members", "人员信息", TeamOutlined, "5"],
  ["vendors", "供应商", BankOutlined, "1"], ["milestones", "里程碑", CalendarOutlined, "18"],
  ["briefs", "需求单 / 工作项", FileTextOutlined, "2 / 11"],
  ["submissions", "项目提交内容", FolderOpenOutlined, "3"],
  ["work", "工时", ClockCircleOutlined, "83"],
];
const financeNav = [
  ["overview", "商务概览", AppstoreOutlined, ""], ["quote", "报价测算", FileTextOutlined, "v1"],
  ["initiation", "项目立项", FileTextOutlined, "v1"],
  ["payments", "收付款", WalletOutlined, "应收 1 / 应付 1"],
  ["cost", "成本追踪", DollarOutlined, "自动计算"],
  ["expenses", "项目报销记录", FileTextOutlined, "0 条"],
];
function Heading({ title, extra }) {
  return <div className="section-heading"><h3>{title}</h3>{extra}</div>;
}
function Metric({ title, value, caption, onClick }) {
  return <button className="metric" onClick={onClick}><span>{title}</span><strong>{value}</strong>{caption && <small>{caption}</small>}</button>;
}
function Badge({ value }) {
  return <Tag color={value === "已完成" ? "green" : value === "进行中" ? "blue" : value === "暂停" ? "gold" : "default"}>{value}</Tag>;
}
const isResigned = name => project.memberStatuses[name] === "离职";
const orderedMemberNames = names => [...names].sort((left, right) => Number(isResigned(left)) - Number(isResigned(right)));
function ExecutionOverview({ go, members, workCount }) {
  const active = briefs.flatMap(b => b.items.filter(i => i[1] === "进行中").map(i => [b.title, ...i]));
  const statusSummary = values => ["进行中", "已完成", "暂停"].map(status => {
    const count = values.filter(value => value === status).length;
    return count ? `${status} ${count}` : null;
  }).filter(Boolean).join(" / ");
  const workItems = briefs.flatMap(brief => brief.items);
  const today = dayjs().format("YYYY-MM-DD");
  const milestoneSummary = [
    ["即将到来", milestoneScheduleDates.filter(date => date > today).length],
    ["今天", milestoneScheduleDates.filter(date => date === today).length],
    ["日期已过", milestoneScheduleDates.filter(date => date < today).length],
  ].filter(([, count]) => count).map(([label, count]) => `${label} ${count}`).join(" / ");
  return <div className="two-column"><div className="column">
    <div className="metrics four">
      <Metric title="需求单" value={String(briefs.length)} caption={statusSummary(briefs.map(brief => brief.status))} onClick={() => go("briefs")} />
      <Metric title="工作项" value={String(workItems.length)} caption={statusSummary(workItems.map(([, status]) => status))} onClick={() => go("briefs")} />
      <Metric title="里程碑" value={String(milestoneScheduleDates.length)} caption={milestoneSummary} onClick={() => go("milestones")} />
      <Metric title="实际工时记录" value={String(workCount)} onClick={() => go("work")} />
    </div>
    <section className="panel"><Heading title="当前工作项" extra={<Button type="link" onClick={() => go("briefs")}>查看全部 <RightOutlined /></Button>} />
      <div className="table"><div className="row head work-row"><span>所属需求单</span><span>工作项</span><span>状态</span><span>提交</span></div>
      {active.map(([brief,title,status]) => <div className="row work-row" key={title}><span className="muted">{brief}</span><strong>{title}</strong><Badge value={status}/><span className="muted">{title === "项目沟通&追踪" ? "无需提交" : submissions.some(s => s.workItem === title) ? "已有提交" : "暂无提交"}</span></div>)}</div>
    </section>
    <section className="panel"><Heading title="项目里程碑" extra={<Button type="link" onClick={() => go("milestones")}>查看全部 18 条 <RightOutlined /></Button>} />
      {milestones.slice(0,4).map(([date,name,type]) => <div className="milestone" key={name}><time>{date}</time><strong>{name}</strong><Tag>{type}</Tag></div>)}
    </section>
  </div><aside className="column">
    <section className="panel"><Heading title="项目成员" extra={<Button type="link" onClick={() => go("members")}>查看</Button>} />{members.filter(group => group.names.length).map(group => <div className="member-group" key={group.group}><span>{group.group}</span><div>{orderedMemberNames(group.names).map(name => <Tag key={name}>{name}{isResigned(name) && "（离职）"}</Tag>)}</div></div>)}</section>
    <section className="panel"><Heading title="合作供应商" extra={<Button type="link" onClick={() => go("vendors")}>查看</Button>} /><strong>萌萌</strong></section>
    <section className="panel"><Heading title="项目提交内容" extra={<Button type="link" onClick={() => go("submissions")}>查看</Button>} /><strong className="big-number">3</strong><span className="muted"> 条提交版本，来自 3 个工作项</span></section>
  </aside></div>;
}
function Members({ members, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const names = new Set(members.flatMap(group => group.names));
  const resignedCount = [...names].filter(isResigned).length;
  const currentGroups = members.filter(group => group.names.length);
  const available = activeEmployees.filter(employee => !names.has(employee.name));
  const filtered = available.filter(employee => `${employee.name} ${employee.group}`.toLowerCase().includes(search.trim().toLowerCase()));
  const groupOrder = ["项目组", "设计组"];
  const availableGroups = [...new Set(filtered.map(employee => employee.group))].sort((left, right) => {
    const leftIndex = groupOrder.indexOf(left);
    const rightIndex = groupOrder.indexOf(right);
    return (leftIndex < 0 ? groupOrder.length : leftIndex) - (rightIndex < 0 ? groupOrder.length : rightIndex);
  });
  const closeAdd = () => { setAdding(false); setSearch(""); setSelected([]); };
  const confirmAdd = () => {
    available.filter(employee => selected.includes(employee.name)).forEach(onAdd);
    closeAdd();
  };
  const confirmRemove = name => Modal.confirm({
    title: "移除项目成员",
    content: `确定将 ${name} 从该项目移除吗？`,
    okText: "移除",
    okButtonProps: { danger: true },
    cancelText: "取消",
    onOk: () => onRemove(name),
  });
  return <>
    <div className="members-toolbar"><span>共 {names.size} 位成员{resignedCount > 0 && ` · ${resignedCount} 位离职`}</span><Button type="primary" icon={<PlusOutlined/>} onClick={() => setAdding(true)}>添加成员</Button></div>
    {currentGroups.length ? <div className="members-grid">{currentGroups.map(group => <section className="member-card" key={group.group}>
      <div className="member-card-heading"><h3>{group.group}</h3><span>{group.names.length} 人</span></div>
      <div className="member-list">{orderedMemberNames(group.names).map(name => <div className="member-row" key={name}><span className="member-identity">{name}{isResigned(name) && <Tag className="member-status-tag">离职</Tag>}</span><button type="button" className="member-remove" aria-label={`移除 ${name}`} onClick={() => confirmRemove(name)}>移除</button></div>)}</div>
    </section>)}</div> : <section className="panel"><Empty description="暂无团队成员" /></section>}
    <Modal title="添加项目成员" open={adding} onCancel={closeAdd} onOk={confirmAdd} okText={selected.length ? `添加 ${selected.length} 位成员` : "添加成员"} okButtonProps={{disabled: selected.length === 0}} cancelText="取消" width={540}>
      <p className="member-picker-hint">仅显示尚未加入项目的在职员工；添加后按其职能归组。</p>
      <Input autoFocus prefix={<SearchOutlined/>} placeholder="搜索姓名或职能" value={search} onChange={event => setSearch(event.target.value)} allowClear />
      <div className="member-picker-list">{availableGroups.length ? availableGroups.map(group => <section className="member-picker-group" key={group}>
        <h4>{group}</h4><div>{filtered.filter(employee => employee.group === group).map(employee => <Checkbox key={employee.name} checked={selected.includes(employee.name)} onChange={event => setSelected(current => event.target.checked ? [...current, employee.name] : current.filter(name => name !== employee.name))}>{employee.name}</Checkbox>)}</div>
      </section>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={available.length ? "没有匹配的员工" : "暂无可添加的在职员工"} />}</div>
    </Modal>
  </>;
}
function Vendors() {
  return <section className="panel"><div className="panel-meta">1 家合作供应商</div><div className="detail-line"><strong>萌萌</strong></div></section>;
}
const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
function Milestones() {
  const [expanded, setExpanded] = useState([]);
  const typeColors = { "讨论": "#8dbd60", "内提": "#a5c96e", "外提": "#7f9ae2", "内容提交": "#e586ad" };
  const toggle = id => setExpanded(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  return <ol className="milestone-timeline">
    {[...milestoneTimelinePreview].sort((a, b) => b.date.localeCompare(a.date)).map(item => <li key={item.id} className={`timeline-item ${item.status}`}>
      <time className="timeline-date" dateTime={item.date.replaceAll("/", "-")}><span>{item.date}</span><small>{weekdayNames[dayjs(item.date).day()]}</small></time>
      <span className="timeline-node" aria-hidden="true">{item.status === "completed" ? "✓" : ""}</span>
      <article className="timeline-card">
        <div className="timeline-card-head">
          <h3>{item.name}</h3>
          <div className="timeline-labels"><Tag color={typeColors[item.type]}>{item.type}</Tag>{item.status !== "completed" && <span className="timeline-status">待完成</span>}</div>
        </div>
        <div className="timeline-people">
          {item.clients?.length > 0 && <div><span>客户人员</span><strong>{item.clients.join("、")}</strong></div>}
          {item.internal?.length > 0 && <div><span>项目人员</span><strong>{item.internal.join("、")}</strong></div>}
          {item.vendors?.length > 0 && <div><span>供应商</span><strong>{item.vendors.join("、")}</strong></div>}
          {!item.clients?.length && !item.internal?.length && !item.vendors?.length && <p>参与人尚未记录</p>}
        </div>
        {item.detail && <div className="timeline-detail">
          <span>详情</span><p className={expanded.includes(item.id) ? "expanded" : ""}>{item.detail}</p>
          {item.detail.length > 55 && <button type="button" onClick={() => toggle(item.id)}>{expanded.includes(item.id) ? "收起" : "展开"}</button>}
        </div>}
        {(item.method || item.location) && <div className="timeline-auxiliary">
          {item.method && <span>方式：{item.method}</span>}{item.location && <span>地点：{item.location}</span>}
        </div>}
      </article>
    </li>)}
  </ol>;
}
function Briefs() {
  const [openBrief,setOpenBrief] = useState(["项目组日常工作"]);
  const [openItems,setOpenItems] = useState({ "项目组日常工作": ["海报"], "设计呈现": ["视觉把控&支援"] });
  const orderedBriefs = [...briefs].reverse();
  const typeColors = { 设计: "blue", 文案: "orange", 项目管理: "purple", 新媒体: "cyan" };
  const itemStatusColors = { 进行中: "green", 暂停: "gold", 已完成: "blue" };
  const formatShortDate = value => value ? dayjs(value).format("MM/DD") : "-";
  return <div className="schedule-brief-list">{orderedBriefs.map(brief => {
    const visible = brief.items.filter(([,status]) => status !== "已完成");
    return <Collapse key={brief.title} className="schedule-brief" activeKey={openBrief} onChange={setOpenBrief} items={[{
      key: brief.title,
      label: <div className="schedule-brief-heading"><strong>{brief.title}</strong><Tag color="green">{brief.status}</Tag></div>,
      extra: <div className="schedule-brief-extra"><span>负责人：子璇</span><span>已指派 <b>{brief.items.length}</b> / {brief.items.length}</span></div>,
      children: <><div className="schedule-brief-summary"><div><strong>需求描述</strong><p>—</p></div><div className="schedule-brief-counts"><div><b>{brief.items.length}</b><span>工作项</span></div><div><b>{brief.items.length} / {brief.items.length}</b><span>已分配执行人</span></div></div></div>
        <Collapse className="schedule-work-list" bordered={false} activeKey={openItems[brief.title] ?? []} onChange={keys => setOpenItems(current => ({ ...current, [brief.title]: keys }))} items={visible.map(([title,status],index) => {
          const detail = briefWorkItemDetails[title];
          const submission = submissions.find(item => item.workItem === title);
          const recordTabs = detail?.submissionEnabled === false ? [{ key: "planned", label: "计划工时", children: <p className="schedule-record-note">已计划 {detail.plannedDays ?? 0} 天</p> }] : [
            { key: "submission", label: "提交内容", children: submission ? <div className="schedule-submission-preview"><strong>V{submission.version} · {submission.versionTitle || title}</strong><span>{submission.submittedBy} · {submission.submittedAt}</span><p>{submission.text || `成品：${submission.outputs.join("、")}`}</p><small>{submission.feedback ? "已有反馈" : "暂无反馈"}</small></div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无提交内容" /> },
            { key: "planned", label: "计划工时", children: <p className="schedule-record-note">{detail?.plannedDays ? `已计划 ${detail.plannedDays} 天` : "暂无计划工时"}</p> },
          ];
          return { key: title, label: <div className="schedule-work-heading"><span className="schedule-work-name"><em>{index + 1}</em><strong>{title}</strong><Tag color={typeColors[detail?.type] ?? "default"}>{detail?.type ?? "工作项"}</Tag></span><span className="schedule-work-meta"><span>状态：<Tag color={itemStatusColors[status]}>{status}</Tag></span><span>审核人：{detail?.reviewer ?? "-"}</span><span>执行人：{detail?.assignee ?? "-"}</span><span>计划工时：<b>{detail?.plannedDays ? `${detail.plannedDays}d` : "-"}</b></span></span></div>,
            children: <div className="schedule-work-detail"><div className="schedule-work-fields"><section><h4>工作描述</h4><p>{detail?.description || "—"}</p></section>{detail?.specification && <section><h4>工作属性</h4><span>规格　{detail.specification}</span></section>}<section><h4>{detail?.submissionEnabled === false ? "截止时间" : "计划交付时间"}</h4><div className="schedule-date-grid">{(detail?.submissionEnabled === false ? [["截止时间",detail.finalAt]] : [["初稿",detail?.firstDraftAt],["调整稿",detail?.revisionAt],["最终稿",detail?.finalAt]]).map(([label,date]) => <div key={label}><span>{label}</span><strong>{formatShortDate(date)}</strong></div>)}</div></section></div><Tabs className="schedule-records" items={recordTabs} defaultActiveKey={recordTabs[0].key}/></div> };
        })}/>
      </>,
    }]}/>;
  })}</div>;
}
const workHours = entry => Math.max(dayjs(entry.endDate).diff(dayjs(entry.startDate), "minute") / 60, 0);
const enrichedWorkEntries = rows => {
  const dailyHours = new Map();
  rows.forEach(entry => {
    const key = `${entry.employee?.id ?? entry.id}__${dayjs(entry.startDate).format("YYYY-MM-DD")}`;
    dailyHours.set(key, (dailyHours.get(key) ?? 0) + workHours(entry));
  });
  return rows.map(entry => {
    const key = `${entry.employee?.id ?? entry.id}__${dayjs(entry.startDate).format("YYYY-MM-DD")}`;
    const hours = Number(workHours(entry).toFixed(2));
    const totalDailyHours = Number((dailyHours.get(key) ?? hours).toFixed(2));
    const days = hours ? Number((hours / Math.max(7.5, totalDailyHours)).toFixed(2)) : 0;
    return { ...entry, hours, totalDailyHours, days };
  }).sort((a, b) => dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf());
};
function Work({ rows, onRowsChange }) {
  const [view, setView] = useState("工时记录");
  const [search, setSearch] = useState("");
  const [person, setPerson] = useState("全部人员");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detail, setDetail] = useState(null);
  const [personDetail, setPersonDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const entries = enrichedWorkEntries(rows);
  const people = [...new Map(entries.map(entry => [entry.employee?.id, entry.employee])).values()].filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  const functionByName = new Map([
    ...activeEmployees.map(employee => [employee.name, employee.group]),
    ...project.members.flatMap(group => group.names.map(name => [name, group.group])),
  ]);
  const peopleByFunction = new Map();
  people.forEach(employee => {
    const group = functionByName.get(employee.name) || "其他";
    peopleByFunction.set(group, [...(peopleByFunction.get(group) ?? []), employee]);
  });
  const groupRank = group => group === "其他" ? 3 : group === "项目组" ? 0 : group === "设计组" ? 1 : 2;
  const functionGroups = [...peopleByFunction].sort(([left], [right]) => groupRank(left) - groupRank(right) || left.localeCompare(right, "zh-CN"));
  const filtered = entries.filter(entry =>
    (person === "全部人员" || entry.employee?.name === person) &&
    entry.title.toLowerCase().includes(search.trim().toLowerCase())
  );
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalHours = Number(entries.reduce((sum, entry) => sum + entry.hours, 0).toFixed(2));
  const totalDays = Number(entries.reduce((sum, entry) => sum + entry.days, 0).toFixed(2));
  const personTotals = people.map(employee => {
    const personEntries = entries.filter(entry => entry.employee?.id === employee.id);
    return { ...employee, count: personEntries.length, hours: Number(personEntries.reduce((sum, entry) => sum + entry.hours, 0).toFixed(2)), days: Number(personEntries.reduce((sum, entry) => sum + entry.days, 0).toFixed(2)) };
  }).sort((a, b) => b.hours - a.hours);
  const selectedPerson = personTotals.find(item => item.id === personDetail?.id);
  const showPerson = name => { setPerson(name); setSearch(""); setPage(1); setView("工时记录"); setPersonDetail(null); };
  const removeEntry = entry => Modal.confirm({
    title: "删除工时记录", content: `确定删除「${entry.title}」吗？`, okText: "删除", okButtonProps: { danger: true }, cancelText: "取消",
    onOk: () => onRowsChange(current => current.filter(item => item.id !== entry.id)),
  });
  const saveEdit = () => {
    if (!editing?.title.trim() || !dayjs(editing.startDate).isValid() || !dayjs(editing.endDate).isValid() || dayjs(editing.endDate).isBefore(dayjs(editing.startDate))) return;
    onRowsChange(current => current.map(item => item.id === editing.id ? { ...item, title: editing.title.trim(), startDate: editing.startDate, endDate: editing.endDate } : item));
    setEditing(null);
  };
  return <>
    <div className="hours-toolbar"><Segmented value={view} onChange={setView} options={["工时记录", "工时分析"]}/></div>
    {view === "工时记录" ? <section className="panel hours-panel">
      <div className="hours-record-controls"><Input prefix={<SearchOutlined />} placeholder="搜索事件" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} allowClear /><select aria-label="筛选人员" value={person} onChange={event => { setPerson(event.target.value); setPage(1); }}><option>全部人员</option>{functionGroups.map(([group, employees]) => <optgroup label={group} key={group}>{employees.map(employee => <option key={employee.id}>{employee.name}</option>)}</optgroup>)}</select></div>
      <div className="hours-table"><div className="hours-row hours-head"><span>事件</span><span>人员</span><span>日期与时间</span><span>工时</span><span>操作</span></div>
        {visible.map(entry => <div className="hours-row hours-entry" key={entry.id}>
          <a className="hours-event-link" href={`/actual-work-entries/${entry.id}`} onClick={event => { event.preventDefault(); setDetail(entry); }}>{entry.title}</a>
          <a href={`/employees/${entry.employee?.id}`} onClick={event => { event.preventDefault(); setPersonDetail(entry.employee); }}>{entry.employee?.name ?? "未分配成员"}</a>
          <span className="hours-date"><b>{dayjs(entry.startDate).format("YYYY-MM-DD")}</b><small>{dayjs(entry.startDate).format("HH:mm")}–{dayjs(entry.endDate).format("HH:mm")}</small></span>
          <span className="hours-amount">{entry.hours.toFixed(1)} 小时<small>{entry.days.toFixed(2)} 天 <Tooltip title={<span>记录时长 {entry.hours.toFixed(2)}h；当天总工时 {entry.totalDailyHours.toFixed(2)}h。当天不超过 7.5h 时按 7.5h 折算，超过时按当天总工时分摊，折合 {entry.days.toFixed(2)} 天。</span>}><button type="button" className="hours-info" aria-label={`查看${entry.title}的工时折算说明`}><InfoCircleOutlined /></button></Tooltip></small></span>
          <span className="hours-actions"><button type="button" onClick={() => setEditing({ ...entry })}><EditOutlined /> 编辑</button><button type="button" onClick={() => removeEntry(entry)}><DeleteOutlined /> 删除</button></span>
        </div>)}
      </div>
      {filtered.length === 0 && <Empty description="没有匹配的工时记录" />}
      <div className="hours-footer"><span>共 {filtered.length} 条记录</span><Pagination current={Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))} total={filtered.length} pageSize={pageSize} showSizeChanger pageSizeOptions={["10", "20", "50"]} onChange={(nextPage, nextSize) => { setPage(nextPage); setPageSize(nextSize); }} /></div>
    </section> : <>
      <div className="hours-summary"><div><span>已记录工时</span><strong>{totalHours.toFixed(1)}<small> 小时</small></strong></div><div><span>折算工作日</span><strong>{totalDays.toFixed(2)}<small> 天</small></strong></div><div><span>记录人员</span><strong>{personTotals.length}<small> 人</small></strong></div></div>
      <section className="panel hours-analysis"><Heading title="人员工时分布" extra={<span className="muted">全部 {entries.length} 条记录 · 按工时从高到低</span>} /><div className="hours-analysis-head"><span>人员</span><span>工时占比</span><span>工时</span><span>折算天数</span><span></span></div>
        {personTotals.map(item => { const ratio = totalHours ? item.hours / totalHours * 100 : 0; return <div className="hours-person-row" key={item.id}><a href={`/employees/${item.id}`} onClick={event => { event.preventDefault(); setPersonDetail(item); }}>{item.name}</a><div className="hours-ratio"><div className="hours-track"><i style={{ width: `${ratio}%` }}/></div><span>{ratio.toFixed(1)}%</span></div><b>{item.hours.toFixed(1)} h</b><span>{item.days.toFixed(2)} d</span><button type="button" onClick={() => showPerson(item.name)}>查看记录 <RightOutlined /></button></div>; })}
      </section>
    </>}
    <Modal title="工时记录" open={Boolean(detail)} onCancel={() => setDetail(null)} footer={<Button onClick={() => setDetail(null)}>关闭</Button>}><div className="hours-detail"><div><span>事件</span><strong>{detail?.title}</strong></div><div><span>人员</span><strong>{detail?.employee?.name}</strong></div><div><span>时间</span><strong>{detail && `${dayjs(detail.startDate).format("YYYY-MM-DD HH:mm")}–${dayjs(detail.endDate).format("HH:mm")}`}</strong></div><div><span>工时</span><strong>{detail && `${detail.hours.toFixed(1)} 小时 · ${detail.days.toFixed(2)} 天`}</strong></div></div></Modal>
    <Modal title={personDetail?.name ?? "人员"} open={Boolean(personDetail)} onCancel={() => setPersonDetail(null)} footer={<Button type="primary" onClick={() => showPerson(personDetail?.name)}>查看工时记录</Button>}><div className="hours-detail"><div><span>记录</span><strong>{selectedPerson?.count ?? 0} 条</strong></div><div><span>工时</span><strong>{selectedPerson?.hours.toFixed(1) ?? "0"} 小时</strong></div><div><span>折算天数</span><strong>{selectedPerson?.days.toFixed(2) ?? "0"} 天</strong></div></div></Modal>
    <Modal title="编辑工时记录" open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={saveEdit} okText="保存" cancelText="取消" okButtonProps={{ disabled: !editing?.title.trim() || !dayjs(editing?.startDate).isValid() || !dayjs(editing?.endDate).isAfter(dayjs(editing?.startDate)) }}><div className="hours-edit-form"><label>事件<Input value={editing?.title ?? ""} onChange={event => setEditing(current => ({ ...current, title: event.target.value }))} /></label><label>开始时间<input type="datetime-local" value={editing ? dayjs(editing.startDate).format("YYYY-MM-DDTHH:mm") : ""} onChange={event => setEditing(current => ({ ...current, startDate: dayjs(event.target.value).toISOString() }))} /></label><label>结束时间<input type="datetime-local" value={editing ? dayjs(editing.endDate).format("YYYY-MM-DDTHH:mm") : ""} onChange={event => setEditing(current => ({ ...current, endDate: dayjs(event.target.value).toISOString() }))} /></label></div></Modal>
  </>;
}
const latestSubmissionAt = item => item.versions.reduce((latest, entry) => Math.max(latest, dayjs(entry.submittedAt).valueOf() || 0), 0);
const orderedSubmissionBriefs = groups => [...groups].map(brief => ({
  ...brief,
  workItems: [...brief.workItems].sort((left, right) => latestSubmissionAt(right) - latestSubmissionAt(left)),
})).sort((left, right) => Math.max(0, ...right.workItems.map(latestSubmissionAt)) - Math.max(0, ...left.workItems.map(latestSubmissionAt)));
function Submissions({ initialItem }) {
  const [search,setSearch] = useState("");
  const [selected,setSelected] = useState(initialItem ?? null);
  const [selectedVersion,setSelectedVersion] = useState(null);
  // 图文密集态只在独立预览链接中使用，普通项目快照不添加未经核实的反馈。
  const richPreview = new URLSearchParams(window.location.search).has("richFeedback");
  const records = richPreview ? submissions.map(item => item.workItem === "海报" ? {
    ...item,
    feedback: "整体方向仍以新中式的雅致与留白为主，画面需要保留延展感。当前方案里的装饰元素较密，品牌信息与活动信息的主次不够清晰。\n\n请先统一主视觉层级，再分别检查横版与竖版的文字位置、产品比例和留白；各尺寸可以重新排布，不必把同一张画面直接等比缩放。下面的调整项附有对应图片，便于逐条核对。",
    feedbackImages: ["/feedback-example/poster-main.svg", "/feedback-example/poster-vertical.svg"],
    feedbackItems: [
      { title: "画面密度", content: "减少装饰元素堆叠，为标题和产品图留出更明确的呼吸空间。", images: ["/feedback-example/poster-main.svg"] },
      { title: "主视觉层级", content: "第一眼先看到品牌与主标题，活动信息和辅助说明退后一级。对比横版与竖版时，保持相同的信息顺序。", images: ["/feedback-example/poster-vertical.svg", "/feedback-example/poster-horizontal.svg"] },
      { title: "延展版式", content: "横版和竖版的重点元素保持一致，但根据画幅重新安排留白，不直接等比缩放。", images: [] },
    ],
  } : item) : submissions;
  const complexPreview = new URLSearchParams(window.location.search).get("submissionScenario") === "complex";
  const actualGroups = briefs.map(brief => ({
    id: brief.title,
    title: brief.title,
    workItems: records.filter(item => brief.items.some(([title]) => title === item.workItem)).map(item => ({
      id: item.workItem,
      title: item.workItem,
      versions: [{ number: item.version, submittedAt: item.submittedAt, submittedBy: item.submittedBy, title: item.versionTitle, text: item.text,
        outputs: item.outputs, sources: item.sources, isFinal: item.isFinal,
        feedback: item.feedback ? { content: item.feedback, images: item.feedbackImages ?? [], adjustments: item.feedbackItems ?? [] } : null }],
    })),
  })).filter(brief => brief.workItems.length);
  const groups = orderedSubmissionBriefs(complexPreview ? complexSubmissionBriefs : actualGroups);
  const query = search.trim().toLowerCase();
  const filtered = groups.map(brief => ({...brief, workItems: brief.workItems.filter(item =>
    !query || `${brief.title} ${item.title} ${item.versions.map(entry => entry.title).join(" ")}`.toLowerCase().includes(query)
  )})).filter(brief => brief.workItems.length);
  const selectedBrief = groups.find(brief => brief.workItems.some(item => item.id === selected));
  const selectedItem = selectedBrief?.workItems.find(item => item.id === selected);
  const versions = [...(selectedItem?.versions ?? [])].sort((left, right) => right.number - left.number || dayjs(right.submittedAt).valueOf() - dayjs(left.submittedAt).valueOf());
  const detail = versions.find(entry => entry.number === selectedVersion) ?? versions[0];
  const feedbackMeta = feedback => {
    if (!feedback) return "暂无反馈";
    const imageCount = (feedback.images?.length ?? 0) + (feedback.adjustments ?? []).reduce((total,adjustment) => total + (adjustment.images?.length ?? 0),0);
    return ["已有反馈", feedback.adjustments?.length ? `${feedback.adjustments.length} 个调整项` : null, imageCount ? `${imageCount} 张图片` : null].filter(Boolean).join(" · ");
  };
  const attachments = (files, kind) => files.length > 0 && <div className="submission-assets">{files.map((name,index) =>
    <div className="submission-asset" key={`${kind}-${index}`}><FileTextOutlined/><span>{name}</span></div>
  )}</div>;
  const images = (sources) => sources?.length > 0 && <Image.PreviewGroup><div className="submission-images">{sources.map((src,index) =>
    src.startsWith("/") ? <Image key={`${src}-${index}`} src={src} alt={`反馈图片 ${index + 1}`} /> :
      <div className="submission-image-placeholder" key={`${src}-${index}`} role="img" aria-label={`反馈图片占位：${src}`}><span>▧</span><small>{src}</small></div>
  )}</div></Image.PreviewGroup>;
  const openItem = item => { setSelected(item.id); setSelectedVersion(null); };
  return <section className="submission-panel">
    <Input className="search" prefix={<SearchOutlined />} placeholder="搜索需求单、工作项或版本标题" value={search} onChange={e => setSearch(e.target.value)} allowClear />
    <div className="submission-groups">{filtered.length ? filtered.map(brief => {
      const versionCount = brief.workItems.reduce((total,item) => total + item.versions.length,0);
      return <section className="submission-brief-group" key={brief.id}><div className="submission-brief-head"><div><small>需求单</small><h3>{brief.title}</h3></div><span>{brief.workItems.length} 个工作项 · {versionCount} 版提交</span></div>
        <div className="submission-list">{brief.workItems.map(item => { const latest = [...item.versions].sort((left,right) => right.number - left.number)[0]; const final = item.versions.find(entry => entry.isFinal); return latest ? <button type="button" className="submission-summary" key={item.id} onClick={() => openItem(item)}>
          <span className="submission-summary-main"><span className="submission-workitem-heading"><strong>{item.title}</strong>{final && <Tag color="green">最终版 V{final.number}</Tag>}</span><span>{item.versions.length} 版提交 · 最新 V{latest.number} · {feedbackMeta(latest.feedback)}{final && ` · ${final.sources.length} 个源文件`}</span></span>
          <span className="submission-summary-side"><small>{latest.submittedBy} · {latest.submittedAt}</small><b>查看版本 <RightOutlined/></b></span>
        </button> : <div className="submission-summary submission-empty-item" key={item.id}><span className="submission-summary-main"><strong>{item.title}</strong><span>尚未提交</span></span></div>; })}</div>
      </section>;
    }) : <Empty description="没有匹配的提交内容"/>}</div>
    <Drawer title={selectedItem ? <span>{selectedItem.title} <small className="submission-drawer-path">/ {selectedBrief.title}</small></span> : "提交内容"} open={Boolean(selectedItem)} onClose={() => setSelected(null)} width={880} className="submission-drawer" destroyOnClose>
      {detail && <div className="submission-detail">
        <div className="submission-version-list"><div className="submission-version-list-title"><strong>提交版本</strong><span>共 {versions.length} 版 · 从新到旧</span></div><div className="submission-version-options">{versions.map(entry => <button type="button" key={entry.number} className={entry.number === detail.number ? "active" : ""} onClick={() => setSelectedVersion(entry.number)} aria-pressed={entry.number === detail.number}><b>V{entry.number}</b><span>{entry.title || `V${entry.number} 提交`}</span>{entry.isFinal && <Tag color="green" className="submission-version-final-tag">最终版</Tag>}<small>{entry.submittedAt}</small></button>)}</div></div>
        <div className="submission-version"><div><small>需求单 · {selectedBrief.title}</small><h3>{detail.title || `V${detail.number} 提交`}</h3><span>V{detail.number} · {detail.submittedBy} 提交于 {detail.submittedAt}</span></div>{detail.isFinal && <Tag color="green">最终版</Tag>}</div>
        <section className="submission-section"><h4>本版提交</h4>{detail.text && <p className="submission-copy">{detail.text}</p>}{detail.outputs.length > 0 && <><div className="submission-subheading">成品</div>{attachments(detail.outputs,"output")}</>}{detail.isFinal && <div className="submission-final-sources"><div className="submission-subheading">源文件 <span>最终版必交</span></div>{detail.sources.length > 0 ? attachments(detail.sources,"source") : <p className="submission-source-warning">最终版尚未提交源文件</p>}</div>}{!detail.text && !detail.outputs.length && <p className="muted">本版没有正文或成品。</p>}</section>
        <section className="submission-section"><h4>本版反馈</h4>{detail.feedback ? <><p className="submission-feedback-summary">{detail.feedback.content}</p>{images(detail.feedback.images)}{detail.feedback.adjustments?.length > 0 && <><div className="submission-subheading">调整项 · {detail.feedback.adjustments.length}</div><div className="submission-adjustments">{detail.feedback.adjustments.map((item,index) => <article key={item.title}><div className="submission-adjustment-title"><span>{index + 1}</span><strong>{item.title}</strong></div><p>{item.content}</p>{images(item.images)}</article>)}</div></>}</> : <p className="muted">暂无反馈</p>}</section>
      </div>}
    </Drawer>
  </section>;
}
function FinanceOverview({ go }) {
  return <div className="two-column"><div className="column"><div className="metrics four">
    <Metric title="成本测算 · 客户报价（不含税）" value={money(finance.quoteExTax)} onClick={() => go("quote")}/>
    <Metric title="立项申请 · 报价金额（含税）" value={money(finance.initiationQuoteWithTax)} onClick={() => go("initiation")}/>
    <Metric title="客户合同金额" value={money(finance.customerContract)} onClick={() => go("payments")}/>
    <Metric title="财务结构 · 预算总成本" value={money(finance.totalCost)} onClick={() => go("initiation")}/>
  </div><section className="panel"><Heading title="收付款摘要" extra={<Button type="link" onClick={() => go("payments")}>查看详情 <RightOutlined/></Button>}/><div className="payment-summary"><b>应收</b><div><strong>大理啤酒 · 一期款</strong><p>计划状态：草稿 · 计划 {money(finance.receivable.planned)} · 2027/01/01 · 实收 {money(0)}</p></div></div><div className="payment-summary"><b>应付</b><div><strong>萌萌 · 一期款</strong><p>计划 {money(finance.payable.planned)} · 2026/08/27 · 实付 {money(0)}</p></div></div></section><section className="panel"><Heading title="金额来源"/><p className="description">成本测算、立项申请、财务结构及客户合同为不同记录，分别显示其金额；不自动将差异判定为异常。</p></section></div><aside className="column"><CostComposition go={go}/></aside></div>;
}
function CostComposition({ go }) {
  return <section className="panel"><Heading title="预算成本构成"/><span className="muted">财务结构 · 总成本</span><strong className="total-cost">{money(finance.totalCost)}</strong>{[["人力成本",finance.labor],["租金成本",finance.rent],["中台成本",finance.middle],["执行费用",finance.execution],["外包费用（3D渲染）",finance.outsource]].map(([name,value]) => <div className="cost-line" key={name}><span>{name}</span><strong>{money(value)}</strong></div>)}<Button block onClick={() => go("initiation")}>查看财务结构 <RightOutlined/></Button></section>;
}
function Quote() {
  const financeRole = new URLSearchParams(window.location.search).get("quotePreview") === "finance";
  return <QuotePreview financeRole={financeRole}/>;
}
function Initiation() {
  return <section className="panel"><div className="panel-meta">立项申请 v1 · 项目财务结构</div><div className="metrics three"><Metric title="立项报价金额（含税）" value={money(finance.initiationQuoteWithTax)}/><Metric title="预估时长" value="40 个工作日"/><Metric title="财务结构总成本" value={money(finance.totalCost)}/></div><div className="detail-line"><strong>立项申请</strong><span>人员配置、中介费用、外包费用、执行费用类别</span></div><div className="detail-line"><strong>项目财务结构</strong><span>合同含税金额 {money(finance.structureContractWithTax)} · 成本构成</span></div></section>;
}
function Payments() {
  return <section className="panel"><div className="panel-meta">应收计划 1 · 应付计划 1</div><h4>项目收款</h4><div className="field-grid">{[["客户合同金额",money(finance.customerContract)],["计划状态","草稿"],["收款节点","一期款"],["关键交付物","方案验收"],["计划收款",money(finance.receivable.planned)],["计划日期",finance.receivable.date],["实际已收",money(0)]].map(([name,value]) => <div key={name}><span>{name}</span><strong>{value}</strong></div>)}</div><h4>项目付款</h4><div className="field-grid">{[["供应商","萌萌"],["供应商合同金额",money(finance.vendorContract)],["付款节点","一期款"],["付款条件","渲染完成"],["计划付款",money(finance.payable.planned)],["计划日期",finance.payable.date],["实际已付",money(0)]].map(([name,value]) => <div key={name}><span>{name}</span><strong>{value}</strong></div>)}</div></section>;
}
function Cost() {
  return <CostTrackingPreview/>;
}
function Expenses() {
  const [view,setView] = useState("summary");
  const [addOpen,setAddOpen] = useState(false);
  const [form] = Form.useForm();
  const budget = finance.reimbursementCategories.reduce((total,item) => total + item.budget,0);
  const reimbursed = 0;
  return <div className="reimbursement-page">
    <div className="reimbursement-metrics">
      <div><span>执行费用预算</span><strong>{money(budget)}</strong><div className="reimbursement-budget-tags">{finance.reimbursementCategories.map(item => <Tag key={item.name} color={item.color}>{item.name}</Tag>)}</div></div>
      <div><span>累计已报销</span><strong>{money(reimbursed)}</strong><small>{finance.reimbursements} 条实际报销记录</small></div>
      <div><span>剩余可报销</span><strong>{money(budget-reimbursed)}</strong><small>预算减去全部已报销金额</small></div>
    </div>
    <div className="reimbursement-toolbar"><Segmented value={view} onChange={setView} options={[{label:"预算汇总",value:"summary"},{label:"报销明细",value:"records"}]}/></div>
    {view === "summary" ? <section className="panel"><div className="reimbursement-section-heading"><h3>按执行费用类别</h3></div><div className="reimbursement-category-list"><div className="reimbursement-category-row reimbursement-category-head"><span>费用类别</span><span>预算</span><span>已报销</span><span>剩余额度</span><span>使用进度</span><span>状态</span></div>{finance.reimbursementCategories.map(item => <div className="reimbursement-category-row" key={item.name}><strong>{item.name}</strong><span>{money(item.budget)}</span><span>{money(0)}</span><span>{money(item.budget)}</span><div className="reimbursement-progress"><Progress percent={0} showInfo={false} size="small" strokeColor="#6F9838"/><b>0%</b></div><AntBadge color="#6F9838" text="正常"/></div>)}</div></section> : <section className="panel"><div className="reimbursement-section-heading"><div><h3>实际报销明细</h3><span>按费用发生日期排列</span></div><Button type="primary" icon={<PlusOutlined/>} onClick={() => {form.setFieldsValue({occurredAt:dayjs()});setAddOpen(true)}}>添加报销</Button></div><Table rowKey="id" size="middle" pagination={false} dataSource={[]} columns={[{title:"申请人",dataIndex:"applicant"},{title:"费用发生日期",dataIndex:"occurredAt"},{title:"执行费用类别",dataIndex:"category"},{title:"金额",dataIndex:"amount"},{title:"操作",dataIndex:"actions"}]} locale={{emptyText:<Empty description="暂无报销记录"/>}}/></section>}
    <Modal title="新增报销" open={addOpen} width={840} okText="确定" cancelText="取消" onCancel={() => {setAddOpen(false);form.resetFields()}} onOk={() => form.submit()}><Form form={form} layout="vertical" onFinish={() => {setAddOpen(false);form.resetFields();Modal.info({title:"预览完成",content:"当前原型没有写入报销记录。",okText:"知道了"})}}><div className="reimbursement-form-grid"><Form.Item label="项目"><Select value={project.name} options={[{label:project.name,value:project.name}]} disabled/></Form.Item><Form.Item label="申请人" name="applicant" rules={[{required:true,message:"请选择申请人"}]}><Select showSearch placeholder="请选择申请人" options={project.members.flatMap(group => group.names).map(name => ({label:name,value:name}))}/></Form.Item><Form.Item label="类别" name="category" rules={[{required:true,message:"请选择类别"}]}><Select placeholder="请选择类别" options={finance.reimbursementCategories.map(item => ({label:item.name,value:item.name}))}/></Form.Item><Form.Item label="金额" name="amount" rules={[{required:true,message:"请输入金额"}]}><InputNumber min={0} precision={2} style={{width:"100%"}}/></Form.Item><Form.Item className="reimbursement-date-field" label="费用发生日期" name="occurredAt" rules={[{required:true,message:"请选择费用发生日期"}]}><DatePicker style={{width:"100%"}}/></Form.Item></div></Form></Modal>
  </div>;
}
export function App() {
  const params = new URLSearchParams(window.location.search);
  const costPreview = params.get("costPreview") === "1";
  const quotePreview = params.has("quotePreview");
  const [workspace,setWorkspace] = useState(costPreview || quotePreview ? "finance" : "execution");
  const [active,setActive] = useState(costPreview ? "cost" : quotePreview ? "quote" : "overview");
  const [members,setMembers] = useState(() => project.members.map(group => ({...group,names:[...group.names]})));
  const [workRows,setWorkRows] = useState(() => workEntrySnapshot);
  const memberCount = members.reduce((total,group) => total + group.names.length,0);
  const addMember = employee => setMembers(current => {
    if (current.some(group => group.names.includes(employee.name))) return current;
    const existing = current.some(group => group.group === employee.group);
    return existing ? current.map(group => group.group === employee.group ? {...group,names:[...group.names,employee.name]} : group) : [...current,{group:employee.group,names:[employee.name]}];
  });
  const removeMember = name => setMembers(current => current.map(group => ({...group,names:group.names.filter(member => member !== name)})));
  const complexPreview = new URLSearchParams(window.location.search).get("submissionScenario") === "complex";
  const nav = workspace === "execution" ? executionNav.map(item => item[0] === "members" ? [item[0],item[1],item[2],String(memberCount)] : item[0] === "work" ? [item[0],item[1],item[2],String(workRows.length)] : item[0] === "submissions" && complexPreview ? [item[0],item[1],item[2],String(complexSubmissionBriefs.flatMap(brief => brief.workItems).reduce((total, workItem) => total + workItem.versions.length, 0))] : item) : financeNav;
  const go = key => setActive(key);
  const content = workspace === "execution" ?
    {overview:<ExecutionOverview go={go} members={members} workCount={workRows.length}/>,members:<Members members={members} onAdd={addMember} onRemove={removeMember}/>,vendors:<Vendors/>,milestones:<Milestones/>,briefs:<Briefs/>,work:<Work rows={workRows} onRowsChange={setWorkRows}/>,submissions:<Submissions/>}[active] :
    {overview:<FinanceOverview go={go}/>,quote:<Quote/>,initiation:<Initiation/>,payments:<Payments/>,cost:<Cost/>,expenses:<Expenses/>}[active];
  const showPrototypeAction = action => Modal.info({
    title: `${action}项目`,
    content: `这里只展示“${action}”入口；原型不修改或删除真实项目。`,
    okText: "知道了",
  });
  return <ConfigProvider theme={{token:{colorPrimary:"#1677ff",borderRadius:6,fontFamily:'-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif'}}}><div className="app"><div className="topbar"><strong>一条龙管理系统</strong><span><UserOutlined/> 小花</span></div><div className="page"><div className="project-header">
    <div className="project-header-top"><div className="project-heading"><h1>{project.name}</h1><Tag color="green">{project.status}</Tag></div><div className="project-actions"><Button icon={<EditOutlined/>} onClick={() => showPrototypeAction("编辑")}>编辑</Button><Button danger icon={<DeleteOutlined/>} onClick={() => showPrototypeAction("删除")}>删除</Button></div></div>
    <div className="project-facts"><div className="project-fact-column"><div><span>项目类型：</span><Tag color="green">{project.type}</Tag></div><div><span>项目阶段：</span><Tag color="lime">{project.stage}</Tag></div></div><div className="project-fact-column"><div><span>所属客户：</span><strong>{project.client}</strong></div><div><span>已归档：</span><Tag color="green">{project.archived ? "是" : "否"}</Tag></div></div><div className="project-fact-column"><div><span>负责人：</span><strong>{project.owner}</strong></div><div className="project-period"><span>项目周期：</span><strong>{projectPeriod()}</strong></div></div></div>
  </div><div className="workspace-switch"><button className={workspace==="execution"?"selected":""} onClick={() => {setWorkspace("execution");setActive("overview")}}><AppstoreOutlined/><strong>项目执行</strong><span>人员、里程碑、需求单与工作项、工时和提交内容</span></button><button className={workspace==="finance"?"selected":""} onClick={() => {setWorkspace("finance");setActive("overview")}}><WalletOutlined/><strong>商务财务</strong><span>报价、立项、收付款、成本与报销</span></button></div><div className="workspace-layout"><aside className="side-nav">{nav.map(([key,label,Icon,count]) => <button key={key} className={active===key?"active":""} onClick={() => go(key)}><Icon/><span>{label}</span>{count && <em>{count}</em>}</button>)}</aside><main className="content"><div className="content-header"><div>{!(workspace === "finance" && ["cost", "expenses", "quote"].includes(active)) && <small>{workspace==="execution"?"项目执行":"商务财务"} / {nav.find(n=>n[0]===active)?.[1]}</small>}<h2>{nav.find(n=>n[0]===active)?.[1]}</h2>{workspace === "execution" && active === "submissions" && <p className="content-subtitle">按需求单和工作项归拢提交；每组按最近提交时间排列，工作项内按版本倒序查看提交与反馈。</p>}</div></div>{content}</main></div></div></div></ConfigProvider>;
}
