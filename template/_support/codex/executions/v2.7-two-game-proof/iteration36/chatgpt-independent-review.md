# ChatGPT Independent Review / PLAN36 — Original Visible Record

Captured: 2026-10-08 (Asia/Taipei).
Review Owner: ChatGPT / AI Architect.
Source: https://chatgpt.com/c/6abddfa5-02ac-83ee-9b18-0b6960427b4c
Workspace access was independently confirmed as hot_words_web before review.

The following is the unchanged visible reply, including the displayed inline PLAN and its canvas text. Both are retained as captured; duplication and the inline build-command discrepancy are not silently repaired. The final canvas specifies build:evidence; no build was executed. Original Plan V1 and Design V1 remain unchanged. This review is plan/criteria scope only, not proof acceptance.

---

[C2C]
STATE: REVIEW
TASK_ID: c2c_a765
ITERATION: 36
SCOPE: TWO-GAME VERTICAL PROOF — PLAN REVIEW ONLY

DESIGN V1 VERDICT: ACCEPT — PRODUCT CRITERIA BASIS
IMPLEMENTATION PLAN V1 VERDICT: REVISE — PRODUCT PLAN

这不是对 two-game proof 实现结果的验收。当前 implementation 仍是 NOT STARTED。

整体方向是对的，而且已经符合 Simplification Amendment：同一 V2.7 Core、只改变真实游戏输入、4 个代表页、不新增 Pattern/framework/runtime、用实际产品差异而不是治理文档证明 V2.7。10 个 BF 输入、8 个 WoG 输入、21 个固定 review files + 两棵真实 generated output trees，这些边界本身都合理。

但我不建议按当前 V1 原文直接开始全部 implementation。有 4 个需要先修正的 execution-level 问题：

Design authority 要正式绑定本次独立审查。 Design 文件自身仍写 READY FOR INDEPENDENT REVIEW，而 Implementation Plan 开头用了“已接受 Design”的口径。在本次 REVIEW36 中，我接受 Design V1 作为本轮 PRODUCT acceptance criteria，因此后续执行必须引用本次 REVIEW36，不能再声称在此之前已经存在一个未找到的 Design acceptance。

BF rights Gate 必须提升为“任何 proof mutation 之前”的硬 Gate。 当前仓库实际证据不是简单的 rights pending，而是明确记录：battle-overview 对应 Steam screenshot 在旧权利审计中是 DO-NOT-USE without written permission；CURRENT_STATUS 和 Phase 4 也明确说 reuse rights 未批准。后来的 V2.1 enrichment 把素材放进了仓库，但我没有找到对应的书面许可、Human Risk Accepted 决定或其他可定位 rights closure。
所以现有证据下，不能把 battle-overview.webp 写入新的 V2.7 proof 并自造 rightsRef。这不是 implementation bug，而是当前 PRODUCT INPUT blocker。没有新的真实权利依据时，应在第一次产品输入 mutation 之前 STOP。

WoG masked identity 也应成为 mutation 前的输入 Gate。 当前 WoG 有真实的 Gear/Market decision context，也有 Phase 5 基于 Steam imagery 得出的 palette/mood 方向，但仓库同时明确：没有 gameplay screenshot，现有 W logo/OG 是 editorial branding。严格遮掉 logo/site name/game name/page title 后，“这是具体 War of Genesis 而不是一个泛化 dark-fantasy/gear site”目前尚未被证明。执行前至少应先能列出每个游戏至少两项非显式名称识别依据，且 WoG 至少一项来自可追溯的 game-specific evidence，而不是 serif/brass/W mark 或排除法。否则不应先花时间构建两份站再发现 Dimension A 必然 FAIL。

两游戏不能共享一个可写的 node_modules 物理目录。 Plan 当前让 BF/WoG 都 symlink 到 common-core 的同一 node_modules。当前 Astro config 没有独立 vite.cacheDir，Vite/Astro 等工具可能在依赖目录周边产生 cache，从而削弱“两套隔离输入/输出”的证明。依赖版本和字节必须相同，但 mutable dependency/cache workspace 应隔离。最简单方案是从同一依赖 snapshot 分别复制两份 node_modules，不重新 npm install，package/lock 保持完全一致。

除此以外，我接受 Plan V1 的主要结构：4 pages、BF10/WoG8 为 exact maximum input scope；WoG 不强求 Media-rich Article；21 fixed review files 不等于所有 generated files；完整 dist 原样镜像；Core/tests/scripts 不修改；不恢复旧 market consumer；不继承旧 PASS；不动 history/governance；不跑 fresh47/Safari/6000+ hashing；不 commit/push/tag/release。

下面是修订后的唯一有限执行计划。

:

PLAN36 — Two-Game Vertical Proof Gate-First Bounded Execution

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 36
WORKSTREAM: TWO-GAME VERTICAL PROOF
SCOPE: PRODUCT PROOF
PREDECESSOR:

WS03 ACCEPT — TECH / CLOSED

WS04A ACCEPT — TECH / CLOSED

WS05 ACCEPT — TECH / CLOSED

REVIEW36 Design V1 ACCEPT — PRODUCT CRITERIA BASIS

Implementation Plan V1 REVISE — this PLAN36 supplies the required corrections

PRODUCT GOAL:
Prove whether the same current V2.7 Core / Pattern composition can produce materially different and useful Bomb Farm and War of Genesis slices.

NOT A GOAL:
WS04B acceptance
WS07 acceptance
Safari / AX acceptance
release acceptance

1. Preserve original Plan/Design

Do not edit:

template/codex/prompts/v2.7-two-game-proof/
TWO_GAME_VERTICAL_PROOF_IMPLEMENTATION_PLAN_V1.md

template/codex/verifications/v2.7-two-game-proof/
TWO_GAME_VERTICAL_PROOF_DESIGN_V1.md

They remain historical inputs to REVIEW36.

PLAN36 narrows execution semantics only.

2. No product mutation until Gate A + Gate B complete

Before creating:

/private/tmp/v2.7-two-game-proof-v1/common-core
/private/tmp/v2.7-two-game-proof-v1/bomb-farm
/private/tmp/v2.7-two-game-proof-v1/war-of-genesis

perform the two PRODUCT INPUT gates below.

No game.config / Inventory / theme / MDX / Manifest / media mutation before the gate decision.

Gate A — Bomb Farm media-rights eligibility
3. Exact proposed asset

Only evaluate:

home.battle-overview

source file:
gameweb/game_bombfarm_v2/
public/media/home/battle-overview.webp

source provenance:
official Steam screenshot URL already recorded by the project.

No alternate asset search in this plan.

4. Current evidence must be treated accurately

The following historical facts must remain visible:

VISUAL_MEDIA_GAP_REPORT:

BLOCKED BY MEDIA RIGHTS

no recorded reuse approval

Steam provenance != reuse permission

Battle screenshot = DO-NOT-USE without written permission

CURRENT_STATUS / Phase 4:

media reuse rights not approved

production text-first/no approved local media

V2.1 enrichment:

later copied/integrated media

does NOT by itself prove a rights decision

Therefore:

existing local file
+
old renderer PASS
+
official source URL
+
old V2.1 enrichment
!= rights Gate PASS

5. Gate A PASS requirement

The exact asset may enter the V2.7 proof only if execution can point to a real project/human rights decision or permission evidence that:

clearly applies to this exact screenshot or a scope containing it;

permits the intended local fan-wiki/proof use;

identifies the decision/evidence source;

is not created by Codex merely to satisfy the Gate.

rightsRef may reference that real evidence.

rightsRef existence alone is never sufficient.

Do not infer:

VERIFIED
HUMAN RISK ACCEPTED
APPROVED
WAIVED

from provenance.

6. Gate A failure

If no such evidence exists:

Decision:
BLOCK — PRODUCT INPUT

Reason:
BOMB FARM MEDIA RIGHTS NOT ESTABLISHED

Then STOP the two-game proof before product-input mutations.

Do not:

copy the Steam screenshot;

fabricate rightsRef;

mark Human Risk Accepted;

switch to another unreviewed screenshot;

silently substitute an original diagram;

downgrade the accepted Media-rich Article criterion;

continue and call the proof partially passed.

A different rights-safe BF media strategy would require a new bounded plan.

Gate B — strict game-identification input sufficiency
7. Gate purpose

Before styling/content adaptation, prove there is enough source material to attempt the Design V1 masked identification criterion without manufacturing differentiation.

This is input sufficiency, not the final masked visual review.

8. Bomb Farm identification inputs

Identify at least two non-name/non-logo cues supported by real source material.

At least one must be genuinely game-specific, for example an actual combination of:

mine/battle grid;

mining squad / three-team rotation;

Bomb Farm-specific UI/system context;

game-specific Ritual/Forge/House vocabulary or evidence.

Generic:

orange
dark UI
mining vibe

is insufficient alone.

9. War of Genesis identification inputs

Identify at least two non-name/non-logo cues.

At least one must bind to actual War of Genesis-specific evidence/context.

Permitted evidence may include verified app-specific:

item/market context;

exact War of Genesis task/taxonomy terminology;

first-party visual characteristics actually observed and recorded;

other game-specific sourced context.

The following do NOT independently qualify:

brass
steel
serif
dark fantasy
W mark
branded OG
generic gear prose
generic market prose
“it is the one without a screenshot”

10. Gate B result

If both games have sufficient attributable source inputs:

continue.

If WoG cannot meet this input threshold:

Decision:
BLOCK — PRODUCT INPUT

Reason:
STRICT MASKED WAR OF GENESIS IDENTITY INPUT INSUFFICIENT

Do not weaken Design V1.

Do not identify WoG by elimination.

Do not add generic or fabricated gameplay evidence.

Same-Core baseline
11. Rebind current V2.7 source

After both input Gates pass, capture the actual current Candidate source:

branch
HEAD
tree
tracked diff
active untracked source files
package.json
package-lock.json
Node version

HEAD/tree alone are insufficient.

If substantive current Core differs from the source reviewed for WS05/two-game Design:

STOP and report source drift before proof implementation.

12. Common snapshot

Create one immutable common source snapshot from the complete current working-tree Candidate.

Do not copy:

.git
.env / secrets
.vercel
.c2c
dist
.astro
build/browser caches
historical proof outputs

Do copy active source that belongs to the current accepted working tree, including relevant untracked product files.

13. Dependency isolation correction

Use the same installed dependency bytes for both games but do NOT make both builds write through the same physical node_modules.

Procedure:

current Candidate installed dependencies
→ one temporary dependency snapshot
→ independent BF dependency copy
→ independent WoG dependency copy

Requirements:

package.json exact same
package-lock.json exact same
installed package source identical
no npm install
no package upgrade
no lock mutation

Each proof root owns its own mutable caches.

This provides:

same dependencies
≠ shared mutable build/cache state

Exact game-input scope
14. Bomb Farm maximum scope = 10

Only after Gate A PASS:

game.config.ts — EDIT

src/data/page-inventory.json — EDIT

src/styles/theme.css — EDIT VALUES ONLY

src/content/guides/getting-started.mdx — DELETE

src/content/guides/how-to-play.mdx — NEW

src/data/media/media.json — EDIT

docs/MEDIA_DECISION_TABLE.md — NEW

docs/PROOF_GAME_ADAPTATION.md — NEW

public/media/home/battle-overview.webp — NEW

public/logo.svg — DELETE

No 11th BF product/input file.

theme.css:
existing semantic token values only.
No selector/token/mechanism addition.

15. War of Genesis maximum scope = 8

game.config.ts — EDIT

src/data/page-inventory.json — EDIT

src/styles/theme.css — EDIT VALUES ONLY

src/content/guides/getting-started.mdx — DELETE

src/content/guides/gear.mdx — NEW

docs/MEDIA_DECISION_TABLE.md — NEW

docs/PROOF_GAME_ADAPTATION.md — NEW

public/logo.svg — DELETE

No 9th WoG product/input file.

WoG:

src/data/media/media.json

remains unchanged and empty.

16. Shared mechanism delta must remain zero

Neither copy may modify:

src/core/**
src/components/**
src/layouts/**
src/pages/**
src/data/schemas/**
scripts/**
tests/**
astro.config.ts
package.json
package-lock.json

No Core repair is authorized by this proof.

If any becomes necessary:

STOP — CORE GAP

Do not repair it inside the proof.

Four representative pages
17. Exact representative surface

Bomb Farm:

home
/

guide.how-to-play
/guides/how-to-play/

War of Genesis:

hub.guides
/guides/

guide.gear
/guides/gear/

No fifth representative business page.

Generated support pages remain normal output and remain visible to validation/reconciliation.

18. Content constraints

BF How to Play must remove or replace dependencies on excluded:

Heroes
Gear/Ritual page
Skill Tree
Achievements
Market
Latest Update

unless the actual proof Inventory intentionally retains a valid support target.

Do not expand proof scope merely to preserve historical links.

WoG Gear must remove/replace historical local links to:

Builds
Farming
Best Items
Market
fee calculator

unless that target is deliberately present in the bounded generated support set.

The selected answer must be self-contained.

Build and validation
19. Shared baseline check

Run once against common-core:

npm run check

Record actual command and exit code.

Do not run fresh47.

Do not run Safari.

Do not run 41/41.

Do not perform 6000+ file hashing.

20. Game builds

Bomb Farm:

npm run build

War of Genesis:

npm run build

One evidence build per game after its bounded inputs settle.

Use existing V2.7 validation/build pipeline unchanged.

The EVIDENCE_BUILD_NOT_FINAL.json marker must remain.

Evidence-build PASS is not release PASS.

21. Build failure rule

An input/config/content error inside the approved BF10/WoG8 scope may be corrected and that game's evidence build rerun.

If passing requires:

Core
schema
test
script
new product file
new runtime field
validation exception

STOP.

Do not weaken fail-closed behavior.

Browser/product evidence
22. Normal screenshots

Capture current generated output at:

desktop 1440×900
mobile 390×844

for all four representative pages.

Required normal screenshots = 8.

No historical screenshot substitution.

23. Browser observation

For each representative journey inspect:

entry → selected answer page

and record:

visible first-screen scope
direct answer
task/action or decision basis
completion/stop condition
navigation target
TOC/FAQ only when actually present
primary links
media/caption where used
horizontal overflow
basic focus visibility

This is bounded PRODUCT evidence.

It is not AX/Safari certification.

Strict masked identification
24. Masked materials

Create exactly:

bf-how-to-play-masked.png
wog-gear-masked.png

from the new current screenshots.

Mask only:

logo
site name
game name
explicit page title

Do not redesign, regenerate or replace the page.

If faithful masking cannot be produced with the available authorized tool:

mark the masked review NOT_RUN
and the proof cannot receive overall PRODUCT ACCEPT.

25. Reviewer criterion

The independent reviewer must evaluate the two masked screenshots separately.

For Bomb Farm:

identify Bomb Farm
+
state at least two non-name/non-logo cues.

For War of Genesis:

identify War of Genesis
+
state at least two non-name/non-logo cues.

For EACH game, at least one cited cue must trace to actual game-specific evidence.

Not enough:

“the two look different.”

Not enough:

“this must be WoG because the other one is BF.”

Not enough:

color/font alone.

The implementer must not fill in the reviewer answer.

Fixed review package
26. Fixed authored/review files = 21

Retain exactly the original Plan V1 fixed review set:

1 common-core identity
2 input diff patches
1 shared check log
2 build logs
1 PROOF_REVIEW_PACKAGE
8 normal screenshots
2 masked screenshots
4 representative HTML files

Total:
21 fixed review files.

27. Generated support outputs

Additionally mirror the complete, unedited generated dist trees:

outputs/bomb-farm/**
outputs/war-of-genesis/**

These may contain actual:

CSS
JS
media
Pagefind
robots
sitemap
support/error HTML
evidence marker
other normal generated output

Their file count is whatever the real build produces.

Do not hand-create or alter generated output.

The four fixed HTML evidence files are members of these trees, not duplicate handcrafted HTML.

Six-dimensional review package
28. Record actual evidence for

A. Visual identity
B. Media treatment
C. Page rhythm
D. Player task
E. Taxonomy/navigation
F. Article composition

Each dimension records separately:

Bomb Farm evidence
War of Genesis evidence
actual output pointer
actual source/input pointer
remaining gap
implementer observation

No dimension is self-marked ACCEPT by Codex.

29. FD-01 through FD-06

Record actual observations for all six false-differentiation risks.

Do not convert:

DESIGN ADDRESSED

into:

IMPLEMENTATION PASS.

Especially FD-03 is governed by the strict masked criterion above.

Evidence ownership
30. Game adaptation records are not runtime authority

docs/PROOF_GAME_ADAPTATION.md may document:

task rationale
theme/source rationale
media/no-media rationale
search disabled rationale
review gaps

It may only reference:

Config
Inventory
Content
Manifest
rights evidence
source evidence

It must not duplicate these values as a second runtime database.

31. Media tables

Use the existing 13-column Media Decision Table schema exactly.

Do not create a new rights/media schema.

WoG empty Manifest is not automatically a valid no-media decision.

Its decision table must state:

why selected Gear task is understandable in text
what media would have helped
what evidence remains unavailable
whether any future task is therefore out of current scope

Scope comparison
32. Diff requirements

Compare each game root against common-core.

Require:

all shared mechanism files identical

all changes belong exactly to BF10 or WoG8

theme.css difference:
values only

MDX:
no new component imports
no executable/custom mechanism

package/dependency:
zero semantic delta

No full-repository hash framework.

Use ordinary diff/cmp/Git-style patch evidence.

Terminal execution behavior
33. If either input Gate fails

Return:

Decision: BLOCK
Scope: PRODUCT

with the exact missing input.

Do not create a partial proof and request it be averaged into acceptance.

34. If implementation/evidence completes

Codex reports facts only:

same-Core check result
BF/WoG scope result
build results
browser observations
21-file package completeness
generated support trees
open gaps

Codex does NOT issue the PRODUCT verdict.

Return the package to ChatGPT / AI Architect.

Independent review then gives exactly one:

ACCEPT — PRODUCT
REVISE — PRODUCT
BLOCK — PRODUCT

for the limited two-game vertical proof.

Non-claims

Even future ACCEPT — PRODUCT for this proof does NOT itself mean:

WS04B ACCEPT
WS06B ACCEPT
WS07 ACCEPT
Safari PASS
AX-01/AX-03 PASS
41/41 PASS
RELEASE ACCEPT

Those remain later milestones.

Prohibited throughout PLAN36

No:

Core edits
framework
Pattern component
Pattern ID/enum
runtime adaptation schema
new dependency
compatibility layer
new validation framework
market module migration
calculator migration
history edits
PROJECT_STATE/TASK_LEDGER status promotion
commit
push
tag
merge
deploy
release
fresh47
full Safari matrix
6000+ protected-file hashes
41/41 reconciliation


## Expected first execution decision

Before any product mutation, Codex should be able to answer two questions:

1. Is there **real current rights evidence** that authorizes the exact BF Battle screenshot for this use?
2. Is there already enough **real game-specific input** to make a strict masked identification attempt for both games intellectually honest?

If either answer is **No**, the correct result is not “implementation failed”; it is **BLOCK — PRODUCT INPUT**. That distinction matters, because V2.7 should not respond to missing source/rights evidence by adding architecture.

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 36
WORKSTREAM: TWO-GAME VERTICAL PROOF
SCOPE: PRODUCT PROOF
PREDECESSOR:

WS03 ACCEPT — TECH / CLOSED
WS04A ACCEPT — TECH / CLOSED
WS05 ACCEPT — TECH / CLOSED
REVIEW36 Design V1 ACCEPT — PRODUCT CRITERIA BASIS
Implementation Plan V1 REVISE — this PLAN36 supplies the required corrections

PRODUCT GOAL:
Prove whether the same current V2.7 Core / Pattern composition can produce materially different and useful Bomb Farm and War of Genesis slices.

NOT A GOAL:
WS04B acceptance
WS07 acceptance
Safari / AX acceptance
release acceptance

1. Preserve original Plan/Design

Do not edit:

template/codex/prompts/v2.7-two-game-proof/
TWO_GAME_VERTICAL_PROOF_IMPLEMENTATION_PLAN_V1.md

template/codex/verifications/v2.7-two-game-proof/
TWO_GAME_VERTICAL_PROOF_DESIGN_V1.md

They remain historical inputs to REVIEW36.

PLAN36 narrows execution semantics only.

2. No product mutation until Gate A + Gate B complete

Before creating:

/private/tmp/v2.7-two-game-proof-v1/common-core
/private/tmp/v2.7-two-game-proof-v1/bomb-farm
/private/tmp/v2.7-two-game-proof-v1/war-of-genesis

perform the two PRODUCT INPUT gates below.

No game.config / Inventory / theme / MDX / Manifest / media mutation before the gate decision.

Gate A — Bomb Farm media-rights eligibility
3. Exact proposed asset

Only evaluate:

home.battle-overview

source file:
gameweb/game_bombfarm_v2/
public/media/home/battle-overview.webp

source provenance:
official Steam screenshot URL already recorded by the project.

No alternate asset search in this plan.

4. Current evidence must be treated accurately

The following historical facts must remain visible:

VISUAL_MEDIA_GAP_REPORT:

BLOCKED BY MEDIA RIGHTS
no recorded reuse approval
Steam provenance != reuse permission
Battle screenshot = DO-NOT-USE without written permission

CURRENT_STATUS / Phase 4:

media reuse rights not approved
production text-first/no approved local media

V2.1 enrichment:

later copied/integrated media
does NOT by itself prove a rights decision

Therefore:

existing local file
+
old renderer PASS
+
official source URL
+
old V2.1 enrichment
!= rights Gate PASS

5. Gate A PASS requirement

The exact asset may enter the V2.7 proof only if execution can point to a real project/human rights decision or permission evidence that:

clearly applies to this exact screenshot or a scope containing it;
permits the intended local fan-wiki/proof use;
identifies the decision/evidence source;
is not created by Codex merely to satisfy the Gate.

rightsRef may reference that real evidence.

rightsRef existence alone is never sufficient.

Do not infer:

VERIFIED
HUMAN RISK ACCEPTED
APPROVED
WAIVED

from provenance.

6. Gate A failure

If no such evidence exists:

Decision:
BLOCK — PRODUCT INPUT

Reason:
BOMB FARM MEDIA RIGHTS NOT ESTABLISHED

Then STOP the two-game proof before product-input mutations.

Do not:

copy the Steam screenshot;
fabricate rightsRef;
mark Human Risk Accepted;
switch to another unreviewed screenshot;
silently substitute an original diagram;
downgrade the accepted Media-rich Article criterion;
continue and call the proof partially passed.

A different rights-safe BF media strategy would require a new bounded plan.

Gate B — strict game-identification input sufficiency
7. Gate purpose

Before styling/content adaptation, prove there is enough source material to attempt the Design V1 masked identification criterion without manufacturing differentiation.

This is input sufficiency, not the final masked visual review.

8. Bomb Farm identification inputs

Identify at least two non-name/non-logo cues supported by real source material.

At least one must be genuinely game-specific, for example an actual combination of:

mine/battle grid;
mining squad / three-team rotation;
Bomb Farm-specific UI/system context;
game-specific Ritual/Forge/House vocabulary or evidence.

Generic:

orange
dark UI
mining vibe

is insufficient alone.

9. War of Genesis identification inputs

Identify at least two non-name/non-logo cues.

At least one must bind to actual War of Genesis-specific evidence/context.

Permitted evidence may include verified app-specific:

item/market context;
exact War of Genesis task/taxonomy terminology;
first-party visual characteristics actually observed and recorded;
other game-specific sourced context.

The following do NOT independently qualify:

brass
steel
serif
dark fantasy
W mark
branded OG
generic gear prose
generic market prose
“it is the one without a screenshot”

10. Gate B result

If both games have sufficient attributable source inputs:

continue.

If WoG cannot meet this input threshold:

Decision:
BLOCK — PRODUCT INPUT

Reason:
STRICT MASKED WAR OF GENESIS IDENTITY INPUT INSUFFICIENT

Do not weaken Design V1.

Do not identify WoG by elimination.

Do not add generic or fabricated gameplay evidence.

Same-Core baseline
11. Rebind current V2.7 source

After both input Gates pass, capture the actual current Candidate source:

branch
HEAD
tree
tracked diff
active untracked source files
package.json
package-lock.json
Node version

HEAD/tree alone are insufficient.

If substantive current Core differs from the source reviewed for WS05/two-game Design:

STOP and report source drift before proof implementation.

12. Common snapshot

Create one immutable common source snapshot from the complete current working-tree Candidate.

Do not copy:

.git
.env / secrets
.vercel
.c2c
dist
.astro
build/browser caches
historical proof outputs

Do copy active source that belongs to the current accepted working tree, including relevant untracked product files.

13. Dependency isolation correction

Use the same installed dependency bytes for both games but do NOT make both builds write through the same physical node_modules.

Procedure:

current Candidate installed dependencies
→ one temporary dependency snapshot
→ independent BF dependency copy
→ independent WoG dependency copy

Requirements:

package.json exact same
package-lock.json exact same
installed package source identical
no npm install
no package upgrade
no lock mutation

Each proof root owns its own mutable caches.

This provides:

same dependencies
≠ shared mutable build/cache state

Exact game-input scope
14. Bomb Farm maximum scope = 10

Only after Gate A PASS:

game.config.ts — EDIT
src/data/page-inventory.json — EDIT
src/styles/theme.css — EDIT VALUES ONLY
src/content/guides/getting-started.mdx — DELETE
src/content/guides/how-to-play.mdx — NEW
src/data/media/media.json — EDIT
docs/MEDIA_DECISION_TABLE.md — NEW
docs/PROOF_GAME_ADAPTATION.md — NEW
public/media/home/battle-overview.webp — NEW
public/logo.svg — DELETE

No 11th BF product/input file.

theme.css:
existing semantic token values only.
No selector/token/mechanism addition.

15. War of Genesis maximum scope = 8
game.config.ts — EDIT
src/data/page-inventory.json — EDIT
src/styles/theme.css — EDIT VALUES ONLY
src/content/guides/getting-started.mdx — DELETE
src/content/guides/gear.mdx — NEW
docs/MEDIA_DECISION_TABLE.md — NEW
docs/PROOF_GAME_ADAPTATION.md — NEW
public/logo.svg — DELETE

No 9th WoG product/input file.

WoG:

src/data/media/media.json

remains unchanged and empty.

16. Shared mechanism delta must remain zero

Neither copy may modify:

src/core/**
src/components/**
src/layouts/**
src/pages/**
src/data/schemas/**
scripts/**
tests/**
astro.config.ts
package.json
package-lock.json

No Core repair is authorized by this proof.

If any becomes necessary:

STOP — CORE GAP

Do not repair it inside the proof.

Four representative pages
17. Exact representative surface

Bomb Farm:

home
/

guide.how-to-play
/guides/how-to-play/

War of Genesis:

hub.guides
/guides/

guide.gear
/guides/gear/

No fifth representative business page.

Generated support pages remain normal output and remain visible to validation/reconciliation.

18. Content constraints

BF How to Play must remove or replace dependencies on excluded:

Heroes
Gear/Ritual page
Skill Tree
Achievements
Market
Latest Update

unless the actual proof Inventory intentionally retains a valid support target.

Do not expand proof scope merely to preserve historical links.

WoG Gear must remove/replace historical local links to:

Builds
Farming
Best Items
Market
fee calculator

unless that target is deliberately present in the bounded generated support set.

The selected answer must be self-contained.

Build and validation
19. Shared baseline check

Run once against common-core:

npm run check

Record actual command and exit code.

Do not run fresh47.

Do not run Safari.

Do not run 41/41.

Do not perform 6000+ file hashing.

20. Game builds

Bomb Farm:

npm run build:evidence

War of Genesis:

npm run build:evidence

One evidence build per game after its bounded inputs settle.

Use existing V2.7 validation/build pipeline unchanged.

The EVIDENCE_BUILD_NOT_FINAL.json marker must remain.

Evidence-build PASS is not release PASS.

21. Build failure rule

An input/config/content error inside the approved BF10/WoG8 scope may be corrected and that game's evidence build rerun.

If passing requires:

Core
schema
test
script
new product file
new runtime field
validation exception

STOP.

Do not weaken fail-closed behavior.

Browser/product evidence
22. Normal screenshots

Capture current generated output at:

desktop 1440×900
mobile 390×844

for all four representative pages.

Required normal screenshots = 8.

No historical screenshot substitution.

23. Browser observation

For each representative journey inspect:

entry → selected answer page

and record:

visible first-screen scope
direct answer
task/action or decision basis
completion/stop condition
navigation target
TOC/FAQ only when actually present
primary links
media/caption where used
horizontal overflow
basic focus visibility

This is bounded PRODUCT evidence.

It is not AX/Safari certification.

Strict masked identification
24. Masked materials

Create exactly:

bf-how-to-play-masked.png
wog-gear-masked.png

from the new current screenshots.

Mask only:

logo
site name
game name
explicit page title

Do not redesign, regenerate or replace the page.

If faithful masking cannot be produced with the available authorized tool:

mark the masked review NOT_RUN
and the proof cannot receive overall PRODUCT ACCEPT.

25. Reviewer criterion

The independent reviewer must evaluate the two masked screenshots separately.

For Bomb Farm:

identify Bomb Farm
+
state at least two non-name/non-logo cues.

For War of Genesis:

identify War of Genesis
+
state at least two non-name/non-logo cues.

For EACH game, at least one cited cue must trace to actual game-specific evidence.

Not enough:

“the two look different.”

Not enough:

“this must be WoG because the other one is BF.”

Not enough:

color/font alone.

The implementer must not fill in the reviewer answer.

Fixed review package
26. Fixed authored/review files = 21

Retain exactly the original Plan V1 fixed review set:

1 common-core identity
2 input diff patches
1 shared check log
2 build logs
1 PROOF_REVIEW_PACKAGE
8 normal screenshots
2 masked screenshots
4 representative HTML files

Total:
21 fixed review files.

27. Generated support outputs

Additionally mirror the complete, unedited generated dist trees:

outputs/bomb-farm/**
outputs/war-of-genesis/**

These may contain actual:

CSS
JS
media
Pagefind
robots
sitemap
support/error HTML
evidence marker
other normal generated output

Their file count is whatever the real build produces.

Do not hand-create or alter generated output.

The four fixed HTML evidence files are members of these trees, not duplicate handcrafted HTML.

Six-dimensional review package
28. Record actual evidence for

A. Visual identity
B. Media treatment
C. Page rhythm
D. Player task
E. Taxonomy/navigation
F. Article composition

Each dimension records separately:

Bomb Farm evidence
War of Genesis evidence
actual output pointer
actual source/input pointer
remaining gap
implementer observation

No dimension is self-marked ACCEPT by Codex.

29. FD-01 through FD-06

Record actual observations for all six false-differentiation risks.

Do not convert:

DESIGN ADDRESSED

into:

IMPLEMENTATION PASS.

Especially FD-03 is governed by the strict masked criterion above.

Evidence ownership
30. Game adaptation records are not runtime authority

docs/PROOF_GAME_ADAPTATION.md may document:

task rationale
theme/source rationale
media/no-media rationale
search disabled rationale
review gaps

It may only reference:

Config
Inventory
Content
Manifest
rights evidence
source evidence

It must not duplicate these values as a second runtime database.

31. Media tables

Use the existing 13-column Media Decision Table schema exactly.

Do not create a new rights/media schema.

WoG empty Manifest is not automatically a valid no-media decision.

Its decision table must state:

why selected Gear task is understandable in text
what media would have helped
what evidence remains unavailable
whether any future task is therefore out of current scope

Scope comparison
32. Diff requirements

Compare each game root against common-core.

Require:

all shared mechanism files identical

all changes belong exactly to BF10 or WoG8

theme.css difference:
values only

MDX:
no new component imports
no executable/custom mechanism

package/dependency:
zero semantic delta

No full-repository hash framework.

Use ordinary diff/cmp/Git-style patch evidence.

Terminal execution behavior
33. If either input Gate fails

Return:

Decision: BLOCK
Scope: PRODUCT

with the exact missing input.

Do not create a partial proof and request it be averaged into acceptance.

34. If implementation/evidence completes

Codex reports facts only:

same-Core check result
BF/WoG scope result
build results
browser observations
21-file package completeness
generated support trees
open gaps

Codex does NOT issue the PRODUCT verdict.

Return the package to ChatGPT / AI Architect.

Independent review then gives exactly one:

ACCEPT — PRODUCT
REVISE — PRODUCT
BLOCK — PRODUCT

for the limited two-game vertical proof.

Non-claims

Even future ACCEPT — PRODUCT for this proof does NOT itself mean:

WS04B ACCEPT
WS06B ACCEPT
WS07 ACCEPT
Safari PASS
AX-01/AX-03 PASS
41/41 PASS
RELEASE ACCEPT

Those remain later milestones.

Prohibited throughout PLAN36

No:

Core edits
framework
Pattern component
Pattern ID/enum
runtime adaptation schema
new dependency
compatibility layer
new validation framework
market module migration
calculator migration
history edits
PROJECT_STATE/TASK_LEDGER status promotion
commit
push
tag
merge
deploy
release
fresh47
full Safari matrix
6000+ protected-file hashes
41/41 reconciliation


## Expected first execution decision

Before any product mutation, Codex should be able to answer two questions:

1. Is there **real current rights evidence** that authorizes the exact BF Battle screenshot for this use?
2. Is there already enough **real game-specific input** to make a strict masked identification attempt for both games intellectually honest?

If either answer is **No**, the correct result is not “implementation failed”; it is **BLOCK — PRODUCT INPUT**. That distinction matters, because V2.7 should not respond to missing source/rights evidence by adding architecture.
