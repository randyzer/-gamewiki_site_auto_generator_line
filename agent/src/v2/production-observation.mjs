import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { assertCanonicalStageId } from './stage-identity.mjs';

const trustedObservations = new WeakSet();
const trustedSnapshots = new WeakSet();
const MODES = new Set(['DISABLED', 'SHADOW_READ_ONLY']);
const COMMIT_KEYS = Object.freeze(['runId', 'canonicalStageId', 'attemptId', 'legacyInputDigest',
  'sourceRevision', 'checkpoint', 'artifacts', 'legacyStatus', 'deploymentExecuted', 'committedSequence']);
const RESULT_STATES = new Set(['PASSED', 'PARTIAL', 'FAILED', 'BLOCKED', 'WAITING_FOR_USER']);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };
const isDigest = value => /^[a-f0-9]{64}$/.test(value ?? '');

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort()))
    fail('POLICY_DENIED', `${label} contains unsupported fields or capabilities`);
  return value;
}

function snapshotFromLegacyCommit(commit) {
  exactObject(commit, COMMIT_KEYS, 'Legacy commit observation input');
  try { assertCanonicalStageId(commit.canonicalStageId); }
  catch { fail('IDENTITY_MISMATCH', 'Observation requires a canonical stage identity'); }
  if (typeof commit.runId !== 'string' || !commit.runId ||
      !Number.isSafeInteger(commit.attemptId) || commit.attemptId < 1 ||
      !Number.isSafeInteger(commit.committedSequence) || commit.committedSequence < 1 ||
      !isDigest(commit.legacyInputDigest) || !RESULT_STATES.has(commit.legacyStatus) ||
      typeof commit.deploymentExecuted !== 'boolean' ||
      !(commit.sourceRevision === null || typeof commit.sourceRevision === 'string'))
    fail('CONTRACT_INVALID', 'Legacy commit observation identity is invalid');
  if (!commit.checkpoint || typeof commit.checkpoint !== 'object' || Array.isArray(commit.checkpoint) ||
      !Array.isArray(commit.artifacts))
    fail('CONTRACT_INVALID', 'Legacy commit observation data is invalid');
  if (commit.checkpoint.attempt !== commit.attemptId ||
      commit.checkpoint.inputDigest !== commit.legacyInputDigest)
    fail('IDENTITY_MISMATCH', 'Observation identity does not match the committed Legacy checkpoint');
  const artifactDigests = commit.artifacts.map(artifact => {
    exactObject(artifact, ['sha256'], 'Observed artifact');
    if (!isDigest(artifact.sha256)) fail('CONTRACT_INVALID', 'Observed artifact digest is invalid');
    return artifact.sha256;
  }).sort();
  const snapshot = deepFreeze({
    kind: 'PRODUCTION_OBSERVATION_SNAPSHOT', schemaVersion: 1,
    mode: 'SHADOW_READ_ONLY', authority: 'LEGACY', authoritative: false,
    runId: commit.runId, canonicalStageId: commit.canonicalStageId,
    attemptId: commit.attemptId, digestSemantics: 'LEGACY_INPUT_DIGEST',
    legacyInputDigest: commit.legacyInputDigest,
    checkpointDigest: digest('AGENT_LEGACY_STAGE_CHECKPOINT_V1', commit.checkpoint),
    sourceRevision: commit.sourceRevision, artifactDigests,
    legacyStatus: commit.legacyStatus, deploymentExecuted: commit.deploymentExecuted,
    committedSequence: commit.committedSequence,
  });
  trustedSnapshots.add(snapshot);
  return snapshot;
}

function failureOutcome(error) {
  const code = error instanceof ContractError ? error.code : 'OBSERVER_ERROR';
  return deepFreeze({ kind: 'PRODUCTION_OBSERVATION_OUTCOME', schemaVersion: 1,
    status: 'OBSERVATION_FAILED', authoritative: false, observerResultAccepted: false,
    code, reason: error instanceof ContractError ? error.message : 'Observer failed in isolated read-only mode' });
}

export function createProductionObservation({ mode = 'DISABLED', observer = null } = {}) {
  if (!MODES.has(mode)) fail('POLICY_DENIED', `Unsupported production observation mode: ${String(mode)}`);
  if (mode === 'DISABLED' && observer !== null)
    fail('POLICY_DENIED', 'DISABLED production observation cannot receive an observer');
  if (mode === 'SHADOW_READ_ONLY' && typeof observer !== 'function')
    fail('POLICY_DENIED', 'SHADOW_READ_ONLY production observation requires an explicit observer');
  let latest = null;
  const observation = Object.freeze({
    mode,
    async observeLegacyCommit(commit) {
      if (mode === 'DISABLED') return null;
      try {
        const snapshot = snapshotFromLegacyCommit(commit);
        await observer(snapshot);
        latest = deepFreeze({ kind: 'PRODUCTION_OBSERVATION_OUTCOME', schemaVersion: 1,
          status: 'OBSERVED', authoritative: false, observerResultAccepted: false,
          snapshotDigest: digest('AGENT_PRODUCTION_OBSERVATION_SNAPSHOT_V1', snapshot) });
      } catch (error) { latest = failureOutcome(error); }
      return latest;
    },
    latest() { return latest; },
  });
  trustedObservations.add(observation);
  return observation;
}

export function assertProductionObservation(value) {
  if (!trustedObservations.has(value)) fail('POLICY_DENIED', 'A trusted production observation is required');
  return value;
}

export function assertTrustedObservationSnapshot(value) {
  if (!trustedSnapshots.has(value)) {
    fail('TRUST_LEVEL_INSUFFICIENT', 'A trusted observation snapshot is required');
  }
  return value;
}
