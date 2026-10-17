import test from 'node:test';
import assert from 'node:assert/strict';
import { executionContextDigest, purposeContextDigest } from '../src/contracts/context-digest.mjs';

const context = () => ({
  kind: 'EXECUTION_CONTEXT', schemaVersion: 1,
  runId: 'run-1', stageId: 'keyword-research', attemptId: 10, requestedOperation: 'retry',
  code: { sourceCommit: 'a'.repeat(40), workspaceDigest: 'b'.repeat(64),
    skillLockDigest: 'c'.repeat(64), schemaBundleDigest: 'd'.repeat(64),
    policyVersion: 1, featureGate: 'shadow' },
  inputs: [{ path: 'inputs/raw-keywords.md', sha256: 'e'.repeat(64), kind: 'RAW_KEYWORDS', lineageDigest: null }],
  execution: { permissionProfile: 'keyword-research', budget: 44, timeoutMs: 600000,
    hostCapabilities: ['serper'] },
  research: { evidencePlanDigest: 'f'.repeat(64), recoveryDigest: '1'.repeat(64),
    serviceDecisions: [{ service: 'youtube-subtitles', decision: 'PAUSED' }], targetPlatforms: ['steam'] },
  site: { siteRevision: null, domain: null, baselineDigest: null },
});

test('execution digest is deterministic across object key insertion order', () => {
  const value = context();
  const reordered = Object.fromEntries(Object.entries(value).reverse());
  assert.equal(executionContextDigest(value), executionContextDigest(reordered));
});

test('protected context changes and purpose domains cannot reuse digests', () => {
  const value = context();
  assert.notEqual(executionContextDigest(value), executionContextDigest({
    ...value, research: { ...value.research, recoveryDigest: '2'.repeat(64) },
  }));
  const digest = executionContextDigest(value);
  assert.notEqual(
    purposeContextDigest(digest, 'RUN_EXECUTION', { operation: 'retry' }),
    purposeContextDigest(digest, 'SERVICE_RESUME', { service: 'youtube-subtitles' }),
  );
});

test('context validation rejects path aliases and schema version drift', () => {
  const value = context();
  assert.throws(() => executionContextDigest({ ...value,
    inputs: [{ ...value.inputs[0], path: 'inputs/../raw-keywords.md' }],
  }), error => error.code === 'CONTRACT_PATH_INVALID');
  assert.throws(() => executionContextDigest({ ...value, schemaVersion: 2 }), error =>
    error.code === 'CONTRACT_VERSION_UNSUPPORTED');
});

test('purpose digest accepts only approval purposes registered by the architecture contract', () => {
  const digest = executionContextDigest(context());
  assert.match(purposeContextDigest(digest, 'PARTIAL_HANDOFF', { handoffDigest: 'a'.repeat(64) }),
    /^[a-f0-9]{64}$/);
  assert.throws(() => purposeContextDigest(digest, 'ARBITRARY_PURPOSE', {}), error =>
    error.code === 'CONTRACT_PURPOSE_UNKNOWN' && error.purpose === 'ARBITRARY_PURPOSE');
});
