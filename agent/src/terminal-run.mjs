import { readFile, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createOrchestrator, loadConfiguration } from './orchestrator.mjs';
import { createSkillExecutor } from './skill-executor.mjs';
import { STAGES, STAGE } from './stages.mjs';
import { sha256 } from './files.mjs';
import { resolveInputPaths } from './paths.mjs';
import { keywordResearchBudget } from './keyword-budget.mjs';
import { verifyKeywordRecovery } from './keyword-recovery.mjs';
import { keywordServiceStops, keywordServiceResumes, recoveredKeywordServiceDecisions } from './keyword-service-stops.mjs';
import { createKeywordExecutionReceipt, keywordRecoveryDecision, normalizedJson } from './keyword-execution-receipt.mjs';

// Each run/retry is approved by terminal "y" or a user-returned preview code, replacing the G0 trusted-host ticket.
const operatorConfirmed = async () => true;

async function exists(path) {
  try { await lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function readInputs(inputsFile) {
  let data, bytes;
  const path = resolve(inputsFile);
  try { bytes = await readFile(path); data = JSON.parse(bytes.toString('utf8')); }
  catch (error) { throw Error(`RUN_INPUTS_INVALID: ${inputsFile} is not readable JSON (${error.message})`); }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw Error(`RUN_INPUTS_INVALID: ${inputsFile} must contain a JSON object, got ${Array.isArray(data) ? 'an array' : typeof data}`);
  return { data, bytes, path };
}

export async function describeRun({ command, runId, inputs, configuration }) {
  const runDirectory = join(configuration.workspace, 'runs', runId);
  const suppliedInputs = inputs;
  const manifestBytes = command === 'retry' ? await readFile(join(runDirectory, 'manifest.json')) : null;
  const manifest = manifestBytes ? JSON.parse(manifestBytes) : null;
  const previous = manifest?.inputs;
  if (previous) inputs = { ...previous, ...inputs };
  inputs = resolveInputPaths(previous?.paths && !inputs.paths ? { ...inputs, paths: previous.paths } : inputs,
    { required: command === 'run' || Boolean(previous?.paths), legacyPaths: previous?.paths });
  const decision = keywordRecoveryDecision(inputs.keywordRecoveryDecision, { recovery: inputs.keywordRecovery });
  const keywordStage = manifest?.stages?.find(stage => stage.skill === STAGE.KEYWORD_RESEARCH);
  const currentStage = manifest?.stages?.find(stage => !['PASSED', 'SKIPPED'].includes(stage.status));
  const recoverySnapshot = keywordStage?.checkpoint?.attempt > 0 && await exists(join(runDirectory, 'artifacts',
    String(STAGES.indexOf(STAGE.KEYWORD_RESEARCH)), String(keywordStage.checkpoint.attempt), 'keyword-recovery.json'));
  if (command === 'retry' && currentStage?.skill === STAGE.KEYWORD_RESEARCH &&
    (inputs.keywordRecovery || recoverySnapshot) && (!decision || !Object.hasOwn(suppliedInputs, 'keywordRecoveryDecision')))
    throw Error('KEYWORD_RECOVERY_DECISION_REQUIRED: choose {"mode":"recover"} with keywordRecovery or {"mode":"fresh"} without it');
  let keywords = `${inputs.rawKeywordsFile ?? '(not provided)'}`;
  if (inputs.rawKeywordsFile) {
    try { keywords += `\n  SHA256: ${sha256(await readFile(inputs.rawKeywordsFile))}`; }
    catch (error) { if (error.code === 'ENOENT') keywords += ' (MISSING)'; else throw error; }
  }
  const inventory = JSON.parse(await readFile(configuration.inventoryPath, 'utf8'));
  const template = configuration.templateSource
    ? `${configuration.templateSource.repository} ${configuration.templateSource.ref}/${configuration.templateSource.subtree}` +
      (command === 'retry' ? ' (commit recorded in this run)' : ' (current commit is pinned when the run starts)')
    : configuration.templateRoots?.join(', ') ?? '(none)';
  const stages = inputs.adsEnabled === true ? [...STAGES, 'game-site-adsterra-ad-integration'] : STAGES;
  const budget = keywordResearchBudget(inputs.keywordResearchBudget);
  const serviceStops = keywordServiceStops(inputs.keywordServiceStops);
  const serviceResumes = keywordServiceResumes(inputs.keywordServiceResumes);
  let recovery;
  if (inputs.keywordRecovery) {
    if (!manifest) throw Error('KEYWORD_RECOVERY_INVALID: recovery requires an existing run');
    const stage = manifest.stages.find(stage => stage.skill === STAGE.KEYWORD_RESEARCH);
    recovery = await verifyKeywordRecovery({ runId, runDirectory, inputs,
      outputDirectory: join(runDirectory, 'artifacts/1', String(stage.checkpoint.attempt + 1)),
      skillLock: manifest.lock.skills.find(skill => skill.name === STAGE.KEYWORD_RESEARCH) }, inputs.keywordRecovery);
  }
  const serviceDecisions = recoveredKeywordServiceDecisions({
    historicalStops: recovery?.historicalServiceStops,
    serviceStops,
    serviceResumes,
    suppliedInputs,
  });
  return [
    command === 'retry' ? `Retry existing run ${runId}` : `New run ${runId}`,
    ...(manifestBytes ? [`Resume manifest SHA256: ${sha256(manifestBytes)}`] : []),
    `Game: ${inputs.gameIdentity ?? '(not provided)'}`,
    `siteDirectory: ${inputs.paths?.siteDirectory ?? previous?.projectPath}`,
    `researchDirectory: ${inputs.paths?.researchDirectory ?? '(legacy run: research stays in run artifacts until handoff)'}`,
    `rawKeywordsFile: ${inputs.rawKeywordsFile ?? previous?.rawKeywordsFile ?? '(not provided)'}`,
    `Keywords: ${keywords}`,
    `Skills: ${inventory.skillRoot} tree ${inventory.sourceTree ?? '(unversioned)'}`,
    `Templates: ${template}`,
    `Keyword research budget: ${budget.timeoutMs} ms; handoff margin: ${budget.handoffMarginMs} ms; source: ${budget.configurationSource}`,
    `Suspended services (all keywords): ${serviceStops.join(', ') || '(none)'}`,
    `Recovered service restrictions: ${serviceDecisions.historicalStops.join(', ') || '(none)'}`,
    `Explicitly resumed services: ${serviceResumes.join(', ') || '(none)'}`,
    `Keyword recovery decision: ${decision?.mode ?? '(not required)'}`,
    'Handoff deadline is cooperative; a hard timeout remains FAILED. Recovery snapshots are unvalidated progress, never a completion waiver.',
    ...(recovery ? [
      `Keyword recovery: attempt ${recovery.sourceAttempt}; manifest ${recovery.manifestPath}`,
      `Recovery SHA256: ${recovery.sha256}; explicitly selected files: ${recovery.files.length}`,
      ...recovery.files.map(file => `  ${file.path} SHA256 ${file.sha256}`),
      'Pending raw rows retain their existing PENDING disposition; no inferred keyword expansion or new completed status.'
    ] : ['Keyword recovery: none (no previous attempt is automatically scanned or reused)']),
    'Stages:', ...stages.map((stage, index) => `  ${index + 1}. ${stage}`),
    ...(inputs.deploymentPlanApproval ? [
      `DEPLOY TO PRODUCTION: approves plan ${inputs.deploymentPlanApproval.digest}`,
      `  Review first: ${join(inputs.paths?.siteDirectory ?? previous.projectPath, 'docs', 'DEPLOYMENT_PLAN.md')}`,
      '  Confirming runs the git push, hosting deploy, DNS and GSC/GA4 steps listed in that plan.'] : []),
    ''
  ].join('\n');
}

async function askYes({ stdin, stdout }) {
  stdout.write('Start this run? [y/N] ');
  const reader = createInterface({ input: stdin, terminal: false });
  try {
    for await (const line of reader) return line === 'y';
    return false;
  } finally { reader.close(); }
}

export async function runFromTerminal({ command, inputsFile, runId, configuration, executor,
  preview = false, confirm, stdin = process.stdin, stdout = process.stdout }) {
  if (!['run', 'retry'].includes(command)) throw Error(`RUN_COMMAND_INVALID: ${JSON.stringify(command)}`);
  if (preview && confirm !== undefined) throw Error('RUN_ARGUMENTS_INVALID: --preview and --confirm are mutually exclusive');
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(runId ?? '')) throw Error(`RUN_ID_INVALID: ${JSON.stringify(runId)} must match [a-zA-Z0-9_-]{1,100}`);
  const inputDocument = await readInputs(inputsFile);
  const inputs = inputDocument.data;
  configuration ??= await loadConfiguration();
  const manifest = join(configuration.workspace, 'runs', runId, 'manifest.json');
  const existing = await exists(manifest);
  if (command === 'run' && existing) throw Error(`RUN_ALREADY_EXISTS: ${runId} already has a manifest; use retry ${runId}`);
  if (command === 'retry' && !existing) throw Error(`RUN_NOT_FOUND: ${runId} has no manifest at ${manifest}`);
  if (!preview && confirm === undefined && !stdin.isTTY)
    throw Error('TERMINAL_CONFIRMATION_REQUIRED: run from an interactive terminal so the operator can confirm');

  const summary = await describeRun({ command, runId, inputs, configuration });
  stdout.write(summary);
  let confirmationBinding = 'interactive-y';
  if (preview || confirm !== undefined) {
    const code = sha256(command + runId + summary + normalizedJson(inputs)).slice(0, 16);
    if (preview) {
      stdout.write(`Confirmation code: ${code}\n`);
      return { status: 'PREVIEW', run_id: runId, confirmation_code: code };
    }
    if (confirm !== code) throw Error(`CONFIRMATION_CODE_MISMATCH: provided ${JSON.stringify(confirm)}, expected ${code}. ` +
      'inputs.json may have changed, or RUN_ID or command may differ; preview again and ask the user for the current code.');
    stdout.write('Confirmation method: confirmation-code\n');
    confirmationBinding = 'confirmation-code:' + code;
  } else if (!await askYes({ stdin, stdout })) {
    stdout.write('Cancelled; nothing was started.\n');
    return { status: 'CANCELLED', run_id: runId };
  }
  const execute = createOrchestrator({ configuration, executor: executor ?? createSkillExecutor(),
    approvalConsumer: operatorConfirmed, deploymentExecution: true });
  let keywordExecutionReceipt = null;
  if (command === 'retry' && inputs.keywordRecoveryDecision) {
    keywordExecutionReceipt = createKeywordExecutionReceipt({ runId, inputsFile: inputDocument.path,
      inputsFileBytes: inputDocument.bytes, inputs, manifestBytes: await readFile(manifest), confirmationBinding });
  }
  return execute({ id: runId, inputs: JSON.stringify(inputs), retry: command === 'retry', keywordExecutionReceipt });
}
