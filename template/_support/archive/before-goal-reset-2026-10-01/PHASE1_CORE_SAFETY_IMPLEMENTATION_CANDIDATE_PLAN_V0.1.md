# PHASE 1 — CORE SAFETY IMPLEMENTATION CANDIDATE PLAN V0.1

**任务类型：** Implementation-candidate planning only。  
**日期：** 2026-09-30，Asia/Taipei。  
**定向修正：** 2026-10-01，Asia/Taipei；独立审查完成后，仅修正四项批准问题及直接影响的引用、预算与就绪条件。  
**授权产物：** 仅本文件；未创建候选、分支、worktree，未安装依赖、实现源码/测试或修改 CI。  
**Goal：** 将冻结 Core Safety Contract V0.1 的五项 Core 安全义务转换成可独立审查、最小且有证据出口的候选实施计划。  
**Architecture：** 保留原生 disclosure、Runtime Page Inventory → enabled catalog → route/output projection，以及已有 SEO、Pagefind、媒体和 final/evidence 流程；只补充局部导航行为、确定性安全输入和现有审计扩展。  
**Tech Stack：** 冻结仓库中的 Astro、TypeScript、Zod、Vitest、tsx、Pagefind；未来增加一个浏览器测试开发依赖。本文不含生产代码或测试代码。

## A. Executive Summary

建议 **READY FOR CANDIDATE CREATION**，仅表示架构/规划就绪。原计划独立审查已完成；四项修正后的下一步是独立冻结核验本计划，候选创建及实施均需之后单独授权。本建议不批准发布、不命名版本、不提升能力状态。

最小方案如下：

| 能力 | 候选实现形状 | 最大限度保留 |
|---|---|---|
| AX-01 | 在现有 Header 内加入局部、原子初始化的原生导航增强；MobileNav 仅提供必要局部标识 | `details.open` 唯一状态、原生 Enter/Space、父级 Overview 链接、已解析目录、非模态 Tab 顺序 |
| AX-03 | `@playwright/test` 驱动三个测试专用逻辑角色，固定契约矩阵与完整性报告 | Vitest/type/build 审计、实际 Core 组件和 CSS，生产路由不增加 fixture |
| PP-02 | Core 工具侧固定 sentinel catalog、生产输入投影、枚举输出 surface coverage | 现有 validate/audit、Pagefind 专用 manifest/reference 安全、final/evidence 失败语义 |
| TL-01 | inventory 上逐页 LegalActivation；缺省 unavailable；批准 digest 与解析后的实际 policy 绑定 | 唯一 inventory/catalog 权威、正常 canonical/indexability、Footer/related/search/sitemap 投影 |
| TL-02 | 可选受控 Organization/Person 和独立角色声明；缺省 WebSite/WebPage，Article/Breadcrumb 保留 | 品牌显示、canonical 与已有 `#website`/`#webpage`/Article/Breadcrumb ID、安全 JSON 序列化 |

不是重写导航或 SEO。DesktopNav 的源码暂定 NO CHANGE；仅浏览器证据证明其 hover/focus 样式违反关闭或键盘义务时，做局部修正。法律固定路由必须迁移成可返回零路径的 route handler，不能只把记录标成 draft。Pagefind 现有审计验证 artifact 身份、存在性与预算，**并未扫描 fragment 文本**；该专用扩展是必要工作，不能把文件存在当作 PP-02 已覆盖。

计划采用四个依赖明确的实施切片，不新建统一 approval 状态、通用 linter、路由注册表或 Schema.org 引擎。所有实施测试都在未来可变候选中运行；本任务仅做源码/配置/测试只读检查，未运行 application tests/build/browser suite。冻结 baseline 的历史 38 文件/485 测试结果不是本次执行结果。

四项修正固定以下边界：中性 adopted final-build 准备归 Phase-1 test/build plumbing，不依赖 Playwright 或 AX-03；媒体开发说明迁出 `public/`，历史指令签名仍保留；Article author 必须映射真实可见署名，publisher 不自动要求文章 UI；实施前 Candidate Creation 验证报告是主要 provenance 证据，`.git` 本地记录仅可选、非权威。四个切片及冻结行为不重开。

## B. Frozen Inputs

执行位置 `pwd` 和 `realpath .` 均为 `/Users/randyz/work/coding/hot_words_web`。以下三个输入实际 SHA-256 与预期匹配；内容中的旧工作流状态描述不覆盖本次用户给出的 FROZEN 状态。

| 输入 | 绝对路径 | Before / Expected SHA-256 |
|---|---|---|
| Product Contract v0.2 | `/Users/randyz/work/coding/hot_words_web/template/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md` | `3fe0c98d7e98f963de37fd80b3f2dbe33a822b810a1f268ec4aaef8dad90682a` |
| Capability Support Baseline | `/Users/randyz/work/coding/hot_words_web/template/GAME_SITE_STARTER_V2.6.5_CAPABILITY_GAP_AUDIT_V0.2.md` | `094d5980af15fffbf841a9001f8260b8745db22b721b876ad916dd1f919cf985` |
| Core Safety Contract V0.1 | `/Users/randyz/work/coding/hot_words_web/template/CORE_SAFETY_CONTRACT_DESIGN_V0.1.md` | `7fc4ccddc9522ce179005c29729a39e5efb09b5e522fef0ed83b26cd3b0d887c` |

Starter 的实际 `git rev-parse --show-toplevel` 为 `/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.6.5`；HEAD 与 `starter-v2.6.5^{commit}` 均为 `29b25559cf2af859bca359c7f7fda686a4803c95`；`status --porcelain=v1` 为空。

证据优先级：Product Contract H、J–L、S–T 定义要求/归属；Baseline I、J、K、S–V、AC 定义现有证据与 preserve；Safety Contract F–J、L、N、P 明确本次冻结行为；Starter 实际源码解释改动位置。Baseline 的早期 ARIA 表述已由冻结 Safety Contract F 澄清：native 不默认添加冗余 ARIA，不借此修改 baseline。

本次定向修正的 Plan pre-edit SHA-256 为 `93a5c995d2dbb7e99adf205ae7a53c3a54fa087bbd73aad067c3569143a1ad77`，与指定输入匹配。文档保存后重新核对冻结 checksum、HEAD/tag、clean tree，并比较排除唯一授权目标文件的全工作区文件元数据指纹；初始快照含 616571 个文件，指纹 `2be81fbbfd8e017e8dbff138a8127fdf2ea8766eb062a9ac36192570643246df`。它用于本次执行范围核验，不作为候选行为证据。

本次仅修改此既有计划，不新增文件；After checksums、Starter 状态、范围指纹及 corrected Plan 新哈希在交付核验输出中记录。原规划阶段“新增计划文件”的记录不是本次修改计数。未执行未来 implementation checklist；文档结构/路径/范围检查是规划完整性检查，不是五项能力的实现证据。

## C. Planning Scope

| ID | 冻结支持状态 | 本期 Core 边界 |
|---|---|---|
| AX-01 | GAP / DIRECT | disclosure 行为及证据；不做模态 drawer |
| AX-03 | GAP / DIRECT | 三角色最小浏览器 fixture runner；不做 assembled Acceptance |
| PP-02 | GAP / SEAM | Core 自有已知残留检测；未知品牌/事实真实性由外部负责 |
| TL-01 | GAP / DIRECT 安全机制 | 不可用缺省及内容绑定激活；不写法律政策 |
| TL-02 | PARTIAL / SEAM | 受控结构化 identity/roles 的非断言缺省与 guard；不核验实体真实性 |

不改变 Product Contract 的 Implementation Owner：PP-02/TL-01 的项目内容责任仍属于 Adaptation/Project Content；TL-02 事实责任仍属于 Adaptation。Core 只承担冻结 safety contract 分配的机械安全责任。AX-02、VF-02 等现有样式被用作回归对象，并不因此成为本期 hardening 目标。

## D. Current Source Architecture

以下源码路径相对于已验证的 Starter 根目录；它们是证据路径，不是当前待修改文件。下文标为「未来新增」的路径只是候选建议，当前不存在也不会创建。

| 实际位置 / 锚点 | 当前职责与发现 | 规划含义 |
|---|---|---|
| `src/components/navigation/MobileNav.astro:12` | 外层 details、summary Menu、嵌套 group details、Overview 与 children；无脚本 | 原生结构已足够，补 Escape/focus/cleanup |
| `src/components/navigation/DesktopNav.astro:12`；`src/styles/global.css:187` | 父链接 + 普通子列表；由 hover/focus-within 开显，无按钮状态 | 保留；opacity/pointer-events 不等于关闭时不可 Tab，需真实证据 |
| `src/components/Header.astro` | 导入 site-data，向两个 presentation renderer 传入 resolved groups；首页 brand 链接可作 fallback | 协调两个 responsive copy 的最小本地作用域 |
| `global.css:2242,2339,2500` | `max-width:900px` 切导航，900 仍 mobile，901 desktop；620 布局规则；已有 reduced-motion | runner 边界从实际样式导出；不另造断点权威 |
| `tests/navigation.test.ts` | 源码与 CSS 匹配，含 44px toggle、panel 高度检查 | 保留结构防线，浏览器才证明行为 |
| `package.json`、lock root、`vitest.config.ts` | Astro/React/Zod；Vitest 只收 `tests/**/*.test.ts`；没有 browser runner | 独立 `.spec.ts` 避免 Vitest 重复收集 |
| `package-lock.json:7184–7233` | Vitest optional peer 提到 browser providers/jsdom；无对应 installed package record | 这些声明不能提供真实 Chromium/Firefox/WebKit 执行 |
| `.github/workflows/ci.yml` | Node `.nvmrc`、npm ci、npm run check、npm run build，15 分钟 timeout | 先独立准备中性项目并跑 canonical build，再增 browser/setup/result |
| `src/core/catalog.ts:4`；`site-data.ts:10–20` | public + published + feature 过滤，统一 route/id maps | 法律 eligibility 进入这一条链；不在 footer/search 重复判定 |
| `src/core/site-validation.ts:118` | 汇总 route/content/feature/navigation/indexability 等错误 | 保留 string[] 模式，添加法律/identity 矛盾校验 |
| `scripts/validate-site.ts:36,136` | config/inventory/content/facts/media 预检；五个 fixedRoutes 包括 privacy/terms；public validate final-only | 移除仅 legal 的固定输出假设，source safety 在此汇总 |
| `src/core/content-files.ts` | 读 md/mdx，仅提取 pageId，不返回正文 | source sentinel 检查要保留解析出的 body，而非把 reference 当全文 |
| `static-page-copy.ts`、`LegalPage.astro:28` | About 与 draft policies 共用 copy；把 updatedAt 展示成 Last reviewed | legal 独立已解析 payload；不得由 updatedAt 制造 review claim；About 保留 |
| `src/pages/privacy.astro`、`terms.astro` | 固定生成且无 getStaticPaths；getPageByRoute 不能实现零路径 | 改为 optional static route 形态 |
| `Footer.astro`、`getRelatedPages`、`astro.config.ts` | 已经依赖 enabled catalog；sitemap 又依赖 indexability | 正确 eligibility 接入后通常不用改这些 consumers |
| `src/core/seo.ts:45,98`；`BaseLayout.astro:25` | 默认 Organization + WebSite.publisher + Article author/publisher；任意 structuredData 被拼入 graph | 保留 helpers，改变 unsafe identity 默认并 guard extension |
| `WikiArticle.astro:61`、`EditorialArticle.astro:32` | 两个 Article consumer；现有 header 不显示 author/publisher credit | 本期明确支持配置 author，增可选 visible author attribution 与同一输入映射；publisher 不要求文章 UI |
| `src/core/html-audit.ts:425` | metadata、链接、JSON 语法、H1、Pagefind body、ads、orphan 检查；实体 decoder 有限 | 扩展确定性 surface 提取和 controlled JSON-LD 校验 |
| `scripts/audit-build.ts:122` | route HTML map、assets/媒体/budgets、robots/sitemap、Pagefind checks；静态页不准引用 client JS | 优先 inline 小导航增强，保留无外部 bundle 的 static-page 防线 |
| `scripts/build-site.ts:19,96` | preflight → Astro → reconciliation → Pagefind → normalization → audit；证据 marker 成功后写入 | purpose 要显式传至输出审计，stage 顺序/marker 失败不改变 |
| `pagefind-artifacts.ts:307`、`normalize-pagefind-output.ts` | Pagefind 1.5.2 manifest/CBOR refs、exact file set、800KB、安全删 optional UI；只读 pf_meta 内容 | 复用 reference enumeration，加限定版本 textual payload 投影 |
| `public/logo.svg`、`favicon.svg`、`public/media/README.md` | logo 有 `Game Atlas logo`；favicon 无品牌文本；public 文件会复制到输出，README 是开发接入说明 | 未来 README 窄迁移至 `docs/media/README.md`，不再是生产 surface；真实 public SVG/text 继续登记 |
| `README.md:202`、`docs/CONTENT_AND_DATA_GUIDE.md:256`；`tests/runtime-contract.test.ts`、`tests/release-identity.test.ts` | 现行链接及测试读取旧媒体 README 路径 | 只随迁移更新这些直接引用，历史报告保留原来源路径 |
| `tests/media-build.test.ts:58`、`evidence-build.test.ts:66` | 临时 projectRoot 复制源码、共用 node_modules；直接使用示例品牌/域名 | 未来用中性已采用 fixture 输入跑成功分支，保留拒绝 sample 的专门用例 |

当前 `load-config.ts` 直接 import game.config，inventory 也是静态 import；没有可复用多项目运行环境 API。共享中性项目准备沿用已有临时目录模式，普通 Node/tsx/Vitest/build tooling 可独立使用，浏览器 runner 只是另一消费者；实际 Core 源码按明确清单取用。不增加 production fixture-mode 配置，也不用于候选来源的 file-copy bootstrap。

## E. File Impact Map

### LIKELY REQUIRED — 已存在文件

风险：H 高、M 中、L 低。每行只使用规定 Change Type；MOVE 在 MODIFY 行内描述，不另造类型。这里所有变更均指未来候选。

| Path | Capability IDs | Current Responsibility | Why It Must Change | Change Type | Risk | Preserve Constraint |
|---|---|---|---|---|---|---|
| `src/components/Header.astro` | AX-01 | 组装两套导航与 brand link | 局部初始化、Escape、双向 responsive focus 协调 | MODIFY | M | 不移入 catalog 逻辑、不全局 store、不框架 hydration |
| `src/components/navigation/MobileNav.astro` | AX-01 | native disclosure presentation | 最小 root/group/trigger 定位，必要 nested summary pageId 对照 | MODIFY | L | 原生 open、Overview、resolved groups、无冗余 native ARIA |
| `src/config/schema.ts` | PP-02, TL-02 | strict project config | additive literals 与受控 identity/role 输入，缺省安全省略 | MODIFY | M | brand/features/navigation backward parsing，未知字段拒绝 |
| `src/data/schemas/page-inventory.ts` | TL-01 | strict inventory schema | 仅 legal 页面可有 activation；省略等于 unavailable | MODIFY | M | 现有 pageId/route/flags/uniqueness/date 规则 |
| `src/data/page-inventory.json` | TL-01 | shipped records | privacy/terms 缺省 draft/private/noindex、unavailable | MODIFY | L | ID/route provenance 保留，不改其他内容策略 |
| `src/core/catalog.ts` | TL-01 | enabled projection | 在现有 publication 条件之外加入已验证 legal eligibility | MODIFY | H | 单一 enabled authority，不修改其他类型过滤规则 |
| `src/core/site-data.ts` | TL-01, TL-02 | resolved singleton data | 提供解析 legal payload 给同一 catalog；集中解析相关安全输入 | MODIFY | H | route/id maps、related/navigation resolver 保留 |
| `src/core/site-validation.ts` | TL-01, TL-02 | string[] validation errors | activation/content/flags/digest，article claim pageId/类型矛盾 | MODIFY | M | 现有错误聚合和导航失败，不静默过滤非法 activation |
| `src/core/static-page-copy.ts` | PP-02, TL-01 | about/privacy/terms 默认文本 | 保留 About；去除可渲染 draft legal fallback；公开 about copy 进入 sentinel 投影 | MODIFY | M | About 不因 legal capability 被禁用；无自动 approval |
| `src/components/LegalPage.astro` | TL-01 | 静态 copy renderer | 只渲染已批准 legal payload；去除由 updatedAt 生成的 review claim | MODIFY | M | 正常 BaseLayout/related/indexability；About 原职责保持 |
| `src/pages/privacy.astro` | TL-01 | fixed policy route | 迁移至未来 `src/pages/privacy/[...path].astro`，getStaticPaths 可返回 [] | MODIFY | H | 不保留原固定文件，不渲染 draft/noindex 假页面 |
| `src/pages/terms.astro` | TL-01 | fixed policy route | 同样迁移至未来 `src/pages/terms/[...path].astro` | MODIFY | H | 路径来自 existing legal inventory 验证；无平行 registry |
| `src/core/content-files.ts` | PP-02 | content references | 已有读取时保留正文用于 enabled-page source 扫描 | MODIFY | L | 不另写 MDX parser；inactive 正文不进入生产扫描 |
| `src/core/seo.ts` | TL-02 | canonical/base/article/schema/serialization | 省略默认身份、生成明确受控 nodes/roles、提供窄 guard | MODIFY | H | canonical、website/page IDs、Article/Breadcrumb、serializer |
| `src/layouts/BaseLayout.astro` | TL-02 | assemble structured graph | 对最终 base + extension graph 应用相同 controlled guard | MODIFY | M | 保留普通非 identity extension、meta 与 serialization |
| `src/components/wiki/WikiArticle.astro` | TL-02 | guide Article consumer | 本期包含显式 Article author 路径，需同一 resolved identity 的可见 author attribution seam | MODIFY | M | 无 author 则无署名；publisher-only 不要求文章 UI；TOC/media/related 保持 |
| `src/components/EditorialArticle.astro` | TL-02 | news/meta Article consumer | 同上，author claim 不可与实际署名分离；不是因 publisher 而修改 | MODIFY | M | 无 author 则无署名；publisher-only 不要求文章 UI；dates/sources/breadcrumb/slot 保持 |
| `src/core/html-audit.ts` | PP-02, TL-01, TL-02 | parsed HTML/SEO/ad audit | decoded text/attrs/JSON-LD surface；窄身份 guard；legal 输出对照 | MODIFY | H | 现有 ads、H1、canonical、links/orphan/JSON 检查不削弱 |
| `src/core/pagefind-artifacts.ts` | PP-02 | manifest refs/exactness/budget | 在已枚举 Pagefind refs 上提供固定版本可扫描文字/URL 投影 | MODIFY | H | 不更换 provider/CBOR parser，不扩展成 generic artifact engine |
| `scripts/normalize-pagefind-output.ts` | PP-02 | discovery/normalization | 将需要扫描的已知 textual payload bytes 提供给现有 adapter | MODIFY | M | optional UI 安全证明/移除、symlink/unknown/version 拒绝保持 |
| `scripts/validate-site.ts` | PP-02, TL-01, TL-02 | preflight orchestration | source scan、安全错误聚合；legal 不再固定必生成 | MODIFY | H | home/about/404 fixed guarantees、媒体与 final-only CLI |
| `scripts/audit-build.ts` | PP-02, TL-01, TL-02 | output audit orchestration | required coverage map、purpose 分级、post-render guard | MODIFY | H | budgets/media/routes/robots/sitemap/Pagefind/marker checks |
| `scripts/build-site.ts` | PP-02 | final/evidence stages | 把已校验 purpose 显式传至 output audit | MODIFY | M | 同一技术 stage 顺序、停止首错、marker 后写及失败闭合 |
| `public/media/README.md` | PP-02 | developer/adoption documentation，当前被复制公开 | 迁移至非 public 的 `docs/media/README.md`，源文件离开 public；迁移按同一 existing file 计 | MODIFY | L | 保留开发说明及历史 provenance 文本；历史 sentinel 留 tooling；不重组 docs |
| `README.md` | PP-02 | 现行接入文档链接 | 仅更新媒体 README 链接到迁移目标 | MODIFY | L | 不改版本、发布或媒体契约说明 |
| `docs/CONTENT_AND_DATA_GUIDE.md` | PP-02 | 现行媒体接入说明 | 仅更新媒体 README 路径引用 | MODIFY | L | 保留正文与历史来源，不重组文档 |
| `package.json` | AX-03 | commands/deps | 增 test:core-browser；仅 dev runner | ADD DEV DEPENDENCY | L | 不改 runtime engines/version 或现有 scripts |
| `package-lock.json` | AX-03 | locked dependency graph | 未来安装授权后锁 runner 与 browser revision 对应依赖 | ADD DEV DEPENDENCY | L | 不做无关升级，不在此选择版本 |
| `.github/workflows/ci.yml` | PP-02, TL-01, TL-02, AX-03 | check/build CI | 先调用浏览器无关的共享准备，再在明确 projectRoot 跑 canonical build；之后 browser provisioning/执行/report | CI CHANGE | M | 保留 npm ci/check/build；build 准备不归 browser runner；不新增 release pipeline |
| `.gitignore` | AX-03 | generated-file exclusions | 测试 result/trace 不应成为 product/source | MODIFY | L | 不忽略真正源码/fixtures，现有忽略保留 |
| `tests/navigation.test.ts` | AX-01 | source semantics | 新 local hooks/无 redundant ARIA 结构约束 | MODIFY | L | 不用 source match 冒充 keyboard/focus evidence |
| `tests/config.test.ts` | PP-02, TL-02 | strict config | literals/claims 独立可选、无未知/弱确认输入 | MODIFY | L | 原配置样例仍可 schema parse；final residue 为另一门禁 |
| `tests/catalog.test.ts` | TL-01 | projection/schema | legal zero projection，active/invalid cases；旧 predicate 增 legal 条件 | MODIFY | M | 非 legal gate 不变化 |
| `tests/site-data.test.ts` | TL-01 | resolved consumers | 同一合法 projection、related/legal exclusion | MODIFY | M | 无效 nav 仍失败，不改为静默删链接 |
| `tests/site-validation.test.ts` | TL-01, TL-02 | aggregated errors | flags/digest/role/page conflicts | MODIFY | M | 独立现有错误仍被汇总 |
| `tests/static-page-copy.test.ts` | TL-01 | draft copy expectations | 有意替换“提供 public starter policy”假设为无 draft fallback | MODIFY | L | About evidence-led 内容职责不变 |
| `tests/seo.test.ts` | TL-02 | graph/helper behavior | 将默认 5 nodes 含 Organization 改为 4 nodes、独立角色 permutation | MODIFY | M | serializer attack case、canonical/breadcrumb/robots 保留 |
| `tests/html-audit.test.ts` | PP-02, TL-01, TL-02 | generated HTML negatives | 中性成功输入、sentinels/extension/controlled references negatives | MODIFY | M | 原始 metadata/ad/link negatives 保留 |
| `tests/output-reconciliation.test.ts` | TL-01, AX-03 | exact expected/actual | 加 unavailable legal、fixture/stale extra HTML 拒绝 | MODIFY | L | 不放宽 missing/unregistered 检查 |
| `tests/pagefind-artifacts.test.ts` | PP-02 | versioned artifact fixtures | 增真实 textual payload scan 专用 cases；原 size-only mocks 保持各自用途 | MODIFY | M | 不令旧大小测试假装证明 fragment 文字安全 |
| `tests/media-build.test.ts` | PP-02, TL-01, TL-02 | media successful production build | 成功数据采用中性 config/inventory/copy/public logo；legal safe absence | MODIFY | M | 原媒体 placement/nav/missing asset 断言不删 |
| `tests/evidence-build.test.ts` | PP-02, TL-01, TL-02 | purpose/marker integration | 中性成功 fixture + ordinary sample warning + legal/identity hard failures；补 marker-write failure | MODIFY | H | 原 media pending/revise/block/marker/technical cases保持 |
| `tests/runtime-contract.test.ts` | PP-02 | 现行 runtime 文档路径及 Node 约束 | 仅将媒体 README 读取路径更新到迁移目标 | MODIFY | L | Node 版本/engines 与文档断言不变 |
| `tests/release-identity.test.ts` | PP-02 | 现行文档及 carried-forward provenance 断言 | 仅将两个媒体 README 读取路径更新到迁移目标 | MODIFY | L | 保留既有版本/tag/provenance 断言；不命名 release、不新增治理 |

### LIKELY REQUIRED — 未来新增文件

| Proposed Path（当前不存在） | Capability IDs | Responsibility / Why | Change Type | Risk | Preserve Constraint |
|---|---|---|---|---|---|
| `scripts/core-safety-sentinels.ts` | PP-02, TL-01 | 固定 built-ins、来源锚点、有限 source/output scope、literal matcher/coverage 结果 | ADD HELPER | M | 仅 tooling 导入，不能 client bundle；项目只追加 |
| `src/core/legal-safety.ts` | TL-01 | policy payload canonicalization/digest、activation eligibility、错误；唯一 renderer/validator 语义 | ADD HELPER | M | Node crypto 仅 build/server，无法律 workflow |
| `src/data/legal-content.ts` | TL-01 | 项目拥有的可选 privacy/terms 静态 payload；缺省为空 | ADD CONFIG | L | 不含 route/eligibility registry，不提供已批准 sample policy |
| `tests/core-safety-sentinels.test.ts` | PP-02 | catalog/source/scope/coverage negatives | ADD TEST | L | 每个 built-in 都有阳性和邻近阴性 |
| `tests/legal-safety.test.ts` | TL-01 | digest/states/flag conflict unit coverage | ADD TEST | L | 不证明法律准确性 |
| `tests/core-safety-build.test.ts` | PP-02, TL-01, TL-02 | 少量输出 permutation、encoded residue、stale route/search/identity injection | ADD TEST | M | 复用真实 build/audit，不新增一站一用例 |
| `tests/helpers/core-build-fixture.ts` | PP-02, TL-01, TL-02；AX-03 可复用 | Phase-1 test/build plumbing 拥有的共享中性项目准备库：显式 inputs、projectRoot、运行/清理 | ADD HELPER | L | 可由 Node/tsx/Vitest/build tooling 独立调用，无 Playwright/browser/AX-03 依赖；不造 framework |
| `tests/core-browser/core.spec.ts` | AX-01, AX-03 | 三角色矩阵、真实 interaction、fixture 出错/缺项失败 | ADD TEST | M | `.spec.ts` 不进入现有 Vitest include |
| `tests/core-browser/coverage.test.ts` | AX-03 | 期望矩阵/缺失、skip、空报告拒绝的单元测试 | ADD TEST | L | 预期清单独立于实际成功行，不能按已跑数自证 |
| `playwright.core.config.ts` | AX-03 | testDir/projects/timeout/server/result config | ADD CONFIG | L | 不污染 Astro production config、不选 package version |
| `scripts/run-core-browser.ts` | AX-01, AX-03 | 测试构建/本地静态 404 server/runner/报告完整性包装 | ADD SCRIPT | M | 仅 loopback，无外部服务、无 full-site crawl |
| `tests/fixtures/core-browser/shell.astro` | AX-01, AX-03 | actual Header/MobileNav/DesktopNav/BaseLayout/ Footer、nested/long label/unavailable text | ADD FIXTURE | L | 测试专用 overlay，非 production src/pages |
| `tests/fixtures/core-browser/detail.astro` | AX-03 | actual WikiArticle、breadcrumbs/related、long URL/table/anchor destination | ADD FIXTURE | L | 复用 actual styles，无新 Pattern |
| `tests/fixtures/core-browser/404.astro` | AX-03 | 已有 404 页的测试入口，复用现有 actual source/body | ADD FIXTURE | L | 不能手写另一份 Recovery 实现 |
| `tests/fixtures/core-browser/data.ts` | AX-01, AX-03, PP-02 | 共享中性数据、长菜单与 media decision 显式输入 | ADD FIXTURE | L | 不是新角色/真实游戏/已核验政策/身份 |

Recovery wrapper 在临时构建映射中使用实际 `src/pages/404.astro`；不复制并维护另一个 404 body。shell/detail 可覆盖临时项目入口，但从候选导入实际组件与样式，所有 temporary output/cache 与 report 均在测试工作区或非 public result 目录。

### ONLY IF IMPLEMENTATION EVIDENCE DEMANDS IT

| Path | IDs | Current Responsibility | Evidence Trigger / Change | Change Type | Risk | Preserve Constraint |
|---|---|---|---|---|---|---|
| `scripts/prepare-core-build-fixture.ts`（未来新增，最多一个） | PP-02, TL-01, TL-02 | 共享准备库的 CLI 出口 | 仅当 CI 不能通过窄 existing-script integration 调用 helper 时，增加很小的准备/返回 projectRoot wrapper | ADD SCRIPT | L | Node/tsx 独立运行，不导入 browser runner/Playwright；不造 workspace generator |
| `src/components/navigation/DesktopNav.astro` | AX-01, AX-03 | hover/focus presentation | 真 browser 证明隐藏 tab stop、Escape 重开或不可达 children；仅局部 dismissal correction | MODIFY | M | 不把父链接变成混合 toggle、不全面改写 |
| `src/styles/global.css` | AX-01, AX-03 | focus/visibility/motion/overflow | summary 焦点不显、长文字溢出或 native/menu 关闭缺陷；仅对应 selector | MODIFY | M | 不重做 VF token/theme，不以 body overflow:hidden 藏错 |
| `src/pages/404.astro`、`WikiArticle.astro`、`EditorialArticle.astro` 的 main | AX-03 | fragment focus target | skip-link 真实焦点失败则给现有 main 最小 programmatic focus target 支持 | MODIFY | L | 不改 Recovery/body/layout；不全站重构 main |
| `tests/theme.test.ts`、`tests/wiki-article.test.ts` | AX-03, TL-02 | source/style assertions | 精确 selector/credit 修改破坏旧结构断言时调整并保留实质保护 | MODIFY | L | 不删 meaningful negative assertions |
| `public/logo.svg`、`game.config.ts`、`src/content/guides/getting-started.mdx` | PP-02 | supplied adoption examples | 只有明确批准把候选 shipped demo 变成中性示例时才替换；非本计划必需 | MODIFY | M | 不把 synthetic brand 当真实已采用项目；不 waiving sample residue |

### Inspected preserves — NO CHANGE

`src/components/Footer.astro`、`src/pages/about.astro`、`astro.config.ts`、`src/pages/robots.txt.ts`、`src/core/output-reconciliation.ts`、`src/core/public-sources.ts`、`src/core/search-state.ts`、`src/components/islands/SearchIsland.tsx`、`src/core/page-resolution.ts`、`src/core/page-models.ts`、`src/core/optional-routes.ts`、`src/config/load-config.ts`、`src/styles/page-families.css`、`src/styles/theme.css`、`public/favicon.svg`、`vitest.config.ts`、`tsconfig.json`、`.nvmrc`：Change Type **NO CHANGE**；分别继续负责已有 consumer projection、exact routing、search/media安全或工具配置。它们不需要新法律/身份判定；测试验证 consumer 正确即可。只为命名一致性修改这些文件没有理由。CI build fixture 数据准备见 M，不能隐式依赖 shipped 示例可通过 final。媒体 README 已明确列为迁移；其他历史文档中的旧路径保留为历史来源记录，不做批量替换。

## F. AX-01 Implementation Plan

**最小本地位置：** Header 的小 inline enhancement 处理其自身 mobile root 和同一个 header 的 desktop/brand fallback；MobileNav 仅补局部识别信息。native `details.open` 权威，CSS 仍使用 `[open]`。不添加 redundant `aria-expanded`/`aria-controls`，也不拦截 native Enter/Space 再 toggle 一次。原生 summary、列表、nav label、真实 links 与 no-JS 行为保留。

| 行为 | 最小处理 / 可证伪出口 |
|---|---|
| 初始化 | 先定位并验证该 header 的必需节点，再一次性挂接 listeners；初始化失败保持 native baseline；重复初始化不叠 listener；无 client router |
| 打开 | native 打开且焦点留在 summary；下一 Tab 进入首个可用目的地；无 autofocus/focus trap |
| Escape | 只在相关 disclosure/trigger 有焦点时寻找包含焦点的最内层 open details；关闭并 focus 其可见 summary；第二次可关外层；无相关 open 状态则不消费事件 |
| 关闭外层 | 同步重置所有 nested open；焦点在将隐藏内容中才移至外层 summary；原生 trigger toggle 不额外抢焦点 |
| toggle 事件 | native toggle 可能异步且合并；读当前 open 值，不读旧 cached state；显式关闭操作同步 cleanup，toggle listener 幂等兜底 |
| mobile → desktop | actual breakpoint 900/901 切换时先记当前 pageId/焦点归属，close/reset mobile；若将隐藏，focus 同 pageId 的可见 desktop anchor，否则可见 brand home link |
| desktop → mobile | desktop copy 持焦点才 focus visible mobile summary；关闭 mobile/nested；非导航焦点不变 |
| destination | 普通跨 document link close originating disclosure，但不晚到 callback restore obsolete trigger；不 preventDefault 普通导航 |
| same-page anchor | close originating root 后，将焦点给已解析且可见的真实 anchor target；必要临时 programmatic tabindex 不加入 Tab 顺序；缺失 target 由静态 link/output 规则和 test 拒绝，不能把焦点留 hidden |
| desktop 现态 | 无 native dismissible trigger；先测试真实 keyboard/reachability。若 Escape 义务涉及已展开 submenu，则在同一局部范围实现关闭且避免 focus-within/hover 立即重开；证据触发具体 markup/CSS 小改 |

响应式判定与 CSS 的 `max-width:900px` 一致；boundary test 核对脚本和实际样式，不能另有 899 判定。浏览器验证 resize event 已让旧元素不可见时，仍能通过 DOM containment 识别原 focused element。连续 resize、Escape 与 toggle 同帧、关闭祖先后迟到 nested toggle、目标被导航卸载均需幂等处理；恢复焦点前确认 target 仍 connected 且可见。页面其它 details 不属于 controller。

**脚本预算：** 推荐 inline、局部、小量 JavaScript，避免给所有静态页引入 `/_astro/*.js` 从而撞上 audit-build 的静态页规则。不为导航宽泛豁免任意脚本；既有外部 script 禁止与 JS 总预算继续保留。inline 自身的行为、非外部依赖与无重复执行由输出/browser 证据验证。如需要抽成文件，只能在具体维护证据成立后，不先造 nav framework。

**测试：** navigation.test 保留 native structure/Overview/destination/source boundary；browser shell 测 Enter 和 Space 各一次、Tab/Shift+Tab、nested 两级 Escape、外层 trigger-close cleanup、actual activeElement/visibility/open、link/anchor、双向和重复 resize、无 JS native operability。custom button 只在证据证明 native 不足且架构复审后考虑：它必须有 truthful aria-expanded 与适用的 aria-controls/实际 ID；不是当前默认方案。

不实现 outside-click、modal role、scroll lock、全局 state、accordion sibling exclusivity、箭头键菜单、nav framework。outside-click 不是冻结必需项，无需扩大测试。

## G. AX-03 Implementation Plan

**工具决定：** 未来用 `@playwright/test`，dev-only，不选版本也不安装。现有 Vitest/tsx 能执行 unit/build，无法提供锁定三 engine 的真实 focus/resize/no-JS；Vitest optional browser peers 不是现成 browser executor。再加 Vitest browser provider 会多一层配置，当前不需要。生产 bundle 不导入 runner。

**三个逻辑角色，恰好三个：**

1. Shell / Navigation：actual Header、两套 nav、BaseLayout/skip/main/Footer；nested group、长 label/足够长菜单、真实有效 link、非交互 unavailable text。
2. Content / Detail：actual WikiArticle/BaseLayout、Breadcrumb/RelatedPages；中性长文、长 URL、现有 `.table-scroll` 宽表；供 same-document 和新文档测试的实际目标。
3. Recovery：actual custom 404 body；未知 URL 静态 server 返回它且 HTTP 404，恢复链接指向前两角色。直接 404.html 与 unknown-path 行为不混为 200 fallback。

fixture 源码在 `tests/fixtures/core-browser/`，browser tests 在 `tests/core-browser/`，config 在 root `playwright.core.config.ts`，包装入口在 `scripts/run-core-browser.ts`。未来机器结果为非 public `test-results/core-browser/core-result.json`，同目录 readable summary；具体 engine revision 由未来锁定 runner 决定。这些路径是未来位置，不是本任务产物。

浏览器构建消费 K 的共享中性项目准备库，沿用现有临时 fixture projectRoot 模式：actual source/components/styles + 显式 fixture inputs，overlay 仅在临时 src/pages；生产 inventory/src/pages 不含 fixture。AX-03 不拥有该库，canonical final-build 准备不依赖本 runner 执行。temporary browser project 仅声明三个 emitted roles（root/detail/404），home featured/nav 与相关链接围绕同一 inventory；无 search/media/ads 附加 browser 角色。复用 canonical final validation/render/reconcile/Pagefind/normalize/audit；若 media-readiness 已要求 decision table，测试数据明确给出机械条件，不让 runner 自动批准。404 wrapper/body 必须取实际页面。测试 server 仅服务 audited temp dist，未知路径用现有 404 output，拒绝 traversal；不启动外部服务。

| Frozen run | Engines | CSS viewport / cases | Scope |
|---|---|---|---|
| Baseline | Chromium、Firefox、WebKit | 390×844；768×1024；1280×800 | 三角色，共 27 page/engine/viewport observations |
| Boundary/resize | Chromium | nav 899/900/901；layout 619/620/621；live resize 双向/重复 | shell/detail overflow，mobile/nested 持焦点转换 |
| Reduced motion | Chromium | 390×844、1280×800，reduce | shell/detail computed motion 与内容可访问 |
| No-JS | Chromium、Firefox、WebKit | 390×844 | shell native summary 可操作、全部 nested destinations 可达 |

边界宽度从 actual CSS 的两个规则提取或以断言核对；不扩成所有 viewport × JS × motion 的笛卡尔积。boundary height 沿用对应 mobile/desktop baseline height；baseline 27 不计辅助运行。tap 覆盖 mobile shell controls/目的地，至少 44×44 CSS px；三 engine 仍检查 geometry/native activation，触屏 pointer execution 在支持该 API 的 Chromium mobile context，不另加 device/OS 认证矩阵。

必需断言：document scrollWidth ≤ clientWidth + 1px（panel open/closed），wide table 仅容器滚动；skip Enter 真正 focus main；Tab/反向/visible focus，desktop children 无 hover-only 路径；触发保持 summary focus、close/resizes 无 hidden focus；reduce 不依赖 reveal 结束才可访问；滚动长菜单到末尾并激活；unknown URL 404 + recovery。no-JS 不要求 Escape 或全展开。

report 记录 capability、fixture role、candidate revision、engine/revision、viewport、motion/JS、assertion、status/reason。required observation keys 由固定矩阵构造，独立于实际报告；缺失/skip/零测试/server fail/browser 不存在/timeout/无法写 report 均 nonzero。重试不能掩盖失败：默认无重试；若以后诊断性重跑仍保留首失败且不得把 partial coverage 标 PASS。failure trace/screenshot 仅诊断，不收所有成功页面截图。

## H. PP-02 Implementation Plan

**A. catalog 位置：** 未来 `scripts/core-safety-sentinels.ts`，由 validate/audit/test 使用，禁止生产 component import。保留 versioned、固定 ID 和来源位置，不依赖读取已经被项目改掉的默认文件来动态生成 built-ins。删除/空 catalog 或未注册 checker 必须在 unit/integration 中失败。

**B. schema：** `gameConfigSchema` 可选 `residueSentinels`，数组条目仅 `id`、非空 `literal`、固定 `surface: branding | url | public-text`。ID 唯一且不得覆盖 Core ID；无 regex/glob/function/disable/allowlist。省略等于仅 built-ins，旧 config 可解析。

**C. 固定 source scopes：**

| Scope | 生产投影 | 不读为生产残留的内容 |
|---|---|---|
| branding | active brand name/shortName/social/default title/template；对应 known title/header/footer/site-name 属性 | article body 中普通引述品牌、game object Atlas |
| url | site URL、enabled inventory 的实际 public source URLs/link/contact 字段、resolved content links、emitted canonical/public URLs | 无关 hostname 更长字符串；private/draft-only URL |
| public-text | enabled content body/metadata/实际 legal payload、About/chrome copy、实际 shipping local text assets | repository docs、tests、catalog 自身、dependencies、未输出 draft notes/evidenceRef |

用 existing enabled catalog projection 选择 md/mdx bodies；`content-files.ts` 的 reference reader 在已经读取时保留 body，source matcher不另解析内容 AST。source 检测补充守门，rendered decoded text 是最终权威；noindex/404/About/不进 search 但实际 emitted surface 仍必查。事实/工具已有解析值只扫描实际 public projection 中能承载已知 signature 的 strings，不递归 linter 全仓库对象或所有源码。

**built-in 最小清单：**

- `gameatlas.example`：URL parser host equals 或 subdomain，case-normalized；正文 hostname token boundary，不误杀 `notgameatlas.example` 或 `gameatlas.example.other.invalid`。
- `Game Atlas`、`Atlas`、`@gameatlas`：各在 authoritative branding field 和明确 title/site-name/header/footer 投影匹配；`Atlas` 不全局禁止；`GA` mark 不作全局词禁令。
- `static-page-copy.ts` 的完整 reviewNotice、Privacy/Terms 的 supplied intro/paragraph 完整签名，包括完整 Replace/Add 指令句；不是禁止每个 Add/TODO 单词。已移出公开缺省的 draft 签名仍保留在 tooling catalog，防止再次复制输出。
- About 的完整 `Game Atlas is a reusable editorial system…` intro；logo 的已知 accessible-name `Game Atlas logo`；`getting-started.mdx` 的完整 brand-edit 指令段落，以及其明确 starter setup title/copy signature。这些都来自实际 supplied production example，不能凭空新增 fake contacts/counts。
- 历史 `public/media/README.md` 中完整的 “This is a syntax example, not a supplied asset or approved source. Replace the file, description, and source URL with reviewed project material.” 指令段落：固定签名继续保留在 tooling catalog，不随迁移删除。未来候选将 README 本体迁至 `docs/media/README.md`（实施时可微调至同样非 public 的窄位置），开发接入说明不得留在 `public/`。该 README 不再登记为 production-output artifact；若历史指令重新出现在真实生产 surface，仍按 public-text 拒绝。非公开 docs 仅可按需用于 tooling self-tests，不把普通 Markdown 或单词 Replace 全局视为残留。

每个 entry 固定归一化：已解码 HTML whitespace collapse、必要 trim；brand/hostname case 策略按该项声明；不模糊匹配、不随意删 punctuation。普通“Add item”、合法 quote、documentation 的规范示例及 inactive demo record 均有 negative test。没有 shipped fake contact/count 值则不编造这类规则。

**D/E. 枚举 coverage 与 existing extensions：**

| Required surface | Enumeration authority | Read/scan method | Missing / incomplete |
|---|---|---|---|
| public HTML，包括 404/noindex | enabled routes + routeToOutputFile；既有 exact reconciliation 拒绝额外 HTML | `html-audit.ts` 提取 decoded text（排除 script/style 实现正文）、相关 aria/alt/title names | missing HTML 或任何未检查 expected route error |
| title/meta/share/canonical/public URL | 每个 actual HTML head/tag | 复用 attrsFromTag 并补 decimal/hex numeric 和必要 named entity 解码；JSON 字符串另解析 | 不可解析 required surface error；不能仅 source compare |
| JSON-LD strings | 每个 application/ld+json script，包括 extension | JSON.parse 后有限 string projection，sentinel 与 TL-02 controlled guard 共用 parsed value | syntax/parse/guard/coverage failure error |
| robots / sitemap-index / sitemap-0 | `audit-build.ts` 现有 requiredFiles/expected URLs | UTF-8/XML text 及 public URL；现有 equality/set checks继续 | 缺失/读失败/未检查任何项 error |
| Pagefind input / payload | 实际 indexable HTML data-pagefind-body + adapter manifest/metadata declared refs | 输入字符串先查；固定 1.5.2 adapter 对实际可显示 fragment 的 title/content/URL/filter 等已知文字投影读取并检查 | 所有 declared text surfaces 已映射且读/检查成功；未知格式/版本/漏 fragment error |
| Core-owned public text/SVG | 明确清单 `public/logo.svg`、`public/favicon.svg` 及已注册 shipped textual asset；logo 可配置关联；已迁出的媒体 README 不在集合中 | 只读实际 shipping source 与对应 output，提取 SVG names/text/URLs、已登记纯文本 literal | copied 但 unregistered Core-owned textual asset 或缺 required output error；不得借 README 迁移削弱真实 SVG/text 检查 |

coverage map 是封闭、小型清单，记录 surface ID、route/path、required/applicable、checked 或 error。applicable=false 必须有确定理由（例如 logo 已显式不用且该 asset 不 shipping；indexable input 无项则按现有 Pagefind artifact 合约处理），不能通过从 required 集合删项获得 PASS。expected entries 从 catalog/required files/known asset map/Pagefind refs 派生，不按成功读取列表生成。相等性包括 identity/count；missing required reader/adapter、未知注册项、read error 都失败。

Pagefind 专用变更沿用现有 `gunzipSync`、version guard、metadata references。当前未给 fragment bytes 提供可扫描 content，不能宣称已有该能力；未来 implementation 先从隔离真实 1.5.2 build 验证 fragment 格式及字段，再限定该版本做最小提取并加 mutation test。binary index/WASM/runtime 非 public readable copy 不做字符串 grep；适用文字通过 adapter 的明确 index-source/fragment 对照覆盖，明确哪些字段在哪里体现。若任何 required search text 无法确定映射，必须 fail closed 并返回架构复审，不能填 checked=true 或引入 generic parser。未设计 provider-neutral IA-03。

不得递归扫描整个 dist；现有 HTML reconciliation 和 Pagefind 专属 discovery 可保留，它们不是新增通用扫描器。普通 `_astro` bundles、第三方 JS、source maps、binary 不进入新增 sentinel byte scan；Core 已知公开文本一旦位于 asset，必须显式注册，不能以不是 HTML 为由遗漏。asset registry 不提供 filesystem pattern DSL。

**F. final/evidence：** final 的 source/output known residue nonzero；evidence 仅普通 sample brand/domain（及它们的普通 branding 资产投影）可 warning，保留 NOT FINAL marker。starter instruction prose、legal drafts、unsupported identity、缺 coverage/read/adapter 均 error，不能被 evidence waiving。`build-site.ts` 将 purpose 显式传给 audit，独立 `audit-build.ts` 缺省 final；不得通过 dist marker 推断宽松 purpose。直接 audit 的 final-marker 拒绝保持。独立 evidence audit 入口只接受明确 purpose、不形成通用发布 bypass；public `npm run validate` 仍 final-only。

现有 `evidence-build.test.ts` 比较两个模式使用完全相同的 TECHNICAL_BUILD_STAGES；未来仍保留同一 stage 定义、顺序与首错停止，但允许最后 audit invocation 显式携带不同 purpose。测试应分别证明两种调用的 stage identity/order 相同、audit purpose 正确传递，不要求 purpose 参数也完全相等。不以进程全局可变 flag 代替明确参数。

**G/H/I. tests：** 每个 built-in/source scope 阳性+近邻阴性；draft/disabled/doc/test exclusion；媒体 README 迁移后不出现在 public/dist，历史签名注入真实生产 surface 仍拒绝；encoded HTML（numeric entities、NBSP、split tags）/JSON-LD/404/meta/robots/sitemap/logo/search fragment seeded residue；manifest 或一个 required fragment/asset 不读、缺 reader、coverage row 删除/伪重复 error。source pass + stale output residue 必拒绝。evidence ordinary samples warning 与 instruction/legal/identity error 分别证明；不存在全站 exception。

## I. TL-01 Implementation Plan

**activation 输入：** 对 existing privacy/terms inventory record 添加可选 `legalActivation`，strict discriminated union：unavailable，或 active + 64 字符 lower-case hex `approvedContentSha256`。省略＝unavailable。非 legal page 不允许该字段；未知 state/多余字段 error。缺省 inventory 改成 private 或 draft、noindex；明确不变 pageId/route。公开 published 或 index 的 unavailable record 是矛盾输入，必须 error，不是悄悄帮它修 flag。

**content 输入：** 未来 `src/data/legal-content.ts` 仅是 project-owned optional static payload，按 privacy/terms 内容身份选择，空缺省；不含 URL/route/eligibility。`static-page-copy.ts` 保留 About，把 draft legal fallback 移除；保留 sentinel tooling 签名。active legal 必须解析到非空 intro/sections 与符合 schema 的 strings；不能从 About/default/source docs 兜底。literal payload 限纯文本，当前渲染器本身采用 escaped Astro text，不引入 Markdown/CMS/HTML 插入器。

**digest 定义（候选必须固定并测试）：** SHA-256 over UTF-8 的固定键序 JSON policy payload，按此顺序：inventory 实际 policy title、intro、sections 数组（每项 heading 后 paragraphs 数组）、可选 policy-facing notice。不存在 notice 使用固定 null 表示；数组顺序保留。strings 仅将 CRLF/CR 规范为 LF，保留标点、空格、大小写与 Unicode 字符；不 locale transform、不折叠段落 whitespace、不依赖任意 object insertion order。reject 非 string/undefined section/empty required content。renderer 与 validator 使用同一个 resolved payload，再计算 digest；input file 不作为 digest 本身。

包含：用户能读到的 policy 标题/正文/heading/paragraph/notice/claims；如果后来要展示真实 policy review 日期，只能作为明确 policy payload 字段并纳入 digest，否则本期不显示 Last reviewed。排除：unavailable/approval state、approved hash 自身、reviewer/evidence metadata、route/canonical/JSON-LD、meta description、unrelated brand/footer/nav、inventory technical updatedAt/publishedAt、build timestamp。页面 meta description 另受 residue/metadata 审计；不能把它解释成 policy approval。任何 policy-facing wording 变更导致 digest stale；技术时间改变不 stale。`Last reviewed / updatedAt` 删除于 legal 展示，不能用技术时间换合法审查声明。

**validation / routing：**

1. `legal-safety.ts` 同时给出解析 payload、eligibility 和明确 errors，供 validator 与 catalog 共用；无全局 workflow state。invalid active 必抛/汇总错误，不靠 catalog filter 将非法输入隐藏。
2. active 必需 public/published、contentStatus/developmentStatus ready、needsReview=false、有效内容/current digest；pending review/draft/private/missing/empty/stale/不可读均 final 和 evidence error。needsUpdate/stale 不能被 approval 擦除；本期不设计 FR-01 新生命周期。
3. `catalog.ts` 在现有 gate 后采用该已验证结果；runtime `site-data` 和 `validate-site` 使用同一内容输入，不能一个只查 flag、另一个才查 digest。省略上下文不得把 active 当真或无条件启用。
4. 固定 `privacy.astro` / `terms.astro` 迁移为各自 `[...path].astro` optional static handler；getStaticPaths 仅从同一 enabled catalog 取匹配 legal entry，并验证已有 route 对应该 handler（`/privacy/`、`/terms/`）。没有 entry 返回 []；不保留旧固定文件、不建一个包揽所有 core routes 的 catch-all。
5. `validate-site` 的 fixedRoutes 只保留 `/`、`/about/`、`/404.html`；legal page type capability 仍支持，唯一对应 record 的矛盾/重复/unsupported route 按 validator 失败，不能第二份法务 route registry。
6. Footer 已过滤 enabled，related 已按 enabled ID，sitemap/SEO/search 已按同一 catalog/indexability；因此通常无需改这些组件。显式 navigation/homepage 引用 unavailable 页面仍失败，保留 IA-02，不能暗中过滤错误配置。
7. active 缺省 noindex，项目可用现有 inventory 明确选择 index；active noindex emitted canonical/robots/normal graph、无 Pagefind body/sitemap；unavailable 无任何 HTML/canonical/JSON-LD/search/sitemap/footer/related link。unknown legal URL 落已有 404 recovery，noindex 并非 unavailable 替代品。

**tests：** default 双 legal 零路径、仅 privacy active、两者 active、active index/noindex；缺 approval/content/flags/needsReview、改正文/标题/notice/section 顺序 stale、仅 updatedAt 变化 hash 不变；无 notice/empty notice 区别固定；digest 稳定 Unicode/LF/不同 object 构造顺序；同一批准文本渲染 exact copy；直接路由 leakage/stale dist extra HTML、Footer/related/nav/sitemap/search exclusion、draft known signature 即使 hash 匹配仍被 residue 拒绝。approval 值必须由项目给出，不在 build 自动重写成当前 digest。

不引入 reviewer 用户、approval history、lawyer/CMS/database、jurisdiction/行为政策映射；legal truth/TL-03 由外部 Acceptance。

## J. TL-02 Implementation Plan

**最小 proposed input：** 在 `gameConfigSchema` 添加独立可选 `identity` 块（名称为候选建议，并非现有 API）。包含可选 organization、可选 sitePublisher、可选 articles（以既有 pageId 为 key，各有独立可选 author/publisher）。不增加全站 identity directory、外部 ID/任意 URL lookup。organization 必是 Organization；roles 可引用 Organization 或 Person。各 slot 内明确给 confirmed identity：kind、nonempty name、literal projectConfirmed=true、nonempty identity evidenceRef；role 又有自己的 nonempty evidenceRef。一个 role slot 的存在才选择角色，sitePublisher 不自动继承给 Article。

角色可以显式重复同一 identity record，不要为节省几行加入通用 registry。内部 canonical identity fingerprint 用受控 kind/name/identity evidenceRef 识别明确复用，node ID 从 site canonical + deterministic opaque suffix 产生；opaque ID 不暴露 evidenceRef。重复声明同一 entity 必 node 内容一致；不同实体不能争用同 ID，冲突 error。角色证据不决定 entity node 字段。旧 `#organization` 默认删除，不强保留假身份 URL。

schema strict 校验 unknown kind/false confirmation/空 evidenceRef/partial claim；缺整个 identity 块有效。site-validation 确认 article keys 对应实际 inventory 的 Article consumer 类型（当前 guide/meta/patch），不能用 arbitrary route key；enabled 角色机械矛盾失败，inactive 未 emitted 内容不被视为 public claim，但配置 shape 仍必须有效。没有 network verification。game.config 的原品牌输入无需改写成 organization；缺新输入使用安全默认，不填写伪确认样例。

**helper / renderer 变化：**

- `buildBaseSeoGraph` 无输入时返回 WebSite/WebPage；品牌继续 WebSite.name、About/metadata/chrome，不生成 Person/Organization/publisher/author/affiliation。
- organization 单独明确声明可生成 node，但不选择 publisher/author。sitePublisher 单独选择并使其 identity node 出现在当前 graph；article roles 的 identities 也加入同一个 page graph，复用节点只出现一次。
- `buildArticleSchema` 保留 headline/description/language/dates/mainEntityOfPage，仅依据该 pageId 的独立 role slots 增 author/publisher。无 role 时省略属性，不填 null、不取默认匿名团队、不 fallback sitePublisher。
- 尽量保持 `(config,page)` 调用形状；解析 mapping helper 留在 seo.ts。WikiArticle 与 EditorialArticle 的 configured author 从相同 mapping 显示真实可选 author attribution，并生成一致结构 author；不是从 visible prose 推测 identity。无 author slot 则无署名，不能启用缺少可见归属或与归属冲突的 hidden structured author。
- 本期保留显式 Article author 功能及正向 fixture，因此这两个组件在 E 仍为 LIKELY REQUIRED，理由仅是 author attribution seam。publisher-only 不要求 article-shell 修改，不新增通用 `Published by X` UI。publisher 是独立明确角色；其真实公开语境可由 assembled-site operator/About/footer/disclosure 提供，由 Acceptance 核验该语境与事实。Core 检查 structured publisher 对应明确已确认 role，不从 Schema.org 反推文章展示义务。
- `BaseLayout` 拼合最终 graph 后应用 narrow controlled guard，再用现有 serializeJsonLd。无条件 brand Organization 的旧测试必须有意变更，安全默认破坏旧断言是预期 delta。

**extension-seam guard：** 输入/输出都检查 `@type Organization`、`@type Person`（包括类型数组里命中它们）、任意嵌套 author/publisher、及显式 controlled identity `@id` 引用。要能识别 @graph/inline nested identity node 与字符串 role claim，不限顶层。合法输出必须对应本 page 的明确 identity/role mapping；阻止额外 node、不同 name/type/ID、额外 author/publisher、site claim 被扩展绕到 Article、duplicate conflicting IDs、dangling controlled reference。选用这些 helpers 的受控 emitted node fields，非自动生成地址/contact/logo/social，opaque extension 不能夹带这些额外 controlled claims。

JSON tree traversal 仅为有限 construct 检测和 local reference integrity，不解释整个 Schema.org ontology。普通非 identity extensions 保留。sponsor/founder/employee/member/affiliation/parentOrganization/subOrganization 等不设计通用语义规则；若其中显式复用已受控 identity node，只检查该引用是否存在/一致，不将其真实性升级为 Core 已核验。不能声称覆盖所有身份断言。

`html-audit.ts` 对所有输出 JSON-LD script 再检查同一 mapping，防止 bypass BaseLayout 的额外 script；final/evidence 均拒绝 invalid controlled claims。证据 metadata 不进入 public JSON-LD 或 visible byline。身份缺省的 Article 仍有效本期机器含义；consumer rich-result 可能减少，不能为此恢复虚构 author/publisher，也不做搜索引擎专项优化。

**unit/output tests：** 无 identity 默认四 nodes（WebSite/WebPage/BreadcrumbList/Article）、无 author/publisher/Organization/Person；organization only、site publisher only、author-only、Article publisher-only、distinct author/publisher、显式重复复用、author 不继承 publisher、Article 不继承 site publisher；坏 confirmation/evidence/type/pageId/IDs、extension inline/type-array/string role/多 script 绕过、dangling reference 拒绝；普通非 identity extension PASS；`</script>` serializer attack 保留。两个 consumer 的 author 正向 fixture 必须证明 structured author 与 visible attribution 为同一 resolved identity，缺失/矛盾 attribution 拒绝。publisher-only 证明 structured publisher 匹配明确 confirmed role，不要求新增文章 publisher UI；最终项目公开披露语境/真实性由 Acceptance 核验。无身份时原 UI/brand/canonical/metadata 保留，不增加 author card、editor profile、publisher badge、company box 或 article footer framework。

## K. Shared Phase-1 Plumbing

只共享有至少两个本期能力使用相同语义的 plumbing：

| Shared item | 实际共用能力 | 最小方案 |
|---|---|---|
| 已有 error-list / purpose orchestration | PP-02、TL-01、TL-02 | 继续 string[] errors、必要 warnings/info 和 existing final/evidence；不造规则引擎或新的 ValidationResult framework |
| parsed JSON-LD / HTML surface 提取 | PP-02、TL-02（以及 TL-01 policy 输出） | 在 html-audit 已有 helper 里提取一次；不同 checker 判断各自语义 |
| shared neutral test-project preparation / temporary build lifecycle | PP-02、TL-01、TL-02；AX-03 可复用 | Phase-1 test/build plumbing 拥有 `tests/helpers/core-build-fixture.ts`；显式目录清单、中性 inputs、projectRoot、执行/清理，可独立供 Node/tsx/Vitest/build tooling 使用；不导入 Playwright、不要求 browser 安装或 AX-03 执行 |
| actual Core browser fixture/evidence | AX-01、AX-03 | 同一个三角色 runner；不为 AX-01 再建 E2E harness |

legal digest 只有 TL-01 有 content approval 语义，留 legal-safety，不抽 generic approval/hash service；identity 内部 fingerprint 与 policy approval 不是同一种授权。sentinel surface registration 由 PP-02 管理；TL-02 借用已解析 JSON，并不需要通用 audit plugin registry。不存在 shared adoption lifecycle、global approved-for-final、shared legal+identity approval 状态。

依赖方向固定为共享中性准备库分别供 canonical final-build evidence 和 browser Core runner 使用，不能反过来让 browser runner 准备 canonical evidence。CI 如需 CLI，最多新增一个很小的 `scripts/prepare-core-build-fixture.ts` wrapper，或窄 existing-script integration；名称/调用细节留实施阶段。两种输入（完整 adopted build permutation、三角色 browser projection）共用准备语义；不引入 fixture framework、project plugin API 或通用 workspace generator。

## L. Dependency Impact

### DEPENDENCY IMPACT

| Package | Purpose | Runtime / Dev-only | Why existing stack insufficient | Capability | Production bundle | Mandatory / optional |
|---|---|---|---|---|---|---|
| `@playwright/test`（未来新增；不指定版本） | 三 engine 执行、keyboard/focus/resize/context、报告/失败诊断 | dev-only | Vitest node runner 与 optional peer declarations 不提供真实三 engine 浏览器 | AX-01 evidence、AX-03 | 不进入生产 bundle | 完成本计划 browser evidence 必需 |

新增 runtime dependencies：**0**。不另加 Playwright core、Vitest browser provider、DOM emulator、HTML/Schema.org engine、通用 crypto/parser package。Node `crypto` 与 `zlib`、现有 Zod/tsx/Vitest 已够安全输入与定向 artifact 处理。工具版本锁定、OS compatibility/browser setup 在未来候选的 dependency-change slice 校验；本任务不联网找版本、不安装、不更新 lock。

## M. CI Impact

在现有 build job 保留 checkout → pinned Node → npm ci → npm run check → 浏览器无关的中性 adopted final-build fixture 准备 → 在明确 projectRoot 运行 canonical final validation/build → browser setup → AX-03 browser evidence 的生命周期。canonical 命令仍为 `npm run validate` / `npm run build`；准备入口命令名留实施阶段。之后 provisioning Chromium/Firefox/WebKit 及 Linux 所需 system libraries，使用未来已锁 runner 的安装命令。建议候选执行 `npm exec -- playwright install --with-deps chromium firefox webkit`，再 `npm run test:core-browser`；本任务不执行。

**现有 build 步骤的输入问题必须显式解决：** 原 `npm run build` 以 sample brand/domain/instruction copy 成功，在新 PP-02 下应拒绝。保留 shipped sample 为未采用状态，不制造假项目事实；未来 CI 的 production-build 验证应在共享 helper 独立准备的中性隔离 projectRoot 中调用**同一个 `npm run build`**，原 Build and audit step 的 canonical command cwd 使用该明确目录。准备不调用 `scripts/run-core-browser.ts`，不依赖 Playwright、browser installation 或 AX-03 execution；check 仍在候选根运行。不得将原 final build 改成 build:evidence、删 build 步骤、加 blanket sentinel ignore 或通过真实-looking 默认值蒙混 adopted 状态。

该准备步骤使用既有 temp project 方式，保留 actual production route handlers/完整审计链；browser 三角色可复用准备机制但自己的 fixture route overlay 不能成为全 Starter build 的证明。最小两种 test input：现有 full build fixture 的中性 adopted permutation（原 media/evidence integration 已覆盖），与三个 browser roles 的小 projection；不是创建两套 runner、不是两个 Reference projects。shared helper 返回明确 projectRoot，CI 不引用任意猜测目录。canonical-build evidence 可在没有 Playwright/browser 的环境概念上独立运行；browser setup 失败不能成为其准备/执行的前置障碍。两类失败仍可阻断同一 CI job。

缺 runner、任何 engine、fixture build/server/矩阵 row 或 summary/result 均失败。CI 保存 `core-result.json` + readable summary（必需，因为冻结契约 G 要求），可在失败时保存 trace/screenshot。artifact upload 失败或结果文件缺失不能记录 CORE EVIDENCE COMPLETE；runner 提前检查 report 写入并 nonzero。不在 product dist 加 evidence JSON。沿用单 job；先测原 15 分钟预算，确实超时再有限调整，不预设计 sharding/cache farm/release job。browser failure 与原 check/build failure 一样阻断 CI，不等于 assembled launch verdict。

## N. Candidate Derivation Plan

**推荐拓扑：** 未来独立 local Git clone，独立 object storage 与 working tree；使用 `--no-hardlinks --no-checkout` 从冻结本地 repo 获取 Git history，再显式 checkout 冻结 commit。不要在 frozen repo 创建 worktree，因为其 Git common-dir/ref 元数据会被写；不要用文件复制建立 candidate；不要直接复用冻结 checkout。候选位置、名称由后续授权给出，本文不创建也不命名 release/branch。

未来授权后操作顺序（这里只规划，不运行）：

1. 再验工作区、三 checksum、frozen top-level/HEAD/tag/clean，并确认用户给定 candidate destination 不存在。
2. 本地 clone frozen repository，禁 hardlink/shared-object dependence；不联网获取其它源，不 checkout 最新分支。
3. 候选 detached checkout exact `29b25559cf2af859bca359c7f7fda686a4803c95`；之后只有用户明确批准实现 branch 才创建该 branch。不在计划里捏造 branch 名。
4. 比较候选 HEAD/tag peeled target/tree object 与冻结值，`git diff <frozen-commit>` 为空，`git status --porcelain=v1` 空；initial tracked tree zero-diff。不安装、生成类型、替换 fixture 或编辑之后再宣称 initial zero-diff。
5. **实施前**捕获并核对 Candidate Creation verification output / review evidence，作为当前阶段主要且权威的来源证据：source repository absolute path、frozen source commit/tree object/tag、Product Contract/Capability Baseline/Core Safety Contract 三 checksums、candidate HEAD/tree object、against frozen source 的 git diff（空）、candidate clean status、clone/origin provenance、initial zero-diff statement、verification time。先保存此验证报告，再安装/实现；报告不包含凭据。
6. 后续 source diff/测试/browser reports 一律绑定候选实际 revision；若有 uncommitted candidate diff，报告须同时绑定 diff hash，不能仅拿 frozen HEAD 给修改后的测试作背书。最后再次检查 frozen 不变。

保留 clone origin 仅作为本地来源记录，不自动 push/fetch/tag；本计划没有任何执行 clone/branch/worktree 的授权。

`.git/core-safety-provenance.json` 若后续使用，只能是 OPTIONAL、NON-AUTHORITATIVE CONVENIENCE METADATA，不是 candidate correctness 条件，也不是 release manifest、Capability Delta、version registry、release-governance record 或 portable long-term provenance source。本任务不创建它。若以后需要持久 repository-tracked/release-level provenance artifact，应单独设计未来 Release Governance / RI architecture，不纳入 Phase 1。

## O. Implementation Sequence

**四个 atomic slices。** 各 slice 先建立能失败的具体测试，再最小实现、最快相关检查；下面是行为步骤，不含测试/生产代码。实现必须在独立 candidate 且取得授权后开始。

| Slice | Capabilities / Files | Behavior added | Tests added/changed | Exit criteria | Dependency |
|---|---|---|---|---|---|
| S1 Legal projection | TL-01；inventory schema/data、legal-content/legal-safety、catalog/site-data/site-validation、static-copy/LegalPage、两 legal route moves、validate-site | absent default、内容 digest、invalid active error、单一 eligible catalog、零 static paths | legal unit、catalog/site-data/site-validation/static-copy、legal output/reconciliation cases | 缺省 legal 不出 route/link/index；approved exact text 可出；stale/矛盾 final/evidence 都失败；About/home/404 不退化 | 实施前 Candidate Creation 验证报告已捕获 |
| S2 Structured identity | TL-02；config schema、seo/BaseLayout、两 Article author seams、html-audit | non-assertive graph、独立 controlled identity/roles、author visible mapping、extension/output guard；publisher 不强制文章 UI | config/seo/html-audit、default/valid/invalid build permutation | 默认无身份但 Article/Breadcrumb/canonical 完整；author 署名与 graph 同一 identity；publisher role 明确；绕过/冲突均失败 | S1 的安全 catalog/output fixture；不得把 approval 共用 |
| S3 Residue source/output | PP-02；tooling catalog、config、content reader、validate/build/audit、HTML/Pagefind adapter/discovery、shared fixture helper/可选窄 CLI、媒体 README 迁移及直接引用 | production source projection、全部枚举 surface coverage、final/evidence purpose 传递、拒绝 residue；共享准备独立于 browser | sentinel unit/output、Pagefind text/missing coverage、media/evidence build 中性数据与 negatives、迁移路径/输出排除 | 任一 known covered residue final fail；evidence 仅普通 brand/domain warnings；README 非公开但历史签名仍拦截；中性 canonical build 可不借助 AX-03 跑；所有原 technical failures 保持 | S1 排除 draft/legal；S2 无 unsafe default graph |
| S4 Navigation + browser evidence | AX-01、AX-03；Header/MobileNav、必要证据触发 CSS/Desktop fix、package/lock/config/runner/三角色 fixtures/tests/CI/gitignore | native local behavior、真实三 engine 最小矩阵、complete report、CI 分别消费共享准备与 browser runner | nav static + core.spec + coverage unit；执行全候选 regression/check/build safety negatives | 所有必需 observations PASS、缺项/skip失败、生产 output 无 fixtures、existing regression 全通过；CI canonical build 先于 browser setup | S1–S3 保证 fixture build 使用同样安全链；不接管 S3 共享准备 |

S3 最高风险：涉及 search artifact text 与 coverage 完整性、purpose 传递以及大量旧构建样例由可通过改为应拒绝。S4 是最长执行/CI 证据切片，但不应为了缩短 CI 删除失败项。S1/S2 可分别审查行为；不要为每个文件创建 ticket 或基础平台 slice。最后的全 Phase-1 验证是 S4 出口，不新增代码 slice。

## P. Test / Evidence Plan

### Future commands — 此次不运行

全部在未来 candidate/其明确 test projectRoot；先确认 `node --version` 为 `.nvmrc` 约束的 22.22.0。当前 `.nvmrc` 与 `>=22.19.0 <23` 不改。

| Slice / purpose | Future exact command | Expected evidence |
|---|---|---|
| S1 最快 unit | `npm exec -- vitest run tests/legal-safety.test.ts tests/catalog.test.ts tests/site-data.test.ts tests/site-validation.test.ts tests/static-page-copy.test.ts tests/output-reconciliation.test.ts` | 全部 PASS；legal negatives 明确 error |
| S2 最快 unit | `npm exec -- vitest run tests/config.test.ts tests/seo.test.ts tests/html-audit.test.ts` | 默认 graph 与 opt-in/guard cases PASS |
| S3 source/adapter unit | `npm exec -- vitest run tests/core-safety-sentinels.test.ts tests/pagefind-artifacts.test.ts tests/html-audit.test.ts` | catalog/coverage/false-positive/adapter failures 可证伪 |
| safety integration | `npm exec -- vitest run tests/core-safety-build.test.ts tests/media-build.test.ts tests/evidence-build.test.ts` | 真实隔离 final/evidence stages、encoded output/legal/identity negatives |
| S4 matrix inventory | `npm exec -- vitest run tests/core-browser/coverage.test.ts tests/navigation.test.ts` | 空/缺/skip report 失败，native semantics/static hooks 保留 |
| browser（future script） | `npm run test:core-browser` | 三角色最小矩阵完整 PASS + JSON/readable summary |
| full existing guard | `npm run check` | Astro typecheck + 全 Vitest PASS，不删旧保护 |
| unadopted shipped sample | `npm run validate`；`npm run build`（在 candidate 根，保留 sample 时） | 有意 nonzero，包含 actionable known sentinel diagnostics；不是 CI success 输入 |
| adopted fixture canonical output | `npm run validate`；`npm run build`（在共享 helper 独立返回的中性 projectRoot；准备入口留实施阶段） | PASS，exact routes/media/Pagefind/budgets/无 marker；不安装/执行 Playwright 或 browser 即可准备并运行；CI final build 使用此输入 |
| allowed evidence permutation | `npm run build:evidence`（仅对应 fixtureRoot） | 普通 sample warnings + NOT FINAL marker，technical/legal/identity negatives仍 nonzero |

不在冻结 checkout 执行这些命令；不在本任务创建上述未来文件、browser config、tests 或结果。

### Future implementation acceptance checklist

**STATIC / UNIT**

- [ ] strict legal union/digest 和 flags 矛盾拒绝；无 approval 自动更新。
- [ ] 每个 Core sentinel 的阳性+近邻阴性与无删除/禁用配置。
- [ ] 默认无 Organization/Person/roles，独立 entity/roles 与 extension guard negatives。
- [ ] 两 Article author seams 与 structured author 使用同一 resolved identity，缺失/冲突可见署名拒绝；publisher-only 不触发文章 publisher UI。
- [ ] actual browser required matrix 独立枚举，missing/skip/empty/startup/report failure 均 nonzero。
- [ ] existing meaningful tests 保留；新 `.spec.ts` 不进入 Vitest include。

**GENERATED OUTPUT**

- [ ] 共享 helper 在无 Playwright/browser/AX-03 执行条件下准备中性 projectRoot，canonical final validation/build PASS；unadopted supplied sample 拒绝；source pass 不能豁免 output。
- [ ] coverage 清单的 HTML/attrs/meta/URL/JSON-LD/robots/sitemap/Pagefind/public text 每项已检查或明确合法 not-applicable；missing/unreadable/unknown adapter error。
- [ ] unavailable legal 零路径、零 links/index/graph；active index/noindex coherent，digest 对 actual payload。
- [ ] output multiple JSON-LD scripts/inline/type-array/string role bypass、controlled dangling/conflict 拒绝；普通 extension 与 serializer 保留。
- [ ] production dist 不含 browser fixtures、reports、provenance、sentinel catalog 或测试 signature definitions。
- [ ] 媒体开发 README 迁出 public，非生产 required surface，现行链接/读取路径有效；历史 README signature 注入真实 production surface 仍失败，真实 public SVG/text coverage 保留。
- [ ] final/evidence stage/marker/technical failure 原语义保持；legal/identity/draft instruction 不随 evidence放行。

**BROWSER CORE**

- [ ] 27 baseline observations 及 frozen boundary/reduce/no-JS 补充项完整；三个 engines 真实启动。
- [ ] native open/Tab/Shift+Tab/Escape/focus/nested/link/anchor/resize 原子且幂等；no-JS native operable。
- [ ] document overflow ≤1px、table 局部滚动、44px tap、long menu last link、visible focus/skip-main/reduce；unknown route HTTP404与有效 recovery。
- [ ] JSON/readable report 对应 candidate revision，失败诊断不掩盖初始失败。

**REGRESSION**

- [ ] IA-02、ID-01、SEO-01、SEO-03、PP-01、MR-01 的 existing unit/output assertions通过。
- [ ] 原 media/schema/file/render/decision table negatives、Pagefind安全/exactness/800KB、route exact reconciliation、metadata/link/ad/asset budgets保持。
- [ ] 两 Article consumers/ About/home/404/disabled modules 正常；未新增 telemetry/network/script/provider。

**IMMUTABILITY / PROVENANCE**

- [ ] 实施前 Candidate Creation verification output / review evidence 包含 N 的全部来源字段及 candidate HEAD/tree/diff/clean/initial zero-diff/time，作为主要权威证据可复核；`.git` convenience metadata 可缺省且不权威，不新增 release-governance artifact。
- [ ] candidate diff 只覆盖计划或有具体 evidence 的局部变更；无 release version/governance/Phase-2 scope。
- [ ] frozen 三文档 hashes、Starter HEAD/tag/clean 最后仍匹配；frozen 未被 mutable candidate 使用。

此 checklist 不包含完整 assembled-site human Acceptance，不运行/创建 Acceptance Gate。

## Q. Regression Protection

| Phase-1 change | At-risk capabilities / concrete regression | Existing protection to keep / added check |
|---|---|---|
| Header/local nav | IA-02；responsive hidden focus、Overview link 丢失、双事件 toggle；PP-01 recovery | navigation + media-build nav sequence、site-data resolver；真实 no-JS/keyboard/resizes |
| legal catalog/route moves | IA-02、ID-01、SEO-01/03、PP-01；fixed output、related/footer/ search/sitemap 泄漏 | catalog/site-data/site-validation/optional-routes/output-reconciliation/seo；active/noindex/unavailable/stale dist fixture |
| legal renderer/digest | SEO-01、PP-01；title mismatch、技术日期成为 review claim、About 被误禁 | static-page-copy/html-audit/seo；实际 payload hash/渲染一致、About regression |
| identity defaults/roles | SEO-03、SEO-01、TL-02；dangling refs、Article 被删、author 与 visible attribution 不符、publisher 迫使 UI、普通 schema extension误杀 | seo/html-audit/wiki-article/player-facing-metadata；两个 author seams、publisher-only 无新增 byline、serializer、default/独立 role/output negatives |
| residue projection/coverage | PP-01、IA-02、SEO-01/03；draft/doc误报、noindex漏扫、robots/search artifact漏读 | content-files/catalog/page-resolution/html-audit/output-reconciliation；每 surface positive/negative/missing |
| Pagefind adapter expansion | IA-03 现有实现 preserve；错删 optional UI、unknown/version 放行、budget漂移 | pagefind-artifacts/search-state/optional-routes；800KB、manifest exactness/ref safety不削弱，新 text mutations |
| purpose/build propagation | PP-01、媒体 readiness；evidence 自动变 final、技术失败变 warning | evidence-build/media-readiness/media-build；marker stale/write failure、首错停止、final-only validate继续 |
| shared neutral helper / browser fixture | PP-02、TL-01/02、AX-01/03、PP-01；canonical 准备耦合 browser、fixture进入生产、tmp code 与 actual Core漂移 | 无 browser 条件下的 canonical build + exact reconciliation + production output absence + imported actual source校验；不测试复制实现 |
| 媒体 README 窄迁移 | PP-02；开发说明继续公开、现行链接及测试路径断裂、历史 signature 丢失 | docs 新位置/旧 public 输出不存在、现行链接及 runtime-contract/release-identity 读取路径；历史 signature 阳性、非公开 docs 阴性，SVG/text 检查保留 |
| shared html-audit updates | MR-01；disabled ads 输出/secret attribute/duplicate bootstrap 被弱化；媒体 asset缺失漏报 | 原 ads/html-audit/media-audit/media-rendering/media-build 全保留，新增检查不能早退跳过旧 audit |

MR-01 默认 disabled、零 wrapper/reservation、provider isolation 不新增配置。media validation/readiness 仅 preserve 当前valuable machinery，不在本期扩 dimension/rights/video contract，也不决定未来永久归属。ID-01 保留 authored relations 的 enabled filtering，不改成 recency/ranking。SEO canonical、unique metadata、robots/sitemap exactness、Article/Breadcrumb meaning 不由 identity 变更削弱。

## R. Completion Criteria

| State | Required evidence | 本期意义 |
|---|---|---|
| IMPLEMENTATION COMPLETE | 实施前 Candidate Creation 验证报告明确；五个 contract 的源码/config/route/audit 行为完成；浏览器无关的中性 canonical build、README 非公开、author attribution/publisher 边界、静态/unit/generated-output及existing regression通过；无 no-go | 可以提交本期候选实现供审查；缺完整 browser evidence不能声称支持已证明 |
| CORE EVIDENCE COMPLETE | 上述 + frozen 三角色 browser matrix全部执行与报告完整；negative gates 已演示；revision/diff 绑定；CI重复可运行 | 可作为未来独立能力评估的候选 Core evidence，仍非发布/assembled PASS |
| ASSEMBLED ACCEPTANCE COMPLETE | 独立 owner 对实际 Pattern/theme/content/identity/policy/media/providers/routes 做完整验收与人审 | 本期不实现、不给此状态；fixture证据不能替代它 |

Implementation complete 与 Core evidence complete 应分别报告；若 browser 尚未运行，不得以源码完工输出 candidate-supported。未来能力考量至少需要：

| Frozen transition under consideration | Minimum later evidence before candidate-supported can be considered |
|---|---|
| AX-01 GAP → candidate-supported | 真实 native semantic/open/close/focus/nested/resize/link/no-JS evidence，supported matrix 内无 hidden focus，static/output初始 state coherent |
| AX-03 GAP → candidate-supported | actual Core 三角色、27 baseline + frozen supplements、zero missing/skip、CI engines/results、生产排除 fixtures |
| PP-02 GAP → candidate-supported | source + 每个 enumerated output surface 阳性/阴性/缺 coverage fail、final/evidence分级、catalog不可禁用、Pagefind实际 payload evidence |
| TL-01 GAP → candidate-supported | default route/link/index/schema零输出、approved exact payload、stale/flags/draft拒绝、same catalog全部 consumer integration |
| TL-02 PARTIAL → candidate-supported（仅 Core seam） | no implicit identity、独立 opt-ins、author structured/visible 同一 identity、publisher explicit role 且不强制文章 UI、extension/output bypass拒绝、local controlled ref integrity、SEO/serializer回归通过 |

任何状态变化须另行 evidence review，以新候选评估记录表达；不编辑冻结 Capability Baseline，不自动从设计批准/测试全绿推到 PROVEN。identity evidenceRef 仅 shape，不证明事实；legal digest 仅绑定，不证明政策充分；未知 residue、真实 composition、affiliation/TL-03 人工判断仍外部。

## S. Change Budget

估算以 E 为边界，不能用伪精确 LOC 推断完成。两 legal route handler 迁移按 existing source change 计，其新路径不重复算全新能力源文件；媒体 README 的新 docs 路径同样计为 existing documentation relocation，不重复算 new helper/config。两 Article consumers 仅因本期显式 author attribution 功能保留为必需项。

| Category | Likely range | Interpretation |
|---|---|---|
| Existing source/data/scripts modified | 23–26 | E 的 23 必需 existing production/build 文件（含两个 author seams）+ 最多 DesktopNav/global.css/404 main 三个独有证据修正；不重复计 Article main，不包括 tests/tool manifests/docs |
| Existing tests modified | 14–16 | E 的 12 原必需 tests + 两个 README 读取路径 tests + 最多 theme/wiki-article assertions |
| Existing tooling/config files modified | 4 | package.json、lock、CI、gitignore；不改 Astro/Vitest/Node主配置 |
| Existing developer documentation affected | 3 | 媒体 README 窄迁移、README.md 与 CONTENT_AND_DATA_GUIDE.md 现行链接；历史报告不改 |
| New production/build source areas | 3 | sentinel tooling helper、legal safety helper、project legal content；nav/SEO在原文件内 |
| New test files | 5 | sentinel/legal/build safety、browser core.spec、browser coverage unit |
| New fixture files | 4 | 三角色入口 + shared neutral data；permutation 尽量测试中 inline数据，不造 fixture海洋 |
| New config/helper/script files beyond上述3 | 3–4 | Playwright config、共享浏览器无关 test/build helper、browser wrapper；仅必要时再加一个很小的 browser-independent CLI wrapper；不算迁移目标 |
| Total likely existing files affected | 44–49 | source 23–26 + tests 14–16 + tooling 4 + docs 3；同一文件跨能力只计一次，迁移只计一次 |
| Dev dependencies | 1 | @playwright/test，浏览器执行必需 |
| Runtime dependencies | 0 | 内置 crypto/zlib + 当前栈 |

这些文件跨层是五个 safety contracts 的必要接点，不授权 broad repository restructuring。E 中另三个 shipped demo adoption files 只有额外明确授权才改，不纳入当前 likely budget；若授权成立，应另披露增量，不把 synthetic 默认值作为事实。若产生新的 routing/catalog/SEO infrastructure、多个工具框架或成批模式搬迁，应视作规划失控，触发 U。

## T. Risk Register

| Risk | Likelihood | Impact | Mitigation | Evidence required |
|---|---|---|---|---|
| native disclosure 三 engine toggle/Space/summary焦点差异 | M | H | native open 权威，不双处理；只在有兼容性证据时调整 | 三 engine actual focus/state/activation/no-JS |
| responsive CSS先隐藏了持焦点 copy | H | H | DOM归属识别、pageId映射/brand fallback、幂等close，无异步restore | 899/900/901双向、nested与连续resize |
| desktop opacity submenu 有 invisible Tab或Escape立即重开 | M | H | browser先定位；必要local dismissal样式/行为，不把缺陷排除为“只是CSS” | desktop keyboard + focus/hover close tests |
| browser CI安装成本/超时/渲染flakiness | M | M | 锁runner、单次build/固定数据、本地server、assert等待状态、缺run失败 | 真实CI时长/27+ supplements完整报告，首失败保留 |
| legal固定路由或 consumer旧假设泄漏 | H | H | 两 fixed handler移走，同一eligible catalog，exact output reconciliation | default/active permutation，extra stale legal HTML拒绝 |
| digest受键序、换行或技术时间扰动 | M | H | 固定payload顺序/UTF-8/LF，renderer同payload，排除technical timestamps | Unicode/LF/key-order/时间阴性、每段policy变更阳性 |
| sentinel短词/合法quote误报 | M | M | branding field范围、host boundary、完整签名，不ban Add/Atlas全局 | neighbor hostname/ordinary control/quote/doc/draft negatives |
| 新public资产或search字段使coverage漂移 | H | H | expected registration独立、adapter版限定、required集合相等 | missing/unknown/read error tests，actual Pagefind payloadmutation |
| JSON-LD旧Organization/node数量断言依赖 | H | M | 有意改unsafe tests，保留canonical/Article/Breadcrumb，旧brand仍显示 | default graph 4 nodes，helper/API consumer回归 |
| structuredData extension或额外script绕过 | M | H | 拼合graph guard + 输出所有scripts，再查nested/数组/inline refs | adversarial extension/multi-script/controlled conflict negatives |
| Article consumers rich-result对author/publisher期待或角色驱动 UI 越界 | M | M | author 同一 resolved identity 的真实可见署名；publisher 独立 confirmed role，不强制文章 byline，公开语境由 Acceptance 验证 | 两 actual author consumer structured/visible 一致、publisher-only 不新增 UI；不声称consumer eligibility |
| 旧成功build样例残留使所有CI build失败或准备依赖browser | H | H | Phase-1 test/build helper 独立提供 neutral inputs/projectRoot，保留sample failure；先 canonical final，再 browser setup | 无 Playwright/browser/AX-03 的准备及 adopted canonical PASS；media/evidence原案例保持、sample rejection |
| 媒体 README 继续公开或迁移后直接引用断裂 | M | M | README 移出 public，现行两个 docs 链接/两个 tests 读取路径同步；历史 signature 留 tooling | docs 路径存在、public/dist README 不存在；历史 signature 回流拒绝、SVG/text coverage 保留 |
| 将可丢失的 .git metadata 当 provenance 权威 | M | H | 实施前 Candidate Creation 验证报告含完整来源及 zero-diff evidence；.git 仅可选非权威，不造 release artifact | 无 .git 记录仍可凭报告复核 source/candidate commit/tree/diff/clean/tag/hashes/origin/time |
| inline local script重复或夹具实现与Core漂移 | M | M | header原子/幂等init，fixtures导入actual components/CSS/404 | 重复init/迟到toggle/实源码入口与production fixture排除 |

## U. No-Go Conditions

遇到下列任一条件停止未来实施，提交具体失败证据回架构审查；不自行扩大 scope：

- 必须用 global state/nav framework、modal engine 才能满足本期 native disclosure 行为。
- 必须重写 catalog/routing authority、建立平行 legal route registry 或全站 catch-all。
- 必须 generic Schema.org/ontology engine、identity directory/verification service 才能 guard受控构造。
- 必须 lawyer/reviewer/CMS/database workflow，或让approval lifecycle 共用legal/identity/residue。
- 必须 generic dist scanner、arbitrary regex linter/decompressor/parser framework；required Pagefind text surface无法在固定adapter边界证明可检查。
- 为成功build需要删旧 technical checks、放松exact routes/budget/marker、把invalid legal/identity变warning、加生产residue allowlist。
- 必须修改冻结文档、冻结V2.6.5、IDs/ownership、改变baseline支持状态、创建下一release才能推进。
- 必须纳入Phase-2 provider/media/theme/freshness redesign或Pattern/Acceptance实现才能完成Phase1。
- initial candidate zero-diff/provenance无法复核，或计划范围演变成 broad repository restructuring。
- canonical final-build 准备必须依赖 Playwright/browser/AX-03、媒体开发说明必须继续留 public、publisher-only 强制新增文章 UI，或必须以 `.git` 文件/新 release-governance artifact 作为 candidate correctness 条件。

## V. What Must Not Change

Product Contract、Capability Support Baseline、Core Safety Contract、冻结 Starter 的内容、commit/tag/clean状态均不改变。Capability IDs、三类 ownership、baseline statuses、Core与assembled Acceptance边界不变。

契约 preserve：IA-02 truthful destinations、ID-01 explicit related seam、SEO-01 canonical/unique metadata、SEO-03 robots/sitemap/Article/Breadcrumb/safe JSON、PP-01 404/draft/private/unavailable/reconciliation、MR-01 disabled-by-default/provider isolation。valuable implementation preserve：media schema/file/render/readiness checks、Pagefind safe URLs/bounded excerpts/error/empty/normalization/exactness/800KB、当前actual layout/page primitives、final/evidence technical stages和marker failure闭合。静态无外部client JS规则不因导航增强被广泛豁免。

保留现有实现不等于宣告这些valuable machinery永久归Core，也不进行迁层。TL-02 不保留unsafe Organization/role默认、TL-01 不保留public draft输出，这是冻结目标明确要求的安全delta；其余强系统不重写。

四切片仍为 S1 TL-01 → S2 TL-02 → S3 PP-02 → S4 AX-01 + AX-03；`@playwright/test` dev-only 推荐、三角色及冻结矩阵、0 新 runtime dependencies、TL-01 Option C/approvedContentSha256、非断言 identity defaults、不可删除 Core sentinel catalog 与无 global approved-for-final 均不变。媒体开发 README 的窄迁移不改变媒体架构。

## W. What Must Not Enter Phase 1

显式排除 VF-01、VF-02、MC-01、MC-03、IA-03 provider-neutral redesign、FR-01、SEO-02、MC-05。仅允许为五项契约或防现有回归所必需的局部compatible修正（例如summary focus/overflow、Pagefind当前版本文字审计）；不借机做token/media rights/share-image/video/provider/freshness新模型。

排除 Pattern Library、Reference A/B/C、full Acceptance Gate、Release Governance、Capability Delta tooling、SOP/Master Prompt redesign、next release packaging、法律文案/业务事实创作、tracking/ads/analytics activation、外部联网真实性核验。本次任务还排除一切candidate/repo/branch/worktree/copy/dependency/test/fixture/CI实施、commit/push/tag和版本命名。

共享准备不得扩展成 fixture framework/project plugin API/workspace generator；author seam 不扩展为 author card/editor profile/publisher badge/company box/article footer framework。未来持久 provenance 属于单独 Release Governance / RI 设计，本期不创建该产物。

## X. Candidate Creation Readiness

**READY FOR CANDIDATE CREATION** — 仅架构/规划就绪；没有创建或授权candidate，也没有批准release。

经四项修正重新评估：canonical-build fixture 的共享准备已与 browser tooling 分离；媒体 developer README 已规划迁出 public 且不属生产 required coverage；Article 组件仅为明确 author attribution seam 修改，publisher 不驱动新 UI；Candidate Creation 验证报告为主要权威来源，`.git` 可选且非权威。没有发现阻挡 candidate creation 的未决实施架构问题，因此保留 READY；可选小 CLI、最终非 public docs 路径及依赖版本仍属实施细节。

具体先决证据：

1. 原独立审查已完成；须独立冻结核验本次 corrected Plan，确认四项修正及其预算/引用一致，保留 native local enhancement、legal digest/optional routes、controlled identity/roles、Pagefind enumerated coverage 与独立 CI adopted fixture build 边界。
2. 后续用户单独授权 candidate creation 并给出可变候选目标位置；目标不存在；三个冻结 hashes、Starter top-level/HEAD/tag/clean 再次匹配。
3. clone 后、实施前以 N 定义的 Candidate Creation verification output / review evidence 证明 source/candidate commit/tree、frozen tag/hashes、diff/clean/initial zero-diff、clone/origin 和时间；不要求 `.git` convenience record，不把它作为权威，不能在冻结 repo 直接实现。
4. implementation 单独授权后才安装 dev runner、修改 config/source/test/CI；future browser package 版本与 engine revisions 由候选 lock 证明。

这些prerequisites不包含先完成assembled Acceptance，也不把将来测试写成当前已执行。存在具体no-go证据则改为NOT READY并退回架构审查，不能为了維持READY掩盖缺口。

## Y. Exact Next Step

Independent freeze verification of the corrected PHASE1_CORE_SAFETY_IMPLEMENTATION_CANDIDATE_PLAN_V0.1.md.

**HARD STOP：** 计划交付后停止。不创建candidate/repository/branch/worktree，不复制Starter、不安装依赖、不写源码/测试/fixtures、不改CI或冻结输入、不命名下一版本、不commit/push/tag、不开始Phase2。
