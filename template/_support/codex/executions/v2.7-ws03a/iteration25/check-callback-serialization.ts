import {collectHomeObservation,collectHoveredCardObservation,collectArticleObservation} from './browser-readonly-callbacks.mjs';
import {writeFileSync} from 'node:fs';
const callbacks={collectHomeObservation,collectHoveredCardObservation,collectArticleObservation};
const rows=Object.entries(callbacks).map(([name,callback])=>{const source=Function.prototype.toString.call(callback);return{name,source,valid:!/__name|__toESM|__commonJS|process\.|require\(|Buffer|globalThis|__dirname|__filename/.test(source)};});
const home=rows.find(r=>r.name==='collectHomeObservation')!.source;const inner=home.slice(home.indexOf('{')+1);const homeStructureValid=!/\b(?:const|let)\s+\w+\s*=\s*(?:async\s*)?(?:\([^;]*?\)|\w+)\s*=>|\b(?:const|let)\s+\w+\s*=\s*(?:async\s+)?function|\bfunction(?:\s+\w+)?\s*\(/.test(inner);
const result={status:rows.every(r=>r.valid)&&homeStructureValid?'PASS':'FAIL',homeStructureValid,mode:'actual tsx .ts file import of native .mjs',rows};
writeFileSync(new URL('./callback-serialization-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result.status);if(result.status!=='PASS')process.exitCode=1;
