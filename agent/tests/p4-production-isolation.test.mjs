import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function modules(root) {
  const output = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...await modules(path));
    else if (entry.name.endsWith('.mjs')) output.push(path);
  }
  return output;
}

test('P4 modules are not imported by existing production source paths', async () => {
  const sourceRoot = new URL('../src/', import.meta.url).pathname;
  const p4Roots = ['/approval/', '/handoff-v2/', '/publication-v2/', '/v2/'];
  const candidates = (await modules(sourceRoot)).filter(path => !p4Roots.some(segment => path.includes(segment)));
  const violations = [];
  for (const path of candidates) {
    const text = await readFile(path, 'utf8');
    if (/from\s+['"][^'"]*\/(?:approval|handoff-v2|publication-v2)\//u.test(text)) violations.push(path);
  }
  assert.deepEqual(violations, []);
});
