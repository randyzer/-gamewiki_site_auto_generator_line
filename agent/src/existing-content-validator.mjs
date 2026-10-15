import { lstat, writeFile, rm } from 'node:fs/promises';
import { join, basename, relative, resolve } from 'node:path';
import { readArtifact, safePath, sha256, treeFiles, inside } from './files.mjs';
import { verifyBaseline } from './project-baseline.mjs';
import { verifyExistingContentContext, verifyCandidateInvariants, keywordRows, materialName, incompatible } from './existing-content-preflight.mjs';
import { runProcess } from './process.mjs';

const assert = (ok, reason) => { if (!ok) throw Error(reason); };
const parse = bytes => JSON.parse(bytes.toString('utf8'));
function routePath(route) {
  assert(typeof route === 'string' && route.startsWith('/') && !route.startsWith('//') && !/[?#\s\\]/.test(route), 'invalid public route');
  const url = new URL(route, 'https://route.test');
  assert(url.pathname === route && !/%(?:2e|2f|5c)/i.test(route), 'unsafe public route');
  return route.replace(/\/+$/, '') || '/';
}
function staticSourceRoute(project, source) {
  const path = relative(join(project, 'src/pages'), source);
  if (path.startsWith('../') || /[\[\]]/.test(path) || !/\.(astro|md|mdx|html)$/.test(path)) return null;
  return routePath('/' + path.replace(/\.(astro|md|mdx|html)$/, '').replace(/(?:^|\/)index$/, ''));
}
function htmlAttributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) result[match[1].toLowerCase()] = decode(match[2] ?? match[3]);
  return result;
}
function decode(value) { return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }
function metadata(html) {
  const tags = [...html.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(match => htmlAttributes(match[0]));
  const canonicals = tags.filter(tag => tag.rel?.toLowerCase() === 'canonical').map(tag => tag.href);
  return { canonicals, og: tags.filter(tag => tag.property === 'og:url').map(tag => tag.content),
    title: decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? ''),
    description: tags.find(tag => tag.name?.toLowerCase() === 'description')?.content ?? '',
    noindex: tags.some(tag => ['robots', 'googlebot'].includes(tag.name?.toLowerCase()) && /(?:^|[,\s])(noindex|none)(?:$|[,\s])/i.test(tag.content ?? '')) };
}
function absolute(value, origin, label) {
  let url;
  try { url = new URL(value); } catch { throw Error(label + ' URL must be absolute'); }
  assert(url.origin === origin && !url.username && !url.password && !url.search && !url.hash, label + ' origin mismatch');
  return url;
}
async function validatedAdoption(context, verified) {
  const path = join(verified.project, 'docs/EXISTING_PROJECT_ADOPTION.json');
  const bytes = await readArtifact(path, [verified.project]), adoption = parse(bytes);
  assert(adoption.contractId === verified.contract.id && adoption.contractSha256 === verified.contractSha256 &&
    adoption.runId === context.runId && adoption.game === context.inputs.gameIdentity && adoption.candidateProjectPath === verified.project &&
    adoption.baseline?.digest === verified.baseline.digest && adoption.skillLock?.version === verified.skillLock.version &&
    adoption.nativeCopiedTemplatePreflightPassed === false && adoption.sourceWrites === false && adoption.releaseAuthorized === false,
    'existing project adoption identity/lock mismatch');
  assert(context.existingContent?.adoption, 'host-prepared existingContent adoption evidence is required');
  assert(sha256(JSON.stringify(adoption)) === sha256(JSON.stringify(context.existingContent.adoption)), 'worker changed adoption evidence');
  const markdownPath = join(verified.project, 'docs/EXISTING_PROJECT_ADOPTION_REPORT.md');
  assert(context.existingContent.adoptionMarkdownPath === markdownPath &&
    sha256(await readArtifact(markdownPath, [verified.project])) === context.existingContent.adoptionMarkdownSha256, 'worker changed adoption Markdown evidence');
  assert(adoption.candidateAstro?.packageSha256 === sha256(await readArtifact(join(verified.project, 'package.json'), [verified.project])), 'worker changed package dependencies/scripts outside adoption');
  assert(adoption.research.root === context.researchHandoff?.homepageRoot && adoption.research.keywordsRoot === context.researchHandoff?.keywordsRoot,
    'research root differs from adopted handoff');
  for (const item of adoption.research.lineage) {
    assert(inside(adoption.research.root, item.path), 'adopted research path escaped root');
    assert(sha256(await readArtifact(item.path, [verified.project])) === item.sha256, 'adopted research changed after integration');
    assert(sha256(await readArtifact(item.upstreamPath, [context.runDirectory])) === item.sha256, 'upstream research changed after adoption');
  }
  for (const name of verified.contract.forbiddenSyntheticEvidence) {
    const path = join(verified.project, 'docs', name), original = verified.baseline.files.find(file => file.path === 'docs/' + name);
    await safePath(path, [verified.project]);
    try {
      const bytes = await readArtifact(path, [verified.project]);
      assert(original && sha256(bytes) === original.sha256, 'worker created/modified synthetic template evidence: ' + name);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const rootNames = ['backgroundinformation', 'background_information'];
  let present = 0;
  for (const root of rootNames) {
    const candidate = join(verified.project, root); await safePath(candidate, [verified.project]);
    try { if ((await lstat(candidate)).isDirectory()) present++; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  assert(present === 1, 'Ambiguous research roots after integration');
  const researchFiles = await treeFiles(adoption.research.root);
  assert(researchFiles.filter(file => basename(file) === 'keywords.json').length === 1 &&
    researchFiles.filter(file => basename(file).endsWith('素材.md')).length === adoption.research.materials.length,
    'research material set changed after adoption');
  return adoption;
}
async function validatePages(context, adoption, byKind, requiredOutputs) {
  const project = context.inputs.projectPath;
  for (const kind of requiredOutputs) {
    const item = byKind.get(kind), path = join(project, 'docs', kind);
    assert(item?.path === path && Buffer.isBuffer(item.bytes), 'native content output must be the actual candidate/docs file: ' + kind);
    assert(sha256(await readArtifact(path, [project])) === sha256(item.bytes), 'native content output bytes mismatch: ' + kind);
  }
  const manifest = parse(byKind.get('CONTENT_PAGE_MANIFEST.json').bytes);
  assert(manifest.schema_version === 1 && manifest.game === context.inputs.gameIdentity && Array.isArray(manifest.pages), 'native content manifest identity mismatch');
  const keywords = keywordRows(parse(await readArtifact(adoption.research.keywords, [project])));
  assert(manifest.pages.length === keywords.length, 'content keyword coverage mismatch');
  const materials = new Map(adoption.research.materials.map(item => [item.keyword, item]));
  const counts = { PUBLISHED: 0, DRAFT: 0, BLOCKED: 0 }, seen = new Set(), published = new Map(), drafts = new Map(), keywordSources = new Map();
  const provenance = byKind.get('CONTENT_PROVENANCE.md').bytes.toString('utf8');
  for (const page of manifest.pages) {
    const material = materials.get(page.keyword);
    assert(material && !seen.has(page.keyword), 'content keyword coverage mismatch'); seen.add(page.keyword);
    assert(page.category === material.category && Object.hasOwn(counts, page.outcome), 'native page category/outcome mismatch'); counts[page.outcome]++;
    const expectedMaterial = resolve(adoption.research.keywordsRoot, page.material_file ?? '');
    const rootRelativeMaterial = resolve(project, page.material_file ?? '');
    assert(page.material_file && (expectedMaterial === material.path || rootRelativeMaterial === material.path) && basename(material.path) === materialName(page.keyword), 'page material lineage mismatch');
    assert(page.material_status === material.status, 'page material status differs from researched status');
    assert(!(material.status === 'BLOCKED' && page.outcome === 'PUBLISHED'), 'blocked research cannot publish');
    if (page.outcome === 'BLOCKED') { assert(!page.route && !page.source_file, 'blocked page must not expose route/source'); continue; }
    assert(provenance.includes(page.keyword) && provenance.includes(basename(material.path)) && provenance.includes(material.researchDate), 'page provenance is missing material/date lineage');
    if (page.outcome === 'PUBLISHED') {
      assert(material.urls.some(url => provenance.includes(url)) && material.versions.some(version => provenance.includes(version)), 'published page provenance is missing source/version evidence');
      assert(page.last_verified === material.researchDate || (typeof page.last_verified === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(page.last_verified) && provenance.includes(page.last_verified)), 'published page verification date lacks provenance');
      assert(page.route && page.source_file, 'published page lacks route/source');
      const route = routePath(page.route); assert(!published.has(route), 'duplicate published route'); published.set(route, page);
    } else if (page.route) {
      const route = routePath(page.route); assert(!drafts.has(route), 'duplicate draft route'); drafts.set(route, page);
    }
    if (page.source_file) {
      assert(typeof page.source_file === 'string' && !page.source_file.startsWith('/'), 'page source_file must be relative');
      const path = resolve(project, page.source_file); await readArtifact(path, [project]);
      keywordSources.set(path, page.outcome);
      const sourceRoute = staticSourceRoute(project, path);
      if (page.route && sourceRoute) assert(routePath(page.route) === sourceRoute, 'page source file does not correspond to its declared route');
      if (page.outcome === 'DRAFT' && !page.route) {
        if (!sourceRoute) throw incompatible('unsafe draft source without a verifiable static route');
        assert(!drafts.has(sourceRoute), 'duplicate draft source route'); drafts.set(sourceRoute, page);
      }
    }
  }
  assert(manifest.counts?.keywords === keywords.length && manifest.counts.published === counts.PUBLISHED && manifest.counts.draft === counts.DRAFT && manifest.counts.blocked === counts.BLOCKED, 'native content counts mismatch');
  for (const page of manifest.site_pages ?? []) {
    assert(page?.outcome === 'PUBLISHED' && page.source_file, 'existing non-keyword publication requires explicit source/outcome');
    const route = routePath(page.route); assert(!published.has(route) && !drafts.has(route), 'duplicate or draft non-keyword route');
    assert(!page.source_file.startsWith('/'), 'non-keyword source_file must be relative');
    const source = resolve(project, page.source_file);
    assert(!keywordSources.has(source), 'site_pages cannot republish a keyword or draft source');
    assert(context.existingProject.baseline.files.some(file => file.path === relative(project, source)), 'non-keyword site_pages source must exist in the original baseline');
    const sourceRoute = staticSourceRoute(project, source);
    if (sourceRoute) assert(route === sourceRoute, 'site_pages source file does not correspond to its declared route');
    await readArtifact(source, [project]); published.set(route, page);
  }
  for (const route of drafts.keys()) assert(!published.has(route), 'draft shares a published route');
  if (!published.has('/')) published.set('/', { route: '/', source_file: 'src/pages/index.astro', homepage: true });
  await readArtifact(join(project, 'src/pages/index.astro'), [project]);
  return { manifest, published, drafts };
}
async function staticOutputFiles(project) {
  const dist = join(project, 'dist'); await safePath(dist, [project]);
  try { assert((await lstat(dist)).isDirectory(), 'dist must be a directory'); }
  catch (error) { if (error.code === 'ENOENT') throw incompatible('rendered static Astro output is required; host build produced no dist'); throw error; }
  const files = await treeFiles(dist);
  if (!files.includes(join(dist, 'index.html')) && files.some(path => /^(server|client)\//.test(relative(dist, path))))
    throw incompatible('SSR output is unsupported; rendered static Astro output is required');
  assert(files.some(path => path.endsWith('.html')), 'host build produced no rendered HTML');
  return files;
}
async function hostBuildExistingContent(context, { packageJson, commands, save }) {
  const globalConfig = join(context.nativeDirectory, 'EMPTY_PACKAGE_MANAGER_GLOBAL.conf'), cache = join(context.nativeDirectory, '.npm-cache');
  await safePath(globalConfig, [context.nativeDirectory]); await safePath(cache, [context.nativeDirectory]);
  try { await writeFile(globalConfig, '', { flag: 'wx', mode: 0o600 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  const locks = context.existingContent.adoption.candidateAstro.dependencyLockfiles;
  const name = basename(locks[0].path), command = name === 'package-lock.json' ? 'npm' : name === 'pnpm-lock.yaml' ? 'pnpm' : name === 'yarn.lock' ? 'yarn' : 'bun';
  const scripts = ['check', 'typecheck', 'type-check', 'lint', 'test'].filter(name => typeof packageJson.scripts?.[name] === 'string');
  scripts.push('build');
  for (const script of scripts) {
    const configStat = await lstat(globalConfig);
    assert(configStat.isFile() && configStat.size === 0 && (configStat.mode & 0o777) === 0o600, 'host package-manager global configuration must remain empty and private');
    assert(sha256(await readArtifact(join(context.inputs.projectPath, 'package.json'), [context.inputs.projectPath])) === context.existingContent.adoption.candidateAstro.packageSha256,
      'package scripts changed during host validation');
    await verifyCandidateInvariants(context);
    // Package managers must not fetch or install dependencies while validating an adopted snapshot.
    assert(!/(?:\b(?:npm|pnpm|yarn|bun)\s+(?:install|add|update|upgrade|dlx)\b|\b(?:npx|bunx)\b)/.test(packageJson.scripts[script]), 'package validation script may install dependencies: ' + script);
    const item = { command, args: ['run', script], script, status: 'IN_PROGRESS' }; commands.push(item); await save();
    try {
      await runProcess(command, item.args, { cwd: context.inputs.projectPath, timeoutMs: 600000,
        env: { PATH: process.env.PATH, LANG: process.env.LANG ?? 'C', PYTHONDONTWRITEBYTECODE: '1',
          ASTRO_TELEMETRY_DISABLED: '1', CI: 'true', npm_config_offline: 'true', npm_config_ignore_scripts: 'true',
          npm_config_userconfig: '/dev/null', npm_config_globalconfig: globalConfig, npm_config_cache: cache,
          YARN_ENABLE_NETWORK: 'false', COREPACK_ENABLE_NETWORK: '0' } });
      item.status = 'PASSED'; await save();
    } catch (error) { item.status = 'FAILED'; await save(); throw error; }
  }
}
async function rebuildExistingContent(context, verified, adoption, build) {
  assert(typeof build === 'function', 'host build must be a trusted callback');
  const reportPath = join(context.nativeDirectory, 'EXISTING_CONTENT_BUILD.json'); await safePath(reportPath, [context.nativeDirectory]);
  const files = await verifyCandidateInvariants(context, verified.baseline), inputDigest = sha256(JSON.stringify(files));
  const packageJson = parse(await readArtifact(join(verified.project, 'package.json'), [verified.project]));
  const report = { schemaVersion: 1, status: 'IN_PROGRESS', builder: build === hostBuildExistingContent ? 'host-package-scripts' : 'trusted-injected-builder',
    game: context.inputs.gameIdentity, workspace: verified.project, packageSha256: adoption.candidateAstro.packageSha256, inputDigest, commands: [] };
  const save = () => writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  await save();
  const dist = join(verified.project, 'dist'); await safePath(dist, [verified.project]);
  await rm(dist, { recursive: true, force: true });
  try {
    const details = await build(context, { packageJson, commands: report.commands, save });
    await validatedAdoption(context, verified);
    const after = await verifyCandidateInvariants(context, verified.baseline);
    assert(sha256(JSON.stringify(after)) === inputDigest, 'candidate source changed during host build');
    await verifyBaseline(verified.baseline, verified.sourceEntry);
    const outputs = await staticOutputFiles(verified.project);
    report.outputDigest = sha256(JSON.stringify(await Promise.all(outputs.map(async path => [relative(dist, path), sha256(await readArtifact(path, [verified.project]))]))));
    if (details?.fixture) report.fixture = details.fixture;
    report.status = 'PASSED'; await save(); return { ...report, reportPath };
  } catch (error) {
    try { await verifyBaseline(verified.baseline, verified.sourceEntry); } catch (drift) { error = drift; }
    report.status = 'BLOCKED'; report.reason = error.message; await save();
    throw incompatible('host package validation/build failed: ' + error.message);
  }
}
async function inspectRenderedSeo(context, pages) {
  const project = context.inputs.projectPath, dist = join(project, 'dist'), origin = context.inputs.canonicalOrigin;
  const files = await staticOutputFiles(project), rendered = new Map(), htmlFiles = [];
  for (const path of files.filter(file => file.endsWith('.html'))) {
    const rel = relative(dist, path);
    const route = routePath('/' + rel.replace(/(?:^|\/)index\.html$/, '').replace(/\.html$/, ''));
    assert(!rendered.has(route), 'duplicate rendered route');
    const html = (await readArtifact(path, [project])).toString('utf8'), meta = metadata(html);
    rendered.set(route, { path, html, meta }); htmlFiles.push({ route, path, meta });
    assert(!html.includes('待确认'), 'rendered public implementation contains unresolved claims');
    if (pages.drafts.has(route) && !meta.noindex) throw incompatible('unsafe public draft mechanism: draft rendered route must use noindex');
    else if (!meta.noindex) assert(pages.published.has(route), 'indexable rendered route has no explicit published outcome: ' + route);
    for (const canonical of meta.canonicals) assert(routePath(absolute(canonical, origin, 'canonical').pathname) === route, 'canonical route mismatch');
    for (const og of meta.og) assert(routePath(absolute(og, origin, 'Open Graph').pathname) === route, 'Open Graph route mismatch');
    for (const match of html.matchAll(/<(?:a|link)\b[^>]*>/gi)) {
      const tag = htmlAttributes(match[0]);
      if (/^<link\b/i.test(match[0]) && tag.rel !== 'alternate') continue;
      const href = tag.href;
      if (!href || href.startsWith('#')) continue;
      let target; try { target = new URL(href, origin + route); } catch { continue; }
      if (target.origin === origin) assert(!pages.drafts.has(routePath(target.pathname)), 'draft is exposed through public navigation/related links');
    }
  }
  for (const [route, page] of pages.published) {
    const output = rendered.get(route); assert(output && !output.meta.noindex, 'published route is absent or noindex in rendered output: ' + route);
    assert(output.meta.canonicals.length === 1, 'published route must have exactly one canonical: ' + route);
    if (page.keyword) {
      const { title, description } = output.meta;
      assert(title.toLowerCase().includes(page.keyword.toLowerCase()) && description.toLowerCase().includes(page.keyword.toLowerCase()), 'rendered title/description must contain exact keyword');
      assert(title.length === page.title_length && description.length === page.description_length, 'declared metadata lengths differ from rendered output');
      const exception = Array.isArray(page.notes) && page.notes.some(note => typeof note === 'string' && note.trim());
      assert(exception || (title.length >= 40 && title.length <= 60 && description.length >= 140 && description.length <= 160), 'rendered metadata lengths violate native contract without an exception');
    }
  }
  const robotsPath = join(dist, 'robots.txt'), robots = (await readArtifact(robotsPath, [project])).toString('utf8');
  const sitemapFiles = files.filter(path => /^sitemap.*\.xml$/i.test(basename(path)));
  assert(sitemapFiles.length > 0, 'rendered sitemap is missing');
  const sitemapRoutes = new Set(), urls = [], indexes = new Set();
  for (const path of sitemapFiles) {
    const xml = (await readArtifact(path, [project])).toString('utf8');
    const values = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(match => decode(match[1].trim()));
    assert(values.length > 0, 'sitemap has no URLs');
    const index = /<sitemapindex(?:\s|>)/i.test(xml);
    for (const value of values) {
      const url = absolute(value, origin, 'sitemap'); urls.push(value);
      if (index) {
        const target = resolve(dist, '.' + url.pathname); assert(sitemapFiles.includes(target), 'sitemap index references a missing rendered sitemap'); indexes.add(target);
      } else {
        const route = routePath(url.pathname); assert(pages.published.has(route) && rendered.has(route) && !rendered.get(route).meta.noindex, 'sitemap route has no published outcome: ' + route);
        sitemapRoutes.add(route);
      }
    }
  }
  for (const route of pages.published.keys()) assert(sitemapRoutes.has(route), 'published route missing from sitemap: ' + route);
  const directives = [...robots.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim)].map(match => match[1]);
  assert(directives.length > 0, 'robots has no sitemap directive');
  for (const value of directives) assert(sitemapFiles.includes(resolve(dist, '.' + absolute(value, origin, 'robots sitemap').pathname)), 'robots sitemap target does not exist');
  // Apply the wildcard group with longest matching Allow/Disallow rule.
  const rules = []; let agents = [], groupRules = [];
  const finishGroup = () => { if (agents.includes('*')) rules.push(...groupRules); agents = []; groupRules = []; };
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim(), pair = line.match(/^([^:]+):\s*(.*)$/);
    if (!pair) continue;
    const key = pair[1].toLowerCase(), value = pair[2];
    if (key === 'user-agent') { if (groupRules.length) finishGroup(); agents.push(value.toLowerCase()); }
    else if (agents.length && ['allow', 'disallow'].includes(key)) groupRules.push({ key, value });
  }
  finishGroup();
  for (const route of pages.published.keys()) {
    const matches = rules.filter(rule => {
      if (!rule.value) return false;
      const pattern = '^' + rule.value.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      return new RegExp(pattern).test(route);
    }).sort((a, b) => b.value.length - a.value.length || (a.key === 'allow' ? -1 : 1));
    assert(matches[0]?.key !== 'disallow', 'robots blocks a published route: ' + route);
  }
  return { origin, outputRoot: dist, renderedRoutes: htmlFiles.map(item => item.route), sitemapRoutes: [...sitemapRoutes], robotsPath, sitemapFiles, urlsChecked: urls };
}
export async function validateExistingContentArtifacts(context, { byKind, run = runProcess, build = hostBuildExistingContent } = {}) {
  assert(byKind instanceof Map, 'existing content artifacts must be a Map of real files');
  const verified = await verifyExistingContentContext(context), adoption = await validatedAdoption(context, verified);
  await verifyCandidateInvariants(context, verified.baseline);
  const pages = await validatePages(context, adoption, byKind, verified.contract.requiredOutputs);
  const hostBuild = await rebuildExistingContent(context, verified, adoption, build);
  const seo = await inspectRenderedSeo(context, pages);
  const assetRoot = join(verified.project, 'public'); await safePath(assetRoot, [verified.project]);
  const assets = await treeFiles(assetRoot);
  for (const name of adoption.research.icon.members) {
    const matches = assets.filter(path => basename(path) === name);
    assert(matches.length === 1, 'installed favicon asset must resolve uniquely: ' + name);
    assert(sha256(await readArtifact(matches[0], [verified.project])) === adoption.research.icon.assets?.[name], 'installed favicon differs from verified ZIP: ' + name);
  }
  const nativeOutputPath = join(context.nativeDirectory, 'EXISTING_CONTENT_NATIVE_VALIDATION.json');
  await safePath(nativeOutputPath, [context.nativeDirectory]);
  await writeFile(nativeOutputPath, JSON.stringify({ status: 'PENDING_NATIVE_VALIDATION', nativeCopiedTemplatePreflightPassed: false }) + '\n', { mode: 0o600 });
  try {
    await run('python3', [join(verified.skillRoot, 'scripts/validate_integration.py'), '--game', context.inputs.gameIdentity,
      '--workspace', verified.project, '--background-dir', adoption.research.root, '--site-origin', seo.origin, '--output', nativeOutputPath],
      { cwd: context.nativeDirectory, timeoutMs: 30000, env: { PATH: process.env.PATH, PYTHONDONTWRITEBYTECODE: '1' } });
  } catch (error) {
    const diagnostic = parse(await readArtifact(nativeOutputPath, [context.nativeDirectory]));
    if (diagnostic.valid === false && diagnostic.game === context.inputs.gameIdentity && diagnostic.workspace === verified.project && Array.isArray(diagnostic.errors) && diagnostic.errors.length)
      throw Object.assign(Error('Native integration validation failed: ' + diagnostic.errors.slice(0, 10).join('; ')), { validationFile: nativeOutputPath });
    throw error;
  }
  const native = parse(await readArtifact(nativeOutputPath, [context.nativeDirectory]));
  assert(native.valid === true && Array.isArray(native.errors) && native.errors.length === 0 && native.game === context.inputs.gameIdentity && native.workspace === verified.project,
    'native content integration validation failed');
  await verifyBaseline(verified.baseline, verified.sourceEntry);
  await verifyExistingContentContext(context);
  const validation = { schemaVersion: 1, contractId: verified.contract.id, nativeCopiedTemplatePreflightPassed: false, sourceWrites: false,
    baselineDigest: verified.baseline.digest, nativeOutputPath, native, seo, hostBuild, counts: pages.manifest.counts };
  const output = join(context.nativeDirectory, 'EXISTING_CONTENT_VALIDATION.json'); await safePath(output, [context.nativeDirectory]);
  await writeFile(output, JSON.stringify(validation, null, 2) + '\n', { mode: 0o600 });
  return validation;
}
