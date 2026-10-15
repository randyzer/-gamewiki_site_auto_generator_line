# WS-02 — Stable Core continuity and adopted final CI

Date: 2026-10-02 Asia/Taipei. Task c2c_a765 / iteration 10. Status: WS-02 INDEPENDENT ACCEPT, closed; actual review preserved in [verification.md](verification.md). This is an engineering/method checkpoint, not capability/project/release acceptance.

## Result

Created v2.7/evolution in the existing Starter repo from exact accepted A3 b067e8d4050478072f25a1dc78a8526cdd128cfd / tree 1df0ade30b1eaf51a76820c8d8b83337786f0dc1. HEAD and phase-a/core-safety ref remain A3; no commit/push/tag/merge. Frozen V2.6.5 three artifacts and real projects/references remain unchanged. Runtime src/**, default game config/inventory, existing build/evidence validator/audit, dependency fields and lockfile are byte-identical.

Implemented verify:unadopted-final and verify:adopted-final, using full disposable copies and the existing Field Notes mutation. Each real command retains exit/error checks and captured output. Default validate/build must reject with PP-02; unexpected success, unrelated failure, spawn errors, timeout/signal/incomplete child exits fail verification. Adopted validate/check/build must pass; final evidence marker and unapproved privacy/terms must be absent. Finally cleanup and creation/adoption error cleanup remove fixtures; actual adopted test root absence confirmed in provenance. Astro/Vite/Vitest caches are isolated. No generated final dist is built in canonical source.

CI now runs root check and both explicit gates after npm ci with unchanged pinned Node 22.22.0. The same commands were executed locally; no remote GitHub run or CI-server acceptance is claimed. All existing test files remain active. STARTER_ADOPTION_FIXTURE only selects explicit test expectations; unchanged production validators/audit/runtime do not read it. The residue test now constructs an explicit reserved brand negative rather than inheriting an adopted config. The legacy SEO-reference test now derives its current-site ID while retaining the exact dangling|legacy negative and other injection checks.

SOP method/QA/execution and Master Prompt Phase 0 now distinguish reusable template rejection, synthetic portable adoption proof and actual project final readiness. Commands are available only after checking selected artifact package.json. Canonical Contract/41 rows/16 columns and references stay at exact SHA256 1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c. WS-01 evidence index and accepted snapshots are not overwritten; all current capability outcomes remain null.

## Actual files changed

- `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/package.json`
- `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/.github/workflows/ci.yml`
- `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-adoption.ts`
- `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/helpers/core-build-fixture.ts`
- `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/core-safety-sentinels.test.ts`
- `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/residue-build.test.ts`
- `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/runtime-contract.test.ts`
- `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/release-identity.test.ts`
- `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/README.md`
- `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/docs/PP02_PRODUCTION_RESIDUE.md`
- `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/docs/QA_CHECKLIST.md`
- `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/seo.test.ts`
- `Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/NEW_GAME_SITE_SOP_v2.7.md`
- `Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/QA_CHECKLIST.md`
- `Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/EXECUTION_PROMPT.md`
- `Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE/CodexMasterPrompt_v2.7Candidate.md`

12 Starter files (original 11 plus the actual authorized SEO test amendment), 3 SOP files, 1 Prompt file. Execution metadata, saved actual PLAN/amendments and PROJECT_STATE are separate governance changes. starter.diff includes the untracked verifier; sop.diff/master-prompt.diff compare WS02-only changes against accepted WS01 preimages. rollback-manifest.json and preimages preserve all four previously uncommitted WS01 files; no reset --hard/clean or blanket restore is allowed.

## Checks and retained failure evidence

Fresh A3 baseline: Astro 0 errors/warnings/hints; 44 files, 653 tests passed. Default validate exit 1 with explicit PP-02 failures. Initial preflight literal Playwright-text assertion exposed existing optional Vitest peer metadata; no product edit occurred, and actual ChatGPT preflight amendment accepted unchanged metadata while forbidding actual browser dependency/resolution/install and lockfile changes.

Targeted check: 4 files / 68 tests passed. Initial full root check: 44 files / 656 passed. Unadopted verifier: expected PP02 validate/build failures asserted, exit 0. First adopted full check: validate=0, check=1; 43 files/655 tests passed and one inherited SEO negative failed due to hardcoded default-domain legacy ID. Execution stopped, failure output released and retained as adopted-final.log and provenance.checkRuns. Actual ChatGPT scope amendment approved only tests/seo.test.ts current-site fixture correction; no validator change, skip or weakened negative.

After the amendment, all three required commands reran completely: root check 44 files/656 tests, no skips, Astro 0 errors/warnings/hints; unadopted validate=1/build=1 with PP02, verifier=0; adopted validate=0/check=0/build=0, 44 files/656 tests, no skips. Final generation/audit passed 6 pages, Pagefind indexed 4 pages and normalized payload 231921 B; final marker and unapproved legal routes absent. No obsolete success/failure logs are overwritten. Complete outputs are check.log/provenance.checkRuns and C2C execution_output iteration10.

Scope/source audit: every untouched Starter file equals A3, every untouched SOP/Prompt file equals WS01 ACCEPT; exact frozen sources and 743 protected real-project/reference files unchanged. Lockfile byte-identical; no direct/resolved/installed browser package, existing Vitest optional peer metadata unchanged. Dependency/src/contract delta zero. All three git diff --check passed. Actual file fingerprints and rollback safeguards recorded.

## Next gate and limitations

Actual ChatGPT independent review returned ACCEPT after reading all scoped actual files, complete success/failure outputs, safety continuity, CI, three-artifact sync and rollback safeguards. Full original response is verification.md; reviewed product file hashes verified unchanged after the review. This bounded WS02 PLAN is closed; source HEAD still A3 with uncommitted reviewed work. AX-01 browser evidence remains PENDING WS06A, AX-03 and real/reference adoption NOT_RUN; IA-03 only preserves existing Pagefind/search seam here, not WS03D completion. Synthetic Field Notes is not real-game/business/legal/media/human approval. No WS06A/WS03/A4/assembly/release starts under this PLAN. V2.7 final product remains incomplete.
