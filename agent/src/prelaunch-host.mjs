import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { runProcess } from './process.mjs';
import { safePath } from './files.mjs';
import { publishedRoutes, snapshotSiteEvidence } from './site-evidence.mjs';
import { sanitizeDiagnosticText } from './diagnostics.mjs';
import { siteProcessEnvironment } from './site-process-environment.mjs';

const launchChromium = async () => (await import('playwright')).chromium.launch();
const decodeXml = text => text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

export async function collectPrelaunch(context, { url, fetchUrl = fetch, launchBrowser = launchChromium, run = runProcess } = {}) {
  const project = context.inputs.projectPath;
  const directory = join(project, 'docs/prelaunch', context.runId, 'host-evidence');
  await safePath(directory, [project]);
  await mkdir(join(directory, 'screenshots'), { recursive: true });
  const origin = new URL(url).origin, expectedOrigin = new URL('https://' + context.inputs.domain).origin;
  const routeFor = (value, base = url) => {
    try {
      const target = new URL(value, base);
      return [origin, expectedOrigin].includes(target.origin) && !target.username && !target.password ? target.pathname + target.search : null;
    } catch { return null; }
  };
  const responses = new Map(), http = [];
  const request = async route => {
    if (responses.has(route)) return responses.get(route);
    const result = { route, url: new URL(route, origin).href, status: null, contentType: '', text: '' };
    try {
      // Redirects are recorded, never followed to production or an unrelated host.
      const response = await fetchUrl(result.url, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
      result.status = response.status;
      result.contentType = response.headers?.get('content-type') ?? '';
      if (/xml|html|text/.test(result.contentType)) result.text = await response.text();
      else await response.body?.cancel();
    } catch (error) { result.error = sanitizeDiagnosticText(error.message); }
    responses.set(route, result);
    const { text, ...record } = result; http.push(record);
    return result;
  };
  await request('/robots.txt');
  const sitemapRoutes = [], sitemaps = ['/sitemap.xml'], sitemapSeen = new Set();
  for (let index = 0; index < sitemaps.length; index++) {
    const sitemap = sitemaps[index]; if (sitemapSeen.has(sitemap)) continue; sitemapSeen.add(sitemap);
    const result = await request(sitemap);
    const locs = [...result.text.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map(match => decodeXml(match[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '')));
    for (const loc of locs) {
      const route = routeFor(loc, result.url); if (route === null) continue;
      if (/<sitemapindex\b/i.test(result.text)) sitemaps.push(route);
      else sitemapRoutes.push(route);
    }
  }
  const published = await publishedRoutes(context), routes = [...new Set([...published, ...sitemapRoutes])];
  const pages = [], linksToCheck = new Set(routes);
  const browser = await launchBrowser();
  try {
    for (const [index, route] of routes.entries()) {
      await request(route);
      const record = { path: route, viewports: [] }; pages.push(record);
      for (const width of published.includes(route) ? [1440, 390, 360, 768] : [1440, 390]) {
        const browserContext = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, serviceWorkers: 'block', acceptDownloads: false });
        try {
          const page = await browserContext.newPage();
          const capture = { width, status: null, consoleErrors: [], pageErrors: [], failedRequests: [], screenshot: null };
          record.viewports.push(capture);
          page.on('console', message => { if (message.type() === 'error') capture.consoleErrors.push(sanitizeDiagnosticText(message.text())); });
          page.on('pageerror', error => capture.pageErrors.push(sanitizeDiagnosticText(error.message)));
          page.on('requestfailed', request => capture.failedRequests.push({ url: sanitizeDiagnosticText(request.url()), method: request.method(), error: sanitizeDiagnosticText(request.failure()?.errorText) }));
          try {
            const response = await page.goto(new URL(route, origin).href, { waitUntil: 'networkidle', timeout: 30000 });
            capture.status = response?.status() ?? null;
            for (const href of await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(anchor => anchor.href))) {
              const linked = routeFor(href, new URL(route, origin)); if (linked !== null) linksToCheck.add(linked);
            }
            const path = join(directory, 'screenshots', `${index}-${width}.png`);
            await page.screenshot({ path, fullPage: true }); capture.screenshot = path;
          } catch (error) { capture.error = sanitizeDiagnosticText(error.message); }
        } finally { await browserContext.close(); }
      }
    }
  } finally { await browser.close(); }
  const links = [], checked = new Set();
  for (const route of linksToCheck) {
    if (checked.has(route)) continue;
    if (checked.size >= 10000) throw Error(`SITE_LINK_LIMIT_EXCEEDED: ${project}; more than 10000 internal URLs; review generated links`);
    checked.add(route);
    const result = await request(route), { text, ...record } = result; links.push(record);
    if (/html/i.test(result.contentType)) {
      for (const match of text.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
        const linked = routeFor(decodeXml(match[1] ?? match[2] ?? match[3]), result.url);
        if (linked !== null) linksToCheck.add(linked);
      }
    }
  }
  const pkg = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
  const command = await lstat(join(project, 'pnpm-lock.yaml')).then(() => 'pnpm', error => { if (error.code !== 'ENOENT') throw error; return 'npm'; });
  const checks = [];
  for (const name of ['typecheck', 'lint', 'test', 'build']) {
    if (!pkg.scripts?.[name]) continue;
    const check = { script: name, command: [command, 'run', name], exitCode: null };
    try { check.exitCode = (await run(command, ['run', name], { cwd: project, env: siteProcessEnvironment(), timeoutMs: 600000 }))?.exitCode ?? 0; }
    catch (error) { check.exitCode = error.exitCode ?? null; check.error = sanitizeDiagnosticText(error.message); }
    checks.push(check);
  }
  const evidencePath = join(directory, 'HOST_EVIDENCE.json');
  await writeFile(evidencePath, JSON.stringify({ schema_version: 1, run_id: context.runId, game: context.inputs.gameIdentity,
    project_path: project, preview_url: url, expected_origin: expectedOrigin, routes, pages,
    coverage: { routes_expected: routes.length, routes_checked: pages.length }, http, links, checks,
    limitations: ['Production URLs were mapped to the local production preview. External links were not requested.'] }, null, 2) + '\n');
  return { ...await snapshotSiteEvidence(directory), evidencePath, routes };
}
