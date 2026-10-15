# C2C e714 / Iteration 6：最小 G0 → G1 接线可行性

2026-10-15，Asia/Taipei。用户已要求继续开发至核心目标实现；本轮采用纠偏后的可行性决策，不执行已暂停的 Docker runner 计划。

## 已核实的结论

**当前严格隔离要求下 NO-GO；官方可信客户端模式是有条件可行的候选，需用户明确选择信任边界，并验证实际启用工具后才能接线。** 不是 CLI 未安装或用户未登录的问题，不读取认证文件正文来诊断。

**随后用户已明确选择 A：** “同意 A：官方客户端可信，按最小路径继续（推荐）”。该选择批准当前单用户开发验收的信任边界；独立同UID攻击者防御不再属于当前验收承诺。实际工具限制、准确run批准及原生质量门仍然必须满足。ChatGPT随后给出 Iteration 6A 最小接线 PLAN，允许固定接线代码及离线拒绝验证先行；真实工具 smoke 和业务run仍需具体批准。

- 当前 CLI 实测为 0.153.0；`codex exec --help` 明示 `--ignore-user-config` 不加载用户配置，但认证仍使用 CODEX_HOME。现有执行器使用同一 CLI、命名 profile、ephemeral、禁用规则加载和能力扩展。
- 官方 [Permissions / Scope and enforcement](https://learn.chatgpt.com/docs/permissions#scope-and-enforcement) 将本机沙箱命令与客户端模型/认证请求、浏览器、MCP、Apps 分开。命名 profile 不构成整个客户端进程的外层隔离。
- 官方 [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) 提供认证存储、工具/功能、MCP 和权限配置；配置项或 feature 标记存在并不证明实际所有工具已被禁用或正确施加限制。
- `src/entry-host-bootstrap.mjs` 的正式工厂仍无条件抛出 ENTRY_HOST_ISOLATION_UNVERIFIED。`src/local-entry-approval.mjs` 使用真实本地签发/消费存储，但当前 GUI 通道只确认本地操作者，不能独立认证身份。
- [P0 宿主验收](P0_FINAL_GATE_ACCEPTANCE_2026-10-14.md) 明确要求抵御敌对同 UID 任意代码、保护宿主代码/存储、worker 身份及 GUI 通道。官方客户端在同一用户下运行不能直接满足该更严格承诺。
- 固定 Codex 命令和 Node 容器历史证据保持有效，但不证明客户端整体或任意工具已被隔离。本轮没有重复探测、业务 worker 或网页调研调用。
- ChatGPT 已读取当前模块和历史证据，给出 MINIMAL_G0_TO_REAL_G1 的有限 PLAN；结论 FEASIBILITY: CONDITIONAL、FIRST_BLOCKER: TRUSTED_CLIENT_AND_TOOL_BOUNDARY_UNVERIFIED。没有授予运行权限。

## 用户需要决定的范围

| 方案 | 信任边界及残余限制 | 实施影响 |
|---|---|---|
| A：单用户开发验收采用官方可信客户端 | 官方 Codex 客户端、固定宿主代码和本地操作者属于可信计算基础；模型输出、网页内容和模型生成命令不可信。沙箱命令不能读宿主审批/认证/其他 run 或改写锁定输入；客户端可按官方方式认证和访问模型。此方案不承诺防御已控制同 UID 的任意宿主进程，也不把本地 GUI 点击当独立身份认证。 | 推荐的最小路径；复用现有 Pipeline、审批与 profile。仅在用户明确选择该信任边界且实际工具/命令边界验收后接线，不移除全部验证或添加自签开关。 |
| B：保留独立身份及整个客户端隔离要求 | 保留此前更严格模型，需要独立受控身份/环境、对应认证通道、受保护审批及 GUI，不能由当前 profile 或无网络 Node 容器证明。 | 当前环境 NO-GO。先审查具体受支持环境及部署方案，再单独申请安装/配置/认证操作；不自动创建账号、服务或复制凭据。 |

选择 A 只是确定本地开发验收的信任边界，不批准读取实际密钥、扩大其他工具、额外 Docker 尝试、任何正式发布或新 run 执行。选择 B 不授权系统变更。

## 最小实施顺序（决策后）

1. 明确所选可信边界及仅 G1 启用能力，核实 CLI 真实工具目录/执行行为。客户端认证和服务请求保持官方通道；模型命令 profile 的文件、进程、网络限制必须有效。非命令工具逐项有控制证据，无法控制则 STOP。不开启用户配置、项目规则、插件、Hooks 或其他能力来绕过限制。
2. 优先只改 `src/entry-host-bootstrap.mjs`、`src/skill-executor.mjs`、`scripts/entry-host.mjs`；仅有实际缺陷才改 `src/worker-permissions.mjs`、`src/official-source-host.mjs`。对应现有测试文件补充有意义的拒绝/接线回归。不新增 runner、状态机或签发体系。
3. 正式 bootstrap 固定组合既有 host、orchestrator、Pipeline、executor；调用者不能注入批准回调、任意命令或声称 isolationVerified。保留材料/锁版、单次消费、审批、恢复和计划确认验证。
4. 固定当前 Wallpaper Engine 草稿、完整40词和隔离目录；可信宿主审核来源归属、精确 URL 及每条网页操作。图标重新绑定新 run 的来源/使用权与视觉批准；原生首页研究、JSON、SEO、图标 ZIP 要求全部保留。
5. 取得具体 G1 新 run 的执行批准后，沿同一入口启动，仅运行首页阶段并停在真实验收点。若原生 Skill 不通过，不运行下游、不生成合成替代产物。G1 PASSED 后按既定依赖推进 G2–G6，最终部署计划独立确认，deploymentExecuted=false。

预定检查命令（只有发生对应修改/获准实际操作时执行）：

```sh
node --test tests/entry-host-bootstrap.test.mjs tests/skill-executor.test.mjs tests/worker-permissions.test.mjs tests/official-source-host.test.mjs
npm run test:entry-host
npm test
```

实际能力验证需先展示准确命令、材料、读写/工具范围和停止条件；不重复已接受的同等 canary。新的具体运行批准不能由本文件或规划审查替代。

## 停止条件与本轮状态

当前待用户选择信任边界；G0 PARTIAL_BLOCKED、真实 G1 NOT_PASSED、后续未完成。若所选模型不能由正式能力落实，输出具体不支持项和所需环境决策，不再自动建设一批抽象模块。没有修改正式执行代码或安全要求，没有读取真实凭据、修改原始关键词/Skills/模板/站点，没有业务 manifest 或发布。

上述待决策状态为最初核实快照；用户选择A后进入最小代码接线，完成度仍以本轮实际验证与后续真实run为准。

C2C 状态检查正常。工具更新提示新提交，但 `git pull --ff-only` 返回 Already up to date；该差异需按现有工具链核实。自动审批拒绝了可能持久修改访问范围的 sandbox-allow；现有权限白名单已确认正常，不执行该变更或改用替代路径。

更新提示差异已定位：当前本地HEAD包含origin/main，且有两个额外本地提交（含合并提交），并非落后于远端；不重置、不丢弃本地改动，不为等值比较提示重复安装。现有协作连接保持正常。
