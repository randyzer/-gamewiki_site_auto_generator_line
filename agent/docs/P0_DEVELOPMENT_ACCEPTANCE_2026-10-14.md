# P0 统一入口与可信交接 — 工程开发验收

日期：2026-10-14  
**综合结论：P0_SCOPED_DEVELOPMENT_ACCEPTED / PRODUCTION_ACTIVATION_BLOCKED。**

**后续开发更新（C2C e714 / iteration 1）：** [G0 运行许可与 canary 验收](G0_RUNTIME_AND_CANARY_ACCEPTANCE_2026-10-14.md)记录活动许可生命周期和真实 OS 合成文件探测；当前全量 **359 PASS / 0 FAIL / 0 SKIP**。CODE_PASS、OFFLINE_PASS；合成文件 OS_ISOLATION_PARTIAL；REAL_WORKER_NOT_RUN。本文下列 347 项与旧 OS 阻断说明保留为该次历史验收，不覆盖最新探测；生产激活仍 BLOCKED。

本结论只表示原 P0 任务卡所授权的、位于 `agent/` 内的开发和隔离测试闭环已达到验收标准；**不表示实际生产人类身份已认证、七阶段真实运行已成功或可以部署。** 原始任务卡允许正式 Pipeline 执行不安全时延后，不能因此放宽执行门禁。

**后续第二批（C2C e714 / iteration 2）：** [worker、恢复及真实输入预检](G0_WORKER_RESUME_AND_PREFLIGHT_ACCEPTANCE_2026-10-14.md)记录真实 executor 文件 profile 合成探测、不变输入的新批准恢复和 Wallpaper Engine 原件保护。当前全量 365 PASS / 0 FAIL / 0 SKIP；整体生产激活仍 BLOCKED。

**后续第三批（C2C e714 / iteration 3）：** [输入变更、计划确认及 G1 来源契约](G0_INPUT_PATCH_PLAN_CONFIRM_AND_G1_SOURCE_ACCEPTANCE_2026-10-14.md)记录新批准输入 patch、版本化批准材料、无 worker 计划确认及受控公开来源契约。当前全量 373 PASS / 0 FAIL / 0 SKIP；本批真实浏览器/GUI/业务 worker 为零，整体生产激活仍 BLOCKED。

**后续第四批（C2C e714 / iteration 4，2026-10-15）：** [G0/G1 实际准备与来源归属审核](G0_G1_READINESS_AND_SOURCE_OWNERSHIP_ACCEPTANCE_2026-10-14.md)记录宿主专用审核回执、377项回归和真实入口具体阻断；当前 Docker daemon 无法连接，外层隔离探测方案待审批，没有真实G1或发布。

**后续第五批（2026-10-15）：** [容器合成边界验收](G0_CONTAINER_BOUNDARY_ACCEPTANCE_2026-10-15.md)记录真实Node受限容器的局部边界通过及382项回归。前两次因生成脚本错误失败，第三次在自动审批拒绝后由用户明确新批准才执行；整体PARTIAL，不激活生产宿主。

## 已通过的工程验收

| 项目 | 验收 | 可追溯证据 |
| --- | --- | --- |
| 显式 Codex `$game_site_orchestrator` → CLI 只读预检 | PASS | `../runs/TEST-p0-codex-unblocked-20261014/preview.stdout` |
| 真实 Codex 自然语言保存 TEST 草稿 | PASS | `../runs/TEST-p0-final-20261014/natural-create.stdout`、`../runs/TEST-p0-final-natural-20261014/ENTRY_INTAKE_V1.json` |
| 新一轮 Codex 调用读取、更新同一草稿 | PASS | `../runs/TEST-p0-final-20261014/natural-resume-v2.stderr`，revision 1→2，同一 run ID |
| 8 Skill 锁哈希、阶段素材清单、缺项暂停与 OCC 更新 | PASS | 实际自然语言/CLI 调用和入口单元测试 |
| 审批快照绑定 revision、素材字节、Skill hash、run ID 和作用范围 | PASS | `entry-handoff-preview` / `entry-handoff-validate` 测试 |
| 人工确认实现 | PASS（代码/模拟） | `src/macos-entry-human-approval.mjs`：Deny 默认、随机挑战与真实 GUI 脚本编译 |
| 单次票据持久化、重放/过期/并发拒绝与材料副本 | PASS（离线） | `src/local-entry-approval.mjs`、mock 测试 |
| 固定可信宿主 → 原 orchestrator/Pipeline | PASS（隔离 mock） | `src/entry-host-bootstrap.mjs`、`tests/entry-host-bootstrap.test.mjs` |
| 旧 `run/retry` 未授权绕过、生产入口默认拒绝 | PASS | `src/orchestrator.mjs`、`scripts/entry-host.mjs` 的拒绝测试 |
| 最终全部本地 Node 测试 | **347 PASS / 0 FAIL / 0 SKIP** | `../runs/TEST-p0-final-20261014/independent-bootstrap-regression.log`，退出码 0 |
| Mac AppleScript GUI 源语法验证（无弹窗） | PASS | `../runs/TEST-p0-final-20261014/human-approval-dialog.applescript` 与编译产物 |

当前 TEST 草稿：`TEST-p0-final-natural-20261014`，revision 2，`approvedToRun=false`。没有该 run 的 Pipeline manifest。

## 无法纳入 P0 已通过范围的实际执行门

1. **独立 OS 强制隔离（BLOCKED）**：当前 Mac 同 UID 进程可触及宿主源码/票据文件，不能把本地 GUI 点击视作具有对抗任意同 UID 代码的身份认证。需单独部署可信宿主身份/隔离与不可变执行材料；生产入口故意返回 `ENTRY_HOST_ISOLATION_UNVERIFIED`。
2. **人工真实点击的端到端验收（NOT RUN）**：测试使用模拟对话框。没有向用户显示真实审批弹窗，也没有因该测试签发生产票据。
3. **七阶段真实 Pipeline/worker 业务执行（NOT RUN）**：受 P0 安全范围限制，不允许通过 mock 测试报告成真实建站成功。
4. **部署、域名、GitHub、DNS、GSC、GA4、广告/收费操作（NOT AUTHORIZED）**：均需要独立审批。
5. **10 分钟无人回应再次提醒、Feishu 实际联调、原生 `agent_type` 委派（NOT VERIFIED）**：不纳入本轮通过结论。

## 下一阶段

若要将生产执行门从 BLOCKED 转成 ACCEPTED，必须先完成并独立验收 OS 强制隔离/可信操作者认证、真实审批签发与不可绕过性，再由用户就具体 run、工作区、素材及副作用作单次批准；只有在获得该票据后才能对现有 Pipeline 进行受控真实阶段验收。**严禁为了宣称 P0 已完成而将 `createProductionEntryBootstrap` 的安全拒绝删除。**

历史过程报告仍保留在 `docs/` 便于追溯；本文件是截至该次验收的 P0 工程开发状态主结论，而非生产上线证明。
