#!/usr/bin/env node
/**
 * Game-guide browser audit.
 *
 * Adapted from UI/UX Pro Max's design-audit.mjs:
 * https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
 * Copyright (c) 2024 Next Level Builder, MIT License.
 *
 * This adaptation adds multi-route coverage and game-guide heuristics.
 * It creates automated evidence, not a final human/AI design verdict.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1024', width: 1024, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'wide-1920', width: 1920, height: 1080 },
];

const SEVERITY_ORDER = { BLOCKER: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NOTE: 4 };

function parseArgs(argv) {
  const args = { routes: [], forbiddenTerms: [] };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--url') args.url = argv[++index];
    else if (arg === '--route') args.routes.push(argv[++index]);
    else if (arg === '--out') args.out = argv[++index];
    else if (arg === '--game') args.game = argv[++index];
    else if (arg === '--forbidden-term') args.forbiddenTerms.push(argv[++index]);
    else if (arg === '--executable') args.executable = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.url) throw new Error('Provide --url <http(s)://...>');
  if (!args.out) throw new Error('Provide --out <absolute-run-directory>');
  if (!args.game) throw new Error('Provide --game <game-name>');
  if (!args.routes.length) args.routes = ['/'];
  args.routes = [...new Set(args.routes.map((route) => route.startsWith('/') ? route : `/${route}`))];
  return args;
}

function slugForRoute(route) {
  if (route === '/') return 'home';
  return route
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100) || 'page';
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.error(
      'Playwright is unavailable. This skill never installs dependencies automatically.\n' +
      'Use an available browser automation tool or ask the user to approve a project-local Playwright setup.'
    );
    process.exit(4);
  }
}

function pageChecks({ game, forbiddenTerms }) {
  const findings = [];
  const add = (severity, category, check, evidence, detail = '') => {
    findings.push({ severity, category, check, evidence, detail });
  };
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
  };
  const viewportWidth = window.innerWidth;
  const documentWidth = document.documentElement.scrollWidth;

  if (documentWidth > viewportWidth + 1) {
    const offenders = [...document.querySelectorAll('*')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return visible(element) && (rect.right > viewportWidth + 1 || rect.left < -1);
      })
      .slice(0, 8)
      .map((element) => {
        const id = element.id ? `#${element.id}` : '';
        const cls = typeof element.className === 'string' && element.className.trim()
          ? `.${element.className.trim().split(/\s+/)[0]}` : '';
        return `${element.tagName.toLowerCase()}${id}${cls}`;
      });
    add(
      'HIGH',
      'responsive',
      'horizontal-overflow',
      `Document is ${documentWidth}px wide at a ${viewportWidth}px viewport.`,
      offenders.join(', ')
    );
  }

  const images = [...document.querySelectorAll('img')].filter(visible);
  const missingAlt = images.filter((image) => image.getAttribute('alt') === null);
  if (missingAlt.length) {
    add('HIGH', 'accessibility', 'image-alt', `${missingAlt.length} visible images have no alt attribute.`);
  }
  const unstableImages = images.filter((image) => {
    const hasIntrinsic = image.hasAttribute('width') && image.hasAttribute('height');
    const style = getComputedStyle(image);
    const hasAspect = style.aspectRatio && style.aspectRatio !== 'auto';
    return !hasIntrinsic && !hasAspect;
  });
  if (unstableImages.length) {
    add(
      'MEDIUM',
      'media-performance',
      'image-stability',
      `${unstableImages.length}/${images.length} visible images have neither intrinsic dimensions nor a computed aspect-ratio.`
    );
  }

  if (viewportWidth <= 480) {
    const smallTargets = [...document.querySelectorAll(
      'a[href],button,[role="button"],input,select,textarea,summary'
    )].filter((element) => {
      if (!visible(element) || element.hasAttribute('disabled')) return false;
      const rect = element.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    });
    if (smallTargets.length) {
      add(
        'MEDIUM',
        'interaction',
        'tap-target',
        `${smallTargets.length} visible interactive targets are smaller than 44×44 CSS pixels.`
      );
    }
  }

  const focusables = [...document.querySelectorAll(
    'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])'
  )].filter(visible).slice(0, 40);
  let noVisibleFocus = 0;
  for (const element of focusables) {
    element.focus();
    const style = getComputedStyle(element);
    const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    const shadow = style.boxShadow && style.boxShadow !== 'none';
    if (!outline && !shadow) noVisibleFocus += 1;
    element.blur();
  }
  if (noVisibleFocus) {
    add(
      'HIGH',
      'accessibility',
      'focus-visible',
      `${noVisibleFocus}/${focusables.length} sampled focusable elements show no outline or focus shadow.`,
      'Heuristic lead; visually confirm custom focus indicators.'
    );
  }

  const namelessControls = [...document.querySelectorAll(
    'button,a[href],[role="button"]'
  )].filter((element) => {
    if (!visible(element)) return false;
    const text = (element.textContent || '').trim();
    const label = element.getAttribute('aria-label') || element.getAttribute('title');
    const labelledBy = element.getAttribute('aria-labelledby');
    const meaningfulImage = element.querySelector('img[alt]:not([alt=""]),svg[aria-label]');
    return !text && !label && !labelledBy && !meaningfulImage;
  });
  if (namelessControls.length) {
    add(
      'HIGH',
      'accessibility',
      'accessible-name',
      `${namelessControls.length} visible buttons or links have no detectable accessible name.`
    );
  }

  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible);
  const h1Count = headings.filter((heading) => heading.tagName === 'H1').length;
  if (h1Count === 0) add('MEDIUM', 'content-hierarchy', 'h1', 'No visible H1 was found.');
  if (h1Count > 1) add('MEDIUM', 'content-hierarchy', 'h1', `${h1Count} visible H1 elements were found.`);
  let headingJumps = 0;
  for (let index = 1; index < headings.length; index += 1) {
    const previous = Number(headings[index - 1].tagName.slice(1));
    const current = Number(headings[index].tagName.slice(1));
    if (current > previous + 1) headingJumps += 1;
  }
  if (headingJumps) {
    add('MEDIUM', 'content-hierarchy', 'heading-order', `${headingJumps} heading-level jumps were detected.`);
  }

  if (!document.querySelector('main,[role="main"]')) {
    add('MEDIUM', 'accessibility', 'main-landmark', 'No main landmark was found.');
  }
  if (!document.querySelector('meta[name="viewport"]')) {
    add('HIGH', 'responsive', 'viewport-meta', 'The viewport meta tag is missing.');
  }
  if (!document.documentElement.getAttribute('lang')) {
    add('MEDIUM', 'accessibility', 'html-lang', 'The html element has no lang attribute.');
  }

  const placeholderLinks = [...document.querySelectorAll('a[href="#"],a[href=""]')].filter(visible);
  if (placeholderLinks.length) {
    add(
      'HIGH',
      'release-integrity',
      'placeholder-link',
      `${placeholderLinks.length} visible links use an empty or # destination.`
    );
  }

  const bodyText = document.body?.innerText || '';
  if (bodyText.includes('待确认')) {
    add('BLOCKER', 'release-integrity', 'unresolved-public-copy', 'Public page text contains 待确认.');
  }
  for (const term of forbiddenTerms) {
    if (term && bodyText.toLocaleLowerCase().includes(term.toLocaleLowerCase())) {
      add(
        'BLOCKER',
        'template-residue',
        'forbidden-term',
        `Public page contains forbidden/demo term: ${term}`
      );
    }
  }
  if (game && !bodyText.toLocaleLowerCase().includes(game.toLocaleLowerCase())) {
    add(
      'NOTE',
      'game-identity',
      'game-name-visibility',
      `The supplied game name "${game}" was not found in visible page text.`
    );
  }

  const tooWideParagraphs = [...document.querySelectorAll('p')].filter((paragraph) => {
    if (!visible(paragraph) || (paragraph.textContent || '').trim().length < 180) return false;
    return paragraph.getBoundingClientRect().width > 900;
  });
  if (tooWideParagraphs.length) {
    add(
      'MEDIUM',
      'readability',
      'text-measure',
      `${tooWideParagraphs.length} long paragraphs exceed 900 CSS pixels in width.`
    );
  }

  const unsafeTables = [...document.querySelectorAll('table')].filter((table) => {
    if (!visible(table)) return false;
    let parent = table.parentElement;
    while (parent && parent !== document.body) {
      const style = getComputedStyle(parent);
      if (['auto', 'scroll'].includes(style.overflowX)) return false;
      parent = parent.parentElement;
    }
    return table.getBoundingClientRect().right > viewportWidth + 1;
  });
  if (unsafeTables.length) {
    add(
      'HIGH',
      'game-components',
      'table-overflow',
      `${unsafeTables.length} visible tables overflow without a detected horizontal scroll container.`
    );
  }

  const adSlots = [...document.querySelectorAll(
    '[data-ad],[data-ad-slot],[id*="ad-"],[class*="ad-slot"],ins.adsbygoogle'
  )].filter(visible);
  const collapsedAds = adSlots.filter((slot) => slot.getBoundingClientRect().height < 50);
  if (collapsedAds.length) {
    add(
      'MEDIUM',
      'advertising',
      'ad-space-reservation',
      `${collapsedAds.length}/${adSlots.length} visible ad slots reserve less than 50px height.`,
      'Confirm expected ad format before changing slot dimensions.'
    );
  }

  const codeLike = [...document.querySelectorAll(
    '[data-code],.code-value,code'
  )].filter((element) => visible(element) && (element.textContent || '').trim().length > 2);
  if (codeLike.length) {
    const withoutCopy = codeLike.filter((element) => {
      let container = element;
      for (let depth = 0; depth < 4 && container; depth += 1, container = container.parentElement) {
        const control = container.querySelector?.('button,[role="button"]');
        if (control && /copy|复制/i.test(
          `${control.textContent || ''} ${control.getAttribute('aria-label') || ''}`
        )) return false;
      }
      return true;
    });
    if (withoutCopy.length) {
      add(
        'NOTE',
        'game-components',
        'copy-affordance',
        `${withoutCopy.length} code-like values have no nearby detectable copy control.`,
        'Only actionable redemption codes require copy controls.'
      );
    }
  }

  const toRgb = (color) => {
    const match = color.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(',').map((value) => Number.parseFloat(value));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  };
  const luminance = ({ r, g, b }) => {
    const convert = (value) => {
      const normalized = value / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
  };
  const ratio = (one, two) => {
    const a = luminance(one);
    const b = luminance(two);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const opaqueBackground = (element) => {
    let current = element;
    while (current) {
      const color = toRgb(getComputedStyle(current).backgroundColor);
      if (color && color.a >= 0.99) return color;
      current = current.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const textNodes = [...document.querySelectorAll(
    'p,span,a,li,h1,h2,h3,h4,button,label,td,th'
  )].filter((element) => visible(element) && (element.textContent || '').trim().length > 1)
    .slice(0, 160);
  let lowContrast = 0;
  for (const element of textNodes) {
    const style = getComputedStyle(element);
    const foreground = toRgb(style.color);
    if (!foreground || foreground.a < 0.99) continue;
    const size = Number.parseFloat(style.fontSize);
    const weight = Number.parseInt(style.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    if (ratio(foreground, opaqueBackground(element)) < (large ? 2.95 : 4.45)) {
      lowContrast += 1;
    }
  }
  if (lowContrast) {
    add(
      'MEDIUM',
      'accessibility',
      'contrast-approximate',
      `Approximately ${lowContrast}/${textNodes.length} sampled text elements may be below WCAG AA contrast.`,
      'Approximation uses the nearest opaque ancestor; manually verify gradients, images, alpha, and overlays.'
    );
  }

  return {
    title: document.title,
    lang: document.documentElement.lang || null,
    documentWidth,
    viewportWidth,
    findings,
  };
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolvePromise) => {
      let position = 0;
      const step = Math.max(240, Math.floor(window.innerHeight * 0.8));
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        position += step;
        if (position >= document.body.scrollHeight) {
          clearInterval(timer);
          resolvePromise();
        }
      }, 70);
    });
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
}

function dedupeAndAggregate(results) {
  const map = new Map();
  for (const result of results) {
    for (const finding of result.findings) {
      const key = [
        result.route,
        finding.severity,
        finding.category,
        finding.check,
        finding.evidence,
      ].join('|');
      if (!map.has(key)) {
        map.set(key, {
          ...finding,
          route: result.route,
          viewports: [],
          screenshots: [],
        });
      }
      const current = map.get(key);
      current.viewports.push(result.viewport.name);
      current.screenshots.push(result.screenshot);
    }
  }
  return [...map.values()].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.route.localeCompare(b.route) ||
      a.check.localeCompare(b.check)
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const output = resolve(args.out);
  const { chromium } = await loadPlaywright();
  await mkdir(`${output}/screenshots`, { recursive: true });

  const browser = await chromium.launch(
    args.executable ? { executablePath: args.executable } : {}
  );
  const results = [];
  const health = [];

  for (const route of args.routes) {
    const routeSlug = slugForRoute(route);
    await mkdir(`${output}/screenshots/${routeSlug}`, { recursive: true });
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const failedRequests = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
      page.on('requestfailed', (request) => {
        failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText || 'failed'}`);
      });

      const target = new URL(route, args.url).href;
      let response = null;
      let navigationError = null;
      try {
        response = await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (error) {
        navigationError = error.message;
        try {
          response = await page.goto(target, { waitUntil: 'load', timeout: 30000 });
        } catch (fallbackError) {
          navigationError = fallbackError.message;
        }
      }
      await page.waitForTimeout(400);
      await autoScroll(page);

      const screenshot = `screenshots/${routeSlug}/${viewport.name}.png`;
      await page.screenshot({ path: `${output}/${screenshot}`, fullPage: true });

      const checkResult = await page.evaluate(pageChecks, {
        game: args.game,
        forbiddenTerms: args.forbiddenTerms,
      });
      const status = response?.status() ?? null;
      if (navigationError || status === null || status >= 400) {
        checkResult.findings.push({
          severity: status === 404 ? 'BLOCKER' : 'HIGH',
          category: 'route-health',
          check: 'navigation',
          evidence: navigationError || `HTTP status ${status}`,
          detail: target,
        });
      }
      if (consoleErrors.length) {
        checkResult.findings.push({
          severity: 'HIGH',
          category: 'console-health',
          check: 'console-error',
          evidence: `${consoleErrors.length} console/page errors were observed.`,
          detail: consoleErrors.slice(0, 10).join(' | '),
        });
      }
      if (failedRequests.length) {
        checkResult.findings.push({
          severity: 'HIGH',
          category: 'network-health',
          check: 'failed-request',
          evidence: `${failedRequests.length} requests failed.`,
          detail: failedRequests.slice(0, 10).join(' | '),
        });
      }

      results.push({
        route,
        target,
        viewport,
        screenshot,
        title: checkResult.title,
        findings: checkResult.findings,
      });
      health.push({
        route,
        viewport: viewport.name,
        status,
        navigationError,
        consoleErrors,
        failedRequests,
      });
      await context.close();
    }
  }
  await browser.close();

  const findings = dedupeAndAggregate(results);
  const counts = { BLOCKER: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NOTE: 0 };
  for (const finding of findings) counts[finding.severity] += 1;

  const payload = {
    schema_version: 1,
    kind: 'automated-browser-evidence',
    game: args.game,
    target: args.url,
    routes: args.routes,
    viewports: VIEWPORTS,
    generated_at: new Date().toISOString(),
    counts,
    findings,
    health,
    limitations: [
      'Contrast is approximate and requires visual confirmation.',
      'Taste, information scent, content truth, and interaction quality require manual/AI review.',
      'Automated focus checks can miss custom indicators and require keyboard verification.',
    ],
  };
  await writeFile(
    `${output}/AUTOMATED_AUDIT.json`,
    JSON.stringify(payload, null, 2) + '\n',
    'utf8'
  );

  const lines = [
    `# Automated Game-Site Audit — ${args.game}`,
    '',
    `Target: ${args.url}`,
    `Routes: ${args.routes.join(', ')}`,
    `Viewports: ${VIEWPORTS.map((item) => item.width).join(' / ')} px`,
    '',
    `Findings: ${counts.BLOCKER} blocker · ${counts.HIGH} high · ${counts.MEDIUM} medium · ${counts.LOW} low · ${counts.NOTE} note`,
    '',
    '> Automated evidence only. Complete the game-guide rubric and real interaction review before issuing a verdict.',
    '',
  ];
  for (const severity of ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW', 'NOTE']) {
    const group = findings.filter((finding) => finding.severity === severity);
    if (!group.length) continue;
    lines.push(`## ${severity}`, '');
    for (const finding of group) {
      lines.push(
        `- **${finding.route} · ${finding.check}** — ${finding.evidence}`,
        `  - Seen at: ${finding.viewports.join(', ')}`,
        finding.detail ? `  - Detail: ${finding.detail}` : '',
        `  - Evidence: ${finding.screenshots[0]}`
      );
    }
    lines.push('');
  }
  await writeFile(`${output}/AUTOMATED_AUDIT.md`, lines.filter(Boolean).join('\n') + '\n', 'utf8');

  console.log(`Audit evidence written to ${output}`);
  console.log(
    `${counts.BLOCKER} blocker · ${counts.HIGH} high · ${counts.MEDIUM} medium · ${counts.LOW} low · ${counts.NOTE} note`
  );
  process.exit(counts.BLOCKER > 0 || counts.HIGH > 0 ? 2 : 0);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
