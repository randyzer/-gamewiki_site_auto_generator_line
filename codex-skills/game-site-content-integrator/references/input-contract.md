# Input contract

## Required user values

- Game name.
- Absolute target game workspace.
- When source-template SEO configuration contains absolute URLs, the confirmed canonical origin for the new fan site. This is distinct from the game's official website URL. If it is not known yet, do not guess; domain-dependent SEO changes remain a launch blocker.

Do not treat a template source directory as the target workspace.

## Standard derived paths

Resolve the research root first:

1. Use `{workspace}/backgroundinformation` when it is the only supported root present.
2. Accept legacy `{workspace}/background_information` when it is the only supported root present.
3. If both exist, ask which one to use; do not merge them or pick one silently.
4. If the user explicitly provides a research root, require an absolute directory inside the target workspace.

If source-template files contain absolute canonical, sitemap, or site-base URLs, obtain the new fan site's confirmed canonical origin before changing those values. The official game website is not a substitute. When the domain is not known, leave domain-bound settings untouched, record a launch blocker, and do not claim full integration.

Then check:

- `{research root}/{game}攻略站首页调研信息.md`
- `{research root}/{game}图标.zip`
- `{research root}/keyword-materials/keywords.json`
- `{research root}/keyword-materials/`
- `{workspace}/docs/TEMPLATE_SELECTION_REPORT.md`
- `{workspace}/docs/template-copy-manifest.json`
- `{workspace}/docs/TEMPLATE_RESIDUE_SCAN.json` when present; otherwise the integrator must repeat the scan and record source identity/domain/route markers in its own report.

If a standard research file is absent, search only below the resolved research root.

Accept an automatically discovered file only when exactly one candidate matches its role. Do not choose the newest file among duplicates.

## Missing-input question

Ask one consolidated question such as:

```text
开始内容填充前，还需要确认以下信息：

- 游戏名：
- 目标游戏工作目录：
- 首页调研文件：（预期位置……）
- 图标ZIP：（预期位置……）
- keywords.json：（发现0个/多个候选……）
- 关键词素材目录：
- 新站正式域名（仅当需要更新 sitemap、canonical 或绝对 SEO URL；未确定请注明）：

在这些信息确认前，我不会修改项目；域名未确定时，不会猜测或替换域名相关设置。
```

List only unresolved items. Do not ask again for values already explicitly and unambiguously supplied.

## Consistency checks

The game name should agree across:

- User input.
- Homepage research title/content.
- Icon ZIP filename.
- Keyword prefixes.
- Template selection report.
- Template copy manifest destination.

A harmless capitalization difference may be normalized. A different game title, edition, demo, remake, platform variant, or conflicting destination is an ambiguity that requires confirmation.

## Site URL and residue rules

Use the confirmed new site's canonical origin for absolute canonical URLs, Open Graph URLs, sitemap `<loc>` values, and a `Sitemap:` line in robots.txt. Compare against every source-template domain and route listed in `TEMPLATE_RESIDUE_SCAN.json`. Do not perform blind global replacements: preserve unrelated official game links, third-party URLs, package references, and historical provenance. If no canonical origin was supplied and the copied site has domain-bound SEO configuration, stop before changing those values and record the missing origin as a launch blocker.

## Preflight blockers

- Missing or non-absolute workspace.
- Workspace inside the template library snapshot passed as `--template-root` (the `template/` subtree of https://github.com/randyzer/-gamewiki_site_auto_generator_line at the commit recorded in `docs/template-copy-manifest.json`).
- Missing copied template manifest or mismatched destination.
- Missing `package.json` or all recognized page roots (`app/`, `src/app/`, `pages/`, and `src/pages/`).
- Invalid favicon ZIP.
- Invalid `keywords.json`.
- Duplicate final keyword.
- Missing or duplicate material file.
- Unknown material status.
- Uncommitted Git changes not yet acknowledged by the user.

Preflight is read-only. It may write its JSON result only to stdout or a caller-selected temporary path outside the project.
