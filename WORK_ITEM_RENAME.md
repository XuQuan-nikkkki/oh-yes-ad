# 工作项统一重命名

2026-09-08 起，需求单保持 `Brief`，其下统一使用工作项 `WorkItem`，不增加业务层级。

| 范围 | 旧名 | 新名 |
| --- | --- | --- |
| 模型、物理表及附属模型 | `Deliverable*` | `WorkItem*` |
| 关联字段 | `deliverableId` / `deliverables` | `workItemId` / `workItems` |
| API | `/api/deliverables/...` | `/api/work-items/...` |
| 需求单内创建 API | `/api/briefs/:id/deliverables` | `/api/briefs/:id/work-items` |
| 页面 | `/brief-deliverables/...` | `/brief-work-items/...` |
| 选项分类 | `briefDeliverable.*` | `briefWorkItem.*` |

同步重命名提交版本、反馈、图片、调整项、确认记录、执行人交接和选项关联的表、索引、约束与资源类型枚举。收款节点的 `keyDeliverable` 是独立的成果描述字段，保留原名；历史迁移文件及历史决策不重写。

## 数据库执行

默认命令与本地 Next 应用一致，读取 `.env.local` 等环境文件；`--deployment` 与 Prisma 配置一致，使用已有环境变量及 `.env`。执行前核对命令输出的主机、库名。

```sh
npm run db:rename-work-items                   # 只读预检
npm run db:rename-work-items -- --rehearse     # 事务中演练，核验后回滚
npm run db:rename-work-items -- --execute      # 保存本地快照，核验后提交
npm run db:rename-work-items -- --verify-only  # 检查旧名残留和现有数据摘要
npx tsx scripts/verify-work-item-rename.ts     # 本地事务测试，全部回滚
```

迁移使用原地 `RENAME`，不删表、不复制业务记录，保留 ID、关联和时间。核验比较所有相关表的记录数与 SHA-256 摘要，计算时只规范化关联列名和选项分类值。新旧表并存、未知关联表、命名冲突或数据摘要变化会报错并回滚。锁等待超过 5 秒会失败，可在停止写入后重试。

构建命令会在 `prisma db push` 前执行幂等迁移，且不再接受自动数据丢失。其他环境上线应先预检并备份，在维护窗口内协调数据库与服务版本切换；旧服务无法访问改名后的表。旧页面链接永久跳转至新地址，API 请求和响应字段统一使用新命名，外部 API 调用方需同步更新。

不要重写已经应用的历史迁移，也不要通过全库强制同步来完成重命名。

## 本次验证

- 本地 `localhost:5432/ad_system` 已执行，远程生产库未操作。
- 14 张相关表前后摘要一致：472 条工作项、763 条计划工时、136 张需求单、8 条交接记录等均保留。
- 对多版本、源文件、反馈、图片、调整确认建立临时样例，验证关联、最终版唯一性、版本号唯一性、外键与级联删除；测试始终回滚。
- Prisma 生成与校验、TypeScript、改动文件 ESLint 通过。
- 完整 Next.js 生产构建通过；原磁盘路径包含单引号，触发 webpack 元数据加载器解析问题，因此在临时目录中的同一代码副本验证，未执行构建脚本内的数据库同步或 seed。
- 浏览器验证工作项列表加载 472 条记录、项目管理类型详情、新 API 响应与旧详情地址跳转正常。
- 数据快照在 Git 忽略的 `.db-sync/before-work-item-rename-*.json`，不提交到仓库。
