# REF-C Systems and Editorial Relevance Technical Evidence V1

State: READY FOR INDEPENDENT REVIEW — PLAN51 / S4 technical evidence only.
Execution `c2c_a765`, iteration 51; predecessor REVIEW50 ACCEPT — REF-B S3 TECH ONLY.
Recorded 2026-10-08. No full REF-C, automatic ranking capability or WS06B acceptance declared by Codex.

## Exact scope/source

Exactly four newly created Active files:

1. [reference-c.test.ts](/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/reference-c.test.ts)
2. [relay-system-map.svg](/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/fixtures/reference-media/relay-system-map.svg)
3. [relay-identity.svg](/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/fixtures/reference-media/relay-identity.svg)
4. This report.

Candidate `/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`; branch `v2.7/evolution`; HEAD `b067e8d4050478072f25a1dc78a8526cdd128cfd`; tree `1df0ade30b1eaf51a76820c8d8b83337786f0dc1`.

The actual repaired working tree is the source, including accepted About repair and existing untracked freshness/media/search/theme runtime sources. HEAD alone is not claimed as full source identity. Start Git status/identity/tracked binary diff retained outside workspace. Pre-existing tracked diff SHA256 remains `7e88479dde6d1815b6ac4e8f27365aab3b402f2925d819b893e5bb59f02163e7`.

Dependencies unchanged: package SHA256 `9f45e85bfa007fa00f82374fc53ac0e97348d9956779d1da8e6caf4053b83e05`; lock SHA256 `d87e14d1afb4e155bc03c0a40620cf346831843697d55769f693462f3fb9d616`; Node 22.22.0; pre-installed Playwright 1.63.0.

Product/Core/runtime delta **0**. Existing tests/helpers/config/schema, REF-A/B, governance, SOP/Prompt/Contract, historical records unchanged. No new dependency, entity enum, type/schema/runtime field, Pattern framework, generic builder or ranking registry/engine. Only local dev-only literal fixture inputs, assertions, authored assets and evidence report added.

## Composition, authority and synthetic boundary

Existing `createCoreBuildFixture` creates an owned isolated temporary copy, with build caches isolated and existing dependencies reused. Inputs are written only inside that copy to existing Config, Inventory, Content and Media authorities. Existing theme tokens remain unchanged.

Inventory owns routes, tags, content references, publication/source dates and explicit relationship order. Systems are ordinary `guide` pages, not a new entity type. Existing WikiArticle consumes six guides; EditorialArticle consumes one `meta` ranking article through the existing tierLists collection. Config provides existing nested navigation. Existing Media Manifest/presentation consumes two distinct original SVGs. `getRelatedPages`/RelatedPages consumes **authored explicit order** and does not calculate tags.

The fixture is visibly labelled fictional QA. Its three systems are distinct and mutually linked:

- Light: Amber Lantern identifies the next unlit station; it is information, not power.
- Supply: one Relay Cell powers one station and is consumed; reserve three for three unlit stops.
- Route: Supply Dock → Signal Bridge → East Beacon; all three lit stations complete the circuit.

Three separate tagged action guides identify the next station, count required cells, and verify route order/recover a skipped stop. These are tasks, not duplicate system descriptions. All link to the method/revision. Values and mechanisms are fixture-authored, not invented Bomb Farm/WoG/real-game claims. Source access 2026-10-07 and update 2026-10-08 are synthetic QA samples; revision is `QA relay rules v1`.

The original 1200×675 system map contains the three-system loop and explicit revision/date; the separate original 1200×630 identity visual shows the concrete Amber Lantern, Relay Cell and East Circuit. Neither is generic decorative chrome counted as proof. Actual home hero/system guide gallery and default share are Manifest bindings with informative alt, dimensions, caption/credit/source and authored evidence pointers. Human/visual/game-identity decisions remain PENDING. A fictional QA visual does not constitute real-game GI-02 approval; no masked-logo identity acceptance asserted.

## Independently computed editorial relevance

Published method **`tag-overlap-v1`**: count shared Inventory tags with each system; sort descending score, then ascending pageId for ties. Both the system content and ranking article disclose method, tie-break, tag context and QA version. The editor authors the corresponding ordered `relatedPageIds` in Inventory.

The test reads the **actual temporary Inventory JSON through the existing parser**, selects the three systems and three candidate actions, calculates each shared-tag count independently, and sorts expected results. It then compares this calculation with:

1. Actual Inventory `relatedPageIds`.
2. Public score/order text rendered in each system page.
3. Public score/order lists rendered in the ranking article.
4. Actual ordered links rendered by RelatedPages.
5. Published method/version and mutual system links.

It is not a comparison between two copied expected arrays. Authored input lists are not generated by the expectation calculator; a changed/mislabelled Inventory tag or inconsistent score/order will fail.

Actual derived/rendered results:

| System tags | Ordered guides with shared-tag scores |
| --- | --- |
| relay, light | `guide.light-check` 2; `guide.route-check` 1; `guide.supply-check` 1 |
| relay, supply | `guide.supply-check` 2; `guide.light-check` 1; `guide.route-check` 1 |
| relay, route | `guide.route-check` 2; `guide.light-check` 1; `guide.supply-check` 1 |

This proves a disclosed deterministic **editorial relevance decision plus existing ordered relationship consumption**. It does **not** prove an automatic production tag-ranking consumer. Final §V conformance belongs to independent review. If that obligation requires automated runtime ranking, the precise gap remains and must be separately decided; this slice does not add or silently substitute a new engine.

## Actual command and outputs

From Candidate with existing dependencies and pinned Node:

```sh
PATH=/Users/randyz/.nvm/versions/node/v22.22.0/bin:$PATH V27_REF_C_EVIDENCE_DIR=/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan51-lc8l0wl1 npm exec -- vitest run tests/reference-c.test.ts --disableConsoleIntercept
```

Actual exit **0**, **3/3 tests PASS** on first attempt, 2026-10-08 23:31 UTC+8. No skipped/suppressed failure, no REF-A/B rerun.

| Verification | Actual outcome |
| --- | --- |
| Temporary `npm run validate` | exit **1**, exact two HIGH PRIORITY/PENDING media errors (home/light-system). Correct final-approval rejection, not validation PASS. |
| Temporary `npm run build:evidence` | exit **0**; existing audit/reconciliation matched **11** enabled routes; `final=false`, Human review required. |
| Config/Inventory/catalog/media/references | Existing schemas/catalog accepted; all explicit enabled relationship IDs/media files resolve. |
| Independent relevance checks | Three tag-derived scored lists matched authored Inventory, both sets of published score lists and actual RelatedPages order. |
| Distinct systems/actions/content | Real generated HTML proves six distinct pages, mutual system links, distinct action completion/recovery text and method/version article. |
| Original media | Two distinct real SVG files integrated; home identity and version-labelled system figure referenced, caption rendered. |
| Safety | Canonicals, private-source exclusion and inherited-identity/live-state residue checks retained; existing generated audit passed. |
| HTTP error recovery | Actual missing address returns **404** via existing consumer. |

Actual generated routes: `/`, `/guides/`, `/guides/light-system/`, `/guides/supply-system/`, `/guides/route-system/`, `/guides/light-check/`, `/guides/supply-check/`, `/guides/route-check/`, `/meta/relay-priorities/`, `/about/`, `/404.html`. Ten indexable pages entered Pagefind; interactive search not enabled/tested.

## Limited actual navigation observations

Existing Playwright **1.63.0**, headless Chromium **153.0.8010.12**, JS enabled/reduced motion `reduce`. Separate contexts at **390×844** and **900×960**; 900px is the existing inclusive mobile-nav boundary.

At both viewports, actual `/guides/light-system/` returned HTTP 200. The test opened the existing root Menu and nested Relay systems disclosure, pressed Tab to the Overview link, then pressed Escape:

- Nested group closed; root remained open; actual active element returned to the nested summary.
- A second Escape closed the root; actual active element returned to Menu summary.
- Document had no horizontal overflow; original system diagram loaded at natural width 1200; zero observed page JavaScript exceptions.

No code changed in MobileNav. This is limited nested Tab/Escape/focus/mobile-layout evidence, not full desktop/mobile/keyboard/contrast/reduced-motion/target/CLS/obstruction coverage, cross-engine acceptance, Safari or AX. No screenshot or masked-identity review performed in this slice.

All owned contexts/browser closed. Owned preview PID **68811** stopped normally with `npm run preview -- stop` (exit 0), verified gone. Owned temporary `/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/starter-reference-c-QzxNk4` removed; absence asserted. No fallback/unowned-process termination.

## Raw evidence and terminal boundary

Outside-workspace evidence directory `/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan51-lc8l0wl1/` holds `test-attempt1.log`, `generated-output/`, `actual-fixture-inventory.json`, `fixture-media-decisions.md`, start Git status/identity/diff, scope checks and exact four-file diff. Actual test commands, generated HTML/Inventory/media decisions and scope evidence released through connected execution_output. Report links resolve; all earlier proof/failure evidence remains preserved.

Current state: **REF-C technical evidence ready for independent review**. Human game-identity/content/media/visual review **PENDING**; real-game GI-02 not proven by this synthetic world. Full REF-C/REF-A/REF-B and WS06B **NOT ACCEPTED**; Safari/AX **UNPROVEN**; WS07 **0/3**; 41/41/Global PRODUCT/RELEASE **NOT ACCEPTED**. No full47, full assembled browser suite, REF-A/B changes, production/governance/SOP/Contract change, commit/push/tag/merge/deploy/release. Stop for independent review; no next slice started.


## PLAN52 / S5 — targeted assembled observations (append-only)

Execution `c2c_a765`, iteration 52; predecessor REVIEW51 ACCEPT — REF-C S4 TECHNICAL EVIDENCE. **READY FOR INDEPENDENT REVIEW**, not full REF-C ACCEPT. Earlier report content above remains byte-unchanged.

The approved optional dev-only test `tests/reference-assembly-browser.test.ts` was required because the accepted A/B/C tests neither observe all actual link journeys/TOC/FAQ nor exercise empty/synthetic ad geometry. Existing A/B/C tests/helpers/assets were not edited or rebuilt. No fixture content model, generic runner/registry, Core change or new dependency was introduced. Exactly four Active files changed in S5: this report, the other two Reference reports, and the new named test. Product/Core/runtime/Governance/SOP/Prompt/Contract delta = 0.

### Accurate source/build identity

Candidate branch `v2.7/evolution`, HEAD `b067e8d4050478072f25a1dc78a8526cdd128cfd`, tree `1df0ade30b1eaf51a76820c8d8b83337786f0dc1`. Actual repaired working-tree production source remains unchanged from the accepted REF fixture runs; the tracked binary diff SHA256 remains `7e88479dde6d1815b6ac4e8f27365aab3b402f2925d819b893e5bb59f02163e7`. Pre-run Git status/identity/diff and allowed report bytes are retained in [v27-plan52-x7ord2ky](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky). Package/lock and A/B/C test source identities remain unchanged. Node 22.22.0; pre-installed Playwright 1.63.0.

Retained actual accepted output: `/private/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan51-lc8l0wl1/generated-output`. Its whole generated-output identity for **this test's sorted relative-path + NUL + file-bytes algorithm** is `2ddd49cbd263c4f02170dcd7c849d2333593d7d8d93e4f2926bf4aa6e8bbc32d`. This is a small exact-output hash, not the previous run's different hash algorithm or a new 6000+ workspace fingerprint. An owned isolated preview copied these output bytes and asserted identity before and after observation; the retained source output was never mutated. `EVIDENCE_BUILD_NOT_FINAL.json` remains `final=false`, `mode=evidence`. No final build/validation approval was inferred.

### Executed observations and §V mapping

Actual engine: **Chromium 153.0.8010.12**, not Firefox/WebKit/real Safari. JavaScript enabled, `reducedMotion=reduce`.

| Viewport | Actual result | Existing authored click journey (starts at home) | Article observations |
| --- | --- | --- | --- |
| 1280×960 | PASS | /guides/ → /guides/light-system/ → /guides/supply-system/ → /guides/route-system/ → /meta/relay-priorities/ | `#understand-this-system`; FAQ `NOT_PRESENT_NOT_REQUIRED`; media loaded/captioned and within viewport; no document overflow; JS errors 0 |
| 390×844 | PASS | /guides/ → /guides/light-system/ → /guides/supply-system/ → /guides/route-system/ → /meta/relay-priorities/ | `#understand-this-system`; FAQ `NOT_PRESENT_NOT_REQUIRED`; media loaded/captioned and within viewport; no document overflow; JS errors 0 |

For each viewport, HTTP link crawl also checked unique local destinations from home and the journey routes (not external provenance URLs). Actual clicks, not URL assignment, followed the listed authored journey. Article was separately opened to observe TOC/media. TOC click changed the fragment to an actual rendered heading. Reduced-motion media query matched; computed root scroll behavior was `auto`, reveal animation duration `1e-05s`. Mobile Menu target was at least 24×24 CSS px; actual Escape closed the root and restored summary focus. This is a limited measured target/focus observation, not complete AX acceptance. The existing unknown-route response was actually HTTP404. Browser contexts/browser closed, each owned preview stopped with exit0/PID gone, and temporary fixtures were removed. No cleanup fallback was needed.

Applicable Contract §V coverage: link journey/crawl, TOC, media presentation, responsive/overflow and limited keyboard/motion observations. Existing earlier evidence still supplies SEO/schema, source semantics and the Reference-specific task assertions; it is not relabeled as new S5 execution.

REF-C-specific §V: three distinct systems and the method article were reached by actual authored cross-links. The 1200px-original map rendered at 1180px desktop / 362px mobile and loaded with caption. Existing S4 independent Inventory tag-count/order test and 390/900px nested Escape/Tab restoration evidence remain accepted bounded evidence; S5 root Escape is an additional limited observation, not a substitute. There is no automatic production tag ranking. Ad config remains disabled. Contrast/state legibility, all targets and masked-logo identity Human acceptance were not completed by this slice and remain unproven.

### Evidence, failures and remaining limits

Precise command: from Candidate, pinned Node22.22.0 PATH, existing `npm exec -- vitest run tests/reference-assembly-browser.test.ts --disableConsoleIntercept`, with `V27_ASSEMBLY_A_DIR`, `V27_ASSEMBLY_B_DIR`, `V27_ASSEMBLY_C_DIR` pointing to the accepted output paths and `V27_ASSEMBLY_EVIDENCE_DIR=/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky`. The complete invocation and raw logs are released through C2C execution_output. Without these explicit inputs the named opt-in test is SKIPPED, never an assembly PASS; it does not rebuild definitions or run the large suite.

- First attempt: exit1, 3/3 failed. The new test selected the first desktop submenu anchor, which had layout dimensions despite being opacity0/pointer-events:none without opening its group. Logs show pointer interception by main headers. This was a test-selection mistake, not established product breakage. Only the new test selector changed to prefer actual main-content links. No forced click, CSS override or production fix used. Original failure log [`test-attempt1.log`](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/test-attempt1.log) preserved.
- Second attempt: exit0, **3/3 PASS**; [`test-attempt2.log`](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/test-attempt2.log). No tests failed/skipped in this explicit run. No full check/full47/Safari command run.
- Actual machine-readable observations: [`REF-C-assembly-observations.json`](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/REF-C-assembly-observations.json); all remaining outcomes are distinguished, not collapsed into PASS.
- PNG provenance inventory: [`screenshots-provenance.json`](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/screenshots-provenance.json). Actual screenshots were captured from the observed pages/seams, not generated mockups.

| Screenshot | Dimensions | SHA256 |
| --- | --- | --- |
| [REF-C-1280-assembled.png](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/REF-C-1280-assembled.png) | 1280×4467 | `24affd39d56515df281115dd27e8df61a2c6cad29e780b580240cdbd2932d34e` |
| [REF-C-390-assembled.png](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/REF-C-390-assembled.png) | 390×4568 | `e572df242be63f92dfd70e3397a1d1789201d1d304bce90c6f079bc325a9f3ec` |

Screenshots are available for subsequent Human review. Codex inspection is not a Human signature; ChatGPT connector binary availability is not pixel visibility or independent visual-quality acceptance. No screenshot/Human/real-game identity approval was fabricated.

**Remaining:** supported-engine/viewport/JS/motion matrix incomplete; Firefox/WebKit/Safari NOT_RUN here; real Safari keyboard/AX UNPROVEN; complete contrast/all-target/focus-state coverage NOT_RUN; required Human media/no-media/title/identity/ads reviews PENDING; real ad delivery/viewability NOT_RUN. Full REF-A/B/C NOT ACCEPTED; WS06A/WS06B NOT CLOSED; WS07 real adoption 0/3; global PRODUCT/RELEASE NOT ACCEPTED. Historical failures/iteration/archive remain untouched. S5 completion is targeted evidence readiness for independent review, not gate closure.


## PLAN55 — targeted interaction / accessibility supplement (append-only)

Execution `c2c_a765` / iteration55; predecessor REVIEW54 ACCEPT — CURRENT TEST BASELINE (873 passed/3 opt-in skipped, before this test-only supplement). **READY_FOR_INDEPENDENT_REVIEW — LIMITED TECH EVIDENCE**, not full REF/AX acceptance.

Exactly the same four Active files as PLAN52: existing named assembly browser test modified, three reports appended. Product/Core/runtime/dependency/governance/SOP/Prompt/Contract delta=0. A/B/C generating tests, helper, original media and all accepted outputs were unchanged. No new test/runner/framework/schema/field/Pattern or compatibility layer. Original report prefixes and historical logs preserved. No full check, fixture generation, unrelated capture/full47/Safari run.

The dev-only `V27_ASSEMBLY_INTERACTION=1` selects just the new missing interactions in the existing named test; accepted S5 journey/ad/capture code remains intact in its original branch and was not rerun. Candidate branch/HEAD/tree and repaired tracked source diff are the identities recorded above, unchanged. Existing output `/private/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan51-lc8l0wl1/generated-output` retained identity `2ddd49cbd263c4f02170dcd7c849d2333593d7d8d93e4f2926bf4aa6e8bbc32d` under the same S5 algorithm; copied bytes verified unchanged before/after. Actual Chromium 153.0.8010.12, existing Playwright1.63.0, pinned Node22.22.0. Evidence output remains `final=false`.

| Observation / §V scope | Actual actions / measurements | Result and precise limit |
| --- | --- | --- |
| Desktop pointer navigation, 1280×960, JS on / no-preference | hover actual parent link, wait natural160ms opacity transition; menu opacity1/pointerauto; actual child pointer click reaches `/guides/light-system/` | PASS selected opened menu/child, no forceclick/DOM navigation; not global pointer PASS or WoG return-link proof |
| Skip/sequential keyboard, 1280×960 and390×844 | fresh article → actual Tab focuses skip, Enter hashes main, nextTab is beyond header; ShiftTab moves and Tab returns | PASS both selected paths; skip visible3px solid focus recorded, Human focus clarity remains PENDING |
| Mobile summaries/nestedEscape, 390×844 | Tab Menu → Space opens; Tab group → Enter opens → Tab overview; Escape group restores group summary; Escape root restores Menu | PASS selected existing native controls and scripted dismiss behavior; no fullAX/Safari claim |
| Target geometry at selected expanded mobile state | 11 actually-open-state rendered controls; min width 94.000px / minheight 44.000px; each≥24×24 CSSpx | PASS these measured controls only; closed sibling descendants excluded, not all-site controls |
| Boundary390→900→901→900, JS on | focused mobile overview stays900; maps to matchingdesktop page901, allmobile detailsclosed; Enter reaches `/guides/`; focus currentdesktop then900 restoresMenu; Spaceoperable; no documentoverflow | PASS exact selected handoff/statecleanup/operability; no unlimitedmatrix/globalresize assertion |
| no-preference vs earlier reducedmotion | current computed reduce=false/root scroll smooth; S5reduce=true/rootauto/reveal1e-05s retained separately | PASS distinction; allanimations/states/engines not examined |
| no-JS native fallback,390×844/no-preference | article main visible; actual Menu/group clicks, overview to `/guides/`; no documentoverflow | PASS native content/navigation; scriptedEscape and calculatorhydration NOT_RUN underJSoff, no fabricated tool fallback |
| Actualunknownroute / cleanup | HTTP404; normalownedAstrostopexit0/PIDgone; browser/contextsclosed;fixturedeleted | PASS ownedrun integrity; no finalapproval implied |

### Computed contrast / state boundary

Actual selected opened desktop child labels are measured against the first opaque ancestor CSS background, using sRGB relative luminance. Small text threshold4.5:1 was applied conservatively to both elements (16px title,8.32px description). No alpha/image background was silently assumed; unsupported nonopaque colors fail the test.

| Measured text | Foreground / background | Actual ratio | Threshold | Outcome |
| --- | --- | --- | --- | --- |
| How the Fictional Lantern Signal Works | `rgb(246, 245, 241)` / `rgb(31, 36, 38)` | 14.380476:1 | 4.5:1 | PASS measured state |
| The Amber Lantern marks the next unlit station; coordinate this fictional signal with cell supply and the prescribed route. | `rgb(246, 245, 241)` / `rgb(31, 36, 38)` | 14.380476:1 | 4.5:1 | PASS measured state |

This does not prove all body text, image text, hover/focus/active states, graphical contrast or every target. Mobile controls have measured dimensions and computed color/background recorded, but no all-mobile contrast ratio assessment. Existing UA/native summary focus and a selected overview outline were observed; perceptual visibility/Human state review remains PENDING. No visual-quality or required Human approval inferred from CSS measurements.

### Raw attempts preserved / scope

Command from Candidate: pinned Node22.22.0 `npm exec -- vitest run tests/reference-assembly-browser.test.ts --disableConsoleIntercept` with the three same accepted output directory env inputs, `V27_ASSEMBLY_INTERACTION=1`, and `V27_ASSEMBLY_EVIDENCE_DIR=/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos`.

- [attempt1][fail55-C] exit1: REF-A1FAIL, REF-B/C2SKIPPED after fail-closed stop. The newtest asserted opacity1 immediately at hover transition start (opacity0/pointerauto). Original rawfailure and `REF-A-interaction-failure.json` retained. Product defect not established. Only newtest added polling for natural existing transition; no production CSS change/forceclick.
- [attempt2][pass55b-C] exit0:3/3PASS. Rawlog retained. During evidence review, target geometry query was found to include closed sibling-menu descendants exposing layout rectangles; their sizes are not proof of visible targets. No productdefect established; query was tightened to exclude descendants of closed details.
- [attempt3][pass55c-C] exit0:3/3PASS with stricter actual-open target query. No skipped/failed observations in this explicit final run. This repeat was justified by the new measurement correction, not score inflation. Allthree attempts cleaned normally.

Final actual records: [REF-C-interaction observations][obs55-C]. Six observation groups for this Reference (desktoppointer, two keyboardviewports, mobile, exactresize, no-JS). No screenshot needed or captured here. Both S5 failure/pass and these failures/pass logs remain unchanged; corrected tests do not erase failed attempts.

Full REF-A/B/C NOT ACCEPTED, WS06A/WS06B NOT CLOSED. Remaining multi-engine/currentqualification, broader contrast/allstates/targets, actual ads-enabledbuild/delivery/viewability, independent PNGpixels and requiredHuman signatures remain unresolved. RealSafari/AX UNPROVEN, WS07adoption0/3, globalPRODUCT/RELEASE NOTACCEPTED. No acceptance promotion, historical/archive mutation or commit/push/tag/merge/deploy/release.

[fail55-C]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos/test-attempt1.log
[pass55b-C]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos/test-attempt2.log
[pass55c-C]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos/test-attempt3.log
[obs55-C]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos/REF-C-assembly-observations.json
