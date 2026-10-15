# ChatGPT REVIEW40 / PLAN41

Captured raw reply on 2026-10-08. REVIEW40 is the independent repair acceptance authority; no governance promotion.

[C2C]
STATE: REVIEW
TASK_ID: c2c_a765
ITERATION: 40
VERDICT: ACCEPT — CORE PORTABILITY REPAIR

我独立核对了 exact6 patch、当前源码、RED/GREEN 日志、before/after identity 和 released execution outputs #101–106。PLAN40 修复可以接受。

这次修复真正解决了 iteration39 暴露的边界错误，而不是把 PP-02 绕过去：

纯文本
Before:
Page Inventory.description
    └─ project-owned

/about visible intro
    └─ hardcoded Core "Game Atlas..."

synthetic adoption
    └─ secretly rewrites Core file

现在变成：

纯文本
Page Inventory.description
    ├─ About visible intro
    ├─ About source-residue projection
    └─ existing SEO/page description authority

Core
    └─ reusable editorial-method sections only

关键检查均成立：

纯文本
scope:
exact 6
3 production + 3 test/support

RED targeted:
4 FAIL / 46 PASS

RED adopted:
PP-02 core.about-intro
exit 1

GREEN targeted:
50 / 50 PASS

GREEN adopted-final:
validate PASS
check PASS
build PASS
no Core About fixture rewrite

unadopted:
validate/build still EXPECTED_PP02_REJECTION

root:
48 files PASS
859 / 859 tests PASS
Astro 152 files
0 errors / warnings / hints

源码边界也正确。LegalPage.astro 只在 About 分支执行：

TypeScript
getStaticPageCopy("about", page.description)

Privacy/Terms 仍然走 getLegalPageContent(page)；legal-content、activation、digest、fallback rejection 都没有改变。

PP-02 也没有弱化。core.about-intro 原 literal 仍然完整存在于 CORE_SENTINELS，scan algorithm、scope、coverage、HTML/Pagefind/URL projection 都未改。新测试还明确证明：把旧 intro 真正放回项目 About description，仍会报：

纯文本
PP-02 core.about-intro residue on page:about:copy

而 synthetic adopted fixture 不再修改：

纯文本
src/core/static-page-copy.ts

并且有 byte-identical regression test。

因此正式结论：

纯文本
CORE ABOUT PORTABILITY REPAIR:
ACCEPTED

ITERATION39 CORE GAP:
RESOLVED IN CURRENT CANDIDATE

OLD PROOF WORKSPACE:
FROZEN / HISTORICAL

TWO-GAME PRODUCT PROOF:
NOT YET RESUMED

下一步可以重新绑定当前 repaired Candidate。不能在 /private/tmp/v2.7-two-game-proof-v1 原地修补，因为那会破坏 iteration38/39 的失败历史。

PLAN41 — Rebind Repaired Core and Resume Two-Game Vertical Proof

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 41
WORKSTREAM: TWO-GAME VERTICAL PROOF
TYPE: FRESH BASELINE REBIND + PRODUCT PROOF RESUMPTION

PREDECESSOR:
REVIEW40 ACCEPT — CORE PORTABILITY REPAIR

CORE REPAIR:
ACCEPTED

PRODUCT VERDICT:
NOT PREJUDGED

1. Preserve all failed history

Do not modify:

/private/tmp/v2.7-two-game-proof-v1/**

while it still exists.

And never modify historical records:

iteration38/**
iteration39/**
iteration40/**

proof-v1/shared-check.log
proof-v1/shared-check-retry.log
proof-v1/bomb-farm-build.log

They retain:

iteration38:
baseline snapshot omission

iteration39:
corrected baseline PASS
BF build blocked by About Core portability gap

iteration40:
independent Core repair

No FAIL→PASS rewrite.

2. Use a completely new proof workspace

Create:

/private/tmp/v2.7-two-game-proof-v2/
  common-core/
  bomb-farm/
  war-of-genesis/

Do not patch the v1 workspace.

This cleanly proves the product against the accepted repaired Core.

3. New review-package root

Create the current proof evidence under:

template/codex/verifications/
v2.7-two-game-proof/proof-v2/

proof-v1/** remains immutable historical evidence.

Current Core binding
4. Capture current Candidate identity

Bind the actual current:

Repo_hotgameweb/
GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE

including:

branch;

HEAD;

working-tree changes;

active untracked product/runtime files;

exact iteration40 six-file increment;

Node version;

package.json;

package-lock.json.

Do not identify the Core only by HEAD/tree because the accepted V2.7 source contains working-tree changes.

5. Source drift Gate

Current source must still contain the accepted REVIEW40 behavior:

About visible intro
= Page Inventory description

PP-02 core.about-intro sentinel
= retained

adopted fixture
= no static-page-copy.ts rewrite

If any of these have changed:

STOP — SOURCE DRIFT
Complete snapshot rule
6. Copy the complete Candidate project baseline

The v1 omission happened because a hand-maintained file list excluded .github.

PLAN41 therefore copies the complete current Candidate project tree subject only to explicit exclusions.

Include normal project content such as:

.github/**
.nvmrc
README.md
docs/**
src/**
scripts/**
tests/**
public/**
game.config.ts
astro.config.ts
vitest.config.ts
tsconfig.json
package.json
package-lock.json
wrangler.jsonc

and other actual project source/config files.

Do not create another positive "files to remember" allowlist.

7. Explicit snapshot exclusions only

Exclude:

.git/**
node_modules/**
dist/**
.astro/**
.vite-cache/**
.vitest-cache/**
.env
.env.*
.vercel/**
.c2c/**
temporary/build caches
historical proof output

Secrets must not be copied.

This is snapshot preparation, not a new runtime mechanism.

8. Dependencies

Take the already-installed current Candidate dependency tree as one source snapshot.

Create independent physical copies for:

common-core/node_modules
bomb-farm/node_modules
war-of-genesis/node_modules

No shared writable dependency directory.

No:

npm install
npm update
lock mutation

All three copies must derive from the same dependency source.

Baseline qualification
9. Common baseline command

Run once:

npm run check

from:

/private/tmp/v2.7-two-game-proof-v2/common-core

Expected current reference:

Astro 0 errors
859 / 859 tests PASS

Report actual count rather than assuming it.

Save to the new fixed slot:

proof-v2/shared-check.log
10. Baseline failure rule

If the fresh common snapshot fails:

STOP

Do not begin BF/WoG adaptation.

Do not repair tests/Core inside PLAN41.

This time there is no retry authorization.

A baseline failure represents new information requiring review.

Bomb Farm reapplication
11. Reapply the already-reviewed BF10 only after baseline PASS

Do not redesign BF input.

Use the frozen iteration39 Bomb Farm proof copy solely as the exact source for the already-reviewed BF10 project inputs.

Reapply those bytes/absence states into the fresh repaired-Core BF copy.

The repaired Core itself comes only from current Candidate.

12. BF10 remains exactly

game.config.ts — EDIT

src/data/page-inventory.json — EDIT

src/styles/theme.css — EDIT VALUES ONLY

src/content/guides/getting-started.mdx — DELETE

src/content/guides/how-to-play.mdx — NEW

src/data/media/media.json — EDIT

docs/MEDIA_DECISION_TABLE.md — NEW

docs/PROOF_GAME_ADAPTATION.md — NEW

public/media/proof/three-team-switching.svg — NEW

public/logo.svg — DELETE

No BF11.

13. BF input preservation check

For all nine present BF input files after reapplication, require byte identity with the frozen iteration39 BF input.

For deleted files require absence equivalence.

The only expected difference between:

v1 Bomb Farm proof
and
v2 Bomb Farm proof

outside BF10 is the accepted current Core baseline, principally including iteration40's exact6 repair.

Do not silently rewrite BF content.

14. BF media invariants remain

Official:

battle-overview.webp

remains unauthorized and absent.

The only proof media remains the new project-authored:

/media/proof/three-team-switching.svg

No old energy-rotation.svg.

No third-party art.

No rights waiver.

Human/visual review status remains truthful.

15. BF build

Run exactly:

npm run build:evidence

once after exact BF10 reapplication.

Save:

proof-v2/bomb-farm-build.log

Do not use npm run build.

16. What this build specifically tests

The previous blocker was:

PP-02 core.about-intro

A PASS now proves the accepted Core repair works in a real game adaptation rather than only the synthetic Field Notes fixture.

Do not special-case this assertion.

17. BF build failure

If BF build still fails:

preserve complete output;

identify the exact first/current failure;

STOP before WoG adaptation.

Do not modify BF10 or Core in the same iteration.

PLAN41 does not authorize another product repair loop.

War of Genesis adaptation
18. Begin WoG only after BF build PASS

The WoG root must still be an untouched copy of the repaired common baseline before its adaptation begins.

Then apply exact WoG8.

19. WoG8 remains

game.config.ts

src/data/page-inventory.json

src/styles/theme.css — VALUES ONLY

DELETE src/content/guides/getting-started.mdx

NEW src/content/guides/gear.mdx

NEW docs/MEDIA_DECISION_TABLE.md

NEW docs/PROOF_GAME_ADAPTATION.md

DELETE public/logo.svg

No WoG9.

src/data/media/media.json stays unchanged and empty.

20. WoG content evidence boundary

Visible article content may use the already-reviewed dated app-specific cues:

High-Grade Jewel of Strife
High-Grade Jewel of Valor
App 4891320-specific Steam Market relationship

Do not convert them into unsupported claims about:

rarity
drop source
combat role
upgrade/synthesis
best build
progression value
current availability
current price
profit/demand/liquidity
universal marketability
21. WoG identity remains unproven

The existence of those cues authorizes only:

MASKED IDENTIFICATION ATTEMPT

not:

Visual Identity PASS

Generic typography/theme remains auxiliary only.

22. WoG build

Run:

npm run build:evidence

once after exact WoG8 settles.

Save:

proof-v2/wog-build.log

If it fails:

STOP

No Core or scope expansion.

Shared Core comparison
23. Shared mechanism delta

After both adaptations require:

all BF differences ⊆ BF10
all WoG differences ⊆ WoG8

Core/shared mechanism delta = 0

This includes the newly repaired About implementation.

Neither game copy may separately edit:

src/core/static-page-copy.ts
src/components/LegalPage.astro
scripts/core-safety-sentinels.ts

That is the central portability proof.

24. Theme constraint

theme.css changes may alter existing values only.

No:

new selector
new custom property
new mechanism
new animation/layout system
Four representative pages
25. Exact pages remain

Bomb Farm:

/
/guides/how-to-play/

War of Genesis:

/guides/
/guides/gear/

No fifth representative business page.

Browser product evidence
26. Only after both builds PASS

Start isolated previews and capture:

1440 × 900
390 × 844

for all 4 pages.

Exactly 8 normal screenshots.

Use fresh v2 output only.

27. Observe the real journeys

Record:

entry promise
working navigation
direct answer
task/decision basis
completion/stop rule
real TOC/FAQ if present
primary links
BF diagram and caption
WoG no-media behavior
horizontal overflow
basic visible keyboard focus

This remains PRODUCT evidence only.

Not Safari/AX certification.

Strict masked evidence
28. Create two masked derivatives

From current desktop article screenshots:

bf-how-to-play-masked.png
wog-gear-masked.png

Mask only:

logo
site name
explicit game name
explicit page title

Do not mask legitimate body terminology such as WoG item names merely because those terms help identification.

29. No implementer self-grading

Codex creates faithful masked evidence but does not issue the identity answer.

The final masked decision belongs to independent ChatGPT review.

30. Strict criterion unchanged

For EACH masked page:

correct specific game/site identification
+
>=2 non-name/non-logo cues
+
>=1 cue backed by real game-specific evidence

No elimination reasoning.

No generic-color-only reasoning.

No "the other one is Bomb Farm, therefore this is WoG."

Review package
31. proof-v2 fixed slots remain exactly 21

common-core-identity.md

bomb-farm-input-diff.patch

wog-input-diff.patch

shared-check.log

bomb-farm-build.log

wog-build.log

PROOF_REVIEW_PACKAGE.md
8–15. eight normal screenshots

BF masked screenshot

WoG masked screenshot
18–21. four representative generated HTML files

Exactly:

21 fixed review files
32. Generated output trees remain additional support

Mirror complete actual dist trees:

proof-v2/outputs/bomb-farm/**
proof-v2/outputs/war-of-genesis/**

Do not hand-edit them.

Their generated files are not added to the fixed 21 count.

33. Historical failure references

The new PROOF_REVIEW_PACKAGE.md must explicitly reference, but not duplicate or overwrite:

proof-v1/shared-check.log
proof-v1/shared-check-retry.log
proof-v1/bomb-farm-build.log

iteration38/result.md
iteration39/result.md
iteration40/result.md

Narrative must remain:

v1 baseline omission discovered
→ corrected baseline
→ real About portability gap discovered
→ separate exact6 Core repair
→ independent ACCEPT
→ fresh v2 proof baseline

Do not present v2 as if these failures never happened.

Product review dimensions
34. Preserve Design V1 unchanged

Review:

A. Visual identity
B. Media treatment
C. Page rhythm
D. Player task
E. Taxonomy/navigation
F. Article composition

And:

FD-01 through FD-06

against the actual v2 output.

No historical PASS inheritance.

35. Final implementer state

If all of PLAN41 executes successfully, Codex may report only:

TWO-GAME VERTICAL PROOF:
READY_FOR_INDEPENDENT_PRODUCT_REVIEW

with exact evidence paths and all unresolved gaps.

Codex cannot issue PRODUCT ACCEPT.

STOP conditions

STOP immediately for:

fresh common baseline failure
BF build failure
WoG build failure
BF >10
WoG >8
Core/shared mechanism delta
schema/test/script change
new dependency
new Pattern/runtime framework
fifth representative page
official BF screenshot use
unsupported BF diagram claim
fabricated WoG mechanic
unfaithful masking

No same-iteration Core repair.

Unchanged prohibitions

Do not run:

fresh47
full Safari matrix
41/41 reconciliation
release matrix
6000+ hash framework
npm install
final-purpose npm run build

Do not:

commit
push
tag
merge
deploy
release
Global status boundaries

Even if PLAN41 completes:

WS04B != implicitly accepted
WS07 != implicitly accepted
Safari/AX remain unproven
Release remains unaccepted

Only the bounded two-game PRODUCT proof is submitted for independent review.

这次 baseline rebind 我建议直接新建 v2 workspace，而不是给 v1 打补丁。这样最终如果 two-game proof 成功，我们能清楚回答一个很重要的问题：

两个真实游戏是否在完全相同的、已经修复并独立验收过的 V2.7 Core 上完成了采用？

而不是“某次失败现场经过若干局部修补后最后跑通了”。这对 Starter 的可复用性证明更干净。
