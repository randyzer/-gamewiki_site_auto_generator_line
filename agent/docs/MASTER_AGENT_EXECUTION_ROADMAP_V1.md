# 总控 Agent 总体开发路线图 V1

更新日期：2026-10-15（Asia/Taipei）  
当前结论：统一入口保存/恢复与离线可信交接已通过；G0 运行许可、可信输入变更与独立计划确认已实现并离线验证，真实 executor 已接入命名权限且合成 worker 文件探测通过，另有受限合成容器文件/子进程/回环/资源实测通过，但整体宿主/工具边界仍未完成，真实七阶段尚未贯通。  
文档性质：当前开发规划，不是运行、审批、发布或完成验收的证明。

**最新实际结果：** 第四次工具验收BLOCKED后，第九轮首条错误诊断修补经424项回归和独立复审ACCEPT_SCOPED。用户新批准一次诊断后实际执行仍BLOCKED：首条157字节UNKNOWN_NON_TOOL_ERROR，私有查看DIAGNOSTIC_UNAVAILABLE，用户明确未见窗口；零已验收工具、CLI退出码null，根因仍未知。第十轮随后对同一viewer补固定失败分类；首次纯合成GUI实测返回VIEWED/NONE、osascript退出0，但用户忘记窗口情况。用户明确允许的一次人工目视重试随后返回DIAGNOSTIC_UNAVAILABLE/CONSENT_TIMEOUT、osascript退出0；用户确认亲眼看到第一层`View locally`窗口，本次未完成同意，第二层合成消息窗口仍未获人工确认。见[同一报告第九至十一次实际结果](C2C_E714_ITERATION8_G1_MEDIA_CHECKPOINT_2026-10-15.md)。两次GUI授权均已消费，不自动补跑模型诊断或再次重试，viewer开发冻结。runtimeEvidence=null，正式G1未启动，真实0/7。

**第十轮补充：** 同一实际函数的合成AppleScript编译通过，没有证实语法缺陷；viewer已补固定失败分类及数字码，不改变权限或env。427项回归、24项定向及真实合成编译通过，独立复审ACCEPT_SCOPED。其后唯一一次获批的28秒纯合成窗口实测返回VIEWED/NONE、osascript退出0；本次没有调用Codex CLI、模型、业务浏览器、Docker、G1或发布，且人工可见性仍待用户明确确认。不附带第六次模型诊断，仍以首个真实G1通过为业务里程碑。

**第十一次复审：** 用户确认重试时亲眼看到第一层`View locally`窗口；本次因12秒内未完成同意而返回CONSENT_TIMEOUT，第二层窗口未验证。ChatGPT独立裁决ACCEPT_SCOPED，冻结viewer和全部GUI-only重试。唯一可提交的下一提案是一次新的`--diagnose-first-error`准确授权，用现有本机私有窗口定位真实CLI首错；若仍不能取得原因，停止同类诊断并转入执行环境技术决策。该提案尚未获运行授权，G0仍BLOCKED、真实0/7。

**第十二次实际诊断：** 用户给出持续授权后，`--diagnose-first-error`只执行一次。固定0.153.0报告仍为BLOCKED/SMOKE_EVENT_STREAM_REJECTED，首错UNKNOWN_NON_TOOL_ERROR、157字节；这次私有窗口完整返回VIEWED/NONE，stderr为空，命令与patch均为0，业务Pipeline未启动。原始文字按设计只在本机显示、不持久化；等待用户提供不含敏感信息的技术大意后，仅处理该具体阻断。runtimeEvidence=null，真实0/7，deploymentExecuted=false。

**第八轮已完成的离线进展：** [G1媒体证据与材料检查点](C2C_E714_ITERATION8_G1_MEDIA_CHECKPOINT_2026-10-15.md)已实现官网引用视频的受限宿主采集、原始证据与7条审批审计复核、浏览器前缺材料暂停、同run新批准恢复及代码身份覆盖。419项历史完整回归0失败，独立复审ACCEPT_SCOPED；其后实际验收失败如上。自动候选发现及非官方热门视频路径未实现，真实G1未批准，不能把材料接线写成真实首页已通过。

**2026-10-15 再次开发纠偏（优先执行）：** [核心目标与偏离复盘](CORE_GOAL_AND_DEVELOPMENT_REALIGNMENT_2026-10-15.md)确认核心目标/单一架构不变，但最近六轮仍主要交付G0基础设施；三次工具验收均未解锁真实首页，开发重心和交付节奏明显偏离。用户随后恢复既定计划下的本地开发。[第七轮协议决策与G1准备](C2C_E714_ITERATION7_PROTOCOL_DECISION_AND_G1_READINESS_2026-10-15.md)已按固定0.153.0源码修正文件直接完成事件，404项离线回归通过，旧运行确切触发仍未知。新的真实运行尚未批准；先独立审查并解决具体业务缺口，不扩展通用框架、重复盲测或放宽必要安全/质量门。

**第六轮接线核实（历史决策已解决）：** [最小可行性与待决策点](C2C_E714_ITERATION6_G0_G1_FEASIBILITY_2026-10-15.md)确认官方profile命令边界与客户端认证边界分离。用户随后已明确接受A：信任官方客户端、固定宿主与操作者，不承诺抵御已控制同UID的其他恶意进程。不得重复索取A/B选择；实际工具验收未通过前不接通正式入口，不新增runner或容器探测。

**第六轮 A 当前状态：** [最小接线验收](G0_HOST_CLIENT_WIRING_ACCEPTANCE_2026-10-15.md)记录固定CLI、G1范围及宿主来源接线。前两次分别单独获批的验收均CLI退出1；移除固定0.153.0不兼容配置并独立复审后，第三次单独获批复验被事件校验拒绝：ITEM_OUTSIDE_TURN，CLI退出码null，无已验收工具完成证据。398项离线回归通过不等于实际工具边界通过。runtimeEvidence=null；正式新run及site不存在，旧首页BLOCKED，后六阶段NOT_STARTED。按用户最新要求先纠偏，不立即再申请第四次运行。

## 1. 核心目标与当前版本边界

用户提供准确游戏身份、建站目标和原始关键词 Markdown 后，通过统一入口和唯一 Pipeline，完成一个真实游戏攻略站的七阶段生产：

**首页调研与图标 → 关键词资料调研 → 模板选择与复制 → 内容整合 → UI/UX 审计 → 上线前验收 → 部署计划。**

当前版本的工程交付点是：真实站点可构建，来源与页面检查合格，部署计划生成并通过验收，进入 `WAITING_FOR_USER` 等待用户确认。用户随后独立确认准确计划摘要，部署阶段才变为 `PASSED`，流程结束。两种状态均保持 `deploymentExecuted=false`。

全流程正式验收还包括计划确认这一道门；用户未确认时如实报告“计划已准备、等待确认”。本规划不代表用户批准任何真实任务，也不预先替用户确认部署计划。

当前版本不执行 GitHub commit/push、托管发布、DNS、GSC/GA4、广告上线或付费操作。这些属于后续独立方案、授权和验收。长期目标保留在[历史 V0.1 规格](AGENT_TASK_CARD_AND_WORKFLOW_SPEC_V0.1.md)，不作为本版本隐含范围。

## 2. 唯一架构与文档职责

`Codex 显式 $game_site_orchestrator / CLI / 后续飞书适配器 → src/cli.mjs → src/orchestrator.mjs → src/pipeline.mjs → src/skill-executor.mjs → 原始专业 Skills`

- Codex、CLI、飞书只承担入口或适配职责，复用同一业务编排器；已有项目模式也复用该 Pipeline。
- 总控管理输入、依赖、锁版、阶段交接、验收、暂停恢复和审批边界；专业操作规则以锁定的原始 Skill 为准。
- [阶段定义](../src/stages.mjs)、[Pipeline](../src/pipeline.mjs)、[执行器](../src/skill-executor.mjs)是当前实现证据。[七阶段验收矩阵](SEVEN_STAGE_GATE_AND_EVIDENCE_MATRIX_V1.md)说明每道门需要什么证据。
- 本文管理整体顺序与完成条件；P0、M2、M3 专项报告保存历史，不承担另一套总体路线图。规划与实现有差异时标为待开发，不把规划描述当成能力已实现。

## 3. 当前能力基线与证据

下列标签只描述开发验证程度，不新增程序状态：`IMPLEMENTED` 代码存在；`OFFLINE_VALIDATED` 合成/隔离测试验证；`REAL_CAPABILITY_VERIFIED` 某项真实能力通过；`PARTIAL` 部分满足；`BLOCKED` 当前阻断；`DEFERRED` 明确后置。局部通过不能代替阶段 `PASSED`。

| 领域 | 最后已知程度 | 证据与实际限制 |
|---|---|---|
| 入口预检、草稿保存/修订/恢复 | IMPLEMENTED / REAL_CAPABILITY_VERIFIED | [P0 工程验收](P0_DEVELOPMENT_ACCEPTANCE_2026-10-14.md)：真实自然语言创建 TEST 草稿及跨调用 revision 1→2 已通过；旧 429 是历史记录，不再作为当前阻断 |
| 可信执行审批交接 | IMPLEMENTED / OFFLINE_VALIDATED / PARTIAL | [P0 工程验收](P0_DEVELOPMENT_ACCEPTANCE_2026-10-14.md)：固定 bootstrap、持久化单次消费及材料副本已通过模拟；[G0 本批验收](G0_RUNTIME_AND_CANARY_ACCEPTANCE_2026-10-14.md)：短期票据与活动运行许可分离。[本批 worker/恢复验收](G0_WORKER_RESUME_AND_PREFLIGHT_ACCEPTANCE_2026-10-14.md)已实现绑定原检查点的新批准恢复；[第三批验收](G0_INPUT_PATCH_PLAN_CONFIRM_AND_G1_SOURCE_ACCEPTANCE_2026-10-14.md)已离线验证输入 patch 和无 worker 计划确认；生产默认 ENTRY_HOST_ISOLATION_UNVERIFIED |
| OS worker 隔离 | REAL_CAPABILITY_VERIFIED / PARTIAL | [G0 本批验收](G0_RUNTIME_AND_CANARY_ACCEPTANCE_2026-10-14.md)：官方 permission profile 在真实 Seatbelt 下阻止五类合成文件读写；[后续真实 executor 合成探测](G0_WORKER_RESUME_AND_PREFLIGHT_ACCEPTANCE_2026-10-14.md)已应用相同命名策略；只证明 shell 命令文件边界，本机回环及子进程有局部实测，GUI/模型工具/认证与宿主身份仍待验收 |
| 七阶段状态机、诊断、暂停恢复 | IMPLEMENTED / OFFLINE_VALIDATED | [维护性验收](MAINTENANCE_FIXES_2026-10-14.md)、[最新离线 manifest](../runs/offline-7ef09975-fc6b-4f3a-ba4b-6560b82b6561/manifest.json)：合成流程到计划确认门，不能证明真实站点成功 |
| Skill Lock | IMPLEMENTED / OFFLINE_VALIDATED | [清单](../config/skill-manifest.json)、[锁版代码](../src/skill-lock.mjs)、Pipeline：本地八项 Skill 内容及依赖锁定；无远程自动升级能力，旧 run 不能静默升级 |
| 新建站模式 | IMPLEMENTED / OFFLINE_VALIDATED / PARTIAL | [编排器](../src/orchestrator.mjs)：自动分配隔离 site；尚无真实新建站七阶段验收 |
| 已有项目模式 | IMPLEMENTED / OFFLINE_VALIDATED / PARTIAL | [已有项目设计](EXISTING_PROJECT_MODE.md)、[Bodycam manifest](../runs/bodycam-codex-local-001/manifest.json)：白名单、基线、候选和内容适配已有实现；源项目写回未实施，真实运行首页仍 BLOCKED |
| Steam 公开采集 | REAL_CAPABILITY_VERIFIED / PARTIAL | [M2 真实验收](M2_STEAM_PUBLIC_CAPTURE_REPAIR_2026-10-14.md)：人工逐命令审批下读取公开字段通过；单个来源不等于完整首页调研，其他三个浏览器阶段未接通 |
| 图标来源与 favicon 转换 | IMPLEMENTED / OFFLINE_VALIDATED / PARTIAL | [M3 双路径验收](M3_HOMEPAGE_SKILL_DUAL_CONVERSION_ACCEPTANCE_2026-10-14.md)：本地/在线转换互斥，来源审批和严格二进制检查已实现；转换不生成原创图标，不独立认证用户声明 |
| 完整首页调研 | BLOCKED | [Wallpaper Engine manifest](../runs/wallpaper-engine-m3-20261014-01/manifest.json)：首页未 PASSED；编制本文时最新失败包含“缺少完整首页 JSON”，图标校验成功不能解锁下游；[第三批](G0_INPUT_PATCH_PLAN_CONFIRM_AND_G1_SOURCE_ACCEPTANCE_2026-10-14.md)仅新增官方公开来源契约，默认缺确切目标仍 BLOCKED |
| 关键词调研 | IMPLEMENTED / OFFLINE_VALIDATED / BLOCKED | [执行器](../src/skill-executor.mjs)、[产物验证器](../src/artifact-validator.mjs)：契约已有，真实浏览器路径尚未接通 |
| 模板选择复制 | IMPLEMENTED / OFFLINE_VALIDATED | [验证器](../src/artifact-validator.mjs)、离线 manifest：合成文件交接通过；真实选择、复制及源完整性仍待本轮新建站验收 |
| 内容整合与构建 | IMPLEMENTED / OFFLINE_VALIDATED / PARTIAL | [内容验证](../src/artifact-validator.mjs)、[已有内容适配](../src/existing-content-adapter.mjs)：页面/关键词来源检查与已有项目适配存在；不能代替真实候选站构建 |
| UI/UX 与上线前验收 | IMPLEMENTED / OFFLINE_VALIDATED / BLOCKED | [执行器](../src/skill-executor.mjs)：浏览器路径未接通；UI 优化还缺文件级写入隔离 |
| 部署计划 | IMPLEMENTED / OFFLINE_VALIDATED | Pipeline、[交接代码](../src/handoff.mjs)：校验、按相同字节发布计划到 site/docs、摘要确认已有实现；真实项目计划尚待验收 |
| 飞书真实联调 | DEFERRED | [P0 续作验收](P0_CONTINUATION_ACCEPTANCE_2026-10-14.md)：本轮不运行飞书测试/服务；消息、重启恢复及提醒不能视为真实通过 |
| 生产发布、数据接入、广告上线 | DEFERRED | 当前总控 plan-only；全部 manifest 的 `deploymentExecuted` 为 false，生成计划不证明已发布、收录、数据到达或有收益 |

历史测试口径分别保留：[M3 双路径报告](M3_HOMEPAGE_SKILL_DUAL_CONVERSION_ACCEPTANCE_2026-10-14.md)为 265 项全量测试；[P0 续作报告](P0_CONTINUATION_ACCEPTANCE_2026-10-14.md)为专项 23 项、排除所列飞书测试后的回归 277 项。不相加、不称后者为全量集成验收。另有 [P0 工程验收](P0_DEVELOPMENT_ACCEPTANCE_2026-10-14.md)的 347 项历史全量；第一批359项见 [G0 验收](G0_RUNTIME_AND_CANARY_ACCEPTANCE_2026-10-14.md)，第二批365项见 [worker/恢复验收](G0_WORKER_RESUME_AND_PREFLIGHT_ACCEPTANCE_2026-10-14.md)，第三批373项见 [输入变更/计划确认/来源契约验收](G0_INPUT_PATCH_PLAN_CONFIRM_AND_G1_SOURCE_ACCEPTANCE_2026-10-14.md)，第四批377项见 [G0/G1 实际准备与来源归属审核](G0_G1_READINESS_AND_SOURCE_OWNERSHIP_ACCEPTANCE_2026-10-14.md)，第五批382项见 [容器边界验收](G0_CONTAINER_BOUNDARY_ACCEPTANCE_2026-10-15.md)，不与历史数量相加。

运行记录会继续变化；上表包含2026-10-14的历史基线与2026-10-15的后续验收。执行前重新读取指定 run 的 manifest、当前代码、Skill Lock 和失败诊断，不能挑选历史“最好的一次”当成当前状态。

## 4. 主线里程碑与执行顺序

G0–G6 是开发里程碑，不是新的 Pipeline 阶段。P0/P1 在本节表示开发优先级；验收报告中的 P0/P1 表示问题严重度。

| 里程碑 | 优先级/当前状态 | 最小工作与完成门 |
|---|---|---|
| G0 统一入口与可信执行交接 | P0 / PARTIAL | 自然语言创建与跨调用草稿恢复已有实测，持久化消费及启动桥接已有隔离模拟。完成绑定草稿 run/revision、输入/材料摘要、Skill Lock、全新 execution run、目标目录、允许阶段与副作用的可信审批；执行边界原子占用并复验；实验消费契约不代替真实宿主，重试不能绕过授权。只读 `CONSISTENT_NOT_AUTHORIZED` 不能当执行票据 |
| G1 真实首页调研与图标 | P0 / BLOCKED | 收齐完整真实首页资料及所需来源，完成原始 Skill 的完整 JSON/SEO/语言契约；已有合格图标路径满足来源与审核后复用，不再以修复 bsk 自动上传为主线门槛；真实 worker 和宿主验收通过，首页进入 PASSED |
| G2 真实关键词调研 | P1 / BLOCKED | 接通该阶段受控工具和来源采集；锁定用户原始 Markdown，生成准确 keywords.json、处理记录、逐词素材与来源日期；所有发布所需关键词完成，阶段进入 PASSED |
| G3 模板选择与复制 | P1 / 待真实验收 | 核对配置模板库和 Skill 路径契约；按游戏证据选择，复制到空目标，清单与文件哈希一致，模板源未变，旧身份残留有记录；不得把“扫描发现残留”写成已完成清理 |
| G4 内容整合与构建 | P1 / 待真实验收 | 用已验收研究建立页面和来源关系；确认 canonical，处理旧域名/robots/sitemap；按实际选定框架和项目命令构建，保存源码修订、命令、退出码和输出证据；不强制改为 Astro，不用 fixture 代替实际构建 |
| G5 UI/UX 与上线前验收 | P1 / BLOCKED | 接通两个真实浏览器检查路径；默认 audit-only，覆盖桌面/移动代表布局及上线前全发布路由；修复另按具体范围审批并复测；无阻断上线的 P0/P1，当前修订的判定允许进入部署计划 |
| G6 部署计划与全流程验收 | P1 / 待真实验收 | 同一新建站 execution run 贯通七阶段；真实计划有仓库/分支、域名、Provider、DNS、预算、风险和回滚；先 WAITING_FOR_USER，再由用户独立确认准确 planDigest；七核心阶段 PASSED、广告 SKIPPED、deploymentExecuted=false，有总体验收证据 |

G0 是统一入口产品完成的前置门。已有单独授权的 CLI 调试记录可以用于定位 G1，不能替代 G0 验收。G1–G6 按阶段依赖推进；不为赶进度人工跳过、伪造产物或降低专业 Skill 门槛。

### 近期工作清单

**当前优先顺序以第十轮实际GUI后的再次纠偏为准：** 唯一一次获批的纯合成GUI测试返回VIEWED/NONE、osascript退出0，技术路径已通过一次实测，人工目视确认仍待用户本人提供；该授权已消费。独立复审认定架构未偏离、交付进度严重延迟，故立即冻结全部新增G0通用能力、诊断框架、runner和审批系统。下一步先取得本次GUI的人工目视确认，不运行任何命令；确认后只允许依据真实首条Codex CLI错误作最小修复，并尽快进入Wallpaper Engine真实G1。真实G1仍缺当前run来源审核、准确视频候选与真实采集、图标批准及原生产物。下列清单不授权自动追加探测；不能解锁当前必要门时，提出具体技术/环境决策，不自动接下一批同类开发。

2026-10-15：第三/四批已获 ChatGPT ACCEPT_SCOPED。用户恢复 Docker engine 并批准限定探测；第三次另获明确批准后，合成容器的文件/子进程/宿主回环/资源实测通过，第五批382项回归通过。[容器验收](G0_CONTAINER_BOUNDARY_ACCEPTANCE_2026-10-15.md)总体PARTIAL，认证/模型工具/GUI/可信审批未测，真实G0/G1仍未通过；生产入口未接通。

1. 有限关闭当前G0阻断：固定0.153.0事件差异已有源码依据和离线修复；先独立审查旧触发未知的影响，再决定具体受支持的下一步。不把用户已接受A模型之外的同UID攻击防护、未启用工具、全部GUI/IPC接口加入当前前置门；不解除必要权限或质量门，不注入测试批准，不另建审批/执行状态机。
2. 重新读取 Wallpaper Engine 首页失败诊断，优先补齐原生完整研究契约；仅在目标、工具、来源和写入范围得到授权后重试。用户已选定 Wallpaper Engine / Steam 431960 作为整体验收对象；按 Application / Utilities 和 Help & Troubleshooting Wiki 定位，旧首页试验 run 不自动继承正式授权。
3. 用户已提供唯一原件 `/Users/randyz/work/coding/hot_words_web/gameweb/game_WallpaperEngine/background_information/keyword-materials/关键词.md`；本轮仅使用完整可读词，截断词和缺失 52–82 行留待补记录，原件不改。使用当前受支持锁版和独立 workspace；旧锁冲突时新建受授权 run 或另行审核迁移，不改写旧记录。
4. 首个首页通过后，投入 G2 与 G5 的真实能力接入；G3/G4 只修复阻断该项目交接、内容和构建的问题。每轮给出所解锁的门及证据。

时间安排以输入、工具和授权条件具备为前提；未验证耗时前不虚构完成日期。阻断时列明技术环节、当前进程拿到的能力、可独立完成的工作和恢复条件。

## 5. 七阶段端到端完成标准

新建站验收对象须由用户明确选择。一个当前锁版、同一游戏、同一 execution run 和 workspace 的真实项目必须同时具备：

1. 可信任务与执行审批来源可追溯，入口草稿与执行 run 的对应关系明确。
2. 用户原始关键词路径及 SHA256、七阶段真实执行历史、原生产物路径与 SHA256 全部可核验。
3. 原创/授权图标、来源事实、页面与关键词的对应关系完整，未知项明确列出；不借用合成 TEST 素材。
4. 模板完整复制且源未改；实际项目构建成功；当前源修订的 UI 与全路由上线前报告允许进入计划。
5. 计划生成验收合格时保存 `WAITING_FOR_USER` 和当前 `planDigest`；用户单独确认摘要后，再核对锁版、材料、产物和源码新鲜度，记录计划阶段 `PASSED`。
6. 七个核心阶段最终均 `PASSED`；可选广告不启用，为 `SKIPPED`；`deploymentExecuted=false`。输出总体验收记录，区分计划准备、计划确认及生产权限。

已有项目模式是独立分支：模板阶段可为 `SKIPPED`，原因记录 `NOT_APPLICABLE`，必须有原项目基线、候选 adoption 与源保护证据。该分支可以有自己的验收，但不能代替新建站七阶段全部真实执行的完成标准。

## 6. 偏离控制、失败恢复与后置范围

- 每个开发任务必须说明服务哪个 G0–G6 门、最小改动和验收证据；不因某工具故障无限增加专项任务。
- 已有转换路径能满足来源和二进制契约时，BrowserSkill 自动上传修复后置。切换路径仍遵守用户明确授权和 Skill 契约，不能擅自降级工具、来源或执行提供方。
- 保留 `BLOCKED`、`PARTIAL`、`FAILED`、`WAITING_FOR_USER` 原因；缺少站内一手资料不输出市场判断，工具失败先诊断，用户同意替代方案后才切换。
- 材料/源码/域名/锁版变化时复验并使受影响阶段、下游报告和批准失效；未知效果的外部命令不自动重放。有效检查点恢复不意味着可以复用过期授权。
- 对同一具体故障连续两次受控尝试无新增诊断证据时，先记录可复现条件与外部阻断，再评估符合已授权契约的可用路径，不进行无限重复尝试。

| 后置事项 | 重新进入主线的条件 |
|---|---|
| 原生自定义 agent_type 委派、飞书真实服务、后台十分钟提醒、批量无人值守 | 首个统一入口和七阶段验收完成，另有运行载体需求与真实验收计划 |
| GitHub Skills 发布、远程兼容升级 | 分发方案、兼容与锁版策略明确，不静默升级既有 run |
| UI 自动优化文件级隔离、BrowserSkill 自动文件传输 | audit-only/批准转换路径不能满足具体目标，或另有明确专项任务；不得借此放宽权限 |
| 原项目 promotion、GitHub commit/push、托管部署、DNS/Nameserver | 针对确切项目、文件、分支、域名、风险、回滚的独立方案和明确授权 |
| GSC/GA4、广告集成/发布、付费服务、收录/流量/收益观测 | 已授权发布完成并验证；另行取得所需账号和操作权限，只报告实际证据 |

## 7. 规划维护与本轮范围

每个里程碑结束或发生实质阻断变化时更新本文和矩阵：记录日期、代码/运行/报告路径、实际状态、未覆盖项和下一道门；历史 P0/M2/M3 记录保持原样。当前事实以指定运行的最新 manifest 和代码为准。

规划文档首次复核仅涉及五份 Markdown。当前 C2C e714 已进入 G0 代码实施和合成测试；本批执行与边界见 [G0 第一批](G0_RUNTIME_AND_CANARY_ACCEPTANCE_2026-10-14.md)、[第二批](G0_WORKER_RESUME_AND_PREFLIGHT_ACCEPTANCE_2026-10-14.md)、[第三批](G0_INPUT_PATCH_PLAN_CONFIRM_AND_G1_SOURCE_ACCEPTANCE_2026-10-14.md)、[第四批](G0_G1_READINESS_AND_SOURCE_OWNERSHIP_ACCEPTANCE_2026-10-14.md)及[第五批](G0_CONTAINER_BOUNDARY_ACCEPTANCE_2026-10-15.md)。真实业务 worker、实际站点构建和生产发布尚未执行；本批通过不等于 G0–G6 完成。

编写期间观察到其他工作对 P0 的代码、测试和自然语言复验报告进行了并发更新。本文引用已读到的最新文件，但不替并发实现做代码验收；历史测试报告仍只证明各自记录的版本与范围。
