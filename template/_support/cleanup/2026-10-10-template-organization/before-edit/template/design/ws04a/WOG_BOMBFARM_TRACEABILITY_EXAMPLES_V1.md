# WoG / Bomb Farm 历史缺口映射 V1

日期：2026-10-06。状态：HISTORICAL EXAMPLES ONLY / NOT CURRENT PROJECT PASS / NOT RIGHTS APPROVAL / NOT V2.7 ADOPTION RESULT。本文没有重跑原项目、重新取得游戏事实、批准媒体、查看历史截图或判断当前生产站。所有例子说明“报告缺口→方法字段→应怎样处理”；不是新配置或当前审核决定。

## 来源及时间边界

| 来源 | 记录的范围 | 本设计可使用什么 |
| --- | --- | --- |
| [WoG 2026-09-15 上线前报告](../../../gameweb/game_warofgenesis/docs/PRELAUNCH_ACCEPTANCE_2026-09-15.md) | 17 启用页、当时 Node22.22.0 的生产预览和修复；技术通过，但法律/主体人工项未完成，暂不建议上线 | §2 标题/法律/分享缺口、§5 仅有 logo、§7 人工边界；不继承为 V2.7 PASS |
| [Bomb Farm 视觉/媒体缺口](../../../gameweb/game_bombfarm_v2/docs/VISUAL_MEDIA_GAP_REPORT.md) | 早期未批准媒体时的 BLOCKED BY MEDIA RIGHTS；需求、来源和呈现观察 | 原始阻塞及“来源不等于许可”的方法问题；不声称后续项目始终没有媒体 |
| [Bomb Farm V2.1 增补](../../../gameweb/game_bombfarm_v2/docs/V2_1_VISUAL_MEDIA_ENRICHMENT_REPORT.md) | 2026-09-05、baseline HEAD `3dd9ec3281bec0419f80b993300d7ca6672718b9`；22 manifest assets/23 files；19 P0 页；PASS — READY FOR HUMAN VISUAL REVIEW | 数量、当时映射和四个 no-media 选择；不是权利/视觉最终批准 |
| [Bomb Farm 人工视觉材料](../../../gameweb/game_bombfarm_v2/docs/V2_1_HUMAN_VISUAL_REVIEW_EVIDENCE.md) | 同一历史 baseline/日期的截图材料索引，问题仍未签署 | 材料准备与审核完成的区别；没有确认历史 /tmp 图片当前存在或重新审看 |
| 两项目当前 Inventory 引用入口 | [WoG Inventory](../../../gameweb/game_warofgenesis/src/data/page-inventory.json)、[Bomb Farm Inventory](../../../gameweb/game_bombfarm_v2/src/data/page-inventory.json) | 2026-10-06 只读取确认下面 Page ID 存在；没有评估其当前发布/事实/构建 |

早期 BLOCK、后续集成报告和待人审材料不能互相覆盖。历史严重度保留在历史报告；新的 V2.7 适用性与 severity 由唯一 Contract 另作评价，不回改旧 P2 为已验收的新 P1。

## WoG 四类映射

| Example | 历史依据/问题 | 适配问题 | 工作表位置 | 依赖 | 正确处理 | 禁止推导 |
| --- | --- | --- | --- | --- | --- | --- |
| WOG-01 只有 logo | 上线前报告 §5：只有 Logo 图像，没有未确认游戏截图/人物图；技术上名称/资源正常 | 仅有 brand 是否足以识别游戏？哪些页面有 MC-04 实质媒体价值？ | Player & Content、Visual、Media & Journey；采用范围引用 `home` | WS-03A/B；GI-02、VF-01、MC-04 的实际项目审核 | 记录视觉来源/选择缺口与逐页需求，之后在精确构建检查识别；没有依据不补截图 | logoPath 存在或可加载→GI/VF 全部完成；历史报告未做最终 GI-02 结论不能冒称其已明确 FAIL |
| WOG-02 分享媒体缺失 | 上线前报告 §2：OG title/description/url 正确，无 og:image，Twitter 为 summary | indexable 页的真实分享视觉从何处取得？ | Media & Journey、Review & Evidence；Adoption Identity引用原 Inventory | WS-03C 依赖 03B；SEO-02 | 暴露分享媒体缺口及来源/权利边界，引用现有 Manifest/getShareMedia/SEO及实际采用证据 | SEO title 存在→分享媒体完成；在04A现在发明 ogImage 字段 |
| WOG-03 标题承诺与答案落差 | 上线前报告 §2/§4：Builds/Best Items 主要是定性框架，存在承诺深度风险；当前引用 ID `hub.builds`、`market.best-items-to-sell` | 玩家期待具体配装/排行榜，现有证据能支持什么？ | Player & Content：承诺/实际答案分开；Media & Journey：原当期来源引用 | CU-01、DS-01 的方法/实际内容；WS-05/07 | 选择收窄承诺、获取事实或阻塞，记录负责人；提供有依据的判断流程和下一步 | 页面存在、关键词覆盖→任务答案通过；编物品/排名/价格补齐承诺 |
| WOG-04 主体/法律未完成 | 上线前报告 §1/§2：Privacy/Terms draft、真实主体和联系/纠错未落实；引用 `privacy` 及原 legal 记录 | 适配能否把主体/法律声明当主题文案补齐？ | Adoption Identity、Review & Evidence；原合法激活机制引用 | TL-01、TL-02、PP-02；WS-07 实际主体/行为审核 | 明确有依据的责任人和决定，保持阻塞/未评估；不在方法表激活 legal | 主题完善/构建通过→可以上线；虚构邮箱/组织或删除警告隐藏缺口 |

## Bomb Farm 四类映射

| Example | 历史依据/问题 | 适配问题 | 工作表位置 | 依赖 | 正确处理 | 禁止推导 |
| --- | --- | --- | --- | --- | --- | --- |
| BF-01 权利未决 | 视觉缺口报告 §6/§8：官方 screenshot/key art 候选及 source 已找到，早期 DO-NOT-USE/RIGHTS-UNCLEAR、最终权利阻塞 | 候选存在和权利决定如何分开，谁对使用范围负责？ | Media & Journey：原媒体决定引用；Review & Evidence：权利/语义责任与审核 | MC-02、MC-03、MC-04；现存 media lifecycle及媒体接口引用 | source 存在不等于批准；保留既有 VERIFIED/UNRESOLVED/HUMAN RISK ACCEPTED/NOT REQUIRED FOR EMBED、APPROVED/WAIVED/PENDING 等原义。风险接受/豁免须有适用条件、授权范围、负责人/reviewer、理由、证据和当前项目/构建；模板不生成状态 | 非 VERIFIED 一概改为 BLOCK；或 HUMAN RISK ACCEPTED/WAIVED→权利 VERIFIED、Contract PASS、P0/P1 发布例外；早期阻塞证明当前永远阻塞 |
| BF-02 22 资产/23 文件 | V2.1 增补 §3/§5：22 assets、23 files，含本地视频/poster；技术集成报告不是逐页需求与人工完成 | 资产总量怎样与玩家任务的需求覆盖分开？ | Media & Journey、Player & Content；采用范围引用 `home`、`guide.how-to-play` | MC-04、MC-05；WS-03B/05/07 | 数量只说明历史 inventory；分别检查每个核心页需求、语义、权利、视频选择与构建审核 | 资产达到数量阈值→媒体/产品 PASS；复制历史媒体到新 Starter |
| BF-03 四个 no-media 选择 | V2.1 增补 §5：Codes、Tools、System Requirements、FAQ 为 intentional no-media；当前读取确认 ID `guide.codes`、`hub.tools`、`guide.system-requirements`、`faq` | 没有媒体时如何保证任务完整，而非只写“无图合法”？ | Player & Content、Media & Journey：完整 no-media 理由/布局/下一步 | MC-04、MC-05；实际 Pattern 在05，项目审核在07 | 这些是历史决定形式样本；新采用重新绑定 Page ID/源/构建/理由/审核；按任务说明直接答案、层级/检查单/来源/后续路径，无空槽 | 四条历史选择自动成为 V2.7 APPROVED；有用但未得媒体伪装为 NO MEDIA NEEDED |
| BF-04 材料已准备但未签署 | 人工视觉材料 Review State/Final State：READY FOR HUMAN VISUAL REVIEW；问题仍待回答 | 文件或截图存在是否等于人工结论？ | Adoption Identity、Visual、Review & Evidence：原 evidenceStatus/outcome 记录引用 | GI-02、VF-01/02、PA-01；WS-06B/07 | 核对材料范围和当前构建后取得实际审核；未签署就保留未决，记录缺项，不自动代填 | technical integration＋截图索引→视觉/权利 PASS；旧 screenshot 或旧日期自动审新 build |

这八条都是 HISTORICAL EXAMPLE ONLY；其“正确处理”是方法期望，不是已执行修复、批准或采用结果。

## 五案例能力如何进入方法，保持各自证据范围

依据[五个本地模式审计](../../5_SITE_PATTERN_CAPABILITY_AUDIT.md)及[四站原站观察/未取得项](../../LIVE_SITE_VALIDATION_2026-10-01.md)。本轮只读已存记录，不作新市场调研或商业成功判断。

| 案例输入 | 可提炼的方法问题 | 必须保留的边界 |
| --- | --- | --- |
| VV | hub/分类入口与对象决策路径，相关目标有效性 | CSS art 不是 gameplay 媒体；本地测试被查看不等于本轮重跑 |
| Farever | 视觉证据→字体/形状/密度/氛围选择 | 只取本地候选；原站未取得，不能下市场判断，也不能默认紫/金/衬线 |
| Gamble With Your Friends | 任务问题→快速答案→步骤/决策→下一步 | 插画不冒充游戏截图；问题型意图不等于已实现 Pattern |
| Mini Wars | 主题/标签相关性与移动交互需求 | 静态 online/latest 不是实时数据；关系仍需任务相关性审核 |
| Bomb Farm 参考模式 | 媒体文章、目录、FAQ、相关阅读的需求选择 | 提炼版 fictional SVG 不是真实项目媒体；原站 TOC 滚动仍待复测，广告布局不证明收入 |

实际两项目和参考站的不同身份不合并：`game_bombfarm_v2` 的项目报告、`temp5` 本地模式和外部 Bomb Farm 观察各自承担不同证据义务。
