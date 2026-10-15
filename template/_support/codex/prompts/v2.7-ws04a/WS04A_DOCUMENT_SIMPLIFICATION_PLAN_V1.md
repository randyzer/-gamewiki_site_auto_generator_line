# WS04A DOCUMENT SIMPLIFICATION PLAN V1

**PLAN STATUS: READY FOR INDEPENDENT REVIEW**

日期：2026-10-08（Asia/Taipei）。TYPE：PLAN ONLY / NO IMPLEMENTATION。

**目标：** 仅修改 8 份 Active WS04A 文档，把 49 项大型工作表收缩为 5 个普通项目负责人可填写的决策块；A0–A9 保留为项目采用方法，技术值完全引用已有权威。

**边界：** 不创建 Game Adaptation runtime schema/config/type/field，不开始 WS05。PRODUCT CODE DELTA 本轮和本次计划的后续文档简化均为 0。本轮唯一产出是这份计划；所有下列修改均尚未执行。实施后仍需独立文档 diff review，不在计划内关闭 WS04A 或其它 Gate。

**技术形式：** 现有 Markdown 方法与人工决策记录；无代码、解析器、依赖或新的验证工具。

## 依据与不可重开结论

已读取 [INVENTORY]、8 份 Active 文档、[AMENDMENT]、[STATE]、[LEDGER] 及 [WS03-REVIEW] 的 post-repair 记录。

ChatGPT `Simplified WS04A Binding Review` 的独立全文未在本轮搜索的本地记录中定位到。本计划采用**用户本轮明确给出的已确定审查结论**作为指令依据；不虚构 Review 文件、引文、签署或已读取原文，也不重新裁定这些结论。这不妨碍依照已明确的范围提交文档计划供独立审查。

固定前提：49 个候选记录的真实 runtime consumer 为 0；WS04A 不创建 runtime adaptation schema 或字段；9 个既有 authority 保持原所有权；A0–A9 是 Project / Adoption Method；desiredPatternIntent 是自由文本；WS05 出现真实 consumer 后才能另行评估 Pattern runtime 输入；本次产品代码 0 delta。本文中的块名和填写提示都只是 Markdown 小标题，不是字段、类型或枚举设计。

## 严格文档 allowlist：8 个既有文件

保持原文件路径，不删除、移动、重命名，不额外创建方法文档。保留已有 inbound links；以标题/内容解释新的职责。

| Active file | 拟修改内容 | 为什么必须修改 |
| --- | --- | --- |
| [METHOD] | 去掉总配置/schema备选讨论与“后续适配契约/schema实施”路线；明确 A0–A9 的方法性质，映射到 5 块；保留长期来源、任务、视觉、媒体、人审规则；状态只链接治理入口 | 方法目前仍把未来 Starter 检查/适配契约作为后续方向，多个步骤等待已完成的03接口；必须与已定文档方法边界一致 |
| [WORKSHEET] | 原六张表/49项改为5块、14个简短填写提示；共用项目身份与Page ID范围；不再每表重复责任/审核/来源列 | 这是实际填写入口，不修改就不能完成减负；旧A–F结构和等待句继续暗示大型binding |
| [BASELINE] | 压缩为既有 authority/consumer 参考表；修复R1；移除旧动态 Gate 快照；iteration33身份和测试数字明确标历史，当前证据指向post-repair正式记录 | 当前仍描述已退役live接口、旧WS03状态，以及把iteration33 working-tree SHA当当前源 |
| [DEPENDENCY] | 从“未来契约/逐字段reconciliation”改为方法→现有authority引用指南；去掉失效gate状态列、schema冻结前置；保留明确的真实采用未决项 | 旧列/核实顺序将完整06A和正式03等待作为当前前提，且时间行仍引用live；不能作为有效的Active引用指南 |
| [READINESS] | 用短文说明如何使用5块、引用原值、留下缺项、提交人工审核；删除10概念组与49项的重复说明、未来schema/载体步骤及旧动态进度统计 | 已有workspace方法文件就是人工记录载体，无需另定适配数据文件；当前readiness仍把schema/Gate等待及大范围核验当后续路线 |
| [CHECKLIST] | 缩为5块各1–2个实质问题，加范围/authority/R1–R3检查；原五文档/六表/全protected fingerprints要求改为本次8文档局部diff审查 | 旧清单检查对象和数量已失效，还保留“当前无03接受”等状态，易将文档减负变为新的重型验证工作流 |
| [EXAMPLES] | 只更新“工作表位置”到5块及不再适用的“等待accepted resolver”方法建议；其余来源、时间、旧问题、原FAIL/BLOCK、人审/权利限制不改 | 8个例子仍引用B/C/D/E/F栏位；不改会使新模板无法按例定位。这是Active教学映射，不是底层历史证据文件 |
| [INPUTS] | 保留真实项目/案例输入表，明确2026-10-06输入的时间范围；旧“当前接口缺失/等待03”内容改为当前基线的链接；删除旧适配schema/三件套代码实施和06A全阻塞前提 | 此文件仍被method当Active入口引用，声称主题/媒体/搜索接口待实现，不能继续引导读者使用过期假设 |

除这8份以外的既有文件不进入本次简化修改范围。计划、盘点和所有正式独立审查记录保持其各自时间事实；后续治理状态同步需单独授权，不能通过第9份文件“顺手同步”。

## 目标填写结构：5块、14个提示

项目负责人打开工作表后，只看到下列5块。身份与共同来源在项目级填写一次；有相同决定的页面共用已有范围引用，只有决定不同的页面需要补充。页面小标题引用原Inventory中的Page ID，不再在每一块增加独立的Page ID列/清单。

| 决策块 | 简短填写提示 | 表达形式 / 合并来源 |
| --- | --- | --- |
| Adoption Identity（采用身份） | ① 采用哪个项目/游戏、哪些已有页面？② 所采用的源/构建证据在哪里？ | 一段范围说明＋已有身份/构建记录链接。三件套来源与Contract从该记录引用；不要求项目负责人逐项重填四份版本/SHA。A01–A07合并 |
| Player & Content Decision（玩家与内容） | ③ 玩家要解决什么问题，必要术语是什么？④ 原内容能兑现页面承诺吗，若不能怎么处理？⑤ 为什么选择这一组合意图？ | 问题/术语一段；原title/content/facts与证据链接、仅说明实际落差；desiredPatternIntent自由文本。相关原B/C记录合并 |
| Visual Decision（视觉决定） | ⑥ 采用哪些现有视觉选择，游戏依据在哪里？⑦ 有哪些具体可用性或游戏识别风险？ | 选择理由＋Config/theme/原视觉证据引用；共同主题只填一次，页面例外另说明。不抄token值、字体枚举或brand资产属性 |
| Media & Journey Decision（媒体与后续路径） | ⑧ 为什么用/不用媒体或视频，缺失时如何仍给出完整答案？⑨ 原资产/媒体决定在哪里？⑩ 搜索与下一步为什么对玩家有用？⑪ 时间/版本依据来自哪里？ | 简短需求理由＋Manifest/唯一决定表引用；搜索原开关/关系引用＋理由；原日期/source/patch引用。不复制运行值 |
| Review & Evidence（审核与证据） | ⑫ 谁负责决定、谁实际审核？⑬ 哪份审核证据适用于这个源/构建？⑭ 哪些缺项未解决、什么时候复查？ | 项目级一次角色责任说明＋既有签署记录；缺项只列实际问题。责任角色有区别，重复署名/证据格取消 |

14个提示是最大默认填写入口，**不是14个强制新字段，也不是把49个字段藏进14个嵌套对象**。有合适原记录时直接引用，不重复回答；不适用时只需写事实理由，不造批准或状态；源/build缺席时诚实写未提供，不要求为填写工作表临时构建或全树hash。每条决定以一句话和精确引用起步，只有真实缺口、风险或不同页面选择需要展开。

媒体提示⑧保留四类价值（理解、游戏识别、玩家决策、证据质量）的判断方法，但不变成四个评分字段；视频用/不用、等价内容和不播放答案仅在涉及视频的决定中说明。无媒体要区分“没有实质帮助”与“有用但未取得”，保留完整答案、无空槽及能力边界；需要更多细节时引用原媒体决定/内容，而非另建生命周期表。

提示④必须保留承诺与可支持答案的区别，不能因为合并删掉真实落差。提示⑫保留事实、权利、视觉/内容、技术和独立审核职责的区别；只有重复的填写位置删除，责任和签署本身不合并成自动批准。

## 49项逐项处置映射

原项编号来自 [INVENTORY]，仅用于核对。下表“删除”指删除独立填写格或技术值副本，**不删除原authority、记录、证据或适用规范义务**。该映射保存在计划里供diff review，后续新工作表不附回49项清单。

| 原项 | 目标提示 | 合并/删除与保留方式 |
| --- | --- | --- |
| A01 | ⑴–⑭中的提示 1 | 保留项目/游戏与采用范围；Page ID清单只引用一次 |
| A02 | ⑴–⑭中的提示 2 | 合并为源证据链接，删除独立SOP版本填写格 |
| A03 | ⑴–⑭中的提示 2 | 合并为同一源证据链接，删除独立Prompt版本填写格 |
| A04 | ⑴–⑭中的提示 2 | 合并为源证据链接；不把iteration33指纹当当前身份 |
| A05 | ⑴–⑭中的提示 2 | 引用唯一Contract身份；删除另填Contract/SHA的重复格 |
| A06 | ⑴–⑭中的提示 2 | 保留项目源/准确build证据链接；不臆造不存在的dist |
| A07 | ⑴–⑭中的提示 2 | 引用已有authority入口表；删除每项目另填技术入口名单的格 |
| A08 | ⑴–⑭中的提示 12 | 保留事实/内容责任，移动到统一责任说明 |
| A09 | ⑴–⑭中的提示 12 | 保留权利责任及授权范围，引用原决定 |
| A10 | ⑴–⑭中的提示 12 | 保留视觉/内容独立审核角色，统一记录一次 |
| A11 | ⑴–⑭中的提示 12 | 保留技术/独立验收职责，统一记录一次 |
| B01 | ⑴–⑭中的提示 3 | 合并概念/对象与必要术语，不建对象目录 |
| B02 | ⑴–⑭中的提示 3 | 保留必要术语选择理由；实际用词引用原content/facts |
| B03 | ⑴–⑭中的提示 4 | 来源/版本依据并入答案证据引用；不抄日期/patch |
| B04 | ⑴–⑭中的提示 1 | 删除单独Page ID列，继承采用范围/页面小标题 |
| B05 | ⑴–⑭中的提示 14 | 未决问题集中记录；实际责任人由提示12引用 |
| B06 | ⑴–⑭中的提示 13 | 删除逐行审核引用列，统一引用原审核记录 |
| C01 | ⑴–⑭中的提示 1 | 删除单独Page ID/Inventory列，使用统一页面小标题 |
| C02 | ⑴–⑭中的提示 3 | 入口问题和页面角色并入玩家问题 |
| C03 | ⑴–⑭中的提示 3 | 合并主要任务与入口问题，避免重复句 |
| C04 | ⑴–⑭中的提示 4 | 引用原title，简述其承诺；不复制标题值 |
| C05 | ⑴–⑭中的提示 4 | 原正文/事实及证据链接，不复制完整答案 |
| C06 | ⑴–⑭中的提示 14 | 真实承诺落差保留；处理选择写提示4，问题清单只集中引用 |
| C07 | ⑴–⑭中的提示 5 | 保留desiredPatternIntent自由文本与理由，无enum/ID |
| C08 | ⑴–⑭中的提示 10 | 合并下一步与相关路径理由；技术目标引用原关系/内容 |
| C09 | ⑴–⑭中的提示 12 | 删除逐行责任与审核列，集中到提示12/13 |
| D01 | ⑴–⑭中的提示 1 | 删除重复Page ID/范围列；项目共同主题继承一次 |
| D02 | ⑴–⑭中的提示 6 | 视觉问题与选择合并；引用现有Config/theme |
| D03 | ⑴–⑭中的提示 6 | 游戏证据引用与选择理由放一起，保留原始证据含义 |
| D04 | ⑴–⑭中的提示 6 | 合并拟选呈现/理由；不另存token/角色值 |
| D05 | ⑴–⑭中的提示 7 | 保留实际可用性风险；已核验材料引用原证据 |
| D06 | ⑴–⑭中的提示 2 | 删除每行接口依赖格；统一引用当前接口指南，真正缺项集中提示14 |
| D07 | ⑴–⑭中的提示 12 | 删除重复选择者/审核列，统一责任和证据 |
| E01 | ⑴–⑭中的提示 1 | 删除Page ID/任务关联格，继承页面与玩家问题 |
| E02 | ⑴–⑭中的提示 8 | 四类价值合并为简短需求理由，无评分模型 |
| E03 | ⑴–⑭中的提示 9 | 仅链接唯一原媒体决定记录；缺席明确未提供 |
| E04 | ⑴–⑭中的提示 9 | 仅引用原Manifest资产/映射，不复制用途/URL/type真相 |
| E05 | ⑴–⑭中的提示 13 | 权利/语义/人工证据引用原决定；不在模板复制批准状态 |
| E06 | ⑴–⑭中的提示 8 | 视频使用/排除、等价说明需求并入同一媒体判断，按适用情况写 |
| E07 | ⑴–⑭中的提示 8 | 保留完整no-media/缺失方案与边界；复用原答案和布局说明引用 |
| E08 | ⑴–⑭中的提示 14 | 实际组合缺口并入统一未决项；责任/证据引用提示12/13 |
| F01 | ⑴–⑭中的提示 1 | 删除重复Page ID/整体范围格 |
| F02 | ⑴–⑭中的提示 10 | 保留搜索任务/corpus理由；原features.search值只引用 |
| F03 | ⑴–⑭中的提示 10 | 合并有效下一步和相关性理由；不抄route/完整relatedPageIds数组 |
| F04 | ⑴–⑭中的提示 11 | 只引用原publication/update/source/patch-version依据，不创建复核日期值 |
| F05 | ⑴–⑭中的提示 11 | 删除独立动态标签决定格；长期禁止无依据标签规则留method，仅真实文案例外说明依据 |
| F06 | ⑴–⑭中的提示 13 | 项目源/build继承提示2；审核/技术证据统一引用，不每页重复构建身份 |
| F07 | ⑴–⑭中的提示 13 | 引用原规范审核记录；删除复制evidenceStatus/verifiedOutcome的独立填写格 |
| F08 | ⑴–⑭中的提示 14 | 集中缺项、真实责任人和复查触发；责任引用提示12 |

保留的长期信息：采用范围/源/build可追溯；术语与事实依据；玩家任务、承诺、实际答案、缺口；组合意图；游戏视觉依据与可用性；媒体四类价值、权利/语义/视频/no-media边界；搜索与有用下一步；日期/来源/patch-version语义；实际责任、签署、未决与复查。删除的重复项：各表反复的Page ID/范围、来源版本与构建、owner/reviewer、报告链接、接口依赖列，以及任何另存运行值/能力outcome的填写位置。

## A0–A9保留为采用方法

| 原方法步骤 | 5块中的位置 | 方法职责 |
| --- | --- | --- |
| A0 | Adoption Identity | 核对采用范围与源/build证据；不创建运行身份registry |
| A1 | Player & Content Decision | 确认必要术语和游戏事实来源；不是taxonomy config |
| A2 | Player & Content Decision | 比较问题/承诺/实际答案并处理落差 |
| A3 | Adoption Identity / 页面小标题 | 引用已有有效Page ID；不改route/发布状态 |
| A4 | Player & Content Decision | 自由文本desiredPatternIntent；无Pattern enum/ID/schema |
| A5 | Visual Decision | 游戏证据支撑现有主题选择；optional visualRoles不扩张 |
| A6 | Media & Journey Decision | 任务媒体价值、视频/no-media、原Manifest/权利记录引用 |
| A7 | Media & Journey Decision | 搜索/相关路径理由与原时效依据；无新运行字段 |
| A8 | Review & Evidence | 真实责任、范围、签署、缺项、复查 |
| A9 | Adoption Identity + Review & Evidence | 看当前源接口/审核证据是否对应，变更时只核对受影响引用；不再等待冻结adaptation contract |

步骤顺序不变成必填字段清单；共同决定只写一次。不另开“WS04A runtime contract”任务，且不以表填完推导内容/权利/视觉/产品或发布完成。

## 9个既有authority的防复制规则

沿用盘点的9个入口域及原职责，不增加第10个技术真相来源。下面是文档引用规则，不改任何authority文件。

| 既有authority | 决策记录允许保留什么 | 必须删除/避免的副本 |
| --- | --- | --- |
| SOP唯一Product Contract [CONTRACT] | canonical文档/审核记录引用，必要capability关联 | 第二套Registry、要求/严重度/outcome或例外定义 |
| Page Inventory [PAGE-TRUTH] | 既有Page ID及原记录定位；选择理由 | route、发布/索引/开发状态、title、related数组、日期的第二份值 |
| 根game.config.ts [GAME-CONFIG] | 配置位置、选择理由；搜索值以原配置为准 | enable/search、navigation、featured、brand、visualRoles另存运行值 |
| semantic tokens/theme.css [THEME] | 原token/样式位置与游戏选择依据 | 第二套token配置、主题引擎、preset registry、genre mapper |
| content [CONTENT] | 原正文/FAQ/文件/段落引用；承诺差距简述 | 复制全文/FAQ答案、术语词典作为新输入 |
| facts [FACTS] | 原实体/事实记录与来源引用 | 复制事实值/分类/patch/version到adaptation记录 |
| tool definitions [TOOLS] | 原工具定义/公式与版本来源引用 | 复制公式、patch/updatedAt或另建版本authority |
| Media Manifest [MANIFEST] | 原asset ID/映射位置；媒体need/use理由 | src、尺寸、映射、share/defaultShare、alt/credit/poster/equivalent值的副本或新OG资产库 |
| source/Provenance [PROVENANCE] | 原source记录引用及语义说明 | 新accessed/checked/verified日期、私有evidenceNote副本或实时状态数据 |

唯一项目媒体决定表依旧由原 [MEDIA-DECISION] 查找/解析机制持有；工作表只引用，不创建第二张lifecycle表。当前Candidate缺席是缺项事实，不在本次文档简化中补造表/人审/权利批准。实际项目以后已有表时直接引用，不能因为template填写要求扩张本次文件范围。

## R1 / R2 / R3的具体修订

**R1 — 清掉已退役的接口描述。** [BASELINE] 的03D-freshness字段/union/live呈现/迁移段去除liveStatus/liveStatusSchema/observed-live/not-live/observedAt输入描述；[DEPENDENCY] 时间行及 [READINESS] 时效行去掉这些引用。改成原Inventory.publishedAt/updatedAt/sources、Provenance.accessedAt→sourceCheckedAt、Fact/Tool.patch/updatedAt与保留的patch/version语义。不重新设计live模型，也不把它迁往另一个schema。

保留 `updatedAt >= publishedAt`、sourceCheckedAt不冒充verifiedAt、publication/update/source/patch-version分离。按 [FRESHNESS] 如实说明：VersionContext接口保留，现有生产文章没有传入它；不写成已经全面接入的消费者。本次不会为了文档同步改代码/补调用。无依据实时/热门/趋势文案的长期禁止规则仍在method，不要求各页额外填写动态标签字段。

**R2 — 解除过期等待句，状态归治理。** 8文档中的formal WS03 NOT_ACCEPTED、FORMAL_WS03_GATE_PENDING、完整06A必须先接受、等待03A/B/C/D实现、formal adaptation schema/contract freeze等当前前提删除。当前事实由 [STATE]、[LEDGER]、[WS03-REVIEW] 指向 `WS03 — ACCEPT — TECH / CLOSED`；Safari/WS06A不阻塞WS04A/WS05的非浏览器工作，但AX、assembled/WS06B、PRODUCT/RELEASE边界和真实Safari证据仍保留。不要把解除无关阻塞写成Safari/AX通过，也不要把后续WS05路线写成本轮已启动。

方法/工作表/readiness等reusable docs只写长期规则和治理链接，不散布新的“WS03已接受/WS05已授权”动态快照。接口基线可在带日期的事实说明中引用post-repair正式记录，明确当前状态authority仍在治理/正式review中；这不建立新的进度或Gate。

**R3 — 旧指纹只作历史。** [BASELINE] 来源表改标“iteration33 historical snapshot”，三件套working-tree SHA、859测试/78断言/fresh47等数字也标其原源/日期；保留原历史证据链接，不声称当前源码继续具有相同指纹。原HEAD可能相同也不等于未提交工作树相同。当前采用身份只引用相应正式post-repair记录和实际项目源/build证据；不得新造当前全树SHA。method/worksheet只要求精确证据指向，不强制重做全workspace hashing。

Active接口说明只保留当前真实字段和consumer，旧live实现细节留在原iteration32/33记录，不把旧接口union复制成Active参考。R3历史标记不修改任何旧identity JSON、日志、diff、审查或归档字节。

## 未来文档修订顺序（全部未执行）

- [ ] 记录8个allowlist文件的准确preimage到项目外临时目录；记录三Candidate原有diff/status。只读核对治理入口与Inventory，禁止重新做大型hash/框架。
- [ ] 修改WORKSHEET为5块/14提示，METHOD映射A0–A9；共同来源/范围/责任继承，不产生新的运行输入或要求项目负责人另建数据文件。
- [ ] 修改BASELINE、DEPENDENCY、READINESS，完成R1/R2/R3；压掉重复的逐字段所有权/等待schema说明，只引用既有输入与人工决定。
- [ ] 修改CHECKLIST、EXAMPLES、INPUTS到新5块；清掉旧等待句；保留原真实项目/案例的历史时间、失败/未审范围及禁止推导。
- [ ] 仅核对8文档diff、链接和必要符号；确认49项去向、14提示/5块、没有复制authority、没有过期当前前提；保存具体diff供独立review后STOP。不更新任何Gate/outcome，也不转入WS05。

任何实施需要第9个既有文件或产品变更时，停止并报告，不自行扩张本计划。此处是实施边界描述，不是当前实施授权。

## 有限文档验证与回退

本轮不执行以下实施检查。后续获批实施时使用现有读取命令和人工diff，不新增验证脚本/测试框架：

1. 从8份临时preimage逐文件与Active文件比较，核对实际修改路径集合是allowlist子集；root不是Git repo，不伪造根目录`git diff`结果。
2. 使用 `git diff --no-index --check <preimage-file> <active-file>` 检查每份文档空白；有内容差异可能返回1，必须区分正常diff与空白错误。`<...>` 是检查时真实临时文件路径，不能照字面执行。
3. 用下列定向搜索检查R1/R2；零命中exit1为正常。只查8份Active文档，不对历史证据要求零命中。R3的旧SHA允许留在明确标出的historical snapshot区，不能出现“当前workspace SHA”含义。

```bash
active_docs=(
  template/design/ws04a/GAME_ADAPTATION_METHOD_V1.md
  template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md
  template/design/ws04a/WS03_CANDIDATE_INTERFACE_BINDING_BASELINE_V1.md
  template/design/ws04a/WS03_INTERFACE_DEPENDENCY_LEDGER_V1.md
  template/design/ws04a/WS04A_BINDING_READINESS_V1.md
  template/design/ws04a/WS04A_DESIGN_REVIEW_CHECKLIST_V1.md
  template/design/ws04a/WOG_BOMBFARM_TRACEABILITY_EXAMPLES_V1.md
  template/roadmap/WS04A_GAME_ADAPTATION_DESIGN_INPUTS_V1.md
)
rg -n 'liveStatus|liveStatusSchema|observed-live|not-live|NOT_ACCEPTED|FORMAL_WS03_GATE_PENDING' "${active_docs[@]}"
rg -n 'WS06A|06A|Safari|fingerprint|working-tree|iteration33|schema|contract' "${active_docs[@]}"
```

第二个搜索不是机械零命中测试：人工检查Safari仅保留实际验收边界、旧指纹仅为历史、schema/contract只用于禁建说明或原Core/SOP authority而非待实现适配接口。

4. 三Candidate分别对比实施前后的 `git diff --binary`、`git diff --cached --binary` 与 `git status --porcelain=v1 --untracked-files=all`，必须完全一致。它们原有未提交产品delta不可归零/重置，也不能冒充本轮变更。
5. 人工核对5块与14提示、每个49项的去向、证据链接可定位、sourceCheckedAt/patch-version及责任边界保留。文档内新路径/符号不虚构；不检索/改写全部capability。

不运行product tests、npm check、validate/build、fresh47、Safari、媒体/search browser suites、41/41、6000+文件hash；没有产品/生成契约变化，没有直接验证依赖。历史证据只引用，绝不运行旧工具覆盖日志。

rollback：从本次**文档实施前**的准确preimage恢复确实修改过的8份文件；不能从HEAD/iteration18/33旧版本恢复并抹掉中间修订。没有migration framework、Git reset、产品回退或历史证据迁移。

## 明确不修改

Starter product source、game.config.ts、Page Inventory、Media Manifest、theme.css、src/scripts/config、Active tests、SOP Product Contract/41 capability含义、SOP/Master Prompt、WS03 implementation及正式Review Verdict、WS05 code、PROJECT_STATE、TASK_LEDGER、整体ROADMAP和Amendment本体均不改。

iteration18/32/33/34等历史execution/verification、iteration35归档、archive/**、preimages/postimages、原项目/五案例报告、旧FAIL/BLOCK/identity/build日志保持byte-for-byte。只更新EXAMPLES里的Active教学映射与方法建议，不动引用的历史来源、原日期、数量、失败或签署事实。

不新增adaptation schema/config/type/runtime field、compatibility layer、替代live模型、Pattern enum/ID/schema、依赖或自动审批机制；不开始WS05，不commit/push/tag/merge/release，不关闭WS04A或提升Safari/AX/PRODUCT/RELEASE状态。

## 计划复杂度与完成条件

- Active docs to change：8；未来实施新增文档：0（沿用原文件）；本轮新文件：仅本计划。
- Current worksheet records：49；Target decision blocks：5；默认填写提示：14，条件性细节/已有证据仅引用。
- New runtime fields / schemas / types / abstractions / dependencies / compatibility layers：0。
- PRODUCT CODE DELTA：0；tests delta：0；history delta：0。
- WS05：NOT STARTED；IMPLEMENTATION：NOT STARTED。

独立review应重点检视：是否真的降低填写负担，而非把49项藏进5个大对象；是否保留任务/答案差距、媒体/no-media、人审与来源责任；是否仅引用9个现有authority；R1/R2/R3是否有明确修订路径。发现漏项或新运行输入时修订计划，不自行实施。

## 文件索引

[METHOD]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_METHOD_V1.md>
[WORKSHEET]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md>
[BASELINE]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/WS03_CANDIDATE_INTERFACE_BINDING_BASELINE_V1.md>
[DEPENDENCY]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/WS03_INTERFACE_DEPENDENCY_LEDGER_V1.md>
[READINESS]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/WS04A_BINDING_READINESS_V1.md>
[CHECKLIST]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/WS04A_DESIGN_REVIEW_CHECKLIST_V1.md>
[EXAMPLES]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/WOG_BOMBFARM_TRACEABILITY_EXAMPLES_V1.md>
[INPUTS]: </Users/randyz/work/coding/hot_words_web/template/roadmap/WS04A_GAME_ADAPTATION_DESIGN_INPUTS_V1.md>
[INVENTORY]: </Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws04a/WS04A_BINDING_INVENTORY_V1.md>
[STATE]: </Users/randyz/work/coding/hot_words_web/template/PROJECT_STATE.md>
[LEDGER]: </Users/randyz/work/coding/hot_words_web/template/roadmap/V2.7_TASK_LEDGER.md>
[AMENDMENT]: </Users/randyz/work/coding/hot_words_web/template/architecture/V2.7_ARCHITECTURE_SIMPLIFICATION_AMENDMENT_V1.md>
[WS03-REVIEW]: </Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws03/CONSOLIDATED_WS03_TECH_REVIEW_V1.md>
[PAGE-TRUTH]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/page-inventory.json>
[GAME-CONFIG]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/game.config.ts>
[THEME]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/styles/theme.css>
[CONTENT]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/content.config.ts>
[FACTS]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/facts.ts>
[TOOLS]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/tools.ts>
[MANIFEST]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/media/media.json>
[PROVENANCE]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/provenance.ts>
[FRESHNESS]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/freshness.ts>
[MEDIA-DECISION]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/media-readiness.ts>
[CONTRACT]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md>
