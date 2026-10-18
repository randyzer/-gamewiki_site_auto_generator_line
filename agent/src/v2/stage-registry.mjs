import { ContractError } from '../contracts/errors.mjs';
import { coreStageIdentities, extensionStageIdentities, stageIdentityTable } from './stage-identity.mjs';

const byCanonicalId = new Map(stageIdentityTable.map(identity => [identity.canonicalStageId, identity]));

export const stageRegistry = Object.freeze({
  core: coreStageIdentities,
  extensions: extensionStageIdentities,
  get(canonicalStageId) {
    const identity = byCanonicalId.get(canonicalStageId);
    if (!identity) {
      throw new ContractError('STAGE_ID_UNKNOWN', `Unknown canonical stage ID: ${String(canonicalStageId)}`,
        { canonicalStageId });
    }
    return identity;
  },
  isCore(canonicalStageId) {
    return byCanonicalId.get(canonicalStageId)?.coreStage === true;
  },
  requireCore(canonicalStageId) {
    const identity = this.get(canonicalStageId);
    if (!identity.coreStage) {
      throw new ContractError('STAGE_NOT_CORE', `Stage is not part of the core pipeline: ${canonicalStageId}`,
        { canonicalStageId });
    }
    return identity;
  },
});
