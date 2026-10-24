import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { runProcess } from './process.mjs';
import { safePath, readArtifact, sha256 } from './files.mjs';
import { publishedRoutes, snapshotSiteEvidence, AUDIT_VIEWPORTS } from './site-evidence.mjs';
import { validateHostInteractions } from './stage5-audit-policy.mjs';

export async function collectSiteAudit(context, { url, run = runProcess } = {}) {
  const routes = await publishedRoutes(context);
  const directory = join(context.inputs.projectPath, 'docs/ui-ux-audit', context.runId);
  await safePath(directory, [context.inputs.projectPath]);
  await mkdir(directory, { recursive: true });
  let scriptExitCode = 0;
  try { await run(process.execPath, ['--import', fileURLToPath(new URL('./playwright-register.mjs', import.meta.url)),
    join(dirname(context.skillLock.source), 'scripts/game_site_audit.mjs'),
    '--url', url, '--game', context.inputs.gameIdentity, '--out', directory,
    ...routes.flatMap(route => ['--route', route])], { cwd: context.runDirectory, timeoutMs: Math.max(600000, routes.length * 450000) });
  } catch (error) {
    // The locked script uses 2 for a completed audit with BLOCKER/HIGH findings.
    if (error.exitCode !== 2) throw error;
    scriptExitCode = 2;
  }
  const automatedAuditPath = join(directory, 'AUTOMATED_AUDIT.json');
  const automated = JSON.parse(await readArtifact(automatedAuditPath, [directory]));
  if (JSON.stringify(automated.viewports?.map(viewport => viewport.width)) !== JSON.stringify(AUDIT_VIEWPORTS))
    throw Error(`SITE_AUDIT_VIEWPORTS_INVALID: ${automatedAuditPath}`);
  const interactionsPath = join(directory, 'HOST_UI_INTERACTIONS.json');
  await run(process.execPath, ['--import', fileURLToPath(new URL('./playwright-register.mjs', import.meta.url)),
    fileURLToPath(new URL('./site-audit-interactions.mjs', import.meta.url)),
    '--url', url, '--run-id', context.runId, '--output', interactionsPath,
    ...routes.flatMap(route => ['--route', route])],
  { cwd: context.runDirectory, timeoutMs: Math.max(180000, routes.length * 45000) });
  const interactionBytes = await readArtifact(interactionsPath, [directory]);
  const interactionsSha256 = sha256(interactionBytes);
  await validateHostInteractions(interactionsPath, interactionsSha256, context.runId);
  const bundle = await snapshotSiteEvidence(directory);
  return { ...bundle, routes, scriptExitCode, automatedAuditPath, screenshotsDirectory: join(directory, 'screenshots'),
    interactionsPath, interactionsSha256 };
}

async function atomicWrite(path, bytes, root) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await safePath(path, [root]); await safePath(temporary, [root]);
  await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 });
  await rename(temporary, path);
}

export async function publishSiteAuditReports(context, result, validate) {
  const root = join(context.inputs.projectPath, 'docs', 'ui-ux-audit');
  const directory = join(root, context.runId);
  const latest = join(root, 'LATEST');
  const backups = [];
  const originalPaths = result.artifacts.map(item => item.path);
  const readOptional = path => readArtifact(path, [context.inputs.projectPath]).then(bytes => ({ exists: true, bytes }),
    error => error.code === 'ENOENT' ? ({ exists: false, bytes: null }) : Promise.reject(error));
  try {
    for (const kind of context.requiredArtifacts) {
      const descriptor = result.artifacts.find(item => item.kind === kind);
      if (!descriptor || descriptor.path !== join(context.reportDirectory, kind))
        throw Error('Native report path mismatch: ' + kind);
      const bytes = await readArtifact(descriptor.path, [context.nativeDirectory]);
      const target = join(directory, kind);
      backups.push({ path: target, ...(await readOptional(target)) });
      await mkdir(directory, { recursive: true });
      await atomicWrite(target, bytes, context.inputs.projectPath);
      descriptor.path = target;
    }
    backups.push({ path: latest, ...(await readOptional(latest)) });
    await atomicWrite(latest, Buffer.from(context.runId), context.inputs.projectPath);
    return await validate(result);
  } catch (error) {
    for (const backup of backups.reverse()) {
      if (backup.exists) await atomicWrite(backup.path, backup.bytes, context.inputs.projectPath);
      else await rm(backup.path, { force: true });
    }
    result.artifacts.forEach((item, index) => { item.path = originalPaths[index]; });
    throw error;
  }
}
