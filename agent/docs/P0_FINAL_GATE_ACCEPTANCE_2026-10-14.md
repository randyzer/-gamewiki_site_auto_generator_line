# P0 宿主 bootstrap 与本地授权验收 — 2026-10-14

结论：固定宿主 bootstrap 已完成请求重建、模拟 GUI、持久票据与原 orchestrator/Pipeline 的离线接线，独立生产命令因 OS 隔离未验证而明确拒绝；真实七阶段启动仍 BLOCKED。可信本地操作者确认不等于独立 OS 身份验证。本次没有弹出真实确认框，没有运行真实 worker，没有发布，不能认定生产 P0 全部完成。

## 实际改动

- `src/local-entry-approval.mjs`：新增可信 bootstrap 专用宿主适配器。人工身份只能从宿主注入的 `authorize` 渠道取得；不存在默认身份、输入自签、CLI 自签或模型签发入口。未安装渠道时 `ENTRY_HUMAN_CHANNEL_UNAVAILABLE`。
- `src/macos-entry-human-approval.mjs`：新增 `createMacEntryHumanAuthorize`。`createMacLocalEntryApprovalHost` 从可信 bootstrap 显式调用时向本地宿主注入此 authorize；普通本地工厂不自动安装，CLI、task JSON 和模型没有开关。存储目录仍必须显式提供，executor 仍默认断路。
- `src/entry-approval.mjs`：保留快照、配置、输入、有效期校验；消费后再次校验快照，再调用宿主 prepare 返回执行许可。导出本地宿主工厂。
- `src/orchestrator.mjs`：快照授权禁止自动 resume/retry；使用许可中的材料路径，执行器调用前校验许可。依然要求显式注入 executor，未启用默认真实 worker。
- `src/pipeline.mjs`：增加可信宿主预留目录入口，校验目录许可，并以 `wx` 独占创建 manifest。普通 fresh run 仍独占 mkdir；预留目录不能 resume。
- `tests/local-entry-approval.test.mjs`、`tests/entry-approval.test.mjs`：持久化、跨进程争抢、重放、身份拒绝、绑定、过期、材料与 inventory 漂移、目录占用、mock 集成及竞态回归。

## 持久化与竞态语义

票据记录以独占文件创建并 fsync，目录同步后才返回。消费使用 `O_EXCL` 创建 `.used` 墓碑：跨进程最多一个消费成功。消费后发生校验失败、目录占用或进程故障均不回滚，不自动恢复、不重新发行。消费与准备是分阶段 fail-closed 操作，不承诺故障后恰好执行一次；故障可能烧毁票据并留下待人工处理的预留目录。

执行目录和 workspace 均使用非递归 mkdir 独占创建，不采用已有目录。绑定包含原快照、配置、完整输入、executionRunId 和 workspace。材料从原路径读取后核对已审批摘要，再保存到 execution run 的只读副本。`APPROVED_INPUTS.json` 保存原绑定与实际执行路径。许可验证目录 dev/ino、符号链接、材料/记录摘要、inventory 摘要与有效期。

原竞态：消费者返回 true 后 orchestrator 探测 manifest，可能把 fresh-only 授权变成 resume。现在快照授权固定走 fresh 初始化；已有目录拒绝，预留目录独占创建 manifest，禁用死锁自动恢复。回归用审批返回前插入 manifest 的方式复现旧行为并验证拒绝。

## 离线证据

下表为上一轮本地消费器的历史证据；本轮 macOS 签发器证据见下节。

| 命令 / 阶段 | 事实 |
| --- | --- |
| `node --test tests/local-entry-approval.test.mjs` 初始 RED | 5 项失败：缺少宿主工厂导出 |
| `node --test tests/entry-approval.test.mjs` 集成 RED | 25 通过、2 失败：fresh/resume 竞态及持久化许可尚未接入 |
| inventory 漂移 RED | 7 通过、1 失败：边界未检测已审批 inventory 漂移 |
| `node --test tests/entry-approval.test.mjs tests/local-entry-approval.test.mjs` 最终 | 35 通过、0 失败、0 跳过 |
| `npm test` 最终 | 331 通过、0 失败、0 跳过；317 顶层测试，退出码 0 |

跨进程测试启动三个独立 Node 进程消费同一票据，结果恰为一个成功、两个拒绝。重建宿主实例后重放仍拒绝。集成测试执行器仅返回 BLOCKED，并验证读取的是副本；不代表真实七阶段运行验收。原有 CLI run/retry 拒绝测试保持通过。

本次日志位于 `/tmp/p0-red.log`、`/tmp/p0-integration-red.log`、`/tmp/p0-inventory-red.log`、`/tmp/p0-targeted-final.log`、`/tmp/p0-npm-final.log`，属于临时本机证据。

## 明确阻断与限制

1. 当前代码提供本机 osascript 交互确认渠道，但未安装、验证独立 OS 身份认证服务。固定标签 `local-macos-interactive-operator` 表示操作者通过该渠道确认，不能证明其实名、独立账号、Touch ID 或密码认证。测试使用模拟 dialog，不能当作实际人类交互证据。
2. 签发器使用固定 `/usr/bin/osascript` 和固定脚本，通过 argv 传递文本，不拼接执行任务脚本。窗口显示 runId、executionRunId、revision、game、workspace、skill-lock、任务摘要、完整绑定及 SHA256，以及文件写入、workers、浏览器/网络/图像工具等副作用。Deny 为默认和取消按钮；50 秒 GUI 超时、60 秒进程/宿主超时、关闭窗口和异常均拒绝。超长文本拒绝，不截断绑定。每次调用使用随机挑战绑定摘要，只有本次对话框的同意响应匹配才返回确认；旧响应和普通 APPROVED 文本拒绝。时间由宿主生成，有效期 60 秒，持久票据由本地 host 单次消费。
3. `0700` 存储目录、`0400` 副本、摘要和 inode 校验不能抵御同 UID 任意代码的 chmod、替换或检查后写入。真正不可变材料与身份存储需要 OS 身份/沙箱隔离；当前不宣称消除了敌对同 UID 下的全部 TOCTOU。生产 executor 继续不接入，因此不能利用本次离线接口启动真实七阶段。
4. 未做断电故障注入或真实身份交互验收；已验证正常本机文件系统上的 fsync 写入、重建宿主、跨进程互斥及失败关闭。
5. 原始 Skills、feishu 实现及现有站点未由本次实现修改。`npm test` 执行既有离线测试（包括 feishu 测试），不是运行生产服务。入口审批快照仍保持只读预览语义，与执行 run 分离。
6. `dialog`、`platform`、时钟等注入参数只供可信 bootstrap/单测使用，不是 JSON 配置或 worker API。若模型可修改 bootstrap、调用任意同 UID 代码、控制 GUI 自动化或访问批准存储，本适配器不能提供独立防伪安全边界。生产启用仍需隔离可信宿主、存储与 worker；本轮未解除该阻断。随机挑战防响应重放，持久墓碑防票据重放，不等于抵御同 UID 攻击者。

## 本轮 macOS 签发器验证

- 新增 `tests/macos-entry-human-approval.test.mjs`：模拟同意、拒绝、普通伪造文本、异常、无响应超时、非 macOS 拒绝、旧响应重放及 task 审批字段拒绝；所有调用均注入模拟 dialog，不调用原生窗口。
- `tests/entry-approval.test.mjs` 新增真实 host `issue → consume → prepare → Pipeline` 集成，只注入 mock executor，核对绑定、只读材料副本、manifest、固定操作者标签与重建宿主后的重放拒绝。另验证拒绝/超时/伪造均无票据、无执行目录。
- 新增模块前定向 RED：3 项因模块不存在失败；实现后定向命令 `node --test tests/macos-entry-human-approval.test.mjs tests/local-entry-approval.test.mjs tests/entry-approval.test.mjs`：42 通过、0 失败、0 跳过。日志 `/tmp/p0-macos-targeted.log`。
- 本轮完整 `npm test`：338 通过、0 失败、0 跳过（324 顶层测试），退出码 0；日志 `/tmp/p0-macos-npm.log`。这仅证明模拟交互和离线执行边界，不证明真实 GUI 或真实七阶段验收。

当前目录不是 Git 仓库，无法提供 git diff 证明；上面的文件清单是本次写入范围，不对已有工作区变更作归属判断。

## 本轮固定宿主 bootstrap（2026-10-14，最新状态）

**离线接线可运行；生产宿主不可绕过性未建立，因此生产入口仍 fail closed。** 本轮未运行实际 Mac GUI、网络、真实 worker、七阶段或部署，也未修改原始 Skills、feishu 实现和真实游戏站。此前各节为历史证据；本节描述本轮交付。

### 代码与操作

- `src/entry-host-bootstrap.mjs`：新增固定组合根。只接收 `entry-handoff-preview` 相同请求 `{runId, expectedRevision, executionRunId}`，从草稿重新生成 snapshot/binding；拒绝附加 snapshot、ticket、approved、retry、executor 等字段。配置由固定 `loadConfiguration()` 取得。票据仅留在宿主闭包内，交给 `createEntryApprovalConsumer`，再经唯一 `createOrchestrator`/Pipeline，不另建执行状态机。
- `createOfflineEntryBootstrap({directory, dialog, executor})` 要求显式 mock dialog 和 mock executor；替代方式是 `{directory, dialog, workerRun}`，由 bootstrap 固定创建 `createSkillExecutor({run: workerRun, browserHumanDialog: false})`。两种执行依赖互斥，没有隐式真实执行器。此 JS 工厂是可信测试代码的依赖注入接口，不是面向不可信任务的安全 API；任意同 UID 代码可伪造依赖，不能据此宣称生产认证。
- `scripts/entry-host.mjs` / `npm run entry:host -- execute`：独立生产受控入口。当前固定退出 2，输出 `ENTRY_HOST_ISOLATION_UNVERIFIED`；在读取任务、创建存储、弹窗或构造真实 worker 前拒绝。没有 `--force`、环境开关、JSON 自签或选择任意执行模块的路径。当前不消费生产请求，不声称已交付可用的生产执行命令。
- `src/local-entry-approval.mjs`：审计 `approvalId` 改为独立随机 ID，避免 `APPROVED_INPUTS.json` 暴露 ticket。bootstrap 仅透传纯 `ENTRY_*` 机器码，其余异常统一为 `ENTRY_HOST_EXECUTION_REJECTED`，不携带 cause、私有路径或票据文件名。旧格式记录没有迁移；原 host 的既有私有记录仍应视为敏感数据。
- `package.json` 增加 `entry:host`、`test:entry-host`；README 与 docs 索引指向本验收。新增 `tests/entry-host-bootstrap.test.mjs`，扩展本地票据测试。

安全复验命令（无需 GUI/网络）：

```sh
npm run test:entry-host
npm test
node --input-type=module -e 'import {inspectEntrySkills} from "./src/entry-v1.mjs"; const r=await inspectEntrySkills(); console.log(JSON.stringify(r,null,2)); if(r.status!=="READY" || r.skills.length!==8) process.exitCode=1;'
# 预期退出 2；这是阻断检查，不会启动真实执行
npm run entry:host -- execute
```

### 原子性、失败与幂等语义

沿用真实本地 host 的 `wx + fsync` 持久票据、`.used` 排他墓碑与 run/workspace 独占 mkdir。两次并发 bootstrap 可以分别弹出 mock 对话框，但最多一个成功预留同一执行目的地并进入 executor；不会采用已有目录或自动 resume。消费后失败不回滚，不自动重试。已签发但消费前校验失败的票据可能留在私有存储，直到过期；bootstrap 不返回它，也不提供恢复接口。不承诺故障后的恰好一次执行。

消费前后重新核对快照，准备时核对材料摘要并复制；许可及 Pipeline 继续核对目录、材料、inventory 和 Skill 锁。审批期间材料改变会拒绝，任务 JSON 不能替换 binding。许可过期仍会阻断后续执行，本轮未把 60 秒授权扩展为长期七阶段运行许可。

GUI 本地确认、0400/0700 权限与摘要不能抵御敌对同 UID 的代码篡改、GUI 自动化、凭据读取或 TOCTOU。尚缺受保护宿主代码/存储、独立 worker 身份、不可变材料和可信 GUI 通道的 OS 强制隔离。生产工厂无条件拒绝；不能用调用者声称“已隔离”解除。普通 CLI run/retry 的既有拒绝保持不变。

### 离线验证证据

- bootstrap 初始 RED：5 项失败，缺少模块/受控命令（`/tmp/p0-bootstrap-red.log`）。
- 凭据回归 RED：8 通过、1 失败，证实旧 `approvalId === ticket`（`/tmp/p0-credential-red.log`）；修复后通过。
- 异常脱敏 RED：7 通过、1 失败，旧行为传播带私有路径的 OS 异常（`/tmp/p0-error-red.log`）；修复后通过。
- 定向 bootstrap + local-host：17 通过、0 失败、0 跳过（`/tmp/p0-bootstrap-targeted.log`）。覆盖固定接线、并发与重放、任务字段注入、GUI 拒绝、审批中材料变更、凭据隔离、错误脱敏及默认真实执行阻断。
- mock executor 集成到达原 Pipeline 并返回 BLOCKED；`createSkillExecutor` + mock runner 集成在首页浏览器门返回 BLOCKED，mock runner 调用数 0。后者验证固定接线和现有门控，**不证明真实进程或七阶段执行成功**。
- 8 Skill 只读检查为 READY，8/8 OK，共 58 个锁定文件；未重新生成 manifest（`/tmp/p0-bootstrap-lock.log`）。

- 最终 `npm run test:entry-host`：51 通过、0 失败、0 跳过，退出 0（`/tmp/p0-bootstrap-suite.log`）。
- 最终 `npm test`：347 通过、0 失败、0 跳过，333 顶层测试，退出 0（`/tmp/p0-bootstrap-npm-final.log`）。
- `npm run entry:host -- execute`：预期退出 2，`ENTRY_HOST_ISOLATION_UNVERIFIED`、`executorStarted:false`（`/tmp/p0-bootstrap-command.log`）；新增两个模块的 `node --check` 通过。

本轮写入文件：`src/entry-host-bootstrap.mjs`、`scripts/entry-host.mjs`、`src/local-entry-approval.mjs`、`tests/entry-host-bootstrap.test.mjs`、`tests/local-entry-approval.test.mjs`、`package.json`、`README.md`、`docs/README.md`、本文件。当前目录不是 Git 仓库，不能提供 git diff 证据；临时日志仅为本机复验记录。
