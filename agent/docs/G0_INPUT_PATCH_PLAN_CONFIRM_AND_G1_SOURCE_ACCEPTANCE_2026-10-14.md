# G0 输入变更、计划确认及 G1 公开来源契约

2026-10-14；C2C e714 / iteration 3。CODE_PASS / OFFLINE_PASS / REAL_BUSINESS_NOT_RUN；整体 G0–G6 未完成，生产入口保留 `ENTRY_HOST_ISOLATION_UNVERIFIED`。

后续独立审查：ChatGPT 已通过执行输出 23–29、文件摘要及源码给予 ACCEPT_SCOPED。输入 patch、版本化材料、计划确认和来源契约均为离线范围接受，真实业务未验收；后续见[第四批](G0_G1_READINESS_AND_SOURCE_OWNERSHIP_ACCEPTANCE_2026-10-14.md)。

## 本批实现

1. `entry-resume-snapshot.mjs` 支持 WAITING/BLOCKED 检查点的明确输入 patch。绑定 manifest、before/after、材料字节摘要、最早受影响阶段及原批准范围；身份、工作区、广告、UI 写入权限和直接 deploymentPlanApproval 禁止修改。未知副作用仍要求对账。
2. 新人工挑战签发新的短期票据，按准确 manifest 原子占用。材料及批准保存到 `approved-input-revisions`，原始 `APPROVED_INPUTS.json` 保持不变；仅成功应用对应输入后由宿主更新当前记录引用。旧票据不能重放，漂移材料不能消费。
3. `.confirmPlan()` 是独立批准动作，仅接受当前阶段 7 WAITING_FOR_USER 与准确 planDigest。绑定实际计划文件字节/摘要及展示内容，再用原 Pipeline 更新唯一的 deploymentPlanApproval。确认不调用 worker，不 push、不改 DNS、不发布，deploymentExecuted=false；拒绝保持等待。
4. `official-source-host.mjs` 为官方主页、帮助页及公告提供公共来源契约。仅接受可信宿主配置的确切 URL/类型/游戏身份，复用原 bsk 门和逐命令人工批准；保存 final URL、公开字段、时间、摘要及真实命令审计绑定。检查器复核各审计文件、意图、批准回执及来源摘要。
5. `bsk-command-gate.mjs` 增加固定公开文章字段采集，过滤额外私密字段；不接受 worker 任意 JavaScript，不读取 cookie/storage。缺少确切来源目标默认 BLOCKED。唯一 skill-executor 在 Steam 采集后要求来源契约，运行后再复验，只把确切宿主证据路径加入只读范围。

## 验证结果

| 检查 | 实际结果 | 日志 |
|---|---|---|
| patch 初始行为测试 | RED / exit 1 | `/private/tmp/c2c_e714_i3_patch_red.log` |
| 公开来源模块初始测试 | RED / exit 1 | `/private/tmp/c2c_e714_i3_source_red.log` |
| 来源 executor 第一次适配 | 14 PASS / 5 FAIL | `/private/tmp/c2c_e714_i3_source_executor.log`；合成 helper 误用未定义 createHash，修为已有 sha256 |
| 材料替换首次测试 | FAIL | `/private/tmp/c2c_e714_i3_materials.log`；修正测试为关键词阶段阻断，未放宽实现 |
| 材料及入口定向回归 | 61 PASS / 0 FAIL | `/private/tmp/c2c_e714_i3_materials_green.log` |
| 最终入口专项 | 61 PASS / 0 FAIL / 0 SKIP | `/private/tmp/c2c_e714_i3_entryhost.log`；`npm run test:entry-host` exit 0 |
| 最终完整回归 | 373 PASS / 0 FAIL / 0 SKIP | `/private/tmp/c2c_e714_i3_full.log`；`npm test` exit 0 |
| 9 个实现模块 node --check | PASS / exit 0 | `/private/tmp/c2c_e714_i3_syntax.log` |

离线完整路径：补 canonical → 同一 Pipeline 继续到计划等待 → 新挑战确认准确摘要 → 阶段 PASSED。阶段执行总计七次，确认期间 worker 零次，deploymentExecuted=false；原批准字节保留。材料替换新副本、漂移拒绝、禁止身份/范围扩大、拒绝计划保持等待、重放及旧摘要拒绝均有回归；先前并发/过期/源码漂移测试仍包含在全量中。

公开来源证据测试全部为合成 .invalid URL 和模拟批准/命令审计，不代表真实 bsk 调用。本批实际浏览器调用、实际 GUI 点击和实际业务 worker 均为零。默认来源目标仍未配置，G1 真实首页没有 PASSED。没有修改原始 Skill、模板、原站或关键词原件。

## 输入与下一道门

Wallpaper Engine 草稿仍为 revision 2 / READY_FOR_APPROVAL / approvedToRun=false，没有 Pipeline manifest。用户确认 domain `wallpaperenginewiki.best`、仓库 `randyzer/game_wallpaperengine` / `main`、Cloudflare 域名/DNS、Vercel 托管，未检查账号、DNS 记录或做外部变更。原件及 40 可读词/11 截断词/52–82 缺失行追溯沿用第二批；旧 run/图标批准不能继承给新 run。

本批等待 ChatGPT 独立复核。继续收敛 G0 宿主、模型工具、GUI 与认证边界；G1 配置并批准确切来源、完成完整原生产物；随后 G2/G5 受控能力及真实 G3/G4/G6 验收。合成通过不能代替真实七阶段验收，也不能解除生产默认门。
