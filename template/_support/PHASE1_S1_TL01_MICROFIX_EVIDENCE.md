# PHASE 1 S1 TL-01 — UNAVAILABLE STATE COHERENCE MICRO-FIX EVIDENCE

Date: 2026-10-01 (Asia/Taipei client date)

## A. Verdict

PASS — S1 TL-01 UNAVAILABLE STATE COHERENCE MICRO-FIX COMPLETE

The single reviewed unavailable-state defect was reproduced, corrected, and verified. All required post-fix commands passed. This verdict covers the micro-fix implementation and evidence; independent freeze verification remains the next step.

Procedural deviation: the attachment was read with `cat` before its first-command requirement was known, so the literal first shell command was not `pwd`. This was disclosed during execution. Subsequently, the task preflight ran `pwd` followed by `git rev-parse --show-toplevel`; both exactly matched the required workspace. No auto-cd or workspace change occurred.

## B. Candidate branch / HEAD

- Workspace and Git top-level: `/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`
- Branch before and after: `phase1/core-safety-s1-tl01`
- HEAD before and after: `29b25559cf2af859bca359c7f7fda686a4803c95`
- Index before and after: empty; `git diff --cached --exit-code` returned 0 with no output.
- Existing uncommitted S1 implementation remained present and unstaged. No reset, restore, stash, clean, checkout, or discarded work.
- Runtime: Node `v22.22.0` from `/Users/randyz/.nvm/versions/node/v22.22.0/bin`.
- `node_modules` existed before execution. No dependency installation or update.

## C. Reviewed defect

The unavailable branch previously rejected only the conjunction `visibility=public && publicationStatus=published`. It accepted public draft records and private records with published, scheduled, or archived status without errors.

The frozen TL-01 contract requires the unavailable record itself to be coherent: nonpublic visibility (private or unlisted), draft publication status, and noindex.

## D. Exact logic change

Only the unavailable branch of `resolveLegalPageSafety()` changed:

```ts
if (activation.data.state === "unavailable") {
  if (page.visibility === "public") fail("Unavailable legal page must not use visibility=public.");
  if (page.publicationStatus !== "draft") fail("Unavailable legal page requires publicationStatus=draft.");
  if (page.indexability !== "noindex") fail("Unavailable legal page must use noindex.");
  return { eligible: false, errors };
}
```

Each error retains the existing TL-01 page-ID prefix. Private and unlisted remain accepted nonpublic values. A coherent unavailable record returns `eligible=false` and `errors=[]`.

The legalActivation union, omitted/unavailable default, active branch, approvedContentSha256, canonical payload and digest logic, legalContent seam, route generation, renderer, catalog authority, and validation architecture were preserved.

## E. Files changed by micro-fix

Exactly two candidate files differed from their pre-micro-fix working-tree contents:

1. `src/core/legal-safety.ts`
2. `tests/legal-safety.test.ts`

A read-only SHA-256 snapshot of all 181 tracked/nonignored untracked candidate files (including missing tracked paths) was taken before editing and compared after all required tests/checks/build. Only the two authorized files changed; the other 179 entries remained identical, with no added or removed entries. This preserves the already-existing S1 diff rather than comparing the micro-fix against HEAD.

| Candidate file | Before micro-fix SHA-256 | After micro-fix SHA-256 |
| --- | --- | --- |
| `src/core/legal-safety.ts` | `8cda8e634132c00543cf1b0a5eaf1240de7073ad4ee7d8610abcd39c803e4ec8` | `75ffe35dde7bfa296153621906a74fec999df4a669d515472702bfbbd19095d9` |
| `tests/legal-safety.test.ts` | `7546534c3ae0e42d21ed057dc104197a3e869077542f90205a2a06b0c07addf5` | `2919cb9fa54dd4b9868403233362249798d4d850f9e868d0d6cc6ec0b120327d` |

Both target files were already untracked S1 files. Therefore `git diff -- src/core/legal-safety.ts tests/legal-safety.test.ts` returned 0 with no output. The following actual micro-fix diff was additionally inspected using `git diff --no-index` against temporary copies of the saved pre-edit contents. Temporary copies were removed.

```diff
--- before-microfix/src/core/legal-safety.ts
+++ after-microfix/src/core/legal-safety.ts
@@ -69,9 +69,8 @@ export function resolveLegalPageSafety(
     return { eligible: false, errors };
   }
   if (activation.data.state === "unavailable") {
-    if (page.visibility === "public" && page.publicationStatus === "published") {
-      fail("Unavailable legal page cannot be public and published.");
-    }
+    if (page.visibility === "public") fail("Unavailable legal page must not use visibility=public.");
+    if (page.publicationStatus !== "draft") fail("Unavailable legal page requires publicationStatus=draft.");
     if (page.indexability !== "noindex") fail("Unavailable legal page must use noindex.");
     return { eligible: false, errors };
   }

--- before-microfix/tests/legal-safety.test.ts
+++ after-microfix/tests/legal-safety.test.ts
@@ -122,6 +122,28 @@ describe("TL-01 legal activation and digest", () => {
     expect(() => buildEnabledPageCatalog(gameConfig, [page])).toThrow(/unavailable/i);
   });
 
+  it("rejects unavailable public draft pages even with noindex", () => {
+    const page = { ...unavailablePage(), visibility: "public" as const, indexability: "noindex" as const };
+    const result = resolveLegalPageSafety(page);
+    expect(result.eligible).toBe(false);
+    expect(result.errors.join("\n")).toContain("visibility=public");
+    expect(() => buildEnabledPageCatalog(gameConfig, [page])).toThrow("visibility=public");
+  });
+
+  it.each(["published", "scheduled", "archived"] as const)("rejects unavailable private pages with publicationStatus=%s", (publicationStatus) => {
+    const page = { ...unavailablePage(), publicationStatus };
+    const result = resolveLegalPageSafety(page);
+    expect(result.eligible).toBe(false);
+    expect(result.errors.join("\n")).toContain("publicationStatus=draft");
+    expect(() => buildEnabledPageCatalog(gameConfig, [page])).toThrow("publicationStatus=draft");
+  });
+
+  it("accepts unavailable unlisted draft noindex pages as coherent", () => {
+    const page = { ...unavailablePage(), visibility: "unlisted" as const, indexability: "noindex" as const };
+    expect(resolveLegalPageSafety(page)).toEqual({ eligible: false, errors: [] });
+    expect(buildEnabledPageCatalog(gameConfig, [page])).toEqual([]);
+  });
+
   it("rejects unsupported legal routes and duplicate legal page types", () => {
     expect(resolveLegalPageSafety({ ...activePage(), route: "/privacy/alias/" }, { privacy: content }).errors.join("\n")).toMatch(/route/i);
     const duplicate = { ...unavailablePage(), pageId: "privacy.other", route: "/privacy/other/", primaryKeyword: "another privacy policy" };
```

## F. New test cases and defect reproduction

Five new executable cases were added:

| Unavailable visibility | publicationStatus | indexability | Verified result |
| --- | --- | --- | --- |
| public | draft | noindex | Rejected with visibility=public error; catalog throws |
| private | published | noindex | Rejected with publicationStatus=draft error; catalog throws |
| private | scheduled | noindex | Rejected with publicationStatus=draft error; catalog throws |
| private | archived | noindex | Rejected with publicationStatus=draft error; catalog throws |
| unlisted | draft | noindex | Accepted as coherent: eligible=false, errors=[]; catalog empty |

Existing coverage for unavailable + indexability=index was preserved and passed.

Before the production fix, the direct legal-safety command returned exit 1: 1 failed test file, 4 failed / 66 passed / 70 total tests. The four new invalid-state cases failed specifically because the old resolver returned an empty error list. The new unlisted case and all pre-existing cases passed. This experimentally confirmed the reviewed root cause.

## G. Direct legal-safety test result

All verification commands used `PATH=/Users/randyz/.nvm/versions/node/v22.22.0/bin:$PATH`.

```sh
npm exec -- vitest run tests/legal-safety.test.ts
```

Post-fix result: PASS; exit 0; 1 test file passed; 70/70 tests passed.

## H. Focused S1 result

```sh
npm exec -- vitest run \
  tests/legal-safety.test.ts \
  tests/catalog.test.ts \
  tests/site-data.test.ts \
  tests/site-validation.test.ts \
  tests/static-page-copy.test.ts \
  tests/output-reconciliation.test.ts
```

Result: PASS; exit 0; 6 test files passed; 118/118 tests passed.

## I. npm run check result

```sh
npm run check
```

Result: PASS; exit 0.

- Astro diagnostics: 131 files; 0 errors, 0 warnings, 0 hints.
- Vitest: 39 test files passed; 567/567 tests passed.

The content-sync stage emitted glob-loader notices for no matching Markdown/MDX files under `src/content/meta` and `src/content/news`. These are separate from the zero-warning Astro diagnostic summary. No broader changes were made to address those notices.

## J. npm run validate result

```sh
npm run validate
```

Result: PASS; exit 0; `Site validation passed: 6 enabled pages, 1 content entries.`

## K. npm run build result

```sh
npm run build
```

Result: PASS; exit 0.

- Site validation: 6 enabled pages, 1 content entries.
- Astro: 6 pages built.
- Static output reconciliation: 6 inventory routes matched.
- Pagefind: 4 pages indexed, 1 language.
- Pagefind normalization and generated build audit both passed.
- The same empty meta/news content-sync notices appeared.

Default inventory was inspected after build: Privacy and Terms both remain `legalActivation.state=unavailable`, `visibility=private`, `publicationStatus=draft`, `indexability=noindex`.

Filesystem checks confirmed all of `dist/privacy`, `dist/terms`, `dist/privacy.html`, and `dist/terms.html` absent: zero legal routes. No candidate legal content was activated. The pre-existing static-route integration tests continue to use synthetic approved fixtures in temporary copies and passed.

## L. git diff --check result

```sh
git diff --check
git status --short
git diff -- src/core/legal-safety.ts tests/legal-safety.test.ts
```

`git diff --check`: PASS; exit 0; no output. Candidate status was inspected and preserved the initial S1 working-tree status.

Both untracked target files additionally had no whitespace diagnostics from `git diff --no-index --check` against their pre-edit contents. Its exit 1 represents detected differences. An initial verification wrapper incorrectly expected exit 0 and reported failure despite empty diagnostics; the wrapper was corrected and both checks completed without diagnostics. This did not require a code change.

## M. Frozen source status

Frozen source repository:

`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.6.5`

Verified both before the micro-fix and after regression/build:

- HEAD: `29b25559cf2af859bca359c7f7fda686a4803c95`
- TREE: `0920c9de216ada5601f681d81e4345cf69fb65e8`
- Status: CLEAN; `git status --porcelain` returned no output.

## N. Frozen document checksums

All six documents were verified before editing and again after regression/build. Every checksum matched the supplied frozen value. No frozen document or previous S1 evidence report was modified.

All document paths are under `/Users/randyz/work/coding/hot_words_web/template/`.

| Frozen input | Filename | SHA-256 before and after |
| --- | --- | --- |
| Product Contract | `COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md` | `3fe0c98d7e98f963de37fd80b3f2dbe33a822b810a1f268ec4aaef8dad90682a` |
| Capability Baseline | `GAME_SITE_STARTER_V2.6.5_CAPABILITY_GAP_AUDIT_V0.2.md` | `094d5980af15fffbf841a9001f8260b8745db22b721b876ad916dd1f919cf985` |
| Core Safety Contract | `CORE_SAFETY_CONTRACT_DESIGN_V0.1.md` | `7fc4ccddc9522ce179005c29729a39e5efb09b5e522fef0ed83b26cd3b0d887c` |
| Implementation Plan | `PHASE1_CORE_SAFETY_IMPLEMENTATION_CANDIDATE_PLAN_V0.1.md` | `60a0c5f2c4432d5102378200f167c1d901caec26ba218167a473c3446760a32e` |
| Candidate Creation Verification | `PHASE1_CORE_SAFETY_CANDIDATE_CREATION_VERIFICATION.md` | `85ed263f2345154e52bfbc607abb3602f099c7e81fc4cf8607654b6f484b179c` |
| Previous S1 Evidence | `PHASE1_S1_TL01_IMPLEMENTATION_EVIDENCE.md` | `bd57a306c8e61c0133918835535d59adf713d23252d8d23470cee5aac991135a` |

## O. S2/S3/S4 scope confirmation

S2: not touched. S3: not touched. S4: not touched. TL-02 was not implemented. No architecture reopen was required.

No micro-fix changes to catalog, site-data, site-validation, inventory schema/JSON, LegalPage, routes, static-page-copy, build scripts, SEO, Pagefind, navigation, CI, or package files. No Playwright installation, media README move, residue scanner, release version, baseline update, or contract update.

`package.json` and `package-lock.json` are byte-identical to the pre-micro-fix snapshot. No new dependencies, generic state engine, legal workflow, CMS/database, auto-approval, fabricated legal content, Last reviewed claim, or parallel route registry.

## P. Commit / stage / push / tag status

- Commit created: NO.
- Files staged: NO; index empty before and after.
- Push performed: NO.
- Tag created: NO.
- Merge performed: NO.
- Existing S1 work remains uncommitted and unstaged.
- This is the only new external evidence report; the previous S1 evidence was not overwritten.
- Stop after this evidence and its checksum verification. No S2/S3/S4 follow-on work.

## Q. Exact Next Step

Independent freeze verification of the S1 TL-01 implementation after the unavailable-state coherence micro-fix.

