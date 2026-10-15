# P0 入口草稿到正式 Pipeline：审批交接设计

状态：READ_ONLY_PREVIEW_IMPLEMENTED / PRODUCTION_HANDOFF_BLOCKED / P0_NOT_COMPLETE。本文不是执行授权，没有新增启动命令。后续接口与默认门禁见 [可信审批边界](P0_TRUSTED_APPROVAL_BOUNDARY_2026-10-14.md)。

## 当前可用入口

显式 `$game_site_orchestrator` 把用户明确提供的信息转换为 JSON，先调用
`node src/cli.mjs entry-preview -`。缺少当前必需字段时显示 WAITING_FOR_USER；
本地 Skill 锁漂移时显示 BLOCKED；READY_FOR_APPROVAL 只代表入口材料检查通过。
关键词等后续阶段材料仍可缺失，不能将 READY 当作全部阶段可运行。

用户明确允许保存草稿后，调用 `entry-create - RUN_ID`，返回 revision 1。
查询用 `entry-status RUN_ID`；补充材料用 `entry-update - RUN_ID EXPECTED_REVISION`。
每次修订保留同一个 run ID，递增 revision，保持 approvedToRun=false。
陈旧 revision、并发写入冲突、链接路径和已有 Pipeline manifest 均拒绝。
错误返回 BLOCKED 与固定 code，退出码 2；WAITING_FOR_USER 也为 2。
成功预览和保存为 0。所有这些命令均不启动 worker。

## 将来执行前必须绑定的审批内容

审批对象至少包含草稿 run ID、revision、草稿文件 SHA-256、输入材料 SHA-256、
8 项 Skill 的版本与 inventory 文件 SHA-256、新 execution run ID、准确目标 workspace、
允许执行的阶段、批准者和批准时间。每次修改草稿、材料或 Skill lock，旧审批失效。
执行票据必须由可信的人类授权通道产生；JSON 中自填 approvedToRun=true 不是授权。

审批说明必须写明：现有 run/retry 可能复制模板、写隔离站点、启动 Codex worker、
请求浏览器/网络/图像工具，并产生运行日志。生产 push、部署、DNS、索引、统计、广告
和付费操作需要独立审批。保存草稿、READY 状态、本文和本轮测试均不授予这些权限。

## 正式交接顺序（仅只读预览与一致性校验已实现）

1. 重新读取草稿，验证 kind、revision、内容摘要和无 Pipeline 污染。
2. 重新核对 Skill 锁与全部将使用的输入材料，不重算 inventory 掩盖漂移。
3. 明确展示执行输入、实际副作用和缺失条件，取得绑定上述内容的人工审批。
4. 重新验证票据与当前数据一致，独占占用全新的 execution run ID；拒绝已存在的
   run 或 workspace，禁止使用入口草稿目录作为 Pipeline 目录。
5. 在新的执行目录记录草稿来源与审批摘要，向现有 CLI/orchestrator 传入经过
   明确字段映射的 inputs；不得直接把 ENTRY_INTAKE_V1.json 改名为 manifest。
6. 由唯一的现有 Pipeline 执行阶段；失败保持 BLOCKED/WAITING_FOR_USER，
   恢复执行也需验证审批范围与状态，不另建状态机。

## 为什么本轮 DEFERRED

现有 `src/orchestrator.mjs` 的 run/retry 接受普通输入并可自动恢复已有 manifest，
没有绑定入口 revision/摘要的执行票据校验。安全接入需要在正式执行边界增加票据校验、
独占执行目录与失败恢复设计，不能仅通过入口写一个 approved 标志来保证。
本轮禁止真实 worker 与外部副作用，因此没有试运行正式 Pipeline，也没有提供
可绕过这些检查的自动 promote/run 命令。最初预览实现只拒绝草稿目录和封装，未收紧普通 inputs 的旧 CLI 权限；后续续作已默认阻断全部旧 CLI run/retry，并在唯一 orchestrator 增加宿主审批门禁，详见上述可信审批边界。门禁不是对同权限 JavaScript 或底层直接调用的安全沙箱。

## 当前环境限制

`.agents/` 与 `.codex/` 在当前会话权限中为只读，未修改已有适配器文件。
已有 Skill 已包含 preview → 明确许可 → create/status/update 的说明；本文件和
README 补充本轮接口与交接约束。本轮尝试显式 Skill 的真实 Codex 调用，但初始化 in-process app-server client 时 Operation not permitted，exit 1，未进入模型或 Skill；自然语言保存/恢复 BLOCKED。没有降级或绕过沙箱，
也未验证原生自定义 agent_type 委派；它们不属于 CLI 测试通过的证明范围。

## 已实现的只读命令（2026-10-14 续作）

从 agent 根目录执行：

```sh
node src/cli.mjs entry-handoff-preview REQUEST.json
node src/cli.mjs entry-handoff-validate SNAPSHOT.json
```

REQUEST 严格只有 `runId`、`expectedRevision`、`executionRunId` 三字段。
预览输出 `snapshot`；将这个字段的对象作为 SNAPSHOT 输入（不是整个输出）。
两个命令也支持 `-` 标准输入。成功退出码 0，拒绝为 BLOCKED / exit 2。

快照绑定草稿原始字节 SHA-256、revision、输入及其摘要、已提供关键词/图标的字节摘要、
八 Skill 版本、inventory SHA-256、固定新 run workspace 和拟执行阶段。
缺少当前必需输入、污染的草稿、同名/占用/链接执行路径会阻断。
后续缺项仍单列，PREVIEW_ONLY 不是全阶段可运行证明。

校验重新执行上述检查并比较整个快照；内容、revision、材料、范围或锁摘要不一致即拒绝。
一致仅返回 CONSISTENT_NOT_AUTHORIZED，始终 approvedToRun=false。
此流程不接受批准者或批准时间作为可执行授权，不签票据、不创建执行目录、不调用 worker。
预览会展示拟执行副作用和独立生产审批要求；正式授权仍需要可信通道生成绑定快照的票据。
只读检查不能消除检查后并发变更，真正执行边界仍需原子占用和再次核验，因此未提供 promote 命令。
