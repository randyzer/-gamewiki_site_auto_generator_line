import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequestScopeAssessment } from '../src/state/request-scope.mjs';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const hex24 = value => digest(value).slice(0, 24);

export function stageState({ phase = 'STOPPED', reason = 'PARTIAL',
  artifact = 'VALIDATED_PARTIAL', gate = 'WAITING_FOR_APPROVAL' } = {}) {
  return {
    execution: { phase, reason: phase === 'STOPPED' ? reason : null },
    artifact: { status: artifact },
    gate: { status: gate, approvalDigest: gate === 'APPROVED' ? digest('approval') : null },
  };
}

export function event(type, sequence = 1, bindings = {}) {
  const identity = { runId: 'run-shadow', stageId: 'stage-2', attemptId: 10,
    contextDigest: digest('context'), schemaBundleDigest: digest('schemas'), ...bindings };
  return {
    eventId: `event-${hex24(`${type}:${sequence}:${identity.runId}:${identity.stageId}:${identity.attemptId}:${identity.contextDigest}:${identity.schemaBundleDigest}`)}`,
    sequence, ...identity,
    timestamp: '2026-10-17T00:00:00.000Z',
    type,
    reasonCode: type,
  };
}

export async function candidateInput(root, overrides = {}) {
  const staging = join(root, 'candidate');
  await mkdir(staging, { recursive: true });
  const bytes = Buffer.from('{"status":"partial"}\n');
  await writeFile(join(staging, 'result.json'), bytes);
  const identity = { runId: overrides.runId ?? 'run-shadow', stageId: overrides.stageId ?? 'stage-2',
    attemptId: overrides.attemptId ?? 10, contextDigest: overrides.contextDigest ?? digest('context'),
    schemaBundleDigest: overrides.schemaBundleDigest ?? digest('schemas') };
  return {
    mode: 'SHADOW', ...identity,
    expectedPrevious: { sequence: 0, commitDigest: null },
    workerStop: { phase: 'STOPPED', reason: 'PARTIAL' },
    objects: [{ role: 'EVIDENCE_OUTCOME', contractKind: 'EVIDENCE_OUTCOME',
      schemaVersion: 3, sourcePath: 'result.json', sha256: digest(bytes), byteLength: bytes.length }],
    requestScope: createRequestScopeAssessment({ required: ['STAGE_2_ACCEPTANCE'], satisfied: [] }),
    state: stageState(), nextAction: 'REQUEST_PARTIAL_HANDOFF',
    errors: [],
    events: [event('ATTEMPT_STARTED', 1, identity), event('WORKER_STOPPED', 2, identity),
      event('EVIDENCE_CLASSIFIED', 3, identity), event('STAGE_CHECKPOINT_COMMITTED', 4, identity)],
    stagingRoot: staging,
    ...overrides,
  };
}
