# 总控执行路线图：Legacy V1 设计（下一步顺序已撤销）

状态：本文件只保留 Legacy V1 实现说明。2026-10-20 起，后续开发和验证必须遵循
[Agent V2 当前执行路线图](AGENT_V2_CURRENT_EXECUTION_ROADMAP.md)。下方旧顺序已撤销，
不得据此启动 Wallpaper Engine 002、真实 Worker、部署或生产权限。

本文件记录旧版新站主线的代码状态。使用入口见 [README](../README.md)，逐阶段权限/产物见[阶段矩阵](SEVEN_STAGE_GATE_AND_EVIDENCE_MATRIX_V1.md)。历史局部实测不替代当前主线验收。

## 当前实现

- [CLI](../src/cli.mjs) 的 `run INPUTS.json RUN_ID` / `retry INPUTS.json RUN_ID` 进入 [terminal-run](../src/terminal-run.mjs)：交互 stdin、展示摘要、操作者输入单独的小写 y 后才调用总控。Codex 整理输入和读取报告，由用户亲自启动；不得代输确认。
- [orchestrator](../src/orchestrator.mjs) 将新站映射到 `agent/workspaces/RUN_ID/site`，通过唯一 [pipeline](../src/pipeline.mjs) 依次调度七个核心阶段，记录 manifest、检查点、历史和报告。缺项等待，失败/阻断后须显式重试。
- [Skill 锁](../src/skill-lock.mjs) 固定 `codex-skills/` 的已提交 git 树和文件 SHA256；未提交变化或树不一致被拒绝。[模板快照](../src/template-snapshot.mjs) 按 [workflow 配置](../config/workflow.json)固定 GitHub main 的 template 子树至仓库 `.template-cache/<commit>`；恢复复用原 commit 并拒绝缓存改动。
- [执行器](../src/skill-executor.mjs) 使用 [worker 权限](../src/worker-permissions.mjs) 限定文件读写、禁用 worker 浏览器，只有关键词调研和批准后的部署执行轮开放命令网络；客户端认证是独立边界。首页 worker 可生成图像，第 1/5/6 阶段可查看图像。
- 宿主负责[首页代抓](../src/homepage-source-host.mjs)、[favicon.io 转换](../src/favicon-io-host.mjs)、[依赖安装和生产预览](../src/site-preview-host.mjs)、[UI 审计](../src/site-audit-host.mjs)、[全站巡检](../src/prelaunch-host.mjs)。worker 消费证据并写原生报告；[证据模块](../src/site-evidence.mjs)逐文件复核 SHA256。favicon 转换失败时等待用户保存 ZIP，不自动换转换器。
- 关键词 Skill 将盗版意图归并到安全/风险主题，并要求风险提示及逐词处理记录；[Skill 规则](../../codex-skills/game-innerpage-keyword-information-research/SKILL.md)由其[原生校验器](../../codex-skills/game-innerpage-keyword-information-research/scripts/validate_outputs.py)强制检查。[产物适配器](../src/artifact-validator.mjs)要求最终关键词素材均为 COMPLETED，不可编造原始关键词。
- 第 7 阶段先出计划并等待 `deploymentPlanApproval`，准确 digest 批准后，同一阶段进入 execute，开放计划范围内 push、部署、DNS、GSC/GA4 权限。`deploymentExecuted` 在执行前即置 true，不能单独证明部署成功。报告校验要求 PRODUCTION LIVE 和匹配生产域名。
- 第 5 阶段仅支持 audit-only；请求 optimize 会在浏览器/worker 启动前 BLOCKED。广告不是第八个核心阶段；默认关闭，启用也停在外部实现与验收门。

## 已验证与未验证

以下表格描述测试覆盖方式；测试源文件存在不等于本轮已通过，运行数字在交付报告中单列。

| 范围 | 代码中的验证方式 | 证据的限制 |
| --- | --- | --- |
| 终端摘要、拒绝管道、y/取消、retry、批准后执行 | [terminal-run 测试](../tests/terminal-run.test.mjs)使用伪 TTY 流及替身 executor | 人工终端与真实 Codex 联动：**未经真实运行验证** |
| Skill 未提交修改/树漂移、锁定文件 | [skill-lock 测试](../tests/skill-lock.test.mjs)创建临时真实 Git 仓库 | 不证明业务 Skill 真实执行 |
| 模板 commit 固定、retry 复用、篡改拒绝 | [snapshot 测试](../tests/template-snapshot.test.mjs)、[总控接线测试](../tests/orchestrator-template-snapshot.test.mjs)使用本地 Git/file 仓库和替身 worker | 当前 GitHub 网络获取与完整选模：**未经真实运行验证** |
| 首页代抓/图标交接、UI/巡检、依赖安装/预览 | [首页执行器测试](../tests/homepage-host-executor.test.mjs)、[图标测试](../tests/favicon-io-host.test.mjs)、[UI 测试](../tests/site-audit-host.test.mjs)、[巡检测试](../tests/prelaunch-host.test.mjs)、[预览测试](../tests/site-preview-host.test.mjs)注入浏览器/进程替身；模块解析测试真实导入 Playwright | 当前主线真实网页、图像/favicon、安装、构建和浏览器质量验收：**未经真实运行验证** |
| 部署计划/批准 digest/执行轮、篡改/失败 | [部署执行测试](../tests/deployment-execution.test.mjs)使用合成产物和替身 executor | push、部署、DNS、Google 服务：**未经真实运行验证** |
| 权限配置、可用功能与环境过滤 | [worker 权限测试](../tests/worker-permissions.test.mjs)检查配置/参数和注入调用 | 真实 worker 在目标机器上的边界及业务端到端：**未经真实运行验证** |

## 历史下一步（已撤销，禁止执行）

以下内容保留用于解释 Legacy V1 原计划及其风险，不再是当前操作指引。真实端到端必须等待
[当前路线图](AGENT_V2_CURRENT_EXECUTION_ROADMAP.md)第 1～7 步完成，并在第 8 步取得单独授权。

### 1. 真实 Codex worker 首次端到端，停在部署计划

用户确认游戏、原始关键词、目标域名、仓库、DNS 和输入文件后，在交互终端运行 README 中的 run 命令并亲自输入 y。使用 `adsEnabled: false`、audit-only，不提供 `deploymentPlanApproval`。

验收应保留：本轮输入与关键词摘要、Skill 锁、模板 commit、首页来源捕获及图标包、逐词材料、模板复制清单、内容清单与来源、UI 截图和全站巡检证据。第 1–6 阶段须全部 PASSED，第 7 阶段生成实际部署计划并 WAITING_FOR_USER，`deploymentExecuted=false`。必须由真实 worker、浏览器及实际项目产生证据，不能用 fixtures 填补。

首跑需重点核验以下代码边界：

- 原始关键词路径：pipeline 可读取外部 Markdown，但 worker 权限只为 run 目录内的 `rawKeywordsFile` / `keywordSourceLineageFile` 显式开放。不要预建同名 run 目录绕过：pipeline 新建目录也有冲突检查。此处可用性需验证，必要时另开代码修复任务。
- 部署计划轮：worker 命令网络关闭，是否足以完成 Skill 所需的远端状态检查需验证；不能绕过权限或假称已核验远端。
- 当前执行器默认由 PATH / `CODEX_BIN` 选 CLI；可选二进制身份校验只有显式传入身份时才执行。不能把该默认入口写成已固定 CLI 二进制身份。
- 宿主代抓只支持匿名公开 HTTPS、拒绝登录/cookie、表单/点击及下载；失败页面保留失败原因，不当作来源成功。需要登录的站内调研不能由该代抓器冒充完成。

工具失败先给出具体环节、状态与缺项；保留 WAITING_FOR_USER/BLOCKED/FAILED/PARTIAL。未获用户明确同意，不切换来源、工具或权限路径。

### 2. 真实部署

完成第一步后，由用户审阅两份部署计划并批准准确 plan digest；只增加批准字段，再在交互终端执行 retry 并输入 y。核对实际 push/部署、生产域名、DNS、GSC/GA4 每个状态及回滚证据。需要登录、OAuth 或计划范围变化则等待用户处理。

现有 worker 权限生成器仍将各写目录下的 `.git` 设为只读（见 worker-permissions 的 permissionProfileConfig），即使 execute 允许站点写入也如此；需要写 Git 元数据的提交、推送或本地引用更新是否可用，应在真实部署前核验，不能仅凭生产权限字段宣称已可执行。

成功需结合阶段 PASSED 与实际部署报告，不能只看 `deploymentExecuted=true`；此标志执行前即置位，失败也可能代表已有部分外部副作用。GSC、GA4 分别报告提交、验证、标签和数据状态，不把请求成功写成收录或已有统计数据。

### 3. UI optimize 模式

当前 [missingInputs](../src/pipeline.mjs) 已检查绑定 run、stage、projectPath、siteRevision、scope 和具体 files 的批准对象，且定义了 `UI_UX_RETEST_REPORT.md`；但[宿主适配器](../src/skill-executor.mjs)仍直接拒绝 optimize。后续需先实现和验证受控修改及复测，再将 optimize 写成可用功能；不能靠更新文档开放权限。

### 4. 决定是否删除冻结模块

首跑与真实部署形成证据后，再评估 G0 审批/隔离探测/bsk、entry-*、m3-*、飞书和已有项目模式是否删除。当前保留代码、配置、脚本、测试与[历史档案](archive/)。冻结是维护范围决定，部分旧命令和条件分支仍存在，并非代码已移除。任何删除另行评审，不纳入本文档变更。
