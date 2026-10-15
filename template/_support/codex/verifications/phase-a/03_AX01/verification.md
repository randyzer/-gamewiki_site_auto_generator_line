# A3 independent review — implementation checkpoint

Reviewer: ChatGPT. Task c2c_a765; execution iteration3, review/plan iteration4.
Current verdict accepts implementation only. AX-01 browser evidence remains pending A4.

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 4
PREVIOUS_ITERATION: 3
REVIEW_VERDICT: ACCEPT — IMPLEMENTATION CHECKPOINT

A3 / AX-01 可以接受，但只接受为 Implementation Checkpoint；AX-01 仍必须经过 A4 真实浏览器矩阵后才能标记 PROVEN。

独立 Review 结论

A2 closure 合格：commit aad6464b6be1584297866518e2ac036fbd0bd1a4，parent a3c1bd31...，closure status clean，Frozen Starter 保持 29b25559...，没有 push/tag/merge/release。

A3 实际范围也符合计划，只有 3 个文件：

纯文本
M  src/components/navigation/MobileNav.astro
M  tests/navigation.test.ts
A  tests/navigation-behavior.test.ts

核心行为逐项检查结果：

AX-01 行为	Review
保留原生 details/summary 为状态权威	PASS
不重复接管 Enter / Space	PASS
Escape 关闭最近的 open disclosure	PASS
Escape 后恢复到对应 trigger	PASS
父级关闭时清理 nested disclosure	PASS
关闭后不故意留下 hidden focus	PASS
普通链接不 preventDefault	PASS
普通跨页导航先关闭 menu / 清理 focus	PASS
same-document anchor 将焦点送到目标	PASS
临时 tabindex=-1 可恢复，既有 tabindex 不覆盖	PASS
mobile → desktop 按 data-nav-page-id 映射	PASS
mobile child → desktop child 的结构真实存在	PASS
group summary → desktop parent mapping	PASS
无对应目标时回退 Home	PASS
desktop → mobile 隐藏焦点迁移至 mobile trigger	PASS
unrelated page focus 不被强制移动	PASS
breakpoint 与 CSS max-width: 900px 完全一致	PASS
没有 React/global state/modal/focus trap/body lock	PASS
没有 A4 browser dependency/config 混入	PASS

我还核对了 DesktopNav.astro：A3 使用的 data-nav-page-id 确实分别存在于 parent group 和 child <li>，不是测试自己虚构出来的映射结构。

测试证据有效：

纯文本
RED:
navigation.test.ts
1 expected failure / 6 pass

Focused:
2 files
15 / 15 pass

Full:
44 files
653 / 653 pass

Astro:
0 errors
0 warnings
0 hints
为什么现在仍不能说 AX-01 完成

当前 navigation-behavior.test.ts 是执行真实 inline controller 的窄 DOM stub，这对逻辑分支很有价值，但它不能证明：

浏览器原生 <details> toggle timing
Chromium / Firefox / WebKit 差异
media query 改变与 CSS 生效的真实时序
getClientRects() / :focus-within 的实际可见状态
focus ring 是否肉眼可见
键盘 Tab / Shift+Tab 顺序
真实 899/900/901 resize
no-JS 行为
touch / viewport / overflow

因此 Codex 将它标成 IMPLEMENTATION CHECKPOINT 是正确的。

一个需要同步修正的项目状态问题

template/PROJECT_STATE.md 主体状态基本正确，但尾部仍残留已经过时的：

纯文本
next conversation must verify 11 tools
A2 must be executed through execute_task

这与当前已经明确采用的 C2C skill 流程冲突，而且 A2 已经 CLOSED。

这属于项目治理污染，应在 A3 closure 时一起修正，不应继续留给后续阶段造成误导。

Iteration 4 finite PLAN
4.1 — A3 Closure

Codex

保存本次独立 ACCEPT：
template/codex/verifications/phase-a/03_AX01/verification.md
验证 Candidate：
branch phase-a/core-safety
HEAD aad6464...
patch 与 03_AX01/provenance.json 一致
git diff --check PASS
Commit A3，建议：
纯文本
feat: add AX-01 navigation behavior
记录：
commit SHA
parent=aad6464...
tree
clean status
Frozen baseline unchanged
不 push/tag/merge/release。

A3 状态只能写：

YAML
AX01:
  implementation: ACCEPTED
  unit_behavior: PASS
  browser_evidence: PENDING_A4
  status: IMPLEMENTATION_CHECKPOINT

不要写 CLOSED/PROVEN。

4.2 — 修正 PROJECT_STATE.md

将当前阶段更新为：

纯文本
A1 TL-02 CLOSED
A2 PP-02 CLOSED
A3 AX-01 IMPLEMENTATION ACCEPTED / evidence pending A4
A4 AX-03 + AX-01 browser evidence CURRENT

同时删除或明确标记 superseded 的“11 tools / execute_task 是前置条件”描述，避免以后再次误判执行模式。

不删除历史 execution evidence。

4.3 — 执行 A4 / AX-03 + AX-01 Browser Evidence

使用现有：

纯文本
template/codex/prompts/phase-a/04_AX03/prompt.md

本轮允许第一次增加 browser test infrastructure，但严格限定：

依赖

只允许：

纯文本
@playwright/test

作为 dev dependency。

Production runtime dependency：

纯文本
0

不得顺手升级其它包或更换 package manager。

Browser fixture

必须使用真实 Core components/styles 构造三个角色：

纯文本
1. shell / navigation
2. content / detail
3. recovery / 404

不能复制一份假的 Navigation 实现来“测自己”。

必跑矩阵
纯文本
Chromium
Firefox
WebKit

× 390×844
× 768×1024
× 1280×800

× 3 fixture roles

额外 Chromium：

纯文本
Navigation boundary:
899 / 900 / 901

Layout boundary:
619 / 620 / 621

Live resize / focus transition

Reduced motion:
mobile + desktop

以及：

纯文本
Chromium / Firefox / WebKit
no-JS mobile fallback
必须实际证明
Escape / nested close / focus restore
mobile ↔ desktop live resize focus
keyboard Tab / Shift+Tab
skip-to-main
visible focus
mobile 44×44 target intent
long menu 最后一项可达
document overflow ≤ 1 CSS px
wide table overflow 局部化
reduced-motion 下内容仍可访问
unknown route 使用真实 recovery/404
no-JS 下 native links/disclosures 可用

缺一个矩阵项或出现 skipped：

纯文本
FAIL

不能改成 warning。

4.4 — A4 输出边界

A4 完成后：

不要 commit
不要开始 A5
发送 STATE: EXECUTED
提供 repo-scoped diff/provenance
machine-readable browser matrix
readable summary
full regression output

由我独立审查后才能决定：

纯文本
AX-03 = PROVEN ?
AX-01 = PROVEN ?
Phase A Core Evidence Complete ?

当前演进位置已经非常清楚：

纯文本
TL-01  ✓
TL-02  ✓
PP-02  ✓
AX-01  implementation ✓ / browser evidence pending
              ↓
A4 AX-03 + AX-01 real-browser evidence   ← NEXT
              ↓
A5 三件套同步
              ↓
Phase B Game Adaptation

A3 ACCEPT。Codex 可以关闭 A3 implementation checkpoint，并进入 A4。


