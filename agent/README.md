# 游戏攻略站生产总控

总控把用户提供的游戏身份和关键词依次交给七个 Skill，核验产物后再推进；第 7 阶段先生成部署计划，用户确认准确 digest 后才执行发布。主流程入口为 `run` / `retry`，实现见 [cli.mjs](src/cli.mjs)、[terminal-run.mjs](src/terminal-run.mjs) 和 [pipeline.mjs](src/pipeline.mjs)。

Codex 整理输入、展示给用户确认并读取报告；操作者在自己的交互终端启动。CLI 打印游戏、关键词 SHA256、Skill 树、模板来源和阶段摘要，只接受单独的小写 `y`；非交互 stdin（包括管道）会被拒绝。Codex 不得代输 `y`、模拟操作者终端或绕过确认。

## 首次准备

以下均在仓库的 `agent/` 目录操作。需要 Node.js ≥22.13、Python 3、可用且已登录的 Codex CLI；执行器默认使用 `codex`（可由 `CODEX_BIN` 指定），所需配置项必须被该版本支持。

```sh
npm ci
npx playwright install chromium
```

从环境变量提供 `SERPER_API_KEY`，不要写入输入、文档或对话；第 2 阶段默认依赖 `/opt/homebrew/bin/python3` 和 `/opt/homebrew/bin/yt-dlp`。已有的 `YTDLP_COOKIES_FILE` 可用于该阶段。部署前准备当前进程可调用、已完成授权的 gh、git、vercel；需要登录、OAuth 或 Google 账号操作时由用户处理，worker 等待。图标缩放使用 macOS 的 `/usr/bin/sips`。依据：[执行器](src/skill-executor.mjs)、[部署工具](src/deployment-tools.mjs)、[图标宿主](src/favicon-io-host.mjs)、[package.json](package.json)。

## 七阶段输入与产物

所有阶段都需要 `gameIdentity`、`objective` 和总控分配的 `projectPath`；后者固定为 `agent/workspaces/RUN_ID/site`。完整权限、证据与验收器见[阶段矩阵](docs/SEVEN_STAGE_GATE_AND_EVIDENCE_MATRIX_V1.md)。

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
  "rawKeywordsFile": "/用户确认的绝对路径/原始关键词.md",
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

`projectPath` 不填，由总控分配；不要添加 `schemaVersion`、密钥或不在白名单里的字段。`rawKeywordsFile` 必须为实际存在、非空的绝对路径 Markdown 原件，不得编造关键词或修改原件。注意：权限代码只为位于本轮 run 内的原始关键词/lineage 文件显式添加读取授权；外部文件虽可通过宿主输入检查，worker 可读性仍需真实运行验证（见[路线图](docs/MASTER_AGENT_EXECUTION_ROADMAP_V1.md)）。

`canonicalRequired` 必须为布尔值；为 false 时可不填 `canonicalOrigin`，否则需无尾斜杠、无凭据的 HTTPS origin。`uiMode` 可省略（默认只审计），`siteRevision` 不能省略。第 6/7 阶段需要合法域名；第 7 阶段需要已复核 DNS 和计划授权。`deploymentProvider` 是允许输入，但不在 `missingInputs` 的必填检查中；具体能力仍由部署 Skill 判断。

## 启动与恢复

用户确认输入后，由用户在交互终端执行，查看摘要并亲自输入 `y`：

```sh
node src/cli.mjs run inputs.json RUN_ID
node src/cli.mjs retry inputs.json RUN_ID
```

`RUN_ID` 为 1–100 位英文字母、数字、下划线或连字符；`run` 拒绝已有 manifest，`retry` 要求已有 manifest。重试会合并输入变化并使受影响阶段及下游重新验收；旧尝试保留在历史中。身份、目标和站点路径在执行后锁定，需变更时创建新 run。同路径关键词字节变化也会触发重验。改动关键词后模板阶段也会失效，已有目标不为空时会阻断，须先人工核对。

运行后生成 `agent/runs/RUN_ID/manifest.json` 和同目录 `AGENT_RUN_REPORT.md`（运行时产物，运行前不存在）；Codex 可据此汇报阶段、缺项、诊断与产物，不能把计划或退出码当作部署成功。CLI 对 `WAITING_FOR_USER` / `BLOCKED` 返回退出码 2；其他状态仍须读 JSON。

## 第 7 阶段批准部署计划

先查看运行时站点目录中的 `docs/DEPLOYMENT_PLAN.md` 和 `docs/DEPLOYMENT_PLAN.json`，核对仓库、分支、文件、托管、DNS、Google 服务、成本及回滚。首次计划通过后停在 `WAITING_FOR_USER`，缺项为 `deploymentPlanApproval`。从 CLI 的 `plan_digest` 或 manifest 对应阶段的 `checkpoint.planDigest` 读取准确摘要，不能自行拼接。

只向原 inputs.json 增加下面字段，其他值保持不变（不要用仅含此字段的 JSON 替代原输入）：

```json
"deploymentPlanApproval": { "approved": true, "digest": "本轮计划的64位SHA256摘要" }
```

用户确认计划后再次执行上面的 `retry`，核对终端的 `DEPLOY TO PRODUCTION` 摘要并亲自输入 `y`。这次确认允许同一阶段按批准计划执行 push、部署、DNS、GSC/GA4；计划内容、上游或源码变化会阻断或使批准失效。需要账号交互或执行范围变化时停止等待，不能绕过。

`deploymentExecuted` 在执行 worker 启动前就置 true，失败时也可能保持 true，仅表示已进入可能产生外部副作用的阶段。成功还要核对阶段状态和部署报告：原生校验要求 `PRODUCTION LIVE` 及匹配域名；GSC 提交不等于已收录，GA4 标签不等于已有数据。依据：[pipeline](src/pipeline.mjs)、[产物校验](src/artifact-validator.mjs)。

## 锁版与宿主职责

[skill-lock.mjs](src/skill-lock.mjs) 校验 [Skill 清单](config/skill-manifest.json) 中的 git 树哈希和文件 SHA256；`codex-skills/` 有未提交变化或树不匹配就拒绝执行，Codex 不得改该目录或重锁掩盖漂移。[模板快照](src/template-snapshot.mjs) 按[配置](config/workflow.json)固定 GitHub `main` 的 `template` 子树，缓存于仓库 `.template-cache/<commit>`，retry 复用 manifest 记录的 commit。

worker 使用文件权限沙箱，命令网络只在第 2 阶段和第 7 阶段执行轮开放；模型认证与命令网络边界分开。真实浏览器由总控在 worker 沙箱外调用：首页公开网页代抓、favicon.io 转换、UI 审计和全站巡检；依赖安装/生产预览也由宿主运行。证据逐文件 SHA256 复核。第 1 阶段 worker 另有图像生成权限，第 5/6 阶段可看截图、写报告。optimize 当前直接 BLOCKED。

## 验证范围

- 自动化可复验：[终端确认](tests/terminal-run.test.mjs)、[Skill 锁](tests/skill-lock.test.mjs)、[模板固定](tests/template-snapshot.test.mjs)、[部署双轮](tests/deployment-execution.test.mjs)、[权限](tests/worker-permissions.test.mjs)、[UI 宿主](tests/site-audit-host.test.mjs)、[巡检宿主](tests/prelaunch-host.test.mjs)。终端流、worker、浏览器、安装及部署多处使用替身；这些集成部分均为**未经真实运行验证**。
- 未验证：当前主线的真实 Codex worker 七阶段端到端、真实公开来源/图像/favicon 交接、真实依赖安装与站点 UI/全站巡检，以及真实 push、部署、DNS、GSC/GA4。历史局部实测不能替代当前主线验收。
- 验证与后续工作见[路线图](docs/MASTER_AGENT_EXECUTION_ROADMAP_V1.md)；历史记录见[文档索引](docs/README.md)。

## 已冻结范围

G0 审批/隔离探测/bsk、`entry-*` 草稿流程、`m3-*`、飞书和已有项目模式保留代码，不列入当前新站主线。可选广告阶段仍在阶段定义中，`adsEnabled: false` 时跳过；启用也仅出方案，停在外部广告实现与验收门。冻结不代表已删除旧 CLI 或代码分支。
