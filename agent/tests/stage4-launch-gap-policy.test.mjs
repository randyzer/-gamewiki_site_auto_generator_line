import test from 'node:test';
import assert from 'node:assert/strict';
import { createStage4LaunchReadinessBinding, STAGE4_LAUNCH_BLOCKERS,
  validateLaunchReadinessClearance,
  validateStage4WorkerHandoff } from '../src/stage4-launch-gap-policy.mjs';

const d = character => character.repeat(64);

const handoff = launchBlockers => ({
  kind: 'STAGE4_WORKER_HANDOFF_V1',
  worker_owned_gates: 'PASSED',
  host_validation: 'REQUIRED',
  blocking_gaps: [],
  launch_blockers: launchBlockers,
});

test('Stage 4 handoff accepts only canonical launch-only blockers', () => {
  const launchBlockers = [...STAGE4_LAUNCH_BLOCKERS];
  assert.deepEqual(validateStage4WorkerHandoff(handoff(launchBlockers)), { launchBlockers });
});

test('Stage 4 handoff rejects omissions, unknown, duplicate, unordered and content blockers', () => {
  for (const launchBlockers of [
    [],
    STAGE4_LAUNCH_BLOCKERS.slice(0, -1),
    ['UNKNOWN_GAP'],
    ['CONTACT_CHANNEL_REQUIRED', 'CONTACT_CHANNEL_REQUIRED'],
    ['TERMS_POLICY_REVIEW_REQUIRED', 'OPERATOR_IDENTITY_REQUIRED'],
  ]) assert.throws(() => validateStage4WorkerHandoff(handoff(launchBlockers)), /STAGE4_WORKER_HANDOFF_INVALID/);

  assert.throws(() => validateStage4WorkerHandoff({ ...handoff([]), blocking_gaps: ['Missing source'] }),
    /STAGE4_WORKER_HANDOFF_INVALID/);
});

test('ordinary PARTIAL without a handoff remains ineligible', () => {
  assert.equal(validateStage4WorkerHandoff(null), null);
  assert.equal(validateStage4WorkerHandoff(undefined), null);
});

function clearance(binding, extra = {}) {
  const domain = 'fixture.test';
  return { kind: extra.acceptanceRevision ? 'LAUNCH_READINESS_CLEARANCE_V3' :
    'LAUNCH_READINESS_CLEARANCE_V2', stage4BindingDigest: binding.bindingDigest,
  siteRevision: 'site-v1', projectDigest: d('a'), domain, ...extra,
  clearances: [
    { code: STAGE4_LAUNCH_BLOCKERS[0], kind: 'OPERATOR_IDENTITY_CLEARANCE_V1',
      subjectDomain: domain, authority: 'USER', operatorName: 'Owner',
      operatorType: 'INDIVIDUAL', userConfirmed: true },
    { code: STAGE4_LAUNCH_BLOCKERS[1], kind: 'CONTACT_CHANNEL_CLEARANCE_V1',
      subjectDomain: domain, authority: 'USER', channelType: 'EMAIL',
      channelValue: 'owner@fixture.test', userConfirmed: true },
    { code: STAGE4_LAUNCH_BLOCKERS[2], kind: 'JURISDICTION_CLEARANCE_V1',
      subjectDomain: domain, authority: 'USER', countryCode: 'US',
      jurisdiction: 'Test', userConfirmed: true },
    { code: STAGE4_LAUNCH_BLOCKERS[3], kind: 'POLICY_REVIEW_CLEARANCE_V1',
      subjectDomain: domain, authority: 'USER_REVIEW', decision: 'APPROVED',
      policyPath: '/privacy', policySha256: d('1'), policyType: 'PRIVACY' },
    { code: STAGE4_LAUNCH_BLOCKERS[4], kind: 'POLICY_REVIEW_CLEARANCE_V1',
      subjectDomain: domain, authority: 'USER_REVIEW', decision: 'APPROVED',
      policyPath: '/terms', policySha256: d('1'), policyType: 'TERMS' },
    { code: STAGE4_LAUNCH_BLOCKERS[5], kind: 'DNS_DELEGATION_CLEARANCE_V1',
      subjectDomain: domain, authority: 'HOST_DNS', expectedNameServers: ['ns1.fixture.test'],
      provider: 'Fixture DNS' },
  ] };
}

test('remediated clearance must bind the current acceptance and blockers', async () => {
  const binding = createStage4LaunchReadinessBinding({ runId: 'run', attempt: 1,
    siteRevision: 'site-v1', candidateDigest: d('b'),
    launchBlockers: [...STAGE4_LAUNCH_BLOCKERS] });
  const siteAcceptance = { mode: 'REMEDIATED', acceptanceRevision: d('c'),
    projectDigest: d('a'), unresolvedBlockers: [
      'CURRENT_LAUNCH_READINESS_REVALIDATION_REQUIRED',
      'FINAL_STAGE4_INVENTORY_UNAVAILABLE',
    ] };
  const options = { binding, siteRevision: 'site-v1', projectDigest: d('a'),
    domain: 'fixture.test', siteAcceptance,
    readPolicyEvidence: async () => d('1'),
    resolveNameServers: async () => ['ns1.fixture.test'] };
  await assert.rejects(() => validateLaunchReadinessClearance(clearance(binding), options),
    error => error.code === 'LAUNCH_READINESS_CLEARANCE_INVALID');
  const verified = await validateLaunchReadinessClearance(clearance(binding, {
    acceptanceRevision: d('c'), acceptanceProjectDigest: d('a'),
    currentBlockers: [...siteAcceptance.unresolvedBlockers],
  }), options);
  assert.equal(verified.clearance.acceptanceRevision, d('c'));
  assert.match(verified.clearanceDigest, /^[a-f0-9]{64}$/);
  await assert.rejects(() => validateLaunchReadinessClearance(clearance(binding, {
    acceptanceRevision: d('f'), acceptanceProjectDigest: d('a'),
    currentBlockers: [...siteAcceptance.unresolvedBlockers],
  }), options), error => error.code === 'LAUNCH_READINESS_CLEARANCE_INVALID');
});
