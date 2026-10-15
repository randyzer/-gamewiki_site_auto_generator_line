# Two-Game Vertical Proof Design V1

日期：2026-10-08（Asia/Taipei）。Owner：Codex / design；状态：**READY FOR INDEPENDENT REVIEW**。

模式：**DESIGN ONLY / NO IMPLEMENTATION**。唯一新增产物为本文。不修改 Starter、Bomb Farm、War of Genesis、测试、既有文档或治理状态；不制定逐文件 implementation plan。

## 1. 要证明什么

> 同一 V2.7 Core / 已接受 Pattern composition methods，通过不同的 game adaptation、content、media、theme 和 navigation 输入，产生两个明显不同、各自有用的游戏站切片。

证明对象是有限切片的产品差异与共享技术基础，不是两个完整网站、所有旧功能移植、每游戏全 Pattern 覆盖、WS04B/WS07 或发布接受。当前两游戏输入就绪度仍 MEDIUM；[已接受 Baseline Inventory][inventory]不修改，旧站状态、旧 screenshots/PASS 不转为当前 proof。

两个旧站源于不同历史 Starter，它们现在不同不能构成本次证明。换颜色、logo/title、hero 图片或复制旧 bespoke component，也不能单独构成证明。

**设计可在同一 Core 上完成，不表示当前输入已足够执行或 proof 已通过。** 媒体权利、当前输入契约、内容真实性和 WoG 游戏特异性是实际 proof 的接受条件；条件未满足时保留缺口，不降低标准或编造证据。

## 2. 最小 surface 取舍

| 方案 | 判断 | 原因 |
| --- | --- | --- |
| **四个代表页：每游戏一个入口和一个正文** | **采用** | 既有真实入口→答案旅程；同一 WikiArticle 上可比较两种正文；BF 任务页同时有解释性媒体，覆盖三种 composition roles 不必拆为三页 |
| 每游戏只有一个正文，共两页 | 不采用 | 可比较文章，却缺真实 hub/navigation 入口与首屏节奏证据；将目录职责硬塞入文章会削弱 proof |
| 每游戏各三个 Pattern，共六页 | 不采用 | WoG 当前无 Media-rich Article 候选，形式对称会迫使凑媒体；BF Gear/Ritual 与 How to Play 的媒体能力有重叠，新增页面不能提高本轮最小证明力 |

四页是本设计的最小**代表页集合**：入口与正文分别承担职责。不要求每页单独证明六维，也不按 pageType/Pattern 名称计完成。Core 必需的首页、错误页及依法启用的 support routes 属于完整输出清单，不从校验中排除；它们不自动算第五个代表产品任务。不为凑旧导航增加 farming/builds/calculator 等业务页；若发现必须另加业务页才能让选定旅程成立，应先报告 scope 变化。

### Proof Surface

| Game | Representative Page | Pattern Role | Dimensions Proven | Why Included |
| --- | --- | --- | --- | --- |
| Bomb Farm | `home /`：原候选首页意图，经 V2.7 原生首页能力呈现 | Wiki / Hub | A visual；B media；C entry rhythm；D mine/rotation task framing；E navigation | 有真实矿区/队伍/装备输入，能给出范围和通往正文的入口；不复制旧集成 quick-facts、Steam CTA 或 bespoke GameHero |
| Bomb Farm | `guide.how-to-play /guides/how-to-play/` | Task Guide **兼具 Media-rich Article role** | B explanatory media；C article rhythm；D run/upgrade/rotate job；F action-loop composition | 现有正文有循环步骤、运行中观察及边界，现有 Manifest 已有 battle/Ritual/Forge 映射；用同一 WikiArticle 即可承载任务与媒体，不创建第二套文章组件 |
| War of Genesis | 原 `hub.market /market/` 的**市场决策目录意图**；proof 使用原生 guides hub **`/guides/`** | Wiki / Hub | A text-oriented visual；B intentional no-media；C scan/list rhythm；D market-preparation decision；E bounded task navigation | 复用原 market 范围/决策线索，将首轮承诺收窄为有实际答案的装备取舍入口；至少一条有效链接进入 Gear。原 `/market/` 地址、module、task grid、fee CTA 不作为必须移植的契约 |
| War of Genesis | `guide.gear /guides/gear/` | Task Guide | B no-media adequacy；C conditional prose rhythm；D keep/use/sell decision；F conditions/checklist/stop/next-action composition | 已有六步 sequence、keep/sell 条件、未明时停止和人工后续动作；原 guides/MDX/WikiArticle consumer 最接近 S，无需旧 calculator 或 market framework |

WoG hub 的 `hub.market` 是**旧输入定位**，不是新的 Pattern ID 或第二份 route authority。最终 proof 页面身份与路由只由其原 Page Inventory 持有；这里选择原生 `/guides/`，不声称 S 支持旧 market module。原生 guide hub 只提供 title/description/list/media seam，不能承诺它自动呈现旧 market action panels、任意 hub MDX 或三栏 task grid。

BF How to Play 的双 role 不修改 Inventory 的分类，不将 Inventory 中原 Media-rich 候选重写。它已有解释性媒体和足够承载解释的正文，因此同一页可以同时证明动作和媒体支持；单张 decorative hero 仍不合格。

### 首轮不纳入的候选/功能

- **BF `guide.gear-and-ritual`**：仍是有效媒体候选，但首轮解释性截图可在 How to Play 上证明；独立纳入会扩大页面量，并使两边主题更偏共同 gear 而削弱任务差异。
- **WoG Media-rich Article：NOT REQUIRED**；没有合格当前候选，不新造一个。
- 两站完整旧导航、对象库、codes/latest updates、本地化、builds、fee calculator 均不作为首轮新业务 surface；当前 proof 内不能展示未实现入口或过期断言。必要外部官方来源链接明确是外部参考，不冒充第二个本地 proof 页面。

## 3. 同一 Core：必须共享与可以不同

### 必须共享

两份输出须来自**同一当前 V2.7 Candidate 工作树基线**。S 当前 branch 为 `v2.7/evolution`，HEAD 为 `b067e8d4050478072f25a1dc78a8526cdd128cfd`；工作树包含已接受修订，单独 HEAD/tree 不足以证明相同源码。执行时须记录实际共同基线及现有未提交差异，而不是用 iteration33 的旧 fingerprint 代替。

| Shared technical authority / capability | 不可因游戏而分叉的内容 |
| --- | --- |
| Page Inventory / catalog / resolution | 同一 pageType/module/feature/publication/route/contentRef/legal-safety 规则；拒绝缺失或无效引用；不新增 market/builds module、Pattern 分类或绕过验证 |
| Native page consumers | 同一首页入口、guides hub/list、guides render→WikiArticle、BaseLayout/Header；可选用不同现有 consumer，但不替换为旧站 bespoke rendering |
| Media | 同一 schema/catalog/GameMedia/ScreenshotGallery/VideoEmbed/media-presentation、尺寸、alt/source/rightsRef/video equivalent 规则；缺媒体不伪造输出 |
| SEO / freshness / search / safety | 同一 canonical/robots/sitemap/structured identity、publication/update/sourceChecked/version、Core safety 和实际启用功能的验证；不恢复 liveStatus，也不把 sourceCheckedAt 当 verifiedAt |
| Styling mechanism / dependencies | 同一语义 token 消费、响应式/可访问性规则、原 presets 和 dependency/lockfile 基线；主题值可不同，机制不变 |
| Pattern composition methods | 同一 WS05 最小职责；MDX 表达 Quick Answer/Steps/Next Step；Comparison 继续 DEFER；不新增 wrapper、DSL、registry、Pattern ID/enum/schema |

### 可以不同：仍由原 authority 持有

- 内容问题、直接答案、术语、动作、条件、人工 Next Step：由原 content/MDX 或原 page title/description 输入承载。
- Page IDs、routes、feature/publication、sources/dates/version：只在原 Page Inventory / Config 等既有 authority 定义，设计记录仅引用。
- 视觉值：使用现有 `theme.css` 的 semantic color、`--role-font-*`、spacing/padding/radius 等 token 输入；同样的 token/rule 机制可给出不同字体、密度和 surface。`visualRoles` 仅为可选 preset/compatibility helper，不作为新的长期适配模型或必填契约。
- 媒体选择、caption/credit、来源/权利决定和 page mapping：原 Manifest/原 media decision authority；BF 用真实解释性媒体，WoG 可选清晰文字决策体验。
- Navigation/related paths：原 config / Inventory；范围只承诺存在的答案，不能照搬旧六组/四组菜单后留下死链。
- 页面节奏：选择已有首页、hub/list、文章及已有可选模块，结合不同 MDX 结构和媒体有无产生差异；不改变 Core 固定模块顺序、制造任意 block 排序输入或复制旧 CSS 布局。

**同一 Core 的最小可审计证据**：一个共同基线记录（HEAD + 对该 HEAD 的实际 Core 修订）、两侧相对共同基线的输入 diff、消费链/依赖一致的有限对比。Core/组件/renderer/route rules 相同；theme 文件的可变值与原机制明确区分。不需要新增 snapshot 工具或 6000+ protected-file hashing。如果为了差异需要改 Core/consumer/样式机制，本设计不授权，先报告。

## 4. Acceptance Matrix：六维最低人工 PASS 条件

各维要求同时具备**实际输出 + 对应输入/来源解释**。漂亮截图或一张声明表不能独立通过。首轮六维全部满足且同一 Core 证据成立，才可接受这个有限 differentiation proof；一维缺证据就保留未通过，不用平均分抵消。

| Dimension | Bomb Farm Expected Evidence | WoG Expected Evidence | PASS Condition | False-Proof Guard |
| --- | --- | --- | --- | --- |
| A. Visual identity | 经来源支持的 mine/squad/rotation/Ritual/Forge 上下文、符合当前 V2.7 contract 的解释性游戏媒体、由真实游戏视觉依据支持的 typography/density/surface，以及游戏特异性 taxonomy/task structure | 可核对的 WoG visual evidence、game-specific terminology/context、taxonomy/task evidence，支持实际 Adaptation/content/theme 选择；generic editorial styling 本身不构成识别依据 | 在同尺寸 Review 输出中遮住 **logo、site name、game name、explicit page title** 后，reviewer 仍必须判断哪一个是 **Bomb Farm**、哪一个是 **War of Genesis**，并给出至少两项非 logo/title 的识别依据；这些依据必须包含真实 **game-specific evidence**，足以支持两个具体游戏/站点的识别结论，而不只是区分样式或任务类别 | 不同颜色、serif vs sans、warm vs cool、一边有图一边无图、generic fantasy/industrial styling、generic gear/market/idle prose 均不能单独满足条件；generic brass/steel/serif/W logo 或 branded OG 不足。若现有 WoG 输入不足以在遮名后识别为 War of Genesis，A 必须 **FAIL / remain unproven**，不得降低标准 |
| B. Media treatment | 至少一种 rights/source 合格的**解释性**游戏媒体在正文页实际渲染；图注或文字说明它帮助理解哪一步/对象，非重复装饰 | 四页范围内的 WoG 目录/装备取舍，文字足以说明条件、检查和停止；原 media decision 记录有用性判断与仍缺证据 | BF 媒体有理解作用且当前 contract 合格；WoG 所选任务不依赖缺失截图才能执行/判断，输出无空媒体槽，读者无需 logo/OG 得到答案 | 只有“Manifest 空”不能证明 intentional no-media；需要图才能认界面/物品时保持缺口和该任务阻塞，不能改称 NOT REQUIRED |
| C. Page rhythm | 首屏范围/真实截图锚点→可达的 mine-loop 正文；文章通过已有 hero/prose/解释性 media 形成学习循环 | 紧凑范围/任务列表→直接的装备取舍正文；文章通过问题、条件、检查、停止/后续动作推进 | entry pair 与同 shell article pair 的全文/首屏对照显示不同信息密度、注意力转移和任务推进；reviewer 能写出两条不同阅读路径。顺序相同的 shared shell 不妨碍不同正文，但仅换 heading 名称不算 | 不复制旧 BF 首页媒体前移逻辑或 WoG task-grid CSS；不用改变 Core 顺序制造区别。两边均能到答案，而非一边因内容缺失显得“简洁” |
| D. Player task | “矿区循环怎样运行，何时观察进展/升级/换队”及可据来源作出的结果检查 | “这件装备应保留/使用还是值得检查出售”，包括适用、资格、replacement/build-fit 和停止条件 | 每侧 reviewer 可指出问题、首段直接答案、动作/判断依据、完成或停止判断；把两边答案互换会不能回答各自问题 | 不用两份泛化 idle/Market 安全文本充当不同任务；不编旋转计时、物品利润或掉率；所需机制未经证实就不声称任务已证明 |
| E. Taxonomy / navigation | 入口标签和范围指向 mine/队伍/成长循环；至少一条内部有效路径直达 How to Play | 市场准备/装备取舍目录范围；至少一条有效内部路径直达 Gear，并清楚界定首轮没有出售工具/完整市场库 | 展示原 config/catalog 输入和点击证据；玩家无需理解 Starter 术语即可找到对应答案，标签/范围/落点一致；不存在 unknown/disabled/空分类入口 | 小切片允许只有一条核心答案路径；不复制完整旧 taxonomy 或把 Guides/Tools 换名字后仍提供相同/虚构覆盖 |
| F. Article composition | 同一 WikiArticle 中以四部分 mine loop、运行中观察、间歇系统与适用边界组织正文，媒体指向这些解释 | 同一 WikiArticle 中以 exact-item 问题、六步选择、keep/sell 条件、停止与人工后续动作组织正文 | reviewer 能指出正文结构差异：BF 的循环动作/观察 vs WoG 的分支取舍/停止；每段有任务作用，至少一项后续动作有条件与有效目标；不是只有 H2 文案不同 | 复用 WikiArticle/TOC/FAQ/Sources 本身不算差异；Related 不能代替条件化 Next Step；专门 QuickAnswer/Steps/NextStep 组件仍不存在 |

视觉遮名只用于 Review 对照材料，不要求修改产品 title/SEO，也不设计新的 masking 工具。共同 shell 和图文位置由现有组件限定；不承诺任意媒体穿插。

Visual Identity 的正式要求是：**reviewer 能识别正在查看的是哪个具体游戏/站点，而非仅能区分两个体验**。识别依据须追溯到真实游戏输入；字体、密度和 surface 只有受到真实游戏视觉依据支持时才可作为辅助依据，不能以 generic styling 代替 game-specific evidence。

WoG 当前 visual/game evidence 较弱。实际 proof 中，若遮掉显式名称后仍无法凭真实游戏证据识别为 War of Genesis，则该 dimension 必须 **FAIL / remain unproven**；不能因 BF 已被识别或 WoG 使用 editorial styling 就接受另一侧。允许在 proof 实施前补充经核实的 WoG visual evidence、game-specific terminology/context 或 taxonomy/task evidence，进入已有 Adaptation/content/theme authorities；不新增 runtime field、schema、Pattern component 或 framework，本轮不执行补充。

WoG 继续允许 **text/decision-led media treatment**，首轮 **Media-rich Article 仍 NOT REQUIRED**。用于支撑 theme/adaptation 的 visual evidence 不等于必须将 gameplay screenshot 渲染在文章里；不改变 §4 B 的媒体判断或 §6 的 no-media 边界。

## 5. 六个 FALSE DIFFERENTIATION RISKS 的防伪设计

| Risk | 首轮规避原则 | reviewer 应拒绝什么 |
| --- | --- | --- |
| FD-01 shared homepage collections | 比较 BF 原生首页入口与 WoG 原生 hub/list 的不同职责，并沿链接到正文；共同 collections 不记作差异证据 | 只用 Featured/Systems/Updates/Browse 的改名或配色通过；空集合、重复入口数量当作丰富性 |
| FD-02 shared article shell | 两个正文都用同一 WikiArticle，专看直接答案、loop vs keep/sell 分支、结果/停止和媒体解释作用 | 同样 TOC/FAQ/Related shell 换 H1，被称为两种产品；为了“不同”造新 article wrapper |
| FD-03 WoG branding without game visual evidence | 按 §4 A 遮住 logo、site name、game name、explicit page title，reviewer 必须凭真实 game-specific evidence 识别为 War of Genesis，并为两个游戏的识别结论给出至少两项非 logo/title 依据；generic brass/steel/serif/W logo、branded OG 均不足。证据不足则 Visual Identity **FAIL / remain unproven** | 仅凭通用编辑风格或图片有无区分体验就算识别站点；为降低标准临时抓图、虚构机制或复制旧 bespoke UI。补充证据只进入已有 authorities，不创建新 runtime/schema/component/framework；WoG 无需首轮 Media-rich Article 的决定保持 |
| FD-04 shared idle/gear/market concerns | BF 聚焦 mine/auto-battle/三队轮换循环；WoG 聚焦具体装备的使用/保留/出售判断；双方 shared safety 只作边界 | 将共同 market 安全文字或泛化进度口号作为主要问题与答案 |
| FD-05 WoG qualitative content too generic | 必须将至少一个实际判断绑定到可核对的 WoG 上下文/来源，例如现有 app/item eligibility 证据；保留其日期、editorial/official 区别和未证实边界 | 单靠自站引用和“稳定刷取/看稀有度/检查 Steam”证明游戏特异性；为补例子虚构职业、物品、机制、数值。若可用证据不足，保留该维缺口，不造 facts schema |
| FD-06 inherited old project forks | 两侧从同一实际 V2.7 工作树基线、依赖和 consumer 起点产生新输出；输入差异与共享机制分开审阅 | 用旧 screenshots/旧 release PASS/不同 Starter HEAD，或旧 bespoke hero/market/builds/calculator 源码证明相同 Core |

**6/6 addressed** 只表示设计为每项定义了防伪条件；不是 6 项运行风险已消除，更不是执行后 PASS。

## 6. WoG 无 Media-rich Article 的精确边界

**WoG Media-rich Article in first vertical proof: NOT REQUIRED（NO）。**

本轮证明两个有用且不同的切片，不证明两个完整站各覆盖全部 Pattern。BF 一页可同时证明 Task Guide 和 Media-rich Article，WoG 的决策目录与文本条件可以证明另一种节奏和任务；不需要对称新增媒体页。

Intentional text/decision-led 成立须满足：所选范围的核心答案、资格/取舍/停止判断能以有来源的文字独立理解；目录真实可达；不用图片也没有缺失必要对象/界面辨认；原媒体决定记录该任务的需求判断。它不等于“WoG 游戏不需要媒体”。

如果 screenshot 会实质帮助辨认某件物品、操作位置或证明未确认机制却尚未取得，仍是**有用但未取得的输入缺口**，不得改写为不需要。可不把依赖该缺口的任务纳入本次有限承诺，但不能隐藏缺口或借 no-media 放行该任务。WoG 游戏识别/全站视觉、未来 media-rich 采用仍未证明；本设计不关闭它们。

禁止用 logo、branded OG、旧网页 QA screenshots 替代游戏媒体，禁止临时抓图凑三 Pattern。BF 已选媒体若没有符合当前权利/来源的可用输入，媒体维和首轮所定 media-rich role 不通过；不能直接退回装饰 hero 后继续宣称三种 role 已证明。

## 7. 旧输入复用原则与输入前提

| Inventory 分类 | proof 使用原则 |
| --- | --- |
| A — REUSABLE AS CURRENT INPUT | 可复用已存在的真实正文/术语/条件，保留 provenance 与日期边界；“直接复用”不保留切片外死链、旧 latest/verified 误导，不将旧源码或 PASS 当输入 |
| B — REUSABLE WITH CONTENT / CONFIG ADAPTATION | 进入原 authority 的当前有效输入：范围/route/family/feature 引用、theme 值、media metadata/决定、sources/dates、导航和人工链接；只适配本轮四页职责。没有 adapter/schema/field 框架；本文不列迁移文件或操作步骤 |
| C — HISTORICAL REFERENCE ONLY | 旧报告/截图/签署可解释来源和当时决定，原样保留；当前源码/输出/内容/权利适用性另行核对，旧 PASS 不继承 |
| D — NOT SUITABLE FOR VERTICAL PROOF | demo、缺失 facts、generic Starter 内容、过期 current/latest 断言、品牌图充当 gameplay、旧 PASS 充当当前结果，都不进入证明 |

### Bomb Farm 媒体

旧 battle/Ritual/Forge 素材只是候选，不要求把 22 项全搬入。首轮最少要有真实解释作用的一种媒体；hero/gallery/video 按实际任务选用，**video 非必需**。

每项实际使用资产必须符合当前 V2.7 Manifest 的 sourceUrl、真实 dimensions、描述性 alt/必要 caption、rightsRef 和本地文件规则；video 使用时才要求现有 accessibleEquivalent/必要 poster 等。rightsRef 指向真实决定，不是填写任意字符串便算批准；sourceUrl 不等于权利，旧通用执行授权不代替媒体授权。按已有权利/风险接受语义记录适用范围，不创造新许可 gate 或假签署。

画面语言/版本与正文必须对应；已知葡语 UI 不冒充英语界面操作。原创 diagrams 明示非游戏 UI，不借图解证明未证实节点/数值。sourceCheckedAt 仍为来源检查，不能由本次 build 日期伪造 verifiedAt。

### War of Genesis 内容与旧扩展

旧 market 正文可作为市场目录范围和问题线索，旧 Gear MDX 可作为文本任务材料；其 sources/editorial/official 边界保留。已有 app-specific market/listing 来源可用于真实上下文核对，不由名称或旧 policy PASS 自动证明当前物品机制、费用或可出售状态。

首轮不要求 live prices、手续费结果、旧 calculator、builds route、market module 或 task-grid 布局。不能显示一个未实现的“打开计算器”本地 CTA 来制造有效旅程；必要时只用清楚标注且可达的官方外部参考，结果不声称已完成出售/保证收益。选定文章的完成/停止判断须自足，不依赖切片外缺失工具。

旧源码的 inline market/builds 正文与样式分开：正文是候选输入，组件/路由分支/计算逻辑不是自动继承的 V2.7 Pattern 能力。两侧所有内部链接、related IDs 与导航按实际启用集合核对，不为保留旧链接扩成全站。

## 8. 最终独立 Review 形式与必要验证

Review Owner：**ChatGPT / AI Architect**。本设计提交独立 Review；本轮不调用 proof 实施或伪造 ChatGPT 新结论。

未来实际 proof 的 Review 包至少包含：

1. **同一 Core 身份**：共同工作树基线及两侧使用证据，Core/consumer/依赖差异说明；不能只列旧 HEAD。
2. **四个 representative 页面**：实际路径、对应问题/答案和内链旅程；generated support routes 单独列出，缺页/占位页不能藏在代表页之外。
3. **新输出**：各代表页可查看的本地 build 输出、同尺寸 desktop/mobile 首屏与必要全文/媒体/条件段；遮名对照另附但不能代替正常页面。截图注明来自哪份当前输出，不借历史截图。
4. **六维矩阵**：按 §4 展示实际 source/content/media/theme/nav 输入与呈现，说明哪些缺口仍未关闭；no-media 的需求与范围判断可追溯。
5. **FD-01–FD-06 对照**：逐项实际观察，不把此设计的“addressed”复制成 PASS。
6. **Changed-file scope**：实际 diff 与输入/机制归属；任何 Core/组件/runtime/schema 改动显式报告，不能作为未声明实现夹带。
7. **有限新验证证据**：命令、输出/退出码、构建用途与浏览器环境、观察日期；NOT_RUN 与 PASS 区分。

### 验证范围（本轮不运行）

- **Slice 层**：内容/Inventory/导航/related 来源与日期核对；BF 使用资产的现有 contract/source/rights/语义核对；WoG 真实条件及 no-media 需求核对；diff scope / whitespace 检查。沿用已有工具，不新增验证框架。
- **Workstream 层**：共同 Core 基线做一次 `npm run check`；两份实际输入输出各用已有 `npm run build:evidence` 完成 evidence-purpose validation、Astro/Pagefind/output audit，保留其 **NOT FINAL** 标记和完整日志。读取当前脚本确认这一用途已经存在，不发明新 build 命令。输入分别构建，不能用一次 Core check 代替另一游戏输入检查。
- **四页浏览器观察**：一个可用浏览器、同一组约 1440px desktop / 390px mobile 尺寸，查看首屏/全文、导航→正文、TOC/FAQ（仅实际使用时）、图片加载/图注、主要链接与局部键盘/focus/overflow。若使用 video，补播放/等价内容检查；不使用就不扩视频 suite。观察游戏任务是否能完成到相应判断，不只截图美观。
- **Release 层保留**：本次不要求 final/adopted release build、41/41 reconciliation、fresh47、6000+ hashing 或完整 Safari matrix。evidence build 成功不能当 final/release/adoption 接受；现有 AX/Safari 责任和未证明状态保持。局部键盘检查也不提升 AX-01/AX-03。

`npm run validate` 是已有 final-purpose 验证入口；若最终发布另需运行它/最终 build，属于后续对应 gate。本 proof 用现有 evidence build 的验证入口，不修改 fail-closed 条件、不假签治理状态，也不把 final gate 未完成记为当前 release PASS。浏览器通道缺失时记录具体证据 NOT_RUN/UNVERIFIED，不能回用历史截图或把工具阻塞改成“人工已验收”。

独立 reviewer 只有在同一 Core、四页职责、六维最低条件、输入来源/权利和必要有限验证都有证据时，才可接受**本次有限 two-game differentiation proof**；其结果不自动等于 PRODUCT ACCEPT、WS04B ACCEPT、WS07 adoption PASS、Safari/AX PASS 或 RELEASE ACCEPT。

## 9. 设计裁决与本轮停止状态

```yaml
DESIGN STATUS: READY FOR INDEPENDENT REVIEW
MINIMUM REPRESENTATIVE PAGES: 4
BOMB FARM PAGES: 2
WAR OF GENESIS PAGES: 2
WOG MEDIA-RICH ARTICLE REQUIRED: NO
FALSE DIFFERENTIATION RISKS ADDRESSED: 6/6
NEW FRAMEWORK REQUIRED: NO
CAN PROOF BE DONE ON SAME V2.7 CORE: YES
NEW RUNTIME FIELDS: 0
NEW SCHEMAS / TYPES / ABSTRACTIONS: 0
NEW PATTERN COMPONENTS / IDS / ENUMS: 0
NEW DEPENDENCIES / COMPATIBILITY LAYERS / VALIDATION TOOLS: 0
PRODUCT CODE DELTA THIS ROUND: 0
TEST CODE DELTA THIS ROUND: 0
PROOF IMPLEMENTATION: NOT STARTED
```

YES 是设计可行性，依赖当前已有 token、native hub/home、WikiArticle/MDX 与媒体能力；不是解除 MEDIUM 输入限制或预先 ACCEPT 输出。实施仍未开始，下一份逐文件实施范围也未制定。本轮不创建 branch/pages/content/media/theme，不修改治理或两游戏，不启动 WS04B/WS07，不 commit/push/tag/merge/release。保存设计后 STOP。

## 10. 依据

- [Baseline Inventory][inventory]：本轮按用户明确已接受事实使用，保留全文和原候选。
- [Minimal WS05 Design][pattern-design]、[WS05 Conformance][conformance]、[WS05 Final TECH Review][ws05]。
- [Simplification Amendment][amendment]、[WS04A Method][method]、[PROJECT_STATE][state]。
- 当前 [native home][home] / [native guides consumer][guides] / [route rules][routes] / [site validation][validation]：确认 WoG 旧 market 模块不受原 consumer 自动支持，原生 guide hub 固定 `/guides/`。
- 当前 [semantic theme tokens][theme] / [config schema][config] / [media schema][media] / [build purpose][build] / [package commands][package]。
- [BF How to Play 原文][bf-guide]、[WoG Gear 原文][w-guide]：loop 与 keep/sell 条件的实际内容基础。

[inventory]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-two-game-proof/TWO_GAME_VERTICAL_PROOF_BASELINE_INVENTORY_V1.md
[pattern-design]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws05/MINIMAL_WS05_PATTERN_DESIGN_V1.md
[conformance]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws05/WS05_PATTERN_BASELINE_CONFORMANCE_V1.md
[ws05]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws05/WS05_FINAL_TECH_REVIEW_V1.md
[amendment]: /Users/randyz/work/coding/hot_words_web/template/architecture/V2.7_ARCHITECTURE_SIMPLIFICATION_AMENDMENT_V1.md
[method]: /Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_METHOD_V1.md
[state]: /Users/randyz/work/coding/hot_words_web/template/PROJECT_STATE.md
[home]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/index.astro
[guides]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/guides/[...slug].astro
[routes]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/optional-routes.ts
[validation]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/site-validation.ts
[theme]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/styles/theme.css
[config]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/config/schema.ts
[media]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/media.ts
[build]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/build-site.ts
[package]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/package.json
[bf-guide]: /Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/src/content/guides/how-to-play.mdx
[w-guide]: /Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis/src/content/guides/gear.mdx
