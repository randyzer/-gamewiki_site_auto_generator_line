# Starter 2.0 Architecture Proposal

> Planning status: Phase 1 only — no implementation authorized  
> Proposal date: 2026-09-03  
> Repository: `/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.2`  
> Starter baseline: commit `827a13de9155f5eb1bc0b325136d8217b1fbbf54`  
> SOP baseline: local `GAME_SOP_V2.2`, commit `0a80e09e9e2aa658c1a34bf84590cd3e86df167d`

This document is the architecture and implementation plan requested for Starter 2.0. It does not authorize implementation, dependency installation, build-output generation, commit, push, or deployment.

# 1. Executive Decision

## APPROVE

Approve the product direction with a deliberately narrow implementation: retain the existing publication, fact, SEO, route, feature-flag, search, and reconciliation machinery; extend `src/core/site-data.ts` with one resolved-navigation projection, then add presentation-only navigation components, a player-first Wiki article shell, a small manifest-backed media layer, page-family accent hooks, and a data-derived Wiki portal homepage.

The recommended architecture does **not** mechanically adopt every suggested directory. It keeps the existing `Header.astro`, does not introduce a Theme Engine, Homepage CMS, MDX block engine, or media backend, and does not place media fields in Page Inventory. Two small changes inside `src/core/` are justified and bounded: `site-data.ts` becomes the single owner of Navigation Page ID → Enabled Page resolution and exports `resolvedNavigationGroups`; `site-validation.ts` calls that same resolver and reports its errors instead of implementing a second lookup/filter path. No other Stable Core algorithm needs to change.

The result should preserve this invariant:

```text
SOP decides coverage and human release gates.
Runtime Page Inventory decides what may publish.
Config decides navigation grouping/order and homepage featuring.
Content, Facts, and Media provide what the page presents.
Presentation components decide how players see it.
Build checks reconcile deterministic implementation state.
```

# 2. Current Starter Baseline

## Repository and version evidence

| Item | Verified baseline |
|---|---|
| Repository root | `/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.2` |
| Branch | `main` |
| Git status before this proposal | Clean (`## main`) |
| Current repository remote | No Git remote configured |
| Starter 1.0 source | The current repository and sibling `../GAME_SITE_STARTER_BASED_gamesop2.1` have the same HEAD, `827a13d`, and the same commit history. The sibling repository tracks `git@github.com:randyzer/GAME_SITE_STARTER_BASED_gamesop2.1.git`. This is direct evidence that the current directory is a copy of that Starter 1.0 baseline. |
| Local SOP | `../GAME_SOP_V2.2`, branch `main`, clean and synchronized with `origin/main` |
| SOP version | `GAME_SOP_2.2`, commit `0a80e09`, dated 2026-09-03, titled `GAME_SOP_2.2 — Production Coverage & Wiki UX Release` |
| Repository Master Prompt | `CodexMasterPrompt_v2.3Final.md`, renamed at commit `1917d1e`; its body still targets `GAME_SOP_2.1` and the 2.1 Starter path |
| Current request | Identifies itself as `Starter 2.0 Master Instruction`; no additional semantic version or repository file was supplied, so none is inferred |

The Master Prompt mismatch is a documentation/version-provenance issue, not permission to edit it during this phase. Starter 2.0 implementation documentation must state that SOP 2.2 supersedes the 2.1 references for this upgrade.

## Framework and architecture

- Astro `7.2.10`, static output, strict TypeScript, Tailwind CSS `4.3.3` through the Vite plugin, and Zod `4.5.4` at configuration/data boundaries.
- MDX Content Collections for guides, meta/tier content, and patch/news content.
- React islands only for search, entity filtering, calculators, and planners.
- Pagefind is the build-time local search implementation.
- The repository currently contains 19 files in `src/core/`, 11 component/island files, 9 Page Inventory rows, 22 test files, and 89 statically discoverable `it`/`test` cases.
- The most recent checked-in release audit records a passing 2.1 baseline under Node `22.22.0`: 18 test files, 74 tests, 8 generated pages, exact route reconciliation, and responsive browser inspection. Additional tests were committed after that audit.
- Current-process verification could not run because this copy has no `node_modules`, `tsx` and `vitest` are unavailable, and the active Node is `22.16.0` while `.nvmrc` requires `22.22.0`. Dependencies were not installed because this phase explicitly forbids it.

## Page Inventory

`src/data/page-inventory.json` is the runtime publication SSOT. Its Zod schema owns page identity, route, page/module family, feature ownership, priority, visibility, publication/content/development state, indexability, title, description, dates, primary keyword, tags, content/entity references, related pages/entities, provenance, and confidence.

`buildEnabledPageCatalog()` admits only pages that are public, published, and feature-enabled. Navigation, homepage lists, sitemap, related links, route models, Pagefind inclusion, HTML audit, and exact output reconciliation derive from that enabled catalog. This is already the correct Stable Core.

Media is absent from Page Inventory and must remain absent from it.

## Navigation

Navigation is currently a flat `navigation.primaryPageIds` array. `src/core/site-data.ts` resolves it through the enabled catalog, `src/core/site-validation.ts` fails configured references that are not enabled, and `Header.astro` renders one desktop-like row with a small hard-coded label map.

At mobile width, most navigation links are hidden by CSS. There is no menu, grouped navigation, submenu, expandable mobile navigation, or actual-markup reconciliation for configured navigation.

## Article layout

Guide articles are rendered inline in `src/pages/guides/[...slug].astro`. Meta and patch/news pages use `EditorialArticle.astro`. The guide route and `EditorialArticle` both prominently render internal `priority`, `confidence`, `primaryKeyword`/“Signal”, and tags. They label sources as an “Evidence ledger” and expose editorial framing.

`EntityDetail.astro` similarly displays a confidence seal and “Provenance ledger”. The Guide Hub exposes Priority and Signal columns. These are concrete violations of SOP 2.2's Player-Facing UX Rule.

## Homepage

`src/pages/index.astro` is a well-structured static page, but its product language is a Starter demonstration: “Published nodes”, “Active systems”, “Source policy”, “Publishing principles”, “Operating doctrine”, and “Configure the starter”. It derives featured/browse pages from the existing catalog, which is reusable, but its composition is not a player-facing Wiki portal.

## Media support

- No PNG, JPEG, WebP, AVIF, GIF, MP4, or WebM assets exist in `public/` or `src/`.
- No media schema, manifest, page-to-media mapping, image component, gallery, or YouTube embed exists.
- The generated-HTML audit checks that every rendered `<img>` has an `alt` attribute, but only its test fixture currently contains an image.
- There is no local media existence check, provenance validation, YouTube ID validation, or responsive video component.

## Theme system

`src/styles/theme.css` already defines reusable semantic colors and `global.css` consumes them extensively. This Theme Token mechanism is valid Stable Core. Page-family tokens and a common `--page-accent` hook do not yet exist. `BaseLayout.astro` contains one remaining hard-coded `#ee4b20` theme-color meta value outside `theme.css`.

## Tests and reconciliation

Existing tests cover config, Page Inventory, enabled catalog filtering, feature leaks, content references, fact schemas/loaders, route models, SEO, HTML audit, output reconciliation, search/filter behavior, tools, patch impact, branding, static copy, and theme tokens.

Existing deterministic flow is strong:

```text
Config + Inventory + Content + Facts
    → validate-site
    → Astro static build
    → exact Inventory/output reconciliation
    → Pagefind
    → generated HTML/SEO/link/asset-budget audit
```

It should be extended, not replaced.

## Stable Core baseline

The current Stable Core is:

- all generic algorithms in `src/core/`;
- runtime Page Inventory and its schema;
- `src/data/entity-modules.ts` registry;
- fact/provenance/tool schemas and loaders;
- route-record generation and fixed route ownership;
- SEO and JSON-LD helpers;
- feature flags and enabled-catalog filtering;
- Pagefind/search-state boundaries;
- output reconciliation, HTML audit, patch impact, and deployment gate;
- Astro static output and the existing React-island boundary.

## Presentation Edge baseline

The current Flexible/Presentation Edge is the part expected to change during adoption and during this upgrade:

- `game.config.ts` values and the presentation-oriented parts of `src/config/schema.ts`;
- `src/components/*.astro` and their visual composition;
- `src/layouts/BaseLayout.astro` presentation hooks;
- `src/pages/index.astro` and the presentation branches inside route files;
- `src/styles/theme.css` game-specific values and `src/styles/global.css` visual rules;
- `src/content/**` narrative content and its existing schema boundary; optional visible FAQ fields are a Phase D extension, not part of Phase A;
- real-game rows in `src/data/page-inventory.json`, fact files, and tool definition files during adoption, while their Stable Core publication/schema contracts remain authoritative;
- player-facing guidance in `README.md`, `docs/CONTENT_AND_DATA_GUIDE.md`, and `docs/QA_CHECKLIST.md`.

This proposal changes presentation consumers and their config/media inputs; it does not move publication authority into the Presentation Edge.

# 3. Gap Analysis

Each numbered item in the Master Instruction receives one primary classification. Mixed items also identify their human-only portion in the reason.

| # | Requirement | Classification | Reason |
|---:|---|---|---|
| 1 | Seven Starter 2.0 objectives | **MODIFY** | Stable pieces exist, but player presentation, navigation, homepage, media, family variants, and player-facing metadata all require targeted change; reconciliation already provides a base. |
| 2 | Stable Core vs Flexible Edge | **EXISTING** | The current code and architecture docs already enforce this boundary. The upgrade should preserve it and permit only two narrow Core edits required by the new navigation shape. |
| 3 | Suggested directory direction | **REJECT** | Mechanical adoption would add low-value wrappers. Use navigation/wiki/media/home subdirectories only where a real responsibility exists; do not add a separate `Screenshot.astro` or `WikiHub.astro` until reuse justifies it. |
| 4 | Media System | **ADD** | No media model, storage, presentation, or validation exists. |
| 5 | Media must not pollute Page Inventory | **EXISTING** | Inventory and narrative/facts are already separated, and Inventory has no media fields. Preserve this by using a separate manifest keyed by `pageId`. |
| 6 | Preserve EditorialArticle and add WikiArticle | **MODIFY** | `EditorialArticle` exists and is used by meta/news. It should remain for editorial families, while guides migrate to a new default `WikiArticle`; its public metadata still needs cleanup. |
| 7 | WikiArticle player-task structure | **ADD** | No reusable Wiki article shell, body-heading TOC, quick-facts slot, media slot, or player-friendly source footer exists. Phase D, not Phase A, adds optional FAQ placement. |
| 8 | Reposition Sources | **MODIFY** | Provenance is strong but presented as an internal ledger. Reuse existing source data in a player-friendly `Sources & Verification` component at the article end. |
| 9 | Wiki Portal Homepage | **MODIFY** | The homepage exists and consumes correct core data, but its copy and hierarchy describe the Starter rather than a game Wiki. |
| 10 | Homepage data-source rules | **MODIFY** | Featured and Browse data already derive correctly. Categories, updates, facts, and media must be derived without introducing a second homepage SSOT. |
| 11 | Grouped navigation config | **MODIFY** | Replace the authored flat form with grouped Page-ID references while accepting and normalizing the legacy form for migration. |
| 12 | Navigation data responsibilities | **MODIFY** | Route/title/state already come from Inventory, but labels are hard-coded in `Header.astro`. Move only group/order/optional presentation labels to Config. |
| 13 | Mobile navigation | **ADD** | Current mobile CSS hides primary links. Add an accessible menu and expandable groups without a React island. |
| 14 | Page-family visual variants | **MODIFY** | Semantic theme tokens exist; add category fallbacks and one shared page-family hook. |
| 15 | Visual-variant boundary | **MODIFY** | The design constraint is clear, but no implementation guard exists. Components must consume `--page-accent`; family-specific hard-coded colors remain forbidden. |
| 16 | QuickFacts primitive | **ADD** | Entity facts exist, but there is no generic label/value presentation primitive. |
| 17 | FAQ primitive | **ADD** | No FAQ component or optional content schema exists. Both belong to Phase D Content Richness; FAQ structured data is intentionally excluded from the first implementation because visible-content parity must come first. |
| 18 | Media QA | **ADD** | Only a generic rendered-image `alt` presence check exists. Manifest references, local paths, provenance, video IDs, and responsive embed contracts are absent. |
| 19 | Navigation reconciliation test | **MODIFY** | Flat top-level references are already validated against enabled pages. Extend this to group children and add actual header-markup checks; continue to fail rather than silently omit bad references. |
| 20 | Planning/implementation reconciliation boundary | **EXISTING** | Config ↔ Inventory ↔ output is already automated, and no Markdown planning parser exists. Site Structure ↔ implementation remains a SOP/human review responsibility. |
| 21 | Explicit overengineering prohibitions | **REJECT** | CMS, database, DAM, Theme Engine, layout DSL, page builder, mega-menu framework, plugin system, AI media selection, and automated rights decisions are explicitly outside this architecture. |
| 22 | Estimated file scope | **MODIFY** | Most named edge files are relevant, but the final file plan is based on actual repository seams and avoids unnecessary renames/wrappers. |
| 23 | A–E implementation priority | **SOP-ONLY** | This is delivery sequencing recorded in the plan, not runtime behavior. The proposed sequence is retained. |
| 24 | Phase A foundation and smoke gate | **SOP-ONLY** | This is the human-controlled implementation gate. Runtime tests support it, but code must not auto-advance phases. |
| 25 | Phase B/C/D/E requirements | **SOP-ONLY** | These are plan and acceptance controls. Their deterministic portions map to tests; qualitative/media-rights judgments remain human. |
| 26 | Final acceptance criteria | **MODIFY** | The presentation must materially change to meet the criteria. “Feels like a Wiki”, visual richness, and rights remain manual QA; route/leak/media existence are automated. |
| 27 | Final Starter/SOP responsibility principle | **SOP-ONLY** | This is governance: SOP and human research decide coverage; Starter supplies reusable presentation. It must be documented, not encoded as a content-decision engine. |

## Classification totals

| Classification | Count |
|---|---:|
| EXISTING | 3 |
| MODIFY | 12 |
| ADD | 6 |
| SOP-ONLY | 4 |
| REJECT | 2 |
| DEFER | 0 |
| **Total** | **27** |

`DEFER = 0` at the item level does not mean every optional enhancement ships. FAQ structured data, automatic image transformation, media-network checks, and generic game-level fact storage are intentionally excluded from the first implementation because the requested primitives do not require them.

# 4. Stable Core Protection

## Files that must remain unchanged

The following files should be `KEEP` throughout Starter 2.0 unless a failing implementation test produces new direct evidence:

- `src/core/brand.ts`
- `src/core/catalog.ts`
- `src/core/content-files.ts`
- `src/core/entity-route-model.ts`
- `src/core/fact-loader.ts`
- `src/core/filter-state.ts`
- `src/core/html-audit.ts`
- `src/core/optional-routes.ts`
- `src/core/output-reconciliation.ts`
- `src/core/page-models.ts`
- `src/core/page-resolution.ts`
- `src/core/patch-impact.ts`
- `src/core/search-state.ts`
- `src/core/seo.ts`
- `src/core/static-page-copy.ts`
- `src/core/tool-definitions.ts`
- `src/core/tool-loader.ts`
- `src/data/page-inventory.json` as the existing baseline publication dataset; real-game adoption may edit rows, but Starter 2.0 architecture adds no media/layout fields
- `src/data/schemas/page-inventory.ts`
- `src/data/entity-modules.ts`
- `src/data/schemas/facts.ts`
- `src/data/schemas/provenance.ts`
- `src/data/schemas/tools.ts`
- `astro.config.ts`
- `package.json`
- `package-lock.json`

## Two justified Core exceptions

1. `src/core/site-data.ts` currently reads only `siteConfig.navigation.primaryPageIds`. A grouped canonical config cannot be consumed without changing this file or creating a duplicate authored flat list. Add the single pure resolution function and export the resolved structure from this file; do not alter enabled-catalog filtering or unrelated exports.
2. `src/core/site-validation.ts` currently validates only `primaryPageIds`. It must call the `site-data.ts` resolver with the candidate normalized groups and candidate enabled catalog, catch its aggregated resolution error, and add that error to validation results. It must not flatten, look up, or filter navigation Page IDs independently. This preserves the Stable Core leak-prevention invariant through one resolution implementation.

No route-generation, SEO, fact, search, output-reconciliation, or Page Inventory algorithm needs to change.

## Dependency direction that must not reverse

```text
Config schema ─┐
               ├→ Core catalog/validation/resolution → Presentation
Inventory ─────┘

Facts ─────────────────────────────────────────────→ Presentation
Content ───────────────────────────────────────────→ Presentation
Media manifest/schema/catalog ─────────────────────→ Presentation

Presentation must not become an input to Core publication decisions.
```

- Core must never import Astro components or homepage/wiki/media presentation modules.
- Media must never create pages or routes.
- Content and facts must never bypass Inventory to publish a route.
- Config grouping must never duplicate route, title, publication, visibility, indexability, or feature state.
- Build output must remain downstream of the enabled catalog.

## Schemas that may change

- `src/config/schema.ts`: add a small grouped-navigation input and normalize the legacy flat input to the canonical grouped output. Reject configs that author both forms.
- `src/content.config.ts`: **Phase D only**, allow optional visible FAQ items for editorial collections. Existing `pageId`-only content remains valid; Phase A does not modify this schema.
- New `src/data/schemas/media.ts`: validate an independent media manifest.

## Schemas that should not change

- Page Inventory schema: media placement, captions, galleries, and layout blocks do not belong here.
- Provenance schema: existing URLs, source type, date, and evidence note are sufficient for player-friendly rendering; no duplicate media rights engine is added.
- Existing entity fact schemas: QuickFacts maps validated facts into `{ label, value }`; it does not require new fields.
- Tool schemas, feature-flag keys, page type/module enums, and SEO schema contracts.

# 5. Proposed Architecture

## Chosen approach

Use explicit, file-backed, build-time models at the Presentation Edge:

- Config owns normalized navigation groups and homepage featured ordering.
- Runtime Page Inventory continues to own publishability and URLs.
- A tiny media manifest owns assets and page placements.
- Astro components own rendering and graceful absence.
- Existing scripts and tests enforce deterministic references and output.

Two alternatives were considered and rejected:

1. Putting `heroImage`, `gallery`, `youtube`, FAQ, and layout blocks on each Inventory row would make the publication ledger a whole-page CMS and couple route governance to layout.
2. A generic page-block DSL or CMS would make homepage/article composition configurable, but it would duplicate content state, enlarge validation, and violate the explicit non-goals.

## High Cohesion

- Navigation config parsing, the single `site-data.ts` resolution boundary, desktop markup, and mobile markup have separate, narrow responsibilities.
- Wiki primitives render only visible player content; they receive already resolved pages/facts/media.
- Media schema/catalog owns asset identity and lookup; components own responsive presentation; validation scripts own filesystem checks.
- Homepage components render sections while one pure homepage model derives their inputs.

## Low Coupling

- Components reference Page IDs and receive resolved `PageInventoryEntry` values; they do not reconstruct routes or publication state.
- Media maps to `pageId`, but Page Inventory does not import or know about media.
- Missing optional media/FAQ/facts produce no section rather than a placeholder.
- Existing SEO, search, entity, and route code remain unchanged.

## Modular and replaceable design

- `VideoEmbed.astro` is the only YouTube-specific rendering seam.
- `GameMedia.astro` dispatches a validated asset to image or video rendering.
- `ScreenshotGallery.astro` composes assets but does not own storage.
- `Sources.astro`, `FAQ.astro`, `QuickFacts.astro`, and `RelatedPages.astro` are data-light presentation primitives.
- Replacing YouTube or the local media directory later would touch the media schema/catalog/component boundary, not Inventory or routes.
- Replacing the homepage visual composition would not change publication data.

## Adaptable design

- New game families continue to come from approved Inventory/module/fact work; the Starter does not decide them.
- A real project changes theme tokens, media manifest, content, facts, Inventory rows, feature flags, and grouped navigation.
- Page-family variants use a fallback so a project can customize one family or none without broken styling.

## Stable Core, Flexible Edge

Stable Core continues to answer “may this page exist and ship?”. Flexible Edge answers “how should this enabled page help a player?”. No component can promote a draft/private/disabled page.

## KISS, YAGNI, and 80/20

- One JSON media manifest, not a service.
- One navigation grouping level, not a recursive mega-menu tree.
- Local images under `public/media/` and YouTube embeds only in Media V1.
- Native Astro and semantic HTML; no new runtime package.
- One page-family accent variable; no theme runtime or arbitrary style config.
- Fixed homepage section order; optional data controls visibility, not a layout builder.
- Visible FAQ only; no automatic FAQ generation and no first-pass FAQ JSON-LD.

# 6. Proposed Directory / File Changes

The following is the recommended **future implementation** scope. In the current phase, only this proposal document is added.

## ADD

| File | Purpose and reason | Dependencies | Stable Core impact |
|---|---|---|---|
| `src/components/navigation/DesktopNav.astro` | Render direct top-level Hub links and one-level dropdown lists using nested lists and `:focus-within`. It receives `ResolvedNavigationGroup[]` and never resolves or filters pages. | `resolvedNavigationGroups` presentation props | None. |
| `src/components/navigation/MobileNav.astro` | Render a native `<details>` menu and expandable groups; parent Hub appears as a direct “Overview” link. It receives the same resolved props and never resolves or filters pages. | `resolvedNavigationGroups` presentation props | None; no React island. |
| `src/components/wiki/WikiArticle.astro` | Default player-facing guide shell: breadcrumb, header, freshness, content-only H2/H3 TOC, optional quick facts/media, content, related pages, and sources. Phase D adds optional FAQ placement. | BaseLayout, SEO helpers, wiki/media primitives | Reuses Core read-only. |
| `src/components/wiki/QuickFacts.astro` | Render a generic `{label, value}` list and render nothing for an empty list. | No data store | None. |
| `src/components/wiki/FAQ.astro` | **Phase D:** render visible authored questions/answers and render nothing when absent. It has no Phase A dependency. | Optional Content data | None. |
| `src/components/wiki/Sources.astro` | Present existing provenance as `Sources & Verification`, including source type/host and verification dates. | Provenance type | None. |
| `src/components/wiki/RelatedPages.astro` | Reuse one player-facing related-page list in WikiArticle, EditorialArticle, and EntityDetail. | Resolved Inventory pages | None. |
| `src/data/schemas/media.ts` | Define and validate the minimal local-image/YouTube asset and fixed `hero`/`gallery`/`trailer` page-placement manifest. | Zod only | No Page Inventory change. |
| `src/data/media/media.json` | Store assets once and map optional hero/gallery/trailer placements by `pageId`. Starts empty in the generic Starter. | Media schema | None. |
| `src/data/media/catalog.ts` | Parse the manifest, enforce unique IDs/references, validate local image paths, normalize YouTube IDs, and resolve the three fixed page placements. | Media schema + JSON | None. |
| `src/components/media/GameMedia.astro` | Render a responsive `<figure>` for a validated image or delegate video to VideoEmbed; include caption/source when present. | Media catalog/types | None. |
| `src/components/media/VideoEmbed.astro` | Render a lazy, titled, responsive `youtube-nocookie.com` iframe from a validated video ID. | Validated video asset | None. |
| `src/components/media/ScreenshotGallery.astro` | Render an optional image grid using GameMedia; empty arrays render nothing. | GameMedia | None. |
| `public/media/README.md` | Document the local asset location and rights/optimization responsibility while allowing the directory to exist without fake assets. | None | None. |
| `src/styles/page-families.css` | Map Page Inventory module names to one `--page-accent` using theme-token fallbacks. | `theme.css` | None. |
| `src/components/home/home-model.ts` | Derive categories, start-here/featured pages, systems, updates, browse-all, and optional media from current SSOTs. | Enabled catalog, config, media catalog | Read-only consumption. |
| `src/components/home/GameHero.astro` | Render game title/description, start CTA, and optional lead media. | Home Inventory row, featured page, media | None. |
| `src/components/home/WikiCategories.astro` | Render published Hub/database categories only when present. | Derived homepage model | None. |
| `src/components/home/PageCollection.astro` | Reuse one card-list primitive for Featured Guides, Systems, Latest Updates, and Browse All. | Inventory pages | None. |
| `tests/navigation.test.ts` | Cover grouped normalization, the sole `site-data.ts` resolution path, invalid references, leak prevention, labels/order, and markup reconciliation. | Vitest, Config schema + site-data resolver | Protects catalog rules. |
| `tests/wiki-article.test.ts` | Verify player-visible structure, optional-section fallback, TOC inputs, sources, related links, and no internal metadata labels. | Vitest/source fixtures | None. |
| `tests/player-facing-metadata.test.ts` | Regression test public guide/hub/entity/editorial templates for forbidden internal labels. | Vitest + source reads | None. |
| `tests/media.test.ts` | Cover schema, IDs, types, paths, provenance, page references, local existence callback, and YouTube validation. | Vitest + media schema/catalog | None. |
| `tests/homepage.test.ts` | Cover each derived homepage section, ordering, de-duplication, and empty-section hiding. | Vitest + home model | None. |
| `docs/STARTER_2.0_MIGRATION.md` | Give an adoption checklist for 1.0 projects and the legacy navigation normalization. | Final implemented contract | None. |

`Screenshot.astro` is not added: GameMedia's image branch already has that single responsibility. `WikiHub.astro` is not added: the guide Hub is currently the only editorial Hub and can stay in its route until a second reusable Hub proves the abstraction.

## MODIFY

| File | Purpose and reason | Dependencies | Stable Core impact |
|---|---|---|---|
| `game.config.ts` | Migrate the example from `primaryPageIds` to `navigation.groups`; keep featured IDs unchanged. | Config schema | Edge only. |
| `src/config/schema.ts` | Add one-level groups, Page-ID uniqueness scoped only to the Primary/Secondary `navigation.groups` tree, `children: []` normalization, and legacy-flat normalization. Exactly one input form is accepted. | Zod, existing Page ID grammar | Config contract only. |
| `src/content.config.ts` | **Phase D:** add optional visible FAQ items for editorial content. Existing frontmatter remains valid. It is unchanged in Phase A. | Zod | No publication change. |
| `src/core/site-data.ts` | Define the only navigation resolver and export `ResolvedNavigationGroup { label?: string; page: PageInventoryEntry; children: PageInventoryEntry[] }[]`. Existing `primaryNavigationPages`, if retained for compatibility, derives from this result rather than doing another lookup. | Normalized Config + enabled catalog | Minimal justified edit; enabled filtering semantics unchanged. |
| `src/core/site-validation.ts` | Call the `site-data.ts` resolver for candidate Config/catalog validation and surface its errors; do not implement navigation lookup/filter logic. | Normalized config + shared resolver | Minimal justified edit; strengthens the existing invariant through one SSOT. |
| `src/components/Header.astro` | Keep the brand shell; read `resolvedNavigationGroups`, pass them unchanged to desktop/mobile components, and remove hard-coded labels. | Site-data projection + presentation components | Edge only. |
| `src/components/EditorialArticle.astro` | Keep editorial framing for meta/news, remove public internal metadata, and reuse Sources/RelatedPages. | Wiki primitives | Edge only. |
| `src/components/EntityDetail.astro` | Replace confidence/provenance-ledger framing with player summary, Last Verified, QuickFacts, optional media, Sources, and Related Pages. | Facts, media, wiki primitives | Fact data unchanged. |
| `src/pages/guides/[...slug].astro` | Preserve route generation and Hub branch; use WikiArticle for articles and make Hub cards player-facing. | Existing route model + WikiArticle | Route model unchanged. |
| `src/pages/index.astro` | Become a thin Wiki portal orchestrator using the homepage model and conditional sections. | Existing site data + home/wiki/media components | No new SSOT. |
| `src/layouts/BaseLayout.astro` | Add `data-page-family={page.module}`, load family styles, and remove the stale hard-coded theme-color meta instead of duplicating palette config. | Inventory page module | SEO helpers unchanged. |
| `src/styles/theme.css` | Add family token fallbacks such as `--color-guides: var(--color-accent)`. | Existing semantic tokens | Extends token contract. |
| `src/styles/global.css` | Add/adjust shared navigation, Wiki, media, and homepage layout rules; remove superseded demo-specific selectors only after callers are migrated. | Theme + component classes | Edge only; avoid wholesale rewrite. |
| `scripts/validate-site.ts` | Load/validate the media manifest and report deterministic media/path/reference errors alongside existing site errors. | Media catalog/schema | Existing validation order retained. |
| `scripts/audit-build.ts` | Verify generated headers contain every resolved nav Page ID/href and responsive media markup markers. | `resolvedNavigationGroups` + media catalog | Existing audit remains the final build stage; no second nav resolver. |
| `README.md` | Update SOP baseline to 2.2 and document navigation, media, WikiArticle, theme families, and adoption sequence. | Implemented contract | Documentation only. |
| `docs/CONTENT_AND_DATA_GUIDE.md` | Document Page Inventory/content/media responsibilities, FAQ authorship, QuickFacts fact mapping, and media examples. | Implemented contract | Documentation only. |
| `docs/QA_CHECKLIST.md` | Add grouped nav, player metadata, media, family variant, homepage conditional, and 390/768/1440 checks. | Implemented contract | Documentation only. |
| `tests/config.test.ts` | Test grouped input, legacy normalization, duplicate/self child rejection, and mutual exclusion. | Config schema | Protects migration. |
| `tests/site-data.test.ts` | Update expected top-level navigation and preserve feature filtering/ordering. | Site data | Protects minimal Core edit. |
| `tests/site-validation.test.ts` | Add unknown, draft, private, and feature-disabled parent/child cases. | Site validation | Protects leak prevention. |
| `tests/theme.test.ts` | Require family tokens, fallback usage, page-family stylesheet import, and no family hex colors outside `theme.css`. | Stylesheets | Protects theme boundary. |
| `tests/html-audit.test.ts` | Add media markup fixtures where needed while retaining alt/internal-link/SEO checks. | HTML audit | No change to audit algorithm required. |

## KEEP

In addition to the Stable Core list above, keep these route/component boundaries unless implementation evidence contradicts the plan:

- `src/pages/meta/[slug].astro` and `src/pages/news/[slug].astro`: continue using EditorialArticle.
- `src/pages/heroes/[...path].astro`, `items/[...path].astro`, `weapons/[...path].astro`, and `maps/[...path].astro`: continue mapping explicit validated facts into EntityDetail/EntityDatabase.
- `src/components/EntityDatabase.astro`: already presents player-usable filtering/table data; only shared CSS accents may affect it.
- `src/components/ToolShell.astro`, all four existing React islands, `Footer.astro`, `LegalPage.astro`, and fixed legal/search/tool routes.
- `.github/workflows/ci.yml`: existing `npm ci → check → build` already invokes the modified validators/audits.
- `.nvmrc`, `astro.config.ts`, `tsconfig.json`, and `wrangler.jsonc`.

## REMOVE

No files should be removed. Superseded CSS selectors may be removed only in the same reviewable diff that migrates their final caller. `Header.astro` and `EditorialArticle.astro` are retained.

# 7. Navigation Design

## Data model

Canonical authored form:

```ts
type NavigationGroup = {
  label?: string;
  pageId: string;
  children?: string[];
};

type NavigationConfig = {
  groups: NavigationGroup[];
};
```

Example:

```ts
navigation: {
  groups: [
    { label: "Home", pageId: "home" },
    {
      label: "Guides",
      pageId: "hub.guides",
      children: ["guide.getting-started", "guide.progression"],
    },
    { label: "Search", pageId: "search" },
  ],
}
```

Rules:

- `pageId` and every child use the existing Page ID grammar.
- Only one child level is allowed; this solves 5–7 families/20+ pages without becoming a mega-menu framework.
- Page IDs must be unique **within the `navigation.groups` Primary/Secondary Navigation Tree**: one Page ID may occur only once among that tree's parents and children, and a group cannot contain its own parent ID. This scope is not site-global.
- The navigation-tree uniqueness rule does not prevent the same Page ID from also appearing in Footer links, Homepage sections, Related Pages, article internal links, Sitemap entries, or Search results. Footer is not part of `navigation.groups`.
- `label` is optional presentation copy for the top-level group. If omitted, use the resolved Inventory title. Child labels use resolved Inventory titles; routes and state never appear in Config.
- Order is array order.
- Authored `children: []` is normalized to an omitted/empty resolved children list and treated exactly as a childless group. DesktopNav and MobileNav render a direct link and never emit an empty dropdown or expander.
- The legacy `{ primaryPageIds: string[] }` input is accepted and normalized to childless groups. A config cannot author both formats.

## Page Inventory relationship

```text
game.config.ts navigation groups
    ↓ normalize shape/tree-local uniqueness
src/config/schema.ts
    ↓
src/core/site-data.ts
    ├─ builds/receives Enabled Page Catalog
    ├─ performs the only Page ID → Enabled Page lookup
    └─ exports ResolvedNavigationGroup[]
         ↓ presentation props only
Header → DesktopNav + MobileNav
```

The resolved output is:

```ts
type ResolvedNavigationGroup = {
  label?: string;
  page: PageInventoryEntry;
  children: PageInventoryEntry[];
};
```

The media/content layers do not participate. Navigation Config never stores URLs, page titles, visibility, indexability, or feature flags. `src/core/site-data.ts` is the only location that converts navigation Page IDs into enabled Inventory pages. Header, DesktopNav, and MobileNav do not look up IDs, filter publication/feature state, resolve routes, or decide whether a page is enabled.

## Desktop behavior

- A childless group renders a direct link.
- A group with children renders a direct parent Hub link plus a visually associated nested list.
- The submenu opens on pointer hover and `:focus-within`; keyboard focus can move through every ordinary link without ARIA menubar semantics.
- Active state is true when the current route equals the parent or any child route.
- Dropdowns remain one level deep and must not cover the focused item or depend on animation.

## Mobile behavior

- A native outer `<details>`/`<summary>` supplies the menu toggle without a global JavaScript island.
- Each group with children uses an expandable native `<details>` section.
- The expanded group starts with a direct “Overview” link to the parent Hub, followed by child links; the Hub is therefore clickable rather than acting only as a toggle.
- Native Enter/Space behavior, visible focus, adequate touch targets, and meaningful labels are required.
- With CSS unavailable, links remain in document order; with JavaScript unavailable, expansion still works.

## Unpublished/private/disabled behavior

- Unknown Page ID: validation/build fail.
- Draft, scheduled, archived, private, unlisted, or feature-disabled reference: validation/build fail because it is absent from the enabled catalog.
- Public, published, feature-enabled but `noindex` pages may appear in navigation when intentionally configured; Search is the valid example. Indexability is not navigation eligibility.
- An explicitly authored `children: []` is a valid childless group and produces no dropdown. By contrast, a non-empty child list containing a disabled page fails resolution; it is never silently reduced to an empty group.

There is no reasonable exception for private/draft/disabled navigation items in the public Starter. Preview-only navigation would require an explicit preview publication mode, which does not exist and is not added.

## Tests

- Schema accepts grouped form and legacy form; canonical output is grouped and normalizes `children: []` to childless.
- Duplicate parents/children within the navigation tree, parent-as-child, both input forms, and empty navigation fail. Reuse of the same Page ID outside `navigation.groups` remains valid.
- `src/core/site-data.ts` resolves every configured parent/child to an enabled page and is the only resolver exercised by unit tests and validation.
- Unknown, draft, private/unlisted, archived/scheduled, and feature-disabled cases fail with the referenced Page ID.
- Ordering and optional parent labels survive resolution.
- Header, DesktopNav, and MobileNav tests receive only `ResolvedNavigationGroup[]`; presentation tests do not pass raw Page IDs or an Inventory lookup map.
- Generated Header markup contains `data-nav-page-id` plus the already resolved Inventory route for every configured ID in both responsive renderings.
- Output reconciliation still proves each target route has a generated HTML file.
- Manual 1440/768/390 checks cover pointer, Tab, Shift+Tab, Enter, Space, focus visibility, wrapping, and touch targets.

# 8. Wiki Article Design

## Component ownership and data flow

`WikiArticle.astro` is a layout-level component for player guides. In Phase A it receives an already enabled Inventory page, rendered MDX content, content-renderer headings, and optional quick facts. Media props are added in Phase B; optional FAQ content is added in Phase D. It reuses existing SEO helpers and BaseLayout rather than duplicating canonical/robots/schema logic.

Conceptual props:

```ts
interface WikiArticleProps {
  page: PageInventoryEntry;
  sectionLabel?: string;
  headings?: Array<{ depth: number; slug: string; text: string }>;
  quickFacts?: Array<{ label: string; value: string }>;
  // Phase B additions:
  heroMedia?: MediaAsset;
  galleryMedia?: MediaAsset[];
  trailerMedia?: MediaAsset;
}
```

The default slot is Main Content. Inline MDX may use `GameMedia` for a specific screenshot/video, but page-level hero/gallery/trailer placement comes from the media manifest, not MDX frontmatter or Inventory.

## Player-facing default structure

1. Breadcrumbs from the existing SEO trail.
2. Player-facing family eyebrow.
3. H1 from Inventory title and short description from Inventory description.
4. `Last Updated` from `page.updatedAt` and `Last Verified` from the most recent applicable source access date.
5. Optional hero image/video.
6. Optional Quick Answer supplied by visible article content and optional QuickFacts from validated facts.
7. Optional TOC from rendered MDX **body headings only**; hide it when fewer than two eligible headings exist.
8. Main task-oriented MDX content, including tables/callouts/inline media.
9. Optional FAQ from authored visible content after Phase D adds the component/schema integration.
10. Related Pages from enabled Inventory relationships.
11. Sources & Verification from existing provenance.

## TOC boundary

- The route uses the headings returned by the existing MDX/content render operation; it does not scan rendered DOM or HTML.
- Include only body `H2` and `H3` headings (`depth` 2 or 3), preserving document order and renderer-provided slugs.
- Exclude the page `H1`, `H4+`, and every component-owned UI heading, including Sources, FAQ, Related Pages, QuickFacts, media captions, navigation, and layout headings.
- Sources/FAQ/Related Pages are outside the rendered MDX heading input and must not be appended manually to the TOC.
- No generic DOM heading crawler, rehype crawler, selector registry, or post-render parsing layer is added.

## Hidden internal fields

These stay in Inventory for planning, validation, maintenance, and sorting but are not rendered by default:

- `priority`
- `confidence`
- `primaryKeyword` / Search Signal
- `tags`
- `contentStatus`
- `developmentStatus`
- `needsReview`
- `needsUpdate`
- internal editorial briefs or implementation notes

## EditorialArticle decision

- **Migrate:** `pageType: guide` moves from duplicated inline markup to WikiArticle.
- **Continue:** `pageType: meta` and `pageType: patch` continue to use EditorialArticle because methodology/patch context is legitimately editorial.
- **Clean:** EditorialArticle still hides Priority, Search Signal, internal Confidence, tags, and instructions from public output; it adopts player-friendly Sources and Related Pages.
- **Entity pages:** keep EntityDetail because an entity reference is structurally different from an article, but clean its confidence-ledger language and reuse QuickFacts/Media/Sources/RelatedPages.

This preserves a real editorial variant without making research-report UX the default player page.

## Sources and Phase D FAQ boundary

- Sources retain provenance strength but use player language: source type/host, link, and last checked/verified date. Evidence notes may appear as supporting context, not an “Evidence Ledger”.
- Phase A does not add `FAQ.astro`, FAQ props, or FAQ fields to `src/content.config.ts`.
- Phase D may add optional visible FAQ content after the homepage/content-richness work needs it. FAQ remains authored, never generated, and renders only when non-empty.
- Initial Starter 2.0 implementation does not add FAQ structured data. If later added, the schema builder must receive the exact same items rendered by FAQ.

## Graceful fallback

- No media: article header and content close the gap without an empty frame.
- No quick facts: no QuickFacts section.
- Before Phase D there is no FAQ UI. After Phase D, absent FAQ data produces no FAQ heading or empty accordion.
- No useful TOC: no TOC.
- No enabled related pages: no Related Pages section.
- Sources cannot be absent for valid Inventory pages because the current schema requires at least one.

# 9. Media Design

## Minimal schema

```ts
type MediaAsset = {
  id: string;
  type: "image" | "video";
  src: string;
  alt: string;
  caption?: string;
  sourceUrl: string;
};

type PageMedia = {
  pageId: string;
  hero?: string;
  gallery?: string[];
  trailer?: string;
};

type MediaManifest = {
  assets: MediaAsset[];
  pages: PageMedia[];
};
```

`hero`, `gallery`, and `trailer` are the complete V1 placement vocabulary and contain only asset IDs. V1 does not provide a generic placement array, arbitrary slot name, mobile/desktop hero variant, or image-dimension/crop metadata. `pageId` is a foreign-key-like reference for presentation and never creates a route.

`alt` is always explicit. `alt: ""` represents a deliberately decorative image; non-empty alt is required for informative images and video titles. Automated validation rejects filename-like/generic non-empty alternatives, while human QA decides whether decorative treatment is honest.

## Storage

- Manifest: `src/data/media/media.json`.
- Local files: `public/media/` and referenced as `/media/<file>`.
- The generic Starter ships an empty manifest and a README, not fake screenshots.
- The manifest is not a publication ledger, content database, or homepage layout definition.

## Local image and YouTube strategy

### Local images

- `src` must be a root-relative `/media/...` path without `..`.
- Validation maps it to `public/media/...` and requires the file to exist.
- `sourceUrl` records where the local asset originally came from; local storage does not remove the provenance requirement.
- Components use responsive intrinsic flow (`max-width: 100%; height: auto`) and explicit lazy/eager behavior based on placement.
- Image quality, dimensions, cropping, and legal use remain human QA.

### Remote images

Starter 2.0 Media V1 does not support arbitrary or “approved” remote HTTPS image `src` values. The schema rejects them. This prevents hotlinking, removes external availability and privacy/performance uncertainty, and keeps image builds deterministic. Local images plus YouTube cover the current 80% use case; remote image delivery can be reconsidered only after a real project proves the need.

### YouTube

- A video asset stores the canonical 11-character YouTube video ID in `src`; `sourceUrl` stores the traceable watch/source URL.
- VideoEmbed constructs only `https://www.youtube-nocookie.com/embed/<id>`.
- The iframe has a non-empty accessible title, `loading="lazy"`, a responsive aspect-ratio wrapper, constrained permissions, and fullscreen support.
- No arbitrary iframe URL, video upload, schema automation, or third-party script SDK is supported.

## Provenance

Every asset requires an HTTPS `sourceUrl`. The manifest records source identity; the SOP's `RESEARCH_SOURCES.md` remains the human record for usage/rights notes and approval. The Starter does not claim that a valid URL grants reuse rights.

## Deterministic validation

- unique asset IDs and unique page mappings;
- referenced Page ID exists in Runtime Page Inventory;
- referenced asset ID exists;
- hero/gallery references are image assets and trailer references are video assets;
- every image path is a safe `/media/...` local path and the file exists under `public/media/`;
- remote image `src` values are rejected, while every asset's provenance `sourceUrl` must use HTTPS;
- video ID matches the YouTube ID format;
- every rendered image declares `alt` and every iframe has a title;
- empty media arrays create no markup;
- build HTML keeps the responsive media wrapper contract.

No build-time network request is used. Image delivery is local and deterministic; YouTube availability, privacy policy, and rights remain runtime/human concerns rather than build-time probes.

## Fallback

All media props/placements are optional. WikiArticle, EntityDetail, and Homepage render a complete text/fact layout when no asset is mapped. A missing referenced asset is not a fallback case: it is a deterministic validation failure.

## Why not a CMS or Media Engine

The required 80% use case is lookup plus rendering of a modest curated local asset set and official YouTube embeds. A DAM, upload service, CDN abstraction, remote hotlink layer, auto-fetcher, image-selection model, or copyright engine would add infrastructure without changing publication correctness. The manifest is replaceable later if real volume proves it insufficient.

# 10. Homepage Wiki Portal Design

`src/pages/index.astro` remains the fixed composition owner. `home-model.ts` derives arrays from existing SSOTs; components render them. Config does not gain section blocks, per-card routes, or layout order.

| Section | Data source | Conditional rule |
|---|---|---|
| Game Hero | Home Inventory row + brand config + first featured page + optional home hero media | Always render text; render CTA/media only when resolved. |
| Quick Facts | A simple `{label,value}` array mapped from a real project's validated Fact Layer | Hide when no applicable facts exist. Starter 2.0 does not invent a generic game-fact database solely to fill this section. |
| Start Here | Existing `homepage.featuredPageIds`, resolved through enabled catalog | Hide when empty after validation; configured invalid IDs fail rather than disappear. |
| Browse by Category | Enabled, public, published Hub/database roots from Page Inventory, grouped by existing module | Hide when no category root exists. |
| Featured Guides | Existing featured IDs filtered to guide pages | Hide when none. |
| Important / Popular Systems | Enabled Hub/database pages not already used as categories/featured, ordered by existing Inventory priority | Label as “Important Systems”; do not claim popularity without real evidence. |
| Latest Updates | Enabled `pageType: patch` pages sorted by `updatedAt` descending | Hide when News is disabled or no patch page is published. |
| Screenshot / Trailer | Home page mapping from Media Layer | Hide each absent media kind and omit the whole section if empty. |
| FAQ / Common Questions | Explicit, visible authored homepage content supplied by a real project | Hide when absent; never synthesize questions. |
| Browse All | Existing `homepageBrowsePages`, excluding legal/error/home and de-duplicating earlier collections | Hide only if no eligible page exists. |

The current developer-facing “Published nodes”, “Active systems”, “Source policy”, “Operating doctrine”, and Starter CTA are removed from the default player homepage. Operational philosophy remains in README/About, not the home portal.

No second Homepage CMS is created: section order is code, page identity/state is Inventory, featured order is current Config, facts are Fact Layer, articles are Content, and visuals are Media Layer.

# 11. Visual Variant Design

## Theme relationship

`theme.css` remains the only location for game-specific color values. Add fallback role tokens:

```css
--color-guides: var(--color-accent);
--color-heroes: var(--color-accent);
--color-weapons: var(--color-accent);
--color-items: var(--color-accent);
--color-maps: var(--color-accent);
--color-updates: var(--color-accent);
--color-meta: var(--color-accent);
--color-tools: var(--color-accent);
```

The family key comes **only** from the controlled Runtime Page Inventory `module` value validated by `pageModuleSchema`. `BaseLayout` exposes that exact value as a data attribute; components cannot supply or invent another family key. `page-families.css` uses this explicit mapping:

| Runtime Page Inventory `module` | Family token | Local result |
|---|---|---|
| `core` | none | `--page-accent: var(--color-accent)` |
| `guides` | `--color-guides` | `--page-accent: var(--color-guides, var(--color-accent))` |
| `heroes` | `--color-heroes` | `--page-accent: var(--color-heroes, var(--color-accent))` |
| `weapons` | `--color-weapons` | `--page-accent: var(--color-weapons, var(--color-accent))` |
| `items` | `--color-items` | `--page-accent: var(--color-items, var(--color-accent))` |
| `maps` | `--color-maps` | `--page-accent: var(--color-maps, var(--color-accent))` |
| `tierLists` | `--color-meta` | `--page-accent: var(--color-meta, var(--color-accent))` |
| `news` | `--color-updates` | `--page-accent: var(--color-updates, var(--color-accent))` |
| `search` | none | `--page-accent: var(--color-accent)` |
| `tools` | `--color-tools` | `--page-accent: var(--color-tools, var(--color-accent))` |

Example selector:

```css
[data-page-family="guides"] { --page-accent: var(--color-guides, var(--color-accent)); }
```

Components use only `var(--page-accent, var(--color-accent))` for family variation.

Keys such as `beginner-guides`, `early-game`, `hero-detail`, route slugs, clusters, tags, or component-local labels are not page families and must never become `data-page-family` values or token selectors. If a future implementation formally adds a new Page Inventory module, the same reviewed change must extend `pageModuleSchema`, define its token/fallback decision, add its selector, and update the mapping tests. If an existing or future supported module has no dedicated token, it uses `--page-accent: var(--color-accent)`.

## Allowed visual hooks

- eyebrow and active-navigation accent;
- top border or rule;
- small badge/icon treatment;
- card accent and restrained gradient detail;
- subtle section background mixture;
- media-frame highlight.

Typography, spacing, surfaces, contrast, interaction, and overall game identity stay shared. No component chooses a raw family color.

## Guard against uncontrolled colors

- `tests/theme.test.ts` requires every family token and fallback.
- The test scans `page-families.css` for raw hex/RGB/HSL values and fails if found.
- The test derives allowed family keys from `pageModuleSchema` and rejects selectors/data attributes for arbitrary cluster, page-type, tag, or route-derived keys.
- New family styling must consume `--page-accent`; a formally added Inventory module requires one reviewed mapping/token/fallback decision and one selector, not component-by-component colors.
- Remove the hard-coded theme-color meta instead of introducing a separate runtime theme config.

# 12. Data Flow

```text
                         ┌─────────────────────────────┐
game.config.ts ─────────→│ Zod Config                  │
 groups/order/features   │ normalized navigation      │
                         └──────────────┬──────────────┘
                                        │
page-inventory.json ─→ Inventory schema │
 publication/routes/state ──────────────┼──→ Enabled Page Catalog
                                        │         │
                                        │         ├→ Route generation
                                        │         ├→ Sitemap/Search/Related
                                        │         ├→ site-data navigation resolver
                                        │         │      └→ resolvedNavigationGroups
                                        │         └→ Homepage model
                                        │
facts/*.json ─────────→ Fact schemas ───┼──────────────→ QuickFacts / Entity UI
content/*.mdx ────────→ Content schema ─┼──────────────→ WikiArticle body / FAQ (Phase D)
media/media.json ─────→ Media schema ───┼──────────────→ Media catalog/components
                                                  │
                                                  ▼
                                      Astro pages/components
                                                  │
                                                  ▼
                                           Static Build Output
                                                  │
                  ┌───────────────────────────────┼──────────────────────────┐
                  ▼                               ▼                          ▼
         Inventory/output exact          HTML/SEO/link audit       Nav/media markup audit
            reconciliation
```

Authority by question:

| Question | Authority |
|---|---|
| Does the page exist and may it ship? | Runtime Page Inventory + feature config |
| What is its route/title/state? | Runtime Page Inventory |
| Where is it grouped in navigation? | Config Page-ID grouping/order |
| What narrative does it contain? | MDX Content |
| What patch-sensitive values does it state? | Fact Layer |
| Which visual is shown and where? | Media manifest + fixed component slots |
| How is it rendered? | Presentation components + theme tokens |
| Did planned coverage match implementation? | SOP artifacts + human review |
| Did Config/Inventory/output reconcile? | Starter validators and build audit |

# 13. Test Strategy

## Automated tests

### Navigation validation

- Unit-test grouped and legacy config inputs.
- Call the single `src/core/site-data.ts` resolver to validate all parent/child IDs against the enabled catalog; `site-validation.ts` must not implement a second resolver.
- Validate navigation-tree-scoped uniqueness, ordering, parent/child type, exact resolved routes, and `children: []` normalization. Explicitly prove that the same Page ID may still appear in Footer, Homepage, Related Pages, Sitemap, Search, or article links.
- Audit generated Header data markers against `resolvedNavigationGroups`, not raw Config IDs.

### Private/draft leak prevention

- Create fixtures for private, unlisted, draft, scheduled, archived, and feature-disabled pages.
- Assert every such configured nav reference fails validation.
- Retain existing catalog, sitemap, related-link, Pagefind, and output tests.
- Assert public/noindex Search can remain an intentional nav target.

### Media validation

- Accept local `/media/...` image and YouTube ID fixtures.
- Reject duplicate IDs, unknown pages/assets, unsafe paths, remote/HTTP(S) image `src`, missing local files, non-HTTPS provenance sources, type/placement mismatch, missing/non-meaningful alt/title, malformed video IDs, unknown placement keys, and any placement beyond `hero`/`gallery`/`trailer`.
- Inject a local-file existence callback in unit tests; the production validation script supplies `existsSync` against `public/`.
- Validate rendered `<img alt>` and titled responsive iframe contracts.

### WikiArticle rendering

- Verify Breadcrumb, H1, description, Last Updated, Last Verified, Main Content, Sources, and Related Pages.
- In Phase A, verify optional TOC and QuickFacts render only with data; Phase B adds hero/gallery/trailer cases and Phase D adds FAQ cases.
- Feed a content-renderer fixture containing body H1/H2/H3/H4 headings and assert the TOC contains only body H2/H3 entries in document order with their existing slugs.
- Render Sources, FAQ, Related Pages, and other component-owned UI headings separately; assert none enter the TOC input or output. TOC construction consumes only the content render result and has no DOM/HTML heading crawler, title blacklist, or component-heading append step.
- Verify the public templates do not render Priority, Signal, internal Confidence, tags, Editorial Brief, Evidence Ledger, or Provenance Ledger.
- Verify meta/news still route through EditorialArticle and guides route through WikiArticle.

### Homepage conditional rendering

- Pure home-model tests cover categories, featured guide ordering, systems, latest-update sorting, de-duplication, and hidden empty sections.
- Build markup checks assert the Starter operational dashboard copy is absent.
- Media-less and media-rich fixtures both produce a complete homepage model.

### Page-family styles

- Require token fallback declarations and PageLayout family attributes.
- Reject raw family colors outside `theme.css`.
- Derive the allowed family-key fixture from `pageModuleSchema`; verify selectors map only controlled Inventory modules and reject arbitrary keys such as `beginner-guides`, `early-game`, and `hero-detail`.
- Assert mapping completeness against `pageModuleSchema`: every controlled module has an explicit dedicated-token or `--color-accent` fallback decision. Adding a module without the synchronized mapping, selector, and test fixture must fail.

### Build reconciliation

Retain the exact current chain:

```text
npm run validate
npm run check
npm run build
```

`npm run build` must still validate, generate Astro output, reconcile exact Inventory routes, build Pagefind, and run the final audit. New media and nav checks plug into the existing scripts, so package scripts and CI topology do not change.

## Responsive/manual QA

Inspect representative Homepage, Guide, Hub, Entity, Patch/Meta, Search, and media-rich pages at:

- 390 × 844 mobile;
- 768 × 1024 tablet;
- 1440 × 1000 desktop.

Check menu expansion, direct Hub access, keyboard focus/order, no overflow, readable TOC/prose, horizontal tables, image scaling, gallery stacking, 16:9 video behavior, captions, reduced motion, no unexpected console errors, and graceful no-media layout. Human review also owns visual quality, game fit, factual use, rights, and approved Site Structure reconciliation.

# 14. Migration Strategy

## Starter 1.0 → 2.0

1. Record the exact 1.0 commit, SOP version, and Master Prompt version before changing files.
2. Add navigation schema tests first. Accept legacy `primaryPageIds` and normalize it to childless groups so existing copied configs still parse.
3. Migrate the Starter's own `game.config.ts` to `groups`; reject configs that author both forms. No Page Inventory row changes are required.
4. Add navigation presentation and validation. Verify current routes, sitemap, Pagefind pages, and feature filtering remain identical.
5. Add WikiArticle and player-facing primitives. Migrate guides only; keep meta/news on a cleaned EditorialArticle and entities on a cleaned EntityDetail.
6. Add an empty media manifest and components. Existing content renders with no media and no empty shells.
7. Add page-family token fallbacks. With no game-specific overrides, screenshots should retain the current visual identity.
8. Replace homepage composition while continuing to consume existing featured IDs and enabled catalog; in Phase D, add the optional authored FAQ component/schema integration.
9. Update docs and execute the complete baseline/variant matrix before declaring Starter 2.0 ready.

## Compatibility guarantees

- Existing Inventory IDs, rows, routes, publication rules, related links, and indexability do not migrate.
- Existing `pageId`-only MDX remains valid; Phase D FAQ fields are optional and absent from Phase A.
- Existing facts/tools and entity module registry remain valid.
- Feature flags keep the same names and filtering semantics.
- Canonical, robots, sitemap, JSON-LD, Pagefind, and exact route output behavior stay intact.
- Existing theme values remain valid because every family token falls back to `--color-accent`.
- Existing pages without media remain complete.
- No dependency or lockfile change is required.

The legacy flat navigation input is a compatibility adapter, not a second runtime authority: schema output is canonical grouped navigation, and new documentation uses only groups.

# 15. Implementation Phases

No phase begins without explicit human approval. Each phase stops immediately after its acceptance evidence is recorded.

## Phase A — Player-facing Foundation

### Files

- Modify `game.config.ts`, `src/config/schema.ts`, `src/core/site-data.ts`, `src/core/site-validation.ts`, `src/components/Header.astro`, `src/components/EditorialArticle.astro`, `src/components/EntityDetail.astro`, `src/pages/guides/[...slug].astro`, and targeted `global.css` rules.
- Add DesktopNav, MobileNav, WikiArticle, QuickFacts, Sources, RelatedPages, and navigation/wiki/player-metadata tests.
- Do not add `FAQ.astro` or modify `src/content.config.ts` in Phase A; both belong to Phase D.

### Objective

Make important player tasks discoverable and make guides/entities/editorial pages read like player content rather than research reports.

### Acceptance criteria

- Grouped desktop navigation and expandable mobile navigation work.
- `src/core/site-data.ts` is the sole Navigation Page ID → Enabled Page resolver and exports `resolvedNavigationGroups`; Header/DesktopNav/MobileNav consume only that resolved structure.
- Parent Hubs and children are reachable and validated by Page ID, authored `children: []` creates no empty dropdown, and uniqueness applies only within `navigation.groups`.
- Guides use WikiArticle.
- WikiArticle TOC contains only rendered-body H2/H3 headings and uses no DOM heading crawler.
- Meta/news retain EditorialArticle with player-safe public metadata.
- EntityDetail and Guide Hub hide internal research fields.
- No route, feature, Inventory, sitemap, SEO, or search behavior regresses.

### Tests

- Config/navigation/site-data/site-validation unit tests.
- WikiArticle TOC boundary, optional QuickFacts, Sources/RelatedPages, and player-metadata tests.
- `npm run validate`, `npm run check`, and `npm run build` under `.nvmrc` with locked dependencies.
- 390/768/1440 keyboard/navigation/article smoke test.

### Risks

- Group labels may be too long when falling back to SEO titles.
- CSS-only dropdown focus behavior can regress at intermediate widths.
- Extracting guide article markup can accidentally alter Pagefind or JSON-LD annotations.

### Stop condition

Stop after Phase A evidence is documented and request human approval. Do not start Media work automatically.

## Phase B — Media Foundation

### Files

- Add media schema/manifest/catalog, GameMedia/VideoEmbed/ScreenshotGallery, `public/media/README.md`, and `tests/media.test.ts`.
- Modify `scripts/validate-site.ts`, `scripts/audit-build.ts`, WikiArticle, EntityDetail, and targeted CSS.

### Objective

Support curated local images under `public/media/` and YouTube embeds with provenance, deterministic validation, responsive rendering, and no-media fallback.

### Acceptance criteria

- Valid fixtures render; malformed/missing references fail early.
- Local image assets must exist; remote image `src` values are rejected.
- YouTube embeds are allowlisted, lazy, titled, and responsive.
- Page placements are limited to `hero`, `gallery`, and `trailer`; no generic slot DSL, responsive asset variants, or dimension/crop fields exist.
- Empty manifest leaves all pages complete and emits no empty media section.
- Page Inventory remains unchanged.

### Tests

- Media schema/catalog/path/reference fixtures.
- Generated HTML image/iframe accessibility checks.
- Media-rich and empty-manifest builds.
- 390/768/1440 image/gallery/video inspection.

### Risks

- YouTube can be unavailable or blocked outside build control and introduces a runtime third-party privacy/performance consideration.
- Operators may mistake valid provenance fields for legal approval.
- Large local assets can hurt performance even when paths are valid.

### Stop condition

Stop when deterministic media checks and both rich/empty layouts pass; rights and visual-quality review must remain explicitly manual.

## Phase C — Visual Richness

### Files

- Modify `src/styles/theme.css`, `src/layouts/BaseLayout.astro`, `src/styles/global.css`, and `tests/theme.test.ts`.
- Add `src/styles/page-families.css`.

### Objective

Provide restrained page-family identity inside one game-wide visual system.

### Acceptance criteria

- Every `pageModuleSchema` value has an explicit dedicated-token or `--color-accent` fallback mapping and selector; a newly added module without the synchronized mapping fails tests.
- BaseLayout exposes the page module; components consume one `--page-accent`.
- No family raw color exists outside `theme.css`.
- No override produces the current appearance; one-family override affects only permitted hooks.

### Tests

- Token/fallback/source scans.
- Build with default tokens and one test override.
- Contrast and visual review across Homepage, Guide, Hub, Entity, Update, and Tool surfaces.

### Risks

- Too many accents can create a rainbow site.
- Global selectors can unintentionally override islands or legal pages.
- Removing the hard-coded browser theme color can change browser chrome appearance, but avoids a stale duplicate palette.

### Stop condition

Stop when fallback and scoped-override evidence passes. Do not redesign the entire 2,113-line stylesheet.

## Phase D — Wiki Portal Homepage / Content Richness

### Files

- Add `src/components/home/home-model.ts`, `GameHero.astro`, `WikiCategories.astro`, `PageCollection.astro`, `src/components/wiki/FAQ.astro`, and `tests/homepage.test.ts`.
- Modify `src/pages/index.astro`, `src/content.config.ts`, WikiArticle's optional post-content FAQ integration, `tests/wiki-article.test.ts`, and only the homepage/content-richness CSS they use.

### Objective

Turn the default real-project homepage into a player-facing Wiki portal derived from existing data boundaries, and add optional authored FAQ content only after the core article/navigation foundation is stable.

### Acceptance criteria

- Hero answers what the Wiki covers and offers a real Start Here action.
- Categories, Featured, Systems, Updates, Media, FAQ, and Browse All appear only with data.
- FAQ is optional visible authored content, is absent from Phase A, and adds no automatic FAQ structured data.
- No operational dashboard/doctrine copy remains in the public home experience.
- Cards use only enabled Inventory pages and do not duplicate page state.
- Empty optional datasets do not leave headings, gaps, or placeholder cards.

### Tests

- Pure home-model fixture matrix.
- Optional FAQ schema/component/WikiArticle tests, including visible-content parity and empty fallback.
- Source/build regression for removed Starter-demo copy.
- Empty, minimal, 20+ page, media-rich, and updates-enabled fixtures.
- 390/768/1440 portal review.

### Risks

- The homepage model can become a second CMS if section definitions become config data.
- Priority ordering may be mistaken for “popular”; UI must use “Important” without analytics evidence.
- Repeating a page across sections can create noise; model-level de-duplication is required.

### Stop condition

Stop when the fixed portal composition passes every conditional fixture and human Wiki-portal review.

## Phase E — QA, Documentation, and Adoption

### Files

- Modify `README.md`, `docs/CONTENT_AND_DATA_GUIDE.md`, `docs/QA_CHECKLIST.md`, and affected existing tests.
- Add `docs/STARTER_2.0_MIGRATION.md`.

### Objective

Make Starter 2.0 adoptable, auditable, and reconcilable without encoding SOP planning artifacts.

### Acceptance criteria

- Docs name SOP 2.2 and explain version provenance.
- Migration covers flat nav, media, article variants, homepage data, tokens, and fallback.
- QA separates automated checks from Site Structure/media-rights/visual human review.
- Full check/build/preview/browser matrix passes with the pinned toolchain.
- Git diff contains no dependency, lockfile, Stable Core scope, or unrelated refactor drift.

### Tests

- Full existing and new suite.
- Exact output reconciliation and generated HTML audit.
- Feature-off matrix for Guides, Search, entities, News, tools, and media absence.
- Manual responsive/accessibility/browser checklist.

### Risks

- Documentation can describe a schema that differs from implementation.
- A single happy-path fixture can hide disabled/private/empty-data regressions.
- A successful build can be mistaken for SOP coverage or media-rights approval.

### Stop condition

Stop after an evidence-backed Starter 2.0 release audit. Deployment remains separately authorized and is not implied by release readiness.

# 16. Risks

| Risk | Likelihood / impact | Mitigation |
|---|---|---|
| Schema complexity | Medium / Medium | One navigation level, one legacy union transform, strict mutual exclusion, no recursive nodes. |
| Navigation duplication | Medium / High | Config stores only group/order/optional parent label; Inventory supplies title/route/state; Page IDs are unique only inside the `navigation.groups` tree; build markup audit consumes `resolvedNavigationGroups`. Reuse in Footer/Homepage/Related/internal links/Sitemap/Search remains valid. |
| Media coupling | Medium / High | Media maps by Page ID downstream; it never creates pages, imports route logic, or enters Inventory. |
| Theme overengineering | Medium / Medium | One family token layer and one `--page-accent`; no runtime engine, palettes, or component raw colors. |
| Homepage becomes CMS-like | Medium / High | Fixed section order in `index.astro`; derive from existing SSOTs; no configurable block array. |
| Generic Starter becomes game-specific | Medium / High | Ship empty media and generic components/tokens; all real game choices remain config/data/content/theme adaptation. |
| Mobile navigation complexity | Medium / Medium | One submenu depth, semantic lists/native details, no React island, explicit keyboard/viewport matrix. |
| Backward compatibility | Medium / High | Normalize legacy flat navigation, keep Inventory/content/fact/feature/route contracts, test default no-media behavior. |
| Internal metadata reappears | Medium / Medium | Central player primitives plus source/build regression tests for known internal labels. |
| YouTube reliability/privacy | Medium / Medium | Only `youtube-nocookie` embeds, lazy loading, no SDK/probe, visible context/fallback link, and human privacy/legal review. Remote images are unsupported in V1. |
| False confidence in automated media QA | High / High | Docs state that validity cannot judge aesthetics, contextual accuracy, licensing, or rights. |
| Stable Core drift | Low / High | Limit Core changes to two reviewed files and assert catalog/output/SEO/feature behavior remains identical. |
| CSS regression in large global file | Medium / Medium | Add family rules in a focused stylesheet, make targeted global edits, and inspect representative existing pages/islands. |
| Test environment mismatch | Current / Medium | Use `.nvmrc` Node `22.22.0` and locked `npm ci` only after implementation is authorized; do not claim current tests passed in this copy. |

# 17. Explicit Non-Goals

Starter 2.0 does not add or design:

- CMS or homepage CMS;
- Supabase, Prisma, database, repository/DAO layer, or database reservation layer;
- DAM, media upload backend, CDN abstraction, Media Engine, media crawler, or automatic image selection;
- arbitrary/approved remote image `src` support in Media V1;
- generic media placement DSLs or arbitrary placement names beyond `hero`, `gallery`, and `trailer`;
- media dimension/crop metadata such as `width`, `height`, `mobileCrop`, `desktopCrop`, or mobile/desktop hero variants;
- automatic copyright/rights judgment;
- automatic competitor scraping or content decisions;
- Theme Engine, runtime theme editor, or arbitrary per-page color config;
- layout DSL, universal page builder, configurable block engine, or generic MDX block engine;
- recursive mega-menu framework or unlimited navigation depth;
- universal plugin system or dynamic module discovery;
- Fact Layer `displayLabel` fields for presentation; QuickFacts labels are mapped by presentation code into `{ label, value }`;
- automatic FAQ generation or fake FAQ content;
- first-pass FAQ or VideoObject structured data;
- media download/proxy/network availability checks;
- image optimization pipeline or new image dependency in this phase;
- parsing `docs/SITE_STRUCTURE.md` or other planning Markdown;
- a second `ARCHITECTURE_DECISIONS.md` or ADR SSOT; this proposal remains the architecture decision authority for Starter 2.0;
- deciding whether a real game needs Tier Lists, Heroes, Skill Trees, Worlds, Codes, Tools, or any other family;
- changing Page Inventory into a whole-page CMS;
- changing route generation, SEO Core, feature names, search architecture, Fact architecture, Entity Registry, patch workflow, deployment workflow, Astro/Tailwind/React boundaries, or static-first delivery;
- commit, push, deploy, or any external write as part of this proposal.

# 18. Recommended First Implementation Phase

Recommend **Phase A — Player-facing Foundation only** after human approval.

Phase A has the best leverage and the cleanest independent smoke test. Its complete scope is: Grouped Navigation, Desktop Navigation, Mobile Navigation, WikiArticle, player-facing metadata cleanup, Sources, Related Pages, QuickFacts, EditorialArticle cleanup, EntityDetail cleanup, and Guide Hub cleanup. It fixes the visible research-report UX before Media/Homepage depend on the new foundation and proves the only two proposed Stable Core edits under the existing reconciliation suite.

Do not include FAQ, `src/content.config.ts` FAQ schema changes, Media, family colors, or homepage replacement in the first implementation approval. Stop when the exact Phase A scope above, TOC boundary tests, leak-prevention tests, and the full current build reconciliation pass. Present that evidence for review before Phase B.
