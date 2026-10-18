import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../../contracts/canonical-json.mjs';
import { ContractError } from '../../contracts/errors.mjs';
import { validateStageAdapterInput, validateStageAdapterResult } from '../stage-adapter-contract.mjs';
import { assertTrustedBuildEvidence } from '../host/build-evidence-adapter.mjs';

const trustedUiAudits = new WeakSet();
const digestPattern = /^[a-f0-9]{64}$/;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };
const nonempty = value => typeof value === 'string' && value.trim() === value && value.length > 0;
const safeRoute = value => typeof value === 'string' && /^\/(?!\/)[^?#\\\s]*$/.test(value);
const requiredViewports = Object.freeze([
  Object.freeze({ width: 360, height: 800, dpr: 2 }),
  Object.freeze({ width: 390, height: 844, dpr: 3 }),
  Object.freeze({ width: 768, height: 1024, dpr: 2 }),
  Object.freeze({ width: 1024, height: 768, dpr: 1 }),
  Object.freeze({ width: 1440, height: 900, dpr: 1 }),
  Object.freeze({ width: 1920, height: 1080, dpr: 1 }),
]);
const viewportByWidth = new Map(requiredViewports.map(value => [value.width, value]));

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
  if (requested.length) fail('POLICY_DENIED', `P5-F UI adapter denies ${String(requested[0])}`);
}

export function uiInteractionsDigest(interactions) {
  return digest('AGENT_UI_INTERACTIONS_V1', interactions);
}

export function uiCaptureDigest(capture) {
  const { captureDigest: ignored, ...payload } = capture;
  return digest('AGENT_UI_CAPTURE_V1', payload);
}

export function uiFixtureDigest(fixtureManifest) {
  const { fixtureDigest: ignored, ...payload } = fixtureManifest;
  return digest('AGENT_UI_FIXTURE_V1', payload);
}

export function uiReplayPayloadDigest({ fixtureManifest, buildEvidence }) {
  return digest('AGENT_UI_REPLAY_PAYLOAD_V1', {
    fixtureDigest: fixtureManifest.fixtureDigest,
    buildEvidenceDigest: buildEvidence.evidenceDigest,
  });
}

function validateFixture(manifest) {
  exactObject(manifest, ['kind', 'schemaVersion', 'producer', 'classification', 'mode', 'runId',
    'contextDigest', 'sourceRevision', 'siteRevision', 'buildDigest', 'domain', 'decisionDigest',
    'requestedCapabilities', 'complete', 'gaps', 'routes', 'fixtureDigest'], 'UI fixture');
  if (manifest.kind !== 'UI_FIXTURE' || manifest.schemaVersion !== 1 ||
      manifest.producer !== 'P5_F_OFFLINE_FIXTURE' || manifest.classification !== 'OFFLINE_STUB' ||
      manifest.mode !== 'SIMULATED' || !nonempty(manifest.runId) || !nonempty(manifest.domain) ||
      !Array.isArray(manifest.requestedCapabilities) || typeof manifest.complete !== 'boolean' ||
      !Array.isArray(manifest.gaps) || manifest.gaps.some(value => !nonempty(value)) ||
      new Set(manifest.gaps).size !== manifest.gaps.length || !Array.isArray(manifest.routes))
    fail('CONTRACT_SCHEMA_INVALID', 'UI fixture identity is invalid');
  for (const name of ['contextDigest', 'sourceRevision', 'siteRevision', 'buildDigest',
    'decisionDigest', 'fixtureDigest']) assertDigest(manifest[name], name);
  const routes = new Set();
  for (const route of manifest.routes) {
    exactObject(route, ['route', 'captures'], 'UI route');
    if (!safeRoute(route.route) || routes.has(route.route) || !Array.isArray(route.captures))
      fail('CONTRACT_SCHEMA_INVALID', 'UI routes must be unique and safe');
    routes.add(route.route);
    const widths = new Set();
    for (const capture of route.captures) {
      exactObject(capture, ['route', 'width', 'height', 'dpr', 'sourceRevision', 'siteRevision',
        'buildDigest', 'screenshotDigest', 'interactions', 'interactionDigest', 'checks',
        'captureDigest'], 'UI capture');
      if (capture.route !== route.route || !Number.isSafeInteger(capture.width) || widths.has(capture.width) ||
          !Number.isSafeInteger(capture.height) || capture.height < 1 || !Number.isSafeInteger(capture.dpr) ||
          capture.dpr < 1 || !Array.isArray(capture.interactions) || !capture.interactions.length)
        fail('CONTRACT_SCHEMA_INVALID', 'UI capture identity is invalid');
      widths.add(capture.width);
      for (const name of ['sourceRevision', 'siteRevision', 'buildDigest', 'screenshotDigest',
        'interactionDigest', 'captureDigest']) assertDigest(capture[name], name);
      const interactions = new Set();
      for (const interaction of capture.interactions) {
        exactObject(interaction, ['interactionId', 'action', 'outcome', 'evidenceDigest'], 'UI interaction');
        if (!nonempty(interaction.interactionId) || interactions.has(interaction.interactionId) ||
            !nonempty(interaction.action) || !['PASS', 'FAIL', 'UNPROVEN'].includes(interaction.outcome))
          fail('CONTRACT_SCHEMA_INVALID', 'UI interaction is invalid');
        assertDigest(interaction.evidenceDigest, 'interaction evidenceDigest');
        interactions.add(interaction.interactionId);
      }
      exactObject(capture.checks, ['navigation', 'overflow', 'accessibility', 'coreContent',
        'interaction'], 'UI checks');
      if (Object.values(capture.checks).some(value => !['PASS', 'FAIL', 'UNPROVEN'].includes(value)))
        fail('CONTRACT_SCHEMA_INVALID', 'UI check status is invalid');
      if (uiInteractionsDigest(capture.interactions) !== capture.interactionDigest ||
          uiCaptureDigest(capture) !== capture.captureDigest)
        fail('CONTRACT_DIGEST_MISMATCH', 'UI capture digest mismatch');
    }
  }
  if (uiFixtureDigest(manifest) !== manifest.fixtureDigest)
    fail('CONTRACT_DIGEST_MISMATCH', 'UI fixture digest mismatch');
}

function assertBindings(manifest, decision, build) {
  const expected = {
    runId: decision.runId, contextDigest: decision.contextDigest, siteRevision: decision.siteRevision,
    buildDigest: decision.buildDigest, domain: decision.domain, decisionDigest: decision.publicationDigest,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (manifest[key] !== value || build[key] !== value)
      fail('UI_EVIDENCE_BINDING_MISMATCH', `UI fixture does not bind ${key}`);
  }
  if (manifest.sourceRevision !== build.sourceRevision)
    fail('UI_EVIDENCE_BINDING_MISMATCH', 'UI fixture belongs to another source revision');
  for (const route of manifest.routes) {
    for (const capture of route.captures) {
      if (capture.sourceRevision !== manifest.sourceRevision || capture.siteRevision !== manifest.siteRevision ||
          capture.buildDigest !== manifest.buildDigest)
        fail('UI_EVIDENCE_BINDING_MISMATCH', `UI capture is stale: ${route.route}@${capture.width}`);
      const viewport = viewportByWidth.get(capture.width);
      if (!viewport || capture.height !== viewport.height || capture.dpr !== viewport.dpr)
        fail('UI_EVIDENCE_BINDING_MISMATCH', `UI viewport identity is invalid: ${route.route}@${capture.width}`);
    }
  }
}

function resultFor(manifest, decision, build) {
  const expectedRoutes = decision.pages.filter(page => page.disposition === 'PUBLISH')
    .map(page => page.route).sort();
  const actualRoutes = manifest.routes.map(item => item.route).sort();
  const unexpected = actualRoutes.filter(route => !expectedRoutes.includes(route));
  if (unexpected.length) fail('UI_EVIDENCE_BINDING_MISMATCH', `UI fixture contains unexpected route ${unexpected[0]}`);
  const gaps = [...manifest.gaps]; const failures = [];
  for (const route of expectedRoutes) {
    const evidence = manifest.routes.find(item => item.route === route);
    if (!evidence) { gaps.push(`ROUTE_MISSING:${route}`); continue; }
    const widths = new Set(evidence.captures.map(capture => capture.width));
    for (const viewport of requiredViewports) if (!widths.has(viewport.width))
      gaps.push(`VIEWPORT_MISSING:${route}:${viewport.width}`);
    for (const capture of evidence.captures) {
      for (const [check, status] of Object.entries(capture.checks)) {
        if (status === 'FAIL') failures.push(`${route}:${capture.width}:${check}`);
        if (status === 'UNPROVEN') gaps.push(`${route}:${capture.width}:${check}`);
      }
      for (const interaction of capture.interactions) {
        if (interaction.outcome === 'FAIL') failures.push(`${route}:${capture.width}:INTERACTION:${interaction.interactionId}`);
        if (interaction.outcome === 'UNPROVEN') gaps.push(`${route}:${capture.width}:INTERACTION:${interaction.interactionId}`);
      }
    }
  }
  if (!manifest.complete) gaps.push('UI_FIXTURE_INCOMPLETE');
  if (build.result === 'REJECTED') failures.push('BUILD_REJECTED');
  if (build.result === 'UNPROVEN') gaps.push('BUILD_UNPROVEN');
  return { result: failures.length ? 'REJECTED' : gaps.length ? 'UNPROVEN' : 'OFFLINE_SIMULATED_VERIFIED',
    failures: [...new Set(failures)].sort(), gaps: [...new Set(gaps)].sort() };
}

export function replayUiUxAudit({ fixtureManifest, adapterInput, publicationDecision, buildEvidence,
  requestedCapabilities = [] }) {
  denyCapabilities(fixtureManifest?.requestedCapabilities, requestedCapabilities);
  validateFixture(fixtureManifest); validateStageAdapterInput(adapterInput);
  if (adapterInput.canonicalStageId !== 'ui-ux-audit' || adapterInput.runId !== fixtureManifest.runId ||
      adapterInput.contextDigest !== fixtureManifest.contextDigest ||
      adapterInput.payloadDigest !== uiReplayPayloadDigest({ fixtureManifest, buildEvidence }))
    fail('CONTRACT_BINDING_MISMATCH', 'UI adapter input does not bind the replay payload');
  const build = assertTrustedBuildEvidence(buildEvidence);
  assertBindings(fixtureManifest, publicationDecision, build);
  const assessment = resultFor(fixtureManifest, publicationDecision, build);
  const base = {
    kind: 'OFFLINE_UI_AUDIT', schemaVersion: 1, producer: 'P5_F_UI_AUDIT_ADAPTER',
    classification: 'OFFLINE_STUB', mode: 'SIMULATED', authoritative: false,
    runId: fixtureManifest.runId, contextDigest: fixtureManifest.contextDigest,
    sourceRevision: fixtureManifest.sourceRevision, siteRevision: fixtureManifest.siteRevision,
    buildDigest: fixtureManifest.buildDigest, domain: fixtureManifest.domain,
    decisionDigest: fixtureManifest.decisionDigest, fixtureDigest: fixtureManifest.fixtureDigest,
    buildEvidenceDigest: build.evidenceDigest, result: assessment.result,
    viewportWidths: requiredViewports.map(item => item.width), routeCount: fixtureManifest.routes.length,
    captureDigests: fixtureManifest.routes.flatMap(route => route.captures.map(item => item.captureDigest)).sort(),
    failures: assessment.failures, gaps: assessment.gaps,
  };
  const auditManifest = deepFreeze({ ...base, auditDigest: digest('AGENT_OFFLINE_UI_AUDIT_V1', base) });
  trustedUiAudits.add(auditManifest);
  const status = assessment.result === 'OFFLINE_SIMULATED_VERIFIED' ? 'COMPLETED' :
    assessment.result === 'REJECTED' ? 'FAILED' : 'PARTIAL';
  const stageResult = {
    kind: 'STAGE_ADAPTER_RESULT', schemaVersion: 1, producer: 'V2_STAGE_ADAPTER', mode: 'OFFLINE',
    runId: adapterInput.runId, canonicalStageId: adapterInput.canonicalStageId,
    mappingVersion: adapterInput.mappingVersion, contextDigest: adapterInput.contextDigest,
    inputDigest: digest('AGENT_STAGE_ADAPTER_INPUT_V1', adapterInput), status, authoritative: false,
    artifactDigests: [auditManifest.auditDigest, fixtureManifest.fixtureDigest, build.evidenceDigest].sort(),
    errorCodes: assessment.result === 'REJECTED' ? ['UI_AUDIT_REJECTED'] :
      assessment.result === 'UNPROVEN' ? ['UI_EVIDENCE_UNPROVEN'] : [],
  };
  validateStageAdapterResult(stageResult);
  return deepFreeze({ stageResult, auditManifest, productionEffects: 0 });
}

export function assertTrustedUiAudit(audit) {
  if (!trustedUiAudits.has(audit))
    fail('UI_AUDIT_UNTRUSTED', 'UI audit was not issued by the P5-F adapter');
  return audit;
}
