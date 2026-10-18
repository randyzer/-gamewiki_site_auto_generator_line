import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import {
  homepageReplayPayloadDigest,
  inspectFaviconArchive,
  replayHomepageResearch,
} from '../../src/v2/adapters/homepage-research.mjs';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const fixtureRoot = join(repoRoot, 'agent/tests/fixtures/v2/homepage');
const sha = value => value.repeat(64);

async function fixture() {
  const fixtureManifest = JSON.parse(await readFile(join(fixtureRoot, 'fixture-manifest.json'), 'utf8'));
  const sourceFiles = new Map();
  const derivedFiles = new Map();
  for (const item of fixtureManifest.sources) {
    sourceFiles.set(item.sourceRelativePath, await readFile(join(repoRoot, item.sourceRelativePath)));
    if (item.derivedPath) derivedFiles.set(item.derivedPath, await readFile(join(fixtureRoot, item.derivedPath)));
  }
  const zipBytes = sourceFiles.get(fixtureManifest.iconArchive.sourceRelativePath);
  return { fixtureManifest, sourceFiles, derivedFiles, zipBytes };
}

function adapterInput(payloadDigest, overrides = {}) {
  return {
    kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE',
    runId: 'wallpaper-engine-002', canonicalStageId: 'homepage-research',
    mappingVersion: 'stage-identity-v1', contextDigest: sha('a'), featureGate: 'shadow',
    gateBindingDigest: sha('b'), payloadDigest, ...overrides,
  };
}

test('real-format homepage replay binds redacted lineage and validates the original favicon archive', async () => {
  const payload = await fixture();
  const payloadDigest = homepageReplayPayloadDigest(payload);
  const replay = replayHomepageResearch({ ...payload, adapterInput: adapterInput(payloadDigest) });

  assert.equal(payload.fixtureManifest.classification, 'REAL_FORMAT_REDACTED');
  assert.equal(payload.fixtureManifest.licenseStatus, 'UNKNOWN');
  assert.equal(payload.fixtureManifest.iconArchive.distribution, 'METADATA_ONLY');
  assert.equal(replay.stageResult.status, 'COMPLETED');
  assert.equal(replay.stageResult.authoritative, false);
  assert.deepEqual(replay.stageResult.errorCodes, ['ICON_LICENSE_UNKNOWN']);
  assert.equal(replay.sourceIdentity.canonicalStageId, 'homepage-research');
  assert.equal(replay.sourceIdentity.originalValue, 'stage-1');
  assert.equal(replay.archive.members.length, 7);
  assert.deepEqual(replay.archive.members, payload.fixtureManifest.iconArchive.members);
});

test('homepage replay fails closed on source, derived, archive, identity and license drift', async () => {
  const payload = await fixture();
  const validInput = adapterInput(homepageReplayPayloadDigest(payload));
  const firstSource = payload.fixtureManifest.sources[0].sourceRelativePath;
  const changedSourceFiles = new Map(payload.sourceFiles);
  changedSourceFiles.set(firstSource, Buffer.from('tampered'));
  assert.throws(() => replayHomepageResearch({ ...payload, sourceFiles: changedSourceFiles,
    adapterInput: adapterInput(homepageReplayPayloadDigest({ ...payload, sourceFiles: changedSourceFiles })) }),
  error => error.code === 'CONTRACT_DIGEST_MISMATCH');

  const firstDerived = payload.fixtureManifest.sources.find(item => item.derivedPath).derivedPath;
  const changedDerivedFiles = new Map(payload.derivedFiles);
  changedDerivedFiles.set(firstDerived, Buffer.from('tampered'));
  assert.throws(() => replayHomepageResearch({ ...payload, derivedFiles: changedDerivedFiles,
    adapterInput: adapterInput(homepageReplayPayloadDigest({ ...payload, derivedFiles: changedDerivedFiles })) }),
  error => error.code === 'CONTRACT_DIGEST_MISMATCH');

  const changedZip = Buffer.from(payload.zipBytes);
  changedZip[100] ^= 1;
  assert.throws(() => replayHomepageResearch({ ...payload, zipBytes: changedZip,
    adapterInput: adapterInput(homepageReplayPayloadDigest({ ...payload, zipBytes: changedZip })) }),
  error => ['CONTRACT_DIGEST_MISMATCH', 'ARCHIVE_CRC_MISMATCH'].includes(error.code));

  assert.throws(() => replayHomepageResearch({ ...payload, adapterInput: { ...validInput,
    canonicalStageId: 'template-selection' } }), error => error.code === 'CONTRACT_BINDING_MISMATCH');
  assert.throws(() => replayHomepageResearch({ ...payload,
    fixtureManifest: { ...payload.fixtureManifest, licenseStatus: 'INDEPENDENTLY_VERIFIED' },
    adapterInput: validInput }), error => error.code === 'CONTRACT_SCHEMA_INVALID');
});

test('favicon parser rejects traversal and duplicate members before replay', () => {
  const archive = makeStoredZip([
    ['../escape.png', Buffer.from('x')],
  ]);
  assert.throws(() => inspectFaviconArchive(archive), error => error.code === 'ARCHIVE_PATH_INVALID');
  const duplicate = makeStoredZip([
    ['favicon.ico', Buffer.from([0, 0, 1, 0, 1, 0])],
    ['favicon.ico', Buffer.from([0, 0, 1, 0, 1, 0])],
  ]);
  assert.throws(() => inspectFaviconArchive(duplicate), error => error.code === 'ARCHIVE_MEMBER_DUPLICATE');
});

test('favicon parser bounds actual inflate output and rejects Zip64 version markers', () => {
  const expanded = Buffer.alloc(2097153, 0x61);
  const forgedSize = makeSingleZip({ name: 'favicon.ico', content: expanded,
    compressed: deflateRawSync(expanded), method: 8, declaredUncompressedSize: 1 });
  assert.throws(() => inspectFaviconArchive(forgedSize), error => error.code === 'ARCHIVE_SIZE_INVALID');

  const zip64 = makeSingleZip({ name: 'favicon.ico', content: Buffer.from([0, 0, 1, 0, 1, 0]),
    versionNeeded: 45 });
  assert.throws(() => inspectFaviconArchive(zip64), error => error.code === 'ARCHIVE_FORMAT_INVALID');
});

test('homepage offline policy rejects every real capability before effects run', async () => {
  const payload = await fixture();
  let effects = 0;
  for (const capability of ['BROWSER', 'GIT_WRITE', 'FILE_COPY', 'WORKER', 'NETWORK', 'SERVICE_RESUME',
    'DEPLOYMENT', 'AUTHORITY_SWITCH']) {
    assert.throws(() => replayHomepageResearch({ ...payload,
      adapterInput: adapterInput(homepageReplayPayloadDigest(payload)), requestedCapabilities: [capability],
      effects: { execute: () => { effects += 1; } } }), error => error.code === 'POLICY_DENIED');
  }
  assert.equal(effects, 0);
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeStoredZip(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const nameBytes = Buffer.from(name), crc = crc32(content);
    const local = Buffer.alloc(30 + nameBytes.length + content.length);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18); local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBytes.length, 26); nameBytes.copy(local, 30); content.copy(local, 30 + nameBytes.length);
    locals.push(local);
    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24); central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42); nameBytes.copy(central, 46); centrals.push(central); offset += local.length;
  }
  const centralBytes = Buffer.concat(centrals), localBytes = Buffer.concat(locals), eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBytes.length, 12); eocd.writeUInt32LE(localBytes.length, 16);
  return Buffer.concat([localBytes, centralBytes, eocd]);
}

function makeSingleZip({ name, content, compressed = content, method = 0,
  declaredUncompressedSize = content.length, versionNeeded = 20 }) {
  const nameBytes = Buffer.from(name), checksum = crc32(content);
  const local = Buffer.alloc(30 + nameBytes.length + compressed.length);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(versionNeeded, 4);
  local.writeUInt16LE(method, 8); local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(declaredUncompressedSize, 22);
  local.writeUInt16LE(nameBytes.length, 26); nameBytes.copy(local, 30);
  compressed.copy(local, 30 + nameBytes.length);
  const central = Buffer.alloc(46 + nameBytes.length);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4);
  central.writeUInt16LE(versionNeeded, 6); central.writeUInt16LE(method, 10);
  central.writeUInt32LE(checksum, 16); central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(declaredUncompressedSize, 24); central.writeUInt16LE(nameBytes.length, 28);
  nameBytes.copy(central, 46);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length, 12); eocd.writeUInt32LE(local.length, 16);
  return Buffer.concat([local, central, eocd]);
}
