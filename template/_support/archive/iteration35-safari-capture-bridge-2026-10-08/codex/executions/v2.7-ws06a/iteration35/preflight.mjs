import {base,files,read,hash,sourceManifest} from '../iteration22/finalize-readiness-audit.mjs';
import {join} from 'node:path';
import {existsSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const out=join(base,'template/codex/executions/v2.7-ws06a/iteration35');
const triad=read(join(base,'template/codex/executions/v2.7-ws03d/iteration33/triad-post-identity.json'));
for(const v of Object.values(triad.triad)) {
 if(sourceManifest(v.root)!==v.workingTreeSha256||execFileSync('git',['rev-parse','HEAD'],{cwd:v.root,encoding:'utf8'}).trim()!==v.head||execFileSync('git',['branch','--show-current'],{cwd:v.root,encoding:'utf8'}).trim()!==v.branch)throw Error('Current identity drift '+v.root);
}
const allowed=['codex/executions/v2.7-ws06a/iteration35','codex/prompts/v2.7-ws06a/iteration35-real-safari-capture-bridge-plan.md'];
const protectedFiles={};
for(const n of ['template','Repo_hotgameweb','gameweb'])if(existsSync(join(base,n)))for(const {path,...v} of files(join(base,n),n==='template'?allowed:[]))protectedFiles[n+'/'+path]=v;
const reviewPath='template/codex/executions/v2.7-ws04a/iteration34/chatgpt-independent-review.md';
writeFileSync(join(out,'preflight.json'),JSON.stringify({capturedAt:new Date().toISOString(),allowed,protected:protectedFiles,protectedCount:Object.keys(protectedFiles).length,triad:triad.triad,canonicalContract:triad.canonicalContract,review34:{path:reviewPath,sha256:hash(join(base,reviewPath)),verdict:'ACCEPT — CANDIDATE INTERFACE BASELINE + BINDING PREPARATION'},productDelta:0,triadDelta:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS',protected:Object.keys(protectedFiles).length,productDelta:0,triadDelta:0}));
