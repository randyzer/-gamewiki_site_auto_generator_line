import { ContractError } from '../contracts/errors.mjs';
import { createStageCommitCandidate } from './stage-commit-candidate.mjs';
import { createStageCommitStore } from './stage-commit-store.mjs';
import { recoverStage } from './stage-recovery.mjs';

export async function runStage2StateShadow({ shadowRoot, candidateInput, regression = null }) {
  if (candidateInput.stageId !== 'stage-2' || candidateInput.mode !== 'SHADOW')
    throw new ContractError('POLICY_DENIED', 'P3 Shadow runner is limited to Stage 2');
  const candidate = await createStageCommitCandidate(candidateInput);
  await createStageCommitStore({ rootDirectory: shadowRoot }).commit(candidate,
    { stagingRoot: candidateInput.stagingRoot });
  const recovered = await recoverStage({ rootDirectory: shadowRoot, repairProjections: true });
  return Object.freeze({ checkpoint: recovered.checkpoint, projection: recovered.projection,
    regression: regression ? structuredClone(regression) : null });
}
