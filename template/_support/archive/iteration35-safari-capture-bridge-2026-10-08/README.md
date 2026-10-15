# iteration35 历史取证与失败现场（2026-10-08）

按用户正式批准归档 7 个原文件，原相对路径保存在 codex/ 子树；精确路径、字节 SHA256、大小、权限、原 mtime 见 [manifest.json](manifest.json)。原工具/计划已退出活跃实施路线，本目录不是可运行工具包，也不是当前下一步授权；移动后原相对依赖不应执行。

KEEP：[iteration34 实际独立审查](../../codex/executions/v2.7-ws04a/iteration34/chatgpt-independent-review.md)，原文件未改。

首次 self-test-red.log 为 0 PASS / 4 FAIL（工具尚未创建及依赖错误）；最新 self-test-green.log 实际为 3 PASS / 1 FAIL，文件名不代表成功。失败为 wrong raw binding: keyboard navigation setting missing。采集表与基准共享 binding 引用，测试修改表时也修改了基准；样例还缺 keyboardNavigationSetting。失败原文保留，未修复 bridge、未补跑测试、未形成完整采集会话或真实 Safari 证据，不作产品能力或验收 PASS。

最新权威：[Simplification Amendment](../../architecture/V2.7_ARCHITECTURE_SIMPLIFICATION_AMENDMENT_V1.md)及 [PROJECT_STATE](../../PROJECT_STATE.md)、[任务台账](../../roadmap/V2.7_TASK_LEDGER.md)、[路线新增 §7](../../roadmap/GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md#7-2026-10-08-simplification-amendment--current-interpretation)。治理整合只追加新解释，原历史正文保留。产品/三件套/冻结比较源与规范未改，PRODUCT CODE DELTA = 0；未执行测试、浏览器、push/tag/merge/release。Safari proof = 0，AX-01 / AX-03 未完全证明，PRODUCT / RELEASE 缺证限制保留。

唯一下一步：`consolidated WS03 TECH Review`。本轮已 STOP，等待独立 Review；不在本轮启动该审查、WS04A runtime schema 或 WS05 实现。验证结果见 manifest checks；用户采用治理修订不等于本轮独立 Review 或任何产品/发布 ACCEPT。
