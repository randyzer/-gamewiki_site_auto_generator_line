ChatGPT 说：

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 14
WORKSTREAM: WS-06A verification-policy decision
PLAN_STATUS: AUTHORIZED FOR CODEX EXECUTION — GOVERNANCE ONLY
PRODUCT_DELTA: MUST REMAIN 0
QUALIFICATION: MUST REMAIN 36 PASS / 11 FAIL

我已重新核对 Contract AX-01/02/03、现行 47-row matrix/runner、SOP/QA/Execution Prompt/Master Prompt，以及 iteration13 的原始诊断证据。

本轮只回答一个治理问题：

WS-06A 应如何区分“产品键盘可访问性失败”与“当前 engine/host 自身的 native keyboard profile 不提供该输入路径”？

不会修改现有门槛。本轮产出的是 policy proposal，不是生效的 policy change。

1. 当前必须冻结的事实

iteration14 开始前绑定：

纯文本
Starter working-tree manifest:
796b1a6e39ca2df4141e4e65ea4cf2fc70c9d510d3018fef38c3fd60612cfed8

Contract SHA:
1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c

matrix:
scripts/core-browser-matrix.ts
000b8edd53f4eb99e569f81997dbefa2acbb304d38af61e4d9f9a05addf84371

runner:
scripts/run-core-browser-evidence.ts
93b0200d5cec806091fd55ad5f4fd5da7dd835cba6aeefc5517efa76ec31d33c

以及资格证据：

纯文本
47 executed
36 PASS
11 FAIL
0 NOT_RUN
0 skip

iteration14 后必须完全相同。

2. 本轮不修改任何现有治理权威

明确禁止修改：

纯文本
GAME_SITE_STARTER/**
GAME_SOP_V2.7_CANDIDATE/**
GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE/**

template/roadmap/**
canonical Contract
47-row matrix
runner
validator
package.json
package-lock.json
CI

特别是当前 SOP/Prompt 中：

纯文本
Require 47/47 PASS
0 FAIL
0 NOT_RUN
0 skip

继续是当前有效执行规则。

iteration14 的 proposal 即使被我 ACCEPT，也不能自动覆盖这些规则。

3. iteration14 精确文件范围

只允许新增治理文件：

纯文本
template/codex/prompts/v2.7-ws06a/
└── iteration14-verification-policy-plan.md

template/codex/executions/v2.7-ws06a/iteration14/
├── WEBKIT_VERIFICATION_POLICY_PROPOSAL_V1.md
├── policy-decision-matrix.json
├── arrowright-repeatability-control.mjs
├── arrowright-repeatability.json
├── arrowright-repeatability.log
├── preflight.json
├── integrity-check.json
├── provenance.json
└── result.md

允许不创建截图。

不得创建 product-side：

纯文本
policy.ts
new evidence schema
new runner
new matrix
new SOP section
4. Proposal 必须先区分三层概念

WEBKIT_VERIFICATION_POLICY_PROPOSAL_V1.md 必须明确写出：

A. Contract requirement

Contract真正要求的是：

纯文本
AX-01
dismissible mobile navigation:
keyboard operation / Escape / focus restoration / truthful state

AX-02
skip link / visible focus / reduced motion / usable targets

AX-03
overflow and keyboard-path integrity at supported breakpoints
B. Verification mechanism

当前 WS-06A 将其中部分要求具体化为：

纯文本
plain Tab reaches ordinary anchors
ArrowRight natively scrolls .table-scroll

这些是当前 verification oracle。

C. Engine/host input profile

iteration13 已证明至少：

纯文本
当前 Playwright WebKit 26.6 / rev2359 + 当前 host

minimal native ordinary anchor:
tabIndex=0
visible
programmatic focus works
plain Tab does NOT reach it

这属于 engine/host profile evidence。

三层不能再混成一句：

纯文本
WebKit row failed
→ therefore Core inaccessible
5. Policy proposal 的核心原则

proposal 应提出以下未来政策，但本轮不实施：

Principle P1 — Product defect 与 environment prerequisite 分离

若一个产品 assertion 依赖浏览器首先提供某种 native keyboard path，则测试必须先问：

纯文本
这个输入路径在最小 native control 中是否存在？

若 native control 本身不存在：

纯文本
不能把它直接归因为 Core product defect

但也绝不能：

纯文本
自动算 PASS
6. 建议的未来 evidence disposition

proposal 可建议在 browser row status 之外增加一个独立诊断层：

纯文本
PRODUCT_FAILURE
ENVIRONMENT_PROFILE_BLOCKED
HARNESS_FAILURE
PRODUCT_EVIDENCE_UNRESOLVED

注意：

这些不是 Contract §W outcomes。

也不是当前：

纯文本
PASS / FAIL / NOT_RUN

的替代。

例如当前 WebKit plain-Tab：

纯文本
qualification row:
FAIL        ← 保留真实历史结果

diagnostic disposition:
ENVIRONMENT_PROFILE_BLOCKED

两者可以同时成立。

7. 最重要的 fail-closed 原则

未来即使 policy 被批准：

纯文本
ENVIRONMENT_PROFILE_BLOCKED

也只能表示：

没有足够证据把自动测试失败归因为产品。

它不能表示：

纯文本
产品 PASS
AX-01 PASS
AX-02 PASS
AX-03 PASS

因此 capability evidence 应保持：

纯文本
unverified / evidence insufficient

直到取得符合 Requirement Owner / Verification Owner 要求的替代证据。

这点必须写成 proposal 的硬约束。

8. WebKit plain-Tab 的 proposed disposition

基于 iteration13，proposal 应明确推荐：

YAML
webkit_plain_tab:
  current_qualification_status: FAIL

  diagnosis:
    ENGINE_HOST_KEYBOARD_PROFILE

  proposed_future_product_defect_attribution:
    false

  proposed_future_evidence_state:
    ENVIRONMENT_PROFILE_BLOCKED

  automatic_product_pass:
    forbidden

理由必须绑定实际 raw evidence，而不是泛泛声称：

纯文本
“Safari就是这样”

禁止这种外推。

只能说：

纯文本
this installed Playwright WebKit / host profile
9. Future adoption gate：不能因为 automation被环境挡住就放行

proposal 必须定义：

当某个 required keyboard assertion 被：

纯文本
ENVIRONMENT_PROFILE_BLOCKED

时，后续 assembled/project acceptance 必须取得另一条真实证据通道。

至少区分：

Core technical evidence

可以记录：

纯文本
automated WebKit path unavailable under this engine/host profile
Human / ordinary-browser evidence

若该能力对 AX-01/AX-02/AX-03 promotion material，则必须有真实浏览器键盘检查，证明：

纯文本
目标可顺序键盘访问
focus visible
required interaction usable

不能仅凭：

纯文本
DOM tabIndex=0
programmatic .focus()

来代替真实用户键盘路径。

10. AX-02 原有 Human Gate必须保留

proposal 必须特别声明：

即使未来 WebKit automated profile问题被政策处理：

纯文本
AX-02
Automated + manual accessibility test

中的 manual 部分仍然存在。

所以：

纯文本
environment classification
!= Human Visual / keyboard approval
11. AX-03 assembled-site Gate也不能被 Core policy替代

Contract AX-03 明确是：

纯文本
CORE STARTER + ASSEMBLED PROJECT

所以 proposed policy 必须声明：

纯文本
Core engine-profile diagnosis

不能取代：

纯文本
assembled project browser E2E

WS-06B / WS-07 后续仍必须真实验证 assembled site。

12. ArrowRight：我决定需要一个独立的 repeatability control

需要。

原因不是为了把当前 FAIL 改绿，而是 iteration13 出现了关键矛盾：

纯文本
attempt A:
minimal WebKit native ArrowRight → no scroll

attempt B:
same minimal probe → scroll to 40

而完整 run 中：

纯文本
Core WebKit 390 → 0
Core WebKit 1280 → 0

目前不能判断：

纯文本
ArrowRight native scrolling本身不稳定

还是：

纯文本
minimal behavior稳定可用，Core/context存在差异

这会直接影响 policy proposal 是否应将 ArrowRight视作可靠的 engine-native prerequisite。

所以 iteration14 需要一个纯 native、无 Core 的重复性控制。

13. ArrowRight repeatability control 精确边界

只运行：

纯文本
Playwright WebKit 26.6 / rev2359

不创建 Field Notes fixture。

不启动 Astro。

不访问 Starter页面。

每轮创建：

XML
<div
  id="scroll"
  tabindex="0"
  style="width:320px;overflow-x:auto"
>
  <table style="min-width:780px">...</table>
</div>
14. Repeatability运行方式

运行：

纯文本
10 independent fresh WebKit browser processes

不是同一 browser 的 10 个 page。

这样专门测试此前两次不同 process启动间的差异。

每轮：

纯文本
1. launch WebKit
2. create fresh context/page
3. set same native HTML
4. plain Tab exactly once
5. verify activeElement == #scroll
6. geometry:
   clientWidth
   scrollWidth
   overflowX
7. keydown listener
8. ArrowRight exactly once
9. sample:
   before
   immediate
   next animation frame
   50ms
   200ms
   500ms
10. close context/browser

不得加入：

纯文本
retry-until-scroll
second ArrowRight
programmatic scroll before native test
flags
OS setting
Core CSS/JS
15. Repeatability control 的有效性条件

每一轮在 ArrowRight 前必须满足：

纯文本
activeElement == #scroll
overflow-x == auto
scrollWidth > clientWidth
key event observed == ArrowRight

任一条件失败：

纯文本
CONTROL_INVALID
→ STOP policy conclusion on ArrowRight

不是计入“不滚”。

16. ArrowRight repeatability 分类规则

10轮全部有效后：

10/10 native scroll
纯文本
NATIVE_ARROW_REPEATABLE

含义：

在当前 engine/host 的 minimal control 中，ArrowRight 是可重复 native行为。

这会使：

纯文本
Core 0-scroll

成为值得未来单独调查的 Core/context差异。

但 iteration14仍然不能判 Core bug，也不能修 source。

0/10 native scroll
纯文本
NATIVE_ARROW_UNAVAILABLE

说明 previous successful minimal result需要视为非稳定/异常 evidence，不能把 ArrowRight作为稳定的 product oracle prerequisite。

1–9/10 native scroll
纯文本
NATIVE_ARROW_NONDETERMINISTIC

说明：

当前 native ArrowRight scroll本身对这个 engine/host不是可靠的 deterministic verification mechanism。

这将强烈支持未来 policy 不用“单次 native ArrowRight结果”直接归因产品。

17. 这个 control 不得触碰 qualification

无论得到：

纯文本
10/10
0/10
mixed

都必须保持：

纯文本
47 qualification rows
36 PASS
11 FAIL

不允许 retroactive：

纯文本
11 FAIL → 1 FAIL

也不允许改历史 JSON。

18. Policy decision matrix

policy-decision-matrix.json 至少记录：

YAML
plain_tab:
  contract_property: keyboard accessibility/path
  current_oracle: plain Tab reaches anchor
  environment_control_result: unavailable
  diagnosis: ENGINE_HOST_KEYBOARD_PROFILE
  proposed_policy:
    product_defect_attribution: false
    evidence_disposition: ENVIRONMENT_PROFILE_BLOCKED
    automatic_pass: false
    alternate_evidence_required: true

arrowright:
  contract_property: keyboard-path / overflow usability
  current_oracle: native ArrowRight scroll
  repeatability_control:
    valid_runs: 10
    scrolled_runs: N
    classification: ...
  current_core_result:
    webkit_390: no_scroll
    webkit_1280: no_scroll
  proposed_policy:
    # based only on repeatability result
    deterministic_native_oracle_supported: true|false|unresolved
    automatic_pass: false

live_resize:
  diagnosis: CORE_FOCUS_MIGRATION_TIMING_RACE
  policy_relief_applicable: false
  separate_repair_plan_required: true

这最后一行非常重要。

不能用 WebKit policy 给 Chromium live-resize“顺便豁免”。

19. Proposal必须列出“当前规则 vs proposed future rule”

例如：

项目	当前有效规则	Proposal
47 matrix	47/47 PASS	不改变 row count
WebKit plain Tab失败	qualification FAIL	历史 FAIL保留；另标 environment attribution
Environment-blocked assertion	gate FAIL	不归因产品，但仍 evidence insufficient
Capability promotion	禁止	仍禁止直到替代证据
ArrowRight	单次 native scroll assertion	是否适合作 deterministic oracle由 repeatability决定
Live resize	FAIL	真实 Core blocker，独立修复

这能避免 proposal 被误读为“降低标准”。

20. Proposal还必须明确“不建议的解决办法”

明确拒绝：

纯文本
把 WebKit全部删出 matrix
WebKit rows全部 N/A
自动把 environment-blocked算 PASS
使用 programmatic focus代替用户 Tab
使用 scrollLeft赋值代替键盘 scroll
Option/Alt+Tab
修改macOS系统设置
browser flags
改 Contract 来迁就当前 host
21. Proposal应给未来实施留出两个阶段

如果 iteration14 proposal以后被用户/独立 reviewer接受，也不能直接改代码。

必须另外授权：

Future Policy Implementation Plan

才允许考虑：

纯文本
SOP
QA checklist
Execution Prompt
Master Prompt
evidence schema
runner
validator
CI

如何同步。

Separate Live-Resize Repair Plan

只负责：

纯文本
MobileNav breakpoint focus race

二者不得混在一起。

22. Integrity checks

iteration14执行前后必须核对：

纯文本
Starter source manifest identical
19 product file hashes identical
Contract SHA identical
matrix SHA identical
runner SHA identical
package/package-lock identical
SOP/Prompt identical
qualification evidence SHA identical

并写入：

纯文本
integrity-check.json

任何一个变化：

纯文本
STOP
23. ArrowRight control也不能成为隐藏 dependency/test

arrowright-repeatability-control.mjs：

纯文本
只存在 template/codex/executions/...

不加入：

纯文本
package scripts
CI
Vitest
Starter tests

使用当前已经安装的 Playwright即可。

24. Acceptance criteria — iteration14

只有以下全部满足才可以发送 STATE: EXECUTED：

YAML
iteration14:
  product_delta: 0
  contract_delta: 0
  matrix_delta: 0
  runner_delta: 0
  dependency_delta: 0

  qualification:
    rerun: false
    frozen: 36_PASS_11_FAIL

  policy_proposal:
    distinguishes_contract_from_oracle: true
    distinguishes_product_from_environment: true
    preserves_truthful_failures: true
    environment_blocked_never_equals_pass: true
    alternate_evidence_required: true
    human_gate_preserved: true
    assembled_gate_preserved: true
    live_resize_not_excused: true

  arrowright_control:
    fresh_webkit_processes: 10
    valid_controls: 10
    result_recorded_truthfully: true

  capability_promotion: NONE
25. STOP conditions

立即 STOP，如果：

纯文本
需要修改 product/SOP/Prompt/Contract
需要改 matrix/runner
需要重跑47 qualification
需要 browser flag
需要OS设置
需要替代浏览器/version

ArrowRight任一 control无效
ArrowRight script偷偷读取/依赖 Core DOM

proposal试图把 environment-blocked映射为 PASS
proposal试图修改 Contract语义
proposal给 live-resize免责
proposal把人工/assembled gate删除

ArrowRight 10轮出现 mixed结果不是 STOP。

那正是有效结论：

纯文本
NATIVE_ARROW_NONDETERMINISTIC
26. iteration14 EXECUTED handoff

Codex完成后停止：

纯文本
[C2C]
STATE: EXECUTED
TASK_ID: c2c_a765
ITERATION: 14
WORKSTREAM: WS-06A verification-policy decision

PRODUCT_DELTA: 0
QUALIFICATION_MATRIX: unchanged 36 PASS / 11 FAIL
POLICY_STATUS: PROPOSAL_ONLY

附上：

纯文本
plain-Tab proposed disposition
ArrowRight 10-run control result
recommended future policy

不得写：

纯文本
WS-06A ACCEPT
AX-01 PASS
AX-02 PASS
AX-03 PASS

然后我会独立审查：

10次 ArrowRight raw结果；
proposal有没有偷换 Contract；
是否把环境问题误当PASS；
是否保留现有11 FAIL；
是否正确隔离 live-resize Core defect；
0 product delta是否真实。

只有 proposal 本身经过独立 ACCEPT 后，才值得另开“policy implementation”有限计划。Live-resize Core repair也必须是另一份单独计划。
