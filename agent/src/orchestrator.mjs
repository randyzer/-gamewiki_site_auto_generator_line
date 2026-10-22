import { readFile, writeFile, access, lstat } from 'node:fs/promises';
import { safePath } from './files.mjs';
import { join, resolve, dirname } from 'node:path';
import { createPipeline } from './pipeline.mjs';
import { STAGE, stageDefinition, findStage, stageSatisfied } from './stages.mjs';
import { sanitizeDiagnosticText } from './diagnostics.mjs';
import { AGENT_ROOT } from './skill-lock.mjs';
import { validateIntakeCard, intakeSummary } from './intake-card.mjs';
import { existingProjectPreflight } from './existing-project-preflight.mjs';
import { prepareExistingProject, targetEntry, assertProjectIsolation } from './existing-project.mjs';
import { verifyBaseline } from './project-baseline.mjs';
import { candidateDiff } from './candidate-diff.mjs';
import { promotionPlan } from './promotion-gate.mjs';
import { prepareResearchHandoff } from './handoff.mjs';
import { prepareExistingContent } from './existing-content-adapter.mjs';
import { materializeTemplateSnapshot } from './template-snapshot.mjs';
import { resolveInputPaths } from './paths.mjs';
import { verifyKeywordExecutionReceipt } from './keyword-execution-receipt.mjs';

export async function loadConfiguration(file = join(AGENT_ROOT, 'config/workflow.json')) {
  const data = JSON.parse(await readFile(file, 'utf8'));
  const base = dirname(file);
  const existingProjectAllowlist = data.existingProjectAllowlist
    ? JSON.parse(await readFile(resolve(base, data.existingProjectAllowlist), 'utf8')) : { targets: {} };
  if (!data.templateSource || typeof data.templateCache !== 'string')
    throw Error(`TEMPLATE_SOURCE_INVALID: ${file} needs templateSource and templateCache`);
  // The cache sits outside the workspace: the pipeline refuses workspaces that overlap a template root.
  return { workspace: resolve(base, data.workspace), inventoryPath: resolve(base, data.inventory),
    templateSource: data.templateSource, templateCacheRoot: resolve(base, data.templateCache), existingProjectAllowlist };
}

// New runs pin the current ref once; resumed runs reuse the commit recorded in their manifest.
async function runTemplateSnapshot(config, manifest, runId, resume) {
  if (!config.templateSource) return undefined;
  let commit;
  if (resume) {
    const recorded = JSON.parse(await readFile(manifest, 'utf8')).templateSnapshot;
    if (!recorded?.commit) throw Error(`TEMPLATE_SNAPSHOT_MISSING_IN_MANIFEST: run ${runId} was created without a template snapshot; start a new run`);
    commit = recorded.commit;
  }
  return materializeTemplateSnapshot(config.templateSource, { cacheRoot: config.templateCacheRoot, commit });
}

export function summarize(state, paused = false) {
  const index = state.stages.findIndex(stage => !stageSatisfied(stage));
  const current = state.stages[index];
  return { status: paused ? 'PAUSED' : current?.status ?? 'PASSED', run_id: state.runId,
    summary: paused ? 'Paused after current stage' : current ? stageDefinition(current.skill).label + ': ' + current.status + (current.evidence.length ? '\n' + current.evidence.map(item => sanitizeDiagnosticText(item)).join('\n') : '') : state.deploymentExecuted ? 'All stages passed; approved deployment executed' : 'Deployment plan acknowledged; no production actions executed',
    missing_inputs: current?.missing_inputs ?? [], artifact_paths: state.stages.flatMap(s => s.artifacts.map(a => a.path)),
    stage: current?.skill ?? null, stage_index: index, diagnostic: current?.diagnostic ?? null, stage_label: current ? stageDefinition(current.skill).label : null, stages: state.stages.map(s => ({ skill: s.skill, status: s.status })),
    plan_digest: findStage(state.stages, STAGE.DEPLOYMENT_PLAN).checkpoint.planDigest ?? null, deployment_executed: state.deploymentExecuted === true };
}

// Host code is trusted; task JSON is not. No production approval host is installed.
// An injected consumer AND executor are required for the offline integration seam.
export function createOrchestrator({ configuration, executor, approvalConsumer, deploymentExecution = false,
  stage4ReadinessCapability = configuration?.stage4ReadinessCapability } = {}) {
  return async function execute(task, { shouldPause = () => false } = {}) {
    task = structuredClone(task);
    const config = structuredClone(configuration ?? await loadConfiguration());
    const runId = task.id;
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(runId)) throw Error('Unsafe runId');
    const entryDraft = join(config.workspace, 'runs', runId, 'ENTRY_INTAKE_V1.json');
    await safePath(entryDraft, [config.workspace]);
    try { await lstat(entryDraft); throw Error('ENTRY_DRAFT_EXECUTION_FORBIDDEN'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const manifest = join(config.workspace, 'runs', runId, 'manifest.json');
    let supplied;
    try { supplied = task.inputs ? JSON.parse(task.inputs) : JSON.parse(task.request); } catch { supplied = {}; }
    if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) throw Error('Task inputs must be a JSON object');
    if (['ENTRY_ONLY_NO_WORKER','ENTRY_HANDOFF_PREVIEW_ONLY'].includes(supplied.kind))
      throw Error('ENTRY_DRAFT_EXECUTION_FORBIDDEN');
    if (typeof approvalConsumer !== 'function') throw Error('ENTRY_TRUSTED_APPROVAL_UNAVAILABLE');
    if (typeof executor !== 'function') throw Error('ENTRY_PRODUCTION_HANDOFF_DISABLED');
    const permit = await approvalConsumer(structuredClone(task), structuredClone(config));
    const resumePermit = permit?.kind === 'ENTRY_LOCAL_RESUME_V1';
    const localPermit = permit?.kind === 'ENTRY_LOCAL_EXECUTION_V1' || resumePermit;
    if (permit !== true && !localPermit) throw Error('ENTRY_APPROVAL_REJECTED');
    const freshApproval = Boolean(task.approval?.snapshot) || localPermit;
    if (freshApproval && task.retry && !resumePermit) throw Error('ENTRY_APPROVAL_RETRY_UNSUPPORTED');
    if (localPermit) {
      if (permit.runDirectory !== join(config.workspace, 'runs', runId) || typeof permit.verify !== 'function')
        throw Error('ENTRY_APPROVAL_REJECTED');
      await permit.verify();
      supplied = structuredClone(permit.inputs);
    }
    if (supplied.schemaVersion === 1)
      return executeExisting(task, supplied, config, executor, shouldPause, stage4ReadinessCapability);
    if (supplied.mode === 'existing-project') throw Error('Existing project requires a versioned structured task card');
    let resume = resumePermit;
    if (!freshApproval) {
      try { await access(manifest); resume = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (freshApproval && !resume) {
      try { await access(manifest); throw Error('ENTRY_EXECUTION_DESTINATION_EXISTS'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const manifestBytes = resume ? await readFile(manifest) : null;
    const previous = manifestBytes ? JSON.parse(manifestBytes).inputs : null;
    const keywordExecutionReceipt = task.keywordExecutionReceipt
      ? verifyKeywordExecutionReceipt(task.keywordExecutionReceipt, { runId, inputs: supplied, manifestBytes }) : null;
    const handoffApprovalOnly = Object.keys(supplied).length === 1 &&
      Object.hasOwn(supplied, 'researchHandoffApproval');
    const inputs = resolveInputPaths(previous?.paths && !supplied.paths ? { ...supplied, paths: previous.paths } : supplied,
      { required: (!resume && !freshApproval) || Boolean(previous?.paths), legacyPaths: previous?.paths });
    if (!inputs.paths && previous) inputs.projectPath = previous.projectPath;
    const guardedExecutor = localPermit ? async (skill, context) => {
      await permit.verify({ stage: skill });
      const result = await executor(skill, context);
      await permit.verify({ stage: skill });
      return result;
    } : executor;
    const stagePreflight = executor.stagePreflight && (localPermit ? async (skill, context) => {
      await permit.verify({ stage: skill });
      const result = await executor.stagePreflight(skill, context);
      await permit.verify({ stage: skill });
      return result;
    } : executor.stagePreflight);
    const { templateSource, templateCacheRoot, ...pipelineConfig } = config;
    const templateSnapshot = await runTemplateSnapshot(config, manifest, runId, resume);
    if (localPermit) await permit.start();
    try {
      const pipeline = await createPipeline({ ...pipelineConfig, templateSnapshot, deploymentExecution, executor: guardedExecutor,
        installSiteDependencies: executor.installDependencies, validateStage4: executor.validateStage4,
        stagePreflight, stage4ReadinessCapability,
        runId, resume, siteWrites: true,
        preparedRun: localPermit && !resumePermit ? permit : undefined, recoverDeadLocks: resumePermit || !freshApproval,
        expectedManifestSha256: resumePermit ? permit.manifestSha256 : undefined,
        keywordExecutionReceipt, keywordExecutionInputs: supplied, inputs: resume ? {} : inputs });
      if (resume) {
        if (pipeline.snapshot().stages.some(s => s.status === 'IN_PROGRESS')) await pipeline.advance();
        const old = pipeline.snapshot().inputs;
        const patch = permit?.action ? structuredClone(permit.patch)
          : Object.fromEntries(Object.entries(inputs).filter(([key, value]) => JSON.stringify(old[key]) !== JSON.stringify(value)));
        if (permit?.canonicalRequired) patch.canonicalRequired = true;
        // Explicit same-path input refresh must still compare keyword bytes.
        if (inputs.rawKeywordsFile && !permit?.action && !handoffApprovalOnly &&
          !Object.hasOwn(patch, 'deploymentPlanApproval')) patch.rawKeywordsFile = inputs.rawKeywordsFile;
        if (Object.keys(patch).length || task.retry) await pipeline.updateUserInputs(patch, {
          retry: Boolean(task.retry), checkpointRecoveryIntent: task.checkpointRecoveryIntent,
        });
      }
      while (!shouldPause(pipeline.snapshot())) {
        const current = pipeline.snapshot().stages.find(stage => !stageSatisfied(stage));
        if (!current || ['WAITING_FOR_USER', 'BLOCKED', 'FAILED', 'PARTIAL'].includes(current.status)) break;
        await pipeline.advance();
      }
      const state = pipeline.snapshot();
      const result = { ...summarize(state, shouldPause(state)), inputs: pipeline.inputChecklist(), project_path: state.inputs.projectPath };
      await writeFile(join(config.workspace, 'runs', runId, 'AGENT_RUN_REPORT.md'),
        `# Agent run ${runId}\n\n${result.summary}\n\nProduction deployed: ${state.deploymentExecuted === true}\n\n` +
        state.stages.map(s => `- ${s.skill}: ${s.status}`).join('\n') + '\n', { mode: 0o600 });
      return result;
    } finally {
      if (localPermit) await permit.stop();
    }
  };
}

async function executeExisting(task, supplied, config, executor, shouldPause, stage4ReadinessCapability) {
  const card = validateIntakeCard(supplied), summary = intakeSummary(card);
  const runDirectory = join(config.workspace, 'runs', task.id);
  const projectPath = join(config.workspace, 'workspaces', task.id, 'site');
  const entry = targetEntry(card.targetId, config.existingProjectAllowlist);
  await assertProjectIsolation(entry.path, { workspace: config.workspace, runDirectory, candidateProjectPath: projectPath });
  let resume = false; try { await access(join(runDirectory, 'manifest.json')); resume = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const inputs = { mode: card.mode, targetId: card.targetId, sourceProjectPath: entry.path, taskCardDigest: summary.digest,
    gameIdentity: card.gameIdentity, objective: card.objective, projectPath, rawKeywordsFile: card.rawKeywordsFile,
    ...(card.gameMetadata ? { gameMetadata: card.gameMetadata } : {}),
    canonicalRequired: true, canonicalOrigin: card.canonicalOrigin, domain: new URL(card.canonicalOrigin).hostname,
    repo: card.repository, deploymentProvider: card.deploymentProvider, adRequested: card.adRequested,
    ...(card.adSnippetRef ? { adSnippetRef: card.adSnippetRef } : {}), adsEnabled: false };
  let preflight;
  const ownedContext = context => ({ ...context, existingProject: { baseline: preflight.baseline, sourceEntry: entry } });
  const wrapped = async (skill, context) => {
    if (preflight.report.status !== 'PASSED') return { status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: preflight.report.blockers };
    await verifyBaseline(preflight.baseline, entry);
    const next = ownedContext(context);
    if (skill === STAGE.CONTENT_INTEGRATION && !executor.stagePreflight) {
      next.runDirectory = runDirectory;
      next.nativeDirectory = join(context.outputDirectory, 'native');
      try {
        next.researchHandoff = await prepareResearchHandoff(next);
        next.existingContent = await prepareExistingContent(next);
      } catch (error) {
        if (error.code !== 'CONTRACT_INCOMPATIBLE') throw error;
        return { status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: [error.message] };
      }
    }
    const result = await executor(skill, next);
    await verifyBaseline(preflight.baseline, entry);
    return result;
  };
  const stagePreflight = executor.stagePreflight ? async (skill, context) => {
    if (preflight.report.status !== 'PASSED')
      return { status: 'BLOCKED', evidence: preflight.report.blockers, missing_inputs: [] };
    await verifyBaseline(preflight.baseline, entry);
    const result = await executor.stagePreflight(skill, ownedContext(context));
    await verifyBaseline(preflight.baseline, entry);
    return result;
  } : undefined;
  const pipeline = await createPipeline({ ...config, executor: wrapped, installSiteDependencies: executor.installDependencies,
    validateStage4: executor.validateStage4,
    stagePreflight, stage4ReadinessCapability, runId: task.id, inputs: resume ? {} : inputs,
    resume, siteWrites: true, recoverDeadLocks: true });
  if (pipeline.snapshot().inputs.taskCardDigest !== summary.digest) throw Error('Task card changed; use a new run and discard prior approval');
  preflight = await existingProjectPreflight(card, { allowlist: config.existingProjectAllowlist, runDirectory,
    inspectTools: config.inspectTools !== false });
  await writeFile(join(runDirectory, 'INTAKE_CARD_REVIEW.json'), JSON.stringify(summary, null, 2), { mode: 0o600 });
  if (preflight.report.status === 'PASSED') {
    try {
      const baseline = JSON.parse(await readFile(join(runDirectory, 'BASELINE.json'), 'utf8'));
      await verifyBaseline(baseline, entry); preflight.baseline = baseline;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const prepared = await prepareExistingProject({ targetId: card.targetId, allowlist: config.existingProjectAllowlist,
        runDirectory, candidateProjectPath: projectPath, rawKeywordsFile: card.rawKeywordsFile });
      preflight.baseline = prepared.baseline;
    }
    if (pipeline.snapshot().inputs.researchRootName !== preflight.baseline.researchRootName)
      await pipeline.updateUserInputs({ researchRootName: preflight.baseline.researchRootName });
  }
  if (task.retry) await pipeline.updateUserInputs({}, { retry: true });
  while (!shouldPause(pipeline.snapshot())) {
    const pending = pipeline.snapshot().stages.find(s => !['PASSED', 'SKIPPED'].includes(s.status));
    if (!pending || ['BLOCKED', 'FAILED', 'PARTIAL', 'WAITING_FOR_USER'].includes(pending.status)) break;
    await pipeline.advance();
  }
  let diff;
  if (preflight.report.status === 'PASSED') {
    await verifyBaseline(preflight.baseline, entry);
    diff = await candidateDiff(preflight.baseline, projectPath);
    await writeFile(join(runDirectory, 'CANDIDATE_DIFF.json'), JSON.stringify(diff, null, 2), { mode: 0o600 });
    await writeFile(join(runDirectory, 'PROMOTION_PLAN.json'), JSON.stringify(promotionPlan({ targetId: card.targetId,
      runId: task.id, baseline: preflight.baseline, diff, taskCardDigest: summary.digest }), null, 2), { mode: 0o600 });
    await writeFile(join(runDirectory, 'CANDIDATE_REVIEW.md'), '# Candidate review\n\nSource writes: false\nPromotion: dry-run only\n\n' + diff.changes.map(c => `- ${c.type} ${c.relativePath}`).join('\n'), { mode: 0o600 });
  }
  return { ...summarize(pipeline.snapshot(), shouldPause(pipeline.snapshot())), mode: card.mode, targetId: card.targetId,
    candidate_project_path: preflight.report.status === 'PASSED' ? projectPath : null, source_project_path: entry.path,
    preflight: preflight.report.status, preflight_blockers: preflight.report.blockers, source_writes: false,
    promotion_implemented: false, task_card_digest: summary.digest, candidate_digest: diff?.candidateDigest ?? null };
}
