import { ContractError } from './errors.mjs';

const invalid = (message, pointer = '') => new ContractError(
  'CONTEXT_CANONICALIZATION_INVALID', message, { pointer },
);

const hasLoneSurrogate = value => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xD800 && code <= 0xDBFF) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xDC00 && next <= 0xDFFF)) return true;
      index += 1;
    } else if (code >= 0xDC00 && code <= 0xDFFF) return true;
  }
  return false;
};

function normalizedString(value) {
  if (hasLoneSurrogate(value)) throw invalid('Lone Unicode surrogate is not allowed');
  return value.normalize('NFC');
}

function defineDataProperty(target, key, value) {
  Object.defineProperty(target, key, {
    value, enumerable: true, configurable: true, writable: true,
  });
}

function normalize(value, pointer = '') {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') return normalizedString(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      throw invalid(`Protocol number must be a safe integer at ${pointer || '/'}`, pointer);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item, index) => normalize(item, `${pointer}/${index}`));
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw invalid(`Unsupported canonical JSON value at ${pointer || '/'}`, pointer);
  }
  const output = {};
  const seen = new Set();
  const entries = Object.keys(value).map(key => [normalizedString(key), key])
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  for (const [normalizedKey, originalKey] of entries) {
    if (seen.has(normalizedKey)) throw invalid(`Duplicate normalized key: ${normalizedKey}`, pointer);
    seen.add(normalizedKey);
    const nextPointer = `${pointer}/${normalizedKey.replaceAll('~', '~0').replaceAll('/', '~1')}`;
    defineDataProperty(output, normalizedKey, normalize(value[originalKey], nextPointer));
  }
  return output;
}

export function canonicalJson(value) {
  return JSON.stringify(normalize(value));
}

export function parseStrictJson(input, source = '<json>') {
  const text = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
  let index = 0;
  const fail = message => { throw invalid(`${message} in ${source} at position ${index}`); };
  const whitespace = () => { while (/[\u0020\u0009\u000a\u000d]/u.test(text[index] ?? '')) index += 1; };
  const string = () => {
    if (text[index] !== '"') fail('Expected JSON string');
    const start = index++;
    let escaped = false;
    while (index < text.length) {
      const character = text[index++];
      if (!escaped && character === '"') {
        try { return normalizedString(JSON.parse(text.slice(start, index))); }
        catch { fail('Invalid JSON string'); }
      }
      if (!escaped && character.charCodeAt(0) < 0x20) fail('Unescaped control character');
      if (!escaped && character === '\\') escaped = true;
      else escaped = false;
    }
    fail('Unterminated JSON string');
  };
  const number = () => {
    const match = text.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!match) fail('Invalid JSON number');
    index += match[0].length;
    const value = Number(match[0]);
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) fail('Protocol number must be a safe integer');
    return value;
  };
  const value = () => {
    whitespace();
    const character = text[index];
    if (character === '"') return string();
    if (character === '[') {
      index += 1; whitespace();
      const result = [];
      if (text[index] === ']') { index += 1; return result; }
      while (true) {
        result.push(value()); whitespace();
        if (text[index] === ']') { index += 1; return result; }
        if (text[index++] !== ',') fail('Expected comma in array');
      }
    }
    if (character === '{') {
      index += 1; whitespace();
      const result = {}, keys = new Set();
      if (text[index] === '}') { index += 1; return result; }
      while (true) {
        whitespace();
        const key = string();
        if (keys.has(key)) fail(`Duplicate JSON key: ${key}`);
        keys.add(key); whitespace();
        if (text[index++] !== ':') fail('Expected colon in object');
        defineDataProperty(result, key, value()); whitespace();
        if (text[index] === '}') { index += 1; return result; }
        if (text[index++] !== ',') fail('Expected comma in object');
      }
    }
    for (const [token, parsed] of [['true', true], ['false', false], ['null', null]]) {
      if (text.startsWith(token, index)) { index += token.length; return parsed; }
    }
    if (character === '-' || /\d/.test(character ?? '')) return number();
    fail('Unexpected JSON token');
  };
  const parsed = value();
  whitespace();
  if (index !== text.length) fail('Unexpected trailing JSON content');
  return parsed;
}
