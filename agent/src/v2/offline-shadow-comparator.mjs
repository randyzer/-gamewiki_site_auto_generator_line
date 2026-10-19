import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { assertTrustedOfflineContextBinding,
  revalidateOfflineContextBinding } from './production-context-binding.mjs';
import { assertTrustedOfflineObservationRecord } from './production-observation-store.mjs';
import { assertOfflineStageResultProvenanceAuthority } from './offline-stage-result-provenance.mjs';

const INPUT_KEYS = Object.freeze(['observationRecord', 'contextBinding', 'v2Projection', 'fixtureEvidence']);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };

function exactInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !INPUT_KEYS.includes(key)) ||
      !Object.hasOwn(value, 'observationRecord') || !Object.hasOwn(value, 'contextBinding')) {
    fail('CONTRACT_INVALID', 'Offline shadow comparator input has unsupported fields');
  }
  return value;
}

function sameIdentity(record, binding) {
  return record.identity.runId === binding.runId &&
    record.identity.canonicalStageId === binding.canonicalStageId &&
    record.identity.attemptId === binding.attemptId &&
    record.recordDigest === binding.observationRecordDigest;
}

export function createOfflineShadowEvidenceComparator({ observationStore, contextBinder,
  stageResultProvenance } = {}) {
  if (!observationStore || typeof observationStore !== 'object')
    fail('TRUST_LEVEL_INSUFFICIENT', 'A trusted observation store is required');
  if (!contextBinder || typeof contextBinder !== 'object')
    fail('TRUST_LEVEL_INSUFFICIENT', 'A trusted context binder is required');
  if (stageResultProvenance !== undefined)
    assertOfflineStageResultProvenanceAuthority(stageResultProvenance, observationStore, contextBinder);
  return Object.freeze({
    async compare(rawInput) {
      const input = exactInput(rawInput);
      const { observationRecord, contextBinding } = input;
      assertTrustedOfflineObservationRecord(observationStore, observationRecord);
      assertTrustedOfflineContextBinding(contextBinder, contextBinding);
      const currentRecord = await observationStore.read(observationRecord.identity);
      if (currentRecord.recordDigest !== observationRecord.recordDigest)
        fail('OBSERVATION_HISTORY_UNAVAILABLE', 'Observation record changed before readiness evaluation');
      await revalidateOfflineContextBinding(contextBinder, contextBinding);
      if (!sameIdentity(currentRecord, contextBinding))
        fail('IDENTITY_MISMATCH', 'Context binding does not match the observation record');
      if (contextBinding.executionContext?.code?.featureGate !== undefined &&
          contextBinding.executionContext.code.featureGate !== 'legacy')
        fail('POLICY_DENIED', 'Offline readiness requires the legacy feature gate');

      let trustedStageResult = false;
      let trustedProjection = null;
      if (input.v2Projection !== undefined && input.v2Projection !== null && stageResultProvenance) {
        try {
          stageResultProvenance.assertTrustedResult(input.v2Projection);
          trustedProjection = await stageResultProvenance.revalidateResult(input.v2Projection);
          if (trustedProjection.runId !== currentRecord.identity.runId ||
              trustedProjection.canonicalStageId !== currentRecord.identity.canonicalStageId ||
              trustedProjection.attemptId !== currentRecord.identity.attemptId ||
              trustedProjection.mappingVersion !== contextBinding.mappingVersion ||
              trustedProjection.observationRecordDigest !== currentRecord.recordDigest ||
              trustedProjection.contextBindingDigest !== contextBinding.bindingDigest ||
              trustedProjection.executionContextDigest !== contextBinding.executionContextDigest) {
            fail('IDENTITY_MISMATCH', 'Trusted stage result does not match the readiness context');
          }
          trustedStageResult = true;
        } catch (error) {
          if (error?.code !== 'TRUST_LEVEL_INSUFFICIENT') throw error;
        }
      }

      const reasons = [];
      const missingEvidence = [];
      if (contextBinding.bindingStatus !== 'VERIFIED') {
        reasons.push('CONTEXT_SOURCE_INCOMPLETE');
        for (const section of contextBinding.missingSourceFields) {
          missingEvidence.push(`CONTEXT_SOURCE_MISSING:${section}`);
        }
      }
      if (input.v2Projection === undefined || input.v2Projection === null) {
        reasons.push('V2_STAGE_RESULT_MISSING');
        missingEvidence.push('TRUSTED_V2_STAGE_RESULT');
      } else if (!trustedStageResult) {
        reasons.push('UNTRUSTED_PROJECTION');
        missingEvidence.push('TRUSTED_V2_STAGE_RESULT');
      }
      if (input.fixtureEvidence === undefined || input.fixtureEvidence === null) {
        reasons.push('FIXTURE_CONTINUITY_UNPROVEN');
        missingEvidence.push('TRUSTED_REAL_FORMAT_FIXTURE');
      } else {
        reasons.push('UNTRUSTED_FIXTURE_EVIDENCE');
        missingEvidence.push('TRUSTED_REAL_FORMAT_FIXTURE');
      }
      reasons.sort();
      missingEvidence.sort();
      const base = { kind: 'OFFLINE_SHADOW_READINESS', schemaVersion: 1,
        authoritative: false, verificationScope: 'OFFLINE_SIMULATED',
        runId: currentRecord.identity.runId,
        canonicalStageId: currentRecord.identity.canonicalStageId,
        attemptId: currentRecord.identity.attemptId,
        mappingVersion: contextBinding.mappingVersion,
        observationRecordDigest: currentRecord.recordDigest,
        executionContextDigest: contextBinding.executionContextDigest,
        trustedStageResult, fixtureContinuityVerified: false,
        readinessStatus: 'INCOMPLETE', reasons, missingEvidence,
        stageResultCompared: false, decision: 'HOLD' };
      const digestPayload = { ...base, contextBindingDigest: contextBinding.bindingDigest,
        sourceEvidenceDigest: contextBinding.sourceEvidenceDigest,
        fixtureEvidenceDigest: null,
        stageResultProvenanceDigest: trustedProjection?.provenanceDigest ?? null,
        stageResultDigest: trustedProjection?.stageResultDigest ?? null };
      return deepFreeze({ ...base,
        readinessDigest: digest('AGENT_P6_C_OFFLINE_SHADOW_READINESS_V1', digestPayload) });
    },
  });
}
