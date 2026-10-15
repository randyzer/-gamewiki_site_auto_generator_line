# WS-03 接口引用指南 V1

更新：2026-10-08。用途：Project / Adoption Method引用指南，沿用原文件路径。技术owner/consumer见[接口参考](WS03_CANDIDATE_INTERFACE_BINDING_BASELINE_V1.md)，方法步骤见[方法](GAME_ADAPTATION_METHOD_V1.md)，决定写入[5块工作表](GAME_ADAPTATION_DECISION_WORKSHEET_V1.md)。没有新适配schema/config/type、运行字段或Pattern ID。

| 决策位置 | 既有authority / consumer | 只记录的决定 | 真实采用仍需核对 |
| --- | --- | --- | --- |
| Adoption Identity | 原项目源/build及三件套/Contract记录；Inventory Page ID | 采用范围与精确身份引用 | 当前源/构建适用性；旧指纹仅历史，不能用HEAD推导同源 |
| Player & Content | Inventory.title/pageId、content/FAQ、facts；原路由/正文/FAQ消费者 | 玩家问题、术语理由、承诺与答案差距、自由文本desiredPatternIntent | 事实/来源足够、真实答案能兑现承诺；unknown/disabled/draft不能由表激活 |
| Visual | theme.css tokens、game.config品牌/optional visualRoles；theme resolver/BaseLayout/CSS | 游戏证据→选择理由、实际风险 | 游戏识别与可用性人审；不另存主题值或扩张visualRoles |
| Media & Journey：媒体/视频/分享 | 原Manifest/媒体catalog/renderer/getShareMedia/SEO；唯一项目媒体决定表 | 四类价值、need/no-media、视频用不用、选图理由与原决定引用 | 使用范围/权利/语义、实际播放/等价内容、完整无媒体答案、final输出；表缺席不是覆盖完成 |
| Media & Journey：搜索/下一步 | game.config.features.search、Inventory.relatedPageIds；SearchIsland/索引/getRelatedPages | corpus/玩家任务与启停理由、下一步为何有用 | 原开关与决定一致、目标有效且有用、真实查询质量；不建第二enable/route |
| Media & Journey：日期/版本 | Inventory.publishedAt/updatedAt/sources、Provenance.accessedAt、Fact/Tool.patch/updatedAt、原freshness投影 | 原证据的语义引用；不复写日期/版本值 | updatedAt >= publishedAt；accessedAt→sourceCheckedAt不是verifiedAt；patch/version分离，VersionContext不冒称全面生产接入 |
| Review & Evidence | 原技术/事实/权利/视觉/独立审核记录及唯一Contract | 实际责任、证据引用、未决和复查触发 | 新源/build/资产/版本/授权变化不能继承旧签署；不复制outcome或代签 |

使用时先定位原文件/记录，再说明一条选择理由；已有同一决定只引用一次。发生真实缺失或冲突时集中写Review & Evidence，不把每个栏目转成字段、重做逐字段reconciliation或要求Core迁就早期方法。自由文本组合意图没有runtime consumer，不要求04A先有WS05实例；Pattern运行输入须出现真实consumer后另行评估。

当前状态与条件只由[PROJECT_STATE](../../PROJECT_STATE.md)、[TASK_LEDGER](../../roadmap/V2.7_TASK_LEDGER.md)、[正式WS03 Review](../../codex/verifications/v2.7-ws03/CONSOLIDATED_WS03_TECH_REVIEW_V1.md)及[Amendment](../../architecture/V2.7_ARCHITECTURE_SIMPLIFICATION_AMENDMENT_V1.md)持有。Safari/WS06A不阻塞WS04A/WS05非浏览器工作；AX、assembled/WS06B、PRODUCT/RELEASE仍需其独立证据。不增加运行契约冻结gate，不启动WS05或裁定workstream关闭。

历史方法/接口整理见[iteration18审查](../../codex/executions/v2.7-ws04a/iteration18/chatgpt-independent-review.md)、[iteration34计划](../../codex/prompts/v2.7-ws04a/iteration34-interface-consolidation-plan.md)与[原台账preimage](../../codex/executions/v2.7-ws04a/iteration34/preimages/template/design/ws04a/WS03_INTERFACE_DEPENDENCY_LEDGER_V1.md)。这些是各自时间的证据，不是当前接口缺失或全树身份声明；旧记录逐字保留。
