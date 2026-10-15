# template 目录用途与整理记录

日期：2026-10-10（Asia/Taipei）。本次按用户要求，将非游戏模板资料集中放入 `template/_support/`。未删除文件，未修改六个模板源码，未重新构建、发布或改变项目验收状态。

## 整理结果

根目录现在包含六个 `temp*_based_*` 模板、一个 `_support/` 资料目录，以及新的 [README](../README.md)。迁移的 26 个顶层条目包含 15 份文档、11 个资料目录，共 **1,596 个文件**。完整清单含原路径、新路径、大小和迁移前/后 SHA-256，见 [RELOCATION_MANIFEST.json](cleanup/2026-10-10-template-organization/RELOCATION_MANIFEST.json)。

原 README 将 `template/` 定义为 V2.7 商业游戏站生产体系的开发工作区，是资料混入模板根目录的直接原因。现已将该工作区迁入 `_support/`。带日期的旧进度说明不作为新状态判断。

## 15 份根目录文档的作用

以下文件现在均位于本目录。

| 文件 | 用途 | 保留理由 |
| --- | --- | --- |
| [5_SITE_PATTERN_CAPABILITY_AUDIT.md](5_SITE_PATTERN_CAPABILITY_AUDIT.md) | 对最初五个本地模板的能力分析 | 案例/能力设计输入；不是原站当前表现证明 |
| [COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md](COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md) | 早期商业游戏站产品要求 | 旧版契约来源；现行 V2.7 契约在 SOP 项目中 |
| [CORE_SAFETY_CONTRACT_DESIGN_V0.1.md](CORE_SAFETY_CONTRACT_DESIGN_V0.1.md) | Core 安全契约设计 | 解释后续实现与安全边界的来源 |
| [GAME_SITE_STARTER_V2.6.5_CAPABILITY_GAP_AUDIT_V0.2.md](GAME_SITE_STARTER_V2.6.5_CAPABILITY_GAP_AUDIT_V0.2.md) | V2.6.5 Starter 与产品要求之间的缺口分析 | V2.7 演进依据 |
| [DELIVERY_LAYOUT.md](DELIVERY_LAYOUT.md) | 三件套交付布局和现行源码目录命名说明 | 仍用于定位 SOP、Starter 和 Master Prompt |
| [PROJECT_STATE.md](PROJECT_STATE.md) | 项目当前状态、接受范围与未完成事项 | 当前工作入口 |
| [README.md](README.md) | 原开发工作区入口和资料索引 | 增加迁移说明；原件另存于修改前备份 |
| [LIVE_SITE_VALIDATION_2026-10-01.md](LIVE_SITE_VALIDATION_2026-10-01.md) | 2026-10-01 原站观察结果与获取限制 | 历史案例证据；不能代表当前市场情况 |
| [PHASE1_CORE_SAFETY_IMPLEMENTATION_CANDIDATE_PLAN_V0.1.md](PHASE1_CORE_SAFETY_IMPLEMENTATION_CANDIDATE_PLAN_V0.1.md) | 第一阶段 Core Safety 候选实施计划 | 历史实施边界与追溯 |
| [PHASE1_CORE_SAFETY_CANDIDATE_CREATION_VERIFICATION.md](PHASE1_CORE_SAFETY_CANDIDATE_CREATION_VERIFICATION.md) | 候选创建过程和来源验证 | 历史来源证据 |
| [PHASE1_S1_TL01_IMPLEMENTATION_EVIDENCE.md](PHASE1_S1_TL01_IMPLEMENTATION_EVIDENCE.md) | S1/TL-01 实现与测试证据 | 历史变更证据 |
| [PHASE1_S1_TL01_MICROFIX_EVIDENCE.md](PHASE1_S1_TL01_MICROFIX_EVIDENCE.md) | S1/TL-01 小修复证据 | 保留修复前后脉络 |
| [PHASE1_S1_TL01_COMMIT_VERIFICATION.md](PHASE1_S1_TL01_COMMIT_VERIFICATION.md) | S1/TL-01 提交核验 | 历史提交与审查依据 |
| [PHASE1_S1_TL01_FINAL_PROVENANCE_VERIFICATION.md](PHASE1_S1_TL01_FINAL_PROVENANCE_VERIFICATION.md) | S1/TL-01 最终来源核验 | 历史完整性依据 |
| [PHASE1_S2_TL02_IMPLEMENTATION_PLAN_V0.1.md](PHASE1_S2_TL02_IMPLEMENTATION_PLAN_V0.1.md) | S2/TL-02 结构化身份安全计划 | 历史设计输入 |

## 11 个资料目录的作用

| 目录 | 作用 | 整理前文件数 |
| --- | --- | ---: |
| [architecture/](architecture/) | 架构蓝图、三件套关系、影响矩阵、简化修订 | 5 |
| [archive/](archive/) | 目标重设前快照、旧模板备份、暂停方案和 Safari bridge 归档 | 31 |
| [audit/](audit/) | 资产清单、权威来源和真实项目/参考案例对照 | 5 |
| [case-evidence/](case-evidence/) | 站点观察数据、截图及截图登记表 | 12 |
| [cleanup/](cleanup/) | 以前的清理方案、迁移清单和待处理文档副本 | 22 |
| [codex/](codex/) | 执行提示词、实现结果、审查、测试日志、截图、补丁、源代码快照和证明用构建输出 | 1,483 |
| [design/](design/) | 游戏适配方法与接口依据、开发准入、Safari 验收治理 | 12 |
| [governance/](governance/) | 三件套同步演进和 V2.7 版本决定 | 2 |
| [inventory/](inventory/) | 历史盘点报告与清理前路径/哈希快照 | 3 |
| [roadmap/](roadmap/) | 演进路线、统一任务台账、阶段计划和设计输入 | 6 |

## 为什么本次保留，而不是删除

1. 这些文件不属于游戏模板运行代码，但包含仍在使用的入口、设计依据与独立审查记录。已找到 SOP V2.7、Master Prompt V2.7 和三个验证项目对它们的直接引用。
2. 87 组字节相同的文件涉及 210 个重复出现，但重复项常是不同轮次的日志、截图、提示词或审核附件；路径本身承载证据含义。完整重复组已记录在迁移清单，不做自动去重。
3. `codex/` 中的构建输出、测试产物和源码副本属于留存证据；即使可重建，也不能重现当时的时间、环境和来源身份。它们不应当作当前产品源码。
4. 六个模板各自的 `docs/`、测试、资源、配置和依赖锁文件属于模板内部内容，保留原位。temp6 中的 `node_modules/`、`.next/`、`tsconfig.tsbuildinfo` 是依赖/缓存或可再生成产物；本次未动这些模板内部产物。

后续若要减少磁盘空间，可单独评估 temp6 的依赖/构建缓存；清除后需要重新安装依赖或构建。历史证据的删除应先确认相关任务已结束、没有保留义务且引用已处理，再按明确清单操作。

## 路径与证据兼容说明

- 六个模板路径不变。其他原 `template/<名称>` 均改为 `template/_support/<名称>`。原根 README 迁入 `_support/README.md`，根目录新增模板索引。
- 当前工作入口中受影响的 Markdown 链接已修正；三件套和验证项目中八份文档的资料路径已同步。修改前原件保存在 [before-edit/](cleanup/2026-10-10-template-organization/before-edit/)，清单记录每份文件前后哈希。
- 历史 `codex/prompts/`、`codex/executions/`、`codex/verifications/`、`archive/` 和旧资产/哈希记录保留原字节。内部相对链接随目录整体移动仍可用；其中旧绝对路径、指向工作区外部的旧相对路径和脚本硬编码路径仍描述当时位置，应按上述映射解析。
- **历史一次性脚本不能直接按原命令重跑。** 本次没有改写或重新执行它们；它们还可能指向以前的候选仓库名或临时目录。若需要重放，应先为新执行准备独立副本，修正路径与运行前提，再重新验证，不能覆盖原证据。
- 已有接受记录和交付快照的哈希描述当时版本；当前文档路径修订不是新的独立验收。SOP-owned V2.7 产品契约保持原字节。

## 校验范围

核对全部迁移文件的数量、存在性与 SHA-256；有修改的文档核对其原件备份。核对六个模板的非生成文件集合/哈希，排除 `.git/`、`node_modules/`、`.next/`、`dist/`、`out/`、coverage 等目录；本次没有写入模板内部目录。核对已编辑当前文档中原本有效的本地链接在新位置仍有效，新增两份入口/本报告的本地链接也有效。已有断链与历史保留路径不冒充本次修复。

结果见 [VERIFICATION.json](cleanup/2026-10-10-template-organization/VERIFICATION.json)。这是文件组织与路径校验，没有运行产品测试或构建。
