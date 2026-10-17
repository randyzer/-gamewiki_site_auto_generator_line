# Contract Registry 规范 V1

状态：Agent V2 设计规范。本文定义未来实现必须遵守的单一契约来源。

## 1. 目的

当前 JSON 和 Markdown 协议分散在多个模块的 `exactKeys`、正则表达式和提示文本中。Registry 将 Schema、规范化、错误码、兼容 Adapter 和测试样本集中管理，防止生产者与消费者各自解释同一字段。

## 2. 拟议目录

```text
agent/src/contracts/
  registry.mjs
  schema-validator.mjs
  canonical-json.mjs
  context-digest.mjs
  compatibility.mjs
  adapters/
    keyword-skill-v1.mjs
    legacy-manifest-v1.mjs
    legacy-recovery-v1.mjs
  schemas/
    stage-result.v1.json
    keyword-material.v1.json
    evidence-plan.v3.json
    evidence-claim.v3.json
    host-observation.v1.json
    evidence-outcome.v3.json
    artifact-manifest.v2.json
    recovery-snapshot.v2.json
    approval-snapshot.v2.json
    research-handoff.v2.json
    route-publication.v2.json
    state-event.v1.json
```

以上名称是设计目标。实现前允许根据代码审查调整版本号，但一个语义版本发布后不得原地改变。

## 3. Contract 定义

每个注册项必须包含：

- `kind` 与 `schemaVersion`。
- 规范化序列化规则。
- 唯一生成者、允许写入边界和验证者。
- 必填字段、条件字段、枚举、路径和长度限制。
- 所需信任等级。
- 与运行上下文的绑定字段。
- 兼容读取版本和明确拒绝版本。
- 正向、负向和历史回归 fixture。
- 稳定错误码。

## 4. Canonical Envelope

所有跨模块结构采用共同 Envelope 概念：

```json
{
  "kind": "...",
  "schemaVersion": 1,
  "producer": "HOST|WORKER|ADAPTER",
  "contextDigest": "<sha256>",
  "payloadSha256": "<sha256>",
  "payload": {}
}
```

`producer` 只说明来源，不能自动赋予信任。Envelope 使用按键排序、数组保序、UTF-8 的 Canonical JSON 计算摘要。文件路径在协议中统一使用相对于已绑定根目录的 POSIX 路径；绝对路径只允许出现在宿主私有引用中，不能进入 Worker 声明。

## 5. Execution Context Digest V1

`EXECUTION_CONTEXT` 是 Registry 中独立、版本化的 Contract，不是各模块自行拼接字段的工具函数。摘要采用域分离：

```text
contextDigest = sha256(
  UTF8("AGENT_EXECUTION_CONTEXT_V1\n") + JCS(normalizedPayload)
)
```

`normalizedPayload` 必须包含：

- 身份：runId、stageId、attemptId 和 requestedOperation。
- 代码与规则：source commit、工作区变更摘要、Skill Lock、Schema Bundle、Policy Version 和 Feature Gate。
- 输入：每个输入相对于已绑定根目录的路径、准确字节 SHA256、类型和 lineage。
- 执行：Permission Profile、预算、超时和允许的宿主能力集合。
- 研究：Evidence Plan 摘要、恢复快照摘要、服务暂停/恢复决定和目标平台范围。
- 站点：siteRevision、domain 和模板/内容基线摘要；不适用字段使用明确的空对象，不能由各模块任意省略。

审批对象、审批 ID、创建时间、消费状态和运行输出不进入 Context，从而避免循环哈希。审批改为绑定下面的用途摘要：

```text
purposeDigest = sha256(
  UTF8("AGENT_PURPOSE_CONTEXT_V1\n") +
  JCS({contextDigest, purpose, purposePayload})
)
```

`purposePayload` 只包含该审批新增的范围，例如恢复哪一项服务、批准哪个 Handoff 摘要、执行哪个部署计划摘要。不同 purpose 和不同 Contract 版本使用不同域前缀，摘要永不跨版本等价。

### 5.1 Canonical JSON 规则

- 输入先用拒绝重复键的 JSON 解析器读取，再递归校验 Schema。
- 字符串规范化为 Unicode NFC；对象键按 RFC 8785 JCS 排序，数组顺序保留。
- 时间统一为 UTC epoch milliseconds 整数；协议数字只允许安全整数，拒绝浮点、`NaN`、Infinity 和负零。
- `null` 与字段缺失语义不同；Schema 必须逐字段声明是否允许。
- 路径转换为相对于已绑定根目录的 POSIX 路径，拒绝绝对路径、空段、`.`、`..`、反斜杠和路径逃逸。
- 文件绑定使用准确原始字节 SHA256，不对换行或文本编码做隐式转换。

### 5.2 失效规则

身份、代码/规则、任一输入字节、权限、Evidence Plan、Recovery、服务决定、站点基线或 Feature Gate 变化时，`contextDigest` 必须变化，所有绑定旧 Context 的执行审批失效。只改变某个用途的 `purposePayload` 时，仅该用途及依赖它的下游审批失效；例如服务恢复不影响已保存的只读 Recovery 身份，但会使研究执行 Preview 失效。Registry 维护字段到用途的依赖表，Preview、Receipt、Recovery、Handoff 和 Deployment 只能调用同一个构造器。

## 6. Keyword Material Adapter

锁定关键词 Skill 继续输出现有 Markdown。唯一的 `keyword-skill-v1` Adapter：

1. 按锁定 Skill 的输出契约读取状态、来源和 `### 待确认` 列表。
2. 兼容历史明确存在的 `- 缺口:` 行，但将其标记为 legacy source syntax。
3. 生成 `KEYWORD_MATERIAL` 结构并绑定原 Markdown SHA256。
4. 为每个未解决项生成稳定 gap ID；ID 由关键词、规范化描述和来源摘要派生。
5. `COMPLETED` 存在实质待确认项时返回 `CONTRACT_INCOMPATIBLE`。
6. `PARTIAL/BLOCKED` 没有可识别缺口时返回明确错误，不猜测完成状态。

Evidence、Recovery、Handoff 和 Publication 只读取 Adapter 结果。

## 7. Evidence 协议

Evidence Plan、Claim、Host Observation 和 Outcome 必须共享相同的任务标识：

```text
taskId = sha256(runId + stage + recoveryDigest + keyword + gapId + policyVersion)
```

共同规则：

- `planSha256` 使用统一字段名。
- Evidence 路径必须是 `evidence/` 下的相对路径。
- Access Result 使用注册枚举，例如 `HTTP_200`、`TOOL_SUCCESS`、`HTTP_429`。
- `supportedFacts` 只能引用 Plan 中稳定的 acceptance criterion ID，不比较自由文本。
- 没有有效证据的任务通过 `stopObservation` 表达，不伪造非空事实。
- Claim 无效时保留具体错误；不得降级成“未提交 Claim”。

## 8. Schema Bundle

每个 Attempt 在开始时固定一个 Schema Bundle：

```json
{
  "bundleVersion": 1,
  "contracts": [
    {"kind": "KEYWORD_MATERIAL", "schemaVersion": 1, "sha256": "..."}
  ]
}
```

Attempt 运行期间 Registry 文件变化必须使本次执行失效。Retry 可以选择新 Bundle，但必须重新预览并显示兼容或迁移影响。

## 9. 兼容策略

- 旧结构只通过 `compatibility.mjs` 和明确 Adapter 读取。
- Adapter 不改写原文件；输出新对象并记录源路径、源哈希和 Adapter 版本。
- 历史 Worker Claim 永远保持 T0，不因格式迁移升级为宿主观察。
- 不可无损解释时返回 `MIGRATION_REQUIRED` 或 `CONTRACT_INCOMPATIBLE`。
- 新写入统一使用最新批准版本，禁止双写两套不同语义。

## 10. 错误码

最低要求：

- `CONTRACT_KIND_UNKNOWN`
- `CONTRACT_VERSION_UNSUPPORTED`
- `CONTRACT_SCHEMA_INVALID`
- `CONTRACT_BINDING_MISMATCH`
- `CONTRACT_PATH_INVALID`
- `CONTRACT_DIGEST_MISMATCH`
- `CONTRACT_INCOMPATIBLE`
- `MIGRATION_REQUIRED`
- `TRUST_LEVEL_INSUFFICIENT`
- `CONTEXT_CANONICALIZATION_INVALID`
- `CONTEXT_DIGEST_MISMATCH`

错误必须包含 JSON Pointer 或字段路径、实际 kind/version 和来源文件，但不能包含凭证或不必要的正文。

## 11. Registry 验收

1. Worker 提示和输出模板从 Registry 派生或由同一构造器生成。
2. 生产校验和测试校验调用同一验证函数。
3. Attempt 10 的真实 Markdown 能生成正确的 2 COMPLETED、25 PARTIAL、4 BLOCKED 结构。
4. Attempt 10 原始 Claim 得到精确字段错误；规范化 Claim 在缺少宿主观察时保持未验证。
5. 所有 Schema 都有未知字段、缺字段、路径逃逸、摘要错误和版本漂移测试。
6. 所有模块对同一 Context Fixture 产生完全相同的摘要；每个受保护字段变化都按依赖表使准确的审批集合失效。
7. 重复键、非 NFC 字符串、非法数字、路径别名和跨版本摘要均被拒绝或产生不同摘要。
