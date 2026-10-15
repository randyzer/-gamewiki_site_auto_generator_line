[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 7
PREVIOUS_SLICE: 5A-REV1
BLUEPRINT_REVIEW: ACCEPT
NEXT_SLICE: 5B — V2.7 ROADMAP DESIGN
IMPLEMENTATION: NOT AUTHORIZED
A4: REMAINS PAUSED

治理闭环已修正到位。Blueprint 现在满足此前 12 条验收标准。

关键修复已经成立：

纯文本
L0 Product Contract / Capability Registry
        ↓
canonical owner = GAME_SOP V2.7
        ↓
GAME_SOP/docs/
COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md

同时：

当前 COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md 明确只是 predecessor/design source；
Prompt 只引用并执行，不维护第二份 Registry；
Starter 只实现自己负责的 capability subset，不维护第二份 Registry；
COMPATIBILITY_MANIFEST.json 必须绑定 productContractVersion / capabilityRegistryVersion / canonicalPath / sha256 / owningArtifact=GAME_SOP；
41 个既有 ID 保持不变；
四个 repo 仍 CLEAN、HEAD 未变；
A4 没有恢复；
未创建 V2.7 产品目录；
没有产品代码或依赖变化。

因此此前阻塞的标准 1 和 12 现在均为 PASS。

有一个非阻塞的证据卫生项：blueprint-revision-1-provenance.json 的 changed_design_files 仍像是沿用了上一轮列表，其中包含 PROJECT_STATE.md / README.md / plan.md，与本轮“只改 Blueprint + review/evidence”的描述不完全一致。它不影响 Blueprint 架构结论，也不值得为此再阻塞设计；后续 Roadmap execution provenance 应使用本轮真实 changed-files 重新生成，不沿用该字段。

Iteration 7：只设计 V2.7 Roadmap

唯一主产物：

纯文本
template/roadmap/
GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md

本轮不修改 SOP / Prompt / Starter 产品本体。

Roadmap 第一原则

不能把旧的：

纯文本
A1 → A2 → A3 → A4 → A5

简单改名成为 V2.7 路线。

新路线必须从已经 ACCEPT 的 Blueprint dependency graph 推导：

纯文本
Normative authority
        ↓
Stable Core continuity
        ↓
Core capability seams
        ↓
Game Adaptation + Pattern composition
        ↓
Assembled-site Acceptance
        ↓
Reference adoption/regression
        ↓
Cross-version release integrity
        ↓
V2.7 compatibility assembly
一、Roadmap 必须先定义 Source/Candidate Strategy

只做设计，不创建目录。

Codex 要比较并决定三个 V2.7 开发源以后如何存在：

SOP

基于冻结：

纯文本
GAME_SOP_V2.6.5
9a13b731...

Roadmap 必须定义：

V2.7 candidate 的拟议 repo/path；
从哪个准确 source 建立；
何时建立；
如何保持 V2.6.5 frozen；
Product Contract V2.7 何时成为 canonical authority。
Master Prompt

同样基于：

纯文本
GAME_CODEX_MASTER_PROMPT_V2.6.5
f655a0e0...

定义独立 V2.7 candidate strategy。

Starter

必须保留：

纯文本
b067e8d4...

及之前完整 Git provenance。

Roadmap 要比较：

纯文本
继续当前 Candidate repo/branch
vs
从 accepted A3 建立 V2.7 development branch
vs
创建新的 V2.7 candidate repository while preserving history

然后选择一个方案并解释为什么。

本轮不能实际 rename/copy/branch。

二、建议 Roadmap 使用 Workstream，而不是沿用旧 Phase A

每个 Workstream 必须包含统一字段：

纯文本
Workstream ID
Goal
Capability IDs
Evidence source
Artifacts affected
Primary owner
Predecessors
Implementation boundary
Explicit exclusions
Required tests/evidence
Independent review gate
Exit criteria
Regression obligations
Real-game adoption obligation
三、Roadmap 至少应推导出下面 8 个 Workstreams

编号可由 Codex优化，但不能遗漏这些责任。

WS-01 — V2.7 Normative Foundation

核心：

纯文本
GAME_SOP V2.7
Product Contract + Capability Registry

覆盖：

41 IDs；
lifecycle；
owner；
evidence contract；
accepted S1/A1/A2/A3 状态；
V2.6.5 → V2.7 capability baseline。

同时定义 Prompt / Starter 如何引用这个准确 contract identity。

Exit

不能只是“文档写完”。

必须能够证明：

纯文本
41 old IDs retained
0 silent semantic mutation
canonical path unique
Prompt/Starter reference target defined
V2.6.5 predecessor preserved
WS-02 — Stable Core Baseline & Safety Continuity

不是重新实现 A1/A2。

以 accepted A3 为基础建立 V2.7 Starter development baseline，并保护：

纯文本
TL-01
TL-02 technical safety
PP-02
AX-01 implementation
Inventory SSOT
route reconciliation
SEO baseline
Pagefind
ads zero-output
final/evidence

这里必须纳入一个已经审计发现但尚未解决的事项：

纯文本
current CI vs PP-02 adopted-final fixture conflict

Roadmap 要决定在哪个 workstream 修，而不是忘掉。

AX-01 / AX-03

未来 browser evidence 应出现在路线中，但：

Roadmap 记录它的正确依赖位置 ≠ 现在恢复旧 A4。

旧 A4 patch 只是历史失败输入，不作为实现计划自动复用。

WS-03 — Core Capability Seam Hardening

集中处理 V2.6.5 已知 PARTIAL，而非继续堆新页面：

纯文本
VF-01
VF-02
MC-01
MC-03
MC-05
IA-03
FR-01
SEO-02

Roadmap 应把这些再拆成有限 implementation slices，避免一个 mega-refactor。

例如可以按责任聚类：

纯文本
Theme / Visual seam

Media / Video / Share seam

Search / Freshness semantics

但最终切分由证据耦合决定。

WS-04 — Game Adaptation Contract

必须正式建立 Blueprint 中的 L2，而不是继续靠项目随意改代码。

覆盖至少：

纯文本
GI-01
GI-02
VF-01
IA-01
MC-04
FR-02

输出设计应支持：

纯文本
verified vocabulary/taxonomy
visual evidence → semantic theme decisions
page ID → pattern selection
media/video needs
search activation
relations
freshness evidence

但：

不允许出现第二份 Page Inventory / publication SSOT。

WS-05 — Pattern Library

从五案例提炼出的最小模式库，而不是五套 Starter。

当前 Blueprint 已给出三个优先 archetype：

纯文本
Hub / Wiki

Task Guide

Media-rich Article

Roadmap 要明确：

Pattern prerequisites；
required vs optional modules；
no-media form；
dependency on Core；
RI-01 防复制机制；
每一个 Pattern 的 acceptance fixture。

同时规划共享模块，例如：

纯文本
Quick Answer
steps
mistakes/recovery
comparison
figure
TOC
FAQ
related/next-action

但不能要求每篇文章都出现全部模块。

WS-06 — Independent Acceptance System

这是 War of Genesis 失败后必须升级成一等公民的部分。

覆盖：

纯文本
AX-01/02/03
PA-01/02
TL-*
GI-02
MC-*
MR-*
CU/DS human gates

Roadmap 要明确哪些证据：

纯文本
automated
browser
human content
human visual
media/right review
policy/legal accuracy
ads review
release governance

并定义：

纯文本
PASS
FAIL/BLOCK
PENDING/NOT RUN
recorded P2/NIT exception

不能继续只有“npm run check PASS”。

WS-07 — Reference Archetype / Real-game Adoption

这是 V2.7 能否真正复用的关键。

必须包含：

Mandatory A — War of Genesis

过去暴露的问题必须形成 regression checklist：

纯文本
legal residue
identity safety
production residue
navigation
game recognition
real media
share media
title/content promise
Mandatory B — Bomb Farm

重点验证：

纯文本
visual adaptation
media-rich composition
video/local assets
no-media decisions
article rhythm
ad placement boundary
Mandatory C — 第三种明显不同 archetype

由 Blueprint/证据选择。

限制：

纯文本
Farever original site UNVERIFIED

因此不能以“Farever 原站已验证”作为第三 fixture 的依据。

如果使用 Farever 本地 pattern，只能写：

纯文本
local reference implementation evidence
WS-08 — Cross-Version Gate & V2.7 Assembly

最终才能处理：

纯文本
RI-02
RI-03
RI-04

要求形成：

纯文本
V2.6.5 capability baseline
        vs
accepted A3 baseline
        vs
V2.7 candidate

逐 41 ID 做 delta。

只有：

纯文本
no unauthorized P1 regression
reference adoption accepted
triad contract synchronized
exact sources frozen

以后才允许组装：

纯文本
GAME_SITE_SYSTEM_V2.7/

然后生成：

纯文本
COMPATIBILITY_MANIFEST.json

这仍不自动等于 push/tag/release。

四、Roadmap 必须显示 artifact evolution，不只列功能

每个 workstream 都要明确：

变化	SOP	Master Prompt	Starter
Requirement meaning	谁改	是否只引用	是否无变化
Execution Gate	是否定义方法	谁执行	提供什么真实命令
Technical mechanism	是否只描述 contract	是否调用	谁实现
Evidence	需要什么人工结果	如何阻止假 PASS	输出什么 machine evidence

也就是说：

Roadmap 是“三件套怎么共同演进”，不是 Starter backlog。

五、Dependency DAG 必须有真正的 Gate

至少明确：

纯文本
WS-01 Normative Foundation
        ↓
WS-02 Stable Baseline
        ↓
WS-03 Core Seams
        ↓
WS-04 Adaptation
        ↓
WS-05 Patterns
        ↓
WS-06 Acceptance
        ↓
WS-07 Real Adoption
        ↓
WS-08 Cross-Version / Assembly

但允许合理并行。

例如：

纯文本
WS-04 和部分 WS-05

在 Core interfaces frozen 后可以并行。

Roadmap 要写清：

哪些是硬 predecessor；
哪些可并行；
哪些只能在 assembled site 后验证。
六、每个 Workstream 都要有“可测 Exit Criteria”

禁止：

纯文本
“功能完成”
“代码写好”
“文档同步”

这种不可验证状态。

应该类似：

纯文本
WS-X EXIT

Capability IDs:
  mapped: PASS

Artifacts:
  required delta complete

Automated evidence:
  PASS

Browser evidence:
  PASS / NOT_APPLICABLE with contract basis

Human evidence:
  PASS where required

Regression:
  existing required P1 unchanged

Independent review:
  ACCEPT

Next workstream prerequisites:
  satisfied
七、Roadmap 要明确“何时同步 SOP/Prompt”

不能把它们全部拖到最后做一个“A5 sync”。

正确原则：

纯文本
一个 capability workstream 改变了某层 authority
        ↓
该 workstream 内同步相应 artifact

例如：

纯文本
Media capability implementation
Starter changes schema/render

同时：
SOP changes media method/acceptance if needed
Prompt changes execution/hard-stop if needed

而不是：

纯文本
先把 Starter 全做完
最后统一补两份文档

最终 WS-08 做的是compatibility reconciliation，不是第一次同步。

八、Roadmap Design Acceptance

Codex 完成后 STOP。

我将独立检查至少：

路线是否由 accepted Blueprint 推导，而非复制旧 V1。
三件套是否是一路协同演进，而非最后补文档。
41 IDs 是否全部有 workstream 落点或明确 NO_CHANGE。
A1/A2/A3 是否被复用而不是重复实施。
AX-01/03 是否进入正确位置但没有现在自动恢复 A4。
V2.6.5 PARTIAL seams 是否全部有处理路径。
三种 Pattern 是否从五案例证据推导而非照搬网站。
War of Genesis / Bomb Farm adoption 是否是真实 release obligation。
Farever 证据边界是否仍正确。
Acceptance 是否覆盖技术 + browser + human，而非 build-only。
RI-01~04 / PA-01 是否形成真正 release chain。
V2.7 assembly 是否只发生在所有前置 Gate 后。
Candidate/source strategy 是否保护准确 Git provenance。
每个 workstream 是否有限、可测、有 exit criteria。
路线是否仍然只是设计，没有偷偷执行实现。

结果仍只有：

纯文本
ACCEPT
或
REVISE
本轮 Codex 边界
YAML
ITERATION_7:
  produce:
    - template/roadmap/GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md
    - roadmap design provenance/check records

  may_update:
    - PROJECT_STATE.md
    - README.md
    only for current design-state pointers

  must_not:
    - modify Candidate source
    - create SOP V2.7 product
    - create Prompt V2.7 product
    - create GAME_SITE_SYSTEM_V2.7 delivery root
    - resume A4
    - add dependencies
    - run implementation tasks
    - push/tag/merge/release

Blueprint V1 正式 ACCEPT。下一步只允许 Codex 设计 V2.7 Evolution Roadmap V1。


