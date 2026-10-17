import { ContractError } from '../contracts/errors.mjs';
import { canonicalJson } from '../contracts/canonical-json.mjs';

const serviceByTool = Object.freeze({
  'youtube-subtitles': 'youtube-subtitles',
  'steam-community': 'steam-community',
});

export function createResearchToolPolicy(snapshot) {
  const allowedTools = new Set(snapshot.allowedTools);
  const allowedTargets = new Set(snapshot.allowedTargets);
  const decisions = new Map(snapshot.serviceDecisions.map(item => [item.service, item.decision]));
  const runtimeStops = new Set();
  let consumedBudget = 0;

  return Object.freeze({
    policyVersion: snapshot.policyVersion,
    assertPlan(plan) {
      if (plan.policyVersion !== snapshot.policyVersion ||
          canonicalJson(plan.serviceDecisions) !== canonicalJson(snapshot.serviceDecisions))
        throw new ContractError('CONTRACT_BINDING_MISMATCH',
          'Research Policy snapshot does not match the Evidence Plan');
    },
    authorize({ task, adapterId, authorization }) {
      if (adapterId !== task.tool || !allowedTools.has(task.tool) || !allowedTargets.has(task.target))
        throw new ContractError('POLICY_DENIED', 'The requested tool or target is outside the approved plan');
      if (authorization?.purpose !== 'RUN_EXECUTION')
        throw new ContractError('POLICY_DENIED', 'RUN_EXECUTION authorization is required');
      const service = serviceByTool[task.tool];
      const decision = service ? decisions.get(service) : null;
      if (service && (decision === 'PAUSED' || runtimeStops.has(service)))
        throw new ContractError('SERVICE_PAUSED', `Service is paused: ${service}`, { service });
      if (service && decision === 'RESUME_APPROVED' &&
          !authorization.serviceResumes?.includes(service))
        throw new ContractError('POLICY_DENIED', `SERVICE_RESUME authorization is required: ${service}`);
      if (consumedBudget + task.budgetUnits > snapshot.budgetUnits)
        throw new ContractError('BUDGET_EXHAUSTED', 'Approved research budget is exhausted');
      consumedBudget += task.budgetUnits;
    },
    record({ task, accessResult }) {
      const service = serviceByTool[task.tool];
      if (service && accessResult === 'HTTP_429') runtimeStops.add(service);
    },
    snapshot() {
      return { consumedBudget, runtimeStops: [...runtimeStops].sort() };
    },
  });
}
