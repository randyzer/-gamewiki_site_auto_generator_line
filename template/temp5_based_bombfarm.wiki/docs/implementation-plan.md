# Quarry Field Guide implementation plan

Goal: reproduce the three supplied Bomb Farm reference layouts with original replacement content, five locales, and file-discovered MDX.

Architecture: one optional catch-all route and root layout; shared home and document components; locale dictionaries and independent MDX files. Content and route validation use the same discovery module.

Tech stack: Next.js 16, TypeScript, Tailwind CSS 4, next-mdx-remote, pnpm.

- [x] Check reference desktop/mobile modules and interactions; preserve the 65px header, 91px reference banner, 1280px outer container, 3-column cards, 944/256 document columns, and mobile single column.
- [x] Add `tests/content.test.ts`; run `pnpm test` before implementing `src/lib/content.ts`, `i18n.ts`, and `seo.ts`. Cover new MDX discovery, invalid metadata, traversal, unknown locales, URL uniqueness, translated alternates, and preview exclusion.
- [x] Add ten MDX files in `content/{en,de,pt-BR,es,zh-CN}/guides/`, only the overview and how-to-play article. Generate headings, routes, and related content from metadata; keep visual previews in a separate data collection.
- [x] Add `src/components/{header,footer,home,document,primitives}.tsx`, locale messages, original logo/illustration, and `src/app/globals.css`. Preserve reference module order and item counts; implement menu, navigation dropdowns, language switching, anchors, and FAQ.
- [x] Add `src/app/[[...path]]/{layout,page,not-found}.tsx`, global 404, robots, sitemap, and English-alias redirects. Static generation enumerates real content; default noindex is controlled by `SITE_INDEXABLE`.
- [x] Implement `scripts/verify-routes.ts` and `scripts/verify-browser.ts`. Run `pnpm test`, `pnpm typecheck`, `pnpm build`, start production locally, then verify all discovered routes, sitemap, SEO, menu/ARIA, keyboard, images, 404, and overflow.
- [x] Capture all three local pages at 1440/390, compare full-page reference screenshots, locate structural/spacing differences, correct them, and capture again. Report actual results and remaining differences.

Reference captures: `/tmp/bombfarm-{home,guides,article}-{1440,390}.png`; computed element measurements in matching JSON files. English pages measured 7466/4474/5595px desktop and 12323/6746/7847px mobile before replacement text. Height is supporting evidence only; no spacer matching.

Scope: no deployment, telemetry, bulk articles, new page categories, legal content, or competitor links. Original brand: Quarry Field Guide. Replacement illustrations and prose are explicitly examples, not verified gameplay claims.

## Current verification status

- `pnpm test`: 5/5 passed, including regression coverage for heading-ID collisions.
- `pnpm typecheck`: passed.
- `SITE_URL=http://localhost:3035 pnpm build`: passed; 15 content routes pre-rendered.
- `VERIFY_BASE_URL=http://localhost:3035 pnpm verify:routes`: passed, including actual canonical/hreflang/x-default, robots, sitemap, redirects and 404s.
- `VERIFY_BASE_URL=http://localhost:3035 pnpm verify:browser`: passed for all 15 discovered routes at 1440/390px after the authorized Chrome connection succeeded. The bridge now emulates focus for its own background tabs and sends complete Enter key events.
- Completed first full-page capture and comparison, corrected card/footer heading typography and overview-list placement in all five languages, rebuilt, and captured again. Final six screenshots and the 30 page/viewport checks are in `artifacts/browser/final/`.
- Specification and code-quality reviews completed; all reported implementation issues were fixed. See `docs/delivery.md` for the confirmed remaining differences and results.
