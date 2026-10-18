import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { resolveStageIdentity } from './stage-identity.mjs';

const trustedSnapshots = new WeakSet();
const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);

function sourceDigest({ fixtureManifest, expected, lineage }) {
  return digest('AGENT_KEYWORD_LEGACY_SOURCE_V1', { fixtureManifest, expected, lineage });
}

export function createKeywordLegacyIdentityBinding({ fixtureManifest, expected, lineage,
  originalNamespace, originalValue, sourceAttempt }) {
  return deepFreeze({ originalNamespace, originalValue, sourceAttempt,
    lineageDigest: digest('AGENT_KEYWORD_LINEAGE_V1', lineage),
    sourceDigest: sourceDigest({ fixtureManifest, expected, lineage }) });
}

export function createKeywordLegacySnapshot({ adapterInput, sourceAttempt, schemaBundleDigest,
  recoveryDigest, fixtureManifest, expected, lineage, legacyIdentity }) {
  if (!legacyIdentity || legacyIdentity.sourceAttempt !== sourceAttempt ||
      legacyIdentity.originalNamespace !== 'p3-shadow-alias' ||
      legacyIdentity.lineageDigest !== digest('AGENT_KEYWORD_LINEAGE_V1', lineage) ||
      legacyIdentity.sourceDigest !== sourceDigest({ fixtureManifest, expected, lineage })) {
    throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Legacy identity is not bound to this replay source');
  }
  const identity = resolveStageIdentity({ namespace: legacyIdentity.originalNamespace,
    value: legacyIdentity.originalValue, mappingVersion: adapterInput.mappingVersion });
  if (identity.canonicalStageId !== adapterInput.canonicalStageId) {
    throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Legacy stage identity does not map to adapter stage');
  }
  const base = {
    kind: 'KEYWORD_LEGACY_SNAPSHOT', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE',
    runId: adapterInput.runId, contextDigest: adapterInput.contextDigest, schemaBundleDigest, recoveryDigest,
    mappingVersion: identity.mappingVersion, canonicalStageId: identity.canonicalStageId,
    originalNamespace: legacyIdentity.originalNamespace, originalValue: legacyIdentity.originalValue,
    legacySkillName: identity.legacySkillName, legacyArrayIndex: identity.legacyArrayIndex,
    sourceAttempt, sourceDigest: legacyIdentity.sourceDigest,
  };
  const snapshot = { ...base, snapshotDigest: digest('AGENT_KEYWORD_LEGACY_SNAPSHOT_V1', base) };
  validateContract('KEYWORD_LEGACY_SNAPSHOT', 1, snapshot);
  deepFreeze(snapshot);
  trustedSnapshots.add(snapshot);
  return snapshot;
}

export function assertTrustedKeywordLegacySnapshot(snapshot) {
  if (!trustedSnapshots.has(snapshot)) {
    throw new ContractError('KEYWORD_LEGACY_SNAPSHOT_UNTRUSTED',
      'Keyword legacy snapshot must come from the offline host capability');
  }
  validateContract('KEYWORD_LEGACY_SNAPSHOT', 1, snapshot);
  const { snapshotDigest, ...base } = snapshot;
  if (snapshotDigest !== digest('AGENT_KEYWORD_LEGACY_SNAPSHOT_V1', base)) {
    throw new ContractError('CONTRACT_DIGEST_MISMATCH', 'Keyword legacy snapshot digest mismatch');
  }
  return snapshot;
}
