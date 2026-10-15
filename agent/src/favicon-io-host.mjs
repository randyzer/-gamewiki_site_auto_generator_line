import { readFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { runProcess } from './process.mjs';

// The Codex sandbox blocks Chromium (macOS denies its mach service registration), so the favicon.io step
// of the homepage Skill runs here, outside the sandbox, using the Skill's own script.
export const ICON_FILES = Object.freeze({ master: 'icon-master.png', icon512: 'icon-512.png', zip: 'favicon_io.zip' });
export const FAVICON_IO_URL = 'https://favicon.io/favicon-converter/';

async function exists(path) {
  try { await lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

// Width, height and colour type straight from the IHDR chunk; colour type 6 is RGBA.
export async function pngHeader(path) {
  const bytes = await readFile(path);
  if (bytes.length < 26 || bytes.readUInt32BE(0) !== 0x89504e47 || bytes.toString('latin1', 12, 16) !== 'IHDR')
    throw Error(`ICON_PNG_INVALID: ${path} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

// Picks the 512 icon (resizing a square master with sips, which keeps alpha), then runs the Skill script.
export async function convertIconOnHost({ iconDirectory, skillRoot, run = runProcess, timeoutMs = 180000 }) {
  const zip = join(iconDirectory, ICON_FILES.zip);
  const icon512 = join(iconDirectory, ICON_FILES.icon512), master = join(iconDirectory, ICON_FILES.master);
  if (!await exists(icon512)) {
    if (!await exists(master)) throw Error(`ICON_PNG_MISSING: neither ${icon512} nor ${master} exists`);
    const { width, height } = await pngHeader(master);
    if (width !== height) throw Error(`ICON_PNG_INVALID: ${master} is ${width}x${height}; the Skill needs a square master`);
    await run('/usr/bin/sips', ['-z', '512', '512', master, '--out', icon512], { timeoutMs: 30000 });
  }
  const header = await pngHeader(icon512);
  if (header.width !== 512 || header.height !== 512) throw Error(`ICON_PNG_INVALID: ${icon512} is ${header.width}x${header.height}, expected 512x512`);
  if (header.colorType !== 6) throw Error(`ICON_PNG_INVALID: ${icon512} has no alpha channel (PNG colour type ${header.colorType})`);
  let stdout;
  try {
    ({ stdout = '' } = await run(process.execPath, [join(skillRoot, 'scripts', 'favicon_io_convert.mjs'), '--png', icon512, '--out', zip],
      { timeoutMs }) ?? {});
  } catch (error) {
    // runProcess keeps the script's FAVICON_IO_* stderr line in the message.
    throw Error(error.message.match(/FAVICON_IO_[A-Z_]+: [^\n;]*/)?.[0] ?? error.message);
  }
  const report = JSON.parse(stdout.trim().split('\n').at(-1));
  if (report.status !== 'DOWNLOADED' || report.zip !== zip) throw Error(`FAVICON_IO_FAILED: unexpected script report ${stdout.trim()}`);
  return { ...report, png: icon512 };
}
