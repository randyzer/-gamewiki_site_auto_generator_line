export function compareEvidenceShadow({ legacyOutcome, v3Outcome }) {
  const legacyByKeyword = new Map((legacyOutcome.tasks ?? []).map(item => [item.keyword, item.classification]));
  return {
    authority: 'LEGACY', executionAllowed: false,
    classification: v3Outcome.tasks.every(item => item.classification === 'NO_PROGRESS') ?
      'V3_NO_TRUSTED_PROGRESS' : 'V3_SHADOW_DIFFERENCE',
    legacyClassifications: [...legacyByKeyword.values()].sort(),
    v3Classifications: v3Outcome.tasks.map(item => item.classification).sort(),
  };
}
