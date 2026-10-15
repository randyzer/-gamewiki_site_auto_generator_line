[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 5
SCOPE: V2.7 DESIGN ONLY
IMPLEMENTATION: NOT AUTHORIZED
A4: REMAINS PAUSED
OLD V1 BLUEPRINT/ROADMAP: HISTORICAL INPUT ONLY

我已核对当前 PROJECT_STATE、V2.7 版本决定、真实项目/五案例 crosswalk、三件套演进决定和最终交付布局。当前可以正式开始 V2.7 Architecture Blueprint → 独立验收 → V2.7 Roadmap。

一、先固定 V2.7 的设计基线

以下事实不得在 Blueprint 中重新解释：

纯文本
Target version:
GAME_SOP V2.7
GAME_SITE_STARTER V2.7
GAME_CODEX_MASTER_PROMPT V2.7

最终 assembly root：

纯文本
Repo_hotgameweb/GAME_SITE_SYSTEM_V2.7/
├── GAME_SOP/
├── GAME_SITE_STARTER/
├── GAME_CODEX_MASTER_PROMPT/
├── COMPATIBILITY_MANIFEST.json
└── README.md

但这个目录只是最终交付组合，不是第四个源码权威。

工程基线必须保留：

纯文本
Frozen Starter V2.6.5:
29b25559...

S1 TL-01:
a691661b...

A1 TL-02:
a3c1bd31...

A2 PP-02:
aad6464b...

A3 AX-01 implementation:
b067e8d4...

其中：

纯文本
AX-01 implementation = ACCEPTED
AX-01 browser evidence = NOT PROVEN
AX-03 = NOT IMPLEMENTED / NOT PROVEN

Farever：

纯文本
original-site evidence = UNVERIFIED

不得因为本地 Farever reference implementation 存在而提升证据等级。

二、Blueprint 必须先比较三种架构路线

Codex 不应直接把旧 V1 Blueprint 换个版本号。

Blueprint 第一部分必须比较至少以下三种方案。

Approach A — Starter-centric
纯文本
SOP / Prompt
   ↓
large universal Starter

优点：技术集中、短期实现快。

主要问题：

容易把项目方法、Pattern、Game Adaptation 全塞进 Starter；
War of Genesis / BombFarm 已证明“技术能力存在”不代表生产方法正确；
容易形成巨型通用平台；
SOP/Prompt 与代码再次漂移。

预期结论：不推荐作为 V2.7 主架构。

Approach B — 三件套机械锁步

每个能力都：

纯文本
SOP change
+
Prompt change
+
Starter change

优点：表面一致性强。

问题：

大量重复描述；
CSS bug、内部实现修复也迫使三处升级；
违背已经接受的 capability ownership 原则；
长期维护成本高。

预期结论：不推荐。

Approach C — Capability-owned coordinated triad
纯文本
             Product Contract
                    │
             Capability Registry
                    │
   ┌────────────────┼────────────────┐
   │                │                │
GAME_SOP       MASTER PROMPT      STARTER
methodology    execution/gates    technical core
   │                │                │
   └────────────────┼────────────────┘
                    │
       Game Adaptation Layer
                    +
             Pattern Library
                    │
             Assembled Site
                    │
       Independent Acceptance
                    │
          Regression / Release

特点：

capability 先确定 owner；
三件套只修改自己的 authority；
Stable Core 与 Pattern / Game Adaptation 分离；
独立 Acceptance 不由 Starter 自己“宣布成功”；
通过 compatibility manifest 绑定最终三件套。

这是当前证据最支持的候选架构，但 Codex 必须在 Blueprint 中用明确比较标准得出结论，而不是因为旧 V1 曾经这样写。

比较维度至少包括：

纯文本
evidence fit
authority clarity
game reuse
overfitting risk
maintenance cost
implementation complexity
regression containment
commercial-site suitability
real-game adoption cost
version/provenance clarity
三、Iteration 5A — Codex 只写 V2.7 Blueprint

唯一主输出建议：

纯文本
template/architecture/
GAME_SITE_SYSTEM_V2.7_ARCHITECTURE_BLUEPRINT_V1.md

不要同时创建新的 roadmap。

Blueprint 必须包含以下 10 个部分。

B1. Design Inputs & Evidence Boundary

明确区分：

纯文本
1. V2.6.5 frozen triad
2. accepted S1/A1/A2/A3 engineering evidence
3. War of Genesis real adoption/failure evidence
4. Bomb Farm V2 real-project evidence
5. four original-site observations
6. Farever local reference only / original unverified
7. five local extracted implementations
8. Product Contract / 41 capability registry

禁止写：

纯文本
“5个原站均验证”
“5个站均商业成功”
“BombFarm PASS 证明所有媒体问题解决”
“A3 已证明 AX-01”
四、Blueprint 不能发明第二套 Capability IDs

现有 Product Contract 的 41 IDs 是 V2.7 的能力追踪 SSOT 起点。

例如已经存在：

纯文本
GI-01 GI-02

VF-01 VF-02

MC-01 ... MC-05

HR-01 HR-02

IA-01 IA-02 IA-03

CU-01 CU-02

DS-01 DS-02

FR-01 FR-02

ID-01 ID-02

SEO-01 SEO-02 SEO-03

AX-01 AX-02 AX-03

PP-01 PP-02

TL-01 TL-02 TL-03

MR-01 MR-02

PA-01 PA-02

RI-01 RI-02 RI-03 RI-04

规则：

V2.7 不能因为重新画架构就重编号已有 requirement。

只有发现真正新的、无法由现有语义覆盖的 requirement 时，才能提出新 ID，而且 Blueprint 只能标：

纯文本
PROPOSED_NEW_CAPABILITY

必须说明为什么不能由现有 ID 表达。

不能在设计阶段静默加入 Registry。

五、Blueprint 必须完成核心 Capability → Architecture 映射

至少需要覆盖下面这些 V2.7 重点。

Evidence / Gap	Existing IDs	Primary technical layer	SOP responsibility	Prompt responsibility
法律草稿上线	TL-01/TL-03, PP-02	Core Safety	activation/accuracy/human responsibility	block unsupported final
假身份/隐式 Organization	TL-02	Core + Adaptation	identity evidence rules	claim/source gate
Starter 残留	PP-02	Core Adoption Safety	launch-finish rule	adoption/release enforcement
Escape/focus	AX-01	Core Interaction	accessible behavior requirement	require executable evidence
浏览器完整性	AX-02/AX-03/PA-01	Acceptance infrastructure	supported QA expectation	execute matrix / no fake PASS
泛化游戏站	GI-01/GI-02/VF-01	Game Adaptation	visual evidence + recognition	enforce approved adaptation
theme 只换颜色	VF-01/VF-02	Semantic theme surface	evidence-derived identity	prevent unsupported generic adaptation
游戏媒体不足	MC-01/03/04/05	Core Media + Adaptation	need/rights/no-media decision	lifecycle / hard stops
OG 分享媒体不足	SEO-02 + MC-*	Core SEO/Media	truthful media decision	verify output/evidence
Search ownership	IA-03	Core seam + Adaptation	activation decision	enforce recorded choice
假 Latest/Popular	FR-01/FR-02	Core schema + Content	freshness evidence	reject unsupported dynamic claim
玩家不知道下一步	HR-01/02, ID-01/02, DS-02	Pattern + Adaptation	player journey	enforce selected composition
Builds 标题大于内容	CU-01, DS-01	Project Content	answer/value methodology	Human Content Gate
文章墙/重复卡片	CU-02, MR-02	Pattern Library	utility/value depth	content acceptance
广告槽影响价值	MR-01/MR-02	Core + Pattern	placement methodology	conditional ads review
Core 被 Pattern 复制	RI-01	Architecture boundary	governance	implementation guardrail
组合后回归	PA-01, RI-02	Acceptance	assembled-site requirement	execute acceptance
V2.6.5 → V2.7 能力丢失	RI-03/RI-04	Release Governance	lifecycle policy	delta/release gate

这张映射不能只说“ALL_THREE”。

必须明确：

纯文本
Requirement owner
Implementation owner
Verification owner
六、V2.7 Blueprint 应定义六个架构层，而不是六个开发阶段

这里是architecture dependency，不是 Roadmap。

Blueprint 至少应判断以下边界是否成立：

纯文本
L0 — Product Contract / Capability Registry
         ↓
L1 — Stable Core
         ↓
L2 — Game Adaptation
         ↓
L3 — Pattern Library
         ↓
L4 — Assembled Game Site
         ↓
L5 — Independent Acceptance + Release Governance

三件套则跨层负责不同职责。

Stable Core

只放跨游戏稳定能力，例如：

纯文本
publication SSOT
route reconciliation
SEO primitives
search seam
media primitives
safe legal/identity defaults
residue protection
accessibility primitives
ad seam
testable outputs

不能放：

纯文本
具体游戏 taxonomy
fantasy UI
某款游戏 hero layout
BombFarm 的内容
War of Genesis 的 market assumptions
Game Adaptation

拥有：

纯文本
verified terminology
taxonomy
theme evidence
visual identity selection
media mapping
relations
freshness evidence
game-specific configuration
Pattern Library

拥有：

纯文本
composition
page rhythm
Quick Answer
steps
FAQ
TOC
figures
decision modules
hub/detail journeys
presentation archetypes

但必须满足：

纯文本
RI-01:
Pattern composes Core
Pattern never forks/reimplements Core guarantees
七、Blueprint 必须定义 Contract Boundaries

这一部分是本轮最重要的设计产物之一。

至少需要定义：

Core ↔ Game Adaptation
纯文本
Core exposes semantic capability
Adaptation supplies verified game-specific values
Core ↔ Pattern
纯文本
Pattern consumes Core primitives
Pattern does not duplicate Core routing/SEO/media/accessibility logic
Pattern ↔ Adaptation
纯文本
Pattern defines composition slots
Adaptation supplies taxonomy/content/media/theme decisions
Assembled Site ↔ Acceptance
纯文本
assembled output
→ independent tests/review
→ PASS / BLOCK / recorded exception
SOP ↔ Master Prompt
纯文本
SOP = normative methodology
Prompt = executable enforcement

Prompt may reference SOP requirement
but must not redefine it
Starter ↔ SOP/Prompt

Starter cannot decide：

纯文本
whether a page should exist
whether media rights are approved
whether a game fact is true
whether a legal statement is accurate
whether a site feels game-specific
八、Blueprint 必须给出 dependency graph，但不得提前变成 Roadmap

例如逻辑依赖：

纯文本
TL-01/TL-02/PP-02 safe adoption
              ↓
Stable Core integrity

VF / GI adaptation contracts
              ↓
Pattern + media composition

MC / SEO / FR / IA seams
              ↓
Assembled project

AX / PA acceptance
              ↓
RI regression
              ↓
V2.7 compatibility assembly

重点：

dependency 表示“能力建立在什么之上”，不是“下一步就执行哪个代码任务”。

因此 Blueprint 不能重新授权 A4。

九、Regression 模型必须成为 Blueprint 一等公民

不是最后补一句“跑测试”。

至少分四层：

纯文本
1. Core Regression
2. Composition Regression
3. Reference Archetype Regression
4. Cross-Version Regression

并明确连接：

纯文本
RI-01 Pattern/Core boundary
RI-02 Reference project regression
RI-03 Cross-version capability regression
RI-04 Capability lifecycle integrity
PA-01 Assembled-site acceptance
V2.7 必须保护的既有能力

特别注明：

纯文本
Inventory SSOT
enabled catalog filtering
route/output reconciliation
canonical / robots / sitemap
Pagefind baseline
SEO metadata foundation
provider-neutral ads seam
final/evidence distinction
TL-01
TL-02 accepted technical part
PP-02
A3 AX-01 implementation

不能为了重构 V2.7 把这些重新发明或悄悄删除。

十、Blueprint Acceptance Gate

Codex 写完 Blueprint 后：

纯文本
STOP

不写 Roadmap。

由我独立 Review。

我会用 12 条硬标准验收

Blueprint 只有全部满足才能 ACCEPT：

V2.7 triad boundary 清楚，无第四个源码权威。
至少三种架构方案真实比较，不是为了证明预设答案。
所有主要设计结论能追溯到真实项目、参考案例或 Product Contract。
Farever 始终标为 UNVERIFIED original site。
41 个既有 capability IDs 不被静默重命名/重定义。
新需求若超出现有 Registry，明确标 proposed，不私自加入。
S1/A1/A2/A3 状态准确；A3 不写 PROVEN。
Stable Core / Adaptation / Pattern / Acceptance 边界明确。
SOP / Prompt / Starter 的 owner 不互相吞并。
dependency graph 与 implementation roadmap 明确分离。
RI-01~04 + PA-01 成为明确 regression/release architecture。
与 GAME_SITE_SYSTEM_V2.7 delivery layout 兼容。

验收结果只有：

纯文本
ACCEPT
或
REVISE

不会因为文档“看起来完整”就自动 PASS。

十一、Blueprint ACCEPT 后才进入 Iteration 5B — Roadmap

Roadmap 文件建议：

纯文本
template/roadmap/
GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md

Roadmap 必须从已接受 Blueprint 的 dependency graph 导出，不能复用旧 Phase A 顺序。

Roadmap 至少需要对每个 workstream 记录：

纯文本
Workstream ID
Capability IDs
Goal
Evidence source
Artifact(s) affected
Predecessor
Codex implementation boundary
Required tests/evidence
Independent review gate
Exit criteria
Regression obligations
Real-game adoption obligation
十二、Roadmap 必须解决的最终路径

Roadmap 最终必须能够从：

纯文本
V2.6.5
+
accepted safety commits
+
real-project lessons
+
reference capabilities

走到：

纯文本
GAME_SOP V2.7
+
GAME_SITE_STARTER V2.7
+
GAME_CODEX_MASTER_PROMPT V2.7
        ↓
COMPATIBILITY_MANIFEST
        ↓
real-game adoption
        ↓
independent acceptance
        ↓
V2.7 release candidate

Roadmap 设计时必须包含真实项目 adoption，而不是做到 Starter 单测结束。

至少要求：

纯文本
War of Genesis = mandatory regression/adoption input

Bomb Farm = mature-project/reference input

+ 至少一种明显不同的信息架构/视觉 archetype

具体第三个 reference fixture 在 Roadmap 中根据 Blueprint 决定，不能把 Farever 原站未验证的信息当选择依据。

十三、Iteration 5 的有限执行边界
YAML
ITERATION_5A:
  Codex:
    - write V2.7 Architecture Blueprint
    - preserve evidence boundaries
    - compare approaches
    - map capability ownership
    - define contracts/dependencies/regression/exit architecture

  ChatGPT:
    - independently review Blueprint

  Forbidden:
    - A4 implementation
    - package changes
    - Candidate source changes
    - SOP V2.7 implementation
    - Prompt V2.7 implementation
    - Roadmap before Blueprint ACCEPT
    - release/tag/push/merge

ITERATION_5B:
  starts_only_if: Blueprint ACCEPT
  Codex:
    - write V2.7 Evolution Roadmap
  ChatGPT:
    - independently review Roadmap
当前下一动作

Codex 可以开始 Iteration 5A：GAME_SITE_SYSTEM_V2.7_ARCHITECTURE_BLUEPRINT_V1.md。

写完后发送：

纯文本
[C2C]
STATE: EXECUTED
TASK_ID: c2c_a765
ITERATION: 5A

我会先独立验收 Blueprint；在 ACCEPT 之前，不进入 Roadmap。


