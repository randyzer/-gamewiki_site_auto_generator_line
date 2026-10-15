import { basename, isAbsolute, resolve, join, dirname } from 'node:path';
import { lstat, readdir } from 'node:fs/promises';
import { inside, safePath } from './files.mjs';
import { AGENT_ROOT } from './skill-lock.mjs';

const fail = (value, reason) => { throw Error(`Invalid path ${JSON.stringify(value)}: ${reason}`); };
const overlaps = (a, b) => inside(a, b) || inside(b, a);

export function resolveInputPaths(inputs, { required = false, legacyPaths } = {}) {
  if (inputs.paths === undefined) {
    if (required) fail(inputs.paths, 'fill in paths.siteDirectory, paths.researchDirectory and paths.rawKeywordsFile');
    return { ...inputs };
  }
  const paths = inputs.paths;
  if (!paths || typeof paths !== 'object' || Array.isArray(paths)) fail(paths, 'paths must be an object');
  for (const key of Object.keys(paths))
    if (!['siteDirectory', 'researchDirectory', 'rawKeywordsFile'].includes(key) &&
        !(key === 'projectRoot' && legacyPaths?.projectRoot === paths[key])) fail(paths[key], `unknown paths.${key}`);
  for (const key of ['siteDirectory', 'researchDirectory'])
    if (paths[key] === undefined) fail(paths[key], `fill in paths.${key}`);
  const absolute = (value, key) => {
    if (typeof value !== 'string' || !value.trim()) fail(value, 'absolute path required');
    // Resume accepts an old input spelling only when it resolves to the exact recorded path.
    if (legacyPaths?.projectRoot && paths.projectRoot === legacyPaths.projectRoot && key &&
        value.replaceAll('{projectRoot}', legacyPaths.projectRoot) === legacyPaths[key]) return legacyPaths[key];
    if (/[{}]/.test(value)) fail(value, 'placeholders are not supported; absolute path required');
    if (!isAbsolute(value)) fail(value, 'absolute path required');
    return resolve(value);
  };
  const resolved = { ...(paths.projectRoot ? { projectRoot: absolute(paths.projectRoot) } : {}),
    siteDirectory: absolute(paths.siteDirectory, 'siteDirectory'), researchDirectory: absolute(paths.researchDirectory, 'researchDirectory'),
    rawKeywordsFile: absolute(paths.rawKeywordsFile ?? inputs.rawKeywordsFile, 'rawKeywordsFile') };
  if (basename(resolved.researchDirectory) !== 'backgroundinformation')
    fail(paths.researchDirectory, 'researchDirectory must end in backgroundinformation; homepage Skill validate_outputs.py:49 requires this directory name');
  if (inside(resolved.researchDirectory, resolved.siteDirectory))
    fail(paths.siteDirectory, 'siteDirectory must not be inside researchDirectory');
  return { ...inputs, paths: resolved, projectPath: resolved.siteDirectory, rawKeywordsFile: resolved.rawKeywordsFile };
}

export async function validateInputPaths(inputs, { workspace, protectedRoots = [], emptySite = false } = {}) {
  if (!inputs.paths) return;
  const roots = [AGENT_ROOT, join(dirname(AGENT_ROOT), 'codex-skills'),
    join(dirname(AGENT_ROOT), '.template-cache'), join(dirname(AGENT_ROOT), 'runs'),
    workspace, join(workspace, 'runs'), join(dirname(workspace), 'codex-skills'),
    join(dirname(workspace), '.template-cache'), join(dirname(workspace), 'runs'), ...protectedRoots];
  for (const key of ['siteDirectory', 'researchDirectory']) {
    const value = inputs.paths[key];
    for (const root of roots) if (overlaps(value, root)) fail(value, `overlaps protected root ${root}`);
    await safePath(value, [value]);
    try { if (!(await lstat(value)).isDirectory()) fail(value, 'directory required'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  for (const value of Object.values(inputs.paths)) await safePath(value, [value]);
  for (const value of [inputs.paths.rawKeywordsFile, inputs.keywordSourceLineageFile].filter(Boolean)) {
    await safePath(value, [value]);
    try { if (!(await lstat(value)).isFile()) fail(value, 'regular file required for keyword input'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (emptySite) await validateSiteIntake(inputs);
}

export async function validateSiteIntake(inputs) {
  const { siteDirectory: site, researchDirectory: research } = inputs.paths;
  const forbidden = [];
  async function walk(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name); await safePath(path, [site]);
      if (entry.name === '.DS_Store' && entry.isFile()) continue;
      if (entry.isDirectory() && path === research) continue;
      if (entry.isDirectory() && inside(site, research) && inside(path, research)) await walk(path);
      else if (forbidden.length < 10) forbidden.push(path);
    }
  }
  try { await walk(site); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (forbidden.length) fail(site, `siteDirectory must be empty except researchDirectory and .DS_Store; forbidden entries (up to 10): ${forbidden.join(', ')}`);
}
