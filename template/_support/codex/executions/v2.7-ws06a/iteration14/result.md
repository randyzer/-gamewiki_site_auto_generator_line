# WS-06A iteration14 — 策略提案独立 ACCEPT，尚未实施

用户接受第13轮建议，授权第14轮制定有限WebKit验证策略计划。实际PLAN14保存在 /Users/randyz/work/coding/hot_words_web/template/codex/prompts/v2.7-ws06a/iteration14-verification-policy-plan.md。该计划授权治理提案及10进程pure-native重复性控制；不授权产品、Contract、schema、matrix、runner、CI、依赖、SOP或Prompt变更，不授权现行策略生效。

## 完成内容

1. WEBKIT_VERIFICATION_POLICY_PROPOSAL_V1.md：区分Contract要求、verification mechanism及当前engine/host input profile；建议未来诊断层与资格状态并存。Plain Tab保留原FAIL，同时提出ENVIRONMENT_PROFILE_BLOCKED归因。环境阻塞不能授予产品/能力PASS，人工AX-02与assembled AX-03门槛保留。
2. policy-decision-matrix.json：绑定实际raw证据、0/10原生控制和未来采用门槛；不改当前规则，不豁免live-resize。建议后续单独授权Policy Implementation Plan；另有单独Live-Resize Repair Plan。
3. arrowright-repeatability-control.mjs/json/log：用现有Playwright1.63.0及WebKit26.6/rev2359启动10个独立进程，每轮fresh context/page，390×844纯原生HTML，没有Core、fixture或Astro。每轮Tab一次、ArrowRight一次，没有retry、参数、设置或程序化焦点/滚动替代。

## 实际控制结果

10轮全部有效，0轮native scroll：NATIVE_ARROW_UNAVAILABLE。每轮activeElement均为#scroll、overflowX=auto、scrollWidth780>clientWidth320、单一ArrowRight事件确实到达；六个采样点保留实际performance时间、scrollLeft和焦点。所有context/browser已关闭，程序exit0。第13轮曾出现native滚动成功的记录保持原样；本次结论只适用于这个有限控制，不宣称所有WebKit永远无法键盘滚动，不能把Core当前失败改成PASS。

实际执行命令：

```sh
PATH=/Users/randyz/.nvm/versions/node/v22.22.0/bin:$PATH node /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws06a/iteration14/arrowright-repeatability-control.mjs
```

## 范围与完整性

新增文件仅实际PLAN14中的10项治理文件（prompt计划1项、iteration14执行目录9项）。当前19范围文件和三个候选目录235个记录文件的SHA、模式、符号链接及HEAD/tree/branch一致；冻结V2.6.5三件套、743保护文件、roadmap和上一轮13个证据文件一致。

按原runner的文件排序、哈希字段与排除项独立计算Starter源清单，仍为796b1a6e39ca2df4141e4e65ea4cf2fc70c9d510d3018fef38c3fd60612cfed8。Contract、matrix、runner、package/lock、SOP/Prompt均零增量。完整性审计exit0，errors=[]。原资格证据SHA为c24c2371ff8a52453582468165f0f2fb93918ea69bf59fd35e4f511b0bb00cf9，仍47执行、36PASS/11FAIL、0NOT_RUN/skip；没有qualification rerun。

本轮没有产品行为改变，因此没有重跑root/adopted全量check、build或47-row资格矩阵。没有预览进程、安装、commit、push、tag、merge或release动作；仅使用现有开发依赖。

## 独立审查入口与停止点

先读取10轮raw结果及native控制脚本，再核对policy proposal/decision matrix与现行Contract、matrix/runner/SOP/Prompt。最后核对preflight.json、integrity-check.json和provenance.json，确认零产品增量和历史证据不变。

POLICY_STATUS=PROPOSAL_ONLY。WS-06A仍BLOCKED；AX-01/02/03、PA-01及release没有任何promotion。后续策略实施和焦点修复必须分别有有限计划与授权；本轮仅提交提案审查。


## 实际 ChatGPT 独立审查全文

ChatGPT 说：

[C2C]
STATE: REVIEW
TASK_ID: c2c_a765
ITERATION: 14
WORKSTREAM: WS-06A verification-policy decision
VERDICT: PROPOSAL ACCEPT
POLICY_IMPLEMENTED: NO
WS-06A QUALIFICATION: STILL BLOCKED — 36 PASS / 11 FAIL

我已独立读取 iteration14 的 10 轮原始 timeline、control script、policy proposal、decision matrix、preflight/integrity/provenance/result，并与当前 Contract AX-01/02/03、47-row matrix/runner、SOP/QA/Execution Prompt/Master Prompt 的冻结规则对照。

1. ArrowRight 10-process control：接受 NATIVE_ARROW_UNAVAILABLE

10 轮都是独立 fresh WebKit process，而不是同一 browser 下重复 page。

每一轮都满足：

纯文本
WebKit = 26.6 / rev2359
viewport = 390×844

activeElement == #scroll
clientWidth = 320
scrollWidth = 780
overflowX = auto
tableWidth = 780

ArrowRight event count = 1
target = #scroll
defaultPrevented = false

programmatic focus = none
programmatic scroll = none
retry = 0
extra flags = none
OS changes = none

而 10/10：

纯文本
before       = 0
immediate    = 0
next-frame   = 0
~50ms        = 0
~200ms       = 0
~500ms       = 0

所有 context/browser 均正常关闭。

因此在这次有限且固定的 current WebKit/host control 条件下：

YAML
validRuns: 10
scrolledRuns: 0
classification: NATIVE_ARROW_UNAVAILABLE

这个分类成立。

这里最重要的是范围：

它证明的是“当前 Playwright WebKit 26.6/rev2359 + 当前 host + 此 minimal native control 中，单次 ArrowRight 不是一个可依赖的 deterministic native-scroll prerequisite”。

它没有证明：

纯文本
所有 WebKit 都不能横向键盘滚动
Safari 都不能滚
产品已经可访问
Core 的 table 已经 PASS

proposal 对这个边界表达准确。

2. iteration13 的 0→40 历史结果没有被偷偷删除

这一点处理得正确。

iteration13 曾有一个完整 probe：

纯文本
minimal WebKit:
0 → 9 → 36 → 40

iteration14 没有覆盖或篡改这份 evidence。

现在有：

纯文本
历史观察：
曾经出现一次 native scroll

有限 repeatability control：
10 independent processes
0/10 native scroll

因此正确结论不是：

纯文本
“WebKit永远不滚”

而是：

单次 ArrowRight native-scroll 结果不是当前环境下可靠的确定性产品判定机制。

这正是 iteration14 需要回答的问题。

3. Plain Tab policy：接受

proposal 对 plain Tab 的分层是正确的。

Contract 要求的是：

纯文本
AX-01
keyboard operation / Escape / focus restoration / truthful expanded state

AX-02
skip link / visible focus / reduced motion / usable targets

AX-03
overflow + keyboard-path integrity

Contract 没有把“Playwright WebKit 当前 host 上 plain Tab 必须把普通 <a> 纳入 sequential focus”写成 requirement 本身。

而 iteration13 的 native control 已证明：

纯文本
ordinary <a>
tabIndex = 0
visible
programmatic focus works

BUT

current WebKit/host plain Tab skips anchor

Chromium/Firefox同一最小对照则能到 anchor。

因此：

YAML
historical_qualification: FAIL

diagnosis:
  ENGINE_HOST_KEYBOARD_PROFILE

proposed_diagnostic_disposition:
  ENVIRONMENT_PROFILE_BLOCKED

product_defect_attribution:
  false

automatic_product_pass:
  false

这是合理政策。

特别值得保留的是：

ENVIRONMENT_PROFILE_BLOCKED 不是 PASS。

proposal 没有利用环境问题绕过 evidence requirement。

4. ArrowRight policy：接受 PRODUCT_EVIDENCE_UNRESOLVED

这里也处理正确。

当前 Core 的真实历史结果依然是：

纯文本
WebKit 390:
ArrowRight received
wrapper focused
geometry scrollable
scrollLeft stays 0

WebKit 1280:
same

所以不能说：

纯文本
Core PASS

但因为 minimal native ArrowRight 本身在当前 host 也无法稳定作为 prerequisite，不能直接说：

纯文本
Core implementation defect proven

因此 proposal 的：

YAML
diagnostic_disposition:
  PRODUCT_EVIDENCE_UNRESOLVED

automatic_pass:
  false

alternate_evidence_required:
  true

比强行判 Core bug更严谨。

5. Proposal 没有偷换 Contract

我重点核了这一点。

它没有：

纯文本
修改 AX-01
修改 AX-02
修改 AX-03
新增 applicability exemption
把 P1 failure exception 化
把 environment blocker 写成 NOT_APPLICABLE
修改 §W outcomes

反而明确保持：

纯文本
diagnostic dispositions
≠
Contract outcomes

也就是说未来即使引入：

纯文本
PRODUCT_FAILURE
ENVIRONMENT_PROFILE_BLOCKED
HARNESS_FAILURE
PRODUCT_EVIDENCE_UNRESOLVED

它们也只是诊断层。

这符合现有 Contract 的 authority 边界。

6. Human / assembled gates 完整保留

这也是本次 ACCEPT 的关键条件。

proposal 明确保留：

AX-02
纯文本
automated + manual accessibility test

所以环境 classification 不能替代：

纯文本
visible focus quality
contrast
实际用户键盘验证
AX-03

仍然要求：

纯文本
CORE STARTER + ASSEMBLED PROJECT
Browser E2E

所以 Field Notes Core probe 或 WebKit环境诊断不能替代：

纯文本
WS-06B
real assembled site
WS-07 real-game adoption
PA-01
release gate

没有削弱后续 acceptance。

7. Live resize 没有获得任何政策豁免

proposal 正确保留：

YAML
live_resize:
  diagnosis: CORE_FOCUS_MIGRATION_TIMING_RACE
  policy_relief_applicable: false
  separate_repair_plan_required: true

这一点必须保持。

WebKit verification-policy 的存在，不能解释 Chromium 的真实 Core race。

8. 当前 36 / 11 证据没有被重写

实际 integrity：

纯文本
productDelta = 0
contractDelta = 0
matrixDelta = 0
runnerDelta = 0
dependencyDelta = 0
SOPAndPromptDelta = 0

Qualification evidence SHA仍然：

纯文本
c24c2371ff8a52453582468165f0f2fb93918ea69bf59fd35e4f511b0bb00cf9

仍然是：

纯文本
47 executed
36 PASS
11 FAIL
0 NOT_RUN
0 skip

没有 qualification rerun。

Starter manifest仍然：

纯文本
796b1a6e39ca2df4141e4e65ea4cf2fc70c9d510d3018fef38c3fd60612cfed8

Contract仍然：

纯文本
1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c

Matrix和runner hash也未变。

所以这是一次真正的：

policy proposal review，非“先改规则再来审批”。

9. Proposal ACCEPT 到底意味着什么

正式状态应理解为：

YAML
WS06A_POLICY_PROPOSAL_V1:
  verdict: ACCEPTED

  policy_authority:
    active: false

  current_execution_rules:
    47_of_47_required: STILL_ACTIVE

  current_qualification:
    pass: 36
    fail: 11

  capability_promotion:
    AX01: NONE
    AX02: NONE
    AX03: NONE
    PA01: NONE

  WS06A:
    status: BLOCKED

换句话说：

我们已经决定“未来应该怎样正确解释这类 WebKit 环境失败”，但还没有把这套解释机制实施进 SOP/Prompt/runner/schema/CI。

10. 下一步有限决策

我建议下一步不要马上实施 verification policy。

按照前面的拆分逻辑，现在已经完成：

纯文本
Iteration13
诊断环境问题 vs Core问题

↓

Iteration14
verification-policy proposal ACCEPT

接下来最合适的是单独处理已经证据充分的真实产品缺陷：

建议 iteration15
纯文本
WS-06A
Live-Resize Core Repair Plan

只针对：

纯文本
MobileNav breakpoint focus migration timing race

目标应是解决：

纯文本
899 → 901
901 → 899

时浏览器可能在 matchMedia change callback 之前把隐藏导航元素的 focus 清成 BODY，导致当前代码失去原 pageId。

iteration15 应保持：

纯文本
WebKit policy不实施
ArrowRight不处理
matrix不改
Contract不改
SOP/Prompt policy不改

先把明确的 Core bug关掉。

等 live-resize repair 独立通过以后，再另开一个完全独立的：

纯文本
Policy Implementation Plan

来决定如何同步：

纯文本
SOP
QA
Execution Prompt
Master Prompt
evidence schema
runner
validator
CI

并设计 fail-closed 的 alternate-evidence机制。

最终 verdict
纯文本
[C2C]
STATE: REVIEW
TASK_ID: c2c_a765
ITERATION: 14
WORKSTREAM: WS-06A verification-policy decision
VERDICT: ACCEPT
POLICY_STATUS: PROPOSAL_ACCEPTED_NOT_IMPLEMENTED
WS06A_STATUS: BLOCKED
QUALIFICATION: 36 PASS / 11 FAIL

**下一有限决策：授权 iteration15，仅制定 Live-Resize Core Repair Plan。**不应在同一 iteration 里实施 WebKit policy。


## 已审查停止点

真实独立审查确认PROPOSAL_ACCEPTED_NOT_IMPLEMENTED。策略提案本身已接受，现行47/47要求继续有效，WS-06A仍BLOCKED。10进程控制及所有治理范围/历史证据完整性通过审查。下一有限决策是授权第15轮，仅制定Live-Resize Core Repair Plan；WebKit策略实施保持独立且尚未授权。没有开始第15轮，没有修复产品源码或实施策略。
