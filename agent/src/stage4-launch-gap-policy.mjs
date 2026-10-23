export const STAGE4_LAUNCH_BLOCKERS = Object.freeze([
  'OPERATOR_IDENTITY_REQUIRED',
  'CONTACT_CHANNEL_REQUIRED',
  'JURISDICTION_REQUIRED',
  'PRIVACY_POLICY_REVIEW_REQUIRED',
  'TERMS_POLICY_REVIEW_REQUIRED',
  'DNS_DELEGATION_REQUIRED',
]);

const invalid = detail => Object.assign(Error(`STAGE4_WORKER_HANDOFF_INVALID: ${detail}`), {
  code: 'STAGE4_WORKER_HANDOFF_INVALID',
});

export function validateStage4WorkerHandoff(value) {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('expected object or null');
  const expectedKeys = ['blocking_gaps', 'host_validation', 'kind', 'launch_blockers', 'worker_owned_gates'];
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expectedKeys))
    throw invalid('unexpected fields');
  if (value.kind !== 'STAGE4_WORKER_HANDOFF_V1' || value.worker_owned_gates !== 'PASSED' ||
      value.host_validation !== 'REQUIRED') throw invalid('invalid identity or gate status');
  if (!Array.isArray(value.blocking_gaps) || value.blocking_gaps.length !== 0)
    throw invalid('content, source, SEO or route-publication blockers remain');
  if (!Array.isArray(value.launch_blockers)) throw invalid('launch_blockers must be an array');
  const positions = value.launch_blockers.map(item => STAGE4_LAUNCH_BLOCKERS.indexOf(item));
  if (positions.some(position => position < 0)) throw invalid('unknown launch blocker');
  if (new Set(value.launch_blockers).size !== value.launch_blockers.length)
    throw invalid('duplicate launch blocker');
  if (positions.some((position, index) => index > 0 && position <= positions[index - 1]))
    throw invalid('launch blockers must use canonical order');
  return { launchBlockers: [...value.launch_blockers] };
}
