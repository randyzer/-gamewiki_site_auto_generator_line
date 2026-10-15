import {collectControlGeometry} from './geometry-readonly-callbacks.mjs';
import {writeFileSync} from 'node:fs';
const source=Function.prototype.toString.call(collectControlGeometry);const valid=!/__name|__toESM|__commonJS|process\.|require\(|Buffer|globalThis|__dirname|__filename/.test(source);const result={status:valid?'PASS':'FAIL',mode:'actual tsx .ts import',source};writeFileSync(new URL('./callback-serialization-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result.status);if(!valid)process.exitCode=1;
