# Production SEO, Interaction, and Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the reusable English-first game-site starter with Inventory-derived technical SEO, page-scoped interaction islands, build-time quality gates, Cloudflare-ready delivery, and a documented real-game adoption path.

**Architecture:** Keep Astro static HTML as the default and derive every crawlable URL from the enabled Page Inventory. Put deterministic transformations in framework-free TypeScript modules with Vitest coverage; React is limited to search, filtering, calculator, and planner islands. Build validation reads the generated HTML and fails on metadata, link, schema, output, or budget drift.

**Tech Stack:** Astro 7, strict TypeScript, React 19 islands, Pagefind 1.5, Zod 4, Vitest 4, Node 22, Cloudflare Pages static output.

**Execution note:** Work in the user-designated repository without a worktree or commit. Do not add fictional game entities, editorial articles, formulas, screenshots, logos, or third-party data to production defaults.

---

## Task 1: Make technical SEO derive from the enabled Page Inventory

**Files:**

- Create: `src/core/seo.ts`
- Create: `tests/seo.test.ts`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/guides/[slug].astro`
- Modify: `src/components/EntityDetail.astro`
- Modify: `src/components/EditorialArticle.astro`
- Modify: `astro.config.ts`
- Delete: `public/robots.txt`
- Create: `src/pages/robots.txt.ts`
- Modify: `package.json`

- [x] Write failing tests for `getSitemapRoutes`, canonical URL construction, breadcrumb graph generation, base WebSite/WebPage graph generation, and optional Article graph fields.
- [x] Verify the focused test fails because `src/core/seo.ts` does not exist.
- [x] Implement pure helpers that accept config/inventory data, include only enabled `index` routes in sitemap candidates, produce absolute HTTPS URLs, and omit unsupported rich-result fields when the data is unavailable.
- [x] Move BaseLayout's graph construction into the helpers; add `Organization` once, `WebSite`, `WebPage`, and page-specific nodes without duplicating `@id` values.
- [x] Add visible and JSON-LD breadcrumbs to guide, entity, and editorial templates using the same page/catalog inputs.
- [x] Configure `@astrojs/sitemap` with an allow-set derived from `getSitemapRoutes(enabledPageCatalog)` so noindex and disabled pages cannot leak into XML.
- [x] Generate `/robots.txt` as a prerendered Astro endpoint from `siteConfig.site.url`, eliminating a second hand-maintained domain value.
- [x] Run `npm test -- tests/seo.test.ts`, `npm run check`, and `npm run build`; assert sitemap contains `/`, `/guides/`, `/guides/getting-started/`, `/about/` and excludes search, privacy, terms, 404, and every disabled family.

## Task 2: Replace the static search placeholder with a Pagefind island

**Files:**

- Create: `src/core/search-state.ts`
- Create: `tests/search-state.test.ts`
- Create: `src/components/islands/SearchIsland.tsx`
- Modify: `src/pages/search.astro`
- Modify: `src/styles/global.css`

- [x] Write failing tests for trimming the `q` parameter, empty-query state, result normalization, missing metadata fallbacks, and safe same-site result URLs.
- [x] Verify the focused test fails because the search-state module is missing.
- [x] Implement framework-free query/result helpers with no browser globals at import time.
- [x] Build a React island that dynamically imports `/pagefind/pagefind.js`, preserves the query in `history.replaceState`, exposes loading/empty/error/result status through an `aria-live` region, and renders title, excerpt, URL, and result count.
- [x] Replace the disabled form with `<SearchIsland client:load />`; keep the search page noindex and excluded from its own Pagefind body.
- [x] Add responsive controls, visible focus states, touch-size buttons, and escaped Pagefind excerpts rendered as text rather than injected HTML.
- [x] Run focused/full tests and production build, then preview `/search/?q=configure` and verify Pagefind results, form submission, query URL persistence, zero console errors, and no external request. The in-app automation could not deliver an Enter key reliably, so native form semantics remain the keyboard contract.

## Task 3: Add reusable filter, calculator, and planner interaction contracts

**Files:**

- Create: `src/core/filter-state.ts`
- Create: `src/core/tool-definitions.ts`
- Create: `src/core/tool-loader.ts`
- Create: `tests/filter-state.test.ts`
- Create: `tests/tool-definitions.test.ts`
- Create: `src/data/schemas/tools.ts`
- Create: `src/data/tools/README.md`
- Create: `src/components/islands/EntityFilterIsland.tsx`
- Create: `src/components/islands/CalculatorIsland.tsx`
- Create: `src/components/islands/PlannerIsland.tsx`
- Modify: `src/components/EntityDatabase.astro`
- Modify: `src/components/ToolShell.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/styles/global.css`

- [x] Write failing pure tests for case-insensitive entity filtering, stable sorting, bounded numeric inputs, division-by-zero handling, formula-tree evaluation, planner slot validation, and deterministic share-state encoding/decoding.
- [x] Define strict Zod schemas for calculator inputs plus a safe operation tree (`constant`, `input`, `add`, `subtract`, `multiply`, `divide`, `min`, `max`) and planner slots/options; reject unknown input references and duplicate IDs.
- [x] Implement pure evaluators with explicit finite-number checks and no `eval`, dynamic code, storage, telemetry, or network access.
- [x] Render entity tables through an SSR-capable filter island only on enabled entity routes; the unfiltered table remains present in initial HTML.
- [x] Make tool routes require a matching, validated definition supplied by the adopter; calculator/planner islands hydrate only on generated tool pages and keep state in the URL fragment without transmitting it.
- [x] Keep `src/data/tools/` empty except instructions, so default calculator/planner flags generate no route, data file, or client-script reference in generated HTML.
- [x] Run focused/full tests, Astro Check, build, and default-output assertions.

## Task 4: Add generated-output SEO, accessibility, and budget gates

**Files:**

- Create: `src/core/html-audit.ts`
- Create: `tests/html-audit.test.ts`
- Create: `scripts/audit-build.ts`
- Modify: `package.json`
- Create: `docs/QA_CHECKLIST.md`

- [x] Write failing fixture tests for one H1, unique non-empty title/description, canonical matching the inventory route, robots matching indexability, valid JSON-LD parsing, crawlable internal links, image alt text, and duplicate title/description detection.
- [x] Implement a lightweight generated-HTML audit for controlled Astro output without adding a browser runtime to the production bundle.
- [x] Add aggregate checks for orphaned indexable pages, internal links to disabled/unregistered routes, sitemap/indexability mismatch, missing favicon/robots/sitemap, and JavaScript/CSS asset budgets measured from `dist`.
- [x] Add `tsx scripts/audit-build.ts` after Pagefind in `npm run build`; fail with page-specific messages and print measured HTML/CSS/JS/Pagefind totals without claiming large-scale performance.
- [x] Document manual mobile, keyboard, contrast, reduced-motion, Pagefind, structured-data, and real-domain checks in `docs/QA_CHECKLIST.md`.
- [x] Run fixture tests, full checks, production build, and browser inspection at desktop/tablet/mobile widths.

## Task 5: Package the starter for reproducible commercial reuse and deployment

**Files:**

- Create: `README.md`
- Create: `docs/CONTENT_AND_DATA_GUIDE.md`
- Create: `docs/DEPLOYMENT.md`
- Create: `docs/PATCH_WORKFLOW.md`
- Create: `wrangler.jsonc`
- Create: `.github/workflows/ci.yml`
- Modify: `.gitignore`
- Modify: `package.json`

- [x] Document prerequisites, Node 22 setup, install/check/build/preview commands, architecture map, configuration order, feature-flag behavior, and the rule that Page Inventory and Game Fact files are the two distinct sources of truth.
- [x] Document exact adoption steps: set brand/domain, declare inventory, add cited facts/content, enable modules, inspect patch impact, run validation/build, and perform browser QA.
- [x] Add a Cloudflare Workers static-assets configuration whose build output is `dist`, compatibility date is explicit, and SPA fallback is disabled; document Pages dashboard settings as an alternative.
- [x] Add a CI workflow pinned to Node 22 that runs `npm ci`, `npm run check`, and `npm run build`, uploads no secrets, and performs no deployment.
- [x] Add `npm run patch:impact -- --entity-type <type> --entity-id <id>` through a small CLI that prints affected inventory page IDs without editing dates/content.
- [x] Run the documented clean install/build flow from the current lockfile and verify all referenced files and commands exist.

## Task 6: Final release audit and real-game smoke-test handoff

**Files:**

- Create: `docs/RELEASE_AUDIT.md`
- Modify: `docs/superpowers/plans/2026-09-01-production-seo-interaction-delivery.md`

- [x] Run `npm run check`, `npm run build`, `git diff --check`, disabled-output assertions, internal-link audit, sitemap assertions, and browser console checks.
- [x] Inspect all enabled routes at 1440×1000, 768×1024, and 390×844; confirm no horizontal page overflow, visible focus, usable navigation, readable tables/prose, and reduced-motion behavior. The reduced-motion CSS contract is present in source and production output; OS-level emulation remains in the real-device checklist because the in-app browser does not expose media-preference controls.
- [x] Record exact measured build outputs, Pagefind page/word counts, client JS/CSS totals, known empty-collection warnings, and unverified external assumptions in `docs/RELEASE_AUDIT.md`.
- [ ] Request the minimum real-game input only after the generic starter is green: game name, canonical domain, target platform, approved primary keyword cluster, and authorized/sourced content or data.
- [ ] With that input, add a small real dataset and 5–10 reviewed Inventory pages, run the full build/visual workflow, and remove any smoke-test-only data that the user does not approve for production.

## Definition of done for the generic starter

- Enabled Page Inventory routes, generated HTML, sitemap URLs, Pagefind corpus, navigation, homepage cards, and related links agree.
- Every indexable page has unique metadata, correct canonical/robots, visible content, appropriate schema, an inbound internal link, and no unsupported structured-data claims.
- Default output has no fictional game facts/articles/tools, and optional modules remain absent until both flag and validated data are supplied.
- Search is functional only on its page; filter/calculator/planner JavaScript is route-scoped; ordinary pages remain static HTML.
- CI, Cloudflare static delivery, patch-impact workflow, adoption documentation, and release QA are reproducible from the committed lockfile.
