# M3.8 — 首页 Skill 的受控人工 favicon 交接方案

日期：2026-10-14
状态：**IMPLEMENTED_AND_OFFLINE_TESTED / REAL_GAME_HANDOFF_NOT_YET_STARTED**

## 目标

将 M3.7 在 favicon.io 已手工验证的真实转换能力，正式接入七阶段 Agent 的**首页研究阶段**，作为 bsk 自动文件传输不可用时的**显式 opt-in 备用路径**，而不另造一套编排器。

系统仍以 `src/pipeline.mjs` 的 `WAITING_FOR_USER → NOT_STARTED (explicit retry) → IN_PROGRESS` 为唯一状态机；不自动继续、不自动改变生产传输策略。

## 实施情况

- 新增 `src/m3-homepage-manual-handoff.mjs`：在现有 `runs/<RUN_ID>` 下创建游戏及 run 专属 `m3-homepage-manual/`；隔离 `input/master-512.png`、`output/favicon.zip`；严格检查符号链接/硬链接、512 RGBA PNG、七成员 ZIP 完整性、图片大小、CRC、manifest 和 512px 像素一致性。
- 通过 `scripts/m3-compare-favicon-pixels.py` 解码 PNG 像素并逐像素比较；可接受不同的 PNG 压缩格式，但不容许用户在转换时悄悄替换图像内容。
- 用户确认不是自动批准：`USER_APPROVAL.json` 仅在用户明确提供 master 和 ZIP **两个 SHA256**，并确认手工上传、视觉审核及下载后由独立 CLI 写入，绑定 runId、gameIdentity 和 `REQUEST.json` 摘要。文件变更后不再接受旧批准。
- 新增 `scripts/m3-homepage-handoff.mjs` 命令入口，仅允许对**真实存在、首页阶段尚未 PASSED 的 Pipeline run** `begin / inspect / approve`，不创建新的生产 run，不修改已有网站。
- 修改 `src/skill-executor.mjs`：只有 run 中存在手工请求才使用此模式。待文件或待用户确认时返回 `WAITING_FOR_USER`，缺失 `faviconManualApproval`；不触发 Mac 浏览器也不调用 Codex。
- 批准后仍须得到原有 Steam 事实采集的**独立人工授权**，调用真实首页 Codex Skill；Worker 接收用户核验的原始 ZIP 路径和哈希，按原始 Skill 的文件命名规则将原样 ZIP 放在 `nativeDirectory/backgroundinformation/{gameIdentity}图标.zip`，研究报告必须输出到 `nativeDirectory/backgroundinformation/{gameIdentity}攻略站首页调研信息.md`。
- Worker 返回 `PASSED` 时，宿主再次核对人工作业请求、人工批准及文件 SHA256 未变化，验证 worker 返回的 `ICON.zip` 字节与批准 ZIP 完全一致，然后调用现有 `validateNativeArtifacts` 对真实 Markdown + ZIP 做原生验收。增加独立证据标记，记录人工来源及未独立认证的 favicon.io 来源。
- 缺文件、文件变更、跨游戏、其他 run 的批准、无 ZIP、伪造或重建的 ZIP 一律禁止阶段 PASSED。

## 与 M3.7 测试任务的区分

M3.7 使用的 `M3-TEST-ONLY-512.png` 和经过 favicon.io 手工转换的 7 成员 ZIP 仅能证明**测试网站转换**，不得充当真实游戏的原品牌徽标。

本轮**没有启动真实游戏的手工交接、也没有将 Bodycam 旧测试 PNG/ZIP 放入生产 run**。真实游戏需要单独提供经过视觉审核的 512px 透明 PNG，并在当前 run 手工转换后批准哈希。

## 在现有 Agent run 上使用

首先确保 Agent 已创建 run，其 `manifest.json` 为当前项目正确游戏，并且首页阶段尚未 PASSED。

从 `agent/` 目录执行：

```sh
node scripts/m3-homepage-handoff.mjs begin <RUN_ID>
```

输出专属输入/输出路径。将正式且已审核的 `master-512.png` 放入 `runs/<RUN_ID>/m3-homepage-manual/input/`，手工在 `https://favicon.io/favicon-converter/` 上传并下载对应 `favicon.zip` 到 `runs/<RUN_ID>/m3-homepage-manual/output/`。

```sh
node scripts/m3-homepage-handoff.mjs inspect <RUN_ID>
```

如果输出 `M3_AWAITING_USER_ATTESTATION`，仔细核对输出的 master、ZIP SHA256 与当前游戏名，在明确批准视觉效果、转换流程之后执行：

```sh
node scripts/m3-homepage-handoff.mjs approve <RUN_ID> <MASTER_SHA256> <ZIP_SHA256>
```

只在返回 `READY_FOR_HOMEPAGE_SKILL` 后，对原来**同一项目、同一个 RUN_ID** 手动执行：

```sh
node src/cli.mjs retry <ORIGINAL_INPUT_CARD_JSON> <RUN_ID>
```

注意：
- `begin` 若尚在等待会以退出码 2 显示等待，而不是发生技术故障。
- `inspect` 可只读反复运行；`approve` 禁止无明确用户意愿调用。
- 用户同意手工转换**不等于** favicon.io 站点来源已独立签名核验，也不等于 BrowserSkill 自动化转移成功。
- `retry` 需要原先的项目输入卡、完整合法的 Skill inventory、Steam 浏览器人工逐命令批准和原生内容验收；仅准备 ZIP 不足以让首页 Skill PASSED。
- 若页面事实调研无法完成，保持 BLOCKED，不继续后续模板复制或发布。
- 该机制不读取任意 Downloads，不安装依赖、不写网站、不改变原始 Skill。

## 边界

本次没有给 `bsk` 打补丁、没有修改 Chrome 扩展、没有打开真实生产传输，`config/bsk-command-policy.json` 的 `atomicFileTransferSupported` 仍为 `false`。其他浏览器阶段（关键词、UI 审计、上线验收）的既有 BLOCKED 状态不受影响。部署仍为计划阶段。

浏览器自动传输问题另见 `M3_BSK_UPLOAD_UPSTREAM_REPRO_2026-10-14.md`。


## 最终全量回归（2026-10-14）

Mac mini 上真实执行 `npm test`：**248 项通过、0 失败、0 跳过，退出码 0**，记录于 `runs/m3-manual-stage-fallback-full-regression-2026-10-14.log`。

- `tests/m3-homepage-manual-handoff.test.mjs`：游戏和 run 身份核对、输入与 ZIP SHA256 绑定、完整性/像素对应关系、人工审批文件变化后失效、Codex worker 错误替换图标后拒绝 PASSED。
- `tests/m3-homepage-cli.test.mjs`：现有合法 run 才可进入手工交接、此前已 PASSED 或不存在的 run 拒绝修改、审批不能凭空获得。
- `tests/pipeline.test.mjs`：运行进入 WAITING_FOR_USER 时暂停；文件出现后不会自行执行；必须显式 retry 才能重启正常阶段。
- `tests/host-browser-evidence.test.mjs`：未经真实 run 作用域验证的浏览器结果仍被 BLOCKED。
- 真实游戏的 PNG 来源与本阶段正式首页研究未曾运行，不能凭离线合成 fixture 声称业务验收通过。

**BrowserSkill 官方发布页（核查时）仅可确认 0.3.2 为最新列出的正式版本；没有因升级软件跳过人工批准。** 自动上传仍未完成，需与人工备用流程分开验收。
