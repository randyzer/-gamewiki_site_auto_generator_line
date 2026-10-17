import { link, open, readFile, realpath, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { ContractError } from '../contracts/errors.mjs';
import { assertRegularFileNoSymlink, ensureDirectoryTree } from './storage-boundary.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const contains = (root, path) => {
  const part = relative(resolve(root), resolve(path));
  return part === '' || (!part.startsWith('../') && !isAbsolute(part));
};
const syncDirectory = async path => { const handle = await open(path, 'r'); try { await handle.sync(); } finally { await handle.close(); } };

export function createStateObjectStore({ rootDirectory, faultInjector = null }) {
  const objectDirectory = join(rootDirectory, 'objects/sha256');
  return Object.freeze({
    async publish(descriptor, { stagingRoot }) {
      const boundRoot = await realpath(stagingRoot);
      const source = await realpath(join(stagingRoot, descriptor.sourcePath)).catch(() => null);
      if (!source || !contains(boundRoot, source)) throw new ContractError('CONTRACT_PATH_INVALID', 'Object source escapes staging root');
      const bytes = await readFile(source);
      if (bytes.length !== descriptor.byteLength || sha256(bytes) !== descriptor.sha256)
        throw new ContractError('CONTRACT_DIGEST_MISMATCH', `Object bytes changed: ${descriptor.role}`);
      await ensureDirectoryTree(rootDirectory, ['objects', 'sha256']);
      const target = join(objectDirectory, descriptor.sha256);
      try {
        await assertRegularFileNoSymlink(target);
        const existing = await readFile(target);
        if (!existing.equals(bytes)) throw new ContractError('STATE_COMMIT_CORRUPT', 'Immutable object digest collision');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        const temporary = join(objectDirectory, `.tmp-${randomUUID()}`);
        const handle = await open(temporary, 'wx', 0o400);
        try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
        try {
          await faultInjector?.('beforeObjectPublish');
          await link(temporary, target);
        } catch (publishError) {
          if (publishError.code !== 'EEXIST') throw publishError;
          await assertRegularFileNoSymlink(target);
          const existing = await readFile(target);
          if (!existing.equals(bytes)) throw new ContractError('STATE_COMMIT_CORRUPT', 'Immutable object was replaced');
        } finally { await unlink(temporary).catch(() => {}); }
        await syncDirectory(objectDirectory);
      }
      await assertRegularFileNoSymlink(target);
      return Object.freeze({ role: descriptor.role, contractKind: descriptor.contractKind,
        schemaVersion: descriptor.schemaVersion, path: `objects/sha256/${descriptor.sha256}`,
        sha256: descriptor.sha256, byteLength: descriptor.byteLength });
    },
    async verify(reference) {
      if (reference.path !== `objects/sha256/${reference.sha256}`)
        throw new ContractError('STATE_COMMIT_CORRUPT', 'Object reference path is not content-addressed');
      const path = join(rootDirectory, reference.path);
      await assertRegularFileNoSymlink(path).catch(error => {
        if (error.code === 'ENOENT') throw new ContractError('STATE_COMMIT_CORRUPT', 'Commit references a missing object');
        throw error;
      });
      const bytes = await readFile(path).catch(error => {
        if (error.code === 'ENOENT') throw new ContractError('STATE_COMMIT_CORRUPT', 'Commit references a missing object');
        throw error;
      });
      if (bytes.length !== reference.byteLength || sha256(bytes) !== reference.sha256)
        throw new ContractError('STATE_COMMIT_CORRUPT', 'Commit object digest or size mismatch');
      return bytes;
    },
  });
}
