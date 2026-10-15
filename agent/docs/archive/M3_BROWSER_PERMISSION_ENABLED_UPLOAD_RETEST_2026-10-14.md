# M3.6 BrowserSkill Chrome 权限开启后的真实上传复验

日期：2026-10-14
状态：**FILE_URL_PERMISSION_ENABLED / REAL_UPLOAD_FAILED_UNVERIFIED_EFFECT / DOWNLOAD_NOT_RUN**

## 权限已经生效

Mac mini 本机只读检测 `node scripts/m3-browser-file-permission.mjs` 返回：

- `status=ENABLED`
- `reason=CHROME_FILE_URL_ACCESS_GRANTED`
- `extensionVersion=0.3.2`
- `verifiedTransfer=false`、`productionTransferEnabled=false`

生产 `config/bsk-command-policy.json` 仍为 `atomicFileTransferSupported: false`。

## 独立的真实 favicon.io 受控测试

经 Mac 人工确认，执行：

```sh
node scripts/m3-favicon-transfer-smoke.mjs diagnose-then-drop
```

runId：`m3-favicon-diagnose-then-drop-0f8989c9-2a72-470d-9202-198f901988dd`

真实 favicon.io 页面测试审计：
- `session-start` APPROVED/COMPLETED。
- `owned-tabs` APPROVED/COMPLETED。
- `navigate-favicon` APPROVED/COMPLETED。
- `inspect-controls` APPROVED/COMPLETED。找到唯一、可见且未禁用的 `input[type="file"]`，以及唯一可见、包含该文件输入框的 Dropzone；没有可见关联 label。
- `upload-synthetic-test` **APPROVED/COMMAND_TIMEOUT**。上传源是隔离的 SYNTHETIC 512×512 PNG。CLI 退出码 3，`bskReason=UNVERIFIED`，`effectState=unverified`，stderr 长度 0；与历史结果一致。
- `close` APPROVED/COMPLETED，独立浏览器窗口已经关闭。

按规则：**effect_state 未经证实为 none，绝不切换 Drop、绝不自动重试**；实际未执行 Drop，未下载 ZIP，退出码 2，最终状态 `BLOCKED`。

## 结论

“允许访问文件网址”权限已生效，所以不能再将权限缺失视为唯一故障根因。虽然本机 `bsk doctor --json` 八项检查仍全部通过，但 **bsk input-mode 上传仍超时且不返回可信效果状态**。

现阶段不能凭推测判断是否上传到 favicon.io；不应继续无人值守或盲目上传。后续应在独立审批下评估 BrowserSkill 上游修复，或采用受信任宿主上的**人工可见上传/下载**流程，验证实际页面反馈、文件哈希及下载 ZIP 后再考虑生产接入。

未修改飞书、原始 Skills、模板、现有游戏站、Github、DNS 或部署，也未开放生产上传/下载。

运行结果及六条宿主审计位于 `runs/m3-favicon-diagnose-then-drop-0f8989c9-2a72-470d-9202-198f901988dd/`。
