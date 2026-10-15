# PLAN41 Two-Game Vertical Proof — Fresh v2 review package

Implementer: Codex. Independent reviewer: ChatGPT / AI Architect. Status: READY_FOR_INDEPENDENT_PRODUCT_REVIEW; no executor PRODUCT verdict.

## Baseline / scope

Both copies derive from the same actual repaired Candidate working tree, not HEAD alone. See common-core-identity.md and iteration41/chatgpt-plan.md. Core/shared source mechanism delta = 0; all BF differences exactly BF10, WoG exactly WoG8. Candidate unchanged during PLAN41. BF has 8 present inputs / 2 deletions; PLAN41's “nine present” is a count typo in its exact10 list. No ninth present input added. WoG has 6 present / 2 deletions.

Common Node22.22.0; independent physical dependency copies; identical package/lock bytes. No install/update. Theme existing selectors/declarations unchanged, values only. Plain MDX, no imports; no new Pattern ID/enum/schema/registry/wrapper, route logic or runtime authority. Original BF/WoG repos, governance/Amendment/Design/SOP/Master Prompt and history unchanged.

About uses each project's Page Inventory description with the accepted common implementation; neither game edits About Core. Both pass retained PP-02; no sentinel downgrade or per-game special case.

## Actual checks/builds

- shared-check.log: PASS, 48 test files / 859 tests; Astro 152 files, 0 errors/warnings/hints. One fresh common check, no retry.
- bomb-farm-build.log: npm run build:evidence PASS, output audit PASS, 5 actual routes.
- wog-build.log: npm run build:evidence PASS, output audit PASS, 5 actual routes.
- Complete actual dist trees are mirrored under outputs/bomb-farm and outputs/war-of-genesis, without HTML edits. EVIDENCE_BUILD_NOT_FINAL remains. Four fixed representative HTML paths are within those trees; About/404/guide hub or home are support, not extra representative business pages.

## Historical failures remain

The narrative is v1 baseline omission → corrected baseline → real About portability gap → separate exact6 repair → REVIEW40 ACCEPT → fresh v2 baseline. Historical facts are not superseded bytewise or rewritten FAIL→PASS. References:

- ../proof-v1/shared-check.log (iteration38 missing CI snapshot FAIL).
- ../proof-v1/shared-check-retry.log (iteration39 corrected baseline PASS).
- ../proof-v1/bomb-farm-build.log (real About portability FAIL).
- ../../../executions/v2.7-two-game-proof/iteration38/result.md
- ../../../executions/v2.7-two-game-proof/iteration39/result.md
- ../../../executions/v2.7-two-game-proof/iteration40/result.md

Frozen BF10 adoption docs intentionally retain their earlier PLAN38/39 context/old About blocker statement. That statement is historical context of reused bytes; current repaired-Core v2 build is recorded here. No frozen input silently rewritten.

## Four real browser journeys

Browser: official in-app Browser, fresh local v2 preview outputs. Chrome API repeatedly failed request-header-policy loading; native GUI had timeout; existing IAB remained operational. Same Browser plugin used existing internal preview under the user's prior broad browser authorization. ChatGPT stayed on its original IAB tab. No anonymous fetch/raw browser process/DOM injection or mocked browser output. Temporary preview tabs closed and viewport overrides reset.

Navigator.userAgent is not exposed by the documented read-only evaluate environment; no UA/version claimed. Scope is actual IAB responsive product observation, not Safari/AX certification.

Desktop inner viewport 1440×900; mobile 390×844, confirmed by rendered DOM. Full-page screenshots omit the 15px vertical scrollbar, so image widths are 1425/375; no resizing. Browser JPEG bytes encoded to true PNG using existing bundled image library; no page re-render/stylization. Table UTC is artifact write time, not an asserted exact browser capture timestamp.

| Screenshot | Actual inner viewport | Full-page PNG dimensions | Artifact written UTC |
| --- | --- | --- | --- |
| bf-home-desktop.png | {"height":900,"width":1440} | 1425 × 2790 | 2026-10-08T11:07:06.008Z |
| bf-home-mobile.png | {"height":844,"width":390} | 375 × 2926 | 2026-10-08T11:08:20.631Z |
| bf-how-to-play-desktop.png | {"height":900,"width":1440} | 1425 × 6987 | 2026-10-08T11:13:49.361Z |
| bf-how-to-play-mobile.png | {"height":844,"width":390} | 375 × 7329 | 2026-10-08T11:08:36.538Z |
| wog-hub-desktop.png | {"height":900,"width":1440} | 1425 × 1380 | 2026-10-08T11:08:45.785Z |
| wog-hub-mobile.png | {"height":844,"width":390} | 375 × 1336 | 2026-10-08T11:09:13.937Z |
| wog-gear-desktop.png | {"height":900,"width":1440} | 1425 × 6630 | 2026-10-08T11:12:30.534Z |
| wog-gear-mobile.png | {"height":844,"width":390} | 375 × 7477 | 2026-10-08T11:09:28.902Z |

BF desktop/mobile: actual Start here click from / reaches /guides/how-to-play/. Desktop TOC locates real heading (~80.7px from viewport top); FAQ expands actual stop-rule content. Mobile has loaded diagram with meaningful alt, no horizontal overflow. First-screen article header/summary precedes hero; the direct body answer is after hero/TOC, rather than claiming it is within first 900px. Mine overview manual link actually returns /.

WoG desktop/mobile: actual directory card click reaches /guides/gear/. TOC locates real item-identity heading (~61.1px top); FAQ expands listing/eligibility boundary. Images/figure/video/iframe = 0; no empty media slot. Wrapped inline item decisions link: two pointer-centre attempts did not navigate; actual keyboard activation reached /guides/. This is recorded as pointer-automation hit limitation, not pointer PASS or proof of all pointer interactions. External source hrefs are present and dated, but not re-fetched or asserted live/current in this iteration.

Visible keyboard evidence: actual Tab focuses Skip to content with solid 3px outline on both entry pages at desktop and both article pages at desktop/mobile; article focus at x12/y12. Mobile entry focus was not separately recorded. All eight viewport observations show no document horizontal overflow. No full keyboard/a11y/Safari matrix claim.

## Six differentiation dimensions — actual observations, independent verdict pending

| Dimension | BF actual facts | WoG actual facts | Independent acceptance needed |
| --- | --- | --- | --- |
| A Visual identity | Existing dark/ochre/compact-interface values; mine/squad/three-team concept, Forge/skill-tree names; original diagram visible; source-backed context only | Existing slate/brass/editorial values; Strife/Valor identities and App4891320 dated market context; no game UI image | Strict masked per-game identification, ≥2 non-name/logo cues with ≥1 real game-specific cue. Styling/filename/app-ID lookup/elimination alone insufficient. UNPROVEN until independent review |
| B Media treatment | One original diagram mapped to home and article; explains three team choices, not recovery stages or optimal order; caption says project-authored, not screenshot; source and real authorship rightsRef | Empty Manifest preserved; documented no-media bounded decision method; no image placeholder; no UI identification claim | Determine explanation is useful and WoG chosen task does not depend on unavailable game UI. Human/visual media review still pending; no rights waiver |
| C Page rhythm | Native home with explicit Start here, diagram, bounded guide category and About; article image then mine observation/loop | Native one-row guides directory; text-first article, dated identities then six-check decisions and stops | Shared article shell/order still same. Do not count only serif/colour/empty-image differences; actual full-page structures supplied |
| D Player task | Observe mine progress/available upgrade/team choice and explain switching concept; stop on unclear action; no timer/build guarantees | Identify exact item/copy/action and inspect eligibility/trade-off; keep/inspect on missing details; no price/sale strategy guarantees | Assess task usefulness and game specificity within dated evidence. Both editorial safety boundaries are shared, not claimed differentiation |
| E Taxonomy/navigation | Mine overview → Mine guides → one real How to Play answer; no promised complete entity database | Item decisions → one Gear answer; no copied /market/ or calculator; scope bounded | Actual entry card/CTA journeys and manual returns supplied. Existing generic Guide library/Start here/Related headings remain; no fake taxonomy coverage |
| F Article composition | Diagram explanation, four observation actions, between-push systems, completion and conditional source check | Direct answer, two dated listing identities, six editorial checks, keep/inspect/revisit branches, completion and manual source check | Existing WikiArticle/TOC/FAQ/Sources reused verbatim; ordinary content expresses tasks. Dedicated QuickAnswer/Steps/NextStep components still absent |

## FD-01–FD-06 actual risk observations

| Risk | Actual evidence | Remaining boundary / independent verdict |
| --- | --- | --- |
| FD-01 shared homepage collections | BF home has Start here/category/Browse all; WoG representative is native one-row guides hub. Both generated/screened | Shared collection labels are retained and do not prove a unique site by themselves; sparse one-guide coverage is explicit |
| FD-02 shared article shell | Identical Core WikiArticle in both, same header/TOC/FAQ/Related/Sources; different original media/plain MDX body; screenshots/HTML provided | Judge mine observation vs item decision task progression, not shell names or count of H2s |
| FD-03 WoG branding without game visual evidence | Both masked desktop article derivatives supplied; names/titles removed, game-specific terms retained | Strict identity PENDING; no brand/OG/serif/brass shortcut; if content evidence insufficient, FAIL/unproven, never lower criterion |
| FD-04 shared idle/gear/market concerns | BF concerns mine progress/squad/team switching, WoG concerns exact-copy eligibility/decision. No borrowed market/farming/build widgets | General inspect/stop prose overlaps. Reviewer must judge dominant question/answer, not shared caution text |
| FD-05 WoG qualitative generic content | Concrete Strife/Valor, App4891320 publisher-fee relation, dated source links; explicitly not equipment/rarity/upgrade/build proof | Six-check method is editorial and broadly applicable; item identities alone may not establish useful game-specific decisions. No invented mechanic or current-market claim |
| FD-06 inherited project forks | Actual common v2 source/dependency copies; BF10/WoG8 diffs; shared mechanism0; new builds/screenshots | No old PASS/screenshot/Core inheritance; old repos untouched; exact6 independent repair distinguished from proof adaptation |

## Faithful masked derivatives

From current desktop PNGs only: bf-how-to-play-masked.png, wog-gear-masked.png. Opaque black rectangles over explicit brand mark/name, breadcrumb page titles, H1, related page titles and footer names. No labels, new art, body rewriting, terminology removal, page DOM/CSS mutation, resizing or regenerated screenshot. H1 rectangle includes glyph overflow within surrounding blank title space. Footer year retained; brand prefix alone masked. Empty title-popover geometry may also be covered, but no body evidence. Existing bundled image encoding/rectangle operation only; no helper file/dependency added.

Raw decoded pixel comparison: changed channels outside declared rectangles = 0 for EACH derivative. Codex checked masking fidelity, not game identification. Independent reviewer must state specific identification and supporting cues separately for each page, not infer from filename or the other game's result.

Mask rectangle facts:

```json
{
  "bf": {
    "width": 1425,
    "height": 6987,
    "rects": [
      {
        "text": "BF",
        "x": 119,
        "y": 18,
        "w": 51,
        "h": 52
      },
      {
        "text": "BF Wiki",
        "x": 176,
        "y": 25,
        "w": 321,
        "h": 24
      },
      {
        "text": "How to Play Bomb Farm: The Mine and Three-Team Loop",
        "x": 1001,
        "y": 87,
        "w": 299,
        "h": 52
      },
      {
        "text": "Bomb Farm Wiki",
        "x": 120,
        "y": 112,
        "w": 92,
        "h": 15
      },
      {
        "text": "Bomb Farm Mine Guides — Start with the Core Loop",
        "x": 232,
        "y": 112,
        "w": 304,
        "h": 15
      },
      {
        "text": "How to Play Bomb Farm: The Mine and Three-Team Loop",
        "x": 540,
        "y": 111,
        "w": 338,
        "h": 18
      },
      {
        "text": "How to Play Bomb Farm: The Mine and Three-Team Loop",
        "x": 106,
        "y": 323,
        "w": 1013,
        "h": 311
      },
      {
        "text": "Bomb Farm Mine Guides — Start with the Core Loop",
        "x": 120,
        "y": 5784,
        "w": 979,
        "h": 70
      },
      {
        "text": "Bomb Farm Wiki — Understand the Mine Loop",
        "x": 120,
        "y": 5965,
        "w": 869,
        "h": 70
      },
      {
        "text": "BF Wiki",
        "x": 120,
        "y": 6771,
        "w": 733,
        "h": 19
      },
      {
        "text": "Bomb Farm Wiki / 2026",
        "x": 908,
        "y": 6787,
        "w": 95,
        "h": 22
      }
    ],
    "outsideMaskChangedChannels": 0
  },
  "wog": {
    "width": 1425,
    "height": 6630,
    "rects": [
      {
        "text": "WoG",
        "x": 119,
        "y": 18,
        "w": 51,
        "h": 52
      },
      {
        "text": "WoG Wiki",
        "x": 176,
        "y": 25,
        "w": 359,
        "h": 24
      },
      {
        "text": "War of Genesis Gear: Keep, Use or Inspect Before Selling",
        "x": 1001,
        "y": 87,
        "w": 299,
        "h": 52
      },
      {
        "text": "War of Genesis Wiki",
        "x": 120,
        "y": 112,
        "w": 123,
        "h": 15
      },
      {
        "text": "War of Genesis Item Decisions — Gear Before a Sale",
        "x": 263,
        "y": 112,
        "w": 317,
        "h": 15
      },
      {
        "text": "War of Genesis Gear: Keep, Use or Inspect Before Selling",
        "x": 584,
        "y": 111,
        "w": 369,
        "h": 18
      },
      {
        "text": "War of Genesis Gear: Keep, Use or Inspect Before Selling",
        "x": 106,
        "y": 323,
        "w": 1013,
        "h": 311
      },
      {
        "text": "War of Genesis Item Decisions — Gear Before a Sale",
        "x": 120,
        "y": 5213,
        "w": 1012,
        "h": 70
      },
      {
        "text": "War of Genesis Wiki — Start with an Item Decision",
        "x": 120,
        "y": 5394,
        "w": 997,
        "h": 70
      },
      {
        "text": "WoG Wiki",
        "x": 120,
        "y": 6359,
        "w": 733,
        "h": 20
      },
      {
        "text": "War of Genesis Wiki / 2026",
        "x": 908,
        "y": 6431,
        "w": 127,
        "h": 21
      }
    ],
    "outsideMaskChangedChannels": 0
  }
}
```

## Compact actual browser observations

```json
{
  "bf-home-desktop": {
    "url": "http://127.0.0.1:4325/",
    "viewport": {
      "height": 900,
      "width": 1440
    },
    "overflow": false,
    "images": [
      {
        "alt": "Original diagram showing three teams available for switching to keep the mine running",
        "complete": true,
        "height": 675,
        "src": "/media/proof/three-team-switching.svg",
        "width": 1200
      }
    ],
    "headings": [
      "Bomb Farm Wiki",
      "Start here",
      "Browse by category",
      "Bomb Farm Mine Guides — Start with the Core Loop",
      "Browse all",
      "About Bomb Farm Wiki — Sources and Scope"
    ],
    "focus": {
      "outline": "rgb(88, 187, 174) solid 3px",
      "text": "Skip to content"
    }
  },
  "bf-how-to-play-desktop": {
    "url": "http://127.0.0.1:4325/guides/how-to-play/",
    "viewport": {
      "height": 900,
      "width": 1440
    },
    "overflow": false,
    "images": [
      {
        "alt": "Original diagram showing three teams available for switching to keep the mine running",
        "complete": true,
        "height": 675,
        "src": "/media/proof/three-team-switching.svg",
        "width": 1200
      }
    ],
    "mediaSlots": 1,
    "headings": [
      {
        "text": "How to Play Bomb Farm: The Mine and Three-Team Loop",
        "y": 339.25
      },
      {
        "text": "Read the three-team diagram",
        "y": 2223.71875
      },
      {
        "text": "Follow one mine session",
        "y": 2762.40625
      },
      {
        "text": "Between pushes: inspect rather than guess",
        "y": 3489.6875
      },
      {
        "text": "Know when this guide has answered the question",
        "y": 4045.40625
      },
      {
        "text": "Your next check",
        "y": 4601.125
      },
      {
        "text": "Frequently asked questions",
        "y": 5307.109375
      },
      {
        "text": "How this page was checked",
        "y": 6291.125
      }
    ],
    "focus": {
      "outline": "rgb(88, 187, 174) solid 3px",
      "rect": {
        "x": 12,
        "y": 12
      },
      "text": "Skip to content",
      "viewport": {
        "height": 900,
        "width": 1440
      }
    },
    "toc": {
      "target": "Read the three-team diagram",
      "top": 80.71875,
      "url": "http://127.0.0.1:4325/guides/how-to-play/#read-the-three-team-diagram"
    },
    "faq": [
      {
        "open": true,
        "text": "When should I stop and check the current game?Stop when the available upgrade, team state or action is unclear. Inspect the current interface and official information rather than assuming a timing or best-build rule."
      }
    ],
    "manualNextReturn": {
      "url": "http://127.0.0.1:4325/",
      "action": "Click mine overview after article conditional source-check guidance"
    }
  },
  "bf-home-mobile": {
    "url": "http://127.0.0.1:4325/",
    "viewport": {
      "height": 844,
      "width": 390
    },
    "overflow": false,
    "images": [
      {
        "alt": "Original diagram showing three teams available for switching to keep the mine running",
        "complete": true,
        "height": 675,
        "src": "/media/proof/three-team-switching.svg",
        "width": 1200
      }
    ],
    "mediaSlots": 1,
    "headings": [
      {
        "text": "Bomb Farm Wiki",
        "y": 183.34759521484375
      },
      {
        "text": "Start here",
        "y": 1115.40625
      },
      {
        "text": "Browse by category",
        "y": 1466.828125
      },
      {
        "text": "Bomb Farm Mine Guides — Start with the Core Loop",
        "y": 1639.421875
      },
      {
        "text": "Browse all",
        "y": 2037.234375
      },
      {
        "text": "About Bomb Farm Wiki — Sources and Scope",
        "y": 2161.828125
      }
    ]
  },
  "bf-how-to-play-mobile": {
    "url": "http://127.0.0.1:4325/guides/how-to-play/",
    "viewport": {
      "height": 844,
      "width": 390
    },
    "overflow": false,
    "images": [
      {
        "alt": "Original diagram showing three teams available for switching to keep the mine running",
        "complete": true,
        "height": 675,
        "src": "/media/proof/three-team-switching.svg",
        "width": 1200
      }
    ],
    "mediaSlots": 1,
    "headings": [
      {
        "text": "How to Play Bomb Farm: The Mine and Three-Team Loop",
        "y": 298.1213073730469
      },
      {
        "text": "Read the three-team diagram",
        "y": 2236.234375
      },
      {
        "text": "Follow one mine session",
        "y": 2812.609375
      },
      {
        "text": "Between pushes: inspect rather than guess",
        "y": 3607.234375
      },
      {
        "text": "Know when this guide has answered the question",
        "y": 4153.359375
      },
      {
        "text": "Your next check",
        "y": 4669.234375
      },
      {
        "text": "Frequently asked questions",
        "y": 5316.5
      },
      {
        "text": "How this page was checked",
        "y": 6357.21875
      }
    ],
    "focus": {
      "outline": "rgb(88, 187, 174) solid 3px",
      "rect": {
        "x": 12,
        "y": 12
      },
      "text": "Skip to content"
    }
  },
  "wog-hub-desktop": {
    "url": "http://127.0.0.1:4326/guides/",
    "viewport": {
      "height": 900,
      "width": 1440
    },
    "overflow": false,
    "images": [],
    "mediaSlots": 0,
    "headings": [
      {
        "text": "War of Genesis Item Decisions — Gear Before a Sale",
        "y": 273.948974609375
      }
    ],
    "focus": {
      "outline": "rgb(196, 169, 104) solid 3px",
      "text": "Skip to content"
    }
  },
  "wog-gear-desktop": {
    "url": "http://127.0.0.1:4326/guides/gear/",
    "viewport": {
      "height": 900,
      "width": 1440
    },
    "overflow": false,
    "images": [],
    "mediaSlots": 0,
    "headings": [
      {
        "text": "War of Genesis Gear: Keep, Use or Inspect Before Selling",
        "y": 343.0999755859375
      },
      {
        "text": "Two recorded item identities, not a gear ranking",
        "y": 1391.09375
      },
      {
        "text": "Work through the exact-copy decision",
        "y": 2187.40625
      },
      {
        "text": "Keep, inspect or revisit",
        "y": 3136.546875
      },
      {
        "text": "Your stopping point and next check",
        "y": 3808.53125
      },
      {
        "text": "Frequently asked questions",
        "y": 4736.375
      },
      {
        "text": "How this page was checked",
        "y": 5720.390625
      }
    ],
    "focus": {
      "outline": "rgb(196, 169, 104) solid 3px",
      "text": "Skip to content"
    },
    "toc": {
      "target": "Two recorded item identities, not a gear ranking",
      "top": 61.09375,
      "url": "http://127.0.0.1:4326/guides/gear/#two-recorded-item-identities-not-a-gear-ranking"
    },
    "faq": [
      {
        "open": true,
        "text": "Does a recorded Market listing mean every copy can be sold?No. A dated listing does not establish current availability, the eligibility of every copy, demand or a completed sale. Check the exact item in the current interface."
      }
    ],
    "manualNextReturn": {
      "url": "http://127.0.0.1:4326/guides/",
      "action": "Actual keyboard activation of wrapped inline item decisions link; pointer centre hit did not navigate",
      "pointerAttempt": "NO NAVIGATION; inline link bounding box spans wrapping"
    }
  },
  "wog-hub-mobile": {
    "url": "http://127.0.0.1:4326/guides/",
    "viewport": {
      "height": 844,
      "width": 390
    },
    "overflow": false,
    "images": [],
    "mediaSlots": 0,
    "headings": [
      {
        "text": "War of Genesis Item Decisions — Gear Before a Sale",
        "y": 205.34471130371097
      }
    ]
  },
  "wog-gear-mobile": {
    "url": "http://127.0.0.1:4326/guides/gear/",
    "viewport": {
      "height": 844,
      "width": 390
    },
    "overflow": false,
    "images": [],
    "mediaSlots": 0,
    "headings": [
      {
        "text": "War of Genesis Gear: Keep, Use or Inspect Before Selling",
        "y": 305.0613708496094
      },
      {
        "text": "Two recorded item identities, not a gear ranking",
        "y": 1760.078125
      },
      {
        "text": "Work through the exact-copy decision",
        "y": 2602.203125
      },
      {
        "text": "Keep, inspect or revisit",
        "y": 3571.828125
      },
      {
        "text": "Your stopping point and next check",
        "y": 4259.203125
      },
      {
        "text": "Frequently asked questions",
        "y": 5111.71875
      },
      {
        "text": "How this page was checked",
        "y": 6190.828125
      }
    ],
    "focus": {
      "outline": "rgb(196, 169, 104) solid 3px",
      "rect": {
        "x": 12,
        "y": 12
      },
      "text": "Skip to content"
    }
  }
}
```

## Known unresolved gates

- WoG and BF masked recognition: independent review PENDING; no implementer identity answer.
- WoG verified visual evidence weak; generic editorial style cannot compensate. dated item-listing context does not prove gameplay mechanics or current availability.
- BF project-authored diagram rights derives from recorded authorship; Human/visual evidence independently pending, official screenshot remains absent/unauthorized.
- Source checked dates remain September4/15, not publication October8; no current verification claim.
- Some article direct-answer content lies below the large title/media region; full-page screenshots disclose this.
- WoG wrapped inline link pointer-centre attempts failed while keyboard works; recorded, not erased.
- WS04B, WS07 adoption, Safari/AX, PRODUCT and RELEASE remain unaccepted. No final build, commit/push/tag/merge/deploy/release.

21 fixed files = 7 identity/diff/log/package + 10 screenshots + 4 representative HTML. Complete generated output trees are additional support. No large hashing/release matrix/fresh47/41 reconciliation.
