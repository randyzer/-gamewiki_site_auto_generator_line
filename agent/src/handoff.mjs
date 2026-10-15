import { STAGE, findStage } from './stages.mjs';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { safePath, readArtifact, sha256, treeFiles } from './files.mjs';

async function copyResearchFile(source, target, sourceRoots, targetRoot, expected) {
  const bytes = await readArtifact(source, sourceRoots);
  if (expected && sha256(bytes) !== expected) throw Error(`Research handoff hash mismatch: ${source}`);
  await safePath(target, [targetRoot]);
  await mkdir(join(target, '..'), { recursive: true });
  try { await writeFile(target, bytes, { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (sha256(await readArtifact(target, [targetRoot])) !== sha256(bytes))
      throw Error(`Existing research file conflicts; refusing to overwrite: ${target}`);
  }
}

export async function publishResearchArtifacts(context, skill, artifacts) {
  const root = context.inputs.paths.researchDirectory;
  const directory = skill === STAGE.HOMEPAGE_RESEARCH ? root : join(root, 'keyword-materials');
  for (const artifact of artifacts) {
    const name = artifact.kind === 'KEYWORD_MATERIALS.md' ? artifact.kind : basename(artifact.sourcePath ?? artifact.path);
    const target = join(directory, name);
    if (target === context.inputs.rawKeywordsFile || target === context.inputs.keywordSourceLineageFile)
      throw Error(`Research artifact would overwrite original keyword input: ${target}`);
    await copyResearchFile(artifact.path, target, [context.runDirectory], root, artifact.sha256);
  }
}

// Research stays outside the empty template destination until template copying passes.
export async function prepareResearchHandoff(context) {
  const project = context.inputs.projectPath;
  if (context.inputs.paths) {
    const source = context.inputs.paths.researchDirectory, destination = join(project, 'backgroundinformation');
    for (const name of [STAGE.HOMEPAGE_RESEARCH, STAGE.KEYWORD_RESEARCH]) {
      for (const artifact of findStage(context.upstream, name).artifacts) {
        if (artifact.runId !== context.runId || artifact.projectPath !== project || artifact.gameIdentity !== context.inputs.gameIdentity)
          throw Error('Research handoff identity mismatch');
        const directory = name === STAGE.HOMEPAGE_RESEARCH ? source : join(source, 'keyword-materials');
        const filename = artifact.kind === 'KEYWORD_MATERIALS.md' ? artifact.kind : basename(artifact.sourcePath ?? artifact.path);
        if (sha256(await readArtifact(join(directory, filename), [source])) !== artifact.sha256)
          throw Error(`Research handoff hash mismatch: ${join(directory, filename)}`);
      }
    }
    for (const file of await treeFiles(source))
      await copyResearchFile(file, join(destination, file.slice(source.length + 1)), [source], project);
    return { homepageRoot: destination, keywordsRoot: join(destination, 'keyword-materials') };
  }
  // Old manifests may use the historical underscored directory name.
  const researchRoot = join(project, context.inputs.researchRootName === 'background_information' ? 'background_information' : 'backgroundinformation');
  for (const name of [STAGE.HOMEPAGE_RESEARCH, STAGE.KEYWORD_RESEARCH]) {
    const stage = findStage(context.upstream, name);
    for (const artifact of stage.artifacts) {
      if (artifact.kind === 'KEYWORD_MATERIALS.md') continue;
      if (artifact.runId !== context.runId || artifact.projectPath !== project || artifact.gameIdentity !== context.inputs.gameIdentity) throw Error('Research handoff identity mismatch');
      const bytes = await readArtifact(artifact.path, [context.runDirectory]);
      if (sha256(bytes) !== artifact.sha256) throw Error('Research handoff hash mismatch');
      const original = artifact.sourcePath ?? artifact.path;
      const directory = name === STAGE.HOMEPAGE_RESEARCH ? researchRoot : join(researchRoot, 'keyword-materials');
      const target = join(directory, basename(original));
      await safePath(target, [project]);
      await mkdir(directory, { recursive: true });
      try { await writeFile(target, bytes, { flag: 'wx', mode: 0o600 }); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if (sha256(await readArtifact(target, [project])) !== artifact.sha256) throw Error('Existing research handoff conflicts; reconcile before retry');
      }
    }
  }
  return { homepageRoot: researchRoot, keywordsRoot: join(researchRoot, 'keyword-materials') };
}

export async function publishDeploymentPlan(context, result, { write = writeFile } = {}) {
  const project = context.inputs.projectPath;
  const items = result.artifacts.filter(a => ['DEPLOYMENT_PLAN.md', 'DEPLOYMENT_PLAN.json'].includes(a.kind));
  if (items.length !== 2) throw Error('Missing validated plan files');
  const targets = [];
  // Check both targets before creating either one; no partial replacement of old plans.
  for (const item of items) {
    const target = join(project, 'docs', item.kind);
    await safePath(target, [project]);
    const bytes = Buffer.from(item.content, item.encoding ?? 'utf8');
    let exists = false;
    try {
      const old = await readArtifact(target, [project]);
      if (sha256(old) !== sha256(bytes)) throw Error('Existing deployment plan conflicts; explicit reconciliation required');
      exists = true;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    targets.push({ item, target, bytes, exists });
  }
  await mkdir(join(project, 'docs'), { recursive: true });
  const created = [];
  try {
    for (const target of targets) if (!target.exists) {
      await write(target.target, target.bytes, { flag: 'wx', mode: 0o600 }); created.push(target);
    }
  } catch (error) {
    for (const target of created) {
      if (sha256(await readArtifact(target.target, [project])) === sha256(target.bytes)) await unlink(target.target);
    }
    throw error;
  }
  for (const target of targets) {
    if (sha256(await readArtifact(target.target, [project])) !== sha256(target.bytes)) throw Error('Published plan hash mismatch');
    target.item.sourcePath = target.target; target.item.sourceSha256 = sha256(target.bytes);
  }
  return result;
}
