# V2.7 三件套交付目录约定

日期：2026-10-01。状态：用户已确定目标版本 V2.7；最终产品尚未建立、验收或发布。

目标根目录：`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_SYSTEM_V2.7/`

```text
GAME_SITE_SYSTEM_V2.7/
├── GAME_SOP/                    # 生产方法、模板、验收要求、维护流程
├── GAME_SITE_STARTER/           # 可复用源码、配置范例、测试、开发文档
├── GAME_CODEX_MASTER_PROMPT/    # 执行阶段、证据要求、Gate 与停止条件
├── COMPATIBILITY_MANIFEST.json # 三件套的准确来源与兼容组合
└── README.md                   # 用法、入口、版本及适用范围
```

原工作标识 `VNEXT` 已由用户确定的目标版本 `V2.7` 取代，见 [版本决定](governance/V2.7_VERSION_DECISION.md)。此树是交付位置约定，不是技术架构蓝图；本次仅更新约定，不创建或迁移产品目录。

- 冻结的三个 V2.6.5 目录保持原位置和内容，用作比较基线。
- 现有 Starter Candidate 保留 Git 历史和已接受的 S1/A1/A2/A3 改动；本轮不移动、复制或重建候选仓库。
- SOP / Master Prompt 的 V2.7 修改在各自候选中进行，不原地覆盖 V2.6.5。候选具体位置在重新建立路线时确定。
- `template/` 管理研究输入、任务记录、审查、清理和迁移证据，不进入产品包。
- 最终只从已验证的准确版本导出三件套，不让开发副本与交付副本同时充当源码权威。
- 交付包不带依赖安装目录、构建输出、缓存、环境值、临时日志或任务半成品。

兼容性清单记录各自版本、来源仓库、准确 commit/tree 或文件哈希、适用组合、冻结基线和独立验收记录。不得用“最新版本”或目录名代替版本证明。

三件套需要协同演进；单个技术修复不必机械修改全部文件。新能力先确定责任，再同步到拥有相关流程、执行要求或技术实现的那一层。


## 当前三件套命名 — 沿用 V2.6.5 规则（2026-10-09）

用户明确要求按原版本规则重命名，方便后续引用和管理。以下是当前三个唯一源码目录；本节只更新命名/路径解释，不改变 Candidate、技术接受或产品/发布状态。旧开发位置及此前交付根目录约定保留为历史，当前使用入口以本表为准。

| 原开发目录名（历史） | 当前源码目录名 |
| --- | --- |
| `GAME_SOP_V2.7_CANDIDATE` | [`GAME_SOP_V2.7`](../Repo_hotgameweb/GAME_SOP_V2.7/) |
| `GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE` | [`GAME_CODEX_MASTER_PROMPT_V2.7`](../Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.7/) |
| `GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE` | [`GAME_SITE_STARTER_BASED_gamesop2.7`](../Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.7/) |

- 原仓库整体移动，Git 历史、branch、HEAD、已有未提交修改保留；没有复制仓库、旧路径别名或新增源码权威。冻结 V2.6.5 目录不变。
- 当前跨目录链接、SOP Package Manifest、Prompt Contract Reference，以及浏览器验证脚本默认 SOP 路径同步；SOP-owned Contract 字节/哈希及41项语义不变。历史 Starter Phase A 输入名称保留。
- 历史 iteration、archive、review、三件套技术归档和原兼容清单不改写；其旧路径/哈希描述当时快照，不自动标识移动后且文档/路径引用已更新的当前工作树。没有重新打包，也没有新的独立技术接受声明。
- REVIEW100 已接受的技术收敛范围保持；本次命名不关闭 WS06、WS07 FINAL、完整 WS08、Human、Safari/AX、PRODUCT 或 RELEASE。没有 commit/push/tag/merge/deploy/release。
