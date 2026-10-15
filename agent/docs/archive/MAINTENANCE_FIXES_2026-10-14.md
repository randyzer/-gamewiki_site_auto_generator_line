# Agent 维护性修复验收

日期：2026-10-14。范围：阶段名称识别、失败原因诊断、通用游戏身份。

## 修改结果

- 阶段名称、中文显示名、产物和输入统一定义于 stages.mjs。编排、权限、验收、研究交接、飞书审批和离线验证使用名称。旧编号审批在兼容入口转换；旧 manifest 和数字产物目录不迁移。
- FAILED/BLOCKED 保留具体阶段、执行次数、失败环节、错误码、脱敏原因和诊断文件路径。重试保留历史。CLI 和飞书状态回复包含原因；初始化 JSON 错误不再保存解析原文。
- 通用浏览器代码和策略不再包含固定游戏名、Steam ID 或游戏专用网页范围。Steam 内容由任务 gameIdentity、gameMetadata.steamAppId、gameMetadata.steam 绑定，名称和 URL 不匹配时拒绝，元数据不能覆盖游戏身份。
- 普通新站飞书输入支持 gameMetadata，继续拒绝凭据字段。Bodycam 专用任务卡和测试样本保留。

## 验证

- `npm test --prefix agent`：172 项通过，0 失败，0 跳过，退出码 0。
- 新回归先观察失败再修复，包括名称阶段审批、其他游戏识别、诊断持久化与重试、worker 解析与验收环节、飞书 metadata 输入、凭据命令行参数脱敏、阻塞 stdin 超时和初始化解析异常。
- `node agent/scripts/offline-validation.mjs`：退出码 0；七阶段合成流程停在 game-site-deploy-and-measurement / WAITING_FOR_USER。证据见 [OFFLINE_VALIDATION.json](../../runs/offline-7ef09975-fc6b-4f3a-ba4b-6560b82b6561/OFFLINE_VALIDATION.json)。
- 用修改前的 pipeline.mjs 和临时离线数据生成旧 manifest、产物目录及部署计划；新版恢复后确认相同计划成功，deploymentExecuted=false，临时验证目录已清理。
- 独立只读复核发现的 metadata 接入、名称覆盖、凭据参数漏过滤、超时误报和初始化解析原文泄露均已修复并复核。

## 实际能力边界

本轮只验证代码、离线契约和恢复兼容性。浏览器审批能力缺失时仍阻断真实 worker；未执行真实游戏调研、真实飞书投递、发布或服务重启。现有任务、源站和模板不在本次修改范围内。

## 修改文件

- [README.md](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/README.md)
- [config/bsk-command-policy.json](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/config/bsk-command-policy.json)
- [feishu-ai-employee/src/core.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/feishu-ai-employee/src/core.mjs)
- [feishu-ai-employee/src/workflow.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/feishu-ai-employee/src/workflow.mjs)
- [scripts/offline-validation.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/scripts/offline-validation.mjs)
- [src/artifact-validator.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/src/artifact-validator.mjs)
- [src/bsk-command-gate.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/src/bsk-command-gate.mjs)
- [src/bsk-policy.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/src/bsk-policy.mjs)
- [src/bsk-tool-server.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/src/bsk-tool-server.mjs)
- [src/diagnostics.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/src/diagnostics.mjs)
- [src/existing-content-preflight.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/src/existing-content-preflight.mjs)
- [src/files.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/src/files.mjs)
- [src/handoff.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/src/handoff.mjs)
- [src/orchestrator.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/src/orchestrator.mjs)
- [src/pipeline.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/src/pipeline.mjs)
- [src/process.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/src/process.mjs)
- [src/skill-executor.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/src/skill-executor.mjs)
- [src/stages.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/src/stages.mjs)
- [tests/artifact-validator.test.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/tests/artifact-validator.test.mjs)
- [tests/bsk-command-gate.test.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/tests/bsk-command-gate.test.mjs)
- [tests/bsk-tool-server.test.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/tests/bsk-tool-server.test.mjs)
- [tests/diagnostics.test.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/tests/diagnostics.test.mjs)
- [tests/existing-content.test.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/tests/existing-content.test.mjs)
- [tests/feishu-e2e.test.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/tests/feishu-e2e.test.mjs)
- [tests/pipeline.test.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/tests/pipeline.test.mjs)
- [tests/process.test.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/tests/process.test.mjs)
- [tests/skill-executor.test.mjs](/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent/tests/skill-executor.test.mjs)
- [MAINTENANCE_FIXES_2026-10-14.md](MAINTENANCE_FIXES_2026-10-14.md)（本验收记录）
