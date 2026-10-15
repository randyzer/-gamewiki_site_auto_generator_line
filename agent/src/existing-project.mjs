import { mkdir, readFile, writeFile, chmod, access, rename, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { safePath, inside, sha256 } from './files.mjs';
import { captureBaseline, verifyBaseline, sourceFiles } from './project-baseline.mjs';
import { randomUUID } from 'node:crypto';

export function targetEntry(targetId, allowlist) {
  const entry = allowlist?.targets?.[targetId];
  if (!entry || typeof entry.path !== 'string' || !entry.path.startsWith('/')) throw Error('Target not registered in allowlist');
  return entry;
}
export async function assertProjectIsolation(source, { workspace, runDirectory, candidateProjectPath } = {}) {
  const destinations = [workspace, runDirectory, candidateProjectPath].filter(Boolean);
  if (destinations.some(path => inside(source, path) || inside(path, source)) ||
    (runDirectory && candidateProjectPath && (inside(runDirectory, candidateProjectPath) || inside(candidateProjectPath, runDirectory))))
    throw Error('Source/workspace/candidate/run path overlap');
  for (const path of [source, ...destinations]) await safePath(resolve(path), [resolve(path)]);
}
async function exists(path) {
  try { await access(path); return true; } catch (error) { if (error.code !== 'ENOENT') throw error; return false; }
}
async function atomicJson(path, value) {
  const temporary = path + '.' + randomUUID() + '.tmp';
  try { await writeFile(temporary, JSON.stringify(value, null, 2), { flag: 'wx', mode: 0o600 }); await rename(temporary, path); }
  finally { await rm(temporary, { force: true }); }
}
export async function prepareExistingProject({ targetId, allowlist, runDirectory, candidateProjectPath, rawKeywordsFile }) {
  const entry = targetEntry(targetId, allowlist), source = resolve(entry.path), candidate = resolve(candidateProjectPath);
  await assertProjectIsolation(source, { runDirectory, candidateProjectPath: candidate });
  const marker = join(runDirectory, 'SNAPSHOT_PENDING.json'), baselineFile = join(runDirectory, 'BASELINE.json'), staging = candidate + '.snapshot';
  await assertProjectIsolation(source, { runDirectory, candidateProjectPath: staging });
  await safePath(marker, [runDirectory]); await safePath(baselineFile, [runDirectory]);
  if (await exists(baselineFile)) throw Error('Snapshot baseline already exists');
  let baseline, pending = false;
  try {
    const record = JSON.parse(await readFile(marker, 'utf8'));
    if (record.schemaVersion !== 1 || record.targetId !== targetId || record.candidateProjectPath !== candidate || record.baseline.keyword.path !== rawKeywordsFile)
      throw Error('Invalid pending snapshot');
    baseline = record.baseline; await verifyBaseline(baseline, entry); pending = true;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (await exists(candidate)) {
    if (!pending) throw Error('Candidate already exists');
    if (sha256(JSON.stringify(await sourceFiles(candidate, { rejectSecrets: true }))) !== baseline.sourceDigest) throw Error('Interrupted candidate changed; review required');
  } else {
    if (!pending && await exists(staging)) throw Error('Unowned snapshot directory already exists');
    baseline ??= await captureBaseline(entry, rawKeywordsFile);
    await mkdir(runDirectory, { recursive: true });
    await mkdir(dirname(candidate), { recursive: true });
    if (!pending) await atomicJson(marker, { schemaVersion: 1, targetId, candidateProjectPath: candidate, baseline });
    // Only a validated pending record authorizes replacing an incomplete staging copy.
    await rm(staging, { recursive: true, force: true }); await mkdir(staging);
    for (const file of baseline.files) {
      const from = join(source, file.path), to = join(staging, file.path);
      await safePath(from, [source]); await safePath(to, [staging]); await mkdir(dirname(to), { recursive: true });
      const bytes = await readFile(from);
      if (sha256(bytes) !== file.sha256) throw Error('Source changed during snapshot');
      await writeFile(to, bytes, { flag: 'wx', mode: file.mode }); await chmod(to, file.mode);
    }
    await verifyBaseline(baseline, entry);
    if (sha256(JSON.stringify(await sourceFiles(staging, { rejectSecrets: true }))) !== baseline.sourceDigest) throw Error('Incomplete candidate snapshot');
    await rename(staging, candidate);
  }
  await verifyBaseline(baseline, entry);
  await atomicJson(baselineFile, baseline); await rm(marker);
  return { baseline, sourceProjectPath: source, candidateProjectPath: candidate };
}
