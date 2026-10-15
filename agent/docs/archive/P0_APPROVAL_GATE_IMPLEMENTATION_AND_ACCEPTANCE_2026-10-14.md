# P0 可信执行审批门：本轮开发与验收

日期：2026-10-14
结论：**SAFE_DEFAULT_GATE_IMPLEMENTED_AND_TESTED / PRODUCTION_BRIDGE_NOT_ACCEPTED / P0_NOT_COMPLETE**

## 目录

唯一工作目录：`/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent`。
本轮改动均在 agent 内，原始 codex-skills、现有游戏站及生产环境未被执行或修改。

## 真实 Codex 入口状态

1. Hood Warfare 2 显式 `$game_site_orchestrator` 只读 entry-preview 已在本机真实调用成功；返回 READY_FOR_APPROVAL，8 Skill 版本全部 OK，阶段素材清单已展示。证据：`../runs/TEST-p0-codex-unblocked-20261014/preview.stdout`。
2. 随后的自然语言 TEST 草稿保存请求因 Codex 429 Too Many Requests 失败，退出码 1；本机核查 `runs/TEST-p0-codex-20261014/ENTRY_INTAKE_V1.json` 与该 run 的 manifest 均不存在。证据：`../runs/TEST-p0-codex-unblocked-20261014/create.stderr`。因此**跨调用自然语言保存和恢复未通过**。

## 本轮实现及验证

- `src/orchestrator.mjs`：默认不安装可信审批消费者时，拒绝正式执行，包括旧的 `run/retry` 路径；任务 JSON 自填 approved 不会获准。
- `src/entry-approval.mjs`：实验性可信宿主 API：重新校验只读交接快照，限制输入映射和副作用范围，请宿主原子消费单次票据并返回可验证回执；宿主返回后再校验草稿/Skill/inventory/材料是否变化；失败不可恢复已消费的票据。
- `src/cli.mjs`：现有 run/retry 不提供用户自签审批参数；无可信宿主时 fail closed。
- `tests/entry-approval.test.mjs` 与相关隔离测试：覆盖旧入口绕过、用户自称批准、失败票据、过期、重放、材料变更、Skill 漂移、目标目录污染及宿主注入。
- 部分既有测试注入了专属临时 fixture 宿主，不是生产发行票据功能。

## 测试事实

本机执行：`node --test tests/*.test.mjs`。
结果：**313 PASS / 0 FAIL / 0 SKIP，退出码 0**。
日志：`../runs/TEST-p0-codex-unblocked-20261014/approval-full-regression.log`。
此命令不包含 `feishu-ai-employee/tests/`，故不是全部外部集成通过证明。
另有本次 Codex 开发过程的模拟门禁专项回归 107/107，来源为本机 Codex 执行输出；完整源码、正式日志以上述本地回归为准。

## 不可虚报的剩余门禁

1. **实际人类身份/授权的可信票据 issuer 尚未接入。** 注入的模拟消费函数不能证明外部真实人类批准。
2. **原子持久化的消费回执、执行 run 目录占用、审计落盘及崩溃后恢复约束** 尚未完成真实宿主级验收。源码默认拒绝执行，而非已成功签发并执行。
3. **入口草稿 → 人工签发票据 → 唯一 Pipeline 首阶段** 尚无不触发外部副作用的宿主集成闭环；本轮没有真实 worker。
4. **真实 Codex 自然语言跨调用保存/恢复** 仍因第二次 429 受阻。
5. 飞书服务、浏览器、七阶段全量业务与任何生产 push / 部署 / DNS / GSC / GA4 / 广告均未被本轮验证或授权。

**P0 判定：NOT ACCEPTED。** 不允许依据本报告把项目状态改为完成。需要可信授权宿主实现并完成安全集成验收，且真实 Codex 草稿保存/恢复成功后，才可以评估 P0 正式验收。
