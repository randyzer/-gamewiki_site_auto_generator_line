# M3.3：bsk upload 专项诊断与受控 Dropzone 预案

日期：2026-10-14
结论：**CONTROLLED_DIAGNOSTICS_PASSED / REAL_FILE_UPLOAD_BLOCKED / DROP_NOT_EXECUTED**

## 一、根因范围

历史上传失败：`m3-favicon-transfer-9498ca95-454a-4126-ac35-03328a41ee44`、`m3-favicon-transfer-549ecc6b-d19a-4d93-8dfa-f0d24eb3c265`。均为 PNG 文件与隔离快照存在、用户独立批准上传，但 bsk subprocess 失败。命令门早先统一标为 DAEMON_UNREACHABLE，不能代表 daemon 整体失联。

本轮独立执行 `bsk doctor --json`，8 项均显示 ok，包括 daemon、协议兼容性、扩展连接；daemon 整体故障基本排除。

改用 bsk 0.3.2 支持的明确命令参数（`--selector`、`--mode input`、`--json`）后，新的真实上传验收：

`runs/m3-favicon-transfer-587afe85-e112-48a2-8eb3-587df4224cb3/`

真实 session start、tabs、navigate、observe、session stop 均 APPROVED/COMPLETED；合成 PNG 上传独立 APPROVED，但约 30 秒后 COMMAND_TIMEOUT，CLI 退出码 3，stderr 长度 0，旧诊断的安全错误类别 `TRANSFER_BROWSER_SELECTOR_OR_INPUT`。**没有证据证明上传已成功，因此没有进入 ZIP 下载。**

## 二、bsk 官方本地使用说明

Mac mini 已安装 `~/.agents/skills/browser-skill/references/files.md`：

- 默认 upload 是点击上传按钮或 label，等待文件选择器激活；原来给它传的是 `input[type="file"]`。
- 只有当执行器明确返回 `reason=file_input_not_activated` 且 `effect_state=none`，才可以对明确的上传 dropzone 尝试一次 `--mode drop`。
- `effect_state=unknown` 或 `committed` 时禁止重试和切换模式。
- 远程文件传输不受支持；本方案使用 Mac mini 本机宿主受控会话，仍需对其能力做真实验证。

上一轮 exec 失败未保存 bsk 机器可读原始 effect_state；当前必须视为 **UNVERIFIED**。不能以 exit code=3 或超时直接推断 `effect_state=none`。

## 三、真实只读 DOM 检查

`runs/m3-favicon-inspect-c70affe9-446f-4af7-9315-8246b094d6e0/`

未找到可见且唯一的关联 `label` 上传触发器。只确认唯一 file input。

`runs/m3-favicon-inspect-ff282642-f69a-4e97-a928-abae8a3f65e2/`

实际 file input 可见、未禁用；无 label/按钮关联；有且仅有一个 dropzone 类区域。

`runs/m3-favicon-inspect-43dd22a5-c73f-40f4-9ce7-a2d0ed5789fe/`

进一步验证：**Dropzone 唯一、可见且实际包含那个文件输入框**。五条浏览器命令全部 APPROVED/COMPLETED，窗口正常关闭。仅取固定节点选择器及布尔值、数量，未读取页面正文/账户内容。

## 四、本轮代码

- `src/favicon-control-capture.mjs`：固定 favicon.io 页面 DOM 查询，标记 file input、关联可见 label，以及唯一可见且含 input 的 `[class*="dropzone"]`，严格限制可被回传的字段。
- `src/bsk-effect-state.mjs`：新建 bounded 安全解析模块，只从 bsk 结构化失败数据返回允许的 reason/effect_state 枚举，不输出原始 stdout。
- `src/bsk-capability.mjs`：命令失败时将上述枚举附到受信任 Error，原有沙箱/环境限制不变。
- `src/bsk-command-gate.mjs`：使用 CLI 明确支持的 `--selector --mode input --json` 命令格式；只在 dropzone selector 被验证且宿主具备一次性的 `allowOneFaviconDropAfterNone` 时允许 `--mode drop`。
- `src/bsk-tool-server.mjs`：仅当 bsk 自己明确返回 `file_input_not_activated + none` 才在可信宿主的内存中设置一次性 drop 许可；尝试之后立即消耗，未经再次批准不可执行。
- `scripts/m3-favicon-transfer-smoke.mjs`：缺少已验证的可点击 label 时不再尝试隐藏/普通 file input 的点击上传。返回数据增加安全控件结构诊断。
- 新增单测 `tests/bsk-effect-state.test.mjs`、`tests/favicon-clickable-trigger.test.mjs`，并补充 `tests/favicon-transfer-host.test.mjs` 的 one-shot 和 unknown/committed 负向用例。

## 五、验收及剩余阻断

`npm test` 在 Mac mini 全量通过：**228 pass / 0 fail / 0 skip**，退出码 0。日志：

`runs/m3-bsk-upload-diagnostic-final-2026-10-14.log`

**真实 favicon.io PNG 上传未通过，真实 ZIP 下载未开始。** 当前上线配置仍为 `config/bsk-command-policy.json` 中的 `atomicFileTransferSupported: false`。未动飞书、原始 Skill、模板、已有网站或生产部署。

继续前须先获得新的独立浏览器测试授权、确保能记录 bsk 的确切 `reason/effect_state`，并仅在 `file_input_not_activated + none` 均成立时，向唯一且可见的 dropzone 发起至多一次经人工批准的 drop。不得自动重试、关闭沙箱或在数据面无证明时标记首页 Skill PASSED。
