# Agent V2 当前执行路线图

状态：现行且唯一的 Agent V2 开发顺序。更新基线为 `main@0273d1b`（PR #43）。

本文件只描述从离线框架走向受控真实验证的剩余工作。架构原则、迁移门禁和验收定义仍分别以
[架构设计](AGENT_ARCHITECTURE_V2_DESIGN.md)、
[迁移计划](ARCHITECTURE_V2_MIGRATION_PLAN.md)和
[验收矩阵](ARCHITECTURE_V2_ACCEPTANCE_MATRIX.md)为准。
[旧版总控路线图](MASTER_AGENT_EXECUTION_ROADMAP_V1.md)不再规定下一步开发顺序。

## 1. 当前事实

| 范围 | 当前结论 | 不代表 |
| --- | --- | --- |
| P5-A～P5-H | 七阶段 Offline E2E、回滚和安全边界已组成离线框架；上限是 `P5_OFFLINE_FRAMEWORK_COMPLETE` | `P5_OFFLINE_ARCHITECTURE_ACCEPTED`、生产切换或真实业务恢复 |
| P6-A～P6-F2 | Observation、Context 绑定、Offline Readiness、Stage Result provenance、fixture continuity 和聚合准备度已合并 | 生产权威、Worker 启动授权或 L6 通过 |
| C3-A～C3-C1 | Policy、Accepted Artifact Set 和 Production Context Capture 的前瞻性契约测试已合并 | 对应生产存储与生命周期已经实现 |
| C3-D1a（PR #43） | 增加 Attempt Allocation 的 6 项可执行边界测试、10 项明确 TODO，并加固状态目录片段校验 | 完整 C3-D1 或可分配生产 Attempt |
| 真实格式 fixture | 首页和关键词阶段有部分真实格式样本 | 模板、内容、UI、上线前和部署阶段已满足切换条件 |
| L6 | 尚未开始，状态为 `NOT_READY` | 可以继续 Wallpaper Engine 002 retry |

`agent/tests/v2/prospective-attempt-allocation.test.mjs` 中的 10 项 TODO 是 C3-D1b 的验收清单，
不能把 TODO 文件存在或测试套件全绿记作行为已实现。

## 2. 当前停止线

在本路线图第 1～7 步全部满足前：

- 不启动 Wallpaper Engine 002 的新 attempt、retry 或七阶段真实 Worker。
- 不把 Offline Stub、prospective test 或历史恢复快照当作真实格式成功证据。
- 不启用任何 Stage 的生产 V2 权威模式。
- 不签发 Worker 启动、发布、部署或外部账户操作权限。
- 不修改 `agent/runs/wallpaper-engine-002/` 的历史文件。

发现缺口时继续返回 `NOT_READY`、`HOLD`、`BLOCKED` 或现有精确状态；不得通过放宽证据、
恢复、审批、联网或部署门禁来推进。

## 3. 强制执行顺序

每一步必须从前一步已审核并合并的 `main` 开始，使用独立 PR。设计与实现不得跨步并行。

### 1. C3-D1b：Production Attempt Allocation

实现并审核：

- `ATTEMPT_ALLOCATION:1` schema 与 canonical digest。
- 由宿主分配的不可变 `runId + stageId + attempt + requestedOperation` 身份。
- 幂等重复、冲突拒绝、前驱 digest/sequence 链和可重建的非权威 `ATTEMPT_HEAD`。
- 并发单胜者、崩溃恢复、legacy genesis 和跨 run/stage/operation 重放拒绝。
- Allocation 本身不授予 Source Set、Context、Worker 启动、审批、发布或部署权限。

完成条件：当前 10 项 Allocation TODO 全部变成可执行测试并通过；不得只改测试名称或删除 TODO。

### 2. C3-D2：Six Context Source Set

先做独立设计审核，再实现六类宿主权威来源的 schema、producer、digest 和不可变存储。
Source Set 必须精确绑定 Allocation；Worker 自报、Offline Binder 或历史回填不得成为生产来源。

### 3. C3-D3：Production Context 与 Worker 启动生命周期

依次实现并持久化：

1. Production Context Commit。
2. Execution Start。
3. Launch Intent。
4. Worker spawn。
5. Launch Outcome。

每个记录绑定准确前驱、策略、权限、可执行文件、参数、工作目录、环境键和超时。
任何崩溃窗口都必须确定性恢复；无法判断 Worker 是否启动时禁止自动重放。

### 4. C3-E：Accepted Artifact Set 与 Production Stage Commit

只允许宿主验证为 `ACCEPTED` 的业务对象进入 Accepted Artifact Set。诊断、恢复快照、模拟验证和
Worker 自报不能获得生产接受权。Stage Commit 必须是唯一权威提交点，Manifest 只能由事件与不可变对象重建。

### 5. 生产路径接线与职责收敛

在默认关闭的 Gate 后接入完整生产生命周期；逐步将阶段特有解析、证据和恢复规则从
`pipeline.mjs` 与 `skill-executor.mjs` 移入 Registry、Adapter、Evidence 和 State 所有者。
Legacy 与 V2 的差异必须进入批准的 Shadow 分类，不能自动选择更宽松结果。

### 6. 补齐七阶段真实格式 fixture

按照 [Fixture 清单](ARCHITECTURE_V2_FIXTURE_INVENTORY.md)补齐模板、内容、UI、上线前和部署阶段缺口。
每个样本必须有只读来源、SHA256、脱敏记录和适用的 COMPLETE/PARTIAL/BLOCKED/错误路径。

### 7. Offline Architecture Acceptance

重新执行 L1～L5、七阶段 Offline E2E、安全回归、崩溃恢复、Manifest 重建和回滚演练。
只有真实格式缺口关闭且独立审核通过，才能授予 `P5_OFFLINE_ARCHITECTURE_ACCEPTED`。

### 8. L6 受控真实验证

在单独授权、有限预算和明确工具范围下，按阶段执行真实能力验证。先验证每个 Stage 的输入、
宿主证据、Worker 输出、事务提交和失败恢复，再允许串联。目标终点是生成部署计划并
`WAITING_FOR_USER`；保持 `deploymentExecuted=false`，不执行生产部署。

## 4. 完成口径

- PR 合并、测试全绿或 TODO 文件存在，只能证明该 PR 声明的行为。
- `P5_OFFLINE_FRAMEWORK_COMPLETE` 不是架构重构完成。
- 只有 `P5_OFFLINE_ARCHITECTURE_ACCEPTED` 与 `L6_CONTROLLED_REAL_VALIDATION_PASSED` 都成立，才能宣称 Agent V2 架构重构完成。
- `PRODUCTION_DEPLOYMENT_AUTHORIZED` 是独立的一次性批准，不由任何架构或 L6 结论自动获得。

## 5. PR 与审查纪律

每个工作包必须记录准确 Base/Head、文件清单、对应测试、未实现边界、风险和回滚方式。
ChatGPT 对准确 Head 完成独立审查后才可合并；后续工作不得以未审核分支为基线。
任何里程碑名称必须与实际实现一致，禁止再把 prospective contract 或 TODO 骨架标记为生产能力完成。
