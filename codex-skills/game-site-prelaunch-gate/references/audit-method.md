# Audit Method

## Page inventory

Collect the union of:

1. Framework route definitions and content-backed routes.
2. `CONTENT_PAGE_MANIFEST.json` or equivalent.
3. Pages represented in production output.
4. `sitemap.xml` entries.
5. Public pages reachable from internal links.

Normalize trailing slashes and URL fragments for comparison without losing the original URL. Report disagreements: route exists but is not linked, sitemap entry has no route, draft is public/indexable, published page is absent from sitemap, or reachable link points to an unknown route. Do not expose private/draft pages as publishable merely because they build.

## TDH and keyword table

For each page, extract final rendered Title, Description, H1, target keyword (from an explicit manifest/content field; otherwise `未配置`), body word count, exact target-keyword count, and approximate count/body-word ratio. State tokenization assumptions for languages without whitespace. Exclude navigation/footer boilerplate where practical and explain exclusions. Compare page intent and topic; without search performance data, report only potential overlap.

## Links and routes

Check local internal routes and fragments against the production preview. Check external destinations conservatively, with a bounded request policy. A 403, 429, CAPTCHA, or login wall is an access limitation, not proof that the destination is broken. Verify buttons by their actual behavior rather than label alone. Record redirect source, destination, and status.

## Production and viewport checks

Use existing scripts and lockfile. Identify the production build output, start the documented preview, note the actual URL/port, and shut down only the service started by this run. Visit every public page at desktop and 390px; visit the home and key content pages at 360px and 768px. Capture viewport screenshots for home and key content pages. If real-browser tools are unavailable, do not claim visual verification; report the blocker and continue source checks.

## Robots, sitemap, and canonical URL verification

Use the confirmed production domain, not the official game website or a template's former domain. Inspect the production-preview responses for `/robots.txt`, `/sitemap.xml`, and any referenced sitemap index; record status, final URL after redirects, and relevant response body. Check each sitemap `<loc>` for an absolute URL on the confirmed canonical origin, a successful route, and membership in the intended published route set. Confirm drafts and blocked pages are absent. Confirm each robots `Sitemap:` line points to the accessible sitemap on the new origin, and that `Disallow` rules do not accidentally block pages meant for indexing.

Compare served output with source generators/configuration, `TEMPLATE_RESIDUE_SCAN.json`, the page manifest, and `CONTENT_GAPS.md` when present. Old-domain or old-route values in public SEO output are P1; if the domain is unconfirmed, mark the check `BLOCKED` and do not report complete technical SEO verification. Do not claim a duplicate-content penalty merely because code/layout was reused: assess rendered page similarity and canonical signals separately.

## Security scan

Limit scanning to current workspace content and tracked files. Exclude dependency/build caches and binary assets where appropriate. Never echo matching values. Report path plus secret type with the value redacted. Do not claim coverage of Git history, remote CI variables/secrets, provider dashboards, or penetration testing.

## Provenance and fact handling

Compare public claims with supplied research/material sources and existing provenance records. Link each questionable claim to its file/section when possible. Label unknowns as `UNVERIFIED`; do not silently rewrite them. For imagery, record source/attribution evidence and rights uncertainty without guessing license status.
