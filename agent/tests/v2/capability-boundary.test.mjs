import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digest } from '../state-helpers.mjs';
import { validateContract } from '../../src/contracts/registry.mjs';
import { createArtifactAuthority } from '../../src/v2/artifact-authority.mjs';
import { createTestHostCapabilityRegistry } from '../../src/v2/host/capability-registry.mjs';
import { createOfflineApprovedStageCommitCandidate,
  createStageCommitCandidate } from '../../src/state/stage-commit-candidate.mjs';
import { candidateInput, stageState } from '../state-helpers.mjs';

test('transaction contracts are strict and accept only core canonical stages', () => {
  const base = {
    kind: 'TRANSACTION_INTENT', schemaVersion: 1, producer: 'V2_TRANSACTION_COORDINATOR',
    operationId: `op-${'a'.repeat(32)}`, mode: 'SIMULATED', mappingVersion: 'stage-identity-v1',
    policyVersion: 'p4-shadow-v1',
    runId: 'run-v2', canonicalStageId: 'keyword-research', attemptId: 1,
    contextDigest: digest('context'), schemaBundleDigest: digest('schemas'),
    purposeDigest: digest('purpose'), candidateDigest: digest('candidate'),
    approvalId: 'approval-11111111-1111-4111-8111-111111111111',
    approvalDigest: digest('approval'), createdAtMs: 1, intentDigest: digest('intent'),
  };
  assert.throws(() => validateContract('TRANSACTION_INTENT', 1, { ...base, extra: true }),
    error => error.code === 'CONTRACT_SCHEMA_INVALID');
  assert.throws(() => validateContract('TRANSACTION_INTENT', 1,
    { ...base, canonicalStageId: 'advertising-plan' }), error => error.code === 'CONTRACT_SCHEMA_INVALID');
});

test('host capability registry grants exact offline capabilities and rejects production', () => {
  const registry = createTestHostCapabilityRegistry();
  const capability = registry.issue({ capability: 'OFFLINE_TRANSACTION', mode: 'SIMULATED',
    rootDirectory: '/tmp/offline-root' });
  assert.equal(registry.assert(capability, { capability: 'OFFLINE_TRANSACTION', mode: 'SIMULATED',
    rootDirectory: '/tmp/offline-root' }).mode, 'SIMULATED');
  assert.throws(() => registry.issue({ capability: 'DEPLOYMENT', mode: 'PRODUCTION',
    rootDirectory: '/tmp/offline-root' }), error => error.code === 'POLICY_DENIED');
  assert.throws(() => registry.assert({ ...capability }, { capability: 'OFFLINE_TRANSACTION',
    mode: 'SIMULATED', rootDirectory: '/tmp/offline-root' }), error => error.code === 'HOST_CAPABILITY_UNTRUSTED');
});

test('artifact authority verifies bytes and exact run/stage/attempt binding', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p5b-artifact-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'artifacts'), { recursive: true });
  const bytes = Buffer.from('immutable artifact\n');
  await writeFile(join(root, 'artifacts/result.txt'), bytes);
  const authority = createArtifactAuthority({ rootDirectory: root });
  const reference = authority.reference({ path: 'artifacts/result.txt', sha256: digest(bytes),
    byteLength: bytes.length, runId: 'run-v2', canonicalStageId: 'keyword-research', attemptId: 1 });
  await authority.verify(reference, { runId: 'run-v2', canonicalStageId: 'keyword-research', attemptId: 1 });
  await assert.rejects(authority.verify(reference, { runId: 'other', canonicalStageId: 'keyword-research', attemptId: 1 }),
    error => error.code === 'CONTRACT_BINDING_MISMATCH');
  await writeFile(join(root, 'artifacts/result.txt'), 'tampered');
  await assert.rejects(authority.verify(reference, { runId: 'run-v2', canonicalStageId: 'keyword-research', attemptId: 1 }),
    error => error.code === 'CONTRACT_DIGEST_MISMATCH');
  await writeFile(join(root, 'real.txt'), bytes);
  await symlink(join(root, 'real.txt'), join(root, 'artifacts/link.txt'));
  const linked = authority.reference({ ...reference, path: 'artifacts/link.txt' });
  await assert.rejects(authority.verify(linked,
    { runId: 'run-v2', canonicalStageId: 'keyword-research', attemptId: 1 }),
  error => error.code === 'STATE_STORAGE_SYMLINK');
});

test('legacy APPROVED remains rejected while the exact offline capability allows V2 candidate creation', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p5b-candidate-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = await candidateInput(root, { stageId: 'keyword-research',
    state: stageState({ gate: 'APPROVED' }) });
  await assert.rejects(createStageCommitCandidate(input), error => error.code === 'STATE_APPROVAL_ENGINE_UNAVAILABLE');
  const registry = createTestHostCapabilityRegistry();
  const capability = registry.issue({ capability: 'OFFLINE_APPROVED_CANDIDATE', mode: 'SIMULATED',
    rootDirectory: root });
  const candidate = await createOfflineApprovedStageCommitCandidate({ ...input,
    operationId: `op-${'b'.repeat(32)}`, canonicalStageId: 'keyword-research',
    purposeDigest: digest('purpose'), policyVersion: 'p4-shadow-v1',
    approvalId: 'approval-11111111-1111-4111-8111-111111111111',
    approvalDigest: input.state.gate.approvalDigest }, { capabilityRegistry: registry, capability, rootDirectory: root });
  assert.equal(candidate.schemaVersion, 2);
  assert.equal(candidate.operationId, `op-${'b'.repeat(32)}`);
});
