# Simplified WS04A Binding Inventory V1

日期：2026-10-08（Asia/Taipei）。模式：READ ONLY / INVENTORY ONLY。唯一写入为本记录；未修改任何既有文件，未运行测试、构建或浏览器，没有设计裁决、运行模型、字段设计或实施计划。

## 盘点口径与当前现场

- Starter source：`Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`；branch：`v2.7/evolution`；HEAD：`b067e8d4050478072f25a1dc78a8526cdd128cfd`；commit tree：`1df0ade30b1eaf51a76820c8d8b83337786f0dc1`。HEAD/tree 不覆盖未提交工作树；本轮直接读取当前工作树，包括已完成的 live removal。
- 当前治理入口是 [STATE]、[LEDGER] 与 [REVIEW] 的 post-repair 记录；[AMENDMENT] 提供当前简化解释。[BLUEPRINT]、[INPUTS] 与旧 method/binding 的历史表述不重新裁定或改写。
- 本记录不作新的接受/否决结论。WS04A 没有开始产品实施；WS05 没有开始；Safari proof 仍为 0，AX / PRODUCT / RELEASE 的既有独立边界未变。
- **候选 binding 计数单位是现有工作表 A 的 11 个记录项，以及 B/C/D/E/F 的 6/9/7/8/8 个栏目，共 49。** 下文 A01 等仅为盘点行号，不是新增字段、ID 或 schema。[READY] 的 10 个概念组是这些栏目的汇总，不另加 10。
- `Runtime Needed Today?` 指该候选记录本身是否已被生产代码读取。49 个栏目均无读取器，均为 `NO / NO CURRENT CONSUMER`。**这不表示它们引用的 Page ID、主题、媒体、日期等既有运行值没有消费者**；这些消费链另表列出，并标 B。
- 已有 consumer 指真实非测试代码中的读取/解析/呈现调用，不以类型声明、测试传参、未来用途或人工看表代替。静态调用存在也不表示真实游戏采用、人审或发布已经完成。
- 分类允许重叠：A = REUSE EXISTING AUTHORITY；B = REAL RUNTIME CONSUMER EXISTS；C = NO CURRENT RUNTIME CONSUMER；D = DUPLICATE / UNCLEAR AUTHORITY RISK。D 的汇总按独立问题计数，不是每个引用行重复累计。

## A0–A9 方法步骤的事实分类

| WS04A Item | 当前归属 | 当前事实 / Evidence |
| --- | --- | --- |
| A0 来源身份 | existing authority reference + review-only evidence | 三件套源、Contract、项目源/构建/日期供审核；不进入 renderer。[METHOD] [BASELINE] |
| A1 术语与游戏身份 | project/SOP decision record + existing authority reference；实际项目值 currently unresolved | 模板未填写术语；原 brand/content/facts 可输出名称和用词，无术语工作表 loader。[WORKSHEET] [CONFIG] [CONTENT] [FACTS] |
| A2 玩家任务与答案 | project/SOP decision record；引用既有 content/facts | 任务、承诺/答案比较、缺口处理是人工记录；实际正文和 FAQ.answer 由原内容输入渲染。[METHOD] [GUIDE] [FAQ] |
| A3 已有 Page ID 选择 | existing authority reference | 工作表引用已有 Inventory；原 Inventory/config Page ID 为既有 runtime input，由 catalog/navigation/related 消费。[I-SCHEMA] [SITE] |
| A4 组合意图 | project/SOP decision record；runtime binding currently unresolved | desiredPatternIntent 是文字意图；没有生产 Pattern ID/schema/分派 consumer。[WORKSHEET] [READY] |
| A5 视觉依据 | review-only evidence + project/SOP decision record + existing authority reference | 游戏证据/选择理由不被读取；运行值在 CSS tokens/config；visualRoles 是既有 optional preset/helper，当前 config 省略，Core 使用默认值。[THEME] [ROLES] [LAYOUT] [AMENDMENT] |
| A6 媒体/视频需求 | project/SOP decision record + existing authority reference；当前项目决定表 currently unresolved | need/no-media/video 理由供审核；原 Manifest 才是 runtime input。当前空 Manifest、项目媒体决定表不存在。[MEDIA] [M-DECISION] [VALIDATE] |
| A7 搜索/相关/时效 | project/SOP decision record + existing authority reference | 理由/审核引用不被读取；原 search flag、relatedPageIds、日期/source/patch 分别有消费链；已退役 live 字段无生产消费者。[SEARCH] [RELATED] [FRESHNESS] |
| A8 审核责任与材料 | project/SOP decision record + review-only evidence；实际责任人 currently unresolved | 模板未指定当前采用的事实/权利/视觉/技术/独立审核人。Config.identity 的 author/publisher 不等于这些责任记录。[WORKSHEET] [CONFIG-SCHEMA] |
| A9 接口核实 | review-only evidence + existing authority reference；部分旧引用 currently unresolved | 当前源码存在；method/binding 的旧来源、gate、live 引用与当前现场有差异，见 R1–R3。本轮只记录，不完成重绑定或 Gate 裁决。[DEPENDENCY] [BASELINE] [REVIEW] |

没有一个 A0–A9 方法步骤本身是已接入的新 runtime input。每步中已存在的技术值是原 authority 的输入，不能因此把整步、理由或审核记录算作 runtime consumer。

## 现有 authority 与真实消费链

以下 9 个现有权威入口域用于 `EXISTING AUTHORITIES: 9`。Provenance 是嵌在原数据中的共享 source 语义，不是另一个来源注册表；resolver、search adapter 和 freshness projection 不另计 authority。

| Authority / 输入域 | 谁产生、当前值 | 当前 consumer | 类别 / Evidence |
| --- | --- | --- | --- |
| 1. SOP 唯一 Product Contract | SOP 维护规范；工作表仅引用路径/SHA，当前 SHA `1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c` | 规范与独立审核；不是页面 runtime consumer | A, C；[CONTRACT] |
| 2. Page Inventory | 项目维护 pageId/route/module/pageType、发布/开发状态、title/description、relatedPageIds、日期/sources | parsePageInventory → buildEnabledPageCatalog → 页面路由、navigation、featured、getRelatedPages；SEO 读取原日期 | A, B；[INVENTORY] [I-SCHEMA] [SITE] [RELATED] [SEO] |
| 3. 根目录 game.config.ts | 项目维护 brand/site/navigation/homepage/features/可选 visualRoles；当前 search=true、实体/工具模块关闭、未提供 visualRoles | loadGameConfig → siteConfig/catalog；BaseLayout、导航、homepage、搜索路由与索引路径读取配置 | A, B；[CONFIG] [CONFIG-SCHEMA] [SITE] [LAYOUT] [ROUTES] |
| 4. semantic theme tokens / theme.css | 项目 CSS 维护颜色、字体和布局/状态 token；preset 可覆盖有限角色 | global.css 导入 theme.css；组件 CSS vars；BaseLayout data-theme-* + theme-roles resolver | A, B；[THEME] [GLOBAL] [ROLES] [LAYOUT] |
| 5. content | 编辑维护 MD/MDX 与可选 FAQ.question/answer；contentSchema 仅 pageId/faq；当前 guide 为 Starter 示例 | Astro collections → resolveContentPages → guides/meta/news 的 Content；WikiArticle/FAQ 渲染答案 | A, B；[CONTENT] [GUIDE] [WIKI] [FAQ] |
| 6. facts | 项目事实负责人维护原 entity JSON；schema 持名称/分类/patch/updatedAt/sources；当前目录只有 README，模块关闭 | loadFactModule 及 entity 路由、EntityDetail 有条件读取/呈现原事实；当前没有启用的真实实体数据 | A, B（现有条件调用，非已采用数据）；[FACTS] [FACT-LOAD] [ENTITY] |
| 7. tool definitions | 项目维护 calculator/planner JSON，原 toolBaseShape 持 patch/updatedAt/sources；当前目录只有 README，开关关闭 | loadToolDefinition → tools/[slug].astro → ToolShell；当前没有启用的真实工具定义 | A, B（现有条件调用，非已采用数据）；[TOOLS] [TOOL-LOAD] [TOOL-SHELL] |
| 8. Media Manifest | 项目媒体维护者在原 media.json 持资产和 pageId→hero/gallery/trailer/share/defaultShare；当前 assets/pages 均为空 | createMediaCatalog/getPageMedia/getShareMedia → GameMedia/Gallery/VideoEmbed、WikiArticle、BaseLayout/SEO；空数据不等于使用批准 | A, B；[MEDIA] [M-SCHEMA] [M-CATALOG] [M-PRESENT] [VIDEO] [LAYOUT] |
| 9. 原 sources / Provenance 语义 | 来源核实者在 Inventory/facts/tools 的 sources 中提供 sourceUrl/sourceType/accessedAt/可选 publishedAt/evidenceNote | provenanceSchema 验证；Sources 公开来源投影；freshness 取 max(accessedAt)→sourceCheckedAt，不输出私有 evidenceNote | A, B；[PROVENANCE] [SOURCES] [FRESHNESS] |

**项目唯一 Media Decision Table：当前 Candidate 为 NONE。** 查找器只认 `docs/MEDIA_DECISION_TABLE.md` 或根目录同名文件，两处同时存在会报重复 authority；本轮确认两处都不存在。SOP 的 `MEDIA_DECISION_TABLE_TEMPLATE.md` 是模板，不能算已填写的项目权利/需求决定。[M-DECISION] 与 [VALIDATE] 有 build-time 读取/投影代码，当前没有表输入；也不读取 WS04A E 表。该缺席不证明媒体覆盖、人审或权利已经完成。

## readiness 的 10 个概念组：实际运行值与记录分开

这些概念来自 [READY]，不是本轮提出的字段。下表 YES 仅针对明确写出的**原技术值**；所有“理由/工作表记录”仍无生产读取器。

| WS04A Item / Candidate Binding | Current Authority | Current Consumer | Runtime Needed Today? | Category | Evidence/File |
| --- | --- | --- | --- | --- | --- |
| A 身份与审查责任 | 原三件套源、Contract、项目/审核记录 | 人审；身份/责任工作表 NO CURRENT CONSUMER | NO（记录） | A, C | [WORKSHEET] [CONTRACT] |
| B 游戏词汇/分类 | content / facts / brand 是已发表用词的 authority | 原正文/name 可输出；术语选择与证据记录 NO CURRENT CONSUMER | NO（术语记录）；原内容值已有消费者 | A, B, C | [CONTENT] [FACTS] [CONFIG] |
| C 玩家任务/承诺答案 | Inventory.title、content/FAQ/facts、relatedPageIds | 原标题/正文/FAQ/关系消费链；任务/落差/理由记录 NO CURRENT CONSUMER | YES（原 pageId/title/content/关系值）；NO（任务记录） | A, B, C | [SITE] [GUIDE] [FAQ] [RELATED] |
| D 主题选择 | game.config.visualRoles、theme.css tokens、brand | BaseLayout → data-theme-* / CSS；游戏视觉证据与选择理由 NO CURRENT CONSUMER | YES（原主题值）；NO（证据/理由） | A, B, C | [ROLES] [LAYOUT] [THEME] |
| E 媒体需求/使用 | Manifest；项目媒体决定表当前缺席 | 原媒体/视频 renderer；need/no-need/用不用理由 NO CURRENT CONSUMER | YES（原媒体映射/等价内容）；NO（需求记录） | A, B, C | [M-SCHEMA] [M-CATALOG] [VIDEO] [M-DECISION] |
| E 分享 | Manifest.pages[].share/defaultShare | getShareMedia → resolveShareMetadata → BaseLayout OG/Twitter；选图理由 NO CURRENT CONSUMER | YES（原分享映射）；NO（理由） | A, B, C | [M-CATALOG] [SEO] [LAYOUT] |
| F 搜索决定 | Config.features.search，实际 Pagefind corpus | catalog/路由/SearchIsland 与索引；启停/corpus 理由 NO CURRENT CONSUMER | YES（原 search 开关/查询）；NO（选择理由） | A, B, C | [CONFIG] [ROUTES] [SEARCH] [SEARCH-ADAPTER] |
| F 相关路径 | Inventory.relatedPageIds / 原正文实际链接 | getRelatedPages → RelatedPages；相关性理由 NO CURRENT CONSUMER | YES（原关系值）；NO（理由） | A, B, C | [RELATED] [WIKI] |
| F 时效/动态标签 | 原日期/sources/Fact-Tool.patch；旧 live 引用已失效 | freshness/Sources/文章/EntityDetail/ToolShell；依据与动态标签决定 NO CURRENT CONSUMER | YES（原日期/source/patch）；NO（live、标签理由、尚无生产传参的 versionContext） | A, B, C, D | [FRESHNESS] [PROVENANCE] [ENTITY] [TOOL-SHELL] [BASELINE] |
| C desiredPatternIntent | 方法工作表的组合意图文字 | NO CURRENT CONSUMER；没有 Pattern 分派读取器 | NO | C | [WORKSHEET] [READY] |

## 49 个候选记录逐项总表

每行的“产生者”是方法规定的责任角色，**不是声称已经指定了真实姓名或填好了采用实例**。工作表目前是未提供/未评估的 reusable template。人工查看/审核为文档用途，不计 runtime consumer。A 表的记录项与 B–F 表的所有栏目完整列出；需求正文中提到的 alt/caption/credit/placement/poster/accessibleEquivalent 由 E04–E07 覆盖，运行值仍在原 Manifest，未创造额外候选字段。

| WS04A Item / Candidate Binding | Current Authority | Current Consumer | Runtime Needed Today? | Category | Evidence/File |
| --- | --- | --- | --- | --- | --- |
| A01 项目/游戏及采用范围 | 产生：项目负责人；当前采用实例未填写。项目采用范围记录；Page ID 引用 Inventory | 项目/SOP 审核人；运行时不读取采用范围清单；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-A01] [STATE] |
| A02 SOP 来源/版本 | 产生：执行者记录实际 SOP 来源。SOP 源与版本事实；不是 Contract 的副本 | 独立审查人；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-A02] [CONTRACT] |
| A03 Master Prompt 来源/版本 | 产生：执行者记录 Prompt 来源。Master Prompt 源与版本事实 | 独立审查人；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-A03] [WORKSHEET] |
| A04 Starter 来源/版本 | 产生：执行者记录 Starter 来源。Candidate 工作树；旧基线指纹属于 iteration33（R3） | 独立审查人；**NO CURRENT CONSUMER**（该记录） | NO | A, C, D | [W-A04] [BASELINE] |
| A05 Contract | 产生：执行者引用、SOP 维护规范。唯一 Contract 路径及 SHA | 规范/独立审查人；不是新增 Registry 输入；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-A05] [CONTRACT] |
| A06 项目源/构建 | 产生：项目执行者记录源及构建。项目源/final build 证据；本轮没有新采用构建 | 审查人；旧源证据不表示当前构建；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-A06] [REVIEW] |
| A07 技术数据入口 | 产生：执行者引用原入口。Config / Inventory / Manifest；媒体决定表在当前 Candidate 缺席 | 审查人；Core 读取原文件，不读取入口列表；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-A07] [SITE] |
| A08 内容/事实负责人 | 产生：项目指定；当前身份未提供。内容/事实责任范围记录 | 事实与内容审核人；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-A08] [METHOD] |
| A09 权利决定负责人 | 产生：项目授权者指定；当前身份未提供。权利责任记录；不等于 rightsRef 自动批准 | 媒体权利审核人；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-A09] [M-DECISION] |
| A10 视觉/内容独立审核人 | 产生：项目指定独立审核人；当前未提供。人工视觉/内容证据记录 | 独立审核人；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-A10] [CHECKLIST] |
| A11 技术核验/独立验收人 | 产生：项目指定；当前未提供。技术报告/独立验收责任记录 | 技术及独立验收人；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-A11] [REVIEW] |
| B01 概念/对象 | 产生：项目内容/事实负责人。原内容/事实对象；工作表只记录决定对象 | 内容/事实审核人；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-B01] [FACTS] |
| B02 项目确认的游戏术语与含义 | 产生：项目内容/事实负责人。content / facts / Config.brand 中已发表用词；工作表不是词典配置 | 人审；没有术语映射读取器；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-B02] [CONTENT] |
| B03 来源、版本/时间及确认依据 | 产生：来源核实者。原 source / patch / 时间记录及证据引用 | 事实审核人；Sources 读取原 sources；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-B03] [PROVENANCE] |
| B04 使用的 Page ID 引用 | 产生：项目选择者。Inventory 中的 Page ID | 人审；catalog 读取原 Inventory/config 的 IDs；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-B04] [I-SCHEMA] |
| B05 不确定处/决定负责人 | 产生：项目决定负责人。未决问题及责任记录；当前未填写 | 项目审核人；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-B05] [METHOD] |
| B06 审核记录引用 | 产生：实际审核者。原审核记录引用；当前未提供 | 独立审查人；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-B06] [CHECKLIST] |
| C01 Page ID 及 Inventory 记录引用 | 产生：项目页面选择者。Inventory Page ID；无 route/发布值副本 | 人审；既有页面解析读取原 Inventory；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-C01] [SITE] |
| C02 页面角色/入口问题 | 产生：项目编辑。入口问题/页面角色决定；不是 pageType 配置 | 内容审核人；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-C02] [METHOD] |
| C03 主要玩家任务 | 产生：项目编辑/事实负责人。玩家任务的项目决定记录 | 内容审核人；没有 playerTask 读取器；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-C03] [WORKSHEET] |
| C04 标题/页面承诺的答案 | 产生：项目编辑。原 Inventory.title 和实际内容的承诺；不是另一个 title 输入 | 内容审核人；标题 renderer 读取原 page.title；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-C04] [GUIDE] |
| C05 当前实际答案与证据引用 | 产生：项目编辑/事实负责人。实际 content / facts 及其证据引用 | 内容审核人；正文/FAQ 读取原内容，不读取此对照格；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-C05] [CONTENT] |
| C06 缺口及处理决定 | 产生：项目负责人/编辑。承诺落差的处理决定 | 内容/采用审核人；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-C06] [WORKSHEET] |
| C07 desiredPatternIntent/理由 | 产生：项目选择者。desiredPatternIntent 仅方法工作表文字 | 人审；无 Pattern intent 分派器；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-C07] [READY] |
| C08 下一有用 Page ID 或实际动作/理由 | 产生：项目编辑。Inventory.relatedPageIds 或原内容实际动作；附选择理由 | 人审；getRelatedPages 读取原关系值；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-C08] [RELATED] |
| C09 决定负责人及审核引用 | 产生：项目指定的决定者/审核者。责任和审核引用；未填写 | 项目/独立审核人；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-C09] [METHOD] |
| D01 适用 Page ID/整体范围 | 产生：项目视觉选择者。Inventory Page ID / 项目范围引用 | 视觉审核人；页面按原 pageId 解析；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-D01] [INVENTORY] |
| D02 视觉角色或选择问题 | 产生：项目视觉选择者。现有 visualRoles / theme.css / brand 选择问题 | 视觉审核人；Core 只消费既有配置和 CSS；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-D02] [ROLES] |
| D03 游戏证据引用及其原始状态 | 产生：项目证据整理者。原视觉来源及原始证据状态；未提供 | 视觉/权利审核人；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-D03] [EXAMPLES] |
| D04 拟选呈现与理由 | 产生：项目视觉选择者。呈现决定与理由；选定运行值仍在 Config/theme | 视觉审核人；无工作表呈现决策读取器；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-D04] [THEME] |
| D05 可用性检查/风险 | 产生：技术/视觉审核人。contrast/focus/motion/响应检查证据 | 独立审核人；不作为 CSS 或 renderer 输入；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-D05] [CHECKLIST] |
| D06 需要核实的接口依赖 | 产生：技术核对者。当前实际接口；旧依赖文档仍有旧 gate/source 描述（R2/R3） | 接口审查人；不控制 runtime feature；**NO CURRENT CONSUMER**（该记录） | NO | A, C, D | [W-D06] [DEPENDENCY] |
| D07 项目选择者/审核依据 | 产生：项目选择者/实际审核者。选择者与审核依据记录 | 视觉/独立审核人；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-D07] [METHOD] |
| E01 Page ID/任务关联 | 产生：项目内容/媒体负责人。Inventory 页及任务记录引用 | 媒体需求审核人；页面媒体查原 Manifest.pageId；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-E01] [M-CATALOG] |
| E02 四类 material value 与需求理由 | 产生：项目内容/媒体负责人。四类 material value 的人工需求理由 | 媒体/产品审核人；没有需求评分 runtime；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-E02] [WORKSHEET] |
| E03 现有媒体决定表的文件/行或唯一记录引用 | 产生：项目媒体决定负责人。唯一项目媒体决定表；当前 Candidate 两个合法位置均无文件 | 人工审核人；validate-site 有原表读取路径，当前没有表输入；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-E03] [M-DECISION] |
| E04 候选用途/类型及原 manifest 资产引用 | 产生：项目媒体负责人。原 Manifest 的资产 ID/type/placement 映射；候选理由不复制 src | 媒体审核人；renderer 读取原 Manifest；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-E04] [M-SCHEMA] |
| E05 权利/语义/人工决定证据引用 | 产生：权利/语义/人工审核者。原权利记录、人审证据与 Manifest.rightsRef 指针 | 权利/语义审核人；工作表不生成批准；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-E05] [M-SCHEMA] |
| E06 视频使用或排除理由/等价说明需求 | 产生：项目媒体/内容负责人。视频用/不用理由；等价文本/字幕真实值在 Manifest | 媒体/内容审核人；VideoEmbed 读取原 accessibleEquivalent；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-E06] [VIDEO] |
| E07 无媒体/缺失时的完整方案及边界 | 产生：项目内容/媒体负责人。无媒体/缺失时的完整答案与布局决定 | 内容/视觉审核人；不替代已有 renderer fallback；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-E07] [WORKSHEET] |
| E08 组合后果、依赖、负责人/审核依据 | 产生：项目选择者/实际审核者。组合后果、依赖、责任及证据记录 | 项目/独立审核人；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-E08] [METHOD] |
| F01 Page ID/整体范围 | 产生：项目选择者。Inventory Page ID / 项目范围引用 | 项目审核人；catalog 读取原记录；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-F01] [INVENTORY] |
| F02 搜索启用/关闭的玩家任务与 corpus 理由 | 产生：项目搜索选择者。启停理由；运行开关只在 Config.features.search | 人审；搜索路由/索引读取原配置；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-F02] [SEARCH] |
| F03 有效相关目标 Page ID、相关性/下一步理由 | 产生：项目编辑。原 Inventory.relatedPageIds 与任务相关性理由 | 内容审核人；RelatedPages 读取原关系；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-F03] [RELATED] |
| F04 日期/patch/验证语义与来源 | 产生：项目来源核实者/编辑。Inventory 日期 / sources.accessedAt / Fact-Tool.patch；旧绑定 liveStatus 已失效（R1） | 事实审核人；文章读取原日期/来源，未读取本格；**NO CURRENT CONSUMER**（该记录） | NO | A, C, D | [W-F04] [FRESHNESS] |
| F05 动态标签使用决定及其真实依据 | 产生：项目编辑/审核者。动态标签依据决定；旧 live 字段引用没有 Active 对应（R1） | 人工审核人；没有工作表动态标签读取器；**NO CURRENT CONSUMER**（该记录） | NO | C, D | [W-F05] [BASELINE] |
| F06 技术报告、事实/权利/视觉审核引用与构建 | 产生：执行者及实际审核者。原报告/构建及人审证据引用；当前采用未填写 | 独立审核人；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-F06] [REVIEW] |
| F07 evidenceStatus / verifiedOutcome 的规范记录引用 | 产生：规范审核记录的实际作者。唯一 Contract 所约束的原 evidenceStatus / verifiedOutcome 记录 | 独立验收人；不是另一个能力 outcome authority；**NO CURRENT CONSUMER**（该记录） | NO | A, C | [W-F07] [CONTRACT] |
| F08 未决事项、依赖、负责人/复查条件 | 产生：项目责任人/审核者。未决问题、依赖、责任和复查条件 | 项目/独立审核人；**NO CURRENT CONSUMER**（该记录） | NO | C | [W-F08] [METHOD] |

## 特别检查：技术语义是否已经被消费

- **terminology：** 无专门术语运行输入/词典 loader。已有 brand.name、fact.name/分类、content 用词被各自 renderer 使用；B 表术语/含义/依据不被读取。没有来源确认过的工作表实例。[CONFIG] [FACTS] [CONTENT]
- **player task / answer：** 无 playerTask 或 promised/supported-answer 运行模型；C 表是项目比较记录。FAQ.answer 是已有内容字段，并由 FAQ renderer 消费；实际 MDX 正文、事实和 title 分别来自原 authority，不能把“已有答案呈现”算作“任务工作表已接入”。[GUIDE] [FAQ] [CONTENT]
- **page IDs：** Inventory 是页面身份/route/发布真相；Config navigation/featured、content.pageId、Manifest.pageId、relatedPageIds 都引用它，catalog/路由等有真实消费者。工作表 Page ID 格目前只供人工关联，未被程序消费。[SITE] [I-SCHEMA] [M-SCHEMA]
- **pattern intent：** desiredPatternIntent 仅在方法/worksheet/binding 文档；未发现生产源码定义、import、loader 或 renderer 分派。NO CURRENT CONSUMER。[WORKSHEET] [READY]
- **visual evidence：** D 表的游戏证据与审核不被 runtime 读取。CSS tokens、brand 和有限 visualRoles 有既有消费者；当前 Config 省略 visualRoles，resolveVisualRoles 使用默认值。Config/主题值和证据不是同一输入。[ROLES] [LAYOUT] [THEME]
- **media/video needs：** E 表的四类价值、使用/排除理由与 no-media 完整方案没有 consumer。真实 asset/mapping、alt/caption/credit、poster/accessibility equivalent 经原 Manifest 和渲染链消费；当前 Manifest 空且项目决定表缺席。[M-SCHEMA] [M-PRESENT] [VIDEO] [M-DECISION]
- **search：** features.search 是既有唯一技术开关，当前 true；SearchIsland 使用 query/provider 状态和实际索引。没有 ENABLED/DISABLED 决定记录或 corpus 理由读取器、provider registry 配置。[CONFIG] [SEARCH] [SEARCH-STATE] [SEARCH-ADAPTER]
- **related content：** Inventory.relatedPageIds → getRelatedPages → WikiArticle/RelatedPages；C/F 的“为什么相关/下一步”不参与 resolver。[RELATED] [WIKI]
- **freshness：** Page Inventory schema 保留 publishedAt/updatedAt/sources，含 `updatedAt >= publishedAt` 验证；resolvePageFreshness(page) 返回 publication/update/max sources.accessedAt→sourceCheckedAt。EditorialArticle/WikiArticle 两个生产调用均只传 page。VersionContext.kind=patch/version 和 value 仍保留，但生产调用没有传入，当前显式使用在测试中，不能称已接入生产 versionContext。Fact/Tool.patch 与 updatedAt 的既有独立呈现存在。sourceCheckedAt 不冒充 verifiedAt；没有当前 liveStatus/observed-live/not-live 生产字段/消费者。[I-SCHEMA] [FRESHNESS] [EDITORIAL] [WIKI] [ENTITY] [TOOL-SHELL]
- **review responsibility：** A/D/E/F 责任、署名、范围、证据、复查触发供人工审核；模板未填，程序不读取它们。GameConfig.identity.author/publisher 是已有身份声明，媒体 rightsRef 是指针，都不能当成实际项目审核人或权利批准。[WORKSHEET] [CONFIG-SCHEMA] [M-SCHEMA]

## 专门 Game Adaptation runtime schema / type / config

**NONE。** 当前生产范围 `src/**`、`scripts/**`、根目录 `game.config.ts` 未发现 dedicated Game Adaptation schema/type/config，或读取 A–F 工作表、desiredPatternIntent、术语/玩家任务/视觉证据/审核责任记录的代码。检索名称 `adaptation / GAME_ADAPTATION / WS04A / desiredPatternIntent / playerTask / terminology` 无生产命中；文件名检索也无对应运行文件。

现有 `GameConfig`、`ResolvedVisualRoles`、`GuideRouteRecord`、`HomepageModelInput`、`MediaReadinessDecision`、`VersionContext` 等属于配置、呈现、路由、媒体验证和时间投影原有机制，不是专门 Game Adaptation 模型。Media Decision Table 的 parser 是原媒体 build-time 验证输入，不是 WS04A worksheet parser。生产引用不存在的结论限定于当前 Candidate 源码，不将历史/文档命中算成运行 consumer。

## D 类：已观察的权威/绑定不一致，3 个独立问题

| ID | 当前文件事实 | 影响的 binding | 已有重复 runtime authority？ |
| --- | --- | --- | --- |
| R1 退役 live 的旧入口 | [BASELINE] §03D-freshness 仍写 liveStatusSchema/observed-live/not-live；[DEPENDENCY] 时间/标签行和 [READY] F 时效行仍引用 Inventory.liveStatus。当前 schema/resolver/文章已无这些字段/分支，[REVIEW] post-repair 明确已移除 | F04/F05 与 A7/A9 的候选时效/动态标签引用没有对应 Active live authority；现存文档引用不等于 runtime 输入 | 未发现。是候选文档与 Active 源码不一致；不把它计作 Active 产品 residue |
| R2 旧 gate/状态描述 | [BASELINE]、[DEPENDENCY]、[READY] 仍有正式 WS03 未接受、完整06A阻塞04A等旧状态/顺序；当前 [STATE]/[LEDGER]/[AMENDMENT]/[REVIEW] 已有更新的 closure 与独立 gate 边界 | A9/D06 的接口条件引用；旧方法等待句也只能按其原时间读 | 未发现 runtime 状态 authority。是治理引用时间不一致，本轮不纠正或裁定 Gate |
| R3 旧来源指纹 | [BASELINE] 的 working-tree SHA 明确绑定 iteration33，引用原 triad-post-identity；[REVIEW] 的 post-repair 及已保存 removal patch 记录后续 13 文件变化；当前 HEAD 相同不能证明工作树仍等于 iteration33 | A04/A06 与 A0/A9 的来源/构建绑定需要区分历史与当前。本文没有把旧全树指纹认证为当前身份 | 未发现新的 source registry。是旧快照标签与当前工作树的引用差异；未跑全树 hashing |

**已实现的重复 runtime authority：未发现。** 现有 method/readiness 已明确工作表不另持 route/publication/indexability、font/density/shape/state、asset src/dimensions/lifecycle、ogImage/twitterImage、搜索 enable、日期/patch/outcome 真相；这些是文档中列出的重复风险边界，不是已经实现的第二份 authority。原 source/内容/媒体/主题值与工作表理由的差别见上述两张消费表。R1–R3 只记录现场，不提出修订/设计或实施动作。

## 只读检索与范围验证

实际使用读取型 `rg --files`、`rg -n`、`sed`/`cat`、`git branch --show-current`、`git rev-parse HEAD HEAD^{tree}`；核对 schema、source resolver、组件/路由消费者和当前治理文档。读取型检索没有匹配时的 rg exit 1 表示零命中，不表示为本轮新增了缺失工具。

未执行测试、npm run check、validate/build、browser/Safari、fresh47、6000+ protected-file hashing、capability reconciliation。没有运行历史工具或更改 iteration32/iteration33/archive。保存时仅比较本轮相关源/已有文档的限定字节快照与三 Candidate Git diff/status；不生成新的运行工具、schema、数据、依赖或兼容层。

最终计数：既有 authority 入口域 **9**；候选工作表记录 **49**；候选记录自身具有真实生产读取器 **0**；NO CURRENT CONSUMER **49**；独立 duplicate/unclear authority 问题 **3**。原值的真实消费者已单独列出，不与候选记录读取器混算。

PRODUCT CODE DELTA = 0。IMPLEMENTATION = NOT STARTED。本轮盘点结束，STOP。

## Evidence / File 索引

[METHOD]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_METHOD_V1.md:28>
[WORKSHEET]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:1>
[READY]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/WS04A_BINDING_READINESS_V1.md:13>
[BASELINE]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/WS03_CANDIDATE_INTERFACE_BINDING_BASELINE_V1.md:1>
[DEPENDENCY]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/WS03_INTERFACE_DEPENDENCY_LEDGER_V1.md:1>
[EXAMPLES]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/WOG_BOMBFARM_TRACEABILITY_EXAMPLES_V1.md:1>
[CHECKLIST]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/WS04A_DESIGN_REVIEW_CHECKLIST_V1.md:1>
[INPUTS]: </Users/randyz/work/coding/hot_words_web/template/roadmap/WS04A_GAME_ADAPTATION_DESIGN_INPUTS_V1.md:1>
[AMENDMENT]: </Users/randyz/work/coding/hot_words_web/template/architecture/V2.7_ARCHITECTURE_SIMPLIFICATION_AMENDMENT_V1.md:1>
[BLUEPRINT]: </Users/randyz/work/coding/hot_words_web/template/architecture/GAME_SITE_SYSTEM_V2.7_ARCHITECTURE_BLUEPRINT_V1.md:1>
[STATE]: </Users/randyz/work/coding/hot_words_web/template/PROJECT_STATE.md:1>
[LEDGER]: </Users/randyz/work/coding/hot_words_web/template/roadmap/V2.7_TASK_LEDGER.md:1>
[REVIEW]: </Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-ws03/CONSOLIDATED_WS03_TECH_REVIEW_V1.md:170>
[CONTRACT]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md:1>
[CONFIG]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/game.config.ts:1>
[CONFIG-SCHEMA]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/config/schema.ts:126>
[INVENTORY]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/page-inventory.json:1>
[I-SCHEMA]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/page-inventory.ts:55>
[SITE]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/site-data.ts:12>
[RELATED]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/site-data.ts:92>
[THEME]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/styles/theme.css:1>
[GLOBAL]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/styles/global.css:1>
[ROLES]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/theme-roles.ts:1>
[LAYOUT]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/layouts/BaseLayout.astro:6>
[CONTENT]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/content.config.ts:1>
[GUIDE]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/pages/guides/[...slug].astro:1>
[FAQ]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/FAQ.astro:1>
[FACTS]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/facts.ts:1>
[FACT-LOAD]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/fact-loader.ts:1>
[ENTITY]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/EntityDetail.astro:1>
[TOOLS]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/tools.ts:68>
[TOOL-LOAD]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/tool-loader.ts:1>
[TOOL-SHELL]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/ToolShell.astro:56>
[MEDIA]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/media/media.json:1>
[M-SCHEMA]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/media.ts:1>
[M-CATALOG]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/media/catalog.ts:1>
[VIDEO]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/media/VideoEmbed.astro:1>
[M-PRESENT]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/media-presentation.ts:1>
[M-DECISION]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/media-readiness.ts:203>
[VALIDATE]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/validate-site.ts:65>
[SEO]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/seo.ts:1>
[SEARCH]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/islands/SearchIsland.tsx:1>
[SEARCH-STATE]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/search-state.ts:1>
[SEARCH-ADAPTER]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/pagefind-search-adapter.ts:1>
[ROUTES]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/optional-routes.ts:1>
[PROVENANCE]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/provenance.ts:1>
[FRESHNESS]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/freshness.ts:1>
[EDITORIAL]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/EditorialArticle.astro:1>
[WIKI]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/WikiArticle.astro:1>
[SOURCES]: </Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/components/wiki/Sources.astro:1>
[W-A01]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:11>
[W-A02]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:12>
[W-A03]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:13>
[W-A04]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:14>
[W-A05]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:15>
[W-A06]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:16>
[W-A07]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:17>
[W-A08]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:18>
[W-A09]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:19>
[W-A10]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:20>
[W-A11]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:21>
[W-B01]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:25>
[W-B02]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:25>
[W-B03]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:25>
[W-B04]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:25>
[W-B05]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:25>
[W-B06]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:25>
[W-C01]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:33>
[W-C02]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:33>
[W-C03]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:33>
[W-C04]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:33>
[W-C05]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:33>
[W-C06]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:33>
[W-C07]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:33>
[W-C08]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:33>
[W-C09]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:33>
[W-D01]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:43>
[W-D02]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:43>
[W-D03]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:43>
[W-D04]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:43>
[W-D05]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:43>
[W-D06]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:43>
[W-D07]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:43>
[W-E01]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:51>
[W-E02]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:51>
[W-E03]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:51>
[W-E04]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:51>
[W-E05]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:51>
[W-E06]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:51>
[W-E07]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:51>
[W-E08]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:51>
[W-F01]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:65>
[W-F02]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:65>
[W-F03]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:65>
[W-F04]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:65>
[W-F05]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:65>
[W-F06]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:65>
[W-F07]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:65>
[W-F08]: </Users/randyz/work/coding/hot_words_web/template/design/ws04a/GAME_ADAPTATION_DECISION_WORKSHEET_V1.md:65>
