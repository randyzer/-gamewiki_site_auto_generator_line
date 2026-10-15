# WebKit 验证策略提案 V1

状态：PROPOSAL_ACCEPTED_NOT_IMPLEMENTED；已获实际ChatGPT独立ACCEPT，策略权威尚未生效。所属：V2.7 / WS-06A / c2c_a765 / iteration14。

本提案建议把产品键盘要求、验证机制和引擎/宿主输入条件分别记录。它不改变当前有效规则，不授予任何能力 PASS，不解除 WS-06A 的 BLOCKED 状态。即使本提案获得 ACCEPT，也只表示提案通过审查，实施必须另有有限计划和授权。

## 1. 冻结事实及证据来源

当前资格记录为47项执行、36 PASS、11 FAIL、0 NOT_RUN、0 skip。当前 Starter、SOP、QA、Execution Prompt、Master Prompt、CI 和 validator 的47/47要求继续有效。

| 冻结对象 | 身份 |
| --- | --- |
| Starter分支 / HEAD | v2.7/evolution / b067e8d4050478072f25a1dc78a8526cdd128cfd |
| Starter源清单SHA256 | 796b1a6e39ca2df4141e4e65ea4cf2fc70c9d510d3018fef38c3fd60612cfed8 |
| Canonical Contract SHA256 | 1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c |
| 47-row matrix SHA256 | 000b8edd53f4eb99e569f81997dbefa2acbb304d38af61e4d9f9a05addf84371 |
| Qualification runner SHA256 | 93b0200d5cec806091fd55ad5f4fd5da7dd835cba6aeefc5517efa76ec31d33c |
| 36/11资格证据SHA256 | c24c2371ff8a52453582468165f0f2fb93918ea69bf59fd35e4f511b0bb00cf9 |

依据的权威文件是 `Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md`（§H AX-01/02/03、§W及开篇证据说明、§Y、§AA），现有 Starter `scripts/core-browser-matrix.ts`、`scripts/run-core-browser-evidence.ts`、`scripts/core-browser-evidence.ts` 和 `docs/CORE_BROWSER_EVIDENCE.md`，以及 SOP/QA/Execution Prompt/Master Prompt 的 WS-06A 规定。

诊断依据是上一轮 `template/codex/executions/v2.7-ws06a/iteration13/` 下原始 native-focus、table-arrowright、三个resize trace和实际独立审查，以及本轮同目录 `arrowright-repeatability.json`。全部绑定当前源和工具；不引用所有 Safari/WebKit 的一般行为。

## 2. 三层含义与覆盖关系

| 层次 | 内容 | 不能推导的结论 |
| --- | --- | --- |
| Contract requirement | 用户必须能操作产品、看到焦点、完成所需路径 | 一个具体键名就是整个要求 |
| Verification mechanism | 当前通过普通Tab到链接、ArrowRight使容器原生滚动等断言收集证据 | 机制失败必然是Core缺陷 |
| Engine/host input profile | 在不加载Core的原生对照中，该输入路径是否实际可用 | 环境阻塞表示产品合格 |

| 能力 | 原有要求与责任 | 对照覆盖及缺口 |
| --- | --- | --- |
| AX-01 | 使用可关闭移动导航时，支持键盘操作、Escape、焦点恢复、真实展开状态；Core实现，Acceptance Gate验证 | 原生Tab对照只能诊断链接输入条件，不能证明菜单Escape、展开状态或恢复正确 |
| AX-02 | skip link、可见焦点、reduced motion、可用触控目标；自动+人工测试 | Tab对照不证明skip激活后的顺序路径；自动outline/几何不替代视觉质量、对比度等人工验证 |
| AX-03 | 支持断点上的overflow及keyboard-path完整性；Core + ASSEMBLED PROJECT，浏览器E2E | 原生ArrowRight对照只能判断该机制的输入条件；不证明Core可用，更不证明组装站E2E |

本地表格的键盘可用性仍须真实验证。程序化scrollLeft有效只证明几何可以滚动，不证明用户能用键盘滚动。已有整页overflow成功也不覆盖此缺口。

## 3. 建议原则和诊断层

P1：先确认最小原生对照中的输入前提，再归因产品、环境或harness。对照本身无法提供输入时，不直接归因Core，也不自动授予PASS。

P2：未来可以增加独立诊断层，但保留资格结果。建议的诊断disposition为 `PRODUCT_FAILURE`、`ENVIRONMENT_PROFILE_BLOCKED`、`HARNESS_FAILURE`、`PRODUCT_EVIDENCE_UNRESOLVED`。这些词不是Contract §W outcome，也不是现有PASS/FAIL/NOT_RUN的替代。

P3：`ENVIRONMENT_PROFILE_BLOCKED`只说明自动证据不足以判断产品失败。它不表示产品通过。现有能力台账不重写；未取得完整要求证据与Verification Owner判断前，verifiedOutcome保持null。不得以NOT_APPLICABLE、NOT_SELECTED或EXCEPTION掩盖适用要求失败。P0/P1普通失败不可豁免。

P4：按引擎版本、修订、宿主、输入机制、页面/viewport逐项记录。不能把一项输入条件扩展为整台WebKit不可测，也不能删掉WebKit的其他可执行断言。

P5：新证据必须是独立、真实、可定位的用户操作记录；诊断、实施ACCEPT、合成项目成功和机器测试数均不等于能力/组装项目/发布PASS。

## 4. Plain Tab建议处置

第13轮在当前Playwright WebKit26.6/rev2359 + 当前宿主上，最小原生可见anchor的tabIndex=0，程序化focus能取得焦点，普通Tab仍跳过anchor；实际Core在390和1280也跳过链接。相同最小对照Chromium/Firefox可达。

因此建议未来记录：当前qualification FAIL原样保留；diagnosis为ENGINE_HOST_KEYBOARD_PROFILE；对该已观察到的输入缺失不直接作Core缺陷归因；独立disposition为ENVIRONMENT_PROFILE_BLOCKED；automatic_product_pass=false；alternate_evidence_required=true。

这不等于导航实现已通过。在真实浏览器中仍需证明用户能按顺序到达目标、看到焦点、完成required interaction。不得用DOM tabIndex或程序化focus代替真实键盘路径。

## 5. ArrowRight有限重复性控制与结论

本轮只用当前已安装Playwright1.63.0、WebKit26.6/rev2359、Node22.22.0；viewport390×844。启动并关闭10个独立WebKit browser process，每轮fresh context/page，原生HTML仅包含width320/overflow-x:auto/tabindex0容器和min-width780表格。不加载Core，不创建fixture、不启动Astro，不访问Starter页面。

每轮普通Tab恰好一次、ArrowRight恰好一次；此前无程序化focus或scroll。采样before/immediate/next-frame/~50ms/~200ms/~500ms，保留实际performance时间，记录焦点、宽度、overflow和收到的键。没有重试、第二次ArrowRight、参数或OS设置改动。

实际结果：10/10 control有效，0/10 native scroll；分类NATIVE_ARROW_UNAVAILABLE。全部满足activeElement=#scroll、overflowX=auto、scrollWidth780>clientWidth320、单一ArrowRight事件到达；10轮context/browser均正常关闭。原始每轮数据和日志单独保存在本轮文件，不覆盖第13轮。

这表示本次10个fresh-process控制中native ArrowRight不可用，不能据此支持稳定的单次native-scroll产品oracle。第13轮曾观察到0→40的成功仍保留，它说明跨轮次条件/时序仍可能影响行为；本提案不宣称引擎永远不能ArrowRight滚动，不解释该异常的具体原因。

第13轮实际Core的390/1280均收到ArrowRight且正确容器有焦点，但500ms内scrollLeft=0；这些失败继续保留。未来建议标记PRODUCT_EVIDENCE_UNRESOLVED，拒绝通过单次ArrowRight结果直接认定Core bug，也拒绝授予PASS。`deterministic_native_oracle_supported=false`仅限当前控制条件。产品的实际键盘滚动能力仍需补充证据。

PLAN14规定的其他结果分支也保留在决策表：10/10滚动为NATIVE_ARROW_REPEATABLE（未来调查Core/context差异，仍不自动定bug）；1–9/10为NATIVE_ARROW_NONDETERMINISTIC；任一对照无效为CONTROL_INVALID并停止ArrowRight政策结论。不得为凑结论重复执行本轮控制。

## 6. 当前有效规则与未来建议

| 项目 | 当前有效规则/事实 | 建议未来规则；本轮不生效 |
| --- | --- | --- |
| 47项矩阵 | 47/47 PASS、0 FAIL/NOT_RUN/skip；当前36/11 | 保留全部47项覆盖及历史状态；诊断层与资格层并存 |
| Plain Tab失败 | qualification FAIL，阻塞gate | 该输入缺失按environment归因，产品证据仍不足 |
| 环境阻塞assertion | 原gate仍FAIL | 不自动归因Core、不自动PASS；必须补充真实证据 |
| ArrowRight | 单次原生滚动断言；当前Core失败 | 本轮0/10不支持其稳定输入前提；键盘可用性要求继续存在 |
| 能力提升 | 当前禁止 | 完整要求覆盖、替代证据、人工/组装门槛及owner判断齐备前仍禁止 |
| Live resize | 当前FAIL，Core焦点迁移时序竞争 | policy_relief_applicable=false；单独有限修复 |

不把真人报告写进旧自动行并修改其PASS，不把自动FAIL删除成“46/1”，不承诺未来矩阵必能全绿。若未来确需调整oracle/聚合规则，须新有限计划明确版本、覆盖映射、证据来源和验证办法，先经审查与授权，不能让本提案静默覆盖当前47/47规则。

## 7. 未来采用门槛

1. 由Requirement Owner确认验证机制仍覆盖原有Contract语义，Verification Owner定义并独立审查证据充分性；用户明确授权未来Policy Implementation Plan。提案ACCEPT不是该授权。
2. 对受环境阻塞的required keyboard assertion，补充真实用户键盘证据：可顺序到达目标、焦点可见、所需交互可完成，并注明真实浏览器/版本/宿主、输入方式、JS、viewport、来源/最终build身份、路线、实际操作、结果、reviewer和日期。仅记录“automation路径不可用”不能放行。具体证据通道及其授权由未来有限计划确定，本轮不自动切换工具或浏览器。
3. Core技术证据与真实组装项目分开。AX-02仍要求自动+人工可访问性测试；visual focus质量、contrast等human gate继续DEFERRED，不能被环境分类代替。
4. AX-03仍需assembled-site browser E2E。Core诊断或Field Notes不能替代WS-06B/WS-07真实项目、REF suite、PA-01或V2.7 release gate。
5. 缺证据维持null/未验证且阻塞，不准用条件不适用或异常豁免处理当前适用失败。改造的schema、runner、validator、CI、SOP、QA、Execution Prompt和Master Prompt须在单独计划同步，并验证缺失/未知证据不会被当PASS。
6. 完整采用记录必须包括：获批策略版本及owner、明确适用范围、原矩阵断言到新机制的覆盖映射、冻结历史失败、新执行结果、负例、manual/assembled gate证据和独立审核。后续source变化绑定新的source/build身份，不能沿用旧证据作为新版本验收。

## 8. 独立的Live-Resize Repair Plan

第13轮已独立确认CORE_FOCUS_MIGRATION_TIMING_RACE：浏览器可能在MQL回调前把隐藏导航焦点清成BODY，当前MobileNav只读取回调当下activeElement，丢失旧身份。正反方向均有风险。

这是真实产品行为问题，不能借WebKit政策免责。后续另制定范围极窄的修复计划，围绕保留可迁移导航身份并尊重用户主动离开导航的焦点选择；保留原assertion，不加长timeout或取消往返覆盖。本轮没有编写或执行该修复。

## 9. 明确拒绝的路径与停止条件

不删WebKit或整批标N/A，不把environment-blocked自动算PASS，不用程序化focus/scroll替代用户操作，不用Option/Alt+Tab、OS设置、browser flags或替代引擎版本迎合当前运行；不修改Contract，不移除人工/assembled gate，不给live-resize豁免。

本轮仅新增PLAN14列出的治理文件；任意产品/SOP/Prompt/Contract/roadmap/依赖/历史证据变化，或需要重跑47资格矩阵、无效控制、Core DOM依赖、越权工具/设置、自动PASS映射，立即停止。10轮mixed结果本身是有效诊断结果，不是继续扩展实验的理由。

当前工作流停止点：策略提案与原始控制提交独立审查；WS-06A仍BLOCKED；后续Policy Implementation Plan和Live-Resize Repair Plan分别另授权。没有其他workstream、提交、推送、标签、合并或发布动作。
