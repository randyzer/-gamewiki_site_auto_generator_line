import { readFile, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createOrchestrator, loadConfiguration } from './orchestrator.mjs';
import { createSkillExecutor } from './skill-executor.mjs';
import { STAGES } from './stages.mjs';
import { sha256 } from './files.mjs';

// The operator at the terminal is the approver: one explicit "y" per run or retry replaces the G0 trusted-host ticket.
const operatorConfirmed = async () => true;

async function exists(path) {
  try { await lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function readInputs(inputsFile) {
  let data;
  try { data = JSON.parse(await readFile(resolve(inputsFile), 'utf8')); }
  catch (error) { throw Error(`RUN_INPUTS_INVALID: ${inputsFile} is not readable JSON (${error.message})`); }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw Error(`RUN_INPUTS_INVALID: ${inputsFile} must contain a JSON object, got ${Array.isArray(data) ? 'an array' : typeof data}`);
  return data;
}

export async function describeRun({ command, runId, inputs, configuration }) {
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
  return [
    command === 'retry' ? `Retry existing run ${runId}` : `New run ${runId}`,
    `Game: ${inputs.gameIdentity ?? '(not provided)'}`,
    `Keywords: ${keywords}`,
    `Skills: ${inventory.skillRoot} tree ${inventory.sourceTree ?? '(unversioned)'}`,
    `Templates: ${template}`,
    'Stages:', ...stages.map((stage, index) => `  ${index + 1}. ${stage}`),
    ...(inputs.deploymentPlanApproval ? [
      `DEPLOY TO PRODUCTION: approves plan ${inputs.deploymentPlanApproval.digest}`,
      `  Review first: ${join(configuration.workspace, 'workspaces', runId, 'site', 'docs', 'DEPLOYMENT_PLAN.md')}`,
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
  stdin = process.stdin, stdout = process.stdout }) {
  if (!['run', 'retry'].includes(command)) throw Error(`RUN_COMMAND_INVALID: ${JSON.stringify(command)}`);
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(runId ?? '')) throw Error(`RUN_ID_INVALID: ${JSON.stringify(runId)} must match [a-zA-Z0-9_-]{1,100}`);
  const inputs = await readInputs(inputsFile);
  configuration ??= await loadConfiguration();
  const manifest = join(configuration.workspace, 'runs', runId, 'manifest.json');
  const existing = await exists(manifest);
  if (command === 'run' && existing) throw Error(`RUN_ALREADY_EXISTS: ${runId} already has a manifest; use retry ${runId}`);
  if (command === 'retry' && !existing) throw Error(`RUN_NOT_FOUND: ${runId} has no manifest at ${manifest}`);
  if (!stdin.isTTY) throw Error('TERMINAL_CONFIRMATION_REQUIRED: run from an interactive terminal so the operator can confirm');

  stdout.write(await describeRun({ command, runId, inputs, configuration }));
  if (!await askYes({ stdin, stdout })) {
    stdout.write('Cancelled; nothing was started.\n');
    return { status: 'CANCELLED', run_id: runId };
  }
  const execute = createOrchestrator({ configuration, executor: executor ?? createSkillExecutor(),
    approvalConsumer: operatorConfirmed, deploymentExecution: true });
  return execute({ id: runId, inputs: JSON.stringify(inputs), retry: command === 'retry' });
}
