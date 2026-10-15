# Phase A Implementation Plan V1

Date: 2026-10-01
Status: PLANNING COMPLETE CANDIDATE; no implementation authorized by this document alone.

## 1. Objective

Complete the bounded Core Safety obligations that must precede adaptation/media/pattern work:

1. Preserve completed TL-01 legal projection safety.
2. Implement TL-02 structured identity safety.
3. Implement PP-02 production-residue/adoption safety.
4. Implement AX-01 accessible dismissible-navigation behavior.
5. Implement AX-03 executable browser integrity evidence.

The goal is not to redesign the Starter. Phase A establishes trustworthy Core defaults and evidence before Phase B game adaptation work.

## 2. Frozen authorities

- Product Contract / Capability Registry: `COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md`.
- Core Safety Contract: `CORE_SAFETY_CONTRACT_DESIGN_V0.1.md`.
- Frozen Starter baseline: commit `29b25559cf2af859bca359c7f7fda686a4803c95`.
- Completed S1 TL-01: commit `a691661b330896f81f28fcac855f0ef9cc1dfccb`.
- Existing detailed TL-02 plan: `PHASE1_S2_TL02_IMPLEMENTATION_PLAN_V0.1.md`.
- Existing corrected Phase1 safety plan remains design evidence, not execution authority.
## 3. Candidate / repository strategy

**Decision:** promote the existing Phase1 Candidate into the active Phase A evolution candidate. Do not create another repository and do not transplant S1.

Rationale:
- the candidate is clean;
- it contains exactly one validated delta over the frozen baseline: S1 TL-01;
- preserving a linear commit history gives the clearest provenance;
- another clone/copy would create unnecessary divergence risk.

At implementation start, create one new linear implementation branch from `a691661b...` in the same candidate repository. Recommended branch name: `phase-a/core-safety`.

The directory name `GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE` may remain until Phase A evidence is complete. Renaming/repackaging is a later promotion decision, not an implementation prerequisite.

Frozen `GAME_SITE_STARTER_BASED_gamesop2.6.5` remains read-only throughout.

## 4. Three-artifact synchronization strategy

Do **not** edit the released/current V2.6.5 SOP or Master Prompt while Starter Candidate behavior is still changing.

Phase A first stabilizes the Starter Candidate. After Core Evidence is complete, create coordinated VNext candidate updates for SOP and Master Prompt, then verify that all three artifacts describe the same behavior before any release/promotion decision.

This prevents the current production methodology from pointing at unreleased Candidate capabilities.
## 5. Execution sequence

### A1 — TL-02 Structured Identity Safety

Primary owner: Starter.

Why first: TL-02 is already deeply planned, touches the SEO/JSON-LD output path, and PP-02 should scan the safe post-TL-02 output rather than learn the unsafe legacy Organization/publisher projection.

Implementation basis: use `PHASE1_S2_TL02_IMPLEMENTATION_PLAN_V0.1.md` as the detailed design authority unless implementation evidence proves a blocking mismatch.

Required outcome:
- brand no longer implies Organization;
- WebSite/WebPage remain by default;
- Article/Breadcrumb remain where applicable;
- author/publisher only appear from explicit, independently evidenced roles;
- visible author attribution and structured author stay aligned;
- extra JSON-LD scripts cannot bypass the controlled identity rules.

A1 exit: relevant unit/render/build tests PASS, all S1 TL-01 tests remain PASS, candidate diff stays inside approved scope.

### A2 — PP-02 Production Residue Safety

Primary owner: Starter.

Why second: after legal and identity defaults are safe, build/adoption tooling can define the final known-residue boundary without encoding obsolete unsafe output.
Required outcome:
- fixed Core sentinel catalog for shipped example residues;
- source projection checks plus generated-output checks;
- final build fails on applicable known residue;
- evidence mode may warn only for ordinary sample brand/domain residues and remains NOT FINAL;
- legal drafts, unsupported identity, missing coverage/readers remain errors in both modes;
- no generic word blacklist, regex engine, AI content linter, or production allowlist.

A2 exit: residue unit/output/build permutations PASS; neutral adopted fixture can run canonical final validation/build; shipped unadopted sample intentionally fails final adoption checks.

### A3 — AX-01 Navigation Behavior Implementation

Primary owner: Starter.

Implement the smallest local enhancement around the existing native `details/summary` navigation. Do not replace navigation architecture.

Required outcome:
- Escape closes the relevant disclosure and restores focus;
- nested disclosure cleanup is deterministic;
- link/ancestor close does not leave hidden focus;
- responsive mode transitions reset hidden mobile state and move hidden focus safely;
- no-JS native navigation remains usable;
- no focus trap, modal framework, global state store, or `role=menu` conversion.

A3 is an **implementation checkpoint, not AX-01 evidence completion**. Static/unit tests must pass, but AX-01 is not promoted until A4 browser evidence proves the behavior.
### A4 — AX-03 Browser Integrity + AX-01 Evidence Completion

Primary owner: Starter + Core evidence tooling.

This task adds the minimum real-browser runner and uses actual Core components/fixtures. It is where AX-01 behavior becomes evidence-backed.

Required outcome:
- dev-only browser runner; zero new runtime dependencies;
- Chromium/Firefox/WebKit baseline at 390×844, 768×1024, 1280×800;
- Chromium breakpoint/boundary resize checks around 900 and 620;
- reduced-motion checks;
- no-JS mobile fallback checks;
- overflow, keyboard, focus/Escape, tap-size, long-menu, 404/recovery assertions;
- machine-readable result plus concise readable summary;
- missing/skipped engine/matrix/report is failure, not warning;
- browser fixtures/reports never enter production output.

A4 exit: all required Core browser observations complete and PASS, full existing regression suite PASS, canonical adopted fixture build PASS, shipped sample remains intentionally non-final until adopted.

### A5 — Three-Artifact VNext Compatibility Sync

Executor: AI Architect designs deltas; Codex applies only after separate authorization.

Create candidate updates from the frozen/current V2.6.5 SOP and Master Prompt. Do not overwrite the frozen/current artifacts.
Sync requirements:
- SOP documents the new safety expectations and evidence responsibilities without absorbing Starter mechanics.
- Master Prompt enforces the new Candidate/approved-release behavior, hard stops and evidence requirements without redefining SOP or duplicating implementation.
- Starter documentation describes the actual implemented defaults and migration behavior.
- compatibility/provenance states exactly which SOP + Master Prompt + Starter candidate combination was tested.

No release number is assigned during A5 unless separately authorized.

## 6. Capability-to-artifact impact

| Slice | Starter | Future SOP VNext | Future Master Prompt VNext |
|---|---|---|---|
| TL-02 | non-assertive graph, explicit identity roles, guards/tests | evidence rules for operator/author/publisher/affiliation claims | reject inferred/unsupported identity; require matching visible/output evidence |
| PP-02 | sentinel catalog, source/output adoption gate | launch-finish expectation and known-vs-unknown residue boundary | require final residue pass; preserve evidence/final distinction |
| AX-01 | local accessible disclosure behavior | accessibility behavior requirement | require real interaction evidence when dismissible nav exists |
| AX-03 | browser fixtures/runner/CI evidence | supported Core browser/breakpoint acceptance expectation | require complete runner result; HARD STOP on missing/skip/failure |

Current V2.6.5 SOP/Master Prompt: read-only during A1–A4.

## 7. Commit / review gates

Each task is separately reviewed before the next begins. Recommended linear commits:

- A1: `feat: implement TL-02 structured identity safety`
- A2: `feat: add PP-02 production residue safety`
- A3: `feat: harden accessible navigation behavior`
- A4: `test: add core browser integrity evidence`

Commit messages are recommendations, not authorization to commit. AI Architect must inspect diff/tests before accepting each gate.
## 8. Test / evidence strategy

A1 fast path:
`npm exec -- vitest run tests/config.test.ts tests/seo.test.ts tests/site-validation.test.ts tests/html-audit.test.ts`

A1 regression path:
S1 TL-01 tests + article consumer tests + isolated core safety build permutations + `npm run check` + adopted fixture validate/build.

A2 fast path:
`npm exec -- vitest run tests/core-safety-sentinels.test.ts tests/pagefind-artifacts.test.ts tests/html-audit.test.ts`

A2 integration path:
core-safety/media/evidence build tests, source/output coverage negatives, neutral adopted fixture canonical build, unadopted sample rejection.

A3 fast path:
`tests/navigation.test.ts` plus focused behavior/helper tests introduced by the implementation.

A4 evidence path:
`npm run test:core-browser` plus full `npm run check`, adopted fixture `npm run validate` and `npm run build`.

Do not install dependencies before A4 unless A1/A2/A3 evidence proves a direct need. `@playwright/test` belongs to A4 as dev-only.

## 9. Mandatory preservation

Do not regress: IA-02, ID-01, SEO-01, SEO-03, PP-01, MR-01, media validation/readiness, Pagefind safety/exactness, route/output reconciliation, final/evidence marker semantics, and completed TL-01 behavior.

Do not enter Phase B theme/adaptation, Phase C media model redesign, Pattern Library, full Acceptance Gate, Reference projects, Release Governance, analytics/ads activation, or real legal/identity content creation.
## 10. STOP / no-go conditions

Stop and return to architecture review if any task requires:
- rewriting route/catalog authority or creating a parallel publication registry;
- a generic Schema.org/identity engine;
- a generic residue/content linter, arbitrary regex scanner, or production allowlist;
- replacing native navigation with a modal/nav framework or global state system;
- weakening existing final/evidence, route, SEO, media, Pagefind, ad or TL-01 checks;
- modifying the frozen V2.6.5 Starter, current V2.6.5 SOP, or current V2.6.5 Master Prompt;
- entering Phase B/C/D/E/F scope to make Phase A pass.

Any allowlist expansion must be justified by concrete blocking evidence and independently reviewed before editing.

## 11. Phase A completion definition

Phase A is not complete when source code merely exists.

`IMPLEMENTATION COMPLETE` = TL-02 + PP-02 + AX-01 implementation present, A4 tooling present, unit/integration/full checks pass.

`CORE EVIDENCE COMPLETE` = above + required three-engine AX-03 matrix and AX-01 behavior evidence complete, reports bound to candidate revision/diff.

Only after `CORE EVIDENCE COMPLETE` may A5 coordinated SOP/Master Prompt VNext synchronization proceed toward a compatibility gate.

Assembled-site acceptance remains later Phase F work and is not implied by Phase A PASS.
