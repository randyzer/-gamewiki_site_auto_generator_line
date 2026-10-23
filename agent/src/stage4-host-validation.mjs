import { constants as fsConstants } from 'node:fs';
import { access, lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { runProcess } from './process.mjs';
import { sourceFiles } from './project-baseline.mjs';
import { safePath, sha256, treeFiles } from './files.mjs';
import { stage4SiteDigest } from './stage4-site-transaction.mjs';
import { packageManagerEnvironment, verifySitePackageManager } from './site-package-manager.mjs';

const fail = (code, detail = '') => Object.assign(Error(`${code}${detail ? `: ${detail}` : ''}`), { code });
const outputDirectories = ['.next', 'dist', 'build', '.output'];
const orderedScripts = ['check', 'typecheck', 'type-check', 'lint', 'test', 'build'];
const forbiddenScript = /(?:^|[;&|\s])(?:npm|pnpm|yarn|bun)\s+(?:i|install|add|update|upgrade|dlx)\b|(?:^|[;&|\s])(?:npx|bunx|curl|wget)\b/i;
const packageEnvironmentReference = /\$(?:\{)?((?:npm|pnpm)_[A-Za-z0-9_]+|INIT_CWD)(?:\})?/g;
const supportedPackageEnvironment = new Set(['npm_lifecycle_event', 'npm_lifecycle_script', 'npm_package_name',
  'npm_package_version', 'npm_package_json', 'npm_execpath', 'npm_node_execpath', 'npm_command', 'INIT_CWD']);
const secretKey = /(?:TOKEN|SECRET|PASSWORD|COOKIE|PRIVATE|CREDENTIAL|API_KEY|AUTH|NODE_OPTIONS|NPM_CONFIG_USERCONFIG|HOME|CODEX_HOME)/i;

async function existsDirectory(path) {
  try { return (await lstat(path)).isDirectory(); }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function candidateSourceDigest(root) {
  const files = (await sourceFiles(root, { rejectSecrets: true }))
    .filter(file => file.path !== 'next-env.d.ts' && !file.path.endsWith('.tsbuildinfo'));
  return sha256(JSON.stringify(files));
}

function safeEnvironment(source, nativeDirectory) {
  const env = packageManagerEnvironment(source, { home: nativeDirectory, tmpdir: nativeDirectory });
  for (const [key, value] of Object.entries(source)) {
    if (secretKey.test(key)) continue;
    if (/^(?:CI|TERM|TZ|NO_COLOR)$/.test(key) && typeof value === 'string') env[key] = value;
  }
  return env;
}

function sandboxProfile(candidatePath, nativeDirectory) {
  const literal = value => value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  return `(version 1)\n(allow default)\n(deny network*)\n` +
    `(allow network-bind (local ip "localhost:*"))\n` +
    `(allow network-inbound (local ip "localhost:*"))\n` +
    `(allow network-outbound (remote ip "localhost:*"))\n` +
    `(deny file-write*)\n` +
    `(allow file-write* (literal "/dev/null"))\n` +
    `(allow file-write* (subpath "${literal(candidatePath)}") (subpath "${literal(nativeDirectory)}"))\n`;
}

function scriptPlan(pkg, selected) {
  const plan = [];
  for (const requested of selected) {
    for (const name of [`pre${requested}`, requested, `post${requested}`]) {
      const body = pkg.scripts?.[name];
      if (!body) continue;
      const references = [...body.matchAll(packageEnvironmentReference)].map(match => match[1]);
      if (references.some(reference => !supportedPackageEnvironment.has(reference)))
        throw fail('STAGE4_SCRIPT_SEMANTICS_UNSUPPORTED', name);
      plan.push({ requested, name, body });
    }
  }
  return plan;
}

export async function validateStage4Candidate(context, { run = runProcess, environment = process.env,
  platform = process.platform, sandboxCommand = '/usr/bin/sandbox-exec',
  verifyPackageManager = verifySitePackageManager } = {}) {
  const candidatePath = context?.candidatePath, nativeDirectory = context?.nativeDirectory;
  if (typeof candidatePath !== 'string' || typeof nativeDirectory !== 'string') throw fail('STAGE4_HOST_CONTEXT_INVALID');
  await safePath(candidatePath, [candidatePath]); await safePath(nativeDirectory, [nativeDirectory]);
  await mkdir(nativeDirectory, { recursive: true, mode: 0o700 });
  if (platform !== 'darwin') throw fail('STAGE4_HOST_SANDBOX_UNAVAILABLE', platform);
  if (run === runProcess) {
    try { await access(sandboxCommand, fsConstants.X_OK); }
    catch { throw fail('STAGE4_HOST_SANDBOX_UNAVAILABLE', sandboxCommand); }
  }
  const packageManager = await verifyPackageManager(candidatePath, context.packageManager, {
    run, environment, home: nativeDirectory, tmpdir: nativeDirectory,
  });
  const pkg = JSON.parse(await readFile(join(candidatePath, 'package.json'), 'utf8'));
  if (!pkg.scripts?.build) throw fail('STAGE4_BUILD_SCRIPT_MISSING');
  for (const [name, body] of Object.entries(pkg.scripts ?? {})) {
    if (typeof body !== 'string' || forbiddenScript.test(body) || /^(?:pre|post)(?:install|pack|publish)$/i.test(name))
      throw fail('STAGE4_VALIDATION_SCRIPT_UNSAFE', name);
  }
  const selected = orderedScripts.filter(name => pkg.scripts[name]);
  const scripts = scriptPlan(pkg, selected);
  const beforeDigest = await candidateSourceDigest(candidatePath);
  for (const name of outputDirectories) await rm(join(candidatePath, name), { recursive: true, force: true });
  const reportPath = join(nativeDirectory, 'STAGE4_HOST_VALIDATION.json');
  const report = { schemaVersion: 1, kind: 'STAGE4_HOST_VALIDATION_V1', status: 'IN_PROGRESS',
    candidatePath, targetPath: context.targetPath ?? null, manager: packageManager.manager,
    managerVersion: packageManager.version, managerExecutable: packageManager.executable,
    lockfile: packageManager.lockfile.name, inputDigest: beforeDigest, commands: [] };
  const save = () => writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  await save();
  const env = safeEnvironment(environment, nativeDirectory);
  env.PATH = [join(candidatePath, 'node_modules', '.bin'), env.PATH].filter(Boolean).join(delimiter);
  const profile = sandboxProfile(candidatePath, nativeDirectory);
  try {
    for (const script of scripts) {
      const item = { script: script.name, requestedScript: script.requested,
        status: 'IN_PROGRESS', exitCode: null }; report.commands.push(item); await save();
      try {
        const scriptEnvironment = { ...env,
          npm_lifecycle_event: script.name,
          npm_lifecycle_script: script.body,
          npm_package_name: typeof pkg.name === 'string' ? pkg.name : '',
          npm_package_version: typeof pkg.version === 'string' ? pkg.version : '',
          npm_package_json: join(candidatePath, 'package.json'),
          npm_execpath: packageManager.executable,
          npm_node_execpath: process.execPath,
          npm_command: 'run-script',
          INIT_CWD: candidatePath,
        };
        const result = await run(sandboxCommand, ['-p', profile, '/bin/sh', '-c', script.body], {
          cwd: candidatePath, env: scriptEnvironment, timeoutMs: 600000 });
        item.exitCode = result?.exitCode;
        if (!Number.isInteger(item.exitCode)) throw Error('validation returned no concrete exit code');
        if (item.exitCode !== 0) throw Error(`exit ${item.exitCode}`);
        item.status = 'PASSED'; await save();
        if (await candidateSourceDigest(candidatePath) !== beforeDigest) throw fail('STAGE4_SOURCE_MUTATED', script.name);
      } catch (error) {
        item.status = 'FAILED'; item.error = error.message; await save();
        throw fail('STAGE4_HOST_VALIDATION_FAILED', `${script.name}: ${error.message}`);
      }
    }
    if (await candidateSourceDigest(candidatePath) !== beforeDigest) throw fail('STAGE4_SOURCE_MUTATED');
    const outputs = [];
    for (const name of outputDirectories) if (await existsDirectory(join(candidatePath, name)) &&
        (await treeFiles(join(candidatePath, name))).length > 0) outputs.push(name);
    if (!outputs.length) throw fail('STAGE4_BUILD_OUTPUT_MISSING');
    report.status = 'PASSED'; report.outputs = outputs; report.outputDigest = sha256(JSON.stringify(outputs));
    await save();
    return { status: 'PASSED', reportPath, reportSha256: sha256(await readFile(reportPath)),
      commands: report.commands.map(item => item.script), candidateDigest: await stage4SiteDigest(candidatePath) };
  } catch (error) {
    report.status = 'BLOCKED'; report.reason = error.message; await save(); throw error;
  }
}
