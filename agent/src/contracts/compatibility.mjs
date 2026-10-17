import { inspectKeywordMaterial } from './adapters/keyword-skill-v1.mjs';

export function compareKeywordMaterialShadow(input, options) {
  const text = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
  const status = text.match(/^\s*- 状态:\s*(COMPLETED|PARTIAL|BLOCKED)\s*$/mu)?.[1] ?? null;
  const legacyGaps = [...text.matchAll(/^\s*- 缺口(?:\s*\d*)?:\s*(.+?)\s*$/gmu)];
  const v2 = inspectKeywordMaterial(input, options);
  if (v2.contractStatus !== 'VALID') return {
    classification: 'V2_INCOMPATIBLE', contract: 'KEYWORD_MATERIAL',
    legacyResult: status === 'COMPLETED' || legacyGaps.length ? `VALIDATED_${status}` : 'RESEARCH_HANDOFF_INVALID',
    v2Result: 'CONTRACT_INCOMPATIBLE', authority: 'LEGACY', executionAllowed: false,
  };
  if (status !== 'COMPLETED' && legacyGaps.length === 0 && v2.unresolvedGaps.length > 0) return {
    classification: 'LEGACY_DEFECT_EXPOSED', contract: 'KEYWORD_MATERIAL',
    legacyResult: 'RESEARCH_HANDOFF_INVALID', v2Result: `VALIDATED_${v2.status}`,
    authority: 'LEGACY', executionAllowed: false,
  };
  return {
    classification: 'MATCH', contract: 'KEYWORD_MATERIAL', legacyResult: `VALIDATED_${status}`,
    v2Result: `VALIDATED_${v2.status}`, authority: 'LEGACY', executionAllowed: false,
  };
}
