# Gamble With Your Friends — TASK-R1 Source Readiness

Date: 2026-10-09 Asia/Taipei. Execution owner: Codex. Authority: ChatGPT REVIEW68 / PLAN69. Scope: two readiness documents only; no runnable adoption or product change.

## First-party authority and actual acquisition

The existing in-app browser opened [the reference fan site](https://gamblewithyourfriends.net/) and followed its observed Steam destination, [App3892270](https://store.steampowered.com/app/3892270/Gamble_With_Your_Friends/). The fan site's footer explicitly states fan-made/not affiliated/not official. It is discovery/composition reference, not developer authority. No claims about its traffic, revenue or commercial success are made.

The official Steam product page identifies developer **TEAM GWYF**, publisher **TENSTACK**, and localized title **朋友，梭哈吧**; its purchase heading also displays **Gamble With Your Friends**. This establishes the title/App match and developer/publisher attribution. The product's About This Game is the publisher-presented description on the official distribution platform, not a user review or a fan guide. It does not establish that either company operates or endorses this proposed guide site.

Access: 2026-10-09 Asia/Taipei. Actual rendered page: `https://store.steampowered.com/app/3892270/_/` (localized redirect from the observed English-title link). No login or transaction was required for the retrieved product description. The page exposes a login link, but that is not an acquisition blocker or a claim about the user's account. No cookie, credential, EULA acceptance, purchase or account action occurred.

The combined navigation/read call timed out and reset the automation runtime; checking the same browser's existing tab showed the Steam page had loaded. A subsequent read of that same tab retrieved the description. This was tool-call timing, not a demonstrated login/CAPTCHA/network denial. No alternate browser, public search, third-party reader, API or anonymous fallback replaced the source channel. The timeout remains in the released acquisition record.

## Supported facts and one selected task

| Source / location | Bounded fact | Use / limitation |
| --- | --- | --- |
| Steam App3892270 identity fields and purchase heading | Title/App identity; TEAM GWYF developer and TENSTACK publisher | Attribution only; no operator affiliation/endorsement. |
| Steam short description / About This Game | Online co-op for 1–6 players; a shared bank account and debt; five minutes to meet a daily quota | Published game description, not observed gameplay or a current patch guarantee. |
| Steam shared-money section | A single player's all-in loss can affect the group's shared money | Supports coordination context, not odds, strategy, prescribed stake size or a guaranteed recovery. |

Selected player question: **What should our group confirm before its first use of the shared bank?**

Minimal direct answer: confirm together the currently displayed shared balance and today's target, and agree to communicate before using the common funds. The shared bank/timed target are published game facts; this confirmation/communication procedure is **editorial guidance**, not an official game rule, tested optimal strategy or a built-in approval mechanic.

Suggested sequence for later ordinary MDX: identify the shared balance and current daily target in the player's running game; compare the readings with the group; agree how to communicate a proposed expenditure; pause if the amount, target or teammates' understanding is unclear. Do not invent a UI location, button, reset or permission system. Completion means the group can state the same current readings and understands that spending affects all players; it does not mean a quota is reached or a win is assured. The truthful next action is to check the current in-game rules for the activity the group actually intends to play, before choosing an action. If unavailable, stop instead of applying generic casino rules.

### Blackjack limitation

Blackjack is a preferred discovery direction in PLAN69, conditional on official game-specific rules. The retrieved official description does **not** establish hit/stand/double/split behavior, dealer rules, payouts, achievements or optimal decisions. Accordingly no Blackjack task or guide is authorized by these facts. The shared-bank preparation task is the one task selected; there is no second fallback task.

## References, unsupported claims and conflicts

- `template/case-evidence/cases-a.md` records the 2026-10-01 fan homepage → Games → Blackjack observation. That is historical composition evidence, not a current V2.7 adoption or verified game rules.
- The current fan homepage claims version v1.0.4 and detailed progression/strategy. The official page surfaces a later v1.0.30 announcement, but that announcement was not opened. Neither label is adopted as current versionContext; no patch agreement or detailed mechanics are inferred.
- `template/temp3_based_gamblewithyourfriends.net/lib/site.ts` expressly calls Neon Stakes fictional. Its prose, shared-vault setting, synthetic assets and Next.js components are excluded entirely from game inputs. Similar terminology is not evidence of authenticity.
- No selected task uses fan claims about save scumming, seeds, floors/day counts, body-part values, items, achievements, endings, matchmaking or win guarantees. No odds, prices, optimal stake, profits, platform financial claims or monetization outcome is approved.
- The fan-site task organization may inform a composition observation; its words/art/rules are not copied. Market research was not performed; no commercial-success conclusion is drawn from store reviews or sales claims.

## Media, visual evidence and rights

No image/video was downloaded or reused; no competitor asset or synthetic Neon Stakes media is imported. The source page contains trailer/animated media controls, but this slice did not review their frames for visual suitability or acquire reuse rights. Typography, colors and surfaces are therefore **not** qualified as game-specific visual evidence here. A later theme decision must reference actual verified game visuals, or remain explicitly unproven. A logo/title/generic casino style alone cannot pass identity.

This first task can be expressed in text with existing WikiArticle/MDX. A future no-media choice is a scoped project decision requiring the existing media/visual/Human review, not a whole-game exemption. Operator identity, independent-site disclosure, content accuracy/usefulness, visual suitability, rights, legal/ads applicability, keyboard/Safari/AX and final exact-build review remain pending.

## Exact next inputs, without implementation

One native Guides Hub entry and one article at `/guides/shared-bank-check/`, using the selected question, attributed game facts, plainly labelled editorial procedure, stop/completion rules and manual next action above. Page Inventory owns the page/source/date binding; Content owns prose; game.config.ts owns existing brand/navigation/feature values; theme.css owns existing token values. No runtime adaptation field, Pattern ID, schema, dedicated Task/Steps/NextStep component or new authority is proposed.

Source access date is independent of publication/update; actual publication/revision dates are assigned only when the later content is created. sourceCheckedAt must not become verifiedAt, Human approval or liveStatus. No version/patch assertion is approved.

PRODUCT CODE DELTA=0. TEST CODE DELTA=0. TASK-R1: READINESS ONLY. WS07 FINAL ADOPTION=0/3; WS06/WS08/global PRODUCT/RELEASE not accepted; Human and Safari/AX remain unproven. No commit/push/tag/merge/deploy/release.
