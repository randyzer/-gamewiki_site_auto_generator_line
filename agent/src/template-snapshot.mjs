import { mkdir, rename, rm, lstat } from 'node:fs/promises';
import { join, isAbsolute, normalize } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const COMMIT = /^[0-9a-f]{40}$/;
const git = async (cwd, args) => (await execFileAsync('git', args, { cwd, encoding: 'utf8', timeout: 300000 })).stdout.trimEnd();

function checkSource({ repository, ref, subtree } = {}, commit) {
  if (typeof repository !== 'string' || !/^(https:\/\/|file:\/\/)/.test(repository))
    throw Error(`TEMPLATE_SOURCE_INVALID: repository must be an https:// or file:// URL, got ${JSON.stringify(repository)}`);
  if (typeof ref !== 'string' || !/^[A-Za-z0-9._/-]{1,200}$/.test(ref))
    throw Error(`TEMPLATE_SOURCE_INVALID: ref ${JSON.stringify(ref)}`);
  if (typeof subtree !== 'string' || !subtree || isAbsolute(subtree) || normalize(subtree).startsWith('..'))
    throw Error(`TEMPLATE_SOURCE_INVALID: subtree must be a relative path inside the repository, got ${JSON.stringify(subtree)}`);
  if (commit !== undefined && !COMMIT.test(commit))
    throw Error(`TEMPLATE_SOURCE_INVALID: commit must be a full 40-character SHA, got ${JSON.stringify(commit)}`);
}

async function exists(path) {
  try { await lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

// Snapshot checkouts are shared by runs; any edit would silently change another run's template source.
export async function verifyTemplateSnapshot({ checkout, commit, templateRoot }) {
  const head = await git(checkout, ['rev-parse', 'HEAD']);
  if (head !== commit) throw Error(`TEMPLATE_SNAPSHOT_MODIFIED: ${checkout} is at ${head}, expected ${commit}`);
  const changes = await git(checkout, ['status', '--porcelain', '--untracked-files=all']);
  if (changes) throw Error(`TEMPLATE_SNAPSHOT_MODIFIED: ${checkout} has changes: ${changes.split('\n').map(line => line.slice(3)).join(', ')}`);
  if (!(await lstat(templateRoot)).isDirectory()) throw Error(`TEMPLATE_SNAPSHOT_SUBTREE_MISSING: ${templateRoot}`);
}

async function fetchCommit(source, ref, staging) {
  await mkdir(staging, { recursive: true });
  await git(staging, ['init', '-q']);
  await git(staging, ['remote', 'add', 'origin', source.repository]);
  try { await git(staging, ['fetch', '-q', '--depth', '1', 'origin', ref]); }
  catch (error) {
    throw Error(`TEMPLATE_SNAPSHOT_FETCH_FAILED: could not fetch ${ref} from ${source.repository}: ${error.stderr?.trim() || error.message}`);
  }
  await git(staging, ['-c', 'advice.detachedHead=false', 'checkout', '-q', 'FETCH_HEAD']);
  return git(staging, ['rev-parse', 'HEAD']);
}

// ls-remote resolves the ref without downloading the repository, so an already cached commit costs one round trip.
export async function resolveTemplateRef(source) {
  checkSource(source);
  let output;
  try { output = await git(undefined, ['ls-remote', source.repository, source.ref]); }
  catch (error) {
    throw Error(`TEMPLATE_SNAPSHOT_FETCH_FAILED: could not resolve ${source.ref} in ${source.repository}: ${error.stderr?.trim() || error.message}`);
  }
  const matches = output.split('\n').filter(Boolean).map(line => line.split('\t'))
    .filter(([, name]) => [source.ref, `refs/heads/${source.ref}`, `refs/tags/${source.ref}`].includes(name));
  if (matches.length !== 1 || !COMMIT.test(matches[0][0]))
    throw Error(`TEMPLATE_SNAPSHOT_FETCH_FAILED: ${source.ref} matched ${matches.length} refs in ${source.repository}`);
  return matches[0][0];
}

// Without a commit the ref is resolved once (new run); with a commit the exact snapshot is reused or refetched (resume).
export async function materializeTemplateSnapshot(source, { cacheRoot, commit } = {}) {
  checkSource(source, commit);
  if (!isAbsolute(cacheRoot ?? '')) throw Error(`TEMPLATE_SOURCE_INVALID: cacheRoot must be absolute, got ${JSON.stringify(cacheRoot)}`);
  await mkdir(cacheRoot, { recursive: true });
  commit ??= await resolveTemplateRef(source);
  const describe = (resolved, checkout) => ({ repository: source.repository, ref: source.ref, subtree: source.subtree,
    commit: resolved, checkout, templateRoot: join(checkout, source.subtree) });

  if (commit && await exists(join(cacheRoot, commit))) {
    const snapshot = describe(commit, join(cacheRoot, commit));
    await verifyTemplateSnapshot(snapshot);
    return snapshot;
  }
  const staging = join(cacheRoot, `.staging-${randomUUID()}`);
  try {
    const resolved = await fetchCommit(source, commit ?? source.ref, staging);
    if (commit && resolved !== commit) throw Error(`TEMPLATE_SNAPSHOT_FETCH_FAILED: fetched ${resolved}, expected ${commit}`);
    if (!(await exists(join(staging, source.subtree))))
      throw Error(`TEMPLATE_SNAPSHOT_SUBTREE_MISSING: ${source.subtree} not found at ${resolved} in ${source.repository}`);
    const checkout = join(cacheRoot, resolved);
    if (await exists(checkout)) {
      const snapshot = describe(resolved, checkout);
      await verifyTemplateSnapshot(snapshot);
      return snapshot;
    }
    await rename(staging, checkout);
    return describe(resolved, checkout);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
