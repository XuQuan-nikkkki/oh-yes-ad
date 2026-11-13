# 需求单与提交反馈模块 Design QA

- source visual truth path: `/var/folders/yd/661lyl251lvfxt2m4hfckjvm0000gn/T/codex-clipboard-530863f1-a7a0-4b6d-9c17-46b7d6cbd82a.png`
- implementation URL: `http://localhost:3000/projects/ea1293d8-1f99-4fe0-997a-66060df776e1?tab=progress&step=2`
- comparison artifact: `/private/tmp/oh-yes-ad-submission-comparison.png`
- browser: Codex in-app browser，桌面端，约 1279 × 719 CSS px，device scale factor 2
- source pixels: 2164 × 968
- state: 需求单展开；工作项详情展开；最终版、缺源文件、PDF 成品和一条反馈状态均已验证。

## Full-view comparison evidence

- 需求单摘要已改为“需求描述 + 纵向分隔线 + 工作项/已分配执行人统计”，不再使用横向进度条。
- 工作项的计划交付时间已改为初稿、修改、定稿三列日期文本，不再使用 Timeline。
- 底部统一为“提交与反馈 / 计划工时 / 执行人交接”三个 Tab，当前 Tab 的操作放在 Extra 区域。
- 提交版本采用紧凑折叠列表；版本号、版本标题、状态、资源数量、反馈数量、提交人和时间的信息层级与原型一致。

## Focused region comparison evidence

- 提交与反馈：最终版 Select 可清空；已有最终版时新增提交禁用；最终版缺少必交源文件时显示“待补源文件”。
- 提交内容：图片可显示缩略图；PDF、PPT 和其他无法直接预览的资源降级为文件卡片。
- 本版反馈：一个版本对应一条反馈；反馈说明、图片、调整项分别映射正式字段；长内容限制高度并可展开或滚动。
- 反馈表单：两步结构；调整项可以为空，存在调整项时标题必填；左侧导航仅激活一个调整项。

## Interactions verified

- 新增无具体内容的项目管理提交成功，验证后已删除。
- 正式项目接口能够返回提交、资源、反馈、调整项和检查记录。
- 最终版选择、缺源文件提示、禁用新增提交、两步反馈表单均在正式页面中验证。
- “新增提交”已与“添加工作项”统一为主色文字按钮；浏览器确认使用 `ant-btn-variant-text`，无实心背景，禁用逻辑保持不变。
- 为设计状态验证临时插入的 QA 提交已从开发数据库删除。

## Findings

- P2（已修复）：项目详情自定义查询最初未包含 submissions，导致正式页面没有版本数据；现已补齐完整 select。
- P2（已修复）：新增纵向 Divider 使用了弃用属性；现改为 `orientation="vertical"`。
- P3：正式系统的信息密度高于单组件原型，但保持了既有字号、间距和 Ant Design token，属于页面上下文差异。
- 无未解决的 P0 / P1 / P2 视觉或交互问题。

## Validation

- [x] 正式页面结构检查通过
- [x] 新开浏览器页面控制台无错误或 Ant Design 弃用警告
- [x] 提交与反馈关键交互已验证
- [x] 临时 QA 数据已清理
- [x] Prisma schema、TypeScript、ESLint 与 diff whitespace 检查通过

final result: passed
