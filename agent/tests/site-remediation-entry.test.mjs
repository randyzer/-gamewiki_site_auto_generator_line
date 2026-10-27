import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { createHostPublicationObservation } from '../src/route-publication.mjs';
import {
  previewProductionSiteRemediation,
} from '../src/site-remediation-entry.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const d = character => character.repeat(64);

async function fixture(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'site-remediation-entry-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workspace = join(root, 'workspace');
  const runId = 'legacy-run';
  const runDirectory = join(workspace, 'runs', runId);
  const projectPath = join(root, 'site');
  await mkdir(join(runDirectory, 'artifacts'), { recursive: true });
  await mkdir(join(projectPath, 'app'), { recursive: true });
  await mkdir(join(projectPath, 'backgroundinformation'), { recursive: true });
  await writeFile(join(projectPath, 'app/page.tsx'), 'export default function Page(){return null}\n');
  await writeFile(join(projectPath, 'backgroundinformation/keywords.md'), '# keywords\n');
  await writeFile(join(projectPath, 'package.json'), '{"scripts":{"build":"next build","start":"next start"}}\n');
  await writeFile(join(projectPath, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');

  const publicationPath = join(runDirectory, 'artifacts', 'route-publication.json');
  const originalPublicationManifest = {
    kind: 'ROUTE_PUBLICATION_MANIFEST_V1', schemaVersion: 1, runId,
    pages: [{ kind: 'SITE', keyword: null, materialStatus: null,
      disposition: 'PUBLISH', route: '/', sourceFile: null, noindexRequired: false }],
  };
  const publicationBytes = Buffer.from(`${JSON.stringify(originalPublicationManifest)}\n`);
  await writeFile(publicationPath, publicationBytes);
  const stages = [
    { skill: 'game-homepage-icon-research', status: 'PASSED', artifacts: [], checkpoint: {} },
    { skill: 'game-innerpage-keyword-information-research', status: 'PARTIAL', artifacts: [],
      checkpoint: { researchHandoff: { approved: true, sha256: d('1'),
        approvalSha256: d('2') } } },
    { skill: 'game-site-template-selector', status: 'PASSED',
      artifacts: [{ kind: 'template', path: publicationPath, sha256: sha256(publicationBytes) }],
      checkpoint: { attempt: 1 } },
    { skill: 'game-site-content-integrator', status: 'PASSED', artifacts: [{
      kind: 'ROUTE_PUBLICATION_MANIFEST.json', path: publicationPath,
      sha256: sha256(publicationBytes),
    }], checkpoint: { attempt: 2, launchReadiness: { bindingDigest: d('3') },
      finalizedReconciliation: { previewDigest: d('4') } } },
    { skill: 'game-site-ui-ux-audit-optimizer', status: 'PASSED', artifacts: [],
      checkpoint: { projectDigest: d('5') } },
    { skill: 'game-site-prelaunch-gate', status: 'PASSED', artifacts: [], checkpoint: {} },
    { skill: 'game-site-deploy-and-measurement', status: 'WAITING_FOR_USER', artifacts: [],
      checkpoint: {} },
  ];
  const manifest = { schemaVersion: 1, runId, workspace, sequence: 9,
    deploymentExecuted: false, inputs: { projectPath, siteRevision: 'v1' }, stages };
  await writeFile(join(runDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { workspace, runId, projectPath, originalPublicationManifest };
}

test('production preview builds immutable legacy evidence and invokes the trusted controller', async t => {
  const f = await fixture(t);
  const previewId = '11111111-1111-4111-8111-111111111111';
  let captured;
  const observation = createHostPublicationObservation({ projectDigest: d('0'),
    observedRoutes: ['/'], pages: [{ route: '/', robots: 'noindex', inSitemap: true,
      inNavigation: true, linkedFromPublicPages: true, sourceFileExposed: false,
      dynamicProof: 'PROVEN' }], indexingAuthorization: 'NOT_CLEARED',
    validatorVersion: 'host-route-v2', observationArtifacts: [
      { path: '/', status: 200, sha256: d('6') },
    ] });
  const result = await previewProductionSiteRemediation({ workspace: f.workspace,
    runId: f.runId }, {
    uuid: () => previewId,
    buildAndServe: async projectPath => ({ url: 'http://127.0.0.1:12345',
      session: { projectPath }, stop: async () => {} }),
    observeCurrentPublication: async input => ({ ...observation,
      projectDigest: input.projectDigest,
      observationDigest: createHostPublicationObservation({ projectDigest: input.projectDigest,
        observedRoutes: ['/'], pages: observation.pages,
        indexingAuthorization: 'NOT_CLEARED', validatorVersion: 'host-route-v2',
        observationArtifacts: observation.observationArtifacts }).observationDigest,
      routeInventoryDigest: createHostPublicationObservation({ projectDigest: input.projectDigest,
        observedRoutes: ['/'], pages: observation.pages,
        indexingAuthorization: 'NOT_CLEARED', validatorVersion: 'host-route-v2',
        observationArtifacts: observation.observationArtifacts }).routeInventoryDigest,
    }),
    createTrustedController: options => ({ preview: async input => {
      captured = { options, input };
      return { status: 'PREVIEW', preview: { previewId }, confirmationCode: 'confirm' };
    } }),
  });
  assert.equal(result.status, 'PREVIEW');
  assert.equal(captured.options.hostEvidence.projectPath, f.projectPath);
  assert.equal(captured.options.hostEvidence.baseline.baselineKind,
    'REACCEPTED_CURRENT_BASELINE');
  assert.equal(captured.options.hostEvidence.baseline.historicalEquivalence, false);
  assert.deepEqual(captured.options.hostEvidence.baseline.routes, ['/']);
  assert.deepEqual(captured.options.hostEvidence.baseline.historicalEvidenceGaps,
    ['FINAL_STAGE4_INVENTORY_UNAVAILABLE']);
  assert.ok(captured.options.hostEvidence.baseline.protectedInputs.some(item =>
    item.path === 'backgroundinformation/keywords.md'));
  assert.equal(captured.options.hostEvidence.acceptanceIdentity.transactionId,
    `site-remediation-${previewId}`);
  assert.equal(captured.input.mode, 'LEGACY_CURRENT_BASELINE');
  assert.equal(captured.input.researchApprovalDigest, d('2'));
  assert.equal(captured.input.oldProjectDigest, d('5'));
  assert.equal(captured.input.newProjectDigest,
    captured.options.hostEvidence.baseline.projectDigest);
  assert.match(captured.input.operatorSummarySha256, /^[a-f0-9]{64}$/);
  assert.equal((await stat(join(f.projectPath, 'backgroundinformation/keywords.md'))).isFile(), true);
  assert.equal((await readFile(join(f.workspace, 'runs', f.runId, 'manifest.json'), 'utf8'))
    .includes('"sequence": 9'), true);
});
