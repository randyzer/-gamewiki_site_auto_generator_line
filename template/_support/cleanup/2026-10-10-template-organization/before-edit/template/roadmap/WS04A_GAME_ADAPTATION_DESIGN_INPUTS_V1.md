# WS-04A 游戏适配设计输入 V1

更新：2026-10-08（Asia/Taipei）。下列项目/案例输入来自2026-10-06整理，保留原报告时间和证据范围；不是当前项目采用、人审或媒体使用批准。本文作为Active方法的历史输入说明，实际技术引用以[现有接口参考](../design/ws04a/WS03_CANDIDATE_INTERFACE_BINDING_BASELINE_V1.md)为准，不将早期缺接口假设当当前条件。

当前路线解释见[简化Amendment](../architecture/V2.7_ARCHITECTURE_SIMPLIFICATION_AMENDMENT_V1.md)，进度/gate见[PROJECT_STATE](../PROJECT_STATE.md)、[TASK_LEDGER](V2.7_TASK_LEDGER.md)与[正式WS03 Review](../codex/verifications/v2.7-ws03/CONSOLIDATED_WS03_TECH_REVIEW_V1.md)。SOP唯一Contract仍持41能力语义；本文件不复制Registry或改要求/严重度。

## 设计需要解决的真实问题 — 2026-10-06历史输入

| 输入 | 当前证据及边界 | 设计应回答的问题 |
| --- | --- | --- |
| War of Genesis | [2026-09-15验收报告](../../gameweb/game_warofgenesis/docs/PRELAUNCH_ACCEPTANCE_2026-09-15.md)：泛化表现、只有logo、分享媒体不足；标题承诺与正文答案不一致；法律/主体尚未齐全，不建议上线 | 如何将经批准术语、任务、视觉依据映射到主题/页面，并显式暴露缺媒体、缺答案与人工决定？ |
| Bomb Farm | [视觉缺口报告](../../gameweb/game_bombfarm_v2/docs/VISUAL_MEDIA_GAP_REPORT.md)记录媒体权利BLOCK；[V2.1增补](../../gameweb/game_bombfarm_v2/docs/V2_1_VISUAL_MEDIA_ENRICHMENT_REPORT.md)记录22资产/23文件及四条no-media决定 | 如何表达每页媒体需求、证据/权利状态、语义映射和完整no-media选型，而不把资产数量当完成？ |
| Bomb Farm人审 | [实际证据](../../gameweb/game_bombfarm_v2/docs/V2_1_HUMAN_VISUAL_REVIEW_EVIDENCE.md)仍READY FOR HUMAN VISUAL REVIEW | 如何绑定项目/构建/审核人，避免从旧技术PASS或截图存在推断当前权利/视觉PASS？ |
| 参考案例 | [四站原站观察](../LIVE_SITE_VALIDATION_2026-10-01.md)与[五本地代码审计](../5_SITE_PATTERN_CAPABILITY_AUDIT.md)分别存在 | 哪些能力是通用组合，哪些分类、字体、颜色和事实必须由游戏项目决定？Farever只可作本地候选，不作原站成功证明 |

本文未重新联网、运行原项目、确认游戏事实或批准媒体复用。所有输入仍保持原时间与构建范围；后续当前采用需重新确认。

## 如何使用这些输入

用[方法](../design/ws04a/GAME_ADAPTATION_METHOD_V1.md)和[5块工作表](../design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md)记录选择与真实缺项：采用身份；玩家问题/承诺与原答案；游戏视觉依据；媒体/视频/no-media及搜索/下一步/原日期版本依据；实际责任、审核证据和复查。默认提示不是机器输入、必填字段或新的schema/config/type，已有记录直接引用。

Page Inventory、game.config.ts、semantic theme tokens/theme.css、content、facts、tool definitions、Media Manifest、sources/Provenance和SOP唯一规范继续持原真相。主题角色/媒体尺寸权利引用/视频等价/分享/搜索/日期已有接口均从当前参考定位，不要求SOP/Prompt/Starter新增适配运行模型。visualRoles仅optional preset/helper，组合意图desiredPatternIntent仅自由文本，无Pattern ID/enum/schema。

历史问题是采用时需重新核对的来源，不产生新游戏事实或批准。unknown/disabled/draft页面不能由工作表激活；来源URL不是权利批准；无媒体仍要真实答案/完整布局/有用下一步及能力边界；有游戏依据也不能掩盖可用性失败；相关性不由最近更新推导。publishedAt/updatedAt、sources.accessedAt→sourceCheckedAt、patch/version分开，sourceCheckedAt不冒充verifiedAt，旧源/build或签署不能当当前完成。

[历史例子映射](../design/ws04a/WOG_BOMBFARM_TRACEABILITY_EXAMPLES_V1.md)仅帮助找到5块的决定位置，不继承WoG/Bomb Farm旧报告或人审结果为V2.7采用结论。后续Pattern/双游戏vertical proof和04B/真实采用按治理路线；不要求04A方法先有WS05实例，WS05出现真实consumer后才可另行评估运行输入。

Safari/WS06A不阻塞WS04A/WS05非浏览器工作；AX、assembled/WS06B、PRODUCT/RELEASE仍保留独立证据要求。本输入说明不关闭WS04A、不启动WS05，也不豁免历史FAIL/BLOCK。原报告、iteration、archive和review不因Active文档修订而改写。
