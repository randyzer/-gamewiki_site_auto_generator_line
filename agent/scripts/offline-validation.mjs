import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createOrchestrator, loadConfiguration } from '../src/orchestrator.mjs';
import { AGENT_ROOT } from '../src/skill-lock.mjs';
import { STAGE } from '../src/stages.mjs';
import { goodResult } from '../tests/helpers.mjs';

// Intentionally uses an offline fixture executor. This script never calls Codex or Feishu.
const id = 'offline-' + randomUUID();
const directory = join(AGENT_ROOT, 'runs', id);
const inputDirectory = join(AGENT_ROOT, 'workspaces', id);
await mkdir(inputDirectory, { recursive: true });
const rawKeywordsFile = join(inputDirectory, 'fixture-keywords.md');
await writeFile(rawKeywordsFile, '# SYNTHETIC OFFLINE VALIDATION ONLY\n- Offline fixture guide\n');
const inputs = { ...JSON.parse(await readFile(join(AGENT_ROOT, 'config/test-fixture.json'))), rawKeywordsFile };
const execute = createOrchestrator({ configuration: await loadConfiguration(), executor: goodResult });
const result = await execute({ id, inputs: JSON.stringify(inputs) });
if (result.status !== 'WAITING_FOR_USER' || result.stage !== STAGE.DEPLOYMENT_PLAN || !result.plan_digest || result.deployment_executed) throw Error('Offline deployment-plan gate failed');
await writeFile(join(directory, 'OFFLINE_VALIDATION.json'), JSON.stringify({ kind: 'OFFLINE_FIXTURE_ONLY', realSkillExecution: false,
  realFeishuDelivery: false, ...result }, null, 2));
console.log(JSON.stringify({ run_id: id, evidence: directory, stage: result.stage, status: result.status, productionActions: false }));
