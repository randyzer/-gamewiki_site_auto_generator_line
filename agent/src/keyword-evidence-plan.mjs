import { access } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { readArtifact, parseArtifactJson, sha256, treeFiles } from './files.mjs';
import { STAGE } from './stages.mjs';
import { keywordServiceStops, keywordServiceResumes } from './keyword-service-stops.mjs';

const KIND = 'KEYWORD_EVIDENCE_PLAN_V2';
const CLAIMS_KIND = 'KEYWORD_EVIDENCE_CLAIMS_V2';
const OUTCOME_KIND = 'HOST_KEYWORD_EVIDENCE_OUTCOME_V2';
export const KEYWORD_EVIDENCE_CLAIMS_FILE = 'KEYWORD_EVIDENCE_CLAIMS_V2.json';
export const KEYWORD_EVIDENCE_OUTCOME_FILE = 'KEYWORD_EVIDENCE_OUTCOME_V2.json';
const TOOLS = new Set(['serper', 'public-page', 'youtube-search', 'youtube-metadata',
  'youtube-subtitles', 'steam-community']);
const MATERIAL_STATUSES = new Set(['COMPLETED', 'PARTIAL', 'BLOCKED']);
const SOURCE_TYPES = new Set(['FIRST_PARTY', 'PLATFORM_FIRST_PARTY', 'PRIMARY_PROJECT']);
const FALLBACKS = new Set(['KEEP_PARTIAL', 'KEEP_BLOCKED', 'WAIT_FOR_USER']);
const ACCESS_RESULTS = new Set(['HTTP_200', 'TOOL_SUCCESS']);
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
  assert(plan.kind === KIND, `plan kind must be ${KIND}`);
  assert(plan.runId === context.runId && plan.stage === STAGE.KEYWORD_RESEARCH,
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
    assert(exactKeys(task, ['keyword', 'rawRows', 'gap', 'tool', 'target', 'expectedEvidence',
      'acceptanceCriteria', 'stopConditions', 'sourceRequirements', 'fallbackDisposition',
      'expectedStatusTransition']) &&
      text(task.keyword, 500) && text(task.gap, 2000) && TOOLS.has(task.tool) &&
      text(task.target, 4000) && text(task.expectedEvidence, 2000), 'evidence task schema');
    assert(Array.isArray(task.acceptanceCriteria) && task.acceptanceCriteria.length > 0 &&
      task.acceptanceCriteria.length <= 20 && new Set(task.acceptanceCriteria).size === task.acceptanceCriteria.length &&
      task.acceptanceCriteria.every(item => text(item, 1000)), `acceptance criteria for ${task.keyword}`);
    assert(Array.isArray(task.stopConditions) && task.stopConditions.length > 0 &&
      task.stopConditions.length <= 20 && new Set(task.stopConditions).size === task.stopConditions.length &&
      task.stopConditions.every(item => /^[A-Z][A-Z0-9_]{2,63}$/.test(item)),
    `stop conditions for ${task.keyword}`);
    assert(exactKeys(task.sourceRequirements, ['allowedSourceTypes', 'requiresBody', 'requiresCurrentAccess']) &&
      Array.isArray(task.sourceRequirements.allowedSourceTypes) &&
      task.sourceRequirements.allowedSourceTypes.length > 0 &&
      new Set(task.sourceRequirements.allowedSourceTypes).size === task.sourceRequirements.allowedSourceTypes.length &&
      task.sourceRequirements.allowedSourceTypes.every(item => SOURCE_TYPES.has(item)) &&
      typeof task.sourceRequirements.requiresBody === 'boolean' &&
      typeof task.sourceRequirements.requiresCurrentAccess === 'boolean',
    `source requirements for ${task.keyword}`);
    assert(FALLBACKS.has(task.fallbackDisposition), `fallback disposition for ${task.keyword}`);
    assert(exactKeys(task.expectedStatusTransition, ['from', 'to']) &&
      MATERIAL_STATUSES.has(task.expectedStatusTransition.from) &&
      MATERIAL_STATUSES.has(task.expectedStatusTransition.to) &&
      !(task.expectedStatusTransition.from === 'COMPLETED' && task.expectedStatusTransition.to !== 'COMPLETED'),
    `status transition for ${task.keyword}`);
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

export function keywordEvidencePlanStrategySha256(plan) {
  return sha256(Buffer.from(JSON.stringify({
    serviceStops: plan.serviceStops,
    serviceResumes: plan.serviceResumes,
    tasks: plan.tasks,
    pendingRows: plan.pendingRows,
  })));
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
    const materialName = task.keyword.replace(/[\\/:*?"<>|\x00]/g, '-') + '素材.md';
    assert(selected.has(materialName), `recovery selection must include ${materialName}`);
    const material = materialRecord(await readArtifact(join(recovery.directory, 'data', materialName),
      [recovery.directory]), materialName);
    assert(material.status === task.expectedStatusTransition.from,
      `expected starting material status for ${task.keyword}`);
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
  const prior = context.recovery.files.find(file => file.path === KEYWORD_EVIDENCE_OUTCOME_FILE);
  if (prior) {
    const priorPath = join(context.recovery.directory, 'data', prior.path);
    const outcome = parseArtifactJson(await readArtifact(priorPath, [context.recovery.directory]), priorPath);
    assert(outcome && outcome.kind === OUTCOME_KIND && outcome.runId === context.runId &&
      outcome.stage === STAGE.KEYWORD_RESEARCH && digest(outcome.planSha256) &&
      digest(outcome.planStrategySha256) && digest(outcome.gapStateSha256) &&
      Array.isArray(outcome.serviceStops) && Array.isArray(outcome.serviceResumes), 'prior host outcome');
    const state = await keywordEvidenceState(join(context.recovery.directory, 'data'));
    if (outcome.classification === 'PLAN_EXHAUSTED' &&
        outcome.planStrategySha256 === keywordEvidencePlanStrategySha256(plan) &&
        outcome.gapStateSha256 === state.gapStateSha256 &&
        same(outcome.serviceStops, plan.serviceStops) && same(outcome.serviceResumes, plan.serviceResumes))
      throw Error('KEYWORD_EVIDENCE_PLAN_EXHAUSTED: unchanged gaps, services and task strategy require a newly reviewed plan');
  }
  return { path: reference.path, sha256: reference.sha256, plan: structuredClone(plan) };
}

function materialRecord(bytes, path) {
  const body = bytes.toString('utf8');
  const status = body.match(/^- 状态:\s*(COMPLETED|PARTIAL|BLOCKED)\s*$/m)?.[1] ?? null;
  const gaps = [...body.matchAll(/^- 缺口(?:\s*\d*)?:\s*(.+?)\s*$/gm)].map(match => match[1]);
  return { path, sha256: sha256(bytes), status, gaps };
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
  const materials = {};
  let serviceBlockerSha256 = null;
  for (const file of files) {
    const path = relative(nativeDirectory, file), fileSha256 = sha256(await readArtifact(file, [nativeDirectory]));
    if (path === 'SERVICE_BLOCKERS.json') serviceBlockerSha256 = fileSha256;
    else evidence[path] = fileSha256;
  }
  for (const file of await treeFiles(nativeDirectory)) {
    const path = relative(nativeDirectory, file), name = basename(path);
    if (!name.endsWith('素材.md') || name === '关键词素材汇总.md') continue;
    const keyword = name.slice(0, -'素材.md'.length);
    materials[keyword] = materialRecord(await readArtifact(file, [nativeDirectory]), path);
  }
  const gapStateSha256 = sha256(Buffer.from(JSON.stringify(Object.entries(materials).sort(([a], [b]) =>
    a.localeCompare(b)).map(([keyword, value]) => [keyword, value.status, value.gaps]))));
  return { evidence, materials, serviceBlockerSha256, gapStateSha256 };
}

export function keywordEvidenceChanges(before, after) {
  return {
    evidenceFiles: Object.keys(after.evidence)
      .filter(path => before.evidence[path] !== after.evidence[path]).sort(),
    serviceBlockerChanged: before.serviceBlockerSha256 !== after.serviceBlockerSha256,
  };
}

function claimIndex(claims, plan, planSha256) {
  if (!claims) return new Map();
  assert(exactKeys(claims, ['kind', 'runId', 'stage', 'recoverySha256', 'planSha256', 'tasks']) &&
    claims.kind === CLAIMS_KIND && claims.runId === plan.runId && claims.stage === plan.stage &&
    claims.recoverySha256 === plan.recoverySha256 && claims.planSha256 === planSha256 &&
    Array.isArray(claims.tasks) && claims.tasks.length === plan.tasks.length,
  'worker evidence claims binding');
  const result = new Map();
  for (const claim of claims.tasks) {
    assert(exactKeys(claim, ['keyword', 'gap', 'attemptedOperation', 'evidence', 'materialPath',
      'materialSha256', 'finalStatus', 'remainingGaps', 'stopCondition']) && text(claim.keyword, 500) &&
      text(claim.gap, 2000) && text(claim.attemptedOperation, 2000) && Array.isArray(claim.evidence) &&
      typeof claim.materialPath === 'string' && digest(claim.materialSha256) &&
      MATERIAL_STATUSES.has(claim.finalStatus) && Array.isArray(claim.remainingGaps) &&
      claim.remainingGaps.every(item => text(item, 2000)) &&
      (claim.stopCondition === null || /^[A-Z][A-Z0-9_]{2,63}$/.test(claim.stopCondition)) &&
      !result.has(JSON.stringify([claim.keyword, claim.gap])), 'worker evidence claim schema');
    result.set(JSON.stringify([claim.keyword, claim.gap]), claim);
  }
  for (const task of plan.tasks) {
    const claim = result.get(JSON.stringify([task.keyword, task.gap]));
    assert(claim && claim.gap === task.gap, `worker claim does not match task ${task.keyword}`);
  }
  return result;
}

function hostObservationIndex(observations, plan) {
  assert(Array.isArray(observations), 'host observations must be an array');
  const tasks = new Set(plan.tasks.map(task => JSON.stringify([task.keyword, task.gap])));
  const sources = new Map(), stops = new Map();
  for (const observation of observations) {
    const taskKey = JSON.stringify([observation?.keyword, observation?.gap]);
    assert(tasks.has(taskKey), 'host observation does not match an approved task');
    if (observation.kind === 'HOST_SOURCE_ACCESS_V1') {
      assert(exactKeys(observation, ['kind', 'keyword', 'gap', 'path', 'url', 'sha256',
        'accessResult', 'sourceType', 'supportedFacts']) &&
        typeof observation.path === 'string' && httpsUrl(observation.url) &&
        digest(observation.sha256) && ACCESS_RESULTS.has(observation.accessResult) &&
        SOURCE_TYPES.has(observation.sourceType) && Array.isArray(observation.supportedFacts) &&
        observation.supportedFacts.length > 0 && observation.supportedFacts.every(item => text(item, 1000)),
      'host source observation schema');
      const key = JSON.stringify([taskKey, observation.path]);
      assert(!sources.has(key), 'duplicate host source observation');
      sources.set(key, observation);
    } else {
      assert(exactKeys(observation, ['kind', 'keyword', 'gap', 'attemptedOperation', 'target',
        'stopCondition']) && observation.kind === 'HOST_STOP_OBSERVATION_V1' &&
        text(observation.attemptedOperation, 2000) && text(observation.target, 4000) &&
        /^[A-Z][A-Z0-9_]{2,63}$/.test(observation.stopCondition),
      'host stop observation schema');
      assert(!stops.has(taskKey), 'duplicate host stop observation');
      stops.set(taskKey, observation);
    }
  }
  return { sources, stops };
}

function sameSourceObservation(descriptor, observation) {
  return observation && ['path', 'url', 'sha256', 'accessResult', 'sourceType'].every(key =>
    observation[key] === descriptor[key]) &&
    JSON.stringify(observation.supportedFacts) === JSON.stringify(descriptor.supportedFacts);
}

async function verifyClaimEvidence(task, claim, before, after, nativeDirectory, hostSources) {
  const valid = [], reasons = [];
  for (const descriptor of claim.evidence) {
    if (!exactKeys(descriptor, ['path', 'url', 'sha256', 'accessResult', 'sourceType', 'supportedFacts']) ||
        typeof descriptor.path !== 'string' || !descriptor.path.startsWith('evidence/') ||
        isAbsolute(descriptor.path) || descriptor.path.split('/').some(part => !part || part === '.' || part === '..') ||
        !httpsUrl(descriptor.url) || !digest(descriptor.sha256) || !ACCESS_RESULTS.has(descriptor.accessResult) ||
        !task.sourceRequirements.allowedSourceTypes.includes(descriptor.sourceType) ||
        !Array.isArray(descriptor.supportedFacts) || descriptor.supportedFacts.length === 0 ||
        !descriptor.supportedFacts.every(fact => task.acceptanceCriteria.includes(fact))) {
      reasons.push('evidence descriptor does not satisfy the approved source contract'); continue;
    }
    const taskKey = JSON.stringify([task.keyword, task.gap]);
    const hostObservation = hostSources.get(JSON.stringify([taskKey, descriptor.path]));
    if (!sameSourceObservation(descriptor, hostObservation)) {
      reasons.push(`evidence has no matching trusted host access observation: ${descriptor.path}`); continue;
    }
    if (after.evidence[descriptor.path] !== descriptor.sha256 ||
        before.evidence[descriptor.path] === after.evidence[descriptor.path]) {
      reasons.push(`evidence file is absent, unchanged or has the wrong hash: ${descriptor.path}`); continue;
    }
    let body;
    try { body = (await readArtifact(join(nativeDirectory, descriptor.path), [nativeDirectory])).toString('utf8'); }
    catch { reasons.push(`evidence file cannot be read: ${descriptor.path}`); continue; }
    if (![descriptor.url, descriptor.accessResult, ...descriptor.supportedFacts].every(value => body.includes(value))) {
      reasons.push(`evidence file does not contain its URL, access result and supported facts: ${descriptor.path}`);
      continue;
    }
    valid.push(descriptor);
  }
  return { valid, reasons };
}

function fallbackSatisfied(task, previous, current) {
  if (!current) return false;
  if (task.fallbackDisposition === 'KEEP_PARTIAL') return current.status === 'PARTIAL';
  if (task.fallbackDisposition === 'KEEP_BLOCKED') return current.status === 'BLOCKED';
  return current.status === previous?.status;
}

export async function assessKeywordEvidenceOutcome({ plan, planSha256, before, after,
  nativeDirectory, claims, hostObservations = [] }) {
  assert(plan?.kind === KIND && digest(planSha256), 'host outcome plan binding');
  const changes = keywordEvidenceChanges(before, after), claimsByTask = claimIndex(claims, plan, planSha256);
  const observations = hostObservationIndex(hostObservations, plan), assessments = [];
  for (const task of plan.tasks) {
    const claim = claimsByTask.get(JSON.stringify([task.keyword, task.gap])), previous = before.materials[task.keyword],
      current = after.materials[task.keyword];
    if (!claim) {
      assessments.push({ task, claim, previous, current, evidence: { valid: [], reasons: [] },
        allCriteria: false, materialValid: false, missingClaim: true });
      continue;
    }
    const materialValid = current && claim.materialPath === current.path &&
      claim.materialSha256 === current.sha256 && claim.finalStatus === current.status &&
      JSON.stringify(claim.remainingGaps) === JSON.stringify(current.gaps);
    const evidence = await verifyClaimEvidence(task, claim, before, after, nativeDirectory,
      observations.sources);
    const supported = new Set(evidence.valid.flatMap(item => item.supportedFacts));
    const allCriteria = task.acceptanceCriteria.every(item => supported.has(item));
    assessments.push({ task, claim, previous, current, evidence, allCriteria, materialValid,
      missingClaim: false });
  }
  const verifiedGaps = new Map();
  for (const item of assessments) if (item.allCriteria) {
    if (!verifiedGaps.has(item.task.keyword)) verifiedGaps.set(item.task.keyword, new Set());
    verifiedGaps.get(item.task.keyword).add(item.task.gap);
  }
  const tasks = [];
  for (const item of assessments) {
    const { task, claim, previous, current, evidence, allCriteria, materialValid } = item;
    if (item.missingClaim) {
      tasks.push({ keyword: task.keyword, gap: task.gap, classification: 'NO_PROGRESS',
        reason: 'No bound worker evidence claim was returned.' });
      continue;
    }
    const materialChanged = Boolean(previous && current && previous.sha256 !== current.sha256);
    const statusChanged = Boolean(previous && current && previous.status !== current.status);
    const approvedRemovals = verifiedGaps.get(task.keyword) ?? new Set();
    const removedGaps = previous?.gaps.filter(gap => !current?.gaps.includes(gap)) ?? [];
    const unapprovedRemovals = removedGaps.filter(gap => !approvedRemovals.has(gap));
    const completionValid = current?.status !== 'COMPLETED' ||
      (current.gaps.length === 0 && previous.gaps.every(gap => approvedRemovals.has(gap)));
    const stop = observations.stops.get(JSON.stringify([task.keyword, task.gap]));
    const trustedStop = stop && claim.stopCondition === stop.stopCondition &&
      claim.attemptedOperation === stop.attemptedOperation && task.target === stop.target &&
      task.stopConditions.includes(stop.stopCondition);
    let classification = 'NO_PROGRESS', reason = evidence.reasons.join('; ');
    if (materialValid && materialChanged && previous?.status === task.expectedStatusTransition.from && allCriteria &&
        current.status === task.expectedStatusTransition.to && !current.gaps.includes(task.gap) &&
        unapprovedRemovals.length === 0 && completionValid) {
      classification = 'GAP_RESOLVED'; reason = 'All acceptance criteria have changed evidence and the bound material transition.';
    } else if (unapprovedRemovals.length > 0) {
      reason = [reason, `Material contains unapproved gap removal: ${unapprovedRemovals.join('; ')}`]
        .filter(Boolean).join('; ');
    } else if (materialValid && statusChanged && (allCriteria || trustedStop) && completionValid) {
      classification = 'STATUS_CHANGED';
      reason = reason || 'The material status changed, but the approved gap was not independently resolved.';
    } else if (evidence.valid.length > 0) {
      classification = 'NEW_VERIFIED_EVIDENCE'; reason = 'Changed evidence bytes satisfy the approved source descriptors.';
    } else if (trustedStop && materialValid &&
        fallbackSatisfied(task, previous, current)) {
      classification = 'PLAN_EXHAUSTED'; reason = `Approved stop condition reached: ${claim.stopCondition}`;
    } else if (claim.stopCondition && !trustedStop) {
      reason ||= `Stop condition has no matching trusted host observation: ${claim.stopCondition}`;
    } else reason ||= 'No changed evidence or verified material transition closed the approved gap.';
    tasks.push({ keyword: task.keyword, gap: task.gap, classification, reason });
  }
  const classifications = new Set(tasks.map(task => task.classification));
  let classification = 'NO_PROGRESS';
  if (classifications.has('GAP_RESOLVED')) classification = 'GAP_RESOLVED';
  else if (classifications.has('STATUS_CHANGED')) classification = 'STATUS_CHANGED';
  else if (classifications.has('NEW_VERIFIED_EVIDENCE')) classification = 'NEW_VERIFIED_EVIDENCE';
  else if (tasks.length && tasks.every(task => task.classification === 'PLAN_EXHAUSTED')) classification = 'PLAN_EXHAUSTED';
  else if (changes.evidenceFiles.length > 0) classification = 'NEW_FILES';
  return {
    kind: OUTCOME_KIND, runId: plan.runId, stage: plan.stage, recoverySha256: plan.recoverySha256,
    planSha256, planStrategySha256: keywordEvidencePlanStrategySha256(plan),
    gapStateSha256: after.gapStateSha256, serviceStops: [...plan.serviceStops],
    serviceResumes: [...plan.serviceResumes], classification, tasks,
    evidenceFiles: changes.evidenceFiles, serviceBlockerChanged: changes.serviceBlockerChanged,
    hostObservationCount: hostObservations.length,
  };
}
