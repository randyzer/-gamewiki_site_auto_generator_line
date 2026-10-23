import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const schemaPath = new URL('../config/worker-result.schema.json', import.meta.url);

function assertCodexStructuredOutputSchema(schema, path = '$') {
  if (Object.hasOwn(schema, 'const')) {
    assert.equal(typeof schema.type, 'string', `${path} const must declare an explicit type`);
  }
  if (schema.type === 'array') {
    assert.ok(schema.items && typeof schema.items === 'object', `${path} array must declare items`);
  }
  const objectType = schema.type === 'object' ||
    (Array.isArray(schema.type) && schema.type.includes('object'));
  if (objectType) {
    assert.equal(schema.additionalProperties, false, `${path} object must reject additional properties`);
    const propertyNames = Object.keys(schema.properties ?? {});
    assert.deepEqual([...(schema.required ?? [])].sort(), propertyNames.sort(),
      `${path} must require every declared property; nullable fields represent optional values`);
    for (const [name, child] of Object.entries(schema.properties ?? {})) {
      assertCodexStructuredOutputSchema(child, `${path}.properties.${name}`);
    }
  }
  if (schema.items && typeof schema.items === 'object') {
    assertCodexStructuredOutputSchema(schema.items, `${path}.items`);
  }
}

test('worker output schema uses the strict Codex structured-output subset', async () => {
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  assertCodexStructuredOutputSchema(schema);
});

test('Stage 4 completion handoff is required and nullable for non-Stage-4 workers', async () => {
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  const completion = schema.properties.stage4_completion;
  assert.ok(schema.required.includes('stage4_completion'));
  assert.deepEqual(completion.type, ['object', 'null']);
  assert.equal(completion.properties.kind.type, 'string');
  assert.equal(completion.properties.worker_owned_gates.type, 'string');
  assert.equal(completion.properties.host_validation.type, 'string');
  assert.deepEqual(completion.properties.blocking_gaps.items, { type: 'string' });
});
