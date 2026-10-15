# Two-Game Vertical Proof Baseline Inventory V1

记录日期：2026-10-08（Asia/Taipei）。模式：**READ ONLY / INVENTORY ONLY**。唯一新增文件为本文；两个游戏、V2.7 Candidate、测试、既有文档及治理入口不修改。

## 1. 判断范围与证据口径

本报告回答现有输入能否支持差异证明，不是设计、迁移或实施计划，也不是 two-game proof PASS。依据为当前工作树的配置、Inventory、路由、正文、样式、Manifest、本地资产及已有项目记录。本轮没有访问线上游戏站、重新核验 Steam、运行 build/tests/browser，或创建 proof branch/pages。

**Historical evidence ≠ current V2.7 proof.** 历史报告中的 PASS、verified、production、latest、权利状态和截图均只记录当时事实，不继承为当前采用或发布接受。现有 sources/accessedAt 是项目已记录的来源时间，不是本轮新的核验时间。

当前正式治理入口最近的 closure sections 确认 WS03、WS04A、WS05 已 ACCEPT — TECH / CLOSED；WS04A 是方法而非 runtime schema，WS05 是三个 composition methods。two-game vertical proof 仍 NOT STARTED，WS04B/WS07 未接受，Safari proof 仍 0。旧章节的旧“当前状态”不覆盖最新 closure。

路径简称仅供本文引用，**不创建任何产品字段或 authority**：

| 简称 | 实际目录 |
| --- | --- |
| B | /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2 |
| W | /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis |
| S | /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE |

下文所有简称文件路径均按此表展开；主要证据提供绝对路径链接。

## 2. 当前项目身份、范围和输入

### 2.1 Source identity

| Project | 当前 branch / HEAD / committed tree | 来源版本与当前现场 |
| --- | --- | --- |
| Bomb Farm | main / ca0ff836746749c7d9d2fb765f740a273e806cf5 / 327023aef2b2225d6e778426cf863f127e01fd90 | [Project Brief][bf-brief]记录 Starter starter-v2.0.0，基准 e4964e1f640763f2c55db9f48446ac0dbe87afa3，SOP 2.2，Master Prompt v2.4Final；后续有项目 V2.1 visual/media enrichment 及本地化等扩展。不能将目录名 v2 或 enrichment V2.1 当成 V2.7 Core 版本。当前有 7 个已跟踪修改、4 个 untracked 文件，主要涉及广告修复；不是 clean working tree。 |
| War of Genesis | main / 3784e8852ffb3c17cdea79d721adfaf1db1bc70c / 475d12470f4cf32a5030234c01c6d5cffc117ecf | [Project Brief][w-brief]记录 Starter starter-v2.6.5，基准 29b25559cf2af859bca359c7f7fda686a4803c95，基准 tree 0920c9de216ada5601f681d81e4345cf69fb65e8；SOP/Master Prompt v2.6.5。已有 market/builds/fee-tool 项目扩展。当前没有已跟踪 diff，但有 60 个 untracked 文件，包括历史报告、artifacts 和 .vercel；不是完全 clean。 |
| V2.7 Starter Candidate | v2.7/evolution / b067e8d4050478072f25a1dc78a8526cdd128cfd / 1df0ade30b1eaf51a76820c8d8b83337786f0dc1 | 当前工作树包含已接受的 WS03 实现及后续修订，不能只用 committed HEAD/tree 描述全部当前源码。64 条 Git status 记录。本轮读取工作树，不 reset、commit 或创建新分支。 |

Git 数量为本轮只读快照；已有改动均保留。HEAD/tree 是提交身份，不声称等于当前 working-tree tree。

### 2.2 有效页面数量与实际 consumer

“有效”在本轮仅表示通过当前源码 catalog 条件、存在对应路由/正文承载，不表示本轮已构建、已部署或当前线上可达。两个项目的 `src/core/catalog.ts` 均按 **public + publicationStatus=published + feature enabled** 过滤。

| Project | Inventory / enabled 数量 | 主要真实 page families / consumers | 排除与限制 |
| --- | --- | --- | --- |
| Bomb Farm | Inventory 34；启用业务页面 **19**：home 1、hub 4、guide 13、patch 1 | 首页 `src/pages/index.astro`；guide hub/8 个 MDX article 由 `src/pages/guides/[...slug].astro` 消费；`src/pages/[...path].astro` + StaticWikiPage + `src/core/p0-static-wiki-copy.ts` 消费 heroes/roles/rotation、updates、tools、FAQ 等静态内容 | 15 个 private/draft 规划条目不算现成页面。`src/core/fixed-pages.ts` 另列 about/privacy/terms/404 四页，因此 EN route 基础共 23；`src/locales/routes.ts` 和 `[locale]/[...path].astro` 声明另外 46 条 JA/PT-BR 路由，总共 **69 个源码声明的语言路由**。这不是 69 个独立任务，也不是本轮 L10n/build 验收。 |
| War of Genesis | Inventory 18；启用 **17**，其中 404 一页，排除 404 后 **16** | home 1；hub 4（guides/market/builds/tools）；guide 6（3 个 MDX + 3 个 market 静态正文）；calculator 1；search 1；about/privacy/terms 3；404 1 | demo-sentinel 的 heroes feature 关闭，不算启用页面。没有真实实体数据库。旧 Phase 1 的 12 strategic-page 规划数字不能替代当前 17 条启用记录。 |

源码证据：[BF Inventory][bf-inv]、[BF routes][bf-guide-route]、[WoG Inventory][w-inv]、[WoG market route][w-market]、[WoG guide route][w-guide-route]。PageType=guide 本身不足以证明 Task Guide；本报告另外检查正文问题、选择依据和动作。

### 2.3 内容、facts、媒体、theme 和 navigation

| 事实 | Bomb Farm | War of Genesis |
| --- | --- | --- |
| 当前真实内容 | 8 个 EN guides MDX，另有各 8 个 JA/PT-BR guides；静态 copy 模块提供 hero roles/energy rotation、achievements、updates、FAQ、homepage facts。不是只有 Starter 示例。 | 3 个实际 guides MDX：beginner-guide/farming/gear；market route 内有 hub、sell-candidate framework、selling checklist、fees explainer；builds 为目标/可靠性/装备成本的决策正文，tools 有实际 fee calculator。不是只有 Starter 示例。 |
| 来源与深度 | Inventory sources 主要为 Steam store、achievements、announcements、EULA/Support，少量 community；accessedAt 多为 2026-09-04。正文使用已记录的矿区、三队轮换、四种角色、Forge/Ritual/世界/成就输入，但明确不提供未核实节点、掉率、BIS 和市场价格。 | guides 的 sources 为 operator/editorial 自站引用；market/fees 记录 Steam Support、app-filtered market 和具体 listing，accessedAt 多为 2026-09-15。确有可执行的 qualitative decision 内容，但自站引用不是独立机制证据；没有已证明的职业/对象/stage 数据和真实掉率。 |
| 结构化 facts / tools 输入 | `src/data/facts/**`、`src/data/tools/**` 都没有 JSON 数据；英雄 hub 是静态角色/轮换说明，不是英雄对象数据库。 | 同样没有 facts/tools JSON 数据；Steam fee calculator 是项目专用实现，不由 generic tool JSON 驱动。没有 class/item/stage 对象库或真实 build ranking。 |
| Manifest 与资产 | [Manifest][bf-media] 为 **22 assets / 15 page mappings**：21 image + 1 video。21 image 中 7 个 Steam 截图/key art、10 个成就 icon、4 个原创说明 SVG；视频有额外 poster。22 条 src 都有实际本地文件，video poster 也存在；共 23 个已登记/附属媒体文件。`public/media/` 当前另有 header brand mark，因此实际媒体文件总数 **24**。 | [Manifest][w-media] 为 **0 assets / 0 mappings**；`public/media/` 除 README 没有资产。`public/logo.svg` / favicon 是站点标记；`public/og-default.png` 是品牌分享图，均不能算解释机制的游戏媒体。 |
| 媒体来源/rights | 每项有 sourceUrl、alt、caption、本地路径和映射。enrichment 报告记录 Steam CDN/成就/官方 trailer 与原创 diagram provenance。旧 gap 报告记录当时没有明确 reuse approval；enrichment 记录素材已加入，却未提供可定位的正式权利关闭记录，且当前 Manifest 无 rightsRef。不能推定当前全部已获授权。source provenance ≠ rights approval。 | 没有可复用的游戏媒体 rights/placement 记录。品牌 OG 可作为站点品牌素材事实，但不能由其名称推定为官方游戏 key art、游戏截图或获得官方媒体许可。历史 QA 网页截图不是 gameplay media。 |
| 当前 visual identity | warm mine/wood/iron 色值、重型 condensed sans display、真实游戏 UI 截图。Header 当前直接引用 `public/media/brand/bomb-farm-wiki-mark.webp`，favicon 为 PNG；旧报告写的 SVG favicon/CSS bomb mark 只是历史状态。 | Forged chronicle 配色：coal/mist/brass/steel；serif display；`logo.svg` 为方底 W 字母 + 红线，非已证明官方游戏标志；OG 有 War of Genesis Wiki 标题、地图/金属背景，是编辑品牌图。 |
| taxonomy / navigation | [Config][bf-config]：Guides、Heroes（roles/rotation）、Gear & Ritual、Progression、Updates、Tools（achievements/system requirements）；按游戏系统组织，但保留通用 Guides/Tools 标签。heroes 实体 feature 仍 false；news/search/calculator/planner false。 | [Config][w-config]：Guides（beginner/farming/gear）、Market（三个决策/出售/费用入口）、Builds、Tools（fee calculator）；guides/search/calculator true，实体/news/planner false。市场与装备取舍链条真实存在，但不是 class/item taxonomy。 |

本轮实际查看了 BF `public/media/systems/forge-equipment.webp`：存在 Forge/装备格和 Ritual 界面上下文，属于解释性游戏截图，非 logo。截图 UI 包含葡语标签；文件存在和画面内容不证明当前补丁/英文操作对应关系。也实际查看了 WoG `public/og-default.png`：它是 branded title/map-metal 分享图，没有 gameplay/system 解释。

## 3. 三个 Pattern 的现有基础与候选

### 3.1 已有基础

| Pattern | Bomb Farm 已有基础 | War of Genesis 已有基础 |
| --- | --- | --- |
| Wiki / Hub | 首页游戏范围、真实系统入口、WikiCategories、PageCollection、FAQ、sources、映射媒体；guides 为有目录范围和真实 guide links 的索引；heroes/tools/updates 为静态任务入口。没有启用实体数据库。 | guides 索引、首页集合、market 三条任务入口、builds 三种目标、tools 实际计算器入口。Market 用 EditorialArticle 中的链接/decision-grid，不是新的 Hub framework。没有实体数据库。 |
| Task Guide | how-to-play 有明确矿区循环和四步动作、运行时检查、轮换/装备后续入口；getting-started 有 first-session route；controls 有检查/排错。skill-tree 主要为边界说明，没有精确节点操作，不能仅因 pageType 就算已证明的技能树任务指南。 | gear 有六步 keep-or-sell sequence、keep/sell 条件、未明时保留物品的停止条件和人工 next links；farming 有 advance/stay/step-back；selling checklist 有 eligibility、操作/确认及 safe stopping points。不是自动推荐或价格预测。 |
| Media-rich Article | WikiArticle + MDX、GameMedia、ScreenshotGallery、VideoEmbed、TOC/FAQ/Related/Sources 已被实际 Manifest 使用；Gear/Ritual、How to Play、Progression 等有说明性游戏媒体。 | 同名媒体组件与 article shell 技术上存在，但零 Manifest/零解释性游戏资产，当前没有真实采用的 media-rich article。logo/OG/历史网页截图不补这个缺口。 |

专门 QuickAnswer/Steps/NextStep 组件不存在；普通正文/列表/条件/链接已承载这些最小职责。RelatedPages 是关联阅读，不等于 task-oriented Next Step；Comparison 不作为这三个 Pattern 的 Required。

### 3.2 候选表（不是 proof 页面设计决定）

每游戏最多一项/Pattern；以下是盘点中最接近的现存页面，不表示选择已经批准，也不宣布其满足产品验收。

| Game | Pattern | Candidate Page ID / Route | Why Candidate | Existing Content | Existing Media | Current Limitation |
| --- | --- | --- | --- | --- | --- | --- |
| Bomb Farm | Wiki / Hub | home / `/` | 说明矿区/队伍/装备范围，提供真实系统与入门入口 | GameHero + homepageQuickFacts；WikiCategories；featured/system/update/browse collections；FAQ/Related/Sources | battle hero；Map/Forge/House gallery；official local trailer | 属于旧项目定制首页，不是当前 V2.7 采用；素材 rights/current contract 与游戏信息时效未在本轮关闭 |
| Bomb Farm | Task Guide | guide.how-to-play / `/guides/how-to-play/` | 回答如何运行矿区循环：推进、强化、三队轮换、复查变化；给出运行中和间歇操作 | `how-to-play.mdx` 开头直接解释循环；4-step ordered list；系统链接与 patch-sensitive habits；FAQ | battle hero；Ritual/Forge gallery；local trailer | 结果说明主要是定性进展/保持运行，缺精确阶段、资源门槛和失败恢复证据；不是 Task Guide 产品 PASS |
| Bomb Farm | Media-rich Article | guide.gear-and-ritual / `/guides/gear-and-ritual/` | 正文解释 sealed drops、强化、fusion、Ritual 与核对边界，媒体可帮助识别对应界面 | `gear-and-ritual.mdx` 四个正文段落区块；FAQ；Sources/Related | **实际 mapping：hero=system.ritual-sealed-drop；gallery=system.forge-equipment + system.ritual-heroes** | 正文约 347 个空白分词（含 frontmatter），深度有限，没有操作值/概率；素材局部非英语、rightsRef/dimensions 缺失。只证明有候选内容和媒体，非完整 current-proof 接受 |
| War of Genesis | Wiki / Hub | hub.market / `/market/` | 有明确 market 范围，导向筛选物品、完成出售、理解费用三个真实入口 | market route 中 decision-lede、task grid、eligibility/price-view/stop-boundary 正文；人工 tool/gear/farming links | NONE；logo/OG 不计 | 当前为项目 market 扩展模块/route；链接的 calculator 也是项目扩展，不能声称已在 V2.7 Core 采用 |
| War of Genesis | Task Guide | guide.gear / `/guides/gear/` | 明确回答使用/保留/出售某件物品的取舍，六步行动及 keep/sell 条件可执行 | 实际 guides MDX + WikiArticle；direct question；build fit/replacement/eligibility/trade-off sequence；停止条件、人工 next links、FAQ | NONE；最小 Task Guide 本身不强制媒体 | 来源主要是 qualitative editorial framework；无真实装备实例/数值/当前游戏观察。现有内容有用，但游戏特异性和来源充分性还不能等同真实玩家 proof |
| War of Genesis | Media-rich Article | **NO CURRENT CANDIDATE** | 空 Manifest，没有解释性截图/figure/gallery/video | 有长文 shell 和已有文字，不能单靠它们凑媒体 Pattern | **0 game media assets / 0 mappings** | branded OG、站点 W logo 和历史网页 QA 截图都不能补为游戏媒体；缺口在当前输入，不是缺 Pattern framework |

候选数量：**Bomb Farm 3；War of Genesis 2**。候选存在不等于 TECH/PRODUCT/AX/RELEASE 或 two-game proof PASS。

## 4. 六个 differentiation dimensions：当前事实

| Dimension | Bomb Farm | War of Genesis | 可支持的差异与证据边界 |
| --- | --- | --- | --- |
| A. Visual identity | background #100d0a，surface #211a13，text #f4ead3，primary #c89a48，ember #c96f3f，cyan utility；Arial Black/Avenir Next Condensed/Trebuchet display。暖矿区边框和紧凑重型标题；现有 brand image、实际 game screenshots。 | background #0f171d，surface #18252c，text #ece7dc，brass #c4a968，steel #7894a0；Iowan Old Style/Baskerville/Times display；更偏书面 chronicle，radial/grid 背景、W mark 与品牌 OG。 | 不只是颜色不同：display 字体、背景纹理、媒体有无均不同。BF 有直接游戏画面；WoG 只有编辑视觉方向，不能称已证明游戏原生视觉身份。共同 body sans/mono 和 1180px shell 仍在。证据：两项目 theme.css/global.css/Header/GameHero。 |
| B. Media treatment | 首屏 battle screen；首页 map/forge/house overview + trailer；文章 header hero、gallery/trailer；caption/source links；成就 icon 实际用于 checklist。重复使用 battle anchor，4 个 diagrams 明确非 game UI。 | 首页 hero 无媒体；article 无 Manifest media；文字/工具 lead；品牌 OG 用于 social metadata，不用于解释游戏。 | 当前是 screenshot/video-led 与 text/tool-led 的明显区别，但 WoG 缺媒体不能证明它已支持真实 media-rich 体验；来源可追溯不自动等于 rights accepted。 |
| C. Page rhythm | 当前首页顺序是 integrated GameHero（含 quick facts）→ ad seam → categories → media overview → featured → systems → updates → FAQ → browse → related/sources；guide hub 有媒体锚点和编号索引；article 有 hero/TOC/prose/gallery/FAQ。 | 首页保留 GameHero → ad seam → optional QuickFacts → StartHere → WikiCategories → featured/systems/updates → conditional media/FAQ → browse。当前无传入 quickFacts/FAQ、无 Manifest media；market/builds 使用 decision panels/grids/list/CTA；guide article 为 TOC + prose。 | 首页实际顺序并非完全相同。BF 有媒体中断与紧凑系统导览；WoG 以决策正文与工具动作推进。但 shared collections/article shell 仍有相同节奏，且本轮没有新渲染测量或视觉验收。 |
| D. Player task | 学会 mine/auto battle、三队轮换、角色职责、Gear/Ritual/世界进展；游戏循环和系统识别是主线。Steam Market 主要为安全边界。 | farming 的 advance/stay/step-back；装备 keep-or-sell/build fit/replacement；sell eligibility/confirmation；buyer/seller price-view 与费用工具连接。 | 有不同任务组织基础：BF 运转/识别系统，WoG 做装备和出售决策。两边仍共享 idle progression/gear/Steam Market；不能把泛化 market safety 文本当成完全不同任务。 |
| E. Taxonomy / navigation | 六组中的 Heroes/roles/rotation、Gear & Ritual、Progression、Updates/achievements 反映实际游戏系统。 | 四组 Guides/Market/Builds/Tools，与筛选→出售→费用→装备/刷取互链相符。 | 不只是通用 Starter 菜单，但双方都没有结构化对象分类；WoG 不存在 class/entity browse，BF Heroes 不等于实际英雄数据库。 |
| F. Article composition | store-backed system basics、campaign/role labels、注意核对的未知值、FAQ、相关说明性截图；how-to-play 是循环动作列表，Gear/Ritual 是机制说明。 | farming 是 advance/stay/step-back 分支；gear 是 keep/sell 决策序列；market 是 action panels/task grid/listing checklist，fees 是规则说明。 | 内容组织确有差别，不是全部相同 shell 换标题。但两边 guides 复用近似 WikiArticle header/TOC/prose/FAQ/Related/Sources；WoG 机制正文较泛化且无具体游戏对象例。 |

## 5. FALSE DIFFERENTIATION RISK（6 项，不是新修复任务）

| ID | 当前证据与风险 | 事实边界 |
| --- | --- | --- |
| FD-01 | **Shared lower-homepage collections**：两边 index 都有 Featured guides / Important systems / Latest updates / Browse all 及 PageCollection/WikiCategories。只比较这些区域的标题/颜色会夸大产品差异。 | 两边首屏和中段顺序实际上不同；不声称整个首页完全相同。复用组件本身不是问题。 |
| FD-02 | **Shared article shell**：两边 guides 都沿用 WikiArticle 的日期/header、TOC、正文 slot、FAQ/Related/Sources。只换文字或 H1 不足以证明不同任务体验。 | 已读正文有真实组织差异；这里记录共同基础，而非认定所有文章任务相同。 |
| FD-03 | **WoG branding without game visual evidence**：brass/steel、serif、W logo、地图式 OG 可构成漂亮编辑品牌，却不能独立证明 War of Genesis 的真实游戏视觉。 | WoG OG 不是空白或 Starter 默认图；不能把 branded 分享图当成 meaningful gameplay hero/figure。 |
| FD-04 | **Shared idle/gear/Market concerns**：BF Steam Market safety 与 WoG 市场说明都依赖人工 Steam 核对和未核实值边界。用两段泛化市场安全文字可能展示相同产品任务。 | BF mine/rotation 与 WoG keep-or-sell/farming 分支提供不同任务基础；不声称两个项目全部任务一样。 |
| FD-05 | **WoG qualitative content is not yet object-specific**：beginner/farming/gear/builds 避免虚构 mechanics，但主要是目标、可靠性、replacement 等普适框架，缺具体 class/item/stage 或 gameplay evidence。 | 内容存在且并非占位符；“名字改了”仍不能证明框架内容专属于该游戏。 |
| FD-06 | **Different inherited Core / bespoke presentation**：BF 源自 Starter 2.0 并修改首页/静态路由/localization/media，WoG 源自 2.6.5 并加 market/builds/calculator。旧站外观差异可能来自项目源码分叉。 | 当前旧站差异不能作为“同一 V2.7 Core + 不同输入”的因果 proof；历史截图/PASS 也不能补同一 Core 身份。 |

未发现可据此宣称“两个首页完全相同”“两边已经各有一个 media-rich article”或“只是换了一张游戏图片”的事实。WoG 当前根本没有解释性媒体，不把未发生的图片替换当成已发生问题。

## 6. 输入复用分类

A/B 是输入事实分类，不是实施许可或迁移步骤。复用 source/caption/date 不等于继承旧 PASS；B 不意味着需要 schema/framework。C 的历史文件和旧 FAIL/PASS 必须原样保留。

| Input / Evidence | Bomb Farm 分类与事实 | War of Genesis 分类与事实 |
| --- | --- | --- |
| 正文/任务/术语 | **A. REUSABLE AS CURRENT INPUT**：现有 mine/roles/rotation/Gear-Ritual prose、条件说明、手工链接可作为当前项目内容材料；带来源和日期边界。expired codes、latest/update-time claims 单列 B/D，不纳入“当前有效”的泛化声明。 | **A**：beginner/farming/gear 的已有 qualitative task prose、ordered lists/conditions/manual next links 可作为内容材料；不是游戏 mechanics 独立证明。market/builds 内联正文为 **B**，存在于项目 route 源码，尚非 Candidate content 输入。 |
| Page Inventory | **B. REUSABLE WITH CONTENT / CONFIG ADAPTATION**：34 条 page truth/route/source/date 记录可供事实参考；启用/草稿需区别，4 fixed pages 在独立 catalog；额外静态路由/localization 不直接成为 S 的 consumer。 | **B**：18 条记录具有真实 page identity；demo inactive。market/builds module 是项目扩展，不在 S 当前 pageModule enum；不能原样宣称 schema-compatible。 |
| facts / tool JSON | **D. NOT SUITABLE FOR VERTICAL PROOF**：没有数据，README 与 draft database/planner 不算真实对象输入。 | **D**：同样没有 facts/tools JSON；不能借 demo-sentinel 声称真实实体输入。 |
| 官方截图/key art/achievement/video 本地文件 | **B**：22 assets 的 src 文件 + poster 存在，可作为真实素材候选；17 张官方 raster/achievement 图、4 diagrams、1 video 的角色不同。当前 assets 缺 S 的 dimensions/rightsRef，video 缺 accessibleEquivalent；rights 和 patch/语言匹配不能从文件存在推定。 | **D**：没有此类本地资产或 Manifest mapping，当前无法直接复用不存在的游戏媒体。 |
| media decisions / provenance / rights | **B**：15 映射有相关媒体；旧 enrichment 表另记录 codes/tools/system-requirements/FAQ 四项 no-media 决策。provenance、caption、placement 可参考，但报告不替代 current rights evidence。旧 rights-gap 审计本身 **C**。 | **D**：无实际 game media decisions/rights rows；产品 QA、品牌图不是此类记录。 |
| theme values / brand 输入 | **B**：真实 palette/font/density 有据可查；旧 global.css 与硬编码 GameHero/Header 是项目代码，不作为可直接搬入 S 的“纯输入”。brand mark 在 Manifest 外，由 Header 直接消费，provenance/rights 本轮未定位。 | **B**：当前 brass/steel/serif values 与 branded OG 可作为编辑视觉材料；不是 official game evidence；market-specific CSS 和字母 logo 本身不是 proof 接受。 |
| navigation / taxonomy / related | **B**：真实 six-group system navigation 和 relatedPageIds 可参考；现有静态角色/更新/工具 consumer 与 Candidate 家族限制需区别。 | **B**：市场/装备/工具任务链和 relatedPageIds 可参考；market/builds route/module 与 tool dependency 不是 S 已采用能力。 |
| publishedAt / updatedAt / sources / patch-version 上下文 | **B**：已有日期和来源可保留为原始事实；2026-09-04 不是当前 verifiedAt。codes 的 9 月 8 日到期记录、latest update 与补丁敏感事实不能原样冒充当前状态。 | **B**：9 月 15/16 日是原时间；policy 的 verifiedAt 为特定费用策略证据，不可推广为页面 sourceCheckedAt 或当前媒体/游戏验证。self-editorial sources 仍按其类型保留。 |
| 旧 visual/media enrichment、QA/release/review reports | **C. HISTORICAL REFERENCE ONLY**：PROJECT_BRIEF/CURRENT_STATUS/VISUAL_MEDIA_GAP_REPORT/V2_1_* 记录旧版本与过程，包括素材来源、旧布局及未完成的人审。 | **C**：Phase 0/1/5.5/prelaunch 等记录旧实施/QA/release，旧 PASS 不可继承为 V2.7 proof。 |
| 旧 screenshots | **C**：Human Visual Review Evidence 指向 `/tmp/bombfarm-v2_1-human-review/`；本轮检查的 home-1440-first.png 已不存在，文档清单不等于仍有当前截图。人审状态 READY FOR HUMAN VISUAL REVIEW，不是已签字接受。 | **C**：`artifacts/prelaunch-qa/home-desktop-1440-final.png` 当前存在；其它 prelaunch 截图文件也存在。它们是旧网页渲染记录，不是当前 V2.7 截图，也不是能加入 article 的 game screenshot。 |
| Starter 教程/占位内容/旧 PASS / expired 断言 | **D**：generic README、private planned DB/Market values、已经过期的代码或旧“latest”不能作为有效游戏/当前采用证明。 | **D**：generic authoring README、inactive demo entity、branded title 图当作 gameplay、旧发布 PASS 当作当前 proof 均不适合。 |

### 当前输入与 V2.7 authority 的已观察边界

S 的 [Page Inventory schema][s-page-schema] 仍拥有 page truth、module/pageType/publish/source/date；[media schema][s-media-schema] / [media presentation][s-media-presentation] 要求 dimensions、rightsRef，视频还有 accessibleEquivalent，credit 可选。B 的当前 Manifest 不能直接通过这些已存在的输入要求；这不是新增模型需求。

W 的 market/builds modules、`src/components/SteamMarketFeeTool.astro` / `src/components/islands/SteamMarketFeeCalculator.tsx` / `src/core/steam-market-fees.ts` / `src/core/steam-market-policy-freshness.ts` 是真实项目 consumer。当前 S 没有因此获得这套项目扩展，不能把 W 的计算器 PASS 或其策略日期当成 S 的 proof。

两边旧 WikiArticle/EditorialArticle 都将 sources/accessedAt 展示为 Last verified；S 当前 `resolvePageFreshness` / WikiArticle 使用 **Sources checked**，保留 publication/update/source/version 语义，不拥有已退役 generic liveStatus。旧标签只记录为旧项目事实，不修改或恢复 S 的已接受语义。

S 当前 Manifest 为空、facts/tool JSON 为空；它已有被 WS05 接受的 TECH capability，而非已经采用这两个游戏。没有新增 schema、type、field、Pattern ID/enum/registry/dispatcher/wrapper/composition engine 的必要事实被本轮发现。

## 7. 核心判断（输入就绪度，不是 proof verdict）

就绪度口径：HIGH 表示当前内容、三类候选、解释性媒体和来源/当前输入契约均有较完整基础；MEDIUM 表示有可用真实任务与候选，但有重要输入缺口或证据/契约待区分；LOW 表示连可用游戏任务/内容入口基础也不足。本轮只按已观察事实判断，不要求完整网站覆盖。

### Bomb Farm

**CURRENT PROOF INPUT READINESS: MEDIUM**

三类候选都有现存内容和实际媒体，矿区/轮换/Ritual 的视觉与导航基础较充分，明显超过只有名称/配色的模板。但是旧 Manifest 与 S 契约不一致，未定位当前权利关闭证据；资料多为 9 月初、部分 codes/update 已过期，正文是系统说明而非精确游戏操作证明。完整历史站的定制代码也不能直接证明同一 S 下的产品差异。因此不将“素材多”提升为 HIGH 或当前产品接受。

### War of Genesis

**CURRENT PROOF INPUT READINESS: MEDIUM**

已有 market/gear/farming 的真实决策正文、导航和人工 next action，足以支持 Wiki/Hub 与 Task Guide 的输入讨论，不是空站。但解释性游戏媒体完全缺失，mechanics/entity evidence 较弱，视觉主要为编辑品牌；额外 market/builds/calculator 来源于项目代码。没有合格 Media-rich Article 当前候选，不能为凑三种 Pattern 计入 logo/OG。

### 双游戏输入是否足够

**CAN CURRENT PROJECT INPUTS SUPPORT A MEANINGFUL TWO-GAME DIFFERENTIATION PROOF WITHOUT NEW FRAMEWORK CODE? PARTIAL**

已存在不同内容任务、术语、导航、字体/配色和节奏基础，可支持有意义的差异讨论；当前输入不足以直接证明两个游戏均在同一 S 上完成三个 Pattern，尤其 W 缺解释性媒体、B 媒体/current-rights-input evidence 不齐。这里只判输入，不要求两个完整站。

**NEW FRAMEWORK CODE REQUIRED: NO**（对已接受三个最小 Pattern）。现有 S 的 hub/list/article/MDX/media seam 已获 TECH 接受；当前缺口是内容、媒体及其来源/契约证据，未发现需要 framework 的新 consumer。W 旧费用工具不属于三个 Pattern 最小 Required，因此它的项目扩展不能作为必须新增 framework 的理由。此判断不保证任意旧项目功能可无改动移植，也不制定移植方案。

## 8. 本轮结束边界

- PRODUCT CODE DELTA = 0；TEST CODE DELTA = 0。只新增本报告。
- 未修改 PROJECT_STATE、TASK_LEDGER、ROADMAP、Amendment 或 WS03/WS04A/WS05 接受依据。
- 不创建 proof branch/page/content/media/theme，不启动 WS04B/WS07；不制定逐文件实施计划；不 commit/push/tag/merge/release。
- 不宣布 Bomb Farm/WoG/two-game proof PASS，PRODUCT/RELEASE ACCEPT 或 Safari/AX PASS。
- **TWO-GAME VERTICAL PROOF: NOT STARTED.** 完成本轮 Inventory 后 STOP。

## 9. 主要证据链接

[bf-brief]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/docs/PROJECT_BRIEF.md
[bf-inv]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/src/data/page-inventory.json
[bf-config]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/game.config.ts
[bf-guide-route]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/src/pages/guides/[...slug].astro
[bf-media]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/src/data/media/media.json
[w-brief]: /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis/docs/PROJECT_BRIEF.md
[w-inv]: /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis/src/data/page-inventory.json
[w-config]: /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis/game.config.ts
[w-media]: /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis/src/data/media/media.json
[w-market]: /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis/src/pages/market/[...slug].astro
[w-guide-route]: /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis/src/pages/guides/[...slug].astro
[s-page-schema]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/page-inventory.ts
[s-media-schema]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/media.ts
[s-media-presentation]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/media-presentation.ts

其他直接证据：

- [BF 首页][bf-home]、[BF Task Guide][bf-task]、[BF Gear/Ritual][bf-gear]、[BF theme][bf-theme]、[BF global CSS][bf-css]。
- [BF 静态 copy 汇总][bf-copy]、[BF locale routes][bf-locales]、[BF fixed pages][bf-fixed]。
- [BF 旧 enrichment 报告][bf-enrich]、[BF 旧 rights/visual gap][bf-gap]、[BF 旧人审证据清单][bf-human]。
- [WoG gear task 正文][w-gear]、[WoG farming 正文][w-farming]、[WoG builds consumer][w-builds]、[WoG 首页][w-home]、[WoG theme][w-theme]、[WoG global CSS][w-css]。
- [PROJECT_STATE][state]、[TASK_LEDGER][ledger]、[Simplification Amendment][amendment]、[WS05 Final TECH Review][ws05-review]、[WS05 Minimal Design][ws05-design]、[WS05 Baseline Conformance][ws05-conformance]。

[bf-home]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/src/pages/index.astro
[bf-task]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/src/content/guides/how-to-play.mdx
[bf-gear]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/src/content/guides/gear-and-ritual.mdx
[bf-theme]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/src/styles/theme.css
[bf-css]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/src/styles/global.css
[bf-copy]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/src/core/p0-static-wiki-copy.ts
[bf-locales]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/src/locales/routes.ts
[bf-fixed]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/src/core/fixed-pages.ts
[bf-enrich]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/docs/V2_1_VISUAL_MEDIA_ENRICHMENT_REPORT.md
[bf-gap]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/docs/VISUAL_MEDIA_GAP_REPORT.md
[bf-human]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/docs/V2_1_HUMAN_VISUAL_REVIEW_EVIDENCE.md
[w-gear]: /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis/src/content/guides/gear.mdx
[w-farming]: /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis/src/content/guides/farming.mdx
[w-builds]: /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis/src/pages/builds/index.astro
[w-home]: /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis/src/pages/index.astro
[w-theme]: /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis/src/styles/theme.css
[w-css]: /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis/src/styles/global.css
[state]: /Users/randyz/work/coding/hot_words_web/template/PROJECT_STATE.md
[ledger]: /Users/randyz/work/coding/hot_words_web/template/roadmap/V2.7_TASK_LEDGER.md
[amendment]: /Users/randyz/work/coding/hot_words_web/template/architecture/V2.7_ARCHITECTURE_SIMPLIFICATION_AMENDMENT_V1.md
[ws05-review]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws05/WS05_FINAL_TECH_REVIEW_V1.md
[ws05-design]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws05/MINIMAL_WS05_PATTERN_DESIGN_V1.md
[ws05-conformance]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws05/WS05_PATTERN_BASELINE_CONFORMANCE_V1.md
