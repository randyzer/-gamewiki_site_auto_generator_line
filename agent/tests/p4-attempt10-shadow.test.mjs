import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApprovalRequest, createTestApprovalHarness } from '../src/approval/approval-engine.mjs';
import { authorizeCanonicalHandoff, createCanonicalHandoff, createTestValidatedInputHarness,
  partialHandoffPurposePayload } from '../src/handoff-v2/canonical-handoff.mjs';
import { compareHandoffShadow } from '../src/handoff-v2/handoff-shadow.mjs';
import { createPublicationDecision, createTestRouteCoverageHarness,
  verifyPublicationProof } from '../src/publication-v2/publication-engine.mjs';
import { comparePublicationShadow } from '../src/publication-v2/publication-shadow.mjs';
import { digest } from './state-helpers.mjs';

test('Attempt 10 real-format fixture preserves quality and remains publication-unproven', async t => {
  const fixtureRoot = new URL('./fixtures/regressions/attempt-10-material-gap-format/', import.meta.url);
  const fixture = JSON.parse(await readFile(new URL('fixture-manifest.json', fixtureRoot)));
  const expected = JSON.parse(await readFile(new URL('expected.json', fixtureRoot)));
  const root = await mkdtemp(join(tmpdir(), 'p4-attempt10-')); t.after(() => rm(root, { recursive: true, force: true }));
  const materials = fixture.materials.map((item, index) => ({ keywordId: `keyword-${index + 1}`,
    keyword: item.file.replace(/素材\.md$/u, ''), canonicalStatus: item.status,
    gapIds: item.status === 'COMPLETED' ? [] : [`gap-${index + 1}`],
    sourceDigest: item.fixtureSha256, contentAccepted: false }));
  const validated = createTestValidatedInputHarness().validate({ runId: 'wallpaper-engine-002-shadow',
    stageId: 'stage-2', attemptId: fixture.sourceAttempt, contextDigest: digest('attempt10-context'),
    schemaBundleDigest: digest('attempt10-schemas'), recoveryDigest: digest('attempt10-recovery'),
    evidenceOutcomeDigest: digest('attempt10-outcome'), siteRevision: digest('attempt10-site'),
    domain: 'wallpaper-engine.example', materials, pendingRows: expected.pendingIds });
  const candidate = createCanonicalHandoff({ validatedInput: validated, consumerStage: 'stage-3' });
  assert.equal(candidate.authorizationStatus, 'REQUIRED');
  assert.deepEqual(candidate.pendingRows, expected.pendingIds);
  assert.deepEqual(Object.fromEntries(['UNPROVEN', 'DRAFT_ONLY', 'OMIT'].map(eligibility =>
    [eligibility, candidate.materials.filter(item => item.publicationEligibility === eligibility).length])),
  { UNPROVEN: 2, DRAFT_ONLY: 25, OMIT: 4 });

  const approvals = await createTestApprovalHarness({ rootDirectory: root, namespace: 'attempt10' });
  const binding = { runId: candidate.runId, stageId: candidate.stageId, attemptId: candidate.attemptId,
    contextDigest: candidate.contextDigest, schemaBundleDigest: candidate.schemaBundleDigest,
    purpose: 'PARTIAL_HANDOFF', purposePayload: partialHandoffPurposePayload(candidate) };
  const reference = await approvals.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 2000 });
  const consumption = await approvals.consumer.consume(reference, { ...binding, nowMs: 1500 });
  const handoff = authorizeCanonicalHandoff({ candidate, approvalConsumption: consumption });
  const pages = handoff.materials.map((item, index) => ({ pageId: item.keywordId, route: `/keyword/${index + 1}`,
    eligibility: item.publicationEligibility, sourceDigest: item.sourceDigest }));
  const decision = createPublicationDecision({ handoff, stageId: 'stage-4', buildDigest: digest('attempt10-build'), pages });
  assert.equal(decision.pages.filter(item => item.disposition === 'UNKNOWN').length, 2);
  assert.equal(decision.pages.filter(item => item.disposition === 'DRAFT_ONLY').length, 25);
  assert.equal(decision.pages.filter(item => item.disposition === 'OMIT').length, 4);

  const included = decision.pages.filter(item => item.disposition === 'DRAFT_ONLY').map(item => item.route);
  const publicRoutes = [];
  const coverage = createTestRouteCoverageHarness().capture({ decision, mode: 'SIMULATED',
    discoveryToolId: 'attempt10-route-discovery', discoveryVersion: 'attempt10-fixture-v1', observedAtMs: 1000,
    dynamicRouteCoverage: 'COMPLETE', unprovenRoutes: [],
    complete: true, gaps: [], staticRoutes: included, dynamicRoutes: [], sitemapRoutes: publicRoutes,
    navigationRoutes: publicRoutes, responses: decision.pages.map(item => ({ route: item.route,
      status: item.disposition === 'DRAFT_ONLY' ? 200 : 404, redirect: null,
      robots: item.disposition === 'PUBLISH' ? 'index' : item.disposition === 'DRAFT_ONLY' ? 'noindex' : null,
      responseSha256: digest(`response:${item.route}`) })) });
  const proof = verifyPublicationProof({ decision, coverage, expectedMode: 'SIMULATED' });
  assert.equal(proof.status, 'UNPROVEN');
  assert.equal(compareHandoffShadow({ legacy: { status: 'PARTIAL' }, canonical: handoff }).authoritative, 'LEGACY');
  assert.equal(comparePublicationShadow({ legacy: 'PARTIAL', proof }).authoritative, 'LEGACY');
});
