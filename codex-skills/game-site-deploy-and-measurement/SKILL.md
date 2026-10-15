---
name: game-site-deploy-and-measurement
description: Inspect a game-guide website project, check local changes and GitHub synchronization, choose a compatible hosting provider, prepare a deployment plan for confirmation, then commit/push approved code, deploy, and configure Google Search Console (GSC) and Google Analytics 4 (GA4). Use when a game site is ready to publish, migrate hosting, bind a production domain, submit a sitemap, or verify analytics. Never commit, push, or deploy before the user confirms the concrete plan.
---

# Game Site Deploy and Measurement

Inspect the project first, recommend a deployment path from its actual architecture, and wait for the user's confirmation before production deployment or external account changes.

Read [references/input-contract.md](references/input-contract.md), [references/provider-selection.md](references/provider-selection.md), and [references/output-contract.md](references/output-contract.md).

## Workflow

### 1. Resolve the project and upstream release gate

- Resolve one absolute project workspace. Do not scan unrelated projects.
- Do not require the user to choose Vercel or Cloudflare before architecture inspection. Recommend the provider from project evidence.
- Do not request provider or Google-service authorization up front. First produce the inspection and proposed plan; request only the authorization needed for the approved plan.
- Read the latest content integration, UI/UX, and prelaunch reports when present.
- Require a prelaunch disposition that permits release. If the report is missing, stale, incomplete, or says not to launch, stop and run or request the prelaunch gate first.
- Confirm the intended production origin from the approved site configuration and reports. Do not infer it from a template, repository name, or provider account.
- Record current Git branch, HEAD commit, working-tree state, upstream branch, and whether the local branch is ahead, behind, or diverged from GitHub. Inspect staged, unstaged, and untracked changes before proposing any commit. Do not deploy unexplained or unreviewed changes.

### 2. Inspect and test without changing production

- Identify framework, package manager, build command, output directory, server-side features, deployment configuration, required environment variables, and repository provider.
- Check whether the site is static or needs runtime/server features. Follow the provider decision rules in the reference.
- Run the documented production build and local production preview when available. Do not deploy production during this inspection.
- Inspect existing domain DNS records, redirects, and current hosting only as needed. Never delete DNS records or change nameservers during discovery.
- Confirm that production robots.txt, sitemap, canonical origin, and published route inventory agree with the approved reports. Use the residue scan from the template selector and the integrator report where available.

### 3. Prepare a concrete plan and request confirmation

Write `docs/DEPLOYMENT_PLAN.md` and `docs/DEPLOYMENT_PLAN.json`. Include:

- Project path, repository, branch, commit, and Git status.
- Detected framework/runtime requirements, build command, output directory, and test results.
- Recommended provider and why it supports this exact project; include one viable fallback if needed.
- Provider account/team and proposed project name, if known.
- Production domain, canonical host, redirect behavior, and the exact DNS records or nameserver changes required.
- Required environment variables, distinguishing public identifiers such as GA4 Measurement ID from secrets.
- Proposed GSC property, sitemap URL, GA4 property/data stream, and any user actions or permissions required.
- Costs or plan limits that can be confirmed from current provider/account information; label unknown costs as unknown.
- GitHub synchronization plan, if needed: exact files to include, excluded unrelated/secret/generated files, target repository and branch, current remote state, proposed commit message, push destination, and whether that push triggers an automatic deployment.
- Risks, rollback approach, and what will change in Git, hosting, DNS, Google services, and the production site.

Present the plan to the user and wait for explicit confirmation before committing or pushing code to GitHub, production deployment, creating or changing provider resources, modifying DNS/nameservers, creating Google properties, submitting sitemaps, or requesting indexing. The confirmation must clearly cover the listed Git files, target branch/remote, and any automatic deployment triggered by the push. Do not treat a general request to “deploy” as approval of undisclosed GitHub, DNS, or account changes.

If the user declines or changes the plan, revise it and wait again. If execution reveals a material difference from the approved plan, pause and present the changed scope before proceeding.

### 4. Synchronize the approved code with GitHub

- If the working tree is clean and the intended production branch is already synchronized with its verified upstream, record that no commit or push is needed.
- If the working tree is clean but the local branch is ahead, inspect every unpushed commit and its diff. Propose pushing those existing commits; do not create a duplicate commit.
- If uncommitted changes are pending, review the complete diff and status. Stage only the approved project files; never use `git add .` or `git add -A` as a shortcut. Exclude secrets, `.env` files, credentials, build output, caches, and unrelated changes.
- Run the required checks against the exact candidate source. Inspect the staged diff again for accidental files or secrets before committing.
- Confirm that the repository remote and target branch are the intended GitHub repository and production branch. Fetch/read remote state when available. Stop if the branch is behind, diverged, lacks a verified upstream, or the GitHub identity/remote cannot be established; do not resolve with a force push, history rewrite, merge, or rebase without a revised approved plan.
- Commit and push only after the plan confirmation explicitly covers the reviewed file list, commit message, remote, branch, and push. Never force-push, rewrite history, or push tags.
- Check whether pushing the target branch automatically deploys production. If so, treat the push as a production-affecting action and ensure the approved plan and release gate cover that effect; do not push before all required prelaunch checks pass for the exact candidate tree/commit.
- Verify the resulting local and remote commit IDs. If the push changes the planned source, triggers an unexpected deployment, or leaves the release report stale, stop and update the plan before continuing. If a required gate report is not valid for the candidate commit, rerun that gate; if it blocks release or requires source changes, do not proceed under the old approval.

### 5. Execute the confirmed deployment

- Use the approved provider, repository, branch, build settings, and domain only.
- Use the provider's documented Git integration or CLI workflow. Verify GitHub and hosting authorization independently; request least-privilege access to the target repository.
- Keep credentials in the user's authenticated local/provider session or the provider's secret store. Never ask the user to paste passwords, OAuth tokens, API tokens, or private keys into chat.
- Deploy a preview first when supported, then check route coverage, redirects, assets, and runtime behavior.
- Apply only the approved DNS changes. Preserve unrelated records, including email and verification records. If a conflicting record or unexpected nameserver change is discovered, stop and re-plan.
- Deploy production only after the confirmation gate in Step 3. Verify provider deployment status, HTTPS, canonical host redirects, and all expected published routes.

### 6. Configure GSC and GA4

- Reuse existing properties when appropriate; do not create duplicates without checking.
- Verify the exact production domain property. Prefer DNS TXT verification when setting up a Domain property; add the record without overwriting unrelated DNS records.
- Submit the sitemap only after its production URL is accessible and its URLs use the confirmed canonical origin and published routes.
- Use URL Inspection to live-test the homepage and a small set of priority pages. Request indexing only for the approved URLs. Record a request as submitted, never as proof of indexing.
- Create or select the GA4 property and Web data stream only within the confirmed Google account. Install the Measurement ID through the project's shared layout or equivalent supported integration; do not add a second tag if one already exists.
- Apply the tag through the approved deployment configuration, deploy the resulting change, and verify production data using GA4 Realtime or an equivalent official tag test.
- Do not claim the site is indexed merely because a request was accepted or a `site:` query returns results. Report GSC's observed status and when it was checked.

### 7. Verify production and report

- Recheck production page responses, canonical URLs, redirects, robots.txt, sitemap.xml, and the old-template identity/URL residue found in upstream reports.
- Confirm the served sitemap excludes draft/blocked routes and preview/local origins.
- Record actual GSC verification and sitemap submission status separately from indexing status.
- Record GA4 tag detection and incoming event status separately.
- Write the deployment report and update the plan with actual results, timestamps, deployed commit, DNS changes, unresolved items, and rollback instructions.
- Never claim that deployment alone proves SEO readiness, indexing, or analytics collection.
