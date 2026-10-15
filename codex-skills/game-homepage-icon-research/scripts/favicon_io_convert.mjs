#!/usr/bin/env node
// Convert a verified 512x512 PNG on https://favicon.io/favicon-converter/ and save the downloaded package.
// Usage: node scripts/favicon_io_convert.mjs --png master.png --out "/abs/{game}图标.zip" [--timeout-ms 90000]
// Prints one JSON line on success. Exits non-zero with a FAVICON_IO_* reason on failure; never writes a partial ZIP.
import { readFile, mkdir, rename, rm, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, basename } from 'node:path';
import { parseArgs } from 'node:util';

const OFFICIAL_URL = 'https://favicon.io/favicon-converter/';
// Selectors observed on the live page (2026-10-15); a mismatch means the site changed and needs review.
const FILE_INPUT = 'input#image[type="file"]';
const DOWNLOAD_BUTTON = 'button#download-package';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const fail = (code, detail) => { throw Object.assign(Error(`${code}: ${detail}`), { reason: code }); };

async function exists(path) {
  try { await lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function readArguments() {
  const { values } = parseArgs({ options: { png: { type: 'string' }, out: { type: 'string' },
    url: { type: 'string' }, 'timeout-ms': { type: 'string' } } });
  if (!values.png || !isAbsolute(values.png)) fail('FAVICON_IO_INPUT_INVALID', `--png must be an absolute path, got ${JSON.stringify(values.png)}`);
  if (!values.out || !isAbsolute(values.out) || !values.out.endsWith('.zip'))
    fail('FAVICON_IO_INPUT_INVALID', `--out must be an absolute .zip path, got ${JSON.stringify(values.out)}`);
  // Only the real site, or a loopback stand-in used by the tests.
  const url = values.url ?? OFFICIAL_URL;
  if (url !== OFFICIAL_URL && !/^http:\/\/127\.0\.0\.1:\d+\//.test(url))
    fail('FAVICON_IO_INPUT_INVALID', `--url must be ${OFFICIAL_URL}, got ${JSON.stringify(url)}`);
  const timeoutMs = Number(values['timeout-ms'] ?? 90000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000) fail('FAVICON_IO_INPUT_INVALID', `--timeout-ms ${values['timeout-ms']}`);
  let png;
  try { png = await readFile(values.png); }
  catch (error) { fail('FAVICON_IO_INPUT_INVALID', `cannot read ${values.png} (${error.code})`); }
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) fail('FAVICON_IO_INPUT_INVALID', `${values.png} is not a PNG`);
  if (await exists(values.out)) fail('FAVICON_IO_OUTPUT_EXISTS', `${values.out} already exists; choose a new path`);
  return { png: values.png, out: values.out, url, timeoutMs };
}

async function convert({ png, out, url, timeoutMs }) {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { fail('FAVICON_IO_BROWSER_UNAVAILABLE', 'playwright is not installed; run npm ci in this scripts directory'); }
  const staging = join(dirname(out), `.${basename(out)}.partial`);
  await mkdir(dirname(out), { recursive: true });
  const browser = await chromium.launch().catch(error => fail('FAVICON_IO_BROWSER_UNAVAILABLE', error.message.split('\n')[0]));
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);
    // Wait for full load: the page's app attaches its upload handler late, and an earlier upload is silently ignored.
    try { await page.goto(url, { waitUntil: 'load', timeout: timeoutMs }); }
    catch (error) { fail('FAVICON_IO_UNREACHABLE', `${url}: ${error.message.split('\n')[0]}`); }
    const input = page.locator(FILE_INPUT);
    if (await input.count() !== 1) fail('FAVICON_IO_PAGE_CHANGED', `expected one ${FILE_INPUT} on ${url}`);
    await input.setInputFiles(png);
    // The button is on the page from the start but stays disabled until the image has been processed.
    const button = page.locator(`${DOWNLOAD_BUTTON}:not([disabled])`);
    try { await button.waitFor({ state: 'visible', timeout: timeoutMs }); }
    catch { fail('FAVICON_IO_PAGE_CHANGED', `${DOWNLOAD_BUTTON} did not become enabled after upload`); }
    let download;
    try { [download] = await Promise.all([page.waitForEvent('download', { timeout: timeoutMs }), button.click()]); }
    catch (error) { fail('FAVICON_IO_DOWNLOAD_FAILED', `no download after clicking ${DOWNLOAD_BUTTON}: ${error.message.split('\n')[0]}`); }
    const failure = await download.failure();
    if (failure) fail('FAVICON_IO_DOWNLOAD_FAILED', failure);
    await download.saveAs(staging);
    const bytes = await readFile(staging);
    if (bytes.subarray(0, 2).toString('latin1') !== 'PK') fail('FAVICON_IO_DOWNLOAD_FAILED', `${download.suggestedFilename()} is not a ZIP`);
    // Rename only after the full file is on disk, so a failure never leaves a half-written ZIP at --out.
    await rename(staging, out);
    return { status: 'DOWNLOADED', url, zip: out, sha256: createHash('sha256').update(bytes).digest('hex'),
      suggestedFilename: download.suggestedFilename(), bytes: bytes.length };
  } finally {
    await rm(staging, { force: true });
    await browser.close();
  }
}

try {
  console.log(JSON.stringify(await convert(await readArguments())));
} catch (error) {
  console.error(error.reason ? error.message : `FAVICON_IO_FAILED: ${error.message}`);
  process.exitCode = 2;
}
