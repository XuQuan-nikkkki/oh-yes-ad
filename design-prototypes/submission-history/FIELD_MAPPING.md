# 提交与反馈页面字段映射

本文件用于约束交互原型。页面不得展示无法映射到下列字段或派生规则的业务信息。

## WorkItemSubmission

| 页面展示 / 操作 | 数据来源 |
| --- | --- |
| `V1`、`V2`、`V3` | `versionNumber` |
| 版本标题、例如“客户修改版” | `versionTitle` |
| 文案正文 | `contentText` |
| 设计资源卡片、名称及数量 | `outputResources` 关联及其数量 |
| 图片缩略图 | 优先使用关联资源的 `thumbnailUrl`；没有独立缩略图时，直接图片地址可作为派生预览；其他格式显示文件类型占位 |
| 源文件按钮及是否已提交 | `sourceFileResources` 关联及其数量 |
| 最终版 | `isFinal` |
| 提交人 | `submittedById` 对应的人员名称 |
| 实际提交时间 | `submittedAt` |
| 提交时确认的上一版调整项 | `adjustmentChecks`，关联 `AdjustmentItem.id` |
| 最新 | 同一 WorkItem 下最大的 `versionNumber`，派生值 |

`版本标题`就是 `versionTitle`。它说明该版本的业务名称，不参与版本排序；排序只看整数 `versionNumber`。

新增或编辑提交时，设计类只填写 `outputResources`，至少一条，并通过逐项增删的链接输入维护；文案类只填写必填的 `contentText`。无需提交内容的工作项不强行生成上述内容字段。

## Feedback

一个 Submission 可以没有 Feedback，也可以有且只有一个 Feedback。相同 Submission 收到补充意见时编辑原 Feedback，不新增第二条。Feedback 自身保存整体说明，并可包含多个有序的 `AdjustmentItem`，用于保留具体调整内容与关联图片的对应关系。

| 页面展示 / 操作 | 数据来源 |
| --- | --- |
| 整体反馈说明 | `Feedback.content` |
| 整体反馈图片 | `Feedback.images` 关联 |
| 多条图文调整项 | `adjustmentItems` 关联，按 `order` 排序 |
| 调整项标题 | `AdjustmentItem.title` |
| 调整项正文 | `AdjustmentItem.content` |
| 调整项关联图片 | `AdjustmentItem.images` 关联 |
| 记录人 | `recordedById` 对应的人员名称 |
| 记录时间 | `recordedAt` |
| `0 条反馈` / `1 条反馈` | 是否存在关联 Feedback，派生值 |
| 添加反馈 / 编辑反馈 | 是否存在关联 Feedback，派生交互 |

正式模型应通过 `submissionId` 唯一约束保证 Feedback 一对一；`AdjustmentItem` 通过 `feedbackId` 归属 Feedback，并使用整数 `order` 保持顺序。反馈图片的具体存储与归档路径本轮不确定，只保留与调整项的关联语义。

`Feedback.content` 与 `Feedback.images` 均可选，但 Feedback 至少需要整体内容、整体图片或一个调整项。`AdjustmentItem.title` 必填，`content` 与 `images` 选填。创建下一版 Submission 时，上一版 Feedback 的调整项作为逐项确认清单；确认结果存入新 Submission 的 `adjustmentChecks`，不反向修改原 AdjustmentItem。

## 当前明确不展示

- “已自检”、人工检查清单及完成状态。
- 独立审核 / 打回状态、决定人、决定时间。
- 泛化的“提交说明”。文案类实际提交内容使用 `contentText`。
- 未由数据支持的上传人、修改人或相对时间。源文件审计字段落地前只展示是否已提交。
- Submission 与 Feedback 的“修改历史”。第一版没有对应的持久化模型和页面入口。
