import { dirname, join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { readArtifact, sha256, treeFiles, parseArtifactJson } from './files.mjs';
import { runProcess } from './process.mjs';
import { STAGE, stageDefinition, findStage } from './stages.mjs';
import { validateExistingContentArtifacts } from './existing-content-validator.mjs';
import { createRoutePublicationManifest, ROUTE_PUBLICATION_ARTIFACT } from './route-publication.mjs';
import { validateHostInteractions, validateAuditExecutionAcceptance } from './stage5-audit-policy.mjs';
import { validatePrelaunchExecutionAcceptance } from './stage6-prelaunch-policy.mjs';
import { canonicalJson } from './contracts/canonical-json.mjs';

const assert = (ok, message) => { if (!ok) throw Error(message); };

export async function normalizePrelaunchRoutePublication(context, bytes, sourcePath) {
  if (!context.hostEvidence) return bytes;
  assert(Array.isArray(context.hostEvidence.routePublicationViolations),
    'Prelaunch route publication proof is missing');
  let expected = { manifestKind: 'ROUTE_PUBLICATION_MANIFEST_V1',
    violations: context.hostEvidence.routePublicationViolations };
  if (context.hostEvidence.evidencePath) {
    const evidence = parseArtifactJson(await readArtifact(context.hostEvidence.evidencePath,
      [context.inputs.projectPath]), context.hostEvidence.evidencePath);
    assert(evidence.routePublication?.manifestKind === 'ROUTE_PUBLICATION_MANIFEST_V1' &&
      Array.isArray(evidence.routePublication.violations) &&
      canonicalJson(evidence.routePublication.violations) ===
        canonicalJson(context.hostEvidence.routePublicationViolations),
    'Prelaunch route publication evidence differs from the Host bundle');
    expected = evidence.routePublication;
  }
  const report = parseArtifactJson(bytes, sourcePath);
  const canonical = report.route_publication;
  const legacy = report.routePublication;
  if (canonical && legacy)
    assert(canonicalJson(canonical) === canonicalJson(legacy),
      'Prelaunch report has conflicting route publication fields');
  assert(canonicalJson(canonical ?? legacy) === canonicalJson(expected),
    'Prelaunch route publication findings mismatch Host evidence');
  if (!legacy) return bytes;
  delete report.routePublication;
  report.route_publication = expected;
  return Buffer.from(JSON.stringify(report, null, 2) + '\n');
}

export function normalizeDeploymentPlanBlockers(context, bytes, sourcePath) {
  if (context.mode !== 'plan' || context.launchReadiness?.deploymentAuthorized !== false) return bytes;
  const expected = context.launchReadiness.unresolvedBlockers;
  assert(Array.isArray(expected), 'Host launch blocker proof is missing');
  const plan = parseArtifactJson(bytes, sourcePath);
  const hasCanonical = Object.hasOwn(plan, 'unresolved_blockers');
  const hasLegacy = Object.hasOwn(plan, 'unresolvedBlockers');
  assert(hasCanonical || hasLegacy, 'Blocked plan must preserve every Host launch blocker');
  if (hasCanonical && hasLegacy)
    assert(canonicalJson(plan.unresolved_blockers) === canonicalJson(plan.unresolvedBlockers),
      'Blocked plan has conflicting deployment blocker fields');
  const blockers = hasCanonical ? plan.unresolved_blockers : plan.unresolvedBlockers;
  assert(canonicalJson(blockers) === canonicalJson(expected),
    'Blocked plan must preserve every Host launch blocker');
  if (!hasLegacy) return bytes;
  delete plan.unresolvedBlockers;
  plan.unresolved_blockers = expected;
  return Buffer.from(JSON.stringify(plan, null, 2) + '\n');
}

export async function validateNativeArtifacts(skill, context, result, { run = runProcess, existingContentBuild } = {}) {
  stageDefinition(skill);
  assert(['PASSED', 'PARTIAL', 'FAILED', 'BLOCKED', 'WAITING_FOR_USER'].includes(result?.status), 'Unknown worker status');
  assert(Array.isArray(result.artifacts) && Array.isArray(result.missing_inputs) && Array.isArray(result.evidence), 'Invalid worker response');
  const roots = [context.nativeDirectory, context.inputs.projectPath];
  const artifacts = [], byKind = new Map();
  for (const descriptor of result.artifacts) {
    assert(typeof descriptor.kind === 'string' && !byKind.has(descriptor.kind), 'Duplicate artifact role');
    const bytes = await readArtifact(descriptor.path, roots);
    if (descriptor.kind.endsWith('.json')) parseArtifactJson(bytes, descriptor.path);
    const item = { ...descriptor, bytes, originalSha256: sha256(bytes) };
    byKind.set(item.kind, item);
    artifacts.push(item);
  }
  if (skill === STAGE.KEYWORD_RESEARCH) {
    const workerOwned = new Set(['keywords.json', '关键词处理记录.md', '关键词素材汇总.md']);
    for (const kind of byKind.keys()) assert(workerOwned.has(kind),
      `Unexpected keyword artifact role ${kind}; keyword material artifacts are host-derived`);
  }
  if (skill === STAGE.CONTENT_INTEGRATION)
    assert(!byKind.has(ROUTE_PUBLICATION_ARTIFACT),
      `${ROUTE_PUBLICATION_ARTIFACT} is host-derived`);
  if (result.status !== 'PASSED') return { ...result, artifacts: [] };
  assert(result.missing_inputs.length === 0 && result.evidence.length > 0, 'False success with missing inputs/evidence');
  const hostDerived = new Set(['KEYWORD_MATERIALS.md', ROUTE_PUBLICATION_ARTIFACT]);
  const required = context.requiredArtifacts.filter(kind => !hostDerived.has(kind));
  for (const key of required) assert(byKind.has(key), 'Required native output missing: ' + key);
  const scriptRoot = join(dirname(context.skillLock.source), 'scripts');
  const python = async (name, args) => run('python3', [join(scriptRoot, name), ...args], { cwd: context.nativeDirectory, timeoutMs: 30000 });
  const get = kind => byKind.get(kind);
  if (skill === STAGE.HOMEPAGE_RESEARCH) {
    await python('validate_outputs.py', [
      '--markdown', get('HOMEPAGE_RESEARCH.md').path,
      '--zip', get('ICON.zip').path,
      '--game-name', context.inputs.gameIdentity
    ]);
    // The upstream Skill validator only verifies ZIP filenames/CRC. Reject
    // placeholder bytes that happen to be wrapped in a seven-member archive.
    await run('python3', [join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'verify-favicon-package.py'), get('ICON.zip').path],
      { cwd: context.nativeDirectory, timeoutMs: 30000 });
  }
  if (skill === STAGE.KEYWORD_RESEARCH) {
    const workdir = dirname(get('keywords.json').path);
    const rawKeywordsCopy = context.inputCopyPaths?.rawKeywordsFile ?? context.inputs.rawKeywordsFile;
    await python('validate_outputs.py', ['--workdir', workdir, '--raw-keywords', rawKeywordsCopy]);
    const data = parseArtifactJson(get('keywords.json').bytes, get('keywords.json').path);
    const keywords = data.categories.flatMap(c => c.keywords);
    assert(keywords.length > 0, 'No researched keywords');
    const parts = [];
    for (const keyword of keywords) {
      const file = join(workdir, keyword.replace(/[\\/:*?"<>|\x00]/g, '-') + '素材.md');
      const bytes = await readArtifact(file, roots);
      assert(/^- 状态: COMPLETED\s*$/m.test(bytes.toString()), 'Incomplete keyword research cannot pass');
      parts.push({ path: file, sha256: sha256(bytes), content: bytes.toString('utf8') });
      artifacts.push({ kind: 'keyword-material:' + keyword, path: file, bytes, originalSha256: sha256(bytes) });
    }
    artifacts.push({ kind: 'KEYWORD_MATERIALS.md', path: get('keywords.json').path,
      derived: true,
      bytes: Buffer.from(parts.map(p => `# ${basename(p.path)}\nSource: ${p.path}\nSHA256: ${p.sha256}\n\n${p.content}`).join('\n\n')) });
  }
  if (skill === STAGE.TEMPLATE_SELECTION) {
    const manifest = parseArtifactJson(get('template-copy-manifest.json').bytes, get('template-copy-manifest.json').path);
    assert(manifest.game === context.inputs.gameIdentity && manifest.destination === context.inputs.projectPath && manifest.source_unchanged === true && manifest.destination_verified === true, 'Template identity or verification mismatch');
    assert(manifest.files && !Array.isArray(manifest.files) && Object.keys(manifest.files).length > 0, 'Empty template copy manifest');
    for (const [relativePath, digest] of Object.entries(manifest.files)) {
      assert(typeof relativePath === 'string' && /^[a-f0-9]{64}$/.test(digest), 'Invalid template file evidence');
      const actual = resolve(context.inputs.projectPath, relativePath);
      assert(sha256(await readArtifact(actual, [context.inputs.projectPath])) === digest, 'Template copy content mismatch');
    }
  }
  if (skill === STAGE.CONTENT_INTEGRATION) {
    if (context.inputs.mode === 'existing-project') {
      await validateExistingContentArtifacts(context, { byKind, run, ...(existingContentBuild ? { build: existingContentBuild } : {}) });
      for (const [kind, path] of [['EXISTING_PROJECT_ADOPTION.json', context.existingContent.adoptionJsonPath],
        ['EXISTING_PROJECT_ADOPTION_REPORT.md', context.existingContent.adoptionMarkdownPath],
        ['EXISTING_CONTENT_VALIDATION.json', join(context.nativeDirectory, 'EXISTING_CONTENT_VALIDATION.json')]]) {
        const bytes = await readArtifact(path, roots);
        artifacts.push({ kind, path, bytes, originalSha256: sha256(bytes) });
      }
    }
    const data = parseArtifactJson(get('CONTENT_PAGE_MANIFEST.json').bytes, get('CONTENT_PAGE_MANIFEST.json').path);
    assert(data.schema_version === 1 && data.game === context.inputs.gameIdentity && Array.isArray(data.pages), 'Content manifest identity mismatch');
    const upstream = findStage(context.upstream, STAGE.KEYWORD_RESEARCH).artifacts.find(a => a.kind === 'keywords.json');
    const keywords = context.researchHandoff?.manifest
      ? context.researchHandoff.manifest.materials.map(item => item.keyword)
      : parseArtifactJson(await readArtifact(upstream.path, [context.runDirectory]), upstream.path)
        .categories.flatMap(c => c.keywords);
    assert(data.pages.length === keywords.length && new Set(data.pages.map(p => p.keyword)).size === keywords.length, 'Content keyword coverage mismatch');
    const counts = { PUBLISHED: 0, DRAFT: 0, BLOCKED: 0 };
    for (const page of data.pages) {
      assert(keywords.includes(page.keyword) && Object.hasOwn(counts, page.outcome), 'Unknown page keyword/outcome');
      counts[page.outcome]++;
      assert(['COMPLETED', 'PARTIAL', 'BLOCKED'].includes(page.material_status), 'Unknown material status');
      if (page.outcome === 'BLOCKED') assert(!page.route && !page.source_file, 'Blocked page must not publish');
      else if (page.source_file) await readArtifact(resolve(context.inputs.projectPath, page.source_file), [context.inputs.projectPath]);
      if (page.outcome === 'PUBLISHED') assert(page.route?.startsWith('/') && page.source_file && page.material_file, 'Published page lacks lineage');
      assert(get('CONTENT_PROVENANCE.md').bytes.toString().includes(page.keyword) || page.outcome === 'BLOCKED', 'Missing page provenance');
    }
    assert(data.counts?.keywords === keywords.length && data.counts.published === counts.PUBLISHED && data.counts.draft === counts.DRAFT && data.counts.blocked === counts.BLOCKED, 'Page counts mismatch');
    const publication = createRoutePublicationManifest(context, data);
    const publicationPath = join(context.nativeDirectory, ROUTE_PUBLICATION_ARTIFACT);
    const publicationBytes = Buffer.from(JSON.stringify(publication, null, 2) + '\n');
    await writeFile(publicationPath, publicationBytes, { flag: 'wx', mode: 0o600 });
    artifacts.push({ kind: ROUTE_PUBLICATION_ARTIFACT, path: publicationPath,
      bytes: publicationBytes, originalSha256: sha256(publicationBytes) });
  }
  if (skill === STAGE.UI_UX_AUDIT) {
    await python('validate_audit.py', ['--workspace', context.inputs.projectPath, '--run-dir', dirname(get('UI_UX_AUDIT.json').path), ...(context.mode === 'optimize' ? ['--expect-optimization'] : [])]);
    const audit = parseArtifactJson(get('UI_UX_AUDIT.json').bytes, get('UI_UX_AUDIT.json').path);
    assert(JSON.stringify(audit.viewports) === '[360,390,768,1024,1440,1920]', 'UI audit viewport coverage mismatch');
    assert(context.hostEvidence?.interactionsPath && context.hostEvidence?.interactionsSha256,
      'Complete host interaction evidence is required');
    const interactions = await validateHostInteractions(context.hostEvidence.interactionsPath,
      context.hostEvidence.interactionsSha256, context.runId, context.hostEvidence.routes);
    validateAuditExecutionAcceptance(audit, context.hostEvidence.interactionsSha256,
      context.stage5SiteVerdict);
    const expectedRoutes = [...(context.hostEvidence.routes ?? [])].sort();
    const interactionRoutes = interactions.value.routes.map(item => item.route).sort();
    const reportRoutes = audit.routes.map(item => item.route).sort();
    assert(expectedRoutes.length > 0 && JSON.stringify(interactionRoutes) === JSON.stringify(expectedRoutes) &&
      JSON.stringify(reportRoutes) === JSON.stringify(expectedRoutes), 'UI audit route coverage mismatch');
    for (const failure of interactions.failures) assert(audit.findings.some(finding =>
      finding.route === failure.route && `${finding.category} ${finding.evidence}`.toLowerCase()
        .includes(failure.category.toLowerCase())),
    `UI audit omitted failed host interaction: ${failure.route} ${failure.category}`);
    for (const file of await treeFiles(join(dirname(get('UI_UX_AUDIT.json').path), 'screenshots'))) {
      artifacts.push({ kind: 'screenshot:' + file, path: file, bytes: await readArtifact(file, roots) });
    }
  }
  if (skill === STAGE.PRELAUNCH_ACCEPTANCE) {
    const reportArtifact = get('PRELAUNCH_ACCEPTANCE.json');
    let report = parseArtifactJson(reportArtifact.bytes, reportArtifact.path);
    await python('validate_report.py', [get('PRELAUNCH_ACCEPTANCE.json').path]);
    assert(report.run_id === context.runId && report.game === context.inputs.gameIdentity && report.project_path === context.inputs.projectPath && report.expected_domain === 'https://' + context.inputs.domain, 'Prelaunch identity mismatch');
    assert(['可以上线', '可以上线，但有P2待办', '暂不建议上线'].includes(report.disposition), 'Invalid prelaunch disposition');
    validatePrelaunchExecutionAcceptance(report, context.launchReadiness);
    assert((context.launchReadiness.status === 'CLEARED') ===
      ['可以上线', '可以上线，但有P2待办'].includes(report.disposition),
    'Prelaunch disposition contradicts Host launch readiness');
    assert(Array.isArray(report.pages) && report.pages.length > 0 && report.coverage && typeof report.coverage === 'object', 'Empty prelaunch coverage');
    assert(Number.isInteger(report.coverage.routes_expected) && report.coverage.routes_expected > 0 && report.coverage.routes_checked === report.coverage.routes_expected && report.pages.length === report.coverage.routes_checked, 'Incomplete prelaunch coverage');
    if (context.hostEvidence) {
      assert(JSON.stringify(report.pages.map(page => page.path).sort()) ===
        JSON.stringify([...context.hostEvidence.routes].sort()), 'Prelaunch host route coverage mismatch');
      const normalizedBytes = await normalizePrelaunchRoutePublication(context,
        reportArtifact.bytes, reportArtifact.path);
      if (!normalizedBytes.equals(reportArtifact.bytes)) {
        reportArtifact.bytes = normalizedBytes;
        reportArtifact.originalSha256 = sha256(normalizedBytes);
        report = parseArtifactJson(normalizedBytes, reportArtifact.path);
      }
      if (context.launchReadiness.status === 'CLEARED')
        assert(context.hostEvidence.routePublicationViolations.length === 0,
          'Cleared prelaunch cannot retain route publication violations');
    }
  }
  if (skill === STAGE.DEPLOYMENT_PLAN && context.mode === 'execute') {
    const report = parseArtifactJson(get('DEPLOYMENT_REPORT.json').bytes, get('DEPLOYMENT_REPORT.json').path);
    // A PASSED execution must have put the site live on the confirmed domain; anything less is not done.
    assert(report.deployment === 'PRODUCTION LIVE',
      `DEPLOYMENT_REPORT_INVALID: deployment is ${JSON.stringify(report.deployment)}, expected "PRODUCTION LIVE"`);
    let origin = null;
    try { origin = new URL(report.production_url).origin; } catch { /* reported below with the raw value */ }
    assert(origin === 'https://' + context.inputs.domain,
      `DEPLOYMENT_REPORT_INVALID: production_url ${JSON.stringify(report.production_url)} is not https://${context.inputs.domain}`);
  } else if (skill === STAGE.DEPLOYMENT_PLAN) {
    const planArtifact = get('DEPLOYMENT_PLAN.json');
    const normalizedBytes = normalizeDeploymentPlanBlockers(context,
      planArtifact.bytes, planArtifact.path);
    if (!normalizedBytes.equals(planArtifact.bytes)) {
      planArtifact.bytes = normalizedBytes;
      planArtifact.originalSha256 = sha256(normalizedBytes);
    }
    const plan = parseArtifactJson(planArtifact.bytes, planArtifact.path);
    const launchBlocked = context.launchReadiness?.deploymentAuthorized === false;
    if (launchBlocked) {
      assert(plan.schema_version === 1 && plan.status === 'BLOCKED' &&
        plan.confirmation?.status === 'NOT_AUTHORIZED_FOR_DEPLOYMENT' &&
        JSON.stringify(plan.unresolved_blockers) === JSON.stringify(context.launchReadiness.unresolvedBlockers),
      'Blocked plan must preserve every Host launch blocker');
    } else assert(plan.schema_version === 1 && plan.status === 'AWAITING_CONFIRMATION' &&
      plan.confirmation?.status === 'AWAITING_CONFIRMATION', 'Plan must await confirmation');
    assert(plan.project?.path === context.inputs.projectPath && plan.project.repository === context.inputs.repo && plan.project.branch === context.inputs.branch, 'Deployment project mismatch');
    assert(plan.domain?.production_origin === 'https://' + context.inputs.domain && plan.github_sync?.push_authorized === false, 'Deployment domain/authorization mismatch');
    for (const key of ['checks', 'risks', 'rollback']) assert(Array.isArray(plan[key]), 'Missing deployment plan section');
    assert(plan.architecture && plan.hosting && plan.measurement, 'Incomplete deployment plan');
  }
  return { ...result, artifacts: artifacts.map((item, i) => ({ kind: item.kind,
    sourcePath: item.path, sourceSha256: item.derived ? null : item.originalSha256 ?? sha256(item.bytes),
    path: join(context.outputDirectory, `${i}-${basename(item.path)}`),
    runId: context.runId, projectPath: context.inputs.projectPath, gameIdentity: context.inputs.gameIdentity,
    content: item.bytes.toString('base64'), encoding: 'base64' })) };
}
