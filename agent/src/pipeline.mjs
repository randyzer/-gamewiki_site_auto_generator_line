import { readFile, writeFile, mkdir, lstat, readdir, open, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { isAbsolute, resolve, relative, dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hostname } from 'node:os';
import { failureDiagnostic, diagnosticSummary, sanitizeDiagnosticText } from './diagnostics.mjs';
import { parseArtifactJson } from './files.mjs';
import { verifySkillSource } from './skill-lock.mjs';
import { verifyTemplateSnapshot } from './template-snapshot.mjs';

import { STAGE, STAGES, ALL_STAGES, INPUT_STAGE, stageName, stageDefinition, stageIndex, findStage } from './stages.mjs';
export { STAGES, AD_STAGE, ARTIFACTS } from './stages.mjs';
export const STATES = Object.freeze(['NOT_STARTED', 'READY', 'IN_PROGRESS', 'WAITING_FOR_USER',
  'BLOCKED', 'PASSED', 'PARTIAL', 'FAILED', 'SKIPPED']);
export const DEFAULT_INVENTORY = fileURLToPath(new URL('../config/skill-manifest.json', import.meta.url));

const RESULT_STATES = new Set(['PASSED', 'PARTIAL', 'FAILED', 'BLOCKED', 'WAITING_FOR_USER']);
const NEXT = {
  NOT_STARTED: ['READY', 'WAITING_FOR_USER', 'BLOCKED'],
  READY: ['IN_PROGRESS', 'WAITING_FOR_USER', 'BLOCKED'],
  IN_PROGRESS: ['PASSED', 'PARTIAL', 'FAILED', 'BLOCKED', 'WAITING_FOR_USER'],
  WAITING_FOR_USER: ['NOT_STARTED', 'PASSED', 'BLOCKED'],
  BLOCKED: ['NOT_STARTED'], PARTIAL: ['NOT_STARTED'], FAILED: ['NOT_STARTED'],
  PASSED: ['NOT_STARTED'], SKIPPED: [],
};
const clone = value => JSON.parse(JSON.stringify(value));
const hash = value => createHash('sha256').update(value).digest('hex');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const inside = (root, path) => {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..' + '/') && rel !== '..' && !isAbsolute(rel));
};
const overlaps = (a, b) => inside(a, b) || inside(b, a);
const now = () => new Date().toISOString();
const assert = (ok, message) => { if (!ok) throw new Error(message); };

// Check each existing component, including ancestors outside the workspace.
async function noLinks(path) {
  assert(typeof path === 'string' && isAbsolute(path), 'Absolute path required');
  let current = parse(path).root;
  for (const part of resolve(path).slice(current.length).split('/').filter(Boolean)) {
    current = join(current, part);
    try {
      const stat = await lstat(current);
      assert(!stat.isSymbolicLink(), `Unsafe symlink: ${current}`);
      assert(!stat.isFile() || stat.nlink === 1, `Unsafe hard link: ${current}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

async function regularFile(path) {
  await noLinks(path);
  assert((await lstat(path)).isFile(), `Regular file required: ${path}`);
  return readFile(path);
}

function checkInputs(value) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'Inputs must be an object');
  for (const key of Object.keys(value)) assert(Object.hasOwn(INPUT_STAGE, key), `Unknown input: ${key}`);
  assert(value.mode === undefined || ['new-site', 'existing-project'].includes(value.mode), 'Unknown project mode');
  // Reject non-JSON values instead of silently dropping functions or cycles.
  const visit = item => {
    if (item === undefined) return;
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
    if (typeof item === 'number' && Number.isFinite(item)) return;
    assert(item && typeof item === 'object' && (Array.isArray(item) || Object.getPrototypeOf(item) === Object.prototype), 'Inputs must be JSON data');
    for (const [key, child] of Object.entries(item)) {
      assert(!/password|secret|token|cookie|private.?key|api.?key/i.test(key), 'Credentials are not allowed in run inputs');
      visit(child);
    }
  };
  JSON.stringify(value); visit(value);
  return clone(value);
}

async function readInventory(path, names) {
  const bytes = await regularFile(path);
  const inventory = JSON.parse(bytes.toString('utf8'));
  assert(isAbsolute(inventory.skillRoot ?? '') && Array.isArray(inventory.skills), 'Invalid inventory');
  if (inventory.sourceTree !== undefined) await verifySkillSource(resolve(inventory.skillRoot), inventory.sourceTree);
  const skills = [];
  for (const name of names) {
    const matches = inventory.skills.filter(s => s.name === name);
    assert(matches.length === 1, `Missing or duplicate skill: ${name}`);
    const entry = matches[0];
    assert(entry.available === true && isAbsolute(entry.source ?? '') &&
      inside(resolve(inventory.skillRoot), resolve(entry.source)) && /^[a-f0-9]{64}$/.test(entry.sha256), `Invalid skill inventory: ${name}`);
    assert(hash(await regularFile(entry.source)) === entry.sha256, `SHA256 mismatch: ${name}`);
    for (const file of entry.files ?? []) {
      assert(isAbsolute(file.path ?? '') && inside(dirname(entry.source), file.path), 'Invalid skill dependency path');
      assert(hash(await regularFile(file.path)) === file.sha256, `Skill dependency SHA256 mismatch: ${name}`);
    }
    skills.push({ name, source: resolve(entry.source), sha256: entry.sha256,
      contractVersion: entry.contractVersion ?? null, version: entry.version ?? entry.commit ?? null });
  }
  return { inventoryPath: path, inventorySha256: hash(bytes), skillRoot: resolve(inventory.skillRoot),
    sourceTree: inventory.sourceTree ?? null, skills };
}

function validateManifest(m, runId, workspace, inventoryPath, templateRoots) {
  assert(m?.schemaVersion === 1 && m.runId === runId && m.workspace === workspace &&
    m.inventoryPath === inventoryPath && JSON.stringify(m.templateRoots) === JSON.stringify(templateRoots), 'Run manifest configuration mismatch');
  checkInputs(m.inputs);
  assert(Number.isSafeInteger(m.sequence) && m.sequence >= 0 && m.deploymentExecuted === false, 'Invalid run manifest');
  const names = ALL_STAGES;
  assert(Array.isArray(m.stages) && m.stages.length === names.length, 'Invalid stage count');
  let pending = false;
  for (const [i, stage] of m.stages.entries()) {
    assert(stage.skill === names[i] && STATES.includes(stage.status) &&
      Array.isArray(stage.artifacts) && Array.isArray(stage.evidence) && Array.isArray(stage.history) &&
      Array.isArray(stage.missing_inputs) && Number.isSafeInteger(stage.checkpoint?.attempt) && stage.checkpoint.attempt >= 0,
    'Invalid stage checkpoint');
    assert(stage.status !== 'SKIPPED' || (stage.skill === STAGE.ADVERTISING_PLAN && m.inputs.adsEnabled !== true) || (stage.skill === STAGE.TEMPLATE_SELECTION && m.inputs.mode === 'existing-project'), 'Mandatory stage cannot be skipped');
    if (stage.status !== 'SKIPPED') {
      assert(!pending || stage.status === 'NOT_STARTED', 'Invalid out-of-order checkpoint');
      if (stage.status !== 'PASSED') pending = true;
    }
    if (stage.status === 'PASSED') assert(stage.artifacts.length > 0 && stage.evidence.length > 0 && m.lock, 'Passed stage lacks evidence');
  }
}

export async function recoverDeadRunLock(lockPath) {
  const guard = await open(lockPath + '.recovery', 'wx', 0o600);
  try {
    const lock = JSON.parse((await regularFile(lockPath)).toString('utf8'));
    assert(lock.host === hostname() && Number.isSafeInteger(lock.pid) && lock.pid > 0, 'Unknown lock owner; manual reconciliation required');
    let dead = false;
    try { process.kill(lock.pid, 0); } catch (error) { if (error.code === 'ESRCH') dead = true; else throw error; }
    assert(dead, 'Pipeline busy: lock owner is still alive');
    await unlink(lockPath);
  } finally { await guard.close(); await unlink(lockPath + '.recovery'); }
}

export async function createPipeline({ workspace, executor, inputs = {}, inventoryPath = DEFAULT_INVENTORY,
  templateRoots = [], templateSnapshot, runId = randomUUID(), resume = false, recoverDeadLocks = false, siteWrites = false, preparedRun,
  expectedManifestSha256 } = {}) {
  if (templateSnapshot) templateRoots = [templateSnapshot.templateRoot];
  assert(typeof executor === 'function', 'Inject an async executor');
  assert(isAbsolute(workspace ?? '') && isAbsolute(inventoryPath), 'Absolute workspace and inventory paths required');
  assert(/^[a-zA-Z0-9_-]{1,100}$/.test(runId), 'Unsafe runId');
  assert(Array.isArray(templateRoots) && templateRoots.every(p => typeof p === 'string' && isAbsolute(p)), 'Absolute templateRoots required');
  workspace = resolve(workspace); inventoryPath = resolve(inventoryPath);
  templateRoots = templateRoots.map(p => resolve(p));
  const runDirectory = join(workspace, 'runs', runId);
  const manifestPath = join(runDirectory, 'manifest.json');
  const lockPath = join(runDirectory, '.lock');
  let busy = false;
  let state;
  let protectedRoots = [...templateRoots];
  let initialResumeDigest = expectedManifestSha256;

  // Protect the source root even if its content hashes are currently invalid.
  try {
    const inventory = JSON.parse((await regularFile(inventoryPath)).toString('utf8'));
    assert(isAbsolute(inventory.skillRoot ?? ''), 'Invalid inventory skillRoot');
    protectedRoots.push(resolve(inventory.skillRoot));
  } catch { /* readInventory records the dependency failure; no executor can run. */ }
  for (const root of protectedRoots) assert(!overlaps(workspace, root), 'Workspace overlaps protected source/template root');
  await noLinks(workspace);

  async function safeOutput(path) {
    assert(isAbsolute(path) && inside(workspace, resolve(path)), 'Output escapes workspace');
    for (const root of protectedRoots) assert(!overlaps(root, resolve(path)), 'Output overlaps protected root');
    await noLinks(path);
  }
  async function validateProject(projectPath) {
    if (!nonempty(projectPath)) return;
    assert(isAbsolute(projectPath) && inside(workspace, resolve(projectPath)), 'Project must be inside workspace');
    assert(resolve(projectPath) !== workspace && !overlaps(resolve(projectPath), join(workspace, 'runs')), 'Project/workspace run directory overlap');
    await safeOutput(projectPath);
    try { assert((await lstat(projectPath)).isDirectory(), 'Project must be a directory'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }

  async function save() {
    await safeOutput(manifestPath);
    const temporary = join(runDirectory, `.manifest-${randomUUID()}.tmp`);
    state.sequence++;
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(state, null, 2) + '\n'); await handle.sync(); }
    finally { await handle.close(); }
    await rename(temporary, manifestPath);
  }

  async function exclusive(operation, initial = false) {
    assert(!busy, 'Pipeline busy'); busy = true;
    let handle;
    try {
      await safeOutput(lockPath);
      try { handle = await open(lockPath, 'wx', 0o600); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if (!recoverDeadLocks) throw new Error('Pipeline busy: durable run lock exists');
        await recoverDeadRunLock(lockPath);
        handle = await open(lockPath, 'wx', 0o600);
      }
      await handle.writeFile(JSON.stringify({ runId, pid: process.pid, host: hostname(), acquiredAt: now() }));
      await handle.sync();
      if (!initial) {
        const diskBytes = await regularFile(manifestPath);
        if (initialResumeDigest !== undefined) {
          assert(hash(diskBytes) === initialResumeDigest, 'ENTRY_RESUME_MANIFEST_CHANGED');
          initialResumeDigest = undefined;
        }
        const disk = JSON.parse(diskBytes.toString('utf8'));
        assert(JSON.stringify(disk) === JSON.stringify(state), 'Stale pipeline instance; resume from disk');
      }
      return await operation();
    } finally {
      if (handle) { await handle.close(); await unlink(lockPath); }
      busy = false;
    }
  }

  assert(!(resume && preparedRun), 'Prepared run cannot resume');
  if (resume) {
    if (expectedManifestSha256 !== undefined) assert(hash(await regularFile(manifestPath)) === expectedManifestSha256,
      'ENTRY_RESUME_MANIFEST_CHANGED');
    assert(Object.keys(inputs).length === 0 || JSON.stringify(checkInputs(inputs)) ===
      JSON.stringify(JSON.parse((await regularFile(manifestPath)).toString('utf8')).inputs), 'Resume inputs must be changed via updateUserInputs');
    state = JSON.parse((await regularFile(manifestPath)).toString('utf8'));
    validateManifest(state, runId, workspace, inventoryPath, templateRoots);
    await validateProject(state.inputs.projectPath);
  } else {
    inputs = checkInputs(inputs);
    await validateProject(inputs.projectPath);
    await safeOutput(runDirectory);
    await mkdir(dirname(runDirectory), { recursive: true });
    if (preparedRun) {
      assert(preparedRun.runDirectory === runDirectory && typeof preparedRun.verify === 'function', 'Invalid prepared run');
      await preparedRun.verify();
      const reservation = await open(manifestPath, 'wx', 0o600);
      try { await reservation.sync(); } finally { await reservation.close(); }
    } else {
      try { await mkdir(runDirectory); }
      catch (error) { if (error.code === 'EEXIST') throw Error('ENTRY_EXECUTION_DESTINATION_EXISTS'); throw error; }
    }
    state = { schemaVersion: 1, runId, workspace, inventoryPath, templateRoots,
      ...(templateSnapshot ? { templateSnapshot: clone(templateSnapshot) } : {}), createdAt: now(),
      sequence: 0, inputs, lock: null, lockError: null, deploymentExecuted: false,
      stages: ALL_STAGES.map(skill => ({ skill,
        status: (skill === STAGE.ADVERTISING_PLAN && inputs.adsEnabled !== true) || (skill === STAGE.TEMPLATE_SELECTION && inputs.mode === 'existing-project') ? 'SKIPPED' : 'NOT_STARTED',
        artifacts: [], evidence: skill === STAGE.TEMPLATE_SELECTION && inputs.mode === 'existing-project' ? ['NOT_APPLICABLE: existing source snapshot; template copy not performed; see BASELINE.json'] : [], missing_inputs: [], history: [],
        checkpoint: { attempt: 0, inputDigest: null, updatedAt: null, next: 'Validate stage inputs' } })) };
    try { state.lock = await readInventory(inventoryPath, inputs.adsEnabled === true ? ALL_STAGES : STAGES); }
    catch (error) { state.lockError = failureDiagnostic(error, { operation: 'verify-skill-inventory' }).reason; }
    await exclusive(save, true);
  }

  function transition(stage, to, evidence = [], missing = []) {
    assert(NEXT[stage.status].includes(to), `Invalid transition ${stage.status} -> ${to}`);
    evidence = evidence.map(item => sanitizeDiagnosticText(item));
    const at = now();
    stage.history.push({ from: stage.status, to, at, evidence: clone(evidence),
      artifacts: stage.artifacts.map(a => ({ path: a.path, sha256: a.sha256 })),
      skillSha256: state.lock?.skills.find(s => s.name === stage.skill)?.sha256 ?? null,
      next: missing.length ? `Supply: ${missing.join(', ')}` : to === 'PASSED' ? 'Advance next stage' : 'Review checkpoint' });
    if (stage.diagnostic && ['FAILED', 'BLOCKED'].includes(to)) stage.history.at(-1).diagnostic = clone(stage.diagnostic);
    else delete stage.diagnostic;
    stage.status = to; stage.evidence = clone(evidence); stage.missing_inputs = [...missing];
    stage.checkpoint.updatedAt = at;
    stage.checkpoint.next = stage.history.at(-1).next;
    if (to === 'WAITING_FOR_USER') stage.checkpoint.waiting = { since: at, reminderSent: false, schedulerAvailable: false };
    else delete stage.checkpoint.waiting;
  }

  async function recordFailure(stage, error, operation, status = 'FAILED', missing = []) {
    const diagnostic = failureDiagnostic(error, { stage: stage.skill, attempt: stage.checkpoint.attempt, operation });
    const recordPath = join(runDirectory, 'diagnostics', `${stage.skill}-${stage.checkpoint.attempt}-${state.sequence + 1}.json`);
    diagnostic.recordPath = recordPath;
    try {
      await safeOutput(recordPath); await mkdir(dirname(recordPath), { recursive: true });
      await writeFile(recordPath, JSON.stringify(diagnostic, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    } catch (writeError) {
      diagnostic.recordPath = null;
      diagnostic.recordWriteFailure = failureDiagnostic(writeError, { operation: 'save-diagnostic' });
    }
    stage.diagnostic = diagnostic;
    transition(stage, status, [diagnosticSummary(diagnostic)], missing);
  }

  async function verifyLock() {
    assert(state.lock, state.lockError ?? 'No verified skill lock; create a new run after repair');
    const current = await readInventory(inventoryPath, state.lock.skills.map(s => s.name));
    assert(JSON.stringify(current) === JSON.stringify(state.lock), 'Skill inventory changed during locked run');
  }

  function requiredArtifacts(index) {
    return [...stageDefinition(state.stages[index].skill).artifacts, ...(state.stages[index].skill === STAGE.UI_UX_AUDIT && state.inputs.uiMode === 'optimize' ? ['UI_UX_RETEST_REPORT.md'] : [])];
  }

  async function verifyArtifacts(index) {
    const stage = state.stages[index];
    if (stage.skill === STAGE.TEMPLATE_SELECTION && stage.status === 'SKIPPED' && state.inputs.mode === 'existing-project') return;
    for (const kind of requiredArtifacts(index)) assert(stage.artifacts.some(a => a.kind === kind), `Missing upstream artifact: ${kind}`);
    for (const artifact of stage.artifacts) {
      await safeOutput(artifact.path);
      assert(inside(join(runDirectory, 'artifacts', String(index)), artifact.path) &&
        artifact.runId === runId && artifact.projectPath === state.inputs.projectPath &&
        artifact.gameIdentity === state.inputs.gameIdentity, 'Upstream artifact identity mismatch');
      assert(hash(await regularFile(artifact.path)) === artifact.sha256, 'Upstream artifact SHA256 changed');
      if (artifact.sourceSha256) {
        await safeOutput(artifact.sourcePath);
        assert(hash(await regularFile(artifact.sourcePath)) === artifact.sourceSha256, 'Native upstream artifact SHA256 changed');
      }
    }
  }

  async function projectDigest() {
    const files = [];
    async function walk(directory) {
      await noLinks(directory);
      let entries;
      try { entries = await readdir(directory, { withFileTypes: true }); }
      catch (error) { if (error.code === 'ENOENT' && directory === state.inputs.projectPath) return; throw error; }
      for (const entry of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
        // Git is owned by the future adapter; never inspect or mutate its internals.
        if (['.git', 'node_modules', '.next', '.astro', 'dist', 'build'].includes(entry.name)) continue;
        const path = join(directory, entry.name);
        const rel = relative(state.inputs.projectPath, path);
        if (/^docs\/(ui-ux-audit|prelaunch|agent-runs)(\/|$)/.test(rel) || /^docs\/DEPLOYMENT_(PLAN|REPORT)\./.test(rel)) continue;
        assert(!entry.isSymbolicLink(), 'Project contains an unsafe symlink');
        if (entry.isDirectory()) await walk(path);
        else {
          assert(entry.isFile(), 'Project contains a non-regular file');
          files.push([relative(state.inputs.projectPath, path), hash(await regularFile(path))]);
        }
      }
    }
    await walk(state.inputs.projectPath);
    return hash(JSON.stringify(files));
  }

  async function verifyProjectFreshness(index) {
    if (index > stageIndex(STAGE.UI_UX_AUDIT)) assert(await projectDigest() === findStage(state.stages, STAGE.UI_UX_AUDIT).checkpoint.projectDigest,
      'Project files changed after UI audit; update siteRevision and explicitly retry affected stages');
  }

  const scopedApproval = value => value?.approved === true && value.projectPath === state.inputs.projectPath && nonempty(value.scope);
  const uiApproval = value => scopedApproval(value) && value.runId === runId && stageName(value.stage) === STAGE.UI_UX_AUDIT &&
    value.siteRevision === state.inputs.siteRevision && Array.isArray(value.files) && value.files.length > 0 &&
    value.files.every(file => nonempty(file) && inside(state.inputs.projectPath, resolve(state.inputs.projectPath, file)) &&
      resolve(state.inputs.projectPath, file) !== resolve(state.inputs.projectPath));
  async function missingInputs(index) {
    const input = state.inputs;
    const missing = ['gameIdentity', 'projectPath', 'objective'].filter(k => !nonempty(input[k]));
    if (state.stages[index].skill === STAGE.KEYWORD_RESEARCH) {
      try {
        assert(nonempty(input.rawKeywordsFile) && isAbsolute(input.rawKeywordsFile) && /\.md$/i.test(input.rawKeywordsFile), 'Markdown required');
        const bytes = await regularFile(input.rawKeywordsFile);
        assert(nonempty(bytes.toString('utf8')), 'Empty keywords');
      } catch { missing.push('rawKeywordsFile'); }
    }
    if (state.stages[index].skill === STAGE.TEMPLATE_SELECTION && templateRoots.length === 0) missing.push('templateRoots (create a configured run)');
    if (state.stages[index].skill === STAGE.CONTENT_INTEGRATION) {
      if (typeof input.canonicalRequired !== 'boolean') missing.push('canonicalRequired');
      if (input.canonicalRequired !== false) {
        try {
          const url = new URL(input.canonicalOrigin);
          assert(url.protocol === 'https:' && url.origin === input.canonicalOrigin && !url.username && !url.password, 'Confirmed HTTPS origin required');
        } catch { missing.push('canonicalOrigin'); }
      }
    }
    if (state.stages[index].skill === STAGE.UI_UX_AUDIT) {
      if (input.uiMode !== undefined && !['audit-only', 'optimize'].includes(input.uiMode)) missing.push('uiMode');
      if (input.uiMode === 'optimize' && !uiApproval(input.uiApproval)) missing.push('uiApproval');
      if (!nonempty(input.siteRevision)) missing.push('siteRevision');
    }
    if (index >= stageIndex(STAGE.PRELAUNCH_ACCEPTANCE) && !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]+$/i.test(input.domain ?? '')) missing.push('domain');
    if (state.stages[index].skill === STAGE.DEPLOYMENT_PLAN) {
      for (const key of ['repo', 'branch']) if (!nonempty(input[key])) missing.push(key);
      if (!nonempty(input.dns?.provider) || input.dns.recordsReviewed !== true) missing.push('dns');
      if (input.deploymentPlanAuthorized !== true) missing.push('deploymentPlanAuthorized');
    }
    if (state.stages[index].skill === STAGE.ADVERTISING_PLAN) {
      if (!nonempty(input.adCode)) missing.push('adCode');
      if (!scopedApproval(input.adApproval)) missing.push('adApproval');
      try { const u = new URL(input.liveUrl); assert(u.protocol === 'https:' && u.hostname === input.domain && !u.username && !u.password, 'Live URL mismatch'); }
      catch { missing.push('liveUrl'); }
    }
    return missing;
  }

  function inputChecklist() {
    const current = state.stages.findIndex(s => !['PASSED', 'SKIPPED'].includes(s.status));
    return Object.entries(INPUT_STAGE).filter(([key]) => state.inputs.adsEnabled === true || !['adCode', 'adApproval', 'liveUrl'].includes(key))
      .sort((a, b) => stageIndex(a[1]) - stageIndex(b[1])).map(([key, stage]) => ({ key, skill: stage, stageLabel: stageDefinition(stage).label,
        requiredByStage: stageIndex(stage) + 1, timing: stageIndex(stage) <= current ? 'now' : 'later',
        provided: state.inputs[key] !== undefined && state.inputs[key] !== '',
        conditional: ['canonicalOrigin', 'uiApproval', 'adCode', 'adApproval', 'liveUrl', 'deploymentPlanApproval'].includes(key),
        pathOrInformation: key === 'rawKeywordsFile' ? 'User-supplied absolute Markdown file path' :
          key === 'projectPath' ? 'Absolute project directory inside workspace' : key,
        purpose: `Input for ${stage}` }));
  }

  async function validateResult(result, index, outputDirectory) {
    assert(result && RESULT_STATES.has(result.status), 'Invalid executor output: status must be PASSED, PARTIAL, FAILED, BLOCKED or WAITING_FOR_USER');
    assert(Array.isArray(result.artifacts), 'Invalid executor output: artifacts must be an array');
    assert(Array.isArray(result.evidence) && result.evidence.every(nonempty), 'Invalid executor output: evidence must contain nonempty strings');
    assert(Array.isArray(result.missing_inputs) && result.missing_inputs.every(nonempty), 'Invalid executor output: missing_inputs must contain nonempty strings');
    assert(!['FAILED', 'BLOCKED'].includes(result.status) || result.evidence.length > 0, 'Worker returned ' + result.status + ' without a failure reason in evidence');
    assert(result.status !== 'PASSED' || (result.evidence.length && result.missing_inputs.length === 0), 'PASSED requires evidence and no missing inputs');
    assert(result.status !== 'WAITING_FOR_USER' || result.missing_inputs.length, 'WAITING requires missing_inputs');
    const kinds = new Set(); const paths = new Set(); const validated = [];
    for (const artifact of result.artifacts) {
      assert(nonempty(artifact.kind) && !kinds.has(artifact.kind), 'Duplicate or invalid artifact kind');
      kinds.add(artifact.kind);
      assert(artifact.runId === runId && artifact.projectPath === state.inputs.projectPath &&
        artifact.gameIdentity === state.inputs.gameIdentity, 'Wrong project/game/run artifact');
      assert(typeof artifact.path === 'string' && isAbsolute(artifact.path) && inside(outputDirectory, resolve(artifact.path)) &&
        resolve(artifact.path) !== outputDirectory && !paths.has(resolve(artifact.path)), 'Artifact path escape or duplicate target');
      paths.add(resolve(artifact.path));
      await safeOutput(artifact.path);
      assert(typeof artifact.content === 'string' && artifact.content.length > 0, 'Artifact requires nonempty content');
      assert(artifact.encoding === undefined || ['utf8', 'base64'].includes(artifact.encoding), 'Unsupported artifact encoding');
      const content = Buffer.from(artifact.content, artifact.encoding ?? 'utf8');
      assert(content.length > 0, 'Empty artifact bytes');
      if (artifact.kind.endsWith('.json')) parseArtifactJson(content, artifact.path);
      validated.push({ ...clone(artifact), sha256: hash(content), bytes: content.length });
    }
    if (result.status === 'PASSED') {
      for (const kind of requiredArtifacts(index)) assert(kinds.has(kind), `Missing required artifact: ${kind}`);
    }
    return validated;
  }

  async function advance() {
    return exclusive(async () => {
      const index = state.stages.findIndex(s => !['PASSED', 'SKIPPED'].includes(s.status));
      if (index < 0) return clone(state);
      const stage = state.stages[index];
      if (['PARTIAL', 'BLOCKED', 'FAILED', 'WAITING_FOR_USER'].includes(stage.status)) return clone(state);
      if (stage.status === 'IN_PROGRESS') {
        transition(stage, 'BLOCKED', ['Interrupted invocation: explicit reconciliation and retry required']);
        await save(); return clone(state);
      }
      try {
        await verifyLock(); await validateProject(state.inputs.projectPath);
        if (state.templateSnapshot) await verifyTemplateSnapshot(state.templateSnapshot);
        for (let i = 0; i < index; i++) await verifyArtifacts(i);
        await verifyProjectFreshness(index);
        if (index > stageIndex(STAGE.KEYWORD_RESEARCH)) {
          const expected = findStage(state.stages, STAGE.KEYWORD_RESEARCH).checkpoint.keywordSha256;
          assert(expected && hash(await regularFile(state.inputs.rawKeywordsFile)) === expected, 'Raw keywords changed; explicitly update input or start a new run');
        }
      } catch (error) {
        await recordFailure(stage, error, 'verify-upstream', 'BLOCKED'); await save(); return clone(state);
      }
      const missing = await missingInputs(index);
      if (missing.length) {
        transition(stage, 'WAITING_FOR_USER', ['Required stage inputs are missing or invalid'], missing);
        await save(); return clone(state);
      }
      if (stage.skill === STAGE.TEMPLATE_SELECTION) {
        try { assert((await readdir(state.inputs.projectPath)).length === 0, 'Template target is not empty'); }
        catch (error) {
          if (error.code !== 'ENOENT') { await recordFailure(stage, error, 'check-template-target', 'BLOCKED'); await save(); return clone(state); }
        }
      }
      if (stage.status !== 'READY') { transition(stage, 'READY'); await save(); }
      stage.checkpoint.attempt++;
      stage.checkpoint.inputDigest = hash(JSON.stringify(state.inputs));
      transition(stage, 'IN_PROGRESS'); await save();
      let operation = 'prepare-stage-workspace';
      try {
        if (stage.skill === STAGE.KEYWORD_RESEARCH) stage.checkpoint.keywordSha256 = hash(await regularFile(state.inputs.rawKeywordsFile));
        const outputDirectory = join(runDirectory, 'artifacts', String(index), String(stage.checkpoint.attempt));
        await safeOutput(outputDirectory); await mkdir(outputDirectory, { recursive: true });
        const context = clone({ runId, stage: stage.skill, inputs: state.inputs, outputDirectory, templateRoots,
          templateSnapshot: state.templateSnapshot ?? null, requiredArtifacts: requiredArtifacts(index),
          skillLock: state.lock.skills.find(s => s.name === stage.skill),
          upstream: state.stages.slice(0, index), checkpoint: stage.checkpoint,
          mode: stageDefinition(stage.skill).planOnly ? 'plan-only' : stage.skill === STAGE.UI_UX_AUDIT && state.inputs.uiMode === 'optimize' ? 'optimize' : 'audit-only',
          permissions: { uiChanges: stage.skill === STAGE.UI_UX_AUDIT && uiApproval(state.inputs.uiApproval) && state.inputs.uiMode === 'optimize',
            gitPush: false, dns: false, productionDeployment: false, gsc: false, ga4: false, advertisingScripts: false,
            siteWrites: siteWrites && (stage.skill === STAGE.TEMPLATE_SELECTION || stage.skill === STAGE.CONTENT_INTEGRATION || (stage.skill === STAGE.UI_UX_AUDIT && uiApproval(state.inputs.uiApproval) && state.inputs.uiMode === 'optimize')) } });
        operation = 'execute-skill';
        const result = await executor(stage.skill, context);
        operation = 'verify-upstream-after-execution';
        await verifyLock();
        for (let i = 0; i < index; i++) await verifyArtifacts(i);
        await verifyProjectFreshness(index);
        operation = 'validate-artifacts';
        const artifacts = await validateResult(result, index, outputDirectory);
        let status = result.status;
        let missing = result.missing_inputs;
        let evidence = result.evidence;
        if (stage.skill === STAGE.PRELAUNCH_ACCEPTANCE && status === 'PASSED') {
          const report = artifacts.find(a => a.kind === 'PRELAUNCH_ACCEPTANCE.json');
          const data = JSON.parse(Buffer.from(report.content, report.encoding ?? 'utf8').toString('utf8'));
          const reasons = [];
          if (!['可以上线', '可以上线，但有P2待办'].includes(data.disposition)) reasons.push('Prelaunch disposition does not permit deployment planning');
          if (data.siteRevision !== undefined && data.siteRevision !== state.inputs.siteRevision) reasons.push('Prelaunch report siteRevision differs from the current task');
          if (data.expected_domain !== undefined ? data.expected_domain !== 'https://' + state.inputs.domain : data.domain !== state.inputs.domain) reasons.push('Prelaunch report domain differs from the current task');
          if (reasons.length) { status = 'BLOCKED'; evidence = reasons; }
        }
        operation = 'save-artifacts';
        for (const artifact of artifacts) {
          await safeOutput(artifact.path);
          await mkdir(dirname(artifact.path), { recursive: true });
          await writeFile(artifact.path, Buffer.from(artifact.content, artifact.encoding ?? 'utf8'), { flag: 'wx', mode: 0o600 });
        }
        stage.artifacts = artifacts.map(({ content, encoding, ...metadata }) => metadata);
        operation = 'save-stage-checkpoint';
        if (stage.skill === STAGE.UI_UX_AUDIT && status === 'PASSED') stage.checkpoint.projectDigest = await projectDigest();
        if (stage.skill === STAGE.DEPLOYMENT_PLAN && status === 'PASSED') {
          stage.checkpoint.planDigest = hash(JSON.stringify(stage.artifacts.map(a => a.sha256)));
          status = 'WAITING_FOR_USER'; missing = ['deploymentPlanApproval'];
        }
        if (stage.skill === STAGE.ADVERTISING_PLAN && status === 'PASSED') {
          status = 'WAITING_FOR_USER'; missing = ['externalAdvertisingImplementationAndAcceptance'];
        }
        if (['FAILED', 'BLOCKED'].includes(status)) await recordFailure(stage, Error(evidence.join('\n')), 'worker-reported-failure', status, missing);
        else transition(stage, status, evidence, missing);
      } catch (error) {
        await recordFailure(stage, error, operation);
      }
      await save(); return clone(state);
    });
  }

  async function updateUserInputs(patch, { retry = false } = {}) {
    return exclusive(async () => {
      patch = checkInputs(patch);
      assert(!state.stages.some(s => s.status === 'IN_PROGRESS'), 'Interrupted invocation must be reconciled with advance before updating');
      for (const key of ['gameIdentity', 'projectPath', 'objective', 'adsEnabled', 'mode', 'targetId', 'sourceProjectPath', 'taskCardDigest']) {
        if (Object.hasOwn(patch, key) && state.stages.some(s => s.checkpoint.attempt > 0))
          assert(JSON.stringify(patch[key]) === JSON.stringify(state.inputs[key]), `${key} is locked; create a new run`);
      }
      const updated = { ...state.inputs, ...patch };
      await validateProject(updated.projectPath);
      if (Object.hasOwn(patch, 'adsEnabled')) assert(patch.adsEnabled === state.inputs.adsEnabled, 'Ad branch is locked at creation');
      const current = state.stages.findIndex(s => !['PASSED', 'SKIPPED'].includes(s.status));
      if (state.stages[current]?.skill === STAGE.DEPLOYMENT_PLAN && findStage(state.stages, STAGE.DEPLOYMENT_PLAN).checkpoint.planDigest && Object.hasOwn(patch, 'deploymentPlanApproval')) {
        assert(Object.keys(patch).length === 1, 'Approve the exact plan separately from input changes');
        const approval = patch.deploymentPlanApproval;
        assert(approval?.approved === true && approval.digest === findStage(state.stages, STAGE.DEPLOYMENT_PLAN).checkpoint.planDigest, 'Approval must match current deployment plan digest');
        await verifyLock();
        for (let i = 0; i <= stageIndex(STAGE.DEPLOYMENT_PLAN); i++) await verifyArtifacts(i);
        await verifyProjectFreshness(stageIndex(STAGE.DEPLOYMENT_PLAN));
        assert(hash(await regularFile(state.inputs.rawKeywordsFile)) === findStage(state.stages, STAGE.KEYWORD_RESEARCH).checkpoint.keywordSha256,
          'Raw keywords changed since plan creation');
        state.inputs = updated;
        transition(findStage(state.stages, STAGE.DEPLOYMENT_PLAN), 'PASSED', ['Deployment plan acknowledged only; no external actions executed']);
        await save(); return clone(state);
      }
      const changed = Object.keys(patch).filter(k => JSON.stringify(state.inputs[k]) !== JSON.stringify(patch[k]));
      if (Object.hasOwn(patch, 'rawKeywordsFile') && findStage(state.stages, STAGE.KEYWORD_RESEARCH).checkpoint.keywordSha256) {
        let digest;
        try { digest = hash(await regularFile(patch.rawKeywordsFile)); } catch { digest = null; }
        if (digest !== findStage(state.stages, STAGE.KEYWORD_RESEARCH).checkpoint.keywordSha256 && !changed.includes('rawKeywordsFile')) changed.push('rawKeywordsFile');
      }
      let start = changed.length ? Math.min(...changed.map(k => stageIndex(INPUT_STAGE[k]))) : retry ? current : Infinity;
      // Supplying a currently requested fact is the only automatic resume trigger.
      if (current >= 0 && state.stages[current].status === 'WAITING_FOR_USER' &&
        state.stages[current].missing_inputs.some(key => Object.hasOwn(patch, key))) start = Math.min(start, current);
      if (!changed.length && !Object.keys(patch).length && !retry) return clone(state);
      state.inputs = updated;
      if (start >= 0) for (let i = start; i < state.stages.length; i++) {
        const stage = state.stages[i];
        if (stage.status === 'SKIPPED' || stage.status === 'NOT_STARTED') continue;
        transition(stage, 'NOT_STARTED', ['Explicit user input update/retry; previous attempt retained in history']);
        stage.artifacts = [];
        for (const key of ['planDigest', 'projectDigest', 'keywordSha256']) delete stage.checkpoint[key];
      }
      if (start <= stageIndex(STAGE.DEPLOYMENT_PLAN)) delete state.inputs.deploymentPlanApproval;
      await save(); return clone(state);
    });
  }

  return Object.freeze({ manifestPath, advance, updateUserInputs, inputChecklist, snapshot: () => clone(state) });
}
