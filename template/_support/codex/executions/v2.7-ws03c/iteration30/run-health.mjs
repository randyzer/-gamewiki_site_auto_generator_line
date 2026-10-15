import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
const root='/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE',out=join(root,'../../template/codex/executions/v2.7-ws03c/iteration30');
const results=[];
for(const [name,args] of [['root-check',['npm','run','check']],['unadopted-final',['npm','run','verify:unadopted-final']],['adopted-final',['npm','run','verify:adopted-final']],['git-diff-check',['git','diff','--check']]]){
 let log='';const startedAt=new Date().toISOString(),child=spawn(args[0],args.slice(1),{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
 const exitCode=await new Promise((r,j)=>{child.once('error',j);child.once('close',r)});writeFileSync(join(out,name+'.log'),log);results.push({name,command:args.join(' '),cwd:root,exitCode,startedAt,finishedAt:new Date().toISOString()});writeFileSync(join(out,'product-health-command-results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results.at(-1)));if(exitCode!==0){process.exitCode=1;break;}
}
