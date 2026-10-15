# G0 外层容器合成边界验收

2026-10-15（Asia/Taipei）；C2C e714 / iteration 5。CODE_PASS / OFFLINE_PASS / SYNTHETIC_CONTAINER_PARTIAL。整体 G0–G6 未完成，生产入口仍 ENTRY_HOST_ISOLATION_UNVERIFIED。

## 本批实际执行

用户明确批准限定 Docker 合成探测，并恢复已有 Docker Desktop。当前 CLI 28.3.3 / Server29.8.1 / desktop-linux；原进程因 sandbox 拒绝 daemon socket，取得临时访问授权后仍使用同一 CLI/context，未改全局配置。镜像由 docker manifest inspect --verbose 查询 official library/node 的 node:22-bookworm-slim，选择 Linux ARM64/v8 并按准确摘要下载：

`docker.io/library/node@sha256:b20fe038d9592822dd534600a1ddf467e985178aa3fed60ec441a056c2cc45bd`

新增 TEST-only `scripts/container-boundary-probe.mjs`。默认只预览；实际模式仅接受已下载的上述提供方 digest，pull=never、nonroot UID、固定合成目录。创建后先读取实际 Docker 配置校验，合格才启动固定 Node 程序：network none、readonly rootfs、cap-drop ALL、no-new-privileges、pids64、memory512MiB、CPU1、最多30秒；只挂合成 script/input 为只读及 output 为读写。没有 HOME/CODEX_HOME、Docker socket、Agent根、真实Skill/关键词/图标/审批材料挂载，没有实际 Codex worker。

## 失败诊断及修复

| 实际尝试 | 实际结果 | 证据 |
|---|---|---|
| 初次 | 配置符合，固定进程exit1，报告BLOCKED；清理通过 | [原报告](../../runs/TEST-container-boundary-fd20f5e9-c309-44e6-a64e-b9831e0eed92/CONTAINER_BOUNDARY_REPORT.json)，脚本exit2 |
| 第二次诊断 | 仍exit1；错误明确为 ReferenceError: nonce is not defined，发生在NETWORK_AND_CGROUP_CHECKED后；清理通过 | [诊断报告](../../runs/TEST-container-boundary-5de16e5b-9001-4e8a-8c4f-f085fa1f6e7b/CONTAINER_BOUNDARY_REPORT.json)，脚本exit2 |
| 第三次原请求 | 自动审批审查拒绝，未启动 | 原因是超出先前最多两次尝试，需要用户新批准；未改路径或绕过 |
| 用户新批准后的第三次 | 固定进程与脚本exit0，合成边界通过，总体PARTIAL；清理通过 | [最终真实报告](../../runs/TEST-container-boundary-78ebc7ff-7e65-4025-ae30-5da4ab8f7648/CONTAINER_BOUNDARY_REPORT.json) |

最小修复是结果中的 `nonce` 改为 `data.nonce`。另修正生成代码的正则转义：用经过测试的函数序列化进入容器脚本，保证能读取真实 CapEff/NoNewPrivs。新增生成程序的离线执行测试复现 ReferenceError，再验证绑定nonce及生成结果；这是假依赖测试，不能替代真实容器。前两次失败是本地生成脚本错误，不报告为 Docker 边界无法施加。

用户明确答复“批准第三次最后复验”后才再次执行，未放宽镜像、权限、挂载、网络或资源上限。三个实际临时容器均移除，失败报告保留；没有清理其它Docker数据，镜像按授权保留。

## 实际能力判定

| 项目 | 结果及实际范围 |
|---|---|
| CONTAINER_FILESYSTEM | PASS：合成input能读、output能写；readonly写返回EROFS；五类宿主合成样本未挂载，容器读写均ENOENT；宿主字节未变 |
| CONTAINER_NETWORK | PASS：此network-none配置与本轮host-loopback场景；host正向可达，容器127.0.0.1相同端口不能连接。不是全面外网/服务认证验收 |
| CONTAINER_PROCESS | PASS：固定子进程不能取得宿主样本；kernel实测pids.max=64、memory.max=536870912、cpu.max=100000 100000；UID501、CapEff全零、NoNewPrivs=1。不是所有进程/IPC攻击验收 |
| CLIENT_AUTHENTICATION | NOT_TESTED：未启动模型客户端，没有实际认证通道 |
| MODEL_TOOLS | NOT_TESTED：没有Codex、Apps或完整模型工具能力测试 |
| GUI_IPC | NOT_TESTED：没有真实GUI/IPC边界实验 |
| TRUSTED_HOST_APPROVAL | NOT_TESTED：没有生产审批签发或正式宿主接线 |

实际容器Node版本v22.23.3。运行内比较脚本/输入摘要及宿主canary前后SHA；[补充精确哈希复核](../../runs/PREFLIGHT-container-boundary-e714-i5-20261015/HOST_FILE_HASH_RECHECK.json)记录实际运行摘要和事后文件摘要，明确初始literal摘要不是另一次独立前置快照。

## 开发验证

| 命令 | 实际结果 |
|---|---|
| node --test tests/container-boundary-probe.test.mjs（初始、kernel、nonce测试） | 各RED均exit1；`c2c_e714_i5_probe_red.log`、`kernel_red.log`、`nonce_red.log`保留在/private/tmp |
| 最终定向测试 | 5 PASS / 0 FAIL / exit0；`/private/tmp/c2c_e714_i5_nonce_green.log` |
| 最终node --check | exit0；`/private/tmp/c2c_e714_i5_syntax_nonce_final.log` |
| npm test（前两个中间版本） | 380、381 PASS；不与最终数量相加 |
| 最终npm test | 382 PASS / 0 FAIL / 0 SKIP / exit0；`/private/tmp/c2c_e714_i5_full_final.log` |
| npm run test:entry-host | 61 PASS / 0 FAIL / exit0；`/private/tmp/c2c_e714_i5_entryhost_final.log` |

参数测试覆盖tag/非官方提供方/rootUID/非本轮路径拒绝、合成挂载范围、默认零执行；kernel解析及生成程序完整离线执行覆盖此次实际缺陷。没有扩大真实业务权限。

## 下一道门

[检查点](../../runs/PREFLIGHT-container-boundary-e714-i5-20261015/CONTAINER_PROBE_REVIEW_CHECKPOINT.json)及官方manifest/digest、实际命令、退出码和清理记录可只读复核。提交ChatGPT独立审查后，先判断这项外层能力是否值得接入原executor。不能把Node合成容器当成真实Codex宿主；实际认证、工具、内层sandbox、审批与构建边界要分别验收。

Wallpaper Engine正式草稿仍未执行。没有业务worker或G1网页访问，没有GitHub push/Vercel/DNS/广告操作，deploymentExecuted=false。当前停止本轮容器尝试，保留首个未通过门G0，不宣布整体完成。
