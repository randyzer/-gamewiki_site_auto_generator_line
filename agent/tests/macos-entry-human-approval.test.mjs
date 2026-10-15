import test from 'node:test';
import assert from 'node:assert/strict';

const binding = { kind: 'ENTRY_HOST_APPROVAL_V1', purpose: 'fresh-pipeline-only', releaseAuthorized: false,
  configuration: { workspace: '/tmp/agent' }, inputs: { gameIdentity: 'Test game', objective: 'Test objective' },
  snapshot: { runId: 'draft', revision: 1, executionRunId: 'execution', workspace: '/tmp/agent/workspaces/execution/site',
    inventorySha256: 'a'.repeat(64), skills: [{ name: 'test-skill', sha256: 'b'.repeat(64) }] } };

test('macOS entry authorizer exists and explicit approval binds full prompt', async () => {
  const api = await import('../src/macos-entry-human-approval.mjs');
  let request;
  const authorize = api.createMacEntryHumanAuthorize({ platform: 'darwin', now: () => 1000,
    dialog: async value => { request = value; return { stdout: value.challenge + '\n' }; } });
  const identity = await authorize(binding);
  assert.equal(identity.approver, 'local-macos-interactive-operator');
  assert.equal(identity.approvedAt, 1000);
  assert.equal(identity.expiresAt, 61000);
  for (const value of ['draft', 'execution', 'Revision: 1', 'Test game', 'Test objective', binding.snapshot.workspace,
    binding.snapshot.inventorySha256, 'test-skill', 'Copy template', 'Codex workers', 'network', 'Binding SHA256'])
    assert.ok(request.message.includes(value), value);
  assert.match(request.script, /default button "Deny" cancel button "Deny" giving up after 50/);
});

test('denial, forged text, errors, timeout and non-macOS fail closed', async () => {
  const { createMacEntryHumanAuthorize } = await import('../src/macos-entry-human-approval.mjs');
  for (const stdout of ['DENIED', 'APPROVED', '', JSON.stringify({ approved: true })]) {
    assert.equal(await createMacEntryHumanAuthorize({ platform: 'darwin', dialog: async () => ({ stdout }) })(binding), null);
  }
  assert.equal(await createMacEntryHumanAuthorize({ platform: 'darwin', dialog: async () => { throw Error('timeout'); } })(binding), null);
  assert.equal(await createMacEntryHumanAuthorize({ platform: 'darwin', timeoutMs: 5,
    dialog: async () => new Promise(() => {}) })(binding), null);
  assert.equal(await createMacEntryHumanAuthorize({ platform: 'linux', dialog: () => { throw Error('must not call'); } })(binding), null);
});

test('old dialog response cannot authorize another issuance; JSON flags cannot approve', async () => {
  const { createMacEntryHumanAuthorize } = await import('../src/macos-entry-human-approval.mjs');
  let old;
  const authorize = createMacEntryHumanAuthorize({ platform: 'darwin', dialog: async ({ challenge }) => {
    old ??= challenge; return { stdout: old };
  } });
  assert.ok(await authorize(binding));
  assert.equal(await authorize(binding), null);
  assert.equal(await authorize({ ...binding, approved: true, approver: 'model' }), null);
});
