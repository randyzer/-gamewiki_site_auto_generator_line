import { createHash } from 'node:crypto';
import { canonicalJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { createCriterionId, createTaskId } from './task-identity.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const bindingKeys = ['runId', 'stageId', 'attemptId', 'contextDigest', 'recoveryDigest', 'policyVersion'];
const binding = input => Object.fromEntries(bindingKeys.map(key => [key, input[key]]));

function unique(values, label) {
  if (new Set(values).size !== values.length) {
    throw new ContractError('CONTRACT_SCHEMA_INVALID', `Duplicate ${label}`);
  }
}

export function computeEvidencePlanDigest(plan) {
  const { planDigest: ignored, ...payload } = plan;
  return sha256(`AGENT_EVIDENCE_PLAN_V3\n${canonicalJson(payload)}`);
}

export function createEvidencePlan(input) {
  const common = binding(input);
  const tasks = input.tasks.map(task => {
    const criteria = task.criteria.map(criterion => {
      const expected = createCriterionId({ gapId: task.gapId, statement: criterion.statement });
      if (criterion.criterionId !== expected) {
        throw new ContractError('CONTRACT_BINDING_MISMATCH',
          `Criterion identity does not match its gap and statement: ${criterion.criterionId}`);
      }
      return { ...criterion };
    });
    unique(criteria.map(item => item.criterionId), 'criterion identity');
    return { taskId: createTaskId({ ...common, keyword: task.keyword, gapId: task.gapId,
      tool: task.tool, target: task.target }), keyword: task.keyword, gapId: task.gapId,
    tool: task.tool, target: task.target, sourceTypes: [...task.sourceTypes],
    budgetUnits: task.budgetUnits, criteria };
  });
  unique(tasks.map(task => task.taskId), 'task identity');
  const withoutDigest = { kind: 'EVIDENCE_PLAN', schemaVersion: 3, producer: 'HOST_PLAN_BUILDER',
    trustLevel: 'T1', evidenceMode: input.evidenceMode, namespace: input.namespace,
    ...common, serviceDecisions: input.serviceDecisions.map(item => ({ ...item })), tasks };
  const plan = { ...withoutDigest, planDigest: computeEvidencePlanDigest(withoutDigest) };
  validateContract('EVIDENCE_PLAN', 3, plan);
  return plan;
}

export function assertEvidencePlan(plan) {
  validateContract('EVIDENCE_PLAN', 3, plan);
  if (computeEvidencePlanDigest(plan) !== plan.planDigest) {
    throw new ContractError('CONTRACT_DIGEST_MISMATCH', 'Evidence Plan digest does not match its payload');
  }
  for (const task of plan.tasks) {
    const expected = createTaskId({ ...plan, keyword: task.keyword, gapId: task.gapId,
      tool: task.tool, target: task.target });
    if (task.taskId !== expected) throw new ContractError('CONTRACT_BINDING_MISMATCH',
      `Task identity is invalid: ${task.taskId}`);
    for (const criterion of task.criteria) {
      if (criterion.criterionId !== createCriterionId({ gapId: task.gapId, statement: criterion.statement }))
        throw new ContractError('CONTRACT_BINDING_MISMATCH',
          `Criterion identity is invalid: ${criterion.criterionId}`);
    }
  }
  return plan;
}

export function createEvidenceClaim(input) {
  for (const task of input.tasks) {
    if (!Array.isArray(task.evidence))
      throw new ContractError('CONTRACT_SCHEMA_INVALID', 'Claim evidence must be an array');
    for (const item of task.evidence) {
      if (typeof item.path !== 'string' || !item.path.startsWith('evidence/') ||
          item.path.startsWith('/') || item.path.includes('\\') ||
          item.path.split('/').some(part => !part || part === '.' || part === '..'))
        throw new ContractError('CONTRACT_PATH_INVALID', `Invalid Evidence path: ${String(item.path)}`);
    }
  }
  const claim = { kind: 'EVIDENCE_CLAIM', schemaVersion: 3, producer: 'WORKER', trustLevel: 'T0',
    ...binding(input), planDigest: input.planDigest, sourceFormat: input.sourceFormat,
    tasks: input.tasks.map(task => ({ taskId: task.taskId, attempted: task.attempted,
      evidence: task.evidence.map(item => ({ ...item, criterionIds: [...item.criterionIds] })),
      stopCondition: task.stopCondition })), diagnostics: [...input.diagnostics] };
  validateContract('EVIDENCE_CLAIM', 3, claim);
  unique(claim.tasks.map(task => task.taskId), 'Claim task identity');
  return claim;
}

export function contractBinding(value) {
  return { ...binding(value), planDigest: value.planDigest };
}

export function assertSameEvidenceBinding(expected, actual, label) {
  for (const [key, value] of Object.entries(contractBinding(expected))) {
    if (actual[key] !== value) throw new ContractError('CONTRACT_BINDING_MISMATCH',
      `${label} does not match ${key}`, { field: key });
  }
}
