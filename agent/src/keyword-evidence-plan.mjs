import { access } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { readArtifact, parseArtifactJson, sha256, treeFiles } from './files.mjs';
import { STAGE } from './stages.mjs';
import { keywordServiceStops, keywordServiceResumes } from './keyword-service-stops.mjs';

const KIND = 'KEYWORD_EVIDENCE_PLAN_V1';
const TOOLS = new Set(['serper', 'public-page', 'youtube-search', 'youtube-metadata',
  'youtube-subtitles', 'steam-community']);
const SERVICE_BY_TOOL = Object.freeze({
  'youtube-subtitles': 'youtube-subtitles',
  'steam-community': 'steam-community',
});
const DECISIONS = new Set(['PENDING', 'EXCLUDE', 'CREATE_PAGE', 'MERGE']);
const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
const assert = (ok, detail) => { if (!ok) throw Error('KEYWORD_EVIDENCE_PLAN_INVALID: ' + detail); };
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const text = (value, max = 1000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}

export function keywordEvidencePlanReference(value) {
  assert(exactKeys(value, ['path', 'sha256']) && isAbsolute(value.path ?? '') &&
    resolve(value.path) === value.path && digest(value.sha256), 'reference');
  return { path: value.path, sha256: value.sha256 };
}

function validatePlan(plan, context) {
  assert(exactKeys(plan, ['kind', 'runId', 'stage', 'recoverySha256', 'serviceStops',
    'serviceResumes', 'tasks', 'pendingRows']), 'top-level schema');
  assert(plan.kind === KIND && plan.runId === context.runId && plan.stage === STAGE.KEYWORD_RESEARCH,
    'run or stage binding');
  assert(digest(plan.recoverySha256) && plan.recoverySha256 === context.recoverySha256,
    'recovery snapshot binding');
  const stops = keywordServiceStops(plan.serviceStops);
  const resumes = keywordServiceResumes(plan.serviceResumes);
  assert(!stops.some(service => resumes.includes(service)), 'a service cannot be both suspended and resumed');
  assert(same(stops, keywordServiceStops(context.serviceStops)) &&
    same(resumes, keywordServiceResumes(context.serviceResumes)), 'service decision binding');
  assert(Array.isArray(plan.pendingRows) && plan.pendingRows.length <= 100, 'pending row list');
  const rows = new Map();
  for (const item of plan.pendingRows) {
    assert(exactKeys(item, ['row', 'rawKeyword', 'decision', 'targetKeyword']) &&
      Number.isSafeInteger(item.row) && item.row > 0 && item.row <= 100000 && !rows.has(item.row) &&
      text(item.rawKeyword, 500) && DECISIONS.has(item.decision), 'pending row decision');
    assert(item.decision === 'PENDING' || item.decision === 'EXCLUDE'
      ? item.targetKeyword === null : text(item.targetKeyword, 500), `target keyword for raw row ${item.row}`);
    rows.set(item.row, item.decision);
  }
  assert(Array.isArray(plan.tasks) && plan.tasks.length > 0 && plan.tasks.length <= 100,
    'at least one bounded evidence task is required');
  const signatures = new Set();
  for (const task of plan.tasks) {
    assert(exactKeys(task, ['keyword', 'rawRows', 'gap', 'tool', 'target', 'expectedEvidence']) &&
      text(task.keyword, 500) && text(task.gap, 2000) && TOOLS.has(task.tool) &&
      text(task.target, 4000) && text(task.expectedEvidence, 2000), 'evidence task schema');
    assert(Array.isArray(task.rawRows) && task.rawRows.length > 0 && task.rawRows.length <= 100 &&
      new Set(task.rawRows).size === task.rawRows.length &&
      task.rawRows.every(row => Number.isSafeInteger(row) && row > 0 && row <= 100000),
    `raw row lineage for ${task.keyword}`);
    for (const row of task.rawRows) assert(!['PENDING', 'EXCLUDE'].includes(rows.get(row)),
      `pending raw row ${row} cannot be scheduled`);
    if (['public-page', 'youtube-metadata', 'youtube-subtitles', 'steam-community'].includes(task.tool))
      assert(httpsUrl(task.target), `HTTPS target required for ${task.tool}`);
    const service = SERVICE_BY_TOOL[task.tool];
    assert(!service || !stops.includes(service) || resumes.includes(service),
      `service is suspended: ${service}`);
    assert(!stops.includes('steam-community') || resumes.includes('steam-community') ||
      !task.target.toLowerCase().includes('steamcommunity.com'),
    'suspended Steam Community cannot be targeted through another tool');
    const signature = JSON.stringify([task.keyword, task.rawRows, task.gap, task.tool, task.target]);
    assert(!signatures.has(signature), 'duplicate evidence task');
    signatures.add(signature);
  }
  return plan;
}

async function verifyRecoveryLineage(recovery, plan) {
  assert(recovery && typeof recovery.directory === 'string' && Array.isArray(recovery.files),
    'verified recovery lineage is required');
  const selected = new Set(recovery.files.map(file => file.path));
  for (const name of ['RAW_LINEAGE.json', 'keywords.json']) assert(selected.has(name),
    `recovery selection must include ${name}`);
  const readJson = async name => {
    const path = join(recovery.directory, 'data', name);
    return parseArtifactJson(await readArtifact(path, [recovery.directory]), path);
  };
  const [lineage, keywordData] = await Promise.all([readJson('RAW_LINEAGE.json'), readJson('keywords.json')]);
  assert(lineage && !Array.isArray(lineage) && Array.isArray(lineage.rows) &&
    Array.isArray(lineage.pendingIds), 'RAW_LINEAGE.json schema');
  assert(keywordData && Array.isArray(keywordData.categories), 'keywords.json schema');
  const keywords = keywordData.categories.flatMap(category => Array.isArray(category?.keywords)
    ? category.keywords : []);
  assert(keywords.length > 0 && keywords.every(keyword => text(keyword, 500)) &&
    new Set(keywords).size === keywords.length, 'approved keyword set');
  const approved = new Set(keywords), sourceRows = new Map();
  for (const row of lineage.rows) {
    const id = typeof row?.id === 'string' && /^\d+$/.test(row.id) ? Number(row.id) : row?.id;
    assert(Number.isSafeInteger(id) && id > 0 && id <= 100000 && !sourceRows.has(id) &&
      text(row.raw, 500) && (row.final === null || text(row.final, 500)), 'RAW_LINEAGE.json row');
    assert(row.final === null || approved.has(row.final), `unapproved final keyword for raw row ${id}`);
    sourceRows.set(id, { ...row, id });
  }
  const pendingIds = lineage.pendingIds.map(id => typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id);
  assert(new Set(pendingIds).size === pendingIds.length && pendingIds.every(id =>
    Number.isSafeInteger(id) && sourceRows.get(id)?.final === null), 'RAW_LINEAGE.json pending rows');
  assert(same(pendingIds, plan.pendingRows.map(item => item.row)),
    'plan must include every recovered pending row exactly once');
  const decisions = new Map();
  for (const item of plan.pendingRows) {
    const source = sourceRows.get(item.row);
    assert(source && source.raw === item.rawKeyword, `raw keyword mismatch for pending row ${item.row}`);
    if (item.decision === 'MERGE') assert(approved.has(item.targetKeyword),
      `MERGE target is not an approved keyword for raw row ${item.row}`);
    if (item.decision === 'CREATE_PAGE') assert(!approved.has(item.targetKeyword),
      `CREATE_PAGE target already exists for raw row ${item.row}`);
    decisions.set(item.row, item);
  }
  const approvedByDecision = new Set([...plan.pendingRows]
    .filter(item => ['MERGE', 'CREATE_PAGE'].includes(item.decision)).map(item => item.targetKeyword));
  for (const task of plan.tasks) {
    assert(approved.has(task.keyword) || approvedByDecision.has(task.keyword),
      `task keyword is not approved by recovery lineage: ${task.keyword}`);
    for (const rowId of task.rawRows) {
      const source = sourceRows.get(rowId);
      assert(source, `unknown raw row ${rowId}`);
      const decision = decisions.get(rowId);
      if (decision) assert(decision.targetKeyword === task.keyword,
        `pending raw row ${rowId} is not approved for ${task.keyword}`);
      else assert(source.final === task.keyword,
        `raw row ${rowId} does not belong to ${task.keyword}`);
    }
  }
}

export async function verifyKeywordEvidencePlan(context, reference) {
  reference = keywordEvidencePlanReference(reference);
  let bytes;
  try { bytes = await readArtifact(reference.path, [dirname(reference.path)]); }
  catch (error) { throw Error(`KEYWORD_EVIDENCE_PLAN_INVALID: ${error.message}`); }
  assert(bytes.length <= 256 * 1024 && sha256(bytes) === reference.sha256, 'plan digest changed');
  let plan;
  try { plan = parseArtifactJson(bytes, reference.path); }
  catch (error) { throw Error(`KEYWORD_EVIDENCE_PLAN_INVALID: ${error.message}`); }
  validatePlan(plan, context);
  await verifyRecoveryLineage(context.recovery, plan);
  return { path: reference.path, sha256: reference.sha256, plan: structuredClone(plan) };
}

export async function keywordEvidenceState(nativeDirectory) {
  const files = [];
  const evidenceDirectory = join(nativeDirectory, 'evidence');
  try { await access(evidenceDirectory); files.push(...await treeFiles(evidenceDirectory)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const blocker = join(nativeDirectory, 'SERVICE_BLOCKERS.json');
  try { await access(blocker); files.push(blocker); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const evidence = {};
  let serviceBlockerSha256 = null;
  for (const file of files) {
    const path = relative(nativeDirectory, file), fileSha256 = sha256(await readArtifact(file, [nativeDirectory]));
    if (path === 'SERVICE_BLOCKERS.json') serviceBlockerSha256 = fileSha256;
    else evidence[path] = fileSha256;
  }
  return { evidence, serviceBlockerSha256 };
}

export function keywordEvidenceChanges(before, after) {
  return {
    evidenceFiles: Object.keys(after.evidence)
      .filter(path => before.evidence[path] !== after.evidence[path]).sort(),
    serviceBlockerChanged: before.serviceBlockerSha256 !== after.serviceBlockerSha256,
  };
}
