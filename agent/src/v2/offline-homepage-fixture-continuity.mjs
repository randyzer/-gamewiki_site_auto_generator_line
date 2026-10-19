import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { canonicalJson, deepFreeze, parseStrictJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { homepageReplayPayloadDigest } from './adapters/homepage-research.mjs';
import { deriveHomepageFixtureSnapshot } from './homepage-fixture-derivation.mjs';
import { assertOfflineStageResultProvenanceAuthority } from './offline-stage-result-provenance.mjs';
import { assertOfflineContextBinderObservationStore,
  assertTrustedOfflineContextBinding } from './production-context-binding.mjs';
import { assertTrustedOfflineObservationRecord } from './production-observation-store.mjs';
import { createStageGateBinding } from './stage-feature-gates.mjs';
import { stageRegistry } from './stage-registry.mjs';

const INPUT_KEYS = Object.freeze(['observationRecord', 'contextBinding', 'stageResult']);
const ROLE_TO_KIND = Object.freeze({ HOMEPAGE_REPORT: 'HOMEPAGE_RESEARCH.md',
  ICON_ARCHIVE: 'ICON.zip', COMPLETION_REPORT: 'VALIDATION_REPORT' });
const continuityStateByInstance = new WeakMap();
const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort())) {
    fail('CONTRACT_INVALID', `${label} has unsupported fields`);
  }
  return value;
}

function safeRelativePath(value) {
  return typeof value === 'string' && value.length > 0 && !isAbsolute(value) &&
    !value.includes('\\') && !value.includes('\0') &&
    !value.split('/').some(part => !part || part === '.' || part === '..');
}

async function assertNoSymlinkComponents(root, path) {
  const rootPrefix = parse(root).root;
  let current = rootPrefix;
  const segments = [...root.slice(rootPrefix.length).split(sep).filter(Boolean), ...path.split('/')];
  for (const segment of segments) {
    current = join(current, segment);
    const metadata = await lstat(current);
    if (metadata.isSymbolicLink()) fail('STATE_STORAGE_SYMLINK', `Fixture path must not be a symlink: ${current}`);
  }
  return current;
}

async function readStableRegularFile(root, path, label) {
  if (!safeRelativePath(path)) fail('STATE_STORAGE_PATH_INVALID', `${label} path is unsafe`);
  const target = await assertNoSymlinkComponents(root, path);
  let handle;
  try { handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW); }
  catch (error) {
    if (error.code === 'ELOOP') fail('STATE_STORAGE_SYMLINK', `${label} path must not be a symlink`);
    throw error;
  }
  try {
    const before = await handle.stat();
    if (!before.isFile()) fail('STATE_STORAGE_PATH_INVALID', `${label} is not a regular file`);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size)
      fail('STATE_STORAGE_CHANGED', `${label} changed while it was being read`);
    return bytes;
  } finally { await handle.close(); }
}

function relativeArtifactPath(root, artifactPath, label) {
  if (typeof artifactPath !== 'string' || !isAbsolute(artifactPath))
    fail('CONTRACT_BINDING_MISMATCH', `${label} artifact path must be absolute`);
  const path = relative(root, resolve(artifactPath)).split(sep).join('/');
  if (!safeRelativePath(path)) fail('CONTRACT_BINDING_MISMATCH', `${label} artifact leaves repository root`);
  return path;
}

function sourceDescriptors(fixtureManifest) {
  const byRole = new Map();
  for (const item of fixtureManifest.sources) {
    if (byRole.has(item.role)) fail('CONTRACT_BINDING_MISMATCH', `Duplicate fixture source role: ${item.role}`);
    byRole.set(item.role, item);
  }
  const item = role => {
    const value = byRole.get(role);
    if (!value) fail('CONTRACT_BINDING_MISMATCH', `Missing fixture source role: ${role}`);
    return value;
  };
  if (byRole.size !== 4) fail('CONTRACT_BINDING_MISMATCH', 'Homepage fixture source roles are incomplete');
  return Object.freeze({
    manifest: { role: 'RUN_MANIFEST', path: item('RUN_MANIFEST').sourceRelativePath,
      sha256: item('RUN_MANIFEST').sourceSha256 },
    report: { role: 'HOMEPAGE_REPORT', path: item('HOMEPAGE_REPORT').sourceRelativePath,
      sha256: item('HOMEPAGE_REPORT').sourceSha256 },
    icon: { role: 'ICON_ARCHIVE', path: item('ICON_ARCHIVE').sourceRelativePath,
      sha256: item('ICON_ARCHIVE').sourceSha256 },
    completion: { role: 'COMPLETION_REPORT', path: item('COMPLETION_REPORT').sourceRelativePath,
      sha256: item('COMPLETION_REPORT').sourceSha256 },
  });
}

function sameIdentity(record, binding, stageResult) {
  return record.identity.runId === binding.runId && binding.runId === stageResult.runId &&
    record.identity.canonicalStageId === binding.canonicalStageId &&
    binding.canonicalStageId === stageResult.canonicalStageId &&
    record.identity.attemptId === binding.attemptId && binding.attemptId === stageResult.attemptId &&
    record.recordDigest === binding.observationRecordDigest &&
    binding.bindingDigest === stageResult.contextBindingDigest &&
    binding.executionContextDigest === stageResult.executionContextDigest &&
    binding.mappingVersion === stageResult.mappingVersion;
}

function verifyManifestBinding({ root, manifest, record, descriptors }) {
  const identity = stageRegistry.get(record.identity.canonicalStageId);
  const stage = manifest.stages?.[identity.legacyArrayIndex];
  if (manifest.runId !== record.identity.runId || manifest.sequence !== record.identity.committedSequence ||
      manifest.deploymentExecuted !== record.snapshot.deploymentExecuted ||
      manifest.inputs?.siteRevision !== record.snapshot.sourceRevision ||
      stage?.skill !== identity.legacySkillName || stage?.status !== record.snapshot.legacyStatus ||
      stage?.checkpoint?.attempt !== record.identity.attemptId ||
      stage?.checkpoint?.inputDigest !== record.snapshot.legacyInputDigest) {
    fail('IDENTITY_MISMATCH', 'Fixture source manifest does not match its observation record');
  }
  const manifestPath = `agent/runs/${record.identity.runId}/manifest.json`;
  if (descriptors.manifest.path !== manifestPath || descriptors.manifest.sha256 !== record.legacyManifest.sha256)
    fail('CONTRACT_BINDING_MISMATCH', 'Fixture manifest source does not match observation history');
  const artifacts = stage.artifacts ?? [];
  for (const [role, kind] of Object.entries(ROLE_TO_KIND)) {
    const descriptor = Object.values(descriptors).find(item => item.role === role);
    const matches = artifacts.filter(artifact => artifact.kind === kind);
    if (matches.length !== 1) fail('CONTRACT_BINDING_MISMATCH', `Expected one legacy artifact for ${role}`);
    const artifact = matches[0];
    if (relativeArtifactPath(root, artifact.path, role) !== descriptor.path ||
        artifact.sha256 !== descriptor.sha256) {
      fail('CONTRACT_BINDING_MISMATCH', `${role} does not match the observed legacy artifact`);
    }
  }
  const observedDigests = artifacts.map(artifact => artifact.sha256).sort();
  if (canonicalJson(observedDigests) !== canonicalJson(record.snapshot.artifactDigests))
    fail('CONTRACT_BINDING_MISMATCH', 'Fixture artifacts do not match the observation snapshot');
  return stage;
}

function fixtureEvidence({ fixtureManifest, sourceFiles, derivedFiles }) {
  const legacyArtifactDigests = fixtureManifest.sources
    .filter(item => item.role !== 'RUN_MANIFEST')
    .map(item => item.sourceSha256).sort();
  const adapterArtifactDigests = [...new Set([
    ...fixtureManifest.sources.map(item => item.sourceSha256),
    ...fixtureManifest.sources.map(item => item.derivedSha256).filter(Boolean),
  ])].sort();
  return {
    legacyArtifactDigests,
    adapterArtifactDigests,
    fixtureManifestDigest: digest('AGENT_HOMEPAGE_FIXTURE_MANIFEST_V1', fixtureManifest),
    sourceEvidenceDigest: digest('AGENT_P6_E_HOMEPAGE_SOURCE_EVIDENCE_V1',
      fixtureManifest.sources.map(item => ({ role: item.role, path: item.sourceRelativePath,
        sha256: sha256(sourceFiles.get(item.sourceRelativePath)) }))),
    derivedEvidenceDigest: digest('AGENT_P6_E_HOMEPAGE_DERIVED_EVIDENCE_V1',
      fixtureManifest.sources.filter(item => item.derivedPath).map(item => ({ role: item.role,
        path: item.derivedPath, sha256: sha256(derivedFiles.get(item.derivedPath)) }))),
    fixturePayloadDigest: homepageReplayPayloadDigest({ fixtureManifest, sourceFiles, derivedFiles,
      zipBytes: sourceFiles.get(fixtureManifest.iconArchive.sourceRelativePath) }),
  };
}

async function buildEvidence({ root, fixtureDirectory, observationStore, contextBinder,
  stageResultProvenance, observationRecord, contextBinding, stageResult }) {
  assertTrustedOfflineObservationRecord(observationStore, observationRecord);
  assertTrustedOfflineContextBinding(contextBinder, contextBinding);
  stageResultProvenance.assertTrustedResult(stageResult);
  const [currentRecord, currentStageResult] = await Promise.all([
    observationStore.read(observationRecord.identity),
    stageResultProvenance.revalidateResult(stageResult),
  ]);
  if (currentRecord.recordDigest !== observationRecord.recordDigest)
    fail('OBSERVATION_HISTORY_UNAVAILABLE', 'Observation record changed before fixture continuity verification');
  if (!sameIdentity(currentRecord, contextBinding, currentStageResult))
    fail('IDENTITY_MISMATCH', 'Fixture continuity authorities do not share one execution identity');
  if (contextBinding.bindingStatus !== 'VERIFIED' || contextBinding.authoritative !== false ||
      contextBinding.verificationScope !== 'OFFLINE_SIMULATED' ||
      contextBinding.executionContext?.code?.featureGate !== 'legacy') {
    fail('TRUST_LEVEL_INSUFFICIENT', 'Fixture continuity requires a complete offline legacy context');
  }
  if (currentRecord.identity.canonicalStageId !== 'homepage-research')
    fail('POLICY_DENIED', 'Fixture continuity only permits homepage-research');

  const fixtureManifestBytes = await readStableRegularFile(root,
    `${fixtureDirectory}/fixture-manifest.json`, 'Homepage fixture manifest');
  const fixtureManifest = parseStrictJson(fixtureManifestBytes, 'homepage fixture manifest');
  validateContract('HOMEPAGE_FIXTURE', 1, fixtureManifest);
  const descriptors = sourceDescriptors(fixtureManifest);
  const sourceEntries = await Promise.all(Object.values(descriptors).map(async descriptor => {
    const bytes = await readStableRegularFile(root, descriptor.path, descriptor.role);
    if (sha256(bytes) !== descriptor.sha256)
      fail('CONTRACT_DIGEST_MISMATCH', `${descriptor.role} source digest drifted`);
    return [descriptor.path, bytes];
  }));
  const sourceFiles = new Map(sourceEntries);
  const manifestBytes = sourceFiles.get(descriptors.manifest.path);
  const manifest = parseStrictJson(manifestBytes, descriptors.manifest.path);
  verifyManifestBinding({ root, manifest, record: currentRecord, descriptors });

  const derived = deriveHomepageFixtureSnapshot({ source: descriptors, manifestBytes,
    reportBytes: sourceFiles.get(descriptors.report.path), iconBytes: sourceFiles.get(descriptors.icon.path),
    completionBytes: sourceFiles.get(descriptors.completion.path) });
  if (canonicalJson(derived.fixtureManifest) !== canonicalJson(fixtureManifest))
    fail('CONTRACT_DIGEST_MISMATCH', 'Committed homepage fixture manifest drifted from deterministic derivation');
  const derivedFiles = new Map();
  for (const item of fixtureManifest.sources.filter(source => source.derivedPath)) {
    const bytes = await readStableRegularFile(root, `${fixtureDirectory}/${item.derivedPath}`,
      `${item.role} derived fixture`);
    const expected = derived.derivedFiles.get(item.derivedPath);
    if (!expected || !bytes.equals(expected) || sha256(bytes) !== item.derivedSha256)
      fail('CONTRACT_DIGEST_MISMATCH', `${item.role} derived fixture digest drifted`);
    derivedFiles.set(item.derivedPath, bytes);
  }

  const fixture = fixtureEvidence({ fixtureManifest, sourceFiles, derivedFiles });
  const gateBinding = createStageGateBinding({ runId: currentRecord.identity.runId,
    canonicalStageId: currentRecord.identity.canonicalStageId, mappingVersion: contextBinding.mappingVersion,
    contextDigest: contextBinding.executionContextDigest, featureGate: 'legacy' });
  const gateBindingDigest = digest('AGENT_STAGE_GATE_BINDING_V1', gateBinding);
  const adapterInput = deepFreeze({ kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1,
    producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE', runId: currentRecord.identity.runId,
    canonicalStageId: currentRecord.identity.canonicalStageId, mappingVersion: contextBinding.mappingVersion,
    contextDigest: contextBinding.executionContextDigest, featureGate: 'legacy', gateBindingDigest,
    payloadDigest: fixture.fixturePayloadDigest });
  const adapterInputDigest = digest('AGENT_STAGE_ADAPTER_INPUT_V1', adapterInput);
  if (adapterInputDigest !== currentStageResult.adapterInputDigest ||
      adapterInputDigest !== currentStageResult.stageResult.inputDigest)
    fail('CONTRACT_BINDING_MISMATCH', 'Fixture payload does not reproduce the trusted stage-result input');

  const base = { kind: 'OFFLINE_HOMEPAGE_FIXTURE_CONTINUITY', schemaVersion: 1,
    authoritative: false, verificationScope: 'OFFLINE_SIMULATED', continuityStatus: 'VERIFIED',
    runId: currentRecord.identity.runId, canonicalStageId: currentRecord.identity.canonicalStageId,
    attemptId: currentRecord.identity.attemptId, mappingVersion: contextBinding.mappingVersion,
    observationRecordDigest: currentRecord.recordDigest, contextBindingDigest: contextBinding.bindingDigest,
    executionContextDigest: contextBinding.executionContextDigest,
    stageResultProvenanceDigest: currentStageResult.provenanceDigest,
    stageResultDigest: currentStageResult.stageResultDigest, adapterInputDigest, ...fixture };
  return deepFreeze({ ...base, continuityDigest: digest('AGENT_P6_E_HOMEPAGE_FIXTURE_CONTINUITY_V1', base) });
}

export function createOfflineHomepageFixtureContinuity({ repositoryRoot, observationStore,
  contextBinder, stageResultProvenance } = {}) {
  if (typeof repositoryRoot !== 'string' || !isAbsolute(repositoryRoot))
    fail('STATE_STORAGE_PATH_INVALID', 'repositoryRoot must be absolute');
  if (!observationStore || typeof observationStore !== 'object' ||
      !contextBinder || typeof contextBinder !== 'object' ||
      !stageResultProvenance || typeof stageResultProvenance !== 'object') {
    fail('TRUST_LEVEL_INSUFFICIENT', 'Trusted fixture continuity authorities are required');
  }
  assertOfflineContextBinderObservationStore(contextBinder, observationStore);
  assertOfflineStageResultProvenanceAuthority(stageResultProvenance, observationStore, contextBinder);
  const root = resolve(repositoryRoot);
  const fixtureDirectory = 'agent/tests/fixtures/v2/homepage';
  const evidenceByIdentity = new WeakMap();
  const continuity = Object.freeze({
    async prove(rawInput) {
      const input = exactObject(rawInput, INPUT_KEYS, 'Fixture continuity input');
      const evidence = await buildEvidence({ root, fixtureDirectory, observationStore, contextBinder,
        stageResultProvenance, ...input });
      evidenceByIdentity.set(evidence, input);
      return evidence;
    },
    assertTrustedEvidence(evidence) {
      if (!continuityStateByInstance.get(continuity)?.evidenceByIdentity.has(evidence))
        fail('TRUST_LEVEL_INSUFFICIENT', 'Trusted fixture evidence from the current continuity instance is required');
      return evidence;
    },
    async revalidateEvidence(evidence) {
      continuity.assertTrustedEvidence(evidence);
      const input = evidenceByIdentity.get(evidence);
      const rebuilt = await buildEvidence({ root, fixtureDirectory, observationStore, contextBinder,
        stageResultProvenance, ...input });
      if (canonicalJson(rebuilt) !== canonicalJson(evidence))
        fail('CONTRACT_DIGEST_MISMATCH', 'Homepage fixture continuity evidence changed after creation');
      return evidence;
    },
  });
  continuityStateByInstance.set(continuity, { observationStore, contextBinder,
    stageResultProvenance, evidenceByIdentity });
  return continuity;
}

export function assertOfflineHomepageFixtureContinuityAuthority(continuity, observationStore,
  contextBinder, stageResultProvenance) {
  const state = continuityStateByInstance.get(continuity);
  if (!state || state.observationStore !== observationStore || state.contextBinder !== contextBinder ||
      state.stageResultProvenance !== stageResultProvenance) {
    fail('TRUST_LEVEL_INSUFFICIENT', 'Fixture continuity must share the comparator authority');
  }
  return continuity;
}
