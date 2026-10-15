---
name: game_site_orchestrator
description: "Prepare inputs, preview the existing CLI, obtain the user's confirmation code, start in the background, and report progress from evidence."
---

# Codex 游戏站总控入口适配说明

工作根目录为 `/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent`。本 Skill 负责整理输入和汇报，业务实现使用既有 CLI / orchestrator / pipeline，不在提示词中复制状态机，不手动逐个调用 Skill 绕过总控。

先阅读 [README](../../../README.md)、[路线图](../../../docs/MASTER_AGENT_EXECUTION_ROADMAP_V1.md)、[阶段矩阵](../../../docs/SEVEN_STAGE_GATE_AND_EVIDENCE_MATRIX_V1.md)，核对 [CLI](../../../src/cli.mjs)、[终端门](../../../src/terminal-run.mjs)、[阶段字段](../../../src/stages.mjs) 和 [pipeline](../../../src/pipeline.mjs) 的 missingInputs。链接均相对本文件；后续命令以 agent 根目录为 cwd。

## 整理输入和启动

1. 只根据用户确认的事实整理 inputs.json：准确游戏身份、平台/版本/语言与目标、站点目录、调研目录、原始关键词 Markdown 路径、canonical、siteRevision、域名、仓库/分支、DNS 与部署计划授权。按 README 给出完整 JSON，并列出缺项和条件项；不要猜 Steam App ID、关键词、域名、路径或批准。projectPath 来自 paths.siteDirectory，新 run 未指定时拒绝启动。
2. 给用户查看输入、文件范围和将调用真实 worker 的操作，请用户确认。密钥不进入输入文件或对话；SERPER_API_KEY 由用户通过环境变量提供。不得索取或输出 token、密码、cookie、凭据文件内容。
3. 用户确认完整输入后，Codex 在上述 agent 根目录执行预览：

   ```sh
   node src/cli.mjs run inputs.json RUN_ID --preview
   ```

   把**完整摘要与 Confirmation code 行**展示给用户。预览退出码为 0，不创建 run 目录、不调用 Skill、不联网。码绑定命令、RUN_ID、摘要全文和递归按键名排序后的完整 inputs.json；空白与对象字段顺序不影响码。只有用户在自己的消息中写出本轮码，Codex 才能用该码执行 --confirm。不得自行抄用预览中的码来启动、计算或猜码，不得复用过期的码，不得替用户编写确认内容；普通“同意”不能代替码。错误中的当前应有码也不能自动拿来启动，必须重新预览并等待用户回复。
4. 收到用户亲自提供的码后后台运行（USER_PROVIDED_CODE 仅替换为用户消息中的码）：

   ```sh
   nohup node src/cli.mjs run inputs.json RUN_ID --confirm USER_PROVIDED_CODE > runs/RUN_ID.run.log 2>&1 < /dev/null &
   ```

   输出重定向到 `agent/runs/<RUN_ID>.run.log`，runs/ 已被 .gitignore 忽略。确认校验通过会输出 `Confirmation method: confirmation-code`。Codex 通过定期轮询 manifest.json 并读取日志/报告汇报进度，不要阻塞在一条长命令上；manifest 尚未生成时先查看日志。
5. 恢复同一 run 时先据记录说明缺项、失败环节及输入变化，展示更新后的完整 JSON；每次 retry 都重新预览，要求用户在本轮消息给出确认码，然后才后台启动：

   ```sh
   node src/cli.mjs retry inputs.json RUN_ID --preview
   # 展示完整摘要并等待用户在自己的消息中写出码，再执行：
   nohup node src/cli.mjs retry inputs.json RUN_ID --confirm USER_PROVIDED_CODE > runs/RUN_ID.run.log 2>&1 < /dev/null &
   ```

   同输入的码具有确定性，即使码字符串相同也不能沿用以前的确认消息。RUN_ID 必须符合 `[a-zA-Z0-9_-]{1,100}`。inputs.json 是用户确认后准备的运行时文件，非仓库预置文件。run 要求新 manifest，retry 要求已有 manifest；retry 会重验受影响阶段，不保证自动清理已有站点或覆盖冲突。

不带 --confirm 时仍要求交互终端加单独小写 y，管道输入 y 仍被拒绝。用户可自行使用该原有流程；Codex 不得代输 y、模拟操作者 TTY 或改代码绕过确认。--preview 与 --confirm 互斥；不支持 --yes 或环境变量绕过。

不要先走 entry-preview/create/update 草稿或可信宿主票据流程；这些代码已冻结。已有项目、飞书、G0/bsk/m3 不属于当前新站主线。不得修改 `codex-skills/`、模板来源、凭据或全局 Codex 配置。仅做文档/检查不授权真实建站或生产操作。

inputs.json 的路径部分示例（其他字段见 README，示例须替换为用户确认的值）：

```json
"paths": {
  "siteDirectory": "/Users/randyz/work/coding/hot_words_web/gameweb/game_WallpaperEngine",
  "researchDirectory": "/Users/randyz/work/coding/hot_words_web/gameweb/game_WallpaperEngine/backgroundinformation",
  "rawKeywordsFile": "/Users/randyz/work/coding/hot_words_web/gameweb/game_WallpaperEngine/backgroundinformation/keyword-materials/关键词.md"
}
```

paths 只接受上述三个绝对路径，不支持 projectRoot 或任何占位符；siteDirectory 填什么，网站就建在哪里，不追加 site/。research 最后一层必须叫 backgroundinformation（首页 Skill validate_outputs.py:49 要求）。允许 research 位于 site 内，反向嵌套拒绝；不得与 agent/、codex-skills/、.template-cache/、runs/、模板来源重叠，不得经过符号链接。新 site 须不存在或仅包含指定 research 及 .DS_Store；其他条目列出最多 10 项后拒绝。顶层 rawKeywordsFile 仍兼容。旧 manifest（无 paths 或含 projectRoot/site 子目录）按记录路径恢复。

stage 3 worker 只写 run/template-copy/ 与原生输出区，对 site/research 只读；copy_template.py 的目标为 run/template-copy/site。宿主预检全部冲突，再核验哈希、保留文件权限逐个合并到 site，已有文件拒绝、目录可复用；模板不得写 backgroundinformation 或 research。仅将模板 manifest.destination 改为 site，其他字段原样保留。run/TEMPLATE_MERGE_RECEIPT.json 记录前后哈希、文件数与已写入或尝试的路径；失败保留临时目录与回执，不回滚、不删除用户文件，成功才删除临时 site。stage 4 交接直接使用 site；research 在 site/backgroundinformation 时复用原位置。worker 仅 stage 1/2 可写 research，stage 4 和部署 execute 可写 site，其余只读。

## 读取进度和部署确认

可读取运行时 `agent/runs/RUN_ID/manifest.json` 与同目录 `AGENT_RUN_REPORT.md`，以 manifest、实际产物和诊断为依据汇报 run_id、当前阶段/状态、missing_inputs、产物路径和阻断原因；运行前这些文件不一定存在。不要把 CLI 退出码 2 当作必然崩溃，WAITING_FOR_USER/BLOCKED 就会返回 2；也不能仅凭退出 0 声称 PASSED。

第 7 阶段先生成站点 `docs/DEPLOYMENT_PLAN.md` 与 `docs/DEPLOYMENT_PLAN.json`（运行时文件），进入 WAITING_FOR_USER。向用户展示准确仓库/分支/文件、托管、DNS、Google 服务、成本、回滚和 plan_digest；由用户确认批准范围。只在原 inputs.json 中增加 `deploymentPlanApproval: {"approved": true, "digest": "准确plan_digest"}`，其他值不改。重新 retry --preview，展示包含 DEPLOY TO PRODUCTION 的完整摘要和新确认码；添加批准字段前的码不能启动带批准字段的 retry。用户在自己的消息中写出新码后，才按上述方式 retry --confirm 后台执行。这一轮会按批准计划执行 push、部署、DNS、GSC/GA4；计划变化、账号登录、OAuth 或范围变化须停止并请用户处理。

deploymentExecuted 在执行开始前已置 true，失败也可能保留，不能单独证明部署成功。只生成计划不表示部署、收录、测量或广告接入完成；核对阶段状态、实际报告及每项服务证据，不能伪造结果、把 GSC 提交写成已收录或把 GA4 标签写成已有数据。

## 工具和证据边界

worker 文件权限与命令网络由现有执行器控制；第 2 阶段和批准后的第 7 阶段执行轮开放命令网络，真实浏览器由总控宿主调用。UI 仅支持 audit-only，optimize 当前 BLOCKED。证据带 SHA256，截图或合成产物不能替代实际验证。

遇到失败先诊断具体环节，说明当前进程是否取得凭据/登录态、工具版本/连接/网络是否可用；保留 BLOCKED、WAITING_FOR_USER、PARTIAL、FAILED，不声称已完成。未经用户明确同意，不换工具、来源、provider 或放宽沙箱；不能把当前进程未取得凭据说成用户本机未登录。

只读检查可运行 `node --check src/cli.mjs` 并读取源码和已有报告。inventory 会更新 config/skill-manifest.json，preflight 会写报告，不属于只读健康检查；不得借重锁掩盖 Skill 漂移。不得为证明入口注册而启动 worker 或发布。
