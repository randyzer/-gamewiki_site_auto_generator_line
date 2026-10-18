import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  replayTemplateSelection,
  templateReplayPayloadDigest,
} from '../../src/v2/adapters/template-selection.mjs';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const fixturePath = join(repoRoot, 'agent/tests/fixtures/v2/template/fixture-manifest.json');
const sha = value => value.repeat(64);

async function fixture() {
  return JSON.parse(await readFile(fixturePath, 'utf8'));
}

function adapterInput(payloadDigest, overrides = {}) {
  return {
    kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE',
    runId: 'p5-d-offline-template', canonicalStageId: 'template-selection',
    mappingVersion: 'stage-identity-v1', contextDigest: sha('c'), featureGate: 'shadow',
    gateBindingDigest: sha('d'), payloadDigest, ...overrides,
  };
}

test('template stub validates repo, copy universe, residue, destination and an immutable non-authoritative lock', async () => {
  const fixtureManifest = await fixture();
  const input = adapterInput(templateReplayPayloadDigest({ fixtureManifest }));
  const replay = replayTemplateSelection({ adapterInput: input, fixtureManifest });

  assert.equal(fixtureManifest.classification, 'OFFLINE_STUB');
  assert.equal(fixtureManifest.sourceVerified, false);
  assert.equal(fixtureManifest.copyExecuted, false);
  assert.equal(fixtureManifest.templateLockAuthoritative, false);
  assert.equal(replay.stageResult.status, 'PARTIAL');
  assert.equal(replay.stageResult.authoritative, false);
  assert.deepEqual(replay.stageResult.errorCodes, ['TEMPLATE_REAL_EXECUTION_UNPROVEN']);
  assert.equal(replay.templateLock.repository, fixtureManifest.repository.url);
  assert.equal(replay.templateLock.commit, fixtureManifest.repository.commit);
  assert.equal(replay.templateLock.contextDigest, input.contextDigest);
  assert.equal(replay.templateLock.authoritative, false);
  assert.equal(replay.templateLock.copyExecuted, false);
});

test('template stub fails closed on source, manifest, residue, boundary and lock drift', async () => {
  const fixtureManifest = await fixture();
  const mutations = [
    { ...fixtureManifest, repository: { ...fixtureManifest.repository, commit: 'abc' } },
    { ...fixtureManifest, copyManifest: { ...fixtureManifest.copyManifest,
      files: [...fixtureManifest.copyManifest.files, fixtureManifest.copyManifest.files[0]] } },
    { ...fixtureManifest, residueScan: { ...fixtureManifest.residueScan,
      matches: [{ token: 'old-game', path: 'README.md' }] } },
    { ...fixtureManifest, destination: { ...fixtureManifest.destination, relativePath: '../escape' } },
    { ...fixtureManifest, templateTreeDigest: sha('0') },
    { ...fixtureManifest, sourceVerified: true },
    { ...fixtureManifest, copyExecuted: true },
    { ...fixtureManifest, templateLockAuthoritative: true },
  ];
  for (const changed of mutations) {
    assert.throws(() => replayTemplateSelection({ fixtureManifest: changed,
      adapterInput: adapterInput(templateReplayPayloadDigest({ fixtureManifest: changed })) }),
    error => ['CONTRACT_SCHEMA_INVALID', 'CONTRACT_BINDING_MISMATCH',
      'TEMPLATE_RESIDUE_FOUND', 'TEMPLATE_DESTINATION_INVALID'].includes(error.code));
  }
  const input = adapterInput(templateReplayPayloadDigest({ fixtureManifest }));
  assert.throws(() => replayTemplateSelection({ fixtureManifest, adapterInput: { ...input,
    canonicalStageId: 'homepage-research' } }), error => error.code === 'CONTRACT_BINDING_MISMATCH');
});

test('template offline policy rejects every real capability before effects run', async () => {
  const fixtureManifest = await fixture();
  const input = adapterInput(templateReplayPayloadDigest({ fixtureManifest }));
  let effects = 0;
  for (const capability of ['BROWSER', 'GIT_READ', 'GIT_WRITE', 'FILE_COPY', 'FILE_MERGE', 'WORKER',
    'NETWORK', 'SERVICE_RESUME', 'DEPLOYMENT', 'AUTHORITY_SWITCH']) {
    assert.throws(() => replayTemplateSelection({ fixtureManifest, adapterInput: input,
      requestedCapabilities: [capability], effects: { execute: () => { effects += 1; } } }),
    error => error.code === 'POLICY_DENIED');
  }
  assert.equal(effects, 0);
});
