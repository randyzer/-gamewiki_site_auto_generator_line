import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../../contracts/canonical-json.mjs';
import { ContractError } from '../../contracts/errors.mjs';
import { createTestRouteCoverageHarness, verifyPublicationProof } from '../../publication-v2/publication-engine.mjs';
import { assertTrustedBuildEvidence } from './build-evidence-adapter.mjs';

const trustedRouteAssessments = new WeakSet();
const routeHarness = createTestRouteCoverageHarness();
const digestPattern = /^[a-f0-9]{64}$/;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };
const nonempty = value => typeof value === 'string' && value.trim() === value && value.length > 0;
const safeRoute = value => typeof value === 'string' && /^\/(?!\/)[^?#\\\s]*$/.test(value);

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('CONTRACT_SCHEMA_INVALID', `${label} must be an object`);
  if (canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort()))
    fail('CONTRACT_SCHEMA_INVALID', `${label} fields do not match the closed contract`);
}

function assertDigest(value, label) {
  if (!digestPattern.test(value ?? '')) fail('CONTRACT_SCHEMA_INVALID', `${label} must be a SHA256 digest`);
}

function uniqueRoutes(value, label) {
  if (!Array.isArray(value) || value.some(route => !safeRoute(route)) || new Set(value).size !== value.length)
    fail('CONTRACT_SCHEMA_INVALID', `${label} must contain unique safe routes`);
}

function denyCapabilities(requestedCapabilities = []) {
  if (!Array.isArray(requestedCapabilities)) fail('POLICY_DENIED', 'Requested capabilities must be an array');
  if (requestedCapabilities.length) fail('POLICY_DENIED', `P5-F route host denies ${String(requestedCapabilities[0])}`);
}

export function routeRecordDigest(routeRecord) {
  const { recordDigest: ignored, ...payload } = routeRecord;
  return digest('AGENT_SIMULATED_ROUTE_RECORD_V1', payload);
}

function validateRouteRecord(record) {
  exactObject(record, ['kind', 'schemaVersion', 'producer', 'classification', 'mode', 'runId',
    'contextDigest', 'sourceRevision', 'siteRevision', 'buildDigest', 'domain', 'decisionDigest',
    'discoveryToolId', 'discoveryVersion', 'observedAtMs', 'complete', 'gaps',
    'dynamicRouteCoverage', 'unprovenRoutes', 'staticRoutes', 'dynamicRoutes', 'sitemapRoutes',
    'navigationRoutes', 'responses', 'recordDigest'], 'simulated route record');
  if (record.kind !== 'SIMULATED_ROUTE_RECORD' || record.schemaVersion !== 1 ||
      record.producer !== 'P5_F_OFFLINE_FIXTURE' || record.classification !== 'OFFLINE_STUB' ||
      record.mode !== 'SIMULATED' || !nonempty(record.runId) || !nonempty(record.domain) ||
      !nonempty(record.discoveryToolId) || !nonempty(record.discoveryVersion) ||
      !Number.isSafeInteger(record.observedAtMs) || record.observedAtMs < 0 ||
      typeof record.complete !== 'boolean' || !['COMPLETE', 'BOUNDED', 'UNPROVEN'].includes(record.dynamicRouteCoverage) ||
      !Array.isArray(record.gaps) || record.gaps.some(value => !nonempty(value)) ||
      new Set(record.gaps).size !== record.gaps.length)
    fail('CONTRACT_SCHEMA_INVALID', 'Simulated route record identity is invalid');
  for (const name of ['contextDigest', 'sourceRevision', 'siteRevision', 'buildDigest',
    'decisionDigest', 'recordDigest']) assertDigest(record[name], name);
  for (const key of ['unprovenRoutes', 'staticRoutes', 'dynamicRoutes', 'sitemapRoutes', 'navigationRoutes'])
    uniqueRoutes(record[key], key);
  const discovered = [...record.staticRoutes, ...record.dynamicRoutes];
  if (new Set(discovered).size !== discovered.length)
    fail('CONTRACT_SCHEMA_INVALID', 'Static and dynamic route sets overlap');
  if (!Array.isArray(record.responses) || !record.responses.length)
    fail('CONTRACT_SCHEMA_INVALID', 'Route responses must be nonempty');
  const responseRoutes = new Set();
  for (const response of record.responses) {
    exactObject(response, ['route', 'status', 'redirect', 'robots', 'responseSha256', 'byteLength'], 'route response');
    if (!safeRoute(response.route) || responseRoutes.has(response.route) ||
        !Number.isSafeInteger(response.status) || response.status < 100 || response.status > 599 ||
        !(response.redirect === null || safeRoute(response.redirect)) ||
        !['index', 'noindex', null].includes(response.robots) ||
        !Number.isSafeInteger(response.byteLength) || response.byteLength < 0)
      fail('CONTRACT_SCHEMA_INVALID', 'Route response is invalid');
    assertDigest(response.responseSha256, 'responseSha256'); responseRoutes.add(response.route);
  }
  if (routeRecordDigest(record) !== record.recordDigest)
    fail('CONTRACT_DIGEST_MISMATCH', 'Simulated route record digest mismatch');
}

function assertBinding(record, decision, build) {
  const expected = {
    runId: decision.runId, contextDigest: decision.contextDigest, siteRevision: decision.siteRevision,
    buildDigest: decision.buildDigest, domain: decision.domain, decisionDigest: decision.publicationDigest,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (record[key] !== value || build[key] !== value)
      fail('ROUTE_EVIDENCE_BINDING_MISMATCH', `Route evidence does not bind ${key}`);
  }
  if (record.sourceRevision !== build.sourceRevision)
    fail('ROUTE_EVIDENCE_BINDING_MISMATCH', 'Route evidence belongs to another source revision');
}

export function replaySimulatedRouteProof({ routeRecord, publicationDecision, buildEvidence,
  requestedCapabilities = [] }) {
  denyCapabilities(requestedCapabilities);
  validateRouteRecord(routeRecord);
  const build = assertTrustedBuildEvidence(buildEvidence);
  assertBinding(routeRecord, publicationDecision, build);
  const coverage = routeHarness.capture({ decision: publicationDecision, mode: 'SIMULATED',
    discoveryToolId: routeRecord.discoveryToolId, discoveryVersion: routeRecord.discoveryVersion,
    observedAtMs: routeRecord.observedAtMs, complete: routeRecord.complete, gaps: routeRecord.gaps,
    dynamicRouteCoverage: routeRecord.dynamicRouteCoverage, unprovenRoutes: routeRecord.unprovenRoutes,
    staticRoutes: routeRecord.staticRoutes, dynamicRoutes: routeRecord.dynamicRoutes,
    sitemapRoutes: routeRecord.sitemapRoutes, navigationRoutes: routeRecord.navigationRoutes,
    responses: routeRecord.responses });
  const publicationProof = verifyPublicationProof({ decision: publicationDecision, coverage,
    expectedMode: 'SIMULATED' });
  const result = build.result === 'REJECTED' || publicationProof.status === 'REJECTED' ? 'REJECTED' :
    build.result !== 'OFFLINE_SIMULATED_VERIFIED' || publicationProof.status === 'UNPROVEN' ? 'UNPROVEN' :
      'OFFLINE_SIMULATED_VERIFIED';
  const base = {
    kind: 'OFFLINE_ROUTE_ASSESSMENT', schemaVersion: 1, producer: 'P5_F_ROUTE_PROOF_ADAPTER',
    classification: 'OFFLINE_STUB', mode: 'SIMULATED', authoritative: false,
    runId: routeRecord.runId, contextDigest: routeRecord.contextDigest,
    sourceRevision: routeRecord.sourceRevision, siteRevision: routeRecord.siteRevision,
    buildDigest: routeRecord.buildDigest, domain: routeRecord.domain,
    decisionDigest: routeRecord.decisionDigest, sourceRecordDigest: routeRecord.recordDigest,
    buildEvidenceDigest: build.evidenceDigest, coverageDigest: coverage.coverageDigest,
    proofDigest: publicationProof.proofDigest, result,
  };
  const assessment = deepFreeze({ ...base, publicationDecision, coverage, publicationProof,
    assessmentDigest: digest('AGENT_OFFLINE_ROUTE_ASSESSMENT_V1', base) });
  trustedRouteAssessments.add(assessment);
  return assessment;
}

export function assertTrustedRouteAssessment(assessment) {
  if (!trustedRouteAssessments.has(assessment))
    fail('ROUTE_ASSESSMENT_UNTRUSTED', 'Route assessment was not issued by the fixed P5-F host adapter');
  return assessment;
}
