import { readFile, realpath } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { sha256 } from './files.mjs';
import {safeBskUploadEffect} from './bsk-effect-state.mjs';

const exec = promisify(execFile);
export async function bskFileIdentity(policy) {
  const executable = await realpath(policy.executable);
  if (executable !== policy.executable || sha256(await readFile(executable)) !== policy.sha256) throw Error('BSK_EXECUTABLE_CHANGED');
  return {executable,version:policy.version,sha256:policy.sha256};
}
export async function bskIdentity(policy) {
  const identity=await bskFileIdentity(policy);
  const {stdout}=await exec(identity.executable,['--version'],{timeout:5000});
  if(stdout.trim()!=='bsk '+policy.version)throw Error('BSK_VERSION_CHANGED');
  return identity;
}
export async function runBskCommand(command) {
  // No shell interpolation and no inherited service credentials.
  const env = Object.fromEntries(['PATH','HOME','TMPDIR','LANG','LC_ALL'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]));
  env.BSK_AUTO_START='0';
  try {
    const {stdout}=await exec(command.executable,command.argv,{cwd:command.cwd,env,timeout:command.timeoutMs,maxBuffer:1024*1024,killSignal:'SIGKILL'});
    return {stdout};
  } catch(error) {
    if(['upload-favicon','download-favicon'].includes(command.intent)){
      // Prefer typed CLI stdout, then typed CLI stderr. Never parse arbitrary
      // log text or page-controlled fields as a transfer effect.
      const first=safeBskUploadEffect(error.stdout);
      const second=safeBskUploadEffect(error.stderr);
      error.safeBskReason=first.reason!=='UNVERIFIED'?first.reason:second.reason;
      error.safeEffectState=first.effectState!=='unverified'?first.effectState:second.effectState;
    }
    throw error;
  }
}
