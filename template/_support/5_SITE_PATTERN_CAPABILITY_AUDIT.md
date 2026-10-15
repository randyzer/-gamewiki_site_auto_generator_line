# 5-Site Pattern Capability Matrix Audit

**Status:** Architecture analysis only  
**Audit date:** 2026-09-30  
**Workspace:** `/Users/randyz/work/coding/hot_words_web/template`  
**Evidence rule:** Only the five local extracted implementations listed below were used. No live-site behavior or external source was credited.

## A. Executive Summary

The five implementations do not support the idea of one increasingly large universal starter. They show five useful but materially different product shapes:

- VV-based is the strongest **wiki/archive browsing and production-state safety** reference: deep homepage routing, explicit unavailable states, sidebar IA, ad spacing, a custom 404, and the only browser-level route/overflow tests. Its major weakness is that all “media” is CSS art.
- Farever-based is the strongest **fantasy immersion and cohesive visual identity** reference: tokens, serif/sans hierarchy, fantasy vocabulary, world/path/region composition, Featured and Latest content derived from MDX. It is weak in article utilities, mobile interaction, real media, and testing depth.
- Gamble-based is the strongest **problem-oriented editorial and article-component** reference: Quick Answer, steps, metrics, mistakes, FAQ, next step, responsive tables, reusable inline figures, captions, and a clear player-task IA. Its SVG illustrations are not game screenshots; its declared article `cover` is not rendered by the article hero.
- MiniWars-based is the strongest **tactical/system pattern and tested mobile accessibility** reference: doctrine, assets, systems, ranked items, tagged related content, Escape close, and focus restoration. It has no substantive media system and contains static “online/latest” labels that are not live data.
- BombFarm-based is the strongest **commercial editorial/wiki shell** reference: cover image, breadcrumbs, TOC, FAQ, related cards, Popular, Latest Updates, Browse Everything, skip link, and a deep homepage. Its media is still fictional SVG artwork, related content is merely recency-based, and it has no tests at all.

No implementation contains verified game screenshots, video embeds, galleries of real game media, media attribution/source fields, canonical URLs, Open Graph/Twitter metadata, structured data, sitemap, robots route, or actual site search. Therefore **none is launch-complete as a commercial game-site foundation**.

### Architecture verdict

Choose **C. Stable Core Starter + Product Contract + Pattern Library + Game Adaptation Layer + Independent Acceptance Gate**.

Evidence: accessibility and routing contracts are portable across games; homepage compositions and article modules recur in combinations; colors, typography, vocabulary, game objects, and actual media are irreducibly game-specific; and every implementation has gaps that a separate acceptance gate must detect. Combining all five homepages into Core would hardcode contradictory IA and create an ever-growing template. Maintaining five independent starters would duplicate SEO, media, navigation, 404, and accessibility fixes.

## B. Audit Scope

### Included

- `app/`, `components/`, `content/`, `lib/`, `public/`, `tests/`, layout files, global CSS, route files, metadata, article shells, navigation, home sections, and `package.json`.
- Static code evidence, content-model evidence, and the behaviors explicitly protected by tests.
- Media files bundled locally and how the code consumes them.

### Excluded

- Live external websites and assumptions about their original behavior.
- `node_modules`, `.next`, caches, build output, screenshots generated for implementation review, and planning/spec documents as product evidence.
- Runtime claims not supported by local code. Tests were inspected, not executed; this audit reports what is under contract, not a fresh pass/fail result.

### Audit method

1. Verified `pwd` and `realpath .` both equal the required workspace.
2. Confirmed all five source directories exist.
3. Inventoried routes, content, components, local media, tests, scripts, and CSS.
4. Traced each claimed capability from data model to renderer and, where present, to a test.
5. Distinguished reusable capability from hardcoded composition, and real media plumbing from simulated/decorative artwork.

## C. Source Inventory

| Reference | Product identity in code | Routes/content | Local media | Test contract | CSS size |
|---|---|---|---|---|---:|
| `temp1_based_vvultimatum.net` | Eclipse: Requiem Wiki | Home, race index, one race detail, custom 404; one MDX article | No image/video files; CSS `MediaArt` only | 55 unit/component/E2E test cases; Playwright routes, overflow, keyboard focus, 404 and unavailable states | 2,459 lines |
| `temp2_based_farevergame.wiki` | Aetherfall Archive | Home, guide index, six guide details, custom 404 | App icon only; CSS `FantasyArt` | 7 unit/component cases; content loading and basic links/cards | 1,587 lines |
| `temp3_based_gamblewithyourfriends.net` | Neon Stakes Guide | Home, guide hub, six guide details; default framework 404 | Four SVG illustrations/logomark consumed through `next/image` | 5 unit/component cases; content/draft handling, MDX source, menu toggle | 774 lines |
| `temp4_based_miniwars.art` | Frontier Command Field Codex | Home, guide index, six guide details; default framework 404 | App icon only; CSS graphics | 22 unit/component/integration cases; content registry, tagged related guides, route 404 branch, Escape and focus restore | 2,530 lines |
| `temp5_based_bombfarm.wiki` | Emberdeep Codex | Home, guide overview, six guide details, custom 404 | Three SVG illustrations plus app icon through `next/image` | No tests and no `test` script | 1,619 lines |

Representative evidence:

- VV content validation and date sorting: `temp1_based_vvultimatum.net/lib/content.ts:53-128`; CSS-only art: `components/media-art.tsx:7-18`; E2E route/overflow contract: `tests/routes.spec.ts:24-47`.
- Farever data-driven Featured/Latest: `temp2_based_farevergame.wiki/app/page.tsx:91-95`; CSS-only decorative art: `components/fantasy-art.tsx:8-29`.
- Gamble inline figure primitive: `temp3_based_gamblewithyourfriends.net/components/content-figure.tsx:3-17`; problem-oriented MDX components: `components/mdx-components.tsx:7-47`.
- MiniWars tag-ranked related selection: `temp4_based_miniwars.art/lib/guide-utils.ts:18-36`; tested Escape/focus restoration: `components/mobile-nav.tsx:17-29` and `tests/mobile-nav.test.tsx:12-32`.
- BombFarm article cover/TOC: `temp5_based_bombfarm.wiki/components/article-shell.tsx:32-68`; strict metadata parsing: `lib/articles.ts:113-201`; no tests in package scripts: `package.json:9-14`.

## D. Five-Site Product Profiles

### 1. VV-based — archive/wiki routing pattern

**Identity and visual system.** A restrained dark supernatural archive with teal, blue, and violet tokens (`app/globals.css:3-15`), a custom ER mark, “Veil,” “field archive,” “patrol,” and “binding” vocabulary. Identity is game-specific, although typography is a generic system stack. The visual implementation is heavily centralized in a 2,459-line global stylesheet.

**Homepage objective.** Route users from orientation to race comparison and then to the only verified detail page. It contains Hero, Latest Field Updates, Start Here, Trending, Game Overview, category cards, FAQ, CTA, and an explicit ad spacer (`app/page.tsx:43-303`). It encourages depth, but many destinations are intentionally static/unavailable.

**IA and articles.** Mixed content/game-object IA: top navigation, persistent wiki sidebar, race hub, breadcrumbs, one detail article, callouts, ordered steps, pros/cons, and post-article modules. There is no TOC and no generalized related-content selector.

**Media.** `MediaArt` renders spans and gradients inside a figure-like element; it is not an image workflow (`components/media-art.tsx:7-18`). Hero, cards, and article intro therefore demonstrate composition slots, not real game media support. There are no cover files, inline figures, captions, attribution, galleries, or video.

**Freshness and commercial depth.** Article dates are validated content metadata and shown as “Last verified.” Homepage revision, updates, and Trending are hardcoded arrays (`lib/site-data.ts:99-180`) and must not be described as analytics/live systems. Commercial readiness is **STRONG structurally** because of long page rhythm, sidebar, explicit ad spacers, multiple internal paths, and stable disabled states.

**Accessibility/production/testing.** Skip link, focus-visible styling, reduced motion, semantic unavailable states, custom 404, horizontal-overflow E2E, route navigation, FAQ and focus-ring tests are strong. Mobile menu has `aria-expanded`/`aria-controls` but no Escape handler or focus restoration (`components/site-header.tsx:47-89`).

### 2. Farever-based — fantasy immersion pattern

**Identity and visual system.** The most coherent fantasy identity: purple-black canvas, gold/aqua accents, Georgia display face, expedition language, ornamental borders, sigils, paths, regions, wardens, relics, and camps (`app/globals.css:3-19`; `app/page.tsx:8-89`). It clearly reads as a game-world archive rather than renamed SaaS UI.

**Homepage objective.** Immerse first, then route by world, path, region, first steps, tools, featured guides, latest dispatches, FAQ, and CTA. Featured and Latest derive from six MDX records and real `publishedAt` ordering (`app/page.tsx:91-95`, `lib/guides.ts:95-110`). However, all nine starter cards point to one article and all seven “tools” point to `/guide/`, so some apparent breadth is presentation rather than capability.

**IA and articles.** Content-driven guide index and detail routes with related guides selected by same category, then recency fallback (`app/guide/[slug]/page.tsx:38-45`). The article shell provides title, description, filed date, body, related cards, and All Guides CTA. It lacks breadcrumbs, cover, TOC, inline media, callouts, tables, and article FAQ.

**Media.** `FantasyArt` is explicitly `aria-hidden` CSS decoration made from spans (`components/fantasy-art.tsx:15-28`). There is no real image component beyond the app icon and no media metadata.

**Commercial readiness.** **MEDIUM.** Homepage depth and content-derived Featured/Latest support sessions, but the short/simple article shell, lack of media alternation/sidebar/TOC, and false breadth of repeated destinations limit ad and discovery quality.

**Accessibility/production/testing.** Focus-visible and reduced motion exist. Mobile navigation is a permanently rendered horizontal link strip, not an open/close menu (`components/site-header.tsx:47-61`). No skip link, Escape/focus management, route tests, or interaction tests. Custom 404 exists. Test scope protects content parsing and basic links only.

### 3. Gamble-based — problem-oriented commercial guide pattern

**Identity and visual system.** Neon casino identity is concrete: gold/green/navy tokens, Oswald display type, Manrope body type, “shared vault,” “crew,” “table,” and “night” vocabulary (`app/globals.css:3-18`; `lib/site.ts:6-13`). It has the clearest task/problem framing of the five.

**Homepage objective.** Explain the loop, expose all guides, route by table object, teach top tips, answer FAQ, and send users to a complete guide or crew roles (`app/page.tsx:18-88`). The separate guide hub adds Quick Start, all guide cards, first-run checklist, quick-answer content, and More Help routes (`app/guide/page.tsx:21-57`).

**IA and articles.** Player-task driven. Article MDX supports Quick Answer, figures, step grid, metrics, rule callout, item list, mode comparisons, mistakes/fixes, FAQ, next-step CTA, and responsive tables (`components/mdx-components.tsx:7-47`). This is the strongest reusable content-utility set. Related cards simply take the first three other guides and are not semantically ranked (`app/[slug]/page.tsx:30-38`).

**Media.** It has the strongest reusable inline-media primitive: `next/image`, responsive sizing, required alt, and caption (`components/content-figure.tsx:3-17`). Three illustrations are used in hero/guide/MDX contexts. They are original SVG artwork, not game screenshots. `cover` exists in frontmatter (`lib/content.ts:7-17`) but `ArticleHero` never renders it (`components/article-hero.tsx:4-15`), so article-cover support is incomplete. No attribution/source, gallery, fallback, or video.

**Freshness and commercial depth.** Dates drive ordering, but ArticleHero labels `publishedAt` as “Updated,” which conflates two concepts. Commercial readiness is **STRONG for editorial rhythm / MEDIUM for media and SEO**: long-form component variety and cross-links create useful ad intervals, while no TOC/sidebar/schema/canonical reduces maturity.

**Accessibility/production/testing.** Breadcrumbs, focus-visible, reduced motion, semantic details/summary FAQ, and a tested menu toggle exist. The menu lacks Escape and focus restoration; no skip link or custom 404 is present. Draft exclusion and metadata errors are tested, but no route/E2E contract exists.

### 4. MiniWars-based — tactical/systems pattern

**Identity and visual system.** The strongest tactical visual grammar: near-black tactical canvas, paper/radar/signal tokens, condensed/mono/body font triad, corner cards, indexed navigation, telemetry, doctrine, assets, operations, and dispatch language (`app/globals.css:3-19`; `components/home-sections.tsx`). It is highly game-specific and should not become Core styling.

**Homepage objective.** Route by doctrine, ranked assets, systems, featured operations, dispatches, latest guides, FAQ, and starter CTA (`components/home-sections.tsx:668-681`). It is optimized for systems understanding and prioritization rather than lore browsing. The guide index adds skill-level reading paths, topic jumps, an in-page index, and cross-navigation (`app/guides/page.tsx:15-171`).

**IA and articles.** Mixed system/player-task IA. Content registry validates dates, reading times, and tags. Related guides are ranked by shared tags then recency (`lib/guide-utils.ts:18-36`), the best relevance implementation in the sample. Article shell adds metadata/tags, cross-references, and related cards, but no cover, breadcrumb trail, TOC, figures, callouts, tables, or FAQ.

**Media.** No public media beyond the app icon. Visual “plots,” radar marks, and tactical panels are CSS decoration. This is not a real media system.

**Freshness and commercial depth.** Article dates and Latest Guides are content-derived. “SIGNAL · ONLINE” (`components/site-header.tsx:10-17`), “LATEST FIELD UPDATE · 29 SEP,” and dispatch arrays are static presentation, not live status. Commercial readiness is **MEDIUM**: excellent browsing depth and long-form guides, but limited media/content alternation, no sidebar/TOC, and no explicit ad-slot seam.

**Accessibility/production/testing.** Strongest mobile interaction reference: `aria-controls`, `aria-expanded`, Escape close, focus restoration, and tests for both Escape and navigation selection (`components/mobile-nav.tsx:13-72`; `tests/mobile-nav.test.tsx`). Reduced motion and focus-visible are present. It lacks a skip link and custom 404 page, though the not-found branch is tested. Content registry, route params, related ranking, article shell, and homepage links are under contract.

### 5. BombFarm-based — commercial editorial/wiki pattern

**Identity and visual system.** Strong mining/expedition identity: amber/orange/green tokens, Oxanium/Figtree pairing, technical SVGs, “descent,” “crew,” “forge,” “layers,” and “survey desk” vocabulary (`app/globals.css:3-19`; `app/page.tsx:26-41`).

**Homepage objective.** The deepest commercial browsing architecture: Hero, Stats, Overview, six system/category hubs, Featured Guides, Latest Updates, Popular, five-step Quick Start, Browse Everything, FAQ, and CTA (`app/page.tsx:43-307`). It explicitly routes by problem and game object and supports second/third clicks.

**IA and articles.** Article metadata requires cover, alt, section list, and FAQs. The shell renders breadcrumbs, cover, two-column reading grid, TOC, FAQ, and up to six related cards (`components/article-shell.tsx:32-87`). This is the best wiki/article-shell reference. Related selection is only “all other articles in recency order,” not topical relevance (`lib/articles.ts:294-303`).

**Media.** Hero, overview, and article cover use `next/image`; metadata validates absolute cover paths and nonempty alt (`lib/articles.ts:146-200`). Yet all articles reuse the same fictional `guide-cover.svg`, and no inline figure/caption/source/attribution/gallery/video model exists. It is a real image pipeline for local illustrations, not real-game media completeness.

**Freshness and commercial depth.** Article dates and homepage update dates are validated. Popular and updates are static editorial arrays, not telemetry (`lib/site-data.ts:141-233`). Commercial readiness is **STRONG structurally** due homepage depth, cover + long-form alternation, TOC sidebar, related grid, and Browse Everything.

**Accessibility/production/testing.** Skip link, focus-visible, reduced motion, nested mobile accordions, Escape and focus restoration are implemented. None is tested. Custom 404 exists. This project has zero tests and no `test` script, so no product capability is independently protected.

## E. Capability Matrix

Legend: **Yes** = reusable capability implemented; **Partial** = present but incomplete or one-off; **Static** = hardcoded editorial presentation; **Simulated** = CSS/decorative media, not real media; **No** = absent. “Best Reference” means best local reference for that row, not best overall site.

| # | Capability | VV-based | Farever-based | Gamble-based | MiniWars-based | BombFarm-based | Best Reference | Classification | Recommended Owner | Notes |
|---:|---|---|---|---|---|---|---|---|---|---|
| 1 | Game-specific color tokens | Yes | Yes | Yes | Yes | Yes | Farever | GAME-SPECIFIC | GAME ADAPTATION | Every site hardcodes its own palette; Core should only define semantic slots. |
| 2 | Game-specific typography | Partial system font | Yes | Yes | Yes | Yes | MiniWars | GAME-SPECIFIC | GAME ADAPTATION | Font choices carry genre; MiniWars has display/body/mono roles. |
| 3 | Game-specific UI vocabulary | Yes | Yes | Yes | Yes | Yes | MiniWars | GAME-SPECIFIC | GAME ADAPTATION | “Field Manual,” “Veil,” “Shared Vault,” etc. must not enter Core. |
| 4 | Hero media support | Simulated | Simulated | Yes, SVG art | Simulated | Yes, SVG art | BombFarm | CORE | CORE STARTER | Core needs a typed hero-media slot; art choice belongs to adaptation. |
| 5 | Real image support | No | No | Yes, illustration only | No | Yes, illustration only | Gamble | CORE | CORE STARTER | `next/image` plumbing exists; no site has verified screenshots/photos. |
| 6 | CSS/simulated art | Yes | Yes | No | Yes | No | Farever | OPTIONAL | PATTERN LIBRARY | Valid decoration, never evidence of screenshot completeness. |
| 7 | Article cover image | Simulated intro | Tone only | Metadata unused | No | Yes | BombFarm | PATTERN | PATTERN LIBRARY | BombFarm renders validated cover + alt; Gamble exposes the unused-metadata anti-pattern. |
| 8 | Inline article figure | No | No | Yes | No | No | Gamble | CORE | CORE STARTER | Reusable `ContentFigure` with responsive image, alt, caption. |
| 9 | Gallery | Simulated card carousel | No | No | No | No | VV (interaction only) | OPTIONAL | PATTERN LIBRARY | No true media gallery exists. |
| 10 | Video embed | No | No | No | No | No | None | OPTIONAL | PATTERN LIBRARY | Core should expose a seam, but no reference proves an implementation. |
| 11 | Media captions | No | No | Yes | No | No | Gamble | CORE | CORE STARTER | Caption required by component; not available for BombFarm covers. |
| 12 | Media attribution/source | No | No | No | No | No | None | CORE | CORE STARTER | Missing from every data model. |
| 13 | Start Here | Yes | Yes | Yes | Yes | Yes | Gamble | PATTERN | PATTERN LIBRARY | Best as selectable home/hub pattern, not fixed Core section. |
| 14 | Player journey | Partial; two steps unavailable | Repeated starter cards | Quick Start + checklist | Doctrine sequence | Five-step routine | BombFarm | PATTERN | GAME ADAPTATION | Journey structure reusable; actual progression is game-specific content. |
| 15 | Game overview | Yes | Yes | Yes | Yes | Yes | BombFarm | PATTERN | PATTERN LIBRARY | Recurring orientation module with game-owned facts. |
| 16 | Category hubs | Partial; mostly unavailable | Visual sections, not hubs | Guide/problem hub | Doctrine/assets/systems | Six linked hubs | BombFarm | PATTERN | PATTERN LIBRARY | Needs content-driven taxonomy, not hardcoded cards. |
| 17 | Game-object hubs | Race hub | Paths/regions (shared targets) | Tables/items/roles | Assets/systems | Crews/loadouts/expeditions | MiniWars | GAME-SPECIFIC | GAME ADAPTATION | Object model and hierarchy are game-specific. |
| 18 | Featured guides | Partial single live guide | Data-driven `featured` | Flag exists, not used on home | Hardcoded ops + latest guides | All guide records presented | Farever | PATTERN | PATTERN LIBRARY | Farever actually filters frontmatter. |
| 19 | Popular content | No | No | No | Ranked assets, not popularity | Static editorial list | BombFarm | PATTERN | PATTERN LIBRARY | Must be labeled editorial unless backed by analytics. |
| 20 | Trending content | Static hardcoded | No | No | No | No | VV | OPTIONAL | DO NOT ADOPT | Do not ship “trending” unless provenance is explicit. |
| 21 | Latest updates | Static dates | Content-derived latest | No | Mixed content + static dispatches | Static, date-validated | Farever | PATTERN | PATTERN LIBRARY | Prefer deriving from revision/content records. |
| 22 | Browse everything | Partial category grid | Guide index | Guide hub + help links | Guide index/jump panel | Explicit Browse Everything | BombFarm | PATTERN | PATTERN LIBRARY | Strong session-depth pattern. |
| 23 | FAQ | Interactive | Native details | Native details + article FAQ | Static definition list | Home + per-article | BombFarm | PATTERN | PATTERN LIBRARY | FAQ content must be real utility; schema is separate. |
| 24 | CTA | Yes | Yes | Yes | Yes | Yes | Gamble | PATTERN | PATTERN LIBRARY | Reusable placements, game-specific copy/destination. |
| 25 | Breadcrumbs | Yes | No | Yes | Back link only | Yes | BombFarm | CORE | CORE STARTER | Core route primitive with `aria-current`. |
| 26 | TOC | No | No | No | No | Yes | BombFarm | PATTERN | PATTERN LIBRARY | Required for sufficiently long articles; section IDs validated there. |
| 27 | Related guides | One static post card | Category + fallback | Unranked others | Tag-ranked + recency | Unranked recency | MiniWars | CORE | CORE STARTER | Capability belongs in Core; relevance strategy is pluggable. |
| 28 | Next-step CTA | Static compare path | All Guides | MDX `NextStep` | Cross-reference + all guides | Related block only | Gamble | PATTERN | PATTERN LIBRARY | Gamble offers an authorable article component, though destination is fixed. |
| 29 | Callouts | Yes | No | Several typed forms | No | No | Gamble | PATTERN | PATTERN LIBRARY | Info/warning/rule/mistake are useful editorial primitives. |
| 30 | Tables | No | No | Responsive GFM table | No | No | Gamble | PATTERN | PATTERN LIBRARY | Overflow wrapper is reusable. |
| 31 | Steps | Article list + journey | Basic MDX lists | Typed StepGrid | Ordered doctrine | Five-step journey | Gamble | PATTERN | PATTERN LIBRARY | Use semantic ordered lists with optional rich cards. |
| 32 | Rankings | No | No | No | Ranked assets | Static Popular numbering | MiniWars | PATTERN | PATTERN LIBRARY | Ranking needs declared method/source. |
| 33 | Decision support | Strong compare/pros-cons | Moderate | Strongest | Strong systems prioritization | Strong | Gamble | CORE | PRODUCT CONTRACT | Quick answers, mistakes/fixes, metrics, and checklists best support action. |
| 34 | Freshness metadata | Real article + hardcoded home | Real published dates | Published mislabeled Updated | Real articles + static status | Real articles + static home | Farever | CORE | CORE STARTER | Model `publishedAt`, `updatedAt`, patch/version separately. |
| 35 | Mobile menu | Toggle | Horizontal strip | Toggle | Toggle | Nested toggle | BombFarm | CORE | CORE STARTER | BombFarm has richest hierarchy; testing gap remains. |
| 36 | Escape close | No | N/A | No | Yes, tested | Yes, untested | MiniWars | CORE | ACCEPTANCE GATE | Must be a launch gate for dismissible navigation. |
| 37 | Focus restoration | No | N/A | No | Yes, tested | Yes, untested | MiniWars | CORE | ACCEPTANCE GATE | Test focus returns to the trigger. |
| 38 | Skip link | Yes | No | No | No | Yes | BombFarm | CORE | CORE STARTER | Simple universal accessibility primitive. |
| 39 | Reduced motion | Yes | Yes | Yes | Yes | Yes | BombFarm | CORE | CORE STARTER | BombFarm additionally neutralizes hover transforms/shadows. |
| 40 | OG metadata | No | No | No | No | No | None | CORE | CORE STARTER | Missing everywhere. |
| 41 | Canonical | No | No | No | No | No | None | CORE | CORE STARTER | Missing everywhere. |
| 42 | Structured data | No | No | No | No | No | None | CORE | CORE STARTER | Core schema seam; Article/Breadcrumb/FAQ selection by page. |
| 43 | Sitemap | No | No | No | No | No | None | CORE | CORE STARTER | Missing everywhere. |
| 44 | Robots | No | No | No | No | No | None | CORE | CORE STARTER | Missing everywhere. |
| 45 | 404 | Custom + tested | Custom, untested | Default only | Default branch tested | Custom, untested | VV | CORE | CORE STARTER | Recovery destinations must be valid routes. |
| 46 | Search | No | No | No; “Quick Search Answers” is copy | No | No | None | OPTIONAL | PATTERN LIBRARY | Core should expose a search seam, not fake a working search. |
| 47 | Ad-ready layout | Strong explicit spacers/sidebar | Medium | Medium/strong article rhythm | Medium | Strong | VV | CORE | PRODUCT CONTRACT | Require stable reserved slots; do not couple Core to an ad network. |
| 48 | Long-form content rhythm | Strong but one article | Short/simple | Strongest component variety | Strong prose | Strong cover/TOC/FAQ rhythm | Gamble | PATTERN | PATTERN LIBRARY | Alternate prose, decision modules, media and navigation. |
| 49 | Cross-navigation | Strong sidebar/routes | Strong home-to-guide | Strong problem links | Strongest system crossrefs | Strong browse/related | MiniWars | CORE | PRODUCT CONTRACT | Every entry page should expose a useful next page. |
| 50 | Template residue safety | Explicit unavailable states | Explicitly calls content placeholders | Explicit fictional disclaimer | Icon test rejects source-brand residue | Explicit fictional/independent copy | VV | ANTI-PATTERN | ACCEPTANCE GATE | Block copied names, fake production metrics, and unverified claims. |
| 51 | Unavailable-state handling | Strong + tested | Minimal empty related | Loader null/empty only | Not-found only | 404 + hidden empty related | VV | CORE | CORE STARTER | Static non-focusable states beat fake/dead links. |
| 52 | Route testing | E2E all routes/404/navigation | No | No | Unit route params/404 | No | VV | CORE | ACCEPTANCE GATE | Route existence, status, recovery and core navigation. |
| 53 | Interaction testing | FAQ/menu/gallery/focus E2E | No | Menu toggle only | Escape/focus/menu | No | MiniWars | CORE | ACCEPTANCE GATE | Test behavior, not just render count. |
| 54 | Article metadata validation | Strict, tested | Basic, tested | Required fields, tested | Strict tags/dates, tested | Strict cover/sections/FAQ, untested | MiniWars | CORE | CORE STARTER | Combine MiniWars contracts with BombFarm media/section fields. |
| 55 | Draft exclusion | No model | No model | Yes, tested | No model | No model | Gamble | CORE | CORE STARTER | Production content pipeline needs draft/unpublished safety. |
| 56 | Tag-based relevance | No | Category only | No | Yes, tested | No | MiniWars | PATTERN | PATTERN LIBRARY | Useful default related strategy when taxonomy exists. |
| 57 | Sidebar opportunity | Wiki sidebar | No | No | Guide jump panel | Sticky TOC | BombFarm | PATTERN | PATTERN LIBRARY | Pattern selection depends on article and monetization model. |
| 58 | Legal/independence disclosure | Yes | Yes | Yes | “Independent Codex” | Yes | Farever | CORE | PRODUCT CONTRACT | Legal-safe truthful defaults; real project copy must replace placeholders. |
| 59 | Horizontal overflow contract | Yes, E2E | No | Table wrapper only | No | No | VV | CORE | ACCEPTANCE GATE | Test every core route at mobile/desktop widths. |
| 60 | Empty-state handling | Trending empty + disabled controls | Related empty copy | Missing content dir returns `[]` | No related empty branch | Related section omitted | VV | CORE | CORE STARTER | Empty/loading/unavailable states must remain truthful and usable. |

### Matrix counts

- Capability rows: **60**
- CORE: **30**
- PATTERN: **20**
- GAME-SPECIFIC: **4**
- OPTIONAL: **5**
- ANTI-PATTERN: **1**

## F. Pattern Library Candidates

### 1. WIKI / ARCHIVE PATTERN

- **Best Source:** BombFarm-based, with VV-based sidebar/unavailable-state additions.
- **Purpose:** Organize a broad knowledge base and move users from overview → hub → detail → related detail.
- **Best-fit game types:** RPGs, collection games, games with characters/items/regions/progression systems.
- **Core layout traits:** Hero/overview, taxonomy hubs, guide feed, article cover, breadcrumbs, TOC/sidebar, FAQ, related grid, Browse Everything.
- **Content traits:** Validated metadata, durable object pages, system explainers, reading order, revision dates.
- **Media traits:** Cover slot plus optional figures; screenshot and illustration types must be visibly differentiated.
- **Navigation traits:** Top nav, object hubs, breadcrumbs, TOC, related content, browse index.
- **Commercial strengths:** Deep sessions, stable long-form rhythm, sidebar and between-section inventory, strong internal linking.
- **Risks:** Fixed categories masquerading as generic IA; a single repeated cover; static “Popular”; huge related grids with weak relevance.
- **Must not be hardcoded into Core:** “Guides,” mine/expedition vocabulary, specific hubs, TOC visibility threshold, article-cover requirement, sidebar layout.

### 2. FANTASY IMMERSION PATTERN

- **Best Source:** Farever-based.
- **Purpose:** Establish world tone before directing users into practical guides.
- **Best-fit game types:** Fantasy RPG, co-op adventure, lore-rich exploration.
- **Core layout traits:** Atmospheric hero, world overview, class/path cards, region cards, starter journey, featured notes, dispatches, CTA.
- **Content traits:** World language, role descriptions, region dossiers, calm narrative framing.
- **Media traits:** Large atmospheric hero/region art; real game media must replace or sit alongside CSS decoration.
- **Navigation traits:** World/path/region anchors, guide index, Featured and Latest feeds.
- **Commercial strengths:** Strong brand memory and a deep homepage.
- **Risks:** Visual spectacle can hide shallow destinations; repeated cards can all lead to the same page; CSS art can be mistaken for media completeness.
- **Must not be hardcoded into Core:** Purple/gold theme, serif ornaments, “archive/veil/warden” vocabulary, fixed paths/regions.

### 3. PROBLEM-ORIENTED GUIDE PATTERN

- **Best Source:** Gamble-based.
- **Purpose:** Answer a searcher’s immediate question, then support a decision and next action.
- **Best-fit game types:** Strategy, co-op, live-service mechanics, build/optimization sites.
- **Core layout traits:** Quick Answer, problem intro, steps, metrics, comparison/table, mistakes/fixes, FAQ, next step, related cards.
- **Content traits:** Concrete choices, thresholds, failure recovery, checklists, role assignments.
- **Media traits:** Inline figures with captions close to the decision they explain.
- **Navigation traits:** Problem-labeled links, beginner path, all-guides hub, explicit next route.
- **Commercial strengths:** Strong search intent match, long-form rhythm, high probability of second-page clicks.
- **Risks:** Generic next-step destinations, unranked related content, and casino-like fictional metrics presented as facts.
- **Must not be hardcoded into Core:** Shared-vault concepts, tables, crew roles, numeric game rules, neon theme.

### 4. TACTICAL / SYSTEMS PATTERN

- **Best Source:** MiniWars-based.
- **Purpose:** Explain interconnected systems and prioritize actions under pressure.
- **Best-fit game types:** RTS, tactics, simulation, management, economy/logistics games.
- **Core layout traits:** Doctrine grid, ranked assets, systems summary, featured operations, dispatches, tagged guide index, cross-references.
- **Content traits:** Dependencies, signals, decision windows, tradeoffs, repeatable doctrine.
- **Media traits:** Diagrams/maps would be more valuable than decorative radar; current reference does not implement them.
- **Navigation traits:** System anchors, guide jump panel, tagged related guides, cross-references to assets/doctrine.
- **Commercial strengths:** High browsing depth and strong subject adjacency.
- **Risks:** Tactical chrome can overwhelm content; static “online” and dispatch labels can imply live data.
- **Must not be hardcoded into Core:** Signal/radar visuals, numbered command vocabulary, doctrine/assets/system categories, ranks.

### 5. COMMERCIAL EDITORIAL / SEO PATTERN

- **Best Source:** BombFarm-based for page architecture; Gamble-based for editorial components.
- **Purpose:** Turn search landings into useful multi-page sessions with stable long-form inventory.
- **Best-fit game types:** Broad guide sites with evergreen and frequently revised content.
- **Core layout traits:** Search-intent hero, metadata, cover, TOC, decision modules, internal discovery, FAQ, related and Browse Everything.
- **Content traits:** Quick answer, explicit update semantics, authorable callouts/tables/steps, validated taxonomy.
- **Media traits:** Responsive cover and figures with alt/caption/source/attribution; optional video transcript.
- **Navigation traits:** Breadcrumbs, category hub, TOC, related by relevance, next-step CTA.
- **Commercial strengths:** Clear insertion seams, long sessions, resilient internal linking.
- **Risks:** Static Popular/Trending labels, schema without matching visible content, ad slots that disrupt tasks.
- **Must not be hardcoded into Core:** Homepage feed order, category names, number of related cards, ad-network SDK, game-specific media.

## G. Anti-Patterns

1. **Simulated art presented as if it were game media.** VV `MediaArt` and Farever `FantasyArt` are span/CSS compositions (`temp1.../components/media-art.tsx:10-18`; `temp2.../components/fantasy-art.tsx:15-28`). They are useful decoration only.
2. **Illustration pipeline mistaken for screenshot completeness.** Gamble and BombFarm use `next/image`, but all bundled content media is original SVG art. No screenshot provenance or capture workflow exists.
3. **Declared media metadata not consumed.** Gamble guide frontmatter stores `cover`, but `ArticleHero` renders no image (`lib/content.ts:14`; `components/article-hero.tsx:4-15`).
4. **One cover masquerading as a complete media system.** All BombFarm articles point to `/illustrations/guide-cover.svg`; the cover component is reusable, the content set is not media-complete.
5. **Static Trending/Popular/Live semantics.** VV Trending is a hardcoded array; BombFarm Popular is a hardcoded list; MiniWars “SIGNAL · ONLINE” is static. None is analytics/live data.
6. **Published date relabeled as updated date.** Gamble ArticleHero formats `publishedAt` as “Updated” (`components/article-hero.tsx:5-13`). This corrupts freshness semantics.
7. **Hardcoded breadth with repeated destinations.** Farever’s nine starter cards all target `/guide/first-light/` and seven tool cards target `/guide/` (`app/page.tsx:183-218`). Visual diversity is not IA diversity.
8. **Weak related-content masquerading as relevance.** Gamble excludes the current article then takes three; BombFarm takes recency-ordered others. Only MiniWars implements tag relevance.
9. **Fixed IA masquerading as framework capability.** Every site hardcodes game objects and homepage sections. These are pattern/adaptation examples, not Core APIs.
10. **Large monolithic global CSS.** VV has 2,459 lines and MiniWars 2,530 lines. The visual result is strong, but changes are difficult to isolate and pattern ownership is unclear.
11. **Untested complexity.** BombFarm has the richest nested menu and strictest article metadata but zero tests, so none of those behaviors is protected.
12. **Partial menu accessibility treated as complete.** VV and Gamble expose `aria-expanded`/`aria-controls`, but do not close on Escape or restore focus.
13. **Static fictional production facts and counts.** Examples include VV developer/status/archive facts and Gamble’s table/player/night counts. They are acceptable labeled fictional demo content, but unsafe as production defaults.

## H. Core Starter Boundary

### Must live in Core Starter

- Semantic design-token interface: canvas, surface, text, muted, border, focus, spacing, radius, elevation, breakpoints; no genre values.
- Responsive page/container primitives, article width, optional sidebar rail, reserved ad-slot primitive, and overflow protection.
- Accessible header/mobile navigation with `aria-expanded`, `aria-controls`, Escape, focus restoration, link-close behavior, visible focus, and skip link.
- Media primitives: hero media, cover, figure, responsive source/sizes, caption, credit/source/license, fallback/unavailable state, decorative flag.
- Article shell seams: metadata, breadcrumbs, body, optional TOC, optional FAQ, related-content provider, next-step slot.
- Content contract: slug, title, description, status/draft, published/updated dates, optional patch/version, taxonomy, media records; strict validation.
- SEO foundation: title template, description, canonical, OG/Twitter, Article/Breadcrumb/FAQ structured-data seams, sitemap, robots.
- Custom 404 and honest empty/unavailable/draft behavior.
- Search seam/interface, even if no search provider is enabled.
- Test harness and acceptance hooks for routes, interactions, overflow, metadata, broken/dead links, and media completeness.

### Must not live in Core Starter

- Fantasy/tactical/casino/mining colors, fonts, ornaments, icons, marks, or vocabulary.
- “Field Manual,” “Archive,” “Shared Vault,” “Veil,” “Crew,” “Doctrine,” or similar labels.
- Fixed homepage order or mandatory sections such as Popular, Trending, Stats, Tools, or FAQ.
- Fixed game-object categories, routes, player counts, ranks, status metrics, update dates, or fictional studio data.
- CSS art variants, fake screenshots, a default repeated article cover, static “online” state, or fake Popular/Trending data.
- A specific related-content algorithm, ad network, analytics provider, search provider, or content volume.

## I. Pattern Library Boundary

Pattern Library should package reusable **compositions**, not universal requirements:

- Wiki/archive shell: taxonomy hubs + cover + TOC + related + Browse Everything.
- Immersive world landing: atmospheric hero + world/path/region modules.
- Problem guide: Quick Answer + steps + comparison + mistakes + FAQ + next step.
- Tactical systems: doctrine + ranked assets + system crossrefs + tagged related.
- Editorial feed: Featured + Latest + optional editorial Popular with provenance label.
- Article modules: callout, pros/cons, responsive table, metric grid, checklist, steps, FAQ, figure, video/transcript.
- Sidebar options: wiki navigation, sticky TOC, jump index, ad rail.
- Empty/unavailable compositions and truthful editorial labels.

Each pattern must accept Core primitives and Game Adaptation data. It must not own the game’s taxonomy, vocabulary, media, or values.

## J. Game Adaptation Boundary

Every game adaptation must supply and own:

- Actual palette, typography, mark/logo, iconography, borders/shadows, decorative language, and density.
- Verified game terminology and UI labels.
- Actual game-object taxonomy and hub/detail relationships.
- Player journey, task priorities, decision models, rankings and recommendation rules.
- Actual screenshots, art, video, captions, credits, source URLs, licenses and capture/update workflow.
- Page inventory, Featured/Popular editorial choices, patch/version mapping, related-content tags, and update ownership.
- Claims, counts, studio/platform facts, official/unofficial language, legal notices and launch approvals.

## K. Media Architecture

### K1. Core media primitives

Core should provide typed `HeroMedia`, `ArticleCover`, `ContentFigure`, `MediaGallery`, and `VideoEmbed` primitives backed by one media record:

```ts
type MediaRecord = {
  id: string;
  kind: "screenshot" | "key-art" | "illustration" | "diagram" | "video";
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
  sourceUrl?: string;
  license?: string;
  width?: number;
  height?: number;
  poster?: string;
  transcriptUrl?: string;
  decorative?: boolean;
  verifiedAt?: string;
};
```

Core should enforce: nonempty alt for informative images; `alt=""` plus `decorative: true` for decoration; intrinsic ratio or stable container; responsive sizes; caption/source association; loading priority only for above-the-fold media; and a no-layout-shift fallback.

### K2. Pattern Library media decisions

- Wiki pattern decides whether cover and TOC are paired and whether figures span article or text width.
- Immersion pattern defines hero/world-art composition.
- Problem guide defines where a screenshot/diagram belongs next to a decision.
- Tactical pattern defines diagram/map callouts, not the diagram content.
- Editorial pattern defines gallery/video/caption rhythm and optional ad separation.

### K3. Game Adaptation responsibilities

Supply the actual assets, kind classification, truthful alt/caption, source/credit/license, capture context, patch/version, crop/focal point, and replacement schedule. Decorative generative art may support atmosphere but cannot substitute for evidence-bearing screenshots.

### K4. Launch requirements

- Every required Hero/Cover/Figure slot resolves to a verified asset or the page pattern is changed to one that does not require it.
- No broken asset, placeholder, repeated generic cover where distinct visual identification is required, or screenshot without version/context.
- Informative media has useful alt; complex diagrams have adjacent explanation; video has captions/transcript and a poster.
- Rights/source review is complete.

### K5. Screenshot versus decorative artwork

- **Screenshot:** labeled `kind: "screenshot"`, preserves relevant UI/game state, states patch/build when meaningful, uses factual caption, and may support a claim.
- **Decorative artwork:** labeled `illustration`/`key-art`, may use empty alt when redundant, never supports a mechanics claim, and is not counted toward screenshot completeness.
- CSS art is always decorative and should be invisible to media-completeness metrics.

### K6. Video model

Use a provider-neutral record containing embed/source, title, poster, duration when known, caption/subtitle/transcript URL, credit/source, privacy mode, and consent/loading policy. The page must remain useful without playback. No reference currently proves this capability.

### K7. Missing verified media

If a page needs evidence-bearing media and none is verified, do not generate a fake screenshot. Either publish a truthful text/diagram version whose pattern does not require a screenshot, mark the media-dependent section unavailable, or block launch when comprehension/identity depends on it.

### K8. P1 launch-blocking media incompleteness

- Broken or missing required hero/cover.
- A gameplay claim depends on an absent/unverified screenshot or video.
- Fake screenshot or decorative art presented as gameplay evidence.
- Missing rights/source for third-party media.
- Informative media without meaningful alt, or video without accessible equivalent.
- Repeated placeholder cover that makes article identity materially ambiguous.

### K9. What must not be generated merely to fill space

Fake gameplay screenshots, fake UI states, fake patch footage, fake rankings/data visualizations, fictitious “official” key art, fake quotes/reviews, or near-copies of protected game art. Atmospheric decoration is acceptable only when labeled and not used as evidence.

## L. Visual Identity Architecture

### Core visual tokens

Own semantic roles and constraints only: background/surface/text/muted/border/focus, spacing scale, content widths, type-role slots, radius/elevation slots, breakpoint/motion rules, contrast requirements, and component state tokens.

### Pattern tokens

Own compositional emphasis: immersive-hero height, wiki-sidebar width, tactical density, editorial article measure, card rhythm, media aspect ratios, ornament intensity. Pattern tokens must be overrideable and contain no named game colors/fonts.

### Game theme tokens

Every adaptation must redefine palette, display/body/mono faces, mark, icons, decorative assets, shape language, surface/border style, vocabulary and motion tone. A game theme that only changes accent color fails.

### Evidence for theme creation

Use verified game UI, official/captured media, typography behavior, object shapes, environment palette, HUD density, material/lighting cues, and the game’s actual language. Record which evidence informed each major choice. Do not infer from a domain name or genre alone.

### Human launch gate

The required review question is:

> **Does this clearly feel like a site for THIS specific game?**

If reviewers can swap the name/logo and plausibly reuse the same theme for an unrelated game, launch is blocked at P1.

## M. Commercial Browsing / Monetization Architecture

### Observed browsing funnels

- **VV:** search/article entry → race breadcrumb/sidebar → race index → Shinigami article; good safety, limited published breadth.
- **Farever:** landing → world/path/region/start → guide → category-related guide; deep presentation, several duplicated destinations.
- **Gamble:** problem entry → Quick Answer/decision modules → Next Step/Related → guide hub/help route; strongest intent continuity.
- **MiniWars:** system/asset/doctrine entry → tagged guide → cross-reference → related guide; strongest relevance algorithm.
- **BombFarm:** landing → hub/Latest/Popular/Browse → cover/TOC article → FAQ/related; broadest editorial loop.

### Monetization readiness

| Site | Rating | Evidence | Primary risk |
|---|---|---|---|
| VV | STRONG | Explicit ad spacers, sidebar, long article, home depth, tested stable routes | Only one live article; simulated media |
| Farever | MEDIUM | Deep homepage, Featured/Latest, guide grid | Short articles, repeated destinations, no media/TOC/sidebar |
| Gamble | MEDIUM-STRONG | Rich long-form modules, figures, tables, next steps, related | No reserved slots/sidebar; weak related relevance; SEO gaps |
| MiniWars | MEDIUM | Deep system cross-navigation and long guides | No media/ad seam/TOC; static live labels |
| BombFarm | STRONG | Cover, TOC rail, long articles, Popular/Latest/Browse/related | No tests; repeated cover; static editorial popularity |

Recommended commercial architecture: Core reserves stable optional inventory slots (`after-intro`, `mid-article`, `sidebar`, `between-feed-groups`) without rendering ads by default. Pattern Library controls eligible placement and spacing. Game Adaptation/content decides whether a page has enough value and length. Acceptance Gate rejects layout shift, obstruction, unusable mobile density, and ads inserted before the answer.

## N. Testing & Capability Contract Findings

### VV-based

- **Protected:** content validation/date sorting, three route renders, HTTP status, horizontal overflow, primary navigation, mobile toggle, FAQ disclosure, focus ring, responsive sidebar switch, real 404 recovery, disabled/unfocusable unavailable cards, MDX link safety.
- **Not protected/present:** Escape/focus restoration, media files, SEO primitives beyond titles/descriptions, search/video/gallery.
- **Assessment:** strongest broad product contract and only E2E suite.

### Farever-based

- **Protected:** MDX discovery/sort/lookup/errors, six unique production guides, card route, header guide links.
- **Not protected:** route rendering, 404, mobile behavior, accessibility, homepage feeds, related selection, overflow/media.
- **Assessment:** low test depth relative to visual complexity.

### Gamble-based

- **Protected:** published sorting, draft exclusion, lookup/errors, FAQ props through MDX serialization, basic accessible menu toggle.
- **Not protected:** route rendering/404, Escape/focus, figures/captions, rich MDX components, related logic, overflow, cover consumption.
- **Assessment:** content pipeline has a useful minimum contract; product shell does not.

### MiniWars-based

- **Protected:** all registered guides and metadata, date sort, tag relevance, known/unknown routes, article shell, homepage order/valid guide links, machine-readable dates, full-card links, Escape/focus restoration, icon residue safety, MDX class behavior.
- **Not protected:** browser route status/overflow, real media, custom 404, SEO foundation.
- **Assessment:** strongest unit/integration capability contract; lacks E2E.

### BombFarm-based

- **Protected:** nothing independently; validation code exists but has no tests.
- **Assessment:** highest test-risk/reference gap. Mobile nested state, metadata validation, TOC consistency, all routes, 404, and media rendering require contracts before adoption.

### Acceptance Gate implication

The future gate must be independent of any one starter/pattern and execute against the assembled game site. Otherwise a pattern can silently remove Core guarantees.

## O. Commercial Game Site Product Contract — Draft v0.1

Owner values use the required ownership taxonomy. Severity: P0 = catastrophic site/security failure; P1 = blocks commercial launch; P2 = must be scheduled but can launch with an explicit exception; NIT = polish. This draft contains no P0 because the audited architecture requirements are launch-quality gates rather than security/catastrophic-runtime requirements.

| ID | Domain | Requirement | Why it matters | Owner | Severity if missing |
|---|---|---|---|---|---|
| GI-01 | Game Identity | Site uses verified game name, terminology and object taxonomy consistently. | Prevents generic/incorrect product identity. | GAME ADAPTATION | P1 |
| GI-02 | Game Identity | Human review answers “yes” to “Does this clearly feel like a site for THIS specific game?” | Blocks logo-swap generic themes. | ACCEPTANCE GATE | P1 |
| VF-01 | Visual Fidelity | Theme redefines palette, type roles, mark, iconography and shape language. | Accent-only theming is insufficient. | GAME ADAPTATION | P1 |
| VF-02 | Visual Fidelity | All text/states meet contrast, focus and responsive legibility requirements. | Visual identity cannot reduce usability. | ACCEPTANCE GATE | P1 |
| MC-01 | Media Completeness | Required hero/cover/figure slots resolve to verified assets with stable dimensions. | Avoids broken/placeholder launch. | GAME ADAPTATION | P1 |
| MC-02 | Media Completeness | Screenshots, artwork and diagrams are typed and never misrepresented. | Media must not falsely support claims. | PRODUCT CONTRACT | P1 |
| MC-03 | Media Completeness | Informative media has alt/caption/source/rights data; video has accessible equivalent. | Accessibility and legal safety. | ACCEPTANCE GATE | P1 |
| HR-01 | Homepage Routing | Homepage exposes a clear Start Here or primary task route. | New players need orientation. | PATTERN LIBRARY | P1 |
| HR-02 | Homepage Routing | Homepage offers at least two useful routes beyond the primary CTA, based on real content. | Enables session depth without fake links. | GAME ADAPTATION | P2 |
| IA-01 | IA | Hubs and details derive from the game/content taxonomy, not a fixed template taxonomy. | Prevents false genericity. | GAME ADAPTATION | P1 |
| IA-02 | IA | Every rendered navigation target exists or is an honest noninteractive unavailable state. | Prevents dead/fake interaction. | ACCEPTANCE GATE | P1 |
| CU-01 | Content Utility | Each guide states the problem/answer and provides actionable steps, evidence or decision criteria. | Search traffic must receive utility. | PROJECT CONTENT | P1 |
| CU-02 | Content Utility | Long content uses appropriate figures, tables, callouts or summaries rather than undifferentiated prose. | Improves comprehension and ad-safe rhythm. | PATTERN LIBRARY | P2 |
| DS-01 | Decision Support | Comparison/ranking/recommendation states its method and relevant version/context. | Avoids unsupported authority. | PROJECT CONTENT | P1 |
| DS-02 | Decision Support | Recovery/mistake/next-action guidance exists where the player task requires it. | Helps users progress instead of exit. | PROJECT CONTENT | P2 |
| FR-01 | Freshness | `publishedAt`, `updatedAt`, patch/version and live status are distinct fields. | Prevents false freshness. | CORE STARTER | P1 |
| FR-02 | Freshness | Popular/Trending/Live labels identify editorial or data provenance. | Prevents hardcoded data pretending to be live. | ACCEPTANCE GATE | P1 |
| ID-01 | Related / Internal Discovery | Detail pages expose a relevant next page and related content when corpus size permits. | Creates useful second/third clicks. | CORE STARTER | P1 |
| ID-02 | Related / Internal Discovery | Related ranking uses taxonomy/tags/manual relationships before recency fallback. | Improves relevance. | PATTERN LIBRARY | P2 |
| SEO-01 | SEO | Every indexable route has unique title, description and canonical URL. | Baseline index integrity. | CORE STARTER | P1 |
| SEO-02 | SEO | OG/Twitter metadata and share media exist for indexable pages. | Share quality and discovery. | CORE STARTER | P1 |
| SEO-03 | SEO | Sitemap, robots and matching Article/Breadcrumb/FAQ structured data are generated. | Crawlability and machine-readable meaning. | CORE STARTER | P1 |
| AX-01 | Accessibility | Mobile navigation supports keyboard, Escape, focus restoration and truthful expanded state. | Essential interaction access. | CORE STARTER | P1 |
| AX-02 | Accessibility | Skip link, visible focus, reduced motion and usable tap targets are present. | Baseline inclusive navigation. | CORE STARTER | P1 |
| AX-03 | Accessibility | Core routes pass overflow and keyboard-path checks at supported breakpoints. | Prevents mobile/keyboard regressions. | ACCEPTANCE GATE | P1 |
| PP-01 | Production Polish | Custom 404 provides valid recovery routes; empty/draft/unavailable states are truthful. | Prevents dead ends and fake controls. | CORE STARTER | P1 |
| PP-02 | Production Polish | No placeholder names, fake contacts, copied brand residue or unsupported counts remain. | Trust/legal quality. | ACCEPTANCE GATE | P1 |
| MR-01 | Monetization Readiness | Layout exposes stable optional ad inventory without layout shift or obstructing the primary answer. | Commercial readiness without UX harm. | CORE STARTER | P2 |
| MR-02 | Monetization Readiness | Page depth comes from useful content and navigation, not duplicated/fake cards. | Protects quality and session value. | PRODUCT CONTRACT | P1 |
| PA-01 | Product Acceptance | Route, metadata, media, interaction, link, overflow and a11y checks run against the assembled site. | Pattern/adaptation composition can regress Core. | ACCEPTANCE GATE | P1 |
| PA-02 | Product Acceptance | Launch exceptions record owner, evidence, severity and expiry. | Keeps known gaps from becoming invisible debt. | PRODUCT CONTRACT | P2 |

Contract totals: **31 requirements — P0: 0, P1: 25, P2: 6, NIT: 0.**

## P. What Current GAME_SITE_STARTER Should Learn

This task did not inspect a separate `GAME_SITE_STARTER`; the following are evidence-backed requirements it should absorb from the five references, not claims about its current implementation:

1. From VV: honest unavailable states, custom 404, skip link, ad-slot seams, sidebar option, E2E route/overflow/focus contracts.
2. From Farever: a theme must coordinate color, type, vocabulary, composition and decorative grammar—not merely rename content.
3. From Gamble: typed editorial modules, responsive tables, inline figures/captions, draft exclusion, problem-labeled internal navigation.
4. From MiniWars: Escape/focus restoration, typed content registry, tags, relevance-ranked related content, machine-readable dates.
5. From BombFarm: cover + breadcrumbs + TOC + FAQ + related article shell, Browse Everything, and strict cover/section metadata.
6. From all five gaps: add canonical, OG/Twitter, structured data, sitemap, robots, source/attribution, video seam, search seam, and media-completeness acceptance.

## Q. What Must NOT Be Copied

- Any site’s palette, font stack, vocabulary, logo, taxonomy or homepage order into Core.
- VV/Farever/MiniWars CSS art as a substitute for actual game media.
- Gamble/BombFarm SVG illustrations as proof of screenshot coverage.
- Gamble’s unused `cover` field or its “Updated” label over `publishedAt`.
- BombFarm’s one repeated cover for every article or its unranked related selection.
- VV’s hardcoded Trending/Revision/active-report semantics.
- MiniWars’ static “SIGNAL · ONLINE” or fixed Latest Field Update label.
- Farever’s many cards that collapse to the same destination.
- Any hardcoded fictional counts, studio/platform facts, contacts, popularity, or live status as production defaults.
- The giant global-stylesheet organization of VV/MiniWars as a library boundary.

## R. Open Questions

1. Which real game(s), content volume and publishing workflow will the future architecture serve first?
2. Who owns media rights review, screenshot capture, patch/version tagging and replacement?
3. Is Popular/Trending editorial, analytics-backed, or excluded at launch?
4. Which search implementation will consume the Core search seam, and at what corpus size is it required?
5. Which structured-data types are appropriate for the actual content and visible FAQ policy?
6. What ad formats/placements are allowed, and what performance/layout-shift budgets apply?
7. Should TOC be content-authored (BombFarm) or generated from headings with validation?
8. Which related-content precedence is desired: manual relations → tags → category → recency?
9. What legal language distinguishes official, affiliated, community, and independent sites?
10. What launch threshold defines sufficient real screenshots/video for each game genre?

## S. Final Architecture Recommendation

**Select C: Stable Core Starter + Product Contract + Pattern Library + Game Adaptation Layer + Independent Acceptance Gate.**

```text
Product Contract (what must be true)
        │
        ├── Stable Core Starter (portable primitives and guarantees)
        │       ├── navigation / a11y / layout
        │       ├── content / media / SEO contracts
        │       └── 404 / empty states / test hooks
        │
        ├── Pattern Library (selectable compositions)
        │       ├── wiki/archive
        │       ├── fantasy immersion
        │       ├── problem guide
        │       ├── tactical systems
        │       └── commercial editorial
        │
        ├── Game Adaptation (this game’s evidence and content)
        │       ├── theme / vocabulary / taxonomy
        │       ├── player journey / recommendations
        │       └── verified media / rights / freshness
        │
        └── Independent Acceptance Gate
                ├── routes / links / SEO / media
                ├── keyboard / focus / motion / overflow
                └── residue / truthfulness / launch severity
```

Why not A: the references demonstrate contradictory homepage and content architectures; a universal starter would accumulate every module and encode accidental game assumptions.

Why not B: five starters would duplicate the same missing foundational work and cause accessibility/SEO/media fixes to drift.

Why C: it preserves the reusable strengths (VV contracts, Gamble components, MiniWars relevance/a11y, BombFarm article shell) while keeping Farever/MiniWars/Gamble-specific identity and IA outside Core. The independent gate prevents a visually successful adaptation from shipping without media, SEO, accessibility or production safety.

## T. Exact Next Step

Run a **contract-only gap assessment of the current `GAME_SITE_STARTER` against the 31 Draft v0.1 requirements**, without merging any reference implementation. Produce one prioritized backlog that:

1. maps each contract ID to existing evidence or a gap;
2. separates Core, Pattern Library and Game Adaptation work;
3. marks the 25 P1 requirements as launch gates;
4. chooses one pilot pattern (recommended: Problem-Oriented Guide + Wiki Article Shell) for the first end-to-end acceptance test;
5. defines fixture content and verified media before implementation.

Do not start by copying a homepage. Start by proving the Core contracts and acceptance gate on one small pilot route set.

---

## Required Output Summary

1. **Verdict:** PASS — 5-SITE PATTERN CAPABILITY AUDIT COMPLETE
2. **Actual pwd:** `/Users/randyz/work/coding/hot_words_web/template`
3. **Reference Projects Found:** 5
4. **Reference Projects Audited:** 5
5. **Files Modified:** `5_SITE_PATTERN_CAPABILITY_AUDIT.md` only
6. **Source Code Modified?:** No
7. **Capability Rows:** 60
8. **CORE Count:** 30
9. **PATTERN Count:** 20
10. **GAME-SPECIFIC Count:** 4
11. **OPTIONAL Count:** 5
12. **ANTI-PATTERN Count:** 1
13. **Best Wiki Pattern Reference:** BombFarm-based (with VV unavailable-state/sidebar additions)
14. **Best Visual Identity Reference:** Farever-based
15. **Best Media Pattern Reference:** Gamble-based for inline figures/captions; BombFarm-based for cover/TOC integration
16. **Best Tactical/System Pattern Reference:** MiniWars-based
17. **Best Commercial Editorial Reference:** BombFarm-based architecture + Gamble-based article modules
18. **Strongest Mobile/A11Y Reference:** MiniWars-based (tested Escape close and focus restoration)
19. **Real Media Support Summary:** Gamble and BombFarm implement local responsive image plumbing, but assets are fictional SVG illustrations; no implementation contains verified game screenshots. VV/Farever/MiniWars rely on CSS/decorative art.
20. **Video Support Summary:** Absent in all five; no embed, poster, caption/transcript, credit or provider model.
21. **Major Core Starter Gaps:** canonical, OG/Twitter, structured data, sitemap, robots, complete media record/attribution/fallback, video/search seams, universal accessible menu contract, independent route/media/overflow gate.
22. **Major Pattern Library Candidates:** Wiki/Archive, Fantasy Immersion, Problem-Oriented Guide, Tactical/Systems, Commercial Editorial; plus TOC, callout, table, steps, mistakes, figure, sidebar and feed compositions.
23. **Major Game Adaptation Requirements:** theme, type, vocabulary, mark, taxonomy, player journey, recommendations, verified media/rights, facts/counts, freshness and legal language.
24. **Major Anti-Patterns:** simulated art as screenshots, unused/repeated covers, static Trending/Popular/Live labels, published-as-updated dates, repeated fake breadth, weak related relevance, giant global CSS, untested complexity.
25. **Product Contract Domains:** 14 — Game Identity, Visual Fidelity, Media Completeness, Homepage Routing, IA, Content Utility, Decision Support, Freshness, Related/Internal Discovery, SEO, Accessibility, Production Polish, Monetization Readiness, Product Acceptance.
26. **Recommended Future Architecture:** C — Stable Core Starter + Product Contract + Pattern Library + Game Adaptation Layer + Independent Acceptance Gate
27. **P0:** 0
28. **P1:** 25
29. **P2:** 6
30. **NIT:** 0
31. **Report:** `/Users/randyz/work/coding/hot_words_web/template/5_SITE_PATTERN_CAPABILITY_AUDIT.md`
32. **Exact Next Step:** Audit current `GAME_SITE_STARTER` against all 31 contract IDs and turn gaps into an owner/severity backlog before any template merge or starter implementation.

**PASS — 5-SITE PATTERN CAPABILITY AUDIT COMPLETE**
