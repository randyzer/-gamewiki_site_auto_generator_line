# 第七轮：固定协议修复与真实 G1 准备

2026-10-15（Asia/Taipei）。用户恢复既定计划下的本地开发；先前的规划暂停已解除，三次单次真实验收批准仍全部已使用。本轮没有新增真实 smoke、Docker、G1 worker 或发布授权。沿用 A 信任模型、唯一 Pipeline 和锁定专业 Skills。

## 1. 有限技术决策

结论为 **STATIC_CONTRACT_CORRECTED / RUNTIME_UNVERIFIED**。固定版本存在已证实的事件兼容性缺陷，已在原脚本中修复。此结论不证明第三次失败根因已解决，不授予第四次运行，也不能登记 runtimeEvidence。

官方来源均为 OpenAI `rust-v0.153.0`，通过既有 ChatGPT 协作和内置浏览器只读核对，未下载源码或 Schema：

| 固定版本来源 | 核实结果及处理 |
|---|---|
| [exec_events.rs / ThreadItemDetails](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/exec/src/exec_events.rs#L104-L133) | FileChange 定义为补丁成功或失败时的 completed 事件。现在允许 turn 内的直接完成，仍核对 ID、唯一路径、单个 change、add/update、目标状态及最终文件。 |
| [JSONL 转换器](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/exec/src/event_processor_with_jsonl_output.rs) | map_completed_item_mut / completed_item_id 可以为没有 start 的项目分配 ID；PatchApplyStatus::Declined 映射为 failed。仍支持转换器能映射的 started/completed 文件事件，匹配的 ID 和作用域不得变化。 |
| [collect_warning / collect_thread_events](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/exec/src/event_processor_with_jsonl_output.rs#L396-L499) | ConfigWarning、Warning、DeprecationNotice、ModelRerouted 可以映射为 item.completed/type:error；转换函数不检查 turn。现在单独归类为 CLI_NON_TOOL_ERROR_REPORTED，仍立即阻塞，不保存消息正文、不算作工具、不自动允许警告。 |
| [命令生命周期 Rust 测试](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/exec/tests/event_processor_with_json_output.rs#L168-L249) | 命令保留 started→completed、精确命令、exit_code=0 和固定 stdout 要求；源码不保证模型一定选择当前允许的 shell 包装，未扩大白名单。 |
| [文件成功与拒绝 Rust 测试](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/exec/tests/event_processor_with_json_output.rs#L816-L917) | 合成测试按官方完成形状构造；预期 failed 不单独证明权限拒绝，仍需真实只读文件未变和宿主边界共同成立。 |
| [exec 启动路径 lib.rs](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/exec/src/lib.rs) | 启动警告传入服务通知；此处不能还原旧运行的具体消息或触发事件。system_bwrap_warning 路径有 !json_mode 条件，不能据此推断旧 JSONL 失败是该警告。 |

其余行为：agent_message/reasoning 可在 turn 内直接完成；todo_list 必须先开始；额外工具、未知事件、损坏 JSON、重复/缺失完成、越界 patch、额外命令、异常退出和不完整 turn 均拒绝。没有修改宿主权限、执行器、正式报告门、原始 Skill 或状态机。

第三次报告 `runs/TEST-host-tool-smoke-96ecc14a-af42-412b-89e9-b4746cd95c36/HOST_TOOL_SMOKE_REPORT.json` 的 SHA256 仍为 `5fad8474d39f9bedaa36f3f54fe8b947ce25ee521baddd3f9d2967552814236f`。旧代码在识别 item 类型前就检查 turn，因此报告仅含 ITEM_OUTSIDE_TURN **不能排除 type:error**，也不能证明是警告。其 unexpectedToolEvents=3 是错误代码数量，不是三次工具调用；cliExitCode=null，无已验收工具。

**下一决策门：** 独立审查本轮修复和旧触发未知的影响。不得据“离线通过”声称真实问题已解决或立即申请相同盲测；若必要事件或运行方式仍无充分依据，必须给出 TECHNICAL_DECISION_REQUIRED 和具体受支持路径。正式宿主仍要求真实 PASSED 工具报告及当前实现摘要。

## 2. 离线验证

仅修改 `scripts/entry-host-runtime-smoke.mjs` 和对应测试；测试 fixture 明确为合成事件，不是真实 CLI 证据。

| 命令 | 结果 | 本地完整输出 |
|---|---|---|
| node --test tests/entry-host-runtime-smoke.test.mjs（修复前） | 12通过 / 4失败，退出1 | /private/tmp/c2c_e714_i7_protocol_red.log |
| 同一命令（修复后） | 16通过 / 0失败，退出0 | /private/tmp/c2c_e714_i7_protocol_green.log |
| npm test | 404通过 / 0失败 / 0跳过，退出0 | /private/tmp/c2c_e714_i7_full.log |
| node --check scripts/entry-host-runtime-smoke.mjs | 退出0 | /private/tmp/c2c_e714_i7_syntax.log |

## 3. 已确定的真实输入

Wallpaper Engine / Steam431960，Application / Utilities，English Help & Troubleshooting Wiki；Windows10/11、Android配套应用。40个完整可读词已获用户批准，11个截断词与缺失52–82行保留待补，不改写原件、不重新索取已确认口径。

域名 wallpaperenginewiki.best；仓库 randyzer/game_wallpaperengine，main；Cloudflare 管理 DNS，Vercel 托管，均为计划信息，未证明平台已配置。audit-only；广告不启用；deploymentExecuted=false。

以下材料本轮重新读取并计算 SHA256：

| 材料 | 字节数 | SHA256 |
|---|---:|---|
| runs/wallpaper-engine-e714-draft-20261014/ENTRY_INTAKE_V1.json | 1466 | 1af30e8865683f64790cb38878bd7a93a28d91c6ebc53e1b59d92d13615be5ef |
| /Users/randyz/work/coding/hot_words_web/gameweb/game_WallpaperEngine/background_information/keyword-materials/关键词.md | 12567 | d79c1bd48c75553bda5c056b8adc898bfb5065b4648b64637e0a1bdca4824aa4 |
| runs/PREFLIGHT-wallpaper-engine-e714-i2-20261014/complete-readable-keywords.md | 1629 | 486b49a1a8e13cfa4f338a6e906a0552c82e2d1e6159bbaa78563dc280a3409e |
| 同目录 KEYWORD_SOURCE_LINEAGE.json | 8595 | 6c5964f2e420acae4150d043cea77ff79b6204b1eaf73904ed21aa22e90044a4 |
| runs/wallpaper-engine-m3-20261014-01/m3-local-favicon/input/master-512.png | 131843 | 5c922db3f0609aa757e97c4deb124bafc1075b5a50e1cacba12b4120e6445285 |
| 同 run m3-local-favicon/output/favicon.zip | 190274 | d269135a857a0afc6e897c9cc9210130d4196103a246cd4b34d22b4e8d6ebdbb |

草稿为 revision2、approvedToRun=false、ENTRY_ONLY_NO_WORKER。拟正式 run `wallpaper-engine-e714-g1-20261015-01` 的 manifest 和 workspaces 下 site 均不存在。没有提前创建正式执行根、来源审核或批准记录。

## 4. 距离真实 G1 PASSED 的具体缺口

### 来源与当前网页适配

现有候选只来自历史 readiness 清单；本轮没有访问这些业务页面，候选不等于内容验证或当前 run 读取授权：

| 精确候选 URL | 路径 / 缺口 |
|---|---|
| https://store.steampowered.com/app/431960/ | 既有独立 Steam 宿主采集路径；不能放入只接受三类官方来源的 SOURCE_INDEX |
| https://www.wallpaperengine.io/en | OFFICIAL_WEBSITE，待当前 run 归属审核与读取批准 |
| https://help.wallpaperengine.io/en/ | OFFICIAL_HELP，同上 |
| https://docs.wallpaperengine.io/en/ | OFFICIAL_HELP，同上 |
| https://steamcommunity.com/app/431960/announcements/ | OFFICIAL_ANNOUNCEMENT，列表页不能冒充具体公告详情 |
| https://help.wallpaperengine.io/en/mobile/pairing.html | OFFICIAL_HELP，待当前 run 归属审核与读取批准 |

`official-source-host.mjs` 要求固定 run 内的 `source-ownership-reviews/SOURCE_INDEX.json`，每一项绑定真实审核文件、SHA256 和底层证据；允许1–12项，禁止查询参数、重定向到其他最终URL，逐条执行仍经既有人工审批。Steam 与官方来源分别采集，worker 仅获只读证据，没有网页工具。

**业务接入缺口：** 锁定首页 Skill 要求核实官方频道及一个已核验视频。`bsk-command-gate.mjs` 的官方正文提取只取标题/段落，不取链接或嵌入视频；Steam 结构化提取也没有视频和社区链接字段。现有六个 URL 与采集器不能证明已满足该要求。需要在既有宿主采集路径上补一个精确、有证据的链接/视频读取方案，或审查已经存在且符合契约的可信宿主材料路径；不得静默省略视频、编造频道、擅自采用匿名/第三方替代工具。此处记录缺口，尚未实现或授权新采集。

### 图标

历史 master 与 ZIP 可供审核，但历史 imageGenerationIndependentlyVerified=false 仍须保留。文件存在及本地转换不能证明独立调用图像生成工具。锁定 Skill 的原创生成要求仍有效；采用历史图稿须先解决其来源证据是否符合原契约，不能仅用“有权使用”替代生成要求。

真实 run 还缺：绑定准确 master SHA256 的原创/权利声明、视觉批准、当前 run 转换收据与独立 PNG/ZIP 验证。优先复用已有本地转换器；不再为自动上传增加框架。若历史来源不合格，在具体 G1 授权后由可信宿主生成新的原创透明512px图稿并审核，不把 image_generation 权限开放给 worker。

### 产物与创建顺序

锁定 Skill：`../codex-skills/game-homepage-icon-research/SKILL.md`，SHA256 `e3e327fc33f76b59007e47e5084b79b85ec913b1a91f6e299f9680f1441b0c84`。

在首页 stage 的 native 工作目录形成：

- backgroundinformation/Wallpaper Engine攻略站首页调研信息.md
- backgroundinformation/Wallpaper Engine图标.zip

必须包含完整首页 JSON、英文 SEO、来源和官方未知项处理；标题≤60、描述140–160、关键词≤100等原契约有效。通过原生 validate_outputs.py 和宿主严格校验后才能 PASSED；旧 run 的二进制图标通过不能替代首页通过。

现有正式入口先独占创建新 run，再进入 Pipeline；来源与图标回执又要求绑定已存在的 run。不能提前手工创建正式目录破坏该约束。后续运行方案必须使用已有 BLOCKED/WAITING_FOR_USER 检查点与新鲜摘要绑定的批准恢复，明确首轮可能先停在材料门；不能把一次“批准G1”默认为多次重试。当前 compose 只启用首页，G1完成后暂停；G2等后续适配在其真实阶段接入，不预先放开全部阶段。

## 5. 交付主线

下一业务验收仍是 **Wallpaper Engine 真实 G1 PASSED**。之后依次完成40词研究、模板复制、内容与生产构建、桌面/移动 UI 审计、全发布路由 prelaunch、部署计划及用户独立 planDigest 确认。共七个原始核心 Skill，不增加业务阶段。

当前真实新站为0/7；runtimeEvidence=null。404项回归与本轮局部审查只能证明所列代码范围。部署、Git push、DNS、数据接入、广告和批量执行均未启动。

## 6. 独立审查

既有 C2C e714 / iteration7 通过工作区连接器读取当前文件及输出78–81后返回 ACCEPT_SCOPED、STATIC_PROTOCOL_CONTRACT_SUFFICIENT_FOR_BOUNDED_RUNTIME_PROPOSAL、TECHNICAL_DECISION_REQUIRED=false。必要静态契约已有充分版本依据；旧触发仍未知，真实效果仍待单独批准后的证据。

下一批先完成 G1_MEDIA_EVIDENCE_AND_RUN_CHECKPOINT：可信视频/频道材料交接、缺材料时在浏览器/worker前暂停、沿用独占创建与重新批准恢复、将实际采集代码纳入实现摘要，再做定向拒绝测试和回归。原因是先取得smoke报告再改来源接线会改变实现摘要，导致报告失效。不得先做新smoke，再扩展接线。

审查还要求材料门必须早于Steam采集，并保护实际网页提取模块 bsk-command-gate.mjs 的身份。未授予任何真实运行、网页访问或业务执行权限，G0/G1仍未通过。
