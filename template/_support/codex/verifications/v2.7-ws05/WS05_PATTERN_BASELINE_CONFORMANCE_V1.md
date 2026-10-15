# WS05 Pattern Baseline Conformance V1

日期：2026-10-08（Asia/Taipei）。Owner：Codex / technical verification。
模式：READ ONLY / VERIFICATION ONLY。唯一新增产物：本文。
依据：[已接受Minimal WS05 Pattern Design V1][design]及[修正后的Existing Pattern Inventory][inventory]；设计接受依据为本轮用户明确说明，未修改原设计的历史提案状态。

## 1. 结论与验证口径

**WS05 PATTERN BASELINE CONFORMANCE: PASS。**

当前既有Starter有足够的源码能力，让真实项目使用现有目录、文章正文与媒体调用链表达三个首批Pattern的最小职责，**无需新增Pattern framework或产品功能代码**。项目仍需提供真实且符合原authority规则的内容、页面记录与媒体；本轮没有填写这些数据。

这是**SOURCE-BASED MINIMAL TECH CONFORMANCE**：逐条对照已接受设计，读取真实组件、消费者、resolver/schema、MDX配置及已安装处理器代码，并执行只读源码链/搜索核对。不是build成功、测试通过、视觉/键盘/播放验证或产品采用结论。不借用旧测试数字，不创建测试或验证框架。

| Pattern | Minimal Contract Technically Supported? | Existing Base | Missing TECH Capability | Requires New Code? | Product Proof Still Missing? |
| --- | --- | --- | --- | --- | --- |
| Wiki / Hub | **YES** | guide hub route、PageCollection、WikiCategories、EntityDatabase、BaseLayout、enabled catalog/navigation | **NONE within accepted minimal contract**；不需要统一Hub wrapper | **NO** | **YES**：真实游戏目录范围、入口有用性及玩家可达性尚未证明 |
| Task Guide | **YES** | guides render(Content/headings/faq) → WikiArticle MDX slot；TOC、FAQ、RelatedPages、Sources | **NONE within accepted minimal contract**；专门QuickAnswer/Steps/NextStep组件仍不存在，但最小正文表达不依赖它们 | **NO** | **YES**：真实玩家问题、答案正确性、步骤可执行、完成判断/恢复/后续行动尚未证明 |
| Media-rich Article | **YES** | WikiArticle、Media Manifest / mediaCatalog、GameMedia、ScreenshotGallery、VideoEmbed、media-presentation | **NONE within accepted minimal contract**；不包含任意媒体穿插布局，也不要求EditorialArticle具备同等媒体接入 | **NO** | **YES**：Manifest当前0 assets / 0 page mappings，没有本轮真实游戏媒体文章采用证据 |

“Requires New Code? NO”只适用于已接受最小设计，不表示不用写真实项目内容或配置原数据，也不表示任何任意页面类型都能自动切换组合。比较、自动推荐、任意block穿插等不在此contract内。

## 2. 当前source identity与输入事实

- Starter：`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`。
- Branch：`v2.7/evolution`。
- HEAD：`b067e8d4050478072f25a1dc78a8526cdd128cfd`。
- HEAD tree：`1df0ade30b1eaf51a76820c8d8b83337786f0dc1`。
- 读取对象为当前含未提交修改/未跟踪文件的工作树。HEAD/tree只标记Git基线，不等同完整工作树指纹或CLEAN状态。
- [game.config.ts][gameconfig]启用guides/search；实体、meta/news、工具家族默认关闭。getting-started是Starter操作说明，不是游戏玩家任务proof。
- [Manifest][manifest]实际内容为assets=[]、pages=[]。因此媒体链只能证明 **TECHNICAL CAPABILITY EXISTS**，不能证明 **REAL GAME MEDIA-RICH ARTICLE ADOPTED**。
- 本轮没有添加页面、正文、FAQ、事实、媒体或新的字段；原pageType和content schema不变。

## 3. Wiki / Hub核对

```yaml
TECHNICALLY SUPPORTED: YES
```

| 最小职责 / 检查项 | 实际source与consumer | 核对结果 / 边界 |
| --- | --- | --- |
| 理解目录范围 | [guide hub route][guidesroute]的hub分支，行44起，渲染page.title/description | 已有范围intro输入与呈现；说明是否对游戏玩家有用仍属内容proof |
| 进入至少一个有效内容入口 | 同route行66起的guidePages.map及href=guide.route；[optional-routes][optionalroutes]从enabled catalog选择guides | 当前已有hub.guides → guide.getting-started源码调用与输入，不需要新wrapper；这篇是Starter说明，不是商业游戏入口有用性证明 |
| 卡片/列表集合 | [PageCollection][collection]，行24起；[index][home]调用多组集合 | 已有title/description/route呈现，空集合隐藏；不另建集合authority |
| 分类入口 | [WikiCategories][categories]，行11起；index调用 | 已有page数组分类卡片，不表示存在通用taxonomy引擎 |
| 对象目录查询 | [EntityDatabase][entitydb] → EntityFilterIsland；[heroes route][heroesroute]及weapons/items/maps同族消费者 | 原facts转rows，具备分类/排序/详情链接；默认关闭且无实际facts，本次只确认条件consumer能力 |
| 全站框架 | [BaseLayout][baselayout] → Header / Footer / slot | 已有共享导航与页面shell；不新增generic Hub wrapper |
| 启用目录与导航边界 | [catalog][catalog]筛选public/published/features及legal eligibility；[site-data][sitedata]解析navigation，拒绝缺失enabled page引用；[Header][header]消费解析后分组 | 目录入口继续依原发布/配置authority；不由Pattern重新生成路由或决定发布 |

满足最小职责可使用guide hub或既有首页集合，无需所有Hub同时拥有分类、表格、hero、FAQ或TOC。没有真实入口的空目录不算完成产品职责，但数据缺席不是需要新增Pattern runtime的证据。

## 4. Task Guide核对

```yaml
TECHNICALLY SUPPORTED: YES
```

### 4.1 真实正文调用链

[astro.config.ts][astroconfig]显式启用mdx()。[content.config.ts][contentconfig]以glob读取MD/MDX，frontmatter为pageId与可选faq；[page-resolution][resolution]匹配Inventory/contentRef。[guides route][guidesroute]行22–35读取/解析文章，行87–93把rendered Content放入WikiArticle并传headings/faq。[WikiArticle][wiki]行135以普通prose slot呈现Content。

进一步读取当前已安装的[MDX integration][mdxintegration]：其默认处理器为satteri()，通过[processor][mdxprocessor]的createMdxRenderer进入[MDX processor implementation][mdximplementation]，调用mdxToJs处理正文、收集headings并输出MDX Content代码。当前配置没有提供改变基础语法的自定义处理器/插件。此处确认普通MDX渲染能力与接入，不编译新内容、不把未使用的另一处理器当作本项目运行链。

| 任务内容 / 模块 | 现有表达方式与source | 支持？ | 专门组件存在？ / 未证明事项 |
| --- | --- | --- | --- |
| 明确玩家问题与必要条件 | Inventory标题/描述 + 原MDX正文段落/heading → WikiArticle | YES | 没有任务schema；真实问题是否正确需作者/项目核验 |
| 正文开头直接回答 | MDX首段经既有Content/slot显示；不必借QuickFacts | YES | **QuickAnswer component: NOT PRESENT**；普通答案段落不等于新增组件 |
| 操作步骤或选择依据 | 原MDX heading / ordered list / prose；当前[getting-started][guidecontent]已有4个编号H2顺序段落 | YES | **Steps component: NOT PRESENT**；本轮不编写步骤，不证明游戏操作可执行 |
| 结果 / 完成判断 | 普通正文说明结果、条件或检查方法 | YES | 不是自动任务状态系统；当前没有真实任务结果proof |
| 必要时恢复说明 | 原正文paragraph/heading/list | YES | 没有自动恢复逻辑；由作者提供有关内容，不新增字段 |
| 必要时人工Next Step | 原正文paragraph/link写明条件、动作与目标 | YES | **NextStep component: NOT PRESENT**；不由Related列表/优先级推断推荐 |
| TOC | route传rendered.headings；[heading helper][toc]筛H2/H3；WikiArticle行49–50/120–133生成锚点 | YES | 现有嵌入能力，至少2项才显示；没有独立TOC或scrollspy保证 |
| FAQ | content.config可选question/answer；route传faq；[FAQ][faq]按items渲染details/summary | YES | FAQ组件存在；当前默认MDX没有faq输入，不等于已采用FAQ |
| Related | getRelatedPages基于原enabled catalog；[RelatedPages][related]呈现链接 | YES | Related存在且可复用；不等于task-oriented Next Step |
| Sources | [Sources][sources]投影page.sources与sourceCheckedAt | YES | 来源公共呈现存在；不宣称verifiedAt或人审已完成 |
| 媒体 | WikiArticle原mediaCatalog映射与条件renderer | YES | 当前Manifest空；Task Guide不强制媒体 |

**Pattern capability supported by ordinary content**与**dedicated component exists**明确分开。最小直接答案、步骤、结果、恢复和人工后续动作都是作者可用原正文表达的内容；它们没有新增runtime字段，也不因为可表达就把专门组件改判为存在。

“正文开头”指文章Content的首段；WikiArticle已有可选hero在正文前。这不构成任意模块排序能力，也不要求为了答案新增slot。实际游戏是否在适当位置清楚给出答案尚待proof。

[EditorialArticle][editorial]有正文/Related/Sources，但没有WikiArticle同等TOC/FAQ/媒体入口。该差异保留；最小Task Guide已有guides → WikiArticle可用，不要求本轮扩大meta/news消费者。

## 5. Media-rich Article核对

```yaml
TECHNICALLY SUPPORTED: YES
TECHNICAL CAPABILITY EXISTS: YES
REAL GAME MEDIA-RICH ARTICLE ADOPTED: NOT PROVEN
```

| 最小能力 | 真实source / consumer | 核对结果 |
| --- | --- | --- |
| 长文正文 | guides render → WikiArticle.prose slot | 普通文章内容可呈现，无新article wrapper |
| 媒体authority与映射 | [mediaCatalog][mediacatalog]解析原Manifest，按已知page ID映射hero/gallery/trailer；WikiArticle行43–48调用getPageMedia | 映射与类型解析存在；无新Pattern媒体字段 |
| Hero / Figure | WikiArticle条件hero → [GameMedia][gamemedia]image分支，figure/img/figcaption | 可以只使用有解释价值的一张图；hero是已有放置位置，不强制每篇使用 |
| Gallery | WikiArticle条件gallery → [ScreenshotGallery][gallery]，逐项GameMedia | 图片集合存在，空数组不渲染；不要求轮播或lightbox |
| Video | WikiArticle trailer → GameMedia → [VideoEmbed][video] | 本地video/YouTube固定分支、poster、controls或iframe及accessibleEquivalent呈现存在；本轮不测播放 |
| Caption / Credit / Source | GameMedia/VideoEmbed读取asset.caption与[media-presentation][presentation]的publicCredit/source | 公共投影和条件caption/credit显示存在；caption可选，可由正文解释；credit不等于rights批准 |
| TOC / FAQ | WikiArticle原headings/faq调用 | 已有条件呈现；不要求额外模块或必填数据 |
| Related / Sources | WikiArticle末尾现有组件 | 继续使用原页面关系与Provenance，不复制authority |

单图、图片集合或视频至少一种可以承载解释性媒体；它们不用同时存在。现有hero在正文前、gallery/trailer在正文后，符合已接受最小摆放边界。任意正文位置多次插入媒体不在本次contract内，本轮既不扩大该能力，也不把其缺席当作最小contract失败。

“解释性”“真实有用”“图文对应”“权利有效”需要实际内容与人审；schema和renderer不能替作者证明这些产品性质。当前0资产/0映射只能证明代码具备接入能力，不能证明一篇真实游戏媒体文章已采用。

## 6. 四个gap决策核对

| Gap | Accepted Decision | DESIGN DECISION SUPPORTED | 核对依据 | 当前专门模块状态 |
| --- | --- | --- | --- | --- |
| Quick Answer | REUSE EXISTING AS-IS | **YES** | 原MDX首段 + WikiArticle正文slot足够显示最小直接答案；无须QuickFacts冒充答案 | QuickAnswer component **NOT PRESENT** |
| Steps | REUSE EXISTING AS-IS | **YES** | MDX heading / ordered list / prose可表达顺序；现有编号H2指南已接入文章 | Steps component **NOT PRESENT** |
| Next Step | REUSE EXISTING AS-IS | **YES** | 原正文可写条件、后续动作、理由及普通链接；无自动推荐算法依赖 | NextStep component **NOT PRESENT**；Related存在，合并项仍PARTIAL |
| Comparison | DEFER | **YES** | 重新对照设计§2及§3三个Required：目录入口、答案/行动或选择依据、解释性图文均未要求独立Comparison模块 | 专门Comparison **NOT PRESENT**；实体表格不是替代证明 |

Next Step链接是普通编辑内容引用，技术route/page identity仍来自Inventory。它不自动保证目标enabled或动作适合玩家，真实采用应由作者/原项目检查确保；当前没有NextStep resolver/字段、个性化算法或完成状态推断。

Comparison延期不等于删除文章正常的选择依据：段落可解释为什么选择某个行动，最小设计没有要求新增共享比较表格。这里不设计Comparison实现，也不运行相关证明。

## 7. 隐藏Pattern runtime检查

扫描当前src文件清单、imports与路由/schema分支，并对src、scripts、game.config.ts、astro.config.ts执行：

```sh
rg -n -i 'pattern.?registry|pattern.?dispatcher|patternId|pattern.?enum|composition.?schema|pattern.?wrapper|dynamic.?component.?registry|page.?builder|WikiHubPattern|TaskGuidePattern|MediaRichArticlePattern' src scripts game.config.ts astro.config.ts
```

本轮该命令 **exit 1、stdout/stderr空：NO MATCHES**，属于未命中，不是执行错误。另读取更宽的pattern/registry/import语句命中和组件清单，避免只依赖名称扫描。

| 目标 | 当前结果 | 边界说明 |
| --- | --- | --- |
| Pattern registry | NONE | 无注册记录/解析调用 |
| Pattern dispatcher | NONE | guide route的hub/article分支是固定页面消费者，不是Pattern选择器 |
| patternId | NONE | 原Page Inventory/content未新增该字段 |
| Pattern enum | NONE | 原pageType仍为页面家族，不是Pattern enum |
| composition schema | NONE | 原各领域schema不变；不存在任意模块顺序/布局输入 |
| generic Pattern wrapper | NONE | 三个拟名wrapper均不存在；复用WikiArticle不等于新增wrapper |
| dynamic component registry | NONE | 明确import的image/video、calculator/planner等固定分支不是组件注册表；MDX Content是框架正文组件，Pagefind import是原搜索provider |
| page builder | NONE | 无任意页面组装器 |

[entity-modules.ts][entitymodules]的entityModuleDefinitions/createEntityModuleIndex/entityModuleIndex继续存在，限定heroes/weapons/items/maps的parser/routeSegment/labels；**排除于WS05 composition abstractions**，不删除、不弱化其领域作用。

其它pattern命中包括内容glob、YouTube ID及Pagefind哈希正则，不是页面Pattern。普通MDX编译器支持组件也不表示本项目新增了动态组件注册表。原主题preset及单一BaseLayout仍属于原Core。

## 8. 验证执行事实与只读范围

本轮实际执行：

- 读取设计/Inventory及所列source，逐条对照Required/Optional；读取正确配置astro.config.ts与当前MDX integration/default Satteri处理器。初次猜测astro.config.mjs读取未命中，随后以文件清单定位正确配置；该路径查找失误未造成修改，不属于TECH能力缺口。
- 只读源码链核对命令 **exit 0**，确认6组调用点：GUIDES_RENDER_CONTENT、ARTICLE_OPTIONAL_MODULE_CALLS、GUIDE_HUB_INTRO_AND_LINKS、MDX_ENABLED、ARTICLE_TOC、MEDIA_PUBLIC_PRESENTATION；实际读取Manifest得到assets=0、pages=0。
- 同一命令独立检查Pattern runtime关键词无命中；组件文件清单未发现QuickAnswer、Steps、NextStep或三个新Pattern wrapper。结合实际imports/schema确认不是把名字不存在当作全部能力不存在。
- 本轮没有编译新的示例内容、运行npm check/build、产品测试、browser/Safari、fresh47或大规模保护文件hashing。源码链核对不是新增产品测试，也不宣告任何测试suite或产物通过。
- 保存前后核对三个Candidate的git diff/staged diff/untracked status，以及原Design/Inventory/PROJECT_STATE/TASK_LEDGER内容摘要，确认未被本轮改变。工作树原有修改完整保留，不声称CLEAN。

唯一写入是指定验证记录。PRODUCT CODE DELTA=0；TEST CODE DELTA=0；Inventory/Design及所有原文档不修改；Content、Media Manifest、Page Inventory、配置不修改；不新增组件/schema/字段/依赖/registry，不写实施计划，不commit/push/tag/merge。

## 9. 严格非声明与停止点

本次PASS仅关闭“现有源码能否表达已接受最小职责”这一核对问题，**不关闭WS05、不改变治理状态**，不代表：

- Bomb Farm proof PASS；
- War of Genesis proof PASS；
- two-game vertical proof PASS；
- PRODUCT ACCEPT；
- WS04B ACCEPT；
- WS07 adoption PASS；
- Safari / AX PASS；
- RELEASE ACCEPT。

真实内容正确性、目录有用性、解释性媒体、图文节奏、实际交互与项目采用均未由本轮证明。Safari proof仍为0、AX-01/AX-03未完全证明；不提升任何历史FAIL/BLOCK或采用状态。

```text
WS05 PATTERN BASELINE CONFORMANCE: PASS
WIKI_HUB: SUPPORTED
TASK_GUIDE: SUPPORTED
MEDIA_RICH_ARTICLE: SUPPORTED
QUICK_ANSWER_DECISION: SUPPORTED
STEPS_DECISION: SUPPORTED
NEXT_STEP_DECISION: SUPPORTED
COMPARISON_DEFER: SUPPORTED
NEW CODE REQUIRED: NO
PRODUCT CODE DELTA: 0
WS05 IMPLEMENTATION: NOT STARTED
```

保存本记录并核对只读范围后立即STOP；不启动two-game proof、真实游戏adoption或WS04B。

## 文件依据

[design]: </Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws05/MINIMAL_WS05_PATTERN_DESIGN_V1.md>
[inventory]: </Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws05/WS05_EXISTING_PATTERN_INVENTORY_V1.md>
[gameconfig]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/game.config.ts>
[manifest]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/media/media.json>
[guidesroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/guides/[...slug].astro>
[optionalroutes]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/optional-routes.ts>
[collection]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/home/PageCollection.astro>
[home]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/index.astro>
[categories]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/home/WikiCategories.astro>
[entitydb]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/EntityDatabase.astro>
[heroesroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/heroes/[...path].astro>
[baselayout]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/layouts/BaseLayout.astro>
[catalog]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/catalog.ts>
[sitedata]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/site-data.ts>
[header]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/Header.astro>
[astroconfig]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/astro.config.ts>
[contentconfig]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/content.config.ts>
[resolution]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/page-resolution.ts>
[wiki]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/WikiArticle.astro>
[mdxintegration]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/node_modules/@astrojs/mdx/dist/index.js>
[mdxprocessor]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/node_modules/@astrojs/markdown-satteri/dist/processor.js>
[mdximplementation]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/node_modules/@astrojs/markdown-satteri/dist/mdx/create-processor.js>
[guidecontent]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/content/guides/getting-started.mdx>
[toc]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/wiki-article.ts>
[faq]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/FAQ.astro>
[related]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/RelatedPages.astro>
[sources]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/Sources.astro>
[editorial]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/EditorialArticle.astro>
[mediacatalog]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/media/catalog.ts>
[gamemedia]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/media/GameMedia.astro>
[gallery]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/media/ScreenshotGallery.astro>
[video]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/media/VideoEmbed.astro>
[presentation]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/media-presentation.ts>
[entitymodules]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/entity-modules.ts>

