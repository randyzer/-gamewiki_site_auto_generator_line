# Site Remediation PR-B Transaction Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an offline-verifiable, crash-safe site-remediation transaction that preserves Stages 1–4 and invalidates only Stages 5–7, without enabling real Host acceptance or deployment.

**Architecture:** PR-B adds four closed transaction records, reuses the Pipeline's durable run lock and atomic-file primitives, and commits exactly one manifest transition. Preview, confirmation, recovery and replay are separate operations; real confirmation remains fail-closed until PR-C supplies a trusted Host evidence provider.

**Tech Stack:** Node.js 22 ESM, `node:test`, JSON Schema registry, canonical JSON/SHA-256, atomic rename/fsync, immutable write-once files.

---

### Task 1: Versioned remediation transaction contracts

**Files:**
- Create: `agent/src/contracts/schemas/site-remediation-preview.v1.json`
- Create: `agent/src/contracts/schemas/site-remediation-intent.v1.json`
- Create: `agent/src/contracts/schemas/site-remediation-receipt.v1.json`
- Create: `agent/src/contracts/schemas/site-remediation-abort.v1.json`
- Modify: `agent/src/contracts/registry.mjs`
- Create: `agent/tests/site-remediation-contract.test.mjs`

- [ ] Write tests that require all four contracts to be registered, closed, canonically digested and transaction-bound.
- [ ] Run `node --test tests/site-remediation-contract.test.mjs`; expect failure because the contracts are unknown.
- [ ] Add the four schemas and registry entries with no optional unknown fields.
- [ ] Add builders/verifiers in `agent/src/site-remediation-journal.mjs` only after the tests fail.
- [ ] Re-run the focused test; expect all contract tests to pass.

### Task 2: Shared durable run lock

**Files:**
- Create: `agent/src/run-lock.mjs`
- Modify: `agent/src/pipeline.mjs`
- Create: `agent/tests/run-lock.test.mjs`

- [ ] Write tests proving Pipeline and remediation contend on the same `<run>/.lock`, ownership loss is detected and dead-lock recovery remains explicit.
- [ ] Run `node --test tests/run-lock.test.mjs`; expect failure because the shared module does not exist.
- [ ] Extract the existing file-lock behavior into `run-lock.mjs`; do not introduce a second lock format.
- [ ] Refactor `pipeline.mjs` to use the shared primitive without changing ordinary run/retry behavior.
- [ ] Run `node --test tests/run-lock.test.mjs tests/pipeline.test.mjs`; expect all tests to pass.

### Task 3: Journal and crash classification

**Files:**
- Create: `agent/src/site-remediation-journal.mjs`
- Create: `agent/tests/site-remediation-journal.test.mjs`

- [ ] Write failing tests for PREVIEWED, INTENT_ONLY, RESERVED_PRE_COMMIT, RESERVED_POST_COMMIT, CONSUMED_NO_RECEIPT, COMMITTED and RECOVERY_REQUIRED classifications.
- [ ] Cover immutable write identity: identical bytes are idempotent; different bytes at the same path are rejected.
- [ ] Run `node --test tests/site-remediation-journal.test.mjs`; expect missing-module failure.
- [ ] Implement transaction-local paths, canonical immutable records, mutable journal state and exact manifest-state classification.
- [ ] Run the focused test; expect all journal and corruption cases to pass.

### Task 4: Preview, confirmation and atomic manifest transition

**Files:**
- Create: `agent/src/site-remediation.mjs`
- Create: `agent/tests/site-remediation.test.mjs`

- [ ] Write a synthetic manifest fixture with Stage 2 controlled `PARTIAL`, Stages 3–4 `PASSED`, and Stages 5–7 completed.
- [ ] Write failing preview tests for read-only behavior, immutable identity, stale sequence/hash, unsafe scope, changed protected inputs and missing Host authority.
- [ ] Write failing confirmation tests for exact code binding, one reservation, one manifest sequence increment, preserved Stage 1–4 JSON and Stage 5–7-only reset.
- [ ] Write failing fault-injection tests at intent, reservation, pre-rename, post-rename, consumption and receipt boundaries.
- [ ] Implement `previewSiteRemediation`, `confirmSiteRemediation` and `recoverSiteRemediation` using PR-A verifiers, the shared lock and atomic/immutable files.
- [ ] Treat manifest rename as the commit point. Before it, authorization is only reserved; after it, recovery completes exactly one consumption and receipt.
- [ ] Run `node --test tests/site-remediation.test.mjs`; expect all preview, commit, replay and fault-injection tests to pass.

### Task 5: Isolated CLI boundary

**Files:**
- Modify: `agent/src/cli.mjs`
- Create: `agent/tests/site-remediation-cli.test.mjs`

- [ ] Write failing CLI tests for `site-remediation-preview`, `site-remediation-confirm` and `site-remediation-recover` argument validation.
- [ ] Assert production confirmation returns `SITE_REMEDIATION_HOST_REQUIRED` until PR-C injects a trusted Host provider.
- [ ] Assert these commands never route through `run`, `retry`, `updateUserInputs`, workers or deployment.
- [ ] Add isolated CLI dispatch and fail-closed result reporting.
- [ ] Run `node --test tests/site-remediation-cli.test.mjs tests/confirmation-code-cli.test.mjs`; expect all tests to pass.

### Task 6: Regression, drift and review evidence

**Files:**
- Modify only files listed in Tasks 1–5.

- [ ] Run focused PR-B tests plus Pipeline/CLI regressions.
- [ ] Run `npm test`; expect zero failures.
- [ ] Run `git diff --check`; expect no output.
- [ ] Verify Wallpaper 002 manifest and raw-keyword SHA-256 values remain unchanged.
- [ ] Confirm no Worker, real manifest recovery, site mutation, deployment, push, DNS or indexing action occurred.
- [ ] Commit on `codex/site-remediation-transaction`, push, create a PR containing scope, files, tests, risks and rollback.
- [ ] Submit exact base/head/tree and execution evidence to ChatGPT for independent review. Do not merge without separate authorization for the exact reviewed identity.

## Drift stop conditions

- A new lock format or second manifest store would be required.
- Stage 2 or Stage 4 would be invalidated, rewritten or rerun.
- Confirmation would consume authorization before the manifest commit point.
- A transaction could widen publication scope or preserve stale Stage 7 approval.
- Real Host evidence, real Wallpaper 002 confirmation, PR-C/PR-D work or deployment would be needed.
- Any protected input hash changes.
