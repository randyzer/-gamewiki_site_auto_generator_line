import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { canonicalJson, deepFreeze } from '../../contracts/canonical-json.mjs';
import { ContractError } from '../../contracts/errors.mjs';
import { validateContract } from '../../contracts/registry.mjs';
import { validateStageAdapterInput, validateStageAdapterResult } from '../stage-adapter-contract.mjs';
import { resolveStageIdentity } from '../stage-identity.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };
const maxArchiveBytes = 8388608;
const maxMemberBytes = 2097152;
const expectedMembers = Object.freeze([
  'android-chrome-192x192.png', 'android-chrome-512x512.png', 'apple-touch-icon.png',
  'favicon-16x16.png', 'favicon-32x32.png', 'favicon.ico', 'site.webmanifest',
]);

function bytesFor(collection, path) {
  const bytes = collection instanceof Map ? collection.get(path) : collection?.[path];
  if (bytes === undefined) fail('CONTRACT_BINDING_MISMATCH', `Missing offline fixture bytes: ${path}`);
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

function assertSafeRelativePath(path, code = 'CONTRACT_BINDING_MISMATCH') {
  if (typeof path !== 'string' || !path || path.includes('\\') || path.includes('\0') || path.startsWith('/') ||
      path.split('/').some(part => !part || part === '.' || part === '..')) fail(code, `Unsafe relative path: ${path}`);
  return path;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function findEocd(bytes) {
  const minimum = Math.max(0, bytes.length - 65557);
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  fail('ARCHIVE_FORMAT_INVALID', 'ZIP end-of-central-directory record is missing');
}

function memberFormat(path, content) {
  if (path.endsWith('.png')) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (content.length < 24 || !content.subarray(0, 8).equals(signature) || content.toString('ascii', 12, 16) !== 'IHDR')
      fail('ARCHIVE_FORMAT_INVALID', `Invalid PNG member: ${path}`);
    return { format: 'PNG', width: content.readUInt32BE(16), height: content.readUInt32BE(20) };
  }
  if (path === 'favicon.ico') {
    if (content.length < 6 || content.readUInt16LE(0) !== 0 || content.readUInt16LE(2) !== 1 ||
        content.readUInt16LE(4) < 1) fail('ARCHIVE_FORMAT_INVALID', 'Invalid favicon.ico member');
    return { format: 'ICO' };
  }
  if (path === 'site.webmanifest') {
    let manifest;
    try { manifest = JSON.parse(content.toString('utf8')); } catch { fail('ARCHIVE_FORMAT_INVALID', 'Invalid site.webmanifest JSON'); }
    if (!Array.isArray(manifest.icons) || manifest.icons.length < 1)
      fail('ARCHIVE_FORMAT_INVALID', 'site.webmanifest has no icons');
    return { format: 'WEBMANIFEST' };
  }
  fail('ARCHIVE_MEMBER_UNEXPECTED', `Unexpected favicon member: ${path}`);
}

export function inspectFaviconArchive(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (bytes.length > maxArchiveBytes) fail('ARCHIVE_SIZE_INVALID', 'Favicon archive exceeds the offline size limit');
  const eocd = findEocd(bytes);
  const disk = bytes.readUInt16LE(eocd + 4), centralDisk = bytes.readUInt16LE(eocd + 6);
  const diskEntries = bytes.readUInt16LE(eocd + 8), totalEntries = bytes.readUInt16LE(eocd + 10);
  const centralSize = bytes.readUInt32LE(eocd + 12), centralOffset = bytes.readUInt32LE(eocd + 16);
  const commentLength = bytes.readUInt16LE(eocd + 20);
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries || totalEntries > 32 ||
      eocd + 22 + commentLength !== bytes.length || centralOffset + centralSize !== eocd)
    fail('ARCHIVE_FORMAT_INVALID', 'Unsupported or inconsistent ZIP directory');
  const members = [], names = new Set();
  let cursor = centralOffset, totalUncompressed = 0;
  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > eocd || bytes.readUInt32LE(cursor) !== 0x02014b50)
      fail('ARCHIVE_FORMAT_INVALID', 'Invalid ZIP central-directory entry');
    const versionNeeded = bytes.readUInt16LE(cursor + 6);
    const flags = bytes.readUInt16LE(cursor + 8), method = bytes.readUInt16LE(cursor + 10);
    const expectedCrc = bytes.readUInt32LE(cursor + 16), compressedSize = bytes.readUInt32LE(cursor + 20);
    const uncompressedSize = bytes.readUInt32LE(cursor + 24), nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30), memberComment = bytes.readUInt16LE(cursor + 32);
    const diskStart = bytes.readUInt16LE(cursor + 34), localOffset = bytes.readUInt32LE(cursor + 42);
    const path = bytes.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    assertSafeRelativePath(path, 'ARCHIVE_PATH_INVALID');
    if (names.has(path)) fail('ARCHIVE_MEMBER_DUPLICATE', `Duplicate ZIP member: ${path}`);
    names.add(path);
    if (versionNeeded > 20 || diskStart !== 0 || extraLength !== 0 ||
        [compressedSize, uncompressedSize, localOffset].includes(0xffffffff))
      fail('ARCHIVE_FORMAT_INVALID', `Zip64 or unsupported ZIP extension: ${path}`);
    if ((flags & 1) !== 0 || (flags & 8) !== 0 || ![0, 8].includes(method))
      fail('ARCHIVE_FORMAT_INVALID', `Unsupported ZIP flags or compression: ${path}`);
    if (compressedSize > maxMemberBytes || uncompressedSize > maxMemberBytes ||
        (totalUncompressed += uncompressedSize) > maxArchiveBytes)
      fail('ARCHIVE_SIZE_INVALID', `ZIP member exceeds the offline size limit: ${path}`);
    if (localOffset + 30 > centralOffset || bytes.readUInt32LE(localOffset) !== 0x04034b50)
      fail('ARCHIVE_FORMAT_INVALID', `Invalid ZIP local header: ${path}`);
    const localVersionNeeded = bytes.readUInt16LE(localOffset + 4);
    const localFlags = bytes.readUInt16LE(localOffset + 6), localMethod = bytes.readUInt16LE(localOffset + 8);
    const localCrc = bytes.readUInt32LE(localOffset + 14), localCompressed = bytes.readUInt32LE(localOffset + 18);
    const localUncompressed = bytes.readUInt32LE(localOffset + 22), localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const localName = bytes.toString('utf8', localOffset + 30, localOffset + 30 + localNameLength);
    if (localVersionNeeded !== versionNeeded || localExtraLength !== 0 || localFlags !== flags ||
        localMethod !== method || localCrc !== expectedCrc ||
        localCompressed !== compressedSize || localUncompressed !== uncompressedSize || localName !== path)
      fail('ARCHIVE_HEADER_MISMATCH', `ZIP headers disagree: ${path}`);
    const start = localOffset + 30 + localNameLength + localExtraLength, end = start + compressedSize;
    if (end > centralOffset) fail('ARCHIVE_FORMAT_INVALID', `ZIP member exceeds data bounds: ${path}`);
    const compressed = bytes.subarray(start, end);
    let content;
    try {
      content = method === 0 ? compressed : inflateRawSync(compressed,
        { maxOutputLength: Math.max(1, Math.min(uncompressedSize, maxMemberBytes)) });
    } catch (error) {
      if (error?.code === 'ERR_BUFFER_TOO_LARGE')
        fail('ARCHIVE_SIZE_INVALID', `ZIP member expands beyond its declared limit: ${path}`);
      fail('ARCHIVE_FORMAT_INVALID', `ZIP member cannot be decompressed: ${path}`);
    }
    if (content.length !== uncompressedSize || crc32(content) !== expectedCrc)
      fail('ARCHIVE_CRC_MISMATCH', `ZIP CRC or size mismatch: ${path}`);
    members.push({ path, crc32: expectedCrc.toString(16).padStart(8, '0'), compressedSize,
      uncompressedSize, compressionMethod: method, contentSha256: sha256(content), ...memberFormat(path, content) });
    cursor += 46 + nameLength + extraLength + memberComment;
  }
  if (cursor !== eocd || canonicalJson([...names].sort()) !== canonicalJson(expectedMembers))
    fail('ARCHIVE_MEMBER_UNEXPECTED', 'Favicon archive must contain exactly the seven required members');
  return deepFreeze({ archiveSha256: sha256(bytes), archiveBytes: bytes.length,
    members: members.sort((left, right) => left.path.localeCompare(right.path)) });
}

function assertPolicy(requestedCapabilities = []) {
  if (!Array.isArray(requestedCapabilities)) fail('POLICY_DENIED', 'Offline capability requests must be an array');
  if (requestedCapabilities.length) fail('POLICY_DENIED', `P5-D homepage adapter denies ${requestedCapabilities[0]}`);
}

export function homepageReplayPayloadDigest({ fixtureManifest, sourceFiles, derivedFiles, zipBytes }) {
  return digest('AGENT_HOMEPAGE_REPLAY_PAYLOAD_V1', {
    fixtureManifest,
    sources: fixtureManifest.sources.map(item => ({ path: item.sourceRelativePath,
      sha256: sha256(bytesFor(sourceFiles, item.sourceRelativePath)) })),
    derived: fixtureManifest.sources.filter(item => item.derivedPath).map(item => ({ path: item.derivedPath,
      sha256: sha256(bytesFor(derivedFiles, item.derivedPath)) })),
    iconArchiveSha256: sha256(zipBytes),
  });
}

export function replayHomepageResearch(input) {
  assertPolicy(input.requestedCapabilities);
  validateStageAdapterInput(input.adapterInput);
  if (input.adapterInput.canonicalStageId !== 'homepage-research')
    fail('CONTRACT_BINDING_MISMATCH', 'Homepage adapter requires homepage-research');
  validateContract('HOMEPAGE_FIXTURE', 1, input.fixtureManifest);
  if (input.adapterInput.runId !== input.fixtureManifest.sourceRunId)
    fail('CONTRACT_BINDING_MISMATCH', 'Homepage fixture belongs to another run');
  if (homepageReplayPayloadDigest(input) !== input.adapterInput.payloadDigest)
    fail('CONTRACT_DIGEST_MISMATCH', 'Homepage replay payload digest mismatch');
  const roles = new Set();
  for (const item of input.fixtureManifest.sources) {
    assertSafeRelativePath(item.sourceRelativePath);
    if (roles.has(item.role)) fail('CONTRACT_BINDING_MISMATCH', `Duplicate homepage source role: ${item.role}`);
    roles.add(item.role);
    if (sha256(bytesFor(input.sourceFiles, item.sourceRelativePath)) !== item.sourceSha256)
      fail('CONTRACT_DIGEST_MISMATCH', `Homepage source hash mismatch: ${item.role}`);
    if (Boolean(item.derivedPath) !== Boolean(item.derivedSha256))
      fail('CONTRACT_BINDING_MISMATCH', `Incomplete derived binding: ${item.role}`);
    if (item.derivedPath) {
      assertSafeRelativePath(item.derivedPath);
      if (sha256(bytesFor(input.derivedFiles, item.derivedPath)) !== item.derivedSha256)
        fail('CONTRACT_DIGEST_MISMATCH', `Homepage derived hash mismatch: ${item.role}`);
    }
  }
  if (roles.size !== 4) fail('CONTRACT_BINDING_MISMATCH', 'Homepage fixture source roles are incomplete');
  const resolvedIdentity = resolveStageIdentity({ namespace: input.fixtureManifest.sourceIdentity.namespace,
    value: input.fixtureManifest.sourceIdentity.value, mappingVersion: input.fixtureManifest.mappingVersion });
  if (resolvedIdentity.canonicalStageId !== input.fixtureManifest.canonicalStageId ||
      resolvedIdentity.legacySkillName !== input.fixtureManifest.sourceIdentity.legacySkillName)
    fail('CONTRACT_BINDING_MISMATCH', 'Homepage fixture identity mapping mismatch');
  const sourceIdentity = deepFreeze({ ...resolvedIdentity,
    originalNamespace: input.fixtureManifest.sourceIdentity.namespace,
    originalValue: input.fixtureManifest.sourceIdentity.value });
  const archive = inspectFaviconArchive(input.zipBytes);
  if (archive.archiveSha256 !== input.fixtureManifest.iconArchive.sourceSha256 ||
      archive.archiveBytes !== input.fixtureManifest.iconArchive.archiveBytes ||
      input.fixtureManifest.iconArchive.sourceRelativePath !==
        input.fixtureManifest.sources.find(item => item.role === 'ICON_ARCHIVE')?.sourceRelativePath ||
      canonicalJson(archive.members) !== canonicalJson(input.fixtureManifest.iconArchive.members))
    fail('CONTRACT_DIGEST_MISMATCH', 'Homepage icon archive metadata mismatch');
  const stageResult = {
    kind: 'STAGE_ADAPTER_RESULT', schemaVersion: 1, producer: 'V2_STAGE_ADAPTER', mode: 'OFFLINE',
    runId: input.adapterInput.runId, canonicalStageId: input.adapterInput.canonicalStageId,
    mappingVersion: input.adapterInput.mappingVersion, contextDigest: input.adapterInput.contextDigest,
    inputDigest: digest('AGENT_STAGE_ADAPTER_INPUT_V1', input.adapterInput), status: 'COMPLETED',
    authoritative: false, artifactDigests: [...new Set([
      ...input.fixtureManifest.sources.map(item => item.sourceSha256),
      ...input.fixtureManifest.sources.map(item => item.derivedSha256).filter(Boolean),
    ])].sort(), errorCodes: ['ICON_LICENSE_UNKNOWN'],
  };
  validateStageAdapterResult(stageResult);
  return deepFreeze({ sourceIdentity, archive, stageResult,
    licenseStatus: input.fixtureManifest.licenseStatus, publicationEligible: false });
}
