# GAME_SITE_STARTER V2.6.5 Capability Gap Audit Against Frozen Product Contract v0.2

**Status:** Evidence-backed read-only architecture audit  
**Audit date:** 2026-09-30  
**Starter baseline:** `starter-v2.6.5` at `29b25559cf2af859bca359c7f7fda686a4803c95`  
**Contract baseline:** Commercial Game Site Product Contract v0.2  
**Scope:** Audit only. No Contract, Starter, Pattern Library, reference fixture, Acceptance Gate, or release implementation is authorized by this report.

## A. Executive Summary

GAME_SITE_STARTER V2.6.5 is fundamentally a strong reusable Core with several well-tested subsystems, not a failed architecture requiring wholesale restructuring. Its strongest mechanisms are the Runtime Page Inventory and publication gates, exact route/output reconciliation, SEO/canonical/robots/sitemap foundation, media manifest and rendered-output audit, media-needs decision-table projection, disabled-by-default monetization seam, related-page resolution, and fail-closed validation/build pipeline.

The principal finding is layered rather than binary:

- The Core is strong enough to preserve and evolve.
- Nine Starter-relevant capabilities are materially present but need hardening.
- Four genuine portable Core gaps remain: accessible dismissible-navigation behavior, browser-level breakpoint/keyboard regression coverage, general production-residue protection, and legal-draft residue protection.
- Twenty-one Contract capabilities primarily belong outside Starter in Pattern Library, Game Adaptation, Project Content, Reference Regression, Acceptance Gate, or Release Governance.
- The current repository has extensive automated tests, but those tests are not a Capability Registry baseline, Reference A/B/C suite, independent assembled-site gate, or cross-version Capability Delta.

Support-status counts:

| Status | Count |
|---|---:|
| PROVEN | 6 |
| PARTIAL | 9 |
| GAP | 4 |
| OUTSIDE_STARTER | 21 |
| UNVERIFIED | 1 |
| **Total** | **41** |

Starter-responsibility counts:

| Responsibility | Count |
|---|---:|
| DIRECT | 12 |
| SEAM | 8 |
| EXTERNAL | 21 |
| NOT_APPLICABLE | 0 |
| **Total** | **41** |

True Core-gap priority counts:

| Priority | Count |
|---|---:|
| P1 | 4 |
| P2 | 0 |
| NIT | 0 |

The frozen V2.6.5 repository should not be modified. Future implementation, if separately authorized after independent review, should start from a new candidate based on the frozen source.

## B. Audit Scope

This audit compares all 41 frozen Product Contract v0.2 Capability IDs with the frozen V2.6.5 Starter. It inspects source, tests, configuration, scripts, current example content, and supporting documentation. It does not evaluate an assembled real-game site and does not claim that project-owned content, identity, media, legal accuracy, or human review is complete.

Inspected areas include `package.json`, lockfile/runtime configuration, Astro/Vitest/Wrangler configuration, `.github`, `docs`, `public`, `scripts`, `src`, and `tests`; navigation, mobile behavior, publication/draft handling, SEO, Pagefind, media, video, article composition, related content, FAQ, tables, ads, accessibility, legal defaults, output audit, and release infrastructure were traced to actual code and tests.

Excluded as primary evidence: `node_modules`, generated caches, absent `dist`, historical implementation claims without current code/test support, and any unexecuted live-site or external-platform behavior.

## C. Frozen Inputs and Provenance

| Item | Verified value |
|---|---|
| Execution workspace | `/Users/randyz/work/coding/hot_words_web` |
| `realpath .` | `/Users/randyz/work/coding/hot_words_web` |
| Frozen Contract | `template/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md` |
| Contract title/version | `Commercial Game Site Product Contract v0.2`; `0.2` |
| Contract checksum before audit | `3fe0c98d7e98f963de37fd80b3f2dbe33a822b810a1f268ec4aaef8dad90682a` |
| Supporting 5-site audit | `template/5_SITE_PATTERN_CAPABILITY_AUDIT.md` |
| 5-site checksum before audit | `579ad63a6662f2ad2c2d937346538d914381cacf042a89cb3d905f6685c50abf` |
| Starter repository | `Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.6.5` |
| Repository toplevel | Exact expected path |
| Frozen commit | `29b25559cf2af859bca359c7f7fda686a4803c95` |
| Tag at HEAD | `starter-v2.6.5` |
| Starter tree before audit | Clean |

Contract freeze verification passed: 41 active records; 31 migrated v0.1 records; 10 new v0.2 records; Applicability counts REQUIRED 25, CONDITIONAL 10, OPTIONAL 1, PROHIBITED 5; Severity counts P0 0, P1 35, P2 6, NIT 0. `TL-03` uses `Behavior-to-policy mapping + policy accuracy review`. Section AE treats the Capability Registry as the authoritative requirement set and this report as a separate evidence-backed Starter Capability Support Baseline; registry membership was never treated as proof of support.

## D. Validation Performed

Evidence hierarchy was applied in this order: source, executed tests, configuration, scripts, safely verified behavior, documentation, historical reports.

| Validation | Result |
|---|---|
| Runtime preflight | Shell default `v22.16.0` was below the repository engine floor; preinstalled `/Users/randyz/.nvm/versions/node/v22.22.0` exactly matched `.nvmrc` and was used without installation. |
| `npm test` under Node 22.22.0 | PASS: 38 files, 485 tests. |
| `npm run validate` under Node 22.22.0 | PASS: 8 enabled pages, 1 content entry. |
| `npm run check` under Node 22.22.0 | PASS: Astro checked 128 files with 0 errors, warnings, or hints; 38 files and 485 tests passed. |
| Expected content warnings | Empty disabled `meta` and `news` collections only; no validation failure. |
| `npm run build` | Not run against the frozen checkout because `dist/` was absent and the task permits exactly one new file. Build behavior is secondary-validated by isolated fixture build tests such as `tests/media-build.test.ts` and `tests/evidence-build.test.ts`; current-checkout generated output is therefore not claimed. |

Environment compatibility was resolved using an already-installed runtime. No dependency, package, runtime, or network installation occurred.

## E. Contract Interpretation Rules

1. Product-level REQUIRED does not imply DIRECT Starter ownership.
2. A source mechanism without contract-aligned evidence is PARTIAL or UNVERIFIED, not PROVEN.
3. PROVEN means the complete Starter responsibility, not the complete assembled-site obligation, is implemented and meaningfully tested.
4. A provider-specific implementation does not prove a provider-neutral seam.
5. An image field does not prove stable dimensions, rights, credit, fallback, or complete media architecture.
6. Unit and build tests do not substitute for independent assembled-site acceptance or cross-version release governance.
7. Current absence is not described as historical regression; no older Starter was audited here.
8. Documentation can clarify intent but cannot promote a capability to PROVEN by itself.

## F. Starter Responsibility Model

| Responsibility | Meaning in this audit |
|---|---|
| DIRECT | V2.6.5 must itself supply the portable behavior and its baseline evidence. |
| SEAM | V2.6.5 must supply a stable reusable primitive, schema, adapter boundary, or hook; another layer completes the product decision. |
| EXTERNAL | The requirement is valid but is primarily fulfilled by Pattern, Adaptation, Content, Reference, Acceptance, or Release layers. |
| NOT_APPLICABLE | No meaningful Starter obligation exists. No v0.2 row was placed here because every external row still has a valid framework-level owner. |

## G. 41-ID Capability Matrix

| Capability ID | Domain | Capability Name | Applicability | Severity | Contract Implementation Owner | Starter Responsibility | Current V2.6.5 Mechanism | Implementation Form | Evidence | Support Status | Gap / Risk | Recommended Architecture Action | Future Layer |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GI-01 | Game Identity | Verified identity vocabulary | REQUIRED | P1 | GAME ADAPTATION | EXTERNAL | Configurable brand, module definitions, page inventory, and content/fact schemas provide adoption points. | EXTERNAL | `game.config.ts`; `src/config/schema.ts`; `src/data/entity-modules.ts`; `tests/brand.test.ts` | OUTSIDE_STARTER | Core cannot verify project vocabulary or taxonomy sources. | Keep config/schema seams; require project taxonomy audit. | GAME ADAPTATION |
| GI-02 | Game Identity | Game-specific recognition | REQUIRED | P1 | GAME ADAPTATION | EXTERNAL | Neutral fallback theme and replaceable brand prevent a forced game identity. | EXTERNAL | `src/styles/theme.css`; `game.config.ts`; `tests/theme.test.ts` | OUTSIDE_STARTER | Only a human can judge unmistakable game recognition. | Keep the reverse identity test outside Core. | ACCEPTANCE GATE |
| VF-01 | Visual Fidelity | Complete theme adaptation | REQUIRED | P1 | GAME ADAPTATION | SEAM | Semantic color and page-family tokens plus brand mark/logo config; typography, spacing, density, shape, icon, and state tokens are not equally exposed. | CONFIGURABLE CORE | `src/styles/theme.css`; `src/styles/page-families.css`; `src/core/brand.ts`; `tests/theme.test.ts` | PARTIAL | Adaptation can change palette and mark, but must fight hardcoded typography and broad component geometry. | Extend only semantic adaptation roles; leave actual game identity external. | CORE STARTER |
| VF-02 | Visual Fidelity | Usable visual states | REQUIRED | P1 | CORE STARTER + GAME ADAPTATION | DIRECT | Focus styles, reduced-motion override, responsive layouts, tap-size rules, and contrast-oriented shared tokens exist. | CONFIGURABLE CORE | `src/styles/global.css`; `tests/theme.test.ts`; `tests/navigation.test.ts` | PARTIAL | No current automated contrast or representative breakpoint behavior suite; theme overrides are not programmatically constrained. | Preserve styles and add portable Core state constraints; assembled verification remains an Acceptance Gate responsibility. | CORE STARTER |
| MC-01 | Media Completeness | Required media resolution | CONDITIONAL | P1 | GAME ADAPTATION | SEAM | Strict local asset manifest, fixed hero/gallery/trailer slots, file checks, rendering, and output reconciliation. | REUSABLE PRIMITIVE | `src/data/schemas/media.ts`; `src/data/media/catalog.ts`; `scripts/media-validation.ts`; `tests/media-build.test.ts` | PARTIAL | Images carry no intrinsic width/height or aspect metadata; stable dimensions are not guaranteed. | Add minimal dimension/aspect contract and truthful unavailable behavior. | CORE STARTER |
| MC-02 | Media Completeness | No fabricated or misrepresented media | PROHIBITED | P1 | GAME ADAPTATION + PROJECT CONTENT | EXTERNAL | Schema distinguishes image/video and allows decorative empty alt; source URL is required. | EXTERNAL | `src/data/schemas/media.ts`; `tests/media.test.ts` | OUTSIDE_STARTER | Code cannot determine whether an asset is fake gameplay or misleading evidence. | Preserve typed media; require provenance and visual claim review. | GAME ADAPTATION |
| MC-03 | Media Completeness | Accessible, sourced media | CONDITIONAL | P1 | CORE STARTER + GAME ADAPTATION | DIRECT | Descriptive/empty alt validation, optional caption, HTTPS source URL, privacy-enhanced YouTube, and source link rendering. | REUSABLE PRIMITIVE | `src/data/schemas/media.ts`; `GameMedia.astro`; `VideoEmbed.astro`; `tests/media-rendering.test.ts`; `tests/media-audit.test.ts` | PARTIAL | No explicit rights, credit, license, transcript/caption-track, or accessible-equivalent model. | Extend one compact media record; do not build a DAM. | CORE STARTER |
| HR-01 | Homepage Routing | Primary orientation route | REQUIRED | P1 | PATTERN LIBRARY + GAME ADAPTATION | EXTERNAL | Current fixed portal derives Start Here from configured featured pages. | EXTERNAL | `src/components/home/home-model.ts`; `GameHero.astro`; `tests/homepage.test.ts` | OUTSIDE_STARTER | Current composition is one pattern, not a universal Core requirement. | Move ownership to a page pattern using existing catalog seams. | PATTERN LIBRARY |
| HR-02 | Homepage Routing | Deeper browsing routes | REQUIRED | P2 | PATTERN LIBRARY + GAME ADAPTATION | EXTERNAL | Portal categories, systems, updates, and Browse All derive from enabled pages and omit empty sections. | EXTERNAL | `home-model.ts`; `PageCollection.astro`; `tests/homepage.test.ts` | OUTSIDE_STARTER | Usefulness and breadth depend on real content and selected composition. | Validate destinations in Pattern and Acceptance layers. | PATTERN LIBRARY |
| IA-01 | Information Architecture | Game-derived taxonomy | REQUIRED | P1 | GAME ADAPTATION | EXTERNAL | Module registry and inventory are configurable, but shipped entity families are examples. | EXTERNAL | `src/data/entity-modules.ts`; `page-inventory.json`; `tests/entity-modules.test.ts` | OUTSIDE_STARTER | Core must not choose a game's taxonomy. | Retain extension seam; require project route/taxonomy mapping. | GAME ADAPTATION |
| IA-02 | Information Architecture | Honest destinations | REQUIRED | P1 | CORE STARTER + ASSEMBLED PROJECT | DIRECT | Navigation resolves only enabled pages, invalid references fail, internal links are audited, optional routes can emit zero paths. | CONFIGURABLE CORE | `src/core/site-data.ts`; `src/core/site-validation.ts`; `src/core/html-audit.ts`; `tests/site-data.test.ts`; `tests/optional-routes.test.ts` | PROVEN | Assembled content truth still needs acceptance, but the Core destination guarantee is strong. | Preserve resolver and fail-closed audit semantics unchanged. | NO CHANGE |
| IA-03 | Information Architecture | Search seam and activation decision | REQUIRED | P1 | CORE STARTER + GAME ADAPTATION | SEAM | Feature-gated Pagefind route, local UI, query/result normalization, empty/error states, artifact validation, and size budget. | ONE-OFF IMPLEMENTATION | `SearchIsland.tsx`; `search-state.ts`; `pagefind-artifacts.ts`; `tests/search-state.test.ts`; `tests/pagefind-artifacts.test.ts` | PARTIAL | UI imports `/pagefind/pagefind.js` directly; no provider-neutral adapter or recorded enablement rationale exists. | Keep Pagefind as one adapter; define a small provider-neutral contract and activation record. | CORE STARTER |
| CU-01 | Content Utility | Actionable answer | REQUIRED | P1 | PROJECT CONTENT | EXTERNAL | MDX and article shells can present structured prose, but utility is authored. | EXTERNAL | `src/content/guides/getting-started.mdx`; `WikiArticle.astro` | OUTSIDE_STARTER | Starter cannot prove title-to-answer depth or player usefulness. | Enforce through editorial acceptance, not Core fields. | PROJECT CONTENT |
| CU-02 | Content Utility | Structured long-form content | CONDITIONAL | P2 | PATTERN LIBRARY + PROJECT CONTENT | EXTERNAL | Prose, TOC, FAQ, Quick Facts, media, tables, and article shells exist in varying forms. | EXTERNAL | `WikiArticle.astro`; `FAQ.astro`; `QuickFacts.astro`; global `.table-scroll` styles | OUTSIDE_STARTER | Requiring every composition in Core would bloat it. | Package reusable article compositions as presentation patterns. | PATTERN LIBRARY |
| DS-01 | Decision Support | Supported comparisons | CONDITIONAL | P1 | PROJECT CONTENT | EXTERNAL | Fact schemas expose patch, provenance, and confidence but do not author comparison methods. | EXTERNAL | `src/data/schemas/facts.ts`; `provenance.ts`; `tests/facts.test.ts` | OUTSIDE_STARTER | Method/version truth is claim-specific. | Require method and version in project content when applicable. | PROJECT CONTENT |
| DS-02 | Decision Support | Recovery and next action | CONDITIONAL | P2 | PROJECT CONTENT + PATTERN LIBRARY | EXTERNAL | Related Pages and 404 recovery primitives can express next actions. | EXTERNAL | `RelatedPages.astro`; `src/pages/404.astro` | OUTSIDE_STARTER | Whether recovery is required is task-specific. | Compose through problem-guide patterns and content review. | PROJECT CONTENT |
| FR-01 | Freshness | Distinct time semantics | REQUIRED | P1 | CORE STARTER | DIRECT | Page inventory separates `publishedAt` and `updatedAt`; entity facts separate `patch` and `updatedAt`; dates are rendered semantically. | CONFIGURABLE CORE | `page-inventory.ts`; `facts.ts`; `EditorialArticle.astro`; `EntityDetail.astro`; `tests/catalog.test.ts`; `tests/facts.test.ts` | PARTIAL | No explicit live-status/provenance model, and patch/version is not a general page/content primitive. | Add the minimum shared version/live semantic types without analytics machinery. | CORE STARTER |
| FR-02 | Freshness | Truthful dynamic labels | CONDITIONAL | P1 | GAME ADAPTATION + PROJECT CONTENT | EXTERNAL | Homepage latest updates use deterministic `updatedAt`; no Popular/Trending engine is shipped. | EXTERNAL | `home-model.ts`; `tests/homepage.test.ts` | OUTSIDE_STARTER | Provenance of editorial/data-driven labels is project-owned. | Keep unsupported labels absent; verify any future labels in content acceptance. | PROJECT CONTENT |
| ID-01 | Related / Internal Discovery | Relevant next route | CONDITIONAL | P1 | CORE STARTER + GAME ADAPTATION | SEAM | Inventory stores explicit relations; resolver filters to enabled catalog; reusable Related Pages renders real destinations. | REUSABLE PRIMITIVE | `page-inventory.ts`; `site-data.ts#getRelatedPages`; `RelatedPages.astro`; `tests/site-data.test.ts` | PROVEN | Adaptation still owns relevance and corpus decision. | Preserve explicit relation seam and enabled-page filtering. | NO CHANGE |
| ID-02 | Related / Internal Discovery | Enhanced related ranking | OPTIONAL | P2 | PATTERN LIBRARY + GAME ADAPTATION | EXTERNAL | No enhanced tag/taxonomy/manual precedence engine is selected. | EXTERNAL | Explicit relation array only in `page-inventory.ts` | OUTSIDE_STARTER | Optional ranking strategy should not become mandatory Core policy. | Implement only in a selected Pattern/Adaptation strategy. | PATTERN LIBRARY |
| SEO-01 | SEO | Unique index metadata | REQUIRED | P1 | CORE STARTER + GAME ADAPTATION | DIRECT | Inventory title/description constraints, canonical builder, rendered tags, and generated audit for duplicates/canonical correctness. | CONFIGURABLE CORE | `src/core/seo.ts`; `BaseLayout.astro`; `html-audit.ts`; `tests/seo.test.ts`; `tests/html-audit.test.ts` | PROVEN | Project copy quality remains external; portable integrity is proven. | Preserve canonical and inventory-authority semantics. | NO CHANGE |
| SEO-02 | SEO | Share metadata | REQUIRED | P1 | CORE STARTER + GAME ADAPTATION | DIRECT | OG/Twitter title, description, URL, locale, site name, and optional X handle are rendered. | CONFIGURABLE CORE | `BaseLayout.astro`; source inspection; 485-test pass | PARTIAL | No OG/Twitter share-image record, fallback chain, or generated media audit. | Reuse the hardened media model for share-image selection/fallback. | CORE STARTER |
| SEO-03 | SEO | Crawl and structured meaning | REQUIRED | P1 | CORE STARTER + GAME ADAPTATION | DIRECT | Sitemap filters enabled indexable routes, robots points to sitemap, JSON-LD base graph plus Article/Breadcrumb nodes, and generated-file audits exist. | CONFIGURABLE CORE | `astro.config.ts`; `seo.ts`; `robots.txt.ts`; `audit-build.ts`; `tests/seo.test.ts`; `tests/html-audit.test.ts` | PROVEN | Page-type selection still requires project truth, but Core does not emit FAQ schema without visible data. | Preserve truthful schema selection and exact sitemap audit. | NO CHANGE |
| AX-01 | Accessibility | Accessible dismissible navigation | CONDITIONAL | P1 | CORE STARTER | DIRECT | Mobile navigation uses nested native `details/summary`. | HARDCODED IMPLEMENTATION | `MobileNav.astro`; `tests/navigation.test.ts` verifies structure/touch size only | GAP | No Escape close, focus restoration, explicit expanded/control relationship, or browser interaction test. | Add one portable navigation behavior contract and focused tests. | CORE STARTER |
| AX-02 | Accessibility | Baseline inclusive navigation | REQUIRED | P1 | CORE STARTER + GAME ADAPTATION | DIRECT | Skip link, `:focus-visible`, reduced-motion override, and 44–48 px key controls are present. | REUSABLE PRIMITIVE | `BaseLayout.astro`; `global.css`; source-oriented `theme.test.ts` and `navigation.test.ts` | UNVERIFIED | Implementation appears complete, but no current automated/manual accessibility result proves the combined contract. | Retain implementation; prove it in browser/accessibility acceptance before promotion. | ACCEPTANCE GATE |
| AX-03 | Accessibility | Breakpoint and keyboard integrity | REQUIRED | P1 | CORE STARTER + ASSEMBLED PROJECT | DIRECT | Responsive CSS and isolated component tests exist; historical docs describe manual checks. | TEST-ONLY | `global.css`; unit/source tests; no current browser E2E suite in package or CI | GAP | No executable supported-breakpoint overflow/keyboard-path contract exists in the frozen repository. | Add a small Core browser matrix; assembled acceptance remains separate. | CORE STARTER |
| PP-01 | Production Polish | Recovery and honest states | REQUIRED | P1 | CORE STARTER + GAME ADAPTATION | DIRECT | Custom 404, enabled-catalog publication filter, search empty/error states, optional empty rendering, exact route audit. | CONFIGURABLE CORE | `404.astro`; `catalog.ts`; `SearchIsland.tsx`; `html-audit.ts`; `tests/catalog.test.ts`; `tests/homepage.test.ts` | PROVEN | Project copy and usefulness remain external; portable truthfulness is well covered. | Preserve fail-closed routing and zero-output empty semantics. | NO CHANGE |
| PP-02 | Production Polish | No production residue | PROHIBITED | P1 | GAME ADAPTATION + PROJECT CONTENT | SEAM | Documentation instructs replacement, but no production residue scanner or adoption-completeness gate exists. | ABSENT | `game.config.ts` retains example domain/brand; `static-page-copy.ts` contains `Replace`/`Add`; `site-validation.ts` does not block them | GAP | Current validation can pass while template brand/domain/legal markers remain publishable. | Add narrow configurable residue/adoption assertions; do not encode project content. | CORE STARTER |
| TL-01 | Trust / Legal Safety | No draft legal residue | PROHIBITED | P1 | GAME ADAPTATION + PROJECT CONTENT | DIRECT | Privacy/Terms pages visibly warn that text is starter material and set `needsReview`, but those pages are still public/published and review state does not block output. | HARDCODED IMPLEMENTATION | `static-page-copy.ts`; `LegalPage.astro`; `page-inventory.json`; `static-page-copy.test.ts`; `site-validation.ts` | GAP | Literal `Replace` and `Add` instructions can ship in a successful validation path. | Default legal routes to unavailable or fail final validation until project policy content is approved. | CORE STARTER |
| TL-02 | Trust / Legal Safety | No fabricated identity or affiliation | PROHIBITED | P1 | GAME ADAPTATION | SEAM | `buildBaseSeoGraph` unconditionally emits an `Organization` named from generic `config.brand.name`, links it as `WebSite.publisher`, and `BaseLayout` includes that graph on every page; no verified-identity gate exists in the brand schema. | CONFIGURABLE CORE | `src/core/seo.ts#buildBaseSeoGraph`; `src/layouts/BaseLayout.astro`; `src/config/schema.ts`; `game.config.ts`; `tests/seo.test.ts`; `tests/brand.test.ts`; `tests/config.test.ts` | PARTIAL | Generic brand/site configuration is converted into an unverified Organization/publisher claim. Core owns safe non-assertive structured-data defaults; Game Adaptation owns the truth of operator/company/official/affiliation claims; Acceptance Gate verifies those claims against real project evidence. | Gate or omit assertive identity nodes by default while preserving truthful page/site schema; require explicit project evidence before operator/official/affiliation claims. | CORE STARTER |
| TL-03 | Trust / Legal Safety | Behavior-matched legal claims | CONDITIONAL | P1 | ASSEMBLED PROJECT | EXTERNAL | Static default behavior is described in starter copy, but no behavior-to-policy mapping artifact exists. | EXTERNAL | `static-page-copy.ts`; `ads.ts` default disabled; no mapping record | OUTSIDE_STARTER | Actual analytics, ads, embeds, hosting, forms, and policy truth exist only after assembly. | Validate policy accuracy against the assembled project, not a generic legal engine. | ACCEPTANCE GATE |
| MR-01 | Monetization Readiness | Stable optional inventory | REQUIRED | P2 | CORE STARTER + PATTERN LIBRARY | SEAM | Typed semantic AdSlot, independent enablement, provider edge, zero-output disabled state, optional dimensions, and generated ad audit. | REUSABLE PRIMITIVE | `ads.ts`; `AdSlot.astro`; `ProjectAd.astro`; `tests/ads.test.ts`; ad checks in `html-audit.ts` | PROVEN | Obstruction and provider delivery remain Pattern/Acceptance concerns by design. | Preserve semantics, disabled default, and provider separation unchanged. | NO CHANGE |
| MR-02 | Monetization Readiness | Value-backed depth | REQUIRED | P1 | PATTERN LIBRARY + GAME ADAPTATION | EXTERNAL | Current portal derives only real enabled destinations and de-duplicates them. | EXTERNAL | `home-model.ts`; `tests/homepage.test.ts` | OUTSIDE_STARTER | Content value and browsing depth are assembled product judgments. | Enforce in selected patterns and human destination review. | PATTERN LIBRARY |
| PA-01 | Product Acceptance | Assembled-site acceptance | REQUIRED | P1 | ASSEMBLED PROJECT | EXTERNAL | Build audit checks one repository output, but it is not independent assembled-site acceptance across Pattern and Adaptation. | EXTERNAL | `scripts/audit-build.ts`; `docs/QA_CHECKLIST.md` | OUTSIDE_STARTER | Unit/build checks cannot prove human identity, media value, legal truth, or cross-layer composition. | Create an independent capability-ID acceptance report outside Core. | ACCEPTANCE GATE |
| PA-02 | Product Acceptance | Recorded exceptions | CONDITIONAL | P2 | RELEASE GOVERNANCE | EXTERNAL | No v0.2 exception record schema/workflow is implemented. | EXTERNAL | No source/config/test artifact | OUTSIDE_STARTER | Exception lifecycle is governance, not runtime Starter behavior. | Define only when Release Governance is authorized. | RELEASE GOVERNANCE |
| MC-04 | Media Completeness | Media Needs Assessment | REQUIRED | P1 | GAME ADAPTATION + PROJECT CONTENT | EXTERNAL | V2.6.5 contains a valuable per-page decision-table parser, inventory resolution, lifecycle states, final/evidence projections, and fail-closed tests. | EXTERNAL | `src/core/media-readiness.ts`; `scripts/validate-site.ts`; `tests/media-readiness.test.ts`; `tests/evidence-build.test.ts` | OUTSIDE_STARTER | The implementation is strong existing work, but the Contract assigns assessment implementation to Game Adaptation + Project Content and verification to Acceptance Gate; its presence does not establish durable mandatory Core ownership. | Preserve the current machinery provisionally as valuable implementation; re-evaluate its long-term layer during future Acceptance/Game Adaptation architecture design. Future relocation or deletion is not automatically a Core regression. | ACCEPTANCE GATE |
| MC-05 | Media Completeness | Video capability and usage decision | REQUIRED | P1 | CORE STARTER + GAME ADAPTATION + PATTERN LIBRARY | SEAM | Local MP4/WebM and YouTube rendering, poster for local video, fixed trailer slot, privacy-enhanced embed, controls, provenance link, and media-decision intended placement. | REUSABLE PRIMITIVE | `media.ts`; `VideoEmbed.astro`; `media-readiness.ts`; `tests/media-rendering.test.ts`; `tests/media-audit.test.ts` | PARTIAL | Provider model is hardcoded; record lacks duration, credit, transcript/subtitle, consent/loading policy, and explicit fallback. | Harden to a provider-neutral record/renderer boundary; keep placement and use decisions external. | CORE STARTER |
| RI-01 | Regression / Release Integrity | No Pattern/Core duplication | PROHIBITED | P1 | PATTERN LIBRARY | EXTERNAL | Current repository has no separate Pattern Library to inspect. | EXTERNAL | Layer absent; current fixed compositions are Starter-local | OUTSIDE_STARTER | Cannot prove a boundary against a layer that does not yet exist. | Make future patterns depend on Core primitives and review dependencies. | PATTERN LIBRARY |
| RI-02 | Regression / Release Integrity | Reference-project regression | REQUIRED | P1 | REFERENCE FIXTURES | EXTERNAL | Isolated test fixtures exist, but approved Reference A/B/C projects and reports do not. | EXTERNAL | `tests/fixtures`; no A/B/C assembled fixtures | OUTSIDE_STARTER | Component/build fixtures do not prove the three contract archetypes. | Create references only in the authorized Reference layer. | REFERENCE REGRESSION |
| RI-03 | Regression / Release Integrity | Cross-version regression gate | REQUIRED | P1 | RELEASE GOVERNANCE | EXTERNAL | CI runs check/build for the current tree but loads no prior baseline and emits no Capability Delta. | EXTERNAL | `.github/workflows/ci.yml`; no baseline/delta artifact | OUTSIDE_STARTER | File/test continuity is not capability continuity. | Add prior/candidate baseline comparison in future Release Governance. | RELEASE GOVERNANCE |
| RI-04 | Regression / Release Integrity | Capability lifecycle integrity | REQUIRED | P1 | RELEASE GOVERNANCE | EXTERNAL | Git tag/commit provenance exists; no registry-history automation or linked lifecycle records exist in Starter. | EXTERNAL | Git provenance; current Contract registry is outside repository | OUTSIDE_STARTER | Starter runtime must not become the registry authority. | Keep registry history in Release Governance with explicit links. | RELEASE GOVERNANCE |

## H. Starter Capability Support Baseline

This is the first evidence-backed **GAME_SITE_STARTER V2.6.5 Capability Support Baseline**. It includes all 20 DIRECT or SEAM rows. It is not the future Framework Capability Baseline: it does not record assembled-project PASS/FAIL, Reference A/B/C results, lifecycle deltas, verifier identity, or release approval.

| Capability ID | Starter Responsibility | Support Status | Evidence Strength | Primary Evidence | Primary Gap if any |
|---|---|---|---|---|---|
| VF-01 | SEAM | PARTIAL | Medium | `theme.css`, `page-families.css`, `theme.test.ts` | Non-color adaptation roles are hardcoded. |
| VF-02 | DIRECT | PARTIAL | Medium | `global.css`, `theme.test.ts`, `navigation.test.ts` | No contrast/breakpoint acceptance evidence. |
| MC-01 | SEAM | PARTIAL | Strong for resolution, absent for dimensions | Media schema/catalog/build tests | No intrinsic dimension/aspect contract. |
| MC-03 | DIRECT | PARTIAL | Strong for alt/source/rendering | Media schema, render and audit tests | Rights/credit/accessible equivalent incomplete. |
| IA-02 | DIRECT | PROVEN | Strong | Site resolver, validator, link audit, optional-route tests | Assembled content truth remains external. |
| IA-03 | SEAM | PARTIAL | Strong provider implementation, weak abstraction | Search state/UI/Pagefind artifact tests | Pagefind coupling and no activation decision record. |
| FR-01 | DIRECT | PARTIAL | Strong for existing fields | Inventory/fact schemas and tests | General live/version semantics incomplete. |
| ID-01 | SEAM | PROVEN | Strong | Explicit relations, enabled resolver, component/test | Relevance remains adaptation-owned. |
| SEO-01 | DIRECT | PROVEN | Strong | SEO helpers, layout, generated HTML audit tests | None in portable mechanism. |
| SEO-02 | DIRECT | PARTIAL | Medium | Layout metadata source | No share-image/fallback contract. |
| SEO-03 | DIRECT | PROVEN | Strong | Sitemap/robots/JSON-LD source and tests | Assembled schema selection remains external. |
| AX-01 | DIRECT | GAP | Strong evidence of absence | `MobileNav.astro`; no behavior code/test | Escape, focus restoration, expanded/control state. |
| AX-02 | DIRECT | UNVERIFIED | Medium source, weak behavior evidence | Base layout and global CSS | No combined accessibility verification. |
| AX-03 | DIRECT | GAP | Strong evidence of absence | No E2E dependency/script/suite | No browser breakpoint/keyboard contract. |
| PP-01 | DIRECT | PROVEN | Strong | Catalog, 404, empty states, route/link tests | None in portable mechanism. |
| PP-02 | SEAM | GAP | Strong evidence of absence | Passing validator plus visible example/residue strings | No production residue/adoption gate. |
| TL-01 | DIRECT | GAP | Strong | Published legal routes and starter copy | Review markers do not block final output. |
| TL-02 | SEAM | PARTIAL | Strong source evidence, absent identity gate | `seo.ts#buildBaseSeoGraph`, `BaseLayout.astro`, config schema, SEO/config/brand tests | Generic brand config becomes an unverified Organization/publisher claim; safe non-assertive Core defaults are missing. |
| MR-01 | SEAM | PROVEN | Strong | Typed config, AdSlot, provider edge, HTML audits | Human obstruction review remains external. |
| MC-05 | SEAM | PARTIAL | Strong for current providers | Video schema/render/audit tests | Not provider-neutral; accessibility/fallback fields incomplete. |

## I. Current V2.6.5 Capabilities to Preserve

Preservation has two meanings in this report; this clarification does not create a new governance system:

- **CONTRACTUAL CORE PRESERVE** means a proven portable Core obligation that future versions must not silently regress. This includes `IA-02`, the Core seam of `ID-01`, `SEO-01`, `SEO-03`, `PP-01`, and the Core seam of `MR-01`.
- **VALUABLE IMPLEMENTATION PRESERVE** means useful existing work that should not be casually discarded, while its long-term layer may change. This includes the current media-readiness machinery, Pagefind adapter machinery, and current fixed compositions as Pattern references.

| Capability / mechanism | Mapped Contract IDs | Why valuable | Source evidence | Test evidence | Future owner | Preservation requirement |
|---|---|---|---|---|---|---|
| Runtime Page Inventory + Enabled Catalog | IA-02, PP-01, SEO-01, SEO-03 | One source for route, publication, visibility, indexability, metadata, and relations prevents drift and leaks. | `page-inventory.ts`, `catalog.ts`, `site-data.ts` | `catalog.test.ts`, `site-data.test.ts`, `site-validation.test.ts` | CORE STARTER | Keep page identity and publication decisions centralized and fail closed. |
| Exact output reconciliation and HTML audit | IA-02, SEO-01, SEO-03, PP-01 | Detects missing/extra routes, broken links, metadata mismatch, schema errors, orphan pages, and unexpected assets. | `output-reconciliation.ts`, `html-audit.ts`, `audit-build.ts` | `output-reconciliation.test.ts`, `html-audit.test.ts`, fixture builds | CORE STARTER | Preserve exactness and generated-output inspection; do not weaken to warnings. |
| SEO foundation | SEO-01, SEO-03 | Canonical, robots, sitemap, inventory-driven indexability, the JSON-LD framework, and breadcrumbs are portable foundations; assertive identity defaults require `TL-02` hardening. | `seo.ts`, `BaseLayout.astro`, `robots.txt.ts`, `astro.config.ts` | `seo.test.ts`, `html-audit.test.ts` | CORE STARTER | Keep visible-content truth and route authority; make identity nodes non-assertive unless explicit verified project evidence enables them. |
| Media manifest, catalog, renderer, and audit | MC-01, MC-03, MC-05 | Strict local paths, source URLs, descriptive alt, fixed slots, video safety, and output reconciliation are a strong base. | `media.ts`, `catalog.ts`, media components, `media-validation.ts` | Media schema/render/audit/build tests | CORE STARTER | Extend records compatibly; do not replace proven validation/render boundaries. |
| Media Needs Assessment projection | MC-04, MC-05 | Separates page need, rights, human decision, integration, and evidence/final modes without inventing assets. | `media-readiness.ts`, `validate-site.ts`, `build-site.ts` | `media-readiness.test.ts`, `evidence-build.test.ts` | GAME ADAPTATION + PROJECT CONTENT + ACCEPTANCE GATE | **VALUABLE IMPLEMENTATION PRESERVE:** preserve the deterministic parser, inventory resolution, and fail-closed lifecycle combinations provisionally. Future layer placement may be re-evaluated; relocation or deletion is not automatically a Core regression. |
| Optional monetization seam | MR-01 | Clean separation of where/how/whether, no SDK requirement, zero disabled output, and optional stable reservation. | `ads.ts`, `AdSlot.astro`, `ProjectAd.astro`, ad HTML audit | `ads.test.ts`, `html-audit.test.ts` | CORE STARTER + PATTERN LIBRARY | Keep disabled default, typed semantics, no secrets, and provider isolation. |
| Explicit related-page seam | ID-01 | Adaptation can author relevance while Core guarantees enabled truthful routes. | `relatedPageIds`, `getRelatedPages`, `RelatedPages.astro` | `site-data.test.ts` | CORE STARTER + GAME ADAPTATION | Do not replace with arbitrary recency in Core. |
| Semantic theme and page-family boundary | VF-01, VF-02 | Separates family identity from component logic and keeps neutral defaults. | `theme.css`, `page-families.css`, `data-page-family` | `theme.test.ts`, `brand.test.ts` | CORE STARTER + GAME ADAPTATION | Expand roles without embedding game palettes or pattern motifs. |
| Search safety and artifact audit | IA-03 | Local results, safe URLs, bounded excerpts, honest empty/error states, exact artifacts, and budget protection are valuable. | `search-state.ts`, `SearchIsland.tsx`, `pagefind-artifacts.ts` | Search/Pagefind tests | CORE STARTER adapter | Preserve as a Pagefind adapter after a neutral interface is introduced. |
| Fail-closed final/evidence build split | PP-01, PA-01 support; currently exercised by MC-04 machinery | Prevents visual-evidence output from being mistaken for a final build and stops on technical failures. | `build-site.ts`, evidence marker contract | `evidence-build.test.ts` | CORE STARTER | Keep marker isolation and non-mutation of human decisions without treating current MC-04 integration as permanent Core ownership. |

## J. Current V2.6.5 Core Gaps

Only DIRECT/SEAM obligations materially absent from V2.6.5 appear here.

| Capability ID | Gap | Why Core Owns It | Severity | Evidence | Minimum Required Capability | Do Not Overbuild |
|---|---|---|---|---|---|---|
| AX-01 | Dismissible mobile nav lacks Escape close, focus restoration, and explicit expanded/control state. | These are portable behavior guarantees independent of game or pattern. | P1 | `MobileNav.astro` is static native details; `navigation.test.ts` has no behavior test. | One reusable nav controller plus keyboard/focus tests. | No navigation framework, global state store, or universal mega-menu. |
| AX-03 | No executable browser route/breakpoint/keyboard suite. | Core must prove its own representative routes before assembled acceptance adds project coverage. | P1 | No Playwright/browser script or E2E suite in package/CI. | Small representative desktop/tablet/mobile matrix for overflow and keyboard paths. | Do not duplicate the full Acceptance Gate in Core. |
| PP-02 | No production residue/adoption-completeness gate. | Core knows its own sentinel domain, example brand, and forbidden template markers and can fail safely. | P1 | `gameatlas.example`, Game Atlas defaults, and `Replace`/`Add` copy survive `npm run validate`. | Configurable sentinel scan and explicit adoption assertions for final validation. | No generic content linter or brand-truth database. |
| TL-01 | Draft legal text remains a public, published route and `needsReview` does not block final output. | Core owns truthful safe defaults and must not emit its own draft legal residue as final. | P1 | `page-inventory.json`, `static-page-copy.ts`, `LegalPage.astro`, validator behavior. | Honest unavailable state or final-build block until approved project policy content replaces starter text. | No lawyer workflow, jurisdiction rules engine, or fabricated operator data. |

## K. Partial Capabilities

| Capability ID | Existing strength | Incomplete element | Architecture treatment |
|---|---|---|---|
| VF-01 | Semantic color/family roles and replaceable brand assets | Typography, spacing/density, shape, icon, and state adaptation roles | Harden semantic tokens only. |
| VF-02 | Focus, motion, responsive, and tap-size CSS | Contract-level contrast/breakpoint evidence and override constraints | Add portable Core constraints; preserve styling; keep assembled verification in Acceptance Gate. |
| MC-01 | Strict manifest, file validation, fixed placements, rendered audit | Stable dimensions/aspect and unavailable state contract | Extend media primitive minimally. |
| MC-03 | Alt, caption, source, privacy-enhanced video | Rights, credit, license, transcript/subtitle/access equivalent | Extend shared media record. |
| IA-03 | Complete Pagefind implementation and safe UI states | Provider-neutral interface and activation decision record | Extract adapter boundary; retain Pagefind adapter. |
| FR-01 | Published/updated and entity patch fields | General page/content version and live semantics | Add compact shared semantics. |
| SEO-02 | OG/Twitter text and URL metadata | Share-image selection and fallback | Reuse media record; no separate image system. |
| TL-02 | Base JSON-LD graph and tests provide a usable structured-output foundation | Generic brand config automatically becomes an `Organization` and `WebSite.publisher` claim without an explicit verified identity decision | Make Core defaults non-assertive; Game Adaptation supplies claim truth and Acceptance Gate verifies it. |
| MC-05 | Local/YouTube playback and decision projection | Provider neutrality, duration/credit/transcript/consent/fallback | Harden existing seam rather than rewrite playback. |

## L. Unverified Capabilities

| Capability ID | Apparent mechanism | Missing evidence | Required evidence |
|---|---|---|---|
| AX-02 | Skip link, visible focus CSS, reduced-motion override, and key touch sizes | Current tests inspect source snippets; no executed combined accessibility/browser result was produced in this audit. | Automated accessibility plus representative keyboard/touch/reduced-motion review on an assembled fixture. |

## M. Capabilities Outside Starter

The following complete capabilities, or the external portions of SEAM capabilities, remain outside Starter.

### PATTERN LIBRARY

- `HR-01`, `HR-02`: primary and deeper homepage routing compositions.
- `CU-02`: long-form presentation rhythm and selected aids.
- `ID-02`: optional enhanced related-ranking composition.
- `MR-02`: value-backed depth and destination breadth.
- `RI-01`: Pattern must compose rather than duplicate Core.

### GAME ADAPTATION

- `GI-01`, `IA-01`: verified vocabulary and game-derived taxonomy.
- `MC-02`: truthful classification and use of actual game media.
- `MC-04`: per-page media-needs decisions and rationales.
- `TL-02`: truth of identity, operator, company, official/affiliated/independent claims; Core owns only safe non-assertive structured-output defaults.

### PROJECT CONTENT

- `CU-01`: useful actionable guide answers.
- `DS-01`, `DS-02`: supported decisions, recovery, and next actions.
- `FR-02`: provenance for Popular/Trending/Latest/Live claims.
- `MC-04`: assessment content, evidence, and explicit non-need/unavailability rationale.

### REFERENCE REGRESSION

- `RI-02`: assembled Reference A/B/C regression and evidence.

### ACCEPTANCE GATE

- `GI-02`: game-specific recognition review.
- `MC-04`: verification that every core page has an evidence-backed assessment and appropriate media/no-media result.
- `TL-02`: claim/source verification against real project evidence.
- `TL-03`: behavior-to-policy mapping and accuracy review.
- `PA-01`: independent assembled-site acceptance.

### RELEASE GOVERNANCE

- `PA-02`: recorded exception lifecycle.
- `RI-03`: prior/candidate Capability Delta and blocking rules.
- `RI-04`: registry lifecycle integrity.

## N. Visual Adaptation Findings

Good seams: neutral palette variables, family accents keyed only by validated modules, brand mark/logo config, configurable copy, theme-driven footer, and avoidance of a fixed tactical/fantasy identity. Tests protect the controlled module-to-token mapping and removal of old motif residue.

Hardcoded assumptions: display/body/mono font stacks live in `global.css`; much of shape language, spacing, card borders, shadows, density, hero scale, and motion style is global component CSS rather than semantic roles. The visual design is an editorial portal aesthetic. A project can become game-specific, but deep adaptation may require overriding many selectors rather than changing a coherent token surface.

Conclusion: the visual Core needs targeted token hardening, not a theme framework. Actual palette, typography assets, icons, vocabulary, decorative assets, and human identity approval remain Game Adaptation/Acceptance responsibilities.

## O. Media Architecture Findings

Strong current capability:

- Strict local image/video paths and existence checks.
- Explicit image/video types, descriptive alt validation, caption, HTTPS source provenance.
- Hero/gallery/trailer mappings and deterministic page resolution.
- Responsive image flow, gallery order, YouTube privacy domain, native video controls, and output audit.
- A sophisticated per-page media readiness decision-table seam with human, rights, integration, and visual lifecycle states.

Material limitations:

- `MC-01`: no intrinsic width/height/aspect record; CSS `width:100%; height:auto` alone does not prove stable pre-layout dimensions.
- `MC-03`: `sourceUrl` is provenance, not rights. No explicit credit/license/rights status lives with an asset; videos lack transcript/caption-track/access-equivalent fields.
- `MC-04`: V2.6.5 provides a strong assessment mechanism, but the Contract assigns implementation to Game Adaptation + Project Content and verification to Acceptance Gate. Preserve the current machinery provisionally as valuable existing work; its long-term placement may be re-evaluated, and future relocation or deletion is not automatically a Core regression.
- `MC-05`: video is a two-provider implementation rather than a provider-neutral seam. It lacks duration, consent/loading policy, fallback, and a portable provider adapter.

The correct response is to harden the existing record and adapter boundaries. A DAM, upload service, CDN abstraction, transcoder, arbitrary iframe API, or universal placement DSL is not justified.

## P. Content / Article Findings

The Starter has useful portable primitives: content collections joined to inventory identity, draft/publication filtering, generated H2/H3 TOC, breadcrumbs, FAQ, Quick Facts, Sources, Related Pages, hero/gallery/trailer anchors, Article/Breadcrumb schema, tables and overflow styling, and player-facing metadata filtering.

Limitations are appropriately split:

- Actionable answers, supported recommendations, recovery guidance, and factual depth are Project Content responsibilities.
- Editorial Home, Problem-Oriented Guide, Database / Object Detail, Tool Page, and Long-form Guide are Pattern compositions.
- The current fixed portal and article shells are valuable reference implementations but should not become the only Core composition.
- Patch is strongly modeled for entity facts, not as a general content/page version field.
- FAQ is visible but intentionally emits no FAQ schema; that is truthful and should remain so until an exact visible-data implementation is selected.

## Q. Search Findings

V2.6.5 has a robust Pagefind implementation: conditional route emission, local query execution, bounded/sanitized results, safe local URLs, useful loading/error/empty states, exact artifact classification, reference-safe normalization, and an 800 KB normalized payload budget.

It does not yet satisfy the frozen IA-03 seam fully. `SearchIsland.tsx` imports `/pagefind/pagefind.js` directly, the provider contract is local to the component, and `features.search: true/false` records a switch but not the required corpus/content-model activation decision. Pagefind should be preserved as one adapter behind a small provider-neutral interface. Search UI composition stays Pattern-owned, and an external search service must not be added by default.

## R. Ads / Monetization Findings

The monetization architecture is one of the strongest V2.6.5 subsystems. It cleanly separates semantic placement (`AdSlot`), enablement/configuration (`ads.ts`), and provider markup (`ProjectAd`). Disabled, absent, or locally disabled placements emit literally no wrapper or reserved space. Enabled known dimensions reserve responsive aspect-ratio space; identities, bootstrap duplication, provider roots, and secret-shaped attributes are audited.

This proves Core ad readiness without requiring an ad network SDK. Placement eligibility, value-backed page depth, actual provider delivery, requested/rendered/viewable distinctions, and obstruction/CLS review remain Pattern/Acceptance concerns. Ads disabled is a valid safe default, not a failure.

## S. SEO Findings

`SEO-01` and `SEO-03` are proven at the Starter-responsibility level through source and meaningful tests: unique generated title/description audit, canonical construction, inventory-driven robots directives, sitemap filtering, robots output, JSON-LD validity, truthful Article/Breadcrumb selection, and route/link reconciliation.

`SEO-02` is partial. Text metadata and share URLs exist, but appropriate share media and fallback do not. This should reuse the media architecture rather than create a second image schema. Because the frozen checkout was not built in place, this audit does not claim a fresh current-tree generated-file pass; isolated fixture build tests and generated-audit tests are supporting evidence.

## T. Accessibility / UX Findings

Positive baseline: skip link, strong focus-visible style, reduced-motion override, touch-size rules, semantic FAQ/details, responsive tables, bounded mobile nav panel, honest search states, and empty-wrapper suppression.

Critical gaps:

- Mobile `<details>` does not implement Escape close or focus restoration and exposes no explicit `aria-expanded`/`aria-controls` contract.
- Tests inspect structure/CSS but do not execute mobile navigation behavior.
- No current browser E2E suite proves overflow and keyboard paths at supported breakpoints.

`AX-02` remains UNVERIFIED rather than PROVEN because the combined behavior was not exercised. The future independent Acceptance Gate must repeat these checks on assembled pages; a small Core browser suite should first protect the portable shell.

## U. Trust / Legal Findings

The Starter avoids fake contact/operator records and clearly warns that privacy/terms text is starter material, which is more truthful than fabricated completeness. However, the final validation path still accepts public, published legal routes containing `Replace` and `Add` instructions, and `needsReview: true` is not a release block. This is a direct `TL-01` and `PP-02` Core safety gap.

The minimum correction is not mandatory lawyer review and not invented company data. The minimum is a truthful unavailable/default state or a final-build gate requiring approved project policy content. For `TL-02`, source inspection shows that `buildBaseSeoGraph` always emits an `Organization` named from `config.brand.name`, makes it `WebSite.publisher`, and is called by `BaseLayout` for every page. The brand/config schemas expose no verified organization/identity decision, while `tests/seo.test.ts` explicitly expects the Organization node. Core therefore owns safe non-assertive structured-data behavior; Game Adaptation owns the truth of operator/company/official/affiliation claims, and Acceptance Gate verifies them against real project evidence. `TL-03` behavior-to-policy accuracy remains an Acceptance responsibility.

## V. Testing / Regression Findings

Current V2.6.5 testing is substantial: 38 files and 485 tests passed, covering schemas, publication/catalog behavior, route resolution, media, isolated builds, Pagefind artifacts, search state, ads, SEO helpers, generated HTML audits, homepage models, content, and build-purpose separation. CI uses the pinned Node file, locked dependencies, `npm run check`, and `npm run build`.

What this does not prove:

- No browser E2E suite is present in the frozen package/CI.
- No approved Reference A/B/C assembled projects exist.
- No independent capability-ID acceptance report exists.
- No prior/candidate Capability Baselines are loaded.
- No Capability Delta or lifecycle transition audit is generated.
- Git provenance and many tests do not by themselves satisfy `RI-02` through `RI-04`.

## W. Pattern Library Candidates

| Candidate | Classification | Contract IDs | Intended ownership |
|---|---|---|---|
| Editorial Home | PAGE PATTERN | HR-01, HR-02, MR-02 | Primary route, real category/feed depth, optional ad rhythm. |
| Wiki Hub | PAGE PATTERN | HR-02, IA-01, ID-01 | Taxonomy-driven directory and truthful counts/destinations. |
| Problem-Oriented Guide | PAGE PATTERN | CU-01, CU-02, DS-02 | Quick answer, steps, mistakes/recovery, next step. |
| Database / Object Detail | PAGE PATTERN | IA-01, FR-01, ID-01 | Facts, patch/version context, related routes, media anchors. |
| Tool Page | PAGE PATTERN | CU-01, DS-02, AX-03 | Inputs, valid/invalid/empty states, result explanation. |
| Long-form Guide | PAGE PATTERN | CU-02, ID-01, SEO-03 | Breadcrumbs, TOC, source trail, related content, media rhythm. |
| Immersive Fantasy | PRESENTATION PATTERN | GI-02, VF-01 | Visual/presentation expression only; it does not own homepage IA. Compose `Editorial Home + Immersive Fantasy`, or another valid Page Pattern plus this Presentation Pattern. |
| Tactical Systems | PRESENTATION PATTERN | IA-01, ID-02, MR-02 | Dense relationships, signals, ranked systems, and technical hierarchy; it does not create a seventh Page Pattern. A mechanics-browsing page normally composes `Wiki Hub + Tactical Systems`. |
| TOC rail | PRESENTATION PATTERN | CU-02 | Heading-derived or authored strategy with validation. |
| Decision modules | PRESENTATION PATTERN | DS-01, DS-02 | Comparison method, assumptions, recovery, next action. |
| Article media rhythm | PRESENTATION PATTERN | MC-01, MC-03, CU-02 | Cover/figure/gallery/video placement using Core media. |
| Responsive table/callout/steps/figure | PRESENTATION PATTERN | CU-02, DS-01 | Reusable readable long-form modules. |
| Sidebar / related-feed composition | PRESENTATION PATTERN | ID-01, ID-02, MR-02 | Cross-navigation without redefining relation truth. |

## X. Overengineering / Mis-Scoping Findings

No current subsystem is proven OVERENGINEERED merely because it is sophisticated. The Pagefind artifact classifier and media readiness lifecycle have concrete fail-closed behavior and extensive tests.

Mis-scoping risks to address:

1. The fixed Wiki Portal homepage and current article shells are useful compositions but belong in a future Pattern Library, not an expanding universal Core.
2. Pagefind-specific artifact machinery should remain an adapter implementation and must not define the provider-neutral IA-03 contract.
3. Starter legal prose is project policy content and should not be treated as production-ready Core output.
4. Historical release documentation is evidence, not a live release-governance system.

## Y. Reference Regression Gaps

- Reference A — Wiki / Commercial Editorial does not yet exist as an approved deterministic assembled fixture.
- Reference B — Problem Guide / Tool does not yet exist.
- Reference C — Tactical / Systems does not yet exist.
- Existing unit and temporary build fixtures do not cover human identity, real verified media, full browser accessibility, or pattern/Core dependency boundaries.
- No reference report attaches results per Capability ID.
- No cross-project adoption smoke fixture is frozen as reference evidence.

These are architecture gaps in the REFERENCE REGRESSION layer, not reasons to bloat runtime Core.

## Z. Acceptance Gate Gaps

- No independent assembled-site capability-ID report exists.
- No mandatory Media Needs Assessment acceptance is run on every core page.
- No human game-identity reverse test is recorded.
- No current assembled browsing-depth/value review exists.
- No generic-template or source-residue gate spans rendered output and human review.
- No representative browser suite covers Escape, focus restoration, keyboard paths, overflow, reduced motion, and touch behavior.
- No behavior-to-policy mapping verifies privacy/terms against actual analytics, ads, embeds, hosting, forms, or accounts.
- No visual/media/ad launch gate records reviewer, date, candidate, and evidence.

## AA. Preserve / Harden / Add / Move Classification

### PRESERVE

- **CONTRACTUAL CORE PRESERVE:** Runtime Page Inventory, enabled catalog, route resolution, and output reconciliation (`IA-02`, `PP-01`, `SEO-01`, `SEO-03`); canonical/robots/sitemap and truthful non-assertive JSON-LD foundations (`SEO-01`, `SEO-03`); media manifest/render/audit (`MC-01`, `MC-03`, `MC-05`); related-page seam (`ID-01`); disabled-by-default ad seam (`MR-01`); and fail-closed technical stages.
- **VALUABLE IMPLEMENTATION PRESERVE:** current media-readiness machinery (`MC-04`), Pagefind adapter machinery (`IA-03`), and current fixed compositions as future Pattern references. Preserve them provisionally, but do not infer permanent Core ownership from their current location.

### HARDEN

- Semantic visual adaptation surface (`VF-01`, `VF-02`).
- Stable media dimensions and complete rights/credit/accessibility record (`MC-01`, `MC-03`).
- Provider-neutral search adapter and activation record (`IA-03`).
- General freshness version/live fields (`FR-01`).
- Share media/fallback (`SEO-02`).
- Safe non-assertive base structured-data defaults (`TL-02`); project claim truth remains external and assembled claims remain Acceptance-verified.
- Provider-neutral, accessible video seam (`MC-05`).
- Browser proof for existing inclusive-navigation baseline (`AX-02`).

### ADD TO CORE

- Accessible dismissible-navigation behavior (`AX-01`).
- Small representative browser breakpoint/keyboard suite (`AX-03`).
- Adoption/residue final gate (`PP-02`).
- Truthful legal default/final gate (`TL-01`).

### DO NOT ADD TO CORE

- Game vocabulary/taxonomy/recognition (`GI-01`, `GI-02`, `IA-01`).
- Actual screenshots, media claim truth, and the truth of operator/company/official/affiliation claims (`MC-02`, `TL-02`).
- Homepage/product compositions and content quality (`HR-01`, `HR-02`, `CU-01`, `CU-02`, `DS-01`, `DS-02`, `MR-02`).
- Dynamic-label provenance and enhanced related ranking (`FR-02`, `ID-02`).
- Acceptance, exceptions, references, deltas, and lifecycle governance (`PA-01`, `PA-02`, `RI-01`–`RI-04`, `TL-03`).

### MOVE OUT / DECOUPLE

- Fixed portal/article compositions to Pattern Library (`HR-01`, `HR-02`, `CU-02`).
- Legal policy prose to Project Content while Core retains safe final gating (`TL-01`, `TL-03`).
- Pagefind-specific runtime/artifact rules behind a neutral search adapter (`IA-03`).
- Re-evaluate the current media-readiness machinery during future Acceptance/Game Adaptation architecture design (`MC-04`); preserve it provisionally, and do not classify relocation or deletion as an automatic Core regression.

### OVERENGINEERED

No evidence-supported current finding.

## AB. Prioritized Architecture Backlog

### KEEP AS-IS

1. Preserve inventory/catalog/reconciliation and truthful destination semantics (`IA-02`, `PP-01`).
2. Preserve canonical, robots, sitemap, the JSON-LD framework, and generated audit (`SEO-01`, `SEO-03`) while hardening assertive identity defaults under `TL-02`.
3. Preserve explicit related relations (`ID-01`) and the ad boundary (`MR-01`) as contractual Core obligations; preserve the current media assessment projection (`MC-04`) provisionally as valuable implementation pending future layer design.

### HARDEN EXISTING CORE

1. Complete media dimensions, rights/credit/accessibility, and video fallback/provider contracts (`MC-01`, `MC-03`, `MC-05`).
2. Extract a provider-neutral search adapter and activation decision record (`IA-03`).
3. Complete semantic visual roles and freshness semantics (`VF-01`, `VF-02`, `FR-01`).
4. Add share-image selection/fallback using the media record (`SEO-02`).
5. Make base structured-data defaults non-assertive unless explicit verified identity evidence enables operator/company/official/affiliation claims (`TL-02`).
6. Prove the existing inclusive baseline in browser/accessibility evidence (`AX-02`).

### ADD MISSING CORE

1. Accessible mobile-nav behavior contract (`AX-01`).
2. Minimal Core browser route/overflow/keyboard matrix (`AX-03`).
3. Final adoption/residue gate including truthful legal default (`PP-02`, `TL-01`).

### PATTERN LIBRARY FUTURE

1. The canonical six Page Patterns: Editorial Home, Wiki Hub, Problem-Oriented Guide, Database / Object Detail, Tool Page, and Long-form Guide (`HR-01`, `HR-02`, `CU-02`, `DS-02`, `MR-02`).
2. Presentation patterns: Immersive Fantasy, Tactical Systems, TOC, sidebar, decision modules, steps, callouts, tables, figures, media rhythm, and related feeds (`GI-02`, `VF-01`, `CU-02`, `DS-01`, `ID-02`). Use `Editorial Home + Immersive Fantasy` or `Wiki Hub + Tactical Systems`; neither presentation style owns page IA.
3. Enforce no Core duplication (`RI-01`).

### GAME ADAPTATION FUTURE

1. Verified vocabulary, taxonomy, palette/type/shape/icon identity (`GI-01`, `VF-01`, `IA-01`).
2. Real media, provenance/rights decisions, and truthful identity/affiliation claims (`MC-02`, `TL-02`).
3. Per-page media-needs assessment implementation and rationale with Project Content (`MC-04`).
4. Search activation rationale and authored relevance (`IA-03`, `ID-01`).

### PROJECT CONTENT FUTURE

1. Actionable answers, methods, version context, recovery, and next actions (`CU-01`, `DS-01`, `DS-02`).
2. Truthful dynamic-label provenance and project policy content (`FR-02`, `TL-03`).

### REFERENCE REGRESSION FUTURE

1. Implement and freeze deterministic Reference A/B/C only after separate authorization (`RI-02`).
2. Attach evidence by Capability ID and cover media/no-media, tool states, relations, and browser behavior (`MC-04`, `AX-03`, `PA-01`).

### ACCEPTANCE GATE FUTURE

1. Independent assembled-site capability report (`PA-01`).
2. Human identity/media/value/ad/legal/browser reviews, including `MC-04` assessment verification and `TL-02` claim/source verification (`GI-02`, `MC-02`–`MC-05`, `MR-01`, `TL-02`, `TL-03`, `AX-01`–`AX-03`).

### RELEASE GOVERNANCE FUTURE

1. Exception records with owner/evidence/scope/expiry (`PA-02`).
2. Prior/candidate baselines, Capability Delta, and release blocking (`RI-03`).
3. Linked registry lifecycle history (`RI-04`).

## AC. What Must NOT Change

- The Runtime Page Inventory remains the authoritative source for route/publication/indexability identity.
- Disabled/draft/private pages remain excluded rather than silently rendered.
- Navigation and related links continue resolving through the enabled catalog.
- Canonical, sitemap, robots, and non-assertive schema remain derived from validated route/content truth; assertive identity/affiliation nodes require explicit verified project evidence.
- Media validation remains local, deterministic, source-aware, and fail closed.
- Media human/rights decisions remain external and are never auto-approved by build code.
- Ads remain disabled by default, provider-neutral at the Core boundary, secret-free, and zero-output when disabled.
- Search result URLs remain local/safe and empty/error states remain truthful.
- Evidence builds remain visibly NOT FINAL and cannot mutate human decisions.
- The current media-readiness machinery remains provisionally preserved as valuable implementation, without treating its present Core location as permanent ownership.
- Strong systems must be extended compatibly rather than rewritten to match new terminology.

## AD. What Must NOT Be Added to Core

- A specific game's screenshots, vocabulary, taxonomy, logo, palette, fonts, or legal claims.
- A universal homepage/page-builder DSL or every observed page composition.
- A mandatory ad network, analytics SDK, external search service, DAM, upload system, transcoder, or arbitrary iframe platform.
- Popular/Trending/Live semantics without project provenance.
- Generated fake screenshots, fictional facts, contacts, operators, or affiliation language.
- Human visual approval, legal accuracy decisions, or content-quality judgment encoded as automatic Starter truth.
- Reference projects, exception workflow, registry lifecycle application, or cross-version release governance inside runtime Core.

## AE. Six Architecture Answers

### Q1. Is V2.6.5 fundamentally a strong reusable Core that lacks product/pattern/acceptance layers, or does Core itself require major restructuring?

It is a strong reusable Core with missing product/pattern/reference/acceptance/release layers and a small set of targeted Core gaps. Major restructuring is not justified.

### Q2. Which current V2.6.5 capabilities must absolutely be preserved?

As **CONTRACTUAL CORE PRESERVE**: Runtime Page Inventory and enabled catalog; exact route/output reconciliation; truthful SEO/canonical/robots/sitemap/non-assertive-schema foundations; media manifest/render/audit; explicit related-page seam; disabled-by-default AdSlot/provider boundary; and fail-closed technical stages. As **VALUABLE IMPLEMENTATION PRESERVE**: the current media-readiness machinery, Pagefind safety/artifact adapter, and fixed compositions as Pattern references; these should be preserved provisionally without converting their current location into permanent Core ownership.

### Q3. Which missing capabilities genuinely belong in Core?

The four genuine gaps are accessible dismissible-nav behavior (`AX-01`), a minimal browser breakpoint/keyboard suite (`AX-03`), production residue/adoption protection (`PP-02`), and a truthful legal default/final gate (`TL-01`). Existing partial Core mechanisms also require hardening for `VF-01`, `VF-02`, `MC-01`, `MC-03`, `IA-03`, `FR-01`, `SEO-02`, `TL-02` safe structured-output defaults, and `MC-05`. The truth of `TL-02` operator/company/official/affiliation claims remains Game Adaptation-owned and Acceptance-verified.

### Q4. Which apparent gaps must NOT be added to Core?

Game identity/taxonomy, real game assets and claim truth, homepage and long-form compositions, content quality and decision methods, dynamic label provenance, optional related ranking, human identity/legal/media review, reference fixtures, exception records, Capability Delta, and registry lifecycle governance.

### Q5. What is the minimum next architecture change set?

Preserve the proven baseline and valuable implementations with the ownership distinction above; define compact Core hardening contracts for interaction/browser proof, adoption/legal safety, media/video completeness, provider-neutral search/freshness/share metadata, and non-assertive structured-data defaults; define the Pattern boundary for the first pilot composition; and define only the minimum Reference/Acceptance/Release evidence interfaces needed to prove capability continuity. This is an architecture design scope, not an implementation plan.

### Q6. Should the frozen V2.6.5 repository itself be modified?

**NO.** Future implementation should originate from a new candidate based on the frozen source only after separate baseline freeze verification and authorization.

## AF. Open Questions

1. Should the minimal Core browser suite live with the Starter package or in a reusable acceptance harness while still running against Core fixtures?
2. What is the smallest provider-neutral search interface that retains Pagefind's proven adapter and artifact checks?
3. Which media rights/credit/accessibility fields are mandatory on every asset versus conditional by media type?
4. Should legal routes be absent/unavailable by default, or should final validation require an explicit approved-project-content state?
5. Which semantic visual roles are truly portable without turning Core into a design system framework?
6. Which single pilot composition should be used after independent review to validate the Pattern/Core boundary? The Contract recommendation remains Problem-Oriented Guide + Wiki Article Shell.

## AG. Minimum Next Architecture Change Set

The smallest coherent next design scope, subject to separate authorization, is:

1. Submit this corrected V2.6.5 Support Baseline for independent freeze verification; do not freeze it within this audit, and preserve all PROVEN mechanisms.
2. Define a compact Core safety contract covering `AX-01`, `AX-03`, `PP-02`, and `TL-01`.
3. Define compatible hardening deltas for the existing media/video (`MC-01`, `MC-03`, `MC-05`), search (`IA-03`), freshness (`FR-01`), share metadata (`SEO-02`), safe non-assertive structured-data defaults (`TL-02`), and visual-state/token (`VF-01`, `VF-02`) seams.
4. Define the Pattern Library boundary for one pilot composition without copying a reference homepage or duplicating Core.
5. Define the minimum evidence interfaces for Reference A/B/C, independent assembled acceptance, prior/candidate baseline comparison, and Capability Delta (`PA-01`, `RI-01`–`RI-04`) without implementing them in Core.

No version number, release name, implementation ticket set, or source modification is defined here.

## AH. Exact Next Step

Independent freeze verification of the corrected V2.6.5 Capability Support Baseline.
