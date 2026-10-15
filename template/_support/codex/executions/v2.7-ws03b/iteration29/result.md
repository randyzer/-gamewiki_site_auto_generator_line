# Iteration 29 — WS03B diagnosis, bounded audit repair and continuation candidate

Candidate: ELIGIBLE_FOR_INDEPENDENT_CONTINUATION_REVIEW. This is a Codex execution candidate, not independent ACCEPT.
Actual independent REVIEW28 remains BLOCKED. Its full artifact directory and actual FAIL are frozen byte-identical. The initial 18-file WS03B implementation is carried forward, with only the two conditionally authorized additional changes below.

## Confirmed diagnosis

One diagnostic session, zero qualification attempts. Same media assets/mapping/build/engines/viewports as iteration28. Diagnostic fixture source hash matches the pre-mutation current Starter. The two image DOM instances are distinguished by index and hero/gallery placement. In both WebKit viewports, hero is already complete at1200×675; gallery is lazy/off-screen, completefalse/naturalWidth0. A single natural gallery scroll initiates a further successful200 response and native decode, with complete true/naturalWidth1200/naturalHeight675 after. Full before/after rects, visibility, currentSrc, request/response timestamps and performance entries are retained. Hero/gallery share a URL; resource sharing is explicitly disclosed rather than inventing instance-specific requests. No product/source/style/property injection, reload or keyboard acceptance claim.

## Conditional audit fix and tests

- RED before implementation: 3 FAIL / 23 PASS, exit1; actual internal newlines/repeated whitespace in valid schema credit, equivalent text and equivalent link labels reproduced the defect.
- Invalid first invocation at workspace cwd is excluded and preserved in red-whitespace-invalid-cwd.log.
- Only scripts/media-validation.ts and tests/media-audit.test.ts changed in iteration29.
- Shared visible-text normalization collapses whitespace and trims both comparison sides; no normalization of URL/ID/src/dimensions/rightsRef/placements and no fuzzy matching.
- Different credit, different sentence and different link label remain rejected.
- Targeted five-file GREEN:247 PASS; root check:46 files/811 PASS, Astro0 errors. BeforeWS03B780; after28=807; after29=811.
- Unadopted final validation/build expected rejections PASS; adopted final validation/check/build PASS; git diff --check PASS.

## Browser evidence

- Targeted six-row media suite once/zero retries:6/6 PASS,156/156 original assertions PASS. All original check(...) lines and assertion names/order/engines/viewports/assets are preserved.
- Sole semantic timing change: native image readiness, naturally revealing only incomplete lazy images and waiting bounded native load completion. Read-only per-image readiness/request evidence retained. No changed expectations, tolerance, naturalWidth mocking or DOM mutation.
- Missing local image negative still fails before preview with actual exit1. Synthetic SVG and actual generated H264 video remain disposable QA material; production manifest is still empty.
- Fresh unchanged npm run check:browser once/zero retries:47 planned/47 executed,37 PASS/10 WebKit FAIL/0 NOT_RUN. Raw FAIL/exit1 remains preserved.
- Independent physical fixture/dist identity captured twice while preview alive before report; actual expected identity equals raw identity exactly. Current triad/source/Contract/tool/engine/host/verification identities are bound.
- Current40 failed assertions:37 ENVIRONMENT_PROFILE_BLOCKED,3 PRODUCT_EVIDENCE_UNRESOLVED. Exact subset of frozen iteration19; Chromium40/40 and Firefox40/40 current counterparts PASS.
- Compared with iteration27 post03A40:40 persisted,0 disappeared,0 reappeared,0 outside frozen40.
- Current native probe, unchanged policy14 and Arrow control14 bound to raw SHA. Closure actual exit1/BLOCKED; sole error missing/invalid real Safari keyboard evidence.
- Diagnostic, targeted and fresh owned TMP roots all normally closed: Astro stop0, original PID gone, fixture gone, known regular Node/tsx cache files individually removed, own root gone;0 signals/symlinks/unknown entries/path escapes.

## Integrity and holds

6293 protected files unchanged plus exactly2 conditionally approved changes; iteration28 history frozen. Contract SHA unchanged,41 unique canonical IDs,duplicate0. Git HEAD/tree/branch unchanged; six verification infrastructure hashes unchanged. No media schema/adapter/components/catalog/CSS/SOP/Prompt mutation29. No commit/push/tag/merge/deploy/release.

WS03B awaits actual independent ACCEPT. WS03C not started. Genuine Safari proof0, WS06A FULL BLOCKED, formal WS03 NOT_ACCEPTED, capability promotionNONE, release holdACTIVE. If independent review grants continuation ACCEPT, request one finite WS03C plan under standing authorization; no automatic formal/release promotion.

## Changed files in iteration29

- Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/media-validation.ts
- Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/media-audit.test.ts

Full earlier18-file change list, preimages and frozen failures remain in iteration28/result.md and scope-check.json; current triad-post-identity.json binds the cumulative candidate.
