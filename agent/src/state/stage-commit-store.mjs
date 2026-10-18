import { access, open, readFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { canonicalJson, parseStrictJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { assertStageCommitCandidate } from './stage-commit-candidate.mjs';
import { createStateObjectStore } from './state-object-store.mjs';
import { acquireStageLock } from './stage-lock.mjs';
import { computeCommitDigest } from './state-records.mjs';
import { readCommitChain } from './stage-recovery.mjs';
import { projectLegacyManifest, projectionMetadataFromRecord } from './manifest-projector.mjs';
import { syncDirectory, writeAtomicFile, writeImmutableFile } from './atomic-file.mjs';
import { assertRegularFileNoSymlink, ensureDirectoryTree } from './storage-boundary.mjs';

const conflict = message => new ContractError('STATE_SEQUENCE_CONFLICT', message);
const contextMismatch = message => new ContractError('STATE_CONTEXT_MISMATCH', message);

function assertCandidateContinuesChain(candidate, latest) {
  if (!latest) return;
  for (const field of ['mode', 'runId', 'stageId', 'contextDigest', 'schemaBundleDigest']) {
    if (candidate[field] !== latest[field])
      throw contextMismatch(`Candidate changed immutable chain field: ${field}`);
  }
  if (candidate.requestScope.scopeDigest !== latest.requestScope.scopeDigest)
    throw contextMismatch('Candidate changed the immutable request scope');
}

function factory({ rootDirectory, faultInjector = null }) {
  const inject = async point => { await faultInjector?.(point); };
  const objectStore = createStateObjectStore({ rootDirectory, faultInjector: inject });
  return Object.freeze({
    async commit(candidate, { stagingRoot }) {
      assertStageCommitCandidate(candidate);
      if (candidate.mode !== 'SHADOW') throw new ContractError('POLICY_DENIED', 'P3 accepts only Shadow candidates');
      await ensureDirectoryTree(rootDirectory, ['commits']);
      await ensureDirectoryTree(rootDirectory, ['locks']);
      await ensureDirectoryTree(rootDirectory, ['projections']);
      const objects = [];
      for (const descriptor of candidate.objects) objects.push(await objectStore.publish(descriptor, { stagingRoot }));
      await inject('afterObjectsPublished');
      const lock = await acquireStageLock({ lockDirectory: join(rootDirectory, 'locks/stage.lock') });
      try {
        const chain = await readCommitChain({ rootDirectory }); const latest = chain.at(-1);
        const current = { sequence: latest?.sequence ?? 0, commitDigest: latest?.commitDigest ?? null };
        if (candidate.expectedPrevious.sequence !== current.sequence ||
            candidate.expectedPrevious.commitDigest !== current.commitDigest)
          throw conflict('Candidate predecessor is no longer current');
        assertCandidateContinuesChain(candidate, latest);
        for (const reference of objects) await objectStore.verify(reference);
        const sequence = current.sequence + 1;
        const base = { kind: 'STAGE_COMMIT_RECORD', schemaVersion: 1, producer: 'STAGE_COMMIT_STORE',
          mode: candidate.mode, runId: candidate.runId, stageId: candidate.stageId,
          attemptId: candidate.attemptId, contextDigest: candidate.contextDigest,
          schemaBundleDigest: candidate.schemaBundleDigest, sequence, previous: current,
          candidateDigest: candidate.candidateDigest, workerStop: { ...candidate.workerStop }, objects,
          requestScope: structuredClone(candidate.requestScope),
          state: structuredClone(candidate.state), nextAction: candidate.nextAction,
          errors: candidate.errors.map(item => ({ ...item })), events: candidate.events.map(item => ({ ...item })) };
        const record = { ...base, commitDigest: computeCommitDigest(base) };
        validateContract('STAGE_COMMIT_RECORD', 1, record);
        const commitsDirectory = join(rootDirectory, 'commits');
        const target = join(commitsDirectory, `${String(sequence).padStart(12, '0')}.json`);
        await access(target).then(() => { throw conflict('Commit sequence already exists'); }, error => {
          if (error.code !== 'ENOENT') throw error;
        });
        const temporary = join(commitsDirectory, `.tmp-${randomUUID()}`);
        const handle = await open(temporary, 'wx', 0o400);
        try { await handle.writeFile(`${canonicalJson(record)}\n`); await handle.sync(); } finally { await handle.close(); }
        await inject('beforeCommitPoint');
        await rename(temporary, target);
        await assertRegularFileNoSymlink(target);
        await syncDirectory(commitsDirectory);
        await inject('afterCommitPoint');
        await inject('beforeHeadUpdate');
        await writeAtomicFile(join(rootDirectory, 'HEAD'), Buffer.from(`${canonicalJson({ sequence, commitDigest: record.commitDigest })}\n`));
        await inject('beforeProjection');
        const projection = projectLegacyManifest({ state: record.state, requestScope: record.requestScope,
          ...projectionMetadataFromRecord(record) });
        await writeAtomicFile(join(rootDirectory, 'projections/manifest.json'), Buffer.from(`${canonicalJson(projection)}\n`));
        return Object.freeze(record);
      } finally { await lock.release(); }
    },
  });
}

export function createStageCommitStore(options) {
  if (Object.hasOwn(options, 'faultInjector'))
    throw new ContractError('POLICY_DENIED', 'Fault injection is available only through the test constructor');
  return factory(options);
}

export function createTestStageCommitStore(options) {
  return factory(options);
}

function assertTransactionBinding(candidate, intent, consumption) {
  validateContract('TRANSACTION_INTENT', 1, intent);
  validateContract('APPROVAL_CONSUMPTION', 2, consumption);
  const expected = {
    operationId: candidate.operationId,
    runId: candidate.runId,
    canonicalStageId: candidate.canonicalStageId,
    attemptId: candidate.attemptId,
    contextDigest: candidate.contextDigest,
    schemaBundleDigest: candidate.schemaBundleDigest,
    policyVersion: candidate.policyVersion,
    purposeDigest: candidate.purposeDigest,
    candidateDigest: candidate.candidateDigest,
    approvalId: candidate.approvalId,
    approvalDigest: candidate.approvalDigest,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (intent[key] !== value) throw new ContractError('TRANSACTION_BINDING_MISMATCH', `Intent does not match ${key}`);
  }
  for (const [key, value] of Object.entries({ operationId: intent.operationId, approvalId: intent.approvalId,
    contextDigest: intent.contextDigest, purposeDigest: intent.purposeDigest, intentDigest: intent.intentDigest })) {
    if (consumption[key] !== value)
      throw new ContractError('TRANSACTION_BINDING_MISMATCH', `Consumption does not match ${key}`);
  }
}

export function createOfflineTransactionStageCommitStore({ rootDirectory, capabilityRegistry, capability,
  faultInjector = null }) {
  capabilityRegistry.assert(capability, { capability: 'OFFLINE_STAGE_COMMIT', mode: 'SIMULATED', rootDirectory });
  const inject = async point => { await faultInjector?.(point); };
  const objectStore = createStateObjectStore({ rootDirectory, faultInjector: inject });
  return Object.freeze({
    async commit(candidate, { stagingRoot, intent, consumption }) {
      assertStageCommitCandidate(candidate);
      if (candidate.schemaVersion !== 2 || candidate.mode !== 'SHADOW' || candidate.state.gate.status !== 'APPROVED')
        throw new ContractError('POLICY_DENIED', 'Offline transaction store requires a V2 Shadow APPROVED candidate');
      assertTransactionBinding(candidate, intent, consumption);
      const operationRoot = join(rootDirectory, 'transactions', candidate.operationId);
      await ensureDirectoryTree(rootDirectory, ['transactions', candidate.operationId, 'stage']);
      const objects = [];
      for (const descriptor of candidate.objects) objects.push(await objectStore.publish(descriptor, { stagingRoot }));
      await inject('afterObjectsPublished');
      const target = join(operationRoot, 'stage/commit.json');
      {
        try {
          await assertRegularFileNoSymlink(target);
          const existing = parseStrictJson(await readFile(target), target);
          validateContract('STAGE_COMMIT_RECORD', 2, existing);
          if (computeCommitDigest(existing) !== existing.commitDigest)
            throw new ContractError('STATE_COMMIT_CORRUPT', 'Offline transaction commit digest mismatch');
          if (existing.candidateDigest !== candidate.candidateDigest)
            throw new ContractError('TRANSACTION_IDEMPOTENCY_CONFLICT', 'Operation already committed a different candidate');
          return Object.freeze(existing);
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
        for (const reference of objects) await objectStore.verify(reference);
        assertTransactionBinding(candidate, intent, consumption);
        const base = { kind: 'STAGE_COMMIT_RECORD', schemaVersion: 2,
          producer: 'V2_OFFLINE_STAGE_COMMIT_STORE', mode: 'SHADOW',
          operationId: candidate.operationId, mappingVersion: candidate.mappingVersion,
          policyVersion: candidate.policyVersion,
          canonicalStageId: candidate.canonicalStageId, purposeDigest: candidate.purposeDigest,
          approvalId: candidate.approvalId, approvalDigest: candidate.approvalDigest,
          intentDigest: intent.intentDigest, consumptionDigest: consumption.consumptionDigest,
          runId: candidate.runId, stageId: candidate.stageId, attemptId: candidate.attemptId,
          contextDigest: candidate.contextDigest, schemaBundleDigest: candidate.schemaBundleDigest,
          sequence: 1, previous: { sequence: 0, commitDigest: null },
          candidateDigest: candidate.candidateDigest, workerStop: { ...candidate.workerStop }, objects,
          requestScope: structuredClone(candidate.requestScope), state: structuredClone(candidate.state),
          nextAction: candidate.nextAction, errors: candidate.errors.map(item => ({ ...item })),
          events: candidate.events.map(item => ({ ...item })) };
        const record = { ...base, commitDigest: computeCommitDigest(base) };
        validateContract('STAGE_COMMIT_RECORD', 2, record);
        const created = await writeImmutableFile(target, Buffer.from(`${canonicalJson(record)}\n`),
          { beforeLink: () => inject('beforeCommitPoint') });
        if (!created) {
          const existing = parseStrictJson(await readFile(target), target);
          validateContract('STAGE_COMMIT_RECORD', 2, existing);
          if (computeCommitDigest(existing) !== existing.commitDigest)
            throw new ContractError('STATE_COMMIT_CORRUPT', 'Offline transaction commit digest mismatch');
          if (existing.candidateDigest !== candidate.candidateDigest)
            throw new ContractError('TRANSACTION_IDEMPOTENCY_CONFLICT', 'Operation already committed a different candidate');
          return Object.freeze(existing);
        }
        await inject('afterCommitPoint');
        return Object.freeze(record);
      }
    },
  });
}
