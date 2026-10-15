---
name: game-site-ui-ux-audit-optimizer
description: Audit and safely optimize a game-guide website using real-browser evidence across representative routes and viewports. Use when the user wants to review, score, improve, or validate the UI/UX of a game wiki or guide site after template selection or content integration, including game-theme fit, homepage/list/detail layouts, responsive behavior, navigation, tables, codes UI, media, ads, accessibility, console/network health, template residue, and before/after verification for Next.js or Astro projects.
---

# Game Site UI/UX Audit Optimizer

## Purpose

Evaluate a populated game-guide site as a real player experiences it, produce evidence-backed findings, and modify the site only when the user explicitly authorizes optimization.

This skill is specialized for content-heavy game wikis and guide sites. It combines:

- The visual identity and immersion expected from a game site.
- The hierarchy, scanning, search, and cross-linking expected from a wiki.
- Responsive, accessibility, performance, and advertising constraints.
- Safe integration with outputs from the other game-site skills.

The workflow is inspired by UI/UX Pro Max's browser-first, multi-viewport audit loop. Read [references/upstream-attribution.md](references/upstream-attribution.md) before redistributing copied or adapted code.

## Required user inputs

Require:

- Game name.
- Absolute target game workspace directory.

Default to `audit-only` when the user does not explicitly authorize source changes.

For `audit-and-optimize`, also require explicit authorization to modify the workspace. If the requested repair scope is unclear, ask whether to fix blockers/high findings only or another clearly bounded set.

Reuse values from the current conversation only when explicitly supplied and still unambiguous. Never infer a workspace from a similar game or another run.

## Derived inputs

Resolve inside the target workspace:

- Framework and scripts from `package.json`.
- Page roots from `app/`, `src/app/`, `pages/`, or `src/pages/`.
- Existing URL supplied by the user, or a safe project preview/dev command.
- Representative routes from `docs/CONTENT_PAGE_MANIFEST.json`, framework routes, and navigation.
- Template selection context from `docs/TEMPLATE_SELECTION_REPORT.md`, when present.
- Content integration context from `docs/CONTENT_INTEGRATION_REPORT.md`, when present.
- Demo/old-game terms from the selection report and public source, when reliable.
- Theme tokens, global styles, shared layouts, content registries, and public media.

Missing upstream reports are warnings, not blockers, unless the requested comparison depends on them.

If a required value, route, command, or target is missing or ambiguous, ask one consolidated question listing every unresolved item. Until required inputs are complete:

- Do not start a server.
- Do not install packages or browsers.
- Do not create audit output.
- Do not change source files.
- Do not guess a route, port, framework, or build command.

Read [references/input-contract.md](references/input-contract.md) before preflight.

## Modes and authority

### Audit only

This is the default. It may:

- Read project files.
- Start an existing project script without installing dependencies.
- Open the local or supplied site in a browser.
- Exercise non-destructive public interactions.
- Capture screenshots.
- Write only the declared audit artifacts under `docs/`.

It must not change product source, content, configuration, dependencies, or assets.

### Audit and optimize

Enter this mode only after explicit authorization. Before source changes:

- Record Git status.
- If the worktree is dirty, show the relevant changes and ask for confirmation.
- Freeze the accepted scope.
- Preserve unrelated user work.
- Create baseline screenshots and a baseline report.

Do not:

- Change the selected template architecture.
- Replace factual game content with invented copy.
- add dependencies without separate approval.
- redesign unaffected pages.
- modify the original template library.
- treat every stylistic preference as a defect.

Read [references/optimization-policy.md](references/optimization-policy.md) before making changes.

## Required outputs

For every completed audit, create a timestamped run:

```text
docs/ui-ux-audit/<run-id>/
├── UI_UX_AUDIT_REPORT.md
├── UI_UX_AUDIT.json
├── UI_UX_OPTIMIZATION_PLAN.md
└── screenshots/
```

When optimization occurs, also create:

```text
docs/ui-ux-audit/<run-id>/
├── UI_UX_CHANGE_MANIFEST.md
├── UI_UX_RETEST_REPORT.md
└── screenshots-after/
```

Update `docs/ui-ux-audit/LATEST` with only the relative run directory after the run is complete.

Follow [references/output-contract.md](references/output-contract.md).

## Workflow

### 1. Run read-only preflight

From this skill directory:

```bash
python3 scripts/preflight.py \
  --game "Game Name" \
  --workspace "/absolute/game/workspace" \
  --mode audit-only
```

Add `--url "http://localhost:3000"` when a server is already running.

Preflight must determine:

- Workspace identity and whether it is inside the immutable template library.
- Framework, page roots, and relevant package scripts.
- Whether dependencies appear installed.
- Whether local Playwright is available.
- Git status and optimization confirmation requirements.
- Available upstream reports and route candidates.
- Exact blockers and warnings.

If no browser tool is available and Playwright is absent, ask the user to install or approve a project-local dependency. Never install automatically.

### 2. Establish page coverage

Audit at minimum:

- Homepage.
- One representative list/category page, when the site has one.
- One representative article/detail page, when the site has one.

Add applicable page types:

- Codes.
- Tier list.
- Beginner guide.
- Boss, build, class, race, item, map, or tool page.
- Search, 404, Privacy, and Terms for release-oriented audits.

Do not audit every article when representative pages share one layout. Expand coverage when different templates, components, or interaction patterns are used.

Record the route-selection reason. A missing required archetype is itself a finding.

### 3. Capture a browser-first baseline

Prefer an available browser automation tool. Otherwise run the bundled Playwright script only when its dependency already exists:

```bash
node scripts/game_site_audit.mjs \
  --url "http://localhost:3000" \
  --route "/" \
  --route "/guides" \
  --route "/guides/beginner-guide" \
  --out "/absolute/workspace/docs/ui-ux-audit/<run-id>"
```

Use these viewport widths:

- 360 and 390: phones.
- 768: tablet.
- 1024: laptop.
- 1440: desktop.
- 1920: wide desktop.

Capture full-page screenshots after triggering lazy and scroll-reveal content. Collect console errors, uncaught exceptions, failed requests, and HTTP status.

Never infer visual quality only from source code.

### 4. Exercise real player flows

Test applicable flows without destructive external actions:

- Open and close mobile navigation.
- Follow primary and secondary homepage CTAs.
- Navigate category → article → related guide.
- Use breadcrumb and table of contents.
- Copy a code where a copy interaction exists.
- Open accordions, tabs, filters, and search.
- Test empty, invalid, loading, expired-code, and no-result states when safely available.
- Navigate with the keyboard and verify focus order and visibility.
- Test reduced motion when animation is material.

Do not submit purchases, accounts, messages, or external forms.

### 5. Apply the game-guide rubric

Read [references/audit-rubric.md](references/audit-rubric.md).

Evaluate:

1. Game identity and atmosphere.
2. Content hierarchy and search intent.
3. Navigation and information architecture.
4. Homepage conversion and trust.
5. Article readability and scanning.
6. Game-specific components.
7. Responsive behavior.
8. Accessibility and interaction.
9. Media, performance, and layout stability.
10. Advertising compatibility.
11. Content/template residue.
12. Console, network, and route health.

Separate measured failures from taste judgments. Label approximate contrast and heuristic checks as leads until visually verified.

### 6. Rank findings

Use:

- `BLOCKER`: prevents a core task, exposes wrong-game information, breaks a route, or creates a serious accessibility/legal launch risk.
- `HIGH`: materially harms navigation, readability, responsiveness, trust, or conversion.
- `MEDIUM`: visible usability or consistency issue with a workaround.
- `LOW`: polish improvement with limited user impact.
- `NOTE`: observation or optional direction, not a defect.

Each finding must contain:

- Stable ID.
- Severity and category.
- Page and viewport/state.
- Observed evidence.
- User impact.
- Recommended fix.
- Verification method.
- Screenshot or source reference when available.

Never use unsupported numeric scores to create false precision.

### 7. Stop or optimize

In `audit-only`, write the report and stop.

In `audit-and-optimize`:

1. Present the baseline verdict and proposed repair set.
2. Confirm any scope not already authorized.
3. Fix blockers first, then approved high findings.
4. Preserve content truth and existing architecture.
5. Run targeted tests and the project build.
6. Repeat the same browser routes, states, and viewports.
7. Produce before/after evidence and record unresolved findings.

Do not mark a finding fixed because code changed. It is fixed only after the original reproduction no longer fails.

### 8. Validate outputs

Run:

```bash
python3 scripts/validate_audit.py \
  --workspace "/absolute/game/workspace" \
  --run-dir "/absolute/game/workspace/docs/ui-ux-audit/<run-id>"
```

For optimization also pass `--expect-optimization`.

Read [references/acceptance-checklist.md](references/acceptance-checklist.md) before completion.

## Content and design boundaries

- Preserve verified game facts from research artifacts.
- Prefer official visual assets or clearly licensed/attributed media.
- Do not call a generated fan icon an official logo.
- Do not force generic neon, glassmorphism, 3D, or animation merely because the product is a game.
- Balance game atmosphere with wiki readability.
- Keep long-form text measure, table behavior, navigation, and internal linking usable.
- Preserve ad-slot space without allowing ads to obstruct primary content.
- Treat recommended languages as a roadmap unless full localization exists.
- Never publish `待确认`, demo-game names, placeholder links, or fabricated codes.
