import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runProcess } from '../src/process.mjs';

const register = fileURLToPath(new URL('../src/playwright-register.mjs', import.meta.url));
const script = fileURLToPath(new URL('../src/site-audit-interactions.mjs', import.meta.url));

async function fixtureServer(t, handler) {
  const server = createServer(handler);
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', error => error ? reject(error) : resolve()));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

async function collect(t, url, routes) {
  const directory = await mkdtemp(join(tmpdir(), 'site-audit-interactions-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = join(directory, 'interactions.json');
  await runProcess(process.execPath, ['--import', register, script, '--url', url,
    '--run-id', 'interaction-fixture', '--output', output,
    ...routes.flatMap(route => ['--route', route])]);
  return JSON.parse(await readFile(output, 'utf8'));
}

test('host interaction collector requests only published routes and opens hidden search', async t => {
  const hits = { safe: 0, api: 0, danger: 0 };
  const url = await fixtureServer(t, (request, response) => {
    if (request.url === '/safe') { hits.safe++; response.end('<main>Safe route</main>'); return; }
    if (request.url === '/api/action') { hits.api++; response.end('mutated'); return; }
    if (request.url === '/danger') { hits.danger++; response.end('mutated'); return; }
    response.setHeader('content-type', 'text/html');
    response.end(`<a href="/safe">Safe</a><a href="/api/action">API</a><a href="/danger">Danger</a>
      <button aria-label="Search" onclick="document.querySelector('#query').hidden=false">Search</button>
      <input id="query" hidden type="search" oninput="document.querySelector('#empty').hidden=false">
      <p id="empty" hidden>No results</p>`);
  });
  const result = await collect(t, url, ['/', '/safe']);
  assert.equal(hits.api, 0); assert.equal(hits.danger, 0);
  assert.ok(hits.safe > 0);
  const home = result.routes.find(route => route.route === '/');
  assert.equal(home.inventory.unlistedInternalLinkCount, 2);
  assert.equal(home.checks.find(item => item.category === 'search-trigger').status, 'PASS');
  assert.equal(home.checks.find(item => item.category === 'search-query').status, 'PASS');
  assert.equal(home.checks.find(item => item.category === 'search-empty-state').status, 'PASS');
  assert.equal(result.completion, 'COMPLETE');
});

test('unexercised search trigger is NOT_TESTED rather than NOT_APPLICABLE', async t => {
  const url = await fixtureServer(t, (_request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end('<button aria-label="Search">Search</button>');
  });
  const result = await collect(t, url, ['/']);
  const search = result.routes[0].checks.find(item => item.category === 'search-trigger');
  assert.equal(search.status, 'NOT_TESTED');
  assert.equal(result.completion, 'INCOMPLETE');
});

test('absent search is grounded by the route inventory', async t => {
  const url = await fixtureServer(t, (_request, response) => {
    response.setHeader('content-type', 'text/html'); response.end('<main>No interactive controls</main>');
  });
  const result = await collect(t, url, ['/']);
  assert.equal(result.routes[0].inventory.search, 'ABSENT');
  assert.equal(result.routes[0].checks.find(item => item.category === 'search-trigger').status, 'NOT_APPLICABLE');
  assert.equal(result.completion, 'COMPLETE');
});

test('unclassified interactive controls keep the audit incomplete', async t => {
  const url = await fixtureServer(t, (_request, response) => {
    response.setHeader('content-type', 'text/html'); response.end('<button>Unknown action</button>');
  });
  const result = await collect(t, url, ['/']);
  assert.equal(result.routes[0].inventory.unclassifiedControlCount, 1);
  assert.equal(result.routes[0].checks.find(item => item.category === 'unclassified-controls').status, 'NOT_TESTED');
  assert.equal(result.completion, 'INCOMPLETE');
});

test('disclosure controls beyond the execution bound remain NOT_TESTED', async t => {
  const url = await fixtureServer(t, (_request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(Array.from({ length: 13 }, (_, index) =>
      `<details><summary>Disclosure ${index + 1}</summary><p>Detail</p></details>`).join(''));
  });
  const result = await collect(t, url, ['/']);
  const disclosure = result.routes[0].checks.find(item => item.category === 'dialog-disclosure');
  assert.equal(result.routes[0].inventory.dialogDisclosureControlCount, 13);
  assert.equal(disclosure.status, 'NOT_TESTED');
  assert.match(disclosure.detail, /1 visible.*execution bound/i);
  assert.equal(result.completion, 'INCOMPLETE');
});

test('visible unclassified form controls keep the audit incomplete without submission', async t => {
  let posts = 0;
  const url = await fixtureServer(t, (request, response) => {
    if (request.method === 'POST') posts++;
    response.setHeader('content-type', 'text/html');
    response.end('<form method="post"><input type="text" name="unsafe"></form>');
  });
  const result = await collect(t, url, ['/']);
  assert.equal(posts, 0);
  assert.equal(result.routes[0].inventory.formControlCount, 1);
  assert.ok(result.routes[0].inventory.unclassifiedControlCount >= 1);
  assert.equal(result.routes[0].checks.find(item => item.category === 'unclassified-controls').status, 'NOT_TESTED');
  assert.equal(result.completion, 'INCOMPLETE');
});

test('read-only form controls are safely classified without blocking completion', async t => {
  const url = await fixtureServer(t, (_request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end('<label>Reference <input type="text" value="fixed" readonly></label>');
  });
  const result = await collect(t, url, ['/']);
  assert.equal(result.routes[0].inventory.formControlCount, 1);
  assert.equal(result.routes[0].inventory.unclassifiedControlCount, 0);
  assert.equal(result.routes[0].checks.find(item => item.category === 'unclassified-controls').status, 'NOT_APPLICABLE');
  assert.equal(result.completion, 'COMPLETE');
});

test('an exercised broken search is a complete FAIL finding', async t => {
  const url = await fixtureServer(t, (_request, response) => {
    response.setHeader('content-type', 'text/html'); response.end('<input type="search" aria-label="Search">');
  });
  const result = await collect(t, url, ['/']);
  assert.equal(result.routes[0].checks.find(item => item.category === 'search-query').status, 'PASS');
  assert.equal(result.routes[0].checks.find(item => item.category === 'search-empty-state').status, 'FAIL');
  assert.equal(result.completion, 'COMPLETE');
});

test('published route redirects are not followed by the collector', async t => {
  let redirectedTargetHits = 0;
  const url = await fixtureServer(t, (request, response) => {
    if (request.url === '/redirect') { response.writeHead(302, { location: '/danger' }); response.end(); return; }
    if (request.url === '/danger') redirectedTargetHits++;
    response.end('<main>Danger</main>');
  });
  const result = await collect(t, url, ['/redirect']);
  assert.equal(redirectedTargetHits, 0);
  assert.equal(result.routes[0].checks.find(item => item.category === 'route-load').status, 'FAIL');
  assert.equal(result.completion, 'INCOMPLETE');
});
