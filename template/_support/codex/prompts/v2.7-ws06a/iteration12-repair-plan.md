ChatGPT 说：

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 12
WORKSTREAM: WS-06A — First Real Browser Failure Repair
VERDICT: CONTINUE — NARROW HARNESS + TWO JUSTIFIED CORE FIXES
WS-03 / WS-06B / WS-07 / WS-08 / A4 / commit / push / release: NOT AUTHORIZED

我已读实际 first-run evidence、完整 browser log、47-row JSON、cleanup audit、当前 runner/validator、Starter diff 和 iteration11 execution output。

这次不能把“47 FAIL”当成 47 个 Core bug。当前结论分三类：

问题	分类	本轮处理
.brand__mark selector	Harness defect	修
article h2 scope	Harness defect	修
no-JS Enter 后立即读 URL	Harness race	修
page.evaluate 内 nested helper → __name	Harness transpilation defect	修
skip link 强制 activeElement===main	错误 browser oracle	修为真实 sequential-focus proof
Astro preview daemon 泄漏	Harness cleanup defect	修
WebKit plain-Tab 不到 link	环境/engine 未决	诊断，不猜 flag、不改 OS
WebKit .table-scroll ArrowRight	未决	保持断言，继续实测
mobile detail document 764px overflow	真实 Core defect	授权一处 CSS fix
same-path mobile focus 被 reload 抹掉	真实 AX-01 defect	授权一处 MobileNav fix
live 899→901 focus timeout	未决	只修 harness timing/诊断，不授权 source fix
1. 原始失败证据冻结

以下全部保留，不覆盖：

纯文本
browser-evidence/
browser-run.log
preview-cleanup-audit.json
result.md 中 FIRST REAL FAIL 记录
execution_output id 25

特别保留：

纯文本
47 planned
47 executed
0 PASS
47 FAIL

以及错误的首次：

纯文本
cleanup.previewStopped = true

旁边已有真实 audit：

纯文本
PID 62582 remained alive
→ manually SIGTERM

新 run 必须另写：

纯文本
browser-evidence-rerun-1/
browser-run-rerun-1.log
preview-cleanup-audit-rerun-1.json
2. Product scope 从 15 精确扩为 19 files

原 WS-06A 的 15 files继续有效。

本 amendment 只新增 4 个允许发生 delta 的 Starter files：

纯文本
src/styles/global.css
src/components/navigation/MobileNav.astro
tests/navigation-behavior.test.ts
tests/navigation.test.ts

因此最大产品范围：

纯文本
原 15
+ 4 amendment
= 19 product files

除此之外任何第 20 个 product file：

纯文本
STOP

没有新的 SOP/Prompt 文件。

3. 在 source edit 前保存四个新 preimage

保存到：

纯文本
template/codex/executions/v2.7-ws06a/
preimages/iteration12-source-fix/

四个文件逐个保存：

纯文本
bytes
sha256
mode
symlink

并追加至：

纯文本
provenance.json
rollback-manifest.json

这些 preimage 是当前 iteration11 first-fail 时的实际字节，不是从 A3 重取。

仍禁止：

纯文本
git reset --hard
git checkout .
git clean
4. Core source fix #1 — mobile article overflow

首次真实数据：

纯文本
viewport 390:
document client = 390
document scroll = 764

.table-scroll:
tableWidth = 780
wrapperClient ≈ 748

而 621px case 没有同样的 document-overflow failure。

这与现有 CSS 完全吻合：

CSS
@media (max-width: 620px) {
  .article__layout {
    grid-template-columns: 1fr;
  }
}

Grid item .prose 仍保留默认：

纯文本
min-width: auto

所以其 min-content 被 780px table 撑开，进而撑开 1fr track。

唯一授权 source change

在现有：

CSS
.prose {

增加：

CSS
min-width: 0;

即：

CSS
.prose {
  min-width: 0;
  max-width: 750px;
  ...
}

不要改：

纯文本
.table-scroll overflow
table min-width:780px
article breakpoints
wiki single layout definition
shell width

预期真实行为应成为：

纯文本
document width <= viewport + 1px

.table-scroll.clientWidth < table rendered width
.table-scroll.scrollWidth > clientWidth
overflow-x = auto

table still 780px minimum

也就是说：

修的是 Grid item 不允许局部 overflow container 把整个 document 撑宽，不是把 table 缩小来伪造 PASS。

5. CSS regression test

在已经读取 global.css 的：

纯文本
tests/navigation.test.ts

增加一个静态防回归检查，例如：

纯文本
".prose" rule contains min-width: 0

只检查 shrink-safety contract。

不要在 unit test 里伪造 browser geometry；真实 geometry 仍由 47-row Playwright 证明。

6. Core source fix #2 — same-path focus restoration

当前真实代码流程：

纯文本
click mobile current-page link
→ close menu
→ focus brand/target
→ same pathname/search detected
→ BUT native link navigation still proceeds
→ page reload
→ focus lost

因此 A3 VM stub 能 PASS，真实浏览器失败是合理的。

授权的最小修复

只对精确 same-URL navigation阻止 native reload。

在已经确认 destination/current 同 origin/path/search 后增加类似：

TypeScript
if (destination.href === current.href) {
  event.preventDefault();
}

然后继续使用现有：

纯文本
target resolution
tabindex handling
target.focus()

不要阻止普通跨页 link。

不要把所有 link 都 SPA 化。

不要引入：

纯文本
router
history framework
new navigation abstraction
7. MobileNav regression tests

修改：

纯文本
tests/navigation-behavior.test.ts

保留现有：

纯文本
ordinary navigation
→ preventDefault NOT called

新增/强化：

纯文本
current exact URL link
→ preventDefault called
→ menu/nested state closed
→ focus lands on visible home/brand target

原 hash target focus测试继续存在，不删。

因此证明：

纯文本
cross-page link = native
exact same-page link = no reload, focus retained
8. Harness correction — logo target

当前 desktop assertion查：

纯文本
.brand__mark

但 adopted fixture有真实 logo时 Header渲染：

纯文本
.brand__logo

interactive target其实是：

纯文本
a.brand

所以 desktop 44px intent改为量：

纯文本
.brand

要求仍然：

纯文本
width >= 44
height >= 44
visible
focusable anchor

这不是放宽，而是从装饰 child 改为真实 interactive target。

9. Harness correction — article H2

当前：

纯文本
article h2 count === 1

会把：

纯文本
RelatedPages
Sources
其它 component headings

一起算进去。

改成：

纯文本
.prose h2 count === 1

并同时保留：

纯文本
article visible
.prose visible

证明的是 fixture 原始正文 single H2 没被 stress content替换。

10. Harness correction — no-JS navigation race

当前是：

纯文本
Enter
立即读取 page.url()

改成真实 navigation等待：

纯文本
Promise.all:
  waitForURL("/guides/getting-started/")
  keyboard Enter

成功后再验证：

纯文本
article/prose visible

不增加 sleep 型 magic delay。

11. Harness correction — __name

当前 page.evaluate() 内：

TypeScript
const css = (...) => ...
const columns = (...) => ...

经 tsx transform 后 serialized callback引用：

纯文本
__name

浏览器上下文里不存在它。

改为：

browser callback 内不定义 nested/local helper function。

直接取：

纯文本
getComputedStyle(...)
gridTemplateColumns

返回 string。

column count放回 Node side计算。

不能：

纯文本
把 __name 注入浏览器
在 window 上挂 helper
关闭 tsx transform
12. Skip-link oracle 修正，但不削弱“跳过导航”证明

Contract AX-02 要求：

纯文本
skip link

并没有要求一个原本不可 focus 的 <main> 必须成为：

纯文本
document.activeElement

不同 engine 对 fragment target native focus语义不同。

因此删除唯一错误条件：

纯文本
activeElement === main

替换成更接近真实用户路径的证明：

第一 Tab 聚焦 .skip-link；
machine-visible focus成立；
Enter；
URL hash变成 #main-content；
再按一次 Tab；
active element必须：
位于 #main-content 内，或
在 main 后的 footer/recovery区域；
active element不得：
回到 skip link；
落在 .site-header / primary nav。

这实际证明：

keyboard sequential navigation 已经越过重复 Header。

不是只证明 hash改变。

WebKit如果第一步 plain Tab 都不能到 link，则仍失败，不豁免。

13. WebKit plain-Tab：只诊断，绝不猜配置

在真实 matrix前，对每个 engine做一个极小 native keyboard probe：

XML
<a href="#x">link</a>
<button>button</button>
<input>

只使用：

纯文本
Tab
Shift+Tab

记录实际 focus sequence。

不得使用：

纯文本
Alt+Tab
Option+Tab
browser flag
defaults write
macOS setting修改
系统辅助功能修改

如果 WebKit probe证明：

纯文本
plain Tab never reaches <a>
while focus traversal itself works

则记录：

纯文本
WEBKIT_STANDARD_TAB_LINK_PROFILE_UNAVAILABLE

matrix照常执行、保持失败。

WS-06A STOP。

不要为了绿色把 WebKit row 改成：

纯文本
N/A
skip
programmatic focus
modifier key substitute
14. WebKit table ArrowRight：保持原断言

目前 768/1280 WebKit出现：

纯文本
table wrapper geometry valid
but ArrowRight scroll timeout

这一条暂时不修改 assertion、不加 source handler。

重跑后若仍发生：

记录 wrapper是否 activeElement；
记录 before/after scrollLeft；
记录 overflow geometry；
记录 key event实际到达。

仍无 browser-native scroll：

纯文本
STOP

不要为了测试：

纯文本
scrollLeft += 100
element.scrollTo()
添加 production keydown handler

后两者需要新的独立判断，不在当前 amendment 自动授权。

15. Live resize：先修 timing observation，不修 source

当前：

纯文本
setViewportSize(901)
→ 直接等 activeElement匹配
→ timeout

改为按实际状态顺序等待：

纯文本
setViewportSize 901
↓
wait matchMedia("(max-width:900px)").matches == false
↓
wait .desktop-nav visible
↓
inspect activeElement/pageId

再验证现有 source要求：

纯文本
nested mobile details closed
matching desktop pageId focused

反向：

纯文本
setViewportSize 899
↓
wait media query true
↓
wait mobile nav visible
↓
verify Menu trigger focus

如果 CSS/MQ已切换但 focus仍错误：

纯文本
REAL CORE FAILURE
→ STOP

本 amendment 不授权进一步修改 MobileNav resize code。

16. Preview daemon cleanup 必须重新设计

首次 runner 的最大证据错误不是“daemon存在”，而是：

纯文本
runner report said previewStopped=true
while PID62582 still alive

这个不能再次发生。

使用 Astro 自己已经实际显示的正式 CLI lifecycle

preview-help.log明确存在：

纯文本
astro preview --background
astro preview stop
astro preview status

因此新 runner：

start

显式：

纯文本
npm run preview -- --background --host 127.0.0.1 --port <port>

不再依赖 agent自动判断前台/后台。

解析实际输出中的：

纯文本
pid <N>

若无法取得 own PID：

纯文本
FAIL
cleanup

在同一个 disposable fixture cwd执行：

纯文本
npm run preview -- stop

然后验证：

纯文本
process.kill(pid, 0)
→ ESRCH

才允许：

纯文本
cleanup.previewStopped = true
defensive cleanup

如果 astro preview stop不能清理：

记录 infrastructure failure；
只对刚才解析出的 own PID发送 SIGTERM；
验证消失；
必要时 own PID SIGKILL。

即使最终清干净：

纯文本
overall = FAIL

因为标准 cleanup path已经失败。

绝不：

纯文本
pkill astro
killall node
stop unknown existing preview
17. Cleanup证据不能再靠自我声明

现有 schema可继续用：

纯文本
previewStopped
fixtureRemoved

但 previewStopped=true 的唯一设置条件改成：

纯文本
exact parsed task PID confirmed gone

新 governance audit另存：

纯文本
preview-cleanup-audit-rerun-1.json

包含：

纯文本
startedPid
astroStopExit
pidAliveBeforeStop
pidAliveAfterStop
fallbackSignalUsed
fixtureRemoved

若 fallback signal used：

纯文本
browser Gate = FAIL

即使没有进程泄漏。

18. core-browser-evidence.test.ts

继续使用现有 27 个 validator tests，并增加必要 regression：

纯文本
previewStopped=false → reject

若 runner cleanup schema本身没新增字段，不需要大改 schema。

Contract mode：

纯文本
FILE_SHA256 / PINNED_REFERENCE

保持原设计和已有 tests，不重新打开。

19. Scope checker / provenance更新

check_ws06a.py 属治理 artifact，可以修改。

将授权 Starter scope增加四项：

纯文本
src/styles/global.css
src/components/navigation/MobileNav.astro
tests/navigation-behavior.test.ts
tests/navigation.test.ts

并把原先不再真实的文本：

纯文本
accepted untouched source

改为：

纯文本
frozen sources/reference projects protected;
only explicitly authorized WS06A Starter Core fixes changed

仍要求：

纯文本
743 protected files unchanged
frozen triad unchanged
canonical Contract unchanged
dependency delta仍只有 playwright/playwright-core
20. 修改后执行顺序
A. Targeted unit/static

先：

纯文本
npm exec -- vitest run \
  tests/navigation-behavior.test.ts \
  tests/navigation.test.ts \
  tests/core-browser-evidence.test.ts

必须 PASS。

B. Full root regression
纯文本
npm run check

要求：

纯文本
>=45 files
>=696 tests
0 skip
Astro 0 errors/warnings/hints

实际新增 test数以真实结果为准，不提前编造。

C. WS-02 gates

重新：

纯文本
npm run verify:unadopted-final
npm run verify:adopted-final

仍必须：

纯文本
unadopted = PP-02 rejection
adopted validate/check/build = PASS
D. Contract negative preflight

保留：

纯文本
invalid mode → FAIL
missing FILE_SHA256 Contract → FAIL
wrong hash → FAIL
E. New real browser run

使用新目录：

纯文本
CORE_BROWSER_CONTRACT_MODE=FILE_SHA256
CORE_BROWSER_CONTRACT_PATH=<actual accepted SOP Contract>
CORE_BROWSER_EVIDENCE_DIR=<.../browser-evidence-rerun-1>
npm run check:browser

47 matrix一行不删、一行不 skip。

21. Rerun后的判定规则
允许进入独立 review

只有：

纯文本
47 executed
47 PASS
0 FAIL
0 NOT_RUN

preview exact PID gone
fixture removed

root/adoption gates PASS
scope audit PASS
必须再次 STOP

以下任意出现：

纯文本
WebKit plain Tab cannot reach links
WebKit required table ArrowRight still fails
live resize after MQ/CSS settle仍 focus错误

document overflow仍 >1px
same-path focus仍丢失

preview own PID仍泄漏
cleanup requires fallback SIGTERM/SIGKILL

任何新 browser defect要求第三处 source修复

不得继续“顺手修”。

22. 明确没有授权的 source变化

除了：

纯文本
src/styles/global.css
  → .prose min-width:0 only

src/components/navigation/MobileNav.astro
  → exact same-URL native reload suppression only

不授权任何其它：

纯文本
src/**

变化。

尤其没有授权：

纯文本
resize controller rewrite
table keyboard handler
skip-link JS controller
WebKit special code
browser-specific CSS
raw table adapter
23. Rollback

Iteration12 的四个 extra files使用新的 exact preimages。

若 source repair被拒：

纯文本
current hash == iteration12 recorded postimage
→ restore iteration12 preimage

不能回退整个 WS-06A，因为还会误删已经接受的：

纯文本
playwright dependency
matrix
validator
CI Contract-input设计
SOP/Prompt sync

除非以后另有明确 whole-WS06A rollback决定。

当前正式边界
YAML
WS06A_ITERATION12:
  first_real_run:
    retained: true
    result: 47_FAIL

  harness_repairs:
    authorized: true

  source_repairs:
    global_css_prose_min_width_0: AUTHORIZED
    mobile_exact_same_url_reload_suppression: AUTHORIZED
    any_other_src_change: FORBIDDEN

  unresolved:
    webkit_plain_tab: MUST_DIAGNOSE
    webkit_table_keyboard_scroll: MUST_DIAGNOSE
    live_resize_focus: MUST_DIAGNOSE

  product_scope:
    previous: 15
    added_exact_files: 4
    maximum: 19

  matrix:
    rows: 47
    weakened: false
    skipped: forbidden

  WS03: NOT_STARTED
  WS06B: NOT_STARTED
  A4: NOT_RESUMED
  commit_push_release: NONE

Codex 可以按这个 revised PLAN 执行 iteration12。遇到三个 unresolved 项中的任何真实失败，必须再次 STOP，而不是继续扩 source scope。
