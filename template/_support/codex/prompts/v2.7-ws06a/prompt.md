ChatGPT 说：

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 11
WORKSTREAM: WS-06A — Core Browser / Evidence Foundation
PLAN_STATUS: AUTHORIZED FOR CODEX EXECUTION
EXECUTOR: Codex
INDEPENDENT_REVIEWER: ChatGPT

WS-02 已 ACCEPT 并关闭。本轮只建立 Core 浏览器证据基础，不进入 WS-03、WS-06B、WS-07、WS-08，不恢复旧 A4，不 commit/push/tag/merge/release。

我已经通过当前 Codex with ChatGPT · hot_words_web 连接重新读取了：

template/PROJECT_STATE.md
accepted Roadmap 的 WS-06
WS-02 result.md / verification.md / provenance.json
当前 Starter/SOP/Prompt 实际文件
A3 的 MobileNav / DesktopNav / BaseLayout / 404 / article / CSS breakpoint 实现
历史暂停 A4 的 dependency patch 与 incomplete coverage.test.ts

有一个重要状态前提：

Starter 现在不是 CLEAN A3。

正确当前状态是：

纯文本
branch = v2.7/evolution
HEAD   = b067e8d4050478072f25a1dc78a8526cdd128cfd
working tree = accepted WS-02 uncommitted delta

所以 WS-06A 必须叠加在 accepted WS-02 working tree 上。不得要求回退 A3、不得 reset、不得用 clean-tree 假设覆盖 WS-02。

1. Preflight：先绑定 WS-02 ACCEPT 的真实字节

Codex 修改任何文件前，必须读取：

纯文本
template/codex/executions/v2.7-ws02/provenance.json
template/codex/executions/v2.7-ws02/verification.md

并重新计算实际文件 hash。

Starter 必须满足
纯文本
branch = v2.7/evolution
HEAD   = b067e8d4050478072f25a1dc78a8526cdd128cfd
tree   = 1df0ade30b1eaf51a76820c8d8b83337786f0dc1

但：

纯文本
working tree != CLEAN

这是预期状态。

必须验证 全部 12 个 WS-02 Starter product delta 与 WS-02 ACCEPT provenance 完全一致，而不是只检查本轮准备修改的文件。

本轮会再次修改的现有 Starter 文件，其 WS-06A preimage 至少固定为：

文件	WS-02 ACCEPT SHA-256
.github/workflows/ci.yml	5b7b83296c98ab25efbd4fbd2b27921a2e2deb18abac4edc84bdf0500caa5e7a
.gitignore	0d540003eb586be1729bca6dbbada59313c66cd9ca98501966caf331c8780dc3
README.md	d44448d5bbad9d526837b2103a31555c00a49128424c02a67159e11503bcd409
docs/QA_CHECKLIST.md	1ac6315defd76dbead98e82a0b93787dac80b94d8b493d950494e4de4cc0e2d2
package.json	a22896f1b2aa492be67026cf7da434759505086a1c580ed8f22e112635699847
package-lock.json	d3e015461e4bcba8419cd6d262d5842efeca3495851c3c677f52b4069df989c5

还要固定两个本轮 runner 依赖的 WS-02 输入：

纯文本
scripts/verify-adoption.ts
SHA256 = 1eb6e1021f29cf4396d4c1b59db4d0420eb6d678520e4863c54abb4c723da77e

tests/helpers/core-build-fixture.ts
SHA256 = c3129956ef8915f658cb3c10329b65e11b08e39dcfc5d798b08cb6685f5bbdb6

如果任何 accepted WS-02 product byte 不匹配：

纯文本
STOP

不得判断“差不多一样”。

2. SOP / Prompt 也必须从当前 ACCEPT working tree 继续

这些 repo 同样含未提交的 WS-01 + WS-02 成果。

本轮会再次修改的文件 preimage：

文件	当前 accepted SHA-256
GAME_SOP_V2.7_CANDIDATE/docs/NEW_GAME_SITE_SOP_v2.7.md	756071ee2dbaaf3425b2b44aa6ab71645ce3bbacf0b4a1a190e8dfc47a87968f
GAME_SOP_V2.7_CANDIDATE/docs/QA_CHECKLIST.md	2f476fe6f24ec212df7e09d49ba5e35f1ed284aa7f3563b6977e1e9761adad63
GAME_SOP_V2.7_CANDIDATE/docs/EXECUTION_PROMPT.md	dc7f149485298c5712c449ef41543b0a632ec64ec58e526feb99e1757bbc6784
GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE/CodexMasterPrompt_v2.7Candidate.md	1927454758171b08884dfb2217637938dc03953d87c0e259f9335962f91405db

Canonical Contract 必须继续：

纯文本
SHA256 =
1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c

不允许修改 Contract、41 Registry、CONTRACT_REFERENCE.json。

3. 先保存 WS-06A 自己的 preimages

在 product edits 前建立：

纯文本
template/codex/executions/v2.7-ws06a/preimages/

保存本轮准备修改的所有现有文件：

纯文本
Starter:
  package.json
  package-lock.json
  .github/workflows/ci.yml
  .gitignore
  README.md
  docs/QA_CHECKLIST.md

SOP:
  docs/NEW_GAME_SITE_SOP_v2.7.md
  docs/QA_CHECKLIST.md
  docs/EXECUTION_PROMPT.md

Prompt:
  CodexMasterPrompt_v2.7Candidate.md

必须保存：

纯文本
bytes
sha256
mode
symlink status

不能继续依赖 A3 Git preimage，因为其中多个文件已经包含 ACCEPT 的 WS-02 增量。

4. 浏览器依赖：重新设计，不恢复旧 A4

旧暂停 A4 曾经添加：

纯文本
@playwright/test 1.63.0

但那套 A4：

纯文本
tests/core-browser/coverage.test.ts
→ import "./matrix"
→ matrix 不存在
→ 0 tests / RED

仍然只是历史失败输入。

WS-06A 不复制旧 A4

这次采用更小的依赖：

纯文本
playwright = 1.63.0

而不是 @playwright/test。

原因：

实际需求是一个确定性的 browser evidence runner；
单元/负例契约继续使用现有 Vitest；
不需要额外 Playwright Test runner abstraction；
直接依赖 playwright 更小且职责更清楚。

旧 A4 只提供一个已经实际解析过的 1.63.0 版本证据；旧测试代码不恢复。

执行：

Bash
npm install --save-dev --save-exact playwright@1.63.0

安装后必须是：

纯文本
package.json:
  devDependencies.playwright = "1.63.0"

package-lock 只允许新增：

纯文本
root devDependency:
  playwright: 1.63.0

node_modules/playwright:
  version 1.63.0

node_modules/playwright-core:
  version 1.63.0

不得新增：

纯文本
@playwright/test
@vitest/browser-playwright
webdriverio
puppeteer
browser SaaS dependency

不得发生任何其它依赖版本变化。

旧归档已记录的 1.63.0 lock metadata可作为 sanity check：

纯文本
playwright integrity:
sha512-+7ziBLidS4NaNCdt57SUDT+wYmmd5fmiQejUic/kb+YsYSCPyOOE9sebzMjNmQrsnNpDJqd4WHvV/8lfKfUDUg==

playwright-core integrity:
sha512-rYCsBF/M5HjUch52bbtVONEFjv6Xu8sm8h72dNlR5bzIE1fvC/bxgspzkjSfU+MweEMmPM8KJebG6nnyxo5mCg==

如果 npm 产生额外 unrelated lock churn：

纯文本
STOP

不要人工“整理”整个 lockfile。

5. Browser binaries 是开发工具，不进入 runtime

本地安装：

Bash
npm exec -- playwright install chromium firefox webkit

CI 使用：

Bash
npm exec -- playwright install --with-deps chromium firefox webkit

Runner 必须真实 launch：

纯文本
Chromium
Firefox
WebKit

因此浏览器缺失不会被静默跳过。

安装/launch 失败时：

纯文本
caseStatus = NOT_RUN
overall = FAIL

并停止 WS-06A exit。

不得降级到：

纯文本
只跑 Chromium
只跑系统 Safari
只跑 jsdom

浏览器缓存属于开发环境，不进入 repo，不自动删除共享 cache。

6. Starter 精确 product file scope

本 PLAN 首轮只允许以下 11 个 Starter product files。

MODIFY — 6
纯文本
package.json
package-lock.json
.github/workflows/ci.yml
.gitignore
README.md
docs/QA_CHECKLIST.md
ADD — 5
纯文本
docs/CORE_BROWSER_EVIDENCE.md

scripts/core-browser-matrix.ts
scripts/core-browser-evidence.ts
scripts/run-core-browser-evidence.ts

tests/core-browser-evidence.test.ts

明确不修改：

纯文本
src/**
game.config.ts
src/data/page-inventory.json
tests/helpers/core-build-fixture.ts
scripts/verify-adoption.ts
build-site.ts
validate-site.ts
audit-build.ts
core-safety-sentinels.ts

也不创建：

纯文本
playwright.config.ts
tests/core-browser/coverage.test.ts
tests/core-browser/matrix.ts

避免恢复旧 A4 形态。

如果真实 browser run 暴露必须修改 src/** 才能 PASS：

立即 STOP。

本 PLAN 不预授权“顺手修 CSS/JS”。

7. 新命令只增加一个

package.json 增加：

JSON
"check:browser": "tsx scripts/run-core-browser-evidence.ts"

现有命令全部保持：

纯文本
check
build
build:evidence
verify:unadopted-final
verify:adopted-final

不修改其语义。

8. Browser fixture：继续复用 WS-02 adopted Core

WS-06A runner 直接复用已经 ACCEPT 的：

纯文本
createFullProjectFixture(true)

即 Field Notes synthetic adoption。

这是：

纯文本
disposable test copy

不是第二个 Core implementation。

Runner 对该临时 fixture 只增加一个 browser stress-content mutation：

纯文本
guide.getting-started

追加一张故意很宽的测试 table：

纯文本
data-browser-wide-table
min-width > article prose width

目的只用于真实验证：

纯文本
document 不横向溢出
长表必须在局部容器内滚动

不得给这张 table 自己加：

纯文本
overflow-x:auto

否则等于伪造 PASS。

如果现有 Core 无法局部处理长表：

纯文本
browser evidence FAIL
→ STOP

这正是 WS-06A 应发现的问题。

临时 stress content 不写回 canonical Starter。

9. 一次 final adopted build，所有浏览器共享

Runner 流程：

纯文本
accepted current Starter
      ↓
createFullProjectFixture(true)
      ↓
browser-only stress content
      ↓
npm run build
      ↓
verify:
  evidence marker absent
  privacy absent
  terms absent
      ↓
npm run preview -- --host 127.0.0.1 --port <ephemeral>
      ↓
47-case browser matrix

端口必须动态获取，不能写死一个易冲突端口。

Server readiness：

纯文本
HTTP /
→ expected 200

超时 / spawn error / early exit：

纯文本
FAIL CLOSED

所有 47 rows 必须绑定到同一个 fixture build。

10. WS-06A 正式冻结为 47 行矩阵

accepted Roadmap 给出的类别与暂停 A4 原计划的历史计数是一致的。

但当前实现重新定义，不复制旧代码。

A. Baseline — 27
纯文本
3 engines
×
3 viewports
×
3 Core roles
=
27

Engines：

纯文本
chromium
firefox
webkit

Base viewports：

纯文本
390 × 844
768 × 1024
1280 × 800

Core roles：

Role	URL
shell-nav	/
content-detail	/guides/getting-started/
recovery-404	/__ws06a_missing_route__/

404 必须验证真实 HTTP response：

纯文本
status = 404

不能只访问 /404.html 然后声称 true 404 已证明。

B. No-JS mobile — 3
纯文本
chromium 390×844
firefox 390×844
webkit  390×844

Role：

纯文本
shell-nav

javaScriptEnabled=false

必须证明 native <details>/<summary> 导航仍可使用、内容仍可达、页面不横向溢出。

C. Boundary — 12
Navigation boundary — 3

Chromium：

纯文本
899 × 800
900 × 800
901 × 800

Role：

纯文本
shell-nav

期望：

纯文本
899 → mobile
900 → mobile
901 → desktop

与实际 CSS：

纯文本
@media (max-width: 900px)

以及 MobileNav：

纯文本
matchMedia("(max-width: 900px)")

完全对应。

Layout boundary — 9

Chromium：

纯文本
619 × 844
620 × 844
621 × 844

× 三角色：

纯文本
shell-nav
content-detail
recovery-404

= 9。

其中 detail 必须验证：

纯文本
619/620:
  one-column article layout

621:
  <=900 rules still apply
  but <=620 rules no longer apply
  article layout returns to two-column form
D. Reduced motion — 4

Chromium：

纯文本
390 × 844
1280 × 800

×：

纯文本
shell-nav
content-detail

= 4。

Context：

纯文本
reducedMotion = "reduce"

验证：

纯文本
prefers-reduced-motion matches
smooth scroll disabled
.reveal effective animation collapsed
transitions effectively collapsed
content remains visible
E. Live resize — 1

Chromium：

纯文本
899×800
→ 901×800
→ 899×800

Role：

纯文本
shell-nav

验证真实 A3 focus migration。

总数
纯文本
27 baseline
+ 3 no-JS
+ 12 boundary
+ 4 motion
+ 1 resize
= 47 required rows

不是 46，也不是 48。

11. Browser assertions

core-browser-matrix.ts 只定义：

纯文本
case ID
category
engine
role
route
viewport
javascript
motion
requiredAssertions

不得含 fabricated result。

所有适用 case 的 common assertions

至少：

纯文本
correct HTTP status
exactly one visible H1
main#main-content exists
document horizontal overflow <= 1 CSS px
no pageerror
no unexpected console.error
skip link exists
footer/back-to-top remains focusable
shell/nav — JS enabled

移动状态至少证明：

纯文本
desktop nav hidden
mobile nav visible

Menu summary >= 44px target
nested summary/link >= 44px intent

Tab
Shift+Tab
Enter
Space
Escape

outer disclosure
nested disclosure
innermost Escape first
focus restores to nested summary

second Escape
outer closes
focus restores to outer summary

ordinary child navigation is not prevented
same-document target focus is restored correctly

桌面状态至少：

纯文本
desktop nav visible
mobile nav hidden

Tab into primary nav
focus-within exposes submenu
child link keyboard reachable
Shift+Tab remains coherent
visible machine-detectable focus outline

视觉 focus quality / actual contrast：

纯文本
HUMAN DEFERRED

不得由脚本冒充人工 PASS。

12. Live resize 必须验证 A3 的真正重点

Live resize case：

纯文本
899 mobile

打开：

纯文本
mobile outer
Guides nested group
focus child

resize：

纯文本
899 → 901

必须：

纯文本
mobile details closed
nested details closed
focus mapped to matching desktop data-nav-page-id

然后 desktop focused state：

纯文本
901 → 899

必须：

纯文本
focus moves to mobile Menu trigger

不能只验证：

纯文本
CSS display changed

否则 AX-01 的 A3 核心行为仍未被真正证明。

13. Content/detail assertions

针对：

纯文本
/guides/getting-started/

至少验证：

纯文本
article visible
prose visible
heading path usable
document overflow <=1px

浏览器 stress table：

纯文本
table.scrollWidth > table.clientWidth

且必须找到Core 提供的局部滚动边界：

纯文本
ancestor scrollWidth > clientWidth
AND
computed overflow-x = auto | scroll

同时：

纯文本
document itself must not become horizontally scrollable

若没有局部滚动边界：

纯文本
FAIL

本轮不能直接修改 global.css。

14. Recovery / true-404

对不存在路由：

纯文本
/__ws06a_missing_route__/

要求：

纯文本
HTTP = 404
h1 visible
Recovery links nav visible
Back to home reachable/focusable
search/recovery destinations valid where emitted
document overflow <=1px

这才是 PP-01 Core recovery browser evidence。

15. No-JS 要证明 progressive enhancement

三引擎 mobile no-JS：

纯文本
javaScriptEnabled=false

必须：

纯文本
page renders
mobile menu visible
desktop menu hidden
summary activation works natively
nested details remain usable
main content accessible
recovery/navigation links are real anchors
document no overflow

不能因为 MobileNav inline controller 未运行就标：

纯文本
NOT_APPLICABLE

这恰恰是在证明 progressive enhancement。

16. Evidence identity：不允许“47绿点”但不知道跑的是什么

core-browser-evidence.ts 定义 evidence schema 和 fail-closed validator。

最终：

纯文本
.browser-evidence/core-browser-evidence.json

默认本地目录加入 .gitignore。

实际 C2C 执行时通过：

纯文本
CORE_BROWSER_EVIDENCE_DIR=<template/codex/executions/v2.7-ws06a/browser-evidence>

把审查证据写到 execution folder。

Evidence top-level 至少包含：

纯文本
schemaVersion

starter:
  branch
  HEAD
  current working-tree manifest SHA256

canonicalContract:
  version
  path
  SHA256

fixture:
  adopted identity
  fixture source manifest SHA256

build:
  dist aggregate SHA256

playwright:
  packageVersion = 1.63.0

host:
  platform
  arch
  node

每个 engine 记录：

纯文本
browserName
browser.version()
browser revision

Revision 从安装的：

纯文本
playwright-core/browsers.json

读取。

若该文件结构与 1.63.0 实际包不符：

纯文本
STOP

不要猜 revision。

17. 每个 row 的证据字段

每一条 case：

纯文本
caseId
category
engine
browserVersion
browserRevision

role
route
viewport

javascript
reducedMotion

assertions:
  name
  passed
  detail

caseStatus:
  PASS
  FAIL
  NOT_RUN

durationMs
failure

这里：

纯文本
caseStatus

只是 browser evidence row 状态。

它不是 Contract §W 的：

纯文本
verifiedOutcome

禁止把：

纯文本
NOT_RUN

写成 Capability outcome enum。

18. Evidence validator 必须 fail closed

tests/core-browser-evidence.test.ts 使用 Vitest 测试 matrix/validator，不启动 browser。

正例：

纯文本
完整 47 rows
唯一 IDs
准确 matrix identity
所有 required assertions PASS
准确 source/build identity
准确 engine version/revision

才合法。

必须加入负例：

缺陷	validator
少一行	FAIL
duplicate case	FAIL
unexpected case	FAIL
row NOT_RUN	FAIL
row FAIL	FAIL
任意 required assertion 缺失	FAIL
assertion=false	FAIL
engine 错	FAIL
viewport 错	FAIL
JS 状态错	FAIL
motion 状态错	FAIL
browserVersion 空	FAIL
browserRevision 空	FAIL
source manifest 空/不匹配	FAIL
build hash 空/不匹配	FAIL
404 case 未记录 404	FAIL
matrix 数不是 47	FAIL

并固定 category count：

纯文本
baseline = 27
no-js = 3
boundary = 12
reduced-motion = 4
live-resize = 1

旧 A4 的：

纯文本
"verified-test-version"

这种 fabricated browser version 明确禁止。

19. Runner 的 failure policy

Browser runner 不应在首个普通 assertion failure 后立即丢失其余证据。

推荐：

纯文本
case fails
→ record FAIL
→ continue remaining cases

最后统一：

纯文本
any FAIL
or NOT_RUN
or incomplete matrix
→ process exit 1

但以下基础故障可直接结束 browser phase：

纯文本
fixture cannot build
preview server cannot start
source identity unavailable
evidence directory unwritable
matrix invalid before run

即使提前结束，也必须写一个 failure report，把未执行项标：

纯文本
NOT_RUN

不能消失。

20. Cleanup

Runner finally 必须：

纯文本
terminate preview process
remove disposable fixture

不能：

纯文本
rm -rf canonical Starter
git clean

如果 cleanup 本身失败：

纯文本
overall FAIL

并保留错误。

.browser-evidence/ 可以保留作为本地结果，但 execution run 的正式证据写入 template execution folder。

21. CI 精确变化

WS-02 当前 CI：

纯文本
npm ci
npm run check
npm run verify:unadopted-final
npm run verify:adopted-final

全部保留。

在其后增加：

纯文本
Install browser engines
npm exec -- playwright install --with-deps chromium firefox webkit

Core browser evidence
npm run check:browser

因此：

纯文本
existing Core/unit gate
→ unadopted PP-02 gate
→ adopted final gate
→ browser engines
→ browser matrix

不是用 browser tests 替换已有 CI。

本轮没有 remote push，所以最终只能声称：

纯文本
CI definition updated
+
same browser command executed locally

不能声称：

纯文本
GitHub Actions PASS
22. ALL_THREE sync — SOP

只允许修改：

纯文本
GAME_SOP_V2.7_CANDIDATE/
  docs/NEW_GAME_SITE_SOP_v2.7.md
  docs/QA_CHECKLIST.md
  docs/EXECUTION_PROMPT.md
NEW SOP

增加 WS-06A 方法：

纯文本
supported Core browser scope
47-row matrix
same-build evidence requirement
engine/revision identity
no-JS/reduced-motion
breakpoint/resize
FAIL/NOT_RUN fail closed
machine vs Human evidence boundary

特别明确：

纯文本
AX-01 browser technical evidence
!= assembled-site PA-01

以及：

纯文本
AX-02 automated part
!= manual visible-focus/contrast approval
QA Checklist

增加：

纯文本
47/47 required
0 skip
0 NOT_RUN
all three engines
same source/build
true 404
long-table local scroll
breakpoint exactness
live resize focus
no-JS
reduced motion
SOP Execution Prompt

只有选中的 Starter package.json 实际提供：

纯文本
check:browser

并且实际安装 dependency/browser engine 时才能运行。

不存在命令：

纯文本
HARD STOP

不能从 Roadmap 猜。

23. ALL_THREE sync — Master Prompt

只修改：

纯文本
GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE/
CodexMasterPrompt_v2.7Candidate.md

在 Phase 0/Phase 4 规则里同步：

纯文本
verify exact Starter browser capability exists
bind same source/build
run check:browser
require complete matrix
missing engine / NOT_RUN / skip = block

同时明确：

纯文本
06A technical browser PASS
does not mean
06B assembled PASS
WS07 real-project PASS
V2.7 release PASS

CONTRACT_REFERENCE.json 不变。

24. Capability evidence边界

本轮主要产生：

纯文本
AX-01 actual Core browser evidence
AX-02 automated partial evidence
AX-03 Core-side browser evidence
PP-01 true-404 browser evidence

但是 Contract 本身要求：

纯文本
AX-02 = automated + manual
AX-03 = Core Starter + ASSEMBLED PROJECT
PA-01 = assembled-site acceptance

所以即使 47/47 全绿：

纯文本
WS-06A engineering evidence = PASS

也不自动修改：

纯文本
WS-01 capability-evidence-baseline.json

不得自动写：

纯文本
AX-02 verifiedOutcome=PASS
AX-03 verifiedOutcome=PASS
PA-01 verifiedOutcome=PASS

本阶段最多记录：

纯文本
new browser evidence exists
technical scope independently reviewed

完整 capability outcome 要尊重后续 assembled/human Gate。

25. Root regression

安装 dependency 与新增 evidence unit test 后必须重新执行：

Bash
npm run check
npm run verify:unadopted-final
npm run verify:adopted-final

要求：

纯文本
existing 44 test files remain
all existing tests remain active
new test file added
no skip-to-pass

预计：

纯文本
test files >= 45
tests > 656

但不预先伪造准确新增 test 数。

WS-02 三条 gate 必须仍然 PASS。

26. Browser execution

随后：

Bash
npm exec -- playwright install chromium firefox webkit

再：

Bash
CORE_BROWSER_EVIDENCE_DIR=<actual execution evidence dir> \
npm run check:browser

必须输出：

纯文本
47 planned
47 executed
47 PASS
0 FAIL
0 NOT_RUN

才允许提交独立审查。

如果实际 Core 浏览器行为失败：

停止在失败证据。

不进入 runtime repair。

27. Dependency final checks

执行后检查：

Bash
npm ls playwright playwright-core --all

要求：

纯文本
playwright@1.63.0
playwright-core@1.63.0

以及：

纯文本
@playwright/test = absent
@vitest/browser-playwright = not directly installed

原 Vitest lockfile optional peer metadata仍可存在。

同时：

纯文本
src/** delta = 0
28. Product file scope

如果首轮正常完成，实际 product delta 应严格等于：

纯文本
Starter 11 files
SOP 3 files
Prompt 1 file
=
15 product files

如果出现第 16 个 product file：

纯文本
STOP

除非它只是本 PLAN 明确列出的 governance/evidence artifact。

29. Governance / execution records

允许创建：

纯文本
template/codex/prompts/v2.7-ws06a/prompt.md

template/codex/executions/v2.7-ws06a/
├── result.md
├── provenance.json
├── check.log
├── browser-install.log
├── browser-run.log
├── browser-evidence/
│   └── core-browser-evidence.json
├── starter.diff
├── sop.diff
├── master-prompt.diff
├── dependency.diff
├── rollback-manifest.json
└── preimages/

如果 browser case FAIL，可额外保存：

纯文本
failure screenshot
failure DOM/diagnostic excerpt

仅失败 case；不做大规模截图基线系统。

允许更新：

纯文本
template/PROJECT_STATE.md

只记录：

纯文本
WS-06A executed / review pending

并顺手消除其中那个已经过时的：

纯文本
Candidate CLEAN / phase-a/core-safety

当前态描述冲突。

不修改 Roadmap。

30. Provenance 必须绑定 uncommitted source

因为 HEAD 仍然是 A3：

纯文本
HEAD SHA

不能代表 WS-02/06A 的完整 source identity。

因此 provenance 必须同时记录：

纯文本
Starter HEAD/tree
branch
current product file hash manifest
working-tree aggregate hash

WS-02 ACCEPT predecessor manifest/hash
WS-06A preimage hashes
WS-06A postimage hashes

SOP working-tree aggregate
Prompt working-tree aggregate

canonical Contract SHA
package-lock SHA

browser evidence SHA
fixture source SHA
dist aggregate SHA

不能写：

纯文本
source = b067e8d

然后忽略未提交变化。

31. Rollback

因为 WS-01/02 均未 commit：

严禁：

纯文本
git reset --hard
git checkout .
git clean -fd

Rollback 只能：

纯文本
current postimage hash matches WS06A provenance
→ restore exact WS06A preimage

新文件：

纯文本
remove only if hash == recorded WS06A postimage

Dependency source rollback：

纯文本
restore package.json preimage
restore package-lock.json preimage

不要自动删除共享 Playwright browser cache。

node_modules 是 generated environment，不作为源码 rollback authority。

Branch：

纯文本
v2.7/evolution

不删除。

32. STOP conditions

以下任一情况立即停止：

纯文本
current WS02 accepted bytes mismatch
unknown product delta before WS06A
branch != v2.7/evolution
HEAD != b067e8d...

canonical Contract changes
41 Registry changes

playwright 1.63.0 cannot resolve exactly
dependency install changes unrelated packages
runtime dependency required
@playwright/test becomes necessary
browser SaaS required

src/** change appears necessary

browser fixture requires bypassing PP-02/TL-01/TL-02
browser fixture must fake overflow wrapper to pass

any required engine unavailable
engine revision cannot be recorded
matrix != 47
missing/duplicate/unexpected/skip row
NOT_RUN row
browser assertion fails

true 404 is not actually 404
long-table local-scroll fails
navigation breakpoint differs
live resize focus migration fails
no-JS native navigation fails
reduced-motion contract fails

existing WS02 check/adoption gates regress

scope reaches:
  WS03
  WS06B
  WS07
  WS08
  A4

尤其重要：browser test 发现产品 bug ≠ 自动授权修产品 bug。

先停、保存证据、再由我判断是否需要一个非常窄的 WS-06A scope amendment。

33. WS-06A Exit Criteria

只有全部成立才发送 STATE: EXECUTED：

YAML
WS06A:

  predecessor:
    WS01: ACCEPTED
    WS02: ACCEPTED
    accepted_uncommitted_bytes_preserved: true

  dependency:
    direct_dev_dependency:
      playwright: "1.63.0"
    runtime_browser_dependency: NONE
    unrelated_lock_delta: NONE

  core_runtime:
    src_delta: NONE
    copied_core: NONE

  root_regression:
    npm_run_check: PASS
    ws02_unadopted_gate: PASS
    ws02_adopted_gate: PASS
    skipped_to_pass: 0

  browser_matrix:
    required: 47
    executed: 47
    passed: 47
    failed: 0
    not_run: 0

    baseline: 27
    no_js: 3
    boundary: 12
    reduced_motion: 4
    live_resize: 1

  engines:
    chromium: REAL_VERSION_AND_REVISION
    firefox: REAL_VERSION_AND_REVISION
    webkit: REAL_VERSION_AND_REVISION

  roles:
    shell_nav: PASS
    content_detail: PASS
    true_404_recovery: PASS

  core_behaviors:
    overflow: PASS
    local_table_scroll: PASS
    keyboard: PASS
    nested_escape: PASS
    focus_restore: PASS
    breakpoint_900: PASS
    breakpoint_620: PASS
    live_resize: PASS
    tap_target_intent: PASS
    no_js: PASS
    reduced_motion: PASS

  human_only:
    visual_focus_quality: DEFERRED_NOT_AUTO_PASSED
    contrast_judgment: DEFERRED_NOT_AUTO_PASSED

  triad:
    Starter: SYNCED
    SOP: SYNCED
    MasterPrompt: SYNCED
    canonical_contract_changed: false
    registry_changed: false

  capability_claims:
    AX01_full_project_PASS: NOT_CLAIMED
    AX02_full_PASS: NOT_CLAIMED
    AX03_full_PASS: NOT_CLAIMED
    PA01_PASS: NOT_CLAIMED

  forbidden:
    WS03: NOT_STARTED
    WS06B: NOT_STARTED
    WS07: NOT_STARTED
    WS08: NOT_STARTED
    A4: NOT_RESUMED
    commit: NONE
    push: NONE
    tag: NONE
    merge: NONE
    release: NONE

  independent_review:
    status: PENDING

然后 Codex 必须停止，并发送：

纯文本
[C2C]
STATE: EXECUTED
TASK_ID: c2c_a765
ITERATION: 11
WORKSTREAM: WS-06A

我下一轮会通过 connector 独立读取：

纯文本
实际 15 个 product files
dependency/lock delta
runner/matrix/validator
47-row evidence
失败/成功 execution outputs
CI
SOP/Prompt sync
preimages/rollback/provenance

再给 ACCEPT / REVISE / BLOCKED。

Codex 现在可以按本 PLAN 执行 WS-06A。除此之外没有新的实施授权。
