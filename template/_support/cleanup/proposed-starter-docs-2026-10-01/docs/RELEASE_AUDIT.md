# Release Audit

Audit date: 2026-09-01  
Scope: reusable English-first starter, before real-game adoption  
Status: generic starter verification passed; real-game production approval is pending adopter input and review

## Verified toolchain

- Node.js `22.22.0`
- npm `10.9.4`
- Astro `7.2.10`
- Pagefind `1.5.2`
- Wrangler `4.127.1`
- `npm ci`: 397 packages installed, 398 audited, 0 reported vulnerabilities

## Automated gates

The following commands completed with exit code 0:

```bash
npm run check
npm run deploy:dry-run
git diff --check
```

`npm run check` reported:

- Astro Check: 77 files, 0 errors, 0 warnings, 0 hints
- Vitest: 18 test files and 74 tests passed

`npm run deploy:dry-run` rebuilt the site, reconciled generated routes, built the
Pagefind index, ran the HTML/SEO/resource audit, and let Wrangler read the final
asset directory without uploading. Wrangler read 49 files and reported no
bindings. Project-level CLI telemetry is disabled with `send_metrics: false`.

## Generated output

- Inventory validation: 8 enabled pages, 1 content entry
- Generated HTML: 8 pages
- Sitemap: 4 indexable URLs
- Pagefind: English index, 4 pages, 339 words, 0 filters, 0 sorts
- Largest HTML page: 9,458 B against an 80 KB budget
- Largest referenced CSS per page: 36,661 B against a 64 KB budget
- Largest referenced JavaScript per page: 189,143 B against a 230 KB budget
- Total Pagefind output: 653,463 B against an 800 KB budget

Generated HTML routes:

- `/`
- `/guides/`
- `/guides/getting-started/`
- `/search/`
- `/about/`
- `/privacy/`
- `/terms/`
- `/404.html`

The sitemap contains only `/`, `/about/`, `/guides/`, and
`/guides/getting-started/`. Search, legal, and 404 pages remain noindex. Default
output contains no character, item, news, or tool route directory, and no HTML
page references the disabled entity-filter, calculator, or planner islands.
Astro may still precompile their unreferenced chunks because the optional route
templates import those components.

## Browser audit

All 8 enabled routes were inspected in the in-app Chromium browser at:

- desktop: 1440 × 1000
- tablet: 768 × 1024
- mobile: 390 × 844

Across all 24 route/viewport combinations:

- every page exposed exactly one H1;
- canonical and robots metadata matched the Inventory contract;
- primary navigation remained visible;
- no page had horizontal overflow.

Representative desktop home, tablet guide, and mobile search screens were also
reviewed visually after entry animations completed. Navigation, headings, body
copy, controls, and CTA blocks remained readable without visible clipping.

The search form was submitted with `guide` at mobile width. Pagefind returned 4
local results with explicit descriptions, persisted
`/search/?q=guide`, and loaded no external script. Browser console logs remained
empty throughout the audit. Keyboard focus exposed a 3 px solid brand-color
outline. The source and generated CSS both contain the
`prefers-reduced-motion: reduce` override; the operating-system preference was
not emulated by the available browser viewport controller and remains an
explicit real-device QA item.

## Expected warnings

Astro reports that `src/content/meta` and `src/content/news` contain no Markdown
or MDX files. This is deliberate: the default starter does not ship fictional
game news or metadata content. These warnings did not produce Astro diagnostics
or build failures.

## Not yet verified

This audit does not establish production readiness for a specific commercial
game site. Before launch, the adopter must still verify:

- a real game name, brand, canonical HTTPS domain, and social identity;
- source rights, factual accuracy, citations, dates, and patch-sensitive data;
- qualified privacy-policy and terms review for the operating jurisdiction;
- an authenticated Cloudflare deployment, DNS, redirects, cache headers, and HTTPS;
- live Core Web Vitals, large-corpus Pagefind size, and representative low-end devices;
- Safari, Firefox, screen-reader, OS reduced-motion, and external structured-data checks;
- 5–10 reviewed real-game Inventory pages using an approved keyword cluster.

Do not publish the current `gameatlas.example` canonical URLs or starter legal
text. Follow `CONTENT_AND_DATA_GUIDE.md`, `DEPLOYMENT.md`, and `QA_CHECKLIST.md`
when converting this verified generic baseline into a real site.
