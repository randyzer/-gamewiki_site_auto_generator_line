import { ContractError } from './errors.mjs';

const escaped = value => value.replaceAll('~', '~0').replaceAll('/', '~1');
const child = (pointer, key) => `${pointer}/${escaped(String(key))}`;
const typeOf = value => value === null ? 'null' : Array.isArray(value) ? 'array' :
  Number.isInteger(value) ? 'integer' : typeof value;

function schemaError(message, pointer, schema, code = 'CONTRACT_SCHEMA_INVALID') {
  throw new ContractError(code, message, { pointer: pointer || '/', schemaId: schema.$id });
}

function validateFormat(format, value, pointer, root) {
  if (format === 'sha256' && !/^[a-f0-9]{64}$/.test(value)) schemaError('Expected lowercase SHA256', pointer, root);
  if (format === 'git-sha' && !/^[a-f0-9]{40}$/.test(value)) schemaError('Expected full Git SHA', pointer, root);
  if (format === 'relative-posix-path') {
    const invalid = !value || value.startsWith('/') || value.includes('\\') || value.includes('//') ||
      value.split('/').some(part => !part || part === '.' || part === '..');
    if (invalid) schemaError('Expected a safe relative POSIX path', pointer, root, 'CONTRACT_PATH_INVALID');
  }
}

function check(schema, value, pointer, root) {
  if (Object.hasOwn(schema, 'const') && value !== schema.const) schemaError('Value does not match const', pointer, root);
  if (schema.enum && !schema.enum.includes(value)) schemaError('Value is outside enum', pointer, root);
  const allowed = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (allowed.length && !allowed.includes(typeOf(value))) schemaError(`Expected ${allowed.join('|')}`, pointer, root);
  if (value === null) return;
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) schemaError('String is too short', pointer, root);
    if (schema.pattern && !(new RegExp(schema.pattern, 'u')).test(value)) schemaError('String does not match pattern', pointer, root);
    if (schema.format) validateFormat(schema.format, value, pointer, root);
  }
  if (Number.isInteger(value)) {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) schemaError('Expected a safe protocol integer', pointer, root);
    if (schema.minimum !== undefined && value < schema.minimum) schemaError('Integer is below minimum', pointer, root);
    if (schema.maximum !== undefined && value > schema.maximum) schemaError('Integer is above maximum', pointer, root);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) schemaError('Array has too few items', pointer, root);
    if (schema.uniqueItems) {
      const values = value.map(item => JSON.stringify(item));
      if (new Set(values).size !== values.length) schemaError('Array items must be unique', pointer, root);
    }
    if (schema.items) value.forEach((item, index) => check(schema.items, item, child(pointer, index), root));
  }
  if (typeOf(value) === 'object') {
    const properties = schema.properties ?? {};
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) schemaError(`Missing required field: ${key}`, child(pointer, key), root);
    }
    for (const [key, item] of Object.entries(value)) {
      if (!Object.hasOwn(properties, key)) {
        if (schema.additionalProperties === false) schemaError(`Unknown field: ${key}`, child(pointer, key), root);
      } else check(properties[key], item, child(pointer, key), root);
    }
  }
}

export function validateSchema(schema, value) {
  check(schema, value, '', schema);
  return value;
}
