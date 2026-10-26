# 状态与恢复规范 V1

状态：Agent V2 设计规范。

## 1. 问题

当前单一 `stage.status` 同时表达 Worker 生命周期、内容质量、用户等待和系统故障。Attempt 10 中 Worker 正常返回 PARTIAL，但后处理 Handoff 解析失败，最终表现为整阶段 FAILED，丢失了真实因果关系。

## 2. 三维状态

### 执行维度

```text
NOT_STARTED -> READY -> RUNNING -> STOPPED
```

`STOPPED.reason`：

- `SUCCEEDED`
- `PARTIAL`
- `BLOCKED`
- `FAILED`
- `TIMEOUT`
- `CANCELLED`

### 成果维度

```text
UNVERIFIED -> VALIDATED_COMPLETE
           -> VALIDATED_PARTIAL
           -> INVALID
```

### 门禁维度

```text
NOT_EVALUATED -> ELIGIBLE
              -> WAITING_FOR_APPROVAL
              -> APPROVED
              -> DENIED
```

旧 Manifest 的状态仍由投影器生成，保证兼容；V2 内核以三维状态为权威。

## 3. 合法示例

| 场景 | 执行 | 成果 | 门禁 |
| --- | --- | --- | --- |
| Worker 完成且材料完整 | SUCCEEDED | VALIDATED_COMPLETE | ELIGIBLE |
| Worker 正常返回部分材料 | PARTIAL | VALIDATED_PARTIAL | WAITING_FOR_APPROVAL 或 DENIED |
| Worker 超时但有可验证快照 | TIMEOUT | VALIDATED_PARTIAL | DENIED |
| 外部服务 429 | BLOCKED | VALIDATED_PARTIAL/UNVERIFIED | DENIED |
| Handoff Adapter 代码错误 | SUCCEEDED/PARTIAL | 已有验收结果不变 | DENIED，并记录 CONTRACT_ERROR |
| 部署计划等待确认 | SUCCEEDED | VALIDATED_COMPLETE | WAITING_FOR_APPROVAL |

## 4. Append-only 事件

最低事件集合：

- `RUN_CREATED`
- `APPROVAL_CREATED`
- `APPROVAL_CONSUMED`
- `STAGE_READY`
- `ATTEMPT_STARTED`
- `HOST_OBSERVATION_RECORDED`
- `WORKER_STOPPED`
- `ARTIFACT_VALIDATED`
- `CONTRACT_REJECTED`
- `EVIDENCE_CLASSIFIED`
- `RECOVERY_CAPTURED`
- `HANDOFF_CREATED`
- `STAGE_CHECKPOINT_COMMITTED`
- `STAGE_BLOCKED`

每条事件包含 eventId、sequence、run/stage/attempt、schemaBundle、contextDigest、timestamp、reasonCode 和相关对象摘要。事件正文不得包含密钥或未经筛选的页面内容。

## 5. 事务提交

Stage Commit Candidate 必须完整包含：

- Worker 停止记录。
- 已验证 Artifact 引用。
- Evidence Outcome。
- 可选 Recovery 引用。
- 可选 Handoff Candidate。
- 三维状态和下一步。
- 将追加的事件集合。

### 5.1 存储模型与唯一提交点

权威存储由三部分组成：

- 按 SHA256 寻址的不可变对象目录，保存 Artifact、Observation、Recovery 和 Handoff。
- 每个 Stage 的顺序提交记录 `commits/<sequence>.json`，记录前序 sequence、全部对象摘要、事件和三维状态。
- 可重建的 `HEAD`、Manifest 和用户报告投影。

`commits/<sequence>.json` 从同目录临时文件原子 rename 为正式文件，并完成文件与父目录持久化，是事务唯一的 **Commit Point**。在此之前发布的对象都只是未引用对象；在此之后即使 `HEAD` 或 Manifest 尚未刷新，本次提交也已经成立。事件包含在提交记录内，或引用同一提交记录中的对象，禁止再用一个独立 append 操作充当第二个提交点。

### 5.2 sequence 独占与写入顺序

1. 所有候选写入本次 Attempt 的私有临时目录并复验。
2. 将候选复制为按摘要寻址的不可变对象，复验字节和摘要并持久化；重复摘要只允许复用完全相同的字节。
3. 获取 Run/Stage 级宿主写锁。锁必须由操作系统排他锁或等价的原子所有权机制实现；不能只依赖“文件存在”。
4. 在锁内读取最后一个有效 Commit，复验输入、Schema Bundle、审批、前序 sequence 和所有引用对象。
5. 分配严格递增的下一 sequence，生成完整 Commit Record，先写临时文件并持久化。
6. 原子 rename 为 `commits/<sequence>.json` 并持久化提交目录；此步是唯一 Commit Point。
7. 更新 `HEAD`，再从 Commit 链重建 Manifest 和用户报告。这些都是缓存式投影，失败时不得撤销已提交记录。
8. 释放写锁。

并发写入者必须在锁内复验前序 sequence。只有一个写入者可以提交；失败者返回 `STATE_SEQUENCE_CONFLICT`，不能自动覆盖或改号重试。

### 5.3 崩溃恢复

启动或恢复时按 sequence 读取 Commit 链，并执行以下确定性规则：

- 没有正式 Commit Record 的临时文件和未引用对象不属于任何 Checkpoint，可以在保留期后垃圾回收，不能投影为阶段成果。
- 正式 Commit Record 的前序 sequence、Context Digest、Schema Bundle 或任一引用对象缺失/摘要不符时，返回 `STATE_COMMIT_CORRUPT` 并阻断该 Stage；不得跳过损坏提交继续投影。
- Commit Record 有效但 `HEAD`、Manifest 或报告缺失/过期时，从最后一个有效 Commit 确定性重建投影。
- 临时 Commit 文件永远不参与重放；恢复不能自行完成一次尚未到达 Commit Point 的事务。
- 写锁遗留时，只有宿主能证明原持有进程已结束且没有新增 Commit 后才可回收；不能按固定时间盲删。

任何复验失败都不得覆盖上一个 Checkpoint。Manifest 只是投影，不能成为唯一历史记录。故障注入必须覆盖每一个写入边界，并证明半提交不会被识别为 `PASSED`。

## 6. Recovery

Recovery Snapshot V2 必须绑定：

- ExecutionContextDigest。
- 来源 Attempt 和 Worker 停止原因。
- Schema Bundle。
- 文件清单、字节数和 SHA256。
- Canonical Stage Data、Evidence Outcome 和服务状态。
- `countsAsStageArtifact=false` 与验收状态。

恢复时显式选择文件，复验全部摘要，并通过 Compatibility Adapter 读取历史 V1。恢复不能自动重放网络调用、服务恢复决定、审批或部署动作。

## 7. Handoff

Handoff 只能从 `ValidatedStageResult` 创建，不能直接解析 Worker Markdown。它必须记录：

- 每项材料的 canonical status、gapId 和 publication disposition。
- PENDING 原始行。
- Recovery 和 Artifact 摘要。
- Site Revision、Domain 和 Context Digest。
- 独立 `PARTIAL_HANDOFF` 审批状态。

PARTIAL 只允许 `DRAFT_ONLY` 或 `OMIT`；BLOCKED 只允许 `OMIT`。批准 Handoff 不改变材料质量状态。

## 8. 重试与失效

输入、Skill Lock、Schema Bundle、模板快照、Lineage、服务决定、Evidence Plan、Site Revision 或审批变化时，State Engine 根据依赖图明确列出失效对象。不得通过清空所有下游状态隐藏具体原因。

同一 Attempt 不可重放；Retry 创建新 Attempt。相同计划在相同缺口和服务状态下已经耗尽时，必须修改受审策略或等待外部状态变化。

## 9. Manifest 兼容投影

V2 并行期继续输出现有 `manifest.json` 字段。唯一 Manifest Projector 按下列从高到低的优先级生成旧 `status`，其他模块不得自行映射：

| 优先级 | 条件 | 旧 `status` |
| --- | --- | --- |
| 1 | 尚未开始 | `NOT_STARTED` |
| 2 | 已准备但尚未执行 | `READY` |
| 3 | V2 执行为 `RUNNING` | `IN_PROGRESS` |
| 4 | 由策略明确跳过且无应交付成果 | `SKIPPED` |
| 5 | 成果为 `INVALID`，或没有有效成果且执行为 `FAILED/TIMEOUT` | `FAILED` |
| 6 | 成果为 `VALIDATED_PARTIAL` | `PARTIAL` |
| 7 | 没有已验证成果且被政策、服务或用户输入阻断 | `BLOCKED` 或 `WAITING_FOR_USER`，按阻断主体确定 |
| 8 | 成果为 `VALIDATED_COMPLETE`，但完成本次请求所必需的用途审批仍在等待 | `WAITING_FOR_USER` |
| 9 | `VALIDATED_COMPLETE + ELIGIBLE/APPROVED` 且本次请求范围已满足 | `PASSED` |

投影必须同时提供：

- `stageSatisfied`：只有本次 Stage 完整验收标准已满足时为 true。
- `downstreamAuthorized`：用途限定 Handoff 获批时为 true；不改变 `stageSatisfied`。
- `attentionRequired`、`failureCategory`、`nextAction` 和 `projectionRuleId`。
- 对部署阶段另外提供 `planSatisfied`、`deploymentExecutionGate` 和 `deploymentExecuted`。

典型组合固定如下：

| 场景 | 旧 `status` | `stageSatisfied` | 其他要求 |
| --- | --- | --- | --- |
| Stage 2 PARTIAL，等待 Handoff Approval | `PARTIAL` | false | `attentionRequired=APPROVAL` |
| Stage 2 PARTIAL，Handoff 已批准 | `PARTIAL` | false | `downstreamAuthorized=true`，原成果不得升级 |
| Worker TIMEOUT，但保留已验证部分成果 | `PARTIAL` | false | `failureCategory=EXECUTION_ERROR` |
| Handoff Adapter 报错，研究成果已验证为 PARTIAL | `PARTIAL` | false | 保留 `CONTRACT_ERROR`，禁止推进 |
| 仅请求生成部署计划，计划已验证 | `PASSED` | true | `deploymentExecuted=false` |
| 请求执行部署，计划已验证但执行审批待定 | `WAITING_FOR_USER` | false | `planSatisfied=true`、执行门等待 |

Legacy Consumer 必须读取 `stageSatisfied` 判断完整验收，读取 `downstreamAuthorized` 判断特定受控交付。只认识旧 `status` 的 Consumer 必须 fail closed，不能把 `PARTIAL` 或 `WAITING_FOR_USER` 当作通过。所有合法三维组合使用同一张表驱动测试覆盖。

下游阶段不得自行组合这两个布尔值。唯一依赖判断接口为：

```text
dependencySatisfied(producerStage, consumerStage, purpose, context)
```

它从 Registry 读取依赖规则，并返回 `{satisfied, ruleId, approvalDigest}`：

- `stageSatisfied=true` 时，只在该 Consumer 声明依赖完整阶段成果时满足。
- `stageSatisfied=false` 且 `downstreamAuthorized=true` 时，只允许审批中准确列出的 producer、consumer、purpose、Handoff 摘要和 Context；其他 Consumer 或用途均不满足。
- 当前唯一允许部分成果推进的兼容规则是 Stage 2 经 `PARTIAL_HANDOFF` 批准后，为审批列明的模板选择/内容草稿用途提供受控输入；它不升级 Stage 2，也不推广到其他 Stage。
- 未批准、审批过期、用途错配、Context 变化或 Handoff 摘要变化一律返回 false。

V2 切换时，Pipeline 只能调用此接口判断依赖；不得再以旧 `status`、`stageSatisfied` 或 `downstreamAuthorized` 单独决定推进。
