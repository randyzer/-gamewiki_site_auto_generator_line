---
name: game-homepage-icon-research
description: Research a game's guide-site homepage content and create a complete favicon package from an original generated icon. Use when the user provides a game name and local game directory and wants current official links, player-facing stats, homepage copy, SEO metadata, colors, localization priorities, a Markdown research file, and an audited favicon ZIP (favicon.io or approved local conversion) saved under the game's backgroundinformation directory.
---

# Game Homepage & Icon Research

Create two production-ready deliverables from a game name and local game directory:

1. {game name}攻略站首页调研信息.md
2. {game name}图标.zip

Save both under {local game directory}/backgroundinformation. Create that exact subdirectory when absent.

## Required inputs

Require:

- Game name
- Local game directory

If either is missing, ask one focused question before researching or writing files. Resolve the local path before mutating anything.

Derive a filename-safe game name by preserving the displayed game name while replacing filesystem separators with hyphens. Do not silently shorten the name.

## Output contract

Use these exact paths:

- Research: {local game directory}/backgroundinformation/{game name}攻略站首页调研信息.md
- Icons: {local game directory}/backgroundinformation/{game name}图标.zip

Do not install the skill, modify product code, deploy the site, or unpack the ZIP into the website unless the user separately requests it.

## Workflow

### 1. Prepare the destination

- Confirm the local game directory exists.
- Create backgroundinformation if absent.
- Check whether either output already exists.
- Never overwrite an existing output without explicit user approval; create a versioned sibling when approval is absent.

### 2. Resolve the exact game identity

Disambiguate games with similar names, mobile/PC variants, remakes, demos, and playtests. Prefer official store identifiers, platform, developer, publisher, and release state.

Record the research date using the user's timezone.

### 3. Research current facts

Browse the web because game data, links, player counts, reviews, releases, updates, and communities change.

Prioritize:

1. Official game website or official store page
2. Official announcements and community hub
3. Official Discord, Reddit, X, YouTube, support, and developer pages
4. Platform-native market or community tools
5. Reputable data services only for metrics unavailable from primary sources

Rules:

- Open and verify every URL before including it.
- Never output a known 404, inaccessible, expired, or unverified link.
- Do not include competitor guide-site URLs anywhere in the deliverable.
- If no official Reddit or YouTube exists, state that clearly. For the requested video, use one relevant popular video only after verifying it.
- Never confuse codes, data, or communities from a different game version.
- Do not invent visits, favorites, item counts, level caps, codes, or live statistics.
- Omit zero-value stats.
- Prefer stable player-intuitive stats: release date, last major update, classes, peak CCU, reviews, rating, market items, level cap, skills, bosses, or playable modes.
- Label volatile values with an as-of date.

### 4. Build the homepage research document

Read references/homepage-output-template.md before drafting.

Write clear Markdown containing:

- Game identity and source links
- Official website, communities, and video
- Player-facing facts and data sources
- Complete homepage JSON
- Codes note
- SEO self-check
- Recommended light/dark theme and CSS variables
- Up to four localization priorities
- Implementation notes and factual boundaries

Homepage rules:

- English is mandatory in localization recommendations.
- Exclude Chinese from the recommended language list unless the user explicitly overrides this.
- Recommend no more than four languages.
- Use official localized game names. Do not invent translated brand names.
- Set sidebarCodes to 暂无 when no official public codes are verified.
- Keep home.meta.title and metadata.title at 60 characters or fewer.
- Keep metadata.description between 140 and 160 characters.
- Keep metadata.keywords at 100 characters or fewer.
- Keep home.hero.stats a string-only array.
- Include exactly four home.start.cards objects.
- Give every home.aboutGame.stats entry label and value.

### 5. Generate the icon

Read references/icon-workflow.md before generating.

Use the image-generation tool in logo-brand mode. Create an original fan-site emblem derived from the game's genre, visual tone, signature mechanics, and homepage palette.

Requirements:

- Square master
- Strict final size 512 by 512 pixels
- PNG with genuine alpha transparency
- Bold silhouette readable at 16 by 16 pixels
- Centered mark with safe transparent padding
- No words or small lettering
- No watermark
- No copyrighted character likeness
- Do not copy or closely imitate the official game logo

Inspect the generated image. Resize mechanically to exactly 512 by 512 only when the generator emits another square size; preserve alpha.

### 6. Convert using one audited path

Only the **conversion mechanism** has two permitted alternatives. Step 5 (original
icon creation, transparent 512×512 master, rights and visual inspection) is
mandatory for **both**. Never describe an arbitrary user-provided icon, SVG,
synthetic fixture, or local drawing as image-generator-produced artwork.
If originality/usage-rights provenance is missing, return BLOCKED.

Choose **exactly one** conversion route and label it in the final report.
A valid ZIP alone does not prove the artwork source or conversion method.

**A — favicon.io online conversion**

- Use https://favicon.io/favicon-converter/ with browser commands that have
  separate human authorization for upload, download and cleanup.
- Upload only the approved master, verify visible attachment and previews,
  download the actual file, preserve its bytes and rename to final ZIP path.
- If automated transfer is unavailable, separately approved human transfer
  may be used only with user attestation, original PNG + ZIP SHA256, and
  matching decoded 512px pixels. Label this path
  `FAVICON_IO_MANUAL_USER_ATTESTED`; do not claim BSK automation or
  independently authenticated website origin.
- Do not click advertisements or unrelated buttons.

**B — host-audited local conversion**

- Use the trusted Agent-run converter `LOCAL_FAVICON_CONVERSION_V1`
  (`agent/scripts/m3-local-favicon.mjs`), not a worker-created ZIP or receipt.
- Require an existing run and matching gameIdentity, a 512×512 original
  image with explicit human visual and originality/usage-rights approval,
  and source PNG SHA256 bound to the request and approval.
- Check the host conversion receipt, ZIP SHA256, all 7 expected members,
  PNG sizes and pixels, ICO, Manifest and CRC; the embedded 512px PNG
  pixels must match the approved source.
- Copy the host-validated ZIP **byte for byte** to final output. Record
  `faviconIoUsed=false`, `bskTransferUsed=false` and the converter
  origin. Never claim this ZIP came from favicon.io.
- Only trusted host code may authenticate run-bound approval/receipt.
  A standalone worker must return BLOCKED if approval cannot be verified.

The expected ZIP members are:

- apple-touch-icon.png
- favicon-32x32.png
- favicon-16x16.png
- favicon.ico
- site.webmanifest
- android-chrome-192x192.png
- android-chrome-512x512.png

### 7. Validate

Run:

~~~bash
python3 scripts/validate_outputs.py \
  --markdown "/absolute/path/{game name}攻略站首页调研信息.md" \
  --zip "/absolute/path/{game name}图标.zip" \
  --game-name "{game name}" \
  --conversion-mode "favicon-io"
~~~

For a trusted local conversion, supply `--conversion-mode local
--conversion-receipt /absolute/path/CONVERSION_RECEIPT.json`. The
standalone validator checks ZIP/receipt consistency but does not grant user
approval; the Agent must independently verify the host-owned approval
and the exact original artwork provenance.

Also:

- Test ZIP integrity.
- Record the ZIP SHA-256.
- Confirm both final files are inside backgroundinformation.
- Remove only task-created temporary files after validation.
- Report final absolute paths, validation result, ZIP members, SHA-256, and the exact English icon prompt.

## Failure handling

- If the official identity is ambiguous, stop and ask before creating files.
- If an official/community link cannot be verified, omit it and state it was not confirmed.
- If favicon.io is unavailable, use local conversion only with an independently verified host approval and conversion receipt; otherwise preserve the master and return BLOCKED.
- If the local device or destination is unavailable, preserve completed artifacts and report the exact blocked step.
- Never mark partial work as complete.
