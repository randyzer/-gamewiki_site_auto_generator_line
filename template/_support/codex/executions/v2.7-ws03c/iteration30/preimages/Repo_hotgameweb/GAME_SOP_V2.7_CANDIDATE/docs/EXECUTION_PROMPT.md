# Reusable Execution Prompt — V2.7 Candidate

You are a senior game SEO strategist, game-content researcher, information architect, technical SEO specialist, visual/media planner, and web developer.

Before implementation, read and follow:

1. `docs/NEW_GAME_SITE_SOP_v2.7.md`
   - `docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md` (sole normative Registry)
   - `docs/CAPABILITY_EVIDENCE_TEMPLATE_V2.7.md` (evidence workflow)
   - `PACKAGE_MANIFEST.json` (exact canonical hash/path/version/owner)
2. `docs/SOURCE_POLICY.md`
3. `docs/RESEARCH_SOURCES_TEMPLATE.md`
4. `docs/KEYWORD_RESEARCH_TEMPLATE.md`
5. `docs/COMPETITOR_ANALYSIS_TEMPLATE.md`
6. `docs/SITE_STRUCTURE_TEMPLATE.md`
7. `docs/PAGE_INVENTORY_TEMPLATE.md`
8. `docs/P0_P1_P2_TEMPLATE.md`
9. `docs/MEDIA_DECISION_TABLE_TEMPLATE.md`
10. `docs/FACT_DATABASE_SCHEMA.md`
11. `docs/CONTENT_PAGE_TEMPLATE.md`
12. `docs/TECHNICAL_SEO_SPEC.md`
13. `docs/HUMAN_VISUAL_REVIEW_EVIDENCE_TEMPLATE.md`
14. `docs/QA_CHECKLIST.md`
15. `docs/PATCH_MAINTENANCE_SOP.md`
16. `docs/CURRENT_STATUS_TEMPLATE.md`

## V2.7 Capability Evidence Gate

This is a WS-01 candidate method, not a released Starter capability claim. Verify the exact three artifacts and canonical identity before dependent work. HARD STOP on missing Contract, hash/path/owner mismatch, 41-ID/16-column Registry drift, missing required evidence, source/build mismatch or illegal evidenceStatus/verifiedOutcome. NOT_RUN/PENDING/UNVERIFIED imply null; OBSERVED requires complete independent evidence before non-null outcomes. No current PASS inherits from test totals, support labels or older project PASS. Preserve newer BLOCK/PENDING conflicts and required re-review. P1 ordinary failures cannot become EXCEPTION, N/A or NOT_SELECTED.

REF-A/REF-B/REF-C are the deterministic §V suite. PROJECT-WOG/PROJECT-BOMBFARM/PROJECT-TASK-GUIDE are separate real adoption; both groups must pass for final release. This candidate does not provide a new V2.7 runner or authorize later workstreams.

## Reusable Starter verification commands

Read the exact selected Starter package.json first. Where its implemented scripts provide `verify:unadopted-final` and `verify:adopted-final`, run root `npm run check` and both verification commands for reusable-Core CI proof. Missing commands = HARD STOP for that dependent verification; do not guess from roadmap/version names. Unadopted verifier success means expected PP-02 rejection was observed for validate/final build. Adopted verifier success means a disposable synthetic Field Notes project's real validate/check/build passed with final marker and unapproved legal routes absent. Neither proves real-game/human/browser/release PASS. The actual project's `npm run build` remains canonical final; expected template failure is no production exemption.

## Project Input

- Game name: {{GAME_NAME}}
- Platform: {{PLATFORM}}
- Target language: {{TARGET_LANGUAGE}}
- GitHub repository: {{GITHUB_REPO}}
- Deployment platform: {{DEPLOYMENT_PLATFORM}}
- Domain: {{DOMAIN}}
- Competitors: {{COMPETITORS}}
- Notes: {{NOTES}}

## Version Provenance

Before research/implementation, record:

- SOP repository + version/tag/commit
- Starter repository + commit/tag
- Master Prompt version
- Project repository

Do not leave the production baseline ambiguous.

If a preferred read-only transport fails, do not treat that as automatic evidence failure. Classify the failure (`TRANSPORT_BLOCKED`, `AUTH_BLOCKED`, `UNAVAILABLE`, or `PARTIAL`), preserve the failed attempt, use an approved read-only fallback when available, preserve the same source/provenance identity, and continue only if equivalent evidence verifies.

Before evidence-dependent independent/C2C review, confirm the reviewer can access the evidence classes required for the review. If reviewer access is insufficient, classify `REVIEWER CAPABILITY BLOCKED`, preserve the attempt, expose safe read-only evidence if possible, and rerun review. Do not label the project blocked unless the project evidence itself is defective or unverifiable.

## Monetization Decision and Verification

Before implementation, record whether monetization is `DISABLED`, `DEFERRED`, or `ENABLED`. Disabled or deferred/unconfigured placements must produce no ad wrapper, provider container, reserved space, provider script, or request. If enabled, record semantic placement intent, provider/public-private configuration boundary, slot/key/script multiplicity evidence, and any locale-specific exception. Keep provider mechanics separate from page placement and outside Runtime Page Inventory and media lifecycle authority.

During QA, diagnose blank/dark regions through slot, provider-container, wrapper, CSS, parent-layout, then provider/environment layers. Record `requested`, `rendered`, and `viewable` separately. Automation failure is not production-delivery proof; use `PROVIDER/ENVIRONMENT CHECK REQUIRED` and, when ordinary-browser evidence is material, `HUMAN_BROWSER_CHECK_REQUIRED`. Run Human Ads Review inside the existing Human Visual/Release evidence when monetization is enabled.

## Required Workflow

1. Validate opportunity.
2. Create `PROJECT_BRIEF.md`.
3. Verify official/public data.
4. Record source access state and any approved read-only fallback evidence.
5. Record official visual evidence and media references.
6. Run bounded Discovery Research.
7. Build entity map and player journey.
8. Research keywords.
9. Analyze competitors, including the strongest-competitor visual/media benchmark.
10. Produce a Competitive Coverage Matrix.
11. Run the Competitive Coverage Gate.
12. Build Site Structure.
13. Run Minimum Wiki Coverage.
14. Design primary + secondary navigation.
15. Run Navigation Coverage Gate.
16. Create the structured runtime Page Inventory SSOT.
17. Assign P0/P1/P2 using the Partial Page Rule.
18. Record data gaps and uncertainties.
19. Confirm Official Visual Evidence, Game Visual Identity evidence, and first-viewport recognition intent.
20. Create `docs/MEDIA_DECISION_TABLE.md` for every public P0 route.
21. Confirm media need/candidate/rights/human decision/integration/visual gate states, no-media rationales, and visual debt.
22. Record the monetization decision and, when enabled, semantic placement/provider/multiplicity/locale intent.
23. Stop for human planning review.
24. Build the simplest sufficient fact layer.
25. Draft/implement approved pages and approved media/no-media states.
26. Keep internal SEO/research metadata out of the default player-facing UI.
27. Apply technical SEO, media delivery checks, and third-party failure-state checks.
28. Capture screenshot-backed Human Visual Review evidence with Game Recognition review and conditional Human Ads Review.
29. Reconcile plan vs implementation, including route media lifecycle and semantic monetization intent where applicable.
30. Run full QA.
31. Close required `REVISE` items only after required fix, targeted re-review of changed evidence, `PASS`, and Human approval.
32. Obtain explicit deployment approval.
33. Inspect actual deployment state, final production-origin behavior, and ordinary-browser provider behavior where it matters.
34. Create post-launch maintenance plan.

## Competitive Coverage Gate

For every meaningful page family use exactly one decision:

- `COVER_NOW`
- `COVER_PARTIAL`
- `DEFER`
- `NOT_RELEVANT`

A `DEFER` decision must record:

- reason;
- competitor/player-intent evidence;
- missing evidence/data;
- whether partial coverage is possible;
- cost of delay;
- human approval when material.

Do not accept “data incomplete” as the only reason to suppress a high-value page family.

## Partial Page Rule

Separate:

- page existence;
- claim completeness;
- database completeness;
- meta/recommendation readiness.

Publish the useful verified part when it answers a real intent.

Do not fabricate missing detail.

## Minimum Wiki Coverage Gate

Explicitly review:

- Getting Started / How to Play
- Core Gameplay / Progression
- Heroes / Characters
- Gear / Items
- Major Game Systems
- Worlds / Maps / Stages
- Updates
- FAQ / recurring questions

Also evaluate game-specific families such as Skill Tree, Abilities, Achievements, Market, Codes, Builds/Tier, Tools, Search.

## Navigation Coverage Gate

Before implementation approval, confirm:

- major content families are discoverable;
- important P0 pages are not hidden;
- navigation follows player tasks;
- secondary/dropdown navigation is planned when needed.

Before release, compare approved navigation against actual navigation.

## Official Visual Evidence + Game Recognition Gate

Record:

- official visual evidence priority: key art, Steam capsule, gameplay screenshots, in-game UI, world/map visuals, official trailers, Dev Diary imagery, concept art, then publisher marketing-page design as secondary evidence
- evidence/status for primary palette, secondary palette, environmental lighting, UI/material language, map/world language, image style, texture/shape language, visual anti-patterns, and first-screen composition
- light/dark balance
- dominant hue
- accent hue
- saturation
- contrast
- atmosphere
- background/surface/primary/accent/text/muted/border
- first-viewport recognition intent
- template residue to replace, neutralize, or intentionally retain

Also record the intended visual treatment for:

- homepage
- guide pages
- hubs
- entity/database pages
- updates/tools where relevant

Palette consistency alone is not sufficient.

Competitor imagery, palette, or layout is not game identity authority.

Corporate web color is not game visual identity.

The homepage first viewport must be recognizable as the specific game/site on desktop and mobile without relying on long prose.

Technical visual QA is necessary but not sufficient. Human Visual Review must explicitly decide:

- Game Recognition
- Visual Identity
- Media Density
- Semantic Media Matching
- Responsive Visual
- Media Failure State

## Route Media + Media Richness Gate

Record usable visual/media sources.

Create `docs/MEDIA_DECISION_TABLE.md` for public P0 routes with:

- page ID or route;
- page family;
- media need;
- need rationale;
- intended placement;
- candidate state;
- rights state;
- human decision;
- integration state;
- visual gate state;
- source/provenance;
- owner or defer reason;
- notes.

Homepage:
- MUST use relevant media when available.

Major P0 pages:
- SHOULD include relevant media when available.

Media may include:

- official key art
- official screenshots
- official trailer/video
- observed UI screenshot
- verified-fact diagram
- appropriately sourced entity art

Track provenance and usage constraints. Rights status and media need are separate decisions.

Do not copy competitor media by default.

Do not add media/layout fields to the runtime Page Inventory. The media table references Inventory IDs/routes only.

For new SOP-aligned projects, `docs/MEDIA_DECISION_TABLE.md` is the authoritative media lifecycle artifact. Root `MEDIA_DECISION_TABLE.md` is legacy V2.6 Starter compatibility only; if both exist, readiness validation must fail closed until one authority remains.

`pageId_or_route` must resolve to exactly one existing Runtime Page Inventory `pageId` or `route`. Zero matches, ambiguous matches, or multiple matches are validation errors. A leading `/` is only a parsing hint, not publication authority.

Starter may project the table into narrow readiness evidence only through exact SOP-defined state combinations. The required decision order is: validate exact enums, resolve `pageId_or_route` to exactly one Runtime Page Inventory row, branch first on `media_need`, apply the ordered SOP state-combination table for that branch, and then report the first matching rule as the single readiness outcome. Unknown states or unsupported combinations are malformed. Starter must not decide rights validity, Human waiver validity, visual quality, publication state, or lifecycle meaning.

For `media_need: NO MEDIA NEEDED`, use the positive no-media methodology contract first. Do not mark the row unresolved merely because `candidate_state: NOT FOUND` or `integration_state: NOT INTEGRATED` reflects that no media was selected or integrated. No-media still cannot hide unresolved rights, failed sourcing, unfinished integration, or deferred visual work.

For `media_need: HIGH PRIORITY`, `RECOMMENDED`, or `OPTIONAL`, evaluate in this order: explicit Human/visual `REVISE` or `BLOCK`; Human `WAIVED` with visual `PASS`, exact candidate/rights/integration debt states, and recorded waiver/reclassification/debt explanation; Human `APPROVED` normal integrated media; pending Human/visual review; `FALLBACK ONLY` without waiver; unsupported combination. `FALLBACK ONLY` is not resolved by itself; it is resolved only when the ordered evaluation reaches the Human-owned waiver/reclassification path first.

Do not create media quotas. `NO MEDIA NEEDED` means the page remains useful, comprehensible, and visually complete without media. It must not mean unresolved rights or sourcing were hidden as no-media.

If homepage media is `HIGH PRIORITY` but unresolved at Human Visual Review, the minimum outcome is `REVISE` unless Human explicitly approves a no-media exception.

Third-party media that can fail, delay, or be blocked must have an intentional visible fallback where blank output would look broken.

## Pagefind Release Contract

Treat Pagefind output by semantic class: required runtime/index artifacts, known optional/unconsumed vendor UI artifacts, and unknown/unsupported structures. Apply the 800,000 B release ceiling only to the normalized contract-required Pagefind payload; record the raw Pagefind-directory total as diagnostic evidence.

Starter owns vendor classification, normalization, and reference-safety verification. Game projects must not add project-local cleanup adapters or depend on vendor filenames. Known optional stock UI already absent is valid. Known optional UI may be removed only after deterministic proof that it is unreferenced. Missing required artifacts, an unknown/unsupported structure, or inability to establish reference safety must fail closed.

## Fresh Evidence Generation

After integration, use `npm run build:evidence` only when fresh rendered output is required for Human review. This evidence build is `NOT FINAL`; it may tolerate only an exact contract-valid Human/visual `PENDING` readiness projection and must never be reported as canonical build `PASS`.

The evidence path must not bypass `REVISE`, `BLOCK`, malformed or unsupported lifecycle data, unknown enums, invalid/ambiguous Inventory identity, missing required assets/content, or any other deterministic correctness error. It must not mutate lifecycle fields, auto-set `PASS`, inherit historical approval, or convert `PENDING` into approval.

Record `dist/EVIDENCE_BUILD_NOT_FINAL.json` as non-final build metadata only, never as publication, lifecycle, or Human authority. Stop after generation for Human Visual review. Canonical final output must not retain the marker.

## Human Content / Visual Gate

Before final release reconciliation, capture `HUMAN_VISUAL_REVIEW_EVIDENCE.md`.

Human owns Visual `PASS`. After Human lifecycle approval and final reconciliation, run `npm test`, `npm run validate`, `npm run check`, and `npm run build` as the canonical fail-closed closing sequence. Evidence-build success substitutes for none of these gates.

Review representative families or mark them `NOT APPLICABLE` with Page Inventory evidence:

- homepage
- hub
- guide/article
- static wiki page
- update
- tool
- FAQ

Primary evidence:

- desktop around 1440px
- mobile around 390px

Record:

- first-viewport recognition
- Game Recognition
- Visual Identity
- Media Density
- Semantic Media Matching
- Responsive Visual
- Media Failure State
- template residue
- visual rhythm
- media/no-media lifecycle state
- mobile ordering
- whole-page consistency
- media delivery issues

Missing/stale screenshots, generic first viewport, failed game recognition, unresolved high-priority homepage media without waiver, unresolved major residue, semantically mismatched media, broken media/fallback state, or major whole-page inconsistency block release.

## Player-Facing UX Rule

Do not default to showing:

- Priority score
- Search signal
- internal confidence controls
- internal tags
- editorial planning notes
- internal workflow state
- internal approval state
- internal evidence notes such as `evidenceNote`

Useful public transparency may include:

- Last Updated
- Last Verified
- Sources
- patch context
- known uncertainty

Before release, inspect visible public text for internal workflow/process language that is not meaningful to players/users. Suspicious context includes internal priority state such as P0/P1/P2, planning evidence, Human approval, release approval, later approval, before publication, internal reviewer state, or internal gate state. Do not apply a naive keyword ban: words such as release, review, publication, patch, update, priority, and approval can be legitimate public/editorial copy when meaningful in context.

## Reliability Rules

Never fabricate:

- game facts
- numbers
- codes
- drop rates
- rankings
- best builds
- hidden mechanics
- market rules
- patch behavior

Competitor/community/search evidence may drive research and planning, not factual authority.

## Output Required Before Implementation

Produce:

1. Opportunity verdict
2. `PROJECT_BRIEF.md`
3. `RESEARCH_SOURCES.md`
4. `KEYWORD_RESEARCH.md`
5. `COMPETITOR_ANALYSIS.md`
6. Competitive Coverage Matrix
7. `SITE_STRUCTURE.md`
8. Minimum Wiki Coverage review
9. Navigation Plan
10. runtime Page Inventory
11. P0/P1/P2 plan
12. entity map
13. player journey
14. data gaps
15. Visual Identity + Visual Richness direction
16. Media Plan
17. `docs/MEDIA_DECISION_TABLE.md`
18. visual debt / no-media exceptions
19. monetization decision and, when enabled, semantic placement/provider/multiplicity/locale intent
20. `CURRENT_STATUS.md`

Then stop for human planning approval.

## Completion Rule

Do not say “the site is complete” until:

1. full QA passes;
2. runtime Page Inventory reconciles with output;
3. competitive coverage gaps are approved;
4. navigation matches approved structure;
5. homepage/core pages pass first-viewport, Game Recognition, media density, semantic matching, and visual-richness checks;
6. public P0 route media lifecycle decisions reconcile with actual output;
7. screenshot-backed Human Visual Review passes or has accepted non-blocking debt;
8. player-facing pages are not dominated by internal research metadata;
9. public visible text does not leak internal workflow/process language;
10. required `REVISE` items have required fix, targeted re-review of changed evidence, `PASS`, and Human approval before closure;
11. intended runtime/version contract is recorded and actual build/release runtime evidence matches it or the mismatch is explicitly approved;
12. deployment state is verified from evidence;
13. final production-origin preflight passes for canonical, sitemap, robots sitemap reference, placeholder/example domains, custom-domain vs `vercel.app` canonical, apex/www choice, redirects, and live production behavior;
14. disabled/deferred/unconfigured monetization has zero ad-specific output, or enabled monetization has reconciled placement evidence and Human Ads Review;
15. `CURRENT_STATUS.md` reflects remaining blockers.

## V2.7 WS-06A command and evidence enforcement

For finite candidate evolution, the separate [bounded development execution](#bounded-development-readiness-execution) below governs development continuation only; the strict raw/full acceptance and production rules in this section remain intact.

Read selected Starter package.json first. If check:browser is absent, HARD STOP; do not infer it from this document or the roadmap. Verify its exact pinned development dependency and all three engines before running. Preserve npm run check and both WS-02 adoption gates. Run npm run check:browser only with the actual supported canonical Contract input and a fresh CORE_BROWSER_EVIDENCE_DIR for audited results.

Require47 planned/executed/PASS,0 FAIL/NOT_RUN/skip, every required assertion and matching source/build/engine/revision. Record uncommitted source plus HEAD, real HTTP404, local .table-scroll, breakpoints, live focus migration, no-JS/reduced-motion and successful cleanup. Missing engine, incomplete evidence, build/server failure or unavailable identity blocks. Machine checks cannot fill human focus/contrast approval. Core proof does not complete composed-site, real-game, REF or release acceptance; do not promote capability outcomes. Runtime bugs require a narrowly reviewed plan amendment.

Contract evidence mode: default FILE_SHA256 requires the real accepted SOP Contract file and exact observed hash; missing/mismatched file fails without automatic fallback. Standalone Core CI explicitly uses PINNED_REFERENCE with null filePath/observedSha256 and does not verify SOP bytes or triad compatibility. A cross-artifact/independent V2.7 acceptance gate requires FILE_SHA256; reference-only evidence is insufficient and must HARD STOP there.

## WS-06A WebKit verification policy V1 — separate closure evidence

The canonical Contract and its capability requirements remain unchanged. `check:browser` and `validateBrowserEvidence` retain the strict raw 47/47 PASS gate. Every one of the 47 matrix cases must execute, with no skip/NOT_RUN/missing assertion. Preserve each original FAIL and every historical evidence file. A policy disposition never changes a raw row to PASS, N/A, SKIP or an exception.

The selected Starter must actually supply `verify:browser-closure`; inspect package.json rather than infer availability. This separate command can find the finite Core workstream **eligible for independent closure review** through either strict raw 47/47 PASS, or complete raw execution with only the exact accepted WebKit26.6/rev2359/darwin-arm64 input-profile failures plus complete independent Safari keyboard evidence. It is not automatic WS-06A acceptance. Chromium/Firefox failures, unknown infrastructure/failure details, missing or invalid evidence and stale source/build/engine identity fail closed. CI and the raw browser command remain strict and unchanged.

Plain-Tab dependent failures must match the accepted prerequisite failure detail and a bound native link-traversal probe, classified `ENVIRONMENT_PROFILE_BLOCKED`. A failed local table scroll must still prove focused wrapper, genuine overflow, no document overflow, received ArrowRight and unchanged native scroll; the pinned accepted 10-process control supports only `PRODUCT_EVIDENCE_UNRESOLVED`. Neither disposition is a product PASS. Pin policy ID `WS06A_WEBKIT_VERIFICATION_V1`, accepted proposal SHA256 `2696a9d7ee691fad07ea7b557a4acab706bb408ea0c5583c3bfe7bd5fb85d917`, and ArrowRight control SHA256 `1ff999e08c3c93d93baaca8260bee8c243c3e2367552e58ae9550473bc741344`.

Supplemental proof must cover exactly every failed case/assertion, with matching route/viewport/JS, Starter/source and independently captured manual fixture/final-dist identity. Record Safari/WebKit version, host, operator/date, real keys, observable focus/results and evidence artifacts. Accept only `HUMAN_PHYSICAL_KEYBOARD` or specifically authorized trusted system keyboard, never Playwright, injected events, programmatic focus/scroll, Option/Alt workarounds or changed Safari/macOS keyboard preferences. ArrowRight must genuinely move the table. The no-JS case must genuinely disable JavaScript; JS-enabled proof cannot substitute. A manifest declaration or synthesized positive unit fixture is not proof of real execution; an independent reviewer must inspect actual records/artifacts.

Human visual focus quality/contrast remains DEFERRED until separately reviewed. Core closure never completes AX-01/02/03 capability outcomes, assembled AX-03/PA-01, WS-06B, REF suites, WS-07 real adoption or release. Registry/outcome values are unchanged. Missing real Safari proof keeps WS-06A BLOCKED even when the policy implementation itself passes engineering tests.

## Bounded Development Readiness execution

Use the [SOP method](NEW_GAME_SITE_SOP_v2.7.md#bounded-development-readiness), [development QA](QA_CHECKLIST.md#bounded-development-readiness-audit) and [formal/development roadmap](../../../template/roadmap/GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md). The [iteration20 result](../../../template/codex/executions/v2.7-ws06a/iteration20/result.md) must show actual independent governance ACCEPT before this entrance is effective. Governance acceptance does not grant source readiness: the iteration20 initial record was NOT_EVALUATED, WS-06A BLOCKED, Safari proof0, WS-03 not started. Consult dated later readiness/mutation records for the current entrance state. This workflow record is not a Contract/Registry field, verifiedOutcome, PASS or P0/P1 exception.

1. Verify WS-02 and independent governance acceptance, exact triad/source/build/Contract identity and real commands in the selected Starter. Do not invent a readiness command/checker or reuse raw self-declared identity as an independent expected oracle.
2. Audit current-source readiness under SOP/QA: complete unchanged47 with0 skip/NOT_RUN, all non-WebKit PASS, exact accepted residual subset/current policy/native/control, each residual's same category/role/route/viewport/JS/motion/assertion Chromium+Firefox PASS, source/tool freshness and verified cleanup. Historical initial40 residual/80 counterpart counts are inputs, not fresh proof or a permanent product rule. Cross-engine corroboration is not Safari proof, WebKit equivalence or a PASS allowlist.
3. Submit a separate independent readiness decision, recording reviewer/date, expiry/triggers and exactly one nextWS-03 slice. Before any candidate code, HARD STOP unless readiness is current ACCEPTED_FOR_BOUNDED_DEVELOPMENT; NOT_EVALUATED/BLOCKED/STALE is insufficient. FullWS-06A acceptance remains a separate formal path.
4. Plan one finite candidate slice only, beginning03A;03C still depends on independently accepted actual03B interfaces,03D-search and03D-freshness remain separately planned/tested. No04A/05/04B/06B/07/08 development or formal Gate unlock is inferred.
5. Record pre-source, exact files/capabilities/interfaces and meaningful positive/negative evidence. Product source/config/build/verification/tool/host change makes the old readiness STALE immediately; the prior signature permits only starting that one slice, not perpetual continuation.
6. Run fastest targeted checks, then root `npm run check`, actual unadopted-final rejection and adopted validate/check/build. Run fresh unchanged `npm run check:browser` for the new source with exact independent expected/fixture/dist/engine/Contract identity. If raw qualification still returns FAIL/exit1, record it as such; expected residual does not mean browser tests PASS and no command exit is rewritten.
7. Add new slice-specific rendered/browser evidence as QA requires; base47 does not prove new theme/media/share/search/freshness surfaces. Recompute precise residual subset and current dual-engine counterparts. New location/assertion/surface failure, non-WebKit failure, unknown infrastructure, missing evidence, changed matrix/runner or weakened assertions causes HARD STOP; do not fold new failures into the old policy. Never manufacture proof with fake keys/focus/scroll, modifier/preference changes or tools bypassing an access refusal.
8. Normally stop preview, independently verify owned PID gone, then remove only the owned fixture; preserve evidence/failed runs. Cleanup failure blocks continuation. Submit actual new-source evidence for independent IMPLEMENTATION_ACCEPTED_FOR_CONTINUATION; without that verdict and current identities, HARD STOP before any next slice. The decision names that next slice only, not formalWS-03 ACCEPT or capability promotion.

Keep WS06A full acceptance, Development Readiness and slice continuation separately recorded. Raw FAIL, absent Safari and null capability outcomes remain visible; no EXCEPTION/N/A/NOT_SELECTED/WAIVED is generated. Current-source records bind SOP/Prompt/Starter/branch/HEAD/manifest, Contract/matrix/runner/closure/policy/control/raw/native/expected SHA, fixture source/dist, Playwright/all3 engines/revisions, host/platform/arch and dates/reviewer/expiry/next scope. Any relevant change requires new-source evidence and independent continuation, not old iteration17/19 signatures.

Safari absence/full06A unresolved retains formalWS-03 Gate open and04A integration/05/04B/06B/07/08/release hold; no AX-01/02/03 orPA-01 promotion, no commit/push/tag/merge/deploy/release authorization. Once stable: freeze exact source/build, fresh47/new surfaces, validate current policy/control, obtain current realSafari through an allowed trusted channel, run actualclosure, independently review full06A, reconcile every provisional slice and rerun stale evidence, then independently restore formal decisions/originalDAG. Genuine Safari FAIL requires product repair/regression/reproof; invested effort never waives P0/P1 or Human/rights/release duties. Commercial realSafari checks remain required even if strict raw qualification later passes.


## WS03A visual-role execution

Read the [SOP role method](NEW_GAME_SITE_SOP_v2.7.md#ws03a-semantic-visual-role-choice)
and [role QA](QA_CHECKLIST.md#ws03a-semantic-visual-roles-qa). Execute only an
accepted finite03A plan and a recorded project choice; never infer roles from
genre, name or logo. Shipped `game.config.ts` stays unconfigured for this candidate
slice; alternate choices belong only to owned synthetic adopted fixtures.

HARD STOP on unsupported roles, partial authored objects, arbitrary CSS/font/unit
payloads, invented enum values, role binding from routes/page types/modules,
focus/current or default geometry drift, controls below44px, or a Theme Engine
requirement. `src/core/theme-roles.ts` returns four identifiers only; theme CSS
owns values, BaseLayout binds site-wide roles, Inventory alone owns family accents.

Observe targeted tests fail before implementation, then pass; run root check,
unadopted expectedPP02 rejection and adopted final checks. Verify alternate
computed styles/hover in all3 engines and then run original `check:browser` on
post-change source. Preserve actual FAIL, independently bind fixture/dist,
validate current residual subset/counterparts/native/control and actual
`verify:browser-closure`, normally close only owned resources, then obtain
independent continuation. First mutation makes prior readiness STALE; old47 is
baseline only. No automatic game-identity/fidelity acceptance or formalGate closure.

## V2.7 candidate WS03B — bounded media contract

The populated Starter media manifest requires measured positive integer
`dimensions: { width, height }`, a non-empty private `rightsRef`, and, for video,
an authored `accessibleEquivalent` (text or a safe local/HTTPS link with label).
Optional public `credit: { text, url? }` requires non-empty text and HTTPS for its
URL. Source provenance, public attribution and rights decisions remain distinct:
`rightsRef` points to evidence and does not grant approval, imply VERIFIED, or
change any media lifecycle state. The pure presentation adapter excludes private
rights/workflow data, derives video ratio, and supplies intrinsic image dimensions.
Equivalents and provenance remain visible if a third-party player is blocked.

STOP on missing/invalid required metadata or invalid local assets/posters. Explicitly
migrate reviewed populated legacy records; never supply automatic dimensions,
approval defaults or alt/title-derived equivalent information. Empty/no-media
projects remain valid without placeholders. Keep hero/gallery/trailer vocabulary,
Page Inventory, routing and rights lifecycle authority unchanged. This slice does
not add OG/share, new providers, a rights engine, uploads or processing.

This candidate implementation does not close formal WS03/WS06A gates. Genuine
Safari keyboard evidence is still absent; capability promotion is NONE and the
release hold remains active. A source-bound continuation review cannot replace
full browser acceptance or human rights/visual approval.
