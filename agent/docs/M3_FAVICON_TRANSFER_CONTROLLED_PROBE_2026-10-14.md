# M3.1 — favicon.io 受控文件传输实施与验收记录

日期：2026-10-14  
状态：**CODE_AND_OFFLINE_TESTS_PASSED / LIVE_TRANSFER_NOT_VERIFIED / PRODUCTION_TRANSFER_DISABLED**

## 目标与实际边界

继续使用唯一总控根目录 `agent/`，复用现有 bsk 宿主审批、browser command gate、PNG/ZIP 验收器，不重新开发七阶段状态机。

本阶段只验证 **合成 512px 透明 PNG 上传至 favicon.io 并下载测试 ZIP** 的受控能力。合成测试资产不是图像生成器提供的正式徽标，也不表示 homepage Skill 已完成。

## 已完成的改动

- `src/favicon-control-capture.mjs`：只在精确 `https://favicon.io/favicon-converter/` 页面运行，读取固定上传 / 下载控件候选，不读取全页内容、用户信息、cookies 或任意 DOM 文本；返回数据再次经 `sanitizeFaviconPublicControls` 白名单过滤。
- `src/bsk-command-gate.mjs`：在确切 favicon.io URL 上启用控件白名单的 observe 校验，沿用现有 runId / stage / 命令 SHA256 / 一次性票据 / 文件快照等门槛。
- `src/bsk-tool-server.mjs`：通过默认 `false` 的 **`allowFaviconTransfer`** 显式开关，使上传/下载仅能用于受信任的隔离宿主测试；默认执行器、飞书、Codex worker 均未启用传输。
- `src/macos-human-approval.mjs`：新增明确说明上传/下载的审批意图和隔离测试启动提示。每条上传与下载仍分别弹出 Mac 原生对话框，展示动作、目标、测试文件和 SHA256；拒绝或超时就不执行。
- `scripts/m3-favicon-transfer-smoke.mjs`：支持 `inspect` / `transfer` 两种模式。独立 session，只使用受限 favicon.io 页面；若选择 transfer，先在 `runs/<runId>/native/` 内创建 **SYNTHETIC** PNG，再由经批准的宿主上传、下载及验证二进制 ZIP，关闭独立窗口也要再次批准。所有结果写入 run 的 `SMOKE_RESULT.json`。
- `tests/favicon-controls.test.mjs` 和 `tests/favicon-transfer-host.test.mjs`：9 项新隔离测试，覆盖固定 URL/控件防伪、拒绝选择器、缺失人工批准、缺省阻断、源 PNG 字节与目标 ZIP SHA256 一致性以及二进制 ZIP 验证。

## 安全门槛

生产文件 `config/bsk-command-policy.json` **保持 `atomicFileTransferSupported: false`**；`bsk-tool-server.mjs` 对默认服务仍直接拒绝上传/下载；没有将可信宿主标志传给 Codex worker，也未更改原始 Skills、模板、飞书或游戏站。

测试程序只在内存里构建 `atomicFileTransferSupported: true` 的隔离任务策略，并由真实 Mac GUI 对 **测试启动和每一条操作** 单独批准。不能通过传入 URL、伪造 browser 结果或仅设置环境变量自动批准。

当前仅支持固定选择器白名单，真实 favicon.io 网页是否能匹配这些选择器仍要实际批准后查看。如未匹配，返回 BLOCKED，并需重新审查页面控件；不可使用宽泛点击脚本代替。

## 已完成的验证

- 控件检查及隔离传输专项测试：**9/9 通过**。
- 全量 `npm test`：**219 项通过，0 失败，0 跳过，退出码 0**，日志 `runs/m3-favicon-transfer-final-regression.log`。
- Mac mini 上曾启动真实 `inspect` 测试，runId `m3-favicon-inspect-aef8fbf2-9df1-4175-b50a-044c62035fe5`。
- 本次 GUI 启动审批 50 秒未获确认，程序返回 `M3_TEST_LAUNCH_DENIED`；`statuses=[]` 表示 **没有创建浏览器窗口，没有实际上传或下载，没有被确认的 favicon.io 控件**。
- 上一次 M2 Steam 公开事实采集通过的审计记录不能替代本次 favicon.io 文件传输审计。
- 最后在全部测试通过后微调了 Mac GUI 提示文案（显示文件与 SHA256），并重新通过该模块的 3 项专项测试；此次文案调整没有改变执行语义。

## 人工在场时继续的真实验收

从 agent 根目录运行：

```bash
node scripts/m3-favicon-transfer-smoke.mjs inspect
```

需要在 Mac mini 的 GUI 窗口及时批准测试启动、session start、tab list、navigate、observe 和 session stop。检查结果 `SMOKE_RESULT.json` 中 `status=CONTROLS_INSPECTED` 且 `ownedWindowClosed=true`，并确认实际控件列表。

若确认上传与下载控件确实受白名单支持，再运行：

```bash
node scripts/m3-favicon-transfer-smoke.mjs transfer
```

依次经人工批准启动、独立窗口创建、标签页、导航、页面控件检查、合成 PNG 上传、下载控件检查、ZIP 下载及独立窗口清理。只有 `status=TRANSFER_BINARY_VALIDATED`、`ownedWindowClosed=true` 和所有操作独立审计均通过，才可进入生产集成设计。**即使成功仍不等于图像生成能力已经可用，也不等于真实首页 Skill 可以 PASSED**。

## 下一步

在人工可见 GUI 时完成真实 favicon.io 读写联调；修复实际控件差异或浏览器工具传输失败后再次验收。然后单独接入受信任的图像生成回调，审核原创性、透明度和视觉效果，最终将真实可追溯的 favicon 产物接入 homepage Skill 的原生验收。
