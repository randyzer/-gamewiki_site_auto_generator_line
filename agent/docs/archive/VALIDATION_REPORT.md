# Agent 开发与离线联调验收

日期：2026-10-13。用户确认范围：先完成代码和离线联调，真实建站待资料齐备后执行。

## 已执行检查

`npm test --prefix agent`：79 项通过，0 失败，0 跳过，退出码 0（第二轮修复后）。首轮为 72 项通过。

覆盖原有 34 项编排测试和 8 项飞书测试，以及新回归：READY 恢复、失败下游失效传播、关键词同路径修改、死锁恢复/活跃锁保护、Skill 脚本漂移、七阶段原生产物结构、目录/链接逃逸、空产物、缺失来源、错误域名与未修复 P1、计划授权状态、队列重启、重复消息、通知失败、暂停恢复、确认票据用户/摘要/有效期/单次使用、拒绝后重新确认，以及超时进程组清理。

原生结构测试实际调用首页、关键词、UI/UX 和 prelaunch 的 Python 验证器。测试数据明确为合成资料，不能作为真实调研或上线资格。执行器测试调用受控本地子进程及注入的传输，不发起真实 Codex 模型运行。

`node agent/scripts/offline-validation.mjs`：退出码 0，七阶段依次运行至部署计划 `WAITING_FOR_USER`。保留记录：

`runs/offline-d69673c7-d28d-4252-89ff-a53f34eb0a5f/manifest.json`

`runs/offline-d69673c7-d28d-4252-89ff-a53f34eb0a5f/AGENT_RUN_REPORT.md`

`runs/offline-d69673c7-d28d-4252-89ff-a53f34eb0a5f/OFFLINE_VALIDATION.json`

记录明确写入 `OFFLINE_FIXTURE_ONLY`、`realSkillExecution:false`、`realFeishuDelivery:false`。`deploymentExecuted:false`。

## 已实现

总控代码及配置位于 agent 根目录，飞书仅作为适配器。七阶段输入预检、锁版、状态持久化、上游验收、暂停边界、显式恢复、输入变更失效传播、原生产物快照及研究交接已接通。每个飞书任务对应一个固定 run_id 和隔离站点目录。

修复原审查中的空目录假成功、排队任务重启丢失、通知失败阻断派发、READY 恢复非法转换、失败下游保留旧状态、关键词同路径变更未失效等问题。死锁只在本机持有者已死亡且可确定时回收；中断阶段先阻断，不能把未知外部副作用视为完成。

独立代码审查还复现了“父进程退出后孙进程残留”和“拒绝/过期计划无法重新确认”两项问题；均已修复并有回归测试。

ChatGPT 首轮独立审查接受编排、队列、锁版、失效传播和审批主体，要求修复四组问题。第二轮已完成：

- 关键词资料位于 `backgroundinformation/keyword-materials/`，完整交接实际通过内容整合 Skill 的 Python preflight。
- 验证后的部署计划以相同字节落盘到站点 `docs/`，测试覆盖重复生成、冲突、防覆盖及写失败回滚；worker 未获得项目写入权限。
- UI 授权绑定运行、阶段、修订和文件列表；当前环境无法机械隔离批准范围，真实 optimize 在 worker 启动前 BLOCKED。
- 关键命令回复与状态变更同事务持久化，按 message_id 去重；覆盖批准已提交但回复失败后的重启恢复，以及三次投递耗尽的 FAILED 状态。

第二轮保留的离线记录为 `runs/offline-f9c48e40-fa90-4174-94c3-f2892088cdbc/`，其中包含 `manifest.json`、`OFFLINE_VALIDATION.json` 和十个核心代码文件的 `CODE_SHA256.json`。仍在 stage 6 等待计划确认，生产执行为 false。

ChatGPT 第二轮独立复审结论：**DONE / CODE_AND_OFFLINE_INTEGRATION**（任务 c2c_a731，iteration 2）。已读取执行记录、源码、测试断言和运行产物；确认四项修复及 79 项测试结果。它没有重新运行测试，也没有把真实模型、飞书或生产能力算作已验证。

## 本轮未验证

- 真实 Codex 调用七个 Skill、事实正确性、真实浏览器审计和站点生产构建。
- 新版服务的实际飞书投递、服务重启及断线重新连接。
- 正式部署、DNS、GitHub 写入、GSC/GA4、广告实现与线上验收。

保持既有游戏站、模板与 Skill 来源未修改。没有访问或修改飞书凭据，没有重启现有飞书服务，没有生产副作用。

实际运行限制：当前 CLI 的 workspace-write 沙箱限制写入，不能独立保证所有只读/网络能力。缺少工具、授权或用户资料必须 BLOCKED/WAITING_FOR_USER；不能使用其他服务绕过失败。可选广告仅计划；生产执行与验收另需具体授权方案。

## 修改文件清单

- 总控：src/pipeline.mjs、orchestrator.mjs、skill-executor.mjs、artifact-validator.mjs、skill-lock.mjs、handoff.mjs、files.mjs、process.mjs、cli.mjs。
- 配置与入口：config/workflow.json、worker-result.schema.json、test-fixture.json；package.json、.gitignore、runs/.gitkeep；scripts/offline-validation.mjs。
- 测试：tests/pipeline.test.mjs、recovery.test.mjs、skill-executor.test.mjs、artifact-validator.test.mjs、process.test.mjs、feishu-e2e.test.mjs、helpers.mjs。
- 飞书：feishu-ai-employee/src/core.mjs、agent.mjs、pipeline-adapter.mjs、main.mjs、workflow.mjs、skill-inventory.mjs、readiness.mjs。
- 文档：README.md、VALIDATION_REPORT.md、feishu-ai-employee/README.md。

本地生成但不提交的记录：config/skill-manifest.json、runs/ 下的离线证据及 workspaces/ 下的合成站点。暂存原实现、源 Skills、模板、已有游戏站保持未修改。
