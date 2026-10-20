import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { parseArtifactJson, readArtifact, safePath, sha256 } from './files.mjs';
import { inspectKeywordMaterial } from './contracts/adapters/keyword-skill-v1.mjs';
import { STAGE } from './stages.mjs';

export const RESEARCH_HANDOFF_KIND = 'RESEARCH_HANDOFF_MANIFEST_V1';
export const RESEARCH_HANDOFF_APPROVAL_KIND = 'RESEARCH_HANDOFF_APPROVAL_V1';
const RECOVERY_KIND = 'HOST_KEYWORD_RECOVERY_V1';
const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
const assert = (condition, detail) => { if (!condition) throw Error('RESEARCH_HANDOFF_INVALID: ' + detail); };
const jsonDigest = value => sha256(Buffer.from(JSON.stringify(value)));

function material(bytes, path, expectedKeyword, skillContractSha256) {
  let inspected;
  try { inspected = inspectKeywordMaterial(bytes, { sourcePath: path, skillContractSha256 }); }
  catch (error) { throw Error(`RESEARCH_HANDOFF_INVALID: material contract: ${path}: ${error.code ?? error.message}`); }
  assert(inspected.keyword === expectedKeyword, `material keyword mismatch: ${path}`);
  const details = new Map();
  for (const [classification, items] of [['UNRESOLVED', inspected.unresolvedGaps],
    ['UNCLASSIFIED', inspected.unclassifiedItems]]) {
    for (const item of items) {
      const detail = details.get(item.description) ?? { description: item.description, sources: [] };
      const source = { id: item.id, sourceSyntax: item.sourceSyntax, classification };
      if (!detail.sources.some(value => isDeepStrictEqual(value, source))) detail.sources.push(source);
      details.set(item.description, detail);
    }
  }
  const gapDetails = [...details.values()];
  const supportedInvalid = inspected.status === 'COMPLETED' && gapDetails.length > 0 &&
    inspected.diagnostics.length > 0 && inspected.diagnostics.every(value =>
      ['COMPLETED_HAS_UNRESOLVED_GAPS', 'PENDING_SEMANTICS_UNCLASSIFIED'].includes(value));
  assert(inspected.contractStatus === 'VALID' || supportedInvalid, `material incompatibility: ${path}`);
  assert(inspected.status === 'COMPLETED' || gapDetails.length > 0, `material gaps: ${path}`);
  const status = inspected.status === 'COMPLETED' && gapDetails.length > 0 ? 'PARTIAL' : inspected.status;
  const requiresSourceContract = inspected.contractStatus !== 'VALID' || status !== inspected.status ||
    gapDetails.some(detail => detail.sources.some(source => source.sourceSyntax !== 'legacy-v1'));
  return { status, gaps: gapDetails.map(detail => detail.description),
    ...(requiresSourceContract ? { sourceContract: { declaredStatus: inspected.status,
      contractStatus: inspected.contractStatus, diagnostics: inspected.diagnostics, gapDetails } } : {}) };
}

function disposition(status) {
  if (status === 'COMPLETED') return 'PUBLISH';
  if (status === 'PARTIAL') return 'DRAFT_ONLY';
  return 'OMIT';
}

function candidateMaterial(path, descriptor, skillContractSha256) {
  const keyword = basename(path).slice(0, -'素材.md'.length);
  const parsed = material(descriptor.content, path, keyword, skillContractSha256);
  return { keyword, path, sha256: descriptor.sha256, status: parsed.status, gaps: parsed.gaps,
    publicationDisposition: disposition(parsed.status),
    ...(parsed.sourceContract ? { sourceContract: parsed.sourceContract } : {}) };
}

async function recoveryData(recoveryRef, runDirectory) {
  const selectedFiles = recoveryRef?.selectedFiles ?? recoveryRef?.files;
  assert(recoveryRef && isAbsolute(recoveryRef.manifestPath ?? '') && digest(recoveryRef.sha256) &&
    Array.isArray(selectedFiles) && selectedFiles.length > 0 &&
    selectedFiles.every(path => typeof path === 'string') &&
    new Set(selectedFiles).size === selectedFiles.length, 'recovery reference');
  const recoveryRoot = join(runDirectory, 'keyword-recovery');
  assert(resolve(recoveryRef.manifestPath) === recoveryRef.manifestPath &&
    relative(recoveryRoot, recoveryRef.manifestPath).split('/').every(part => part && part !== '..'),
  'recovery path');
  const bytes = await readArtifact(recoveryRef.manifestPath, [recoveryRoot]);
  assert(sha256(bytes) === recoveryRef.sha256, 'recovery manifest digest');
  const manifest = parseArtifactJson(bytes, recoveryRef.manifestPath);
  assert(manifest.kind === RECOVERY_KIND && manifest.countsAsStageArtifact === false &&
    manifest.contentValidated === false && Array.isArray(manifest.files), 'recovery manifest');
  const directory = dirname(recoveryRef.manifestPath), allFiles = new Map();
  for (const descriptor of manifest.files) {
    assert(typeof descriptor.path === 'string' && digest(descriptor.sha256) && !allFiles.has(descriptor.path),
      'recovery file descriptor');
    const content = await readArtifact(join(directory, 'data', descriptor.path), [join(directory, 'data')]);
    assert(content.length === descriptor.bytes && sha256(content) === descriptor.sha256,
      `recovery file changed: ${descriptor.path}`);
    allFiles.set(descriptor.path, { ...descriptor, content });
  }
  assert(selectedFiles.every(path => allFiles.has(path)), 'recovery selected file');
  return { manifest, files: new Map(selectedFiles.map(path => [path, allFiles.get(path)])) };
}

const recoveryInventory = manifest => manifest.files.map(file => ({
  path: file.path, bytes: file.bytes, sha256: file.sha256,
}));

export async function createResearchHandoffCandidate({ runId, runDirectory, attempt, recoveryRef,
  siteRevision, domain }) {
  assert(/^[a-zA-Z0-9_-]{1,100}$/.test(runId ?? '') && basename(runDirectory) === runId &&
    Number.isSafeInteger(attempt) && attempt > 0 && typeof siteRevision === 'string' &&
    siteRevision.length > 0 && typeof domain === 'string' && domain.length > 0,
  'candidate binding');
  const { manifest: recovery, files } = await recoveryData(recoveryRef, runDirectory);
  assert(recovery.binding?.runId === runId && recovery.binding.stage === STAGE.KEYWORD_RESEARCH &&
    recovery.sourceAttempt === attempt, 'recovery attempt binding');
  const lineageFile = files.get('RAW_LINEAGE.json'), keywordsFile = files.get('keywords.json');
  assert(lineageFile && keywordsFile, 'lineage files');
  const lineage = parseArtifactJson(lineageFile.content, 'RAW_LINEAGE.json');
  const keywords = parseArtifactJson(keywordsFile.content, 'keywords.json');
  assert(Array.isArray(lineage.rows) && Array.isArray(lineage.pendingIds) &&
    Array.isArray(keywords.categories), 'lineage schema');
  const finalKeywords = keywords.categories.flatMap(category => Array.isArray(category?.keywords)
    ? category.keywords : []);
  assert(finalKeywords.length > 0 && new Set(finalKeywords).size === finalKeywords.length &&
    finalKeywords.every(keyword => typeof keyword === 'string' && keyword.length > 0), 'keyword set');
  const materialFiles = [...files.entries()].filter(([path]) => path.endsWith('素材.md') &&
    path !== '关键词素材汇总.md');
  assert(digest(recovery.binding?.skillSha256), 'recovery Skill digest');
  const materials = materialFiles.map(([path, descriptor]) =>
    candidateMaterial(path, descriptor, recovery.binding.skillSha256))
    .sort((a, b) => a.keyword.localeCompare(b.keyword));
  assert(materials.length === finalKeywords.length &&
    JSON.stringify(materials.map(item => item.keyword).sort()) === JSON.stringify([...finalKeywords].sort()),
  'every final keyword must have exactly one material');
  const rows = new Map(lineage.rows.map(row => [Number(row.id), row]));
  const pendingRows = lineage.pendingIds.map(id => {
    const row = rows.get(Number(id));
    assert(row && row.final === null && typeof row.raw === 'string' && row.raw.length > 0,
      `pending row ${id}`);
    return { row: Number(id), rawKeyword: row.raw };
  }).sort((a, b) => a.row - b.row);
  assert(new Set(pendingRows.map(row => row.row)).size === pendingRows.length, 'duplicate pending row');
  const candidate = {
    kind: RESEARCH_HANDOFF_KIND, runId, stage: STAGE.KEYWORD_RESEARCH, attempt,
    recovery: { manifestPath: recoveryRef.manifestPath, sha256: recoveryRef.sha256,
      sourceAttempt: recovery.sourceAttempt, selectedFiles: [...recoveryRef.files],
      inventory: recoveryInventory(recovery) },
    lineage: { rawLineageSha256: lineageFile.sha256, keywordsSha256: keywordsFile.sha256 },
    siteRevision, domain, pendingRows, materials,
    publicationPolicy: { COMPLETED: 'PUBLISH', PARTIAL: 'DRAFT_ONLY', BLOCKED: 'OMIT' },
    approval: null,
  };
  candidate.bindings = {
    materialStateSha256: jsonDigest(candidate.materials),
    pendingRowsSha256: jsonDigest(candidate.pendingRows),
    routePolicySha256: jsonDigest(candidate.publicationPolicy),
  };
  const bytes = Buffer.from(JSON.stringify(candidate, null, 2) + '\n');
  const directory = join(runDirectory, 'research-handoffs', String(attempt));
  const path = join(directory, 'candidate.json');
  await safePath(path, [runDirectory]); await mkdir(directory, { recursive: true, mode: 0o700 });
  try { await writeFile(path, bytes, { flag: 'wx', mode: 0o400 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    assert(sha256(await readArtifact(path, [runDirectory])) === sha256(bytes), 'candidate conflict');
  }
  return { kind: RESEARCH_HANDOFF_KIND, path, sha256: sha256(bytes), attempt,
    recoverySha256: recoveryRef.sha256, approved: false };
}

export async function verifyResearchHandoffCandidate(reference, { runId, runDirectory, attempt,
  siteRevision, domain }) {
  assert(reference?.kind === RESEARCH_HANDOFF_KIND && typeof reference.approved === 'boolean' &&
    reference.attempt === attempt && digest(reference.sha256) && isAbsolute(reference.path ?? ''),
  'candidate reference');
  const bytes = await readArtifact(reference.path, [join(runDirectory, 'research-handoffs')]);
  assert(sha256(bytes) === reference.sha256, 'candidate digest changed');
  const candidate = parseArtifactJson(bytes, reference.path);
  assert(candidate.kind === RESEARCH_HANDOFF_KIND && candidate.runId === runId &&
    candidate.stage === STAGE.KEYWORD_RESEARCH && candidate.attempt === attempt &&
    candidate.siteRevision === siteRevision && candidate.domain === domain && candidate.approval === null &&
    candidate.recovery?.sha256 === reference.recoverySha256 && Array.isArray(candidate.materials) &&
    Array.isArray(candidate.pendingRows) &&
    candidate.bindings?.materialStateSha256 === jsonDigest(candidate.materials) &&
    candidate.bindings?.pendingRowsSha256 === jsonDigest(candidate.pendingRows) &&
    candidate.bindings?.routePolicySha256 === jsonDigest(candidate.publicationPolicy),
  'candidate binding changed');
  const { manifest: recovery, files } = await recoveryData(candidate.recovery, runDirectory);
  assert(recovery.binding?.runId === runId && recovery.binding.stage === STAGE.KEYWORD_RESEARCH &&
    recovery.sourceAttempt === attempt && candidate.recovery.sourceAttempt === attempt &&
    isDeepStrictEqual(candidate.recovery.inventory, recoveryInventory(recovery)),
  'recovery binding changed');
  const lineageFile = files.get('RAW_LINEAGE.json'), keywordsFile = files.get('keywords.json');
  assert(lineageFile?.sha256 === candidate.lineage?.rawLineageSha256 &&
    keywordsFile?.sha256 === candidate.lineage?.keywordsSha256, 'recovery lineage changed');
  const currentMaterials = candidate.materials.map(item => {
    const descriptor = files.get(item.path);
    assert(descriptor?.sha256 === item.sha256, `recovery material changed: ${item.path}`);
    return candidateMaterial(item.path, descriptor, recovery.binding.skillSha256);
  });
  assert(isDeepStrictEqual(currentMaterials, candidate.materials), 'recovery material state changed');
  return candidate;
}

export function researchHandoffApprovalTemplate(reference, candidate) {
  assert(reference?.kind === RESEARCH_HANDOFF_KIND && digest(reference.sha256) &&
    candidate?.kind === RESEARCH_HANDOFF_KIND && candidate.runId && candidate.attempt === reference.attempt,
  'approval source');
  return {
    kind: RESEARCH_HANDOFF_APPROVAL_KIND,
    approved: true,
    handoffSha256: reference.sha256,
    runId: candidate.runId,
    stage: STAGE.KEYWORD_RESEARCH,
    attempt: candidate.attempt,
    recoverySha256: candidate.recovery.sha256,
    materialStateSha256: candidate.bindings.materialStateSha256,
    pendingRowsSha256: candidate.bindings.pendingRowsSha256,
    routePolicySha256: candidate.bindings.routePolicySha256,
    siteRevision: candidate.siteRevision,
    domain: candidate.domain,
  };
}

export function verifyResearchHandoffApproval(approval, reference, candidate) {
  const expected = researchHandoffApprovalTemplate(reference, candidate);
  assert(approval && isDeepStrictEqual(approval, expected),
    'approval must exactly match the immutable handoff');
  return jsonDigest(expected);
}
