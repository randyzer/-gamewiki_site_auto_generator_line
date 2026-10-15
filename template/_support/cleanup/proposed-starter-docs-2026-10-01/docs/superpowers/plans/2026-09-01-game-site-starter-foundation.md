# Game Site Starter Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-capable vertical slice of the approved Astro starter: typed configuration, Page Inventory SSOT, feature-aware catalog, content collections, fact schemas, one indexable guide, and a static build with sitemap and Pagefind.

**Architecture:** Keep all route eligibility in a pure TypeScript catalog layer. Parse `game.config.ts`, `src/data/page-inventory.json`, content frontmatter, and fact files at build time with Zod. Astro pages consume the catalog and never infer routes directly from facts. This plan establishes the contract that later page-family and UI plans will extend.

**Tech Stack:** Astro 7, TypeScript strict, Tailwind CSS 4 through `@tailwindcss/vite`, Zod, Astro Content Collections, MDX, React integration, Vitest, Astro Check, Pagefind, npm.

**Execution note:** Work in the user-designated repository. Do not create a worktree or commit unless the user explicitly asks. Use review checkpoints in place of commit steps.

---

## Planned file structure

```text
.
├── .nvmrc
├── .gitignore
├── astro.config.ts
├── game.config.ts
├── package.json
├── tsconfig.json
├── public/
│   ├── favicon.svg
│   └── robots.txt
├── scripts/
│   └── validate-site.ts
├── src/
│   ├── components/
│   │   ├── Footer.astro
│   │   └── Header.astro
│   ├── config/
│   │   ├── load-config.ts
│   │   └── schema.ts
│   ├── content/
│   │   └── guides/getting-started.mdx
│   ├── content.config.ts
│   ├── core/
│   │   ├── catalog.ts
│   │   ├── content-files.ts
│   │   ├── page-resolution.ts
│   │   ├── site-validation.ts
│   │   └── site-data.ts
│   ├── data/
│   │   ├── facts/
│   │   │   └── README.md
│   │   ├── page-inventory.json
│   │   └── schemas/
│   │       ├── facts.ts
│   │       ├── page-inventory.ts
│   │       └── provenance.ts
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── guides/[slug].astro
│   │   └── index.astro
│   └── styles/
│       └── global.css
└── tests/
    ├── catalog.test.ts
    ├── config.test.ts
    ├── facts.test.ts
    └── page-resolution.test.ts
```

## Task 1: Scaffold the pinned toolchain

**Files:**

- Create: `.nvmrc`
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `astro.config.ts`

- [x] Add `.nvmrc` with Node `22.22.0`, which satisfies the dependency requirement discovered during the technical spike.
- [x] Ignore dependency, build, framework cache, coverage, environment, and macOS metadata files.
- [x] Add a private ESM package with these scripts:

```json
{
  "scripts": {
    "dev": "astro dev",
    "validate": "tsx scripts/validate-site.ts",
    "check": "astro check && vitest run",
    "build": "npm run validate && astro build && pagefind --site dist",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [x] Install Astro, official Astro integrations, Tailwind/Vite, React, Zod, Pagefind, TypeScript, TSX, and Vitest through npm; keep the generated `package-lock.json`.
- [x] Configure Astro for `output: "static"`, trailing slashes, sitemap, MDX, React, and the official Tailwind Vite plugin.
- [x] Extend `astro/tsconfigs/strict` and enable JSON module imports.
- [x] Run `npm install` and `npm exec astro check`; expected result at this stage is no error and no engine warning. The full test command starts after the first test file exists.

## Task 2: Define and test the site configuration contract

**Files:**

- Create: `src/config/schema.ts`
- Create: `src/config/load-config.ts`
- Create: `game.config.ts`
- Create: `tests/config.test.ts`

- [x] Write failing tests that reject a non-HTTPS production URL, reject non-English locale configuration, and accept explicit Boolean feature flags.
- [x] Define `featureFlagKeys` once and derive the `FeatureFlagKey` union from that tuple.
- [x] Define a Zod schema with brand name, short name, canonical site URL, English locale, default title/description, social handle, and explicit module flags.
- [x] Add a `defineGameConfig` helper that parses configuration immediately and returns a readonly typed object.
- [x] Add starter defaults in `game.config.ts`, using a neutral commercial-template brand and no external network services.
- [x] Run `npm test -- tests/config.test.ts`; expected result: all configuration tests pass.

## Task 3: Define and test Page Inventory SSOT

**Files:**

- Create: `src/data/schemas/page-inventory.ts`
- Create: `src/data/schemas/provenance.ts`
- Create: `src/data/page-inventory.json`
- Create: `src/core/catalog.ts`
- Create: `tests/catalog.test.ts`

- [x] Write failing tests for duplicate page IDs, duplicate routes, invalid routes, disabled module exclusion, unpublished exclusion, and preservation of `noindex` pages in the route catalog.
- [x] Define enums for page type, visibility, publication status, content status, development status, indexability, confidence, and source type.
- [x] Require editorial metadata, dates, keyword, tags, references, source provenance, and confidence on every inventory row.
- [x] Implement `parsePageInventory` with array-level duplicate checks.
- [x] Implement `buildEnabledPageCatalog(config, inventory)` as a pure function. A page is routable only when it is public, published, and either has no feature gate or its gate is enabled.
- [x] Add inventory rows for `/` and `/guides/getting-started/`, plus one disabled heroes row used to prove feature filtering.
- [x] Run `npm test -- tests/catalog.test.ts`; expected result: all catalog tests pass.

## Task 4: Define fact and provenance schemas

**Files:**

- Create: `src/data/schemas/facts.ts`
- Create: `src/data/facts/README.md`
- Create: `tests/facts.test.ts`

- [x] Write failing tests for malformed provenance, confidence outside the allowed enum, duplicate entity slugs, and valid hero/weapon/item/map collections.
- [x] Define a shared provenance record containing source URL, source type, accessed date, optional published date, and evidence note.
- [x] Define common entity fields and separate Zod schemas for heroes, weapons, items, and maps rather than a universal entity schema.
- [x] Implement array parsers with duplicate ID and slug detection.
- [x] Document that disabled modules do not require empty JSON and enabled modules fail validation when their expected file is absent.
- [x] Run `npm test -- tests/facts.test.ts`; expected result: all fact-schema tests pass.

## Task 5: Wire Content Collections to inventory-owned metadata

**Files:**

- Create: `src/content.config.ts`
- Create: `src/content/guides/getting-started.mdx`
- Create: `src/core/page-resolution.ts`
- Create: `tests/page-resolution.test.ts`

- [x] Write failing tests for a missing page ID, mismatched collection/slug, duplicate content references, and a correct guide resolution.
- [x] Create the guides collection with a `glob` loader. Frontmatter contains only `pageId` and optional processor-local fields.
- [x] Implement a pure resolver that joins content entries to inventory rows using `pageId` and verifies the declared `contentRef`.
- [x] Add concise English starter content explaining how an operator replaces demo configuration and data.
- [x] Run `npm test -- tests/page-resolution.test.ts`; expected result: all page-resolution tests pass.

## Task 6: Build the first static pages and visual foundation

**Files:**

- Create: `src/core/site-data.ts`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/Header.astro`
- Create: `src/components/Footer.astro`
- Create: `src/pages/index.astro`
- Create: `src/pages/guides/[slug].astro`
- Create: `src/styles/global.css`
- Create: `public/favicon.svg`
- Create: `public/robots.txt`

- [x] Load and cache parsed config, inventory, and enabled catalog through a build-only `site-data` module.
- [x] Add a semantic base layout with canonical URL, title, description, Open Graph/Twitter metadata, theme color, skip link, and JSON-LD `WebSite`/`WebPage` nodes.
- [x] Create accessible header/footer landmarks and a compact editorial visual system with no third-party image dependency.
- [x] Build the home route from the inventory row and render the enabled catalog as purposeful discovery links.
- [x] Build guide paths from resolved content only; render MDX with breadcrumb navigation and Article JSON-LD.
- [x] Add Pagefind metadata/filter attributes only to indexable main content.
- [x] Run `npm run check`; expected result: Astro check and all unit tests pass.

## Task 7: Add build-time integrity validation and verify the closed loop

**Files:**

- Create: `scripts/validate-site.ts`
- Create: `src/core/site-validation.ts`
- Create: `src/core/content-files.ts`
- Modify: `package.json`
- Modify: `astro.config.ts`

- [x] Validate config and inventory before every production build.
- [x] Check that every enabled content-backed inventory row resolves to exactly one content entry.
- [x] Check that every fixed route has one inventory row and every enabled feature-owned row has a registered route family.
- [x] Fail with aggregated, actionable errors instead of exiting on the first mismatch.
- [x] Run `npm run build`; expected result: Astro emits the home and guide pages, the sitemap excludes the disabled hero page, and Pagefind indexes both indexable routes.
- [x] Run a local preview and request `/`, `/guides/getting-started/`, `/sitemap-index.xml`, and `/pagefind/pagefind.js`; expected result: HTTP 200 for every path.
- [x] Run `git diff --check` and `git status --short`; expected result: no whitespace errors and only intentional starter files are changed.

## Definition of done for this plan

- Configuration, inventory, content, and fact schemas are independently unit tested.
- The enabled catalog is the single route-eligibility decision point.
- Disabled modules neither load facts nor appear in navigation, routes, sitemap, or Pagefind.
- `npm run check` and `npm run build` complete successfully under the pinned Node line without engine warnings.
- The output is a static, English-first, reusable starter slice ready for the page-family/UI implementation plan.
