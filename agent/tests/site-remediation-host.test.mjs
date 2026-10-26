import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import {
  createCurrentSiteBaseline,
  createImmutableIntegrationLineage,
  createSiteAcceptanceIdentity,
} from '../src/site-acceptance-contract.mjs';
import {
  createDerivedPublicationAttestation,
  createPublicationEvidenceBody,
} from '../src/effective-publication-attestation.mjs';
import { projectContentDigest } from '../src/project-content-digest.mjs';
import { sourceFiles } from '../src/project-baseline.mjs';
import { collectSiteRemediationHostEvidence } from '../src/site-remediation-host.mjs';

const d = character => character.repeat(64);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function fixture(t) {
  const projectPath = await realpath(await mkdtemp(join(tmpdir(), 'site-remediation-host-')));
  t.after(() => rm(projectPath, { recursive: true, force: true }));
  await mkdir(join(projectPath, 'app'), { recursive: true });
  await mkdir(join(projectPath, 'backgroundinformation'), { recursive: true });
  await writeFile(join(projectPath, 'app/page.tsx'), 'export default function Page(){return null}\n');
  const protectedPath = join(projectPath, 'backgroundinformation/keywords.md');
  await writeFile(protectedPath, '# keywords\n');
  const inventory = (await sourceFiles(projectPath)).map(file => ({ path: file.path,
    mode: file.mode, byteLength: file.size, sha256: file.sha256 }));
  const protectedStat = await stat(protectedPath);
  const protectedInputs = [{ path: relative(projectPath, protectedPath),
    mode: protectedStat.mode & 0o777, byteLength: protectedStat.size,
    sha256: sha256(await readFile(protectedPath)) }];
  const projectDigest = await projectContentDigest(projectPath);
  const lineage = createImmutableIntegrationLineage({ runId: 'run', siteRevision: 'site-v1',
    manifestSequence: 4, manifestSha256: d('a'), researchHandoffSha256: d('3'),
    researchApprovalDigest: d('4'), stage3CheckpointDigest: d('b'),
    stage3ArtifactDigests: [d('c')], stage4CheckpointDigest: d('d'),
    stage4ArtifactDigests: [d('1')], originalPublicationManifestSha256: d('1'),
    originalLaunchReadinessBindingDigest: d('5'), finalizedTransactionDigest: d('e') });
  const baseline = createCurrentSiteBaseline({ baselineKind: 'REACCEPTED_CURRENT_BASELINE',
    historicalEquivalence: false, digestPolicyVersion: 'project-content-v1', projectPath,
    files: inventory, projectDigest, routes: ['/'], protectedInputs,
    historicalEvidenceGaps: ['FINAL_STAGE4_INVENTORY_UNAVAILABLE'] });
  const evidenceBody = createPublicationEvidenceBody({
    originalPublicationManifestSha256: d('1'), lineageDigest: lineage.lineageDigest,
    researchHandoffSha256: d('3'), researchApprovalDigest: d('4'),
    originalLaunchReadinessBindingDigest: d('5'), baselineKind: baseline.baselineKind,
    baselineDigest: baseline.baselineDigest, remediationScopeDigest: d('6'), projectDigest,
    observedRoutes: ['/'], pages: [{ route: '/', originalDisposition: 'PUBLISH',
      effectiveDisposition: 'PUBLISH', materialStatus: 'COMPLETED', robots: 'noindex',
      inSitemap: true, inNavigation: true, linkedFromPublicPages: true,
      sourceFileExposed: false, dynamicProof: 'STATIC' }],
    validationStatus: 'VERIFIED', indexingAuthorization: 'NOT_CLEARED',
    hostObservationDigest: d('7'), validatorVersion: 'host-route-v1',
  });
  const acceptanceIdentity = createSiteAcceptanceIdentity({
    lineageDigest: evidenceBody.lineageDigest, baselineDigest: baseline.baselineDigest,
    projectDigest, publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
    remediationScopeDigest: evidenceBody.remediationScopeDigest,
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111',
  });
  const attestation = createDerivedPublicationAttestation({ evidenceBody, acceptanceIdentity });
  const expected = { lineageDigest: evidenceBody.lineageDigest,
    researchApprovalDigest: evidenceBody.researchApprovalDigest, oldProjectDigest: d('8'),
    newProjectDigest: projectDigest, baselineDigest: baseline.baselineDigest,
    remediationScopeDigest: evidenceBody.remediationScopeDigest,
    publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
    attestationDigest: attestation.attestationDigest,
    acceptanceRevision: acceptanceIdentity.acceptanceRevision,
    protectedInputsDigest: baseline.protectedInputsDigest, operatorSummarySha256: d('9') };
  const originalPublicationManifest = { pages: [{ route: '/', disposition: 'PUBLISH' }] };
  const manifest = { runId: 'run', inputs: { siteRevision: 'site-v1' }, stages: [
    { skill: 'game-homepage-icon-research', artifacts: [], checkpoint: {} },
    { skill: 'game-innerpage-keyword-information-research', artifacts: [], checkpoint: {
      researchHandoff: { sha256: d('3'), approvalSha256: d('4') } } },
    { skill: 'game-site-template-selector', artifacts: [{ sha256: d('c') }], checkpoint: {} },
    { skill: 'game-site-content-integrator', artifacts: [{
      kind: 'ROUTE_PUBLICATION_MANIFEST.json', sha256: d('1') }],
    checkpoint: { launchReadiness: { bindingDigest: d('5') } } },
  ] };
  return { projectPath, protectedPath, lineage, baseline, publicationEvidence: evidenceBody, acceptanceIdentity,
    attestation, expected, originalPublicationManifest, manifest };
}

test('trusted Host evidence is recomputed from the current project and contracts', async t => {
  const f = await fixture(t);
  const observed = await collectSiteRemediationHostEvidence(f);
  assert.deepEqual(observed, f.expected);
});

test('trusted Host evidence rejects changed project and unprovable routes', async t => {
  const f = await fixture(t);
  await writeFile(join(f.projectPath, 'app/page.tsx'), 'changed\n');
  await assert.rejects(() => collectSiteRemediationHostEvidence(f),
    error => error.code === 'SITE_REMEDIATION_PROJECT_BASELINE_CHANGED');

  const g = await fixture(t);
  await mkdir(join(g.projectPath, 'app/[slug]'));
  await writeFile(join(g.projectPath, 'app/[slug]/page.tsx'), 'export default()=>null\n');
  await assert.rejects(() => collectSiteRemediationHostEvidence(g),
    error => ['SITE_REMEDIATION_PROJECT_BASELINE_CHANGED',
      'SITE_REMEDIATION_ROUTE_UNPROVABLE'].includes(error.code));
});

test('trusted Host evidence rejects protected input drift', async t => {
  const f = await fixture(t);
  await writeFile(f.protectedPath, '# changed\n');
  await assert.rejects(() => collectSiteRemediationHostEvidence(f),
    error => error.code === 'SITE_REMEDIATION_PROTECTED_INPUT_CHANGED');
});

test('trusted Host evidence rejects changed immutable Stage 2 through Stage 4 lineage', async t => {
  const f = await fixture(t);
  f.manifest.stages[3].artifacts[0].sha256 = d('f');
  await assert.rejects(() => collectSiteRemediationHostEvidence(f),
    error => error.code === 'SITE_REMEDIATION_LINEAGE_CHANGED');
});
