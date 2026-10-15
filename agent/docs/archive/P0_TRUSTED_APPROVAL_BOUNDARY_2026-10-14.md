# P0 可信人工审批与 Pipeline 交接安全边界

状态：OFFLINE_CONTRACT_TESTED / PRODUCTION_HANDOFF_BLOCKED / P0_NOT_COMPLETE。

延续 `P0_UNIFIED_ENTRY_HANDOFF_DESIGN_2026-10-14.md`。本轮没有启动真实 worker、部署、联网或修改原始 Skills。没有增加第二个编排器，也没有安装生产审批宿主。

## 信任来源

任务 JSON、CLI 参数、草稿、快照、配置中的审批声明、调用者自签票据都不可信。`approvedToRun=true`、签名字段或调用者提供的公钥不能建立人工身份。

可信来源必须是部署者控制的宿主启动代码及宿主独立认证的人类审批通道。宿主 issuer 只能在展示准确快照、执行范围、副作用、批准者身份后发放票据；consumer 查询宿主保存的审批记录。调用者仅持有不透明 ticket，不持有签发权。

本轮只实现注入式接口契约，唯一 issuer 在测试文件内，用内存 Map 模拟已认证宿主。该模拟不是可信身份系统或持久化授权服务，不可用于生产。能修改源码、注入 JavaScript 函数或直接导入底层 Pipeline 的进程属于可信计算基；本模块不是对同权限恶意代码的沙箱。不能让不可信任务选择模块、回调、executor 或宿主配置。

选择宿主保存记录的 opaque ticket，而不是 CLI 本地 HMAC 自签，原因是后者没有独立信任根。独立签名服务也可实现宿主契约，但本轮未接入密钥或网络。

## 实现与默认阻断

- `src/entry-approval.mjs` 提供 `entryApprovalBinding(snapshot, configuration)` 和 `createEntryApprovalConsumer({host, now})`。前者只是构造审批内容，不签发票据、不授予权限。
- binding 包括完整 snapshot（草稿 run/revision/字节摘要、输入摘要、材料摘要、八 Skill 版本、inventory 摘要、execution run/workspace、阶段）、完整有效配置、明确映射后的 Pipeline inputs、fresh-only 用途、禁止发布标志。
- consumer 调用现有 `validateEntryHandoff`，比较实际 task ID/inputs，再调用 `host.consume({ticket,binding})`。宿主必须原子完成身份/范围/有效期/未消费检查和 execution ID 唯一占用；回执携带准确 binding、approvalId、approver、approvedAt、expiresAt、used=true。
- consumer 校验回执并再次验证草稿、材料、锁和目标路径，复查有效期。消费后的失败不得恢复票据，结果不确定也按已消费处理。
- 唯一 `createOrchestrator` 在任何 Pipeline 创建、恢复、站点写入或 executor 调用前要求宿主注入的 approvalConsumer 明确返回 true；任务和配置先复制，避免外部对象在 await 期间被直接修改。consumer 是可信宿主代码，布尔返回值本身不是可提交的票据。
- 同时要求显式注入 executor，移除原默认真实 worker 工厂选择。没有生产 bootstrap 安装 consumer/executor；仅注入 consumer 返回 `ENTRY_PRODUCTION_HANDOFF_DISABLED`。
- 旧 CLI `run/retry` 在读 inputs 文件之前固定返回 BLOCKED / `ENTRY_TRUSTED_APPROVAL_UNAVAILABLE` / exit 2。普通 inputs、自填审批、已有 manifest、额外开关不能恢复旧启动路径。
- Feishu 默认 adapter 仍使用同一个 `createOrchestrator()`，也被门禁拒绝；Feishu 的计划审批不是入口执行审批。旧离线编排测试显式注入测试宿主替身，不能据此宣称 Feishu 生产审批已接通。

模拟范围仅为 new-site fresh run、audit-only、非广告分支。已有项目、optimize、广告和 retry/resume 未在新 consumer 中开放。不会将草稿改名为 manifest，不从入口传递部署授权、DNS 字符串或任意字段；后续缺项仍由原 Pipeline 等待用户补充。

## 正式交接的阻断条件

1. **认证宿主未接入**：没有可验证的人类身份、受保护的签发记录或注册的生产 consumer；不得从 CLI/env/任务配置启用。
2. **持久化事务未实现**：测试内存 Map 只证明同进程并发契约。生产需跨进程数据库事务、唯一 ticket/execution run 约束、durable consumed 状态、崩溃后禁止自动重放。不能用进程内 Set 声称防跨进程重放。
3. **TOCTOU 未消除**：现有 safePath/lstat/hash 和二次核验能拒绝检查时已有的篡改、占用、链接，但不是跨检查与执行的原子保障。正式宿主需独占保留 run/workspace、固定目录句柄或等价 OS 隔离；冻结材料、Skill 树及配置，保证 worker 读取已审批的字节。不能验证后重新读取可变路径并宣称安全。
4. **原子审计交接未实现**：宿主消费、目录占用、approval receipt/provenance 落盘及 manifest 创建需要可恢复协议。当前模拟只在宿主 Map 保留回执，未写入可信持久化审批记录。预留失败或崩溃必须保留占用并人工对账，不能自动退票。
5. **恢复契约未实现**：retry/resume 必须绑定准确 manifest 摘要、阶段、attempt、当前材料与 Skill 锁，重新审批；fresh-run 票据不能复用。当前一律拒绝。
6. **阶段仍需独立权限**：UI 修改、生产 push、部署、DNS、索引、统计、广告、支付不能继承入口审批。原 Pipeline 保留唯一阶段状态机；后续宿主需在实际副作用边界执行范围限制。

这些条件全部完成并经过隔离测试、审查后，才可考虑单独授权的生产宿主集成。本轮没有临时开关绕过阻断。

## 测试证据

证据目录：`runs/TEST-p0-trusted-approval-20261014/`。

| 文件 | 结果与含义 |
| --- | --- |
| `red.log` | 修改前旧入口拒绝测试失败：Missing expected rejection；使用抛错 executor 替身 |
| `gate-green.log` | 9 项门禁与既有 handoff 测试通过 |
| `consumer-red.log` | consumer 模块尚不存在时 15 项失败；是缺失模块红灯，不是 15 个运行时漏洞 |
| `consumer-green.log` | 初次实现因根目录末尾斜杠比较而失败；文件名不代表通过 |
| `focused.log` | 36 项早期相关测试通过 |
| `regression.log` | 106/107；合成 Skill fixture 的绝对配置路径不匹配读取器契约 |
| `regression-final.log` | 107/107 通过；仅下列相关测试，不是全仓测试 |

端到端单元链路：真实 entry 草稿 → 只读 snapshot → 模拟宿主 issue → 真实 consumer → 唯一 orchestrator → 真实 Pipeline → mock executor 返回 BLOCKED。确认只调用一次 executor，manifest 使用准确 workspace；没有执行真实 Skill 流程。

拒绝覆盖：重放、retry、过期、并发三请求（含两张独立票据争用同一目标）、调用者自造票据、输入/阶段/Skill 版本/inventory 摘要/workspace 篡改、草稿与执行 run 相同、材料及同 revision 草稿改写、链接执行目录、占用 workspace、配置改变、消费期间材料改变/过期、宿主异常、空回执/错误 binding/未来批准时间、未注入宿主、未注入 executor。

真实 Skill 字节漂移只修改 agent 内合成 Skill；`inspectEntrySkills` 从 READY 变为 BLOCKED / SKILL_VERSION_DRIFT。现有入口及 Pipeline recovery 测试另覆盖锁与依赖脚本漂移。没有修改原始 Skills，也不宣称跨进程竞态已解决。

复现命令（本地模拟测试）：

```sh
node --test tests/entry-approval.test.mjs tests/entry-handoff.test.mjs tests/entry-v1.test.mjs tests/pipeline.test.mjs tests/recovery.test.mjs tests/feishu-e2e.test.mjs tests/feishu-existing-project.test.mjs
```

当前目录无 Git 元数据。修改前 orchestrator/CLI 副本已保存在证据目录；未进行提交、部署或原始 Skill 修改。P0 仍未完成。
