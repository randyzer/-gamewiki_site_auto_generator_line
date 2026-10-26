# 信任与授权模型 V1

状态：Agent V2 设计规范。

## 1. 信任等级

| 等级 | 生成者 | 可证明内容 |
| --- | --- | --- |
| T0 | Worker | Worker 声称执行过某项工作 |
| T1 | 宿主文件验证器 | 文件存在、路径受限、字节与哈希一致 |
| T2 | Host Evidence Broker | 受批准工具在特定时间对特定目标取得了特定结果 |
| T3 | 宿主验收器与用途限定审批 | 结果满足指定门禁，可触发特定状态转换 |

T2 只能证明访问结果，不能单独证明事实结论正确。事实支持仍需 Evidence Engine 将来源、时间、适用版本和 acceptance criterion 对应起来。

## 2. 权限主体

- 用户：签发明确用途的审批。
- Approval Engine：验证、一次性消费和撤销审批。
- Host：持有真实文件、浏览器、网络和外部服务能力。
- Worker：在权限配置内生成候选内容和声明。
- Locked Skill：定义业务输出要求，不拥有宿主权限。
- 外部页面或工具输出：仅是不可信输入，不是指令或授权。

## 3. Host Evidence Broker

Broker 是所有需要提升为 T2 的外部访问的唯一入口。目标实现包含：

- `ResearchToolAdapter`：Serper、平台专用 CLI、yt-dlp 和批准的公共页面读取。
- `BrowserAdapter`：宿主浏览器、截图和登录态站内访问。
- `BuildAdapter`：依赖安装、构建、生产预览和审计脚本。
- `DeploymentAdapter`：仅在部署计划批准后开放 GitHub、托管、DNS 和测量操作。

Worker 只能调用受控 wrapper 或请求描述；不能直接创建 T2 记录。Broker 在 Worker 可写目录之外生成观察记录，至少包含：

- run、stage、attempt、taskId。
- 工具身份和版本。
- 目标 URL、平台对象或命令范围。
- 开始/结束时间与结果枚举。
- 保存正文或元数据的相对路径、字节数和 SHA256。
- 服务停止条件。
- 对应审批和 ExecutionContextDigest。

观察记录不保存密钥、cookie、Authorization header 或不必要的个人信息。

## 4. 平台与工具策略

1. 平台调研优先使用 OpenCLI、平台专用 CLI、站内工具或登录态浏览器。
2. 首选工具失败时 Broker 返回结构化诊断，不能自行切换公开搜索、第三方 API、curl、匿名访问或镜像。
3. HTTP 429 第一次出现后生成 `SERVICE_RESTRICTED` 观察并停止该服务在本 Attempt 的后续调用。
4. 恢复暂停服务必须有新的用途限定审批，并在 Preview 中显示。
5. 当前进程未取得登录态只能表述为当前进程缺少凭据，不能断言用户账号未登录。
6. 站内一手样本不足时保留明确限制，不下市场判断。

## 5. Approval 类型

| 类型 | 授权范围 | 不授权 |
| --- | --- | --- |
| RUN_EXECUTION | 指定上下文的一次 run/retry | 部署、服务恢复 |
| SERVICE_RESUME | 指定服务、操作和 Attempt 的恢复 | 其他服务或替代工具 |
| PARTIAL_HANDOFF | 指定恢复快照的受控下游交付 | 把 PARTIAL 改成 COMPLETED |
| UI_MODIFICATION | 指定 siteRevision、文件和问题范围 | 任意站点重构 |
| DEPLOYMENT_PLAN | 生成部署计划 | 执行部署 |
| DEPLOYMENT_EXECUTION | 执行准确 plan digest | 计划外资源和费用 |

所有审批绑定 ExecutionContextDigest、用途、有效期、一次性消费状态和当前受保护状态。审批不得通过共享 digest 相互替代。

### 5.1 审批绑定与失效

Approval Engine 只接受 Contract Registry 生成的 `contextDigest` 和 `purposeDigest`。审批记录绑定 `purposeDigest`、审批类型、签发人、有效期和一次性消费 nonce；审批记录本身不参与被批准摘要的计算。

| 变化 | 必须失效的审批 |
| --- | --- |
| 输入字节、Skill Lock、Schema Bundle、Policy、权限或 Feature Gate | 该 Context 下全部未消费审批 |
| Evidence Plan、Recovery 选择、预算或服务决定 | `RUN_EXECUTION` 及依赖本次执行结果的下游审批 |
| 单项服务恢复范围 | 对应 `SERVICE_RESUME` 和引用它的新执行 Preview；其他暂停服务不被授权 |
| Handoff 内容、Recovery 摘要或 publication disposition | 对应 `PARTIAL_HANDOFF` 和依赖它的发布审批 |
| siteRevision、domain 或部署计划摘要 | `UI_MODIFICATION`、`DEPLOYMENT_PLAN`、`DEPLOYMENT_EXECUTION` 中依赖该字段的审批 |
| 只读投影或用户报告格式 | 不失效权威审批，但投影必须可从原 Context 重建 |

Approval Engine 必须根据 Registry 的字段依赖表计算失效集合并向 Preview 明示，调用方不能自行决定“变化不重要”。用途错配、版本错配、摘要错配、过期、已消费或依赖项变化都 fail closed。

## 6. Evidence 判定

Evidence Engine 只有在以下条件全部满足时才能将 T0 Claim 升级：

1. Claim 符合 Registry Schema，并匹配已批准任务。
2. 文件通过 T1 验证，且是本 Attempt 新增或按计划改变。
3. 存在完全匹配 taskId、路径、URL、摘要、结果和工具的 T2 Observation。
4. 来源类型和时间满足 Plan 的 acceptance criteria。
5. Material 状态变化只关闭由该任务覆盖的 gapId。

任何一项缺失均保持 `NEW_FILES`、`NO_PROGRESS` 或对应的部分结果。不得用 Worker 日志、自然语言报告或后补 JSON 冒充宿主观察。

## 7. 安全不变量

- Worker、网页内容和工具输出不能签发审批。
- Worker 不能写宿主观察存储。
- Host Observation 不能越过未批准的工具、目标或服务暂停决定。
- T2/T3 记录必须追加写、哈希绑定并防止路径替换和重放。
- 生产权限只在已批准的 Deployment Adapter 中短时开放。
- 安全失败保持 fail closed，并保留具体原因。
