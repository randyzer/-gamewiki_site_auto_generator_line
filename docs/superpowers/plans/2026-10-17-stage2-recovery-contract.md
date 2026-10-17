# Stage 2 Recovery Contract Repair Plan

**Goal:** Stop Stage 2 retries from treating changed evidence files as factual progress, then add a separately reviewed handoff that can carry truthful partial research into downstream draft-only work.

**Constraints:** Keep the locked Skills unchanged. Do not launch a real worker, resume a rate-limited service, run attempt 10, or deploy while implementing this plan. Preserve `PARTIAL` as the truthful Stage 2 status.

## PR-A: Evidence Plan V2

### 1. Specify the bounded task contract

- Upgrade recovery plans to `KEYWORD_EVIDENCE_PLAN_V2`.
- Require every task to declare `acceptanceCriteria`, `stopConditions`, `sourceRequirements`, `fallbackDisposition`, and `expectedStatusTransition` in addition to its keyword, lineage, gap, tool, target, and expected evidence.
- Bind the plan to the run, Stage 2, recovery snapshot digest, service-stop decisions, and all pending-row decisions.
- Reject V1 plans explicitly so a new confirmation cannot silently reuse the weaker contract.

### 2. Capture host-verifiable before/after state

- Snapshot evidence-file hashes, service-blocker hash, every keyword material hash, and each material's declared status and gap text before worker launch.
- Recompute the same state after the worker stops.
- Treat file-hash changes as candidate evidence only; never equate them with gap closure.

### 3. Classify each task outcome

- Require an attempt-scoped `KEYWORD_EVIDENCE_OUTCOME_V2.json` that maps exactly to the approved tasks.
- Validate cited evidence paths, HTTPS source URLs, access results, material file paths, and before/after material transitions against host-observed files and hashes.
- Emit only these host classifications: `NEW_FILES`, `NEW_VERIFIED_EVIDENCE`, `GAP_RESOLVED`, `STATUS_CHANGED`, `NO_PROGRESS`, or `PLAN_EXHAUSTED`.
- A worker claim without matching host evidence is `NO_PROGRESS`; a changed blocker file is diagnostic only.
- Bind `PLAN_EXHAUSTED` to the recovery digest, plan digest, service decisions, and gap state. Reject the same plan under the same binding on the next retry; a newly reviewed plan may supersede it.

### 4. Keep pipeline semantics unchanged

- Preserve the worker's truthful `PARTIAL`/`BLOCKED` result and existing Stage 2 artifact gate.
- Do not change `Pipeline.advance`, upstream satisfaction, route publication, or deployment behavior in PR-A.
- Update operator documentation and fixtures to the V2 schema.

### 5. Verify and review PR-A

- Add contract tests for schema binding, legacy-plan rejection, source and stop requirements, host classifications, fake worker claims, material transitions, and exhaustion replay rejection.
- Run the focused Stage 2 tests, then the full agent test suite.
- Push a dedicated branch and create a PR containing changes, files, tests, risks, and rollback steps.
- Send the exact PR head to ChatGPT for review. Do not merge until that review passes.

## PR-B: Partial Research Handoff

Start this only after PR-A is merged and reviewed again against the then-current `main`.

### 1. Add an immutable research handoff

- Generate `RESEARCH_HANDOFF_MANIFEST_V1` on the host for a Stage 2 `PARTIAL` checkpoint.
- Bind run, stage, attempt, recovery lineage, all keyword material hashes/statuses/gaps, every pending row, publication disposition, site revision, and domain.
- Avoid circular hashes: generate a candidate manifest, approve its SHA256, then bind the checkpoint and receipt to that digest.

### 2. Add exact authorization and narrow advancement

- Bind approval to the handoff digest, run/attempt, statuses, pending rows, route policy, revision, and domain.
- Add one narrow upstream exception: Stage 2 `PARTIAL` is usable only when the immutable handoff and exact authorization validate. All other `PARTIAL` stages remain blocking.
- Update manifest validation, current-stage selection, advance, artifact verification, retry, and reset paths together.
- Existing manifests retain the legacy complete-only policy and are never migrated automatically.

### 3. Enforce publication policy

- Use `ROUTE_PUBLICATION_MANIFEST_V1` for both new and existing projects.
- `COMPLETED` may publish. `PARTIAL` may only produce a draft route with `noindex` and must be absent from sitemap, navigation, search, related links, and alternates. `BLOCKED` produces no route or source file.
- Make prelaunch discover actual routes beyond the sitemap and fail closed when it cannot prove complete coverage, including multilingual and residual-route checks.

### 4. Verify and review PR-B

- Add new-site, existing-site, tamper, stale-authorization, retry/reset, hidden-route, and legacy-manifest tests.
- Run focused tests and the full agent suite.
- Create a separate PR and obtain ChatGPT approval for its exact head before merging.

## Rollback

- PR-A rollback restores the V1 plan parser and the old evidence-file diagnostic behavior; no manifest or pipeline migration is involved.
- PR-B rollback disables the handoff exception, stops dependent runs, and preserves recovery snapshots and handoff files for audit. It must never convert partial research into completed artifacts.
