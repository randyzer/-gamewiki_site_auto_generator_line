import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { canonicalJson, deepFreeze } from '../../contracts/canonical-json.mjs';
import { ContractError } from '../../contracts/errors.mjs';
import { validateContract } from '../../contracts/registry.mjs';
import { validateStageAdapterInput, validateStageAdapterResult } from '../stage-adapter-contract.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };

function safeRelative(path) {
  if (typeof path !== 'string' || !path || path.includes('\\') || path.includes('\0') || path.startsWith('/') ||
      path.split('/').some(part => !part || part === '.' || part === '..'))
    fail('TEMPLATE_DESTINATION_INVALID', `Unsafe template path: ${path}`);
  return path;
}

function assertPolicy(requestedCapabilities = []) {
  if (!Array.isArray(requestedCapabilities)) fail('POLICY_DENIED', 'Offline capability requests must be an array');
  if (requestedCapabilities.length) fail('POLICY_DENIED', `P5-D template adapter denies ${requestedCapabilities[0]}`);
}

function normalizedFiles(fixtureManifest) {
  const files = fixtureManifest.copyManifest.files.map(item => ({ path: safeRelative(item.path), sha256: item.sha256 }))
    .sort((left, right) => left.path.localeCompare(right.path));
  if (new Set(files.map(item => item.path)).size !== files.length)
    fail('CONTRACT_BINDING_MISMATCH', 'Template copy manifest contains duplicate paths');
  return files;
}

export function templateTreeDigest(fixtureManifest) {
  return digest('AGENT_TEMPLATE_STUB_TREE_V1', normalizedFiles(fixtureManifest));
}

export function templateReplayPayloadDigest({ fixtureManifest }) {
  return digest('AGENT_TEMPLATE_REPLAY_PAYLOAD_V1', fixtureManifest);
}

export function replayTemplateSelection(input) {
  assertPolicy(input.requestedCapabilities);
  validateStageAdapterInput(input.adapterInput);
  if (input.adapterInput.canonicalStageId !== 'template-selection')
    fail('CONTRACT_BINDING_MISMATCH', 'Template adapter requires template-selection');
  validateContract('TEMPLATE_FIXTURE', 1, input.fixtureManifest);
  if (templateReplayPayloadDigest(input) !== input.adapterInput.payloadDigest)
    fail('CONTRACT_DIGEST_MISMATCH', 'Template replay payload digest mismatch');
  let repository;
  try { repository = new URL(input.fixtureManifest.repository.url); }
  catch { fail('CONTRACT_BINDING_MISMATCH', 'Template repository URL is invalid'); }
  if (repository.protocol !== 'https:' || repository.username || repository.password || repository.search || repository.hash)
    fail('CONTRACT_BINDING_MISMATCH', 'Template repository must be a plain HTTPS URL');
  safeRelative(input.fixtureManifest.repository.subtree);
  const files = normalizedFiles(input.fixtureManifest);
  if (templateTreeDigest(input.fixtureManifest) !== input.fixtureManifest.templateTreeDigest)
    fail('CONTRACT_BINDING_MISMATCH', 'Template tree digest mismatch');
  if (input.fixtureManifest.residueScan.matches.length)
    fail('TEMPLATE_RESIDUE_FOUND', 'Template residue scan contains unresolved matches');
  const root = posix.resolve('/', safeRelative(input.fixtureManifest.destination.rootRelativePath));
  const destination = posix.resolve('/', safeRelative(input.fixtureManifest.destination.relativePath));
  if (!destination.startsWith(`${root}/`))
    fail('TEMPLATE_DESTINATION_INVALID', 'Template destination escapes its declared root');
  const templateLock = deepFreeze({
    kind: 'OFFLINE_TEMPLATE_LOCK', schemaVersion: 1, authoritative: false, copyExecuted: false,
    repository: input.fixtureManifest.repository.url, ref: input.fixtureManifest.repository.ref,
    commit: input.fixtureManifest.repository.commit, subtree: input.fixtureManifest.repository.subtree,
    templateTreeDigest: input.fixtureManifest.templateTreeDigest, contextDigest: input.adapterInput.contextDigest,
    lockDigest: digest('AGENT_OFFLINE_TEMPLATE_LOCK_V1', {
      repository: input.fixtureManifest.repository, templateTreeDigest: input.fixtureManifest.templateTreeDigest,
      contextDigest: input.adapterInput.contextDigest,
    }),
  });
  const stageResult = {
    kind: 'STAGE_ADAPTER_RESULT', schemaVersion: 1, producer: 'V2_STAGE_ADAPTER', mode: 'OFFLINE',
    runId: input.adapterInput.runId, canonicalStageId: input.adapterInput.canonicalStageId,
    mappingVersion: input.adapterInput.mappingVersion, contextDigest: input.adapterInput.contextDigest,
    inputDigest: digest('AGENT_STAGE_ADAPTER_INPUT_V1', input.adapterInput), status: 'PARTIAL',
    authoritative: false, artifactDigests: [
      digest('AGENT_TEMPLATE_FIXTURE_V1', input.fixtureManifest), input.fixtureManifest.templateTreeDigest,
    ].sort(), errorCodes: ['TEMPLATE_REAL_EXECUTION_UNPROVEN'],
  };
  validateStageAdapterResult(stageResult);
  return deepFreeze({ stageResult, templateLock, files, sourceVerified: false, copyExecuted: false,
    publicationEligible: false });
}
