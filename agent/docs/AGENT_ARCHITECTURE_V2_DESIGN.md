# 游戏站总控 Agent V2 架构设计

状态：设计草案，禁止据此直接开放生产权限或跳过现有门禁。

## 1. 背景与目标

当前 Agent 已具备七阶段编排、Skill 锁定、Worker 隔离、宿主浏览器、审批快照、恢复、证据哈希、部分交付、路由发布和部署门禁。真实运行反复失败的主要原因不是缺少这些能力，而是各模块分别定义了状态、证据、产物和交接格式，缺少单一权威契约。

V2 的目标是保留已经验证的能力，在宿主侧建立统一契约内核，使生产者、验证器、恢复、交接和发布使用同一份版本化结构。V2 不修改锁定 Skill，不降低平台工具、登录态、HTTP 429、人工审批或部署权限规则。

## 2. 架构原则

1. 一个业务概念只有一个权威结构和一个权威验证器。
2. Markdown 是人类可读视图，不是跨模块控制协议。
3. Worker 生产候选成果和声明；宿主决定可信度、验收结果和状态转换。
4. 外部访问只有宿主不可被 Worker 改写的观察记录才能提升为可信证据。
5. 状态转换在事务边界内提交；失败前取得的有效成果可以保留，但不能冒充通过。
6. 审批按用途隔离。研究执行、部分交付、UI 修改和生产部署不得互相授权。
7. 历史运行不可覆盖。兼容通过只读 Adapter 完成，转换结果生成新快照并绑定原始哈希。
8. 新架构通过旁路投影和阶段灰度迁移落地，不一次性替换全部生产路径。

## 3. 目标分层

```text
入口层
  CLI / 本地审批入口 / 其他受支持入口
        |
审批与策略层
  Approval Engine / Policy Engine / ExecutionContextDigest
        |
契约内核
  Contract Registry / Canonical JSON / Compatibility Adapters
        |
编排层
  Run Coordinator / Stage State Engine / Attempt Transaction
        |
能力层
  Host Evidence Broker / Worker Runtime / Browser / File / Tool Adapters
        |
验收与交付层
  Evidence / Artifact / Recovery / Handoff / Publication / Deployment Gates
        |
审计层
  Append-only Events / Diagnostics / Manifest Projection / User Report
```

依赖只能向下指向稳定接口。阶段 Adapter 可以依赖契约内核和宿主能力接口，契约内核不能依赖具体阶段、具体 Skill 或浏览器实现。

## 4. 模块所有权

| 模块 | 唯一责任 | 不负责 |
| --- | --- | --- |
| Contract Registry | 注册、解析和验证版本化 Schema | 运行 Worker、访问网络 |
| Policy Engine | 服务暂停、来源规则、权限和发布策略 | 判断文件是否真实存在 |
| Approval Engine | 创建、校验、过期和一次性消费授权 | 代替业务验收 |
| State Engine | 合法状态转换、不变量和投影 | 解析 Markdown |
| Execution Engine | Worker 生命周期、预算、超时、隔离 | 自行认定结果通过 |
| Host Evidence Broker | 执行受批准的外部访问并签发宿主观察 | 接受 Worker 自报为可信事实 |
| Evidence Engine | 将计划、声明、宿主观察和事实缺口对应起来 | 发起未批准的网络请求 |
| Artifact Engine | 文件身份、Schema、哈希、登记和不可变快照 | 决定页面是否发布 |
| Recovery Engine | Attempt 检查点、恢复清单和重放约束 | 修改历史 Attempt |
| Handoff Engine | 将已验证成果转为下游可消费包 | 从自由文本猜测状态 |
| Publication Engine | PUBLISH/DRAFT/OMIT、路由和 noindex 证明 | 提升未验证内容质量 |
| Observability | 事件、错误分类、因果链和用户报告 | 改变业务状态 |

## 5. Stage Adapter

每个阶段通过统一的 `Stage Adapter` 概念接入编排层。以下是设计接口，不是现有 API：

```text
prepare(context) -> PreparedStage
collectHostInputs(prepared) -> HostInputBundle
executeWorker(prepared, hostInputs) -> WorkerCandidate
validateCandidate(candidate, hostObservations) -> ValidatedStageResult
prepareCommit(validated) -> StageCommitCandidate
commit(commitCandidate) -> StageCheckpoint
```

阶段特有逻辑只能存在于对应 Adapter 内。`pipeline.mjs` 最终只负责编排上述步骤和事务提交，不再包含关键词、模板、UI 或部署的格式判断。

## 6. 数据流与权威来源

```text
Locked Skill output
  -> Stage-specific read-only Adapter
  -> Canonical stage data bound to source SHA256
  -> Worker claims (T0)
  + Host observations (T2)
  -> Evidence outcome
  -> Validated stage result
  -> Artifact snapshot
  -> Recovery / Handoff / Publication projections
```

Canonical 数据是下游唯一输入。Markdown 报告继续保留，但 Recovery、Evidence、Handoff 和 Publication 不得各自解析标题或列表。

## 7. Attempt 事务

一次 Attempt 使用以下顺序：

1. 固定 Schema Bundle、Skill Lock、输入和审批上下文。
2. 创建 `ATTEMPT_STARTED` 事件。
3. 收集宿主输入和宿主观察。
4. 运行 Worker，并保存原始退出原因。
5. 验证候选产物、证据、恢复和交接候选。
6. 生成完整的 Stage Commit Candidate。
7. 按《状态与恢复规范》发布不可变对象并写入唯一 Commit Record；Commit Record 的原子发布是唯一提交点。
8. 由权威 Commit 链投影 Manifest 和用户报告，投影失败可确定性重建。

步骤 3–6 失败时不得覆盖已有 Checkpoint。有效的候选文件可以进入不可变诊断快照，但不会成为正式 Artifact。Worker 的结果状态、编排错误和成果质量分别记录。

## 8. 七阶段接入方式

| 阶段 | Canonical Adapter 输入 | 宿主可信能力 | 主要验收结果 |
| --- | --- | --- | --- |
| 首页 | Skill Markdown、图标包 | 公共页面抓取、截图、favicon 转换 | 首页资料与图标 Artifact |
| 关键词 | Skill Markdown、逐词材料 | Research Broker、来源访问观察 | Keyword Material、Evidence Outcome |
| 模板 | 模板快照、选择报告 | Git/文件快照 | Template Selection Result |
| 内容 | 已验证研究、模板、站点基线 | 文件写入与构建准备 | Content Manifest、Provenance |
| UI | 内容清单、站点修订 | 浏览器、截图、审计脚本 | UI Audit Result |
| 上线前 | 发布清单、构建产物 | 生产预览、路由发现 | Prelaunch Result |
| 部署 | 已批准计划与当前状态 | GitHub、部署、DNS、测量工具 | Deployment Result |

所有阶段共享同一 Artifact、Approval、State、Event 和错误协议。

## 9. 错误分类

| 类别 | 示例 | 对外含义 |
| --- | --- | --- |
| CONTRACT_ERROR | Schema 不兼容、Adapter 无法解析 | Agent 代码缺陷，需要修复 |
| ENVIRONMENT_ERROR | 工具不存在、权限或运行时错误 | 环境阻塞 |
| EXECUTION_ERROR | Worker 崩溃、超时、取消 | 本次执行未正常完成 |
| EVIDENCE_GAP | 来源不足、事实未证实 | 内容仍为部分完成或阻塞 |
| USER_INPUT_REQUIRED | 歧义词、登录、验证码、批准 | 等待用户 |
| SERVICE_RESTRICTED | HTTP 429、平台风控 | 服务暂停，不自动重试 |
| POLICY_DENIED | 越权、来源降级、部署范围变化 | 明确拒绝 |

这些类别不能统一折叠为 `FAILED`。用户报告同时显示执行结果、成果验收结果和下一步。

## 10. 不在 V2 中改变的边界

- 锁定 Skill 及其原生校验器保持不变。
- 平台调研仍优先使用专用 CLI、站内工具或登录态浏览器。
- 首选工具失败后不得未经授权改用公开搜索、匿名访问或第三方 API。
- HTTP 429、403、验证码和风控继续按服务策略停止。
- 未取得 Reddit 等站内一手样本时继续标记“站内数据未取得，不能下市场判断”。
- 生产部署仍需独立计划和准确 digest 审批。
- Worker 不能给自己签发可信证据或批准。

## 11. 成功标准

V2 完成不以文件数量或单元测试数量判断。必须满足：

1. 每个跨模块对象都能在 Contract Registry 中找到唯一 Schema、生成者和验证者。
2. Attempt 10 等真实失败样本可以离线重放并得到正确、可解释的状态。
3. 没有宿主观察时证据保持未验证；存在完全匹配的宿主观察时可以升级。
4. Worker 正常退出、研究部分完成和编排错误不会再混成同一状态。
5. 历史运行、审批和恢复快照不被改写或静默升级。
6. 七阶段发布和部署安全门禁保持或加强。
