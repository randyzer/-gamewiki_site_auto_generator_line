# BF Original Media Input Review V1

Date: 2026-10-08 (Asia/Taipei). Executor: Codex. Authority: ChatGPT PLAN37, iteration37/chatgpt-plan.md.

## Outcome and scope

**BF_ORIGINAL_DIAGRAM_INPUT: ELIGIBLE_FOR_IMPLEMENTATION_PLAN**

This assesses a future project-authored factual diagram, not the old SVG as-is. No image was created, copied or repaired. No third-party rights state was approved, waived or changed. `home.battle-overview` remains NOT AUTHORIZED FOR USE; its previous input block remains recorded. This new path must be explicitly accepted and included in a subsequent implementation plan before use.

## Recorded evidence

- `gameweb/game_bombfarm_v2/src/data/page-inventory.json:600–605`: official Steam store source, accessed 2026-09-04; evidence note: “Steam store says players can switch between three teams to keep the mine running.”
- `gameweb/game_bombfarm_v2/docs/PROJECT_BRIEF.md:30–36`: records the three-team system from the same official store description. This is corroboration of the recorded fact, not a new current verification.
- `gameweb/game_bombfarm_v2/docs/V2_1_VISUAL_MEDIA_ENRICHMENT_REPORT.md:82–85`: characterizes energy-rotation.svg as an original wiki diagram using the official three-team description.
- `gameweb/game_bombfarm_v2/public/media/heroes/energy-rotation.svg`: 1200×675 viewBox; geometric rect/circle/path/text elements. No image, external asset reference, script or copied game artwork is present in its source. This structural observation supports evaluation of the original-diagram class; it cannot independently certify its historic authorship.
- `gameweb/game_bombfarm_v2/src/content/guides/how-to-play.mdx:15–25`: connects three-team rotation to the player task, explicitly disclaims exact energy recovery and optimal rotation timers.
- `gameweb/game_bombfarm_v2/src/data/media/media.json:83–89`: records the old diagram, alt and caption. Those editorial statements do not independently establish recovery mechanics or reuse rights.

All source access dates above are historical recorded dates. No live research was performed on 2026-10-08 and no sourceCheckedAt date is advanced.

## Complete factual audit of the old SVG

| Existing statement / representation | Classification | Evidence boundary / future treatment |
| --- | --- | --- |
| Three teams (title and three labeled cards; not a literal THREE TEAMS text node) | SUPPORTED | Official source note expressly supports three teams. |
| ROTATE TEAMS | SUPPORTED WITH NARROWER WORDING | Use “Switch between teams”; no fixed order or timing is established. |
| KEEP THE MINE RUNNING | SUPPORTED | Expressly recorded official wording. Does not promise uninterrupted progress or success. |
| TEAM 1 / TEAM 2 / TEAM 3 | SUPPORTED WITH NARROWER WORDING | Editorial numbering of three teams, not official names, simultaneous active slots or progression stages. |
| Mine, attached to TEAM 1 | SUPPORTED WITH NARROWER WORDING | A mine is supported, but TEAM 1's assigned mining state is not. Use mine only as shared task context, not a team-state label. |
| Recover, attached to TEAM 2 | UNSUPPORTED | No recorded primary passage establishes this particular recovery state or its relationship to another active team. Omit. |
| Prepare, attached to TEAM 3 | UNSUPPORTED | No recorded primary passage establishes this state. Omit. |
| Move a ready squad in while another recovers | UNSUPPORTED | Readiness, concurrent recovery and the asserted swap condition are not established by the narrower source. Omit. |
| Title: Three-team energy rotation | SUPPORTED WITH NARROWER WORDING | Keep “Three-team switching”; energy mechanics are outside the verified fact. |
| Description: original diagram showing three Bomb Farm teams rotating between mining and recovery | SUPPORTED WITH NARROWER WORDING | Original-diagram characterization has a project record; replace recovery claim with three-team switching to keep the mine running. Future authorship must be recorded when actually created. |
| Circular arrows joining the three cards | SUPPORTED WITH NARROWER WORDING | Switching is supported; obligatory 1→2→3 cyclic progression is not. Avoid an ordered cycle or unsupported state transition. |
| Color / geometry / card positions | SUPPORTED WITH NARROWER WORDING | Editorial illustration only; not an observed game UI, role classification, meter or visual identity taken from game art. |

The old Manifest alt likewise mentions recovery and cannot be imported as-is. No old asset, alt, source record or historical report is modified.

## Text-only specification for a future original diagram

Purpose: in the How-to-Play article, explain that the mining task can use switching between three teams. It must communicate the concrete three-team relationship rather than act as a logo or generic decorative hero.

Proposed visible copy, bounded by the recorded official fact:

> THREE TEAMS
>
> TEAM 1 · TEAM 2 · TEAM 3
>
> Switch between teams to keep the mine running.

Use three equal cards and a shared mine-task label. Numbering is explanatory notation. Do not imply three teams are active simultaneously, a mandatory rotation order, fixed Mine/Recover/Prepare phases, cooldowns, energy amounts, recovery rates, optimal timers or an algorithm. Neutral grouping is enough; no ordered cycle is required.

Create new primitive geometry and text from scratch in the future proof workspace, with no copied game art/UI, official logo, character likeness, external image or competitor material. Do not repair or copy the existing SVG's broader wording.

Proposed accessible text: “Original diagram showing three teams available for switching to keep the mine running.” Proposed caption: “Project-authored explanation of the official three-team description recorded on 4 September 2026; this is not a game UI capture or a timing guide.” These are future text proposals only.

Existing `src/data/schemas/media.ts` supports SVG under a local /media/ path, positive width/height, informative alt, HTTPS sourceUrl, rightsRef and optional caption/credit. A future asset could use 1200×675 with a matching viewBox. Provenance can cite the official factual source; a rightsRef must point to the real creation/authorship record of the new geometric work. A reference string alone is not approval. No field or schema needs to be added.

## Eligibility conditions and limits

| PLAN37 condition | Assessment |
| --- | --- |
| Original project authorship | Feasible for new geometry/text; requires an actual creation record later. No new asset exists yet. |
| No copied artwork/UI | Specification forbids it; old reference source also contains no embedded art. |
| Every factual statement supported | Proposed visible copy uses only the recorded three-team/mine fact; unsupported old labels excluded. |
| Explains How-to-Play task | Shows three teams as available switching choices in the mine task; content must explain the relationship, not simply display an image. |
| More than decorative branding | Semantic cards and instructional sentence carry information; no branding-only substitute. |
| Existing image contract usable | Existing imageAssetSchema already supports the required path, dimensions, alt, source and real authorship pointer. |

Eligibility is permission to submit this input path for independent review and a new implementation plan. It is not a completed media acceptance, a legal determination, a built Media-rich Article, visual identity PASS or two-game proof PASS. Future creation must satisfy the conditions above; failure stops that path rather than reviving the unauthorized screenshot.
