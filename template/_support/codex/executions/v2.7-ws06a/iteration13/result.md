# WS-06A iteration13 — 诊断获独立 ACCEPT，WS-06A 仍 BLOCKED

用户授权第13轮有限诊断；实际 ChatGPT PLAN13 保存在 /Users/randyz/work/coding/hot_words_web/template/codex/prompts/v2.7-ws06a/iteration13-diagnostic-plan.md。本轮只写治理证据，产品增量为0。WS-06A 仍 BLOCKED，原47项资格证据仍36 PASS / 11 FAIL；未重跑或修改资格矩阵，未提升能力或发布。

## 已执行与结论

- **WebKit plain Tab：ENGINE_HOST_KEYBOARD_PROFILE。** 最小原生页和实际 Core 的390/1280两个视口均跳过链接；Chromium/Firefox可达。最小页链接、按钮可程序化聚焦，该对照仅用于诊断。结论限定当前安装的引擎/宿主组合。
- **WebKit ArrowRight：INCONCLUSIVE。** 第一次有效启动的原生探针记录不滚动，但fixture因执行目录错误创建失败；完整执行的原生探针则滚动到40。原始日志保留两次结果，部分尝试JSON已被完整尝试JSON覆盖，不声称部分尝试具有完整原始时间线。实际 Core 两个视口均收到键且wrapper为activeElement，但500ms内scrollLeft保持0；程序化32对照有效，Chromium/Firefox实际Core均滚动。不能将这些证据统一归为宿主原生滚动差异，也尚未唯一确定Core原因；停止扩大实验。
- **Chromium resize：CORE_FOCUS_MIGRATION。** 独立正向899→901时，F1–F6成立但最终焦点BODY；独立反向901→899成功到Menu。完整往返正向成功、反向失败至BODY，说明两方向都有时序风险。失败序列在MQL事件前已出现focusout和BODY；成功序列的旧导航焦点保留到MQL事件，再迁移。当前MobileNav只在MQL回调内读取activeElement，可能读不到已隐藏导航的历史焦点身份，这是依据源码和原始事件顺序作出的原因推断；没有修改源码。

## 验证与范围

当前工具：Node22.22.0、Playwright1.63.0；Chromium153.0.8010.12/rev1243、Firefox155.0/rev1543、WebKit26.6/rev2359。三个实验均使用已安装引擎、真实Tab和键盘，不添加浏览器参数、替代浏览器或系统设置。

使用现有helper创建一次采用后的Field Notes最终构建，npm run build实际exit0。source/dist哈希全程固定，禁止的构建marker及未批准legal routes不存在。source manifest前后均796b1a6e39ca2df4141e4e65ea4cf2fc70c9d510d3018fef38c3fd60612cfed8。

三个候选目录235个记录文件、当前19个范围文件的SHA/权限/符号链接、HEAD/tree/branch均与preflight一致；原V2.6.5三件套和743个保护文件通过核对。Contract、矩阵、runner、依赖及锁文件均零增量；原36/11资格文件哈希未变。

预览自身PID39766正常Astro stop，exit0，无fallback signal，PID已消失并经独立kill(pid,0)检查确认；fixture已删除。

## 执行尝试记录

1. 从workspace用tsx/esm入口启动：exit1，ERR_REQUIRE_CYCLE_MODULE，未运行实验。
2. 改用同一已安装tsx完整入口，从workspace启动：exit1。最小原生探针运行后，既有helper因cwd非Starter而失败；临时fixture由helper清理，没有启动preview。
3. 使用同一tsx入口，在Starter根目录执行：exit0，有限诊断完成。完整命令：

```sh
PATH=/Users/randyz/.nvm/versions/node/v22.22.0/bin:$PATH node --import /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/node_modules/tsx/dist/loader.mjs /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws06a/iteration13/diagnose-ws06a.ts
```

stdout/stderr三次合并保留在diagnostic.log，没有覆盖失败日志。没有再次运行全量check或47项qualification，因为产品字节没有变化。

## 审查入口

请先独立读取native-focus-profile.json、table-arrowright-profile.json和三个resize原始trace，再核对diagnose-ws06a.ts、preview-cleanup-audit.json、preflight.json、provenance.json及冻结产品源码。classification.json仅是Codex解释，不能代替原始证据。

此前PROJECT_STATE.md的第12轮停止记录保持原样；本次最新有限结果以该目录为准。第14轮、产品修复、verification policy调整均尚未授权；本轮未提交、推送、打标签或合并。


## ChatGPT 实际独立审查全文（第13轮）

ChatGPT 说：

[C2C]
STATE: REVIEW
TASK_ID: c2c_a765
ITERATION: 13
WORKSTREAM: WS-06A DIAGNOSIS
VERDICT: DIAGNOSIS ACCEPTED / WS-06A STILL BLOCKED

我独立读取了三次 execution output、raw native-focus profile、ArrowRight profile、三份 resize trace、diagnostic script、cleanup、preflight/provenance，以及冻结的 MobileNav.astro / qualification runner。本轮 PRODUCT_DELTA=0 成立，36 PASS / 11 FAIL 资格结果未被改写。

三个分类的独立结论
Blocker	Codex 分类	我的复核
WebKit plain Tab	ENGINE_HOST_KEYBOARD_PROFILE	确认
WebKit ArrowRight	INCONCLUSIVE	确认
Chromium live resize	CORE_FOCUS_MIGRATION	确认，而且证据已经比较强
1. WebKit plain Tab：确认是当前 engine/host profile

最小原生页面没有任何 Starter CSS/JS，普通 <a> 的 tabIndex=0、可见，并且程序化 .focus() 可以真实获得焦点；但 plain Tab 仍跳过 link。Chromium/Firefox 在同一个最小实验里能 Tab 到 link。

实际 Core 在 390 和 1280 同样表现为 WebKit plain Tab 不进入普通链接路径。

所以目前证据支持：

纯文本
当前 Playwright WebKit 26.6 / rev2359
+ 当前 host
→ ordinary plain-Tab profile skips ordinary anchors

这不是当前 Game Site 某个 link 实现错误的证据。

但这个结论只适用于当前 engine/host 组合，不能推广成“所有 Safari/WebKit 都这样”。

2. WebKit ArrowRight：维持 INCONCLUSIVE

完整有效 run 中，WebKit 最小 native container：

纯文本
scrollLeft:
0
→ 9 @ ~50ms
→ 36 @ ~200ms
→ 40 @ ~500ms

证明 WebKit 本身能够对这种最小 scroll container 执行 native ArrowRight 横向滚动。

而同一完整 run 的 Core：

纯文本
390px:
active = true
key = ArrowRight
scrollLeft = 0 through 500ms

1280px:
同样 = 0

且程序化 scrollLeft=32 有效，所以 Core .table-scroll 的几何本身确实可滚。

如果只有这一轮完整证据，我会明显偏向：

纯文本
CORE/context difference

但不能正式分类成 CORE，因为第二次启动、在 fixture cwd 错误之前执行的同一个 minimal native probe记录的是：

纯文本
WebKit nativeScrolled = false

随后完整启动则变成 true。

两次使用的是同一 installed WebKit 和同一 probe代码；第一次只缺少完整 raw timeline，因为后来的完整 JSON 覆盖了 partial JSON，留下的只有 execution/log 结果。

因此这里存在真实重复性矛盾：

纯文本
minimal WebKit native ArrowRight:
attempt A = no scroll
attempt B = scroll

现在把问题归因于 Core还缺一个稳定 control。

所以 Codex 的：

纯文本
INCONCLUSIVE

是正确且更严谨的结论。

3. Live resize：确认是 Core focus-migration race

这一项证据已经从“generic timeout”升级成非常明确的 source-level timing问题。

当前 MobileNav.astro 的核心逻辑是：

纯文本
matchMedia change callback
→ const active = document.activeElement
→ 根据 active 属于 mobile/desktop 决定迁移焦点

问题在于浏览器隐藏当前 focused nav 后，focus丢失和 MQL callback 的先后并不稳定。

独立 forward 899 → 901：

纯文本
mobile child focused
↓
viewport changed
↓
focusout happens
↓
activeElement becomes BODY
↓
resize event
↓
MQL change
↓
handler now sees BODY
↓
cannot recover old mobile pageId
↓
desktop matching target exists + visible
BUT focus remains BODY

反向独立 901 → 899 恰好时序有利：

纯文本
MQL callback触发时
desktop child仍然是 activeElement
↓
Core成功识别 desktop.contains(active)
↓
focus → mobile Menu

而 roundtrip 又展示了反过来的情况：

纯文本
899→901: 成功
901→899: focus先丢成 BODY，再到 MQL
→ reverse失败

这说明不是固定“forward坏、reverse好”，而是：

两方向都依赖浏览器在 MQL callback 前是否已经因为 CSS visibility/display变化而清掉 activeElement。

因此更精确的分类是：

纯文本
CORE_FOCUS_MIGRATION_TIMING_RACE

Codex 的 CORE_FOCUS_MIGRATION 没错。

iteration13 本身通过范围审查

我也确认：

纯文本
productDelta = 0
contractDelta = 0
matrixDelta = 0
runnerDelta = 0

Starter source manifest前后均为：

纯文本
796b1a6e39ca2df4141e4e65ea4cf2fc70c9d510d3018fef38c3fd60612cfed8

Canonical Contract继续是：

纯文本
1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c

47-row qualification evidence hash被冻结，没有重跑 qualification。

Preview cleanup也真实闭合：

纯文本
PID 39766
astro stop exit 0
alive before = true
alive after = false
fallback = false
fixture removed = true

前两次 diagnostic启动失败也被保留，没有伪装成一次完美执行。

WS-06A 现在的真实状态
YAML
WS06A:
  status: BLOCKED

  qualification:
    pass: 36
    fail: 11
    matrix_changed: false

  webkit_plain_tab:
    classification: ENGINE_HOST_KEYBOARD_PROFILE
    core_repair_justified: NO

  webkit_arrowright:
    classification: INCONCLUSIVE
    core_repair_justified: NOT_YET

  chromium_live_resize:
    classification: CORE_FOCUS_MIGRATION_TIMING_RACE
    core_repair_justified: YES

  capability_promotion:
    AX01: NO
    AX02: NO
    AX03: NO
    PA01: NO
下一步应该分成两个决策，不要混在一次修复里

决策 A：先解决 verification policy。 WebKit plain-Tab 已证明是当前 engine/host 的 native profile，而不是 Core link defect；ArrowRight 又表现出 native probe重复性不稳定。因此下一轮如果继续，应该先决定 WS-06A 到底要验证“产品可键盘操作性”，还是强制验证某一 host 上的 plain-Tab/native ArrowRight 默认行为。这属于 verification-policy / oracle层决策，不应该靠改 Core去迎合环境。

决策 B：live-resize 可以单独进入一个极窄 Core repair。 这里已有足够证据说明当前实现依赖 MQL callback 时的 document.activeElement，存在确定性的时序脆弱性。后续修复应该围绕“在焦点因为 breakpoint隐藏前保留可迁移的 nav identity”，而不是加 timeout或修改 qualification assertion。

我的建议顺序是：先做 WebKit verification-policy decision，再授权 live-resize 的窄 source repair；ArrowRight在 policy decision 中一并决定是否还需要一次稳定性复验。

当前不需要回退 iteration12/13，也不应进入 WS-03/06B。


## 本轮停止点

第13轮有限诊断与真实独立审查已闭合。下一步先明确WebKit verification policy，再单独制定live-resize的极窄Core修复计划；ArrowRight稳定性复验是否需要由下一有限计划明确。第14轮尚未授权，未开始，当前无产品修复或oracle编辑授权。
