import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveHomepageFixtureSnapshot } from '../src/v2/homepage-fixture-derivation.mjs';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
const outputRoot = join(repositoryRoot, 'agent/tests/fixtures/v2/homepage');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const source = Object.freeze({
  manifest: {
    role: 'RUN_MANIFEST',
    path: 'agent/runs/wallpaper-engine-002/manifest.json',
    sha256: '44aad1d5ed4746e8a71521e0943d48c97ba0060bc95ff767396a759c17dd3864',
  },
  report: {
    role: 'HOMEPAGE_REPORT',
    path: 'agent/runs/wallpaper-engine-002/artifacts/0/1/0-Wallpaper Engine攻略站首页调研信息.md',
    sha256: '14a8ad95d884a115a1559e4b7d6363ad7dbee5e1577c6f63a88f0080f1ef9a84',
  },
  icon: {
    role: 'ICON_ARCHIVE',
    path: 'agent/runs/wallpaper-engine-002/artifacts/0/1/1-Wallpaper Engine图标.zip',
    sha256: '7111d2d70efc4c1bd9fff1acfbc2fce9354039077ba8a0861eccee977373dfe9',
  },
  completion: {
    role: 'COMPLETION_REPORT',
    path: 'agent/runs/wallpaper-engine-002/artifacts/0/1/2-COMPLETION_REPORT.md',
    sha256: 'ac2daf6fe64eaec44188b606f048754adcd25d184399f0f12c25d9dc883e51c0',
  },
});

async function verifiedBytes(item) {
  const bytes = await readFile(join(repositoryRoot, item.path));
  const actual = sha256(bytes);
  if (actual !== item.sha256) throw Error(`HOMEPAGE_FIXTURE_SOURCE_DRIFT: ${item.path} ${actual}`);
  return bytes;
}

const [manifestBytes, reportBytes, iconBytes, completionBytes] = await Promise.all([
  verifiedBytes(source.manifest), verifiedBytes(source.report), verifiedBytes(source.icon),
  verifiedBytes(source.completion),
]);
const derived = deriveHomepageFixtureSnapshot({ source, manifestBytes, reportBytes, iconBytes,
  completionBytes });
await mkdir(outputRoot, { recursive: true });
for (const [path, bytes] of derived.derivedFiles) await writeFile(join(outputRoot, path), bytes);
await writeFile(join(outputRoot, 'fixture-manifest.json'),
  `${JSON.stringify(derived.fixtureManifest, null, 2)}\n`);
console.log(JSON.stringify({ outputRoot, sources: derived.fixtureManifest.sources.length,
  members: derived.fixtureManifest.iconArchive.members.length }));
