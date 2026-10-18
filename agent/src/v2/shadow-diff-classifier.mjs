import { ContractError } from '../contracts/errors.mjs';

const classes = new Set([
  'MATCH', 'EXPECTED_FORMAT_DIFFERENCE', 'LEGACY_DEFECT',
  'V2_DEFECT', 'V2_INCOMPATIBLE', 'UNKNOWN',
]);

export function classifyShadowDiff({ diffClass, safetyImpact = false }) {
  if (!classes.has(diffClass)) {
    throw new ContractError('SHADOW_DIFF_CLASS_UNKNOWN', `Unknown shadow diff class: ${String(diffClass)}`);
  }
  const blocking = diffClass === 'V2_DEFECT' || diffClass === 'V2_INCOMPATIBLE' ||
    diffClass === 'UNKNOWN' || (diffClass === 'LEGACY_DEFECT' && safetyImpact);
  return Object.freeze({ diffClass, safetyImpact, blocking });
}
