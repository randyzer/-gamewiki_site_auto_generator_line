# 游戏站总控可靠性修正方案与执行计划

> **For agentic workers:** 用户批准后，使用 `superpowers:executing-plans` 分任务实施。当前仅规划；不得把本文件或 ChatGPT 的计划回复视为修复、真实业务运行、生产发布的授权。

**Goal:** 优先让首个游戏站完成真实阶段 1–6 并生成可审阅的部署计划；先解除已确认的执行阻塞，自检完善与通用恢复能力随后处理。

**Architecture:** 保留现有七阶段、Skill 锁和部署计划批准流程。首批将固定 Git/PATH 修复、最低必要探测修正与有界真实 worker 验收合并为一个可审批工作包；通过后恢复既有 002。按实际职责划分宿主/worker 和 plan/execute，通用工具完善不作为首站推进的前置条件。

**Tech Stack:** Node.js ESM、Node test runner、现有 Codex CLI worker、Python Skill 校验器、宿主 Playwright。

**状态：V2 已获用户批准执行工作包 A；当前在 `codex/git-worker-path` 实施和验收。工作包 B 的真实重试仍需既有预览确认码。**

执行记录：用户暂停同目录 Claude 会话后开始修改；ChatGPT Iteration 4 指出 Git 预检不应提前中止阶段 5/6 的独立只读宿主检查，已在 Iteration 5 修正并补负向回归。最终代码、真实探测结论和限制以工作包 A 交付报告为准，下方旧 PR 索引及待办仅保留规划背景。

- 基线：`19a20ed1e10b7d456290c1bb8ade59ff8ee12071`，`feat/stage-env-selfcheck`。
- 协作任务：`c2c_b133`；ChatGPT 对话：<https://chatgpt.com/c/6acdf447-28b8-83ec-b7ac-539dfd1103eb>。
- 规划轮仅修改本计划文档；获准实施轮的源码和测试范围按下方工作包 A 执行，不修改锁定 Skill 或用户站点。
- 审批对象是修正方案及首批范围，不等于既有 run 确认码或生产部署 digest 批准。
- 协作记录：Iteration 0 独立规划；Iteration 1 文档审查要求区分代码/真实环境验收并明确 Git 未知状态规则；Iteration 2 重新读取修正部分，裁决 `DONE / PLAN_APPROVED_FOR_USER_REVIEW`。该裁决仅表示文档可提交用户审阅，不授权执行。
- V2 调整：用户转来 Claude 的优先级意见后，将原 PR3 的业务阻塞修复前移；Iteration 0–2 对旧顺序的审查不视为对 V2 的审查或批准。旧 PR 编号仅保留为下方工作项索引，不代表实施顺序。
- Iteration 3：ChatGPT 重新读取 002 状态与执行器后建议“Git/PATH 与最低必要探测修正 + 一次真实证明 → 恢复原 002”；预算建议为 A 最多 1 次环境 worker、B 首轮最多 6 次业务 worker。以下 V2 采用该顺序，保留原确认码和部署计划批准条件。

## 1. 证据与结论边界

| 观察 | 可支持的结论 | 不可支持的结论 |
| --- | --- | --- |
| 七阶段 `/usr/bin/git` 调用出现 xcode-select 错误 | 本轮 worker 的 Git 调用不可用；多个 FAIL 共享此原因 | 用户机器没有 Git；必须安装 Xcode；有七个独立故障 |
| 执行器把 `/usr/bin` 放在 `tools.paths` 前面 | execute 阶段即使发现其他 Git，裸 `git` 仍存在优先命中系统入口的风险 | 本轮已验证 execute 失败 |
| 七阶段 `HOME=present` | 与脚本预设的 HOME=missing 不同 | 凭据泄漏，或应该删除 HOME |
| 阶段 5 在临时 worker cwd 无法解析 Playwright | 该解析路径不可用 | 正式宿主审计无法使用 Playwright |
| 8 条预期拒写命令没有完成事件，影响 5 个格子 | 权限证据未取得，应阻断对应准入 | 已证明允许写入；已证明正确拒绝 |
| 阶段 7 plan 找不到 gh/vercel，python3 启动失败 | 当前 plan 路径中这些调用不可用 | execute 没有工具；部署 Skill 必须使用 Python |
| 阶段 6 audit-only 在 Git 未知时 ready=true | 输入预检允许此模式继续独立检查 | 最终上线验收已错误通过 |
| 阶段 2 HTTPS 请求与 yt-dlp --version 通过 | 对应解释器、TLS 和版本调用成功 | Serper 查询、YouTube 搜索、详情和字幕已通过 |
| PARTIAL 的原生文件未被提升；发布更新和模板重试可发生冲突 | 存在可恢复性缺口 | 应允许任意覆盖，或未确认材料可发布 |

原始资料：

- `agent/runs/ENV_SELFCHECK_2026-10-16T11-18-35-427Z.json`
- `agent/runs/ENV_SELFCHECK_REVIEW_2026-10-16T11-18-35-427Z.md`
- `agent/runs/wallpaper-engine-001/manifest.json`
- `agent/runs/wallpaper-engine-002/manifest.json`
- `agent/runs/wallpaper-engine-002/artifacts/1/3/native/BLOCKED_REPORT.md`

历史数据保持原样。新报告注明源码身份、工具身份、权限配置身份、模式、命令结果、证据不足项；不把单元测试数量作为真实可用性证明。

## 2. 方案比较与推荐

| 方案 | 主要收益 | 成本与限制 | 决定 |
| --- | --- | --- | --- |
| A. 修已确认的工具调用，同时做最小探测修正与真实验证，然后恢复 002 | 直接解除业务阻塞，避免自检完善占用关键路径 | 必须如实保留未验证项，不能只报单测全绿 | 推荐首批实施 |
| B. 将阶段 2 检索放到宿主，通过有界请求/响应与 worker 交接 | 减少沙箱内 Python、TLS、yt-dlp 适配 | 需要新协议、来源/请求约束、次数与恢复机制 | 若 A 后仍有可复现的边界故障，再单独设计和审批 |
| C. 建设独立、固定版本的工具运行时 | 减少对当前 Homebrew 布局的依赖 | 普通 venv 不等于独立运行时；需处理解释器、动态库、证书、更新和分发 | 暂不实施，避免同时投入 B、C |

本轮不扩大 worker 联网或生产权限，不用新的工具替代失败的首选工具，不改 `codex-skills/`。工具失败先报告具体调用环节；需要登录、验证码或账号授权时由用户处理。

## 3. 推荐执行顺序

`工作包 A：Git/PATH 修复 + 最小探测修正 + 真实验收 → 工作包 B：恢复 002 阶段 2 → 阶段 3–6 → 部署计划等待批准`

自检迁移、完整拒绝事件采集、通用恢复和自动修复后置。若恢复、权限或部署计划事实缺口实际阻断本次运行，仅处理该最小复现，不预先实施整套 PR4/PR5 或宿主新架构。

### 工作包 A：推荐下一次审批范围

- 源码范围以第 6 节原 PR3 为主：`agent/src/skill-executor.mjs`、`agent/src/worker-permissions.mjs`、`agent/src/deployment-tools.mjs`，及其现有测试。阶段 6 若需宿主观测 Git 状态，再限定修改 `agent/src/prelaunch-host.mjs` 和对应测试；不修改锁定 Skill。
- 自检只允许修改 `scripts/preflight-all-stages.mjs` 与 `agent/tests/preflight-all-stages.test.mjs` 中支撑此次验收的部分：阶段/探测项选择、所需能力适用性、Git 判据和缺证表达。不搬脚本、不增加通用事件框架、不要求整个表全绿。
- 固定 Git 目录应优先于 `/usr/bin`，实际二进制和 helper 必须可读可执行；宿主可调用不能代替真实 worker 验收。Python 保留已需它的阶段的固定路径，不因 P1 探测而强行增加阶段 7 的依赖。
- gh/vercel 按实际 plan/execute 调用核验：已有 execute 工具定位逻辑应检查路径优先级和依赖读取，但不因为 plan 未找到这些工具就给 plan 增加 execute 权限。生产发布不在本工作包内。
- 同一次批准可覆盖代码修改、本地回归和最多 1 次真实 worker 环境探测：使用阶段 4 的正式权限、临时仓库，在同一 worker 中检查固定 Git 入口、`--version`、`rev-parse --show-toplevel`、`status --porcelain`。只执行固定命令，不调研、不修改用户站点、不联网到生产、不 push 或部署。其他阶段共享配置由回归检查，运行能力由其真实业务阶段继续验证；一次成功不能宣称全部阶段环境通过。
- 验收以这些实际业务能力为准：固定入口可用、仓库识别和状态读取正确、plan/execute 权限不混用。宿主/代码测试与真实 worker 结果分别报告。无真实证明不得宣布工具环境恢复。
- 未相关的历史拒写缺证保持 INCONCLUSIVE，不冒充通过，也不成为全部业务运行的统一前置门。若发现实际越权、原件变化或当前运行必需边界无法安全确认，立即停止。
- 在开始修改前确认单一写入者，使用 `codex/` 分支；不直接修改 main，不自动合并。审批这份方案不等于自动批准所有后续工作包。

### 工作包 B：工作包 A 验收后恢复 002

- 当前只读核验：002 首页 PASSED，关键词阶段 BLOCKED（attempt 3），阶段 3–7 NOT_STARTED。不能把环境探测通过当成关键词业务通过，更不能直接跳到阶段 3。
- 保留原 run、已通过首页、原始 100 行关键词和路径；不另建 run、不擅自缩减为 2–3 个词。先核验源码/Skill 锁、模板快照和上游证据，确定恢复不会损坏已有文件。
- 按既有 `retry --preview` 机制展示完整摘要并取得用户本轮确认码，再执行真实业务恢复。此确认码门和部署 digest 门保持原样，不再新增一套审批协议。
- 阶段 2 必须取得真实 Serper/页面正文和 YouTube 证据或明确的失败记录，通过原生与总控校验后，才推进模板、内容、生产构建、宿主 UI/全站验收。
- 初次业务恢复只启动一次 retry，阶段 2–7 最多各一次，共最多 6 次业务 worker 调用，不自动连续重试。若阶段内部需要追加模型调用，先暂停并报告新增预算；出现新的 BLOCKED/FAILED/PARTIAL/WAITING_FOR_USER 后保留现场，诊断具体边界再提出最小修改。不能把这种诊断当作随意扩大首批修复的授权。
- 第一里程碑为阶段 1–6 PASSED，阶段 7 已生成真实部署计划并 WAITING_FOR_USER，未进入 execute。生产发布是另一个里程碑，需审核准确计划和 digest；不把停在计划当作生产站已上线。

### 后置工作索引

下方第 4/5 节原 PR1/PR2、第 9/10 节原 PR4/PR5 是备选细项。工作包 A 只抽取其中明确列出的最小探测修正；脚本移动、完整事件解析、通用恢复和自动修站不要求预先完成。

所有修复在 `codex/` 分支进行。同一工作目录只有一个写入者；开始前确认没有其他 worker 或 chat 正在写入该目录。每个 PR 独立验证，不在 main 直接修改，不自动合并或发布。

## 4. PR1：校准自检语义并统一脚本位置

**拟涉及文件：**

- 移动：`scripts/preflight-all-stages.mjs` → `agent/scripts/preflight-all-stages.mjs`。
- 修改：`agent/tests/preflight-all-stages.test.mjs`。
- 修改：`agent/package.json`、`agent/README.md`、`agent/docs/SEVEN_STAGE_GATE_AND_EVIDENCE_MATRIX_V1.md`。
- 核对但不修改：`agent/src/skill-executor.mjs`、`agent/src/worker-permissions.mjs`、`agent/src/site-audit-host.mjs`、`agent/src/playwright-resolve.mjs`。

移动时同步相对导入、repository 推导、测试入口、文档命令；不只移动文件。新增 `selfcheck` npm 脚本仅调用新入口，不自动在所有测试或正式 run 中运行。

- [ ] 先补原始 JSON 离线回放与报告回归：误报从故障项移出，真实 Git 失败仍保留，缺事件不冒充权限通过。
- [ ] 定义 `PASS / FAIL / INCONCLUSIVE / N/A`。`FAIL` 表示取得证据且违反要求；`INCONCLUSIVE` 表示尚未完成证明。两者均阻断对应必需能力的准入。
- [ ] 把 HOME 从全阶段硬性 missing 判据移为信息项；TMPDIR 继续要求存在且可写。Serper 凭据仅阶段 2 必需；其他阶段不得意外继承。TLS 路径变量按本轮实际执行器配置检查，不把某种 Homebrew 适配细节变成通用契约。
- [ ] 按真实职责列出宿主/worker 和 plan/execute 的能力矩阵。阶段 7 不凭空要求 Python；只有实际已确认调用才设为必需项。
- [ ] 将 Playwright 能力检查放到宿主正式解析路径，使用本地夹具验证导入、浏览器启动和关闭。缺证据仍保留；不得因为删掉错误探测就声称宿主验证通过。
- [ ] 增加按阶段/探测项选择运行的参数及准确用法，降低重复真实调用成本；参数必须有测试，不通过解析后静默忽略。
- [ ] 只在必需能力上计算准入结果；不把重复格子计作独立根因。生成“故障、缺证、信息项”的分组摘要，并保留原命令证据。

**最快检查：**

```sh
node --test agent/tests/preflight-all-stages.test.mjs
git diff --check
```

**通过条件：** 误报消除有明确契约依据；八条拒写命令保持 INCONCLUSIVE，不能在本 PR 补造拒绝证据；脚本路径移动后可导入；没有生产源码、权限或 Skill 行为变更。未知状态不被改成 PASS。真实 worker 预算为 0。

## 5. PR2：补齐拒绝事件采集与权限证据

**拟涉及文件：** `agent/scripts/preflight-all-stages.mjs`、`agent/tests/preflight-all-stages.test.mjs`。前提是 PR1 已完成文件移动；不修改正式执行器、权限规则或 Skill。

- [ ] 先补回归：命令未启动、工具拒绝、进程拒写、普通非零、重复事件、丢失事件、超时和流重连分别保留原因。
- [ ] 依据当前 CLI 已观察到的事件格式，增加有界的开始、完成、工具失败及终止证据采集；保留必要调用标识，先脱敏再存储，不保存未经筛选的整段对话或凭据。
- [ ] 没有观察到的事件格式不凭空实现；本后置任务如需真实事件采样，先提出范围和预算。不得挪用工作包 A 的 Git 能力验证预算去开发通用采集器。
- [ ] 仅有明确且绑定该命令/路径的拒绝证据才能判预期拒写 PASS；非零退出、模型自行说“拒绝”、文件没变、流断开均不足以单独通过。
- [ ] 宿主为写权限测试核对哨兵和原件哈希，作为辅助证据；不使用另一个写文件工具绕过原命令拒绝路径。
- [ ] 对 8 条未取得证据的命令逐条给出结论；无法确认的保留 INCONCLUSIVE，并使对应必需能力的准入保持非零退出。

**检查：** `node --test agent/tests/preflight-all-stages.test.mjs`、`git diff --check`。

**通过条件：** 合成事件分类和脱敏测试通过；任何真实缺证项不会因解析器改动而变成虚假的 PASS。真实边界证明与采集器单测分开报告。

## 6. PR3：修复已确认的 Git 调用边界

**拟涉及文件：**

- 修改：`agent/src/skill-executor.mjs`、`agent/src/worker-permissions.mjs`、`agent/src/deployment-tools.mjs`。
- 测试：`agent/tests/skill-executor.test.mjs`、`agent/tests/worker-permissions.test.mjs`、`agent/tests/deployment-tools.test.mjs`。
- 文档：`agent/README.md`、`agent/docs/SEVEN_STAGE_GATE_AND_EVIDENCE_MATRIX_V1.md`。

- [ ] 先写失败回归：宿主存在可用 Git，但生成 PATH 优先命中不可用系统入口；确保固定工具目录优先于通用系统目录。
- [ ] 从明确配置/既有工具定位规则取得一个固定 Git 入口，记录原路径、realpath 和版本。该入口失败后停止，不扫描其他工具作为静默降级。
- [ ] 在需要 Git 的阶段授权该工具及必要 helper 的读取路径；不要扩大整个 Homebrew 或用户目录权限。系统 `/usr/bin/git` 若实际可用，不因路径本身一律判失败。
- [ ] 在工作包 A 的同一次明确批准和预算内完成真实环境验收：实际 worker 验证固定 Git 的 `--version`、临时仓库 `rev-parse` 与 `status`。不把代码提交和环境验收人为拆成多次审批；当前仍未取得任何执行批准。
- [ ] 分开记录“Git 不可执行”“目录不是仓库”“状态干净”“状态有修改”“状态未知”。新建站点尚无独立仓库时，不自动认定为工具故障，也不伪造干净工作树。
- [ ] 需要写站点或证明仓库同步的阶段，Git 状态未知不得被宣称为已确认安全/同步。只读 audit-only 可继续独立检查并记录限制；输入预检 ready=true 不直接等同最终上线验收通过。具体阻断条件写在宿主阶段契约中，不修改锁定 Skill 来统一强制中止所有审计。
- [ ] 明确测试两个模式：audit-only 在 Git 不可用时可以继续独立检查，但必须记录未知状态；audit-and-repair 在 git_clean=null 或状态获取失败时，必须在任何源码修改前阻断。最终上线报告不得把未知状态写成 verified clean。
- [ ] 保留现有部署批准条件；execute 的工具存在性和权限单元测试不升级为真实部署验收。plan 中无 gh/vercel 不再被称为 execute 失败。
- [ ] 仅当阶段 7 的实际必需动作证实依赖 Python，才独立增加对应固定解释器和读取权限；否则将此探测列为 N/A 并注明理由。

**最快检查：**

```sh
cd agent
node --test tests/skill-executor.test.mjs tests/worker-permissions.test.mjs tests/deployment-tools.test.mjs tests/deployment-execution.test.mjs
```

**代码验收条件：** 固定 Git 解析、PATH 优先级、权限生成、宿主临时仓库正反向检查及相关回归通过；其他路径的读写和网络边界保持原契约；配置错误给出具体诊断，未把账号授权与二进制执行问题混为一谈。

**真实环境验收条件：** 在获准的工作包 A 内完成实际 worker 的 Git 版本、仓库识别和状态读取。在此之前，报告只能写 `CODE_ACCEPTED / REAL_WORKER_UNVERIFIED`，不能宣称运行环境已恢复；首批交付目标包括真实验收，不以一个仅单测通过的草稿结束工作。这些标签只用于证据说明，不新增 Pipeline 状态。

## 7. 后续设计项：补齐部署计划所需的宿主事实

**拟涉及文件：**

- 新建提案：`agent/src/deployment-plan-host.mjs`、`agent/tests/deployment-plan-host.test.mjs`。
- 修改：`agent/src/skill-executor.mjs`、`agent/src/site-evidence.mjs`；必要时修改 `agent/src/site-preview-host.mjs` 以保留实际构建结果。
- 测试：`agent/tests/skill-executor.test.mjs`、`agent/tests/site-preview-host.test.mjs`、`agent/tests/deployment-execution.test.mjs`。
- 文档：`agent/docs/SEVEN_STAGE_GATE_AND_EVIDENCE_MATRIX_V1.md`、`agent/docs/MASTER_AGENT_EXECUTION_ROADMAP_V1.md`。

当前 plan worker 不开放命令网络，且不应承担生产外部修改。锁定部署 Skill 却要求核查仓库同步、构建和预览等事实，应由明确的宿主动作或可信上游证据满足。此节是架构提案，不包含在首批实施授权中；先核验缺口，再决定是否需要新模块。

- [ ] 逐项映射 Skill 计划要求：本地 Git、远端观察、构建结果、预览、域名事实；为每项明确来源和新鲜度，不把“已有报告”自动视为本轮验证。
- [ ] 先测试计划证据的身份、哈希、源码新鲜度和缺项。陈旧上游、仓库不匹配、远端不可达均不得被表述为同步已验证。
- [ ] 宿主只执行列明的检查；远端操作限定为获准目标仓库的读取。不创建仓库、不提交、不 push、不更改 DNS 或账号资源。读取远端失败时按首选工具失败规则停止，不替换访问路径。
- [ ] 不用 Git fetch 冒充完全不写本地状态的操作。若需要 fetch，必须在方案中单列本地引用变化；首版可以保留“远端历史不足”的明确缺项，不编造 ahead/behind。
- [ ] 使用原生校验规则交付真实 plan 产物；缺关键事实时 WAITING_FOR_USER/BLOCKED，部署批准仍绑定准确 digest。
- [ ] execute 工具的真实账号能力和生产动作继续留待具体部署计划批准；不构造假的生产批准来做预检。

**最快检查：**

```sh
cd agent
node --test tests/deployment-plan-host.test.mjs tests/skill-executor.test.mjs tests/site-preview-host.test.mjs tests/deployment-execution.test.mjs
```

**通过条件：** plan 的每项已验证事实可追溯到当前源码和实际检查，未验证项明确保留；worker 不因该设计获得生产或通用网络权限。此处测试命令仅在新模块实际获准实施后有效。

## 8. 真实验收与额度预算

本次仅调整文档，实际执行预算为 0。待用户批准工作包 A 后，代码修复与最多 1 次真实环境探测属于同一范围；不再要求在修完代码后重复申请已批准的探测。工作包 B 仍走既有输入预览和用户确认码。

1. 首批专项验证最多 1 次真实 worker，采用阶段 4 正式权限和临时仓库。只检查本次改变涉及的能力，不运行整个 91 格表、不为了数字好看重复测试。
2. 完整七阶段环境表保留为后续回归能力；只有存在明确跨阶段未决问题时才考虑运行。首站继续推进不等待脚本搬迁和全部历史缺证项补齐。
3. 工作包 B 恢复原 002，使用已有确认输入；不为方便验证擅自改变关键词规模或重建站点。首轮最多 6 次业务 worker 调用；按实际调用次数与耗时记账，不把一次业务 retry 等同一次模型调用。
4. 阶段 2 真实验证必须包括 Serper 查询、结果页面正文，以及 YouTube 搜索/详情/字幕尝试与实际状态。没有站内证据，不输出市场判断。
5. 连续执行到模板复制、内容、真实生产构建、宿主 UI/全站巡检，最终停在 stage 7 计划等待批准。首页可能有多轮宿主交接，业务 worker 次数必须按实际记录，不承诺每阶段只有一次。
6. 原 002 的一次明确 retry 为首轮业务恢复范围；所有停止状态和诊断保留。达到预算、工具失败或需要用户交互时停止，不偷偷改源、换工具、换模型或重建 run。
7. 不执行部署，不将环境通过或计划通过写为 PRODUCTION LIVE。

**验收记录必须区分：** 自动化回归、真实环境能力、真实阶段业务、整条流程、生产发布。每条结论标注对应证据范围。

## 9. PR4：产物恢复与部分完成策略（独立后续审批）

**拟涉及文件：** `agent/src/pipeline.mjs`、`agent/src/artifact-validator.mjs`、`agent/src/handoff.mjs`、`agent/src/template-merge.mjs`，以及 `agent/tests/pipeline.test.mjs`、`agent/tests/artifact-validator.test.mjs`、`agent/tests/direct-site.test.mjs`、`agent/tests/recovery.test.mjs`。

- [ ] 先固定三类失败回归：PARTIAL 文件缺正式检查点；本 run 已发布研究的受控更新冲突；模板复制中断后不能重入。覆盖中断位置与用户额外改动。
- [ ] 为部分结果保存独立的验证清单、身份、原生路径和哈希。阶段仍为 PARTIAL/BLOCKED，不能仅因为保留文件就自动继续下游。
- [ ] 复用已验证素材前检查输入、Skill、工具、源文件及证据新鲜度。关键词之间建立可恢复粒度，不把一处共享工具故障转换为所有词已研究。
- [ ] 对宿主创建的发布文件采用有归属和旧哈希的受控替换；仅当 run/路径身份与旧哈希一致才可更新。用户修改、异 run 文件和身份不明文件保持冲突，不能覆盖。
- [ ] 模板 receipt 允许识别已完成且哈希一致的复制项、继续未完成项。部分写入或不一致项明确报告，不自动删除用户文件。
- [ ] 部署 plan 再生成与其他报告发布采用版本归属，保留旧计划证据并撤销旧批准；不让修复后的 plan 永久撞上旧 site/docs 文件。
- [ ] “允许部分研究进入内容阶段”作为单独策略变更：需用户确认哪些结果可进入草稿/阻断页面，且未完成素材不能自动 PUBLISHED。现有一词一页和原始关键词处置血缘不能被绕过。

**检查：** `cd agent && node --test tests/pipeline.test.mjs tests/artifact-validator.test.mjs tests/direct-site.test.mjs tests/recovery.test.mjs tests/deployment-execution.test.mjs`。

**通过条件：** 同一状态重试可恢复；用户修改不丢失；旧批准不能用于新产物；部分成果保留但不冒充整阶段成功。

## 10. PR5：明确审计与修复的能力边界（独立后续审批）

**拟涉及文件：** `agent/src/pipeline.mjs`、`agent/src/skill-executor.mjs`、`agent/docs/SEVEN_STAGE_GATE_AND_EVIDENCE_MATRIX_V1.md`、`agent/docs/MASTER_AGENT_EXECUTION_ROADMAP_V1.md`，及对应现有测试。

- [ ] 测试审计完成、发现阻断问题、提出修复计划、未批准修复、修复能力未实现这五种情况的报告和正式状态映射。
- [ ] 使用报告字段表达能力和下一步，不为同一事情新增一套 Pipeline 状态词汇；audit-only 永远不修改网站源码。
- [ ] 当前 optimize 仍不可用时明确 BLOCKED，保留可审阅的发现和方案；不得仅因为已取得批准就假称有执行能力。
- [ ] 真正的受控源码修复与复测另行设计：授权绑定 run、siteRevision、scope、具体 files；同一问题最多两次尝试；修改后重建并重验受影响页面；路由/内容清单变化重验整合；撤销旧证据和部署批准。
- [ ] 后续真实修复方案仍须单独批准；PR5 不实施自动改站或恢复生产推进。

**检查：** `cd agent && node --test tests/pipeline.test.mjs tests/skill-executor.test.mjs tests/site-preview-host.test.mjs tests/site-audit-host.test.mjs tests/prelaunch-host.test.mjs tests/deployment-execution.test.mjs`。

## 11. 完成、回滚与文档同步

- 每个 PR 先跑最快相关检查，再跑必要的总控回归；通过后不因数量焦虑反复全量重测。
- 全量检查：`cd agent && node --test tests/*.test.mjs feishu-ai-employee/tests/*.test.mjs`；最后 `git diff --check`。清单使用只读核验，不通过重新生成清单掩盖漂移。
- 修复分支回滚针对自身代码提交；不回滚、清理或覆盖用户站点、研究原件、运行证据和账号状态。
- 源码变化后同步 README、阶段矩阵和当前路线图；旧报告不改写。明确仍未验证的功能与冻结模块。
- 最终交付列出实际文件、实际测试与退出码、真实运行身份、失败/未知项、审批边界；未调用的审查者不写成已审查。
- 首批批准建议：工作包 A（Git/PATH + 最小自检 + 最多 1 次真实探测），验收后准备工作包 B 的原 002 retry 预览。原 PR1/PR2 的完整完善、PR4/PR5 和方案 B/C 后置；实际遇到阻塞时只提出最小修复。
