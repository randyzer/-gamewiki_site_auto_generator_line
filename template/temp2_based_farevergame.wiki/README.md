# Aurelia Atlas

A local Next.js 16 / TypeScript / Tailwind CSS 4 / MDX guide-site template.
Aurelia is an original fictional sample setting. No release, price, live service,
market ranking or gameplay fact is claimed. No deployment or analytics is configured.

## Run

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

For an occupied default port, use `pnpm dev --port 3032` or
`pnpm start --port 3032`. Set `SITE_URL` to the intended origin **before building**.
`NEXT_TELEMETRY_DISABLED=1` is set in the development/build/start scripts.

## URLs and languages

English uses `/`, `/guide/`, `/guide/aurelia-best-start/`.
German, Brazilian Portuguese, Spanish and Simplified Chinese use the same routes
prefixed by `/de`, `/pt-BR`, `/es`, `/zh-CN` respectively.
`/en/` and `/en/:path*/` permanently redirect to the single English URL.
The footer's existing language-selector position is retained; the selector keeps
the current page where its translation exists, otherwise opens that locale's library.

## Content

`content/{locale}/**/*.mdx` contains independently authored language versions.
Required frontmatter: `title`, `description`, `category`, `publishedAt`.
Optional fields: `order`, `updatedAt`. The relative file path creates the slug;
a nested file such as `content/en/travel/packing.mdx` becomes
`/guide/travel/packing/` automatically at the next build.

`src/lib/content.ts` recursively discovers MDX. `src/lib/routes.ts` supplies page
prerendering, sitemap and verification from the same content/locale configuration.
There is no article registry or route allowlist. The library and related articles
consume discovered metadata. Only one complete article per language is included.

`src/lib/messages/{locale}.json` contains translated UI and preview data.
Previews keep the reference's visual density. They are non-interactive cards,
explicitly labelled, have no route and never enter sitemap. New complete MDX files
appear alongside the existing previews without requiring preview data edits.
There is no search, account, live backend or legal subsystem in this empty starting project.

## SEO

Copy `.env.example` to `.env.local` when configuring a project. `SITE_URL` is the
canonical origin. `SITE_INDEXABLE=false` is the safe template default: page
metadata has noindex and robots.txt disallows crawling. Switch to `true` before a
production build when publication is explicitly intended. The sitemap includes
only discovered real home/library/article routes. Canonical, language alternates
and x-default are generated per existing translation; no English alias enters sitemap.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm start --port 3032
# In another terminal:
VERIFY_BASE_URL=http://localhost:3032 pnpm verify:routes
VERIFY_BASE_URL=http://localhost:3032 pnpm verify:browser
```

Route verification checks MDX compilation, every discovered route, metadata,
internal links, exact sitemap membership, default-locale redirects and 404.
Unit tests add MDX to isolated temporary folders to verify automatic discovery
and invalid metadata handling. No expandable article/route count is hardcoded.

Browser verification uses Node 22+ and the **same Chrome profile** selected by the
installed `web-access` skill. The default skill directory is
`~/.codex/skills/web-access`; override with `WEB_ACCESS_SKILL_DIR` if needed.
Chrome remote debugging must be enabled and its connection authorization accepted.
The script does not silently launch another profile or fall back to anonymous access.
Python 3 with Pillow is used only to stitch screenshots exceeding Chrome's capture
height limit. Each discovered route is checked at 1440px and 390px. It checks
images, horizontal overflow, preview links, visible keyboard focus, navigation and
browser errors. English core pages are captured full length in `artifacts/final/`.
Set `VISUAL_ROUND=initial` to retain the first comparison round separately.

The reference's mobile navigation is permanently visible and wraps; it has no
hamburger, menu toggle, dropdown, tabs or accordion. The seven FAQ answers are
always visible. Accordingly there is no invented aria-expanded state or menu.
Hover, keyboard focus, scroll anchors and true internal page/language links are implemented.

Build output, dependencies, caches and local verification screenshots are excluded
from the clean template. Run `pnpm install` to restore dependencies; development
and build commands recreate `.next/`. Browser verification recreates `artifacts/`.
Reference screenshots from the original comparison session are not included.
