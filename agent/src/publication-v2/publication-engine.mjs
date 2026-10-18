import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { assertConsumableHandoff } from '../handoff-v2/canonical-handoff.mjs';

const trustedCoverage = new WeakSet();
const trustedDecisions = new WeakSet();
const sha256 = value => createHash('sha256').update(value).digest('hex');

export function createPublicationDecision(input) {
  const handoff = assertConsumableHandoff(input.handoff);
  const routes = input.pages.map(page => page.route);
  if (new Set(routes).size !== routes.length)
    throw new ContractError('PUBLICATION_ROUTE_DUPLICATE', 'Publication routes must be unique');
  const eligibility = new Map(handoff.materials.map(item => [item.keywordId, item.publicationEligibility]));
  if (input.pages.some(page => eligibility.get(page.pageId) !== page.eligibility))
    throw new ContractError('PUBLICATION_HANDOFF_MISMATCH', 'Publication pages must preserve handoff eligibility');
  const dispositions = input.pages.map(page => {
    const disposition = page.eligibility === 'ELIGIBLE' ? 'PUBLISH' :
      page.eligibility === 'DRAFT_ONLY' ? 'DRAFT_ONLY' : page.eligibility === 'OMIT' ? 'OMIT' : 'UNKNOWN';
    return { ...page, disposition, noindexRequired: disposition === 'DRAFT_ONLY' };
  });
  const base = { kind: 'ROUTE_PUBLICATION', schemaVersion: 2, producer: 'PUBLICATION_ENGINE', mode: 'SIMULATED',
    runId: handoff.runId, stageId: input.stageId, contextDigest: handoff.contextDigest,
    siteRevision: handoff.siteRevision, buildDigest: input.buildDigest, domain: handoff.domain,
    handoffDigest: handoff.handoffDigest, routePolicyVersion: 'p4-shadow-v1', pages: dispositions };
  const decision = { ...base, publicationDigest: sha256(`AGENT_ROUTE_PUBLICATION_V2\n${canonicalJson(base)}`) };
  validateContract('ROUTE_PUBLICATION', 2, decision);
  deepFreeze(decision); trustedDecisions.add(decision); return decision;
}

export function createTestRouteCoverageHarness() {
  return Object.freeze({ capture({ decision, ...input }) {
    if (input.mode !== 'SIMULATED') throw new ContractError('ROUTE_COVERAGE_MODE_INVALID', 'Test coverage must be simulated');
    validateDecisionDigest(decision);
    const responseEvidence = input.responses.map(item => ({ ...item, observedAtMs: input.observedAtMs,
      source: 'SIMULATED_HOST', byteLength: item.byteLength ?? 1 }))
      .sort((left, right) => left.route.localeCompare(right.route));
    const responseRoutes = responseEvidence.map(item => item.route);
    if (new Set(responseRoutes).size !== responseRoutes.length)
      throw new ContractError('ROUTE_COVERAGE_DUPLICATE', 'Route responses must be unique');
    const staticRoutes = [...input.staticRoutes].sort(); const dynamicRoutes = [...input.dynamicRoutes].sort();
    const sitemapRoutes = [...input.sitemapRoutes].sort(); const navigationRoutes = [...input.navigationRoutes].sort();
    const unprovenRoutes = [...input.unprovenRoutes].sort(); const discovered = [...staticRoutes, ...dynamicRoutes];
    if (new Set(discovered).size !== discovered.length)
      throw new ContractError('ROUTE_COVERAGE_DUPLICATE', 'Discovered routes must be unique');
    const base = { kind: 'ROUTE_COVERAGE', schemaVersion: 1, producer: 'SIMULATED_HOST_ROUTE_DISCOVERY',
      mode: input.mode, discoveryToolId: input.discoveryToolId, discoveryVersion: input.discoveryVersion,
      runId: decision.runId, contextDigest: decision.contextDigest,
      siteRevision: decision.siteRevision, buildDigest: decision.buildDigest, domain: decision.domain,
      handoffDigest: decision.handoffDigest, decisionDigest: decision.publicationDigest,
      complete: input.complete, gaps: [...input.gaps].sort(), dynamicRouteCoverage: input.dynamicRouteCoverage,
      unprovenRoutes, routeUniverseDigest: sha256(`AGENT_ROUTE_UNIVERSE_V1\n${canonicalJson({ staticRoutes, dynamicRoutes })}`),
      staticRoutes, dynamicRoutes, sitemapRoutes, navigationRoutes,
      navigationDigest: sha256(`AGENT_NAVIGATION_ROUTES_V1\n${canonicalJson(navigationRoutes)}`),
      sitemapDigest: sha256(`AGENT_SITEMAP_ROUTES_V1\n${canonicalJson(sitemapRoutes)}`),
      responses: responseEvidence,
      responseEvidenceDigest: sha256(`AGENT_RESPONSE_EVIDENCE_V1\n${canonicalJson(responseEvidence)}`) };
    const value = { ...base, coverageDigest: sha256(`AGENT_ROUTE_COVERAGE_V1\n${canonicalJson(base)}`) };
    validateContract('ROUTE_COVERAGE', 1, value);
    deepFreeze(value);
    trustedCoverage.add(value); return value;
  } });
}

function validateDecisionDigest(decision) {
  if (!trustedDecisions.has(decision))
    throw new ContractError('PUBLICATION_DECISION_UNTRUSTED', 'Publication decision lacks host capability');
  validateContract('ROUTE_PUBLICATION', 2, decision);
  const { publicationDigest, ...base } = decision;
  if (sha256(`AGENT_ROUTE_PUBLICATION_V2\n${canonicalJson(base)}`) !== publicationDigest)
    throw new ContractError('PUBLICATION_DIGEST_MISMATCH', 'Publication decision digest mismatch');
}

function validateCoverageDigest(coverage) {
  validateContract('ROUTE_COVERAGE', 1, coverage);
  const { coverageDigest, ...base } = coverage;
  if (sha256(`AGENT_ROUTE_COVERAGE_V1\n${canonicalJson(base)}`) !== coverageDigest)
    throw new ContractError('ROUTE_COVERAGE_DIGEST_MISMATCH', 'Route coverage digest mismatch');
}

function proof(mode, status, decisionDigest, coverageDigest, failures) {
  const base = { kind: 'PUBLICATION_PROOF', schemaVersion: 1, producer: 'PUBLICATION_PROOF_VALIDATOR',
    mode, status, decisionDigest, coverageDigest, failures: [...new Set(failures)] };
  const value = { ...base, proofDigest: sha256(`AGENT_PUBLICATION_PROOF_V1\n${canonicalJson(base)}`) };
  validateContract('PUBLICATION_PROOF', 1, value);
  return deepFreeze(value);
}

export function verifyPublicationProof({ decision, coverage, expectedMode }) {
  if (!trustedCoverage.has(coverage)) throw new ContractError('ROUTE_COVERAGE_UNTRUSTED', 'Route coverage is not host validated');
  validateDecisionDigest(decision); validateCoverageDigest(coverage);
  if (coverage.mode !== expectedMode || decision.mode !== expectedMode)
    throw new ContractError('ROUTE_COVERAGE_MODE_INVALID', 'Route coverage mode mismatch');
  if (coverage.runId !== decision.runId || coverage.contextDigest !== decision.contextDigest ||
      coverage.siteRevision !== decision.siteRevision || coverage.buildDigest !== decision.buildDigest ||
      coverage.domain !== decision.domain || coverage.handoffDigest !== decision.handoffDigest ||
      coverage.decisionDigest !== decision.publicationDigest)
    throw new ContractError('ROUTE_COVERAGE_BINDING_MISMATCH', 'Route coverage belongs to another build');
  if (!coverage.complete || coverage.gaps.length || coverage.dynamicRouteCoverage !== 'COMPLETE' ||
      coverage.unprovenRoutes.length || decision.pages.some(page => page.disposition === 'UNKNOWN'))
    return proof(expectedMode, 'UNPROVEN', decision.publicationDigest, coverage.coverageDigest,
      ['ROUTE_COVERAGE_INCOMPLETE']);
  const responses = new Map(coverage.responses.map(item => [item.route, item])); const failures = [];
  const discovered = new Set([...coverage.staticRoutes, ...coverage.dynamicRoutes]);
  const expectedRoutes = new Set(decision.pages.map(page => page.route));
  for (const route of discovered) {
    if (!expectedRoutes.has(route)) failures.push(`${route}:UNEXPECTED_ROUTE`);
    if (!responses.has(route)) failures.push(`${route}:RESPONSE_MISSING`);
  }
  for (const route of [...coverage.sitemapRoutes, ...coverage.navigationRoutes]) {
    if (!discovered.has(route)) failures.push(`${route}:DISCOVERY_CLOSURE_BROKEN`);
  }
  for (const page of decision.pages) {
    const response = responses.get(page.route); const inSite = discovered.has(page.route);
    if (page.disposition === 'PUBLISH' && (!inSite || response?.status !== 200 ||
        response?.redirect || response?.robots !== 'index' || !coverage.sitemapRoutes.includes(page.route) ||
        !coverage.navigationRoutes.includes(page.route))) failures.push(`${page.pageId}:PUBLISH_UNPROVEN`);
    if (page.disposition === 'DRAFT_ONLY' && (!inSite || response?.status !== 200 || response?.redirect || response.robots !== 'noindex' ||
        coverage.sitemapRoutes.includes(page.route) || coverage.navigationRoutes.includes(page.route)))
      failures.push(`${page.pageId}:DRAFT_LEAK`);
    if (page.disposition === 'OMIT' && (inSite || coverage.sitemapRoutes.includes(page.route) ||
        coverage.navigationRoutes.includes(page.route) || !response || response.status < 400 || response.redirect))
      failures.push(`${page.pageId}:OMIT_LEAK`);
  }
  return proof(expectedMode, failures.length ? 'REJECTED' : 'VERIFIED', decision.publicationDigest,
    coverage.coverageDigest, failures);
}
