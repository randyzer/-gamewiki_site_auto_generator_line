# GAME_SITE_STARTER v2.5.0 Change Proposal

Planning-only proposal for upgrading the current `GAME_SITE_STARTER_BASED_gamesop2.2` workspace to `GAME_SITE_STARTER v2.5.0`.

This document is a change proposal only. It does not authorize implementation, dependency changes, commits, tags, pushes, or deployment.

## Evidence Read

### Current Starter

- Workspace: `GAME_SITE_STARTER_BASED_gamesop2.2`
- Repository: `git@github.com:randyzer/GAME_SITE_STARTER_BASED_gamesop2.2.git`
- Current branch: `main`
- Current commit: `afc23d9b842c93b63fd33613f3e8b3b732720828`
- Exact tag at current commit: none
- Available Starter release tag: `starter-v2.0.0`
- `starter-v2.0.0` commit: `e4964e1f640763f2c55db9f48446ac0dbe87afa3`
- `package.json` version: `0.1.0`
- README identity: `Game Wiki Starter 2.0`
- Current architecture authority: `docs/STARTER_2.0_ARCHITECTURE_PROPOSAL.md`
- Current SOP reference in docs: `GAME_SOP_2.2`

Current repository inspection covered source, config, data schemas, scripts, tests, docs, layout/components, media validation, homepage implementation, route implementations, theme defaults, and package/runtime scripts.

### Frozen GAME_SOP v2.5

- Local repository read: `/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SOP_V2.5`
- Remote: `git@github.com:randyzer/GAME_SOP_2.5.git`
- Frozen tag: `GAME_SOP_v2.5`
- Frozen commit: `abd59d08e312708e2327e4532f08b9ad49f39858`
- Status: clean at frozen commit

SOP v2.5 was treated as read-only. Starter-relevant gates mapped here include Visual Identity Gate, First-Viewport Game Recognition Gate, Route-Level Media Decision Table, Media Availability / Resolution Gate, Human Visual Review, Template Residue Audit, Visual Rhythm Gate, Whole-Page Visual Consistency Gate, and Media Performance / Delivery Check.

### Bomb Farm Evidence

- Local evidence repository read: `/Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2`
- Evidence commit: `124dc994be6c313929c35e25d92f12c98f19d52e`
- Commit purpose: Bomb Farm V2.1 final footer visual polish
- Use: real-project evidence only
- Explicit exclusion: no Bomb Farm branding, palette, typography, slogans, achievement icons, diagram style, Steam CTA treatment, or project-specific layout should be copied into Starter.

## Current Starter Architecture Inventory

### Runtime and Package Baseline

- Runtime pin: `.nvmrc` is `22.22.0`
- Engine constraint: Node `>=22.19.0 <23 || >=24.0.0`
- Current local shell observed during planning: Node `v22.16.0`, below `.nvmrc`
- Package manager artifacts: `package-lock.json`
- Core runtime dependencies:
  - `astro 7.2.10`
  - `@astrojs/mdx 8.0.0`
  - `@astrojs/react 6.0.5`
  - `@astrojs/sitemap 3.7.4`
  - `react 19.2.8`
  - `react-dom 19.2.8`
  - `zod 4.5.4`
- Test/build dependencies include `vitest`, `tsx`, `typescript`, `pagefind`, `wrangler`, and `@astrojs/check`.

### Repository-Native Commands

- Development: `npm run dev`
- Validation: `npm run validate`
- Type/test check: `npm run check`
- Build/audit: `npm run build`
- Unit tests: `npm run test`
- Patch impact: `npm run patch:impact`
- Preview: `npm run preview`
- Deploy dry run: `npm run deploy:dry-run`

Future v2.5 implementation should use these exact scripts and should first install/run with the pinned Node version from `.nvmrc`.

### Source Tree and Publication Authority

Observed core files and areas:

- Page Inventory: `src/data/page-inventory.json`
- Site config and feature flags: `game.config.ts`
- Config schema: `src/config/schema.ts`
- Publication/navigation resolver: `src/core/site-data.ts`
- Site validation: `src/core/site-validation.ts`
- Media manifest: `src/data/media/media.json`
- Media schemas: `src/data/schemas/media.ts`
- Media catalog: `src/data/media/catalog.ts`
- Media components: `src/components/media/GameMedia.astro`, `src/components/media/VideoEmbed.astro`, `src/components/media/ScreenshotGallery.astro`
- Base layout: `src/layouts/BaseLayout.astro`
- Homepage route: `src/pages/index.astro`
- Homepage hero: `src/components/home/GameHero.astro`
- Homepage model/sections: `src/components/home/home-model.ts`, `src/components/home/WikiCategories.astro`, `src/components/home/PageCollection.astro`
- Guide route and guide hub: `src/pages/guides/[...slug].astro`
- Article renderer: `src/components/wiki/WikiArticle.astro`
- Entity routes/renderers: `src/pages/heroes/[id].astro`, `src/pages/weapons/[id].astro`, `src/pages/items/[id].astro`, `src/pages/maps/[id].astro`, `src/components/EntityDetail.astro`, `src/components/EntityDatabase.astro`
- Editorial routes/renderers: `src/pages/news/[slug].astro`, `src/pages/meta/[slug].astro`, `src/components/EditorialArticle.astro`
- Static legal renderer: `src/components/LegalPage.astro`
- Navigation: `src/components/Header.astro`, `src/components/Footer.astro`
- Theme and default styling: `src/styles/theme.css`, `src/styles/global.css`, `src/styles/page-families.css`
- Validation/audit scripts: `scripts/validate-site.ts`, `scripts/audit-build.ts`, `scripts/media-validation.ts`, `scripts/reconcile-output.ts`
- Current tests: `tests/media.test.ts`, `tests/media-rendering.test.ts`, `tests/homepage.test.ts`, `tests/theme.test.ts`, `tests/media-audit.test.ts`, plus navigation, SEO, catalog, validation, and output reconciliation tests.

### Page Inventory Implementation

`src/data/page-inventory.json` currently contains nine rows:

- `home`
- `hub.guides`
- `guide.getting-started`
- `search`
- `about`
- `privacy`
- `terms`
- `not-found`
- disabled sentinel `hero.demo-sentinel`

Page Inventory is the publication single source of truth. It owns page existence, pageId, route, type, module, state, indexability, sitemap inclusion, priority, change frequency, title, description, keywords, and relationships. It does not own media, layout slots, content blocks, or visual design.

### Content, Facts, and Media Separation

Current separation is sound and should be protected:

- Content files and MDX live separately from structured data.
- Facts live under `src/data/facts`.
- Page Inventory controls publication.
- Media manifest lives separately at `src/data/media/media.json`.
- Media catalog reconciles media references against Page Inventory page IDs without moving media fields into Page Inventory.

### Media Architecture

Current Media V1 supports:

- local images under `/media/...`
- image types `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.gif`, `.svg`
- YouTube video IDs through privacy-friendly `youtube-nocookie.com`
- fixed manifest placements: `hero`, `gallery`, `trailer`
- alt text validation
- optional caption and source URL for image assets
- no-op rendering when gallery/media is absent

Current Media V1 does not support:

- local MP4 or WebM video
- local video posters
- video source metadata beyond YouTube ID
- static wiki page media consumers
- hub media consumers

### Navigation Architecture

`src/core/site-data.ts` contains the resolved navigation path:

- `resolveNavigationGroups(...)` normalizes the current grouped navigation and legacy `primaryPageIds`.
- Resolved navigation is derived from enabled Page Inventory rows.
- Unknown or disabled page IDs fail validation.

This should remain one resolved navigation path.

### Homepage Architecture

`src/pages/index.astro` builds a homepage model, resolves the home page from Page Inventory, gets home media from the media manifest, and renders:

- `GameHero`
- `WikiCategories`
- optional `PageCollection` sections for guides, database, tools, and updates

`src/components/home/GameHero.astro` currently accepts optional `heroMedia` but hard-codes production-sounding Starter copy:

```html
Find your route.<br /><em>Play with a plan.</em>
```

The component omits media DOM when `heroMedia` is absent, but CSS still uses a two-column desktop grid.

### Static, Wiki, and Article Render Paths

- Guide articles use `WikiArticle.astro` and already consume media by `pageId`.
- Entity detail pages use `EntityDetail.astro` and already consume media by `pageId`.
- Guide hub rendering is inline in `src/pages/guides/[...slug].astro` and does not consume media.
- Entity hub/database views use `EntityDatabase.astro` and do not consume media.
- Editorial routes use `EditorialArticle.astro` and do not consume media.
- Legal/static pages use `LegalPage.astro` and do not consume media.
- There is no current `StaticWikiPage.astro`.
- There is no current `src/pages/[...path].astro` catch-all static wiki renderer.

### Current Architectural Non-Goals

The current Starter already establishes important non-goals that v2.5 should preserve:

- no CMS
- no database
- no page builder
- no arbitrary layout DSL
- no media placement DSL
- no media fields in Page Inventory
- no generic entity engine rewrite
- no speculative platform abstraction
- no broad route redesign
- no dependency-driven media pipeline

## SOP v2.5 Responsibility Classification

| SOP rule / gate | Classification | Starter v2.5 implication |
|---|---|---|
| Visual Identity Gate | SHARED / SUPPORTING | Starter should avoid strong default identity and provide token-driven neutral defaults. Project owns actual identity. |
| First-Viewport Game Recognition Gate | SHARED / SUPPORTING | Starter should prevent generic slogans and broken no-media layouts. Project owns final game recognition. Master Prompt enforces review. |
| Route-Level Media Decision Table | PROJECT OWNS | Starter should not store the table in Page Inventory or enforce project media quotas. |
| Media Availability / Resolution Gate | PROJECT OWNS with STARTER SUPPORT | Starter should validate referenced media and render fixed placements safely. Project owns decisions and provenance. |
| Human Visual Review | MASTER PROMPT ENFORCES | Starter may provide stable render behavior; it should not add a universal screenshot engine. |
| Template Residue Audit | SHARED / SUPPORTING | Starter should neutralize residue-prone defaults; project and Master Prompt must replace project identity. |
| Visual Rhythm Gate | PROJECT OWNS with STARTER SUPPORT | Starter may offer conservative primitives only when already proven. Broad homepage primitive API is candidate-only. |
| Whole-Page Visual Consistency Gate | PROJECT OWNS with STARTER SUPPORT | Footer/theme defaults should not fight project tokens. Human review remains outside Starter runtime. |
| Media Performance / Delivery Check | SHARED / SUPPORTING | Starter should validate paths, native local video attributes, poster/preload intent; no universal byte cap or CDN pipeline. |
| Rights/provenance | PROJECT OWNS with STARTER SUPPORT | Starter can carry `sourceUrl` and captions; project owns rights decisions. |

## Evidence Classification of Proposed Changes

| Proposed change | Evidence classification | Action | Priority | Confidence |
|---|---|---:|---:|---:|
| ST-01 no-media hero single-column state | PROVEN — REAL PROJECT EVIDENCE | STRENGTHEN | MUST | HIGH |
| ST-02 project-authored homepage heading with brand fallback | PROVEN — REAL PROJECT EVIDENCE | ADD | MUST | HIGH |
| Remove production-ready generic Starter hero slogan | PROVEN — REAL PROJECT EVIDENCE | REMOVE | MUST | HIGH |
| ST-03 static wiki media consumer using existing manifest | PROVEN — REAL PROJECT EVIDENCE | ADD | SHOULD | MEDIUM |
| ST-04 narrow hub hero media support | PROVEN — REAL PROJECT EVIDENCE | ADD | SHOULD | HIGH |
| Generic shared `WikiHub` abstraction | CANDIDATE — NEEDS SECOND PROJECT VALIDATION | DO NOT OVERBUILD | COULD | MEDIUM |
| ST-05 local MP4/WebM video with poster/native controls | PROVEN — REAL PROJECT EVIDENCE | ADD | SHOULD | HIGH |
| Preserve YouTube privacy-friendly embed path | PROVEN — REAL PROJECT EVIDENCE | KEEP | MUST | HIGH |
| ST-06 strengthen media manifest contract without Page Inventory changes | PROVEN — REAL PROJECT EVIDENCE | STRENGTHEN | MUST | HIGH |
| ST-07 neutral Starter visual defaults | PROVEN — REAL PROJECT EVIDENCE | STRENGTHEN | MUST | HIGH |
| ST-08 token-driven footer default | PROVEN — REAL PROJECT EVIDENCE | STRENGTHEN | MUST | HIGH |
| Compact homepage primitive set | CANDIDATE — NEEDS SECOND PROJECT VALIDATION | DO NOT OVERBUILD | COULD | MEDIUM |
| Visual-family schema redesign | CANDIDATE — NEEDS SECOND PROJECT VALIDATION | DO NOT OVERBUILD | COULD | LOW |
| Specialized achievement icon component | BOMB FARM SPECIFIC — DO NOT GENERALIZE | DO NOT CHANGE | COULD | HIGH |
| Generic diagram presentation system | CANDIDATE — NEEDS SECOND PROJECT VALIDATION | DO NOT OVERBUILD | COULD | MEDIUM |
| Universal local video byte threshold | CANDIDATE — NEEDS SECOND PROJECT VALIDATION | DO NOT OVERBUILD | COULD | MEDIUM |
| CMS/database/page builder/layout DSL/media placement DSL | NOT JUSTIFIED — DO NOT ADD | DO NOT CHANGE | MUST | HIGH |

## Required Bomb Farm Findings Evaluation

| Finding | Belongs in v2.5 Starter? | Decision |
|---|---|---|
| A. No-media Hero empty column | Yes | ST-01 MUST. Current Starter CSS proves risk: no media DOM is omitted, but desktop grid still reserves two columns. |
| B. Generic Starter hero slogan reached production | Yes | ST-02 MUST. Current hard-coded slogan exists in `GameHero.astro`; remove production-ready generic copy. |
| C. Static wiki media support weaker than article media support | Yes, narrowly | ST-03 SHOULD. Add a constrained static wiki media consumer if static wiki routes are included in v2.5. |
| D. Hub media support too weak | Yes, narrowly | ST-04 SHOULD. Add one fixed visual anchor from existing manifest for hub pages. |
| E. Local trailer support was missing | Yes | ST-05 SHOULD. Add local MP4/WebM support without adding hosting/transcoding abstraction. |
| F. Existing media manifest architecture was sound | Yes | ST-06 MUST. Keep manifest separate and strengthen, not replace. |
| G. Strong Starter visual residue survived into production | Yes | ST-07 MUST. Neutralize strong defaults and residue-prone copy. |
| H. Footer default visually disconnected from project theme | Yes | ST-08 MUST. Derive footer from shared tokens. |
| I. Repeated tall card patterns reduced homepage rhythm | Candidate only | ST-09 CANDIDATE. Do not create a generic primitive system from one project. |
| J. First-screen density/H1 composition needed manual polish | Partly | Starter should avoid broken fallback and generic slogan; project owns final H1 composition. |
| K. Page-family visual coupling issue appeared once | Candidate only | ST-10 CANDIDATE. Preserve current page-family mechanism; add tests only if needed. |
| L. Achievement icon presentation was project-specific | No | BOMB FARM SPECIFIC — DO NOT GENERALIZE. |
| M. Original diagrams were useful but stylistically project-specific | No generic system | Keep media support/provenance; no diagram component system. |
| N. Large local video size required warning, not universal threshold | Partly | Add warning guidance/audit hook if cheap; do not hard-code universal cap. |

## ST-01 No-Media Hero Behavior

### Current audit

- Component: `src/components/home/GameHero.astro`
- CSS: `src/styles/global.css`
- Current render: media DOM is conditional and absent when `heroMedia` is undefined.
- Current desktop layout: `.game-hero` always uses `grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr)`.
- Current mobile layout: media query at `max-width: 900px` collapses to one column.

### Problem

When no hero media exists, desktop can render an intentional-looking text block in only the left grid column while the right column remains visually empty. This is not an empty DOM bug; it is a reserved-layout bug.

### Smallest safe fix

- Add a media-state class in `GameHero.astro`, for example `game-hero--has-media` only when `heroMedia` exists.
- Update `global.css` so:
  - media present: current split layout remains
  - media absent: one-column desktop layout with balanced max width
- No schema change required.
- No Page Inventory change required.

### Compatibility

- Non-breaking.
- Existing projects with hero media keep split layout.
- Existing projects with empty media manifest get improved desktop layout.
- Mobile behavior should remain one-column and should preserve action ordering.

### Required tests

- `GameHero` with media renders split-state class and media.
- `GameHero` without media omits media wrapper and uses no-media layout state.
- CSS test updates should assert separate media/no-media desktop rules and mobile one-column behavior.

## ST-02 Project-Authored Hero Identity

### Current audit

- Component: `src/components/home/GameHero.astro`
- Config schema: `src/config/schema.ts`
- Config instance: `game.config.ts`
- Current homepage config: `homepage.featuredPageIds` only.
- Current fallback copy: hard-coded generic slogan in `GameHero.astro`.

### Problem

The phrase `Find your route. Play with a plan.` is polished enough to ship in production and was observed surviving into Bomb Farm production. Starter should not provide production-ready generic identity copy.

### Smallest safe contract

- Add optional `homepage.displayHeading` to `src/config/schema.ts`.
- `GameHero.astro` should render:
  - `homepage.displayHeading` when provided and valid
  - otherwise a literal brand/game name fallback from `brand.name`
- Reject blank or whitespace-only display heading in config validation.
- Keep `brand.tagline` as supporting copy, not the H1 source unless explicitly authored.
- Remove the hard-coded generic slogan.
- Do not add a large branding system.

### Compatibility

- Non-breaking if field is optional.
- Old configs remain valid.
- Old projects build.
- Visual output changes intentionally for projects that relied on hard-coded Starter slogan.

### Required tests

- custom heading renders
- fallback heading renders brand/game name
- blank heading fails validation
- generic Starter slogan no longer appears in homepage render

## ST-03 Static Wiki Media Support

### Current audit

- Article media: `src/components/wiki/WikiArticle.astro` consumes `mediaCatalog.getPageMedia(page.pageId)`.
- Entity detail media: `src/components/EntityDetail.astro` consumes manifest media.
- Static/legal page media: `src/components/LegalPage.astro` does not consume manifest media.
- There is no current general `StaticWikiPage.astro`.
- There is no current catch-all static wiki route.

### Problem

The reusable article/entity path has stronger media support than static wiki-style pages. Bomb Farm needed static pages with the same fixed media treatment without changing Page Inventory or adding a layout DSL.

### Smallest safe extension

If v2.5 includes static wiki pages beyond current legal pages:

- Add a constrained static wiki renderer, proposed new file: `src/components/StaticWikiPage.astro`.
- Add a constrained static route builder only if needed, proposed new file: `src/core/static-routes.ts`.
- Add a catch-all static route only if it can safely exclude existing concrete routes, proposed new file: `src/pages/[...path].astro`.
- Reuse:
  - `src/data/media/catalog.ts`
  - `src/components/media/GameMedia.astro`
  - `src/components/media/ScreenshotGallery.astro`
  - `src/components/media/VideoEmbed.astro`
- Resolve media only by `pageId` or route-derived Page Inventory row.
- Support fixed placements only: hero, gallery, trailer.
- Empty media remains a no-op.

### Explicit exclusions

- No arbitrary media slots.
- No per-block media DSL.
- No page builder.
- No content-block registry.
- No Page Inventory media fields.

### Compatibility

- Additive if route collisions are guarded.
- Medium risk because adding `src/pages/[...path].astro` can affect routing if implemented carelessly.
- This should be implemented after route conflict tests.

## ST-04 Hub Media Support

### Current audit

- Guide hub rendering is inline in `src/pages/guides/[...slug].astro`.
- Entity/database hub rendering uses `src/components/EntityDatabase.astro`.
- Neither consumes manifest media for hub page IDs.
- Page Inventory already contains `hub.guides`.
- Media manifest already supports page mappings by `pageId`.

### Decision

Add narrow hub media support for one visual anchor where appropriate.

Preferred implementation:

- For guide hub: `src/pages/guides/[...slug].astro` should call `mediaCatalog.getPageMedia(hubPage.pageId)` and render only existing fixed placements that fit current architecture, preferably hero media first.
- For entity/database hubs: if hub pages are inventory-backed in the enabled catalog, `EntityDatabase.astro` can accept optional `pageMedia` or internally resolve by pageId. Keep this scoped.
- Empty hub media must render no wrappers/placeholders.

### Shared WikiHub abstraction classification

`CANDIDATE — NEEDS SECOND PROJECT VALIDATION`.

Bomb Farm proves hub media need, not a universal hub abstraction. Current Starter has different hub render paths, and a shared abstraction would risk overfitting.

## ST-05 Local Video Support

### Current audit

- Schema: `src/data/schemas/media.ts`
- Component: `src/components/media/VideoEmbed.astro`
- Catalog validation: `src/data/media/catalog.ts`
- Build/media audit: `scripts/media-validation.ts`, `scripts/audit-build.ts`
- Current video `src`: YouTube ID only.
- Current render: YouTube iframe only, privacy-friendly `youtube-nocookie.com`.

### Smallest safe capability

Add support for:

- local `.mp4`
- local `.webm`
- optional local poster image
- native `<video>`
- `controls`
- `playsinline`
- `preload="metadata"`
- aspect-ratio wrapper
- accessible label/title from asset metadata
- optional caption/source metadata through existing media figure conventions where applicable

Preserve existing YouTube behavior exactly:

- 11-character YouTube ID remains valid.
- `youtube-nocookie.com` remains the embed host.
- Existing YouTube tests stay valid.

### Schema/catalog impact

- Extend video schema so `src` accepts either a valid YouTube ID or a safe local video path under `/media/...`.
- Add optional `poster` field for video assets.
- Catalog should validate local video and poster existence using the same safe public-media boundary logic used for images.
- Unknown fields should remain rejected.
- Duplicate IDs should remain rejected.

### Explicit exclusions

- No transcoding pipeline.
- No generic video service abstraction.
- No video hosting system.
- No CDN abstraction.
- No universal byte cap.

### Performance decision

Bomb Farm's local trailer was about 13.97 MiB and worked with native partial-content behavior. Starter should provide warnings/guidance and validation of delivery attributes, not a universal file-size threshold.

## ST-06 Media Manifest Contract

### Current audit

Current manifest contract is sound:

- `assets` list
- `pages` list
- asset `id`
- asset `type`
- image `src`
- video YouTube ID `src`
- `alt`
- optional `caption`
- optional `sourceUrl`
- page-level fixed references: `hero`, `gallery`, `trailer`

### v2.5 contract

Minimal contract:

- Keep `id`
- Keep `type`
- Keep local image `src`
- Keep YouTube ID `src`
- Add local video `src`
- Keep `alt`
- Keep optional `caption`
- Keep optional `sourceUrl`
- Add optional local video `poster`
- Keep fixed page placement references

### Page Inventory impact

Page Inventory remains unaffected. It must not gain media fields, slot fields, layout fields, media priority fields, or route media decision fields.

## ST-07 Neutral Starter Visual Defaults

### Current audit

Observed defaults:

- `src/styles/theme.css` fallback palette uses beige/surface, green primary, orange accent.
- `src/styles/global.css` contains graph-grid-like panels, coordinate rails, large bordered editorial blocks, and strong card treatments.
- `src/components/home/GameHero.astro` contains production-sounding generic hero slogan.
- `src/layouts/BaseLayout.astro` renders coordinate rail metadata via `brandPresentation.coordinateLabel`.
- `src/components/Footer.astro` uses generic `Player index` and a fixed editorial statement.
- `src/styles/global.css` footer inverts to `background: var(--color-text); color: var(--color-background);`.

### Default classification

| Default | v2.5 classification | Action |
|---|---|---|
| Semantic theme tokens | KEEP | Preserve token mechanism. |
| Page-family accent variables | KEEP | Preserve controlled family mapping. |
| Beige/green/orange fallback identity | NEUTRALIZE | Move to quieter neutral defaults. |
| Coordinate rail as visible brand motif | MAKE TOKEN-DRIVEN | Keep optional/neutral; ensure it can disappear under project theme. |
| Generic graph/grid decorative surfaces | NEUTRALIZE | Avoid strong Starter identity residue. |
| Production-sounding hero slogan | REMOVE | Replace with project-authored heading or brand fallback. |
| Hard-coded mark treatment | PROJECT-SPECIFIC OVERRIDE ONLY | Starter default mark should be literal/simple. |
| Footer fixed inverted palette | MAKE TOKEN-DRIVEN | Derive from shared footer tokens or global tokens. |
| Repeated tall cards | KEEP for now | Candidate refinement only; no broad API. |

### Explicit exclusion

Do not make Starter Bomb Farm-themed.

## ST-08 Footer Default

### Current audit

- Component: `src/components/Footer.astro`
- CSS: `src/styles/global.css`
- Current content is generic but fixed:
  - `Player index`
  - `Guides, answers, and game reference for the next session.`
  - legal links
  - back-to-top link
- Current footer style has an independent high-contrast inversion.

### Problem

The footer can visually disconnect from a project theme, especially after the rest of the project develops a distinct identity.

### Smallest safe fix

- Preserve footer content structure and legal link behavior.
- Derive footer colors, borders, and muted text from shared theme tokens or footer-specific semantic tokens with fallbacks.
- Avoid fixed independent light/dark identity.
- Keep responsive behavior and accessibility.
- Optionally make footer eyebrow/statement config-derived only if existing config can support it without a new system; otherwise use neutral brand-derived text.

### Required tests

- default neutral footer render
- custom theme override affects footer
- legal links remain present when their page IDs exist
- footer remains accessible and responsive

## ST-09 Homepage Rhythm / Compact Primitives

### Current audit

`src/components/home/PageCollection.astro`, `WikiCategories.astro`, and related homepage CSS use repeated card-like surfaces. `.portal-card` currently has tall minimum heights.

### Decision

Bomb Farm proves repeated tall-card fatigue in one production project, but not a universal Starter component API.

The following remain candidate-only:

- compact link list
- fact strip
- update strip
- system row

v2.5 may safely reduce over-tall default card minimums only if tests prove no layout regressions. It should not add a generic block system.

Classification: `CANDIDATE — NEEDS SECOND PROJECT VALIDATION`.

## ST-10 Page-Family / Visual-Family Coupling

### Current audit

- Page family/module is represented through Page Inventory `module`.
- `src/layouts/BaseLayout.astro` emits `data-page-family={page.module}`.
- `src/styles/page-families.css` maps module families to accents.
- The page-family visual mechanism is controlled and simple.

### Decision

Bomb Farm exposed one possible page-family/visual-family coupling issue, but one project is not enough evidence for schema redesign.

v2.5 should:

- keep current page-family mechanism
- add only test-only coverage if current fallback behavior is unclear
- defer visual-family schema or independent visual taxonomy

Classification: `CANDIDATE — NEEDS SECOND PROJECT VALIDATION`.

## ST-11 Required Fixtures / Tests

Future v2.5 implementation should add or update repository-native tests only. Do not add screenshot snapshots unless the current test system grows that capability cleanly.

### Hero

- with media
- without media
- custom heading
- fallback heading
- blank heading validation
- mobile ordering
- generic Starter slogan absent

### Static Page

- with media
- without media
- unknown pageId media mapping rejected
- fixed placements only
- no empty wrappers/placeholders

### Hub

- with media
- without media
- guide hub hero media
- entity/database hub no-op when no media
- no new `WikiHub` abstraction requirement

### Video

- local MP4
- local WebM
- poster
- missing local file
- missing poster
- invalid traversal path
- invalid extension
- existing YouTube path
- local video renders native controls, playsinline, preload metadata
- YouTube still renders `youtube-nocookie.com`

### Manifest

- empty manifest
- invalid type
- duplicate ID
- wrong placement/type
- unknown field
- source URL/path validation
- local image validation unchanged
- Page Inventory unaffected

### Theme

- neutral default
- custom theme override
- footer override
- page-family accent mapping unchanged
- no hard-coded theme-color meta regression

### Responsive / Output

- 1440 desktop hero with media
- 1440 desktop hero without media
- 390 mobile hero ordering
- 360 mobile where layout differs
- nav/tablet breakpoint where relevant
- no broken media
- no preview SEO leakage
- no empty wrappers/placeholders

## Dependency Audit

Decision: `NO NEW DEPENDENCY`.

No proposed v2.5 change requires a new package:

- no-media hero behavior is CSS/component state
- project-authored heading is config/schema/rendering
- local video uses native browser `<video>`
- poster support uses existing local-media validation patterns
- hub/static media reuse existing media components
- neutral theme/footer changes use existing CSS token architecture
- tests use existing Vitest/Astro test setup

Speculative dependencies for media processing, screenshot automation, CDN integration, visual AI review, page builders, or schema engines are not justified.

## Backward Compatibility

| Change | Breaking? | Old config valid? | Empty manifest valid? | YouTube valid? | Runtime behavior |
|---|---:|---:|---:|---:|---|
| No-media hero layout | No | Yes | Yes | Yes | Improved desktop no-media balance. |
| Optional homepage display heading | No | Yes | Yes | Yes | H1 fallback changes from generic slogan to brand name. |
| Remove generic slogan | Intentional visual change | Yes | Yes | Yes | Projects relying on Starter slogan see brand fallback. |
| Static wiki media support | Additive if guarded | Yes | Yes | Yes | New fixed media support on static wiki pages only. |
| Hub hero media support | No | Yes | Yes | Yes | Hubs may render configured manifest hero media. |
| Local MP4/WebM support | No | Yes | Yes | Yes | New local video render path. |
| Manifest poster field | No | Yes | Yes | Yes | Unknown fields still rejected except adopted `poster`. |
| Footer token default | Visual change | Yes | Yes | Yes | Footer better follows theme tokens. |
| Neutral theme fallback | Visual change | Yes | Yes | Yes | Starter defaults become less identity-heavy. |

Migration tooling is not required. Migration notes are required because visual defaults intentionally change.

## Architecture Ownership Matrix

| Finding / Requirement | SOP owns | Starter owns | Project owns | Master Prompt enforces | Evidence level | v2.5 action |
|---|---:|---:|---:|---:|---|---|
| visual identity | Yes | Supporting neutral defaults | Yes | Yes | PROVEN | STRENGTHEN |
| first-viewport recognition | Yes | Broken fallback prevention | Yes | Yes | PROVEN | STRENGTHEN |
| route media decisions | Yes | No | Yes | Yes | PROVEN | KEEP OUT OF STARTER |
| no-media hero | No | Yes | No | Supporting | PROVEN | MUST FIX |
| hero copy | No | Safe fallback only | Yes | Yes | PROVEN | MUST FIX |
| static media | Supporting | Fixed renderer support | Content/media choice | Yes | PROVEN | SHOULD ADD |
| hub media | Supporting | Narrow fixed support | Media choice | Yes | PROVEN | SHOULD ADD |
| local video | Supporting | Schema/render/validation | Asset choice | Yes | PROVEN | SHOULD ADD |
| manifest schema | No | Yes | Uses it | Supporting | PROVEN | STRENGTHEN |
| template residue | Yes | Reduce residue defaults | Replace identity | Yes | PROVEN | STRENGTHEN |
| footer consistency | Supporting | Token-driven default | Theme override | Yes | PROVEN | MUST FIX |
| visual rhythm | Yes | Conservative primitives only | Final composition | Yes | CANDIDATE | DEFER API |
| screenshot review | Yes | Stable render support | Provides screenshots/evidence | Yes | PROVEN | DO NOT BUILD ENGINE |
| performance warnings | Yes | Validate delivery attrs | Asset sizing choice | Yes | PROVEN | WARN, NO CAP |
| rights/provenance | Yes | Fields/supporting validation | Yes | Yes | PROVEN | KEEP SUPPORT |

## Exact File-Level Change Map

| Current file | Current responsibility | Proposed v2.5 action | Exact change | Evidence | Risk | Tests | Compatibility |
|---|---|---|---|---|---|---|---|
| `src/components/home/GameHero.astro` | Homepage hero render | STRENGTHEN | Add media-state class; accept/render project heading prop; remove hard-coded generic slogan | PROVEN | Low | `tests/homepage.test.ts` | Non-breaking, intentional visual fallback change |
| `src/styles/global.css` | Global layout, hero, cards, footer | STRENGTHEN | Add no-media hero one-column desktop rule; token-drive footer; neutralize strong residue-prone defaults | PROVEN | Medium | homepage/theme/render tests | Visual defaults change |
| `src/config/schema.ts` | Config schema/validation | ADD | Add optional `homepage.displayHeading`; reject blank heading; keep legacy config valid | PROVEN | Low | config/homepage validation tests | Non-breaking |
| `game.config.ts` | Starter example/default config | STRENGTHEN | Use safe literal brand/game fallback or explicit neutral example heading; no generic slogan | PROVEN | Low | config/homepage tests | Visual default change |
| `src/pages/index.astro` | Homepage assembly | STRENGTHEN | Pass resolved display heading/fallback into `GameHero` | PROVEN | Low | homepage tests | Non-breaking |
| `src/components/home/home-model.ts` | Homepage model | STRENGTHEN | Include resolved heading only if cleaner than resolving in route; avoid new branding system | PROVEN | Low | model tests | Non-breaking |
| `src/data/schemas/media.ts` | Media manifest schema | ADD | Accept local MP4/WebM video src; add optional poster; keep strict unknown-field rejection | PROVEN | Medium | `tests/media.test.ts` | Additive |
| `src/data/media/catalog.ts` | Media manifest resolution/validation | STRENGTHEN | Validate local video and poster existence with safe public-media boundary; keep Page Inventory separation | PROVEN | Medium | media tests | Additive |
| `src/components/media/VideoEmbed.astro` | Video rendering | ADD | Branch between local native video and existing YouTube iframe | PROVEN | Medium | `tests/media-rendering.test.ts` | YouTube path preserved |
| `src/components/media/GameMedia.astro` | Media figure wrapper | STRENGTHEN | Ensure local video caption/source/accessibility integrate with existing conventions | PROVEN | Low | media rendering tests | Additive |
| `scripts/media-validation.ts` | Built HTML media audit helpers | STRENGTHEN | Validate `<video>` src/poster/controls/playsinline/preload and safe local paths | PROVEN | Medium | `tests/media-audit.test.ts` | Additive |
| `scripts/validate-site.ts` | Site validation entrypoint | STRENGTHEN | Use local media existence checker covering images and videos | PROVEN | Low | validation/media tests | Additive |
| `scripts/audit-build.ts` | Built output audit | STRENGTHEN | Include adopted hub/static media placement checks only where rendered; keep bundle thresholds unchanged | PROVEN | Medium | audit tests | Additive |
| `src/pages/guides/[...slug].astro` | Guide hub and guide articles | ADD | Let guide hub consume fixed manifest hero media; article path unchanged | PROVEN | Medium | hub tests | Additive |
| `src/components/EntityDatabase.astro` | Entity hub/database render | ADD | Optional narrow hero media support for inventory-backed hubs | PROVEN | Medium | hub tests | Additive |
| `src/components/EditorialArticle.astro` | News/meta article render | CANDIDATE | Consider fixed media support only if route media evidence expands beyond Bomb Farm/static pages | CANDIDATE | Medium | article tests if adopted | Defer by default |
| `src/components/LegalPage.astro` | Legal/static renderer | DO NOT CHANGE | Do not force legal pages into game-media treatment | NOT JUSTIFIED | Low | existing legal tests | Preserve |
| `src/components/Footer.astro` | Footer content/link render | STRENGTHEN | Preserve structure; derive text/colors from site/theme tokens; avoid disconnected fixed identity | PROVEN | Low | theme/footer tests | Visual default change |
| `src/styles/theme.css` | Starter fallback tokens | STRENGTHEN | Neutralize strong fallback identity while preserving semantic token contract | PROVEN | Medium | theme tests | Visual default change |
| `src/styles/page-families.css` | Controlled page-family accents | KEEP | Preserve current module-to-accent mapping; add tests only if fallback unclear | CANDIDATE | Low | theme tests | No schema change |
| `public/media/README.md` | Media authoring guidance | STRENGTHEN | Document local video/poster path rules and no universal byte cap | PROVEN | Low | docs review | Non-runtime |
| `README.md` | Starter documentation | STRENGTHEN | Update v2.5 scope, commands, media contract, no-overbuild boundaries | PROVEN | Low | docs review | Non-runtime |
| `docs/CONTENT_AND_DATA_GUIDE.md` | Content/data authoring guide | STRENGTHEN | Document heading contract, fixed media placements, local video, project-owned media decisions | PROVEN | Low | docs review | Non-runtime |
| `docs/QA_CHECKLIST.md` | QA process | STRENGTHEN | Add human visual review expectations as project process, not Starter runtime | PROVEN | Low | docs review | Non-runtime |
| `tests/homepage.test.ts` | Homepage behavior tests | STRENGTHEN | Add media/no-media, heading, slogan absence, responsive CSS assertions | PROVEN | Low | Native test | Non-runtime |
| `tests/media.test.ts` | Manifest/schema tests | STRENGTHEN | Add local video/poster cases and manifest strictness cases | PROVEN | Medium | Native test | Non-runtime |
| `tests/media-rendering.test.ts` | Astro media render tests | STRENGTHEN | Add local video and hub/static media render cases | PROVEN | Medium | Native test | Non-runtime |
| `tests/media-audit.test.ts` | Built media audit tests | STRENGTHEN | Add `<video>` audit cases and YouTube compatibility | PROVEN | Medium | Native test | Non-runtime |
| `tests/theme.test.ts` | Theme/page-family tests | STRENGTHEN | Add footer token override and neutral default checks | PROVEN | Low | Native test | Non-runtime |
| NEW: `src/components/StaticWikiPage.astro` | Not present | ADD | Constrained static wiki renderer using existing manifest fixed placements | PROVEN | Medium | static media tests | Additive if routed safely |
| NEW: `src/core/static-routes.ts` | Not present | ADD | Build static wiki records from Page Inventory while excluding concrete route families | PROVEN | Medium | route tests | Additive if guarded |
| NEW: `src/pages/[...path].astro` | Not present | ADD WITH CAUTION | Optional catch-all only for inventory-backed static wiki routes; must not shadow concrete routes | PROVEN | High | route/build tests | Biggest compatibility risk |

## DO NOT CHANGE List

Protect these files/areas unless a future implementation discovers a direct defect:

- Runtime Page Inventory schema and ownership model in `src/data/page-inventory.json`
- Page Inventory as publication SSOT
- route architecture for existing concrete routes
- fact model under `src/data/facts`
- navigation resolution architecture in `src/core/site-data.ts`
- feature-flag model in `game.config.ts` and `src/config/schema.ts`
- content/facts/media separation
- media manifest location and separation from Page Inventory
- fixed media placements only: `hero`, `gallery`, `trailer`
- local-image preference
- YouTube privacy-friendly embed path
- module/page-family architecture
- build-time validation strategy
- SEO architecture unless a small media audit hook is needed
- build system and package manager
- runtime framework: Astro/static
- deployment model
- no CMS
- no database
- no page builder
- no arbitrary layout DSL
- no media placement DSL
- no generic entity engine
- no speculative platform abstractions

Any proposal that weakens these should be marked `BLOCKER` or `NOT JUSTIFIED`.

## DO NOT OVERBUILD

The following proposals are rejected for v2.5:

| Proposal | Classification | Decision |
|---|---|---|
| CMS | NOT JUSTIFIED — DO NOT ADD | Reject |
| Database | NOT JUSTIFIED — DO NOT ADD | Reject |
| Page builder | NOT JUSTIFIED — DO NOT ADD | Reject |
| Generic content-block registry | NOT JUSTIFIED — DO NOT ADD | Reject |
| Arbitrary media slots | NOT JUSTIFIED — DO NOT ADD | Reject |
| Layout DSL | NOT JUSTIFIED — DO NOT ADD | Reject |
| Media placement DSL | NOT JUSTIFIED — DO NOT ADD | Reject |
| Runtime design-system editor | NOT JUSTIFIED — DO NOT ADD | Reject |
| Visual token DSL | NOT JUSTIFIED — DO NOT ADD | Reject |
| Generic entity engine | NOT JUSTIFIED — DO NOT ADD | Reject |
| Image CDN abstraction | NOT JUSTIFIED — DO NOT ADD | Reject |
| Transcoding pipeline | NOT JUSTIFIED — DO NOT ADD | Reject |
| Generic media processing service | NOT JUSTIFIED — DO NOT ADD | Reject |
| Generic video-platform abstraction | NOT JUSTIFIED — DO NOT ADD | Reject |
| Universal screenshot engine | NOT JUSTIFIED — DO NOT ADD | Reject |
| Visual AI pipeline | NOT JUSTIFIED — DO NOT ADD | Reject |
| Broad schema rewrite | NOT JUSTIFIED — DO NOT ADD | Reject |
| Broad route redesign | NOT JUSTIFIED — DO NOT ADD | Reject |

## Candidate Changes Requiring Another Real Project

These should not be promoted to MUST in v2.5:

- generic compact homepage primitive set
- generic `WikiHub` abstraction
- independent visual-family schema
- universal video size threshold
- specialized achievement icon component
- generic diagram presentation system
- route-level visual rhythm DSL
- screenshot automation engine
- reusable project media decision table inside Starter runtime

## Validation Plan for Actual v2.5 Implementation

Future implementation acceptance should run in this order:

1. Switch to pinned runtime from `.nvmrc`: Node `22.22.0`.
2. Install from lockfile with the repository package manager.
3. Run `npm run validate`.
4. Run targeted tests first:
   - `npm run test -- tests/homepage.test.ts`
   - `npm run test -- tests/media.test.ts`
   - `npm run test -- tests/media-rendering.test.ts`
   - `npm run test -- tests/media-audit.test.ts`
   - `npm run test -- tests/theme.test.ts`
5. Run `npm run check`.
6. Run `npm run build`.
7. Run `git diff --check`.
8. Run dependency review: verify `package.json` and `package-lock.json` are unchanged unless an explicit dependency decision is approved.
9. Run architecture drift audit:
   - Page Inventory still owns publication only.
   - Media remains in `src/data/media/media.json`.
   - No media/layout fields added to Page Inventory.
   - No page builder, DSL, CMS, database, route redesign, or generic entity engine introduced.
10. Run empty manifest smoke test.
11. Run existing YouTube compatibility test.
12. Run no-media hero test.
13. Run local video test if adopted.
14. Run static/hub media tests.
15. Run neutral theme override test.
16. Run footer override test.
17. Run Page Inventory SSOT audit.

Human visual review remains a future project/SOP process, not a Starter unit-test snapshot requirement.

## Release / Versioning Plan

Target release name: `starter-v2.5.0`.

Recommended future sequence:

1. Create implementation branch from current Starter baseline, using `codex/` prefix, for example `codex/starter-v2.5`.
2. Commit grouping:
   - hero identity/no-media behavior
   - media schema/render/validation
   - static/hub media consumers
   - neutral theme/footer defaults
   - docs/tests/fixtures
3. Run full validation plan.
4. Create an RC candidate commit after all checks pass.
5. Record provenance:
   - prior Starter baseline SHA
   - previous available release tag
   - SOP v2.5 frozen tag and commit
   - Bomb Farm evidence commit
6. Perform human visual review on representative generated pages.
7. Tag only after approval: `starter-v2.5.0`.
8. Rollback path: return to current Starter baseline commit `afc23d9b842c93b63fd33613f3e8b3b732720828` or prior release tag `starter-v2.0.0` depending on release policy.

Do not tag or release during proposal creation.

## A. Current Starter Baseline

Exact current Starter baseline:

- Workspace/repository: `GAME_SITE_STARTER_BASED_gamesop2.2`
- Branch: `main`
- Current SHA: `afc23d9b842c93b63fd33613f3e8b3b732720828`
- Exact current tag: none
- Available release tag: `starter-v2.0.0`
- Available release tag SHA: `e4964e1f640763f2c55db9f48446ac0dbe87afa3`
- Package version: `0.1.0`
- Runtime pin: Node `22.22.0`
- Architecture authority: `docs/STARTER_2.0_ARCHITECTURE_PROPOSAL.md`
- Current documentation identity: Game Wiki Starter 2.0 / GAME_SOP_2.2-derived

Baseline resolution: current workspace appears to be a v2.2-based Starter workspace by repository name and docs context, but the repository does not contain an exact `starter-v2.2` release tag at HEAD. This does not block planning, but release provenance must record both the current HEAD and the last available release tag.

## B. Proven v2.5 Changes

Safe to implement now:

- ST-01: no-media hero desktop layout becomes intentional single-column; media-present hero remains split.
- ST-02: homepage H1 becomes project-authored via optional config, with literal brand/game name fallback; generic Starter slogan removed.
- ST-03: constrained static wiki media consumer using existing manifest/components, if v2.5 includes inventory-backed static wiki pages.
- ST-04: narrow hub hero media support from existing manifest; no generic hub abstraction.
- ST-05: local MP4/WebM video support with poster/native controls/playsinline/preload metadata.
- ST-06: strengthen existing media manifest contract while preserving Page Inventory separation.
- ST-07: neutralize strong Starter visual defaults so project identity can replace them cleanly.
- ST-08: token-driven footer default that follows project theme.
- ST-11: add focused fixtures/tests for hero, static/hub media, local video, manifest strictness, theme/footer, responsive output, and no empty wrappers.

## C. Candidate Changes Requiring Another Real Project

Do not promote these in v2.5 without additional real-project evidence:

- generic compact homepage primitive set
- generic `WikiHub` abstraction
- independent visual-family schema
- universal video size threshold
- specialized achievement icon component
- generic diagram presentation system
- universal screenshot engine
- visual AI review pipeline
- reusable project media decision table inside Starter runtime

## D. Exact Files to Modify

Future implementation should modify only the minimal proven set:

- `src/components/home/GameHero.astro`
- `src/styles/global.css`
- `src/config/schema.ts`
- `game.config.ts`
- `src/pages/index.astro`
- `src/components/home/home-model.ts` if heading resolution belongs in the model
- `src/data/schemas/media.ts`
- `src/data/media/catalog.ts`
- `src/components/media/VideoEmbed.astro`
- `src/components/media/GameMedia.astro` if local video figure integration requires it
- `scripts/media-validation.ts`
- `scripts/validate-site.ts`
- `scripts/audit-build.ts`
- `src/pages/guides/[...slug].astro`
- `src/components/EntityDatabase.astro`
- `src/components/Footer.astro`
- `src/styles/theme.css`
- `public/media/README.md`
- `README.md`
- `docs/CONTENT_AND_DATA_GUIDE.md`
- `docs/QA_CHECKLIST.md`
- `tests/homepage.test.ts`
- `tests/media.test.ts`
- `tests/media-rendering.test.ts`
- `tests/media-audit.test.ts`
- `tests/theme.test.ts`

Potential new files, only if required by the static wiki implementation:

- `src/components/StaticWikiPage.astro`
- `src/core/static-routes.ts`
- `src/pages/[...path].astro`

These new route files are the highest-risk implementation area and require route-collision tests before adoption.

## E. Files / Architecture to Keep Unchanged

Protect:

- Astro/static architecture
- `src/data/page-inventory.json` as publication SSOT
- Runtime Page Inventory schema ownership
- media manifest separate from Page Inventory
- content/facts/media separation
- feature flags
- one resolved navigation path through `src/core/site-data.ts`
- narrow fixed media placements
- local-image preference
- YouTube privacy-friendly `youtube-nocookie.com` path
- module/page-family architecture
- build-time validation
- fact model
- SEO architecture except small media audit hooks
- build system
- package manager
- runtime framework
- deployment model

Do not add CMS, database, page builder, arbitrary layout/media DSL, generic entity engine, image CDN abstraction, transcoding pipeline, generic media processing service, video-platform abstraction, broad schema rewrite, or broad route redesign.

## F. Required New Tests / Fixtures

Required future fixtures/tests:

- Hero with media
- Hero without media
- Hero custom heading
- Hero fallback heading
- Hero blank heading validation
- Hero mobile ordering
- Generic Starter slogan absence
- Static page with media
- Static page without media
- Hub with media
- Hub without media
- Local MP4
- Local WebM
- Local video poster
- Missing local video file
- Missing poster
- Invalid traversal path
- Existing YouTube path
- Empty manifest
- Invalid media type
- Duplicate media ID
- Wrong placement/type
- Unknown manifest field
- Source URL/path validation
- Neutral default theme
- Custom theme override
- Footer override
- 1440 desktop
- 390 mobile
- 360 mobile where layout differs
- nav/tablet breakpoint where relevant
- no broken media
- no preview SEO leakage
- no empty wrappers/placeholders

Use current Vitest/Astro tests and existing build audits. Do not introduce screenshot unit snapshots unless the test system already supports them cleanly.

## G. Compatibility / Migration

Overall compatibility: additive, with intentional visual default changes.

- Old config remains valid.
- Old empty media manifest remains valid.
- Old YouTube media path remains valid.
- Old projects should still build.
- No migration tooling needed.
- Migration notes needed for visual fallback changes:
  - homepage H1 fallback changes from generic Starter slogan to brand/game name
  - footer default follows theme tokens
  - Starter fallback palette becomes more neutral
- Biggest implementation compatibility risk is adding a catch-all static route; it must be route-collision guarded or omitted.

## H. Dependency Decision

`NO NEW DEPENDENCY`.

Native Astro, CSS, Zod schemas, existing media components, browser `<video>`, and current Vitest/build scripts are sufficient. New dependencies for video processing, CDN, screenshots, page builders, visual AI, or schema engines are not justified.

## I. Architecture Drift Risks

Top risks:

- leaking route-level media methodology into Page Inventory
- turning fixed media placements into arbitrary slot/layout DSL
- overgeneralizing Bomb Farm-specific design into Starter defaults
- introducing catch-all routes that shadow existing concrete routes
- converting human visual review into brittle automated screenshot snapshots
- adding media performance thresholds that become false universal rules
- expanding one project's page-family issue into a broad schema redesign

## J. Implementation Order

Recommended future sequence:

1. Create implementation branch `codex/starter-v2.5` from current baseline.
2. Add hero no-media layout state and homepage heading contract.
3. Add local video schema/render/validation while preserving YouTube behavior.
4. Add hub media support in the narrowest current render paths.
5. Add static wiki media support only after route-collision tests are designed.
6. Neutralize theme defaults and token-drive footer.
7. Add/update fixtures and tests.
8. Update docs/guides.
9. Run targeted tests.
10. Run `npm run validate`.
11. Run `npm run check`.
12. Run `npm run build`.
13. Run `git diff --check`.
14. Perform architecture drift audit.
15. Record provenance and prepare RC.
16. Tag `starter-v2.5.0` only after explicit release approval.

## K. Human Review Questions

Only genuine unresolved decisions:

- Should v2.5 include a new constrained static wiki route, or only prepare media support for static renderers already present in projects?
- Should Starter default `homepage.displayHeading` be omitted to force brand fallback, or set to a literal neutral example such as `Game Atlas`?
- How neutral should the fallback theme become before it stops being useful as an installable demo?
- Should local video size produce a warning in docs only, or should build audit emit a non-blocking advisory?
- Should guide hub media be limited to hero only in v2.5, or may it also render existing gallery/trailer placements when already configured?

## L. Final Verdict

PASS — READY TO IMPLEMENT STARTER v2.5.0
