import { mkdir, open, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { assertDirectoryNoSymlink } from './storage-boundary.mjs';

export async function syncDirectory(path) {
  const handle = await open(path, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}

export async function writeAtomicFile(path, bytes, { beforeRename = null } = {}) {
  const directory = dirname(path); await mkdir(directory, { recursive: true, mode: 0o700 });
  await assertDirectoryNoSymlink(directory);
  const temporary = join(directory, `.tmp-${randomUUID()}`);
  const handle = await open(temporary, 'wx', 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  await beforeRename?.(temporary, path);
  await rename(temporary, path);
  await syncDirectory(directory);
}
