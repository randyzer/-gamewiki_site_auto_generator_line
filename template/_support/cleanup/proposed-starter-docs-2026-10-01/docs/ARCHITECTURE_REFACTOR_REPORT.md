# Architecture Refactor Report

Refactor date: 2026-09-01
Scope: approved incremental architecture hardening only
Source audit: `docs/ARCHITECTURE_GAP_ANALYSIS.md`

## 1. Executive result

**Result: PASS.**

The approved P0-1, P0-2, P1-2, and P1-3 findings are closed. The refactor kept
the existing Page Inventory, Enabled Page Catalog, SEO, schema, Pagefind,
route-reconciliation, and build-audit architecture intact. Stable public URLs
did not change.

No plugin framework, universal entity renderer, runtime discovery, dependency
injection, repository/adapter layer, database abstraction, or unrelated P2
cleanup was introduced.

## 2. Closed findings

### P0-1 — Optional fixed routes are truly optional

Status: **CLOSED**

The fixed Guides and Search pages were replaced by optional catch-all static
routes:

- `src/pages/guides/[...slug].astro`
- `src/pages/search/[...path].astro`

Their static paths now come from pure builders in
`src/core/optional-routes.ts`. Both builders consume the Enabled Page Catalog
and can return zero paths. Therefore a disabled feature no longer leaves a
physical route that executes and fails after its Inventory entry disappears.

Search no longer calls `getPageByRoute("/guides/")`. Its optional Guides link is
resolved only from related pages that remain in the enabled catalog. The
supported combinations are now explicit:

| Feature state | Generated behavior |
|---|---|
| `guides=false` | No Guides hub or Guide article paths |
| `search=false` | No Search path |
| `search=true`, `guides=false` | Search remains available; the Guides fallback link is omitted |
| Both enabled | Existing `/guides/`, `/guides/getting-started/`, and `/search/` URLs remain unchanged |

`/guides/` and `/search/` were also removed from the validation script's
unconditional fixed-route list. Route reconciliation remains the final output
gate.

### P0-2 — Entity-family registration is centralized

Status: **CLOSED**

`src/data/entity-modules.ts` is now the one explicit, typed definition list for
the current entity families. Each definition owns only registration metadata:

- module key;
- entity type;
- route segment;
- singular and plural labels;
- fact parser.

Config feature keys, Page Inventory schemas, entity references, fact loading,
site validation, patch impact validation, and build validation derive their
entity vocabulary from this list. Adding an entity family no longer requires
copying the same registration information through those Core locations.

Concrete entity schemas, facts, and route presenters remain explicit. A new
family still requires its real schema/data and a presenter at the flexible
edge; the refactor intentionally did not create a universal renderer or a
dynamic schema engine.

The four existing families (`heroes`, `weapons`, `items`, and `maps`) preserve
their current routes and field-specific presentation.

### P1-2 — Brand configuration boundary is complete

Status: **CLOSED**

The brand config now includes an explicit short mark. Shared presentation is
derived by `src/core/brand.ts`, and the Header, Base Layout, and homepage radar
consume that result. The previous hard-coded `GA`, `Field intelligence`, and
`FIELD / EN` values no longer exist in those consumers.

A cloned-site regression test changes the brand name, short name, mark,
tagline, and locale and verifies that the shared presentation contains no
Starter brand residue.

### P1-3 — Supported capabilities are explicit and validated

Status: **CLOSED**

The unimplemented public `builds` and `codes` capabilities were removed instead
of being represented as functioning feature flags. Unsupported page types and
modules were removed from the public schema contract. The README now lists the
exact supported flags and explains how tool flags relate to the shared Tools
module.

Site validation now rejects incompatible module, feature, page-type, and
entity-reference combinations before route generation. For example, a Hero
page cannot be gated by the `items` feature.

## 3. Stable Core preserved

The following architecture remains the Stable Core and was not redesigned:

- Page Inventory and Enabled Page Catalog;
- configuration parsing and strict validation;
- content-to-Inventory resolution;
- centralized SEO and schema helpers;
- navigation, homepage, sitemap, related-content, and internal-link derivation;
- static output reconciliation;
- Pagefind integration and route-scoped islands;
- generated HTML and asset-budget audit.

The flexible edge remains explicit:

- game and brand config;
- page inventory and editorial content;
- entity definitions, fact schemas, and fact data;
- entity-specific route presenters;
- tool definitions and islands.

## 4. Test and verification results

All commands used Node.js 22.22.0.

| Check | Result |
|---|---|
| Astro/TypeScript diagnostics (`npm run check`) | PASS — 82 files, 0 errors, 0 warnings, 0 hints |
| TypeScript compiler (`npm exec -- tsc --noEmit`) | PASS |
| Full Vitest suite (`npm run check`) | PASS — 21 files, 85 tests |
| Focused architecture regression | PASS — 5 files, 18 tests |
| Site validation | PASS — 8 enabled pages, 1 content entry |
| Production build | PASS — 8 inventory pages generated |
| Static output reconciliation | PASS — all 8 generated HTML routes matched Inventory |
| Sitemap | PASS — only the four indexable URLs were emitted |
| Internal links and generated HTML audit | PASS — 8 pages |
| Pagefind | PASS — 4 pages and 339 words indexed |
| Browser smoke test | PASS — stable URLs/canonicals, configured brand, local Search, 0 console errors |

The focused regression covers:

- `guides=false`;
- `search=false`;
- `search=true` with `guides=false`;
- disabling an existing entity family without changing unrelated pages;
- indexing a test entity-family definition through the shared typed registry;
- rejecting entity feature/module drift;
- rejecting reserved or unimplemented capability names;
- changing brand config without shared-shell Starter residue.

The repository does not define a dedicated `lint` script or include ESLint,
Biome, or another standalone linter. No dependency or lint policy was invented
as part of this architecture refactor. Astro's static diagnostics, TypeScript
checking, the full test suite, build validation, and a whitespace scan were
used as the available code-quality gates. The whitespace scan found only the
two intentional Markdown hard-break lines already present in
`docs/RELEASE_AUDIT.md`.

The standalone TypeScript 6 check initially identified an unused, deprecated
`baseUrl` setting in `tsconfig.json`. The option was removed; the existing
`@/*` path mapping remains available and no production import depended on
`baseUrl`.

The build continues to report expected empty-collection notices for `meta` and
`news`; both features are disabled and these notices are not failures.

## 5. Explicitly deferred or untouched

### P1-1 — Fact consumption by Guides and Tools

Status: **DEFERRED TO THE FIRST REAL-GAME SMOKE TEST**

No universal fact expression, MDX lookup API, calculator fact adapter, or other
speculative abstraction was added. The first real game should determine whether
the smallest useful contract is a scalar lookup, entity selector, table model,
or tool-input binding.

### P2 findings

Status: **UNCHANGED BY DESIGN**

All P2 findings from the architecture audit remain untouched.

## 6. Remaining blockers

There is no blocker for using the generic Starter or beginning the first
real-game smoke test.

The smoke test still needs a selected game, representative entity families,
real source-backed facts, and real Guide/Tool use cases. P1-1 should be reviewed
only when that evidence exists.
