// Trusted host composition. Never import this module into a task/worker tool API.
import { previewEntryHandoff } from './entry-v1.mjs';
import { entryApprovalBinding, entryResumeApprovalBinding, createEntryApprovalConsumer } from './entry-approval.mjs';
import { previewEntryResume } from './entry-resume-snapshot.mjs';
import { createMacLocalEntryApprovalHost } from './local-entry-approval.mjs';
import { loadConfiguration, createOrchestrator } from './orchestrator.mjs';
import { createSkillExecutor } from './skill-executor.mjs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AGENT_ROOT } from './skill-lock.mjs';
import { safePath, sha256 } from './files.mjs';
import { verifyWorkerCommandIdentity, verifyWorkerCodeModeHostIdentity } from './worker-permissions.mjs';
import { collectIndexedOfficialSources } from './official-source-host.mjs';
import { collectTrustedHomepageMedia, inspectHomepageMediaReadiness } from './homepage-media-host.mjs';
import { OFFLINE_STAGE4_READINESS_CAPABILITY } from './pipeline.mjs';

// Fixed host implementation and policy; neither is selected by task JSON.
const runtimeFiles = ['src/entry-host-bootstrap.mjs', 'src/entry-approval.mjs',
  'src/local-entry-approval.mjs', 'src/macos-entry-human-approval.mjs', 'src/orchestrator.mjs',
  'src/worker-permissions.mjs', 'src/skill-executor.mjs', 'src/process.mjs',
  'src/official-source-host.mjs', 'src/trusted-browser-host.mjs',
  'config/worker-result.schema.json', 'scripts/entry-host-runtime-smoke.mjs',
  'src/homepage-media-host.mjs', 'src/bsk-command-gate.mjs', 'src/bsk-policy.mjs',
  'src/bsk-tool-server.mjs', 'src/bsk-capability.mjs', 'config/bsk-command-policy.json',
  'src/macos-human-approval.mjs', 'src/files.mjs', 'src/favicon-png.mjs',
  'src/m3-icon-gate.mjs', 'src/m3-local-favicon-handoff.mjs', 'src/m3-homepage-manual-handoff.mjs',
  'scripts/m3-local-favicon.mjs', 'scripts/m3-local-favicon-engine.py',
  'scripts/verify-favicon-package.py', 'scripts/m3-compare-favicon-pixels.py'];
export async function hostRuntimeImplementationSha256() {
  const files = [];
  for (const name of runtimeFiles) files.push([name, sha256(await readFile(join(AGENT_ROOT, name)))]);
  return sha256(JSON.stringify(files));
}

export async function loadEntryHostPolicy() {
  const path = join(AGENT_ROOT, 'config/entry-host-policy.json');
  await safePath(path, [join(AGENT_ROOT, 'config')]);
  const policy = JSON.parse(await readFile(path));
  if (Object.keys(policy).sort().join(',') !== 'cli,codeModeHost,kind,runtimeEvidence,trustModel,userDecision' ||
      policy.kind !== 'HOST_CODEX_CLIENT_POLICY_V1' ||
      policy.trustModel !== 'USER_APPROVED_SINGLE_USER_TRUSTED_CLIENT' || !policy.userDecision)
    throw Error('ENTRY_HOST_ISOLATION_UNVERIFIED');
  return policy;
}

// The user-approved single-user trust model binds execution to the exact official
// client binaries. A synthetic tool-event smoke is diagnostic evidence, not a
// prerequisite for starting a real, policy-bounded stage.
export async function requireVerifiedHostRuntime(policy) {
  const fail = () => { throw Error('ENTRY_HOST_ISOLATION_UNVERIFIED'); };
  try {
    if (policy.trustModel !== 'USER_APPROVED_SINGLE_USER_TRUSTED_CLIENT' ||
        typeof policy.userDecision !== 'string' || !policy.userDecision.trim()) return fail();
    await verifyWorkerCommandIdentity(policy.cli.path, policy.cli);
    await verifyWorkerCodeModeHostIdentity(policy.cli, policy.codeModeHost);
  } catch { return fail(); }
}

async function compose({ directory, executor, humanOptions, executionStages, stage4ReadinessCapability }) {
  executionStages = executionStages === undefined ? undefined : structuredClone(executionStages);
  const configuration = await loadConfiguration();
  const host = await createMacLocalEntryApprovalHost({ directory }, humanOptions);
  const execute = createOrchestrator({ configuration, executor, stage4ReadinessCapability,
    approvalConsumer: createEntryApprovalConsumer({ host, executionStages }) });
  const options = { shouldPause: state => Boolean(executionStages &&
    state.stages.slice(0, executionStages.length).every(stage => stage.status === 'PASSED')) };
  const start = async request => {
    try {
      // The caller supplies only the preview request, never a binding or credential.
      const { snapshot } = await previewEntryHandoff(structuredClone(request));
      const binding = entryApprovalBinding(snapshot, configuration, { executionStages });
      const ticket = await host.issue(binding);
      return await execute({ id: snapshot.executionRunId, inputs: JSON.stringify(binding.inputs),
        approval: { snapshot, ticket } }, options);
    } catch (error) {
      // Filesystem exceptions may contain the bearer ticket in their path.
      // Preserve only machine codes, without an error cause or private paths.
      throw Error(/^ENTRY_[A-Z_]+$/.test(error.message ?? '')
        ? error.message : 'ENTRY_HOST_EXECUTION_REJECTED');
    }
  };
  start.resume = async request => {
    try {
      if (!request || !['expectedManifestSha256,runId', 'expectedManifestSha256,patch,runId'].includes(Object.keys(request).sort().join(',')))
        throw Error('ENTRY_RESUME_REQUEST_INVALID');
      const snapshot = await previewEntryResume(request.runId, configuration,
        request.patch === undefined ? {} : { patch: structuredClone(request.patch) });
      if (snapshot.manifestSha256 !== request.expectedManifestSha256) throw Error('ENTRY_RESUME_CHANGED');
      const binding = entryResumeApprovalBinding(snapshot, configuration, { executionStages });
      const ticket = await host.issue(binding);
      return await execute({ id: snapshot.runId, retry: true, inputs: JSON.stringify(binding.inputs),
        approval: { snapshot, ticket } }, options);
    } catch (error) {
      throw Error(/^ENTRY_[A-Z_]+$/.test(error.message ?? '') ? error.message : 'ENTRY_HOST_EXECUTION_REJECTED');
    }
  };
  start.confirmPlan = async request => {
    try {
      if (!request || Object.keys(request).sort().join(',') !== 'expectedManifestSha256,planDigest,runId')
        throw Error('ENTRY_PLAN_CONFIRM_REQUEST_INVALID');
      const snapshot = await previewEntryResume(request.runId, configuration, { planDigest: request.planDigest });
      if (snapshot.manifestSha256 !== request.expectedManifestSha256) throw Error('ENTRY_RESUME_CHANGED');
      const binding = entryResumeApprovalBinding(snapshot, configuration, { executionStages });
      const ticket = await host.issue(binding);
      return await execute({ id: snapshot.runId, inputs: JSON.stringify(binding.inputs), approval: { snapshot, ticket } }, options);
    } catch (error) {
      throw Error(/^ENTRY_[A-Z_]+$/.test(error.message ?? '') ? error.message : 'ENTRY_HOST_EXECUTION_REJECTED');
    }
  };
  return start;
}

// Explicit offline dependency seam, not an authentication or production API.
// Functions can only come from trusted test code, never deserialized task data.
export async function createOfflineEntryBootstrap({ directory, dialog, executor, workerRun, executionStages } = {}) {
  if (typeof dialog !== 'function' ||
      !((typeof executor === 'function' && workerRun === undefined) ||
        (typeof workerRun === 'function' && executor === undefined)))
    throw Error('ENTRY_OFFLINE_DEPENDENCIES_REQUIRED');
  return compose({ directory, executionStages,
    stage4ReadinessCapability: OFFLINE_STAGE4_READINESS_CAPABILITY,
    executor: executor ?? createSkillExecutor({ run: workerRun, browserHumanDialog: false }),
    humanOptions: { platform: 'darwin', dialog } });
}

export async function createProductionEntryBootstrap(options) {
  if (options !== undefined) throw Error('ENTRY_HOST_CONFIGURATION_UNSUPPORTED');
  const policy = await loadEntryHostPolicy();
  await requireVerifiedHostRuntime(policy);
  return compose({ directory: join(AGENT_ROOT, 'host-approval-store'),
    executionStages: undefined, humanOptions: {},
    executor: createSkillExecutor({ command: policy.cli.path, commandIdentity: policy.cli,
      codeModeHostIdentity: policy.codeModeHost,
      browserHumanDialog: true, collectHomepageSourceEvidence: collectIndexedOfficialSources,
      inspectHomepageReadiness: inspectHomepageMediaReadiness,
      collectHomepageMediaEvidence: collectTrustedHomepageMedia }) });
}
