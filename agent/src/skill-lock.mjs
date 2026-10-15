import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256, treeFiles } from './files.mjs';

export const AGENT_ROOT = fileURLToPath(new URL('../', import.meta.url));
export async function generateInventory(configFile = join(AGENT_ROOT, 'config/workflow.json')) {
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  const skillRoot = resolve(dirname(configFile), config.skillRoot);
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
  await writeFile(output, JSON.stringify({ skillRoot, skills }, null, 2) + '\n', { mode: 0o600 });
  return output;
}
