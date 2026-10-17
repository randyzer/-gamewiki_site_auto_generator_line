import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson, parseStrictJson } from '../src/contracts/canonical-json.mjs';

test('canonical JSON sorts object keys, normalizes Unicode and preserves array order', () => {
  const first = { z: ['second', 'first'], a: 'e\u0301' };
  const second = { a: 'é', z: ['second', 'first'] };
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(canonicalJson(first), '{"a":"é","z":["second","first"]}');
  assert.notEqual(canonicalJson(first), canonicalJson({ ...second, z: ['first', 'second'] }));
});

test('strict JSON parsing rejects duplicate keys and unsupported protocol numbers', () => {
  assert.throws(() => parseStrictJson('{"a":1,"a":2}'), error =>
    error.code === 'CONTEXT_CANONICALIZATION_INVALID' && /duplicate/i.test(error.message));
  for (const value of [1.5, Number.MAX_SAFE_INTEGER + 1, -0, NaN, Infinity]) {
    assert.throws(() => canonicalJson({ value }), error =>
      error.code === 'CONTEXT_CANONICALIZATION_INVALID');
  }
});

test('strict JSON parser accepts nested valid JSON without changing data', () => {
  const source = '{"nested":{"value":1},"items":[true,null,"x"]}';
  assert.deepEqual(parseStrictJson(source), {
    nested: { value: 1 }, items: [true, null, 'x'],
  });
});

test('canonical JSON sorts normalized keys and rejects invalid Unicode or non-JSON whitespace', () => {
  assert.equal(canonicalJson({ '\u0066': 2, 'e\u0301': 1 }), '{"f":2,"é":1}');
  assert.throws(() => canonicalJson({ value: '\uD800' }), error =>
    error.code === 'CONTEXT_CANONICALIZATION_INVALID');
  assert.throws(() => parseStrictJson('{\u00a0"a":1}'), error =>
    error.code === 'CONTEXT_CANONICALIZATION_INVALID');
});

test('strict JSON preserves __proto__ as data and rejects Unicode-equivalent duplicate keys', () => {
  const parsed = parseStrictJson('{"__proto__":{"polluted":true}}');
  assert.equal(Object.getPrototypeOf(parsed), Object.prototype);
  assert.equal(Object.hasOwn(parsed, '__proto__'), true);
  assert.deepEqual(parsed.__proto__, { polluted: true });
  assert.equal(canonicalJson(parsed), '{"__proto__":{"polluted":true}}');
  assert.equal(Object.prototype.polluted, undefined);
  assert.throws(() => parseStrictJson('{"é":1,"e\\u0301":2}'), error =>
    error.code === 'CONTEXT_CANONICALIZATION_INVALID' && /duplicate/i.test(error.message));
});
