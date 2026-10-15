[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 5A-REV1
REVIEW_VERDICT: REVISE — NARROW GOVERNANCE FIX
A4: PAUSED
ROADMAP: NOT STARTED

我已独立读取 Blueprint、provenance、check log、PROJECT_STATE.md、README.md 和 iteration5 execution output。设计检查本身可信：41 个 capability ID 完整保留、链接/空白检查通过、四个 repo 均保持预期 HEAD/CLEAN，没有产品代码或依赖变化。

Blueprint 主体质量已经较高。12 条验收标准中，10 条 PASS，2 条因为同一个问题暂不能通过。

标准	结论
1. 三件套边界清楚、无第四源码权威	REVISE
2. 三方案真实比较	PASS
3. 设计结论可追溯证据	PASS
4. Farever 保持 UNVERIFIED	PASS
5. 41 IDs 无静默变更	PASS
6. 无偷偷新增 capability	PASS
7. S1/A1/A2/A3 状态准确	PASS
8. Core / Adaptation / Pattern / Acceptance 边界	PASS
9. SOP / Prompt / Starter 不互相吞并	PASS
10. dependency ≠ roadmap	PASS
11. RI-01~04 / PA-01 与回归体系	PASS
12. 与最终 V2.7 delivery layout 闭合	REVISE
唯一的结构性问题

Blueprint 把：

纯文本
L0 = Product Contract / Capability Registry

定义成了整个体系的规范源，并且 Product Contract 自己明确说：

纯文本
Section H = canonical Capability Registry

但最终交付结构目前只有：

纯文本
GAME_SITE_SYSTEM_V2.7/
├── GAME_SOP/
├── GAME_SITE_STARTER/
├── GAME_CODEX_MASTER_PROMPT/
├── COMPATIBILITY_MANIFEST.json
└── README.md

也就是说，目前没有回答：

V2.7 发布以后，这 41 个 capability 的规范文本和生命周期 Registry 到底由三件套中的哪一个工件持有？

如果继续让：

纯文本
template/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md

成为 canonical authority，那么 template/ 就事实上变成了三件套之外的第四个规范权威源。

如果最终 delivery 又不带它，则 V2.7 包里反而缺少定义 41 个能力含义的规范源。

这是一个真实的治理闭环缺口，不能推迟给 Roadmap。

我建议的最小修正

不需要重画架构。

1. 把 L0 的规范所有权落到 GAME_SOP V2.7

推荐原则：

纯文本
GAME_SOP V2.7
└── owns normative Product Contract + Capability Registry

Master Prompt V2.7
└── consumes/references capability IDs and enforces execution/gates

Starter V2.7
└── implements the capability subset it owns and exposes evidence

原因很简单：

Product Contract 定义的是：

什么必须成立；
applicability；
severity；
requirement ownership；
acceptance evidence；
capability lifecycle。

这些本质上属于方法、验收与治理规范，最接近现有 SOP authority，而不是 Starter implementation，也不是 Prompt execution controller。

这不意味着 SOP 接管技术实现。

仍然保持：

纯文本
Requirement meaning/lifecycle → SOP
Execution enforcement        → Master Prompt
Portable implementation      → Starter
Independent proof            → Acceptance
2. Blueprint 必须明确 V2.7 canonical path

不必现在真的创建 V2.7 SOP，但蓝图应指定类似：

纯文本
GAME_SOP V2.7/
└── docs/
    └── COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md

或者拆成：

纯文本
PRODUCT_CONTRACT_V2.7.md
CAPABILITY_REGISTRY_V2.7.md

两种都可以。

如果拆开，必须声明哪个文件拥有：

纯文本
Capability ID
semantic requirement
lifecycle
replacement/deprecation history

避免再次出现两个 registry。

3. 当前 v0.2 文件身份要明确

Blueprint 应说明：

纯文本
template/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md
=
V2.7 design source / predecessor

NOT
=
final V2.7 delivery authority

等 V2.7 SOP 正式形成以后，新的 canonical contract/registry 才成为权威。

不能静默覆盖 v0.2。

4. COMPATIBILITY_MANIFEST.json 必须绑定它

最终兼容性清单至少要记录：

纯文本
productContractVersion
capabilityRegistryVersion
canonicalPath
sha256
owningArtifact = GAME_SOP

以及 SOP / Prompt / Starter 各自准确 commit/tree/hash。

这样：

纯文本
41 IDs
   ↓
canonical normative source
   ↓
exact V2.7 SOP artifact
   ↓
Prompt/Starter references
   ↓
Compatibility Manifest binds all three

闭环才成立。

Codex 的有限修正任务

只改设计文档，不做实现：

YAML
BLUEPRINT_REVISION:
  modify:
    - GAME_SITE_SYSTEM_V2.7_ARCHITECTURE_BLUEPRINT_V1.md
    - only if needed, PROJECT_STATE.md / README.md

  required:
    - assign Product Contract / Capability Registry canonical ownership to V2.7 triad
    - specify final canonical location
    - clarify current v0.2 file is predecessor/design input
    - bind registry identity into compatibility manifest contract
    - preserve all 41 IDs unchanged

  forbidden:
    - roadmap
    - Candidate changes
    - A4
    - SOP V2.7 implementation
    - Prompt V2.7 implementation
    - delivery directory creation
    - release/version tags

完成后再发：

纯文本
[C2C]
STATE: EXECUTED
TASK_ID: c2c_a765
ITERATION: 5A-REV1

我只复核这个治理闭环。

其余 Blueprint 内容无需推倒重来。修正通过后，我会给 ACCEPT，然后才输出有限的 V2.7 Roadmap Design PLAN。


