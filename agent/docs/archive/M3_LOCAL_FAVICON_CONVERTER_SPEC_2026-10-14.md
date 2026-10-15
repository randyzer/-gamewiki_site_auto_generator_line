# M3.9 本地 favicon ZIP 转换器：可实施技术规格（设计阶段）

日期：2026-10-14
状态：**SPEC_READY / IMPLEMENTATION_NOT_STARTED / DEPENDENCIES_NOT_INSTALLED**

## 目标和原则

在可信 Mac mini 宿主上，离线从**已获来源及视觉审核批准的真实 512×512 RGBA PNG**，生成符合现有原始首页 Skill 结构约束的 7 文件 favicon.zip。

这条路径属于 **LOCAL_FAVICON_CONVERSION_V1**，不能宣称经过 favicon.io 网站，也不能宣称 BrowserSkill 自动文件传输已修复。不复用含 TEST 字样的 M3.7 合成图标作为生产图标，不自动生成未经授权的品牌图案。

本方案与现有 M3.8 手工交接共存：输入图片的身份/来源验证共用同一套 host 审计，但转换渠道与证据分别记录。原始 Skill 的线上 favicon.io 要求若需要改为允许本地转换，应先得到用户对技能规范变更的单独批准；**本阶段不更改原始 Skill**。

## 实现技术

**推荐 Python Pillow + 标准库 zipfile / json / hashlib**。Pillow 为成熟、可维护的图像处理库；直接使用 `Image.open` / `Image.Resampling.LANCZOS` 进行安全重采样与 PNG 输出；利用 Pillow 的 ICO 保存能力编码多尺寸 `favicon.ico`；用 Python 标准库构建 ZIP。

现有 Mac mini 的 Python 环境检查发现 Pillow 未安装。**不在本次设计阶段自动安装系统/全局依赖**。实施前需确认可用 Python 版本、Pillow 稳定版本、安全公告、授权及许可，使用项目隔离 venv 和锁定依赖哈希；禁止污染系统 Python / 原始 Skills / 现有游戏网站。

## 输入合同

- `runId`、`gameIdentity`、`approvedSourcePath`（位于 agent 的限定 run/incoming 或经审核的人工作业 input 下）。
- 严格 512×512、8-bit RGBA PNG；真正的 alpha 通道、图片有透明边距；文件上限建议 8 MiB。
- 用户审核结果 `approved=true`；绑定源 PNG SHA256、run、游戏身份、受信任来源证明、时间戳、版本与审批记录，且仍需核验是否符合原始 Skill 对原创图标的要求。
- 以 O_NOFOLLOW/独占文件方式打开，拒绝符号链接/硬链接、越界、重复文件名、可疑 PNG 压缩数据、空图等。
- 输入文件不可被脚本修改，输出在当前 run 的隔离目录；不得覆盖既存 ZIP。

## 输出合同

以下文件必须齐全且仅有这七项，名称与已验证的 favicon.io 样例一致：

| 文件 | 格式与尺寸 |
| --- | --- |
| `favicon-16x16.png` | PNG 16×16，RGBA |
| `favicon-32x32.png` | PNG 32×32，RGBA |
| `apple-touch-icon.png` | PNG 180×180，RGBA |
| `android-chrome-192x192.png` | PNG 192×192，RGBA |
| `android-chrome-512x512.png` | PNG 512×512，RGBA，像素必须与输入逐点一致 |
| `favicon.ico` | Windows ICO，至少 16、32（建议 16/32/48），正确目录项与像素数据 |
| `site.webmanifest` | 有效 UTF-8 JSON，icon sizes 192×192、512×512，MIME image/png，路径安全且只引用 ZIP 内存在的图片 |

与 favicon.io 输出并不要求 ZIP **字节级完全相同**，因为 PNG 重采样编码、ICO 内部格式、ZIP 成员顺序和压缩参数可能不同。要求**结构与浏览器兼容性通过**，视觉预览与原像一致且确认正确归属。

## 具体实现流程

1. 宿主输入预检：身份、原始 PNG 哈希、视觉审批回执、只读解码安全阈值。
2. 生成 16/32/180/192/512 PNG；`LANCZOS` 重采样；注意预乘 alpha 的边缘 halo 测试；512px 原图保留解码像素，必要时重新编码。
3. 生成多尺寸 ICO；按 16/32/48 展示像素兼容性检查，必要时使用 PNG 内嵌的 ICO 编码方案。
4. 生成固定模板 Manifest。审查 favicon 名称、`short_name`、`theme_color`、`background_color` 为明确的配置值，不接受网页或任意 HTML 输入；不得植入 JavaScript。
5. 打包：ZIP 成员清单固定、固定 timestamp/权限/压缩参数，形成确定性产物。禁止路径穿越、符号链接及 ZIP bombs，限制 uncompressed total bytes。
6. 用现有 `scripts/verify-favicon-package.py` 进行二进制、ICO、PNG、manifest 检查；新增 `LOCAL_CONVERTER` 专项验收以对照源图像的 512px pixels、透明度、ICO 子图像与视觉缩略图。
7. 输出 `CONVERSION_RECEIPT.json`，至少包含 `runId`、游戏、`sourceSha256`、`zipSha256`、七成员清单、Pillow 版本、实现版本、转换配置、用户审批证据指纹、生成时间、`origin=LOCAL_FAVICON_CONVERSION_V1`、`faviconIoUsed=false`、`bskTransferUsed=false`。
8. 根据新规格在现有首页阶段启用本地转换（需用户另行批准修改原始 Skill 转换要求）。在批准前仅作为受控实验/备选架构，不能标记原始首页 Skill PASSED。

## 失败闭环

- 拒绝非 PNG、不同尺寸、非 RGBA、意外同名文件、无来源授权、哈希变更。
- 任一步骤失败 → BLOCKED，保留结构化错误码和有限审计，不清空原始文件；不以空白、SVG 或模拟图标回退。
- 原始 Skill 的真正图像生成能力仍与 favicon **格式转换**分开：本地转换只能解决「已有 PNG → ZIP」，不能凭空生成一张合格原创徽标。
- 不接触 Chrome、BrowserSkill、网页账户、Git、DNS、飞书、生产站点。

## 所需的测试/验收

- 金样：M3.7 的 synthetic TEST PNG 仅用于离线 golden fixture，绝不生产使用。
- 结构：现有 `verify-favicon-package.py` 全部通过，7 文件无多余成员。
- 幂等性：相同输入、同样的固定配置与依赖 → 二进制 ZIP SHA256 一致。
- 视觉：512px 逐像素一致；16/32px 在透明底深/浅主题上的缩略图可辨识性需要人检查。
- ICO：各入口尺寸正确，独立二进制解析器通过。
- 篡改：修改 PNG、manifest、ICO CRC、ZIP 或用户审批记录 → 明确拒绝。
- 安全：压缩炸弹、路径穿越、重复成员、已存在输出、链接输入 → fail-closed。
- 端到端：必须对**真实游戏身份**提供真实审核的 PNG、真实来源证明及完整首页研究 Markdown，才可以讨论将转换产物交给下游。

## 分期

- P0（本次）：规格文档、与 M3.7/M3.8 验证证据映射；不安装第三方依赖。
- P1（需审批引入 Pillow）：开发可信宿主 `m3-local-favicon-converter`、单元测试与定量图像验证；仍只输出测试运行目录。
- P2（需审批变更原始 Skill）：让正式技能接受 `LOCAL_FAVICON_CONVERSION_V1` 与 favicon.io 两种明确的可追溯转换来源，沿用原有文件命名/内容验证。
- P3：以一个真实游戏的审核图标完成全流程验收，解锁 favicon 转换瓶颈；其他浏览器阶段仍独立阻断。


## 后续实施状态补充（2026-10-14）

本规格创建时标记为 SPEC_READY。随后在 M3.11 阶段已经实际完成：Pillow 12.3.0 隔离虚拟环境、锁定 Mac ARM64 wheel SHA256、run 作用域 CLI、离线七文件生成、ICO/PNG/ZIP 和 512px 像素验收。完整结果见 `M3_LOCAL_FAVICON_CONVERTER_IMPLEMENTATION_2026-10-14.md`。但原始首页 Skill 的线上转换来源约束仍未修改，故不应称为正式 Skill 已通过。
