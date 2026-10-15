# G0 worker、可信恢复及真实输入预检

2026-10-14；C2C e714 / iteration 2。整体 G0–G6 尚未完成；生产入口保留 `ENTRY_HOST_ISOLATION_UNVERIFIED`。

## 本批实现

1. **唯一执行器接入命名权限**：`skill-executor.mjs` 使用官方 `default_permissions="agent-worker"`，移除互斥旧 `--sandbox` / `--add-dir`；`worker-permissions.mjs` 固定 root deny、最小系统只读、锁定 Skill/批准材料/上游产物只读、阶段产物及允许的隔离站点写入、命令网络关闭。HOME/.codex、CODEX_HOME、SSH/AWS 路径显式 deny；CLI 客户端认证仍是独立边界，未复制/打印凭据。
2. **独立工具边界**：按当前 CLI 0.153.0 `features list`，关闭 Apps、浏览器、Computer Use、插件、hooks、多 Agent、图像生成、外部 Skill 安装/检索等；关闭 web_search。严格配置错误和进程失败传播，没有备用工具或无沙箱重跑。专业研究工具需可信宿主能力，仍未借此自动解锁。
3. **新批准恢复**：`entry-resume-snapshot.mjs` 只读真实 manifest，绑定 SHA256、stage/attempt、Skill 清单及依赖、批准材料、站点源码树摘要、既有状态和剩余阶段。消费新短期票据；校验原宿主审计，按准确 manifest 以 O_EXCL 抢占恢复。同一运行许可在停止后不可复用，不从任务 JSON 装载活动许可。未知 IN_PROGRESS 和未明确返回的 FAILED 默认要求对账，不自动重放。
4. **同一 Pipeline**：原 orchestrator 处理 `ENTRY_LOCAL_RESUME_V1`，复用原 Pipeline 的输入失效和 retry；首个操作在现有 durable lock 下复核批准 manifest 摘要。没有另建业务状态机。宿主 `.resume()` 必须请求新的本地人工挑战；生产 bootstrap 仍阻断。
5. **通用关键词预检**：`real-run-preflight.mjs` 只从明确的编号来源表格读取，不把候选页面/扩展词当用户原词；保留 Markdown 行号、原表行号、重复来源、截断及缺失记录。独立目录派生可读词集与 lineage。新增可选 `keywordSourceLineageFile` 经入口校验摘要、批准副本、恢复及 worker 只读范围交接，原始 Skill 不修改。

## 实际验证与限制

| 检查 | 结果 | 实际证据 |
|---|---|---|
| 命名 profile、恢复、lineage 新增行为的首次运行 | RED / exit 1 | `/private/tmp/c2c_e714_i2_profile_red.log`、`c2c_e714_i2_resume_red.log`、`c2c_e714_i2_preflight_red.log`、`c2c_e714_i2_lineage_red.log` |
| 入口/审批/bootstrap 专项 | 58 PASS / 0 FAIL / 0 SKIP | `/private/tmp/c2c_e714_i2_entryhost_final.log` |
| 已有项目专项 | 42 PASS / 0 FAIL / 0 SKIP | `/private/tmp/c2c_e714_i2_existing_green.log`；核对候选写入及原站不获写权限 |
| 完整回归首次 | 364 PASS / 1 FAIL | `/private/tmp/c2c_e714_i2_full.log`；旧测试仍断言 workspace-write 参数，修为命名 profile 范围断言 |
| 最终完整回归 | 365 PASS / 0 FAIL / 0 SKIP | `/private/tmp/c2c_e714_i2_full_verified.log`，exit 0 |
| 15 个实现模块语法 | PASS | `/private/tmp/c2c_e714_i2_syntax.log`，exit 0 |
| 同一 stage-policy 的真实 Seatbelt 固定脚本 | PARTIAL；内层 exit 0 | [报告](../runs/TEST-worker-isolation-5feb77bd-13bf-4797-ad3b-729bad789f31/ISOLATION_REPORT.json)；五类保护文件拒绝读写、Skill/输入只读、子进程继承、外层可达本机回环在内层拒绝 |
| 真实 Codex exec / 同一 executor 参数 | PARTIAL；CLI exit 0 | [实际 worker 报告](../runs/TEST-real-worker-profile-d0be2da2-0887-42c6-8cb9-ce61dc859979/REAL_WORKER_PROFILE_PROBE.json)；固定命令事件恰好一次、匹配成功、nonce 写入及脚本摘要核验，五类保护样本拒绝读写 |

实际 worker 使用合成测试 Skill 和固定 canary 脚本，不使用 Wallpaper Engine 原件、不运行七阶段或模板复制。第一次 worker 的命令证据未匹配，保留 [初次报告](../runs/TEST-real-worker-profile-7facd593-f268-4730-95ca-dd95fa7672cb/REAL_WORKER_PROFILE_PROBE.json) 为 BLOCKED；第二次仅增加脱敏事件诊断，取得精确命令匹配。没有放宽策略或改用无沙箱探测。

这里的真实 worker 证明一条 shell 命令遵守文件 profile；**不证明任意模型工具、客户端、GUI/连接器、认证存储与宿主进程身份均已隔离**。本机回环拒绝不作为全面网络/进程身份认证。整体生产激活为 BLOCKED；不得把 PARTIAL 写成生产完成。

恢复回归包含不同新票据并发仅一胜、旧票据重放、源码变化和批准材料变化拒绝、未知副作用停止、独立 GUI mock 挑战；真实 GUI 点击未运行。本批恢复仅支持已批准输入不变的检查点；后续补输入、材料替换、最终 planDigest 确认仍需另一个绑定变更的可信批准契约，不能复用旧批准。

## Wallpaper Engine 实际输入

- 原件：`/Users/randyz/work/coding/hot_words_web/gameweb/game_WallpaperEngine/background_information/keyword-materials/关键词.md`。
- 原件 SHA256：`d79c1bd48c75553bda5c056b8adc898bfb5065b4648b64637e0a1bdca4824aa4`；预检前后字节摘要一致。
- **40 个完整可读词**；**11 个截断词**；缺失 **52–82 行**待补。仅解析明示来源表格，不沿用原文未经 SERP 验证的建议分组作为真实调研结论。
- [实际预检](../runs/PREFLIGHT-wallpaper-engine-e714-i2-20261014/REAL_RUN_PREFLIGHT.json)、[来源追溯](../runs/PREFLIGHT-wallpaper-engine-e714-i2-20261014/KEYWORD_SOURCE_LINEAGE.json)、[派生词集](../runs/PREFLIGHT-wallpaper-engine-e714-i2-20261014/complete-readable-keywords.md)。模板目录可读，具体选择和源完整性仍待 G3。
- [标准入口草稿](../runs/wallpaper-engine-e714-draft-20261014/ENTRY_INTAKE_V1.json)：revision 2，READY_FOR_APPROVAL，approvedToRun=false，没有 Pipeline manifest。
- 用户确认正式域名 `wallpaperenginewiki.best`、仓库 `randyzer/game_wallpaperengine`、分支 `main`、Cloudflare 管理域名/DNS、Vercel 托管。草稿只存计划输入，未访问 GitHub/Vercel/Cloudflare、未验证当前 DNS。
- Application / Utilities、Windows 与 Android 信息目前是用户提供的身份材料，最新 Steam/官网/帮助文档需真实 G1 重新取得。旧图标批准不自动转移给新 run。

## 下一道门

ChatGPT 独立复核待回执。下一批先收敛 G0 的真实宿主/工具边界及带输入变更的恢复批准，再接通 G1 完整原生产物、G2 逐词研究和 G5 浏览器审计；G3/G4/G6沿同一 Pipeline 交接。真实业务运行前展示确切草稿 revision、execution run、材料与副作用，取得该次批准。最终仍是部署计划单独确认、`deploymentExecuted=false`，不执行生产发布。
