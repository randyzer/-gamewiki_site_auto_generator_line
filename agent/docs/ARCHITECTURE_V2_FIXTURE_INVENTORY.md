# Agent V2 P5 Fixture Inventory

状态：P5 编码前基线清单。所有历史运行只读；本文件记录可用证据和缺口，不把测试桩冒充真实格式样本。

## 1. 分级

- `REAL_FORMAT_REDACTED`：来自真实运行并脱敏，保存源哈希或派生清单。
- `REAL_RUN_READ_ONLY`：仓库内真实运行数据，只能读取和派生新 fixture。
- `OFFLINE_STUB`：测试执行器生成，适合接口测试，不足以单独批准 Stage 切换。
- `MISSING`：没有达到验收矩阵要求的真实格式 fixture。

P5 代码提交不得修改 `agent/runs/wallpaper-engine-002/`。

## 2. 已固定样本

| Stage | 路径 | 等级 | SHA256 | 用途 |
| --- | --- | --- | --- | --- |
| 首页 | `agent/runs/wallpaper-engine-002/manifest.json` | REAL_RUN_READ_ONLY | `44aad1d5ed4746e8a71521e0943d48c97ba0060bc95ff767396a759c17dd3864` | Run/Stage lineage |
| 首页 | `agent/runs/wallpaper-engine-002/artifacts/0/1/0-Wallpaper Engine攻略站首页调研信息.md` | REAL_RUN_READ_ONLY | `14a8ad95d884a115a1559e4b7d6363ad7dbee5e1577c6f63a88f0080f1ef9a84` | 真实首页报告格式 |
| 首页 | `agent/runs/wallpaper-engine-002/artifacts/0/1/1-Wallpaper Engine图标.zip` | REAL_RUN_READ_ONLY | `7111d2d70efc4c1bd9fff1acfbc2fce9354039077ba8a0861eccee977373dfe9` | 真实图标包格式 |
| 首页 | `agent/runs/wallpaper-engine-002/artifacts/0/1/2-COMPLETION_REPORT.md` | REAL_RUN_READ_ONLY | `ac2daf6fe64eaec44188b606f048754adcd25d184399f0f12c25d9dc883e51c0` | 真实完成报告格式 |
| 关键词 | `agent/tests/fixtures/regressions/attempt-10-material-gap-format/fixture-manifest.json` | REAL_FORMAT_REDACTED | `f5b97e15494a7d2003aba64141b56eb115edbf492db39e7bc4515b32be594cf7` | 31 份材料与源哈希 |
| 关键词 | `agent/tests/fixtures/regressions/attempt-10-material-gap-format/expected.json` | REAL_FORMAT_REDACTED | `73bb67b797bf93e0fb9aaae20dd6773f7dd1c211706bf9430cea4fce42f93bcd` | 2/25/4 与 pending 行期望 |
| 关键词 | `agent/tests/fixtures/regressions/attempt-10-material-gap-format/lineage.json` | REAL_FORMAT_REDACTED | `53c574bd6419b4b9e7104c95d6d98096ff5df0ce0414a61c685e500b50763bad` | 关键词 lineage |
| 关键词 | `agent/tests/fixtures/regressions/attempt-10-evidence-contract-drift/fixture-manifest.json` | REAL_FORMAT_REDACTED | `c7e6f23e0030035abcdd16dafecf6152db5c1dfe2b3743c318f0dc2b973c28b4` | Claim/Observation 漂移回归 |
| 关键词 | `agent/tests/fixtures/regressions/attempt-10-evidence-contract-drift/claims-v2.json` | REAL_FORMAT_REDACTED | `489fb09a5d61e10e2425915680c1f9804964d49c0a2987620e21b248df9a7144` | 历史 Worker Claim 保持 T0 |
| 关键词 | `agent/tests/fixtures/regressions/attempt-10-state-projection/fixture-manifest.json` | REAL_FORMAT_REDACTED | `70d32930d43432d115e36c99e7986e478c0216b17c06f79e2a6ee4c72d9f9b89` | PARTIAL 状态投影 |

## 3. 七阶段覆盖矩阵

| canonicalStageId | COMPLETE | PARTIAL/BLOCKED/ERROR | 最近真实格式 Checkpoint | 当前判定 |
| --- | --- | --- | --- | --- |
| `homepage-research` | Wallpaper 002 attempt 1 可派生 | 多个 Bodycam/Wallpaper BLOCKED manifest 可派生 | 真实样本不足 3 个完整集合 | 可做 Adapter；保持 Shadow |
| `keyword-research` | Offline stub 有 PASSED | Attempt 10 提供 2/25/4、FAILED 与服务暂停 | Wallpaper 002 与相关真实 run 可读，但完整可重放样本不足 3 | P5-C 可实现；不得权威切换 |
| `template-selection` | Offline stub | 缺真实 PARTIAL/ERROR fixture | 0 个真实格式成功 Checkpoint | MISSING，阻断切换 |
| `content-integration` | Offline stub | 缺真实质量失败与草稿 fixture | 0 个真实格式成功 Checkpoint | MISSING，阻断切换 |
| `ui-ux-audit` | Offline stub | 缺六视口、源码新鲜度失败 fixture | 0 个真实格式成功 Checkpoint | MISSING，阻断切换 |
| `prelaunch-acceptance` | Offline stub | 缺真实动态路由/闭世界失败 fixture | 0 个真实格式成功 Checkpoint | MISSING，阻断切换 |
| `deployment-plan` | Offline stub 到 WAITING_FOR_USER | 缺真实计划失败/外部未知副作用 fixture | 0 个真实格式受控 Checkpoint | MISSING，执行始终禁用 |

仓库内 `offline-*` runs 的七阶段记录均标为 `OFFLINE_STUB`。其 Markdown/JSON 内容包含空对象和重复占位字节，可验证编排形状，不能作为业务验收的真实证据。

## 4. P5 各工作包可用范围

- P5-A/B：使用合成负向 fixture 和现有 P1–P4 fixture，验证身份及事务，不需要真实网络。
- P5-C：使用 Attempt 10 的永久回归 fixture，必须保留 2 COMPLETED、25 PARTIAL、4 BLOCKED、PENDING 36/84/96/100。
- P5-D：首页可从 002 只读派生脱敏 fixture；模板只有 stub，因此只批准 Adapter contract，不批准切换。
- P5-E/F/G：可用 stub 完成接口和安全负向测试；真实格式缺口必须继续写入 Migration Record。
- P5-H：Offline E2E 可以使用明确标记的 stub 串联，但 `P5_OFFLINE_ARCHITECTURE_ACCEPTED` 还要求每阶段至少一个真实格式 fixture。缺失时只能得到 `P5_OFFLINE_FRAMEWORK_COMPLETE`。

## 5. 派生规则

从真实运行派生 fixture 时必须：

1. 在新目录写入脱敏副本，绝不原地修改 run。
2. 保存源路径、源文件 SHA256、派生文件 SHA256、脱敏说明和生成工具版本。
3. 删除密钥、Cookie、登录态、个人信息和不必要的网页正文。
4. 保留会影响 Contract、状态、证据和错误分类的结构。
5. 不把缺失 Host Observation 补造成 T2/T3。
6. 不把历史审批转换为 V2 审批。

## 6. 切换门禁

每个 Stage 进入真实 `shadow` 或 `v2` 前，需单独列出：

- 至少一条真实格式 COMPLETE 路径。
- 适用时一条 PARTIAL/BLOCKED/执行错误路径。
- 最近三个可合法离线回放的真实格式 Checkpoint；不足时保持 Shadow，除非用户明确批准准确例外。
- Fixture 清单和 SHA256 校验全部通过。
- 所有 Shadow Diff 已归类，无 `UNKNOWN`、`V2_DEFECT` 或 `V2_INCOMPATIBLE`。

本清单当前不满足任何 Stage 的生产 V2 权威切换条件。

## 7. P5-H 离线七阶段验证结果

P5-H 使用固定的模块内调用表串联七个现有 Adapter，并复用 P5-B 的事务恢复器完成崩溃窗口演练。验证结论为 `P5_OFFLINE_FRAMEWORK_COMPLETE`，含义仅限于：

- 七个 Stage Result 共享同一 `runId`、`contextDigest` 和 `stage-identity-v1` 映射。
- 真实格式关键词回放继续保持 `2 COMPLETED / 25 PARTIAL / 4 BLOCKED`；没有把 `PARTIAL` 升级为完成。
- 内容层继续把 `PARTIAL` 限制为 `DRAFT_ONLY + noindex`，把 `BLOCKED` 限制为 `OMIT`。
- 部署规划终态为 `WAITING_FOR_USER`，`deploymentExecuted=false`，外部副作用计数为 0。
- 每阶段生成严格、非权威的 `MIGRATION_DECISION:1`；`actualGateAfter` 必须等于 `actualGateBefore`。
- Migration Decision 的 Gate 观测范围固定为 `OFFLINE_SIMULATED`；`actualGateBefore/After` 只描述本次离线 fixture 绑定，不代表生产 Gate。
- 事务恢复覆盖 `NOT_STARTED`、`PREPARED`、`RECONCILIATION_REQUIRED` 和 `COMMITTED`；已有 V2 Commit 时不能重新绑定 legacy writer。
- 七阶段协调器不接受调用方声明的状态字符串。它只接受由 P5-B `recoverOfflineTransaction` 直接生成并在进程内标记的恢复权限对象；对象克隆、手工构造、跨 run/context/schema/policy 使用都必须拒绝。
- 离线回放 operation ID 由 run、context、schema、mapping 和 policy 确定性生成。`PREPARED` 与 `RECONCILIATION_REQUIRED` 必须在任一 Stage Adapter 执行前停止；`NOT_STARTED`、`ABORTED_BEFORE_CONSUMPTION` 和 `COMMITTED` 才表示没有待协调窗口。

当前离线链使用两处明确受限的 fixture 处理：主页真实格式 fixture 仅在内存中重绑到离线演练 run，关键词输出与内容 stub 之间保留 `KEYWORD_TO_CONTENT_FIXTURE_CONTINUITY_UNPROVEN`。Trace 因此固定记录 `adapterReplayComplete=true`、`endToEndDependencySatisfied=false`；`WAITING_FOR_USER` 只表示 Deployment Adapter 的局部模拟状态。事务状态为 `RECONCILIATION_REQUIRED` 时，协调器必须在任何 Stage 回放前停止。这些限制会写入 trace 和 Migration Decision 的缺失证据，禁止把本结果提升为 `P5_OFFLINE_ARCHITECTURE_ACCEPTED`、`P5_PRODUCTION_READY`、`MIGRATION_APPROVED`、`AUTHORITY_SWITCH_APPROVED` 或 `DEPLOYMENT_READY`。

## 8. P6-C 离线 Shadow 准备度

P6-C 只生成 `OFFLINE_SHADOW_READINESS:1` 准备度记录，不生成或复用正式的
`SHADOW_DIFF:1`。比较器只接受当前 Observation Store 和 Context Binder 直接产生的原始可信对象，
并在每次判断前重新读取历史 Manifest 与绑定的六类来源文件。

当前仓库没有可由该比较器验证身份的 V2 Stage Result，也没有贯穿 Legacy Observation、
Execution Context 与 V2 Stage Result 的可信真实格式 fixture。因此当前输入最多得到
`INCOMPLETE + HOLD`。普通 JSON 的 `v2Projection` 或 `fixtureEvidence` 只能被记录为不可信缺口，
不能把准备度提升为 `READY_FOR_OFFLINE_COMPARISON`，更不能解释为生产 Shadow、迁移批准或权威切换。

以下条件仍需后续独立工作包完成：

- Stage Adapter 提供与准确 Context Binder 绑定的进程内可信结果身份。
- 真实格式 fixture 提供可重验的来源、连续性和摘要绑定。
- 由正式比较器生成 `SHADOW_DIFF:1`，并完成差异分类审查。

P6-C 不调用 Worker、浏览器、构建或网络，不写入历史 Run，不消费 Approval，不修改 Feature Gate，
不创建 V2 Commit，也不执行部署。

## 9. P6-D 可信离线 Stage Result 来源

P6-D 为 `homepage-research` 增加了进程内可信结果来源。调用方只能提交现有 Homepage Adapter
所需的四项 fixture 输入；Provenance 模块复制输入字节，基于已验证的 Observation Record 与
Context Binding 内部创建 `legacy` Gate Binding 和 `STAGE_ADAPTER_INPUT:1`，再直接执行现有
离线 Adapter。它不接受调用方生成的 Stage Result、执行器回调或能力请求。

可信身份绑定到准确的 Observation Store、Context Binder 和 Provenance 实例。普通 JSON、对象
克隆、跨实例结果及跨 Store/Binding 输入都不能获取信任。每次使用结果前会重新读取历史 Manifest、
重新验证六类 Context 来源，并用私有 fixture 副本重放 Adapter；任何来源或摘要漂移都会关闭失败。

该能力只证明 `STAGE_ADAPTER_RESULT:1` 来自受控的 Stage 1 离线执行。它不证明 fixture 与本次
Legacy Observation 的端到端来源连续性，也不代表 Legacy 与 V2 业务结果已经比较。因此比较器在
接受可信结果后仍固定输出：

- `trustedStageResult=true`
- `fixtureContinuityVerified=false`
- `readinessStatus=INCOMPLETE`
- `stageResultCompared=false`
- `missingEvidence=[TRUSTED_REAL_FORMAT_FIXTURE]`
- `decision=HOLD`

真实格式 fixture 的来源连续性、正式 `SHADOW_DIFF:1` 和生产 Gate 切换继续由后续独立工作包处理。
P6-D 仍不调用 Worker、浏览器、构建或网络，不改历史 Run，不消费 Approval，不创建 V2 Commit，
不修改 Feature Gate，也不执行部署。

## 10. P6-E-A 首页 Fixture 来源连续性

P6-E-A 把首页真实格式 fixture 的派生算法提取为无 I/O 的确定性函数，并增加独立的离线连续性
权威。该权威只接受同一 Observation Store、Context Binder 和 Stage Result Provenance 实例直接
产生的可信对象；普通 JSON、对象克隆、跨实例结果和跨 authority 组合都不能取得信任。

每次证明及重验都会执行以下检查：

- 从仓库根目录安全读取历史 Manifest 与三项 Stage 1 产物，拒绝越界路径、符号链接和读取中漂移。
- 把 Manifest 中的 `HOMEPAGE_RESEARCH.md`、`ICON.zip`、`VALIDATION_REPORT` 与 Observation
  Record 的 run、attempt、sequence、checkpoint、site revision 和 artifact digests 逐项绑定。
- 重新执行 `homepage-redaction-v1` 派生，并将提交的 fixture manifest 与三个脱敏文件逐字节比较。
- 重算 Homepage Adapter payload、Gate Binding 和 `STAGE_ADAPTER_INPUT:1` 摘要，要求与 P6-D
  可信 Stage Result 的输入摘要完全一致。
- 在复用证据前重新读取全部来源、重验 Context 和重放 Stage Result；任一漂移都关闭失败。

连续性证据固定为 `authoritative=false`、`verificationScope=OFFLINE_SIMULATED`。P6-E-A 没有接入
Shadow Comparator，也没有生成 `SHADOW_DIFF:1`，因此不改变 P6-D 的 `INCOMPLETE + HOLD`
结论。比较器消费该可信证据并完成正式离线比较属于 P6-E-B；生产 Shadow、迁移批准和 Feature
Gate 切换仍然不在本工作包范围内。

## 11. P6-E-B 首页正式离线 Shadow Diff

P6-E-B 允许 `SHADOW_DIFF:1` 使用七个已注册 canonical stage，并把 P6-E-A 的可信连续性证据接入
P6-C 比较器。比较器只有在 Observation Record、Context Binding、Stage Result Provenance 和
Fixture Continuity 全部来自同一组进程内 authority，并且各摘要精确配对时，才生成首页正式离线
Shadow Diff。

当前首页比较覆盖 run、stage、attempt、规范化状态、Legacy authority、三份 Legacy 业务产物摘要集合、
V2 Adapter 产物摘要集合和 Adapter 输入摘要八项。八项均为 `MATCH` 时 `blocking=false`；任一精确值
不一致会结构化为阻断性的 `V2_INCOMPATIBLE`，不会抛开差异报告或误报 `MATCH`。来源与完整 Adapter
输入仍由连续性证据逐字节重验。比较结果固定为：

- `readinessStatus=OFFLINE_COMPARISON_COMPLETE`
- `fixtureContinuityVerified=true`
- `stageResultCompared=true`
- `shadowDiff.authoritative=LEGACY`
- `decision=HOLD`

`HOLD` 表示离线比较完成后仍没有生产迁移授权。对象克隆、普通 JSON、跨连续性实例、跨 authority、
证据与 Stage Result 摘要不一致，或任一历史/Context/fixture 文件漂移，都不能进入比较。P6-E-B
不修改 Feature Gate，不创建 V2 Commit，不调用 Worker、浏览器或网络，也不执行部署。
