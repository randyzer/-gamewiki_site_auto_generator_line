import {observeFreshness} from '../iteration32/freshness-observation.mjs';
import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {join} from 'node:path';
const out=join(process.cwd(),'../../template/codex/executions/v2.7-ws03d/iteration33');
const text=Function.prototype.toString.call(observeFreshness);
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
writeFileSync(join(out,'iteration32-observer-serialized.txt'),text+'\n',{flag:'wx'});
const record={status:text.includes('__name')?'DIAGNOSIS_CONFIRMED':'INCONCLUSIVE',containsNameHelper:text.includes('__name'),serializedSha256:sha(text),sourceSha256:sha(readFileSync(join(out,'../iteration32/freshness-observation.mjs'))),actualRuntime:'node_modules/.bin/tsx',qualificationAttempts:0};
writeFileSync(join(out,'iteration32-observer-serialization.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(record));if(!record.containsNameHelper)throw Error('Diagnosis inconclusive STOP');
