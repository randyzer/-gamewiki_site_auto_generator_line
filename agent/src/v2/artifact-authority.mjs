import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { ContractError } from '../contracts/errors.mjs';
import { deepFreeze } from '../contracts/canonical-json.mjs';
import { stageRegistry } from './stage-registry.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const fail = (code, message) => { throw new ContractError(code, message); };
const safeRelative = path => typeof path === 'string' && path && !path.startsWith('/') && !path.includes('\\') &&
  !path.includes('//') && !path.split('/').some(part => !part || part === '.' || part === '..');
const contains = (root, path) => {
  const part = relative(resolve(root), resolve(path));
  return part === '' || (!part.startsWith('../') && !isAbsolute(part));
};
async function rejectSymlinks(root, relativePath) {
  let current = root;
  const rootMetadata = await lstat(current);
  if (rootMetadata.isSymbolicLink() || !rootMetadata.isDirectory())
    fail('STATE_STORAGE_SYMLINK', 'Artifact authority root must be a real directory');
  const parts = relativePath.split('/');
  for (const [index, part] of parts.entries()) {
    current = resolve(current, part);
    const metadata = await lstat(current);
    if (metadata.isSymbolicLink() || (index < parts.length - 1 && !metadata.isDirectory()) ||
        (index === parts.length - 1 && !metadata.isFile()))
      fail('STATE_STORAGE_SYMLINK', 'Artifact authority path cannot contain symbolic links');
  }
}

export function createArtifactAuthority({ rootDirectory }) {
  const configuredRoot = resolve(rootDirectory);
  return Object.freeze({
    reference(input) {
      stageRegistry.requireCore(input.canonicalStageId);
      if (!safeRelative(input.path) || !/^[a-f0-9]{64}$/.test(input.sha256) ||
          !Number.isSafeInteger(input.byteLength) || input.byteLength < 0 ||
          typeof input.runId !== 'string' || !input.runId ||
          !Number.isSafeInteger(input.attemptId) || input.attemptId < 1) {
        fail('ARTIFACT_REFERENCE_INVALID', 'Artifact reference is malformed');
      }
      return deepFreeze({ kind: 'V2_ARTIFACT_REFERENCE', schemaVersion: 1,
        runId: input.runId, canonicalStageId: input.canonicalStageId, attemptId: input.attemptId,
        path: input.path, sha256: input.sha256, byteLength: input.byteLength });
    },
    async verify(reference, expected) {
      stageRegistry.requireCore(reference?.canonicalStageId);
      for (const key of ['runId', 'canonicalStageId', 'attemptId']) {
        if (reference?.[key] !== expected?.[key]) fail('CONTRACT_BINDING_MISMATCH', `Artifact does not match ${key}`);
      }
      if (!safeRelative(reference.path)) fail('CONTRACT_PATH_INVALID', 'Artifact path is unsafe');
      await rejectSymlinks(configuredRoot, reference.path);
      const root = await realpath(configuredRoot);
      const path = await realpath(resolve(configuredRoot, reference.path)).catch(() => null);
      if (!path || !contains(root, path)) fail('CONTRACT_PATH_INVALID', 'Artifact escapes its authority root');
      const bytes = await readFile(path);
      if (bytes.length !== reference.byteLength || sha256(bytes) !== reference.sha256) {
        fail('CONTRACT_DIGEST_MISMATCH', 'Artifact bytes do not match the immutable reference');
      }
      return reference;
    },
  });
}
