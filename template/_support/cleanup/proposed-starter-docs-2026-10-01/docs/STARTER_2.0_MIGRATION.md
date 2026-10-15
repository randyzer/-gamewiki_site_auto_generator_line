# Starter 1.0 → Starter 2.0 Migration Guide

This guide upgrades an existing Starter 1.0 or `GAME_SOP_2.1`-based project to
the Starter 2.0 technical contract. It does not decide game-specific coverage.
Use `GAME_SOP_2.2`, project research, Site Structure, and the human planning
gate to decide which page families and content belong in the site.

The architecture authority is
`docs/STARTER_2.0_ARCHITECTURE_PROPOSAL.md`. This guide describes adoption; it
is not a second architecture SSOT.

## 1. Record the source before changing it

Create a migration record containing:

- source repository path/remote;
- current branch, commit, tag, and dirty-worktree status;
- source Starter/SOP/Master Prompt versions;
- current `game.config.ts`, Page Inventory, enabled routes, generated routes,
  test counts, and build result;
- existing content, fact, tool, media, and theme customizations.

Commit or otherwise preserve the source project according to the operator's Git
policy. Do not overwrite uncommitted project work while copying Starter files.

Starter 2.0 follows `GAME_SOP_2.2`. The repository's
`CodexMasterPrompt_v2.3Final.md` still references `GAME_SOP_2.1` and the prior
Starter path; leave it unchanged during this migration and record the mismatch.
Synchronizing `v2.4Final` is a separate post-Starter task.

## 2. Protect Stable Core and plan the merge

Do not replace the project wholesale. Preserve the project's approved content,
facts, page scope, routes, feature decisions, and game-specific palette while
bringing in the reviewed Starter 2.0 implementation.

Treat these areas as Stable Core unless a verified conflict requires a targeted
merge:

- publication/catalog and Runtime Page Inventory behavior;
- entity registry and Fact architecture;
- SEO, route generation, feature filtering, Pagefind, build reconciliation,
  patch workflow, and static-first/React-Island boundaries.

Most migration work belongs at the Flexible Edge: grouped navigation,
WikiArticle presentation, media, page-family tokens, Wiki Portal homepage, and
player-facing metadata.

## 3. Migrate navigation

Starter 1.0 flat input:

```ts
navigation: {
  primaryPageIds: ["home", "hub.guides", "search"],
},
```

Starter 2.0 grouped input:

```ts
navigation: {
  groups: [
    { label: "Home", pageId: "home" },
    {
      label: "Guides",
      pageId: "hub.guides",
      children: ["guide.getting-started", "guide.progression"],
    },
    { label: "Search", pageId: "search" },
  ],
},
```

Rules:

- `pageId` and `children` contain Page IDs only; do not duplicate routes,
  titles, visibility, indexability, or publication state in config.
- Parent Hubs remain clickable. Desktop renders grouped dropdowns; mobile uses
  expandable child groups.
- A Page ID may appear once inside this primary/secondary tree. It may still
  appear in Footer, Homepage, Related Pages, article links, sitemap, and search.
- Omit `children` or use `children: []` for a childless group; no empty dropdown
  is generated.
- Every referenced page must exist in the enabled Runtime Page Inventory or
  validation fails.

### Legacy compatibility

Starter 2.0 still accepts `primaryPageIds` as a temporary migration adapter. The
config schema normalizes it to childless groups. It does not create a second
runtime navigation authority, and it cannot express secondary links.

Do not author `groups` and `primaryPageIds` together. Convert to `groups` during
the migration and use only `groups` for new projects.

## 4. Adopt WikiArticle for guides

Route guide content through `src/components/wiki/WikiArticle.astro` and pass the
heading records returned by Astro's existing content renderer.

WikiArticle provides:

- breadcrumb, H1, player-facing description;
- Last Updated / Last Verified;
- optional hero/gallery/trailer media;
- optional Quick Facts;
- body-only H2/H3 Table of Contents;
- narrative content;
- optional FAQ;
- Related Pages;
- Sources & Verification.

Do not generate a DOM heading crawler or append component headings to the TOC.
H1, H4+, FAQ, QuickFacts, Sources, Related Pages, navigation, and layout headings
remain excluded.

`EditorialArticle` remains for `pageType: meta` and `pageType: patch`. Do not
force meta/tier analysis or patch/news into the guide shell simply to use one
layout everywhere.

## 5. Clean player-facing metadata

Remove public research-dashboard presentation such as:

- Priority;
- internal Confidence;
- Search Signal / primary keyword;
- internal tags;
- content/development workflow status;
- Editorial Brief;
- Evidence Ledger language.

Keep those values in Inventory/fact schemas where they support validation and
editorial workflow. Present sources as Sources & Verification with useful source
names, dates, and links. Keep public freshness information player-readable.

Apply the same cleanup to EntityDetail and Guide Hub presentation. Do not delete
the underlying publication/provenance architecture.

## 6. Add the Media Manifest

Create or merge:

- `src/data/schemas/media.ts`;
- `src/data/media/media.json`;
- `src/data/media/catalog.ts`;
- the Phase B media components and validation integration;
- `public/media/README.md`.

The production manifest may start empty:

```json
{
  "assets": [],
  "pages": []
}
```

No media is valid and should leave no empty section or placeholder. A manifest
reference to a missing or invalid asset is an error and must fail validation.

### Local image workflow

1. Obtain human approval for relevance, accuracy, quality, attribution, and
   commercial-use rights.
2. Copy the reviewed file below `public/media/`.
3. Register one image asset with a safe `/media/...` path, meaningful `alt`,
   optional caption, and required HTTPS `sourceUrl` provenance.
4. Reference its asset ID from a page's `hero` or `gallery` placement.
5. Run the full validation/build/browser matrix.

Remote HTTP/HTTPS image `src` values are unsupported. Do not hotlink an image
or add a remote-image allowlist during migration.

### YouTube workflow

Register a video asset whose `src` is the canonical 11-character YouTube video
ID. Use `alt` as the iframe's accessible title and keep the original HTTPS watch
URL in `sourceUrl`. Reference it only from `trailer`.

Starter renders `youtube-nocookie.com`, lazy loads a responsive 16:9 iframe,
limits permissions, and supports fullscreen. It does not support arbitrary
iframes, an SDK, uploaded video, or build-time network probing.

### Media boundary

The only placements are `hero`, `gallery`, and `trailer`. Do not migrate media
into Page Inventory, content frontmatter layout fields, a generic slot array,
mobile/desktop variants, dimensions/crops, a CMS, DAM, or Media Engine.

`sourceUrl` records provenance; it is not legal approval. Preserve separate
human/SOP rights records.

## 7. Add page-family visual tokens

Keep the game-wide palette in `src/styles/theme.css`. Add or preserve the
Starter 2.0 family role tokens and their default fallback to
`var(--color-accent)`.

The family is exactly the controlled Inventory `module` value:

```text
Inventory module → body[data-page-family] → page-families.css → --page-accent
```

Do not infer families from route, page type, tag, cluster, or title, and do not
create arbitrary keys such as `beginner-guides`, `early-game`, or
`hero-detail`. If a future reviewed module is added, extend its schema,
token/fallback decision, selector, and tests in the same change.

Use accents only for restrained hooks such as borders, badges, underlines, and
small visual details. Do not turn the site into unrelated per-page palettes.

## 8. Adopt the Wiki Portal homepage

Replace the Starter/demo dashboard composition with the fixed player portal:

1. Game Hero
2. Quick Facts
3. Start Here
4. Browse by Category
5. Featured Guides
6. Important Systems
7. Latest Updates
8. Screenshot / Trailer
9. FAQ / Common Questions
10. Browse All

The homepage derives page state/routes from the enabled Inventory catalog,
featured ordering from the existing config field, facts from the Fact Layer,
media from the home pageId manifest mapping, and FAQ from explicit authored
content. Empty sections render nothing.

Do not migrate a configurable section array, route/card duplication, category
registry, popularity claim without analytics, block DSL, Homepage CMS, or Page
Builder. Homepage de-duplication changes presentation only; it cannot hide or
publish site pages.

## 9. Add optional authored FAQ

Content frontmatter may add:

```yaml
faq:
  - question: What should I do first?
    answer: Follow the first objective in this guide.
```

FAQ remains optional visible content. Empty/missing FAQ renders nothing. Do not
put it in Inventory, generate fake questions, or add FAQ JSON-LD during this
migration.

## 10. Reconcile feature flags and Inventory

Keep every supported flag explicit in `game.config.ts`. A feature should be
enabled only when its reviewed Inventory rows, route presenter, and required
content/facts/tool definitions all exist.

Disabling a feature must remove its pages from routes, navigation, homepage,
related links, sitemap, Pagefind, and generated HTML. It must not require empty
fact/content files. Do not delete historical/draft Inventory rows merely because
a feature is temporarily off.

Runtime Page Inventory remains the publication SSOT throughout migration. Media,
facts, content, FAQ, and config grouping do not publish pages.

## 11. Validate the migration

Use the pinned Node version and committed lockfile:

```bash
nvm use
npm ci
npm run validate
npm run check
npm run build
git diff --check
```

Record:

- enabled page count and complete generated route list;
- exact route/output reconciliation;
- canonical, robots, sitemap, JSON-LD, links, and Pagefind results;
- HTML/CSS/JS/Pagefind budget results;
- test file/test counts and known expected warnings;
- dependency and lockfile diff.

Use isolated fixtures/copies to test Guides OFF, Search OFF, entity/news/tools
OFF, empty media, no FAQ/QuickFacts, minimal homepage, 20+ pages, and
media-rich output. Do not mutate production Inventory just to create QA cases.

## 12. Perform manual responsive QA

At `390 × 844`, `768 × 1024`, and `1440 × 1000`, inspect:

- Homepage, Guide, Guide Hub, Search;
- media-rich/no-media and FAQ-rich/no-FAQ states;
- Entity, Update, and Tool fixtures when those families are disabled.

Verify navigation hierarchy and keyboard behavior, touch targets, headings,
cards, TOC, media/captions/video ratio, FAQ expansion, page-family accents,
horizontal overflow, focus visibility, and console errors/warnings.

Automation cannot approve content usefulness, factual correctness, game fit,
competitive coverage, image quality, copyright/reuse rights, or final visual
judgment. Complete the human gates in `docs/QA_CHECKLIST.md`.

## 13. Final migration boundary

Keep these values out of Page Inventory:

| Do not migrate into Inventory | Owning layer |
| --- | --- |
| Article prose and FAQ | Content |
| Hero/gallery/trailer and captions | Media Manifest |
| Entity values and patch-sensitive facts | Fact Layer |
| QuickFacts labels | Presentation mapping |
| Navigation group/order | Config |
| Homepage section order | Fixed implementation code |
| Game colors and family role values | Theme |
| Upload/CDN/image processing configuration | Unsupported in Media V1 |

Do not add Remote Images, new media placements, automatic FAQ/JSON-LD,
analytics/popularity, CMS/database/ORM, Theme Engine, layout DSL, recursive mega
menu, universal page builder, new Fact architecture, or new Inventory fields as
part of the migration.

Migration is ready for human acceptance only when deterministic gates pass and
the project's factual, visual, rights, coverage, and responsive reviews are
complete.
