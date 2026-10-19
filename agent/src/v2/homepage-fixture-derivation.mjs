import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { inspectFaviconArchive } from './adapters/homepage-research.mjs';

const SOURCE_KEYS = Object.freeze(['manifest', 'report', 'icon', 'completion']);
const SOURCE_ROLES = Object.freeze({ manifest: 'RUN_MANIFEST', report: 'HOMEPAGE_REPORT',
  icon: 'ICON_ARCHIVE', completion: 'COMPLETION_REPORT' });
const sha256 = value => createHash('sha256').update(value).digest('hex');
const fail = (code, message) => { throw new ContractError(code, message); };
const isDigest = value => /^[a-f0-9]{64}$/.test(value ?? '');

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort())) {
    fail('CONTRACT_INVALID', `${label} has unsupported fields`);
  }
  return value;
}

function safeRelativePath(path) {
  return typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\') &&
    !path.includes('\0') && !path.split('/').some(part => !part || part === '.' || part === '..');
}

function normalizeSource(source) {
  exactObject(source, SOURCE_KEYS, 'Homepage fixture source map');
  return Object.freeze(Object.fromEntries(SOURCE_KEYS.map(key => {
    const item = exactObject(source[key], ['role', 'path', 'sha256'], `${key} source`);
    if (item.role !== SOURCE_ROLES[key] || !safeRelativePath(item.path) || !isDigest(item.sha256))
      fail('CONTRACT_INVALID', `${key} source identity is invalid`);
    return [key, Object.freeze({ role: item.role, path: item.path, sha256: item.sha256 })];
  })));
}

function checkedBytes(value, item, label) {
  if (!(Buffer.isBuffer(value) || value instanceof Uint8Array))
    fail('CONTRACT_INVALID', `${label} must contain bytes`);
  const bytes = Buffer.from(value);
  if (sha256(bytes) !== item.sha256)
    fail('CONTRACT_DIGEST_MISMATCH', `${label} source digest changed`);
  return bytes;
}

function researchDate(updatedAt) {
  const date = new Date(updatedAt);
  if (!Number.isFinite(date.getTime())) fail('CONTRACT_INVALID', 'Homepage checkpoint timestamp is invalid');
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric',
    month: '2-digit', day: '2-digit' }).format(date);
}

function reportFixture(runId, attempt, status, date, reportText) {
  return `# Wallpaper Engine homepage research — redacted contract fixture

- Source run: ${runId}
- Source stage: game-homepage-icon-research
- Source attempt: ${attempt}
- Source status: ${status}
- Research date: ${date} (Asia/Taipei)
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
}

function completionFixture(completionBytes) {
  const text = completionBytes.toString('utf8');
  const match = text.match(/\n(\{[\s\S]*?\n\})\n\n## Exact original English generation prompt/);
  if (!match) fail('CONTRACT_INVALID', 'Homepage completion report format changed');
  let completion;
  try { completion = JSON.parse(match[1]); }
  catch { fail('CONTRACT_INVALID', 'Homepage completion report JSON is invalid'); }
  return { status: completion.status, sourceFilesReverified: completion.sourceFilesReverified,
    screenshotsInspected: completion.screenshotsInspected, conversion: completion.conversion,
    zipSha256: completion.zipSha256, byteIdentical: completion.byteIdentical,
    zipMembers: completion.zipMembers, crc: completion.crc, pngDimensions: completion.pngDimensions,
    skillValidatorExitCode: completion.skillValidatorExitCode,
    researchSha256: completion.researchSha256, lineage: completion.lineage,
    localPaths: 'REDACTED', generationPrompt: 'OMITTED' };
}

export function deriveHomepageFixtureSnapshot({ source: rawSource, manifestBytes: rawManifest,
  reportBytes: rawReport, iconBytes: rawIcon, completionBytes: rawCompletion } = {}) {
  const source = normalizeSource(rawSource);
  const manifestBytes = checkedBytes(rawManifest, source.manifest, 'Manifest');
  const reportBytes = checkedBytes(rawReport, source.report, 'Homepage report');
  const iconBytes = checkedBytes(rawIcon, source.icon, 'Icon archive');
  const completionBytes = checkedBytes(rawCompletion, source.completion, 'Completion report');
  let run;
  try { run = JSON.parse(manifestBytes.toString('utf8')); }
  catch { fail('CONTRACT_INVALID', 'Homepage source manifest JSON is invalid'); }
  const stage = run.stages?.[0];
  if (typeof run.runId !== 'string' || !run.runId || stage?.skill !== 'game-homepage-icon-research' ||
      stage.status !== 'PASSED' || !Number.isSafeInteger(stage.checkpoint?.attempt) ||
      stage.checkpoint.attempt < 1 || !Array.isArray(stage.artifacts) || !Array.isArray(stage.history)) {
    fail('IDENTITY_MISMATCH', 'Homepage source manifest identity is invalid');
  }

  const report = reportFixture(run.runId, stage.checkpoint.attempt, stage.status,
    researchDate(stage.checkpoint.updatedAt), reportBytes.toString('utf8'));
  const completion = completionFixture(completionBytes);
  const lineage = { runId: run.runId, stage: stage.skill, status: stage.status,
    attempt: stage.checkpoint.attempt, inputDigest: stage.checkpoint.inputDigest,
    skillSha256: stage.history.at(-1)?.skillSha256,
    artifactKinds: stage.artifacts.map(item => item.kind),
    artifactSha256: stage.artifacts.map(item => item.sha256) };
  const derivedFiles = new Map([
    ['run-lineage.redacted.json', Buffer.from(`${JSON.stringify(lineage, null, 2)}\n`)],
    ['homepage-research.redacted.md', Buffer.from(report)],
    ['completion-report.redacted.json', Buffer.from(`${JSON.stringify(completion, null, 2)}\n`)],
  ]);
  const sourceItems = [
    { ...source.manifest, derivedPath: 'run-lineage.redacted.json', redaction: 'STRUCTURED_REDACTION' },
    { ...source.report, derivedPath: 'homepage-research.redacted.md', redaction: 'STRUCTURED_REDACTION' },
    { ...source.icon, redaction: 'METADATA_ONLY' },
    { ...source.completion, derivedPath: 'completion-report.redacted.json', redaction: 'STRUCTURED_REDACTION' },
  ].map(({ path, sha256: sourceSha256, ...item }) => ({ ...item, sourceRelativePath: path, sourceSha256,
    ...(item.derivedPath ? { derivedSha256: sha256(derivedFiles.get(item.derivedPath)) } : {}) }));
  const archive = inspectFaviconArchive(iconBytes);
  const fixtureManifest = { kind: 'HOMEPAGE_FIXTURE', schemaVersion: 1,
    producer: 'P5_D_FIXTURE_DERIVER', classification: 'REAL_FORMAT_REDACTED',
    derivationVersion: 'homepage-redaction-v1', sourceRunId: run.runId,
    sourceAttempt: stage.checkpoint.attempt, sourceStatus: stage.status,
    sourceIdentity: { namespace: 'p3-shadow-alias', value: 'stage-1', legacySkillName: stage.skill },
    canonicalStageId: 'homepage-research', mappingVersion: 'stage-identity-v1', licenseStatus: 'UNKNOWN',
    sources: sourceItems, iconArchive: { sourceRelativePath: source.icon.path,
      sourceSha256: source.icon.sha256, distribution: 'METADATA_ONLY',
      archiveBytes: archive.archiveBytes, members: archive.members } };
  return deepFreeze({ fixtureManifest, derivedFiles });
}
