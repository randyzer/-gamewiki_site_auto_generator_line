import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { sha256 } from './files.mjs';

const exec = promisify(execFile);
const SCRIPT = `on run argv
  try
    set answer to display dialog (item 1 of argv) with title "Game Site Agent: Entry Approval" buttons {"Deny", "Approve"} default button "Deny" cancel button "Deny" giving up after 50
    if gave up of answer is true then return "DENIED"
    if button returned of answer is "Approve" then return item 2 of argv
    return "DENIED"
  on error
    return "DENIED"
  end try
end run`;
const nativeDialog = ({ message, challenge, script }) => exec('/usr/bin/osascript',
  ['-e', script, '--', message, challenge], { timeout: 60000, maxBuffer: 8192 });

// Only trusted bootstrap may inject dependencies. Never expose this factory or
// its options through task JSON, model tools, or worker configuration.
// This confirms a local operator interaction, NOT an independent OS identity.
export function createMacEntryHumanAuthorize({ dialog = nativeDialog, now = Date.now,
  platform = process.platform, timeoutMs = 60000 } = {}) {
  return async binding => {
    if (platform !== 'darwin' || typeof dialog !== 'function' ||
        !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60000) return null;
    let captured, bytes, message;
    try {
      captured = structuredClone(binding);
      const s = captured.snapshot;
      const resume = captured.purpose === 'resume-pipeline-only';
      const confirmPlan = resume && s.action === 'CONFIRM_DEPLOYMENT_PLAN';
      if (!['configuration,inputs,kind,purpose,releaseAuthorized,snapshot',
          'configuration,executionStages,inputs,kind,purpose,releaseAuthorized,snapshot'].includes(Object.keys(captured).sort().join(',')) ||
          captured.kind !== 'ENTRY_HOST_APPROVAL_V1' || !['fresh-pipeline-only', 'resume-pipeline-only'].includes(captured.purpose) ||
          captured.releaseAuthorized !== false ||
          (resume ? s.kind !== 'ENTRY_RESUME_PREVIEW_ONLY' || !/^[a-f0-9]{64}$/.test(s.manifestSha256 ?? '') ||
            !Number.isSafeInteger(s.attempt) || s.attempt < 0 || !Array.isArray(s.stages) || !s.stages.includes(s.currentStage)
            : !Number.isSafeInteger(s.revision) || s.revision < 1) ||
          ![s.runId, s.executionRunId].every(id => /^[A-Za-z0-9_-]{1,100}$/.test(id ?? '')) ||
          typeof s.workspace !== 'string' || !s.workspace.startsWith('/') ||
          typeof captured.configuration.workspace !== 'string' ||
          typeof captured.inputs.gameIdentity !== 'string' || !captured.inputs.gameIdentity.trim() ||
          !/^[a-f0-9]{64}$/.test(s.inventorySha256 ?? '') || !Array.isArray(s.skills) || !s.skills.length) return null;
      if (captured.executionStages !== undefined && (!Array.isArray(captured.executionStages) ||
          !captured.executionStages.length || JSON.stringify(captured.executionStages) !==
          JSON.stringify(s.stages.slice(0, captured.executionStages.length)))) return null;
      // JSON escaping keeps embedded newlines/control characters from posing as labels.
      const quote = value => JSON.stringify(value).replace(/[\u007f-\u009f\u2028-\u202e\u2066-\u2069]/g,
        char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
      bytes = JSON.stringify(captured);
      message = [
        confirmPlan ? 'Confirm this deployment PLAN only? No worker, push, DNS change or release.'
          : resume ? 'Approve ONE pipeline resume from this exact checkpoint?' : 'Approve ONE fresh pipeline execution?',
        'Run: ' + quote(s.runId), 'Execution run: ' + quote(s.executionRunId),
        ...(resume ? ['Manifest SHA256: ' + s.manifestSha256, 'Stage / attempt: ' + quote(s.currentStage) + ' / ' + s.attempt,
          'Remaining stages: ' + quote(s.stages), 'Unknown in-progress effects: resume rejected; reconcile separately.']
          : ['Revision: ' + s.revision]),
        'Game: ' + quote(captured.inputs.gameIdentity),
        'Execution stages: ' + quote(captured.executionStages ?? s.stages ?? []),
        ...(s.action === 'UPDATE_INPUTS' ? ['Input before / after: ' + quote(s.diffs),
          'First invalidated stage: ' + quote(s.firstAffectedStage)] : []),
        ...(confirmPlan ? ['Plan digest: ' + s.planDigest,
          'Domain / repo / branch: ' + quote([captured.inputs.domain, captured.inputs.repo, captured.inputs.branch]),
          'Provider / DNS plan: ' + quote([captured.inputs.deploymentProvider, captured.inputs.dns]),
          'Plan files and content (including risks and rollback): ' + quote(s.plans)] : []),
        'Workspace: ' + quote(s.workspace), 'Skill-lock SHA256: ' + s.inventorySha256,
        'Summary: ' + quote(captured.inputs.objective ?? ''),
        ...(confirmPlan ? ['Effects: Store plan acknowledgement and approval audit only. No worker or external action.']
          : [captured.executionStages?.length === 1
            ? 'Effects: Execute the homepage Skill only and write research artifacts; stop before template or later stages.'
            : 'Effects: Copy template and write isolated site; start existing Codex workers;',
            'browser, network and image tools still require separate command approval; write run logs and approval/input copies.']),
        'No release authorization: production push, deployment, DNS, indexing, analytics, ads and payments require separate approval.',
        'Binding SHA256: ' + sha256(bytes), 'Full binding: ' + quote(captured),
        'Deny is default. Closing or timeout denies. Local operator confirmation only; no independent OS authentication.'
      ].join('\n');
      // Never silently truncate the binding displayed to the operator.
      if (message.length > 24000) return null;
    } catch { return null; }
    const challenge = randomUUID() + ':' + sha256(bytes);
    let timer;
    try {
      const response = await Promise.race([
        Promise.resolve().then(() => dialog({ message, challenge, script: SCRIPT })),
        new Promise(resolve => { timer = setTimeout(() => resolve(null), timeoutMs); })
      ]);
      if (!response || typeof response.stdout !== 'string' || response.stdout.trim() !== challenge) return null;
      const at = now();
      if (!Number.isSafeInteger(at) || !Number.isSafeInteger(at + 60000)) return null;
      return { approver: 'local-macos-interactive-operator', approvedAt: at, expiresAt: at + 60000 };
    } catch { return null; }
    finally { clearTimeout(timer); }
  };
}
