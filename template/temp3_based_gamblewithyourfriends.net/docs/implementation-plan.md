# Three-page reference implementation

Reference: gamblewithyourfriends.net, /guide/, /beginner-guide/. Evidence acquired with the user's Chrome CDP session at 1440px and 390px, including full-page screenshots and expanded mobile navigation. No reference source code or proprietary assets are copied.

1. Create minimal pnpm Next.js / TypeScript / Tailwind project in the otherwise empty checkout.
2. Share header, footer, breadcrumbs, cards, FAQ and article components. Preserve reference widths (1280 / 1152 / 896px), responsive breakpoints, module order and visual density.
3. English has unprefixed URLs; de, pt-BR, es, zh-CN have prefixes. Redirect /en aliases. No visible language switcher.
4. Discover frontmatter-bearing MDX files in content/{locale}/ automatically. Create only one original beginner article per locale. Keep other topics as explicitly unavailable previews; exclude them from routing and sitemap.
5. Pre-render the discovered page set. Derive canonical, hreflang and x-default from existing translations. Default to configurable noindex.
6. Test discovery, invalid content, locale paths and extensibility. Verify all live routes and SEO from the same discovery data. Use the same Chrome connection for full-page desktop/mobile QA, keyboard/menu/FAQ/image/overflow/console checks, then fix observed differences.

Original generated casino art replaces game screenshots; article illustrations are original schematic placeholders, labelled as illustrations. No deployment, analytics, extra content types, or legal pages.
