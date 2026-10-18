export function compareHandoffShadow({ legacy, canonical }) {
  return Object.freeze({ mode: 'SHADOW', legacyStatus: legacy?.status ?? null,
    canonicalDigest: canonical.handoffDigest, authoritative: 'LEGACY' });
}
