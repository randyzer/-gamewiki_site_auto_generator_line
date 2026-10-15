# ChatGPT REVIEW37 / PLAN38

Captured from the same hot_words_web ChatGPT conversation on 2026-10-08. Raw visible reply follows.

[C2C]
STATE: REVIEW
TASK_ID: c2c_a765
ITERATION: 37
DECISION: ACCEPT — BOTH INPUT PATHS ELIGIBLE FOR IMPLEMENTATION ATTEMPT

我独立复核了 iteration37 的 4 份记录以及它们引用的实际 BF/WoG 源材料。结论成立，但接受边界必须保持很窄：

纯文本
BF_ORIGINAL_DIAGRAM_INPUT
= ELIGIBLE_FOR_IMPLEMENTATION_PLAN

WOG_MASKED_IDENTITY_INPUT
= ELIGIBLE_FOR_IMPLEMENTATION_PLAN

TWO-GAME PROOF
= NOT STARTED

BF OFFICIAL BATTLE SCREENSHOT
= STILL UNAUTHORIZED

WOG MASKED RECOGNITION
= STILL UNPROVEN

BF 的判断是可信的。现有官方证据确实只支持“三支队伍可以切换以保持 mine running”；旧 SVG 中的 Recover、Prepare、another recovers、固定循环箭头都不能直接继承。iteration37 明确要求重新从零绘制、不复制旧 SVG，且只表达已支持事实，因此这是新的 project-authored factual media 路径，而不是对 Steam screenshot 的变相 rights waiver。

WoG 的判断也只是“值得实施后接受真正测试”。High-Grade Jewel of Strife、High-Grade Jewel of Valor 与 App 4891320 的 Steam listing / publisher-app relationship 是真实、dated、app-specific 的记录；同时 review 正确排除了 rarity、drop、build fit、upgrade/synthesis mechanics、profitability 等并未由这些记录证明的推论。它们能作为 masked surface 的真实 game-specific cues，但 reviewer 最终是否真的能认出 War of Genesis，仍然完全开放。

另外确认：execution_output 仍没有 iteration37 新执行项，与这轮只有文档/source checks、build/test/browser NOT_RUN 一致。

下一步可以进入真正的 four-page vertical proof，但必须采用下面这个修正版 scope。

PLAN38 — Two-Game Vertical Proof with Original BF Diagram

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 38
WORKSTREAM: TWO-GAME VERTICAL PROOF
SCOPE: PRODUCT PROOF IMPLEMENTATION

PREDECESSORS:

Design V1 ACCEPT — PRODUCT CRITERIA BASIS

PLAN36 Gate A BLOCK preserved

REVIEW37:
BF original factual diagram input ELIGIBLE
WoG masked identity input ELIGIBLE FOR ATTEMPT

IMPLEMENTATION SUCCESS:
NOT PREJUDGED

1. Core objective

Using the same current V2.7 Core / dependencies / Pattern composition methods, build two isolated proof slices:

Bomb Farm:

/

/guides/how-to-play/

War of Genesis:

/guides/

/guides/gear/

Then perform actual product comparison and strict masked identification review.

No historical site PASS is inherited.

2. Critical BF media replacement

PLAN36's former asset:

public/media/home/battle-overview.webp

is REMOVED from the proof plan.

It remains unauthorized and must not enter either proof root.

Replace BF input #9 with exactly:

public/media/proof/three-team-switching.svg

This is a NEW project-authored factual diagram created from scratch inside the isolated BF proof root.

BF scope remains exactly 10 files.

3. BF10 exact input scope

Allowed Bomb Farm proof-input changes:

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

No 11th BF input file.

4. BF diagram exact semantic boundary

The new SVG may visibly communicate only the supported concept:

THREE TEAMS

TEAM 1
TEAM 2
TEAM 3

Switch between teams
to keep the mine running.

Numbering is editorial notation only.

A shared mine/task label may be used.

The diagram must NOT state or visually encode:

Recover
Prepare
cooldown
energy amount
recovery rate
ready/not-ready state
mandatory 1→2→3 order
simultaneous team activity
optimal timing
exact rotation algorithm
5. BF diagram creation rules

Create the SVG from scratch.

Permitted:

primitive SVG geometry;

lines;

neutral cards;

arrows only if they mean generic switchability rather than ordered cycle;

text;

proof theme colors.

Forbidden:

copying the old energy-rotation.svg;

copying its paths/layout as a template;

official UI;

Steam screenshots;

official logo;

character art;

competitor imagery;

traced artwork.

The old SVG may be read only as evidence of what must NOT be inherited.

6. BF factual provenance

The factual source remains the recorded official Steam source supporting:

players can switch between three teams to keep the mine running.

Do not advance its historical accessedAt.

Do not imply fresh source verification.

7. BF rights/authorship record

docs/PROOF_GAME_ADAPTATION.md must record the actual creation facts for the new SVG:

created specifically for V2.7 proof
primitive project-authored SVG
no copied artwork/UI/logo
fact source separately identified

The media manifest rightsRef must point to that actual authorship/provenance record.

Important:

rightsRef != Human approval
8. BF Media Decision Table lifecycle

The diagram may be integrated for an evidence-purpose build only if its actual creation record supports an original/project-authored rights state.

Do NOT self-assign:

human_decision = APPROVED
visual_gate_state = PASS

before independent review.

The evidence-purpose lifecycle should retain genuine pending Human/visual review where applicable.

This is intentional: the current Core allows human-visual-pending during an evidence build.

Do not weaken the validator.

9. BF media contract

Use one image asset only.

Recommended identity:

id:
proof.three-team-switching

src:
/media/proof/three-team-switching.svg

dimensions:
1200 × 675

Alt must be descriptive and stay within verified meaning, e.g.:

Original diagram showing three teams available for switching to keep the mine running

Caption must explicitly state:

project-authored explanatory diagram
not an in-game UI capture
not a timing or recovery guide

sourceUrl points to the HTTPS factual source.

No credit is required unless actually authored.

10. BF media placement

The diagram must materially support:

guide.how-to-play

It cannot exist merely as decoration.

It may also support the bounded homepage only if the existing Manifest seam naturally allows that without implying screenshot/game-art identity.

No gallery inflation.

No second media asset.

Video = 0.

11. BF task composition

How-to-Play must answer the real bounded question around:

mine loop
progress observation
upgrade opportunity
three-team switching

Remove dependencies on pages outside the proof slice unless they remain genuine generated support routes.

Do not reintroduce old:

Heroes
Gear/Ritual
Skill Tree
Achievements
Market
Latest Update

merely to preserve historical content.

War of Genesis
12. WoG8 remains exact

Allowed WoG proof-input changes:

game.config.ts

src/data/page-inventory.json

src/styles/theme.css — VALUES ONLY

src/content/guides/getting-started.mdx — DELETE

src/content/guides/gear.mdx — NEW

docs/MEDIA_DECISION_TABLE.md — NEW

docs/PROOF_GAME_ADAPTATION.md — NEW

public/logo.svg — DELETE

No ninth file.

src/data/media/media.json remains unchanged/empty.

13. WoG Gear game-specific cues

The Gear article may include the already-recorded dated examples:

High-Grade Jewel of Strife
High-Grade Jewel of Valor
App 4891320 listing relationship

Only within the proven boundary.

Permitted meaning:

these named item identities appeared in app-specific Steam Market records on the recorded date;

the Valor record tied publisher fee metadata to App 4891320;

these examples establish concrete app/game context.

14. WoG prohibited inference

Do not say those records prove:

rarity system
drop source
combat role
upgrade path
synthesis mechanic
best build
progression value
current availability
current price
demand
liquidity
profitability
every copy is marketable

“High-Grade” in the item name is not evidence of a general rarity mechanic.

15. WoG ordinary MDX requirement

The game-specific examples must be visible in normal article content, not:

hidden metadata;

comments;

alt text only;

debug text;

CSS generated content;

encoded branding.

They must remain meaningful even after the explicit title/game/site identity is masked.

16. WoG task remains Gear decision

The article still centers on:

use
keep
inspect
potentially sell
stop when facts are unclear

Do not transform the article into a Steam Market fee article solely to make the app-specific cues stronger.

The item examples support identity/context; they do not redefine the selected player task.

17. WoG no-media decision

Empty Manifest alone is insufficient.

MEDIA_DECISION_TABLE.md must explain:

why the bounded Gear decision can be understood textually;

where media would have been useful;

which relevant visual/game evidence is still absent;

why this proof does not pretend the game generally needs no media.

No Human/visual PASS may be fabricated.

Same Core
18. Rebind current working-tree Core

Before creating proof copies capture current Candidate:

branch;

HEAD;

working-tree source changes;

active untracked product source;

package.json;

package-lock.json;

Node version.

Do not rely on HEAD/tree alone.

If substantive Core differs from the source basis reviewed for this Design:

STOP — SOURCE DRIFT
19. Common-core snapshot

Create one immutable common snapshot of the actual current Candidate.

Exclude:

.git
.env / secrets
.vercel
.c2c
dist
.astro
build caches
historical proof output

Include active current source, including relevant untracked source files.

20. Dependency isolation

Do not symlink BF and WoG to one writable node_modules.

Use:

one current dependency snapshot
→ BF independent copy
→ WoG independent copy

Requirements:

same package.json
same package-lock.json
same installed dependency bytes/source
no npm install
no upgrade
no lock mutation

Mutable build caches stay isolated.

21. Core delta = 0

Neither game may modify:

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

If required:

STOP — CORE GAP

No repair inside this proof.

Four representative pages
22. Exact representative set

Bomb Farm:

/
/guides/how-to-play/

War of Genesis:

/guides/
/guides/gear/

No fifth representative business page.

Generated support routes remain visible in the evidence output but do not become extra representative tasks.

Verification
23. Shared baseline

Run exactly once from common-core:

npm run check

Save complete command/output/exit code.

No fresh47.

No Safari matrix.

No 41/41.

24. Game build command

For each game use only:

npm run build:evidence

This is the authoritative build command for this proof.

Do NOT use:

npm run build

The expected evidence output retains:

EVIDENCE_BUILD_NOT_FINAL.json

Passing this build is not release acceptance.

25. Build retries

A game-side evidence build may be rerun after correcting only an error inside its approved BF10/WoG8 input scope.

If the correction requires:

new input file
Core edit
schema edit
test edit
script edit
validator exception
dependency change

STOP.

Browser evidence
26. Normal screenshot set

Capture all four pages at:

1440 × 900
390 × 844

Required normal screenshots:

8

Use current proof output only.

No historical screenshots.

27. Browser observations

For each entry→answer journey record:

visible first-screen promise;

working navigation;

direct answer/task framing;

action/decision basis;

stopping/completion condition;

actual TOC/FAQ only if rendered;

primary links;

BF diagram/caption behavior where present;

no empty media shell;

horizontal overflow;

basic visible keyboard focus.

This does not establish Safari/AX PASS.

Strict masked review
28. Derived masked screenshots

From the NEW current desktop article screenshots produce:

bf-how-to-play-masked.png
wog-gear-masked.png

Mask only:

logo;

site name;

explicit game name;

explicit page title.

Do not:

rewrite body text;

hide legitimate item/system terms;

add labels;

regenerate the page;

stylize the screenshot.

29. Implementer cannot grade masking

Codex prepares the two faithful masked screenshots.

Codex does NOT write:

Bomb Farm identified because...
War of Genesis identified because...

as the reviewer result.

Those answers belong to the independent reviewer.

30. Real independent masked criterion

The independent reviewer must inspect each image separately and answer:

Which specific game/site is this?
What non-name/non-logo evidence led you there?

For EACH game acceptance requires:

correct specific identification
+
at least 2 non-name/non-logo cues
+
at least 1 cue backed by real game-specific evidence
31. BF masked standard

Potential valid cues may include the actual bounded combination of:

mine task
three-team switching
project-authored explanatory diagram
task/content structure

But the independent reviewer must actually observe and cite them.

The plan does not pre-award the answer.

32. WoG masked standard

Potential valid cues include the newly visible:

High-Grade Jewel of Strife
High-Grade Jewel of Valor
app-specific Market context
Gear keep/use/sell decision framing

But:

App ID alone
generic dark styling
generic market content
generic gear wording
absence of BF diagram

cannot satisfy the criterion.

If the reviewer cannot identify WoG specifically:

Visual Identity = FAIL / UNPROVEN

Do not weaken the standard.

Six product dimensions
33. Review all original Design V1 dimensions

Independent review must assess:

A. Visual identity
B. Media treatment
C. Page rhythm
D. Player task
E. Taxonomy/navigation
F. Article composition

Each dimension requires actual current output and actual input/source explanation.

No averaging.

One failed dimension means the limited proof is not PRODUCT ACCEPT.

34. FD-01 through FD-06

Evaluate all six false-differentiation risks from Design V1 against actual output.

Historical:

DESIGN ADDRESSED

does not become:

IMPLEMENTATION PASS

FD-03 remains coupled to the strict masked identity result.

Exact 21-file review package
35. Fixed review files remain 21

common-core-identity.md

bomb-farm-input-diff.patch

wog-input-diff.patch

shared-check.log

bomb-farm-build.log

wog-build.log

PROOF_REVIEW_PACKAGE.md

screenshots/bf-home-desktop.png

screenshots/bf-home-mobile.png

screenshots/bf-how-to-play-desktop.png

screenshots/bf-how-to-play-mobile.png

screenshots/wog-hub-desktop.png

screenshots/wog-hub-mobile.png

screenshots/wog-gear-desktop.png

screenshots/wog-gear-mobile.png

screenshots/bf-how-to-play-masked.png

screenshots/wog-gear-masked.png

outputs/bomb-farm/index.html

outputs/bomb-farm/guides/how-to-play/index.html

outputs/war-of-genesis/guides/index.html

outputs/war-of-genesis/guides/gear/index.html

Count remains exactly:

21 fixed review files
36. Generated support trees

Mirror complete actual generated dist trees to:

outputs/bomb-farm/**
outputs/war-of-genesis/**

including actual:

CSS;

JS;

generated media;

Pagefind;

robots/sitemaps;

support/error pages;

evidence marker.

Do not manually edit mirrored generated output.

The four fixed HTML files above are members of these trees.

Diff / isolation proof
37. Compare each proof root to common-core

Require:

BF differences ⊆ exact BF10
WoG differences ⊆ exact WoG8

And:

Core/shared mechanism delta = 0

For theme.css:

existing values only
no new selector
no new custom property
no new mechanism

For MDX:

no new component imports
no executable mechanism
38. No huge hash framework

Use ordinary:

diff
cmp
git diff --no-index

for bounded source comparison.

Do not create:

repository-wide protected-file hashing;

fresh47-style recertification;

new verification framework.

Evidence package truth rules
39. PROOF_REVIEW_PACKAGE.md

Codex records only facts:

actual source baseline;

exact input deltas;

build outcomes;

browser observations;

diagram provenance;

WoG evidence provenance;

six-dimension evidence pointers;

FD observations;

unresolved gaps.

Do not self-write final:

PRODUCT ACCEPT
40. Historical results not inherited

Do not inherit:

old BF QA PASS;

old V2.1 media PASS;

old WoG release/Phase 5 PASS;

old screenshots;

old masked identification assumptions;

old browser acceptance.

Historical material is provenance/input only.

STOP conditions
41. Immediate STOP if

BF original SVG would need unsupported factual language;

SVG creation cannot be documented as new project-authored primitive work;

any official/third-party art becomes necessary;

WoG needs fabricated gameplay mechanics;

WoG can only differentiate through branding/generic styling;

fifth representative product page becomes necessary;

BF exceeds 10 input files;

WoG exceeds 8 input files;

Core/tests/scripts/schema/package require edits;

evidence build requires weakening a validator;

masked screenshot cannot be faithfully produced;

dependency isolation cannot be maintained.

Completion boundary
42. Codex terminal report

If execution completes, Codex may report only:

TWO-GAME VERTICAL PROOF:
READY_FOR_INDEPENDENT_PRODUCT_REVIEW

with all evidence paths and actual unresolved gaps.

It may NOT report:

PRODUCT ACCEPT
WS04B ACCEPT
WS07 ACCEPT
AX PASS
Safari PASS
41/41 PASS
RELEASE ACCEPT
43. Independent reviewer terminal decision

After reading actual source/diffs/builds/generated output and viewing the current screenshots/masked screenshots, ChatGPT returns one:

ACCEPT — PRODUCT
REVISE — PRODUCT
BLOCK — PRODUCT

for this limited two-game vertical proof only.

44. Preserved global holds

Regardless of proof result:

Safari / AX:
still unproven

WS04B:
not implicitly accepted

WS07:
not implicitly accepted

Release:
not accepted

No commit/push/tag/merge/deploy/release in PLAN38.

有一点值得特别强调：这次 BF 的媒体路径变得更能检验 V2.7 本身。它不是依赖“恰好拿到了官方截图许可”，而是检验 Core 的 Media-rich Article 能不能承载一个真实、有解释作用、来源明确且版权依赖更低的游戏知识图解。

而 WoG 则保留最难的测试：即使页面技术上完全成功，如果遮名后我不能凭实际可见的 Strife/Valor 等 game-specific cues 把它认成 War of Genesis，Visual Identity 仍然 FAIL，整个 two-game PRODUCT proof 也不能通过。
