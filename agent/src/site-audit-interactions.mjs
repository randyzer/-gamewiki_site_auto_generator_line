import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const values = (name, argv = process.argv.slice(2)) => argv.flatMap((value, index) => value === name ? [argv[index + 1]] : []);
const value = name => values(name)[0];
const baseUrl = value('--url');
const output = value('--output');
const runId = value('--run-id');
const routes = values('--route');
if (!baseUrl || !output || !runId || !routes.length) throw Error('SITE_AUDIT_INTERACTIONS_ARGUMENTS_INVALID');

const check = (category, status, detail) => ({ category, status, detail });
const visible = locator => locator.count().then(async count => {
  for (let index = 0; index < count; index++) if (await locator.nth(index).isVisible().catch(() => false)) return locator.nth(index);
  return null;
});

async function auditRoute(page, context, route) {
  const checks = [];
  const response = await page.goto(new URL(route, baseUrl).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!response || response.status() >= 400) checks.push(check('route-load', 'FAIL', `HTTP ${response?.status() ?? 'NO_RESPONSE'}`));
  else checks.push(check('route-load', 'PASS', `HTTP ${response.status()}`));

  const hrefs = await page.locator('a[href]').evaluateAll((links, origin) => [...new Set(links.map(link => link.href)
    .filter(href => { try { const url = new URL(href); return url.origin === origin && !url.hash &&
      !/(?:^|\/)(?:logout|log-out|signout|sign-out|delete|remove)(?:\/|$)/i.test(url.pathname); } catch { return false; } }))].slice(0, 12), new URL(baseUrl).origin);
  if (!hrefs.length) checks.push(check('internal-navigation', 'NOT_APPLICABLE', 'No internal links were rendered'));
  else {
    const failures = [];
    for (const href of hrefs) {
      try { const result = await context.request.get(href, { timeout: 15000 }); if (result.status() >= 400) failures.push(`${href} HTTP ${result.status()}`); }
      catch (error) { failures.push(`${href} ${error.message}`); }
    }
    checks.push(check('internal-navigation', failures.length ? 'FAIL' : 'PASS', failures.join('; ') || `${hrefs.length} bounded internal links returned below HTTP 400`));
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const menu = await visible(page.locator('button,[role="button"]').filter({ hasText: /menu|导航|菜单/i })) ||
    await visible(page.locator('button[aria-label*="menu" i],button[aria-controls],button[aria-expanded]'));
  if (!menu) checks.push(check('mobile-menu', 'NOT_APPLICABLE', 'No mobile menu control was rendered'));
  else {
    const before = await menu.getAttribute('aria-expanded');
    await menu.click(); await page.waitForTimeout(100);
    const after = await menu.getAttribute('aria-expanded');
    checks.push(check('mobile-menu', before !== after || after === 'true' ? 'PASS' : 'FAIL', `aria-expanded changed from ${before} to ${after}`));
    await page.keyboard.press('Escape');
    const focusReturned = await menu.evaluate(element => element === document.activeElement).catch(() => false);
    checks.push(check('keyboard-focus-return', focusReturned ? 'PASS' : 'FAIL', 'Escape tested after opening the mobile menu'));
  }

  const search = await visible(page.locator('input[type="search"],input[placeholder*="search" i],input[aria-label*="search" i],input[placeholder*="搜索"],input[aria-label*="搜索"]'));
  if (!search) checks.push(check('search', 'NOT_APPLICABLE', 'No search input was rendered'));
  else {
    await search.fill('__codex_no_match__'); await page.waitForTimeout(150);
    const queryAccepted = await search.inputValue() === '__codex_no_match__';
    checks.push(check('search-query', queryAccepted ? 'PASS' : 'FAIL', 'Synthetic local-only query entry was tested'));
    const empty = await page.getByText(/no results|no matches|nothing found|没有结果|未找到/i).count();
    checks.push(check('search-empty-state', empty ? 'PASS' : 'FAIL', empty ? 'An empty-result message was rendered' : 'No empty-result message was detected'));
    await search.press('Escape');
  }

  const disclosure = await visible(page.locator('summary,[aria-haspopup="dialog"]'));
  if (!disclosure) checks.push(check('dialog-disclosure', 'NOT_APPLICABLE', 'No dialog or disclosure control was rendered'));
  else {
    const before = await disclosure.getAttribute('aria-expanded');
    const detailsBefore = await disclosure.evaluate(element => element.closest('details')?.open ?? null);
    await disclosure.focus(); await disclosure.press('Enter'); await page.waitForTimeout(100);
    const after = await disclosure.getAttribute('aria-expanded');
    const detailsAfter = await disclosure.evaluate(element => element.closest('details')?.open ?? null);
    const dialog = await page.locator('[role="dialog"]:visible,dialog[open]').count();
    checks.push(check('dialog-disclosure', dialog || before !== after || detailsBefore !== detailsAfter ? 'PASS' : 'FAIL',
      'Keyboard activation and resulting expanded/dialog state were tested'));
    await page.keyboard.press('Escape');
  }
  return { route, checks };
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];
  for (const route of routes) {
    try { results.push(await auditRoute(page, context, route)); }
    catch (error) { results.push({ route, checks: [check('route-interactions', 'NOT_TESTED', error.message)] }); }
  }
  const summary = { PASS: 0, FAIL: 0, NOT_APPLICABLE: 0, NOT_TESTED: 0 };
  for (const route of results) for (const item of route.checks) summary[item.status]++;
  const result = { kind: 'HOST_UI_INTERACTIONS_V1', schemaVersion: 1, runId, routes: results, summary,
    completion: summary.NOT_TESTED === 0 ? 'COMPLETE' : 'INCOMPLETE' };
  await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o400 });
} finally { await browser.close(); }
