# M3 — 首页图标生成、favicon.io 文件传输与原生产物验收

日期：2026-10-14
状态：**PARTIAL / BINARY_VALIDATION_READY / SOURCE_PROVENANCE_BLOCKED**

## 本轮完成

1. 新增 `scripts/verify-favicon-package.py`。它执行七成员精确名单校验、重复成员拒绝、ZIP CRC / decompressed-size 限制、PNG 真实图像头和 512/192/180/32/16 尺寸校验、PNG chunk CRC、像素解压及 scanline filter 基础校验、favicon.ico 结构校验、site.webmanifest icon references 校验。只证明**二进制结构有效**，不证明图标原创性或来自 favicon.io。
2. 将上述验证加入 `src/artifact-validator.mjs` 的真实首页 Skill 原生产物验收路径。此前仅凭七个文件名 + ZIP CRC 就可通过的文本占位 ZIP 会被拒绝。原始上游 `codex-skills/` Skill 与其 Python 验收脚本未修改。
3. 新增 `src/m3-icon-gate.mjs` + `scripts/m3-icon-intake.mjs`：可查看真实能力阻断；候选 512px RGBA PNG 必须从 `runs/<runId>/incoming/` 被隔离至只读审查区（原样字节及 SHA256）；候选 ZIP 只能得到结构合格状态。**二者都不计入 stage artifact，不自动批准转换或阶段验收。**
4. 在 `src/skill-executor.mjs` 的真实首页执行入口增加 fail-closed：Codex worker 即便返回 `PASSED`，没有已经验证的生成/转换能力时也返回 `BLOCKED`，不能靠构造看似完整的文件让管道误放行。
5. 测试增加 `tests/favicon-package.test.mjs`、`tests/m3-icon-gate.test.mjs`；已有 `tests/artifact-validator.test.mjs` 使用明确标记为 **SYNTHETIC OFFLINE FIXTURE** 的合法图片二进制测试 ZIP，而不再使用假文本。这是自动化测试数据，不得当作真实 Logo / favicon.io 产物。测试资源：`tests/fixtures/favicon-binary-fixture.py`。

## 实际能力核对和未完成项

- Mac 上 `bsk 0.3.2` CLI 确实有 `upload`、`download` 命令，但当前 `config/bsk-command-policy.json` 的 `atomicFileTransferSupported` 为 false，且 `src/bsk-tool-server.mjs` 显式拒绝这两类调用。**两道门都未放开**。
- Codex worker 里尚无经证实可回调的实际图像生成工具。不能用 Python 绘制、SVG、本地图形或者测试用的透明 PNG 冒充模型 logo-brand 生成。
- 用户只批准了 M3 开发，不意味着已经批准替其向 favicon.io 上传任何真实图像、下载正式 ZIP 或写入网站源码。文件交接仍需要具体图像、目标及逐命令批准。
- 目前没有真实 `favicon.io` 上传/预览/下载审计证据、生成器回执、原始品牌 logo 人工视觉审查。故 `game-homepage-icon-research` **尚不可判定 PASSED**。
- Steam 公开网页事实采集在前一轮已经有真实独立审批和验证，但与 PNG/ZIP 能力不同，不能互相替代。

## 操作

在 agent 根目录：

```sh
node scripts/m3-icon-intake.mjs status
node --test tests/favicon-package.test.mjs tests/m3-icon-gate.test.mjs
npm test
```

预检预期返回 `BLOCKED`，给出两个仍需解决的 blocker：

`IMAGE_GENERATION_CALLBACK_UNAVAILABLE`

`FAVICON_ATOMIC_TRANSFER_NOT_VERIFIED`

当真实图片已经通过受信任图像生成工具创建、人工核对并保存在 `runs/<runId>/incoming/master.png` 后，使用：

```sh
node scripts/m3-icon-intake.mjs inspect-master RUN_ID /absolute/path/to/agent/runs/RUN_ID/incoming/master.png
```

该入口只将原字节隔离待人工复核，**不会自动把图标标记为生成成功**。类似地：

```sh
node scripts/m3-icon-intake.mjs inspect-zip RUN_ID /absolute/path/to/agent/runs/RUN_ID/incoming/favicon.zip
```

仅验证 ZIP 二进制完整性，不把本地文件冒充从 favicon.io 真实下载。

## 下阶段解除阻断的验收标准

1. 由受信任图像工具实际生成一枚与游戏身份对应、原创、透明背景、512x512 的 Logo；确认 16px 可读性、边缘安全留白和生成器出处，记录文件 SHA256 和人工视觉批准。
2. 在 Mac 宿主（不在没有工具级审批能力的 Codex 子进程）调用 `bsk`，逐命令人工批准，限定 `https://favicon.io/favicon-converter/`。只对唯一确认的文件输入和正确的 Download package 控件操作；验证上传文件的实际哈希和预览。
3. 下载到宿主隔离临时文件，验证来源、下载完整性、文件哈希、一致的 runId 和窗口/session 归属；独立批准并完成关闭窗口。只在真实可验证时才修改文件传输能力配置。
4. 完整验证最终原生 Markdown、favicon ZIP 和文件来源审计，再让 `pipeline.mjs` 第一阶段进入 PASSED。没有任何单项可以代替其他项。

M3 不修改飞书、现有游戏站、原始 Skills、模板、GitHub、DNS 或部署。
