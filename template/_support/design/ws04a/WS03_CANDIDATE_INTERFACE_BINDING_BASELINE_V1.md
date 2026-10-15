# WS03 接口引用基线 V1

更新：2026-10-08。用途：WS04A人工方法引用的既有authority与consumer参考，不是Game Adaptation运行契约，不创建schema/config/type/字段。选择理由写在[5块工作表](GAME_ADAPTATION_DECISION_WORKSHEET_V1.md)，技术值仍由原文件持有。

2026-10-08治理事实引用：[Consolidated WS03 TECH Review的post-repair结果](../../codex/verifications/v2.7-ws03/CONSOLIDATED_WS03_TECH_REVIEW_V1.md#post-repair-independent-diff-review--2026-10-08)为 **WS03 — ACCEPT — TECH / CLOSED**；[原样修复diff](../../codex/verifications/v2.7-ws03/LIVESTATUS_REMOVAL_IMPLEMENTATION_DIFF.patch)记录13文件范围内的修复。本文不再把iteration33源当当前工作树身份。当前状态authority仍是[PROJECT_STATE](../../PROJECT_STATE.md)、[TASK_LEDGER](../../roadmap/V2.7_TASK_LEDGER.md)及正式Review，不由本文新增裁决。

Safari / WS06A不阻塞WS04A / WS05的非浏览器工作；AX、assembled/WS06B、PRODUCT/RELEASE及真实Safari证据仍保留独立gate。本参考不关闭WS04A，不启动WS05，也不推导游戏识别、权利、人审或真实采用完成。

## 9个既有authority与consumer

这些入口沿用[盘点](../../codex/verifications/v2.7-ws04a/WS04A_BINDING_INVENTORY_V1.md)的所有权；source/Provenance是嵌在原数据中的共享语义，不是新来源registry。工作表只持决定、理由及精确引用，不复制运行值或规范结果。

| 既有authority | 原输入 / 当前consumer | 工作表只引用 |
| --- | --- | --- |
| SOP唯一Product Contract | [canonical文档](../../../Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md)持41能力语义、适用性、严重度和例外；原规范/审核使用 | 规范及原审核记录；无第二Registry/outcome |
| Page Inventory | [src/data/page-inventory.json](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/page-inventory.json) → [src/data/schemas/page-inventory.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/page-inventory.ts) / [src/core/site-data.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/site-data.ts)；catalog/路由/导航/featured/related/SEO使用原页记录 | Page ID/记录位置；不复制route/发布/索引/title/日期/关系数组 |
| game.config.ts | [game.config.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/game.config.ts) / [src/config/schema.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/config/schema.ts) → siteConfig/catalog/导航/homepage/BaseLayout；features.search是唯一搜索技术开关 | 选择理由及原配置位置；不另设enable/brand/navigation/visualRoles输入 |
| semantic theme tokens / theme.css | [src/styles/theme.css](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/styles/theme.css) → [src/styles/global.css](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/styles/global.css) /组件CSS；[src/core/theme-roles.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/theme-roles.ts) → [src/layouts/BaseLayout.astro](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/layouts/BaseLayout.astro)的data-theme-* | 游戏依据及原样式选择；不造第二token/主题系统 |
| content | [src/content.config.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/content.config.ts)的pageId/FAQ和原MD/MDX → [src/pages/guides/[...slug].astro](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/guides/[...slug].astro)及[src/components/wiki/FAQ.astro](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/FAQ.astro)；meta/news同样渲染原内容 | 实际答案/段落/来源位置，不复制全文或另建术语输入 |
| facts | [src/data/schemas/facts.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/facts.ts) / [src/core/fact-loader.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/fact-loader.ts) → entity路由/[src/components/EntityDetail.astro](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/EntityDetail.astro)；现有条件consumer，Candidate实体模块关闭且无真实JSON事实 | 原事实/分类/patch/updatedAt/source记录，不复制值 |
| tool definitions | [src/data/schemas/tools.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/tools.ts) / [src/core/tool-loader.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/tool-loader.ts) → [src/components/ToolShell.astro](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/ToolShell.astro)；现有条件consumer，Candidate工具模块关闭且无真实JSON定义 | 原定义/公式/patch/source记录，不建第二版本authority |
| Media Manifest | [src/data/media/media.json](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/media/media.json) / [src/data/schemas/media.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/media.ts) → [src/data/media/catalog.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/media/catalog.ts) /媒体renderer/分享SEO；Candidate当前assets/pages为空 | 原asset ID/映射和选择理由，不复制URL/尺寸/credit/poster/equivalent/share值 |
| sources / Provenance | [src/data/schemas/provenance.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/provenance.ts)约束原数据中的sourceUrl/type/accessedAt等 → [src/components/wiki/Sources.astro](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/Sources.astro) / [src/core/freshness.ts](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/freshness.ts) | 原source记录及语义，不另存访问/复核日期或私有evidenceNote |

项目唯一媒体决定表仍是原权利/lifecycle记录。[media-readiness.ts]查找`docs/MEDIA_DECISION_TABLE.md`或根目录同名文件，只允许一个；[validate-site.ts]读取/投影原表。Candidate当前两处均缺席，表缺席或parser无错误不等于MC-04覆盖、人审或使用批准。工作表不补造这张表，也不创建第二生命周期authority。

## 03A — 语义主题角色

semantic CSS/design tokens是持久呈现面；visualRoles仅optional preset/compatibility helper。现有resolveVisualRoles/DEFAULT_VISUAL_ROLES和BaseLayout使用原配置，当前配置省略该选项并使用默认值。严格选项不扩张为长期Game Adaptation模型，不新建视觉枚举、genre mapper或主题引擎。有游戏来源也仍需contrast/focus/motion/响应和游戏识别人审。

## 03B — 媒体、尺寸、来源与视频等价

原media schema持dimensions、rightsRef、sourceUrl、可选credit和video.accessibleEquivalent；原catalog和[media-presentation.ts]投影供GameMedia/VideoEmbed/ScreenshotGallery使用，不公开私有权利证据。rightsRef或来源URL不是批准。未映射页可无hero/trailer、空gallery；unknown Page ID/重复ID/槽位类型由原验证处理，不能用方法记录使其有效。本次不改provider/fallback，也不从空Manifest推导逐页需求完成。

## 03C — 同一 manifest 的分享图

原getShareMedia按explicit share→有信息性alt的hero→defaultShare→undefined；[seo.ts]与BaseLayout从同一媒体authority输出OG/Twitter。share/defaultShare不属于Page Inventory，不另造ogImage/twitterImage/socialImage资产库。Resolver返回undefined不豁免final indexable输出要求；真实媒体使用/权利/产物仍依实际项目审核。

## 03D-search — provider seam 与技术开关

features.search唯一控制技术启用；[SearchIsland]使用[search-state.ts]的query/results/empty/error状态和[pagefind-search-adapter.ts]。玩家任务/corpus和启停理由是人工决定，不是第二enable开关、provider registry或backend config。现有query规范化、竞态与索引行为保持原实现；实际查询质量需真实采用核验。

## 03D-freshness — publication / update / source / version

原pageInventoryEntrySchema保留publishedAt/updatedAt/sources，验证updatedAt >= publishedAt。原Provenance.accessedAt是来源访问；latestSourceAccessedAt取max(accessedAt)，resolvePageFreshness投影为sourceCheckedAt，不冒充verifiedAt，不返回私有evidenceNote。Fact/Tool仍持patch/updatedAt；publication、update、source访问及patch/version不能合并。

VersionContext的kind=patch/version与value接口保留；当前[EditorialArticle]和[WikiArticle]生产调用只传page，未传versionContext；显式versionContext传参目前在测试中，不能声称已全面接入生产。EntityDetail/ToolShell仍呈现原patch/updatedAt。原日期不得为迁移交换或自动改今日；泛化实时状态已延期移出Active Core，不新增替代模型。无依据Live/Popular/Trending不输出；Latest updates依据原updatedAt排序，不证明实时或已验证。

## 来源与证据范围 — iteration33 historical snapshot

以下指纹只标记[iteration33三件套身份](../../codex/executions/v2.7-ws03d/iteration33/triad-post-identity.json)，**不是当前workspace identity**。HEAD相同不能证明含未提交修订的工作树相同；不为本次文档简化重算全树fingerprint。

| 工件 | iteration33历史working-tree SHA256 |
| --- | --- |
| Starter | `bad380b772c3e0f0f2a047805b2897de3cf28a7717827b4c55b94e74345bf1f1` |
| SOP | `cf2a82a592c3acee5a244a1422d649b76d2eb6ed9f0e48bca722105ec83408ab` |
| Master Prompt | `ceae58a4fbbcb0994e0f392074e961e1b3773070307fa485a2ea53af2c0560f1` |

历史独立切片记录：[REVIEW27](../../codex/executions/v2.7-ws03a/iteration27/chatgpt-independent-review.md)、[REVIEW29](../../codex/executions/v2.7-ws03b/iteration29/chatgpt-independent-review.md)、[REVIEW30](../../codex/executions/v2.7-ws03c/iteration30/chatgpt-independent-review.md)、[REVIEW31](../../codex/executions/v2.7-ws03d/iteration31/chatgpt-independent-review.md)、[REVIEW33](../../codex/executions/v2.7-ws03d/iteration33/chatgpt-independent-review.md)保留原时间/源及继续演进范围，不代替post-repair正式记录。

[iteration33审计](../../codex/executions/v2.7-ws03d/iteration33/continuation-audit.json)中的859产品测试、78定向断言、fresh47的37 PASS / 10 WebKit FAIL、40条残留及Chromium/Firefox各40/40均为**当时快照**，不是本次新验证或当前运行值。iteration32 FAIL、Safari缺口、旧日志/identity和archive均不改写。实际采用绑定其自己的源/build及签署证据，不继承这些数字为当前PASS。

## 给 WS04A 的交接

用[引用指南](WS03_INTERFACE_DEPENDENCY_LEDGER_V1.md)和[使用说明](WS04A_BINDING_READINESS_V1.md)引用原输入、记录理由/缺项，不新增适配模型。方法/文档审查不自动裁定VF/MC/SEO/IA/FR能力、人审、真实采用或release。

[media-readiness.ts]: ../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/media-readiness.ts
[validate-site.ts]: ../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/validate-site.ts
[media-presentation.ts]: ../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/media-presentation.ts
[seo.ts]: ../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/seo.ts
[SearchIsland]: ../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/islands/SearchIsland.tsx
[search-state.ts]: ../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/search-state.ts
[pagefind-search-adapter.ts]: ../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/pagefind-search-adapter.ts
[EditorialArticle]: ../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/EditorialArticle.astro
[WikiArticle]: ../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/WikiArticle.astro
