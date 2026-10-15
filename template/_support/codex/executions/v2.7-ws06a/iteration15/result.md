# WS-06A iteration15 — 有限修复计划已通过独立审查，未实施

用户授权第15轮仅制定Live-Resize Core Repair Plan。实际ChatGPT PLAN15已保存，实施规格为LIVE_RESIZE_CORE_REPAIR_SPEC_V1.md。当前没有源码实施授权，没有创建repair脚本；参考补丁只嵌入Markdown，未写入产品、未编译、未执行。

## 计划内容

未来产品范围严格两个文件：MobileNav.astro和tests/navigation-behavior.test.ts。计划定义先建立BODY race/intent撤销的红色回归，再进行inline controller窄修复和真实浏览器验证。只缓存mode/pageId/kind语义，fresh lookup目标；BODY回退须有有效导航意图、真实mode切换和仍存在的隐藏源；外部focus/pointer、同模式失焦及陈旧microtask均不得留下可复用旧身份。

为避免pointer点击非focusable区域后旧active仍留在nav时被live identity重新授权，参考补丁显式记录intentRevoked；新nav focusin才能重新授权。microtask只处理当时仍是同一语义记录的身份，不能复活或清掉新记录。保留Escape/native toggle、映射/fallback、same-document/ordinary navigation和no-JS结构。本文档仅是待实施候选，不代表运行正确或能力PASS。

未来验证包括：两个方向及完整往返、外部focus和pointer无焦点偷取、same-mode resize、过期目标、Escape缓存及Chromium/Firefox no-JS。先targeted unit和focused browser，再root check、两个采用门槛、完整未改47矩阵的新源证据。旧36/11永久保留；新源完整gate可因未实施WebKit策略而仍失败，修复专项需真实live-resize PASS且原非WebKit PASS无回归。策略实施不在该计划内。

## 本轮验证

只运行只读完整性和计划范围检查，没有执行未来参考补丁、unit/build或浏览器修复控制。235候选记录文件、19范围文件、743保护文件、冻结V2.6.5三件套、roadmap、第13/14轮22个证据文件前后一致；产品、authority、依赖零增量。源清单按现有runner方法独立计算仍796b1a6e39ca2df4141e4e65ea4cf2fc70c9d510d3018fef38c3fd60612cfed8。

完整性检查exit0，errors=[]；参考diff仅声明两个未来产品路径，无未指定迭代路径或TBD/TODO。Exact preimage SHA绑定在preflight/spec。原资格JSON hash仍c24c2371ff8a52453582468165f0f2fb93918ea69bf59fd35e4f511b0bb00cf9，即36PASS/11FAIL，没有重新运行或改写。

仅新增PLAN15列出的6个治理文件：prompts计划1项；iteration15目录SPEC/preflight/integrity/provenance/result5项。没有commit/push/tag/merge/release，没有WebKit策略/ArrowRight/Contract/matrix/runner/CI/SOP/Prompt变更。

## 独立审查与停止点

独立审查应读取规格中的完整候选差分和现有真实controller/tests，并对照第13轮事件顺序及第14轮停止点，重点检查pointer权限撤销、陈旧microtask、真实外部focus与BODY回退条件是否导致新focus theft。参考代码未运行，这一事实不得弱化未来红/绿、真实浏览器及完整回归义务。

计划接受后才可另行授权源码实施；当前WS-06A仍BLOCKED，47/47现行规则生效，WebKit提案未实施，AX/PA/assembled/REF/release无提升。本轮只完成规划与计划审查。

## 实际 ChatGPT 独立审查原文（第15轮）

来源：https://chatgpt.com/c/6abddfa5-02ac-83ee-9b18-0b6960427b4c
DOM节点：fallback-turn-10:2:assistant；完整回复结束后读取，未重写审查结论。

ChatGPT 说：

[C2C]
STATE: REVIEW
TASK_ID: c2c_a765
ITERATION: 15
WORKSTREAM: Live-Resize Core Repair PLAN ONLY
VERDICT: ACCEPT
SOURCE_IMPLEMENTATION: NOT AUTHORIZED
PRODUCT_DELTA: 0
QUALIFICATION: FROZEN 36 PASS / 11 FAIL

我已独立核对：

LIVE_RESIZE_CORE_REPAIR_SPEC_V1.md 中完整两文件候选 diff；
当前真实 MobileNav.astro；
当前 navigation-behavior.test.ts / navigation.test.ts；
iteration13 forward / reverse / roundtrip raw traces；
iteration15 result / preflight / integrity / provenance；
execution output 43。

结论：PLAN15 可以接受，足以进入下一轮单独的源码实施授权；但当前仍然没有任何源码实施授权。

1. Race 模型与 raw13 证据吻合

计划没有把问题误判成 timeout。

真实 forward failure 是：

纯文本
mobile child focused
→ breakpoint 已切到 desktop
→ browser 先把 hidden mobile focus 清成 BODY
→ MQL change callback 后到
→ 现有代码此时才读 activeElement
→ pageId 丢失

reverse / roundtrip又证明顺序不是固定的：有时 MQL 先拿到旧 nav focus，因此成功。

PLAN15 的核心修复方向：

纯文本
focusin 时提前保存 semantic identity
+
MQL 时消费 fresh identity

直接针对这个 race，没有改 breakpoint、没有延长等待、没有动 runner。

2. 不缓存 DOM，缓存 semantic identity：接受

候选只保存：

纯文本
mode
pageId
kind

然后在迁移时重新查询 DOM。

这比缓存旧 HTMLElement 安全，能正确覆盖：

target 被删除；
target disconnected；
destination hidden；
disclosure状态变化；
DOM中当前可见的对应节点发生变化。

同时 sourceFor(identity) 与当前真实 DOM结构匹配：

纯文本
mobile child → li[data-nav-page-id]
mobile Overview → 自身 data-nav-page-id
mobile group summary → Overview 的 pageId

desktop parent → li.desktop-nav__group[data-nav-page-id]
desktop child → li[data-nav-page-id]

不需要修改 DesktopNav markup，符合两文件范围。

3. “不偷焦点”的设计是这份计划最重要的优点

我重点挑战了这一点。

计划没有简单做：

纯文本
lastFocusedNav = ...
resize 后永远恢复

而是加入两种明确撤销：

外部真实 focus
纯文本
nav
→ brand/main/footer/其他外部 focus
→ pending identity revoke

所以之后 resize 不会把用户拉回 navigation。

外部 pointer intent

即使 pointer 点击一个不产生 focusin 的区域：

纯文本
pointerdown outside nav
→ revoke migration authority

这正好补足“只监听 focusin”的漏洞。

尤其候选还有：

纯文本
intentRevoked

避免发生这种错误：

纯文本
pointer 已表示离开 nav
但 activeElement 仍然碰巧是旧 nav
→ MQL handler 又从 live active 重新获得迁移资格

这个设计必要且合理。

4. BODY recovery 的条件足够窄

计划不是看到：

纯文本
activeElement === BODY

就恢复。

必须同时满足：

纯文本
已有有效 nav identity
+
identity 属于 outgoing mode
+
mode 已真正反转
+
原 source 重新查询后仍 connected
+
原 source 因 breakpoint 已隐藏
+
用户 intent 未撤销

这与 raw13 failure十分贴合。

同时 same-mode BODY loss：

纯文本
mobile nav focus
→ BODY
→ 当前仍 mobile mode

microtask 会 revoke。

因此不能隔很久后 resize 再复活 stale identity。

这是正确的 fail-safe。

5. Microtask stale-record guard：设计正确

候选使用：

纯文本
const observed = pendingIdentity

queueMicrotask(() => {
  if (pendingIdentity !== observed) return;
  ...
});

这一点很关键。

例如成功迁移：

纯文本
old mobile focusout
→ old microtask queued

MQL handler
→ focus desktop parent
→ focus desktop child
→ focusin creates NEW pendingIdentity

old microtask eventually runs

它看到：

纯文本
pendingIdentity !== observed

便退出。

所以旧事件不会把刚产生的 desktop identity 清掉。

iteration13 roundtrip恰好需要这种保护。

6. Escape / native close 语义没有被破坏

候选没有重写现有：

纯文本
Escape
toggle
click
same-document
ordinary navigation

而是利用这些操作已经存在的 .focus() 来触发新 focusin 记录。

因此：

纯文本
child
→ Escape
→ group summary

identity自然更新到 group。

再：

纯文本
Escape
→ Menu summary

identity更新为 trigger。

之后 resize不会错误恢复旧 child。

计划的 unit case 与 R10 都覆盖这一点，设计合理。

7. Same-mode resize 明确不会触发迁移

候选仍然只监听：

纯文本
matchMedia("(max-width: 900px)").change

没有新增 generic：

纯文本
window.resize

而且增加：

纯文本
if (mode === previousMode) return;

所以：

纯文本
899 → 850
901 → 1200

不应该：

close menu；
-改变 focus；
-触发 migration。

R7/R8 对这个副作用有真实浏览器 Gate。

8. Stale/disconnected fallback 边界是合理的

Fresh target 要求：

纯文本
HTMLElement
isConnected
有 rect
visibility != hidden
display != none

destination不存在：

纯文本
→ 仅 fallback visible brand

brand也不可用：

纯文本
→ 不 throw
→ 不找随机 nav link
→ 不强行 focus

这个 fallback范围足够窄。

尤其值得保留：

source identity本身已经 stale/disconnected 时，不允许利用旧 pageId迁移。

这避免“DOM已经变了，但缓存身份继续抢焦点”。

9. Unit test fidelity：可以接受，但不能作为最终证明

参考 test fixture不是完美浏览器模型，例如：

hidden element 的 native focus清理不是自动发生；
<details> toggle task timing没有完整模拟；
CSS display/focus规则只是 stub；
pointer → click → focus的浏览器事件顺序不完全还原。

但计划没有把 unit tests 当最终证据。

正确的验证链是：

纯文本
RED unit
→ GREEN unit
→ focused real-browser R1–R10
→ no-JS N1/N2
→ root/adoption regression
→ fresh unchanged 47-row runner

因此 stub局限被 real-browser gate补上。

尤其 R6 会捕获一个 unit stub可能漏掉的重要问题：

pointer已经撤销迁移，但 close(mobile) / native toggle 是否还会间接把 hidden focus恢复进 navigation。

如果真实浏览器出现这种情况，R6必须 FAIL并 STOP。

所以参考 diff即使还有实现细节需要在实施轮微调，也不会被 unit green掩盖。

10. Firefox R1/R2/R3 可以保留

虽然 frozen qualification 的 live-resize row只有 Chromium，但修复修改的是所有浏览器都会执行的共享 MobileNav controller。

额外让 Firefox跑：

纯文本
forward
reverse
roundtrip

是合理的回归保护，不属于 WebKit policy implementation，也没有改变 47-row matrix。

它应该被理解为：

repair-specific safety evidence，

而不是新增 Contract capability outcome。

11. No-JS验证边界正确

此次修复只允许：

纯文本
<script is:inline>

内部变化。

Markup：

纯文本
details
summary
anchors
href

全部冻结。

因此 Chromium + Firefox 的 JS-disabled keyboard check是合适的回归。

没有因为 WebKit已知 host profile又重新打开 WebKit policy问题。

12. 两文件范围成立

未来 product scope严格是：

纯文本
src/components/navigation/MobileNav.astro
tests/navigation-behavior.test.ts

当前：

纯文本
PRODUCT_DELTA = 0
AUTHORITY_DELTA = 0

我确认相关 frozen hashes保持：

纯文本
MobileNav
05b304...

navigation-behavior
dafbd7...

Starter manifest
796b1a...

Contract
1ff2bd...

matrix
000b8e...

runner
93b020...

历史 qualification evidence仍为：

纯文本
c24c237...
36 PASS / 11 FAIL

没有执行参考 patch、没有测试 repair、没有资格重跑。

13. 一项实施时必须坚持的解释

我接受 PLAN，但参考 Markdown diff应继续被视为：

reviewed candidate implementation，不能被视为逐字符强制实现。

原因是 real-browser R1–R10 才能揭示诸如：

纯文本
toggle event timing
hidden focus native behavior
pointer + disclosure interactions

这类 stub无法完全模拟的细节。

如果未来实施时候选代码在 R1–R10 暴露问题，可以在：

纯文本
同一个 MobileNav.astro
+
同一个 navigation-behavior.test.ts

范围内做最小修正，只要：

不改变本 PLAN 的语义；
不弱化断言；
不引入第三个 product file。

若需要改变 repair model，就必须 STOP，而不是现场扩展。

14. 未来实施轮的正确验收顺序

这部分 PLAN15 定义得正确：

纯文本
1. 保存 exact preimages

2. 只应用新增 tests
   → old controller必须出现真实 RED

3. 应用 controller repair
   → targeted GREEN

4. focused real-browser:
   R1–R10 + N1/N2

5. npm run check

6. verify:unadopted-final

7. verify:adopted-final

8. git diff --check

9. new-source fresh 47-row qualification

特别是第2步非常重要。

如果旧 controller 在新 race tests上居然全部 GREEN：

纯文本
STOP

说明测试没有真正重现问题，不能继续应用代码然后宣布修复。

15. Fresh 47-row 的预期也没有被过度承诺

未来 source一旦变化，旧 36/11 不能验收新源码，这一点正确。

必须生成新 evidence。

由于 WebKit policy还没实施，fresh run仍可能非零。

因此 repair success应该看：

纯文本
Chromium live-resize row → PASS

此前所有 non-WebKit PASS → 不回归

无新 failure category

而不是强行要求：

纯文本
47/47

也不能提前写死：

纯文本
37/10

这一处理是正确的。

PLAN15 独立 verdict
YAML
WS06A_LIVE_RESIZE_REPAIR_PLAN:
  verdict: ACCEPT

  current_state:
    source_implementation: NOT_AUTHORIZED
    product_delta: 0
    authority_delta: 0
    qualification: 36_PASS_11_FAIL

  future_scope:
    product_files: 2

  design_review:
    root_cause_alignment: PASS
    semantic_identity: PASS
    stale_target_safety: PASS
    microtask_race_safety: PASS
    outside_focus_safety: PASS
    pointer_intent_safety: PASS
    same_mode_safety: PASS
    escape_close_semantics: PASS
    fallback_bounds: PASS
    no_js_preservation: PASS

  verification_design:
    red_green: REQUIRED
    focused_real_browser: REQUIRED
    no_focus_theft: REQUIRED
    full_regression: REQUIRED
    fresh_47_row_evidence: REQUIRED

  forbidden:
    webkit_policy_implementation: true
    arrowright_change: true
    contract_change: true
    matrix_change: true
    runner_change: true
    capability_promotion: true

正式结论：

纯文本
[C2C]
STATE: REVIEW
TASK_ID: c2c_a765
ITERATION: 15
WORKSTREAM: Live-Resize Core Repair PLAN ONLY
VERDICT: ACCEPT
SOURCE_IMPLEMENTATION: NOT AUTHORIZED
WS06A_STATUS: BLOCKED
QUALIFICATION: 36 PASS / 11 FAIL

下一有限决策可以是：单独授权 iteration16，严格按已接受 PLAN15 在这两个 product files 内实施 Live-Resize repair。 WebKit policy仍不得在 iteration16 一并实施。

## 最终检查点

PLAN15独立审查ACCEPT。本轮产品/权威/依赖零增量，无修复测试或资格重跑，原36PASS/11FAIL保持。参考补丁仅为已审查候选；未来可在同样两个文件内修正真实验证暴露的细节，不改变语义、不弱化断言；模型或范围改变立即STOP。源码实施仍NOT_AUTHORIZED。下一有限决策是单独授权iteration16执行该两文件修复及其红/绿、focused browser、完整回归和新47项证据；不得同时实施WebKit策略。
