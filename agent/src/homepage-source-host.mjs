import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { readArtifact, safePath } from './files.mjs';
import { snapshotSiteEvidence } from './site-evidence.mjs';
import { sanitizeDiagnosticText } from './diagnostics.mjs';

const DOWNLOAD_SOURCE = /mediafire|mega\.(nz|io)|drive\.google|docs\.google|dropbox|onedrive|1drv\.ms|pan\.baidu|lanzou|aliyundrive|alipan|steamunlocked|thepiratebay|1337x|rutracker|igg-games|fitgirl|uploadhaven|zippyshare|torrent|(?:^|[\W_])(?:crack|keygen|warez|repack)(?:[\W_]|$)/i;
const DOWNLOAD_FILE = /\.(?:zip|7z|rar|exe|dmg|msi|torrent|apk|iso|pdf)(?:$|[?#])/i;
const reject = reason => { throw Error(`HOMEPAGE_URL_REJECTED: ${reason}`); };
function publicAddress(address) {
  if (isIP(address) === 4) {
    const [a,b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0,168].includes(b)) ||
      (a === 198 && [18,19,51].includes(b)) || (a === 203 && b === 0));
  }
  return isIP(address) === 6 && /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:db8:/i.test(address);
}
export async function validateHomepageUrl(value, { lookupHost = lookup } = {}) {
  let url;
  try { url = new URL(value); } catch { reject('invalid URL'); }
  if (url.protocol !== 'https:') reject('HTTPS_REQUIRED');
  if (url.username || url.password) reject('URL_CREDENTIALS_FORBIDDEN');
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (isIP(host)) reject('IP_ADDRESS_FORBIDDEN');
  if (!host.includes('.') || /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid)$|\.home\.arpa$/i.test(host)) reject('LOCAL_HOST_FORBIDDEN');
  if (DOWNLOAD_SOURCE.test(decodeURIComponent(url.href)) || DOWNLOAD_FILE.test(decodeURIComponent(url.pathname))) reject('DOWNLOAD_OR_PIRACY_SOURCE');
  const addresses = await lookupHost(host, { all: true, verbatim: true });
  if (!Array.isArray(addresses) || !addresses.length || addresses.some(item => !publicAddress(item.address))) reject('NON_PUBLIC_DNS_ADDRESS');
  return url;
}
const launchChromium = async () => (await import('playwright')).chromium.launch();
const textLimit = 200 * 1024;
function boundedText(value) {
  const bytes = Buffer.from(String(value ?? ''), 'utf8');
  let text = bytes.subarray(0, textLimit).toString('utf8');
  while (Buffer.byteLength(text) > textLimit) text = text.slice(0, -1);
  return { text, textTruncated: bytes.length > textLimit };
}

export async function collectHomepageSources({ runDirectory, requestPath = join(runDirectory, 'homepage-sources/FETCH_REQUEST.json') },
  { launchBrowser = launchChromium, lookupHost = lookup, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const area = join(runDirectory, 'homepage-sources'), directory = join(area, 'captures');
  if (requestPath !== join(area, 'FETCH_REQUEST.json')) throw Error(`FETCH_REQUEST_PATH_INVALID: ${requestPath}`);
  const requests = JSON.parse(await readArtifact(requestPath, [area]));
  if (!Array.isArray(requests) || requests.length === 0) throw Error(`FETCH_REQUEST_INVALID: ${requestPath}; expected a nonempty list of {url,purpose}`);
  if (requests.length > 25) throw Error(`FETCH_REQUEST_LIMIT_EXCEEDED: ${requests.length} URLs in ${requestPath}; maximum 25`);
  await safePath(directory, [runDirectory]);
  await rm(directory, { recursive: true, force: true });
  await mkdir(join(directory, 'screenshots'), { recursive: true });
  const captures = []; let browser;
  try {
    for (const [index, request] of requests.entries()) {
      const capture = { url: request?.url ?? null, purpose: request?.purpose ?? null, status: 'REJECTED' };
      let browserContext, timer, expired = false;
      const timeoutError = () => Error('HOMEPAGE_CAPTURE_TIMEOUT: 30000ms page budget');
      const requireActive = () => { if (expired) throw timeoutError(); };
      try {
        const deadline = new Promise((_resolve, rejectTimeout) => {
          timer = setTimer(() => { expired = true; rejectTimeout(timeoutError()); }, 30000);
        });
        const work = (async () => {
          if (typeof request?.url !== 'string' || typeof request?.purpose !== 'string' || !request.purpose.trim()) reject('URL_AND_PURPOSE_REQUIRED');
          await validateHomepageUrl(request.url, { lookupHost });
          requireActive();
          capture.status = 'FAILED';
          if (!browser) {
            const launched = await launchBrowser();
            if (expired) { await launched.close(); throw timeoutError(); }
            browser = launched;
          }
          const openedContext = await browser.newContext({ storageState: { cookies: [], origins: [] }, acceptDownloads: false,
            serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
          if (expired) { await openedContext.close(); throw timeoutError(); }
          browserContext = openedContext;
          await browserContext.route('**/*', async route => {
            const outbound = route.request();
            try {
              if (!['GET','HEAD'].includes(outbound.method())) throw Error('SUBMISSION_FORBIDDEN');
              await validateHomepageUrl(outbound.url(), { lookupHost });
              const headers = await outbound.allHeaders();
              // Chromium ignores Cookie overrides in route.continue; abort instead of claiming it was stripped.
              if (Object.keys(headers).some(name => ['cookie','authorization','proxy-authorization'].includes(name.toLowerCase())))
                throw Error('COOKIE_OR_AUTH_FORBIDDEN');
              await route.continue({ headers });
            } catch { await route.abort('blockedbyclient'); }
          });
          requireActive();
          await browserContext.addInitScript(() => {
            // Public rendering is allowed; page scripts cannot submit forms or click controls.
            HTMLFormElement.prototype.submit = function () {};
            HTMLFormElement.prototype.requestSubmit = function () {};
            document.addEventListener('submit', event => event.preventDefault(), true);
            HTMLElement.prototype.click = function () {};
          });
          requireActive();
          const page = await browserContext.newPage();
          requireActive();
          page.on('download', download => { void download.cancel(); });
          const response = await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          requireActive();
          const finalUrl = (await validateHomepageUrl(page.url(), { lookupHost })).href;
          requireActive();
          const headers = response?.headers() ?? {};
          if (/attachment/i.test(headers['content-disposition'] ?? '') || !/text\/html|application\/xhtml\+xml/i.test(headers['content-type'] ?? ''))
            throw Error('HOMEPAGE_CAPTURE_FAILED: document is not an HTML page; files are forbidden');
          const fields = await page.evaluate(() => ({ title: document.title, text: document.body?.innerText ?? '',
            jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => node.textContent),
            meta: [...document.querySelectorAll('meta')].map(node => Object.fromEntries([...node.attributes].map(attribute => [attribute.name, attribute.value]))) }));
          requireActive();
          const screenshot = join(directory, 'screenshots', `${index}.png`);
          await page.screenshot({ path: screenshot, fullPage: true, timeout: 30000 });
          requireActive();
          Object.assign(capture, fields, boundedText(fields.text), { status: 'CAPTURED', finalUrl, httpStatus: response?.status() ?? null, screenshot });
          if (capture.httpStatus === null || capture.httpStatus >= 400) {
            capture.status = 'FAILED'; capture.reason = `HOMEPAGE_CAPTURE_FAILED: HTTP ${capture.httpStatus}`;
          }
        })();
        await Promise.race([work, deadline]);
      } catch (error) {
        if (expired) capture.status = 'FAILED';
        capture.reason = sanitizeDiagnosticText(error.message);
      } finally {
        expired = true;
        if (timer) clearTimer(timer);
        if (browserContext) await browserContext.close();
      }
      const path = join(directory, `${index}.json`); await writeFile(path, JSON.stringify(capture, null, 2) + '\n');
      captures.push({ url: capture.url, purpose: capture.purpose, status: capture.status, ...(capture.reason ? { reason: capture.reason } : {}), path });
    }
  } finally { if (browser) await browser.close(); }
  const manifestPath = join(directory, 'CAPTURES.json');
  await writeFile(manifestPath, JSON.stringify({ captures, limits: { maxUrls: 25, pageTimeoutMs: 30000, textBytes: textLimit },
    limitations: ['Public anonymous captures only. Rejected/failed pages are not evidence. No login, user cookies, clicks, forms or file downloads.'] }, null, 2) + '\n');
  return { ...await snapshotSiteEvidence(directory), manifestPath };
}
