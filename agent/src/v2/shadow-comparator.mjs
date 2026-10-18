import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { assertCanonicalStageId, resolveStageIdentity } from './stage-identity.mjs';
import { classifyShadowDiff } from './shadow-diff-classifier.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const valueDigest = value => sha256(`AGENT_SHADOW_VALUE_V1\n${canonicalJson(value)}`);

function assertClassification(item, mappingVersion) {
  const equal = canonicalJson(item.legacyValue) === canonicalJson(item.v2Value);
  if (item.diffClass === 'MATCH' && !equal) {
    throw new ContractError('SHADOW_DIFF_CLASSIFICATION_INVALID', 'MATCH requires equal canonical values');
  }
  if (item.diffClass === 'EXPECTED_FORMAT_DIFFERENCE') {
    if (item.formatRule !== 'STAGE_IDENTITY_ALIAS' || item.fieldPath !== '/identity/stage' ||
        !item.evidenceReferences.includes('identity-snapshot')) {
      throw new ContractError('SHADOW_DIFF_CLASSIFICATION_INVALID', 'Unknown expected format rule');
    }
    let identity;
    try {
      identity = resolveStageIdentity({ namespace: 'p3-shadow-alias', value: item.legacyValue, mappingVersion });
    } catch {
      throw new ContractError('SHADOW_DIFF_CLASSIFICATION_INVALID', 'Legacy value does not satisfy the format rule');
    }
    if (identity.canonicalStageId !== item.v2Value || equal) {
      throw new ContractError('SHADOW_DIFF_CLASSIFICATION_INVALID', 'Expected format values are not equivalent');
    }
  }
}

export function createShadowDiff(input) {
  assertCanonicalStageId(input.canonicalStageId, { mappingVersion: input.mappingVersion });
  const diffs = input.comparisons.map(item => {
    assertClassification(item, input.mappingVersion);
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
    kind: 'SHADOW_DIFF', schemaVersion: 1, producer: 'V2_SHADOW_COMPARATOR', mode: 'OFFLINE',
    runId: input.runId, canonicalStageId: input.canonicalStageId, mappingVersion: input.mappingVersion,
    attemptId: input.attemptId, contextDigest: input.contextDigest,
    legacySnapshotDigest: input.legacySnapshotDigest, v2ResultDigest: input.v2ResultDigest,
    authoritative: 'LEGACY', blocking: diffs.some(item => item.blocking), diffs,
  };
  const report = { ...base,
    comparisonDigest: sha256(`AGENT_SHADOW_DIFF_V1\n${canonicalJson(base)}`) };
  validateContract('SHADOW_DIFF', 1, report);
  return deepFreeze(report);
}
