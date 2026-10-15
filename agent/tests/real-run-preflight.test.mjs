import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AGENT_ROOT } from '../src/skill-lock.mjs';

test('derived preflight preserves original bytes, uses a fresh directory and never starts a Pipeline', async t => {
  const { prepareRealRunPreflight } = await import('../src/real-run-preflight.mjs');
  const id = 'TEST-preflight-' + randomUUID(), source = join(AGENT_ROOT, 'runs', id + '-source');
  await mkdir(source);
  t.after(async () => { for (const path of [source, join(AGENT_ROOT, 'runs', id)]) await rm(path, { recursive: true, force: true }); });
  const original = join(source, 'keywords.md'), text = '| 关键词 | 第几行 |\n|---|---|\n| exact readable | 1 |\n| truncated... | 2 |\n';
  await writeFile(original, text);
  const inputs = { mode: 'new-site', gameIdentity: 'TEST app', objective: 'TEST preflight only',
    gameMetadata: { steam: 'https://store.steampowered.com/app/431960/', productType: 'Application / Utilities' }, rawKeywordsFile: original };
  const result = await prepareRealRunPreflight(inputs, id);
  assert.equal(await readFile(original, 'utf8'), text);
  assert.equal(result.originalUnchanged, true);
  assert.equal(result.workerStarted, false);
  assert.equal(result.pipelineStarted, false);
  assert.equal(result.keywords.retained.length, 1);
  assert.equal(result.keywords.pending.length, 1);
  assert.equal((await readFile(result.derived.path, 'utf8')).includes('truncated'), false);
  await assert.rejects(access(join(AGENT_ROOT, 'runs', id, 'manifest.json')));
  // Preflight reports the template source a run would pin, but never downloads a snapshot.
  assert.equal(result.templateSource.repository, 'https://github.com/randyzer/-gamewiki_site_auto_generator_line.git');
  assert.equal(typeof result.templateSource.reachable, 'boolean');
  if (result.templateSource.reachable) assert.match(result.templateSource.commit, /^[0-9a-f]{40}$/);
  else assert.match(result.templateSource.reason, /TEMPLATE_SNAPSHOT_FETCH_FAILED/);
  await assert.rejects(prepareRealRunPreflight(inputs, id), /EEXIST/);
});

test('numbered keyword tables preserve source lines, duplicates and pending gaps without inventing terms', async () => {
  const { inspectKeywordSource } = await import('../src/real-run-preflight.mjs');
  const text = '# Supplied\n第 52–82 条尚未提供\n| 关键词 | 第几行 |\n|---|---:|\n| readable keyword | 1 |\n| broken key... **[待核实完整词]** | 2 |\n| readable keyword | 1 |\n\n- suggested expansion never supplied\n';
  const result = inspectKeywordSource(text);
  assert.deepEqual(result.retained.map(x => x.keyword), ['readable keyword']);
  assert.deepEqual(result.retained[0].sourceLines, [5, 7]);
  assert.deepEqual(result.retained[0].tableRows, [1]);
  assert.equal(result.pending[0].reason, 'TRUNCATED_OR_UNVERIFIED');
  assert.deepEqual(result.missingRows, { first: 52, last: 82 });
  assert.equal(result.retained.some(x => x.keyword.includes('expansion')), false);
});

test('unsupported keyword layouts fail closed instead of guessing from planning prose', async () => {
  const { inspectKeywordSource } = await import('../src/real-run-preflight.mjs');
  assert.throws(() => inspectKeywordSource('# Research suggestions\nWrite a Mac guide'), /KEYWORD_SOURCE_FORMAT_UNSUPPORTED/);
});
