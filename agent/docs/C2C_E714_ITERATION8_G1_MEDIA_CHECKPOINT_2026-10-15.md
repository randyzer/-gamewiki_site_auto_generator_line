# 第八轮：G1 媒体证据与材料检查点

2026-10-15，Asia/Taipei。按用户“继续既定计划直至核心目标”要求及C2C e714第七轮纠偏复审实施。范围仅为既有可信宿主、采集门、执行器和七阶段Pipeline的首页接线；未启动新的实际CLI模型会话、业务浏览器、Docker、正式G1或发布。ChatGPT协作对话继续复用。

## 实现结果与限制

- `homepage-media-host.mjs`：固定读取本run的 `source-ownership-reviews/MEDIA_SCOPE.json` 与既有 `SOURCE_INDEX.json`，核验run/game、来源归属及准确URL。新增范围只支持官网引用的一个YouTube视频；其他视频路径继续阻塞，没有把“热门”或“官方”标签交给模型自行判断。
- `bsk-command-gate.mjs` / `bsk-policy.mjs`：两种有限DOM类型 OFFICIAL_MEDIA_LINKS_V1、PUBLIC_VIDEO_PAGE_V1。官网最多8个媒体链接；视频只读取canonical/OG身份、标题和公开发布频道。相对href按当前网页解析后仍须通过固定格式检查。精确watch地址的v参数仅在该宿主媒体范围有效，未扩大普通query策略。
- 媒体采集沿用已有BSK服务及真人逐命令审批，固定7次：创建自有窗口、列自有tab、官网navigate/capture、视频navigate/capture、关闭自有窗口。官网嵌入链接不冒充已访问的视频页；重定向最终URL必须匹配准确目标。未播放、下载或声称看完整视频。
- `homepage-media/MEDIA_EVIDENCE.json`及净化原始采集文件只由宿主写入，回执最大64KiB、只读。复核重新推导官网引用/频道关系，核对当前来源索引、底层文件SHA256、7条命令审计、批准消费、精确采集程序及执行状态。仅有人工声明、verified布尔或回执本身不能证明独立采集成功。频道不匹配时NOT_CONFIRMED。
- `skill-executor.mjs`：在native目录创建、浏览器批准、Steam采集及worker之前检查来源/媒体范围和图标准备。缺材料WAITING_FOR_USER，材料无效BLOCKED。原有图标互斥及当前run批准检查先执行；没有增添第二套状态。实际媒体证据在worker前后复核。
- `worker-permissions.mjs`：只允许worker读取当前run的精确媒体回执路径，并核对摘要；媒体目录和原始采集/审计文件不开放写权限。模型仍无浏览器/外网/GUI权限。
- `entry-host-bootstrap.mjs`：正式工厂固定接线，扩展代码身份清单覆盖媒体、实际采集门/策略/服务、图标交接及校验代码。唯一Pipeline、独占创建、新鲜manifest摘要绑定的恢复和G1-only暂停保持。
- `official-source-host.mjs`：索引中所有网址都在任何Steam操作前完成格式/私有路径检查；不是只检查媒体选中的一个网址。

媒体范围文件严格字段：kind=HOST_G1_MEDIA_SCOPE_V1、runId、gameIdentity、sourceUrl、videoUrl。videoUrl必须为 `https://www.youtube.com/watch?v=<11位ID>`；来源须在当前run已审核索引中。范围文件不是网页读取批准，所有实际命令仍另有真人批准。

**运行顺序：** 正式入口合法创建新run和manifest → 材料缺项暂停 → 可信宿主在该run准备来源、准确媒体候选与图标材料 → previewEntryResume及新的人工批准 → 受控采集 → 原生首页worker与验收 → G1 PASSED后暂停。没有预建正式目录或移用旧批准。

**尚未实现/验证：** 自动发现并选择未知视频候选、非官方热门视频的指标核验、Steam视频格式、频道handle与channel-id别名归一、真实页面DOM适配。当前需要可信操作者先提供准确候选范围，仍以真实官网引用和视频页采集双重核验；来源无可核实视频就阻塞。历史图标的独立生成来源仍未验证，不因本批接线变成已验证。

## 修改文件

实现7个：src/homepage-media-host.mjs（新增）、src/bsk-command-gate.mjs、src/bsk-policy.mjs、src/official-source-host.mjs、src/skill-executor.mjs、src/worker-permissions.mjs、src/entry-host-bootstrap.mjs。

测试7个：tests/homepage-media-host.test.mjs（新增）、tests/browser-host-executor.test.mjs、tests/worker-permissions.test.mjs、tests/entry-host-bootstrap.test.mjs、tests/helpers.mjs、tests/m3-homepage-manual-handoff.test.mjs、tests/m3-dual-favicon-skill.test.mjs。历史下游测试显式注入合成readiness及经同一验证器验证的媒体材料，正式工厂不接收这些回调。

文档：本文件、总体路线图及docs索引。锁定Skill、Pipeline、orchestrator、local-entry-approval、宿主策略runtimeEvidence未改。

## 验证证据

| 命令/阶段 | 结果 | 完整本地输出 |
|---|---|---|
| 新媒体定向RED | 0通过/8失败，退出1 | /private/tmp/c2c_e714_i8_media_red.log |
| 媒体首轮GREEN | 8通过，退出0 | /private/tmp/c2c_e714_i8_media_green_attempt1.log |
| 旧下游联测首次 | 34通过/8失败，缺新增材料门fixture，退出1 | /private/tmp/c2c_e714_i8_integration_attempt1.log |
| 索引全部URL提前检查RED | 0通过/1失败，退出1 | /private/tmp/c2c_e714_i8_source_scope_red.log |
| 入口首次 | 65通过/1失败，新增测试误用汇总字段，退出1 | /private/tmp/c2c_e714_i8_entry_host.log |
| 相对频道href RED | 0通过/1失败，退出1 | /private/tmp/c2c_e714_i8_relative_href_red.log |
| 最终定向联测 | 65通过/0失败/0跳过，退出0 | /private/tmp/c2c_e714_i8_directed_current.log |
| npm run test:entry-host | 66通过/0失败/0跳过，退出0 | /private/tmp/c2c_e714_i8_entry_host_final.log |
| npm test，最终源码 | 419通过/0失败/0跳过；输出正常结束，退出码因会话中断未从进程句柄取回 | /private/tmp/c2c_e714_i8_full_current.log |
| npm test，补齐中断退出证据 | 419通过/0失败/0跳过，退出0 | /private/tmp/c2c_e714_i8_full_verified.log |
| 14个改动mjs语法检查 | 全部通过，退出0 | /private/tmp/c2c_e714_i8_syntax_current.log |

此前完整回归419通过、退出0见 `/private/tmp/c2c_e714_i8_full.log`，其后增加相对href修复及对应测试。最终版本TAP虽正常结束，但因中断未取回进程退出码，已单独重跑一次补齐419项通过、退出0；不是新的真实工具验收。

合成用例显式SYNTHETIC_OFFLINE_ONLY，不是真实视频核验。覆盖来源/URL错误、审批拒绝、审计作用域/摘要/重复、手写验证声明、原始采集篡改、重定向、频道不匹配、symlink、超大回执、worker后篡改、只读权限、缺材料零浏览器/worker，以及正式独占创建→WAITING→同run新批准resume、G2不启动。

当前宿主实现SHA256：`01443960a30286258a35bb916fc2ab3eeba407c3870bdf1288be1c43bdaa67da`。7个实现文件摘要见 `/private/tmp/c2c_e714_i8_identity.json`。旧三次失败报告不改写，config/entry-host-policy.json的runtimeEvidence仍为null。

## 下一门

既有C2C e714 / iteration8读取当前源码、测试及输出82–91后返回 **ACCEPT_SCOPED**。媒体契约、原始证据复核、逐命令批准链、前置材料门、WAITING/resume及worker只读交接均为OFFLINE_ACCEPTED。认可当前实现的一次90秒G0提案可提交用户，NEW_G0_RUNTIME_AUTHORIZED=false；无必须继续修补的明确G0前置缺陷。

ChatGPT核对的是记录中的实现摘要，未独立重算；Codex本轮已重新计算并确认实现文件未变化。上述接受不代表真实工具或页面可用。此前三次单次批准均已消耗，不能直接执行。即使G0实际报告通过也先复审，再为登记准确报告及G1新run取得对应批准。当前真实新站仍0/7，runtimeEvidence=null，deploymentExecuted=false。

### 待复审的精确单次工具验收提案

默认只读预览 `node scripts/entry-host-runtime-smoke.mjs` 已退出0，actualCliStarted=false；结果见 `/private/tmp/c2c_e714_i8_smoke_preview.json`。预览只核对固定CLI身份，不启动模型。

复审接受后，待用户明确批准的唯一命令为：

```sh
node scripts/entry-host-runtime-smoke.mjs --execute
```

固定官方CLI0.153.0、SHA256 `a29d9e86eef88cbbd69f97ce8c590b1d0a287c8f77424f5eef226b883d7eaa22`；当前宿主实现摘要如上。仅一次、最多90秒，新TEST UUID目录内合成Skill/nonce/只读材料；一次合法patch、一次预期拒绝的只读patch、一次固定Node命令。Node只检查合成文件/秘密环境变量缺失，并尝试无界面的 `/usr/bin/osascript -e 'return 7'`，要求权限拒绝，不操作任何窗口。

本次具体目标：验证固定版本官方允许的patch直接完成形状、严格命令配对及既有允许/拒绝边界是否共同成立。CLI_NON_TOOL_ERROR_REPORTED仍立即阻塞，警告原文不保存；旧失败触发仍未知，不承诺本次会通过。stderr最多8KiB内存分类。保留命令无网络、原命名profile和全部工具禁用；可信官方客户端依已接受A模型正常认证并访问官方模型服务，不读取/复制/输出凭据正文。

失败即停，无自动重试或工具替代；报告PASSED也先独立复核，不自动登记runtimeEvidence。没有Docker、业务网页、Wallpaper Engine资料、真实G1、新站、发布或宿主权限变更。此次批准只覆盖这个合成验收，不解锁业务运行。

## 第四次单独获批实际结果

用户明确答复“批准一次90秒受限验收（推荐）”后，先重新核实当前实现摘要完全相同，再执行上述命令一次；宿主退出2，没有重试。报告为 `runs/TEST-host-tool-smoke-69a47b55-74ef-4ebe-bf1a-2e80ce7565fe/HOST_TOOL_SMOKE_REPORT.json`，SHA256 `a340736a09a6ac3ddde57beffbf1434930deaa5440556ee418ce7bcd255457bd`，实现摘要与获批版本一致。

结果 BLOCKED / SMOKE_EVENT_STREAM_REJECTED；eventErrors为CLI_NON_TOOL_ERROR_REPORTED、RUN_TERMINATION_MISSING、EXPECTED_TOOL_SEQUENCE_MISSING。cliExitCode=null，stderr为空，commandCount=0、patchCount=0、toolEvents=[]、checks={}。CLI非工具信息被识别并导致主动终止；不能将错误枚举数3描述为三次工具调用。

与第三次相比，新增事实是本次确实遇到了type:error的item事件；该类型在固定官方版本也承载warning/deprecation/model-reroute等信息，但正文未保留，因此具体来源及严重性未确定。不能宣称配置、认证、网络或权限边界已通过，也不能据此还原第三次触发。没有业务Pipeline、真实G1或发布，runtimeEvidence仍为null；本次批准已消费。

完整命令输出 `/private/tmp/c2c_e714_i8_actual_smoke4.log` 已保存。接下来先独立复核这个失败事实及具体、受支持的无盲测诊断路径；不直接申请第五次相同运行，不扩大事件/权限白名单，不追加通用框架。

## 第九轮：首条错误诊断修补（离线）

第四次失败经同一ChatGPT会话独立复核为BLOCKED_CONFIRMED。终止/序列缺失可能是收到错误后主动终止的结果；根因仍UNKNOWN。裁决为FAIL_CLOSED_FIRST_ERROR_DIAGNOSTIC，拒绝第五次相同盲测。

只修改现有 `scripts/entry-host-runtime-smoke.mjs` 与 `tests/entry-host-runtime-smoke.test.mjs`，没有新增runner、权限系统或业务步骤。首次合法item.completed/error的message限制4096 UTF8字节，固定模板分类只输出枚举、字节数、截断及私有查看状态；标记PATTERN_HINT_ONLY，不代表通知来源或根因已确认。未知、损坏、超长均阻断；原两次patch、固定Node、只读/GUI拒绝和命令权限完全保留。

固定rust-v0.153.0源码依据：

- [config/mod.rs](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/core/src/config/mod.rs#L2153-L2175)：requirements fallback；[permission profile fallback](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/core/src/config/mod.rs#L4650-L4667)。
- [permissions.rs](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/core/src/config/permissions.rs#L894-L914)：未知路径被忽略、缺少有效文件规则。
- [features/lib.rs](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/features/src/lib.rs#L668-L713)：弃用通知。本轮仅精确覆盖web_search系列与use_legacy_landlock；任意legacy别名或服务端summary仍UNKNOWN。Codex在官方浏览器源码页核对了这些键及details。
- [unstable warning](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/features/src/lib.rs#L1714-L1760)、[model reroute](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/exec/src/event_processor_with_jsonl_output.rs#L486-L500)、[event lag](https://github.com/openai/codex/blob/rust-v0.153.0/codex-rs/exec/src/lib.rs#L1406-L1408)：只识别固定消息形状；动态字段不保存。unstable键不写入报告、不证明该键有效。没有--ignore-rules警告映射依据，不实现该类别。

普通 `--execute` 不保留原文供查看、不会打开窗口。新增 `--diagnose-first-error` 需要另一次明确授权：CLI关闭后，仅对未知且结构/长度合法的首条信息，宿主可通过固定osascript程序的stdin传递，先征求本机查看同意，再显示最多12秒；同意窗口也最多12秒，子进程硬限28秒。原文不进入argv、stdout、报告、日志、模型或ChatGPT；取消/超时/异常固定DIAGNOSTIC_UNAVAILABLE。内存Buffer随后清零，不声称JavaScript字符串能被可靠擦除。

诊断CLI预算60秒、私有查看预算28秒。仅新TEST UUID目录，固定官方0.153.0及原权限；任何首条错误仍立即终止CLI进程组，等待关闭，不继续工具。诊断报告使用独立HOST_CODEX_CLIENT_FIRST_ERROR_DIAGNOSTIC_V1类型且始终BLOCKED，即使任务意外完成也不能作为生产runtimeEvidence。离线测试注入模拟子进程，未调用真实窗口；其AppleScript展示行为尚未经实际GUI验证。

当前代码身份：`817c5c14d486a4eb2dae217cbbc81592fc8a8f5dd8ac23e53c747c5e707084ef`。第八轮01443960…为历史获批版本，不得复用为新批准的代码身份。第四次批准已消费，新诊断尚未获批；runtimeEvidence=null，真实G1未启动，0/7，deploymentExecuted=false。

### 待独立复审的唯一下一运行提案

```sh
node scripts/entry-host-runtime-smoke.mjs --diagnose-first-error
```

目的仅为定位首条CLI非工具错误，不预期G0通过。仅一次、失败即停，无重试；固定CLI身份如上、模型命令无网络，可信客户端按用户已接受A模型正常认证调用官方模型。只写新合成TEST目录，不读取/输出凭据正文。新增的本机同意/诊断窗口必须在这次单独授权中明确覆盖；不得截图诊断窗口或请用户复制秘密入聊天。没有Docker、业务网页、真实G1、Git push、DNS或发布。

离线复审通过前不提交执行；之前所有单次批准不覆盖本提案。

### 第九轮离线验证记录

定向21项通过，完整 `npm test` 424项通过/0失败/0跳过、退出0，两个改动mjs的 `node --check` 退出0。日志分别为 `/private/tmp/c2c_e714_i9_directed.log`、`/private/tmp/c2c_e714_i9_full.log`、`/private/tmp/c2c_e714_i9_syntax.log`。新增5项测试覆盖首条保留/清理、长度及结构、模拟私有查看、固定模板分类和非工具错误无效结构；原协议拒绝测试保留。

RED→GREEN过程日志均按同一C2C任务第九轮登记：first_error_red/green1、parser_integration_red/parser_green、private_unavailable_red/green、classification_red/green。RED是预期测试失败，未调用真实CLI/GUI。第四次真实失败记录保持原样，不用本轮离线通过替代。

### 第九轮独立裁决

同一ChatGPT会话读取实际代码及执行输出93–103后返回ACCEPT_SCOPED；FIRST_ERROR_DIAGNOSTIC、固定模板提示和私有交接获得离线接受，原拒绝条件保留。ONE_DIAGNOSTIC_PROPOSAL=READY，但NEW_RUNTIME_AUTHORIZED=false、NEW_GUI_AUTHORIZED=false、G1_RUN_AUTHORIZED=false。复审使用记录中的摘要，未独立重算。

保留两个非阻断限制：实际AppleScript窗口尚未验证；JSON孤立Unicode代理项未显式拒绝，极端情况下Buffer转码会出现替换字符，不能声称逐字节保真。Codex用合成孤立代理项核实了转码不保真；不扩大本轮开发，按复审意见在单次提案中明示。取消、异常或不可用仍阻断，不自动重试。离线开发至此停止，下一步等待明确单次诊断批准；业务目标仍未完成。

### 第九轮单次获批诊断实际结果

用户明确批准“一次限定诊断及条件私有查看”后，重新核对实现817c5c14…及固定官方CLI身份一致，执行 `node scripts/entry-host-runtime-smoke.mjs --diagnose-first-error` 一次、退出2，没有重试。报告 `runs/TEST-host-tool-smoke-00c2b73f-3ba4-474b-abcb-3bff31b331d3/HOST_TOOL_SMOKE_REPORT.json`，SHA256 `95a1d551ee17156430d426f5ebbf0d047c9792becd9f5763fc0db9d22a4f1ef5`；命令输出 `/private/tmp/c2c_e714_i9_actual_first_error_diagnostic.log`。

报告BLOCKED/SMOKE_EVENT_STREAM_REJECTED；commandCount=0、patchCount=0、cliExitCode=null、stderr为空。首条item错误已观测，157 UTF8字节、未截断，分类UNKNOWN_NON_TOOL_ERROR，privateView=DIAGNOSTIC_UNAVAILABLE。原文没有留存，根因仍未知；不能据长度猜测提示类别或还原第四次消息。

用户随后明确反馈“没有看到窗口”。因此私有交接未完成，不能视作用户取消、同意或已读；也无法由当前报告区分脚本编译、启动环境、系统会话或展示失败。此次单次批准已消耗，不再启动CLI或GUI。仅记录及静态复核；新运行需要新的准确批准。原报告不改写，runtimeEvidence=null、G1未启动、真实0/7、deploymentExecuted=false。

静态语法复核：本机 `man osacompile` 确认编译不执行脚本。用模拟spawn取得现有函数生成的纯合成脚本，交给固定 `/usr/bin/osacompile -l AppleScript -o <临时synthetic.scpt>`，空env、5秒上限；编译退出0、stderr为空，没有执行编译结果、osascript、GUI或模型。输出 `/private/tmp/c2c_e714_i9_viewer_compile_check.log`。仅证明该合成脚本在当前系统可编译，不能排除实际未知文本、运行环境或系统会话问题，不能当GUI通过。项目源码及实现摘要未变。

## 第十轮：私有查看失败分类（离线）

ChatGPT核对实际诊断及编译结果后接受OFFLINE_OSACOMPILE=PASS、APPLESCRIPT_SYNTAX_FIX=NOT_REQUIRED。裁决：只补现有viewer的失败可观测性，再审查一次独立GUI合成提案；禁止用新的模型运行验证尚未证实可用的窗口。不为测试抽取新生成器或增加入口。

仅改 `scripts/entry-host-runtime-smoke.mjs`、`tests/entry-host-runtime-smoke.test.mjs`。原privateView保留，新增viewerFailure固定枚举、osascriptExitCode和appleScriptErrorNumber（有界整数/null）。区分未尝试、输入拒绝、启动/写入失败、宿主超时、非零退出、同意超时/非查看返回、脚本取消/其他错误、消息超时及未知协议；正常结束为NONE/VIEWED。取消错误只表示脚本返回该数值，不证明用户看到窗口或主动取消，不按错误码猜测TCC/会话根因。

AppleScript仅返回固定标识或SCRIPT_ERROR加数字，不返回errMessage。宿主stdout最多64字节、超限及未知值拒绝，stderr仍丢弃。原stdin通道、空env、28秒上限、双窗口各12秒和CLI先关闭约束保留。viewPrivate仅复制允许字段，不接受原始错误对象或额外文字；缓冲清理保留。无效Unicode现在明确拒绝，避免转码替换。普通--execute不显示窗口，诊断模式始终BLOCKED，runtimeEvidence仍为null。

### 第十轮验证

- 首轮RED：20通过/4预期失败，`/private/tmp/c2c_e714_i10_viewer_red.log`；GREEN：24通过，`/private/tmp/c2c_e714_i10_viewer_green.log`。
- 输出上限/同步stdin失败RED→GREEN：`/private/tmp/c2c_e714_i10_output_bounds_red.log`、`/private/tmp/c2c_e714_i10_output_bounds_green.log`，最终24通过。
- 最终定向24通过/0失败/0跳过，`/private/tmp/c2c_e714_i10_directed.log`；完整npm test 427通过/0失败/0跳过、退出0，`/private/tmp/c2c_e714_i10_full.log`；两个mjs语法检查退出0，`/private/tmp/c2c_e714_i10_syntax.log`。
- 新增3组测试覆盖固定失败原因及数字码、Unicode和字段筛选、macOS实际编译。编译使用真实函数+模拟spawn生成普通/引号/反斜杠/换行/中文及emoji合成脚本，真实osacompile退出0，未执行脚本或osascript，临时scpt已清理。GUI与模型真实调用均为0。

当前实现SHA256：`31333c8753bae588dcdf057e0cf74118585cba599d786c2b9a887a9c5a6770fa`。817c5c14…为第五次实际诊断的历史身份，不能覆盖本次新实现。业务仍0/7，未运行新模型、窗口、Docker、网页或G1。

### 待独立复审的单次GUI合成提案

```sh
node --input-type=module -e 'import {showPrivateHostDiagnostic} from "./scripts/entry-host-runtime-smoke.mjs"; console.log(JSON.stringify(await showPrivateHostDiagnostic("SYNTHETIC_VIEWER_ONLY")));'
```

仅调用同一个viewer一次，最多28秒，文字固定纯合成、不含第五次原文。只输出固定状态和数字码，保存命令输出到临时本地验收日志；无Codex CLI、模型服务、凭据读取、网站/浏览器、业务Pipeline、Docker或部署。输入只走stdin，用户可在同意窗口选择View locally或取消；查看窗口Close或超时均按协议分类。失败即停、不重试；即使VIEWED也不是G0通过证据，不登记runtimeEvidence，不自动补跑模型诊断。先复审、再取得准确单次GUI批准；此前单次批准均已消费。

### 第十轮独立裁决

ChatGPT通过同一工作区读取代码、测试及输出106–112后返回ACCEPT_SCOPED、BLOCKING_CODE_DEFECTS=NONE_IDENTIFIED、ONE_GUI_ONLY_PROPOSAL=READY。24项定向、427项回归、语法及实际离线编译获得局部接受；未独立重算完整代码摘要。GUI_EXECUTION_AUTHORIZED=false、MODEL_RUNTIME_AUTHORIZED=false、G1_RUN_AUTHORIZED=false。

两个准确性限制保留：当前Cancel通常通过-128返回APPLESCRIPT_CANCELLED，不保证返回CONSENT_DECLINED；信号终止可能归OSASCRIPT_NONZERO_EXIT/空退出码，不能据此推断具体信号或系统原因。两者不影响拒绝成功，不新增框架修补。若未来返回VIEWED，也须用户明确确认亲眼看到合成消息，不能只依赖token。离线开发关闭，等待上述唯一GUI提案的明确单次批准；此前诊断批准不覆盖此测试。

### 第十轮单次GUI合成实测

用户明确批准一次最多28秒的纯合成窗口测试。执行前重新计算实现SHA256，仍为`31333c8753bae588dcdf057e0cf74118585cba599d786c2b9a887a9c5a6770fa`，与获批版本一致。随后只执行上文命令一次；进程退出0，固定结果为`privateView=VIEWED`、`viewerFailure=NONE`、`osascriptExitCode=0`、`appleScriptErrorNumber=null`。输出保存于`/private/tmp/c2c_e714_i10_actual_gui_only.log`并登记为C2C iteration 10执行证据。

该结果证明当前合成输入的同意窗口、消息窗口及固定返回协议在本机这次运行中完成；不证明第五次诊断中的真实157字节错误能够显示，也不证明Codex CLI、模型认证、工具调用或G0整体通过。按独立裁决，仍需用户明确确认亲眼看到合成消息，才能把人工可见性记为通过。此次单次GUI授权已消费，不重试、不自动补跑模型诊断；runtimeEvidence仍为null，正式G1未启动，真实七阶段仍为0/7，deploymentExecuted=false。

### 第十一次人工目视重试

用户表示忘记前次窗口情况并明确允许重试一次。执行前重新计算实现SHA256，仍为`31333c8753bae588dcdf057e0cf74118585cba599d786c2b9a887a9c5a6770fa`；随后只执行同一纯合成命令一次。固定结果为`privateView=DIAGNOSTIC_UNAVAILABLE`、`viewerFailure=CONSENT_TIMEOUT`、`osascriptExitCode=0`、`appleScriptErrorNumber=null`，输出记录于`/private/tmp/c2c_e714_i11_gui_repeat.log`及C2C iteration 11。

该结果仅证明本次同意步骤在12秒内未完成。用户随后明确确认亲眼看到了`View locally`同意窗口，因此当前macOS图形会话中的第一层窗口可见性已有人工证据；本次没有完成同意，第二层`SYNTHETIC_VIEWER_ONLY`消息窗口仍未取得人工确认。此次重试授权已消费，不自动再试；没有调用Codex CLI、模型、Docker、业务浏览器、G1或发布。viewer不再继续扩展，runtimeEvidence仍为null，真实七阶段仍为0/7。

### 第十一次独立裁决

ChatGPT通过同一工作区核对iteration 11输出、当前文档及生产入口后返回ACCEPT_SCOPED：`FIRST_DIALOG_HUMAN_VISIBLE=VERIFIED`、`VIEWER_DEVELOPMENT=FROZEN`、`GUI_ONLY_RETESTS=STOP`、`G0_FRAMEWORK_EXPANSION=STOP`。同意超时不能解释为GUI故障，第二层窗口保持未验证；GUI证据不能替代`requireVerifiedHostRuntime()`所要求的真实G0工具PASSED报告。

唯一下一提案为一次新的、明确授权的`node scripts/entry-host-runtime-smoke.mjs --diagnose-first-error`：CLI最多60秒、私有展示最多28秒、只运行一次且不重试；操作者须在第一窗12秒内选择`View locally`，原始错误只在本机查看，不写入报告或聊天。不放宽权限、不启动业务G1。若仍无法取得原因，停止同类诊断并转入明确的执行环境技术决策。该裁决不授予运行权限；runtimeEvidence仍为null，真实阶段0/7。

### 第十二次真实首错诊断

用户明确表示在核心目标实现前持续授权既定范围内的必要诊断、修复、测试与七阶段开发，并要求不再为同类可逆步骤逐次询问；实际发布、DNS、生产推送及付费操作仍不在目标内。执行前实现摘要仍为`31333c8753bae588dcdf057e0cf74118585cba599d786c2b9a887a9c5a6770fa`。随后只运行`node scripts/entry-host-runtime-smoke.mjs --diagnose-first-error`一次，宿主退出2，报告为`HOST_CODEX_CLIENT_FIRST_ERROR_DIAGNOSTIC_V1 / BLOCKED / SMOKE_EVENT_STREAM_REJECTED`。

报告固定证据：Codex CLI 0.153.0；`eventStreamVerified=false`；事件错误为`CLI_NON_TOOL_ERROR_REPORTED`、`RUN_TERMINATION_MISSING`、`EXPECTED_TOOL_SEQUENCE_MISSING`；首错`UNKNOWN_NON_TOOL_ERROR`、157字节、未截断；`privateView=VIEWED`、`viewerFailure=NONE`、osascript退出0；stderr为空；命令0、patch 0、业务Pipeline未启动、deploymentExecuted=false。报告路径为`runs/TEST-host-tool-smoke-7c6c73b8-5d8a-4801-9d04-adef841d5579/HOST_TOOL_SMOKE_REPORT.json`，SHA256为`df4c053b693e49ce4f82e15406998725f058a22ce3d5e168b20e352cf65efca4`。

原始157字节文字按设计仅在本机窗口显示且不持久化，Codex无法读取。下一步只需用户概括不含路径、账号或凭据的技术提示；取得该事实后，按证据做最小修复或明确执行环境决策，不再增加通用诊断框架。runtimeEvidence仍为null，G0 BLOCKED，真实阶段0/7。
