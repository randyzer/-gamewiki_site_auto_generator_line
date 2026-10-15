# Reference reproduction implementation plan

Goal: reproduce the three supplied page types, using shared Next.js / TypeScript / Tailwind templates and two real MDX translations. Local implementation only.

1. Record direct browser evidence at 1440px and 390px: all page modules, image ratios, navigation, language dropdown, search, theme, menu, FAQ, article sidebar and mobile table of contents.
2. Build content discovery in `lib/content.ts`, locale routing in `lib/i18n.ts`, metadata in `lib/seo.ts`. Test discovery against temporary real MDX files, missing translations, invalid metadata and duplicate slugs. Generate routes, category lists, sitemap and search entries from the same discovery functions.
3. Add one complete installation article per locale under `content/{en,zh-CN}/guide/`. Keep 14 additional visual entries as explicit, non-linking preview data in `lib/previews.ts`. Create original branded SVG illustrations; do not copy source code, logos, screenshots or article prose.
4. Implement shared header, footer, cards, ad slots, search, theme, video facade, FAQ and article tools in `components/`. Render three page templates through `app/[[...segments]]/page.tsx`; pre-render every discoverable real route. Preserve section order and 4/4/3/2/2 home category card counts; previews remain outside search and sitemap.
5. Implement configurable development noindex, canonical / available-translation hreflang / x-default, robots, sitemap, `/en/` redirects and genuine 404 responses. No extra legal pages, telemetry or deployment.
6. Run `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm verify:routes`, `pnpm verify:browser`. Browser verification uses the already-authorized Chrome CDP connection, dynamically discovers all real routes and saves full-page screenshots. Compare the six core screenshots to the reference, fix evidenced differences and recheck.

Reference measurements: max container 1280px, 16px main padding, header 57px, desktop top ad 107px, no top ad on mobile. Desktop home section padding 40px 16px; mobile 32px 16px. Cards 16:9. Desktop category grids 4/4/3/2/2; directory 3 columns; mobile all single column. Article 768px content width, 160px sidebar slot with 264px sticky content; 36px title desktop / 30px mobile. Body system sans serif, 16px/24px; article prose 18px/32px. Footer three desktop columns / stacked mobile.
