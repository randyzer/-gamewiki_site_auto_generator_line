// Trusted-bootstrap adapter only. Never construct authorize from task JSON or model output.
// The store must be protected from the worker by the host's OS identity/sandbox.
import { mkdir, open, lstat, readFile, realpath, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { safePath, sha256 } from './files.mjs';
import { createMacEntryHumanAuthorize } from './macos-entry-human-approval.mjs';
import { validateEntryResume } from './entry-resume-snapshot.mjs';

// Explicit trusted-bootstrap opt-in; no CLI/task switch and no default store.
export async function createMacLocalEntryApprovalHost({ directory, now = Date.now } = {}, humanOptions = {}) {
  return createLocalEntryApprovalHost({ directory, now,
    authorize: createMacEntryHumanAuthorize({ ...humanOptions, now }) });
}

async function syncDirectory(path) {
  const fd = await open(path, 'r');
  try { await fd.sync(); } finally { await fd.close(); }
}
async function durableFile(path, bytes, mode = 0o400) {
  const fd = await open(path, 'wx', mode);
  try { await fd.writeFile(bytes); await fd.sync(); } finally { await fd.close(); }
}
const encode = value => JSON.stringify(value);

export async function createLocalEntryApprovalHost({ directory, authorize, now = Date.now } = {}) {
  if (typeof directory !== 'string' || resolve(directory) !== directory) throw Error('ENTRY_STORE_PATH_INVALID');
  await safePath(directory, [directory]);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const stat = await lstat(directory);
  if (!stat.isDirectory() || (stat.mode & 0o077) || stat.uid !== process.getuid()) throw Error('ENTRY_STORE_NOT_PRIVATE');
  const pending = new WeakMap();
  function timeValid(record) {
    const time = now();
    return Number.isSafeInteger(time) && Number.isSafeInteger(record.approvedAt) &&
      Number.isSafeInteger(record.expiresAt) && record.approvedAt <= time &&
      record.expiresAt > time && record.expiresAt > record.approvedAt &&
      typeof record.approver === 'string' && record.approver.trim();
  }
  return {
    async issue(binding) {
      if (typeof authorize !== 'function') throw Error('ENTRY_HUMAN_CHANNEL_UNAVAILABLE');
      const captured = structuredClone(binding);
      const identity = await authorize(structuredClone(captured));
      if (!identity || !timeValid(identity)) throw Error('ENTRY_HUMAN_AUTHORIZATION_REJECTED');
      const ticket = randomUUID();
      const record = { binding: captured, approver: identity.approver,
        approvedAt: identity.approvedAt, expiresAt: identity.expiresAt, approvalId: randomUUID() };
      await durableFile(join(directory, ticket + '.json'), encode(record));
      await syncDirectory(directory);
      return ticket;
    },
    async consume({ ticket, binding }) {
      if (!/^[a-f0-9-]{36}$/.test(ticket ?? '')) throw Error('ENTRY_TICKET_INVALID');
      const file = join(directory, ticket + '.json');
      await safePath(file, [directory]);
      const record = JSON.parse(await readFile(file, 'utf8'));
      if (!timeValid(record) || !isDeepStrictEqual(record.binding, binding)) throw Error('ENTRY_TICKET_REJECTED');
      // O_EXCL is the cross-process linearization point. Any later failure leaves
      // the tombstone in place, including process death or incomplete fsync.
      await durableFile(join(directory, ticket + '.used'), encode({ approvalId: ticket }));
      await syncDirectory(directory);
      const receipt = { ...record, used: true };
      pending.set(receipt, structuredClone(record));
      return receipt;
    },
    async prepare({ receipt, binding }) {
      const record = pending.get(receipt);
      pending.delete(receipt);
      if (!record || !timeValid(record) || !isDeepStrictEqual(record.binding, binding)) throw Error('ENTRY_PREPARATION_REJECTED');
      const id = binding.snapshot.executionRunId, root = binding.configuration.workspace;
      const resume = binding.purpose === 'resume-pipeline-only';
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw Error('ENTRY_RUN_INVALID');
      const runDirectory = join(root, 'runs', id), workspace = join(root, 'workspaces', id);
      if ((resume ? binding.inputs.projectPath : binding.snapshot.workspace) !== join(workspace, 'site')) throw Error('ENTRY_RUN_BINDING_INVALID');
      if (resume) {
        await validateEntryResume(binding.snapshot, binding.configuration);
        const originalId = binding.snapshot.originalApprovalId;
        if (!/^[a-f0-9-]{36}$/.test(originalId ?? '')) throw Error('ENTRY_RESUME_ORIGINAL_APPROVAL_INVALID');
        const originalPath = join(directory, originalId + '.execution.json');
        await safePath(originalPath, [directory]);
        const original = JSON.parse(await readFile(originalPath));
        if (original.executionRunId !== id || original.bindingSha256 !== binding.snapshot.originalBindingSha256)
          throw Error('ENTRY_RESUME_ORIGINAL_APPROVAL_INVALID');
      }
      const identities = [];
      for (const path of [runDirectory, workspace]) {
        await safePath(path, [root]);
        if (!resume) {
          await mkdir(path, { mode: 0o700 }); // fresh approvals never adopt a directory
          await syncDirectory(resolve(path, '..'));
        }
        const info = await lstat(path);
        identities.push({ path, dev: info.dev, ino: info.ino });
      }
      const inputs = structuredClone(binding.inputs), files = [];
      let revisionPath, revisionDigest;
      for (const key of ['rawKeywordsFile', 'keywordSourceLineageFile', 'iconSourcePng']) {
        if (!inputs[key]) continue;
        if (resume) {
          const material = binding.snapshot.materials.find(item => item.key === key);
          await safePath(material.path, [material.path]);
          const bytes = await readFile(material.path);
          if (sha256(bytes) !== material.sha256) throw Error('ENTRY_MATERIAL_CHANGED');
          if (binding.snapshot.action === 'UPDATE_INPUTS' && Object.hasOwn(binding.snapshot.patch, key)) {
            const area = join(runDirectory, 'approved-input-revisions', record.approvalId);
            await safePath(area, [root]); await mkdir(area, { recursive: true, mode: 0o700 });
            const path = join(area, key === 'rawKeywordsFile' ? 'keywords.md' : 'lineage.json');
            await durableFile(path, bytes); await syncDirectory(area);
            inputs[key] = path; files.push({ path, digest: material.sha256 });
          } else files.push({ path: material.path, digest: material.sha256 });
          continue;
        }
        await safePath(inputs[key], [root, resolve(inputs[key], '..')]);
        const bytes = await readFile(inputs[key]);
        const digest = binding.snapshot.materials?.[key]?.sha256;
        if (sha256(bytes) !== digest) throw Error('ENTRY_MATERIAL_CHANGED');
        const path = join(runDirectory, key === 'rawKeywordsFile' ? 'approved-keywords.md'
          : key === 'keywordSourceLineageFile' ? 'approved-keyword-lineage.json' : 'approved-icon.png');
        await durableFile(path, bytes);
        files.push({ path, digest }); inputs[key] = path;
      }
      const snapshotPath = join(runDirectory, 'APPROVED_INPUTS.json');
      if (resume) {
        files.push({ path: binding.snapshot.approvedRecordPath, digest: binding.snapshot.approvedInputsSha256 });
        if (binding.snapshot.action) {
          const area = join(runDirectory, 'approved-input-revisions');
          await mkdir(area, { recursive: true, mode: 0o700 });
          revisionPath = join(area, record.approvalId + '.json');
          const revisionBytes = encode({ binding, inputs, approvalId: record.approvalId,
            previousRecord: binding.snapshot.approvedRecordPath, previousRecordSha256: binding.snapshot.approvedInputsSha256 });
          await durableFile(revisionPath, revisionBytes); await syncDirectory(area);
          revisionDigest = sha256(revisionBytes); files.push({ path: revisionPath, digest: revisionDigest });
        }
      }
      else {
        const bytes = encode({ binding, inputs, approvalId: record.approvalId });
        await durableFile(snapshotPath, bytes);
        files.push({ path: snapshotPath, digest: sha256(bytes) });
      }
      await syncDirectory(runDirectory);
      const dependencies = binding.configuration.inventoryPath ? [{
        path: binding.configuration.inventoryPath, digest: binding.snapshot.inventorySha256
      }] : [];
      const capturedInputs = structuredClone(inputs);
      const auditPath = join(directory, record.approvalId + '.execution.json');
      const stoppedPath = join(directory, record.approvalId + '.stopped');
      let started = false, stopped = false, auditDigest;
      const permit = { kind: resume ? 'ENTRY_LOCAL_RESUME_V1' : 'ENTRY_LOCAL_EXECUTION_V1', inputs, runDirectory,
        ...(resume ? { manifestSha256: binding.snapshot.manifestSha256 } : {}),
        ...(resume && binding.snapshot.action ? { action: binding.snapshot.action,
          patch: Object.fromEntries(Object.keys(binding.snapshot.action === 'CONFIRM_DEPLOYMENT_PLAN'
            ? { deploymentPlanApproval: true } : binding.snapshot.patch).map(key => [key, structuredClone(inputs[key])])),
          ...(binding.snapshot.patch?.canonicalOrigin ? { canonicalRequired: true } : {}) } : {}),
        async verify({ stage } = {}) {
          if (stopped) throw Error('ENTRY_EXECUTION_STOPPED');
          if (!started && !timeValid(record)) throw Error('ENTRY_APPROVAL_EXPIRED');
          if (!started && resume) await validateEntryResume(binding.snapshot, binding.configuration);
          if (!isDeepStrictEqual(inputs, capturedInputs)) throw Error('ENTRY_INPUT_BINDING_CHANGED');
          if (stage !== undefined && !(record.binding.executionStages ?? record.binding.snapshot.stages)?.includes(stage))
            throw Error('ENTRY_EXECUTION_SCOPE_REJECTED');
          try { await lstat(stoppedPath); throw Error('ENTRY_EXECUTION_STOPPED'); }
          catch (error) { if (error.code !== 'ENOENT') throw error; }
          if (started) {
            await safePath(auditPath, [directory]);
            if (sha256(await readFile(auditPath)) !== auditDigest) throw Error('ENTRY_EXECUTION_AUDIT_CHANGED');
          }
          for (const identity of identities) {
            await safePath(identity.path, [root]);
            const current = await lstat(identity.path);
            if (!current.isDirectory() || current.dev !== identity.dev || current.ino !== identity.ino ||
                await realpath(identity.path) !== identity.path) throw Error('ENTRY_DIRECTORY_CHANGED');
          }
          for (const file of [...files, ...dependencies]) {
            await safePath(file.path, [root]);
            if (sha256(await readFile(file.path)) !== file.digest) throw Error('ENTRY_IMMUTABLE_INPUT_CHANGED');
          }
        },
        async start() {
          if (stopped) throw Error('ENTRY_EXECUTION_STOPPED');
          if (started) throw Error('ENTRY_EXECUTION_ALREADY_STARTED');
          await permit.verify();
          const startedAt = now();
          if (!Number.isSafeInteger(startedAt) || !timeValid(record)) throw Error('ENTRY_APPROVAL_EXPIRED');
          if (resume) {
            const claim = join(runDirectory, '.ENTRY_RESUME_' + binding.snapshot.manifestSha256 + '.claimed');
            try { await durableFile(claim, encode({ approvalId: record.approvalId, executionRunId: id })); }
            catch (error) { if (error.code === 'EEXIST') throw Error('ENTRY_RESUME_ALREADY_CLAIMED'); throw error; }
            await syncDirectory(runDirectory);
          }
          const audit = encode({ kind: 'ENTRY_RUNNING_GRANT_V1', approvalId: record.approvalId,
            executionRunId: id, startedAt, bindingSha256: sha256(encode(record.binding)),
            stages: record.binding.executionStages ?? record.binding.snapshot.stages ?? [], releaseAuthorized: false });
          try { await durableFile(auditPath, audit); }
          catch (error) { if (error.code === 'EEXIST') throw Error('ENTRY_EXECUTION_ALREADY_STARTED'); throw error; }
          await syncDirectory(directory);
          auditDigest = sha256(audit); started = true;
        },
        async stop() {
          if (stopped) return;
          stopped = true;
          await durableFile(stoppedPath, encode({ approvalId: record.approvalId, executionRunId: id }));
          await syncDirectory(directory);
          if (started && revisionPath) {
            const manifest = JSON.parse(await readFile(join(runDirectory, 'manifest.json')));
            if (isDeepStrictEqual(manifest.inputs, inputs)) {
              const temporary = join(runDirectory, '.approved-current-' + randomUUID() + '.tmp');
              await durableFile(temporary, encode({ path: revisionPath, sha256: revisionDigest, approvalId: record.approvalId }));
              await rename(temporary, join(runDirectory, 'APPROVED_INPUTS_CURRENT.json'));
              await syncDirectory(runDirectory);
            }
          }
        }
      };
      return permit;
    }
  };
}
