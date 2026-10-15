# M3.10 — BrowserSkill drop-first 专项测试与本地 favicon 转换器设计

日期：2026-10-14
当前状态：**DROP_FIRST_CODE_READY / REAL_TEST_LAUNCH_DENIED / LOCAL_CONVERTER_SPEC_READY**

## 一、测试范围

本次仅调整 `agent/`：
- `src/bsk-command-gate.mjs`：两种独立、可验证的 Drop 许可——既有 input 上传明确返回 `file_input_not_activated + effect_state=none` 的 fallback；与本轮隔离测试专用的 `drop-first` 授权。两者都约束 PNG SHA256、原路径、拥有者 session/tab、精确 favicon.io 页面、有效期，禁止任意页面/任意上传。
- `src/bsk-tool-server.mjs`：标准生产服务 `allowInitialFaviconDrop=false`；仅在受信任的独立 host-test 调用显式开启、真实 DOM 检查确认唯一且可见/包含文件输入框的 Dropzone、且此前没有上传尝试时，才授予一次性 Drop 许可。无论调用结果、拒绝、抛错，该授权都在首个 Drop 调用后消费，无法重放。
- `scripts/m3-favicon-transfer-smoke.mjs`：新增 `drop-first`，与历史上传失败的任何 session 分离；每一命令仍要 macOS 原生人工批准。Drop 命令若成功仍需要重新检查网站是否提供下载控件，再独立批准 ZIP 下载并运行现有 PNG/ICO/ZIP 检查、源图像像素对应检查。上传返回 `unknown`、`committed` 或 `unverified` 不会自动重试。
- `scripts/m3-visual-test-fixture.py`：仅为 `drop-first` 生成带本轮随机 runId 唯一颜色标记的 TEST PNG。不能将历史上传效果不明的同一份素材原样重传。
- `tests/favicon-transfer-host.test.mjs`、`tests/m3-visual-fresh-fixture.test.mjs`：成功路径、默认拒绝、错文件、文件篡改、重复上传及图片唯一性、禁止覆盖的离线单元测试。

**注意：** `config/bsk-command-policy.json` 的生产 `atomicFileTransferSupported` 保持 false。上述 `drop-first` 许可仅存在于当前受控测试服务内存中，不是 BrowserSkill 产品功能的通用放行。

## 二、真实浏览器测试结果

已在 Mac mini 实际尝试命令：

```sh
node scripts/m3-favicon-transfer-smoke.mjs drop-first
```

独立运行：
`runs/m3-favicon-drop-first-2a70e86c-368f-4082-981b-8205fbc5c89c/`

真实结果：
- `status=BLOCKED`
- `blocker=M3_TEST_LAUNCH_DENIED`
- macOS 启动确认窗口等待约 50 秒未获批准。
- `statuses=[]`；**无 BrowserSkill 命令执行、没有上传、下载或浏览器工具会话**。
- 该尝试在添加「每轮唯一 TEST 图」机制之前发生；因未获批准也没有实际上传。下一次将由脚本自动使用全新 runId、全新图片字节，绝不复用上述素材。
- 此次不能宣称 `--mode drop` 已经通过真实网站验收，不能打开生产传输开关。

## 三、本地转换器的启动方案

已形成 `M3_LOCAL_FAVICON_CONVERTER_SPEC_2026-10-14.md`，采用 **Python Pillow + Python 标准库**离线生成 seven-file favicon ZIP：
- 16/32 PNG、180 apple-touch、192/512 android-chrome、ICO、site.webmanifest；
- 输入 512 RGBA PNG，真实原创徽标来源与人工视觉审核必须先通过；
- 可复现 ZIP、固定成员清单、哈希、PNG/ICO/Manifest 验收及用户审批审计；
- 明确声明 `origin=LOCAL_FAVICON_CONVERSION_V1`，不能冒称经 favicon.io 转换；
- 不修改原始首页 Skill 的线上转换规则；实施依赖与修改原始 Skill 需要后续单独审批。

本机 Python 环境已检查：**Pillow 未安装**。本轮没有安装第三方依赖，没有交付已可用的本地转换器。

## 四、安全及后续步骤

后续当操作者能够及时批准 Mac mini 原生弹窗时，再使用**全新一次性** `drop-first` 命令做真实验证。成功条件必须同时具备：
1. 逐命令 macOS 授权记录。
2. `bsk upload --mode drop` 首次尝试返回可信 COMPLETED。
3. 网站显示真实转换/下载控件。
4. `bsk download` 后 ZIP 七文件及 CRC/ICO/PNG/Manifest 校验全部通过，512px 像素与合成 TEST 输入对应。
5. 自有浏览器窗口清理有独立批准和成功审计。

任何不可确认效果→BLOCKED，不重复传输。即便通过，只证明隔离测试数据面；仍需单独讨论生产能力授权以及完整首页 Skill 的图像来源。

本轮没有修改原始 Skills、模板、飞书、已有游戏站、GitHub、DNS 或生产部署。


## 五、最终测试回归

Mac mini 最终真实运行 `npm test`，结果：**254 pass / 0 fail / 0 skip，退出码 0**。日志：

`runs/m3-drop-first-local-design-final-regression-2026-10-14.log`

额外专项测试：`node --test tests/favicon-transfer-host.test.mjs tests/m3-visual-fresh-fixture.test.mjs`，15 pass / 0 fail。检查包括默认关闭、单次 Drop、上传素材路径及哈希、二次调用、每 run 唯一 TEST 图片、防覆盖行为等。

**严格区分**：
- `drop-first` 的代码及离线授权门已经通过测试。
- 真实浏览器会话启动被人工审批超时拒绝，尚不能确认 bsk drop 是否能与 favicon.io 兼容。
- 本地转换器已有正式规格文档，但依赖未安装、代码未完成，不能宣称为可运行的转换器。
- 生产传输标志 `config/bsk-command-policy.json` 仍为 `false`。


## 六、人工批准后的真实 Drop 首次上传验收（2026-10-14 13:56 CST）

本次用户明确要求“开始 Drop 真实验收”，真实开启了新隔离运行：

`runs/m3-favicon-drop-first-5848689a-b916-4f52-9a18-1ba8b77e471a/`

关键审计：

- Mac BrowserSkill 扩展权限：`ENABLED`，版本 `0.3.2`；生产 `atomicFileTransferSupported=false`。
- 使用本次 runId 唯一标记的 synthetic TEST PNG，SHA256 `2e4782014bf644932863bc9a57a2b08ab869d4ffb32b76b48a437f43c42107b4`；实际上传命令审计所记录的 SHA256 与源文件一致，宿主隔离快照实际存在。
- `session-start`、`owned-tabs`、`navigate-favicon`、`inspect-controls`：全部 **APPROVED + COMPLETED**。
- favicon.io DOM：一个 `input[type=file]`，可见、未禁用；唯一可见、包含 file input 的 `[class*="dropzone"]`；没有可见 label 关联；上传前未出现下载控件。
- **实际执行首次上传**：`bsk upload --selector '[class*="dropzone"]' --mode drop --file HOST_TEST_PNG --session OWNED --tab-id OWNED --timeout 18s --json`。人工命令审批为 `APPROVED`，CLI 返回 `COMMAND_TIMEOUT`、`cliExitCode=3`、`reasonCode=TRANSFER_BROWSER_SELECTOR_OR_INPUT`、`bskReason=UNVERIFIED`、`effectState=unverified`，stderr 为 0 字节。注意 reasonCode 是宿主依据错误文本进行的**泛化分类**，不能证明网页实际状态。
- 因 effectState 未被明确证实为 none，本次**没有第二次上传，也没有进入 ZIP 下载**。
- `session-stop` / `close`：单独获得审批并 `COMPLETED`，`ownedWindowClosed=true`。
- 最终 `BLOCKED / M3_UPLOAD_NOT_COMPLETED`；运行进程退出码 2。全部命令审计与 `SMOKE_RESULT.json` 在以上 run 目录。

**验收结论：BrowserSkill 0.3.2 的原生 Drop 首次上传也未通过 favicon.io 的真实数据面验收。** 先前 input 与这次 drop 均超时，且没有可验证的 effect_state。已证实手工网站转换成功，不代表 BrowserSkill CLI 传输成功。当前不建议在同一页面继续猜测 selector/盲目重试；后续优先排查 BrowserSkill 本身文件暂存与扩展 RPC 的准确故障层，或者走经单独批准的本地 favicon 转换实现。保持已有 M3.8 人工交接作为可用 fallback，原始首页 Skill 与生产策略不变。
