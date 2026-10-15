import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { runProcess } from './process.mjs';
import { safePath, readArtifact } from './files.mjs';
import { publishedRoutes, snapshotSiteEvidence, AUDIT_VIEWPORTS } from './site-evidence.mjs';

export async function collectSiteAudit(context, { url, run = runProcess } = {}) {
  const routes = await publishedRoutes(context);
  const directory = join(context.inputs.projectPath, 'docs/ui-ux-audit', context.runId);
  await safePath(directory, [context.inputs.projectPath]);
  await mkdir(directory, { recursive: true });
  await run(process.execPath, ['--import', fileURLToPath(new URL('./playwright-register.mjs', import.meta.url)),
    join(dirname(context.skillLock.source), 'scripts/game_site_audit.mjs'),
    '--url', url, '--game', context.inputs.gameIdentity, '--out', directory,
    ...routes.flatMap(route => ['--route', route])], { cwd: context.runDirectory, timeoutMs: Math.max(600000, routes.length * 450000) });
  const automatedAuditPath = join(directory, 'AUTOMATED_AUDIT.json');
  const automated = JSON.parse(await readArtifact(automatedAuditPath, [directory]));
  if (JSON.stringify(automated.viewports?.map(viewport => viewport.width)) !== JSON.stringify(AUDIT_VIEWPORTS))
    throw Error(`SITE_AUDIT_VIEWPORTS_INVALID: ${automatedAuditPath}`);
  const bundle = await snapshotSiteEvidence(directory);
  return { ...bundle, routes, automatedAuditPath, screenshotsDirectory: join(directory, 'screenshots') };
}
