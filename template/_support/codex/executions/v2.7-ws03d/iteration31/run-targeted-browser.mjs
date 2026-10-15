import {spawn,execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {cleanupOwnedCaches} from './owned-cache-cleanup.mjs';
const root='/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE',out=join(root,'../../template/codex/executions/v2.7-ws03d/iteration31');
const alive=p=>{try{process.kill(p,0);return true}catch{return false}};
const read=p=>JSON.parse(readFileSync(p,'utf8'));
async function main(){
 if(existsSync(join(out,'search-browser-command-result.json'))||existsSync(join(out,'search-browser-evidence.json')))throw Error('Targeted qualification attempt already used');
 const tmp=execFileSync('mktemp',['-d','/tmp/c2c31a.XXXXXX'],{encoding:'utf8'}).trim();let log='';
 const child=spawn(join(root,'node_modules/.bin/tsx'),[join(out,'browser-search.ts')],{cwd:root,env:{...process.env,TMPDIR:tmp},stdio:['ignore','pipe','pipe']});const pid=child.pid;
 child.stdout.on('data',b=>{log+=b;});child.stderr.on('data',b=>{log+=b;});const exitCode=await new Promise((r,j)=>{child.once('error',j);child.once('close',r)});writeFileSync(join(out,'search-browser-run.log'),log);
 const evidence=read(join(out,'search-browser-evidence.json')),clean=read(join(out,'search-cleanup.json')),ids=read(join(out,'search-fixture-identities.json'));
 writeFileSync(join(out,'search-browser-command-result.json'),JSON.stringify({exitCode,command:'tsx iteration31/browser-search.ts',targetedAttempts:evidence.qualificationAttempts,retryCount:0,childPid:pid,childGone:!alive(pid),ownedTmpRoot:tmp},null,2)+'\n');
 const cacheOut=join(out,'search-tmp-cleanup');mkdirSync(cacheOut);const save=(n,d)=>writeFileSync(join(cacheOut,n),JSON.stringify(d,null,2)+'\n');
 cleanupOwnedCaches(tmp,save,{runnerExited:!alive(pid),previewPidGone:clean.every(c=>c.startedPid&&!alive(c.startedPid)),fixtureGone:ids.every(id=>!existsSync(id.fixtureRoot))},'c2c31a');
 if(exitCode!==0)throw Error('Targeted browser FAIL; evidence preserved, no fresh47/retry');console.log('Search targeted PASS; both own fixtures and cache root normally closed');
}
main().catch(e=>{console.error(e);process.exitCode=1});
