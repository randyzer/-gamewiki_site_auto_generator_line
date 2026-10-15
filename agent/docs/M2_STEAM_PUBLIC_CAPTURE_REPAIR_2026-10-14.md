# Steam 公开页面提取器专项修复与真实验收

日期：2026-10-14  
状态：**REAL_HOST_STEAM_CAPTURE_PASSED / FULL_HOMEPAGE_SKILL_NOT_VALIDATED**

## 1. 故障与修复

旧运行 `runs/m2-trusted-host-smoke-3c842357-c1ac-4b63-851e-631db391fc23/`：逐命令审批、Steam 导航和窗口清理都成功，但只接受 `STEAM_PUBLIC_GAME_JSON_LD_V1` 的 observe 返回 `PUBLIC_CONTENT_UNVERIFIED`。原审计没有更细原因，不能断言页面完全不存在 JSON-LD。

本次为 `src/bsk-command-gate.mjs` 增加**受限 Steam 公共元数据 fallback**，不降低页面/游戏身份校验：

- 首选唯一准确匹配的 schema.org `VideoGame` 或 `Product` JSON-LD。
- 无可用 JSON-LD 时，独立检查实际 HTTPS Steam App URL、Steam 页面上精确的游戏名或 OpenGraph URL、精确 OG 游戏标题、非空受限公开 description。拒绝错误 App ID、跨游戏信息、账号页、年龄验证页、缺失身份、含敏感 query 的 URL、歧义 JSON-LD 和页面跳转。
- 新来源单独标记为 `STEAM_PUBLIC_GAME_META_V1`，只允许 `name`、`url`、`description`，严格限长。旧 `STEAM_PUBLIC_GAME_JSON_LD_V1` 保持原样。
- 仍不读取 `document.body.innerText`、cookie、LocalStorage、个人资料、账号菜单、任意 script 或整页 HTML。宿主校验重建内容并剔除额外字段。
- 提取失败时仅保留预定义原因枚举，不写入页面的任意文本。更新 `src/trusted-browser-host.mjs` 和 `src/host-browser-evidence.mjs` 对独立来源 schema 的兼容。

## 2. 实际运行验收（非 Mock）

运行命令：在 agent 根目录执行 `node scripts/browser-trusted-host-smoke.mjs`，Mac 宿主通过人工确认弹窗逐次批准每条命令。

真实运行目录：

`runs/m2-trusted-host-smoke-36f3e6c0-2cc4-443e-b957-6fd26f1fc974/`

结果：

- 运行状态 `EVIDENCE_READY`，程序退出码 `0`。
- session start、owned tab list、Steam navigate、public observe、session stop **五个步骤全部 `APPROVED / COMPLETED`**；独立窗口已关闭。
- 真实返回来源类型：`STEAM_PUBLIC_GAME_META_V1`（确认本次实际走了新 fallback，而不是伪造 JSON-LD）。
- 游戏名：`Bodycam`；公开来源 URL：`https://store.steampowered.com/app/2406770/Bodycam/`。
- 宿主签出的公开字段仅为 `name`、`url`、`description`。
- 源文件：`runs/m2-trusted-host-smoke-36f3e6c0-2cc4-443e-b957-6fd26f1fc974/HOST_APPROVED_STEAM_EVIDENCE_2ef1d836-a5d5-4105-a056-e57b3d236120.json`。
- 来源证据 SHA256：`062e6d55592dce9b4fdb5f9e46442728b38981520a9e9742f20bd25f24191b64`；本机权限 `0400`。
- bsk-audit 中有 5 条独立实际审批记录，均通过且成功执行；未生成完整首页产物，没有 `manifest.json`，未启动 Codex Skill worker 或更改游戏站。

## 3. 验收与边界

新增/更新测试：

- `tests/steam-meta-fallback.test.mjs`：公开字段白名单、强身份匹配、注入过滤、歧义结构化数据、年龄验证和页面跳转、失败的安全原因码。
- `tests/trusted-browser-host.test.mjs`：经宿主通过 `META_V1` 来源传递，仍不自动判定 Skill 通过。
- `tests/host-browser-evidence.test.mjs`：隔离候选 `META_V1`，仍不批准 worker 和阶段。

**重要：此次只证明“在可信宿主逐命令人工审批下读取到 Steam 公开事实”已经真实可用。** 首页 Skill 还需要完整调研资料、图标 PNG、favicon ZIP、原生文件验收。关键词调研、UI 审计、上线前验收三个浏览器阶段仍没有使用本次宿主采集适配器。生产部署、DNS、GitHub、广告和飞书均未修改。

本次修改文件局限于 `agent/`。真实网页已经在已批准的独立窗口读取，没有使用 shell/curl 或其他浏览器绕过审批。


## 4. 最终全量回归

2026-10-14 在 Mac mini 上运行 `npm test`，退出码 `0`：**201 项测试通过、0 失败、0 跳过**。原始测试日志：

`runs/m2-steam-meta-final-regression-2026-10-14.log`

本轮真实浏览器验收和项目回归均通过。未对原始游戏站、飞书、原始 Skill、模板、GitHub、DNS 或生产部署进行更改。
