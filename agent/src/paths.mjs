import { basename, isAbsolute, resolve, join, dirname } from 'node:path';
import { lstat, readdir } from 'node:fs/promises';
import { inside, safePath } from './files.mjs';
import { AGENT_ROOT } from './skill-lock.mjs';

const fail = (value, reason) => { throw Error(`Invalid path ${JSON.stringify(value)}: ${reason}`); };
const overlaps = (a, b) => inside(a, b) || inside(b, a);

export function resolveInputPaths(inputs, { required = false } = {}) {
  if (inputs.paths === undefined) {
    if (required) fail(inputs.paths, 'fill in paths.siteDirectory, paths.researchDirectory and paths.rawKeywordsFile');
    return { ...inputs };
  }
  const paths = inputs.paths;
  if (!paths || typeof paths !== 'object' || Array.isArray(paths)) fail(paths, 'paths must be an object');
  for (const key of Object.keys(paths))
    if (!['projectRoot', 'siteDirectory', 'researchDirectory', 'rawKeywordsFile'].includes(key)) fail(paths[key], `unknown paths.${key}`);
  for (const key of ['siteDirectory', 'researchDirectory'])
    if (paths[key] === undefined) fail(paths[key], `fill in paths.${key}`);
  const absolute = (value, projectRoot) => {
    if (typeof value !== 'string' || !value.trim()) fail(value, 'absolute path required');
    let expanded = value;
    if (expanded.includes('{projectRoot}')) {
      if (!projectRoot) fail(value, '{projectRoot} requires paths.projectRoot');
      expanded = expanded.replaceAll('{projectRoot}', projectRoot);
    }
    if (/[{}]/.test(expanded)) fail(value, 'only {projectRoot} is supported');
    if (!isAbsolute(expanded)) fail(value, 'absolute path required');
    return resolve(expanded);
  };
  const projectRoot = paths.projectRoot === undefined ? undefined : absolute(paths.projectRoot);
  const resolved = { ...(projectRoot ? { projectRoot } : {}),
    siteDirectory: absolute(paths.siteDirectory, projectRoot),
    researchDirectory: absolute(paths.researchDirectory, projectRoot),
    rawKeywordsFile: absolute(paths.rawKeywordsFile ?? inputs.rawKeywordsFile, projectRoot) };
  if (basename(resolved.researchDirectory) !== 'backgroundinformation')
    fail(paths.researchDirectory, 'researchDirectory must end in backgroundinformation; homepage Skill validate_outputs.py:49 requires this directory name');
  if (overlaps(resolved.siteDirectory, resolved.researchDirectory))
    fail(`${paths.siteDirectory} / ${paths.researchDirectory}`, 'siteDirectory and researchDirectory must not be nested');
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
  if (emptySite) {
    const site = inputs.paths.siteDirectory;
    try { if ((await readdir(site)).length) fail(site, 'new run siteDirectory must be empty or absent'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
