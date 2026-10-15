# Template selection rubric

## Scoring

Score every candidate out of 100. Each row requires a concise evidence note.

| Dimension | Weight | Question |
| --- | ---: | --- |
| Player intent and IA fit | 25 | Does the homepage, hub, and detail structure match how players will seek answers and move through this game's content? |
| Visual and tonal fit | 20 | Can the template's composition, density, typography roles, and visual rhythm support the game's tone without copying its demo identity? |
| Content-model fit | 20 | Does its content organization support the expected guides, game objects, categories, freshness, and publishing volume? |
| Article/detail-page fit | 15 | Does the detail page provide the needed TOC, tables, callouts, steps, FAQ, media, related content, or sidebar? |
| Navigation and discovery | 10 | Does it provide appropriate mobile navigation, search/discovery, related content, and second/third-click paths? |
| Production safety | 10 | Are accessibility, unavailable states, route behavior, validation, and tests appropriate for the planned site? |

Use integer scores. A candidate's score is the sum of all six dimensions.

## Hard constraints

A candidate may not be selected despite the highest score when it violates a stated project constraint, such as:

- Required content model cannot be adapted without replacing most of the template.
- Required interaction is absent and central to the game's browsing model.
- The template's architectural complexity is disproportionate to the planned site.
- The project explicitly requires a capability that another candidate already implements safely.

Document the constraint and the runner-up comparison.

## Tie rule

If the top two candidates differ by five points or fewer, compare in this order:

1. Player intent and information architecture.
2. Content and article structure.
3. Tested accessibility and production safety.
4. Ask the user if the result remains genuinely ambiguous.

## Known template profiles

These profiles are starting hypotheses only. Confirm them against the current files during every run.

### temp1_based_vvultimatum.net — archive/wiki routing

Best fit:

- Deep wiki/archive browsing.
- Game objects such as races, classes, factions, or entities.
- Sidebar-oriented discovery and explicit unavailable states.
- Projects valuing strong route/overflow tests and ad-spacing seams.

Watchouts:

- Media is primarily CSS/decorative.
- No complete real-game media workflow.
- Some update/trending concepts are static editorial content.
- Large centralized stylesheet.

### temp2_based_farevergame.wiki — fantasy immersion

Best fit:

- Fantasy RPG, exploration, regions, paths, relics, lore, or world-building.
- Strong atmosphere and cohesive visual identity.
- Featured/latest content driven by MDX.

Watchouts:

- Simpler article utilities.
- Limited mobile interaction and testing depth.
- Decorative CSS art rather than a real media system.
- Apparent homepage breadth may route repeatedly to the same content.

### temp3_based_gamblewithyourfriends.net — problem-oriented guide

Best fit:

- Task-driven guides, rules, steps, builds, mistakes, metrics, and FAQs.
- Social/party/competitive games.
- Long-form editorial pages with reusable instructional modules.
- Inline figures and captions.

Watchouts:

- Related content is weakly ranked.
- Article cover metadata is not fully rendered.
- No complete SEO or video system.
- Visual identity is specialized and must be replaced during adaptation.

### temp4_based_miniwars.art — tactical/systems

Best fit:

- Strategy, tactics, units, systems, ranked assets, doctrines, or operations.
- Dense comparison and prioritization needs.
- Strong tested mobile navigation and relevance-ranked related guides.

Watchouts:

- Minimal substantive media pipeline.
- No TOC, rich article figures, or article FAQ.
- Static online/latest labels must not be treated as live data.
- Large centralized stylesheet.

### temp5_based_bombfarm.wiki — commercial editorial/wiki

Best fit:

- Broad commercial guide sites needing homepage depth.
- Cover-led articles, breadcrumbs, TOC, FAQ, related cards, popular/latest/browse sections.
- Games with many guide categories and strong second/third-click opportunities.

Watchouts:

- Related content is mostly recency-based.
- Repeated fictional cover assets are not evidence of real media completeness.
- No test suite in the current template.
- Popular/latest must remain editorial unless backed by data.

### temp6_based_theskinstapler.com — dark editorial/evidence

Best fit:

- Horror, mystery, dark survival, investigative, or evidence-oriented games.
- Large guide index and restrained editorial detail pages.
- Strong desktop/mobile verification, keyboard search, focus restoration, and responsive tables.
- Sites whose main product is searchable guide discovery rather than complex dashboards.

Watchouts:

- Only three page types are intentionally implemented.
- Template contains local build/dependency artifacts that must be excluded during copying.
- Original demo media and fictional content must be replaced.
- Verification tooling has local CDP/macOS assumptions.

## Module recommendation rules

Recommend a module only when it fills a specific gap. Examples:

- VV: sidebar, unavailable state, ad-slot seam, route/overflow test pattern.
- Farever: immersive theme system and world/path/region composition.
- Gamble: Quick Answer, steps, metrics, mistakes, responsive table, inline figure/caption.
- MiniWars: Escape/focus restoration, tag-ranked related content, system/ranking sections.
- BombFarm: cover + breadcrumbs + TOC + FAQ + related article shell, Browse Everything.
- SkinStapler: keyboard search dialog, large guide index, viewport/reference verification.

A recommendation must cite an exact current file. Do not recommend copying an entire second template.
