# WS06B Minimal Reference Acceptance Design V1

日期：2026-10-08。执行者：Codex；设计权威：ChatGPT PLAN47 及同轮 fixture 边界澄清。前序：REVIEW46 ACCEPT — WS06 ACCEPTANCE GAP INVENTORY。

**DESIGN ONLY / NO IMPLEMENTATION。READY_FOR_INDEPENDENT_REVIEW。**本轮仅新增本文；Product/Core/Test/Governance/SOP/Master Prompt/Contract delta = 0。未运行测试、构建、浏览器、截图或大型hash；后文全部是未来提案，不是已建立fixture、已授权执行范围或PASS。

## 1. 目标、方案与来源

目标：用当前Starter实际consumer组装三个 Contract §V Reference，补齐确定性组合验收，保留真实游戏/Human/Safari/AX/发布的独立义务。

三种路线比较：

| 路线 | 代价 / 风险 | 选择 |
| --- | --- | --- |
| 直接从V2.7 Core复制临时fixture，以现有authorities输入和具名integration tests检查 | 数据/页面/媒体角色明确；需实际构建/观察；不会复制运行机制 | **推荐** |
| 直接称BF/WoG bounded proof为REF-A/B/C | 四页不足§V对象/工具/系统要求，混淆PROJECT与REF | 不采用 |
| 新通用Reference registry/配置语言/动态组合runner | 引入第二authority与抽象，当前无需要 | 不采用 |

依据：[Amendment][amendment]、[Product Contract][contract] §T/U/V/W/Y、[accepted gap inventory][inventory]、[WS03][ws03]/[WS04A][ws04a]/[WS05][ws05]已接受接口、[REVIEW42][review42]/[REVIEW43][review43]有限证明。ChatGPT本轮澄清：允许明确虚构的确定性QA数据、原创测试素材和实际fixture UI截图；不得伪装为BF/WoG事实、第三方游戏截图、required Human签署或真实GI-02证明。

## 2. 现有authority与consumer限制

所有以下路径相对当前 [Candidate][candidate]；源码已读取。本设计不修改这些生产文件。

| 既有truth / consumer | 实际能力 | fixture处理 |
| --- | --- | --- |
| `src/data/page-inventory.json` / [schema][inventory-schema] | page truth、唯一ID/route、published/update/source、人工related IDs | 每个临时项目只有这一份运行Inventory；不新增Reference/Pattern字段 |
| `game.config.ts` | identity/feature/home/navigation配置 | 通过既有字段采用QA身份、模块与逐页选择；不建adaptation config |
| `src/styles/theme.css` | semantic token values，visualRoles只是optional helper | 各fixture可提供原创QA主题值；不改语义token contract/enum |
| Content / Facts / Tool definitions | MDX、固定entity schema、确定性calculator/planner | 输入明确标注虚构；不得为填cost/role等强行编造BF/WoG事实 |
| Media Manifest | assets、page hero/gallery/trailer/share/defaultShare；公开与私有信息投影分离 | 原Manifest是唯一媒体映射；来源/rights/review决定留在项目记录 |
| [Guides consumer][guide-route] / [route records][optional-routes] | Hub固定`/guides/`，article固定`/guides/<slug>/`，WikiArticle/TOC/FAQ/MDX | 不把cluster当动态hub，不能设计两个`/guides/<category>/` hub |
| [entity consumer][item-route] / [entity route model][entity-route] | 固定items/maps等模块的Hub、database、detail；Hub根route固定 | REF-A两taxonomy hubs使用`/items/`、`/maps/`，不新增pageType或通用Hub |
| [RelatedPages authority consumer][site-data] | `getRelatedPages`按显式relatedPageIds顺序投影enabled pages | 无automatic tag ranking；标签方法由作者在内容中公开，并由fixture断言验证人工输入顺序 |
| [Editorial consumer][meta-route] | `/meta/<slug>/`+EditorialArticle，普通正文承载method/version | ranking用MDX方法/表格，不需要Ranking组件或schema；现有editorial route不自动传versionContext |
| [Tool route][tool-route] / [ToolShell][tool-shell] / [CalculatorIsland][calculator] | 实际定义→现有计算→hydrated numeric input→output；normalization回默认/限界 | 不硬编码结果，不要求额外invalid-state runtime模型 |
| [existing fixture helper][fixture-helper]、[adoption verifier][adoption]、[build audit][audit] | 临时copy、正常build、安全审计、清理；synthetic技术采用明确不是真实人审 | 复用，不复制Core，不写通用fixture registry；test只写项目输入 |

9个既有authority所有权不变；sources/Provenance仍嵌在原数据，不建source registry。publishedAt、updatedAt、accessedAt→sourceCheckedAt、patch/version、updatedAt>=publishedAt保留；sourceCheckedAt不称verifiedAt。不复活liveStatus，也不加replacement live-state模型。

## 3. 共同输入、身份与人审边界

选择一个稳定且明确虚构的QA世界 **Lantern Relay — Synthetic Reference Fixture**：三个独立回路的灯具/地点/补给决策，用于说明消费链。名称、解释图和规则均由项目原创；页面显著说明“fictional QA scenario, not Bomb Farm / War of Genesis”。不声称真实发行游戏或商业站，不复用其官方logo/UI/物品成本。

每个Reference从同一个准确Candidate working-tree基线创建独立临时copy。`game.config.ts`、Inventory、Facts、MDX、tool JSON、media.json、theme tokens是运行真相；test里原始输入一次定义后写入对应authority，不另外维护运行时assembly manifest。Reference A/B/C只是测试/报告名称，不是runtime分类。

source/version记录：Starter branch/HEAD/tree及实际未提交增量；同一次记录SOP/Prompt来源与canonical Contract身份；fixture输入revision `reference-inputs-v1`、QA规则/媒体authorship revision与日期；构建输出mode/identity、实际媒体文件、后续浏览器实际版本/视口/JS/motion；判断者/日期/evidence links。新run绑定自己的源与输出；旧iteration33 fingerprint、preview端口/PID均不当当前身份。不默认6000+hash，只用Git/允许文件差分和少量规范工件身份。

三层证据必须分开：

1. **Technical fixture evidence**：真正执行的schema、route、content、tool、media、build、浏览器观察；可以使用如实标注的合成输入。
2. **Independent assembled review**：ChatGPT独立检查实际diff/输出/图像与§V覆盖，只接受实际证据范围。
3. **Real-game / required Human / release evidence**：required Human、真实GI-02、真实来源/rights、Safari/AX、PROJECT-*与最终release；不能从前两层自动推导。

所有新增媒体先记录project-authored/synthetic provenance、源码/捕获来源、生成/访问日期、原始文件和review状态。来源URL指向QA项目明确的编辑性说明，作为synthetic定位，不称“已抓取的真实游戏源”；private rightsRef不暴露在HTML。**未取得实际Human批准不能把配置/决定表写成Human PASS。**只能用既有evidence模式生成PENDING候选；existing synthetic helper的技术采用不被复制成真实签署。required Human不齐，final/完整Reference outcome继续未证明。

## 4. REF-A — Wiki / Commercial Editorial

最小输入与路径均为本设计新提案：

| 输入 | 精确最小形态 | 既有消费链 / 观察要求 |
| --- | --- | --- |
| editorial home | `/`；选择两Hub、三个detail与一个解释文章，正文不包含Starter setup copy | existing homepage/PageCollection/WikiCategories；真实进入两个目录与有用detail |
| 2taxonomy hubs | `/items/`：灯具/补给类；`/maps/`：回路地点类；各至少一个可进入对象，合计3distinct details | existing entity Hub/EntityDatabase；`pageType=hub`、正确module/fact关系 |
| 3distinct detail articles | `/items/amber-lantern/`、`/items/relay-cell/`、`/maps/east-circuit/`；完整合成facts，来源/effect/cost等明确QA | EntityDetail实际渲染；不能仅三张重复卡片。分别公开用途、约束、版本与关联 |
| eligible article | `/guides/relay-overview/`；至少2H2、FAQ、manual link/tag说明、media-supported explanation | WikiArticle、rendered headings/TOC、FAQ、RelatedPages、Sources |
| no-media page | `/guides/source-check/`，如何校对QA规则版本；MDX自身完整，非缺图占位 | MC-04 rationale：文字判断任务不需要视觉；无hero/gallery/trailer；独立review后才能称accepted no-media |
| dates/version/404 | 所有published page有合法published/updated与sources；facts有QA patch，guide正文区分规则revision与发布日期；有效首页/Hub恢复 | Inventory validation/freshness、BaseLayout/404；真实未知route返回HTTP404，非只有`404.html`文件 |

媒体：**三份独立资产/角色**，不得一图充三种：①实际运行的fixture UI截图（标`synthetic fixture UI capture`，不是gameplay）；②原创cover/key art（显示三回路灯具的QA视觉设定）；③原创inline explanatory figure（回路与补给关系，alt/caption/source）。guide Manifest gallery消费解释图、MDX上下文明确解释；需要正文特定位置时直接使用既有GameMedia，而不扩展Manifest字段。cover可作hero/defaultShare，截图作为有实际用途的gallery；no-media页面仍可有SEO share fallback，不等于正文有media。

截图分两步：先构建没有截图声明的seed fixture，捕获真正渲染UI后再注册文件/metadata，并fresh-build最终fixture。报告同时记录seed capture identity与final output identity，不声称捕获的是尚未存在的最终构建。seed不是完整REF-A PASS；不得放placeholder PNG或把SVG称截图。

PASS证据：route/link crawl、canonical/meta/schema/sitemap/robots、media验证及公开caption/source、不泄private rightsRef、TOC/breadcrumb/related、ad-ready布局/CLS/obstruction、keyboard/overflow、实际assembled screenshots与独立review。Human media/use、no-media rationale、身份/内容完整性和ad审查保留未签署状态。

## 5. REF-B — Problem Guide / Tool

最小4个任务/恢复相关route加首页/About：`/guides/`、`/guides/relay-budget/`、`/tools/relay-budget/`、`/guides/check-budget/`。Guide正文：直接答案→ordered steps→comparison assumptions→mistake/recovery→完成判断→人工next link。表格比较“数量改变/单价改变”，声明只是假设运算，不冒充真实经济策略。

tool definition用既有calculator schema；QA规则 `total = quantity × unitValue`。输入quantity min1/max10/default3/step1，unitValue min1/max20/default4/step1，precision0；来源/patch为QA规则revision。实际通过ToolShell→CalculatorIsland→evaluateCalculator；`3×4=12`必须由消费链输出，不写static12当运行结果。

| 情形 | 既有行为与确定性期望 | 证明边界 |
| --- | --- | --- |
| valid | quantity3/unitValue4→12；quantity5/unitValue4→20 | pure计算与hydrated UI都实际执行 |
| invalid/non-finite | core normalize以default代替NaN，quantity→3；越界999→10，配unitValue4→40 | 如实验证现有normalization，不为该slice要求新增error schema；输入定义不合法则既有schema应reject |
| empty | actual numeric input删除产生valueAsNumber NaN，现有normalize恢复default3；其他值4时output12 | 必须真实浏览器操作；不是向函数传NaN就称UI empty PASS |

任务媒体：项目原创`quantity × unitValue`解释图，带真实authorship/source、accessible text。视频明确排除：短QA算式/静态解释足够，video不增加理解；不是rights waiver。figure/带局部scroll的table只复用已支持模式，不要求任意裸MDX表自动可访问。

next-step是MDX人工链接到check-budget；RelatedPages只能补充阅读。Guide→tool→结果→返回guide→next check真实可达，错误/空输入仍可理解/恢复。验证content structure、工具valid/invalid/empty、title-to-answer、responsive figure/table、keyboard/focus/overflow、来源和视频决定；Human标题承诺/答案审查独立保留。

## 6. REF-C — Tactical / Systems

最小输入：`/guides/`；三个独立系统页 `/guides/light-system/`、`/guides/supply-system/`、`/guides/route-system/`；三篇独立tagged action guides `/guides/light-check/`、`/guides/supply-check/`、`/guides/route-check/`；一ranking article `/meta/relay-priorities/`；About与404。系统之间存在真实正文相互链接，action guide不同于系统描述，不能三页重复凑六项。

每篇Guide由Inventory提供tags；nested navigation使用现有group/children。系统回路/选择明确虚构QA设定：灯光信息、补给库存、路径选择。theme/原创视觉依据来自这套具体设定，不能只贴generic gear/tactical chrome。

**公开且可观察的deterministic editorial relevance method**：system页的tags如`[relay, light]`；light-check有相同两tag，supply-check/route-check各有`relay`和其任务tag。方法`tag-overlap-v1`：shared-tag count降序，同分按pageId英文升序。作者在MDX ranking/系统正文公开tag集合、计数、顺序、QA规则revision与适用范围；在Inventory人工填同一有序relatedPageIds。test从唯一Inventory标签独立计算期望，比较公开表格、ordered IDs与最终RelatedPages实际链接顺序；不能只断言手写常量等于自己。

这只证明**带方法的编辑排序+运行时人工关系消费**，不是新增自动tag排序器。现有getRelatedPages并不计算标签分数；正文与输入方法是可审查的editorial决策。若独立review认为§V必须要求自动计算的生产consumer，精确记录该缺口并STOP，另行有限裁决，不创建通用ranking engine来预先解决。

媒体：独立version-labeled系统map/diagram，和另一份原创QA世界identity visual（例如三个具体回路的灯具/线路/物件组合，文字/任务上下文一起可识别）。装饰性tactical chrome另标decorative，不能计evidence media。masked logo/site/game/page title后必须有具体识别依据；人工审查若只能说“通用战术站”则FAIL/PENDING。

**合成世界identity review只证明这个QAfixture表现，不自动记真实游戏GI-02 PASS。** Contract对真实游戏和Human身份义务仍需对应证据；未取得独立Human Game-Identity Review则REF-C完整身份维度不通过。review不可把BF/WoG bounded visual ACCEPT照搬到新QA世界。

验收：taxonomy/route map、editorial relevance ordering check、ranking method/version assertion、nested Escape/focus恢复、contrast/reduced-motion/targets/overflow/keyboard、实际图像及Human identity。0新增系统entity enum；系统是普通guide正文。

## 7. 测试与证据边界

| 层级 | 复用 / 新增范围 | 不可推导 |
| --- | --- | --- |
| A Existing reusable | common859、accepted About修复/adopted-final负正例、已有schema/media/SEO/ads/tool tests、REVIEW42/43有限证明 | 不重跑未变baseline来反复准入；不是本轮结果/新fixture PASS |
| B New deterministic | 3具名reference tests：真实临时project→validate/build→实际HTML/output assertions；tool pure states，tags方法独立计算，媒体正/负路径 | test不会改变Human决定；新test/source影响完整check时在对应实现closure执行一次npm run check |
| C Required browser | Reference各自entry/task/next/真实404；实际UI/media/TOC/FAQ/tool/input/links；移动/桌面/适用断点，Chromium/Firefox/WebKit及其准确版本 | 不能只测HTML存在就称交互PASS，不以IAB截图覆盖多engine或真实Safari |
| D Human / independent | 对准确构建的内容/身份/媒体/no-media/title/contrast/广告review；ChatGPT独立实际diff/图像检查与required Human分开 | 不模拟签署；AI读图不替代required Human |
| E Safari / AX | 当前UNPROVEN。后续真实可信键盘/视口/JS/focus/scroll记录及strict独立验收 | 其他engine多数PASS、合成unit fixture或policy classification均不替代 |

未来精确命令（本轮不运行）：针对单reference `npm exec -- vitest run tests/reference-a.test.ts`（B/C对应文件）；schema/工具相关既有tests按受影响范围调用；fixture内部使用既有`npm run validate`与`npm run build:evidence`生成PENDING候选，只有合法technical synthetic final条件或真实required审批满足时才运行`npm run build`并明确scope。禁止在reference测试内部运行`npm run check`以免自递归；完整check在实现slice外运行一次。

当前 [browser runner][runner] 是固定Field Notes三角色/47矩阵，不支持任意Reference输入。**不能发明REF CLI flags或说已可用于ABC。**后续允许直接复用已安装dev-only Playwright和已有预览启动/正常停止方式，做明确ABC观察；若需要脚本，限一个具名dev-only targeted test，独立审查范围，不新建generic acceptance framework/dispatcher/registry。官方browser观察若缺engine能力就如实NOT_RUN，不能静默换通道。

Browser cadence：非浏览器fixture输入slice不先要求fresh47；每个reference assembly有实际针对性UI证据。最终assembled/release应覆盖完整supported engine/viewport/角色/断点/JS/motion矩阵及Safari；共用Core有效coverage与各Reference完整任务路径可对应复用，但不能漏项。最终矩阵具体执行清单由该时准确源/构建的独立browser计划锁定；本设计不把一个固定巨大Cartesian总数变为所有小slice前置，也不豁免合同项。

广告：保留disabled/empty/enabled真实technical状态。复用 [AdsConfig][ads-config] canonical placements与 [TestAdProvider][test-ad] 的明确synthetic markup；ProjectAd默认空，不假装有provider交付。未来仅临时Reference project将这个既有test provider接入已授权test seam；记录request/rendered/viewable分别事实。真实filled ad/商业CLS与Human Ads Review仍独立，未经启用/授权不得联网provider。无provider能先证明empty安全；enabled synthetic显示只证明布局，不称商业delivery PASS。

报告使用现有证据语义：原始观察的PASS/FAIL/BLOCK/PENDING/NOT_RUN与原因；最终capability outcome仅遵循§W既有enum，未裁定不写PASS或制造新outcome。N/A需具体配置与Contract条件；允许P2/NIT例外才可记录owner/reason/evidence/scope/expiry；P1/Safari缺证不例外。

## 8. 建议的有限实施切片与精确候选范围

以下路径是**尚不存在的提案文件名**，不是声称现有文件/API。`C = Candidate root`、`V = template/codex/verifications/v2.7-ws06/`。最终执行须ChatGPT独立accepted design后另给allowlist；本轮不得创建这些文件。

| Slice | 目的 / proposed precise files | 可观察条件 | STOP / 独立review边界 |
| --- | --- | --- | --- |
| S1 REF-A seed | 新`C/tests/reference-a.test.ts`；新`C/tests/fixtures/reference-media/relay-cover.svg`、`relay-figure.svg`；新`V/REF_A_TECH_EVIDENCE_V1.md` | test中literal inputs写原Inventory/Config/Facts/MDX/Manifest到临时copy；2 hubs/3details/FAQ/no-media/日期/404输出；只原创cover+figure，screenshot项明确缺证 | 不称REF-A完整PASS。source机制问题/缺media rights/需要新pageType或第5Active文件即STOP；独立review测试与seed evidence |
| S2 REF-A真实UI截图与最终媒体 | 修改上述reference-a test；新`C/tests/fixtures/reference-media/ref-a-ui.png`；更新REF-A report | 从真正seed UI捕获，独立记录source/capture/date；注册截图+cover+figure，最终fresh output；二者identity正确分开 | 禁止placeholder/游戏截图冒充/未批准媒体；复核实际PNG与最终output。报告中的capture metadata可在现有report记录，不再加工具 |
| S3 REF-B任务/工具 | 新`C/tests/reference-b.test.ts`；新`C/tests/fixtures/reference-media/budget-figure.svg`；新`V/REF_B_TECH_EVIDENCE_V1.md` | literal guide/tool/next inputs；实际evaluate chain valid/invalid/empty，内容comparison/recovery、video exclusion、responsive解释图 | 没有hydrated empty观察则仅pure证明；发现要求工具行为变更则另有限repair，不扩张当前slice；独立review |
| S4 REF-C系统/编辑排序 | 新`C/tests/reference-c.test.ts`；新`C/tests/fixtures/reference-media/relay-system-map.svg`、`relay-identity.svg`；新`V/REF_C_TECH_EVIDENCE_V1.md` | 3systems+3taggedguides+ranking content，published method/version、标签计数、人工related顺序与实际输出一致；nested nav；2实际视觉资产 | 自动tag consumer不存在的事实必须保留；方法不满足§V时STOP，不新增rankingframework；identity Human/Safari仍PENDING；独立review |
| S5 assembled browser/ads与报告 | 修改3REF reports；**仅实际需要自动采集时提议新增**`C/tests/reference-assembly-browser.test.ts`，执行前另锁allowlist；使用已有test provider，项目替换只在临时copy | 准确ABC output的全任务路径、media/tool/TOC/FAQ、nav/404/overflow/reducedmotion/断点；adsdisabled/enabledsynthetic/empty几何与遮挡实际记录；原始FAIL保留 | 缺engine/允许通道即NOT_RUN；不得加公开网络/provider、通用runner/schema，P1缺陷另repair；ChatGPT实际diff与浏览器证据独立review，不因此关闭06B |
| S6 required Human/Safari与formal06B | 新`V/WS06B_ASSEMBLED_INDEPENDENT_REVIEW_V1.md`作为实际独立结果索引；更新3reports的真实新增证据引用（旧结果追加保留） | §V逐项无漏、准确构建签署、相关realSafari/AX、独立接受依据齐全后才能formal verdict | 缺required Human/真实Safari/Reference义务维持BLOCK，不自签；状态同步不在此提案中，另锁治理allowlist |

Product runtime机制预计0新增/修改；dev-only测试与fixture资产并非PRODUCT增长。3tests不得演进为自定义input schema、runtimePattern分類或fixture registry。Data可在每个test中一次定义literal输入，利用现有helper写到临时authority；若文件体积或重复真正妨碍维护，再独立评估小范围数据拆分，不预先新建sharedfactory。

### 后续最小Safari控制通道可行性检查

不创建Active源文件；检查正式允许GUI/browser surface inventory能否控制真实Safari、能否发送可信系统按键并读取截图/可见结果。不读取cookies/credentials/私有工具实现，不用脚本注入或访问拒绝绕过。以前nativeGUI timeout是历史事实，先诊断当前通道层；只使用已允许的入口，不能把用户本机登录态说成当前进程已取得。

可用：另有限计划准备准确source/fixture/final-dist、viewport/JS会话，执行必须coverage并正常停止owned preview；版本/按键/可见focus与scroll、artifact、操作者/日期来自实际观察。不可用：记录工具/连接/权限具体环节，保留UNPROVEN；不自动降级Chrome/IAB/匿名访问，不复活iteration35桥接，不改变Safari/macOS键盘偏好。该检查尚未执行。

## 9. Contract覆盖与未接受项

| Contract义务 | 本设计承接 | 全面接受前的缺证 |
| --- | --- | --- |
| §V A全部content/media/PASS | §4与S1/S2/S5 | fixture尚未建立；真实截图/全部独立与Human/浏览器证据未执行 |
| §V B全部content/media/PASS | §5与S3/S5 | tool实际UI states/标题人审/完整任务与媒体证据待采集 |
| §V C全部content/media/PASS | §6与S4/S5 | editorial relevance符合性须独立裁决；系统图/identity人工、完整AX待证 |
| §T assembled independent gate / PA-01 | reports+准确output+S5/S6 | Coreunit或两个boundedproof不足；完整06B独立接受尚无 |
| §U Human身份/内容/媒体/广告 | §3/4/5/6/7/S6 | syntheticQA不替代required Human、真实GI-02或三个PROJECT-* |
| §W / Y outcome与阻塞 | §7/9 | 不产生41/41表，不改变原ID/含义或P1阻塞；release仍未接受 |

## 10. 轻量设计自检与结束边界

现有接口/文件引用均须可定位；候选新路径显式标为未来提案。检查三REF内容、媒体和PASS义务逐项有去向，authority不重复；查看scope仅本文，前序inventory/历史记录不变。无测试/build/browser命令本轮执行，无新依赖/类型/schema/enum/runtime field/compatibility layer。

本设计不新增Pattern component，Comparison继续不是WS05默认Required，REF-B比较假设由普通MDX表达。不修改03A/03B/03C/Search或WS03实现，不把当前source称iteration33 fingerprint；不重写历史FAIL/PENDING。

WS06A NOT CLOSED；WS06B NOT ACCEPTED；WS07 final adoption0/3；Human Media Approval PENDING；Safari/AX UNPROVEN；41/41 NOT ACCEPTED；Global PRODUCT/RELEASE NOT ACCEPTED。设计可review不等于Fixture/产品/发布已PASS。所有future slice实施未开始，无commit/push/tag/merge/deploy/release。完成后交ChatGPT独立review再决定下一有限切片。

[candidate]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE
[amendment]: /Users/randyz/work/coding/hot_words_web/template/architecture/V2.7_ARCHITECTURE_SIMPLIFICATION_AMENDMENT_V1.md
[contract]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md
[inventory]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws06/WS06_ACCEPTANCE_GAP_INVENTORY_V1.md
[ws03]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws03/CONSOLIDATED_WS03_TECH_REVIEW_V1.md
[ws04a]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws04a/SIMPLIFIED_WS04A_FINAL_REVIEW_V1.md
[ws05]: /Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws05/WS05_FINAL_TECH_REVIEW_V1.md
[review42]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-two-game-proof/iteration42/chatgpt-independent-review.md
[review43]: /Users/randyz/work/coding/hot_words_web/template/codex/executions/v2.7-two-game-proof/iteration43/chatgpt-independent-review.md
[inventory-schema]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/page-inventory.ts
[guide-route]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/guides/[...slug].astro
[optional-routes]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/optional-routes.ts
[item-route]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/items/[...path].astro
[entity-route]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/entity-route-model.ts
[site-data]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/site-data.ts
[meta-route]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/meta/[slug].astro
[tool-route]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/tools/[slug].astro
[tool-shell]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/ToolShell.astro
[calculator]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/islands/CalculatorIsland.tsx
[fixture-helper]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/helpers/core-build-fixture.ts
[adoption]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-adoption.ts
[audit]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/audit-build.ts
[runner]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/run-core-browser-evidence.ts
[ads-config]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/config/ads.ts
[test-ad]: /Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/fixtures/ads/TestAdProvider.astro
