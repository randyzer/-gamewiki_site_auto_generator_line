# WS06B ABC Remaining Acceptance Gates V1

执行：Codex，`c2c_a765` / PLAN53；前序 REVIEW52 ACCEPT — S5 TARGETED ASSEMBLED TECH EVIDENCE。日期：2026-10-08。

**READ ONLY EVIDENCE REVIEW / NO IMPLEMENTATION — READY_FOR_INDEPENDENT_REVIEW。**本轮仅新增本文；无测试、构建、浏览器、截图或大型 hashing。本文的 VERIFIED / REUSABLE / PENDING / NOT_RUN / BLOCKED 是证据盘点分类，不是新 Registry outcome、不关闭任何 Gate。

## 1. 证据权威与身份

需求权威：[V2.7 SOP Product Contract][contract] §V / §W（§U 人审及 §Y 发布阻塞保留），执行解释：[Amendment][amendment]；已接受的最小 Reference 设计：[design][design]。早期 [gap inventory][gaps] 中“REF 尚不存在”等是当时快照，由 S1–S5 新证据补齐其精确范围，原文不重写。

| 证据代号 | 实际来源 / 已接受范围 |
| --- | --- |
| A1/A2 | [REF-A report][a]；S1 seed 7/7，S2 actual UI capture + final binding 7/7；REVIEW48/49 TECH，非视觉/Human接受 |
| B3 | [REF-B report][b]；工具/任务 4/4、Chromium desktop/mobile valid/invalid/empty/keyboard，REVIEW50 TECH |
| C4 | [REF-C report][c]；三系统/三guide、从实际 Inventory 独立计分与关系顺序、390/900px nested Tab/Escape，3/3，REVIEW51 TECH |
| S5 | 三报告追加章节及 [actual ABC observations][observations]；Chromium 六组桌面/移动旅程与四组广告槽几何，3/3，REVIEW52 TARGETED TECH；不代表全部浏览器/广告验收 |
| Independent 48–52 | [REVIEW48+PLAN49][r48]、[REVIEW49+PLAN50][r49]、[REVIEW50+PLAN51][r50]、[REVIEW51+PLAN52][r51]、[REVIEW52+PLAN53][r52] 原文保存在工作区外；不是 Codex 自签接受 |

共同 Candidate branch `v2.7/evolution`，HEAD `b067e8d4050478072f25a1dc78a8526cdd128cfd`，tree `1df0ade30b1eaf51a76820c8d8b83337786f0dc1`；实际源为含 accepted About repair 及既有 untracked runtime files 的 working tree。HEAD 不是全部源，iteration33 是历史源。S1–S5 production diff 未变化；测试/报告是 dev-only增量。

| Reference | 已接受实际输出（本轮只读；evidence mode，非final） | S5 small-output identity |
| --- | --- | --- |
| A | [S2 default final evidence output][outa] | `722b3b4c836d9a0fc0ee79103c0e8f3da52f005820be4a42589ad592cb4975f5` |
| B | [S3 evidence output][outb] | `0c280f581ecaadb16f17f3cd3a6e0467f15c701c63dea2d324cc5a902bbe8a6c` |
| C | [S4 evidence output][outc] | `2ddd49cbd263c4f02170dcd7c849d2333593d7d8d93e4f2926bf4aa6e8bbc32d` |

以上引用 S5 sorted relative-path + NUL + bytes 算法的已有身份，没有本轮重新 hashing；不同旧算法的 hash 不冒充相同值。S5 实际观察为 Chromium153.0.8010.12、Playwright1.63.0、1280×960/390×844、JS enabled、reducedMotion reduce。C4另有900×960。有效输出的 marker 均 `mode=evidence/final=false`；strict validate 拒绝 Human-pending（A2两项、B3一项、C4两项），不是最终validate PASS。

## 2. REF-A：§V逐项对照

每行 VERIFIED 只指列出的局部事实，含 PENDING/NOT_RUN 的复合要求仍未完整满足。

| §V要求 | 分类 | 精确已有证据 | 剩余 / 不可推导 |
| --- | --- | --- | --- |
| editorial home / browsing depth | VERIFIED + PENDING | A1/A2 home useful authored links；S5 home→items/maps/detail/guide真实点击 | 人审内容价值/站点完整性仍待签署，不从链接数推导 |
| 两taxonomy hubs | VERIFIED | A1 `/items/`、`/maps/`各有真实QA对象；S5两hub可达 | 不是新动态hub或第四Pattern |
| 至少三distinct object/details | VERIFIED | A1 Amber Lantern/Relay Cell/East Circuit facts与不同用途、成本、地点 | QA事实不是商业游戏事实 |
| published/updated/version | VERIFIED | A1 schema日期顺序负例、输出freshness、QA patch/revision | source access不是verifiedAt；旧live模型未恢复 |
| manual/tag relation | VERIFIED | A1实际显式related IDs与渲染顺序，Sources公开 | 自动推荐算法未实现/非要求 |
| eligible FAQ可见 | VERIFIED | A1输出FAQ；S5 A2视口click open + focused Enter close | 全engine/全部键盘覆盖仍缺 |
| 有效404恢复目标 | VERIFIED + REUSABLE | A1/A2实际unknown404，三个恢复目标HTTP200；S5 unknown404 | S5没有逐一键盘点击404恢复；完整AX未证明 |
| provenance screenshot | VERIFIED + PENDING | A2 seed真正capture PNG1280×5277，sha固定；final consumer字节相等，caption/provenance | 不是gameplay截图；独立像素质量/Human未接受 |
| 独立cover/key-art | VERIFIED + PENDING | A1 coverSVG1200×630与figure/PNG不同，home hero/default share | Human usefulness/identity仍PENDING |
| inline explanatory figure / alt/caption/source | VERIFIED（现有gallery中的解释性figure）+ PENDING | A1 figure960×540、Manifest guide gallery；S5加载/尺寸/caption；源码未新增定位模型 | 无任意MDX中间插图新consumer；独立review按已接受design判断该placement，Human使用审批未签 |
| deliberate no-media / accepted MC-04 rationale | VERIFIED技术 + PENDING接受 | A1 source-check正文自足、无正文hero/gallery/trailer、记录MC-04文字日期任务理由 | default OG不是正文媒体；required no-media判断仍需独立/Human接受 |
| route/link crawl | VERIFIED局部 + NOT_RUN完整 | A1目录reconciliation11；S5 home/六旅程页unique本地href HTTP200+真实点击 | 不称全图全状态/外部URLcrawl；`.example`是显式虚构source，不能称第三方来源核验 |
| canonical/metadata/schema/sitemap/robots | VERIFIED技术 | A1/A2全部catalog输出审计，Article/Breadcrumb、OG、sitemap-index/0、robots，legal不可用排除 | 不是商业legal签署或41/41release |
| media-manifest validation | VERIFIED技术 + PENDING最终 | A1 schema正负例，A2三角色消费与文件；strictHuman拒绝保留 | Human/visual未签，不写final media PASS |
| TOC/breadcrumb/related | VERIFIED技术 + REUSABLE局部交互 | A1输出断言；S5实际TOC fragment，manual旅程 | focus/所有state/engine完整覆盖缺证 |
| ad-ready CLS/obstruction | VERIFIED有限几何 + NOT_RUN完整 | S5 disabled无slot；实AdSlot容器response seam两视口empty/synthetic各一，ratio/label/无前后重叠；短窗口shift entries为空 | 不是真正ads-enabled build；无filled creative、延迟加载、field CLS、delivery/viewability或Human Ads审批 |
| keyboard/overflow | REUSABLE + NOT_RUN完整 | S5旅程各页无横溢出、FAQ Enter/rootEscape焦点/单Menu24px；C4共用机制 | desktop submenu指针、skip/全部controls、resize/JS-off/motion-default/多engine/Safari未全验 |
| assembled screenshots for human review | VERIFIED capture + PENDING review | S5 A desktop/mobile及四广告seam实截图；[PNG inventory][png] | 图片存在不是ChatGPT独立看像素，不是Human签名 |

## 3. REF-B：§V逐项对照

| §V要求 | 分类 | 精确已有证据 | 剩余 / 不可推导 |
| --- | --- | --- | --- |
| problem guide/quick answer | VERIFIED内容能力 + PENDING承诺 | B3正文开头3×4=12QA units，明确question/假设 | 无专门QuickAnswer组件；title-to-answer Human待审 |
| ordered steps | VERIFIED | B3普通MDX ordered list和headings；source输出检查 | 无专门Steps组件 |
| comparison assumptions / decision | VERIFIED | B3三与五灯12/20、额外8、排除RelayCells的普通正文 | WS05 Comparison component仍DEFER，未新增组件或强制table |
| mistake/recovery/completion | VERIFIED | B3空值回默认/上限clamp及完成判断；UI真实清空恢复 | 不构造额外invalid-state模型 |
| next-step route | VERIFIED | B3人工MDXcheck-budget链接；S5 guide→tool→guide→next真点击 | RelatedPages本身不是task recommendation，无NextStep专门模块 |
| deterministic tool valid/invalid/empty | VERIFIED + REUSABLE组装 | B3evaluator+actualhydratedUI，3×4/5×4/999clamp/两空输入；Tab/ShiftTab/ArrowUp两视口 | S5没重跑calc input；不能外推Firefox/WebKit/Safari |
| task diagram / provenance/accessibility text | VERIFIED技术 + PENDING | B3原创figure1200×675/alt/caption/source；S5 loaded、576/362px | Human解释有效性/媒体使用待批；不是游戏UI截图 |
| video inclusion/exclusion decision | VERIFIED record + PENDING接受 | B3显式短静态乘法无需视频，无trailer/空槽 | 不是视频使用rights waiver，需对应decision review |
| content-structure assertions | VERIFIED | B3actualHTML4/4；answer/steps/compare/recovery/completion | 不是Human编辑品质签署 |
| responsive figure/table | VERIFIED figure + NOT_RUN table | S5 diagram fits/no横溢出；该fixture没有table，也不要求增table来统一 | 不宣称局部table键盘滚动；历史Core table仍有3未决 |
| keyboard/focus/overflow E2E | REUSABLE有限 + NOT_RUN完整 | B3真实工具键盘+empty；S5rootEscape/主路径overflow | 当前完整AX/multi-engine/状态/skip/目标/焦点contrast覆盖缺 |
| valid next/media evidence | VERIFIED技术 + PENDING人审 | B3/S5既有消费链及真实点击 | 真实广告enabled本fixture未选择，不挪用A结果 |
| title-to-answer human review | PENDING | 源码、title与正文及S5截图可供review | 无Human签名，不能由AI推论补PASS |

## 4. REF-C：§V逐项对照

| §V要求 | 分类 | 精确已有证据 | 剩余 / 不可推导 |
| --- | --- | --- | --- |
| system taxonomy / ≥3linked systems | VERIFIED | C4light/supply/route普通guides、独立mechanics与正文互链；S5真cross-navigation | 固定game QA世界，不新增system实体类型 |
| 三tagged guides | VERIFIED | C4light-check/supply-check/route-check独立任务、completion/recovery；actualInventorytags | 不是系统页换标题凑三guide |
| deterministic relevance / ranking test | VERIFIED bounded editorial | C4actualJSONtags独立score降序/pageId升序，与公开score、Inventory关系、RelatedPages顺序一致 | 无automatic runtime scoring；完整§V接受由independent reviewer裁定 |
| ranking method/version | VERIFIED | C4public `tag-overlap-v1`/tie-break/QA relay rules v1，S5到methodroute | patch/source access不冒充live/verified状态 |
| nested mobile nav | VERIFIED机制 + REUSABLE有限browser | C4existinggroup/children、390/900 Tab→overview、两次Escape/各summary恢复 | 完整engine/state/断点仍未齐 |
| version-labeled system diagram | VERIFIED技术 + PENDING | C4原创map1200×675、规则revision/date、gallery/alt/caption；S5 loaded fits | Human usefulmedia/visual审查待签 |
| identity visual / decorative separation | VERIFIED原创record + PENDING identity | C4另一独立SVG1200×630显示AmberLantern/RelayCell/EastCircuit、homehero；不是decorchrome | 合成世界≠真实game GI-02；masked独立pixels/Human未接受 |
| taxonomy/route map | VERIFIED技术 | C4catalog11及audit/related合法；S5实际home→hub→三系统→method | 完整routes/controlstatecrawl尚未全跑 |
| Escape/focus restoration | VERIFIED有限 + REUSABLE机制 | C4两视口nestedTab/Escape；S5mobile rootEscape | 不称Safari/AX01PASS；desktop菜单指针未全验 |
| contrast / usable visual states | NOT_RUN + PENDING | 继承semantic theme；S5只记录动画/尺寸，不计算全text/statecontrast | 稳态/hover/focus/active色及可见focus人工判断缺证；图中文字不能只从CSS推导 |
| reduced motion | VERIFIED局部 + NOT_RUN完整 | S5media query reduce/rootauto/reveal1e-05s，两视口 | no-preference/其他engine/全部状态未齐 |
| tap targets | VERIFIED单Menu + NOT_RUN完整 | S5mobile root summary≥24×24 | 不能代表所有链接/summary/工具控件，不忽略例外规则 |
| overflow / keyboard | REUSABLE有限 + NOT_RUN完整 | S5各journey无document横溢出+C4navigationkeys | JS-off、live resize、局部表、skip/footer/全keys/多engine缺证 |
| human game-identity review | PENDING / BLOCKED真实game要求 | 当前为fictionalQA原创世界，C4已明示非BF/WoG | 不冒充真实GI-02；只可审这个QAfixture与技术形态，真实采用留WS07 |

### REF-C编辑排序的合同解释（提交独立审查，不改变合同）

§V文字要求“three tagged guides with deterministic relevance order”“one ranking with method/version context”“relevance ranking test”。它没有明确指定运行时自动计分、算法registry或推荐系统。C4从唯一actualInventory independently计算，并核对作者公开的tag方法、得分、tie-break与实际消费者顺序，技术上对应这些明确义务；REVIEW51接受的是这个有限editorial技术证明。**按该精确文字，可由现有作者输入+消费者满足deterministic order，无需新增生产排序引擎。**

这不是降低义务为任意related list：若标签、分数、tie-break、公开方法或顺序不一致，现有test会失败。它也不是宣称getRelatedPages自动计分。整体REF-C仍缺视觉/Human/AX。若最终独立review认为自动runtime calculation是另一明确需求，必须引用依据并作单独范围裁决，不能Codex偷偷增加框架或将未决改PASS。

## 5. 七类证据不得互换

| 类别 | 当前事实 | 仍缺 / 边界 |
| --- | --- | --- |
| Technical fixture | A1/A2/B3/C4 literal已有authority inputs，validate期望Human拒绝，evidencebuild/audit、不同QA内容 | finalapproval与全套当前Core check不是已完成；不等于完整产品 |
| Actual assembled browser | S5六Chromiumjourneys+四synthetic/emptyseams，B3工具、C4nestedkeys | 只这些engine/viewport/state；不是全supportedbrowser matrix |
| Independent visual pixels | REVIEW49/52明确connector读不到PNG像素；文件capture+identity已检查 | 需真实可见pixels的独立visualreview；Codex看图不代替ChatGPT/requiredHuman |
| Required Human | media/MC04/title-to-answer/identity/ads/§U签署均未提供 | 保留reviewer/date/candidate/evidence，不能AI代填或copyfixturetechnical adoption |
| Safari / AX | [raw33][raw33]47rows37PASS/10FAIL；[residual33][residual33]40assertions37ENV+3tableunresolved；[closure negative][negative]无真实keyboard应拒绝 | 真实Safari proof0；历史envclassification非免责；currentnative控制通道未试，不断言永久不可用/用户未登录 |
| Actual ads-enabled build/delivery | S5真实AdSlot容器response seam；disabledoutput是唯一原build，providerempty且bootstrapabort | ads-enabled generatedbuild NOT_RUN，filledcreative/request-success/rendered/viewable/商业CLS NOT_RUN；不因关闭config整体豁免Aad-ready |
| Real-game GI-02 / WS07 | BF/WoG bounded REVIEW42/43可复用其范围；ABC是syntheticQA | 三真实项目最终adoption0/3；QA visual不补真实gameidentity；不启动WS07 |

[历史Safari清单][safari]仍为未执行清单；旧端口/PID/profile不能当现在测试。iteration32/33/archive/iteration35不改、不复活bridge。当前fullA/B/C、WS06A/B NOT ACCEPTED；Safari/AX UNPROVEN；Human PENDING；Global PRODUCT/RELEASE NOT ACCEPTED。

## 6. 首次失败与正确通过同存

S5 [attempt1][fail52]：exit1，3/3FAIL，desktopsubmenu未展开透明/禁pointer anchor被主页面header拦截。新test选了DOM第一个重复链接。S5 [attempt2][pass52]：只改新test优先main实际链接，exit0、3/3PASS、正常cleanup。REVIEW52接受修正测试选择器的有限判断，同时明确**不能据此证明产品绝不存在命中问题**。未强制click或覆盖CSS；将来桌面submenu正常open后hit-test、实际textclick/WoGwrappedreturn必须单独观察，不从main路径PASS外推globalpointerPASS。

REF-A S1原始两次testsetup/sitemap失败见A报告，完整失败文件仍存在。本轮未编辑失败日志或它们的内容；没有FAIL→PASS重写。

## 7. 有限优先顺序与最小独立可执行切片

以下只定义剩余证据单元及STOP边界，**不是实施文件allowlist/新工具计划，本轮未执行**。只在另给精确计划后进行；用既有consumer/installedtools/ownedpreview，不发明runner。

| 优先 | 最小切片 | 需观察的直接缺口 / 可复用证据 | 完成条件 / STOP |
| --- | --- | --- | --- |
| 1a 缺失可观察TECH | 当前测试源码集的一次受控静态/测试资格 | 新A/B/C与S5devtest已加入，旧common859不是当前全tests；在外层一次check，不能fixture内自递归 | 固定实际源并记录结果；不得把skip的opt-inbrowser变PASS；发现产品失败不自动改Core |
| 1b 缺失可观察TECH | 未覆盖的实际控件/状态小集合 | desktopdropdown先展开后真click/目标；skip/Tab/ShiftTab/Enter/Space、必要noJS/resize边界；Ccontrast/focus/tap；用S5同输出，Bcalc/Cnested已有证据不重复 | preciseengine/state/observation清单后采集；产品问题/能力缺失STOP；不能把2视口当fullcoverage |
| 1c 缺失可观察TECH | Aad-ready集成缺口 | 明确response-seam≠generatedadsbuild；仅对已有AdSlot+项目edge的实际生成输出补限定启用/空状态，再观察保留空间/遮挡/相关CLS窗口 | 不接外部广告/no新framework；provider无filleddelivery则NOT_RUN，不为关gate虚造creative/人审 |
| 1d 缺失可观察TECH | supportedengine与构建覆盖绑定 | 用历史机制+当前source影响地图定出缺失engine/断点/JS/motion/404行，复用有效历史/slice证据，不笼统重复full47 | 缺engine访问明确BLOCK/NOT_RUN；不能用Chromium替换Firefox/WebKit，更不替换真实Safari |
| 2 Required Human decisions | 一份绑定准确现有输出的实际review包 | reuse十张S5截图、Aseedcaptureprovenance、MDX/媒体决策理由；独立pixels审查与Humanmedia/MC04/title/identity/Ads签署分开 | 真实reviewer/date/evidence/精确范围；AI可以独立技术/视觉审查但不签Human；缺Human时保持PENDING |
| 3 Actual Safari feasibility | 仅允许控制通道的一次有限可行性核对 | nativeSafari与trustedkeys/viewport/JS/focus/scroll可观察性；历史失败≠当前不可用；无密码/cookies/OS偏好变更 | 成功后另锁准确build+对应10cases/40assertions采集；失败具体诊断并BLOCK，不修archivebridge/偷偷fallback |
| 4 Formal independent WS06B | 对全部精确合同项作最终审查 | 将1–3结果与既有S1–S5逐条绑定，保留PENDING/NOT_RUN/BLOCK与条件适用，不再造方法框架 | required项未证明则NOTACCEPTED；§W/§Y仍控制后续capabilitydelta/release，不Codex自关 |

这些切片没有新增Pattern/Core runtime需要；“缺证”不默认等于“需要产品实现”。完整多engine coverage仍须精确计划，不把routine47或6000hash当每个小slice前置。真实媒体/广告启用的安全和批准边界仍有效，缺Human/外部delivery不能被新的测试绕过。

## 8. §W与终态

§W顺序仍为frozen/candidatebaseline→Coretests→ReferenceABC→independentassembly→capabilitydelta/classify→blockregression→acceptedfreeze。S1–S5只有其中有限TECH evidence；本文没有执行41/41reconciliation、delta、三件套交付/freeze、WS07adoption或release。缺失条件行不能记NA来掩盖FAIL；无P1豁免。

**ONE Active file新增；Product/Test/Governance/SOP/Prompt/Contract delta=0。无browser/test/build重跑、无截图capture、无大型hash。** 当前接受范围未扩大：完整REF-A/B/C NOT ACCEPTED；WS06A/WS06B NOT CLOSED；Safari/AX UNPROVEN；Human PENDING；WS07 0/3；Global PRODUCT/RELEASE NOT ACCEPTED。等待独立Review，不开始补证或修复。

[contract]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md
[amendment]: /Users/randyz/work/coding/hot_words_web/template/architecture/V2.7_ARCHITECTURE_SIMPLIFICATION_AMENDMENT_V1.md
[design]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws06/WS06B_REFERENCE_ACCEPTANCE_DESIGN_V1.md
[gaps]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws06/WS06_ACCEPTANCE_GAP_INVENTORY_V1.md
[a]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws06/REF_A_TECH_EVIDENCE_V1.md
[b]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws06/REF_B_TECH_EVIDENCE_V1.md
[c]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws06/REF_C_TECH_EVIDENCE_V1.md
[observations]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/actual-assembly-evidence.txt
[png]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/screenshots-provenance.json
[outa]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan49-kkxzjquc/readonly-rerun/generated-output
[outb]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan50-34h464m1/generated-output
[outc]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan51-lc8l0wl1/generated-output
[r48]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan48-mervk0bi/review48-plan49.md
[r49]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan49-kkxzjquc/review49-plan50.md
[r50]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan50-34h464m1/review50-plan51.md
[r51]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan51-lc8l0wl1/review51-plan52.md
[r52]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/review52-plan53.md
[raw33]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws03d/iteration33/fresh47/core-browser-evidence.json
[residual33]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws03d/iteration33/post03d-freshness-residual-comparison.json
[negative]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws06a/iteration17/closure-without-real-keyboard-result.json
[safari]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws06a/iteration17/REAL_SAFARI_KEYBOARD_CHECKLIST.md
[fail52]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/test-attempt1.log
[pass52]: /var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan52-x7ord2ky/test-attempt2.log
