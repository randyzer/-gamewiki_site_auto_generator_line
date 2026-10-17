import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalJson, parseStrictJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { createStateObjectStore } from './state-object-store.mjs';
import { computeCommitDigest } from './state-records.mjs';
import { assertStageState } from './state-engine.mjs';
import { projectLegacyManifest, projectionMetadataFromRecord } from './manifest-projector.mjs';
import { writeAtomicFile } from './atomic-file.mjs';
import { assertRequestScopeAssessment } from './request-scope.mjs';
import { assertDirectoryNoSymlink, assertRegularFileNoSymlink, ensureDirectoryTree } from './storage-boundary.mjs';

const formal = /^\d{12}\.json$/;
const corrupt = message => new ContractError('STATE_COMMIT_CORRUPT', message);
const errorCategories = new Set(['CONTRACT_ERROR', 'ENVIRONMENT_ERROR', 'EXECUTION_ERROR', 'EVIDENCE_GAP',
  'USER_INPUT_REQUIRED', 'SERVICE_RESTRICTED', 'POLICY_DENIED']);

function assertRecordPayload(record) {
  if (record.state.gate.status === 'APPROVED')
    throw new ContractError('STATE_APPROVAL_ENGINE_UNAVAILABLE', 'P3 cannot recover APPROVED before P4');
  assertRequestScopeAssessment(record.requestScope);
  if (record.workerStop?.phase !== 'STOPPED' || record.workerStop.reason !== record.state.execution.reason)
    throw corrupt('Worker stop does not match Stage state');
  if (!Array.isArray(record.errors) || record.errors.some(error => !errorCategories.has(error.category) ||
      typeof error.code !== 'string' || !error.code || typeof error.message !== 'string' || !error.message))
    throw corrupt('Commit contains an invalid error record');
  const ids = new Set();
  for (const event of record.events) {
    try { validateContract('STATE_EVENT', 1, { kind: 'STATE_EVENT', schemaVersion: 1,
      producer: 'STATE_ENGINE', ...event }); } catch (error) { throw corrupt(`Invalid State Event: ${error.message}`); }
    if (ids.has(event.eventId) || !Number.isFinite(Date.parse(event.timestamp)))
      throw corrupt('Commit contains duplicate or invalid State Events');
    ids.add(event.eventId);
    for (const [key, expected] of Object.entries({ runId: record.runId, stageId: record.stageId,
      attemptId: record.attemptId, contextDigest: record.contextDigest,
      schemaBundleDigest: record.schemaBundleDigest })) if (event[key] !== expected)
      throw corrupt(`State Event binding mismatch: ${key}`);
  }
}

export async function readCommitChain({ rootDirectory }) {
  const commitsDirectory = join(rootDirectory, 'commits');
  try { await assertDirectoryNoSymlink(commitsDirectory); } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const names = (await readdir(commitsDirectory).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  })).filter(name => formal.test(name)).sort();
  const objectStore = createStateObjectStore({ rootDirectory });
  const records = []; let previous = null;
  for (const [index, name] of names.entries()) {
    let record;
    try {
      await assertRegularFileNoSymlink(join(commitsDirectory, name));
      record = parseStrictJson(await readFile(join(commitsDirectory, name)), name);
      validateContract('STAGE_COMMIT_RECORD', 1, record);
      if (record.state.gate.status === 'APPROVED')
        throw new ContractError('STATE_APPROVAL_ENGINE_UNAVAILABLE', 'P3 cannot recover APPROVED before P4');
      assertStageState(record.state, { approvalBindingVerified: record.state.gate.status !== 'APPROVED' });
      assertRecordPayload(record);
    } catch (error) {
      if (['STATE_COMMIT_CORRUPT', 'STATE_STORAGE_SYMLINK', 'STATE_APPROVAL_ENGINE_UNAVAILABLE'].includes(error.code)) throw error;
      throw corrupt(`Invalid Commit Record ${name}: ${error.message}`);
    }
    const expectedSequence = index + 1;
    if (record.sequence !== expectedSequence || name !== `${String(expectedSequence).padStart(12, '0')}.json`)
      throw corrupt('Commit sequence is not contiguous');
    if (computeCommitDigest(record) !== record.commitDigest) throw corrupt('Commit Record digest mismatch');
    if (record.previous.sequence !== (previous?.sequence ?? 0) ||
        record.previous.commitDigest !== (previous?.commitDigest ?? null)) throw corrupt('Commit predecessor mismatch');
    if (previous && (record.runId !== previous.runId || record.stageId !== previous.stageId ||
        record.contextDigest !== previous.contextDigest || record.schemaBundleDigest !== previous.schemaBundleDigest ||
        record.mode !== previous.mode || record.requestScope.scopeDigest !== previous.requestScope.scopeDigest))
      throw corrupt('Commit chain binding changed');
    for (const reference of record.objects) await objectStore.verify(reference);
    records.push(record); previous = record;
  }
  return records;
}

export function checkpointFromRecord(record) {
  const checkpoint = { kind: 'STAGE_CHECKPOINT', schemaVersion: 1, producer: 'STATE_RECOVERY',
    mode: record.mode, runId: record.runId, stageId: record.stageId, attemptId: record.attemptId,
    sequence: record.sequence, commitDigest: record.commitDigest, contextDigest: record.contextDigest,
    schemaBundleDigest: record.schemaBundleDigest, workerStop: { ...record.workerStop },
    requestScope: structuredClone(record.requestScope),
    state: structuredClone(record.state), nextAction: record.nextAction,
    errors: record.errors.map(item => ({ ...item })), objects: record.objects.map(item => ({ ...item })) };
  validateContract('STAGE_CHECKPOINT', 1, checkpoint);
  return Object.freeze(checkpoint);
}

export async function recoverStage({ rootDirectory, repairProjections = false }) {
  const records = await readCommitChain({ rootDirectory });
  if (records.length === 0) return Object.freeze({ records, checkpoint: null, projection: null });
  const latest = records.at(-1); const checkpoint = checkpointFromRecord(latest);
  const projection = projectLegacyManifest({ state: checkpoint.state, requestScope: checkpoint.requestScope,
    ...projectionMetadataFromRecord(latest) });
  if (repairProjections) {
    await ensureDirectoryTree(rootDirectory, ['projections']);
    await writeAtomicFile(join(rootDirectory, 'HEAD'), Buffer.from(`${canonicalJson({ sequence: latest.sequence,
      commitDigest: latest.commitDigest })}\n`));
    await writeAtomicFile(join(rootDirectory, 'projections/manifest.json'), Buffer.from(`${canonicalJson(projection)}\n`));
  }
  return Object.freeze({ records, checkpoint, projection });
}
