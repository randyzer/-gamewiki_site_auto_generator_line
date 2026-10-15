> 2026-10-01 当前状态：实现获接受；浏览器证据未完成。本历史 prompt 不是当前执行授权；以用户最新要求和 `template/PROJECT_STATE.md` 为准。

# Codex Prompt — Phase A / A3 AX-01 Navigation Behavior

## Why this task
Current phase: Phase A Core Safety Completion.
A3 runs only after A1 TL-02 and A2 PP-02 are independently accepted. It implements the missing dismissible-navigation behavior while preserving the existing native `details/summary` architecture.

## Workspace
`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`

Preflight:
- use the accepted Phase A branch and accepted A2 HEAD;
- working tree clean;
- no current/frozen V2.6.5 authority file may be modified.

## Design authority
Read and follow:
- AX-01 section of `template/CORE_SAFETY_CONTRACT_DESIGN_V0.1.md`
- S4 navigation portions of `template/PHASE1_CORE_SAFETY_IMPLEMENTATION_CANDIDATE_PLAN_V0.1.md`
- `template/roadmap/PHASE_A_IMPLEMENTATION_PLAN_V1.md`

This task implements behavior only. AX-01 is not evidence-complete until A4 real-browser evidence passes.
## Task goal
Add the smallest local progressive enhancement needed for Escape close, focus restoration, nested cleanup, link/ancestor close, and responsive-mode cleanup without replacing native disclosure semantics.

## Allowed scope
Primary allowed files:
- `src/components/Header.astro`
- `src/components/navigation/MobileNav.astro`
- `tests/navigation.test.ts`

Only if concrete behavior evidence requires a minimal correction, additionally allow:
- `src/components/navigation/DesktopNav.astro`
- `src/styles/global.css`
- one small focused test/helper file for navigation behavior.

No Playwright runner/config/package changes in A3.

## Required behavior
- native `details.open` remains authoritative;
- Enter/Space native behavior is not double-handled;
- Escape closes the innermost relevant open disclosure and returns focus to its trigger;
- closing an ancestor resets nested disclosures;
- closing/navigation never leaves focus inside hidden content;
- mobile→desktop transition closes/resets mobile disclosures and moves hidden focus to a matching visible destination or home fallback;
- desktop→mobile transition does not leave hidden desktop focus;
- no-JS native links and disclosures remain usable.
## Forbidden
Do not introduce a modal drawer framework, React/global state store, focus trap, body scroll lock, `role=menu`, generic navigation framework, new runtime dependency, or new product navigation model.
Do not alter routing/catalog truth, content, SEO, legal/identity/residue behavior, media, ads, or Phase B+ styling.
Do not add browser-test dependencies/config in this task.

## Required tests/evidence
Add/update focused source/unit/helper tests sufficient to prove implementation structure and deterministic local behavior where possible without a browser.
Run relevant navigation tests plus full existing unit/check regression required by the Phase A plan.

## Acceptance criteria
- implementation matches the AX-01 contract;
- no-JS baseline remains intact;
- no unrelated visual/nav redesign;
- existing navigation destinations and parent Overview links remain unchanged;
- A1/A2 and S1 regression remain green.

Report A3 only as `IMPLEMENTATION CHECKPOINT`; do not claim AX-01 supported/proven yet.

## STOP conditions
STOP if satisfying AX-01 requires replacing native disclosure architecture, broad desktop navigation redesign, framework/global state, browser dependency before A4, or widening outside the evidence-backed local files.
Do not commit, push, tag, merge, or start A4 unless separately authorized.
