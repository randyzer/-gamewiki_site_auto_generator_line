# M3.2 — favicon.io 真实验收执行报告

日期：2026-10-14
状态：**PARTIAL — INSPECT_PASSED / REAL_UPLOAD_BLOCKED / REAL_DOWNLOAD_NOT_RUN**

## 1. 真实控件检查已通过

`runs/m3-favicon-inspect-8f54c685-209c-4403-b1fe-c0df0a203c5f/`

真实 Mac 宿主逐命令人工批准、执行成功：session start、owned tab list、导航至 `https://favicon.io/favicon-converter/`、读取公开控件、session stop。返回 `CONTROLS_INSPECTED`，进程退出码 0，关闭窗口已确认。

真实 DOM 白名单仅找到 `input[type="file"]` 上传控件；初始页面没有匹配当前严格下载选择器的控件。下载控件预计需上传之后再次 inspect，未曾猜测或点击未知控件。

## 2. 合成 PNG 的真实上传未通过

第一次真实测试：

`runs/m3-favicon-transfer-9498ca95-454a-4126-ac35-03328a41ee44/`

第二次真实诊断复测：

`runs/m3-favicon-transfer-549ecc6b-d19a-4d93-8dfa-f0d24eb3c265/`

两次均经 Mac 独立人工批准，完成 session start、tabs、navigate、inspect，确认相同固定上传控件。宿主生成本轮 512×512 的透明 SYNTHETIC PNG，大小 4,655 字节，SHA256：

`a17ec48065f2668d441d2a94878d5e6572df6b2f37a71c575995d5cd5abcda76`

上传命令获得单独 `APPROVED`、文件快照真实存在且权限 0400、字节大小一致；但 bsk subprocess 返回失败，命令门状态 `DAEMON_UNREACHABLE`。第二次安全诊断细分为 `TRANSFER_EXECUTION_FAILED_UNCLASSIFIED`。旧状态只能说明 bsk 调用失败，**不能据此断言 bsk daemon 实际不可达**。出于安全原因没有保存 stderr 原文、网页正文或个人数据。

两次均再次独立批准关闭自有浏览器窗口，返回 `COMPLETED`，未留下已知的自有窗口。

**真实文件上传未成功，ZIP 下载未执行，favicon.io 来源证据不成立。**

## 3. 本轮代码与安全验收

- `src/favicon-control-capture.mjs` + 固定选择器白名单：网页只向可信宿主提供可验证的公开控件。
- `src/bsk-tool-server.mjs`：仅隔离宿主可以显式 `allowFaviconTransfer`；默认值仍为 false。
- `src/macos-human-approval.mjs`：上传/下载必须逐条人工批准，展示目标与文件摘要。
- `src/bsk-command-gate.mjs`：新安全枚举诊断 `TRANSFER_*`，不向 stdout/日志透露任意 subprocess 原文。
- `tests/favicon-controls.test.mjs` + `tests/favicon-transfer-host.test.mjs`：受限控件/模拟传输、拒绝路径、字节 SHA256、一致性和错误脱敏测试。

生产策略 `config/bsk-command-policy.json` 仍然包含 `atomicFileTransferSupported: false`。没有修改原始 Skills、模板、飞书、已有游戏站或生产部署。

## 4. 结论与下一步

M3.2 的 **控制面真实验收 PASS**（人工批准、真实网页、控件识别、窗口清理）；**数据面 FAIL/BLOCKED**（bsk upload 失败；真实下载未运行）。不得将离线通过的合成 ZIP 冒充真实 favicon.io 下载。

下一步应针对当前版本 `bsk 0.3.2` 文件上传 subprocess 做新的受控诊断，包括报告安全枚举、退出码或确认目标 CSS 选择器的实际 file input 兼容性。不应修改生产开关、不应使用 `dangerously-bypass`，也不应反复自动上传。

完整首页 Skill 仍为 `BLOCKED`，缺少图像生成工具回调及真实 favicon.io 上传/下载审计。


## 5. 全量回归（本轮最终）

`npm test` 真实执行完成，退出码 0：**220 项测试通过、0 失败、0 跳过**。日志 `runs/m3-live-acceptance-postfix-regression.log`。这仅证明已有代码及离线安全测试通过，**不会改变真实上传 BLOCKED 的验收结论**。
