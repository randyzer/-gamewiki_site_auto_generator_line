export function keywordResearchBudget(value) {
  if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !['timeoutMs', 'handoffMarginMs'].includes(key))))
    throw Error('KEYWORD_BUDGET_INVALID');
  const timeoutMs = value?.timeoutMs ?? 1800000;
  const handoffMarginMs = value?.handoffMarginMs ?? 180000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 60000 || timeoutMs > 3600000 ||
      !Number.isSafeInteger(handoffMarginMs) || handoffMarginMs < 30000 ||
      handoffMarginMs > 300000 || handoffMarginMs >= timeoutMs)
    throw Error('KEYWORD_BUDGET_INVALID');
  return { timeoutMs, handoffMarginMs, configurationSource: value === undefined ? 'default' : 'run-inputs' };
}
