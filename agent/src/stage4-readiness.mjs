import { createHash } from 'node:crypto';
import { chmod, lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import { canonicalJson, parseStrictJson } from './contracts/canonical-json.mjs';
import { ContractError } from './contracts/errors.mjs';
import { validateContract } from './contracts/registry.mjs';
import { safePath, sha256, treeFiles } from './files.mjs';
import { runProcess } from './process.mjs';
import { STAGE } from './stages.mjs';

const POLICY_VERSION = 'stage4-readiness-v1';
const DOMAIN = 'AGENT_STAGE4_READINESS_ATTESTATION_V1';
const sha = value => createHash('sha256').update(value).digest('hex');
const digest = value => sha(`${DOMAIN}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('STAGE4_READINESS_RESULT_INVALID', `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (canonicalJson(actual) !== canonicalJson(expected))
    fail('STAGE4_READINESS_RESULT_INVALID', `${label} fields do not match the locked contract`);
  return value;
}

function validatePreflightResult(value, context) {
  exactObject(value, ['schema_version', 'game', 'workspace', 'page_roots', 'resolved_inputs',
    'keyword_count', 'materials', 'icon_zip', 'git', 'confirmation_required', 'errors', 'warnings', 'ready'],
  'Stage 4 preflight result');
  if (value.schema_version !== 1 || value.game !== context.inputs.gameIdentity ||
      resolve(value.workspace ?? '') !== resolve(context.inputs.projectPath))
    fail('STAGE4_READINESS_BINDING_MISMATCH', 'Stage 4 preflight identity does not match the run');
  const projectPath = resolve(context.inputs.projectPath);
  const insideProject = path => {
    const rel = relative(projectPath, resolve(path));
    return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('../'));
  };
  if (typeof value.ready !== 'boolean' || typeof value.confirmation_required !== 'boolean' ||
      !Array.isArray(value.errors) || !value.errors.every(item => typeof item === 'string' && item) ||
      !Array.isArray(value.warnings) || !value.warnings.every(item => typeof item === 'string' && item) ||
      !Array.isArray(value.page_roots) || !Array.isArray(value.materials) ||
      !Number.isSafeInteger(value.keyword_count) || value.keyword_count < 0)
    fail('STAGE4_READINESS_RESULT_INVALID', 'Stage 4 preflight result has invalid typed fields');
  if (value.page_roots.some(path => typeof path !== 'string' || !isAbsolute(path) || !insideProject(path)))
    fail('STAGE4_READINESS_RESULT_INVALID', 'Stage 4 page roots escape the target project');
  exactObject(value.resolved_inputs, ['background_dir', 'homepage_research', 'icon_zip', 'keywords',
    'materials_dir', 'template_selection_report', 'template_copy_manifest'], 'Stage 4 resolved inputs');
  if (Object.values(value.resolved_inputs).some(path => path !== null &&
      (typeof path !== 'string' || !isAbsolute(path) || !insideProject(path))))
    fail('STAGE4_READINESS_RESULT_INVALID', 'Stage 4 resolved inputs escape the target project');
  for (const material of value.materials) {
    exactObject(material, ['category', 'keyword', 'file', 'status'], 'Stage 4 material');
    if (![material.category, material.keyword].every(item => typeof item === 'string' && item) ||
        typeof material.file !== 'string' || !isAbsolute(material.file) || !insideProject(material.file) ||
        !['COMPLETED', 'PARTIAL', 'BLOCKED'].includes(material.status))
      fail('STAGE4_READINESS_RESULT_INVALID', 'Stage 4 material identity is invalid');
  }
  if (value.materials.length > value.keyword_count)
    fail('STAGE4_READINESS_RESULT_INVALID', 'Stage 4 material count exceeds keyword count');
  exactObject(value.icon_zip, ['members', 'missing'], 'Stage 4 icon ZIP');
  if (![value.icon_zip.members, value.icon_zip.missing].every(items => Array.isArray(items) &&
      items.every(item => typeof item === 'string') && new Set(items).size === items.length))
    fail('STAGE4_READINESS_RESULT_INVALID', 'Stage 4 icon ZIP result is invalid');
  exactObject(value.git, ['is_repo', 'root', 'changes'], 'Stage 4 Git result');
  if (typeof value.git.is_repo !== 'boolean' || !Array.isArray(value.git.changes) ||
      value.git.changes.some(item => typeof item !== 'string') ||
      !(value.git.root === null || typeof value.git.root === 'string'))
    fail('STAGE4_READINESS_RESULT_INVALID', 'Stage 4 Git result has invalid typed fields');
  if (value.git.is_repo) {
    if (typeof value.git.root !== 'string' || !isAbsolute(value.git.root))
      fail('STAGE4_READINESS_RESULT_INVALID', 'Stage 4 Git root is invalid');
    const rel = relative(resolve(value.git.root), projectPath);
    if (isAbsolute(rel) || rel === '..' || rel.startsWith('../'))
      fail('STAGE4_READINESS_RESULT_INVALID', 'Stage 4 project is outside the reported Git root');
  } else if (value.git.root !== null || value.git.changes.length)
    fail('STAGE4_READINESS_RESULT_INVALID', 'Non-Git Stage 4 result contains Git state');
  if (value.ready !== (value.errors.length === 0 && !value.confirmation_required))
    fail('STAGE4_READINESS_RESULT_INVALID', 'Stage 4 ready state conflicts with errors or confirmation');
  return value;
}

async function changedPathSnapshot(projectPath, changes) {
  const entries = [];
  for (const change of changes) {
    if (typeof change !== 'string' || change.length < 4)
      fail('STAGE4_READINESS_RESULT_INVALID', 'Git change entry is invalid');
    let path = change.slice(3);
    if (path.includes(' -> ')) path = path.split(' -> ').at(-1);
    if (!path || path.startsWith('"'))
      fail('STAGE4_READINESS_RESULT_INVALID', 'Quoted or empty Git paths require a clean reconciliation');
    const target = resolve(projectPath, path);
    const rel = relative(projectPath, target);
    if (isAbsolute(rel) || rel === '..' || rel.startsWith('../'))
      fail('STAGE4_READINESS_RESULT_INVALID', 'Git change escapes the target project');
    try {
      const info = await lstat(target);
      if (info.isSymbolicLink()) fail('STAGE4_READINESS_RESULT_INVALID', 'Git change is a symbolic link');
      if (info.isDirectory()) {
        const files = (await treeFiles(target)).filter(file => !relative(target, file).split('/').includes('.git'));
        entries.push({ path, type: 'directory', files: await Promise.all(files.map(async file => ({
          path: relative(target, file), sha256: sha256(await readFile(file)),
        }))) });
      } else if (info.isFile() && info.nlink === 1)
        entries.push({ path, type: 'file', sha256: sha256(await readFile(target)) });
      else fail('STAGE4_READINESS_RESULT_INVALID', 'Git change is not an unlinked regular file');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      entries.push({ path, type: 'missing' });
    }
  }
  return entries;
}

const inputDigest = context => sha(canonicalJson(context.inputs));
const upstreamDigest = context => sha(canonicalJson((context.upstream ?? []).map(stage => ({
  skill: stage.skill,
  status: stage.status,
  artifacts: (stage.artifacts ?? []).map(({ kind, sha256: artifactSha256 }) => ({ kind, sha256: artifactSha256 })),
}))));
const handoffDigest = context => sha(canonicalJson(context.researchHandoff ?? null));

function assertAttestationDigest(attestation) {
  const { attestationDigest, ...payload } = attestation;
  if (digest(payload) !== attestationDigest)
    fail('STAGE4_READINESS_ATTESTATION_CHANGED', 'Stage 4 readiness attestation digest changed');
}

async function lockedPreflight(context) {
  const sourceRoot = dirname(context.skillLock?.source ?? '');
  const path = join(sourceRoot, 'scripts/preflight.py');
  const descriptor = context.skillLock?.files?.find(file => resolve(file.path) === resolve(path));
  if (!descriptor || !/^[a-f0-9]{64}$/.test(descriptor.sha256 ?? ''))
    fail('STAGE4_READINESS_PREFLIGHT_UNLOCKED', 'Locked Stage 4 preflight descriptor is missing');
  const resolved = await realpath(path);
  if (resolved !== resolve(path) || sha256(await readFile(resolved)) !== descriptor.sha256)
    fail('STAGE4_READINESS_PREFLIGHT_CHANGED', 'Locked Stage 4 preflight bytes changed');
  return { path: resolved, sha256: descriptor.sha256 };
}

export function createStage4ReadinessGate({ run = runProcess, pythonCommand, gitCommand,
  gitEnvironment = {}, prepare, dirtyWorktreeApprovalVerifier, clock = Date.now } = {}) {
  return async function stage4ReadinessGate(skill, context) {
    if (skill !== STAGE.CONTENT_INTEGRATION) return { status: 'NOT_APPLICABLE' };
    if (!pythonCommand || !gitCommand) fail('STAGE4_READINESS_TOOL_UNAVAILABLE', 'Fixed Python and Git are required');
    const projectPath = await realpath(context.inputs.projectPath);
    const templateRoot = await realpath(context.templateSnapshot?.templateRoot ?? '');
    const preflight = await lockedPreflight(context);
    const hostDirectory = join(context.outputDirectory, 'host-readiness');
    const probePath = join(hostDirectory, 'preflight-probe.json');
    const resultPath = join(hostDirectory, 'preflight-result.json');
    const attestationPath = join(hostDirectory, 'STAGE4_READINESS_ATTESTATION.json');
    await safePath(hostDirectory, [context.outputDirectory]);
    await mkdir(hostDirectory, { recursive: true, mode: 0o700 });
    for (const path of [probePath, resultPath, attestationPath]) {
      try { await lstat(path); fail('STAGE4_READINESS_REPLAY', 'Stage 4 readiness output already exists'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const runPreflight = async (output, allowDirty = false) => {
      const args = [preflight.path, '--game', context.inputs.gameIdentity, '--workspace', projectPath,
        '--template-root', templateRoot, ...(allowDirty ? ['--allow-dirty-after-confirmation'] : []),
        '--output', output];
      let exitCode = 0;
      try {
        const processResult = await run(pythonCommand, args, { cwd: hostDirectory, timeoutMs: 60_000,
          env: { PATH: `${dirname(gitCommand)}:/usr/bin:/bin:/usr/sbin:/sbin`, TMPDIR: hostDirectory,
            ...gitEnvironment } });
        exitCode = processResult?.exitCode ?? 0;
      } catch (error) {
        if (![2, 3].includes(error.exitCode)) throw error;
        exitCode = error.exitCode;
      }
      const bytes = await readFile(output);
      await chmod(output, 0o400);
      const result = validatePreflightResult(parseStrictJson(bytes, output), context);
      if ((exitCode === 0) !== result.ready || (exitCode === 2) !== (result.errors.length > 0) ||
          (exitCode === 3) !== (result.confirmation_required && result.errors.length === 0))
        fail('STAGE4_READINESS_RESULT_INVALID', 'Stage 4 preflight exit code conflicts with its typed result');
      return { bytes, exitCode, result };
    };
    const probe = await runPreflight(probePath);
    let approvedChangesSha256 = null, approvalConsumption = null, approvedBaseline = null;
    if (probe.result.confirmation_required) {
      const repositoryRoot = await realpath(probe.result.git.root);
      const headResult = await run(gitCommand, ['-C', repositoryRoot, 'rev-parse', '--verify', 'HEAD'], {
        cwd: hostDirectory, timeoutMs: 30_000, env: { PATH: `${dirname(gitCommand)}:/usr/bin:/bin`, ...gitEnvironment },
      }).catch(error => error.exitCode === 128 ? { stdout: '' } : Promise.reject(error));
      const headSha = headResult.stdout.trim() || null;
      if (headSha !== null && !/^[a-f0-9]{40}$/.test(headSha))
        fail('STAGE4_READINESS_RESULT_INVALID', 'Stage 4 Git HEAD is invalid');
      const changedPaths = await changedPathSnapshot(projectPath, probe.result.git.changes);
      const baseline = { repositoryRoot, headSha, changes: probe.result.git.changes, changedPaths };
      const baselineDigest = sha(`${POLICY_VERSION}\n${canonicalJson(baseline)}`);
      const expected = { runId: context.runId, stage: STAGE.CONTENT_INTEGRATION,
        attempt: context.checkpoint.attempt, projectPath, repositoryRoot, headSha, baselineDigest };
      if (typeof dirtyWorktreeApprovalVerifier !== 'function') return { status: 'WAITING_FOR_USER',
        evidence: [...probe.result.errors, ...probe.result.warnings,
          `STAGE4_DIRTY_WORKTREE_APPROVAL_REQUIRED: ${canonicalJson({ kind: 'STAGE4_DIRTY_WORKTREE_APPROVAL_V1',
            schemaVersion: 1, approved: true, ...expected, attempt: expected.attempt + 1 })}`],
        missing_inputs: ['stage4DirtyWorktreeApproval'] };
      approvalConsumption = dirtyWorktreeApprovalVerifier(expected);
      approvedChangesSha256 = sha(canonicalJson(probe.result.git.changes));
      approvedBaseline = { ...baseline, baselineDigest };
      const currentPaths = await changedPathSnapshot(projectPath, probe.result.git.changes);
      if (canonicalJson(currentPaths) !== canonicalJson(changedPaths))
        fail('STAGE4_DIRTY_WORKTREE_APPROVAL_STALE', 'Git worktree changed after approval and before Host preparation');
    }
    const contextPatch = typeof prepare === 'function' ? await prepare(context) ?? {} : {};
    const finalContext = { ...context, ...contextPatch };
    const final = await runPreflight(resultPath, Boolean(approvedChangesSha256));
    const { result, bytes: resultBytes, exitCode } = final;
    if (approvedBaseline) {
      const finalRepositoryRoot = result.git.is_repo && result.git.root
        ? await realpath(result.git.root) : null;
      if (finalRepositoryRoot !== approvedBaseline.repositoryRoot ||
          canonicalJson(result.git.changes) !== canonicalJson(approvedBaseline.changes))
        fail('STAGE4_DIRTY_WORKTREE_APPROVAL_STALE',
          'Git change set or repository identity changed during Host preparation');
      const headResult = await run(gitCommand, ['-C', approvedBaseline.repositoryRoot, 'rev-parse', '--verify', 'HEAD'], {
        cwd: hostDirectory, timeoutMs: 30_000, env: { PATH: `${dirname(gitCommand)}:/usr/bin:/bin`, ...gitEnvironment },
      });
      if (headResult.stdout.trim() !== approvedBaseline.headSha ||
          canonicalJson(await changedPathSnapshot(projectPath, approvedBaseline.changes)) !==
            canonicalJson(approvedBaseline.changedPaths))
        fail('STAGE4_DIRTY_WORKTREE_APPROVAL_STALE', 'Approved Git baseline changed during Host preparation');
    }
    if (!result.ready) return { status: 'BLOCKED', contextPatch,
      evidence: [...result.errors, ...result.warnings], missing_inputs: [] };
    if (exitCode !== 0) fail('STAGE4_READINESS_RESULT_INVALID', 'Ready preflight exited unsuccessfully');
    const payload = {
      kind: 'STAGE4_READINESS_ATTESTATION', schemaVersion: 1,
      producer: 'HOST_STAGE4_READINESS_GATE', policyVersion: POLICY_VERSION,
      runId: context.runId, stage: STAGE.CONTENT_INTEGRATION,
      attempt: context.checkpoint.attempt, siteMode: context.inputs.mode ?? 'new-site',
      projectPath, nativeDirectory: resolve(context.nativeDirectory), templateRoot,
      templateSnapshotCommit: context.templateSnapshot.commit,
      skillLockSha256: context.skillLock.sha256, preflightScriptSha256: preflight.sha256,
      inputDigest: inputDigest(finalContext), upstreamDigest: upstreamDigest(finalContext),
      researchHandoffDigest: handoffDigest(finalContext), preflightExitCode: exitCode,
      preflightResultSha256: sha256(resultBytes),
      git: { isRepo: result.git.is_repo, root: result.git.root,
        changesSha256: sha(canonicalJson(result.git.changes)),
        confirmationRequired: result.confirmation_required, approvedChangesSha256,
        approvedBaselineDigest: approvedBaseline?.baselineDigest ?? null,
        approvalConsumption: approvalConsumption ?? null },
      readiness: 'READY', createdAtMs: clock(),
    };
    const attestation = { ...payload, attestationDigest: digest(payload) };
    validateContract(attestation.kind, attestation.schemaVersion, attestation);
    const bytes = Buffer.from(`${canonicalJson(attestation)}\n`);
    await writeFile(attestationPath, bytes, { flag: 'wx', mode: 0o400 });
    await chmod(hostDirectory, 0o500);
    const binding = { path: attestationPath, digest: attestation.attestationDigest,
      fileSha256: sha256(bytes), attestation,
      verifyCurrentState: async verificationContext => {
        await verifyStage4ReadinessBinding(binding, verificationContext);
        if (!approvedBaseline) return;
        const [headResult, statusResult] = await Promise.all([
          run(gitCommand, ['-C', approvedBaseline.repositoryRoot, 'rev-parse', '--verify', 'HEAD'], {
            cwd: hostDirectory, timeoutMs: 30_000,
            env: { PATH: `${dirname(gitCommand)}:/usr/bin:/bin`, ...gitEnvironment },
          }),
          run(gitCommand, ['-C', projectPath, 'status', '--porcelain', '--', '.'], {
            cwd: projectPath, timeoutMs: 30_000,
            env: { PATH: `${dirname(gitCommand)}:/usr/bin:/bin`, ...gitEnvironment },
          }),
        ]);
        const changes = String(statusResult.stdout ?? '').split(/\r?\n/).filter(line => line.trim());
        if (headResult.stdout.trim() !== approvedBaseline.headSha ||
            canonicalJson(changes) !== canonicalJson(approvedBaseline.changes) ||
            canonicalJson(await changedPathSnapshot(projectPath, changes)) !==
              canonicalJson(approvedBaseline.changedPaths))
          fail('STAGE4_DIRTY_WORKTREE_APPROVAL_STALE',
            'Approved Git baseline changed before Stage 4 Worker dispatch');
      } };
    return { status: 'READY', binding, contextPatch };
  };
}

export async function verifyStage4ReadinessBinding(binding, context) {
  if (!binding || typeof binding.path !== 'string' || !/^[a-f0-9]{64}$/.test(binding.digest ?? '') ||
      !/^[a-f0-9]{64}$/.test(binding.fileSha256 ?? ''))
    fail('STAGE4_READINESS_BINDING_INVALID', 'Stage 4 readiness binding is incomplete');
  try { await safePath(binding.path, [context.outputDirectory]); }
  catch {
    fail('STAGE4_READINESS_ATTESTATION_CHANGED', 'Stage 4 readiness authority path is unsafe');
  }
  const info = await lstat(binding.path);
  const parent = await lstat(dirname(binding.path));
  if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 ||
      !parent.isDirectory() || parent.isSymbolicLink() || (parent.mode & 0o222) !== 0 ||
      await realpath(binding.path) !== resolve(binding.path))
    fail('STAGE4_READINESS_ATTESTATION_CHANGED', 'Stage 4 readiness authority path is not immutable');
  const bytes = await readFile(binding.path);
  if (sha256(bytes) !== binding.fileSha256)
    fail('STAGE4_READINESS_ATTESTATION_CHANGED', 'Stage 4 readiness attestation file changed');
  const attestation = parseStrictJson(bytes, binding.path);
  validateContract('STAGE4_READINESS_ATTESTATION', 1, attestation);
  assertAttestationDigest(attestation);
  if (attestation.attestationDigest !== binding.digest || attestation.runId !== context.runId ||
      attestation.stage !== STAGE.CONTENT_INTEGRATION || attestation.attempt !== context.checkpoint.attempt ||
      attestation.projectPath !== resolve(context.inputs.projectPath) ||
      attestation.nativeDirectory !== resolve(context.nativeDirectory) ||
      attestation.inputDigest !== inputDigest(context) || attestation.upstreamDigest !== upstreamDigest(context) ||
      attestation.researchHandoffDigest !== handoffDigest(context) || attestation.readiness !== 'READY')
    fail('STAGE4_READINESS_BINDING_MISMATCH', 'Stage 4 readiness binding no longer matches the execution context');
  return attestation;
}
