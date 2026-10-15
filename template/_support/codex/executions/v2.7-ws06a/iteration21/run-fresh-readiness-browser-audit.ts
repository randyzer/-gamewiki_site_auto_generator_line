import {spawn,execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync,lstatSync,realpathSync,rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {sourceManifest} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-ws06a-browser-closure';
const out=join(process.cwd(),'../../template/codex/executions/v2.7-ws06a/iteration21');
const save=(n:string,d:unknown)=>writeFileSync(join(out,n),JSON.stringify(d,null,2)+'\n');
async function main(){
 const triad=JSON.parse(readFileSync(join(out,'current-triad-identity.json'),'utf8'));
 const tool=JSON.parse(readFileSync(join(out,'current-tool-engine-host-identity.json'),'utf8'));
 const starter=triad.triad.GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE;
 if(sourceManifest(process.cwd())!==starter.workingTreeSha256)throw Error('Pre-run source drift');
 const tmp=join(out,'owned-tmp');mkdirSync(tmp);if(readdirSync(tmp).length)throw Error('Nonempty owned TMPDIR');
 const rawPath=join(out,'browser-evidence/core-browser-evidence.json');if(existsSync(rawPath))throw Error('Evidence path not fresh');
 let log='',capture:any=null,observerErrors:string[]=[];
 const startedAt=new Date().toISOString();
 const child=spawn('npm',['run','check:browser'],{cwd:process.cwd(),env:{...process.env,TMPDIR:tmp},stdio:['ignore','pipe','pipe']});
 function observe(){
  if(capture||!log.match(/\(pid (\d+)\)/))return;
  try{
   const pid=Number(log.match(/\(pid (\d+)\)/)![1]),dirs=readdirSync(tmp).filter(n=>n.startsWith('starter-adoption-verification-'));
   if(dirs.length!==1)throw Error('Owned TMPDIR fixture count '+dirs.length);
   const fixture=join(tmp,dirs[0]);if(lstatSync(fixture).isSymbolicLink())throw Error('Owned fixture symlink');
   const pidCwd=execFileSync('lsof',['-a','-p',String(pid),'-d','cwd','-Fn'],{encoding:'utf8'}).split('\n').find(s=>s.startsWith('n'))?.slice(1);
   if(!pidCwd||realpathSync(pidCwd)!==realpathSync(fixture))throw Error('Fresh PID cwd mismatch');
   const reportExistedAtCapture=existsSync(rawPath);if(reportExistedAtCapture)throw Error('Raw report already exists');
   capture={capturedAt:new Date().toISOString(),reportExistedAtCapture,actualQualificationBuildRoot:fixture,ownedTmpRoot:tmp,previewPid:pid,pidCwd,fixtureSourceSha256:sourceManifest(fixture),distSha256:sourceManifest(join(fixture,'dist')),method:'Independent physical manifests of unique owned runner fixture after final build/preview start; captured before report exists; no fixture mutation.'};
   save('independent-fixture-capture.json',capture);
  }catch(e){observerErrors.push(String(e));}
 }
 child.stdout.on('data',b=>{log+=b.toString();writeFileSync(join(out,'browser-run.log'),log);observe();});
 child.stderr.on('data',b=>{log+=b.toString();writeFileSync(join(out,'browser-run.log'),log);});
 const exit=await new Promise<number|null>((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 save('browser-command-result.json',{command:'npm run check:browser',startedAt,finishedAt:new Date().toISOString(),exitCode:exit,observerErrors,fixtureCaptured:!!capture});
 if(!capture||observerErrors.length)throw Error('Independent capture failed: '+observerErrors.join(';'));
 if(existsSync(capture.actualQualificationBuildRoot)||readdirSync(tmp).length)throw Error('Runner fixture cleanup incomplete');rmdirSync(tmp);
 const expected={starter:{branch:starter.branch,head:starter.head,workingTreeSha256:starter.workingTreeSha256},canonicalContract:triad.canonicalContract,fixture:{identity:'Field Notes synthetic adoption',sourceSha256:capture.fixtureSourceSha256},build:{distSha256:capture.distSha256},playwright:tool.playwright,host:tool.host,engines:tool.engines};
 save('independent-expected-identity.json',expected);
 const raw=JSON.parse(readFileSync(rawPath,'utf8'));
 if(JSON.stringify(raw.identity)!==JSON.stringify(expected))throw Error('Raw identity differs from independent expected');
 console.log(JSON.stringify({rawExitCode:exit,rawOverall:raw.overall,rows:raw.rows.length,independentIdentityExact:true,observerErrors}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
