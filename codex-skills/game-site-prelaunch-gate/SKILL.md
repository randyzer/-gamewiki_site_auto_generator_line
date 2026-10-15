---
name: game-site-prelaunch-gate
description: Run a source-backed prelaunch acceptance gate for game guide websites. Use before publishing to audit routes, content truth, metadata and keywords, links, production build and preview, technical SEO, mobile rendering, accessibility, performance signals, and repository secrets; repair only clearly verified P0/P1 issues when the user authorizes changes, then retest and create a UI/UX handoff when needed.
---

# Game Site Prelaunch Gate

Use this skill as the release gate after content integration and UI/UX work. Inspect the complete site, preserve evidence, separate confirmed defects from unknown facts, and report whether it is ready for launch. Do not redesign the site; hand visual and interaction work to `game-site-ui-ux-audit-optimizer`.

## 1. Input gate

Before starting a server, running project commands, writing reports, or changing files, establish:

- Game name.
- Absolute path to the game site's project directory.
- Expected production domain. If it is undecided, record that fact and restrict the result to a local technical assessment; do not claim canonical, sitemap, or production URL checks passed.
- Execution mode: `audit-only` by default, or `audit-and-repair` when the user explicitly asks for fixes.
- A local production-preview URL, or clear authorization to start the project's documented production preview.

If any required item is missing or ambiguous, ask once with a consolidated list. Do not infer the domain, port, project path, preview command, or permission to edit. For example:

```text
开始上线前验收前，还需要确认：
- 游戏名：
- 目标项目绝对路径：
- 预期正式域名（尚未确定请注明）：
- 生产预览 URL，或是否允许按项目现有命令启动：
- 执行模式：只审计 / 审计并修复可确认的 P0、P1：
```

Run `scripts/preflight.py` with the confirmed inputs before proceeding. Treat a dirty Git worktree as a hard stop for `audit-and-repair`: report changed paths and ask the user to preserve, commit, or explicitly approve working over them. Do not overwrite user work. In `audit-only`, never modify project files.

## 2. Establish scope and baseline

1. Identify framework, declared runtime version, lockfile/package manager, existing scripts, routes, content sources, manifest files, sitemap, robots rules, metadata conventions, and current Git state. Check for `CONTENT_PAGE_MANIFEST.json`, content integration reports, and the UI/UX audit report when present.
2. Build the page inventory as the union of framework routes, content/page manifest, production output, sitemap, and pages reachable from internal links. Mark each source and discrepancies; do not assume link crawling alone is complete.
3. Classify pages as public/published, draft/noindex, blocked, utility, or unknown based on explicit project metadata. Verify whether drafts can be reached or indexed.
4. Record the initial Git status, existing tests, and baseline build/preview results before any repair.
5. Use the project's declared package manager and runtime. Never run `npm install`, upgrade dependencies, weaken checks, delete tests, deploy, change DNS, or modify live settings. Use production build and production preview, not the development server. Record the actual preview address and close any service started by this skill.

If the project has no production preview command, no usable browser capability, or a required command cannot run, record the limitation and continue independent checks. Do not install tools without explicit authorization.

## 3. Run the acceptance checks

Read `references/audit-method.md` for the detailed method and `references/severity-and-disposition.md` for severity and launch rules. At minimum:

- Run the existing typecheck, lint, test, and production build commands where defined; report unavailable commands as `NOT CONFIGURED`, not passed.
- Inspect all inventoried public pages against production preview. Inspect desktop and 390px mobile; inspect 360px and 768px on the home page and key content page. Capture screenshots and console/network errors when browser tooling permits.
- Check every internal navigation, button destination, fragment, internal link, external link, and important redirect. Record rate limits, login walls, and network restrictions without repeated retries.
- Inspect About, Contact, Privacy, Disclaimer, and 404 pages when present. Never invent operator, contact, legal, privacy, ad-account, or hosting facts.
- Record each page's Title, Description, H1, target keyword, visible-body word count, target-keyword count, and approximate density. Use density only to spot absence or stuffing; do not impose a target percentage. Without Search Console or query/ranking evidence, call overlap a *potential keyword conflict*, never proven cannibalization.
- Verify content answers the page's search intent near the beginning. Do not write or “correct” game facts, codes, dates, prices, platforms, characters, enemies, mechanics, or values without verifiable project/source evidence.
- Check canonical, robots.txt, sitemap.xml, `noindex`, language, Open Graph, structured data, and old/local domains. Against the production preview, request `/robots.txt`, `/sitemap.xml`, and any sitemap index; record HTTP status and inspect the served bodies. Verify every sitemap `<loc>` uses the confirmed new-site canonical origin, resolves to an intended published page, and excludes source-template domains, localhost/preview URLs, drafts, and blocked routes. Verify each `Sitemap:` directive in robots.txt points to the new site's accessible sitemap and that crawl rules do not block intended published routes. Compare source, production output, `TEMPLATE_RESIDUE_SCAN.json`, and `CONTENT_PAGE_MANIFEST.json`; report source routes that remain only when valid for the new site.
- Check responsive overflow, text clipping, overlap, image distortion, tables, code blocks, long URLs, dynamic content, menu behavior, favicon, logo, keyboard access, focus, alt text, form labels, contrast, and touch targets. These are observations for the UI/UX handoff when visual/interaction fixes are needed.
- Check console errors, failed/404 resources, image dimensions/lazy loading, and obvious performance risks. Local checks are not a substitute for field performance data.
- Scan current workspace files and Git-tracked files for sensitive filenames and common credential patterns. Never print full secret values; report only redacted path and finding type. State that this does not cover Git history, cloud environment variables, GitHub Secrets, or a penetration test.
- Scan for old game/brand/domain strings, absolute URLs, old route paths, demo content, placeholder text, TODOs, empty modules, duplicate content, invalid links, and mismatch with approved content provenance. Use `TEMPLATE_RESIDUE_SCAN.json` and `CONTENT_PAGE_MANIFEST.json` as candidate evidence when present. Distinguish allowed source/template attribution from user-facing residue; do not treat every shared template code or layout as duplicate content.

Do not fabricate findings to fill a checklist. Mark checks as `PASS`, `FAIL`, `BLOCKED`, `NOT CONFIGURED`, or `NOT APPLICABLE`, with evidence and scope.

## 4. Repair policy

In `audit-only`, stop after evidence collection and recommendations. In `audit-and-repair`, first complete and save the baseline report, then repair only confirmed P0/P1 defects that are within the user's explicit scope and can be fixed without inventing facts or changing the approved product direction. Make small, reviewable changes. Do not alter page architecture or visual direction merely to improve taste scores.

Never automatically fill uncertain game facts, legal/compliance statements, business/operator identity, contact channels, rights complaint channels, privacy retention, hosting/logging, official media provenance, domain, ad setup, or analytics credentials. Record these as blockers for human confirmation.

After changes, rerun the production build and relevant tests, inspect the affected production-preview pages and viewports, verify repaired routes/links/SEO behavior, and record before/after status. If a P0/P1 cannot be safely repaired or cannot be retested, keep it open.

## 5. UI/UX handoff

Create `UI_UX_HANDOFF.md` when there are confirmed visual, responsive, navigation, interaction, accessibility, layout, or ad-placement issues. This handoff is for the dedicated `game-site-ui-ux-audit-optimizer` skill. Include issue IDs, page, viewport, severity, screenshot path, reproduction steps, measured evidence, and a bounded recommended scope. Recommend calling that skill for UI/UX P0/P1; make P2 handoff optional. Do not duplicate its redesign/audit workflow here.

## 6. Deliverables and conclusion

Write one run directory under `<project>/docs/prelaunch/<run-id>/` containing:

- `PRELAUNCH_ACCEPTANCE_REPORT.md` — human-readable summary, page inventory, findings, repairs, manual confirmations, checks and launch decision.
- `PRELAUNCH_ACCEPTANCE.json` — machine-readable pages, per-check status, findings, page TDH/keyword table, and final disposition.
- `REPAIR_MANIFEST.md` — files changed and validation evidence; include even when no repairs were made.
- `UI_UX_HANDOFF.md` — only when handoff findings exist.
- `screenshots/` — desktop/mobile evidence, named by route and viewport.

Follow `references/report-contract.md`. Preserve the baseline findings and do not overwrite prior runs. The report must state coverage limitations and unresolved facts/media gaps.

Use exactly one final disposition:

- `可以上线` — no open P0/P1/P2 and all required checks passed.
- `可以上线，但有P2待办` — no open P0/P1; only P2 items remain.
- `完成指定修复后可上线` — the only remaining gate is a specific, bounded repair or human confirmation; list it explicitly.
- `暂不建议上线` — any open P0/P1, failed critical check, or material coverage gap prevents a supported launch decision.

Do not call the site ready just because the build passes. Summarize pages checked, P0/P1/P2 counts, repairs, manual confirmations, TDH/keyword coverage, build and mobile retest results, and the reason for the disposition.
