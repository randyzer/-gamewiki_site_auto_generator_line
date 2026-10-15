# 七阶段验收与证据矩阵 V1

更新日期：2026-10-15（Asia/Taipei）
用途：为[总体路线图](MASTER_AGENT_EXECUTION_ROADMAP_V1.md)提供验收门。本文描述当前实现和待真实验收要求，不授予执行权限，不新增状态机。

开发纠偏见[核心目标与偏离复盘](CORE_GOAL_AND_DEVELOPMENT_REALIGNMENT_2026-10-15.md)。授权/隔离的离线与合成验收不能计作真实阶段通过。当前完整首页仍BLOCKED，正式草稿未执行；下一交付点为最小G0接线与真实G1验收，未启用的后置能力不扩展为该门的前置义务，既有必需安全与质量条件不降低。

## 1. 编号、状态与共同证据

面向用户使用第 1–7 阶段；manifest 数组与 `artifacts/` 兼容目录索引为 0–6。真实 Skill 名称及顺序以 [stages.mjs](../src/stages.mjs) 为准。可选广告 `game-site-adsterra-ad-integration` 不算第八个核心阶段；本版本主线关闭广告分支。

程序阶段状态为 `NOT_STARTED / READY / IN_PROGRESS / WAITING_FOR_USER / BLOCKED / PASSED / PARTIAL / FAILED / SKIPPED`。`NOT_APPLICABLE` 是已有项目模板阶段的原因说明，不是新增状态。下文“已实现”“离线验证”“局部实测”也不属于程序状态。

入口的 `READY_FOR_APPROVAL` 只代表当前入口材料检查通过；`PREVIEW_ONLY` 与 `CONSISTENT_NOT_AUTHORIZED` 只代表只读交接检查。它们均不批准建站、不保证后续材料齐备，正式可信执行交接仍待完成。

当前共享工作区的 CLI `run/retry` 默认返回 `ENTRY_TRUSTED_APPROVAL_UNAVAILABLE`；新增 `entry-approval.mjs` 仅为实验宿主消费契约，生产宿主未接入。下面列出的阶段权限是未来经过可信交接、具体授权后必须满足的条件，不能用表格或测试注入启动真实执行。

每阶段证据必须绑定同一 `run_id`、`gameIdentity`、绝对 `projectPath`、输入摘要、Skill Lock、attempt、当前源码修订、状态、原因和下一步。原生文件实际路径保存在 manifest 的 `sourcePath/sourceSha256`，阶段快照使用 `path/sha256`；有派生产物时 `sourceSha256` 可为空，必须明确其派生来源。不能仅凭文件名或存在性通过。

- 运行证据：`agent/runs/<execution-run-id>/manifest.json`、实际 `artifacts/<index>/<attempt>/`、`diagnostics/` 和 `AGENT_RUN_REPORT.md`，由代码记录具体路径。
- 新站：`agent/workspaces/<execution-run-id>/site`，由总控分配，禁止覆盖原游戏站或模板源。
- 研究先放隔离区；模板复制通过后，[handoff.mjs](../src/handoff.mjs)把首页资料交接至 `backgroundinformation/`，关键词资料交接至 `backgroundinformation/keyword-materials/`。已有项目可能由基线明确使用 `background_information/`，不得自行猜目录。
- [artifact-validator.mjs](../src/artifact-validator.mjs)校验原生产物，[pipeline.mjs](../src/pipeline.mjs)校验锁版、身份、哈希、上游和源码新鲜度。原生验证器以本轮锁定 Skill 的 `scripts/` 为来源。

## 2. 七阶段输入、权限与必需产物

产物列中的英文 role 来自 `stages.mjs`，不强制把原生文件改成英文名。`<gameIdentity>` 表示经过 Skill 文件名安全处理的确切游戏名。

| 阶段/索引/Skill | 前置输入 | 权限与允许副作用 | 必需 role 与原生交付 |
|---|---|---|---|
| 1 / 0 / `game-homepage-icon-research` | 准确 gameIdentity、平台/版本元数据、objective、分配 projectPath；Steam 身份与 URL；已批准的图标来源/转换路径 | 明确任务授权后写隔离研究目录；首页宿主浏览器须逐命令人工批准；图标审核绑定源 SHA256；不得改站点或模板 | `HOMEPAGE_RESEARCH.md`、`ICON.zip`；原生 `backgroundinformation/<gameIdentity>攻略站首页调研信息.md`、`backgroundinformation/<gameIdentity>图标.zip`；完整首页 JSON、原图和转换收据/来源证据 |
| 2 / 1 / `game-innerpage-keyword-information-research` | 阶段1 PASSED；用户原始 rawKeywordsFile 绝对 `.md` 路径、游戏/研究工作目录；工具与凭据由环境提供 | 只读原始关键词；经授权在研究区写资料；站内一手来源与工具失败处理遵守 Skill/用户规则，不凭搜索摘要断言事实 | `keywords.json`、`关键词处理记录.md`、`关键词素材汇总.md`；每个最终词的 `<keyword>素材.md`；宿主派生 `KEYWORD_MATERIALS.md`，不是 worker 虚构的一份汇总 |
| 3 / 2 / `game-site-template-selector` | 前两阶段 PASSED；配置模板库、游戏证据、空目标目录 | 仅复制一个主模板到分配的隔离 site，源只读；不安装/构建源模板，不提前混合模块和内容 | site/docs 中的 `TEMPLATE_SELECTION_REPORT.md`、`template-copy-manifest.json`、`TEMPLATE_RESIDUE_SCAN.json` |
| 4 / 3 / `game-site-content-integrator` | 上游研究、关键词、模板报告/清单/残留扫描；canonicalRequired 及必要的已确认 HTTPS canonicalOrigin | 仅在候选 site 整合内容和图标、运行已授权项目检查/构建；已有项目源保持只读 | `CONTENT_INTEGRATION_REPORT.md`、`CONTENT_PAGE_MANIFEST.json`、`CONTENT_PROVENANCE.md`、`CONTENT_GAPS.md`；真实站点源码及当前修订的构建证据；已有项目增加 adoption/validation 证据 |
| 5 / 4 / `game-site-ui-ux-audit-optimizer` | 内容阶段 PASSED、siteRevision、项目启动/预览条件；uiMode 默认 audit-only | 浏览器能力和命令须受控；默认只写报告/截图。optimize 需绑定 run/stage/project/revision/files 的授权及机械隔离，当前能力未满足 | `UI_UX_AUDIT_REPORT.md`、`UI_UX_AUDIT.json`、`UI_UX_OPTIMIZATION_PLAN.md`、真实 screenshots；获准 optimize 还需 `UI_UX_RETEST_REPORT.md` |
| 6 / 5 / `game-site-prelaunch-gate` | UI PASSED、domain、当前源码修订、真实生产构建/预览、完整发布页面集合 | audit-only 检查和报告；构建/缓存必须在受控目录；修复需单独明确范围，不隐式改源码 | `PRELAUNCH_ACCEPTANCE_REPORT.md`、`PRELAUNCH_ACCEPTANCE.json`、`REPAIR_MANIFEST.md`，真实路由覆盖、截图/检查证据；原生报告位于 site/docs/prelaunch 的 run 目录 |
| 7 / 6 / `game-site-deploy-and-measurement` | prelaunch 允许规划；repo、branch、domain、dns.provider 与 recordsReviewed、deploymentPlanAuthorized；平台/预算等计划事实 | plan-only；worker 在隔离区生成，宿主校验后以相同字节安全写 site/docs；不能 commit/push/托管发布/DNS/Google/广告 | `DEPLOYMENT_PLAN.md`、`DEPLOYMENT_PLAN.json`；计划身份、architecture/hosting/measurement、checks/risks/rollback、计划摘要与独立确认记录 |

## 3. 各阶段验收器与状态门

下表是“宿主结构验证 + 真实执行证据”的共同要求；现有结构验证不独立证明事实正确、浏览器已检查或构建实际发生。

| 阶段 | 当前宿主/原生验证入口 | PASSED 与下游解锁条件 | WAITING_FOR_USER | BLOCKED / PARTIAL / FAILED |
|---|---|---|---|---|
| 1 首页 | Skill `validate_outputs.py`；宿主 `verify-favicon-package.py`、执行器图标来源与宿主证据核验 | 真实完整 Markdown/JSON/SEO、正确游戏与来源，512px 合格图标、审批和转换来源可追溯，PNG/ICO/ZIP/Manifest 验证通过；阶段 PASSED 后解锁关键词 | 缺身份/目标，图标来源、视觉审核或转换确认尚缺 | 无工具/可信来源，网页身份不匹配、资料契约缺失、图标伪造/篡改则阻断或验收失败；局部资料可保留但不能过门 |
| 2 关键词 | Skill `validate_outputs.py --workdir --raw-keywords`；宿主核对逐词状态与派生素材束 | 每个最终词素材为 `COMPLETED`，原始词处理可追溯且摘要匹配，来源真实；PASSED 解锁模板 | 原始 Markdown 缺失/空/不可读，所需资料待用户补充 | 工具/凭据/来源失败 BLOCKED；部分词缺资料 PARTIAL，不进入下游；验证异常 FAILED |
| 3 模板 | 宿主核对 game/destination、source_unchanged/destination_verified、非空 files 与实际 SHA256 | 真实选择证据、复制完整，源保护成立且残留扫描有结果；PASSED 解锁内容整合 | 模板/目标歧义需确认 | 路径冲突、库缺失/不健康、文件哈希不匹配阻断；复制/验证异常 FAILED。已有项目仅在合法基线分支 SKIPPED |
| 4 内容 | 宿主页面 schema、关键词全覆盖、counts/outcome/provenance 检查；已有项目 `validateExistingContentArtifacts` | 页面、原始素材、源码 lineage 一致，报告完整；真实构建及残留/canonical 检查符合当前源码；PASSED 解锁 UI | canonicalRequired/Origin 等必要事实缺失 | 错游戏/上游冲突/覆盖或计数错误阻断/失败；材料或页面缺口必须如实保留，不用 draft/blocked 页面冒充可上线 |
| 5 UI | Skill `validate_audit.py`；宿主 verdict、screenshots 和 Pipeline projectDigest | 当前修订真实桌面/移动审计，verdict 为 `SHIP` 或 `SHIP_WITH_FIXES`，必要优化有合法授权与复测；PASSED 解锁 prelaunch | siteRevision、模式或必要批准缺失 | 当前真实浏览器路径未接通；optimize 隔离不足 BLOCKED；不可交付 verdict 阻断，验证异常 FAILED |
| 6 prelaunch | Skill `validate_report.py`；宿主 run/game/project/expected_domain/coverage；Pipeline disposition/revision | 预期发布路由全覆盖；当前修订判定为“可以上线”或“可以上线，但有P2待办”；无阻断上线的 P0/P1；PASSED 解锁计划 | domain、预览/项目条件待确认 | 浏览器不可用、覆盖缺失、修订/域名不匹配、暂不建议上线阻断；部分检查 PARTIAL；验证异常 FAILED |
| 7 计划 | 宿主 schema/identity/sections 检查、publishDeploymentPlan、Pipeline 摘要确认与重新核验 | **第一道门**：真实计划合格后转 WAITING_FOR_USER。**第二道门**：用户独立确认当前 planDigest，复验锁、关键词、上游和源码后转 PASSED；结束主线，仍不生产发布 | 缺仓库/分支/DNS/生成计划授权，或缺 deploymentPlanApproval | 计划身份/域名/章节错误、现有计划内容冲突、批准摘要不匹配/旧证据失效阻断；生成/保存异常 FAILED |

第4阶段现有结构验证允许逐页声明 `PUBLISHED/DRAFT/BLOCKED` 并核对来源和计数，不单独保证构建与所有发布质量；第6阶段的真实完整上线前验收仍不可省略。矩阵列出的真实构建要求属于全流程验收门，不能声称它已经由所有新站适配路径自动强制完成。

部署计划 JSON 的 `status/confirmation.status` 在生成时为 `AWAITING_CONFIRMATION`，Pipeline 接纳后阶段为 `WAITING_FOR_USER`。用户确认使 **manifest 阶段**变成 `PASSED`；不能据此声称原 JSON 自动改成新状态或已部署。确认材料只含该计划批准，不能夹带输入变更，也不能自填 JSON 冒充用户授权。

## 4. 当前真实验证、证据与失效传播

每一行还需引用共同证据中的实际 `path/sha256`、`sourcePath/sourceSha256`、attempt 和 Skill Lock；不把下表文档链接当成新的阶段产物。

| 阶段 | 最后已知真实状态与证据 | 输入/重试/源码变化后的处理 |
|---|---|---|
| 1 首页 | [Wallpaper Engine manifest](../runs/wallpaper-engine-m3-20261014-01/manifest.json)仍 BLOCKED；[M2](M2_STEAM_PUBLIC_CAPTURE_REPAIR_2026-10-14.md)是来源局部实测，[M3](M3_HOMEPAGE_SKILL_DUAL_CONVERSION_ACCEPTANCE_2026-10-14.md)是转换契约验收，均不代替完整首页 PASSED | 身份/项目已执行后锁定；需变更则新 run。来源、图标、资料变化复验本阶段和下游；Skill 清单变化不能静默升级旧 run |
| 2 关键词 | 浏览器适配 BLOCKED，只有合成交接/验证证据；参见[执行器](../src/skill-executor.mjs)与[离线 manifest](../runs/offline-7ef09975-fc6b-4f3a-ba4b-6560b82b6561/manifest.json) | 同路径原始 Markdown 字节改变也会失效；从关键词阶段重验并使模板/内容/UI/prelaunch/计划及旧批准失效 |
| 3 模板 | 无本轮真实新站 PASSED 证据；离线复制验证不能替代实选 | 复制源/目标冲突先停止核对，不覆盖重试；受影响快照和下游重验。已有项目基线变化阻断候选继续 |
| 4 内容 | 上游未真实通过；已有项目适配是独立离线证据，参见[已有项目模式](EXISTING_PROJECT_MODE.md) | canonical/研究/内容源码变化重验内容及下游；UI 之后源码变化须更新 siteRevision 并显式重试相关阶段 |
| 5 UI | 真实浏览器适配 BLOCKED，自动优化也受隔离门阻断 | siteRevision/uiMode/授权变化按输入映射失效；代码改动使旧 UI、prelaunch 和计划不可沿用 |
| 6 prelaunch | 无本轮真实全路由 PASSED；源码门与验证器有离线测试 | 域名/源码/路由变化重新验收；报告覆盖、修订和域名必须匹配，再生成计划 |
| 7 计划 | [离线运行](../runs/offline-7ef09975-fc6b-4f3a-ba4b-6560b82b6561/manifest.json)只在 WAITING_FOR_USER；没有真实新建站七阶段全部通过记录 | repo/branch/DNS/域名/源码或任何上游变化使计划及批准失效；重新生成/核验与独立确认，不复用旧摘要 |

通用恢复规则：只有 `PASSED`（或合法已有项目模板 `SKIPPED`）才能解锁下游。任何 `PARTIAL/BLOCKED/FAILED/WAITING_FOR_USER` 都停止依赖阶段；显式 retry 保留历史和诊断，按最早受影响阶段失效传播。有效上游可以保留，不能重放效果未知的外部操作。

## 5. 总体验收证据包

真实新建站的验收至少包含：同一 execution run 的 manifest 与报告、七阶段原生产物/快照及 SHA256、用户原始关键词摘要、Skill Lock、来源日期和局限、实际构建命令/退出码/当前源码摘要、UI 与完整路由检查、计划字节/planDigest 和独立用户确认、`deploymentExecuted=false`。

若只能到计划生成等待门，交付明确为“部署计划已准备，等待用户确认”，保留 WAITING_FOR_USER。全流程正式确认前不得将七个核心阶段说成全部 PASSED，更不得说网站已发布。已有项目模板跳过的分支另记基线和 adoption，不冒充完整新站七阶段执行。
