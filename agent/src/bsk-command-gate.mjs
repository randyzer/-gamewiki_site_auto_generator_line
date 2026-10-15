import { mkdir, readFile, writeFile, rename, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { inside, safePath, sha256, readArtifact } from './files.mjs';
import { validateFaviconPng } from './favicon-png.mjs';
import { STAGE, BROWSER_STAGES, stageName } from './stages.mjs';
import { gameSteamUrl, homepageMediaUrl } from './bsk-policy.mjs';
import {captureFaviconPublicControls,sanitizeFaviconPublicControls} from './favicon-control-capture.mjs';

const forbidden = message => { throw Error('Browser command not approved: ' + message); };
export function publicPageCapture(policy) {
  return '(()=>{const policy='+JSON.stringify(policy)+';const forbidden=()=>{throw Error("PRIVATE_PAGE_BLOCKED")};const homepageMediaUrl='+homepageMediaUrl.toString()+';const allowed='+approvedPage.toString()+';const matchesGame='+gameSteamUrl.toString()+';if(policy.g1Media)return ('+captureHomepageMedia.toString()+')(policy,allowed,homepageMediaUrl);if(location.href==="https://favicon.io/favicon-converter/")return ('+captureFaviconPublicControls.toString()+')();if(policy.publicSources?.some(s=>s.url===location.href))return ('+captureOfficialPublicArticle.toString()+')(policy,allowed);return ('+captureSteamPublicGame.toString()+')(policy,allowed,matchesGame)})()';
}
function captureHomepageMedia(policy, allowed, parse) {
  const url = location.href;
  try { allowed(url, policy); } catch { return { url, readAllowed: false }; }
  const publicUrl = value => { try { return typeof value === 'string' && value ? new URL(value, url).href : ''; } catch { return ''; } };
  if (url === policy.g1Media.sourceUrl) {
    const links = [], seen = new Set();
    for (const node of [...document.querySelectorAll('a[href], iframe[src], video[src], source[src]')].slice(0, 256)) {
      const target = publicUrl(node.getAttribute('href') || node.getAttribute('src'));
      if (!parse(target) || seen.has(target)) continue;
      seen.add(target);
      links.push({ url: target, label: (node.textContent || '').trim().slice(0, 160) });
      if (links.length === 8) break;
    }
    return { url, readAllowed: location.href === url, sourceSchema: 'OFFICIAL_MEDIA_LINKS_V1', content: { links } };
  }
  if (url !== policy.g1Media.videoUrl || parse(url)?.kind !== 'WATCH') return { url, readAllowed: false };
  const attr = (selector, name) => document.querySelector(selector)?.getAttribute(name) || '';
  const canonicalUrl = attr('link[rel="canonical"]', 'href');
  const title = attr('meta[property="og:title"]', 'content');
  const ogUrl = attr('meta[property="og:url"]', 'content');
  const author = document.querySelector('[itemprop="author"]') ||
    document.querySelector('ytd-watch-metadata ytd-video-owner-renderer');
  const channel = author && [...author.querySelectorAll('a[href], link[itemprop="url"]')].slice(0, 16)
    .map(node => ({ node, url: publicUrl(node.getAttribute('href')) }))
    .find(item => parse(item.url)?.kind === 'CHANNEL');
  const name = author?.querySelector('[itemprop="name"]');
  const channelName = (name?.getAttribute('content') || name?.textContent || channel?.node.textContent || '').trim();
  if (canonicalUrl !== url || ogUrl !== url || !title || title.length > 500 ||
      !channel || !channelName || channelName.length > 500 || location.href !== url) return { url, readAllowed: false };
  return { url, readAllowed: true, sourceSchema: 'PUBLIC_VIDEO_PAGE_V1', content: {
    videoId: parse(url).videoId, canonicalUrl, title, channelUrl: channel.url, channelName } };
}
function captureOfficialPublicArticle(policy, allowed) {
  const url = location.href;
  try { allowed(url, policy); } catch { return { url, readAllowed: false }; }
  if (!policy.publicSources?.some(x => x.url === url)) return { url, readAllowed: false };
  const root = document.querySelector('main') || document.querySelector('article');
  if (!root) return { url, readAllowed: false };
  const headingTitle = (root.querySelector('h1')?.textContent || '').trim();
  const title = headingTitle || (document.title || '').trim();
  const text = selector => [...root.querySelectorAll(selector)].slice(0, 80)
    .map(node => (node.textContent || '').trim()).filter(value => value && value.length <= 4000);
  const content = { title, headings: text('h2, h3'), paragraphs: text('p') };
  if (location.href !== url || !title || title.length > 500 || !content.paragraphs.length)
    return { url, readAllowed: false };
  return { url, readAllowed: true, sourceSchema: 'OFFICIAL_PUBLIC_ARTICLE_V1', content };
}
function captureSteamPublicGame(policy, allowed, matchesGame) {
  const url=location.href;
  try {allowed(url,policy);} catch {return {url,readAllowed:false};}
  const denied=reasonCode=>({url,readAllowed:false,status:'PUBLIC_CONTENT_UNVERIFIED',reasonCode});
  if(!matchesGame(url,policy.game))return denied('STEAM_URL_IDENTITY_MISMATCH');
  // Read only explicitly selected PUBLIC game metadata, never body text,
  // account menu, private page data, cookies, or arbitrary scripts.
  const games=[];
  const scripts=[...document.querySelectorAll('script[type="application/ld+json"]')].slice(0,32);
  for(const script of scripts) {
    if(typeof script.textContent!=='string'||script.textContent.length>200000)continue;
    let data;try {data=JSON.parse(script.textContent);} catch {continue;}
    const entries=Array.isArray(data)?data:[data,...(Array.isArray(data?.['@graph'])?data['@graph']:[])];
    for(const entry of entries.slice(0,100)) {
      if(!entry||typeof entry!=='object')continue;
      const types=Array.isArray(entry['@type'])?entry['@type']:[entry['@type']];
      if(!types.some(type=>['VideoGame','Product'].includes(type))||entry.name!==policy.game.name)continue;
      let identity;try {identity=new URL(entry.url);} catch {continue;}
      if(identity.protocol==='https:'&&identity.hostname==='store.steampowered.com'&&!identity.port&&!identity.username&&!identity.password&&
        !identity.search&&!identity.hash&&matchesGame(identity.href,policy.game))games.push(entry);
    }
  }
  if(games.length>1)return denied('STEAM_STRUCTURED_DATA_AMBIGUOUS');
  if(games.length===1) {
    const game=games[0],content={name:policy.game.name,url:game.url};
    for(const key of ['description','datePublished','genre'])
      if(typeof game[key]==='string'&&game[key].length<=12000)content[key]=game[key];
    for(const key of ['developer','publisher'])
      if(typeof game[key]?.name==='string'&&game[key].name.length<=500)content[key]=game[key].name;
    if(location.href!==url)return {url,readAllowed:false,status:'PAGE_IDENTITY_CHANGED'};
    return {url,readAllowed:true,content,sourceSchema:'STEAM_PUBLIC_GAME_JSON_LD_V1'};
  }

  // Steam does not consistently provide a VideoGame/Product JSON-LD block.
  // Fallback requires independent game identity signals from Steam's public
  // game title and OpenGraph metadata, NOT a weak substring/body-text match.
  if(typeof document.querySelector!=='function')return denied('STEAM_PUBLIC_META_NOT_AVAILABLE');
  const read = selector => {
    const element=document.querySelector(selector);
    if(!element)return '';
    const value=selector==='#appHubAppName' ? element.textContent : element.getAttribute?.('content');
    return typeof value==='string'&&value.length<=12000?value.trim():'';
  };
  const hubName=read('#appHubAppName');
  const ogTitle=read('meta[property="og:title"]');
  const ogUrl=read('meta[property="og:url"]');
  const ogDescription=read('meta[property="og:description"]');
  const genericDescription=read('meta[name="description"]');
  const expected=policy.game.name;
  const titleValid=ogTitle===expected||ogTitle===expected+' on Steam';
  const hubValid=hubName===expected;
  // Either exact app header AND exact OG title, or exact OG title and
  // public OG URL. Never trust only document.title or a URL by itself.
  const ogUrlValid=!!ogUrl&&matchesGame(ogUrl,policy.game)&&
    new URL(ogUrl).protocol==='https:'&&!new URL(ogUrl).search&&!new URL(ogUrl).hash;
  if(!titleValid||!(hubValid||ogUrlValid))return denied('STEAM_PUBLIC_META_IDENTITY_MISMATCH');
  if(ogUrl && !ogUrlValid)return denied('STEAM_PUBLIC_META_URL_MISMATCH');
  const description=(ogDescription||genericDescription).trim();
  if(!description||description.length>2000)return denied('STEAM_PUBLIC_META_DESCRIPTION_MISSING');
  if(location.href!==url)return {url,readAllowed:false,status:'PAGE_IDENTITY_CHANGED'};
  const content={name:expected,url:policy.game.steamUrl,description};
  const rows=[...document.querySelectorAll('.dev_row')].slice(0,10)
    .map(node=>(node.textContent||'').trim().replace(/\s+/g,' ')).filter(value=>value&&value.length<=1000);
  const field=label=>[...new Set(rows.map(value=>new RegExp('^'+label+':\\s*(.{1,500})$','i').exec(value)?.[1]?.trim()).filter(Boolean))];
  const developers=field('Developer'),publishers=field('Publisher');
  const dates=[...new Set([...document.querySelectorAll('.release_date .date')].slice(0,4)
    .map(node=>(node.textContent||'').trim().replace(/\s+/g,' ')).filter(value=>value&&value.length<=100))];
  if(developers.length===1)content.developer=developers[0];
  if(publishers.length===1)content.publisher=publishers[0];
  if(dates.length===1)content.datePublished=dates[0];
  return {url,readAllowed:true,content,sourceSchema:'STEAM_PUBLIC_GAME_META_V1'};
}
function validCommandApproval(decision, command) {
  const now=Date.now();
  return decision?.approved===true&&decision.type==='bsk-command-approval'&&decision.runId===command.runId&&
    decision.stage===command.stage&&decision.commandDigest===command.digest&&typeof decision.approvedBy==='string'&&
    decision.approvedBy.trim().length>0&&decision.approvedBy.length<=200&&Number.isFinite(decision.approvedAt)&&
    decision.approvedAt>0&&decision.approvedAt<=now&&Number.isFinite(decision.expiresAt)&&decision.expiresAt>now&&
    decision.expiresAt>decision.approvedAt&&typeof decision.executionId==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(decision.executionId);
}
export function sanitizePublicCapture(capture, policy) {
  const unverified=()=>{throw Error('PUBLIC_CONTENT_UNVERIFIED');};
  if(!capture||typeof capture!=='object'||Array.isArray(capture)||typeof capture.url!=='string'||typeof capture.readAllowed!=='boolean')unverified();
  if(capture.readAllowed!==true)throw Error('CAPTURE_CONTEXT_CHANGED');
  try {approvedPage(capture.url,policy);} catch {throw Error('CAPTURE_CONTEXT_CHANGED');}
  if (policy.g1Media) {
    const text = (value, max, empty = false) => typeof value === 'string' &&
      (empty || value.trim()) && value.length <= max && !/[\x00-\x1f]/.test(value);
    let content;
    if (capture.sourceSchema === 'OFFICIAL_MEDIA_LINKS_V1' && capture.url === policy.g1Media.sourceUrl) {
      const links = capture.content?.links;
      if (!Array.isArray(links) || links.length > 8 || new Set(links.map(link => link?.url)).size !== links.length ||
          links.some(link => !homepageMediaUrl(link?.url) || !text(link.label, 160, true))) unverified();
      content = { links: links.map(({ url, label }) => ({ url, label })) };
    } else if (capture.sourceSchema === 'PUBLIC_VIDEO_PAGE_V1' && capture.url === policy.g1Media.videoUrl) {
      const value = capture.content;
      if (!value || homepageMediaUrl(capture.url)?.kind !== 'WATCH' || value.videoId !== homepageMediaUrl(capture.url).videoId ||
          value.canonicalUrl !== capture.url || !text(value.title, 500) || !text(value.channelName, 500) ||
          homepageMediaUrl(value.channelUrl)?.kind !== 'CHANNEL') unverified();
      content = Object.fromEntries(['videoId', 'canonicalUrl', 'title', 'channelName', 'channelUrl'].map(key => [key, value[key]]));
    } else unverified();
    return { url: capture.url, readAllowed: true, sourceSchema: capture.sourceSchema, content, controls: [] };
  }
  if (capture.sourceSchema === 'OFFICIAL_PUBLIC_ARTICLE_V1') {
    if (!policy.publicSources?.some(item => item.url === capture.url) ||
        typeof capture.content?.title !== 'string' || !capture.content.title.trim() || capture.content.title.length > 500)
      unverified();
    const content = { title: capture.content.title };
    for (const key of ['headings', 'paragraphs']) {
      const values = capture.content[key];
      if (!Array.isArray(values) || values.length > 80 || values.some(x => typeof x !== 'string' ||
          !x.trim() || x.length > 4000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(x))) unverified();
      content[key] = [...values];
    }
    if (!content.paragraphs.length) unverified();
    return { url: capture.url, readAllowed: true, sourceSchema: 'OFFICIAL_PUBLIC_ARTICLE_V1', content,
      text: [content.title,...content.headings,...content.paragraphs].join('\n'), controls: [] };
  }
  const steamUrl=value=>gameSteamUrl(value,policy.game);
  const source=capture.content;
  const jsonLd=capture.sourceSchema==='STEAM_PUBLIC_GAME_JSON_LD_V1';
  const steamMeta=capture.sourceSchema==='STEAM_PUBLIC_GAME_META_V1';
  if((!jsonLd&&!steamMeta)||!steamUrl(capture.url)||!source||typeof source!=='object'||Array.isArray(source)||
    source.name!==policy.game.name||!steamUrl(source.url)||new URL(source.url).search||new URL(source.url).hash)unverified();
  // Fallback cannot become an identity-only payload. Public description is required.
  if(steamMeta && (typeof source.description!=='string'||source.description.trim().length===0||
    source.description.length>2000))unverified();
  const content={name:policy.game.name,url:source.url};
  for(const key of ['description','datePublished','genre','developer','publisher']) {
    if(!Object.hasOwn(source,key))continue;
    if(typeof source[key]!=='string'||source[key].length>(key==='description'?(steamMeta?2000:12000):500)||
      /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(source[key]))unverified();
    content[key]=source[key];
  }
  // Steam-meta capture only exposes its public description; no unsupported fields.
  if(steamMeta && Object.keys(content).some(key=>
    !['name','url','description','developer','publisher','datePublished'].includes(key)))unverified();
  return {url:capture.url,readAllowed:true,sourceSchema:capture.sourceSchema,content,
    text:Object.entries(content).map(([key,value])=>key+': '+value).join('\n'),controls:[]};
}
export function approvedPage(text, policy) {
  // This exact-target exception belongs only to the host's G1 media service.
  // It does not add v (or any query key) to the ordinary browser policy.
  if (text === policy.g1Media?.videoUrl && ['WATCH', 'DIRECT'].includes(homepageMediaUrl(text)?.kind)) return text;
  if (policy.g1Media && text !== policy.g1Media.sourceUrl) forbidden('outside exact G1 media scope');
  const url = new URL(text);
  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash || /%|(?:^|\/)(?:about|admin|api|account|login|logout|settings|inbox|messages|preferences|modqueue|banned)(?:\/|$)/i.test(url.pathname) ||
    [...url.searchParams.keys()].some(key => /token|auth|secret|password|cookie|api.?key/i.test(key))) forbidden('forbidden URL');
  const page=policy.allowedPages.find(page => page.host === url.hostname &&
    (url.pathname === page.pathPrefix || url.pathname.startsWith(page.pathPrefix.endsWith('/') ? page.pathPrefix : page.pathPrefix + '/')));
  if (!page || (page.pathPattern && !new RegExp(page.pathPattern).test(url.pathname))) forbidden('domain or page outside policy');
  if([...url.searchParams.keys()].some(key=>!page.queryKeys?.includes(key)))forbidden('unapproved query parameter');
  return url.href;
}
async function transferBytes(file, root) {
  if(dirname(file)!==root)forbidden('transfer path outside native directory');
  await safePath(root,[root]);
  const handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
  try {
    const stat=await handle.stat();
    if(!stat.isFile()||stat.nlink!==1||stat.size===0||stat.size>8*1024*1024)forbidden('regular PNG transfer file required');
    return await handle.readFile();
  } finally {await handle.close();}
}
export async function validateBskCommand(argv, { context, policy, bindings = {} }) {
  const stage = stageName(context.stage);
  if (!stage || !(policy.allowedStages ?? BROWSER_STAGES).map(stageName).includes(stage)) forbidden('stage');
  if (!Array.isArray(argv) || argv.some(arg => typeof arg !== 'string' || /[\x00\r\n]/.test(arg))) forbidden('Unexpected argv');
  if (JSON.stringify(argv) === '["--version"]') return { argv, intent:'read-version', target:null, expectedArtifact:null };
  if (JSON.stringify(argv) === '["status","--json"]') return { argv, intent:'read-status', target:null, expectedArtifact:null };
  if (JSON.stringify(argv) === '["session","start"]') {
    if (bindings.sessionId) forbidden('session already owned');
    return { argv:['session','start','--browser',policy.browserInstance,'--name',context.runId,'--json'],intent:'create-agent-window',target:null,expectedArtifact:null };
  }
  if (JSON.stringify(argv) === '["tab","list"]') {
    if (!bindings.sessionId) forbidden('no owned session');
    return {argv:['tab','list','--session',bindings.sessionId,'--scope','agent','--json'],intent:'read-owned-tabs',target:null,expectedArtifact:null};
  }
  if (JSON.stringify(argv) === '["session","stop"]') {
    if (!bindings.sessionId) forbidden('no owned session');
    return { argv:['session','stop',bindings.sessionId],intent:'close-owned-session',target:null,expectedArtifact:null };
  }
  if (!bindings.sessionId || !Number.isInteger(bindings.tabId)) forbidden('no owned session');
  const scope = ['--session',bindings.sessionId,'--tab-id',String(bindings.tabId)];
  if (argv[0] === 'navigate' && argv.length === 2) return { argv:['navigate',approvedPage(argv[1],policy),...scope,'--wait-until','domcontentloaded','--timeout','30s','--json'],intent:'read-public-page',target:argv[1],expectedArtifact:null };
  const target = approvedPage(bindings.url,policy);
  if (argv.length === 1 && ['observe','snapshot'].includes(argv[0])) return { argv:['evaluate',publicPageCapture(policy),'--json',...scope],intent:'capture-public-page',target,expectedArtifact:null };
  if (argv.length === 4 && ['upload','download'].includes(argv[0]) &&
    bindings.transferTargets?.some(control=>control.kind===argv[0]&&control.selector===argv[1])) {
    if(policy.atomicFileTransferSupported!==true)forbidden('TRANSFER_CONTEXT_UNVERIFIABLE');
    if (stage !== STAGE.HOMEPAGE_RESEARCH || new URL(target).hostname !== 'favicon.io' || new URL(target).pathname !== '/favicon-converter/') forbidden('favicon transfer destination');
    const upload = argv[0] === 'upload';
    if (argv[2] !== (upload ? '--file' : '--out')) forbidden('Unexpected transfer flag');
    const file = resolve(argv[3]);
    if (file !== argv[3] || dirname(file)!==context.nativeDirectory || !inside(context.nativeDirectory,file) || /(?:^|\/)\.[^/]+/.test(file.slice(context.nativeDirectory.length))) forbidden('transfer path outside native directory');
    await safePath(file,[context.nativeDirectory]);
    if (upload) {
      if (!/\.png$/i.test(file)) forbidden('PNG required');
      const bytes = await transferBytes(file,context.nativeDirectory);
      validateFaviconPng(bytes);
      const drop=argv[1]==='[class*="dropzone"]';
      const fallback=bindings.dropFallback;
      const initial=bindings.initialDropAuthorization;
      const matchesPermit=permit=>permit&&
          permit.inputSha256===sha256(bytes)&&
          permit.sourcePath===file&&
          permit.sessionId===bindings.sessionId&&
          permit.tabId===bindings.tabId&&
          permit.url===target&&
          Number.isFinite(permit.expiresAt)&&
          Date.now()<=permit.expiresAt;
      if(drop && !matchesPermit(fallback) && !matchesPermit(initial))
        forbidden('DROP_REQUIRES_EXACT_SINGLE_USE_TRUSTED_HOST_AUTHORIZATION');
      return { argv:['upload','--selector',argv[1],'--mode',drop?'drop':'input',
          '--file',file,...scope,'--timeout','18s','--json'],
        intent:'upload-favicon',target,expectedArtifact:file,inputSha256:sha256(bytes) };
    } else if (!/\.zip$/i.test(file)) forbidden('favicon ZIP required');
    return { argv:['download','--selector',argv[1],'--out',file,...scope,'--timeout','30s','--json'],
      intent:'download-favicon',target,expectedArtifact:file };
  }
  forbidden('unknown subcommand or argv');
}

function classifySafeTransferFailure(error) {
  // Never persist subprocess stderr or arbitrary page text. Emit an enum only.
  const raw=[error?.code,error?.message,error?.stderr].filter(Boolean).join(' ').slice(0,8192);
  if(/EACCES|EPERM|permission denied|operation not permitted|not readable|access denied/i.test(raw))
    return 'TRANSFER_LOCAL_FILE_PERMISSION';
  if(/ENOENT|no such file|file not found|cannot find file/i.test(raw))
    return 'TRANSFER_FILE_NOT_FOUND';
  if(/file input|not an input|multiple file inputs|chooser|no matching element|selector|element not found|no such element/i.test(raw))
    return 'TRANSFER_BROWSER_SELECTOR_OR_INPUT';
  if(/session.*(?:not found|lost|closed)|tab.*(?:not found|gone|closed)|invalid session|invalid tab/i.test(raw))
    return 'TRANSFER_BROWSER_SESSION_OR_TAB';
  if(/daemon|service unavailable|IPC|connection refused|connection reset/i.test(raw))
    return 'TRANSFER_BROWSER_DAEMON_OR_IPC';
  if(/timeout|timed out|SIGKILL|deadline/i.test(raw))
    return 'TRANSFER_TIMEOUT';
  return 'TRANSFER_EXECUTION_FAILED_UNCLASSIFIED';
}

export function createBskCommandGate({ context, identity, policy, bindings = {}, approve, execute }) {
  const active = new Map();
  return async request => {
    if (!request || Object.keys(request).some(key=>!['requestId','argv'].includes(key))) forbidden('Unexpected request field');
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(request?.requestId ?? '')) forbidden('requestId');
    const requestDigest=sha256(JSON.stringify({runId:context.runId,stage:context.stage,identity,policy,argv:request.argv}));
    const id = request.requestId;
    if (active.has(id)) {
      const prior = active.get(id); if (prior.digest !== requestDigest) throw Error('Request reused for different command');
      return prior.result;
    }
    const result = (async () => {
      const directory = join(context.runDirectory,'bsk-audit'), file = join(directory,id+'.json');
      await safePath(file,[context.runDirectory]); await mkdir(directory,{recursive:true});
      try {
        const prior = JSON.parse(await readFile(file,'utf8'));
        if (prior.requestDigest !== requestDigest) throw Error('Request reused for different command');
        if (prior.result) return prior.result;
        return {status:'COMMAND_RESULT_UNKNOWN',summary:'Interrupted call is not automatically replayed'};
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const validated = await validateBskCommand(request.argv,{context,policy,bindings});
      const command = { runId:context.runId,stage:context.stage,requestId:id,...identity,...validated,cwd:context.nativeDirectory,timeoutMs:validated.intent==='upload-favicon'?45000:30000,policyVersion:policy.schemaVersion };
      command.digest = sha256(JSON.stringify(command));
      const decision = typeof approve === 'function' ? await approve(command) : null;
      let status = typeof approve!=='function' ? 'APPROVAL_CAPABILITY_UNAVAILABLE' : validCommandApproval(decision,command) ? 'APPROVED' : 'COMMAND_NOT_APPROVED';
      if(status==='APPROVED') {
        const used=join(context.runDirectory,'bsk-approval-use');
        await safePath(used,[context.runDirectory]);await mkdir(used,{recursive:true});
        const consumed=join(used,decision.executionId+'.json');await safePath(consumed,[context.runDirectory]);
        try {await writeFile(consumed,JSON.stringify({requestId:id,commandDigest:command.digest,usedAt:Date.now()}),{flag:'wx',mode:0o600});}
        catch(error){if(error.code!=='EEXIST')throw error;status='COMMAND_NOT_APPROVED';}
      }
      const receipt=status==='APPROVED'?Object.fromEntries(['type','runId','stage','commandDigest','approvedBy','approvedAt','expiresAt','executionId'].map(key=>[key,decision[key]])):null;
      const audit = {requestDigest,command,decision:{status,digest:command.digest,at:new Date().toISOString(),receipt}};
      await writeFile(file,JSON.stringify(audit,null,2),{flag:'wx',mode:0o600});
      if (status !== 'APPROVED') audit.result = {status};
      else {
        try {
          let execution={...command,argv:[...command.argv]}, changed=false;
          if(command.expectedArtifact) {
            // Transfers use host-owned bytes outside the worker's writable native root.
            const transferDirectory=join(directory,'transfers');
            if(inside(context.nativeDirectory,transferDirectory))forbidden('host transfer scope overlaps worker');
            await safePath(transferDirectory,[context.runDirectory]);await mkdir(transferDirectory,{recursive:true});
            const snapshot=join(transferDirectory,id+(command.inputSha256?'.png':'.zip'));
            if(command.inputSha256) {
              const bytes=await transferBytes(command.expectedArtifact,context.nativeDirectory);
              if(sha256(bytes)!==command.inputSha256)changed=true;
              else await writeFile(snapshot,bytes,{flag:'wx',mode:0o400});
              execution.argv[execution.argv.indexOf('--file')+1]=snapshot;
            } else execution.argv[execution.argv.indexOf('--out')+1]=snapshot;
            audit.execution={argv:execution.argv,inputSha256:command.inputSha256??null};
          }
          if(!validCommandApproval(decision,command))audit.result={status:'COMMAND_NOT_APPROVED'};
          else if(changed) audit.result={status:'COMMAND_INPUT_CHANGED'};
          else {
            let outcome=await execute(execution);
            if(command.intent==='capture-public-page') {
              let capture;try {capture=JSON.parse(outcome.stdout)?.value;} catch {throw Error('PUBLIC_CONTENT_UNVERIFIED');}
              if(capture?.status==='PUBLIC_CONTENT_UNVERIFIED') {
                const error=Error('PUBLIC_CONTENT_UNVERIFIED');
                if(['STEAM_URL_IDENTITY_MISMATCH','STEAM_STRUCTURED_DATA_AMBIGUOUS',
                  'STEAM_PUBLIC_META_NOT_AVAILABLE','STEAM_PUBLIC_META_IDENTITY_MISMATCH',
                  'STEAM_PUBLIC_META_URL_MISMATCH','STEAM_PUBLIC_META_DESCRIPTION_MISSING'
                ].includes(capture.reasonCode))error.safeReasonCode=capture.reasonCode;
                throw error;
              }
              const vetted=command.target==='https://favicon.io/favicon-converter/' ?
                sanitizeFaviconPublicControls(capture) : sanitizePublicCapture(capture,policy);
              outcome={stdout:JSON.stringify({value:vetted})};
            }
            if(command.intent==='download-favicon') {
              const downloaded=execution.argv[execution.argv.indexOf('--out')+1];
              const bytes=await readArtifact(downloaded,[context.runDirectory]);
              await safePath(context.nativeDirectory,[context.nativeDirectory]);
              const handle=await open(command.expectedArtifact,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
              try {await handle.writeFile(bytes);}finally {await handle.close();}
              audit.outputSha256=sha256(bytes);
            }
            audit.result={status:'COMPLETED',...outcome};
          }
        }
        catch (error) {
          const diagnostic = [error.code,error.message,error.stderr,error.stdout].join(' ');
          audit.result = {status:/TRANSFER_CONTEXT_UNVERIFIABLE/i.test(diagnostic)?'TRANSFER_CONTEXT_UNVERIFIABLE':/PUBLIC_CONTENT_UNVERIFIED/i.test(diagnostic)?'PUBLIC_CONTENT_UNVERIFIED':/CAPTURE_CONTEXT_CHANGED/i.test(diagnostic)?'CAPTURE_CONTEXT_CHANGED':/EEXIST|ELOOP|Linked path|host transfer scope/i.test(diagnostic)?'COMMAND_INPUT_CHANGED':/EPERM|Operation not permitted|Permission denied/i.test(diagnostic)?'IPC_PERMISSION_DENIED':
            /ENOENT/.test(diagnostic)?'BINARY_MISSING':/timeout|timed out|SIGKILL/i.test(diagnostic)?'COMMAND_TIMEOUT':'DAEMON_UNREACHABLE'};
          if(error.safeReasonCode)audit.result.reasonCode=error.safeReasonCode;
          if(['upload-favicon','download-favicon'].includes(command.intent)) {
            audit.result.reasonCode=classifySafeTransferFailure(error);
            const exit=Number(error.code);
            if(Number.isInteger(exit)&&exit>=0&&exit<=255)audit.result.cliExitCode=exit;
            const stderr=typeof error.stderr==='string'?error.stderr:'';
            audit.result.stderrBytes=Buffer.byteLength(stderr);
            audit.result.stderrSha256=sha256(stderr);
            audit.result.bskReason=error.safeBskReason||'UNVERIFIED';
            audit.result.effectState=error.safeEffectState||'unverified';
          }
        }
      }
      const temporary = file+'.tmp'; await writeFile(temporary,JSON.stringify(audit,null,2),{flag:'wx',mode:0o600}); await rename(temporary,file);
      return audit.result;
    })();
    active.set(id,{digest:requestDigest,result});
    return result;
  };
}
