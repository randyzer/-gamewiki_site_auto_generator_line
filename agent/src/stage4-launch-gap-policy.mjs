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
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const domainName = value => typeof value === 'string' &&
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]+$/i.test(value);
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

export async function validateLaunchReadinessClearance(value, { binding, siteRevision, projectDigest,
  domain, readPolicyEvidence, resolveNameServers }) {
  const fail = detail => { throw Object.assign(Error(`LAUNCH_READINESS_CLEARANCE_INVALID: ${detail}`), {
    code: 'LAUNCH_READINESS_CLEARANCE_INVALID',
  }); };
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !exactKeys(value, ['clearances', 'domain', 'kind', 'projectDigest', 'siteRevision', 'stage4BindingDigest']) ||
      value.kind !== 'LAUNCH_READINESS_CLEARANCE_V2' || value.stage4BindingDigest !== binding.bindingDigest ||
      value.siteRevision !== siteRevision || value.projectDigest !== projectDigest ||
      value.domain !== domain || !domainName(domain) || typeof readPolicyEvidence !== 'function' ||
      typeof resolveNameServers !== 'function' ||
      !Array.isArray(value.clearances) || value.clearances.length !== binding.blockers.length) fail('identity mismatch');

  const common = (clearance, index, keys) => {
    if (!clearance || typeof clearance !== 'object' || Array.isArray(clearance) ||
        !exactKeys(clearance, ['authority', 'code', 'kind', 'subjectDomain', ...keys]) ||
        clearance.code !== binding.blockers[index] || clearance.subjectDomain !== domain)
      fail('incomplete, unordered or unrelated evidence');
  };
  const [operator, contact, jurisdiction, privacy, terms, dns] = value.clearances;
  common(operator, 0, ['operatorName', 'operatorType', 'userConfirmed']);
  if (operator.kind !== 'OPERATOR_IDENTITY_CLEARANCE_V1' || operator.authority !== 'USER' ||
      !nonempty(operator.operatorName) || !['INDIVIDUAL', 'ORGANIZATION'].includes(operator.operatorType) ||
      operator.userConfirmed !== true) fail('operator identity is not explicitly user-confirmed');

  common(contact, 1, ['channelType', 'channelValue', 'userConfirmed']);
  if (contact.kind !== 'CONTACT_CHANNEL_CLEARANCE_V1' || contact.authority !== 'USER' ||
      !['EMAIL', 'URL'].includes(contact.channelType) || !nonempty(contact.channelValue) ||
      contact.userConfirmed !== true) fail('contact channel is not explicitly user-confirmed');
  if (contact.channelType === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.channelValue))
    fail('contact email is invalid');
  if (contact.channelType === 'URL') {
    try { if (new URL(contact.channelValue).protocol !== 'https:') fail('contact URL must use HTTPS'); }
    catch { fail('contact URL is invalid'); }
  }

  common(jurisdiction, 2, ['countryCode', 'jurisdiction', 'userConfirmed']);
  if (jurisdiction.kind !== 'JURISDICTION_CLEARANCE_V1' || jurisdiction.authority !== 'USER' ||
      !/^[A-Z]{2}$/.test(jurisdiction.countryCode) || !nonempty(jurisdiction.jurisdiction) ||
      jurisdiction.userConfirmed !== true) fail('jurisdiction is not explicitly user-confirmed');

  const policy = async (clearance, index, policyType) => {
    common(clearance, index, ['decision', 'policyPath', 'policySha256', 'policyType']);
    if (clearance.kind !== 'POLICY_REVIEW_CLEARANCE_V1' || clearance.authority !== 'USER_REVIEW' ||
        clearance.policyType !== policyType || clearance.decision !== 'APPROVED' ||
        !nonempty(clearance.policyPath) || !digest(clearance.policySha256))
      fail(`${policyType.toLowerCase()} policy review is invalid`);
    const observedSha256 = await readPolicyEvidence(clearance.policyPath);
    if (observedSha256 !== clearance.policySha256)
      fail(`${policyType.toLowerCase()} policy evidence changed`);
    return { ...clearance, observedSha256 };
  };
  const verifiedPrivacy = await policy(privacy, 3, 'PRIVACY');
  const verifiedTerms = await policy(terms, 4, 'TERMS');
  if (privacy.policyPath === terms.policyPath) fail('privacy and terms evidence must be distinct');

  common(dns, 5, ['expectedNameServers', 'provider']);
  if (dns.kind !== 'DNS_DELEGATION_CLEARANCE_V1' || dns.authority !== 'HOST_DNS' ||
      !nonempty(dns.provider) || !Array.isArray(dns.expectedNameServers) ||
      dns.expectedNameServers.length === 0 || dns.expectedNameServers.some(item => !domainName(item)))
    fail('DNS delegation evidence is invalid');
  const expectedNameServers = [...new Set(dns.expectedNameServers.map(item => item.toLowerCase()))].sort();
  if (expectedNameServers.length !== dns.expectedNameServers.length ||
      JSON.stringify(expectedNameServers) !== JSON.stringify(dns.expectedNameServers))
    fail('expected DNS name servers must be unique and canonical');
  let observedNameServers;
  try {
    observedNameServers = [...new Set((await resolveNameServers(domain)).map(item => item.toLowerCase()))].sort();
  } catch (error) { fail(`DNS delegation could not be verified: ${error?.code ?? 'lookup failed'}`); }
  if (JSON.stringify(observedNameServers) !== JSON.stringify(expectedNameServers))
    fail('DNS delegation does not match the expected name servers');

  for (const [index, clearance] of value.clearances.entries()) {
    if (clearance.code !== binding.blockers[index]) fail('clearance order changed');
  }
  const clearance = { ...value, kind: 'LAUNCH_READINESS_CLEARANCE_VERIFIED_V1',
    clearances: [operator, contact, jurisdiction, verifiedPrivacy, verifiedTerms,
      { ...dns, observedNameServers }] };
  return { clearance, clearanceDigest: sha256(clearance) };
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
