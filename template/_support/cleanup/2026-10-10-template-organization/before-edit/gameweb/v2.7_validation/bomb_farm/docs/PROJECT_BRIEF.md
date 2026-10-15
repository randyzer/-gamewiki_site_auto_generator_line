# Bomb Farm — V2.7 adoption brief (BF-R1)

日期：2026-10-09 Asia/Taipei。依据：ChatGPT PLAN63 / REVIEW62；执行：Codex。状态：DOCUMENTATION-ONLY ADOPTION /Users/randyz/work/coding/hot_words_web；准备文档2份，无可运行采用实例、无新页面、无新构建。最终 adoption=0/3。

## 三种现场必须区分

1. 原站 `[gameweb/game_bombfarm_v2](/Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2)`：保留原 main/HEAD `ca0ff836746749c7d9d2fb765f740a273e806cf5` 和 dirty状态；旧三件套和素材不是当前采用身份。
2. 已接受的有限 V2.7双游戏证明：[proof-v2 package](/Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-two-game-proof/proof-v2/PROOF_REVIEW_PACKAGE.md)；BF代表 home/how-to-play。现存源码 `/private/tmp/v2.7-two-game-proof-v2/bomb-farm`；长期保留 input diff/outputs。它是 evidence-purpose、不是最终采用或 release；原失败和历史报告不改。
3. 本目录 `gameweb/v2.7_validation/bomb_farm`：本轮仅 docs/RESEARCH_SOURCES.md + docs/PROJECT_BRIEF.md。没有 Core/bootstrap/package/Content/Inventory/Manifest。不得因为目录存在就声称采用站点已经建立。

## 准确的三件套绑定

| Authority | Existing candidate | Exact identity |
| --- | --- | --- |
| Starter | `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE` | branch v2.7/evolution; HEAD b067e8d4050478072f25a1dc78a8526cdd128cfd; tree1df0ade30b1eaf51a76820c8d8b83337786f0dc1; tracked binary-diff SHA2567e88479dde6d1815b6ac4e8f27365aab3b402f2925d819b893e5bb59f02163e7。身份包含已审 tracked changes与 untracked freshness/media-presentation/pagefind-search-adapter/theme-roles，不能只凭 HEAD。 |
| SOP | `Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE` | branch v2.7/normative-foundation; HEAD9a13b7314b9cb102b0c440d9677ab22400109e8f; tree e485499deac3dafea83391000d9cfa6e37d4a0c3; docs/NEW_GAME_SITE_SOP_v2.7.md SHA2564915eb7b1dcc00b2a36e1b0f297ae58231090167ac819f2f7d84f027fa1641d2。包含未提交 Candidate 文档。 |
| Canonical Contract | SOP `docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md` | SHA2561ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c；41 capability意义不变。 |
| Master Prompt | `Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE` | branch v2.7/normative-foundation; HEADf655a0e08529060be8b716330ffcecf489a4484d; tree6adc7107c498459ed92696cb189cfc1ec9915258; untracked CodexMasterPrompt_v2.7Candidate.md SHA256d11c08b355fb006dbf34f0cfec84c22b45dc9a1f671ece8dd9b6a4dafc98a28a; CONTRACT_REFERENCE.json SHA256662469504c0ff31ba4119f815387d66a304b90f582b9405c8eb5f1b7cbaed201。 |

这些文件本轮均未修改；精确绑定及需重核的相关文件也见 [WS07 accepted readiness plan](/Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws07/WS07_THREE_PROJECT_ADOPTION_PLAN_V1.md)。未来构建须记录同一 Core与新项目输入/输出身份；本轮没有 output identity。无每游戏 fork，无新 adaptation/Pattern runtime contract。

## 一个真实玩家任务

Target pageId：guide.how-to-play；route：/guides/how-to-play/。
玩家问题：如何理解矿场推进，并知道下一次应检查哪个队伍或成长系统？

Supportable answer: Observe mine progress, inspect team choices and relevant upgrades; the official listing supports those systems, not optimal action timing.

事实仅引用 [本次来源记录](RESEARCH_SOURCES.md)，不在简报里建立另一个事实/schema authority。编辑步骤、结果/完成判断、必要恢复和人工后续动作使用普通 MDX。禁止定时器、最优轮换、保证解决卡关、节点路线、投资/交易收益或 unsupported build/ranking 承诺。

## 下一次可见改动与既有 consumer

下一有限切片应创建采用实例并对已有 how-to-play 做实质但小范围更新：显示本次真实 source-checked 日期，将下一次检查指向当前有依据的队伍角色/成长系统，区分编辑建议与官方事实，保留不确定性和原图的“非 UI、非周期”解释。**本轮未实施该可见改动**；具体文字和文件清单由下一独立计划决定。

既有 Core consumer：[guides route](/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/guides/[...slug].astro) → [WikiArticle](/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/WikiArticle.astro) → MDX slot/headings + FAQ/RelatedPages/Sources；[freshness resolver](/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/freshness.ts) 提取日期/来源语义。没有专门 QuickAnswer/Steps/NextStep组件需求；RelatedPages不能冒充任务下一步。

以后只改既有 project inputs，不将这两份准备文档变为 runtime data。Page Inventory保持 page truth/route/publication/sources；Content保持正文；game.config保持站点/导航/features；theme保持语义值；Facts与Media Manifest仍各自唯一。媒体决定与搜索/freshness引用现有 authority，不复制模型。publishedAt/updatedAt/source accessedAt→sourceCheckedAt/versionContext和patch/version separation保留；liveStatus不恢复。

## 媒体、身份、法律与广告

- 现有原创图和两页媒体决定来自冻结证明；可有限复用的依据是原创记录，不是官方素材许可或 Human接受。本轮没有复制或审核它们。旧22素材及本地视频不批量迁移。
- 官方截图/视频权利仍未解决；第三方图不抓取。Human semantic/visual/rights=PENDING。视觉识别仍遵守遮去logo/name/title后凭真实game-specific evidence识别，不用颜色替代证据。
- 沿用已记录的独立 fan-site定位和 canonical意图；实际 operator、编辑政策、隐私和第三方集成必须与新构建一致，由负责方审查。没有虚构 contact identity，也不复制旧 bespoke legal Core覆盖。
- 本轮未启用 analytics/ads/provider/network集成；旧 Google Analytics/Adsterra文案和旧403不能继承。后续广告适用性、预留/遮挡与provider证据单独审核；no-op/offline reference证明不等于实际广告PASS。

## 验收与STOP

后续采用 setup/Content delta/build须分别有限计划并独立审查；不可把整棵 Starter拷贝伪装成两个输入文件。缺失来源、权限、额外文件或通用Core缺口时STOP，并记录事实，不补虚假内容或新框架。

本轮 Product Code Delta=0；Test Code Delta=0；无 product tests/build/browser evidence；只是第一手来源读取和两文档准备。WS03/04/05已接受边界不扩张；WS06A未关闭、WS06B和完整REF-A/B/C未接受。最终WS07前置和逐项目精确构建/浏览器/required Human gates保留；Safari真实键盘0、AX-01/AX-03未充分证明。PROJECT-BOMBFARM最终采用NOT ACCEPTED；WS07=0/3；WS08/Global PRODUCT/RELEASE=NOT ACCEPTED。
