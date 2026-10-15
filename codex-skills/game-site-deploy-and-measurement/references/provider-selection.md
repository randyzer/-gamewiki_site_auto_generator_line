# Provider Selection

Choose from inspected project evidence. Do not select a provider solely from the site being described as a “content site” or from a preference in an old template.

| Detected project shape | Primary recommendation | Required checks |
|---|---|---|
| Static HTML, Vite, Astro, or a framework build that emits complete static assets | Cloudflare Pages is a strong option; Vercel is also viable | Verify build command, output directory, client-side route fallback, asset paths, and static sitemap generation |
| Next.js configured for static export with no required server runtime | Cloudflare Pages or Vercel | Verify export compatibility, image handling, dynamic routes, and generated output; do not assume `next build` alone creates the correct Pages artifact |
| Next.js requiring SSR, Server Actions, middleware, route handlers, or other runtime behavior | Vercel by default, or Cloudflare Workers only when the project's adapter/runtime is verified | Run a production build and preview on the selected runtime; Pages static hosting is not sufficient |
| Other server-rendered or backend-dependent app | Provider that supports the detected runtime | Identify runtime, storage, bindings, secrets, and cost before recommending |

## Decision rules

1. Prefer the simplest provider that fully supports the checked-in project and its required features.
2. Treat Cloudflare Pages, Cloudflare Workers, and Vercel as distinct deployment targets with different build/runtime settings.
3. Do not add D1, R2, Workers, or other services unless the project has a concrete requirement for them.
4. Do not claim “zero cost.” Identify the current plan, quotas, domain cost, and any paid services; if account-specific pricing is unknown, say so.
5. Do not assume the nameserver must move to Cloudflare. If it must, inventory existing DNS records first and state the effect on mail, verification records, subdomains, and other services.
6. Do not prescribe a fixed apex-to-www or www-to-apex redirect. Use the confirmed canonical origin and ensure the alternate host redirects once without a loop.
7. Do not copy DNS records from another provider's deployment instructions. Read the selected provider's current project-specific domain requirements.
8. For a Cloudflare Pages custom domain, add the domain to the Pages project using the provider's supported flow, then verify DNS and TLS state.
9. For a Git-connected deployment, authorize only the intended repository when possible. GitHub CLI authorization, provider Git integration, and provider CLI authorization are separate capabilities.
10. Stop if the selected framework adapter, output directory, account permissions, DNS state, or expected cost cannot be established with evidence.
