# C2C e714：G0 运行许可与隔离验证实施计划

日期：2026-10-14；任务目标仍是整个 G0–G6 完成，本文件仅管理第一批实施，不替代总体路线图。

> 执行方式：在当前会话内按测试先行逐项实施，Codex 负责代码，ChatGPT 负责规划和复核。当前目录无 Git，不初始化仓库、不创建提交。

## 已确认设计与范围

- 复用现有宿主 issue/consume/prepare、orchestrator 和 Pipeline，不新增任务状态机。
- 一次性票据约束消费和首次启动。运行许可激活后不继续受票据 60 秒期限影响，但持续校验范围、目录、材料和锁，停止或重启后不可复用。
- 实测使用同一 Codex sandbox 的合成 canary，不读取用户凭据、不修改真实站点或模板。
- 不解除 `ENTRY_HOST_ISOLATION_UNVERIFIED`，除非实际支持的执行边界经独立验收。当前进程内嵌沙箱受限时记录准确 BLOCKED，不换工具或关闭 worker 沙箱。
- 最终验收对象由用户确认为 Wallpaper Engine / Steam 431960，Help & Troubleshooting Wiki；唯一关键词原件为用户指定目录下 `关键词.md`。用户同意本轮只使用完整可读词，截断词和缺失行保留待补，原件不修改。

## 任务1：一次性票据与运行许可

文件：`src/local-entry-approval.mjs`、`src/orchestrator.mjs`、`tests/local-entry-approval.test.mjs`、`tests/entry-approval.test.mjs`、`tests/entry-host-bootstrap.test.mjs`。

- [x] 新增回归：prepare 后未启动且过期拒绝；期限内 start 后长任务可继续；材料/锁变化、超范围阶段、stop 后检查拒绝；启动审计不含 bearer ticket；同一许可不能 start 两次。
- [x] 运行 `node --test tests/local-entry-approval.test.mjs`，观察新增行为测试失败。
- [x] 在既有 prepare 返回的宿主许可中实现 start/stop；首次 start 写入不可覆盖的宿主审计并绑定原始批准摘要；verify 在未启动时核验短期有效期，激活后检查活动许可及既有完整性；不从任务 JSON 恢复许可。
- [x] 唯一编排器在 Pipeline 初始化前激活，在结束/异常时停止；每阶段 verify 绑定当前 Skill 范围。未经新恢复授权继续拒绝 retry。
- [x] 运行上述三份授权测试和 `tests/recovery.test.mjs`。不得放宽测试来接受伪造许可。

## 任务2：worker 最小权限与真实 canary

文件：`tests/worker-permissions.test.mjs`、`tests/worker-isolation.test.mjs`；必要时新增小型 worker 策略/探测模块和受控探测脚本。

- [x] 权限测试检查固定 workspace-write、approval never、忽略用户配置、阶段准确 writable root、过滤宿主票据/飞书环境；禁止任意环境透传。
- [x] canary 在隔离 TEST 区模拟宿主审批文件、凭据、模板、原站、其他 run 和允许产物目录；真实 CLI sandbox 子进程尝试读写，仅记录 allowed/denied 和错误码，不输出 canary 内容。
- [x] 保存实际平台、CLI、策略、进程退出码和能力结论；无法施加 sandbox 的 EPERM 与“沙箱施加成功但能越权读”分开报告。
- [x] 实际未阻断受保护 canary 时，生产 gate 保持 BLOCKED，并明确缺少读隔离的具体证据。

## 任务3：验证与复核

- [x] 运行 `npm run test:entry-host` 和必要的新增定向测试；先修复本轮新增行为失败。
- [x] 定向通过后运行一次 `npm test`，并运行相关模块的 `node --check`。
- [x] 更新总体路线图、文档索引与本轮验收报告；历史结果保留，区分 CODE/OFFLINE/OS_ISOLATION/REAL_WORKER。
- [x] 用 C2C 记录实际命令/输出、变更范围和 SHA256，发 EXECUTED 给 ChatGPT 复核，并请求下一批 G0 后续与 G1–G6 方案。不能把第一批通过当成整个 Agent 完成。

## 本批结果与尚未完成范围

运行生命周期及合成文件探测完成，实际命令/测试见 [本批验收](G0_RUNTIME_AND_CANARY_ACCEPTANCE_2026-10-14.md)。probe 的命名 profile 仅在固定脚本使用；未接入生产 executor。可信恢复、网络/GUI/进程边界及 G1–G6 真实业务仍未完成。本文件复核条目须以 ChatGPT 实际回执为准，ChatGPT 已实际回执 ACCEPT_SCOPED，并提供 iteration 2；整体 G0–G6 仍未完成。
