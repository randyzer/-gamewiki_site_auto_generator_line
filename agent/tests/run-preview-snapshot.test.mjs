import test from 'node:test';
import assert from 'node:assert/strict';
import { access, chmod, link, mkdir, mkdtemp, readFile, rename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sha256 } from '../src/files.mjs';
import { consumeRunPreviewSnapshot, createRunPreviewSnapshot,
  loadRunPreviewSnapshot, RUN_PREVIEW_SNAPSHOT_FUTURE_SKEW_MS,
  RUN_PREVIEW_SNAPSHOT_TTL_MS } from '../src/run-preview-snapshot.mjs';

async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'run-preview-snapshot-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const previewRoot = join(root, 'runs', '.preview-approvals', 'snapshot-run');
  const inputsFile = join(root, 'inputs.json');
  const evidencePlanPath = join(root, 'evidence-plan.json');
  const evidencePlanBytes = Buffer.from('{"kind":"fixture-plan"}\n');
  await writeFile(evidencePlanPath, evidencePlanBytes);
  const inputs = { objective: 'fixture', keywordEvidencePlan: {
    path: evidencePlanPath, sha256: sha256(evidencePlanBytes),
  } };
  const inputsFileBytes = Buffer.from(JSON.stringify(inputs));
  await writeFile(inputsFile, inputsFileBytes);
  return { root, previewRoot, inputsFile, inputsFileBytes, inputs, evidencePlanPath };
}

test('preview snapshot preserves exact inputs and evidence-plan bytes after caller files disappear', async t => {
  const s = await setup(t);
  const created = await createRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', inputDocument: {
      path: s.inputsFile, bytes: s.inputsFileBytes, data: s.inputs,
    }, summary: 'approved summary\n', confirmationCode: '0123456789abcdef',
    manifestBytes: Buffer.from('{"sequence":9}') });
  await rm(s.inputsFile);
  await rm(s.evidencePlanPath);

  const loaded = await loadRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', previewId: created.previewId });
  assert.equal(loaded.sourceInputDocument.path, s.inputsFile);
  assert.deepEqual(loaded.sourceInputDocument.data, s.inputs);
  assert.equal(loaded.effectiveInputDocument.data.keywordEvidencePlan.path,
    join(created.directory, 'evidence-plan.json'));
  assert.equal(loaded.effectiveInputDocument.data.keywordEvidencePlan.sha256,
    s.inputs.keywordEvidencePlan.sha256);
  assert.equal(await readFile(loaded.effectiveInputDocument.data.keywordEvidencePlan.path, 'utf8'),
    '{"kind":"fixture-plan"}\n');
  assert.equal((await stat(created.directory)).mode & 0o777, 0o700);
  assert.equal((await stat(join(created.directory, 'snapshot.json'))).mode & 0o777, 0o600);
});

test('preview snapshot rejects changed bytes and is consumed at most once', async t => {
  const s = await setup(t);
  const created = await createRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', inputDocument: {
      path: s.inputsFile, bytes: s.inputsFileBytes, data: s.inputs,
    }, summary: 'approved summary\n', confirmationCode: '0123456789abcdef',
    manifestBytes: Buffer.from('{"sequence":9}') });
  await writeFile(join(created.directory, 'effective-inputs.json'), '{"tampered":true}');
  await assert.rejects(loadRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', previewId: created.previewId }),
  /RUN_PREVIEW_SNAPSHOT_INVALID/);

  await writeFile(join(created.directory, 'effective-inputs.json'), created.effectiveInputDocument.bytes);
  await chmod(join(created.directory, 'effective-inputs.json'), 0o600);
  const loaded = await loadRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', previewId: created.previewId });
  await assert.rejects(loadRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'run', runId: 'snapshot-run', previewId: created.previewId }),
  /RUN_PREVIEW_SNAPSHOT_INVALID/);
  const attempts = await Promise.allSettled([
    consumeRunPreviewSnapshot(loaded), consumeRunPreviewSnapshot(loaded),
  ]);
  assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(attempts.filter(result => result.status === 'rejected' &&
    /RUN_PREVIEW_ALREADY_CONSUMED/.test(result.reason.message)).length, 1);
  await access(join(created.directory, 'consumed.json'));
});

test('preview snapshot preserves an explicit null evidence plan', async t => {
  const root = await mkdtemp(join(tmpdir(), 'run-preview-snapshot-null-plan-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const inputsFile = join(root, 'inputs.json');
  const inputs = { objective: 'fixture', keywordEvidencePlan: null };
  const bytes = Buffer.from(JSON.stringify(inputs));
  await writeFile(inputsFile, bytes);
  const created = await createRunPreviewSnapshot({
    previewRoot: join(root, 'runs', '.preview-approvals', 'snapshot-run'),
    command: 'run',
    runId: 'snapshot-run',
    inputDocument: { path: inputsFile, bytes, data: inputs },
    summary: 'approved summary\n',
    confirmationCode: '0123456789abcdef',
    manifestBytes: null,
  });
  const loaded = await loadRunPreviewSnapshot({
    previewRoot: join(root, 'runs', '.preview-approvals', 'snapshot-run'),
    command: 'run',
    runId: 'snapshot-run',
    previewId: created.previewId,
  });
  assert.equal(loaded.effectiveInputDocument.data.keywordEvidencePlan, null);
  assert.equal(loaded.effectiveEvidencePlanSha256, null);
});

test('preview snapshot binds the exact Stage 4 recover decision', async t => {
  const root = await mkdtemp(join(tmpdir(), 'run-preview-stage4-recovery-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const inputsFile = join(root, 'inputs.json');
  const decision = { mode: 'recover', sourceAttempt: 13,
    heldCandidateDigest: 'a'.repeat(64), baselineDigest: 'b'.repeat(64) };
  const inputs = { stage4RecoveryDecision: decision };
  const bytes = Buffer.from(JSON.stringify(inputs));
  await writeFile(inputsFile, bytes);
  const binding = { decision, sha256: sha256(JSON.stringify({ baselineDigest: decision.baselineDigest,
    heldCandidateDigest: decision.heldCandidateDigest, mode: decision.mode,
    sourceAttempt: decision.sourceAttempt })) };
  const previewRoot = join(root, 'runs', '.preview-approvals', 'snapshot-run');
  const created = await createRunPreviewSnapshot({ previewRoot, command: 'retry', runId: 'snapshot-run',
    inputDocument: { path: inputsFile, bytes, data: inputs }, summary: 'stage4 recovery\n',
    confirmationCode: '0123456789abcdef', manifestBytes: Buffer.from('{"sequence":9}'),
    stage4Recovery: binding });
  const loaded = await loadRunPreviewSnapshot({ previewRoot, command: 'retry', runId: 'snapshot-run',
    previewId: created.previewId });
  assert.equal(loaded.stage4RecoverySha256, binding.sha256);
  assert.deepEqual(loaded.effectiveInputDocument.data.stage4RecoveryDecision, decision);
});

test('preview snapshot rejects approved-byte changes made after loading', async t => {
  const s = await setup(t);
  const created = await createRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', inputDocument: {
      path: s.inputsFile, bytes: s.inputsFileBytes, data: s.inputs,
    }, summary: 'approved summary\n', confirmationCode: '0123456789abcdef',
    manifestBytes: Buffer.from('{"sequence":9}') });
  const loaded = await loadRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', previewId: created.previewId });
  await writeFile(loaded.effectiveInputDocument.path, '{"changed":true}');
  await assert.rejects(consumeRunPreviewSnapshot(loaded),
    /effective inputs changed before consumption/);
  await assert.rejects(access(join(created.directory, 'consumed.json')));
});

test('preview snapshot enforces expiry during loading and consumption', async t => {
  const s = await setup(t);
  const createdAt = Date.parse('2026-10-17T00:00:00.000Z');
  const created = await createRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', inputDocument: {
      path: s.inputsFile, bytes: s.inputsFileBytes, data: s.inputs,
    }, summary: 'approved summary\n', confirmationCode: '0123456789abcdef',
    manifestBytes: Buffer.from('{"sequence":9}'), now: createdAt });
  const loaded = await loadRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', previewId: created.previewId,
    now: createdAt + RUN_PREVIEW_SNAPSHOT_TTL_MS });
  await assert.rejects(loadRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', previewId: created.previewId,
    now: createdAt + RUN_PREVIEW_SNAPSHOT_TTL_MS + 1 }), /snapshot expired/);
  await assert.rejects(consumeRunPreviewSnapshot(loaded, {
    now: createdAt + RUN_PREVIEW_SNAPSHOT_TTL_MS + 1,
  }), /snapshot expired/);
  await assert.rejects(access(join(created.directory, 'consumed.json')));
});

test('preview snapshot rejects a creation time beyond the clock-skew allowance', async t => {
  const s = await setup(t);
  const createdAt = Date.parse('2026-10-17T00:00:00.000Z');
  const created = await createRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', inputDocument: {
      path: s.inputsFile, bytes: s.inputsFileBytes, data: s.inputs,
    }, summary: 'approved summary\n', confirmationCode: '0123456789abcdef',
    manifestBytes: Buffer.from('{"sequence":9}'), now: createdAt });
  await assert.rejects(loadRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', previewId: created.previewId,
    now: createdAt - RUN_PREVIEW_SNAPSHOT_FUTURE_SKEW_MS - 1 }), /too far in the future/);
});

test('preview snapshot rejects a preview directory replaced by a symlink', async t => {
  const s = await setup(t);
  const created = await createRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', inputDocument: {
      path: s.inputsFile, bytes: s.inputsFileBytes, data: s.inputs,
    }, summary: 'approved summary\n', confirmationCode: '0123456789abcdef', manifestBytes: null });
  const moved = created.directory + '-moved';
  await rename(created.directory, moved);
  await symlink(moved, created.directory, 'dir');
  await assert.rejects(loadRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', previewId: created.previewId }), /linked snapshot path/);
});

test('preview snapshot rejects a snapshot file with an extra hard link', async t => {
  const s = await setup(t);
  const created = await createRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', inputDocument: {
      path: s.inputsFile, bytes: s.inputsFileBytes, data: s.inputs,
    }, summary: 'approved summary\n', confirmationCode: '0123456789abcdef', manifestBytes: null });
  await link(created.effectiveInputDocument.path, join(s.root, 'linked-effective-inputs.json'));
  await assert.rejects(loadRunPreviewSnapshot({ previewRoot: s.previewRoot,
    command: 'retry', runId: 'snapshot-run', previewId: created.previewId }),
  /linked snapshot path|unlinked regular file/);
});
