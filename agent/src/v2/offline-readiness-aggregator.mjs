import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { createOfflineShadowEvidenceComparator } from './offline-shadow-comparator.mjs';
import { coreStageIdentities, STAGE_IDENTITY_MAPPING_VERSION } from './stage-identity.mjs';

const FACTORY_KEYS = Object.freeze([
  'observationStore',
  'contextBinder',
  'stageResultProvenance',
  'fixtureContinuity',
]);
const AGGREGATE_KEYS = Object.freeze(['runId', 'homepageEvidence']);
const HOMEPAGE_EVIDENCE_KEYS = Object.freeze([
  'observationRecord',
  'contextBinding',
  'v2Projection',
  'fixtureEvidence',
]);
const TRUST_PIPELINE_GAPS = Object.freeze([
  'P6_AUTHENTICATED_LEGACY_OBSERVATION',
  'TRUSTED_CONTEXT_BINDING',
  'TRUSTED_STAGE_RESULT_PROVENANCE',
  'TRUSTED_FIXTURE_CONTINUITY',
  'TRUSTED_SHADOW_COMPARISON',
]);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = value => sha256(`AGENT_P6_F2_A_READINESS_V1\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };
const isDigest = value => /^[a-f0-9]{64}$/.test(value ?? '');

function exactObject(value, keys, label, { optional = [] } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('CONTRACT_INVALID', `${label} must be an object`);
  }
  const allowed = new Set(keys);
  const required = keys.filter(key => !optional.includes(key));
  if (Object.keys(value).some(key => !allowed.has(key)) ||
      required.some(key => !Object.hasOwn(value, key))) {
    fail('CONTRACT_INVALID', `${label} has unsupported fields`);
  }
  return value;
}

function emptyReferences() {
  return {
    observationRecordDigest: null,
    executionContextDigest: null,
    readinessDigest: null,
    shadowComparisonDigest: null,
    legacySnapshotDigest: null,
    v2ResultDigest: null,
  };
}

function reportReferences(report) {
  const references = {
    observationRecordDigest: report.observationRecordDigest,
    executionContextDigest: report.executionContextDigest,
    readinessDigest: report.readinessDigest,
    shadowComparisonDigest: report.shadowDiff?.comparisonDigest ?? null,
    legacySnapshotDigest: report.shadowDiff?.legacySnapshotDigest ?? null,
    v2ResultDigest: report.shadowDiff?.v2ResultDigest ?? null,
  };
  for (const [name, value] of Object.entries(references)) {
    if (value !== null && !isDigest(value)) {
      fail('CONTRACT_DIGEST_MISMATCH', `Offline readiness ${name} is invalid`);
    }
  }
  return references;
}

function partialRow(identity, { firstMissingTransition = 'LEGACY_OBSERVATION',
  missingEvidence = TRUST_PIPELINE_GAPS, evidenceReferences = emptyReferences() } = {}) {
  return {
    canonicalStageId: identity.canonicalStageId,
    classification: 'PARTIAL',
    firstMissingTransition,
    missingEvidence: [...missingEvidence].sort(),
    trustedOfflineComparison: false,
    shadowDiffVersion: null,
    comparisonDigest: null,
    evidenceReferences,
    authoritative: false,
  };
}

function assertHomepageReport(report, runId) {
  if (!report || report.kind !== 'OFFLINE_SHADOW_READINESS' || report.schemaVersion !== 1 ||
      report.runId !== runId || report.canonicalStageId !== 'homepage-research' ||
      report.mappingVersion !== STAGE_IDENTITY_MAPPING_VERSION || report.authoritative !== false ||
      report.verificationScope !== 'OFFLINE_SIMULATED' || report.decision !== 'HOLD') {
    fail('CONTRACT_BINDING_MISMATCH', 'Trusted homepage readiness report has incompatible identity or policy');
  }
  if (!Array.isArray(report.reasons) || !Array.isArray(report.missingEvidence)) {
    fail('CONTRACT_INVALID', 'Trusted homepage readiness report is incomplete');
  }
  return report;
}

function completedHomepageRow(identity, report) {
  const shadowDiff = report.shadowDiff;
  const complete = report.readinessStatus === 'OFFLINE_COMPARISON_COMPLETE' &&
    report.trustedStageResult === true && report.fixtureContinuityVerified === true &&
    report.stageResultCompared === true && report.reasons.length === 0 &&
    report.missingEvidence.length === 0 && shadowDiff?.schemaVersion === 2 &&
    shadowDiff.runId === report.runId && shadowDiff.canonicalStageId === 'homepage-research' &&
    shadowDiff.mappingVersion === STAGE_IDENTITY_MAPPING_VERSION &&
    shadowDiff.authoritative === 'LEGACY' && shadowDiff.blocking === false &&
    Array.isArray(shadowDiff.diffs) && shadowDiff.diffs.length > 0 &&
    shadowDiff.diffs.every(item => item.diffClass === 'MATCH' && item.blocking === false);
  if (!complete) return null;
  const references = reportReferences(report);
  if (Object.values(references).some(value => !isDigest(value))) {
    fail('CONTRACT_DIGEST_MISMATCH', 'Completed homepage readiness lacks authenticated digest references');
  }
  return {
    canonicalStageId: identity.canonicalStageId,
    classification: 'VERIFIED_OFFLINE_ONLY',
    firstMissingTransition: null,
    missingEvidence: [],
    trustedOfflineComparison: true,
    shadowDiffVersion: 2,
    comparisonDigest: shadowDiff.comparisonDigest,
    evidenceReferences: references,
    authoritative: false,
  };
}

function partialHomepageRow(identity, report) {
  if (report.readinessStatus !== 'INCOMPLETE' || report.stageResultCompared !== false ||
      report.shadowDiff !== null) {
    fail('CONTRACT_BINDING_MISMATCH', 'Homepage readiness state is internally inconsistent');
  }
  let firstMissingTransition = 'SHADOW_COMPARISON';
  if (report.reasons.includes('CONTEXT_SOURCE_INCOMPLETE')) firstMissingTransition = 'CONTEXT_BINDING';
  else if (report.trustedStageResult !== true) firstMissingTransition = 'STAGE_RESULT_PROVENANCE';
  else if (report.fixtureContinuityVerified !== true) firstMissingTransition = 'FIXTURE_CONTINUITY';
  const missingEvidence = report.missingEvidence.length > 0 ? report.missingEvidence :
    ['TRUSTED_SHADOW_COMPARISON'];
  return partialRow(identity, { firstMissingTransition, missingEvidence,
    evidenceReferences: reportReferences(report) });
}

function runIdentity(homepageEvidence) {
  return homepageEvidence?.observationRecord?.identity?.runId;
}

export function createOfflineReadinessAggregator(rawAuthorities = {}) {
  const authorities = exactObject(rawAuthorities, FACTORY_KEYS, 'Offline readiness authorities');
  const homepageComparator = createOfflineShadowEvidenceComparator(authorities);
  return Object.freeze({
    async aggregate(rawInput) {
      const input = exactObject(rawInput, AGGREGATE_KEYS, 'Offline readiness input',
        { optional: ['homepageEvidence'] });
      if (typeof input.runId !== 'string' || input.runId.trim().length === 0) {
        fail('CONTRACT_INVALID', 'runId must be a non-empty string');
      }
      let homepageRow = partialRow(coreStageIdentities[0]);
      if (input.homepageEvidence !== undefined) {
        const evidence = exactObject(input.homepageEvidence, HOMEPAGE_EVIDENCE_KEYS,
          'Homepage readiness evidence');
        if (runIdentity(evidence) !== input.runId) {
          fail('IDENTITY_MISMATCH', 'Homepage observation run does not match the aggregate run');
        }
        const report = assertHomepageReport(await homepageComparator.compare(evidence), input.runId);
        homepageRow = completedHomepageRow(coreStageIdentities[0], report) ??
          partialHomepageRow(coreStageIdentities[0], report);
      }
      const stages = [homepageRow, ...coreStageIdentities.slice(1).map(identity => partialRow(identity))];
      const base = {
        kind: 'SEVEN_STAGE_OFFLINE_READINESS',
        schemaVersion: 1,
        producer: 'P6_F2_A_READINESS_AGGREGATOR',
        authoritative: false,
        verificationScope: 'OFFLINE_SIMULATED',
        runId: input.runId,
        mappingVersion: STAGE_IDENTITY_MAPPING_VERSION,
        decision: 'HOLD',
        productionReady: false,
        authoritySwitchAllowed: false,
        deploymentExecuted: false,
        deploymentExecution: 'BLOCKED',
        stages,
      };
      return deepFreeze({ ...base, readinessDigest: digest(base) });
    },
  });
}
