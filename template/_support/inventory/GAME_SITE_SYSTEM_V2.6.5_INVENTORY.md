> 2026-10-01 用户目标重确认：历史提案/快照，当前暂停。文中当时的状态和下一步不代表当前进度或执行授权。当前入口见 `template/PROJECT_STATE.md`；完成关系核对和目录清理后再重新建立蓝图与路线。

# GAME_SITE_SYSTEM_V2.6.5 Inventory

Status: read-only system inventory plus workspace hygiene cleanup.
Date: 2026-10-01.
Workspace: `/Users/randyz/work/coding/hot_words_web`.

## 1. System Components

### GAME_SOP_V2.6.5

Role: methodology authority for research, coverage, source policy, Page Inventory methodology, visual/media planning, human review, QA, release gates and maintenance.

Authoritative package contains:
- `docs/NEW_GAME_SITE_SOP_v2.6.5.md`
- `docs/EXECUTION_PROMPT.md`
- research/planning templates
- media decision and human visual review templates
- SEO / QA / patch maintenance specifications

Core principle explicitly says a technically correct site can still fail release because of coverage, visual recognition, media, navigation, or human review issues.

### GAME_CODEX_MASTER_PROMPT_V2.6.5

Role: execution controller, enforcement layer, reconciliation driver and HARD STOP guardrail.

It explicitly states:
- SOP owns methodology.
- Starter owns technical implementation.
- Master Prompt must not redefine SOP or duplicate Starter implementation authority.
- Real-game projects have their own workspace.
- Generic Starter improvement is a separate human-authorized task.
### GAME_SITE_STARTER_BASED_gamesop2.6.5

Role: deterministic Astro technical implementation.

Strong existing assets to preserve:
- Runtime Page Inventory and fail-closed enabled catalog.
- Exact route/output reconciliation and HTML audit.
- Canonical / robots / sitemap / JSON-LD SEO foundation.
- Media manifest, rendering, validation and readiness projection.
- Related-page seam.
- Pagefind implementation and artifact audit.
- Disabled-by-default monetization seam.
- Theme/page-family semantic boundary.
- Final vs evidence build split.

Known V2.6.5 weaknesses are already captured in the capability gap audit: visual adaptation is partial, media metadata/provider neutrality are partial, browser accessibility regression coverage is weak, production residue is not blocked, draft legal residue was unsafe, and structured identity is over-assertive.

## 2. Five-Site Reference Inputs

Five valid extracted implementations remain under `template/`:
- `temp1_based_vvultimatum.net`
- `temp2_based_farevergame.wiki`
- `temp3_based_gamblewithyourfriends.net`
- `temp4_based_miniwars.art`
- `temp5_based_bombfarm.wiki`

Their consolidated audit already recommends: **Stable Core Starter + Product Contract + Pattern Library + Game Adaptation Layer + Independent Acceptance Gate**.

These five implementations are research inputs, not production baselines and not candidates for direct merging into Core.
## 3. Phase1 Core Safety Candidate

Candidate: `Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`.

Current branch: `phase1/core-safety-s1-tl01`.
Current HEAD: `a691661b330896f81f28fcac855f0ef9cc1dfccb`.
Working tree: clean.
Frozen parent baseline: `29b25559cf2af859bca359c7f7fda686a4803c95`.

The candidate is not a divergent new Starter. Its verified delta is S1 TL-01 only: 20 changed files, 600 insertions and 46 deletions.

Primary S1 additions/changes include:
- `src/core/legal-safety.ts`
- `src/data/legal-content.ts`
- optional privacy/terms routes
- legal state validation and catalog/output integration
- corresponding legal, catalog, site-data, validation and reconciliation tests

Conclusion: preserve this candidate as a clean implementation asset. Do not discard S1. Do not treat it as the sole future evolution workspace until the new architecture roadmap decides integration strategy.

## 4. Existing Architecture/Contract Assets

Preserve in place until roadmap consolidation:
- `5_SITE_PATTERN_CAPABILITY_AUDIT.md`
- `COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md`
- `GAME_SITE_STARTER_V2.6.5_CAPABILITY_GAP_AUDIT_V0.2.md`
- `CORE_SAFETY_CONTRACT_DESIGN_V0.1.md`
- `PHASE1_CORE_SAFETY_IMPLEMENTATION_CANDIDATE_PLAN_V0.1.md`
- S1 implementation / micro-fix / commit / provenance evidence
- `PHASE1_S2_TL02_IMPLEMENTATION_PLAN_V0.1.md` as a paused design asset, not an active coding instruction.
