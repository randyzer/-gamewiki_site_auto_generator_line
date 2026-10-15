# Codex 自定义 Agent 接入设计与验收 — V1

日期：2026-10-14  
状态：Codex 项目级注册文件已创建；当前客户端无法按指定 agent_type 委派。补充同名 Codex 调用 Skill，已实测通过只读调用。

## 唯一架构

Codex App / Codex CLI -> Codex 项目级自定义 Agent `game_site_orchestrator` -> `src/cli.mjs` -> `src/orchestrator.mjs` -> `src/pipeline.mjs` -> `src/skill-executor.mjs` -> 7 个核心 Skill（广告为可选分支）。

根目录是本 `agent/`，`feishu-ai-employee/` 仅为未来消息适配器。本次**不修改、不重启、不验收飞书**。总控只有一套，不在 TOML 再写任何第二套状态机。

## 注册入口

- 相对路径：`.codex/agents/game_site_orchestrator.toml`
- `name = "game_site_orchestrator"`，含必需的 `description` 和 `developer_instructions`。
- 项目级文件应由从本 agent 根目录启动的、信任该目录的 Codex 会话发现。项目当前没有单独的 `trust_level` 配置，是否识别须以实际委派为准；**不擅自修改 ~/.codex/config.toml**。
- 项目级 TOML 是 Agent **定义/指令**，不是启动一个后台服务、不是注册系统级命令，也不代表能独立运行真实七阶段任务。
- 官方依据：https://developers.openai.com/codex/subagents （Custom agents）。

## 程序调用契约（以现存 src/cli.mjs 为准）

在 agent 根目录运行：

- `node src/cli.mjs inventory`：**会更新** `config/skill-manifest.json`，不是只读。
- `node src/cli.mjs review-card CARD.json`：读取卡片并返回摘要，可用于安全测试，但须确认测试卡不含敏感数据。
- `node src/cli.mjs preflight CARD.json [RUN_ID]`：会在 runs 生成检查报告，非只读。
- `node src/cli.mjs run INPUTS.json [RUN_ID]`：启动总控，**可能修改隔离站点目录并启动真实 Codex 子进程**；需要用户明确批准。
- `node src/cli.mjs retry INPUTS.json RUN_ID`：继续已有运行，同样需要审批。
- `node --check src/cli.mjs`：只检查语法，可作为首次委派冒烟测试。

返回码 2 可能对应 WAITING_FOR_USER、BLOCKED、FAILED、PARTIAL，不能直接当作程序崩溃，须读取 stdout JSON 状态和运行 manifest。

## 使用方式

在 Codex App 中**以 agent/ 为项目工作目录**新建会话（确保当前客户端已将该目录设为 trusted），发出：

> 请把“检查 src/cli.mjs 的真实命令契约，只执行 node --check src/cli.mjs，不启动任何任务”委派给 game_site_orchestrator 自定义 Agent，并汇报子 Agent 实际执行的命令及结果。

这与 Skill 的 `$skill-name` 快捷引用不同，是 Codex **子 Agent 委派**。如需每次直接输入普通自然语言并自动选择正确角色，父 Agent 会负责是否创建子线程。

## 首轮验收分层

1. TOML 文件存在：已确认。
2. TOML 语法和必填键：使用本机 Python 3.12 解析通过。
3. Codex 版本与 multi_agent：本机 `codex-cli 0.153.0`、`multi_agent=stable/true`。
4. 指定 `game_site_orchestrator` 的真实委派：**必须查看 JSON trace 确认**；仅凭模型声称不算。
5. 子 Agent 对现有 CLI 的只读命令：以执行记录为准。
6. 实际真实七阶段建站和飞书接入：**本轮不验收**。

本轮不访问飞书凭据、不部署、不触碰模板和已有游戏站、不操作 GitHub/DNS/GSC/GA4/广告。

## 风险与后续

- Codex 项目若未设置为 trusted，本地 .codex 可能不被读取，需由用户在客户端信任项目。
- 子 Agent 通过 CLI 的 run/retry 再启动 Codex worker 属于嵌套运行，尚未测试超时、权限、成本与资源隔离。此类任务需独立审批和实测。
- 主 Agent 只有在结果可追溯到同一 `runs/<run_id>/manifest.json` 时，才能声明接入统一总控。不可仅凭自然语言回答声称自动化已完成。

## 2026-10-14 实际验证记录

**可以直接使用的 Codex 调用入口**：`$game_site_orchestrator`，文件 `.agents/skills/game_site_orchestrator/SKILL.md`，附带 `agents/openai.yaml` 且 `allow_implicit_invocation=false`。这个 Skill 只负责调用现有程序，并未实现第二套总控业务逻辑；它与未来的 Codex 自定义子 Agent 名称相同，但不是同一个注册机制。

真实执行证据：`runs/codex-registration-smoke/codex-skill-smoke.jsonl`。Codex 实际读取了 SKILL.md 和 src/cli.mjs，随后执行 `node --check src/cli.mjs`（退出码 0），并正确列出 inventory/review-card/preflight/run/retry。没有调用任何可能修改站点的命令。

另行验证直接 CLI `node src/cli.mjs review-card config/bodycam-existing-project.task.json` 成功返回 JSON，包含 `sourceWrites:false` 和 `releaseAuthorized:false`；该命令只读取输入，没有触发真实建站。

**尚未通过的项目级子 Agent 指定类型委派**：配置 `.codex/agents/game_site_orchestrator.toml` 已经 TOML 解析成功；但当前 Codex CLI 0.153.0 可见的 `spawn_agent` 不支持 `agent_type` 参数，仅支持 `task_name/message/fork_turns/model/reasoning_effort`。强制启用 `multi_agent_v2` 也没有改变这项限制。不能将自定义 Agent 文件存在或模型使用同名 task_name 当作指定类型委派已成功。证据：`codex-trace-selected-model.jsonl`、`codex-trace-temporary-trust.jsonl`、`codex-trace-v2.jsonl`，均返回 `CUSTOM_AGENT_NOT_AVAILABLE`。

临时测试曾遇到全局 Codex 配置指向当前 ChatGPT 账号不支持的模型；后续仅在单次命令中选择 `gpt-5.6-sol` 完成了只读验证，并未更改全局设置。

### 用户调用示例

在 Codex App 打开本项目 agent/ 目录，新会话输入：

`$game_site_orchestrator 先检查总控 Agent 的输入要求和状态，只读分析，禁止启动 run/retry。`

只有用户明确批准真实任务输入、目标和写入范围后，才允许由当前 Codex 适配层调用现有 `node src/cli.mjs run/retry`。不得绕过现有审批门或修改 Feishu。

### 未完成

- Codex 自定义子 Agent 按指定 `agent_type` 的真实委派，需升级/调整本地客户端并另行验证。
- 嵌套 Codex worker 的执行、浏览器权限及真实七阶段建站，本轮仍未验收。
- 飞书入口联调后置。
