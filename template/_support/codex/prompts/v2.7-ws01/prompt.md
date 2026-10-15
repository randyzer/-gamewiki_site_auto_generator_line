ChatGPT 说：

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 8
WORKSTREAM: WS-01 — V2.7 Normative Foundation
PLAN_STATUS: AUTHORIZED PLAN
CANDIDATE_CREATION: ALLOWED ONLY AFTER PRE-CANDIDATE CHECKS BELOW PASS
STARTER / A4 / OTHER WS / COMMIT / RELEASE: OUT OF SCOPE

我已独立读取 Codex 草案、PROJECT_STATE.md、accepted Blueprint/Roadmap、V2.6.5 SOP/Prompt 一级来源，以及 Product Contract v0.2 的 H/V/W 段。

Codex 草案总体方向正确，但不能原样执行。本 PLAN 对它做三处关键校正：

Reference A/B/C ≠ WS-07 三个真实项目。
evidenceStatus ≠ Contract §W 的 outcome。
草案提到的 changeType 不是现有 H 表字段；H 表实际为 16 列，必须逐列原样保留，不能新增 changeType。
1. 两个语义问题的正式裁决
A. Reference archetype 与真实项目 adoption 必须分两个 namespace

前代 Contract §V 明确定义：

纯文本
Reference A = Wiki / Commercial Editorial
Reference B = Problem Guide / Tool
Reference C = Tactical / Systems

它们是：

small deterministic assembled fixtures

而且原文明确：

BombFarm V2、War of Genesis 等历史项目可以以后成为 compatibility references，不能替代三类 archetype contracts。

因此 V2.7 固定为：

纯文本
REFERENCE ARCHETYPE namespace
REF-A = Wiki / Commercial Editorial
REF-B = Problem Guide / Tool
REF-C = Tactical / Systems

真实采用则使用完全不同的命名：

纯文本
REAL ADOPTION namespace
PROJECT-WOG
PROJECT-BOMBFARM
PROJECT-TASK-GUIDE

关系为多对多 coverage mapping，不是：

纯文本
Reference A = War of Genesis
Reference B = Bomb Farm
Reference C = Task Guide

这种字母替换。

RI-02 的三类 deterministic reference suite 继续保留并且必须最终 PASS。WS-07 三个真实项目是额外的 compatibility/adoption evidence；它们可以补强 RI-02/PA-01，但不能替代 REF-A/B/C。

这意味着 accepted Blueprint/Roadmap 需要做一次仅文字语义澄清，不改变 8 个 workstream、DAG 或 capability IDs。

B. evidenceStatus 与 verifiedOutcome

Contract §W 的规范 outcome 保持原样：

纯文本
PASS
FAIL
NOT_APPLICABLE
NOT_SELECTED
EXCEPTION   # 必须是 approved exception

WS-01 不允许加入：

纯文本
PENDING
NOT_RUN
UNVERIFIED
BLOCK
REVISE
CONDITIONAL_PASS

作为新的 outcome。

Capability Evidence Record 可增加一个工作流字段：

纯文本
evidenceStatus:
  NOT_RUN
  PENDING
  OBSERVED
  UNVERIFIED

但它不是 Capability Registry 字段，也不是 release outcome。

固定组合规则：

evidenceStatus	verifiedOutcome	合法性
NOT_RUN	null	VALID
PENDING	null	VALID
UNVERIFIED	null	VALID
OBSERVED	null	VALID：已有证据，但尚未由 Verification Owner裁定
OBSERVED	PASS / FAIL / NOT_APPLICABLE / NOT_SELECTED / approved EXCEPTION	VALID，前提是证据、reviewer、日期、准确 build/source identity 完整
其它三个状态	非 null	INVALID

另外：

NOT_APPLICABLE 必须有 applicability rationale 和 verifier，不能用来藏失败。
NOT_SELECTED 只能按原 Contract 的条件/可选逻辑使用，不能把 REQUIRED P1 偷偷变成未选择。
EXCEPTION 严格受 §AA 约束：普通 P1 failure 不能转换为 exception。
A3 AX-01 当前只能写 OBSERVED + null：implementation accepted，但 browser requirement 未证明。
测试总数、Gap Audit 的 PROVEN/PARTIAL/GAP、历史项目 PASS，都不能自动转换成 verifiedOutcome=PASS。
PROJECT_BRIEF_TEMPLATE.md 已有一套 Visual Evidence 的 “Evidence status = VERIFIED / OBSERVED / ...”。那是另一个局部 namespace；V2.7 必须明确说明它不是 capability evidenceStatus。
2. Candidate 创建前必须先完成的 4 个只读/设计检查
检查	必须结果
SOP source	HEAD=9a13b731...、CLEAN、记录 tree
Prompt source	HEAD=f655a0e0...、CLEAN、记录 tree
Frozen Starter	HEAD=29b25559...、CLEAN
Accepted A3	HEAD=b067e8d4...、CLEAN
两个 V2.7 candidate 目标目录	必须不存在；存在则 STOP，不覆盖
Product Contract v0.2	保存整文件 hash；提取 H 表、§V、§W 为 predecessor snapshot
H Registry	正好 41 行、唯一 ID、16 个现有列
Accepted Blueprint/Roadmap	来源身份固定；完成下面两处 namespace clarification 后才允许 candidate 创建
Pre-candidate 设计文档澄清

仅允许修改：

文件	有限修改
template/architecture/GAME_SITE_SYSTEM_V2.7_ARCHITECTURE_BLUEPRINT_V1.md	明确 Reference Regression 是 deterministic REF-A/B/C；WoG/BombFarm/Task Guide 为独立 real-adoption/compatibility projects，不替代 REF suite
template/roadmap/GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md	WS-06B/07/08 使用上述双 namespace；WS-07 不再称真实项目 A/B/C；不改 workstream 数量、DAG、能力语义
template/PROJECT_STATE.md	记录 WS-01 正在执行及此次语义澄清；其它 WS 仍 PLANNED
template/codex/prompts/v2.7-ws01/prompt.md	保存本回复完整 PLAN，作为实际执行边界

Codex 草案 WS01_V2.7_NORMATIVE_FOUNDATION_IMPLEMENTATION_PLAN_V1.md 保留为历史草案，不覆盖成本 PLAN。

3. Candidate 创建策略

前置全 PASS 后，才创建：

纯文本
Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/
Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE/

允许沿用草案中的：

纯文本
git init
+
git fetch <exact local repo> <exact SHA>
+
checkout -b v2.7/normative-foundation FETCH_HEAD

要求：

只使用本地 source，不联网拉新 baseline；
创建后 HEAD/tree 必须与对应 V2.6.5 source 相同；
source commit 必须是 ancestor；
.git/objects/info/alternates 不得依赖源 repo；
不创建 commit；
不 push/tag/merge；
source repo 保持 CLEAN/不变。
4. SOP Candidate — 逐文件 PLAN
文件	操作	WS-01 精确范围
docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md	ADD	从 v0.2 迁入。H 表 41 行与16 列全部逐字保留；Introduced 仍是 v0.1/v0.2。增加 V2.7 canonical ownership/lineage。§V REF-A/B/C 原契约保持；增加 namespace clarification。§W outcome enum保持；增加 evidenceStatus vs verifiedOutcome clarification。AD/AE 标为 predecessor historical context，不再当当前 Next Step
docs/NEW_GAME_SITE_SOP_v2.7.md	ADD	继承 v2.6.5 方法；新增 canonical Contract/Registry authority、capability evidence workflow、reference fixture vs real adoption 方法、准确证据/冲突规则。不得重写 research/media/ads/release lifecycle
docs/CAPABILITY_EVIDENCE_TEMPLATE_V2.7.md	ADD	定义 capability evidence record；明确 evidenceStatus 是工作流状态，verifiedOutcome 才映射 §W outcome；包含准确 contract/source/project/build identity、scope、reviewer、refs、exception、supersedes/conflicts
docs/EXECUTION_PROMPT.md	MODIFY	必读列表加入 V2.7 SOP、Contract、Evidence Template；canonical hash/path 不匹配、41 ID 漂移、非法 status/outcome 组合时 STOP
docs/PROJECT_BRIEF_TEMPLATE.md	MODIFY	Version Provenance 增加 SOP/Starter/Prompt precise identity 与 canonical contract identity；明确现有 Official Visual Evidence “Evidence status” 与 capability evidenceStatus 不同 namespace
docs/CURRENT_STATUS_TEMPLATE.md	MODIFY	新增 capability evidence/acceptance status 区域；明确 implementation accepted / evidence observed / verified outcome / human release 是不同层次
docs/QA_CHECKLIST.md	MODIFY	增加 canonical contract identity、41-row integrity、REF-A/B/C suite、real-adoption separation、status/outcome legality、历史 PASS 不继承等检查
PACKAGE_MANIFEST.json	MODIFY	current_methodology_authority 指向 v2.7；加入 Contract/Evidence Template；更新 files/file_count。不要覆盖旧 release provenance：保留历史 released predecessor，另加 V2.7 candidate evolution source HEAD/tree 和 canonical contract hash
README.md	MODIFY	指向 V2.7 candidate authority；清楚写 candidate ≠ release
新手必读.md	MODIFY	更新正确入口和 Contract/Evidence 边界；不全仓机械替换版本字符串
CHANGELOG.md	MODIFY	增加 Unreleased / V2.7 Candidate / WS-01 条目；不能写 Released

以下原文件在 Candidate 中保留、不修改其历史正文：

纯文本
docs/NEW_GAME_SITE_SOP_v2.6.5.md
archive/*
5. Canonical identity

V2.7 canonical file：

纯文本
GAME_SOP/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md

Candidate 阶段统一记录：

纯文本
systemVersion = V2.7
productContractVersion = V2.7
capabilityRegistryVersion = V2.7
canonicalPath = docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md
owningArtifact = GAME_SOP
sha256 = <actual candidate contract SHA-256>
predecessorContractVersion = v0.2
predecessorSha256 = <actual v0.2 SHA-256>

注意：

Introduced=v0.1/v0.2 是 capability 历史，不因 canonical 文件进入 V2.7 而重写成 V2.7。

Contract 文件本身不嵌自己的 SHA，避免循环。

PACKAGE_MANIFEST.json、Prompt CONTRACT_REFERENCE.json、Evidence Template 必须引用同一个 contract SHA/path/version/owner。

因为本阶段禁止 commit，SOP candidate identity 用：

纯文本
sourceBaselineCommit
sourceBaselineTree
candidatePath
canonicalContractSha256
candidateWorkingTree/file-hash manifest

不能编造一个不存在的 V2.7 commit SHA。

6. Master Prompt Candidate — 逐文件 PLAN
文件	操作	WS-01 精确范围
CodexMasterPrompt_v2.7Candidate.md	ADD	以 v2.6.5Final 为结构基础；更新 header、§0 authority、§3 provenance、相关 Gate。保持 Phase 0→5 编号，不创建 WS 运行时 phase。引用 SOP Contract，不复制 41-row Registry
README.md	ADD	Candidate 唯一入口、source lineage、非 release 声明、canonical SOP contract 引用
CONTRACT_REFERENCE.json	ADD	仅存 canonical identity + SOP candidate/source identity + predecessor identity；不包含 41 requirement rows

Prompt HARD STOP 至少覆盖：

纯文本
contract missing/hash mismatch
41-ID registry drift
canonical owner/path mismatch
required evidence missing
illegal evidenceStatus/verifiedOutcome combination
historical PASS conflicting with newer BLOCK/PENDING
source/build identity mismatch
P1 failure disguised as EXCEPTION/N/A/NOT_SELECTED

Prompt 不得：

纯文本
复制 Registry
调用尚不存在的 V2.7 Starter/browser runner
把 accepted A3 写成 V2.7 release
把当前 build/test历史写成 current V2.7 PASS
7. WS-01 evidence baseline 文件

草案中的：

纯文本
capability-baseline.json

改名建议为：

纯文本
template/codex/executions/v2.7-ws01/
capability-evidence-baseline.json

原因：避免与 Contract §W 的冻结 Release Capability Baseline混淆。

它必须显式：

纯文本
baselineKind = WS01_EVIDENCE_INDEX
releaseBaseline = false

41 个 ID 均有记录，但它只是：

frozen V2.6.5 + accepted A3 已知工程/项目证据的索引。

不得根据：

Gap Audit 的 PROVEN
653 tests
A1/A2/A3 “implementation accepted”
War of Genesis build PASS
Bomb Farm 历史 QA PASS

自动产生 current verifiedOutcome=PASS。

特别是：

纯文本
AX-01:
  evidenceStatus = OBSERVED
  verifiedOutcome = null
  note = implementation accepted; browser requirement pending

其它能力只有在已经存在与完整 requirement、准确 scope、Verification Owner 相匹配的正式 outcome时才能携带历史 non-null outcome；否则一律 null，不推断。

8. Reference mapping 在 WS-01 中如何落盘

不新增 capability ID。

Canonical Contract / SOP 中使用类似：

纯文本
Reference Archetype:
  REF-A Wiki / Commercial Editorial
  REF-B Problem Guide / Tool
  REF-C Tactical / Systems

Real Adoption Project:
  PROJECT-WOG
  PROJECT-BOMBFARM
  PROJECT-TASK-GUIDE

允许 many-to-many coverage note，例如某真实项目可以帮助覆盖一个或多个 archetype 风险，但：

纯文本
realProjectCoverage != deterministicReferencePass

最终 release 要求保持：

纯文本
REF-A PASS
REF-B PASS
REF-C PASS
+
WS-07 real adoption obligations PASS

二者都需要。

9. 自动检查与负例

新增：

纯文本
template/codex/executions/v2.7-ws01/check_ws01.py

只检查文档/JSON/identity，不跑 Starter product build。

必须包含这些负例：

负例	必须 FAIL
删除一个 capability ID	YES
重复一个 ID	YES
修改 Requirement / Applicability / Severity / 任一 Owner / Introduced / Status / Deprecation / Replacement	YES
新增 changeType 到 H canonical table	YES
将 WS-01 当 capability ID	YES
Prompt 内出现第二份 41-row Registry	YES
canonical path/hash/owner 任一不一致	YES
把 PROJECT-WOG 写成 Reference A 的替代物	YES
缺少 REF-A/B/C 中任一 contract	YES
PENDING + PASS	YES
NOT_RUN + FAIL	YES
UNVERIFIED + NOT_APPLICABLE	YES
verifiedOutcome=PENDING/BLOCK/REVISE	YES
P1 普通 failure → EXCEPTION	YES
缺 evidenceRefs/reviewer/date 却给 non-null outcome	YES
A3 AX-01 自动变 PASS	YES
历史项目 PASS 自动继承为 current outcome	YES

正例也必须覆盖：

纯文本
NOT_RUN + null
PENDING + null
UNVERIFIED + null
OBSERVED + null
OBSERVED + PASS with complete verified evidence
OBSERVED + FAIL with complete verified evidence
contract-valid NOT_APPLICABLE / NOT_SELECTED
approved P2 exception record

此外检查：

H exact 41 rows / 16 columns；
§V REF-A/B/C predecessor definitions retained；
§W five outcome values retained；
SOP manifest JSON/file_count/paths；
Contract identity three-way equality；
local links；
git diff --check 两个 candidate；
四个 source repo HEAD/tree/hash/mode 与 preflight 相同；
Starter 没有新 branch；
real projects/reference trees 没变化；
final assembly dir 不存在；
无 dependency installation。
10. Execution evidence files

允许新建：

纯文本
template/codex/executions/v2.7-ws01/
├── provenance.json
├── capability-evidence-baseline.json
├── check_ws01.py
├── check.log
└── result.md

provenance.json 必须记录：

四个 source repo pre/post HEAD/tree/CLEAN；
predecessor Contract hash；
candidate source lineage；
candidate actual changed/untracked files；
canonical Contract SHA；
check output；
无 commit/push/tag/release；
无 Starter/real-project/reference changes。

verification.md 不要由 Codex 预先填写 ACCEPT。收到下一轮我的独立 verdict 后再保存实际审查文本。

11. STOP rules

出现任意一项立即停止依赖执行：

纯文本
source dirty or HEAD mismatch
target candidate path already exists with unknown provenance
predecessor Contract hash/41 rows unexpected
REF-A/B/C mapping unresolved
H table semantic difference
new outcome enum introduced
duplicate active Registry
canonical identity mismatch
illegal evidenceStatus/outcome combination
baseline infers PASS from test count/support label
change outside listed files/scope
Starter/A4/real-project/reference mutation
negative test unexpectedly passes
tool failure that prevents exact verification

不允许用 reset/force checkout/rm -rf 清掉未知用户工作。

12. WS-01 exit criteria

WS-01 只有同时满足以下条件才可交给我独立 Review：

YAML
SOP_candidate:
  created_from_exact_source: PASS
  canonical_contract_unique: PASS
  41_ID_semantics_preserved: PASS
  reference_archetypes_preserved: PASS

Prompt_candidate:
  created_from_exact_source: PASS
  contract_reference_exact: PASS
  duplicate_registry: NONE

Evidence_model:
  evidenceStatus_vs_verifiedOutcome: PASS
  false_PASS_conversion: NONE

Baseline:
  41_records: PASS
  releaseBaseline_claim: false
  AX01_browser_proof: PENDING

Source_protection:
  frozen_SOP: unchanged
  frozen_Prompt: unchanged
  frozen_Starter: unchanged
  accepted_A3: unchanged
  real_projects: unchanged
  references: unchanged

Checks:
  positive: PASS
  negative: PASS
  diff_check: PASS

Git:
  commits_created: 0
  pushes: 0
  tags: 0
  merges: 0

Independent_review:
  status: PENDING

然后 Codex 发送：

纯文本
[C2C]
STATE: EXECUTED
TASK_ID: c2c_a765
ITERATION: 8
WORKSTREAM: WS-01

并让我通过 connector 直接读 Candidate、canonical Contract、Prompt、baseline、负例与 provenance。

这个 PLAN 现在取代 Codex 的 LOCAL_DRAFT 作为 WS-01 的执行边界。Codex 可以按此开始 preflight → 语义澄清 → candidate creation → WS-01 文档实施；不得越过本计划进入 WS-02。
