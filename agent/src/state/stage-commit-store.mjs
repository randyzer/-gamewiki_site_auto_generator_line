import { access, open, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { canonicalJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { assertStageCommitCandidate } from './stage-commit-candidate.mjs';
import { createStateObjectStore } from './state-object-store.mjs';
import { acquireStageLock } from './stage-lock.mjs';
import { computeCommitDigest } from './state-records.mjs';
import { readCommitChain } from './stage-recovery.mjs';
import { projectLegacyManifest, projectionMetadataFromRecord } from './manifest-projector.mjs';
import { syncDirectory, writeAtomicFile } from './atomic-file.mjs';
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
