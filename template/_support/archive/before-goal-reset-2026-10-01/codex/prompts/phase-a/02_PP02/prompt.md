# Codex Prompt — Phase A / A2 PP-02 Production Residue Safety

## Why this task
Current phase: Phase A Core Safety Completion.
A2 runs only after A1 TL-02 is accepted. Its job is to block known Starter adoption residue from final production inputs/output without becoming a generic content-quality engine.

## Workspace
`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`

Preflight before writes:
- branch must be the accepted Phase A implementation branch;
- working tree must be clean;
- HEAD must equal the AI Architect-accepted A1 result;
- frozen V2.6.5 baseline and current V2.6.5 SOP/Master Prompt remain read-only.

## Design authority
Read and follow:
- PP-02 section of `template/CORE_SAFETY_CONTRACT_DESIGN_V0.1.md`
- PP-02/S3 sections of `template/PHASE1_CORE_SAFETY_IMPLEMENTATION_CANDIDATE_PLAN_V0.1.md`
- `template/roadmap/PHASE_A_IMPLEMENTATION_PLAN_V1.md`

If these conflict with observed post-A1 code, STOP with concrete evidence rather than redesigning the architecture.
## Task goal
Add a small deterministic Core sentinel/adoption gate that recognizes only Core-owned known residues and verifies both production-bound inputs and enumerated generated surfaces.

## Allowed scope
Use only the S3/PP-02 file boundary in the corrected Phase1 safety plan. Expected areas include:
- a small Core sentinel tooling module under `scripts/`;
- narrow `gameConfigSchema` additive sentinel inputs, if required by the approved design;
- existing content/output/Pagefind/audit/build plumbing needed for enumerated coverage and final/evidence purpose propagation;
- shared neutral temporary build-fixture helper used by Core safety tests;
- focused PP-02 tests and required updates to existing build/audit/Pagefind tests;
- migration of the developer-only media README out of `public/` plus only its direct documentation/test references.

Do not use the allowlist as permission to refactor unrelated logic.

## Required behavior
- built-in sentinels cannot be disabled by project config;
- exact known `gameatlas.example`/Game Atlas/shipped instruction signatures are detected only in their defined scopes;
- final mode fails on applicable known residue;
- evidence mode may warn for ordinary sample brand/domain only, remains NOT FINAL, and never downgrades legal/identity/coverage errors;
- generated HTML/meta/URLs/JSON-LD/robots/sitemap/Pagefind/registered public text surfaces are checked through an explicit closed coverage map;
- missing/unreadable required coverage fails closed.
## Forbidden
Do not add broad repository grep as the production gate, fuzzy matching, arbitrary regex/glob rules, AI content linting, trademark/fact checking, project-wide allowlists, generic decompression/parsing frameworks, provider-neutral search redesign, or Release Governance.
Do not alter TL-01/TL-02 semantics to make residue tests pass.
Do not modify current/frozen V2.6.5 SOP or Master Prompt.
Do not add Playwright/browser dependencies yet.

## Required tests/evidence
Run focused sentinel/Pagefind/html-audit tests, core-safety/media/evidence build tests, source/output coverage negatives, and full `npm run check`.
Prove:
- ordinary nearby strings/hostnames/docs/drafts do not false-positive;
- source pass cannot waive stale generated residue;
- unadopted shipped sample intentionally fails final adoption checks;
- neutral adopted fixture can run canonical final validate/build without Playwright/browser tooling;
- developer media README no longer ships publicly, while its historical residue signature remains detectable if reintroduced to a real public surface.

## Acceptance criteria
All required PP-02 evidence passes, prior TL-01/TL-02 and proven V2.6.5 mechanisms remain green, and no required output surface is silently skipped.

## STOP conditions
STOP if a required Pagefind/public-text surface cannot be deterministically mapped with the bounded adapter, if completing the task requires a generic scanner/parser or production exception framework, or if any pre-existing technical gate must be weakened.
Do not commit, push, tag, merge, install A4 browser tooling, or start A3 unless separately authorized.
