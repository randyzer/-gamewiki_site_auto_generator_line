import { isAbsolute, relative, resolve, sep } from 'node:path';
import { ContractError } from '../errors.mjs';
import { createEvidenceClaim, assertEvidencePlan } from '../../evidence/evidence-contracts.mjs';

const accessResults = Object.freeze({ 'HTTP 200': 'HTTP_200', 'HTTP 403': 'HTTP_403',
  'HTTP 429': 'HTTP_429', TOOL_SUCCESS: 'TOOL_SUCCESS' });

function relativeEvidencePath(path, boundNativeRoot, diagnostics) {
  if (!isAbsolute(path)) return path;
  const root = resolve(boundNativeRoot);
  const candidate = resolve(path);
  const result = relative(root, candidate).split(sep).join('/');
  if (!result || result.startsWith('../') || result === '..' || !result.startsWith('evidence/'))
    throw new ContractError('CONTRACT_PATH_INVALID', 'Legacy absolute path is outside the bound evidence root');
  diagnostics.push(`ABSOLUTE_PATH_NORMALIZED:${result}`);
  return result;
}

export function adaptKeywordEvidenceClaimsV2(source, { plan, boundNativeRoot }) {
  assertEvidencePlan(plan);
  if (source?.kind !== 'KEYWORD_EVIDENCE_CLAIMS_V2' || !Array.isArray(source.tasks))
    throw new ContractError('CONTRACT_INCOMPATIBLE', 'Expected KEYWORD_EVIDENCE_CLAIMS_V2');
  if (source.runId !== plan.runId || source.stage !== plan.stageId ||
      source.recoverySha256 !== plan.recoveryDigest)
    throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Legacy Claim run binding does not match Plan');
  const diagnostics = ['FIELD_RENAMED:keywordEvidencePlanSha256->planDigest'];
  const tasks = source.tasks.map(legacy => {
    const task = plan.tasks.find(item => item.keyword === legacy.keyword);
    if (!task) throw new ContractError('CONTRACT_BINDING_MISMATCH',
      `Legacy Claim task is not present in Plan: ${legacy.keyword}`);
    const evidence = legacy.evidence.map(item => {
      const accessResult = accessResults[item.accessResult];
      if (!accessResult) throw new ContractError('CONTRACT_INCOMPATIBLE',
        `Unsupported legacy access result: ${item.accessResult}`);
      if (accessResult !== item.accessResult)
        diagnostics.push(`ACCESS_RESULT_NORMALIZED:${item.accessResult}->${accessResult}`);
      const criterionIds = task.criteria.filter(criterion =>
        item.supportedFacts.includes(criterion.statement)).map(item => item.criterionId);
      return { path: relativeEvidencePath(item.path, boundNativeRoot, diagnostics),
        url: item.url, sha256: item.sha256, accessResult, sourceType: item.sourceType,
        criterionIds };
    });
    return { taskId: task.taskId, attempted: true, evidence,
      stopCondition: legacy.stopCondition ?? null };
  });
  const claim = createEvidenceClaim({ runId: plan.runId, stageId: plan.stageId,
    attemptId: plan.attemptId, contextDigest: plan.contextDigest,
    recoveryDigest: plan.recoveryDigest, policyVersion: plan.policyVersion,
    planDigest: plan.planDigest, sourceFormat: 'LEGACY_V2_ADAPTED', tasks,
    diagnostics: [...new Set(diagnostics)] });
  return { claim, diagnostics: claim.diagnostics, observations: [] };
}
