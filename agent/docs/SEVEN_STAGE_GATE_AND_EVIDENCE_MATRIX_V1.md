# 七阶段验收与证据矩阵

阶段名、顺序、输入白名单和必需产物以 [stages.mjs](../src/stages.mjs) 为准，条件必填与状态门以 [pipeline.mjs](../src/pipeline.mjs) 为准。使用方法见 [README](../README.md)，真实验收安排见[路线图](MASTER_AGENT_EXECUTION_ROADMAP_V1.md)。文中 run、site 下的路径均为运行时产物，不是仓库预置文件。

## 共同规则

- `run` / `retry` 在[交互终端](../src/terminal-run.mjs)展示摘要并要求操作者输入 y。Codex 准备输入和读取证据，不代输 y、不绕过终端门、不修改 `codex-skills/`。
- 每阶段必需 `gameIdentity`、`objective` 和由用户 `paths.siteDirectory` 解析得到的 `projectPath`；`paths.researchDirectory` 指定独立的 `backgroundinformation` 目录，路径规则见 README。旧 manifest（无 paths 或含 projectRoot/site 子目录）保留记录路径。`runDirectory` 为 `agent/runs/RUN_ID`；产物副本保存于 `artifacts/0–6/attempt/`，worker 原生区为其下 `native/`。产物按 kind 找，不依赖副本文件名前缀。
- [Skill 锁](../src/skill-lock.mjs)校验干净的已提交 git 树与清单 SHA256；[模板快照](../src/template-snapshot.mjs)固定 commit 并复查缓存。每次推进和 worker 返回后检查锁、上游产物身份/哈希；关键词阶段之后检查原件字节。
- [worker 权限](../src/worker-permissions.mjs)默认为最小读取、按阶段增加写路径、关闭命令网络；第 2 阶段和第 7 阶段 execute 例外。模型客户端认证独立于命令网络。浏览器/MCP/插件/多代理等 worker 功能关闭；首页开放图像生成，第 1/5/6 阶段开放 view_image。
- [执行器](../src/skill-executor.mjs)调用 Codex exec，解析 [worker result schema](../config/worker-result.schema.json)，经 [validateNativeArtifacts](../src/artifact-validator.mjs)核验后再交 pipeline 校验、保存。PASSED 必须有完整产物、非空证据且无缺项；非 PASSED 的原生产物不会被适配器提升为正式产物。
- 宿主浏览器和依赖/生产预览在 worker 沙箱外运行；worker 读取宿主证据，另写原生报告。[site-evidence](../src/site-evidence.mjs)在 worker 前后复查文件 SHA256 和截图集合。配置 paths 的 run 仅 stage 1/2 可写 research，stage 4 和部署 execute 可写 site；stage 3 仅写 run/template-copy，由宿主预检后合并；其他阶段 worker 只读 site，报告写入 native，由宿主发布到 Skill 验证器要求的位置。
- WAITING_FOR_USER、BLOCKED、FAILED、PARTIAL 均停止自动推进；retry 保留历史并重验受影响阶段。UI 后源码新鲜度变化要求更新 `siteRevision` 并显式重试。依赖、构建缓存及指定报告路径按代码排除于源码 digest 外。

## 1. 首页调研与图标：game-homepage-icon-research

- **输入**：公共身份/目标；可选 `gameMetadata`、`researchRootName`、`iconSourcePng`、`iconSourceMethod` 为允许字段，不能取代真实来源和图像工具。初次 worker 提供 `{url,purpose}` 的 `homepage-sources/FETCH_REQUEST.json`。
- **worker 权限**：不开放命令网络或浏览器；可写 native、run 内 `homepage-icon/` 和请求文件，可调用图像生成、查看图像。写出 `icon-master.png`（及可选 `icon-512.png`）；图像工具缺失须 BLOCKED，不能用本地绘图或伪字节替代。
- **总控沙箱外**：[homepage-source-host](../src/homepage-source-host.mjs)最多代抓 25 个匿名公开 HTTPS 页面，验证 URL/DNS及重定向、限制为 GET/HEAD HTML、拒绝认证/cookie/点击/表单/下载，保存正文、元数据与截图；[favicon-io-host](../src/favicon-io-host.mjs)验证方形 PNG、必要时 sips 缩成 512×512 RGBA，调用锁定 Skill 的 favicon.io 转换脚本。自动转换失败进入 WAITING_FOR_USER，指明 PNG、网址和手工 ZIP 保存位置。每次阶段执行至多各做一次代抓/转换交接，最多三次 worker 调用。
- **产物**：`HOMEPAGE_RESEARCH.md`、`ICON.zip`。
- **校验器**：首页 Skill 的 [validate_outputs.py](../../codex-skills/game-homepage-icon-research/scripts/validate_outputs.py) 核验 Markdown 与 ZIP；总控 [verify-favicon-package.py](../scripts/verify-favicon-package.py) 进一步检查图标二进制包。未采集宿主来源即声称成功会改为等待来源。
- **证据**：run 内 `homepage-sources/captures/CAPTURES.json`、逐页 JSON/截图及 SHA256 bundle；`homepage-icon/favicon_io.zip`、转换 digest；正式产物哈希。REJECTED/FAILED 页面不作成功来源。
- **验证边界**：[首页接线测试](../tests/homepage-host-executor.test.mjs)、[代抓测试](../tests/homepage-source-host.test.mjs)、[转换测试](../tests/favicon-io-host.test.mjs)使用替身；当前主线完整真实首页为**未经真实运行验证**。

## 2. 关键词资料：game-innerpage-keyword-information-research

- **输入**：非空、实际存在的绝对路径 `.md` 原始关键词 `rawKeywordsFile`，可选 `keywordSourceLineageFile`；当前宿主进程环境中的 SERPER_API_KEY，固定 Python/yt-dlp 工具可用。
- **worker 权限**：可写 native；该阶段开放命令网络并传递 SERPER_API_KEY/已有 YTDLP_COOKIES_FILE，禁止输出其值；使用锁定 Skill 的 Serper 与 yt-dlp 命令，选定公开结果可按提示读取，不允许浏览器自动化或替代服务。外部原件虽可被 pipeline 检查，worker 仅对 run 内原件/lineage 显式加读权限，真实可读性仍待核验。
- **总控沙箱外**：预检 key 和固定工具路径，建立 run 内 yt-dlp wrapper；本阶段没有宿主浏览器代操作。适配器验证并汇总逐词素材，记录原始关键词 SHA256。
- **产物**：`keywords.json`、`关键词处理记录.md`、`关键词素材汇总.md`、逐词 `…素材.md`；总控派生 `KEYWORD_MATERIALS.md`。
- **校验器**：关键词 Skill 的 [validate_outputs.py](../../codex-skills/game-innerpage-keyword-information-research/scripts/validate_outputs.py)；总控检查关键词非空、逐词素材状态 COMPLETED。Skill 将盗版意图归并风险词，要求 `盗版意图处理` 表及 `盗版风险提示` 段落并限制下载站链接；不能捏造原词。
- **证据**：原始 Markdown 哈希、处理/lineage 记录、素材引用、逐词 SHA256 与汇总 bundle。后续阶段若原件字节变化就阻断；retry 输入刷新会使关键词及下游失效。
- **验证边界**：[执行器测试](../tests/skill-executor.test.mjs)、[产物测试](../tests/artifact-validator.test.mjs)、[pipeline 测试](../tests/pipeline.test.mjs)验证合成输入/产物及接线；当前 Serper/yt-dlp 真实业务调研为**未经真实运行验证**。

## 3. 模板选择与复制：game-site-template-selector

- **输入**：上游研究、总控固定的 `templateSnapshot` / `templateRoots`，空的新站目标目录。新 run 从配置的 GitHub main 固定 commit，retry 复用该 commit。
- **worker 权限**：不联网、不操作浏览器；只读快照，按权限可写站点父目录（供原子复制/改名）与 native；不得改源模板。
- **总控沙箱外**：[template-snapshot](../src/template-snapshot.mjs)解析 ref、fetch 固定 commit 并缓存于仓库 `.template-cache/<commit>`，核验 HEAD、干净状态与 template 子树；pipeline 拒绝非空目标。
- **产物**：`TEMPLATE_SELECTION_REPORT.md`、`template-copy-manifest.json`、`TEMPLATE_RESIDUE_SCAN.json`，以及复制得到的站点。
- **校验器**：[artifact-validator](../src/artifact-validator.mjs)检查游戏/目标身份、source_unchanged、destination_verified、非空复制文件清单及逐文件实际 SHA256；pipeline 在推进前复核快照。
- **证据**：manifest 中的模板来源/commit、复制清单文件哈希、残留扫描、正式产物及原生文件哈希。
- **验证边界**：[snapshot 测试](../tests/template-snapshot.test.mjs)使用临时真实 Git 仓库，[总控测试](../tests/orchestrator-template-snapshot.test.mjs)使用 file 来源与替身 worker；真实 GitHub 获取和 worker 选模复制为**未经真实运行验证**。

## 4. 内容整合：game-site-content-integrator

- **输入**：已通过的首页、关键词、模板；`canonicalRequired` 布尔值，为 true 时需准确 HTTPS `canonicalOrigin`（origin 格式无尾斜杠）；宿主交接的研究路径。
- **worker 权限**：不联网、不操作浏览器；读取上游和站点，允许写本站源码及 native，不能修改来源 Skill 或模板缓存。
- **总控沙箱外**：阶段首次执行前按站点锁文件安装依赖（pnpm frozen 或 npm ci），记录到 run 的 `site-dependencies.json`；[handoff](../src/handoff.mjs)核验上游身份/哈希后复制研究到站点 `backgroundinformation/` 与 `keyword-materials/`（明确选择时可用 `background_information/`），冲突拒绝覆盖。
- **产物**：站点页面、`CONTENT_INTEGRATION_REPORT.md`、`CONTENT_PAGE_MANIFEST.json`、`CONTENT_PROVENANCE.md`、`CONTENT_GAPS.md`。
- **校验器**：[artifact-validator](../src/artifact-validator.mjs)核验 schema/game、最终关键词一一覆盖、PUBLISHED/DRAFT/BLOCKED 状态与统计、来源文件存在及 provenance；BLOCKED 页面不能有 route/source_file，PUBLISHED 必须有 route、源码及素材记录。
- **证据**：锁文件/安装命令和退出码、研究交接哈希、页面清单与逐词来源、缺口记录、正式及原生产物 SHA256。
- **验证边界**：[预览宿主测试](../tests/site-preview-host.test.mjs)、[pipeline 测试](../tests/pipeline.test.mjs)、[产物测试](../tests/artifact-validator.test.mjs)覆盖替身安装和合成内容；真实安装/worker 内容生成为**未经真实运行验证**。

## 5. UI 审计：game-site-ui-ux-audit-optimizer

- **输入**：内容清单、当前站点、非空 `siteRevision`；`uiMode` 省略或 audit-only。pipeline 虽定义 optimize 批准对象，当前执行器直接 BLOCKED，不作为可用主线。
- **worker 权限**：不联网、不操作浏览器；可查看宿主截图，只写该 run 的三份审计报告及 LATEST，不写源码/截图。
- **总控沙箱外**：[site-preview-host](../src/site-preview-host.mjs) build 后启动 loopback 生产预览；[site-audit-host](../src/site-audit-host.mjs)通过 Playwright 模块解析钩子运行锁定的 [game_site_audit.mjs](../../codex-skills/game-site-ui-ux-audit-optimizer/scripts/game_site_audit.mjs)，覆盖首页与内容清单所有 PUBLISHED 路由、六个视口 360/390/768/1024/1440/1920。审计脚本退出 2 可保留完整发现证据，其他失败等待修复；finally 停止预览。
- **产物**：`UI_UX_AUDIT_REPORT.md`、`UI_UX_AUDIT.json`、`UI_UX_OPTIMIZATION_PLAN.md`，站点 `docs/ui-ux-audit/RUN_ID/` 下报告/截图及 `LATEST`。
- **校验器**：Skill 的 [validate_audit.py](../../codex-skills/game-site-ui-ux-audit-optimizer/scripts/validate_audit.py)，总控要求六视口严格匹配且 verdict 为 SHIP/SHIP_WITH_FIXES；通过时保存源码 projectDigest。
- **证据**：`AUTOMATED_AUDIT.json`、截图集合及逐文件 SHA256、原生审计结论与优化方案、projectDigest。宿主证据前后变化会拒绝。
- **验证边界**：[site-audit-host 测试](../tests/site-audit-host.test.mjs)检查替身预览/脚本/worker 与篡改检测，并真实导入 Playwright 模块；真实站点浏览器审计为**未经真实运行验证**。

## 6. 全站上线前验收：game-site-prelaunch-gate

- **输入**：上游通过、合法 `domain`、与 UI 审计一致的站点源码、内容清单及生产预览。
- **worker 权限**：不联网、不操作浏览器/构建/test/lint/typecheck、不修源码；可看截图，只写本轮三份原生验收报告。
- **总控沙箱外**：[prelaunch-host](../src/prelaunch-host.mjs)在生产预览上请求 robots、递归 sitemap，将同站生产 URL 映射到本地；路由集合为首页/PUBLISHED 与 sitemap 并集。已发布路由拍摄 1440/390/360/768，sitemap 额外路由拍摄 1440/390；记录 HTTP、console/page/request 错误。递归检查站内链接（上限 10000），不主动请求站外链接。依次运行 package 已定义的 typecheck/lint/test/build 并记录失败；finally 停止预览。
- **产物**：`PRELAUNCH_ACCEPTANCE_REPORT.md`、`PRELAUNCH_ACCEPTANCE.json`、`REPAIR_MANIFEST.md`；站点 `docs/prelaunch/RUN_ID/host-evidence/` 下宿主证据和截图。
- **校验器**：Skill 的 [validate_report.py](../../codex-skills/game-site-prelaunch-gate/scripts/validate_report.py)；总控核验 run/game/project/expected_domain、完整路由覆盖且与宿主集合相同，结论必须为“可以上线”或“可以上线，但有P2待办”。pipeline 另检查 siteRevision（报告有提供时）和域名。
- **证据**：`HOST_EVIDENCE.json`、逐视口截图、HTTP/链接记录、各 package 脚本命令与退出码、哈希 bundle；这验证本地生产预览，不证明生产线上可用。浏览器渲染页面仍可能请求页面所引用的外部资源，不能把“外链不主动检查”写成宿主全局断网。
- **验证边界**：[prelaunch-host 测试](../tests/prelaunch-host.test.mjs)使用替身 fetch、浏览器、package 命令及 worker；真实全站巡检为**未经真实运行验证**。

## 7. 部署计划及执行：game-site-deploy-and-measurement

- **输入**：上游验收、domain；非空 repo/branch、`dns.provider`、`dns.recordsReviewed: true`、`deploymentPlanAuthorized: true`。deploymentProvider 是允许字段，具体方案由 Skill 核实；execute 还需 `deploymentPlanApproval: {approved: true, digest}`。
- **worker 权限**：plan 轮不联网，仅写 native 中计划；不开 push、部署、DNS、Google 或站点写权限。准确批准后 execute 轮开放命令网络、站点写和上述生产权限，读取批准产物与所需 CLI/既有登录配置；始终不开广告脚本权限；权限生成器还将写目录内 `.git` 标为只读，真实 Git 元数据写入可行性需另验。禁止读取/输出凭据值，需登录/授权则等待用户。
- **总控沙箱外**：plan 通过后 [publishDeploymentPlan](../src/handoff.mjs)将验证后同字节文件发布到站点 `docs/`，拒绝冲突并在写失败时回滚本次创建。pipeline 计算 `SHA256(JSON.stringify(产物SHA256数组))` 得 planDigest，进入 WAITING_FOR_USER；用户只增加批准字段后 retry，再亲自输入 y。批准前复核上游、计划、原始关键词和 projectDigest；execute 前再核验计划。宿主查找 gh/git/vercel 并配置有限读取范围；实际 push/部署/DNS/GSC/GA4 步骤交由部署 worker 按 Skill 执行，没有宿主浏览器代操作。plan 轮无法联网核实远端的实际可行性待首跑验证。
- **产物**：plan 轮 `DEPLOYMENT_PLAN.md`、`DEPLOYMENT_PLAN.json`；execute 轮追加 `DEPLOYMENT_REPORT.md`、`DEPLOYMENT_REPORT.json`，保留原计划。
- **校验器**：[artifact-validator](../src/artifact-validator.mjs)对计划检查 schema、AWAITING_CONFIRMATION、项目/仓库/分支/域名和未授权 push，以及 checks/risks/rollback/architecture/hosting/measurement；execute PASSED 必须报告 `deployment: "PRODUCTION LIVE"` 且 production_url origin 匹配确认域名。该结构校验本身不独立探测线上，也不证明 Google 每项已成功。
- **证据**：两份计划、planDigest、批准摘要、生产部署报告及每服务实际状态。`deploymentExecuted=true` 在执行开始前保存，失败也不还原；仅表示可能已有副作用，不能用作成功证明。失败后重试先重新出计划；需人工核对实际副作用，冲突计划不会静默覆盖。
- **验证边界**：[部署执行测试](../tests/deployment-execution.test.mjs)、[终端测试](../tests/terminal-run.test.mjs)使用替身 worker/合成生产报告。真实 push、部署、DNS、GSC/GA4 为**未经真实运行验证**。

## 冻结和可选范围

G0 审批/隔离探测/bsk、entry-*、m3-*、飞书、已有项目模式保留实现和测试，但不作为当前新站七阶段入口或前置门。广告分支不在七核心阶段内：adsEnabled 非 true 时 SKIPPED；启用时只准备方案，仍停在 `externalAdvertisingImplementationAndAcceptance` 门，不能据此声称真实广告已接入。旧过程记录见[档案](archive/)。
