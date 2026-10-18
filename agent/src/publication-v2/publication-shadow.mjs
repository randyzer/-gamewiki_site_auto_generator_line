export function comparePublicationShadow({ legacy, proof }) {
  return Object.freeze({ mode: 'SHADOW', authoritative: 'LEGACY', legacy: legacy ?? null,
    v2Status: proof.status, failures: [...proof.failures] });
}
