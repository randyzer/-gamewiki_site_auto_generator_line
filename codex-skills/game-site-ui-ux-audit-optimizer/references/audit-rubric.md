# Game-guide UI/UX audit rubric

Use this rubric after browser evidence is collected. Do not substitute source-code inspection for observation.

## 1. Game identity and atmosphere

- The game name, favicon, imagery, palette, type, and decorative language agree.
- The page feels connected to the game's genre without sacrificing reading clarity.
- Generated fan artwork is not represented as official.
- Old-template game names, domains, screenshots, characters, stats, and community links are absent.
- Motion and effects support the game mood and respect reduced motion.

## 2. Homepage

- The first viewport identifies the game and the site's player value.
- Primary CTA leads to the most useful starting action.
- Beginner, codes, core systems, and current guides are findable without guessing.
- Facts and social proof are verified; empty or unknown data is not disguised.
- Official media does not dominate Core Web Vitals or obscure the value proposition.

## 3. Information architecture

- Header, mobile navigation, sidebar, category pages, breadcrumbs, and footer agree.
- Routes use predictable labels and current-page states.
- Category pages help users choose; they are not decorative link dumps.
- Article pages provide nearby next actions and related guides.
- Search exists only when functional and useful.

## 4. Article readability

- One clear H1 and logical heading order.
- Opening directly answers the keyword intent.
- Desktop text measure remains readable; paragraphs are scannable.
- Tables, comparison grids, steps, callouts, and code blocks reflow safely.
- Sticky TOC/sidebar does not obscure focus or content.
- Source/version/date context is visible when the fact can become stale.

## 5. Game-specific components

### Codes

- Code, reward, status, and verification context are distinguishable.
- Copy control is labelled, keyboard accessible, and provides feedback.
- Expired/unverified/none states are honest.
- Mobile rows do not clip the code or reward.

### Tier lists and comparisons

- Rank is not communicated by color alone.
- Definitions and update context are visible.
- Wide matrices scroll or transform without hiding labels.

### Builds, classes, races, bosses, gear, items, and maps

- Repeated cards use a consistent data hierarchy.
- Requirements and uncertainty are not visually confused with recommendations.
- Dense stats remain legible on mobile.
- Images have meaningful alternatives where they convey information.

## 6. Responsive behavior

Test 360, 390, 768, 1024, 1440, and 1920 widths.

- No horizontal document scroll.
- Navigation collapses predictably.
- Sidebars become drawers, accordions, or inline sections safely.
- Tables and embedded media remain operable.
- Tap targets are at least 44×44 CSS pixels where practical.
- Fixed bars do not cover the first/last content or focused controls.
- Wide screens do not stretch paragraphs or create empty, disconnected layouts.

## 7. Accessibility and interaction

- Keyboard order follows visual order with visible focus.
- Controls have accessible names, roles, and state.
- Body text meets 4.5:1 contrast; large text and meaningful UI boundaries meet 3:1.
- Color is not the only status signal.
- Images have correct alt semantics.
- Forms retain errors and focus an error summary when appropriate.
- Animations honor reduced motion.
- Hover-only information has focus/touch access.

## 8. Media, performance, and stability

- Responsive images have stable aspect ratios or intrinsic dimensions.
- Hero/media choices fit the route and are not misleading.
- Lazy content is still discoverable and does not leave blank screenshots.
- No visible CLS from images, fonts, embeds, cookie UI, or ads.
- Console errors, failed requests, and 404 assets are recorded.
- Decorative effects do not create sustained main-thread or GPU pressure.

## 9. Advertising compatibility

- Ad slots reserve space and do not overlay navigation or primary actions.
- Mobile ads do not obscure copy controls, tables, or article endings.
- Ads are visually distinct from editorial cards.
- Layout remains coherent when slots are empty.
- Consent UI, when present, remains keyboard accessible.

## 10. Release integrity

- Homepage, representative list, and representative detail pages render.
- Legal and 404 pages use the target identity.
- Public copy contains no `待确认`, placeholder hrefs, or internal notes.
- Official links are intentional and reachable when network verification is in scope.
- Page title, H1, navigation label, and keyword intent do not contradict each other.
