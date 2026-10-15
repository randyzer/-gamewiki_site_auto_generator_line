#!/usr/bin/env node
import { probeWorkerIsolation } from '../src/worker-isolation.mjs';

try {
  const result = await probeWorkerIsolation({ stagePolicy: process.argv.slice(2).includes('--stage-policy') });
  console.log(JSON.stringify(result, null, 2));
  // Even filesystem canary success does not certify GUI/identity isolation.
  process.exitCode = 2;
} catch {
  console.log(JSON.stringify({ status: 'BLOCKED', code: 'ISOLATION_PROBE_UNAVAILABLE',
    productionActivationAuthorized: false }));
  process.exitCode = 2;
}
