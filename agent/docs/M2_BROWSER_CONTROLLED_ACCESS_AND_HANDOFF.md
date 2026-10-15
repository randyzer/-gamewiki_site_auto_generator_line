# M2 浏览器受控调用与公开证据交接 — 架构决定 V0.1

日期：2026-10-14。状态：**CAPABILITY_BLOCKED / SAFE_QUARANTINE_AVAILABLE / REAL_HOMEPAGE_NOT_VALIDATED**。

## 1. 目标与实际边界

本轮保留唯一编排 `src/orchestrator.mjs` → `src/pipeline.mjs` → `src/skill-executor.mjs`。Codex 的 `$game_site_orchestrator` 只是调用入口，不复制七阶段业务逻辑。本轮不修改飞书、源 Skill、模板或站点。

浏览器阶段 0、1、4、5 现在由 `src/skill-executor.mjs` 明确返回 `APPROVAL_CAPABILITY_UNAVAILABLE`；这是**刻意保留**的安全边界。实际 bsk 命令门 `src/bsk-command-gate.mjs` 已具备单命令 digest、runId/stage/时限和一次性执行 ID 等检查，但生产 `src/bsk-tool-server.mjs` 没有宿主支持的独立审批回调。启动许可或用户口头批准不能代替逐条命令授权。不得删除 guard，不得设置 auto-approve，也不得从 worker 提交伪造批准票据。

## 2. 决定：宿主审批 + 只读证据隔离，分为两条独立路径

**路径 A（未来、目前 BLOCKED）**：

1. 可信宿主识别准确游戏、runId、阶段和当前工具策略摘要；
2. 宿主针对 bsk 的**每条实际命令**生成唯一请求、呈现精确目标和副作用，并获得该条命令的独立批准；
3. 仅可信宿主向 `createBskCommandGate({ approve })` 注入回调；worker 永远不能提供回调或回执；
4. 通过 `validateBskCommand` 白名单、命令摘要、有效期、一次性 executionId、session/tab 所有权和 Steam 身份校验后才执行；清理也需独立批准；
5. 可信宿主签发可独立核对的采集来源记录，传输层不能由 worker 伪造。
6. 最终仍须通过首页 Skill 原生文件验证、图标生成/传输验证和后续阶段验收，才可将阶段标为 PASSED。

只有可信宿主具备真实逐命令批准接口后才能实现路径 A；当前 Mac 上的 Codex CLI 无此能力，不能模拟成已存在。

**路径 B（本轮已实现，仅数据候选）**：

- `src/host-browser-evidence.mjs` 接受已经由外部宿主采集的**typed Steam JSON-LD 公开字段**，使用项目现有 `bindBrowserPolicy` 和 `sanitizePublicCapture` 重新验证精确 Steam App ID、游戏名、URL、字段类型和长度。
- 导入时丢弃 raw text、浏览器 controls、额外 JSON、提供者声明的授权票据；只保留已列白名单的公开字段。
- 将记录以确定性 SHA256 文件名写入 `runs/<runId>/host-evidence-quarantine/`，原子创建、重复幂等、不覆盖，拒绝符号链接和路径逃逸；不接触原有 `manifest.json`。
- 必须标为 `QUARANTINED_UNVERIFIED` / `hostApprovalVerified: false` / `countsAsStageArtifact: false` / `authorizedForWorkerLaunch: false` / `mayResumePipeline: false`。**typed 内容与一致的 URL 不能证明真实采集、宿主身份或人工批准**；这仅是等待核验的素材，不是审批票据、更不是首页产物。
- 当前数据适配只支持带 Steam ID 和标准 JSON-LD 的页面；未知页面/无 ID/不匹配内容必须拒绝。
- 旧 `runs/bodycam-readonly-browser-001/BROWSER_READONLY_RESULT.json` 使用已经废弃的整页 body 文本采集，**不能转成真实新格式已通过**。

## 3. 本轮实现的运行命令

从 agent 根目录运行：

```bash
node scripts/browser-evidence-handoff.mjs inspect config/m2-browser-task.example.json
```

该命令只检查输入和策略并输出能力边界，不启动浏览器、不修改任何文件。输出 `browserWorkerLaunch: BLOCKED`、`reason: APPROVAL_CAPABILITY_UNAVAILABLE` 是目前**正确预期**。

`quarantine TASK.json CAPTURE.json` 命令仅适用于本地已有 JSON 形式的来源候选：任务卡在 `agent/config/` 或 `agent/runs/`，采集内容必须在 `agent/runs/` 下；最大 64 KiB，JSON-only，不接受无关文件。它创建隔离记录，但绝不解除 browser guard。**不要用合成 JSON 冒充真实来源**。

```bash
node --test tests/host-browser-evidence.test.mjs
npm test
```

## 4. 为什么本轮仍不是“真实首页调研完成”

- 没有可用的宿主逐命令审批接口，真实浏览器 worker 不能启动；
- URL/字段白名单只证明**格式和身份表面一致**，不能证明网页确实在当时访问；
- 还没有经宿主证明的原始 PNG、favicon.io 完整 ZIP、网页调研原生文件与来源审计；
- 因而 pipeline 第一阶段仍须 BLOCKED，不得发给下游内容整合。
- 用户已批准**开发 M2**，并未授权在原站生产写入、部署、GitHub push、DNS 或自动审批浏览器命令。

## 5. 后续明确工作项

1. 找到或实现平台正式支持的宿主逐命令审批 broker；必须独立于 worker 的 writable 目录，验证 command digest/主体/run/stage/有效期/一次性使用。
2. broker 不可用时，可让用户在有真实人工交互批准的宿主会话完成**单个公开 Steam 页面**的逐条只读操作，再带可核验证据交接；不能把本轮 quarantine 当真实来源验证。
3. 完成 favicon 图像和 ZIP 的可验证文件传输机制，禁止将本地伪造替代品标记为原生产物。
4. 对模板配置与模板 Skill 默认路径的差异做单独只读预检，再做真实首页 Skill 测试；逐阶段推动，不提前释放下游。

## 6. 本次实际验收（2026-10-14）

- `node scripts/browser-evidence-handoff.mjs inspect config/m2-browser-task.example.json`：退出码 0，明确报告 `browserWorkerLaunch=BLOCKED`、`APPROVAL_CAPABILITY_UNAVAILABLE`；不写文件、不调用 bsk。
- `node --check src/host-browser-evidence.mjs` 与 `node --check scripts/browser-evidence-handoff.mjs`：均通过。
- `node --test tests/host-browser-evidence.test.mjs`：7 通过，0 失败，覆盖了路径逃逸、游戏匹配、敏感字段过滤、幂等性，以及审批阻断不被证据解除。
- `npm test`：**179 项通过、0 失败**。输出保存在 `runs/m2-regression-2026-10-14.log`。
- **未发生真实浏览器访问、首页原生产物生成、宿主审批升级或 pipeline 阶段推进**。以上验收只能说明隔离预检代码通过，不能说明真实首页调研能力已恢复。
