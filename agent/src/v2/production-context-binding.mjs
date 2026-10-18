import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { isAbsolute, join, parse, resolve, sep } from 'node:path';
import { canonicalJson, deepFreeze, parseStrictJson } from '../contracts/canonical-json.mjs';
import { executionContextDigest } from '../contracts/context-digest.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { assertTrustedOfflineObservationRecord } from './production-observation-store.mjs';
import { STAGE_IDENTITY_MAPPING_VERSION, assertCanonicalStageId } from './stage-identity.mjs';

const SECTIONS = Object.freeze(['identity', 'code', 'inputs', 'execution', 'research', 'site']);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };
const isDigest = value => /^[a-f0-9]{64}$/.test(value ?? '');

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort())) {
    fail('CONTRACT_INVALID', `${label} has unsupported fields`);
  }
  return value;
}

function safeRelativePath(value) {
  return typeof value === 'string' && value.length > 0 && !isAbsolute(value) &&
    !value.includes('\\') && !value.split('/').some(part => part === '' || part === '.' || part === '..');
}

async function assertNoSymlinkComponents(root, path) {
  const rootPrefix = parse(root).root;
  let current = rootPrefix;
  const segments = [...root.slice(rootPrefix.length).split(sep).filter(Boolean), ...path.split('/')];
  for (const segment of segments) {
    current = join(current, segment);
    const metadata = await lstat(current);
    if (metadata.isSymbolicLink()) fail('STATE_STORAGE_SYMLINK', `Source path must not be a symlink: ${current}`);
  }
  return current;
}

async function readStableRegularFile(path, section) {
  let handle;
  try { handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW); }
  catch (error) {
    if (error.code === 'ELOOP') fail('STATE_STORAGE_SYMLINK', `${section} source must not be a symlink`);
    throw error;
  }
  try {
    const before = await handle.stat();
    if (!before.isFile()) fail('STATE_STORAGE_PATH_INVALID', `${section} source is not a regular file`);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size)
      fail('STATE_STORAGE_CHANGED', `${section} source changed while it was being read`);
    return bytes;
  } finally { await handle.close(); }
}

async function readSource(root, section, reference) {
  if (reference === undefined) return null;
  exactObject(reference, ['path', 'sha256'], `${section} source reference`);
  if (!safeRelativePath(reference.path)) fail('STATE_STORAGE_PATH_INVALID', `${section} source path is unsafe`);
  if (!isDigest(reference.sha256)) fail('CONTRACT_DIGEST_MISMATCH', `${section} source digest is invalid`);
  try {
    const path = await assertNoSymlinkComponents(root, reference.path);
    const bytes = await readStableRegularFile(path, section);
    if (sha256(bytes) !== reference.sha256) fail('CONTRACT_DIGEST_MISMATCH', `${section} source digest does not match`);
    return { value: parseStrictJson(bytes, path), evidence: { section, path: reference.path, sha256: reference.sha256 } };
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EACCES') return null;
    throw error;
  }
}

function validateIdentity(identity, record) {
  exactObject(identity, ['runId', 'stageId', 'attemptId', 'requestedOperation', 'mappingVersion'], 'Context identity');
  assertCanonicalStageId(identity.stageId, { mappingVersion: identity.mappingVersion });
  if (identity.mappingVersion !== STAGE_IDENTITY_MAPPING_VERSION ||
      identity.runId !== record.identity.runId || identity.stageId !== record.identity.canonicalStageId ||
      identity.attemptId !== record.identity.attemptId) {
    fail('IDENTITY_MISMATCH', 'Context identity does not match the observation record');
  }
}

function bindingDigestPayload(binding) {
  const { executionContext, bindingDigest, ...payload } = binding;
  return payload;
}

export function createOfflineContextBinder({ sourceRoot, observationStore } = {}) {
  if (typeof sourceRoot !== 'string' || !isAbsolute(sourceRoot))
    fail('STATE_STORAGE_PATH_INVALID', 'sourceRoot must be absolute');
  if (!observationStore || typeof observationStore !== 'object')
    fail('TRUST_LEVEL_INSUFFICIENT', 'A trusted observation store is required');
  const root = resolve(sourceRoot);
  return Object.freeze({
    async bind({ observationRecord, sources } = {}) {
      assertTrustedOfflineObservationRecord(observationStore, observationRecord);
      const currentRecord = await observationStore.read(observationRecord.identity);
      if (currentRecord.recordDigest !== observationRecord.recordDigest)
        fail('CONTRACT_DIGEST_MISMATCH', 'Observation record changed during context binding');
      observationRecord = currentRecord;
      if (!sources || typeof sources !== 'object' || Array.isArray(sources) ||
          Object.keys(sources).some(key => !SECTIONS.includes(key))) {
        fail('CONTRACT_INVALID', 'Context source map is invalid');
      }
      const loaded = {};
      const evidence = [];
      for (const section of SECTIONS) {
        const item = await readSource(root, section, sources[section]);
        if (item) { loaded[section] = item.value; evidence.push(item.evidence); }
      }
      const missingSourceFields = SECTIONS.filter(section => !(section in loaded)).sort();
      const sourceEvidenceDigest = digest('AGENT_P6_B_SOURCE_EVIDENCE_V1', {
        sources: evidence.sort((a, b) => a.section.localeCompare(b.section)), missingSourceFields,
      });
      let executionContext = null;
      let contextDigest = null;
      let schemaBundleDigest = null;
      let policyVersion = null;
      let bindingStatus = 'INCOMPLETE';
      if (missingSourceFields.length === 0) {
        validateIdentity(loaded.identity, observationRecord);
        if (loaded.code?.featureGate !== 'legacy')
          fail('POLICY_DENIED', 'Offline production context binding requires the legacy feature gate');
        if (loaded.site?.siteRevision !== observationRecord.snapshot.sourceRevision)
          fail('IDENTITY_MISMATCH', 'Site revision does not match the observation record');
        executionContext = { kind: 'EXECUTION_CONTEXT', schemaVersion: 1,
          runId: loaded.identity.runId, stageId: loaded.identity.stageId,
          attemptId: loaded.identity.attemptId, requestedOperation: loaded.identity.requestedOperation,
          code: loaded.code, inputs: loaded.inputs, execution: loaded.execution,
          research: loaded.research, site: loaded.site };
        validateContract('EXECUTION_CONTEXT', 1, executionContext);
        contextDigest = executionContextDigest(executionContext);
        schemaBundleDigest = loaded.code.schemaBundleDigest;
        policyVersion = loaded.code.policyVersion;
        bindingStatus = 'VERIFIED';
      }
      const base = { kind: 'LEGACY_V2_CONTEXT_BINDING', schemaVersion: 1,
        producer: 'P6_B_OFFLINE_CONTEXT_BINDER', authoritative: false,
        verificationScope: 'OFFLINE_SIMULATED', bindingStatus, missingSourceFields,
        runId: observationRecord.identity.runId,
        canonicalStageId: observationRecord.identity.canonicalStageId,
        attemptId: observationRecord.identity.attemptId,
        mappingVersion: STAGE_IDENTITY_MAPPING_VERSION,
        legacyInputDigest: observationRecord.snapshot.legacyInputDigest,
        legacyCheckpointDigest: observationRecord.snapshot.checkpointDigest,
        observationRecordDigest: observationRecord.recordDigest,
        executionContextDigest: contextDigest, sourceEvidenceDigest, schemaBundleDigest, policyVersion,
        executionContext };
      const bindingDigest = digest('AGENT_P6_B_CONTEXT_BINDING_V1', bindingDigestPayload(base));
      return deepFreeze({ ...base, bindingDigest });
    },
  });
}
