import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../src/files.mjs';
import { inspectKeywordMaterial } from '../src/contracts/adapters/keyword-skill-v1.mjs';
import { compareKeywordMaterialShadow } from '../src/contracts/compatibility.mjs';

const fixtureRoot = fileURLToPath(new URL('./fixtures/regressions/attempt-10-material-gap-format/', import.meta.url));

test('attempt 10 fixture preserves 2/25/4 raw statuses and pending rows without guessing', async () => {
  const expected = JSON.parse(await readFile(join(fixtureRoot, 'expected.json'), 'utf8'));
  const lineage = JSON.parse(await readFile(join(fixtureRoot, 'lineage.json'), 'utf8'));
  const files = (await readdir(join(fixtureRoot, 'materials'))).sort();
  const counts = { COMPLETED: 0, PARTIAL: 0, BLOCKED: 0 };
  const validity = { VALID: 0, INVALID: 0 }, invalid = [], incomplete = [];
  let unresolvedGapCount = 0, unclassifiedItemCount = 0, reviewNoteCount = 0;
  for (const file of files) {
    const bytes = await readFile(join(fixtureRoot, 'materials', file));
    const result = inspectKeywordMaterial(bytes, { sourcePath: `materials/${file}`,
      skillContractSha256: expected.skillContractSha256 });
    counts[result.status] += 1;
    validity[result.contractStatus] += 1;
    unresolvedGapCount += result.unresolvedGaps.length;
    unclassifiedItemCount += result.unclassifiedItems.length;
    reviewNoteCount += result.reviewNotes.length;
    if (result.contractStatus === 'INVALID') invalid.push(file);
    if (result.status !== 'COMPLETED') incomplete.push({ file, bytes, result });
  }
  assert.deepEqual(counts, { COMPLETED: 2, PARTIAL: 25, BLOCKED: 4 });
  assert.deepEqual(counts, expected.statusCounts);
  assert.deepEqual(invalid, [
    'Wallpaper Engine Steam ID素材.md',
    'Wallpaper Engine for mac素材.md',
  ]);
  assert.deepEqual(invalid, expected.contractIncompatibleFiles);
  assert.deepEqual(validity, expected.contractValidityCounts);
  assert.equal(unresolvedGapCount, expected.unresolvedGapCount);
  assert.equal(unclassifiedItemCount, expected.unclassifiedItemCount);
  assert.equal(reviewNoteCount, expected.reviewNoteCount);
  for (const { file, bytes, result } of incomplete) {
    assert.equal(result.contractStatus, 'VALID', file);
    assert.ok(result.unresolvedGaps.length > 0, file);
    assert.deepEqual(result.unclassifiedItems, [], file);
    const replay = inspectKeywordMaterial(bytes, { sourcePath: `materials/${file}`,
      skillContractSha256: expected.skillContractSha256 });
    assert.deepEqual(result.unresolvedGaps.map(item => item.id),
      replay.unresolvedGaps.map(item => item.id), file);
  }
  assert.deepEqual(lineage.pendingIds, [36, 84, 96, 100]);
  assert.ok(lineage.rows.every(row => row.final === null && row.disposition === '待确认'));
});

test('real COMPLETED pending items remain raw-status preserving and semantically unclassified', async () => {
  const expected = JSON.parse(await readFile(join(fixtureRoot, 'expected.json'), 'utf8'));
  for (const file of expected.contractIncompatibleFiles) {
    const bytes = await readFile(join(fixtureRoot, 'materials', file));
    const result = inspectKeywordMaterial(bytes, { sourcePath: `materials/${file}`,
      skillContractSha256: expected.skillContractSha256 });
    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.contractStatus, 'INVALID');
    assert.deepEqual(result.unresolvedGaps, []);
    assert.equal(result.unclassifiedItems.length, 1);
    assert.deepEqual(result.diagnostics, ['PENDING_SEMANTICS_UNCLASSIFIED']);
    assert.deepEqual(compareKeywordMaterialShadow(bytes, { sourcePath: `materials/${file}`,
      skillContractSha256: expected.skillContractSha256 }), {
      classification: 'V2_INCOMPATIBLE', contract: 'KEYWORD_MATERIAL',
      legacyResult: 'VALIDATED_COMPLETED', v2Result: 'CONTRACT_INCOMPATIBLE',
      authority: 'LEGACY', executionAllowed: false,
    });
  }
});

test('fixture manifest binds every redacted file and shadow exposes the legacy parser defect', async () => {
  const manifest = JSON.parse(await readFile(join(fixtureRoot, 'fixture-manifest.json'), 'utf8'));
  for (const entry of manifest.materials) {
    const bytes = await readFile(join(fixtureRoot, entry.fixturePath));
    assert.equal(sha256(bytes), entry.fixtureSha256);
  }
  const partial = manifest.materials.find(entry => entry.status === 'PARTIAL');
  const bytes = await readFile(join(fixtureRoot, partial.fixturePath));
  assert.deepEqual(compareKeywordMaterialShadow(bytes, {
    sourcePath: partial.fixturePath, skillContractSha256: manifest.skillContractSha256,
  }), {
    classification: 'LEGACY_DEFECT_EXPOSED', contract: 'KEYWORD_MATERIAL',
    legacyResult: 'RESEARCH_HANDOFF_INVALID', v2Result: 'VALIDATED_PARTIAL',
    authority: 'LEGACY', executionAllowed: false,
  });
});
