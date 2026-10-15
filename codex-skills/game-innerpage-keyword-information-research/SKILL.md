---
name: game-innerpage-keyword-information-research
description: Classify a user-supplied game keyword list and research verified source material for one inner page per keyword. Use when the user provides a game name, local game directory, raw keyword Markdown file, and working directory, and wants keywords.json plus one `{keyword}素材.md` research file per final keyword. Uses Serper for Google discovery and yt-dlp for YouTube metadata/subtitles; does not write finished inner-page articles or invent keywords, facts, codes, names, or values.
---

# Game Innerpage Keyword Information Research

## Purpose

Turn a manually collected `关键词.md` into a traceable research set for game-guide inner pages. Produce a controlled keyword classification, an audit trail, and evidence-backed material files; stop before writing publishable articles.

## Required inputs

Obtain all four values before starting:

- Game name.
- Local game directory.
- Absolute path to the raw keyword Markdown file.
- Absolute working/output directory.

Reuse a value from the current conversation only when the user explicitly supplied it and it remains unambiguous. Never guess a path from a similar game, project, directory convention, or previous run.

If any required value is missing or ambiguous, ask one focused question listing all missing values. Do not begin preflight, run search or subtitle tools, create directories, read a guessed keyword file, or write any output until all four required inputs are complete.

After the inputs are complete, verify that the local game directory and raw keyword file exist before mutation. Create the working directory if it does not exist. Never modify the raw keyword file. Do not discover or add new target keywords; search suggestions and video titles may only help merge, normalize, or validate supplied keywords.

## Required outputs

Write these files in the working directory:

1. `keywords.json`
2. `关键词处理记录.md`
3. One `{final keyword}素材.md` for every final keyword
4. `关键词素材汇总.md`

Do not generate final inner-page copy, website files, code changes, or deployments.

Read [references/output-contract.md](references/output-contract.md) before writing outputs. Read [references/source-policy.md](references/source-policy.md) before researching.

## Workflow

### 1. Preflight

Verify:

- The raw keyword file exists and is readable.
- The working directory is writable or can be created.
- `SERPER_API_KEY` is present without printing its value.
- `yt-dlp` is installed; record its version.
- A JavaScript runtime recommended by the installed yt-dlp version is available when YouTube extraction requires it.

Use `scripts/research_cli.py check` for the tool check. Treat missing Serper credentials as `BLOCKED` for Google research, not permission to fall back silently to scraping Google. A missing cookie is not an error because cookies are optional.

### 2. Build the controlled keyword set

Read every keyword from the user-supplied file. Exclude only:

- The bare game title with no page intent.
- Terms clearly unrelated to this game.

Normalize conservatively:

- Translate non-English target terms into natural English.
- Correct obvious spelling errors.
- Prefix the canonical game title when missing.
- Merge true synonyms, spelling variants, and singular/plural duplicates.
- Never expand a short keyword into a new search intent.

Choose the dominant wording using observable evidence: exact-title frequency in Serper results, repeated wording in current authoritative pages, and YouTube title usage. Do not claim search volume unless a real volume source is provided.

Create 10–20 final keywords when the raw input contains that many valid intents. Never fabricate keywords merely to reach 10. Use specific, mutually exclusive category names; `guide` is mandatory. Avoid broad categories such as `gameplay` or `general`. A `codes` category, if present, contains exactly one final keyword. Order categories and keywords by expected demand using the evidence above.

The 10–20 range is the number of final keywords (one inner page each), not the number of raw inputs. A long raw list normally merges into fewer final keywords; record every merge rather than treating merged inputs as lost.

#### Piracy-intent keywords

Raw keywords that seek the paid product without paying (for example `crack`, `cracked`, `keygen`, `hacked`, `pirated`, `torrent`, `steamunlocked`, `mediafire`, `free download`, `full gratis`, and translated equivalents) are neither excluded nor turned into their own download pages. Handle them as risk warnings:

- Merge each one into a safety/risk final keyword (for example `{Game} safe` or `{Game} virus`); create that keyword when the input has piracy intent but no such keyword.
- The merged keyword's material file adds a `## 盗版风险提示` section: malware and account risks, no updates or support, license violation, and the official purchase channels. Cite sources for factual claims as usual.
- Never research, quote, or link a download, crack, keygen, or file-hosting page. Collect evidence only from official, security, and reputable news or guide sources.
- Record every such raw keyword in the `## 盗版意图处理` table of `关键词处理记录.md`. A term that only looks like piracy (for example a puzzle called "crack the code") is still listed there with `非盗版意图` and the reason, then handled normally.

Write `keywords.json` and document every keep, exclusion, translation, correction, and merge in `关键词处理记录.md`. Do not silently drop an input.

### 3. Research each final keyword

Process every keyword independently.

#### Google discovery with Serper

Run at most three query variants:

1. Exact final keyword.
2. Exact keyword plus a narrow intent term such as `guide`, `wiki`, or the relevant mechanic.
3. Exact keyword restricted to an identified official domain, only when useful.

Use `scripts/research_cli.py serper` and retain the raw JSON in a temporary or working evidence subdirectory. Serper snippets are discovery metadata only. Open selected pages, confirm they load, and extract relevant material from the page itself. Never output a broken or inaccessible URL.

#### YouTube discovery and subtitles

Use `scripts/research_cli.py youtube-search` to search the exact keyword. Rank candidates by:

1. Intent relevance.
2. Current game version or recency.
3. Availability of usable English subtitles.
4. Views and channel credibility.

Use `scripts/research_cli.py youtube-subs` to download manual English subtitles first, then auto-generated English subtitles if manual subtitles are unavailable. Convert VTT with `scripts/research_cli.py vtt-to-md`. Preserve English game terms even when summarizing in Chinese.

Default to no cookies. If YouTube blocks extraction, first use `--cookies-from-browser` with a dedicated browser profile when available. Otherwise accept a Netscape-format YouTube-only cookie file through `YTDLP_COOKIES_FILE`. Never print, copy into outputs, commit, or package cookies. Skip private, members-only, paywalled, or otherwise unauthorized content.

#### Official sources

Check the official website, store/game page, official wiki or documentation, official Discord announcements accessible without joining private spaces, and official YouTube channel when relevant. Include official material only when it contributes to the keyword.

### 4. Cross-validate and write evidence

For important claims, seek two independent reliable sources. Prefer, in order:

1. Current official source.
2. Current first-party video or announcement.
3. Maintained specialist wiki or guide with clear update context.
4. Relevant YouTube material with usable transcript.

Independence matters: two pages copying the same source are one evidence chain. When sources disagree, record both versions, their dates/game versions, and the reason for preferring one. Mark unsupported claims `待确认`; never resolve gaps by invention.

Use direct quotations sparingly and preserve source attribution. Paraphrase most material. Do not copy whole pages or full transcripts into the final material files.

Assign one status to each keyword:

- `COMPLETED`: enough relevant evidence and important claims are cross-validated.
- `PARTIAL`: useful evidence exists, but some important points remain unconfirmed or only one reliable source is available.
- `BLOCKED`: access/tool failure or no reliable evidence prevents useful research.

Write the material file even for `PARTIAL` or `BLOCKED`, explaining what was attempted and what is missing.

### 5. Validate the complete set

Run:

```bash
python scripts/validate_outputs.py --workdir "/absolute/workdir" --raw-keywords "/absolute/path/关键词.md"
```

Fix structural errors before completion. Manually check that:

- Every raw keyword has an audit disposition.
- Every piracy-intent raw keyword is in `## 盗版意图处理`, its target material has `## 盗版风险提示`, and no material links a download or file-hosting site.
- Every final keyword has exactly one material file.
- Every listed URL was successfully opened during this run.
- Source dates and access dates are present.
- No search snippet is represented as page content.
- No secret, cookie path, or API key appears in outputs.

## Failure behavior

Do not abort the whole run because one keyword fails. Continue with the remaining keywords, mark the affected item `PARTIAL` or `BLOCKED`, and summarize the failure. If Serper quota, YouTube throttling, or login gates affect many keywords, stop repeated retries and report the shared blocker.

## Security and data handling

- Read `SERPER_API_KEY` only from the environment.
- Read optional `YTDLP_COOKIES_FILE` only at runtime.
- Never store secrets in prompts, scripts, command history examples, output files, or the plugin package.
- Keep research within publicly accessible or legitimately authorized sources.
- Treat downloaded subtitles and raw search JSON as intermediate evidence, not publishable copy.
