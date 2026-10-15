# Commercial Game Site Product Contract v0.2

**Status:** Architecture contract  
**Version:** 0.2  
**Date:** 2026-09-30  
**Evidence basis:** `5_SITE_PATTERN_CAPABILITY_AUDIT.md`  
**Scope:** Architecture documentation only; no starter, template, fixture, CI, or implementation change is authorized by this document.

## A. Executive Summary

The approved architecture remains:

> **Stable Core Starter + Product Contract + Pattern Library + Game Adaptation Layer + Independent Acceptance Gate**

Version 0.2 adds the missing continuity mechanism: a **Capability Registry** with stable IDs and lifecycle history. A future framework release is not defined by the code it happens to contain. It is defined by the capabilities it continues to prove.

```text
NEW VERSION
= ALL STILL-VALID PREVIOUS CAPABILITIES
+ NEW CAPABILITIES
+ IMPROVEMENTS
- ONLY EXPLICITLY DEPRECATED / REPLACED / REMOVED CAPABILITIES
```

It is explicitly **not**:

```text
NEW VERSION = PREVIOUS CODE + CURRENT ITERATION FEATURES
```

Every release candidate must compare its evidence with the prior frozen baseline. A previously passing P0 or P1 capability that fails or disappears blocks release unless an approved lifecycle decision records deprecation, replacement, or intentional removal with migration rationale. Silent regression is forbidden.

Version 0.2 migrates all 31 v0.1 requirements without deletion and adds 10 capabilities: media-needs assessment, video capability and usage evaluation, the Core search seam and conditional activation, three Trust / Legal Safety safeguards, Pattern/Core non-duplication, reference-project regression, cross-version regression, and capability lifecycle integrity.

## B. Why v0.2 Exists

Draft v0.1 described what a commercially acceptable game site should satisfy, but it did not guarantee that a new framework version would retain capabilities already proven by an older version. It also used a single `Owner` field that mixed authority, delivery, and validation; treated applicability as implicit; under-specified legal safety and media sufficiency; and contained inconsistent ownership for video and search.

Version 0.2 closes those gaps by:

- assigning every durable capability a permanent ID and auditable lifecycle;
- separating **Applicability** from **Severity**;
- assigning a Requirement Owner, Implementation Owner, and Verification Owner;
- adding explicit Trust / Legal Safety and Regression / Release Integrity domains;
- requiring a media-needs decision, not merely zero broken images;
- making video and search seams Core capabilities while keeping their use conditional;
- preventing patterns from becoming alternative starters; and
- requiring assembled reference projects and cross-version capability deltas before release.

## C. Architecture Overview

```text
                         CAPABILITY REGISTRY
                  identity + lifecycle + continuity
                                  │
                         PRODUCT CONTRACT
                    commercially acceptable truth
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
 STABLE CORE STARTER       PATTERN LIBRARY          GAME ADAPTATION
 portable guarantees       compositions only        game-owned evidence
 seams + primitives        page + presentation      theme/content/media
        └─────────────────────────┼─────────────────────────┘
                                  │
                         ASSEMBLED GAME SITE
                                  │
             ┌────────────────────┴────────────────────┐
             │                                         │
 REFERENCE PROJECT REGRESSION             INDEPENDENT ACCEPTANCE GATE
 archetype coverage evidence               product-level launch evidence
             └────────────────────┬────────────────────┘
                                  │
                   CROSS-VERSION RELEASE GATE
                    prior baseline vs candidate
```

The layers have different jobs. Core supplies portable mechanisms and guarantees. Patterns compose those mechanisms. Game Adaptation supplies game-specific truth and identity. Acceptance evaluates the assembled result. The Registry preserves continuity across versions; no layer may use another layer's implementation detail as a substitute for evidence.

## D. Product Contract vs Capability Registry

| Concept | Purpose | Changes when | Must preserve |
|---|---|---|---|
| **Product Contract** | Defines what a commercially acceptable assembled game site must satisfy. | Product risk, user need, or launch policy changes. | Clear requirements, applicability, severity, ownership, and acceptance evidence. |
| **Capability Registry** | Gives durable identity and lifecycle to capabilities across framework versions. | A capability is introduced, clarified, deprecated, replaced, or intentionally removed. | Permanent IDs, historical rows, predecessor/successor links, and auditable decisions. |

The Product Contract may evolve. The Capability Registry prevents that evolution from erasing history. In this architecture phase they live in one file and share one master table, but they remain conceptually distinct. A contract revision changes what must be true; a registry revision records what happened to the durable capability identity.

## E. Capability Registry Schema

The Markdown table in Section H is the canonical v0.2 registry. It deliberately remains a document, not a database, service, policy engine, or lifecycle application.

| Field | Allowed form | Meaning |
|---|---|---|
| Capability ID | Stable domain prefix plus number | Permanent identity; never reused or renumbered. |
| Domain | One Section G domain | Product-risk grouping, not ownership. |
| Name | Short stable label | Human-readable capability name. |
| Requirement | Normative, testable statement | What must or must not be true. |
| Rationale | Concise risk/value statement | Why the requirement exists. |
| Applicability | REQUIRED / CONDITIONAL / OPTIONAL / PROHIBITED | Whether the capability must apply; independent of severity. |
| Severity if violated | P0 / P1 / P2 / NIT | Consequence after an applicable requirement is violated. |
| Requirement Owner | Named architecture authority | Maintains meaning, scope, and lifecycle. |
| Implementation Owner | Named delivery layer | Supplies the mechanism/content that can satisfy it. |
| Verification Owner | Named independent evaluator | Produces or accepts PASS evidence. |
| Evidence Type | Concrete artifact or test | Minimum proof required for a baseline result. |
| First Introduced Version | Contract version | Version in which the ID first appeared. |
| Current Status | ACTIVE / DEPRECATED / REPLACED / REMOVED | Present lifecycle state. |
| Deprecation Status | NONE / DEPRECATED / REPLACED / INTENTIONAL_REMOVAL | Nature of an exit decision. |
| Replacement Capability | Capability ID or `—` | Successor when replacement applies. |
| Notes | Constraints and conditional logic | Clarification only; cannot silently change semantics. |

`Current Status` describes registry lifecycle. PASS/FAIL describes evidence in a particular release baseline. They are different fields and must never be conflated.

## F. Capability ID Stability Rules

1. Capability IDs are permanent.
2. IDs are not renumbered when sections, domains, or table order change.
3. Requirement wording may improve under the same ID only when meaning and acceptance obligation remain unchanged.
4. A material semantic change requires a new capability ID; the old row becomes `DEPRECATED` or `REPLACED` and links to its successor.
5. Deleting capability rows is forbidden. Historical rows remain visible and auditable.
6. Every frozen release baseline retains the status and evidence result that applied at release time.
7. Replacement records must link both directions in notes: predecessor names successor and successor names predecessor.
8. A removed capability keeps its ID and row with `Current Status = REMOVED` and `Deprecation Status = INTENTIONAL_REMOVAL`.
9. An ID must never be reused for a different meaning, even after removal.
10. Example: `MC-04` remains `MC-04` forever. If superseded, `MC-04` becomes `REPLACED`, references (for example) `MC-09`, and `MC-09` records `MC-04` as predecessor.

## G. Capability Domains

The contract uses 16 durable domains. Domains group risks without fragmenting the architecture into micro-domains.

| # | Domain | Scope |
|---:|---|---|
| 1 | Game Identity | Verified game-specific terminology, taxonomy, and unmistakable identity. |
| 2 | Visual Fidelity | Game-derived visual system without sacrificing usability. |
| 3 | Media Completeness | Media need, truthfulness, accessibility, provenance, and delivery seams. |
| 4 | Homepage Routing | Honest first-task and deeper browsing paths. |
| 5 | Information Architecture | Taxonomy, routes, search seam, and valid destinations. |
| 6 | Content Utility | Answers, steps, evidence, and readable content structure. |
| 7 | Decision Support | Comparisons, recommendations, recovery, and next actions. |
| 8 | Freshness | Accurate publication, update, patch, popularity, and live semantics. |
| 9 | Related / Internal Discovery | Relevant second- and third-page journeys. |
| 10 | SEO | Index, share, crawl, canonical, and structured-data integrity. |
| 11 | Accessibility | Keyboard, focus, motion, semantics, overflow, and input access. |
| 12 | Production Polish | 404, empty states, placeholders, dead ends, and release finish. |
| 13 | Trust / Legal Safety | Truthful identity/affiliation/legal claims and no fabricated completeness. |
| 14 | Monetization Readiness | Stable inventory without obstructing primary user value. |
| 15 | Product Acceptance | Independent assembled-site verification and exception control. |
| 16 | Regression / Release Integrity | Core/pattern boundary and capability continuity across versions. |

## H. Product Contract v0.2

The table below is both the v0.2 Product Contract and the canonical Capability Registry. All 31 v0.1 IDs are retained. `v0.1` in **Introduced** means migrated without silent deletion; `v0.2` marks a newly introduced capability.

| ID | Domain | Name | Requirement | Rationale | Applicability | Severity | Requirement Owner | Implementation Owner | Verification Owner | Evidence Type | Introduced | Status | Deprecation | Replacement | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GI-01 | Game Identity | Verified identity vocabulary | Use the verified game name, terminology, and object taxonomy consistently. | Prevents generic or incorrect product identity. | REQUIRED | P1 | PRODUCT CONTRACT | GAME ADAPTATION | ACCEPTANCE GATE | Content/taxonomy audit | v0.1 | ACTIVE | NONE | — | Facts must be traceable to project-approved sources. |
| GI-02 | Game Identity | Game-specific recognition | Human review must answer yes to “Does this clearly feel like a site for THIS specific game?” | Blocks logo-swap generic themes. | REQUIRED | P1 | PRODUCT CONTRACT | GAME ADAPTATION | HUMAN PRODUCT REVIEW | Signed review result | v0.1 | ACTIVE | NONE | — | Question 10 in Section U is the stronger reverse test. |
| VF-01 | Visual Fidelity | Complete theme adaptation | Redefine palette, type roles, mark, iconography, shape language, and visual density from game evidence. | Accent-only theming is insufficient. | REQUIRED | P1 | PRODUCT CONTRACT | GAME ADAPTATION | HUMAN PRODUCT REVIEW | Theme evidence map + visual review | v0.1 | ACTIVE | NONE | — | Core exposes semantic tokens only. |
| VF-02 | Visual Fidelity | Usable visual states | All text and states must meet contrast, focus, motion, and responsive legibility requirements. | Identity must not reduce usability. | REQUIRED | P1 | PRODUCT CONTRACT | CORE STARTER + GAME ADAPTATION | ACCEPTANCE GATE | Automated checks + breakpoint review | v0.1 | ACTIVE | NONE | — | Theme overrides remain subject to Core constraints. |
| MC-01 | Media Completeness | Required media resolution | Every media slot required by the selected page pattern must resolve to a verified appropriate asset with stable dimensions. | Prevents broken, placeholder, or layout-shifting launch media. | CONDITIONAL | P1 | PRODUCT CONTRACT | GAME ADAPTATION | ACCEPTANCE GATE | Media manifest + rendered-page audit | v0.1 | ACTIVE | NONE | — | Condition: the selected pattern declares the slot required. |
| MC-02 | Media Completeness | No fabricated or misrepresented media | Do not present fake gameplay screenshots, fake UI states, decorative art, or unrelated media as evidence of gameplay or product facts. | Prevents deceptive evidence and false completeness. | PROHIBITED | P1 | PRODUCT CONTRACT | GAME ADAPTATION + PROJECT CONTENT | ACCEPTANCE GATE | Provenance review + visual audit | v0.1 | ACTIVE | NONE | — | CSS art is always decorative and cannot satisfy screenshot coverage. |
| MC-03 | Media Completeness | Accessible, sourced media | Informative media must have appropriate alt/caption/source/rights data; video must have an accessible equivalent. | Protects accessibility and lawful, trustworthy use. | CONDITIONAL | P1 | PRODUCT CONTRACT | CORE STARTER + GAME ADAPTATION | ACCEPTANCE GATE | Media-schema validation + accessibility audit | v0.1 | ACTIVE | NONE | — | Condition: informative image, diagram, gallery, or video is used. |
| HR-01 | Homepage Routing | Primary orientation route | The homepage must expose a clear Start Here or primary task route. | New players need immediate orientation. | REQUIRED | P1 | PRODUCT CONTRACT | PATTERN LIBRARY + GAME ADAPTATION | ACCEPTANCE GATE | Route/link acceptance test | v0.1 | ACTIVE | NONE | — | Destination must contain real useful content. |
| HR-02 | Homepage Routing | Deeper browsing routes | The homepage must offer at least two useful routes beyond the primary CTA, based on real content. | Enables session depth without fake breadth. | REQUIRED | P2 | PRODUCT CONTRACT | PATTERN LIBRARY + GAME ADAPTATION | ACCEPTANCE GATE | Link inventory + destination review | v0.1 | ACTIVE | NONE | — | Unavailable routes are not counted. |
| IA-01 | Information Architecture | Game-derived taxonomy | Hubs and details must derive from the game/content taxonomy, not from a fixed template taxonomy. | Prevents false genericity and mismatched IA. | REQUIRED | P1 | PRODUCT CONTRACT | GAME ADAPTATION | ACCEPTANCE GATE | Route/taxonomy mapping | v0.1 | ACTIVE | NONE | — | Pattern archetypes do not own category names. |
| IA-02 | Information Architecture | Honest destinations | Every rendered navigation target must exist or be an honest, noninteractive unavailable state. | Prevents dead or fake interaction. | REQUIRED | P1 | PRODUCT CONTRACT | CORE STARTER + ASSEMBLED PROJECT | ACCEPTANCE GATE | Link crawl + interaction test | v0.1 | ACTIVE | NONE | — | Disabled states must not be focusable as links. |
| IA-03 | Information Architecture | Search seam and activation decision | Core must expose a provider-neutral search interface; each project must record whether search is enabled based on corpus size and content model. | Resolves search ownership without forcing search on small sites. | REQUIRED | P1 | PRODUCT CONTRACT | CORE STARTER + GAME ADAPTATION | ACCEPTANCE GATE | Interface contract + activation decision + UI test when enabled | v0.2 | ACTIVE | NONE | — | Search usage is conditional; UI composition belongs to Pattern Library and provider choice is an implementation detail. |
| CU-01 | Content Utility | Actionable answer | Each guide must state the problem or answer and provide actionable steps, evidence, or decision criteria. | Search traffic must receive real utility. | REQUIRED | P1 | PRODUCT CONTRACT | PROJECT CONTENT | ACCEPTANCE GATE | Editorial acceptance review | v0.1 | ACTIVE | NONE | — | Title promise must not exceed content depth. |
| CU-02 | Content Utility | Structured long-form content | Long content must use suitable figures, tables, callouts, summaries, or equivalent structure rather than undifferentiated prose. | Improves comprehension and ad-safe reading rhythm. | CONDITIONAL | P2 | PRODUCT CONTRACT | PATTERN LIBRARY + PROJECT CONTENT | ACCEPTANCE GATE | Article-structure review | v0.1 | ACTIVE | NONE | — | Condition: content length/complexity warrants these aids. |
| DS-01 | Decision Support | Supported comparisons | A comparison, ranking, or recommendation must state its method and relevant version/context. | Prevents unsupported authority. | CONDITIONAL | P1 | PRODUCT CONTRACT | PROJECT CONTENT | ACCEPTANCE GATE | Method/provenance review | v0.1 | ACTIVE | NONE | — | Condition: a decision claim is published. |
| DS-02 | Decision Support | Recovery and next action | Provide recovery, mistake, or next-action guidance where the player task requires it. | Helps users progress instead of exit. | CONDITIONAL | P2 | PRODUCT CONTRACT | PROJECT CONTENT + PATTERN LIBRARY | ACCEPTANCE GATE | Task-flow review | v0.1 | ACTIVE | NONE | — | Applicability is decided per task, not globally. |
| FR-01 | Freshness | Distinct time semantics | Model `publishedAt`, `updatedAt`, patch/version, and live status as distinct fields. | Prevents false freshness. | REQUIRED | P1 | PRODUCT CONTRACT | CORE STARTER | ACCEPTANCE GATE | Schema test + rendered-label audit | v0.1 | ACTIVE | NONE | — | A publication date must not be relabeled as updated. |
| FR-02 | Freshness | Truthful dynamic labels | Popular, Trending, Latest, and Live labels must identify editorial or data provenance. | Prevents static data pretending to be live telemetry. | CONDITIONAL | P1 | PRODUCT CONTRACT | GAME ADAPTATION + PROJECT CONTENT | ACCEPTANCE GATE | Label/source audit | v0.1 | ACTIVE | NONE | — | Condition: any such label is shown. |
| ID-01 | Related / Internal Discovery | Relevant next route | Detail pages must expose a relevant next page and related content when corpus size permits. | Creates useful second- and third-page journeys. | CONDITIONAL | P1 | PRODUCT CONTRACT | CORE STARTER + GAME ADAPTATION | ACCEPTANCE GATE | Journey crawl + relevance review | v0.1 | ACTIVE | NONE | — | Core supplies the provider seam; adaptation supplies relations/taxonomy. |
| ID-02 | Related / Internal Discovery | Enhanced related ranking | When an enhanced ranking strategy is selected, prefer manual relations, taxonomy, or tags before recency fallback. | Improves relevance over arbitrary “other items.” | OPTIONAL | P2 | PRODUCT CONTRACT | PATTERN LIBRARY + GAME ADAPTATION | ACCEPTANCE GATE | Ranking fixture test | v0.1 | ACTIVE | NONE | — | Optional enhancement; selected implementations must be truthful and deterministic. |
| SEO-01 | SEO | Unique index metadata | Every indexable route must have a unique title, description, and canonical URL. | Provides baseline index integrity. | REQUIRED | P1 | PRODUCT CONTRACT | CORE STARTER + GAME ADAPTATION | ACCEPTANCE GATE | Generated metadata audit | v0.1 | ACTIVE | NONE | — | Canonical generation is a Core capability. |
| SEO-02 | SEO | Share metadata | OG/Twitter metadata and appropriate share media must exist for indexable pages. | Supports accurate sharing and discovery. | REQUIRED | P1 | PRODUCT CONTRACT | CORE STARTER + GAME ADAPTATION | ACCEPTANCE GATE | Generated metadata/media audit | v0.1 | ACTIVE | NONE | — | Share media remains subject to MC-02 and MC-03. |
| SEO-03 | SEO | Crawl and structured meaning | Generate sitemap, robots rules, and only structured data that matches visible page content. | Protects crawlability and machine-readable truth. | REQUIRED | P1 | PRODUCT CONTRACT | CORE STARTER + GAME ADAPTATION | ACCEPTANCE GATE | Generated-file/schema audit | v0.1 | ACTIVE | NONE | — | Article/Breadcrumb/FAQ selection depends on the page. |
| AX-01 | Accessibility | Accessible dismissible navigation | Dismissible mobile navigation must support keyboard operation, Escape close, focus restoration, and truthful expanded state. | Provides essential interaction access. | CONDITIONAL | P1 | PRODUCT CONTRACT | CORE STARTER | ACCEPTANCE GATE | Browser interaction test | v0.1 | ACTIVE | NONE | — | Condition: a dismissible navigation control is used. |
| AX-02 | Accessibility | Baseline inclusive navigation | Provide a skip link, visible focus, reduced-motion behavior, and usable tap targets. | Establishes a portable accessibility baseline. | REQUIRED | P1 | PRODUCT CONTRACT | CORE STARTER + GAME ADAPTATION | ACCEPTANCE GATE | Automated + manual accessibility test | v0.1 | ACTIVE | NONE | — | Adaptation may style but not remove these guarantees. |
| AX-03 | Accessibility | Breakpoint and keyboard integrity | Core routes must pass overflow and keyboard-path checks at supported breakpoints. | Prevents mobile and keyboard regressions. | REQUIRED | P1 | PRODUCT CONTRACT | CORE STARTER + ASSEMBLED PROJECT | ACCEPTANCE GATE | Browser E2E suite | v0.1 | ACTIVE | NONE | — | Acceptance runs on the assembled site. |
| PP-01 | Production Polish | Recovery and honest states | A custom 404 must provide valid recovery routes; empty, draft, and unavailable states must be truthful. | Prevents dead ends and fake controls. | REQUIRED | P1 | PRODUCT CONTRACT | CORE STARTER + GAME ADAPTATION | ACCEPTANCE GATE | Route/status/empty-state tests | v0.1 | ACTIVE | NONE | — | Draft content must not leak into production routes. |
| PP-02 | Production Polish | No production residue | Do not ship placeholder names, fake contacts, copied brand residue, unsupported counts, or unfinished template markers. | Protects trust and launch finish. | PROHIBITED | P1 | PRODUCT CONTRACT | GAME ADAPTATION + PROJECT CONTENT | ACCEPTANCE GATE | Residue scan + human review | v0.1 | ACTIVE | NONE | — | Trust/legal-specific residue is also governed by TL-01. |
| TL-01 | Trust / Legal Safety | No draft legal residue | Do not expose draft legal text or editorial markers such as `Replace`, `Add`, `TODO`, or `TBD` in production. | Draft/template text can create false legal confidence. | PROHIBITED | P1 | PRODUCT CONTRACT | GAME ADAPTATION + PROJECT CONTENT | ACCEPTANCE GATE | Production text scan + page review | v0.2 | ACTIVE | NONE | — | Normative examples in architecture documentation are not production residue. |
| TL-02 | Trust / Legal Safety | No fabricated identity or affiliation | Do not fabricate company, operator, contact, official, affiliated, or independence claims. | Prevents false identity and authority. | PROHIBITED | P1 | PRODUCT CONTRACT | GAME ADAPTATION | ACCEPTANCE GATE | Claim/source review | v0.2 | ACTIVE | NONE | — | Real operator/contact data is not required when the project does not need it. |
| TL-03 | Trust / Legal Safety | Behavior-matched legal claims | Privacy and Terms statements, when present or required, must match actual site behavior and must not imply unverified legal completeness. | Legal copy must describe reality rather than a template fiction. | CONDITIONAL | P1 | PRODUCT CONTRACT | ASSEMBLED PROJECT | ACCEPTANCE GATE | Behavior-to-policy mapping + policy accuracy review | v0.2 | ACTIVE | NONE | — | Condition: site behavior or project policy calls for these statements. This is an accuracy gate, not legal advice. |
| MR-01 | Monetization Readiness | Stable optional inventory | Layout must expose stable optional ad inventory without layout shift or obstruction of the primary answer. | Enables monetization without harming the task. | REQUIRED | P2 | PRODUCT CONTRACT | CORE STARTER + PATTERN LIBRARY | ACCEPTANCE GATE | CLS/layout/obstruction test | v0.1 | ACTIVE | NONE | — | No ad network or ad rendering is required. |
| MR-02 | Monetization Readiness | Value-backed depth | Page depth must come from useful content and navigation, not duplicated or fake cards. | Protects quality and session value. | REQUIRED | P1 | PRODUCT CONTRACT | PATTERN LIBRARY + GAME ADAPTATION | HUMAN PRODUCT REVIEW | Content/destination audit | v0.1 | ACTIVE | NONE | — | Visual breadth without destination breadth fails. |
| PA-01 | Product Acceptance | Assembled-site acceptance | Route, metadata, media, interaction, link, overflow, and accessibility checks must run against the assembled site. | Pattern/adaptation composition can regress Core. | REQUIRED | P1 | PRODUCT CONTRACT | ASSEMBLED PROJECT | ACCEPTANCE GATE | Independent acceptance report | v0.1 | ACTIVE | NONE | — | Core unit tests are necessary but insufficient. |
| PA-02 | Product Acceptance | Recorded exceptions | Launch exceptions must record owner, reason, evidence, severity, scope, and expiry/review date. | Keeps known gaps from becoming invisible debt. | CONDITIONAL | P2 | PRODUCT CONTRACT | RELEASE GOVERNANCE | RELEASE GATE | Exception record | v0.1 | ACTIVE | NONE | — | Condition: a permitted P2 or NIT exception is requested. |
| MC-04 | Media Completeness | Media Needs Assessment | Every core page must decide whether screenshots, gameplay UI, maps, character/item images, diagrams, official trailer/gameplay video, or other verified media materially improve comprehension, game identity, player decisions, or evidence quality. | “No broken images” does not prove useful media completeness. | REQUIRED | P1 | PRODUCT CONTRACT | GAME ADAPTATION + PROJECT CONTENT | ACCEPTANCE GATE | Per-page assessment + media evidence or explicit rationale | v0.2 | ACTIVE | NONE | — | If useful, supply verified media or justify unavailability/non-need and select a complete no-media pattern; never generate fake screenshots to satisfy a count. |
| MC-05 | Media Completeness | Video capability and usage decision | Core must provide a provider-neutral video seam, and every relevant page assessment must record whether video is included or excluded. | Separates durable playback capability from conditional page usage. | REQUIRED | P1 | PRODUCT CONTRACT | CORE STARTER + GAME ADAPTATION + PATTERN LIBRARY | ACCEPTANCE GATE | Interface test + per-page decision + accessible playback/fallback test when used | v0.2 | ACTIVE | NONE | — | Video playback is conditional. Missing required evidence video is P1; a lower-impact missed opportunity may be P2. |
| RI-01 | Regression / Release Integrity | No Pattern/Core duplication | A pattern must not own, duplicate, override, or bypass mandatory Core guarantees. | Prevents the Pattern Library from becoming multiple drifting starters. | PROHIBITED | P1 | PRODUCT CONTRACT | PATTERN LIBRARY | ACCEPTANCE GATE | Dependency/boundary review + assembled tests | v0.2 | ACTIVE | NONE | — | Patterns compose Core; they do not fork it. |
| RI-02 | Regression / Release Integrity | Reference-project regression | Each release candidate must pass the approved reference archetype suite and generate required evidence. | Core-only tests cannot prove assembled compositions. | REQUIRED | P1 | PRODUCT CONTRACT | REFERENCE FIXTURES | RELEASE GATE | Reference regression reports A/B/C | v0.2 | ACTIVE | NONE | — | Historical sites may be added later; they are not required as immediate fixtures. |
| RI-03 | Regression / Release Integrity | Cross-version regression gate | Compare the previous frozen capability baseline with the candidate baseline and block unauthorized P0/P1 regressions or disappearance. | Makes capability inheritance enforceable. | REQUIRED | P1 | PRODUCT CONTRACT | RELEASE GOVERNANCE | RELEASE GATE | Capability Delta + baseline diff | v0.2 | ACTIVE | NONE | — | Approved lifecycle exits require migration rationale. |
| RI-04 | Regression / Release Integrity | Capability lifecycle integrity | Registry rows and IDs must remain auditable; semantic replacement, deprecation, and intentional removal must be explicit and linked. | Prevents silent redefinition or deletion. | REQUIRED | P1 | CAPABILITY REGISTRY | RELEASE GOVERNANCE | RELEASE GATE | Registry history audit | v0.2 | ACTIVE | NONE | — | Material semantic change creates a new ID. |

### Contract counts

| Measure | Count |
|---|---:|
| Previous v0.1 requirements migrated | 31 |
| New v0.2 requirements | 10 |
| Current requirements / registry records | 41 |
| REQUIRED | 25 |
| CONDITIONAL | 10 |
| OPTIONAL | 1 |
| PROHIBITED | 5 |
| P0 | 0 |
| P1 | 35 |
| P2 | 6 |
| NIT | 0 |

## I. Applicability Model

Applicability answers **whether** a requirement applies. Severity answers **what happens if an applicable requirement is violated**. The two axes are independent.

| Applicability | Baseline behavior | Valid evidence result |
|---|---|---|
| REQUIRED | Always evaluate for every in-scope release/project. | PASS or FAIL. |
| CONDITIONAL | Record the condition decision first. If true, evaluate; if false, record why. | PASS, FAIL, or NOT_APPLICABLE with rationale/evidence. |
| OPTIONAL | The project may decline it. Once selected, its constraints and evidence apply. | PASS, FAIL, or NOT_SELECTED. |
| PROHIBITED | Verify the forbidden behavior is absent. | PASS when absent; FAIL when present. |

Examples:

- `SEO-01` canonical URL: REQUIRED; violation severity P1.
- `MC-05` video usage: the Core evaluation capability is REQUIRED, while playback on a page is conditional; a missing evidence-critical video is P1 and a documented lower-impact opportunity may be P2.
- `MC-02` fake gameplay screenshot: PROHIBITED; violation severity P1.

NOT_APPLICABLE and NOT_SELECTED are not quiet omissions. They require the capability ID, reason, decision owner, and evidence appropriate to the decision.

## J. Three-Owner Model

| Role | Accountable for | Not a substitute for |
|---|---|---|
| **Requirement Owner** | Meaning, scope, applicability policy, severity, and lifecycle. | Implementing or self-certifying the result. |
| **Implementation Owner** | Mechanism, content, configuration, or adaptation that satisfies the requirement. | Changing the requirement to match an implementation gap. |
| **Verification Owner** | Independent evidence, PASS/FAIL decision, and exception escalation. | Building the feature it verifies. |

Example: for `AX-01`, the Product Contract owns the requirement, Core Starter implements the navigation guarantee, and Acceptance Gate verifies keyboard, Escape, focus restoration, and expanded state on the assembled site.

Joint implementation owners identify composition boundaries; they do not dilute accountability. The named Verification Owner must remain operationally independent from the implementation result being accepted.

## K. Core Starter Boundary

### Core must own

- semantic design-token interfaces and portable responsive layout primitives;
- accessible header/mobile navigation, skip link, focus, motion, and overflow guarantees;
- content validation, draft exclusion, route validation, truthful empty/unavailable states, and custom 404 foundation;
- media data model and provider-neutral hero, cover, figure, gallery, and video seams;
- article-shell seams for breadcrumbs, body, optional TOC/FAQ, related provider, and next step;
- canonical and metadata engines, structured-data seams, sitemap, robots, and output safety;
- provider-neutral search interface/core, without selecting a provider or forcing activation;
- optional stable ad-slot primitives, without an ad SDK or network;
- test hooks for route, interaction, media, link, metadata, and accessibility acceptance.

### Core must not own

- game colors, fonts, marks, vocabulary, object taxonomy, player journey, or recommendations;
- fixed homepage order, game-specific route categories, Popular/Trending/Live claims, or fictional facts;
- a search provider, analytics provider, ad network, related-ranking policy, or content volume;
- decorative art treated as proof of game media; or
- any one page or presentation pattern as the universal site shape.

## L. Pattern Library Boundary

Patterns are reusable compositions over Core primitives and Game Adaptation data.

### Patterns may own

- composition and layout choice;
- optional modules and editorial presentation;
- presentation density and hierarchy;
- page archetypes and eligible module placement; and
- selection of Core seams such as TOC, gallery, video, sidebar, or ad rail.

### Patterns must not own or duplicate

- SEO/canonical/metadata engines;
- accessibility baseline or navigation semantics;
- media data model;
- content or route validation;
- 404 foundation;
- search core;
- ads engine;
- security or output safety; or
- any other mandatory Core guarantee.

A pattern must depend on Core contracts, not copy their code or redefine their behavior. If a pattern-specific layout exposes a Core defect, Core is fixed once and all patterns inherit the fix. `RI-01` makes bypass or duplication a P1 release failure.

## M. Page Patterns

Page Patterns answer **what job this page performs**. A project may mix them route by route.

| Page Pattern | Primary job | Typical composition |
|---|---|---|
| Editorial Home | Orient and route users into real content. | Primary task, featured/latest feeds, taxonomy entry points, truthful editorial modules. |
| Wiki Hub | Browse a durable object or system taxonomy. | Overview, category/object grid, filters or jump links, related hubs. |
| Problem-Oriented Guide | Resolve an immediate player problem. | Quick answer, steps, evidence, decision modules, mistakes, next action. |
| Database / Object Detail | Explain one character, item, region, mechanic, or other object. | Identity facts, media, attributes, relationships, version context. |
| Tool Page | Support an interactive calculation or choice. | Inputs, assumptions, result, explanation, failure states, related guidance. |
| Long-form Guide | Teach a complex topic over a sustained reading path. | Summary, TOC when useful, sections, figures/tables, FAQ, next route. |

Page Patterns select composition; they do not change Core semantics or game facts.

## N. Presentation Patterns

Presentation Patterns answer **how the selected pages express information**.

| Presentation Pattern | Emphasis | Must remain game-adapted |
|---|---|---|
| Immersive Fantasy | Atmospheric scale, world framing, ornamental rhythm. | Palette, type, imagery, vocabulary, marks. |
| Tactical Systems | Dense relationships, signals, ranked systems, technical hierarchy. | Taxonomy, iconography, data claims, density limits. |
| Technical Wiki | Scannability, cross-links, stable object detail. | Object model, naming, media, revision semantics. |
| Editorial Dense | Feed depth, long-form rhythm, related journeys. | Editorial choices, provenance, content value. |
| Minimal Utility | Fast answer, restrained chrome, interaction clarity. | Task language, tool assumptions, game evidence. |

A game may combine, for example, `Editorial Home + Problem-Oriented Guide + Database / Object Detail + Immersive Fantasy`. It does not select a monolithic “Farever Starter,” “BombFarm Starter,” or equivalent fork.

## O. Game Adaptation Boundary

Game Adaptation owns:

- verified palette, typography, logo/mark, icons, shape language, decorative assets, and motion tone;
- game terminology, UI labels, object taxonomy, routes, and hub/detail relationships;
- player journey, task priorities, comparison methods, recommendation rules, and version context;
- actual screenshots, artwork, maps, diagrams, video, captions, sources, rights, and replacement schedule;
- page inventory, editorial Featured/Popular choices, patch mapping, related tags, and update ownership; and
- truthful operator/affiliation/independence wording and project-specific policy content.

Adaptation must use Core interfaces and Pattern compositions. It cannot patch around Core validation or recast decoration as evidence.

## P. Media Needs Assessment

`MC-04` is required for every core page before pattern/media acceptance.

### Assessment questions

For screenshots, gameplay UI, maps, character/item images, diagrams, official trailer/gameplay video, and other verified media, determine whether each candidate materially improves:

1. comprehension;
2. game identity;
3. player decision-making; or
4. evidence quality.

### Decision record

| Field | Required content |
|---|---|
| Page/route | Stable route or page archetype. |
| Media candidate | Type and intended claim/task. |
| Material value | Which of the four outcomes it improves, with rationale. |
| Availability/provenance | Verified asset/source/rights state. |
| Decision | PROVIDE / NOT_REQUIRED / UNAVAILABLE. |
| Pattern consequence | Media-bearing pattern or complete no-media composition. |
| Evidence | Asset record or explicit rationale accepted by the gate. |

If media is materially useful, the project must either provide appropriate verified media or explicitly justify why it is unavailable/not required and choose a pattern that remains complete without it. “Broken images = 0” is not a sufficient completeness result. No generated fake screenshot, fabricated UI, or unrelated image may be used to satisfy a media count.

## Q. Video Architecture

Video capability and video usage are separate decisions.

| Concern | Owner | Rule |
|---|---|---|
| Provider-neutral video record/seam | CORE STARTER | Required capability; includes source/embed, title, poster, duration when known, caption/subtitle/transcript, credit/source, privacy mode, consent/loading policy, and fallback. |
| Whether the game/page needs video | GAME ADAPTATION | Conditional usage decided through `MC-04` using page role and evidence value. |
| Placement and composition | PATTERN LIBRARY | Chooses inline, hero, gallery, or supporting placement without reimplementing playback/accessibility. |
| Inclusion/exclusion evidence | ACCEPTANCE GATE | Verifies the decision exists and, when included, playback privacy/accessibility/fallback work. |

The page must remain useful without playback. Video is not mandatory on every page or for every game; evaluating the need and preserving the Core seam are mandatory. Evidence-critical missing video is P1. A documented non-critical enhancement gap may be P2.

## R. Search Architecture

| Concern | Architecture decision |
|---|---|
| Search capability/seam | CORE STARTER; required and provider-neutral. |
| Search enabled | CONDITIONAL; based on corpus size, information model, and user discovery need. |
| Search UI composition | PATTERN LIBRARY; may vary by page/presentation pattern. |
| Search provider/index | Implementation choice; not a Product Contract default. |
| Search content/taxonomy | GAME ADAPTATION and project content. |
| Verification | ACCEPTANCE GATE checks the recorded activation decision and, when enabled, keyboard use, result truth, empty states, route validity, and mobile behavior. |

Copy such as “Quick Search Answers” is not evidence of working search. A disabled search decision must not leave fake inputs or dead controls.

## S. Trust / Legal Safety

Trust / Legal Safety is an explicit product domain, not a footer-copy afterthought.

- No production-visible draft legal text or template/editorial residue.
- Affiliation, independence, official status, company/operator identity, and contact claims must be truthful.
- Do not fabricate an operator, company, address, contact, or legal fact merely to make a template appear complete.
- Privacy and Terms content, when present or required, must match actual collection, storage, cookies, analytics, ads, accounts, contact flows, and external providers.
- Do not imply that generic template copy is complete legal review.
- Real operator/contact data is not mandatory when the project has no legitimate need to publish it.
- The controlling rule is: **do not fabricate, do not ship draft/template residue, and do not claim legal facts that are not true.**

This contract defines accuracy and release safety; it does not substitute for jurisdiction-specific legal advice.

## T. Independent Acceptance Gate

The Acceptance Gate evaluates the assembled project, not only Core components. It is independent of Starter implementation tests and must inspect route output after Core, Pattern, Game Adaptation, and content are composed.

At minimum it must catch:

- a generic theme or logo-swap identity;
- missing materially useful screenshots or an unrecorded video decision;
- legal draft/template residue or fabricated identity/affiliation;
- fake Popular, Trending, Latest, or Live semantics;
- broken, unverified, inaccessible, or misleading media;
- incorrect 404 behavior and invalid recovery links;
- mobile Escape, focus restoration, keyboard, reduced-motion, or overflow regressions;
- title promise exceeding content depth;
- ads obstructing the primary answer or causing unstable layout;
- dead links, fake controls, repeated destinations, draft leaks, or source-template residue; and
- pattern-level bypass of a mandatory Core guarantee.

Evidence is attached per capability ID. A broad visual sign-off cannot override a failed P1 interaction, legal, media, SEO, or route capability.

## U. Human Product Review

Human review records reviewer, date, release candidate, evidence links, and PASS/FAIL for each question:

1. Does this clearly feel like a site for **this specific game**?
2. Are real game visuals/media used where materially useful?
3. Does the site feel complete rather than templated?
4. Can a player quickly find what to do next?
5. Does important content help the player understand, decide, or act?
6. Are there useful second- and third-page journeys?
7. Does media improve comprehension rather than decorate emptiness?
8. Are Fresh, Popular, Trending, and Live claims truthful?
9. Would ads fit naturally without harming the answer?
10. If the logo/game name were removed, would the site still obviously belong to this game?

Question 10 is a strong generic-template detector. A “no” is a P1 failure under `GI-02`/`VF-01`, not a cosmetic preference.

## V. Reference Project Regression Model

Reference projects are small deterministic assembled fixtures, not new product starters. This document defines their architecture and evidence; it does not create them.

### Reference A — Wiki / Commercial Editorial

**Proves:** homepage browsing depth, hub/detail IA, breadcrumbs, article shell, TOC, related content, media, ad-ready layout, and SEO.

**Fixture content:** one editorial home, two taxonomy hubs, at least three distinct object/detail articles, validated published/updated/version fields, one manual/tag relation, FAQ visible on one eligible page, and valid 404 recovery destinations.

**Verified media fixture:** at least one provenance-labeled screenshot, one distinct cover or key-art record, one inline figure with alt/caption/source, plus a deliberate no-media page with accepted `MC-04` rationale.

**PASS evidence:** route/link crawl; canonical/metadata/schema/sitemap/robots audit; media-manifest validation; TOC/breadcrumb/related assertions; ad-slot CLS/obstruction check; keyboard/overflow results; and assembled screenshots for human review.

### Reference B — Problem Guide / Tool

**Proves:** quick answer, steps, decision modules, figure/table, calculator/tool integration seam, next step, and mobile usability.

**Fixture content:** one problem guide with answer, ordered steps, comparison assumptions, mistake/recovery module, next-step route, and one deterministic tool fixture with valid, invalid, and empty input states.

**Verified media fixture:** one task-relevant gameplay UI screenshot or explanatory diagram with provenance and accessible text; include a recorded video inclusion/exclusion decision.

**PASS evidence:** content-structure assertions; deterministic tool tests; responsive table/figure checks; keyboard/focus/overflow E2E; valid next route; media evidence; and title-to-answer human review.

### Reference C — Tactical / Systems

**Proves:** system taxonomy, dense cross-navigation, tagged relevance, visual adaptation, mobile interaction, and accessibility.

**Fixture content:** at least three linked systems, three tagged guides with deterministic relevance order, one ranking with method/version context, and a nested mobile navigation structure.

**Verified media fixture:** one version-labeled system map or diagram and one game-identity visual; decorative tactical chrome is separately marked and not counted as evidence media.

**PASS evidence:** taxonomy/route map; relevance ranking test; method/version assertion; Escape/focus restoration E2E; contrast, reduced-motion, tap-target, overflow, and keyboard reports; and human game-identity review.

Historical projects such as BombFarm V2 or War of Genesis may later be added as compatibility references. They are not assumed to be immediate automated fixtures and must not replace the three archetype contracts.

## W. Cross-Version Regression Model

Each framework release candidate follows this sequence:

1. Load the previous frozen Capability Baseline.
2. Load the candidate Capability Baseline.
3. Run Core tests.
4. Run Reference Project Regression A, B, and C.
5. Run independent assembled-site acceptance.
6. Generate a Capability Delta.
7. Classify every delta.
8. Block release on unauthorized regression.
9. Freeze the accepted candidate baseline with the release.

A baseline row contains: framework version, Capability ID, registry status, applicability decision, severity, outcome (`PASS`, `FAIL`, `NOT_APPLICABLE`, `NOT_SELECTED`, or approved `EXCEPTION`), evidence reference, verifier, and verification date.

Example:

| Capability | Previous | Candidate | Evidence | Delta |
|---|---|---|---|---|
| AX-01 | PASS | PASS | Mobile navigation E2E | UNCHANGED PASS |
| MC-01 | PASS | PASS | Media acceptance report | UNCHANGED PASS |
| SEO-01 | PASS | PASS | Generated metadata audit | UNCHANGED PASS |
| PP-01 | PASS | FAIL | 404 route regression | REGRESSION — BLOCK |

The comparison is capability-based, not file-based. A rewritten implementation may release when it proves the same obligations; unchanged code may not release when assembled evidence regresses.

## X. Capability Delta Model

Every prior and candidate registry ID must appear in the delta. Classifications are:

| Delta | Meaning | Release treatment |
|---|---|---|
| UNCHANGED PASS | Applicable capability remains proven. | Continue. |
| UNCHANGED N/A | Conditional/optional decision remains valid and evidenced. | Continue; revalidate rationale. |
| NEW PASS | New capability is registered and proven. | Continue. |
| IMPROVED | Same semantic requirement has stronger implementation/evidence without narrowing obligation. | Continue; retain ID. |
| DEPRECATED | Capability remains historically visible and has an approved sunset/migration record. | Apply Section Z. |
| REPLACED | Old ID links to a proven successor and migration path. | Apply Section Z; successor must pass. |
| INTENTIONAL REMOVAL | Removal has approved rationale, impact, and migration record. | Apply Section Z; never delete row. |
| REGRESSION | Previously proven applicable behavior is now failed, missing, weaker, or unevidenced. | Apply Section Y blocking rules. |

A missing row is not “no change”; it is a regression and lifecycle-integrity failure. A changed test name or file path is not an improvement unless capability evidence becomes materially stronger.

## Y. Release Blocking Rules

Release is blocked when any of the following occurs:

- previous P0 PASS becomes FAIL;
- previous P1 PASS becomes FAIL;
- a capability silently disappears from registry or baseline;
- an ID is reused for a materially different meaning;
- a Pattern implementation overrides, duplicates, or bypasses a mandatory Core guarantee;
- an assembled reference project can no longer satisfy a previously supported contract;
- media, visual identity, SEO, accessibility, Trust / Legal Safety, or product acceptance regresses at P0/P1 without an approved lifecycle transition;
- a required reference archetype or independent assembled-site gate is not run or lacks evidence;
- a replacement predecessor/successor link or migration rationale is missing; or
- a conditional/optional capability is silently relabeled NOT_APPLICABLE/NOT_SELECTED to hide a failure.

P2 regression may proceed only through a Section AA exception recording owner, reason, evidence, scope, and expiry/review date. NIT regression does not block but must appear in the delta. This v0.2 registry has no P0 or NIT rows; the rules remain defined for future capabilities.

## Z. Deprecation / Replacement Rules

1. Only the Requirement Owner may propose lifecycle change; Release Governance records it and the Release Gate verifies completeness.
2. `DEPRECATED` means still available during a stated sunset period. Record rationale, affected consumers, announced version, last-supported version, and migration path.
3. `REPLACED` means a new capability ID carries materially changed semantics. The predecessor and successor must link to each other; the successor must have PASS evidence before the predecessor exits support.
4. `REMOVED` is allowed only with `Deprecation Status = INTENTIONAL_REMOVAL`, approved rationale, impact analysis, migration guidance, and removal version.
5. Deleted rows, overwritten history, silent ID reuse, and silent requirement narrowing are forbidden.
6. “Implementation deleted” does not itself authorize capability removal. Another implementation may satisfy the same durable capability.
7. A lifecycle approval cannot waive unrelated P0/P1 regressions introduced by the change.

## AA. Exception Model

Exceptions apply only to P2 and NIT regressions unless a separate approved deprecation/replacement/intentional-removal process changes capability lifecycle. P0 and P1 failures cannot be converted into ordinary launch exceptions.

Each exception record contains:

- Capability ID and release candidate;
- severity and applicability decision;
- accountable exception owner;
- exact gap and user/product impact;
- reason release should proceed;
- evidence and mitigations;
- affected routes/patterns/reference fixtures;
- expiry or mandatory review date; and
- approval by Release Governance and acknowledgment by the Verification Owner.

Expired exceptions become FAIL until closed or explicitly re-approved with new evidence. Exceptions remain attached to the frozen baseline and visible in the next version delta.

## AB. Recommended Future Framework Architecture

The recommended architecture is:

1. **Stable Core Starter** — portable primitives, contracts, seams, and baseline tests.
2. **Product Contract** — commercial-quality requirements and launch risk.
3. **Capability Registry** — permanent identity and lifecycle continuity.
4. **Pattern Library** — composable Page Patterns and Presentation Patterns only.
5. **Game Adaptation Layer** — verified game identity, taxonomy, content, media, facts, and claims.
6. **Reference Project Regression** — deterministic archetype coverage across real compositions.
7. **Independent Acceptance Gate** — evidence from the assembled site.
8. **Cross-Version Release Gate** — prior baseline versus candidate, with blocking deltas.

This architecture preserves the audit's strongest lessons without copying any homepage or turning the Pattern Library into several hidden starters.

## AC. Migration from v0.1

| Migration area | v0.1 | v0.2 action |
|---|---|---|
| Requirement continuity | 31 requirements | All 31 IDs retained; none deleted or renumbered. |
| Ownership | One ambiguous Owner | Requirement, Implementation, and Verification Owners separated. |
| Applicability | Implicit | REQUIRED / CONDITIONAL / OPTIONAL / PROHIBITED added independently of severity. |
| Domains | 14 | Trust / Legal Safety and Regression / Release Integrity added; total 16. |
| Media | Correctness and provenance | `MC-04` adds needs assessment; zero broken images is no longer sufficient. |
| Video | Optional Pattern capability | `MC-05`: required provider-neutral Core seam and evaluation; usage conditional; placement Pattern-owned. |
| Search | Matrix/Boundary inconsistency | `IA-03`: Core seam required, activation conditional, UI Pattern-owned, provider selectable. |
| Legal/trust | Disclosure plus general residue | `TL-01`–`TL-03` establish explicit no-fabrication/no-draft/behavior-matching rules. |
| Pattern boundary | Composition guidance | `RI-01` makes Core duplication/bypass a prohibited P1 violation. |
| Regression | Assembled acceptance only | `RI-02`–`RI-04` add references, cross-version deltas, and lifecycle integrity. |

The following v0.1 requirements received clarifying—not materially redefining—wording: `MC-02` states the already-present prohibition on misrepresentation explicitly; `ID-02` makes the enhanced ranking strategy optional; `AX-01` makes its dismissible-navigation condition explicit; and `PP-02` remains production-residue safety while Trust / Legal-specific obligations move into new IDs.

## AD. Open Questions

These questions do not weaken the v0.2 rules; they must be resolved when a real framework/project baseline is created:

1. Which real game, content volume, and publishing workflow will be the first pilot?
2. Who owns media rights review, screenshot capture, patch tagging, and replacement in that project?
3. What corpus threshold and content model activate search?
4. Is Popular/Trending editorial, analytics-backed, or excluded at launch?
5. Which structured-data types match the pilot's visible content?
6. Which ad formats are allowed and what performance/CLS budgets apply?
7. Is TOC authored or heading-generated with validation?
8. What is the project-specific related-content precedence?
9. What verified wording accurately describes official, affiliated, community, or independent status?
10. Which routes genuinely need screenshots, diagrams, maps, or video under `MC-04`?
11. Which minimal fixture implementation will instantiate References A, B, and C without becoming three new starters?
12. Where will frozen baselines and evidence links live in the future repository?

## AE. Exact Next Step

Perform a **contract-only gap assessment** of the current future `GAME_SITE_STARTER` against all 41 v0.2 capability IDs. Do not merge or copy any reference implementation.

The assessment should:

1. map every ID to current evidence, gap, applicability decision, and all three owners;
2. preserve the v0.2 Capability Registry as the authoritative requirement set, then create the first evidence-backed `GAME_SITE_STARTER` Capability Support Baseline from the gap assessment; do not assume any registry capability is PASS until implementation evidence proves it;
3. separate Core, Pattern Library, Game Adaptation, reference-fixture, and Acceptance Gate work;
4. prioritize the 35 P1 capabilities as launch gates;
5. define the smallest fixture content and verified media for References A, B, and C; and
6. select one pilot composition—recommended: Problem-Oriented Guide + Wiki Article Shell—to prove the first assembled-site acceptance run.

Do not start by copying a homepage, building a universal starter, or automating registry governance. Start by mapping evidence and gaps against stable capability IDs.

