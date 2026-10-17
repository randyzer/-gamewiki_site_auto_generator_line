import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptKeywordMaterial, inspectKeywordMaterial } from '../src/contracts/adapters/keyword-skill-v1.mjs';

const options = { sourcePath: 'materials/Example guide素材.md',
  skillContractSha256: 'a'.repeat(64) };

test('adapter parses the locked Skill pending section into stable canonical gaps', () => {
  const markdown = '# Example guide 素材\n\n- 关键词: Example guide\n- 状态: PARTIAL\n\n' +
    '## 交叉验证结果\n\n### 待确认\n\n- Missing official version.\n- Missing current date.\n\n## 调研限制\n- none\n';
  const first = adaptKeywordMaterial(Buffer.from(markdown), options);
  const second = adaptKeywordMaterial(Buffer.from(markdown), options);
  assert.equal(first.status, 'PARTIAL');
  assert.equal(first.contractStatus, 'VALID');
  assert.deepEqual(first.unresolvedGaps.map(item => item.description),
    ['Missing official version.', 'Missing current date.']);
  assert.deepEqual(first.unresolvedGaps.map(item => item.id), second.unresolvedGaps.map(item => item.id));
  assert.ok(first.unresolvedGaps.every(item => item.sourceSyntax === 'skill-v1'));
});

test('adapter supports explicit legacy gap lines and de-duplicates mixed syntax', () => {
  const legacy = adaptKeywordMaterial(Buffer.from(
    '# Example guide 素材\n- 关键词: Example guide\n- 状态: BLOCKED\n- 缺口: Missing first-party source.\n'), options);
  assert.equal(legacy.unresolvedGaps[0].sourceSyntax, 'legacy-v1');

  const mixed = adaptKeywordMaterial(Buffer.from(
    '# Example guide 素材\n- 关键词: Example guide\n- 状态: PARTIAL\n- 缺口: Missing source.\n' +
    '### 待确认\n- Missing source.\n'), options);
  assert.equal(mixed.unresolvedGaps.length, 1);
  assert.equal(mixed.unresolvedGaps[0].sourceSyntax, 'mixed');
});

test('adapter rejects invalid completeness while inspection preserves the raw status', () => {
  const completed = Buffer.from(
    '# Example guide 素材\n- 关键词: Example guide\n- 状态: COMPLETED\n### 待确认\n- Core fact remains unknown.\n');
  const inspected = inspectKeywordMaterial(completed, options);
  assert.equal(inspected.status, 'COMPLETED');
  assert.equal(inspected.contractStatus, 'INVALID');
  assert.deepEqual(inspected.unresolvedGaps, []);
  assert.deepEqual(inspected.reviewNotes, []);
  assert.deepEqual(inspected.unclassifiedItems.map(item => item.description),
    ['Core fact remains unknown.']);
  assert.deepEqual(inspected.diagnostics, ['PENDING_SEMANTICS_UNCLASSIFIED']);
  assert.throws(() => adaptKeywordMaterial(completed, options), error =>
    error.code === 'CONTRACT_INCOMPATIBLE');

  assert.throws(() => adaptKeywordMaterial(Buffer.from(
    '# Example guide 素材\n- 关键词: Example guide\n- 状态: PARTIAL\n### 待确认\n- 无\n'), options), error =>
    error.code === 'CONTRACT_INCOMPATIBLE');
});

test('explicit legacy gaps remain blocking for COMPLETED and mixed syntax is not duplicated', () => {
  const inspected = inspectKeywordMaterial(Buffer.from(
    '# Example guide 素材\n- 关键词: Example guide\n- 状态: COMPLETED\n' +
    '- 缺口: Missing source.\n### 待确认\n- Missing source.\n- Needs semantic classification.\n'), options);
  assert.deepEqual(inspected.unresolvedGaps.map(item => [item.description, item.sourceSyntax]),
    [['Missing source.', 'mixed']]);
  assert.deepEqual(inspected.unclassifiedItems.map(item => item.description),
    ['Needs semantic classification.']);
  assert.deepEqual(inspected.diagnostics,
    ['COMPLETED_HAS_UNRESOLVED_GAPS', 'PENDING_SEMANTICS_UNCLASSIFIED']);
});

test('source digest and gap IDs change when source bytes change', () => {
  const first = adaptKeywordMaterial(Buffer.from(
    '# Example guide 素材\n- 关键词: Example guide\n- 状态: PARTIAL\n### 待确认\n- Missing fact.\n'), options);
  const second = adaptKeywordMaterial(Buffer.from(
    '# Example guide 素材\n- 关键词: Example guide\n- 状态: PARTIAL\n### 待确认\n- Missing fact!\n'), options);
  assert.notEqual(first.source.sha256, second.source.sha256);
  assert.notEqual(first.unresolvedGaps[0].id, second.unresolvedGaps[0].id);
});
