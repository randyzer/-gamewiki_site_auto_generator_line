import { readFile } from 'node:fs/promises';
import { createTestApprovalHarness } from '../../src/approval/approval-engine.mjs';
import { createTestHostCapabilityRegistry } from '../../src/v2/host/capability-registry.mjs';
import { createOfflineTransactionCoordinator } from '../../src/v2/transaction-coordinator.mjs';

const input = JSON.parse(await readFile(process.argv[2], 'utf8'));
try {
  const approvalHarness = await createTestApprovalHarness({ rootDirectory: input.rootDirectory,
    namespace: input.namespace });
  const capabilityRegistry = createTestHostCapabilityRegistry();
  const capability = capabilityRegistry.issue({ capability: 'OFFLINE_TRANSACTION', mode: 'SIMULATED',
    rootDirectory: input.rootDirectory });
  const coordinator = createOfflineTransactionCoordinator({ rootDirectory: input.rootDirectory,
    namespace: input.namespace, approvalHarness, capabilityRegistry, capability, clock: () => 1500 });
  const outcome = await coordinator.execute(input.request);
  process.stdout.write(JSON.stringify({ ok: true, status: outcome.status, commitDigest: outcome.commitDigest }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, code: error.code ?? 'ERROR' }));
}
