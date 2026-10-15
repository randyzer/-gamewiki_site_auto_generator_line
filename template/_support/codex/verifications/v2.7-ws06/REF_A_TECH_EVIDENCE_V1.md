# REF-A Seed Technical Evidence V1

Status: READY FOR INDEPENDENT REVIEW — S1 seed technical evidence only.
Execution: C2C `c2c_a765`, PLAN48; predecessor REVIEW47 ACCEPT — DESIGN ONLY.
Recorded: 2026-10-08. Independent S1 acceptance has not been declared by Codex.

## Source and exact scope

Source Candidate: `/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`.

- Branch: `v2.7/evolution`.
- HEAD: `b067e8d4050478072f25a1dc78a8526cdd128cfd`.
- HEAD tree: `1df0ade30b1eaf51a76820c8d8b83337786f0dc1`.
- Actual source is the current working tree, including accepted About repair, not HEAD alone. At start: 54 tracked modified files and 14 untracked files. Complete status and tracked binary diff captured outside the workspace below.
- Pre-slice tracked diff SHA256: `7e88479dde6d1815b6ac4e8f27365aab3b402f2925d819b893e5bb59f02163e7`.
- Relevant pre-existing untracked runtime sources: `src/core/freshness.ts`, `src/core/media-presentation.ts`, `src/core/pagefind-search-adapter.ts`, `src/core/theme-roles.ts`; source scripts and remaining untracked files are listed in `candidate-status.before`.
- `package.json` SHA256: `9f45e85bfa007fa00f82374fc53ac0e97348d9956779d1da8e6caf4053b83e05`.
- `package-lock.json` SHA256: `d87e14d1afb4e155bc03c0a40620cf346831843697d55769f693462f3fb9d616`.
- Test Node: pinned `/Users/randyz/.nvm/versions/node/v22.22.0/bin/node` (22.22.0), existing installed dependencies; no installation/update.

Exactly four newly created Active files:

1. [reference-a.test.ts](/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/reference-a.test.ts)
2. [relay-cover.svg](/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/fixtures/reference-media/relay-cover.svg)
3. [relay-figure.svg](/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/fixtures/reference-media/relay-figure.svg)
4. This report.

Product/Core/runtime delta: **0**. New dev-only test: 1; original fixture assets: 2; report: 1. No existing test/helper/config/schema/governance/SOP/Prompt/history file changed. No new runtime fields, schema, abstraction, registry, pageType or dependency. This is a fixed test fixture, not a generic Reference builder.

## Fixture and authority ownership

`createCoreBuildFixture` copies the actual Candidate's existing source/build/public/config files into an owned temporary directory, links existing dependencies, and isolates build caches. The new test only replaces inputs in that temporary copy. It uses existing `defineGameConfig`, `parsePageInventory`, Facts parsers, `createMediaCatalog`, `buildEnabledPageCatalog`, freshness resolver, route reconciliation, validation and build consumers.

Temporary Config enables guides/items/maps and resolves fixed Inventory navigation. Inventory owns IDs/routes/publication/dates/relationships; Facts owns two item records and one map record; Content contains two ordinary MDX guides; Manifest owns the two SVG assets and page mappings. The copied semantic theme remains unchanged. No Pattern classification or Reference runtime contract was added.

Fixture identity is **Lantern Relay — Synthetic Reference Fixture**. Homepage and both guides visibly disclose: “Fictional QA scenario for Starter regression testing; not a real commercial game.” Fictional equipment/costs/three-station sequence are internally consistent. Nothing represents Bomb Farm, War of Genesis, real market prices, Steam evidence or a real game's approval.

Two distinct original SVGs use authored geometric primitives. Cover: 1200×630, three lanterns/circuit identity. Figure: 960×540, Supply Dock → Signal Bridge → East Beacon and one cell consumed per station. Both have descriptive alt, caption, source/authorship context and dimensions; the figure appears through the existing guide gallery consumer. Rights evidence pointers identify fixture authorship and do not imply Human approval. The temporary decision table leaves all Human/visual states PENDING; the original-asset authorship classification is not third-party gameplay clearance.

No screenshot was created. No third asset or placeholder PNG. A no-media guide has a positive MC-04 text-and-date rationale, no mapped hero/gallery/trailer and no empty visible media slot. Default OG share metadata does not constitute article media.

Dates are synthetic QA samples: publication 2026-10-01; update 2026-10-08; source access 2026-10-07. Existing freshness projects `sourceCheckedAt`, not `verifiedAt`. Entity patch and article prose explicitly identify `QA relay rules v1`; a resolver assertion separately preserves version context. No new version field was added to Inventory or Content and no generic live state was inferred.

## Actual commands and outcomes

Run from the source Candidate, with existing dependencies:

```sh
PATH=/Users/randyz/.nvm/versions/node/v22.22.0/bin:$PATH V27_REF_A_EVIDENCE_DIR=/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan48-mervk0bi/final-evidence npm exec -- vitest run tests/reference-a.test.ts --disableConsoleIntercept
```

Final exit: **0**; **7/7 tests passed**, one test file. The console option exposes actual nested command logs, because the default successful runner hid them. This repeated only the same targeted suite to preserve raw evidence, not a wider check.

Inside the temporary fixture:

| Command/check | Actual outcome | Interpretation |
| --- | --- | --- |
| `npm run validate` | exit 1 | EXPECTED REJECTION: exactly two HIGH PRIORITY/PENDING media errors, home and relay overview. Final approval is missing; not a final validation PASS. Test asserts the exact two errors. |
| `npm run build:evidence` | exit 0 | Seed technical output generated; 11-route reconciliation and existing build audit passed. `EVIDENCE_BUILD_NOT_FINAL.json` remains `mode=evidence`, `final=false`; Human review required. |
| Input/schema checks | PASS | Config/Inventory/Facts/media parse; all enabled related IDs resolve; date ordering preserved; duplicate IDs/routes and inverted dates rejected; unknown media page IDs and missing local files rejected. |
| Actual HTML checks | PASS | Editorial homepage, both fixed entity hubs, distinct facts, ordinary MDX answer/steps/recovery/next link, rendered headings/TOC, FAQ content and ordered manual RelatedPages. No claim of dedicated QuickAnswer/Steps/NextStep components. |
| Media checks | PASS | Two distinct authored SVGs, actual cover/figure references, dimensions/alt/caption/credit; no-media text-first page has no media placement. This does not prove visual quality or screenshot-role completion. |
| SEO/safety | PASS in inspected seed output | Canonicals, Article/Breadcrumb JSON-LD, no fabricated author/publisher, OG metadata, actual `sitemap-index.xml`/`sitemap-0.xml` and robots; unavailable legal routes are excluded; existing residue audit retained; no inherited Game Atlas/live-state/private evidence in generated pages. |
| Owned `npm run preview -- --background --host 127.0.0.1 --port <reserved ephemeral port>` | exit 0 | PID 58848; actual local HTTP observations only, not browser or keyboard evidence. |
| Missing route HTTP request | 404 | Actual `/missing-relay-route/` returns existing 404 page; recovery links `/`, `/items/`, `/maps/` each return HTTP 200. |
| `npm run preview -- stop` | exit 0 | Owned PID 58848 verified gone; no fallback signal; fixture removed and absence asserted. |

Actual generated routes, all reconciled with enabled catalog:

| Route | Existing consumer/result |
| --- | --- |
| `/` | Existing homepage composition; disclosed QA identity/intro/useful navigation, cover. |
| `/items/` | Existing fixed items entity hub, two equipment records. |
| `/maps/` | Existing fixed maps entity hub, circuit record. |
| `/items/amber-lantern/` | Existing item detail; utility, cost 4, distinct station-marking effect. |
| `/items/relay-cell/` | Existing item detail; consumable, cost 2, distinct single-station effect. |
| `/maps/east-circuit/` | Existing map detail; synthetic training/small/three locations. |
| `/guides/` | Existing guides hub. |
| `/guides/relay-overview/` | Existing WikiArticle/MDX; three meaningful H2s/TOC, FAQ, manual relationships, explanatory figure. |
| `/guides/source-check/` | Existing WikiArticle/MDX, complete no-media source-context task. |
| `/about/` | Existing repaired About consumer; fictional fixture scope. |
| `/404.html` | Existing error/recovery consumer; noindex; actual HTTP 404 separately observed. |

Private/draft/unavailable privacy and terms have no generated route or public navigation link. Disabled search/demo hero routes are absent. Pagefind indexed 10 indexable pages; this is generated-artifact evidence, not interactive search testing.

## Preserved failures and cleanup

- Attempt 1: exit 1, suite setup failed/7 skipped. Newly authored fixture descriptions were duplicated; the existing generated audit correctly rejected nine routes. Only the new test's literal descriptions were corrected. No product fix/audit weakening.
- Attempt 2: exit 1, 6 passed/1 failed. Seed build and actual 404 succeeded, but the new test incorrectly expected `sitemap.xml`; existing config/output use `sitemap-index.xml` + `sitemap-0.xml`. Only test path assertions corrected. Normal preview stop and fixture cleanup succeeded.
- Attempt 3: exit 0, 7/7 passed; default successful-run console detail was hidden. Its output is retained.
- Final detailed run: exit 0, 7/7 passed, all nested raw results visible. Final validation rejection remains recorded.

Each failed attempt is retained byte-for-byte outside Active workspace. No old FAIL was rewritten. Temporary fixture directories from these runs are removed; final preview stopped normally. Copies of generated output are retained only as outside-workspace review evidence and are not running sites.

Evidence directory: `/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan48-mervk0bi/`:

- `candidate-status.before`, `candidate-diff.before`, `candidate-identity.before`, `candidate-branch.before`, dependency hashes in `baseline.json`.
- `test-attempt1.log`, `test-attempt2.log`, `test-attempt3.log`, `test-final.log` (released through connected execution_output).
- `attempt2-generated-output/`, `generated-output/`, `final-evidence/generated-output/`; final temporary media decision table at `final-evidence/fixture-media-decisions.md`.
- Lightweight scope/diff checks and added-file diff recorded outside workspace for independent review. No large protected-file hashing.

## Unmet obligations and strict gates

| Obligation | Status |
| --- | --- |
| S2 actual provenance-labelled UI screenshot | PENDING — NOT IMPLEMENTED |
| Browser keyboard/mobile/layout/CLS/obstruction | NOT RUN |
| Independent Human visual/media review | PENDING |
| Real-game visual identity/third-party media rights | NOT PROVEN by a synthetic world |
| Safari / AX | UNPROVEN; no promotion |
| Full REF-A acceptance | NOT ACCEPTED — this is S1 seed evidence only |
| REF-B / REF-C | NOT IMPLEMENTED |
| WS06A / WS06B closure | NOT ACCEPTED |
| WS07 adoption | 0/3; no promotion |
| 41/41 / Global PRODUCT / RELEASE | NOT ACCEPTED |

No full `check`, fresh47, Safari, screenshot capture, browser matrix, REF-B/C, adoption, final build, commit, push, tag, merge, deploy or release performed. Governance and historical proof/failure evidence remain unchanged. Next action requires independent review of these four files and actual outputs before any separately bounded S2 plan.

## S2 append — PLAN49 actual UI screenshot binding

The preceding sections are preserved S1 evidence. REVIEW48 independently accepted **REF-A S1 SEED TECHNICAL EVIDENCE**, reading execution outputs #114–#120 and actual source/output. That did not accept full REF-A. PLAN49 authorized this separate three-file S2 scope. Current S2 state: READY FOR INDEPENDENT REVIEW; Codex does not declare S2 accepted.

Exactly three Active changes in S2:

1. Modify the existing new [reference-a.test.ts](/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/reference-a.test.ts).
2. Create [ref-a-ui.png](/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/fixtures/reference-media/ref-a-ui.png).
3. Append to this report, preserving S1 text and failed attempts.

Product/Core/runtime delta: **0**. Original cover/figure byte-unchanged. Shared helpers, dependency/lock files, governance, SOP/Prompt/Contract and historical evidence unchanged. No new schema/type/field/framework/dependency. The local preview start/stop code is reused for the actual capture and retained HTTP check; it remains test-only.

### Actual capture provenance

| Fact | Observed value |
| --- | --- |
| Kind | **synthetic fixture UI capture**; not a mockup, SVG conversion or gameplay image |
| Source | Current repaired Candidate working tree; same branch/HEAD/tree and pre-existing tracked source diff/dependency identities documented in S1. S1 additions are the dev-only seed baseline; no production change in S2. |
| Seed route | `/guides/relay-overview/` |
| Actual capture URL | `http://127.0.0.1:52641/guides/relay-overview/` — owned temporary preview, now stopped |
| Browser | Existing dev-only Playwright 1.63.0, headless Chromium **153.0.8010.12** |
| Viewport | **1280×960**, device scale factor 1, reduced motion `reduce`, full-page PNG |
| Captured at | **2026-10-08T15:08:26.206Z** / 2026-10-08 23:08:26.206 UTC+8 |
| Original PNG | **1280×5277**, **548677 bytes**; actual PNG signature and IHDR dimensions checked |
| PNG SHA256 | `fcb9089258d342c8d38432f3f3978836e2701d0f91c5357330544eca52844953` |
| Seed output-set SHA256 | `daee3362d5ee1679782dcb925c275e54f6fcc8894051fe1acdd03768c8933762` |
| Capture-run final output-set SHA256 | `3973502d453eec5d5fbf22de2ae3dc9e61fafed5a95725eec3ce803a318dddc7` |
| Default rerun final output-set SHA256 | `bbf1d66ff5382f08c4e0fdba7dc6bf2bf5949f1d81ca5153c19b5eb97e97d455` |
| Human/visual approval | **PENDING** |

The test records output-set identity from sorted relative file paths plus file byte lengths and content of this small fixture's generated `dist` only. Seed and final evidence outputs are retained separately. Evidence markers include build-time data, so independently rebuilt output sets are recorded separately rather than falsely identified as the same build. No large workspace hashing was performed.

Capture was made from the genuine **two-media Seed before PNG integration**, after navigation HTTP 200, fonts ready, fictional disclosure and QA version visible, and the explanatory SVG image loaded. The image shows the actual article, TOC, steps, circuit diagram, FAQ control, manual related links and source section. This is a screenshot of that seed UI, not a screenshot of the final article containing itself. Codex inspected the PNG visually; that inspection is not required independent Human acceptance and does not qualify keyboard/AX/layout gates.

The fixture then registers `relay.ui-capture` through the existing Media Manifest fields, with informative alt, actual dimensions, explicit “not gameplay imagery” caption, Chromium capture credit and authorship evidence pointer. It copies the original PNG into temporary `/media/ref-a-ui.png`, adds it alongside the separate explanatory figure to the overview gallery, and rebuilds the final evidence output. Cover/default share stays the original SVG. The no-media guide stays unmapped/text-first. No new runtime capture/provenance model was introduced.

The PNG's actual captured bytes are pinned in the test. Default runs **read/copy only** and never regenerate it. Capture mode refuses an already existing target; future recapture requires separately reviewed scope. The report and outside-workspace capture JSON hold provenance, not a new Active metadata file.

### S2 commands, real results and cleanup

From source Candidate with Node 22.22.0 and pre-existing dependencies:

```sh
PATH=/Users/randyz/.nvm/versions/node/v22.22.0/bin:$PATH V27_REF_A_CAPTURE=1 V27_REF_A_EVIDENCE_DIR=/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan49-kkxzjquc npm exec -- vitest run tests/reference-a.test.ts --disableConsoleIntercept
```

Actual exit **0**, **7/7 PASS**. Temporary seed `build:evidence` exit 0; actual Chromium capture succeeded; temporary final `validate` exit **1** with the same exact two HIGH PRIORITY/PENDING media errors; final `build:evidence` exit **0** and existing audit/reconciliation matched **11 routes**. Tests inspect all three distinct media paths, informative alt/caption, PNG bytes in final output, retained routes/relationships/SEO/legal/residue protections and actual HTTP 404/recovery. Final evidence still has `final=false` and Human review required.

After the capture, only scoped test assertions/formatting were tightened: a byte hash pins the genuine PNG, image-load checking uses the actual DOM image type, and the log distinguishes browser acceptance from capture. No asset recapture or product modification.

Default mode was then verified with capture flag **absent**:

```sh
PATH=/Users/randyz/.nvm/versions/node/v22.22.0/bin:$PATH V27_REF_A_EVIDENCE_DIR=/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan49-kkxzjquc/readonly-rerun npm exec -- vitest run tests/reference-a.test.ts --disableConsoleIntercept
```

Actual exit **0**, **7/7 PASS**. The PNG hash remained identical; validation retained the expected approval rejection; fresh final evidence build/audit succeeded. No browser capture or Active asset write in this default run.

All owned Chromium page/context/browser resources closed. Capture preview and final HTTP preview both stopped normally; default rerun preview also stopped normally. All owned PIDs verified gone and fixture directories removed; no fallback termination or unowned process kill. Actual unknown-route status remains HTTP 404, with `/`, `/items/`, `/maps/` HTTP 200 recovery.

Raw evidence remains outside workspace at `/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan49-kkxzjquc/`: `capture-test.log`, `capture-provenance.json`, `seed-generated-output/`, `generated-output/`, `fixture-media-decisions.md`, `readonly-rerun/generated-output/`, `default-test.log`, scope checks and exact S2 diff. Relevant raw command, provenance and generated output evidence are released through connected execution_output. S1 logs/failures and all earlier evidence remain preserved.

### Current gate boundary after S2 execution

Technical screenshot role: **actual capture and existing consumer binding verified**, pending independent S2 review. Human/visual review remains **PENDING**. Full browser/keyboard/mobile/CLS/obstruction acceptance **NOT RUN**; limited Chromium capture is not those tests. Safari/AX **UNPROVEN**. Full REF-A and WS06B **NOT ACCEPTED**; REF-B/C not implemented; WS07 **0/3**; Global PRODUCT/RELEASE **NOT ACCEPTED**. No full47, production Core change, governance change, commit/push/tag/merge/deploy/release. S2 execution stops for independent review; no next slice started.


## PLAN52 / S5 — targeted assembled observations (append-only)

Execution `c2c_a765`, iteration 52; predecessor REVIEW51 ACCEPT — REF-C S4 TECHNICAL EVIDENCE. **READY FOR INDEPENDENT REVIEW**, not full REF-A ACCEPT. Earlier report content above remains byte-unchanged.

The approved optional dev-only test `tests/reference-assembly-browser.test.ts` was required because the accepted A/B/C tests neither observe all actual link journeys/TOC/FAQ nor exercise empty/synthetic ad geometry. Existing A/B/C tests/helpers/assets were not edited or rebuilt. No fixture content model, generic runner/registry, Core change or new dependency was introduced. Exactly four Active files changed in S5: this report, the other two Reference reports, and the new named test. Product/Core/runtime/Governance/SOP/Prompt/Contract delta = 0.

### Accurate source/build identity

Candidate branch `v2.7/evolution`, HEAD `b067e8d4050478072f25a1dc78a8526cdd128cfd`, tree `1df0ade30b1eaf51a76820c8d8b83337786f0dc1`. Actual repaired working-tree production source remains unchanged from the accepted REF fixture runs; the tracked binary diff SHA256 remains `7e88479dde6d1815b6ac4e8f27365aab3b402f2925d819b893e5bb59f02163e7`. Pre-run Git status/identity/diff and allowed report bytes are retained in [v27-plan52-x7ord2ky](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky). Package/lock and A/B/C test source identities remain unchanged. Node 22.22.0; pre-installed Playwright 1.63.0.

Retained actual accepted output: `/private/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan49-kkxzjquc/readonly-rerun/generated-output`. Its whole generated-output identity for **this test's sorted relative-path + NUL + file-bytes algorithm** is `722b3b4c836d9a0fc0ee79103c0e8f3da52f005820be4a42589ad592cb4975f5`. This is a small exact-output hash, not the previous run's different hash algorithm or a new 6000+ workspace fingerprint. An owned isolated preview copied these output bytes and asserted identity before and after observation; the retained source output was never mutated. `EVIDENCE_BUILD_NOT_FINAL.json` remains `final=false`, `mode=evidence`. No final build/validation approval was inferred.

### Executed observations and §V mapping

Actual engine: **Chromium 153.0.8010.12**, not Firefox/WebKit/real Safari. JavaScript enabled, `reducedMotion=reduce`.

| Viewport | Actual result | Existing authored click journey (starts at home) | Article observations |
| --- | --- | --- | --- |
| 1280×960 | PASS | /items/ → /items/amber-lantern/ → /maps/ → /maps/east-circuit/ → /guides/relay-overview/ → /guides/source-check/ | `#prepare-the-relay`; FAQ `CLICK_OPEN_KEYBOARD_ENTER_CLOSE`; media loaded/captioned and within viewport; no document overflow; JS errors 0 |
| 390×844 | PASS | /items/ → /items/amber-lantern/ → /maps/ → /maps/east-circuit/ → /guides/relay-overview/ → /guides/source-check/ | `#prepare-the-relay`; FAQ `CLICK_OPEN_KEYBOARD_ENTER_CLOSE`; media loaded/captioned and within viewport; no document overflow; JS errors 0 |

For each viewport, HTTP link crawl also checked unique local destinations from home and the journey routes (not external provenance URLs). Actual clicks, not URL assignment, followed the listed authored journey. Article was separately opened to observe TOC/media. TOC click changed the fragment to an actual rendered heading. Reduced-motion media query matched; computed root scroll behavior was `auto`, reveal animation duration `1e-05s`. Mobile Menu target was at least 24×24 CSS px; actual Escape closed the root and restored summary focus. This is a limited measured target/focus observation, not complete AX acceptance. The existing unknown-route response was actually HTTP404. Browser contexts/browser closed, each owned preview stopped with exit0/PID gone, and temporary fixtures were removed. No cleanup fallback was needed.

Applicable Contract §V coverage: link journey/crawl, TOC, media presentation, responsive/overflow and limited keyboard/motion observations. Existing earlier evidence still supplies SEO/schema, source semantics and the Reference-specific task assertions; it is not relabeled as new S5 execution.

REF-A-specific §V: both taxonomy hubs/details were reached; existing FAQ opened by click and closed using actual focused Enter. Both the explanatory SVG and actual fixture UI capture loaded at rendered widths 576px desktop / 362px mobile, with captions. Disabled accepted build has no ad slot.

**Advertising states were kept separate:** actual `AdSlot` rendered through the existing Astro container, then inserted after Hero/before the following homepage section via the existing test-only composition seam. Empty state uses the real shipped no-op ProjectAd. Synthetic state composes the already-existing TestAdProvider root; its external bootstrap request was intercepted and aborted, no external provider accessed. The provider root itself is empty; this is **not a filled creative**. No Reference content redesign or production page/config change occurred. This response-level composition is not a fresh ads-enabled final build.

| State | Desktop / mobile geometry | Observed result | Limit |
| --- | --- | --- | --- |
| Disabled accepted output | no slot | PASS: 0 `.ad-slot` nodes | No ad request/delivery claim |
| Enabled empty/unfilled | 728×90 / 390×48.203125 | PASS: reserved ratio, within viewport, labelled Advertisement, no overlap with Hero/following section; 0 provider roots | Empty layout only |
| Enabled synthetic provider | 728×90 / 390×48.203125 | PASS: same geometry, 1 synthetic provider root, external bootstrap blocked | Not filled delivery/viewability |

Initial-load PerformanceObserver recorded no layout-shift entries in these four short observations (250ms after fonts/network readiness). This does **not** prove field/commercial CLS, delayed creative behavior or real viewability. Full commercial ad/required Human Ads Review remains NOT_RUN/PENDING. Ad-state contexts did not separately collect JS page errors, so JS-errors0 above applies to the main disabled journey observations only.

### Evidence, failures and remaining limits

Precise command: from Candidate, pinned Node22.22.0 PATH, existing `npm exec -- vitest run tests/reference-assembly-browser.test.ts --disableConsoleIntercept`, with `V27_ASSEMBLY_A_DIR`, `V27_ASSEMBLY_B_DIR`, `V27_ASSEMBLY_C_DIR` pointing to the accepted output paths and `V27_ASSEMBLY_EVIDENCE_DIR=/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky`. The complete invocation and raw logs are released through C2C execution_output. Without these explicit inputs the named opt-in test is SKIPPED, never an assembly PASS; it does not rebuild definitions or run the large suite.

- First attempt: exit1, 3/3 failed. The new test selected the first desktop submenu anchor, which had layout dimensions despite being opacity0/pointer-events:none without opening its group. Logs show pointer interception by main headers. This was a test-selection mistake, not established product breakage. Only the new test selector changed to prefer actual main-content links. No forced click, CSS override or production fix used. Original failure log [`test-attempt1.log`](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/test-attempt1.log) preserved.
- Second attempt: exit0, **3/3 PASS**; [`test-attempt2.log`](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/test-attempt2.log). No tests failed/skipped in this explicit run. No full check/full47/Safari command run.
- Actual machine-readable observations: [`REF-A-assembly-observations.json`](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/REF-A-assembly-observations.json); all remaining outcomes are distinguished, not collapsed into PASS.
- PNG provenance inventory: [`screenshots-provenance.json`](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/screenshots-provenance.json). Actual screenshots were captured from the observed pages/seams, not generated mockups.

| Screenshot | Dimensions | SHA256 |
| --- | --- | --- |
| [REF-A-1280-ad-empty.png](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/REF-A-1280-ad-empty.png) | 1280×3214 | `81a9d5d223db6dad707f6761e397d258c2dc7660c2736941244eedce4fd39dcb` |
| [REF-A-1280-ad-synthetic.png](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/REF-A-1280-ad-synthetic.png) | 1280×3214 | `81a9d5d223db6dad707f6761e397d258c2dc7660c2736941244eedce4fd39dcb` |
| [REF-A-1280-assembled.png](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/REF-A-1280-assembled.png) | 1280×7033 | `4d3182ee3449df19284bc7482421951970a133888e9357f3856c060eb64294d8` |
| [REF-A-390-ad-empty.png](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/REF-A-390-ad-empty.png) | 390×4652 | `ac06e5f6c2dd61de7855e73daf593768f0aeb596485ea12801b8d4595163ff40` |
| [REF-A-390-ad-synthetic.png](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/REF-A-390-ad-synthetic.png) | 390×4652 | `ac06e5f6c2dd61de7855e73daf593768f0aeb596485ea12801b8d4595163ff40` |
| [REF-A-390-assembled.png](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/REF-A-390-assembled.png) | 390×6886 | `e79ace1a9b0865748568b52a8c9228539d87bbaf2303df1a332cb77b4a66b83e` |

Screenshots are available for subsequent Human review. Codex inspection is not a Human signature; ChatGPT connector binary availability is not pixel visibility or independent visual-quality acceptance. No screenshot/Human/real-game identity approval was fabricated.

**Remaining:** supported-engine/viewport/JS/motion matrix incomplete; Firefox/WebKit/Safari NOT_RUN here; real Safari keyboard/AX UNPROVEN; complete contrast/all-target/focus-state coverage NOT_RUN; required Human media/no-media/title/identity/ads reviews PENDING; real ad delivery/viewability NOT_RUN. Full REF-A/B/C NOT ACCEPTED; WS06A/WS06B NOT CLOSED; WS07 real adoption 0/3; global PRODUCT/RELEASE NOT ACCEPTED. Historical failures/iteration/archive remain untouched. S5 completion is targeted evidence readiness for independent review, not gate closure.


## PLAN55 — targeted interaction / accessibility supplement (append-only)

Execution `c2c_a765` / iteration55; predecessor REVIEW54 ACCEPT — CURRENT TEST BASELINE (873 passed/3 opt-in skipped, before this test-only supplement). **READY_FOR_INDEPENDENT_REVIEW — LIMITED TECH EVIDENCE**, not full REF/AX acceptance.

Exactly the same four Active files as PLAN52: existing named assembly browser test modified, three reports appended. Product/Core/runtime/dependency/governance/SOP/Prompt/Contract delta=0. A/B/C generating tests, helper, original media and all accepted outputs were unchanged. No new test/runner/framework/schema/field/Pattern or compatibility layer. Original report prefixes and historical logs preserved. No full check, fixture generation, unrelated capture/full47/Safari run.

The dev-only `V27_ASSEMBLY_INTERACTION=1` selects just the new missing interactions in the existing named test; accepted S5 journey/ad/capture code remains intact in its original branch and was not rerun. Candidate branch/HEAD/tree and repaired tracked source diff are the identities recorded above, unchanged. Existing output `/private/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan49-kkxzjquc/readonly-rerun/generated-output` retained identity `722b3b4c836d9a0fc0ee79103c0e8f3da52f005820be4a42589ad592cb4975f5` under the same S5 algorithm; copied bytes verified unchanged before/after. Actual Chromium 153.0.8010.12, existing Playwright1.63.0, pinned Node22.22.0. Evidence output remains `final=false`.

| Observation / §V scope | Actual actions / measurements | Result and precise limit |
| --- | --- | --- |
| Desktop pointer navigation, 1280×960, JS on / no-preference | hover actual parent link, wait natural160ms opacity transition; menu opacity1/pointerauto; actual child pointer click reaches `/items/amber-lantern/` | PASS selected opened menu/child, no forceclick/DOM navigation; not global pointer PASS or WoG return-link proof |
| Skip/sequential keyboard, 1280×960 and390×844 | fresh article → actual Tab focuses skip, Enter hashes main, nextTab is beyond header; ShiftTab moves and Tab returns | PASS both selected paths; skip visible3px solid focus recorded, Human focus clarity remains PENDING |
| Mobile summaries/nestedEscape, 390×844 | Tab Menu → Space opens; Tab group → Enter opens → Tab overview; Escape group restores group summary; Escape root restores Menu | PASS selected existing native controls and scripted dismiss behavior; no fullAX/Safari claim |
| Target geometry at selected expanded mobile state | 8 actually-open-state rendered controls; min width 94.000px / minheight 44.000px; each≥24×24 CSSpx | PASS these measured controls only; closed sibling descendants excluded, not all-site controls |
| Boundary390→900→901→900, JS on | focused mobile overview stays900; maps to matchingdesktop page901, allmobile detailsclosed; Enter reaches `/items/`; focus currentdesktop then900 restoresMenu; Spaceoperable; no documentoverflow | PASS exact selected handoff/statecleanup/operability; no unlimitedmatrix/globalresize assertion |
| no-preference vs earlier reducedmotion | current computed reduce=false/root scroll smooth; S5reduce=true/rootauto/reveal1e-05s retained separately | PASS distinction; allanimations/states/engines not examined |
| no-JS native fallback,390×844/no-preference | article main visible; actual Menu/group clicks, overview to `/items/`; no documentoverflow | PASS native content/navigation; scriptedEscape and calculatorhydration NOT_RUN underJSoff, no fabricated tool fallback |
| Actualunknownroute / cleanup | HTTP404; normalownedAstrostopexit0/PIDgone; browser/contextsclosed;fixturedeleted | PASS ownedrun integrity; no finalapproval implied |

### Computed contrast / state boundary

Actual selected opened desktop child labels are measured against the first opaque ancestor CSS background, using sRGB relative luminance. Small text threshold4.5:1 was applied conservatively to both elements (16px title,8.32px description). No alpha/image background was silently assumed; unsupported nonopaque colors fail the test.

| Measured text | Foreground / background | Actual ratio | Threshold | Outcome |
| --- | --- | --- | --- | --- |
| Amber Lantern — Fictional Equipment | `rgb(31, 36, 38)` / `rgb(246, 245, 241)` | 14.380476:1 | 4.5:1 | PASS measured state |
| Read the fictional Amber Lantern's utility category, four-unit cost, and station-marking effect under QA relay rules v1. | `rgb(105, 113, 116)` / `rgb(246, 245, 241)` | 4.567068:1 | 4.5:1 | PASS measured state |

This does not prove all body text, image text, hover/focus/active states, graphical contrast or every target. Mobile controls have measured dimensions and computed color/background recorded, but no all-mobile contrast ratio assessment. Existing UA/native summary focus and a selected overview outline were observed; perceptual visibility/Human state review remains PENDING. No visual-quality or required Human approval inferred from CSS measurements.

### Raw attempts preserved / scope

Command from Candidate: pinned Node22.22.0 `npm exec -- vitest run tests/reference-assembly-browser.test.ts --disableConsoleIntercept` with the three same accepted output directory env inputs, `V27_ASSEMBLY_INTERACTION=1`, and `V27_ASSEMBLY_EVIDENCE_DIR=/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos`.

- [attempt1][fail55-A] exit1: REF-A1FAIL, REF-B/C2SKIPPED after fail-closed stop. The newtest asserted opacity1 immediately at hover transition start (opacity0/pointerauto). Original rawfailure and `REF-A-interaction-failure.json` retained. Product defect not established. Only newtest added polling for natural existing transition; no production CSS change/forceclick.
- [attempt2][pass55b-A] exit0:3/3PASS. Rawlog retained. During evidence review, target geometry query was found to include closed sibling-menu descendants exposing layout rectangles; their sizes are not proof of visible targets. No productdefect established; query was tightened to exclude descendants of closed details.
- [attempt3][pass55c-A] exit0:3/3PASS with stricter actual-open target query. No skipped/failed observations in this explicit final run. This repeat was justified by the new measurement correction, not score inflation. Allthree attempts cleaned normally.

Final actual records: [REF-A-interaction observations][obs55-A]. Six observation groups for this Reference (desktoppointer, two keyboardviewports, mobile, exactresize, no-JS). No screenshot needed or captured here. Both S5 failure/pass and these failures/pass logs remain unchanged; corrected tests do not erase failed attempts.

Full REF-A/B/C NOT ACCEPTED, WS06A/WS06B NOT CLOSED. Remaining multi-engine/currentqualification, broader contrast/allstates/targets, actual ads-enabledbuild/delivery/viewability, independent PNGpixels and requiredHuman signatures remain unresolved. RealSafari/AX UNPROVEN, WS07adoption0/3, globalPRODUCT/RELEASE NOTACCEPTED. No acceptance promotion, historical/archive mutation or commit/push/tag/merge/deploy/release.

[fail55-A]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos/test-attempt1.log
[pass55b-A]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos/test-attempt2.log
[pass55c-A]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos/test-attempt3.log
[obs55-A]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan55-fayj6mos/REF-A-assembly-observations.json


## PLAN57 — Actual ads contract attempt / STOP for independent review

Scope: modified only `tests/reference-assembly-browser.test.ts` and this append-only REF-A report. No Candidate Core/config/provider, REF-B/C, governance, SOP, dependencies or historical evidence edits. DEV-only opt-in `V27_ASSEMBLY_ADS=1`; the three unrelated assembly observations are skipped explicitly.

### Guarded source reuse / identities

The temporary named test reuses the existing REF-A prefix ending immediately before the unique `describe("REF-A synthetic seed through existing Starter consumers", () => {` boundary. Full source SHA256 is asserted `8569692654f30d3f3b9d2ef64c4fe4dfd6ac5b9ac7f8c6fa9b490a5b26bde803`; reused prefix SHA256 `d259aeac8c03c485b6e00c1c6b30052ded5bd1f4f24800e91b9ccf858384eefc`. Original Config, Inventory, facts, MDX, media, screenshot and pending Human decisions are authored by that unchanged builder, with no duplicate input definitions. Only the expected negative build-result assertion/console label and temporary post-build assertions differ. Temporary canonical AdsConfig enables home-primary; positive case copies the existing TestAdProvider byte-for-byte into the actual temporary ProjectAd integration point. Current Candidate production AdsConfig and no-op ProjectAd remain unchanged.

Current Candidate branch `v2.7/evolution`, HEAD `b067e8d4050478072f25a1dc78a8526cdd128cfd`, tree `1df0ade30b1eaf51a76820c8d8b83337786f0dc1`; actual source is the existing reviewed working tree, not HEAD alone. Original accepted REF-A output SHA256 `722b3b4c836d9a0fc0ee79103c0e8f3da52f005820be4a42589ad592cb4975f5` remains unchanged. Output hashes use sorted relative-path + NUL + raw bytes (S5 algorithm). Existing TestAdProvider SHA256 `a895df91f41115af31ece12fe1383e00bc03becbf2bdab1779beb3e19133972e`.

### CASE A — EXPECTED NEGATIVE CONTRACT EVIDENCE

Actual `build:evidence` exit1, after successful Astro generation, 11-route reconciliation and Pagefind normalization. Generated homepage has one enabled semantic wrapper, zero provider instances. Existing output audit rejects exactly:

`[/] Ad placement home-primary requires exactly one provider instance; found 0.`

No `EVIDENCE_BUILD_NOT_FINAL.json` exists in this negative output. Temporary result test1PASS verifies that rejection; it does not mean build PASS. Negative output SHA256 `f8fbc31ed16318c38cc01b2836b0b2846445f711ce681d837cb7078e06b5d7e5`; temporary test SHA256 `0bd9183779bd9c1b0bbc4e9d2e92b73a1b883bf7537b77102eb9359d63f7d56f`. Original builder logs its own output hash using its earlier algorithm; these two hash algorithms are not interchangeable. Strict final validation still exits1 with exactly the original two home/guide Human-media pending errors.

[Actual negative raw log](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan57-jd4w65nt/ads-evidence/negative/actual-build-test.log), [negative output](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan57-jd4w65nt/ads-evidence/negative/generated-output), [exact reused-input hashes](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan57-jd4w65nt/ads-evidence/negative/input-identities.json), [machine observations](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan57-jd4w65nt/ads-evidence/ads-contract-observations.json).

### CASE B — ACTUAL BUILD REJECTION / NOT ACCEPTED

The existing TestAdProvider was copied unchanged. Actual `build:evidence` exit1 after Astro generation, reconciliation and Pagefind normalization. Audit rejected:

`[/] External script reference is not allowed by default.`

Readonly diagnosis: `scripts/audit-build.ts` rejects every HTTP(S) external script at its existing default rule; the existing TestAdProvider contains `https://ads.test.invalid/bootstrap.js`. Ads-instance-specific validation does not exempt this script from the general build audit. No allowance, provider rewrite or audit weakening was attempted. This is a discovered verification/configuration-contract conflict, not established as an unrelated production defect.

The temporary positive test's beforeAll assertion fails; its result test is SKIPPED. Its generated-output export is after that assertion and was not reached. The partial inner output was removed by the original cleanup; no retained positive-output SHA256/marker claim or positive input equality PASS is available. Temporary transformed source and actual build log are preserved outside Active workspace. Strict validation did independently retain exactly the two original Human-pending errors.

[Actual positive failure log](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan57-jd4w65nt/ads-evidence/synthetic-provider/actual-build-test.log), [exact temporary test source](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan57-jd4w65nt/ads-evidence/synthetic-provider/temporary-test-source.txt).

### Run / STOP / cleanup

Pinned Node22.22.0 named command: `npm exec -- vitest run tests/reference-assembly-browser.test.ts --disableConsoleIntercept`, with `V27_ASSEMBLY_ADS=1`, original accepted REF-A directory and external evidence directory `/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan57-jd4w65nt/ads-evidence`. [Full attempt1 log](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan57-jd4w65nt/test-attempt1.log) exit1: outer1FAIL +3SKIPPED; negative child1PASS, positive child suiteFAIL/testSKIPPED. These skipped cases are not PASS. No repeat or automatic repair.

STOP immediately on positive audit rejection. No targeted browser, successful ads-enabled evidence marker, real creative/delivery/viewability/field CLS or Human acceptance is claimed. No preview was started. Both owned outer projects and both original builder inner projects were removed normally, verified from raw paths; no fallback termination. Negative output and failure logs remain intact.

PLAN57 status: BLOCKED / READY FOR INDEPENDENT CONFLICT REVIEW. Full REF-A/B/C NOT ACCEPTED; WS06A/WS06B NOT CLOSED; Human PENDING; real Safari/AX UNPROVEN; WS07 0/3; global PRODUCT/RELEASE NOT ACCEPTED. PRODUCT CODE DELTA =0; no commit/push/tag/merge/deploy/release.


## PLAN58 — Offline synthetic ads actual-build TECH evidence

Predecessor independent [REVIEW57/PLAN58](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan57-jd4w65nt/review57-plan58.md) accepts correct STOP and CASE A negative contract; original TestAdProvider CASE B remains FAIL/BLOCKED for default external-script rejection. That failure, negative output, logs and report section are preserved, not reclassified. No CASE A/REF-B/C rerun.

Scope: the same two Active modifications only: existing named assembly test and this append-only report. New opt-in `V27_ASSEMBLY_ADS=offline` selects exactly one offline case; the three unrelated assembly cases are SKIPPED, not PASS. No Candidate production changes.

### Temporary offline provider, explicitly different from the original fixture

A project-authored empty provider exists only inside owned temporary `src/components/ads/ProjectAd.astro`. It uses existing `AdPlacement` / `AdPlacementDefinition` contracts and configured `definition.instanceId`, `definition.publicSlotId`, `placement` for one empty root. It has no external script, inline bootstrap, creative, response injection or private attribute. Its [exact source](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan58-dz7q8qmo/evidence/offline/offline-provider-source.txt) is retained outside Active workspace; SHA256 `02738fb7d4c6615648da5645c66b0a13ef1d6c1feb0f0e987167840021b7ddd1`. This is intentionally an offline test adapter, NOT the unchanged external-bootstrap TestAdProvider and NOT a production-provider acceptance. Original fixture SHA256 `a895df91f41115af31ece12fe1383e00bc03becbf2bdab1779beb3e19133972e` and real Candidate no-op ProjectAd remain unchanged. No runtime schema/registry/framework or dependency added.

### Source/build identities and actual outcomes

Current Candidate branch/HEAD/tree remain `v2.7/evolution` / `b067e8d4050478072f25a1dc78a8526cdd128cfd` / `1df0ade30b1eaf51a76820c8d8b83337786f0dc1`; reviewed production working tree unchanged. Existing REF-A source SHA256 `8569692654f30d3f3b9d2ef64c4fe4dfd6ac5b9ac7f8c6fa9b490a5b26bde803`, exact guarded prefix `d259aeac8c03c485b6e00c1c6b30052ded5bd1f4f24800e91b9ccf858384eefc`. [Temporary named test source](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan58-dz7q8qmo/evidence/offline/temporary-test-source.txt) SHA256 `58158cf7d78a8a0fe93a430c4bd0be3bb55946994f828225b604f9b6f110b487`. The same unique source-boundary safeguards apply; only the historical output label and temporary result assertions change.

Eleven original Config/Inventory/Facts/MDX/Media/Human-table/asset input hashes exactly equal PLAN57 CASE A input hashes, verified before preview. [Input identities](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan58-dz7q8qmo/evidence/offline/input-identities.json). No reauthoring or duplicate authority. Original accepted REF-A output identity remains `722b3b4c836d9a0fc0ee79103c0e8f3da52f005820be4a42589ad592cb4975f5`. Actual offline generated output identity `5a8e266e22f79f118edb0975aad1a3f9460dc03db5cc0d2da10d76d5c7af3b87` (S5 sorted-path + NUL + raw byte algorithm); a separate real output, not the earlier response-level ad seam or failed external-bootstrap build.

- Strict `npm run validate`: exit1; exactly the original home and relay-overview HIGH PRIORITY Human-media pending errors remain. No signatures fabricated.
- Actual `npm run build:evidence`: exit0; Astro build, 11-route output reconciliation, Pagefind normalization and existing generated HTML audit PASS.
- Marker exists with `mode=evidence`, `final=false`; this is evidence-purpose output, not final publication.
- Actual `dist/index.html`: exactly one home-primary semantic wrapper/one provider instance; configured instance/public slot IDs; no ad bootstrap/external-ad-script, no filled-creative claim.

[Actual validation/build raw log](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan58-dz7q8qmo/evidence/offline/actual-build-test.log), [actual output](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan58-dz7q8qmo/evidence/offline/generated-output), [actual marker](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan58-dz7q8qmo/evidence/offline/generated-output/EVIDENCE_BUILD_NOT_FINAL.json).

### Chromium observations of actual generated output

Chromium 153.0.8010.12 / Playwright 1.63.0; actual generated HTML served unchanged by owned Astro preview. No HTML response insertion, fabricated network response, force-click or real ad network. Desktop1280×960/mobile390×844 reduced-motion contexts; only initial navigation/fonts.ready/networkidle +250ms observation window.

| Viewport | Reserved slot | Provider roots / identity | Actual empty provider dimensions | Tested layout | Observed shift entries / JS errors / external blocked requests |
| --- | --- | --- | --- | --- | --- |
| 1280×960 | 728×90 CSSpx | 1 / correct configured IDs | 728×0; text empty, children0 | clear Hero/followingsection; no overflow | [] / [] / [] |
| 390×844 | 390×48.203125 CSSpx | 1 / correct configured IDs | 390×0; text empty, children0 | clear Hero/followingsection; no overflow | [] / [] / [] |

The provider root itself has height0, while its semantic slot reserves the configured aspect ratio; this is an empty/unfilled creative state. Bounded initial layout-shift entries `[]` do not prove field/commercial CLS. External requests were blocked by context policy if attempted; none were attempted here because the offline provider has no bootstrap. External Bootstrap integration, advertising requests, real Creative rendering, fill rate, viewability and field/commercial CLS are NOT_RUN. Human Ads Review PENDING.

### Verification / cleanup / terminal boundary

Pinned Node22.22.0 `npm exec -- vitest run tests/reference-assembly-browser.test.ts --disableConsoleIntercept`, `V27_ASSEMBLY_ADS=offline`, accepted REF-A output directory and external evidence directory `/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan58-dz7q8qmo/evidence`. [Attempt1 full raw log](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan58-dz7q8qmo/test-attempt1.log) exit0: named outer1PASS/3SKIPPED; temporary child1PASS. No new failure/no rerun. [Machine observations](/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan58-dz7q8qmo/evidence/ads-contract-observations.json).

Normal owned preview stop exit0/PID95338 gone; browser and both contexts closed; original inner fixture and owned outer fixture removed; no fallback termination. Actual output hashes are unchanged across preview; original source fixture and accepted output remain unchanged. No screenshots required/captured.

REF-A ADS: OFFLINE SYNTHETIC TECH ONLY, READY FOR INDEPENDENT REVIEW. Full REF-A/B/C NOT ACCEPTED; WS06A/WS06B NOT CLOSED; Human PENDING; Safari/AX UNPROVEN; WS07 0/3; global PRODUCT/RELEASE NOT ACCEPTED. PRODUCT CODE DELTA =0. No fullcheck/full47/Safari/unrelated interaction rerun; no governance/SOP/Prompt/Contract edit, commit/push/tag/merge/deploy/release.
