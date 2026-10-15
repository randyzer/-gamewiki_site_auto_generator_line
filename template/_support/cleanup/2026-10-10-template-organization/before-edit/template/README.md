# V2.7 商业游戏站生产体系工作区

目标：以 V2.6.5 三件套为基础，修复真实项目暴露的问题，吸收五个参考案例的优秀能力，产出协同工作的 V2.7 SOP、Starter 和 Master Prompt。目标版本由用户确定，见 [版本决定](governance/V2.7_VERSION_DECISION.md)；尚未完成产品验收或发布。

2026-10-07最新：第20轮有限开发准入治理修订已[独立接受](codex/executions/v2.7-ws06a/iteration20/chatgpt-independent-review.md)，[现行路线§3.1](roadmap/GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md)的流程生效；[五文件修订及检查](codex/executions/v2.7-ws06a/iteration20/result.md)仅治理增量、产品增量0。当前源码准入NOT_EVALUATED，WS06A BLOCKED、Safari proof0、WS03未开始、主任务仍2/8关闭。下一有限步骤为当前源码Development Readiness审计/独立裁定，产品测试/构建/浏览器矩阵本轮NOT_RUN。

截至2026-10-06的历史状态：正式路线共8个主任务，WS-01/02已独立ACCEPT关闭；WS-06部分实施且受阻，Core浏览器新源资格37 PASS / 10 FAIL（历史36/11保留）；其余5个尚未开始产品实施，WS-04A第18轮[方法设计已独立ACCEPT](codex/executions/v2.7-ws04a/iteration18/chatgpt-independent-review.md)，契约Gate仍OPEN，等待WS03接受后的绑定核实。Browser已从官方本地来源恢复；第16轮两文件修复及RED/GREEN、真实15病例、711测试回归已完成，原ChatGPT已独立ACCEPT关闭有限修复；第17轮策略实现10文件及757测试已获[实际独立ACCEPT](codex/executions/v2.7-ws06a/iteration17/chatgpt-independent-review.md)，仅接受实现机制；10项WebKit/40断言仍需真实Safari补证，[固定样本/清单](codex/executions/v2.7-ws06a/iteration17/REAL_SAFARI_KEYBOARD_CHECKLIST.md)已准备，Safari原生GUI已授权但工具拒绝，Chrome有限补充检查已完成。旧A4保持暂停，最终V2.7交付包未建立。进度入口为[统一任务台账](roadmap/V2.7_TASK_LEDGER.md)，工程上下文见[PROJECT_STATE.md](PROJECT_STATE.md)。三件套关系、目录盘点与有限清理已获[独立ACCEPT](codex/verifications/goal-reset-2026-10-01/verification.md)；本次入口整理不是新的独立验收。

| 资产 | 用途与有效性 |
| --- | --- |
| [统一任务台账](roadmap/V2.7_TASK_LEDGER.md) | 主任务、子阶段、轮次、阻塞与交付里程碑；进度总入口 |
| [WS-04A方法设计](design/ws04a/GAME_ADAPTATION_METHOD_V1.md) | 第18轮独立ACCEPT仅方法设计；五份文档及检查见[结果](codex/executions/v2.7-ws04a/iteration18/result.md)，等待WS03接口接受后的绑定核实 |
| [WS-04A设计输入](roadmap/WS04A_GAME_ADAPTATION_DESIGN_INPUTS_V1.md) | 已有项目/案例依据、现有接口与后续设计边界；本地准备，未独立接受 |
| [三件套关系](architecture/GAME_SITE_SYSTEM_EVOLUTION_MODEL.md) | 本次关系核对；各自权威与同步边界 |
| [V2.7 架构蓝图](architecture/GAME_SITE_SYSTEM_V2.7_ARCHITECTURE_BLUEPRINT_V1.md) | 修订后独立 ACCEPT；不授权功能实现 |
| [V2.7 演进路线](roadmap/GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md) | 八个 workstream 与阶段 Gate；独立 ACCEPT |
| [交付目录约定](DELIVERY_LAYOUT.md) | V2.7 三件套的目标位置；尚未创建最终产品 |
| [当前目录盘点](inventory/WORKSPACE_INVENTORY_2026-10-01.md) | 当前有效文件、历史资料和清理结果 |
| [清理前快照](inventory/WORKSPACE_INVENTORY_BEFORE_2026-10-01.json) | 468 个非生成文件的路径、大小和哈希；不是当前文件清单 |
| [五站本地能力审计](5_SITE_PATTERN_CAPABILITY_AUDIT.md) | 五份本地提炼实现的代码分析；不是原站实测或商业成功证明 |
| [原站观察](LIVE_SITE_VALIDATION_2026-10-01.md)、`case-evidence/` | 4 个原站的观察记录；Farever 原站数据未取得 |
| `temp1_based_*` 至 `temp5_based_*` | 五份参考源码；不直接合并为 Starter；合成插画和本地截图不作为真实游戏媒体证据 |
| Product Contract、Capability Gap Audit、Core Safety Design | 既有设计和缺口输入；须按重新确认的目标检查，不能自行触发实现 |
| `codex/executions/`、`codex/verifications/` | 历次实现和独立审查证据；保留，不能以历史通过替代 V2.7 验收 |
| `codex/prompts/` | 已执行或暂停的历史任务边界；恢复时以当前用户要求和状态为准 |
| 旧 V1 蓝图、路线图、Phase A 计划 | 重规划前的历史提案，已标记暂停；不作为当前路线 |
| `PHASE1_*` | S1/A1 相关历史设计与证据，保留追溯 |
| `archive/` | 备份、暂停半成品及历史快照；不作为有效产品源码 |

真实项目验证输入在 `gameweb/game_bombfarm_v2/docs/` 与 `gameweb/game_warofgenesis/docs/`，不复制进参考案例目录，也不修改原项目。

`template/` 是演进过程与证据工作区，不是最终三件套交付包。
