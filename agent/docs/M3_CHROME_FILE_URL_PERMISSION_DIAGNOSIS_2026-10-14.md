# M3.5 — BrowserSkill 上传故障 Chrome 文件网址权限专项诊断

日期：2026-10-14
状态：**PROBABLE_ROOT_CAUSE_FOUND / CHROME_PERMISSION_DISABLED / LIVE_TRANSFER_BLOCKED**

## 真实诊断依据

1. Mac mini 当前使用 `bsk 0.3.2`、Chrome 中实际安装的 BrowserSkill 0.3.2 扩展。
2. 根据官方 Chromium 源码（`extensions/browser/extension_prefs.cc`），Chrome 扩展是否允许访问 `file://` URL，存放于扩展设置字段 `newAllowFileAccess`；没有设置时，`AllowFileAccess` 返回 false。源码参考：https://chromium.googlesource.com/chromium/src/+/master/extensions/browser/extension_prefs.cc
3. **只读检查** Mac mini `~/Library/Application Support/Google/Chrome/Default/Secure Preferences`，唯一 BrowserSkill 扩展的 `newAllowFileAccess` 字段为 **ABSENT**。未打印、复制或修改其他扩展数据或敏感偏好。
4. BrowserSkill 上游 issue #385 在相同 bsk 0.3.2 下指出：Chrome 扩展未启用“Allow access to file URLs”可能使上传失败，而 `bsk doctor` 八项依旧全部成功。参考：https://github.com/Tencent/BrowserSkill/issues/385
5. 与此前实际上传的 `COMMAND_TIMEOUT` / `effectState=unverified` 一致，但 **不能由此认定权限是唯一或最终根因**；需要在真实启用 Chrome 许可后重新验收。

## 已实施

- 已通过 macOS `open -a 'Google Chrome'` 打开扩展详情页：`chrome://extensions/?id=hhcmgoofomhgciiibhipgmgkgnoenaoi`，且读回 Chrome 当前活动标签 URL 确认打开成功。
- **没有改写 Chrome Secure Preferences、没有自动开启扩展权限，也没有重启共享浏览器或 daemon**。
- 新增只读模块 `src/chrome-file-url-permission.mjs`，严格只识别名为 BrowserSkill 的单一扩展和 boolean `newAllowFileAccess`，无权限时报告 `DISABLED`，配置不可读或身份歧义时 `UNVERIFIED`，均 fail-closed，不输出其他敏感字段。
- 新增 `scripts/m3-browser-file-permission.mjs`，可直接验证：
  `node scripts/m3-browser-file-permission.mjs`
- 修改 `scripts/m3-favicon-transfer-smoke.mjs`：所有传输模式（`transfer`、`diagnose-input`、`diagnose-then-drop`）都在 **任何弹窗或浏览器会话出现前** 检测权限，未明确 `ENABLED` 时返回 `M3_CHROME_EXTENSION_FILE_URL_ACCESS_REQUIRED`，不再盲目重复上传。纯 `inspect` 模式仍可读。
- 新增 `tests/chrome-file-url-permission.test.mjs`，覆盖明确 true、false、字段缺失、篡改为字符串、找不到扩展、多个同名扩展和读取失败，拒绝打印敏感偏好。
- Mac mini 全量 `npm test`：**235 项通过，0 失败，0 跳过**，退出码 0，日志 `runs/m3-browser-upload-file-url-preflight-regression.log`。

## 尚未完成

浏览器权限仍显示 `DISABLED`。必须由用户通过 Chrome 扩展详情页手动开启 **Allow access to file URLs**。开启后运行上面的只读权限检查；只有返回 `ENABLED`，才计划在人工可见并逐条批准的独立浏览器会话中，再运行一次合成 PNG 上传与 ZIP 下载验收。**未得到新一次真实命令审计前，不能宣称上传问题已经修复**。

生产 `config/bsk-command-policy.json` 仍是 `atomicFileTransferSupported: false`。本轮未修改原始 Skill、模板、飞书、网站、部署、GitHub 或 DNS。


## 权限门真实负向验证

运行 `node scripts/m3-browser-file-permission.mjs`，返回 `DISABLED / CHROME_FILE_URL_ACCESS_NOT_GRANTED`，退出码 2。随后执行一次 `node scripts/m3-favicon-transfer-smoke.mjs diagnose-input`，入口在浏览器操作前就安全退出 `BLOCKED / M3_CHROME_EXTENSION_FILE_URL_ACCESS_REQUIRED`，`statuses=[]`，无新弹窗或真实上传。证据 run：`runs/m3-favicon-diagnose-input-bd611fe5-e8a4-4391-ac0d-2fddc8796d33/`。
