import { verifyBaseline } from './project-baseline.mjs';
import { candidateDiff } from './candidate-diff.mjs';

export function promotionPlan({ targetId, runId, baseline, diff, taskCardDigest = null }) {
  return { schemaVersion: 1, status: 'AWAITING_REVIEW', targetId, runId, head: baseline.head,
    statusDigest: baseline.statusDigest, baselineDigest: baseline.digest, candidateDigest: diff.candidateDigest,
    filesDigest: diff.filesDigest, files: diff.changes, blockers: diff.blockers, sourceWrites: false,
    taskCardDigest, productionReleaseAuthorized: false, promotionImplemented: false };
}
export async function dryRunPromotion(plan, baseline, entry, diff, { owner, approval } = {}) {
  await verifyBaseline(baseline, entry);
  const current = await candidateDiff(baseline, diff.candidateProjectPath);
  if (plan.blockers.length || diff.blockers.length) throw Error('Promotion blocked by candidate findings');
  if (!owner || approval?.type !== 'promotion-review' || approval.owner !== owner || approval.used ||
    !Number.isFinite(approval.expiresAt) || approval.expiresAt <= Date.now()) throw Error('Missing or invalid promotion approval');
  for (const key of ['targetId', 'runId', 'baselineDigest', 'candidateDigest', 'filesDigest', 'head', 'statusDigest', ...(plan.taskCardDigest ? ['taskCardDigest'] : [])]) {
    if (approval[key] !== plan[key]) throw Error('Promotion approval does not bind exact candidate and baseline');
  }
  if (current.candidateDigest !== plan.candidateDigest || current.filesDigest !== plan.filesDigest ||
    diff.candidateDigest !== plan.candidateDigest || diff.filesDigest !== plan.filesDigest) throw Error('Candidate changed after review');
  return { status: 'DRY_RUN_ONLY', sourceWrites: false, productionReleaseAuthorized: false, files: plan.files };
}
