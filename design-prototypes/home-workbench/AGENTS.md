# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## 首页原型边界

- 用户明确要求先评审交互，确认后再一次性接入正式首页。本目录只使用示例内存数据，刷新后重置，禁止调用业务API。
- 视觉目标：public/reference.png（融合版）。项目→需求单→工作项；仅个人工作项；里程碑仅今天及以后；实际工时只关联项目。
- 首页里程碑卡片只显示今天、明天、后天三天内的全部条目，按日期由近到远排序，不按固定条数截断；这三天没有里程碑时显示简洁空状态。右上角保留“查看全部”，展示今天起全部未来里程碑（含首页已显示的）；若窗口外还有条目，按钮写“查看全部（共 N 条）”，N 为打开后的总数。`?preview=empty-milestones` 仅用于原型预览该空状态。示例数据只包含参与项目，真实参与关系须正式接入时查询。
- 标题“近三天里程碑”已经说明范围，卡片内不额外展示“今天、明天、后天”“按日期由近到远”等显而易见的规则说明。
- 演示日期固定2026-09-10，不与系统时钟混用。
- 保留按日期查看、提交/反馈详情、周工时概览、日历抽屉、快捷记工时与全部功能入口。
- 首页“本周工时”卡片保留总量与每日柱状图，下方只用简洁文字行显示各项目本周已记小时数，不叠加第二种图表。工作项仅在点击“查看日历”后的抽屉顶部出现一次，下面是实际工时日历；避免首页与抽屉重复列同一批工作项。工时仍只关联项目，工作项仅快捷带入项目。
- 原型的本周快捷项目前仍按首页日期节点筛选；正式 `WorkLogsCalendar` 则从本周计划工时记录中提取工作项。正式接入复用该组件时，先统一这两个“本周工作项”的数据口径，不把原型筛选冒充正式数据规则。
- 旧首页显式查询参数继续作为抽屉初始状态并与打开/关闭同步：`tab=work-logs` 打开工时抽屉，`workLogView`/`workLogDate` 恢复日历视图与日期；`tab=site-map` 打开“全部功能”。`tab=participation` 和 `tab=participation-milestones` 对应项目、未来里程碑抽屉；`tab=owned-projects` 在原型仅显示说明，正式接入必须用当前人员的负责人关系查询。裸 `/` 是新工作台，不再默认打开原网站地图。
- “全部功能”原型按正式 `NAVIGATION_ITEMS` 的模块、功能名称和目标路径提供静态示例，点击后仍是原型预览；正式接入时复用该配置和 `filterNavigationItemsByRoles`，按权限展示并跳转真实页面。网站地图中的“实际工时”原本指向 `/actual-work-entries`，不同于个人的 `tab=work-logs`，正式接入不得混用。
- 点击单条里程碑后，抽屉只展示与正式 `MilestoneCard` 同结构的卡片，不另造一套详情排版，也不显示“查看参与项目”。项目、标题、类型、人员、详情和倒计时沿用卡片层级；方式、地点有值才显示，空值整行隐藏。原型用 `MilestoneCardPreview` 演示；正式接入直接复用并扩展共享 `MilestoneCard`，因为当前共享组件尚未渲染 API 已有的 `method`、`location` 字段。

## 2026-09-11 首页入口精简

- 用户确认删除底部整块“常用入口”，只保留右上角“全部功能”和左侧导航。后续不得按原始设计图恢复底部入口。

## 日期安排规则（用户已确认）

- 用语为“初稿、修改、终稿”，不是“修稿”。仅有日期，没有阶段状态，不从提交版本推断阶段。
- 首页“我的工作”区域不显示“按日期安排分组，不代表阶段进度”的说明文字。
- 多日期工作项显示全部已填日期，突出今天或最近未来节点；同一天多个节点同时突出。没有初稿/修改日期则显示“截止”。
- 按突出节点日期分组，每项只出现一次。初稿/修改已过仅保留日期，不标记完成或逾期。最终截止已过且工作项未完成才归入逾期。完成项单独分组。
- 详情日期、首页统计和本周到期快捷入口用相同日期口径。只改独立原型，正式系统待确认后接入。

## 工作列表对齐（用户已确认）

- 工作行固定“工作内容｜日期安排｜操作”三列；标题统一左对齐，类型标签在标题旁。
- 日期独立占列，初稿/修改/终稿固定列位；单日期只显示截止，不补造日期。移除右侧重复节点/今天提示。
- 操作统一描边按钮、固定宽度。窄屏内容在上、日期与操作在下。

- 时间分组最后一条工作项不显示底部分割线；保留组内相邻条目分隔、分组标题后的横线，避免分组边界出现双线。

## 统一工作项入口与需求单上下文（用户确认）

- 所有行统一“打开工作项”；标题和最近提交可点击同一详情抽屉。显示最新版本号、提交时间及提交人，不将提交等同日期节点完成；无需提交的工作项不显示摘要。
- 单截止日期放在日期安排第三列，与终稿对齐。
- 抽屉顶部需求单标题/状态/折叠描述/编辑入口；下方切换同需求单工作项，再展示完整工作项详情、独立状态/编辑入口及提交反馈等标签。
- 示例需求单编辑及工作项状态、标题、描述、日期编辑在内存保存并同步首页；本示例每项目一张需求单，正式接入必须以briefId关联，不能以projectId替代。

## 详情信息层级（用户反馈）

- 需求单、工作项、提交记录在详情抽屉中要有可辨认的视觉层级。提交记录用独立的版本卡片呈现标题、提交人和时间、实际内容及对应反馈；不把提交版本当作工作项日期或阶段状态。

## 首页工作列表筛选（用户反馈）

- 移除右上角的工作项状态筛选。默认看近期未完成工作项；“查看全部工作项”展开全部时间与已完成项。
- 用户确认移除“按项目”工作列表视图，仅保留按日期分组。标题旁“参与项目”打开独立项目列表，继续覆盖没有分配个人工作项的参与项目。

## 工作项详情统一（用户确认）

- 首页点击工作项后，抽屉展示该工作项所属的整张需求单，默认展开点击的工作项；同一需求单下其他工作项可继续展开查看。
- 原型按正式项目排期页 `ProjectBriefProgressContent` 的需求单卡片、工作项行、描述/日期区和记录标签组织。正式首页接入时直接复用该组件并增加指定工作项初始展开能力，避免维护两套详情实现；原型只作交互演示，不连接正式 API。
