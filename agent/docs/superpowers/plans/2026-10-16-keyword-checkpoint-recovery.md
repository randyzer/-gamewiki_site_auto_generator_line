# Keyword research recovery implementation plan

> Execute inline using superpowers:executing-plans; keep one source writer. ChatGPT plans and reviews through codex-with-chatgpt.

**Goal:** Preserve failed Stage 2 work for a verified new attempt without weakening completion requirements.

**Architecture:** Store host-hashed data snapshots outside worker write roots. A retry explicitly selects one snapshot by manifest path and SHA256; matching inputs, Skill and run are required. Snapshot integrity is separate from evidence sufficiency and official stage artifacts.

**Tech stack:** Node.js ESM, filesystem permissions and SHA256, node:test, existing orchestrator and Codex worker.

## 1. Recovery storage

- [x] Baseline: `cd agent && npm test` — 697 passing.
- [x] Add `agent/tests/keyword-recovery.test.mjs`; run `node --test agent/tests/keyword-recovery.test.mjs` and observe failure before implementation.
- [x] Implement `agent/src/keyword-recovery.mjs`: capture only data from the exact stage/attempt native directory; reject linked paths, limit size/count, exclude executables and worker control results. Bind run/game/attempt/raw keyword/lineage/Skill hashes. Publish once into a new readonly directory.
- [x] Verify explicit references before worker access; reject wrong digest, path traversal, missing/extra/tampered files, changed inputs or same/future attempts.
- [x] Add `agent/scripts/keyword-recovery.mjs` to capture a selected stopped historical attempt while holding the existing run lock. Never mutate manifest, execute historical scripts or start a worker.

## 2. Executor and preview

- [x] Add a failing stage-specific budget test to `agent/tests/skill-executor.test.mjs`.
- [x] Add optional `keywordRecovery` and `keywordResearchBudget` Stage 2 inputs in `agent/src/stages.mjs`; validate their shapes and bounds.
- [x] Update `agent/src/skill-executor.mjs`: Stage 2 default 30-minute hard budget with 3-minute handoff margin; other stage budgets unchanged. Include absolute deadlines, early structured result instruction, batches of 3–5 intents and a shared 429 stop instruction. This is a cooperative handoff deadline, not a guaranteed soft interrupt.
- [x] Reuse only verified snapshot data readonly, copy selected evidence into the new native directory as needed, never run old scripts. Snapshot after the worker process has stopped, including on timeout; keep the original exception and failure status. A snapshot failure must be reported without hiding the worker failure.
- [x] Update `agent/src/terminal-run.mjs` preview with selected recovery digest/attempt and budget; check hashes again on execution. Keep the existing confirmation-code requirement.
- [x] Add executor, permission, pipeline and preview regressions, including no official artifacts after timeout and no Stage 3 advance for partial materials.

## 3. Actual offline recovery and delivery

- [x] Independently verify attempt 5 files; create host snapshot and per-intent gap report without editing historical artifacts or raw inputs.
- [x] Keep the eight ambiguous input rows pending and all 33 provisional intents subject to review. Do not fabricate SERP overlap, current prices, subtitles or platform data.
- [x] Generate a new retry inputs file and preview only. No real worker, research network call, retry, stage advance or deployment in this task.
- [x] Run focused tests, then `cd agent && npm test`; record output for ChatGPT independent review.
- [x] Push the development branch and create PR with changes/files/tests/risks/rollback. Pause merge until ChatGPT independently approves the exact committed diff; follow existing user authorization thereafter.

## Acceptance

Integrity checks do not certify source truth or completion. Historical Stage 2 remains FAILED until a newly confirmed attempt returns valid complete materials through the existing native validator. Thirty minutes is an initial bound, not evidence that research can finish in that time. Recovery is host-side preservation after a worker stops; the worker is asked to save incremental files, but no concurrent snapshot of half-written files is promised.

## Final compatibility checks

- Preserve an explicitly configured host timeout as a cap; a task cannot increase the existing five-minute selfcheck budget.
- Preserve WORKER_TIMEOUT even if post-worker snapshot integrity verification also fails; append the integrity failure without masking the original failure.
- Both regression tests observed RED before implementation and passed afterward.
- Iteration 1 review accepted the implementation; exact final PR review covers these two additional corrections.
