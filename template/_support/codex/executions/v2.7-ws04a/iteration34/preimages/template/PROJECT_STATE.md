# Game Site System V2.7 — 当前项目状态

更新：2026-10-07（Asia/Taipei）。最新用户要求优先于历史计划。当前总览见 [统一任务台账](roadmap/V2.7_TASK_LEDGER.md)；本页保留工程与证据上下文，原始审查记录不改写。

## 项目目标

以 V2.6.5 的 SOP、Master Prompt、Starter 三件套为基础，通过 Bomb Farm、War of Genesis 等真实项目验证发现缺口，结合五个参考游戏站案例提炼优秀能力，迭代 V2.7 商业游戏站生产体系。

V2.6.5 三件套 → 真实项目验证 → 能力缺口 → 五案例提炼 → 三件套升级 → V2.7 三件套。

用户于 2026-10-01 确定下一代目标版本为 **V2.7**，统一覆盖 SOP、Starter、Master Prompt；见 [版本决定](governance/V2.7_VERSION_DECISION.md)。本次命名不构成产品验收、发布或恢复开发授权。

关系与同步原则见 [关系核对](architecture/GAME_SITE_SYSTEM_EVOLUTION_MODEL.md)。交付位置见 [DELIVERY_LAYOUT.md](DELIVERY_LAYOUT.md)。

## 当前阶段

2026-10-07最新：第19轮替代方案[设计独立接受](codex/executions/v2.7-ws06a/iteration19/result.md)；第20轮五文件治理修订已获[实际独立ACCEPT — GOVERNANCE AMENDMENT ONLY](codex/executions/v2.7-ws06a/iteration20/chatgpt-independent-review.md)，有限开发流程已生效，见[本轮结果](codex/executions/v2.7-ws06a/iteration20/result.md)与[现行路线§3.1](roadmap/GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md)。当前源码准入NOT_EVALUATED，完整WS06A BLOCKED、Safari proof0、WS03未开始、能力状态未提升，主任务仍2/8关闭。本轮产品增量0，产品tests/build/浏览器矩阵NOT_RUN。下一有限步骤为当前源码Development Readiness审计/独立裁定；尚未开始该审计或WS03A代码。

**正式路线共8个主任务：2个关闭，1个部分实施且受阻，5个尚未开始产品实施。** WS-01、WS-02 已独立 ACCEPT；WS-06A新源资格37 PASS / 10 FAIL，历史36/11保留，WS-06B 未开始。第13轮诊断、第14轮WebKit策略提案、第15轮焦点修复计划均已独立接受，但不构成WS-06A通过。第16轮两文件修复已完成本地RED/GREEN、专项15病例和root/adopted711测试，已获原ChatGPT独立ACCEPT并关闭有限修复；整体06A仍BLOCKED。第17轮策略实现已完成87/757测试及新37/10矩阵，已获原ChatGPT实际独立ACCEPT，仅接受实现机制；真实Safari补证待取得。WS-04A第18轮方法设计已独立ACCEPT，适配接口实施未开始、契约Gate仍OPEN，等待WS03实际接受后的绑定核实。其余主任务未实施，最终交付未创建，A4不恢复。

三件套关系、目录盘点与有限清理已获独立 ACCEPT。[V2.7 蓝图](architecture/GAME_SITE_SYSTEM_V2.7_ARCHITECTURE_BLUEPRINT_V1.md)通过12项设计标准；[路线](roadmap/GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md)通过15项设计标准。2/8只表示主任务关闭数，不表示产品工作量完成25%。协作轮次、41项能力、47项浏览器病例、主任务分别计数。

用户授权“按计划推进”并在工具恢复后要求继续。[本地草案](roadmap/WS01_V2.7_NORMATIVE_FOUNDATION_IMPLEMENTATION_PLAN_V1.md) 保留为历史待审材料；[ChatGPT 实际 PLAN](codex/prompts/v2.7-ws01/prompt.md) 取代草案作为 WS-01 执行边界。REF-A/B/C 确定性 fixture 与 PROJECT-* 真实采用分开且最终均须验收；evidenceStatus 与 §W outcome 分开；H 表保留原 41 行/16 列，不新增 changeType。蓝图/路线有限文字澄清随本阶段独立复验，不改 workstream 数量或 DAG。

2026-10-06：官方Browser26.930.51102曾缺少必需SKILL.md，已用官方本地bundled marketplace恢复，协作连接与原ChatGPT页签正常；实际workspace恢复确认保存。未切换外部浏览器或替代访问通道。用户授权第16轮并全权授权自主推进，常规有限工作无需重复授权。

WS-01 本地执行与检查已完成，iteration 8 独立审查给出有限 [REVISE](codex/executions/v2.7-ws01/review-iteration-8.md)：仅需拆开 Registry 适用性分类与项目/构建实际适用性决定，其余审查项通过。iteration 9 已完成该修正，89 个负例、15 个内存合法组合及原有来源保护检查通过，并收到真实独立 [ACCEPT](codex/executions/v2.7-ws01/verification.md)，见 [result.md](codex/executions/v2.7-ws01/result.md)。两个 SOP/Prompt V2.7 候选从准确本地来源创建，分支 v2.7/normative-foundation；WS-01 关闭时尚未提交、审查后产品字节未变；后续 WS-02 方法增量独立记录，原验收快照保留。SOP 包内唯一规范迁入、Prompt 精确引用、41 项证据索引完成；实际适用性决定全部未评估，当前 outcome 全为 null，不构成全能力或 release PASS。30 文件 SOP 清单及规范原哈希保持一致。WS-01 关闭时四个来源及 743 个受保护源码/资产文件保持不变，Starter 未修改。本有限 PLAN 已关闭；后续 WS-02 状态见下。A4、真实采用和最终交付仍未实施。

WS-02：用户明确授权“先制定有限实施计划，再执行和独立审查”。[实际 PLAN](codex/prompts/v2.7-ws02/prompt.md)及两项实际澄清限定范围：保留 Vitest 原有可选 peer 元数据；仅新增一个当前站点 legacy identity 测试输入修订。Starter 同仓库已从 accepted A3 创建 v2.7/evolution，HEAD/旧 phase-a 分支引用不变，未提交。12 个 Starter 工具/CI/测试/文档文件、3 个 SOP 方法文件、1 个 Prompt 文件完成；生产 src/**、默认配置/Inventory、规范/41 Registry、锁文件和依赖不变。SOP/Prompt 原 WS-01 字节备份可按哈希安全回退。

WS-02 本地证据： fresh A3 44 文件/653 tests；最终 root 与 neutral adopted 全量 check 均 44 文件/656 tests、无 skip、Astro 0 errors/warnings/hints。默认 validate/build 预期 PP-02 拒绝，采用 fixture validate/check/build 全部 exit 0、final marker/未批准 legal routes 不输出，临时副本已清理。首次 adopted SEO fixture 失败保留且经实际窄 PLAN 修正后全量复测，不弱化生产安全。完整结果、范围/来源快照、WS02-only diffs、回退清单见 [result.md](codex/executions/v2.7-ws02/result.md)。已收到真实独立 [ACCEPT](codex/executions/v2.7-ws02/verification.md) 并关闭本有限 PLAN，验收后产品字节未变，仍未提交；只证明本阶段工程/方法，不提升 AX 浏览器、真实项目、REF suite 或 release PASS。WS-02 关闭时 WS-06A/03/A4 未开始；本轮 WS-06A 状态见下。

WS-06A：用户授权按计划推进下一步。[实际有限 PLAN](codex/prompts/v2.7-ws06a/prompt.md)及两项断言/CI 输入修订保存。15 产品文件范围审计通过，10个accepted preimages可按哈希回退；新增锁定dev-only playwright1.63.0，未改无关依赖和运行时代码。Root/adopted45文件696 tests通过；模式负例fail closed。首轮真实FILE_SHA256矩阵47项执行、47 FAIL，无skip；既有长表局部模式在mobile撑宽页面，另有runner定位、时序、键盘profile与生命周期缺陷待诊断。Astro自身自动daemonize导致预览遗留，已独立观察并关闭；错误cleanup原记录与纠正审计同时保留。完整失败及范围记录见 [result.md](codex/executions/v2.7-ws06a/result.md)。首轮失败保留。随后按[iteration12 窄修订](codex/prompts/v2.7-ws06a/iteration12-repair-plan.md)完成19文件范围、两处明确Core修复及runner校正；root/adopted45文件699 tests通过。完整复测47执行、36 PASS/11 FAIL：WebKit普通Tab/表格ArrowRight仍失败，Chromium动态缩放等待超时。预览自身PID正常关闭且独立确认消失，fixture删除，无信号降级。19文件/743保护文件/Contract审计通过。本轮依实际PLAN再次STOP，真实[独立审查](codex/executions/v2.7-ws06a/review-iteration-12.md)给出BLOCKED，确认范围/两处修复/清理，并保留三项未解blocker。协作已达12轮默认上限，等待用户决定是否继续第13轮有限诊断；尚无WS-06A ACCEPT、能力PASS或release，未恢复A4或开始WS03+。

上段WS-06A记录描述第11～12轮的历史停止点，其“等待第13轮”已由后续授权取代。当前增量为：

- 第13轮：[诊断独立ACCEPT](codex/executions/v2.7-ws06a/iteration13/result.md)。WebKit普通Tab归因当前engine/host输入profile；ArrowRight当时INCONCLUSIVE；Chromium正向/反向存在导航身份在MQL前丢失的时序风险。产品增量0，资格未重跑。
- 第14轮：[WebKit验证策略提案独立ACCEPT](codex/executions/v2.7-ws06a/iteration14/result.md)。10个独立纯原生控制进程均未滚动；提案未实施，不改现行FAIL或规范。产品增量0，资格未重跑。
- 第15轮：[两文件修复计划独立ACCEPT](codex/executions/v2.7-ws06a/iteration15/result.md)。[规格](codex/executions/v2.7-ws06a/iteration15/LIVE_RESIZE_CORE_REPAIR_SPEC_V1.md)仅有Markdown候选差分，尚未应用、编译或执行。产品增量0。
- 第16轮：[两文件本地实施结果](codex/executions/v2.7-ws06a/iteration16/result.md)已获[实际ChatGPT独立ACCEPT](codex/executions/v2.7-ws06a/iteration16/chatgpt-independent-review.md)，有限修复关闭。先仅改测试，旧控制器8 FAIL/21 PASS；应用控制器后29 PASS。Chromium R1–R10、Firefox R1–R3及双浏览器no-JS15/15 PASS；root/adopted45文件711 tests及采用/拒绝生产检查通过。新源未改动47矩阵37 PASS/10 WebKit FAIL，整体FAIL；仅Chromium live-resize由FAIL变PASS，非WebKit无回归、无新失败assertion。235候选仅2文件变化，743保护文件/冻结三件套/既有路线与证据/规范保持一致。专项初始观察器语法错误及正常清理记录保留；有效专项与矩阵预览均正常stop、PID消失、fixture删除、无信号降级。WebKit策略未实施，WS06A/AX/PA/REF/真实采用/release不提升。
- 第17轮：[实际有限PLAN](codex/prompts/v2.7-ws06a/iteration17-webkit-policy-implementation-plan.md)在既有用户全权授权下实施10文件，未改Core/原matrix/runner/CI/锁文件/规范/Registry。新增strict snapshot与独立closure verifier、负例及三件套方法同步；87定向/757全量tests通过，采用检查通过。旧source-binding缺口真实RED1后收紧，所有初期失败/前置矩阵保留。最终新源47执行37 PASS/10 WebKit FAIL，40失败断言；原ChatGPT[实际独立ACCEPT](codex/executions/v2.7-ws06a/iteration17/chatgpt-independent-review.md)接受机制实现及新增390px失败归为PRODUCT_EVIDENCE_UNRESOLVED，不再开诊断轮。实际closure绑定raw/native/expected/政策/当前同源样本，exit1且唯一缺失为真实Safari键盘证据。现有IAB无Safari通道；Safari原生GUI已明确授权但工具URL限制拒绝，Chrome有限补充检查已完成；并未取得Safari证据，固定manual preview60522/owned PID89278为取证特意保留，之后正常清理。真实Safari proof为0，完整06A仍BLOCKED；补证必须记录目标实际尺寸并再经独立closure审查，详见[本地结果](codex/executions/v2.7-ws06a/iteration17/result.md)。
- 本次进度纠偏：更新两个工作区入口，新增任务台账与[WS-04A设计输入](roadmap/WS04A_GAME_ADAPTATION_DESIGN_INPUTS_V1.md)。仅本地文档准备，尚无实际ChatGPT独立审查；不改变已接受路线、Gate或规范身份。

- 第18轮：[WS-04A方法设计](design/ws04a/GAME_ADAPTATION_METHOD_V1.md)五份文档与实际PLAN已获[原ChatGPT独立ACCEPT](codex/executions/v2.7-ws04a/iteration18/chatgpt-independent-review.md)，仅METHODS DESIGN；[实际结果](codex/executions/v2.7-ws04a/iteration18/result.md)。5,759保护文件/237候选文件一致，40引用有效，产品测试NOT_RUN。设计接受不冻结schema、不关闭04A、不提升能力；下一依赖仍为WS03接受→04A绑定核实，06A Safari阻塞保留。

协作工具更新因本地与上游历史分叉无法快进，经用户明确同意暂缓更新，沿用正常的原 ChatGPT 连接；未改用替代访问工具。

旧 V1 蓝图、路线图、Phase A 计划及历史 prompt 保留为历史输入，不再充当当前下一步执行授权。用户引用的“A1 CLOSED / A2 NOT STARTED”是较早快照，不能抹去随后已接受的工作。

## 已接受的工程资产

| 工作 | 提交 | 实际状态 |
| --- | --- | --- |
| S1 / TL-01 | `a691661b330896f81f28fcac855f0ef9cc1dfccb` | 保留已完成的安全修复 |
| A1 / TL-02 | `a3c1bd31d87321ae40c44933fad8f8649e7f017d` | CLOSED |
| A2 / PP-02 | `aad6464b6be1584297866518e2ac036fbd0bd1a4` | CLOSED，独立审查通过 |
| A3 / AX-01 | `b067e8d4050478072f25a1dc78a8526cdd128cfd` | 实现获独立接受；浏览器证据未完成，不能写 PROVEN |
| A4 | 无提交 | 未完成半成品保存到 `archive/paused-a4/2026-10-01/`，不计入有效候选 |

开发候选：`Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`，当前分支 `v2.7/evolution`，HEAD 保持 A3；旧 `phase-a/core-safety` ref 保留。候选工作树包含已 ACCEPT 的 WS-02 及执行中的 WS-06A 未提交增量；不是 CLEAN A3。WS-06A 原15文件阶段 Core src/** 与 A3 一致；iteration12明确授权后仅增加 .prose min-width:0 和 exact same-URL 默认刷新抑制，两处测试同步。历史文档迁移提案保存在 `cleanup/proposed-starter-docs-2026-10-01/`，尚未实施。

## 冻结比较基线

| 本地目录 | HEAD |
| --- | --- |
| `Repo_hotgameweb/GAME_SOP_V2.6.5` | `9a13b7314b9cb102b0c440d9677ab22400109e8f` |
| `Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.6.5` | `f655a0e08529060be8b716330ffcecf489a4484d` |
| `Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.6.5` | `29b25559cf2af859bca359c7f7fda686a4803c95` |

本地 HEAD 用于比较，不替代各仓库的 release tag / 发布证明。三处基线均不修改。

## 研究与证据边界

- 五个本地提炼源码目录保留；本地代码审计不证明原站商业成功。
- 2026-10-01 读取了 4 个原站各 3 个页面；Farever 为 ERR_CONNECTION_CLOSED，原站数据未取得。没有自行降级，不能写“五个原站已验证”。
- Bomb Farm V2 视觉/媒体/广告报告与 War of Genesis 上线前验收报告，是缺口核对与后续回归的明确输入；旧报告不是当前重新实测结果。
- 技术通过不能替代事实、媒体权利、玩家价值、游戏识别度、人工验收和商业验证。

## 当前记录

- 目录清单与清理结果：`inventory/WORKSPACE_INVENTORY_2026-10-01.md`。
- 清理前快照：`inventory/WORKSPACE_INVENTORY_BEFORE_2026-10-01.json`。
- C2C 任务 c2c_a765，复用既有 ChatGPT 会话和连接器；Codex 本地执行，ChatGPT 独立读取和审查。
- V2.7 设计：iterations 5–7；[蓝图独立 ACCEPT](codex/verifications/v2.7-design/blueprint-acceptance-and-roadmap-plan.md)、[路线独立 ACCEPT](codex/verifications/v2.7-design/roadmap-acceptance.md)，结果/关闭记录在 `codex/executions/v2.7-design/`。本轮文档检查通过，233 个参考/前代契约哈希未变；没有重跑产品测试，历史 653 PASS 保持原证据含义。
- 历史 execute_task / 11 tools 门槛已由用户明确调用的技能工作流取代。
- 本轮不 push、tag、merge 或 release。

## 本轮审计关闭

独立审查：ACCEPT，见 [verification.md](codex/verifications/goal-reset-2026-10-01/verification.md)。接受交付位置为最终 assembly/delivery root，不是第四个开发源码权威。18 份历史文档保留，不立即搬动；在最终交付整理时再决定保留、归档或被新文档替代。

机器清单为获审查的 336 template + 188 Candidate 文件快照；其后的审查/关闭记录与状态更新见 `codex/executions/goal-reset-2026-10-01/closure.json`，不静默改写已审查哈希。
