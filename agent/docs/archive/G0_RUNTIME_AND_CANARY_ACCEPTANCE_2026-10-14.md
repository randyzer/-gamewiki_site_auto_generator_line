# G0 运行许可与真实 canary 验收

日期：2026-10-14；C2C 任务：c2c_e714，iteration 1。

**本批结论：运行许可 OFFLINE_VALIDATED；OS 合成文件访问隔离 PARTIAL；生产激活 BLOCKED；G0–G6 整体未完成。** 独立 ChatGPT 已回执 ACCEPT_SCOPED；后续变化见 [第二批验收](G0_WORKER_RESUME_AND_PREFLIGHT_ACCEPTANCE_2026-10-14.md)，本文件保留第一批范围。

## 代码变更

- `src/local-entry-approval.mjs`：单次短期票据仅约束消费/prepare/首次启动；活动许可启动后持续检查范围、批准输入、目录身份、材料与库存哈希及宿主审计，不因原票据到期打断长任务。停止后不可复用，持久化审计不包含 bearer ticket；没有重启后重新装载许可的 API。
- `src/orchestrator.mjs`：唯一 Pipeline 启动前激活、结束或异常时停止许可；阶段执行前后核验批准 Skill 范围。旧 retry 继续拒绝，尚未实现新的可信恢复授权。
- `src/worker-permissions.mjs`、`src/skill-executor.mjs`：子进程环境固定 allowlist，不透传宿主票据、飞书凭据、额外 API key 或 NODE_OPTIONS。HOME/CODEX_HOME 仍服务 CLI 认证；allowlist 不构成文件读取隔离。
- `src/worker-isolation.mjs`、`scripts/worker-isolation-probe.mjs`：命名 `agent-canary` profile 默认 root deny、minimal read、精确测试目录 write、Node 和系统 OpenSSL 依赖 read，network disabled。配置随命令传入，未安装全局配置。
- 三份授权/权限测试及新隔离测试覆盖长任务、启动前到期、阶段范围、停止/重放、审计修改、环境泄漏、精确失败分类及探测策略。

生产 `createProductionEntryBootstrap()` 的 `ENTRY_HOST_ISOLATION_UNVERIFIED` 保留。生产 executor 尚未应用 canary profile；不能用探测通过证明旧 workspace-write 已具备相同边界。

## 实际验证

| 命令/实验 | 实际结果 | 范围/证据 |
|---|---|---|
| 修改前 `npm test` | 347 PASS / 0 FAIL / 0 SKIP，exit 0 | `/private/tmp/c2c_e714_baseline.log` |
| 生命周期新增测试首次运行 | 9 PASS / 4 FAIL，exit 1 | `/private/tmp/c2c_e714_lifecycle_red.log`；缺少 start API，后修复 |
| 权限/profile 新增测试首次运行 | exit 1 | `/private/tmp/c2c_e714_permissions_red.log`、`c2c_e714_profile_red.log`、`c2c_e714_profile_config_red.log` |
| 授权/bootstrap/recovery/permissions/isolation 六份定向集 | 62 PASS / 0 FAIL / 0 SKIP，exit 0 | `/private/tmp/c2c_e714_targeted.log`；该轮在新增命名 profile 用例之前 |
| `npm run test:entry-host` | 56 PASS / 0 FAIL / 0 SKIP，exit 0 | `/private/tmp/c2c_e714_entry_host.log` |
| 最终 `npm test` | **359 PASS / 0 FAIL / 0 SKIP，exit 0** | `/private/tmp/c2c_e714_full.log`；包含上述新增 profile 用例及现有飞书离线测试，无飞书服务调用 |
| 六个修改/新增模块 `node --check` | PASS，exit 0 | `/private/tmp/c2c_e714_syntax.log` |
| 内嵌 `codex sandbox` | BLOCKED / exit 71 | [外层限制报告](../../runs/TEST-worker-isolation-edbc088e-9d74-4515-a90c-fee178221011/ISOLATION_REPORT.json)：Seatbelt sandbox_apply EPERM，canary 未执行 |
| 外层沙箱外运行相同内层 profile | **文件访问 PARTIAL / child exit 0** | [真实 OS 报告](../../runs/TEST-worker-isolation-6268452a-4532-49c5-ac8e-2e73fb4d7736/ISOLATION_REPORT.json)；工具授权通过，仅合成文件，CLI 0.153.0，macOS |

实际 OS 测试：允许目录 read/write=true；模拟 host-approval、synthetic-credential、other-run、template-source、original-site 的五类 canary 全部 read/write=false。同 UID 的 0600 权限只作为样本条件，不作为隔离机制。没有读取真实凭据、没有模型/网络/浏览器调用。报告脚本退出 2 是有意表示整体激活仍未通过；不能当成 canary 子进程失败。

首次外层沙箱外尝试 Node 未启动，原因是系统 OpenSSL 配置读取被拒绝。取得明确诊断后只增补该系统依赖的只读规则，保护样本范围未扩大。没有改用无 sandbox Node 执行 canary。

Schema 和平台语义依据 [OpenAI 官方 Permissions 文档](https://learn.chatgpt.com/docs/permissions)：命名 profile 与旧 sandbox_mode 不混用；profile 仅治理本地命令，连接器、GUI、浏览器和模型服务有各自边界。

## 剩余门与下一步

1. 将经过验证的策略接入真实 worker：宿主源码/审批/原材料/其他 run 默认不可读写，仅显式只读 Skill 与批准副本；处理 CLI 认证目录、工具运行依赖与模型服务的分离。核验实际 worker 的等效策略，不能只证明独立脚本。
2. 验证网络、GUI/外部工具和进程通道；接入真实可信审批前保留阻断。固定脚本测试未涵盖任意模型工具或同 UID 进程攻击。
3. 新增可信恢复批准：绑定当前 manifest、阶段/attempt、剩余范围和变更材料，不能重用旧票据或重建独立业务状态机。
4. 真实 G1–G6 尚未执行。用户选定 Wallpaper Engine / Steam 431960（Application / Utilities），原始 `关键词.md` 只用完整可读词，缺失 52–82 行和截断词保留待补记录。新 execution run 需要准确副作用范围和可信启动批准；旧试验不继承。
5. 最终同一 run 七阶段至部署计划：先 WAITING_FOR_USER，用户独立确认摘要后 PASSED；`deploymentExecuted=false`。域名/仓库/provider 于需要该输入时补齐。

未修改原始 Skill、模板、原关键词、真实站点、飞书服务或全局权限配置；没有生产发布。
