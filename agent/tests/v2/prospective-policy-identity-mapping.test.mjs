import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from '../../src/contracts/canonical-json.mjs';
import { contractDefinition, validateContract } from '../../src/contracts/registry.mjs';

const agentRoot = fileURLToPath(new URL('../../', import.meta.url));
const schemaRoot = join(agentRoot, 'src/contracts/schemas');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const sha = value => value.repeat(64);

const protectedSchemaDigests = Object.freeze({
  'execution-context.v1.json': '3139a1c81508230fe797e9f728938556c6796c6f013ab402bda11324c56773d9',
  'stage-commit-candidate.v2.json': '69daedd9ee10a3220aba7f5a22312c1703d3a925ad2b787f18d63a91d1e5a959',
  'stage-commit-record.v2.json': '4ea54367cecc3e5c6933ce72037cb011c19a3df7ca4891b8df5392aea1598aea',
  'transaction-intent.v1.json': '27203bc0956963b70d644d1282dd6e906458195a939177a0540f52c705d83967',
  'approval-record.v1.json': 'a53a8589366725e148c7d55aefc7efa06d89150554ea30eeab9317f465687e5c',
});

async function schema(name) {
  return JSON.parse(await readFile(join(schemaRoot, name), 'utf8'));
}

function executionContext(policyVersion = 1) {
  return {
    kind: 'EXECUTION_CONTEXT', schemaVersion: 1,
    runId: 'policy-contract-run', stageId: 'keyword-research', attemptId: 1,
    requestedOperation: 'prospective-policy-identity-check',
    code: {
      sourceCommit: '1'.repeat(40), workspaceDigest: sha('2'), skillLockDigest: sha('3'),
      schemaBundleDigest: sha('4'), policyVersion, featureGate: 'shadow',
    },
    inputs: [{ path: 'inputs/keywords.txt', sha256: sha('5'), kind: 'raw-keywords', lineageDigest: null }],
    execution: { permissionProfile: 'read-only-contract-test', budget: 0, timeoutMs: 1, hostCapabilities: [] },
    research: { evidencePlanDigest: null, recoveryDigest: null, serviceDecisions: [], targetPlatforms: [] },
    site: { siteRevision: null, domain: null, baselineDigest: null },
  };
}

function transactionIntent(policyVersion = 'p4-shadow-v1') {
  return {
    kind: 'TRANSACTION_INTENT', schemaVersion: 1, producer: 'V2_TRANSACTION_COORDINATOR',
    operationId: `op-${'a'.repeat(32)}`, mode: 'SHADOW', mappingVersion: 'stage-identity-v1',
    policyVersion, runId: 'policy-contract-run', canonicalStageId: 'keyword-research', attemptId: 1,
    contextDigest: sha('6'), schemaBundleDigest: sha('4'), purposeDigest: sha('7'),
    candidateDigest: sha('8'), approvalId: 'approval-00000000-0000-0000-0000-000000000001',
    approvalDigest: sha('9'), createdAtMs: 1, intentDigest: sha('a'),
  };
}

test('published contracts preserve integer Context and string transaction policy identities', async () => {
  const contextSchema = await schema('execution-context.v1.json');
  const candidateSchema = await schema('stage-commit-candidate.v2.json');
  const recordSchema = await schema('stage-commit-record.v2.json');
  const intentSchema = await schema('transaction-intent.v1.json');
  const approvalSchema = await schema('approval-record.v1.json');

  assert.equal(contextSchema.properties.code.properties.policyVersion.type, 'integer');
  for (const item of [candidateSchema, recordSchema, intentSchema, approvalSchema]) {
    assert.equal(item.properties.policyVersion.type, 'string');
  }
  assert.doesNotThrow(() => validateContract('EXECUTION_CONTEXT', 1, executionContext(1)));
  assert.throws(() => validateContract('EXECUTION_CONTEXT', 1, executionContext('1')),
    error => error.code === 'CONTRACT_SCHEMA_INVALID' && error.pointer === '/code/policyVersion');
  assert.doesNotThrow(() => validateContract('TRANSACTION_INTENT', 1, transactionIntent('p4-shadow-v1')));
  assert.throws(() => validateContract('TRANSACTION_INTENT', 1, transactionIntent(1)),
    error => error.code === 'CONTRACT_SCHEMA_INVALID' && error.pointer === '/policyVersion');
});

test('canonical serialization keeps numeric and string policy identities distinct', () => {
  const numeric = canonicalJson({ policyVersion: 1 });
  const textual = canonicalJson({ policyVersion: '1' });
  assert.notEqual(numeric, textual);
  assert.notEqual(sha256(`AGENT_POLICY_IDENTITY_TEST\n${numeric}`),
    sha256(`AGENT_POLICY_IDENTITY_TEST\n${textual}`));
  assert.notStrictEqual(1, '1');
});

test('published policy-bearing schemas retain their reviewed bytes', async () => {
  for (const [name, expected] of Object.entries(protectedSchemaDigests)) {
    assert.equal(sha256(await readFile(join(schemaRoot, name))), expected, name);
  }
});

test('mapping-shaped JSON has no registered authority in the current contract registry', () => {
  const proposedShape = {
    kind: 'POLICY_VERSION_MAPPING', schemaVersion: 1, producer: 'HOST_POLICY_REGISTRY',
    executionPolicyVersion: 1, transactionPolicyId: 'p4-shadow-v1', featureGate: 'shadow',
    mappingTableVersion: 'policy-version-map-v1', mappingDigest: sha('b'),
  };
  assert.throws(() => contractDefinition(proposedShape.kind, proposedShape.schemaVersion),
    error => error.code === 'CONTRACT_KIND_UNKNOWN');
  assert.throws(() => validateContract(proposedShape.kind, proposedShape.schemaVersion, proposedShape),
    error => error.code === 'CONTRACT_KIND_UNKNOWN');
});

test.todo('a future mapping authority distinguishes numeric 1 from textual "1" without coercion');
test.todo('a future mapping authority rejects unknown integer policy versions');
test.todo('a future mapping authority rejects unknown transaction policy identifiers');
test.todo('a future mapping registry rejects ambiguous entries and feature-gate mismatches');
test.todo('a future mapping consumer rejects a mismatched or unanchored mapping digest');
test.todo('a future mapping authority binds one policy identity across Context, Approval, Transaction and Commit');
