import assert from 'node:assert/strict';
import { mkdtemp, realpath, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mergeTemplateCopy, templateCopyDirectory } from '../src/template-merge.mjs';
import { verifyTemplateSnapshot } from '../src/template-snapshot.mjs';
import { sha256 } from '../src/files.mjs';

const exec = promisify(execFile);
const checkout = resolve(process.argv[2] ?? ''), reportPath = process.argv[3];
if (!process.argv[2] || !reportPath) throw Error('Usage: node scripts/verify-direct-site.mjs SNAPSHOT_CHECKOUT REPORT_JSON');
const agent = dirname(dirname(fileURLToPath(import.meta.url)));
const commit = (await exec('git', ['rev-parse', 'HEAD'], { cwd: checkout })).stdout.trim();
const repository = (await exec('git', ['remote', 'get-url', 'origin'], { cwd: checkout })).stdout.trim();
assert.equal(repository, 'https://github.com/randyzer/-gamewiki_site_auto_generator_line.git');
const templateRoot = join(checkout, 'template');
await verifyTemplateSnapshot({ checkout, commit, templateRoot });
const root = await mkdtemp(join(await realpath(tmpdir()), 'verify-direct-site-'));
const runDirectory = join(root, 'agent/runs/verify'), siteDirectory = join(root, 'game_WallpaperEngine');
const researchDirectory = join(siteDirectory, 'backgroundinformation');
const rawKeywordsFile = join(researchDirectory, 'keyword-materials/关键词.md');
const source = templateCopyDirectory(runDirectory);
const report = { repository, commit, template: 'temp3_based_gamblewithyourfriends.net', temporaryRoot: root };
try {
  await mkdir(dirname(rawKeywordsFile), { recursive: true });
  await mkdir(dirname(source), { recursive: true });
  await writeFile(rawKeywordsFile, '# 测试关键词\n- Wallpaper Engine wallpaper guide\n');
  await writeFile(join(siteDirectory, '.DS_Store'), 'synthetic macOS metadata');
  report.keywordSha256Before = sha256(await readFile(rawKeywordsFile));
  const copyScript = join(agent, '../codex-skills/game-site-template-selector/scripts/copy_template.py');
  const args = [copyScript, '--template-root', templateRoot, '--source', report.template,
    '--destination', source, '--game', 'Wallpaper Engine', '--source-commit', commit];
  const dry = await exec('python3', [...args, '--dry-run']);
  const copied = await exec('python3', args);
  report.copyDryRun = JSON.parse(dry.stdout); report.copyOutput = JSON.parse(copied.stdout);
  // A substitute worker supplies only its template selection report and residue scan.
  await writeFile(join(source, 'docs/TEMPLATE_SELECTION_REPORT.md'), '# Offline temp3 selection verification\nNo game research was performed.\n');
  await writeFile(join(source, 'docs/TEMPLATE_RESIDUE_SCAN.json'), JSON.stringify({ findings: [], synthetic: true }));
  const manifestBefore = JSON.parse(await readFile(join(source, 'docs/template-copy-manifest.json')));
  report.merge = await mergeTemplateCopy({ runDirectory, inputs: { projectPath: siteDirectory,
    paths: { siteDirectory, researchDirectory, rawKeywordsFile } } });
  const manifest = JSON.parse(await readFile(join(siteDirectory, 'docs/template-copy-manifest.json')));
  assert.deepEqual(manifest, { ...manifestBefore, destination: siteDirectory });
  report.manifestDestination = manifest.destination;
  const output = join(root, 'preflight.json');
  let preflight;
  try {
    preflight = await exec('python3', [join(agent, '../codex-skills/game-site-content-integrator/scripts/preflight.py'),
      '--game', 'Wallpaper Engine', '--workspace', siteDirectory, '--template-root', templateRoot, '--output', output]);
    report.preflightExitCode = 0;
  } catch (error) {
    if (error.code !== 2) throw error;
    report.preflightExitCode = error.code; preflight = error;
  }
  report.preflight = JSON.parse(await readFile(output));
  report.preflightStdout = preflight.stdout;
  assert.ok(!report.preflight.errors.some(error => /template|manifest|package\.json|page root/i.test(error)));
  assert.equal(report.preflightExitCode, 2);
  report.templateManifestCheck = 'PASSED';
  report.expectedMissingResearch = true;
  report.keywordSha256After = sha256(await readFile(rawKeywordsFile));
  assert.equal(report.keywordSha256Before, report.keywordSha256After);
  assert.equal(await readFile(join(siteDirectory, '.DS_Store'), 'utf8'), 'synthetic macOS metadata');
  await verifyTemplateSnapshot({ checkout, commit, templateRoot });
} finally {
  await rm(root, { recursive: true, force: true }); report.temporaryRootRemoved = true;
  await writeFile(resolve(reportPath), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ ...report, merge: { status: report.merge.status, fileCount: report.merge.fileCount },
  preflight: { ready: report.preflight.ready, errors: report.preflight.errors } }, null, 2));
