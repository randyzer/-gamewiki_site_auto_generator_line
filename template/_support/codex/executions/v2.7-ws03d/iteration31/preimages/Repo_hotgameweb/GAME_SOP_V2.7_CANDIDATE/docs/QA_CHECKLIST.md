# QA Checklist — V2.7 Candidate

## Purpose

This is the release gate.

A successful build is necessary but not sufficient.

## V2.7 Normative Identity and Capability Evidence

- [ ] Canonical Contract hash/path/version/owningArtifact match SOP manifest and Prompt reference.
- [ ] Section H preserves exactly 41 unique capability rows / 16 predecessor columns; no semantic or lifecycle drift.
- [ ] Evidence records bind actual artifact/project/build/config/assets, scope and applicable Verification Owner.
- [ ] NOT_RUN/PENDING/UNVERIFIED have null outcome; OBSERVED non-null has complete independent full-requirement evidence/reviewer/date.
- [ ] No current outcome is inherited from test count, support label or historical project PASS.
- [ ] Newer BLOCK/PENDING conflicts remain visible and required re-review is complete.
- [ ] N/A is conditional-only; non-selection optional-only; no applicable failure is hidden.
- [ ] Exceptions meet Contract §AA P2/NIT limits, approval/acknowledgment and expiry.
- [ ] REF-A/REF-B/REF-C satisfy all deterministic §V fixture/media/evidence obligations.
- [ ] PROJECT-* real adoption independently satisfies accurate-version obligations; cannot replace REF suite.
- [ ] Candidate is distinguished from release; no future Starter/browser commands are claimed available.

## Reusable Starter adoption / CI evidence

- [ ] Selected exact Starter package.json actually provides the two verification commands; unavailable commands stop this dependent verification.
- [ ] Root `npm run check` retains all existing suites and negative cases without skips.
- [ ] `npm run verify:unadopted-final` asserts PP-02 rejection of both validate and final build; arbitrary failure is not expected-failure proof.
- [ ] `npm run verify:adopted-final` provides exact source/build-scoped child results: validate=0, check=0, final build=0, evidence marker absent and unapproved privacy/terms absent; disposable copies cleaned up.
- [ ] Synthetic Field Notes proof is distinct from real-project, human, browser, media-rights and legal approval. Real projects still run their own canonical final pipeline.
- [ ] CI uses those same gates; production Core/dependencies/lockfile remain unchanged for WS-02. AX-01 browser evidence stays pending WS-06A.

## Bounded Development Readiness audit

This is a separate development checklist under the [SOP method](NEW_GAME_SITE_SOP_v2.7.md#bounded-development-readiness), not a replacement release gate. The [iteration20 governance amendment](../../../template/codex/executions/v2.7-ws06a/iteration20/result.md) must first receive actual independent ACCEPT; current-source readiness remains NOT_EVALUATED until a separate audit/review. WS06A_DEVELOPMENT_READINESS is a workflow record (NOT_EVALUATED/BLOCKED/ACCEPTED_FOR_BOUNDED_DEVELOPMENT/STALE), not capability PASS, a Contract/Registry field or §W outcome. P0/P1 is not waived.

- [ ] WS-02 and governance amendment independently accepted; next candidate scope is one WS-03 slice only.
- [ ] Full unchanged47 and all required assertions actually executed,0 NOT_RUN/skip/missing/duplicate; raw FAIL and actual command exit retained.
- [ ] All non-WebKit rows/assertions and repaired live-resize PASS; unknown infrastructure errors0.
- [ ] Current WebKit failed identities/details/dispositions satisfy the accepted policy and are an exact subset of independently accepted residual evidence; no new position/assertion even when totals decrease.
- [ ] Historical initial10 failed rows/40 assertions (37 ENVIRONMENT_PROFILE_BLOCKED,3 PRODUCT_EVIDENCE_UNRESOLVED) remain accurately labelled comparison input, not a permanent product count or PASS allowlist.
- [ ] Each current residual has exact same category/role/route/viewport/JS/motion/assertion Chromium row+assertion PASS and Firefox row+assertion PASS, no duplicate/missing counterpart; cross-engine corroboration is not Safari proof or WebKit equivalence.
- [ ] SOP/Prompt/Starter, branch/HEAD/working-tree manifest, Contract/matrix/runner/closure/policy/control/raw/native/independent expected SHA, fixture source/final-dist, Playwright/all3 engine versions/revisions, host/platform/arch match actual evidence.
- [ ] Dates/reviewer, named next slice, expiry/review triggers recorded; relevant source/config/build/verification/tool/host change makes readiness STALE, not inherited.
- [ ] Normal preview stop, independent PID-gone confirmation and owned-fixture removal verified; no signal fallback or false cleanup claim.
- [ ] Safari proof absence explicit, fullWS-06A BLOCKED and formalWS-03 Gate open; no AX-01/02/03 orPA-01 promotion, no04A/05/04B/06B/07/08 or release unlock.
- [ ] Independent current-source readiness review actually accepts ACCEPTED_FOR_BOUNDED_DEVELOPMENT; governance-only acceptance cannot fill this box.

### Per-slice continuation

- [ ] One finite slice only; changed files, touched capabilities, actual interfaces/migration, pre/post source and final build recorded.03C requires actual independently accepted03B input;03D-search/freshness stay separate.
- [ ] Meaningful targeted positive and negative checks pass; root `npm run check`, default-final expected rejection and adopted validate/check/build gates actually run and pass.
- [ ] Source change marks old readiness STALE; fresh unchanged47 records exact new source/build, all required assertions and actual raw result.
- [ ] Additional slice-specific rendered/browser evidence covers03A font/density/shape/state/focus/readability;03B valid/missing/failing/no-media/video equivalent/fallback;03C generated share/fallback/required-input rejection;03D enabled/disabled/results/no-results/error/safeURL or published/updated/patch/unknown freshness, as applicable. Base47 does not prove these new surfaces.
- [ ] Non-WebKit regressions0; current residual exact subset, policy/native/control valid and current dual-engine PASS counterparts complete; new surface failures are not appended to old residual evidence.
- [ ] Missing new-surface evidence, new failure, unknown infrastructure, weak assertions/changed matrix or runner, synthetic key/focus/scroll, Option/Alt/preference workaround, identity mismatch or cleanup failure causes HARD STOP / continuation BLOCKED.
- [ ] Normal cleanup verified and all failure evidence preserved; independent IMPLEMENTATION_ACCEPTED_FOR_CONTINUATION binds exact new source/build and named next slice only. This is not formalWS-03 ACCEPT or capability PASS.
- [ ] Release hold retained: Safari proof0/full06A unresolved does not unlock06B/07/08 or commit/push/tag/merge/deploy/release; visual focus/contrast remains separately human-reviewed.
- [ ] Final reconciliation planned: stable exact source → fresh47/new surfaces → current policy/control → realSafari → actualclosure eligibility → independent06A → every provisional slice rechecked/stale evidence rerun → formalWS-03 and originalDAG. RealSafari FAIL requires repair/reproof, never a P0/P1 exception.

## Content Reliability QA

- [ ] No fabricated game facts
- [ ] Numeric values are sourced
- [ ] P2/meta claims have sufficient evidence
- [ ] Community claims are labeled
- [ ] Competitor-only claims are not treated as facts
- [ ] Partial pages clearly limit their verified scope
- [ ] Patch-sensitive pages show appropriate freshness

## Evidence Resilience QA

- [ ] Required evidence is verified, not merely inferred from preferred tool success/failure
- [ ] Preferred transport failures are classified as `TRANSPORT_BLOCKED`, `AUTH_BLOCKED`, `UNAVAILABLE`, or `PARTIAL`
- [ ] Approved read-only fallback evidence preserves source/provenance identity
- [ ] Primary failure evidence and fallback verification evidence are both preserved
- [ ] No official source was silently downgraded to lower-authority evidence
- [ ] Project is BLOCKED only when required evidence itself cannot be verified

## Reviewer Capability QA

- [ ] Evidence-dependent independent review has reviewer capability preflight
- [ ] Reviewer can access required Git/source/status/execution/build/visual evidence classes
- [ ] Reviewer access gaps are classified as `REVIEWER CAPABILITY BLOCKED`
- [ ] Reviewer capability failures are not mislabeled as project blockers
- [ ] Failed review attempts remain in process history
- [ ] Safe reviewer-readable evidence channel exists before EXECUTED review

## Competitive Coverage QA

- [ ] Competitive Coverage Matrix exists
- [ ] Every material page family has `COVER_NOW`, `COVER_PARTIAL`, `DEFER`, or `NOT_RELEVANT`
- [ ] Material `DEFER` decisions are explained
- [ ] Partial-page coverage was considered before suppressing high-value families
- [ ] Material competitive gaps have human approval

## Minimum Wiki Coverage QA

- [ ] Getting Started / How to Play reviewed
- [ ] Core Gameplay / Progression reviewed
- [ ] Heroes / Characters reviewed
- [ ] Gear / Items reviewed
- [ ] Major Systems reviewed
- [ ] Worlds / Maps / Stages reviewed
- [ ] Updates reviewed
- [ ] FAQ / recurring questions reviewed
- [ ] Game-specific major families reviewed

## Navigation Coverage QA

- [ ] Primary navigation reflects major player tasks
- [ ] Important published families are visible in primary or secondary navigation
- [ ] Important P0 pages are not hidden only in deep links
- [ ] Dropdown/grouping exists when needed
- [ ] Actual navigation reconciles with approved `SITE_STRUCTURE.md`

## SEO QA

- [ ] Unique title
- [ ] Useful meta description
- [ ] Correct canonical
- [ ] One clear H1
- [ ] Internal links exist
- [ ] Breadcrumbs correct where used
- [ ] Structured data matches visible content
- [ ] Sitemap includes intended indexable pages
- [ ] No accidental noindex
- [ ] Hreflang correct if multilingual

## Production Origin Preflight

- [ ] Canonical URLs use the intended production origin
- [ ] Sitemap URLs use the intended production origin
- [ ] `robots.txt` sitemap reference uses the intended production origin
- [ ] No placeholder/example domain remains at final production readiness
- [ ] No `vercel.app` canonical remains when a custom domain is the intended production URL
- [ ] Apex/www choice is explicit and consistent
- [ ] Redirects are consistent with the chosen canonical host
- [ ] Provider/deployment target alone is not treated as public launch proof
- [ ] Live production behavior is inspected before launch is claimed

## Visual Identity QA

- [ ] Official Visual Evidence section exists in `PROJECT_BRIEF.md` or approved planning authority
- [ ] Visual direction derives from real game visuals, not only publisher corporate web colors
- [ ] Official key art / Steam capsule / gameplay screenshots / in-game UI / map-world / trailer evidence were prioritized where available
- [ ] Visual identity dimensions have evidence/status labels in `PROJECT_BRIEF.md`
- [ ] First viewport identifies the specific game and site purpose on desktop and mobile
- [ ] Generic Starter branding is replaced/adapted
- [ ] Template residue is replaced, neutralized, or intentionally retained
- [ ] Core colors are consistent
- [ ] Homepage and internal pages feel like the same game/site
- [ ] Accessibility/readability remains acceptable

## Visual Richness QA

- [ ] Internal pages are not all visually identical text sheets
- [ ] Major page families have appropriate visual hierarchy
- [ ] Cards/tables/quick facts/media blocks are used where they improve game comprehension
- [ ] Representative long-form pages have enough rhythm to scan without formulaic filler
- [ ] Intentional text-only pages remain composed and useful
- [ ] Page-family accents/variants do not become uncontrolled hard-coded styling

## Media Richness QA

- [ ] `docs/MEDIA_DECISION_TABLE.md` exists for new SOP-aligned public P0 routes
- [ ] Root `MEDIA_DECISION_TABLE.md`, if present, is treated only as legacy V2.6 Starter compatibility
- [ ] Root and `docs/` media decision tables do not both exist
- [ ] Every public P0 route has media need/candidate/rights/human decision/integration/visual gate states
- [ ] Lifecycle states use only exact SOP-defined values; unknown values are treated as malformed
- [ ] `pageId_or_route` resolves to exactly one Runtime Page Inventory `pageId` or `route`
- [ ] High-priority media is semantically verified, integrated, and visually accepted or human-reclassified/waived
- [ ] Homepage high-priority media unresolved at Human Visual Review is at least `REVISE` unless Human approves a no-media exception
- [ ] No-media routes have intentional rationale where material
- [ ] `NO MEDIA NEEDED` means useful, comprehensible, and visually complete without media
- [ ] `NO MEDIA NEEDED` is not used to hide unresolved rights
- [ ] Deferred recommended/optional media has owner or defer reason
- [ ] Homepage contains relevant game visual media when available
- [ ] Major P0 guides/hubs include relevant media when available
- [ ] Images/videos have traceable provenance
- [ ] Competitor media is not copied by default
- [ ] Selected media semantically matches the page topic
- [ ] Images have meaningful alt text where appropriate
- [ ] Media is reasonably optimized
- [ ] Video embeds do not break mobile UX
- [ ] Third-party media failure/fallback states look intentional where blank rendering would look broken

## Human Visual Review QA

- [ ] `HUMAN_VISUAL_REVIEW_EVIDENCE.md` exists
- [ ] Fresh review output was generated with `npm run build:evidence`
- [ ] Evidence output is labeled `NOT FINAL` and contains `dist/EVIDENCE_BUILD_NOT_FINAL.json`
- [ ] Evidence-build success is not reported as canonical final build `PASS`
- [ ] Evidence generation did not mutate lifecycle state, infer Human approval, inherit historical `PASS`, or convert `PENDING` into approval
- [ ] Only an exact contract-valid Human/visual `PENDING` projection was tolerated; `REVISE`, `BLOCK`, malformed/unsupported state, and deterministic correctness errors remained blocking
- [ ] Screenshots are current and labeled
- [ ] Homepage desktop around 1440px reviewed
- [ ] Homepage mobile around 390px reviewed
- [ ] Representative page families reviewed or marked `NOT APPLICABLE` with Page Inventory evidence
- [ ] At least one whole-page or top/middle/bottom review checks header/body/CTA/media/footer consistency
- [ ] Technical Visual QA is recorded
- [ ] Game Recognition is recorded
- [ ] Visual Identity is recorded
- [ ] Media Density is recorded
- [ ] Semantic Media Matching is recorded
- [ ] Responsive Visual is recorded
- [ ] Media Failure State is recorded
- [ ] First-viewport recognition, template residue, rhythm, media/no-media lifecycle state, and mobile ordering are recorded
- [ ] Human accepted any remaining visual/media debt

## Monetization / Ads QA (Conditional)

If monetization is disabled, deferred, or unconfigured:

- [ ] Generated output contains no ad wrapper, provider container, reserved ad space, provider script/bootstrap, or provider request reference

If monetization is enabled:

- [ ] Provider-specific configuration/bootstrap/markup is separate from semantic page placement
- [ ] Where applicable, placements normally attach to stable semantic content anchors; project/provider-specific exceptions are allowed when deviations are intentional and reviewable rather than accidental; any homepage primary placement is reviewed in whole-page context rather than against a universal pixel or screen-depth rule
- [ ] Known or reasonably predictable dimensions reserve appropriate responsive space; unknown dimensions do not create a fabricated large blank region
- [ ] Provider slot/key/container/script reuse matches documented provider/project multiplicity rules
- [ ] Public slot identity is allowed by the provider contract and no private API key, admin token, account secret, or credential reaches browser/public output
- [ ] Ad output does not obscure core/SEO content, cause accidental `noindex`, block navigation, create severe layout breakage, or cause uncontrolled horizontal overflow
- [ ] An apparent blank/dark region was diagnosed in order: slot count, provider container, wrapper, CSS spacing/size/background, parent layout, then provider/request/environment
- [ ] `requested`, `rendered`, and `viewable` are recorded as separate evidence claims
- [ ] Automation/provider failure is not reported as ordinary-browser or production delivery failure without supporting evidence
- [ ] `PROVIDER/ENVIRONMENT CHECK REQUIRED` and `HUMAN_BROWSER_CHECK_REQUIRED` are used only as review/handoff classifications, not lifecycle states
- [ ] Existing Human Visual/Release evidence contains the Human Ads Review result for placement, obstruction, desktop/mobile layout, blank regions, provider rendering where material, locale-semantic consistency, multiplicity, and obvious UX regression

Static/CI checks own deterministic structure, disabled absence, duplication, and output safety. Ordinary-browser provider delivery and lived placement quality remain Human review concerns where automation cannot establish them.

## Player-Facing UX QA

- [ ] Public pages lead with player questions/tasks
- [ ] Internal Priority scores are not prominently exposed
- [ ] SEO Search Signal labels are not prominently exposed
- [ ] Internal tags/editorial notes do not dominate public UI
- [ ] Sources/Last Verified are presented in a player-appropriate way
- [ ] Core pages feel like a game wiki/site, not an internal research report
- [ ] Public source rendering uses public-safe fields such as hostname/URL, source type, dates, and neutral link text
- [ ] Internal evidence metadata such as `evidenceNote`, internal reviewer notes, planning evidence, workflow state, or approval state is not rendered by default

## Public Workflow-Language QA

- [ ] Visible public text was inspected for internal workflow/process language that is not meaningful to players/users
- [ ] Internal priority state such as P0/P1/P2 is not exposed as public process status
- [ ] Internal phrases such as planning evidence, Human approval, release approval, later approval, before publication, internal reviewer state, or internal gate state are not leaked as public copy
- [ ] Legitimate editorial uses of release, review, publication, patch, update, priority, or approval are preserved when meaningful in context
- [ ] No naive keyword-ban rewrite was used as a substitute for contextual review

## Planning-to-Implementation Reconciliation

- [ ] Approved Site Structure matches actual public routes
- [ ] Approved Navigation Plan matches actual navigation
- [ ] Approved P0 coverage matches public pages
- [ ] Approved visual/media plan is reflected in core pages
- [ ] Public P0 route media lifecycle matches actual media/no-media/defer states
- [ ] No-media and media deferrals have required human approvals
- [ ] Human Visual Review evidence reflects the current rendered build
- [ ] Any shrinkage/addition is documented and approved

## Page Inventory QA

- [ ] Every live page exists in runtime Page Inventory SSOT
- [ ] P0/P1/P2 state is correct
- [ ] Draft/private content does not leak
- [ ] Navigation/sitemap/search reconcile with Inventory

## Pagefind Artifact and Budget QA

- [ ] Release size is measured against the normalized contract-required Pagefind payload, not the raw vendor directory
- [ ] Normalized contract-required Pagefind payload is no more than 800,000 B
- [ ] Raw Pagefind-directory total is recorded only as diagnostic evidence
- [ ] Required runtime/index artifacts are present
- [ ] Known optional stock UI already absent is accepted and is not treated as a failure by itself
- [ ] Any removed optional vendor UI was deterministically proven unrequired and unreferenced by Starter-owned verification
- [ ] Present optional UI with unproven reference safety fails closed
- [ ] Unknown/unsupported Pagefind structure or vendor contract fails closed
- [ ] No project-local Pagefind cleanup adapter or vendor-filename knowledge is required

## Site QA

- [ ] Main navigation works
- [ ] Footer links work
- [ ] No broken internal links
- [ ] No unexpected 404
- [ ] Mobile layout works
- [ ] Required rendered screenshots show no major overlap or blank intended regions
- [ ] Header/body/footer/CTA/media framing feel like one coherent site
- [ ] Tables/media usable on mobile
- [ ] No broken intended media
- [ ] Favicon/basic assets load
- [ ] No obvious console-breaking error

## Performance QA

- [ ] Images optimized
- [ ] Local media paths resolve
- [ ] Media dimensions/aspect behavior preserves layout
- [ ] Lead media eager/lazy loading intent is deliberate
- [ ] Below-fold media loading intent is appropriate
- [ ] Video poster/preload behavior is deliberate where video exists
- [ ] Unusually large local video/media has observed behavior and human approval
- [ ] No severe layout shift
- [ ] No obvious blocking asset issue
- [ ] Core pages load acceptably on mobile

## Launch QA

- [ ] After Human lifecycle approval and final reconciliation, `npm test` passes
- [ ] After Human lifecycle approval and final reconciliation, `npm run validate` passes
- [ ] After Human lifecycle approval and final reconciliation, `npm run check` passes
- [ ] Canonical `npm run build` passes final fail-closed validation
- [ ] Canonical final output does not contain `dist/EVIDENCE_BUILD_NOT_FINAL.json`
- [ ] Evidence-build success was not substituted for any final gate

- [ ] Deployment succeeded
- [ ] Actual deployment target/state verified
- [ ] Canonical uses intended production domain
- [ ] Sitemap loads
- [ ] Robots loads
- [ ] Sitemap and robots sitemap reference use intended production origin
- [ ] No placeholder/example domain remains
- [ ] No `vercel.app` canonical remains when custom domain is intended
- [ ] Apex/www canonical host and redirects are consistent
- [ ] Homepage/important Hubs are indexable
- [ ] Search Console planned/complete

## Required Fix Closure QA

- [ ] Each required `REVISE` item has a recorded required fix
- [ ] Changed evidence was inspected by targeted re-review
- [ ] Targeted re-review produced `PASS` before Human approval closed the item
- [ ] Fix-author self-report was not treated as closure by itself
- [ ] Failed or incomplete targeted re-review attempts remain visible in process history

## Blocking Rule

Launch is blocked by:

- fabricated/unsupported facts;
- materially unapproved competitive-coverage gaps;
- navigation that hides core published families;
- widespread 404/broken mobile;
- wrong canonical/robots/noindex;
- placeholder/example production origin or stale `vercel.app` canonical when custom domain is intended;
- inconsistent apex/www canonical host or redirects;
- unchanged generic Starter identity that conflicts with the game;
- missing or stale required screenshot evidence;
- first viewport that is generic, unrecognizable, or has an empty/broken intended media region;
- technical visual QA that passes while real game recognition fails;
- strongest-competitor useful visual/media support materially ahead without recovery plan, waiver, or justified product/genre reason;
- unresolved high-priority route media without human-approved reclassification/waiver;
- homepage high-priority media unresolved at Human Visual Review without explicit no-media exception;
- broken intended media or media that breaks mobile UX;
- blank/broken-looking third-party media fallback state;
- semantically mismatched selected media;
- major template residue marked `UNRESOLVED`;
- major header/body/footer/CTA/media inconsistency;
- homepage/core experience that is materially text-only despite available approved media;
- public pages dominated by internal research/SEO metadata;
- public pages leaking internal workflow/process language as player-facing copy;
- required `REVISE` item closed without targeted re-review `PASS` and Human approval;
- missing required Pagefind artifacts, unknown/unsupported Pagefind structure, or unproven optional-artifact reference safety;
- normalized contract-required Pagefind payload above 800,000 B;
- evidence output treated as final, evidence marker retained in canonical output, or Human Visual `PASS` inferred by automation;
- disabled/deferred/unconfigured monetization leaves ad-specific DOM, layout, script, or request residue;
- provider and placement responsibilities are conflated, private credentials reach public output, or slot/key/script multiplicity is assumed without provider/project support;
- enabled monetization lacks required Human Ads Review, obstructs core content/navigation, or has a severe unexplained layout region;
- `requested`, `rendered`, or `viewable` is overclaimed, or automation failure is mislabeled as production-delivery proof;
- material mismatch between approved Site Structure/Navigation and actual implementation.

## V2.7 WS-06A Core evidence checklist

- [ ] Selected Starter supplies the real check:browser command; pinned dev dependency and Chromium/Firefox/WebKit are available.
- [ ]All47 same-build rows execute (27 baseline/3 no-JS/12 boundary/4 reduced-motion/1 resize); no skips, missing assertions or NOT_RUN. Strict raw PASS requires0 FAIL; separate workstream closure policy below preserves raw FAIL.
- [ ] Source/build/engine/revision/Contract identities are exact; uncommitted work is included, and Contract input verification is accurately labelled.
- [ ] True404 recovery, local long-table keyboard scroll, <=1px document overflow, keyboard disclosure/focus cleanup and final link reachability pass.
- [ ]899/900/901 navigation and619/620/621 actual header/meta/404 changes, live child-focus migration, no-JS and reduced-motion pass.
- [ ] Existing WS-02 gates remain green; runtime/config/Inventory and canonical Contract remain unchanged; cleanup succeeds.
- [ ] Human visual focus/contrast, assembled evidence, real-game adoption, REF suite and release remain separately required. Browser execution statuses are not capability outcomes.

Contract evidence mode: default FILE_SHA256 requires the real accepted SOP Contract file and exact observed hash; missing/mismatched file fails without automatic fallback. Standalone Core CI explicitly uses PINNED_REFERENCE with null filePath/observedSha256 and does not verify SOP bytes or triad compatibility. A cross-artifact/independent V2.7 acceptance gate requires FILE_SHA256; reference-only evidence is insufficient and must HARD STOP there.

## WS-06A WebKit verification policy V1 — separate closure evidence

The canonical Contract and its capability requirements remain unchanged. `check:browser` and `validateBrowserEvidence` retain the strict raw 47/47 PASS gate. Every one of the 47 matrix cases must execute, with no skip/NOT_RUN/missing assertion. Preserve each original FAIL and every historical evidence file. A policy disposition never changes a raw row to PASS, N/A, SKIP or an exception.

The selected Starter must actually supply `verify:browser-closure`; inspect package.json rather than infer availability. This separate command can find the finite Core workstream **eligible for independent closure review** through either strict raw 47/47 PASS, or complete raw execution with only the exact accepted WebKit26.6/rev2359/darwin-arm64 input-profile failures plus complete independent Safari keyboard evidence. It is not automatic WS-06A acceptance. Chromium/Firefox failures, unknown infrastructure/failure details, missing or invalid evidence and stale source/build/engine identity fail closed. CI and the raw browser command remain strict and unchanged.

Plain-Tab dependent failures must match the accepted prerequisite failure detail and a bound native link-traversal probe, classified `ENVIRONMENT_PROFILE_BLOCKED`. A failed local table scroll must still prove focused wrapper, genuine overflow, no document overflow, received ArrowRight and unchanged native scroll; the pinned accepted 10-process control supports only `PRODUCT_EVIDENCE_UNRESOLVED`. Neither disposition is a product PASS. Pin policy ID `WS06A_WEBKIT_VERIFICATION_V1`, accepted proposal SHA256 `2696a9d7ee691fad07ea7b557a4acab706bb408ea0c5583c3bfe7bd5fb85d917`, and ArrowRight control SHA256 `1ff999e08c3c93d93baaca8260bee8c243c3e2367552e58ae9550473bc741344`.

Supplemental proof must cover exactly every failed case/assertion, with matching route/viewport/JS, Starter/source and independently captured manual fixture/final-dist identity. Record Safari/WebKit version, host, operator/date, real keys, observable focus/results and evidence artifacts. Accept only `HUMAN_PHYSICAL_KEYBOARD` or specifically authorized trusted system keyboard, never Playwright, injected events, programmatic focus/scroll, Option/Alt workarounds or changed Safari/macOS keyboard preferences. ArrowRight must genuinely move the table. The no-JS case must genuinely disable JavaScript; JS-enabled proof cannot substitute. A manifest declaration or synthesized positive unit fixture is not proof of real execution; an independent reviewer must inspect actual records/artifacts.

Human visual focus quality/contrast remains DEFERRED until separately reviewed. Core closure never completes AX-01/02/03 capability outcomes, assembled AX-03/PA-01, WS-06B, REF suites, WS-07 real adoption or release. Registry/outcome values are unchanged. Missing real Safari proof keeps WS-06A BLOCKED even when the policy implementation itself passes engineering tests.


## WS03A semantic visual roles QA

Apply the [SOP role method](NEW_GAME_SITE_SOP_v2.7.md#ws03a-semantic-visual-role-choice)
to the exact candidate source/build. Technical role checks do not replace human
visual review or the formal browser/release gates.

- [ ] Legacy omission preserves exact default fonts, responsive geometry, square surfaces and decorative hover.
- [ ] An authored choice contains all four supported enum values; unknown/partial/CSS payloads fail closed.
- [ ] Resolver exposes four immutable identifiers; HTML role binding and Inventory page-family authority stay separate.
- [ ] Palette mapping, focus/current/open semantics, keyboard recovery and reduced-motion guards remain invariant.
- [ ] Alternate final build shows real font/density/shape/quiet-hover effects in Chromium, Firefox and WebKit; interactive targets remain at least44px.
- [ ] New-source root/adoption checks and all47 original browser cases execute; current residual subset/counterparts, native/control/policy and independent source/build identities are valid.
- [ ] Preview stops normally, ownPID is gone, ownedfixture and allowlisted inventoried temporary caches are removed without signals.
- [ ] Old readiness is marked STALE on mutation; independent continuation names only the next slice. Safari0/full06A/formalWS03/release holds and null capability outcomes remain visible.

## WS03B bounded media contract QA

- [ ] Every populated asset has explicit positive integer width/height and a non-empty private rights evidence pointer; legacy data was reviewed and explicitly migrated.
- [ ] Credit is optional public attribution, with non-empty text and HTTPS URL if present; provenance and evidence pointers never imply rights approval.
- [ ] Every video has useful authored equivalent text or a safe local/HTTPS transcript link, distinct from its title; equivalent and source remain visible when the player is blocked.
- [ ] Images emit intrinsic dimensions and retain responsive natural proportions; video ratio derives from the same metadata without forced 16:9 defaults.
- [ ] Captions, credits and equivalents are escaped; rightsRef and workflow/approval data are absent from public output.
- [ ] Missing local assets/posters, unsafe links and unknown metadata fail validation; no automatic approval, dimensions or runtime placeholder masks failure.
- [ ] Empty manifest/no-slot pages remain complete without empty hero/gallery/trailer shells; disposable synthetic QA assets never enter the canonical manifest.
- [ ] Targeted three-engine desktop/mobile media evidence and fresh unchanged 47-row regression are bound to current source/build/tool/host identities.
- [ ] Formal WS03/WS06A acceptance and release holds remain explicit while genuine Safari keyboard evidence is absent; no capability promotion from this candidate slice.

## WS03C share metadata QA

- [ ] Explicit/default share IDs reference existing informative ImageAssets in the same media manifest; no video/decorative/unknown share references or separate SEO image registry.
- [ ] Selection is page.share, then informative hero, then defaultShare, then none; no gallery/filename/route guessing or approval inference.
- [ ] Every enabled indexable final page resolves share media and emits exactly one matching OG/Twitter image, correct intrinsic dimensions/alt and summary_large_image card.
- [ ] Local share assets exist in final dist; missing/tampered/duplicate metadata and private evidence leaks fail generated audit.
- [ ] Share-only references create no body image or new visual placement; empty manifest remains structurally valid and missing share alone is not a noindex failure.
- [ ] Synthetic default media stays in disposable adopted QA projects; real-project rights and suitability require human review.
- [ ] Current three-engine head/local-asset proof, fresh unchanged47, residual/counterpart/closure identities and normal cleanup are recorded; original failures and Safari/formal/release holds remain explicit.
