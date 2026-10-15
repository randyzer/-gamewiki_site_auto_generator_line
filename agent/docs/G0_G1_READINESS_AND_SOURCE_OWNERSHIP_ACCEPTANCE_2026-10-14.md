# G0/G1 真实运行准备与来源归属审核

2026-10-14 开始、2026-10-15（Asia/Taipei）完成本批核验；C2C e714 / iteration 4。工程回归通过；真实 G0/G1 仍 BLOCKED，整体未完成。第三轮已获 ChatGPT ACCEPT_SCOPED，未解除生产门。

## 本批最小变更

`official-source-host.mjs` 在任何 bsk 身份检查/审批/命令前，要求可信代码提供来源归属审核回执。回执文件绑定准确 URL、游戏、来源类型、审核方法、依据、时间、底层证据路径和摘要；sourceType 标签和网页文字不能安装审核回调。回执限定在宿主 source-ownership-reviews 目录，禁止 worker 产物作归属证据；默认无审核能力即 OFFICIAL_SOURCE_OWNERSHIP_UNVERIFIED，调用浏览器为零。

归属证明随来源产物保存引用；采集结束及 worker 结束后的检查都复验回执和底层证据。其他 URL/游戏、缺失或漂移证据拒绝。新测试全为显式 SYNTHETIC/.invalid 回执，不是实际人工审核或官网归属结论。没有增加并行 Pipeline、执行器或自动批准。

## 实际检查与结果

| 检查 | 结果 | 证据 |
|---|---|---|
| 来源类型不应自行授权的初始测试 | RED / exit 1 | `/private/tmp/c2c_e714_i4_source_red.log` |
| 来源及首页执行器定向回归 | 22 PASS / 0 FAIL | `/private/tmp/c2c_e714_i4_source_green.log` |
| 归属审核定向回归（加固路径前） | 7 PASS / 0 FAIL | `/private/tmp/c2c_e714_i4_ownership_final.log` |
| npm run test:entry-host | 61 PASS / 0 FAIL / 0 SKIP，exit 0 | `/private/tmp/c2c_e714_i4_entryhost.log` |
| npm test（加固路径前） | 376 PASS / 0 FAIL / 0 SKIP，exit 0 | `/private/tmp/c2c_e714_i4_full.log` |
| 宿主回执目录新增测试 | RED / exit 1 → GREEN / exit 0 | `/private/tmp/c2c_e714_i4_ownership_scope_red.log`、`c2c_e714_i4_ownership_scope_green.log` |
| 最终 npm test | 377 PASS / 0 FAIL / 0 SKIP，exit 0 | `/private/tmp/c2c_e714_i4_full_verified.log` |
| 最终入口及语法复验 | 61 PASS、语法 exit 0 | `/private/tmp/c2c_e714_i4_entryhost_verified.log`、`c2c_e714_i4_syntax_verified.log` |
| node --check src/official-source-host.mjs | PASS / exit 0 | `/private/tmp/c2c_e714_i4_syntax.log` |
| 历史图标 ZIP 二进制复验 | VALIDATED_BINARY_STRUCTURE / exit 0 | `/private/tmp/c2c_e714_i4_icon_binary.log`；不证明版权、原创生成或新 run 批准 |
| 本机 codex --version / exec --help / features list | 0.153.0，均 exit 0 | 实际 help 明示 ignore-user-config 后 auth 仍使用 CODEX_HOME；没有读取凭据值 |
| 同一 executor 实际命令快照 | OFFLINE_CAPTURED；模型、GUI、浏览器零启动 | [快照](../runs/TEST-executor-capabilities-6f1d6e58-5a7b-436e-aa4b-a1cd89460e4a/EXECUTOR_CAPABILITY_CONTRACT_SNAPSHOT.json)；通过 executor 的 run seam 捕获真实参数/环境键，未执行命令 |
| 官方文档工具再次读取 | BLOCKED / HTTP 403 challenge | 当前通道要求访问挑战；用户随后明确批准内置浏览器；已读取官方 permissions、app-server、managed configuration 和 agent approvals 文档，见下列依据 |

本批没有新真实 worker 隔离探测。第二批实测命名 profile 的文件、只读输入、子进程和回环结果沿用为历史 PARTIAL；命令主体与权限模块未变，新增来源路径仍是只读证据。不能把离线快照、禁用功能参数或命令 canary 推断为所有模型工具、客户端、GUI 和宿主身份均已隔离。

官方文档当前读取成功，确认 permission profile 仅控制本机沙箱命令，服务认证/浏览器/连接器分别受控；App Server 仍为实验性、官方不支持生产负载。管理员 requirements 和外层容器是官方记录的机制，不代表本项目已安装/验证。[具体依据与隔离探测待批方案](G0_ISOLATED_HOST_PROBE_PROPOSAL_2026-10-14.md)记录准确边界。

## 真实入口具体阻断

当前项目仍没有已经接线并验收的正式可信宿主机制，createProductionEntryBootstrap() 无条件返回 ENTRY_HOST_ISOLATION_UNVERIFIED。未以开关/环境变量/模型自签/危险权限解除。

1. 尚无保护宿主可执行代码和审批存储、并独立于 worker 身份的完整证明。
2. 完整模型工具集合的权限执行未获独立验证；关闭 advertised features 的配置不代替运行证据。
3. Codex 客户端认证与命令文件 sandbox 属于不同边界，当前没有验收过的隔离认证通道。
4. worker GUI/IPC 拒绝与可信操作者人工批准通道尚未真实验收。
5. G4 将执行候选项目 package scripts；现有宿主构建路径还需单独隔离，不能因 worker 命令隔离就批准任意构建。

本轮未创建 OS 用户、安装服务、修改全局沙箱或读取凭据。若需要新的系统身份/执行环境，必须先给出准确安装/变更方案并取得用户批准；当前 Agent 代码开发授权不等于这类系统变更授权。

## G1 可审查输入

[真实准备清单](../runs/PREFLIGHT-wallpaper-engine-e714-i4-20261014/G0_G1_READINESS_REVIEW.json)保存当前草稿、材料、候选来源、历史图标及各项 SHA256。

- 草稿 revision 2 / approvedToRun=false，没有新的 execution manifest；域名 wallpaperenginewiki.best，仓库 randyzer/game_wallpaperengine / main，Cloudflare 管理 DNS，Vercel 托管，未做外部配置。
- 原件 SHA256 再次一致；40 可读词、11 截断词和缺失 52–82 行保留原追溯，不补造。
- 六个候选 URL 均来自已有 manifest/研究候选/实际旧 Steam 采集文件。Steam 旧采集只证明当时 App ID 信息；其他官网/帮助/文档/公告 URL 均为历史候选，官方归属尚未重新审核，currentReadAuthorized=false。
- 旧 master-512.png 与 favicon.zip 摘要匹配旧收据，512×512；ZIP 结构合格。新 run 权利及视觉审核 false，imageGenerationIndependentlyVerified=false，旧批准不转移。
- 完整原生首页 Markdown/JSON、英语 SEO、来源事实与合格新 run 图标尚缺。没有用候选研究稿替代 PASSED。

首个未通过里程碑仍是 G0；M1 不满足，第四轮的真实 G1 执行门停止。新模型/浏览器/GUI 业务调用均为零，executionRunId=null，deploymentExecuted=false。本机 Docker CLI 已安装，但当前 daemon socket 不存在，docker info exit 1；未切换工具/context。下一步先经审查/用户同意恢复 Docker 并准备限定合成外层隔离探测，再解决可用可信宿主及确切来源/图标批准，之后沿原 Pipeline 做真实验收；不反复添加通用框架或声明整体验收完成。
