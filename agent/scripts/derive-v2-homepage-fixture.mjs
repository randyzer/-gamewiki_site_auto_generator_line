import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFaviconArchive } from '../src/v2/adapters/homepage-research.mjs';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
const outputRoot = join(repositoryRoot, 'agent/tests/fixtures/v2/homepage');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const source = Object.freeze({
  manifest: {
    role: 'RUN_MANIFEST',
    path: 'agent/runs/wallpaper-engine-002/manifest.json',
    sha256: '44aad1d5ed4746e8a71521e0943d48c97ba0060bc95ff767396a759c17dd3864',
  },
  report: {
    role: 'HOMEPAGE_REPORT',
    path: 'agent/runs/wallpaper-engine-002/artifacts/0/1/0-Wallpaper Engine攻略站首页调研信息.md',
    sha256: '14a8ad95d884a115a1559e4b7d6363ad7dbee5e1577c6f63a88f0080f1ef9a84',
  },
  icon: {
    role: 'ICON_ARCHIVE',
    path: 'agent/runs/wallpaper-engine-002/artifacts/0/1/1-Wallpaper Engine图标.zip',
    sha256: '7111d2d70efc4c1bd9fff1acfbc2fce9354039077ba8a0861eccee977373dfe9',
  },
  completion: {
    role: 'COMPLETION_REPORT',
    path: 'agent/runs/wallpaper-engine-002/artifacts/0/1/2-COMPLETION_REPORT.md',
    sha256: 'ac2daf6fe64eaec44188b606f048754adcd25d184399f0f12c25d9dc883e51c0',
  },
});

async function verifiedBytes(item) {
  const bytes = await readFile(join(repositoryRoot, item.path));
  const actual = sha256(bytes);
  if (actual !== item.sha256) throw Error(`HOMEPAGE_FIXTURE_SOURCE_DRIFT: ${item.path} ${actual}`);
  return bytes;
}

const [manifestBytes, reportBytes, iconBytes, completionBytes] = await Promise.all([
  verifiedBytes(source.manifest), verifiedBytes(source.report), verifiedBytes(source.icon),
  verifiedBytes(source.completion),
]);
const run = JSON.parse(manifestBytes.toString('utf8'));
const stage = run.stages?.[0];
if (run.runId !== 'wallpaper-engine-002' || stage?.skill !== 'game-homepage-icon-research' ||
    stage.status !== 'PASSED' || stage.checkpoint?.attempt !== 1) {
  throw Error('HOMEPAGE_FIXTURE_IDENTITY_MISMATCH');
}
const reportText = reportBytes.toString('utf8');
const reportFixture = `# Wallpaper Engine homepage research — redacted contract fixture

- Source run: wallpaper-engine-002
- Source stage: game-homepage-icon-research
- Source attempt: 1
- Source status: PASSED
- Research date: 2026-10-16 (Asia/Taipei)
- Scope: English Steam guide website; audit-only research

## Preserved contract markers

- Identity and first-party-source section: ${reportText.includes('## 1. Identity, verified sources and facts')}
- Homepage JSON section: ${reportText.includes('## 2. Homepage JSON')}
- SEO self-check section: ${reportText.includes('## 3. Codes and SEO self-check')}
- Theme section: ${reportText.includes('## 4. Theme colors')}
- Localization section: ${reportText.includes('## 5. Localization')}
- Implementation boundary section: ${reportText.includes('## 6. Implementation and deployment boundaries')}
- Icon lineage section: ${reportText.includes('## 7. Icon lineage and pending conversion')}
- Market conclusion withheld without first-party samples: ${reportText.includes('站内数据未取得')}
- Direct video URL intentionally unverified: ${reportText.includes('no direct video URL')}

## Redaction

URLs, webpage prose, local absolute paths, generation prompts and volatile metrics are omitted. This file preserves only the structure needed to replay the homepage adapter contract.
`;
const completionText = completionBytes.toString('utf8');
const completionMatch = completionText.match(/\n(\{[\s\S]*?\n\})\n\n## Exact original English generation prompt/);
if (!completionMatch) throw Error('HOMEPAGE_FIXTURE_COMPLETION_FORMAT_CHANGED');
const completion = JSON.parse(completionMatch[1]);
const completionFixture = {
  status: completion.status,
  sourceFilesReverified: completion.sourceFilesReverified,
  screenshotsInspected: completion.screenshotsInspected,
  conversion: completion.conversion,
  zipSha256: completion.zipSha256,
  byteIdentical: completion.byteIdentical,
  zipMembers: completion.zipMembers,
  crc: completion.crc,
  pngDimensions: completion.pngDimensions,
  skillValidatorExitCode: completion.skillValidatorExitCode,
  researchSha256: completion.researchSha256,
  lineage: completion.lineage,
  localPaths: 'REDACTED',
  generationPrompt: 'OMITTED',
};
const lineageFixture = {
  runId: run.runId,
  stage: stage.skill,
  status: stage.status,
  attempt: stage.checkpoint.attempt,
  inputDigest: stage.checkpoint.inputDigest,
  skillSha256: stage.history.at(-1)?.skillSha256,
  artifactKinds: stage.artifacts.map(item => item.kind),
  artifactSha256: stage.artifacts.map(item => item.sha256),
};
const derived = [
  ['run-lineage.redacted.json', Buffer.from(`${JSON.stringify(lineageFixture, null, 2)}\n`)],
  ['homepage-research.redacted.md', Buffer.from(reportFixture)],
  ['completion-report.redacted.json', Buffer.from(`${JSON.stringify(completionFixture, null, 2)}\n`)],
];
await mkdir(outputRoot, { recursive: true });
for (const [path, bytes] of derived) await writeFile(join(outputRoot, path), bytes);
const derivedByName = new Map(derived);
const archive = inspectFaviconArchive(iconBytes);
const sources = [
  { ...source.manifest, derivedPath: 'run-lineage.redacted.json', redaction: 'STRUCTURED_REDACTION' },
  { ...source.report, derivedPath: 'homepage-research.redacted.md', redaction: 'STRUCTURED_REDACTION' },
  { ...source.icon, redaction: 'METADATA_ONLY' },
  { ...source.completion, derivedPath: 'completion-report.redacted.json', redaction: 'STRUCTURED_REDACTION' },
].map(({ path, sha256: sourceSha256, ...item }) => ({ ...item, sourceRelativePath: path, sourceSha256,
  ...(item.derivedPath ? { derivedSha256: sha256(derivedByName.get(item.derivedPath)) } : {}) }));
const fixtureManifest = {
  kind: 'HOMEPAGE_FIXTURE', schemaVersion: 1, producer: 'P5_D_FIXTURE_DERIVER',
  classification: 'REAL_FORMAT_REDACTED', derivationVersion: 'homepage-redaction-v1',
  sourceRunId: run.runId, sourceAttempt: stage.checkpoint.attempt, sourceStatus: stage.status,
  sourceIdentity: { namespace: 'p3-shadow-alias', value: 'stage-1', legacySkillName: stage.skill },
  canonicalStageId: 'homepage-research', mappingVersion: 'stage-identity-v1', licenseStatus: 'UNKNOWN',
  sources,
  iconArchive: { sourceRelativePath: source.icon.path, sourceSha256: source.icon.sha256,
    distribution: 'METADATA_ONLY', archiveBytes: archive.archiveBytes, members: archive.members },
};
await writeFile(join(outputRoot, 'fixture-manifest.json'), `${JSON.stringify(fixtureManifest, null, 2)}\n`);
console.log(JSON.stringify({ outputRoot, sources: sources.length, members: archive.members.length }));
