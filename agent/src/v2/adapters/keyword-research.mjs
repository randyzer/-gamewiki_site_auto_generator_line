import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../../contracts/canonical-json.mjs';
import { ContractError } from '../../contracts/errors.mjs';
import { inspectKeywordMaterial } from '../../contracts/adapters/keyword-skill-v1.mjs';
import { validateContract } from '../../contracts/registry.mjs';
import { createCanonicalHandoff, createTestValidatedInputHarness } from '../../handoff-v2/canonical-handoff.mjs';
import { validateStageAdapterInput, validateStageAdapterResult } from '../stage-adapter-contract.mjs';
import { resolveStageIdentity } from '../stage-identity.mjs';
import { assertTrustedKeywordLegacySnapshot,
  createKeywordLegacySnapshot } from '../keyword-legacy-snapshot.mjs';

export { createKeywordLegacyIdentityBinding } from '../keyword-legacy-snapshot.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const trustedReplays = new WeakSet();

function bytesFor(materialBytes, path) {
  const bytes = materialBytes instanceof Map ? materialBytes.get(path) : materialBytes?.[path];
  if (bytes === undefined) throw new ContractError('CONTRACT_BINDING_MISMATCH', `Missing fixture bytes: ${path}`);
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

export function keywordReplayPayloadDigest({ fixtureManifest, expected, lineage, legacyIdentity, materialBytes }) {
  const materials = fixtureManifest.materials.map(item => ({
    fixturePath: item.fixturePath,
    manifestDigest: item.fixtureSha256,
    actualDigest: sha256(bytesFor(materialBytes, item.fixturePath)),
  }));
  return digest('AGENT_KEYWORD_REPLAY_PAYLOAD_V1', {
    fixtureManifest, expected, lineage, legacyIdentity, materials,
  });
}

export function replayKeywordResearchAttempt(input) {
  validateStageAdapterInput(input.adapterInput);
  if (input.adapterInput.canonicalStageId !== 'keyword-research') {
    throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Keyword adapter requires keyword-research');
  }
  const actualPayloadDigest = keywordReplayPayloadDigest(input);
  if (actualPayloadDigest !== input.adapterInput.payloadDigest) {
    throw new ContractError('CONTRACT_DIGEST_MISMATCH', 'Keyword replay payload digest mismatch');
  }
  if (input.sourceAttempt !== input.fixtureManifest.sourceAttempt) {
    throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Fixture attempt does not match replay attempt');
  }
  const materials = [];
  const statusCounts = { COMPLETED: 0, PARTIAL: 0, BLOCKED: 0 };
  const contractValidityCounts = { VALID: 0, INVALID: 0 };
  const contractIncompatibleFiles = [];
  let unresolvedGapCount = 0;
  let unclassifiedItemCount = 0;
  let reviewNoteCount = 0;
  for (const item of input.fixtureManifest.materials) {
    const bytes = bytesFor(input.materialBytes, item.fixturePath);
    if (sha256(bytes) !== item.fixtureSha256) {
      throw new ContractError('CONTRACT_DIGEST_MISMATCH', `Fixture hash mismatch: ${item.fixturePath}`);
    }
    const parsed = inspectKeywordMaterial(bytes, { sourcePath: item.fixturePath,
      skillContractSha256: input.fixtureManifest.skillContractSha256 });
    if (parsed.status !== item.status) {
      throw new ContractError('CONTRACT_BINDING_MISMATCH', `Fixture status mismatch: ${item.fixturePath}`);
    }
    statusCounts[parsed.status] += 1;
    contractValidityCounts[parsed.contractStatus] += 1;
    if (parsed.contractStatus === 'INVALID') contractIncompatibleFiles.push(item.file);
    unresolvedGapCount += parsed.unresolvedGaps.length;
    unclassifiedItemCount += parsed.unclassifiedItems.length;
    reviewNoteCount += parsed.reviewNotes.length;
    materials.push({
      keywordId: `keyword-${sha256(parsed.keyword).slice(0, 24)}`,
      keyword: parsed.keyword,
      canonicalStatus: parsed.status,
      gapIds: parsed.unresolvedGaps.map(gap => gap.id),
      sourceDigest: parsed.source.sha256,
      contentAccepted: false,
    });
  }
  if (new Set(materials.map(item => item.keyword)).size !== materials.length) {
    throw new ContractError('CONTRACT_SCHEMA_INVALID', 'Keyword replay contains duplicate keywords');
  }
  const summary = { statusCounts, contractValidityCounts, contractIncompatibleFiles, unresolvedGapCount,
    unclassifiedItemCount, reviewNoteCount };
  for (const key of Object.keys(summary)) {
    if (canonicalJson(summary[key]) !== canonicalJson(input.expected[key])) {
      throw new ContractError('CONTRACT_BINDING_MISMATCH', `Replay summary mismatch: ${key}`);
    }
  }
  if (canonicalJson(input.lineage.pendingIds) !== canonicalJson(input.expected.pendingIds)) {
    throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Pending rows do not match expected lineage');
  }
  const identitySnapshot = createKeywordLegacySnapshot(input);
  const validatedResult = createTestValidatedInputHarness().validate({
    runId: input.adapterInput.runId, stageId: identitySnapshot.originalValue, attemptId: input.sourceAttempt,
    contextDigest: input.adapterInput.contextDigest, schemaBundleDigest: input.schemaBundleDigest,
    recoveryDigest: input.recoveryDigest, evidenceOutcomeDigest: input.evidenceOutcomeDigest,
    siteRevision: input.siteRevision, domain: input.domain, materials,
    pendingRows: [...input.lineage.pendingIds],
  });
  const adapterInputDigest = digest('AGENT_STAGE_ADAPTER_INPUT_V1', input.adapterInput);
  const stageResult = {
    kind: 'STAGE_ADAPTER_RESULT', schemaVersion: 1, producer: 'V2_STAGE_ADAPTER', mode: 'OFFLINE',
    runId: input.adapterInput.runId, canonicalStageId: input.adapterInput.canonicalStageId,
    mappingVersion: input.adapterInput.mappingVersion, contextDigest: input.adapterInput.contextDigest,
    inputDigest: adapterInputDigest, status: 'PARTIAL', authoritative: false,
    artifactDigests: [...new Set(materials.map(item => item.sourceDigest))].sort(),
    errorCodes: ['CONTENT_UNPROVEN'],
  };
  validateStageAdapterResult(stageResult);
  const replayBinding = {
    identitySnapshotDigest: identitySnapshot.snapshotDigest,
    validatedResultDigest: validatedResult.validationDigest,
    stageResultDigest: digest('AGENT_STAGE_ADAPTER_RESULT_V1', stageResult),
  };
  const replay = deepFreeze({ identitySnapshot, validatedResult, stageResult, summary, replayBinding });
  trustedReplays.add(replay);
  return replay;
}

export function createKeywordResearchHandoff({ replay, consumerCanonicalStageId }) {
  validateStageAdapterResult(replay?.stageResult);
  assertTrustedKeywordLegacySnapshot(replay?.identitySnapshot);
  if (replay.stageResult.canonicalStageId !== 'keyword-research') {
    throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Handoff producer is not keyword-research');
  }
  if (consumerCanonicalStageId !== 'template-selection') {
    throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Keyword research can hand off only to template-selection');
  }
  const consumer = resolveStageIdentity({ namespace: 'canonical-stage-id', value: consumerCanonicalStageId,
    mappingVersion: replay.stageResult.mappingVersion });
  const { identitySnapshot: snapshot, validatedResult: validated, stageResult, replayBinding } = replay;
  const bindingMatches = stageResult.runId === snapshot.runId && validated.runId === snapshot.runId &&
    stageResult.contextDigest === snapshot.contextDigest && validated.contextDigest === snapshot.contextDigest &&
    validated.attemptId === snapshot.sourceAttempt && validated.schemaBundleDigest === snapshot.schemaBundleDigest &&
    validated.recoveryDigest === snapshot.recoveryDigest && validated.stageId === snapshot.originalValue &&
    stageResult.mappingVersion === snapshot.mappingVersion &&
    replayBinding?.identitySnapshotDigest === snapshot.snapshotDigest &&
    replayBinding?.validatedResultDigest === validated.validationDigest &&
    replayBinding?.stageResultDigest === digest('AGENT_STAGE_ADAPTER_RESULT_V1', stageResult) &&
    canonicalJson([...new Set(validated.materials.map(item => item.sourceDigest))].sort()) ===
      canonicalJson(stageResult.artifactDigests);
  if (!bindingMatches) {
    throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Keyword replay objects do not share one binding');
  }
  if (!trustedReplays.has(replay)) {
    throw new ContractError('KEYWORD_REPLAY_UNTRUSTED', 'Keyword handoff requires an intact adapter replay');
  }
  return createCanonicalHandoff({ validatedInput: replay.validatedResult,
    consumerStage: consumer.shadowAlias });
}
