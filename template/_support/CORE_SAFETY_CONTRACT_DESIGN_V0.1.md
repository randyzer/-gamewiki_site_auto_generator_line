# Commercial Game Site — Core Safety Contract Design V0.1

**Status:** Architecture design clarified; pending independent freeze verification.  
**Date:** 2026-09-30 (Asia/Taipei).  
**Authority:** Frozen Product Contract v0.2 and frozen V2.6.5 Capability Support Baseline.  
**Authorization:** One architecture document only. Implementation and candidate creation remain unauthorized. V0.1 names this design document, not a Starter release.

## A. Executive Summary

Every future Core Starter must provide game-independent navigation mechanics, executable browser evidence for its portable shell, detection of its own production sentinels, unavailable legal defaults, and non-assertive structured identity defaults. The contract is **portable mechanism + safe default + deterministic fail-closed behavior where required + minimum Core evidence**. It does not certify an assembled product.

| Question | Recommendation | Smallest durable guarantee |
|---|---|---|
| AX-01 | Non-modal navigation disclosure; retain native `details/summary` with local enhancement | Keyboard activation, Escape, focus restoration, truthful programmatically understandable state, and safe responsive transitions |
| AX-03 | Option 3: small Core fixture runner, maintained with future Starter development tooling | Execute representative Core pages in supported browsers; Acceptance reuses behavioral semantics on assembled pages |
| PP-02 | Core-owned, non-removable known-sentinel catalog; optional additive project literals | Source projection plus generated-output checks block known residue in final builds |
| TL-01 | Option C: route capability with unavailable default; explicit activation of approved project policy | No public starter/draft policy; approval is bound to the actual content |
| TL-02 | Default WebSite + WebPage, with eligible Article/Breadcrumb nodes and no assumed identity | Brand never implicitly becomes Organization, author, publisher, or affiliation |
| Shared state | Separate explicit inputs; no global adoption/approval state | Legal approval cannot approve identity, and identity confirmation cannot clear residue |

This design addresses the four GAP rows AX-01, AX-03, PP-02, TL-01 and the Core-owned safety portion of PARTIAL TL-02. It does not promote any frozen support status to PROVEN; implementation evidence and assembled Acceptance remain future work.

## B. Frozen Inputs

| Input | Verified provenance before design |
|---|---|
| Execution workspace; `pwd` then `realpath .` | Both exactly `/Users/randyz/work/coding/hot_words_web` |
| Product Contract | `template/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md` |
| Product Contract SHA-256 | `3fe0c98d7e98f963de37fd80b3f2dbe33a822b810a1f268ec4aaef8dad90682a` |
| Capability Support Baseline | `template/GAME_SITE_STARTER_V2.6.5_CAPABILITY_GAP_AUDIT_V0.2.md` |
| Capability Baseline SHA-256 | `094d5980af15fffbf841a9001f8260b8745db22b721b876ad916dd1f919cf985` |
| Frozen Starter | `Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.6.5` |
| Starter HEAD and tag target | Both `29b25559cf2af859bca359c7f7fda686a4803c95`; tag `starter-v2.6.5` |
| Starter `status --porcelain=v1` | Empty; tracked and untracked tree clean |
| Supporting architecture evidence | `template/5_SITE_PATTERN_CAPABILITY_AUDIT.md` |
| Supporting evidence SHA-256 | `579ad63a6662f2ad2c2d937346538d914381cacf042a89cb3d905f6685c50abf` |

Authority order: Product Contract defines requirements and owners; Support Baseline defines current evidence/classification; Starter source explains current mechanisms; the 5-site audit supplies supporting observations. Older draft ownership in the 5-site audit does not override the frozen v0.2 contract or corrected baseline.

Primary local evidence read for this design:

- Product Contract H, J–L, S–T: capability meanings, ownership, Core/Pattern boundary, legal truth, assembled acceptance.
- Support Baseline H–M, T–V, AA–AC: four Core gaps, TL-02 partial seam, preservation categories, current navigation/legal/SEO limitations.
- 5-site audit G–J and N: portable Escape/focus behavior, tested versus untested navigation, independent assembled verification.
- Starter `src/components/navigation/MobileNav.astro`, `DesktopNav.astro`, `tests/navigation.test.ts`, `src/styles/global.css`: native nested disclosures, source-only tests, 900px navigation switch and 620px layout rules.
- Starter `src/core/seo.ts`, `src/layouts/BaseLayout.astro`, `tests/seo.test.ts`: unconditional brand-derived Organization and references from WebSite/Article; safe JSON serialization already exists.
- Starter `src/core/static-page-copy.ts`, `src/components/LegalPage.astro`, `src/pages/privacy.astro`, `src/components/Footer.astro`, `src/data/page-inventory.json`: public legal starter prose, review notice, footer links and inventory flags.
- Starter `scripts/validate-site.ts`, `scripts/build-site.ts`, `src/core/catalog.ts`, `src/core/site-validation.ts`, `package.json`, `.github/workflows/ci.yml`: authoritative inventory/catalog, fixed legal routes, final/evidence split, technical audits, no browser suite.

Historical baseline test counts are evidence from the frozen audit, not tests newly executed for this design. No Starter build, browser suite, or application test is run or claimed here.

## C. Design Scope

| ID | Frozen status / Core responsibility | Design boundary |
|---|---|---|
| AX-01 | GAP / DIRECT; conditional when dismissible navigation is used | Portable disclosure behavior and its evidence |
| AX-03 | GAP / DIRECT | Supported-breakpoint and keyboard integrity on representative Core pages |
| PP-02 | GAP / SEAM | Core detects its known starter residue; adaptation/content remove it and own broader production truth |
| TL-01 | GAP / DIRECT safety mechanism | Core suppresses drafts and gates legal activation; policy prose belongs to Project Content |
| TL-02 | PARTIAL / SEAM | Core prevents unsupported structured identity defaults; actual identity/affiliation truth stays external |

Frozen Product Contract implementation-owner rows remain unchanged. The baseline's Core mechanism responsibility does not transfer editorial, legal, or identity truth to Core.

## D. Design Principles

1. Reuse existing inventory, enabled catalog, route resolution, output auditing and final/evidence build stages.
2. A deterministic technical contradiction is an error. Missing optional legal content or identity is a safe absent state, not a request to fabricate it.
3. Require explicit project signals only for claims/content actually activated. Bind approval to its subject; never infer approval from branding or unrelated review flags.
4. Browser tests prove executable Core behavior. Generated-output tests prove what ships. Neither substitutes for project truth or independent Acceptance.
5. Keep behavior independent of game names, visual layout, Pattern choice and deployment provider. Browser support is explicit test scope, not a promise about all browser versions.
6. Use ordinary platform semantics, small local behavior and fixed deterministic checks. Do not introduce a workflow or policy engine.

## E. Existing V2.6.5 Constraints to Preserve

| Preservation obligation | Composition requirement |
|---|---|
| IA-02 | Every link resolves through the enabled catalog; unavailable destinations stay noninteractive. No safety feature emits a fake `href` or bypasses validation. |
| ID-01 Core seam | Keep explicit related-page IDs and enabled-page filtering; relevance remains authored externally. |
| SEO-01 | Keep unique inventory metadata and canonical generation. Legal/identity states cannot create a second route or URL authority. |
| SEO-03 | Keep sitemap/robots, JSON-LD serialization, truthful page types and Breadcrumb/Article connections. Remove unsupported identity assertions only. |
| PP-01 | Preserve 404 recovery, draft/private exclusion, honest empty/unavailable states and exact output reconciliation. |
| MR-01 Core seam | Keep ads disabled by default, zero disabled output, reservation semantics and provider isolation. No ad/analytics activation is added. |
| Media validation | Keep typed catalog, local/source checks, render audit and fail-closed stages. No media schema redesign in this task. |
| Pagefind adapter safety | Keep safe local URLs, bounded excerpts, empty/error truth, artifact normalization/exactness and budget checks. |
| Route/output reconciliation | Expected routes continue coming from validated inventory/catalog. Legal eligibility must feed this same expectation before rendering. |
| Final/evidence split | Keep fresh technical stages, NOT FINAL evidence marker, marker-write failures and final-marker rejection. New checks cannot weaken existing failures. |

The current media-readiness machinery and Pagefind implementation remain valuable implementation preserves. Their location does not establish new permanent ownership. This design leaves their layer placement and interfaces unchanged.

## F. AX-01 Core Contract

### Mini-contract

| Field | Contract |
|---|---|
| Capability ID | AX-01 |
| Core Obligation | A dismissible navigation disclosure obeys the interaction invariants below at every supported navigation mode. |
| Safe Default | Ordinary non-modal navigation links; no focus trap; closed enhanced panels contain no reachable tab stops. Without JavaScript, destinations remain reachable and operable through the selected native disclosure or static navigation baseline. |
| Configuration / Input | Existing resolved groups, accessible labels, active route and actual responsive mode. Unique trigger/panel IDs are local component mechanics, not game data. |
| Output Behavior | Semantic navigation, keyboard-operable disclosure, truthful state and deterministic close/focus handling. |
| Forbidden Behavior | `role=menu` for ordinary site links; link and toggle combined into one ambiguous action; hidden focus; stale expanded state; global state dependency; trapped Tab. |
| Failure Condition | Any invariant fails in Core browser evidence: FAIL TEST. A missing/dangling control ID where one is required, or a mismatched rendered initial state, also fails static/output tests. |
| Required Core Evidence | Semantic/initial-state checks plus real keyboard, Escape, nested close, link activation, responsive transition and no-JS browser assertions. |
| Acceptance Responsibility | Repeat relevant behavior on final Pattern/theme/content, including real labels, group depth, long menus and any overlay composition. |
| Non-Goals | Universal navigation layout, modal drawer framework, arbitrary mega-menu engine, React requirement, global state store. |

### Behavioral invariants

| Concern | Required behavior |
|---|---|
| A. Trigger | Named native `summary` for a disclosure or named native `button` for an equivalent implementation. Enter/Space activate once. A parent destination is a separate real link. |
| B. Panel | Labeled `nav` and ordinary lists/anchors; nested groups use disclosure semantics, not application-menu roles. A custom button disclosure uses `aria-controls` where it truthfully names the controlled panel. Native `details/summary` does not require a redundant control reference. |
| C. Keyboard | Tab/Shift+Tab follow DOM order; closed panels and inactive responsive copies are excluded. Opening must not require hover, arrow keys or a pointer. |
| D. Escape | With focus in a disclosure or its trigger, Escape closes the innermost open disclosure containing that focus and returns focus to its own trigger. A second Escape can close the outer disclosure. Do not close unrelated page widgets or consume Escape when no relevant disclosure is open. |
| E. Open focus | For the recommended non-modal disclosure, focus stays on its trigger; the next Tab enters the first available panel control. This is the explicit open destination, not an omitted focus decision. |
| F. Close focus | Escape and explicit close from inside restore the associated visible trigger. Trigger toggling already leaves focus there. Closing an ancestor resets descendants and restores the ancestor trigger. Never leave focus in newly hidden content. |
| G. State truth | Expanded state must be truthful and programmatically understandable. For native `details/summary`, `details.open` is authoritative and native disclosure semantics are the baseline; do not require redundant `aria-expanded` or `aria-controls`. Add either only when supported-browser/assistive-technology evidence demonstrates a real need and it can remain truthfully synchronized. For a custom button disclosure, `aria-expanded` is required, `aria-controls` is required where it truthfully identifies the controlled panel, and both state and actual visibility stay synchronized. No independent ARIA-only state. |
| H. Mode transition | When mobile controls become hidden, close/reset mobile disclosures. If focus would be hidden, move it to the matching visible desktop destination, otherwise the visible home link. Reverse transition moves hidden desktop focus to the visible mobile trigger; unrelated focus is left alone. Returning to mobile starts closed. |
| I. Nested groups | Same keyboard/state rules per group; retain parent overview links. Reset nested open state when outer navigation closes; independent sibling groups need no accordion exclusivity. |
| J. Progressive enhancement | Without JavaScript, every navigation destination remains reachable and operable; no specific expanded/static presentation is required. When native `details/summary` supplies the baseline, retain its native disclosure behavior and do not force every group open. JavaScript adds only behavior this contract requires but native behavior does not reliably provide, such as Escape close, focus restoration, responsive-mode cleanup, nested cleanup or an evidence-backed compatibility correction. Enhancement is atomic: it must not leave navigation half-initialized or unusable, and must avoid unnecessary layout shift, a flash of expanded navigation, duplicate state or hydration-only usability. No-JS Escape support is not required when JavaScript supplies Escape behavior. |
| K. Minimum evidence | Browser assertions inspect focus and actual rendered visibility/state, not source text or click counts. Prove all close causes and transition rules. |

Link activation closes the originating disclosure before a same-document destination hides it. Focus then follows the actual target: a same-page anchor gets its visible target; a new document uses ordinary navigation without a late focus-restoration callback. If client-side navigation is later selected, its destination-focus policy is project integration work; it must not restore focus to an obsolete trigger. No router is added here.

Outside-click closure is optional. If selected, it must not steal focus from the clicked outside control; Escape remains mandatory. Dismissible desktop disclosures, if present, obey the same close/state rules. The current desktop hover/focus presentation may be retained only where keyboard paths work and no dismissal contract is evaded by styling. A desktop dismissal defect warrants the smallest local behavior correction, not a new navigation architecture.

### Native implementation decision

**DECISION:** Native `details/summary` may remain for non-modal navigation.  
**WHY:** It already supplies platform disclosure and keyboard semantics; the proven gap is missing Escape/focus/responsive evidence and proof that expanded state remains truthful.  
**ALTERNATIVES REJECTED:** Mandatory replacement with a framework or custom button stack adds scope without evidence. Bare native markup leaves Escape, focus and responsive behavior unproven.  
**MINIMUM SCOPE:** Local enhancement for Escape/focus, link/ancestor close, mode changes, nested cleanup and atomic enhancement; preserve native toggling without double-handling Enter/Space. Test native `open` semantics directly. Test explicit ARIA state/control relationships for a custom button disclosure, or only when evidence justifies adding them to the native implementation.  
**NON-GOALS:** Modal behavior, body scroll locking, focus traps, configurable open-focus modes. A project choosing a modal composition must separately satisfy its modal accessibility obligations; this design does not authorize that implementation.

## G. AX-03 Core Browser Integrity Contract

### Mini-contract

| Field | Contract |
|---|---|
| Capability ID | AX-03 |
| Core Obligation | Run an executable supported-browser/breakpoint suite over representative pages built with actual Core primitives and neutral fixture data. |
| Safe Default | Browser evidence is required for Core changes; a source-only or skipped suite cannot be recorded as PASS. |
| Configuration / Input | Fixed Core fixture set, support widths, current Core breakpoint values and locked test-browser revisions. |
| Output Behavior | Deterministic pass/fail report linked to capability, fixture, engine, viewport and assertion. |
| Forbidden Behavior | Substitute screenshots/source matching for interaction; test a reimplementation of Core; crawl every project route; call fixture success assembled acceptance. |
| Failure Condition | Broken invariant, fixture/server startup failure, browser unavailable or missing required run: FAIL TEST/CI, not a success or warning. |
| Required Core Evidence | Matrix below, no horizontal page overflow, reachable keyboard path, focus/Escape/state, reduced motion and touch assertions. |
| Acceptance Responsibility | Run these semantics independently on actual assembled core routes and project composition; extend cases for project-specific components. |
| Non-Goals | Full browser QA platform, all-route screenshots, live external services, Reference A/B/C, human visual sign-off. |

### Ownership/location decision

**DECISION:** Choose option 3: a small Core fixture runner maintained alongside future Starter development tests. Its fixture pages/artifacts are test-only and excluded from public inventory and final output. Acceptance later reuses the documented assertions/semantics, while retaining independent inputs and verdicts.  
**WHY:** Core changes get nearby executable evidence; synthetic starter branding and unfinished project content do not prevent mechanics testing. Only one small runner is needed now.  
**ALTERNATIVES REJECTED:** Option 1 understood as testing the Starter's entire shipped example site mixes adoption/pattern content with Core proof. Option 2, a reusable external acceptance harness, requires an absent acceptance product and delays Core ownership. Option 3's local development location does not create a separate distributed testing service.  
**MINIMUM SCOPE:** One runner and three logical fixture roles with real Core components. A conventional browser-test tool such as Playwright is suitable later, but tool choice is not a runtime Core API or authorization to install it now.  
**NON-GOALS:** Exported harness package, runtime test endpoints, generic crawler, project registry, screenshot service or Acceptance implementation.

### Representative fixtures and route scope

| Logical fixture | Required coverage |
|---|---|
| Shell / navigation | Actual header/mobile/desktop navigation, one nested group, a valid destination, representative long labels, skip link, main and footer; an honest unavailable non-link |
| Content / detail | Actual base/article shell, breadcrumb and related-link seam, long text/URL and a scrollable wide table using existing styles; valid deterministic destination for link activation |
| Recovery | Actual custom 404 body and existing valid recovery links; test serving maps an unknown URL to it rather than returning an unrelated 200 page |

Fixture names are logical roles, not new mandatory product routes or Pattern archetypes. They must use project-like neutral adopted values for output tests and no asserted real game/entity identity. They test Core, not copied CSS or a new Pattern. Optional search/media/ads fixtures are not added; existing adapter/unit/output tests continue. Legal and identity permutations mainly belong to generated-output tests, not more browser routes. Fixture build uses the same relevant validation/render/audit mechanisms; any existing media-readiness decision required by the build is supplied explicitly and never auto-approved by the runner.

### Minimum supported matrix

| Run | Engine(s) | CSS viewport | Coverage |
|---|---|---|---|
| Baseline | Chromium, Firefox, WebKit at locked runner revisions | 390×844 mobile; 768×1024 tablet; 1280×800 desktop | All three fixture roles: 27 page/engine/viewport observations; navigation interaction is concentrated on the shell |
| Boundary/resize | Chromium | Navigation `b−1`, `b`, `b+1`; V2.6.5 b=900; also layout 619/620/621 | Shell and detail overflow at boundaries; live resize with focus in open mobile/nested panel, reverse transition and repeated resize |
| Reduced motion | Chromium | 390×844 and 1280×800 | Shell/detail under `prefers-reduced-motion: reduce`; no nonessential reveal movement or motion-dependent access |
| No-JS | Chromium, Firefox, WebKit | 390×844 | Shell fallback: all links/nested destinations reachable; selected native disclosure remains operable; no fully expanded layout or no-JS Escape assertion required |

This is a minimum fixture matrix, not all routes × all settings. Derive boundary values from actual Core styles, rather than hardcoding an unrelated test breakpoint. Future changes to supported Core breakpoints update the same small boundary cases; final Pattern breakpoints remain Acceptance scope. The widths sample mobile/tablet/desktop; they do not establish a mobile-device or OS certification program.

Assertions:

- **Overflow:** `document` scroll width must not exceed viewport client width by more than 1 CSS pixel after layout settles, with panels both closed and open. Wide-table scrolling stays inside its intentional local container. Do not hide body overflow to conceal defects; controls must remain visible and reachable.
- **Keyboard:** Tab reaches skip link; Enter moves focus to main; then expected header/group/destination/footer controls are reachable in order with visible focus. Shift+Tab reverses; unavailable states are not links or tab stops. Desktop children cannot be hover-only.
- **Focus/Escape:** Execute AX-01 open/close/nested and resize rules; assert the actual active element, panel visibility and implementation-appropriate programmatic state after each event. Check no invisible responsive copy retains focus.
- **Reduced motion:** Inspect computed motion behavior and ensure content is visible without animation completion. Cosmetic zero-duration differences are not a framework API; nonessential transform/reveal motion must be suppressed.
- **Touch/tap:** In the mobile fixture, navigation/close/group controls have at least 44×44 CSS-pixel hit regions, preserving the existing touch-size intent. Assert a long menu scrolls to its last reachable link; tap trigger/group/destination through supported pointer APIs. The other engine baselines still check geometry and activation; hardware touch certification is not claimed.
- **Route safety:** Exercise the small set of valid destinations and unknown-route recovery. Whole-project link/output audits remain in existing mechanisms and future Acceptance.

CI must execute the required runner in addition to existing type/unit/output checks, provision test browsers explicitly, fail on missing/skipped matrix entries, and retain a small machine-readable result plus a short readable summary. Evidence includes capability ID, fixture role, tested revision, engine/revision, viewport, motion/JS mode, assertion, PASS/FAIL and failure reason. A failure trace or screenshot is diagnostic; no successful-route screenshot collection is required. CI's failure is a Core test failure, not an independent assembled launch verdict; browser execution need not be repeated inside every project final build command.

## H. PP-02 Production Residue Contract

### Mini-contract

| Field | Contract |
|---|---|
| Capability ID | PP-02 |
| Core Obligation | Detect Core's own known adoption residue in production inputs and emitted public surfaces. |
| Safe Default | Unadopted Core sentinel values cannot pass final validation/build; omission of the checker/catalog is an error. |
| Configuration / Input | Core-owned catalog of exact reserved values/signatures and fixed scopes; optional project-added literal sentinels. Existing route/catalog projection supplies applicability. |
| Output Behavior | Deterministic errors identifying sentinel ID and input field/output route; evidence builds may report known ordinary sample residue as NOT FINAL warnings. |
| Forbidden Behavior | Broad word heuristics, arbitrary regex policy, identity database, “all content approved” bypass, global production allowlist or silent catalog removal. |
| Failure Condition | Known residue on an applicable production surface, missing catalog/checker, an unreadable required enumerated surface or incomplete required-surface coverage blocks final build. |
| Required Core Evidence | Positive/negative sentinel fixtures, active/draft projection, metadata/JSON-LD/404 output, final/evidence separation, explicit surface coverage and missing required-surface failure. |
| Acceptance Responsibility | Find unknown/copied brand residue, fake contacts/counts and editorial problems; determine genuine project identity/content truth. |
| Non-Goals | Generic AI quality scanner, profanity/trademark linter, game-fact checker, arbitrary-code/binary scanner. |

### Residue catalog and matching

| Reliably detectable class | Rule and scope |
|---|---|
| Core example domain | URL host equals `gameatlas.example` or a subdomain, case-normalized by URL parsing; token-boundary match for that known hostname in text. Inspect site URL, active provenance/contact/link fields and generated URLs/text. Do not reject a longer unrelated hostname by substring. |
| Core example brand | Exact normalized `Game Atlas` / shipped short name or social handle values in the authoritative branding fields and their known title/site-name/header/footer projections. Full template-copy signatures elsewhere also apply. No global ban on every quoted occurrence of those words. |
| Core instruction prose | Exact complete shipped review notice and Replace/Add instruction sentences, plus stable distinctive starter-policy paragraph signatures from `static-page-copy.ts`. Match decoded text with normalized HTML whitespace. |
| Explicit unfinished markers owned by Core | Exact distinctive placeholder tokens/signatures actually present in shipped production-facing examples. Register them when supplied; plain words `Replace`, `Add`, `TODO`, `TBD` alone are not universal banned tokens. |
| Other Core example facts/contacts/counts | Only their explicit shipped reserved values/full signatures in relevant fields; this design does not invent a default fake-contact/count list or classify arbitrary numbers. |

The catalog is versioned with Core source and tested against Core's supplied production examples. It is immutable from project config; projects may add literals and narrow predefined surface scopes, not erase built-ins or supply executable patterns. Pattern matching is limited to fixed URL-host logic and bounded marker signatures implemented by Core. Exact phrase matching is the default, with documented whitespace/case normalization for that entry; do not apply fuzzy matching or strip punctuation indiscriminately.

Short generic words are rejected only as part of a known Core instruction signature. Thus an ordinary “Add item” control, a game object containing “Atlas”, architecture documentation quoting a sentinel, and private/draft notes do not fail this gate. A legitimate quoted brand in article body is not a branding-field sentinel. Unknown partial rewrites are for Acceptance; Core does not claim complete residue detection.

### Source and output coverage

Source preflight scans resolved production-bound values: active config, enabled inventory metadata/provenance, resolved content/legal copy, public chrome and local text assets actually referenced or shipped. It does not grep every repository file: tests, docs, the sentinel catalog itself, dependency code and unshipped drafts are excluded. An inactive page carrying sentinel notes is allowed only when none of those notes are projected into production metadata, related links or artifacts. `noindex`, 404, about/footer and unlisted-but-emitted surfaces are not exclusions from output safety.

Generated-output checks are authoritative for what ships. Core scans only enumerated production-facing textual surfaces that can legitimately contain Starter-owned known sentinel content. The required coverage map includes emitted public HTML decoded visible text and relevant accessible names; title/meta/share metadata and canonical/public URLs where applicable; parsed JSON-LD strings; sitemap/robots textual output; known search-index textual inputs and payloads through the existing adapter; and known Core-owned public textual/SVG assets where applicable. The coverage map, not generic recursive traversal, defines the required scan boundary.

A complete scan means every required enumerated surface was successfully checked; it does not mean every file or byte under `dist` was scanned. Do not recursively scan arbitrary JavaScript bundles, framework runtime chunks, third-party bundled code, source maps, dependency code, opaque provider artifacts or binary files unless an artifact is explicitly defined as a known Core-owned production-facing textual surface. For a compressed/provider-specific artifact already in the coverage map, reuse its existing deterministic adapter/index-source mapping instead of introducing a generic decompressor or artifact parsing framework. If a required enumerated surface cannot be read or checked, final validation fails closed. Existing manifest/file safety checks still apply, and no network fetch is needed.

The catalog is validation tooling, not client payload. Its normative sentinel strings do not themselves ship. At source time the known branding/URL checks are explicit adoption assertions; a separate universal `projectComplete=true` flag adds no evidence and is not required. Rendered scanning catches hardcoded copies, entity encoding and stale generated output missed by source projection.

### Build and exception semantics

- **Final:** Preflight fails on applicable known sentinels. Post-render auditing fails on any covered emitted sentinel, including nonindexable surfaces and stale output. Nonzero exit means no final success; a source pass never waives output checks.
- **Evidence/evaluation:** Explicit evidence purpose may permit ordinary example brand/domain residue as reported warnings while retaining the existing NOT FINAL marker and all technical errors. It cannot publish legal drafts, assert unconfirmed identity, relax broken routes, skip scans or convert findings into approval. There is no new generic evaluation mode.
- **Exceptions:** No production allowlist in this minimum contract. False positives are prevented by exact signatures/scopes. A genuine collision requires a reviewed catalog-scope correction with negative tests; it cannot be hidden by a site-wide exception. Test fixtures/docs use the nonproduction scope, not an exception. Capability P1 failures are not made launchable by a P2-style waiver.
- **Inventory/legal/SEO:** Use the enabled projection, then scan all actual output. Legal approval never clears a residue finding. Branding in canonical/metadata/JSON-LD must be adopted even when Organization is omitted. Dormant legal records must not leak through a fixed-route renderer.

**DECISION:** Use one small deterministic Core sentinel catalog and two complementary check surfaces.  
**WHY:** Core can recognize what it supplied; output auditing already exists.  
**ALTERNATIVES REJECTED:** Generic word lists produce false positives; broad AI linting requires judgment; a single adoption flag can lie; repository-wide grep blocks harmless docs/drafts; source-only checks miss shipped hardcoded copy.  
**MINIMUM SCOPE:** Fixed built-ins, additive literal inputs, source projection, existing output-audit integration and final/evidence result handling.  
**NON-GOALS:** General content lint service, customizable regex engine, exception workflow, complete fake-fact detection.

## I. TL-01 Legal Safe-Default Contract

### Options evaluated

| Criterion | A: disabled/unavailable only | B: routes exist, final requires approved content | C: unavailable capability + explicit activation |
|---|---|---|---|
| Simplicity | Smallest disabled default, but activation rules remain unspecified | Simple gate, with every default adoption needing policies if routes are always active | Small per-route activation rule using existing inventory |
| Truthfulness | Honest absence | Truthful only if all preview/public routes are gated | Honest absence; only approved project text becomes public |
| Accidental-launch risk | Low for absent routes; later activation still needs safety | Low for final builds; default route rendering/preview needs additional care | Low: approval and eligibility checked before public projection, plus output guard |
| Adoption friction | Low initially; project must later add policy path | Higher if policies are required regardless of project need | Only intentionally activated policies need approval |
| Static content | Compatible | Compatible | Compatible; no service/CMS required |
| Future ads/analytics | Needs later activation path | Policy review still needed | Preserves explicit policy path; actual behavior matching is TL-03/Acceptance |
| Ownership | Keeps prose external but underspecifies gate | Content external; Core approval gate | Core eligibility/render safety; Project Content approval/prose |

**DECISION:** Choose C.  
**WHY:** A truthful absent default and an explicit safe activation path address both current public-draft leakage and later project adoption with modest scope.  
**ALTERNATIVES REJECTED:** A alone does not define safe activation. B with default active routes can force unnecessary legal prose and leaves preview leakage unless extended toward C.  
**MINIMUM SCOPE:** Independent unavailable/active state for each supported legal route, bound approval signal, catalog eligibility and output checks.  
**NON-GOALS:** Legal drafting, jurisdiction rules, mandatory lawyer review, review roles/services, tracking-policy automation.

### Mini-contract

| Field | Contract |
|---|---|
| Capability ID | TL-01 |
| Core Obligation | Never render its starter/draft legal instructions as public policy; activate only explicitly approved project-owned content. |
| Safe Default | Privacy and Terms capabilities exist, but legal pages are unavailable and emit no policy route/link/schema. |
| Configuration / Input | Per-route activation; existing inventory/content identity; project approval bound to the legal payload digest. |
| Output Behavior | Unavailable state emits zero legal paths; approved active state emits the exact resolved project policy through ordinary route/SEO mechanisms. |
| Forbidden Behavior | Fabricated policies/operator data; generic completeness claims; `needsReview=false` or `published` alone implying approval; draft preview through public routes. |
| Failure Condition | Active route with missing/empty/draft/stale/unapproved content, `needsReview=true`, inconsistent inventory/indexability, or known residue blocks final build. Broken public projection also fails evidence builds. |
| Required Core Evidence | Default absence, approved exact payload, stale digest, flag contradictions, footer/sitemap/search exclusion, direct-route suppression, output residue. |
| Acceptance Responsibility | Policy is appropriate and matches hosting, providers, storage, ads/analytics/forms/accounts and other actual behavior; whether policy is needed. |
| Non-Goals | Legal completeness, legal advice, lawyer approval requirement, operator directory, CMS approval workflow. |

### States and routing

| State | Required behavior |
|---|---|
| Unavailable (default) | Keep an inactive inventory identity if useful for provenance, with nonpublic/draft and `noindex` flags; emit zero static paths. Footer/header/related lists omit it. If a composition displays a label, use noninteractive unavailable text with no `href`. An incoming URL uses existing unknown-route 404 handling. |
| Active | Project explicitly enables that route. Inventory is public/published/ready, no review pending, with nonempty resolved content and current content-bound approval. It enters the same enabled catalog as other real routes. |
| Draft/private policy | May remain in project source; never rendered as policy in final or evidence output. No new public draft-preview route. |
| Invalid attempted activation | Validation error, not silent suppression or automatic approval. Unknown activation state and unreadable content fail closed. |

Core's legal eligibility result must be applied before route generation, navigation resolution, related links, Pagefind, sitemap and expected-output reconciliation. A legal record cannot become public merely because its inventory flags say published. Conversely, an unavailable legal record cannot claim indexability or remain a required rendered fixed route. Change only the privacy/terms fixed-route assumption; home/about/404 guarantees stay intact. The inventory remains route authority; no parallel route registry is introduced.

Approval is a project assertion, not Core's legal verdict. It names the current resolved policy payload by SHA-256; content changes invalidate it. The payload covers title/intro, sections and any policy-facing notices or claims, excluding unrelated site chrome and technical timestamps. Its deterministic serialization is part of the small contract. Core checks equality/nonempty content and rejects pending review, but does not judge legal adequacy. A project can approve local Markdown/static data without any lawyer, account service or CMS. No approval prose, reviewer identity or evidence note is auto-published.

Active legal routes default to `noindex` as a Core safe presentation default; a project may deliberately select `index` using existing inventory rules. `noindex` active routes stay out of sitemap/search indexing and carry ordinary canonical/robots metadata; they still undergo full residue/output checks. Unavailable routes have no canonical page or JSON-LD and no sitemap entry. Dates must come from actual project content; do not generate a “Last reviewed” claim from an unrelated modification date or mere approval boolean.

The policy decision does not force real operator/contact data where unnecessary. Future ads/analytics may make policy accuracy/applicability material; that decision remains with project owners and TL-03 Acceptance. Core neither enables those integrations nor declares absence of policies sufficient for launch.

## J. TL-02 Structured Identity Safety Contract

### Separate meanings

| Concept | Meaning / input authority |
|---|---|
| Site brand | Site display name; may name WebSite and visible chrome. It is not proof of an organization. |
| Legal/operating organization | Real entity explicitly confirmed by Game Adaptation, with evidence reference; may produce an Organization node. |
| Author | Person or organization actually credited for the specific article; independent explicit role assertion matching visible attribution. |
| Publisher | Entity actually responsible for publishing the site/article; independent explicit role assertion, not derived from brand or author. |
| Official/affiliated/independent status | Separate project claim requiring real supporting evidence and Acceptance; no default status is inferred or synthesized. |

### Mini-contract

| Field | Contract |
|---|---|
| Capability ID | TL-02 (Core safety portion only) |
| Core Obligation | Emit no identity/role/affiliation assertion by default; accept explicit project-confirmed identity and roles without confusing them. |
| Safe Default | WebSite uses brand as site name; WebPage references WebSite. No Organization, publisher, author, invented Person, official or independent claim. |
| Configuration / Input | Optional explicit organization record; independently optional site publisher and per-Article author/publisher claims, with nonempty identity/role evidence references and project confirmation. |
| Output Behavior | Emit only opted-in valid nodes/relationships; missing optional identity yields coherent base/Article/Breadcrumb graphs. |
| Forbidden Behavior | Infer Organization from brand; invent an anonymous editorial team; reuse publisher as author; infer affiliation from URL/logo/name; emit dangling identity references. |
| Failure Condition | Attempted nonempty claim lacking confirmation/evidence, malformed/conflicting identity or dangling reference blocks final build. Such claims are errors in evidence mode too. |
| Required Core Evidence | Default absence, valid explicit role paths, invalid/missing evidence, distinct author/publisher, graph-reference integrity and JSON serialization safety. |
| Acceptance Responsibility | Verify entity existence, role, operator/company/contact and affiliation/independence claims against actual project sources and visible content. |
| Non-Goals | Organization directory, identity verification service, legal registry, schema.org framework, rich-result guarantees. |

### Graph emission rules

1. **Default graph:** Preserve the existing canonical-derived `#website` and `#webpage` IDs, site URL/name/description/language and inventory-derived page metadata/dates. `WebPage.isPartOf` references WebSite. No default `#organization` node or `publisher` relationship.
2. **Organization:** Emit only an explicit nonempty organization identity with project confirmation and an evidence reference that supports that entity. Core validates shape/evidence presence; Acceptance verifies truth. An organization record alone does not make it the site's publisher or an article author. No contact/address/logo/social properties are added merely to fill a schema shape.
3. **WebSite publisher:** Emit only an explicit site-publisher role claim identifying a confirmed Organization or Person with role evidence. The referenced node must be emitted in that graph. Brand similarity and organization presence are not role approval.
4. **Article author:** Emit only explicit per-article attribution with identity and author-role evidence, matching the visible credit. An organization can be an author only when this actual attribution is asserted; it is never the default. An author cannot be silently substituted from publisher.
5. **Article publisher:** Emit only an explicit publisher role applicable to that article. A confirmed site publisher may be reused only with an explicit article selection of that role; no automatic inherited publisher fallback. Publisher may exist without author and author without publisher.
6. **Absent identity fallback:** Keep Article headline, description, language, valid dates and `mainEntityOfPage` → WebPage. Omit author/publisher properties entirely; do not emit null, fictional nodes or references to removed Organization. BreadcrumbList and canonical remain intact. Reduced identity detail may affect consumer-specific rich-result eligibility; it does not justify fabrication or removing all JSON-LD.
7. **Affiliation/status:** None is inferred from any of the above. This minimum Core interface has no automatic official/independent badge or affiliation schema mapping. Any later explicit status extension must maintain the same opt-in/evidence boundary and remain subject to Acceptance; it is not implemented/designed as an engine here.

Core's current additional `structuredData` extension seam must not bypass these rules. In this phase, automatic interpretation is limited to `@type: Organization`, `@type: Person`, `author`, `publisher` and explicit references to those controlled Organization/Person identity nodes. When supplied output contains one of these constructs, final output audit verifies the corresponding explicit project claim inputs and local references. Unsupported in-scope assertions and dangling controlled identity references fail validation rather than escaping through an opaque graph node.

The guard does not automatically interpret or regulate every Schema.org identity or relationship concept. `sponsor`, `founder`, `employee`, `member`, `affiliation`, `parentOrganization`, `subOrganization`, brand relationships and arbitrary future properties remain outside automatic Phase-1 interpretation unless they directly reuse a controlled identity node in a way the narrow graph-integrity check must validate. Normal non-identity structured-data extensions remain available. Future evidence may justify an explicit contract extension, but this phase does not authorize a generic ontology parser, general Schema.org rules engine, semantic interpretation of arbitrary JSON-LD or complete identity graph validator. Visible real credits and controlled structured relationships must have an explicit resolved mapping; Core never attempts to infer identity from prose.

Project configuration confirmation is not independent verification, and a nonempty evidence reference is not proof that a claim is true. Unsupported/conflicting inputs are deterministic Core errors; plausibility/accuracy of well-shaped claims requires Acceptance review. If identity is wholly absent, absence is valid and does not require an operator to be invented.

**DECISION:** Non-assertive base graph, with independently explicit entity and role opt-ins.  
**WHY:** Preserves proven SEO-03 meaning while removing the exact unsafe default identified in the baseline.  
**ALTERNATIVES REJECTED:** Keep brand-derived Organization behind a universal adoption flag; infer all roles from a single organization; invent an editorial author; delete JSON-LD entirely.  
**MINIMUM SCOPE:** Optional explicit identity/role inputs, omission rules, narrow output guard and graph tests extending the existing helpers.  
**NON-GOALS:** New schema renderer/registry, identity lookup, affiliation-verification automation, search-engine eligibility certification.

## K. Shared Adoption / Approval State Decision

**DECISION:** Do not introduce a shared adoption/completeness lifecycle. Use existing build purpose plus separate subject-specific inputs.  
**WHY:** PP-02 evaluates detected values, TL-01 evaluates activation/content approval, and TL-02 evaluates entity/role claims. These states are independent; `starter → project-configured → approved-for-final` would let one approval appear to authorize unrelated claims.  
**ALTERNATIVES REJECTED:** Global `approved-for-final`, workflow engine, cross-content approval status, approval service/database. A universal boolean supplies no evidence of residue removal or policy/identity truth.  
**MINIMUM SCOPE:** Existing `final | evidence` purpose; per-legal-route activation/content digest; explicit confirmation/evidence per identity/role. A shared error-list/report style is ordinary plumbing, not a new lifecycle model.  
**NON-GOALS:** Approver roles, centralized project status, dashboard, signed legal certification, launch authorization.

Example valid combinations: an adopted site with no legal pages and no organization; an active approved privacy page with no organization; an explicit publisher with policies still unavailable. Whether each assembled combination is acceptable for actual site behavior remains Acceptance's decision. No combination grants a general launch PASS.

## L. Failure Semantics Matrix

| Capability / condition | Final build | Core test / CI | Evidence build | Acceptance |
|---|---|---|---|---|
| AX-01 interaction/focus/Escape/state defect | NOT APPLY as a mandatory browser invocation inside build | FAIL TEST | No interaction waiver; fixture tests still fail | REQUIRE ACCEPTANCE REVIEW on assembled navigation |
| AX-01 initial semantics or required custom/evidence-backed control reference defect | Existing static/output integration blocks if detected there | FAIL TEST | Technical defect remains error | Assembled defect is FAIL |
| AX-01 no-JS native/static navigation baseline | NOT APPLY to JS-added Escape behavior | Must pass destination reachability and selected native disclosure operability tests | Same | Verify actual fallback remains usable |
| AX-03 overflow/keyboard/motion/tap defect or required browser run missing | NOT APPLY to per-project build invocation | FAIL TEST/CI; missing evidence is not PASS | No PASS claim from skipped runner | REQUIRE ACCEPTANCE REVIEW; failing assembled paths remain FAIL |
| PP-02 known emitted/production-bound sentinel | BLOCK FINAL BUILD | FAIL negative test if not rejected | WARN only for ordinary sample residue; retain NOT FINAL | Verify broader/unknown residue; P1 cannot be waived here |
| PP-02 missing catalog, incomplete coverage map or unreadable/uncheckable required enumerated surface | BLOCK FINAL BUILD | FAIL TEST | Error; no completed evidence build | Core defect cannot be deferred to Acceptance |
| PP-02 private unshipped notes/docs/tests | NOT APPLY | Negative fixture proves exclusion | NOT APPLY | Review only if actually published |
| TL-01 unavailable coherent legal state | NOT APPLY / safe absence | Must prove no route/link/index | Same | REQUIRE ACCEPTANCE REVIEW if policies are needed |
| TL-01 active content unapproved/stale/draft, review pending, contradictory flags or residue | BLOCK FINAL BUILD | FAIL TEST if accepted | Error; never expose policy draft | Accuracy/applicability remains separate review |
| TL-02 no identity/role inputs | NOT APPLY / safe omission | Must prove coherent graph | Same | No fabricated identity demanded |
| TL-02 configured claim missing confirmation/evidence, conflicting controlled node, unsupported in-scope identity assertion or dangling controlled reference | BLOCK FINAL BUILD | FAIL TEST | Error; omit-by-default is not an invalid-config bypass | Core deterministic guard remains required |
| TL-02 well-shaped but untrue identity/role/status claim | Core cannot deterministically judge truth | Mechanical tests cannot certify truth | Cannot be described as independently verified | REQUIRE ACCEPTANCE REVIEW; false claim is assembled FAIL |

BLOCK FINAL BUILD means nonzero canonical final validation/build result, not deletion of user files or a new deployment system. Browser failures fail the Core development CI check; they are not converted into warnings or automatically run during each site render. No new release-governance machinery is designed.

## M. Core vs Acceptance Boundary

| ID | Core proves | Adaptation / Content supplies | Independent Acceptance proves |
|---|---|---|---|
| AX-01 | Trigger/panel mechanics, Escape/nested close, truthful expanded state, focus, responsive/no-JS safety | Labels, taxonomy, actual destinations and composition | Final nav remains usable with Pattern/theme/content, long labels, real route transitions and any chosen overlay |
| AX-03 | Executable representative portable shell/detail/recovery browser suite | Project pages, theme, extra widgets and project breakpoint choices | Actual assembled core routes pass relevant keyboard/overflow/focus/motion/tap checks; no Core PASS substitution |
| PP-02 | Its known sentinels cannot survive final source/output checks | Adopted names/URLs/copy and removal of all project residue | Unknown source-template residue, unsupported counts/contacts, finish and editorial truth |
| TL-01 | Unavailable default, explicit content-bound activation, no public legal draft, coherent catalog/output | Real policy text and approval of that exact content | Applicability, actual behavior-to-policy accuracy and no false completeness |
| TL-02 | No implicit identity; valid explicit mappings; coherent graph and omission fallback | Real identity/roles/claims with sources and visible attribution | Entity/role/affiliation claims are actually true and match final content |

Release Governance remains responsible for release approval, exceptions, capability history and future deltas. This document changes none of those owners. Core evidence can be consumed by Acceptance, but cannot self-issue independent assembled PASS.

## N. Minimal Interface Sketches

These TypeScript-style sketches describe inputs only. Names are illustrative and are not existing APIs, new files, or implementation instructions. No navigation options interface is needed: recommended behavior is fixed, and existing resolved groups are sufficient. Existing build purpose remains `final | evidence`.

```ts
type LegalActivation =
  | { state: "unavailable" }
  | {
      state: "active";
      approvedContentSha256: string;
    };
// Stored against an existing privacy/terms page identity.
// Content, public flags and indexability remain in existing project inputs.

type ConfirmedIdentity = {
  kind: "Organization" | "Person";
  name: string;
  projectConfirmed: true;
  evidenceRef: string;
};

type ConfirmedRole = {
  identity: ConfirmedIdentity;
  evidenceRef: string;
};
// Optional organization declaration must have kind Organization.
// Site publisher, Article author and Article publisher are separate optional
// role slots. Slot presence explicitly selects the role; absence omits it.

type AdditionalResidueSentinel = {
  id: string;
  literal: string;
  surface: "branding" | "url" | "public-text";
};
// Projects may add these; Core-owned built-ins are not supplied or removed here.
```

| Field | Justification |
|---|---|
| `LegalActivation.state` | Explicitly distinguishes absence from an attempted public policy; no lifecycle engine. |
| `approvedContentSha256` | Binds the project's activation approval to the resolved current policy payload; exact serialization/digest mismatch is testable. |
| `ConfirmedIdentity.kind` | Keeps a person and organization distinct; brand is neither by inference. |
| `name` | Minimum actual entity label; not populated from brand. |
| `projectConfirmed` | Explicit project assertion for this entity; a literal true is required for a present claim. Core cannot create it. |
| Identity `evidenceRef` | Refers to supporting project evidence without placing facts or credentials in Core. It need not be a network URL or publicly exposed. |
| `ConfirmedRole.identity` | Identifies the entity used in this specific role. Multiple roles may explicitly reuse the same record without a global directory. |
| Role `evidenceRef` | Supports the selected role, independently of entity existence; slot presence selects author/publisher and must not be inferred. |
| Sentinel `id` | Stable actionable diagnostic and fixture assertion. |
| `literal` | Explicit known project residue, not a heuristic or executable pattern. |
| `surface` | Restricts false positives using a fixed small set; no custom filesystem/glob/query DSL. |

No separate approval boolean is needed for legal content: supplying the current approved digest in an active record is the explicit signal. Identity and role inputs must be owned by project data; generated internal node IDs derive deterministically from canonical site/page and role, with node consistency checked when one entity is explicitly reused. Their exact naming is an implementation detail, not a new public identity registry. Different entities with conflicting reused IDs are errors. Evidence references remain review metadata and are not automatically serialized into public JSON-LD.

## O. Migration Delta from V2.6.5

| ID | Current behavior | Target / smallest conceptual delta | Preserve / must not rewrite |
|---|---|---|---|
| AX-01 | Static nested native disclosures; tests check markup and CSS, not interaction | Add local native enhancement, implementation-appropriate truthful state, focus/Escape/mode/link rules and executable tests | Keep resolved groups, overview links, actual destinations, layout choice and native disclosure semantics where supported; no redundant native ARIA or header/navigation framework rewrite |
| AX-03 | No browser dependency/script/suite; extensive unit/output tests and CI check/build | Add small test-only fixture runner and explicit support/evidence matrix | Keep current unit/type/build/audit checks and production layout primitives; no whole-site crawler or reference-project creation |
| PP-02 | Validation can pass with example URL/brand/instruction copy | Add known catalog, production-bound preflight and emitted-output guard in existing stages | Keep catalog authority, technical failures and final/evidence marker isolation; no content-engine rewrite |
| TL-01 | Privacy/Terms fixed routes publicly render starter prose; needsReview does not block | Make legal eligibility explicit, unavailable by default, zero paths until content-bound approval; guard active flags/output | Keep inventory identity, normal approved-page renderer/SEO and 404 recovery. Adjust only legal fixed-route requirement and its dependent catalog projection |
| TL-02 | Base graph emits brand Organization/WebSite.publisher; Article uses it as author/publisher | Omit default identity nodes/edges; accept separate explicit project identities/roles; adapt SEO tests and narrow output guard | Preserve helper signatures conceptually where practical, canonical/site/page IDs, Article/Breadcrumb meaning and safe JSON serializer; no SEO engine replacement |

Backward-compatible TL-02 concept: existing brand inputs continue naming WebSite/visible UI and existing callers still produce base/page/article graphs. Missing new identity inputs select the safe omission fallback. The old `#organization` assertion and its tests must change intentionally; preserving those unsafe defaults is not SEO compatibility. Projects needing entity/role nodes add explicit source-backed inputs later; no automated conversion from legacy brand to confirmed organization and no silently fabricated migration record.

These are conceptual deltas for architecture review, not implementation tickets, ordered rollout tasks, a new branch or a named candidate release.

## P. Minimum Evidence / Test Contract

| ID | UNIT / STATIC TEST | BROWSER CORE TEST | GENERATED OUTPUT TEST | ASSEMBLED ACCEPTANCE |
|---|---|---|---|---|
| AX-01 | Native `details.open` semantics; custom-button `aria-expanded` and truthful `aria-controls`; evidence-backed native ARIA only when synchronized; local close-state rules if factored | Shell fixture: Enter/Space, Tab/reverse, nested Escape, trigger restoration, link/anchor close, mode switch, no-JS reachability and selected native disclosure operability | Correct implementation-specific rendered state/control references; no inactive/closed focusable state advertised | Repeat final navigation paths and final composition |
| AX-03 | Runner enumerates required fixtures/matrix; missing run cannot report success | Section G minimum; real Core components, no copied behavior | Fixtures are absent from product output; existing route audit retained | Relevant assembled routes, project breakpoints/content/widgets |
| PP-02 | Each built-in positive and close negative; URL boundaries; exact phrase; docs/drafts excluded; catalog cannot be disabled | None beyond existing shell paths | Seed known residue across the enumerated coverage map; final rejects, evidence warns only where allowed; incomplete or unreadable required surfaces error | Unknown residue, content/brand/count truth |
| TL-01 | Unavailable/active union; missing/empty approval/content, changed digest, pending review and inventory conflicts | No additional route matrix; existing shell verifies no dead unavailable nav | Unavailable emits no legal paths/links/schema/sitemap/search; approved content emitted exactly; direct fixed-route leakage and known draft signatures rejected | Actual policy applicability and behavior match |
| TL-02 | Absent identity; explicit entity with no role; author-only/publisher-only/distinct roles; malformed/unconfirmed claims | No additional browser run | Default omits Organization and role references; eligible base/Article/Breadcrumb stay; valid opted-in nodes resolve; conflicting/dangling controlled references and unsupported in-scope identity assertions are rejected; non-identity extensions and script-closing safety are preserved | Entity and role truth; real visible attribution and status claims |

Use a few deterministic fixture data permutations, not one site per combination. Legal absence/valid/stale, identity absence/valid/invalid and residue positive/negative can reuse existing isolated build tests. Do not create Reference A/B/C or real game content to prove these Core conditions.

Core evidence must distinguish executed results from planned tests. This architecture document specifies required future evidence; it is not an implementation PASS report. No capability baseline is rewritten here.

## Q. Cross-Capability Interactions

| Interaction | Required composition |
|---|---|
| AX-01 → AX-03 | The fixture runner executes the same local navigation controller and real Core styles; explicit assertions close the source-only proof gap. |
| PP-02 + TL-01 | Approved legal activation still must pass sentinel checks; unavailable/draft content is excluded before rendering, and output auditing catches leakage. |
| PP-02 + TL-02 | Removing Organization does not clear sample branding in WebSite/canonical/title/URL; identity evidence never exempts a reserved output sentinel. |
| TL-01 + IA-02/PP-01/SEO-03 | One eligibility result flows through authoritative catalog/route generation and reconciliation; no dead footer links, unexpected legal outputs or stale search/sitemap entries. |
| TL-02 + SEO-01/SEO-03 | Retain route/canonical authority and graph nodes/relationships; condition only Organization/Person/author/publisher assertions and controlled-node references, including extension-seam output, while preserving non-identity extensions. |
| All safety checks + existing build split | Validate config and source projections, retain technical generation/reconciliation/search/output checks, then record success only if required gates pass. Evidence purpose affects permitted ordinary sample warnings only, not identity/legal technical truth. |

A browser fixture may use deliberately synthetic neutral project values; those values establish mechanical test scope only. They must not become production starter identity facts, legal content or evidence of a real operator. Unavailable legal pages and absent identity keep such fixtures small.

## R. YAGNI / KISS Rejections

### WHAT WE ARE DELIBERATELY NOT BUILDING

| Rejected addition | Why unnecessary now |
|---|---|
| Navigation framework | Native disclosure plus small local behavior closes the known gap. |
| Global state system | Disclosure state belongs to local platform elements. |
| Full Playwright site crawler | Three Core roles plus boundary cases prove portable mechanics; assembled coverage belongs to Acceptance. |
| Generic content linter | Core reliably knows only its own explicit sentinels. |
| Generic legal engine | Core controls activation/output, not policy law or adequacy. |
| Lawyer approval workflow | Project approval is required for activated content; professional-review requirements are project decisions. |
| CMS approval workflow | Static content and content-bound assertion suffice. |
| Organization directory | Few explicitly supplied entity/role records need no lookup platform. |
| Identity verification service | Acceptance verifies sources; Core checks declared inputs and safe output. |
| schema.org abstraction framework | Existing helpers/serialization remain; only narrow identity conditionality changes. |
| Generic ontology parser or Schema.org rules engine | Phase 1 guards only enumerated identity constructs and controlled-node graph integrity. |
| Universal policy engine | Three specific predicates are clearer than generic rules and policy composition. |
| Release-governance application | Existing Contract owns future release rules; this task supplies Core design only. |
| Page-builder DSL | No page composition redesign is needed for the safety defects. |
| Shared project lifecycle/dashboard | Legal, identity and residue are independent; a global completion state would conflate them. |
| Screenshot archive for every route | Assert interactions/layout; use failure diagnostics when useful. |

## S. Architecture Decisions

| Decision | DECISION | WHY | ALTERNATIVES REJECTED | MINIMUM SCOPE | NON-GOALS |
|---|---|---|---|---|---|
| 1. AX-01 | Native non-modal disclosure with local enhancement | Platform foundation already present | Bare details; mandatory framework replacement; redundant native ARIA by default | Escape/focus/truthful state/mode/link/no-JS invariants | Modal/nav framework |
| 2. AX-03 | Option 3, local Core fixture runner | Immediate owned executable evidence | Whole starter-demo suite; external Acceptance platform | Three roles, small support matrix and result artifact | All-route QA / Acceptance product |
| 3. PP-02 | Non-removable known catalog + enumerated source/output guard | Core knows its sample values; rendered truth matters | Broad word lint, global adoption flag, source-only or recursive bundle scan | Exact scoped built-ins; additive literals; explicit surface coverage; final/evidence treatment | Quality/fact/trademark/artifact scanner |
| 4. TL-01 | C, unavailable capability with approved activation | Stops drafts without inventing required policy | A without activation safety; B default active policies | Per-route state/digest; catalog/routing/output eligibility | Legal prose/law/review engine |
| 5. TL-02 | Safe base graph; independent explicit entities/roles | Brand does not establish identity or role | Implicit brand Organization; single-role inference; delete JSON-LD | Omission, explicit Organization/Person/author/publisher claims and narrow controlled graph/output guards | Identity registry / generic schema framework |
| 6. Shared state | No shared adoption/approval lifecycle | Subjects have different evidence and decisions | starter/configured/final enum; universal approval boolean | Existing build purpose, separate fields | Workflow service / launch certification |

All six recommendations are selected; alternatives are not left as undecided implementation choices. Detailed rationale and contract limits are in F–K.

## T. Risks / Open Questions

| Risk / review question | Resolution boundary |
|---|---|
| Native disclosure semantics could be insufficient in a particular supported browser/assistive-technology combination | `details.open` remains authoritative. Add ARIA only with evidence of a real need and prove truthful synchronization in the supported matrix; use a small equivalent button disclosure only if native behavior cannot satisfy the same contract. No mandatory replacement is assumed. |
| Absolute-positioned desktop/mobile behavior can conceal focus or overflow | Boundary/resize/open-panel tests are mandatory. Exact desktop markup changes depend on executed future evidence; preserve its presentation until a defect requires a local fix. |
| Sentinel catalog misses rewritten/unknown residue | Accepted limitation of deterministic Core detection; Acceptance checks unknown editorial/template residue. Do not broaden to fuzzy matching. |
| Exact policy digest serialization needs precision | Independent review should confirm the proposed policy-facing payload boundary. Future implementation must specify deterministic UTF-8 serialization and test all policy text changes; no unrelated timestamp churn. |
| Project confirmation/evidence pointer could be false | Core cannot certify truth. Acceptance reviews entity/role/policy evidence; no automated verification or network lookup is added. |
| Unavailable legal defaults could be mistaken for permission to launch a site needing policies | Acceptance retains applicability/behavior matching under TL-03. Default absence is only a Core truth guarantee. |
| Fewer Article identity properties may change a consumer's rich-result treatment | Honest omission is recommended; consumer-specific enrichment needs real project facts and is not required to close this Core defect. |
| Browser revisions and fixture tooling need pinning in future candidate | Implementation-stage choice only; support contract and missing-run failure are already decided. No install/candidate is created here. |
| Public textual surface coverage needs mapping to actual emitted files | Reuse current output reconciliation and Pagefind artifact adapter. Future implementation must maintain an explicit required-surface coverage map and reject unreadable, uncheckable or incomplete required coverage, without recursively scanning arbitrary bundles or building a generic parser platform. |

There is no unresolved choice among the six required architecture decisions. These are focused review/implementation details, not permission to expand architecture scope. Current source findings are sufficient to design the contract, not to claim future browser behavior already passes.

## U. Recommended Phase-1 Change Boundary

The recommended future boundary, if separately authorized after review, is exactly these five contracts: local accessible dismissible navigation; small Core fixture browser proof; Core-owned residue checks; legal route eligibility/activation; optional identity-safe graph emission. Only directly required config, validation, route projection, SEO and test seams fall inside that boundary.

This section identifies architecture extent only. It starts no implementation plan, ticket sequence, candidate, branch, release packaging or tooling installation. Independent architecture review may request a revision to this document; any implementation would require separate authorization afterward.

## V. What Must NOT Change

- Frozen Product Contract, Support Baseline and Starter checkout/tag/commit.
- Capability meanings/IDs, ownership, statuses and the distinction between Core evidence and assembled Acceptance.
- Proven IA-02, ID-01 Core seam, SEO-01, SEO-03, PP-01 and MR-01 Core seam.
- Existing media validation, Pagefind safety/artifact checks, exact output reconciliation and fail-closed technical build stages.
- Draft/private exclusion, safe local destinations, optional ads disabled defaults, safe JSON serialization and final/evidence marker integrity.
- Game truth remains in Adaptation, project policy/content remains in Project Content, launch/exception/history decisions remain in their external owners.

## W. What Must NOT Be Implemented Yet

No production code, Starter candidate/copy, branch, package/dependency, test fixture files, CI changes, commits, pushes or tags are authorized by this design task. No Pattern Library, Reference A/B/C, Acceptance Gate, Capability Delta tooling, Release Governance, SOP or Master Prompt change is created.

VF-01, VF-02, MC-01, MC-03, IA-03, FR-01, SEO-02 and MC-05 are not designed here. Existing focus/motion styles, media, search and metadata interfaces are referenced only to preserve compatibility and execute the five safety obligations. Testing their existing behavior does not constitute broader token, media, provider or freshness redesign. TL-03 remains an Acceptance dependency, not a Core legal engine.

### Architecture quality-gate self-check

| Gate | Design result |
|---|---|
| Every proposed Core behavior is game-independent | Yes: mechanics, known starter signatures, content/claim activation and graph integrity |
| No real game identity/content moved into Core | Yes: only input/evidence contracts; no project facts/prose supplied |
| No Acceptance responsibility silently moved to Core | Yes: human truth, policy adequacy and assembled use remain external |
| No Core responsibility deferred entirely to Acceptance | Yes: executable fixture evidence and deterministic output guards required |
| Existing proven mechanisms preserved | Yes: E, O, Q and V constrain all deltas |
| Exactly known safety scope addressed | Yes: four gaps and TL-02 Core portion only |
| No broad rewrite or next release named | Yes |
| No implementation plan or code started | Yes: design-only document; future tests/interfaces are specifications |

Execution immutability is rechecked after this clarification. That check is a file/provenance verification, not evidence that any future contract is implemented or accepted.

## X. Exact Next Step

Independent freeze verification of CORE_SAFETY_CONTRACT_DESIGN_V0.1.md.
