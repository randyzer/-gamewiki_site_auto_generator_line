import { STAGE, findStage } from './stages.mjs';
import { readFile, lstat, mkdir, readdir } from 'node:fs/promises';
import { join, dirname, basename, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safePath, readArtifact, sha256, treeFiles, inside } from './files.mjs';
import { verifyBaseline, sourceFiles, secretPath } from './project-baseline.mjs';
import { assertProjectIsolation } from './existing-project.mjs';
import { runProcess } from './process.mjs';

const contractPath = fileURLToPath(new URL('../config/existing-content-contract.json', import.meta.url));
const digestPattern = /^[a-f0-9]{64}$/;
const invalidFilename = /[\\/:*?"<>|\x00]/g;
export const materialName = keyword => keyword.replace(invalidFilename, '-') + '素材.md';
export function incompatible(reason) { return Object.assign(Error('CONTRACT_INCOMPATIBLE: ' + reason), { code: 'CONTRACT_INCOMPATIBLE' }); }
const assert = (ok, reason) => { if (!ok) throw incompatible(reason); };
const lockfilePattern = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/;
const adoptionEvidence = /^docs\/EXISTING_PROJECT_ADOPTION(?:_REPORT\.md|\.json)$/;
async function directory(path) {
  await safePath(path, [path]);
  try { return (await lstat(path)).isDirectory(); } catch (error) { if (error.code !== 'ENOENT') throw error; return false; }
}
export async function loadExistingContentContract() {
  const bytes = await readArtifact(contractPath, [dirname(contractPath)]);
  const contract = JSON.parse(bytes);
  assert(contract.id === 'EXISTING_PROJECT_CONTENT_ADAPTER_V1' && contract.schemaVersion === 1, 'unsupported existing-content contract');
  return { contract, contractSha256: sha256(bytes) };
}
export async function verifyCandidateInvariants(context, baseline = context.existingProject?.baseline) {
  const project = context.inputs.projectPath;
  async function inspectPaths(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name), rel = relative(project, path);
      assert(entry.name !== '.git', 'candidate must remain without Git metadata');
      assert(!secretPath(rel), 'candidate contains a forbidden credential path');
      await safePath(path, [project]);
      // Installed dependency trees have ordinary executable symlinks and are not source snapshots.
      if (entry.name === 'node_modules') continue;
      if (entry.isDirectory()) await inspectPaths(path);
      else assert(entry.isFile(), 'unsafe candidate file type');
    }
  }
  await inspectPaths(project);
  const files = await sourceFiles(project, { rejectSecrets: true }), current = new Map(files.map(file => [file.path, file]));
  const keywordPath = relative(baseline.sourceProjectPath, baseline.keyword.path);
  for (const file of baseline.files.filter(file => file.path === keywordPath || baseline.protectedPaths.some(prefix => file.path === prefix || file.path.startsWith(prefix + '/')))) {
    const actual = current.get(file.path);
    assert(actual?.sha256 === file.sha256 && actual.mode === file.mode, 'protected candidate baseline changed: ' + file.path);
  }
  const originalLocks = baseline.files.filter(file => lockfilePattern.test(file.path)), currentLocks = files.filter(file => lockfilePattern.test(file.path));
  assert(originalLocks.length === 1 && currentLocks.length === originalLocks.length, 'dependency lockfile set changed or ambiguous');
  for (const file of originalLocks) {
    const actual = current.get(file.path);
    assert(actual?.sha256 === file.sha256 && actual.mode === file.mode, 'dependency lockfile changed: ' + file.path);
  }
  return files;
}
export async function verifyExistingContentContext(context) {
  const { contract, contractSha256 } = await loadExistingContentContract();
  const { baseline, sourceEntry } = context.existingProject ?? {};
  const project = context.inputs?.projectPath;
  assert(context.inputs?.mode === 'existing-project' && typeof context.inputs.gameIdentity === 'string' && context.inputs.gameIdentity.trim(), 'explicit existing-project identity is required');
  assert(baseline && sourceEntry && isAbsolute(project ?? '') && isAbsolute(context.nativeDirectory ?? '') && isAbsolute(context.runDirectory ?? ''), 'host baseline, source entry and isolated paths are required');
  assert(context.permissions?.siteWrites === true && context.permissions.advertisingScripts !== true, 'write-candidate scope without advertising execution is required');
  assert(baseline.schemaVersion === 1 && baseline.snapshotPolicyVersion === contract.snapshotPolicyVersion && digestPattern.test(baseline.digest ?? ''), 'snapshot policy/baseline version is incompatible');
  assert(context.inputs.sourceProjectPath === baseline.sourceProjectPath && sourceEntry.path === baseline.sourceProjectPath &&
    context.inputs.rawKeywordsFile === baseline.keyword?.path, 'host source or keyword identity mismatch');
  assert(baseline.head && digestPattern.test(baseline.statusDigest ?? '') && sha256(baseline.status) === baseline.statusDigest, 'source HEAD/status evidence is missing');
  await assertProjectIsolation(sourceEntry.path, { runDirectory: context.runDirectory, candidateProjectPath: project });
  assert(inside(context.runDirectory, context.nativeDirectory) && !inside(project, context.nativeDirectory), 'nativeDirectory must be isolated under runDirectory');
  await safePath(context.nativeDirectory, [context.runDirectory]);
  await verifyBaseline(baseline, sourceEntry);
  const lock = context.skillLock;
  assert(lock?.name === contract.nativeSkill && lock.contractVersion === contract.nativeContractVersion && isAbsolute(lock.source ?? '') && digestPattern.test(lock.sha256 ?? ''), 'current native skill lock is required');
  const skillRoot = dirname(lock.source);
  for (const protectedRoot of [...(context.templateRoots ?? []), skillRoot])
    assert(!inside(protectedRoot, project) && !inside(project, protectedRoot), 'candidate overlaps immutable template/skill source');
  assert(sha256(await readArtifact(lock.source, [skillRoot])) === lock.sha256, 'native skill lock hash mismatch');
  const files = [];
  for (const file of await treeFiles(skillRoot)) files.push({ path: relative(skillRoot, file), sha256: sha256(await readFile(file)) });
  const version = 'tree-sha256:' + sha256(JSON.stringify(files.map(f => [f.path, f.sha256])));
  assert(lock.version === version, 'native skill tree version mismatch');
  for (const required of ['scripts/preflight.py', 'scripts/validate_integration.py', 'references/input-contract.md', 'references/output-contract.md', 'references/acceptance-checklist.md'])
    assert(files.some(file => file.path === required), 'native skill contract file missing: ' + required);
  return { contract, contractSha256, baseline, sourceEntry, project, skillRoot, skillLock: { ...lock, files } };
}

export function keywordRows(data) {
  assert(Array.isArray(data?.categories) && data.categories.length > 0, 'keywords.json categories are missing');
  const rows = [], keywords = new Set(), names = new Set();
  for (const group of data.categories) {
    assert(typeof group?.category === 'string' && group.category.trim() && Array.isArray(group.keywords), 'invalid keyword category');
    assert(group.category.toLowerCase() !== 'codes' || group.keywords.length === 1, 'Codes category must contain exactly one keyword');
    for (const keyword of group.keywords) {
      assert(typeof keyword === 'string' && keyword.trim() === keyword && keyword, 'invalid final keyword');
      const key = keyword.toLowerCase(), name = materialName(keyword).toLowerCase();
      assert(!keywords.has(key), 'duplicate final keyword: ' + keyword);
      assert(!names.has(name), 'colliding keyword material filename: ' + keyword);
      keywords.add(key); names.add(name); rows.push({ category: group.category, keyword });
    }
  }
  assert(data.categories.some(group => group.category.toLowerCase() === 'guide'), 'Guide keyword category is required');
  assert(rows.length > 0, 'keywords.json contains no final keywords');
  return rows;
}
async function unique(files, name, role) {
  const matches = files.filter(file => basename(file) === name);
  assert(matches.length === 1, role + ' must resolve uniquely: ' + name);
  return matches[0];
}
async function researchLineage(context, root, keywordsRoot) {
  const expected = new Map(), lineage = [];
  for (const name of [STAGE.HOMEPAGE_RESEARCH, STAGE.KEYWORD_RESEARCH]) {
    const stage = findStage(context.upstream ?? [], name);
    assert(stage.status === 'PASSED' && Array.isArray(stage.artifacts), 'upstream research stage has not passed');
    for (const artifact of stage.artifacts) {
      if (artifact.kind === 'KEYWORD_MATERIALS.md') continue;
      assert(artifact.runId === context.runId && artifact.projectPath === context.inputs.projectPath && artifact.gameIdentity === context.inputs.gameIdentity,
        'research handoff identity mismatch');
      assert(digestPattern.test(artifact.sha256 ?? '') && (!artifact.sourceSha256 || artifact.sourceSha256 === artifact.sha256), 'upstream source hash/version mismatch');
      const bytes = await readArtifact(artifact.path, [context.runDirectory]);
      assert(sha256(bytes) === artifact.sha256, 'upstream research hash mismatch');
      const target = join(name === STAGE.HOMEPAGE_RESEARCH ? root : keywordsRoot, basename(artifact.sourcePath ?? artifact.path));
      assert(!expected.has(target), 'duplicate research handoff destination');
      const adopted = await readArtifact(target, [context.inputs.projectPath]);
      assert(sha256(adopted) === artifact.sha256, 'research handoff hash mismatch: ' + basename(target));
      const item = { kind: artifact.kind, path: target, sha256: artifact.sha256, upstreamPath: artifact.path,
        upstreamSourcePath: artifact.sourcePath ?? null, upstreamSourceSha256: artifact.sourceSha256 ?? null };
      expected.set(target, item); lineage.push(item);
    }
  }
  assert(context.upstream?.length >= 2 && lineage.length > 0, 'verified research handoff lineage is missing');
  return { expected, lineage };
}
const inspectZip = `import importlib.util,json,sys,zipfile,hashlib,stat,re\nspec=importlib.util.spec_from_file_location("native_preflight",sys.argv[1])\nm=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nerrors=[]\nresult=m.validate_zip(m.Path(sys.argv[2]),errors)\nassets={}\nif not errors:\n with zipfile.ZipFile(sys.argv[2]) as z:\n  for item in z.infolist():\n   if item.is_dir():continue\n   name=m.Path(item.filename).name\n   if "\\\\" in item.filename or re.match(r"^[A-Za-z]:",item.filename) or stat.S_ISLNK(item.external_attr>>16):errors.append("icon ZIP contains unsafe path/type: "+item.filename)\n   if name not in m.REQUIRED_FAVICONS:errors.append("icon ZIP contains unexpected member: "+item.filename)\n   if item.file_size==0 or item.file_size>33554432:errors.append("icon ZIP contains invalid member size: "+item.filename)\n   else:assets[name]=hashlib.sha256(z.read(item)).hexdigest()\nresult["assets"]=assets\nresult["errors"]=errors\nwith open(sys.argv[3],"w",encoding="utf-8") as f:json.dump(result,f,ensure_ascii=False)\n`;
export async function inspectExistingContent(context, { run = runProcess, verifySnapshot = true } = {}) {
  const verified = await verifyExistingContentContext(context), { project, baseline, contract, skillRoot } = verified;
  const roots = [];
  for (const name of ['backgroundinformation', 'background_information']) if (await directory(join(project, name))) roots.push(name);
  assert(roots.length === 1, roots.length > 1 ? 'Ambiguous research roots' : 'research root is missing');
  assert(roots[0] === baseline.researchRootName && roots[0] === context.inputs.researchRootName, 'legacy research root must be preserved');
  const root = join(project, roots[0]), keywordsRoot = context.researchHandoff?.keywordsRoot;
  assert(context.researchHandoff?.homepageRoot === root && keywordsRoot === join(root, 'keyword-materials'), 'host research handoff paths mismatch');
  const files = await treeFiles(root), keywordFiles = files.filter(file => basename(file) === 'keywords.json');
  assert(keywordFiles.length === 1 && dirname(keywordFiles[0]) === keywordsRoot, 'keywords.json must resolve uniquely inside the handoff materials directory');
  const homepageFiles = files.filter(file => basename(file).endsWith('攻略站首页调研信息.md'));
  const iconFiles = files.filter(file => basename(file).endsWith('图标.zip'));
  const safeGame = context.inputs.gameIdentity.replace(invalidFilename, '-');
  assert(homepageFiles.length === 1 && basename(homepageFiles[0]) === safeGame + '攻略站首页调研信息.md', 'native homepage Markdown identity is missing or ambiguous');
  assert(iconFiles.length === 1 && basename(iconFiles[0]) === safeGame + '图标.zip', 'native favicon ZIP identity is missing or ambiguous');
  const processing = await unique(files, '关键词处理记录.md', 'keyword processing record');
  const summary = await unique(files, '关键词素材汇总.md', 'keyword summary');
  assert(dirname(processing) === keywordsRoot && dirname(summary) === keywordsRoot, 'processing record/summary are outside keyword materials');
  const { expected, lineage } = await researchLineage(context, root, keywordsRoot);
  for (const [file, kind] of [[homepageFiles[0], 'HOMEPAGE_RESEARCH.md'], [iconFiles[0], 'ICON.zip'], [keywordFiles[0], 'keywords.json'], [processing, '关键词处理记录.md'], [summary, '关键词素材汇总.md']])
    assert(expected.get(file)?.kind === kind, 'research role lineage mismatch: ' + kind);
  const homepageText = (await readArtifact(homepageFiles[0], [project])).toString('utf8');
  assert(homepageText.toLowerCase().includes(context.inputs.gameIdentity.toLowerCase()) && /```json\s*[\s\S]*?```/.test(homepageText), 'homepage Markdown lacks native identity/structured data');
  const rows = keywordRows(JSON.parse(await readArtifact(keywordFiles[0], [project])));
  const processingText = (await readArtifact(processing, [project])).toString('utf8'), summaryText = (await readArtifact(summary, [project])).toString('utf8');
  assert(processingText.includes(context.inputs.gameIdentity) && processingText.includes(baseline.keyword.path), 'keyword processing record source identity/version mismatch');
  const materials = [];
  for (const row of rows) {
    const file = await unique(files, materialName(row.keyword), 'keyword material');
    assert(dirname(file) === keywordsRoot && expected.get(file)?.kind === 'keyword-material:' + row.keyword, 'keyword material handoff lineage mismatch');
    const text = (await readArtifact(file, [project])).toString('utf8');
    const statuses = [...text.matchAll(/^- 状态: (COMPLETED|PARTIAL|BLOCKED)\s*$/gm)].map(match => match[1]);
    assert(statuses.length === 1 && text.includes('- 关键词: ' + row.keyword) && text.includes('- 游戏名: ' + context.inputs.gameIdentity), 'keyword material identity/status invalid');
    for (const heading of ['搜索意图', 'Google / 网页素材', 'YouTube 素材', '官方素材', '交叉验证结果', '可用于内页的内容框架', '调研限制'])
      assert(text.includes('## ' + heading), 'native keyword material heading missing: ' + heading);
    assert(processingText.includes(row.keyword) && summaryText.includes(row.keyword) && summaryText.includes(materialName(row.keyword)), 'keyword processing/summary coverage mismatch');
    const urls = [...new Set([...text.matchAll(/^- URL:\s*(https?:\/\/\S+)\s*$/gm)].map(match => match[1]))];
    const versions = [...new Set([...text.matchAll(/^- 适用版本:\s*(.+)$/gm)].map(match => match[1].trim()))];
    const researchDate = text.match(/^- 调研日期: (\d{4}-\d{2}-\d{2})\s*$/m)?.[1];
    assert(researchDate && (statuses[0] === 'BLOCKED' || (urls.length > 0 && versions.length > 0 && /^- 访问日期:\s*\d{4}-\d{2}-\d{2}\s*$/m.test(text))), 'keyword source version/date context is missing');
    materials.push({ ...row, path: file, sha256: sha256(text), status: statuses[0], researchDate, urls, versions });
  }
  assert(files.filter(file => basename(file).endsWith('素材.md')).length === rows.length, 'unexpected or duplicate keyword materials');
  const pkgBytes = await readArtifact(join(project, 'package.json'), [project]), pkg = JSON.parse(pkgBytes);
  assert(typeof (pkg.dependencies?.astro ?? pkg.devDependencies?.astro) === 'string' && typeof pkg.scripts?.build === 'string' && await directory(join(project, 'src/pages')), 'isolated candidate must retain the existing Astro content model');
  const candidateFiles = await verifyCandidateInvariants(context, baseline);
  if (verifySnapshot) {
    const current = new Map(candidateFiles.map(file => [file.path, file]));
    for (const file of baseline.files) {
      const actual = current.get(file.path);
      assert(actual?.sha256 === file.sha256 && actual.mode === file.mode, 'candidate snapshot drift before adoption: ' + file.path);
    }
    const basePaths = new Set(baseline.files.map(file => file.path));
    for (const file of candidateFiles) assert(basePaths.has(file.path) || file.path.startsWith(roots[0] + '/') || adoptionEvidence.test(file.path), 'unowned candidate file before adoption: ' + file.path);
  }
  let origin;
  try { origin = new URL(context.inputs.canonicalOrigin); } catch { throw incompatible('confirmed canonical origin is required'); }
  assert(origin.protocol === 'https:' && origin.origin === context.inputs.canonicalOrigin && !origin.username && !origin.password, 'confirmed canonical origin is required');
  await mkdir(context.nativeDirectory, { recursive: true });
  const zipInspectionPath = join(context.nativeDirectory, 'EXISTING_CONTENT_ICON_CHECK.json');
  await safePath(zipInspectionPath, [context.nativeDirectory]);
  await run('python3', ['-c', inspectZip, join(skillRoot, 'scripts/preflight.py'), iconFiles[0], zipInspectionPath], { cwd: context.nativeDirectory, timeoutMs: 30000, env: { PATH: process.env.PATH, PYTHONDONTWRITEBYTECODE: '1' } });
  const icon = JSON.parse(await readArtifact(zipInspectionPath, [context.nativeDirectory]));
  assert(Array.isArray(icon.errors) && icon.errors.length === 0 && Array.isArray(icon.members) && icon.missing?.length === 0, 'icon ZIP validation failed: ' + (icon.errors ?? []).join('; '));
  const preflight = { schemaVersion: 1, contractId: contract.id, ready: true, nativeCopiedTemplatePreflightPassed: false,
    game: context.inputs.gameIdentity, workspace: project, sourceWrites: false, releaseAuthorized: false,
    baselineDigest: baseline.digest, sourceHead: baseline.head, sourceStatusDigest: baseline.statusDigest,
    rawKeyword: baseline.keyword, skillLock: verified.skillLock, canonicalOrigin: origin.origin,
    candidateAstro: { packageSha256: sha256(pkgBytes), version: pkg.dependencies?.astro ?? pkg.devDependencies?.astro, pageRoot: join(project, 'src/pages'),
      dependencyLockfiles: candidateFiles.filter(file => lockfilePattern.test(file.path)), filesDigest: sha256(JSON.stringify(candidateFiles.filter(file => !adoptionEvidence.test(file.path)))) },
    research: { root, homepage: homepageFiles[0], iconZip: iconFiles[0], keywords: keywordFiles[0], keywordsRoot, processing, summary, lineage, materials, icon },
    retainedRequirements: contract.retainedRequirements, errors: [], warnings: ['Native copied-template preflight is not applicable; existing-project adoption replaces only its explicit prerequisites.'] };
  await verifyBaseline(baseline, verified.sourceEntry);
  return { ...verified, preflight };
}
