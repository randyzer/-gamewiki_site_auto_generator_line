# Starter 2.0 — Phase D Implementation Report

完成时间：2026-09-04，Asia/Taipei。范围：**Wiki Portal Homepage / Content Richness ONLY**。

状态：实现、自动化验证及响应式 QA 完成，等待人工评审。未进入 Phase E。

## Approved working baseline

- 仓库：`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.2`。
- 批准基线：`fcd3d09ca7d7c7235c29c92a6ee9721b1f00c4df`（`feat: complete starter 2.0 phase C visual richness`）。该 Git checkpoint 包含已批准的 Phase A、Phase B、Phase C、Architecture Proposal 及前序实施报告。
- Architecture Proposal 已纳入基线：Git blob `a633e676bdd184d0dda2c2af8ed4b56d778f8adc`；文件 SHA-256 为 `ada7abb0743843e3d4fe0f66d6c7dffc20076ef4403fa73b3f887ce5a4bb1beb`。
- 本阶段分支：`codex/phase-d-wiki-portal`；从批准基线创建，Phase D 未产生提交。
- 开工前实测：104 个 Astro/TS 文件零诊断，29 个测试文件 / 283 项测试通过；`validate` 通过（8 enabled pages / 1 content entry）；build 通过，8/8 路由精确对账；Pagefind 为 4 页 / 330 词。
- Phase D 未发现需要改变 Phase A Navigation/WikiArticle、Phase B Media、Phase C Theme、Runtime Page Inventory 或 Stable Core 架构的阻塞。

## 1. Files added

| 文件 | 职责 |
| --- | --- |
| `src/components/home/home-model.ts` | 从已解析的 enabled/featured pages 与可选 facts/FAQ/media 派生固定首页模型；不存储页面状态 |
| `src/components/home/GameHero.astro` | 玩家向游戏 Wiki Hero、有效 Start Here 与可选 Phase B hero image |
| `src/components/home/WikiCategories.astro` | 渲染已启用 Hub/database category roots；空数组不输出 |
| `src/components/home/PageCollection.astro` | Featured、Important Systems、Latest Updates、Browse All 的小型共用呈现组件 |
| `src/components/wiki/FAQ.astro` | 可选、可见、仅 authored 的原生 details/summary FAQ；空数组不输出 |
| `tests/homepage.test.ts` | 首页数据模型、固定组合、条件渲染、泄漏防护、FAQ 与响应式合同测试 |
| `docs/STARTER_2.0_PHASE_D_REPORT.md` | 本实施报告；不是第二套架构决策 SSOT |

共 7 个新增文件；未删除正式文件。

## 2. Files modified

| 文件 | 最小变更 |
| --- | --- |
| `src/pages/index.astro` | 用固定 Wiki Portal 组合替换 Starter/demo dashboard；消费既有 catalog/config/media authority |
| `src/content.config.ts` | 为既有 editorial collections 增加 optional authored FAQ schema；保留 `pageId`-only 内容兼容 |
| `src/components/wiki/WikiArticle.astro` | 在正文后、Related Pages 与 Sources 前条件渲染 FAQ；TOC 逻辑不变 |
| `src/pages/guides/[...slug].astro` | 把 content renderer 已验证的 optional FAQ 传给 WikiArticle |
| `src/components/Footer.astro` | 移除首页仍可见的工程/Starter footer 文案，保留原数据来源、链接与结构 |
| `src/styles/global.css` | 仅增加 portal、FAQ、响应式 grid 与媒体组合所需样式；未改 Theme/Page-family token 架构 |
| `tests/wiki-article.test.ts` | 增加 FAQ 顺序、optional schema、visible rendering 与 TOC 排除回归测试 |

共 7 个已跟踪文件修改。没有移除文件，也没有无关 Core 重构。

## 3. Stable Core files touched

**NONE**。`src/core/*` 无变化。

Phase D 只读取 `enabledPageCatalog`、`featuredHomepagePages`、`getPageByRoute` 和 `siteConfig`。没有复制 publication/feature resolution，没有改变 Navigation resolver、SEO、route generation、sitemap、canonical、Pagefind 或 build reconciliation。

## 4. Page Inventory changes

**NONE**。`src/data/page-inventory.json` 与 `src/data/schemas/page-inventory.ts` 均未改动。

没有向 Inventory 添加 FAQ、media、layout、homepage section 或 navigation state。Homepage model 只能展示调用方提供的已启用 Inventory page；它不能创建路由或改变 publication、visibility、indexability、feature 状态。

## 5. Homepage data authority map

```text
game.config.ts homepage.featuredPageIds
  → src/core/site-data.ts featuredHomepagePages
  ┐
Runtime Page Inventory
  → src/core/site-data.ts enabledPageCatalog
  ├→ pure home-model.ts → fixed index.astro composition → static HTML
Fact Layer → project-owned { label, value } mapping ┤
Content Layer → optional authored FAQ ┤
Phase B Media Catalog → home pageId media mapping ┘

Phase C Theme/Page-family tokens → presentation styles only
```

- 页面身份、route、state、module、pageType 与日期只来自 Runtime Page Inventory/Enabled Catalog。
- Featured 顺序只来自既有 `homepage.featuredPageIds` 的 Core 解析结果；invalid ID 继续由既有 validation fail，不会被首页静默吞掉。
- Quick Facts 只接受真实项目从 Fact Layer 映射出的 `{label,value}`；没有新增 fact 字段或 game facts database。
- FAQ 只接受 Content Layer 的显式 authored items；没有生成器或默认假内容。
- Media 只消费 Phase B `mediaCatalog.getPageMedia(home.pageId)`；没有 homepage-specific media 字段。
- 首页 section 顺序固定在 `index.astro`，没有配置 block array、registry、CMS 或 layout DSL。

## 6. Final homepage section behavior

| 顺序 | Section | 数据与行为 |
| ---: | --- | --- |
| 1 | Game Hero | Home Inventory row + brand config；始终有玩家向说明，只在 resolved start/media 存在时显示对应 CTA/media |
| 2 | Quick Facts | 通用 QuickFacts primitive；仅在真实 `{label,value}` 非空时显示 |
| 3 | Start Here | 已解析 featured list 第一项；无数据时整段隐藏，invalid config 仍 fail validation |
| 4 | Browse by Category | enabled public Hub/database roots；按受控 `page.module` 每 module 选一个根 |
| 5 | Featured Guides | configured featured IDs 中剩余的 guide pages；不新增第二个 config 字段 |
| 6 | Important Systems | 未被 category 使用的剩余 Hub/database roots；只称 Important，不声称 Popular |
| 7 | Latest Updates | enabled `pageType: patch`，按 `updatedAt` 倒序；News disabled/无 patch 时隐藏 |
| 8 | Screenshot / Trailer | Phase B home page mapping 的 gallery/trailer；单项和整段均按实际数据条件渲染 |
| 9 | FAQ / Common Questions | 显式 authored FAQ；空数组不输出 heading、accordion 或占位 |
| 10 | Browse All | 前面尚未使用的 eligible enabled pages；不含 home/legal/error 页面 |

默认空 manifest 与当前 Starter 数据下，实际首页显示 Hero、Start Here、Browse by Category、Browse All；Quick Facts、Featured Guides、Important Systems、Latest Updates、Media、FAQ 因无独立真实数据而隐藏。没有空 section 或假内容。

`GameHero` 的 Browse CTA 只在 category anchor 真实存在时输出；最小数据状态没有空 actions wrapper 或 dead anchor。

## 7. Homepage de-duplication rules

首页使用一个局部 `usedPageIds` 集合，只影响首页 presentation，不改变站点可访问性：

1. configured featured list 第一项优先成为 Hero/Start Here；
2. Hub/database roots 以既有 priority、title、pageId 做稳定排序，每个受控 module 选择一个 category root；
3. 其余 configured featured guide pages 成为 Featured Guides，保留 config 顺序；
4. 未使用的 Hub/database roots 成为 Important Systems；
5. 未使用的 patch pages 按 `updatedAt` 倒序，priority/title/pageId 稳定 tie-break；
6. 其余 eligible enabled pages 按 priority/title/pageId 稳定排序进入 Browse All。

同一 pageId 不会跨首页 collection 重复；反转 enabled input 顺序仍生成相同结果。20+ fixture 中 24 个 guide pages 全部可发现，且各自只出现一次；没有从标签、route 或 heading 猜测 category。

## 8. FAQ schema/component design

Content schema 新增严格、optional 字段：

```ts
faq?: Array<{
  question: string; // trim，5–180 chars
  answer: string;   // trim，1–2000 chars
}>;
```

- `FAQ.astro` 只渲染传入的可见 question/answer，使用原生 `details` / `summary`；不自动生成内容。
- `items` 缺失或为空时输出为空字符串，不产生 heading、gap 或 shell。
- FAQ 不进入 Page Inventory、Fact Layer、homepage config 或 Media Manifest。
- 没有 FAQ JSON-LD；未来若增加 structured data，必须复用相同 visible items。
- 既有只包含 `pageId` 的 content entry 继续通过 schema、check 和 build。

## 9. WikiArticle FAQ integration

最终顺序为：

```text
Rendered MDX main content
→ optional FAQ
→ Related Pages
→ Sources & Verification
```

WikiArticle 的 TOC selector 未改：仍只消费 Astro content renderer 返回的 body heading records，经既有 helper 选择 H2/H3。FAQ、QuickFacts、Related Pages、Sources、navigation/layout/component headings 不会进入输入，也不会手工 append；没有 DOM crawler、HTML parser 或 title blacklist。

## 10. Tests added/modified

### 新增 `tests/homepage.test.ts`：19 项

- pure model boundary 与 existing featured ordering；
- controlled module category roots、remaining important systems；
- update date sorting 与 deterministic tie-break；
- draft/private/feature-disabled leak prevention；
- deterministic de-duplication；
- empty/minimal model 与 minimal Hero fallback；
- 24-page discoverability fixture；
- optional facts/FAQ/Phase B media pass-through；
- player-facing Hero 与 optional media rendering；
- empty category/collection conditional rendering；
- fixed composition/no block DSL；
- Starter/dashboard/internal metadata copy regression；
- Phase B placement-only/empty-media behavior；
- optional FAQ/outside-Inventory contract；
- responsive portal/media/FAQ CSS contract；
- authored FAQ 与 empty FAQ rendering。

### 修改 `tests/wiki-article.test.ts`：新增 2 项，共 7 项

- existing `pageId`-only content 与 optional FAQ schema；
- FAQ 在 body 后、Related/Sources 前，且不进入 body H2/H3 TOC。

既有 `site-validation.test.ts` 继续覆盖 invalid featured config fail；Phase A Navigation、Phase B Media、Phase C Theme 测试未经修改并在全量套件中通过。

TDD 证据：home-model module 缺失先 RED；八组 model behavior 先 RED；presentation/FAQ 集成先 RED；responsive contract 与 minimal dead-anchor regression 均先观察失败，再用最小实现转 GREEN。

## 11. Total test result

**PASS：30 个测试文件 / 304 项测试（283 既有 + 21 Phase D）**。不存在 skip/todo。

## 12. `npm run validate` result

**PASS**：8 enabled pages，1 content entry。

## 13. `npm run check` result

**PASS**：Astro 检查 110 个文件，0 errors / 0 warnings / 0 hints；30 个测试文件、304 项测试全部通过。

内容同步仍提示默认未启用的空 `meta` / `news` collection 没有匹配文件；与批准基线一致，不是新增诊断。

## 14. `npm run build` result

**PASS**。既有 validate → Astro static build → reconcile-output → Pagefind → audit-build 管线全部通过。

- 8 pages built；
- 最大 HTML 10752 B；
- 引用 CSS 55679 B；
- 引用 JS 189143 B；
- Pagefind output 652177 B；
- 既有构建预算通过。

## 15. Route/output reconciliation result

**PASS：8/8 Runtime Page Inventory routes 精确匹配。** 没有新增或移除正式 route；canonical、sitemap、robots、publication/feature filtering 与 exact output reconciliation 沿用批准架构。

## 16. Pagefind result

**PASS**：1 language，4 pages，280 words，0 filters，0 sorts。

相对 Phase C 基线减少 50 词，来自首页移除 Starter/dashboard/doctrine 文案；索引页数、标注边界与 Pagefind 构建流程不变。

## 17. Phase A regression result

**PASS**。Phase A 原 115 项测试保留并通过；Grouped/Desktop/Mobile Navigation、唯一 resolver、publication leak prevention、WikiArticle body H2/H3 TOC、Sources、Related Pages、QuickFacts 与 player-facing metadata 架构未改。

浏览器复验 390/768 mobile nav 与 1440 desktop nav 切换正常；首页实现只消费 Core 已解析结果。

## 18. Phase B regression result

**PASS**。Phase B 原 159 项测试保留并通过；Media schema/catalog/validation/component 无修改，placement 仍只有 hero/gallery/trailer，Remote Images 仍拒绝。

媒体丰富首页夹具在 390/768/1440 显示 1 hero、2 gallery images 和 1 YouTube trailer；nocookie iframe 有 title 且保持 16:9。生产 empty manifest 不输出 media section。

## 19. Phase C regression result

**PASS**。Phase C 9 项新增测试及全部既有 Theme 测试通过；`theme.css`、`page-families.css`、BaseLayout family binding 均未改。Homepage/FAQ CSS 只消费既有 semantic token 与 `--page-accent`，没有新增 family key 或 raw game palette。

## 20. Minimal-data homepage result

**PASS**。纯 model 的 empty 与 home-only 输入均返回空 optional collections。浏览器临时 home-only route 在 390/768/1440：

- Hero 保持完整；
- 无空 H2/section、media shell 或 placeholder；
- 无空 action wrapper；
- 无指向不存在 category section 的 Browse anchor；
- 无横向溢出。

## 21. 20+ page homepage result

**PASS**。一次性 29-page fixture（24 guides、3 roots、2 patches）在首页生成：

- 1 个 Hero/Start Here route；
- 2 category cards；
- 2 featured guide cards；
- 1 Important System card；
- 2 Latest Update cards；
- 21 Browse All cards。

28 张 collection cards 的 href 全部唯一，加上 Hero/Start Here 后 29 个 enabled fixture pages 全部可发现。390/768/1440 均无横向溢出，cards 自动从单列过渡到 grid。

## 22. Media-rich homepage result

**PASS**。临时副本只用 Phase B 固定 manifest 和合成 QA 素材接入 home pageId；没有改变生产 manifest、Inventory 或 schema。

| 视口 | Hero / gallery | YouTube iframe | 结果 |
| --- | --- | --- | --- |
| 390 × 844 | Hero 347 px；gallery 单列 347 px | 347 × 195.1875 px | PASS |
| 768 × 1024 | Hero 717 px；gallery 双列各 344.5 px | 717 × 403.3125 px | PASS |
| 1440 × 1000 | Hero 491.28125 px；gallery 双列各 576 px | 1180 × 663.75 px | PASS |

三档 iframe ratio 均为 1.778，src 为 `youtube-nocookie.com`，title 非空；没有横向溢出。

## 23. FAQ / no-FAQ result

**PASS**。

- FAQ-rich guide：2 个 authored questions 可见；390 px 展开回答可读；768/1440 宽度分别 717/1180 px；FAQ heading/question 不进入 4 项 body TOC；无 FAQPage JSON-LD。
- No-FAQ production guide：390/768/1440 均无 FAQ section/heading、空 gap 或横向溢出，既有 4 项 body TOC 不变。
- Homepage：当前无 authored homepage FAQ，因此不输出 FAQ markup；组件/model fixture 已验证非空时才显示。

## 24. 390 / 768 / 1440 responsive QA result

使用真实生产静态预览和不修改正式数据的临时隔离夹具，检查 Homepage、minimal-data、20+ pages、media-rich、FAQ-rich、no-FAQ 六类状态。

| 视口 | Production Homepage | 主要验证 |
| --- | --- | --- |
| 390 × 844 | 内容宽 347 px；mobile nav | Start Here 可见、category 单列、无 overflow |
| 768 × 1024 | 内容宽 717 px；mobile nav | cards 自适应、无 overflow |
| 1440 × 1000 | 内容宽 1180 px；desktop nav | 层级清晰、grid 正常、无 overflow |

- 所有代表页 `body.scrollWidth <= documentElement.clientWidth`。
- Start Here 在正式与 20+ fixture 均可见；Browse All 在密集 fixture 保留全部剩余页。
- gallery、caption、FAQ、details touch target、16:9 video 与 cards 在三档均可读且不越界。
- fresh browser console 在测试页面没有 error/warning。
- 视觉品质、版权与事实适当性未作为自动化结论，继续属于 Human/SOP QA。
- 临时服务已停止，browser viewport 已 reset，agent-created tabs 已关闭；一次性 QA 副本已从 `/tmp` 移入 macOS 废纸篓，清空前可恢复。项目中没有 QA route/fixture 数据残留。

## 25. Starter/demo homepage language

**REMOVED**。首页拥有的 main composition 与 footer 不再显示 Published nodes、Active systems、Source policy、Operating doctrine、static-delivery doctrine、Starter setup CTA 或坐标式工程文案。生产渲染回归测试同时禁止内部 Priority、Confidence、Search Signal、primaryKeyword、content/development status、Editorial Brief 与 Evidence Ledger。

既有 Starter adoption guide 仍是一个正常 enabled content page，并继续由批准的 Inventory/Navigation 架构管理；Phase D 没有篡改其页面事实、route 或正文。

## 26. Homepage CMS

**NOT INTRODUCED**。没有 `homepage.sections`、configurable blocks、section registry、layout DSL、Page Builder、database 或第二 publication/content SSOT。Composition order 固定在 `index.astro`；`home-model.ts` 是纯派生函数。

## 27. Media scope

**NOT EXPANDED**。没有新 placement、Remote Images、dimensions/crop、image pipeline、upload、DAM、CDN 或 Media Engine。Homepage 只消费既有 hero/gallery/trailer 解析结果。

## 28. Dependency/package/lockfile status

**UNCHANGED**。未安装依赖；`package.json`、`package-lock.json` 无变化。

## 29. `git diff --check` result

**PASS**。

## 30. Git status

分支：`codex/phase-d-wiki-portal`，HEAD 仍为批准的 Phase C checkpoint `fcd3d09ca7d7c7235c29c92a6ee9721b1f00c4df`。

- 7 个已跟踪文件修改：`src/components/Footer.astro`、`src/components/wiki/WikiArticle.astro`、`src/content.config.ts`、`src/pages/guides/[...slug].astro`、`src/pages/index.astro`、`src/styles/global.css`、`tests/wiki-article.test.ts`；
- 7 个新增文件：4 个 home files、`src/components/wiki/FAQ.astro`、`tests/homepage.test.ts`、本报告；
- 所有 Phase D 变更未提交。

Stable Core、Page Inventory/schema、Navigation、Media schema/catalog/components、Theme/Page-family architecture、依赖与 lockfile 无差异。

## 31. Commit status

**NO**。Phase D 未 commit；批准的 Phase C Git checkpoint 保持不变。

## 32. Push status

**NO**。

## 33. Deploy status

**NO**。仅本地 validate/check/build/preview，没有 dry-run deploy 或正式部署。

Phase D 到此停止，等待人工评审。不得由本报告推定 Phase E 授权。
