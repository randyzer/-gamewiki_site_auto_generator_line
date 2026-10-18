import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../contracts/canonical-json.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { assertCanonicalStageId } from './stage-identity.mjs';
import { classifyShadowDiff } from './shadow-diff-classifier.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const valueDigest = value => sha256(`AGENT_SHADOW_VALUE_V1\n${canonicalJson(value)}`);

export function createShadowDiff(input) {
  assertCanonicalStageId(input.canonicalStageId, { mappingVersion: input.mappingVersion });
  const diffs = input.comparisons.map(item => {
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
