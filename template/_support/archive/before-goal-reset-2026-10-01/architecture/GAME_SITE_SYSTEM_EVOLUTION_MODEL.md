# GAME_SITE_SYSTEM Evolution Model

Date: 2026-10-01
Status: relationship and ownership model only; not the architecture blueprint.

## 1. Three-artifact operating model

The V2.6.5 production system is a coordinated triad:

`GAME_SOP` -> defines what must be researched, planned, reviewed and approved.

`GAME_CODEX_MASTER_PROMPT` -> turns the SOP and Starter contracts into agent execution phases, hard stops, workspace boundaries and human gates.

`GAME_SITE_STARTER` -> implements portable runtime behavior, schemas, rendering, build/audit and reusable technical seams.

The three artifacts must remain separate authorities. No future version should let one absorb the responsibilities of the other two.

## 2. Evolution rule

A capability change does **not** imply all three artifacts change mechanically.

For every capability, determine ownership first:
- methodology/process change -> SOP
- execution/gate/agent behavior change -> Master Prompt
- portable runtime/technical capability -> Starter
- some capabilities require coordinated changes in two or all three

Therefore the next architecture blueprint must include a three-artifact impact matrix for every approved capability.
## 3. Initial impact conclusions

The following areas are likely Starter-led but may require SOP/Prompt synchronization:
- visual adaptation/theme capability
- media model and usage decisions
- article/pattern composition seams
- browser accessibility acceptance
- production-residue safety
- legal and structured-identity safety

Examples:
- A new theme token system belongs primarily in Starter; SOP must define when/how a game adaptation chooses visual identity and human recognition acceptance; Master Prompt must enforce the approved adaptation workflow.
- A new media record belongs primarily in Starter; SOP owns media-needs and evidence policy; Master Prompt enforces lifecycle and hard stops.
- TL-01/TL-02 safe defaults belong primarily in Starter; SOP and Master Prompt must stop asking real projects to rely on unsafe implicit defaults.

## 4. Target system shape

The five-site audit already supports this architecture direction:

- Stable Core Starter
- Product Contract
- Pattern Library
- Game Adaptation Layer
- Independent Acceptance Gate

The upcoming blueprint should therefore evolve the **system**, not grow one universal monolithic Starter.

## 5. Versioning implication

Future release planning should evaluate coordinated versions such as:
- `GAME_SOP_VNext`
- `GAME_CODEX_MASTER_PROMPT_VNext`
- `GAME_SITE_STARTER_VNext`

Version numbers need not change in lockstep for every patch, but each released combination must explicitly declare compatibility/provenance.

## 6. Current decision

S2 TL-02 remains a valid safety design asset, but implementation is paused until the architecture blueprint places TL-02 in the complete system evolution sequence.
