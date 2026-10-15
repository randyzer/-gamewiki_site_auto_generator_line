# PLAN40 — Core About Portability Repair Result

Date: 2026-10-08 (Asia/Taipei). Execution Owner: Codex.
Authority: [ChatGPT REVIEW39 / PLAN40](chatgpt-plan.md).
Status: **READY_FOR_INDEPENDENT_REVIEW**. No self-acceptance; two-game proof remains paused.

## Outcome

About visible intro now derives from the caller's existing Page Inventory description. LegalPage and source-residue projection supply the same description to getStaticPageCopy. The helper trims it, rejects a missing/blank intro for About, and retains the reusable method sections.

The hardcoded About project identity was removed from Core. No Config import, Page Inventory lookup in the helper, new field/schema/type, content system, component, dependency or compatibility layer. The string argument is a binding to existing authority, not a new runtime data authority. Optional at the TypeScript call boundary preserves existing Privacy/Terms rejection calls; About still requires it at runtime and has no fallback.

Privacy/Terms data, legal-content authority, activation/digest handling and fallback rejection remain unchanged. No change to About title/dates/layout/related pages or generic sections. PP-02 catalog, old core.about-intro literal, scopes, scan logic, coverage, HTML/Pagefind/URL rules remain intact; only the source About call receives page.description.

## Exact source/test scope: 6

| File | Action |
| --- | --- |
| src/core/static-page-copy.ts | Remove hardcoded About intro; assemble existing method sections with caller intro; fail closed for empty intro |
| src/components/LegalPage.astro | Existing About caller passes page.description |
| scripts/core-safety-sentinels.ts | Existing About source projection passes the same description; sentinel catalog unchanged |
| tests/static-page-copy.test.ts | Verify supplied intro and blank rejection; reusable sections and legal rejection retained |
| tests/core-safety-sentinels.test.ts | Verify fixture Core byte identity and clean adopted About source projection; copied old intro still rejected |
| tests/helpers/core-build-fixture.ts | Remove only two lines that rewrote static-page-copy.ts in adopted fixtures |

No seventh source/test file. Exactly 3 production + 3 test/support files. Earlier uncommitted work was preserved; backups contain exact pre-repair working bytes, not HEAD versions. approved-scope.patch is this action's increment relative to those backups.

## RED / GREEN evidence

| Phase | Command | Actual outcome / log |
| --- | --- | --- |
| RED targeted | npm exec -- vitest run tests/static-page-copy.test.ts tests/core-safety-sentinels.test.ts | exit 1; 4 failed / 46 passed; red-targeted.log |
| RED adopted | npm run verify:adopted-final | exit 1; PP-02 core.about-intro in source validation after hidden Core rewrite removed; red-adopted-verification.log |
| GREEN targeted | same targeted command | exit 0; 50/50 PASS; green-targeted.log |
| GREEN adopted | npm run verify:adopted-final | exit 0; final validate/check/build pass without fixture Core rewrite; green-adopted-verification.log |
| Unadopted safety | npm run verify:unadopted-final | harness exit 0; actual unadopted build exit 1 / EXPECTED_PP02_REJECTION; unadopted-verification.log |
| Root regression | npm run check | exit 0; Astro 152 files, 0 errors/warnings/hints; 48 files, 859/859 tests PASS; root-check.log |

All use already-installed Node 22.22.0. No dependency install/upgrade. RED assertions were not weakened. Synthetic adopted final is a technical QA contract, not either game's product/release acceptance.

## Scoped verification and identity

source-identity-before.json / source-identity-after.json capture branch v2.7/evolution, HEAD b067e8d4050478072f25a1dc78a8526cdd128cfd, tree 1df0ade30b1eaf51a76820c8d8b83337786f0dc1 and current working-tree changes. HEAD did not change; current source has the six-file repair increment.

Per-file incremental diff whitespace is clean. Source/scripts/tests/docs/public outside six paths compare byte-identical to the frozen common snapshot. Sentinel file is exactly its former text plus the page.description argument. No broad hash framework.

Old /private/tmp/v2.7-two-game-proof-v1/** not modified. BF10 frozen; WoG0; BF build failure and original shared-check FAIL retained. No two-game evidence build/browser/masked attempt in this repair. Governance, old game projects, historical iterations/archive/SOP/Master Prompt unchanged. No status promotion or commit/push/tag/merge/release.

## Review / rollback boundary

Submit the six-file increment, all RED/GREEN logs and identities for independent REVIEW40. Do not rebind or copy repaired Core into proof before ACCEPT — CORE PORTABILITY REPAIR and a subsequent bounded plan.

Rollback, if required, restores these exact six files from pre-repair/**, preserving all prior working-tree changes and failure evidence. No HEAD reset or migration framework.
