import {files,sourceManifest,hash,read,base,root} from '../../v2.7-ws06a/iteration22/finalize-readiness-audit.mjs';
import {join} from 'node:path';import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const out=join(base,'template/codex/executions/v2.7-ws03a/iteration23');
const save=(n,d)=>writeFileSync(join(out,n),JSON.stringify(d,null,2)+'\n');
const starters=['src/config/schema.ts','src/core/theme-roles.ts','src/layouts/BaseLayout.astro','src/styles/theme.css','src/styles/global.css','tests/config.test.ts','tests/theme.test.ts','README.md','docs/CONTENT_AND_DATA_GUIDE.md'].map(p=>'Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/'+p);
const scope=[...starters,'Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/NEW_GAME_SITE_SOP_v2.7.md','Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/QA_CHECKLIST.md','Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/EXECUTION_PROMPT.md','Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE/CodexMasterPrompt_v2.7Candidate.md'];
const acceptancePath=join(base,'template/codex/executions/v2.7-ws06a/iteration22/readiness-acceptance.json'),accept=read(acceptancePath);
if(accept.state!=='ACCEPTED_FOR_BOUNDED_DEVELOPMENT'||accept.nextAuthorizedSlice!=='WS03A'||Date.now()>=Date.parse(accept.expiresAt))throw Error('Readiness absent/stale/expired');
for(const v of Object.values(accept.triadIdentity.triad))if(sourceManifest(v.root)!==v.workingTreeSha256)throw Error('Readiness source drift '+v.root);
if(hash(join(base,accept.reviewPath))!==accept.reviewSha256)throw Error('Review bytes drift');
const protectedFiles={};for(const n of ['template','Repo_hotgameweb','gameweb'])if(existsSync(join(base,n)))for(const {path,...v} of files(join(base,n),n==='template'?['codex/executions/v2.7-ws03a/iteration23','codex/prompts/v2.7-ws03a/iteration23-ws03a-semantic-visual-roles-plan.md']:[]))protectedFiles[n+'/'+path]=v;
const preimages={};for(const p of scope){if(existsSync(join(base,p))){const target=join(out,'preimages',p);mkdirSync(join(target,'..'),{recursive:true});writeFileSync(target,readFileSync(join(base,p)));preimages[p]=protectedFiles[p];}else preimages[p]=null;}
save('preimages.json',preimages);save('preflight.json',{taskId:'c2c_a765',iteration:23,capturedAt:new Date().toISOString(),scope,protected:protectedFiles,protectedCount:Object.keys(protectedFiles).length,triad:accept.triadIdentity.triad,contractSha256:accept.triadIdentity.canonicalContract.verification.observedSha256,verificationFileHashes:accept.verificationFileHashes});
save('readiness-before-mutation.json',{state:'VERIFIED_ACCEPTED_FOR_BOUNDED_DEVELOPMENT',verifiedAt:new Date().toISOString(),acceptancePath,acceptanceSha256:hash(acceptancePath),reviewSha256:accept.reviewSha256,expiresAt:accept.expiresAt,nextAuthorizedSlice:'WS03A',sourceIdentityExact:true});
console.log('Preflight verified readiness, scope13, protected '+Object.keys(protectedFiles).length);
