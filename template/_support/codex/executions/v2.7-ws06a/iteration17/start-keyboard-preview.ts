import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { sourceManifest } from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-ws06a-browser-closure';
const out=join(process.cwd(),'../../template/codex/executions/v2.7-ws06a/iteration17');
const session=JSON.parse(readFileSync(join(out,'keyboard-session.json'),'utf8'));
const alive=(pid:number)=>{try{process.kill(pid,0);return true;}catch(error){if((error as NodeJS.ErrnoException).code==='ESRCH')return false;throw error;}};
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function main(){
  if(session.state!=='PREPARED_NOT_STARTED'||session.previewPid!==null)throw Error('Existing session must not be duplicated');
  if(sourceManifest(process.cwd())!==session.identity.starter.workingTreeSha256||sourceManifest(session.fixtureRoot)!==session.identity.fixture.sourceSha256||sourceManifest(join(session.fixtureRoot,'dist'))!==session.identity.build.distSha256)throw Error('Prepared identity changed');
  const server=createServer();await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  const port=(server.address() as {port:number}).port;await new Promise<void>(r=>server.close(()=>r()));
  const url='http://127.0.0.1:'+port;
  const result=spawnSync('npm',['run','preview','--','--background','--host','127.0.0.1','--port',String(port)],{cwd:session.fixtureRoot,encoding:'utf8',timeout:30000});
  console.log(result.stdout);console.error(result.stderr);
  const pid=Number(result.stdout?.match(/\(pid (\d+)\)/)?.[1]);
  if(!pid||result.status!==0)throw Error('Cannot bind own manual preview');
  session.previewPid=pid;session.url=url;session.state='STARTING';
  writeFileSync(join(out,'keyboard-session.json'),JSON.stringify(session,null,2)+'\n');
  let ready=false;
  for(let i=0;i<60;i++){
    if(!alive(pid))break;
    try{if((await fetch(url)).status===200){ready=true;break;}}catch{}
    await delay(100);
  }
  if(!ready){
    const stop=spawnSync('npm',['run','preview','--','stop'],{cwd:session.fixtureRoot,encoding:'utf8',timeout:15000});
    session.state='START_FAILED';session.stopExit=stop.status;session.pidAliveAfterStop=alive(pid);
    writeFileSync(join(out,'keyboard-session.json'),JSON.stringify(session,null,2)+'\n');throw Error('Manual preview readiness failed');
  }
  session.state='READY_FOR_REAL_KEYBOARD';session.preparedAt=new Date().toISOString();
  session.note='Owned preview intentionally available for exact real Safari keyboard capture; normal stop and independent PID/fixture cleanup required afterwards. No Safari evidence or PASS recorded.';
  writeFileSync(join(out,'keyboard-session.json'),JSON.stringify(session,null,2)+'\n');
  console.log('Manual session ready',url,'pid',pid);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
