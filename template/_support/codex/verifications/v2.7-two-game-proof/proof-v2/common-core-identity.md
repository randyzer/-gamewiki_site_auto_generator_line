# Common Core Identity — Fresh v2 PLAN41

Date: 2026-10-08. Source: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE

Branch: v2.7/evolution
HEAD: b067e8d4050478072f25a1dc78a8526cdd128cfd
HEAD tree: 1df0ade30b1eaf51a76820c8d8b83337786f0dc1

HEAD alone is not the source identity: current working-tree edits/untracked runtime files and independently accepted PLAN40 six-file increment are included. Independent authority: ../../../executions/v2.7-two-game-proof/iteration41/chatgpt-plan.md (REVIEW40). Exact repair evidence: iteration40/approved-scope.patch and source-identity-after.json. No other accepted-source drift detected.

Current working diff summary:
```text
 .github/workflows/ci.yml                  |  15 +++-
 .gitignore                                |   1 +
 README.md                                 |  87 +++++++++++++++++++++
 docs/CONTENT_AND_DATA_GUIDE.md            | 126 ++++++++++++++++++++++++++++--
 docs/PP02_PRODUCTION_RESIDUE.md           |  19 ++++-
 docs/QA_CHECKLIST.md                      |  72 +++++++++++++++++
 docs/media/README.md                      |  94 ++++++++++++++++++++--
 package-lock.json                         |  30 +++++++
 package.json                              |   7 +-
 scripts/audit-build.ts                    |   8 ++
 scripts/core-safety-sentinels.ts          |   2 +-
 scripts/media-validation.ts               |  61 ++++++++++++++-
 scripts/normalize-pagefind-output.ts      |  17 ++--
 src/components/EditorialArticle.astro     |  15 ++--
 src/components/EntityDetail.astro         |   4 +-
 src/components/LegalPage.astro            |   2 +-
 src/components/islands/SearchIsland.tsx   | 123 +++++++++--------------------
 src/components/media/GameMedia.astro      |   7 +-
 src/components/media/VideoEmbed.astro     |   9 ++-
 src/components/navigation/MobileNav.astro | 100 ++++++++++++++++++++----
 src/components/wiki/Sources.astro         |   9 +--
 src/components/wiki/WikiArticle.astro     |  19 +++--
 src/config/schema.ts                      |   8 ++
 src/core/search-state.ts                  |  24 ++++++
 src/core/seo.ts                           |  13 +++
 src/core/static-page-copy.ts              |  11 +--
 src/data/media/catalog.ts                 |  12 +++
 src/data/schemas/media.ts                 |  52 +++++++++++-
 src/data/schemas/page-inventory.ts        |   7 ++
 src/layouts/BaseLayout.astro              |  23 +++++-
 src/pages/index.astro                     |   2 +-
 src/styles/global.css                     |  58 ++++++++++----
 src/styles/theme.css                      |  67 ++++++++++++++++
 tests/config.test.ts                      |  38 +++++++++
 tests/core-safety-sentinels.test.ts       |  52 ++++++++++--
 tests/editorial-article.test.ts           |  23 ++++++
 tests/helpers/core-build-fixture.ts       |  91 ++++++++++++++++-----
 tests/homepage.test.ts                    |  11 +++
 tests/media-audit.test.ts                 |  76 ++++++++++++++++--
 tests/media-build.test.ts                 |  64 ++++++++++++++-
 tests/media-rendering.test.ts             |  46 ++++++++++-
 tests/media.test.ts                       | 100 ++++++++++++++++++++++++
 tests/navigation-behavior.test.ts         | 123 +++++++++++++++++++++++++++--
 tests/navigation.test.ts                  |   3 +
 tests/pagefind-artifacts.test.ts          |  17 ++++
 tests/player-facing-metadata.test.ts      |  15 ++++
 tests/release-identity.test.ts            |   9 +++
 tests/residue-build.test.ts               |   8 +-
 tests/runtime-contract.test.ts            |  31 ++++++++
 tests/search-state.test.ts                |  34 ++++++++
 tests/seo.test.ts                         |  14 +++-
 tests/static-page-copy.test.ts            |   9 ++-
 tests/theme.test.ts                       |  82 +++++++++++++++++++
 tests/wiki-article.test.ts                |  23 ++++++
 54 files changed, 1745 insertions(+), 228 deletions(-)
```

Active untracked files:
```text
docs/CORE_BROWSER_EVIDENCE.md
scripts/core-browser-evidence.ts
scripts/core-browser-matrix.ts
scripts/run-core-browser-evidence.ts
scripts/verify-adoption.ts
scripts/verify-ws06a-browser-closure.ts
src/core/freshness.ts
src/core/media-presentation.ts
src/core/pagefind-search-adapter.ts
src/core/theme-roles.ts
tests/core-browser-evidence.test.ts
tests/freshness.test.ts
tests/pagefind-search-adapter.test.ts
tests/ws06a-browser-closure.test.ts
```

Full project snapshot copied using exclusions only: .git, node_modules (separate installed snapshot), dist/.astro/caches, .env/secrets, .vercel/.c2c and OS metadata. Source .github included unchanged. No credential file inspected or copied. Historical source archive files are included unchanged but are not active proof authority.

Dependency physical copies derive from one installed Candidate snapshot; relative bin links remain within each root. No shared writable directory, external dependency link, install/upgrade or package/lock mutation. Existing Node22.22.0 matches .nvmrc/engines.

The old v1 proof and iteration38–40 failures/results are frozen; nothing overwritten. Product inputs not yet applied; common check results will be appended.

## PLAN41 actual qualification and adaptation

Fresh common `npm run check`: PASS; 48 files / 859 tests; Astro 0 errors/warnings/hints. Both exact evidence builds PASS, each with 5 actual HTML routes and output audit PASS. Both dependency/lock baselines unchanged.

Shared/source mechanism delta = 0 across common/BF/WoG, including the three About production files and all tests. BF differences exactly BF10; WoG exactly WoG8. Theme selectors/property declarations unchanged; values only. No MDX import/export or dedicated Pattern runtime.

PLAN41 section 13 says "nine present" BF files; its exact10 allowlist actually contains **8 present / 2 deletions**. All eight present inputs byte-match frozen iteration39 BF, and both deletions match; no ninth input invented. BF reuse preserves the earlier adoption-document context verbatim, including its historical PLAN38/39 reference; the current accepted About repair and v2 build result supersede that old blocker only in current evidence, never by rewriting history.

Generated `dist` trees mirrored byte-for-byte to `outputs`; EVIDENCE_BUILD_NOT_FINAL remains present. This is not a final-purpose build/release.
