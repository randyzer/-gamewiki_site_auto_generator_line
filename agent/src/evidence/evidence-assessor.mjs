import { createHash } from 'node:crypto';
import { canonicalJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { assertEvidencePlan, assertSameEvidenceBinding } from './evidence-contracts.mjs';
import { readVerifiedHostObservations } from './host-observation-store.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const successfulAccessResults = new Set(['HTTP_200', 'TOOL_SUCCESS']);
const descriptorKey = value => canonicalJson({ path: value.path, url: value.url,
  sha256: value.sha256, accessResult: value.accessResult, sourceType: value.sourceType,
  criterionIds: value.criterionIds });

function assertObservationBinding(plan, observation) {
  validateContract('HOST_OBSERVATION', 1, observation);
  assertSameEvidenceBinding(plan, observation, 'Host Observation');
  const task = plan.tasks.find(item => item.taskId === observation.taskId);
  if (!task || task.tool !== observation.tool || task.target !== observation.target ||
      observation.namespace !== plan.namespace || observation.evidenceMode !== plan.evidenceMode)
    throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Host Observation does not match an approved task');
  if (observation.endedAtMs < observation.startedAtMs)
    throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Host Observation time range is invalid');
  if (observation.accessResult === 'HTTP_429' && observation.stopCondition !== 'SERVICE_RESTRICTED')
    throw new ContractError('CONTRACT_SCHEMA_INVALID',
      'HTTP_429 Host Observation must carry SERVICE_RESTRICTED');
  return task;
}

async function verifyDescriptor({ descriptor, observation, task, criterion, artifactReader, nowMs }) {
  if (!observation || !observation.artifacts.some(item => descriptorKey(item) === descriptorKey(descriptor)))
    return { verified: false, reason: 'No exactly matching T2 Host Observation.', observationIds: [] };
  if (!descriptor.criterionIds.includes(criterion.criterionId) ||
      !observation.criterionIds.includes(criterion.criterionId))
    return { verified: false, reason: 'Observation does not support this criterion ID.', observationIds: [] };
  if (!successfulAccessResults.has(descriptor.accessResult) ||
      !successfulAccessResults.has(observation.accessResult))
    return { verified: false, reason: 'Failed access results cannot support a fact criterion.', observationIds: [] };
  if (!task.sourceTypes.includes(descriptor.sourceType))
    return { verified: false, reason: 'Source type is outside the approved task.', observationIds: [] };
  if (criterion.requiresCurrentAccess && nowMs - observation.endedAtMs > criterion.maxAgeMs)
    return { verified: false, reason: 'Host Observation is older than the approved criterion window.', observationIds: [] };
  const bytes = await artifactReader(descriptor.path);
  if (sha256(bytes) !== descriptor.sha256)
    throw new ContractError('CONTRACT_DIGEST_MISMATCH', `Evidence bytes do not match: ${descriptor.path}`);
  if (criterion.requiresBody && bytes.length === 0)
    return { verified: false, reason: 'Criterion requires a non-empty source body.', observationIds: [] };
  return { verified: true, reason: 'Claim, Host Observation, artifact hash and criterion ID match.',
    observationIds: [observation.observationId] };
}

export async function assessEvidence(input) {
  if (Object.hasOwn(input, 'observations'))
    throw new ContractError('TRUST_LEVEL_INSUFFICIENT',
      'Plain Observation objects cannot self-assert T2 provenance');
  const { plan, claim, observationStore, observationReferences = [], artifactReader,
    nowMs = Date.now(), expectedEvidenceMode = plan?.evidenceMode } = input;
  assertEvidencePlan(plan);
  validateContract('EVIDENCE_CLAIM', 3, claim);
  assertSameEvidenceBinding(plan, claim, 'Evidence Claim');
  const observations = observationReferences.length > 0 ?
    await readVerifiedHostObservations(observationStore, observationReferences) : [];
  if (expectedEvidenceMode !== plan.evidenceMode ||
      observations.some(item => item.evidenceMode !== expectedEvidenceMode))
    throw new ContractError('TRUST_LEVEL_INSUFFICIENT',
      'Simulated and production evidence namespaces cannot be mixed');
  const observationByTask = new Map();
  for (const observation of observations) {
    assertObservationBinding(plan, observation);
    if (observationByTask.has(observation.taskId))
      throw new ContractError('CONTRACT_SCHEMA_INVALID', 'Only one observation per task is accepted in P2');
    observationByTask.set(observation.taskId, observation);
  }
  const claimByTask = new Map(claim.tasks.map(item => [item.taskId, item]));
  if (claimByTask.size !== claim.tasks.length)
    throw new ContractError('CONTRACT_SCHEMA_INVALID', 'Evidence Claim contains duplicate task identities');
  for (const taskId of claimByTask.keys()) {
    if (!plan.tasks.some(item => item.taskId === taskId))
      throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Claim includes an unapproved task');
  }
  const tasks = [];
  for (const task of plan.tasks) {
    const taskClaim = claimByTask.get(task.taskId);
    const observation = observationByTask.get(task.taskId);
    if (observation && observation.endedAtMs > nowMs)
      throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Host Observation is from the future');
    const criteria = [];
    for (const criterion of task.criteria) {
      let result = { verified: false, reason: 'No bound Worker Claim and T2 Host Observation.', observationIds: [] };
      if (taskClaim && observation) {
        const descriptors = taskClaim.evidence.filter(item => item.criterionIds.includes(criterion.criterionId));
        for (const descriptor of descriptors) {
          result = await verifyDescriptor({ descriptor, observation, task, criterion, artifactReader, nowMs });
          if (result.verified) break;
        }
      }
      criteria.push({ criterionId: criterion.criterionId,
        status: result.verified ? 'VERIFIED' : 'UNVERIFIED', reason: result.reason,
        observationIds: result.observationIds });
    }
    const verified = criteria.filter(item => item.status === 'VERIFIED').length;
    tasks.push({ taskId: task.taskId, classification: verified === criteria.length ? 'GAP_RESOLVED' :
      verified > 0 ? 'PARTIAL_PROGRESS' : 'NO_PROGRESS', criteria });
  }
  const outcome = { kind: 'EVIDENCE_OUTCOME', schemaVersion: 3,
    producer: 'EVIDENCE_ASSESSOR', trustLevel: 'T3', evidenceMode: plan.evidenceMode,
    runId: plan.runId, stageId: plan.stageId, attemptId: plan.attemptId,
    contextDigest: plan.contextDigest, recoveryDigest: plan.recoveryDigest,
    policyVersion: plan.policyVersion, planDigest: plan.planDigest, tasks,
    diagnostics: claim.sourceFormat === 'LEGACY_V2_ADAPTED' ?
      ['LEGACY_CLAIM_REMAINS_T0'] : [] };
  validateContract('EVIDENCE_OUTCOME', 3, outcome);
  return outcome;
}
