import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApprovalRequest, createTestApprovalHarness } from '../../src/approval/approval-engine.mjs';
import { authorizeCanonicalHandoff, createCanonicalHandoff, createTestValidatedInputHarness,
  partialHandoffPurposePayload } from '../../src/handoff-v2/canonical-handoff.mjs';
import { replayContentIntegration, contentFixtureDigest, contentPageDigest,
  contentReplayPayloadDigest } from '../../src/v2/adapters/content-integration.mjs';
import { requireStageDependency } from '../../src/v2/stage-dependency-gate.mjs';

const fixturePath = fileURLToPath(new URL('../fixtures/v2/content/fixture-manifest.json', import.meta.url));
const fixture = async () => JSON.parse(await readFile(fixturePath, 'utf8'));
const adapterInput = (manifest, overrides = {}) => ({
  kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE',
  runId: manifest.runId, canonicalStageId: 'content-integration', mappingVersion: 'stage-identity-v1',
  contextDigest: manifest.contextDigest, featureGate: 'shadow', gateBindingDigest: 'd'.repeat(64),
  payloadDigest: contentReplayPayloadDigest({ fixtureManifest: manifest }), ...overrides,
});

function candidateForManifest(manifest) {
  const validated = createTestValidatedInputHarness().validate({
    runId: manifest.runId, stageId: 'stage-2', attemptId: manifest.sourceAttempt,
    contextDigest: manifest.contextDigest, schemaBundleDigest: manifest.schemaBundleDigest,
    recoveryDigest: manifest.recoveryDigest, evidenceOutcomeDigest: manifest.evidenceOutcomeDigest,
    siteRevision: manifest.siteRevision, domain: manifest.domain, pendingRows: manifest.pendingRows,
    materials: manifest.pages.map(page => ({ keywordId: page.pageId, keyword: page.keyword,
      canonicalStatus: page.materialStatus, gapIds: page.gapIds, sourceDigest: page.upstreamSourceDigest,
      contentAccepted: page.upstreamEligibility === 'ELIGIBLE' })),
  });
  return createCanonicalHandoff({ validatedInput: validated, consumerStage: 'stage-4' });
}

async function handoff(t, manifest, { authorize = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'p5-e-content-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const candidate = candidateForManifest(manifest);
  assert.equal(candidate.handoffDigest, manifest.handoffDigest);
  if (!authorize || candidate.authorizationStatus === 'NOT_REQUIRED') return candidate;
  const approvals = await createTestApprovalHarness({ rootDirectory: root, namespace: 'p5-e-content' });
  const binding = { runId: candidate.runId, stageId: candidate.stageId, attemptId: candidate.attemptId,
    contextDigest: candidate.contextDigest, schemaBundleDigest: candidate.schemaBundleDigest,
    purpose: 'PARTIAL_HANDOFF', purposePayload: partialHandoffPurposePayload(candidate) };
  const reference = await approvals.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 2000 });
  const consumption = await approvals.consumer.consume(reference, { ...binding, nowMs: 1500 });
  return authorizeCanonicalHandoff({ candidate, approvalConsumption: consumption });
}

const partialProjection = { stageSatisfied: false, status: 'PARTIAL' };

test('content adapter proves useful pages and preserves the publication eligibility ceiling', async t => {
  const manifest = await fixture();
  const trusted = await handoff(t, manifest);
  const replay = replayContentIntegration({ fixtureManifest: manifest,
    adapterInput: adapterInput(manifest), handoff: trusted, projection: partialProjection });
  assert.equal(replay.stageResult.status, 'PARTIAL');
  assert.equal(replay.stageResult.authoritative, false);
  assert.equal(replay.contentManifest.classification, 'OFFLINE_STUB');
  assert.equal(replay.contentManifest.handoffDigest, trusted.handoffDigest);
  assert.equal(replay.publicationDecision.pages.find(page => page.pageId === 'guide').disposition, 'PUBLISH');
  const draft = replay.publicationDecision.pages.find(page => page.pageId === 'build');
  assert.equal(draft.disposition, 'DRAFT_ONLY');
  assert.equal(draft.noindexRequired, true);
  assert.equal(replay.publicationDecision.pages.find(page => page.pageId === 'blocked').disposition, 'OMIT');
  assert.equal(Object.hasOwn(replay, 'routeCoverage'), false);
  assert.equal(Object.isFrozen(replay.contentManifest), true);
});

test('stage dependency gate accepts one exact consumed partial handoff and rejects trust or binding drift', async t => {
  const manifest = await fixture();
  const trusted = await handoff(t, manifest);
  const input = { handoff: trusted, projection: partialProjection, runId: manifest.runId,
    contextDigest: manifest.contextDigest, producerCanonicalStageId: 'keyword-research',
    consumerCanonicalStageId: 'content-integration', purpose: 'PARTIAL_HANDOFF' };
  assert.equal(requireStageDependency(input).satisfied, true);
  assert.throws(() => requireStageDependency({ ...input, handoff: structuredClone(trusted) }),
    error => error.code === 'HANDOFF_UNTRUSTED');
  assert.throws(() => requireStageDependency({ ...input, runId: 'other-run' }),
    error => error.code === 'DEPENDENCY_BINDING_MISMATCH');
  assert.throws(() => requireStageDependency({ ...input, consumerCanonicalStageId: 'template-selection' }),
    error => error.code === 'DEPENDENCY_BINDING_MISMATCH');
  const unconsumed = await handoff(t, manifest, { authorize: false });
  assert.throws(() => requireStageDependency({ ...input, handoff: unconsumed }),
    error => error.code === 'HANDOFF_APPROVAL_REQUIRED');
  for (const status of ['BLOCKED', 'FAILED']) {
    assert.throws(() => requireStageDependency({ ...input,
      projection: { stageSatisfied: false, status } }), error => error.code === 'DEPENDENCY_UNSATISFIED');
  }
});

test('fixture and page contracts reject unknown fields, digest drift, duplicate identity and cross-page evidence', async t => {
  const base = await fixture();
  const trusted = await handoff(t, base);
  const run = changed => replayContentIntegration({ fixtureManifest: changed,
    adapterInput: adapterInput(changed), handoff: trusted, projection: partialProjection });
  const resign = changed => { changed.fixtureDigest = contentFixtureDigest(changed); return changed; };
  const runDrift = resign({ ...structuredClone(base), runId: 'other-run' });
  const revisionDrift = resign({ ...structuredClone(base), siteRevision: 'f'.repeat(64) });
  const digestDrift = structuredClone(base); digestDrift.pages[0].contentDigest = 'f'.repeat(64);
  const duplicateRoute = structuredClone(base); duplicateRoute.pages[1].route = duplicateRoute.pages[0].route;
  duplicateRoute.pages[1].contentDigest = contentPageDigest(duplicateRoute.pages[1]); resign(duplicateRoute);
  const crossPage = structuredClone(base); crossPage.pages[0].sourceRefs = ['build-source'];
  crossPage.pages[0].contentDigest = contentPageDigest(crossPage.pages[0]); resign(crossPage);
  const nestedUnknown = structuredClone(base); nestedUnknown.pages[0].claims[0].unexpected = true;
  nestedUnknown.pages[0].contentDigest = contentPageDigest(nestedUnknown.pages[0]); resign(nestedUnknown);
  for (const [changed, expected] of [
    [{ ...base, unexpected: true }, 'CONTRACT_SCHEMA_INVALID'],
    [runDrift, 'CONTRACT_BINDING_MISMATCH'], [revisionDrift, 'CONTRACT_BINDING_MISMATCH'],
    [digestDrift, 'CONTRACT_DIGEST_MISMATCH'], [duplicateRoute, 'CONTRACT_SCHEMA_INVALID'],
    [crossPage, 'CONTENT_PROVENANCE_INVALID'], [nestedUnknown, 'CONTRACT_SCHEMA_INVALID'],
  ]) assert.throws(() => run(changed), error => error.code === expected);
});

test('each page type fails closed when it contains metadata without a useful result', async t => {
  const base = await fixture();
  const trusted = await handoff(t, base);
  const mutations = [
    ['GUIDE', page => ({ ...page, content: { steps: [] } })],
    ['BUILD', page => ({ ...page, content: { ...page.content, configuration: [] } })],
    ['CALCULATOR', page => ({ ...page, content: { ...page.content, testVectors: [] } })],
    ['TIER_LIST', page => ({ ...page, content: { ...page.content, tiers: [] } })],
  ];
  for (const [type, mutate] of mutations) {
    const changed = structuredClone(base); const index = changed.pages.findIndex(page => page.pageType === type);
    changed.pages[index] = mutate(changed.pages[index]);
    changed.pages[index].contentDigest = contentPageDigest(changed.pages[index]);
    changed.fixtureDigest = contentFixtureDigest(changed);
    assert.throws(() => replayContentIntegration({ fixtureManifest: changed, adapterInput: adapterInput(changed),
      handoff: trusted, projection: partialProjection }), error => error.code === 'CONTENT_USEFULNESS_INVALID');
  }
});

test('calculator rejects unsafe, unbounded and factually unreferenced rules', async t => {
  const base = await fixture(); const trusted = await handoff(t, base);
  let deep = { type: 'CONSTANT', value: 1, sourceRefs: ['calculator-source'] };
  for (let index = 0; index < 18; index++) deep = { type: 'ADD', sourceRefs: ['calculator-source'],
    args: [deep, { type: 'CONSTANT', value: 1, sourceRefs: ['calculator-source'] }] };
  const wide = { type: 'ADD', sourceRefs: ['calculator-source'], args: Array.from({ length: 8 }, () => ({
    type: 'ADD', sourceRefs: ['calculator-source'], args: Array.from({ length: 8 }, () => ({
      type: 'CONSTANT', value: 1, sourceRefs: ['calculator-source'] })) })) };
  const variants = [
    content => ({ ...content, expression: { type: 'EVAL', code: 'process.exit()' } }),
    content => ({ ...content, expression: { type: 'DIVIDE', sourceRefs: ['calculator-source'], args: [
      { type: 'CONSTANT', value: 1, sourceRefs: ['calculator-source'] },
      { type: 'CONSTANT', value: 0, sourceRefs: ['calculator-source'] }] } }),
    content => ({ ...content, expression: { type: 'CONSTANT', value: 2, sourceRefs: [] } }),
    content => ({ ...content, testVectors: [{ inputs: { base: 2 }, expected: 999 }] }),
    content => ({ ...content, expression: deep }),
    content => ({ ...content, expression: wide }),
  ];
  for (const mutate of variants) {
    const changed = structuredClone(base); const page = changed.pages.find(item => item.pageType === 'CALCULATOR');
    page.content = mutate(page.content); page.contentDigest = contentPageDigest(page);
    changed.fixtureDigest = contentFixtureDigest(changed);
    assert.throws(() => replayContentIntegration({ fixtureManifest: changed, adapterInput: adapterInput(changed),
      handoff: trusted, projection: partialProjection }), error => error.code === 'CONTENT_CALCULATION_INVALID');
  }
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
    const changed = structuredClone(base); changed.pages.find(item => item.pageType === 'CALCULATOR')
      .content.expression = { type: 'CONSTANT', value, sourceRefs: ['calculator-source'] };
    assert.throws(() => contentPageDigest(changed.pages.find(item => item.pageType === 'CALCULATOR')),
      error => error.code === 'CONTEXT_CANONICALIZATION_INVALID');
  }
});

test('unproven content and capability requests stop before publication or effects', async t => {
  const base = await fixture(); const trusted = await handoff(t, base); let effects = 0;
  const invalid = structuredClone(base); const guide = invalid.pages.find(page => page.pageId === 'guide');
  guide.content.steps = []; guide.contentDigest = contentPageDigest(guide); invalid.fixtureDigest = contentFixtureDigest(invalid);
  assert.throws(() => replayContentIntegration({ fixtureManifest: invalid, adapterInput: adapterInput(invalid),
    handoff: trusted, projection: partialProjection }), error => error.code === 'CONTENT_USEFULNESS_INVALID');
  const promotion = structuredClone(base); const draft = promotion.pages.find(page => page.pageId === 'build');
  draft.upstreamEligibility = 'ELIGIBLE'; draft.contentDigest = contentPageDigest(draft);
  promotion.fixtureDigest = contentFixtureDigest(promotion);
  assert.throws(() => replayContentIntegration({ fixtureManifest: promotion, adapterInput: adapterInput(promotion),
    handoff: trusted, projection: partialProjection }), error => error.code === 'CONTENT_USEFULNESS_INVALID' ||
      error.code === 'PUBLICATION_HANDOFF_MISMATCH');
  const blockedRender = structuredClone(base); const blocked = blockedRender.pages.find(page => page.pageId === 'blocked');
  blocked.pageType = 'GUIDE'; blocked.sourceRefs = ['blocked-source']; blocked.claims = [{ claimId: 'blocked-claim',
    kind: 'FACT', statement: 'Blocked fixture content must never render.', sourceRefs: ['blocked-source'] }];
  blocked.content = { steps: [
    { order: 1, action: 'Attempt blocked fixture content.', expectedOutcome: 'The content remains unavailable.', sourceRefs: ['blocked-source'] },
    { order: 2, action: 'Stop the blocked fixture flow.', expectedOutcome: 'No valid body is produced.', sourceRefs: ['blocked-source'] },
  ] }; blocked.contentDigest = contentPageDigest(blocked); blockedRender.fixtureDigest = contentFixtureDigest(blockedRender);
  assert.throws(() => replayContentIntegration({ fixtureManifest: blockedRender,
    adapterInput: adapterInput(blockedRender), handoff: trusted, projection: partialProjection }),
  error => error.code === 'CONTENT_USEFULNESS_INVALID');
  const unproven = structuredClone(base); const unprovenPage = unproven.pages.find(page => page.pageId === 'guide');
  unprovenPage.upstreamEligibility = 'UNPROVEN'; unprovenPage.contentDigest = contentPageDigest(unprovenPage);
  unproven.handoffDigest = candidateForManifest(unproven).handoffDigest;
  unproven.fixtureDigest = contentFixtureDigest(unproven);
  const unprovenHandoff = await handoff(t, unproven);
  assert.throws(() => replayContentIntegration({ fixtureManifest: unproven, adapterInput: adapterInput(unproven),
    handoff: unprovenHandoff, projection: partialProjection }), error => error.code === 'CONTENT_UNPROVEN');
  for (const capability of ['FILE_WRITE', 'CODEGEN', 'BUILD', 'BROWSER', 'WORKER', 'GIT', 'NETWORK',
    'SERVICE_RESUME', 'DEPLOYMENT', 'AUTHORITY_SWITCH']) {
    assert.throws(() => replayContentIntegration({ fixtureManifest: base, adapterInput: adapterInput(base),
      handoff: trusted, projection: partialProjection, requestedCapabilities: [capability],
      effects: { execute: () => { effects += 1; } } }), error => error.code === 'POLICY_DENIED');
  }
  assert.equal(effects, 0);
});
