import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture } from './helpers.mjs';
import { deflateSync } from 'node:zlib';
import { runInNewContext } from 'node:vm';

const bodycamGame = { name: 'Bodycam', steamAppId: '2406770', steamUrl: 'https://store.steampowered.com/app/2406770/Bodycam/' };

const transferTargets=[{kind:'upload',selector:'@e1'},{kind:'download',selector:'@e1'}];

test('public capture and host verification accept different configured games and reject mismatched identities', async () => {
  const { publicPageCapture, sanitizePublicCapture } = await import('../src/bsk-command-gate.mjs');
  for (const game of [
    { name: 'Dota 2', steamAppId: '570', steamUrl: 'https://store.steampowered.com/app/570/Dota_2/' },
    { name: 'Example & Friends', steamAppId: '999001', steamUrl: 'https://store.steampowered.com/app/999001/Example__Friends/' },
  ]) {
    const policy = { game, allowedPages: [{ host: 'store.steampowered.com', pathPrefix: '/app/' + game.steamAppId + '/', queryKeys: ['l'] }] };
    const capture = content => runInNewContext(publicPageCapture(policy), {
      URL, location: { href: game.steamUrl + '?l=english' }, document: {
        body: { get innerText() { throw Error('Whole-body capture is forbidden'); } },
        querySelectorAll: () => [{ textContent: JSON.stringify({ '@type': 'VideoGame', ...content }) }],
      },
    });
    const result = capture({ name: game.name, url: game.steamUrl, description: 'Public description', account: 'PRIVATE_FIELD' });
    assert.equal(result.readAllowed, true);
    const clean = sanitizePublicCapture(result, policy);
    assert.equal(clean.content.name, game.name);
    assert.doesNotMatch(JSON.stringify(clean), /PRIVATE_FIELD/);
    assert.equal(capture({ name: 'Different Game', url: game.steamUrl }).readAllowed, false);
    assert.equal(capture({ name: game.name, url: 'https://store.steampowered.com/app/1/Wrong/' }).readAllowed, false);
    assert.throws(() => sanitizePublicCapture({ ...result, content: { ...result.content, name: 'Different Game' } }, policy), /PUBLIC_CONTENT_UNVERIFIED/);
  }
});

test('browser commands accept stage names and reject non-browser stages', async t => {
  const f = await fixture(t), { validateBskCommand } = await import('../src/bsk-command-gate.mjs');
  const context = { runId: 'fixture', stage: 'game-homepage-icon-research', nativeDirectory: f.configuration.workspace };
  const policy = { allowedStages: ['game-homepage-icon-research'], allowedPages: [] };
  assert.equal((await validateBskCommand(['status', '--json'], { context, policy })).intent, 'read-status');
  await assert.rejects(validateBskCommand(['status', '--json'], { context: { ...context, stage: 'game-site-content-integrator' }, policy }), /stage/);
});

test('task game identity cannot be overridden by metadata or another policy game', async () => {
  const { bindBrowserPolicy } = await import('../src/bsk-policy.mjs');
  const gameMetadata = { steamAppId: '570', steam: 'https://store.steampowered.com/app/570/Dota_2/' };
  assert.throws(() => bindBrowserPolicy({ allowedPages: [] }, {
    gameIdentity: 'Different Game', gameMetadata: { ...gameMetadata, steamName: 'Dota 2' },
  }), /identity|gameIdentity/i);
  assert.throws(() => bindBrowserPolicy({ allowedPages: [], game: bodycamGame }, {
    gameIdentity: 'Dota 2', gameMetadata,
  }), /identity/i);
  assert.throws(() => bindBrowserPolicy({ allowedPages: [] }, {
    gameIdentity: 'Dota 2', gameMetadata: { ...gameMetadata, steamAppId: '999' },
  }), /matching steamAppId/i);
});

function commandApproval(command, overrides={}) {
  return {approved:true,type:'bsk-command-approval',runId:command.runId,stage:command.stage,
    commandDigest:command.digest,approvedBy:'offline-human-fixture',
    approvedAt:Date.now(),expiresAt:Date.now()+10000,executionId:'fixture-'+command.requestId,...overrides};
}

function pngFixture() {
  const crc = bytes => { let value=0xffffffff; for (const byte of bytes) { value^=byte; for(let i=0;i<8;i++) value=(value>>>1)^(0xedb88320&-(value&1)); } return (value^0xffffffff)>>>0; };
  const chunk = (type,data) => { const body=Buffer.concat([Buffer.from(type),data]), header=Buffer.alloc(4),footer=Buffer.alloc(4); header.writeUInt32BE(data.length);footer.writeUInt32BE(crc(body));return Buffer.concat([header,body,footer]); };
  const header=Buffer.alloc(13);header.writeUInt32BE(512,0);header.writeUInt32BE(512,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((512*4+1)*512))),chunk('IEND',Buffer.alloc(0))]);
}

test('browser command gate denies unknown commands, shell text, private routes and out-of-scope transfers', async t => {
  const f = await fixture(t), api = await import('../src/bsk-command-gate.mjs');
  const context = { runId:'fixture',stage:0,nativeDirectory:join(f.configuration.workspace,'native') };
  await mkdir(context.nativeDirectory);
  const policy = { atomicFileTransferSupported:true,game:bodycamGame,allowedPages:[{host:'store.steampowered.com',pathPrefix:'/app/2406770/'},{host:'favicon.io',pathPrefix:'/favicon-converter/'}] };
  const bindings = { sessionId:'own',tabId:1,url:'https://favicon.io/favicon-converter/',transferTargets };
  const validate = argv => api.validateBskCommand(argv,{context,policy,bindings});
  assert.equal((await validate(['status','--json'])).intent,'read-status');
  assert.equal((await validate(['navigate','https://store.steampowered.com/app/2406770/Bodycam/'])).intent,'read-public-page');
  for (const argv of [['daemon','start'],['evaluate','fetch("private")'],['status',';','curl'],['navigate','https://store.steampowered.com/account/'],
    ['navigate','https://store.steampowered.com/app/2406770/?token=secret'],['observe','--session','borrowed'],
    ['download','@e1','--out','/tmp/outside.zip'],['upload','@e1','--file',join(context.nativeDirectory,'.env')]])
    await assert.rejects(validate(argv),/not approved|forbidden|outside|Unexpected|PNG/i);
  const png = pngFixture();
  const file = join(context.nativeDirectory,'icon.png'); await writeFile(file,png);
  assert.equal((await validate(['upload','@e1','--file',file])).intent,'upload-favicon');
  bindings.url = 'https://store.steampowered.com/app/2406770/Bodycam/';
  await assert.rejects(validate(['upload','@e1','--file',file]),/favicon/i);
});

test('browser policy rejects private community routes, nonstandard ports, and malformed PNG bytes', async t => {
  const f=await fixture(t), {approvedPage,validateBskCommand}=await import('../src/bsk-command-gate.mjs');
  const policy={atomicFileTransferSupported:true,allowedPages:[{host:'www.reddit.com',pathPrefix:'/r/BodycamGame/'},{host:'favicon.io',pathPrefix:'/favicon-converter/'}]};
  for(const url of ['https://www.reddit.com/r/BodycamGame/about/modqueue/', 'https://www.reddit.com/r/BodycamGame/about/banned/',
    'https://favicon.io:8443/favicon-converter/', 'https://favicon.io/favicon-converter/?next=/private'])
    assert.throws(()=>approvedPage(url,policy),/not approved/);
  const file=join(f.configuration.workspace,'icon.png');
  const options={context:{stage:0,nativeDirectory:f.configuration.workspace},policy,bindings:{sessionId:'own',tabId:1,url:'https://favicon.io/favicon-converter/',transferTargets}};
  const fake=Buffer.alloc(33);Buffer.from('89504e470d0a1a0a','hex').copy(fake);fake.write('IHDR',12);fake.writeUInt32BE(512,16);fake.writeUInt32BE(512,20);fake[25]=6;
  for (const data of [fake,Buffer.concat([pngFixture(),Buffer.from('hidden payload')]),(()=>{const b=pngFixture();b[29]^=1;return b;})()]) {
    await writeFile(file,data);await assert.rejects(validateBskCommand(['upload','@e1','--file',file],options),/PNG/);
  }
});

test('upload decisions bind bytes and retries cannot replay an interrupted or modified request', async t => {
  const f=await fixture(t),{createBskCommandGate}=await import('../src/bsk-command-gate.mjs');
  const icon=join(f.configuration.workspace,'icon.png');await writeFile(icon,pngFixture());
  const context={runId:'fixture',stage:0,nativeDirectory:f.configuration.workspace,runDirectory:join(f.root,'audit')};
  const policy={schemaVersion:1,atomicFileTransferSupported:true,allowedPages:[{host:'favicon.io',pathPrefix:'/favicon-converter/'}]},bindings={sessionId:'own',tabId:1,url:'https://favicon.io/favicon-converter/',transferTargets};
  const identity={executable:'/offline/bsk',version:'0.3.2',sha256:'a'.repeat(64)};
  let calls=0;
  const gate=createBskCommandGate({context,policy,bindings,identity,
    approve:async command=>{await writeFile(icon,Buffer.from('changed after review'));return commandApproval(command);},
    execute:async()=>{calls++;return {};}});
  assert.equal((await gate({requestId:'transfer',argv:['upload','@e1','--file',icon]})).status,'COMMAND_INPUT_CHANGED');
  assert.equal(calls,0);
});

test('transfers use host-owned snapshots and downloads never follow a worker-created target symlink', async t => {
  const f=await fixture(t),{createBskCommandGate}=await import('../src/bsk-command-gate.mjs');
  const nativeDirectory=join(f.configuration.workspace,'native');await mkdir(nativeDirectory);
  const icon=join(nativeDirectory,'icon.png'), png=pngFixture();await writeFile(icon,png);
  const context={runId:'fixture',stage:0,nativeDirectory,runDirectory:join(f.root,'host-run')};
  const policy={schemaVersion:1,atomicFileTransferSupported:true,allowedPages:[{host:'favicon.io',pathPrefix:'/favicon-converter/'}]},bindings={sessionId:'own',tabId:1,url:'https://favicon.io/favicon-converter/',transferTargets};
  const identity={executable:'/offline/bsk',version:'0.3.2',sha256:'a'.repeat(64)};
  const approve=async command=>commandApproval(command);
  const upload=createBskCommandGate({context,policy,bindings,identity,approve,execute:async command=>{
    const path=command.argv[command.argv.indexOf('--file')+1];assert.notEqual(path,icon);
    await writeFile(icon,'changed by worker');
    const {readFile}=await import('node:fs/promises');assert.deepEqual(await readFile(path),png);return {};
  }});
  assert.equal((await upload({requestId:'upload',argv:['upload','@e1','--file',icon]})).status,'COMPLETED');
  const target=join(nativeDirectory,'download.zip'), protectedFile=join(f.root,'protected.txt');await writeFile(protectedFile,'original');
  const download=createBskCommandGate({context,policy,bindings,identity,approve,execute:async command=>{
    const path=command.argv[command.argv.indexOf('--out')+1];assert.notEqual(path,target);
    await writeFile(path,'OFFLINE ZIP FIXTURE');const {symlink}=await import('node:fs/promises');await symlink(protectedFile,target);return {};
  }});
  assert.equal((await download({requestId:'download',argv:['download','@e1','--out',target]})).status,'COMMAND_INPUT_CHANGED');
  const {readFile}=await import('node:fs/promises');assert.equal(await readFile(protectedFile,'utf8'),'original');
});

test('public capture checks actual URL before accessing page text and private results are never returned', async t => {
  const f=await fixture(t),{publicPageCapture,createBskCommandGate}=await import('../src/bsk-command-gate.mjs');
  const policy={schemaVersion:1,allowedPages:[{host:'favicon.io',pathPrefix:'/favicon-converter/'}]};
  let textRead=false;
  const document={body:{get innerText(){textRead=true;return 'PRIVATE FIXTURE';}},querySelectorAll:()=>[]};
  const capture=runInNewContext(publicPageCapture(policy),{URL,location:{href:'https://favicon.io/account/',origin:'https://favicon.io',pathname:'/account/'},document});
  assert.equal(capture.readAllowed,false);assert.equal(textRead,false);
  const context={runId:'fixture',stage:0,nativeDirectory:f.configuration.workspace,runDirectory:join(f.root,'audit')};
  const gate=createBskCommandGate({context,policy,bindings:{sessionId:'own',tabId:1,url:'https://favicon.io/favicon-converter/'},
    identity:{executable:'/offline/bsk'},approve:async command=>commandApproval(command),
    execute:async command=>{assert.equal(command.argv[0],'evaluate');return {stdout:JSON.stringify({value:{url:'https://favicon.io/account/',readAllowed:true,text:'PRIVATE FIXTURE'}})};}});
  const result=await gate({requestId:'read',argv:['observe']});
  assert.equal(result.status,'CAPTURE_CONTEXT_CHANGED');assert.ok(!JSON.stringify(result).includes('PRIVATE FIXTURE'));
});

test('completed lifecycle requests remain idempotent after ownership changes', async t => {
  const f=await fixture(t),{createBskCommandGate}=await import('../src/bsk-command-gate.mjs');
  const bindings={},context={runId:'fixture',stage:0,nativeDirectory:f.configuration.workspace,runDirectory:join(f.root,'audit')};
  let calls=0;
  const options={context,bindings,policy:{schemaVersion:1,browserInstance:'offline',allowedPages:[]},identity:{executable:'/offline/bsk'},
    approve:async command=>commandApproval(command),execute:async command=>{calls++;if(command.argv[1]==='start')bindings.sessionId='owned';else delete bindings.sessionId;return {stdout:'{}'};}};
  const gate=createBskCommandGate(options);
  for(const action of ['start','stop']) {
    const request={requestId:action,argv:['session',action]},result=await gate(request);
    assert.equal(result.status,'COMPLETED');assert.deepEqual(await gate(request),result);
  }
  assert.equal(calls,2);
  const resumed=createBskCommandGate(options);assert.equal((await resumed({requestId:'start',argv:['session','start']})).status,'COMPLETED');
  assert.equal(calls,2);
});

test('PNG type bytes must be alphabetic ASCII even when an attacker repairs the checksum', async t => {
  const {validateFaviconPng}=await import('../src/favicon-png.mjs');
  const bytes=pngFixture();bytes[12]|=0x80;
  let value=0xffffffff;for(const byte of bytes.subarray(12,29)){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^(0xedb88320&-(value&1));}
  bytes.writeUInt32BE((value^0xffffffff)>>>0,29);
  assert.throws(()=>validateFaviconPng(bytes),/PNG/);
});

test('unsupported real transfers are refused before reading any local input', async t => {
  const f=await fixture(t),{validateBskCommand}=await import('../src/bsk-command-gate.mjs');
  const policy={atomicFileTransferSupported:false,allowedPages:[{host:'favicon.io',pathPrefix:'/favicon-converter/'}]};
  await assert.rejects(validateBskCommand(['upload','@e1','--file',join(f.configuration.workspace,'missing.png')],{
    context:{stage:0,nativeDirectory:f.configuration.workspace},policy,bindings:{sessionId:'owned',tabId:1,url:'https://favicon.io/favicon-converter/',transferTargets}}),/TRANSFER_CONTEXT_UNVERIFIABLE/);
});

test('gate requires a host approval capability and binds decisions to exact commands with durable deduplication', async t => {
  const f = await fixture(t), { createBskCommandGate } = await import('../src/bsk-command-gate.mjs');
  const context = { runId:'fixture',stage:0,nativeDirectory:f.configuration.workspace,runDirectory:join(f.configuration.workspace,'run') };
  const identity = { executable:'/offline/bsk',version:'0.3.2',sha256:'a'.repeat(64) };
  let calls=0;
  const execute=async()=>{ calls++; return {stdout:'{"daemon_version":"0.3.2"}'}; };
  const policy={schemaVersion:1,allowedPages:[]};
  const unavailable=createBskCommandGate({context,identity,policy,execute});
  assert.equal((await unavailable({requestId:'unavailable',argv:['status','--json']})).status,'APPROVAL_CAPABILITY_UNAVAILABLE');
  assert.equal(calls,0);
  const gate=createBskCommandGate({context,identity,policy,execute,approve:async request=>commandApproval(request)});
  const first=await gate({requestId:'once',argv:['status','--json']});
  assert.equal(first.status,'COMPLETED');
  assert.deepEqual(await gate({requestId:'once',argv:['status','--json']}),first); assert.equal(calls,1);
  await assert.rejects(gate({requestId:'once',argv:['--version']}),/different/);
  const rejected=createBskCommandGate({context,identity,policy,execute,approve:async command=>commandApproval(command,{commandDigest:'wrong'})});
  assert.equal((await rejected({requestId:'wrong',argv:['status','--json']})).status,'COMMAND_NOT_APPROVED'); assert.equal(calls,1);
});

test('launch permission cannot approve commands and missing human receipts fail closed', async t => {
  const f=await fixture(t),{createBskCommandGate}=await import('../src/bsk-command-gate.mjs');
  const context={runId:'fixture',stage:0,nativeDirectory:f.configuration.workspace,runDirectory:join(f.root,'audit')};
  let calls=0;
  const options={context,identity:{executable:'/offline/bsk'},policy:{schemaVersion:1,allowedPages:[]},execute:async()=>{calls++;return {stdout:'{}'};}};
  const launch=createBskCommandGate({...options,approve:async command=>({approved:true,type:'scoped-bsk-launch',runId:'fixture',expiresAt:Date.now()+10000,digest:command.digest})});
  assert.equal((await launch({requestId:'launch',argv:['status','--json']})).status,'COMMAND_NOT_APPROVED');
  const missing=createBskCommandGate({...options,approve:async()=>null});
  assert.equal((await missing({requestId:'missing',argv:['status','--json']})).status,'COMMAND_NOT_APPROVED');
  assert.equal(calls,0);
});

test('command approval requires exact run, stage, digest, human, finite times and one-time ID', async t => {
  const f=await fixture(t),{createBskCommandGate}=await import('../src/bsk-command-gate.mjs');
  let calls=0;
  const context={runId:'fixture',stage:0,nativeDirectory:f.configuration.workspace,runDirectory:join(f.root,'audit')};
  const bad=[{runId:'other'},{stage:1},{commandDigest:'wrong'},{approvedBy:''},{approvedAt:Date.now()+60000},
    {expiresAt:Date.now()-1},{expiresAt:NaN},{executionId:''},{executionId:'../outside'},{executionId:42}];
  for(let i=0;i<bad.length;i++) {
    const gate=createBskCommandGate({context,identity:{executable:'/offline/bsk'},policy:{schemaVersion:1,allowedPages:[]},
      approve:async command=>commandApproval(command,bad[i]),execute:async()=>{calls++;return {stdout:'{}'};}});
    assert.equal((await gate({requestId:'invalid-'+i,argv:['status','--json']})).status,'COMMAND_NOT_APPROVED');
  }
  assert.equal(calls,0);
});

test('one-time approvals cannot execute a second request even after a gate restart', async t => {
  const f=await fixture(t),{createBskCommandGate}=await import('../src/bsk-command-gate.mjs');
  const context={runId:'fixture',stage:0,nativeDirectory:f.configuration.workspace,runDirectory:join(f.root,'audit')};
  let calls=0;
  const options={context,identity:{executable:'/offline/bsk'},policy:{schemaVersion:1,allowedPages:[]},
    approve:async command=>commandApproval(command,{executionId:'once-only'}),execute:async()=>{calls++;return {stdout:'{}'};}};
  const gate=createBskCommandGate(options),first={requestId:'first',argv:['status','--json']};
  assert.equal((await gate(first)).status,'COMPLETED');
  assert.equal((await createBskCommandGate(options)(first)).status,'COMPLETED');
  assert.equal((await createBskCommandGate(options)({requestId:'second',argv:['--version']})).status,'COMMAND_NOT_APPROVED');
  assert.equal(calls,1);
});

test('a receipt for earlier command parameters cannot approve new parameters', async t => {
  const f=await fixture(t),{createBskCommandGate}=await import('../src/bsk-command-gate.mjs');
  const context={runId:'fixture',stage:0,nativeDirectory:f.configuration.workspace,runDirectory:join(f.root,'audit')};
  let calls=0,receipt;
  const gate=createBskCommandGate({context,identity:{executable:'/offline/bsk'},policy:{schemaVersion:1,allowedPages:[]},
    approve:async command=>receipt??=commandApproval(command),execute:async()=>{calls++;return {stdout:'{}'};}});
  assert.equal((await gate({requestId:'old',argv:['status','--json']})).status,'COMPLETED');
  assert.equal((await gate({requestId:'new',argv:['--version']})).status,'COMMAND_NOT_APPROVED');assert.equal(calls,1);
});

test('Steam capture returns only typed Bodycam public fields and never reads account or whole-body text', async () => {
  const {publicPageCapture}=await import('../src/bsk-command-gate.mjs');
  let bodyRead=false;
  const game={"@type":"VideoGame",name:'Bodycam',url:'https://store.steampowered.com/app/2406770/Bodycam/',description:'Public game description',
    publisher:{name:'Reissad Studio'},account:'PRIVATE ACCOUNT',cookie:'PRIVATE COOKIE'};
  const policy={game:bodycamGame,allowedPages:[{host:'store.steampowered.com',pathPrefix:'/app/2406770/'}]};
  const document={body:{get innerText(){bodyRead=true;throw Error('Private header read');}},
    querySelectorAll:selector=>selector==='script[type="application/ld+json"]'?[{textContent:JSON.stringify(game)}]:[]};
  const result=runInNewContext(publicPageCapture(policy),{URL,location:{href:game.url},document});
  assert.equal(result.readAllowed,true);assert.equal(result.content.name,'Bodycam');assert.equal(bodyRead,false);
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});

test('Steam capture refuses mismatched or absent public game identity before reading body', async () => {
  const {publicPageCapture}=await import('../src/bsk-command-gate.mjs');
  const policy={game:bodycamGame,allowedPages:[{host:'store.steampowered.com',pathPrefix:'/app/2406770/'}]};
  let bodyRead=false;
  for(const game of [null,{"@type":"VideoGame",name:'Other Game',url:'https://store.steampowered.com/app/2406770/Bodycam/'},
    {"@type":"VideoGame",name:'Bodycam',url:'https://store.steampowered.com/app/999/Other/'}]) {
    const result=runInNewContext(publicPageCapture(policy),{URL,location:{href:'https://store.steampowered.com/app/2406770/Bodycam/'},
      document:{body:{get innerText(){bodyRead=true;return 'PRIVATE';}},querySelectorAll:()=>game?[{textContent:JSON.stringify(game)}]:[]}});
    assert.equal(result.readAllowed,false);
  }
  assert.equal(bodyRead,false);
});

test('Steam capture rejects page identity changing during public data extraction', async () => {
  const {publicPageCapture}=await import('../src/bsk-command-gate.mjs');
  const url='https://store.steampowered.com/app/2406770/Bodycam/',location={href:url};
  const policy={game:bodycamGame,allowedPages:[{host:'store.steampowered.com',pathPrefix:'/app/2406770/'}]};
  const script={get textContent(){location.href='https://store.steampowered.com/account/';return JSON.stringify({'@type':'VideoGame',name:'Bodycam',url});}};
  const result=runInNewContext(publicPageCapture(policy),{URL,location,document:{querySelectorAll:()=>[script]}});
  assert.equal(result.readAllowed,false);assert.equal(result.status,'PAGE_IDENTITY_CHANGED');assert.equal(result.content,undefined);
});

test('host public capture reconstruction discards private fields and arbitrary envelope text', async t=>{
  const f=await fixture(t),{createBskCommandGate}=await import('../src/bsk-command-gate.mjs');
  const url='https://store.steampowered.com/app/2406770/Bodycam/';
  const context={runId:'fixture',stage:0,nativeDirectory:f.configuration.workspace,runDirectory:join(f.root,'audit')};
  const gate=createBskCommandGate({context,policy:{schemaVersion:1,game:bodycamGame,allowedPages:[{host:'store.steampowered.com',pathPrefix:'/app/2406770/'}]},
    identity:{executable:'/offline/fake-bsk'},bindings:{sessionId:'owned',tabId:1,url},approve:async command=>commandApproval(command),
    execute:async()=>({stdout:JSON.stringify({account:'PRIVATE ENVELOPE',value:{url,readAllowed:true,sourceSchema:'STEAM_PUBLIC_GAME_JSON_LD_V1',
      content:{name:'Bodycam',url,description:'Public description',account:'PRIVATE CONTENT'},text:'PRIVATE WHOLE BODY',controls:[{account:'PRIVATE CONTROL'}]}})})});
  const result=await gate({requestId:'clean',argv:['observe']});
  assert.equal(result.status,'COMPLETED');assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  assert.equal(JSON.parse(result.stdout).value.content.description,'Public description');
  assert.doesNotMatch(await readFile(join(context.runDirectory,'bsk-audit/clean.json'),'utf8'),/PRIVATE ENVELOPE|PRIVATE CONTENT|PRIVATE WHOLE BODY|PRIVATE CONTROL/);
});

test('host rejects changed game identity, schema and invalid public field types', async t=>{
  const f=await fixture(t),{createBskCommandGate}=await import('../src/bsk-command-gate.mjs');
  const url='https://store.steampowered.com/app/2406770/Bodycam/';
  const base={url,readAllowed:true,sourceSchema:'STEAM_PUBLIC_GAME_JSON_LD_V1',content:{name:'Bodycam',url}};
  const responses=[{...base,sourceSchema:'OTHER'},{...base,url:'https://store.steampowered.com/app/2406770/Other/'},{...base,content:{...base.content,name:'Other'}},
    {...base,content:{...base.content,url:'https://store.steampowered.com/app/999/Other/'}},
    {...base,content:{...base.content,description:{private:'PRIVATE OBJECT'}}}];
  for(let i=0;i<responses.length;i++) {
    const gate=createBskCommandGate({context:{runId:'fixture',stage:0,nativeDirectory:f.configuration.workspace,runDirectory:join(f.root,'audit')},
      policy:{schemaVersion:1,game:bodycamGame,allowedPages:[{host:'store.steampowered.com',pathPrefix:'/app/2406770/'}]},identity:{executable:'/offline/fake-bsk'},bindings:{sessionId:'owned',tabId:1,url},
      approve:async command=>commandApproval(command),execute:async()=>({stdout:JSON.stringify({value:responses[i]})})});
    assert.equal((await gate({requestId:'bad-schema-'+i,argv:['observe']})).status,'PUBLIC_CONTENT_UNVERIFIED');
  }
});

test('malformed browser capture envelopes fail closed without retaining raw content', async t=>{
  const f=await fixture(t),{createBskCommandGate}=await import('../src/bsk-command-gate.mjs');
  const url='https://store.steampowered.com/app/2406770/Bodycam/';
  for(const [i,stdout] of ['PRIVATE NON JSON','null','{}','{"value":[]}'].entries()) {
    const gate=createBskCommandGate({context:{runId:'fixture',stage:0,nativeDirectory:f.configuration.workspace,runDirectory:join(f.root,'audit')},
      policy:{schemaVersion:1,game:bodycamGame,allowedPages:[{host:'store.steampowered.com',pathPrefix:'/app/2406770/'}]},identity:{executable:'/offline/fake-bsk'},bindings:{sessionId:'owned',tabId:1,url},
      approve:async command=>commandApproval(command),execute:async()=>({stdout})});
    const result=await gate({requestId:'malformed-'+i,argv:['observe']});
    assert.equal(result.status,'PUBLIC_CONTENT_UNVERIFIED');assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  }
});
