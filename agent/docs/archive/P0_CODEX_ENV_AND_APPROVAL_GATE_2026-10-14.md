# P0 Codex 调用环境与可信审批执行门 — 2026-10-14

状态：**BLOCKED / P0_NOT_ACCEPTED**。本文件只记录事实及开发边界，不是授权票据，也不启动流水线。

## 1. 真实 Codex 调用检查

工作目录：`/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent`。
在 Mac mini 上从项目目录直接运行 `codex exec --ignore-user-config --ephemeral --sandbox read-only --skip-git-repo-check`，使用明确的 `$game_site_orchestrator` 指令与 Hood Warfare 2 / Steam App 5155360，只允许只读入口预览，不允许创建草稿或 worker。
实际 Codex 子进程退出码：**1**，stderr 报告 `You've hit your usage limit`，提示可于 **8:27 PM** 再试。证据：`../runs/TEST-p0-continuation-20261014/natural-retry.stderr` 和 `natural-retry.stdout`。
当前会话无法确认额度何时真正恢复；不可将返回提示等同已经恢复。不同于先前受限子进程的 `Operation not permitted`，此次已启动 Codex，但模型未完成调用，没有预检输出。

## 2. 本地回归

重新运行 `node --test tests/entry-handoff.test.mjs tests/entry-v1.test.mjs`：**23 PASS / 0 FAIL / 0 SKIP**，退出码 0。证据：`../runs/TEST-p0-continuation-20261014/p0-current-focused.stdout`。
现有本地交接能力限于 `entry-handoff-preview`、`entry-handoff-validate`；一致性检测不是执行授权。当前未新增签发或消费执行票据的功能。

## 3. 可信执行交接的必要条件

在已有交接设计基础上，下一阶段需要：可信人类批准通道与可验证身份（不能由任务输入自称已批准）、绑定 run ID/revision/源草稿及文件 SHA256/8 Skills 锁摘要/目标工作区/副作用与允许的阶段的单次票据；失效、过期、篡改和重放均拒绝；独占分配新执行 run，不得复用草稿目录；在可信边界验证票据后才调用唯一现有 Pipeline；恢复行为仍受批准的范围限制。原始 CLI `run/retry` 的独立权限通路仍需一并封闭或实现明确可审计的授权入口，才可称全局门禁成功。
实现之前不得将 `approvedToRun: true`、预览一致、会话中的笼统“批准”或本地测试 fixture 视为可执行票据。生产发布/域名/DNS/GitHub/GSC/GA4/广告分别审批。

## 4. 判定

P0 既定完成门尚缺：真实 Codex 自然语言预检→保存→跨调用恢复验收，以及可验证、不可绕过的人工执行票据和正式 Pipeline 交接。**不能宣布 P0 完成**。
没有启动真实七阶段、部署、修改原始 Skills 或游戏站。本轮未使用其他账户/模型绕过 Codex 额度限制。
