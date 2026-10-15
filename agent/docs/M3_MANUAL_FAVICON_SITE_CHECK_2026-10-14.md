# M3.7 — favicon.io 人工可见上传/下载隔离验收

日期：2026-10-14
状态：**MANUAL_SITE_ACTION_PENDING / NO_VERIFIED_DOWNLOAD_YET**

## 为什么采用独立人工网站检查

Chrome 的 BrowserSkill 0.3.2 在开启文件 URL 权限后，人工逐命令审批的 bsk input 上传仍超时，`effectState=unverified`。在未知上传效果时，不允许盲目改用 Drop 或重复自动提交。

本阶段使用**人直接操作 Chrome GUI**，将 favicon.io 网站本身能否处理文件与 bsk CLI 上传机制分开验证。这不是绕过 bsk 的自动上传：可信宿主仅准备测试 PNG、打开界面和核验用户主动下载并放入隔离目录的 ZIP。

## 已准备的测试环境

runId：`m3-manual-favicon-ae172e2e-fd70-402e-ab39-2b0cc2c832f1`

页面：`https://favicon.io/favicon-converter/`

合成测试素材（512×512 RGBA，透明边缘、明显的 TEST 字样，不是游戏品牌图标）：

`runs/m3-manual-favicon-ae172e2e-fd70-402e-ab39-2b0cc2c832f1/input/M3-TEST-ONLY-512.png`

PNG SHA256：

`cf4ea49fa3a8378c5f57ccdc050629ec522c5c544738cf1d74e25f4de16c1637`

人工 ZIP 接收位置：

`runs/m3-manual-favicon-ae172e2e-fd70-402e-ab39-2b0cc2c832f1/output/favicon.zip`

启动准备工具：`node scripts/m3-manual-favicon.mjs prepare`。

本次已实际生成单独 run，开启了 Chrome favicon.io 独立人工窗口和 Finder 输入/输出目录。上传与下载操作**尚需操作者亲自在 Chrome 中完成**，任何浏览器里显示的结果都不能从目录准备成功推断出来。

## 人工操作说明

1. 用户用当前 Chrome 网站界面选择已准备的 `M3-TEST-ONLY-512.png`（不可上传个人资料或任何私密文件）。
2. 用户确认预览里出现明显 TEST 图案，然后点击网站的 ZIP 下载。
3. 用户只将这一轮从 favicon.io 下载的 ZIP 手动移动/复制到 run 的 `output/favicon.zip`，不要使用其他下载文件或生成的合成 ZIP。
4. 用户明确回复 ChatGPT：`ZIP 已放入 output`，或说明网页错误/无按钮。
5. 宿主执行 `node scripts/m3-manual-favicon.mjs verify RUN_ID`。校验输入 SHA256 不变、输出 ZIP 路径严格限定在同一 run、无 symlink / hardlink、文件大小界限，并调用严格的 `verify-favicon-package.py`。仅接受 `BINARY_VALIDATED_SITE_ORIGIN_UNVERIFIED`，不会误报来源证据。
6. 用户的手工确认、下载 ZIP 的哈希及文件结构分别记录。即使全部通过，也不等于 bsk 自动化文件传输已修复，不等于首页 Skill PASSED。

## 代码与安全门

新文件：
- `scripts/m3-visual-test-fixture.py`：无任何网络访问；仅创建醒目、无私人信息、没有品牌宣称的合成 PNG。
- `scripts/m3-manual-favicon.mjs`：`prepare` 和 `verify RUN_ID`，每轮随机 ID，输出收件目录完全隔离，防路径越界及符号链接；不读取用户下载目录，不接触其他个人文件。
- `tests/m3-manual-favicon.test.mjs`：独立手工验收链路单测，特别验证合成 ZIP 结构通过**不等于网站来源通过**。

Mac mini 最终全量回归：`npm test`，**239 pass / 0 fail / 0 skip，退出码 0**，记录于 `runs/m3-manual-favicon-full-regression-2026-10-14.log`。

截至本轮结束时，仅检查本 run 的固定输出路径，`output/favicon.zip` **尚不存在**；因此没有实际网站转换成功证据。

原始 Skills、模板、飞书、其他游戏站及部署未修改。生产 `atomicFileTransferSupported: false` 保留。

## 验收判定

- 没有用户实际人工下载的 ZIP：**PENDING_MANUAL_SITE_ACTION**。
- ZIP 合格但用户未确认来源：**BINARY_VALIDATED_SITE_ORIGIN_UNVERIFIED**。
- 用户确认来源且 ZIP 二进制检查通过：可以记录**MANUAL_SITE_FUNCTIONAL_CHECK_PASSED**，但是 bsk 数据面仍未 PASSED。
- ZIP 不符合严格结构：**REJECTED_BINARY_STRUCTURE**，需要检查文件内容与现有检验器兼容性，不允许假设网站失败。

后续独立任务：对 bsk 文件选择器机制修复或考虑正式受信任宿主传输 API，同时保留逐命令审批。除非真实数据面通过，不开放生产传输。


## 本轮手工 ZIP 交付与二进制验收补充（2026-10-14 13:04+08）

用户反馈“ZIP 已放入 output”。只检查该 run 的 `output/`，发现真实文件名为 `favicon_io.zip`（32,259 bytes；修改时间 13:03），不是事先规定的 `favicon.zip`，故首次验收返回 `M3_AWAITING_MANUAL_DOWNLOADED_ZIP`。

对原始 `favicon_io.zip` 执行严格 `scripts/verify-favicon-package.py`：**VALIDATED_BINARY_STRUCTURE**，七个预期成员齐全：
- `apple-touch-icon.png`
- `favicon-32x32.png`
- `favicon-16x16.png`
- `favicon.ico`
- `site.webmanifest`
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`

在同一目录以独占文件创建模式复制原始 ZIP 为 `favicon.zip`，保留原件；两者字节完全一致，SHA256 均为：
`3764e4994d253f3ea24638e466d63196115b649eba141aaf57611a3fae513d89`。

原测试 PNG SHA256 为：
`cf4ea49fa3a8378c5f57ccdc050629ec522c5c544738cf1d74e25f4de16c1637`。

再次执行：
`node scripts/m3-manual-favicon.mjs verify m3-manual-favicon-ae172e2e-fd70-402e-ab39-2b0cc2c832f1`
结果退出码 0，`BINARY_VALIDATED_SITE_ORIGIN_UNVERIFIED`，验证证据：
`runs/m3-manual-favicon-ae172e2e-fd70-402e-ab39-2b0cc2c832f1/VERIFICATION-d24488b7-1118-4cf4-9182-698dc70af940.json`。

额外进行了**PNG 像素解码比较**：ZIP 内的 `android-chrome-512x512.png` 与本轮 `M3-TEST-ONLY-512.png` 的 RGBA 像素逐一比较，**262,144/262,144 完全一致（100%）**，角落像素 alpha = 0，支持“图像转换产物与本轮素材对应”这一技术结论。

**严谨结论：** 用户口头确认本次把 ZIP 放入 output，ZIP 格式校验及像素匹配通过；结合用户按约定流程操作的信息，可以将“favicon.io 手工功能验证”记为 **MANUAL_SITE_FUNCTIONAL_CHECK_PASSED_BY_USER_ATTESTATION**。但宿主没有记录网站签名或受控下载审计，不能独立证明站点来源，因此底层验证器的 `siteOriginVerified=false` 和 `manualSiteActionAttested=false` 保持不变。**bsk 自动上传/下载仍未修复，agent 首页 Skill 保持 BLOCKED，生产 `atomicFileTransferSupported=false`**。

本轮仅在隔离 run 内创建规范名称的副本和验收记录；没有更改飞书、原始 Skill、模板、游戏站、部署或 Chrome 设置。
