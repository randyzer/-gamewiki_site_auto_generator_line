import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApprovalRequest, createTestApprovalHarness } from '../../src/approval/approval-engine.mjs';
import { authorizeCanonicalHandoff, createCanonicalHandoff, createTestValidatedInputHarness,
  partialHandoffPurposePayload } from '../../src/handoff-v2/canonical-handoff.mjs';
import { createKeywordLegacyIdentityBinding, createKeywordResearchHandoff,
  keywordReplayPayloadDigest, replayKeywordResearchAttempt } from '../../src/v2/adapters/keyword-research.mjs';
import { createTestHostCapabilityRegistry } from '../../src/v2/host/capability-registry.mjs';
import { assertMigrationDecision, computeMigrationDecisionDigest,
  recoverOfflineReplayAuthority, replaySevenStageOffline } from '../../src/v2/stage-coordinator.mjs';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const fixtureRoot = join(repoRoot, 'agent/tests/fixtures');
const sha = value => value.repeat(64);
const stageIds = ['homepage-research', 'keyword-research', 'template-selection', 'content-integration',
  'ui-ux-audit', 'prelaunch-acceptance', 'deployment-plan'];
const json = async path => JSON.parse(await readFile(join(fixtureRoot, path), 'utf8'));

async function authorize(t, candidate, namespace) {
  const root = await mkdtemp(join(tmpdir(), `${namespace}-`));
  t.after(() => rm(root, { recursive: true, force: true }));
  const approvals = await createTestApprovalHarness({ rootDirectory: root, namespace });
  const binding = { runId: candidate.runId, stageId: candidate.stageId, attemptId: candidate.attemptId,
    contextDigest: candidate.contextDigest, schemaBundleDigest: candidate.schemaBundleDigest,
    purpose: 'PARTIAL_HANDOFF', purposePayload: partialHandoffPurposePayload(candidate) };
  const reference = await approvals.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  const consumption = await approvals.consumer.consume(reference, { ...binding, nowMs: 1500 });
  return authorizeCanonicalHandoff({ candidate, approvalConsumption: consumption });
}

function stageInput(runId, contextDigest, canonicalStageId, payloadDigest) {
  return { kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE',
    runId, canonicalStageId, mappingVersion: 'stage-identity-v1', contextDigest,
    featureGate: 'shadow', gateBindingDigest: sha('d'), payloadDigest };
}

async function coordinatorInput(t) {
  const [homepageDisk, keywordManifest, expected, lineage, template, content, ui, prelaunch, deployment] =
    await Promise.all([
      json('v2/homepage/fixture-manifest.json'),
      json('regressions/attempt-10-material-gap-format/fixture-manifest.json'),
      json('regressions/attempt-10-material-gap-format/expected.json'),
      json('regressions/attempt-10-material-gap-format/lineage.json'),
      json('v2/template/fixture-manifest.json'), json('v2/content/fixture-manifest.json'),
      json('v2/ui/fixture-manifest.json'), json('v2/prelaunch/fixture-manifest.json'),
      json('v2/deployment/fixture-manifest.json'),
    ]);
  const runId = content.runId, contextDigest = content.contextDigest;
  const homepage = structuredClone(homepageDisk);
  homepage.sourceRunId = runId;
  const sourceFiles = new Map(), derivedFiles = new Map();
  for (const item of homepage.sources) {
    sourceFiles.set(item.sourceRelativePath, await readFile(join(repoRoot, item.sourceRelativePath)));
    if (item.derivedPath)
      derivedFiles.set(item.derivedPath, await readFile(join(fixtureRoot, 'v2/homepage', item.derivedPath)));
  }
  const materialBytes = new Map();
  for (const item of keywordManifest.materials)
    materialBytes.set(item.fixturePath,
      await readFile(join(fixtureRoot, 'regressions/attempt-10-material-gap-format', item.fixturePath)));
  const legacyIdentity = createKeywordLegacyIdentityBinding({ fixtureManifest: keywordManifest,
    expected, lineage, originalNamespace: 'p3-shadow-alias', originalValue: 'stage-2', sourceAttempt: 10 });
  const keywordPayload = { fixtureManifest: keywordManifest, expected, lineage, legacyIdentity, materialBytes };
  const keywordReplay = replayKeywordResearchAttempt({ ...keywordPayload, sourceAttempt: 10,
    adapterInput: stageInput(runId, contextDigest, 'keyword-research', keywordReplayPayloadDigest(keywordPayload)),
    recoveryDigest: sha('c'), schemaBundleDigest: sha('d'), evidenceOutcomeDigest: sha('e'),
    siteRevision: content.siteRevision, domain: content.domain });
  const templateHandoff = await authorize(t, createKeywordResearchHandoff({ replay: keywordReplay,
    consumerCanonicalStageId: 'template-selection' }), 'p5-h-template');

  const validated = createTestValidatedInputHarness().validate({
    runId, stageId: 'stage-2', attemptId: content.sourceAttempt, contextDigest,
    schemaBundleDigest: content.schemaBundleDigest, recoveryDigest: content.recoveryDigest,
    evidenceOutcomeDigest: content.evidenceOutcomeDigest, siteRevision: content.siteRevision,
    domain: content.domain, pendingRows: content.pendingRows,
    materials: content.pages.map(page => ({ keywordId: page.pageId, keyword: page.keyword,
      canonicalStatus: page.materialStatus, gapIds: page.gapIds,
      sourceDigest: page.upstreamSourceDigest,
      contentAccepted: page.upstreamEligibility === 'ELIGIBLE' })),
  });
  const contentHandoff = await authorize(t, createCanonicalHandoff({ validatedInput: validated,
    consumerStage: 'stage-4' }), 'p5-h-content');
  return {
    mode: 'OFFLINE_SIMULATED',
    runId, contextDigest, requestedCapabilities: [],
    transactionBinding: { schemaBundleDigest: sha('d'), policyVersion: 'p4-shadow-v1' },
    featureGates: Object.fromEntries(stageIds.map(stageId => [stageId, 'shadow'])),
    stages: {
      'homepage-research': { fixtureManifest: homepage, sourceFiles, derivedFiles,
        zipBytes: sourceFiles.get(homepage.iconArchive.sourceRelativePath) },
      'keyword-research': { sourceAttempt: 10, ...keywordPayload,
        recoveryDigest: sha('c'), schemaBundleDigest: sha('d'), evidenceOutcomeDigest: sha('e'),
        siteRevision: content.siteRevision, domain: content.domain, templateHandoff,
        templateProjection: { stageSatisfied: false, status: 'PARTIAL' } },
      'template-selection': { fixtureManifest: template },
      'content-integration': { fixtureManifest: content, handoff: contentHandoff,
        projection: { stageSatisfied: false, status: 'PARTIAL' } },
      'ui-ux-audit': { fixtureManifest: ui },
      'prelaunch-acceptance': { fixtureManifest: prelaunch },
      'deployment-plan': { fixtureManifest: deployment },
    },
  };
}

async function recoveryAuthority(t, input) {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'p5-h-recovery-authority-'));
  t.after(() => rm(rootDirectory, { recursive: true, force: true }));
  const approvalHarness = await createTestApprovalHarness({ rootDirectory, namespace: 'p5-h-replay' });
  const capabilityRegistry = createTestHostCapabilityRegistry();
  const capability = capabilityRegistry.issue({ capability: 'OFFLINE_RECOVERY', mode: 'SIMULATED',
    rootDirectory });
  return recoverOfflineReplayAuthority({ rootDirectory, approvalHarness, capabilityRegistry, capability,
    replayBinding: { runId: input.runId, contextDigest: input.contextDigest,
      schemaBundleDigest: input.transactionBinding.schemaBundleDigest,
      policyVersion: input.transactionBinding.policyVersion } });
}

test('fixed seven-stage offline path preserves real adapter outcomes and stops at deployment approval', async t => {
  const input = await coordinatorInput(t);
  const result = replaySevenStageOffline(input, await recoveryAuthority(t, input));
  assert.deepEqual(result.stageResults.map(item => item.canonicalStageId), stageIds);
  assert.deepEqual(result.stageResults.map(item => item.status),
    ['COMPLETED', 'PARTIAL', 'PARTIAL', 'PARTIAL', 'COMPLETED', 'COMPLETED', 'COMPLETED']);
  assert.ok(result.stageResults.every(item => item.authoritative === false));
  assert.ok(result.stageResults.every(item => item.runId === result.runId &&
    item.contextDigest === result.contextDigest));
  assert.equal(result.templateDependency.reason, 'PARTIAL_HANDOFF_APPROVED');
  assert.equal(result.replays['deployment-plan'].projection.status, 'WAITING_FOR_USER');
  assert.equal(result.frameworkCeiling, 'P5_OFFLINE_FRAMEWORK_COMPLETE');
  assert.equal(result.adapterReplayComplete, true);
  assert.equal(result.endToEndDependencySatisfied, false);
  assert.equal(result.chainIntegrity, 'OFFLINE_FIXTURE_BRIDGE_GAPS');
  assert.equal(result.terminalProjectionScope, 'DEPLOYMENT_ADAPTER_LOCAL');
  assert.deepEqual(result.fixtureBridgeGaps, ['KEYWORD_TO_CONTENT_FIXTURE_CONTINUITY_UNPROVEN']);
  assert.equal(result.deploymentExecuted, false);
  assert.equal(result.productionReady, false);
  assert.equal(result.authoritySwitchAllowed, false);
  assert.equal(result.productionEffects, 0);
  assert.equal(result.transactionRecovery.status, 'NOT_STARTED');
  assert.equal(result.transactionRecovery.authority, 'P5_B_VERIFIED');
  assert.equal(Object.isFrozen(result), true);
});

test('an independently approved but digest-equivalent content handoff cannot erase the fixture bridge', async t => {
  const base = await coordinatorInput(t);
  const independent = await coordinatorInput(t);
  const authority = await recoveryAuthority(t, base);
  const result = replaySevenStageOffline({ ...base, stages: { ...base.stages,
    'content-integration': { ...base.stages['content-integration'],
      handoff: independent.stages['content-integration'].handoff } } }, authority);
  assert.equal(result.adapterReplayComplete, true);
  assert.equal(result.endToEndDependencySatisfied, false);
  assert.equal(result.chainIntegrity, 'OFFLINE_FIXTURE_BRIDGE_GAPS');
  assert.deepEqual(result.fixtureBridgeGaps, ['KEYWORD_TO_CONTENT_FIXTURE_CONTINUITY_UNPROVEN']);
});

test('PARTIAL research remains draft-only or omitted and is never upgraded by downstream stages', async t => {
  const input = await coordinatorInput(t);
  const result = replaySevenStageOffline(input, await recoveryAuthority(t, input));
  assert.deepEqual(result.replays['keyword-research'].summary.statusCounts,
    { COMPLETED: 2, PARTIAL: 25, BLOCKED: 4 });
  const pages = result.replays['content-integration'].publicationDecision.pages;
  assert.equal(pages.find(item => item.pageId === 'build').disposition, 'DRAFT_ONLY');
  assert.equal(pages.find(item => item.pageId === 'build').noindexRequired, true);
  assert.equal(pages.find(item => item.pageId === 'blocked').disposition, 'OMIT');
  assert.equal(result.routeAssessment.publicationProof.status, 'VERIFIED');
});

test('coordinator denies runtime injection, capabilities, extra stages and cross-run fixtures', async t => {
  const base = await coordinatorInput(t);
  const authority = await recoveryAuthority(t, base);
  for (const changed of [
    { ...base, runtime: { execute() {} } },
    { ...base, requestedCapabilities: ['NETWORK'] },
    { ...base, stages: { ...base.stages, advertising: {} } },
    { ...base, stages: { ...base.stages,
      'template-selection': { ...base.stages['template-selection'], executor() {} } } },
  ]) {
    assert.throws(() => replaySevenStageOffline(changed, authority), error =>
      ['CONTRACT_SCHEMA_INVALID', 'POLICY_DENIED'].includes(error.code));
  }
  const crossRun = structuredClone(base.stages['content-integration'].fixtureManifest);
  crossRun.runId = 'other-run';
  assert.throws(() => replaySevenStageOffline({ ...base, stages: { ...base.stages,
    'content-integration': { ...base.stages['content-integration'], fixtureManifest: crossRun } } }, authority),
  error => ['CONTRACT_BINDING_MISMATCH', 'CONTRACT_DIGEST_MISMATCH'].includes(error.code));
});

test('replay requires genuine recovery authority and rejects clones, handcrafted values and cross-run reuse', async t => {
  const input = await coordinatorInput(t);
  const authority = await recoveryAuthority(t, input);
  assert.throws(() => replaySevenStageOffline(input), error => error.code === 'TRANSACTION_AUTHORITY_UNTRUSTED');
  assert.throws(() => replaySevenStageOffline(input, structuredClone(authority)),
    error => error.code === 'TRANSACTION_AUTHORITY_UNTRUSTED');
  assert.throws(() => replaySevenStageOffline(input, { ...authority }),
    error => error.code === 'TRANSACTION_AUTHORITY_UNTRUSTED');
  assert.throws(() => replaySevenStageOffline({ ...input, runId: 'other-run' }, authority),
    error => error.code === 'TRANSACTION_AUTHORITY_MISMATCH');
  assert.throws(() => replaySevenStageOffline({ ...input,
    transactionBinding: { ...input.transactionBinding, policyVersion: 'p4-shadow-v2' } }, authority),
  error => error.code === 'TRANSACTION_AUTHORITY_MISMATCH');
});

test('migration decisions are strict, digest-bound and cannot mutate the actual gate', async t => {
  const input = await coordinatorInput(t);
  input.featureGates = Object.fromEntries(stageIds.map((stageId, index) =>
    [stageId, ['legacy', 'shadow', 'v2'][index % 3]]));
  const result = replaySevenStageOffline(input, await recoveryAuthority(t, input));
  assert.equal(result.migrationDecisions.length, 7);
  for (const decision of result.migrationDecisions) {
    assert.equal(assertMigrationDecision(decision), decision);
    assert.equal(decision.authoritative, false);
    assert.equal(decision.gateObservationScope, 'OFFLINE_SIMULATED');
    assert.equal(decision.decision, 'HOLD');
    assert.equal(decision.currentGate, decision.actualGateBefore);
    assert.equal(decision.actualGateAfter, decision.actualGateBefore);
    assert.equal(decision.actualGateBefore, input.featureGates[decision.canonicalStageId]);
    assert.ok(decision.missingEvidence.length > 0);
  }
  const digestDrift = { ...result.migrationDecisions[0], missingEvidence: ['changed'] };
  assert.throws(() => assertMigrationDecision(digestDrift), error => error.code === 'CONTRACT_DIGEST_MISMATCH');
  const mutation = { ...result.migrationDecisions[0], actualGateAfter: 'v2' };
  mutation.decisionDigest = computeMigrationDecisionDigest(mutation);
  assert.throws(() => assertMigrationDecision(mutation), error => error.code === 'MIGRATION_GATE_MUTATION_DENIED');
  const authoritative = { ...result.migrationDecisions[0], authoritative: true };
  authoritative.decisionDigest = computeMigrationDecisionDigest(authoritative);
  assert.throws(() => assertMigrationDecision(authoritative), error => error.code === 'CONTRACT_SCHEMA_INVALID');
  const productionScope = { ...result.migrationDecisions[0], gateObservationScope: 'PRODUCTION' };
  productionScope.decisionDigest = computeMigrationDecisionDigest(productionScope);
  assert.throws(() => assertMigrationDecision(productionScope), error => error.code === 'CONTRACT_SCHEMA_INVALID');
  const unknown = { ...result.migrationDecisions[0], extra: true };
  unknown.decisionDigest = computeMigrationDecisionDigest(unknown);
  assert.throws(() => assertMigrationDecision(unknown), error => error.code === 'CONTRACT_SCHEMA_INVALID');
});
