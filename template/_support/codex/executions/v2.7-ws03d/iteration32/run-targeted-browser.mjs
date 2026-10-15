import {spawn,execFileSync} from 'node:child_process';import {join} from 'node:path';import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {cleanupOwnedCaches} from './owned-cache-cleanup.mjs';
const root='/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE',out=join(root,'../../template/codex/executions/v2.7-ws03d/iteration32');
const alive=p=>{try{process.kill(p,0);return true;}catch{return false;}};
const read=p=>JSON.parse(readFileSync(p,'utf8'));
async function main(){
 if(existsSync(join(out,'freshness-browser-command-result.json')))throw Error('Targeted qualification attempt already used');
 const tmp=execFileSync('mktemp',['-d','/tmp/c2c32a.XXXXXX'],{encoding:'utf8'}).trim();let log='';
 const child=spawn(join(root,'node_modules/.bin/tsx'),[join(out,'browser-freshness.ts')],{cwd:root,env:{...process.env,TMPDIR:tmp},stdio:['ignore','pipe','pipe']});const startedPid=child.pid;
 child.stdout.on('data',b=>{log+=b;});child.stderr.on('data',b=>{log+=b;});const exitCode=await new Promise((r,j)=>{child.once('error',j);child.once('close',r);});writeFileSync(join(out,'freshness-browser-run.log'),log);writeFileSync(join(out,'freshness-browser-command-result.json'),JSON.stringify({exitCode,command:'tsx iteration32/browser-freshness.ts',targetedAttempts:read(join(out,'freshness-browser-evidence.json')).qualificationAttempts,diagnosticSessions:0,retryCount:0,childPid:startedPid,childGone:!alive(startedPid),ownedTmpRoot:tmp},null,2)+'\n');
 const clean=read(join(out,'freshness-cleanup.json')),id=read(join(out,'freshness-fixture-identity.json'));
 const cacheOut=join(out,'freshness-tmp-cleanup');mkdirSync(cacheOut);const save=(n,d)=>writeFileSync(join(cacheOut,n),JSON.stringify(d,null,2)+'\n');
 cleanupOwnedCaches(tmp,save,{runnerExited:!alive(startedPid),previewPidGone:!alive(clean.startedPid),fixtureGone:!existsSync(id.fixtureRoot)},'c2c32a');
 if(exitCode!==0)throw Error('Targeted browser FAIL; inspect preserved evidence');console.log('WS03D freshness PASS; targeted owned TMPDIR safely closed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
