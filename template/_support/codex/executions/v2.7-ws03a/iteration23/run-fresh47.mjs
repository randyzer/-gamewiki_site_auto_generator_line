import {spawn,execFileSync} from 'node:child_process';
import {join,relative,resolve} from 'node:path';
import {readdirSync,existsSync,lstatSync,realpathSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {root,contract,read,sourceManifest,alive} from '../../v2.7-ws06a/iteration22/finalize-readiness-audit.mjs';
const out='/Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws03a/iteration23';
const save=(n,d)=>writeFileSync(join(out,n),JSON.stringify(d,null,2)+'\n');
async function main(){
 if(existsSync(join(out,'fresh47-command-result.json'))||existsSync(join(out,'fresh47/core-browser-evidence.json')))throw Error('One attempt already used');
 const triad=read(join(out,'triad-post-identity.json')),tool=read(join(out,'current-tool-engine-host-identity.json')),starter=triad.triad.GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE;
 if(sourceManifest(root)!==starter.workingTreeSha256)throw Error('Current source drift');
 const logicalRoot=execFileSync('mktemp',['-d','/tmp/c2c23b.XXXXXX'],{encoding:'utf8'}).trim(),realRoot=realpathSync(logicalRoot),s=lstatSync(logicalRoot);
 if(!/^\/tmp\/c2c23b\.[A-Za-z0-9]+$/.test(logicalRoot)||!/^\/(?:private\/)?tmp\/c2c23b\.[A-Za-z0-9]+$/.test(realRoot)||s.isSymbolicLink()||!s.isDirectory()||s.uid!==process.getuid()||readdirSync(logicalRoot).length)throw Error('Unowned TMPDIR');
 save('fresh47-owned-tmp-audit.json',{logicalRoot,realRoot,createdAt:new Date().toISOString(),createdByObserverPid:process.pid,fresh:true,owned:true,short:true,closed:false});
 let log='',capture=null,prior=null,observerErrors=[],exited=false,previewPid=null;
 const start=new Date().toISOString(),child=spawn('npm',['run','check:browser'],{cwd:root,env:{...process.env,TMPDIR:logicalRoot,CORE_BROWSER_CONTRACT_MODE:'FILE_SHA256',CORE_BROWSER_CONTRACT_PATH:contract,CORE_BROWSER_EVIDENCE_DIR:join(out,'fresh47')},stdio:['ignore','pipe','pipe']});
 const startedPid=child.pid;
 function observe(){
  if(capture||exited)return;
  try{
   const dirs=readdirSync(logicalRoot).filter(n=>n.startsWith('starter-adoption-verification-'));if(dirs.length>1)throw Error('Multiple owned fixtures');if(!dirs.length)return;
   const fixture=join(logicalRoot,dirs[0]),fixtureRealPath=realpathSync(fixture),fs=lstatSync(fixture);
   if(fs.isSymbolicLink()||!fs.isDirectory()||!fixtureRealPath.startsWith(realRoot+'/'))throw Error('Fixture alias/escape');
   const m=log.match(/\(pid (\d+)\)/);if(!m||!existsSync(join(fixture,'dist/index.html')))return;
   previewPid=Number(m[1]);if(!alive(previewPid))throw Error('Preview gone before capture');
   const pidCwd=execFileSync('lsof',['-a','-p',String(previewPid),'-d','cwd','-Fn'],{encoding:'utf8'}).split('\n').find(s=>s.startsWith('n'))?.slice(1);
   if(!pidCwd||realpathSync(pidCwd)!==fixtureRealPath)throw Error('Preview cwd mismatch');
   if(existsSync(join(out,'fresh47/core-browser-evidence.json')))throw Error('Report exists before capture');
   const sample={observedAt:new Date().toISOString(),fixtureSourceSha256:sourceManifest(fixture),distSha256:sourceManifest(join(fixture,'dist'))};
   if(prior&&sample.fixtureSourceSha256===prior.fixtureSourceSha256&&sample.distSha256===prior.distSha256){capture={ownedTmpRoot:logicalRoot,fixtureRealPath,fixtureLogicalPath:fixture,previewPid,pidCwd,fixtureSourceSha256:sample.fixtureSourceSha256,distSha256:sample.distSha256,firstStableObservedAt:prior.observedAt,secondStableObservedAt:sample.observedAt,sourceStable:true,distStable:true,modifiedByObserver:false,reportExistedAtCapture:false};save('fresh47-fixture-capture.json',capture);}else prior=sample;
  }catch(e){observerErrors.push(String(e));}
 }
 child.stdout.on('data',b=>{log+=b;writeFileSync(join(out,'fresh47-browser-run.log'),log);});child.stderr.on('data',b=>{log+=b;writeFileSync(join(out,'fresh47-browser-run.log'),log);});
 const timer=setInterval(observe,250);
 const exitCode=await new Promise((r,j)=>{child.once('error',j);child.once('close',r);});exited=true;clearInterval(timer);writeFileSync(join(out,'fresh47-browser-run.log'),log);
 save('fresh47-command-result.json',{command:'npm run check:browser',startedAt:start,finishedAt:new Date().toISOString(),exitCode,qualificationAttempts:1,retryCount:0,qualificationChildPid:startedPid,childPidGone:!alive(startedPid),observerErrors,fixtureCaptured:!!capture});
 const clean=read(join(out,'fresh47/preview-cleanup-audit.json'));if(!capture||observerErrors.length)throw Error('Independent capture failed');
 if(alive(startedPid)||!clean.startedPid||alive(clean.startedPid)||existsSync(capture.fixtureRealPath))throw Error('Runner/preview/fixture not gone');
 const inventory=[];
 function inventoryTree(dir){for(const name of readdirSync(dir).sort()){const p=join(dir,name),s=lstatSync(p),type=s.isSymbolicLink()?'symlink':s.isDirectory()?'directory':s.isFile()?'regular-file':s.isSocket()?'socket':s.isFIFO()?'fifo':'other';inventory.push({relativePath:relative(logicalRoot,p),realPath:s.isSymbolicLink()?null:realpathSync(p),type,mode:s.mode&0o777,size:s.size,symlink:s.isSymbolicLink()});if(s.isDirectory()&&!s.isSymbolicLink())inventoryTree(p);}}
 inventoryTree(logicalRoot);save('fresh47-owned-tmp-inventory-before-cleanup.json',{logicalRoot,realRoot,observedAt:new Date().toISOString(),entries:inventory});
 const unknown=[],symlinks=inventory.filter(e=>e.symlink),escapes=inventory.filter(e=>e.realPath&&!e.realPath.startsWith(realRoot+'/'));
 const uid=process.getuid(),versionPrefix=process.version+'-'+process.arch+'-';
 for(const e of inventory){const parts=e.relativePath.split('/');let valid=false;
  if(parts[0]==='tsx-'+uid){valid=parts.length===1?e.type==='directory':parts.length===2&&((e.type==='regular-file'&&/^\d+-[0-9a-f]{40}$/.test(parts[1]))||(e.type==='socket'&&/^\d+\.pipe$/.test(parts[1])));}
  if(parts[0]==='node-compile-cache'){valid=parts.length===1?e.type==='directory':parts.length===2?e.type==='directory'&&parts[1].startsWith(versionPrefix)&&/^[A-Za-z0-9._-]+$/.test(parts[1].slice(versionPrefix.length)):parts.length===3&&parts[1].startsWith(versionPrefix)&&/^[A-Za-z0-9._-]+$/.test(parts[1].slice(versionPrefix.length))&&e.type==='regular-file'&&/^[0-9a-f]+$/.test(parts[2]);}
  if(!valid)unknown.push(e.relativePath);
 }
 const audit={logicalRoot,realRoot,runnerExited:true,previewPidGone:!alive(clean.startedPid),fixtureGone:!existsSync(capture.fixtureRealPath),inventoryCount:inventory.length,tsxTransformFiles:inventory.filter(e=>e.relativePath.startsWith('tsx-')&&e.type==='regular-file').length,tsxSockets:inventory.filter(e=>e.type==='socket').length,nodeCompileCacheFiles:inventory.filter(e=>e.relativePath.startsWith('node-compile-cache/')&&e.type==='regular-file').length,symlinksFound:symlinks.length,unknownEntries:unknown,pathEscapes:escapes.map(e=>e.relativePath),deletedEntries:[],rootRemoved:false,fallbackSignalUsed:false,status:'BLOCKED'};
 save('fresh47-owned-tmp-cleanup.json',audit);if(symlinks.length||unknown.length||escapes.length)throw Error('Unknown cache residue; retained');
 for(const e of inventory.filter(e=>e.type!=='directory')){unlinkSync(join(logicalRoot,e.relativePath));audit.deletedEntries.push(e.relativePath);}
 for(const e of inventory.filter(e=>e.type==='directory').sort((a,b)=>b.relativePath.split('/').length-a.relativePath.split('/').length)){rmdirSync(join(logicalRoot,e.relativePath));audit.deletedEntries.push(e.relativePath);}
 rmdirSync(logicalRoot);audit.rootRemoved=!existsSync(logicalRoot);audit.status='PASS';save('fresh47-owned-tmp-cleanup.json',audit);save('fresh47-owned-tmp-audit.json',{logicalRoot,realRoot,createdByObserverPid:process.pid,fresh:true,owned:true,short:true,closed:audit.rootRemoved,cleanupArtifact:'fresh47-owned-tmp-cleanup.json'});
 const expected={starter:{branch:starter.branch,head:starter.head,workingTreeSha256:starter.workingTreeSha256},canonicalContract:triad.canonicalContract,fixture:{identity:'Field Notes synthetic adoption',sourceSha256:capture.fixtureSourceSha256},build:{distSha256:capture.distSha256},playwright:tool.playwright,host:tool.host,engines:tool.engines};save('fresh47-expected-identity.json',expected);
 const raw=read(join(out,'fresh47/core-browser-evidence.json'));if(JSON.stringify(expected)!==JSON.stringify(raw.identity))throw Error('Independent expected differs; retained without alteration');
 console.log(JSON.stringify({qualificationExitCode:exitCode,rawOverall:raw.overall,rows:raw.rows.length,independentIdentityExact:true,ownedTmpClosed:true}));
}
main().catch(e=>{console.error(e);save('fresh47-observer-failure.json',{error:String(e),observedAt:new Date().toISOString()});process.exitCode=1;});
