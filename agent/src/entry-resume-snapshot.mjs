import { readFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { safePath, sha256, treeFiles, inside } from './files.mjs';
import { STAGES } from './stages.mjs';
import { STAGE, INPUT_STAGE, stageIndex } from './stages.mjs';
import { validateEntryInputs } from './entry-v1.mjs';

export async function currentApprovedInputRecord(directory) {
  const originalPath = join(directory, 'APPROVED_INPUTS.json');
  let path = originalPath;
  try {
    const refPath = join(directory, 'APPROVED_INPUTS_CURRENT.json');
    await safePath(refPath, [directory]);
    const ref = JSON.parse(await readFile(refPath));
    if (typeof ref.path !== 'string' || !inside(join(directory, 'approved-input-revisions'), ref.path))
      throw Error('ENTRY_INPUT_REVISION_INVALID');
    await safePath(ref.path, [directory]);
    if (sha256(await readFile(ref.path)) !== ref.sha256) throw Error('ENTRY_INPUT_REVISION_CHANGED');
    path = ref.path;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await safePath(path, [directory]);
  const bytes = await readFile(path);
  return { path, bytes, approved: JSON.parse(bytes) };
}

const patchKeys = new Set(['rawKeywordsFile', 'keywordSourceLineageFile', 'canonicalOrigin', 'domain',
  'repo', 'branch', 'deploymentProvider', 'dns', 'siteRevision', 'deploymentPlanAuthorized']);

export async function previewEntryResume(runId, configuration, { patch, planDigest } = {}) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(runId ?? '')) throw Error('ENTRY_RESUME_RUN_INVALID');
  const directory = join(configuration.workspace, 'runs', runId);
  const file = join(directory, 'manifest.json');
  await safePath(file, [directory]);
  const bytes = await readFile(file), manifest = JSON.parse(bytes);
  const { path: approvedPath, bytes: approvedBytes, approved } = await currentApprovedInputRecord(directory);
  const project = join(configuration.workspace, 'workspaces', runId, 'site');
  if (manifest.schemaVersion !== 1 || manifest.runId !== runId || manifest.deploymentExecuted !== false ||
      manifest.workspace !== configuration.workspace || manifest.inventoryPath !== configuration.inventoryPath ||
      manifest.inputs?.projectPath !== project || approved.inputs?.projectPath !== project ||
      approved.binding?.snapshot?.executionRunId !== runId ||
      manifest.inputs?.mode !== 'new-site' || manifest.inputs.adsEnabled !== false ||
      !isDeepStrictEqual(manifest.inputs, approved.inputs)) throw Error('ENTRY_RESUME_BINDING_INVALID');
  const index = manifest.stages?.findIndex(stage => !['PASSED', 'SKIPPED'].includes(stage.status));
  const stage = manifest.stages?.[index];
  if (!stage || !STAGES.includes(stage.skill)) throw Error('ENTRY_RESUME_NOT_PENDING');
  if (manifest.stages.some(stage => stage.status === 'IN_PROGRESS'))
    throw Error('ENTRY_RESUME_EFFECT_RECONCILIATION_REQUIRED');
  if (stage.status === 'FAILED' && stage.diagnostic?.operation !== 'worker-reported-failure')
    throw Error('ENTRY_RESUME_EFFECT_RECONCILIATION_REQUIRED');
  if (!['WAITING_FOR_USER', 'BLOCKED', 'FAILED', 'PARTIAL', 'READY', 'NOT_STARTED'].includes(stage.status))
    throw Error('ENTRY_RESUME_STATE_INVALID');
  const inventoryBytes = await readFile(configuration.inventoryPath);
  const inventorySha256 = sha256(inventoryBytes);
  if (manifest.lock?.inventorySha256 !== inventorySha256 ||
      approved.binding.snapshot.inventorySha256 !== inventorySha256) throw Error('ENTRY_RESUME_SKILL_LOCK_CHANGED');
  const inventory = JSON.parse(inventoryBytes);
  for (const skill of inventory.skills) for (const entry of skill.files ?? []) {
    await safePath(entry.path, [inventory.skillRoot]);
    if (sha256(await readFile(entry.path)) !== entry.sha256) throw Error('ENTRY_RESUME_SKILL_LOCK_CHANGED');
  }
  const materials = [];
  for (const key of ['rawKeywordsFile', 'keywordSourceLineageFile', 'iconSourcePng']) if (manifest.inputs[key]) {
    const path = manifest.inputs[key];
    if (!inside(directory, path)) throw Error('ENTRY_RESUME_MATERIAL_SCOPE_INVALID');
    await safePath(path, [directory]);
    const digest = sha256(await readFile(path));
    const originalMaterial = Array.isArray(approved.binding.snapshot.materials)
      ? approved.binding.snapshot.materials.find(x => x.key === key) : approved.binding.snapshot.materials?.[key];
    if (digest !== originalMaterial?.sha256)
      throw Error('ENTRY_RESUME_MATERIAL_CHANGED');
    materials.push({ key, path, sha256: digest });
  }
  const source = [];
  await safePath(project, [configuration.workspace]);
  try {
    if (!(await lstat(project)).isDirectory()) throw Error('ENTRY_RESUME_PROJECT_INVALID');
    for (const path of await treeFiles(project)) source.push({ path, sha256: sha256(await readFile(path)) });
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let stages = manifest.stages.slice(index).filter(x => STAGES.includes(x.skill)).map(x => x.skill);
  const originalApproval = JSON.parse(await readFile(join(directory, 'APPROVED_INPUTS.json')));
  const originalStages = originalApproval.binding.snapshot.stages;
  if (stages.some(name => !originalStages?.includes(name))) throw Error('ENTRY_RESUME_SCOPE_UNSUPPORTED');
  const result = { kind: 'ENTRY_RESUME_PREVIEW_ONLY', runId, executionRunId: runId,
    manifestSha256: sha256(bytes), approvedInputsSha256: sha256(approvedBytes),
    approvedRecordPath: approvedPath, originalApprovalId: approved.approvalId,
    originalBindingSha256: sha256(JSON.stringify(approved.binding)),
    configuration: structuredClone(configuration), inputs: structuredClone(manifest.inputs),
    inventorySha256, skills: manifest.lock.skills, workspace: project,
    currentStage: stage.skill, attempt: stage.checkpoint.attempt,
    currentStatus: stage.status, stages,
    materials, sourceSha256: sha256(JSON.stringify(source)),
    effects: manifest.stages.map(x => ({ skill: x.skill, status: x.status, checkpoint: x.checkpoint })),
    approvedToRun: false, releaseAuthorized: false };
  if (patch !== undefined && planDigest !== undefined) throw Error('ENTRY_PLAN_APPROVAL_SEPARATE_REQUIRED');
  if (patch !== undefined) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || !Object.keys(patch).length ||
        Object.keys(patch).some(key => !patchKeys.has(key))) throw Error('ENTRY_INPUT_PATCH_SCOPE_REJECTED');
    if (!['WAITING_FOR_USER', 'BLOCKED'].includes(stage.status)) throw Error('ENTRY_INPUT_PATCH_STATE_REJECTED');
    const ordinary = Object.fromEntries(Object.entries(patch).filter(([key]) => !['siteRevision', 'deploymentPlanAuthorized', 'dns'].includes(key)));
    validateEntryInputs(ordinary);
    if (patch.siteRevision !== undefined && (typeof patch.siteRevision !== 'string' || !patch.siteRevision.trim() || patch.siteRevision.length > 1600))
      throw Error('ENTRY_INPUT_PATCH_INVALID');
    if (patch.deploymentPlanAuthorized !== undefined && typeof patch.deploymentPlanAuthorized !== 'boolean') throw Error('ENTRY_INPUT_PATCH_INVALID');
    if (patch.dns !== undefined && (!patch.dns || typeof patch.dns !== 'object' || Array.isArray(patch.dns) ||
        Object.keys(patch.dns).sort().join(',') !== 'provider,recordsReviewed' ||
        typeof patch.dns.provider !== 'string' || !patch.dns.provider.trim() || patch.dns.provider.length > 1600 ||
        typeof patch.dns.recordsReviewed !== 'boolean')) throw Error('ENTRY_INPUT_PATCH_DNS_INVALID');
    const proposed = { ...manifest.inputs, ...structuredClone(patch) };
    if (patch.canonicalOrigin) proposed.canonicalRequired = true;
    const diffs = Object.keys(patch).map(key => ({ key, before: manifest.inputs[key] ?? null, after: patch[key] }));
    const newMaterials = [];
    for (const material of materials) newMaterials.push({ ...material });
    for (const key of ['rawKeywordsFile', 'keywordSourceLineageFile']) if (Object.hasOwn(patch, key)) {
      await safePath(patch[key], [patch[key]]);
      const bytes = await readFile(patch[key]);
      if (!bytes.length || bytes.length > 8*1024*1024) throw Error('ENTRY_INPUT_PATCH_MATERIAL_INVALID');
      const item = { key, path: patch[key], sha256: sha256(bytes) };
      const old = newMaterials.findIndex(x => x.key === key);
      if (old >= 0) newMaterials[old] = item; else newMaterials.push(item);
    }
    if (proposed.keywordSourceLineageFile) {
      const lineage = JSON.parse(await readFile(proposed.keywordSourceLineageFile));
      if (lineage.derived?.sha256 !== newMaterials.find(x => x.key === 'rawKeywordsFile')?.sha256)
        throw Error('ENTRY_INPUT_PATCH_LINEAGE_MISMATCH');
    }
    const changed = diffs.filter(x => JSON.stringify(x.before) !== JSON.stringify(x.after));
    if (!changed.length) throw Error('ENTRY_INPUT_PATCH_NO_CHANGE');
    const first = Math.min(index, ...changed.map(x => stageIndex(INPUT_STAGE[x.key])));
    if (manifest.stages.slice(first).filter(x => STAGES.includes(x.skill)).some(x => !originalStages.includes(x.skill)))
      throw Error('ENTRY_RESUME_SCOPE_UNSUPPORTED');
    delete proposed.deploymentPlanApproval;
    return { ...result, action: 'UPDATE_INPUTS', currentInputs: result.inputs, inputs: proposed,
      patch: structuredClone(patch), diffs, materials: newMaterials,
      firstAffectedStage: manifest.stages[first].skill,
      stages: manifest.stages.slice(first).filter(x => STAGES.includes(x.skill)).map(x => x.skill) };
  }
  if (planDigest !== undefined) {
    if (stage.skill !== STAGE.DEPLOYMENT_PLAN || stage.status !== 'WAITING_FOR_USER' ||
        !/^[a-f0-9]{64}$/.test(planDigest ?? '') || stage.checkpoint.planDigest !== planDigest)
      throw Error('ENTRY_PLAN_DIGEST_REJECTED');
    const plans = [];
    for (const item of stage.artifacts) {
      await safePath(item.path, [directory]);
      if (sha256(await readFile(item.path)) !== item.sha256) throw Error('ENTRY_PLAN_FILE_CHANGED');
      plans.push({ path: item.path, sha256: item.sha256, kind: item.kind,
        ...(item.kind === 'DEPLOYMENT_PLAN.md' ? { content: (await readFile(item.path)).toString('utf8') } : {}) });
    }
    if (sha256(JSON.stringify(plans.map(x => x.sha256))) !== planDigest) throw Error('ENTRY_PLAN_DIGEST_REJECTED');
    return { ...result, action: 'CONFIRM_DEPLOYMENT_PLAN', currentInputs: result.inputs,
      inputs: { ...result.inputs, deploymentPlanApproval: { approved: true, digest: planDigest } },
      planDigest, plans, stages: [STAGE.DEPLOYMENT_PLAN] };
  }
  return result;
}

export async function validateEntryResume(snapshot, configuration) {
  if (!snapshot || snapshot.kind !== 'ENTRY_RESUME_PREVIEW_ONLY' || snapshot.approvedToRun !== false)
    throw Error('ENTRY_RESUME_SNAPSHOT_INVALID');
  const current = await previewEntryResume(snapshot.runId, configuration,
    snapshot.action === 'UPDATE_INPUTS' ? { patch: snapshot.patch }
      : snapshot.action === 'CONFIRM_DEPLOYMENT_PLAN' ? { planDigest: snapshot.planDigest } : {});
  if (!isDeepStrictEqual(snapshot, current)) throw Error('ENTRY_RESUME_CHANGED');
  return current;
}
