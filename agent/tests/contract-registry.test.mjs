import test from 'node:test';
import assert from 'node:assert/strict';
import { contractDefinition, contractRegistry, validateContract } from '../src/contracts/registry.mjs';

const material = {
  kind: 'KEYWORD_MATERIAL', schemaVersion: 1, producer: 'ADAPTER',
  keyword: 'Example guide', status: 'PARTIAL', contractStatus: 'VALID',
  unresolvedGaps: [{ id: 'gap-' + 'a'.repeat(24), description: 'Missing official fact.', sourceSyntax: 'skill-v1' }],
  reviewNotes: [], unclassifiedItems: [],
  source: { path: 'materials/Example guide素材.md', sha256: 'b'.repeat(64),
    adapter: 'keyword-skill-v1', skillContractSha256: 'c'.repeat(64) },
  diagnostics: [],
};

test('registry exposes one versioned definition and validator per contract', () => {
  assert.equal(contractDefinition('KEYWORD_MATERIAL', 1).schema.$id, 'KEYWORD_MATERIAL_V1');
  assert.deepEqual(validateContract('KEYWORD_MATERIAL', 1, material), material);
  assert.equal(Object.isFrozen(contractRegistry), true);
  assert.equal(Object.isFrozen(contractDefinition('KEYWORD_MATERIAL', 1).schema.properties), true);
  assert.throws(() => {
    contractDefinition('KEYWORD_MATERIAL', 1).schema.properties.keyword.minLength = 0;
  }, TypeError);
});

test('registry rejects unknown versions, fields and unsafe protocol paths', () => {
  assert.throws(() => contractDefinition('KEYWORD_MATERIAL', 9), error =>
    error.code === 'CONTRACT_VERSION_UNSUPPORTED');
  assert.throws(() => validateContract('KEYWORD_MATERIAL', 1, { ...material, unexpected: true }), error =>
    error.code === 'CONTRACT_SCHEMA_INVALID' && error.pointer === '/unexpected');
  assert.throws(() => validateContract('KEYWORD_MATERIAL', 1, {
    ...material, source: { ...material.source, path: '../escape.md' },
  }), error => error.code === 'CONTRACT_PATH_INVALID' && error.pointer === '/source/path');
});

test('schema integer validation rejects unsafe integers and negative zero', () => {
  const base = {
    kind: 'EXECUTION_CONTEXT', schemaVersion: 1, runId: 'run', stageId: 'stage', attemptId: 1,
    requestedOperation: 'run', code: { sourceCommit: 'a'.repeat(40), workspaceDigest: 'b'.repeat(64),
      skillLockDigest: 'c'.repeat(64), schemaBundleDigest: 'd'.repeat(64), policyVersion: 1,
      featureGate: 'shadow' },
    inputs: [{ path: 'input.md', sha256: 'e'.repeat(64), kind: 'INPUT', lineageDigest: null }],
    execution: { permissionProfile: 'test', budget: 0, timeoutMs: 1, hostCapabilities: [] },
    research: { evidencePlanDigest: null, recoveryDigest: null, serviceDecisions: [], targetPlatforms: [] },
    site: { siteRevision: null, domain: null, baselineDigest: null },
  };
  for (const attemptId of [-0, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateContract('EXECUTION_CONTEXT', 1, { ...base, attemptId }), error =>
      error.code === 'CONTRACT_SCHEMA_INVALID' && error.pointer === '/attemptId');
  }
});
