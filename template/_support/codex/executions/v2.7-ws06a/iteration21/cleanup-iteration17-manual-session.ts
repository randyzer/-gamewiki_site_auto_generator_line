import {readFileSync,writeFileSync,existsSync,lstatSync,rmSync,realpathSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {join,basename} from 'node:path';
import {sourceManifest} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-ws06a-browser-closure';
const out=join(process.cwd(),'../../template/codex/executions/v2.7-ws06a/iteration21');
const session=JSON.parse(readFileSync(join(out,'../iteration17/keyboard-session.json'),'utf8'));
const alive=(pid:number)=>{try{process.kill(pid,0);return true;}catch{return false;}};
async function main(){
 const fixture=session.fixtureRoot,pid=session.previewPid;
 if(typeof fixture!=='string'||basename(fixture)!=='starter-adoption-verification-CgRiFy'||pid!==89278)throw Error('Unexpected owned session');
 const audit:any={recordedFixture:fixture,recordedPid:pid,capturedAt:new Date().toISOString(),pidAliveBefore:alive(pid),stopAttempted:false,fallbackSignalUsed:false,fixtureExistedBefore:existsSync(fixture)};
 if(existsSync(fixture)){
  if(lstatSync(fixture).isSymbolicLink()||!fixture.startsWith('/var/folders/'))throw Error('Unsafe owned fixture');
  audit.fixtureSourceSha256=sourceManifest(fixture);audit.distSha256=sourceManifest(join(fixture,'dist'));
  if(audit.fixtureSourceSha256!==session.identity.fixture.sourceSha256||audit.distSha256!==session.identity.build.distSha256)throw Error('Owned fixture identity mismatch');
 }
 if(audit.pidAliveBefore){
  if(!existsSync(fixture))throw Error('Alive PID without recorded fixture');
  audit.pidCwd=execFileSync('lsof',['-a','-p',String(pid),'-d','cwd','-Fn'],{encoding:'utf8'}).split('\n').find(s=>s.startsWith('n'))?.slice(1);
  if(!audit.pidCwd||realpathSync(audit.pidCwd)!==realpathSync(fixture))throw Error('Recorded PID cwd differs');
  audit.stopAttempted=true;const stop=spawnSync('npm',['run','preview','--','stop'],{cwd:fixture,encoding:'utf8',timeout:30000});
  writeFileSync(join(out,'old-iteration17-manual-cleanup.log'),(stop.stdout??'')+(stop.stderr??''));audit.astroStopExit=stop.status;
  if(stop.status!==0||stop.error)throw Error('Normal Astro stop failed');
  for(let i=0;i<20&&alive(pid);i++)await new Promise(r=>setTimeout(r,150));
  if(alive(pid))throw Error('Owned PID remains alive');
 }
 audit.pidAliveAfter=alive(pid);if(audit.pidAliveAfter)throw Error('PID still alive');
 if(existsSync(fixture))rmSync(fixture,{recursive:true});
 audit.fixtureRemaining=existsSync(fixture);audit.status='PASS';save(audit);console.log(JSON.stringify(audit,null,2));
}
function save(d:unknown){writeFileSync(join(out,'old-iteration17-manual-cleanup.json'),JSON.stringify(d,null,2)+'\n');}
main().catch(e=>{save({status:'BLOCKED',error:String(e),fixture:session.fixtureRoot,pid:session.previewPid,fallbackSignalUsed:false});console.error(e);process.exitCode=1;});
