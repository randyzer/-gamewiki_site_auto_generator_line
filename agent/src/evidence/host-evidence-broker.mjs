import { createHash } from 'node:crypto';
import { canonicalJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { assertEvidencePlan } from './evidence-contracts.mjs';
import { createHostObservationStore } from './host-observation-store.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const brokerAuthorities = new WeakSet();

export function isHostEvidenceBrokerAuthority(value) {
  return value !== null && typeof value === 'object' && brokerAuthorities.has(value);
}

function normalizedArtifacts(result, task) {
  const approvedCriteria = new Set(task.criteria.map(item => item.criterionId));
  return (result.artifacts ?? []).map(item => {
    if (item.url !== task.target || !task.sourceTypes.includes(item.sourceType) ||
        !Array.isArray(item.criterionIds) || item.criterionIds.some(id => !approvedCriteria.has(id)))
      throw new ContractError('CONTRACT_BINDING_MISMATCH',
        'Tool Adapter artifact is outside the approved task contract');
    const bytes = Buffer.isBuffer(item.bytes) ? item.bytes : Buffer.from(item.bytes ?? '');
    return { path: item.path, url: item.url, sha256: sha256(bytes),
      accessResult: result.accessResult, sourceType: item.sourceType,
      criterionIds: [...item.criterionIds] };
  });
}

async function observeApprovedTask({ plan, task, authorization, toolAdapter,
  policy, appendObservation, nowMs = Date.now }) {
  assertEvidencePlan(plan);
  if (plan.evidenceMode !== 'SIMULATED' || !plan.namespace.startsWith('simulation/'))
    throw new ContractError('TRUST_LEVEL_INSUFFICIENT',
      'P2 Host Evidence Broker accepts simulated plans only');
  const approved = plan.tasks.find(item => item.taskId === task.taskId);
  if (!approved || canonicalJson(approved) !== canonicalJson(task))
    throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Task is not the approved Plan task');
  if (authorization?.contextDigest !== plan.contextDigest)
    throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Authorization context does not match Plan');
  if (!toolAdapter || toolAdapter.kind !== 'FAKE_TOOL_ADAPTER' ||
      toolAdapter.evidenceMode !== 'SIMULATED' || typeof toolAdapter.execute !== 'function')
    throw new ContractError('POLICY_DENIED', 'An explicitly injected tool adapter is required');
  policy.assertPlan(plan);
  policy.authorize({ task, adapterId: toolAdapter.id, authorization });
  const startedAtMs = nowMs();
  const result = await toolAdapter.execute({ task, authorization: {
    purpose: authorization.purpose, serviceResumes: authorization.serviceResumes ?? [],
  } });
  if (!result || typeof result !== 'object' || typeof result.accessResult !== 'string' ||
      !Array.isArray(result.artifacts))
    throw new ContractError('CONTRACT_SCHEMA_INVALID', 'Tool Adapter returned an invalid result');
  policy.record({ task, accessResult: result.accessResult });
  const endedAtMs = nowMs();
  const artifacts = normalizedArtifacts(result, task);
  const criterionIds = [...new Set(artifacts.flatMap(item => item.criterionIds))].sort();
  const base = { kind: 'HOST_OBSERVATION', schemaVersion: 1,
    producer: 'HOST_EVIDENCE_BROKER', trustLevel: 'T2', evidenceMode: plan.evidenceMode,
    namespace: plan.namespace, runId: plan.runId, stageId: plan.stageId,
    attemptId: plan.attemptId, contextDigest: plan.contextDigest,
    recoveryDigest: plan.recoveryDigest, policyVersion: plan.policyVersion,
    planDigest: plan.planDigest, taskId: task.taskId, tool: task.tool, target: task.target,
    startedAtMs, endedAtMs, accessResult: result.accessResult, artifacts, criterionIds };
  if (result.accessResult === 'HTTP_429') base.stopCondition = 'SERVICE_RESTRICTED';
  else if (result.stopCondition) base.stopCondition = result.stopCondition;
  const observationId = `obs-${sha256(`AGENT_HOST_OBSERVATION_V1\n${canonicalJson(base)}`).slice(0, 24)}`;
  const observation = { ...base, observationId };
  validateContract('HOST_OBSERVATION', 1, observation);
  const reference = await appendObservation(observation);
  return reference;
}

export function createHostEvidenceBroker(storeOptions) {
  const authority = Object.freeze({});
  brokerAuthorities.add(authority);
  const { store: observationStore, append } = createHostObservationStore({
    ...storeOptions, brokerAuthority: authority,
  });
  return Object.freeze({
    observationStore,
    observe(input) {
      return observeApprovedTask({ ...input, appendObservation: append });
    },
  });
}
