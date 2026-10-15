import {collectHomeObservation,collectHoveredCardObservation,collectArticleObservation} from './browser-readonly-callbacks.mjs';
import {writeFileSync} from 'node:fs';
const callbacks={collectHomeObservation,collectHoveredCardObservation,collectArticleObservation};
const rows=Object.entries(callbacks).map(([name,callback])=>{const source=Function.prototype.toString.call(callback);return{name,source,valid:!/__name|process\.|require\(|Buffer|globalThis|__dirname|__filename/.test(source)};});
const result={status:rows.every(r=>r.valid)?'PASS':'FAIL',mode:'actual tsx .ts file import of native .mjs',rows};
writeFileSync(new URL('./callback-serialization-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result.status);if(result.status!=='PASS')process.exitCode=1;
