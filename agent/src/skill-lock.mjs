import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { sha256, treeFiles } from './files.mjs';

const execFileAsync = promisify(execFile);
const git = async (cwd, args) => (await execFileAsync('git', args, { cwd, encoding: 'utf8' })).stdout.trim();

export const AGENT_ROOT = fileURLToPath(new URL('../', import.meta.url));

// Skills are only ever changed by a reviewed commit, so the lock pins the repository commit as well as file hashes.
export async function skillSourceCommit(skillRoot) {
  try { return await git(skillRoot, ['rev-parse', 'HEAD']); }
  catch (error) { throw Error(`SKILL_SOURCE_NOT_GIT: ${skillRoot} is not inside a git repository (${error.message.trim()})`); }
}

export async function verifySkillSource(skillRoot, lockedCommit) {
  const head = await skillSourceCommit(skillRoot);
  if (head !== lockedCommit) throw Error(`SKILL_SOURCE_COMMIT_MISMATCH: locked ${lockedCommit}, current HEAD ${head}`);
  const changes = await git(skillRoot, ['status', '--porcelain', '--untracked-files=all', '--', '.']);
  if (changes) throw Error(`SKILL_SOURCE_DIRTY: uncommitted Skill changes: ${changes.split('\n').map(line => line.slice(3)).join(', ')}`);
}

export async function generateInventory(configFile = join(AGENT_ROOT, 'config/workflow.json')) {
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  const skillRoot = resolve(dirname(configFile), config.skillRoot);
  const sourceCommit = await skillSourceCommit(skillRoot);
  const skills = [];
  for (const name of config.skills) {
    const root = join(skillRoot, name);
    const files = [];
    for (const file of await treeFiles(root)) files.push({ path: file, sha256: sha256(await readFile(file)) });
    const source = join(root, 'SKILL.md');
    skills.push({ name, source, available: true, sha256: sha256(await readFile(source)), files,
      contractVersion: 1, version: 'tree-sha256:' + sha256(JSON.stringify(files.map(f => [relative(root, f.path), f.sha256]))) });
  }
  const output = resolve(dirname(configFile), config.inventory);
  await writeFile(output, JSON.stringify({ skillRoot, sourceCommit, skills }, null, 2) + '\n', { mode: 0o600 });
  return output;
}
