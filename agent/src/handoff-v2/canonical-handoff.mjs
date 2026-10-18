import { createHash } from 'node:crypto';
import { canonicalJson } from '../contracts/canonical-json.mjs';
import { deepFreeze } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { purposeContextDigest } from '../contracts/context-digest.mjs';
import { assertTrustedApprovalConsumption } from '../approval/approval-engine.mjs';

const trustedInputs = new WeakSet();
const trustedHandoffs = new WeakSet();
const sha256 = value => createHash('sha256').update(value).digest('hex');

export function createTestValidatedInputHarness() {
  return Object.freeze({ validate(input) {
    const required = ['runId', 'stageId', 'attemptId', 'contextDigest', 'schemaBundleDigest',
      'recoveryDigest', 'evidenceOutcomeDigest', 'siteRevision', 'domain', 'materials', 'pendingRows'];
    if (required.some(key => input[key] === undefined))
      throw new ContractError('HANDOFF_INPUT_INVALID', 'Validated input is incomplete');
    const ids = input.materials.map(item => item.keywordId);
    if (new Set(ids).size !== ids.length)
      throw new ContractError('HANDOFF_INPUT_INVALID', 'Validated material identifiers must be unique');
    for (const item of input.materials) {
      if (item.canonicalStatus !== 'COMPLETED' && item.gapIds.length === 0)
        throw new ContractError('HANDOFF_INPUT_INVALID', 'Partial and blocked materials require explicit gaps');
    }
    const base = { kind: 'VALIDATED_STAGE_RESULT', schemaVersion: 1,
      producer: 'SIMULATED_HOST_STAGE_VALIDATOR', mode: 'SIMULATED', ...structuredClone(input) };
    const value = { ...base, validationDigest: sha256(`AGENT_VALIDATED_STAGE_RESULT_V1\n${canonicalJson(base)}`) };
    validateContract('VALIDATED_STAGE_RESULT', 1, value);
    deepFreeze(value); trustedInputs.add(value); return value;
  } });
}

function disposition(material) {
  if (material.canonicalStatus === 'BLOCKED') return 'OMIT';
  if (material.canonicalStatus === 'PARTIAL') return 'DRAFT_ONLY';
  if (material.canonicalStatus === 'COMPLETED' && material.contentAccepted) return 'ELIGIBLE';
  return 'UNPROVEN';
}

function handoffDigest(value) {
  const { handoffDigest: ignored, authorizationStatus: ignoredStatus,
    approvalConsumptionDigest: ignoredConsumption, ...payload } = value;
  return sha256(`AGENT_RESEARCH_HANDOFF_V2\n${canonicalJson(payload)}`);
}

export function createCanonicalHandoff({ validatedInput, consumerStage }) {
  if (!trustedInputs.has(validatedInput))
    throw new ContractError('HANDOFF_INPUT_UNTRUSTED', 'Handoff requires a host-validated capability');
  const materials = validatedInput.materials.map(item => ({ keywordId: item.keywordId, keyword: item.keyword,
    canonicalStatus: item.canonicalStatus, gapIds: [...item.gapIds], sourceDigest: item.sourceDigest,
    publicationEligibility: disposition(item) }));
  const candidateCore = { kind: 'RESEARCH_HANDOFF', schemaVersion: 2, producer: 'CANONICAL_HANDOFF_BUILDER', mode: 'SIMULATED',
    runId: validatedInput.runId, stageId: validatedInput.stageId, attemptId: validatedInput.attemptId,
    consumerStage, contextDigest: validatedInput.contextDigest, schemaBundleDigest: validatedInput.schemaBundleDigest,
    recoveryDigest: validatedInput.recoveryDigest, evidenceOutcomeDigest: validatedInput.evidenceOutcomeDigest,
    validatedInputDigest: validatedInput.validationDigest, siteRevision: validatedInput.siteRevision,
    domain: validatedInput.domain, materials,
    pendingRows: [...validatedInput.pendingRows] };
  const approvalRequired = materials.some(item => item.publicationEligibility !== 'ELIGIBLE') ||
    candidateCore.pendingRows.length > 0;
  const base = { ...candidateCore,
    authorizationStatus: approvalRequired ? 'REQUIRED' : 'NOT_REQUIRED', approvalConsumptionDigest: null };
  const handoff = { ...base, handoffDigest: handoffDigest(base) };
  validateContract('RESEARCH_HANDOFF', 2, handoff);
  deepFreeze(handoff); trustedHandoffs.add(handoff); return handoff;
}

export function partialHandoffPurposePayload(candidate) {
  return Object.freeze({ producerStage: candidate.stageId, consumerStage: candidate.consumerStage,
    handoffDigest: candidate.handoffDigest, recoveryDigest: candidate.recoveryDigest });
}

export function authorizeCanonicalHandoff({ candidate, approvalConsumption }) {
  if (!trustedHandoffs.has(candidate))
    throw new ContractError('HANDOFF_CANDIDATE_UNTRUSTED', 'Partial approval requires a trusted handoff candidate');
  validateContract('RESEARCH_HANDOFF', 2, candidate);
  if (candidate.authorizationStatus !== 'REQUIRED')
    throw new ContractError('HANDOFF_APPROVAL_NOT_REQUIRED', 'Canonical handoff does not require partial approval');
  const consumption = assertTrustedApprovalConsumption(approvalConsumption);
  if (consumption.contextDigest !== candidate.contextDigest || consumption.purposeDigest !==
      purposeContextDigest(candidate.contextDigest, 'PARTIAL_HANDOFF', partialHandoffPurposePayload(candidate)))
    throw new ContractError('HANDOFF_APPROVAL_BINDING_MISMATCH', 'Partial approval does not bind this candidate');
  const handoff = { ...candidate, authorizationStatus: 'CONSUMED',
    approvalConsumptionDigest: consumption.consumptionDigest };
  validateContract('RESEARCH_HANDOFF', 2, handoff);
  if (handoffDigest(handoff) !== candidate.handoffDigest)
    throw new ContractError('HANDOFF_DIGEST_MISMATCH', 'Authorization changed the handoff payload');
  deepFreeze(handoff); trustedHandoffs.add(handoff); return handoff;
}

export function assertConsumableHandoff(handoff) {
  if (!trustedHandoffs.has(handoff))
    throw new ContractError('HANDOFF_UNTRUSTED', 'Canonical handoff was not produced by this host capability');
  validateContract('RESEARCH_HANDOFF', 2, handoff);
  if (handoffDigest(handoff) !== handoff.handoffDigest)
    throw new ContractError('HANDOFF_DIGEST_MISMATCH', 'Canonical handoff digest mismatch');
  if (handoff.authorizationStatus === 'REQUIRED')
    throw new ContractError('HANDOFF_APPROVAL_REQUIRED', 'Partial handoff requires consumed approval');
  return handoff;
}
