// Run with: node --test scripts/favicon_io_convert.test.mjs
// Uses a local stand-in for favicon.io so the behavior is checked without the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const script = fileURLToPath(new URL('./favicon_io_convert.mjs', import.meta.url));
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4c40000000049454e44ae426082', 'hex');

// Mirrors the real page: <input type=file id=image>, previews after upload, then #download-package.
function fakeSite({ download = 'zip', inputId = 'image' } = {}) {
  const page = `<!doctype html><title>PNG to Favicon Converter</title>
<input type="file" id="${inputId}" accept="image/png">
<div id="previews" hidden>favicon-16x16.png favicon-32x32.png</div>
<img src="/slow.png" alt="">
<button id="download-package" disabled>Download favicon package</button>
<script>
window.addEventListener('load', () => setTimeout(() => document.getElementById('${inputId}').addEventListener('change', e => {
  if (!e.target.files.length) return;
  document.getElementById('previews').hidden = false;
  ${download === 'never-enabled' ? '' : "setTimeout(() => { document.getElementById('download-package').disabled = false; }, 300);"}
}), 0));
document.getElementById('download-package').addEventListener('click', () => {
  ${download === 'zip' ? "const a = document.createElement('a'); a.href = '/favicon_io.zip'; a.download = 'favicon_io.zip'; a.click();" : ''}
});
</script>`;
  const server = createServer((req, res) => {
    if (req.url.startsWith('/favicon-converter')) { res.setHeader('content-type', 'text/html'); return res.end(page); }
    if (req.url === '/slow.png') { setTimeout(() => { res.setHeader('content-type', 'image/png'); res.end(PNG); }, 500); return; }
    if (req.url === '/favicon_io.zip') { res.setHeader('content-type', 'application/zip'); return res.end(Buffer.from('PK\x03\x04SYNTHETIC')); }
    res.statusCode = 404; res.end();
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () =>
    resolve({ url: `http://127.0.0.1:${server.address().port}/favicon-converter/`, close: () => server.close() })));
}

async function workdir(t) {
  const dir = await mkdtemp(join(tmpdir(), 'favicon-io-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const png = join(dir, 'master.png');
  await writeFile(png, PNG);
  return { dir, png, zip: join(dir, 'out', 'Demo图标.zip') };
}

const convert = (args, timeout = 60000) => run(process.execPath, [script, ...args], { timeout });

test('uploads the PNG, downloads the package and writes it to the requested path', async t => {
  const site = await fakeSite(); t.after(site.close);
  const w = await workdir(t);
  const { stdout } = await convert(['--png', w.png, '--out', w.zip, '--url', site.url]);
  assert.equal((await readFile(w.zip)).toString(), 'PK\x03\x04SYNTHETIC');
  const report = JSON.parse(stdout);
  assert.equal(report.status, 'DOWNLOADED');
  assert.equal(report.zip, w.zip);
  assert.match(report.sha256, /^[0-9a-f]{64}$/);
  assert.equal(report.url, site.url);
});

test('a changed page without the file input fails with the selector it looked for', async t => {
  const site = await fakeSite({ inputId: 'renamed' }); t.after(site.close);
  const w = await workdir(t);
  await assert.rejects(convert(['--png', w.png, '--out', w.zip, '--url', site.url, '--timeout-ms', '3000']),
    err => /FAVICON_IO_PAGE_CHANGED: .*input#image/.test(err.stderr));
  await assert.rejects(stat(w.zip), { code: 'ENOENT' });
});

test('a button that never becomes enabled fails with the selector', async t => {
  const site = await fakeSite({ download: 'never-enabled' }); t.after(site.close);
  const w = await workdir(t);
  await assert.rejects(convert(['--png', w.png, '--out', w.zip, '--url', site.url, '--timeout-ms', '3000']),
    err => /FAVICON_IO_PAGE_CHANGED: button#download-package did not become enabled/.test(err.stderr));
  await assert.rejects(stat(w.zip), { code: 'ENOENT' });
});

test('a download that never starts fails without writing a partial ZIP', async t => {
  const site = await fakeSite({ download: 'none' }); t.after(site.close);
  const w = await workdir(t);
  await assert.rejects(convert(['--png', w.png, '--out', w.zip, '--url', site.url, '--timeout-ms', '3000']),
    err => /FAVICON_IO_DOWNLOAD_FAILED/.test(err.stderr));
  await assert.rejects(stat(w.zip), { code: 'ENOENT' });
});

test('an existing output is never overwritten', async t => {
  const site = await fakeSite(); t.after(site.close);
  const w = await workdir(t);
  await convert(['--png', w.png, '--out', w.zip, '--url', site.url]);
  await assert.rejects(convert(['--png', w.png, '--out', w.zip, '--url', site.url]),
    err => /FAVICON_IO_OUTPUT_EXISTS: .*Demo图标\.zip/.test(err.stderr));
});

test('bad arguments fail before a browser starts', async t => {
  const w = await workdir(t);
  await assert.rejects(convert(['--png', join(w.dir, 'missing.png'), '--out', w.zip]),
    err => /FAVICON_IO_INPUT_INVALID: .*missing\.png/.test(err.stderr));
  await writeFile(join(w.dir, 'not.png'), 'text');
  await assert.rejects(convert(['--png', join(w.dir, 'not.png'), '--out', w.zip]),
    err => /FAVICON_IO_INPUT_INVALID: .*not a PNG/.test(err.stderr));
  await assert.rejects(convert(['--png', w.png]), err => /FAVICON_IO_INPUT_INVALID: --out/.test(err.stderr));
  await assert.rejects(convert(['--png', w.png, '--out', w.zip, '--url', 'http://evil.example/']),
    err => /FAVICON_IO_INPUT_INVALID: --url/.test(err.stderr));
});
