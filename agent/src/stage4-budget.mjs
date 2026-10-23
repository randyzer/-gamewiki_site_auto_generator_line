export function stage4ExecutionBudget(value) {
  if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value) ||
      !Object.hasOwn(value, 'timeoutMs') ||
      Object.keys(value).some(key => key !== 'timeoutMs')))
    throw Error('STAGE4_BUDGET_INVALID');
  const timeoutMs = value?.timeoutMs ?? 1800000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 600000 || timeoutMs > 3600000)
    throw Error('STAGE4_BUDGET_INVALID');
  return { timeoutMs, configurationSource: value === undefined ? 'default' : 'run-inputs' };
}
