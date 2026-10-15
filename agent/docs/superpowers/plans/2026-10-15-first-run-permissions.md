# First-run Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Copy keyword inputs into immutable run-scoped files and grant approved deployment workers exact write access to the selected project's `.git` directory.

**Architecture:** The pipeline owns input snapshot creation and manifest restoration checks, while the worker and native validator consume a stage-local input view. The permission builder applies default protected-directory reads, then permits one validated project `.git` override only for approved deployment execution.

**Tech Stack:** Node.js ESM, `node:test`, Codex CLI permission profiles, Git.

---

### Task 1: Run-scoped keyword input copies

**Files:**
- Modify: `src/pipeline.mjs`
- Test: `tests/pipeline.test.mjs`

- [ ] Add failing tests for raw/lineage copy names, `0400`, manifest records, stage-local paths, invalid filenames, old-manifest compatibility, resume hash/path blocking, and original-byte freshness.
- [ ] Run `node --test tests/pipeline.test.mjs` and confirm the new assertions fail for missing `inputCopies` behavior.
- [ ] Implement atomic SHA256-checked copies and optional manifest validation, keeping original paths in `state.inputs`.
- [ ] Run `node --test tests/pipeline.test.mjs` and confirm all pipeline tests pass.

### Task 2: Native keyword validator uses the copied input

**Files:**
- Modify: `src/artifact-validator.mjs`
- Test: `tests/artifact-validator.test.mjs`

- [ ] Add a failing test that captures the `validate_outputs.py` arguments and requires the worker copy path after `--raw-keywords`.
- [ ] Run `node --test tests/artifact-validator.test.mjs` and confirm the test fails with the original path.
- [ ] Use the stage-local copied input already present in `context.inputs.rawKeywordsFile`.
- [ ] Run `node --test tests/artifact-validator.test.mjs` and confirm it passes.

### Task 3: Exact deployment `.git` write override

**Files:**
- Modify: `src/worker-permissions.mjs`
- Test: `tests/worker-permissions.test.mjs`

- [ ] Add failing tests requiring project `.git` write only in approved execute mode, while plan/content/UI, parent `.git`, and run `.git` remain read.
- [ ] Run `node --test tests/worker-permissions.test.mjs` and confirm the execute assertion fails.
- [ ] Add an exact resolved project `.git` override after default protections, guarded by deployment approval and writable-project membership.
- [ ] Run `node --test tests/worker-permissions.test.mjs` and confirm all permission tests pass.

### Task 4: Full and real-worker verification

**Files:**
- Create temporarily, then delete: task-specific directories under `agent/`

- [ ] Run `node src/cli.mjs inventory && node --test tests/*.test.mjs`; preserve only expected inventory bytes.
- [ ] Invoke a real Codex worker with the keyword permission profile and only `cat COPY | head -3`; record sanitized output.
- [ ] Invoke a real Codex worker with the approved deployment permission profile in a temporary repository and only `git commit --allow-empty -m test`; record output and commit.
- [ ] Delete both temporary verification directories and verify the worktree contains only intended files.
- [ ] Commit the implementation and report commit hash, test counts, and both real-worker outputs.
