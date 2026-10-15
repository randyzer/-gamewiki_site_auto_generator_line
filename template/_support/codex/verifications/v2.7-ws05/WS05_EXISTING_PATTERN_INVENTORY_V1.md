# WS05 Existing Pattern Inventory V1

日期：2026-10-08（Asia/Taipei）。模式：READ ONLY / INVENTORY ONLY。

本记录只描述当前源码、输入与调用链；不是Pattern设计、实施计划或接受结论。唯一新增文件为本文；不修改原文档、源码、测试、治理状态或历史证据，不运行产品测试、构建、浏览器或采用验证。WS05 IMPLEMENTATION: NOT STARTED。

## 1. 现场与计数口径

- Starter位置：`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`。
- Branch：`v2.7/evolution`；HEAD：`b067e8d4050478072f25a1dc78a8526cdd128cfd`。该工作树包含已存在的未提交修改和未跟踪文件；盘点对象是当前工作树，不能用HEAD代替当前源码身份。
- 边界依据：当前[PROJECT_STATE][state]、[Simplification Amendment][amendment]、[WS04A Final Review][review04]、[WS03接口引用基线][interfaces]。WS03/WS04A已接受的技术接口不等于产品、Safari或采用通过。
- 目标只包括Wiki / Hub、Task Guide、Media-rich Article；这些是本次盘点标签，当前代码没有对应WS05 Pattern ID/enum。
- [Page Inventory schema][inventoryschema]有17个pageType：home、guide、hero、weapon、item、map、search、calculator、planner、hub、database、meta、patch、about、privacy、terms、not-found。pageType是现有页面身份/路由分类，不是新Pattern分类。
- 最终optional module数量只对用户列出的7项各计一次。Figure / Gallery合并计1项，Related / Next Step合并计1项；不把Hero、Video、Sources另加进这7项。
- 分类：**A. EXISTS AND REUSABLE；B. EXISTS BUT TOO PAGE-SPECIFIC；C. PARTIAL；D. NOT PRESENT**。A表示现有输入和调用链可使用该源码能力；不表示已存在独立组件、不表示任意页面都已接入，也不表示真实游戏证明或浏览器验收完成。
- 三个目标的pieces数量分别计算各目标检查清单中的A项功能切面。它们会共享源码，不能相加成“独立组件总数”或完成率。

### 当前实际输入，区别于条件consumer

[game.config.ts][gameconfig]当前只启用guides/search；heroes/weapons/items/maps/tierLists/news/calculator/planner均关闭。[Inventory][inventory]共9条记录，其中privacy/terms为private draft、legalActivation unavailable；hero.demo-sentinel被heroes开关排除。根据[catalog筛选][catalog]可静态推导6条enabled记录：home、hub.guides、guide.getting-started、search、about、not-found。此处未运行构建，不宣称本轮产物路由检查通过。

content只有[getting-started.mdx][guidecontent]一个实际MDX，meta/news目录只有README；facts/tools目录只有README，无当前实体事实/工具JSON。[Media Manifest][manifest]的assets/pages均为空。源码中的媒体、FAQ、实体和工具consumer可以存在，同时当前默认页面没有相应数据内容；两者不能混为真实游戏采用成果。

## 2. 真实源码页面consumer

下表仅列有路由源码的调用链。路由占位表示源码支持的条件路径，不代表当前已发布URL；具体页面还受Inventory、feature、content/fact/tool输入约束。

| 页面类型 | Route / Component | 主要组件 / 输入 | 当前负责的用户任务 | 当前启用情况 |
| --- | --- | --- | --- | --- |
| home | [index.astro][home] → BaseLayout | GameHero、WikiCategories、PageCollection；条件QuickFacts/FAQ/gallery/trailer；home-model | 进入站点、选择指南/分类、浏览集合与更新 | 当前有home记录 |
| hub / guides | [guides/[...slug].astro][guidesroute]的hub分支，/guides/ | BaseLayout、内联guide-index、条件GameMedia；buildGuideRouteRecords | 浏览指南标题、说明、更新日期并进入文章 | 当前hub.guides + 1篇指南 |
| guide | [同一路由][guidesroute]的article分支，/guides/<slug>/ | render(MDX) → WikiArticle；headings和content.data.faq | 阅读指南正文、定位章节、查看来源/关联页面 | getting-started为Starter操作说明，不是游戏任务采用 |
| hub / database，实体目录 | [heroes路由][heroesroute]、[weapons路由][weaponsroute]、[items路由][itemsroute]、[maps路由][mapsroute] → EntityDatabase | entity-route-model、EntityFilterIsland；facts转rows；view=hub/database | 浏览、分类筛选、排序实体，进入实体详情 | 四模块关闭；当前没有hub/database实体目录输入 |
| hero | [heroes路由][heroesroute]的detail分支 → EntityDetail | HeroFact、角色/难度/强弱项、QuickFacts、媒体、RelatedPages/Sources | 查英雄事实与来源 | 仅禁用的demo Inventory，无facts文件 |
| weapon | [weapons路由][weaponsroute]的detail分支 → EntityDetail | WeaponFact、类别/伤害/射速/有效射程、媒体/来源/关联 | 查武器事实 | 关闭，无当前数据 |
| item | [items路由][itemsroute]的detail分支 → EntityDetail | ItemFact、类别/成本/效果/patch、媒体/来源/关联 | 查物品事实 | 关闭，无当前数据 |
| map | [maps路由][mapsroute]的detail分支 → EntityDetail | MapFact、模式/大小/地点、媒体/来源/关联 | 查地图事实 | 关闭，无当前数据 |
| meta | [meta/[slug].astro][metaroute] → EditorialArticle | tierLists集合、resolveContentPages、selectEditorialPages | 阅读meta分析内容 | tierLists关闭，集合无实际文章 |
| patch | [news/[slug].astro][newsroute] → EditorialArticle | news集合、Inventory publication/update、sources | 阅读更新文章 | news关闭，集合无实际文章 |
| calculator / planner | [tools/[slug].astro][toolsroute] → ToolShell | 固定分支CalculatorIsland/PlannerIsland、tool definition、来源和related links | 计算结果或规划步骤/资源 | 两开关关闭，无工具定义 |
| search | [search/[...path].astro][searchroute] → BaseLayout | SearchIsland、search-state、Pagefind adapter；指南fallback | 查本地索引并处理空结果/错误 | 当前search记录；本轮未构建/试查询 |
| about | [about.astro][aboutroute] → LegalPage | static-page-copy的about正文、sections、related links | 了解编辑方法 | 当前about记录；并非StaticWikiPage consumer |
| privacy / terms | [privacy路由][privacyroute]、[terms路由][termsroute] → LegalPage | legal-safety批准payload与发布条件、固定段落section | 阅读政策/条款 | 当前unavailable，不生成enabled政策页面 |
| not-found | [404.astro][notfoundroute] → BaseLayout | Inventory文案、getRelatedPages recovery buttons | 找不到页面后返回有效入口 | 当前not-found记录 |

另有[robots.txt.ts][robotsroute]文本端点，不是文章/Pattern consumer。[StaticWikiPage.astro][staticwiki]存在page/slot/hero/gallery/trailer shell，但搜索src未发现其import或页面调用，**NO CURRENT PAGE CONSUMER**；不能因为文件存在就算作已接入的页面类型。唯一layout是[BaseLayout.astro][baselayout]，通过普通slot承载各固定页面家族，负责共享导航、SEO与theme preset属性。

## 3. 目标Pattern / Module总表

“缺项”仅描述当前源码或当前输入缺失，不提出新增API、字段或抽象。表中复用保持现有authority所有权：页面身份由Inventory、正文由content、实体由facts、媒体由Manifest等原输入持有。

| Target Pattern / Module | Existing Source | Existing Consumer | Reusable? | Missing Capability | Notes |
| --- | --- | --- | --- | --- | --- |
| Wiki / Hub — hub/list/navigation | [Header][header]、[DesktopNav][desktopnav]、MobileNav、[guide route][guidesroute] | BaseLayout；指南hub分支 | A | 无通用Hub Pattern接口；指南index是内联实现 | 导航来自原game.config + enabled catalog；guide列表不是独立组合模块 |
| Wiki / Hub — category/object browsing | [WikiCategories][categories]、[EntityDatabase][entitydb]、[EntityFilterIsland][entityfilter] | index；四实体路由的hub/database分支 | A | 无任意taxonomy模型；默认没有实体事实 | 已有category cards与固定实体classification筛选，不把它说成通用分类引擎 |
| Wiki / Hub — related links | [RelatedPages][related]、[getRelatedPages][sitedata] | WikiArticle / EditorialArticle / EntityDetail | A | guide hub与EntityDatabase没有RelatedPages接入 | 有原Inventory关系解析，不能声称所有hub已渲染 |
| Wiki / Hub — cards/list | [PageCollection][collection]、[WikiCategories][categories]；guide-index | index；guides hub | A | 首页集合依home-model；guide-index未提取 | PageCollection接收现有page数组/title/id，可复用其现有呈现 |
| Wiki / Hub — page intro | [EntityDatabase][entitydb]page header；[guide route][guidesroute]header | 实体hub/database；guide hub | A | 无独立Intro组件 | 已有page.title/description shell；不是另一个页面事实源 |
| Wiki / Hub — media | [GameMedia][gamemedia]、[ScreenshotGallery][gallery]、[VideoEmbed][video] | home；guide hub仅hero；EntityDatabase仅hero | A | 默认Manifest空；hub并未全部接入gallery/video | renderer可复用，与“hub已经媒体丰富”不同 |
| Task Guide — article shell | [WikiArticle][wiki]、[EditorialArticle][editorial]、[BaseLayout][baselayout] | guides article；meta/news | A | 尚无WS05 Task Guide专名consumer | WikiArticle现有slot承担长文，EditorialArticle为较薄shell |
| Task Guide — quick answer | [QuickFacts][quickfacts]、WikiArticle description；[FAQ][faq]回答文本 | WikiArticle/EntityDetail/home的QuickFacts；FAQ条件调用 | C | 没有QuickAnswer组件或任务主答案输入/调用 | 摘要/事实/问答是部分呈现基础；QuickFacts不是QuickAnswer |
| Task Guide — steps | [getting-started.mdx][guidecontent]、WikiArticle prose slot | guides article | C | 没有共享Steps组件或步骤数据consumer | 有4个编号H2顺序说明；不是结构化共享步骤模块 |
| Task Guide — FAQ | [FAQ][faq]、[content.config.ts][contentconfig] | guide route把content.data.faq传WikiArticle；home条件调用 | A | 当前MDX无faq数据，首页model调用未提供faq | 固定question/answer + details，空数组不渲染 |
| Task Guide — sources | [Sources][sources]、[public-sources][publicsources] | WikiArticle / EditorialArticle / EntityDetail | A | 来源链接不等于人审验证通过 | 只投影原sources/accessedAt；不公开私有evidenceNote |
| Task Guide — related/next step | [RelatedPages][related]、[sitedata][sitedata] | WikiArticle / EditorialArticle / EntityDetail | C | 没有任务专属“下一动作”计算/推荐 | Related可复用；task-oriented Next Step不存在，合并项为PARTIAL |
| Task Guide — TOC | [WikiArticle][wiki]内联TOC + [wiki-article.ts][toc] | guides render.headings → WikiArticle | A | 无独立TOC组件；EditorialArticle未接入；无scrollspy逻辑 | H2/H3过滤，至少2项才显示，链接heading.slug；本轮无滚动/键盘验收 |
| Media-rich Article — hero | [WikiArticle][wiki]的heroMedia → [GameMedia][gamemedia] | guides article；EntityDetail/home也有hero | A | 默认没有媒体asset；EditorialArticle没有hero入口 | GameHero为首页专用，不能视为文章hero组件 |
| Media-rich Article — figure | [GameMedia][gamemedia] image分支 | WikiArticle hero；ScreenshotGallery子项等 | A | 当前正文没有实际内嵌figure样例 | 已有figure/img/figcaption；不能推导任意MDX已嵌入此组件 |
| Media-rich Article — gallery | [ScreenshotGallery][gallery] | WikiArticle / EntityDetail / StaticWikiPage / index中的条件调用 | A | 默认无asset；StaticWikiPage无页面consumer；无lightbox/carousel | 验证image assets后逐项GameMedia；不是图库交互引擎 |
| Media-rich Article — video | [VideoEmbed][video]经GameMedia | WikiArticle/EntityDetail/home trailer调用链 | A | 当前无实际video asset；无本轮播放/权限/浏览器证据 | 已有local video / YouTube分支、poster与accessibleEquivalent |
| Media-rich Article — caption/credit | [GameMedia][gamemedia]、[VideoEmbed][video]、[media-presentation][mediapresentation] | figure/video renderer | A | 当前无实际caption/credit数据 | 持原Manifest事实；credit可选，保留source链接；不等于权利批准 |
| Media-rich Article — TOC | [WikiArticle][wiki] + [heading helper][toc] | guides article | A | EditorialArticle无TOC接入 | 和Task Guide共用同一能力，不计第二个独立模块 |
| Media-rich Article — FAQ | [FAQ][faq] | WikiArticle / home | A | 当前无FAQ样本；EditorialArticle虽集合接受faq但route未传组件 | 不能把schema接受faq等同于meta/news已呈现FAQ |
| Media-rich Article — related | [RelatedPages][related] | WikiArticle / EditorialArticle / EntityDetail | A | 没有新journey推断 | 使用原Inventory关系，滤除未启用页面 |
| Media-rich Article — long-form shell | [WikiArticle][wiki]、[EditorialArticle][editorial] | guide / meta / news | A | meta/news默认无正文；没有独立WS05 media pattern consumer | 完整媒体/TOC/FAQ组合在WikiArticle，不能将EditorialArticle描述为同等功能 |

## 4. 七个Shared optional modules：唯一计数表

| Module | 分类 | Source / 真实调用基础 | 限制与当前缺失 |
| --- | --- | --- | --- |
| Quick Answer | **C. PARTIAL** | [QuickFacts][quickfacts]、WikiArticle description、FAQ answer | 没有专门主答案模块；“Quick answers”只是FAQ eyebrow文案；QuickFacts是label/value事实。WikiArticle默认quickFacts为空，guides route未传quickFacts；首页当前model输入也未提供 |
| Steps | **C. PARTIAL** | [guide MDX][guidecontent]四个编号H2经WikiArticle slot渲染 | 只存在顺序 prose 内容，没有可共享Steps组件/结构化步骤consumer；不将工具planner或法律section当作同一个模块 |
| Comparison | **D. NOT PRESENT** | 未找到专门Comparison组件、props或文章consumer | EntityFilterIsland虽有分类/详情/patch表格，但它是实体目录查询界面，不是任务选择/选项比较模块；filter-state的comparison局部变量仅为localeCompare排序结果 |
| Figure / Gallery | **A. EXISTS AND REUSABLE** | [GameMedia][gamemedia] + [ScreenshotGallery][gallery] | 现有figure/img/caption/credit与图片集合；Manifest为空，不宣称已有真实文章样例 |
| TOC | **A. EXISTS AND REUSABLE** | [WikiArticle][wiki]内联TOC + [wiki-article.ts][toc] | 经既有文章shell复用；非独立模块，只有H2/H3、至少2项显示；未证明scrollspy或真实Safari行为 |
| FAQ | **A. EXISTS AND REUSABLE** | [FAQ][faq]、guide frontmatter接入 | 同一组件可呈现question/answer数组；空数据不渲染；不等于Quick Answer |
| Related / Next Step | **C. PARTIAL** | [RelatedPages][related] + [getRelatedPages][sitedata] | Related存在且可复用；task-oriented Next Step / recommended next action不存在；合并项不能按related links单独能力计A |

**A=3，B=0，C=3，D=1；合计7。** A：Figure / Gallery、TOC、FAQ；C：Quick Answer、Steps、Related / Next Step；D：Comparison。分类B在下方页面专用组合中存在，不属于这7项独立optional modules的计数。

```text
Related:
EXISTS AND REUSABLE

Task-oriented Next Step:
NOT PRESENT

Combined classification:
C. PARTIAL
```

### 存在但具有页面家族约束的组合

| Existing Source | Consumer | 分类 | 当前约束 |
| --- | --- | --- | --- |
| [GameHero][gamehero] | index | B | 依brand/tagline、startPage、browseTarget；是首页入口，不是通用文章hero |
| [home-model][homemodel] | index | B | homepage featured、startHere、categories、importantSystems、patch latestUpdates等固定集合逻辑 |
| guide-index内联块 | [guide route][guidesroute]hub分支 | B | 文案/列/更新日期明确为guide library，非独立通用Hub组件 |
| [EntityDetail][entitydetail] | 四实体detail路由 | B | fact.name/summary/patch、fields、媒体/来源绑定实体；没有长文slot/TOC/FAQ |
| [EntityFilterIsland][entityfilter]表格 | EntityDatabase | B | 固定EntityDatabaseRow分类/详情/patch与筛选排序；不作为独立Comparison模块计数 |
| [LegalPage][legalpage] | about/privacy/terms | B | 固定政策/编辑说明sections及legal-safety边界；不是自由组合schema |

[StaticWikiPage][staticwiki]有相似shell但没有当前页面consumer；独立记录为未接入能力，不用于抬高pieces计数。

## 5. 三个目标Pattern的事实摘要

以下按第3节的目标检查项计数，而非源文件数量；共享功能在各目标中出现，但全局optional modules仍只计7项。

```text
Wiki / Hub:
existing reusable pieces = 6
(hub/list/navigation, category/object browsing, related links,
 cards/list, page intro, media)

Task Guide:
existing reusable pieces = 4
(article shell, FAQ, sources, TOC)
partial pieces = 3
(quick answer, steps, related/next step)

Media-rich Article:
existing reusable pieces = 9
(hero, figure, gallery, video, caption/credit, TOC,
 FAQ, related, long-form article shell)
```

Wiki / Hub已有首页集合、指南hub与四实体目录家族；它们是不同的现有页面consumer，不能据此宣称存在统一Hub Pattern。Task Guide现有文章shell/内容渲染完整，但Quick Answer、Steps及合并的Related / Next Step只有部分基础；Related本身存在且可复用，task-oriented Next Step不存在。Media-rich Article最完整的源码组合是WikiArticle；当前Manifest无资产，默认指南为Starter配置说明，不能据此声称真实游戏媒体文章或两游戏proof已完成。

## 6. 危险抽象检查：存在性与范围

检查src文件清单、imports、schema、route/view分支及关键词：block DSL、page builder、module registry、pattern registry、layout engine、theme engine、dynamic component、patternId、composition schema、blocks/builder/registry/composition/pattern。不能只用关键词没命中推导不存在。

| 检查项 | 当前事实 | 文件 / 范围 |
| --- | --- | --- |
| block DSL | NONE | content schema只有pageId/optional faq；正文为MD/MDX，不是自建block指令系统 |
| page builder | NONE | 路由直接import固定组件；无编辑器/页面构建器 |
| UI module registry / registry-like domain structure | **UI module registry：NONE；固定实体模块定义索引：EXISTS** | [entity-modules.ts][entitymodules]的entityModuleDefinitions、createEntityModuleIndex、entityModuleIndex.byModule、RegisteredEntityModuleDefinition；持heroes/weapons/items/maps的module/entityType/segment/label/parser。consumer为四实体路由、[fact-loader][factloader]、site-validation与schema的keys。没有任意UI模块到组件/布局的映射，不是Pattern registry、UI module registry、dynamic component registry、page builder或generic composition engine |
| pattern registry | NONE | 无三个WS05目标的注册记录、解析或consumer |
| generic layout engine | NONE | 一个BaseLayout普通slot，固定页面组件分支；不是数据驱动布局引擎 |
| theme engine | NONE | [theme-roles][themeroles]和config.visualRoles为4个有限preset属性，BaseLayout投影data-theme-*，semantic CSS负责样式。现有optional helper明确记录，不当作不存在，也不当作通用theme engine |
| dynamic component registry | NONE | GameMedia image/video、ToolShell calculator/planner为明确import的固定分支；Astro render得到MDX Content是框架正文组件，Pagefind动态import是搜索provider，不是自建组件注册表 |
| patternId / pattern enum | NONE | Inventory已有pageType enum；正则名youtubeIdPattern/hashPattern等不是页面Pattern；没有WS05 Pattern IDs |
| generic composition schema | NONE | content/page/facts/media输入各有原领域schema；legalContent的heading/paragraphs只服务固定政策内容，不是任意模块顺序/布局schema |

```text
REGISTRY-LIKE DOMAIN STRUCTURES:
1

DANGEROUS WS05 COMPOSITION ABSTRACTIONS:
NONE
```

固定实体模块定义索引的存在事实完整保留，仅计入registry-like domain structures，不计为危险WS05组合抽象。未发现上述Pattern/UI/dynamic component registry、page builder或generic composition engine。

## 7. Authority与已有组合边界

- Inventory/pageType仍是page truth；[page-models][pagemodels]选择固定家族，[page-resolution][pageresolution]将content.pageId/contentRef与Inventory对应，[optional-routes][optionalroutes]和[entity-route-model][entityroutes]生成固定route records。没有Pattern authority。
- game.config持features/navigation/homepage，catalog控制enabled pages；不创建第二开关或适配字段。
- content负责正文及原faq；QuickFacts为现有组件prop，没有当前指南quickFacts frontmatter输入。facts/tool definitions持原实体/计算事实，不借Pattern盘点复制。
- Media Manifest → catalog.getPageMedia → GameMedia/ScreenshotGallery/VideoEmbed及原public presentation；页面媒体renderer不另持URL/credit事实authority。
- publication/update/source检查仍由[Freshness][freshness]、Inventory与Provenance持有；WikiArticle/EditorialArticle调用resolvePageFreshness(page)。versionContext接口保留，但这些文章生产调用未传该参数；EntityDetail/ToolShell仍呈现原patch。不恢复退役live状态、不造替代Live模型。
- 原Sources、SEO、共享导航、语义theme tokens、Search接口保持各原consumer。本轮不评价其新完成度，不改WS03/WS04A接受边界或Safari/AX状态。

## 8. 本轮完成与非执行范围

完成源码读取、分类和指定记录保存；PRODUCT CODE DELTA = 0、TEST CODE DELTA = 0。保存前后核对Starter/SOP/Master Prompt三个Candidate的Git unstaged diff、staged diff及完整untracked status指纹，结果相同；没有将本来脏的工作树宣称CLEAN。未运行测试/构建/浏览器，不借用历史测试数字为本轮PASS。

没有修改原Active文档、PROJECT_STATE/TASK_LEDGER/ROADMAP、iteration/archive，未创建schema/config/type/field/component/pageType/Pattern ID，未启动two-game proof、Bomb Farm/War of Genesis adoption、WS04B或WS05实施，未commit/push/tag/merge。本文不包含新Pattern API、库方案或implementation plan；完成Inventory后STOP。

## 文件依据

所有路径均指当前本地工作树。

[state]: </Users/randyz/work/coding/hot_words_web/template/PROJECT_STATE.md>
[amendment]: </Users/randyz/work/coding/hot_words_web/template/architecture/V2.7_ARCHITECTURE_SIMPLIFICATION_AMENDMENT_V1.md>
[review04]: </Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws04a/SIMPLIFIED_WS04A_FINAL_REVIEW_V1.md>
[interfaces]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/WS03_CANDIDATE_INTERFACE_BINDING_BASELINE_V1.md>
[inventoryschema]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/page-inventory.ts>
[gameconfig]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/game.config.ts>
[inventory]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/page-inventory.json>
[catalog]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/catalog.ts>
[manifest]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/media/media.json>
[home]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/index.astro>
[guidesroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/guides/[...slug].astro>
[heroesroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/heroes/[...path].astro>
[weaponsroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/weapons/[...path].astro>
[itemsroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/items/[...path].astro>
[mapsroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/maps/[...path].astro>
[metaroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/meta/[slug].astro>
[newsroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/news/[slug].astro>
[toolsroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/tools/[slug].astro>
[searchroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/search/[...path].astro>
[aboutroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/about.astro>
[privacyroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/privacy/[...path].astro>
[termsroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/terms/[...path].astro>
[notfoundroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/404.astro>
[robotsroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/robots.txt.ts>
[staticwiki]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/StaticWikiPage.astro>
[baselayout]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/layouts/BaseLayout.astro>
[header]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/Header.astro>
[desktopnav]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/navigation/DesktopNav.astro>
[categories]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/home/WikiCategories.astro>
[entitydb]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/EntityDatabase.astro>
[entityfilter]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/islands/EntityFilterIsland.tsx>
[related]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/RelatedPages.astro>
[sitedata]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/site-data.ts>
[collection]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/home/PageCollection.astro>
[gamemedia]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/media/GameMedia.astro>
[gallery]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/media/ScreenshotGallery.astro>
[video]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/media/VideoEmbed.astro>
[wiki]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/WikiArticle.astro>
[editorial]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/EditorialArticle.astro>
[quickfacts]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/QuickFacts.astro>
[faq]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/FAQ.astro>
[guidecontent]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/content/guides/getting-started.mdx>
[contentconfig]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/content.config.ts>
[sources]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/Sources.astro>
[publicsources]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/public-sources.ts>
[toc]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/wiki-article.ts>
[mediapresentation]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/media-presentation.ts>
[gamehero]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/home/GameHero.astro>
[homemodel]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/home/home-model.ts>
[entitydetail]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/EntityDetail.astro>
[legalpage]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/LegalPage.astro>
[entitymodules]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/entity-modules.ts>
[factloader]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/fact-loader.ts>
[themeroles]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/theme-roles.ts>
[pagemodels]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/page-models.ts>
[pageresolution]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/page-resolution.ts>
[optionalroutes]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/optional-routes.ts>
[entityroutes]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/entity-route-model.ts>
[freshness]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/freshness.ts>
