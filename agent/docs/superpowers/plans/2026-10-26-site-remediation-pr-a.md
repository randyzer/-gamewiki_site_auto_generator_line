# Site Remediation PR-A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the versioned, pure site-acceptance contracts and validators approved for PR-A, without adding runtime orchestration or mutating any manifest or site.

**Architecture:** Two pure modules own the contract boundary. `site-acceptance-contract.mjs` validates immutable lineage, current baselines, acyclic acceptance identities, and authorization reservation/consumption records. `effective-publication-attestation.mjs` validates a non-self-referential publication evidence body and builds the final attestation envelope only after `acceptanceRevision` exists. Closed JSON schemas and canonical tagged digests make all records deterministic and fail closed.

**Tech Stack:** Node.js 22 ESM, `node:test`, strict JSON schemas through the existing contract registry, `canonicalJson`, `ContractError`, SHA256.

---

## Scope lock

PR-A may change only:

- `agent/src/site-acceptance-contract.mjs`
- `agent/src/effective-publication-attestation.mjs`
- `agent/src/contracts/registry.mjs`
- new JSON files under `agent/src/contracts/schemas/` named in Task 1
- `agent/tests/site-acceptance-contract.test.mjs`
- `agent/tests/effective-publication-attestation.test.mjs`
- this design and plan documentation

PR-A must not change `pipeline.mjs`, `terminal-run.mjs`, `cli.mjs`, any run manifest, the Wallpaper Engine site, workers, stage state, deployment code, DNS code, or indexing behavior.

## Stable public API

`site-acceptance-contract.mjs` exports:

```js
export const SITE_ACCEPTANCE_POLICY_VERSION = 'site-acceptance-v1';
export function canonicalContractDigest(tag, value) {}
export function createImmutableIntegrationLineage(input) {}
export function verifyImmutableIntegrationLineage(value) {}
export function createCurrentSiteBaseline(input) {}
export function verifyCurrentSiteBaseline(value) {}
export function createSiteAcceptanceIdentity(input) {}
export function verifySiteAcceptanceIdentity(value) {}
export function createSiteReacceptanceAuthorization(input) {}
export function verifySiteReacceptanceAuthorization(value) {}
export function createAuthorizationReservation(input) {}
export function verifyAuthorizationReservation(value) {}
export function createAuthorizationConsumption(input) {}
export function verifyAuthorizationConsumption(value) {}
```

`effective-publication-attestation.mjs` exports:

```js
export const PUBLICATION_POLICY_VERSION = 'effective-publication-v1';
export function createPublicationEvidenceBody(input) {}
export function verifyPublicationEvidenceBody(value) {}
export function createDerivedPublicationAttestation({ evidenceBody, acceptanceIdentity }) {}
export function verifyDerivedPublicationAttestation(value, { acceptanceIdentity }) {}
```

No factory receives filesystem paths to read, clocks, locks, manifests, workers, or network functions. All PR-A functions are deterministic over supplied JSON data.

### Task 1: Register closed versioned schemas

**Files:**

- Create: `agent/src/contracts/schemas/immutable-integration-lineage.v1.json`
- Create: `agent/src/contracts/schemas/current-site-baseline.v1.json`
- Create: `agent/src/contracts/schemas/site-acceptance-identity.v1.json`
- Create: `agent/src/contracts/schemas/site-reacceptance-authorization.v1.json`
- Create: `agent/src/contracts/schemas/site-reacceptance-authorization-reservation.v1.json`
- Create: `agent/src/contracts/schemas/site-reacceptance-authorization-consumption.v1.json`
- Create: `agent/src/contracts/schemas/publication-evidence-body.v1.json`
- Create: `agent/src/contracts/schemas/derived-publication-attestation.v1.json`
- Modify: `agent/src/contracts/registry.mjs:18-80`
- Create: `agent/tests/site-acceptance-contract.test.mjs`

- [ ] **Step 1: Write the failing registry test**

Create `agent/tests/site-acceptance-contract.test.mjs` with the registry contract list and closed-schema assertions:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { contractDefinition, validateContract } from '../src/contracts/registry.mjs';

const digest = character => character.repeat(64);
const contracts = [
  ['IMMUTABLE_INTEGRATION_LINEAGE', 1],
  ['CURRENT_SITE_BASELINE', 1],
  ['SITE_ACCEPTANCE_IDENTITY', 1],
  ['SITE_REACCEPTANCE_AUTHORIZATION', 1],
  ['SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION', 1],
  ['SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION', 1],
  ['PUBLICATION_EVIDENCE_BODY', 1],
  ['DERIVED_PUBLICATION_ATTESTATION', 1],
];

test('PR-A contracts are registered as closed versioned schemas', () => {
  for (const [kind, version] of contracts) {
    const definition = contractDefinition(kind, version);
    assert.equal(definition.kind, kind);
    assert.equal(definition.schema.additionalProperties, false);
  }
  assert.throws(() => validateContract('SITE_ACCEPTANCE_IDENTITY', 1, {
    kind: 'SITE_ACCEPTANCE_IDENTITY', schemaVersion: 1, unexpected: digest('a'),
  }), error => error.code === 'CONTRACT_SCHEMA_INVALID');
});
```

- [ ] **Step 2: Run the test and verify the registry rejects the unknown kinds**

Run from `agent/`:

```bash
node --test tests/site-acceptance-contract.test.mjs
```

Expected: FAIL with `CONTRACT_KIND_UNKNOWN` for `IMMUTABLE_INTEGRATION_LINEAGE`.

- [ ] **Step 3: Add exact closed schemas**

Every schema must contain `"additionalProperties": false`, exact `kind` and `schemaVersion` constants, and lowercase SHA256 formats. Use these required top-level fields:

```text
IMMUTABLE_INTEGRATION_LINEAGE_V1
  kind schemaVersion producer runId siteRevision manifestSequence manifestSha256
  researchHandoffSha256 researchApprovalDigest stage3CheckpointDigest
  stage3ArtifactDigests stage4CheckpointDigest stage4ArtifactDigests
  originalPublicationManifestSha256 originalLaunchReadinessBindingDigest
  finalizedTransactionDigest lineageDigest

CURRENT_SITE_BASELINE_V1
  kind schemaVersion producer baselineKind historicalEquivalence digestPolicyVersion
  projectPath files inventoryDigest projectDigest routes routeInventoryDigest
  protectedInputs protectedInputsDigest historicalEvidenceGaps baselineDigest

SITE_ACCEPTANCE_IDENTITY_V1
  kind schemaVersion producer policyVersion lineageDigest baselineDigest projectDigest
  publicationEvidenceDigest remediationScopeDigest transactionId acceptanceRevision

SITE_REACCEPTANCE_AUTHORIZATION_V1
  kind schemaVersion producer policyVersion runId previewId previewSnapshotSha256
  manifestSequence manifestSha256 mode lineageDigest oldProjectDigest newProjectDigest
  baselineDigest remediationScopeDigest publicationEvidenceDigest attestationDigest
  acceptanceRevision operatorSummarySha256 transactionId authorizationDigest

SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION_V1
  kind schemaVersion producer authorizationDigest previewId confirmationIdentity
  transactionId intentDigest reservedAtMs reservationDigest

SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION_V1
  kind schemaVersion producer reservationDigest transactionId preManifestSha256
  postManifestSha256 committedSequence acceptanceRevision committedObjectDigests
  consumedAtMs consumptionDigest

PUBLICATION_EVIDENCE_BODY_V1
  kind schemaVersion producer policyVersion originalPublicationManifestSha256
  lineageDigest researchHandoffSha256 researchApprovalDigest
  originalLaunchReadinessBindingDigest baselineKind baselineDigest
  remediationScopeDigest projectDigest observedRoutes routeInventoryDigest pages
  validationStatus validatorVersion

DERIVED_PUBLICATION_ATTESTATION_V1
  kind schemaVersion producer evidenceBody publicationEvidenceDigest
  acceptanceRevision attestationDigest
```

Nested schema requirements:

```json
{
  "file": {
    "type": "object",
    "additionalProperties": false,
    "required": ["path", "mode", "byteLength", "sha256"],
    "properties": {
      "path": { "type": "string", "format": "relative-posix-path" },
      "mode": { "type": "integer", "minimum": 0, "maximum": 4095 },
      "byteLength": { "type": "integer", "minimum": 0 },
      "sha256": { "type": "string", "format": "sha256" }
    }
  },
  "page": {
    "type": "object",
    "additionalProperties": false,
    "required": ["route", "originalDisposition", "effectiveDisposition", "materialStatus", "robots", "inSitemap", "inNavigation", "dynamicProof"],
    "properties": {
      "route": { "type": "string", "minLength": 1 },
      "originalDisposition": { "enum": ["PUBLISH", "DRAFT_ONLY", "OMIT"] },
      "effectiveDisposition": { "enum": ["PUBLISH", "DRAFT_ONLY", "OMIT"] },
      "materialStatus": { "enum": ["COMPLETED", "PARTIAL", "BLOCKED"] },
      "robots": { "enum": ["index", "noindex", "absent"] },
      "inSitemap": { "type": "boolean" },
      "inNavigation": { "type": "boolean" },
      "dynamicProof": { "enum": ["STATIC", "PROVEN", "UNPROVEN"] }
    }
  }
}
```

Use arrays with `uniqueItems: true`; constrain `baselineKind` to `VERIFIED_HISTORICAL_BASELINE` or `REACCEPTED_CURRENT_BASELINE`, authorization `mode` to `EXACT_REMEDIATION` or `LEGACY_CURRENT_BASELINE`, `validationStatus` to `VERIFIED`, and all timestamps/sequences to non-negative safe integers. `finalizedTransactionDigest` is `sha256|null`; `historicalEvidenceGaps` is an array of non-empty unique strings.

- [ ] **Step 4: Register the eight schemas**

Add these entries to `definitions` in `agent/src/contracts/registry.mjs`:

```js
  ['IMMUTABLE_INTEGRATION_LINEAGE:1', { kind: 'IMMUTABLE_INTEGRATION_LINEAGE', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', validator: 'CONTRACT_REGISTRY',
    schema: load('immutable-integration-lineage.v1.json') }],
  ['CURRENT_SITE_BASELINE:1', { kind: 'CURRENT_SITE_BASELINE', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', validator: 'CONTRACT_REGISTRY',
    schema: load('current-site-baseline.v1.json') }],
  ['SITE_ACCEPTANCE_IDENTITY:1', { kind: 'SITE_ACCEPTANCE_IDENTITY', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', validator: 'CONTRACT_REGISTRY',
    schema: load('site-acceptance-identity.v1.json') }],
  ['SITE_REACCEPTANCE_AUTHORIZATION:1', { kind: 'SITE_REACCEPTANCE_AUTHORIZATION', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', validator: 'CONTRACT_REGISTRY',
    schema: load('site-reacceptance-authorization.v1.json') }],
  ['SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION:1', { kind: 'SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', validator: 'CONTRACT_REGISTRY',
    schema: load('site-reacceptance-authorization-reservation.v1.json') }],
  ['SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION:1', { kind: 'SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', validator: 'CONTRACT_REGISTRY',
    schema: load('site-reacceptance-authorization-consumption.v1.json') }],
  ['PUBLICATION_EVIDENCE_BODY:1', { kind: 'PUBLICATION_EVIDENCE_BODY', schemaVersion: 1,
    producer: 'EFFECTIVE_PUBLICATION_ATTESTATION', validator: 'CONTRACT_REGISTRY',
    schema: load('publication-evidence-body.v1.json') }],
  ['DERIVED_PUBLICATION_ATTESTATION:1', { kind: 'DERIVED_PUBLICATION_ATTESTATION', schemaVersion: 1,
    producer: 'EFFECTIVE_PUBLICATION_ATTESTATION', validator: 'CONTRACT_REGISTRY',
    schema: load('derived-publication-attestation.v1.json') }],
```

- [ ] **Step 5: Run the registry test**

Run:

```bash
node --test tests/site-acceptance-contract.test.mjs
```

Expected: PASS for the registry test; no implementation modules exist yet.

- [ ] **Step 6: Commit the schema slice**

```bash
git add src/contracts/registry.mjs src/contracts/schemas/*.json tests/site-acceptance-contract.test.mjs
git commit -m "test(agent): register site acceptance contracts"
```

### Task 2: Implement acyclic lineage, baseline, and acceptance identities

**Files:**

- Create: `agent/src/site-acceptance-contract.mjs`
- Modify: `agent/tests/site-acceptance-contract.test.mjs`

- [ ] **Step 1: Add fixtures and failing identity tests**

Append fixtures with stable 64-character digests and these assertions:

```js
import {
  canonicalContractDigest,
  createCurrentSiteBaseline,
  createImmutableIntegrationLineage,
  createSiteAcceptanceIdentity,
  verifyCurrentSiteBaseline,
  verifyImmutableIntegrationLineage,
  verifySiteAcceptanceIdentity,
} from '../src/site-acceptance-contract.mjs';

const d = value => (value.repeat(64)).slice(0, 64);
const lineageInput = {
  runId: 'wallpaper-engine-002', siteRevision: 'v1', manifestSequence: 219,
  manifestSha256: d('a'), researchHandoffSha256: d('b'), researchApprovalDigest: d('c'),
  stage3CheckpointDigest: d('d'), stage3ArtifactDigests: [d('e')],
  stage4CheckpointDigest: d('f'), stage4ArtifactDigests: [d('1')],
  originalPublicationManifestSha256: d('2'), originalLaunchReadinessBindingDigest: d('3'),
  finalizedTransactionDigest: d('4'),
};
const baselineInput = {
  baselineKind: 'REACCEPTED_CURRENT_BASELINE', historicalEquivalence: false,
  digestPolicyVersion: 'project-content-v1', projectPath: '/site',
  files: [{ path: 'app/page.tsx', mode: 0o644, byteLength: 4, sha256: d('5') }],
  projectDigest: d('6'), routes: ['/'],
  protectedInputs: [{ path: 'backgroundinformation/keywords.md', mode: 0o400, byteLength: 4, sha256: d('7') }],
  historicalEvidenceGaps: ['FINAL_STAGE4_INVENTORY_UNAVAILABLE'],
};

test('lineage and baseline digests are canonical and independently verified', () => {
  const lineage = createImmutableIntegrationLineage(lineageInput);
  const reordered = createImmutableIntegrationLineage(Object.fromEntries(Object.entries(lineageInput).reverse()));
  assert.equal(lineage.lineageDigest, reordered.lineageDigest);
  assert.equal(verifyImmutableIntegrationLineage(lineage), lineage);
  const baseline = createCurrentSiteBaseline(baselineInput);
  assert.equal(verifyCurrentSiteBaseline(baseline), baseline);
  assert.throws(() => verifyCurrentSiteBaseline({ ...baseline, projectDigest: d('8') }),
    error => error.code === 'SITE_ACCEPTANCE_DIGEST_MISMATCH');
});

test('legacy baseline cannot claim historical equivalence', () => {
  assert.throws(() => createCurrentSiteBaseline({ ...baselineInput, historicalEquivalence: true }),
    error => error.code === 'SITE_ACCEPTANCE_LEGACY_EQUIVALENCE_INVALID');
});

test('acceptance identity binds stable preview transaction identity and publication evidence', () => {
  const lineage = createImmutableIntegrationLineage(lineageInput);
  const baseline = createCurrentSiteBaseline(baselineInput);
  const identity = createSiteAcceptanceIdentity({ lineageDigest: lineage.lineageDigest,
    baselineDigest: baseline.baselineDigest, projectDigest: baseline.projectDigest,
    publicationEvidenceDigest: d('9'), remediationScopeDigest: d('a'),
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111' });
  assert.equal(verifySiteAcceptanceIdentity(identity), identity);
  assert.throws(() => verifySiteAcceptanceIdentity({ ...identity, transactionId:
    'site-remediation-22222222-2222-4222-8222-222222222222' }),
  error => error.code === 'SITE_ACCEPTANCE_DIGEST_MISMATCH');
});

test('canonical digest rejects cycles before serialization', () => {
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => canonicalContractDigest('TEST', cyclic),
    error => error.code === 'SITE_ACCEPTANCE_CYCLE');
});
```

- [ ] **Step 2: Run the focused test and verify it fails on the missing module**

Run:

```bash
node --test tests/site-acceptance-contract.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `site-acceptance-contract.mjs`.

- [ ] **Step 3: Implement the canonical acyclic digest helper**

Create `agent/src/site-acceptance-contract.mjs` beginning with:

```js
import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from './contracts/canonical-json.mjs';
import { ContractError } from './contracts/errors.mjs';
import { validateContract } from './contracts/registry.mjs';

export const SITE_ACCEPTANCE_POLICY_VERSION = 'site-acceptance-v1';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const mismatch = message => new ContractError('SITE_ACCEPTANCE_DIGEST_MISMATCH', message);

function assertAcyclic(value, active = new WeakSet(), visited = new WeakSet()) {
  if (value === null || typeof value !== 'object') return;
  if (active.has(value)) throw new ContractError('SITE_ACCEPTANCE_CYCLE',
    'Contract values cannot contain circular object references');
  if (visited.has(value)) return;
  active.add(value);
  for (const child of Array.isArray(value) ? value : Object.values(value))
    assertAcyclic(child, active, visited);
  active.delete(value); visited.add(value);
}

export function canonicalContractDigest(tag, value) {
  if (typeof tag !== 'string' || !/^[A-Z0-9_]+_V1$/.test(tag))
    throw new ContractError('SITE_ACCEPTANCE_TAG_INVALID', 'Digest tag must be a V1 protocol tag');
  assertAcyclic(value);
  return sha256(`${tag}\n${canonicalJson(value)}`);
}

function verifyDigest(value, field, tag) {
  const { [field]: recorded, ...body } = value;
  if (canonicalContractDigest(tag, body) !== recorded) throw mismatch(`${field} mismatch`);
  return value;
}
```

- [ ] **Step 4: Implement lineage, baseline, and acceptance builders/verifiers**

Use sorted unique arrays before hashing and validate both before and after construction:

```js
const sortedUnique = (values, label) => {
  const output = [...values].sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b)));
  if (new Set(output.map(canonicalJson)).size !== output.length)
    throw new ContractError('SITE_ACCEPTANCE_DUPLICATE', `${label} contains duplicates`);
  return output;
};

export function createImmutableIntegrationLineage(input) {
  const body = { kind: 'IMMUTABLE_INTEGRATION_LINEAGE', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', ...structuredClone(input),
    stage3ArtifactDigests: sortedUnique(input.stage3ArtifactDigests, 'Stage 3 artifacts'),
    stage4ArtifactDigests: sortedUnique(input.stage4ArtifactDigests, 'Stage 4 artifacts') };
  const value = { ...body, lineageDigest: canonicalContractDigest('IMMUTABLE_INTEGRATION_LINEAGE_V1', body) };
  validateContract(value.kind, value.schemaVersion, value); return deepFreeze(value);
}

export function verifyImmutableIntegrationLineage(value) {
  validateContract('IMMUTABLE_INTEGRATION_LINEAGE', 1, value);
  verifyDigest(value, 'lineageDigest', 'IMMUTABLE_INTEGRATION_LINEAGE_V1');
  return value;
}

export function createCurrentSiteBaseline(input) {
  if (input.baselineKind === 'REACCEPTED_CURRENT_BASELINE' && input.historicalEquivalence !== false)
    throw new ContractError('SITE_ACCEPTANCE_LEGACY_EQUIVALENCE_INVALID',
      'A reaccepted current baseline cannot claim historical equivalence');
  const files = sortedUnique(input.files, 'files');
  const routes = sortedUnique(input.routes, 'routes');
  const protectedInputs = sortedUnique(input.protectedInputs, 'protected inputs');
  const historicalEvidenceGaps = sortedUnique(input.historicalEvidenceGaps, 'historical evidence gaps');
  const body = { kind: 'CURRENT_SITE_BASELINE', schemaVersion: 1, producer: 'SITE_ACCEPTANCE_CONTRACT',
    ...structuredClone(input), files,
    inventoryDigest: canonicalContractDigest('SITE_FILE_INVENTORY_V1', files), routes,
    routeInventoryDigest: canonicalContractDigest('SITE_ROUTE_INVENTORY_V1', routes), protectedInputs,
    protectedInputsDigest: canonicalContractDigest('SITE_PROTECTED_INPUTS_V1', protectedInputs),
    historicalEvidenceGaps };
  const value = { ...body, baselineDigest: canonicalContractDigest('CURRENT_SITE_BASELINE_V1', body) };
  validateContract(value.kind, value.schemaVersion, value); return deepFreeze(value);
}

export function verifyCurrentSiteBaseline(value) {
  validateContract('CURRENT_SITE_BASELINE', 1, value);
  if (value.baselineKind === 'REACCEPTED_CURRENT_BASELINE' && value.historicalEquivalence !== false)
    throw new ContractError('SITE_ACCEPTANCE_LEGACY_EQUIVALENCE_INVALID',
      'A reaccepted current baseline cannot claim historical equivalence');
  if (canonicalContractDigest('SITE_FILE_INVENTORY_V1', value.files) !== value.inventoryDigest ||
      canonicalContractDigest('SITE_ROUTE_INVENTORY_V1', value.routes) !== value.routeInventoryDigest ||
      canonicalContractDigest('SITE_PROTECTED_INPUTS_V1', value.protectedInputs) !== value.protectedInputsDigest)
    throw mismatch('Baseline component digest mismatch');
  verifyDigest(value, 'baselineDigest', 'CURRENT_SITE_BASELINE_V1'); return value;
}

export function createSiteAcceptanceIdentity(input) {
  const body = { kind: 'SITE_ACCEPTANCE_IDENTITY', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', policyVersion: SITE_ACCEPTANCE_POLICY_VERSION,
    ...structuredClone(input) };
  const value = { ...body, acceptanceRevision: canonicalContractDigest('SITE_ACCEPTANCE_IDENTITY_V1', body) };
  validateContract(value.kind, value.schemaVersion, value); return deepFreeze(value);
}

export function verifySiteAcceptanceIdentity(value) {
  validateContract('SITE_ACCEPTANCE_IDENTITY', 1, value);
  if (value.policyVersion !== SITE_ACCEPTANCE_POLICY_VERSION)
    throw new ContractError('SITE_ACCEPTANCE_POLICY_MISMATCH', 'Acceptance policy changed');
  verifyDigest(value, 'acceptanceRevision', 'SITE_ACCEPTANCE_IDENTITY_V1'); return value;
}
```

- [ ] **Step 5: Run the focused test**

Run:

```bash
node --test tests/site-acceptance-contract.test.mjs
```

Expected: all identity tests PASS.

- [ ] **Step 6: Commit the identity slice**

```bash
git add src/site-acceptance-contract.mjs tests/site-acceptance-contract.test.mjs
git commit -m "feat(agent): add site acceptance identities"
```

### Task 3: Implement authorization, reservation, and consumption contracts

**Files:**

- Modify: `agent/src/site-acceptance-contract.mjs`
- Modify: `agent/tests/site-acceptance-contract.test.mjs`

- [ ] **Step 1: Write failing authorization identity tests**

Append:

```js
import {
  createAuthorizationConsumption, createAuthorizationReservation,
  createSiteReacceptanceAuthorization, verifyAuthorizationConsumption,
  verifyAuthorizationReservation, verifySiteReacceptanceAuthorization,
} from '../src/site-acceptance-contract.mjs';

test('authorization fixes one preview-bound transaction identity', () => {
  const authorization = createSiteReacceptanceAuthorization({ runId: 'wallpaper-engine-002',
    previewId: '11111111-1111-4111-8111-111111111111', previewSnapshotSha256: d('1'),
    manifestSequence: 219, manifestSha256: d('2'), mode: 'LEGACY_CURRENT_BASELINE',
    lineageDigest: d('3'), oldProjectDigest: d('4'), newProjectDigest: d('5'), baselineDigest: d('6'),
    remediationScopeDigest: d('7'), publicationEvidenceDigest: d('8'), attestationDigest: d('9'),
    acceptanceRevision: d('a'), operatorSummarySha256: d('b'),
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111' });
  assert.equal(verifySiteReacceptanceAuthorization(authorization), authorization);
  const reservation = createAuthorizationReservation({ authorization,
    confirmationIdentity: 'preview-snapshot:11111111-1111-4111-8111-111111111111',
    intentDigest: d('c'), reservedAtMs: 1 });
  assert.equal(verifyAuthorizationReservation(reservation, { authorization }), reservation);
  const consumption = createAuthorizationConsumption({ authorization, reservation,
    preManifestSha256: d('2'), postManifestSha256: d('d'), committedSequence: 220,
    acceptanceRevision: authorization.acceptanceRevision,
    committedObjectDigests: [d('e'), d('f')], consumedAtMs: 2 });
  assert.equal(verifyAuthorizationConsumption(consumption, { authorization, reservation }), consumption);
});

test('reservation and consumption reject substituted transaction identities and replay', () => {
  const authorization = createSiteReacceptanceAuthorization({ runId: 'run',
    previewId: '11111111-1111-4111-8111-111111111111', previewSnapshotSha256: d('1'),
    manifestSequence: 1, manifestSha256: d('2'), mode: 'EXACT_REMEDIATION', lineageDigest: d('3'),
    oldProjectDigest: d('4'), newProjectDigest: d('5'), baselineDigest: d('6'),
    remediationScopeDigest: d('7'), publicationEvidenceDigest: d('8'), attestationDigest: d('9'),
    acceptanceRevision: d('a'), operatorSummarySha256: d('b'),
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111' });
  const reservation = createAuthorizationReservation({ authorization,
    confirmationIdentity: 'interactive-confirmation', intentDigest: d('c'), reservedAtMs: 1 });
  assert.throws(() => verifyAuthorizationReservation({ ...reservation,
    transactionId: 'site-remediation-22222222-2222-4222-8222-222222222222' }, { authorization }),
  error => error.code === 'SITE_ACCEPTANCE_TRANSACTION_MISMATCH');
  assert.throws(() => createAuthorizationConsumption({ authorization, reservation,
    preManifestSha256: authorization.manifestSha256, postManifestSha256: d('d'),
    committedSequence: authorization.manifestSequence + 2,
    acceptanceRevision: authorization.acceptanceRevision,
    committedObjectDigests: [d('e')], consumedAtMs: 2 }),
  error => error.code === 'SITE_ACCEPTANCE_TRANSACTION_MISMATCH');
});
```

- [ ] **Step 2: Run the focused test and confirm missing exports fail**

Run:

```bash
node --test tests/site-acceptance-contract.test.mjs
```

Expected: FAIL because the six authorization functions are not exported.

- [ ] **Step 3: Implement deterministic authorization and lifecycle records**

Append to `site-acceptance-contract.mjs`:

```js
export function createSiteReacceptanceAuthorization(input) {
  const body = { kind: 'SITE_REACCEPTANCE_AUTHORIZATION', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', policyVersion: SITE_ACCEPTANCE_POLICY_VERSION,
    ...structuredClone(input) };
  const value = { ...body, authorizationDigest:
    canonicalContractDigest('SITE_REACCEPTANCE_AUTHORIZATION_V1', body) };
  validateContract(value.kind, value.schemaVersion, value); return deepFreeze(value);
}

export function verifySiteReacceptanceAuthorization(value) {
  validateContract('SITE_REACCEPTANCE_AUTHORIZATION', 1, value);
  if (value.policyVersion !== SITE_ACCEPTANCE_POLICY_VERSION)
    throw new ContractError('SITE_ACCEPTANCE_POLICY_MISMATCH', 'Authorization policy changed');
  verifyDigest(value, 'authorizationDigest', 'SITE_REACCEPTANCE_AUTHORIZATION_V1'); return value;
}

export function createAuthorizationReservation({ authorization, confirmationIdentity,
  intentDigest, reservedAtMs }) {
  verifySiteReacceptanceAuthorization(authorization);
  const body = { kind: 'SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', authorizationDigest: authorization.authorizationDigest,
    previewId: authorization.previewId, confirmationIdentity,
    transactionId: authorization.transactionId, intentDigest, reservedAtMs };
  const value = { ...body, reservationDigest:
    canonicalContractDigest('SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION_V1', body) };
  validateContract(value.kind, value.schemaVersion, value); return deepFreeze(value);
}

export function verifyAuthorizationReservation(value, { authorization }) {
  verifySiteReacceptanceAuthorization(authorization);
  validateContract('SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION', 1, value);
  if (value.authorizationDigest !== authorization.authorizationDigest ||
      value.previewId !== authorization.previewId || value.transactionId !== authorization.transactionId)
    throw new ContractError('SITE_ACCEPTANCE_TRANSACTION_MISMATCH',
      'Reservation does not belong to the authorized transaction');
  verifyDigest(value, 'reservationDigest', 'SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION_V1'); return value;
}

export function createAuthorizationConsumption({ authorization, reservation, preManifestSha256,
  postManifestSha256, committedSequence, acceptanceRevision, committedObjectDigests, consumedAtMs }) {
  verifyAuthorizationReservation(reservation, { authorization });
  if (preManifestSha256 !== authorization.manifestSha256 ||
      committedSequence !== authorization.manifestSequence + 1 ||
      acceptanceRevision !== authorization.acceptanceRevision)
    throw new ContractError('SITE_ACCEPTANCE_TRANSACTION_MISMATCH',
      'Consumption does not match the authorized manifest transition');
  const body = { kind: 'SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', reservationDigest: reservation.reservationDigest,
    transactionId: reservation.transactionId, preManifestSha256, postManifestSha256,
    committedSequence, acceptanceRevision,
    committedObjectDigests: sortedUnique(committedObjectDigests, 'committed objects'), consumedAtMs };
  const value = { ...body, consumptionDigest:
    canonicalContractDigest('SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION_V1', body) };
  validateContract(value.kind, value.schemaVersion, value); return deepFreeze(value);
}

export function verifyAuthorizationConsumption(value, { authorization, reservation }) {
  verifyAuthorizationReservation(reservation, { authorization });
  validateContract('SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION', 1, value);
  if (value.reservationDigest !== reservation.reservationDigest ||
      value.transactionId !== authorization.transactionId ||
      value.preManifestSha256 !== authorization.manifestSha256 ||
      value.acceptanceRevision !== authorization.acceptanceRevision ||
      value.committedSequence !== authorization.manifestSequence + 1)
    throw new ContractError('SITE_ACCEPTANCE_TRANSACTION_MISMATCH',
      'Consumption does not match the reserved manifest transition');
  verifyDigest(value, 'consumptionDigest', 'SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION_V1'); return value;
}
```

- [ ] **Step 4: Run authorization tests**

Run:

```bash
node --test tests/site-acceptance-contract.test.mjs
```

Expected: PASS, including substituted transaction rejection.

- [ ] **Step 5: Commit the authorization slice**

```bash
git add src/site-acceptance-contract.mjs tests/site-acceptance-contract.test.mjs
git commit -m "feat(agent): add reacceptance authorization contracts"
```

### Task 4: Implement the non-circular effective publication attestation

**Files:**

- Create: `agent/src/effective-publication-attestation.mjs`
- Create: `agent/tests/effective-publication-attestation.test.mjs`

- [ ] **Step 1: Write failing evidence and narrowing-policy tests**

Create the test file:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSiteAcceptanceIdentity } from '../src/site-acceptance-contract.mjs';
import {
  createDerivedPublicationAttestation, createPublicationEvidenceBody,
  verifyDerivedPublicationAttestation, verifyPublicationEvidenceBody,
} from '../src/effective-publication-attestation.mjs';

const d = value => value.repeat(64).slice(0, 64);
const page = { route: '/', originalDisposition: 'PUBLISH', effectiveDisposition: 'PUBLISH',
  materialStatus: 'COMPLETED', robots: 'index', inSitemap: true, inNavigation: true,
  dynamicProof: 'STATIC' };
const evidenceInput = { originalPublicationManifestSha256: d('1'), lineageDigest: d('2'),
  researchHandoffSha256: d('3'), researchApprovalDigest: d('4'),
  originalLaunchReadinessBindingDigest: d('5'), baselineKind: 'REACCEPTED_CURRENT_BASELINE',
  baselineDigest: d('6'), remediationScopeDigest: d('7'), projectDigest: d('8'),
  observedRoutes: ['/'], pages: [page], validationStatus: 'VERIFIED', validatorVersion: 'host-route-v1' };

test('publication evidence digest precedes acceptance revision and final attestation', () => {
  const evidenceBody = createPublicationEvidenceBody(evidenceInput);
  assert.equal(verifyPublicationEvidenceBody(evidenceBody), evidenceBody);
  assert.equal(Object.hasOwn(evidenceBody, 'acceptanceRevision'), false);
  assert.equal(Object.hasOwn(evidenceBody, 'attestationDigest'), false);
  const identity = createSiteAcceptanceIdentity({ lineageDigest: evidenceBody.lineageDigest,
    baselineDigest: evidenceBody.baselineDigest, projectDigest: evidenceBody.projectDigest,
    publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
    remediationScopeDigest: evidenceBody.remediationScopeDigest,
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111' });
  const attestation = createDerivedPublicationAttestation({ evidenceBody, acceptanceIdentity: identity });
  assert.equal(verifyDerivedPublicationAttestation(attestation, { acceptanceIdentity: identity }), attestation);
});

test('effective policy may narrow but never widen original rights', () => {
  const narrowed = createPublicationEvidenceBody({ ...evidenceInput,
    pages: [{ ...page, effectiveDisposition: 'DRAFT_ONLY', materialStatus: 'PARTIAL',
      robots: 'noindex', inSitemap: false, inNavigation: false }] });
  assert.equal(narrowed.pages[0].effectiveDisposition, 'DRAFT_ONLY');
  assert.throws(() => createPublicationEvidenceBody({ ...evidenceInput,
    pages: [{ ...page, originalDisposition: 'DRAFT_ONLY', effectiveDisposition: 'PUBLISH',
      materialStatus: 'PARTIAL' }] }), error => error.code === 'PUBLICATION_RIGHTS_WIDENED');
});

test('draft, blocked, unproven and self-referential evidence fails closed', () => {
  assert.throws(() => createPublicationEvidenceBody({ ...evidenceInput,
    pages: [{ ...page, originalDisposition: 'DRAFT_ONLY', effectiveDisposition: 'DRAFT_ONLY',
      materialStatus: 'PARTIAL', robots: 'index' }] }), error => error.code === 'PUBLICATION_POLICY_INVALID');
  assert.throws(() => createPublicationEvidenceBody({ ...evidenceInput,
    pages: [{ ...page, originalDisposition: 'OMIT', effectiveDisposition: 'OMIT',
      materialStatus: 'BLOCKED', inNavigation: true }] }), error => error.code === 'PUBLICATION_POLICY_INVALID');
  assert.throws(() => createPublicationEvidenceBody({ ...evidenceInput,
    pages: [{ ...page, dynamicProof: 'UNPROVEN' }] }), error => error.code === 'PUBLICATION_POLICY_INVALID');
  assert.throws(() => createPublicationEvidenceBody({ ...evidenceInput,
    acceptanceRevision: d('9') }), error => error.code === 'PUBLICATION_EVIDENCE_SELF_REFERENCE');
});
```

- [ ] **Step 2: Run the focused test and verify the module is missing**

Run:

```bash
node --test tests/effective-publication-attestation.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the evidence body and policy validator**

Create `agent/src/effective-publication-attestation.mjs`:

```js
import { deepFreeze } from './contracts/canonical-json.mjs';
import { ContractError } from './contracts/errors.mjs';
import { validateContract } from './contracts/registry.mjs';
import { canonicalContractDigest, verifySiteAcceptanceIdentity } from './site-acceptance-contract.mjs';

export const PUBLICATION_POLICY_VERSION = 'effective-publication-v1';
const rank = new Map([['OMIT', 0], ['DRAFT_ONLY', 1], ['PUBLISH', 2]]);
const selfFields = ['acceptanceRevision', 'attestationDigest', 'publicationEvidenceDigest', 'evidenceBody'];

function verifyPage(page) {
  if (rank.get(page.effectiveDisposition) > rank.get(page.originalDisposition))
    throw new ContractError('PUBLICATION_RIGHTS_WIDENED', 'Effective publication rights exceed Stage 4');
  if (page.dynamicProof === 'UNPROVEN')
    throw new ContractError('PUBLICATION_POLICY_INVALID', 'Unproven routes cannot be accepted');
  if (page.effectiveDisposition === 'PUBLISH' &&
      (page.materialStatus !== 'COMPLETED' || page.robots !== 'index'))
    throw new ContractError('PUBLICATION_POLICY_INVALID', 'Published routes require completed indexed material');
  if (page.effectiveDisposition === 'DRAFT_ONLY' &&
      (page.materialStatus !== 'PARTIAL' || page.robots !== 'noindex' || page.inSitemap || page.inNavigation))
    throw new ContractError('PUBLICATION_POLICY_INVALID', 'Draft routes must stay noindex and undiscoverable');
  if (page.effectiveDisposition === 'OMIT' && (page.inSitemap || page.inNavigation))
    throw new ContractError('PUBLICATION_POLICY_INVALID', 'Omitted routes cannot be exposed');
}

export function createPublicationEvidenceBody(input) {
  if (selfFields.some(field => Object.hasOwn(input, field)))
    throw new ContractError('PUBLICATION_EVIDENCE_SELF_REFERENCE',
      'Publication evidence body cannot contain derived identity fields');
  const observedRoutes = [...input.observedRoutes].sort();
  const pages = input.pages.map(item => structuredClone(item))
    .sort((left, right) => left.route.localeCompare(right.route));
  pages.forEach(verifyPage);
  if (new Set(observedRoutes).size !== observedRoutes.length ||
      new Set(pages.map(item => item.route)).size !== pages.length)
    throw new ContractError('PUBLICATION_ROUTE_DUPLICATE', 'Observed publication routes must be unique');
  const body = { kind: 'PUBLICATION_EVIDENCE_BODY', schemaVersion: 1,
    producer: 'EFFECTIVE_PUBLICATION_ATTESTATION', policyVersion: PUBLICATION_POLICY_VERSION,
    ...structuredClone(input), observedRoutes,
    routeInventoryDigest: canonicalContractDigest('EFFECTIVE_ROUTE_INVENTORY_V1', observedRoutes), pages };
  const value = { ...body, publicationEvidenceDigest:
    canonicalContractDigest('PUBLICATION_EVIDENCE_BODY_V1', body) };
  validateContract(value.kind, value.schemaVersion, value); return deepFreeze(value);
}

export function verifyPublicationEvidenceBody(value) {
  validateContract('PUBLICATION_EVIDENCE_BODY', 1, value);
  if (value.policyVersion !== PUBLICATION_POLICY_VERSION)
    throw new ContractError('PUBLICATION_POLICY_INVALID', 'Publication policy version changed');
  value.pages.forEach(verifyPage);
  const { publicationEvidenceDigest, ...body } = value;
  if (canonicalContractDigest('PUBLICATION_EVIDENCE_BODY_V1', body) !== publicationEvidenceDigest)
    throw new ContractError('PUBLICATION_EVIDENCE_DIGEST_MISMATCH', 'Publication evidence digest changed');
  return value;
}
```

- [ ] **Step 4: Implement the final non-circular attestation envelope**

Append:

```js
export function createDerivedPublicationAttestation({ evidenceBody, acceptanceIdentity }) {
  verifyPublicationEvidenceBody(evidenceBody); verifySiteAcceptanceIdentity(acceptanceIdentity);
  if (acceptanceIdentity.publicationEvidenceDigest !== evidenceBody.publicationEvidenceDigest ||
      acceptanceIdentity.lineageDigest !== evidenceBody.lineageDigest ||
      acceptanceIdentity.baselineDigest !== evidenceBody.baselineDigest ||
      acceptanceIdentity.projectDigest !== evidenceBody.projectDigest ||
      acceptanceIdentity.remediationScopeDigest !== evidenceBody.remediationScopeDigest)
    throw new ContractError('PUBLICATION_ACCEPTANCE_BINDING_MISMATCH',
      'Acceptance identity does not bind this publication evidence');
  const envelope = { kind: 'DERIVED_PUBLICATION_ATTESTATION', schemaVersion: 1,
    producer: 'EFFECTIVE_PUBLICATION_ATTESTATION', evidenceBody: structuredClone(evidenceBody),
    publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
    acceptanceRevision: acceptanceIdentity.acceptanceRevision };
  const value = { ...envelope, attestationDigest:
    canonicalContractDigest('DERIVED_PUBLICATION_ATTESTATION_V1', envelope) };
  validateContract(value.kind, value.schemaVersion, value); return deepFreeze(value);
}

export function verifyDerivedPublicationAttestation(value, { acceptanceIdentity }) {
  validateContract('DERIVED_PUBLICATION_ATTESTATION', 1, value);
  verifyPublicationEvidenceBody(value.evidenceBody); verifySiteAcceptanceIdentity(acceptanceIdentity);
  if (value.publicationEvidenceDigest !== value.evidenceBody.publicationEvidenceDigest ||
      value.acceptanceRevision !== acceptanceIdentity.acceptanceRevision ||
      acceptanceIdentity.publicationEvidenceDigest !== value.publicationEvidenceDigest)
    throw new ContractError('PUBLICATION_ACCEPTANCE_BINDING_MISMATCH',
      'Derived attestation is stale or belongs to another acceptance');
  const { attestationDigest, ...envelope } = value;
  if (canonicalContractDigest('DERIVED_PUBLICATION_ATTESTATION_V1', envelope) !== attestationDigest)
    throw new ContractError('PUBLICATION_ATTESTATION_DIGEST_MISMATCH', 'Attestation digest changed');
  return value;
}
```

- [ ] **Step 5: Run both focused suites**

Run:

```bash
node --test tests/site-acceptance-contract.test.mjs tests/effective-publication-attestation.test.mjs
```

Expected: all PR-A focused tests PASS.

- [ ] **Step 6: Commit the publication slice**

```bash
git add src/effective-publication-attestation.mjs tests/effective-publication-attestation.test.mjs
git commit -m "feat(agent): add effective publication attestation"
```

### Task 5: Complete negative compatibility coverage

**Files:**

- Modify: `agent/tests/site-acceptance-contract.test.mjs`
- Modify: `agent/tests/effective-publication-attestation.test.mjs`

- [ ] **Step 1: Add exact mutation-table tests**

Add table-driven tests that mutate one field at a time and require the named error family:

```js
for (const [field, changed] of [
  ['lineageDigest', d('1')], ['baselineDigest', d('2')], ['projectDigest', d('3')],
  ['publicationEvidenceDigest', d('4')], ['remediationScopeDigest', d('5')],
]) {
  test(`acceptance rejects changed ${field}`, () => {
    const identity = createSiteAcceptanceIdentity(validAcceptanceInput());
    assert.throws(() => verifySiteAcceptanceIdentity({ ...identity, [field]: changed }),
      error => error.code === 'SITE_ACCEPTANCE_DIGEST_MISMATCH');
  });
}
```

Add an explicit attestation binding case:

```js
assert.throws(() => verifyDerivedPublicationAttestation(
  { ...attestation, publicationEvidenceDigest: d('f') }, { acceptanceIdentity: identity }),
error => ['PUBLICATION_ACCEPTANCE_BINDING_MISMATCH', 'CONTRACT_SCHEMA_INVALID'].includes(error.code));
```

- [ ] **Step 2: Run focused tests after adding the complete negative matrix**

Run:

```bash
node --test tests/site-acceptance-contract.test.mjs tests/effective-publication-attestation.test.mjs
```

Expected: PASS. The consumption-builder mismatch was already introduced red-first in Task 3, so Task 5 only broadens regression coverage.

- [ ] **Step 3: Run focused tests again after any minimal assertion-only correction**

Run:

```bash
node --test tests/site-acceptance-contract.test.mjs tests/effective-publication-attestation.test.mjs
```

Expected: all focused tests PASS.

- [ ] **Step 4: Commit negative coverage**

```bash
git add src/site-acceptance-contract.mjs tests/site-acceptance-contract.test.mjs tests/effective-publication-attestation.test.mjs
git commit -m "test(agent): harden site acceptance contracts"
```

### Task 6: Verify PR-A and prepare immutable review evidence

**Files:**

- No implementation files added beyond the scope lock.
- Read-only verification of protected files under `agent/runs/wallpaper-engine-002/`.

- [ ] **Step 1: Run focused tests**

Run from `agent/`:

```bash
node --test tests/site-acceptance-contract.test.mjs tests/effective-publication-attestation.test.mjs tests/p4-contracts.test.mjs tests/p4-publication.test.mjs
```

Expected: all focused and compatibility tests PASS.

- [ ] **Step 2: Run the full Agent regression suite**

Run:

```bash
npm test
```

Expected: exit code `0`; record the exact passed/failed counts without summarizing truncated output as independent evidence.

- [ ] **Step 3: Verify formatting and exact changed-file scope**

Run from the repository root:

```bash
git diff --check 0830b58...HEAD
git diff --name-only 0830b58...HEAD
git status --short --branch
```

Expected:

- `git diff --check` prints nothing;
- changed files are limited to the scope-lock list;
- worktree is clean after the final commit.

- [ ] **Step 4: Verify protected Wallpaper Engine evidence is unchanged**

Resolve the protected keyword copy from the manifest and record both hashes without editing files:

```bash
node - <<'NODE'
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const manifestPath = 'runs/wallpaper-engine-002/manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const keywordPath = manifest.inputCopies?.rawKeywordsFile?.copyPath;
if (!keywordPath || !fs.existsSync(keywordPath)) throw new Error('Protected keyword copy is missing');
for (const path of [manifestPath, keywordPath]) {
  const digest = createHash('sha256').update(fs.readFileSync(path)).digest('hex');
  console.log(`${digest}  ${path}`);
}
if (createHash('sha256').update(fs.readFileSync(keywordPath)).digest('hex') !==
    manifest.inputCopies.rawKeywordsFile.sha256) throw new Error('Protected keyword hash mismatch');
NODE
```

Any missing file or digest mismatch stops PR-A review.

- [ ] **Step 5: Record immutable Git identities**

Run:

```bash
git rev-parse 0830b58^{commit}
git rev-parse HEAD^{commit}
git rev-parse HEAD^{tree}
git status --porcelain=v1
```

Expected: full base/head/tree SHAs and empty porcelain output.

- [ ] **Step 6: Submit iteration 6 for independent review**

Build the C2C review message from the exact command outputs; do not leave placeholders or ask the user to copy it. It must state these fields with their concrete values:

```text
STATE: EXECUTED
TASK_ID: c2c_wallpaper002
ITERATION: 6
SCOPE: PR-A only
BASE_SHA: git rev-parse 0830b58^{commit} output
HEAD_SHA: git rev-parse HEAD^{commit} output
HEAD_TREE: git rev-parse HEAD^{tree} output
FOCUSED_TESTS: exact node --test result
FULL_SUITE: exact npm test result
CHANGED_FILES: exact git diff --name-only output
PROTECTED_HASHES: exact read-only hash verification result
MERGE_REQUESTED: false
DEPLOYMENT_REQUESTED: false
```

Stop after review. PR-A merge requires a separate exact-HEAD authorization.

## Self-review checklist

- Every PR-A requirement in the approved design maps to Tasks 1-5.
- The digest graph is acyclic: evidence body, evidence digest, acceptance identity, then final attestation.
- The transaction ID is generated before operator authorization and remains identical across authorization, reservation, and consumption.
- PR-A models lifecycle records but does not execute preview, reservation, consumption, recovery, or manifest mutation.
- Legacy reacceptance cannot claim historical equivalence.
- Publication rights can only remain equal or narrow.
- No task modifies runtime orchestration, historical runs, the site, deployment, DNS, or indexing.
