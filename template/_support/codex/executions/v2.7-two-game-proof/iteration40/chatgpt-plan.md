# ChatGPT REVIEW39 / PLAN40

Captured raw visible reply on 2026-10-08. Standalone Core repair; old proof frozen.

[C2C]
STATE: REVIEW
TASK_ID: c2c_a765
ITERATION: 39
VERDICT: ACCEPT STOP — REAL CORE PORTABILITY GAP CONFIRMED

我独立复核了 iteration39、bomb-farm-build.log、当前 About consumer、static-page-copy.ts、PP-02 sentinel、adoption fixture 和 released execution evidence。这个 STOP 是正确的，而且这次确实发现了一个需要修 Starter Core 的真实问题。

基线修复已经成立：补齐 byte-identical ci.yml 后，retry 是 855/855 PASS，第一次失败日志也完整保留。随后 BF 恰好只做了 exact10 input changes / shared Core 0，npm run build:evidence 在正式 input adaptation 后第一次暴露：

纯文本
PP-02 core.about-intro residue on page:about:copy

这不是 BF 第 11 个输入漏了。

当前机制实际上是：

纯文本
Page Inventory
  about.title       ← project-owned
  about.description ← project-owned

BUT

/about/ visible intro
  ← src/core/static-page-copy.ts
  ← hardcoded:
     "Game Atlas is a reusable editorial system..."

而 PP-02 的 source projection 又明确把：

TypeScript
getStaticPageCopy("about")

纳入 page:about:copy。

因此真实 adoption 一旦把 Game Atlas 换成实际游戏，PP-02 必然看到 Starter About residue。PP-02 正是在正确工作。

更关键的是，现有 synthetic adopted fixture 一直通过，是因为：

纯文本
tests/helpers/core-build-fixture.ts

会偷偷直接修改：

纯文本
src/core/static-page-copy.ts

把 Game Atlas intro 改成 Field Notes。

也就是说，现有 adoption technical proof 隐含了：

纯文本
adoption → mutate Core source

而这与现在已经明确的：

纯文本
Core stable
game adaptation through existing authorities

边界冲突。

所以这个 gap 不是 two-game proof 的问题；two-game proof 只是第一次用 Core0 的真实采用方式把它暴露出来。

最小正确架构我认为很明确：

纯文本
About project intro
→ existing Page Inventory description

Reusable editorial-method sections
→ remain Core

Privacy / Terms
→ remain legal-content authority

PP-02 old Game Atlas sentinel
→ remain intact

不需要增加任何 schema/config/adaptation field。

下面是独立于 immutable-Core two-game proof 的有限修复计划。

PLAN40 — Core About Portability Repair

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 40
WORKSTREAM: V2.7 CORE PORTABILITY REPAIR
DEFECT: ABOUT PROJECT COPY REQUIRES CORE MUTATION
TYPE: MINIMAL CORE REPAIR

TWO-GAME PROOF:
PAUSED AT ITERATION39

BASELINE REBIND:
NOT AUTHORIZED UNTIL INDEPENDENT REVIEW40 ACCEPT

BF10:
FROZEN

WOG8:
UNCHANGED / NOT STARTED

RELEASE / WS04B / WS07 / SAFARI / AX:
NO PROMOTION

1. Defect statement

Current public About rendering owns its project-specific intro in Core:

src/core/static-page-copy.ts

through:

Game Atlas is a reusable editorial system...

A real adoption cannot replace that public project identity through existing project authorities.

The synthetic adopted fixture currently hides this portability defect by directly rewriting the Core file.

That is not a valid reusable-Starter contract.

2. Why PP-02 must not change

Current PP-02 correctly detects:

core.about-intro

on:

page:about:copy

Do NOT:

remove core.about-intro;

mark it ordinary/evidence-warning;

special-case About;

exclude About from source scanning;

exclude About from generated HTML scanning;

change evidence mode to tolerate it;

add a Bomb Farm sentinel exception.

The old literal remains a forbidden shipped Starter residue.

3. Existing authority to use

Do not create a new About schema.

The existing Page Inventory row already owns:

pageId
route
title
description
sources
dates
indexability

For an About page:

page.description

becomes the public project-owned intro.

This is the only new binding.

4. Resulting ownership boundary

After repair:

Page Inventory description
    ↓
About visible intro
    ↓
Pagefind description metadata

Core continues to own only reusable editorial-method sections such as:

Sources before claims
Facts live once
Publishing is a deliberate gate

Those sections contain reusable methodology and no project identity.

5. Do not turn About into another content system

PLAN40 must NOT add:

aboutContent
aboutCopy
aboutIntro
editorialCopy
staticPages

to game.config.ts.

Do not add:

src/data/about-content.*
contentRef
new content collection
new Page Inventory field
new schema
new adaptation JSON

The existing description is sufficient.

6. Privacy / Terms remain untouched

Privacy and Terms continue to use:

legal-content authority
+
legalActivation
+
approved content digest

PLAN40 does not make Page Inventory descriptions legal-policy bodies.

getStaticPageCopy("privacy" | "terms") must continue to reject starter fallback rendering.

No legal-safety behavior changes.

Exact source scope
7. Production files — exact 3

Only these production/runtime files may change:

1. src/core/static-page-copy.ts
2. src/components/LegalPage.astro
3. scripts/core-safety-sentinels.ts

No fourth production file.

8. Test/support files — exact 3

Only:

4. tests/static-page-copy.test.ts
5. tests/core-safety-sentinels.test.ts
6. tests/helpers/core-build-fixture.ts

Total PLAN40 changed files:

exact 6

Execution artifacts excluded.

If a seventh source/test file becomes necessary:

STOP
REPLAN
RED phase
9. RED test semantics first

Before production implementation, change tests/support only.

tests/static-page-copy.test.ts

Require the About resolver to accept a project intro supplied by the caller.

For example:

const intro =
  "Bomb Farm Wiki explains the bounded source and editorial scope.";

const copy = getStaticPageCopy("about", intro);

expect(copy.intro).toBe(intro);

Also require blank/whitespace project intro to fail closed.

Existing reusable-section assertion remains:

sources / facts / publishing

Privacy/Terms rejection tests remain unchanged.

10. Remove hidden Core rewrite from adopted fixture

In:

tests/helpers/core-build-fixture.ts

remove only the code that opens:

src/core/static-page-copy.ts

and replaces the Game Atlas About intro with Field Notes.

Do not replace that hidden rewrite with another Core rewrite.

The adopted fixture may continue modifying its legitimate project inputs:

game.config
Page Inventory
content
media
public branding asset

within existing technical QA behavior.

11. Explicit fixture portability regression

In:

tests/core-safety-sentinels.test.ts

add a regression proving an adopted fixture no longer edits:

src/core/static-page-copy.ts

The fixture copy of that file must remain byte-identical to the source Core file.

This directly protects the portability invariant that iteration39 exposed.

12. Source-sentinel regression

Also test an adopted About page whose:

title
description
source URL

contain no Starter identity.

Require:

collectSourceResidueSignals(...)

not to report:

core.about-intro

merely because About exists.

At the same time the existing explicit sentinel test for the old literal remains PASS:

"Game Atlas is a reusable editorial system..."
→ PP-02 core.about-intro

So safety is preserved, not weakened.

13. Required RED evidence

With test/support changes but before production repair, run:

vitest:
tests/static-page-copy.test.ts
tests/core-safety-sentinels.test.ts

Expected:

non-zero RED

because current Core ignores/does not support project-owned About intro semantics.

Then run:

npm run verify:adopted-final

with the hidden Core rewrite removed.

Expected RED:

PP-02 core.about-intro

Preserve both RED outputs.

No assertion weakening after RED.

Implementation
14. static-page-copy.ts

Keep the existing reusable About sections.

Remove the hardcoded project identity as the About intro authority.

Change the resolver to require a project-supplied intro, conceptually:

getStaticPageCopy(
  "about",
  projectIntro
)

For About:

trim projectIntro
reject empty
return:
  intro = projectIntro
  reusable Core sections

Exact implementation syntax is up to Codex.

Do not import game config.

Do not import a new adaptation object.

15. Why the resolver receives a string

The Core helper should not become another Page Inventory consumer.

Its responsibility remains:

assemble reusable static-page presentation copy

The caller supplies the already-resolved project-owned intro.

This keeps dependency direction narrow:

page consumer
→ Core copy helper

not:

Core copy helper
→ global Page Inventory authority
16. LegalPage.astro

For:

copyType === "about"

call the About copy resolver with:

page.description

Therefore the public rendered intro is the existing Page Inventory description.

Do not alter:

page.title
page.updatedAt
related pages
layout
kicker
legal notice handling
Privacy/Terms handling
17. core-safety-sentinels.ts

When projecting source-visible About content, resolve the same About copy using:

page.description

so validation and rendering use the same authority.

Do not change:

CORE_SENTINELS
scan algorithm
ordinary classification
surface scopes
coverage rules
HTML projection
Pagefind projection
URL detection

Especially preserve the exact historical:

core.about-intro

literal.

Architecture invariants
18. One authority, not duplication

After repair:

About title       = Page Inventory
About intro       = Page Inventory description
About sources     = Page Inventory
About dates       = Page Inventory
About method body = reusable Core

No duplicate project intro exists in Core.

19. SEO/render consistency

Base/SEO already uses the Inventory description.

The About visible intro now uses that same description.

Thus:

SEO description
and
visible About intro

share one existing project authority.

No second copy field.

20. Core method sections remain reusable

Do not make:

Sources before claims
Facts live once
Publishing is a deliberate gate

game-specific merely because the intro moves.

PLAN40 is a portability correction, not an About redesign.

21. No two-game input change

Do not modify:

/private/tmp/v2.7-two-game-proof-v1/**

during PLAN40.

Do not change the BF exact10 input.

Do not start WoG8.

Iteration39 failed proof workspace remains frozen evidence of the pre-repair Core.

GREEN verification
22. Targeted GREEN

After the three production changes run:

vitest:
tests/static-page-copy.test.ts
tests/core-safety-sentinels.test.ts

Require PASS.

23. Adoption contract GREEN

Run:

npm run verify:adopted-final

Require PASS without any fixture modification of:

src/core/static-page-copy.ts

This is the central portability proof.

24. Unadopted safety must still reject

Run:

npm run verify:unadopted-final

Expected behavior remains:

EXPECTED_PP02_REJECTION

It must still reject the shipped Starter state.

If unadopted unexpectedly passes:

STOP — SAFETY REGRESSION
25. Root regression

Run:

npm run check

under Node 22.22.0.

Require:

Astro 0 errors
all Vitest tests PASS

Report actual new test count.

Do not predeclare the count because PLAN40 adds assertions.

26. No proof build in PLAN40

Do NOT rerun:

BF build:evidence
WoG build:evidence
two-game browser
masked review

inside Core repair iteration.

Those belong only after independent Core review and baseline rebind.

Independent review package
27. Required review evidence

Iteration40 must provide:

result.md
approved-scope.patch
RED targeted log
RED adopted-verification log
GREEN targeted log
GREEN adopted-verification log
unadopted-verification log
root-check log
source identity before/after

No repository-wide hash framework.

Ordinary bounded diff is sufficient.

28. Reviewer must verify

Independent REVIEW40 must explicitly inspect:

exact6 source/test scope;

About intro now comes from page.description;

reusable Core sections remain;

Privacy/Terms are unchanged;

CORE_SENTINELS catalog is not weakened;

old core.about-intro is still detected;

adopted fixture no longer edits Core About source;

adopted final succeeds;

unadopted final still rejects;

root check passes.

Baseline rebind prohibition
29. Do not resume two-game proof automatically

Even if PLAN40 GREEN is complete, Codex may report only:

CORE ABOUT PORTABILITY REPAIR:
READY_FOR_INDEPENDENT_REVIEW

It may NOT copy repaired Core into the two-game proof workspace yet.

30. After independent ACCEPT only

Only after REVIEW40 returns:

ACCEPT — CORE PORTABILITY REPAIR

may a later bounded plan:

rebind a fresh common-core baseline
recreate isolated BF/WoG copies
reapply the already-reviewed BF10
retain WoG8
run common check
resume npm run build:evidence

The old iteration39 BF build failure remains historical evidence.

It is never overwritten.

Explicitly prohibited

No:

BF11
WoG9
new About schema
new config field
new content collection
new runtime adaptation object

PP-02 exception
sentinel removal
sentinel ordinary downgrade
About exclusion
evidence-mode bypass

Privacy/Terms redesign
legal-content change

Core consumer redesign
new component
new dependency

proof-workspace repair
history rewrite
governance promotion
release action
Terminal states
Success
CORE ABOUT PORTABILITY REPAIR:
READY_FOR_INDEPENDENT_REVIEW

TWO-GAME PROOF:
PAUSED
Any safety or scope failure
STOP — CORE REPAIR NOT ACCEPTABLE

with exact evidence.

No baseline rebind.

这次修复之所以值得进入 Core，而不是当成 proof 特例，核心原因很简单：

一个 Starter 如果要求每个真实游戏都去编辑 src/core/static-page-copy.ts 才能换掉 About 的 Starter 品牌，那它就还没有真正做到“稳定 Core + 游戏输入适配”。

而且这次不需要设计新的内容模型。Page Inventory.description 已经是现成、正确、被 BF/WoG 都在使用的项目级 authority；把 About intro 接回这个 authority，同时保留 PP-02 原有阻断能力，就是最小修复。
