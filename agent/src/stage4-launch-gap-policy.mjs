import { createHash } from 'node:crypto';

export const STAGE4_LAUNCH_BLOCKERS = Object.freeze([
  'OPERATOR_IDENTITY_REQUIRED',
  'CONTACT_CHANNEL_REQUIRED',
  'JURISDICTION_REQUIRED',
  'PRIVACY_POLICY_REVIEW_REQUIRED',
  'TERMS_POLICY_REVIEW_REQUIRED',
  'DNS_DELEGATION_REQUIRED',
]);

const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const exactKeys = (value, keys) => JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());

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
  if (JSON.stringify(value.launch_blockers) !== JSON.stringify(STAGE4_LAUNCH_BLOCKERS))
    throw invalid('the complete Host launch-readiness set is required');
  return { launchBlockers: [...value.launch_blockers] };
}

export function createStage4LaunchReadinessBinding({ runId, attempt, siteRevision,
  candidateDigest, launchBlockers }) {
  if (typeof runId !== 'string' || !Number.isSafeInteger(attempt) || attempt < 1 ||
      typeof siteRevision !== 'string' || siteRevision.length === 0 || !digest(candidateDigest) ||
      JSON.stringify(launchBlockers) !== JSON.stringify(STAGE4_LAUNCH_BLOCKERS))
    throw invalid('Host launch-readiness binding inputs are invalid');
  const value = { kind: 'STAGE4_LAUNCH_READINESS_V1', runId, attempt, siteRevision,
    candidateDigest, blockers: [...launchBlockers] };
  return { ...value, bindingDigest: sha256(value) };
}

export function verifyStage4LaunchReadinessBinding(value, { runId, siteRevision } = {}) {
  const keys = ['attempt', 'bindingDigest', 'blockers', 'candidateDigest', 'kind', 'runId', 'siteRevision'];
  if (!value || typeof value !== 'object' || Array.isArray(value) || !exactKeys(value, keys) ||
      value.kind !== 'STAGE4_LAUNCH_READINESS_V1' || value.runId !== runId ||
      value.siteRevision !== siteRevision || !Number.isSafeInteger(value.attempt) || value.attempt < 1 ||
      !digest(value.candidateDigest) || !digest(value.bindingDigest) ||
      JSON.stringify(value.blockers) !== JSON.stringify(STAGE4_LAUNCH_BLOCKERS))
    throw Object.assign(Error('LAUNCH_READINESS_BINDING_INVALID'), { code: 'LAUNCH_READINESS_BINDING_INVALID' });
  const { bindingDigest, ...unsigned } = value;
  if (sha256(unsigned) !== bindingDigest)
    throw Object.assign(Error('LAUNCH_READINESS_BINDING_INVALID: digest mismatch'), { code: 'LAUNCH_READINESS_BINDING_INVALID' });
  return value;
}

export function validateLaunchReadinessClearance(value, { binding, siteRevision, projectDigest }) {
  const fail = detail => { throw Object.assign(Error(`LAUNCH_READINESS_CLEARANCE_INVALID: ${detail}`), {
    code: 'LAUNCH_READINESS_CLEARANCE_INVALID',
  }); };
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !exactKeys(value, ['clearances', 'kind', 'projectDigest', 'siteRevision', 'stage4BindingDigest']) ||
      value.kind !== 'LAUNCH_READINESS_CLEARANCE_V1' || value.stage4BindingDigest !== binding.bindingDigest ||
      value.siteRevision !== siteRevision || value.projectDigest !== projectDigest ||
      !Array.isArray(value.clearances) || value.clearances.length !== binding.blockers.length) fail('identity mismatch');
  for (const [index, clearance] of value.clearances.entries()) {
    if (!clearance || typeof clearance !== 'object' || Array.isArray(clearance) ||
        !exactKeys(clearance, ['code', 'evidencePath', 'evidenceSha256']) ||
        clearance.code !== binding.blockers[index] || typeof clearance.evidencePath !== 'string' ||
        clearance.evidencePath.length === 0 || !digest(clearance.evidenceSha256)) fail('incomplete or unordered evidence');
  }
  return { clearance: value, clearanceDigest: sha256(value) };
}

export function createStage6LaunchReadinessAttestation({ binding, siteRevision, projectDigest,
  clearanceDigest }) {
  if (!digest(binding?.bindingDigest) || typeof siteRevision !== 'string' || siteRevision.length === 0 ||
      !digest(projectDigest) || !digest(clearanceDigest))
    throw Object.assign(Error('LAUNCH_READINESS_ATTESTATION_INVALID'), { code: 'LAUNCH_READINESS_ATTESTATION_INVALID' });
  const value = { kind: 'STAGE6_LAUNCH_READINESS_V1', stage4BindingDigest: binding.bindingDigest,
    siteRevision, projectDigest, clearanceDigest, unresolved: [] };
  return { ...value, attestationDigest: sha256(value) };
}

export function verifyStage6LaunchReadinessAttestation(value, { binding, siteRevision,
  projectDigest, clearanceDigest }) {
  const expected = createStage6LaunchReadinessAttestation({ binding, siteRevision, projectDigest, clearanceDigest });
  if (!value || JSON.stringify(value) !== JSON.stringify(expected))
    throw Object.assign(Error('LAUNCH_READINESS_ATTESTATION_INVALID'), { code: 'LAUNCH_READINESS_ATTESTATION_INVALID' });
  return value;
}
