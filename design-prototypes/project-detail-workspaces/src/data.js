import dayjs from "dayjs";

// 只读原型数据：2026-09-12 从当前项目库核对；未核实的记录不填入。
export const project = {
  name: "a.【大理啤酒】V8包装设计", client: "大理啤酒", owner: "子璇",
  status: "推进中", stage: "立项", type: "客户项目", archived: false,
  startDate: "2026-04-06T08:00:00.000Z", endDate: null,
  members: [{ group: "项目组", names: ["Icy", "子璇"] }, { group: "设计组", names: ["晓臻", "Johnny", "煎饼"] }],
  memberStatuses: { Icy: "在职", 子璇: "在职", 晓臻: "离职", Johnny: "在职", 煎饼: "在职" },
  vendors: ["萌萌"], milestoneCount: 18, workRecordCount: 83,
};
// 添加成员选项取自 2026-09-13 在职员工只读查询；原型只在浏览器内模拟关联变更。
export const activeEmployees = [
  { name: "张弛", group: "品牌组" }, { name: "诗敏", group: "品牌组" },
  { name: "左颖", group: "新媒体" }, { name: "Jesty", group: "空间组" },
  { name: "Johnny", group: "设计组" }, { name: "孔溪", group: "设计组" },
  { name: "煎饼", group: "设计组" }, { name: "苏明（外协）", group: "设计组" },
  { name: "阿骏", group: "设计组" }, { name: "阿鱼（外协）", group: "设计组" },
  { name: "陈宇豪", group: "设计组" }, { name: "Dona", group: "财政组" },
  { name: "晓彦", group: "财政组" }, { name: "Eva", group: "项目组" },
  { name: "Icy", group: "项目组" }, { name: "Yuki", group: "项目组" },
  { name: "子璇", group: "项目组" }, { name: "小花", group: "项目组" },
  { name: "浩宏", group: "项目组" },
];
// 与正式页面相同的周期计算口径；工作日变动为 2026-09-13 核对的项目期间记录。
const workdayAdjustments = [
  ["2026-04-03T16:00:00.000Z", "2026-04-05T16:00:00.000Z", "休息"],
  ["2026-04-30T08:00:00.000Z", "2026-05-04T08:00:00.000Z", "休息"],
  ["2026-05-08T08:00:00.000Z", "2026-05-08T08:00:00.000Z", "上班"],
  ["2026-06-18T08:00:00.000Z", "2026-06-20T08:00:00.000Z", "休息"],
];
const dateKey = value => new Date(value).toISOString().split("T")[0];
const formatDate = value => dayjs(value).format("YYYY/MM/DD");
export const projectPeriod = () => {
  if (!project.startDate) return "-";
  const start = new Date(project.startDate);
  const today = new Date();
  if (start > today) return "项目还未开始";
  const end = project.endDate ? new Date(project.endDate) : today;
  const naturalDays = Math.floor((end - start) / 86400000) + 1;
  let workdays = 0;
  const current = new Date(start);
  while (current <= end) {
    const key = dateKey(current);
    const adjustment = workdayAdjustments.find(([from, to]) => key >= dateKey(from) && key <= dateKey(to));
    if (adjustment?.[2] === "上班" || (!adjustment && current.getDay() >= 1 && current.getDay() <= 5)) workdays++;
    current.setDate(current.getDate() + 1);
  }
  return `${formatDate(start)} - ${project.endDate ? formatDate(end) : "至今"} (自然日: ${naturalDays}天 | 工作日: ${workdays}天)`;
};
export const briefs = [
  { title: "设计呈现", status: "进行中", items: [
    ["9号交付内容梳理确认", "已完成"], ["两个规格的罐子Demo", "已完成"],
    ["视觉把控&支援", "进行中"], ["两个啤酒罐身设计深化", "已完成"],
    ["logo参考资料整理", "已完成"], ["【logo】修改呈现", "已完成"], ["纸箱DEMO", "已完成"],
  ] },
  { title: "项目组日常工作", status: "进行中", items: [
    ["海报", "进行中"], ["slogan", "暂停"], ["案例分享", "进行中"], ["项目沟通&追踪", "进行中"],
  ] },
];
// 2026-09-13 只读核对当前项目需求单与未完成工作项；页面仍以正式接口为准。
export const briefWorkItemDetails = {
  "视觉把控&支援": { type: "设计", description: "", reviewer: "煎饼", assignee: "煎饼", finalAt: "2026-08-06", plannedDays: 6.4, submissionEnabled: true },
  "海报": { type: "设计", description: "海报设计测试", specification: "1920x1080px", reviewer: "煎饼", assignee: "陈宇豪", firstDraftAt: "2026-09-09", revisionAt: "2026-09-12", finalAt: "2026-09-16", submissionEnabled: true },
  "slogan": { type: "文案", description: "slogan 测试", reviewer: "诗敏", assignee: "诗敏", finalAt: "2026-09-09", submissionEnabled: true },
  "案例分享": { type: "新媒体", description: "新媒体测试", reviewer: "左颖", assignee: "左颖", finalAt: "2026-09-23", submissionEnabled: true },
  "项目沟通&追踪": { type: "项目管理", description: "aaaaa", reviewer: "子璇", assignee: "Icy", firstDraftAt: "2026-09-03", finalAt: "2026-09-17", plannedDays: 1.4, submissionEnabled: false },
};
export const milestones = [
  ["2026/08/21", "确认酒罐设计&纸箱DEMO", "内容提交"],
  ["2026/07/23", "罐子设计调整", "讨论"],
  ["2026/07/10", "酒罐调整+纸箱DEMO", "内容提交"],
  ["2026/07/03", "【大理啤酒】logo修改", "内容提交"],
  ["2026/06/30", "【大理啤酒】logo修改方向共识沟通会", "讨论"],
];
// 2026-09-13 只读核对当前项目全部 18 条里程碑的排期日期；仅用于概览状态计数。
export const milestoneScheduleDates = [
  "2026-04-07", "2026-04-13", "2026-04-15", "2026-04-17", "2026-04-22", "2026-04-28",
  "2026-05-06", "2026-05-09", "2026-05-13", "2026-05-20", "2026-05-22", "2026-05-29",
  "2026-06-10", "2026-06-30", "2026-07-03", "2026-07-10", "2026-07-23", "2026-08-21",
];
// 时间线视觉稿：参与人取自用户提供的旧版截图；状态和会议方式仅用于比较视觉层级。
// 正式数据目前没有独立的完成状态字段，接入正式页前需确定这一状态的来源。
export const milestoneTimelinePreview = [
  { id: "m1", date: "2026/05/29", name: "资料收集", type: "讨论", status: "completed", internal: ["Nico", "子璇", "诗敏", "煎饼"] },
  { id: "m2", date: "2026/06/01", name: "【内】产品策略提报", type: "内提", status: "completed", internal: ["子璇", "诗敏", "张弛"] },
  { id: "m3", date: "2026/06/10", name: "【外】策略方案+设计DEMO提报", type: "外提", status: "completed", clients: ["Stella(BM)"], internal: ["子璇", "诗敏", "张弛", "煎饼"] },
  { id: "m4", date: "2026/07/07", name: "酒罐设计画面调整", type: "内容提交", status: "completed", clients: ["Stella(BM)"], internal: ["子璇", "晓臻", "煎饼"], detail: "插画画面调整 · 排版调整 · 货架 DEMO" },
  { id: "m5", date: "2026/07/20", name: "产品包装设计 V4 反馈讨论会", type: "讨论", status: "completed", clients: ["Stella(BM)"], internal: ["子璇", "煎饼"], detail: "围绕两种系列的包装设计边界、色彩、笔触、字体和留白讨论，明确货架展示时的辨识度，并继续调整版面、标志与图形元素的呈现方式。", method: "腾讯会议" },
  { id: "m6", date: "2026/08/21", name: "确认酒罐设计 & 纸箱 DEMO", type: "内容提交", status: "pending", internal: [] },
];
export const submissions = [
  { workItem: "案例分享", version: 1, versionTitle: "案例分享", isFinal: false, submittedAt: "2026/09/09 13:30", submittedBy: "小花", outputs: ["视频"], sources: [], text: null, feedback: "视频方向没问题，节奏需要调整" },
  { workItem: "slogan", version: 1, versionTitle: "slogan 初版", isFinal: false, submittedAt: "2026/09/09 06:55", submittedBy: "小花", outputs: [], sources: [], text: "正文已填写：微信公众号文章链接", feedback: "啊啊啊啊啊啊啊啊啊" },
  { workItem: "海报", version: 1, versionTitle: "", isFinal: true, submittedAt: "2026/09/09 06:53", submittedBy: "小花", outputs: ["海报方案"], sources: ["海报方案"], text: null, feedback: "整体调性提醒：新中式讲究意境和留白，画面要雅致、有延展感，切忌元素堆砌过满。" },
];
export const finance = {
  quoteExTax: 125000, initiationQuoteWithTax: 125000, structureContractWithTax: 125000,
  customerContract: 151500, customerTax: 1500, duration: 40,
  totalCost: 59828.66, labor: 30622.18, rent: 3682.8, middle: 21823.68,
  execution: 2300, outsource: 1400, vendorContract: 1500,
  receivable: { status: "草稿", stage: "一期款", deliverable: "方案验收", planned: 151500, date: "2027/01/01", actual: 0 },
  payable: { stage: "一期款", condition: "渲染完成", planned: 1400, date: "2026/08/27", actual: 0 },
  reimbursements: 0,
  reimbursementCategories: [
    { name: "加班打车", budget: 1000, color: "#2a8322" },
    { name: "快递费", budget: 100, color: "#1b3c87" },
    { name: "外出打车", budget: 500, color: "#7c976a" },
    { name: "物料费", budget: 200, color: "#8f158f" },
    { name: "招待费", budget: 500, color: "#8c8c8c" },
  ],
};
export const money = value => Number(value).toLocaleString("zh-CN", { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " 元";
