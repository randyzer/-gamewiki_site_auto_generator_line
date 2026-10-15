---
name: game-site-content-integrator
description: Integrate verified homepage research, favicon assets, keywords, and per-keyword source material into a game-guide site previously copied by game-site-template-selector. Use when the user provides a game name and target game workspace and wants to replace demo identity, populate the homepage, create evidence-backed inner pages, connect routes and metadata, remove template residue, and validate the resulting Next.js or Astro game site without modifying the original template library.
---

# Game Site Content Integrator

## Purpose

Turn a selected and copied game-site template into a target-game content implementation using only the verified outputs of:

1. `game-homepage-icon-research`
2. `game-innerpage-keyword-information-research`
3. `game-site-template-selector`

Modify only the target game workspace. Never modify the original template library.

This skill performs content integration and validation. It does not reselect the template, automatically merge supplemental modules, conduct new factual research, deploy the site, or invent missing game information.

## Required user inputs

Require:

- Game name.
- Absolute target game workspace directory.

Reuse a value from the current conversation only when the user explicitly supplied it and it remains unambiguous. Never infer a path from a similar game, another project, or a previous run.

## Derived upstream inputs

Resolve these inside the target workspace when the standard locations are unambiguous:

- Research root: prefer `backgroundinformation/`; accept legacy `background_information/` when it is the only one present
- Homepage research: `{research root}/{game name}攻略站首页调研信息.md`
- Icon package: `{research root}/{game name}图标.zip`
- Keywords: a unique `keywords.json` under the research root
- Keyword material directory: the directory containing that `keywords.json` and the matching `{keyword}素材.md` files
- Template selection report: `docs/TEMPLATE_SELECTION_REPORT.md`
- Template copy manifest: `docs/template-copy-manifest.json`
- Template residue scan: `docs/TEMPLATE_RESIDUE_SCAN.json` when produced by the updated template selector; older copies may not contain it and require an independent scan.

Search only within the target workspace's resolved research root and `docs/` directory. If both research-root names exist, treat the input as ambiguous and ask the user which one to use. Do not scan unrelated projects or the user's whole computer.

If any required or derived input is missing, ambiguous, duplicated, unreadable, or inconsistent, ask one focused question listing every unresolved item and the expected path. Until all inputs are complete:

- Do not modify the project.
- Do not create pages or directories.
- Do not unzip icons.
- Do not install dependencies.
- Do not run formatters or migrations.
- Do not guess a replacement path.
- Do not begin content generation.

Read [references/input-contract.md](references/input-contract.md) before preflight.

## Required outputs

Modify the target workspace and create:

- `docs/CONTENT_INTEGRATION_REPORT.md`
- `docs/CONTENT_PAGE_MANIFEST.json`
- `docs/CONTENT_PROVENANCE.md`
- `docs/CONTENT_GAPS.md`

The target site should contain:

- Correct target-game identity and official links.
- Homepage copy mapped into the selected template's existing composition.
- Verified favicon and manifest assets.
- One handled outcome for every final keyword.
- Published pages only when the evidence is sufficient.
- Draft or blocked records for insufficient evidence.
- No misleading demo-game residue in public pages.

Follow [references/output-contract.md](references/output-contract.md).

## Workflow

### 1. Preflight without mutation

Run:

```bash
python3 scripts/preflight.py \
  --game "Game Name" \
  --workspace "/absolute/game/workspace"
```

The preflight must confirm:

- All required and derived inputs resolve uniquely.
- The workspace is not inside the original template library.
- The template selection report and copy manifest exist.
- The copy manifest destination matches the workspace.
- `package.json` and a recognized page root (`app/`, `pages/`, or `src/pages/`) exist.
- The homepage research and icon ZIP are readable.
- The favicon ZIP contains the required members.
- `keywords.json` is valid and has no duplicate final keywords.
- Every final keyword has exactly one material file.
- Every material file has a valid `COMPLETED`, `PARTIAL`, or `BLOCKED` status.
- Git status is recorded without changing it.

If the Git worktree contains uncommitted changes, list them and ask for confirmation before writing. Never discard, reset, overwrite, or silently absorb existing user changes.

### 2. Build an implementation map

Inspect the copied project's current:

- Homepage modules.
- Header, footer, sidebar, and mobile navigation.
- Metadata and site configuration.
- Content registry and MDX/article model.
- List, category, and detail routes.
- Legal and about pages.
- Public assets and favicon configuration.
- Tests and package scripts.

Create an internal mapping from every researched field to an existing component, configuration field, route, or documented gap.

Do not assume all templates contain modules named Hero, Codes, Start Here, or Sidebar. Map by purpose. Prefer the nearest existing composition over adding a new architecture.

Do not automatically implement supplemental module recommendations from `TEMPLATE_SELECTION_REPORT.md`. They require separate user approval.

Read [references/homepage-integration.md](references/homepage-integration.md) before modifying global or homepage content.

### 3. Integrate site identity and homepage

Before editing, consume `docs/TEMPLATE_RESIDUE_SCAN.json` when present. Treat each source game, brand, domain, and route as a candidate requiring file-level verification; for older copies without that scan, perform the same read-only inventory yourself.

Replace demo identity semantically, not with an uncontrolled global string replacement. If copied SEO configuration contains an absolute site URL, sitemap location, or canonical host, require the user's confirmed new site origin before changing it. Never substitute the official game website for the fan site's domain. If the production origin is not confirmed, continue only with changes that do not require it, leave domain-dependent SEO output unresolved, record a `TECHNICAL` / `LAUNCH BLOCKER` gap, and do not report integration as fully `COMPLETED`.

Inventory and update user-visible:

- Demo game and brand names.
- Demo domains and community links.
- Fictional studio, platform, character, location, and statistic claims.
- Header, footer, sidebar, CTA, About, Privacy, Terms, 404, metadata, Open Graph, manifest text, canonical URLs, site-base configuration, and sitemap/robots references.
- Image alt text and labels.

Preserve:

- Code identifiers that do not appear publicly.
- Historical provenance in the template selection and copy-manifest documents.
- Third-party package names and framework configuration.
- Existing user changes approved during preflight.

Map verified homepage research into the current template:

- Hero and direct value proposition.
- Start/beginner guidance.
- Game overview.
- Verified player-facing facts.
- Codes state.
- FAQ when supported by evidence.
- Final CTA.
- Official website, Discord, YouTube, and platform links.
- SEO title, description, and keywords.
- HSL theme tokens.

Never invent numbers, entities, mechanics, codes, contacts, legal operator details, or live popularity. Omit unsupported optional facts and record them in `CONTENT_GAPS.md`.

For codes:

- Publish verified active codes only.
- If none are verified, state that no active codes are currently confirmed.
- Do not reuse codes from another game, version, or video title.

For legal pages:

- Do not invent a company, operator, address, email, or jurisdiction.
- Keep neutral independent fan-site language when supported.
- Record missing operator/contact information as a launch blocker.

For localization:

- Treat recommended languages as a roadmap, not implemented localization.
- Do not add a language switcher, locale routes, or support claims without complete translated content.
- Default to the site's intended primary language, normally English.

### 4. Install favicon assets safely

Validate the ZIP before extraction. Place only expected favicon members into the paths required by the selected template and update framework metadata/manifest references.

Do not:

- Extract arbitrary paths from the ZIP.
- Overwrite unrelated public assets.
- Move the source ZIP out of the resolved research root.
- Claim the favicon is an official game logo.

### 5. Integrate inner pages

Read [references/innerpage-content-policy.md](references/innerpage-content-policy.md).

For every final keyword in `keywords.json`:

1. Resolve exactly one matching material file.
2. Read its research intent, evidence, conflicts, and status.
3. Assign one output state:
   - `PUBLISHED`
   - `DRAFT`
   - `BLOCKED`
4. Record the decision in `CONTENT_PAGE_MANIFEST.json`.

Status policy:

- `COMPLETED`: normally eligible for a published page.
- `PARTIAL`: publish only when the verified material independently answers the search intent; otherwise create a draft or block it.
- `BLOCKED`: do not create a public/indexable route.

Each published page must:

- Use the exact final keyword naturally.
- Have a readable title containing the keyword, normally 40–60 characters.
- Have a meta description containing the keyword, 140–160 characters.
- Answer the search intent directly in the opening two to four sentences.
- Use intent-driven H2 sections rather than a fixed universal outline.
- Use short, scannable paragraphs.
- Match length to evidence density; usually 800–1,600 English words.
- Preserve official English game terms.
- Include version or last-verified context for volatile facts.
- Use only claims supported by the material file.
- Avoid keyword stuffing and padding.

Do not put `待确认` or unsupported claims into public copy. Omit uncertain optional details and record them in `CONTENT_GAPS.md`. If an uncertain fact is essential to the page, keep the page as a draft or blocked item.

Do not publish competitor guide-site URLs. Preserve research provenance internally. Official sources may be linked publicly when useful.

### 6. Connect information architecture

Using `keywords.json` categories and the copied template's content model:

- Create stable, readable slugs.
- Add category/list entries.
- Add breadcrumbs where the template supports them.
- Connect two to four genuinely related published pages.
- Update homepage and navigation links only with published pages.
- Exclude draft and blocked pages from navigation, related modules, sitemap, feeds, and indexable route lists.
- Regenerate or update `sitemap.xml` or its framework generator from the new site's confirmed origin and `PUBLISHED` routes only. Every sitemap URL must use the new site's canonical origin and resolve to a published route.
- Update `robots.txt` or its framework generator so any `Sitemap:` directive points to the new site's sitemap. Preserve valid crawl rules, but verify they do not accidentally block published routes.
- Avoid creating duplicate pages for merged synonyms.

Do not add a new dependency or replace the template's routing/content system unless the user explicitly approves it.

### 7. Media and demo residue policy

The upstream icon package does not provide full game screenshots.

- Never present demo SVGs, CSS art, or fictional template illustrations as target-game screenshots.
- Replace misleading labels and alt text.
- Remove or neutralize misleading demo media when no verified replacement exists.
- Record missing screenshot, trailer, attribution, and rights needs in `CONTENT_GAPS.md`.
- Do not download or reuse copyrighted game media without an authorized source and recorded provenance.

### 8. Validate

Read [references/acceptance-checklist.md](references/acceptance-checklist.md).

Run available project scripts in this order when defined:

1. typecheck
2. lint
3. test
4. build

Do not install a new dependency merely to make validation possible without approval. Do not weaken checks, delete tests, or conceal failures.

Run:

```bash
python3 scripts/validate_integration.py \
  --game "Game Name" \
  --workspace "/absolute/game/workspace" \
  --site-origin "https://new-site.example"
```

When the new origin is unknown, run without `--site-origin` only to record limited validation; do not claim canonical, robots, or sitemap domains are verified.

Also inspect:

- Old demo names, domains, absolute URLs, path slugs, entities, links, image labels, and fake metrics, including generated/static `robots.txt`, `sitemap.xml`, canonical, Open Graph, and site-base settings.
- Confirm the new sitemap contains only intended published canonical URLs and no source-template, localhost, preview, draft, or blocked-page URLs.
- Internal links and route coverage.
- Metadata lengths.
- Favicon and manifest paths.
- Mobile overflow when the template has viewport tests.
- Draft/blocked exclusion.
- Public page count versus page manifest.
- Source and template library integrity.
- `robots.txt`, static or generated sitemap, canonical/Open Graph URLs, and site-base configuration use the confirmed new-site origin; sitemap entries map to `PUBLISHED` routes only.
- No source-template domain or stale source route remains in public SEO output. Unknown matches are documented rather than globally replaced.

A residue match inside approved provenance documents is allowed; a residue match on a public page is not.

## Completion rule

Report completion only when:

- Every keyword has a recorded outcome.
- All published claims are supported.
- Public demo residue is cleared.
- Icon and metadata paths resolve.
- Required output documents exist.
- Validation results are recorded honestly.
- No original template file was modified.
- Domain-bound SEO URLs are verified against the confirmed new-site origin; if the origin remains unknown, the result is PARTIAL/BLOCKED and the launch blocker is recorded.

If build or validation fails, mark the integration `PARTIAL` or `BLOCKED`, preserve the evidence, and state the exact unresolved issue. Never claim launch readiness from content integration alone.
