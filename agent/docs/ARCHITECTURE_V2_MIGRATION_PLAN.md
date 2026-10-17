# Agent V2 迁移实施计划

状态：设计阶段。任何生产代码实施必须在本组架构文档通过独立审核后开始。

## 1. 策略

采用 Strangler 迁移：在现有七阶段旁建立契约内核和投影，逐阶段切换。禁止一次性重写全部 Agent，也禁止继续在 V1 各模块中增加新的重复协议。

## 2. 工作包

### P0：设计基线

交付本组六份文档，建立模块责任、契约清单、信任模型、状态机、迁移和验收矩阵。

门禁：独立架构审核明确 `ARCHITECTURE_APPROVED`。不修改 `agent/src/`。

### P1：Contract Kernel 与 Keyword Adapter

新增 Contract Registry、Canonical JSON、Context Digest、错误类型和只读 `keyword-skill-v1` Adapter。用真实失败样本建立 fixture。

主要迁移对象：

- `research-handoff.mjs`
- `keyword-evidence-plan.mjs`
- `keyword-recovery.mjs`
- `artifact-validator.mjs`

首期只建立旁路 canonical projection；V1 仍执行，比较两边结果。差异阻断切换。

门禁：Attempt 10 真实素材得到 2/25/4 状态和全部 gap；历史 V1 不被修改。

### P2：Evidence Engine 与 Host Evidence Broker

统一 Plan、Claim、Observation、Outcome 协议；让受批准的研究工具通过宿主 Broker 生成不可变观察。Worker Prompt 使用 Registry 生成的模板。

主要迁移对象：

- `skill-executor.mjs`
- `keyword-evidence-plan.mjs`
- `keyword-service-stops.mjs`
- `keyword-ytdlp.mjs`
- 新的 Host Research Adapter

门禁：伪造 Worker 证据被拒绝；合法 T2 观察能验证对应事实；没有观察时保持未验证；暂停服务不被调用。

### P3：State Engine 与 Attempt Transaction

新增事件、三维状态、Commit Candidate 和 Manifest 投影。先对 Stage 2 启用 shadow event log，再切换为权威提交路径。

主要迁移对象：

- `pipeline.mjs`
- `stages.mjs`
- `diagnostics.mjs`
- `keyword-recovery.mjs`
- `orchestrator.mjs`

门禁：在 Worker 停止、Evidence、Recovery、Handoff 和 Manifest 写入各故障点注入异常，上一个 Checkpoint 均保持有效，诊断因果明确。

### P4：Approval、Handoff 与 Publication

统一 ExecutionContextDigest 和用途限定审批；Handoff、路由发布、预上线检查只消费 canonical 结果。

主要迁移对象：

- `run-preview-snapshot.mjs`
- `keyword-execution-receipt.mjs`
- `research-handoff.mjs`
- `handoff.mjs`
- `route-publication.mjs`
- `prelaunch-host.mjs`

门禁：审批过期、重放、上下文变化和用途错配全部拒绝；PARTIAL/BLOCKED 不会产生公开路由。

### P5：其余阶段 Adapter 与全链路切换

按首页、模板、内容、UI、上线前、部署顺序迁移到统一 Stage Adapter、Artifact 和 State 接口。阶段切换必须逐个完成，不能用 Stage 2 通过代替其他阶段验收。

门禁：七阶段 Offline E2E、安全回归、迁移回放和回滚演练通过；当前 V1 路径可按阶段关闭。

## 3. PR 与审核

每个工作包使用独立 PR：

1. 先提交失败测试和真实 fixture。
2. 实现最小通过路径。
3. 运行对应 L1–L5 测试。
4. 记录仍使用 V1 的边界。
5. ChatGPT 独立检查完整 Base→Head。
6. 只有准确 Head 获批后才能合并。

P1–P5 不能同时在同一工作区并行修改。后一个工作包从前一个已审核合并的 main 开始。

## 4. 历史运行迁移

- `wallpaper-engine-002` 原 Manifest、Attempts、Recovery 和 Artifact 全部保持只读。
- 从历史文件提取脱敏 fixture，并记录来源 SHA256。
- Compatibility Adapter 生成新的 canonical snapshot，不覆盖旧文件。
- 历史 Claim 保持 T0；没有历史 Host Observation 时不能补升 T2。
- 历史审批不能自动转换为 V2 审批。
- 002 的下一次真实 retry 必须等待 P1–P4 完成并通过 Offline E2E。

## 5. 灰度与 Feature Gate

每个迁移阶段支持三个模式：

- `legacy`：只运行 V1。
- `shadow`：V1 执行，V2 只读投影并比较，不影响状态。
- `v2`：V2 为权威；V1 仅输出兼容 Manifest。

Feature Gate 固定在 Run/Stage Checkpoint 中，运行中不得切换。Shadow 差异必须结构化报告，不能自动选择较宽松结果。

### 5.1 Shadow 差异分类

每项差异必须归入以下一类并记录 Contract、fixture、Legacy/V2 值和原因：

- `EXPECTED_TIGHTENING`：V2 因更严格的证据、权限或路径规则而拒绝 Legacy 接受的结果。仍需独立审查确认，不能自动切换。
- `EXPECTED_PROJECTION_CHANGE`：权威三维状态相同，仅旧 Manifest 展示按批准的新投影规则变化。
- `LEGACY_DEFECT_EXPOSED`：V1 已确认缺陷，必须有回归 fixture 和批准的修复依据。
- `V2_INCOMPATIBLE`：V2 无法无损读取合法历史输入，阻断切换。
- `V2_DEFECT`：V2 结果违反 Contract 或安全不变量，阻断切换并回到实现阶段。
- `UNKNOWN`：无法解释的差异，一律阻断。

任何 `EXPECTED_*` 差异都必须进入审查记录；“更严格”本身不等于正确。

### 5.2 切换样本与批准

受影响 Stage 进入 V2 前至少通过：全部永久回归 fixture、全部已知真实故障样本、该阶段各一条 COMPLETE/PARTIAL/BLOCKED/执行错误路径（适用时），以及最近三个可合法离线重放的真实格式 Checkpoint；历史样本不足三个时，必须列出缺口并保持 Shadow，除非用户对准确风险作出显式例外批准。P5 另要求七阶段各至少一条真实格式 fixture。

从 `shadow` 切到 `v2` 需要同时满足：准确 Head 的独立实现审查通过、差异清单全部归类、对应门禁测试通过、用户明确批准合并和启用该 Stage。需要联网、登录态、服务恢复或生产权限的 L6 验证仍需其自身用途审批，架构批准不能代替。

### 5.3 分阶段切换表

| 工作包 | 可进入 Shadow | 可成为 V2 权威 | 回滚/停止触发 |
| --- | --- | --- | --- |
| P1 Contract/Adapter | Schema、Adapter 和真实 fixture 测试通过 | Attempt 10 全量 2/25/4、规定样本和差异审查通过 | 解析不一致、gap 丢失、历史原件变化 |
| P2 Evidence/Broker | 模拟 Broker、伪造拒绝和暂停服务测试通过 | 受单独授权的真实宿主能力验证通过，Claim/Observation/Outcome 完整匹配 | 来源、信任、服务决定或工具范围异常 |
| P3 State/Transaction | Commit Point 与全部故障注入通过 | Shadow Commit、Manifest 重建和并发 sequence 一致 | 半提交、状态分叉、无法确定恢复 |
| P4 Approval/Publication | 过期、重放、用途错配和路由负向测试通过 | 准确授权失效集合与实际路由证明通过 | 越权、草稿公开、审批错误复用 |
| P5 Stage Adapters | 七阶段 Offline E2E 和回滚演练通过 | 各 Stage 独立批准切换；未通过 Stage 保持 Shadow/Legacy | 任一 Stage 验收失败或安全不变量退化 |

### 5.4 受控 PARTIAL 兼容

Stage 2 切换前必须用现有受控 Handoff 的真实格式 fixture 对比新旧行为：

| 场景 | Legacy 行为 | V2 Shadow 预期 |
| --- | --- | --- |
| PARTIAL，无 Handoff Approval | 不推进 | `dependencySatisfied=false` |
| PARTIAL，有准确且有效的模板选择用途审批 | 只允许该受控下游 | 仅匹配的 consumer/purpose 返回 true |
| 相同审批用于其他 Stage、Consumer 或用途 | 不允许 | false，并返回用途错配原因 |
| Approval、Context 或 Handoff 摘要变化 | 旧批准失效 | false，并列出失效依赖 |
| 完整 PASSED 成果 | 按正常依赖推进 | 通过完整成果规则判断，不消费 PARTIAL 审批 |

V2 进入权威模式的条件包括：原本合法的用途限定 PARTIAL 交付继续工作；任何未批准或跨用途推进继续被拒绝；其他 Stage 不因 Stage 2 的例外规则获得 PARTIAL 推进能力。Shadow 差异出现扩大授权或误阻断合法交付时归类为 `V2_DEFECT`，阻断切换。

## 6. 回滚

- P1/P2：关闭对应 Stage 的 V2 gate，停止执行并保留 V2 旁路记录。
- P3/P4：只有未创建 V2 权威提交的新 Attempt 可以回到 legacy；已有 V2 Commit Record 的 Run 禁止恢复 Legacy 写入，只能继续由兼容的 V2 读取、从权威 Commit 重建投影，或明确阻断等待修复。
- P5：按阶段回滚，不回写历史数据。
- 任何回滚不得放宽证据、审批、服务暂停、发布或部署门禁。

## 7. 完成定义

架构重构完成需要同时满足：

- 七阶段跨模块协议进入 Registry。
- `pipeline.mjs` 不再包含阶段特有解析与证据规则。
- `skill-executor.mjs` 不再同时承担 Prompt Schema、证据判断和恢复策略。
- Manifest 可从事件和不可变对象确定性重建。
- 所有历史真实故障都有永久回归样本。
- 至少一次受控真实运行证明 V2 能到达部署计划等待状态；生产部署仍需独立批准。

完成状态分三道独立门禁：

1. `P5_OFFLINE_ARCHITECTURE_ACCEPTED`：七阶段 Offline E2E、安全回归和回滚演练通过，只证明架构可离线接受。
2. `L6_CONTROLLED_REAL_VALIDATION_PASSED`：在单独授权、有限范围和明确预算下，真实能力按 Stage 通过；未验证能力必须逐项列出。
3. `PRODUCTION_DEPLOYMENT_AUTHORIZED`：用户批准准确的部署计划摘要，只授权该次部署执行。

P5 不能替代 L6，L6 不能替代生产部署审批。只有前两项通过才能宣称架构重构完成；未取得第三项时 `deploymentExecuted` 必须保持 false。
