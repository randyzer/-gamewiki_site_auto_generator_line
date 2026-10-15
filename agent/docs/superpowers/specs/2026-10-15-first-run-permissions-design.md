# First-run permission fixes design

## Goal

Make the first keyword worker read immutable run-scoped copies of user inputs, and let only an approved deployment execution write the selected project's `.git` directory.

## Input copies

The manifest keeps original paths in `inputs` and records run-scoped copies in an optional top-level `inputCopies` object. Each record contains `originalPath`, `copyPath`, and `sha256`. Missing `inputCopies` remains valid for old manifests.

Immediately before the keyword stage first executes, the pipeline copies `rawKeywordsFile` to `runs/RUN_ID/inputs/raw-<basename>` and, when present, `keywordSourceLineageFile` to `runs/RUN_ID/inputs/lineage-<basename>`. It rejects basenames containing path separators, `..`, or control characters. The pipeline hashes the original before and after the copy, hashes the copy, sets mode `0400`, and records the result before dispatching the worker.

Only the keyword worker context replaces these two input paths with the copies. The manifest's original inputs and all later raw-keyword freshness checks continue to read the originals. Retry invalidation clears affected copy records; the next keyword attempt recreates them.

On resume, a copy record is valid only when its original path matches the manifest input, its copy path resolves strictly under `runs/RUN_ID/inputs/`, and its current SHA256 matches the recorded digest. A failure blocks the current stage and names the affected path.

The keyword native validator receives the same copied `rawKeywordsFile` path as the worker.

## Deployment `.git` access

The permission builder keeps `.git`, `.agents`, `.codex`, and `.aws` read-only under all writable roots. After those protections are applied, an approved deployment execution may override exactly `resolve(projectPath, '.git')` to write. The override is accepted only when it is exactly that path and the project directory is one of the writable roots. Parent `.git`, run `.git`, and every other protected directory remain read-only.

## Verification

Automated tests cover manifest compatibility and restoration checks, immutable copies, worker/validator path identity, retry freshness, exact deployment permission overrides, and negative `.git` cases. Two temporary real-worker checks then run only `cat COPY | head -3` and `git commit --allow-empty -m test`; their directories are deleted afterward.
