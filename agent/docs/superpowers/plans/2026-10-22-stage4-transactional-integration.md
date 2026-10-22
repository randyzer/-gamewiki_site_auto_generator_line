# Stage 4 Transactional Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make direct-site Stage 4 generate and validate content in an isolated candidate, then promote it through a recoverable Host transaction so a Worker failure, validation failure, timeout, or missing package manager cannot leave the real site half-modified.

**Architecture:** Stage 4 readiness remains bound to the real target site. After readiness passes, the Host snapshots the target into a same-filesystem candidate and records an immutable baseline. The Worker can write only the candidate; the Host performs authoritative validation there. A PASSED candidate is promoted with a journaled target/backup/candidate directory swap, while every non-PASSED path discards the candidate and verifies the target baseline. The existing locked Skill is not changed, so the in-progress Wallpaper Engine run keeps its Skill identity.

**Tech Stack:** Node.js 22 ESM, `node:test`, existing Pipeline/Skill Executor/permission profiles, SHA-256 tree snapshots, same-filesystem `rename` with a durable JSON journal.

---

## Scope and decisions

This is one focused root-fix PR. It does not add a second runner, V2 approval infrastructure, deployment behavior, network access, or a new user confirmation. It applies to direct-site Stage 4 (`inputs.paths` exists). Existing-project mode already runs in its own isolated candidate and remains unchanged.

The locked `game-site-content-integrator` Skill is not edited. Its package-script requirement is satisfied by the Host adapter after Worker generation. The Stage 4 prompt states that the Worker must produce source and native artifacts, while the Host owns the authoritative check/typecheck/lint/test/build decision. The Worker receives no `pnpm` dependency for Stage 4, removing the duplicate validation failure without weakening final validation.

An ordinary nonempty directory cannot be replaced as one atomic operation. The implementation therefore promises recoverability, not impossible atomic visibility: same-filesystem rename, a persistent backup, a durable journal, and deterministic startup recovery. During the short `TARGET_BACKED_UP` interval the target path can be absent. After recovery, disk state must be exactly the old baseline or the validated candidate, never an unclassified mixture.

## Files

**Create**

- `agent/src/stage4-site-transaction.mjs` — candidate snapshot, baseline checks, journaled promotion, rollback, and recovery.
- `agent/src/stage4-host-validation.mjs` — authoritative offline package-script validation for a direct-site candidate.
- `agent/tests/stage4-site-transaction.test.mjs` — isolation, promotion, failure injection, recovery, and target-drift tests.
- `agent/tests/stage4-host-validation.test.mjs` — command selection, offline environment, script policy, and failure behavior.

**Modify**

- `agent/src/pipeline.mjs` — direct-site Stage 4 transaction lifecycle and PASSED-after-COMMITTED gate.
- `agent/src/skill-executor.mjs` — candidate execution context, Host-owned validation instruction, and Stage 4 Host validation call.
- `agent/src/worker-permissions.mjs` — candidate write / target read-only enforcement.
- `agent/tests/pipeline.test.mjs` — end-to-end ordering and failure invariants.
- `agent/tests/skill-executor.test.mjs` — prompt/context/validation ownership tests.
- `agent/tests/worker-permissions.test.mjs` — exact candidate and target grants.
- `agent/src/handoff.mjs` — bind upstream artifact identity to the real target while publishing research into the candidate.
- `agent/src/orchestrator.mjs` — forward the trusted Host validation seam without serializing functions into configuration.
- `scripts/preflight-all-stages.mjs` — give the real Stage 4 environment probe an isolated candidate binding.
- `agent/tests/helpers.mjs`, `agent/tests/configurable-paths.test.mjs`, `agent/tests/deployment-execution.test.mjs` — migrate offline fixtures to the candidate transaction contract.
- `agent/docs/AGENT_V2_CURRENT_EXECUTION_ROADMAP.md` — record the Stage 4 root fix and real-run acceptance gate after implementation passes.

Do not modify `codex-skills/`, historical manifests, recovery snapshots, deployment files, or the Wallpaper Engine site while implementing the code PR.

## Public interfaces

`stage4-site-transaction.mjs` exports:

```js
export function stage4TransactionPaths({ targetPath, runId, attempt })
// => { root, candidatePath, backupPath, journalPath, lockPath }

export async function prepareStage4SiteTransaction({
  targetPath, runId, attempt, readinessDigest, skillLockSha256
})
// => {
//   binding, // plain JSON-safe identity used by Executor and permission code
//   verifyTargetUnchanged(),
//   markValidated(candidateDigest, validationDigest),
//   promote(),
//   markManifestCommitted(manifestSequence),
//   finalize(),
//   abort(reason)
// }

export async function recoverStage4SiteTransaction({
  targetPath, runId, attempt, manifestStageStatus
})
// => { status: 'NONE'|'ROLLED_BACK'|'FINALIZED'|'RECOVERY_REQUIRED', evidence: [] }
```

The JSON-safe `binding` contains only absolute normalized paths and digests:

```json
{
  "kind": "STAGE4_SITE_TRANSACTION_V1",
  "runId": "wallpaper-engine-002",
  "attempt": 8,
  "targetPath": "/absolute/site",
  "candidatePath": "/absolute/.site.agent-stage4-.../candidate",
  "backupPath": "/absolute/.site.agent-stage4-.../backup",
  "journalPath": "/absolute/.site.agent-stage4-.../journal.json",
  "baselineDigest": "sha256",
  "readinessDigest": "sha256",
  "skillLockSha256": "sha256"
}
```

`stage4-host-validation.mjs` exports:

```js
export async function validateStage4Candidate(context, {
  run = runProcess,
  environment = process.env
} = {})
// Writes nativeDirectory/STAGE4_HOST_VALIDATION.json and returns
// { status: 'PASSED', reportPath, reportSha256, commands }
```

It chooses exactly one lockfile, runs existing scripts in this order when present — `check`, `typecheck`, `type-check`, `lint`, `test`, then mandatory `build` — and rejects package scripts containing install/update/download commands. It uses the current Host PATH but strips service credentials and forces offline package-manager settings. Any missing manager, nonzero exit, source mutation during validation, or missing build output throws a typed Stage 4 validation error.

## Transaction state and invariants

Journal states:

```text
PREPARED
  -> VALIDATED
  -> BACKUP_INTENT
  -> TARGET_BACKED_UP
  -> PROMOTE_INTENT
  -> PROMOTED
  -> MANIFEST_COMMITTED
  -> FINALIZED

PREPARED|VALIDATED -> ABORTED
BACKUP_INTENT|TARGET_BACKED_UP|PROMOTE_INTENT|PROMOTED -> ROLLED_BACK or RECOVERY_REQUIRED
```

Every journal write uses a temporary file, `fsync`, same-directory rename, and a parent-directory `fsync`. No filesystem rename may happen until its corresponding intent state is durably recorded. Before promotion:

1. The candidate digest must equal the Host-validated digest.
2. The target tree digest must still equal the baseline digest.
3. Candidate, backup, and target must be on the same device.
4. The transaction lock must still be owned by this run/attempt.
5. Protected research files and lockfiles must be unchanged from the baseline.

Promotion sequence:

1. Persist and sync `BACKUP_INTENT`; rename target to backup; sync the shared parent directory; persist `TARGET_BACKED_UP`.
2. Persist and sync `PROMOTE_INTENT`; rename candidate to target; sync the shared parent directory; persist `PROMOTED`.
3. Verify new target digest equals the validated candidate and backup digest equals the baseline.
4. Pipeline saves Stage 4 `PASSED` with transaction identity; persist `MANIFEST_COMMITTED`.
5. Remove backup and transaction lock, syncing their parent directories; persist `FINALIZED`.

Recovery rules:

- `PREPARED` / `VALIDATED`: target must equal baseline; remove candidate and mark `ABORTED`.
- `BACKUP_INTENT`: inspect target and backup using recorded paths and digests. If target is still the baseline and backup is absent, abort safely; if target is absent and backup is the baseline, restore it; any other combination is `RECOVERY_REQUIRED`.
- `TARGET_BACKED_UP`: target must be absent and backup must equal the baseline; restore backup to target and mark `ROLLED_BACK`.
- `PROMOTE_INTENT`: inspect target, candidate, and backup. If target is absent and candidate matches the validated digest, restore backup; if target matches the validated digest and candidate is absent, treat the rename as completed and apply the `PROMOTED` rule; every other combination is `RECOVERY_REQUIRED`.
- `PROMOTED` with manifest not PASSED: move promoted target aside, restore backup, verify baseline, mark `ROLLED_BACK`.
- `PROMOTED` / `MANIFEST_COMMITTED` with the exact manifest Stage 4 transaction identity and PASSED: verify candidate digest at target and finalize.
- Any digest, identity, path, device, or ownership mismatch: return `RECOVERY_REQUIRED` and do not delete or overwrite anything.

## Task 1: Transaction tests first

**Files:**

- Create: `agent/tests/stage4-site-transaction.test.mjs`
- Create: `agent/src/stage4-site-transaction.mjs`

- [ ] Write failing tests for candidate creation that prove the target digest does not change and the candidate matches the source snapshot.
- [ ] Run `cd agent && node --test tests/stage4-site-transaction.test.mjs`; expect failure because the module does not exist.
- [ ] Implement path validation, same-device checks, symlink rejection, safe tree copy, exact baseline/candidate SHA-256 snapshots, and exclusive transaction lock.
- [ ] Add fault-injection tests before and after each durable intent, each filesystem rename, manifest save, and final cleanup.
- [ ] Implement journal transitions, promotion, rollback, and recovery rules above.
- [ ] Run `cd agent && node --test tests/stage4-site-transaction.test.mjs`; expect all transaction tests to pass.

Test cases must include:

```text
worker/candidate failure leaves target byte-identical
target drift before promotion blocks without rename
candidate drift after validation blocks without rename
failure after target backup restores exact baseline
failure after candidate promotion rolls back when manifest is not PASSED
crash after BACKUP_INTENT but before rename aborts safely
crash after target rename but before TARGET_BACKED_UP restores the backup
crash after PROMOTE_INTENT before or after candidate rename is disambiguated from disk hashes
exact PASSED manifest identity finalizes a promoted candidate
stale or conflicting journal returns RECOVERY_REQUIRED
protected research change and lockfile change block promotion
same-path, nested-path, cross-device and symlink inputs reject
```

## Task 2: Authoritative Host validation

**Files:**

- Create: `agent/tests/stage4-host-validation.test.mjs`
- Create: `agent/src/stage4-host-validation.mjs`

- [ ] Write failing tests for pnpm and npm candidates, deterministic script ordering, offline environment, and typed failure.
- [ ] Run `cd agent && node --test tests/stage4-host-validation.test.mjs`; expect failure because the module does not exist.
- [ ] Implement lockfile/manager selection and script policy without adding dependency installation.
- [ ] Snapshot candidate source before commands, ignore build/cache outputs, and reject source mutation after each command.
- [ ] Write `STAGE4_HOST_VALIDATION.json` incrementally so a failure records the exact command and exit state.
- [ ] Run `cd agent && node --test tests/stage4-host-validation.test.mjs`; expect all Host validation tests to pass.

Required assertions:

```text
Worker PATH can lack pnpm while Host PATH supplies it
Host missing the selected manager returns BLOCKED/typed failure
install/add/update/upgrade/dlx/npx/bunx in validation scripts is rejected
service credentials and Node hooks are absent from child environment
build is mandatory and runs last
nonzero command prevents PASSED
candidate source mutation prevents PASSED
```

## Task 3: Executor and permission isolation

**Files:**

- Modify: `agent/src/skill-executor.mjs`
- Modify: `agent/src/worker-permissions.mjs`
- Modify: `agent/tests/skill-executor.test.mjs`
- Modify: `agent/tests/worker-permissions.test.mjs`

- [ ] Add failing tests showing direct-site Stage 4 uses `binding.candidatePath` as the Worker `projectPath`, while readiness verification still receives the original target context.
- [ ] Add failing permission tests showing candidate=`write`, real target=`read`, research=`read`, and candidate `.git/.codex/.agents/.aws` remain protected.
- [ ] Run `cd agent && node --test tests/skill-executor.test.mjs tests/worker-permissions.test.mjs`; expect the new assertions to fail.
- [ ] Build a Stage 4 execution context from the transaction binding. Rewrite only execution paths (`projectPath`, `paths.siteDirectory`, and the candidate research path); retain `stage4TargetPath` and the original readiness context.
- [ ] Update the Stage 4 prompt to state: Worker generates candidate source/artifacts; Host owns authoritative package checks; Worker must not run or report Host validation as final acceptance.
- [ ] Call `validateStage4Candidate()` only after native artifact validation returns PASSED, and append the Host report as evidence. A Host failure changes the result to non-PASSED through the existing diagnostic path.
- [ ] Update permission construction so the real target can never inherit the candidate write grant.
- [ ] Run the focused tests; expect all to pass.

## Task 4: Pipeline commit gate

**Files:**

- Modify: `agent/src/pipeline.mjs`
- Modify: `agent/tests/pipeline.test.mjs`

- [ ] Add failing Pipeline tests for the complete order:

```text
readiness(target)
prepare-candidate(target)
install-dependencies(candidate)
worker(candidate)
host-validation(candidate)
copy-artifacts-to-run
promote(candidate -> target)
save PASSED manifest
finalize backup
```

- [ ] Add failure tests for install failure, Worker timeout, Worker FAILED, artifact validation failure, Host build failure, target drift, promotion interruption, and manifest-save interruption. Each must assert that the target is the original baseline after recovery.
- [ ] Run `cd agent && node --test tests/pipeline.test.mjs`; expect new tests to fail.
- [ ] Prepare the transaction only for direct-site Stage 4 after readiness is READY. Install dependencies into `candidatePath`, not the target.
- [ ] On a non-PASSED result or thrown error, call `abort()` before recording failure. If promotion began, rollback must complete or the Stage becomes `BLOCKED` with `RECOVERY_REQUIRED` evidence.
- [ ] Copy validated artifact bytes into the run artifact directory before promotion, then rewrite persisted `sourcePath` values from candidate-relative paths to the promoted target paths.
- [ ] Require transaction state `PROMOTED` before transitioning Stage 4 to PASSED; save the manifest; then call `markManifestCommitted()` and `finalize()`.
- [ ] On resume/retry, reconcile any prior journal before creating a new attempt.
- [ ] Run focused Pipeline tests; expect all to pass.

## Task 5: Compatibility and full regression

**Files:**

- Modify: `agent/docs/AGENT_V2_CURRENT_EXECUTION_ROADMAP.md`

- [ ] Run the fast focused suite:

```bash
cd agent && node --test \
  tests/stage4-site-transaction.test.mjs \
  tests/stage4-host-validation.test.mjs \
  tests/pipeline.test.mjs \
  tests/skill-executor.test.mjs \
  tests/worker-permissions.test.mjs \
  tests/existing-content.test.mjs \
  tests/direct-site.test.mjs
```

Expected: all pass.

- [ ] Run retry and entry contracts:

```bash
cd agent && node --test \
  tests/retry-contract.test.mjs \
  tests/terminal-run.test.mjs \
  tests/entry-approval.test.mjs
```

Expected: all pass.

- [ ] Run the full suite: `cd agent && npm test`. Expected: exit 0 and no skipped root-fix tests.
- [ ] Verify protected Wallpaper 002 input hashes and historical run-tree hashes are unchanged.
- [ ] Update the roadmap with the exact test counts and mark the next gate as attempt 7 site reconciliation, followed by a real Stage 4 retry. Do not claim real validation from unit tests.

## Task 6: Review, merge, and real recovery acceptance

- [ ] Create one branch with prefix `codex/` and one PR containing only the frozen files.
- [ ] Record focused/full test output and immutable base/head/tree/diff evidence for ChatGPT review.
- [ ] Merge only after ChatGPT reviews the exact Head and authorizes a normal merge commit.
- [ ] After merge, verify main/origin/main identity and a clean worktree.
- [ ] Before touching the Wallpaper Engine site, rerun the attempt 7 recovery comparison. Acceptance requires exactly 15 template-restorable files and 11 attempt-added files, with zero unresolved business files. `.DS_Store` entries are ignored metadata.
- [ ] Restore the 15 files from the immutable template snapshot only when each source SHA-256 equals the attempt 7 baseline; remove only the 11 paths absent from the baseline; verify the site tree returns to the attempt 7 baseline.
- [ ] Generate a fresh retry preview and continue real Stage 4. Do not restore YouTube/Steam Community services, deploy, push the site, or modify DNS.

## Success criteria

The root fix is complete only when all statements are true:

1. Direct-site Stage 4 Worker cannot write the real target.
2. The real target is unchanged for Worker exit, timeout, artifact failure, Host validation failure, or target drift.
3. The Host runs package checks/build on the candidate and records exact results.
4. Stage 4 PASSED requires a validated, promoted, manifest-bound transaction.
5. Interrupted promotion deterministically returns to the old baseline or finalizes the exact validated candidate; otherwise it stops as `RECOVERY_REQUIRED` without guessing.
6. Existing-project behavior, prior stages, retry contracts, and deployment gates do not regress.
7. Attempt 7 residue is restored only from verified template bytes and exact baseline evidence.
8. A real Wallpaper Engine Stage 4 retry passes and advances to Stage 5, or reports a new concrete external blocker while leaving the site consistent.
9. Deployment remains unexecuted.

