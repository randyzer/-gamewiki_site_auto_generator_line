import { chmod, lstat, mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { sha256 } from './files.mjs';

const KIND = 'RUN_PREVIEW_SNAPSHOT_V1';
const CONSUMED_KIND = 'RUN_PREVIEW_SNAPSHOT_CONSUMED_V1';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const CODE = /^[a-f0-9]{16}$/;
const trustedConsumptions = new WeakMap();
export const RUN_PREVIEW_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
export const RUN_PREVIEW_SNAPSHOT_FUTURE_SKEW_MS = 5 * 60 * 1000;
const assert = (ok, detail) => { if (!ok) throw Error('RUN_PREVIEW_SNAPSHOT_INVALID: ' + detail); };
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const clone = value => JSON.parse(JSON.stringify(value));

function payloadSha256(payload) {
  return sha256(Buffer.from(JSON.stringify(payload)));
}

function currentTime(now) {
  const value = now instanceof Date ? now.getTime() : now;
  assert(Number.isFinite(value), 'current time');
  return value;
}

function validateCreatedAt(createdAt, now) {
  const created = Date.parse(createdAt);
  const current = currentTime(now);
  assert(Number.isFinite(created), 'snapshot creation time');
  assert(created <= current + RUN_PREVIEW_SNAPSHOT_FUTURE_SKEW_MS,
    'snapshot creation time is too far in the future');
  assert(current - created <= RUN_PREVIEW_SNAPSHOT_TTL_MS,
    'snapshot expired; create a new preview');
}

async function safeSnapshotPath(path, boundary) {
  const root = resolve(boundary);
  const target = resolve(path);
  const rel = relative(root, target);
  assert(rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('../')), 'snapshot path boundary');
  try {
    const rootInfo = await lstat(root);
    assert(!rootInfo.isSymbolicLink() && (!rootInfo.isFile() || rootInfo.nlink === 1), 'linked snapshot boundary');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let current = root;
  for (const part of rel.split('/').filter(Boolean)) {
    current = join(current, part);
    try {
      const info = await lstat(current);
      assert(!info.isSymbolicLink() && (!info.isFile() || info.nlink === 1), 'linked snapshot path');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

async function privateDirectory(path, boundary) {
  await safeSnapshotPath(path, boundary);
  await mkdir(path, { recursive: true, mode: 0o700 });
  await safeSnapshotPath(path, boundary);
  await chmod(path, 0o700);
}

async function privateFile(path, bytes, boundary = dirname(path)) {
  await safeSnapshotPath(path, boundary);
  await writeFile(path, bytes, { mode: 0o600, flag: 'wx' });
  await chmod(path, 0o600);
}

async function regularFile(path, maximum, boundary = dirname(path)) {
  await safeSnapshotPath(path, boundary);
  let info;
  try { info = await lstat(path); }
  catch (error) { throw Error(`RUN_PREVIEW_SNAPSHOT_INVALID: ${path} is unavailable (${error.message})`); }
  assert(info.isFile() && info.nlink === 1 && info.size <= maximum,
    `${path} must be an unlinked regular file no larger than ${maximum} bytes`);
  return readFile(path);
}

function jsonObject(bytes, label) {
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); }
  catch (error) { throw Error(`RUN_PREVIEW_SNAPSHOT_INVALID: ${label} is not JSON (${error.message})`); }
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must contain an object`);
  return value;
}

function previewDirectory(previewRoot, previewId) {
  assert(UUID.test(previewId ?? ''), 'preview id');
  const root = resolve(previewRoot);
  const boundary = resolve(root, '..', '..', '..');
  assert(relative(boundary, root).split('/').slice(0, 2).join('/') === 'runs/.preview-approvals',
    'preview root namespace');
  const directory = resolve(root, previewId);
  assert(relative(root, directory) === previewId && directory === join(root, previewId), 'preview path');
  return { root, directory, boundary };
}

function validateEnvelope(envelope, { command, runId, previewId, directory, now }) {
  assert(exactKeys(envelope, ['payload', 'payloadSha256']) && DIGEST.test(envelope.payloadSha256 ?? ''),
    'snapshot envelope');
  assert(payloadSha256(envelope.payload) === envelope.payloadSha256, 'snapshot metadata digest changed');
  const payload = envelope.payload;
  assert(exactKeys(payload, ['schemaVersion', 'kind', 'previewId', 'command', 'runId', 'createdAt',
    'sourceInputs', 'effectiveInputs', 'evidencePlan', 'summary', 'confirmationCode', 'manifestSha256']) &&
    payload.schemaVersion === 1 && payload.kind === KIND && payload.previewId === previewId &&
    payload.command === command && payload.runId === runId && !Number.isNaN(Date.parse(payload.createdAt)) &&
    CODE.test(payload.confirmationCode ?? '') &&
    (payload.manifestSha256 === null || DIGEST.test(payload.manifestSha256 ?? '')),
  'snapshot identity');
  assert(exactKeys(payload.sourceInputs, ['path', 'sha256']) && isAbsolute(payload.sourceInputs.path ?? '') &&
    resolve(payload.sourceInputs.path) === payload.sourceInputs.path && DIGEST.test(payload.sourceInputs.sha256 ?? ''),
  'source inputs binding');
  assert(exactKeys(payload.effectiveInputs, ['path', 'sha256']) &&
    payload.effectiveInputs.path === join(directory, 'effective-inputs.json') &&
    DIGEST.test(payload.effectiveInputs.sha256 ?? ''), 'effective inputs binding');
  assert(exactKeys(payload.summary, ['path', 'sha256']) && payload.summary.path === join(directory, 'summary.txt') &&
    DIGEST.test(payload.summary.sha256 ?? ''), 'summary binding');
  if (payload.evidencePlan !== null) assert(exactKeys(payload.evidencePlan,
    ['sourcePath', 'path', 'sha256']) && isAbsolute(payload.evidencePlan.sourcePath ?? '') &&
    resolve(payload.evidencePlan.sourcePath) === payload.evidencePlan.sourcePath &&
    payload.evidencePlan.path === join(directory, 'evidence-plan.json') &&
    DIGEST.test(payload.evidencePlan.sha256 ?? ''), 'evidence plan binding');
  validateCreatedAt(payload.createdAt, now);
  return payload;
}

export async function createRunPreviewSnapshot({ previewRoot, command, runId, inputDocument,
  summary, confirmationCode, manifestBytes, now = Date.now() }) {
  assert(['run', 'retry'].includes(command) && /^[a-zA-Z0-9_-]{1,100}$/.test(runId ?? ''), 'command or run id');
  assert(inputDocument && isAbsolute(inputDocument.path ?? '') && Buffer.isBuffer(inputDocument.bytes) &&
    inputDocument.data && typeof inputDocument.data === 'object' && !Array.isArray(inputDocument.data),
  'input document');
  assert(typeof summary === 'string' && summary.length > 0 && CODE.test(confirmationCode ?? ''),
    'summary or confirmation code');
  const createdAt = new Date(currentTime(now)).toISOString();
  const previewId = randomUUID();
  const { root, directory, boundary } = previewDirectory(previewRoot, previewId);
  await privateDirectory(root, boundary);
  const temporary = join(root, `.tmp-${previewId}-${randomUUID()}`);
  await privateDirectory(temporary, root);
  try {
    const sourceInputsPath = join(temporary, 'source-inputs.json');
    await privateFile(sourceInputsPath, inputDocument.bytes, temporary);
    const effectiveInputs = clone(inputDocument.data);
    let evidencePlan = null;
    if (effectiveInputs.keywordEvidencePlan) {
      const reference = effectiveInputs.keywordEvidencePlan;
      assert(exactKeys(reference, ['path', 'sha256']) && isAbsolute(reference.path ?? '') &&
        resolve(reference.path) === reference.path && DIGEST.test(reference.sha256 ?? ''), 'evidence plan reference');
      const bytes = await regularFile(reference.path, 256 * 1024);
      assert(sha256(bytes) === reference.sha256, 'evidence plan digest changed before snapshot');
      await privateFile(join(temporary, 'evidence-plan.json'), bytes, temporary);
      evidencePlan = { sourcePath: reference.path, path: join(directory, 'evidence-plan.json'), sha256: reference.sha256 };
      effectiveInputs.keywordEvidencePlan = { path: evidencePlan.path, sha256: evidencePlan.sha256 };
    }
    const effectiveInputsBytes = Buffer.from(JSON.stringify(effectiveInputs));
    const summaryBytes = Buffer.from(summary);
    await privateFile(join(temporary, 'effective-inputs.json'), effectiveInputsBytes, temporary);
    await privateFile(join(temporary, 'summary.txt'), summaryBytes, temporary);
    const payload = {
      schemaVersion: 1,
      kind: KIND,
      previewId,
      command,
      runId,
      createdAt,
      sourceInputs: { path: resolve(inputDocument.path), sha256: sha256(inputDocument.bytes) },
      effectiveInputs: { path: join(directory, 'effective-inputs.json'), sha256: sha256(effectiveInputsBytes) },
      evidencePlan,
      summary: { path: join(directory, 'summary.txt'), sha256: sha256(summaryBytes) },
      confirmationCode,
      manifestSha256: manifestBytes ? sha256(manifestBytes) : null,
    };
    const envelope = { payload, payloadSha256: payloadSha256(payload) };
    await privateFile(join(temporary, 'snapshot.json'), Buffer.from(JSON.stringify(envelope, null, 2) + '\n'), temporary);
    await rename(temporary, directory);
    return {
      previewId,
      directory,
      boundary,
      snapshotSha256: envelope.payloadSha256,
      sourceInputsSnapshotPath: join(directory, 'source-inputs.json'),
      sourceInputDocument: { path: resolve(inputDocument.path), bytes: inputDocument.bytes, data: clone(inputDocument.data) },
      effectiveInputDocument: { path: payload.effectiveInputs.path, bytes: effectiveInputsBytes, data: effectiveInputs },
      sourceEvidencePlanPath: evidencePlan?.sourcePath ?? null,
      effectiveEvidencePlanSha256: evidencePlan?.sha256 ?? null,
      summary,
      confirmationCode,
      manifestSha256: payload.manifestSha256,
      approvedSummarySha256: payload.summary.sha256,
    };
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

export async function loadRunPreviewSnapshot({ previewRoot, command, runId, previewId, now = Date.now() }) {
  const { directory, boundary } = previewDirectory(previewRoot, previewId);
  await safeSnapshotPath(directory, boundary);
  const directoryInfo = await lstat(directory).catch(error => {
    throw Error(`RUN_PREVIEW_SNAPSHOT_INVALID: ${previewId} is unavailable (${error.message})`);
  });
  assert(directoryInfo.isDirectory(), 'preview path must be a directory');
  const envelope = jsonObject(await regularFile(join(directory, 'snapshot.json'), 64 * 1024, boundary), 'snapshot.json');
  const payload = validateEnvelope(envelope, { command, runId, previewId, directory, now });
  const [sourceBytes, effectiveBytes, summaryBytes] = await Promise.all([
    regularFile(join(directory, 'source-inputs.json'), 1024 * 1024, boundary),
    regularFile(payload.effectiveInputs.path, 1024 * 1024, boundary),
    regularFile(payload.summary.path, 2 * 1024 * 1024, boundary),
  ]);
  assert(sha256(sourceBytes) === payload.sourceInputs.sha256, 'source inputs digest changed');
  assert(sha256(effectiveBytes) === payload.effectiveInputs.sha256, 'effective inputs digest changed');
  assert(sha256(summaryBytes) === payload.summary.sha256, 'summary digest changed');
  const sourceInputs = jsonObject(sourceBytes, 'source-inputs.json');
  const effectiveInputs = jsonObject(effectiveBytes, 'effective-inputs.json');
  if (payload.evidencePlan) {
    const planBytes = await regularFile(payload.evidencePlan.path, 256 * 1024, boundary);
    assert(sha256(planBytes) === payload.evidencePlan.sha256, 'evidence plan digest changed');
    assert(sourceInputs.keywordEvidencePlan?.path === payload.evidencePlan.sourcePath &&
      sourceInputs.keywordEvidencePlan?.sha256 === payload.evidencePlan.sha256 &&
      effectiveInputs.keywordEvidencePlan?.path === payload.evidencePlan.path &&
      effectiveInputs.keywordEvidencePlan?.sha256 === payload.evidencePlan.sha256,
    'evidence plan references changed');
  } else assert(!sourceInputs.keywordEvidencePlan && !effectiveInputs.keywordEvidencePlan,
    'unexpected evidence plan reference');
  return {
    previewId,
    directory,
    boundary,
    snapshotSha256: envelope.payloadSha256,
    sourceInputsSnapshotPath: join(directory, 'source-inputs.json'),
    sourceInputDocument: { path: payload.sourceInputs.path, bytes: sourceBytes, data: sourceInputs },
    effectiveInputDocument: { path: payload.effectiveInputs.path, bytes: effectiveBytes, data: effectiveInputs },
    sourceEvidencePlanPath: payload.evidencePlan?.sourcePath ?? null,
    effectiveEvidencePlanSha256: payload.evidencePlan?.sha256 ?? null,
    summary: summaryBytes.toString('utf8'),
    confirmationCode: payload.confirmationCode,
    manifestSha256: payload.manifestSha256,
    approvedSummarySha256: payload.summary.sha256,
  };
}

export async function consumeRunPreviewSnapshot(snapshot, { now = Date.now() } = {}) {
  assert(snapshot && UUID.test(snapshot.previewId ?? '') && DIGEST.test(snapshot.snapshotSha256 ?? '') &&
    typeof snapshot.directory === 'string' && typeof snapshot.boundary === 'string', 'consumption binding');
  const envelope = jsonObject(await regularFile(join(snapshot.directory, 'snapshot.json'), 64 * 1024,
    snapshot.boundary), 'snapshot.json');
  assert(envelope.payloadSha256 === snapshot.snapshotSha256 && payloadSha256(envelope.payload) === snapshot.snapshotSha256,
    'snapshot changed before consumption');
  const payload = envelope.payload;
  validateCreatedAt(payload.createdAt, now);
  const checks = [
    [snapshot.sourceInputsSnapshotPath, payload.sourceInputs.sha256, 1024 * 1024, 'source inputs'],
    [snapshot.effectiveInputDocument?.path, payload.effectiveInputs.sha256, 1024 * 1024, 'effective inputs'],
    [payload.summary.path, payload.summary.sha256, 2 * 1024 * 1024, 'summary'],
  ];
  if (payload.evidencePlan) checks.push([
    payload.evidencePlan.path, payload.evidencePlan.sha256, 256 * 1024, 'evidence plan',
  ]);
  for (const [file, digest, maximum, label] of checks) {
    assert(typeof file === 'string' && sha256(await regularFile(file, maximum, snapshot.boundary)) === digest,
      `${label} changed before consumption`);
  }
  const path = join(snapshot.directory, 'consumed.json');
  let handle;
  try { handle = await open(path, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw Error(`RUN_PREVIEW_ALREADY_CONSUMED: ${snapshot.previewId}`);
    throw error;
  }
  try {
    const consumedAt = new Date().toISOString();
    await handle.writeFile(JSON.stringify({ kind: CONSUMED_KIND, previewId: snapshot.previewId,
      snapshotSha256: snapshot.snapshotSha256, consumedAt }) + '\n');
    await handle.sync();
  } finally { await handle.close(); }
  await chmod(path, 0o600);
  const consumption = Object.freeze({ kind: 'RUN_PREVIEW_CONSUMPTION_V1', schemaVersion: 1,
    previewId: snapshot.previewId, runId: payload.runId, command: payload.command,
    snapshotSha256: snapshot.snapshotSha256, effectiveInputsSha256: payload.effectiveInputs.sha256 });
  const effectiveInputs = jsonObject(
    await regularFile(payload.effectiveInputs.path, 1024 * 1024, snapshot.boundary),
    'effective-inputs.json',
  );
  trustedConsumptions.set(consumption, { effectiveInputs });
  return consumption;
}

export function assertTrustedRunPreviewConsumption(consumption, { effectiveInputs } = {}) {
  const trusted = trustedConsumptions.get(consumption);
  assert(trusted, 'untrusted preview consumption');
  if (effectiveInputs !== undefined)
    assert(isDeepStrictEqual(effectiveInputs, trusted.effectiveInputs),
      'effective inputs do not match trusted snapshot');
  return consumption;
}
