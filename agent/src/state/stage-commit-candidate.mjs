import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { assertStageState } from './state-engine.mjs';
import { computeCandidateDigest } from './state-records.mjs';
import { assertRequestScopeAssessment } from './request-scope.mjs';
import { STAGE_IDENTITY_MAPPING_VERSION } from '../v2/stage-identity.mjs';
import { stageRegistry } from '../v2/stage-registry.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const contains = (root, path) => {
  const part = relative(resolve(root), resolve(path));
  return part === '' || (!part.startsWith('../') && !isAbsolute(part));
};
const fail = (code, message) => { throw new ContractError(code, message); };

async function verifyStagedObject(stagingRoot, object) {
  if (!object.sourcePath || object.sourcePath.startsWith('/') || object.sourcePath.includes('\\') ||
      object.sourcePath.split('/').some(part => !part || part === '.' || part === '..'))
    fail('CONTRACT_PATH_INVALID', `Unsafe staged object path: ${String(object.sourcePath)}`);
  const root = await realpath(stagingRoot);
  const path = await realpath(resolve(stagingRoot, object.sourcePath)).catch(() => null);
  if (!path || !contains(root, path)) fail('CONTRACT_PATH_INVALID', 'Staged object escapes its bound root');
  const bytes = await readFile(path);
  if (bytes.length !== object.byteLength || sha256(bytes) !== object.sha256)
    fail('CONTRACT_DIGEST_MISMATCH', `Staged object does not match ${object.role}`);
}

async function buildCandidate(input, transaction = null, { verifyObjects = true } = {}) {
  if (!input.workerStop || input.workerStop.phase !== 'STOPPED')
    fail('STATE_CANDIDATE_INVALID', 'Stage Commit Candidate requires a Worker stop record');
  if (!transaction && input.state?.gate?.status === 'APPROVED')
    fail('STATE_APPROVAL_ENGINE_UNAVAILABLE', 'P3 cannot persist APPROVED until P4 provides a trusted Approval Engine');
  assertStageState(input.state, { approvalBindingVerified: Boolean(transaction) || input.state.gate.status !== 'APPROVED' });
  assertRequestScopeAssessment(input.requestScope);
  if (input.state.execution.phase !== 'STOPPED' || input.state.execution.reason !== input.workerStop.reason)
    fail('STATE_CANDIDATE_INVALID', 'Worker stop and State Engine result disagree');
  if (!Array.isArray(input.objects) || input.objects.length === 0)
    fail('STATE_CANDIDATE_INVALID', 'Stage Commit Candidate requires at least one immutable object');
  if (new Set(input.objects.map(object => object.role)).size !== input.objects.length)
    fail('STATE_CANDIDATE_INVALID', 'Immutable object roles must be unique');
  if (verifyObjects) await Promise.all(input.objects.map(object => verifyStagedObject(input.stagingRoot, object)));
  const events = input.events.map(item => ({ ...item }));
  const eventIds = new Set();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    validateContract('STATE_EVENT', 1, { kind: 'STATE_EVENT', schemaVersion: 1,
      producer: 'STATE_ENGINE', ...event });
    if (event.sequence !== index + 1) fail('STATE_EVENT_SEQUENCE_INVALID', 'Candidate event sequence must be contiguous');
    if (eventIds.has(event.eventId)) fail('STATE_EVENT_SEQUENCE_INVALID', 'Candidate event identities must be unique');
    eventIds.add(event.eventId);
    for (const [key, expected] of Object.entries({ runId: input.runId, stageId: input.stageId,
      attemptId: input.attemptId, contextDigest: input.contextDigest, schemaBundleDigest: input.schemaBundleDigest })) {
      if (event[key] !== expected) fail('CONTRACT_BINDING_MISMATCH', `State Event does not match ${key}`);
    }
    if (!Number.isFinite(Date.parse(event.timestamp))) fail('CONTRACT_SCHEMA_INVALID', 'State Event timestamp is invalid');
  }
  for (const required of ['ATTEMPT_STARTED', 'WORKER_STOPPED', 'STAGE_CHECKPOINT_COMMITTED']) {
    if (!events.some(event => event.type === required)) fail('STATE_CANDIDATE_INVALID', `Missing event: ${required}`);
  }
  const envelope = transaction ? {
    kind: 'STAGE_COMMIT_CANDIDATE', schemaVersion: 2, producer: 'V2_TRANSACTION_COORDINATOR',
    mode: 'SHADOW', operationId: transaction.operationId,
    mappingVersion: STAGE_IDENTITY_MAPPING_VERSION, policyVersion: transaction.policyVersion,
    canonicalStageId: transaction.canonicalStageId,
    purposeDigest: transaction.purposeDigest, approvalId: transaction.approvalId,
    approvalDigest: transaction.approvalDigest,
  } : { kind: 'STAGE_COMMIT_CANDIDATE', schemaVersion: 1, producer: 'STATE_ENGINE', mode: input.mode };
  const base = { ...envelope, runId: input.runId, stageId: input.stageId, attemptId: input.attemptId,
    contextDigest: input.contextDigest, schemaBundleDigest: input.schemaBundleDigest,
    expectedPrevious: { ...input.expectedPrevious }, workerStop: { ...input.workerStop },
    objects: input.objects.map(object => ({ ...object })), requestScope: structuredClone(input.requestScope),
    state: structuredClone(input.state), nextAction: input.nextAction,
    errors: (input.errors ?? []).map(item => ({ ...item })), events };
  const candidate = { ...base, candidateDigest: computeCandidateDigest(base) };
  validateContract('STAGE_COMMIT_CANDIDATE', envelope.schemaVersion, candidate);
  assertRequestScopeAssessment(candidate.requestScope);
  return Object.freeze(candidate);
}

export async function createStageCommitCandidate(input) {
  return buildCandidate(input);
}

export async function createOfflineApprovedStageCommitCandidate(input, { capabilityRegistry, capability, rootDirectory,
  verifyStagedObjects = true }) {
  capabilityRegistry.assert(capability, { capability: 'OFFLINE_APPROVED_CANDIDATE', mode: 'SIMULATED', rootDirectory });
  stageRegistry.requireCore(input.canonicalStageId);
  if (input.stageId !== input.canonicalStageId)
    fail('CONTRACT_BINDING_MISMATCH', 'V2 candidate requires canonical stage identity in both fields');
  if (input.state?.gate?.status !== 'APPROVED' || input.state.gate.approvalDigest !== input.approvalDigest)
    fail('STATE_APPROVAL_INVALID', 'Offline candidate requires an exactly bound approved state');
  return buildCandidate(input, input, { verifyObjects: verifyStagedObjects });
}

export function assertStageCommitCandidate(candidate) {
  validateContract('STAGE_COMMIT_CANDIDATE', candidate.schemaVersion, candidate);
  const approvedV2 = candidate.schemaVersion === 2 && candidate.state.gate.status === 'APPROVED';
  if (candidate.schemaVersion !== 1 && !approvedV2)
    fail('STATE_CANDIDATE_INVALID', 'Only transaction-bound V2 APPROVED candidates are supported');
  assertStageState(candidate.state, { approvalBindingVerified: approvedV2 || candidate.state.gate.status !== 'APPROVED' });
  if (computeCandidateDigest(candidate) !== candidate.candidateDigest)
    fail('CONTRACT_DIGEST_MISMATCH', 'Stage Commit Candidate digest does not match its payload');
  return candidate;
}
