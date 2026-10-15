ChatGPT 说：

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 8-REVIEW
WORKSTREAM: WS-01
VERDICT: REVISE — NARROW EVIDENCE-MODEL FIX
WS-02: NOT AUTHORIZED

WS-01 整体执行质量很高，范围、lineage、canonical migration、双 namespace、Prompt HARD STOP、41×16 Registry、负例和 source protection 我都接受。唯一阻止 ACCEPT 的是 applicabilityDecision 还没有忠实表达 Contract §I 的“实际适用性决定”。

当前模型把两件事混在了一起：

纯文本
Registry Applicability
= REQUIRED / CONDITIONAL / OPTIONAL / PROHIBITED

和：

纯文本
项目/构建层 applicability decision
= 这个条件这次到底成立吗？
= optional 这次到底选了吗？

例如当前 baseline 中实际是：

纯文本
applicabilityDecision.value = "CONDITIONAL"
evaluated = false

这实际上只是复制了 H 表的分类，不是 §I 要求的 condition decision。

更关键的是，当前 check_ws01.py 对未来 non-null outcome 没有强制：

CONDITIONAL + PASS/FAIL 必须证明 condition=true；
CONDITIONAL + NOT_APPLICABLE 必须证明 condition=false；
OPTIONAL + PASS/FAIL 必须证明 selected=true；
OPTIONAL + NOT_SELECTED 必须证明 selected=false。

如果现在 ACCEPT，这个缺口会一直带到 WS-08 frozen Capability Baseline。

其余审查项均 PASS

我确认了：

canonical Contract 的 H 表确实是原 41 行 × 16 列逐字保留；
§V Reference A/B/C 与 §W outcome 原文保留；
REF-A/B/C 和 PROJECT-* 已正确拆成两个 namespace；
Blueprint/Roadmap 的澄清正确，WS-06B 承担 deterministic reference suite，WS-07 承担 real adoption；
verifiedOutcome 仍只有原五种结果，没有把 PENDING/BLOCK/REVISE 偷偷加入；
AX-01 正确保持 OBSERVED + null；
Prompt 没复制第二份 Registry；
v2.6.5 Prompt 的 Phase 0–5 和主要 HARD STOP 仍保留；
SOP candidate 11 个 product delta + Prompt 3 个 product delta 与 provenance 一致；
四个 source repo CLEAN/HEAD/tree 不变；
743 个受保护 real-project/reference 文件未变；
没有 commit/push/tag/merge、Starter branch、dependency、A4 或 assembly。
有限修正方案

不要重建 candidate，不改 canonical Contract，因此 canonical SHA 可以保持不变。

只修 evidence method：

CAPABILITY_EVIDENCE_TEMPLATE_V2.7.md

把 Registry 分类单独存：

纯文本
registryApplicability

精确等于 H 表：

纯文本
REQUIRED / CONDITIONAL / OPTIONAL / PROHIBITED

而 applicabilityDecision 改为真正的项目/构建决定，建议最小结构：

纯文本
evaluated: boolean
applies: true / false / null
selected: true / false / null
reason
decisionOwner
evidenceRefs

当前 WS-01 index 因没有重新做项目判断，应是：

纯文本
evaluated = false
applies = null
selected = null
capability-evidence-baseline.json

41 条：

纯文本
registryApplicability = <H表原值>

applicabilityDecision:
  evaluated = false
  applies = null
  selected = null

保持全部：

纯文本
verifiedOutcome = null

尤其 AX-01 状态不变。

check_ws01.py

增加硬规则：

纯文本
REQUIRED / PROHIBITED:
  non-null outcome => evaluated=true, applies=true

CONDITIONAL:
  PASS/FAIL          => evaluated=true, applies=true
  NOT_APPLICABLE     => evaluated=true, applies=false

OPTIONAL:
  PASS/FAIL          => evaluated=true, selected=true
  NOT_SELECTED       => evaluated=true, selected=false

并拒绝：

纯文本
CONDITIONAL + PASS + applies=null/false
CONDITIONAL + NOT_APPLICABLE + applies=true/null
OPTIONAL + PASS + selected=null/false
OPTIONAL + NOT_SELECTED + selected=true/null
REQUIRED + applies=false
PROHIBITED + applies=false

reason/decisionOwner/evidenceRefs 对 NOT_APPLICABLE 和 NOT_SELECTED 继续必需。

CodexMasterPrompt_v2.7Candidate.md

只加一小段明确：

Registry applicability category 和 current applicability decision 是不同字段；Prompt 不得把 CONDITIONAL 本身当作“已判定适用”。

NEW_GAME_SITE_SOP_v2.7.md

同样增加一条方法边界即可。无需改 canonical Product Contract。

重跑现有全部检查，并新增上述 positive/negative cases；更新：
纯文本
result.md
provenance.json
check.log

保留此前两次成功 check，不覆盖历史。

STOP

修正期间仍然禁止：

纯文本
canonical Contract 41行/16列变化
candidate recreation
commit
WS-02
Starter
A4
real project
reference source
push/tag/merge/release

修正后再次发 STATE: EXECUTED，我只复核这个 evidence applicability closure。

结论：WS-01 不是 BLOCKED，也不需要重做；是一个很窄的 REVISE。除 applicability evidence model 外，其余部分目前均达到 ACCEPT 水平。
