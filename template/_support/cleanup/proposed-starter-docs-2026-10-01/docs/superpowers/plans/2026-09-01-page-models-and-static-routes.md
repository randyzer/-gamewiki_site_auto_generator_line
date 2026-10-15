# Page Models and Static Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the starter's static page-model layer while preserving the approved rule that Page Inventory creates intent, facts supply data, and feature flags decide whether optional routes exist.

**Architecture:** Extend the existing catalog instead of introducing a route DSL. Universal routes have explicit files and inventory entries. Each entity module has its own explicit route files and lazy fact load. Editorial families resolve inventory-owned metadata to Content Collections. Shared components handle presentation only; module schemas and route ownership remain explicit.

**Tech Stack:** Existing Astro 7/TypeScript/Tailwind/MDX stack, React integration reserved for the next interaction plan, Zod, Vitest.

**Execution note:** Continue in the user-designated repository. Do not create a worktree or commit without explicit user authorization. Default production output must contain no fictional game entities; optional route behavior is proven with test fixtures.

---

## Task 1: Complete inventory workflow and navigation contracts

**Files:**

- Modify: `src/config/schema.ts`
- Modify: `game.config.ts`
- Modify: `src/data/schemas/page-inventory.ts`
- Modify: `src/data/page-inventory.json`
- Modify: `tests/config.test.ts`
- Modify: `tests/catalog.test.ts`

- [x] Write failing tests for navigation/home page-ID references, workflow fields (`cluster`, `module`, `needsReview`, `needsUpdate`), duplicate primary intent, and the special `/404.html` route.
- [x] Add typed `navigation.primaryPageIds` and `homepage.featuredPageIds` to configuration.
- [x] Extend inventory entries with explicit cluster/module/workflow fields and reject duplicate normalized primary keywords.
- [x] Add published inventory rows for `/guides/`, `/search/`, `/about/`, `/privacy/`, `/terms/`, and `/404.html`; mark search/legal/404 noindex where appropriate.
- [x] Keep all optional game-entity, meta, news, and tool rows absent from production inventory until real data exists.
- [x] Run focused config/catalog tests, then the full suite.

## Task 2: Resolve configured navigation and featured-page references

**Files:**

- Modify: `src/core/site-data.ts`
- Modify: `src/core/site-validation.ts`
- Modify: `tests/site-data.test.ts`
- Modify: `tests/site-validation.test.ts`

- [x] Write failing tests proving configured IDs resolve through the enabled catalog and disabled/missing targets are rejected by validation.
- [x] Export `primaryNavigationPages` and `featuredHomepagePages` derived only from configured IDs and enabled catalog.
- [x] Add aggregated validation for missing navigation/home targets, invalid related page IDs, non-public indexable pages, and content/entity references required by published entries.
- [x] Ensure `getRelatedPages` continues filtering disabled and unpublished targets.
- [x] Run focused and full tests.

## Task 3: Add lazy fact loading and patch-impact reporting

**Files:**

- Create: `src/core/fact-loader.ts`
- Create: `src/core/patch-impact.ts`
- Create: `tests/fact-loader.test.ts`
- Create: `tests/patch-impact.test.ts`

- [x] Write failing tests proving a disabled module does not read a missing file, an enabled missing/invalid file fails precisely, and a valid fixture parses through its module schema.
- [x] Implement one explicit loader map for heroes, weapons, items, and maps with no dynamic plugin discovery.
- [x] Write failing tests for reverse lookup from entity references to affected page IDs.
- [x] Implement a transparent map over `entityRef` and `relatedEntityRefs`; do not mutate `updatedAt` or build a dependency graph.
- [x] Run focused and full tests.

## Task 4: Add page-model selectors and prove optional route isolation

**Files:**

- Create: `src/core/page-models.ts`
- Create: `tests/page-models.test.ts`
- Modify: `src/core/site-validation.ts`
- Modify: `scripts/validate-site.ts`

- [x] Write failing fixture tests for hub, entity detail, database/list, meta, news, and tool-shell selection.
- [x] Add pure selectors that require the expected `pageType`, module, and reference shape.
- [x] Prove all optional selectors return no production pages under the default flags.
- [x] Expand implemented page-type validation to the route models introduced by this plan.
- [x] Run focused and full tests.

## Task 5: Implement universal and hub pages

**Files:**

- Modify: `src/components/Header.astro`
- Modify: `src/components/Footer.astro`
- Modify: `src/pages/index.astro`
- Create: `src/pages/guides/index.astro`
- Create: `src/pages/search.astro`
- Create: `src/pages/about.astro`
- Create: `src/pages/privacy.astro`
- Create: `src/pages/terms.astro`
- Create: `src/pages/404.astro`
- Create: `src/components/LegalPage.astro`
- Create: `src/core/static-page-copy.ts`
- Create: `tests/static-page-copy.test.ts`

- [x] Resolve header links and homepage cards from configured page IDs, not hard-coded URLs.
- [x] Build an indexable guides hub and static search shell; the search page remains noindex until the interaction plan attaches Pagefind UI.
- [x] Build About, Privacy, Terms, and a noindex 404 with useful navigation back into the enabled catalog.
- [x] Keep legal copy clearly marked as starter text that operators must review for their jurisdiction and business.
- [x] Run Astro Check and the full tests.

## Task 6: Implement explicit entity and database route families

**Files:**

- Create: `src/components/EntityDetail.astro`
- Create: `src/components/EntityDatabase.astro`
- Create: `src/core/entity-route-model.ts`
- Create: `tests/entity-route-model.test.ts`
- Create: `src/pages/heroes/[...path].astro`
- Create: `src/pages/weapons/[...path].astro`
- Create: `src/pages/items/[...path].astro`
- Create: `src/pages/maps/[...path].astro`

- [x] Each explicit route calls its module-specific fact loader only after its feature flag is enabled.
- [x] Hub/database routes render only an inventory entry with matching module/page type; detail routes require matching `entityRef` and fact ID.
- [x] Shared components render accessible static tables/cards and source ledgers without hiding mobile content.
- [x] Default build generates zero entity/database routes because the four production flags are false and no fact files exist.
- [x] Run Astro Check, full tests, and a production build.

## Task 7: Implement optional editorial and tool route families

**Files:**

- Modify: `src/content.config.ts`
- Create: `src/content/meta/README.txt`
- Create: `src/content/news/README.txt`
- Create: `src/pages/meta/[slug].astro`
- Create: `src/pages/news/[slug].astro`
- Create: `src/pages/tools/[slug].astro`
- Create: `src/components/EditorialArticle.astro`
- Create: `src/components/ToolShell.astro`

- [x] Register empty meta/news collections without adding fake production articles.
- [x] Resolve meta/news entries through the same inventory/contentRef contract as guides and emit zero paths by default.
- [x] Generate tool shells only from enabled calculator/planner inventory entries; default output contains none.
- [x] Share article chrome and supported Article/Breadcrumb structured data without duplicating inventory metadata.
- [x] Run Astro Check, full tests, and production build.

## Task 8: Reconcile route output and finish the page-model slice

**Files:**

- Modify: `src/styles/global.css`
- Modify: `scripts/validate-site.ts`
- Modify: `docs/superpowers/plans/2026-09-01-page-models-and-static-routes.md`

- [x] Add responsive styling for hub grids, legal prose, 404, static table overflow, entity facts, and tool/editorial shells.
- [x] Build and compare actual HTML outputs with all enabled inventory routes, allowing Astro's `/404.html` special output.
- [x] Verify no optional entity/meta/news/tool route or disabled fact file is present in the default build.
- [x] Preview universal routes and inspect desktop plus narrow viewport behavior.
- [x] Run `npm run check`, `npm run build`, product assertions, `git diff --check`, and `git status --short`.

## Definition of done for this plan

- Every V1 static page model has an explicit route family or universal file.
- Default production output contains only core English starter pages and no fictional game entities/articles.
- Navigation, homepage, related links, routes, sitemap candidates, and data loading all consume the enabled catalog.
- Optional entity files are not required while disabled and fail precisely when enabled without data.
- Patch impact is a transparent reverse index with no automatic editorial-date mutation.
- Astro Check, all unit tests, static build, output reconciliation, and responsive visual inspection pass cleanly.
