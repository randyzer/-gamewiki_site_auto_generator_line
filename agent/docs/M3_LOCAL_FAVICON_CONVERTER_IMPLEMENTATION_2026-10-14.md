# M3.11 — 本地 favicon 转换器实现与验收

日期：2026-10-14
状态：**EXPERIMENTAL_LOCAL_CONVERTER_IMPLEMENTED / OFFLINE_BINARY_VALIDATED / ORIGINAL_SKILL_NOT_CHANGED**

## 1. 本轮范围

全部改动限定在 `agent/` 内；未修改原始 Skills、已有游戏站、飞书、部署、GitHub、DNS 或生产 BrowserSkill 传输策略。

本地 favicon 转换器现在真实可运行，不是仅完成设计：

- `scripts/m3-local-favicon.mjs`：已有 run 专属入口 `prepare / inspect / approve / convert`，要求现有 Pipeline 的首页研究阶段尚未 PASSED，按 run/game 身份核对并检查源 PNG 的哈希与人工确认。
- `scripts/m3-local-favicon-engine.py`：Pillow 12.3.0 + 标准库 `zipfile`。输出 7 个固定成员：favicon-16x16.png、favicon-32x32.png、apple-touch-icon.png、android-chrome-192x192.png、android-chrome-512x512.png、favicon.ico、site.webmanifest。
- `scripts/m3-install-favicon-deps.sh`：仅在 Mac arm64 / Python 3.12 的 `agent/.venv-favicon/` 安装隔离依赖，不污染系统环境。
- `deps/requirements-favicon.lock.txt`：锁定 Pillow==12.3.0 及轮子文件 SHA256。
- `deps/m3-favicon-downloads/pillow-12.3.0-cp312-cp312-macosx_11_0_arm64.whl`：本机隔离保存的官方 PyPI wheel 文件，可用于后续离线安装。
- `tests/m3-local-favicon-converter.test.mjs`：隔离合成素材生成、接口/审批、重复执行、来源/哈希校验及 ZIP 二进制/图像验收测试。

轮子哈希：`ffd0c5368496f41b0944be820fcb7a838aa6e623d250b01acf2643939c3f99d7`。

## 2. 数据安全及来源规则

转换严格限定在已有 Pipeline run：

`runs/<RUN_ID>/m3-local-favicon/input/master-512.png`

转换成功后：

`runs/<RUN_ID>/m3-local-favicon/output/favicon.zip`

验收与审计：

`runs/<RUN_ID>/m3-local-favicon/CONVERSION_RECEIPT.json`

要求：

1. `manifest.json` 中 run/game 身份匹配且首页阶段尚未 PASSED；
2. 512×512、8-bit RGBA 源 PNG 可解码、至少一个完全透明像素和至少一个完全不透明像素、四角透明，源文件不被修改；
3. `REQUEST.json` 确定任务身份与输入输出路径；用户必须目视审核，并主动使用 `approve RUN_ID SOURCE_SHA256` 提交完全一致的哈希，不能把“生成测试图”当成用户真实审核；
4. 来源审批指纹、源 PNG SHA256、ZIP SHA256、Pillow 版本、七成员列表固定记录；输出使用排他方式创建，拒绝已存在文件和符号链接；
5. 生成后使用既有 `verify-favicon-package.py` 做 PNG、ICO、CRC、Manifest、七成员严格校验，并用 `m3-compare-favicon-pixels.py` 逐像素比较原始和 ZIP 内的 512px 图像；
6. ZIP 内像素匹配不意味着真实游戏图标原创/商标审核已通过；
7. 由本地引擎产生的任何 receipt 都标识 `origin=LOCAL_FAVICON_CONVERSION_V1`、`faviconIoUsed=false`、`bskTransferUsed=false`、`siteOriginIndependentlyVerified=false`、`stageMayPass=false`。

原始首页 Skill 仍要求线上 favicon.io 流程；**本轮没有更新那个规范，也没有开启生产调用此转换器的权限**。日后要把本地结果当作首页 Skill 合格交付，必须单独批准转换来源规范变更和真正游戏素材来源验收。

## 3. 实际用法（只限已有合法 run）

在 `agent/` 下：

```sh
# 1. 创建收件位置，不自动生成真实游戏徽标
node scripts/m3-local-favicon.mjs prepare RUN_ID

# 2. 将真人审核的游戏 master-512.png 放入输出指定的 input/ 目录
node scripts/m3-local-favicon.mjs inspect RUN_ID

# 3. 仅用户明确确认 SHA256 后
node scripts/m3-local-favicon.mjs approve RUN_ID SOURCE_SHA256

# 4. 在隔离目录生成已验证的本地 ZIP
node scripts/m3-local-favicon.mjs convert RUN_ID
```

如需在另一台**同架构的 Mac**重建 Pillow venv：

```sh
zsh scripts/m3-install-favicon-deps.sh
```

当前无须联网即可从项目内已哈希锁定的 wheel 完成同环境安装。

## 4. 测试结果

Mac mini 真实执行 `npm test`：

**260 项通过、0 失败、0 跳过，退出码 0**。

日志：`runs/m3-local-favicon-all-tests-2026-10-14.log`。

`tests/m3-local-favicon-converter.test.mjs` 新增 6 项：等待人工审批、七成员生成和真实二进制验收、512px 逐像素一致、ICO 内部 16/32/48px 解码、确定性 ZIP SHA256、已批准源改动/符号链接拒绝、不覆盖旧 ZIP。

测试素材为 synthetic TEST 图像，测试中自动创建并清理临时 run，**不是实际游戏品牌素材**。没有执行在线 favicon.io 上传/下载，没有得到自动 BrowserSkill 文件传输的实测成功。

## 5. 后续

- 若希望立即批量使用本地转码，需要确认允许修改原始首页 Skill 的转换源合同（从只接受 favicon.io 扩展为明确记录 `LOCAL_FAVICON_CONVERSION_V1` 和 `USER_APPROVED` 的双路径）。
- 图标生成功能、版权/视觉核验和完整首页研究报告仍是单独验收任务；本转换器仅解决格式处理。
- BrowserSkill 兼容问题独立继续追踪，参见 `M3_BSK_TRANSFER_READONLY_FORENSICS_2026-10-14.md`。


## 2026-10-14 后续授权实施状态

此报告撰写时原始 Skill 仍不接受本地转换。用户随后明确批准该 Skill
增加 `favicon.io / LOCAL_FAVICON_CONVERSION_V1` 双路径。规则修改、宿主
严格验收、库存哈希更新及 265 项全量测试记录见
`M3_HOMEPAGE_SKILL_DUAL_CONVERSION_ACCEPTANCE_2026-10-14.md`。
历史测试及合成素材仍不可冒充真实游戏原创图标。
