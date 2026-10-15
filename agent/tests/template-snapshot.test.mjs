import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, realpath, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { materializeTemplateSnapshot, verifyTemplateSnapshot } from '../src/template-snapshot.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const commitAll = (cwd, message) => {
  git(cwd, 'add', '.');
  git(cwd, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', message);
  return git(cwd, 'rev-parse', 'HEAD');
};

async function remote(t) {
  // macOS tmpdir is under the /var -> /private/var link, which safePath rejects.
  const root = await realpath(await mkdtemp(join(tmpdir(), 'template-snapshot-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const origin = join(root, 'origin');
  await mkdir(join(origin, 'template', 'temp1_based_demo'), { recursive: true });
  await writeFile(join(origin, 'template', 'temp1_based_demo', 'package.json'), '{"name":"demo"}');
  git(origin, 'init', '-q', '-b', 'main');
  const first = commitAll(origin, 'v1');
  const source = { repository: 'file://' + origin, ref: 'main', subtree: 'template' };
  return { root, origin, first, source, cacheRoot: join(root, 'cache') };
}

test('new snapshot resolves the ref to a full commit and exposes only the template subtree', async t => {
  const r = await remote(t);
  const snapshot = await materializeTemplateSnapshot(r.source, { cacheRoot: r.cacheRoot });
  assert.equal(snapshot.commit, r.first);
  assert.equal(snapshot.templateRoot, join(r.cacheRoot, r.first, 'template'));
  assert.deepEqual(await readdir(snapshot.templateRoot), ['temp1_based_demo']);
  assert.equal(snapshot.repository, r.source.repository);
});

test('a pinned commit is reused even after the ref moves', async t => {
  const r = await remote(t);
  await materializeTemplateSnapshot(r.source, { cacheRoot: r.cacheRoot });
  await writeFile(join(r.origin, 'template', 'temp1_based_demo', 'package.json'), '{"name":"moved"}');
  const second = commitAll(r.origin, 'v2');
  const pinned = await materializeTemplateSnapshot(r.source, { cacheRoot: r.cacheRoot, commit: r.first });
  assert.equal(pinned.commit, r.first);
  const latest = await materializeTemplateSnapshot(r.source, { cacheRoot: r.cacheRoot });
  assert.equal(latest.commit, second);
});

test('a pinned commit missing from the cache is fetched by SHA', async t => {
  const r = await remote(t);
  const snapshot = await materializeTemplateSnapshot(r.source, { cacheRoot: r.cacheRoot, commit: r.first });
  assert.equal(snapshot.commit, r.first);
  await verifyTemplateSnapshot(snapshot);
});

test('a modified snapshot is rejected with the changed path', async t => {
  const r = await remote(t);
  const snapshot = await materializeTemplateSnapshot(r.source, { cacheRoot: r.cacheRoot });
  await writeFile(join(snapshot.templateRoot, 'temp1_based_demo', 'package.json'), '{"name":"tampered"}');
  await assert.rejects(verifyTemplateSnapshot(snapshot), /TEMPLATE_SNAPSHOT_MODIFIED.*has changes: template\/temp1_based_demo\/package\.json/);
  await assert.rejects(materializeTemplateSnapshot(r.source, { cacheRoot: r.cacheRoot, commit: r.first }),
    /TEMPLATE_SNAPSHOT_MODIFIED/);
});

test('an unknown commit fails with the commit and repository in the message', async t => {
  const r = await remote(t);
  const missing = 'f'.repeat(40);
  await assert.rejects(materializeTemplateSnapshot(r.source, { cacheRoot: r.cacheRoot, commit: missing }),
    new RegExp(`TEMPLATE_SNAPSHOT_FETCH_FAILED.*${missing}.*${r.origin}`));
});

test('a source without the template subtree is rejected', async t => {
  const r = await remote(t);
  await assert.rejects(materializeTemplateSnapshot({ ...r.source, subtree: 'missing' }, { cacheRoot: r.cacheRoot }),
    /TEMPLATE_SNAPSHOT_SUBTREE_MISSING.*missing/);
});

test('invalid source configuration fails fast', async () => {
  await assert.rejects(materializeTemplateSnapshot({ repository: '', ref: 'main', subtree: 'template' }, { cacheRoot: '/tmp/x' }),
    /TEMPLATE_SOURCE_INVALID/);
  await assert.rejects(materializeTemplateSnapshot({ repository: 'file:///x', ref: 'main', subtree: '../escape' }, { cacheRoot: '/tmp/x' }),
    /TEMPLATE_SOURCE_INVALID.*subtree/);
  await assert.rejects(materializeTemplateSnapshot({ repository: 'file:///x', ref: 'main', subtree: 'template' },
    { cacheRoot: '/tmp/x', commit: 'abc' }), /TEMPLATE_SOURCE_INVALID.*commit/);
});
