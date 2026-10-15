import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { AGENT_ROOT } from './skill-lock.mjs';
import { inside, safePath, sha256 } from './files.mjs';
import { runBskCommand, bskFileIdentity } from './bsk-capability.mjs';
import { askMacHumanApproval } from './macos-human-approval.mjs';
import { approvedPage, createBskCommandGate } from './bsk-command-gate.mjs';
import { bindBrowserPolicy } from './bsk-policy.mjs';
import {sanitizeFaviconPublicControls} from './favicon-control-capture.mjs';

export function createBskToolService({context,policy,identity,approve,execute,
  allowFaviconTransfer=false,allowInitialFaviconDrop=false,initialDropSourcePath=null}) {
  policy = bindBrowserPolicy(policy, context.inputs);
  const bindings={};
  const gate=createBskCommandGate({context,policy,identity,approve,bindings,execute:async command=>{
    if(['upload-favicon','download-favicon'].includes(command.intent)&&!allowFaviconTransfer)
      throw Error('TRANSFER_CONTEXT_UNVERIFIABLE');
    const result=await execute(command);
    if(command.intent==='create-agent-window') {
      const data=JSON.parse(result.stdout);
      if(data.browser_instance_id!==policy.browserInstance||!Number.isInteger(data.agent_window_id)||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(data.session_id??''))throw Error('OWNED_SESSION_UNAVAILABLE');
      bindings.sessionId=data.session_id;bindings.windowId=data.agent_window_id;
    } else if(command.intent==='read-owned-tabs') {
      const tabs=JSON.parse(result.stdout).tabs;
      if(!Array.isArray(tabs))throw Error('OWNED_TAB_UNAVAILABLE');
      const candidates=tabs.filter(tab=>tab.scope==='agent'&&tab.window_id===bindings.windowId&&Number.isInteger(tab.tab_id));
      const tab=bindings.tabId?candidates.find(tab=>tab.tab_id===bindings.tabId):candidates.length===1?candidates[0]:null;
      if(!tab)throw Error('OWNED_TAB_UNAVAILABLE');
      bindings.tabId=tab.tab_id;bindings.url=tab.url;
      result.stdout=JSON.stringify({tabs:candidates});
    } else if(command.intent==='read-public-page') {
      const data=JSON.parse(result.stdout);
      if(data.tab_id!==bindings.tabId)throw Error('CAPTURE_CONTEXT_CHANGED');
      bindings.url=approvedPage(data.final_url??data.url,policy);
    } else if(command.intent==='capture-public-page') {
      const response=JSON.parse(result.stdout)?.value;
      if(bindings.url==='https://favicon.io/favicon-converter/'&&
         response?.sourceSchema==='FAVICON_PUBLIC_CONTROLS_V1')
        {
          const vetted=sanitizeFaviconPublicControls(response);
          bindings.transferTargets=[
            ...vetted.controls,
            ...(vetted.chooserTrigger?[vetted.chooserTrigger]:[]),
            ...(vetted.dropTarget?[vetted.dropTarget]:[])
          ];
          // Only a freshly created, trusted HOST-TEST service may pre-authorize
          // a single drop-first attempt. No worker-provided flag can enable it.
          if(allowInitialFaviconDrop && allowFaviconTransfer &&
            policy.atomicFileTransferSupported===true &&
            !bindings.initialDropIssued && !bindings.anyUploadAttempt &&
            vetted.dropTarget?.selector==='[class*="dropzone"]' &&
            vetted.inspection?.fileInputMatches===1 &&
            vetted.inspection?.fileInputDisabled===false &&
            vetted.inspection?.dropzoneClassCount===1 &&
            vetted.inspection?.dropzoneRendered===true &&
            vetted.inspection?.dropzoneContainsInput===true &&
            typeof initialDropSourcePath==='string' &&
            resolve(initialDropSourcePath)===initialDropSourcePath &&
            initialDropSourcePath.startsWith(context.nativeDirectory+'/')) {
            await safePath(initialDropSourcePath,[context.nativeDirectory]);
            const bytes=await readFile(initialDropSourcePath);
            bindings.initialDropAuthorization={
              sourcePath:initialDropSourcePath,inputSha256:sha256(bytes),
              sessionId:bindings.sessionId,tabId:bindings.tabId,
              url:bindings.url,expiresAt:Date.now()+120000
            };
            bindings.initialDropIssued=true;
          }
        }
      else delete bindings.transferTargets;
    } else if(command.intent==='close-owned-session') {
      for(const key of Object.keys(bindings))delete bindings[key];
    }
    return result;
  }});
  const tool={name:'bsk_command',description:'Fixed bsk commands require independent host human approval for each exact command. Launch permission never approves a command. Without a supported host approval capability all calls fail closed. argv: --version; status --json; session start/stop; tab list; navigate HTTPS_URL; observe; snapshot. Session/tab flags are host-owned. Public reads only expose verified typed Steam fields for the current task game; unsupported content is blocked. Real uploads/downloads remain blocked. No arbitrary JS or private pages.',
    inputSchema:{type:'object',properties:{requestId:{type:'string'},argv:{type:'array',items:{type:'string'}}},required:['requestId','argv'],additionalProperties:false}};
  return {
    async handle(message) {
      if(!message||typeof message!=='object'||!Object.hasOwn(message,'id'))return null;
      let result;
      if(message.method==='initialize')result={protocolVersion:'2025-11-25',capabilities:{tools:{}},serverInfo:{name:'scoped-game-bsk',version:'1.1.0'}};
      else if(message.method==='ping')result={};
      else if(message.method==='tools/list')result={tools:[tool]};
      else if(message.method==='tools/call'&&message.params?.name===tool.name) {
        try {
          const args=message.params.arguments?.argv;
          const wasUpload=Array.isArray(args)&&args[0]==='upload';
          const wasDrop=wasUpload&&args[1]==='[class*="dropzone"]';
          let outcome;
          try {outcome=await gate(message.params.arguments);}
          finally {
            if(wasUpload)bindings.anyUploadAttempt=true;
            if(wasDrop) {
              delete bindings.dropFallback;
              delete bindings.initialDropAuthorization;
            } // Both types are consumed even on refusal/error.
          }
          // Never infer that an upload did not happen from timeout or exit code.
          // Only the bsk-documented exact pair can authorize one further drop attempt.
          if(Array.isArray(args)&&args[0]==='upload'&&!wasDrop) {
            delete bindings.dropFallback;
            if(outcome.status!=='COMPLETED' &&
               outcome.bskReason==='file_input_not_activated' &&
               outcome.effectState==='none' &&
               bindings.transferTargets?.some(x=>x.kind==='upload'&&x.selector==='[class*="dropzone"]')) {
              const requestId=message.params.arguments?.requestId;
              if(/^[a-zA-Z0-9_-]{1,100}$/.test(requestId??'')) {
                const auditFile=join(context.runDirectory,'bsk-audit',requestId+'.json');
                await safePath(auditFile,[context.runDirectory]);
                let audit;
                try {audit=JSON.parse(await readFile(auditFile,'utf8'));}
                catch {audit=null;}
                if(audit?.command?.intent==='upload-favicon' &&
                  audit.command.expectedArtifact===args[3] &&
                  audit.decision?.status==='APPROVED' &&
                  /^[a-f0-9]{64}$/.test(audit.command.inputSha256??'')) {
                  bindings.dropFallback={
                    sourcePath:args[3],inputSha256:audit.command.inputSha256,
                    sessionId:bindings.sessionId,tabId:bindings.tabId,
                    url:bindings.url,expiresAt:Date.now()+60000
                  };
                }
              }
            }
          }
          result={content:[{type:'text',text:JSON.stringify(outcome)}],isError:outcome.status!=='COMPLETED'};
        } catch {
          result={content:[{type:'text',text:'COMMAND_NOT_APPROVED_OR_CAPABILITY_UNAVAILABLE'}],isError:true};
        }
      } else return {jsonrpc:'2.0',id:message.id,error:{code:-32601,message:'Method unavailable'}};
      return {jsonrpc:'2.0',id:message.id,result};
    },
    async close() {
      if(!bindings.sessionId)return {status:'NO_OWNED_SESSION'};
      // Cleanup also needs its own command approval; launch permission is insufficient.
      return gate({requestId:randomUUID(),argv:['session','stop']});
    }
  };
}

export function startBskStdioService(service,{input=process.stdin,output=process.stdout}={}) {
  let queue=Promise.resolve(),closing;
  const lines=createInterface({input,crlfDelay:Infinity});
  const send=value=>{if(value)output.write(JSON.stringify(value)+'\n');};
  lines.on('line',line=>{
    if(line.length>16384)return;
    let message;try {message=JSON.parse(line);} catch {return;}
    queue=queue.then(async()=>send(await service.handle(message))).catch(()=>{
      if(message&&Object.hasOwn(message,'id'))send({jsonrpc:'2.0',id:message.id,error:{code:-32603,message:'Command unavailable'}});
    });
  });
  const close=()=>closing??=queue.then(()=>service.close()).catch(()=>({status:'CLEANUP_UNAVAILABLE'}));
  let complete;
  const done=new Promise(resolveDone=>{complete=resolveDone;});
  lines.on('close',()=>close().then(complete));
  return {done,close:async()=>{lines.close();const result=await close();complete(result);return result;}};
}

async function main() {
  const contextFile=process.argv[2];
  await safePath(contextFile,[join(AGENT_ROOT,'runs')]);
  const context=JSON.parse(await readFile(contextFile,'utf8')),expectedRun=join(AGENT_ROOT,'runs',context.runId);
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(context.runId)||context.runDirectory!==expectedRun||
    !inside(expectedRun,context.nativeDirectory)||inside(context.nativeDirectory,contextFile))throw Error('Unsafe host browser context');
  await safePath(context.nativeDirectory,[expectedRun]);
  const policyBytes=await readFile(join(AGENT_ROOT,'config/bsk-command-policy.json'),'utf8');
  const policy=JSON.parse(policyBytes),approval=context.launchApproval;
  if(approval?.type!=='scoped-bsk-launch'||approval.runId!==context.runId||!Number.isFinite(approval.expiresAt)||
    approval.expiresAt<=Date.now()||approval.policySha256!==sha256(policyBytes))throw Error('SCOPED_BROWSER_LAUNCH_NOT_APPROVED');
  // The current host exposes no approval broker to this stdio process. Never
  // accept worker-supplied receipts or reinterpret launch approval as execution approval.
  // Host-only opt-in exposes a REAL macOS user dialog. The worker has no approval callback.
  // Setting the flag cannot approve anything: every command requires a live human click.
  const humanDialog = process.env.GAME_SITE_BROWSER_HUMAN_DIALOG === 'enabled';
  const identity=await bskFileIdentity(policy);
  const service=createBskToolService({context,policy,identity,
    approve:humanDialog?askMacHumanApproval:undefined,execute:runBskCommand});
  const stdio=startBskStdioService(service);
  process.once('SIGTERM',()=>stdio.close());process.once('SIGINT',()=>stdio.close());
  const cleanup=await stdio.done;
  if(!['NO_OWNED_SESSION','COMPLETED'].includes(cleanup.status))process.stderr.write('OWNED_WINDOW_CLEANUP_NOT_COMPLETED\n');
  process.stdin.destroy();
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
