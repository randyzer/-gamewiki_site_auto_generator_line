import { readFile } from 'node:fs/promises';
import { createStageCommitStore } from '../../src/state/stage-commit-store.mjs';

const [rootDirectory, candidateFile, stagingRoot] = process.argv.slice(2);
const candidate = JSON.parse(await readFile(candidateFile, 'utf8'));
try {
  const record = await createStageCommitStore({ rootDirectory }).commit(candidate, { stagingRoot });
  process.stdout.write(JSON.stringify({ ok: true, sequence: record.sequence }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, code: error.code }));
}
