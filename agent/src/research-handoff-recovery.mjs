import { join } from 'node:path';
import { parseArtifactJson, readArtifact, sha256 } from './files.mjs';
import { STAGE, STAGES, findStage } from './stages.mjs';

const FAILURE_OPERATION = 'save-stage-checkpoint';
const FAILURE_PREFIX = 'RESEARCH_HANDOFF_INVALID:';

export async function inspectResearchHandoffCheckpointRecovery({ manifest, runDirectory, runId }) {
  if (!manifest || manifest.runId !== runId || !Array.isArray(manifest.stages)) return null;
  const current = manifest.stages.find(stage => !['PASSED', 'SKIPPED'].includes(stage.status));
  const stage = findStage(manifest.stages, STAGE.KEYWORD_RESEARCH);
  const attempt = stage.checkpoint?.attempt;
  if (current !== stage || stage.status !== 'FAILED' || stage.checkpoint.researchHandoff ||
    stage.artifacts?.length !== 0 ||
    !Number.isSafeInteger(attempt) || attempt < 1 ||
    typeof manifest.inputs?.siteRevision !== 'string' || !manifest.inputs.siteRevision.trim() ||
    typeof manifest.inputs?.domain !== 'string' || !manifest.inputs.domain.trim() ||
    stage.diagnostic?.stage !== STAGE.KEYWORD_RESEARCH ||
    stage.diagnostic?.attempt !== attempt ||
    stage.diagnostic?.operation !== FAILURE_OPERATION ||
    !stage.diagnostic?.reason?.startsWith(FAILURE_PREFIX)) return null;

  const outputDirectory = join(runDirectory, 'artifacts', String(STAGES.indexOf(STAGE.KEYWORD_RESEARCH)),
    String(attempt));
  try {
    const workerResultPath = join(outputDirectory, 'native', 'worker-result.json');
    const recoveryPath = join(outputDirectory, 'keyword-recovery.json');
    const [workerBytes, recoveryBytes] = await Promise.all([
      readArtifact(workerResultPath, [outputDirectory]),
      readArtifact(recoveryPath, [outputDirectory]),
    ]);
    const workerResult = parseArtifactJson(workerBytes, workerResultPath);
    const recoveryRef = parseArtifactJson(recoveryBytes, recoveryPath);
    if (workerResult?.status !== 'PARTIAL' || !Array.isArray(workerResult.evidence) ||
      !Array.isArray(workerResult.missing_inputs) ||
      typeof recoveryRef?.manifestPath !== 'string' ||
      !/^[a-f0-9]{64}$/.test(recoveryRef?.sha256 ?? '') ||
      !Array.isArray(recoveryRef?.files) || recoveryRef.files.length === 0) return null;
    return { attempt, outputDirectory, workerResultPath, recoveryPath, recoveryRef,
      workerResultSha256: sha256(workerBytes), recoveryReferenceSha256: sha256(recoveryBytes) };
  } catch {
    return null;
  }
}
