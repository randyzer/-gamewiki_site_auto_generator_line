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

Publication evidence uses two digest layers so that no identity depends on itself.

`PUBLICATION_EVIDENCE_BODY_V1` contains:

- original route-publication manifest SHA256
- immutable integration lineage digest
- Stage 2 research handoff and approval identity
- original Stage 4 launch-readiness binding digest
- baseline kind and baseline digest
- remediation scope digest
- current `projectDigest`
- independently observed route inventory and digest
- per-route effective disposition: `PUBLISH`, `DRAFT_ONLY`, or `OMIT`
- a Host observation digest covering route inventory, public internal links, and source-file exposure
- per-route public-link and source-file-exposure observations
- indexing authorization: `NOT_CLEARED` or `CLEARED`
- publication-policy validation result and validator version

`publicationEvidenceDigest` is the SHA256 of the canonical publication evidence body. The body does not contain `acceptanceRevision`, `publicationEvidenceDigest`, `attestationDigest`, or any envelope that contains one of those fields.

The derived attestation can preserve or narrow original publication rights. It cannot widen them. It rejects:

- `PARTIAL` content promoted to `PUBLISH`;
- `BLOCKED` content exposed by a source file or route;
- draft routes without required `noindex`;
- drafts in sitemap, public navigation, or public internal links;
- unprovable dynamic or catch-all routes;
- conflicting canonical or hreflang behavior;
- public routes not justified by the immutable Stage 4 publication policy.

`PUBLISH` means that verified content is eligible to be public; it does not authorize search-engine indexing. A publish-eligible route may remain `noindex`. `robots=index` is valid only when the separately verified indexing authorization is `CLEARED`; legacy 002 remains `NOT_CLEARED`. The pure validator verifies the closed evidence contract and the Host observation digest reference. It does not independently recreate browser observations or claim publication safety without that Host-produced evidence.

The original Stage 4 route-publication artifact remains immutable.

### 3.4 Acceptance identity

`acceptanceRevision` is the SHA256 of canonical `SITE_ACCEPTANCE_IDENTITY_V1` containing:

- immutable integration lineage digest
- current baseline digest
- current `projectDigest`
- `publicationEvidenceDigest`
- remediation scope digest
- acceptance policy version

After computing `acceptanceRevision`, the Host constructs `DERIVED_PUBLICATION_ATTESTATION_V1` containing:

- the complete `PUBLICATION_EVIDENCE_BODY_V1`;
- `publicationEvidenceDigest`;
- `acceptanceRevision`;
- `attestationDigest`, computed over the canonical envelope without `attestationDigest`.

Verification independently recomputes the body digest, recomputes `acceptanceRevision` from the body digest and other acceptance fields, then recomputes the final envelope digest. A schema or builder that introduces a self-referential field or a dependency cycle is invalid. In this design, a requirement that acceptance bind the effective publication evidence means the non-self-referential `publicationEvidenceDigest`; the final envelope digest is downstream evidence and is not an input to `acceptanceRevision`.

`acceptanceRevision` is content-addressed integrity, not authorization. Every new Stage 5, Stage 6, Stage 7 artifact, approval, assessment, and deployment-plan digest must bind this `acceptanceRevision`, the current `projectDigest`, and the final `attestationDigest`.

## 4. Authorization model

Authorization and hashing are separate concepts.

- SHA256 fields prove that reviewed bytes and identities have not changed.
- Operator authorization is the explicit, once-only consumption of the existing preview/confirmation flow.
- A confirmation code is an anti-mistake mechanism, not a digital signature and not proof of historical provenance.
- The current production approval verifier is unavailable and must not be represented as active.

`SITE_REACCEPTANCE_AUTHORIZATION_V1` binds:

- contract kind, schema version, and authorization policy version
- `runId`
- preview ID and preview snapshot SHA256
- preview manifest sequence and SHA256
- authorization mode: `EXACT_REMEDIATION` or `LEGACY_CURRENT_BASELINE`
- immutable integration lineage digest
- old and new project digests
- baseline digest
- remediation scope digest
- publication evidence digest and final derived publication-attestation digest
- proposed `acceptanceRevision`
- operator-facing summary SHA256
- proposed transaction ID and once-only preview authorization identity

The local operator authorizes the current baseline as the input to new Stage 5 through Stage 7 validation. For legacy 002, the summary must state that historical equivalence is not proven and that the action creates a new trust boundary.

The durable authorization lifecycle uses two separate immutable records:

- `SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION_V1`: preview identity, confirmation identity, transaction ID, authorization body digest, intent digest, reserved-at time, and reservation digest.
- `SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION_V1`: reservation digest, transaction ID, exact pre/post manifest SHA256, committed sequence, `acceptanceRevision`, committed object digests, consumed-at time, and consumption digest.

The pure consumption verifier also requires an explicit trusted expected post-state supplied by the future PR-B transaction layer: post-manifest SHA256, committed sequence, `acceptanceRevision`, and the canonical committed-object digest set. It rejects a missing, incomplete, or mismatched expected post-state. This PR-A verifier proves that a consumption record matches trusted transaction expectations; it does not by itself discover or authorize the committed state.

Both schemas use exact-key validation and canonical serialization. A reservation may have only one matching consumption. Neither record claims an authenticated human identity: it proves that the local interactive operator confirmed the exact preview in this run. A future production approval adapter may provide stronger identity, but it is outside this design and cannot be simulated by a hash.

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
PREVIEWED -> CONFIRMING -> RESERVED -> CONSUMED -> COMMITTED
                 |            |           |-> RECOVERY_REQUIRED
                 |            |-> ABORTED
                 |-> STALE
                 `-> REJECTED
```

`RESERVED` prevents another transaction from using the same operator confirmation but is not authorization consumption. `CONSUMED` means the exact accepted manifest transition has crossed its durable commit point. `COMMITTED` means the matching consumption record and final receipt are both durable and verified.

### 7.1 Preview

Preview is strictly read-only. It:

1. verifies run identity and `deploymentExecuted=false`;
2. reads manifest sequence and SHA256;
3. verifies immutable Stage 2, Stage 3, and Stage 4 evidence;
4. verifies all protected input hashes;
5. inventories the current project under the fixed digest policy;
6. determines baseline mode and records historical gaps;
7. runs Host-only route and publication-policy validation;
8. computes the exact scope and baseline, canonical publication evidence body and digest, proposed `acceptanceRevision`, and final derived attestation;
9. writes only an immutable preview snapshot outside the manifest transaction;
10. emits an operator summary and one-time confirmation code.

Preview creation does not change the manifest, stages, checkpoints, site, or historical artifacts.

### 7.2 Confirmation

Confirmation:

1. acquires the durable exclusive run lock;
2. loads and verifies the immutable preview snapshot;
3. verifies that the operator confirmation matches the preview and is neither reserved nor consumed, without consuming it;
4. recomputes manifest SHA256, project inventory, project digest, protected inputs, scope, route inventory, publication evidence body and digest, `acceptanceRevision`, and final derived attestation;
5. verifies all immutable upstream artifact hashes again;
6. rejects any stale confirmation, changed input, scope expansion, publication-policy widening, or concurrent state change before creating a reservation;
7. creates a unique transaction ID and durably writes a transaction intent containing the verified pre-state, proposed post-state, and all object digests;
8. atomically creates a `RESERVED` authorization record bound to the preview, confirmation identity, and transaction ID; a reservation for another transaction is rejected;
9. writes and verifies the immutable baseline, publication evidence, final attestation, and proposed post-manifest objects;
10. atomically commits the exact post-manifest transition; this manifest commit is the durable authorization-consumption commit point;
11. writes a once-only `CONSUMED` record binding the reservation, transaction ID, pre/post manifest SHA256, committed sequence, `acceptanceRevision`, and committed object digests;
12. writes the immutable receipt and marks the operation `COMMITTED`;
13. releases the lock without advancing a worker.

No stale or rejected pre-reservation validation consumes or reserves authorization. After reservation, only the same transaction ID may proceed. A crash before the manifest commit leaves authorization `RESERVED`, not `CONSUMED`; exact recovery may resume that transaction, while stale recovery writes an `ABORTED` tombstone and requires a new preview and confirmation. A crash after the manifest commit deterministically completes the single matching consumption record and receipt. It never creates or accepts a second authorization.

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

- `STALE`: manifest, project, protected input, upstream evidence, or preview-bound scope changed before reservation. No manifest mutation or authorization consumption.
- `REJECTED`: identity, policy, authorization, path safety, or publication validation failed before reservation. No manifest mutation or authorization consumption.
- `ABORTED`: a reserved transaction can no longer commit because its exact pre-state changed. The reservation is tombstoned, cannot be consumed or reused, and a new preview is required.
- `RECOVERY_REQUIRED`: a durable transaction intent or reservation exists and the process stopped around the commit point. Normal retry is blocked until recovery verifies the exact transaction identity.

## 8. Atomicity, replay, recovery, and rollback

The implementation reuses the existing durable run lock, atomic-file primitives, immutable object storage, preview snapshot consumption, and finalized-reconciliation transaction patterns.

Required durable objects are:

- preview snapshot;
- transaction intent;
- authorization reservation or abort tombstone;
- immutable current baseline;
- immutable publication evidence body;
- immutable derived publication attestation;
- immutable authorization-consumption record;
- committed remediation receipt.

Receipt creation alone is never treated as a commit. Recovery compares the transaction ID, intent, reservation, pre/post manifest SHA256, committed sequence, object digests, consumption, and receipt identity:

- exact pre-state plus a matching reservation resumes only the same transaction;
- changed pre-state before manifest commit writes an `ABORTED` tombstone and requires new authorization;
- exact post-manifest state plus a missing consumption or receipt completes those records for the same transaction idempotently;
- exact `CONSUMED` state plus a missing receipt completes only the matching receipt;
- exact committed receipt returns the existing result without a second consumption;
- every mixed or conflicting state becomes `RECOVERY_REQUIRED` and requires manual review.

The authorization record is considered consumed only when the exact post-manifest SHA256 and sequence named by its transaction are durable. A reservation is never reported as consumed or committed. Canonical serialization and digest construction are pure and acyclic; validators reject unknown fields, non-canonical order, self-references, and digest dependency cycles.

Rollback before reservation deletes only uncommitted temporary files. After reservation but before the manifest commit, recovery preserves the reservation and either resumes the same transaction or writes an `ABORTED` tombstone; it never silently releases the confirmation for reuse. After commit, rollback is a new explicitly approved transaction; historical records are never deleted or rewritten.

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
19. Publication evidence, acceptance identity, and final attestation digests are deterministic under canonical serialization.
20. Self-referential fields and circular digest dependencies are rejected.
21. Failed or stale validation before reservation neither reserves nor consumes authorization.
22. A crash before intent persistence leaves no transaction or authorization state.
23. A crash after reservation can resume only the same transaction ID or end in an `ABORTED` tombstone.
24. A crash before manifest commit never reports authorization as consumed.
25. A crash after manifest commit completes exactly one consumption and receipt idempotently.
26. Duplicate confirmation and stale preview replay cannot create a second reservation, consumption, or commit.

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
