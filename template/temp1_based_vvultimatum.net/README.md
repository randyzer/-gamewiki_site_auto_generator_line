# Spirit Atlas guide template

Next.js 16.3.6, TypeScript, Tailwind CSS 4, local Inter font and MDX. Three shared page types reproduce the layout of the supplied reference with original content and SVG illustrations.

```sh
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
pnpm start
pnpm verify:routes
pnpm verify:browser
```

Run route and browser verification against the running production server. `VERIFY_BASE_URL` changes the test server address. Browser verification requires the installed Tabbit CLI and an authorized browser session. Set `TABBIT_CLI` or `TABBIT_TASK` to use a different authorized launcher/task. It retains the verification tab and does not alter unrelated user tabs. Mobile screenshots hide desktop browser scrollbars to retain the full 390px content viewport. Screenshots go into `artifacts/browser-before`; run `VERIFICATION_ROUND=after pnpm verify:browser` after visual corrections.

English: `/`, `/races`, `/races/shinigami`. Other languages: `/de`, `/pt-BR`, `/es`, `/zh-CN` with the same suffixes. `/en/:path*` permanently redirects to the unique unprefixed English URL. No visible language selector is added.

Add content at `content/<locale>/<category>/<slug>.mdx`. Required frontmatter: `title`, `description`, `category`, `publishedAt` (quoted YYYY-MM-DD); optional `updatedAt`. Category must match the containing folder. Discovery drives SSG routes, categories, article lists, related reading, hreflang and sitemap. Only existing translations become alternate links. Tests add temporary MDX to prove discovery expands without editing a slug registry. Route/browser scripts derive expected route collections from that same source.

Original placeholder content is labeled in the article confidence note. Five files are translations of one complete article; the remaining reference cards are previews with no article URL and no sitemap entry. There are no analytics, live ads, search backend, accounts, or generated Legal pages.

Development defaults to noindex. Set configuration **before production build**:

```sh
SITE_URL=https://your-real-domain.example SITE_INDEXABLE=true pnpm build
SITE_URL=https://your-real-domain.example SITE_INDEXABLE=true pnpm start
SITE_URL=https://your-real-domain.example SITE_INDEXABLE=true pnpm verify:routes
```

`SITE_URL` controls absolute canonical, alternate, Open Graph, robots sitemap and sitemap URLs. `SITE_INDEXABLE=true` enables indexing and crawling; otherwise pages emit noindex and robots disallows crawling. Do not use the example domain in a real build. Values require no secrets.

The template excludes installed dependencies, build output, generated type declarations, TypeScript caches, and historical verification artifacts. Run `pnpm install` before development. Next.js recreates the required generated files during `dev`, `build`, or `typecheck`.
