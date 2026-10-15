import { mkdir, readdir, lstat, readFile, writeFile, copyFile, chmod, rm, constants } from 'node:fs/promises';
import { join, relative, resolve, dirname } from 'node:path';
import { inside, safePath, sha256, parseArtifactJson } from './files.mjs';

export const templateCopyDirectory = runDirectory => join(runDirectory, 'template-copy', 'site');

async function exists(path) {
  try { return await lstat(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// Preflight the whole tree before creating any destination entry. Failed copies remain for diagnosis.
export async function mergeTemplateCopy(context, { copy = copyFile, remove = rm } = {}) {
  const { runDirectory, inputs } = context;
  const sourceDirectory = templateCopyDirectory(runDirectory), siteDirectory = inputs.projectPath;
  const researchDirectory = inputs.paths.researchDirectory;
  const receiptPath = join(runDirectory, 'TEMPLATE_MERGE_RECEIPT.json');
  const files = [], directories = [], conflicts = [];
  if (inside(sourceDirectory, siteDirectory) || inside(siteDirectory, sourceDirectory)) throw Error('Template merge source/target overlap');
  await safePath(sourceDirectory, [runDirectory]); await safePath(siteDirectory, [siteDirectory]);
  async function walk(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      const source = join(directory, entry.name); await safePath(source, [sourceDirectory]);
      const name = relative(sourceDirectory, source), destination = join(siteDirectory, name);
      await safePath(destination, [siteDirectory]);
      const existing = await exists(destination);
      const reserved = ['backgroundinformation', '.git', '.agents', '.codex', '.aws'].some(root => inside(join(siteDirectory, root), destination)) ||
        inside(researchDirectory, destination);
      if (reserved || existing && !(entry.isDirectory() && existing.isDirectory())) conflicts.push(destination);
      if (entry.isDirectory()) { directories.push({ source, destination, mode: (await lstat(source)).mode & 0o777 }); await walk(source); }
      else {
        if (!entry.isFile()) throw Error(`Unsupported template entry: ${source}`);
        const bytes = await readFile(source);
        files.push({ source, destination, relativePath: name, mode: (await lstat(source)).mode & 0o777,
          sourceSha256: sha256(bytes), destinationSha256: null, status: 'PENDING' });
      }
    }
  }
  await walk(sourceDirectory);
  if (conflicts.length) throw Error(`Template merge conflicts: ${conflicts.join(', ')}`);
  const manifestFile = files.find(file => file.relativePath === 'docs/template-copy-manifest.json');
  if (!manifestFile) throw Error('Missing template docs/template-copy-manifest.json');
  const manifest = parseArtifactJson(await readFile(manifestFile.source), manifestFile.source);
  if (manifest.destination !== sourceDirectory || !manifest.files || !Object.keys(manifest.files).length ||
      manifest.source_unchanged !== true || manifest.destination_verified !== true) throw Error('Invalid template copy manifest');
  for (const [name, hash] of Object.entries(manifest.files)) {
    const file = files.find(file => file.relativePath === name);
    if (!file || file.sourceSha256 !== hash || !inside(sourceDirectory, resolve(sourceDirectory, name)))
      throw Error(`Template manifest hash mismatch: ${name}`);
  }
  const generated = new Set(['docs/template-copy-manifest.json', 'docs/TEMPLATE_SELECTION_REPORT.md', 'docs/TEMPLATE_RESIDUE_SCAN.json']);
  for (const file of files) if (!Object.hasOwn(manifest.files, file.relativePath) && !generated.has(file.relativePath))
    throw Error(`Unlisted template file; refusing host merge: ${file.destination}`);
  const rewritten = Buffer.from(JSON.stringify({ ...manifest, destination: siteDirectory }, null, 2) + '\n');
  const receipt = { sourceDirectory, siteDirectory, status: 'COPYING', fileCount: files.length,
    sourceTreeSha256: sha256(JSON.stringify(files.map(f => [f.relativePath, f.sourceSha256]))),
    destinationTreeSha256: null, files: [], directories: [], cleanup: { status: 'PENDING' } };
  await safePath(receiptPath, [runDirectory]);
  if (await exists(receiptPath)) throw Error(`Template merge receipt already exists; reconcile before retry: ${receiptPath}`);
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const save = () => writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
  async function ensureDirectory(path, mode) {
    await safePath(path, [path]);
    const existing = await exists(path);
    if (existing) {
      if (!existing.isDirectory()) throw Error(`Template merge directory conflict: ${path}`);
      return;
    }
    await ensureDirectory(dirname(path), 0o755);
    const entry = { path, mode, status: 'CREATING' }; receipt.directories.push(entry); await save();
    try { await mkdir(path, { mode }); entry.status = 'CREATED'; }
    catch (error) {
      if (error.code !== 'EEXIST' || !(await lstat(path)).isDirectory()) throw error;
      entry.status = 'REUSED';
    }
    await save();
  }
  try {
    await ensureDirectory(siteDirectory, 0o755);
    for (const dir of directories) await ensureDirectory(dir.destination, dir.mode);
    for (const file of files) {
      await safePath(file.source, [sourceDirectory]); await safePath(file.destination, [siteDirectory]);
      if (sha256(await readFile(file.source)) !== file.sourceSha256) throw Error(`Template source changed before copy: ${file.source}`);
      file.status = 'COPYING'; receipt.files.push(file); await save();
      if (file === manifestFile) await writeFile(file.destination, rewritten, { flag: 'wx', mode: file.mode });
      else await copy(file.source, file.destination, constants.COPYFILE_EXCL);
      await chmod(file.destination, file.mode);
      file.destinationSha256 = sha256(await readFile(file.destination));
      if (file.destinationSha256 !== (file === manifestFile ? sha256(rewritten) : file.sourceSha256) ||
          sha256(await readFile(file.source)) !== file.sourceSha256) throw Error(`Template copy hash mismatch: ${file.destination}`);
      file.status = 'COPIED'; await save();
    }
    receipt.destinationTreeSha256 = sha256(JSON.stringify(files.map(f => [f.relativePath, f.destinationSha256])));
    receipt.status = 'MERGED'; await save();
  } catch (error) {
    receipt.status = 'FAILED'; receipt.error = error.message; await save(); throw error;
  }
  try { await remove(sourceDirectory, { recursive: true }); receipt.cleanup = { status: 'REMOVED' }; }
  catch (error) { receipt.cleanup = { status: 'FAILED', error: error.message }; }
  await save(); return receipt;
}
