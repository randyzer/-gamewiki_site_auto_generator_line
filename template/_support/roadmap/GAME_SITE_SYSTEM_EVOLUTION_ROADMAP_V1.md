> 2026-10-01 用户目标重确认：历史提案/快照，当前暂停。文中当时的状态和下一步不代表当前进度或执行授权。当前入口见 `template/PROJECT_STATE.md`；完成关系核对和目录清理后再重新建立蓝图与路线。

# GAME_SITE_SYSTEM Evolution Roadmap V1

Date: 2026-10-01
Status: Architecture roadmap; implementation requires separate phase authorization.

## Phase A — Core Safety Completion

Goal: finish the smallest portable safety guarantees already identified by the frozen contract.

Scope:
- preserve completed S1 TL-01;
- implement TL-02 structured identity safety;
- implement PP-02 known-residue/adoption gate;
- implement AX-01 dismissible-navigation behavior;
- implement AX-03 representative browser integrity suite.

Why first: these are bounded Core obligations with existing designs, and later layers should build on safe defaults rather than work around them.

Exit evidence:
- capability-aligned tests;
- no regression of proven V2.6.5 mechanisms;
- three-artifact compatibility updates where required.

## Phase B — Adaptation Foundation

Goal: make "this specific game" a deliberate system outcome rather than a manual CSS rewrite.

Scope:
- semantic theme roles beyond palette only;
- typography/density/shape/state adaptation seams;
- Game Adaptation artifact for taxonomy + theme evidence + selected pattern;
- Game Recognition acceptance contract.
## Phase C — Media & Share Layer

Goal: upgrade media from fixed optional assets into a trustworthy, accessible commercial-site capability.

Scope:
- intrinsic dimensions/aspect metadata;
- rights/credit/license/accessibility fields;
- provider-neutral video seam and fallback;
- OG/Twitter share-media selection using the same media authority;
- explicit no-media states where appropriate.

## Phase D — Pattern Library

Goal: extract proven reusable compositions from the five references without creating five starters.

Initial pattern families:
- Wiki / Archive;
- Fantasy Immersion;
- Problem-Oriented Guide;
- Tactical / Systems;
- Commercial Editorial / Wiki.

Each pattern may own composition, article rhythm, optional modules and placement intent. It may not own route truth, SEO safety, legal safety, media truth, accessibility guarantees or publication state.

## Phase E — Content, Discovery & Monetization Quality

Goal: raise user value and commercial depth without fake breadth.

Scope:
- article utility primitives where justified;
- taxonomy/manual/tag related-content strategies;
- truthful freshness and dynamic labels;
- stable ad inventory patterns around useful content;
- title-promise/content-depth acceptance.
## Phase F — Acceptance & Regression System

Goal: prove assembled-site quality and protect capability continuity release to release.

Scope:
- independent assembled-site acceptance report;
- reference archetype projects/fixtures;
- cross-version Capability Delta;
- release exception record;
- compatibility declaration for SOP / Master Prompt / Starter.

## Validation Strategy

Use at least three distinct reference archetypes so one game cannot overfit the framework. Candidate examples can be selected later from the available project set; this roadmap does not freeze which games serve as references.

War of Genesis remains a mandatory retrospective regression input because it exposed legal residue, generic presentation, content-depth gaps and acceptance-boundary issues.

## Working Repository Strategy

- Frozen V2.6.5 Starter remains read-only evidence baseline.
- Existing Phase1 Candidate preserves valid S1 TL-01 work.
- Do not create a new unrelated Starter repository yet.
- Before Phase A implementation, decide whether the current Candidate is promoted into the general evolution candidate or whether S1 is transplanted onto a newly named evolution candidate. That decision must preserve provenance and avoid duplicate divergent branches.

## Next Gate

Next authorized work is **Phase A Implementation Planning**, not coding.

The planning task must:
1. sequence TL-02, PP-02, AX-01 and AX-03;
2. define exact candidate/repository strategy;
3. map each slice to SOP / Master Prompt / Starter changes;
4. define tests, acceptance evidence and STOP conditions;
5. preserve S1 TL-01 and all frozen V2.6.5 proven capabilities.
