# 总控浏览器能力接入验收报告

日期：2026-10-15（Asia/Taipei）。分支：`feat/host-browser-stages`。未 push、未部署；`codex-skills/` 与 `main`（`5c1bcaf`）完全一致。指定四个净效果为零的提交已从当前分支历史移除，有效提交已 rebase 到 main。

**四步实现与验收已完成，供 Claude 审查。** inventory 校验通过，审查修复后全量测试 548/548 通过（原始基线 478 项，累计新增 70 项；本轮新增 8 项）。两个模板及公开游戏页面的真实验证通过，未调用真实 Codex worker。

## 提交与文件

| 步骤 | 提交 | 文件 |
| --- | --- | --- |
| 1：安装与生产预览 | `b050716` | `agent/package.json`、`agent/package-lock.json`、`agent/src/site-preview-host.mjs`、`agent/src/skill-executor.mjs`、`agent/src/pipeline.mjs`、`agent/src/orchestrator.mjs`、`agent/tests/site-preview-host.test.mjs`、`agent/tests/pipeline.test.mjs` |
| 2：audit-only UI 审计 | `b082d8f` | `agent/src/playwright-register.mjs`、`agent/src/playwright-resolve.mjs`、`agent/src/site-evidence.mjs`、`agent/src/site-audit-host.mjs`、`agent/src/skill-executor.mjs`、`agent/src/worker-permissions.mjs`、`agent/src/artifact-validator.mjs`、`agent/tests/site-audit-host.test.mjs`、`agent/tests/artifact-validator.test.mjs`、`agent/tests/skill-executor.test.mjs` |
| 3：上线前巡检 | `f5bd425` | `agent/src/prelaunch-host.mjs`、`agent/src/skill-executor.mjs`、`agent/src/worker-permissions.mjs`、`agent/src/artifact-validator.mjs`、`agent/tests/prelaunch-host.test.mjs`、`agent/tests/skill-executor.test.mjs`、`agent/tests/artifact-validator.test.mjs` |
| 真实验证发现的审计退出码修复 | `e8c0b68` | `agent/src/site-audit-host.mjs`、`agent/tests/site-audit-host.test.mjs` |
| 4：首页代抓和有界重跑 | `0a61dbc` | `agent/src/homepage-source-host.mjs`、`agent/src/skill-executor.mjs`、`agent/src/worker-permissions.mjs`、`agent/tests/homepage-source-host.test.mjs`、`agent/tests/homepage-host-executor.test.mjs`、`agent/tests/browser-host-executor.test.mjs`、`agent/tests/skill-executor.test.mjs`、`agent/tests/homepage-media-host.test.mjs`、`agent/tests/entry-host-bootstrap.test.mjs`、本报告及验证摘要 |

安装记录写入 run 的 `site-dependencies.json`，并保存到内容阶段 checkpoint；真实执行器向既有 pipeline 提供安装函数，离线替身可注入。内容阶段重试不会再次安装。`projectDigest` 对 `node_modules` 的排除保持原样。

第 5、6 阶段各自构建并启动生产预览，结束或异常时在 finally 中停止。worker 只读取 host 证据并写指定报告文件；命令网络关闭，浏览器功能关闭，仅开放截图查看。UI optimize 仍被阻止。证据逐文件 SHA256 在 worker 返回后验证；上线前报告的路由集合也与 host 实际采集集合核对。

## TDD 和全量验收

每项新行为先运行失败测试，然后实现。首次失败日志保存在本机 `/tmp/host-browser-step2-red.tap`、`/tmp/host-browser-step3-red.tap`、`/tmp/host-browser-step4-capture-red.tap`；第 1 步的失败输出见本聊天工具记录。严格视口、host 路由覆盖和退出码 2 的回归测试也先观察到失败。

每次验收均运行：

```sh
cd /Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line/agent
node src/cli.mjs inventory && node --test tests/*.test.mjs
```

| 验收点 | 通过 | 失败 |
| --- | ---: | ---: |
| 原始基线 | 478 | 0 |
| 第 1 步 | 487 | 0 |
| 第 2 步 | 494 | 0 |
| 第 3 步 | 500 | 0 |
| 审计退出码修复 | 501 | 0 |
| 第 4 步接入前，含独立抓取模块 | 526 | 0 |
| 第 4 步接入时，两处待更新旧断言 | 538 | 2 |
| 第 4 步最终验收 | 540 | 0 |
| 审查修复（摘要与进程环境） | 548 | 0 |

新增测试包括：锁文件选择和 SHA256、缺锁/安装失败、生产 start 参数、超时脱敏及进程清理、安装时机和重试、跨目录 ESM hook、PUBLISHED 路由与非法路由、固定视口、证据篡改和 worker 异常、预览失败等待及 optimize 阻止、sitemap 与页面并集、全站链接递归、截图尺寸、console/pageerror/requestfailed、项目脚本顺序和失败退出码、host 路由覆盖。

第 4 步另有 31 项独立抓取测试及 8 项执行器测试，覆盖 HTTPS、IP/localhost/内网 DNS、网盘和破解种子站、25 URL 上限、30 秒导航预算、200KB UTF-8 正文、空 cookie context、直接阻断带 cookie/auth 的请求（不依赖 Chromium 忽略的 Cookie 请求头覆盖）、禁止提交/点击/下载、逐 URL 失败、危险最终 URL，以及重复抓取清除旧截图。执行器测试覆盖两个操作的两种先后顺序、同时请求、重复请求上限、证据只读与 SHA256、无证据时拒绝成功，以及失败时保留可操作原因。一次执行中抓取、图标转换各最多一次，worker 最多三轮。另已增加 DNS 整体超时、迟到浏览器清理、编码扩展名、localhost 末尾点和 HTTP 404 的先失败回归测试。

## 真实验证命令与结果

使用现有 GitHub 快照缓存 `5c1bcaf3378c24fd219464092383fcdb32dff855`，先通过 `verifyTemplateSnapshot` 核对 HEAD 和干净状态；用原 Skill 的 `copy_template.py` 复制，不修改 Skill。复制后确认没有 node_modules。临时项目通过 finally 清理。

本机实际执行：

```sh
cd /Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line
node /tmp/verify-host-browser-stages.mjs
node /tmp/verify-homepage-host.mjs
```

两个验证脚本仍在本机 `/tmp/`，不属于产品代码；模板脚本依次调用原版 copy_template.py、installDependencies、buildAndServe、collectSiteAudit、再次 buildAndServe、collectPrelaunch。

| 模板 | 安装退出码 | UI 截图 | 巡检路由 | 巡检截图 | HTTP 检查 | 站内链接 | typecheck/test/build | 页面采集失败 | 临时目录清理 |
| --- | ---: | ---: | --- | ---: | ---: | ---: | --- | ---: | --- |
| temp1（src/app） | 0 | 6 | 15/15 | 32 | 18 | 16 | 0/0/0 | 0 | 完成 |
| temp3（app） | 0 | 6 | 15/15 | 32 | 17 | 15 | 0/0/0 | 0 | 完成 |

这两个模板没有 lint 脚本，所以未运行不存在的命令。验证用 CONTENT_PAGE_MANIFEST 是仅含首页 PUBLISHED 的测试替身，全站其他页面来自模板真实 sitemap。上述结果证明 host 采集链路可运行，不代表模板通过 UI 或上线验收：temp1 的 UI 脚本确实报告 2 项 HIGH。原脚本在有 BLOCKER/HIGH 时退出 2，host 现在保留此证据和退出码，让 worker 按问题真实判定，不将其误当成浏览器启动失败。

首页公开抓取结果：

| 页面 | HTTP | 标题 | 正文 UTF-8 字节 | meta 数 | JSON-LD 数 |
| --- | ---: | --- | ---: | ---: | ---: |
| Steam 431960 | 200 | Wallpaper Engine on Steam | 5027 | 23 | 0 |
| https://www.wallpaperengine.io/en | 200 | Wallpaper Engine: Animated Wallpapers on Windows | 3494 | 53 | 3 |

两页正文均含 Wallpaper Engine，生成 2 张经 PNG 文件头核验的截图，5 个证据文件有 SHA256。最新验证从 createSkillExecutor 入口执行：替身 worker 第一次规划 URL，总控真实抓取，第二次替身 worker 读取传回的 context；两轮均为 network=false，没有调用真实 Codex worker，最终 BLOCKED 明确表示替身没有制作原生首页研究/图标，不是采集失败。临时抓取目录已清理。

原始摘要：`/tmp/host-browser-real-verification.json`、`/tmp/homepage-host-real-verification.json`；日志：`/tmp/host-browser-real-verification.log`、`/tmp/homepage-host-real-verification.log`。

## 与附件的差异及原因

1. `agent/tests/browser-host-executor.test.mjs` 的七个测试被整体重写：该文件测试的是旧 G0 与执行器的集成关系，而非 G0 模块本身。首页主流程改为离线 worker 规划 → host 代抓 → 同一 worker 读取证据后，旧的 Mac 单命令审批/typed Steam/media receipt 调用断言不再对应生产行为。新测试覆盖无 G0 调用的离线规划、证据传递且不授予 MCP/凭据、采集失败不重跑、旧 scope 不把关、optimize 阻止、证据篡改拒绝及失败来源不能伪造成功。没有保留旧调用分支来迎合测试，也没有改动 G0 模块测试文件。
2. 按用户后续明确授权，仅更新 `agent/tests/homepage-media-host.test.mjs` 原第 119、224 行起的两个执行器集成测试，以及 `agent/tests/entry-host-bootstrap.test.mjs` 原第 114、208 行起的两个执行器集成测试。它们原本要求旧 G0 把关禁止启动 worker，与新流程的离线规划冲突。上述两份文件的其他测试不变，G0 实现及模块测试全部保留；旧 readiness 函数对损坏 ownership proof 的 BLOCKED 行为仍单独验证。
3. 在四步提交之外增加 `e8c0b68`：真实验证发现 Skill 审计脚本用退出码 2 表示采集完成但有 HIGH/BLOCKER 问题。修复先增加失败测试，再接受明确的退出码 2 并保存证据，真正执行失败仍拒绝。未改 Skill 脚本、未替换工具或绕过问题。
4. 两个模板从已缓存的 GitHub 提交快照复制，使用前核对提交和干净状态，未再次联网下载同一快照。全站路由来自真实 sitemap，CONTENT_PAGE_MANIFEST 是首页 PUBLISHED 的替身；worker 也使用替身，按要求不调用真实 Codex worker。
5. 真实验证中没有制作最终原生研究、UI/上线报告或图标。这些属于真实 worker 的产物；替身明确返回 BLOCKED，不把采集通过误报为网站可以上线。原生报告输出契约由既有校验器和测试验证。

没有修改 `codex-skills/`，没有新增审批或 Pipeline 框架，没有放宽第 1、5、6 阶段命令网络/浏览器权限，没有真实部署或 push。UI optimize 保持 BLOCKED。临时验证项目和采集目录均已清理。

## 可留存的验证摘要

已将真实验证摘要和最终测试尾部保存到本报告旁的 `host-browser-verification/`：

- `templates.json`：temp1/temp3 的锁文件 SHA256、安装命令、截图数量、路由覆盖及脚本退出码。
- `homepage.json`：Steam 与官网的公开采集字段统计、替身 worker 调用次数及网络权限。
- `tests.txt`：最终 `node --test tests/*.test.mjs` 的 548/548 结果。

逐步精确提交哈希也可用 `git log --oneline main..feat/host-browser-stages` 获取。审查修复代码提交为 `63c4004`；本次报告与验证摘要更新另作 docs 提交，其哈希见最终交付消息。


## 本轮审查修复

修复提交：`63c4004`（rebase 后）。修改文件：`agent/src/pipeline.mjs`、`agent/src/site-preview-host.mjs`、`agent/src/prelaunch-host.mjs`、新增 `agent/src/site-process-environment.mjs`，以及对应的 `pipeline.test.mjs`、`site-preview-host.test.mjs`、`prelaunch-host.test.mjs`。

- projectDigest 排除 `*.tsbuildinfo` 和 `next-env.d.ts`；仍检查普通源文件、符号链接及其他非普通文件。公开同一 pipeline 实例的只读 `projectDigest()`，用于真实验证，不复制另一套摘要实现。
- 新增 6 项 pipeline 测试：根目录类型缓存、Next 声明文件、嵌套类型缓存、普通 `app/page.tsx` 改动仍 BLOCKED、公开摘要与 UI checkpoint 相等，以及 prelaunchSite 替身在第 6 阶段生成缓存后仍 PASSED。修复前其中 5 项失败，普通源码变更对照测试原本即通过。
- 新增 2 项环境过滤测试，在 process.env 放入 `SERPER_API_KEY=x` 和其他测试占位变量；覆盖 install/build 的 run、start 的 spawnProcess、typecheck/lint/test/build 的 run。修复前两项均失败，修复后通过。
- 所有站点包管理器子进程只接收 PATH、HOME、TMPDIR、LANG、LC_ALL、NODE_ENV、PNPM_HOME（存在时）；未白名单列入的变量不传入，名字匹配 key/token/secret/cookie/password 的变量不传入，也不继承 NODE_OPTIONS 等 Node 钩子。

历史清理实际执行：

```sh
git rebase --onto main d8cff60 feat/host-browser-stages
git diff main..HEAD -- codex-skills
```

指定的 `ea95312`、`14cc4c1`、`3f2214d`、`d8cff60` 已不再是当前分支祖先。rebase 前后提交树均为 `9dab08503150c98bcb2a19a9868edfe5badffe49`，说明该操作未改动文件内容；main 始终保持 `5c1bcaf3378c24fd219464092383fcdb32dff855`。上表均已替换为 rebase 后的新哈希。


### temp3 真实链路与摘要回归验证

执行命令：

```sh
cd /Users/randyz/work/coding/hot_words_web/gamewiki_site_auto_generator_line
node /tmp/verify-host-browser-review.mjs
```

验证脚本从既有 GitHub 快照复制 temp3，确认初始没有 node_modules；使用 createPipeline 的替身执行器，不调用真实 Codex worker。模板复制后在临时项目中写入仅含公开测试域名和禁用 Next 遥测的本地构建配置，以便不把 SITE_URL 等额外变量加入进程环境白名单。随后由同一个 pipeline 依次执行 install → buildAndServe → collectSiteAudit → buildAndServe → collectPrelaunch（含真实 typecheck、test、build）。UI PASSED 由替身声明，仅用于检验后续阶段的新鲜度门禁，不能视为真实 UI 上线判定。

输出摘要：

```text
install: exit 0
audit: scriptExitCode=0, screenshots=6
prelaunch: routes_expected=15, routes_checked=15, screenshots=32
checks: typecheck=0, test=0, build=0; lint script absent
browserPageFailures=0; tsconfig.tsbuildinfo exists
pipeline stage 6: PASSED
projectDigest after UI:        d7ef676df9e56567ff949127d9331787645e2bad7c7a95d64afa596f324591d6
projectDigest after prelaunch: d7ef676df9e56567ff949127d9331787645e2bad7c7a95d64afa596f324591d6
digestsEqual=true; temporary project cleaned
```

原始结构化摘要保存为 `host-browser-verification/review-temp3.json`；最终测试记录保存为 `host-browser-verification/tests.txt`。rebase 后已重新运行本文前述 inventory 加全量测试命令：inventory 通过，548/548 测试通过，0 失败（31.24 秒）。
