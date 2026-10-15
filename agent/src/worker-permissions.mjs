import { dirname, isAbsolute, join, resolve } from 'node:path';
import { realpath, readFile, stat } from 'node:fs/promises';
import { inside, safePath, sha256 } from './files.mjs';
import { STAGE } from './stages.mjs';
import { verifySiteEvidence } from './site-evidence.mjs';

export const DISABLED_WORKER_FEATURES = Object.freeze(['apps', 'browser_use', 'browser_use_external',
  'browser_use_full_cdp_access', 'computer_use', 'in_app_browser', 'in_app_local_automation',
  'image_generation', 'plugins', 'remote_plugin', 'hooks', 'multi_agent',
  'skill_mcp_dependency_install', 'skill_search', 'request_permissions_tool', 'shell_snapshot',
  'workspace_dependencies', 'auth_elicitation', 'tool_suggest', 'goals', 'view_image']);
export const ENABLED_WORKER_FEATURES = Object.freeze(['code_mode_host']);
// Only homepage research generates images; audit workers can inspect host screenshots.

export function stageWorkerFeatures(skill) {
  const images = skill === STAGE.HOMEPAGE_RESEARCH;
  const viewing = images || [STAGE.UI_UX_AUDIT, STAGE.PRELAUNCH_ACCEPTANCE].includes(skill);
  const enabled = [...ENABLED_WORKER_FEATURES, ...(images ? ['image_generation'] : []), ...(viewing ? ['view_image'] : [])];
  return {
    disabled: DISABLED_WORKER_FEATURES.filter(feature => !enabled.includes(feature)),
    enabled,
  };
}

// Identity is supplied by fixed trusted host code, never by a task or model.
export async function verifyWorkerCommandIdentity(command, identity) {
  try {
    if (!identity || Object.keys(identity).sort().join(',') !== 'path,realPath,sha256,version' ||
        command !== identity.path || !isAbsolute(command) || resolve(command) !== command ||
        identity.version !== 'codex-cli 0.153.0' || !/^[a-f0-9]{64}$/.test(identity.sha256))
      throw Error();
    const path = await realpath(command);
    if (path !== identity.realPath || !(await stat(path)).isFile() ||
        sha256(await readFile(path)) !== identity.sha256) throw Error();
    return structuredClone(identity);
  } catch { throw Error('WORKER_CLI_IDENTITY_CHANGED'); }
}

// Code Mode runs in the official companion binary shipped beside the pinned CLI.
// Its identity is host policy, never task input or a PATH lookup.
export async function verifyWorkerCodeModeHostIdentity(cliIdentity, identity) {
  try {
    if (!cliIdentity || !identity || Object.keys(identity).sort().join(',') !== 'path,realPath,sha256' ||
        !isAbsolute(identity.path) || resolve(identity.path) !== identity.path ||
        identity.path !== join(dirname(cliIdentity.realPath), 'codex-code-mode-host') ||
        !/^[a-f0-9]{64}$/.test(identity.sha256)) throw Error();
    const path = await realpath(identity.path), metadata = await stat(path);
    if (path !== identity.realPath || !metadata.isFile() || (metadata.mode & 0o111) === 0 ||
        sha256(await readFile(path)) !== identity.sha256) throw Error();
    return structuredClone(identity);
  } catch { throw Error('WORKER_CODE_MODE_HOST_IDENTITY_CHANGED'); }
}

// Client authentication uses HOME/CODEX_HOME separately from sandboxed command reads.
export function workerEnvironment(source = process.env) {
  const env = Object.fromEntries(['PATH', 'HOME', 'CODEX_HOME', 'TMPDIR', 'LANG', 'LC_ALL']
    .filter(key => typeof source[key] === 'string' && source[key])
    .map(key => [key, source[key]]));
  env.BSK_AUTO_START = '0';
  return env;
}

export function keywordResearchEnvironment(source = process.env) {
  const env = workerEnvironment(source);
  for (const key of ['SERPER_API_KEY', 'YTDLP_COOKIES_FILE'])
    if (typeof source[key] === 'string' && source[key]) env[key] = source[key];
  return env;
}

export function permissionProfileConfig(name, { readPaths = [], writePaths = [], writeGitPaths = [], readOnlyPaths = [], denyPaths = [], network = false } = {}) {
  if (!/^agent-[a-z-]+$/.test(name)) throw Error('WORKER_PERMISSION_PROFILE_INVALID');
  if (typeof network !== 'boolean') throw Error('WORKER_PERMISSION_NETWORK_INVALID');
  const rules = new Map([[':root', 'deny'], [':minimal', 'read']]);
  for (const [paths, access] of [[readPaths, 'read'], [writePaths, 'write'], [denyPaths, 'deny']]) {
    for (const path of paths) {
      if (!isAbsolute(path) || resolve(path) !== path || path === '/') throw Error('WORKER_PERMISSION_PATH_INVALID');
      rules.set(path, access);
    }
  }
  // Preserve the built-in workspace protections without broad temporary-directory access.
  for (const path of writePaths) for (const entry of ['.git', '.agents', '.codex', '.aws'])
    rules.set(join(path, entry), 'read');
  for (const gitPath of writeGitPaths) {
    if (!isAbsolute(gitPath) || resolve(gitPath) !== gitPath ||
        !writePaths.some(path => resolve(path, '.git') === gitPath)) throw Error('WORKER_PERMISSION_GIT_PATH_INVALID');
    rules.set(gitPath, 'write');
  }
  for (const path of readOnlyPaths) {
    if (!isAbsolute(path) || resolve(path) !== path || path === '/') throw Error('WORKER_PERMISSION_PATH_INVALID');
    if (!denyPaths.some(root => inside(root, path))) rules.set(path, 'read');
  }
  for (const path of denyPaths) rules.set(path, 'deny');
  const table = [...rules].map(([path, access]) => `${JSON.stringify(path)}=${JSON.stringify(access)}`).join(',');
  return `permissions.${name}={filesystem={${table}},network={enabled=${network}}}`;
}

// Approved deployment runs as the operator: it reuses the operator's existing gh/git/vercel logins.
// Credentials are read from their usual config locations by those CLIs; they are never put in env or prompts.
export const deploymentExecutionApproved = (skill, context) => skill === STAGE.DEPLOYMENT_PLAN &&
  context.mode === 'execute' && context.permissions?.productionDeployment === true &&
  /^[a-f0-9]{64}$/.test(context.approvedPlan?.digest ?? '');

export async function stageWorkerPermissions(skill, context, { writePaths = [], researchToolPaths = [], deploymentTools } = {}) {
  const { nativeDirectory, runDirectory, inputs } = context;
  if (!inside(runDirectory, nativeDirectory)) throw Error('WORKER_PERMISSION_SCOPE_INVALID');
  const readPaths = [dirname(context.skillLock.source), process.execPath, await realpath(process.execPath)];
  if (process.platform === 'darwin') readPaths.push('/System/Library/OpenSSL');
  for (const key of ['rawKeywordsFile', 'keywordSourceLineageFile', 'iconSourcePng'])
    if (inputs[key] && inside(runDirectory, inputs[key])) readPaths.push(inputs[key]);
  for (const stage of context.upstream ?? []) for (const artifact of stage.artifacts ?? [])
    if (artifact.path && inside(runDirectory, artifact.path)) readPaths.push(artifact.path);
  for (const path of [context.hostBrowserEvidencePath, context.homepageSourceEvidencePath])
    if (path && inside(runDirectory, path)) readPaths.push(path);
  if (context.homepageSourceCaptures) {
    const bundle = context.homepageSourceCaptures;
    if (bundle.directory !== join(runDirectory, 'homepage-sources/captures')) throw Error('WORKER_HOMEPAGE_CAPTURES_INVALID');
    await verifySiteEvidence(bundle);
    readPaths.push(bundle.directory);
  }
  if (context.homepageMediaEvidencePath) {
    const path = context.homepageMediaEvidencePath;
    if (path !== join(runDirectory, 'homepage-media/MEDIA_EVIDENCE.json') ||
        !/^[a-f0-9]{64}$/.test(context.homepageMediaEvidenceSha256 ?? '')) throw Error('WORKER_MEDIA_EVIDENCE_INVALID');
    await safePath(path, [runDirectory]);
    if (sha256(await readFile(path)) !== context.homepageMediaEvidenceSha256) throw Error('WORKER_MEDIA_EVIDENCE_CHANGED');
    readPaths.push(path);
  }
  if (skill === STAGE.TEMPLATE_SELECTION) readPaths.push(...(context.templateRoots ?? []));
  if (skill === STAGE.KEYWORD_RESEARCH) readPaths.push(...researchToolPaths);
  if (inputs.projectPath && skill !== STAGE.TEMPLATE_SELECTION) readPaths.push(inputs.projectPath);
  const deploying = deploymentExecutionApproved(skill, context);
  const configured = inputs.paths;
  const originalInputs = [];
  if (configured) {
    const site = inputs.projectPath, research = configured.researchDirectory;
    const researchWrites = [STAGE.HOMEPAGE_RESEARCH, STAGE.KEYWORD_RESEARCH].includes(skill);
    const siteWrites = deploying || (context.permissions?.siteWrites === true &&
      skill === STAGE.CONTENT_INTEGRATION);
    for (const value of new Set([configured.rawKeywordsFile, inputs.keywordSourceLineageFile, ...(context.readOnlyInputPaths ?? [])]))
      if (value) originalInputs.push(value);
    // Discard parent grants and out-of-stage descendant grants before building the profile.
    writePaths = writePaths.filter(path => {
      if (originalInputs.some(input => inside(path, input))) return false;
      if (inside(path, site) && path !== site || inside(path, research) && path !== research) return false;
      if (inside(site, path) && !siteWrites || inside(research, path) && !researchWrites) return false;
      return true;
    });
    readPaths.push(site, research);
    if (researchWrites) writePaths.push(research);
    if (siteWrites) writePaths.push(site);
    if (skill === STAGE.TEMPLATE_SELECTION) writePaths.push(join(runDirectory, 'template-copy'));
  }
  if (deploying) {
    for (const artifact of context.approvedPlan.artifacts ?? [])
      if (artifact.path && inside(runDirectory, artifact.path)) readPaths.push(artifact.path);
    readPaths.push(...(deploymentTools?.readPaths ?? []));
  }
  for (const path of [...readPaths, ...writePaths, nativeDirectory]) await safePath(path, [path]);
  // Login state lives under the user's home and is often a symlinked dotfile, so it skips the link check above.
  if (deploying) readPaths.push(...(deploymentTools?.credentialPaths ?? []));
  const denyPaths = [];
  if (process.platform === 'darwin') denyPaths.push('/usr/bin/osascript', '/usr/bin/open');
  if (process.env.HOME) denyPaths.push(...['.codex', '.ssh', '.aws'].map(name => join(process.env.HOME, name)));
  if (process.env.CODEX_HOME) denyPaths.push(resolve(process.env.CODEX_HOME));
  if (configured) for (const path of [inputs.projectPath, configured.researchDirectory, ...originalInputs])
    if (denyPaths.some(root => inside(root, path))) throw Error(`WORKER_PERMISSION_PATH_DENIED: ${path}`);
  const commandNetworkAllowed = skill === STAGE.KEYWORD_RESEARCH || deploying;
  const config = permissionProfileConfig('agent-worker', { readPaths,
    writePaths: [nativeDirectory, ...writePaths],
    writeGitPaths: deploying ? [resolve(inputs.projectPath, '.git')] : [],
    readOnlyPaths: originalInputs.filter(path => inside(inputs.projectPath, path) || inside(configured.researchDirectory, path)),
    denyPaths, network: commandNetworkAllowed });
  return { config, args: ['-c', 'default_permissions="agent-worker"', '-c', config],
    kind: 'STAGE_WORKER_PERMISSIONS_V1', commandNetworkAllowed,
    clientAuthenticationIsSeparate: true, productionActivationAuthorized: false };
}

