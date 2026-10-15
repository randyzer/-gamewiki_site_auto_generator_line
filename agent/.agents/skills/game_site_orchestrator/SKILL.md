---
name: game_site_orchestrator
description: "Prepare inputs for the existing seven-stage game-site CLI, ask the operator to run it in an interactive terminal, and report progress from evidence."
---

# Codex 游戏站总控入口适配说明

工作根目录为 `/Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent`。本 Skill 负责整理输入和汇报，业务实现使用既有 CLI / orchestrator / pipeline，不在提示词中复制状态机，不手动逐个调用 Skill 绕过总控。

先阅读 [README](../../../README.md)、[路线图](../../../docs/MASTER_AGENT_EXECUTION_ROADMAP_V1.md)、[阶段矩阵](../../../docs/SEVEN_STAGE_GATE_AND_EVIDENCE_MATRIX_V1.md)，核对 [CLI](../../../src/cli.mjs)、[终端门](../../../src/terminal-run.mjs)、[阶段字段](../../../src/stages.mjs) 和 [pipeline](../../../src/pipeline.mjs) 的 missingInputs。链接均相对本文件；后续命令以 agent 根目录为 cwd。

## 整理输入和启动

1. 只根据用户确认的事实整理 inputs.json：准确游戏身份、平台/版本/语言与目标、站点目录、调研目录、原始关键词 Markdown 路径、canonical、siteRevision、域名、仓库/分支、DNS 与部署计划授权。按 README 给出完整 JSON，并列出缺项和条件项；不要猜 Steam App ID、关键词、域名、路径或批准。projectPath 来自 paths.siteDirectory，新 run 未指定时拒绝启动。
2. 给用户查看输入、文件范围和将调用真实 worker 的操作，请用户确认。密钥不进入输入文件或对话；SERPER_API_KEY 由用户通过环境变量提供。不得索取或输出 token、密码、cookie、凭据文件内容。
3. 用户确认后，告诉用户在自己的交互终端切换到上述 agent 根目录，再执行：

   ```sh
   node src/cli.mjs run inputs.json RUN_ID
   ```

   RUN_ID 必须符合 `[a-zA-Z0-9_-]{1,100}`。inputs.json 是用户确认后准备的运行时文件，非仓库预置文件。终端先打印摘要，用户核对后亲自输入单独的小写 `y` 才会启动。Codex 不得代输 y，不得用伪 TTY、管道、脚本或改代码绕过操作者确认；管道 stdin 会被拒绝。
4. 恢复同一 run 时先据记录说明缺项、失败环节及输入变化，再展示更新后的完整 JSON 请用户确认；由用户在交互终端执行并亲自输入 y：

   ```sh
   node src/cli.mjs retry inputs.json RUN_ID
   ```

   run 要求新 manifest，retry 要求已有 manifest；retry 会重验受影响阶段，不保证自动清理已有站点或覆盖冲突。

不要先走 entry-preview/create/update 草稿或可信宿主票据流程；这些代码已冻结。已有项目、飞书、G0/bsk/m3 不属于当前新站主线。不得修改 `codex-skills/`、模板来源、凭据或全局 Codex 配置。仅做文档/检查不授权真实建站或生产操作。

inputs.json 的路径部分示例（其他字段见 README，示例须替换为用户确认的值）：

```json
"paths": {
  "projectRoot": "/用户确认的绝对路径/游戏目录",
  "siteDirectory": "{projectRoot}/site",
  "researchDirectory": "{projectRoot}/backgroundinformation",
  "rawKeywordsFile": "{projectRoot}/backgroundinformation/keyword-materials/关键词.md"
}
```

projectRoot 可省略，但只支持 `{projectRoot}` 这一种替换；解析后全部须为绝对路径。research 最后一层必须叫 backgroundinformation（首页 Skill validate_outputs.py:49 要求）。site 与 research 不得嵌套、不得与 agent/、codex-skills/、.template-cache/、runs/ 重叠，不得经过符号链接；新站目录须不存在或为空。顶层 rawKeywordsFile 在 paths 内未填写时仍可用。无 paths 的旧 manifest 保持原恢复行为；新 run 不回退到 agent/workspaces。retry 的路径变化会使受影响阶段失效；同名异内容研究文件须由用户处理冲突，原关键词不覆盖。研究产物先落在指定 research，stage 4 才复制到 site/backgroundinformation。worker 仅 stage 1/2 可写 research，stage 3/4 和部署 execute 可写 site，其他阶段只读。

## 读取进度和部署确认

可读取运行时 `agent/runs/RUN_ID/manifest.json` 与同目录 `AGENT_RUN_REPORT.md`，以 manifest、实际产物和诊断为依据汇报 run_id、当前阶段/状态、missing_inputs、产物路径和阻断原因；运行前这些文件不一定存在。不要把 CLI 退出码 2 当作必然崩溃，WAITING_FOR_USER/BLOCKED 就会返回 2；也不能仅凭退出 0 声称 PASSED。

第 7 阶段先生成站点 `docs/DEPLOYMENT_PLAN.md` 与 `docs/DEPLOYMENT_PLAN.json`（运行时文件），进入 WAITING_FOR_USER。向用户展示准确仓库/分支/文件、托管、DNS、Google 服务、成本、回滚和 plan_digest；由用户确认批准范围。只在原 inputs.json 中增加 `deploymentPlanApproval: {"approved": true, "digest": "准确plan_digest"}`，其他值不改，再让用户执行上述 retry 并亲自输入 y。这一轮会按批准计划执行 push、部署、DNS、GSC/GA4；计划变化、账号登录、OAuth 或范围变化须停止并请用户处理。

deploymentExecuted 在执行开始前已置 true，失败也可能保留，不能单独证明部署成功。只生成计划不表示部署、收录、测量或广告接入完成；核对阶段状态、实际报告及每项服务证据，不能伪造结果、把 GSC 提交写成已收录或把 GA4 标签写成已有数据。

## 工具和证据边界

worker 文件权限与命令网络由现有执行器控制；第 2 阶段和批准后的第 7 阶段执行轮开放命令网络，真实浏览器由总控宿主调用。UI 仅支持 audit-only，optimize 当前 BLOCKED。证据带 SHA256，截图或合成产物不能替代实际验证。

遇到失败先诊断具体环节，说明当前进程是否取得凭据/登录态、工具版本/连接/网络是否可用；保留 BLOCKED、WAITING_FOR_USER、PARTIAL、FAILED，不声称已完成。未经用户明确同意，不换工具、来源、provider 或放宽沙箱；不能把当前进程未取得凭据说成用户本机未登录。

只读检查可运行 `node --check src/cli.mjs` 并读取源码和已有报告。inventory 会更新 config/skill-manifest.json，preflight 会写报告，不属于只读健康检查；不得借重锁掩盖 Skill 漂移。不得为证明入口注册而启动 worker 或发布。
