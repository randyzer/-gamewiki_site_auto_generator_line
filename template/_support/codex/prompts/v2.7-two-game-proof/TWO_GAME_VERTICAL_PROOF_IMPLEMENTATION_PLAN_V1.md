# Two-Game Vertical Proof Implementation Plan V1

日期：2026-10-08（Asia/Taipei）。Plan Owner：Codex。状态：**READY FOR INDEPENDENT REVIEW**。

**PLAN ONLY / NO IMPLEMENTATION**。本轮唯一写入是本文；以下目录、输入、命令、构建和证据均为未来拟执行内容，尚未创建或运行。计划就绪不代表输入 Gate 已通过。

## 1. 冻结目标与边界

使用同一个当前 V2.7 Candidate 工作树，产生四个代表页，验证不同真实游戏输入能否形成不同且有用的体验。遵守已接受并完成 Visual Identity correction 的 [Design][design]；不重新设计 Pattern 或降低任何 acceptance criterion。

| Game | Page ID / Route | 职责与现有 consumer |
| --- | --- | --- |
| Bomb Farm | `home` / `/` | Wiki / Hub；现有首页、BaseLayout、PageCollection 等目录组合，进入矿区循环答案 |
| Bomb Farm | `guide.how-to-play` / `/guides/how-to-play/` | Task Guide + Media-rich Article role；现有 guides route → WikiArticle / MDX / GameMedia |
| War of Genesis | `hub.guides` / `/guides/` | 原生 guides hub；以 title/description/list 表达限定的 market preparation / gear decision journey |
| War of Genesis | `guide.gear` / `/guides/gear/` | Task Guide；相同 guides route → WikiArticle / MDX，以装备取舍条件和人工后续动作回答问题 |

WoG 旧 `hub.market` 只定位旧内容来源；不保留旧 `/market/` consumer，不新增 market module。WoG 首轮 Media-rich Article **NOT REQUIRED**。四页是代表任务集合，并非整个 build 只有四个 HTML 文件；必需首页、about、404、现有 hub/support 输出仍接受原校验并列入完整输出清单。

不移植旧站源码、旧 bespoke Hero/market/calculator/task grid/CSS，不新增 Pattern component/ID/enum、runtime field/schema/type、compatibility layer、验证工具、依赖或新的抽象。Quick Answer / Steps / Next Step 使用普通 MDX；专门组件仍不存在；Comparison DEFER。

## 2. 当前事实与共同基线

源目录 S：`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`。

当前 S：branch `v2.7/evolution`；HEAD `b067e8d4050478072f25a1dc78a8526cdd128cfd`；HEAD tree `1df0ade30b1eaf51a76820c8d8b83337786f0dc1`。存在已接受的未提交/未跟踪修订，**HEAD/tree 不是当前源码全貌**。未来开工时重新记录实际 branch/HEAD/tree、tracked diff、活动未跟踪文件清单及复制事实；若有新的实质 Core 变化，先报告并重新确认 baseline，不沿用 iteration33 fingerprint。

旧输入来源只读：BF `gameweb/game_bombfarm_v2`（main / `ca0ff836746749c7d9d2fb765f740a273e806cf5`，工作树有变化）；WoG `gameweb/game_warofgenesis`（main / `3784e8852ffb3c17cdea79d721adfaf1db1bc70c`，有未跟踪文件）。旧 HEAD/PASS 不成为当前 proof。所有原项目、S、历史证据、PROJECT_STATE/TASK_LEDGER/ROADMAP 保持不变。

| Shared / immutable mechanism | 允许不同的原 authority 输入 |
| --- | --- |
| `src/core/**`、schemas、config schema、content schema、facts parser/resolver | Page Inventory 的既有字段值与页面记录；不用第二份 page truth |
| `src/components/**`、`src/layouts/**`、`src/pages/**`、routes/consumer logic | `game.config.ts` 的品牌、启用功能、首页引用和导航值 |
| media schema/catalog/presentation/renderer；SEO/freshness/search/safety | 原 Media Manifest、原 media decision 文档、真实资产和映射 |
| 全局及页面族样式规则、theme token 名称和消费机制 | `theme.css` 中既有 semantic token 的值；无新 selector/token/engine |
| `scripts/**`、`tests/**`、Astro/TS/Vitest 配置、package/lockfile、相同依赖 | MDX 正文、既有 FAQ 输入、人工链接；不复制 facts 或 content authority |
| 已接受 WS04A 方法和 WS05 composition method | 人工 adoption/evidence 决策记录，仅引用 authority，不成为 runtime config |

publication/update/source/version 保留：`publishedAt`、`updatedAt`、`sources.accessedAt → sourceCheckedAt`、patch/version context 及日期顺序校验。不得恢复 liveStatus，不伪造 verifiedAt，也不将执行日期机械填为来源检查日期。

## 3. 最小 workspace strategy

| 方案 | 选择 | 原因 |
| --- | --- | --- |
| A：同一当前工作树快照派生两份隔离输入副本 | **采用：Two isolated input copies** | 每游戏拥有独立 config/content/dist；无需切换输入恢复、无输出串用；用普通复制和 diff 即可 |
| B：一个目录切换两套输入 | 不采用 | 需要额外恢复和防止 dist/cache 污染的操作，更容易丢失实际输入与输出对应关系 |
| 复制两个旧项目 / 仅从 HEAD 创建 worktree | 不采用 | 前者不是 same-Core；后者丢失当前已接受工作树修订 |

**PROPOSED（目前不存在，不在本轮创建）：**

- `/private/tmp/v2.7-two-game-proof-v1/common-core`：从 S 一次复制的共同源码快照；产品机制不可编辑。
- `/private/tmp/v2.7-two-game-proof-v1/bomb-farm`：从共同快照复制；只改变 §7 BF 输入。
- `/private/tmp/v2.7-two-game-proof-v1/war-of-genesis`：从共同快照复制；只改变 §7 WoG 输入。

未来先确认目标不存在；已存在则 STOP，避免覆盖。普通文件复制 S 的 `src/`、`scripts/`、`tests/`、`public/`、`docs/` 及现有根文件 `.gitignore`、`.nvmrc`、`README.md`、两份 V2.6/V2.6.1 implementation report、`astro.config.ts`、`game.config.ts`、`package.json`、`package-lock.json`、`tsconfig.json`、`vitest.config.ts`、`wrangler.jsonc`。复制活动未跟踪源码；不复制 `.git`、secrets/`.env`、`.vercel`、`.c2c`、旧 `dist`、`.astro` 或历史治理目录。

两份游戏源码先从同一快照复制。已有安装依赖单独复制到临时 common-core 的 `node_modules`，两份游戏链接到这一**临时本地依赖副本**，不链接原 S 依赖或源码，避免写入原目录。保留原 package/lockfile；不升级、不重新安装、不引入依赖获取方案。确认安装包及 Node 满足既有版本要求；依赖不可复用时报告环境问题，不私自改锁文件。依赖/cache/build 写入属于临时生成物，不允许改产品机制。

以普通 `diff -qr` / `cmp` 对共同快照和两份副本的共享 source/config/package/lockfile/scripts/tests 比对；只将 §7 精确路径排除为输入。`theme.css` 另审逐行 diff，确认仅既有 token 值变化；MDX 正文不能夹入新 JSX/component imports 或新的脚本机制。保留共享机制零差异的实际结果，而不只列 HEAD。不扫描依赖/缓存，不做 6000+ 文件 hashing。

**独立输出**：两份副本各自 `dist`，证据目录各自镜像，浏览器分别连接自己的 preview。输入 diff 相对 common-core，机制 diff 单独记录。回退只撤销临时副本中的精确 allowlisted 输入到 common-core 原值（新增文件移除）；停止 preview，证据保留原样。原 S/两游戏无需 rollback。不新增 workspace manager、fixture framework、adapter 或 generator。

## 4. 四页最小输入准备

| 页面 | 输入准备 | 范围/真实性边界 |
| --- | --- | --- |
| BF home | Inventory 中 home title/description/tags/sources 与页面状态；config featured/导航只指向实际 How to Play 和现有目录；原 semantic theme 值；一个 battle screenshot 的原 Manifest hero mapping | 原生首页固定顺序，不复制旧 quick-facts/媒体前移/Steam CTA 机制；首页范围只承诺矿区、队伍和循环答案 |
| BF How to Play | 复用旧 `src/content/guides/how-to-play.mdx` 的真实 loop/观察/升级/轮换说明；开头直接回答，保留已支持的结果判断/边界；FAQ 仅保留真实可答内容；Inventory contentRef/dates/sources、有效 related IDs；同一截图解释 mine grid/squad/resources | 删改指向未纳入页的旧内部链接；人工 Next Step 指向本次有效入口或明确官方外部参考，不增加 gear/ritual 页面；不虚构计时/掉率/最优策略 |
| WoG native hub | Inventory `hub.guides` 的范围、description/tags；config 原 guides 导航指向 `guide.gear`；原主题 token 值 | market preparation 收窄为装备使用/保留/检查出售的有答案入口；不是旧 market MDX renderer/task grid/calculator；不承诺完整市场库 |
| WoG Gear | 复用旧 `src/content/guides/gear.mdx` 六步、build-fit/immediate-use/replacement/eligibility/trade-off/stop；明确当前可核对 WoG 上下文；首段直接回答；条件化人工链接；Inventory sources/dates；原 media decision 的 no-media 判断 | 删除/改为明确可用参考的 builds/farming/items/market/tool 旧链接；不新增缺页。停止判断必须自足，不依赖缺失出售工具；自站 editorial 来源不等于官方机制证明 |

保留原 `guides` feature；未使用模块（含 search）关闭，导航/related/catalog 不留 unknown/disabled 入口。删除两副本的 Starter getting-started MDX，并在各自 Inventory 去除其记录/引用，移除 demo/search 的非本轮业务记录。必需 home/hub/about/404 元数据适配实际项目；privacy/terms 保持 unavailable/private，与未改变的空 legal content 一致，不制作假政策。索引状态是已有 Inventory 的真实输入选择，不能靠改 noindex 或隐藏页面绕过检查。

已知支持页限制：Core `static-page-copy.ts` 的 about 正文仍包含 Starter editorial operating copy。**不编辑它**；现有 evidence-purpose build 对其 ordinary-text residue 的报告保留在日志和 unresolved gaps 中，支持页不算代表任务/差异证据，不声称完整 adopted/product/release 输出。若实际构建将其判为 fatal，则按 CORE GAP STOP，不修改 sentinel/校验或豁免文件。

brand 使用已有 name/mark/tagline 输入，省略 `logoPath`；两份副本删除未使用的 `/public/logo.svg`。理由：现有 PP-02 将未注册 public text 判为错误，该 SVG 本身是 Starter branding。共同 favicon 不改，也不作为游戏识别证据；不导入 WoG branded OG。

## 5. BF 单资产 adaptation 与权利 Gate

**计划资产数 = 1；video = 0**。不迁移 22 项，也不为丰富度添加 Ritual/Forge/gallery。候选为旧 BF `public/media/home/battle-overview.webp`，原 id `home.battle-overview`。

| Contract 项 | 计划输入与实施前确认 |
| --- | --- |
| 本地文件 | 只在 BF 副本写入 `/public/media/home/battle-overview.webp`；读取旧文件，不改变旧资产 |
| dimensions | 当前只读 `sips` 已测 1920 × 1080；未来复制后确认真实尺寸，与原 schema 字段一致 |
| source | 原 sourceUrl：`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4892010/907f4c81a582429b606a4e5e05d75323172e778f/ss_907f4c81a582429b606a4e5e05d75323172e778f.1920x1080.jpg`；保留真实 provenance，不将 URL 当作许可 |
| alt | 原描述可作为基础：battle screen、mining squad、resource counters、grid/navigation；核对实际画面/语言，不描述未出现对象 |
| caption / credit | 图注解释 squad/grid/resources 如何帮助理解循环；credit 仅写真实已证实归属，不捏造授权署名 |
| rightsRef | 必须引用真实 existing rights decision/evidence，并确认适用资产/用途；旧 Manifest 尚缺当前所需 rightsRef，旧 enrichment 通用授权本身不足。新 adoption 文档可以引用真实决定，不能靠自写 APPROVED 创造许可 |
| page mapping | 原 Manifest 中只映射 `home` 与 `guide.how-to-play` 的已有 hero seam；正文明确解释截图作用，避免同图两用仅成为装饰 |
| accessibleEquivalent | 不用 video，故不需要 video equivalent/poster/播放验证；不发明图片的新替代字段 |

未来先查原 BF 权利记录及其来源。若不能支持该资产：记录 **MEDIA BLOCKED**，STOP 媒体与所定 proof 实施，提交缺口；不填 dummy rightsRef、不将 PENDING 改 APPROVED、不降低校验，也不临时替换无来源图片。源 URL、旧 QA PASS 或笼统“可以处理任何必要事”不替代媒体权利决定。本计划不预判 Gate 通过。

使用原 `docs/MEDIA_DECISION_TABLE.md` parser 的 13 列：`pageId_or_route / page_family / media_need / need_rationale / intended_placement / candidate_state / rights_state / human_decision / integration_state / visual_gate_state / source_or_provenance / owner_or_defer_reason / notes`。每侧一份表，状态按真实事实，未完成审查仍 PENDING；不另建媒体决定 schema。

## 6. WoG Visual Identity 显式 Gate

**VISUAL IDENTITY INPUT GAP REMAINS。当前状态 OPEN。** Manifest 仍为空；无合格解释性游戏媒体候选。文本-led 决策页可以准备，但 generic brass/steel/serif/W mark、branded OG 或 generic gear/market/idle 文案不能识别具体游戏。

未来先从当前可信输入逐项核对并记录：

1. 来源支持的 WoG 专有 terminology/context；具体 app/item/资格实例的真实性和日期边界，不能推导不存在的职业/掉落/利润。
2. 可查的真实 game UI / official visual reference；旧网页截图不等于游戏视觉，品牌图也不等于 gameplay evidence。
3. typography/density/surface 值选择与上述游戏视觉依据的关系；单纯 editorial aesthetic 无证明力。
4. taxonomy/task 的游戏特异性：装备取舍与 market preparation 承诺、实际落点和条件，不能只换菜单名字。
5. sourceUrl/sourceType/accessedAt、patch/version 边界；旧 editorial 页面和 app-specific market/listing 引用分别记录，不假称本轮已重验 live mechanics。

证据只进入已有 content/Inventory/theme/config 及人工 adaptation record。允许引用 visual reference 支持 theme，而不将 screenshot 渲染在正文；不增加 WoG asset/field/schema。若需要外部补核，后续只能按现有授权工具及平台第一手/降级规则执行；本轮不联网。新增输入文件需要额外范围 Review，不能默默加入 allowlist。

实际 reviewer 遮住 **logo、site name、game name、explicit page title** 后，必须分别识别 Bomb Farm 和 War of Genesis，并给出至少两项非 logo/title 依据，包含真实 game-specific evidence。不能凭排除法认 WoG，不能只证明两种样式不同。WoG 资料不足时其他维度可诚实准备，但 Visual Identity 保持 **UNPROVEN / FAIL**，整个有限 proof 不获通过。若必须伪造或使用 generic 图片才可继续，则 STOP。

WoG media decision 需说明为何本次 Gear 条件能以文字独立理解、何时图片仍有用但未取得；空 Manifest 本身不是 no-media 决定。所需辨认信息缺失时标为任务缺口，不能用 NOT REQUIRED 消除。

## 7. 精确 allowlist（未来实施，不在本轮执行）

### COMMON CORE：expected changes = 0

共享机制与根配置/依赖文件均禁止编辑。仅允许以下两个 isolated proof 根下的输入差异。所有新文件都是既有 authority 的实际输入/人工记录，不是新 schema/config authority。复制的未变基线文件不计 input change。若需要任何第 11 个 BF 或第 9 个 WoG 输入文件、Core/test 文件，先 STOP 报告，不自动扩范围。

### BOMB FARM PROOF INPUTS：10

根 **PROPOSED**：`/private/tmp/v2.7-two-game-proof-v1/bomb-farm`。表中路径均相对此根，原 BF/S 同名文件不改。

| # | File | Change / Why required |
| --- | --- | --- |
| 1 | `game.config.ts` | EDIT；现有品牌/主页/功能/导航值，不新增字段 |
| 2 | `src/data/page-inventory.json` | EDIT；四页范围中 BF 两任务及必需 support/hub truth、引用、dates/sources |
| 3 | `src/styles/theme.css` | EDIT；仅已有 semantic token 值，来源依据在人工记录 |
| 4 | `src/content/guides/getting-started.mdx` | DELETE；清除继承的 Starter setup 输入，避免 orphan/ref/假答案 |
| 5 | `src/content/guides/how-to-play.mdx` | NEW；真实任务正文、可选原 FAQ、有效人工 Next Step |
| 6 | `src/data/media/media.json` | EDIT；单真实资产的现有 contract + home/how-to-play mappings |
| 7 | `docs/MEDIA_DECISION_TABLE.md` | NEW；已有 parser/列语义的两页媒体需要/权利/审查事实 |
| 8 | `docs/PROOF_GAME_ADAPTATION.md` | NEW；轻量项目决定及 provenance/visual/rights/gaps，仅引用九个原 authority |
| 9 | `public/media/home/battle-overview.webp` | NEW，rights Gate 后才允许；唯一候选解释性媒体 |
| 10 | `public/logo.svg` | DELETE；config 不使用时移除 Starter branding/unregistered copied public text |

### WAR OF GENESIS PROOF INPUTS：8

根 **PROPOSED**：`/private/tmp/v2.7-two-game-proof-v1/war-of-genesis`。表中路径均相对此根。

| # | File | Change / Why required |
| --- | --- | --- |
| 1 | `game.config.ts` | EDIT；真实品牌、bounded guides 导航/功能/首页引用值 |
| 2 | `src/data/page-inventory.json` | EDIT；`hub.guides`/Gear 及必需 support/home truth、有效 sources/dates/related |
| 3 | `src/styles/theme.css` | EDIT；既有 token 值；视觉依据不足保留缺口，不预判识别 PASS |
| 4 | `src/content/guides/getting-started.mdx` | DELETE；消除 Starter setup/orphan 输入 |
| 5 | `src/content/guides/gear.mdx` | NEW；真实六步取舍/停止/人工后续动作，移除本轮缺页依赖 |
| 6 | `docs/MEDIA_DECISION_TABLE.md` | NEW；既有表语义记录 no-media 需求及未取得的有用证据 |
| 7 | `docs/PROOF_GAME_ADAPTATION.md` | NEW；真实 WoG context/theme依据/source date/Gate，人工记录不成为 runtime |
| 8 | `public/logo.svg` | DELETE；不使用 generic Starter logo，避免 copied-public-text error |

WoG `src/data/media/media.json` 继续原空 Manifest，不机械编辑；两侧 facts、`src/data/legal-content.ts`、Media renderer、WS03/04A/05 原文/实现、tests 均不改。内容不新增 frontmatter 字段/组件 imports；`desiredPatternIntent` 仍自由文本意图，不创建 runtime Pattern authority。

### PROOF EVIDENCE / DOCS：21 个固定审查文件

根 **PROPOSED**：`/Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-two-game-proof/proof-v1`。

| # | File | Evidence |
| --- | --- | --- |
| 1 | `common-core-identity.md` | 实际工作树/复制范围/未提交 Core 修订与活动未跟踪记录、Node/依赖、shared comparison 结果；不是旧 fingerprint |
| 2 | `bomb-farm-input-diff.patch` | BF 相对共同快照的精确输入 diff，含新增/删除与资产 binary 差异 |
| 3 | `wog-input-diff.patch` | WoG 相对共同快照的精确输入 diff，含新增/删除 |
| 4 | `shared-check.log` | 一次共同 baseline check 完整输出、命令/退出码 |
| 5 | `bomb-farm-build.log` | BF evidence build 的 validation/build/output audit 完整输出、退出码 |
| 6 | `wog-build.log` | WoG evidence build 同上 |
| 7 | `PROOF_REVIEW_PACKAGE.md` | 四页任务/来源、六维矩阵、FD-01–06 实际观察、browser 环境/结果、范围和 unresolved gaps；交独立 reviewer，不伪造 ACCEPT |
| 8 | `screenshots/bf-home-desktop.png` | 当前输出，1440 × 900 viewport |
| 9 | `screenshots/bf-home-mobile.png` | 当前输出，390 × 844 viewport |
| 10 | `screenshots/bf-how-to-play-desktop.png` | 当前正文/解释性媒体，1440 viewport |
| 11 | `screenshots/bf-how-to-play-mobile.png` | 同页，390 viewport |
| 12 | `screenshots/wog-hub-desktop.png` | 当前 native hub，1440 viewport |
| 13 | `screenshots/wog-hub-mobile.png` | 同页，390 viewport |
| 14 | `screenshots/wog-gear-desktop.png` | 当前条件/停止正文，1440 viewport |
| 15 | `screenshots/wog-gear-mobile.png` | 同页，390 viewport |
| 16 | `screenshots/bf-how-to-play-masked.png` | 真实截图仅遮显式名称的 review 派生材料；保留原截图 |
| 17 | `screenshots/wog-gear-masked.png` | 同上，识别 WoG 而不只是 generic style |
| 18 | `outputs/bomb-farm/index.html` | 实际 BF build 输出，不另写 proof HTML |
| 19 | `outputs/bomb-farm/guides/how-to-play/index.html` | 实际 BF 正文输出 |
| 20 | `outputs/war-of-genesis/guides/index.html` | 实际 WoG native hub 输出 |
| 21 | `outputs/war-of-genesis/guides/gear/index.html` | 实际 WoG Gear 输出 |

**21 是固定审查文件数，不是所有生成资产总数。** 为确保 HTML 可查看，两套完整 dist 各镜像到 `outputs/bomb-farm/**` / `outputs/war-of-genesis/**`，包含其实际 CSS/JS/media/Pagefind、robots/sitemap、support/error routes 和 `EVIDENCE_BUILD_NOT_FINAL.json` 等生成支持文件。上述四个 HTML 就在镜像内，不重复制作；其它生成文件数以实际 build 清单记录，不能现在捏造。生成树不可手写或修改，超出两棵树的新证据工具/文件需 Review。

截图记录 viewport/URL/浏览器版本/时间、与输出的对应关系；用现有合法工具取首屏及足够全文，不用历史 screenshots。遮名材料只遮名称，不改正文/画面；使用可用原生覆盖/批注能力，不开发 masking framework、不用生成图片重造证据。若当前工具不能生成忠实遮名材料，记录 NOT_RUN/UNVERIFIED，不能声称识别通过。

## 8. 有限执行顺序与验证（全部尚未执行）

1. [ ] **确认输入 Gate / 开工身份**：复读接受设计及本 Plan；查 BF 真实权利支持，核对 WoG 证据缺口；记录 source identities 与临时目标不存在。rights 不足先 STOP；WoG OPEN 可以做其他维度，不能承诺总 PASS。
2. [ ] **复制同一 baseline**：按 §3 普通文件复制，建立两份隔离输入；记录当前 tracked Core patch 和活动未跟踪文件，不复制 credentials；有限机制比对。不得从旧站拷 Core 或从仅 HEAD 得出当前相同。
3. [ ] **共同检查一次**：在临时 common-core 执行下列 check，使用原依赖；失败保留日志并报告，不能为通过改 tests/Core。
4. [ ] **BF 输入**：仅 §7 十文件；先真实 rights Gate 再单资产，准备 home→How to Play 原生旅程，按已有 schema/authority 核对 sources/dates/links/解释作用。
5. [ ] **WoG 输入**：仅 §7 八文件；native hub→Gear，真实 context/条件/no-media决定；证据不足保留 Visual Identity OPEN，不用 generic theme 或 branded OG 替代。
6. [ ] **两侧各 build 一次**：原 evidence-purpose build 已串联 site validation、Astro build、输出 reconciliation、Pagefind 与 output audit。完整 logs/退出码以及 NOT FINAL marker 保留；失败仅允许批准输入内修正，新增文件/Core gap STOP。
7. [ ] **四页浏览器观察**：分别 preview，桌面/手机共八个页视图，核对 navigation→answer、首段答案/任务判断、visible content、图片/图注、实际 TOC/FAQ、primary links、基本 Tab/focus/overflow；无 video 不扩 video suites。
8. [ ] **范围/证据整合**：普通 input diff（含新增/删除/binary）、shared mechanism zero-diff、whitespace check；保存实际 dist 和 screenshots；按 Design 原六维/FD 条件填写真实观察。全部结果给 ChatGPT 独立 Review，实施者不自行 ACCEPT 或改治理状态。

未来命令（**本轮不运行**），执行 cwd 与用途固定：

| cwd | Command | Why |
| --- | --- | --- |
| `/private/tmp/v2.7-two-game-proof-v1/common-core` | `node --version`；`npm run check` | 同一环境记录；原 `astro check && vitest run` 一次验证共享 baseline，不新增测试 |
| `/private/tmp/v2.7-two-game-proof-v1/bomb-farm` | `npm run build:evidence` | BF 输入的既有 evidence validation/output audit |
| `/private/tmp/v2.7-two-game-proof-v1/war-of-genesis` | `npm run build:evidence` | WoG 输入独立接受同一验证 |
| BF / WoG 对应 cwd | `npm run preview -- --host 127.0.0.1 --port 4325` / `npm run preview -- --host 127.0.0.1 --port 4326` | 两套实际输出独立观察；先确认端口空闲，冲突报告/选择空闲端口并记录 |
| 共同快照与各副本 | `git diff --no-index --binary <baseline-file> <input-file>`；`git diff --no-index --check <baseline-file> <input-file>` | 按 allowlist 逐文件保留真实 diff/空白检查；新增/删除对应 `/dev/null`；exit 1 表示差异、>1 是错误；不 git init/commit |
| 对应共享路径 | `diff -qr <baseline-directory> <proof-directory>`；`cmp <baseline-file> <proof-file>` | 零机制差异；仅精确输入另审，不扫描 node_modules/dist/cache |

日志记录真实 exit code，不让 pipe/重定向掩盖失败。一次共同 check 不代替各游戏输入验证。有限输入检查后不重复 unrelated suite；只有相关修改/失败才重跑该侧必要 build。预览通道失败按工具规则诊断，不能匿名访问/换工具绕过授权或继承旧 PASS。

不运行 full release matrix、41/41 reconciliation、fresh47、full Safari、6000+ hashing、unrelated media/search browser suite、adopted/final build 或 final-purpose `npm run validate`。本 proof 使用已有 evidence entry，不修改 final gate。局部 focus 检查不是 AX-01/AX-03/Safari PASS。

## 9. 独立 Review 需要观察的实际证据

六维一项缺证据即保留缺口，不能平均分：

| Dimension | 未来必须提供的实际观察 |
| --- | --- |
| Visual identity | 正常+遮名材料；两具体游戏的至少两项非显式名称依据，含真实 game-specific evidence；WoG 不足记 UNPROVEN/FAIL |
| Media treatment | BF 唯一截图 contract/rights/实际加载与解释作用；WoG 独立有用的文字答案和可追溯 no-media决定，非“Manifest 空” |
| Page rhythm | 两侧入口→正文和同 shell 全文对照；不同注意力路径/密度/任务推进，不因缺内容制造“简洁” |
| Player task | BF mine-loop/观察/升级 vs WoG 使用/保留/出售检查；直接答案、动作或条件、完成/停止判断；依据真实来源 |
| Taxonomy / navigation | 实际原 config/Inventory 的有效落点及点击；范围/标签/答案一致，无虚假库/工具或死链 |
| Article composition | 同一 WikiArticle 中真实循环动作/观察 vs 条件分支/停止/人工下一步，非 H2 换名或 shared shell 本身 |

FD-01 shared homepage collections、FD-02 shared article shell、FD-03 WoG branding without game visual evidence、FD-04 shared idle/gear/market concerns、FD-05 qualitative WoG too generic、FD-06 inherited old project forks：逐项填实际观察、source/output/screenshot 指针、仍有风险及 NOT_RUN；沿用 Design 的原拒绝条件。**Design addressed 6/6 不转为实际 PASS**。FD-03 与严格 Visual Identity 同标，generic styling/W logo/OG 不足。

Reviewer package 同时列完整生成 support routes、已知 about Starter 正文/未通过 final gate、所有来源/权利/视觉 gap、观察工具限制和 input/shared diff scope。旧历史证据仅为 provenance，不当本轮 output/check/acceptance。

## 10. STOP / rollback / 非声明

出现任一情况，停止相应实施并报告，不扩 allowlist：

- **STOP / REPORT CORE GAP**：Core/component/consumer/style mechanism 必须改，或校验要求改 tests/scripts 才能通过。
- 新 Pattern component/framework/ID/enum、runtime field/schema/type 或 compatibility layer 变为必要。
- WoG 必须靠 fake/generic evidence 才能继续；证据不足但可准备其他维度时维持 OPEN/UNPROVEN，而非虚构或降标。
- BF 媒体权利不能被真实支持：**MEDIA BLOCKED**，媒体及本设计 proof 实施停止。
- 代表旅程必须依赖旧 bespoke route/module/calculator，或新增第五个代表业务页。
- 输入/Evidence 手写文件需超出明确 allowlist；有新 Core baseline 实质变化、依赖环境或浏览器能力阻塞需要替代方案。

简单 rollback：将精确 changed inputs 恢复为 common-core 原文件，新输入移除；保留原失败 log/output/review evidence，不把 FAIL 改 PASS。共同快照/原 S/原游戏项目均未改，不需要 migration framework。

即使有限 build/浏览器顺利，实施者也不得宣称 Bomb Farm proof PASS、WoG proof PASS、two-game proof PASS、PRODUCT ACCEPT、WS04B ACCEPT、WS07 adoption PASS、AX/Safari PASS 或 RELEASE ACCEPT；由后续独立 reviewer 按实际证据裁定。本轮治理状态不改，commit/push/tag/merge/release 均禁止。

## 11. 计划复杂度与停止状态

```yaml
PLAN STATUS: READY FOR INDEPENDENT REVIEW
PROOF WORKSPACE STRATEGY: Two isolated input copies
REPRESENTATIVE PAGES: 4
COMMON CORE CODE CHANGES PLANNED: 0
BOMB FARM INPUT FILES: 10
WAR OF GENESIS INPUT FILES: 8
PROOF EVIDENCE FILES: 21 fixed review files; generated support files counted after build
BF MEDIA ASSETS PLANNED: 1 candidate; rights Gate pending
WOG VISUAL IDENTITY INPUT GAP: OPEN
NEW RUNTIME FIELDS / SCHEMAS / TYPES / ABSTRACTIONS: 0
NEW PATTERN COMPONENTS / IDS / ENUMS: 0
NEW DEPENDENCIES / COMPATIBILITY LAYERS / VALIDATION TOOLS: 0
PRODUCT CODE DELTA THIS ROUND: 0
TEST CODE DELTA THIS ROUND: 0
PROOF IMPLEMENTATION: NOT STARTED
```

只增加有限真实输入和人工证据，不增加 Core 复杂度。执行准备仍受 rights/visual/environment Gate 约束；READY 仅提交 Plan 独立审查。本文保存后 STOP。

[design]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-two-game-proof/TWO_GAME_VERTICAL_PROOF_DESIGN_V1.md
