# Iteration20 — actual ChatGPT finite governance amendment PLAN

Original conversation: https://chatgpt.com/c/6abddfa5-02ac-83ee-9b18-0b6960427b4c

Captured after completed response; only exact five governance files, saved PLAN and execution metadata. Post-review indexes only after independent acceptance. Current readiness remains NOT_EVALUATED.

## Exact preimages

```json
{
  "template/roadmap/GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md": {
    "fingerprint": {
      "sha256": "523fbddeb3b30f67e3636688fafded6fa8d167f05dcd5650ed124a8be3b983e9",
      "mode": 420,
      "symlink": false
    },
    "savedAs": "template/codex/executions/v2.7-ws06a/iteration20/preimages/01-GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md.txt"
  },
  "Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/NEW_GAME_SITE_SOP_v2.7.md": {
    "fingerprint": {
      "sha256": "632fffde19cf54859304040aef2565405f147f9fdc3fd4012f87b3c921246d0f",
      "mode": 420,
      "symlink": false
    },
    "savedAs": "template/codex/executions/v2.7-ws06a/iteration20/preimages/02-NEW_GAME_SITE_SOP_v2.7.md.txt"
  },
  "Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/QA_CHECKLIST.md": {
    "fingerprint": {
      "sha256": "bc7d140864554a669ea56409ef886dd77480bbbb9ed775abb85966eb96fc23e6",
      "mode": 420,
      "symlink": false
    },
    "savedAs": "template/codex/executions/v2.7-ws06a/iteration20/preimages/03-QA_CHECKLIST.md.txt"
  },
  "Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/EXECUTION_PROMPT.md": {
    "fingerprint": {
      "sha256": "fda2607387683968a23823b2501e1c19c988a363d34605f008e7f7f0e96ccad8",
      "mode": 420,
      "symlink": false
    },
    "savedAs": "template/codex/executions/v2.7-ws06a/iteration20/preimages/04-EXECUTION_PROMPT.md.txt"
  },
  "Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE/CodexMasterPrompt_v2.7Candidate.md": {
    "fingerprint": {
      "sha256": "645d0253de6abc965f3132639023b4073ed90c999b6b42c27d988cd880c84efe",
      "mode": 420,
      "symlink": false
    },
    "savedAs": "template/codex/executions/v2.7-ws06a/iteration20/preimages/05-CodexMasterPrompt_v2.7Candidate.md.txt"
  },
  "template/PROJECT_STATE.md": {
    "fingerprint": {
      "sha256": "2f5c2a8f796afe9c5eebd467e739c3ad786984ea000a5e1d476eebd7623cd49b",
      "mode": 420,
      "symlink": false
    },
    "savedAs": "template/codex/executions/v2.7-ws06a/iteration20/preimages/06-PROJECT_STATE.md.txt"
  },
  "template/README.md": {
    "fingerprint": {
      "sha256": "a0d7b979194a773d5cf63accc4c772a641f7851157e575809f87976bb61647d8",
      "mode": 420,
      "symlink": false
    },
    "savedAs": "template/codex/executions/v2.7-ws06a/iteration20/preimages/07-README.md.txt"
  },
  "template/roadmap/V2.7_TASK_LEDGER.md": {
    "fingerprint": {
      "sha256": "83bbb85d42bf00c0cec46a8afadf66158159ab266f53d8f872434f8a785391f1",
      "mode": 420,
      "symlink": false
    },
    "savedAs": "template/codex/executions/v2.7-ws06a/iteration20/preimages/08-V2.7_TASK_LEDGER.md.txt"
  }
}
```

## Actual completed PLAN

```text
- heading "ChatGPT 说：" [level=4]
    - paragraph:
      - text: 下面是可直接执行的
      - strong: PLAN20
      - text: 。它只实施 PLAN19 已接受的治理修订，不触碰任何产品代码，也不会因为 amendment 落地就自动获得 Development Readiness。
    - button "添加到资料库":
      - generic: PLAN20 — Development Readiness Governance Amendment
    - button "复制":
    - button "打开编辑器":
    - textbox "开始写作":
      - paragraph:
        - text: "[C2C]"
        - text: "STATE: PLAN"
        - text: "TASK_ID: c2c_a765"
        - text: "ITERATION: 20"
        - text: "WORKSTREAM: WS06A Development Readiness governance amendment"
        - text: "PLAN_STATUS: READY FOR EXECUTION"
        - text: "SOURCE: ACCEPTED PLAN19 DESIGN"
        - text: "SCOPE: EXACT 5 EXISTING GOVERNANCE FILES"
        - text: "PRODUCT_DELTA: 0"
        - text: "READINESS: NOT_EVALUATED"
        - text: "WS06A: BLOCKED"
        - text: "SAFARI_PROOF: 0"
        - text: "WS03_CODE: NOT AUTHORIZED"
      - heading "1. 本轮目标" [level=2]
      - paragraph:
        - text: 把 iteration19 已独立 ACCEPT 的 Development Readiness 设计，从
        - code: template/design/ws06a/*.md
        - text: 的
        - strong: PROPOSAL ONLY
        - text: 状态，有限同步进现有治理体系。
      - paragraph: 本轮只解决：
      - blockquote:
        - paragraph: 治理体系正式承认“有限开发准入”和“完整浏览器/发布验收”是两条不同路径。
      - paragraph: 本轮不解决：
      - code: 当前 source 是否真的获得 Development Readiness WS03A 是否可以开始写代码 Safari 是否通过 WS06A 是否关闭 任何 capability 是否 PASS
      - paragraph: 因此 iteration20 成功后的状态必须仍然是：
      - code: WS06A_DEVELOPMENT_READINESS = NOT_EVALUATED WS06A = BLOCKED Safari proof = 0 WS03 code = NOT STARTED
      - separator
      - heading "2. 精确修改范围：只能 5 个现有文件" [level=1]
      - heading "G1 — Roadmap" [level=2]
      - code: template/roadmap/ GAME_SITE_SYSTEM_V2.7_EVOLUTION_ROADMAP_V1.md
      - heading "G2 — SOP" [level=2]
      - code: Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/ NEW_GAME_SITE_SOP_v2.7.md
      - heading "G3 — SOP QA" [level=2]
      - code: Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/ QA_CHECKLIST.md
      - heading "G4 — SOP Execution Prompt" [level=2]
      - code: Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/ EXECUTION_PROMPT.md
      - heading "G5 — Master Prompt" [level=2]
      - code: Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE/ CodexMasterPrompt_v2.7Candidate.md
      - paragraph: 除这 5 个治理文件外：
      - code: PRODUCT / TRIAD IMPLEMENTATION FILES = 0
      - separator
      - heading "3. 明确禁止修改" [level=1]
      - paragraph: 本轮不得修改：
      - code: Canonical Contract Capability Registry CONTRACT_REFERENCE PACKAGE_MANIFEST Starter src/** Starter schema/** package.json package-lock.json CI core-browser-matrix.ts run-core-browser-evidence.ts core-browser-evidence.ts verify-ws06a-browser-closure.ts 任何 tests/** 任何真实游戏项目 任何 WS04A accepted design iteration14/17/19 historical evidence frozen V2.6.5 artifacts
      - paragraph: 也不得：
      - code: 新增 checker 新增 schema 新增 API 新增 dependency commit push tag merge deploy release
      - paragraph: 如果为了实施治理规则发现必须改第 6 个规范/方法文件：
      - code: STOP
      - paragraph: 重新做有限计划。
      - separator
      - heading "4. G1 Roadmap 的精确修订" [level=1]
      - paragraph: Roadmap 是本轮最关键的修改点。
      - heading "4.1 保留正式 DAG" [level=2]
      - paragraph: 当前正式依赖：
      - code: WS02 ↓ WS06A FULL ACCEPT ↓ WS03 formal Gate ↓ 04A / 05 / 04B ↓ 06B ↓ 07 ↓ 08
      - paragraph: 不得删除或弱化。
      - paragraph: 尤其不能把：
      - code: WS03 depends on WS06A
      - paragraph: 直接删除。
      - paragraph: 应明确拆成：
      - code: FORMAL / RELEASE DAG
      - paragraph: 和：
      - code: BOUNDED DEVELOPMENT ENTRANCE
      - paragraph: 两种语义。
      - separator
      - heading "4.2 Roadmap 新增有限开发入口" [level=2]
      - paragraph: 写明：
      - code: WS02 accepted + current source Development Readiness independently accepted ↓ one bounded WS03 candidate slice ↓ fresh source evidence ↓ independent continuation review ↓ next bounded WS03 slice
      - paragraph: 它只是：
      - code: development entrance
      - paragraph: 不是新的正式 Workstream。
      - paragraph: 因此：
      - code: 八个 workstream数量不变 41 capability IDs不变 不创建 WS-06A.5 不创建第九个主任务
      - separator
      - heading "4.3 Roadmap 中定义 Development Readiness" [level=2]
      - paragraph: 只作为治理流程状态：
      - code: WS06A_DEVELOPMENT_READINESS
      - paragraph: 状态：
      - code: NOT_EVALUATED BLOCKED ACCEPTED_FOR_BOUNDED_DEVELOPMENT STALE
      - paragraph: 明确它不是：
      - code: Contract ID Registry field §W outcome verifiedOutcome EXCEPTION PASS NOT_APPLICABLE NOT_SELECTED WAIVED
      - separator
      - heading "4.4 Roadmap 中明确第一阶段范围" [level=2]
      - paragraph: Development Readiness即便未来 ACCEPT，也只允许：
      - code: 一个 WS03 candidate slice
      - paragraph: 建议顺序：
      - code: 03A → 03B → 03C → 03D-search → 03D-freshness
      - paragraph: 技术依赖继续保持：
      - code: 03C requires accepted 03B interface input
      - paragraph: 而且：
      - code: 03D-search 03D-freshness
      - paragraph: 继续分开计划、分开验收。
      - separator
      - heading "4.5 Roadmap 中明确不自动解锁" [level=2]
      - paragraph: Development Readiness不得自动解锁：
      - code: WS03 formal Gate 04A contract Gate WS05 WS04B WS06B WS07 WS08
      - paragraph: 也不得改变：
      - code: release candidate assembly capability promotion
      - separator
      - heading "5. G2 SOP 的精确修订" [level=1]
      - paragraph: SOP负责解释这种新治理机制“是什么”。
      - paragraph: 必须增加一个明确章节或现有相关章节中的有限 subsection：
      - code: Bounded Development Readiness
      - separator
      - heading "5.1 SOP 定义两条证据路径" [level=2]
      - heading "Full Acceptance" [level=3]
      - paragraph: 保持原义：
      - code: raw browser evidence + required real Safari evidence + independent acceptance
      - paragraph: 最终才可能关闭 WS06A。
      - heading "Development Readiness" [level=3]
      - paragraph: 只能用于：
      - code: bounded engineering continuation
      - paragraph: 不得用于正式验收。
      - separator
      - heading "6. SOP 中固化当前允许采用的 evidence model" [level=1]
      - paragraph: Development Readiness必须要求：
      - code: 47 planned 47 executed 0 NOT_RUN 0 skip
      - paragraph: 所有非 WebKit：
      - code: PASS
      - paragraph: WebKit失败必须满足：
      - code: failure identity ∈ exact accepted residual set
      - paragraph: 当前历史输入是：
      - code: 10 WebKit failed rows 40 failed assertions 37 ENVIRONMENT_PROFILE_BLOCKED 3 PRODUCT_EVIDENCE_UNRESOLVED
      - paragraph: 但 SOP不能把“40”写成永久产品规范。
      - paragraph: 应表述：
      - blockquote:
        - paragraph: 初始准入使用独立接受的 exact residual-set evidence；后续 source只能保留其子集，不得自动扩张。
      - paragraph: 这样 future residual减少不需要修改 SOP。
      - separator
      - heading "7. SOP 固化双引擎证据语义" [level=1]
      - paragraph: 对于每一个仍存在的 WebKit residual：
      - paragraph: 必须有同一：
      - code: category role route viewport JS motion assertion
      - paragraph: 下的：
      - code: Chromium PASS + Firefox PASS
      - paragraph: 但 SOP必须明确：
      - code: cross-engine corroboration ≠ Safari proof ≠ WebKit equivalence ≠ majority-vote PASS
      - separator
      - heading "8. SOP 固化 source freshness" [level=1]
      - paragraph: 每个 Development Readiness必须绑定：
      - code: Starter branch HEAD working-tree manifest SOP identity Prompt identity Contract SHA matrix SHA runner SHA closure verifier SHA policy/control evidence identity raw evidence SHA expected identity SHA native probe SHA fixture source SHA dist SHA Playwright version Chromium version/revision Firefox version/revision WebKit version/revision host/platform/arch review date reviewer next authorized slice
      - paragraph: 任一相关产品/验证身份发生变化：
      - code: readiness → STALE
      - paragraph: 不能继承旧签署。
      - separator
      - heading "9. G3 QA_CHECKLIST 的修改" [level=1]
      - paragraph: QA Checklist负责把新机制变成可逐项检查的治理清单。
      - paragraph: 新增两个明确区域。
      - heading "QA-A — Development Readiness audit" [level=2]
      - paragraph: 至少包含：
      - code: "[ ] 47/47 actually executed [ ] 0 NOT_RUN / skip [ ] raw FAIL preserved [ ] non-WebKit failures = 0 [ ] no unknown infrastructure error [ ] current WebKit residuals are exact subset [ ] no new failed location/assertion [ ] current disposition remains policy-valid [ ] each residual has Chromium PASS [ ] each residual has Firefox PASS [ ] source/build identities exact [ ] validation identities exact [ ] preview cleanup valid [ ] Safari proof absence explicitly recorded [ ] WS06A remains BLOCKED [ ] no capability promotion"
      - separator
      - heading "10. QA-B — Per-slice continuation" [level=1]
      - paragraph: 每个 WS03 slice后必须检查：
      - code: "[ ] one slice only [ ] exact changed files recorded [ ] capabilities touched recorded [ ] targeted positive tests [ ] targeted negative tests [ ] slice-specific rendered/browser evidence [ ] root npm run check [ ] unadopted expected rejection [ ] adopted validate/check/build [ ] fresh unchanged 47 [ ] normal cleanup [ ] non-WebKit regression = 0 [ ] WebKit residual subset only [ ] current dual-engine counterparts complete [ ] new slice surface has own evidence [ ] no new failure hidden by old WebKit policy [ ] independent continuation review"
      - separator
      - heading "11. 新功能表面必须单独验" [level=1]
      - paragraph: QA必须明确：
      - code: base 47 regression ≠ new capability browser proof
      - paragraph: 因此未来：
      - heading "03A" [level=3]
      - paragraph: 验证：
      - code: theme semantics font/density/shape/state roles focus/readability states
      - heading "03B" [level=3]
      - paragraph: 验证：
      - code: media valid media missing media failure no-media video equivalent fallback
      - heading "03C" [level=3]
      - paragraph: 验证：
      - code: share media output fallback missing required share input
      - heading "03D-search" [level=3]
      - paragraph: 验证：
      - code: enabled disabled results no results invalid/error state safe URL
      - heading "03D-freshness" [level=3]
      - paragraph: 验证：
      - code: published updated patch/version unknown freshness
      - paragraph: 不能说：
      - code: 47 passed enough
      - paragraph: 来代替这些新增表面。
      - separator
      - heading "12. QA 中定义硬 STOP" [level=1]
      - paragraph: 任何以下情况：
      - code: new WebKit failure outside residual set old failures减少但出现新的失败 Chromium counterpart missing/fail Firefox counterpart missing/fail new infrastructure error 47 missing row/skip/NOT_RUN matrix or runner changed assertion weakened programmatic focus/scroll used to fake proof Option/Alt/modifier workaround browser preference changed to manufacture PASS source/build identity mismatch cleanup failure slice-specific browser evidence missing
      - paragraph: 结果必须：
      - code: DEVELOPMENT CONTINUATION = BLOCKED
      - separator
      - heading "13. G4 EXECUTION_PROMPT 的修改" [level=1]
      - paragraph: Execution Prompt负责“Codex具体怎么执行”。
      - paragraph: 新增明确的有限流程：
      - code: Governance amendment accepted ↓ Current-source Development Readiness audit ↓ Independent readiness review ↓ ONE bounded WS03 slice plan ↓ Implementation ↓ Targeted tests ↓ Full regression/adoption ↓ Fresh 47 ↓ Slice-specific browser evidence ↓ Residual/counterpart comparison ↓ Independent continuation review
      - separator
      - heading "14. Execution Prompt 必须写 HARD STOP" [level=1]
      - paragraph: 在任何 WS03代码之前：
      - code: if readiness != ACCEPTED_FOR_BOUNDED_DEVELOPMENT → HARD STOP
      - paragraph: 在任何下一切片之前：
      - code: if previous slice != IMPLEMENTATION_ACCEPTED_FOR_CONTINUATION → HARD STOP
      - separator
      - heading "15. Execution Prompt 中 source 改变后的行为" [level=1]
      - paragraph: 一旦实施某个 WS03 slice：
      - code: old readiness immediately STALE
      - paragraph: 因此旧 readiness只能授权：
      - code: 开始一个 slice
      - paragraph: 不能授权：
      - code: 连续完成全部03A/B/C/D
      - paragraph: 完成该片后必须用新 source重新建立续行证据。
      - separator
      - heading "16. Execution Prompt 中保留 raw FAIL 的执行语义" [level=1]
      - paragraph: 运行 fresh：
      - code: npm run check:browser
      - paragraph: 如果得到预期 WebKit residual，命令可以仍然：
      - code: exit 1
      - paragraph: 执行者必须记录：
      - code: RAW QUALIFICATION = FAIL
      - paragraph: 不能把：
      - code: expected fail
      - paragraph: 写成：
      - code: browser tests PASS
      - paragraph: 然后由 Development Readiness/continuation逻辑独立解释：
      - blockquote:
        - paragraph: 是否仍满足 bounded engineering continuation 的安全条件。
      - separator
      - heading "17. G5 Master Prompt 的修改" [level=1]
      - paragraph: Master Prompt只需要增加执行控制规则，不复制整套 PLAN19。
      - paragraph: 必须明确：
      - code: Development Readiness ≠ formal acceptance
      - paragraph: 并引用：
      - code: Roadmap SOP QA Execution Prompt
      - paragraph: 作为方法来源。
      - separator
      - heading "18. Master Prompt 新增 execution state distinction" [level=1]
      - paragraph: 执行状态至少区分：
      - code: WS06A FULL ACCEPTANCE WS06A DEVELOPMENT READINESS WS03 SLICE CONTINUATION
      - paragraph: 禁止混写：
      - code: development ACCEPT → capability PASS
      - separator
      - heading "19. Master Prompt 的 HARD STOP 规则" [level=1]
      - paragraph: 必须包含：
      - code: "HARD STOP if: - governance amendment not independently accepted - readiness not independently accepted - readiness stale - source mismatch - full 47 unavailable - non-WebKit failure - new WebKit failure - current residual lacks dual-engine counterpart - new slice browser surface lacks evidence - prior slice continuation not accepted"
      - separator
      - heading "20. Master Prompt 保留 release hold" [level=1]
      - paragraph: 即使有限开发一路进行：
      - code: Safari proof = 0
      - paragraph: 时仍然：
      - code: WS06A FULL = BLOCKED WS03 formal Gate = OPEN 04A formal integration = BLOCKED 05 = BLOCKED 04B = BLOCKED 06B = BLOCKED 07 = BLOCKED 08 = BLOCKED release = BLOCKED
      - paragraph: 不得由 Master Prompt自行“根据项目进度”解除。
      - separator
      - heading "21. Formal/release DAG 与 Development Lane 的最终表达" [level=1]
      - paragraph: 五文件应使用一致的关系：
      - code: "┌─ Development Readiness WS02 ACCEPTED ───┤ └─ WS06A FULL ACCEPT Development lane: Development Readiness ACCEPT ↓ one WS03 candidate ↓ new evidence ↓ independent continuation ↓ next WS03 candidate Formal lane: WS06A FULL ACCEPT ↓ formal WS03 Gate reconciliation ↓ 04A / 05 / 04B ↓ 06B ↓ 07 ↓ 08"
      - paragraph: 不是：
      - code: Development Readiness ↓ 替代 WS06A
      - separator
      - heading "22. Safari final reconciliation 必须同步进五文件适当位置" [level=1]
      - paragraph: 最终 source较稳定后：
      - code: 1. freeze exact current source/build 2. fresh full 47 3. current policy/control identity validation 4. real Safari evidence 5. verify:browser-closure 6. independent WS06A review 7. reconcile every provisional WS03 slice 8. rerun stale evidence 9. only then restore formal DAG
      - paragraph: 真实 Safari如果 FAIL：
      - code: WS06A remains BLOCKED affected slices become STALE repair product rerun relevant evidence
      - paragraph: 不能因为代码已经开发完就接受 P1 failure。
      - separator
      - heading "23. 本轮不签发 Development Readiness" [level=1]
      - paragraph: 这是 PLAN20 最关键的 STOP。
      - paragraph: 治理 amendment完成后，结果只能是：
      - code: GOVERNANCE AMENDMENT IMPLEMENTED
      - paragraph: 经过独立审查最多成为：
      - code: GOVERNANCE AMENDMENT ACCEPTED
      - paragraph: 但仍：
      - code: WS06A_DEVELOPMENT_READINESS = NOT_EVALUATED
      - paragraph: 不得在 iteration20顺手读取 iteration19 的：
      - code: 40 residual 80 counterpart
      - paragraph: 然后直接写：
      - code: ACCEPTED_FOR_BOUNDED_DEVELOPMENT
      - paragraph: 那必须是下一次独立 audit。
      - separator
      - heading "24. Saved actual PLAN" [level=1]
      - paragraph: 保存：
      - code: template/codex/prompts/v2.7-ws06a/ iteration20-development-readiness-governance-amendment-plan.md
      - paragraph: 里面保存：
      - code: 本 PLAN20 实际5-file scope preimage hashes forbidden scope validation steps STOP conditions
      - paragraph: actual PLAN属于 governance execution record，不计入5个被修改治理文件。
      - separator
      - heading "25. Execution metadata" [level=1]
      - paragraph: 允许：
      - code: template/codex/executions/v2.7-ws06a/iteration20/
      - paragraph: 保存：
      - code: preflight.json governance.diff governance-checks.json governance-checks.log integrity-check.json result.md
      - paragraph: 独立 review后可再增加：
      - code: chatgpt-independent-review.md
      - paragraph: 以及必要截图。
      - paragraph: 这些只作为：
      - code: execution / review metadata
      - paragraph: 不得承载五治理文件中不存在的新规则。
      - separator
      - heading "26. Preflight" [level=1]
      - paragraph: 编辑前必须保存5个文件的 exact preimage：
      - code: path sha256 mode symlink status
      - paragraph: 并重新核验关键冻结输入：
      - code: Canonical Contract SHA 41 Registry IDs Roadmap current hash Starter source identity matrix hash runner hash closure verifier hash iteration14 policy/control iteration17 raw evidence iteration19 5 accepted proposals iteration19 independent review
      - paragraph: 如果 iteration19 proposals/review 与接受时 bytes不一致：
      - code: STOP
      - separator
      - heading "27. Governance consistency checks" [level=1]
      - paragraph: 实施后做只读检查。
      - heading "C1 — exact5 diff" [level=2]
      - paragraph: 必须：
      - code: changed governance files = exactly 5
      - paragraph: 除 saved PLAN / execution metadata 外。
      - paragraph: 任何第6个治理/产品文件变化：
      - code: STOP
      - separator
      - heading "C2 — Contract / Registry invariant" [level=2]
      - paragraph: 重新验证：
      - code: Contract SHA = 1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c Registry IDs = 41
      - paragraph: 必须完全不变。
      - separator
      - heading "C3 — strict browser infrastructure invariant" [level=2]
      - paragraph: 哈希必须保持：
      - code: matrix runner core-browser evidence validator closure verifier package / lockfile
      - paragraph: 不变。
      - separator
      - heading "C4 — semantic scan" [level=2]
      - paragraph: 5个文件都必须一致表达：
      - code: Development Readiness != WS06A ACCEPT Development Readiness != Contract PASS cross-engine != Safari residual != PASS allowlist new failure = STOP source change = STALE first lane = WS03 only one slice at a time Safari/release hold preserved
      - separator
      - heading "C5 — unsafe wording scan" [level=2]
      - paragraph: 不得出现任何未否定语境下的：
      - code: 37/10 accepted as PASS WebKit treated as PASS Safari optional Safari waived 2/3 browsers sufficient P1 waived WS03 Gate closed 04A unlocked 06B unlocked release eligible
      - separator
      - heading "28. Tests/builds 本轮处理" [level=1]
      - paragraph: 本轮没有产品代码/schema/runtime变化，所以：
      - code: npm run check product tests adopted build 47 browser matrix
      - paragraph:
        - strong: 不需要为了治理文档修改而重新执行。
      - paragraph: 正确记录：
      - code: "PRODUCT TESTS: NOT_RUN PRODUCT BUILD: NOT_RUN BROWSER MATRIX: NOT_RUN"
      - paragraph: 不得引用 iteration17 的 757 tests 当作 iteration20的新 PASS。
      - paragraph: 本轮只做：
      - code: governance consistency hash/integrity link/reference semantic boundary
      - paragraph: 检查。
      - separator
      - heading "29. Execution result 的正确状态" [level=1]
      - paragraph: Codex执行完成后：
      - code: "[C2C] STATE: EXECUTED TASK_ID: c2c_a765 ITERATION: 20 GOVERNANCE_DELTA: exactly5files PRODUCT_DELTA: 0 ACTIVE_GOVERNANCE: development lane text = candidate implemented READINESS: NOT_EVALUATED WS06A: BLOCKED SAFARI: 0 WS03_CODE: NOT_STARTED"
      - paragraph: 然后交 ChatGPT独立 review。
      - separator
      - heading "30. 独立 ACCEPT 后才真正“激活” amendment" [level=1]
      - paragraph: 只有 ChatGPT独立审查：
      - code: "VERDICT: ACCEPT"
      - paragraph: 以后，才能把这5个 governance changes视为当前有效流程。
      - paragraph: 但即便如此：
      - code: Development Readiness仍是 NOT_EVALUATED
      - paragraph: 下一动作才是：
      - code: current-source Development Readiness audit
      - paragraph: 而不是 WS03A代码。
      - separator
      - heading "31. 独立 ACCEPT 后允许的 progress index 更新" [level=1]
      - paragraph: 本轮执行前和 review前：
      - code: 三个 progress index全部不改
      - paragraph: 独立 ACCEPT 后允许只更新：
      - code: template/PROJECT_STATE.md template/README.md template/roadmap/V2.7_TASK_LEDGER.md
      - paragraph: 更新内容只能是状态/指针。
      - paragraph: 例如：
      - code: "Development Readiness governance amendment: ACCEPTED Review: template/codex/executions/v2.7-ws06a/iteration20/ chatgpt-independent-review.md Current readiness: NOT_EVALUATED WS06A: BLOCKED Next: current-source Development Readiness audit"
      - paragraph: 不得写：
      - code: WS03 authorized WS03 started WS06A accepted 3/8 closed AX PASS Safari waived
      - paragraph: 主 workstream关闭数仍然不因此增加。
      - separator
      - heading "32. Index 更新属于 post-review metadata" [level=1]
      - paragraph: 这3个 index更新：
      - code: 不计入 exact5 amendment scope
      - paragraph: 因为它们发生在：
      - code: independent ACCEPT之后
      - paragraph: 只记录已发生事实。
      - paragraph: 应单独保存：
      - code: post-review-index.diff closure-checks.json
      - paragraph: 用于证明没有把规则写进 index。
      - separator
      - heading "33. Rollback" [level=1]
      - paragraph: 编辑前保存5个 preimage。
      - paragraph: 若 amendment review REVISE：
      - paragraph: 只允许恢复本次5个文件，且：
      - code: current hash == iteration20 recorded postimage
      - paragraph: 时才能恢复。
      - paragraph: 禁止：
      - code: git reset --hard git checkout . git clean -fd
      - paragraph: 因为候选 repo中存在多轮已接受但未提交的变更。
      - paragraph: execution metadata和实际 PLAN保留历史，不删除失败证据。
      - separator
      - heading "34. STOP CONDITIONS" [level=1]
      - paragraph: 遇到任一项立即停止：
      - code: 需要修改 Contract 需要修改 Registry 需要增加 capability ID 需要新增 readiness schema 需要产品 checker 需要修改 browser matrix/runner/closure 需要修改 Starter source 需要运行 WS03 code 需要签发 readiness 需要改变 40 residual历史证据 需要把 80 counterpart称为Safari证明 需要将 P0/P1做普通 exception 需要解锁04/05/06B/07/08 需要修改第6个治理文件
      - separator
      - heading "35. PLAN20 Exit Gate" [level=1]
      - paragraph: 只有以下全部成立，本轮才可提交 independent review：
      - code: "iteration20: governance_files_changed: 5 product_delta: 0 runtime_delta: 0 schema_delta: 0 package_delta: 0 ci_delta: 0 contract: sha_unchanged: true registry_ids: 41 browser_infrastructure: matrix_unchanged: true runner_unchanged: true closure_unchanged: true governance_semantics: formal_dag_preserved: true bounded_dev_lane_added: true first_lane_ws03_only: true one_slice_at_a_time: true readiness_is_non_capability: true readiness_is_not_ws06a_accept: true residual_exact_subset_required: true new_failure_stop: true dual_engine_current_pass_required: true source_change_makes_stale: true new_slice_surfaces_required: true release_hold: safari_required: true ws06a_blocked: true ws03_formal_gate_open: true ws06b_blocked: true ws07_blocked: true ws08_blocked: true capability_promotion: none current_state: readiness: NOT_EVALUATED ws03_code_started: false independent_review: required: true"
      - separator
      - heading "36. 本轮正确终点" [level=1]
      - paragraph: iteration20 即使执行和独立 review全部通过，也只得到：
      - code: "DEVELOPMENT READINESS GOVERNANCE: ACTIVE / ACCEPTED CURRENT SOURCE READINESS: NOT_EVALUATED WS06A: BLOCKED WS03: NO CODE STARTED"
      - paragraph: 然后才进入下一有限步骤：
      - code: Iteration21 Current-source Development Readiness Audit
      - paragraph: Iteration21才用当时真实 source重新核对：
      - code: 47/47 execution exact residual subset dual-engine counterparts identity/freshness cleanup policy/control
      - paragraph: 并独立决定是否签发：
      - code: ACCEPTED_FOR_BOUNDED_DEVELOPMENT
      - paragraph: 只有那个状态成立后，才可以另做 WS03A 实施计划。
    - paragraph: 这套 PLAN20 的关键是：**这一轮只让治理体系“承认这条有限开发通道存在”，不让任何代码因此提前获得通行证。**这样 amendment 本身和后面的 readiness 审计是两个独立控制点。
    - button "复制":
    - button "评价回复":
    - button "分享":
    - button "朗读":
    - button "重新生成回复":
    - button "更多操作":
    - generic: ChatGPT 可能会出错。请核查重要信息。
    - button "滚动到底部":
    - heading "最新一条回复" [level=4]
    - status
    - button "添加文件等内容":
    - textbox "询问 ChatGPT" [active]:
      - paragraph: 询问 ChatGPT
    - button "选择 ChatGPT 模型":
      - generic: 高
    - button "听写":
    - button "开始语音":
- status
- status: 回答已完成
- status
- status
- button "⋮⋮"
- button "⋮⋮"
- button "⋮⋮"
- button "⋮⋮"
```
