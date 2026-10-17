import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sha256 } from '../src/files.mjs';
import { keywordEvidenceChanges, keywordEvidenceState, verifyKeywordEvidencePlan } from '../src/keyword-evidence-plan.mjs';

const recoverySha256 = 'a'.repeat(64);

async function planFixture(t, patch = {}) {
  const root = await mkdtemp(join(await realpath(tmpdir()), '.keyword-evidence-plan-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const plan = {
    kind: 'KEYWORD_EVIDENCE_PLAN_V1',
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
    }],
    pendingRows: [{ row: 36, rawKeyword: 'wallpaper engine space', decision: 'PENDING', targetKeyword: null }],
    ...patch,
  };
  const bytes = Buffer.from(JSON.stringify(plan, null, 2) + '\n');
  const path = join(root, 'plan.json');
  await writeFile(path, bytes);
  return { plan, ref: { path, sha256: sha256(bytes) } };
}

const context = overrides => ({
  runId: 'fixture-run', recoverySha256,
  serviceStops: ['steam-community', 'youtube-subtitles'], serviceResumes: [], ...overrides,
});

test('evidence plan binds the run, recovery snapshot, service decisions and concrete tasks', async t => {
  const { ref } = await planFixture(t);
  const verified = await verifyKeywordEvidencePlan(context(), ref);
  assert.equal(verified.sha256, ref.sha256);
  assert.equal(verified.plan.tasks.length, 1);
  assert.equal(verified.plan.tasks[0].tool, 'serper');
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
    const { ref } = await planFixture(t, patch);
    await assert.rejects(verifyKeywordEvidencePlan(context(), ref), /KEYWORD_EVIDENCE_PLAN_INVALID/);
  }
  const { ref } = await planFixture(t);
  await writeFile(ref.path, '{}');
  await assert.rejects(verifyKeywordEvidencePlan(context(), ref), /KEYWORD_EVIDENCE_PLAN_INVALID/);
});

test('evidence plan cannot schedule a suspended service unless that service is explicitly resumed', async t => {
  const task = {
    keyword: 'Wallpaper Engine best wallpapers', rawRows: [4, 10],
    gap: 'Workshop item details need first-party verification.', tool: 'steam-community',
    target: 'https://steamcommunity.com/app/431960/workshop/',
    expectedEvidence: 'Current workshop item detail pages and author information.',
  };
  const { ref } = await planFixture(t, { tasks: [task] });
  await assert.rejects(verifyKeywordEvidencePlan(context(), ref), /service is suspended.*steam-community/i);

  const resumed = await planFixture(t, { serviceStops: ['youtube-subtitles'],
    serviceResumes: ['steam-community'], tasks: [task] });
  const verified = await verifyKeywordEvidencePlan(context({ serviceStops: ['youtube-subtitles'],
    serviceResumes: ['steam-community'] }), resumed.ref);
  assert.equal(verified.plan.tasks[0].tool, 'steam-community');
});

test('a suspended platform cannot be reached indirectly through a generic search task', async t => {
  const { ref } = await planFixture(t, { tasks: [{
    keyword: 'Wallpaper Engine latest version', rawRows: [91], gap: 'Missing official version',
    tool: 'serper', target: 'site:steamcommunity.com/games/431960/announcements version',
    expectedEvidence: 'Official announcement body with the current version.',
  }] });
  await assert.rejects(verifyKeywordEvidencePlan(context(), ref), /suspended Steam Community/i);
});

test('pending ambiguous rows cannot be smuggled into evidence tasks', async t => {
  const { ref } = await planFixture(t, { tasks: [{
    keyword: 'Wallpaper Engine space', rawRows: [36], gap: 'Unknown user intent.', tool: 'serper',
    target: 'wallpaper engine space', expectedEvidence: 'Clarify whether this is a site or space wallpaper intent.',
  }] });
  await assert.rejects(verifyKeywordEvidencePlan(context(), ref), /pending raw row 36/i);
});

test('evidence progress counts only new or changed evidence and blocker files', async t => {
  const root = await mkdtemp(join(await realpath(tmpdir()), '.keyword-evidence-progress-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'evidence'));
  await writeFile(join(root, 'evidence', 'old.json'), '{"fact":"old"}');
  await writeFile(join(root, 'report.md'), 'rewritten report');
  const before = await keywordEvidenceState(root);
  await writeFile(join(root, 'report.md'), 'rewritten again');
  assert.deepEqual(keywordEvidenceChanges(before, await keywordEvidenceState(root)), []);
  await writeFile(join(root, 'SERVICE_BLOCKERS.json'), '{"stops":[]}');
  await writeFile(join(root, 'evidence', 'new.json'), '{"fact":"new"}');
  assert.deepEqual(keywordEvidenceChanges(before, await keywordEvidenceState(root)),
    ['SERVICE_BLOCKERS.json', 'evidence/new.json']);
});
