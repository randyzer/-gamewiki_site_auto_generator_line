import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../../contracts/canonical-json.mjs';
import { ContractError } from '../../contracts/errors.mjs';

const trustedBuildEvidence = new WeakSet();
const digestPattern = /^[a-f0-9]{64}$/;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };
const nonempty = value => typeof value === 'string' && value.trim() === value && value.length > 0;

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('CONTRACT_SCHEMA_INVALID', `${label} must be an object`);
  if (canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort()))
    fail('CONTRACT_SCHEMA_INVALID', `${label} fields do not match the closed contract`);
  return value;
}

function assertDigest(value, label) {
  if (!digestPattern.test(value ?? '')) fail('CONTRACT_SCHEMA_INVALID', `${label} must be a SHA256 digest`);
}

function denyCapabilities(requestedCapabilities = []) {
  if (!Array.isArray(requestedCapabilities)) fail('POLICY_DENIED', 'Requested capabilities must be an array');
  if (requestedCapabilities.length) fail('POLICY_DENIED', `P5-F build host denies ${String(requestedCapabilities[0])}`);
}

export function buildRecordDigest(buildRecord) {
  const { recordDigest: ignored, ...payload } = buildRecord;
  return digest('AGENT_SIMULATED_BUILD_RECORD_V1', payload);
}

function validateBuildRecord(record) {
  exactObject(record, ['kind', 'schemaVersion', 'producer', 'classification', 'mode', 'runId',
    'contextDigest', 'sourceRevision', 'siteRevision', 'buildDigest', 'domain', 'decisionDigest',
    'toolchain', 'commands', 'artifacts', 'complete', 'gaps', 'recordDigest'], 'simulated build record');
  if (record.kind !== 'SIMULATED_BUILD_RECORD' || record.schemaVersion !== 1 ||
      record.producer !== 'P5_F_OFFLINE_FIXTURE' || record.classification !== 'OFFLINE_STUB' ||
      record.mode !== 'SIMULATED' || !nonempty(record.runId) || !nonempty(record.domain) ||
      typeof record.complete !== 'boolean' || !Array.isArray(record.gaps) ||
      record.gaps.some(value => !nonempty(value)) || new Set(record.gaps).size !== record.gaps.length)
    fail('CONTRACT_SCHEMA_INVALID', 'Simulated build record identity is invalid');
  for (const name of ['contextDigest', 'sourceRevision', 'siteRevision', 'buildDigest',
    'decisionDigest', 'recordDigest']) assertDigest(record[name], name);
  exactObject(record.toolchain, ['nodeVersion', 'packageManager', 'platform'], 'build toolchain');
  if (Object.values(record.toolchain).some(value => !nonempty(value)))
    fail('CONTRACT_SCHEMA_INVALID', 'Build toolchain values must be nonempty');
  if (!Array.isArray(record.commands) || !record.commands.length)
    fail('CONTRACT_SCHEMA_INVALID', 'Build commands must be nonempty');
  const scripts = new Set();
  for (const command of record.commands) {
    exactObject(command, ['script', 'command', 'exitCode', 'outputDigest'], 'build command');
    if (!nonempty(command.script) || scripts.has(command.script) || !Array.isArray(command.command) ||
        !command.command.length || command.command.some(value => !nonempty(value)) ||
        !Number.isSafeInteger(command.exitCode)) fail('CONTRACT_SCHEMA_INVALID', 'Build command is invalid');
    assertDigest(command.outputDigest, 'build command outputDigest'); scripts.add(command.script);
  }
  if (!Array.isArray(record.artifacts)) fail('CONTRACT_SCHEMA_INVALID', 'Build artifacts must be an array');
  const paths = new Set();
  for (const artifact of record.artifacts) {
    exactObject(artifact, ['path', 'sha256', 'byteLength'], 'build artifact');
    if (!nonempty(artifact.path) || artifact.path.startsWith('/') || artifact.path.includes('..') ||
        paths.has(artifact.path) || !Number.isSafeInteger(artifact.byteLength) || artifact.byteLength < 0)
      fail('CONTRACT_SCHEMA_INVALID', 'Build artifact is invalid');
    assertDigest(artifact.sha256, 'build artifact sha256'); paths.add(artifact.path);
  }
  if (buildRecordDigest(record) !== record.recordDigest)
    fail('CONTRACT_DIGEST_MISMATCH', 'Simulated build record digest mismatch');
  return scripts;
}

export function captureSimulatedBuildEvidence({ buildRecord, requestedCapabilities = [] }) {
  denyCapabilities(requestedCapabilities);
  const scripts = validateBuildRecord(buildRecord);
  const failures = buildRecord.commands.filter(item => item.exitCode !== 0)
    .map(item => `COMMAND_FAILED:${item.script}`);
  const incomplete = !buildRecord.complete || buildRecord.gaps.length ||
    !scripts.has('build') || buildRecord.artifacts.length === 0;
  const result = failures.length ? 'REJECTED' : incomplete ? 'UNPROVEN' : 'OFFLINE_SIMULATED_VERIFIED';
  const base = {
    kind: 'SIMULATED_BUILD_EVIDENCE', schemaVersion: 1, producer: 'P5_F_BUILD_EVIDENCE_ADAPTER',
    classification: 'OFFLINE_STUB', mode: 'SIMULATED', authoritative: false,
    runId: buildRecord.runId, contextDigest: buildRecord.contextDigest,
    sourceRevision: buildRecord.sourceRevision, siteRevision: buildRecord.siteRevision,
    buildDigest: buildRecord.buildDigest, domain: buildRecord.domain,
    decisionDigest: buildRecord.decisionDigest, sourceRecordDigest: buildRecord.recordDigest,
    toolchainDigest: digest('AGENT_BUILD_TOOLCHAIN_V1', buildRecord.toolchain),
    commandEvidenceDigest: digest('AGENT_BUILD_COMMANDS_V1', buildRecord.commands),
    artifactEvidenceDigest: digest('AGENT_BUILD_ARTIFACTS_V1', buildRecord.artifacts),
    result, failures, gaps: [...buildRecord.gaps],
  };
  const evidence = deepFreeze({ ...base,
    evidenceDigest: digest('AGENT_SIMULATED_BUILD_EVIDENCE_V1', base) });
  trustedBuildEvidence.add(evidence);
  return evidence;
}

export function assertTrustedBuildEvidence(evidence) {
  if (!trustedBuildEvidence.has(evidence))
    fail('BUILD_EVIDENCE_UNTRUSTED', 'Build evidence was not issued by the fixed P5-F host adapter');
  return evidence;
}
