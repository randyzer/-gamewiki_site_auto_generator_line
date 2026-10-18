# Agent V2 Approval 与 Stage Commit 协调规范

状态：P5 编码前冻结候选。本文定义离线协调与恢复语义，不宣称跨存储原子提交，也不授权真实外部操作。

## 1. 问题

P3 Stage Commit 与 P4 Approval Consumption 各有独立的权威日志。两个日志分别可靠，不代表组合操作具备原子性。P5 采用可恢复 Saga：审批一旦消费不回退，Stage Commit 通过确定性 reconciliation 完成或安全阻断。

## 2. 身份和权威对象

每次受审批保护的阶段提交创建唯一 `operationId`，格式为 `op-` 加 32 位小写十六进制。以下对象必须绑定同一组字段：

- `operationId`
- `runId`
- `canonicalStageId`
- `attemptId`
- `contextDigest`
- `schemaBundleDigest`
- `purposeDigest`
- `candidateDigest`
- `approvalId` 与 `approvalDigest`

新增权威对象：

1. `TRANSACTION_INTENT:1`：不可变，描述准备执行的审批消费和 Stage Candidate。
2. `TRANSACTION_OUTCOME:1`：不可变，记录 `COMMITTED`、`RECONCILIATION_REQUIRED` 或 `ABORTED_BEFORE_CONSUMPTION`。

Approval Consumption 和 Stage Commit Record 分别增加 `operationId` 引用。Intent、Consumption、Commit、Outcome 的摘要互相引用已经存在的前序对象，不构成循环哈希。

## 3. 状态机

```text
PREPARED
  -> CONSUMPTION_COMMITTED
  -> STAGE_COMMIT_COMMITTED
  -> RECONCILED

PREPARED
  -> ABORTED_BEFORE_CONSUMPTION

CONSUMPTION_COMMITTED
  -> RECONCILIATION_REQUIRED
  -> STAGE_COMMIT_COMMITTED
  -> RECONCILED
```

禁止状态：

- 没有 Intent 的消费。
- 没有准确 Consumption 的 `APPROVED` Stage Commit。
- Stage Commit 成立后把审批标成未消费。
- Context、Policy、Candidate 或 Purpose 改变后沿用原 operation。
- 对外部结果不确定的操作自动重试。

## 4. 正常执行顺序

1. 验证 Stage Candidate、Approval Reference、当前可信时间和上下文。
2. 原子发布 `TRANSACTION_INTENT`；这是协调流程的起点，不代表审批已消费。
3. 使用 `operationId` 消费 Approval；P4 消费日志仍是消费事实的唯一权威。
4. 锁内重新验证 Intent、Consumption、Candidate 和当前策略。
5. 提交 P3 Stage Commit；Stage Commit 仍是阶段状态的唯一提交点。
6. 写入 `TRANSACTION_OUTCOME=COMMITTED`，然后重建投影。

Outcome 或投影丢失不改变 Consumption 和 Stage Commit 的权威结论。

## 5. 故障与恢复表

| 最后可证明状态 | 权威结论 | 恢复动作 | 是否允许新审批 |
| --- | --- | --- | --- |
| Intent 不存在 | 无变化 | 从头验证 | 可以 |
| Intent 存在、未消费 | 未授权执行 | 重新验证后继续，或写 `ABORTED_BEFORE_CONSUMPTION` | 原审批仍按有效期处理 |
| Consumption 已提交、Stage Commit 不存在 | 审批已永久消费 | 写 `RECONCILIATION_REQUIRED`；只允许用同一 Candidate 幂等完成 | 不得自动补发 |
| Stage Commit 已提交、Outcome 不存在 | 阶段提交已成立 | 从两条日志重建 Outcome 和投影 | 不需要 |
| Commit 已成立、客户端未收到响应 | 已完成 | 返回现有 Commit，不重复执行 | 不需要 |
| Intent 与 Consumption 绑定不一致 | 损坏/越权 | Fail Closed | 不允许 |
| Consumption 与 Commit 绑定不一致 | 损坏/越权 | Fail Closed | 不允许 |
| 任一权威链缺失、回退或摘要错误 | 权威损坏 | Fail Closed | 不允许 |
| Context/Policy/Schema/Mapping 改变 | 原 operation 失效 | 保留历史，重新规划并申请新授权 | 需要 |
| 外部动作已发出、结果未知 | 未知副作用 | 先读外部状态；禁止自动重试 | 由独立恢复计划决定 |

## 6. 幂等键

- Approval Consumer：`approvalId + nonce + operationId`
- Stage Commit：`runId + canonicalStageId + operationId + candidateDigest`
- External action receipt：`provider + resourceScopeDigest + operationId + planDigest`

相同键与相同摘要返回既有结果；相同键但不同摘要返回 `TRANSACTION_IDEMPOTENCY_CONFLICT`。

## 7. 锁和并发

协调器不能同时持有两个现有存储锁并声称分布式原子性。锁顺序固定为：

1. 读取并验证 Intent。
2. 由 Approval Store 独立获取并释放消费锁。
3. 由 Stage Store 独立获取并释放 Stage 锁。
4. Reconciler 从两条权威日志判断结果。

两个进程竞争同一 operation 时，最多一个消费、一个 Stage Commit；另一个只能读取既有结果或收到确定性冲突。不同 operation 竞争同一 Approval 时，只有一个可以消费。

## 8. `APPROVED` 持久化条件

P5-B 可以在离线模拟模式下解除 P3 对 `APPROVED` 的绝对拒绝，但必须同时满足：

- Candidate 为 `SIMULATED` 或 `SHADOW`，生产模式仍拒绝。
- 提供由 P4 verifier 产生的可信 Consumption capability。
- Consumption 与 Intent/Candidate 的全部绑定一致。
- `operationId` 未被其他 Candidate 使用。
- Approval 未过期、未撤销且已准确消费。

真实 `PRODUCTION APPROVED` 仍需独立宿主 Authority、可信锚和 L6 验证，本轮不实现或启用。

## 9. 外部副作用

GitHub、部署、DNS、测量、浏览器写操作和服务恢复不能依赖本地 Saga 推断“只执行一次”。每项必须在未来生产 Adapter 中：

- 执行前读取外部状态。
- 绑定准确资源范围和计划摘要。
- 保存提供方响应与可复核收据。
- 结果未知时进入 `EXTERNAL_EFFECT_UNKNOWN`。
- 未经新的恢复决策不得再次执行。

P5 Offline Runtime 对这些调用一律返回 `POLICY_DENIED`。

## 10. 故障注入清单

必须在以下每个点中断并重启恢复：

1. Intent 临时文件写入前、后及 rename 后。
2. Approval 获取锁前、锁内复验后、Consumption rename 前后。
3. Consumption 成立后、Stage 锁前。
4. Stage Object 发布后、Stage Commit rename 前后。
5. Stage Commit 成立后、Outcome 前。
6. Outcome 成立后、HEAD/Manifest 投影前。
7. 两进程同 operation、不同 operation 同 Approval、相同 operation 不同 Candidate。
8. 删除、截短、回退或篡改 Intent/Consumption/Commit/Outcome 任一链。

所有故障均需证明：既有权威事实不回退、审批不复活、Stage 不重复提交、投影可重建或明确 Fail Closed。
