import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sha256 } from '../src/files.mjs';
import { assessKeywordEvidenceOutcome, keywordEvidenceChanges, keywordEvidencePlanStrategySha256,
  keywordEvidenceState, verifyKeywordEvidencePlan } from '../src/keyword-evidence-plan.mjs';

const recoverySha256 = 'a'.repeat(64);

async function planFixture(t, patch = {}) {
  const root = await mkdtemp(join(await realpath(tmpdir()), '.keyword-evidence-plan-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const recoveryDirectory = join(root, 'recovery');
  await mkdir(join(recoveryDirectory, 'data'), { recursive: true });
  await writeFile(join(recoveryDirectory, 'data', 'RAW_LINEAGE.json'), JSON.stringify({
    pendingIds: [36], rows: [
      { id: '4', raw: 'best wallpaper engine wallpapers', final: 'Wallpaper Engine best wallpapers' },
      { id: '36', raw: 'wallpaper engine space', final: null },
      { id: '91', raw: 'wallpaper engine latest version', final: 'Wallpaper Engine latest version' },
    ],
  }));
  await writeFile(join(recoveryDirectory, 'data', 'keywords.json'), JSON.stringify({ categories: [{
    category: 'Guides', keywords: ['Wallpaper Engine latest version', 'Wallpaper Engine best wallpapers'],
  }] }));
  await writeFile(join(recoveryDirectory, 'data', 'Wallpaper Engine latest version素材.md'),
    '- 状态: PARTIAL\n- 缺口: Current stable version and release date need an official source body.\n');
  await writeFile(join(recoveryDirectory, 'data', 'Wallpaper Engine best wallpapers素材.md'),
    '- 状态: PARTIAL\n- 缺口: Workshop item details need first-party verification.\n');
  const recovery = { directory: recoveryDirectory,
    files: [{ path: 'RAW_LINEAGE.json' }, { path: 'keywords.json' },
      { path: 'Wallpaper Engine latest version素材.md' }] };
  recovery.files.push({ path: 'Wallpaper Engine best wallpapers素材.md' });
  const plan = {
    kind: 'KEYWORD_EVIDENCE_PLAN_V2',
    runId: 'fixture-run',
    stage: 'game-innerpage-keyword-information-research',
    recoverySha256,
    serviceStops: ['steam-community', 'youtube-subtitles'],
    serviceResumes: [],
    tasks: [{
      keyword: 'Wallpaper Engine latest version',
      rawRows: [91],
      gap: 'Current stable version and release date need an official source body.',
      tool: 'serper',
      target: 'site:wallpaperengine.io official version release',
      expectedEvidence: 'An official release page body that states the version and date.',
      acceptanceCriteria: ['Official body states the current stable version and release date.'],
      stopConditions: ['OFFICIAL_SOURCE_UNAVAILABLE', 'SERVICE_SUSPENDED'],
      sourceRequirements: { allowedSourceTypes: ['FIRST_PARTY'], requiresBody: true,
        requiresCurrentAccess: true },
      fallbackDisposition: 'KEEP_PARTIAL',
      expectedStatusTransition: { from: 'PARTIAL', to: 'COMPLETED' },
    }],
    pendingRows: [{ row: 36, rawKeyword: 'wallpaper engine space', decision: 'PENDING', targetKeyword: null }],
    ...patch,
  };
  const bytes = Buffer.from(JSON.stringify(plan, null, 2) + '\n');
  const path = join(root, 'plan.json');
  await writeFile(path, bytes);
  return { plan, recovery, ref: { path, sha256: sha256(bytes) } };
}

const context = (recovery, overrides = {}) => ({
  runId: 'fixture-run', recoverySha256,
  serviceStops: ['steam-community', 'youtube-subtitles'], serviceResumes: [], recovery, ...overrides,
});

test('evidence plan binds the run, recovery snapshot, service decisions and concrete tasks', async t => {
  const { ref, recovery } = await planFixture(t);
  const verified = await verifyKeywordEvidencePlan(context(recovery), ref);
  assert.equal(verified.sha256, ref.sha256);
  assert.equal(verified.plan.tasks.length, 1);
  assert.equal(verified.plan.tasks[0].tool, 'serper');
  assert.deepEqual(verified.plan.tasks[0].expectedStatusTransition,
    { from: 'PARTIAL', to: 'COMPLETED' });
  assert.deepEqual(verified.plan.pendingRows, [
    { row: 36, rawKeyword: 'wallpaper engine space', decision: 'PENDING', targetKeyword: null },
  ]);
});

test('evidence plan rejects empty work, stale bindings and changed bytes', async t => {
  for (const patch of [
    { tasks: [] },
    { runId: 'another-run' },
    { recoverySha256: 'b'.repeat(64) },
    { serviceStops: ['youtube-subtitles'] },
  ]) {
    const { ref, recovery } = await planFixture(t, patch);
    await assert.rejects(verifyKeywordEvidencePlan(context(recovery), ref), /KEYWORD_EVIDENCE_PLAN_INVALID/);
  }
  const { ref, recovery } = await planFixture(t);
  await writeFile(ref.path, '{}');
  await assert.rejects(verifyKeywordEvidencePlan(context(recovery), ref), /KEYWORD_EVIDENCE_PLAN_INVALID/);
});

test('evidence plan rejects the legacy schema and incomplete acceptance contracts', async t => {
  for (const taskPatch of [
    { acceptanceCriteria: [] },
    { stopConditions: [] },
    { sourceRequirements: { allowedSourceTypes: [], requiresBody: true, requiresCurrentAccess: true } },
    { fallbackDisposition: 'PRETEND_COMPLETE' },
    { expectedStatusTransition: { from: 'COMPLETED', to: 'PARTIAL' } },
  ]) {
    const original = (await planFixture(t)).plan.tasks[0];
    const { ref, recovery } = await planFixture(t, { tasks: [{ ...original, ...taskPatch }] });
    await assert.rejects(verifyKeywordEvidencePlan(context(recovery), ref), /KEYWORD_EVIDENCE_PLAN_INVALID/);
  }
  const legacy = await planFixture(t, { kind: 'KEYWORD_EVIDENCE_PLAN_V1' });
  await assert.rejects(verifyKeywordEvidencePlan(context(legacy.recovery), legacy.ref), /V2/);
});

test('evidence plan cannot schedule a suspended service unless that service is explicitly resumed', async t => {
  const task = {
    keyword: 'Wallpaper Engine best wallpapers', rawRows: [4],
    gap: 'Workshop item details need first-party verification.', tool: 'steam-community',
    target: 'https://steamcommunity.com/app/431960/workshop/',
    expectedEvidence: 'Current workshop item detail pages and author information.',
    acceptanceCriteria: ['Workshop body identifies the current item and author.'],
    stopConditions: ['SERVICE_SUSPENDED'],
    sourceRequirements: { allowedSourceTypes: ['PLATFORM_FIRST_PARTY'], requiresBody: true,
      requiresCurrentAccess: true },
    fallbackDisposition: 'KEEP_PARTIAL',
    expectedStatusTransition: { from: 'PARTIAL', to: 'COMPLETED' },
  };
  const { ref, recovery } = await planFixture(t, { tasks: [task] });
  await assert.rejects(verifyKeywordEvidencePlan(context(recovery), ref), /service is suspended.*steam-community/i);

  const resumed = await planFixture(t, { serviceStops: ['youtube-subtitles'],
    serviceResumes: ['steam-community'], tasks: [task] });
  const verified = await verifyKeywordEvidencePlan(context(resumed.recovery, { serviceStops: ['youtube-subtitles'],
    serviceResumes: ['steam-community'] }), resumed.ref);
  assert.equal(verified.plan.tasks[0].tool, 'steam-community');
});

test('a suspended platform cannot be reached indirectly through a generic search task', async t => {
  const { ref, recovery } = await planFixture(t, { tasks: [{
    keyword: 'Wallpaper Engine latest version', rawRows: [91], gap: 'Missing official version',
    tool: 'serper', target: 'site:steamcommunity.com/games/431960/announcements version',
    expectedEvidence: 'Official announcement body with the current version.',
    acceptanceCriteria: ['Official announcement states the current version.'],
    stopConditions: ['SERVICE_SUSPENDED'],
    sourceRequirements: { allowedSourceTypes: ['PLATFORM_FIRST_PARTY'], requiresBody: true,
      requiresCurrentAccess: true }, fallbackDisposition: 'KEEP_PARTIAL',
    expectedStatusTransition: { from: 'PARTIAL', to: 'COMPLETED' },
  }] });
  await assert.rejects(verifyKeywordEvidencePlan(context(recovery), ref), /suspended Steam Community/i);
});

test('pending ambiguous rows cannot be smuggled into evidence tasks', async t => {
  const { ref, recovery } = await planFixture(t, { tasks: [{
    keyword: 'Wallpaper Engine space', rawRows: [36], gap: 'Unknown user intent.', tool: 'serper',
    target: 'wallpaper engine space', expectedEvidence: 'Clarify whether this is a site or space wallpaper intent.',
    acceptanceCriteria: ['The user intent is explicit.'], stopConditions: ['USER_DECISION_REQUIRED'],
    sourceRequirements: { allowedSourceTypes: ['FIRST_PARTY'], requiresBody: true,
      requiresCurrentAccess: true }, fallbackDisposition: 'WAIT_FOR_USER',
    expectedStatusTransition: { from: 'BLOCKED', to: 'PARTIAL' },
  }] });
  await assert.rejects(verifyKeywordEvidencePlan(context(recovery), ref), /pending raw row 36/i);
});

test('recovery lineage prevents omitted pending rows, invented keywords and wrong raw-row ownership', async t => {
  for (const patch of [
    { pendingRows: [] },
    { tasks: [{ keyword: 'Invented guide', rawRows: [91], gap: 'Missing fact', tool: 'serper',
      target: 'official guide', expectedEvidence: 'Official page body' }] },
    { tasks: [{ keyword: 'Wallpaper Engine latest version', rawRows: [4], gap: 'Missing fact', tool: 'serper',
      target: 'official guide', expectedEvidence: 'Official page body' }] },
    { pendingRows: [{ row: 36, rawKeyword: 'different raw text', decision: 'PENDING', targetKeyword: null }] },
  ]) {
    const { ref, recovery } = await planFixture(t, patch);
    await assert.rejects(verifyKeywordEvidencePlan(context(recovery), ref), /KEYWORD_EVIDENCE_PLAN_INVALID/);
  }
});

test('evidence progress counts only new or changed evidence and blocker files', async t => {
  const root = await mkdtemp(join(await realpath(tmpdir()), '.keyword-evidence-progress-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'evidence'));
  await writeFile(join(root, 'evidence', 'old.json'), '{"fact":"old"}');
  await writeFile(join(root, 'report.md'), 'rewritten report');
  const before = await keywordEvidenceState(root);
  await writeFile(join(root, 'report.md'), 'rewritten again');
  assert.deepEqual(keywordEvidenceChanges(before, await keywordEvidenceState(root)),
    { evidenceFiles: [], serviceBlockerChanged: false });
  await writeFile(join(root, 'SERVICE_BLOCKERS.json'), '{"stops":[]}');
  await writeFile(join(root, 'evidence', 'new.json'), '{"fact":"new"}');
  assert.deepEqual(keywordEvidenceChanges(before, await keywordEvidenceState(root)),
    { evidenceFiles: ['evidence/new.json'], serviceBlockerChanged: true });
});

test('host assessment requires changed source bytes and a matching material transition to close a gap', async t => {
  const { plan } = await planFixture(t);
  const root = await mkdtemp(join(await realpath(tmpdir()), '.keyword-evidence-outcome-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'evidence'));
  const material = join(root, 'Wallpaper Engine latest version素材.md');
  await writeFile(material,
    '- 状态: PARTIAL\n- 缺口: Current stable version and release date need an official source body.\n');
  const before = await keywordEvidenceState(root);
  const source = { url: 'https://wallpaperengine.io/release', accessResult: 'HTTP_200',
    fact: plan.tasks[0].acceptanceCriteria[0] };
  const sourceBytes = Buffer.from(JSON.stringify(source));
  await writeFile(join(root, 'evidence/release.json'), sourceBytes);
  await writeFile(material, '- 状态: COMPLETED\n');
  const after = await keywordEvidenceState(root);
  const claims = {
    kind: 'KEYWORD_EVIDENCE_CLAIMS_V2', runId: plan.runId, stage: plan.stage,
    recoverySha256: plan.recoverySha256, planSha256: 'b'.repeat(64), tasks: [{
      keyword: plan.tasks[0].keyword, gap: plan.tasks[0].gap,
      attemptedOperation: 'Fetched the official release body once.',
      evidence: [{ path: 'evidence/release.json', url: source.url, sha256: sha256(sourceBytes),
        accessResult: 'HTTP_200', sourceType: 'FIRST_PARTY',
        supportedFacts: plan.tasks[0].acceptanceCriteria }],
      materialPath: 'Wallpaper Engine latest version素材.md',
      materialSha256: after.materials[plan.tasks[0].keyword].sha256,
      finalStatus: 'COMPLETED', remainingGaps: [], stopCondition: null,
    }],
  };
  const hostObservations = [{
    kind: 'HOST_SOURCE_ACCESS_V1', keyword: plan.tasks[0].keyword, gap: plan.tasks[0].gap,
    path: 'evidence/release.json', url: source.url, sha256: sha256(sourceBytes),
    accessResult: 'HTTP_200', sourceType: 'FIRST_PARTY',
    supportedFacts: plan.tasks[0].acceptanceCriteria,
  }];
  const assessed = await assessKeywordEvidenceOutcome({ plan, planSha256: 'b'.repeat(64),
    before, after, nativeDirectory: root, claims, hostObservations });
  assert.equal(assessed.classification, 'GAP_RESOLVED');
  assert.equal(assessed.tasks[0].classification, 'GAP_RESOLVED');

  claims.tasks[0].evidence[0].sha256 = 'c'.repeat(64);
  const unverified = await assessKeywordEvidenceOutcome({ plan, planSha256: 'b'.repeat(64),
    before, after, nativeDirectory: root, claims, hostObservations });
  assert.equal(unverified.classification, 'NEW_FILES');
  assert.match(unverified.tasks[0].reason, /evidence/i);
});

test('worker-authored access strings cannot become verified evidence without a host observation', async t => {
  const { plan } = await planFixture(t);
  const root = await mkdtemp(join(await realpath(tmpdir()), '.keyword-evidence-forged-access-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'evidence'));
  const material = join(root, 'Wallpaper Engine latest version素材.md');
  await writeFile(material,
    '- 状态: PARTIAL\n- 缺口: Current stable version and release date need an official source body.\n');
  const before = await keywordEvidenceState(root);
  const body = Buffer.from(JSON.stringify({ url: 'https://wallpaperengine.io/forged',
    accessResult: 'HTTP_200', fact: plan.tasks[0].acceptanceCriteria[0] }));
  await writeFile(join(root, 'evidence/forged.json'), body);
  await writeFile(material, '- 状态: COMPLETED\n');
  const after = await keywordEvidenceState(root);
  const claims = { kind: 'KEYWORD_EVIDENCE_CLAIMS_V2', runId: plan.runId, stage: plan.stage,
    recoverySha256: plan.recoverySha256, planSha256: 'b'.repeat(64), tasks: [{
      keyword: plan.tasks[0].keyword, gap: plan.tasks[0].gap,
      attemptedOperation: 'Pretended to fetch the source.',
      evidence: [{ path: 'evidence/forged.json', url: 'https://wallpaperengine.io/forged',
        sha256: sha256(body), accessResult: 'HTTP_200', sourceType: 'FIRST_PARTY',
        supportedFacts: plan.tasks[0].acceptanceCriteria }],
      materialPath: 'Wallpaper Engine latest version素材.md',
      materialSha256: after.materials[plan.tasks[0].keyword].sha256,
      finalStatus: 'COMPLETED', remainingGaps: [], stopCondition: null,
    }] };
  const assessed = await assessKeywordEvidenceOutcome({ plan, planSha256: 'b'.repeat(64), before,
    after, nativeDirectory: root, claims, hostObservations: [] });
  assert.equal(assessed.classification, 'NEW_FILES');
  assert.equal(assessed.tasks[0].classification, 'NO_PROGRESS');
  assert.match(assessed.tasks[0].reason, /host access observation/i);
});

test('resolving one task cannot delete other unresolved gaps for the same keyword', async t => {
  const { plan } = await planFixture(t);
  const root = await mkdtemp(join(await realpath(tmpdir()), '.keyword-evidence-gap-preservation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'evidence'));
  const material = join(root, 'Wallpaper Engine latest version素材.md');
  const otherGap = 'A separate compatibility fact is still missing.';
  await writeFile(material, `- 状态: PARTIAL\n- 缺口: ${plan.tasks[0].gap}\n- 缺口 2: ${otherGap}\n`);
  const before = await keywordEvidenceState(root);
  const source = { url: 'https://wallpaperengine.io/release', accessResult: 'HTTP_200',
    fact: plan.tasks[0].acceptanceCriteria[0] };
  const body = Buffer.from(JSON.stringify(source));
  await writeFile(join(root, 'evidence/release.json'), body);
  await writeFile(material, '- 状态: COMPLETED\n');
  const after = await keywordEvidenceState(root);
  const descriptor = { path: 'evidence/release.json', url: source.url, sha256: sha256(body),
    accessResult: 'HTTP_200', sourceType: 'FIRST_PARTY', supportedFacts: plan.tasks[0].acceptanceCriteria };
  const claims = { kind: 'KEYWORD_EVIDENCE_CLAIMS_V2', runId: plan.runId, stage: plan.stage,
    recoverySha256: plan.recoverySha256, planSha256: 'b'.repeat(64), tasks: [{
      keyword: plan.tasks[0].keyword, gap: plan.tasks[0].gap,
      attemptedOperation: 'Fetched the official release body once.', evidence: [descriptor],
      materialPath: 'Wallpaper Engine latest version素材.md',
      materialSha256: after.materials[plan.tasks[0].keyword].sha256,
      finalStatus: 'COMPLETED', remainingGaps: [], stopCondition: null,
    }] };
  const hostObservations = [{ kind: 'HOST_SOURCE_ACCESS_V1', keyword: plan.tasks[0].keyword,
    gap: plan.tasks[0].gap, ...descriptor }];
  const assessed = await assessKeywordEvidenceOutcome({ plan, planSha256: 'b'.repeat(64), before,
    after, nativeDirectory: root, claims, hostObservations });
  assert.notEqual(assessed.classification, 'GAP_RESOLVED');
  assert.match(assessed.tasks[0].reason, /unapproved gap removal/i);
});

test('host assessment distinguishes unrelated files, verified evidence, no progress and exhausted plans', async t => {
  const { plan } = await planFixture(t);
  const root = await mkdtemp(join(await realpath(tmpdir()), '.keyword-evidence-classification-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'evidence'));
  await writeFile(join(root, 'Wallpaper Engine latest version素材.md'),
    '- 状态: PARTIAL\n- 缺口: Current stable version and release date need an official source body.\n');
  const before = await keywordEvidenceState(root);
  assert.equal((await assessKeywordEvidenceOutcome({ plan, planSha256: 'b'.repeat(64), before,
    after: await keywordEvidenceState(root), nativeDirectory: root, claims: null })).classification, 'NO_PROGRESS');
  await writeFile(join(root, 'evidence/unrelated.json'), '{"note":"new but unclaimed"}');
  const after = await keywordEvidenceState(root);
  assert.equal((await assessKeywordEvidenceOutcome({ plan, planSha256: 'b'.repeat(64), before,
    after, nativeDirectory: root, claims: null })).classification, 'NEW_FILES');

  const exhaustedClaims = { kind: 'KEYWORD_EVIDENCE_CLAIMS_V2', runId: plan.runId, stage: plan.stage,
    recoverySha256: plan.recoverySha256, planSha256: 'b'.repeat(64), tasks: [{
      keyword: plan.tasks[0].keyword, gap: plan.tasks[0].gap,
      attemptedOperation: 'Checked the approved official target once.', evidence: [],
      materialPath: 'Wallpaper Engine latest version素材.md',
      materialSha256: after.materials[plan.tasks[0].keyword].sha256,
      finalStatus: 'PARTIAL', remainingGaps: after.materials[plan.tasks[0].keyword].gaps,
      stopCondition: 'OFFICIAL_SOURCE_UNAVAILABLE',
    }] };
  assert.equal((await assessKeywordEvidenceOutcome({ plan, planSha256: 'b'.repeat(64), before: after,
    after, nativeDirectory: root, claims: exhaustedClaims })).classification, 'NO_PROGRESS');
  const hostObservations = [{ kind: 'HOST_STOP_OBSERVATION_V1', keyword: plan.tasks[0].keyword,
    gap: plan.tasks[0].gap, attemptedOperation: exhaustedClaims.tasks[0].attemptedOperation,
    target: plan.tasks[0].target, stopCondition: 'OFFICIAL_SOURCE_UNAVAILABLE' }];
  assert.equal((await assessKeywordEvidenceOutcome({ plan, planSha256: 'b'.repeat(64), before: after,
    after, nativeDirectory: root, claims: exhaustedClaims, hostObservations })).classification,
  'PLAN_EXHAUSTED');
});

test('host assessment keeps separate gaps for the same keyword', async t => {
  const { plan } = await planFixture(t);
  plan.tasks.push({ ...structuredClone(plan.tasks[0]), gap: 'A second official fact is missing.',
    target: 'site:wallpaperengine.io second official fact' });
  const root = await mkdtemp(join(await realpath(tmpdir()), '.keyword-evidence-multigap-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'Wallpaper Engine latest version素材.md'),
    '- 状态: PARTIAL\n- 缺口: Current stable version and release date need an official source body.\n');
  const state = await keywordEvidenceState(root);
  const claims = { kind: 'KEYWORD_EVIDENCE_CLAIMS_V2', runId: plan.runId, stage: plan.stage,
    recoverySha256: plan.recoverySha256, planSha256: 'b'.repeat(64), tasks: plan.tasks.map(task => ({
      keyword: task.keyword, gap: task.gap, attemptedOperation: 'Checked the approved target once.',
      evidence: [], materialPath: 'Wallpaper Engine latest version素材.md',
      materialSha256: state.materials[task.keyword].sha256, finalStatus: 'PARTIAL',
      remainingGaps: state.materials[task.keyword].gaps, stopCondition: 'OFFICIAL_SOURCE_UNAVAILABLE',
    })) };
  const assessed = await assessKeywordEvidenceOutcome({ plan, planSha256: 'b'.repeat(64),
    before: state, after: state, nativeDirectory: root, claims, hostObservations: plan.tasks.map(task => ({
      kind: 'HOST_STOP_OBSERVATION_V1', keyword: task.keyword, gap: task.gap,
      attemptedOperation: 'Checked the approved target once.', target: task.target,
      stopCondition: 'OFFICIAL_SOURCE_UNAVAILABLE',
    })) });
  assert.equal(assessed.tasks.length, 2);
  assert.equal(assessed.classification, 'PLAN_EXHAUSTED');
});

test('an exhausted plan cannot be replayed against unchanged gaps and service decisions', async t => {
  const first = await planFixture(t);
  const state = await keywordEvidenceState(join(first.recovery.directory, 'data'));
  const outcome = {
    kind: 'HOST_KEYWORD_EVIDENCE_OUTCOME_V2', runId: first.plan.runId, stage: first.plan.stage,
    recoverySha256: 'f'.repeat(64), planSha256: 'b'.repeat(64),
    planStrategySha256: keywordEvidencePlanStrategySha256(first.plan),
    gapStateSha256: state.gapStateSha256,
    serviceStops: first.plan.serviceStops, serviceResumes: first.plan.serviceResumes,
    classification: 'PLAN_EXHAUSTED', tasks: [], evidenceFiles: [], serviceBlockerChanged: false,
  };
  await writeFile(join(first.recovery.directory, 'data', 'KEYWORD_EVIDENCE_OUTCOME_V2.json'),
    JSON.stringify(outcome));
  first.recovery.files.push({ path: 'KEYWORD_EVIDENCE_OUTCOME_V2.json' });
  await assert.rejects(verifyKeywordEvidencePlan(context(first.recovery), first.ref), /PLAN_EXHAUSTED/);

  first.plan.tasks[0].target += ' revised';
  const bytes = Buffer.from(JSON.stringify(first.plan));
  await writeFile(first.ref.path, bytes);
  await verifyKeywordEvidencePlan(context(first.recovery), { path: first.ref.path, sha256: sha256(bytes) });
});
