---
name: game-site-template-selector
description: Select the best game-guide template from the fixed GitHub main/template source, recommend compatible modules, and safely copy the selected template into a new game workspace. Materialize a commit-pinned read-only snapshot first; never select templates from an independent local library.
---

# Game Site Template Selector

## Purpose

Choose a defensible design foundation from the fixed GitHub template library. Select one complete main template, recommend a small number of modules from other templates, and copy only the main template into the target workspace. Preserve every source template byte-for-byte.

This skill performs template selection and safe copying only. It does not redesign the chosen template, replace branding, generate content, merge recommended modules, install dependencies, or deploy a site.

## Inputs

Required:

- Game name.
- Absolute target game workspace directory.

Defaults:

- **Fixed template origin:** `https://github.com/randyzer/-gamewiki_site_auto_generator_line/tree/main/template`.
- Source repository: `https://github.com/randyzer/-gamewiki_site_auto_generator_line.git`, ref `main`, subtree `template/`.
- Materialize a commit-pinned temporary checkout; it is only a read-only transport snapshot, not an alternative source.
- Template candidates: immediate `temp<number>_based_<reference>` directories under that subtree.

Optional evidence:

- Official game URL or store page.
- Existing homepage research file.
- Screenshots, trailer, genre, platform, art direction, or intended content plan.
- No template source override; the remote origin is fixed by this contract.

If the target directory exists and contains any file, stop before copying. Report the contents at a high level and ask the user whether to choose a different empty directory. Never merge into or overwrite a non-empty project.

## Outputs

After a successful run, the target workspace contains:

- A byte-identical copy of the selected template's eligible source files.
- `docs/TEMPLATE_SELECTION_REPORT.md`
- `docs/template-copy-manifest.json`
- `docs/TEMPLATE_RESIDUE_SCAN.json`

The report includes:

- Game evidence and design brief.
- All-template scorecard.
- Selected main template and decisive reasons.
- Rejected alternatives and tradeoffs.
- Up to five module recommendations from other templates.
- Source file/component for each recommendation.
- Integration value, dependencies, conflicts, and implementation risk.
- Copy exclusions and source-integrity result.

Read [references/selection-rubric.md](references/selection-rubric.md) before scoring. Follow [references/output-contract.md](references/output-contract.md) when writing the report.

## Workflow

### 1. Preflight and template-library health gate

Before researching, scoring, or copying, materialize and validate the **fixed GitHub source** (never fall back to a local template library):

```bash
# Clone to a fresh external temporary directory; never clone into the target workspace.
SNAPSHOT_DIR="$(mktemp -d)"
git clone --depth 1 --branch main --single-branch \
  https://github.com/randyzer/-gamewiki_site_auto_generator_line.git "$SNAPSHOT_DIR/repo"
COMMIT_SHA="$(git -C "$SNAPSHOT_DIR/repo" rev-parse HEAD)"
TEMPLATE_ROOT="$SNAPSHOT_DIR/repo/template"
# Use the SAME immutable snapshot for inventory, scoring, and copying.
```

Resolve and record the full `COMMIT_SHA` once. Do not refresh `main` during a run. A clone/auth/network failure is `BLOCKED`; do not use a pre-existing local library as fallback. The clone must remain outside the target workspace, with no source mutations. Remove the temporary checkout after the run unless retention is explicitly approved.

**Orchestrator-provided snapshot.** When the task context supplies `templateSnapshot` (repository, ref, subtree, full `commit`, `templateRoot`), the orchestrator has already materialized that fixed GitHub source at that commit. Do not clone again. Confirm that `templateSnapshot.repository` is the fixed repository above, `templateSnapshot.ref` is `main`, `templateSnapshot.subtree` is `template`, and `commit` is a full 40-character SHA; otherwise return `BLOCKED`. Then set `TEMPLATE_ROOT` to `templateSnapshot.templateRoot` and `COMMIT_SHA` to `templateSnapshot.commit`, and do not delete that snapshot.

Confirm:

1. The fetched repository and `template/` subtree are readable, the Git origin matches the fixed URL, and the recorded commit SHA matches the checkout HEAD.
2. At least one immediate `temp*` candidate directory exists.
3. Discover all current candidates dynamically; a changed template count is not an error by itself.
4. Every candidate name matches `temp<number>_based_<reference>`, with no duplicate number.
5. Every candidate is a real directory rather than a symlink.
6. Every candidate contains readable `package.json`, `app/` or `src/app/`, and `components/` or `src/components/`. Both layouts are valid Next.js structures; a candidate with both `app/` and `src/app/` is ambiguous because Next.js ignores `src/app/`.
7. Every `package.json` is valid JSON.
8. The target path is absolute.
9. The target does not resolve inside the template library.
10. The target is absent or completely empty.
11. No source and target path are identical or nested in either direction.

Run:

```bash
python3 scripts/inventory_templates.py \
  --template-root "$TEMPLATE_ROOT" \
  --output "/tmp/game-template-inventory.json"
```

If the fetched template subtree is missing, inaccessible, redirected, contains no `temp*` candidate, includes an unexpected name/symlink, or a candidate lacks required core files, stop before all other work. Ask one focused question that states the expected condition, observed anomaly, and affected path. Do not guess a replacement path, silently skip a candidate, repair or rename a template, or continue with the remaining templates without explicit user confirmation. A larger or smaller candidate count is accepted when every discovered template passes the health checks.

Record the repository URL, branch, resolved commit SHA, and `template/` subtree path in the selection report and copy provenance. Use the generated inventory as structural evidence. Do not use `_support` as a copy source and never write health-check output into the template library.

### 2. Build a game design brief

Use supplied evidence first. If only the game name is supplied, research enough current information to classify:

- Platform and genre.
- Primary player loop.
- Visual tone and world identity.
- Main player search intents.
- Likely information architecture.
- Article and media needs.
- Whether the game is systems-heavy, lore-heavy, task/problem-heavy, social, tactical, horror, fantasy, or commercial-wiki oriented.

Prefer official pages, official trailers, store pages, and current first-party material. Do not select a template from the game title alone when the title is ambiguous. Record the evidence URLs and access date.

Do not copy the reference site's brand, protected media, logo, vocabulary, fictional statistics, or claims into the new game. The templates are structural and interaction references.

### 3. Inspect every candidate

Read the inventory plus relevant candidate files:

- `README.md`, when present.
- `page.tsx`, index and detail route files under the inventory's `app_dir` (`app/` or `src/app/`).
- Component names and representative components under the inventory's `components_dir` (`components/` or `src/components/`).
- `content/` organization and metadata model.
- `public/` media inventory.
- `package.json` scripts and dependencies.
- Tests and verification documents.
- Global CSS/tokens at a structural level.

Evaluate all candidates. Never choose a template after inspecting only one.

### 4. Score and select

Score every template using the 100-point rubric in `references/selection-rubric.md`. Each score needs one short evidence statement. Do not award points for a capability that exists only in static copy or fictional data.

Choose the highest-scoring template unless a documented hard constraint makes it unsuitable. When the top two are within five points:

1. Prefer closer player-intent and information-architecture fit.
2. Then prefer stronger content/article structure.
3. Then prefer better tested accessibility and production safety.
4. If still tied, present both and ask the user before copying.

One main template must provide the complete base. Do not create a synthetic hybrid base.

### 5. Recommend supplemental modules

Recommend zero to five modules from non-selected templates. A recommendation must identify:

- Source template.
- Exact component or source file.
- Player problem solved.
- Why it complements the main template.
- Required dependencies/data model.
- CSS or interaction conflict risk.
- Effort: Low, Medium, or High.

Recommendations are planning output only. Do not copy or merge these modules during this skill run.

Reject modules that duplicate the main template without meaningful improvement, rely on fictional/live claims, or require copying the source site's identity.

### 6. Dry-run and copy

First run:

```bash
python3 scripts/copy_template.py \
  --template-root "$TEMPLATE_ROOT" \
  --source "tempX_based_example" \
  --destination "/absolute/game/workspace" \
  --game "Game Name" \
  --source-commit "$COMMIT_SHA" \
  --dry-run
```

Review the resolved paths, exclusion list, file count, and aggregate source hash. Then rerun without `--dry-run`.

The copy script must:

- Read source files only.
- Refuse non-`temp*` sources.
- Refuse a non-empty destination.
- Exclude `.git`, `.next`, `node_modules`, caches, coverage, `.DS_Store`, `*.tsbuildinfo`, and environment-secret files.
- Verify the eligible source tree hash before and after copying.
- Verify every copied file hash.
- Write `docs/template-copy-manifest.json`.

Never use force, overwrite, delete, or synchronization flags that can remove destination files.

### 7. Scan copied-site identity and URL residue

After copying and before writing the final report, perform a read-only scan of the copied files listed in `template-copy-manifest.json`. Include at least:

- `robots.txt`, `sitemap.xml`, sitemap generators, canonical/metadata configuration, `siteUrl`/`baseUrl` settings, Open Graph URLs, and public route/config files.
- The source template's game/brand names, domain names, absolute URLs, and route paths that appear to belong to its former demo/reference site.
- Public copy and metadata that still identifies the source game.

Use the selected template's inspected files and template name as evidence for candidate source identities. Do not scan `.env` contents or print secrets. Distinguish definite source-site values from generic third-party links or uncertain matches. If the original identity cannot be established, record the scan as incomplete instead of claiming the copy is clean.

Write `docs/TEMPLATE_RESIDUE_SCAN.json` and summarize the results in `docs/TEMPLATE_SELECTION_REPORT.md`. Record file path, marker type, matched value, and confidence. Do not modify, delete, or replace copied values in this skill. The content-integrator owns adaptation after the new site's official domain and route set are confirmed.

### 8. Write the selection report

After the scan, write `docs/TEMPLATE_SELECTION_REPORT.md` using the output contract. The report and scan are new provenance documentation in the destination; they are not modifications to the original template.

Do not adapt the copied project in this skill. End after reporting:

- Selected template.
- Destination.
- Files copied.
- Source integrity result.
- Recommended modules.
- Remaining decisions for the later design/adaptation phase.

## Safety rules

- Source templates are immutable inputs.
- Never run formatters, installs, builds, tests, migrations, or Git commands inside source templates.
- Never write reports or temporary files into the template library.
- Never copy `.git`, dependency directories, build output, caches, or secrets.
- Never overwrite a target workspace.
- Never imply that a visual fit is proven without current game evidence.
- Never automatically implement supplemental module recommendations.
