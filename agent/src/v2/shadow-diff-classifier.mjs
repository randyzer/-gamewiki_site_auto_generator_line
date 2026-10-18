import { ContractError } from '../contracts/errors.mjs';

const classes = new Set([
  'MATCH', 'EXPECTED_FORMAT_DIFFERENCE', 'LEGACY_DEFECT',
  'V2_DEFECT', 'V2_INCOMPATIBLE', 'UNKNOWN',
]);

export function classifyShadowDiff({ diffClass, fieldPath = '', safetyImpact = false }) {
  if (!classes.has(diffClass)) {
    throw new ContractError('SHADOW_DIFF_CLASS_UNKNOWN', `Unknown shadow diff class: ${String(diffClass)}`);
  }
  const derivedSafetyImpact = /\/(?:authority|evidence|status|approval|publication)/iu.test(fieldPath);
  const effectiveSafetyImpact = safetyImpact || derivedSafetyImpact;
  const blocking = diffClass === 'V2_DEFECT' || diffClass === 'V2_INCOMPATIBLE' ||
    diffClass === 'UNKNOWN' || (diffClass === 'LEGACY_DEFECT' && effectiveSafetyImpact);
  return Object.freeze({ diffClass, safetyImpact: effectiveSafetyImpact, blocking });
}
