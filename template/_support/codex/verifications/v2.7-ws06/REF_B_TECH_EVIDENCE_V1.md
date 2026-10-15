# REF-B Task and Calculator Technical Evidence V1

State: READY FOR INDEPENDENT REVIEW — PLAN50 / S3 technical evidence only.
Execution: `c2c_a765`, iteration 50; predecessor REVIEW49 ACCEPT — S2 TECH ONLY.
Recorded 2026-10-08. No full REF-B or WS06B acceptance declared by Codex.

## Exact scope and source

Exactly three newly created Active files:

1. [reference-b.test.ts](/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/reference-b.test.ts)
2. [budget-figure.svg](/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/fixtures/reference-media/budget-figure.svg)
3. This report.

Candidate: `/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`; branch `v2.7/evolution`; HEAD `b067e8d4050478072f25a1dc78a8526cdd128cfd`; tree `1df0ade30b1eaf51a76820c8d8b83337786f0dc1`.

Actual source is the repaired current working tree, including accepted About repair and existing untracked freshness/media/search/theme runtime sources, not HEAD alone. The pre-existing tracked binary diff remains SHA256 `7e88479dde6d1815b6ac4e8f27365aab3b402f2925d819b893e5bb59f02163e7`; start status/diff/identity captured outside workspace. REF-A S1/S2 dev-only additions are existing scope and are not rerun or edited in PLAN50.

Existing dependency identities: package SHA256 `9f45e85bfa007fa00f82374fc53ac0e97348d9956779d1da8e6caf4053b83e05`; lock SHA256 `d87e14d1afb4e155bc03c0a40620cf346831843697d55769f693462f3fb9d616`. Pinned Node 22.22.0, pre-installed Playwright 1.63.0. No installation/update.

Product/Core/runtime delta **0**. Existing tests/helpers/config/schema, REF-A, governance, SOP/Prompt/Contract and history unchanged. No new dependency, abstraction, runtime field, Pattern component/ID/schema, composition framework or calculator implementation.

## Existing authority and synthetic task

The test reuses `createCoreBuildFixture` to copy the current Candidate into an owned temporary project with isolated build caches and existing dependencies. Only that copy receives synthetic Config, Inventory, two MDX guides, a tool JSON definition, Media Manifest mapping and media decision table. Source authorities are untouched.

- Config enables guides/calculator and resolves navigation/featured references.
- Inventory owns routes/page IDs/publication/source dates/ordered relationships.
- Ordinary MDX expresses direct answer, ordered steps, comparison assumptions, mistake/recovery, completion and a manual next action. No dedicated QuickAnswer/Steps/Comparison/NextStep component is claimed.
- Existing `calculatorDefinitionSchema`, `loadToolDefinition`, `normalizeCalculatorInputs`, `evaluateCalculator`, `ToolShell` and hydrated `CalculatorIsland` consume the tool definition. The existing formula contract is reused, not newly introduced.
- Manifest owns the original diagram, guide gallery and default share image. The follow-up checklist has no visible media mapping; default OG image does not turn it into a media-rich article.

The fictional Lantern Relay budget task is explicitly disclosed as “Fictional QA scenario for Starter regression testing; not a real commercial game.” Under `QA relay rules v1`, this fixture compares **Amber Lantern quantities**, at four fictional units per lantern. Three cost 12; five cost 20; two extra add 8. Relay Cells and other supplies are explicitly excluded. This does not contradict the separate REF-A three-cell walkthrough, invent real-game costs, or claim current market data.

Quantity range 1–10/default 3; fictional unit-value range 1–20/default 4. Rule: quantity × unitValue. Page/definition source access 2026-10-07 and update 2026-10-08 are synthetic QA samples, not real-game verified-at evidence. Source provenance is fixture-authored editorial, with private evidence notes excluded from public HTML/island serialization.

The project-authored 1200×675 SVG visibly compares 3×4=12 against 5×4=20; it has informative alt, actual dimensions, meaningful caption/credit and original-authorship evidence pointer. Video is explicitly excluded because a short multiplication/comparison is fully explained by text and a static diagram. That is a task decision, not a rights waiver. Human/visual decisions remain PENDING; no Human approval fabricated.

## Actual command and outputs

Run from Candidate using Node 22.22.0:

```sh
PATH=/Users/randyz/.nvm/versions/node/v22.22.0/bin:$PATH V27_REF_B_EVIDENCE_DIR=/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan50-34h464m1 npm exec -- vitest run tests/reference-b.test.ts --disableConsoleIntercept
```

Actual exit **0**, **4/4 tests PASS** on first attempt, 2026-10-08 23:20 UTC+8. No failure suppressed/skipped. REF-A was not rerun.

| Check | Actual result | Scope |
| --- | --- | --- |
| Temporary `npm run validate` | exit **1**, exact one HIGH PRIORITY/PENDING media error for `guide.relay-budget` | Expected final approval rejection, not final validation PASS. |
| Temporary `npm run build:evidence` | exit **0**; 7-route reconciliation/build audit PASS | Actual generated output remains evidence-only, `final=false`, Human review required. |
| Schemas/loader/evaluator | PASS | Actual tool loaded from temporary canonical tool JSON, known references/media validated, formula referencing unknown input rejected. |
| Pure valid states | 3×4=12; 5×4=20 | Existing evaluator, not hardcoded output. |
| Pure invalid/non-finite states | 999→10/result40; NaN quantity→3/result12; infinite unit value→4/result12 | Existing normalization; not inferred UI behavior. |
| Content/media output | PASS | Direct answer, list, quantity comparison/exclusions, recovery, completion/manual next link, original diagram/caption/credit, no video or empty checklist media slot. |
| Canonical/residue/private-source checks | PASS | Existing audit retained; no inherited Game Atlas/live-state/private evidence note in generated pages; actual tool island output inspected. |
| Actual HTTP unknown route | **404** | Existing error consumer; not a successful placeholder. |

Generated actual routes:

| Route | Existing consumer |
| --- | --- |
| `/` | Existing homepage composition with synthetic disclosure/useful references |
| `/guides/` | Existing guides hub |
| `/guides/relay-budget/` | WikiArticle/ordinary MDX/TOC/gallery |
| `/tools/relay-budget/` | ToolShell/hydrated CalculatorIsland |
| `/guides/check-budget/` | WikiArticle/text-only manual follow-up task |
| `/about/` | Existing repaired About consumer |
| `/404.html` | Existing error/recovery consumer |

Pagefind indexed six indexable pages; interactive search was not enabled/tested. Existing generated audit covers sitemap/robots and output safety; no new audit tool.

## Actual targeted browser observations

Existing dev-only Playwright **1.63.0**, headless Chromium **153.0.8010.12**. Separate contexts: **1280×960** and **390×844**, JS enabled, reduced motion `reduce`. An owned temporary preview served actual generated output. No screenshot captured in PLAN50.

For **both** viewports, the test actually executed:

1. Open guide HTTP 200; original figure loaded with natural width 1200 and displayed within viewport; document has no horizontal overflow.
2. Click ordinary MDX calculator link, reach real tool route and wait for Astro island hydration.
3. Observe default quantity 3/output `12 QA units`.
4. Fill quantity 5 → output `20 QA units`.
5. Fill quantity 999 → existing controlled input clamps to 10/output `40 QA units`.
6. **Actually clear numeric quantity input** → value 3/output `12 QA units`; then clear unit value → value 4/output `12 QA units`. This is browser UI evidence, not a pure NaN assertion substituted for empty-input proof.
7. From the quantity input, press Tab → actual active element is unit value; Shift+Tab → quantity; ArrowUp → quantity 4/output `16 QA units`.
8. Check tool document has no horizontal overflow.
9. Click tool's existing RelatedPages return-to-guide link, then guide's ordinary **manual next-action link** to `/guides/check-budget/`; observe QA revision text at the destination.
10. Record zero page JavaScript exceptions during the observed journey.

These are limited Chromium task, numeric normalization, input focus and document/figure geometry observations. They do **not** establish full keyboard navigation, all focus/target/contrast/CLS/obstruction breakpoints, mobile-device behavior, Firefox/WebKit/Safari, AX, no-JS or a complete assembled browser gate. RelatedPages is a return/read-more relationship, not an automatic next-action/recommendation system; the next action is authored MDX.

Owned Chromium contexts/browser closed. Owned preview PID **66012** stopped normally via `npm run preview -- stop` (exit 0), PID verified gone; temporary fixture `starter-reference-b-t1DkCi` removed/absence asserted. No fallback signal or unowned process termination.

## Evidence location and unchanged gates

Outside workspace: `/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan50-34h464m1/` holds start status/diff/identity, `test-attempt1.log`, `generated-output/`, `fixture-media-decisions.md`, lightweight scope checks and exact three-file diff. Raw targeted commands, actual generated HTML/media/decision output and scope evidence are released through connected execution_output. Report/test/reference links must resolve; all earlier REF-A/proof/failure evidence preserved.

Current result: **REF-B technical task/consumer evidence ready for independent review**. Human title-to-answer/content/media/no-media/visual acceptance remains **PENDING**. Full REF-B, full REF-A and WS06B **NOT ACCEPTED**; REF-C not implemented; Safari/AX **UNPROVEN**; WS07 **0/3**; Global PRODUCT/RELEASE **NOT ACCEPTED**. No full47, unrelated browser suite, Core change, governance change, commit/push/tag/merge/deploy/release. Execution stops for ChatGPT independent review; next slice not started.


## PLAN52 / S5 — targeted assembled observations (append-only)

Execution `c2c_a765`, iteration 52; predecessor REVIEW51 ACCEPT — REF-C S4 TECHNICAL EVIDENCE. **READY FOR INDEPENDENT REVIEW**, not full REF-B ACCEPT. Earlier report content above remains byte-unchanged.

The approved optional dev-only test `tests/reference-assembly-browser.test.ts` was required because the accepted A/B/C tests neither observe all actual link journeys/TOC/FAQ nor exercise empty/synthetic ad geometry. Existing A/B/C tests/helpers/assets were not edited or rebuilt. No fixture content model, generic runner/registry, Core change or new dependency was introduced. Exactly four Active files changed in S5: this report, the other two Reference reports, and the new named test. Product/Core/runtime/Governance/SOP/Prompt/Contract delta = 0.

### Accurate source/build identity

Candidate branch `v2.7/evolution`, HEAD `b067e8d4050478072f25a1dc78a8526cdd128cfd`, tree `1df0ade30b1eaf51a76820c8d8b83337786f0dc1`. Actual repaired working-tree production source remains unchanged from the accepted REF fixture runs; the tracked binary diff SHA256 remains `7e88479dde6d1815b6ac4e8f27365aab3b402f2925d819b893e5bb59f02163e7`. Pre-run Git status/identity/diff and allowed report bytes are retained in [v27-plan52-x7ord2ky](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky). Package/lock and A/B/C test source identities remain unchanged. Node 22.22.0; pre-installed Playwright 1.63.0.

Retained actual accepted output: `/private/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan50-34h464m1/generated-output`. Its whole generated-output identity for **this test's sorted relative-path + NUL + file-bytes algorithm** is `0c280f581ecaadb16f17f3cd3a6e0467f15c701c63dea2d324cc5a902bbe8a6c`. This is a small exact-output hash, not the previous run's different hash algorithm or a new 6000+ workspace fingerprint. An owned isolated preview copied these output bytes and asserted identity before and after observation; the retained source output was never mutated. `EVIDENCE_BUILD_NOT_FINAL.json` remains `final=false`, `mode=evidence`. No final build/validation approval was inferred.

### Executed observations and §V mapping

Actual engine: **Chromium 153.0.8010.12**, not Firefox/WebKit/real Safari. JavaScript enabled, `reducedMotion=reduce`.

| Viewport | Actual result | Existing authored click journey (starts at home) | Article observations |
| --- | --- | --- | --- |
| 1280×960 | PASS | /guides/ → /guides/relay-budget/ → /tools/relay-budget/ → /guides/relay-budget/ → /guides/check-budget/ | `#choose-the-quantity`; FAQ `NOT_PRESENT_NOT_REQUIRED`; media loaded/captioned and within viewport; no document overflow; JS errors 0 |
| 390×844 | PASS | /guides/ → /guides/relay-budget/ → /tools/relay-budget/ → /guides/relay-budget/ → /guides/check-budget/ | `#choose-the-quantity`; FAQ `NOT_PRESENT_NOT_REQUIRED`; media loaded/captioned and within viewport; no document overflow; JS errors 0 |

For each viewport, HTTP link crawl also checked unique local destinations from home and the journey routes (not external provenance URLs). Actual clicks, not URL assignment, followed the listed authored journey. Article was separately opened to observe TOC/media. TOC click changed the fragment to an actual rendered heading. Reduced-motion media query matched; computed root scroll behavior was `auto`, reveal animation duration `1e-05s`. Mobile Menu target was at least 24×24 CSS px; actual Escape closed the root and restored summary focus. This is a limited measured target/focus observation, not complete AX acceptance. The existing unknown-route response was actually HTTP404. Browser contexts/browser closed, each owned preview stopped with exit0/PID gone, and temporary fixtures were removed. No cleanup fallback was needed.

Applicable Contract §V coverage: link journey/crawl, TOC, media presentation, responsive/overflow and limited keyboard/motion observations. Existing earlier evidence still supplies SEO/schema, source semantics and the Reference-specific task assertions; it is not relabeled as new S5 execution.

REF-B-specific §V: actual authored guide→tool→guide→manual-next-check journey was completed in both viewports. Existing S3 evaluator/hydrated valid/invalid/empty tests remain the accepted calculation evidence; S5 did not rerun them or claim a new state. The 1200px-original task diagram rendered at 576px desktop / 362px mobile and loaded with caption. No table or FAQ was added; the current prose comparison and static explanatory figure are the accepted minimal input. Ad config remains disabled; enabled ad scenarios are not selected in this build and cannot be inferred from REF-A. Title-to-answer Human Review remains PENDING.

### Evidence, failures and remaining limits

Precise command: from Candidate, pinned Node22.22.0 PATH, existing `npm exec -- vitest run tests/reference-assembly-browser.test.ts --disableConsoleIntercept`, with `V27_ASSEMBLY_A_DIR`, `V27_ASSEMBLY_B_DIR`, `V27_ASSEMBLY_C_DIR` pointing to the accepted output paths and `V27_ASSEMBLY_EVIDENCE_DIR=/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky`. The complete invocation and raw logs are released through C2C execution_output. Without these explicit inputs the named opt-in test is SKIPPED, never an assembly PASS; it does not rebuild definitions or run the large suite.

- First attempt: exit1, 3/3 failed. The new test selected the first desktop submenu anchor, which had layout dimensions despite being opacity0/pointer-events:none without opening its group. Logs show pointer interception by main headers. This was a test-selection mistake, not established product breakage. Only the new test selector changed to prefer actual main-content links. No forced click, CSS override or production fix used. Original failure log [`test-attempt1.log`](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/test-attempt1.log) preserved.
- Second attempt: exit0, **3/3 PASS**; [`test-attempt2.log`](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/test-attempt2.log). No tests failed/skipped in this explicit run. No full check/full47/Safari command run.
- Actual machine-readable observations: [`REF-B-assembly-observations.json`](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/REF-B-assembly-observations.json); all remaining outcomes are distinguished, not collapsed into PASS.
- PNG provenance inventory: [`screenshots-provenance.json`](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/screenshots-provenance.json). Actual screenshots were captured from the observed pages/seams, not generated mockups.

| Screenshot | Dimensions | SHA256 |
| --- | --- | --- |
| [REF-B-1280-assembled.png](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/REF-B-1280-assembled.png) | 1280×4856 | `ff259d4faa6a35342a8ba2396e4812719670969fb96dc41da1c3838aac86bf05` |
| [REF-B-390-assembled.png](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/REF-B-390-assembled.png) | 390×4977 | `b000071fde6383ce5795fd3dc3e54ca4642cd01636014b7e36b42e9a6fd927ca` |

Screenshots are available for subsequent Human review. Codex inspection is not a Human signature; ChatGPT connector binary availability is not pixel visibility or independent visual-quality acceptance. No screenshot/Human/real-game identity approval was fabricated.

**Remaining:** supported-engine/viewport/JS/motion matrix incomplete; Firefox/WebKit/Safari NOT_RUN here; real Safari keyboard/AX UNPROVEN; complete contrast/all-target/focus-state coverage NOT_RUN; required Human media/no-media/title/identity/ads reviews PENDING; real ad delivery/viewability NOT_RUN. Full REF-A/B/C NOT ACCEPTED; WS06A/WS06B NOT CLOSED; WS07 real adoption 0/3; global PRODUCT/RELEASE NOT ACCEPTED. Historical failures/iteration/archive remain untouched. S5 completion is targeted evidence readiness for independent review, not gate closure.


## PLAN55 — targeted interaction / accessibility supplement (append-only)

Execution `c2c_a765` / iteration55; predecessor REVIEW54 ACCEPT — CURRENT TEST BASELINE (873 passed/3 opt-in skipped, before this test-only supplement). **READY_FOR_INDEPENDENT_REVIEW — LIMITED TECH EVIDENCE**, not full REF/AX acceptance.

Exactly the same four Active files as PLAN52: existing named assembly browser test modified, three reports appended. Product/Core/runtime/dependency/governance/SOP/Prompt/Contract delta=0. A/B/C generating tests, helper, original media and all accepted outputs were unchanged. No new test/runner/framework/schema/field/Pattern or compatibility layer. Original report prefixes and historical logs preserved. No full check, fixture generation, unrelated capture/full47/Safari run.

The dev-only `V27_ASSEMBLY_INTERACTION=1` selects just the new missing interactions in the existing named test; accepted S5 journey/ad/capture code remains intact in its original branch and was not rerun. Candidate branch/HEAD/tree and repaired tracked source diff are the identities recorded above, unchanged. Existing output `/private/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan50-34h464m1/generated-output` retained identity `0c280f581ecaadb16f17f3cd3a6e0467f15c701c63dea2d324cc5a902bbe8a6c` under the same S5 algorithm; copied bytes verified unchanged before/after. Actual Chromium 153.0.8010.12, existing Playwright1.63.0, pinned Node22.22.0. Evidence output remains `final=false`.

| Observation / §V scope | Actual actions / measurements | Result and precise limit |
| --- | --- | --- |
| Desktop pointer navigation, 1280×960, JS on / no-preference | hover actual parent link, wait natural160ms opacity transition; menu opacity1/pointerauto; actual child pointer click reaches `/guides/relay-budget/` | PASS selected opened menu/child, no forceclick/DOM navigation; not global pointer PASS or WoG return-link proof |
| Skip/sequential keyboard, 1280×960 and390×844 | fresh article → actual Tab focuses skip, Enter hashes main, nextTab is beyond header; ShiftTab moves and Tab returns | PASS both selected paths; skip visible3px solid focus recorded, Human focus clarity remains PENDING |
| Mobile summaries/nestedEscape, 390×844 | Tab Menu → Space opens; Tab group → Enter opens → Tab overview; Escape group restores group summary; Escape root restores Menu | PASS selected existing native controls and scripted dismiss behavior; no fullAX/Safari claim |
| Target geometry at selected expanded mobile state | 7 actually-open-state rendered controls; min width 94.000px / minheight 44.000px; each≥24×24 CSSpx | PASS these measured controls only; closed sibling descendants excluded, not all-site controls |
| Boundary390→900→901→900, JS on | focused mobile overview stays900; maps to matchingdesktop page901, allmobile detailsclosed; Enter reaches `/guides/`; focus currentdesktop then900 restoresMenu; Spaceoperable; no documentoverflow | PASS exact selected handoff/statecleanup/operability; no unlimitedmatrix/globalresize assertion |
| no-preference vs earlier reducedmotion | current computed reduce=false/root scroll smooth; S5reduce=true/rootauto/reveal1e-05s retained separately | PASS distinction; allanimations/states/engines not examined |
| no-JS native fallback,390×844/no-preference | article main visible; actual Menu/group clicks, overview to `/guides/`; no documentoverflow | PASS native content/navigation; scriptedEscape and calculatorhydration NOT_RUN underJSoff, no fabricated tool fallback |
| Actualunknownroute / cleanup | HTTP404; normalownedAstrostopexit0/PIDgone; browser/contextsclosed;fixturedeleted | PASS ownedrun integrity; no finalapproval implied |

### Computed contrast / state boundary

Actual selected opened desktop child labels are measured against the first opaque ancestor CSS background, using sRGB relative luminance. Small text threshold4.5:1 was applied conservatively to both elements (16px title,8.32px description). No alpha/image background was silently assumed; unsupported nonopaque colors fail the test.

| Measured text | Foreground / background | Actual ratio | Threshold | Outcome |
| --- | --- | --- | --- | --- |
| How Much for Three Fictional Lanterns? | `rgb(246, 245, 241)` / `rgb(31, 36, 38)` | 14.380476:1 | 4.5:1 | PASS measured state |
| Three Amber Lanterns at four fictional units each cost twelve QA units; compare quantity choices and use the existing calculator. | `rgb(246, 245, 241)` / `rgb(31, 36, 38)` | 14.380476:1 | 4.5:1 | PASS measured state |

This does not prove all body text, image text, hover/focus/active states, graphical contrast or every target. Mobile controls have measured dimensions and computed color/background recorded, but no all-mobile contrast ratio assessment. Existing UA/native summary focus and a selected overview outline were observed; perceptual visibility/Human state review remains PENDING. No visual-quality or required Human approval inferred from CSS measurements.

### Raw attempts preserved / scope

Command from Candidate: pinned Node22.22.0 `npm exec -- vitest run tests/reference-assembly-browser.test.ts --disableConsoleIntercept` with the three same accepted output directory env inputs, `V27_ASSEMBLY_INTERACTION=1`, and `V27_ASSEMBLY_EVIDENCE_DIR=/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos`.

- [attempt1][fail55-B] exit1: REF-A1FAIL, REF-B/C2SKIPPED after fail-closed stop. The newtest asserted opacity1 immediately at hover transition start (opacity0/pointerauto). Original rawfailure and `REF-A-interaction-failure.json` retained. Product defect not established. Only newtest added polling for natural existing transition; no production CSS change/forceclick.
- [attempt2][pass55b-B] exit0:3/3PASS. Rawlog retained. During evidence review, target geometry query was found to include closed sibling-menu descendants exposing layout rectangles; their sizes are not proof of visible targets. No productdefect established; query was tightened to exclude descendants of closed details.
- [attempt3][pass55c-B] exit0:3/3PASS with stricter actual-open target query. No skipped/failed observations in this explicit final run. This repeat was justified by the new measurement correction, not score inflation. Allthree attempts cleaned normally.

Final actual records: [REF-B-interaction observations][obs55-B]. Six observation groups for this Reference (desktoppointer, two keyboardviewports, mobile, exactresize, no-JS). No screenshot needed or captured here. Both S5 failure/pass and these failures/pass logs remain unchanged; corrected tests do not erase failed attempts.

Full REF-A/B/C NOT ACCEPTED, WS06A/WS06B NOT CLOSED. Remaining multi-engine/currentqualification, broader contrast/allstates/targets, actual ads-enabledbuild/delivery/viewability, independent PNGpixels and requiredHuman signatures remain unresolved. RealSafari/AX UNPROVEN, WS07adoption0/3, globalPRODUCT/RELEASE NOTACCEPTED. No acceptance promotion, historical/archive mutation or commit/push/tag/merge/deploy/release.

[fail55-B]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos/test-attempt1.log
[pass55b-B]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos/test-attempt2.log
[pass55c-B]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos/test-attempt3.log
[obs55-B]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos/REF-B-assembly-observations.json
