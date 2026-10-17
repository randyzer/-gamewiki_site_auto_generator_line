# Agent V2 验收矩阵

状态：设计阶段验收基线。

## 1. 测试层级

| 层级 | 目的 | 必需证据 |
| --- | --- | --- |
| L1 Schema | 单个结构严格有效 | 正反向字段、枚举、路径、摘要、版本测试 |
| L2 Adapter | 真实 Skill 输出可解释 | 锁定输出契约和脱敏真实 fixture |
| L3 Contract | 生产者与消费者一致 | Plan→Claim→Observation→Outcome |
| L4 Offline E2E | 完整阶段无需外网可重放 | Attempt→Recovery→Handoff→Manifest |
| L5 Security | 安全门禁不回退 | 篡改、越权、重放、并发、服务暂停、发布与部署测试 |
| L6 Controlled Real | 真实工具能力与业务路径 | 有预算、有限范围、明确用户授权的运行证据 |

## 2. 永久回归样本

拟议目录：

```text
agent/tests/fixtures/regressions/
  attempt-10-material-gap-format/
  attempt-10-claims-schema/
  host-observation-missing/
  preview-inputs-vanished/
  worker-timeout-checkpoint/
  duplicate-artifact-role/
  partial-handoff-route-policy/
```

每个目录包含脱敏输入、SHA256 清单、来源说明、预期分类和稳定错误码。Fixture 不复制密钥、cookie、用户登录数据或不必要的网页正文。

## 3. Contract Kernel

| 场景 | 预期 |
| --- | --- |
| 未知 kind/version | 明确拒绝，不猜测 |
| 未知字段或缺字段 | 返回字段路径 |
| 绝对 Evidence 路径 | 拒绝 |
| Canonical JSON 键顺序变化 | 摘要相同 |
| 数组顺序变化 | 摘要变化 |
| Schema Bundle 运行中变化 | Attempt 失效 |
| 历史 V1 兼容读取 | 新对象绑定源哈希，原件不变 |
| 相同 Context 从 Preview/Receipt/Recovery/Handoff 计算 | `contextDigest` 完全一致 |
| 任一受保护字段变化 | 按 Registry 依赖表使准确审批集合失效 |
| 重复 JSON 键、非法数字、路径别名 | 明确拒绝 |
| Contract 或 Digest 版本变化 | 域分离，旧摘要不能跨版本复用 |

## 4. Keyword Adapter

| 场景 | 预期 |
| --- | --- |
| `### 待确认` 列表 | 生成稳定 gapId |
| 历史 `- 缺口:` | 兼容并标记 legacy syntax |
| COMPLETED 含实质待确认 | CONTRACT_INCOMPATIBLE |
| PARTIAL/BLOCKED 无缺口 | 明确拒绝 |
| Attempt 10 全量素材 | 2 COMPLETED、25 PARTIAL、4 BLOCKED |
| PENDING 36/84/96/100 | 原样保留，不进入事实任务 |

## 5. Evidence 与信任

| 场景 | 预期 |
| --- | --- |
| Worker Claim 字段错误 | 精确 Schema 错误，不显示“未提交” |
| Worker 自报 HTTP 200 | 最高 T0/T1，不成为 VERIFIED |
| 完全匹配 Host Observation | 仅对应 criterion 可验证 |
| Observation URL/路径/哈希不一致 | 拒绝 |
| 一个任务只关闭一个 gap | 其他 gaps 保留 |
| HTTP 429 | 服务停止，后续调用为 0 |
| 未授权替代工具 | POLICY_DENIED |
| Reddit 无站内样本 | 不输出市场结论 |

## 6. 状态与事务

| 注入故障点 | 必须满足 |
| --- | --- |
| Worker 启动前 | 不创建 Attempt 成果 |
| Worker 超时 | 可保存未验证恢复快照，状态为 TIMEOUT |
| Artifact 验证失败 | 上一 Checkpoint 不变 |
| Evidence 校验失败 | Worker 结果和具体错误保留 |
| Handoff 创建失败 | 不把研究结果改写为 NO_PROGRESS |
| 不可变对象发布后、Commit Point 前中断 | 对象保持未引用，上一 sequence 仍为权威 |
| Commit Record rename 后、HEAD 更新前中断 | Commit 成立，恢复时重建 HEAD 和 Manifest |
| Commit 引用对象缺失或摘要错误 | `STATE_COMMIT_CORRUPT`，阻断且不跳过 |
| 两个写入者竞争同一 sequence | 最多一个提交，另一个返回 `STATE_SEQUENCE_CONFLICT` |
| Checkpoint 写入中断 | 按唯一 Commit Point 确定回退或重建，不猜测 |
| Manifest 投影丢失 | 能从事件重建 |
| 并发 retry | 最多一个 Attempt 获得执行锁 |

Manifest Projector 使用一张表覆盖全部合法三维状态组合，并至少断言：

- V2 `NOT_STARTED/READY/RUNNING` 分别投影为旧 `NOT_STARTED/READY/IN_PROGRESS`，从不输出旧系统未知的 `RUNNING`。
- 明确跳过且无应交付成果时投影为 `SKIPPED`，不能冒充 `PASSED`。
- PARTIAL 等待或取得 Handoff Approval 时旧状态仍为 `PARTIAL`，`stageSatisfied=false`。
- TIMEOUT 有已验证部分成果时为 `PARTIAL`，同时保留执行错误。
- Handoff Adapter 失败不抹掉已验证研究成果。
- 部署计划完成与部署执行待批分开投影。
- 所有只认识旧 `status` 的 Consumer 对非 `PASSED` fail closed。

`dependencySatisfied` 使用表驱动测试覆盖：完整成果、未批准 PARTIAL、准确批准的 Stage 2 PARTIAL、错误 Consumer、错误 purpose、过期审批、Context/Handoff 变化和其他 Stage PARTIAL。只有准确批准的 Consumer/purpose 可以开始，且 Stage 2 的 `stageSatisfied` 始终保持 false。

## 7. Approval 与恢复

| 场景 | 预期 |
| --- | --- |
| 过期或已消费审批 | 拒绝 |
| 其他 Run/Stage/用途复用 | 拒绝 |
| 输入、Lineage、Plan 或服务决定变化 | 明确列出失效项 |
| 历史 Recovery 被篡改 | 拒绝 |
| V1 Recovery Adapter | 不改原件，不升级信任 |
| SERVICE_RESUME 用于部署 | 用途错配拒绝 |
| PARTIAL_HANDOFF | 不改变材料状态 |

## 8. Publication 与部署

| 材料/路由状态 | 预期 |
| --- | --- |
| COMPLETED 且内容验收通过 | 可 PUBLISH |
| PARTIAL | DRAFT+noindex 或 OMIT |
| BLOCKED/未知 | OMIT |
| Draft 出现在 sitemap/导航 | 阻断 |
| 动态路由不可证明 | 阻断 |
| 部署计划摘要变化 | 撤销旧批准 |
| 仅生成计划 | `deploymentExecuted=false` |
| 执行中失败 | 单列外部副作用，不宣称上线 |

## 9. 七阶段 Offline E2E

每阶段至少一条真实格式 fixture 路径，覆盖：

1. 首页宿主来源与 Worker 报告。
2. 关键词真实 Skill 输出、证据和部分交付。
3. 模板快照、复制和合并 receipt。
4. 内容 provenance、route publication 和草稿隔离。
5. UI 六视口证据与源码新鲜度。
6. 预上线实际路由、构建、sitemap 和动态路由。
7. 部署计划、审批、执行报告与回滚信息。

任何阶段不得只使用消费者手写的理想对象作为唯一验收。

## 10. 设计审核门禁

代码实现前，本组设计文档必须由独立审查确认：

- 模块所有权没有循环或空白责任。
- Contract Registry 能消除已知重复解析。
- Host Evidence Broker 的信任来源可实现且不依赖 Worker 自报。
- 三维状态可兼容当前 Manifest，并保留真实研究结果。
- 迁移可以逐阶段回滚且不降低安全。
- P1–P5 的每个门禁都有可执行测试。
- Commit Point、崩溃恢复和 sequence 独占没有半提交歧义。
- ExecutionContextDigest 的字段、Canonical JSON、用途域和失效依赖可由共同 fixture 验证。
- Shadow 差异分类、切换批准和已有 V2 Commit 后的回滚限制明确。
- `P5_OFFLINE_ARCHITECTURE_ACCEPTED`、`L6_CONTROLLED_REAL_VALIDATION_PASSED` 与 `PRODUCTION_DEPLOYMENT_AUTHORIZED` 不能互相替代。

只有明确 `ARCHITECTURE_APPROVED` 才能进入 P1 编码。

## 11. 实现审核门禁

每个实现 PR 必须提供：

- 准确 Base/Head 和完整文件清单。
- 对应 L1–L5 测试结果。
- 真实 fixture 来源与脱敏说明。
- 与设计的差异及批准记录。
- 风险和按阶段回滚方式。
- 未验证的真实能力列表。

P5 完成前不得宣称“整个架构重构完成”；L6 真实验证前不得宣称真实业务链路恢复。
