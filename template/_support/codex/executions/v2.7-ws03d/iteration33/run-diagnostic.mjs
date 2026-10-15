import {execFileSync,spawnSync} from 'node:child_process';import {join} from 'node:path';import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {cleanupOwnedCaches} from '../iteration32/owned-cache-cleanup.mjs';
const root='/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE',out=join(root,'../../template/codex/executions/v2.7-ws03d/iteration33');
const save=(n,d)=>writeFileSync(join(out,n),JSON.stringify(d,null,2)+'\n',{flag:'wx'});
const mode=process.argv[2];if(!['old','repaired'].includes(mode))throw Error('Unknown mode');
const tmp=mode==='old'?execFileSync('mktemp',['-d','/tmp/c2c33d.XXXXXX'],{encoding:'utf8'}).trim():JSON.parse(readFileSync(join(out,'diagnostic-owned-root.json'),'utf8')).logicalRoot;
if(mode==='old')save('diagnostic-owned-root.json',{logicalRoot:tmp,qualificationAttempts:0});
const script=mode==='old'?'check-observer-serialization.ts':'diagnose-repaired-observer.ts';
const r=spawnSync(join(root,'node_modules/.bin/tsx'),[join(out,script)],{cwd:root,env:{...process.env,TMPDIR:tmp},encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
writeFileSync(join(out,mode+'-diagnostic.log'),r.stdout+r.stderr,{flag:'wx'});save(mode+'-diagnostic-command.json',{exitCode:r.status,error:r.error?String(r.error):null,qualificationAttempts:0,retries:0,logicalRoot:tmp});console.log(r.stdout+r.stderr);
if(mode==='repaired'||r.status!==0){const dir=join(out,'diagnostic-tmp-cleanup');mkdirSync(dir);cleanupOwnedCaches(tmp,(n,d)=>writeFileSync(join(dir,n),JSON.stringify(d,null,2)+'\n'),{runnerExited:true,previewPidGone:true,fixtureGone:true},'c2c33d');}
if(r.status!==0||r.error)throw Error('Diagnostic STOP');
