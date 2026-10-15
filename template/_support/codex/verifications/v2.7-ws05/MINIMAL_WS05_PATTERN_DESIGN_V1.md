# Minimal WS05 Pattern Design V1

日期：2026-10-08（Asia/Taipei）。模式：DESIGN ONLY / NO IMPLEMENTATION。
状态：READY FOR INDEPENDENT REVIEW。本文为Codex设计提案，未代替ChatGPT独立审查结论。

## 1. 设计依据与最小形态

基于已接受并完成窄修正的[WS05 Existing Pattern Inventory][inventory]。本次复核当前Starter工作树的文章、Hub、媒体和内容接口；branch为`v2.7/evolution`，HEAD为`b067e8d4050478072f25a1dc78a8526cdd128cfd`。工作树已有未提交修订，HEAD不是完整工作树身份。

基线保持：

- optional modules：A=3（Figure / Gallery、TOC、FAQ）；C=3（Quick Answer、Steps、Related / Next Step）；D=1（Comparison）；B=0。
- Related本身存在且可复用；task-oriented Next Step当前没有专门能力；合并项仍为C. PARTIAL。本提案不反写Inventory或把未来正文写法说成已实现模块。
- registry-like domain structures=1：固定实体facts索引entityModuleIndex；危险WS05组合抽象=NONE。该领域索引不是待删除对象。
- [Simplification Amendment][amendment]规定首批只有三个Pattern；[WS04A Final Review][review04]确认适配是轻量项目方法，复用9个既有authority，不产生runtime adaptation模型。

**首批Pattern是三种可复用的页面组合方法，不是三套新组件或运行时分类系统。** Wiki / Hub复用已有目录/集合；Task Guide复用文章shell与正文；Media-rich Article复用WikiArticle已有媒体呈现。产品规则规定玩家需要看到什么，内容作者在原内容和原输入中完成组合，不将规则翻译成强制frontmatter字段。

### 代码组织选择

| 选择 | 取舍 | 本提案 |
| --- | --- | --- |
| 直接复用已有页面consumer、组件和MDX，记录三种组合方法 | 无额外wrapper/选择层；保留不同页面家族的实际约束；内容质量仍需人审 | **采用** |
| 分别增加三个Pattern wrapper | 名称更统一，但现有共享shell已处理重复；没有证明新增wrapper减少重复的两个实际Pattern采用；会多一层透传/边界维护 | 不采用 |

DSL、registry、page builder、generic composition schema、dynamic component registry和theme engine均不在可选方案中，不重新讨论这些已排除的方向。

## 2. 最小产品设计总表

Required是完成玩家任务的最小内容，不是新的schema必填字段。原Core的发布、SEO、sources、日期、媒体和可访问性义务在所有页面继续有效，不因某项未列入Pattern专属Required而豁免。

| Pattern | Product Job | Existing Base | Required Pieces | Optional Pieces | Genuine Gap | New Runtime Contract Needed? |
| --- | --- | --- | --- | --- | --- | --- |
| Wiki / Hub | 让玩家知道这里能查什么，并进入与自己问题相关的指南或对象 | guide hub；首页PageCollection/WikiCategories；有实体数据时EntityDatabase；BaseLayout | 明确的范围/入口说明；至少一组有清晰名称及有效目标的内容或对象入口 | 分类分组、卡片/列表形式、实体筛选、相关链接、解释性媒体；简短引导正文 | 无统一Hub wrapper；没有实际数据时目录不成立。这些不证明需要新运行时能力 | **NO** |
| Task Guide | 回答一个具体问题，让玩家知道该怎么做、何时适用、怎样确认结果 | guides article → WikiArticle + MDX；EditorialArticle提供较薄文章shell | 任务和适用条件；直接可读的答案；足以执行的动作或选择依据；完成/结果说明 | 顺序步骤、失败恢复、人工Next Step、TOC、FAQ、Related、帮助执行的媒体 | 缺少专门Quick Answer/Steps/Next Step模块；最小任务可用普通正文表达，不需要专门模块 | **NO** |
| Media-rich Article | 结合文字与真实图片或视频，帮助玩家看懂对象、机制或变化 | WikiArticle及其GameMedia / ScreenshotGallery / VideoEmbed调用链 | 可理解的文章主题与解释正文；至少一种有实际解释作用的媒体及文字说明；沿用原媒体来源/等价内容规则 | Hero、更多Figure/Gallery、Video、TOC、FAQ、Related、人工后续阅读提示 | 当前Manifest为空、没有真实游戏文章采用；EditorialArticle未接入同等媒体/TOC/FAQ功能；不能把这些事实当作已完成 | **NO** |

“至少一种媒体”是Media-rich Article的产品职责要求，不要求hero/gallery/video同时存在，也不增加mediaRequired、patternId等运行时字段。只有装饰图、没有可理解正文的页面，不满足此Pattern的产品职责。

## 3. 三种组合方法

### 3.1 Wiki / Hub

**核心职责：** 玩家进入后能理解目录范围，辨认可查的主题/对象，选择有效入口。

**Required**

- 页面的标题和简短范围说明来自原Inventory；不另存一份Pattern标题/描述。
- 至少一组与该目录范围有关的真实入口，名称清楚，链接目标是原enabled catalog中的页面。分类选择不是必需；内容少时一张简单列表即可。

**Optional**

- 有多个内容集合时使用PageCollection或已有WikiCategories分类入口。
- 有原facts数据且任务是对象查询时，沿用EntityDatabase已有分类/筛选/排序；不要求所有Hub都有实体表格。
- Related链接、帮助识别游戏或对象的媒体、简短“先看什么”说明。页面若只是导航目录，不必强制长文、TOC或FAQ。

**Not part of this Pattern**

- 无数据的假分类、自动猜测taxonomy、搜索provider、推荐排序算法。
- 首页完整home-model与GameHero不是所有Hub的Required；不把首页固定集合逻辑推广为通用布局模型。
- route生成、feature启用、publication/indexability、SEO、媒体验证或新的对象facts模型。

**最接近基础：** [guide hub route][guidesroute]已具备intro、真实guide列表及可选hero；[首页][home]已有PageCollection/WikiCategories；[EntityDatabase][entitydb]服务固定实体目录。组合沿用各自真实任务，不合并为一个万能Hub。

### 3.2 Task Guide

**核心职责：** 玩家看完知道针对自己的问题做什么，并能判断是否达到结果。

**Required**

- 明确任务/问题与必要的前置条件。适用patch/version等事实引用原来源；没有证据时不编造适用范围。
- 正文开头给出直接答案或行动结论。它可以是一个短段落，不要求卡片式Quick Answer组件，不用SEO description代替实际答案。
- 给出足够执行的操作说明或选择理由。只有操作确有先后依赖时才需要分步骤；单次操作或决策题可以直接说明，不要求每篇都有Steps模块。
- 说明成功后的结果或判断方法。若任务容易失败，给出相关恢复说明；不强制所有文章添加人为失败分支。

**Optional**

- 多步骤任务的编号标题/段落；复杂步骤可用普通MDX有序列表，不新增步骤字段或状态。
- TOC、FAQ、帮助执行的Figure/Gallery或Video。
- Related作为关联阅读；人工Next Step作为明确的后续行动，两者保持不同含义。
- Hero默认不为凑结构而加入；已有媒体只有在帮助理解任务时使用。原WikiArticle的hero位于正文前，不通过新增slot/布局开关来强制答案位置。

**Not part of this Pattern**

- 强制hero/gallery/video/comparison或步骤数量；统一的任务数据schema。
- 自动判断任务完成、自动选下一动作、个性化推荐、进度追踪。
- 改写WikiArticle的SEO/日期/source语义、另建FAQ authority、把QuickFacts当作任务答案。

**最接近基础：** [guides article][guidesroute]把MDX Content、headings、faq传给[WikiArticle][wiki]。最小任务的答案、动作、结果、恢复/后续说明都放在原MDX正文；不添加frontmatter。现有getting-started是Starter说明，只证明正文渲染能力，不是两个真实游戏consumer。

[EditorialArticle][editorial]可继续承担meta/news的简单正文，但本设计不将其改为WikiArticle、不修改路由、不宣称它已有TOC/FAQ/媒体接入。首批Task Guide最接近的现有路径仍是guides。

### 3.3 Media-rich Article

**核心职责：** 玩家结合文字和有用媒体，看懂仅靠文字不易解释的内容。

**Required**

- 能独立理解的主题、正文与媒体解释。
- 至少一张有信息作用的图片、一组相关图片或一段有解释价值的视频；任选其一。媒体来源、尺寸、alt、credit及视频accessibleEquivalent继续由原输入/renderer/验证规则约束。
- 正文或现有caption说明媒体展示什么、为什么与主题有关；不把caption字段新增为所有媒体的强制字段，也不把credit文本当作权利批准。

**Optional**

- Hero用于建立主题背景；Figure、Gallery、Video按实际解释需求组合，不全部必填。
- 长文TOC、FAQ、Related及人工后续阅读说明。Quick Answer、Steps和Comparison不是通用Required。

**Not part of this Pattern**

- 图片堆积、为了“rich”加入无关视频、要求gallery/lightbox/carousel。
- 任意block交错布局、媒体URL复制到新Pattern config、第二Media Manifest。
- 自动将meta/news变成媒体文章、新建媒体rights/可访问性验证authority。

**最接近基础：** [WikiArticle][wiki]已经按原Manifest接入hero、正文、后置gallery/trailer、FAQ、Related、Sources，具备首批最小组合。

保留已有摆放能力：hero在正文前、gallery/trailer在正文后，caption/正文承担解释。本文不提出正文任意位置插入资产的API或新slot；也不让作者用原始图片URL绕过Manifest。若某个真实任务必须多次穿插媒体且现有位置无法讲清楚，应记录实际限制再审查，本设计不预造交错布局能力。当前没有这种已证明的consumer要求。

## 4. 已有源码复用与真实缺失

这张表是能力边界和事实引用，**不是实施文件allowlist**，不表示要修改表中任何文件。

| 已有源码 | 本设计如何复用 | 当前边界 / 真正缺失 |
| --- | --- | --- |
| [WikiArticle][wiki] | Task Guide与Media-rich Article共同的长文基础；现有slot/媒体/TOC/FAQ/Related/Sources照常组合 | 不是新增Pattern dispatcher；不改props、复制wrapper或新增任意模块排序 |
| [EditorialArticle][editorial] | 保留较薄正文shell及来源/关联呈现 | meta/news真实consumer存在于源码但默认无文章；无专门媒体、TOC、FAQ接入，不按名字推导具备这些能力 |
| [guide hub route][guidesroute] | Wiki / Hub最接近的目录consumer | guide-index内联且guide专用；没有已证明需抽出第二份相同公共Hub实现 |
| [EntityDatabase][entitydb] | 对象目录需要原facts查询时沿用 | 不适合作为所有Hub或文章基类；不把对象表格升级为Comparison模块 |
| [PageCollection][collection] | 已有page数组的卡片/集合呈现 | 输入仍为原页面对象；不新造collection registry |
| [WikiCategories][categories] | 使用原页面集合的分类入口 | 不负责发现/定义通用taxonomy |
| [GameMedia][gamemedia] | 既有image/video渲染；来源、尺寸、caption/credit展示 | 不建立Pattern媒体解析/验证层 |
| [ScreenshotGallery][gallery] | 已有图片集合展示 | 不要求新增交互、轮播或lightbox |
| [VideoEmbed][video] | 经GameMedia沿用本地视频/YouTube及等价内容 | 不扩展provider registry |
| [FAQ][faq] | 有实际问题/答案时用现有faq输入 | 不同于主问题Quick Answer；不强制每篇填写 |
| [existing TOC][toc]与WikiArticle内联TOC | 沿用rendered headings的H2/H3锚点 | 非独立组件；至少2项时自动显示。产品上Optional不意味着新增toggle字段或拆出组件 |
| [RelatedPages][related] / getRelatedPages | 原Inventory关联阅读链接 | 不是task-oriented Next Step，不自动推荐 |
| [Sources][sources] | 直接沿用原sources公共投影 | 来源访问日期不冒充verifiedAt；不把原evidenceNote复制进Pattern |
| [ordinary content][guidecontent] + [content schema][contentconfig] | 正文段落、标题、列表、链接承载人工任务说明 | 不增加answer/steps/nextStep字段；没有专用模块不意味着普通正文不能表达相应任务 |

仅需重新组合的是已有目录入口与文章内容/媒体的使用方式；首批最小职责没有证明新的共享runtime功能缺口。当前真实缺失是专门模块、Comparison及真实内容/媒体采用证明。后者需要真实项目内容才能解决，不能靠新增空wrapper宣告完成。

## 5. 四个缺口裁决

Decision只使用用户规定的三种值。这里裁决最小产品表达方式，不改变Inventory对当前专门模块是否存在的事实判断。

| Gap | Decision | Why |
| --- | --- | --- |
| Quick Answer | **REUSE EXISTING AS-IS** | 普通MDX开头短段落即可直接回答玩家问题，现有文章slot渲染；不需要新卡片/props/schema。QuickFacts仍只表达事实，不用它冒充主答案 |
| Steps | **REUSE EXISTING AS-IS** | 有先后顺序时沿用编号H2/正文，必要时普通MDX列表；现有指南已证明编号段落调用链。首批无需步骤状态、图标、进度或嵌套schema |
| Next Step | **REUSE EXISTING AS-IS** | 作者可以在原正文写“达到条件X后做Y，因为Z”，必要时提供明确目标链接；这是人工内容，不是RelatedPages自动推荐，不建立新NextStep组件/字段/解析器 |
| Comparison | **DEFER** | 首批三个Pattern的核心职责不必依靠独立Comparison模块完成；现有实体表格只用于浏览筛选，不能冒充玩家选择比较。没有当前真实任务证明需要新增共享比较能力 |

### Next Step的限制

- 可选人工段落只在确实有后续任务时出现；没有后续动作就不添加。
- 目标若是本站页面，应指向原Inventory中已启用的目标；原页面路由继续是技术真相。正文链接是普通内容引用，不另存nextStepPageId/路线数组。
- 动作与理由由作者写明，不由relatedPageIds第一项、priority、首页featured或搜索结果推断。RelatedPages保持关联阅读语义。
- 不宣称当前已有专门task-oriented Next Step模块。该项REUSE只表示现有正文能力足以承载最小人工说明；实际内容仍未在本轮编写。

**计数：ADD MINIMAL CAPABILITY=0；REUSE EXISTING AS-IS=3；DEFER=1。** 不新增共享模块，也不把Comparison的延期扩大为禁止普通正文说明差异。

## 6. 是否需要三个新Pattern Components

| Proposed Name | YES / NO | 真实重复 / 至少两个实际consumer / 简单性依据 |
| --- | --- | --- |
| WikiHubPattern.astro | **NO** | guide目录、首页集合、实体目录各有不同任务。BaseLayout/卡片/实体组件已承担共享；现有多个页面家族不证明一个新wrapper减少重复。没有两个实际采用证明需相同新Hub接口；直接复用更简单 |
| TaskGuidePattern.astro | **NO** | WikiArticle已提供正文/TOC/FAQ/媒体/来源/关联；当前仅有一篇Starter说明，不是两个真实玩家任务采用。wrapper只会再包文章或透传props，无已证明重复可消除 |
| MediaRichArticlePattern.astro | **NO** | WikiArticle现有媒体接入已经最接近目标，Manifest为空、没有两个填有真实媒体的Pattern采用。wrapper不会增加解释能力，反而增加组件选择层 |

**NEW PATTERN COMPONENTS PROPOSED=0。** 本设计不以未来两个游戏可能采用作为当前两个真实consumer证据，也不为了Pattern Library命名而增加文件。

## 7. Pattern与pageType

| 问题 | 设计决定 |
| --- | --- |
| Pattern是否等于pageType？ | **NO**。pageType持页面身份/路由家族；Pattern描述帮助玩家完成任务的组合方法 |
| 需要修改现有pageType enum吗？ | **NO**。保持现有分类及匹配规则；不新增task-guide/media-article等类型 |
| 一个pageType能用不同Pattern吗？ | **YES，指内容/现有模块组合，不是runtime切换器**。同一guide家族可通过不同正文任务及原Manifest媒体映射表现为Task Guide或Media-rich Article，仍走同一个既有WikiArticle调用链 |
| Pattern需要进入Page Inventory吗？ | **NO**。不新增patternId、pattern enum、pattern config或composition字段 |
| 是否需要任意pageType间通用切换？ | **NO**。meta/patch当前走EditorialArticle；本设计不声称现有路由能自动换成任何Pattern，不改变route/pageType约束 |

Hub既可由现有home集合承担，也可由guides hub或实际实体目录承担相应产品任务；这不是声明不同pageType技术语义相同。命名与组合意图可留在既有Project / Adoption Method的自由文本中，不产生运行时selector。

## 8. 最小代码边界与authority

**Pattern只负责呈现组合，不负责重新决定、验证或存储技术真相。** “不拥有authority”同时意味着必须使用并遵守Core约束，不能绕过可访问性、媒体、SEO或发布规则。

| 既有边界 | 保持的技术所有权 | Pattern允许做什么 |
| --- | --- | --- |
| SOP Product Contract | 原能力语义、适用性及接受规则 | 引用现有要求；不建立第二能力登记/验收模型 |
| Page Inventory / catalog / route resolution | page IDs、pageType、route、发布/索引、标题/描述、关系、日期 | 渲染已解析的page、目录和链接；不造备用路由或发布决定 |
| game.config.ts | features、navigation、homepage、brand及现有preset选择 | 使用原已启用入口；不新增Pattern或adaptation开关 |
| semantic theme tokens / theme.css | 原视觉与响应式呈现规则 | 沿用组件/语义样式；不新增theme engine或扩张visualRoles |
| content | 原MD/MDX正文、pageId及已有FAQ输入 | 作者写答案、动作、解释、恢复/后续提示；不建立字段镜像 |
| facts | 原实体事实、分类、patch/version/source | 用原对象目录/详情consumer；不重新保存实体值 |
| tool definitions | 原计算/规划事实和规则 | 保持已有工具页面边界，不在Pattern里复制公式 |
| Media Manifest / catalog / media renderer | 原资产身份、映射、尺寸/来源/rights/credit/视频等价及验证 | 直接使用既有renderer和已有映射；不复制原始URL到Pattern输入 |
| sources / Provenance / freshness | 原访问与publication/update/sourceCheckedAt/version语义 | 使用Sources和原文章日期呈现，不造verifiedAt或替代live模型 |

SEO继续归BaseLayout/seo及原文章组件；Search仍由原feature/provider负责；导航、semantic HTML、键盘/focus/contrast/motion等义务继续归原Core接口与既有验收边界。组合本身仍须符合这些规则，本文不做新的AX或Safari裁定。

最小代码边界是**既有路由选择已解析页面，既有页面/文章组件调用已知组件，普通正文承载编辑内容，原catalog解析媒体与关系**。没有新dispatcher、schema、解析器、runtime contract、compatibility layer或依赖。不改变已有实体module index。本文不定义新props/API，也不列逐文件实施顺序、修改allowlist或测试实施清单。

## 9. 独立Review可核对的产品边界

以下是设计可理解性检查，不是本轮实施或two-game proof：

- Wiki / Hub：玩家能说明目录范围并找到一个真实有用入口；无需依靠假分类或装饰模块。
- Task Guide：玩家能获得直接答案、执行动作/选择依据及结果判断；仅有标题、摘要和一组Related链接不算完成任务。
- Media-rich Article：媒体实际帮助解释正文；只有换hero或堆图库、不解释内容不满足职责。
- 三种组合不强制同样的模块。没有新的Pattern组件或runtime contract，也不将手工内容要求转成schema。
- 四个缺口的裁决与现有事实一致：正文可表达三项最小能力，不据此把尚未存在的专门模块或真实采用标为完成。

当前默认内容和媒体不足以证明商业游戏成品；本轮不开始补内容、two-game proof或WS04B。独立Review可接受或修订本设计，但本文自身不宣告WS05关闭、PRODUCT ACCEPT、RELEASE ACCEPT或任何Safari/AX通过。

## 10. 本轮产物与停止点

仅新增本文。现有Inventory、Active docs、产品代码、测试、SOP/Master Prompt、PROJECT_STATE/TASK_LEDGER/ROADMAP、WS03/WS04A及历史文件均不修改。未运行产品测试/构建/浏览器，未commit/push/tag/merge。

```text
TARGET PATTERNS: 3
NEW PATTERN COMPONENTS PROPOSED: 0
GAPS ADD MINIMAL CAPABILITY: 0
GAPS REUSE AS-IS: 3
GAPS DEFERRED: 1
NEW RUNTIME CONTRACTS PROPOSED: 0
PRODUCT CODE DELTA: 0
TEST CODE DELTA: 0
WS05 IMPLEMENTATION: NOT STARTED
```

完成设计与文档自查后STOP，等待独立Review；不制定逐文件implementation plan。

## 文件依据

[inventory]: </Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws05/WS05_EXISTING_PATTERN_INVENTORY_V1.md>
[amendment]: </Users/randyz/work/coding/hot_words_web/template/architecture/V2.7_ARCHITECTURE_SIMPLIFICATION_AMENDMENT_V1.md>
[review04]: </Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws04a/SIMPLIFIED_WS04A_FINAL_REVIEW_V1.md>
[guidesroute]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/guides/[...slug].astro>
[home]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/index.astro>
[entitydb]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/EntityDatabase.astro>
[wiki]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/WikiArticle.astro>
[editorial]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/EditorialArticle.astro>
[collection]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/home/PageCollection.astro>
[categories]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/home/WikiCategories.astro>
[gamemedia]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/media/GameMedia.astro>
[gallery]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/media/ScreenshotGallery.astro>
[video]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/media/VideoEmbed.astro>
[faq]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/FAQ.astro>
[toc]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/wiki-article.ts>
[related]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/RelatedPages.astro>
[sources]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/Sources.astro>
[guidecontent]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/content/guides/getting-started.mdx>
[contentconfig]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/content.config.ts>

