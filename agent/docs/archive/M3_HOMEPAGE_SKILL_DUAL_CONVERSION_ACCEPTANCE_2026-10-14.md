# M3.12 — 正式首页 Skill 图标转换双路径规则实施与验收

日期：2026-10-14（CST）
状态：**IMPLEMENTED / OFFLINE_AND_UNIT_VALIDATED / REAL_GAME_ICON_NOT_YET_ACCEPTED**

## 批准与范围

用户明确批准将原始 `game-homepage-icon-research` Skill 的**转换规则**由单一 favicon.io 改为“favicon.io 在线转换，或经宿主审计和完整二进制验收的本地转换”。

本次因此**特别授权**仅修改原始 Skill 的下列三个文件：

1. `codex-skills/game-homepage-icon-research/SKILL.md`
2. `codex-skills/game-homepage-icon-research/references/icon-workflow.md`
3. `codex-skills/game-homepage-icon-research/scripts/validate_outputs.py`

并同步更新 Agent 内相应宿主检查和锁定 Skill inventory。未修改其他七个原始 Skill、游戏站、模板、飞书、GitHub、DNS 或部署。

## 双路径规则

两条路径互斥，不允许同一 run 同时声明或使用两条：

### A — favicon.io（原有路径保留）

由独立审批的浏览器命令上传、下载，或通过用户明确确认的 favicon.io 手工交接。严格保留 512px 原图、下载 ZIP、文件哈希、512px 图像对应及明确的来源表述。手工交接是 **USER-ATTESTED**，不冒充已独立认证 favicon.io 来源，也不宣称 bsk 文件自动化已经修复。

### B — LOCAL_FAVICON_CONVERSION_V1（新增）

在已有 Agent run 的 `runs/<RUN_ID>/m3-local-favicon/` 下：

```sh
node scripts/m3-local-favicon.mjs prepare RUN_ID
node scripts/m3-local-favicon.mjs inspect RUN_ID
# 用户亲自审核图片、SHA256及其原创来源/使用权后：
node scripts/m3-local-favicon.mjs approve RUN_ID SOURCE_SHA256 I_CONFIRM_ORIGINAL_GENERATED_ARTWORK_AND_RIGHTS
node scripts/m3-local-favicon.mjs convert RUN_ID
# 对相同的原始任务卡和 run 作显式 retry
```

要求：Pillow 12.3.0 在项目隔离 venv 内执行；master 512×512 RGBA、真实透明边缘；用户显式审核和原创/使用权声明绑定源文件 SHA256、runId、gameIdentity、请求摘要；引擎收据和最终收据哈希一致；七文件 ZIP 的完整 PNG/ICO/Manifest/CRC 验证通过；ZIP 中 512px 图像与原始 master 像素匹配；worker 最终保存至 `nativeDirectory/backgroundinformation/{gameIdentity}图标.zip` 的 ZIP 必须与宿主 ZIP SHA256 一致。

原始 Skill 验证器新增：

- `--conversion-mode favicon-io`（兼容原有调用，作为默认）
- `--conversion-mode local --conversion-receipt /abs/CONVERSION_RECEIPT.json`
- 本地模式拒绝缺失/跨游戏、过期或与 ZIP 不匹配的转换收据。
- 双路径都拒绝多余、重复、加密、超限和危险成员；不再接受“只要预期七成员包含在内”。
- 真正的用户批准和来源链由 **Agent 可信宿主**查验；单独手写的 JSON 不构成批准。

### 不变的要求

- 必须使用真正原创/获授权、经人工视觉核验的 512px 游戏图标。**本地转换器只转换，不生成原创徽标。**
- 必须完成准确的游戏身份、公开信息调研、来源链接、完整首页 JSON、SEO 字段、颜色及本地化要求。
- 仅 ZIP 合格**不能**自动让首页阶段 `PASSED`；浏览器页面和真正图像生成工具的调用不得伪造。
- 用户对原创/使用权的声明属于 `USER_ATTESTED`，不是独立的图像生成工具认证；阶段证据必须如此标记，不得夸大。
- BrowserSkill 真实文件上传仍是独立 `BLOCKED`；生产 `atomicFileTransferSupported=false`，不因本地转换解锁。
- 两种转换方式都使用现有 `WAITING_FOR_USER` / 显式 `retry` 状态机。缺失、无效或被篡改的文件会等待或阻断，不会无人值守恢复。

## Agent 适配与验收

新增 `src/m3-local-favicon-handoff.mjs`，每次本地输入/收据完整性检查均验证游戏身份、run 和用户批准源 SHA256、引擎收据、最终 ZIP、PNG 解码像素。修改 `src/skill-executor.mjs` 使旧手工和新本地转换互斥，禁止不明 run 身份或签名的 ZIP 冒充宿主产物。修改 `src/artifact-validator.mjs` 传入正确的转换模式及本地收据位置，**仍运行原始 Skill 验证与 Agent 严格二进制验证**。

新增 `tests/m3-dual-favicon-skill.test.mjs` 覆盖：真实 local 运行的原始 Skill 验证器成功、漏收据/错游戏/错误模式拒绝；待源、待审批、待转换时等待；正确宿主 ZIP 绑定；跨游戏不可复用；同时启用两条模式阻断；ZIP 内容篡改失败；worker 伪造 ICON.zip 无法通过。

修改 `scripts/m3-local-favicon.mjs`、`scripts/m3-local-favicon-engine.py`，新增 **明确原创生成及使用权声明**，同时标注 `imageGenerationIndependentlyVerified=false`，不会声称本地转码生成了原创图标。此前单纯 SHA256 视觉批准不再足以激活新版本地来源。

## Skill inventory 与既有 run

已重算 `agent/config/skill-manifest.json`，并将修改前备份保存于
`agent/runs/m3-dual-skill-inventory-before-2026-10-14.json`。

与旧清单对比，**仅 game-homepage-icon-research 的 Skill 条目发生变化**，其余七个 Skill 的 sha256 和文件清单保持一致。

由于旧 run 采用不可变 Skill lock，已有 run **没有修改或迁移**。已经锁定旧 Skill 内容的 run 在新清单下不能被静默升级；应新建 run 或明确设计基于哈希差异的迁移审核流程。不能直接重写历史 run 的 manifest、批准回执或研究证据。

## 边界与验收状态

本轮执行的是隔离 synthetic 测试，没有真实游戏的图标生成或完整首页调研端到端成功证据，不能将真实首页 Skill 报告为 PASSED。旧 M3.7 合成 TEST favicon **绝不能**作为正式游戏品牌产物。

`config/bsk-command-policy.json` 的 `atomicFileTransferSupported` 继续保持 false。

完成后续真实游戏验收仍需要用户提供具有可靠来源的原始游戏徽标，亲自确认其视觉效果及原创使用权、绑定 SHA256，完成最新游戏事实调研，并在明确独立审批下恢复原始 Pipeline。

## 最终测试记录

Mac mini 执行 `npm test`，**265 项通过、0 失败、0 跳过，退出码 0**。

日志：`runs/m3-homepage-dual-source-final-2026-10-14.log`。

新版重点测试（`tests/m3-dual-favicon-skill.test.mjs`）5/5 通过；
涉及宿主单路径/互斥、真实本地 ZIP 构造、原始 Skill 正反验证、跨游戏冒用拒绝、ZIP 篡改拦截和 worker 伪造拒绝。

原始 Skill Git 工作区恰好修改 `SKILL.md`、`references/icon-workflow.md`、
`scripts/validate_outputs.py` 三个已批准文件；`git diff --check` 无格式错误。
无 Git commit、push 或上游仓库发布。
