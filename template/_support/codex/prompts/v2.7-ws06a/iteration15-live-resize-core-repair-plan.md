ChatGPT 说：

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 15
WORKSTREAM: Live-Resize Core Repair — PLAN ONLY
PLAN_STATUS: READY FOR INDEPENDENT PLAN REVIEW
SOURCE_IMPLEMENTATION: NOT AUTHORIZED
CURRENT_PRODUCT_DELTA: 0
CURRENT_QUALIFICATION: FROZEN 36 PASS / 11 FAIL

我已重新读取当前 MobileNav.astro、navigation-behavior.test.ts、navigation.test.ts、现行 browser runner，以及 iteration13 的 forward / reverse / roundtrip 原始 trace。

本轮只定义未来 repair 的精确实施合同。Codex 现在不得修改源码或运行 repair。

1. 已证实的缺陷必须保持这个定义

当前 MobileNav 只在：

JavaScript
mobileMode.addEventListener("change", () => {
  const active = document.activeElement;
  ...
});

里决定是否迁移焦点。

问题不是 breakpoint 错，也不是等待时间不足。

失败 forward 的真实顺序：

纯文本
899 mobile child focused
↓
viewport 已变 901
↓
focused mobile child 因 CSS 隐藏先 focusout
↓
document.activeElement = BODY
↓
稍后才发生 matchMedia change callback
↓
MobileNav 读取到 BODY
↓
旧 pageId 已丢失
↓
desktop target 实际存在、可见
↓
无法迁移

而成功 roundtrip forward / 独立 reverse 中，MQL callback 恰好在旧 nav focus被浏览器清除之前执行，所以当前代码偶尔成功。

因此正式 repair target：

CORE_FOCUS_MIGRATION_TIMING_RACE
不能再依赖 MQL callback 那一刻的 document.activeElement 是旧 nav element。

2. 未来 repair 的设计原则

修复必须同时满足两个目标：

纯文本
A. breakpoint隐藏旧 nav 前，能够保留“最后有效 nav 身份”

B. 用户已经主动离开 navigation 后，绝不能用旧缓存把焦点偷回来

所以不能简单增加：

JavaScript
let lastFocusedNavElement;

然后每次 breakpoint 都强制恢复。

那会制造新的 accessibility bug。

3. 未来 product scope：严格 2 个文件

未来真正得到实施授权后，只允许修改：

纯文本
Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/
├── src/components/navigation/MobileNav.astro
└── tests/navigation-behavior.test.ts

不修改：

纯文本
tests/navigation.test.ts
scripts/core-browser-matrix.ts
scripts/run-core-browser-evidence.ts
scripts/core-browser-evidence.ts
global.css
DesktopNav.astro
Header.astro
package.json
package-lock.json
CI

也不修改：

纯文本
SOP
QA
Execution Prompt
Master Prompt
Contract
WebKit policy proposal

如果 repair 需要第三个 product file：

纯文本
STOP

重新规划。

4. 未来实施前必须保存的 exact preimages

当前 accepted/frozen hashes：

纯文本
MobileNav.astro
05b304de672444c48d22f52fac30caf55d31addbb8dbc94cd87e98edc029813c

tests/navigation-behavior.test.ts
dafbd7258566db89621d5d33b6610a85ea141106061b4766acb8bb3156a75f44

同时冻结：

纯文本
Starter source manifest
796b1a6e39ca2df4141e4e65ea4cf2fc70c9d510d3018fef38c3fd60612cfed8

matrix
000b8edd53f4eb99e569f81997dbefa2acbb304d38af61e4d9f9a05addf84371

runner
93b0200d5cec806091fd55ad5f4fd5da7dd835cba6aeefc5517efa76ec31d33c

Contract
1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c

historical qualification evidence
c24c2371ff8a52453582468165f0f2fb93918ea69bf59fd35e4f511b0bb00cf9

后续实施不得覆盖原 36/11 evidence。

5. 核心设计：缓存“语义身份”，不缓存 DOM element

未来 MobileNav 可以增加一个非常小的 focus-migration state。

概念上：

TypeScript
type NavFocusIdentity = {
  mode: "mobile" | "desktop";
  pageId: string | null;
  kind:
    | "mobile-trigger"
    | "mobile-group"
    | "mobile-page"
    | "desktop-page";
};

这里只表达设计，不要求用 TypeScript类型原样写进 inline JS。

关键要求：

缓存 pageId / nav kind，不缓存 destination HTMLElement。

这样 breakpoint发生时总是重新查当前 DOM，避免 stale/disconnected target。

6. 如何取得 mobile identity

沿用当前已经存在的真实映射规则。

Mobile child / overview

优先：

纯文本
closest("[data-nav-page-id]")

得到：

纯文本
guide.getting-started
hub.guides
...
Mobile group <summary>

当前 summary本身没有 data-nav-page-id。

继续使用现有逻辑：

纯文本
closest(".mobile-nav__group")
→ .mobile-nav__overview
→ data-nav-page-id

所以 group summary可映射 desktop parent Hub。

Top-level Menu summary

没有 pageId：

纯文本
kind = mobile-trigger
pageId = null

crossing desktop时沿用当前 fallback：

纯文本
brand/home
7. 在 breakpoint 前记住身份

未来实现必须在正常 focus进入 nav 时记录身份：

纯文本
document focusin

或者等价的 capture机制。

逻辑：

纯文本
focus进入 mobile nav
→ cache mobile semantic identity

focus进入 desktop nav
→ cache desktop semantic identity

不能等到 MQL callback 才第一次提取。

8. 用户主动离开 nav 时必须清掉缓存

这是 repair 最重要的安全边界。

Focus真正进入 navigation 外部

例如：

纯文本
brand
main
footer
其它正常focusable element

发生真实 focusin 后：

纯文本
cachedNavIdentity = null

因此：

纯文本
mobile child
→ 用户 Shift+Tab / Tab 到 brand
→ resize

不得重新把焦点扯进 desktop nav
9. Pointer主动离开也必须清除

如果用户：

纯文本
focus nav
→ mouse/pointer 点击 navigation 外部

外部目标可能不是 focusable element，因此不能只依赖下一次 focusin。

未来 repair应通过一个极小的 capture：

纯文本
pointerdown

当 target不属于：

纯文本
mobile
desktop

时清除 pending nav identity。

禁止：

纯文本
preventDefault()
pointer interception

这里只清理内部缓存。

10. 关键：区分“真实离开”与“responsive hiding造成的 BODY”

当前 bug正来自：

纯文本
nav item
→ CSS breakpoint隐藏
→ browser自动把 activeElement变 BODY

这种情况下通常：

纯文本
focusout发生
但没有一个用户选择的新 focusable target

repair 不能因此立即清缓存。

建议未来实现：

纯文本
nav focusout
→ queueMicrotask(...)

microtask 时检查：

情形 A — 仍是原 mode

例如缓存：

纯文本
mode = mobile

且此时：

纯文本
matchMedia("(max-width:900px)").matches === true

但 activeElement 已是 BODY / 非 nav。

这不是 breakpoint切换。

因此：

纯文本
clear cached identity

防止 stale identity以后偷焦点。

情形 B — mode 已经反转

缓存：

纯文本
mode = mobile

但 focusout microtask时：

纯文本
mobileMode.matches === false

说明 breakpoint已经发生，只是 MQL callback还没到。

此时：

纯文本
preserve cached identity

直到 change handler消费它。

这正好覆盖 iteration13 forward failure。

反向同理。

11. MQL handler 取 identity 的优先级

未来 change callback 不再只依赖：

JavaScript
document.activeElement

而是：

纯文本
1. 如果 activeElement 当前仍在 outgoing nav：
      使用实时 identity

2. 否则，如果存在有效 cached identity，
   且 cached.mode == outgoing mode：
      使用 cached identity

3. 否则：
      没有 migration authority
      不移动焦点

这一步是“不偷焦点”的核心。

12. Mobile → Desktop

仅在有效 outgoing mobile identity存在时执行。

先：

纯文本
close(mobile)

保持现有 nested disclosure cleanup。

有 pageId

重新从当前 desktop DOM查：

纯文本
[data-nav-page-id="<pageId>"]

再得到实际 anchor。

保留现有行为：

纯文本
先 focus desktop parent
→ 让 focus-within submenu展开
→ 再 focus child
没有 pageId

例如 Menu summary：

纯文本
fallback → brand
13. Stale / disconnected target

不能使用 cached HTMLElement。

Fresh query之后 destination必须同时满足：

纯文本
instanceof HTMLElement
isConnected
getClientRects().length > 0
visibility != hidden
display != none

否则 destination无效。

有有效 nav migration authority，但 target缺失

例如 pageId仍缓存，但对应 desktop item已经不存在：

纯文本
fallback → visible brand
Brand 本身也不可用

如果：

纯文本
!home.isConnected
或 hidden

则：

纯文本
不 throw
不 focus disconnected element
不找随机链接
保持当前 browser focus state

Fail-safe。

14. Desktop → Mobile

当前产品语义不是 desktop child → 精确 mobile child。

当前 contract/implementation是：

纯文本
desktop nav focus
→ breakpoint进入 mobile
→ focus Menu summary

保持不变。

只有 outgoing desktop nav identity有效时：

纯文本
focus mobile Menu summary

并验证：

纯文本
summary connected
visible

否则不动焦点。

15. Same-mode resize

必须明确保证：

纯文本
899 → 850
901 → 1200

不会触发 focus migration。

因为：

纯文本
matchMedia change

没有发生。

期望：

纯文本
focused child remains focused
open state remains as before

repair不得增加 generic：

纯文本
window.resize

监听器来反复迁移焦点。

只保留 MQL boundary transition作为迁移触发。

16. Escape / closing 语义必须原样保留

现有行为：

纯文本
nested Escape
→ close inner
→ focus group summary

second Escape
→ close outer
→ focus Menu summary

不得修改。

而新 focus cache必须自然跟随这些 focusin：

纯文本
child cache
→ Escape
→ cache更新为 group summary identity

→ Escape
→ cache更新为 mobile-trigger

因此：

纯文本
Escape之后再 resize

不能继续使用已经过期的 child pageId。

17. Native ancestor close也不能留下 stale identity

现有：

纯文本
toggle listener
→ hidden focus恢复到 visible disclosure trigger

新缓存必须由这个真实 focus迁移更新。

例如：

纯文本
mobile child
→ ancestor native close
→ focus outer summary
→ later resize

必须按：

纯文本
mobile-trigger → brand fallback

处理。

不能偷偷恢复旧 child。

18. Same-document / ordinary navigation不能回归

iteration12已经修复：

纯文本
exact current URL
→ prevent reload
→ visible target focus survives

ordinary different route
→ native navigation NOT prevented

repair不得碰这个规则。

尤其新缓存：

纯文本
same-document target → home/main focus

之后必须因 focus已经离开 nav而被清空。

否则随后 resize会发生 focus theft。

19. No-JS保证

此次未来 source change只能位于：

XML
<script is:inline>

内部。

不得修改：

纯文本
<details>
<summary>
anchors
href
markup hierarchy

所以 JS disabled时仍然完全依赖 native disclosure。

repair不得新增一个必须靠 JS 才能：

纯文本
打开菜单
访问 child link

的结构。

20. 未来 unit test扩展

只修改：

纯文本
tests/navigation-behavior.test.ts

fixture应增强到可以模拟：

纯文本
document focusin
focusout
pointerdown
queueMicrotask
disconnected destination

但继续执行真实 inline controller，不复制生产算法进测试。

至少新增这些 cases：

U1 — race reproduction：forward
纯文本
focus mobile child
set media mode = desktop
模拟 browser先把 active变BODY
但没有外部 focusin
再触发 MQL change
→ desktop matching child focused

这是本 bug 的核心 unit reproduction。

U2 — reverse race
纯文本
focus desktop child
set media mode = mobile
active先变BODY
MQL change
→ mobile Menu summary
U3 — deliberate focus outside：mobile
纯文本
mobile child
→ focus brand（真实focusin outside nav）
→ resize desktop
→ brand remains focused
U4 — deliberate focus outside：desktop
纯文本
desktop child
→ brand
→ resize mobile
→ brand remains focused
U5 — same-mode BODY clears stale cache
纯文本
mobile child
→ active becomes BODY
→ mode仍mobile
→ flush microtask
→ later cross desktop
→ no nav focus restoration
U6 — stale/missing destination
纯文本
cached mobile child pageId
→ matching desktop destination removed/disconnected
→ resize
→ visible brand fallback
U7 — unavailable fallback
纯文本
destination absent
brand disconnected/hidden
→ no throw
→ no random focus theft
U8 — group summary mapping
纯文本
mobile group summary
→ desktop mode
→ matching desktop parent
U9 — Menu summary fallback
纯文本
outer Menu summary
→ desktop
→ brand
U10 — Escape invalidates old child identity
纯文本
child
→ Escape inner
→ Escape outer
→ resize desktop
→ brand

NOT old desktop child

现有 tests全部保留。

21. 未来 targeted unit command

使用当前真实工具，不增加 dependency：

Bash
cd Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE

npm exec -- vitest run \
  tests/navigation-behavior.test.ts \
  tests/navigation.test.ts

期望：

纯文本
exit 0
existing tests retained
new race/no-focus-theft cases PASS
no skip
22. 未来 focused real-browser repair control

不要为了 repair修改 frozen runner。

未来实施轮在 governance evidence目录新增：

纯文本
template/codex/executions/v2.7-ws06a/<repair-iteration>/
live-resize-repair-control.ts

它不是 product file。

使用当前：

纯文本
Playwright 1.63.0
Chromium 153.0.8010.12 / rev1243

以及当前 adopted Field Notes fixture。

23. Real-browser R1 — forward

真实键盘：

纯文本
899
→ Tab到 Menu
→ Enter
→ Tab到 Guides summary
→ Space
→ Tab到 child

确认：

纯文本
guide.getting-started focused

然后：

纯文本
899 → 901

要求：

纯文本
MQ desktop
desktop visible
mobile hidden
nested/outer details closed
matching desktop guide.getting-started anchor focused

不允许：

纯文本
locator.focus()
sleep-to-pass
24. R2 — reverse，fresh context

必须新 context/page：

纯文本
901
→ keyboard Tab到 desktop child
→ 901 → 899

要求：

纯文本
mobile visible
desktop hidden
Menu summary focused

不能依赖 R1成功。

25. R3 — exact roundtrip
纯文本
899 mobile child
→ 901 matching desktop child
→ 899 Menu summary

全程不人工补焦点。

这是现有 qualification live-resize路径。

26. R4/R5 — no-focus-theft
Mobile side

真实键盘先得到：

纯文本
mobile child

然后：

纯文本
Escape → group summary
Escape → Menu summary
Shift+Tab → brand

确认 brand真的 focused。

再：

纯文本
899 → 901

必须：

纯文本
brand remains focused
no desktop nav focus appears
Desktop side

真实 keyboard Tab到 desktop child，然后 Shift+Tab直到实际 brand。

确认 brand focused后：

纯文本
901 → 899

要求：

纯文本
brand remains focused
Menu不得抢焦点
27. R6 — pointer outside no-focus-theft

这是为了覆盖“点击非focusable区域，没有后续focusin”的情况。

流程：

纯文本
focus mobile child
↓
真实 page mouse/pointer 点击 main 内容空白区域
↓
确认 nav cache 应被撤销
↓
899 → 901

要求：

纯文本
不得自动 focus desktop nav

这里允许真实 Playwright pointer event。

禁止通过测试直接调用内部清缓存函数。

28. R7/R8 — same-mode resize
Mobile
纯文本
899 child focused/open
→ 850

要求：

纯文本
child仍 focused
disclosures未因 resize 自动关闭
Desktop
纯文本
901 desktop child
→ 1200

要求：

纯文本
same desktop child remains focused

证明 repair没有把 generic resize变成迁移触发器。

29. R9 — stale destination fallback

Browser control可以在 disposable page上、仅为测试：

纯文本
focus mobile child
→ remove corresponding desktop target from DOM
→ 899 → 901

要求：

纯文本
brand focused
no exception

这是测试 fallback，不是修改产品fixture源码。

30. R10 — Escape cache correctness

真实 mobile：

纯文本
child
→ Escape
→ group summary
→ Escape
→ Menu summary
→ resize 901

期望：

纯文本
brand

不得：

纯文本
desktop guide child

从而证明旧 child identity没有残留。

31. No-JS focused regression

同一 governance control再使用：

纯文本
Chromium
Firefox

各自：

纯文本
javaScriptEnabled = false
390×844

实际 keyboard验证：

纯文本
Menu summary native activation
nested summary native activation
child anchor native navigation
content reachable

repair只改 JS，所以这里应完全不变。

WebKit no-JS不在这个 repair control 中重新解释；其 plain-Tab环境问题仍属于已接受但尚未实施的 policy proposal。

32. Focused browser control exact command

未来脚本使用当前已经安装的 tsx / Playwright，不新增 package script。

从 Starter目录：

Bash
cd Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE

PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH" \
node --import ./node_modules/tsx/dist/loader.mjs \
../../template/codex/executions/v2.7-ws06a/<repair-iteration>/live-resize-repair-control.ts

必须使用当前 existing fixture helper、自己的 preview PID lifecycle，并在结束确认：

纯文本
preview PID gone
fixture removed
fallback kill not needed
33. Full regression sequence

只有 focused unit + focused browser全部 PASS 后，未来实施轮才执行：

Bash
npm run check
npm run verify:unadopted-final
npm run verify:adopted-final
git diff --check

要求：

纯文本
root tests PASS
Astro clean
no skip

unadopted:
validate/build仍由 PP-02拒绝
meta verifier PASS

adopted:
validate/check/build = 0

package / lockfile必须 byte-identical。

34. Source变化后必须产生新的 browser evidence

因为修了产品源码，旧：

纯文本
36 PASS / 11 FAIL

只能保留为历史证据，不能当新 source验收。

所以未来 repair实施完成后必须另建 fresh evidence dir，再运行：

Bash
CORE_BROWSER_CONTRACT_MODE=FILE_SHA256 \
CORE_BROWSER_CONTRACT_PATH=../GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md \
CORE_BROWSER_EVIDENCE_DIR=<new repair evidence directory> \
npm run check:browser

注意：

matrix/runner仍不修改。

35. Full qualification 的预期解释

由于 WebKit policy只是：

纯文本
PROPOSAL_ACCEPTED_NOT_IMPLEMENTED

现行 runner仍会因为 WebKit profile/ArrowRight相关失败返回非零。

因此 repair实施轮不得要求 WS-06A overall变 PASS。

真正的 repair-specific exit criterion 是：

纯文本
live-resize Chromium row:
PASS

所有此前非-WebKit PASS rows:
不得回归

不得出现新的 failure类别

理论上如果唯一修复的是 live-resize，新的 raw count可能趋向：

纯文本
37 PASS / 10 FAIL

但这只是预期，不预先宣称。

任何实际不同结果都必须如实记录并独立审查。

原 36/11 文件永久保留，不覆盖。

36. 未来 repair 中明确禁止的做法

不得通过以下方式让 live-resize变绿：

纯文本
延长4秒timeout
增加sleep
修改runner assertion
删掉roundtrip
只测forward
programmatic focus补救测试
只在Playwright环境启用特殊逻辑
监听generic resize并强制focus
全局记住“最后一个nav link”永久不清
给BODY/tabindex打补丁
修改CSS breakpoint

也不允许顺手实施：

纯文本
WebKit policy
ArrowRight policy
Contract
matrix
runner
CI
SOP/Prompt
37. Future repair STOP criteria

实施阶段遇到任一立即停止：

纯文本
需要第3个product file

语义identity不足以解决race
必须改DesktopNav markup
必须改CSS

用户主动离开nav后仍被steal focus

same-mode resize改变focus/open state

Escape或native close留下stale child identity

missing/disconnected target导致throw
或focus hidden/disconnected element

same-document/ordinary navigation回归

no-JS native navigation回归

targeted real-browser任一R1-R10失败

新的browser regression出现

package/package-lock发生变化

Contract/matrix/runner/WebKit policy发生变化

不能继续扩大修复。

38. Future rollback

只针对两个 authorized product files。

实施前保存 exact preimages。

若 rollback：

纯文本
current hash == recorded repair postimage
→ restore exact repair preimage

新增 governance evidence只在 hash与本次生成值完全一致时删除。

禁止：

纯文本
git reset --hard
git checkout .
git clean -fd

因为 WS-01/02/06A 大量 accepted工作仍是 uncommitted。

39. iteration15 当前允许的 governance artifacts

如果后续让 Codex保存本 PLAN，iteration15 只能创建：

纯文本
template/codex/prompts/v2.7-ws06a/
└── iteration15-live-resize-core-repair-plan.md

template/codex/executions/v2.7-ws06a/iteration15/
├── LIVE_RESIZE_CORE_REPAIR_SPEC_V1.md
├── preflight.json
├── integrity-check.json
├── provenance.json
└── result.md

不得创建 repair script，更不得修改 source。

repair script只属于未来真正获得 source implementation authorization 的那一轮。

40. iteration15 PLAN acceptance criteria

本轮计划审查通过的条件是：

YAML
iteration15_plan:
  current_product_delta: 0
  authority_delta: 0

  frozen_qualification:
    pass: 36
    fail: 11

  repair_scope:
    future_product_files: 2

  design:
    preserves_nav_identity_before_mql: true
    semantic_identity_not_dom_reference: true

    deliberate_outside_focus_clears_identity: true
    pointer_outside_clears_identity: true

    responsive_body_focus_loss_preserves_identity: true
    same_mode_body_loss_clears_identity: true

    stale_target_safe: true
    fallback_bounded: true

    same_mode_resize_no_migration: true
    escape_semantics_preserved: true
    native_close_semantics_preserved: true
    ordinary_navigation_preserved: true
    same_document_focus_preserved: true
    no_js_preserved: true

  future_browser_checks:
    forward: required
    reverse: required
    roundtrip: required
    no_focus_theft: required
    same_mode: required
    stale_target: required
    escape_cache: required
    no_js: required

  forbidden:
    WebKit_policy_implementation: true
    ArrowRight_change: true
    Contract_change: true
    matrix_change: true
    runner_change: true
    capability_promotion: true
当前正式状态
纯文本
[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 15
WORKSTREAM: Live-Resize Core Repair PLAN ONLY

本计划只定义未来修复。当前没有 source execution 授权。

下一步应先对这份 PLAN15 做独立/人工审查；只有计划被接受后，才能单独授权下一轮真正修改上述两个 product files。
