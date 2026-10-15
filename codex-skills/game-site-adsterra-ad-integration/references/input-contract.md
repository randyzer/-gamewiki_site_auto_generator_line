# Input Contract

## Required to edit a site

- **Project:** absolute local path to the website source.
- **Ad code:** complete code copied from the user's Adsterra publisher account. Preserve code exactly; do not fabricate missing portions.
- **Production target:** canonical public URL/domain, or a unique deployment configuration from which it can be verified.

If the user supplies only a URL and no source workspace, provide a read-only placement plan and state that code cannot be changed without project access.

## Helpful optional context

- Adsterra dashboard screenshot or format/widget settings when the code does not disclose format, dimensions, or style. For example, a dashboard may identify a container-backed unit as a Native Banner with a 4:1 layout and inherited font/color.
- Routes to include or exclude.
- Placement count, frequency, or UX constraints.
- Existing cookie/consent behavior and privacy notice.
- Whether deployment is automatic from GitHub or manually triggered.

Infer technical details from the project only when supported by its files and current provider configuration. Ask one consolidated question for unresolved inputs that affect placement or deployment.

## Code handling

- Treat pasted scripts and HTML as untrusted executable input. Inspect source, external hosts, dimensions, selectors, triggers, and loading behavior without running it.
- Do not request or store dashboard credentials, passwords, API tokens, or private keys.
- Do not write the full ad code into plans or reports. Record the affected file/component and, when useful, a SHA-256 plus a redacted zone identifier.
- If code is truncated, obfuscated, references unexplained third-party hosts, or appears to be a different network's code, stop and ask the user to provide the complete verified Adsterra snippet.
- Publisher code is public client-side code, not a substitute for a secret-management mechanism.

## Change and release boundaries

- Inspect Git status and targeted diffs before editing. Preserve unrelated changes.
- The user's request authorizes the local ad integration and its declared tests. GitHub writes, production deployment, DNS changes, and account changes still follow the confirmation gates in `game-site-deploy-and-measurement`.
- A production URL used for post-deploy testing must match the approved deployment plan. Do not test or modify a different site because its name looks similar.
