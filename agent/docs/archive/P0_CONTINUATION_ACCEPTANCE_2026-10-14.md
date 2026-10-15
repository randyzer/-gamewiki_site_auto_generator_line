# P0 续作验收 — 2026-10-14

结论：**PARTIAL_ACCEPTANCE**。安全交接预览与一致性校验通过本地测试；真实 Codex 自然语言预检、保存/恢复 **BLOCKED**；正式审批执行桥接 **DEFERRED**。不等于真实建站或整个 P0 通过。

## 范围与证据

工作范围仅本 agent；未修改飞书适配器、原始 Skills、真实网站或 inventory。未启动真实 worker、浏览器、部署或生产操作。测试使用独立 `TEST-handoff-<UUID>` 草稿并清理；持久证据仅在 [TEST 证据目录](../../runs/TEST-p0-continuation-20261014)。目录不是 Git 仓库，未宣称完成 Git diff 审计。

## 真实自然语言入口（优先尝试）

本机 `codex --version`：0.153.0。已实际执行：

```sh
codex exec --ignore-user-config --ephemeral --sandbox workspace-write --skip-git-repo-check --json -
```

输入为 [natural-create.prompt.txt](../../runs/TEST-p0-continuation-20261014/natural-create.prompt.txt)，明确显式 `$game_site_orchestrator`、Hood Warfare 2 / Steam 5155360、独立 `TEST-p0-natural-20261014`、只允许 entry-preview/create/status，不允许 worker。设置 120 秒超时，实际立即 **exit 1**。

[stderr](../../runs/TEST-p0-continuation-20261014/natural-create.stderr)：`failed to initialize in-process app-server client: Operation not permitted (os error 1)`；另有无法创建 PATH aliases 的权限警告。JSONL 为空。故障发生在本进程 app-server 初始化阶段，未进入模型、Skill 或 CLI 入口调用；没有证据证明账号未登录，也未验证网络与账号凭据。未降级、未提权、未换 provider；已请求用户协助在允许启动该服务的本机会话执行测试或修复工具链。

| 项目 | 结果 | 证据/限制 |
|---|---|---|
| 真实显式 Skill 自然语言预检 | BLOCKED | app-server 初始化失败，不能借用历史成功记录 |
| 自然语言保存 TEST 草稿 | BLOCKED | 本次未创建 TEST-p0-natural-20261014 |
| 新调用恢复、修订同一草稿 | BLOCKED | 前置保存未成功，未尝试第二次 Codex 调用 |
| CLI 草稿保存/状态/修订、8 Skill 本地核验 | PASS（自动测试） | 原入口 15 项通过；不能替代上述自然语言证据 |
| 交接预览和快照校验 | PASS（自动测试） | 新增 8 项；只读、不授权 |
| 正式可信审批票据与启动桥接 | DEFERRED | 没有新增 promote 命令，没有执行 Pipeline |

## 实现与安全边界

- `entry-handoff-preview REQUEST.json|-`：请求严格为 `runId/expectedRevision/executionRunId`，重新检查草稿、当前必需材料和 Skill 锁。快照包含输入、草稿原始字节/输入/材料/inventory 摘要、8 Skill 版本、revision、固定新 workspace 和拟执行阶段；展示后续缺项、潜在副作用与独立生产审批要求。
- `entry-handoff-validate SNAPSHOT.json|-`：输入预览输出的 `snapshot` 字段，重新计算并完整比较。通过仅为 `CONSISTENT_NOT_AUTHORIZED`，始终 `approvedToRun=false`。自填批准、同 revision 篡改、旧 revision、材料变更、伪造锁摘要/版本或作用范围均拒绝。
- 预览拒绝同一个草稿/执行 run ID、非法路径、已占用或链接的执行目录，以及缺当前输入或含 Pipeline manifest 的草稿。不创建 execution run、workspace、manifest 或审批票据。
- 现有唯一 `createOrchestrator` 在 Pipeline 前显式拒绝入口草稿目录和直接提交的草稿/预览封装；测试使用假执行器，断言调用次数为零。修复前空草稿目录虽已因独占 mkdir 返回 EEXIST，但缺少明确入口拒绝边界；本轮没有将其夸大为已发生 worker 执行漏洞。
- 普通 inputs 的旧 run/retry 权限模型保持原样；本改动不是全局可信授权系统。快照不具有签名或授权真实性；预览后的并发变更仍需在未来正式执行边界原子占用、重验和可信人工票据处理。批准者/批准时间尚未进入可执行票据。

## 确切测试结果

所有命令从 agent 根目录执行，stdout/stderr 保存于上述 TEST 目录。

| 命令 | exit | 结果/证据 |
|---|---:|---|
| `node --test tests/entry-handoff.test.mjs`（实现前） | 1 | 0 PASS / 6 FAIL，预期缺少命令和显式编排器拒绝；`handoff-red.stdout` |
| `node --test tests/entry-handoff.test.mjs tests/entry-v1.test.mjs`（最终） | 0 | **23 PASS / 0 FAIL / 0 SKIP**；`focused.stdout`，stderr 空 |
| `node --test` 加全部 `tests/*.test.mjs`，排除下列两份飞书测试（最终） | 0 | **277 PASS / 0 FAIL / 0 SKIP**；`regression.stdout`，stderr 空 |
| `node --check src/entry-v1.mjs` | 0 | `syntax.results.json` |
| `node --check src/cli.mjs` | 0 | 同上 |
| `node --check src/orchestrator.mjs` | 0 | 同上 |
| `node --check tests/entry-handoff.test.mjs` | 0 | 同上 |

回归的完整、实际展开 argv 和退出码保存在 [regression.result.json](../../runs/TEST-p0-continuation-20261014/regression.result.json)。排除 `tests/feishu.test.mjs`、`tests/feishu-existing-project.test.mjs`，也没有运行 `feishu-ai-employee/tests/`；不是全部集成验收。首次交接 6 项版本的受限回归为 275 PASS；补充两项后重新运行，最终上述 277 为准。首次专项 21 PASS，最终 23 为准。红灯与最终绿灯日志均保留。

新增 8 项分别覆盖：只读且不授权；revision/材料变更；批准/范围/路径/锁摘要伪造；非法/复用/占用/链接目录；缺材料/Pipeline 污染；草稿目录启动拒绝；同 revision 篡改/Skill 版本伪造；新 ID 下提交草稿封装拒绝。

## 文件变更

1. `src/entry-v1.mjs`：只读快照、重新校验，复用现有草稿与 Skill 检查。
2. `src/cli.mjs`：两个入口命令、usage 和错误中的 `approvedToRun=false`。
3. `src/orchestrator.mjs`：入口草稿目录/封装拒绝，不增加编排器。
4. `tests/entry-handoff.test.mjs`：8 项隔离测试。
5. `README.md`：新接口、历史验证与本轮阻断区分。
6. `docs/P0_UNIFIED_ENTRY_HANDOFF_DESIGN_2026-10-14.md`：区分已实现只读检查与未实现执行授权。
7. `docs/MAINTENANCE_FIXES_2026-10-14.md`：修正移动后 `runs/...` 为 `../runs/...`，修正本报告自链接。
8. `docs/README.md`：新增续作验收索引。
9. 本报告。

`.agents/` 与 `.codex/` 当前只读，未修改；自定义 agent 配置的规范路径本来已是 `docs/AGENT_TASK_CARD_AND_WORKFLOW_SPEC_V0.1.md`。真实测试提示也明确提供此路径。根 README 与 docs Markdown 链接检查结果见 `docs-links.result.json`；最终修改文件摘要见 `changed-files.sha256.json`。

## 待完成

修复本进程 Codex app-server 初始化权限后，再执行真实自然语言预检、保存和跨调用恢复；不能用本地测试替代。独立原生 agent_type 委派、可信执行票据、执行恢复边界、真实七阶段和生产发布均未在本轮验证。
