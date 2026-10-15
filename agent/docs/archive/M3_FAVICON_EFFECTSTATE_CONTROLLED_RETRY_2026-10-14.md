# M3.4 — favicon.io 文件上传的受控 effect_state 诊断与一次性 Drop 回退

日期：2026-10-14

状态：**CODE_READY / LIVE_LAUNCH_DENIED / REAL_UPLOAD_NOT_VERIFIED / DOWNLOAD_NOT_EXECUTED**

## 一、本轮真实 Mac 运行

启动命令：

```sh
node scripts/m3-favicon-transfer-smoke.mjs diagnose-input
```

独立 run：

`runs/m3-favicon-diagnose-input-93720037-5019-45d8-8595-f6df7d9aea73/`

创建了限定于 run 的合成 512×512 PNG 作为候选测试文件，但 Mac 原生启动确认 50 秒内未获 Approve；`SMOKE_RESULT.json` 记载 `status=BLOCKED`、`blocker=M3_TEST_LAUNCH_DENIED`、`statuses=[]`、测试进程退出码 2。

因此 **没有打开 favicon.io 浏览器窗口，没有执行上传/下载，也没有获得 bsk 真实 reason/effect_state**。这是安全拒绝，不是技术测试通过。

## 二、修复与改进

1. **错开超时**：把 bsk 单次上传自有超时调整为 18 秒，宿主子进程超时为 45 秒，让 CLI 有机会先返回机器可读的失败原因，避免宿主与子进程同时达到 30 秒的竞争。其结果仍需真实验收，不能保证 bsk 一定会发出结构化错误。
2. **限制错误来源**：`src/bsk-effect-state.mjs` 只解析 bsk 返回的合法 JSON 顶层或 `error` 对象中的固定 reason/effect_state 枚举；不再从任意页面文本、日志字符串或 `data` 对象中搜索 `effect_state=none`。stdout 和 stderr 均只接受这个结构；未识别的错误归为 `UNVERIFIED/unverified`。
3. **Drop 回退变为确切的一次性授权**：只有同一 Mac 宿主会话中第一次 Input 上传返回 `reason=file_input_not_activated` 且 `effect_state=none`，并且页面存在唯一且可见、实际包含 file input 的 `[class*="dropzone"]` 时，才能在 60 秒有效期内提出一次新的 Drop 命令，后者仍要求独立的 Mac 用户审批。
4. **绑死原始素材**：Drop 回退不仅核对 runId、stage、会话、tab、页面、PNG 绝对路径，还读取宿主审批审计中首次 Input 上传的 SHA256，与 Drop 前的 PNG 字节 SHA256 一致才允许执行。即使 PNG 路径不变，只要内容替换就必须拒绝。尝试 Drop 后无论结果如何都会消费一次性许可。
5. **显式、默认安全的 CLI 模式**：`scripts/m3-favicon-transfer-smoke.mjs` 支持 `diagnose-input`（仅一次 Input 上传尝试，绝不切换模式）和 `diagnose-then-drop`（只在完全满足上述条件时允许同一 run 中的一次 Drop）。旧 `inspect` 仍纯只读，旧 `transfer` 仍要求已验证的可见 label。不能在未知效果状态下用其他命令或另一张图片来试探。
6. Mac 用户确认窗口对上传显示 `input` 或 `drop` 机制、测试 PNG 路径、SHA256 和目标域名。

## 三、测试

新增/扩展 `tests/bsk-effect-state.test.mjs` 和 `tests/favicon-transfer-host.test.mjs`，覆盖：结构化状态提取、网页伪造文本不可授权、unknown/committed 不得回退、同名但不同字节的 PNG 拒绝、换路径拒绝、一次性回退不可重放，以及默认生产开关不允许上传。

2026-10-14 Mac mini 最终运行 `npm test`：**231 项通过、0 失败、0 跳过，退出码 0**；原始日志 `runs/m3-controlled-effect-fallback-final-2026-10-14.log`。

本轮没有修改 `config/bsk-command-policy.json`：**`atomicFileTransferSupported: false`**。

## 四、继续真实验证的条件

用户需要能够及时看到并批准 Mac mini 的原生窗口。再次执行前应人工确认愿意向 favicon.io 上传 **合成的测试透明 PNG**（不是正式品牌图标），每条浏览器命令单独批准。

优先执行 `diagnose-input`，查看新运行的安全 `uploadDiagnostic`。若结果为 `unknown`、`committed`、`unverified` 或缺失，不允许 Drop，不得自动重试。若想在**一轮全新明确批准的测试**中验证 Input → Drop 回退，才考虑 `diagnose-then-drop`：它在第一次 Input 的实际反馈是 `file_input_not_activated + none` 且 Dropzone 严格验证通过时提出新的 Drop 人工审批。

只有真实 PNG 上传完成、真实 ZIP 下载完成、完整 favicon 二进制验收及文件哈希和审批证据闭环通过，才能讨论开启生产传输。**这仍不等于图像生成回调已接入或首页 Skill PASSED。**

飞书、原始 Skills、模板、已有游戏站、GitHub/DNS 和部署均未修改。


## 实际人工批准复验补充（2026-10-14）

runId：`m3-favicon-diagnose-then-drop-ae8cba59-8f6d-466e-8d98-b44d8ee44ece`

执行 `node scripts/m3-favicon-transfer-smoke.mjs diagnose-then-drop`，6 条浏览器命令均获人工批准；session start、tab list、favicon.io navigate、公开控件 inspect、session stop 五步 `COMPLETED`。上传合成 512×512 PNG 命令获 `APPROVED`，但返回 `COMMAND_TIMEOUT`、CLI exit code `3`、`bskReason=UNVERIFIED`、`effectState=unverified`，stderr 字节数为 0。

严格一阶门拒绝了 Drop：**没有尝试 Drop，没有下载 ZIP**。独立窗口成功关闭，run 下没有下载的 favicon ZIP，`SMOKE_RESULT.json` 的最终状态为 `BLOCKED`，退出码 2。生产 `atomicFileTransferSupported` 保持 false。

本次证明人工批准和浏览器访问机制可正常执行，但不能证明真实文件上传；下一步不应猜测 `none` 或以退出码 3 代替可靠的效果状态。
