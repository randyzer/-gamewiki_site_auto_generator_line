ChatGPT 说：

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 13
WORKSTREAM: WS-06A — Remaining Blocker Diagnosis
VERDICT: DIAGNOSIS AUTHORIZED
PRODUCT_SOURCE_CHANGES: 0
QUALIFICATION_MATRIX_CHANGES: 0
CAPABILITY_PROMOTION: FORBIDDEN

我已重新读取 iteration12 review、当前 runner、MobileNav / DesktopNav、47-row matrix、rerun evidence、WebKit native probe，以及 Contract 中 AX-01 / AX-02 / AX-03 的实际语义。

这轮的目标不是把 36 PASS / 11 FAIL 改成绿色，而是回答三个问题：

纯文本
A. WebKit plain-Tab failure：
   Core defect / harness defect / 当前 engine-host keyboard profile？

B. WebKit ArrowRight failure：
   Core scroll implementation defect / harness defect / WebKit native scroll behavior？

C. Chromium live-resize timeout：
   到底卡在 MQ、visibility、forward focus migration 还是 reverse migration？

结论出来以前：

纯文本
WS-06A = BLOCKED

保持不变。

1. iteration13 不修改任何 product file

当前 19 个 WS-06A product files全部冻结。

必须先验证当前 Starter仍绑定 iteration12：

纯文本
branch = v2.7/evolution
HEAD   = b067e8d4050478072f25a1dc78a8526cdd128cfd

browser-evidence source manifest =
796b1a6e39ca2df4141e4e65ea4cf2fc70c9d510d3018fef38c3fd60612cfed8

同时核对：

纯文本
47-row matrix unchanged
canonical Contract SHA unchanged
playwright = 1.63.0
no new dependency
19 product hashes == iteration12 accepted diagnostic state

若不匹配：

纯文本
STOP

本轮明确禁止修改：

纯文本
Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/**
Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/**
Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE/**

包括当前 runner 本身也不改。

2. 只允许 governance-local diagnostic artifacts

创建：

纯文本
template/codex/prompts/v2.7-ws06a/
  iteration13-diagnostic-plan.md

template/codex/executions/v2.7-ws06a/iteration13/
  diagnose-ws06a.ts
  preflight.json
  diagnostic.log

  native-focus-profile.json
  table-arrowright-profile.json
  resize-forward-trace.json
  resize-reverse-trace.json
  resize-roundtrip-trace.json

  preview-cleanup-audit.json
  classification.json
  result.md
  provenance.json

允许失败截图仅限诊断确有帮助时写入：

纯文本
iteration13/screenshots/

这些都是 governance/evidence，不计入 product delta。

因此本轮退出时必须满足：

纯文本
product changed files = 0
3. Diagnostic runner只能使用当前已安装工具

不安装任何东西。

使用当前 Starter 的：

纯文本
Node 22.22.0
playwright 1.63.0

Chromium 153.0.8010.12 / rev1243
Firefox  155.0          / rev1543
WebKit   26.6           / rev2359

governance-local script可通过 Starter实际路径加载当前 node_modules/playwright 和现有：

纯文本
tests/helpers/core-build-fixture.ts

来创建 disposable Field Notes fixture。

禁止：

纯文本
npm install
playwright install
browser flags
Safari/system browser
alternative WebKit build
OS settings
defaults write
Option/Alt Tab substitution
4. Experiment A — WebKit plain-Tab native profile

这一步必须先脱离 Game Site Core。

创建一个最小 native HTML page，只包含：

XML
<a href="#target">link</a>
<button>button</button>
<input aria-label="input">
<div tabindex="0">tabindex region</div>
<details>
  <summary>summary</summary>
  <a href="#nested">nested link</a>
</details>

不加载：

纯文本
Starter CSS
Starter JS
framework
focus polyfill

对 Chromium / Firefox / WebKit 分别记录连续：

纯文本
12 × Tab
6 × Shift+Tab

每一步保存：

纯文本
key
active tag
id
href
text
tabIndex
focus-visible state

同时记录所有控件：

纯文本
DOM tabIndex
disabled
bounding rect
visibility
Diagnostic-only control

允许额外调用一次：

纯文本
element.focus()

分别验证 link/button 是否可以获得 focus。

这个动作只能用于分类 browser profile，不能用于 qualification PASS。

5. Experiment A2 — 同一 WebKit profile 对照实际 Core

使用 disposable adopted fixture 的：

纯文本
/

分别在：

纯文本
390×844
1280×800

执行普通 Tab序列，记录：

纯文本
skip link
mobile summary
mobile child link
desktop parent/child link
footer link

不要调用现有 focusByTab() 来生成分类结论；直接记录 raw activeElement sequence。

分类规则冻结
Evidence	Classification
Minimal native WebKit也跳过普通 links，而 Chromium/Firefox正常；links DOM focusable且 focus() 可成功；Core表现相同	ENGINE_HOST_KEYBOARD_PROFILE
Minimal WebKit可以 plain-Tab 到 link，但 Core不能	CORE
Raw sequence实际到达 target，但现有 harness报告 unreachable	HARNESS
结果不一致/不足	INCONCLUSIVE

不得产生：

纯文本
PASS
NOT_APPLICABLE
EXCEPTION

这只是诊断分类。

6. WebKit plain-Tab 的规范边界也要记录

Contract的实际语义是：

纯文本
AX-01:
mobile nav keyboard operation / Escape / focus restore

AX-02:
skip link / visible focus / reduced motion / tap targets

AX-03:
Core routes pass overflow and keyboard-path checks
at supported breakpoints

Contract本身没有规定：

纯文本
Playwright WebKit on every host must expose ordinary links to plain Tab

但当前 WS-06A frozen matrix/oracle确实这样测试。

iteration13 只记录这一事实差异：

纯文本
Contract requirement
vs
current WS-06A verification oracle

不修改 oracle。

7. Experiment B — ArrowRight：先测最小 native scroll container

还是脱离 Core。

最小 HTML：

XML
<div
  id="scroll"
  tabindex="0"
  style="width:320px;overflow-x:auto"
>
  <table style="min-width:780px">
    ...
  </table>
</div>

对三个 engine 都执行完全相同流程：

纯文本
1. plain Tab 聚焦 #scroll
2. confirm activeElement == #scroll
3. record:
   clientWidth
   scrollWidth
   scrollLeft
4. attach keydown observer
5. press ArrowRight
6. sample scrollLeft:
   immediately
   next animation frame
   ~50ms
   ~200ms
   ~500ms
7. record received key

这里的时间采样是诊断观察，不是新的 qualification timeout/oracle。

随后允许 diagnostic-only：

纯文本
scroll.scrollLeft = 32

只用于回答：

WebKit geometry是否实际可滚动？

再 reset 到 0。

不能把程序化滚动当 PASS。

8. Experiment B2 — 对照真实 Core .table-scroll

创建一次 disposable Field Notes final fixture，并使用与当前 WS-06A相同的：

纯文本
.table-scroll
table min-width:780px

stress content。

对 /guides/getting-started/ 的 actual .table-scroll 重复完全相同的观测：

纯文本
activeElement
keydown ArrowRight received
wrapper clientWidth
wrapper scrollWidth
table rendered width
document width
scrollLeft timeline
programmatic diagnostic scroll capability

不得修改 CSS。

ArrowRight 分类规则
Evidence	Classification
WebKit minimal native container和Core都收到 ArrowRight但不 native-scroll；Chromium/Firefox二者都会；WebKit programmatic scroll有效	ENGINE_NATIVE_SCROLL_PROFILE
WebKit minimal native container ArrowRight会滚，但Core不会	CORE
Core实际 scrollLeft改变，但qualification harness没观察到	HARNESS
Minimal与Core结果混杂	INCONCLUSIVE

还要在 classification.json 中明确一项：

纯文本
is_arrowright_behavior_portable_core_property:
  true / false / unresolved

但不修改现有 table-local-scroll oracle。

9. Experiment C — Chromium live-resize要拆成三个实验

当前 generic：

纯文本
page.waitForFunction timeout

信息不足。

iteration13 必须把 resize拆成：

纯文本
C1 forward only: 899 → 901
C2 reverse only: 901 → 899
C3 exact roundtrip: 899 → 901 → 899

使用真实 Chromium和真实 disposable Core。

10. Resize tracing基础设施

在页面开始交互前挂 diagnostic-only observers：

纯文本
window resize
matchMedia("(max-width:900px)") change
focusin
focusout
toggle on mobile details

每一事件记录：

纯文本
performance timestamp

viewport:
  innerWidth
  innerHeight

mql:
  matches

mobile:
  visible
  outerOpen
  nestedOpen

desktop:
  visible

activeElement:
  tag
  class
  href
  text
  data-nav-page-id
  closest mobile/desktop/brand

matching target:
  expected pageId
  exists
  visible
  rect
  computed display
  computed visibility

另外在每次 setViewportSize() 后记录明确 checkpoint：

纯文本
SET_VIEWPORT_RETURNED
RAF_1
RAF_2
MQL_EXPECTED_STATE
NAV_VISIBILITY_SETTLED
FINAL_FOCUS_STATE

不要只留下 timeout字符串。

11. C1 — forward 899 → 901

严格复现现有行为：

纯文本
899
↓
open outer mobile disclosure
↓
open nested group
↓
keyboard focus actual child
↓
record child pageId
↓
set viewport 901

然后分别回答：

纯文本
F1: mql 是否变 false？
F2: desktop-nav 是否变 visible？
F3: mobile-nav 是否变 hidden？
F4: mobile outer/nested 是否关闭？
F5: matching desktop data-nav-page-id 是否存在？
F6: matching target在 settle 后是否可见？
F7: 最终 focus 到哪里？

如果 F1–F6均正确，但 F7落在：

纯文本
brand / body / hidden mobile target / wrong desktop target

则这是 forward Core focus-migration failure的强证据。

但 iteration13仍不修。

12. C2 — reverse 901 → 899

必须使用新的 page/context，不能依赖 C1是否成功。

在 901：

纯文本
keyboard Tab
→ actual matching desktop child

确认是真实 keyboard focus，不用 locator.focus()。

然后：

纯文本
901 → 899

记录：

纯文本
R1: mql true
R2: mobile visible
R3: desktop hidden
R4: activeElement 是否变 mobile Menu summary

这样 forward坏掉也不会遮蔽 reverse行为。

13. C3 — roundtrip

最后再完整执行冻结的 qualification路径：

纯文本
899 mobile child
→ 901 expected desktop child
→ 899 expected mobile Menu

但这一轮只生成详细 trace，不改变原 47-row evidence。

如果 forward已经失败，roundtrip继续记录能记录的状态，但不能人为 focus desktop child帮助它通过。

14. Resize分类规则
Evidence	Classification
MQL / visibility未按 setViewportSize变化，且最小 MQL page也复现	ENGINE_OR_HARNESS_ENVIRONMENT
MQL/visibility正确，matching target存在且可见，但 MobileNav listener结束后 focus错误	CORE_FOCUS_MIGRATION
C1和C2独立都正确，而旧 qualification仍 timeout	HARNESS
只有 forward失败	CORE_FORWARD_FOCUS_MIGRATION
只有 reverse失败	CORE_REVERSE_FOCUS_MIGRATION
trace无法唯一定位	INCONCLUSIVE

如需要判断第一行，允许同一诊断脚本创建一个只有：

纯文本
matchMedia("(max-width:900px)")

的最小空页做 899→901→899 probe。

不加 browser flag。

15. iteration13 不重跑47 qualification matrix

当前资格证据仍冻结为：

纯文本
47 executed
36 PASS
11 FAIL

本轮不应创建：

纯文本
37/10
46/1
47/0

这种新的 qualification数字。

原因是 iteration13没有授权改变产品或 oracle；它只是在解释为什么11行失败。

因此：

纯文本
npm run check:browser

本轮不要重新执行。

16. Disposable fixture / preview lifecycle

C2/Core table与resize可共享同一个 disposable adopted final build和preview，只要：

纯文本
source manifest
dist hash

整个诊断期间保持不变。

必须继续使用 iteration12已经验证过的 own-PID lifecycle：

纯文本
astro preview --background
capture own PID
...
astro preview stop
verify own PID gone

输出：

纯文本
iteration13/preview-cleanup-audit.json

若：

纯文本
fallbackSignalUsed = true

诊断基础设施标记：

纯文本
INFRASTRUCTURE_FAIL

但不得因此修改产品。

17. classification.json 固定结构

最终至少：

YAML
webkit_plain_tab:
  classification: ENGINE_HOST_KEYBOARD_PROFILE | CORE | HARNESS | INCONCLUSIVE
  minimal_native_evidence:
  core_evidence:
  qualification_oracle_changed: false

webkit_arrowright:
  classification: ENGINE_NATIVE_SCROLL_PROFILE | CORE | HARNESS | INCONCLUSIVE
  minimal_native_evidence:
  core_evidence:
  portable_core_property: true | false | unresolved
  qualification_oracle_changed: false

chromium_live_resize:
  classification: CORE_FORWARD_FOCUS_MIGRATION | CORE_REVERSE_FOCUS_MIGRATION | CORE_FOCUS_MIGRATION | HARNESS | ENGINE_OR_HARNESS_ENVIRONMENT | INCONCLUSIVE
  forward:
  reverse:
  roundtrip:
  source_changed: false

不要使用 Contract §W 的：

纯文本
PASS / FAIL / NOT_APPLICABLE / EXCEPTION

作为这些诊断分类值。

18. Evidence integrity

provenance.json 必须记录：

纯文本
Starter branch / HEAD
pre diagnostic 19-file hash manifest
post diagnostic 19-file hash manifest

pre == post

canonical Contract SHA
matrix SHA
runner SHA
MobileNav SHA
global.css SHA

Playwright package
3 engine versions/revisions

diagnostic script SHA
all JSON evidence SHA

最终必须证明：

纯文本
productDelta = NONE
contractDelta = NONE
matrixDelta = NONE
runnerDelta = NONE
19. STOP criteria

出现下列任一情况立即停止，不继续扩大实验：

纯文本
any product file changes
dependency/lockfile changes
Contract or matrix changes

requires browser flag
requires OS setting
requires Safari/system browser
requires alternative Playwright version

needs source patch to complete diagnosis
needs qualification oracle edit

preview process cannot be safely bound/cleaned

diagnostic evidence contradicts itself
or cannot classify with specified experiment

如果最终是：

纯文本
INCONCLUSIVE

也属于有效 iteration13结果。

不要为了得到确定答案扩大实验面。

20. iteration13 Exit

Codex执行后停止，并返回：

纯文本
[C2C]
STATE: EXECUTED
TASK_ID: c2c_a765
ITERATION: 13
WORKSTREAM: WS-06A DIAGNOSIS

必须附：

纯文本
PRODUCT_DELTA: 0
QUALIFICATION_MATRIX: still 36 PASS / 11 FAIL

以及三个分类，不得写 WS-06A ACCEPT。

我随后会独立读取 raw probe/trace，而不是只看 classification.json，再判断三个 blocker分别属于：

纯文本
environment/engine
harness
Core

以及下一步究竟应该是：

纯文本
调整 verification policy
修 Core
修 harness
或保持 BLOCKED

Codex 现在可以执行 PLAN13。没有 source repair、qualification gate修改或 capability promotion授权。
