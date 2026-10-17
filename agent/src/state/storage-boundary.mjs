import { lstat, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ContractError } from '../contracts/errors.mjs';

const reject = path => new ContractError('STATE_STORAGE_SYMLINK',
  `State storage path must not be a symbolic link: ${path}`);

export async function assertDirectoryNoSymlink(path) {
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw reject(path);
  return path;
}

export async function ensureDirectoryTree(rootDirectory, segments = []) {
  await mkdir(rootDirectory, { recursive: true, mode: 0o700 });
  await assertDirectoryNoSymlink(rootDirectory);
  let current = rootDirectory;
  for (const segment of segments) {
    current = join(current, segment);
    try { await mkdir(current, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    await assertDirectoryNoSymlink(current);
  }
  return current;
}

export async function assertRegularFileNoSymlink(path) {
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink() || !metadata.isFile()) throw reject(path);
  return path;
}
