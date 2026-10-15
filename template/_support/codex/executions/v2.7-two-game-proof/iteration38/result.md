# PLAN38 — Baseline Verification Stop

Date: 2026-10-08 (Asia/Taipei). Executor: Codex.
Authority: [ChatGPT REVIEW37 / PLAN38](chatgpt-plan.md).

## Actual execution

Created /private/tmp/v2.7-two-game-proof-v1/common-core from the current Candidate working tree (including active untracked source), then separate bomb-farm and war-of-genesis copies. Dependencies were physically copied separately from the same installed snapshot; relative bin symlinks were checked to stay inside each root. Node 22.22.0 from the already installed nvm runtime was used. No install, upgrade, package/lock change.

Ran the planned one common baseline command: npm run check.
[Full log](../../../verifications/v2.7-two-game-proof/proof-v1/shared-check.log).

Astro: 152 files; 0 errors / 0 warnings / 0 hints.
Vitest: 47 files passed / 1 failed; 853 tests passed / 2 failed.
Exit code: 1.

Both failures are in tests/runtime-contract.test.ts, which reads ../.github/workflows/ci.yml. That existing Candidate file was omitted from the copied-root list inherited from Implementation Plan V1 §3. The copy operation followed that list; Codex did not catch the test's file dependency before execution. Source CI exists, but common-core/BF/WoG have no .github copy.

This is **STOP — INCOMPLETE BASELINE SNAPSHOT**, not an observed Core behavior failure. No test or product repair was attempted. No rerun occurred. The failed log remains intact; no FAIL→PASS rewrite.

## Scope at stop

- Game input changes: BF 0 / WoG 0. No SVG, content, config, theme or Media Decision Table authored.
- Common source/test delta relative to copied baseline: 0.
- Original Candidate / BF / WoG: unchanged by execution.
- Build:evidence: NOT_RUN on both games.
- Browser/masked review: NOT_RUN.
- No media copied, official battle screenshot remains excluded.
- No fifth page, framework, schema, dependency or authority introduced.
- Governance / historical records: unchanged.
- Proof workspace preparation has started; the four-page product proof remains incomplete, not PASS.

Current evidence: common-core-identity.md, failed shared-check.log, partial PROOF_REVIEW_PACKAGE.md. The 21-file package is NOT COMPLETE. Do not fabricate remaining screenshots/builds/output/diffs.

## Proposed correction for independent review

Copy only the existing Candidate .github/workflows/ci.yml byte-for-byte into common-core and both isolated game roots. This is completion of the shared baseline, not a BF11/WoG9 game input. Keep it immutable and compare bytes across all copies. Preserve this failed check.log, then capture any newly authorized retry output in iteration39/result.md or another explicitly authorized record; do not overwrite the original failure. No extra script/tool or test edit.

STOP for ChatGPT to review this diagnosis and provide the next bounded plan. No product or release acceptance; no implicit WS04B/WS07/AX/Safari promotion.
