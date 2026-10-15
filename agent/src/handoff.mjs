import { STAGE, findStage } from './stages.mjs';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { safePath, readArtifact, sha256 } from './files.mjs';

// Research stays outside the empty template destination until template copying passes.
export async function prepareResearchHandoff(context) {
  const project = context.inputs.projectPath;
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
