import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = dirname(fileURLToPath(import.meta.url));
const starterDirectory = '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE';
const taskRequire = createRequire(join(starterDirectory, 'package.json'));
const { webkit } = taskRequire('playwright');
const packageVersion = taskRequire('playwright/package.json').version;
const nativeHtml = '<div id="scroll" tabindex="0" style="width:320px;overflow-x:auto"><table style="min-width:780px"><tr><td>Native wide table</td></tr></table></div>';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const report = {
  taskId: 'c2c_a765', iteration: 14, purpose: 'Pure native ArrowRight repeatability control; not qualification',
  identity: { playwright: packageVersion, executable: webkit.executablePath(), revision: '2359',
    host: { platform: process.platform, arch: process.arch, node: process.version },
    viewport: { width: 390, height: 844 }, html: nativeHtml, headless: true },
  protocol: { plannedIndependentBrowserProcesses: 10, tabPerRun: 1, arrowRightPerRun: 1,
    retries: 0, programmaticFocus: false, programmaticScroll: false, corePages: false,
    coreCssOrJs: false, extraBrowserFlags: false, systemSettingsChanged: false },
  runs: [], validRuns: 0, scrolledRuns: 0, classification: null, error: null,
};
const persist = () => writeFileSync(join(outputDirectory, 'arrowright-repeatability.json'), JSON.stringify(report, null, 2) + '\n');

async function main() {
  if (process.version !== 'v22.22.0' || packageVersion !== '1.63.0' || !webkit.executablePath().includes('/webkit-2359/')) {
    throw new Error('Installed tool identity differs from approved PLAN14');
  }
  for (let number = 1; number <= 10; number++) {
    // A separate launch/close per run prevents sharing a browser process between controls.
    let browser, context;
    const run = { number, browserVersion: null, before: null, geometry: null, samples: [], keyEvents: [],
      controlValid: false, nativeScrolled: null, contextClosed: false, browserClosed: false, error: null };
    report.runs.push(run);
    try {
      browser = await webkit.launch({ headless: true });
      run.browserVersion = browser.version();
      if (run.browserVersion !== '26.6') throw new Error('Launched WebKit version differs from PLAN14');
      context = await browser.newContext({ viewport: report.identity.viewport });
      const page = await context.newPage();
      await page.bringToFront();
      await page.setContent(nativeHtml);
      await page.keyboard.press('Tab');
      run.geometry = await page.locator('#scroll').evaluate((element) => ({
        active: document.activeElement === element,
        clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
        overflowX: getComputedStyle(element).overflowX,
        tableWidth: element.querySelector('table').getBoundingClientRect().width,
      }));
      if (!run.geometry.active || run.geometry.overflowX !== 'auto' || run.geometry.scrollWidth <= run.geometry.clientWidth) {
        throw new Error('CONTROL_INVALID: native focus/geometry prerequisite');
      }
      await page.evaluate(() => {
        window.__arrowDiagnosticEvents = [];
        document.querySelector('#scroll').addEventListener('keydown', (event) => {
          window.__arrowDiagnosticEvents.push({ key: event.key, time: performance.now(),
            targetId: event.target.id, defaultPrevented: event.defaultPrevented });
        }, { passive: true });
      });
      const sample = async (label) => ({ label, ...await page.locator('#scroll').evaluate((element) => ({
        time: performance.now(), scrollLeft: element.scrollLeft, active: document.activeElement === element,
      })) });
      run.before = await sample('before');
      run.samples.push(run.before);
      await page.keyboard.press('ArrowRight');
      run.samples.push(await sample('immediate'));
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      run.samples.push(await sample('next-frame'));
      await delay(50);
      run.samples.push(await sample('~50ms'));
      await delay(150);
      run.samples.push(await sample('~200ms'));
      await delay(300);
      run.samples.push(await sample('~500ms'));
      run.keyEvents = await page.evaluate(() => window.__arrowDiagnosticEvents);
      if (run.keyEvents.length !== 1 || run.keyEvents[0].key !== 'ArrowRight' || run.keyEvents[0].targetId !== 'scroll') {
        throw new Error('CONTROL_INVALID: required single ArrowRight event absent or unexpected');
      }
      run.controlValid = true;
      run.nativeScrolled = run.samples.some((sample) => sample.scrollLeft > run.before.scrollLeft);
      report.validRuns++;
      if (run.nativeScrolled) report.scrolledRuns++;
    } catch (error) {
      run.error = String(error);
      throw error;
    } finally {
      if (context) { await context.close(); run.contextClosed = true; }
      if (browser) { await browser.close(); run.browserClosed = true; }
      persist();
      console.log(JSON.stringify(run));
    }
  }
  report.classification = report.scrolledRuns === 10 ? 'NATIVE_ARROW_REPEATABLE'
    : report.scrolledRuns === 0 ? 'NATIVE_ARROW_UNAVAILABLE' : 'NATIVE_ARROW_NONDETERMINISTIC';
  persist();
  console.log(JSON.stringify({ validRuns: report.validRuns, scrolledRuns: report.scrolledRuns, classification: report.classification }));
}
main().catch((error) => {
  report.error = String(error);
  report.classification = 'CONTROL_INVALID';
  persist();
  console.error(error);
  process.exitCode = 1;
});
