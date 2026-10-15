import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deflateSync } from 'node:zlib';
import { convertIconOnHost, pngHeader } from '../src/favicon-io-host.mjs';

// Minimal valid PNG with the given size and colour type (6 = RGBA, 2 = RGB).
function png(width, height, colorType = 6) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    return Buffer.concat([length, body, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = colorType;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.alloc(1))), chunk('IEND', Buffer.alloc(0))]);
}

async function iconDirectory(t) {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'favicon-host-')));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

const report = zip => ({ stdout: JSON.stringify({ status: 'DOWNLOADED', zip, sha256: 'b'.repeat(64) }) + '\n' });

test('reads size and colour type from the PNG header', async t => {
  const dir = await iconDirectory(t);
  await writeFile(join(dir, 'a.png'), png(1254, 1254));
  assert.deepEqual(await pngHeader(join(dir, 'a.png')), { width: 1254, height: 1254, colorType: 6 });
  await writeFile(join(dir, 'b.png'), 'not a png');
  await assert.rejects(pngHeader(join(dir, 'b.png')), /ICON_PNG_INVALID: .*b\.png is not a PNG/);
});

test('a square master is resized to 512 with sips, then converted with the Skill script', async t => {
  const dir = await iconDirectory(t), calls = [];
  await writeFile(join(dir, 'icon-master.png'), png(1254, 1254));
  const result = await convertIconOnHost({ iconDirectory: dir, skillRoot: '/SKILL', run: async (command, args) => {
    calls.push([command, ...args]);
    if (command === '/usr/bin/sips') { await writeFile(args.at(-1), png(512, 512)); return {}; }
    return report(join(dir, 'favicon_io.zip'));
  } });
  assert.deepEqual(calls[0], ['/usr/bin/sips', '-z', '512', '512', join(dir, 'icon-master.png'), '--out', join(dir, 'icon-512.png')]);
  assert.deepEqual(calls[1].slice(1), ['/SKILL/scripts/favicon_io_convert.mjs', '--png', join(dir, 'icon-512.png'), '--out', join(dir, 'favicon_io.zip')]);
  assert.equal(result.sha256, 'b'.repeat(64));
  assert.equal(result.png, join(dir, 'icon-512.png'));
});

test('an icon-512.png the worker already resized is used as is', async t => {
  const dir = await iconDirectory(t), calls = [];
  await writeFile(join(dir, 'icon-512.png'), png(512, 512));
  await convertIconOnHost({ iconDirectory: dir, skillRoot: '/SKILL', run: async (command) => { calls.push(command); return report(join(dir, 'favicon_io.zip')); } });
  assert.deepEqual(calls, [process.execPath]);
});

test('missing, non-square, wrong-size or alpha-less icons fail with the file and the reason', async t => {
  const dir = await iconDirectory(t), run = async () => { throw Error('must not run'); };
  await assert.rejects(convertIconOnHost({ iconDirectory: dir, skillRoot: '/SKILL', run }), /ICON_PNG_MISSING: neither .*icon-512\.png nor .*icon-master\.png/);
  await writeFile(join(dir, 'icon-master.png'), png(1200, 900));
  await assert.rejects(convertIconOnHost({ iconDirectory: dir, skillRoot: '/SKILL', run }), /ICON_PNG_INVALID: .*icon-master\.png is 1200x900/);
  await writeFile(join(dir, 'icon-512.png'), png(256, 256));
  await assert.rejects(convertIconOnHost({ iconDirectory: dir, skillRoot: '/SKILL', run }), /ICON_PNG_INVALID: .*icon-512\.png is 256x256, expected 512x512/);
  await writeFile(join(dir, 'icon-512.png'), png(512, 512, 2));
  await assert.rejects(convertIconOnHost({ iconDirectory: dir, skillRoot: '/SKILL', run }), /ICON_PNG_INVALID: .*no alpha channel/);
});

test('a script failure surfaces its FAVICON_IO_* line', async t => {
  const dir = await iconDirectory(t);
  await writeFile(join(dir, 'icon-512.png'), png(512, 512));
  await assert.rejects(convertIconOnHost({ iconDirectory: dir, skillRoot: '/SKILL', run: async () => {
    throw Error('Worker exited unsuccessfully: 2; FAVICON_IO_UNREACHABLE: https://favicon.io/favicon-converter/: net::ERR_NAME_NOT_RESOLVED');
  } }), /^Error: FAVICON_IO_UNREACHABLE: https:\/\/favicon\.io\/favicon-converter\/: net::ERR_NAME_NOT_RESOLVED$/);
});
