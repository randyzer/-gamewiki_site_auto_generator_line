# Input Contract

## Information needed to start project inspection

The user does not need to choose a hosting provider before architecture detection. Resolve these inputs from the request and workspace:

- **Project identity:** one absolute local project path, or the GitHub repository URL. If both are supplied, verify they refer to the same project and commit.
- **Release branch:** the branch intended for production, if known. Record the current commit, working-tree state, GitHub remote/upstream, and ahead/behind/diverged status; ask if multiple branches are plausible.
- **GitHub changes:** if local source changes need to be committed or pushed, identify the exact files and intended commit message. The deployment-plan confirmation must explicitly authorize that GitHub write.
- **Production domain:** the purchased domain and intended canonical origin, including whether apex or `www` should be canonical.
- **Domain and DNS control:** registrar (where the domain was purchased), current authoritative DNS provider (derive from nameservers when possible), and whether the user can authorize DNS changes. Registrar and DNS host are separate inputs.
- **Current live state:** whether this domain already serves a site, uses email or other subdomains, and whether a deployment/cutover window is required.
- **Budget preference:** whether to stay within free plans, an approximate monthly limit for paid services, or whether no paid resource may be created without a separate approval.

If one of these details can be established safely from the project or read-only account inspection, record the evidence instead of asking again. Do not require GitHub, Vercel, Cloudflare, GSC, or GA4 authorization before producing the architecture assessment and draft plan.

## Account access needed only after provider selection and plan approval

Request only the access required by the approved plan:

- **GitHub:** read access to inspect the target repository and upstream. If local changes need a commit/push, the user must approve the exact reviewed files, commit message, remote, and branch in the deployment plan. If a Git integration or CLI needs authorization, scope it to the target repository when possible. `gh auth login` is only needed for GitHub CLI operations; it is not a universal deployment prerequisite.
- **Hosting:** access to the selected Vercel or Cloudflare account/team and permission to create or update the named project. Cloudflare Git integration authorization and Wrangler CLI authorization are separate. Do not request both unless the approved workflow needs both.
- **DNS:** access to the current DNS provider to add or update only the records listed in the plan. Changing nameservers requires separate explicit confirmation and a record migration plan.
- **Google Search Console:** a Google account with access to the existing Domain property, or permission to create and verify one. DNS TXT verification requires DNS edit access. Reuse a verified property when appropriate.
- **GA4:** a Google account with access to the existing property/data stream, or permission to create them. The GA4 Measurement ID is a public identifier, not an account password or API secret.

The user signs in and completes OAuth/consent prompts in the relevant provider flow. Never ask for passwords, recovery codes, OAuth tokens, API tokens, private keys, or full credential values in chat.

## Upstream release artifacts

Read the latest matching-commit versions when present:

- `docs/CONTENT_INTEGRATION_REPORT.md`
- `docs/CONTENT_PAGE_MANIFEST.json`
- `docs/TEMPLATE_RESIDUE_SCAN.json`
- `docs/UI_UX_HANDOFF.md` or the UI/UX audit report
- `docs/PRELAUNCH_ACCEPTANCE.json`
- `docs/PRELAUNCH_ACCEPTANCE_REPORT.md`

Require a prelaunch disposition that permits release. If the report refers to an older commit or predates later changes, rerun the prelaunch gate. If the disposition blocks release, do not bypass it.

## Information to verify during inspection

Before presenting the plan, establish or clearly mark as unknown:

- Framework, package manager, runtime, build command, output directory, required bindings/environment variables, and static/server features.
- Repository visibility, production branch, latest commit, and local changes.
- Hosting account/team/project, if an existing one is to be reused.
- Current nameservers and DNS records, existing production host, email records, redirects, and certificate status.
- Canonical origin, sitemap URL, robots directives, published route set, and old-template residue status.
- GSC property and sitemap state; GA4 property, Web stream, existing tag, and Measurement ID state.
- Privacy-policy status and any analytics disclosure/consent requirement already identified by the project's prelaunch review.
- Current pricing/quotas and whether the planned deployment could exceed the user's budget preference.

Do not guess missing domain, account, runtime, or cost information. Put unresolved values and their effect into the deployment plan.

## Missing or ambiguous inputs

- If multiple projects, domains, production branches, registrars, DNS providers, or hosting accounts are plausible, ask which one to use.
- If the canonical origin is not confirmed, do not bind a domain, create a GSC Domain property, or publish absolute SEO URLs.
- If permission to inspect a private repository or account is unavailable, provide the exact least-privilege authorization needed.
- If DNS records or current hosting cannot be identified safely, do not replace them; report the uncertainty and its consequences.
- If user cost preference is unknown and the plan may create a paid resource, show the likely cost/plan and wait for explicit confirmation.
- If the prelaunch disposition blocks release, do not bypass it based on a deployment request.
