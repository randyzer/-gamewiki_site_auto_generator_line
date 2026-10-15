# Common Core Identity — PLAN38

Source: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE

Branch: v2.7/evolution
HEAD: b067e8d4050478072f25a1dc78a8526cdd128cfd
Tree: 1df0ade30b1eaf51a76820c8d8b83337786f0dc1

Current accepted working tree, including active untracked source, copied once; HEAD alone is not this baseline.

Tracked working-tree change summary:

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
 scripts/media-validation.ts               |  61 ++++++++++++++-
 scripts/normalize-pagefind-output.ts      |  17 ++--
 src/components/EditorialArticle.astro     |  15 ++--
 src/components/EntityDetail.astro         |   4 +-
 src/components/islands/SearchIsland.tsx   | 123 +++++++++--------------------
 src/components/media/GameMedia.astro      |   7 +-
 src/components/media/VideoEmbed.astro     |   9 ++-
 src/components/navigation/MobileNav.astro | 100 ++++++++++++++++++++----
 src/components/wiki/Sources.astro         |   9 +--
 src/components/wiki/WikiArticle.astro     |  19 +++--
 src/config/schema.ts                      |   8 ++
 src/core/search-state.ts                  |  24 ++++++
 src/core/seo.ts                           |  13 +++
 src/data/media/catalog.ts                 |  12 +++
 src/data/schemas/media.ts                 |  52 +++++++++++-
 src/data/schemas/page-inventory.ts        |   7 ++
 src/layouts/BaseLayout.astro              |  23 +++++-
 src/pages/index.astro                     |   2 +-
 src/styles/global.css                     |  58 ++++++++++----
 src/styles/theme.css                      |  67 ++++++++++++++++
 tests/config.test.ts                      |  38 +++++++++
 tests/core-safety-sentinels.test.ts       |  17 ++--
 tests/editorial-article.test.ts           |  23 ++++++
 tests/helpers/core-build-fixture.ts       |  93 +++++++++++++++++-----
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
 tests/theme.test.ts                       |  82 +++++++++++++++++++
 tests/wiki-article.test.ts                |  23 ++++++
 50 files changed, 1697 insertions(+), 219 deletions(-)
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

Copied roots: src, scripts, tests, public, docs
Root files: .gitignore, .nvmrc, README.md, V2.6_STARTER_IMPLEMENTATION_REPORT.md, V2.6.1_STARTER_IMPLEMENTATION_REPORT.md, astro.config.ts, game.config.ts, package.json, package-lock.json, tsconfig.json, vitest.config.ts, wrangler.jsonc

Excluded .git, .env/secrets, .vercel, .c2c, dist, .astro, root archive/history, caches; no credential file was inspected.

Dependencies copied from Candidate once to common-core, then physically copied to each game; no shared writable dependency symlink, external link, hardlink, install, upgrade or lock mutation. Relative package .bin links stay within each isolated copy. Node: existing /Users/randyz/.nvm/versions/node/v22.22.0/bin/node (v22.22.0); matches .nvmrc and engines. Package/lock bytes remain identical.

Product inputs not yet changed at this checkpoint. Shared check and final bounded comparison results are recorded below after execution.

## PLAN38 baseline check stop

npm run check ran once under Node 22.22.0: Astro 152 files, 0 errors / warnings / hints; Vitest 853 passed, 2 failed (48 test files, 47 passed), exit 1. Both failures require the existing Candidate .github/workflows/ci.yml omitted from the snapshot list. No snapshot correction, rerun, product-input change or game build was performed. shared-check.log preserves the failure.

The common snapshot is incomplete for runtime contract verification. It is not an accepted baseline yet. Its existing source/test files are unmodified; BF and WoG source copies are still identical to it. Snapshot completion must be explicit and cannot be a new game-side input or Core edit.

## PLAN39 correction and retry

Existing Candidate .github/workflows/ci.yml copied byte-for-byte to all three roots; no CI content edit. First failed shared-check.log preserved. Single authorized retry: Astro 0 errors, 48/48 test files and 855/855 tests PASS, exit 0; see shared-check-retry.log. Baseline ready is not product acceptance.

BF input diff contains exactly ten approved paths; all other copied source/config/scripts/tests/CI/package/lock files compare equal to common-core. WoG has zero input changes and is still the common snapshot. BF build:evidence failed during validation: PP-02 core.about-intro residue on page:about:copy. No output or browser proof; stopped before WoG adaptation.
