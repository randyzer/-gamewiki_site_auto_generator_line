import { createHash } from 'node:crypto';
import { ContractError } from '../errors.mjs';
import { canonicalJson } from '../canonical-json.mjs';
import { validateContract } from '../registry.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const meaningful = value => !/^无(?:[。.])?$/u.test(value.trim());
const clean = value => value.trim().replace(/\s+/gu, ' ').normalize('NFC');

function uniqueMetadata(text, label, pattern) {
  const matches = [...text.matchAll(pattern)].map(match => clean(match[1]));
  if (matches.length !== 1) throw new ContractError('CONTRACT_INCOMPATIBLE',
    `Expected exactly one ${label} field`, { pointer: `/${label}` });
  return matches[0];
}

function pendingItems(lines) {
  const heading = lines.findIndex(line => line.trim() === '### 待确认');
  if (heading < 0) return [];
  const result = [];
  for (let index = heading + 1; index < lines.length && !/^#{2,3}\s/u.test(lines[index]); index += 1) {
    const item = lines[index].match(/^\s*[-*]\s+(.+?)\s*$/u)?.[1];
    if (item && meaningful(item)) result.push(clean(item));
  }
  return result;
}

function legacyItems(text) {
  return [...text.matchAll(/^\s*- 缺口(?:\s*\d*)?:\s*(.+?)\s*$/gmu)]
    .map(match => clean(match[1])).filter(meaningful);
}

export function inspectKeywordMaterial(input, options) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const text = bytes.toString('utf8');
  if (text.includes('\uFFFD')) throw new ContractError('CONTRACT_INCOMPATIBLE', 'Material is not valid UTF-8');
  const keyword = uniqueMetadata(text, 'keyword', /^\s*- 关键词:\s*(.+?)\s*$/gmu);
  const status = uniqueMetadata(text, 'status', /^\s*- 状态:\s*(COMPLETED|PARTIAL|BLOCKED)\s*$/gmu);
  const skill = pendingItems(text.split(/\r?\n/u)), legacy = legacyItems(text);
  const gapSources = new Map(), unclassified = new Set();
  for (const description of legacy) {
    if (!gapSources.has(description)) gapSources.set(description, new Set());
    gapSources.get(description).add('legacy-v1');
  }
  for (const description of skill) {
    if (status === 'COMPLETED' && !gapSources.has(description)) unclassified.add(description);
    else {
      if (!gapSources.has(description)) gapSources.set(description, new Set());
      gapSources.get(description).add('skill-v1');
    }
  }
  const sourceSha256 = sha256(bytes);
  const unresolvedGaps = [...gapSources.entries()].map(([description, sources]) => ({
    id: `gap-${sha256(canonicalJson({ keyword, description, sourceSha256 })).slice(0, 24)}`,
    description,
    sourceSyntax: sources.size === 2 ? 'mixed' : [...sources][0],
  }));
  const unclassifiedItems = [...unclassified].map(description => ({
    id: `pending-${sha256(canonicalJson({ keyword, description, sourceSha256 })).slice(0, 24)}`,
    description, sourceSyntax: 'skill-v1',
  }));
  const diagnostics = [];
  if (status === 'COMPLETED' && unresolvedGaps.length) diagnostics.push('COMPLETED_HAS_UNRESOLVED_GAPS');
  if (status === 'COMPLETED' && unclassifiedItems.length) diagnostics.push('PENDING_SEMANTICS_UNCLASSIFIED');
  if (status !== 'COMPLETED' && !unresolvedGaps.length) diagnostics.push('INCOMPLETE_STATUS_WITHOUT_GAPS');
  const result = {
    kind: 'KEYWORD_MATERIAL', schemaVersion: 1, producer: 'ADAPTER', keyword, status,
    contractStatus: diagnostics.length ? 'INVALID' : 'VALID', unresolvedGaps, reviewNotes: [],
    unclassifiedItems,
    source: { path: options?.sourcePath, sha256: sourceSha256, adapter: 'keyword-skill-v1',
      skillContractSha256: options?.skillContractSha256 },
    diagnostics,
  };
  return validateContract('KEYWORD_MATERIAL', 1, result);
}

export function adaptKeywordMaterial(input, options) {
  const result = inspectKeywordMaterial(input, options);
  if (result.contractStatus !== 'VALID') throw new ContractError('CONTRACT_INCOMPATIBLE',
    `Keyword material is incompatible: ${result.diagnostics.join(', ')}`,
    { kind: result.kind, schemaVersion: result.schemaVersion, diagnostics: result.diagnostics });
  return result;
}
