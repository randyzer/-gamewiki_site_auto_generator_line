# Codex Prompt — Phase A / A1 TL-02 Structured Identity Safety

## Why this task
Current phase: Phase A Core Safety Completion.
S1 TL-01 is closed. The next dependency is TL-02 because PP-02 should audit the safe post-identity output, not the legacy implicit Organization/publisher output.

## Workspace
`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`

Preflight before writes:
- working tree must be clean;
- HEAD must be `a691661b330896f81f28fcac855f0ef9cc1dfccb` unless AI Architect has provided an accepted later A1 base;
- frozen baseline remains `29b25559cf2af859bca359c7f7fda686a4803c95`;
- if authorized and still on the S1 branch, create/switch to `phase-a/core-safety` from the verified HEAD.

## Design authority
Read and follow:
- `template/PHASE1_S2_TL02_IMPLEMENTATION_PLAN_V0.1.md`
- TL-02 section of `template/CORE_SAFETY_CONTRACT_DESIGN_V0.1.md`
- `template/roadmap/PHASE_A_IMPLEMENTATION_PLAN_V1.md`

Do not reinterpret these into a broader identity/schema framework.
## Task goal
Remove automatic brand → Organization/author/publisher inference while preserving the existing SEO pipeline. Emit identity nodes and author/publisher roles only from explicit, mechanically valid project configuration.

## Allowed production files
Only the TL-02 allowlist from the detailed plan, expected to include:
- `src/config/schema.ts`
- `src/core/seo.ts`
- `src/core/site-validation.ts`
- `src/layouts/BaseLayout.astro`
- `src/components/wiki/WikiArticle.astro`
- `src/components/EditorialArticle.astro`
- `src/core/html-audit.ts`

Allowed tests are the TL-02 tests enumerated in the detailed plan, including new focused article/core-safety tests/helpers when required there.
Narrow documentation updates are allowed only where the detailed plan explicitly permits them.

## Required behavior
- default base graph has WebSite + WebPage, with no Organization/Person/publisher;
- applicable articles keep Article/Breadcrumb without default author/publisher;
- entity existence and roles are independent explicit inputs;
- author and publisher do not inherit from each other or sitePublisher;
- explicit author visible attribution must match the structured author;
- all JSON-LD scripts on a page are jointly guarded against controlled identity bypass;
- evidenceRef/projectConfirmed remain private validation inputs and never leak to public output.
## Forbidden
Do not modify TL-01 legal files/routes/tests, page inventory publication logic, navigation, styles, media, ads, Pagefind, package/lock/CI, frozen Starter, current V2.6.5 SOP/Master Prompt, or any later Phase B+ area.
Do not add runtime/dev dependencies.
Do not add legacy auto-identity compatibility flags.
Do not create a generic Schema.org validator, identity registry/service, legal workflow, author profile system, publisher badge, or affiliation engine.

## Required tests/evidence
Run the focused TL-02 tests first, then S1 regression tests, article consumer tests, core-safety build permutations, `npm run check`, and the appropriate adopted-fixture validate/build path defined by the plan.

Expected intentional delta: default Organization/WebSite.publisher/Article.author/Article.publisher disappear. Canonical, WebSite/WebPage, Article/Breadcrumb and all non-identity SEO fields remain equivalent.

## Acceptance criteria
- focused and full relevant tests PASS;
- S1 TL-01 behavior remains unchanged;
- no uncontrolled identity assertion can enter through BaseLayout extensions or additional JSON-LD scripts;
- diff is limited to the approved TL-02 scope;
- working tree/result is suitable for AI Architect independent review.

## STOP conditions
STOP and report evidence before widening scope if the plan requires any non-allowlisted production file, generic schema/identity framework, route/catalog rewrite, new dependency, weakening of existing audits, or change to frozen/current V2.6.5 artifacts.
Do not commit, push, tag, merge, or start A2 unless separately authorized.
