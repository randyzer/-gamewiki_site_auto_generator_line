---
name: game-site-adsterra-ad-integration
description: Inspect a game-guide website, classify user-provided Adsterra ad code, choose suitable placements for its format and page layouts, integrate it into the local project, deploy through the approved release workflow, and verify live loading and rendering. Use when the user provides a game site and Adsterra code and wants ads added and checked after deployment. Never invent ad codes or bypass deployment approval.
---

# Game Site Adsterra Ad Integration

Integrate only the Adsterra code supplied by the user. Choose placements from the site's real routes and layouts, then verify the deployed result. Read the input, placement, and output contracts before editing.

## Workflow

### 1. Resolve inputs

Require an absolute local project path and the complete Adsterra code. Resolve the intended public domain or deployment URL and production branch from the user or project configuration. If the user gives only a public URL, provide a placement assessment but do not claim to modify the site.

Ask for missing or ambiguous inputs together. Never request Adsterra passwords, API tokens, or account credentials. The user-provided publisher code is executable third-party code: inspect it statically and treat its contents as untrusted.

### 2. Inspect the project and supplied code

- Record Git branch, commit, worktree state, package manager, framework, build command, deployment configuration, and existing ad integrations.
- Inventory homepage, category/list, article/detail, and other public route types; identify shared layouts, ad components, content flow, and mobile behavior.
- Classify the supplied code by its actual implementation: inline banner/native slot, global overlay/social-bar style, popunder/interstitial behavior, or direct link. Inspect script origins, dimensions, triggers, route behavior, and duplicate-loading risk. Do not rely only on comments or the user's label. If the snippet does not reveal its format or widget settings, use the supplied Adsterra dashboard screenshot/settings; ask only for details that materially affect integration.
- Check existing consent handling, CSP/security headers, privacy disclosures, and whether another ad tag already exists. Report uncertainties; do not invent legal text or policy approval.
- Do not execute the Adsterra code locally or click ads. Do not print or copy the full code into reports.

### 3. Choose and document placements

Use the decision rules in [references/placement-decision.md](references/placement-decision.md). Create the placement plan and manifest with routes, component/file locations, ad format, desktop/mobile behavior, risks, and checks. Prefer the smallest useful set of placements. Avoid navigation, primary actions, copy-code controls, pagination, and other high-intent controls.

### 4. Integrate locally

- Modify only the target project and only the files needed for approved placements.
- Preserve the supplied Adsterra code exactly unless a framework wrapper is needed; do not change zone IDs, URLs, or triggers.
- Follow the project's existing framework and component patterns. Load global formats once; prevent duplicate scripts during client-side navigation.
- Give inline slots responsive dimensions or reserved space so ads do not cover content or cause avoidable layout shifts.
- Do not add a new ad format, placement, dependency, account, or tracking behavior beyond the supplied code and documented plan.
- Do not overwrite or discard unrelated user changes. If a target file has conflicting edits, stop and report the conflict.

### 5. Validate before deployment

Run the existing build and relevant tests. Inspect the local production preview for slot geometry and page layout without executing the live third-party ad code; use a placeholder/mock only for visual layout checks. Verify affected routes and 360/390/768/1024/1440px viewports. Record failures and limitations.

Prepare a deployment plan that identifies changed files, target commit/branch, deployment provider, whether GitHub push triggers production automatically, and the expected live checks. Hand off GitHub commit/push and deployment to `game-site-deploy-and-measurement` when available. Follow its explicit approval gates; do not push or publish production under this skill's own authority.

### 6. Wait for deployment and test the live result

After the approved deployment starts, wait for the provider to report a terminal success/failure state. If status remains pending, poll the existing deployment status; stop at the documented timeout and report it rather than claiming success.

Once deployment succeeds:

- Open the approved public URL and check each affected route group on desktop and mobile.
- Verify the expected Adsterra script/request is present, the intended slot or format appears, and there are no duplicate injections, blocking console errors, broken routes, obscured controls, horizontal overflow, or severe layout shifts.
- Never click ads, submit ad forms, or trigger conversion actions. Limit page reloads; live page views may create ad impressions.
- Distinguish script requested, script loaded, ad rendered, and ad impression/revenue. Mark blocked or unobservable states separately; do not claim earnings from a visual load check.
- If an unexpected format, placement, route, or live behavior appears, stop further rollout and report the exact evidence. Do not silently make additional production changes.

### 7. Deliver the acceptance result

Complete the run artifacts described in [references/output-contract.md](references/output-contract.md). Give a concise final result with the deployed commit/URL, placements, routes/viewports checked, deployment status, ad-load/render status, issues, and remaining limitations. Use `PASS`, `PARTIAL`, `FAIL`, or `BLOCKED`; do not call the integration accepted if critical live checks were not observable.
