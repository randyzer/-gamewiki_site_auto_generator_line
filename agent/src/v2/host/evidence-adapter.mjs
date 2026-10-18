import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../../contracts/canonical-json.mjs';
import { adaptKeywordEvidenceClaimsV2 } from '../../contracts/adapters/keyword-evidence-v2.mjs';
import { assessEvidence } from '../../evidence/evidence-assessor.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');

export async function assessArchivedKeywordEvidence({ plan, legacyClaims, boundNativeRoot,
  observationStore, observationReferences = [], artifactReader, providers = {} }) {
  void providers;
  const adapted = adaptKeywordEvidenceClaimsV2(legacyClaims, { plan, boundNativeRoot });
  const outcome = await assessEvidence({ plan, claim: adapted.claim, observationStore,
    observationReferences, artifactReader, expectedEvidenceMode: 'SIMULATED' });
  return deepFreeze({ claim: adapted.claim, observationReferences: [...observationReferences], outcome,
    outcomeDigest: sha256(`AGENT_EVIDENCE_OUTCOME_V3\n${canonicalJson(outcome)}`) });
}
