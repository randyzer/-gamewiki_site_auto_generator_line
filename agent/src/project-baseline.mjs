import { readFile, readdir, lstat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { safePath, inside, sha256 } from './files.mjs';

const exec = promisify(execFile);
const snapshotPolicyVersion = 1;
export const secretPath = path => path.split('/').some(p => /^(?:\.ssh|\.aws|\.azure|\.gnupg|\.kube|\.docker|\.gcloud|\.codex)$|^\.env(?:\.|$)|^\.dev\.vars|^\.npmrc$|^\.netrc$|^credentials|^auth\.json$|^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.|$)|^.*\.(?:pem|key|p12|pfx)$/i.test(p)) || /(?:^|\/)\.config\/gcloud(?:\/|$)/i.test(path);
export const excluded = path => path.split('/').some(p => ['.git', 'node_modules', '.next', '.astro', '.cache', '.npm', '.pnpm-store', 'dist', 'build', '.vercel', '.wrangler', '__pycache__', '.DS_Store'].includes(p)) || secretPath(path);
export async function sourceFiles(root, { rejectSecrets = false } = {}) {
  const files = [];
  async function walk(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      const file = join(dir, entry.name), rel = relative(root, file);
      if (rejectSecrets && secretPath(rel)) throw Error('Candidate contains a forbidden credential path');
      if (excluded(rel)) continue;
      await safePath(file, [root]);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()) {
        const stat = await lstat(file);
        files.push({ path: rel, sha256: sha256(await readFile(file)), size: stat.size, mode: stat.mode & 0o777, type: 'file' });
      } else throw Error('Unsafe project file type');
    }
  }
  await safePath(root, [root]); await walk(root); return files;
}
async function git(root, args) {
  try { return (await exec('git', ['-C', root, ...args], { maxBuffer: 8 * 1024 * 1024 })).stdout.trimEnd(); }
  catch { throw Error('Git inspection unavailable'); }
}
export async function captureBaseline(entry, rawKeywordsFile) {
  const root = entry.path;
  await safePath(root, [root]);
  if ((await git(root, ['rev-parse', '--show-toplevel'])).trim() !== root) throw Error('Target must be the exact Git repository root');
  await safePath(rawKeywordsFile, [root]);
  if (!inside(root, rawKeywordsFile) || !/\.md$/i.test(rawKeywordsFile) || excluded(relative(root, rawKeywordsFile))) throw Error('Expected user keyword Markdown inside target');
  const keywordStat = await lstat(rawKeywordsFile);
  if (!keywordStat.isFile() || keywordStat.size === 0) throw Error('Keyword file missing or empty');
  const remote = await git(root, ['remote', 'get-url', 'origin']).catch(() => '');
  // Never persist credential-bearing remote URLs.
  let repository = '';
  if (/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(remote)) repository = remote.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
  else if (/^git@github\.com:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(remote)) repository = remote.slice(15).replace(/\.git$/, '');
  if (remote && (!repository || (entry.repository && repository !== entry.repository))) throw Error('Unexpected repository remote');
  const status = await git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const entries = status.split('\0').filter(Boolean);
  const files = await sourceFiles(root);
  const roots = ['backgroundinformation', 'background_information'].filter(name => files.some(f => f.path.startsWith(name + '/')));
  if (roots.length > 1) throw Error('Ambiguous research roots');
  const head = await git(root, ['rev-parse', 'HEAD']), branch = await git(root, ['branch', '--show-current']);
  const keyword = { path: rawKeywordsFile, sha256: sha256(await readFile(rawKeywordsFile)), size: keywordStat.size };
  const baseline = { schemaVersion: 1, snapshotPolicyVersion, sourceProjectPath: root, head, branch, repository, status,
    statusDigest: sha256(status), staged: entries.filter(e => ![' ', '?'].includes(e[0])),
    modified: entries.filter(e => e[1] !== ' ' && e[1] !== '?'), untracked: entries.filter(e => e.startsWith('?? ')),
    researchRootName: roots[0] ?? 'backgroundinformation', keyword, files, protectedPaths: entry.protectedPaths ?? [],
    sourceDigest: sha256(JSON.stringify(files)) };
  baseline.digest = sha256(JSON.stringify(baseline));
  return baseline;
}
export async function verifyBaseline(baseline, entry) {
  const { digest, ...data } = baseline;
  if (data.sourceProjectPath !== entry.path || sha256(JSON.stringify(data)) !== digest) throw Error('Invalid source baseline');
  if (data.snapshotPolicyVersion !== snapshotPolicyVersion) throw Error('Snapshot policy changed; use a new run');
  const current = await captureBaseline(entry, baseline.keyword.path);
  if (current.digest !== baseline.digest) throw Error('Source baseline drift: source or keyword changed; review required');
  return true;
}
