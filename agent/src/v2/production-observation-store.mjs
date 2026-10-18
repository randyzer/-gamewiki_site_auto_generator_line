import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { canonicalJson, deepFreeze, parseStrictJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { writeImmutableFile } from '../state/atomic-file.mjs';
import { ensureDirectoryTree } from '../state/storage-boundary.mjs';
import { assertTrustedObservationSnapshot } from './production-observation.mjs';
import { stageRegistry } from './stage-registry.mjs';

const trustedRecordsByStore = new WeakMap();
const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };
const isDigest = value => /^[a-f0-9]{64}$/.test(value ?? '');
const safeIdentity = value => typeof value === 'string' && /^[A-Za-z0-9._-]+$/.test(value);

function absoluteRoot(value, label) {
  if (typeof value !== 'string' || !isAbsolute(value)) fail('STATE_STORAGE_PATH_INVALID', `${label} must be absolute`);
  return resolve(value);
}

async function assertNoSymlinkComponents(root, child = '', { allowMissing = false } = {}) {
  const rootPrefix = parse(root).root;
  let current = rootPrefix;
  const segments = [...root.slice(rootPrefix.length).split(sep).filter(Boolean),
    ...child.split('/').filter(Boolean)];
  for (const segment of segments) {
    current = join(current, segment);
    try {
      const metadata = await lstat(current);
      if (metadata.isSymbolicLink()) fail('STATE_STORAGE_SYMLINK', `State storage path must not be a symlink: ${current}`);
    } catch (error) {
      if (allowMissing && error.code === 'ENOENT') return;
      throw error;
    }
  }
}

async function readStableRegularFile(path) {
  let handle;
  try { handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW); }
  catch (error) {
    if (error.code === 'ELOOP') fail('STATE_STORAGE_SYMLINK', `State storage path must not be a symlink: ${path}`);
    throw error;
  }
  try {
    const before = await handle.stat();
    if (!before.isFile()) fail('STATE_STORAGE_PATH_INVALID', `State storage path is not a regular file: ${path}`);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size)
      fail('STATE_STORAGE_CHANGED', `State storage file changed while it was being read: ${path}`);
    return bytes;
  } finally { await handle.close(); }
}

function recordPath(identity) {
  const { runId, canonicalStageId, attemptId, committedSequence, checkpointDigest } = identity ?? {};
  if (!safeIdentity(runId) || !safeIdentity(canonicalStageId) ||
      !Number.isSafeInteger(attemptId) || attemptId < 1 ||
      !Number.isSafeInteger(committedSequence) || committedSequence < 1 || !isDigest(checkpointDigest)) {
    fail('IDENTITY_MISMATCH', 'Observation record identity is invalid');
  }
  return join('records', runId, canonicalStageId,
    `${String(attemptId).padStart(6, '0')}-${String(committedSequence).padStart(10, '0')}-${checkpointDigest}.json`);
}

function manifestProjection(manifest, snapshot) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest))
    fail('CONTRACT_INVALID', 'Legacy manifest is invalid');
  const identity = stageRegistry.get(snapshot.canonicalStageId);
  const stage = manifest.stages?.[identity.legacyArrayIndex];
  if (manifest.runId !== snapshot.runId || manifest.sequence !== snapshot.committedSequence ||
      manifest.deploymentExecuted !== snapshot.deploymentExecuted ||
      manifest.inputs?.siteRevision !== snapshot.sourceRevision ||
      stage?.skill !== identity.legacySkillName || stage?.status !== snapshot.legacyStatus ||
      stage?.checkpoint?.attempt !== snapshot.attemptId ||
      stage?.checkpoint?.inputDigest !== snapshot.legacyInputDigest) {
    fail('IDENTITY_MISMATCH', 'Legacy manifest does not match the observation snapshot');
  }
  const checkpointDigest = digest('AGENT_LEGACY_STAGE_CHECKPOINT_V1', stage.checkpoint);
  const artifactDigests = (stage.artifacts ?? []).map(item => item?.sha256).sort();
  if (checkpointDigest !== snapshot.checkpointDigest ||
      canonicalJson(artifactDigests) !== canonicalJson(snapshot.artifactDigests)) {
    fail('IDENTITY_MISMATCH', 'Legacy manifest data does not match the observation snapshot');
  }
  return { identity, stage };
}

function buildRecord(snapshot, manifestBytes, path) {
  const identity = deepFreeze({ runId: snapshot.runId, canonicalStageId: snapshot.canonicalStageId,
    attemptId: snapshot.attemptId, committedSequence: snapshot.committedSequence,
    checkpointDigest: snapshot.checkpointDigest });
  const base = { kind: 'PRODUCTION_OBSERVATION_RECORD', schemaVersion: 1,
    producer: 'P6_B_OFFLINE_OBSERVATION_STORE', authoritative: false,
    verificationScope: 'OFFLINE_SIMULATED', identity, snapshot,
    legacyManifest: { path: `runs/${snapshot.runId}/manifest.json`, sha256: sha256(manifestBytes) },
    reference: { path } };
  return deepFreeze({ ...base, recordDigest: digest('AGENT_P6_B_OBSERVATION_RECORD_V1', base) });
}

function validateRecord(record, expectedPath) {
  if (!record || record.kind !== 'PRODUCTION_OBSERVATION_RECORD' || record.schemaVersion !== 1 ||
      record.authoritative !== false || record.verificationScope !== 'OFFLINE_SIMULATED' ||
      record.reference?.path !== expectedPath || !isDigest(record.legacyManifest?.sha256)) {
    fail('CONTRACT_INVALID', 'Stored observation record is invalid');
  }
  const { recordDigest, ...base } = record;
  if (recordDigest !== digest('AGENT_P6_B_OBSERVATION_RECORD_V1', base))
    fail('CONTRACT_DIGEST_MISMATCH', 'Stored observation record digest is invalid');
  if (recordPath(record.identity) !== expectedPath) fail('IDENTITY_MISMATCH', 'Stored observation record identity is invalid');
  const fields = ['runId', 'canonicalStageId', 'attemptId', 'committedSequence', 'checkpointDigest'];
  if (fields.some(field => record.identity[field] !== record.snapshot?.[field]))
    fail('IDENTITY_MISMATCH', 'Stored observation record identity does not match its snapshot');
  return record;
}

export function assertTrustedOfflineObservationRecord(store, record) {
  if (!trustedRecordsByStore.get(store)?.has(record)) {
    fail('TRUST_LEVEL_INSUFFICIENT', 'A trusted observation record from the current store is required');
  }
  return record;
}

export function createOfflineObservationStore({ legacyRoot, offlineRoot } = {}) {
  const legacy = absoluteRoot(legacyRoot, 'legacyRoot');
  const offline = absoluteRoot(offlineRoot, 'offlineRoot');
  const offlineFromLegacy = relative(legacy, offline);
  const legacyFromOffline = relative(offline, legacy);
  if (legacy === offline || (!offlineFromLegacy.startsWith('..') && !isAbsolute(offlineFromLegacy)) ||
      (!legacyFromOffline.startsWith('..') && !isAbsolute(legacyFromOffline)))
    fail('STATE_STORAGE_PATH_INVALID', 'Legacy and offline roots must be distinct');
  const trustedRecords = new WeakSet();
  const store = Object.freeze({
    async persist(snapshot) {
      assertTrustedObservationSnapshot(snapshot);
      if (!safeIdentity(snapshot.runId)) fail('IDENTITY_MISMATCH', 'Observation run identity is unsafe');
      await assertNoSymlinkComponents(legacy, `runs/${snapshot.runId}/manifest.json`);
      await assertNoSymlinkComponents(offline, '', { allowMissing: true });
      const manifestPath = join(legacy, 'runs', snapshot.runId, 'manifest.json');
      const manifestBytes = await readStableRegularFile(manifestPath);
      const manifest = parseStrictJson(manifestBytes, manifestPath);
      manifestProjection(manifest, snapshot);
      const path = recordPath(snapshot);
      const record = buildRecord(snapshot, manifestBytes, path);
      const bytes = Buffer.from(`${canonicalJson(record)}\n`);
      await ensureDirectoryTree(offline, ['records', snapshot.runId, snapshot.canonicalStageId]);
      const target = join(offline, path);
      const created = await writeImmutableFile(target, bytes);
      if (!created) {
        const existingBytes = await readStableRegularFile(target);
        if (!existingBytes.equals(bytes)) fail('OBSERVATION_RECORD_CONFLICT', 'An observation record already exists with different bytes');
      }
      trustedRecords.add(record);
      return record;
    },
    async read(identity) {
      await assertNoSymlinkComponents(legacy);
      await assertNoSymlinkComponents(offline);
      const path = recordPath(identity);
      const target = join(offline, path);
      await assertNoSymlinkComponents(offline, path);
      const record = validateRecord(parseStrictJson(await readStableRegularFile(target), target), path);
      const manifestPath = join(legacy, record.legacyManifest.path);
      await assertNoSymlinkComponents(legacy, record.legacyManifest.path);
      const manifestBytes = await readStableRegularFile(manifestPath);
      if (sha256(manifestBytes) !== record.legacyManifest.sha256)
        fail('OBSERVATION_HISTORY_UNAVAILABLE', 'The historical manifest has changed and cannot prove this record');
      manifestProjection(parseStrictJson(manifestBytes, manifestPath), record.snapshot);
      const frozen = deepFreeze(record);
      trustedRecords.add(frozen);
      return frozen;
    },
  });
  trustedRecordsByStore.set(store, trustedRecords);
  return store;
}
