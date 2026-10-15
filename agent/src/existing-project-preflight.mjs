import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { validateIntakeCard, intakeSummary } from './intake-card.mjs';
import { targetEntry, assertProjectIsolation } from './existing-project.mjs';
import { captureBaseline, verifyBaseline } from './project-baseline.mjs';
import { safePath } from './files.mjs';

const exec = promisify(execFile);
const tool = async (command, args) => {
  try { const result = await exec(command, args, { timeout: 15000 }); return { available: true, version: result.stdout.trim().slice(0,180) }; }
  catch { return { available: false }; }
};
export async function existingProjectPreflight(card, { allowlist, runDirectory, inspectTools = true } = {}) {
  card = validateIntakeCard(card); const entry = targetEntry(card.targetId, allowlist);
  await assertProjectIsolation(entry.path, { runDirectory });
  const baseline = await captureBaseline(entry, card.rawKeywordsFile);
  const packageFile = join(entry.path, 'package.json');
  await safePath(packageFile, [entry.path]);
  const pkg = JSON.parse(await readFile(packageFile, 'utf8'));
  let nodeVersion = ''; try { nodeVersion = (await readFile(join(entry.path, '.nvmrc'), 'utf8')).trim(); } catch {}
  let config = ''; try { config = await readFile(join(entry.path, 'game.config.ts'), 'utf8'); } catch {}
  const locks = baseline.files.filter(f => /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/.test(f.path));
  const tools = inspectTools ? { node: { available: true, version: process.version }, codex: await tool('codex', ['--version']),
    ytDlp: await tool('yt-dlp', ['--version']), browserCli: await tool('bsk', ['--version']),
    serperCredentialPresent: Boolean(process.env.SERPER_API_KEY) } : { checked: false };
  const blockers = [];
  if (baseline.repository !== card.repository) blockers.push('REPOSITORY_MISMATCH');
  if (!pkg.dependencies?.astro) blockers.push('EXISTING_FRAMEWORK_UNSUPPORTED');
  if (!pkg.scripts?.build || locks.length !== 1) blockers.push('BUILD_OR_LOCKFILE_AMBIGUOUS');
  if (!config.includes(card.canonicalOrigin)) blockers.push('SITE_ORIGIN_UNCONFIRMED');
  if (inspectTools && nodeVersion && process.version.slice(1) !== nodeVersion) blockers.push('NODE_VERSION_MISMATCH');
  if (inspectTools && (!tools.codex.available || !tools.ytDlp.available || !tools.browserCli.available || !tools.serperCredentialPresent)) blockers.push('RESEARCH_TOOL_UNAVAILABLE');
  let vercelLinked = false; try { await access(join(entry.path, '.vercel/project.json')); vercelLinked = true; } catch {}
  const report = { schemaVersion: 1, status: blockers.length ? 'BLOCKED' : 'PASSED', blockers, task: intakeSummary(card),
    sourceProjectPath: entry.path, baselineDigest: baseline.digest, head: baseline.head, branch: baseline.branch,
    repository: baseline.repository, staged: baseline.staged, modified: baseline.modified, untracked: baseline.untracked,
    keyword: baseline.keyword, framework: { name: 'Astro', version: pkg.dependencies?.astro ?? null },
    nodeRequired: nodeVersion || pkg.engines?.node || null, buildCommand: pkg.scripts?.build ?? null, lockfiles: locks.map(f => f.path),
    researchRootName: baseline.researchRootName, sourceFileCount: baseline.files.length, tools,
    deploymentProviderRequested: card.deploymentProvider, vercelLinked, remoteProviderAuthorizationVerified: false,
    sourceWrites: false, actualModelExecution: false, adExecuted: false };
  await verifyBaseline(baseline, entry);
  if (runDirectory) {
    await mkdir(runDirectory, { recursive: true });
    await writeFile(join(runDirectory, 'EXISTING_PROJECT_PREFLIGHT.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
    await writeFile(join(runDirectory, 'EXISTING_PROJECT_PREFLIGHT.md'), `# Existing project preflight\n\nStatus: ${report.status}\nTarget: ${card.targetId}\nSource writes: false\n\n` + report.blockers.map(b => '- ' + b).join('\n') + '\n', { mode: 0o600 });
  }
  return { report, baseline, entry };
}
