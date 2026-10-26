import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createSiteReacceptanceAuthorization } from '../src/site-acceptance-contract.mjs';
import {
  createSiteRemediationController,
  OFFLINE_SITE_REMEDIATION_CAPABILITY,
  verifyCommittedSiteRemediation,
} from '../src/site-remediation-transaction.mjs';
import { ALL_STAGES, STAGE } from '../src/stages.mjs';

const d = character => character.repeat(64);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const stage = (skill, status, attempt) => ({
  skill, status,
  artifacts: status === 'PASSED' ? [{ path: `/artifact/${skill}`, sha256: d('1') }] : [],
  evidence: [`evidence-${skill}`], missing_inputs: [], history: [],
  checkpoint: { attempt, inputDigest: d('2'), updatedAt: '2026-10-26T00:00:00.000Z',
    next: 'Advance next stage' },
});

async function fixture(t) {
  const workspace = await mkdtemp(join(tmpdir(), 'site-remediation-transaction-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const runId = 'wallpaper-engine-002';
  const runDirectory = join(workspace, 'runs', runId);
  await mkdir(runDirectory, { recursive: true });
  const statuses = ['PASSED', 'PARTIAL', 'PASSED', 'PASSED', 'PASSED', 'PASSED',
    'WAITING_FOR_USER', 'SKIPPED'];
  const stages = ALL_STAGES.map((skill, index) => stage(skill, statuses[index], index + 1));
  stages[1].checkpoint.researchHandoff = {
    kind: 'RESEARCH_HANDOFF_V2', approved: true, approvalSha256: d('3'),
  };
  stages[4].checkpoint.projectDigest = d('4');
  stages[6].checkpoint.planDigest = d('5');
  const manifest = {
    schemaVersion: 1, runId, workspace, inventoryPath: '/inventory.json', templateRoots: [],
    createdAt: '2026-10-26T00:00:00.000Z', sequence: 219,
    inputs: { siteRevision: 'site-v1', researchHandoffApproval: { approved: true },
      deploymentPlanApproval: { approved: true }, launchReadinessClearance: { approved: true } },
    inputCopies: {}, lock: { skills: [] }, lockError: null, deploymentExecuted: false, stages,
  };
  const manifestPath = join(runDirectory, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const controller = createSiteRemediationController({ workspace, runId,
    capability: OFFLINE_SITE_REMEDIATION_CAPABILITY, now: () => 1,
    uuid: () => '11111111-1111-4111-8111-111111111111' });
  return { workspace, runId, runDirectory, manifestPath, manifest, controller };
}

const previewInput = {
  mode: 'LEGACY_CURRENT_BASELINE', lineageDigest: d('6'), researchApprovalDigest: d('3'),
  oldProjectDigest: d('4'), newProjectDigest: d('7'), baselineDigest: d('8'),
  remediationScopeDigest: d('9'), publicationEvidenceDigest: d('a'), attestationDigest: d('b'),
  acceptanceRevision: d('c'), protectedInputsDigest: d('d'),
  historicalEvidenceGaps: ['FINAL_STAGE4_INVENTORY_UNAVAILABLE'],
  operatorSummarySha256: d('e'),
};

function authorization(result) {
  const p = result.preview;
  return createSiteReacceptanceAuthorization({
    runId: p.runId, previewId: p.previewId,
    previewSnapshotSha256: result.previewSnapshotSha256,
    manifestSequence: p.manifestSequence, manifestSha256: p.manifestSha256,
    mode: p.mode, lineageDigest: p.lineageDigest, oldProjectDigest: p.oldProjectDigest,
    newProjectDigest: p.newProjectDigest, baselineDigest: p.baselineDigest,
    remediationScopeDigest: p.remediationScopeDigest,
    publicationEvidenceDigest: p.publicationEvidenceDigest,
    attestationDigest: p.attestationDigest, acceptanceRevision: p.acceptanceRevision,
    operatorSummarySha256: p.operatorSummarySha256, transactionId: p.transactionId,
  });
}

test('production controller is blocked until PR-C supplies trusted Host evidence', async t => {
  const f = await fixture(t);
  const production = createSiteRemediationController({ workspace: f.workspace, runId: f.runId });
  await assert.rejects(() => production.preview(previewInput),
    error => error.code === 'SITE_REMEDIATION_HOST_PROVIDER_REQUIRED');
});

test('preview rejects a linked manifest before reading Host-bound state', async t => {
  const f = await fixture(t);
  const outside = join(f.workspace, 'outside-manifest.json');
  await writeFile(outside, await readFile(f.manifestPath));
  await rm(f.manifestPath);
  await symlink(outside, f.manifestPath);
  await assert.rejects(() => f.controller.preview(previewInput),
    error => error.code === 'SITE_REMEDIATION_STORAGE_UNSAFE');
});

test('confirmation atomically preserves Stage 1-4 and invalidates only Stage 5-7', async t => {
  const f = await fixture(t);
  const result = await f.controller.preview(previewInput);
  await assert.rejects(() => f.controller.confirm({ previewId: result.preview.previewId,
    confirmationCode: 'wrong-code', authorization: authorization(result) }),
  error => error.code === 'SITE_REMEDIATION_CONFIRMATION_MISMATCH');
  const beforeInvalid = await readdir(join(f.runDirectory, 'site-remediation', 'transactions'))
    .catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error));
  assert.deepEqual(beforeInvalid, []);

  const committed = await f.controller.confirm({ previewId: result.preview.previewId,
    confirmationCode: result.confirmationCode, authorization: authorization(result) });
  assert.equal(committed.status, 'COMMITTED');
  const updated = JSON.parse(await readFile(f.manifestPath));
  assert.equal(updated.sequence, 220);
  assert.deepEqual(updated.stages.slice(0, 4), f.manifest.stages.slice(0, 4));
  assert.equal(updated.stages[1].status, 'PARTIAL');
  for (const index of [4, 5, 6]) {
    assert.equal(updated.stages[index].status, 'NOT_STARTED');
    assert.deepEqual(updated.stages[index].artifacts, []);
  }
  assert.deepEqual(updated.stages[7], f.manifest.stages[7]);
  assert.equal(updated.deploymentExecuted, false);
  assert.equal(updated.inputs.siteRevision, 'site-v1');
  assert.equal(Object.hasOwn(updated.inputs, 'deploymentPlanApproval'), false);
  assert.equal(Object.hasOwn(updated.inputs, 'launchReadinessClearance'), false);
  assert.equal(updated.siteAcceptance.acceptanceRevision, d('c'));
  assert.equal((await verifyCommittedSiteRemediation({ runDirectory: f.runDirectory,
    manifest: updated })).receipt.receiptDigest, committed.receipt.receiptDigest);

  const replay = await f.controller.confirm({ previewId: result.preview.previewId,
    confirmationCode: result.confirmationCode, authorization: authorization(result) });
  assert.equal(replay.status, 'COMMITTED');
  assert.equal(JSON.parse(await readFile(f.manifestPath)).sequence, 220);
});

test('recovery completes a crash after manifest commit without a second transition', async t => {
  const f = await fixture(t);
  const preview = await f.controller.preview(previewInput);
  const crashing = createSiteRemediationController({ workspace: f.workspace, runId: f.runId,
    capability: OFFLINE_SITE_REMEDIATION_CAPABILITY, now: () => 2,
    fault: phase => { if (phase === 'afterManifestCommit') throw Error('synthetic crash'); } });
  await assert.rejects(() => crashing.confirm({ previewId: preview.preview.previewId,
    confirmationCode: preview.confirmationCode, authorization: authorization(preview) }),
  /synthetic crash/);
  assert.equal(JSON.parse(await readFile(f.manifestPath)).sequence, 220);
  const recovered = await f.controller.recover({ transactionId: preview.preview.transactionId });
  assert.equal(recovered.status, 'COMMITTED');
  assert.equal(JSON.parse(await readFile(f.manifestPath)).sequence, 220);
  assert.equal(recovered.receipt.postManifestSha256, sha256(await readFile(f.manifestPath)));
});

test('recovery rejects unrelated manifest drift', async t => {
  const f = await fixture(t);
  const preview = await f.controller.preview(previewInput);
  const crashing = createSiteRemediationController({ workspace: f.workspace, runId: f.runId,
    capability: OFFLINE_SITE_REMEDIATION_CAPABILITY, now: () => 2,
    fault: phase => { if (phase === 'afterIntent') throw Error('synthetic crash'); } });
  await assert.rejects(() => crashing.confirm({ previewId: preview.preview.previewId,
    confirmationCode: preview.confirmationCode, authorization: authorization(preview) }),
  /synthetic crash/);
  const changed = JSON.parse(await readFile(f.manifestPath));
  changed.sequence += 7;
  await writeFile(f.manifestPath, `${JSON.stringify(changed, null, 2)}\n`);
  await assert.rejects(() => f.controller.recover({ transactionId: preview.preview.transactionId }),
    error => error.code === 'SITE_REMEDIATION_RECOVERY_REQUIRED');
});

test('every durable crash boundary recovers idempotently', async t => {
  for (const phase of ['afterIntent', 'afterReservation', 'beforeManifestCommit',
    'afterManifestCommit', 'afterConsumption', 'afterReceipt']) {
    await t.test(phase, async t => {
      const f = await fixture(t);
      const preview = await f.controller.preview(previewInput);
      let crashed = false;
      const crashing = createSiteRemediationController({ workspace: f.workspace, runId: f.runId,
        capability: OFFLINE_SITE_REMEDIATION_CAPABILITY, now: () => 2,
        fault: current => {
          if (!crashed && current === phase) { crashed = true; throw Error(`crash:${phase}`); }
        } });
      await assert.rejects(() => crashing.confirm({ previewId: preview.preview.previewId,
        confirmationCode: preview.confirmationCode, authorization: authorization(preview) }),
      new RegExp(`crash:${phase}`));
      const recovered = await f.controller.recover({});
      assert.equal(recovered.status, 'COMMITTED');
      assert.equal(JSON.parse(await readFile(f.manifestPath)).sequence, 220);
      assert.equal((await readdir(f.runDirectory)).some(name =>
        name.startsWith('.site-remediation-') && name.endsWith('.tmp')), false);
      const replay = await f.controller.recover({ transactionId: preview.preview.transactionId });
      assert.equal(replay.receipt.receiptDigest, recovered.receipt.receiptDigest);
    });
  }
});
