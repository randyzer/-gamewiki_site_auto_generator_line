import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../../contracts/canonical-json.mjs';
import { ContractError } from '../../contracts/errors.mjs';
import { validateStageAdapterInput, validateStageAdapterResult } from '../stage-adapter-contract.mjs';
import { assertTrustedBuildEvidence, buildRecordDigest } from '../host/build-evidence-adapter.mjs';
import { assertTrustedRouteAssessment, routeRecordDigest } from '../host/route-proof-adapter.mjs';
import { assertTrustedUiAudit } from './ui-ux-audit.mjs';

const digestPattern = /^[a-f0-9]{64}$/;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };
const nonempty = value => typeof value === 'string' && value.trim() === value && value.length > 0;

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('CONTRACT_SCHEMA_INVALID', `${label} must be an object`);
  if (canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort()))
    fail('CONTRACT_SCHEMA_INVALID', `${label} fields do not match the closed contract`);
}

function assertDigest(value, label) {
  if (!digestPattern.test(value ?? '')) fail('CONTRACT_SCHEMA_INVALID', `${label} must be a SHA256 digest`);
}

function denyCapabilities(fixtureCapabilities, requestedCapabilities = []) {
  if (!Array.isArray(fixtureCapabilities) || !Array.isArray(requestedCapabilities))
    fail('POLICY_DENIED', 'Offline capability declarations must be arrays');
  const requested = [...fixtureCapabilities, ...requestedCapabilities];
  if (requested.length) fail('POLICY_DENIED', `P5-F prelaunch adapter denies ${String(requested[0])}`);
}

export function prelaunchFixtureDigest(fixtureManifest) {
  const { fixtureDigest: ignored, ...payload } = fixtureManifest;
  return digest('AGENT_PRELAUNCH_FIXTURE_V1', payload);
}

export function prelaunchReplayPayloadDigest({ fixtureManifest, buildEvidence, uiAudit, routeAssessment }) {
  return digest('AGENT_PRELAUNCH_REPLAY_PAYLOAD_V1', {
    fixtureDigest: fixtureManifest.fixtureDigest,
    buildEvidenceDigest: buildEvidence.evidenceDigest,
    uiAuditDigest: uiAudit.auditDigest,
    routeAssessmentDigest: routeAssessment.assessmentDigest,
  });
}

function validateFixture(manifest) {
  exactObject(manifest, ['kind', 'schemaVersion', 'producer', 'classification', 'mode', 'runId',
    'contextDigest', 'sourceRevision', 'siteRevision', 'buildDigest', 'domain', 'decisionDigest',
    'requestedCapabilities', 'complete', 'gaps', 'build', 'route', 'fixtureDigest'], 'prelaunch fixture');
  if (manifest.kind !== 'PRELAUNCH_FIXTURE' || manifest.schemaVersion !== 1 ||
      manifest.producer !== 'P5_F_OFFLINE_FIXTURE' || manifest.classification !== 'OFFLINE_STUB' ||
      manifest.mode !== 'SIMULATED' || !nonempty(manifest.runId) || !nonempty(manifest.domain) ||
      !Array.isArray(manifest.requestedCapabilities) || typeof manifest.complete !== 'boolean' ||
      !Array.isArray(manifest.gaps) || manifest.gaps.some(value => !nonempty(value)) ||
      new Set(manifest.gaps).size !== manifest.gaps.length)
    fail('CONTRACT_SCHEMA_INVALID', 'Prelaunch fixture identity is invalid');
  for (const name of ['contextDigest', 'sourceRevision', 'siteRevision', 'buildDigest',
    'decisionDigest', 'fixtureDigest']) assertDigest(manifest[name], name);
  if (buildRecordDigest(manifest.build) !== manifest.build?.recordDigest ||
      routeRecordDigest(manifest.route) !== manifest.route?.recordDigest ||
      prelaunchFixtureDigest(manifest) !== manifest.fixtureDigest)
    fail('CONTRACT_DIGEST_MISMATCH', 'Prelaunch fixture digest mismatch');
}

function assertBindings(manifest, decision, build, ui, route) {
  const expected = {
    runId: decision.runId, contextDigest: decision.contextDigest, siteRevision: decision.siteRevision,
    buildDigest: decision.buildDigest, domain: decision.domain, decisionDigest: decision.publicationDigest,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (manifest[key] !== value || build[key] !== value || ui[key] !== value || route[key] !== value)
      fail('PRELAUNCH_BINDING_MISMATCH', `Prelaunch evidence does not bind ${key}`);
  }
  if (manifest.sourceRevision !== build.sourceRevision || manifest.sourceRevision !== ui.sourceRevision ||
      manifest.sourceRevision !== route.sourceRevision)
    fail('PRELAUNCH_BINDING_MISMATCH', 'Prelaunch evidence belongs to another source revision');
  if (manifest.build.recordDigest !== build.sourceRecordDigest ||
      manifest.route.recordDigest !== route.sourceRecordDigest)
    fail('PRELAUNCH_BINDING_MISMATCH', 'Prelaunch fixture does not bind the validated host records');
  if (route.publicationDecision !== decision)
    fail('PUBLICATION_DECISION_UNTRUSTED', 'Prelaunch must reuse the exact P4 decision validated by route proof');
}

export function replayPrelaunchAcceptance({ fixtureManifest, adapterInput, publicationDecision,
  buildEvidence, uiAudit, routeAssessment, requestedCapabilities = [] }) {
  denyCapabilities(fixtureManifest?.requestedCapabilities, requestedCapabilities);
  validateFixture(fixtureManifest); validateStageAdapterInput(adapterInput);
  if (adapterInput.canonicalStageId !== 'prelaunch-acceptance' ||
      adapterInput.runId !== fixtureManifest.runId ||
      adapterInput.contextDigest !== fixtureManifest.contextDigest ||
      adapterInput.payloadDigest !== prelaunchReplayPayloadDigest({ fixtureManifest,
        buildEvidence, uiAudit, routeAssessment }))
    fail('CONTRACT_BINDING_MISMATCH', 'Prelaunch adapter input does not bind the replay payload');
  const build = assertTrustedBuildEvidence(buildEvidence);
  const ui = assertTrustedUiAudit(uiAudit);
  const route = assertTrustedRouteAssessment(routeAssessment);
  assertBindings(fixtureManifest, publicationDecision, build, ui, route);
  const failures = []; const gaps = [...fixtureManifest.gaps];
  for (const [name, result] of [['BUILD', build.result], ['UI', ui.result], ['ROUTE', route.result]]) {
    if (result === 'REJECTED') failures.push(`${name}_REJECTED`);
    if (result === 'UNPROVEN') gaps.push(`${name}_UNPROVEN`);
  }
  if (!fixtureManifest.complete) gaps.push('PRELAUNCH_FIXTURE_INCOMPLETE');
  const result = failures.length ? 'REJECTED' : gaps.length ? 'UNPROVEN' : 'OFFLINE_SIMULATED_VERIFIED';
  const base = {
    kind: 'OFFLINE_PRELAUNCH_ACCEPTANCE', schemaVersion: 1,
    producer: 'P5_F_PRELAUNCH_ADAPTER', classification: 'OFFLINE_STUB', mode: 'SIMULATED',
    authoritative: false, runId: fixtureManifest.runId, contextDigest: fixtureManifest.contextDigest,
    sourceRevision: fixtureManifest.sourceRevision, siteRevision: fixtureManifest.siteRevision,
    buildDigest: fixtureManifest.buildDigest, domain: fixtureManifest.domain,
    decisionDigest: fixtureManifest.decisionDigest, fixtureDigest: fixtureManifest.fixtureDigest,
    buildEvidenceDigest: build.evidenceDigest, uiAuditDigest: ui.auditDigest,
    routeAssessmentDigest: route.assessmentDigest, publicationProofDigest: route.proofDigest,
    result, failures: [...new Set(failures)].sort(), gaps: [...new Set(gaps)].sort(),
    productionReady: false, authoritySwitchAllowed: false,
  };
  const acceptanceManifest = deepFreeze({ ...base,
    acceptanceDigest: digest('AGENT_OFFLINE_PRELAUNCH_ACCEPTANCE_V1', base) });
  const status = result === 'OFFLINE_SIMULATED_VERIFIED' ? 'COMPLETED' :
    result === 'REJECTED' ? 'FAILED' : 'PARTIAL';
  const stageResult = {
    kind: 'STAGE_ADAPTER_RESULT', schemaVersion: 1, producer: 'V2_STAGE_ADAPTER', mode: 'OFFLINE',
    runId: adapterInput.runId, canonicalStageId: adapterInput.canonicalStageId,
    mappingVersion: adapterInput.mappingVersion, contextDigest: adapterInput.contextDigest,
    inputDigest: digest('AGENT_STAGE_ADAPTER_INPUT_V1', adapterInput), status, authoritative: false,
    artifactDigests: [acceptanceManifest.acceptanceDigest, fixtureManifest.fixtureDigest,
      build.evidenceDigest, ui.auditDigest, route.assessmentDigest].sort(),
    errorCodes: result === 'REJECTED' ? ['PRELAUNCH_REJECTED'] :
      result === 'UNPROVEN' ? ['PRELAUNCH_UNPROVEN'] : [],
  };
  validateStageAdapterResult(stageResult);
  return deepFreeze({ stageResult, acceptanceManifest, productionReady: false,
    authoritySwitchAllowed: false, productionEffects: 0 });
}
