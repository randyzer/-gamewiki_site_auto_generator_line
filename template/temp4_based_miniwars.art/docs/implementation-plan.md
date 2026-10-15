# Frontier Codex implementation plan

Goal: Reproduce the three observed miniwars.art templates, with original placeholder content, five locales, MDX and static rendering.
Architecture: One catch-all static route resolves locale and page type. One dictionary per locale supplies shared templates. MDX files are the source for complete guides; separate preview records preserve reference density.
Stack: Next.js 16.4, TypeScript, Tailwind 4, pnpm, next-mdx-remote, gray-matter.

- [x] Inspect empty workspace and preserve .gitignore.
- [x] Inspect home, /guides and beginner-opening-guide at 1440 and 390; full screenshots and measured layout saved in docs/reference. Verify mobile menu.
- [x] Create package/config and test content discovery, validation, URL strategy and SEO rules before their implementation.
- [x] Implement content and route discovery; translations share rendering, with one complete guide per locale.
- [x] Implement header/footer, cards, home, list and article templates. Keep the 10 home sections, 8 guide entries (one complete article and seven previews) and 3 related cards. No images or language switcher exist on the reference.
- [x] Run pnpm test, pnpm typecheck, pnpm build. New valid MDX must expand routes, list, related content and sitemap without registry edits.
- [x] Start production server; dynamically verify every discovered route, canonical, hreflang, x-default, robots, sitemap, 404 and /en redirects.
- [x] Use the same Chrome CDP connection for complete 1440/390 screenshots, menu/keyboard/aria tests, link navigation, overflow and error checks. Compare modules and rhythm, correct differences and recapture.
- [x] Document confirmed differences, scope limitations and pnpm commands; stop at these three page types.

Reference constraints: 1280px outer container, 16px gutters, 90.5px header, Impact/system sans/monospace rendered fonts. Home hero two columns then stacked on mobile; 64px section vertical padding. List intro two-thirds plus one-third jump panel, three-column cards then single-column. Article hero 896px outer width, body 768px outer with a 736px bordered panel; 40px desktop / 24px mobile panel padding. Footer margin-top 96px.
