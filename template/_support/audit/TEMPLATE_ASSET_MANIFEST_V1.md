# template 全资产有效性清单

日期：2026-10-01。范围为当前文件及逻辑资产组；逐文件路径、大小、SHA-256、用途、来源、引用、保留理由与删除风险见 [ASSET_MANIFEST_V1.json](ASSET_MANIFEST_V1.json) 的 `template` scope。清理前快照含 279 个 template 非生成文件，另有 Candidate 189 个；后者包含当时未完成 A4 测试。

引用字段是本地明确路径/Markdown 链接/相对导入的静态关联，不声称是完整动态依赖图。不能仅因 `referenced_by` 为空删除资产。

| 路径/逻辑组 | 分类 | 用途与来源 | 当前/替代关系与引用入口 | 动作与删除风险 |
| --- | --- | --- | --- | --- |
| PROJECT_STATE.md、README.md | ACTIVE_AUTHORITY，仅限工作状态/入口 | 最新用户目标、实际 Git、证据盘点 | 当前；旧状态存 before-goal-reset；会话与 README 引用 | KEEP；删会失去当前暂停点 |
| audit/、governance/、inventory/ 当前清单、DELIVERY_LAYOUT.md | DRAFT_TO_REVIEW | 本次直接盘点及审查计划 | 当前审查材料；入口 README/PROJECT_STATE | KEEP；不是 Next 功能实现或发布声明 |
| architecture/GAME_SITE_SYSTEM_EVOLUTION_MODEL.md | DRAFT_TO_REVIEW | 三件套原始责任与本次关系核对 | 已更新；旧文原样存档；权威盘点/README 引用 | KEEP；不能代替后续蓝图 |
| 五站能力审计、Gap Audit | PRIMARY_EVIDENCE，限本地代码分析 | 五份本地提炼实现与冻结 Starter 分析 | 需求输入；Product Contract/旧提案及 audit 引用 | KEEP；不能误标原站实测 |
| Product Contract、Core Safety Design | DRAFT_TO_REVIEW/历史设计输入 | 既有能力 IDs、设计及保护边界 | 保留 IDs/有效约束；新路线需重新核对 | KEEP；不能由文中 approved 自动恢复实现 |
| LIVE_SITE_VALIDATION、case-evidence/ | PRIMARY_EVIDENCE，限观察范围 | 4 个原站 × 3 页，结构化记录及截图 | crosswalk/README 引用；Farever 原站未取得 | KEEP；不证明收入、全部浏览器或游戏事实 |
| temp1–temp5 源码 | REFERENCE_IMPLEMENTATION | 五份提炼源码、配置、测试和本地媒体 | 五站本地审计引用，路径保持；不合并成五份 Starter | KEEP；删会失去模式依据 |
| temp3/artifacts/screenshots/ | HISTORICAL_PROVENANCE | 本地重建版视觉输出 | 不作原站图像或真实媒体证据 | KEEP；实际重建审查有历史价值，交付排除 |
| temp4/.git/ | HISTORICAL_PROVENANCE / repository metadata | 一个独立参考仓库的 Git 历史 | 不纳入逐文件源码清单，不删仓库历史 | KEEP；不得当缓存清除 |
| PHASE1_* | HISTORICAL_PROVENANCE | S1 修复/创建/提交/审查与 A1 旧计划 | 当前状态已被 A1/A2/A3 超越；多篇历史提案引用 | KEEP；不当执行指令 |
| codex/executions/、verifications/ | EXECUTION_EVIDENCE | S1/A1/A2/A3 等独立记录与 diff/hash | 原文保留；当前审查核对已接受链 | KEEP；删除会破坏 provenance |
| codex/prompts/phase-a/ | HISTORICAL_PROVENANCE / paused plans | A1–3 已执行，A4 暂停，A5 未启动 | 已加当前状态横幅；原文备份；当前状态优先 | KEEP；不能自动执行 A4/A5 |
| 旧 Blueprint V1、Roadmap V1、Phase A Plan | DRAFT_TO_REVIEW，pre-audit | 曾提前建立的提案 | 已标暂停，非当前实施权威；有相互引用 | KEEP；后续逐项 KEEP/REVISE/SUPERSEDE，不盲删 |
| inventory/GAME_SITE_SYSTEM_V2.6.5_INVENTORY.md | HISTORICAL_PROVENANCE | 当时 S1-only 快照 | 已明确标历史，当前清单替代 | KEEP；原快照有价值，不能误用其旧 HEAD |
| cleanup/CLEANUP_PLAN_V0.1.md | HISTORICAL_PROVENANCE | 当时五份参考目录生成物清理 | 当前 CLEANUP_MANIFEST_V1 替代当前动作入口 | KEEP；不是未来任意删文件授权 |
| cleanup/proposed-starter-docs-2026-10-01/ | DRAFT_TO_REVIEW / duplicate snapshots | 18 份 Candidate 历史文档迁移提案 | 未实施；RELOCATION_MANIFEST 保存原/拟位置及哈希 | KEEP 供审查；副本可在核验后清除，原文不删 |
| archive/pre-sync/ | HISTORICAL_PROVENANCE | 2 个不同的旧 package/lock | 与当前 Mini Wars 配置不同，非同内容重复 | KEEP；删除会失去差异来源 |
| archive/before-goal-reset*/ | HISTORICAL_PROVENANCE | 15 份旧状态/规划原文 | 当前横幅或新状态的可恢复来源 | KEEP；不作为当前指令 |
| archive/paused-a4/ | HISTORICAL_PROVENANCE，unfinished | A4 依赖补丁、未完成测试、失败日志 | 原候选已恢复；manifest/README 引用 | KEEP；测试不能跑入有效套件 |

## 实际删除与未知项

template 中没有新发现需要清除的 node_modules/.next/test-results/tsbuildinfo 或 .DS_Store。此前清除记录保留；本轮没有按 `temp` 名字删任何源码。

任何未来发现的未分类文件应为 UNKNOWN，先核对用途和引用。当前逐文件清单没有将 UNKNOWN 静默当垃圾，也没有用历史截图代替当前验收。
