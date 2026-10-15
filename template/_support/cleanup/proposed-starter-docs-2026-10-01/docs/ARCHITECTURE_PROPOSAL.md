# GAME_SITE_STARTER Architecture Proposal

> Phase: Phase 1 — Architecture
>
> Status: Proposed; implementation is not authorized
>
> Decision date: 2026-09-01
>
> Default audience: global, English-language market
>
> SOP authority: GAME_SOP_2.1 at commit 7db096f9f2fdb52f0b64f1f5abe111e08c51f74c

This document defines how GAME_SITE_STARTER should implement the SOP without copying the SOP into this repository. It intentionally favors KISS, YAGNI, and the 80/20 target over maximum abstraction.

## 1. SOP → Code Mapping

The SOP remains the authority for methods and editorial judgment. The Starter automates deterministic behavior, AI accelerates research and drafting, and humans own evidence, risk, and publishing decisions.

| Responsibility | Code | AI | Human |
|---|---|---|---|
| Source policy | Validate required provenance fields and allowed confidence labels. | Extract candidate facts and label their source class. | Verify the source, licensing, observation date, and whether a claim is publishable. |
| Fact layer | Validate schemas, IDs, references, dates, and duplicate facts. | Normalize names, map entities, and suggest missing fields without inventing values. | Approve facts, resolve conflicts, and leave unavailable values absent. |
| Page Inventory | Validate unique IDs/routes, references, statuses, and feature compatibility; derive all runtime views. | Suggest clusters, priorities, related pages, and P0/P1/P2 assignments. | Own page intent, priority, publication state, indexability, and final inventory approval. |
| Content | Render Markdown/MDX, merge page metadata, and expose fact-reference components. | Draft and update content from approved evidence. | Review accuracy, usefulness, tone, IP risk, and meta/community claims. |
| SEO | Generate metadata primitives, canonicals, robots, sitemap, breadcrumbs, and valid JSON-LD mappings. | Suggest titles, descriptions, FAQs, and internal-link candidates. | Approve search intent and confirm structured data matches visible content. |
| Feature flags | Apply one explicit enabled/disabled decision to every code consumer. | Suggest which modules fit a game. | Choose enabled modules for each cloned site. |
| QA | Run schema, route, link, build, browser, and regression checks. | Triage failures and propose fixes. | Perform visual/mobile review and approve launch blockers. |
| Patch maintenance | Build a reverse index from explicit entity/page references and report affected pages. | Extract candidate changes and affected entities from patch notes. | Verify the patch, review affected content, and approve updatedAt/needsUpdate changes. |

Code must never claim that a fact is true merely because it passes a schema. AI output is a candidate input, not a factual authority. Human approval remains mandatory for source reliability, P2/meta claims, third-party rights, and launch.

## 2. Product Scope

GAME_SITE_STARTER is a reusable, commercial-code-ready foundation for content-heavy SEO sites covering Steam, Roblox, and mobile games. It is:

- SEO-first, content-first, data-first, and static-first;
- mobile-first with complete tablet and desktop layouts;
- suitable for guides, hubs, entity pages, databases, tier/meta pages, patch/news pages, search, filters, calculators, and planners;
- optimized for a V1 of tens to hundreds of pages and a normal growth path into several thousand pages;
- designed to be cloned, configured, populated with real data/content, built, and deployed without re-deciding the base architecture.

The V1 explicitly does not include:

- login, accounts, authentication, permissions, or user cloud data;
- user builds, favorites, community posting, or a SaaS user system;
- a multi-tenant platform, complex admin panel, enterprise CMS, or headless CMS;
- a database server, ORM, event bus, microservices, plugin framework, or universal entity engine;
- Tracker as a generic module;
- prebuilt multilingual routing;
- live market/API infrastructure without a concrete game requirement.

“Commercial-code-ready” applies to the Starter’s own code and architecture. It does not grant commercial rights to game names, logos, screenshots, official art, community content, third-party wiki data, or platform data.

## 3. Framework Decision

### Considered approaches

1. **Astro static-first** — approved recommendation.
2. **Astro hybrid-first** — retains server rendering from day one.
3. **Next.js App Router** — static export initially, with a future server/ISR path.

### Active attack on Astro

| Scenario | Finding | Decision impact |
|---|---|---|
| Hundreds of static pages | Astro defaults to build-time prerendering and sends no client runtime for plain Astro components. | Strong fit. |
| Thousands of pages | Astro Content Collections are documented for large build-time collections, but no representative production dataset was tested here. | Viable assumption, not a performance promise. |
| Programmatic entity routes | getStaticPaths generates multiple static pages from one explicit route module. The Phase 1 spike verified an enabled/disabled route set. | Strong fit. |
| High-frequency patches | Pure static output requires a rebuild and Pagefind re-index. | Real risk if updates become very frequent or time-sensitive. |
| Search | Pagefind generates a static browser-search bundle after the Astro build. | Strong fit for V1; index size remains unknown at production scale. |
| Filter/calculator/planner | Astro can hydrate isolated React components only where client directives are used. | Strong fit if hydration remains explicit. |
| Large tables | Rendering is straightforward, but mobile UX and client-side filtering can still become heavy. | Product/UX risk, not a framework blocker. |
| Vercel/Cloudflare | Both support Astro. Pure static output does not require a server adapter. | No blocker. |
| Future small dynamic data | Astro supports on-demand routes after adding an adapter. | Future path exists, but must be re-evaluated when a real dynamic requirement appears. |
| Multilingual future | Astro and Pagefind both have multilingual paths, but V1 will not prebuild i18n structure. | Not blocked; intentionally deferred. |

### Real risks

- Build time and peak memory may become operationally significant with real MDX, images, JSON-LD, and related-content computation.
- Every patch rebuilds static pages and the Pagefind index.
- A Page Inventory plus content/fact references needs strong validation or it can become difficult to author.
- React Islands can silently erode the Low-JS goal if used as the default component model.
- Pagefind’s production index size, load latency, and filter behavior depend on real content and device conditions.

### Theoretical risks

- Astro cannot express the required page types: current routing, collections, MDX, and Islands cover the stated V1 models.
- Static-first prevents all future dynamic behavior: an adapter can be introduced later for specific on-demand routes.
- Thousands of entries inherently require a database: the SOP and current product boundary do not justify that conclusion.

### Unknowns

- Build time, memory, output size, and deployment duration at 1,000, 3,000, and 5,000 representative pages.
- Pagefind index size and mobile search latency at those same real-content thresholds.
- Image-processing cost with the actual volume and dimensions of game screenshots.
- Patch frequency and whether any future market/API dataset needs freshness faster than a full rebuild.

**Recommended Framework: Astro, static output by default.**

The reasons are architectural, not stylistic: Astro directly reinforces content-first static HTML and explicit hydration. Next.js can generate static sites, but its App Router and React runtime concepts add complexity without solving a present requirement; its static export also excludes several server-dependent features. Astro hybrid-first is rejected because it introduces an adapter and runtime before a dynamic use case exists.

Research snapshot: Astro core release astro@7.2.10, Next.js documentation 16.3.4, and Pagefind release v1.5.2 were current during Phase 1. Phase 2 must choose and lock compatible versions rather than treating these research versions as permanent.

## 4. Proposed Architecture

### Technology stack

| Layer | Choice | Boundary |
|---|---|---|
| Framework | Astro + TypeScript strict mode | Static output unless a later approved architecture change adds on-demand routes. |
| Styling | Tailwind CSS 4 through the official Vite plugin, plus scoped Astro CSS where clearer | No legacy Tailwind 3 integration. |
| Editorial content | Astro Content Collections using Markdown and MDX | Markdown by default; MDX only for reusable fact/entity components or genuine interaction. |
| Game facts | Module-specific JSON files validated with Zod schemas | No database in V1. |
| Page authority | Structured page registry in src/data/page-inventory.json | One authoritative value per page metadata/status field. |
| Search | Pagefind after Astro build | Static index; no search server. |
| Interaction | Native HTML/CSS/TypeScript first; React Islands for complex widgets | No site-wide React application. |
| SEO | Shared Astro components/helpers plus @astrojs/sitemap | JSON-LD only when it matches visible content. |
| Deployment | Cloudflare Workers Static Assets | Upload dist; no Astro adapter in V1. |
| Tests | Schema/inventory validation, unit tests, full build checks, and focused browser smoke tests | Exact dependencies selected in Phase 2. |

The Node version must be pinned in Phase 2 to a release satisfying Astro and every installed package engine. The spike built successfully on Node 22.16.0 but produced an engine warning from a transitive dependency requiring Node 22.19.0; Node 22.16.0 must not become the Starter default.

### Proposed directory structure

This is a Phase 1 proposal, not a scaffold created in the repository.

~~~text
/
├── game.config.ts
├── astro.config.mjs
├── wrangler.jsonc
├── package.json
├── public/
│   ├── brand/
│   └── images/
├── scripts/
│   ├── validate-content.ts
│   ├── validate-inventory.ts
│   ├── validate-links.ts
│   ├── patch-impact.ts
│   └── inventory-seed.ts
├── src/
│   ├── content.config.ts
│   ├── content/
│   │   ├── guides/
│   │   ├── meta/
│   │   ├── news/
│   │   └── pages/
│   ├── data/
│   │   ├── page-inventory.json
│   │   ├── patches.json
│   │   └── facts/
│   │       ├── heroes.json
│   │       ├── items.json
│   │       └── ...
│   ├── schemas/
│   │   ├── page-inventory.ts
│   │   ├── content.ts
│   │   ├── provenance.ts
│   │   └── facts/
│   ├── lib/
│   │   ├── catalog/
│   │   ├── facts/
│   │   ├── links/
│   │   ├── seo/
│   │   └── patches/
│   ├── layouts/
│   ├── components/
│   │   ├── content/
│   │   ├── seo/
│   │   └── islands/
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── privacy.astro
│   │   ├── terms.astro
│   │   ├── 404.astro
│   │   ├── guides/[slug].astro
│   │   ├── news/[slug].astro
│   │   ├── heroes/[...slug].astro
│   │   ├── items/[...slug].astro
│   │   └── tools/[slug].astro
│   └── styles/global.css
└── tests/
~~~

Only directories used by real Starter behavior should be created in Phase 2+. The example fact filenames are not required files: a disabled or irrelevant module must not require an empty JSON file.

### Core flow

~~~text
game.config.ts ───────┐
page-inventory.json ──┼─> validated Page Catalog
content collections ──┤          │
fact JSON ────────────┘          ├─> routes + navigation + homepage
                                ├─> metadata + canonical + JSON-LD
                                ├─> sitemap + robots + Pagefind markup
                                └─> related links + patch impact report
~~~

The validated Page Catalog is a derived runtime/build-time view, never a second manually maintained inventory.

### Recommended Deploy Target

**Default Deployment Path: Cloudflare Workers Static Assets.**

Why it fits:

1. The product is global and English-first; Cloudflare serves and caches static assets across its network close to users.
2. V1 uses Astro’s pure static output and uploads dist.
3. No Astro framework adapter is required for a purely prerendered site.
4. The build pipeline is deterministic: install, validate, Astro build, Pagefind index, then Wrangler deploy. Static asset requests are currently documented as free and unlimited; pricing must still be rechecked before each commercial launch.
5. A future project can add Worker code or the Cloudflare adapter for a small dynamic surface, but that change requires a new architecture review and targeted spike.

Recommended production flow:

~~~text
npm ci
→ validate schemas/inventory/references
→ astro check
→ astro build
→ pagefind --site dist
→ post-build link/SEO checks
→ wrangler deploy
~~~

Cloudflare Pages remains a supported alternative for teams that prefer dashboard-based Git deployments and preview URLs. Vercel is also supported, but a commercial deployment must use an appropriate paid plan because Vercel documents Hobby as non-commercial personal use. Neither alternative is the default.

## 5. Content + Data Model

### Field ownership

The rendered page model may contain many fields, but each manually edited field has exactly one owner.

| Field group | Authoritative source | Other consumers |
|---|---|---|
| Page ID, route, editorial title/description, page type, priority, publication/index states, dates, primary keyword, related pages/entities, module | page-inventory.json | Content renderer, routes, sitemap, navigation, SEO, QA, patch reports |
| Narrative body | Markdown/MDX content entry identified by pageId | Page layout and search index |
| Game names, stats, values, obtain methods, drops, patch values, provenance | Module fact JSON | Entity pages, databases, guides, tools, structured data |
| Brand, production URL, language, feature flags, navigation order | game.config.ts | Layout, canonical, feature filter, deployment metadata |
| Source research log and editorial evidence | Project research artifacts governed by the external SOP | Human/AI production workflow; selected provenance fields flow into facts/pages |

Content frontmatter should contain only the stable pageId plus fields that are truly local to the body processor. It must not repeat route, publication status, priority, indexability, updatedAt, primaryKeyword, or relationships from the Page Inventory. The content collection loader joins the content entry with the validated Page Catalog before rendering.

The resolved ContentPage model carries the complete metadata required by the SOP even though the fields have different owners. Editorial pages use the title/description stored in Page Inventory. Entity layouts derive entity names and fact-based title fragments from entityRef and the Fact SSOT; they do not copy entity names into Page Inventory. This is explicit layout behavior, not a general template language.

Plain Markdown is the default. MDX is used only when a page needs components such as FactValue, EntityLink, comparison tables, or a real interactive Island. This avoids turning every article into executable content.

### Entity data and schemas

- Each enabled entity type has its own JSON dataset and its own Zod schema.
- Shared provenance fields are defined once: source, sourceUrl, sourceType, sourceDate, lastVerified, confidence, and notes.
- Schemas may reuse the provenance shape but remain explicit per entity type; there is no universal schema engine.
- A game-specific 20% customization can add or extend an entity schema without forcing unrelated games to adopt it.
- Loaders read only enabled modules. An enabled module with a required missing/invalid dataset fails the build with a precise message. A disabled module does not require the file to exist.
- Unknown values remain absent or explicitly unverified; schemas must not fill fabricated defaults.

### Game Fact Single Source of Truth

**Authority:** src/data/facts/*.json, separated by real entity type and validated against src/schemas/facts/*.

Consumption:

- Entity pages resolve entityRef from Page Inventory and render current fact data.
- Database/list pages query the same validated dataset and never maintain a second copy.
- Guides use structured entity/fact references or MDX components for patch-sensitive values. Narrative interpretation stays in the guide, but numeric facts do not get copied into prose when a reference can render them.
- Calculators and planners receive a build-time serialized subset of the same facts.
- JSON-LD and related-content helpers may consume names/types from facts but must not invent unsupported schema fields.

Patch workflow:

~~~text
verified patch
→ update one fact record and its provenance
→ record affectedEntities in patches.json
→ reverse lookup Page Inventory relatedEntities/entityRef
→ produce affected-page report
→ human reviews narrative/meta implications
→ update Page Inventory needsUpdate and updatedAt
→ targeted QA and rebuild
~~~

The reverse lookup is a simple build-time map from entity reference to page IDs. It is not a general dependency graph.

Page updatedAt must not change automatically merely because an underlying fact changed. The page is first marked needsUpdate. After a human confirms that rendered values and surrounding advice remain correct, updatedAt is changed and needsUpdate is cleared. Fact lastVerified and page updatedAt therefore retain distinct meanings.

## 6. Page / Route Model

| Page model | Route strategy | Main inputs | Client JavaScript |
|---|---|---|---|
| Homepage | Fixed index.astro; sections query the enabled Page Catalog | Config + inventory | None by default |
| Guide | guides/[slug].astro from published GUIDE entries with contentRef | Inventory + Markdown/MDX + facts | None unless the guide embeds a real widget |
| Hub | Explicit module route, usually module/[...slug].astro with a hub entry | Inventory + module facts | None |
| Entity detail | Explicit module dynamic route from entries containing entityRef | Inventory + fact dataset | None |
| Database/list | Published DATABASE entry inside an explicit module route | Inventory + fact dataset | Optional filter/sort Island |
| Tier/meta | meta/[slug].astro only for approved P2 evidence | Inventory + MDX + facts | None by default |
| Patch/news | news/[slug].astro from NEWS entries | Inventory + Markdown/MDX + patch data | None |
| Search | Fixed search page populated by Pagefind after build | Inventory + generated HTML index | Pagefind JavaScript on search interaction |
| Calculator/planner | tools/[slug].astro with a static explanatory shell | Inventory + fact subset + React Island | Yes, only the tool |
| About/privacy/terms/404 | Fixed universal routes with inventory entries | Inventory + config + static content | None |

Static route boundary:

- Universal routes have explicit files and matching Page Inventory entries.
- Editorial families use one explicit route file per family and only generate published inventory entries.
- Entity modules use explicit module route files; the Starter does not use one universal catch-all entity engine.
- getStaticPaths consumes the enabled, published Page Catalog. Returning no paths for a disabled module generates no hub/detail pages.
- Fact data alone never creates a route. A page must exist in Page Inventory, preventing accidental thin-page explosions after data import.
- A future inventory-seed command may propose explicit entity-page entries from imported facts, but build never mutates Page Inventory and humans review generated candidates before they become authoritative.

Planned, draft, review, archived, disabled-module, and not-public entries do not generate production routes. A published page with indexable=false may remain publicly routable but receives noindex and is excluded from sitemap and Pagefind.

## 7. Page Inventory Single Source of Truth

**Authoritative source: src/data/page-inventory.json.**

JSON is chosen because it is transparent, diffable, importable from research/spreadsheet tooling, and practical for explicit entries up to the planned scale. TypeScript/Zod schemas validate it; no second PAGE_INVENTORY.md, frontmatter status copy, or config copy exists.

Minimum entry shape:

- id, route, editorial title/description where applicable, cluster, module, visibility;
- pageType and priority;
- publicationStatus;
- contentStatus, devStatus, and indexStatus for SOP workflow tracking;
- indexable, publishedAt, updatedAt, needsReview, needsUpdate;
- primaryKeyword, tags;
- contentRef or entityRef where applicable;
- relatedPages and relatedEntities;
- sources and sourceConfidence.

Derived consumers:

| Consumer | Derivation |
|---|---|
| Route generation | Select publicationStatus=published, visibility=public entries whose feature is enabled; map routes to explicit route families. |
| Sitemap | Build a set of published + indexable + enabled canonical URLs and pass it to the sitemap filter. |
| Indexability | Page layout reads indexable from the resolved entry; false emits noindex and search exclusion. |
| Navigation | Resolve configured page IDs against the enabled Page Catalog; missing IDs fail validation. |
| Homepage | Resolve configured featured page/module IDs against the same catalog. |
| Related content | Resolve relatedPages by ID, then remove non-public, disabled, or missing targets. |
| Patch impact | Reverse-index entityRef and relatedEntities to page IDs. |
| QA/reporting | Count workflow statuses and compare inventory routes with actual build output. |

Build validation fails on:

- duplicate page IDs, routes, or primary intent assignments;
- invalid status values or missing required dates;
- published entries with missing content/entity references;
- enabled-module pages with missing data;
- related page/entity references that do not exist;
- navigation/home references that do not resolve;
- indexable pages that are not public and published;
- actual generated routes absent from inventory or published inventory routes absent from output.

This makes Page Inventory the source of truth without turning it into a routing DSL. Route families remain explicit code.

## 8. SEO + Internal Linking

### Metadata and canonical

- A shared BaseLayout resolves title, description, canonical, robots directives, Open Graph fields, and updated time from Page Catalog plus game config.
- Canonical is created from the production site URL and the authoritative inventory route; staging domains are never accepted as canonical input.
- Trailing-slash policy is configured once and validated against inventory routes.
- Build validation rejects duplicate routes, duplicate canonical targets, and conflicting primary-intent assignments.

### Sitemap and robots

- @astrojs/sitemap discovers built static routes.
- Its filter consumes the indexable URL set derived from Page Inventory, so a route existing on disk is not sufficient for sitemap inclusion.
- robots.txt is generated from game config, references the sitemap, and does not invent exclusions for nonexistent admin/API routes.
- Internal search results, noindex pages, drafts, disabled modules, and thin placeholders are excluded.

### JSON-LD and breadcrumbs

- WebSite is used for the site shell.
- Article is used for qualifying guide/news content.
- BreadcrumbList is used where visible breadcrumbs exist.
- VideoGame is used only when the page visibly provides matching game information.
- FAQ markup is emitted only for visible, genuine FAQs and only when current search-engine policy makes it appropriate.
- Schema builders omit unsupported values rather than fabricating them.

### Stable internal linking

~~~text
Hub
↓
Child guide/database
↓
Related entity
↓
Related guide/tool
↑
back to owning Hub
~~~

All links use page IDs or entity references, never duplicated literal URLs in multiple content files. A resolver returns only public, published, enabled targets. Every child links to its owning Hub; Page Inventory validation checks orphan pages and broken references. Suggested sibling links remain limited and intentional rather than automatically linking every related tag.

## 9. Feature Flags

game.config.ts contains an explicit boolean object for the supported modules, for example heroes, abilities, items, gear, worlds, market, tools, tierList, and news. It is a typed configuration object, not a plugin registry.

One function derives the Enabled Page Catalog:

~~~text
raw Page Inventory
+ game.config feature booleans
+ publication state
→ Enabled Page Catalog
~~~

Every downstream consumer uses that catalog:

| When a module is disabled | Required result |
|---|---|
| Route generation | Explicit module getStaticPaths returns no entries. |
| Navigation | Module item is removed. |
| Homepage | Module card/section is removed. |
| Sitemap | Module URLs are absent. |
| Related content | Links to module pages are filtered out. |
| Internal links | Unresolvable links are removed; hard-coded dead URLs fail validation. |
| Data loading | The module dataset is not required or loaded. |
| Pagefind | No disabled pages exist in output, so they cannot enter the index. |

The Phase 1 spike verified the route and sitemap portion of this chain with both flag states. Phase 2 tests must cover every consumer listed above.

No dynamic plugin discovery, permissions, module lifecycle, or runtime registry is introduced. Adding a new 20% module means adding an explicit flag, schema/loader, routes, templates, and tests.

## 10. Performance + Interaction

### Static and JavaScript policy

- Content, navigation, cards, breadcrumbs, TOC, entity facts, database rows, metadata, and related links render as static HTML.
- Site-wide React hydration is prohibited.
- A component gets a client directive only when it needs browser state or event handling that cannot be achieved accessibly with HTML/CSS.
- Interactive code is scoped to Search, advanced Filter/Sort, Calculator, Planner, or an Interactive Table.
- Islands load with the least eager directive compatible with UX; below-fold widgets should not use immediate hydration.
- Bundle size is measured per page during QA. Phase 1 does not invent an untested byte guarantee.

### Search

Pagefind runs after astro build and writes its static bundle into dist. The default search experience loads on the search surface or upon search interaction, not on every page. Index markup excludes navigation noise and noindex content. Pagefind filters may expose pageType, module, or tags where useful.

Development expectations are explicit: a live Astro dev server does not contain a fresh Pagefind index. Search QA uses the production-like build-and-preview flow.

### Filters, calculators, and planners

- Small lists use server/build-time rendering plus native controls where possible.
- Large client-filterable datasets serialize only fields needed by the widget.
- Calculators/planners receive validated fact subsets and pure calculation functions that can be unit tested independently of React.
- Market/live API calls are not included in the generic V1. A real requirement triggers a separate freshness, caching, rate-limit, and ToS review.

### Mobile-first behavior

- Navigation remains fully usable with touch-sized controls.
- Content is not hidden merely to simplify mobile layout.
- Cards collapse to one column and progressively expand.
- TOC uses a compact disclosure/sticky strategy without blocking content.
- Tables default to labelled horizontal scrolling; high-value wide databases may offer an alternate card view.
- Filters remain reachable without covering results, and state changes are announced accessibly.
- Desktop uses available width without creating unreadably long prose lines.

### Production validation thresholds

At approximately 1,000, 3,000, and 5,000 representative pages, record:

- Astro build wall time and peak memory;
- image-processing time;
- Pagefind indexing time and index size;
- dist size and file count;
- deployment time;
- mobile search latency and large-table responsiveness.

These are re-evaluation thresholds, not performance commitments. Results must use representative content, images, JSON-LD, and relationships. If full rebuilds become operationally unacceptable, evaluate split builds, selective on-demand routes, or a different framework using measured evidence.

## 11. Risks + Unknowns

### Architecture Risks

| Risk | Mitigation now | Re-evaluation trigger |
|---|---|---|
| Over-abstraction | Explicit route families, schemas, flags, and small helpers; no plugin/adapter layers. | Two or more real sites repeat the same unsupported pattern. |
| Entity model too rigid | Shared provenance plus per-entity schemas; game-specific extensions stay local. | The second/third real game cannot map data without modifying common code. |
| Feature flag drift | One Enabled Page Catalog and consumer contract tests. | Any disabled module leaks into route/nav/home/sitemap/links. |
| Page Inventory becomes burdensome | JSON entries, schema validation, and a reviewable inventory-seed helper. | Authoring cost dominates site setup at representative scale. |
| Fact duplication in prose | Fact references/components and patch impact reporting. | Patch QA finds repeated stale numeric values. |
| Thin programmatic pages | Facts never create routes automatically; inventory and publication review are required. | Large batches have insufficient unique user value. |
| Client JavaScript growth | Astro components by default; explicit Island review and per-page bundle reporting. | React runtime appears on ordinary content pages. |
| Search index growth | Pagefind markup discipline and measured thresholds. | Index size/latency fails mobile QA. |
| Full rebuild after patches | Keep V1 static and measure real patch cadence. | Rebuild/deploy latency violates actual freshness needs. |
| Third-party data instability | Provenance, lastVerified, confidence, and human review. | Source/API/ToS changes or access becomes unreliable. |

### Verified

The following claims have direct official documentation or Phase 1 execution evidence:

- Astro defaults to prerendered static pages; on-demand routes require an adapter: [Astro on-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/).
- Content Collections provide loaders, schemas, type checking, local Markdown/MDX/JSON support, and build-time collection APIs: [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/).
- getStaticPaths generates static dynamic routes: [Astro routing reference](https://docs.astro.build/en/reference/routing-reference/#getstaticpaths).
- Astro client JavaScript is opt-in through Islands: [Astro Islands](https://docs.astro.build/en/concepts/islands/).
- Tailwind 4 uses the official Vite plugin path, and Astro MDX can load MDX in collections and render components: [Astro styling](https://docs.astro.build/en/guides/styling/#tailwind), [Astro MDX](https://docs.astro.build/en/guides/integrations-guide/mdx/).
- Astro sitemap includes generated static routes and exposes a URL filter: [Astro sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/).
- Pagefind runs after the static build and creates a search bundle without a server component; it supports filters and language-specific indexes: [Pagefind getting started](https://pagefind.app/docs/), [Pagefind filtering](https://pagefind.app/docs/filtering/), [Pagefind multilingual search](https://pagefind.app/docs/multilingual/).
- Cloudflare Workers can deploy Astro dist as static assets without the Astro adapter; static assets are globally cached, and static asset requests are currently documented as free/unlimited: [Cloudflare Astro guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/), [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
- Vercel can zero-config deploy static Astro, but its Hobby plan is limited to non-commercial personal use: [Astro on Vercel](https://vercel.com/docs/frameworks/frontend/astro), [Vercel Hobby plan](https://vercel.com/docs/plans/hobby).
- Next.js static export supports generated HTML but excludes several server-dependent features, including ISR and the default image optimizer: [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports).
- In the Phase 1 spike, one flag and one Page Inventory produced zero optional routes/sitemap URLs when disabled and one optional route/sitemap URL when enabled.

Documentation capability statements are verified as documented behavior. They are not evidence of this Starter’s production performance at scale.

### Assumed / Requires Production Validation

- Representative sites at hundreds or several thousand pages will stay within acceptable CI build time/memory.
- Pagefind will remain small and responsive enough on target mobile devices.
- A full static rebuild will meet the real patch freshness requirement.
- JSON Page Inventory remains ergonomic at the upper planned page count.
- Cloudflare deployment behavior, custom domain configuration, preview workflow, and final cache headers meet the first real game’s needs; no production deployment was performed in Phase 1.
- React Islands for calculators/planners will remain isolated and within an acceptable bundle budget.
- Real game data can be normalized into explicit per-entity schemas without a database or general schema engine.

### Technical Spike Log

**Spike 1 — Feature Flag → Page Inventory → Route → Sitemap**

- Hypothesis: an optional module can be absent without an empty data file; one feature flag and structured Page Inventory can consistently control static route generation and sitemap membership.
- Environment: repository-external directory /tmp/game-site-starter-spike.HZVuiB/site; Astro 7.2.10; @astrojs/sitemap; npm 10.9.2; actual build Node 22.16.0.
- Commands:

~~~text
npm create astro@latest -- <temp>/site --template minimal --install --no-git --yes
npm install @astrojs/sitemap
npm run build
find dist -maxdepth 4 -type f
rg -n '<loc>|heroes' dist/sitemap-0.xml
~~~

- Test: add game config, one structured inventory, sitemap filter, and heroes/[slug] route. Build once with heroes=false and once with heroes=true. No heroes fact file was created.
- Key output, disabled: output static; 1 page built; only /index.html; sitemap contained only https://example.com/.
- Key output, enabled: output static; 2 pages built; /heroes/demo/index.html existed; sitemap contained https://example.com/heroes/demo/.
- Result: PASS.
- Conclusion: explicit feature filtering through Page Inventory can keep optional routes and sitemap aligned without empty datasets or a plugin framework.
- Environment note: installing sitemap reported that undici@8.10.1 required Node >=22.19.0 while the build shell used Node 22.16.0. Build passed, but Phase 2 must pin a compatible Node version and treat engine warnings as failures in CI.

No scale benchmark was performed because synthetic empty pages would not represent real production content. No second or third spike had enough decision value.

### Content / Data Risk Notes

- Game logos, screenshots, trailers, official artwork, and brand assets require separate permission/fair-use assessment.
- Official sources are preferred for facts, but public availability does not automatically grant reuse rights.
- Third-party wikis and competitor sites may inform structure and gap analysis, not serve as sole factual or copy sources.
- Steam, Roblox, mobile-platform, market, and API data must be reviewed for current terms, rate limits, caching rules, and commercial usage.
- Scraping is a project-specific decision. The Starter must not include a generic scraper or hidden network calls.
- Community posts, videos, and comments may support labelled observations/meta discussion but need attribution and cannot become official facts.

## 12. Implementation Plan

Phase 1 ends with this proposal. The following phases are plans only.

### Phase 2 — Foundation

- Scaffold Astro, strict TypeScript, Tailwind 4, MDX, sitemap, and test tooling.
- Pin compatible Node/package versions.
- Add game.config.ts, base layouts/styles, universal routes, and Cloudflare static deployment config.
- Establish CI commands without deploying production.

### Phase 3 — Content & Data

- Implement content collections and schemas.
- Implement page-inventory.json, its validator, and derived Page Catalog.
- Implement explicit fact schemas/loaders, provenance, feature flags, reference resolution, and patch-impact reporting.
- Add representative fixture data only for tests, not fake production content.

### Phase 4 — Page Models

- Implement homepage, guide, hub, entity, database, meta, patch/news, tool shell, legal pages, and 404.
- Add explicit optional module route families and mobile-first components.
- Verify disabled-module behavior across all consumers.

### Phase 5 — SEO

- Implement metadata, canonical, robots, sitemap filtering, breadcrumbs, supported JSON-LD, duplicate prevention, and internal-link helpers.
- Add inventory/output reconciliation and broken-link checks.

### Phase 6 — Interaction

- Integrate Pagefind and production-like search QA.
- Add filter/table interaction and one reference calculator/planner Island.
- Measure and document per-page JavaScript.

### Phase 7 — QA

- Map automated and human checks to GAME_SOP_2.1 QA.
- Run schema, unit, build, link, SEO, accessibility, responsive-browser, and deployment-preview tests.
- Measure representative performance without claiming untested scale.

### Phase 8 — Real Game Smoke Test

- Clone the Starter into a separate real-game project.
- Change game config and brand, import real facts/content, enable only real modules, build, and deploy a preview.
- Run full QA and simulate one real patch update from fact change through affected-page review and republish.
- Feed only proven reusable improvements back into the Starter.

**Phase 1 hard stop:** no scaffold, package manifest, framework config, source directory, formal dependency, or Starter implementation may be added until the user explicitly approves this architecture proposal and authorizes formal coding.
