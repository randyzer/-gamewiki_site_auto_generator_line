import test from 'node:test';
import assert from 'node:assert/strict';

const categories = ['host-approval', 'synthetic-credential', 'other-run', 'template-source', 'original-site'];

test('stage-policy certification requires readonly, descendant and reachable loopback controls', async () => {
  const { assessWorkerIsolation } = await import('../src/worker-isolation.mjs');
  const evidence = { exitCode: 0, stagePolicy: true, allowed: { read: true, write: true },
    protected: categories.map(category => ({ category, read: false, write: false })) };
  assert.equal(assessWorkerIsolation(evidence).status, 'BLOCKED');
  const full = { ...evidence, readonly: [{ category: 'locked-skill', read: true, write: false },
    { category: 'approved-input', read: true, write: false }], descendant: { read: false, write: false },
    loopbackPositiveControl: true, loopbackConnected: false };
  assert.equal(assessWorkerIsolation(full).filesystemIsolationVerified, true);
  assert.equal(assessWorkerIsolation({ ...full, loopbackPositiveControl: false }).status, 'BLOCKED');
  assert.equal(assessWorkerIsolation({ ...full, loopbackConnected: true }).code, 'WORKER_LOOPBACK_NETWORK_ALLOWED');
  assert.equal(assessWorkerIsolation({ ...full, descendant: { read: true, write: false } }).status, 'BLOCKED');
});

test('canary uses a named deny-by-default profile without legacy sandbox settings', async () => {
  const { canarySandboxArgs } = await import('../src/worker-isolation.mjs');
  const args = canarySandboxArgs('/task/allowed', '/usr/local/bin/node', '/usr/local/bin/node');
  assert.deepEqual(args.slice(0, 3), ['sandbox', '--permission-profile', 'agent-canary']);
  assert.equal(args.some(value => value.includes('sandbox_mode')), false);
  const config = args[args.indexOf('-c') + 1];
  assert.match(config, /":root"="deny"/);
  assert.match(config, /":minimal"="read"/);
  assert.match(config, /"\/task\/allowed"="write"/);
  assert.match(config, /network=\{enabled=false\}/);
  assert.equal(config.includes(':workspace'), false);
});

test('readable protected canary blocks isolation even when all protected writes are denied', async () => {
  const { assessWorkerIsolation } = await import('../src/worker-isolation.mjs');
  const report = assessWorkerIsolation({ exitCode: 0, allowed: { read: true, write: true },
    protected: categories.map(category => ({ category, read: true, write: false })) });
  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.code, 'WORKER_PROTECTED_READ_ALLOWED');
  assert.equal(report.filesystemIsolationVerified, false);
});

test('failed sandbox application cannot be confused with an isolated worker', async () => {
  const { assessWorkerIsolation } = await import('../src/worker-isolation.mjs');
  const report = assessWorkerIsolation({ exitCode: 71, failure: 'SANDBOX_APPLY_DENIED' });
  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.code, 'SANDBOX_APPLY_DENIED');
  assert.equal(report.probeExecuted, false);
});

test('CLI permission-profile requirement remains a precise configuration blocker', async () => {
  const { assessWorkerIsolation } = await import('../src/worker-isolation.mjs');
  const report = assessWorkerIsolation({ exitCode: 2, failure: 'SANDBOX_PERMISSION_PROFILE_REQUIRED' });
  assert.equal(report.code, 'SANDBOX_PERMISSION_PROFILE_REQUIRED');
  assert.equal(report.probeExecuted, false);
});

test('missing positive control or missing protected categories rejects isolation evidence', async () => {
  const { assessWorkerIsolation } = await import('../src/worker-isolation.mjs');
  const positive = { exitCode: 0, allowed: { read: true, write: true },
    protected: categories.map(category => ({ category, read: false, write: false })) };
  assert.equal(assessWorkerIsolation({ ...positive, allowed: { read: false, write: false } }).status, 'BLOCKED');
  assert.equal(assessWorkerIsolation({ ...positive, protected: positive.protected.slice(1) }).status, 'BLOCKED');
  assert.equal(assessWorkerIsolation(positive).filesystemIsolationVerified, true);
  assert.equal(assessWorkerIsolation(positive).productionActivationAuthorized, false);
});
