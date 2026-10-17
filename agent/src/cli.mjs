import { readFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { safePath } from './files.mjs';
import { generateInventory } from './skill-lock.mjs';
import { loadConfiguration } from './orchestrator.mjs';
import { existingProjectPreflight } from './existing-project-preflight.mjs';
import { intakeSummary } from './intake-card.mjs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {previewEntry,createEntry,updateEntry,statusEntry,previewEntryHandoff,validateEntryHandoff} from './entry-v1.mjs';
import { runFromTerminal } from './terminal-run.mjs';
import { reportCliResult } from './cli-result.mjs';

const [command, file, id, revision] = process.argv.slice(2);
async function entryInput(file) {
  let bytes;
  if (file !== '-') {
    const path=resolve(file);
    await safePath(path,[path]);
    const info=await lstat(path);
    if(!info.isFile()||info.size>64*1024)throw Error('ENTRY_INPUT_TOO_LARGE');
    bytes=await readFile(path);
  } else {
    const chunks=[];
    let size=0;
    for await (const piece of process.stdin) {
      const chunk=Buffer.from(piece);
      size+=chunk.length;
      if(size>64*1024)throw Error('ENTRY_INPUT_TOO_LARGE');
      chunks.push(chunk);
    }
    bytes=Buffer.concat(chunks);
  }
  if(bytes.length>64*1024)throw Error('ENTRY_INPUT_TOO_LARGE');
  try{return JSON.parse(bytes.toString('utf8'));}
  catch{throw Error('ENTRY_INVALID_JSON');}
}
const reportEntry = result => {
  reportCliResult(result);
};
if (command?.startsWith('entry-')) {
  try {
    const count=process.argv.slice(2).length;
    if(command==='entry-preview'&&file&&(count===2||count===3))reportEntry(await previewEntry(await entryInput(file),{runId:id}));
    else if(command==='entry-create'&&file&&id&&count===3)reportEntry(await createEntry(await entryInput(file),id));
    else if(command==='entry-update'&&file&&id&&count===4&&/^\d+$/.test(revision??''))reportEntry(await updateEntry(await entryInput(file),id,Number(revision)));
    else if(command==='entry-status'&&file&&count===2)reportEntry(await statusEntry(file));
    else if(command==='entry-handoff-preview'&&file&&count===2)reportEntry(await previewEntryHandoff(await entryInput(file)));
    else if(command==='entry-handoff-validate'&&file&&count===2)reportEntry(await validateEntryHandoff(await entryInput(file)));
    else throw Error('ENTRY_INVALID_ARGUMENTS');
  } catch(error) {
    const code=/^ENTRY_[A-Z0-9_]+$/.test(error.message)?error.message:
      error.code==='EEXIST'?'ENTRY_RUN_ALREADY_EXISTS':
      error.code==='ENOENT'?'ENTRY_NOT_FOUND':'ENTRY_UNAVAILABLE';
    reportEntry({status:'BLOCKED',code,approvedToRun:false,executorStarted:false,siteWrites:false,releaseAuthorized:false});
  }
}
else if (command === 'inventory') console.log(await generateInventory());
else if (command === 'review-card' && file) console.log(JSON.stringify(intakeSummary(JSON.parse(await readFile(file, 'utf8'))), null, 2));
else if (command === 'preflight' && file) {
  const config = await loadConfiguration();
  const runId = id ?? 'preflight-' + randomUUID();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(runId)) throw Error('Unsafe runId');
  const { report } = await existingProjectPreflight(JSON.parse(await readFile(file, 'utf8')), {
    allowlist: config.existingProjectAllowlist, runDirectory: join(config.workspace, 'runs', runId) });
  console.log(JSON.stringify({ runId, reportDirectory: join(config.workspace, 'runs', runId), ...report }, null, 2));
  if (report.status !== 'PASSED') process.exitCode = 2;
}
else if (['run', 'retry'].includes(command) && file && id) {
  const options = process.argv.slice(5);
  let confirmation = {};
  if (options.length === 1 && options[0] === '--preview') confirmation = { preview: true };
  else if (options.length === 2 && options[0] === '--confirm' && !options[1].startsWith('--'))
    confirmation = { confirm: options[1] };
  else if (options.length) throw Error('RUN_ARGUMENTS_INVALID: expected --preview or --confirm CODE');
  const result = await runFromTerminal({ command, inputsFile: file, runId: id, ...confirmation });
  if (result.status !== 'PREVIEW') reportEntry(result);
} else {
  console.error('Usage: node src/cli.mjs entry-preview INPUTS.json| - [RUN_ID] | entry-create INPUTS.json|- RUN_ID | entry-status RUN_ID | entry-update PATCH.json|- RUN_ID EXPECTED_REVISION | entry-handoff-preview REQUEST.json|- | entry-handoff-validate SNAPSHOT.json|- | inventory | review-card CARD.json | preflight CARD.json [RUN_ID] | run INPUTS.json RUN_ID [--preview | --confirm CODE] | retry INPUTS.json RUN_ID [--preview | --confirm CODE]');
  process.exitCode = 2;
}
