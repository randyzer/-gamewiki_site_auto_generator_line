> 2026-10-01 用户目标重确认：历史提案/快照，当前暂停。文中当时的状态和下一步不代表当前进度或执行授权。当前入口见 `template/PROJECT_STATE.md`；完成关系核对和目录清理后再重新建立蓝图与路线。

# Three-Artifact Impact Matrix V1

Date: 2026-10-01
Status: Architecture planning only.

| Capability / Change | GAME_SOP | CODEX MASTER PROMPT | STARTER | Primary Owner |
|---|---|---|---|---|
| TL-01 legal safe default | define policy approval/accuracy workflow | enforce activation evidence + hard stop | safe unavailable/default route behavior | Starter-led, coordinated |
| TL-02 identity safety | define evidence rules for operator/official/affiliation claims | block unsupported identity projection | non-assertive schema defaults + explicit identity config | Starter-led, coordinated |
| PP-02 production residue | define launch-finish expectation | require residue scan before release gate | known-sentinel/adoption assertions | Starter-led |
| AX-01 dismissible nav | define required accessibility behavior | require browser evidence when used | reusable behavior + tests | Starter-led |
| AX-03 browser integrity | define supported acceptance expectation | execute/require representative browser checks | Core fixture/test seam | Starter-led + Acceptance |
| Visual adaptation | define visual-evidence and game-recognition process | enforce approved theme/adaptation artifacts | semantic token roles and safe constraints | Shared |
| Pattern selection | define when/how patterns are selected | enforce approved pattern and no scope drift | Core exposes primitives only | SOP/Pattern-led |
| Media completeness | define need/evidence/rights decisions | enforce per-page media lifecycle and hard stops | media schema/render/fallback/provider seams | Shared |
| SEO share media | define truthful media use | require generated audit evidence | OG/Twitter media selection/fallback | Starter-led |
| Search activation | define corpus/use decision | enforce recorded activation choice | provider-neutral search seam + adapter | Shared |
| Freshness semantics | define evidence for latest/live/popular labels | reject unsupported dynamic claims | distinct schema fields/types | Shared |
| Monetization | define placement intent/value-first rules | enforce enablement and human review gates | provider-neutral seam only | Shared |
| Acceptance Gate | define assembled-site evidence and human gates | execute/stop at gate boundaries | expose testable output; not owner of final approval | SOP/Prompt-led |
| Regression/Release | define capability lifecycle and exception rules | compare baseline/candidate before release | preserve testable capability evidence | Governance-led |

## Decision Rule

A capability does not trigger mechanical edits to all three artifacts. For each implementation slice:

1. Identify the product capability ID(s).
2. Identify implementation owner and verification owner.
3. Update only the artifacts whose authority changes.
4. Declare compatibility/provenance between the resulting SOP, Master Prompt and Starter versions.
5. Block any release where the three artifacts describe conflicting behavior.
