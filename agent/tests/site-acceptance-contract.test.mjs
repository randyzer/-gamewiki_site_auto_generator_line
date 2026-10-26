import test from 'node:test';
import assert from 'node:assert/strict';
import { contractDefinition, validateContract } from '../src/contracts/registry.mjs';

const digest = character => character.repeat(64);
const contracts = [
  ['IMMUTABLE_INTEGRATION_LINEAGE', 1],
  ['CURRENT_SITE_BASELINE', 1],
  ['SITE_ACCEPTANCE_IDENTITY', 1],
  ['SITE_REACCEPTANCE_AUTHORIZATION', 1],
  ['SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION', 1],
  ['SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION', 1],
  ['PUBLICATION_EVIDENCE_BODY', 1],
  ['DERIVED_PUBLICATION_ATTESTATION', 1],
];

test('PR-A contracts are registered as closed versioned schemas', () => {
  for (const [kind, version] of contracts) {
    const definition = contractDefinition(kind, version);
    assert.equal(definition.kind, kind);
    assert.equal(definition.schema.additionalProperties, false);
  }
  assert.throws(() => validateContract('SITE_ACCEPTANCE_IDENTITY', 1, {
    kind: 'SITE_ACCEPTANCE_IDENTITY', schemaVersion: 1, unexpected: digest('a'),
  }), error => error.code === 'CONTRACT_SCHEMA_INVALID');
});
