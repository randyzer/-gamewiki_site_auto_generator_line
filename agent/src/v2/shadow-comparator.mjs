import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { assertCanonicalStageId, resolveStageIdentity } from './stage-identity.mjs';
import { assertTrustedKeywordLegacySnapshot } from './keyword-legacy-snapshot.mjs';
import { classifyShadowDiff } from './shadow-diff-classifier.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const valueDigest = value => sha256(`AGENT_SHADOW_VALUE_V1\n${canonicalJson(value)}`);

export function createExactShadowComparison({ fieldPath, legacyValue, v2Value, matchReasonCode,
  mismatchReasonCode, evidenceReferences }) {
  const equal = canonicalJson(legacyValue) === canonicalJson(v2Value);
  return Object.freeze({ fieldPath, diffClass: equal ? 'MATCH' : 'V2_INCOMPATIBLE',
    legacyValue, v2Value, reasonCode: equal ? matchReasonCode : mismatchReasonCode,
    evidenceReferences: [...new Set(evidenceReferences)].sort() });
}

function assertClassification(item, input) {
  const equal = canonicalJson(item.legacyValue) === canonicalJson(item.v2Value);
  if (item.diffClass === 'MATCH' && !equal) {
    throw new ContractError('SHADOW_DIFF_CLASSIFICATION_INVALID', 'MATCH requires equal canonical values');
  }
  if (item.diffClass === 'EXPECTED_FORMAT_DIFFERENCE') {
    if (item.formatRule !== 'STAGE_IDENTITY_ALIAS' || item.fieldPath !== '/identity/stage' ||
        !item.evidenceReferences.includes('identity-snapshot')) {
      throw new ContractError('SHADOW_DIFF_CLASSIFICATION_INVALID', 'Unknown expected format rule');
    }
    const snapshot = assertTrustedKeywordLegacySnapshot(input.identitySnapshot);
    if (snapshot.snapshotDigest !== input.legacySnapshotDigest || snapshot.runId !== input.runId ||
        snapshot.canonicalStageId !== input.canonicalStageId || snapshot.mappingVersion !== input.mappingVersion ||
        snapshot.sourceAttempt !== input.attemptId || snapshot.contextDigest !== input.contextDigest ||
        snapshot.originalNamespace !== 'p3-shadow-alias' || snapshot.originalValue !== item.legacyValue) {
      throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Identity snapshot does not bind this comparison');
    }
    let identity;
    try {
      identity = resolveStageIdentity({ namespace: snapshot.originalNamespace, value: snapshot.originalValue,
        mappingVersion: input.mappingVersion });
    } catch {
      throw new ContractError('SHADOW_DIFF_CLASSIFICATION_INVALID', 'Legacy value does not satisfy the format rule');
    }
    if (identity.canonicalStageId !== item.v2Value || equal) {
      throw new ContractError('SHADOW_DIFF_CLASSIFICATION_INVALID', 'Expected format values are not equivalent');
    }
  }
}

export function createShadowDiff(input) {
  const schemaVersion = input.schemaVersion ?? 1;
  assertCanonicalStageId(input.canonicalStageId, { mappingVersion: input.mappingVersion });
  const diffs = input.comparisons.map(item => {
    assertClassification(item, input);
    const classification = classifyShadowDiff(item);
    return {
      fieldPath: item.fieldPath,
      diffClass: item.diffClass,
      legacyValueDigest: valueDigest(item.legacyValue),
      v2ValueDigest: valueDigest(item.v2Value),
      reasonCode: item.reasonCode,
      evidenceReferences: [...new Set(item.evidenceReferences)].sort(),
      blocking: classification.blocking,
    };
  });
  const base = {
    kind: 'SHADOW_DIFF', schemaVersion, producer: 'V2_SHADOW_COMPARATOR', mode: 'OFFLINE',
    runId: input.runId, canonicalStageId: input.canonicalStageId, mappingVersion: input.mappingVersion,
    attemptId: input.attemptId, contextDigest: input.contextDigest,
    legacySnapshotDigest: input.legacySnapshotDigest, v2ResultDigest: input.v2ResultDigest,
    authoritative: 'LEGACY', blocking: diffs.some(item => item.blocking), diffs,
  };
  const report = { ...base,
    comparisonDigest: sha256(`AGENT_SHADOW_DIFF_V${schemaVersion}\n${canonicalJson(base)}`) };
  validateContract('SHADOW_DIFF', schemaVersion, report);
  return deepFreeze(report);
}
