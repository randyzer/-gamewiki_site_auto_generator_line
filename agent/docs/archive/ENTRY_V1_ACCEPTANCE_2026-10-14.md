# Game Site Orchestrator — 统一入口 V1 设计与验收

日期：2026-10-14
阶段：**ENTRY_V1_IMPLEMENTED_AND_CLI_TESTED / CODEX_CUSTOM_AGENT_NATIVE_DELEGATION_NOT_PROVEN**

## 1. 唯一工作目录和允许修改范围

`/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent`

本轮仅修改 `agent/` 内的入口、测试、README 和 Codex 调用适配层。没有修改 `agent/feishu-ai-employee/`、兄弟目录 `codex-skills/`、`template/`、`gameweb/`、飞书服务、网络账户、DNS/GitHub 或部署。

**架构不变**：

Codex 调用 Skill / CLI / 将来飞书入口 → 唯一 `src/cli.mjs` → `src/orchestrator.mjs` → `src/pipeline.mjs` → `src/skill-executor.mjs` → 原始专业 Skills。

本次添加的是原有 CLI 前的一层只读检查/可恢复入口草稿，不实现独立编排器、不调用单个 Skill 替代原始 Pipeline。

## 2. 增加的具体模块

- `src/entry-v1.mjs` — 验证任务卡、Steam App ID、绝对路径和当前已有素材文件；只读比较当前八个本地 Skills 的原始文件 SHA256 与 `config/skill-manifest.json` 中锁定版本；输出分阶段缺项和下一步；维护独立 `ENTRY_INTAKE_V1.json` 状态。
- `src/cli.mjs` — 增加 `entry-preview`、`entry-create`、`entry-status`、`entry-update`；预览和更新接受文件或有限大小的标准输入（`-`）。
- `.agents/skills/game_site_orchestrator/SKILL.md` — Codex 自然语言入口操作指南，先只读预览、仅解析明确给出的事实、不猜 Steam App ID/关键词；只有得到用户许可才存草稿，永不自动启动 Pipeline。
- `.codex/agents/game_site_orchestrator.toml` — 维持唯一程序执行入口，并说明上述任务预检操作。此 TOML 为项目级自定义 Agent 定义；本地 Codex 0.153.0 原生 `agent_type` 委派历史测试未通过，不能据文件存在推断已修复。
- `.agents/skills/game_site_orchestrator/agents/openai.yaml` — 更新显式调用的入口提示。
- `tests/entry-v1.test.mjs` — 入口输入合同、缺项、版本锁、独立恢复、反向校验、 CLI、无程序执行等专项测试。
- `README.md` — 入口说明与调用实例。

## 3. CLI 契约

所有命令从 `agent/` 下运行：

```sh
# 完全只读（无需写入任务文件）
printf '%s\n' '{"mode":"new-site","gameIdentity":"Hood Warfare 2","objective":"English guides site","gameMetadata":{"steam":"https://store.steampowered.com/app/5155360/"}}' |
  node src/cli.mjs entry-preview -

# 首次保存草稿必须是用户明确允许的操作
node src/cli.mjs entry-create INPUTS.json RUN_ID
# 后续只读查询
node src/cli.mjs entry-status RUN_ID
# 添加明确的材料信息 / 核对 revision 后再更新
node src/cli.mjs entry-update PATCH.json RUN_ID EXPECTED_REVISION
```

- `WAITING_FOR_USER` — 当前最基本的模式、游戏身份、目标、Steam 身份仍缺，需补充；不启动 worker。
- `READY_FOR_APPROVAL` — 当前入口身份信息齐全且八个 Skill 本地文件哈希正常，仍须单独审批正式执行；不意味着已获素材、首页报告或网站。
- `BLOCKED` — Skill 库版本漂移、manifest 缺失或不支持的任务范围；禁止自动调用 `inventory` 重写清单、更新 Skills 或启动建站。
- 对已有项目仅提示必须走现有版本化任务卡/目标 allowlist；本 V1 不转换或绕过已有站点保护。

入口按阶段列表显示 PNG/图标或生成与视觉审核、用户提供的原始关键词 `关键词.md`、canonical/域名、UI 模式、GitHub/部署计划与广告可选需求。**关键词只接收明确手工来源，绝不自动推测或生成。**

创建草稿仅写入 `agent/runs/RUN_ID/ENTRY_INTAKE_V1.json`；不创建 `manifest.json` 或 `workspaces/RUN_ID/site`；版本冲突和并发旧 revision 拒绝。新建站目录由现有运行系统分配，入口不能用用户指向模板源或已有游戏站的 `projectPath` 绕过此分配。

## 4. 测试范围与结论

全量回归日志：

`agent/runs/entry-v1-full-regression-2026-10-14.log`

**282 项通过，0 失败，0 跳过；退出码 0。**

专项包含：输入预览不创建目录、8 Skill 真实文件只读哈希核验、模拟 Skill manifest 漂移时 fail-closed、缺项后保存并恢复、运行状态未启动、不修改已有 Pipeline `manifest.json`、拒绝非法 Steam URL/ID、路径/凭据、过期修订号、同一任务重复创建、Codex stdin JSON 预览、超限输入拒绝。

Hood Warfare 2 已通过一次纯 CLI 只读预览：`READY_FOR_APPROVAL`，Skill 数量 8、无需立刻提供后续关键词文件，未创建游戏站。

## 5. 尚未完成（不得夸大）

1. 真正新的**原生 Codex 自定义子 Agent**的 `agent_type=game_site_orchestrator` 委派：本地之前验证未成功，V1 仍通过显式 `$game_site_orchestrator` Skill 调用作为实际用户入口。
2. 入口草稿与真实编排器 `run/retry` 之间的**正式审批转换桥接**尚未实现；必须人工审查、显式授权，不能把 READY_FOR_APPROVAL 当作允许 build。
3. 10 分钟自动提醒当前未接入 Entry V1 的后台调度；飞书侧只有离线逻辑，未声称已完成真实推送。
4. GitHub Skill 远程版本检查、自动兼容升级未实现；本次仅只读检测**本地**八个文件树与 manifest 是否一致。
5. 飞书入口仍是离线实现，未真实联调；其它阶段浏览器权限和所有七阶段的真实站点端到端验收仍在后续。
6. 不存在生产部署、域名修改、GitHub 提交推送或站点变更。

## 6. 下一步

优先审核自然语言 → 入口预检 → 用户确认任务卡 → 保存 run 草稿 → **经审核、单独授权的运行交接**。正式执行仍调用原有编排引擎，不新建一套工作流。

随后再做 Github Skill 远程兼容检测与自动同步、飞书消息入口接入（含 10 分钟提醒），最后开展新项目七阶段真实验收。不要因某个游戏首页不足而使总控入口开发无限延后。


## 7. Codex 自然语言实际调用验收（2026-10-14）

实际 Codex CLI：`codex-cli 0.153.0`，使用项目内显式调用 Skill
`$game_site_orchestrator`，以现有用户提供的 Hood Warfare 2、
Steam App 5155360 和英语攻略目标做**只读**入口预检。

- 第一次：`--sandbox read-only` 下 heredoc 因 zsh 临时文件
  权限失败；没有进入 Node 入口。已更改 Codex 调用 Skill 的指南，
  要求 `printf` 管道传输 JSON，不创建临时文件。
- 第二次：本机用户全局 Codex 配置加载了一个已经过期的
  外部 MCP OAuth 授权，实际预检命令未启动；安全超时终止本轮子进程。
  **没有修改用户全局设置，也没有跳过产品权限。**
- 第三次：使用 Codex CLI 官方选项 `--ignore-user-config`
  （仅这一条命令忽略全局配置，保留项目 Skill 和账户认证），
  `--ephemeral --sandbox read-only`，在 `agent/` 下运行。
  Codex 真实生成并执行以下命令，退出码 **0**：

```sh
printf '%s\n' '{"mode":"new-site","gameIdentity":"Hood Warfare 2","objective":"English guide site","gameMetadata":{"steam":"https://store.steampowered.com/app/5155360/"}}' | node src/cli.mjs entry-preview -
```

审计结果：`status=READY_FOR_APPROVAL`、`inventory.status=READY`、
8 个 Skill 全部 `OK`、`executorStarted=false`、
`siteWrites=false`，按阶段返回包括用户原始关键词 Markdown 在内
的材料清单。没有创建 run 或 workspace，没有启动浏览器/Codex worker。

实际 Codex 运行事件（保存在 Agent 内部）：
`runs/entry-v1-codex-isolated.jsonl`；
末尾回复：
`runs/entry-v1-codex-isolated-last.txt`；
进程返回 `ISOLATED_CODEX_EXIT 0`。
`--ignore-user-config` 是一次性环境隔离验证，不等于用户已有的
Codex App 全局插件/OAuth 问题已解决，也不等于
`.codex/agents/game_site_orchestrator.toml` 的原生自定义
`agent_type` 委派已通过。

**本轮正式结论：统一入口 V1 的 CLI 入口与 Codex 显式 Skill
自然语言调用链均已通过只读验收；真实 run 授权桥接、
十分钟提醒、GitHub 自动升级、全流程七阶段还在后续。**
