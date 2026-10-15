import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';

// Native macOS dialogs are the HUMAN approval surface, not worker-provided receipts.
// The MCP worker never gets approve() or a way to supply a receipt.
const exec = promisify(execFile);
const ALLOWED_INTENTS = new Set([
  'read-version','read-status','create-agent-window','read-owned-tabs',
  'read-public-page','capture-public-page','close-owned-session',
  'upload-favicon','download-favicon'
]);
const APPROVAL_SCRIPT = `
on run argv
  set promptText to item 1 of argv
  try
    set answer to display dialog promptText with title "Game Site Agent: Browser Approval" buttons {"Deny", "Approve"} default button "Deny" cancel button "Deny" giving up after 50
    if gave up of answer is true then return "DENIED"
    if button returned of answer is "Approve" then return "APPROVED"
    return "DENIED"
  on error
    return "DENIED"
  end try
end run
`;

function approvalMessage(command) {
  const safe = value => String(value ?? '').replace(/[\x00-\x1f\x7f]/g,' ').slice(0,180);
  const isTransfer=['upload-favicon','download-favicon'].includes(command.intent);
  return [
    isTransfer ? 'Approve ONE exact test favicon.io FILE TRANSFER?' :
      'Approve ONE exact, read-only browser command?',
    '',
    'Run: ' + safe(command.runId),
    'Stage: ' + safe(command.stage),
    'Action: ' + safe(command.intent),
    'Target: ' + safe(command.target || '(local browser status/session)'),
    'Command digest: ' + safe(command.digest),
    ...(isTransfer ? [
      'Upload mechanism: ' + safe(command.argv?.includes('--mode') ?
        command.argv[command.argv.indexOf('--mode')+1] : 'not applicable'),
      'Test file: ' + safe(command.expectedArtifact || '(host test path)'),
      'Upload SHA256: ' + safe(command.inputSha256 || '(download result checked after transfer)')
    ] : []),
    '',
    'DENY is the default. Timeout or closing this window denies.',
    isTransfer ?
      'This action transfers a synthetic test asset with favicon.io. No other uploads or downloads authorized.' :
      'This approval does not authorize uploads, downloads, writing sites or publishing.'
  ].join('\n');
}

export async function askMacHumanApproval(command, {
  dialog = async (message) => exec('/usr/bin/osascript',
    ['-e', APPROVAL_SCRIPT, '--', message], { timeout: 60000, maxBuffer: 8192 }),
  now = Date.now,
  approvedBy = 'local-macos-interactive-user'
} = {}) {
  if(process.platform!=='darwin') return null;
  if(!command || !ALLOWED_INTENTS.has(command.intent) ||
    typeof command.digest!=='string' || !/^[a-f0-9]{64}$/.test(command.digest) ||
    typeof command.runId!=='string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(command.runId) ||
    typeof command.stage!=='string' || !command.stage) return null;
  let response;
  try { response = await dialog(approvalMessage(command)); }
  catch { return null; } // GUI absent, timeout and AppleScript failures all deny.
  if(typeof response !== 'object' || response.stdout?.trim() !== 'APPROVED') return null;
  const at = now();
  if(!Number.isFinite(at)) return null;
  return {
    approved: true, type: 'bsk-command-approval',
    runId: command.runId, stage: command.stage, commandDigest: command.digest,
    approvedBy, approvedAt: at, expiresAt: at + 30000,
    executionId: randomUUID()
  };
}

export async function askMacBrowserLaunch({runId,stage,policySha256},{
  dialog=async message => exec('/usr/bin/osascript',
    ['-e',APPROVAL_SCRIPT,'--',message],{timeout:60000,maxBuffer:8192})
}={}) {
  if(process.platform!=='darwin' || !/^[A-Za-z0-9_-]{1,100}$/.test(runId??'') ||
     typeof stage!=='string' || !stage.startsWith('game-') ||
     !/^[a-f0-9]{64}$/.test(policySha256??'')) return false;
  const message=[
    'Start ONE isolated browser-research worker?',
    'Run: '+runId,'Stage: '+stage,'Policy SHA256: '+policySha256,
    'This only permits worker launch. EVERY individual browser command',
    'will require a separate approval dialog. Deny is the default.',
    'No deployment, DNS, GitHub writing, advertising or file transfers.'
  ].join('\n');
  try {return (await dialog(message))?.stdout?.trim()==='APPROVED';}
  catch {return false;}
}

export async function askMacFaviconTestLaunch({runId,policySha256},{
  dialog=async message=>{
    const {execFile}=await import('node:child_process');
    const {promisify}=await import('node:util');
    const run=promisify(execFile);
    const source='on run argv\ntry\nset a to display dialog (item 1 of argv) with title "Game Site Agent: Favicon Test" buttons {"Deny", "Approve"} default button "Deny" cancel button "Deny" giving up after 50\nif gave up of a is true then return "DENIED"\nif button returned of a is "Approve" then return "APPROVED"\nreturn "DENIED"\non error\nreturn "DENIED"\nend try\nend run';
    return run('/usr/bin/osascript',['-e',source,'--',message],{timeout:60000,maxBuffer:4096});
  }
}={}){
  if(process.platform!=='darwin'||!/^[a-zA-Z0-9_-]{1,100}$/.test(runId??'')||
    !/^[a-f0-9]{64}$/.test(policySha256??''))return false;
  const message=['Approve ONE isolated favicon.io test session?',
    'Run: '+runId,'Policy SHA256: '+policySha256,
    'A SYNTHETIC transparent 512px PNG will be uploaded to https://favicon.io/favicon-converter/ .',
    'The browser may download a test ZIP into this run only.',
    'Every browser command, upload, download and close still needs a SEPARATE approval.',
    'Deny or timeout stops the test. No website modifications or deployment.'].join('\n');
  try{return (await dialog(message))?.stdout?.trim()==='APPROVED';}
  catch{return false;}
}
