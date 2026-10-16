import { resolve } from 'node:path';
import { captureStoppedKeywordAttempt } from '../src/keyword-recovery.mjs';

const [runDirectory, attempt, ...rest] = process.argv.slice(2);
if (!runDirectory || !/^[1-9]\d*$/.test(attempt ?? '') || rest.length)
  throw Error('Usage: node scripts/keyword-recovery.mjs RUN_DIRECTORY CURRENT_STOPPED_ATTEMPT');
console.log(JSON.stringify(await captureStoppedKeywordAttempt(resolve(runDirectory), Number(attempt)), null, 2));
