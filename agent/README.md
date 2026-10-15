# 网站生产总控 Agent

总控根目录为 `agent/`，飞书接入保留在 `feishu-ai-employee/`。七个核心阶段依次执行；每阶段验收通过后才进入下游。运行记录位于 `runs/<run_id>/`，新站工作目录自动分配为 `workspaces/<run_id>/site`。

## 当前总体规划与实际状态（2026-10-14）

**P0 工程开发验收：通过（仅限已批准的开发与离线交接范围）；生产执行门：BLOCKED。** 证据与限制：[P0 工程开发总验收](docs/P0_DEVELOPMENT_ACCEPTANCE_2026-10-14.md)。真实 Codex 已完成 TEST 草稿 revision 1→2 的跨调用恢复，本机安全宿主已完成模拟交接；OS 独立身份隔离及真实 worker 尚未验证，生产入口继续拒绝执行。

主目标：通过统一入口与唯一 Pipeline，用一个真实新建站项目跑通首页、关键词、模板、内容、UI、上线前验收和部署计划。计划生成合格先进入 `WAITING_FOR_USER`，用户独立确认准确摘要后计划阶段才为 `PASSED`；两者都保持 `deploymentExecuted=false`，不包含生产发布。

- [总体开发路线图 V1](docs/MASTER_AGENT_EXECUTION_ROADMAP_V1.md)：当前能力、G0–G6 优先级、阻断、后置范围与完成条件。
- [七阶段验收矩阵 V1](docs/SEVEN_STAGE_GATE_AND_EVIDENCE_MATRIX_V1.md)：每阶段输入、权限、原生产物、验收器、证据与失效传播。
- [文档索引](docs/README.md)：历史设计、专项报告和调查证据。

核心状态机和部分能力已有实现/离线或局部实测，真实七阶段尚未贯通。P0 草稿、只读交接校验及固定 bootstrap 的离线审批桥接已实现；生产宿主 OS 强制隔离仍未通过；自然语言创建、跨调用读取和 revision 更新已在独立 TEST run 中验证成功。首页已有宿主 Steam 采集、本地 favicon 路径，但最新 Wallpaper Engine 首页仍 `BLOCKED`；关键词、UI 和 prelaunch 的真实浏览器适配尚未接通。飞书、自动上传兼容和生产操作后置。

原先自然语言保存阶段曾受 429 阻断；现已通过真实 Codex 两次调用完成 TEST-p0-final-natural-20261014 的创建（revision 1）和跨调用恢复更新（revision 2）。证据在 runs/TEST-p0-final-20261014/natural-create.stdout 与 natural-resume-v2.stderr；旧[复验报告](docs/P0_CODEX_NATURAL_ENTRY_RECHECK_2026-10-14.md)仅是历史阻断记录。共享工作区新加入的实验审批消费契约未接入生产宿主，当前 `run/retry` 默认返回 `ENTRY_TRUSTED_APPROVAL_UNAVAILABLE`，不启动 worker。下面历史运行命令示例不表示当前入口已具备真实执行能力。

本轮 [P0 最终门验收](docs/P0_FINAL_GATE_ACCEPTANCE_2026-10-14.md)补充了固定 bootstrap：重新生成快照 → 模拟 Mac GUI → 持久单次票据 → 材料/版本校验 → 原 orchestrator/Pipeline。`npm run test:entry-host` 可离线复验；`npm run entry:host -- execute` 是独立受控入口，目前固定退出 2、返回 `ENTRY_HOST_ISOLATION_UNVERIFIED`，不弹窗、不启动 worker。没有任务 JSON、环境变量或强制开关可解除生产阻断。`createSkillExecutor` 接线仅在显式 mock 进程依赖下验证，真实浏览器门仍生效。

下面保留操作指南及按时间积累的 M2/M3 过程记录。过程报告中的旧状态和测试数字只证明该轮范围；当前开发以两份现行规划和指定 run 的最新 manifest 为准。阅读规划或保存草稿不授权执行任务。

## 统一入口 V1（Codex 优先，CLI 为唯一底座）

从 Codex App 打开并信任本 `agent/` 项目，在会话输入：

> `$game_site_orchestrator 帮我为 Hood Warfare 2 做一个英语游戏攻略站。先做入口预检，列出所有所需 Skills 与素材，不要启动 build 或 worker。`

适配层先按已确认的事实把任务整理为 `mode/gameIdentity/objective/gameMetadata.steam` 等字段，通过**只读**入口执行预览；无法确定的 Steam App ID、关键词、域名和项目地址不能推测。另有项目级自定义 Agent 定义 `.codex/agents/game_site_orchestrator.toml`，但指定 `agent_type` 的原生委派在当前本机 Codex 客户端尚未确认可用。已验证的方式是显式调用同名 Codex Skill。

入口 CLI（以下均在 `agent/` 工作目录下）：

```sh
# 仅预检，不生成 run，也不会更新 Skill manifest
node src/cli.mjs entry-preview INPUTS.json
# 无需编写文件的只读输入（只读 Codex/zsh 沙箱不要使用 heredoc）
printf '%s\n' '{"mode":"new-site","gameIdentity":"Hood Warfare 2","objective":"English guide site","gameMetadata":{"steam":"https://store.steampowered.com/app/5155360/"}}' | node src/cli.mjs entry-preview -

# 只有你同意保存入口草稿后
node src/cli.mjs entry-create INPUTS.json RUN_ID
# 随时复查/继续同一个入口草稿（只读）
node src/cli.mjs entry-status RUN_ID
# 新信息用独立的 PATCH.json 更新，必须附最新 revision
node src/cli.mjs entry-update PATCH.json RUN_ID EXPECTED_REVISION
```

`entry-preview` 支持输入文件或用 `-` 从标准输入读取 JSON，两者上限均为 64 KiB。
入口错误返回不回显原始输入的 `BLOCKED/code` JSON（退出码 2）。
`entry-create` 返回 revision 1；保存前验证输入，非法输入不占用 run 目录。
只读审批交接预览、一致性校验、本机人工确认代码、持久票据及受控宿主→现有 Pipeline 的离线接线已实现；但独立 OS 隔离未获验证，生产执行保持禁用。见 [P0 交接设计](docs/P0_UNIFIED_ENTRY_HANDOFF_DESIGN_2026-10-14.md) 和 [P0 最终门验收](docs/P0_FINAL_GATE_ACCEPTANCE_2026-10-14.md)；
不得把草稿 run ID 直接传给正式 `run/retry`，也不得把 READY_FOR_APPROVAL 当作执行许可。
`entry-create` 只创建 `agent/runs/RUN_ID/ENTRY_INTAKE_V1.json`；
`entry-update` 只更新这份 run-scoped 入口草稿，禁止覆盖已有 pipeline
`manifest.json`，旧 revision 或撞名任务会被拒绝。
所有入口命令都**不**打开浏览器、不执行模型子进程、不复制模板、不触碰游戏网站、不部署。

状态含义：`WAITING_FOR_USER` 当前材料仍缺；`BLOCKED` Skill 清单缺失/哈希漂移或版本化已有项目模式尚未符合条件；`READY_FOR_APPROVAL` 只代表当前入口材料检查通过，**不代表 Skill PASSED、更不代表允许执行建站**。初始与后续材料按首页、关键词、内容、UI、prelaunch、部署/可选广告分阶段显示。原始关键词必须用户提供文件路径，不自动生成。已有项目必须继续走现有版本化任务卡与项目白名单预检，不允许从入口草稿绕过。

入口 V1 不提供独立后台调度；“缺项后 10 分钟提醒一次”已有飞书离线实现，但本入口**尚未连接真实定时提醒**。后续只在用户明确审批精确 run、目录与副作用后调用现有 `run/retry`，不复制另一份工作流。

历史记录中，Codex 显式 Skill 的只读入口曾做真实调用：`codex exec` 在一次性
`--ignore-user-config --sandbox read-only` 环境下用 `printf` 管道
执行 `entry-preview -` 成功，返回 8 个本地 Skill 均 OK、
`READY_FOR_APPROVAL`，没有 worker。用户常规 Codex 环境里过期的
外部 MCP 认证仍需另行修复；这不代表原生自定义子 Agent 委派已通过。

完整说明及验收：[docs/ENTRY_V1_ACCEPTANCE_2026-10-14.md](docs/ENTRY_V1_ACCEPTANCE_2026-10-14.md)。

本次续作的真实 Codex 验证在 app-server 初始化处受权限阻断，未完成自然语言保存/恢复。
详见 [P0 续作验收](docs/P0_CONTINUATION_ACCEPTANCE_2026-10-14.md)。
只读交接使用 `node src/cli.mjs entry-handoff-preview REQUEST.json`，请求包含
`runId/expectedRevision/executionRunId`；输出的 `snapshot` 可交给
`node src/cli.mjs entry-handoff-validate SNAPSHOT.json` 重新校验。
返回 PREVIEW_ONLY / CONSISTENT_NOT_AUTHORIZED 均不授予执行权限，不创建执行目录。


## 本地检查

需要 Node.js 22.13+、Python 3。真实执行另需已登录的 Codex CLI，以及各 Skill 要求的工具和授权。

```bash
npm test --prefix agent
node agent/src/cli.mjs inventory
node agent/scripts/offline-validation.mjs
```

`inventory` 仅对 `config/workflow.json` 中列出的八个 Skill 生成本地锁版清单，覆盖 SKILL.md、references、scripts 等文件。运行中校验这些文件，变化时阻断；已有运行不会自动升级。

最后一个命令使用明确标注的合成测试执行器，不调用模型、网络或飞书。它保留七阶段编排证据并停在部署计划确认门；模拟报告不能用于真实发布。

## 飞书任务

在已授权用户与机器人的私聊中发送：

```text
/start {"gameIdentity":"准确游戏名及版本/平台","objective":"新建攻略站"}
/inputs TASK_ID
/input TASK_ID {"rawKeywordsFile":"/绝对路径/关键词.md"}
/status TASK_ID
/pause TASK_ID
/resume TASK_ID
```

普通文本也会创建任务；未解析的游戏身份或资料不会被模型猜测，任务等待结构化输入。`/input` 和 `/resume` 的补充内容必须是 JSON 对象。站点目录由系统分配，不能指向现有游戏站或模板库。

后续阶段按需收集：`canonicalRequired`、`canonicalOrigin`、`siteRevision`、`domain`、`repo`、`branch`、`dns`、`deploymentPlanAuthorized`。UI 默认只审计。优化授权须包含 `approved/projectPath/scope/runId/stage/siteRevision/files`，其中 `stage` 为 `game-site-ui-ux-audit-optimizer`，绑定本轮、当前版本和具体文件；当前执行环境不能机械隔离这些文件，所以真实 `optimize` 在启动 worker 前返回 BLOCKED。用户可改为 `audit-only` 或另行审查具体优化补丁。缺项可以通过 `/inputs` 一次查看，等待十分钟时每轮最多提醒一次。

`/pause` 在当前阶段结束后阻止后续派发，不声称会立即中断正在执行的 Skill。中断运行进入阻断/失败，显式 `/resume` 才重试；请先核对该阶段的实际副作用。活跃或未知持有者的运行锁不会被抢占。

部署计划生成后，机器人提供摘要及文件路径：

```text
/approve TASK_ID PLAN_DIGEST
/reject TASK_ID
/cancel TASK_ID
```

确认票据绑定任务、用户、阶段、计划摘要、24 小时有效期及单次使用。输入变化使旧票据失效；拒绝或过期后，用户可 `/resume` 重新查看并确认同一计划。**`/approve` 仅确认计划，不授权 GitHub 写入、DNS、发布、Google 服务或广告操作。**生产执行属于另一个有具体方案的授权任务。

## 实现与限制

- `src/stages.mjs`：阶段名称、中文显示名、产物和输入的统一定义。业务和审批使用阶段名称；旧 manifest 数组、数字产物目录保持兼容，旧编号审批只在入口转换为名称。CLI/飞书返回的 `stage` 是名称，`stage_index` 仅保留顺序信息。
- `src/diagnostics.mjs`：失败原因脱敏。阶段异常与 worker 主动报告的 FAILED/BLOCKED 写入 `runs/<run_id>/diagnostics/`，manifest 和历史记录保留阶段、执行次数、失败环节、错误码、原因及诊断文件路径。重试保留旧诊断；诊断文件无法写入时，manifest 记录该写入失败。CLI/飞书状态摘要包含当前失败原因。
- `src/bsk-policy.mjs`：将浏览器策略绑定当前任务的游戏身份。通用策略不包含任何固定游戏；Steam 公共结构化资料使用 `gameIdentity`、`gameMetadata.steamAppId` 和 `gameMetadata.steam` 精确核验名称及 URL。`gameIdentity` 应是确切游戏名称，平台和版本放在游戏元数据中；元数据不得覆盖游戏名称。缺失或不匹配的身份不得通过验收，其他来源的正文捕获仍未实现。
- `src/pipeline.mjs`：状态机、持久化、阶段输入/版本/产物检查、失效传播及恢复。
- `src/orchestrator.mjs`：任务到运行记录的固定映射、阶段循环、暂停边界及汇总。
- `src/skill-executor.mjs`：受限制的 Codex 子进程、原生输出解析；失败不会换用其他服务。
- `src/artifact-validator.mjs`：调用原生 Python 验证器，核验关键词、模板文件、来源记录、UI、prelaunch 和部署计划。
- `src/handoff.mjs`：模板复制后交接研究资料，保留原生文件名并拒绝覆盖冲突。
- 飞书 `src/core.mjs`：消息授权与去重、SQLite 队列、单进程持有者、通知 outbox、输入/暂停/确认命令。

关键词交接目录为 `backgroundinformation/keyword-materials/`。部署计划先在隔离区生成并验证，再由宿主将相同字节安全写入 `docs/DEPLOYMENT_PLAN.md/json`；内容冲突会阻断，写入失败会回滚本次新建的计划文件。已有计划不会被静默替换。

关键命令回复与状态变更在同一 SQLite 事务提交；回复按 message_id 去重，重启后只重试发送。发送最多三次，耗尽后记录 `FAILED`，不会撤销已提交状态或重新执行命令。

文件、ZIP、JSON 和原生验证器通过只证明对应结构与记录一致；仍需要真实调研、浏览器审计和构建证据才能判断站点质量。子进程使用 workspace-write 限制写入、过滤飞书凭据环境并禁止自动审批，**不提供操作系统级只读目录隔离或通用网络权限代理**；所需浏览器、工具或凭据不可用时应报告 BLOCKED。允许的构建产生缓存时，必须在受控目录内执行。

可选广告分支当前只收集计划，停在外部实现与验收门；真实广告加载与发布没有在本轮实现。现有目标只覆盖部署计划，不能把流程结束说成网站已部署、已收录或已有收益。

本轮验收见 `docs/VALIDATION_REPORT.md`。运行飞书服务前需完成本地依赖与配置检查；此次离线验收没有重启现有服务，也没有验证新代码的真实飞书投递或真实游戏七阶段运行。

## M2 浏览器受控调用与证据隔离（未解除阻断）

当前 Codex 子进程没有宿主逐命令浏览器审批接口，首页/关键词/UI/上线前浏览器阶段仍为 `APPROVAL_CAPABILITY_UNAVAILABLE`。新增仅用于检查与隔离候选证据的工具，**不批准命令、不替代原生 Skill 产物、不推进 pipeline**：

```bash
node scripts/browser-evidence-handoff.mjs inspect config/m2-browser-task.example.json
node --test tests/host-browser-evidence.test.mjs
```

设计及后续接入门槛见 [docs/M2_BROWSER_CONTROLLED_ACCESS_AND_HANDOFF.md](docs/M2_BROWSER_CONTROLLED_ACCESS_AND_HANDOFF.md)。飞书入口未改动。

## M2 可信宿主人工浏览器审批（仅首页）

默认 browser Skill 仍会安全返回 `APPROVAL_CAPABILITY_UNAVAILABLE`。若操作者当前能看见并点击 Mac mini 上的确认窗口，可先运行下面的 **独立只读宿主联调**；每一条 bsk 命令、包括窗口关闭都需要单独确认：

```bash
node scripts/browser-trusted-host-smoke.mjs
```

该命令不会执行模型、生成站点或发布。真实游戏任务的可选模式是 `GAME_SITE_BROWSER_HUMAN_DIALOG=enabled node src/cli.mjs run INPUTS.json RUN_ID`，必须先获得具体任务及写入范围授权。当前只覆盖 Steam 结构化首页事实采集，其他三个浏览器阶段仍未接入；原生 PNG、favicon ZIP 与完整研究输出仍可能 BLOCKED。可信宿主证据保存于 run 根目录、外置于 worker 可写区，并在 worker 退出后执行 SHA256 防篡改复核。详见 [docs/M2_HOST_HUMAN_BROWSER_APPROVAL_RESULT_2026-10-14.md](docs/M2_HOST_HUMAN_BROWSER_APPROVAL_RESULT_2026-10-14.md)。


### Steam 公开事实读取已通过真实验收

2026-10-14 使用宿主批准的 Bodycam Steam 实际网页完成五步 bsk 只读操作，`STEAM_PUBLIC_GAME_META_V1` 原生来源已验收为 `EVIDENCE_READY`。**这不代表完整首页 Skill PASSED**，图标 PNG、favicon ZIP 和其他三个浏览器阶段仍未完成。细节见 [docs/M2_STEAM_PUBLIC_CAPTURE_REPAIR_2026-10-14.md](docs/M2_STEAM_PUBLIC_CAPTURE_REPAIR_2026-10-14.md)。

## M3 图标生成与 favicon.io 产物验收

M3 已增加真实二进制 ZIP 校验、候选 PNG/ZIP 的隔离验收，并明确阻断无真实图像生成器回调或 favicon.io 上传下载审计的首页 `PASSED`。

```sh
node scripts/m3-icon-intake.mjs status
node --test tests/favicon-package.test.mjs tests/m3-icon-gate.test.mjs
```

当前 **status=BLOCKED** 是正确预期：图像生成回调与原子文件传输尚未经过验证；`bsk` 的上传/下载 CLI 存在不等于批准真实传输。不能用本地生成的合成图片或结构上合法的测试 ZIP 充作实际 favicon。详见 [docs/M3_ICON_FAVICON_HANDOFF_ACCEPTANCE_2026-10-14.md](docs/M3_ICON_FAVICON_HANDOFF_ACCEPTANCE_2026-10-14.md)。


## M3.1 favicon.io 受控文件传输测试

**生产上传/下载仍处于禁用状态。** 新增可信宿主测试流程：固定 favicon.io 页面控件白名单、每条命令人工批准、合成测试 PNG 来源哈希及下载 ZIP 的二进制验证。在能够看到 Mac 审批窗口时运行：

```bash
node scripts/m3-favicon-transfer-smoke.mjs inspect
# 仅控件实际识别成功后，才考虑运行：
node scripts/m3-favicon-transfer-smoke.mjs transfer
```

2026-10-14 首次 inspect 测试由于 Mac 窗口审批超时而安全 BLOCKED；9 项专项测试与 219 项全量测试已通过，但**真实 favicon.io 上传/下载未完成**，首页 Skill 仍须保留 BLOCKED。详见 [docs/M3_FAVICON_TRANSFER_CONTROLLED_PROBE_2026-10-14.md](docs/M3_FAVICON_TRANSFER_CONTROLLED_PROBE_2026-10-14.md)。


### M3.2 favicon.io 实际验收（2026-10-14）

真实 Mac 人工审批的 `inspect` 已通过，验证 favicon.io 上传控件 `input[type="file"]`。随后两次合成 PNG 上传均获人工批准，但底层 `bsk upload` 失败；真实 ZIP 下载未执行。生产文件传输仍然禁用，完整首页 Skill 仍 BLOCKED。详见 [docs/M3_FAVICON_LIVE_ACCEPTANCE_2026-10-14.md](docs/M3_FAVICON_LIVE_ACCEPTANCE_2026-10-14.md)。


### M3.3 bsk upload 根因诊断（2026-10-14）

真实上传即使使用明确的 `--selector --mode input --json` 仍可能 30 秒超时，**并非 daemon 整体失联**。bsk 文档指出默认上传需要激活文件选择器；favicon.io 上无可见关联 label，但有唯一且包含 file input 的可见 Dropzone。因历史 `effect_state` 未获验证，本轮**没有执行真实 Drop 上传**。已添加错误枚举解析和严格一次性 Drop 回退门，仅接受 `file_input_not_activated + effect_state=none`；其余状态一律 BLOCKED。228 项全量测试通过，生产传输仍关闭。正式报告：[docs/M3_BSK_UPLOAD_ROOT_CAUSE_DIAGNOSTICS_2026-10-14.md](docs/M3_BSK_UPLOAD_ROOT_CAUSE_DIAGNOSTICS_2026-10-14.md)。


### M3.4 严格 effect_state 与一次性 Drop 备用路径

已新增 bsk 结构化失败信息白名单解析，并将备用 Drop 限制为首次经批准的 Input 上传明确返回 `file_input_not_activated + effect_state=none`、同一 PNG SHA256、同一 session/tab/URL、60 秒内的一次性授权，仍须再次人工批准。测试脚本新支持 `diagnose-input` 和 `diagnose-then-drop`。首次真实 `diagnose-input` 因 Mac 审批窗口超时而安全 BLOCKED，**本轮未进行实际上传/下载**。231 项全量测试通过；生产 `atomicFileTransferSupported` 仍为 false。报告：[docs/M3_FAVICON_EFFECTSTATE_CONTROLLED_RETRY_2026-10-14.md](docs/M3_FAVICON_EFFECTSTATE_CONTROLLED_RETRY_2026-10-14.md)。


### M3.5 Chrome 扩展文件网址权限预检（2026-10-14）

在 Mac mini 上只读检查 Chrome Default Profile 的 BrowserSkill 0.3.2 扩展 `newAllowFileAccess` 未设置：Chrome 将其视为未授权；BrowserSkill 上游 #385 证实这会造成 `bsk doctor` 正常但上传失败。**此项是高度相关的阻断，不是上传已修复。** 可用 `node scripts/m3-browser-file-permission.mjs` 检查。非 `ENABLED` 时所有真实传输测试在打开浏览器前 BLOCKED。扩展设置页面已打开，需操作者在 Chrome 中手动启用 “Allow access to file URLs”，随后重新验证。235 项测试通过，生产传输开关保持 false。报告：[docs/M3_CHROME_FILE_URL_PERMISSION_DIAGNOSIS_2026-10-14.md](docs/M3_CHROME_FILE_URL_PERMISSION_DIAGNOSIS_2026-10-14.md)。


### M3.6 Chrome 文件权限启用后的真实复验

已确认 Chrome BrowserSkill 0.3.2 的文件网址访问权限为 `ENABLED`，但经逐命令人工批准的独立 favicon.io 合成 PNG 上传仍返回 `COMMAND_TIMEOUT`，CLI exit code 3、`effectState=unverified`；按安全契约未尝试 Drop 或下载，独立窗口已关闭。生产传输开关仍关闭。验收记录：[docs/M3_BROWSER_PERMISSION_ENABLED_UPLOAD_RETEST_2026-10-14.md](docs/M3_BROWSER_PERMISSION_ENABLED_UPLOAD_RETEST_2026-10-14.md)。


### M3.7 favicon.io 人工可见网站验证（2026-10-14）

由于 Chrome 权限已开启但 bsk upload 仍在 `effectState=unverified` 下超时，新增独立人工网站验收脚本 `node scripts/m3-manual-favicon.mjs prepare` / `verify RUN_ID`。用户亲自通过已打开的 Chrome 页面上传明显标记 TEST 的 512×512 合成 PNG、下载 favicon ZIP，并将该 ZIP 放进当前 run 的 `output/favicon.zip`；校验器只检查固定输出路径及 ZIP 二进制，**不会扫描 Downloads、冒称 bsk 上传修复或自动判定首页 Skill PASSED**。目前人工操作未完成，真实 ZIP 尚不存在；239 项全量测试通过。详情：[docs/M3_MANUAL_FAVICON_SITE_CHECK_2026-10-14.md](docs/M3_MANUAL_FAVICON_SITE_CHECK_2026-10-14.md)。


### M3.7 手工 favicon ZIP 实际验收结果

用户在 favicon.io 人工测试后，把 `favicon_io.zip` 放入 run `m3-manual-favicon-ae172e2e-fd70-402e-ab39-2b0cc2c832f1` 的 `output/`。原始 ZIP 32,259 字节，**7/7 二进制文件结构和 CRC 校验通过**，且 ZIP 中 512×512 PNG 与合成 TEST 源文件 262,144 个像素完全相同。已保留原件并复制成规范的 `favicon.zip`，再次执行宿主验证，退出码 0，返回 `BINARY_VALIDATED_SITE_ORIGIN_UNVERIFIED`。手工站点功能在用户确认前提下验证通过，但未获得自动化下载的来源证明；bsk 数据面与原生首页 Skill 仍 BLOCKED。详情见 [docs/M3_MANUAL_FAVICON_SITE_CHECK_2026-10-14.md](docs/M3_MANUAL_FAVICON_SITE_CHECK_2026-10-14.md)。


### M3.8 首页 Skill 受控人工 favicon 交接

实现显式启用的用户人工 favicon.io 转换路径。针对**已有的 Agent run** 使用：

```sh
node scripts/m3-homepage-handoff.mjs begin RUN_ID
# 放入真实游戏人工审核过的 master-512.png，并从 favicon.io 手动下载 favicon.zip
node scripts/m3-homepage-handoff.mjs inspect RUN_ID
# 仅当用户明确批准两个打印出来的 SHA256 后：
node scripts/m3-homepage-handoff.mjs approve RUN_ID MASTER_SHA256 ZIP_SHA256
# 对同一个原始项目任务卡进行显式恢复：
node src/cli.mjs retry ORIGINAL_INPUT_CARD.json RUN_ID
```

Agent 复用既有 `WAITING_FOR_USER` 和 retry 状态机，文件/用户确认未完成时不启动浏览器或 worker。通过受控交接后，worker 仍必须完成真实调研，并按原始 Skill 的 `backgroundinformation` 文件名输出；宿主核验人工 ZIP 字节一致、原生 markdown 内容约束及 run、游戏身份。**手工网站来源为用户证明，不是独立站点签名，也不是 bsk 自动传输。** 未复用 M3.7 的 TEST 测试图，尚未启动真实游戏的完整阶段。248 项全量测试通过。详见 [docs/M3_HOMEPAGE_MANUAL_FAVICON_FALLBACK_2026-10-14.md](docs/M3_HOMEPAGE_MANUAL_FAVICON_FALLBACK_2026-10-14.md)。

BrowserSkill 自动上传兼容问题仍独立跟踪于 [docs/M3_BSK_UPLOAD_UPSTREAM_REPRO_2026-10-14.md](docs/M3_BSK_UPLOAD_UPSTREAM_REPRO_2026-10-14.md)。生产 `atomicFileTransferSupported` 仍为 false。


### M3.10 受控 drop-first 与本地 favicon 转换器设计（2026-10-14）

- 新增主机**离线测试专用** `node scripts/m3-favicon-transfer-smoke.mjs drop-first`：真实 favicon.io 页面有且只有一个可见的、包含唯一 file input 的 Dropzone 时，可信宿主才创建单次、同 session/tab/URL/PNG SHA256、限时的原生 Drop 许可。每条浏览器命令仍需 Mac 单独人工批准，不能重试未知效果的上传。标准生产调用默认禁止 drop-first；`atomicFileTransferSupported` 仍为 false。
- 首次真实启动测试于 `runs/m3-favicon-drop-first-2a70e86c-368f-4082-981b-8205fbc5c89c/` 因 **Mac 启动审批超时**而 `BLOCKED`，无浏览器命令、无上传或下载。未来测试生成新的带 runId 唯一标识的 TEST PNG；不能将历史未知效果的相同素材重传。
- 已设计离线本地转换器 `docs/M3_LOCAL_FAVICON_CONVERTER_SPEC_2026-10-14.md`（Pillow + 标准库 ZIP、来源哈希与人工审核、确定性结果及原生二进制校验）。**Pillow 未安装，尚未实施转换器，也未修改原始 Skill**。
- 验收与限制见 [docs/M3_DROP_FIRST_AND_LOCAL_CONVERTER_DESIGN_2026-10-14.md](docs/M3_DROP_FIRST_AND_LOCAL_CONVERTER_DESIGN_2026-10-14.md)。第三方 BrowserSkill 上传兼容仍需真实审批的测试闭环。


### M3.10 Drop-first 实际人工审批验收补充

2026-10-14 13:56 CST，用户在 Mac mini 逐命令批准首次原生 `--mode drop` 上传测试；独立 run `m3-favicon-drop-first-5848689a-b916-4f52-9a18-1ba8b77e471a`。会话/导航/控件观察正常、Dropzone 唯一且可见，上传获 APPROVED 但结果仍是 `COMMAND_TIMEOUT`、CLI 退出码 3、`effectState=unverified`。按安全契约未尝试第二次上传或下载；浏览器独立窗口已单独批准关闭成功，生产传输 `atomicFileTransferSupported=false` 不变。详见 [docs/M3_DROP_FIRST_AND_LOCAL_CONVERTER_DESIGN_2026-10-14.md](docs/M3_DROP_FIRST_AND_LOCAL_CONVERTER_DESIGN_2026-10-14.md)。


### M3.11 本地 favicon 转换器与 BrowserSkill 只读取证（2026-10-14）

已真实实施 `node scripts/m3-local-favicon.mjs prepare|inspect|approve|convert RUN_ID` 的独立本地转换器，前提是**存在合法 agent run 且用户明确审核真实 512×512 RGBA 图标及源 PNG SHA256**。Pillow 12.3.0 安装在 `agent/.venv-favicon/`；固定 wheel 哈希并保存在 `deps/m3-favicon-downloads/`，Mac ARM64 可运行 `zsh scripts/m3-install-favicon-deps.sh` 在专属 venv 离线安装。生成七文件 ZIP，`verify-favicon-package.py`、`m3-compare-favicon-pixels.py` 全部通过；重复运行不可覆盖、已审批图片篡改不能重用。输出有独立的 `LOCAL_FAVICON_CONVERSION_V1` 来源和哈希收据，但 **stageMayPass=false**、原始 Skill 未修改。参见 [docs/M3_LOCAL_FAVICON_CONVERTER_IMPLEMENTATION_2026-10-14.md](docs/M3_LOCAL_FAVICON_CONVERTER_IMPLEMENTATION_2026-10-14.md)。

BrowserSkill 分开只读取证，`node scripts/m3-bsk-transfer-audit.mjs RUN_ID1 RUN_ID2` 确认 bsk input 和 drop 两种模式的 PNG 宿主快照 SHA256 匹配，但均 CLI exit 3 / COMMAND_TIMEOUT / effect_state=unverified；**尚不能定位 Chrome extension/daemon RPC 具体故障点**。参见 [docs/M3_BSK_TRANSFER_READONLY_FORENSICS_2026-10-14.md](docs/M3_BSK_TRANSFER_READONLY_FORENSICS_2026-10-14.md)。

Mac mini 最终全量 `npm test`：**260 pass / 0 fail / 0 skip**，日志 `runs/m3-local-favicon-all-tests-2026-10-14.log`。生产 bsk 原子文件传输 `atomicFileTransferSupported=false`；原始 Skills、游戏站、飞书、GitHub/DNS 和部署均未修改。


### M3.12 首页 Skill 双路径转换规则已授权实施（2026-10-14）

用户明确批准 **仅对原始 `game-homepage-icon-research` Skill 的图标转换机制**增加双路径：
- `favicon.io` 在线/人工交接：需要浏览器逐命令批准或用户明确人工来源声明，不能冒充已修复 BrowserSkill 自动传输；
- `LOCAL_FAVICON_CONVERSION_V1`：用已批准的原创/有权使用的 512×512 PNG，经本地固定版本 Pillow 转换；可信宿主校验源图及用户版权/视觉确认、收据、ZIP SHA256、七成员 PNG/ICO/Manifest、512px 像素对应。缺失任一项不通过。

已调整原始 Skill 的 `SKILL.md`、`references/icon-workflow.md`、`scripts/validate_outputs.py`，并接入 Agent 的双路径互斥机制以及最新版 Skill 清单。旧 run 仍保留原 Skill hash，不会隐式升级。原始 Skill 保留完整首页调研、SEO、原创图标及人工视觉审核要求；**本地转换 ≠ 生成原创图片**，且图像工具来源仍需明确表述是否独立验证。新版本地转换需要用户对来源、使用权和文件 SHA256 的显式批准，旧的仅 SHA256 审核不足以激活本地路径。

本次 `npm test`：**265 pass、0 fail**；转换机制测试通过，但尚无真实游戏端到端首页研究 PASSED。生产 BrowserSkill 传输仍为 `atomicFileTransferSupported=false`。

详情：[docs/M3_HOMEPAGE_SKILL_DUAL_CONVERSION_ACCEPTANCE_2026-10-14.md](docs/M3_HOMEPAGE_SKILL_DUAL_CONVERSION_ACCEPTANCE_2026-10-14.md)。
