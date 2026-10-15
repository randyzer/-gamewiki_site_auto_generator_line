# P0 Codex 自然语言入口再次验收（2026-10-14）

状态：**READONLY_PREVIEW_PASS / NATURAL_CREATE_BLOCKED / P0_NOT_ACCEPTED**。

## 成功部分

在 agent 项目根目录使用本机 Codex CLI 0.153.0，显式 `$game_site_orchestrator` 运行 Hood Warfare 2（Steam App 5155360）的只读入口预检。CLI exit 0；实际调用 `entry-preview`，结果 `READY_FOR_APPROVAL`，8 项 Skill 本地版本检查全部 OK，分阶段素材清单完整展示。记录：`../runs/TEST-p0-codex-unblocked-20261014/preview.stdout` 与 `preview.stderr`。没有创建草稿、启动 worker 或修改游戏站。

## 未通过部分

紧接着使用新的 Codex 调用请求只保存 `TEST-p0-codex-20261014` 草稿（预检、创建、状态读取，严禁 worker），CLI exit 1，错误 `exceeded retry limit, last status: 429 Too Many Requests`。同时存在旧外部 MCP `invalid_token` 警告，不足以单独证明本次失败根因。记录：`../runs/TEST-p0-codex-unblocked-20261014/create.stderr` 与 `create.stdout`。经检查，预定草稿文件和 Pipeline manifest 均不存在。

## 结论及下一关

额度解除后，**真实自然语言只读预检已验证通过**；但跨调用创建与恢复未成功，不能把 P0 标为全部通过。下一次在 Codex 429 限制解除后，继续 TEST 草稿保存、状态读取及跨调用恢复。可信人工审批票据、原子运行目录绑定、不可绕过的正式执行门仍待独立实施及测试。不得通过现有 `run/retry` 绕过审批或启动真实 worker。生产发布始终需要单独授权。
