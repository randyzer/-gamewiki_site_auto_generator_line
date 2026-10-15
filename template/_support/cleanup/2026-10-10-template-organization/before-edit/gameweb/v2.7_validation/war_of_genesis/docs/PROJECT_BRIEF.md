# War of Genesis — WOG-R1 Bounded Adoption Brief

Date: 2026-10-09 Asia/Taipei. Execution owner: Codex. Authority: ChatGPT REVIEW66 / PLAN67. Documentation-only root, exactly two readiness documents. No runnable V2.7 project, build, browser, product-facing page change or final adoption acceptance in this slice.

## Real player decision and first useful change

Task: before choosing to keep, use or inspect a sale, establish the exact item's supported role and what is still unknown. Existing `guide.gear` → `/guides/gear/` directly answers with an inspect-first rule, conditional steps, trade-offs and a stopping point.

The next bounded content improvement should replace the current lack of item-use context with the freshly read, explicitly attributed Strife/Valor listing descriptions: different named Blacksmith application contexts, followed by a manual check against current game details. This gives the reader a concrete reason to distinguish two real items instead of repeating a generic keep/sell checklist. It is not a gear ranking, best build, stat calculator or recommendation to sell. Exact item facts and mediated/cache limits are in [RESEARCH_SOURCES.md](RESEARCH_SOURCES.md).

Keep the existing uncertainty, eligibility, replacement and completion/stop rules. Preserve publication date when later revising content; set actual content update and source-access dates independently, without patch/live-state claims. Only the actually refreshed guide sources should change dates; do not blanket-refresh all Inventory entries.

## Existing project and historical proof

Legacy project: `/Users/randyz/work/coding/hot_words_web/gameweb/game_warofgenesis`; branch `main`; HEAD `3784e8852ffb3c17cdea79d721adfaf1db1bc70c`; tree `475d12470f4cf32a5030234c01c6d5cffc117ecf`. Tracked diff empty; existing untracked project evidence remains preserved. Its brief records SOP/Prompt2.6.5 and Starter `29b25559cf2af859bca359c7f7fda686a4803c95`, tree `0920c9de216ada5601f681d81e4345cf69fb65e8`. Historical prelaunch/tool checks do not become current V2.7 acceptance.

Frozen proof: `template/codex/verifications/v2.7-two-game-proof/proof-v2/wog-input-diff.patch`, SHA256 `2808bc704e943d277171d3535edfba887ee5c289656f91a3d4b144cfa3eae0d4`. Independent REVIEW42/43 established bounded two-game proof only; no final WS07 adoption. Existing retained five-page output and native hub/gear journey are historical proof inputs, not this slice's new build evidence.

### Exact WoG8 inputs for future reuse

| Path | Frozen operation / responsibility |
| --- | --- |
| `docs/MEDIA_DECISION_TABLE.md` | Add; scoped text/no-media rationale, Human/visual PENDING. |
| `docs/PROOF_GAME_ADAPTATION.md` | Add; project method with authority references, not runtime schema. |
| `game.config.ts` | Replace approved brand/navigation/features values; native Item decisions journey. |
| `src/content/guides/gear.mdx` | Add; real exact-item decision article and FAQ. |
| `src/data/page-inventory.json` | Replace page truth/content/source bindings and enabled routes. |
| `src/styles/theme.css` | Replace only existing token values for quieter coal/slate/brass editorial treatment. |
| `public/logo.svg` | Delete shipped demo logo; no copied branded art. |
| `src/content/guides/getting-started.mdx` | Delete shipped demonstration content. |

Six present / two deleted. No Media Manifest change: it remains empty. No legacy custom market/build/tool renderer or bespoke UI port. Native routes remain `/`, `/guides/`, `/guides/gear/`, `/about/`, `/404.html`; unavailable legal routes stay outside enabled output.

## Same V2.7 three-artifact authority as Bomb Farm

| Artifact | Branch / HEAD / tree |
| --- | --- |
| `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE` | `v2.7/evolution`; `b067e8d4050478072f25a1dc78a8526cdd128cfd`; `1df0ade30b1eaf51a76820c8d8b83337786f0dc1` |
| `Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE` | `v2.7/normative-foundation`; `9a13b7314b9cb102b0c440d9677ab22400109e8f`; `e485499deac3dafea83391000d9cfa6e37d4a0c3` |
| `Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE` | `v2.7/normative-foundation`; `f655a0e08529060be8b716330ffcecf489a4484d`; `6adc7107c498459ed92696cb189cfc1ec9915258` |

HEADs alone do not describe reviewed working content. Starter tracked binary diff SHA256 `7e88479dde6d1815b6ac4e8f27365aab3b402f2925d819b893e5bb59f02163e7`; reviewed untracked runtime files remain included in the same208-file copy identity used by BF. Package SHA256 `9f45e85bfa007fa00f82374fc53ac0e97348d9956779d1da8e6caf4053b83e05`; lock SHA256 `d87e14d1afb4e155bc03c0a40620cf346831843697d55769f693462f3fb9d616`.

Canonical Product Contract SHA256 `1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c`; SOP doc SHA256 `4915eb7b1dcc00b2a36e1b0f297ae58231090167ac819f2f7d84f027fa1641d2`; active Master Prompt SHA256 `d11c08b355fb006dbf34f0cfec84c22b45dc9a1f671ece8dd9b6a4dafc98a28a`. All remain unchanged. New WoG root must use this same Core, no WoG-specific fork.

## Existing consumers and decisions

- Native guides route uses Page Inventory/catalog and existing layout; gear route uses `WikiArticle`, ordinary MDX, TOC, `FAQ`, `RelatedPages` and `Sources`. Manual Next Step is ordinary text/link, not a dedicated component or recommendation system.
- Page Inventory owns route/publication/content/source truth; Config owns feature/navigation choices; Content owns prose; existing facts stay unused; theme owns token values; Media Manifest and decision table own their distinct existing roles; search remains disabled; existing freshness resolver owns publication/update/source-check/version semantics. No authority is copied into an adaptation schema.
- Comfortable text-led editorial rhythm and game-specific item context are retained; generic brass/serif/mark alone are insufficient visual identity proof. No new selector, token, Pattern ID, wrapper, registry, layout engine or runtime field.
- Search, calculators, planner, market routes/live feeds, builds/farming/rankings and ads are excluded from this minimum instance. Legacy tools have different contracts and are not required for this proof of adoption.
- Text/no-media choice is specific to hub+gear; imagery could help locating actual UI but none has reviewed rights. First-round WoG Media-rich Article is not required. Human/visual/media/rights remain pending.

## Next bounded implementation and acceptance requirements

After independent readiness review only: establish one WoG adoption from the same reviewed Starter source, apply the frozen WoG8 input diff, preserve these two readiness docs, and limit post-proof input edits to existing gear MDX and its own Inventory entry. Exact copy/edits and verification must be defined by the next finite independently reviewed plan; this brief does not execute them or expand its two-document scope.

Use existing commands and real inputs for type/input/evidence-purpose build, route/output reconciliation and existing SEO/media/security audit. Do not treat BF's accepted result, old proof build or default fixture source check as WoG acceptance. Adopted default-example tests may exhibit the known portability limitation; preserve actual failures rather than weakening assertions or claiming exemptions. No new verification framework.

Required actual journey: Item decisions hub → Gear article at representative desktop/mobile sizes, with visible source-backed application distinctions, dates, stopping rule, media/no-media decision, no overflow and proper native navigation. Keyboard/console evidence may remain explicitly unproven when the authorized interface cannot provide it; no refused Safari retry or alternate channel without authorization. Evidence marker must stay non-final.

Operator identity, independent-site representation, legal activation, content/rights/media Human checks, AX/Safari and final adoption Gates remain open. Official developer/publisher identity is not evidence that they operate or endorse this wiki. Do not activate a legal page, ad or identity role based on assumed authorization.

PRODUCT CODE DELTA THIS SLICE=0. TEST CODE DELTA=0. WOG-R1: SOURCE READINESS ONLY. BF-A1: BOUNDED TECH ACCEPTED. WS07 FINAL ADOPTION:0/3. WS06/WS08/globalPRODUCT/RELEASE:NOT ACCEPTED. No commit/push/tag/merge/deploy/release.
