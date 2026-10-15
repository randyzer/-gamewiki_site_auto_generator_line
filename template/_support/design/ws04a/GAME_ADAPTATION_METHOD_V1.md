# WS-04A 游戏适配方法 V1

更新：2026-10-08（Asia/Taipei）。用途：Project / Adoption Method。项目用这份方法说明选择和依据，按[工作表](GAME_ADAPTATION_DECISION_WORKSHEET_V1.md)记录；它不是 runtime contract，也不提供机器读取的适配 schema/config/type/字段。

当前进度和 Gate 只见 [PROJECT_STATE](../../PROJECT_STATE.md)、[TASK_LEDGER](../../roadmap/V2.7_TASK_LEDGER.md)及[正式 WS03 Review](../../codex/verifications/v2.7-ws03/CONSOLIDATED_WS03_TECH_REVIEW_V1.md)。长期边界依[简化 Amendment](../../architecture/V2.7_ARCHITECTURE_SIMPLIFICATION_AMENDMENT_V1.md)。能力含义、适用性、严重度和例外只由 [SOP 唯一 Product Contract](../../../Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md)决定，不在本方法复制 Registry。

## 使用入口与所有权

工作表只有 Adoption Identity、Player & Content Decision、Visual Decision、Media & Journey Decision、Review & Evidence 五块，最多14个默认提示。它们是可按需回答的问题，不是强制字段或嵌套对象。先用一句决定和精确引用，只有实际差异、缺口或风险才展开。项目身份、来源、共同范围、负责人及审核链接只写一次；页面沿用原 Inventory 的 Page ID 小标题，不在每块重复清单。

技术值继续由[接口参考](WS03_CANDIDATE_INTERFACE_BINDING_BASELINE_V1.md)列出的9个既有 authority 持有；[引用指南](WS03_INTERFACE_DEPENDENCY_LEDGER_V1.md)帮助定位。工作表记录理由，不能另持 route、发布/索引状态、配置开关、主题值、事实、资产映射、日期或能力 outcome。唯一项目媒体决定表保持原生命周期权威，工作表只引用。SOP持规范；项目持真实游戏决定；实际审核记录持签署、范围和构建证据；Starter只消费原有技术输入，不读取这份工作表。

需要识别问题时参照[历史案例映射](WOG_BOMBFARM_TRACEABILITY_EXAMPLES_V1.md)和[历史设计输入](../../roadmap/WS04A_GAME_ADAPTATION_DESIGN_INPUTS_V1.md)。用[审查清单](WS04A_DESIGN_REVIEW_CHECKLIST_V1.md)检查决定是否足够清楚，不重填已有证据。

## A0–A9 适配流程

这些步骤是项目采用检查方法，不逐项变成运行字段，也不要求逐页重复填写。

| 步骤 | 决策块 / 工作 | 缺项时如何处理 |
| --- | --- | --- |
| A0 来源身份 | Adoption Identity：引用采用范围、三件套来源、Contract、项目源/已审核构建和证据日期的原记录 | 缺源或构建时明确未提供；不继承历史 PASS，不为填写临时构建或全树 hashing |
| A1 术语与游戏身份 | Player & Content：记录必要术语及第一手依据，引用原 content/facts | 未确认就留缺口；不编分类、角色、数值或掉率 |
| A2 玩家任务与答案 | Player & Content：比较入口问题、页面承诺与实际答案/来源 | 落差记录收窄承诺、取得事实或阻塞的具体决定，不编排名补空 |
| A3 已有 Page ID 选择 | Adoption Identity / 页面小标题：引用项目 Inventory 的有效页，核对原 feature/发布/开发状态 | 工作表不能启用 unknown/disabled/draft 页面；新页走原内容流程 |
| A4 组合意图 | Player & Content：desiredPatternIntent 仅自由文本说明为什么选择组合 | 不创建 Pattern ID/enum/schema；WS05有真实consumer后才能另行评估运行输入 |
| A5 视觉依据 | Visual：将游戏证据关联到现有品牌、semantic CSS/token、可选 visualRoles 选择及可用性 | 不按genre猜字体/颜色；visualRoles只作optional preset/compatibility helper，不扩张成适配模型 |
| A6 媒体/视频需求 | Media & Journey：判断四类价值，引用原媒体决定，说明用/不用视频或完整no-media方案 | 有用媒体未取得仍是缺口；不能改写成不需要或自动批准 |
| A7 搜索/相关/时效 | Media & Journey：搜索任务/corpus理由、下一有用目标及原日期/source/patch-version依据 | 原 features.search、relatedPageIds、日期/版本值只引用，不另存运行真相 |
| A8 审核责任与材料 | Review & Evidence：一次说明事实/内容、权利、视觉、技术和独立审核责任，引用原签署 | 一般执行授权、技术通过或材料存在不能代签事实/权利/视觉/产品结果 |
| A9 接口核实 | Adoption Identity + Review & Evidence：原接口、源/build与审核记录对应，变化时核对受影响引用 | 实际不一致/缺项集中记录；不以早期方法假设要求Core改造或另建适配契约 |

覆盖范围由采用的核心 Page ID 引用核对，不从资产/页面数量推导完成。已有工具的能力以源码为准，人工覆盖和决定方法不冒充自动checker。

## 媒体、无媒体与视频的具体决定

每页媒体判断保留理解、游戏识别、玩家决策、证据质量四类价值；它们是判断角度，不是四个评分字段。来源URL、下载成功、资产数量、尺寸或技术集成不能代替MC-04需求与权利/语义判断。图片/截图、key art、事实图解、装饰插画和视频区分用途；图解不冒充游戏UI，装饰不能抵作真实截图。

无媒体区分“对任务无实质帮助”与“有用但未取得”。后一种保留需求/缺口。完整方案引用真实答案、文字层级、必要步骤/比较/检查单/来源和有用下一步，说明不保留空槽及放弃媒体后的能力边界/组合重分类；不是每页都要所有模块。不可由文字替代的关键证据或适用P1仍缺失时保留阻塞，重分类不豁免规范。

涉及视频时才展开使用/排除理由、原来源/权利决定、等价文字/字幕需求、poster及不播放时仍可获得的答案；不指定新provider。运行值由原Manifest/renderer持有，分享图同样引用原share/defaultShare。完整no-media组合和组装结果在相应Pattern/真实采用阶段核验，工作表不是已实现组合或人审结论。

## 既有生命周期、证据状态和最终 outcome 分开

媒体状态原义以当前 [media-readiness.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/media-readiness.ts)为准。项目只保留一个由 `findMediaDecisionTable` 找到的媒体决定表（docs 或根目录其中一处）；工作表引用其记录，不复制 canonical 生命周期行。方法不新增状态枚举，也不把缺失该表时现有 validator 没报错解释为 MC-04 已满足。

`sourceUrl` 存在不等于权利批准；`FOUND` 不等于 `SEMANTICALLY VERIFIED`；`INTEGRATED` 不等于人工视觉通过。保留既有 `VERIFIED`、`UNRESOLVED`、`HUMAN RISK ACCEPTED`、`NOT REQUIRED FOR EMBED` 和 `APPROVED`、`WAIVED`、`REVISE`、`BLOCK`、`PENDING` 的不同含义。

使用 `HUMAN RISK ACCEPTED`、`NOT REQUIRED FOR EMBED` 或 `WAIVED` 时，须记录其适用条件、授权范围、decision owner/reviewer、理由、证据及当前项目/构建。它们不能由模板、官方来源或一般执行授权自动推导。机器能接受某个生命周期组合也不表示权利真实、Contract PASS 或发布例外成立。不得把既有风险接受改写成权利 VERIFIED，也不把所有非 VERIFIED 状态一概抹为 BLOCK。

规范证据采集沿用 `NOT_RUN`、`PENDING`、`OBSERVED`、`UNVERIFIED`，最终 `verifiedOutcome` 独立；NOT_RUN/PENDING/UNVERIFIED 必须为 null，OBSERVED 也可为 null 待独立裁定。§W outcome 和 §AA 例外语义不变；P0/P1 不能作为普通发布例外豁免。工作表自身完成不写入 Registry outcome。

## 来源、时效与审核责任

publishedAt、updatedAt、sources.accessedAt → sourceCheckedAt、patch/version各自分开；保留updatedAt >= publishedAt的原验证。来源访问不是verification，sourceCheckedAt不冒充verifiedAt，不把构建日期改成今日或把静态来源叫实时。无依据的Live / Popular / Trending不输出；涉及真实文案时说明原依据，不新增动态标签填写字段或替代实时模型。

项目在Review & Evidence中一次指定事实/内容、媒体权利/风险、视觉/内容、技术和独立验收责任；按具体决定关联原审核记录，不复制批准状态。来源、构建、内容/资产、版本适用性或授权范围有影响结论的变化时，核对原证据适用范围并记录复查触发。原技术PASS、截图、旧签署不能自动证明当前权利、视觉、主体或发布通过。

## 审查与后续边界

按[使用说明](WS04A_BINDING_READINESS_V1.md)提交方法/决定的文档diff供独立审核；填完工作表不关闭workstream，不写入能力outcome，不启动WS05。WS05运行输入只有出现真实consumer后才能另行评估；方法记录不要求先实现Pattern实例，后续双游戏vertical proof与04B/真实采用边界沿治理路线执行。

Safari / WS06A证据不阻塞WS04A / WS05的非浏览器工作；AX、assembled/WS06B、PRODUCT/RELEASE及真实Safari证据仍有各自独立gate。不将解除无关阻塞解释为Safari/AX通过。需要改产品、测试、规范或新增运行模型时，停止当前文档范围并另行报明，不顺手扩展。
