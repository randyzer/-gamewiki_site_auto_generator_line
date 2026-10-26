# Site remediation acceptance design

Status: proposed architecture, approved by the operator for final independent review. No runtime behavior is implemented by this document.

## 1. Goal and non-goals

The Agent needs a controlled way to accept a repaired site after Stage 4 without rewriting the immutable research and integration history. The operation must let Stage 5 through Stage 7 validate the repaired project while Stage 2 remains `PARTIAL`, Stage 3 and Stage 4 remain historically `PASSED`, and all stale downstream evidence is invalidated.

This design does not:

- change the meaning of `siteRevision`;
- rerun the Stage 2 or Stage 4 worker;
- promote `PARTIAL` research to `PASSED` or `PUBLISH`;
- modify historical Stage 2, Stage 3, or Stage 4 artifacts;
- prove that the current Wallpaper Engine tree is byte-equivalent to the missing historical Stage 4 final tree;
- authorize deployment, repository push, DNS changes, or indexing.

## 2. Architecture decision

Use a dual-identity model.

- `siteRevision` remains the immutable Stage 2 and Stage 4 integration identity.
- `acceptanceRevision` identifies the exact physical project and effective publication evidence accepted for Stage 5 through Stage 7.

A normal `siteRevision` update retains the existing fail-closed invalidation behavior. Site remediation is a distinct preview-and-confirm operation; it is not another spelling of `updateUserInputs({ siteRevision })`.

The rejected alternatives are:

1. Starting a new run from the current site, because it repeats verified work and breaks the 002 evidence lineage.
2. Rewriting the historical `siteRevision` or Stage 4 artifacts, because that manufactures provenance and invalidates existing approval identities.

## 3. Identity model

### 3.1 Immutable upstream identity

`IMMUTABLE_INTEGRATION_LINEAGE_V1` contains:

- `runId`
- original `siteRevision`
- manifest sequence and manifest SHA256 observed at preview
- Stage 2 research handoff SHA256 and its approval/confirmation identity
- Stage 3 checkpoint identity and accepted artifact digests
- Stage 4 checkpoint identity and accepted artifact digests
- original route-publication manifest SHA256
- original Stage 4 launch-readiness binding digest
- original Stage 4 finalized transaction identity, when available

The verifier reads these values from the current manifest and immutable artifacts. Callers cannot supply substitutes.

### 3.2 Current baseline identity

`CURRENT_SITE_BASELINE_V1` contains:

- `kind`: `CURRENT_SITE_BASELINE_V1`
- `baselineKind`: `VERIFIED_HISTORICAL_BASELINE` or `REACCEPTED_CURRENT_BASELINE`
- `historicalEquivalence`: boolean
- `digestPolicyVersion`
- `projectPath`
- sorted file inventory entries containing relative path, file mode, byte length, and SHA256
- `inventoryDigest`
- `projectDigest`
- observed route inventory and `routeInventoryDigest`
- protected research input inventory and `protectedInputsDigest`
- explicit historical evidence gaps

The fixed digest policy excludes only reviewed generated and transient paths. Symlinks, unsafe paths, unreviewed exclusions, secrets, and files outside the configured project fail closed.

For legacy `wallpaper-engine-002`, only `REACCEPTED_CURRENT_BASELINE` is permitted, `historicalEquivalence` is always `false`, and the missing final Stage 4 inventory is recorded as a permanent evidence gap.

### 3.3 Derived publication evidence

`DERIVED_PUBLICATION_ATTESTATION_V1` contains:

- original route-publication manifest SHA256
- immutable integration lineage digest
- Stage 2 research handoff and approval identity
- original Stage 4 launch-readiness binding digest
- baseline kind and baseline digest
- remediation scope digest
- `acceptanceRevision`
- current `projectDigest`
- independently observed route inventory and digest
- per-route effective disposition: `PUBLISH`, `DRAFT_ONLY`, or `OMIT`
- publication-policy validation result and validator version
- attestation digest

The derived attestation can preserve or narrow original publication rights. It cannot widen them. It rejects:

- `PARTIAL` content promoted to `PUBLISH`;
- `BLOCKED` content exposed by a source file or route;
- draft routes without required `noindex`;
- drafts in sitemap, public navigation, or public internal links;
- unprovable dynamic or catch-all routes;
- conflicting canonical or hreflang behavior;
- public routes not justified by the immutable Stage 4 publication policy.

The original Stage 4 route-publication artifact remains immutable.

### 3.4 Acceptance identity

`acceptanceRevision` is the SHA256 of canonical `SITE_ACCEPTANCE_IDENTITY_V1` containing:

- immutable integration lineage digest
- current baseline digest
- current `projectDigest`
- derived publication-attestation digest
- remediation scope digest
- acceptance policy version

It is content-addressed integrity, not authorization. Every new Stage 5, Stage 6, Stage 7 artifact, approval, assessment, and deployment-plan digest must bind this `acceptanceRevision` and the current `projectDigest`.

## 4. Authorization model

Authorization and hashing are separate concepts.

- SHA256 fields prove that reviewed bytes and identities have not changed.
- Operator authorization is the explicit, once-only consumption of the existing preview/confirmation flow.
- A confirmation code is an anti-mistake mechanism, not a digital signature and not proof of historical provenance.
- The current production approval verifier is unavailable and must not be represented as active.

`SITE_REACCEPTANCE_AUTHORIZATION_V1` binds:

- `runId`
- preview ID and preview snapshot SHA256
- preview manifest sequence and SHA256
- authorization mode: `EXACT_REMEDIATION` or `LEGACY_CURRENT_BASELINE`
- immutable integration lineage digest
- old and new project digests
- baseline digest
- remediation scope digest
- derived publication-attestation digest
- proposed `acceptanceRevision`
- operator-facing summary SHA256
- once-only preview-consumption identity

The local operator authorizes the current baseline as the input to new Stage 5 through Stage 7 validation. For legacy 002, the summary must state that historical equivalence is not proven and that the action creates a new trust boundary.

The authorization cannot approve deployment, research promotion, service resumption, or a wider file scope.

## 5. Effective downstream evidence

`EFFECTIVE_SITE_ACCEPTANCE_V1` is a versioned compatibility envelope consumed by Host Stage 5, Stage 6, and Stage 7 logic.

It contains:

- immutable `siteRevision` lineage;
- original Stage 4 route-publication and readiness digests as provenance only;
- current `acceptanceRevision` and `projectDigest`;
- current baseline and remediation receipt digests;
- derived publication-attestation digest;
- current launch-readiness status and unresolved blocker identities.

The compatibility resolver has two paths:

1. **Ordinary path:** no remediation receipt exists. Existing Stage 4 verification remains unchanged, and an effective acceptance envelope is derived from the already accepted Stage 4 identity without changing behavior.
2. **Remediated path:** a committed remediation receipt exists. The resolver verifies both the immutable lineage and current derived evidence, then exposes the current `acceptanceRevision` to downstream stages.

Existing strict Stage 4 verifiers continue to verify the original `siteRevision`. They do not receive aliases and do not accept `acceptanceRevision` in its place.

Stage 5 records the current `acceptanceRevision` and `projectDigest` in its checkpoint. Stage 6 rejects a Stage 5 report that binds a different identity. Stage 7 binds its non-executing plan to the same acceptance identity and to the current Stage 6 assessment.

Launch-readiness is reevaluated for the current acceptance. The original Stage 4 binding is provenance, not authorization for the repaired site. Until all current blockers receive independently valid clearance:

- `launchReadiness` is `NOT_CLEARED`;
- `deploymentExecuted` remains `false`;
- indexing remains disabled;
- historical blockers remain traceable.

## 6. Remediation scope

The preview computes an exact, sorted change inventory. Each entry contains path, old state, new state, old SHA256 when available, new SHA256, mode, byte length, and change type.

`EXACT_REMEDIATION` requires a verified historical baseline and permits only the reviewed changes between that baseline and the current tree.

`LEGACY_CURRENT_BASELINE` is limited to one controlled reacceptance when the historical final inventory is unavailable. It inventories the complete current tree rather than pretending to calculate an exact historical diff. It additionally requires:

- full Host build, type, test, route, SEO, accessibility, navigation, and publication-policy validation;
- independent review of every exposed route;
- explicit operator acknowledgement of the historical evidence gap;
- a baseline receipt that becomes the source for future exact remediation.

Generated or transient exclusions are controlled by a versioned allowlist. Any scope expansion after preview makes the preview stale.

## 7. State machine and validation order

States:

```text
PREVIEWED -> CONFIRMING -> COMMITTED
                 |-> STALE
                 |-> REJECTED
                 `-> RECOVERY_REQUIRED
```

### 7.1 Preview

Preview is strictly read-only. It:

1. verifies run identity and `deploymentExecuted=false`;
2. reads manifest sequence and SHA256;
3. verifies immutable Stage 2, Stage 3, and Stage 4 evidence;
4. verifies all protected input hashes;
5. inventories the current project under the fixed digest policy;
6. determines baseline mode and records historical gaps;
7. runs Host-only route and publication-policy validation;
8. computes the exact scope, baseline, derived attestation, and proposed `acceptanceRevision`;
9. writes only an immutable preview snapshot outside the manifest transaction;
10. emits an operator summary and one-time confirmation code.

Preview creation does not change the manifest, stages, checkpoints, site, or historical artifacts.

### 7.2 Confirmation

Confirmation:

1. acquires the durable exclusive run lock;
2. loads and verifies the immutable preview snapshot;
3. verifies one-time confirmation and consumes it for this operation;
4. recomputes manifest SHA256, project inventory, project digest, protected inputs, scope, route inventory, and derived publication evidence;
5. verifies all immutable upstream artifact hashes again;
6. rejects any stale approval, changed input, scope expansion, publication-policy widening, or concurrent state change;
7. writes a durable transaction intent;
8. writes immutable baseline, attestation, and authorization-consumption objects;
9. atomically commits one manifest transition and then writes the immutable receipt;
10. releases the lock without advancing a worker.

On success:

- Stage 1 is unchanged;
- Stage 2 remains `PARTIAL` and its handoff remains unchanged;
- Stage 3 remains `PASSED`;
- Stage 4 remains historically `PASSED`;
- Stage 5, Stage 6, and Stage 7 become `NOT_STARTED`;
- old attempts remain in history;
- stale Stage 5 through Stage 7 approvals, assessments, plan digests, and authorization bindings are cleared;
- a committed acceptance overlay references the new receipt and `acceptanceRevision`.

No Stage 2 or Stage 4 worker is invoked.

### 7.3 Failure transitions

- `STALE`: manifest, project, protected input, upstream evidence, or preview-bound scope changed. No manifest mutation.
- `REJECTED`: identity, policy, authorization, path safety, or publication validation failed. No manifest mutation.
- `RECOVERY_REQUIRED`: a durable transaction intent exists and the process stopped around the commit point. Normal retry is blocked until recovery verifies the exact transaction identity.

## 8. Atomicity, replay, recovery, and rollback

The implementation reuses the existing durable run lock, atomic-file primitives, immutable object storage, preview snapshot consumption, and finalized-reconciliation transaction patterns.

Required durable objects are:

- preview snapshot;
- transaction intent;
- immutable current baseline;
- immutable derived publication attestation;
- immutable authorization-consumption record;
- committed remediation receipt.

Receipt creation alone is never treated as a commit. Recovery compares intent, pre/post manifest SHA256, object digests, and receipt identity:

- unchanged pre-state resumes or safely rejects;
- exact post-state plus missing receipt completes the same receipt idempotently;
- exact committed receipt returns the existing result;
- every mixed or conflicting state becomes `RECOVERY_REQUIRED` and requires manual review.

Rollback before the manifest commit deletes only uncommitted temporary files. After commit, rollback is a new explicitly approved transaction; historical records are never deleted or rewritten.

## 9. Module boundaries

The implementation plan may refine names, but it must preserve these responsibilities:

- new `site-acceptance-contract.mjs`: schemas, canonical identities, baseline and acceptance verification;
- new `site-remediation.mjs`: preview, confirmation, transaction and recovery orchestration;
- new `effective-publication-attestation.mjs`: derived publication verification and compatibility envelope;
- `pipeline.mjs`: resolve effective acceptance, invalidate only Stage 5 through Stage 7, and bind downstream checkpoints;
- `terminal-run.mjs` and `cli.mjs`: expose preview/confirm/recover commands without silently routing through normal `siteRevision` updates;
- `route-publication.mjs`: retain strict original verification and add an explicit effective-attestation consumer;
- `stage4-launch-gap-policy.mjs`: retain original binding verification and add current-acceptance readiness contracts;
- contract registry/schema files: register only the versioned records required by this design;
- focused unit, transaction, Pipeline, and legacy-002 rehearsal tests.

The implementation must reuse existing primitives instead of creating another runner, lock system, hash format, or deployment path.

## 10. Delivery sequence

### PR-A: contracts and pure validators

- schemas and canonical digest builders;
- immutable-lineage, baseline, acceptance, and derived-publication validation;
- legacy evidence-gap representation;
- pure tests only; no runtime mutation.

### PR-B: transaction lifecycle

- read-only preview;
- confirmation consumption and exclusive lock;
- atomic commit, stale detection, recovery, idempotency, and replay protection;
- Stage 5 through Stage 7 invalidation logic.

### PR-C: Host integration

- effective-acceptance resolver;
- Stage 5, Stage 6, and Stage 7 identity propagation;
- current route/SEO/publication validation;
- current launch-readiness reevaluation;
- ordinary-path compatibility tests.

### PR-D: legacy Wallpaper Engine 002 rehearsal

- verify surviving immutable evidence;
- generate a complete current-tree inventory;
- produce a `LEGACY_CURRENT_BASELINE` preview;
- obtain explicit operator authorization;
- commit the reacceptance transaction;
- run real Stage 5 and Stage 6;
- regenerate a non-executing Stage 7 plan;
- keep deployment, push, DNS, service resumption, and indexing disabled.

Each PR requires independent review of its exact base, head, tree, changed-file list, tests, risks, and rollback. No later PR starts before the preceding contract is merged and its post-merge identity is verified.

## 11. Mandatory acceptance tests

1. Normal `siteRevision` update behavior is unchanged.
2. Preview is read-only.
3. Exact valid confirmation commits once.
4. Stale manifest, project digest, protected input, or approval is rejected.
5. Modified Stage 4 artifacts are rejected.
6. Scope expansion and unsafe path entries are rejected.
7. Concurrent confirmation is rejected.
8. Crash recovery is deterministic and idempotent.
9. `PARTIAL` remains `PARTIAL`.
10. Publication rights cannot be widened.
11. `BLOCKED` content and unindexed drafts cannot become public.
12. Legacy historical evidence gaps remain explicit.
13. Stage 1 through Stage 4 remain unchanged; only Stage 5 through Stage 7 reset.
14. All new downstream evidence binds `acceptanceRevision` and current `projectDigest`.
15. Old Stage 5, Stage 6, or Stage 7 approval cannot authorize the repaired project.
16. Original Stage 4 publication and readiness artifacts remain immutable.
17. No Stage 2 or Stage 4 worker runs.
18. No deployment, repository push, DNS change, service resume, or indexing side effect occurs.

## 12. Stop conditions

Stop without mutation when any of the following occurs:

- protected research hash mismatch;
- historical artifact mismatch;
- unreviewed scope expansion;
- missing or ambiguous baseline evidence outside the explicit legacy mode;
- operator authorization does not bind the exact preview;
- new public content is outside the original publication disposition;
- unresolved transaction identity or mixed commit state;
- request to reinterpret current validation as proof of historical equivalence;
- request to deploy before current Stage 6 and Stage 7 acceptance.
