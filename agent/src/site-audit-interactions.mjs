import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const values = (name, argv = process.argv.slice(2)) => argv.flatMap((item, index) => item === name ? [argv[index + 1]] : []);
const value = name => values(name)[0];
const baseUrl = value('--url');
const output = value('--output');
const runId = value('--run-id');
const requestedRoutes = values('--route');
if (!baseUrl || !output || !runId || !requestedRoutes.length) throw Error('SITE_AUDIT_INTERACTIONS_ARGUMENTS_INVALID');

const origin = new URL(baseUrl).origin;
const routes = [...new Set(requestedRoutes)];
for (const route of routes) {
  const parsed = new URL(route, origin);
  if (!route.startsWith('/') || route.startsWith('//') || parsed.origin !== origin || parsed.pathname !== route || parsed.search || parsed.hash)
    throw Error(`SITE_AUDIT_INTERACTIONS_ROUTE_INVALID: ${route}`);
}
const authorizedRoutes = new Set(routes);
const DISCLOSURE_EXECUTION_LIMIT = 12;
const check = (category, status, detail) => ({ category, status, detail });
const visible = locator => locator.count().then(async count => {
  for (let index = 0; index < count; index++) if (await locator.nth(index).isVisible().catch(() => false)) return locator.nth(index);
  return null;
});
const classification = (count, visibleItem) => count === 0 ? 'ABSENT' : visibleItem ? 'PRESENT' : 'UNKNOWN';
const emptyInventory = presence => ({ interactiveCount: 0, internalLinkCount: 0, authorizedInternalLinkCount: 0,
  unlistedInternalLinkCount: 0, externalLinkCount: 0, formControlCount: 0,
  unclassifiedControlCount: 0, mobileMenuControlCount: 0, searchControlCount: 0,
  themeToggleControlCount: 0, dialogDisclosureControlCount: 0,
  mobileMenu: presence, search: presence, themeToggle: presence, dialogDisclosure: presence });
const addUnavailableChecks = (checks, detail) => {
  for (const category of ['internal-navigation', 'mobile-menu', 'keyboard-focus-return', 'search-trigger',
    'search-query', 'search-empty-state', 'theme-toggle', 'dialog-disclosure', 'unclassified-controls'])
    checks.push(check(category, 'NOT_TESTED', detail));
};

async function auditRoute(page, context, route) {
  const checks = [];
  const expected = new URL(route, origin);
  let probe;
  try { probe = await context.request.get(expected.href, { timeout: 15000, maxRedirects: 0 }); }
  catch (error) {
    checks.push(check('route-load', 'FAIL', `Authorized route request failed: ${error.message}`));
    addUnavailableChecks(checks, 'Route was not rendered after its authorized request failed');
    return { route, inventory: emptyInventory('UNKNOWN'), checks };
  }
  if (probe.status() >= 300) {
    checks.push(check('route-load', 'FAIL', `Authorized route returned HTTP ${probe.status()}; redirects are not followed`));
    addUnavailableChecks(checks, 'Route was not rendered because the authorized response was not a direct success');
    return { route, inventory: emptyInventory('UNKNOWN'), checks };
  }
  const response = await page.goto(expected.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const actual = new URL(page.url());
  if (!response || response.status() >= 300 || actual.origin !== expected.origin || actual.pathname !== expected.pathname || actual.search)
    checks.push(check('route-load', 'FAIL', `Expected ${expected.href}; observed ${actual.href} HTTP ${response?.status() ?? 'NO_RESPONSE'}`));
  else checks.push(check('route-load', 'PASS', `HTTP ${response.status()} at the authorized route`));

  const hrefs = await page.locator('a[href]').evaluateAll((links, expectedOrigin) => [...new Set(links.map(link => link.href)
    .filter(href => { try { const url = new URL(href); return url.origin === expectedOrigin && !url.search && !url.hash; } catch { return false; } }))], origin);
  const authorizedHrefs = hrefs.filter(href => authorizedRoutes.has(new URL(href).pathname));
  const unlistedInternalLinkCount = hrefs.length - authorizedHrefs.length;
  if (!authorizedHrefs.length) checks.push(check('internal-navigation', 'NOT_APPLICABLE',
    `No rendered link targeted the ${routes.length} authorized published routes; ${unlistedInternalLinkCount} unlisted links were not requested`));
  else {
    const failures = [];
    for (const href of authorizedHrefs) {
      try {
        const result = await context.request.get(href, { timeout: 15000, maxRedirects: 0 });
        if (result.status() >= 300 || new URL(result.url()).origin !== origin || !authorizedRoutes.has(new URL(result.url()).pathname))
          failures.push(`${href} returned HTTP ${result.status()} or left the authorized route set`);
      } catch (error) { failures.push(`${href} ${error.message}`); }
    }
    checks.push(check('internal-navigation', failures.length ? 'FAIL' : 'PASS', failures.join('; ') ||
      `${authorizedHrefs.length} rendered links to authorized published routes returned direct success`));
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const buttons = page.locator('button,[role="button"]');
  const menuLocator = buttons.filter({ hasText: /menu|导航|菜单/i }).or(
    page.locator('button[aria-label*="menu" i],button[aria-label*="导航"],button[aria-label*="菜单"],button[aria-controls*="nav" i][aria-expanded]'));
  const searchInputLocator = page.locator('input[type="search"],input[placeholder*="search" i],input[aria-label*="search" i],input[placeholder*="搜索"],input[aria-label*="搜索"]');
  const searchTriggerLocator = buttons.filter({ hasText: /search|搜索/i }).or(
    page.locator('button[aria-label*="search" i],button[title*="search" i],a[aria-label*="search" i],[role="button"][aria-label*="search" i],button[aria-label*="搜索"],a[aria-label*="搜索"]'));
  const themeLocator = page.locator('button[aria-label*="theme" i],button[title*="theme" i],button[aria-label*="light" i],button[aria-label*="dark" i],button[aria-label*="主题"]');
  const disclosureLocator = page.locator('summary,[aria-haspopup="dialog"],button[aria-controls][aria-expanded]:not([aria-controls*="nav" i]),button[aria-label*="cookie" i]')
    .or(buttons.filter({ hasText: /cookie settings|cookie preferences|隐私设置|cookie 设置/i }));
  const menu = await visible(menuLocator), searchInput = await visible(searchInputLocator);
  const searchTrigger = await visible(searchTriggerLocator), theme = await visible(themeLocator);
  const disclosure = await visible(disclosureLocator);
  const visibleDisclosureIndexes = await disclosureLocator.evaluateAll(elements => {
    const shown = element => { const style = getComputedStyle(element); const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0; };
    return elements.flatMap((element, index) => shown(element) ? [index] : []);
  });
  const candidateCounts = {
    menu: await menuLocator.count(), searchInput: await searchInputLocator.count(),
    searchTrigger: await searchTriggerLocator.count(), theme: await themeLocator.count(),
    disclosure: await disclosureLocator.count(),
  };
  const census = await page.locator('a[href],button,[role="button"],input,select,textarea,summary,[aria-haspopup="dialog"]').evaluateAll(elements => {
    const shown = element => { const style = getComputedStyle(element); const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0; };
    const name = element => `${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('title') ?? ''} ${element.textContent ?? ''}`;
    let visibleCount = 0, unclassified = 0, formControlCount = 0, externalLinkCount = 0;
    for (const element of elements) {
      if (!shown(element)) continue;
      visibleCount++;
      if (element.matches('a[href]')) { if (new URL(element.href).origin !== location.origin) externalLinkCount++; continue; }
      if (element.matches('input:not([type="search"]),select,textarea')) {
        formControlCount++;
        const readOnly = 'readOnly' in element && element.readOnly;
        if (!element.matches(':disabled') && !readOnly) unclassified++;
        continue;
      }
      if (element.matches('summary,[aria-haspopup="dialog"]')) continue;
      if (/search|搜索/i.test(name(element)) || /menu|导航|菜单/i.test(name(element)) ||
          /theme|light|dark|主题/i.test(name(element)) || /cookie settings|cookie preferences|隐私设置|cookie 设置/i.test(name(element)) ||
          element.matches('button[aria-controls][aria-expanded],input[type="search"]')) continue;
      unclassified++;
    }
    return { visibleCount, unclassified, formControlCount, externalLinkCount };
  });
  const inventory = {
    interactiveCount: census.visibleCount,
    internalLinkCount: hrefs.length,
    authorizedInternalLinkCount: authorizedHrefs.length,
    unlistedInternalLinkCount,
    externalLinkCount: census.externalLinkCount,
    formControlCount: census.formControlCount,
    unclassifiedControlCount: census.unclassified,
    mobileMenuControlCount: candidateCounts.menu,
    searchControlCount: candidateCounts.searchInput + candidateCounts.searchTrigger,
    themeToggleControlCount: candidateCounts.theme,
    dialogDisclosureControlCount: candidateCounts.disclosure,
    mobileMenu: classification(candidateCounts.menu, menu),
    search: classification(candidateCounts.searchInput + candidateCounts.searchTrigger, searchInput || searchTrigger),
    themeToggle: classification(candidateCounts.theme, theme),
    dialogDisclosure: classification(candidateCounts.disclosure, disclosure),
  };

  if (inventory.mobileMenu === 'ABSENT') {
    checks.push(check('mobile-menu', 'NOT_APPLICABLE', 'Route inventory found no mobile menu control'));
    checks.push(check('keyboard-focus-return', 'NOT_APPLICABLE', 'No mobile menu required an Escape focus-return test'));
  } else if (inventory.mobileMenu === 'UNKNOWN') {
    checks.push(check('mobile-menu', 'NOT_TESTED', 'A mobile menu candidate existed but was not exercisable at the mobile viewport'));
    checks.push(check('keyboard-focus-return', 'NOT_TESTED', 'Focus return could not be tested without an exercisable mobile menu'));
  } else {
    try {
      const before = await menu.getAttribute('aria-expanded');
      await menu.click(); await page.waitForTimeout(100);
      const after = await menu.getAttribute('aria-expanded');
      checks.push(check('mobile-menu', before !== after || after === 'true' ? 'PASS' : 'FAIL', `aria-expanded changed from ${before} to ${after}`));
      await page.keyboard.press('Escape');
      const focusReturned = await menu.evaluate(element => element === document.activeElement).catch(() => false);
      checks.push(check('keyboard-focus-return', focusReturned ? 'PASS' : 'FAIL', 'Escape was executed after opening the mobile menu'));
    } catch (error) {
      checks.push(check('mobile-menu', 'NOT_TESTED', `Mobile menu could not be exercised: ${error.message}`));
      checks.push(check('keyboard-focus-return', 'NOT_TESTED', 'Focus return was not tested because mobile-menu execution failed'));
    }
  }

  if (inventory.themeToggle === 'ABSENT') checks.push(check('theme-toggle', 'NOT_APPLICABLE', 'Route inventory found no theme toggle'));
  else if (inventory.themeToggle === 'UNKNOWN') checks.push(check('theme-toggle', 'NOT_TESTED', 'A theme toggle candidate existed but was not exercisable'));
  else {
    try {
      const beforeLabel = await theme.getAttribute('aria-label');
      const beforeClass = await page.locator('html').getAttribute('class');
      await theme.click(); await page.waitForTimeout(100);
      const afterLabel = await theme.getAttribute('aria-label');
      const afterClass = await page.locator('html').getAttribute('class');
      const changed = beforeLabel !== afterLabel || beforeClass !== afterClass;
      await theme.click(); await page.waitForTimeout(100);
      checks.push(check('theme-toggle', changed ? 'PASS' : 'FAIL', changed
        ? 'Theme toggle changed observable state and was restored' : 'Theme toggle executed without an observable state change'));
    } catch (error) { checks.push(check('theme-toggle', 'NOT_TESTED', `Theme toggle could not be exercised and restored: ${error.message}`)); }
  }

  let activeSearch = searchInput;
  if (inventory.search === 'ABSENT') {
    checks.push(check('search-trigger', 'NOT_APPLICABLE', 'Route inventory found no search trigger or search input'));
    checks.push(check('search-query', 'NOT_APPLICABLE', 'No search functionality exists on this route'));
    checks.push(check('search-empty-state', 'NOT_APPLICABLE', 'No search functionality exists on this route'));
  } else if (inventory.search === 'UNKNOWN') {
    checks.push(check('search-trigger', 'NOT_TESTED', 'Search candidates existed but none was visible or exercisable'));
    checks.push(check('search-query', 'NOT_TESTED', 'Search input could not be reached'));
    checks.push(check('search-empty-state', 'NOT_TESTED', 'Search input could not be reached'));
  } else {
    if (activeSearch) checks.push(check('search-trigger', 'NOT_APPLICABLE', 'Search input was directly visible; no trigger was required'));
    else {
      try {
        await searchTrigger.click(); await page.waitForTimeout(100);
        activeSearch = await visible(searchInputLocator);
        checks.push(check('search-trigger', activeSearch ? 'PASS' : 'NOT_TESTED', activeSearch
          ? 'Search trigger opened an accessible search input' : 'Search trigger executed but no accessible search input could be identified'));
      } catch (error) { checks.push(check('search-trigger', 'NOT_TESTED', `Search trigger could not be exercised: ${error.message}`)); }
    }
    if (!activeSearch) {
      checks.push(check('search-query', 'NOT_TESTED', 'Search input was not available after trigger handling'));
      checks.push(check('search-empty-state', 'NOT_TESTED', 'Search input was not available after trigger handling'));
    } else {
      try {
        await activeSearch.fill('__codex_no_match__'); await page.waitForTimeout(150);
        const queryAccepted = await activeSearch.inputValue() === '__codex_no_match__';
        checks.push(check('search-query', queryAccepted ? 'PASS' : 'FAIL', 'Synthetic local-only query entry was executed'));
        const empty = await visible(page.getByText(/no results|no matches|nothing found|没有结果|未找到/i));
        checks.push(check('search-empty-state', empty ? 'PASS' : 'FAIL', empty
          ? 'An empty-result message was rendered' : 'The exercised empty query did not expose an empty-result message'));
        await activeSearch.press('Escape');
      } catch (error) {
        checks.push(check('search-query', 'NOT_TESTED', `Search query could not be executed: ${error.message}`));
        checks.push(check('search-empty-state', 'NOT_TESTED', 'Empty state was not tested because query execution failed'));
      }
    }
  }

  if (inventory.dialogDisclosure === 'ABSENT') checks.push(check('dialog-disclosure', 'NOT_APPLICABLE', 'Route inventory found no dialog or disclosure control'));
  else if (inventory.dialogDisclosure === 'UNKNOWN') checks.push(check('dialog-disclosure', 'NOT_TESTED', 'A dialog or disclosure candidate existed but was not exercisable'));
  else {
    const failures = [], untested = []; let exercised = 0;
    const skippedVisible = Math.max(0, visibleDisclosureIndexes.length - DISCLOSURE_EXECUTION_LIMIT);
    if (skippedVisible) untested.push(`${skippedVisible} visible dialog/disclosure controls exceeded execution bound ${DISCLOSURE_EXECUTION_LIMIT}`);
    for (const index of visibleDisclosureIndexes.slice(0, DISCLOSURE_EXECUTION_LIMIT)) {
      const item = disclosureLocator.nth(index);
      try {
        const before = await item.getAttribute('aria-expanded');
        const detailsBefore = await item.evaluate(element => element.closest('details')?.open ?? null);
        await item.focus(); await item.press('Enter'); await page.waitForTimeout(100); exercised++;
        const after = await item.getAttribute('aria-expanded');
        const detailsAfter = await item.evaluate(element => element.closest('details')?.open ?? null);
        const dialog = await page.locator('[role="dialog"]:visible,dialog[open]').count();
        if (!dialog && before === after && detailsBefore === detailsAfter) failures.push(`candidate ${index + 1} showed no state change`);
        await page.keyboard.press('Escape');
      } catch (error) { untested.push(`candidate ${index + 1}: ${error.message}`); }
    }
    checks.push(check('dialog-disclosure', untested.length ? 'NOT_TESTED' : failures.length ? 'FAIL' : 'PASS',
      untested.join('; ') || failures.join('; ') || `${exercised} visible dialog/disclosure controls were keyboard tested`));
  }
  checks.push(check('unclassified-controls', inventory.unclassifiedControlCount ? 'NOT_TESTED' : 'NOT_APPLICABLE',
    inventory.unclassifiedControlCount ? `${inventory.unclassifiedControlCount} visible controls were not mapped to a safe audit category` :
      'Every visible interactive control was classified by the route inventory'));
  return { route, inventory, checks };
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];
  for (const route of routes) {
    try { results.push(await auditRoute(page, context, route)); }
    catch (error) {
      const checks = [check('route-load', 'NOT_TESTED', error.message)];
      addUnavailableChecks(checks, 'Route interaction collection aborted before inventory completed');
      results.push({ route, inventory: emptyInventory('UNKNOWN'), checks });
    }
  }
  const summary = { PASS: 0, FAIL: 0, NOT_APPLICABLE: 0, NOT_TESTED: 0 };
  for (const route of results) for (const item of route.checks) summary[item.status]++;
  const result = { kind: 'HOST_UI_INTERACTIONS_V1', schemaVersion: 1, runId,
    authorizedRoutes: routes, routes: results, summary,
    completion: summary.NOT_TESTED === 0 ? 'COMPLETE' : 'INCOMPLETE' };
  await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o400 });
} finally { await browser.close(); }
