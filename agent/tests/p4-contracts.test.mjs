import test from 'node:test';
import assert from 'node:assert/strict';
import { contractDefinition, validateContract } from '../src/contracts/registry.mjs';
import { createApprovalRequest } from '../src/approval/approval-engine.mjs';
import { digest } from './state-helpers.mjs';

const contracts = [
  ['APPROVAL_REQUEST', 1], ['APPROVAL_RECORD', 1], ['APPROVAL_REFERENCE', 1],
  ['APPROVAL_CONSUMPTION', 1], ['APPROVAL_REVOCATION', 1], ['VALIDATED_STAGE_RESULT', 1],
  ['RESEARCH_HANDOFF', 2], ['ROUTE_PUBLICATION', 2], ['ROUTE_COVERAGE', 1], ['PUBLICATION_PROOF', 1],
];

test('all P4 contracts are registered with closed schemas', () => {
  for (const [kind, version] of contracts) {
    const definition = contractDefinition(kind, version);
    assert.equal(definition.kind, kind);
    assert.equal(definition.schema.additionalProperties, false);
  }
  const request = createApprovalRequest({ runId: 'run-p4', stageId: 'stage-2', attemptId: 10,
    contextDigest: digest('context'), schemaBundleDigest: digest('schemas'), purpose: 'PARTIAL_HANDOFF',
    purposePayload: { handoffDigest: digest('handoff') } });
  assert.throws(() => validateContract('APPROVAL_REQUEST', 1, { ...request, unexpected: true }),
    error => error.code === 'CONTRACT_SCHEMA_INVALID');
  assert.throws(() => validateContract('APPROVAL_REQUEST', 2, request),
    error => error.code === 'CONTRACT_VERSION_UNSUPPORTED');
});
