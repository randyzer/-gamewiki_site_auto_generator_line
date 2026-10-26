import test from 'node:test';
import assert from 'node:assert/strict';
import { contractDefinition, validateContract } from '../src/contracts/registry.mjs';

const contracts = [
  'SITE_REMEDIATION_PREVIEW',
  'SITE_REMEDIATION_INTENT',
  'SITE_REMEDIATION_RECEIPT',
  'SITE_REMEDIATION_ABORT',
];

test('PR-B remediation records are registered as closed versioned contracts', () => {
  for (const kind of contracts) {
    const definition = contractDefinition(kind, 1);
    assert.equal(definition.kind, kind);
    assert.equal(definition.schema.additionalProperties, false);
    assert.throws(() => validateContract(kind, 1, {
      kind,
      schemaVersion: 1,
      unexpected: true,
    }), error => error.code === 'CONTRACT_SCHEMA_INVALID');
  }
});
