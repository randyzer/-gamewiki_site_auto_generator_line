import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApprovalRequest, createTestApprovalHarness } from '../src/approval/approval-engine.mjs';
import { authorizeCanonicalHandoff, createCanonicalHandoff, createTestValidatedInputHarness,
  partialHandoffPurposePayload } from '../src/handoff-v2/canonical-handoff.mjs';
import { createPublicationDecision, createTestRouteCoverageHarness,
  verifyPublicationProof } from '../src/publication-v2/publication-engine.mjs';
import { digest } from './state-helpers.mjs';

const pages = [
  { pageId: 'public', route: '/public', eligibility: 'ELIGIBLE', sourceDigest: digest('public') },
  { pageId: 'draft', route: '/draft', eligibility: 'DRAFT_ONLY', sourceDigest: digest('draft') },
  { pageId: 'omit', route: '/omit', eligibility: 'OMIT', sourceDigest: digest('omit') },
];

async function authorizedHandoff(t) {
  const root = await mkdtemp(join(tmpdir(), 'p4-publication-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const material = (keywordId, canonicalStatus) => ({ keywordId, keyword: keywordId, canonicalStatus,
    gapIds: canonicalStatus === 'COMPLETED' ? [] : [`gap-${keywordId}`], sourceDigest: digest(keywordId),
    contentAccepted: canonicalStatus === 'COMPLETED' });
  const validated = createTestValidatedInputHarness().validate({ runId: 'run-p4', stageId: 'stage-2', attemptId: 10,
    contextDigest: digest('context'), schemaBundleDigest: digest('schemas'), recoveryDigest: digest('recovery'),
    evidenceOutcomeDigest: digest('outcome'), siteRevision: digest('site'), domain: 'example.com', pendingRows: [],
    materials: [material('public', 'COMPLETED'), material('draft', 'PARTIAL'), material('omit', 'BLOCKED')] });
  const candidate = createCanonicalHandoff({ validatedInput: validated, consumerStage: 'stage-4' });
  const approvals = await createTestApprovalHarness({ rootDirectory: root, namespace: 'publication' });
  const binding = { runId: candidate.runId, stageId: candidate.stageId, attemptId: candidate.attemptId,
    contextDigest: candidate.contextDigest, schemaBundleDigest: candidate.schemaBundleDigest,
    purpose: 'PARTIAL_HANDOFF', purposePayload: partialHandoffPurposePayload(candidate) };
  const reference = await approvals.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 2000 });
  const consumption = await approvals.consumer.consume(reference, { ...binding, nowMs: 1500 });
  return authorizeCanonicalHandoff({ candidate, approvalConsumption: consumption });
}

test('closed-world route proof enforces public, draft and omitted behavior', async t => {
  const handoff = await authorizedHandoff(t);
  const decision = createPublicationDecision({ handoff, stageId: 'stage-4', buildDigest: digest('build'), pages });
  const harness = createTestRouteCoverageHarness();
  assert.throws(() => harness.capture({ decision: structuredClone(decision), mode: 'SIMULATED',
    discoveryVersion: 'fixture-v1', complete: false, gaps: ['untrusted'], staticRoutes: [], dynamicRoutes: [],
    sitemapRoutes: [], navigationRoutes: [], responses: [] }),
  error => error.code === 'PUBLICATION_DECISION_UNTRUSTED');
  const coverage = harness.capture({ decision, mode: 'SIMULATED', discoveryToolId: 'fixture-route-discovery',
    discoveryVersion: 'fixture-v1', observedAtMs: 1000, dynamicRouteCoverage: 'COMPLETE', unprovenRoutes: [],
    siteRevision: digest('site'), buildDigest: digest('build'), complete: true, gaps: [],
    staticRoutes: ['/public', '/draft'], dynamicRoutes: [], sitemapRoutes: ['/public'],
    navigationRoutes: ['/public'], responses: [
      { route: '/public', status: 200, redirect: null, robots: 'index', responseSha256: digest('public-response') },
      { route: '/draft', status: 200, redirect: null, robots: 'noindex', responseSha256: digest('draft-response') },
      { route: '/omit', status: 404, redirect: null, robots: null, responseSha256: digest('omit-response') },
    ] });
  const proof = verifyPublicationProof({ decision, coverage, expectedMode: 'SIMULATED' });
  assert.equal(proof.status, 'VERIFIED');
  const changedBuild = createPublicationDecision({ handoff, stageId: 'stage-4', buildDigest: digest('new-build'), pages });
  assert.throws(() => verifyPublicationProof({ decision: changedBuild, coverage, expectedMode: 'SIMULATED' }),
    error => error.code === 'ROUTE_COVERAGE_BINDING_MISMATCH');
  assert.throws(() => verifyPublicationProof({ decision, coverage: structuredClone(coverage), expectedMode: 'SIMULATED' }),
    error => error.code === 'ROUTE_COVERAGE_UNTRUSTED');
});

test('incomplete coverage and route leaks fail closed as UNPROVEN or invalid', async t => {
  const handoff = await authorizedHandoff(t);
  const decision = createPublicationDecision({ handoff, stageId: 'stage-4', buildDigest: digest('build'), pages });
  const harness = createTestRouteCoverageHarness();
  const incomplete = harness.capture({ decision, mode: 'SIMULATED', discoveryToolId: 'fixture-route-discovery',
    discoveryVersion: 'fixture-v1', observedAtMs: 1000, dynamicRouteCoverage: 'UNPROVEN', unprovenRoutes: ['/unknown'],
    siteRevision: digest('site'), buildDigest: digest('build'), complete: false, gaps: ['/unknown'],
    staticRoutes: ['/public'], dynamicRoutes: [], sitemapRoutes: ['/public'], navigationRoutes: ['/public'],
    responses: [{ route: '/public', status: 200, redirect: null, robots: 'index', responseSha256: digest('r') }] });
  assert.equal(verifyPublicationProof({ decision, coverage: incomplete, expectedMode: 'SIMULATED' }).status, 'UNPROVEN');
  assert.throws(() => verifyPublicationProof({ decision, coverage: incomplete, expectedMode: 'PRODUCTION' }),
    error => error.code === 'ROUTE_COVERAGE_MODE_INVALID');
});

test('closed-world proof rejects draft, omitted, public and unknown route leaks', async t => {
  const handoff = await authorizedHandoff(t);
  const decision = createPublicationDecision({ handoff, stageId: 'stage-4', buildDigest: digest('build'), pages });
  const harness = createTestRouteCoverageHarness();
  const coverage = harness.capture({ decision, mode: 'SIMULATED', discoveryToolId: 'fixture-route-discovery',
    discoveryVersion: 'fixture-v1', observedAtMs: 1000, dynamicRouteCoverage: 'COMPLETE', unprovenRoutes: [],
    complete: true, gaps: [], staticRoutes: ['/public', '/draft', '/omit', '/unknown'], dynamicRoutes: [],
    sitemapRoutes: ['/public', '/draft'], navigationRoutes: ['/public'], responses: [
      { route: '/public', status: 200, redirect: null, robots: 'noindex', responseSha256: digest('public-response') },
      { route: '/draft', status: 200, redirect: null, robots: 'index', responseSha256: digest('draft-response') },
      { route: '/omit', status: 200, redirect: null, robots: 'index', responseSha256: digest('omit-response') },
      { route: '/unknown', status: 200, redirect: null, robots: 'index', responseSha256: digest('unknown-response') },
    ] });
  const proof = verifyPublicationProof({ decision, coverage, expectedMode: 'SIMULATED' });
  assert.equal(proof.status, 'REJECTED');
  assert.ok(proof.failures.some(item => item.includes('PUBLISH_UNPROVEN')));
  assert.ok(proof.failures.some(item => item.includes('DRAFT_LEAK')));
  assert.ok(proof.failures.some(item => item.includes('OMIT_LEAK')));
  assert.ok(proof.failures.some(item => item.includes('UNEXPECTED_ROUTE')));
});
