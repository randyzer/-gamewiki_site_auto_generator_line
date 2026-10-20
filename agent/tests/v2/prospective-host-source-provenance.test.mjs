import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { contractDefinition, validateContract } from '../../src/contracts/registry.mjs';
import * as anchorDigest from '../../src/v2/production-host-source-anchor-digest.mjs';
import * as verifierRegistry from '../../src/v2/production-host-source-verifier-registry.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const stages = ['homepage-research', 'keyword-research', 'template-selection',
  'content-integration', 'ui-ux-audit', 'prelaunch-acceptance', 'deployment-plan'];

function sourceAnchor(section, overrides = {}) {
  const definition = verifierRegistry.hostSourceVerifierDefinition(section);
  const sourceReferences = definition.references.map((reference, index) => ({
    role: reference.role,
    relativePath: `host-sources/${section}/${reference.role}.json`,
    sha256: sha256(`${section}:${reference.role}`),
    byteLength: index + 1,
    sourceKind: reference.sourceKind,
    sourceVersion: reference.sourceVersion,
  }));
  const base = {
    kind: 'HOST_SOURCE_ANCHOR',
    schemaVersion: 1,
    producer: 'PRODUCTION_HOST_SOURCE_ANCHOR_V1',
    authorityScope: 'SOURCE_PROVENANCE_DESCRIPTOR_ONLY',
    section,
    verifierId: definition.verifierId,
    verifierVersion: definition.verifierVersion,
    runId: 'host-source-run',
    canonicalStageId: 'keyword-research',
    attemptId: 2,
    requestedOperation: 'keyword-research',
    mappingVersion: 'stage-identity-v1',
    allocationDigest: sha256('allocation'),
    capturePolicyDigest: sha256('capture-policy'),
    sourceReferences,
    ...overrides,
  };
  return { ...base, anchorDigest: anchorDigest.computeHostSourceAnchorDigest(base) };
}

test('all six fixed sections produce structurally verified closed Anchor descriptors', () => {
  assert.deepEqual(verifierRegistry.HOST_SOURCE_SECTIONS,
    ['identity', 'code', 'inputs', 'execution', 'research', 'site']);
  for (const section of verifierRegistry.HOST_SOURCE_SECTIONS) {
    const anchor = sourceAnchor(section);
    assert.equal(validateContract('HOST_SOURCE_ANCHOR', 1, anchor), anchor);
    assert.equal(anchorDigest.validateHostSourceAnchor(anchor), anchor);
    assert.equal(anchor.anchorDigest, anchorDigest.computeHostSourceAnchorDigest(anchor));
  }
  assert.equal(contractDefinition('HOST_SOURCE_ANCHOR', 1).producer,
    'PRODUCTION_HOST_SOURCE_ANCHOR_V1');
});

test('Anchor schema rejects missing, additional and unsupported-version fields', () => {
  const anchor = sourceAnchor('identity');
  const missing = { ...anchor };
  delete missing.capturePolicyDigest;
  assert.throws(() => validateContract('HOST_SOURCE_ANCHOR', 1, missing),
    error => error.code === 'CONTRACT_SCHEMA_INVALID');
  assert.throws(() => validateContract('HOST_SOURCE_ANCHOR', 1, { ...anchor, capability: true }),
    error => error.code === 'CONTRACT_SCHEMA_INVALID');
  assert.throws(() => contractDefinition('HOST_SOURCE_ANCHOR', 2),
    error => error.code === 'CONTRACT_VERSION_UNSUPPORTED');
});

test('fixed registry rejects Worker, Offline, Observation and caller verifier identities', () => {
  const anchor = sourceAnchor('identity');
  for (const verifierId of ['WORKER', 'OFFLINE_BINDER', 'PRODUCTION_OBSERVATION', 'CALLER_DEFINED']) {
    assert.throws(() => anchorDigest.validateHostSourceAnchor({ ...anchor, verifierId }),
      error => error.code === 'HOST_SOURCE_VERIFIER_INVALID', verifierId);
  }
  assert.throws(() => verifierRegistry.hostSourceVerifierDefinition('unknown'),
    error => error.code === 'HOST_SOURCE_SECTION_INVALID');
});

test('registry rejects missing, duplicate, cross-section and reordered roles', () => {
  const anchor = sourceAnchor('code');
  const missing = { ...anchor, sourceReferences: anchor.sourceReferences.slice(0, -1) };
  assert.throws(() => anchorDigest.validateHostSourceAnchor(missing),
    error => error.code === 'HOST_SOURCE_ROLE_INVALID');
  const duplicate = { ...anchor,
    sourceReferences: [...anchor.sourceReferences.slice(0, -1), {
      ...anchor.sourceReferences[0],
      relativePath: 'host-sources/code/duplicate-role.json',
      sha256: sha256('duplicate-role'),
    }] };
  assert.throws(() => anchorDigest.validateHostSourceAnchor(duplicate),
    error => error.code === 'HOST_SOURCE_ROLE_INVALID');
  const crossSection = { ...anchor, sourceReferences: anchor.sourceReferences.map((item, index) =>
    index === 0 ? { ...item, role: 'allocation-record' } : item) };
  assert.throws(() => anchorDigest.validateHostSourceAnchor(crossSection),
    error => error.code === 'HOST_SOURCE_ROLE_INVALID');
  const reordered = { ...anchor, sourceReferences: [...anchor.sourceReferences].reverse() };
  assert.throws(() => anchorDigest.validateHostSourceAnchor(reordered),
    error => error.code === 'HOST_SOURCE_ROLE_INVALID');
});

test('registry rejects source kind, version and strict path mismatches', () => {
  const anchor = sourceAnchor('execution');
  for (const change of [
    { sourceKind: 'CALLER_KIND' },
    { sourceVersion: 2 },
    { relativePath: '/absolute/evidence.json' },
    { relativePath: '../escape.json' },
    { relativePath: 'host-sources\\escape.json' },
    { relativePath: `host-sources/${'x'.repeat(1025)}` },
    { relativePath: 'host-sources/control\u0001.json' },
  ]) {
    const candidate = { ...anchor, sourceReferences: anchor.sourceReferences.map((item, index) =>
      index === 0 ? { ...item, ...change } : item) };
    assert.throws(() => anchorDigest.validateHostSourceAnchor(candidate),
      error => ['CONTRACT_PATH_INVALID', 'HOST_SOURCE_REFERENCE_INVALID'].includes(error.code),
    JSON.stringify(change));
  }
});

test('Anchor validation binds canonical operation and all six Allocation identity fields', () => {
  const anchor = sourceAnchor('research');
  assert.throws(() => anchorDigest.validateHostSourceAnchor({
    ...anchor, requestedOperation: stages[0],
  }), error => error.code === 'HOST_SOURCE_IDENTITY_MISMATCH');
  const expected = {
    runId: anchor.runId,
    canonicalStageId: anchor.canonicalStageId,
    attemptId: anchor.attemptId,
    requestedOperation: anchor.requestedOperation,
    mappingVersion: anchor.mappingVersion,
    allocationDigest: anchor.allocationDigest,
  };
  assert.equal(anchorDigest.validateHostSourceAnchor(anchor, expected), anchor);
  for (const [field, value] of [
    ['runId', 'other-run'],
    ['canonicalStageId', 'homepage-research'],
    ['attemptId', 3],
    ['requestedOperation', 'homepage-research'],
    ['mappingVersion', 'future-map'],
    ['allocationDigest', sha256('other-allocation')],
  ]) {
    assert.throws(() => anchorDigest.validateHostSourceAnchor(anchor, { ...expected, [field]: value }),
      error => error.code === 'HOST_SOURCE_IDENTITY_MISMATCH', field);
  }
});

test('Anchor digest covers every persisted field and canonicalizes object key order only', () => {
  const anchor = sourceAnchor('site');
  const reorderedObject = Object.fromEntries(Object.entries(anchor).reverse());
  assert.equal(anchorDigest.computeHostSourceAnchorDigest(reorderedObject), anchor.anchorDigest);
  const changed = { ...anchor, capturePolicyDigest: sha256('changed-policy') };
  assert.throws(() => anchorDigest.validateHostSourceAnchor(changed),
    error => error.code === 'HOST_SOURCE_DIGEST_MISMATCH');

  const code = sourceAnchor('code');
  const reorderedReferences = { ...code, sourceReferences: [...code.sourceReferences].reverse() };
  assert.throws(() => anchorDigest.computeHostSourceAnchorDigest(reorderedReferences),
    error => error.code === 'HOST_SOURCE_ROLE_INVALID');
});

test('D2b-1 exports no producer, store, publication or production trust API', () => {
  const forbidden = ['createProductionHostSourceAuthority', 'createTestHostSourceAuthority',
    'mintTrustedHostSourceAnchor', 'publishHostSourceAnchor', 'assertTrustedProductionHostSource'];
  for (const name of forbidden) {
    assert.equal(Object.hasOwn(anchorDigest, name), false, name);
    assert.equal(Object.hasOwn(verifierRegistry, name), false, name);
  }
  const anchor = sourceAnchor('inputs');
  assert.equal(Object.hasOwn(anchor, 'authoritative'), false);
  assert.equal(Object.hasOwn(anchor, 'capabilities'), false);
  assert.equal(Object.hasOwn(anchor, 'contextDigest'), false);
});
