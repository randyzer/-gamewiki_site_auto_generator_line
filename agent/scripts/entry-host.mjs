#!/usr/bin/env node
import { createProductionEntryBootstrap } from '../src/entry-host-bootstrap.mjs';
import { previewEntryHandoff } from '../src/entry-v1.mjs';

// No ticket, arbitrary error text, --force or JSON approval path.
let attempted = false;
try {
  const [action, ...args] = process.argv.slice(2);
  let request;
  if (['preview', 'execute'].includes(action) && args.length === 3 && /^[1-9][0-9]*$/.test(args[1])) {
    request = { runId: args[0], expectedRevision: Number(args[1]), executionRunId: args[2] };
  } else if (action === 'resume' && args.length === 2 && /^[a-f0-9]{64}$/.test(args[1])) {
    request = { runId: args[0], expectedManifestSha256: args[1] };
  } else if (action === 'confirm-plan' && args.length === 3 && args.slice(1).every(x => /^[a-f0-9]{64}$/.test(x))) {
    request = { runId: args[0], expectedManifestSha256: args[1], planDigest: args[2] };
  } else throw Error('ENTRY_HOST_REQUEST_INVALID');
  let result;
  if (action === 'preview') {
    const preview = await previewEntryHandoff(request);
    result = { ...preview, hostExecutionStages: preview.snapshot.stages };
  }
  else {
    const execute = await createProductionEntryBootstrap();
    attempted = true;
    result = action === 'resume' ? await execute.resume(request)
      : action === 'confirm-plan' ? await execute.confirmPlan(request) : await execute(request);
  }
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = ['PREVIEW_ONLY', 'PASSED', 'PAUSED'].includes(result.status) ? 0 : 2;
} catch (error) {
  process.stdout.write(JSON.stringify({ status: 'BLOCKED', code: /^ENTRY_[A-Z_]+$/.test(error.message ?? '')
    ? error.message : 'ENTRY_HOST_EXECUTION_REJECTED',
    executorStarted: attempted ? null : false, executionAttempted: attempted, releaseAuthorized: false }) + '\n');
  process.exitCode = 2;
}
