# Architecture Gap Analysis

Audit date: 2026-09-01
Scope: current `GAME_SITE_STARTER_BASED_gamesop2.1` implementation
Mode: incremental architecture audit only; no runtime code was changed

## 1. Executive verdict

**Overall: CONDITIONAL PASS.**

The starter already has a sound reusable baseline. Page Inventory, the Enabled
Page Catalog, centralized SEO helpers, strict schemas, static route
reconciliation, Pagefind search, route-scoped islands, and build audits form a
coherent architecture. A redesign, plugin framework, repository layer, or
sweeping folder refactor is not justified.

The audit found two P0 gaps and three P1 gaps worth addressing only after
approval:

| Priority | Finding | Why it is real |
|---|---|---|
| P0 | Optional fixed routes cannot actually be disabled | Turning off `guides` or `search` removes their Inventory entries from the enabled catalog, but their fixed Astro pages still build and call `getPageByRoute`, which throws. Search also directly requires the Guides hub. |
| P0 | Adding a new entity family requires edits across Stable Core | `bosses` and `classes` are outside several closed unions and duplicated registries. Supporting either requires coordinated changes to config schema, Inventory schema, loaders, validation, patch impact, route models, scripts, and a route presenter. |
| P1 | Game Fact SSOT does not yet reach guides or tools | Entity detail/database pages consume fact files correctly, but no supplied MDX fact-reference component or tool fact selector exists. A real adopter currently has no standard path to reuse a patch-sensitive value outside entity routes. |
| P1 | Brand configuration is not the complete brand source | Shared UI still hard-codes `GA`, `Field intelligence`, and `FIELD / EN`, so changing `game.config.ts` does not fully rebrand the site. |
| P1 | Capability declarations can drift before the final build gate | `builds` and `codes` flags exist without implemented route families, and Inventory does not validate module/feature/page-type compatibility. Output reconciliation catches some mismatches late, but the configuration contract is not self-explanatory. |

There is no current production Game Fact duplication because the starter ships
no production fact files. There is also no disabled entity/tool route leakage
in the audited default build.

## 2. Audit method and evidence

The audit inspected the actual implementation rather than judging the earlier
proposal alone. Evidence included:

- configuration and schemas in `game.config.ts`, `src/config/`, and
  `src/data/schemas/`;
- Page Inventory derivation in `src/core/catalog.ts` and
  `src/core/site-data.ts`;
- every fixed, editorial, entity, search, and tool route;
- fact/content/tool loaders and site/build validation;
- Header, Footer, homepage, related links, SEO, sitemap, and Pagefind markers;
- existing catalog, validation, page-model, reconciliation, and SEO tests.

The focused architecture tests completed successfully: 5 test files and 25
tests passed. An in-memory flag experiment also confirmed that
`buildEnabledPageCatalog` removes every page owned by a disabled feature. The
remaining feature gap is therefore in route realization, not catalog
filtering.

## 3. High Cohesion

### 3.1 SEO — PASS

SEO responsibilities are appropriately concentrated:

- `src/core/seo.ts` owns canonical URLs, sitemap route selection, robots text,
  base JSON-LD, Article JSON-LD, and breadcrumb data.
- `src/layouts/BaseLayout.astro` owns document-level metadata and combines base
  schema with page-specific nodes.
- `astro.config.ts` derives the sitemap allow-set from the Enabled Page Catalog.
- `src/pages/robots.txt.ts` derives the sitemap URL from the same site config.

Page templates add only the schema that belongs to their visible page model.
No refactor is recommended.

### 3.2 Config — PARTIAL

Configuration values and validation are centralized in `game.config.ts` and
`src/config/schema.ts`. Feature flag keys have one schema definition, and
`src/config/load-config.ts` is a deliberately small boundary.

The gap is presentational configuration leakage. `src/components/Header.astro`
hard-codes the `GA` mark and `Field intelligence`; `BaseLayout.astro` hard-codes
`FIELD / EN`; the homepage radar also hard-codes `GA`. These values behave like
brand configuration but do not come from `game.config.ts`.

**Finding: P1.** A real clone can update the official brand fields and still
ship the starter identity.

### 3.3 Game Facts — PARTIAL

Within entity surfaces, cohesion is good:

- fact records live under `src/data/facts/`;
- explicit Zod schemas live in `src/data/schemas/facts.ts`;
- `src/core/fact-loader.ts` is the build-time read boundary;
- the same loaded record supplies entity detail and database views;
- IDs, slugs, provenance, patch, dates, and confidence are validated.

Two gaps remain:

1. The concrete parser map is duplicated in `fact-loader.ts` and
   `site-validation.ts`, while `scripts/validate-site.ts` maintains a third
   entity-module list.
2. Only entity routes call `loadFactModule`. Guides and tools have no supplied
   fact-by-ID consumption path.

The first point is part of the P0 entity-extension finding. The second is a P1
SSOT completeness finding.

### 3.4 Content — PASS

Content responsibilities are clear:

- MDX owns narrative body content and carries only `pageId` in frontmatter.
- Page Inventory owns route, title, description, status, SEO intent, dates, and
  relationships.
- `resolveContentPages` joins both sources and rejects unknown, duplicate, or
  mismatched references.
- Editorial route families select only enabled catalog pages.

No content metadata duplication or responsibility mixing was found in the
current production content.

### 3.5 Search and Filter — PASS with one route-level exception

Search state normalization is concentrated in `src/core/search-state.ts`, and
the Pagefind lifecycle/UI is contained in `SearchIsland.tsx`. Entity filtering
is split cleanly between pure functions in `filter-state.ts` and the React
island. Neither concern leaks state, storage, telemetry, or network behavior
into ordinary pages.

The exception is not inside the search engine module: `src/pages/search.astro`
directly resolves `/guides/` to render a fallback link. That creates an
unnecessary Search → Guides dependency and is included in P0.

### 3.6 Tools — PASS

Tool validation, pure calculation/planning behavior, filesystem loading,
interactive islands, and the shared shell have distinct responsibilities.
Calculator formulas are declarative and do not execute arbitrary code.
Changing a calculator/planner definition does not affect SEO or entity Core.

No generic tool plugin framework is recommended.

## 4. Low Coupling

### 4.1 Page dependencies — MOSTLY PASS

Most pages consume stable page models from `site-data.ts`, small selectors from
`page-models.ts`, and layout components. They do not reconstruct feature,
canonical, sitemap, or related-page logic locally.

The meaningful exceptions are:

- `search.astro` requires both `/search/` and `/guides/` to be enabled;
- `guides/index.astro` and `search.astro` are fixed files even though their
  corresponding features are optional;
- each entity route repeats module-specific route assembly, detail-route map,
  database-row mapping, and detail-field mapping.

The entity repetition is acceptable at the presenter edge, but the closed Core
types and duplicated registration lists make it expensive to add or physically
remove a family.

### 4.2 Navigation, homepage, sitemap, and related content — PASS

These consumers do not maintain independent enabled/disabled states:

- navigation resolves configured page IDs against `enabledPageCatalog`;
- homepage featured pages and browse cards derive from the same catalog;
- sitemap filters indexable pages from that catalog;
- related pages resolve IDs through the enabled-page map;
- output reconciliation compares generated HTML against the catalog;
- the build audit rejects internal links to absent Inventory routes.

This is the strongest part of the current low-coupling design and should remain
unchanged.

### 4.3 Removing an entity module — PARTIAL

Disabling `heroes`, `weapons`, `items`, or `maps` is isolated: the catalog drops
the pages, the dynamic route returns no paths, and the fact file is not required
by the runtime loader. Unrelated modules continue to operate.

Physically deleting or adding an entity family is not isolated. The concrete
family vocabulary appears in at least:

- `src/config/schema.ts`;
- `src/data/schemas/page-inventory.ts`;
- `src/data/schemas/facts.ts`;
- `src/core/fact-loader.ts`;
- `src/core/site-validation.ts`;
- `src/core/entity-route-model.ts`;
- `src/core/patch-impact.ts`;
- `scripts/validate-site.ts`;
- the family route itself.

This is the P0 entity-extension gap.

### 4.4 Game Fact duplication — CURRENT PASS, FORWARD PARTIAL

No current MDX file duplicates production Game Facts, and entity lists/details
share one validated dataset. However, the repository provides no supported
fact-reference mechanism for MDX or tool definitions. Once a real guide and a
calculator both need the same patch value, duplication becomes the easiest
available path. That is why the forward-looking part is P1 rather than PASS.

## 5. Modular Design

| Module | Status | Assessment |
|---|---|---|
| Config | PARTIAL | Schema/load boundary is clear; visual brand literals are not fully derived. |
| Content | PASS | Narrative bodies are separate from publishing metadata and facts. |
| Data / Game Facts | PARTIAL | Fact files and schemas are clear; concrete module registration is duplicated and cross-surface lookup is absent. |
| Routes | PARTIAL | Explicit route families are understandable; optional fixed routes and closed entity families create real coupling. |
| SEO | PASS | Central helpers plus one layout integration point. |
| Navigation | PASS | Configured order resolved through the enabled catalog. |
| Search / Filter | PASS | Pure state modules plus page-scoped islands; Search → Guides route dependency is the exception. |
| Shared UI | PASS | Layout, legal, entity, editorial, and tool surfaces are separated at useful boundaries. |
| Tools | PASS | Definitions, evaluation, loading, shell, and islands are localized. |

Breadcrumb, provenance, and related-page markup is repeated across several
templates. The variants are small and currently consistent, so extracting more
components now would be a P2 cleanup, not a necessary architecture change.

## 6. Adaptable Design

### Game A: heroes + items + bosses — PARTIAL

- `heroes` and `items` can be enabled through config, Inventory, facts, and
  reviewed pages if the supplied schemas match the real game.
- `bosses` cannot be introduced only at the flexible edge. It requires adding a
  feature, page module/type, entity reference type, fact parser, validator
  registration, patch-impact type, validation-script entries, and route code.
- The existing hero schema also assumes a specific role vocabulary and a 1–5
  difficulty model. A game whose heroes do not use those concepts must edit its
  fact schema and presenter, which is reasonable edge customization; editing
  the generic route model and validators is not.

### Game B: classes + weapons + maps — PARTIAL

- `weapons` and `maps` are available, subject to their explicit schema fitting
  the game.
- `classes` has the same Core-edit requirement as `bosses`.
- The weapon schema assumes one fixed class list plus damage, fire rate, and
  effective range. Those fields belong in a game-specific fact schema/presenter,
  not in a universal contract.

### Game C: no heroes / bosses / market — PASS for omission

- Disabled or absent entity families generate no route, navigation item,
  homepage card, sitemap URL, related link, or Pagefind document when the
  Inventory and config are aligned.
- `market` is not a supported module, so no market output exists by default.
- Tools are disabled by setting both `calculator` and `planner` to false; there
  is no aggregate `tools` flag. This is workable but should be documented as the
  actual contract.

The starter therefore adapts well by subtraction and by configuring the four
known entity families. It does not yet adapt cleanly by adding a new entity
vocabulary, which is the important P0 gap for Games A and B.

## 7. Replaceable Modules

### Search — PASS

Pagefind-specific loading and result conversion are localized to
`SearchIsland.tsx`, `search-state.ts`, the build command, and inert
`data-pagefind-*` annotations. Replacing Pagefind would not require rewriting
route generation, SEO, Inventory, or ordinary content components.

The engine-specific annotations are repeated in templates, but leaving them in
place is harmless and removing them is mechanical. Introducing a search
provider interface today would be P2 over-abstraction.

The Search → Guides fallback link is a page composition issue, not a reason to
abstract the search engine.

### Tools — PASS

Tool data is loaded through `tool-loader.ts`; calculation/planning behavior is
pure and independent of Astro; the shell chooses one of two islands. Replacing
the calculator or planner UI remains inside the Tools boundary. No Core route,
navigation, or SEO rewrite is required.

### JSON / Content Collections → API or DB — PASS with a contained P1 seam

Facts and tools already have loader functions, so a future build-time data
source can be introduced primarily by changing those loaders. Editorial routes
use Astro Content Collection APIs directly, which is appropriate for the
current static architecture.

The validation script currently reads fact JSON separately instead of reusing
one module-definition/read boundary. A source change would therefore touch both
the fact loader and validation script. Consolidating the concrete entity
registry as part of P0 would remove that duplicate seam.

No Repository, Adapter, DAO, API client, or database abstraction should be
added before a real source requires it.

## 8. Stable Core, Flexible Edge

### Stable Core

The following behavior is stable, game-agnostic, and should change rarely:

- configuration parsing primitives and provenance contracts;
- Page Inventory publication filtering and enabled catalog derivation;
- page/content reference resolution;
- canonical, robots, sitemap, breadcrumb, and safe JSON-LD helpers;
- generated-output reconciliation and HTML/SEO/resource audits;
- generic related-page and patch-impact algorithms;
- generic entity route-record construction;
- pure search-result normalization and filter state;
- safe calculator formula evaluation and planner state encoding.

### Flexible Edge

The following is expected to vary per game:

- `game.config.ts` values and enabled features;
- `page-inventory.json` entries;
- MDX content and editorial/static copy;
- fact files and concrete fact schemas;
- entity route presenters and displayed fields;
- homepage composition and brand art direction;
- tool definitions and optional islands;
- source loaders if a real project later adopts an API, CMS, or database.

### Current Core pollution

Special game vocabulary currently leaks into Stable Core through closed
`hero | weapon | item | map` unions, concrete parser maps, patch-impact argument
types, and validation-script lists. The generic algorithms do not need to know
those names; only an explicit edge-level module definition does.

This does not justify dynamic plugin discovery. A small typed list of supported
entity module definitions is sufficient.

Static starter/legal/homepage copy lives in code, but it is already isolated in
page/component files and `static-page-copy.ts`. Moving it solely to make folder
names look purer would be P2 and is not recommended.

## 9. Feature Flag Coupling

### Single source — PASS

Boolean values have one source: `game.config.ts`, validated by the key list in
`src/config/schema.ts`. No second flag object was found in navigation,
homepage, sitemap, or related-content code.

### Consumer consistency

| Consumer | Status | Evidence |
|---|---|---|
| Enabled Page Catalog | PASS | `buildEnabledPageCatalog` filters public + published + enabled feature. |
| Navigation | PASS | Resolves configured IDs only through the enabled map. |
| Homepage featured/browse | PASS | Both derive from enabled catalog exports. |
| Sitemap | PASS | Indexable URLs derive from enabled catalog. |
| Related content/internal links | PASS | Related IDs resolve through the enabled map; build audit rejects dead routes. |
| Entity routes | PASS | Dynamic route files return no paths when their module flag is false. |
| Meta/news routes | PASS | Dynamic routes return no paths when their flags are false. |
| Tool routes | PASS | Tool pages are selected from the enabled catalog; both tool flags false yields no paths. |
| Guides hub | FAIL | Fixed route still executes and throws when `guides` is disabled. |
| Search | FAIL | Fixed route still executes when disabled and also requires enabled Guides. |
| Data loading | PASS | Runtime fact loader skips disabled modules and requires valid data when enabled. |
| Pagefind | PASS | Only emitted indexable HTML enters the index. |

### Compatibility validation — PARTIAL

Inventory schema validates each `feature`, `module`, `pageType`, and
`entityType` independently, but it does not verify supported combinations. A
Heroes page can be accidentally gated by `items`, for example. The final output
reconciliation will usually fail, but the error occurs later than necessary and
does not directly explain the mismatched ownership.

This validation should consume the same explicit module definitions proposed
for the P0 entity-extension fix.

## 10. Refactor priority

### P0 — handle after explicit approval

#### P0-1: Make optional fixed routes truly optional

Minimum necessary change:

1. Give Guides hub and Search route generation a `getStaticPaths`-controlled
   boundary, as already used by entity/editorial/tool families.
2. Do not render Search's Guides fallback unless that related page resolves
   from the enabled catalog.
3. Add production-output tests for `guides=false` and `search=false`, not only
   pure catalog tests.

Do not redesign all routes. Only the two optional fixed families need a route
shape capable of emitting zero paths.

#### P0-2: Centralize explicit entity module definitions at the flexible edge

Minimum necessary change:

1. Define one typed, explicit entity-module list containing the module key,
   entity type, route segment, parser/schema, and presenter-owned label.
2. Make fact loading, validation, patch-impact type validation, and generic
   entity route construction consume that list.
3. Keep each concrete fact schema and route presenter explicit and
   game-specific.
4. Add `bosses` or `classes` by extending the edge definition, schema, data,
   Inventory, presenter, and tests without editing generic Core algorithms.

This is not a runtime plugin registry and should not include discovery,
permissions, lifecycle hooks, or dependency injection.

### P1 — valuable follow-up after P0

#### P1-1: Add a narrow fact-consumption path for content and tools

Implement this with the first approved real-game dataset, not speculatively.
The minimum useful contract is a build-time fact lookup by module/entity/field
plus one safe MDX rendering component. Tools should reference a fact ID/field
only when a real formula needs shared patch data.

Do not add a database repository layer or universal expression language.

#### P1-2: Complete the brand configuration boundary

Derive or configure the shared mark, header tagline, and coordinate locale from
`game.config.ts`. Keep long-form homepage copy at the flexible page edge.

#### P1-3: Clarify and validate supported capabilities

Either mark `builds` and `codes` explicitly as reserved/unimplemented or remove
them from the public configurable feature contract until their routes exist.
Validate feature/module/page-type/entity-type compatibility using the same
entity/module definitions as P0-2.

### P2 — record only; do not schedule

- Extract repeated breadcrumbs, related-page lists, or provenance ledgers only
  if a real change begins to diverge across templates.
- Move static copy out of `src/core` only if a CMS/content requirement appears.
- Add a search-provider abstraction only if a second search implementation is
  actually adopted.
- Add Repository/Adapter layers only when an API or database becomes real.
- Create an aggregate `tools` flag only if product requirements need tools to
  switch as one group.

## 11. Recommended decision

Approve a small follow-up refactor limited to P0-1 and P0-2 first. They repair
actual feature-flag behavior and remove the main blocker to Games A/B without
disturbing the catalog, SEO, content, tools, or build-audit architecture.

Treat P1-1 as part of the real-game smoke test, because the correct fact fields
cannot be designed responsibly before real data exists. P1-2 and P1-3 are small
configuration-hardening changes. Leave every P2 item untouched.
