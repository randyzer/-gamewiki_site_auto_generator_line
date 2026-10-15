# WS-03 接口依赖台账 V1

日期：2026-10-06。状态：DESIGN_DEPENDENCIES_ONLY / NON-NORMATIVE / NOT SCHEMA。这里只记录现存接口和待接受依赖，不声明适配契约冻结，也不创建生产 enum。路线前置见[已接受 DAG](../../roadmap/GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md)。

下表 Concern 是本文件定位标签，不是 capability ID。Current state 仅为设计依赖标记：AVAILABLE_NOW、PARTIAL_EXISTING_INTERFACE、WAITING_WS03A/B/C/D；不得填 Contract 的 PASS/FAIL/NOT_APPLICABLE。目前没有任何 WS-03 切片 ACCEPT。

## 当前依据

- [gameConfigSchema](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/config/schema.ts)：strict brand、feature flags、导航 Page ID groups、featuredPageIds；没有本设计可直接绑定的完整语义字体/形状/密度角色接口。
- [pageInventoryEntrySchema](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/page-inventory.ts)：Page ID、route、状态、来源/日期和 relatedPageIds。实际可用性还依赖 config 和原 Core 解析；schema 不独自批准发布。
- [mediaManifestSchema](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/data/schemas/media.ts)：image/video、src、alt、caption、sourceUrl 和 pageId→hero/gallery/trailer；本地 MP4/WebM、YouTube ID 和本地视频 poster 已存在。没有结构化尺寸、rights/credit 或完整 accessible equivalent 字段；来源不等于批准。
- [media-readiness](../../../Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/src/core/media-readiness.ts)：项目唯一 Markdown 决定表、既有状态组合和 final/evidence 投影已存在；表缺席时不产生此模块错误，不能据此声称每页 MC-04 已落实。

## 依赖与核实动作

| Concern | 适配问题/能力引用 | 目前实际入口 | WS-03 依赖 | Current state | 现在可设计的内容 | 04A Gate 前必须等待什么 | 接受后核实动作 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 页面引用 | IA-01、ID-01 | Inventory Page ID、config 导航/功能 | 无新 ID authority 需求 | AVAILABLE_NOW | 为什么选该页、相关性/任务理由；只引用原记录 | 整体 04A 契约和对应组合依赖仍待接受 | 用实际项目资格检查 unknown/disabled/draft 等上下文；不复制 route/发布值 |
| 主题语义 | VF-01、VF-02、GI-02 | brand 与现有样式；严格配置 | WS-03A | WAITING_WS03A | 游戏证据→字体/形状/密度/状态角色的需求 | 03A 实际语义角色/约束/兼容与浏览器证据 ACCEPT | 引用接受后的实际字段/API；删除猜测，不强制 Core 采用本设计的命名 |
| 媒体尺寸/权利引用 | MC-02、MC-03、MC-04 | media assets/pages；现有媒体决定表 | WS-03B | WAITING_WS03B | 每页需求和来源/权利/语义责任 | 尺寸/比例、credit/rights 引用及 adapter/fallback 实现 ACCEPT | 确认资产和决定记录唯一权威、旧数据迁移不自动批准 |
| 视频等价与失败状态 | MC-05、MC-03 | local MP4/WebM、YouTube、poster 与现有渲染 | WS-03B | WAITING_WS03B | 视频使用/排除理由、等价说明需求与不播放答案 | 接受的 accessible equivalent/统一 fallback 及约束 | 核实真实播放、无媒体、缺失/失败、等价与 legacy 边界；不新增 provider |
| 分享图 | SEO-02、MC-02、MC-03 | 现有 SEO/媒体权威；WoG 历史缺 og:image | WS-03C（依赖 03B） | WAITING_WS03C | 每个 indexable 页的分享媒体需求/缺口 | 同一 media authority 的解析和生成产物审计 ACCEPT | 从实际 accepted resolver 绑定；不另造 ogImage authority |
| 搜索选择/状态 | IA-03 | features.search、Pagefind 和现有搜索 | WS-03D 搜索切片 | WAITING_WS03D | corpus/玩家查询理由，空/错误/关闭需求 | query/result 边界、安全/预算和开关输出 ACCEPT | 使用真实接口、路由和索引范围；不将字段存在当启用依据 |
| 时间/标签 | FR-01、FR-02 | publishedAt、updatedAt、来源/验证日期 | WS-03D 日期切片 | WAITING_WS03D | published/updated/verified、patch/标签证据区别 | 日期与 patch/验证语义 ACCEPT | 确认渲染的具体语义与证据；搜索接受不等于日期切片接受 |
| 媒体生命周期引用 | MC-04、PA-01 | 唯一媒体决定表和 final/evidence 投影 | 03B 后核实引用关系 | PARTIAL_EXISTING_INTERFACE | 保存现有 literal 和审核责任，不复制状态表 | 补齐采用覆盖及新接口绑定的正负证据 | 对照现存行为；方法更完整不能宣称旧 validator 已强制全覆盖 |
| 组合意图 | CU-01、CU-02、ID-01 | 方法只说明任务与组合意图 | 所需 03 接口；其后 WS-05 | PARTIAL_EXISTING_INTERFACE | 不含技术 Pattern ID 的组合选择理由 | 03 输入及 04A 契约先接受；04B 等待 05 实例 | 04A 不以尚未实现的 Pattern 页面作为退出条件，避免与 05 循环依赖 |

## 接口接受后的核实顺序

1. 取得该 WS-03 切片的实际独立 ACCEPT、源/构建及接口证据，确认切片范围；只接受计划或同阶段其他切片不算接受本接口。
2. 读取实际 schema、adapter/render 入口、默认值、迁移/兼容及正负证据；记录准确来源身份。
3. 比较本台账的需求与实际能力，删除不存在的假设；若需求尚不满足，进入对应有限修订，不能私加配置字段或改变规范。
4. 修订工作表的引用/绑定规则；每个概念记录将来映射到实际哪一个 authority，保留决定理由，不迁出 Inventory/manifest 真相。
5. 制定 04A 的有限适配 schema/引用实施计划：未知/disabled Page ID、模式/媒体不匹配、未决权利、完整 no-media、旧人审与新构建分离等正负证据，三件套同期同步并独立审查。

方向始终是“已接受 WS-03 接口→04A 绑定”，不能为满足早期方法表而迫使 WS-03 实现假接口。WS-06A 尚未关闭，阻止 WS-03 产品实施；本台账设计并不解除该前置。

## 与后续组合/采用的交接

04A 接受契约后才能供 WS-05 使用；WS-05 输出供 04B 实例核验，不能反过来要求 04A 先完成 05 实例。确定性 REF-A/B/C、三个 PROJECT-* 采用和三件套 release 保持不同证据义务。本文件中的 AVAILABLE_NOW 仅指现存引用入口，不代表任何 workstream、能力或 release PASS。
