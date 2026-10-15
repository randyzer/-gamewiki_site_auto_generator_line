import {base,root,files,read,hash,sourceManifest} from '../../v2.7-ws06a/iteration22/finalize-readiness-audit.mjs';
import {join,dirname,resolve} from 'node:path';import {existsSync,readFileSync,writeFileSync} from 'node:fs';import {execFileSync,spawnSync} from 'node:child_process';
const out=join(base,'template/codex/executions/v2.7-ws04a/iteration34'),pre=read(join(out,'preflight.json')),now={},errors=[];
const save=(n,v)=>writeFileSync(join(out,n),JSON.stringify(v,null,2)+'\n');
for(const n of ['template','Repo_hotgameweb','gameweb'])if(existsSync(join(base,n)))for(const {path,...v} of files(join(base,n),n==='template'?pre.allowed:[]))now[n+'/'+path]=v;
const changed=[...new Set([...Object.keys(now),...Object.keys(pre.protected)])].filter(p=>JSON.stringify(now[p])!==JSON.stringify(pre.protected[p]));
for(const p of changed)if(!pre.scope.includes(p))errors.push('outside scope '+p);
if(changed.length!==5||!pre.scope.every(p=>changed.includes(p)))errors.push('exact5 changed set');
const identities={};for(const [n,v] of Object.entries(pre.triad)){
 const git=(...args)=>execFileSync('git',args,{cwd:v.root,encoding:'utf8'}).trim();
 identities[n]={...v,workingTreeSha256:sourceManifest(v.root),branch:git('branch','--show-current'),head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}')};
 for(const k of ['workingTreeSha256','branch','head','tree'])if(identities[n][k]!==v[k])errors.push(n+' '+k);
}
for(const [p,h] of Object.entries(pre.verificationFileHashes))if(hash(join(root,p))!==h)errors.push('verification '+p);
const contract=pre.canonicalContract.verification.filePath,contractHash=hash(contract),section=readFileSync(contract,'utf8').split('## H. Product Contract v0.2')[1].split('## I. Applicability Model')[0];
const ids=[...section.matchAll(/^\| ([A-Z]+-\d+) \|/gm)].map(m=>m[1]);
if(contractHash!==pre.canonicalContract.verification.observedSha256||ids.length!==41||new Set(ids).size!==41)errors.push('Contract/Registry');
const checks=[
 ['src/config/schema.ts',['const visualRolesSchema','font: z.enum(["editorial", "interface"])','density: z.enum(["comfortable", "compact"])','shape: z.enum(["square", "soft"])','state: z.enum(["lifted", "quiet"])','visualRoles: visualRolesSchema.optional()','features: z.object(featureFlagsShape).strict()']],
 ['src/core/theme-roles.ts',['export const DEFAULT_VISUAL_ROLES','export function resolveVisualRoles','export type ResolvedVisualRoles']],
 ['src/layouts/BaseLayout.astro',['data-theme-font','data-theme-density','data-theme-shape','data-theme-state','resolveShareMetadata(siteConfig, mediaCatalog.getShareMedia(page.pageId))']],
 ['src/data/schemas/media.ts',['export const mediaManifestSchema','export const imageAssetSchema','export const videoAssetSchema','export function parseMediaManifest','dimensions: dimensionsSchema','rightsRef: z.string().trim().min(1)','credit: creditSchema.optional()','accessibleEquivalent: accessibleEquivalentSchema','share: mediaIdSchema.optional()','defaultShare: mediaIdSchema.optional()']],
 ['src/data/media/catalog.ts',['export function createMediaCatalog','export const mediaCatalog','getShareMedia(pageId: string)','getPageMedia(pageId: string)','getPresentation(id: string)']],
 ['src/core/media-presentation.ts',['export function resolveMediaPresentation']],
 ['src/components/media/GameMedia.astro',['resolveMediaPresentation']],
 ['src/components/media/VideoEmbed.astro',['resolveMediaPresentation']],
 ['src/components/media/ScreenshotGallery.astro',['GameMedia']],
 ['src/core/seo.ts',['export function resolveShareMetadata']],
 ['scripts/media-validation.ts',['export function collectMediaHtmlErrors','export function collectShareHtmlErrors']],
 ['src/core/search-state.ts',['export interface SearchProvider','export type SearchOutcome','export async function runSearchProvider','export function normalizeSearchResult']],
 ['src/core/pagefind-search-adapter.ts',['export async function createPagefindSearchProvider','export async function loadPagefindSearchProvider']],
 ['src/components/islands/SearchIsland.tsx',['loadPagefindSearchProvider','runSearchProvider']],
 ['src/data/schemas/page-inventory.ts',['export const liveStatusSchema','export const pageInventoryEntrySchema','publishedAt: isoDateSchema.optional()','updatedAt: isoDateSchema','liveStatus: liveStatusSchema.optional()']],
 ['src/data/schemas/provenance.ts',['export const provenanceSchema','accessedAt: isoDateSchema']],
 ['src/data/schemas/facts.ts',['patch:','updatedAt:']],['src/data/schemas/tools.ts',['patch:','updatedAt:']],
 ['src/core/freshness.ts',['export interface VersionContext','export function latestSourceAccessedAt','export function resolvePageFreshness']],
 ['src/components/EditorialArticle.astro',['resolvePageFreshness']],['src/components/wiki/WikiArticle.astro',['resolvePageFreshness']],['src/components/wiki/Sources.astro',['latestSourceAccessedAt']],
 ['src/components/EntityDetail.astro',['Recorded version','Recorded patch']],['src/pages/index.astro',['Ordered by recorded update date']],['src/core/media-readiness.ts',['MEDIA_DECISION_TABLE.md']]
];
const symbols=checks.flatMap(([p,needles])=>{const text=readFileSync(join(root,p),'utf8');return needles.map(needle=>({path:p,symbolOrField:needle,exists:text.includes(needle)}));});
for(const r of symbols)if(!r.exists)errors.push('symbol '+r.path+' '+r.symbolOrField);
const links=[];for(const p of pre.scope){const text=readFileSync(join(base,p),'utf8');for(const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
 const target=m[1].split(/\s+"/)[0].replace(/^<|>$/g,'');if(/^[a-z]+:\/\//i.test(target))continue;
 const [local,anchor]=target.split('#'),resolved=resolve(dirname(join(base,p)),decodeURIComponent(local||'')),valid=existsSync(resolved);
 const record={document:p,target,resolved,exists:valid};
 if(valid&&anchor&&resolved.endsWith('.md')){const t=readFileSync(resolved,'utf8');const headings=[...t.matchAll(/^#+\s+(.+)$/gm)].map(h=>h[1].toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-'));record.anchorExists=headings.includes(decodeURIComponent(anchor));}
 links.push(record);if(!valid||record.anchorExists===false)errors.push('link '+p+' '+target);
}}
const ledger=readFileSync(join(base,'template/design/ws04a/WS03_INTERFACE_DEPENDENCY_LEDGER_V1.md'),'utf8');
const concerns=['页面引用','主题语义','媒体尺寸/权利引用','视频等价与失败状态','分享图','搜索选择/状态','时间/标签','媒体生命周期引用','组合意图'];
const reconciliation=concerns.map(c=>{const row=ledger.split('\n').find(l=>l.startsWith('| '+c+' |'));return {concern:c,present:!!row,classification:row?.match(/\| (MATCH|PARTIAL|OBSOLETE_ASSUMPTION|NO_INTERFACE_REQUIRED) \|/)?.[1]??null};});
if(reconciliation.some(r=>!r.present||!r.classification))errors.push('nine row reconciliation');
save('source-symbol-checks.json',{status:symbols.every(r=>r.exists)?'PASS':'FAIL',checks:symbols});save('document-link-checks.json',{status:links.every(r=>r.exists&&r.anchorExists!==false)?'PASS':'FAIL',count:links.length,links});save('dependency-reconciliation-checks.json',{rows:reconciliation,status:reconciliation.every(r=>r.present&&r.classification)?'PASS':'FAIL'});
save('triad-identity.json',{capturedAt:new Date().toISOString(),triad:identities,contractSha256:contractHash});save('postimages.json',Object.fromEntries(pre.scope.map(p=>[p,now[p]])));
let patch='';const preimages=read(join(out,'preimages.json'));for(const p of pre.scope){const r=spawnSync('git',['diff','--no-index','--',preimages[p]===null?'/dev/null':join(out,'preimages',p),join(base,p)],{encoding:'utf8'});if(![0,1].includes(r.status))errors.push('diff '+p);patch+=r.stdout;}writeFileSync(join(out,'approved-scope.patch'),patch);
const verdict={taskId:'c2c_a765',iteration:34,status:errors.length?'BLOCKED':'READY_FOR_INDEPENDENT_REVIEW',approvedScope:5,changedFiles:changed,protectedUnchanged:pre.protectedCount-changed.filter(p=>pre.protected[p]).length,priorHistoriesFrozen:!errors.some(e=>e.startsWith('outside scope')),triadDelta:0,productDelta:0,testDelta:0,contractSha256:contractHash,capabilityIds:ids.length,uniqueIds:new Set(ids).size,verificationInfrastructureDelta:0,symbolChecks:symbols.length,localLinks:links.length,reconciliationRows:9,productTests:'NOT_RUN',browser:'NOT_RUN',formalClosed:2,totalWorkstreams:8,safariProof:0,ws06a:'BLOCKED',ws03Formal:'NOT_ACCEPTED',ws04aFormal:'GATE_OPEN',schema:'NOT_FROZEN',ws05:'NOT_STARTED / NOT_AUTHORIZED',releaseHold:true,errors};save('design-audit.json',verdict);console.log(JSON.stringify(verdict,null,2));if(errors.length)throw Error('Design verification failed');
