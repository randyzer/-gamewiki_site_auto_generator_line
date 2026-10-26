# 游戏攻略站生产总控

总控把用户提供的游戏身份和关键词依次交给七个 Skill，核验产物后再推进；第 7 阶段先生成部署计划，用户确认准确 digest 后才执行发布。主流程入口为 `run` / `retry`，实现见 [cli.mjs](src/cli.mjs)、[terminal-run.mjs](src/terminal-run.mjs) 和 [pipeline.mjs](src/pipeline.mjs)。

当前架构基线是[个人使用版架构与执行计划](docs/AGENT_PERSONAL_USE_ARCHITECTURE_AND_PLAN.md)：直接复用现有七阶段 Pipeline、真实 Skill 执行、产物验收和恢复能力，以真实游戏站到达可审查部署计划作为验收。企业级 Code Authority、签名和抗回滚体系不再是实际建站的前置条件；最近一次受控真实验收见[当前状态](docs/CURRENT_STATUS.md)。

Codex 整理输入，先用 `--preview` 展示完整摘要、Preview ID 与确认码，并保存不可变审批快照；用户在自己的消息中写出该码后，Codex 才能用 `run-confirm` / `retry-confirm` 读取快照、复验受保护状态并后台启动。CLI 也保留操作者在交互终端亲自输入单独小写 `y` 的流程；非交互 stdin（包括管道 `y`）仍会被拒绝。Codex 不得代输 `y`、模拟操作者终端或绕过确认。

## 首次准备

以下均在仓库的 `agent/` 目录操作。需要 Node.js ≥22.13、Python 3、可用且已登录的 Codex CLI；执行器默认使用 `codex`（可由 `CODEX_BIN` 指定），所需配置项必须被该版本支持。

```sh
npm ci
npx playwright install chromium
```

从环境变量提供 `SERPER_API_KEY`，不要写入输入、文档或对话；第 2 阶段默认依赖 `/opt/homebrew/bin/python3` 和 `/opt/homebrew/bin/yt-dlp`。已有的 `YTDLP_COOKIES_FILE` 可用于该阶段。部署前准备当前进程可调用、已完成授权的 gh、git、vercel；需要登录、OAuth 或 Google 账号操作时由用户处理，worker 等待。图标缩放使用 macOS 的 `/usr/bin/sips`。依据：[执行器](src/skill-executor.mjs)、[部署工具](src/deployment-tools.mjs)、[图标宿主](src/favicon-io-host.mjs)、[package.json](package.json)。

阶段 4–7 的 Git 固定入口默认为 `/opt/homebrew/bin/git`（可信宿主可通过 `createSkillExecutor({ workerGit })` 配置）。每次启动解析真实可执行文件、版本、helper 目录和 macOS 原生库依赖；把真实 Git 目录置于系统路径之前，只读授权必要路径，不写死 Cellar 版本。固定入口失败不会自动选择其他 Git；阶段 5/6 的 `audit-only` 仍可保留独立宿主检查证据，随后以 `GIT_STATE_UNKNOWN` 等待修复，不宣称仓库干净或同步完成。阶段 7 plan 不因环境自检增加 Python、gh/vercel、联网或生产写入权限。

只验证一个真实 worker 的 Git 能力可从仓库根目录运行：

```sh
node scripts/preflight-all-stages.mjs --stage 4 --probes P3,P9
```

该命令使用临时仓库及正式阶段权限，会调用一次真实模型；不带选择参数将探测全部七阶段。未选项目为 `N/A`，缺少完成证据为 `INCONCLUSIVE`；缺证与失败均返回非零。报告保存源码/工具身份及命令证据，不代表其他阶段、权限拒写或真实业务已经验证。

## 七阶段输入与产物

所有阶段都需要 `gameIdentity`、`objective` 和用户指定的 `paths.siteDirectory`，解析后用作 `projectPath`。完整权限、证据与验收器见[阶段矩阵](docs/SEVEN_STAGE_GATE_AND_EVIDENCE_MATRIX_V1.md)。

| 阶段 / Skill | 额外输入 | 必需产物 |
| --- | --- | --- |
| 1 `game-homepage-icon-research` | 已确认的游戏元数据（如 `gameMetadata`）；worker 提出公开来源 URL 请求 | `HOMEPAGE_RESEARCH.md`、`ICON.zip` |
| 2 `game-innerpage-keyword-information-research` | `rawKeywordsFile`；可选 `keywordSourceLineageFile` | `keywords.json`、`关键词处理记录.md`、`关键词素材汇总.md`、派生 `KEYWORD_MATERIALS.md` 及逐词素材 |
| 3 `game-site-template-selector` | 总控固定的模板快照；目标目录须为空 | `TEMPLATE_SELECTION_REPORT.md`、`template-copy-manifest.json`、`TEMPLATE_RESIDUE_SCAN.json` |
| 4 `game-site-content-integrator` | 上游研究/模板；`canonicalRequired`，为 true 时需 `canonicalOrigin` | `CONTENT_INTEGRATION_REPORT.md`、`CONTENT_PAGE_MANIFEST.json`、`CONTENT_PROVENANCE.md`、`CONTENT_GAPS.md` |
| 5 `game-site-ui-ux-audit-optimizer` | 内容清单、`siteRevision`；主线用 `uiMode: "audit-only"` | `UI_UX_AUDIT_REPORT.md`、`UI_UX_AUDIT.json`、`UI_UX_OPTIMIZATION_PLAN.md` |
| 6 `game-site-prelaunch-gate` | 上游验收、`domain`、生产预览 | `PRELAUNCH_ACCEPTANCE_REPORT.md`、`PRELAUNCH_ACCEPTANCE.json`、`REPAIR_MANIFEST.md` |
| 7 `game-site-deploy-and-measurement` | `repo`、`branch`、`dns`、`deploymentPlanAuthorized: true`；执行还需计划批准 | `DEPLOYMENT_PLAN.md/json`；执行轮另出 `DEPLOYMENT_REPORT.md/json` |

## 准备 inputs.json

字段白名单见 [stages.mjs](src/stages.mjs)，必填/条件规则见 [pipeline.mjs](src/pipeline.mjs) 的 `missingInputs`。下面是完整的新站输入结构示例，所有示例值均须替换为用户确认的事实；路径值是占位数据，不代表仓库已有文件，不可直接启动。

```json
{
  "mode": "new-site",
  "gameIdentity": "用户确认的准确游戏名",
  "objective": "用户确认的平台、版本、语言及攻略站目标",
  "gameMetadata": {},
  "paths": {
    "siteDirectory": "/Users/randyz/work/coding/hot_words_web/gameweb/game_WallpaperEngine",
    "researchDirectory": "/Users/randyz/work/coding/hot_words_web/gameweb/game_WallpaperEngine/backgroundinformation",
    "rawKeywordsFile": "/Users/randyz/work/coding/hot_words_web/gameweb/game_WallpaperEngine/backgroundinformation/keyword-materials/关键词.md"
  },
  "canonicalRequired": true,
  "canonicalOrigin": "https://guides.example.com",
  "uiMode": "audit-only",
  "siteRevision": "user-confirmed-v1",
  "domain": "guides.example.com",
  "deploymentProvider": "vercel",
  "repo": "用户确认的owner/repository",
  "branch": "main",
  "dns": { "provider": "用户确认的DNS服务商", "recordsReviewed": true },
  "deploymentPlanAuthorized": true,
  "adsEnabled": false
}
```

`projectPath` 不填，由 `paths.siteDirectory` 直接得到；网站就建在这个目录，不自动增加 site/。paths 只接受 siteDirectory、researchDirectory、rawKeywordsFile 三个绝对路径；不支持 projectRoot 或任何占位符。填了相对路径、projectRoot 或占位符时，错误会包含该值。顶层 rawKeywordsFile 在 paths 内未填写时仍兼容。不要添加 schemaVersion、密钥或白名单外字段。

researchDirectory 最后一层必须准确命名为 backgroundinformation，这是首页 Skill validate_outputs.py:49 的要求。research 可以位于 site 内；site 不得位于 research 内，也不得与 agent/、codex-skills/、.template-cache/、runs/ 或模板来源双向重叠；路径不得经过符号链接。新 run 的 site 必须不存在，或仅包含指定 research（含通往嵌套 research 的目录）及 .DS_Store；其他条目会列出最多 10 项并拒绝。

第 1、2 阶段在 research 发布首页、图标和 keyword-materials/ 产物；同名同内容复用，异内容拒绝覆盖。关键词与 lineage 原件保持不变，worker 读取 run 内只读副本。第 3 阶段 worker 只在 run/template-copy/ 中复制模板和写报告，对 site 和 research 只读。宿主检查所有冲突后将模板合并到 site：已有文件一律拒绝，已有同名目录可复用，模板不得写 backgroundinformation 或 research；复制核对 SHA256 和文件权限，仅改写 docs/template-copy-manifest.json 的 destination 字段。

run/TEMPLATE_MERGE_RECEIPT.json 记录来源、目标、文件数、前后哈希及每个已写入或尝试写入的路径。仅在合并成功后删除临时 site；中途失败保留临时目录与回执，不自动回滚、不删除用户文件。stage 4 的报告与交接直接使用 site；research 已经在 site/backgroundinformation 时复用原位置。worker 仅 stage 1/2 可写 research，stage 4 和已批准部署 execute 可写 site；其余阶段只读 site，审计报告由宿主发布。

manifest 记录 paths；retry 修改路径会触发现有输入变化失效逻辑，不自动清理站点或覆盖冲突。旧 manifest（无 paths，或保留 projectRoot 与 site 子目录）仍按记录路径恢复；新输入不能再引入 projectRoot。

`canonicalRequired` 必须为布尔值；为 false 时可不填 `canonicalOrigin`，否则需无尾斜杠、无凭据的 HTTPS origin。`uiMode` 可省略（默认只审计），`siteRevision` 不能省略。第 6/7 阶段需要合法域名；第 7 阶段需要已复核 DNS 和计划授权。`deploymentProvider` 是允许输入，但不在 `missingInputs` 的必填检查中；具体能力仍由部署 Skill 判断。

## 启动与恢复

阶段 2 支持显式复用失败进度。先在没有运行中 worker 的情况下保存**当前停止的 attempt**：

```sh
node scripts/keyword-recovery.mjs runs/wallpaper-engine-002 5
```

该命令取得既有运行锁，只创建新的宿主快照，不改历史 manifest、原始关键词或 Skill，不执行旧脚本。返回的 `manifestPath`、`sha256`、`files` 三个字段整体放入 retry 输入的 `keywordRecovery`。`files` 是明确选中的相对路径清单，可缩减，不能为空或指向清单外文件。没有这个输入时不会扫描或自动复用旧 attempt。

宿主重新计算数据文件哈希，绑定 run、游戏、源 attempt、原始关键词、可选 lineage 和 Skill。快照文件只读且创建后不覆盖；新 worker 只能读取选中文件，宿主将它们复制进新 attempt。每次使用前重新验证全部快照文件。哈希验证仅证明快照未变，不证明来源真实、事实新鲜或内容完整；`PARTIAL/BLOCKED` 不会自动成为正式 artifacts 或 `PASSED`。

阶段 2 的恢复决策和两个可选配置如下，修改它们会改变确认码，并从阶段 2 重新执行：

```json
{
  "keywordRecoveryDecision": { "mode": "recover" },
  "keywordResearchBudget": { "timeoutMs": 1800000, "handoffMarginMs": 180000 },
  "keywordServiceStops": ["youtube-subtitles", "steam-community"],
  "keywordServiceResumes": []
}
```

阶段 2 默认硬上限 30 分钟，其他阶段保留 10 分钟。可信宿主显式传入的 `timeoutMs` 仍是所有阶段的上限，任务输入不能提高它；环境自检现有的 5 分钟限制因此保持有效。可配置硬上限为 1–60 分钟；收尾提示余量为 30 秒–5 分钟且须小于硬上限。余量用于提示 worker 提前停止新调研、验证和返回结构化结果，属于协作约定，不能保证模型一定及时收尾。硬超时仍为 `FAILED/WORKER_TIMEOUT`，宿主在进程组终止后保存快照引用到该 attempt 的 `keyword-recovery.json`。保存失败会明确报告，不改写历史数据，也不掩盖原超时。

`keywordServiceStops` 是所有关键词共享的继续暂停项，`keywordServiceResumes` 是操作者明确批准恢复的项目。若选中的恢复快照含 `SERVICE_BLOCKERS.json`，宿主会从中提取已知的 YouTube 字幕和 Steam Community 429；当前输入文件必须同时显式提供两个数组，并把每个历史受限服务恰好放入其中一个，否则预览不会生成确认码。暂停字幕时固定 yt-dlp 入口会拒绝字幕参数，仍允许元数据查询。Steam 社区暂停以及新发现的 429 由 worker 的共享阻断记录和指令执行，当前不构成按域名的网络防火墙。禁止自动退避重试、换工具、增加登录或将元数据当作字幕；任何恢复决定都会改变确认码。暂停不意味着限流已解除。

`recover` 还必须提供 `keywordEvidencePlan`，防止只复核旧文件、没有增量任务的空转重试。该字段引用一份只读 JSON 文件：

```json
{
  "keywordEvidencePlan": {
    "path": "/absolute/path/to/KEYWORD_EVIDENCE_PLAN.json",
    "sha256": "64位文件SHA256"
  }
}
```

计划文件采用 `KEYWORD_EVIDENCE_PLAN_V2`，绑定 `runId`、Stage 2、所选恢复快照 SHA256、`serviceStops` 和 `serviceResumes`。V1 会被明确拒绝，必须重新生成并审核计划。`tasks` 不能为空；每项除最终关键词、原始行号、具体事实缺口、允许的工具、查询或 HTTPS 目标、预期证据外，还必须声明验收条件、停止条件、来源要求、失败后的处置和预期素材状态变化。允许工具仅为 `serper`、`public-page`、YouTube 搜索/元数据/字幕和 Steam Community；计划不能调度仍处于暂停状态的服务。`pendingRows` 保留歧义词的原词和决定，`PENDING`/`EXCLUDE` 行不能进入证据任务。示例：

```json
{
  "kind": "KEYWORD_EVIDENCE_PLAN_V2",
  "runId": "RUN_ID",
  "stage": "game-innerpage-keyword-information-research",
  "recoverySha256": "恢复快照的64位SHA256",
  "serviceStops": ["youtube-subtitles", "steam-community"],
  "serviceResumes": [],
  "tasks": [{
    "keyword": "Game latest version",
    "rawRows": [91],
    "gap": "当前版本号和发布日期缺少官方正文",
    "tool": "serper",
    "target": "site:official.example release notes current version",
    "expectedEvidence": "能够直接支持版本号和发布日期的官方页面正文",
    "acceptanceCriteria": ["官方正文同时给出当前稳定版号和发布日期"],
    "stopConditions": ["OFFICIAL_SOURCE_UNAVAILABLE", "SERVICE_SUSPENDED"],
    "sourceRequirements": {
      "allowedSourceTypes": ["FIRST_PARTY"],
      "requiresBody": true,
      "requiresCurrentAccess": true
    },
    "fallbackDisposition": "KEEP_PARTIAL",
    "expectedStatusTransition": { "from": "PARTIAL", "to": "COMPLETED" }
  }],
  "pendingRows": [{
    "row": 36,
    "rawKeyword": "ambiguous raw keyword",
    "decision": "PENDING",
    "targetKeyword": null
  }]
}
```

预览会显示计划 SHA256、任务数、每项预期证据和歧义词决定。计划文件、恢复快照或服务决定变化后，原确认码和执行凭据失效。Pipeline 和 Worker 启动入口会再次校验同一文件，并以恢复快照中的 `RAW_LINEAGE.json` 和 `keywords.json` 核对任务关键词、原始行归属及完整的待确认行；缺少计划、空计划、直接或间接依赖暂停服务、遗漏/改写待确认行或编造行归属时，不启动 Worker。

恢复 worker 必须写 `KEYWORD_EVIDENCE_CLAIMS_V2.json`，逐项引用本轮改变的 `evidence/` 文件、HTTPS 来源、文件 SHA256、访问结果、来源类型、所支持的验收条件以及对应素材文件。该文件只是 worker 声明。worker 停止后，宿主重新读取实际文件和素材状态，生成只读的 `KEYWORD_EVIDENCE_OUTCOME_V2.json`，结果只会是 `NEW_FILES`、`NEW_VERIFIED_EVIDENCE`、`GAP_RESOLVED`、`STATUS_CHANGED`、`NO_PROGRESS` 或 `PLAN_EXHAUSTED`。文件哈希变化本身最多是 `NEW_FILES`；只有来自 worker 写权限边界之外、与文件路径、URL、哈希、访问结果、来源类型和支持事实完全匹配的宿主访问记录，才能升级为已验证证据。每个被删除的历史缺口也必须由单独的可信任务覆盖，worker 不能通过重写素材文件一并清空其他缺口。停止条件同样需要匹配的宿主执行或服务阻断记录，自报停止原因只会保留为 `NO_PROGRESS`。`SERVICE_BLOCKERS.json` 始终只算诊断变化。

`PLAN_EXHAUSTED` 会绑定恢复快照、计划策略、服务决定和素材缺口状态，并随下一份恢复快照强制携带。完全相同的缺口、服务决定和任务策略不能再次执行；必须提交一份经过审核、实际改变任务策略的新 V2 计划。以上分类不会把 `PARTIAL` 自动改成 `PASSED`，也不会降低 `COMPLETED` 或正式 artifacts 的验收门槛。

存在上一 attempt 的 `keyword-recovery.json` 时，Stage 2 retry 必须显式设置 `keywordRecoveryDecision`。`{"mode":"recover"}` 必须同时提供 `keywordRecovery`；`{"mode":"fresh"}` 必须移除或置空 `keywordRecovery`。预览与确认会生成宿主执行凭据，绑定输入文件 SHA256、恢复选择、预算、暂停项、恢复授权、当时的 manifest 与确认码；缺失或变化会在 worker 启动前拒绝执行。历史 receipt 与 attempt 只保留审计用途，不会被新决定改写。

worker 每处理 3–5 个意图应保存进度文件；当前宿主只在 worker 停止后创建一致快照，不承诺运行期间定时捕获。快照排除脚本、HTML、日志、隐藏文件及 worker 自报的完整性清单。原始目录仍保留这些文件，宿主不执行它们。

用户确认完整输入后，Codex 先执行预览，将**完整摘要**、`Preview ID: <ID>` 及 `Confirmation code: <码>` 原样展示给用户：

```sh
node src/cli.mjs run inputs.json RUN_ID --preview
# 已有 manifest 的恢复操作，每次都先重新预览
node src/cli.mjs retry inputs.json RUN_ID --preview
```

预览退出码为 0，不创建正式 manifest、不调用 Skill、不启动执行器、不联网。它把准确输入、Evidence Plan、摘要和当时的 manifest 摘要保存到 `runs/.preview-approvals/<RUN_ID>/<PREVIEW_ID>/`。确认码是 `sha256(命令类型 + RUN_ID + 摘要全文 + 规范化inputs.json)` 的前 16 位小写十六进制；JSON 对象各层键名排序后紧凑序列化，数组顺序保留，空白与字段顺序不影响码。任何输入字段（包括摘要未显示的 objective、domain、repo）、RUN_ID、命令或摘要变化都会改变码。

**只有用户在自己的消息里写出了本轮预览的确认码，Codex 才可以带该码确认对应 Preview ID。** Codex 不得自行抄用预览中的码来启动、计算或猜测确认码，不得复用过期的码，不得替用户编写确认内容，也不能把普通“同意”代换为确认码。确认不匹配时拒绝启动；应重新预览并等待用户回复，不能自动改用错误中的当前码。历史上没有审批快照的确认码不能升级为快照授权。

收到用户消息中的码后，以 agent 为 cwd 在后台启动；以下 `USER_PROVIDED_CODE` 只能替换为用户本轮亲自提供的码，`RUN_ID` 替换为已核对的运行 ID：

```sh
nohup node src/cli.mjs run-confirm PREVIEW_ID RUN_ID USER_PROVIDED_CODE > runs/RUN_ID.run.log 2>&1 < /dev/null &
# retry 使用同样的后台方式，但必须先取得本轮用户给出的确认码
nohup node src/cli.mjs retry-confirm PREVIEW_ID RUN_ID USER_PROVIDED_CODE > runs/RUN_ID.run.log 2>&1 < /dev/null &
```

日志位于 `agent/runs/<RUN_ID>.run.log`（runs/ 已被 .gitignore 忽略），成功校验后记录 `Confirmation method: preview-snapshot`。原 inputs.json 或 Evidence Plan 在预览后消失不影响确认；Manifest、Recovery、关键词 lineage、服务决策或其他受保护状态变化仍会使快照失效。快照有效期为 24 小时且只能消费一次；过期后必须重新预览并取得用户提供的新 Preview ID 与确认码。Codex 定期轮询 `agent/runs/<RUN_ID>/manifest.json`，结合日志与报告汇报进度，不要阻塞在一条长命令上。启动初期 manifest 可能尚未生成，先查看日志诊断。每次 retry 都必须重新预览并要求用户在本轮消息提供确认码；相同输入的码具有确定性，即使字符串相同也不得沿用旧的确认消息。没有 `--yes` 或环境变量绕过开关。旧的 `run/retry ... --confirm CODE` 仅保留兼容，不用于新的跨回合执行。

用户也可自行运行不带参数的 `run inputs.json RUN_ID` 或 `retry inputs.json RUN_ID`，查看摘要后在交互终端亲自输入 `y`。

`RUN_ID` 为 1–100 位英文字母、数字、下划线或连字符；`run` 拒绝已有 manifest，`retry` 要求已有 manifest。重试会合并输入变化并使受影响阶段及下游重新验收；旧尝试保留在历史中。身份、目标和站点路径在执行后锁定，需变更时创建新 run。同路径关键词字节变化也会触发重验。改动关键词后模板阶段也会失效，已有目标不为空时会阻断，须先人工核对。

运行后生成 `agent/runs/RUN_ID/manifest.json` 和同目录 `AGENT_RUN_REPORT.md`（运行时产物，运行前不存在）；Codex 可据此汇报阶段、缺项、诊断与产物，不能把计划或退出码当作部署成功。CLI 对 `WAITING_FOR_USER` / `BLOCKED` 返回退出码 2；其他状态仍须读 JSON。

## 第 7 阶段批准部署计划

先查看运行时站点目录中的 `docs/DEPLOYMENT_PLAN.md` 和 `docs/DEPLOYMENT_PLAN.json`，核对仓库、分支、文件、托管、DNS、Google 服务、成本及回滚。首次计划通过后停在 `WAITING_FOR_USER`，缺项为 `deploymentPlanApproval`。从 CLI 的 `plan_digest` 或 manifest 对应阶段的 `checkpoint.planDigest` 读取准确摘要，不能自行拼接。

只向原 inputs.json 增加下面字段，其他值保持不变（不要用仅含此字段的 JSON 替代原输入）：

```json
"deploymentPlanApproval": { "approved": true, "digest": "本轮计划的64位SHA256摘要" }
```

用户确认计划并添加该字段后，Codex 重新执行 `retry ... --preview`，展示包含 `DEPLOY TO PRODUCTION` 的完整摘要、新 Preview ID 和确认码。该字段会改变确认码，添加前的码不能批准部署。只有用户在自己的消息里写出此码后，才能按上述后台方式执行 `retry-confirm PREVIEW_ID RUN_ID CODE`。这次确认允许同一阶段按批准计划执行 push、部署、DNS、GSC/GA4；计划内容、上游或源码变化会阻断或使批准失效。需要账号交互或执行范围变化时停止等待，不能绕过。交互终端流程仍允许用户自行核对部署摘要后亲自输入 `y`。

`deploymentExecuted` 在执行 worker 启动前就置 true，失败时也可能保持 true，仅表示已进入可能产生外部副作用的阶段。成功还要核对阶段状态和部署报告：原生校验要求 `PRODUCTION LIVE` 及匹配域名；GSC 提交不等于已收录，GA4 标签不等于已有数据。依据：[pipeline](src/pipeline.mjs)、[产物校验](src/artifact-validator.mjs)。

## 锁版与宿主职责

[skill-lock.mjs](src/skill-lock.mjs) 校验 [Skill 清单](config/skill-manifest.json) 中的 git 树哈希和文件 SHA256；`codex-skills/` 有未提交变化或树不匹配就拒绝执行，Codex 不得改该目录或重锁掩盖漂移。[模板快照](src/template-snapshot.mjs) 按[配置](config/workflow.json)固定 GitHub `main` 的 `template` 子树，缓存于仓库 `.template-cache/<commit>`，retry 复用 manifest 记录的 commit。

Skill 清单仅包含 `skillRoot`、`sourceTree` 和 `skills`，不记录仓库 HEAD。只提交总控代码后重新生成清单，文件字节保持不变，已锁定运行可继续；Skill 内容变更仍会触发锁校验失败。

worker 使用文件权限沙箱，命令网络只在第 2 阶段和第 7 阶段执行轮开放；模型认证与命令网络边界分开。真实浏览器由总控在 worker 沙箱外调用：首页公开网页代抓、favicon.io 转换、UI 审计和全站巡检；依赖安装/生产预览也由宿主运行。证据逐文件 SHA256 复核。第 1 阶段 worker 另有图像生成权限，第 5/6 阶段可看截图、写报告。optimize 当前直接 BLOCKED。

## 验证范围

- 自动化可复验：[终端确认](tests/terminal-run.test.mjs)、[Skill 锁](tests/skill-lock.test.mjs)、[模板固定](tests/template-snapshot.test.mjs)、[部署双轮](tests/deployment-execution.test.mjs)、[权限](tests/worker-permissions.test.mjs)、[UI 宿主](tests/site-audit-host.test.mjs)、[巡检宿主](tests/prelaunch-host.test.mjs)。这些测试仍不能单独代替真实运行结论。
- `wallpaper-engine-002` 已完成受控真实验证：Stage 1、3–6 为 `PASSED`，Stage 2 以保留限制的 `PARTIAL` handoff 推进，Stage 7 已生成并登记部署计划后停在 `WAITING_FOR_USER`。完整身份和边界见[当前状态](docs/CURRENT_STATUS.md)。
- 尚未验证且未获授权：真实 push、生产部署、DNS 修改、GSC/GA4 操作。计划生成成功不代表网站已具备上线条件。
- Legacy、冻结 V2 方案和历史验收记录见[文档索引](docs/README.md)的归档说明。

## 已冻结范围

G0 审批/隔离探测/bsk、`entry-*` 草稿流程、`m3-*`、飞书和已有项目模式保留代码，不列入当前新站主线。可选广告阶段仍在阶段定义中，`adsEnabled: false` 时跳过；启用也仅出方案，停在外部广告实现与验收门。冻结不代表已删除旧 CLI 或代码分支。
