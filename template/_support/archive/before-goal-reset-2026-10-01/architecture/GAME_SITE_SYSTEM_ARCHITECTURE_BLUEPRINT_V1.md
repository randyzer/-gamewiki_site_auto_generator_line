# GAME_SITE_SYSTEM Architecture Blueprint V1

Date: 2026-10-01
Status: Architecture baseline; no implementation authorized by this document.

## 1. Objective

Evolve the proven V2.6.5 production system into a next-generation commercial game-site system using three evidence sources:

1. V2.6.5 triad: GAME_SOP + GAME_CODEX_MASTER_PROMPT + GAME_SITE_STARTER.
2. War of Genesis real-project failures and launch-review evidence.
3. Five extracted reference implementations and the 5-site capability audit.

The target is not a larger universal starter. The target is a layered production system that preserves proven Core guarantees while making game identity, patterns, media, monetization, and acceptance first-class.

## 2. Architectural Principle

Target system:

```text
Capability Registry / Product Contract
                |
        +-------+-------+
        |               |
 Stable Core Starter   Pattern Library
        |               |
        +-------+-------+
                |
        Game Adaptation Layer
                |
        Assembled Game Site
                |
 Independent Acceptance Gate
                |
 Reference Regression + Cross-Version Release Gate
```
## 3. Layer Responsibilities

### 3.1 Stable Core Starter
Owns portable runtime guarantees only:
- publication/page-inventory truth and exact output reconciliation;
- SEO/canonical/robots/sitemap/structured-data seams;
- search/media/ads/related-content technical seams;
- accessibility primitives and browser-regression hooks;
- safe defaults for legal/identity/residue handling;
- deterministic build, validation, audit and fail-closed behavior.

Core must not own a game's taxonomy, visual identity, content strategy, or homepage composition.

### 3.2 Pattern Library
Owns reusable page and presentation compositions:
- Wiki / Archive;
- Fantasy Immersion;
- Problem-Oriented Guide;
- Tactical / Systems;
- Commercial Editorial / Wiki compositions where evidence supports them.

Patterns compose Core primitives. They must never duplicate or fork mandatory Core guarantees.

### 3.3 Game Adaptation Layer
Owns game-specific truth and expression:
- taxonomy and object families;
- palette, typography, visual density, shape language and vocabulary;
- selected patterns and route composition;
- verified media and attribution;
- content relations and project-specific configuration.

This layer is the missing bridge exposed most clearly by War of Genesis: a strong Core alone does not automatically create a site that unmistakably feels like the target game.
### 3.4 Independent Acceptance Gate
Owns assembled-site truth:
- game-recognition review;
- route/link/metadata/media acceptance;
- keyboard, focus, overflow and breakpoint verification;
- legal/identity/production-residue review;
- monetization obstruction/layout review;
- title-promise vs content-depth review.

Core tests cannot substitute for this gate.

### 3.5 Release Governance
Owns capability continuity:
- Capability Registry lifecycle;
- Reference-project regression;
- prior baseline vs candidate delta;
- explicit exceptions, deprecations and replacements.

## 4. What V2.6.5 Keeps

Preserve the strongest proven mechanisms rather than rewriting the system:
- Runtime Page Inventory / enabled catalog;
- exact output reconciliation and generated HTML audit;
- SEO foundation;
- media manifest/catalog/render/audit boundaries;
- media-needs lifecycle machinery as valuable implementation pending final layer placement;
- optional monetization seam;
- explicit related-page seam;
- semantic theme/page-family boundary;
- Pagefind safety/artifact audit;
- fail-closed final vs evidence-build split.

V2.6.5 is therefore the evolutionary base, not a discarded architecture.
## 5. Required Evolution Domains

1. Safety and production integrity: TL-01, TL-02, PP-02, AX-01, AX-03.
2. Visual adaptation: expand semantic adaptation roles without hardcoding game styles.
3. Media: dimensions/aspect, rights/credit/accessibility metadata, provider-neutral video and truthful fallback.
4. Pattern Library: move reusable homepage/article compositions out of Core ownership.
5. Game Adaptation workflow: explicit taxonomy, theme evidence, media decisions and pattern selection.
6. Content utility and discovery: structured article utilities, relevant next routes and honest freshness semantics.
7. Monetization readiness: retain provider-neutral seam; patterns define safe inventory placement and acceptance verifies obstruction/CLS.
8. Acceptance/regression: assembled-site gate, reference archetypes and cross-version capability delta.

## 6. War of Genesis Lessons Mapped to Architecture

- Generic visual feel -> Game Adaptation + richer Core semantic theme seams + human recognition gate.
- Weak real-media expression -> hardened Core media seam + per-page media assessment + pattern media slots.
- Content/title depth mismatch -> Project Content + Pattern Library + Acceptance, not more generic Core routes.
- Draft Privacy/Terms -> TL-01 safe defaults in Core + assembled policy accuracy gate.
- Missing operator/contact truth -> TL-02/TL-03: never fabricate; only activate claims backed by project evidence.
- Mobile Escape/focus and breakpoint concerns -> AX-01/AX-03 Core contracts plus assembled browser acceptance.
- og:image gap -> SEO-02 should reuse the hardened media model rather than create a second image system.

## 7. Non-Goals

- Do not merge five extracted implementations into one codebase.
- Do not move game-specific taxonomy or styling into Core.
- Do not create a CMS/DAM/provider platform unless future evidence justifies it.
- Do not discard S1 TL-01 or proven V2.6.5 mechanisms.
- Do not resume S2 implementation until the roadmap explicitly places it.
