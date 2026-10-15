# WS06 Acceptance Gap Inventory V1

日期：2026-10-08。执行者：Codex。依据：ChatGPT PLAN46，前序 REVIEW45 已接受治理同步。

**模式：READ ONLY / GAP INVENTORY / NO IMPLEMENTATION。状态：READY_FOR_INDEPENDENT_REVIEW。**

本轮仅新增本文。未执行产品测试、构建、浏览器观察、截图、47-case matrix 或大规模 hashing；未修改产品、测试、治理、SOP、Master Prompt、Contract 或历史证据。本文不作 WS06 接受裁决，不新增 Gate、状态 enum 或验证框架。

## 1. 当前接受基线与权威

[Simplification Amendment][amendment] 是执行解释依据；[PROJECT_STATE][state] 和 [TASK_LEDGER][ledger] 的 PLAN45 顶部当前解释优先于其保留的历史段落。[Roadmap][roadmap] §7 修正旧 DAG；[SOP Product Contract][contract] 仍持有能力、适用性和验收语义。旧“formal WS03 NOT_ACCEPTED”“full WS06A blocks unrelated WS03/04A/05”不能作为当前前置。

| 基线 | 当前已接受范围 | 本次盘点的限制 |
| --- | --- | --- |
| WS01 / WS02 | CLOSED，保留规范与安全基础 | 不能代替组装或发布证据 |
| [WS03 consolidated post-repair Review][ws03] | ACCEPT — TECH / CLOSED；generic liveStatus 已退役，publication/update/source/version 保留 | 不提升 AX/Safari/PRODUCT/RELEASE |
| [WS04A Final Review][ws04a] | ACCEPT — TECH / CLOSED；5 decision blocks，最多14 optional prompts；9 existing authorities | 无 dedicated adaptation runtime schema；不是人审签署 |
| [WS05 Final Review][ws05] | ACCEPT — TECH / CLOSED；3 composition methods，0新组件/contract/ID/enum | 普通 MDX 可表达 Quick Answer/Steps/Next Step；专门组件不存在；Comparison DEFER |
| [REVIEW40 / PLAN41][review40] | 共用 About portability 精确6文件修复已独立接受 | 后于 iteration33；旧 browser source/build identity 不能声称完全等于当前源 |
| [REVIEW42][review42] | ACCEPT — PRODUCT，**仅 bounded two-game proof**；实际四PNG与严格 masked identity，A–F / FD01–06 PASS | WoG 窄识别；不提升 Safari/AX/Human/最终采用 |
| [REVIEW43][review43] 与 [WS04B Final Review][ws04b] | ACCEPT — bounded WS04B INSTANCE PROOF | 不关闭 WS04 整体；不等于 WS06B |

Starter 当前工作基线：`Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`；branch `v2.7/evolution`；HEAD `b067e8d4050478072f25a1dc78a8526cdd128cfd`；HEAD tree `1df0ade30b1eaf51a76820c8d8b83337786f0dc1`。准确 proof-v2 working-tree 来源见 [common-core-identity][core-id] 与 [iteration40 result][repair-result]。**HEAD 不包括全部已接受未提交/未跟踪变化；iteration33 fingerprint 只是历史 snapshot。**本轮以现有身份记录和只读 Git 状态/差分确认来源，不重建全文件 fingerprint。

主 workstreams 仍8个；4/8 有各自接受范围内的关闭记录（WS01/02/03/05），另列 WS04A TECH 与 WS04B bounded instance 接受。WS06 未关闭；WS07 最终采用0/3；WS08 未接受。计数不是产品完成百分比。

## 2. 分类规则

| 类别 | 含义 |
| --- | --- |
| A — VERIFIED | 当前已有证据满足表中**精确的局部要求**；不因此提升整个 WS06 |
| B — REUSABLE | 有有效、范围明确的证据，可绑定到 WS06；不足部分单列 |
| C — PRODUCT_GAP | 源码/交付物确实缺少所需实现；须注明是产品运行能力还是验收 fixture 缺口 |
| D — EVIDENCE_GAP | 必需证明缺失、不完整或身份尚未重绑定；不等于已确认产品 bug |
| E — ENVIRONMENT_LIMITATION | 已记录的工具/host/engine 阻碍观察；当前可用性未重新探测则明确注明 |
| F — NOT_APPLICABLE | 仅在现有 Contract 有明确条件及真实配置依据时适用；不能豁免仍必需的能力 |

以下分类是事实盘点，不是 Registry outcome 或新运行字段。同一要求可同时包含 B+D 或 E+D，不能用已通过的局部证据遮盖缺项。

## 3. WS06A 验收缺口

| 要求 / 观察 | 现有事实与依据 | 分类 | 仍缺什么 / 最小后续动作 |
| --- | --- | --- | --- |
| Chromium / Firefox Core qualification | [iteration33 raw][raw33]：47 executed，37 PASS /10 FAIL；Chromium27 PASS，Firefox10 PASS；无漏行。engine记录 Chromium153.0.8010.12/rev1243、Firefox155.0/rev1543 | B；当前整源资格 D | 复用其历史范围，不能改称当前完整矩阵 PASS。后续只对实质影响的表面重绑定/补验；assembled/release 边界仍有完整义务 |
| live-resize 修复 | [iteration16 independent Review][review16] 接受2文件修复；targeted15/15与711回归 PASS；Chromium resize 从FAIL变PASS | B | 有限机制证据可复用；不从711旧数推断当前资格，更不重跑它来授权非浏览器工作 |
| WebKit plain Tab | iteration33 raw overall FAIL；`WEBKIT_STANDARD_TAB_LINK_PROFILE_UNAVAILABLE` 如实保留。[residual comparison][residual33]：10失败病例/40失败断言，其中37 ENVIRONMENT_PROFILE_BLOCKED；WebKit26.6/rev2359/darwin-arm64 | E+D | 缺普通 Tab 的真实 Safari 对应观察。仅限该已接受 profile/detail 分类；不能扩张为所有 WebKit/Safari失败的环境豁免 |
| 原生局部 table ArrowRight | 同 residual 中3条 PRODUCT_EVIDENCE_UNRESOLVED，三视口 content-detail；wrapper已focus、有真实溢出、键到达，但 scroll未变 | D | 尚未证明是产品缺陷或纯环境问题。真实受控键盘观察必须看到局部滚动；不能用程序改 scroll 或其他引擎 PASS 替代 |
| 真实 Safari supplemental proof | [iteration17 independent Review][review17] 仅 ACCEPT — IMPLEMENTATION MECHANISM；[negative closure result][closure-negative] exit1；[real-keyboard checklist][safari-list] 为待采集清单，非执行证明 | D | Safari proof仍0。原policy要求准确对应10病例/40断言，含no-JS、视口、实际版本/按键、focus/尺寸/滚动及可观察artifact；实际coverage须绑定新受控源/构建。旧清单端口/PID不得当当前会话 |
| Safari 控制通道 | [iteration41 result][proof-result] 记录 nativeGUI timeout、Chrome request-header-policy错误；[proof package][proof-package] IAB成功 | E（历史）+D | 本轮禁止探测通道，不能声称当前Safari一定不可用或用户未登录。后续只能检查允许通道；Chrome/IAB/Playwright WebKit不能冒充真实Safari trusted keys；不复活归档bridge |
| AX-01 navigation | Core机制和跨引擎历史修复存在；bounded proof只做入口/文章、TOC、FAQ和有限focus观察 | B+D | assembled dismissible nav 的Tab/Shift+Tab/Enter/Space/Escape、nested cleanup、expanded state、focus恢复与断点相关证明未齐；AX-01保持未完全证明 |
| AX-03 breakpoint/keyboard/overflow | proof-v2八个 desktop/mobile观察无document横溢出；iteration33有Synthetic三角色/边界证据 | B+D | 实际组装站完整supported coverage、真实404恢复、局部表、resize/no-JS/reduced-motion及Safari相关证据不能从八个图/旧fixture继承；AX-03保持未完全证明 |
| AX-02人工focus/contrast/target判断 | raw33 `humanReview.visualFocus/contrast = DEFERRED`；proof记录solid3px skip focus，但mobile entry未另记录 | B+D | 几何/outline机器记录不等于人工视觉focus、对比度或所有控件可用性；人工部分保留未证明 |
| WoG wrapped return link | proof package：pointer-centre两次未导航，实际键盘激活到 `/guides/` 成功；[REVIEW42][review42] 明确保留限制 | B+D | 仅键盘该次路径可复用。真实可点击文本/触控命中观察缺失；未确诊产品bug，也不填pointer PASS。先有限观察后才决定是否需要修复 |
| runner / cleanup机制 | [current runner][runner] finally关闭contexts/browsers，正常Astro stop并核对ownedPID；signal recovery记错误；[cleanup33][cleanup33] stop0、PIDgone、no fallback、fixtureRemoved；[freshness cleanup][freshness-cleanup]同样正常 | B | 已有机制与历史run完整性可复用；没有当前新增runner缺陷证据。旧PIDgone不是未来run已cleanup；未来新run记录自己的正常停止/身份，不重造cleanup工具 |
| strict raw/closure authority | [CORE_BROWSER_EVIDENCE][browser-doc] 与 [closure source][closure-source]：raw47/47严格入口不变；policy补证仅可进入独立closure review；缺Safari fail-closed | A（入口规则存在）+D（通过证据） | 没有真实closure PASS/独立完整06A接受。不修改fail-closed逻辑或raw行以消除阻塞 |

iteration33 的现存 qualification 来源与源 hash 均是**当时**证据；此后已移除 liveStatus，且共用 About修复改了页面拷贝/LegalPage与相关tests/helpers。不能声称当前源与iteration33 byte-identical。导航算法并非这次修复对象，是历史机制证据可复用的理由，仍不等于整源资格自动重签。

## 4. WS06B 组装验收缺口

Roadmap WS06与 Contract §T/U/V 定义需求。WS06B fixture/report机制验收与 WS07真实游戏 required Human review区分：**不能要求两个 proof 即刻完成三个最终项目，也不能把真实人审从 WS07 删除。**完整06B closure仍受适用Safari/AX边界约束。

| 要求 | 现有证据 / 源码事实 | 分类 | 未满足范围 |
| --- | --- | --- | --- |
| 共用Core technical baseline | [shared check][common-check]：Astro0 errors/warnings，48 files/859tests PASS；[REVIEW40][review40]接受共用修复 | B | 可绑定 common proof-v2基线；测试数不证明 assembled合同或全部41能力 |
| adopted final / unadopted rejection | [iteration40 adopted log][adopted-log] validate/check/build PASS；[unadopted log][unadopted-log]准确PP-02 rejection；[current verifier][adoption-source]明确 synthetic technical proof only | B | 不是BF/WoG final build、人审或REF-A/B/C；仅当前相关机制的已记录技术证明 |
| 两游戏evidence validate/build | [BF build][bf-build]、[WoG build][wog-build]各5 enabled pages/1content，validation+output audit PASS；generated output见[review package][proof-package]；[build source][build-source]将evidence明确标为非final | B | build:evidence保留PENDING安全用途；没有两个项目final接受，不能删除marker或抄Human PASS |
| route/link/meta/schema/sitemap/robots | 现有 [audit-build][audit-source] 与 [html audit tests][html-tests]、proof输出/audit有局部覆盖 | B+D | 缺REF-A/B/C完整route/link crawl与逐项报告绑定；build audit不等于全部内外链接/交互都观察通过 |
| entry → answer → manual next | proof-v2 BF首页→how-to-play与回首页；WoGhub→gear与键盘回hub；四代表页desktop/mobile真实观察；普通MDX任务与来源 | B+D | bounded产品proof已独立接受；非完整二/三页采用路径。WoGpointer、未观察mobile-entryfocus及其余routes保持缺证，不假填PASS |
| 视觉识别/节奏/任务区别 | REVIEW42实际PNG、strict masked BF/WoG、A–F/FD01–06 PASS；REVIEW43绑定instance事实 | B | 可复用为这四页/该构建的独立AI产品review；WoG有限Strife/Valor上下文，不宣称游戏UI证据很强或永久有效 |
| media/video/no-media | BF原创三队图解、有alt/caption/provenance；WoG空Manifest与有意text-first，无empty slot。既有 [media build tests][media-tests]覆盖技术边界 | B+D | BF Human/visual media approval仍PENDING；无第三方截图使用授权。没有REF-A screenshot/cover/figure+no-media、REF-B任务图/视频决定、REF-C系统图/identity完整fixture。已接受WoG首轮不强制Media-rich，不因此豁免REF合同 |
| TOC / FAQ / related / relevance / content承诺 | 两文章真实TOC/FAQ；WikiArticle/Sources等已接受；普通MDX可表达答案/步骤/后续 | B+D | 未覆盖§V全部breadcrumbs/manual-tag关系/三系统三guide/确定性排序/ranking method版本；RelatedPages不是Next Step。WS05 Comparison DEFER不删除REF-B comparison assumptions，可由普通内容表达，无需新组件 |
| identity/legal/residue与安全 | 共用About修复、PP-02和显式identity已接受；proof5routes审计；legal未审批routes不发布 | B+D | 不能把未启用privacy/terms当商业法律已审或legal Human PASS；未来fixture适用的route/身份/残留/fallback必须逐项绑定 |
| ads关闭/开启/空槽、CLS与遮挡 | 当前 [ads tests][ads-tests] 与synthetic [TestAdProvider][ad-fixture]存在；proof未演示真实商业交付 | B+D | 缺REF组装广告开/关/empty及layout/obstruction记录。provider不可用不能模拟广告填充PASS；request/rendered/viewable分开。历史403不代表当前provider故障 |
| conditional monetization obligations | Contract条件要求+项目config决定适用；disabled proof不足以宣称全部commercial ads gate通过 | F（仅未启用项目的真实provider交付）+D（REF布局） | N/A须逐项引用配置/Contract，不能用disabled跳过REF-A ad-ready/CLS要求或最终启用项目的Human Ads Review |
| REF-A / B / C存在性 | 对当前Starter tests/scripts精确`REF-A/REF-B/REF-C`搜索无命名fixture；当前verifications无WS06B三套报告。现存adopted Field Notes fixture只是通用安全/构建fixture | C（验收fixture交付物）+D | **没有证据表明运行产品需要新framework**；缺少的是§V指定确定性组装输入与验收报告，不能拿两个真实proof或零命名搜索单独认定全部功能不存在 |
| 独立assembled接受 | REVIEW42/43接受范围明确，当前治理WS06B NOT ACCEPTED | D | 缺WS06B独立报告，包含正确PASS/FAIL/BLOCK/PENDING/NOT_RUN、基于条件的N/A与仅允许的P2/NIT例外；Codex不能自行关闭 |

### REF-A/B/C 精确未补齐义务

以下仅摘取 Contract §V 的缺口边界，不制定输入schema/逐文件实施计划。

| Reference | 必需输入 / 证据（当前尚无该suite完成报告） | 可直接复用基础 |
| --- | --- | --- |
| REF-A Wiki / Commercial Editorial | editorial home、2 taxonomy hubs、≥3distinct details、published/updated/version、manual/tag relation、FAQ、404；provenance截图+独立cover/key-art+inline figure，deliberate no-media accepted rationale；route/SEO/media/TOC/breadcrumb/related/ad CLS/keyboard/overflow/screenshots | 已有home/hub/detail/article consumer、Page Inventory、Media Manifest、media/SEO/date组件，不创建第四种Starter |
| REF-B Problem Guide / Tool | problem answer、ordered steps、comparison assumptions、mistake/recovery、next route；deterministic tool valid/invalid/empty；taskUI截图**或**解释图及视频包含/排除决定；tool/内容/响应table/focus/next/media/title-to-answer证据 | MDX+WikiArticle、Tool已有技术seam、图/表；无需QuickAnswer/Steps/NextStep/Comparison专门组件 |
| REF-C Tactical / Systems | ≥3linked systems、3tagged guides确定性relevance、ranking method/version、nested mobile nav；versioned系统map/diagram+game-identity visual；taxonomy/ranking/keyboard/Escape/focus/contrast/reduced-motion/targets/overflow及identity审查 | 已有facts/entity/hub/guide/navigation/related模块，直接组合，不引入第四Pattern或registry |

## 5. 证据复用地图

| 证据 | 复用等级 | 可说明什么 / 不可说明什么 |
| --- | --- | --- |
| WS03/04A/05接受记录、REVIEW40、proof-v2身份 | CURRENT + REUSABLE，限已接受源/范围 | 技术接口与同一修复Core来源；不等于浏览器/人审/采用PASS |
| proof-v2 common859与BF/WoG evidence builds | CURRENT + REUSABLE for recorded proof-v2 | 该准确common+输入/输出有技术证据；不是两个final产品或REFsuite |
| REVIEW42 / REVIEW43 | CURRENT + REUSABLE for bounded proof | 独立实际图像识别及instance绑定；不是Human签署、WS06B、release |
| proof package中的PENDING与“WS04B未接受” | HISTORICAL SNAPSHOT（该文件不改） | 是提交审查时真实状态，后续REVIEW42/43只覆盖各自已裁定范围；其余Safari/Human/pointer限制仍未解决 |
| iteration16/17 Core修复/policy/负例 | HISTORICAL + REUSABLE mechanism evidence | 修复接受、strict raw/closure边界、缺Safari应fail-closed；旧PID/URL/版本不冒充当前运行 |
| iteration33 fresh47与targeted freshness | HISTORICAL source/build + scoped reusable | raw37/10及40断言、cleanup事实；其live-status-era测试不能整体继承到移除后的Active Core；当前整源资格不足 |
| current audit/adoption/media/ads tests源码 | REUSABLE implementation foundation | 实际工具与测试存在，不是本轮运行结果，不是Reference名称/合同的组装证据 |
| archived iteration35 bridge现场 | HISTORICAL ONLY | 原失败工具不修、不补跑；不计Safari proof、不进入新实施范围 |
| 原Bomb Farm/WoG旧项目PASS、旧截图/provider403 | HISTORICAL ONLY | 风险/来源参考；不能替代V2.7 assembled、rights或当前provider结果 |

本轮没有重新采集上述证据；source变化实质影响的测试/浏览器表面须在独立后续计划内重绑定。只读存量盘点不是新的完整资格run。

## 6. 产品、环境与证据的分离

- **已确证且已修复的产品问题：** 共用About硬编码Game Atlas导致BF evidence build PP-02失败，已由独立REVIEW40接受的共用6文件修复解决；不再把旧FAIL列为当前未修bug。
- **当前确证的缺失交付物：** REF-A/B/C确定性组装fixtures及完整报告未出现，是验收fixture缺口；不是新产品运行抽象需求。
- **尚未确诊为产品缺陷：** WebKit局部table原生滚动、WoG返回链接pointer中心命中。这两项先补准确观察；不得仅因一个自动化坐标失败就改产品。
- **已记录环境限制：** WebKit plain-Tab profile、历史nativeGUI超时/Chrome通道错误。本轮不复测，当前通道状态未知；不能说用户账号未登录或永久Safari不可用。
- **纯证据与责任缺口：** real Safari0、AX相关组装覆盖/人工部分、Human media签署、独立06B、三最终adoptions和release。AI不能代填required Human签署，也不能把构建成功提升为产品完成。

## 7. 必须保留的阻塞

1. 真实Safari keyboard/focus/overflow及适用AX-01/AX-03证据缺失；旧policy不能直接关闭06A，assembled/release边界仍阻塞。
2. REF-A/B/C §V内容/媒体与PASS证据、WS06B组装报告未完成。两个bounded真实proof不是替代品。
3. 与实际候选构建绑定的required人审仍需完成；BF Human media PENDING。06B fixture机制Gate与WS07真实人审分开，不把人审职责机械挪给Codex。
4. WoGpointer观察未决、当前完整supported browser coverage及人工contrast等缺项如实保留；没有P1豁免。
5. WS07最终采用0/3，WS08 41/41/跨版delta/三件套兼容与最终delivery未接受；这些是后续Gate，不作为每个小slice的默认前置。

## 8. 最小下一动作（建议，须独立审查后另步授权）

**先做一个有限 WS06B Reference acceptance plan，复用现有consumer、authority和工具。**只定义§V三fixtures的最小内容/媒体输入、现有测试/审计如何覆盖、缺证采集范围及独立报告边界；不立刻编码、不建立新验收framework，不机械先跑fresh47。

在该计划中单独处理Safari：先核实当前允许的真实控制/可信系统键盘通道是否可用；成功后才准备准确源/构建的受控采集，覆盖对应要求并独立审查。失败则记录具体通道限制，维持Safari/AX/assembled/release未通过；不要修归档bridge、改OS键盘偏好、用IAB/其他engine替代，也不要阻塞无关的非浏览器Reference准备。该通道核实是**后续动作，不是本轮已执行或已授权fallback**。

后续观察若确证产品缺陷，再给出精确allowlist修复，验证受影响表面；源码未变化的有效证据继续复用。先把可执行组装验收范围变小、变具体，不凭空制造runtime功能。

## 9. 停止条件与非声明

- 本轮只允许新增本文；第2个Active文件、任何产品/治理修改或运行测试需求出现即STOP。
- 未取得真实Safari可观察记录、匹配身份或必需coverage，不允许Safari/AX/完整06A/06B接受。
- Unknown infrastructure错误、missing/NOT_RUN、unknown failure、无匹配source/build、source drift或P1失败必须明确BLOCK/待证；不得N/A/多数票/替代PASS。
- 媒体rights未批准则不搬入；required Human签署缺失不得由AI代填；不新增临时截图或虚构游戏机制来凑fixture/识别。
- 不重写iteration16/17/32/33/35或proof-v1/v2，不把历史FAIL改PASS，不扩大WS03/04A/05接受范围。
- 本文不宣告WS06A/WS06B CLOSED、AX-01/02/03 PASS、WS07任一最终采用PASS、41/41 PASS、Global PRODUCT ACCEPT或RELEASE ACCEPT。Safari proof0，Human Media Approval PENDING，最终采用0/3。
- Product/Core/Test/Governance/SOP/Master Prompt/Contract delta = 0。未commit/push/tag/merge/deploy/release。完成后交ChatGPT独立Review，实施未开始。

[amendment]: /Users/randyz/work/coding/hot_words_web/template/architecture/V2.7_ARCHITECTURE_SIMPLIFICATION_AMENDMENT_V1.md
[state]: /Users/randyz/work/coding/hot_words_web/template/PROJECT_STATE.md
[ledger]: /Users/randyz/work/coding/hot_words_web/template/roadmap/V2.7_TASK_LEDGER.md
[roadmap]: /Users/randyz/work/coding/hot_words_web/template/roadmap/GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md
[contract]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md
[ws03]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws03/CONSOLIDATED_WS03_TECH_REVIEW_V1.md
[ws04a]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws04a/SIMPLIFIED_WS04A_FINAL_REVIEW_V1.md
[ws05]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws05/WS05_FINAL_TECH_REVIEW_V1.md
[review40]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-two-game-proof/iteration41/chatgpt-plan.md
[review42]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-two-game-proof/iteration42/chatgpt-independent-review.md
[review43]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-two-game-proof/iteration43/chatgpt-independent-review.md
[ws04b]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws04b/WS04B_FINAL_REVIEW_V1.md
[core-id]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-two-game-proof/proof-v2/common-core-identity.md
[repair-result]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-two-game-proof/iteration40/result.md
[review16]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws06a/iteration16/chatgpt-independent-review.md
[review17]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws06a/iteration17/chatgpt-independent-review.md
[raw33]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws03d/iteration33/fresh47/core-browser-evidence.json
[residual33]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws03d/iteration33/post03d-freshness-residual-comparison.json
[closure-negative]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws06a/iteration17/closure-without-real-keyboard-result.json
[safari-list]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws06a/iteration17/REAL_SAFARI_KEYBOARD_CHECKLIST.md
[proof-result]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-two-game-proof/iteration41/result.md
[proof-package]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-two-game-proof/proof-v2/PROOF_REVIEW_PACKAGE.md
[runner]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/run-core-browser-evidence.ts
[cleanup33]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws03d/iteration33/fresh47/preview-cleanup-audit.json
[freshness-cleanup]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-ws03d/iteration33/freshness-cleanup.json
[browser-doc]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/docs/CORE_BROWSER_EVIDENCE.md
[closure-source]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-ws06a-browser-closure.ts
[common-check]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-two-game-proof/proof-v2/shared-check.log
[adopted-log]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-two-game-proof/iteration40/green-adopted-verification.log
[unadopted-log]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-two-game-proof/iteration40/unadopted-verification.log
[adoption-source]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-adoption.ts
[bf-build]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-two-game-proof/proof-v2/bomb-farm-build.log
[wog-build]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-two-game-proof/proof-v2/wog-build.log
[build-source]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/build-site.ts
[audit-source]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/audit-build.ts
[html-tests]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/html-audit.test.ts
[media-tests]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/media-build.test.ts
[ads-tests]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/ads.test.ts
[ad-fixture]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/fixtures/ads/TestAdProvider.astro
