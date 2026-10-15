# P0 总控 Agent 统一入口 V1 — 实施与验收任务卡

状态：APPROVED_FOR_SCOPED_IMPLEMENTATION（用户本轮明确要求完成计划后立即开发验证）。
工作目录：/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent

## 目标
以 Codex 显式 $game_site_orchestrator 为主入口、现有 CLI 为唯一调用底座。验证并补齐自然语言建站任务的安全入口，不建第二套编排器。以 Hood Warfare 2 / Steam App 5155360 为只读实测例子。

## 现有能力应复用
src/entry-v1.mjs 已有 entry-preview/create/status/update，Skill 本地 8 项版本哈希检查、材料清单、版本修订与暂停式草稿；src/cli.mjs、src/orchestrator.mjs、src/pipeline.mjs、.agents/skills/game_site_orchestrator/SKILL.md、.codex/agents/game_site_orchestrator.toml 均应保留。

## 本轮实施
1. 审查 P0 实施边界、代码和测试，修复确定的入口缺陷；对预检、草稿创建、状态读取、同 run 修订和错误输入实现稳定验收。
2. 使 Codex 显式 Skill 支持明确用户许可后完成 run 草稿创建及查询，绝不能凭 READY_FOR_APPROVAL 自动开启 worker。若 CLI 与自然语言适配有欠缺，修复相关文档/代码/测试。
3. 补齐一份受控的“入口草稿到正式 Pipeline”审批交接设计/程序路径（若能安全完成）：显式人工批准、run ID 与 revision 绑定、执行副作用说明、Skill lock 核对、禁止复用草稿目录导致污染；如无法在不破坏原有执行机制下完成，明确标注 DEFERRED，不要冒险开启真实 worker。
4. 以真实运行的只读 Hood Warfare 2 CLI 预检、无 worker 的临时入口草稿创建、status、update 测试进行验证；临时样例必须留在 agent/runs 内并清楚标识测试，不修改实际游戏站。
5. 输出 P0 验收报告：逐项 PASS/FAIL/BLOCKED、实际命令与退出码、变更清单、自动测试数量、实测证据和残留限制。

## 硬约束
所有写入仅限 agent/，排除 agent/feishu-ai-employee/；不可修改兄弟目录 codex-skills/、template/、gameweb/。不得重算 Skill inventory 覆盖锁版；不得运行真实七阶段 worker、BrowserSkill、外部账户、GitHub push、部署或生产操作。不得制造不存在的自动 10 分钟提醒；不能宣称原生 Codex 自定义子 Agent 委派已通过。不得改用户既有 Wallpaper Engine / Bodycam run。不可将测试通过等同真实站点端到端验收。

## 验收标准
P0: 自然语言入口指南清晰；8 Skill 清单及本地 hash 验证；全阶段输入清单；缺项 WAITING_FOR_USER；保存/恢复/修订；明确执行审批分离；安全拒绝非法路径/冲突；针对性测试与全量回归成功；实际 Codex 只读入口验证（能力可用才做）；验收报告包含未通过项。
