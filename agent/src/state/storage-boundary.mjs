import { lstat, mkdir } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { ContractError } from '../contracts/errors.mjs';

const reject = path => new ContractError('STATE_STORAGE_SYMLINK',
  `State storage path must not be a symbolic link: ${path}`);
const rejectSegment = segment => new ContractError('STATE_STORAGE_PATH_INVALID',
  `State storage directory segment is unsafe: ${String(segment)}`);

function assertSafeDirectorySegments(segments) {
  if (!Array.isArray(segments)) throw rejectSegment(segments);
  for (const segment of segments) {
    if (typeof segment !== 'string' || segment.length === 0 || segment === '.' || segment === '..' ||
        isAbsolute(segment) || segment.includes('/') || segment.includes('\\') || segment.includes('\0')) {
      throw rejectSegment(segment);
    }
  }
}

export async function assertDirectoryNoSymlink(path) {
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw reject(path);
  return path;
}

export async function ensureDirectoryTree(rootDirectory, segments = []) {
  assertSafeDirectorySegments(segments);
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
