# G0 官方可信客户端最小接线：第六轮 A

2026-10-15，Asia/Taipei。当前结论：用户已明确批准A信任模型，三次分别单独获批的实际工具验收均BLOCKED；配置兼容修复后第三次触发ITEM_OUTSIDE_TURN，工具边界仍未验收通过。398项离线回归不代替真实通过。用户再次要求开发前纠偏，本轮只更新复盘与状态，不继续编码或申请新运行。正式入口继续拒绝；没有新的业务manifest、G1 PASSED或发布。下文说明属于当时记录，最新事实见末尾结果。

## 实现与范围

- 固定官方原生Codex 0.153.0路径、真实路径和SHA256（a29d9e86eef88cbbd69f97ce8c590b1d0a287c8f77424f5eef226b883d7eaa22）。每次worker前重验；环境CODEX_BIN不能改变正式宿主的CLI。
- 保留ignore-user-config、ignore-rules、strict、ephemeral、approval-never、无命令网络及命名profile。根据已读取正式配置参考，禁用登录shell、命令环境继承及view_image，进一步关闭不需要的扩展功能。CODEX_HOME仅供可信客户端正常认证，不读取或输出认证正文。请求禁用不等于实际工具边界验收。
- 复用原host、consumer、orchestrator与Pipeline。可信宿主选定的executionStages进入同一批准绑定、GUI及运行审计；许可拒绝范围外阶段。利用原shouldPause传入当前状态，首页PASSED后不调用G2。没有新runner、审批系统或状态机。
- 正式工厂只读固定宿主策略，不接收executor、批准回调、CLI或隔离布尔参数。运行证据缺失、摘要/CLI/实现漂移则ENTRY_HOST_ISOLATION_UNVERIFIED。策略runtimeEvidence目前为空；不能从任务或环境解除。
- 来源清单来自当前run的宿主审核索引SOURCE_INDEX.json，逐项验证既有归属回执及底层证据；继承原每命令真人批准和净化采集。没有有效索引/回执时BLOCKED，不调用替代工具。
- 修复已批准本地favicon交接后仍要求worker具备图像生成工具的提示冲突；不降低原创/使用权、视觉批准、ZIP字节或原生首页验收。
- 新入口preview只读展示准确草稿、executionRunId和宿主G1范围，不构造worker或签发票据。execute/resume/confirm-plan解析固定请求，拒绝额外批准旗标；交接后异常不虚报executorStarted=false。

## 实际检查

已记录CLI固定参数help/features、二进制摘要、真实Wallpaper草稿只读预览。第一批定向RED为3项失败，随后19项通过。新增来源索引RED后，扩展回归发现旧GUI测试快照没有stages导致显示异常，已用空数组显示修复；61项扩展回归通过。能力参数及新入口各有RED记录，修复后通过。

第一轮完整回归：388 PASS / 0 FAIL / 0 SKIP；入口专项65 PASS / 0 FAIL / 0 SKIP。随后增加生成工具smoke程序的两项离线执行用例，RED→GREEN，确认实际渲染的nonce/换行以及GUI/秘密环境变量的反向判断，不调用真实CLI或GUI。

最终结果及所有失败/成功日志通过C2C执行记录发布；本文件后续追加最终回归结果。测试数是工程证据，当前真实业务阶段仍未通过。

最终完整回归：390 PASS / 0 FAIL / 0 SKIP，退出0；入口专项65 PASS，退出0；生成smoke程序2 PASS，退出0；10个改动模块/脚本语法检查退出0。G1只读preview与工具smoke默认preview均退出0、未启动实际CLI。真实工具及G1仍待准确批准与实际验收。

## 下一次准确操作

```sh
node scripts/entry-host-runtime-smoke.mjs
# 默认只读预览，已执行；actualCliStarted=false。
node scripts/entry-host-runtime-smoke.mjs --execute
# 待独立代码审查与用户批准；此命令尚未执行。
```

只运行一次受限CLI模型会话（90秒上限），创建agent/runs/TEST-host-tool-smoke-UUID，使用合成Skill、nonce、只读材料和当前native输出。请求一次允许的apply_patch、一次只读apply_patch拒绝、一次固定Node命令。固定Node仅校验合成文件、秘密变量缺失和osascript无GUI的`return 7`执行拒绝。拒绝测试不打开窗口、不点击批准。整个worker关闭浏览器、Apps、插件、GUI、图像生成和命令网络；可信CLI按官方通道进行认证与模型推理。实际工具事件由宿主验证，不使用模型自述工具目录作证。

退出/超时/意外调用、事件不匹配、材料或CLI/实现变化均不通过。报告由宿主在worker输出目录外保存。通过并独立审查后，才考虑把精确报告路径和SHA写入宿主策略；此报告不授权业务run。无额外Docker、真实关键词/图标/站点挂载、外部发布或工具降级。

G1任务预览：wallpaper-engine-e714-draft-20261014 revision2 → wallpaper-engine-e714-g1-20261015-01，宿主范围仅首页；原40词资料沿用，缺失/截断仍待补。具体网页、图标与新run执行批准在G0工具验收后集中办理。

## 独立审查后的事件校验修补

ChatGPT核对执行输出51–65后接受主体接线，要求修补工具事件遗漏；真实smoke未获准也未运行。本次仅修改smoke脚本、其测试和正式入口的对应证据条件。

严格解析JSONL，检查thread/turn开始及终止、item开始/更新/完成、调用ID与作用范围配对；损坏行、未知事件/工具、额外命令/写入、缺失或重复完成、失败/异常终止和终止后的事件均拒绝。遇到拒绝事件终止当前CLI进程；未完成尾行也解析，不能静默丢弃。报告包含脱敏错误枚举和事件配对结果，正式入口额外要求eventStreamVerified及空错误列表。

参考已实际读取的[官方非交互JSONL说明](https://learn.chatgpt.com/docs/non-interactive-mode#make-output-machine-readable)。文件修改开始/完成字段属于本诊断的严格预期契约，尚未证明CLI0.153的真实流完全一致；实际不匹配时BLOCKED并保留脱敏诊断，不放宽判定取得通过。固定osascript拒绝也不代表全部macOS GUI/IPC已隔离。

事件定向RED→GREEN：7 PASS；修补后完整回归395 PASS / 0 FAIL / 0 SKIP，退出0；三处改动语法检查通过。原22文件摘要保留为历史版本，新增REVIEW1摘要记录当前版本。等待复审，真实工具及业务调用仍为0。

## 获批单次实际结果

用户明确答复“批准一次90秒受限CLI验收（推荐）”后，执行一次 `node scripts/entry-host-runtime-smoke.mjs --execute`，未重试、未降级。宿主脚本退出2；CLI子进程退出1，未收到工具事件，commandCount=0、patchCount=0、checks为空。结果为BLOCKED / SMOKE_CLI_FAILED，事件错误为RUN_TERMINATION_MISSING及EXPECTED_TOOL_SEQUENCE_MISSING，不能作为隔离通过证据。

报告：[HOST_TOOL_SMOKE_REPORT.json](../runs/TEST-host-tool-smoke-3a56d1b7-04b1-442b-b3a5-62b0bd1ea5f0/HOST_TOOL_SMOKE_REPORT.json)，SHA256 `257ab1365c77549e4042c4a6f037f5b1ee9c777fbdb15f8dbcf7201f503bda03`。报告CLI与实现摘要记录获批代码的实际身份。businessPipelineStarted=false、deploymentExecuted=false；宿主策略runtimeEvidence仍为空，G1继续关闭。

原始stderr按已审查脚本被丢弃，报告不足以区分参数解析、配置加载、客户端认证或其他启动失败。不得将本次结果描述为账号未登录、工具越权或成功拒绝；目前仅确认该CLI未产生可验收事件。允许的后续为静态配置及只读help核对、独立复审；任何新模型验收需要准确的新批准，不得自动再执行。

## 实际失败复核与最小静态诊断

既有C2C e714对话通过工作区读取报告、代码、策略及执行输出69，返回SMOKE_VERDICT=BLOCKED_CONFIRMED、ROOT_CAUSE=UNKNOWN、AUTHENTICATION_STATUS=NOT_DETERMINED。该报告是有效失败记录，不是运行权限通过证据。

静态结果：**CAUSE_UNRESOLVED_REQUIRES_NEW_RUNTIME_AUTHORIZATION**。参数以`exec`开头，配置与disable项在末尾stdin参数`-`前，smoke只在其前插入`--json`；已保存的同版本help明示对应旗标存在。命名profile沿用既有构造，新增配置按本轮已读取的官方参考设置布尔、字符串及表类型。cwd为本次合成native目录；只读材料、固定脚本、允许patch、测量文件及结果文件均由同一新UUID目录构造，`../../../../readonly-proof.md`指向合成run内的只读材料。环境只按workerEnvironment允许的名称传递；未读取HOME/CODEX_HOME下的内容。上述检查没有证明配置加载或认证成功，未发现可确认的静态根因，故不猜测并修改参数。

按独立复核方案，仅在既有smoke脚本及测试增加stderr分类：最多8192字节内存缓冲；只返回参数、配置、认证、权限或连接的固定提示枚举，未知内容为UNCLASSIFIED_STARTUP_ERROR，无内容为STDERR_EMPTY；超限只记录truncated。路径、原文、令牌及环境值不落盘，分类提示不证明根因、账号状态或工具边界。此机制不能恢复本次已丢弃的stderr，也没有执行新的CLI会话。原失败报告字节与摘要不变；源码更新后实现摘要将变化，旧报告不得改写为新实现证明。

本轮改动为smoke脚本、其测试及三份状态文档；宿主策略、执行权限、验收条件、业务Pipeline不变。诊断专项RED为7通过/3失败（缺分类器），GREEN为10通过/0失败；新增脚本与测试语法检查通过。完整回归398 PASS / 0 FAIL / 0 SKIP，退出0；没有新的CLI模型会话。改动待独立复审，未申请或执行第二次真实验收。

### 诊断改动独立复审与下一次提案

C2C e714通过指定工作区读取源码、五文件摘要、原报告及输出70–72，返回ACCEPT_SCOPED / STARTUP_DIAGNOSTIC_OFFLINE_ACCEPTED。398项全量及10项专项记录核对通过；ROOT_CAUSE=UNRESOLVED、NEXT_DIAGNOSTIC_AUTHORIZED=false、runtimeEvidence=null、G0 BLOCKED、G1未通过。诊断改动已接受，但这不是新的运行批准。

下一项具体提案仍为 `node scripts/entry-host-runtime-smoke.mjs --execute`，仅一次、90秒，原固定官方CLI0.153.0及摘要、原权限和禁用项不变。仅新建TEST UUID目录内的合成Skill/nonce/材料；原一次合法patch、一次只读patch拒绝、一次固定Node命令及无界面osascript拒绝检查不变。唯一新增行为为最多8192字节stderr内存分类，报告不保存原文。可信客户端按已批准A模型正常认证和访问官方模型服务，模型命令不能联网。无Docker、浏览器、真实资料/站点、发布或宿主权限修改。结果须独立复核，不自动登记运行证据，失败不重试。用户此前一次批准已使用，须取得此项新的明确批准后才执行。

## 第二次单独获批诊断：配置类提示

用户答复“批准新的一次90秒受限诊断（推荐）”后，执行上述命令一次，宿主退出2、CLI退出1、零命令/patch事件；未重试。实际报告为[第二次HOST_TOOL_SMOKE_REPORT.json](../runs/TEST-host-tool-smoke-1b4766c9-309d-4dd0-b50a-442c4e7e17a9/HOST_TOOL_SMOKE_REPORT.json)，SHA256 `929849332cab10e1a158e900c0a56652ca02b357c10b7a622634b34cf7a20973`。

startupDiagnostic.observed=true、truncated=false，唯一类别为CLI_CONFIG_ERROR_HINT；状态仍BLOCKED / SMOKE_CLI_FAILED。它只说明文本匹配到配置错误提示，未保存具体错误字段，不能认定认证失败、权限有效或工具越权。下一步仅核实固定0.153.0的配置契约，避免再盲目重复模型运行。已登记执行记录并交同一C2C对话复核。两次报告保持原字节；runtimeEvidence=null，businessPipelineStarted=false、deploymentExecuted=false，真实G1关闭。

## 固定0.153.0配置兼容性最小修复

C2C读取输出73及源码，并引用[OpenAI rust-v0.153.0配置Schema](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/core/config.schema.json)，识别tools.view_image为HIGH_CONFIDENCE_STATIC_CANDIDATE，运行确认仍待完成。Codex随后在已批准内置浏览器直接读取同一标签页面，核实ToolsToml.additionalProperties=false，仅列experimental_request_user_input、update_plan、web_search；features.view_image存在且为boolean。

最小代码修复仅从skill-executor.mjs移除`-c tools.view_image=false`；保留既有`--disable view_image`及其余全部配置、strict、命名profile、身份检查、工具禁用和网络限制。worker-permissions.test.mjs先改断言取得RED（2通过/1失败），再修复取得GREEN（3通过/0失败）；全量398 PASS / 0 FAIL / 0 SKIP，退出0，执行器语法检查通过。没有新的模型调用或运行证据登记。

通过原createSkillExecutor注入离线捕获函数，在独立临时合成目录捕获实际30条配置覆盖项（含22个disable映射），Python3.14 tomllib成功解析；捕获过程CLI调用数为0。随后只在已加载官方Schema页面内存中核对普通覆盖项与全部feature的路径、布尔/字符串/表类型及枚举，invalidPaths为空。命名profile另核对PermissionProfileToml的filesystem/network对象形状及NetworkToml.enabled布尔；PermissionsToml及动态filesystem字段在公开Schema中为宽泛对象，不能声称完成该部分语义或运行时验证。既有权限测试保持原路径/网络断言。

静态结论：**STATIC_CONFIG_COMPATIBILITY_PASS_SCHEMA_EXPOSED_FIELDS**；已确认一个不支持的配置键并移除，不等于已证实唯一运行根因或实际启动通过。完整Schema文件下载被浏览器拒绝（下载权限未批准），未使用替代下载路径、未落盘完整Schema；以上依据来自已准许读取的页面字段。

本批待独立差异复审；随后若获新的明确批准，才执行修复后的同一单次90秒合成工具验收。两份失败报告不改写，runtimeEvidence=null，G0仍BLOCKED，G1未通过。

### 最小配置修复复审结论

C2C读取输出74–76、五文件摘要及当前源码后返回ACCEPT_SCOPED：REMOVED_UNSUPPORTED_CONFIG=PASS、VIEW_IMAGE_FEATURE_DISABLED=PRESERVED、PERMISSION_PROFILE=UNCHANGED、STATIC_SCHEMA_EXPOSED_FIELDS=PASS、FULL_REGRESSION=398_PASS。ROOT_CAUSE_CONFIRMED=false，REAL_CLI_RUNTIME=NOT_RETESTED；静态修复不宣称前两次唯一根因或完整权限语义通过。

复审支持申请修复后的同一单次90秒smoke（NEXT_SMOKE_AUTHORIZED=false）：沿用固定CLI0.153.0/身份摘要、原合成材料与新TEST UUID写入范围、两次patch及一次固定Node/无界面osascript拒绝检查、命令无网络、stderr内存8192字节分类和失败即停；不批准Docker、真实G1、发布、额外工具或权限放宽。正常客户端认证仍按用户已批准A模型处理。当前两次单次批准均已消耗，任何新运行仍须新的明确批准；即使通过也先复审报告，不自动登记runtimeEvidence。

## 第三次单独获批复验与用户再次纠偏

用户答复“批准修复后一次90秒受限复验（推荐）”后，执行一次原命令，宿主退出2；结果BLOCKED / SMOKE_EVENT_STREAM_REJECTED。报告：[第三次HOST_TOOL_SMOKE_REPORT.json](../runs/TEST-host-tool-smoke-96ecc14a-af42-412b-89e9-b4746cd95c36/HOST_TOOL_SMOKE_REPORT.json)，SHA256 `5fad8474d39f9bedaa36f3f54fe8b947ce25ee521baddd3f9d2967552814236f`。事件错误ITEM_OUTSIDE_TURN、RUN_TERMINATION_MISSING、EXPECTED_TOOL_SEQUENCE_MISSING；CLI退出码null，stderr未观测；已校验命令/patch完成数0。报告的unexpectedToolEvents=3是错误枚举数，不能解释为三次实际未授权工具调用。原始事件未存储，无法仅凭此报告确定具体item类型或实际顺序差异。没有自动重试；businessPipelineStarted=false、deploymentExecuted=false，runtimeEvidence=null。

运行结束后用户再次要求先复盘核心目标和偏离。按[再次纠偏](CORE_GOAL_AND_DEVELOPMENT_REALIGNMENT_2026-10-15.md)暂停自动推进：本轮只作证据核对、规划更新与独立复核，不继续代码修补、测试扩展或新模型验收提案。下一技术交付仅为固定版本事件契约的静态核实和可审查最小方案，不放松验收条件，不追加通用框架。首个业务交付仍是同一Pipeline的真实Wallpaper Engine G1 PASSED。
