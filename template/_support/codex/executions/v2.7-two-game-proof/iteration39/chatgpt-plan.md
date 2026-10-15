# ChatGPT REVIEW38 / PLAN39

Captured raw visible reply on 2026-10-08 from the existing hot_words_web conversation.

[C2C]
STATE: REVIEW
TASK_ID: c2c_a765
ITERATION: 38
DECISION: ACCEPT DIAGNOSIS — INCOMPLETE SNAPSHOT, NOT CORE FAILURE

我独立核对了 result.md、原始 shared-check.log、当前 tests/runtime-contract.test.ts、Candidate .github/workflows/ci.yml 以及 execution output #98。结论成立。

这次 npm run check 的结果是：

纯文本
Astro:
152 files
0 errors
0 warnings
0 hints

Vitest:
48 files total
47 passed
1 failed

855 tests total
853 passed
2 failed

两条失败都在同一个读取前置条件：

TypeScript
read("../.github/workflows/ci.yml")

实际失败也是：

纯文本
.../common-core/.github/workflows/ci.yml exists
expected false to be true

而 Candidate 中该文件真实存在，并且内容满足测试所期待的 Node/runtime CI contract，包括：

纯文本
node-version-file: .nvmrc
npm run check
npm run verify:unadopted-final
npm run verify:adopted-final
npm run check:browser

我又检索了当前 Candidate，测试代码里对 .github 的运行时依赖只有这两处，均来自 runtime-contract.test.ts。所以现有证据支持：

纯文本
FAIL CAUSE:
snapshot copy omission

NOT:
Core logic failure
test regression
CI contract mismatch
dependency failure
Node mismatch

因此不应修改 test、CI、Core 或 validator。

另一个边界也确认：

纯文本
BF input adaptation = 0
WoG input adaptation = 0
new BF SVG = NOT_CREATED
build:evidence = NOT_RUN
browser = NOT_RUN
masked review = NOT_RUN

所以现在允许做的是补完整同一个 baseline snapshot，而不是重新开始 proof。

有一点需要精确定义：原失败日志必须永久保留：

纯文本
proof-v1/shared-check.log

新的成功/失败重试必须写到另一个文件，例如：

纯文本
proof-v1/shared-check-retry.log

它属于retry/support evidence，不扩张原先的 21 fixed review slots。最终 PROOF_REVIEW_PACKAGE.md 必须同时说明首次失败与重试结果，不能只展示后一次绿色结果。

PLAN39 — Complete Baseline Snapshot and Resume Two-Game Proof

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 39
WORKSTREAM: TWO-GAME VERTICAL PROOF
TYPE: BASELINE SNAPSHOT CORRECTION + CONDITIONAL CONTINUATION

PREDECESSOR:

PLAN38 stopped before product adaptation

REVIEW38 accepts failure classification:
INCOMPLETE BASELINE SNAPSHOT

BF10 / WoG8 untouched

product/test/Core/governance delta = 0

PRIMARY RULE:
Complete the snapshot.
Do not repair the product.

1. Freeze iteration38 failure

Do not modify or overwrite:

template/codex/verifications/v2.7-two-game-proof/
proof-v1/shared-check.log

It remains the authoritative first-attempt evidence:

npm run check
exit 1

Astro 0 errors
853 PASS / 2 FAIL

missing:
.github/workflows/ci.yml

Also preserve iteration38 result/history unchanged.

2. No workspace reset

Reuse the already-created isolated proof roots:

/private/tmp/v2.7-two-game-proof-v1/common-core
/private/tmp/v2.7-two-game-proof-v1/bomb-farm
/private/tmp/v2.7-two-game-proof-v1/war-of-genesis

Do not recreate them from scratch unless their integrity has changed.

Before correction verify:

BF input mutations = 0
WoG input mutations = 0
Core mutations = 0

If not:

STOP — WORKSPACE DRIFT
3. Exact missing baseline file

The only authorized snapshot completion is:

.github/workflows/ci.yml

Source:

Repo_hotgameweb/
GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/
.github/workflows/ci.yml

Copy byte-for-byte into all three isolated roots:

common-core/.github/workflows/ci.yml
bomb-farm/.github/workflows/ci.yml
war-of-genesis/.github/workflows/ci.yml

Create .github/workflows/ directories only as needed to hold that file.

4. Classification of this file

.github/workflows/ci.yml is:

SHARED BASELINE SOURCE

It is NOT:

BF11
WoG9
game adaptation input
new tool
new proof framework
Core repair
test repair

Therefore the limits remain:

BF = max10 product/input changes
WoG = max8 product/input changes

unchanged.

5. Byte identity requirement

Before retry require:

Candidate ci.yml
==
common-core ci.yml
==
bomb-farm ci.yml
==
war-of-genesis ci.yml

byte-for-byte.

Use ordinary:

cmp

or equivalent bounded byte comparison.

Do not edit CI contents.

Do not normalize whitespace.

6. Snapshot dependency correction record

Create one iteration39 execution record describing:

missing file
why tests require it
source path
three destination paths
byte equality result

Do not create a new generalized snapshot manifest/framework.

The clarification is specific to this proof.

7. Retry authorization

After exact CI completion, retry exactly:

npm run check

from:

/private/tmp/v2.7-two-game-proof-v1/common-core

using the same Node 22.22.0 environment.

This retry is explicitly authorized.

8. Retry log

Write complete output to:

template/codex/verifications/v2.7-two-game-proof/
proof-v1/shared-check-retry.log

Do NOT write to:

shared-check.log

The original failure remains untouched.

Record:

command
cwd
Node version
stdout/stderr
exit code
9. Review-file count rule

The existing proof contract remains:

21 fixed review files

shared-check-retry.log is classified as:

generated/support execution evidence

and is NOT a new fixed review slot.

The fixed list is not renumbered to 22.

PROOF_REVIEW_PACKAGE.md must later reference both:

shared-check.log
shared-check-retry.log

so the reviewer sees the failed first attempt and successful/failed retry.

No evidence erasure.

10. Required retry outcome

To resume PLAN38:

Astro:
0 errors

Vitest:
all test files PASS
855 / 855 PASS
exit code 0

The actual count must be reported from the run; do not fabricate it in advance.

11. If retry still fails

STOP immediately.

Classify the actual remaining failure.

Do NOT:

edit test
edit CI
edit Core
change runtime contract
skip runtime-contract.test.ts
run a narrower test as substitute

Return the real failure for independent review.

No BF/WoG adaptation begins.

12. No second retry in PLAN39

PLAN39 authorizes:

one baseline retry

after the CI snapshot completion.

If it fails:

STOP

No same-iteration patch/retry loop.

Conditional continuation of PLAN38
13. Continuation condition

Only if the corrected common baseline check exits 0 may execution continue into the already-approved PLAN38 product proof.

Record:

BASELINE READY

Do not call it:

PRODUCT PASS
14. Common snapshot thereafter

Treat:

common-core

including the copied byte-identical:

.github/workflows/ci.yml

as the actual shared baseline.

BF and WoG copies must contain the same CI bytes throughout the proof.

They may not edit it.

15. BF10 remains exact

Bomb Farm allowed product/input delta remains exactly:

game.config.ts

src/data/page-inventory.json

src/styles/theme.css

DELETE src/content/guides/getting-started.mdx

NEW src/content/guides/how-to-play.mdx

src/data/media/media.json

NEW docs/MEDIA_DECISION_TABLE.md

NEW docs/PROOF_GAME_ADAPTATION.md

NEW public/media/proof/three-team-switching.svg

DELETE public/logo.svg

No official screenshot.

No BF11.

16. WoG8 remains exact

War of Genesis remains exactly:

game.config.ts

src/data/page-inventory.json

src/styles/theme.css

DELETE src/content/guides/getting-started.mdx

NEW src/content/guides/gear.mdx

NEW docs/MEDIA_DECISION_TABLE.md

NEW docs/PROOF_GAME_ADAPTATION.md

DELETE public/logo.svg

No WoG9.

Media Manifest remains unchanged/empty.

17. Core0 remains absolute

No game may modify:

.github/workflows/ci.yml

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

.github/workflows/ci.yml is now explicitly part of shared immutable baseline.

If either game needs a CI difference:

STOP — SHARED BASELINE VIOLATION
18. Four representative pages unchanged

Exactly:

BF /
BF /guides/how-to-play/

WoG /guides/
WoG /guides/gear/

No fifth representative business page.

19. BF media replacement unchanged

Use only the new project-authored:

/media/proof/three-team-switching.svg

built from scratch.

Do not import/copy:

battle-overview.webp
old energy-rotation.svg
Steam screenshot
official artwork

The factual boundary from REVIEW37/PLAN38 remains unchanged.

20. WoG identity criterion unchanged

Visible bounded cues may use:

High-Grade Jewel of Strife
High-Grade Jewel of Valor
App 4891320-specific Market relationship

without unsupported gameplay/current-market inference.

This only enables the masked attempt.

It does not pre-award identification PASS.

21. Build authority unchanged

After game inputs settle, each game uses only:

npm run build:evidence

Never:

npm run build

for this proof.

No final-purpose build.

22. Build order after baseline PASS

Proceed:

BF bounded adaptation
→ BF build:evidence

WoG bounded adaptation
→ WoG build:evidence

A build failure may only be corrected inside that game's already-approved BF10/WoG8 scope.

Any Core/test/schema/script fix:

STOP
23. Browser and masking unchanged

Only after both evidence builds pass:

capture the same 8 normal screenshots.

Then create:

bf-how-to-play-masked.png
wog-gear-masked.png

from current screenshots.

Mask only:

logo
site name
game name
explicit page title

Do not mask legitimate game-specific body evidence.

24. Real independent masked review remains mandatory

Codex cannot decide:

BF identified
WoG identified

for acceptance.

It only prepares faithful evidence.

Actual reviewer criterion remains:

for EACH game:

specific game correctly identified
+
>= 2 non-name/non-logo cues
+
>= 1 real game-specific cue

If WoG cannot be specifically recognized:

Visual Identity = FAIL / UNPROVEN

No relaxation.

25. Fixed review slots remain 21

Retain exactly the existing 21 fixed review files from PLAN38.

Do not add CI or retry evidence to that fixed count.

Additional support evidence allowed by PLAN39 is limited to:

shared-check-retry.log
iteration39 execution records

plus the already-authorized generated output trees.

No general evidence-file expansion.

26. Generated support trees unchanged

Complete real dist outputs remain:

outputs/bomb-farm/**
outputs/war-of-genesis/**

Generated file count follows actual builds.

Do not manually edit generated output.

27. Diff semantics

Later BF/WoG input diffs are calculated relative to the corrected complete common snapshot.

Therefore .github/workflows/ci.yml must show:

zero difference

in both game copies.

It cannot appear as BF/WoG adaptation delta.

28. History truth

PROOF_REVIEW_PACKAGE.md must later record:

Baseline attempt 1:
FAIL — incomplete copied snapshot, missing CI workflow

Baseline snapshot corrected:
Candidate CI copied byte-identically to all three roots

Baseline retry:
actual result from shared-check-retry.log

Do not rewrite the narrative as if attempt 1 never happened.

29. No unrelated recertification

Still prohibited:

fresh47
Safari matrix
41/41
full release matrix
6000+ hash framework
new test suite
new snapshot tool
npm install
dependency upgrade
30. Terminal outcomes
A. Baseline retry fails

Return:

PLAN39:
BLOCKED AT BASELINE RETRY

with exact failure.

Proof remains not implemented.

B. Baseline retry passes, later PLAN38 execution stops

Return the actual bounded failure:

CORE GAP
BF INPUT/BUILD GAP
WOG INPUT/BUILD GAP
BROWSER/EVIDENCE GAP
MASKING NOT_RUN

as applicable.

C. Full bounded proof completes

Return only:

TWO-GAME VERTICAL PROOF:
READY_FOR_INDEPENDENT_PRODUCT_REVIEW

No PRODUCT verdict by Codex.

31. Global holds remain

Nothing in PLAN39 implies:

WS04B ACCEPT
WS07 ACCEPT
AX PASS
Safari PASS
RELEASE ACCEPT

No commit/push/tag/merge/deploy/release.

这次不需要重新设计 two-game proof。问题很具体：我们复制了测试，却漏复制了测试本身明确依赖的 CI contract 文件。

所以正确动作就是把 baseline 补完整、保留第一次红色日志、只授权一次新的 npm run check。如果它转绿，就从 PLAN38 停下的位置继续；如果仍红，再看新的真实故障，而不是提前改任何 Core。
