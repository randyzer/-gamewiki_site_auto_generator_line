# M2 浏览器宿主人工审批开发结果 — 2026-10-14

状态：**PARTIAL / HOST_BSK_APPROVAL_VERIFIED / COMPLETE_GAME_HOMEPAGE_NOT_PASSED**。

## 目标架构（已实现的代码路径）

`$game_site_orchestrator` → 唯一 `agent/src/cli.mjs` → `orchestrator.mjs` → `pipeline.mjs` → `skill-executor.mjs`。

当宿主显式设置 `GAME_SITE_BROWSER_HUMAN_DIALOG=enabled` 且阶段为首页调研时：

1. `askMacBrowserLaunch` 使用 Mac 原生确认窗口取得本轮启动许可。拒绝、取消、50 秒无响应时，不启动浏览器命令。
2. `collectTrustedSteamEvidence` 在**可信宿主进程**内创建 `bsk` 命令门。每条请求经现有 URL 白名单、stage/runId、一次性请求和 SHA256 校验，并交由 `askMacHumanApproval` 展示精确命令摘要。仅当真实 Mac 窗口返回 Approve 才生成 30 秒有效、单次可用的回执；受控 `bsk` 随后才执行该命令。
3. 严格固定动作：session start → owned tab list → Steam 官方商店 URL navigate（`domcontentloaded`、30 秒、JSON）→ typed JSON-LD observe → 单独批准 session stop。任何一步失败都 BLOCKED；关闭窗口无法确认则不得作为有效证据。
4. 本次任务在 `runs/<runId>/` 下以只读权限生成 `HOST_APPROVED_STEAM_EVIDENCE_<UUID>.json`（位于 Codex worker 的可写 native 目录之外），只包含明确允许的公开游戏字段及宿主 bsk-audit 记录引用。
5. 原有 Codex worker 继续 `--ignore-user-config --sandbox workspace-write --approval_policy=never`，不装 MCP 浏览器工具，只读取宿主文件并使用本来的原生 Skill 契约和原生产物验收。**宿主证据 ≠ Skill PASSED**。图标 PNG、favicon ZIP、完整研究资料缺失仍必须 BLOCKED。

其余浏览器阶段（关键词调研、UI 审计、上线前验收）**未启用宿主方案，仍 BLOCKED**。UI 源码优化另有文件级隔离门槛，不能被宿主浏览器许可代替。可选广告和生产部署不属于本轮。

## 真实进程证据（非 Mock）

- Mac mini 用户会话存在：`gui/501`；`bsk 0.3.2` 的 SHA256 与 `config/bsk-command-policy.json` 完全相符。
- **默认未启用审批**时，独立 bsk MCP 服务能列出工具，但 `status --json` 返回 `APPROVAL_CAPABILITY_UNAVAILABLE`；没有真实 browser 命令。证据：`runs/m2-browser-broker-fd6f42dc-2e94-4825-a9d6-ac51756b31b0/`。
- **Mac GUI 审批实际返回 Approve** 后，`bsk status --json` 经命令门 `APPROVED`、`COMPLETED`。本地审计存在一次性批准记录。证据：`runs/m2-browser-broker-4e36fd60-3aae-427b-971f-5917080b6d9d/`。
- 一次真实 Bodycam 只读浏览器流程：创建独立窗口 PASSED，列出标签页 PASSED，navigate 因当时缺少 `--json`/明确等待返回 `DAEMON_UNREACHABLE`；独立批准后成功关闭窗口。此后已修正导航命令参数，并运行 27 项命令门测试。证据：`runs/m2-real-steam-99cfef9f-578a-485d-ba23-734a077f10e9/`。
- 修复后再次请求启动真实窗口时，50 秒未获 Mac 按钮批准，返回 `COMMAND_NOT_APPROVED`；没有启动窗口。这是**预期的安全拒绝**，不能作为修复后网页采集成功。证据：`runs/m2-real-steam-9bb5c9c5-0dc1-430e-8e8f-07ea91f3d594/`。

## 为什么未采用 Codex 子进程 MCP 方案

- 在该 Mac Codex CLI 0.153.0 使用 `--ignore-user-config` 时，工具配置未可靠加载。
- 独立 CODEX_HOME 能让非交互 Codex 识别并尝试 `scoped_game_bsk` 工具，但实际调用被 `MCP tool call requires approval, but approval policy is never` 阻断；即使 MCP server 层配置为 auto，受该 CLI 执行模式约束，仍无法完成调用。
- **禁止**使用 `dangerously-bypass-approvals-and-sandbox` 或 `--approve-for-me` 解决。已删除实验性最小 CODEX_HOME 模块和会话内授权软链接，仅保留不含凭据内容的失败证据记录。
- 采用“宿主直接执行获批命令 → Codex worker 消费公开证据”的方案，绕开的是**不适配的工具传输环节**，不是逐命令人工审批本身。

## 测试与操作

- `node --test tests/macos-human-approval.test.mjs tests/trusted-browser-host.test.mjs tests/browser-host-executor.test.mjs`：新增 Mac 批准、固定来源数据、命令拒绝、超时、清理与 worker 交接单元测试。
- `node scripts/browser-broker-smoke.mjs deny`：默认不允许执行的真实进程 smoke，不调用 bsk 命令。
- `node scripts/browser-broker-smoke.mjs interactive`：**会弹出 Mac GUI**；仅查询一次 bsk status，必须用户主动点击 Approve。
- `node scripts/browser-trusted-host-smoke.mjs`：**需操作者在 Mac mini 可见审批窗口**，先批准启动，再分别确认 session、tab、navigate、observe、close。最多可能出现六个窗口，操作期间不要离开；只有真实公开网页数据与关闭确认均通过，才返回 EVIDENCE_READY。这个结果仍不是七阶段或首页 Skill PASSED。
- `GAME_SITE_BROWSER_HUMAN_DIALOG=enabled node src/cli.mjs run INPUTS.json RUN_ID`：只在用户提供准确游戏身份、原始关键词路径并授权真实任务后尝试，Codex child 仍保持安全沙箱和原生产物审查。**本次未启动此命令。**
- 不要从后台无人值守任务设置 `GAME_SITE_BROWSER_HUMAN_DIALOG=enabled`：UI 超时将导致 BLOCKED。

## 本轮改动

新增：`src/macos-human-approval.mjs`、`src/trusted-browser-host.mjs`、`tests/macos-human-approval.test.mjs`、`tests/trusted-browser-host.test.mjs`、`tests/browser-host-executor.test.mjs`、`scripts/browser-broker-smoke.mjs`、`scripts/browser-public-steam-smoke.mjs`、`scripts/browser-trusted-host-smoke.mjs`。

修改：`src/skill-executor.mjs`、`src/bsk-tool-server.mjs`、`src/bsk-capability.mjs`、`src/bsk-command-gate.mjs`，均仅在 `agent/` 内。

**不修改**飞书、原游戏站、原 Skill、模板、全局 Codex 配置、GitHub/DNS/部署设置。

## 当前下一道验收门

操作者需能看到并点击 Mac mini 宿主弹窗，然后运行 `browser-trusted-host-smoke.mjs` 验证修复后的 Steam 公开 JSON-LD 读取与逐命令关闭。未取得真实证据前不宣布首页研究恢复；后续还需继续解决 favicon 文件传输及其他三个浏览器阶段的宿主采集契约。

## 证据防篡改加固

可信宿主证据存放于 run 根目录（非 worker 可写的 nativeDirectory），创建权限为 0400。worker 获得只读路径与 SHA256；宿主在 worker 退出后、原生产物校验前重新核验字节哈希，不匹配时拒绝。回归测试包括故意改写证据后被拒绝。


## 2026-10-14 补充：Steam 公开数据提取真实复验通过

原有 JSON-LD-only 提取限制已通过新增受限 `STEAM_PUBLIC_GAME_META_V1` fallback 修复。真实 Mac 审批的五条 bsk 命令均 APPROVED/COMPLETED，公开来源证据为 `EVIDENCE_READY`，关闭窗口成功，原有 Skill 阶段仍未进入 PASSED。新运行及源码修改清单见 [M2_STEAM_PUBLIC_CAPTURE_REPAIR_2026-10-14.md](M2_STEAM_PUBLIC_CAPTURE_REPAIR_2026-10-14.md)。
