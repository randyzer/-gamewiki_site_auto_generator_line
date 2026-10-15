# Motion Desktop Wiki

A local reference-site reproduction with original branding, writing and vector illustrations. Built with Next.js 16.3.7, React, TypeScript, Tailwind CSS 4 and MDX. No deployment, analytics, tracking SDKs or remote asset dependencies are included.

## Run

Node.js 22.16+ and pnpm are required.

```sh
pnpm install
pnpm dev
```

Development defaults to `http://localhost:3000`. To use a different port:

```sh
pnpm dev --port 4177
```

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm start --port 4177
VERIFY_BASE_URL=http://localhost:4177 pnpm verify:routes
VERIFY_BASE_URL=http://localhost:4177 pnpm verify:browser
```

`verify:routes` and `verify:browser` require a running local server. The browser script uses the user's already-authorized Chrome CDP connection and Node's native WebSocket; it does not launch another browser or retrieve cookies. On macOS it reads Chrome's standard `DevToolsActivePort` discovery file. For another platform or profile, set `CHROME_USER_DATA_DIR` to the selected Chrome user-data directory. Enable Chrome remote debugging and approve its connection prompt when necessary. Browser checks create and close their own tab. In a restricted execution environment, local TCP/CDP access and Turbopack's PostCSS worker may require permission outside the sandbox.

## Routes and locale strategy

| Page | English | 简体中文 |
| --- | --- | --- |
| Home | `/` | `/zh-cn/` |
| Guide directory | `/guide/` | `/zh-cn/guide/` |
| Installation article | `/guide/install-and-setup/` | `/zh-cn/guide/install-and-setup/` |

English has no locale prefix. `/en/` and nested English aliases permanently redirect to the unprefixed canonical URL. Unsupported locales, unpublished preview URLs and missing articles return actual 404 responses. Both languages use the same root layout, templates, components, interaction logic and responsive CSS. The header language dropdown occupies the same position and uses the same globe, label and downward chevron arrangement as the reference. It preserves the current page when an actual translation exists.

## Content

Full articles live under `content/<locale>/<category>/<slug>.mdx`. Only the installation article is published, with independent English and Chinese content. Required frontmatter: `title`, `description`, `category`, `publishedAt` (quoted ISO date). Optional fields include `updatedAt`, `cover`, `quickAnswer`, `author`, `tags`. Local cover assets belong under `public/images/`.

`lib/content.ts` recursively discovers real MDX files, validates metadata and derives routes, category collections, heading anchors and available translations. Add a valid MDX and rebuild: no article registry or route whitelist needs updating. A missing translation stays absent; English is not silently served at a Chinese article URL. MDX is compiled and rendered on the server during static generation, with GFM tables and a shared `AdSlot` component. Never put untrusted third-party executable MDX in the content directory.

`lib/previews.ts` holds fourteen bilingual visual previews to preserve the reference homepage density. They have a visible Preview label, no article links and no invented publication date. Publishing a matching MDX automatically replaces the corresponding preview with a real entry. All other new real articles also appear automatically. Preview items are excluded from search and sitemap.

The home/category catalog, article pages, sitemap, locale alternatives and search all derive from discovery. Validation uses those same functions. Tests also create temporary MDX files and verify new slugs, nesting, translations, missing metadata and category mismatch. Expected article, locale-article and sitemap totals are not fixed in the tests. Only the three mandatory core pages per configured locale are specifically required.

## Rendering and SEO

Every discovered content route is pre-rendered by `generateStaticParams`; no request-time SSR is required. `dynamicParams=false` prevents unknown content URLs from becoming pages. The dynamic segment owns the shared root layout so initial HTML has the correct `lang` for each locale, without request headers or client-only language correction. A separate global 404 handles unmatched routes.

Development indexing defaults to `noindex, follow`; robots disallows crawling. Configure `SITE_URL` and `SITE_INDEXABLE` before a production build:

```sh
SITE_URL=https://your-owned-domain.example SITE_INDEXABLE=true pnpm build
```

`SITE_URL` defaults to `http://localhost:3000`; set your actual origin before deployment. Next automatically reads `.env.local` for application builds; when running standalone verification commands, supply the same configuration as environment variables. Canonicals and hreflang use the configured origin. `x-default` points to the real English equivalent when one exists, otherwise the current real page. Sitemap contains exactly real discoverable page URLs and their available language alternatives. Changing the configuration requires a rebuild. This task does not enable production indexing or deploy.

## Shared UI and scope

- Header: responsive navigation, dropdown language switcher, accessible mobile menu, theme persistence and local search over complete articles.
- Footer, breadcrumb, section heading and card variants: shared across all applicable pages and locales.
- Home: Hero, two getting-started cards, two latest entries, two answer cards, ad slot, five category grids (4/4/3/2/2 entries initially), seven FAQ items and final call to action.
- Directory: breadcrumb, title/description and three-column grid, collapsing to one column on mobile.
- Article: header, metadata/share, video facade, quick answer, illustration/caption, mobile contents, MDX body, table, ordered steps, bullet list, tags, ad slot, three related previews and desktop contents/category sidebar.
- Interactions: menu and FAQ aria state, native keyboard controls, Escape and restored search focus, theme switch, anchor links, copy-link share, local cookie preference dialog and ad dismissal.

The source directory was empty, so there were no existing Legal, Search, SEO, tests or project configuration to preserve. Legal entries remain clearly marked Preview and do not create extra pages. Search is implemented locally because it is present in the reference. Advertising areas preserve the observed layout but load no advertising scripts. The video facade opens a clearly labelled preview dialog; an original licensed video was not provided, so actual playback is not implemented. Official outbound links point to the product website, Steam listing and official support. Core internal navigation never links to the reference domain.

## Visual evidence

Reference pages were actually inspected in the user's Chrome at 1440px and 390px, including the full page, language dropdown, mobile menu, search and native image loading. Layout measurements and scope are recorded in `docs/implementation-plan.md`. `pnpm verify:browser` saves full-page screenshots and a dynamic route/viewport report under `artifacts/screenshots/`.

Original assets are generated reproducibly by `python3 scripts/generate-assets.py`. Branding, prose, background artwork, preview labels and illustration subject matter intentionally differ from the reference. Layout, module sequence, grid counts, image ratios, content widths and responsive rules are reproduced. The reference's third-party overlays, tracking consent banner, copyrighted media and live advertising are not included.

Complete file list, actual validation results and before/after visual measurements: [docs/delivery.md](docs/delivery.md).
