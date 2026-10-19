import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { assertOfflineContextBinderObservationStore, assertTrustedOfflineContextBinding,
  revalidateOfflineContextBinding } from './production-context-binding.mjs';
import { assertTrustedOfflineObservationRecord } from './production-observation-store.mjs';
import { homepageReplayPayloadDigest, replayHomepageResearch } from './adapters/homepage-research.mjs';
import { createStageGateBinding } from './stage-feature-gates.mjs';

const INPUT_KEYS = Object.freeze(['observationRecord', 'contextBinding', 'canonicalStageId', 'fixturePayload']);
const FIXTURE_KEYS = Object.freeze(['fixtureManifest', 'sourceFiles', 'derivedFiles', 'zipBytes']);
const provenanceStateByInstance = new WeakMap();
const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort())) {
    fail('CONTRACT_INVALID', `${label} has unsupported fields`);
  }
  return value;
}

function copyBytes(value, label) {
  if (!(Buffer.isBuffer(value) || value instanceof Uint8Array))
    fail('CONTRACT_INVALID', `${label} must contain bytes`);
  return Buffer.from(value);
}

function copyByteCollection(value, label) {
  const entries = value instanceof Map ? [...value.entries()] :
    value && Object.getPrototypeOf(value) === Object.prototype ? Object.entries(value) : null;
  if (!entries) fail('CONTRACT_INVALID', `${label} must be a Map or plain object`);
  return new Map(entries.map(([path, bytes]) => {
    if (typeof path !== 'string' || !path) fail('CONTRACT_INVALID', `${label} path must be a non-empty string`);
    return [path, copyBytes(bytes, `${label}.${path}`)];
  }));
}

function snapshotFixture(rawFixture) {
  const fixture = exactObject(rawFixture, FIXTURE_KEYS, 'Homepage fixture payload');
  let fixtureManifest;
  try { fixtureManifest = JSON.parse(canonicalJson(fixture.fixtureManifest)); }
  catch { fail('CONTRACT_INVALID', 'Homepage fixture manifest must be canonical JSON'); }
  return {
    fixtureManifest: deepFreeze(fixtureManifest),
    sourceFiles: copyByteCollection(fixture.sourceFiles, 'sourceFiles'),
    derivedFiles: copyByteCollection(fixture.derivedFiles, 'derivedFiles'),
    zipBytes: copyBytes(fixture.zipBytes, 'zipBytes'),
  };
}

function sameIdentity(record, binding, canonicalStageId) {
  return record.identity.runId === binding.runId &&
    record.identity.canonicalStageId === canonicalStageId &&
    record.identity.canonicalStageId === binding.canonicalStageId &&
    record.identity.attemptId === binding.attemptId &&
    record.recordDigest === binding.observationRecordDigest;
}

async function executeTrustedHomepage({ observationStore, contextBinder, observationRecord,
  contextBinding, canonicalStageId, fixturePayload }) {
  assertTrustedOfflineObservationRecord(observationStore, observationRecord);
  assertTrustedOfflineContextBinding(contextBinder, contextBinding);
  if (canonicalStageId !== 'homepage-research')
    fail('POLICY_DENIED', 'Offline stage-result provenance only permits homepage-research');
  const currentRecord = await observationStore.read(observationRecord.identity);
  if (currentRecord.recordDigest !== observationRecord.recordDigest)
    fail('OBSERVATION_HISTORY_UNAVAILABLE', 'Observation record changed before adapter execution');
  await revalidateOfflineContextBinding(contextBinder, contextBinding);
  if (!sameIdentity(currentRecord, contextBinding, canonicalStageId))
    fail('IDENTITY_MISMATCH', 'Stage-result provenance identity does not match its trusted context');
  if (contextBinding.bindingStatus !== 'VERIFIED' ||
      contextBinding.verificationScope !== 'OFFLINE_SIMULATED' || contextBinding.authoritative !== false)
    fail('TRUST_LEVEL_INSUFFICIENT', 'A complete offline context binding is required');
  if (contextBinding.executionContext?.code?.featureGate !== 'legacy')
    fail('POLICY_DENIED', 'Offline stage-result provenance requires the legacy feature gate');
  if (fixturePayload.fixtureManifest.sourceRunId !== currentRecord.identity.runId)
    fail('CONTRACT_BINDING_MISMATCH', 'Homepage fixture belongs to another run');

  const gateBinding = createStageGateBinding({ runId: currentRecord.identity.runId, canonicalStageId,
    mappingVersion: contextBinding.mappingVersion, contextDigest: contextBinding.executionContextDigest,
    featureGate: 'legacy' });
  const gateBindingDigest = digest('AGENT_STAGE_GATE_BINDING_V1', gateBinding);
  const adapterInput = deepFreeze({ kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1,
    producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE', runId: currentRecord.identity.runId,
    canonicalStageId, mappingVersion: contextBinding.mappingVersion,
    contextDigest: contextBinding.executionContextDigest, featureGate: 'legacy', gateBindingDigest,
    payloadDigest: homepageReplayPayloadDigest(fixturePayload) });
  const replay = replayHomepageResearch({ ...fixturePayload, requestedCapabilities: [], adapterInput });
  const adapterInputDigest = digest('AGENT_STAGE_ADAPTER_INPUT_V1', adapterInput);
  if (replay.stageResult.inputDigest !== adapterInputDigest)
    fail('CONTRACT_DIGEST_MISMATCH', 'Homepage adapter input digest does not match its result');
  return { currentRecord, gateBindingDigest, adapterInputDigest,
    stageResultDigest: digest('AGENT_P6_D_STAGE_RESULT_V1', replay.stageResult),
    stageResult: replay.stageResult };
}

function resultBase({ currentRecord, contextBinding, adapterInputDigest, stageResultDigest, stageResult }) {
  return { kind: 'OFFLINE_TRUSTED_STAGE_RESULT', schemaVersion: 1, authoritative: false,
    verificationScope: 'OFFLINE_SIMULATED', runId: currentRecord.identity.runId,
    canonicalStageId: 'homepage-research', attemptId: currentRecord.identity.attemptId,
    mappingVersion: contextBinding.mappingVersion, observationRecordDigest: currentRecord.recordDigest,
    contextBindingDigest: contextBinding.bindingDigest,
    executionContextDigest: contextBinding.executionContextDigest,
    adapterId: 'homepage-research', adapterContractVersion: 1, adapterInputDigest,
    stageResultDigest, resultStatus: stageResult.status, provenanceStatus: 'VERIFIED', stageResult };
}

function provenanceDigest(base, gateBindingDigest) {
  return digest('AGENT_P6_D_STAGE_RESULT_PROVENANCE_V1', { ...base, gateBindingDigest });
}

export function assertTrustedOfflineStageResultProvenance(provenance) {
  if (!provenanceStateByInstance.has(provenance))
    fail('TRUST_LEVEL_INSUFFICIENT', 'A trusted offline stage-result provenance instance is required');
  return provenance;
}

export function assertOfflineStageResultProvenanceAuthority(provenance, observationStore, contextBinder) {
  const state = provenanceStateByInstance.get(provenance);
  if (!state || state.observationStore !== observationStore || state.contextBinder !== contextBinder) {
    fail('TRUST_LEVEL_INSUFFICIENT', 'Stage-result provenance must share the comparator authority');
  }
  return provenance;
}

export function createOfflineStageResultProvenance({ observationStore, contextBinder } = {}) {
  if (!observationStore || typeof observationStore !== 'object')
    fail('TRUST_LEVEL_INSUFFICIENT', 'A trusted observation store is required');
  if (!contextBinder || typeof contextBinder !== 'object')
    fail('TRUST_LEVEL_INSUFFICIENT', 'A trusted context binder is required');
  assertOfflineContextBinderObservationStore(contextBinder, observationStore);
  const results = new WeakMap();
  const provenance = Object.freeze({
    async run(rawInput) {
      const input = exactObject(rawInput, INPUT_KEYS, 'Stage-result provenance input');
      const fixturePayload = snapshotFixture(input.fixturePayload);
      const executed = await executeTrustedHomepage({ observationStore, contextBinder,
        observationRecord: input.observationRecord, contextBinding: input.contextBinding,
        canonicalStageId: input.canonicalStageId, fixturePayload });
      const base = resultBase({ ...executed, contextBinding: input.contextBinding });
      const result = deepFreeze({ ...base,
        provenanceDigest: provenanceDigest(base, executed.gateBindingDigest) });
      results.set(result, { observationRecord: input.observationRecord,
        contextBinding: input.contextBinding, fixturePayload, canonicalStageId: input.canonicalStageId });
      return result;
    },
    assertTrustedResult(result) {
      if (!provenanceStateByInstance.get(provenance)?.results.has(result))
        fail('TRUST_LEVEL_INSUFFICIENT', 'A trusted stage result from the current provenance instance is required');
      return result;
    },
    async revalidateResult(result) {
      provenance.assertTrustedResult(result);
      const metadata = results.get(result);
      const executed = await executeTrustedHomepage({ observationStore, contextBinder,
        observationRecord: metadata.observationRecord, contextBinding: metadata.contextBinding,
        canonicalStageId: metadata.canonicalStageId, fixturePayload: metadata.fixturePayload });
      const base = resultBase({ ...executed, contextBinding: metadata.contextBinding });
      const rebuiltDigest = provenanceDigest(base, executed.gateBindingDigest);
      const { provenanceDigest: ignored, ...existingBase } = result;
      if (canonicalJson(base) !== canonicalJson(existingBase) ||
          rebuiltDigest !== result.provenanceDigest) {
        fail('CONTRACT_DIGEST_MISMATCH', 'Trusted stage-result provenance changed after it was created');
      }
      return result;
    },
  });
  provenanceStateByInstance.set(provenance, { observationStore, contextBinder, results });
  return provenance;
}
