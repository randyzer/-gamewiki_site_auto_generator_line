import { mkdir, writeFile, readdir, lstat, rename, rm, open, unlink } from 'node:fs/promises';
import { join, dirname, basename, relative, resolve, isAbsolute, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { isDeepStrictEqual } from 'node:util';
import { readArtifact, safePath, sha256, parseArtifactJson } from './files.mjs';
import { STAGE } from './stages.mjs';

const KIND = 'HOST_KEYWORD_RECOVERY_V1';
const MAX_FILES = 1000, MAX_BYTES = 128 * 1024 * 1024;
const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
const assert = (condition, detail) => { if (!condition) throw Error('KEYWORD_RECOVERY_INVALID: ' + detail); };
const dataPath = path => typeof path === 'string' && path.length > 0 && path.length < 1024 &&
  !isAbsolute(path) && !/[\\\x00-\x1f\x7f]/.test(path) &&
  path.split('/').every(part => part && part !== '.' && part !== '..' && !part.startsWith('.')) &&
  ['.md', '.json', '.txt', '.vtt', '.srt'].includes(extname(path).toLowerCase()) &&
  !['worker-result.json', 'integrity-manifest.json'].includes(basename(path));

function scope(context) {
  const runDirectory = context.runDirectory ?? dirname(dirname(dirname(context.outputDirectory)));
  const attempt = Number(basename(context.outputDirectory));
  assert(isAbsolute(runDirectory) && resolve(runDirectory) === runDirectory &&
    /^[a-zA-Z0-9_-]{1,100}$/.test(context.runId ?? '') && basename(runDirectory) === context.runId &&
    Number.isSafeInteger(attempt) && attempt > 0 &&
    context.outputDirectory === join(runDirectory, 'artifacts/1', String(attempt)) &&
    (!context.nativeDirectory || context.nativeDirectory === join(context.outputDirectory, 'native')), 'attempt scope');
  return { runDirectory, attempt, nativeDirectory: join(context.outputDirectory, 'native') };
}

async function binding(context) {
  const rawKeywordsSha256 = sha256(await readArtifact(context.inputs.rawKeywordsFile, [context.inputs.rawKeywordsFile]));
  const skillSha256 = sha256(await readArtifact(context.skillLock.source, [context.skillLock.source]));
  assert(!context.skillLock.sha256 || context.skillLock.sha256 === skillSha256, 'Skill changed');
  assert(!context.checkpoint?.keywordSha256 || context.checkpoint.keywordSha256 === rawKeywordsSha256, 'raw input changed');
  return { runId: context.runId, gameIdentity: context.inputs.gameIdentity, stage: STAGE.KEYWORD_RESEARCH,
    rawKeywordsSha256, lineageSha256: context.inputs.keywordSourceLineageFile
      ? sha256(await readArtifact(context.inputs.keywordSourceLineageFile, [context.inputs.keywordSourceLineageFile])) : null,
    skillSha256, skillVersion: context.skillLock.version ?? null };
}

// Unlike the general tree helper, inspect every entry: hidden or ignored files cannot evade the inventory check.
async function inventory(root) {
  const files = []; let entries = 0;
  async function walk(directory, depth = 0) {
    assert(depth <= 12, 'directory depth limit');
    await safePath(directory, [root]);
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      assert(++entries <= MAX_FILES, 'file count limit');
      const path = join(directory, entry.name);
      await safePath(path, [root]);
      if (entry.isDirectory()) await walk(path, depth + 1);
      else { assert(entry.isFile(), 'non-regular file'); files.push(path); }
    }
  }
  await walk(root); return files;
}

/** Called only after a worker stops, or under the stopped-run lock. No worker-authored code is executed. */
export async function captureKeywordRecovery(context, { reason = 'WORKER_STOPPED' } = {}) {
  const { runDirectory, attempt, nativeDirectory } = scope(context);
  assert(/^[A-Z_]{1,64}$/.test(reason), 'stop reason');
  const identity = await binding(context), data = []; let total = 0;
  for (const file of await inventory(nativeDirectory)) {
    const path = relative(nativeDirectory, file), info = await lstat(file);
    if (!dataPath(path) || info.size === 0 || (info.mode & 0o111)) continue;
    const bytes = await readArtifact(file, [nativeDirectory]);
    assert((total += bytes.length) <= MAX_BYTES, 'total size limit');
    data.push({ path, content: bytes, bytes: bytes.length, sha256: sha256(bytes), sourceMtime: info.mtime.toISOString() });
  }
  if (!data.length) return null;
  assert(isDeepStrictEqual(identity, await binding(context)), 'inputs changed during capture');
  const parent = join(runDirectory, 'keyword-recovery', String(attempt));
  const id = randomUUID(), directory = join(parent, id), staging = join(parent, '.' + id);
  await safePath(staging, [runDirectory]); await mkdir(parent, { recursive: true, mode: 0o700 });
  await mkdir(staging, { mode: 0o700 });
  try {
    for (const file of data) {
      const target = join(staging, 'data', file.path);
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, file.content, { flag: 'wx', mode: 0o400 });
    }
    const manifest = { kind: KIND, binding: identity, sourceAttempt: attempt, reason,
      capturedAt: new Date().toISOString(), countsAsStageArtifact: false,
      contentValidated: false, files: data.map(({ content, ...file }) => file) };
    const bytes = JSON.stringify(manifest, null, 2) + '\n';
    await writeFile(join(staging, 'manifest.json'), bytes, { flag: 'wx', mode: 0o400 });
    await safePath(directory, [runDirectory]); await rename(staging, directory);
    return { manifestPath: join(directory, 'manifest.json'), sha256: sha256(bytes), files: data.map(file => file.path) };
  } finally { await rm(staging, { recursive: true, force: true }); }
}

export async function verifyKeywordRecovery(context, ref) {
  const { runDirectory, attempt } = scope(context);
  assert(ref && Object.keys(ref).sort().join(',') === 'files,manifestPath,sha256' && digest(ref.sha256), 'reference');
  const rel = typeof ref.manifestPath === 'string' ? relative(join(runDirectory, 'keyword-recovery'), ref.manifestPath) : '';
  assert(/^\d+\/[a-f0-9-]{36}\/manifest\.json$/.test(rel) &&
    ref.manifestPath === join(runDirectory, 'keyword-recovery', rel), 'snapshot path');
  const bytes = await readArtifact(ref.manifestPath, [join(runDirectory, 'keyword-recovery')]);
  assert(sha256(bytes) === ref.sha256, 'manifest digest changed');
  const manifest = parseArtifactJson(bytes, ref.manifestPath), directory = dirname(ref.manifestPath);
  assert(manifest.kind === KIND && manifest.countsAsStageArtifact === false && manifest.contentValidated === false &&
    isDeepStrictEqual(manifest.binding, await binding(context)) &&
    Number.isSafeInteger(manifest.sourceAttempt) && manifest.sourceAttempt > 0 && manifest.sourceAttempt < attempt &&
    String(manifest.sourceAttempt) === rel.split('/')[0] &&
    Number.isFinite(Date.parse(manifest.capturedAt)), 'binding or source attempt');
  assert(Array.isArray(manifest.files) && manifest.files.length > 0 && manifest.files.length <= MAX_FILES, 'file inventory');
  const names = new Set(); let total = 0;
  for (const file of manifest.files) {
    assert(dataPath(file.path) && !names.has(file.path) && digest(file.sha256) &&
      Number.isSafeInteger(file.bytes) && file.bytes > 0 && file.bytes <= 32 * 1024 * 1024, 'file descriptor');
    names.add(file.path);
    const content = await readArtifact(join(directory, 'data', file.path), [join(directory, 'data')]);
    assert(content.length === file.bytes && sha256(content) === file.sha256, 'file digest changed');
    assert((total += content.length) <= MAX_BYTES, 'total size limit');
  }
  const actual = (await inventory(join(directory, 'data'))).map(path => relative(join(directory, 'data'), path));
  assert(actual.length === names.size && actual.every(path => names.has(path)), 'unlisted or missing data');
  assert((await readdir(directory)).sort().join(',') === 'data,manifest.json', 'unexpected snapshot entry');
  assert(Array.isArray(ref.files) && ref.files.length > 0 && new Set(ref.files).size === ref.files.length &&
    ref.files.every(path => names.has(path)), 'explicit file selection');
  const historicalServiceStops = [];
  if (names.has('SERVICE_BLOCKERS.json')) {
    assert(ref.files.includes('SERVICE_BLOCKERS.json'), 'SERVICE_BLOCKERS.json must be selected with recovered evidence');
    const blockerPath = join(directory, 'data', 'SERVICE_BLOCKERS.json');
    const blockers = parseArtifactJson(await readArtifact(blockerPath, [join(directory, 'data')]), blockerPath);
    assert(blockers && !Array.isArray(blockers) && Array.isArray(blockers.stops), 'SERVICE_BLOCKERS.json structure');
    for (const stop of blockers.stops) {
      assert(stop && typeof stop === 'object' && !Array.isArray(stop) &&
        typeof stop.provider === 'string' && typeof stop.operation === 'string' && typeof stop.reason === 'string',
      'SERVICE_BLOCKERS.json stop');
      if (!/\b429\b/.test(stop.reason)) continue;
      if (stop.provider === 'youtube' && stop.operation === 'youtube-subs') historicalServiceStops.push('youtube-subtitles');
      if (stop.provider === 'steamcommunity.com') historicalServiceStops.push('steam-community');
    }
  }
  return { directory, manifestPath: ref.manifestPath, sha256: ref.sha256, sourceAttempt: manifest.sourceAttempt,
    countsAsStageArtifact: false, files: manifest.files.filter(file => ref.files.includes(file.path)),
    historicalServiceStops: [...new Set(historicalServiceStops)].sort() };
}

/** Offline operator utility: locks the same run as the pipeline, with no manifest mutation or worker launch. */
export async function captureStoppedKeywordAttempt(runDirectory, attempt) {
  await safePath(runDirectory, [runDirectory]);
  const lockPath = join(runDirectory, '.lock'); await safePath(lockPath, [runDirectory]);
  const lock = await open(lockPath, 'wx', 0o600);
  try {
    await lock.writeFile(JSON.stringify({ runId: basename(runDirectory), pid: process.pid, host: hostname(), acquiredAt: new Date().toISOString() }));
    const path = join(runDirectory, 'manifest.json');
    const manifest = parseArtifactJson(await readArtifact(path, [runDirectory]), path);
    const stage = manifest.stages.find(stage => stage.skill === STAGE.KEYWORD_RESEARCH);
    assert(stage && ['FAILED', 'BLOCKED', 'PARTIAL', 'WAITING_FOR_USER'].includes(stage.status) &&
      stage.checkpoint.attempt === attempt, 'select the current stopped attempt');
    return await captureKeywordRecovery({ runId: manifest.runId, runDirectory,
      outputDirectory: join(runDirectory, 'artifacts/1', String(attempt)), inputs: manifest.inputs,
      checkpoint: stage.checkpoint, skillLock: manifest.lock.skills.find(skill => skill.name === STAGE.KEYWORD_RESEARCH) },
    { reason: 'STOPPED_ATTEMPT' });
  } finally { await lock.close(); await unlink(lockPath); }
}
