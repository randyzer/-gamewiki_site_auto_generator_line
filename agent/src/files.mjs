import { lstat, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute, parse, join } from 'node:path';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function parseArtifactJson(bytes, path) {
  try { return JSON.parse(bytes.toString('utf8')); }
  catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    const position = error.message.match(/position (\d+)/)?.[1];
    throw Object.assign(Error(`Invalid JSON in artifact: ${path}${position ? '; position ' + position : ''}`), { code: 'ARTIFACT_INVALID_JSON' });
  }
}
export function inside(root, file) {
  const rel = relative(resolve(root), resolve(file));
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('../'));
}
export async function safePath(file, roots) {
  if (!isAbsolute(file) || !roots.some(root => inside(root, file))) throw Error('Path outside allowed roots');
  let current = parse(file).root;
  for (const part of resolve(file).slice(current.length).split('/').filter(Boolean)) {
    current = join(current, part);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink !== 1)) throw Error('Linked path is not allowed');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return resolve(file);
}
export async function readArtifact(file, roots) {
  await safePath(file, roots);
  const stat = await lstat(file);
  if (!stat.isFile() || stat.size === 0 || stat.size > 32 * 1024 * 1024) throw Error('Expected nonempty regular artifact under 32 MiB');
  return readFile(file);
}
export async function treeFiles(root) {
  const result = [];
  async function walk(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      if (['.git', 'node_modules', '__pycache__', '.DS_Store'].includes(entry.name)) continue;
      const file = join(dir, entry.name);
      await safePath(file, [root]);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()) result.push(file);
      else throw Error('Unsupported source file type');
    }
  }
  await walk(root);
  return result;
}
