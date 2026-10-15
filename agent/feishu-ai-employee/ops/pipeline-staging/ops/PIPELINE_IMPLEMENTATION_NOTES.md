# Seven-stage orchestration core — review candidate

Implemented against `agent/AGENT_TASK_CARD_AND_WORKFLOW_SPEC_V0.1.md` and the local inventory schema. This is an independent Node.js ESM module, not a live Feishu integration. No dependencies, subprocesses, network clients, Git operations, deployment actions, or credential handling are included.

## Files and verification

- `src/pipeline.mjs`: orchestration, input and artifact contracts, locks, persistence, and explicit resume.
- `tests/pipeline.test.mjs`: offline executors and disposable fixtures created inside staging and removed after tests.
- `ops/PIPELINE_IMPLEMENTATION_NOTES.md`: this implementation contract and limitations.

Verified with Node **v22.16.0**:

```sh
node --test tests/pipeline.test.mjs
```

Result: **34 tests, 34 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo**, exit code **0**. Tests were written first; initial missing-module failure and subsequent targeted regression failures were observed before implementation/fixes.

## Public API

`createPipeline({ workspace, executor, inputs, inventoryPath?, templateRoots?, runId?, resume? })` asynchronously returns:

- `advance()`: validates and invokes at most one eligible stage; returns a detached JSON snapshot. Never automatically retries a waiting, partial, blocked, or failed stage.
- `updateUserInputs(patch, { retry?: boolean })`: explicit user event. Satisfying a requested input reopens the waiting stage. Retrying a partial/failed/blocked stage additionally requires `retry: true`. Changes invalidate affected downstream checkpoints. Unrelated later inputs and redundant updates do not replay the pending stage.
- `snapshot()`: detached serializable run manifest.
- `inputChecklist()`: inputs ordered by stage, now/later timing, conditional flags, supplied values' presence, path/type hints, and associated skill. Presence is informational; `advance()` performs actual validation.
- `manifestPath`: `<workspace>/runs/<runId>/manifest.json`.

Use a dedicated writable workspace. `projectPath` must be an absolute descendant, disjoint from `<workspace>/runs`. The workspace must not overlap any supplied template root or inventory skill root. Supply all actual template-source roots explicitly; the core does not guess them. With no roots supplied, the template stage waits and requires a newly configured run.

Restore with the same `workspace`, `runId`, `inventoryPath`, and `templateRoots`, plus `resume: true` and the executor. Omit `inputs` on restore; change them using `updateUserInputs`. Game identity, project, objective, and ad-branch selection are locked once execution starts; use a new run for another task. Ad branch selection is fixed at creation.

## Stage and input contract

| Stage | Input required by this stage | Result |
|---|---|---|
| 1 `game-homepage-icon-research` | `gameIdentity`, absolute `projectPath`, `objective` | Homepage research and icon artifact |
| 2 `game-innerpage-keyword-information-research` | Explicit user `rawKeywordsFile`, absolute, nonempty `.md` regular file | Keyword index, processing record, summary and material bundle |
| 3 `game-site-template-selector` | Configured template roots; absent or empty project directory | Selection report, copy manifest, residue scan |
| 4 `game-site-content-integrator` | Explicit boolean `canonicalRequired`; confirmed HTTPS `canonicalOrigin` if true | Integration report, page manifest, provenance, gaps |
| 5 `game-site-ui-ux-audit-optimizer` | `siteRevision`; optional `uiMode: 'optimize'` requires `uiApproval` | Audit report; retest additionally required for optimize |
| 6 `game-site-prelaunch-gate` | Production `domain`; current UI/project evidence | Acceptance report/JSON and repair manifest |
| 7 `game-site-deploy-and-measurement` | `repo`, `branch`, `dns: { provider, recordsReviewed: true }`, `deploymentPlanAuthorized: true` | Deployment plan only, then WAITING |
| Optional 8 `game-site-adsterra-ad-integration` | `adsEnabled: true`, nonempty user `adCode`, `adApproval`, matching HTTPS `liveUrl` | Advertising plan only, then external implementation/acceptance WAITING |

The first three inputs are required before any executor call. Game identity must include user-confirmed platform/version/disambiguation information where needed; the core cannot establish whether a textual identity is factually unique. Raw keywords are never generated, inferred, or discovered by scanning. The executor receives their path; its adapter is responsible for preserving actual keyword membership and lineage. Hash changes in the supplied file block downstream work and plan acknowledgement.

`uiApproval` and `adApproval` have `{ approved: true, projectPath, scope: 'explicit user-approved scope' }`. The queue adapter must authenticate these as genuine user events; executor-produced approvals are not accepted. Do not pass account credentials. Input keys suggesting passwords, tokens, cookies, keys or secrets are rejected; this is not a general-purpose secret detector. Public ad snippets are untrusted data and are never evaluated. The adapter must sanitize all user inputs, evidence and report content before persistence.

## Executor contract

The injected function is `async (skillName, context) => ({ status, artifacts, evidence, missing_inputs })`. Its context contains inputs, run ID, output directory, required artifact kinds, locked skill metadata, prior stage evidence/checkpoints, mode and permissions. Mutating context does not modify internal state.

Allowed result statuses are `PASSED`, `PARTIAL`, `FAILED`, `BLOCKED`, `WAITING_FOR_USER`. READY/IN_PROGRESS transitions belong to the core. Mandatory stages cannot be skipped by an executor. PASSED requires nonempty textual evidence, every required artifact, and no missing inputs. WAITING requires named missing inputs; adapters should use the supported input keys so the user can supply them.

Each artifact is a **declarative output**, not an arbitrary existing report path:

```js
{
  kind: 'HOMEPAGE_RESEARCH.md',
  path: `${context.outputDirectory}/HOMEPAGE_RESEARCH.md`,
  runId: context.runId,
  projectPath: context.inputs.projectPath,
  gameIdentity: context.inputs.gameIdentity,
  content: 'Report content',
  encoding: 'utf8' // optional; base64 is available for binary artifacts
}
```

All artifacts are validated before writing any of them. Output paths must stay in the particular stage/attempt directory. Symlink ancestors, hard links, wrong project/game/run, duplicates, empty content, malformed JSON and missing required roles are rejected. Writes use exclusive creation to avoid overwriting prior files. Core writes are limited to run manifests, locks and returned artifact bytes; it never writes to the site directory, including before inputs pass.

`ARTIFACTS` exports this adapter's role names. These are **local normalized contracts**, not invented native Skill schemas. In particular `HOMEPAGE_RESEARCH.md`, `ICON.zip`, and `KEYWORD_MATERIALS.md` are normalized roles for the native game-specific report, icon archive, and per-keyword materials. A future adapter must translate actual Skill layouts into these roles while preserving provenance. Generic JSON is checked for syntax, not full professional report semantics; ZIP bytes are not inspected. Tests validate orchestration, not the factual validity of research or readiness of a real site.

`PRELAUNCH_ACCEPTANCE.json` additionally requires these normalized fields:

```json
{
  "disposition": "可以上线",
  "siteRevision": "the caller's reviewed revision identifier",
  "domain": "the user-confirmed production hostname"
}
```

Only `可以上线` and `可以上线，但有P2待办` permit a PASSED prelaunch result. Other/missing dispositions or mismatched revision/domain become BLOCKED. The original native report contract must be retained by the future adapter; no claim is made that this normalized envelope is its complete schema.

## Approval and execution boundaries

Audit-only is default. `optimize` is available only after scoped UI approval and requires a retest artifact. Even then this standalone core collects outputs/proposals, not site edits: `siteWrites` is always false.

Deployment always uses `mode: 'plan-only'`. `gitPush`, `dns`, `productionDeployment`, `gsc`, `ga4` and `advertisingScripts` permissions are always false. There is deliberately no parameter or API that enables these external actions. An executor claiming PASSED for stage 7 is converted to WAITING with a digest of its saved plan artifacts.

After reviewing the exact plan, the user may submit:

```js
await pipeline.updateUserInputs({
  deploymentPlanApproval: {
    approved: true,
    digest: pipeline.snapshot().stages[6].checkpoint.planDigest
  }
});
```

This verifies locked sources, upstream reports, keyword bytes and site freshness again, then marks **planning** PASSED without re-invoking the skill. It is solely an acknowledgement that permits reaching the optional ad-planning branch, not push/DNS/deployment/Google authorization. `deploymentExecuted` remains false. No status in this module means a site was deployed or the specification's live acceptance criteria were met.

The optional branch has a SKIPPED record unless explicitly enabled at creation. When enabled without code, no advertising executor is invoked until the user supplies code and approval. Ad planning ends at WAITING; live script integration and acceptance require a separately reviewed future integration, including new prelaunch and deployment approvals.

## Persistence, versioning, and recovery

The default inventory is the exact requested `agent/feishu-ai-employee/data/skill-manifest.json`. Every enabled entry must be unique, available, inside its declared skill root, readable, and SHA256-matching. The manifest digest and all enabled source hashes are pinned and rechecked before and after execution and before acknowledging a deployment plan. Missing/unreadable inventory or hash mismatch produces a persisted BLOCKED stage without execution. Repaired dependencies require a new run if the original lock could not be established; established locks never silently upgrade.

Only source files enumerated by the inventory are covered. Its present entries identify `SKILL.md`; referenced scripts, resources or nested Skill dependencies are not separately inventoried. No repository fetch/upgrade, compatibility inference, or invented semantic version is performed. Absent version/contract-version fields are stored as null.

State history records transitions, timestamps, evidence, artifact hashes, source version and next step. Checkpoints contain attempt number, input digest and wait metadata. Prior attempt files are retained in separate directories. Manifest replacement uses an fsynced temporary file and atomic rename. Failed multi-artifact writes can leave orphan files for inspection; they never become a PASSED checkpoint or overwrite an earlier attempt.

An in-memory busy flag plus a per-run exclusive filesystem lock prevents overlapping calls across instances/processes. Every mutation compares the current disk manifest with the instance snapshot; stale instances must reload. IN_PROGRESS is persisted **before** executor invocation. Interrupted invocations become BLOCKED rather than being automatically replayed. Explicit retry creates a new attempt and keeps prior evidence history.

A process killed while holding `.lock` leaves that lock behind. This module never guesses that a lock is stale and never steals it. An operator must first establish that the old process is stopped and reconcile potential side effects, then remove the stale run lock outside this API. At-most-one normal invocation is provided, not transactional exactly-once delivery of arbitrary external side effects. Separate run IDs are not a global project lock; a future queue must serialize site-writing jobs per project.

Upstream artifact hashes are rechecked before downstream calls. A project content digest is captured after UI audit and compared before/after later stages and before plan acknowledgement. It recursively hashes regular project files without reading `.git`; symlinks and special files are rejected. Changed `siteRevision` invalidates UI and later stages; use `{ retry: true }` as well if an affected stage is BLOCKED. Full-tree hashing is conservative and may be expensive on dependency/build trees. Git branch/commit freshness remains the adapter's responsibility; this task performs no Git operations.

The waiting checkpoint records start time and `reminderSent: false`, `schedulerAvailable: false`. No background timer or ten-minute reminder is claimed. Feishu event delivery, authentication, scheduling, native report normalization, Git inspection, account permissions, production execution and live verification remain unimplemented until separately reviewed.

## Trust and filesystem limitations

The injected executor is a trusted in-process function. JavaScript cannot sandbox it: a malicious executor can independently call filesystem/network APIs despite context permissions. The core validates only its own writes and declared outputs. Before attaching real tools, use an independently enforced restricted worker/capability boundary and a workspace that untrusted processes cannot mutate. Ancestor checks reduce accidental symlink/path escapes but do not eliminate adversarial filesystem races. Manifests are local trusted records, not signed attestations. Executor exception text is intentionally not persisted because it may contain credentials; a stable failure diagnostic is stored instead.

No changes were made to existing application modules, source Skills, templates, sites, `.env`, credentials or Git. The module remains disconnected from the live Feishu queue.
