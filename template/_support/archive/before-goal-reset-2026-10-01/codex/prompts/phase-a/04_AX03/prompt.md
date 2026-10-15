# Codex Prompt — Phase A / A4 AX-03 Browser Integrity + AX-01 Evidence

## Why this task
Current phase: Phase A Core Safety Completion.
A4 runs only after A1/A2 are accepted and A3 navigation implementation is accepted as an implementation checkpoint. A4 supplies the real-browser Core evidence required by AX-03 and completes AX-01 evidence.

## Workspace
`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`

Preflight:
- accepted Phase A branch;
- clean working tree at accepted A3 HEAD;
- neutral adopted fixture preparation from A2 must work independently of browser tooling.

## Design authority
Read and follow:
- AX-03 and AX-01 evidence sections of `template/CORE_SAFETY_CONTRACT_DESIGN_V0.1.md`
- S4/CI/dependency sections of `template/PHASE1_CORE_SAFETY_IMPLEMENTATION_CANDIDATE_PLAN_V0.1.md`
- `template/roadmap/PHASE_A_IMPLEMENTATION_PLAN_V1.md`

Do not turn this into full assembled-site Acceptance or an E2E platform.
## Task goal
Add the minimum executable Core browser fixture runner, locked browser dependency/config, CI integration and evidence reporting required by AX-03, while testing actual Core components rather than copied implementations.

## Allowed scope
Use only the S4 file boundary in the corrected Phase1 plan. Expected areas include:
- `package.json` and lockfile for one dev-only `@playwright/test` dependency;
- small Playwright/core-browser config and runner files;
- three logical fixture roles: shell/navigation, content/detail, recovery/404, built from actual Core components/styles;
- focused browser spec and matrix/coverage unit test;
- `.github/workflows/ci.yml` and `.gitignore` only as needed for deterministic execution/results;
- shared neutral fixture helper from A2 may be reused, not replaced by browser-specific preparation.

Production runtime dependencies added: zero.

## Required matrix
- Chromium, Firefox, WebKit at 390×844, 768×1024, 1280×800 for all three fixture roles;
- Chromium boundary checks at navigation 899/900/901 and layout 619/620/621;
- Chromium live resize/focus transitions;
- Chromium reduced-motion at mobile and desktop;
- Chromium/Firefox/WebKit no-JS mobile fallback.

Required report records capability, fixture role, candidate revision/diff identity, engine/revision, viewport, JS/motion mode, assertion and PASS/FAIL reason.
## Required assertions
- document overflow ≤ 1 CSS px; intentional wide table scroll remains local;
- keyboard order, skip-to-main, Shift+Tab and visible focus work;
- A3 Escape/nested/focus/resize behavior works in real browsers;
- mobile controls meet 44×44 target intent and long menu reaches last link;
- reduced motion leaves content accessible without reveal completion;
- unknown route produces the actual recovery/404 behavior and valid recovery links;
- no-JS native navigation destinations remain reachable.

## Forbidden
Do not add full-route screenshot automation, generic crawler, Reference A/B/C projects, external acceptance service, browser test SaaS, visual-regression platform, sharding/cache platform, or runtime browser code.
Do not weaken missing/skipped engine/matrix/report into warnings.
Do not let browser setup become a prerequisite for preparing/running the browser-independent canonical adopted fixture build.
Do not modify current/frozen V2.6.5 SOP/Master Prompt.

## Required tests/evidence
Run matrix inventory/unit tests, `npm run test:core-browser`, full `npm run check`, neutral adopted fixture `npm run validate` + `npm run build`, and required safety regression tests.
Retain compact machine-readable results and a readable summary. Diagnostic trace/screenshot on failure is allowed; successful-route screenshot collection is not required.

## Acceptance criteria
All required observations exist and PASS; zero missing/skip entries; production output contains no fixtures/reports; prior safety and proven V2.6.5 mechanisms remain green.

## STOP conditions
STOP on browser/tool incompatibility that would require architecture expansion, non-deterministic fixture duplication of Core, CI weakening, or scope beyond the fixed matrix. Report the concrete blocker instead of reducing coverage.
Do not commit, push, tag, merge, release, or start A5 unless separately authorized.
