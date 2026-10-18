import { readFile } from 'node:fs/promises';
import { createTestApprovalHarness } from '../../src/approval/approval-engine.mjs';

const input = JSON.parse(await readFile(process.argv[2], 'utf8'));
const harness = await createTestApprovalHarness({ rootDirectory: input.rootDirectory, namespace: input.namespace });
try {
  await harness.consumer.consume(input.reference, input.expected);
  process.stdout.write('CONSUMED\n');
} catch (error) {
  if (error.code === 'APPROVAL_ALREADY_CONSUMED') {
    process.stdout.write('ALREADY_CONSUMED\n');
    process.exitCode = 2;
  } else {
    process.stderr.write(`${error.code ?? error.name}: ${error.message}\n`);
    process.exitCode = 3;
  }
}
