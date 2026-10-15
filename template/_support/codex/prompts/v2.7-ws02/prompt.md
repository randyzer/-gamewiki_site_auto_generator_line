ChatGPT 说：

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 10
WORKSTREAM: WS-02 — Stable Core continuity + adopted final build + CI
PLAN_STATUS: AUTHORIZED FOR CODEX EXECUTION
EXECUTOR: Codex
INDEPENDENT_REVIEWER: ChatGPT
WS-03 / A4 / browser dependencies / commit / push / tag / merge / release: NOT AUTHORIZED

我已经重新读取了 WS-02 Roadmap、WS-01 ACCEPT/verification/provenance、两个已接受的 SOP/Prompt Candidate，以及 Starter b067e8d... 当前实际脚本、CI、PP-02、build/evidence、neutral fixture 和回归测试。

这次 WS-02 的核心不是改 Core 功能，而是解决一个已经确认的矛盾：

纯文本
当前 Starter 默认仓库
= 故意保留 Game Atlas 示例
= PP-02 要求 final validate/build 失败

但当前 CI
= npm run check
+ npm run build

所以：
CI 的 final build 路径与 PP-02 adoption contract 相冲突

正确修复不能是放宽 PP-02，而应形成两个同时成立的 CI 事实：

纯文本
未经采用的 shipped template
→ final 必须明确因为 PP-02 失败

中立、完整采用后的 disposable fixture
→ npm run validate
→ npm run check
→ npm run build
→ 全部 PASS

并且继续保持：

纯文本
build:evidence != final
synthetic fixture != real-game approval
A3 AX-01 != browser PROVEN
1. Preflight：任何产品修改前先冻结准确身份
Starter

Codex 先验证：

纯文本
repo:
Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE

branch:
phase-a/core-safety

HEAD:
b067e8d4050478072f25a1dc78a8526cdd128cfd

tree:
1df0ade30b1eaf51a76820c8d8b83337786f0dc1

working tree:
CLEAN

同时验证：

v2.7/evolution 尚不存在；
如果已经存在，STOP，不得 force/delete/repoint；
package.json 当前没有 browser dependency；
package-lock.json 中无 Playwright；
npm run check 当前 fresh PASS；
当前默认 npm run validate 的失败原因包含 PP-02，不是其它随机故障。

Fresh baseline 应重新执行，不直接拿历史 653 PASS 当新证据。

只有以上通过后：

Bash
git switch -c v2.7/evolution b067e8d4050478072f25a1dc78a8526cdd128cfd

不得 commit。

SOP Candidate

核对：

纯文本
Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE
branch = v2.7/normative-foundation
HEAD = 9a13b731...

它允许存在的 working-tree delta 必须精确等于 WS-01 已 ACCEPT snapshot。

任何额外未知修改：

纯文本
STOP
Master Prompt Candidate

同理：

纯文本
Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE
branch = v2.7/normative-foundation
HEAD = f655a0e0...

working tree 必须与 WS-01 accepted provenance 一致。

Canonical Contract

必须保持：

纯文本
docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md

SHA-256 =
1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c

WS-02 不得修改 41 IDs、Contract 或 Capability Registry。

2. Starter：准确文件修改范围

本轮 Starter 不改：

纯文本
src/**
game.config.ts
src/data/page-inventory.json
A1/A2/A3 production implementation
schema
runtime components
SEO implementation
ads implementation
Pagefind implementation

也就是说，这轮应主要是：

developer tooling + CI + tests + adoption documentation

建议批准的 Starter product delta 如下。

文件	操作	WS-02 精确责任
package.json	MODIFY	增加两个明确的 dev verification scripts
.github/workflows/ci.yml	MODIFY	将错误的默认 npm run build 路径改成双 adoption gate
scripts/verify-adoption.ts	ADD	单一入口验证 unadopted fail + adopted neutral PASS
tests/helpers/core-build-fixture.ts	MODIFY	复用现有 Field Notes adoption，并增加 full-project disposable fixture
tests/core-safety-sentinels.test.ts	MODIFY	保持默认 repo PP-02 fail，并让 neutral fixture 的 npm run check 验证采用后状态而不是跳过测试
tests/residue-build.test.ts	MODIFY	把故意注入的 Game Atlas 负例从“当前 game.config”解耦，保证 adopted full-project check 后仍真实测试 PP-02
tests/runtime-contract.test.ts	MODIFY	固定新的 CI 双路径与 Node contract
tests/release-identity.test.ts	MODIFY	记录 WS-02 development provenance，但不得把它写成 V2.7 release
README.md	MODIFY	增加 V2.7 WS-02 development/adoption CI 说明，保留历史发布 provenance
docs/PP02_PRODUCTION_RESIDUE.md	MODIFY	定义双路径 CI/adoption contract
docs/QA_CHECKLIST.md	MODIFY	adoption smoke 与 CI 证据同步

预计 Starter product files：11 个。

如实际实现发现需要其它 Starter 文件，Codex 必须 STOP，而不是顺手扩展。

3. 两个新 package scripts

这两个命令当前不存在。Codex先实现脚本，再允许 SOP/Prompt 引用它们。

在 package.json 增加：

JSON
"verify:unadopted-final": "tsx scripts/verify-adoption.ts unadopted",
"verify:adopted-final": "tsx scripts/verify-adoption.ts adopted"

不得：

加 dependencies；
加 devDependencies；
改 package manager；
改 Node version；
改 package version；
改 build / build:evidence 本身。

因此正常情况下：

纯文本
package-lock.json must remain byte-identical

如果 lockfile 变化：

纯文本
STOP + investigate
4. verify:unadopted-final 的行为

不能在 canonical working tree 直接制造 dist。

创建 disposable 完整项目副本，保持原 shipped Game Atlas 示例不变，然后执行：

纯文本
npm run validate
npm run build

两者必须：

纯文本
non-zero
AND
failure evidence contains PP-02

Meta verifier 本身才返回：

纯文本
exit 0

即：

纯文本
npm run verify:unadopted-final = PASS

含义是：

“我们成功证明 unadopted template 被 final gate 拒绝。”

绝不能解释成：

“unadopted site build PASS”。

如果：

validate/build 意外成功；
失败但完全不是 PP-02；

则 verifier 必须失败。

5. verify:adopted-final：复用现有 Field Notes neutral fixture

不要创造第二套 neutral identity。

继续复用现有：

纯文本
brand = Field Notes
shortName = Field
mark = FN
site = https://field-notes.example
social = @fieldnotes

以及当前 helper 已有的：

enabled inventory title/description/source replacement；
Getting Started neutral content；
About neutral copy；
logo accessible name replacement。
与现有 createCoreBuildFixture() 的区别

现有 fixture 只复制：

纯文本
src
public
scripts
configs
package files

它适合 isolated build tests，但不够执行：

纯文本
npm run check

WS-02 增加 full-project disposable fixture：

包括：

纯文本
src/
public/
scripts/
tests/
docs/
.github/
package.json
package-lock.json
astro.config.ts
tsconfig.json
vitest.config.ts
game.config.ts
README...

排除：

纯文本
.git
node_modules
dist
.astro*
.vite*
coverage
test-results
playwright-report
generated caches

然后：

symlink 当前已安装的 node_modules；
保持 Astro/Vite cache 位于 fixture 自己目录，不污染 canonical repo；
应用同一 Field Notes adoption mutation。

不得复制或安装浏览器。

6. Neutral adopted fixture 必须真实执行三个命令

严格按 Roadmap：

纯文本
npm run validate
npm run check
npm run build

全部 exit 0。

这里 npm run check 是真正的：

纯文本
astro check
+
vitest run

不是改成另一个“简化 check”。

一个必须解决的测试问题

当前：

纯文本
tests/core-safety-sentinels.test.ts

有测试：

shipped unadopted example must fail validation.

在 Field Notes adopted copy 中它不能还期待失败。

允许使用一个只影响测试断言、不影响任何 production validator的显式环境：

纯文本
STARTER_ADOPTION_FIXTURE=1

Neutral verifier 在运行 fixture npm run check 时设置它。

测试行为：

纯文本
canonical default repo:
  validate MUST fail PP-02

neutral adopted fixture:
  validate MUST PASS

禁止：

纯文本
it.skip
describe.skip
减少 suite
让 PP-02 scanner 读这个 env 并关闭检查

这个 env 只能控制测试期待值，不能进入：

纯文本
validate-site.ts
core-safety-sentinels.ts
audit-build.ts
runtime code

因此它不是 PP-02 bypass。

7. 修正 residue-build.test.ts 的 fixture dependency

当前其中一个重要测试通过：

纯文本
JSON.stringify(gameConfig)

重新注入 shipped Game Atlas branding。

在 adopted full project 中，gameConfig 已经变成 Field Notes，这个测试会失去负例。

WS-02 要把这个测试改成一个测试内显式 unadopted config fixture：

纯文本
Game Atlas
gameatlas.example
@gameatlas
sample SEO identity

它只用于触发 PP-02。

这样无论：

纯文本
canonical repo
或
neutral adopted full-project fixture

都能继续证明：

纯文本
final → blocks residue
evidence → only ordinary permitted sample warnings
setup/legal residue → still blocks

不能删掉该测试。

8. Adopted final build 额外必须验证

verify:adopted-final 在 npm run build 成功后还检查：

纯文本
dist/EVIDENCE_BUILD_NOT_FINAL.json
= ABSENT

并确认：

纯文本
privacy route = not emitted
terms route   = not emitted

因为 neutral fixture 没有真实项目法律批准。

这保全的是 War of Genesis 暴露出来的：

纯文本
TL-01:
draft legal must not become public route

同时 neutral fixture 不配置虚构 Organization/Person identity，继续让 TL-02 fail-safe 默认工作。

这只是安全负例/技术 fixture，不代表：

纯文本
War of Genesis accepted
Field Notes real business identity
legal approval
9. CI 的准确新流程

现有：

YAML
npm ci
npm run check
npm run build

后一个是错误的，因为仓库默认就是 intentionally unadopted。

改成：

纯文本
npm ci

npm run check

npm run verify:unadopted-final

npm run verify:adopted-final

对应三个事实：

纯文本
root technical/unit regression       PASS
unadopted final fail-closed           PASS
adopted neutral full final pipeline   PASS
tests/runtime-contract.test.ts

新增静态断言：

CI 必须包含：

纯文本
npm run check
npm run verify:unadopted-final
npm run verify:adopted-final

并且不能重新出现：

YAML
- run: npm run build

作为 shipped unadopted root 的直接 success gate。

真正 final build 已在：

纯文本
verify:adopted-final

内部执行。

10. 需要保全的现有回归集合

WS-02 不允许通过改测试来“制造绿灯”。

至少明确保留这些现有证据：

责任	现有主要证据
TL-01	tests/legal-safety.test.ts
TL-02	tests/core-safety-build.test.ts, SEO/identity tests
PP-02	core-safety-sentinels.test.ts, residue-build.test.ts
AX-01 implementation	navigation.test.ts, navigation-behavior.test.ts
final/evidence separation	evidence-build.test.ts
route/output truth	output-reconciliation.test.ts
SEO	seo.test.ts, HTML/output audit
Pagefind	pagefind-artifacts.test.ts
disabled ads zero-output	ads.test.ts
PP-01 / recovery	404/page/output tests
Node/CI contract	runtime-contract.test.ts
lifecycle/release identity	release-identity.test.ts

所有现有 test files 必须继续运行。

禁止减少：

纯文本
44 existing test files
653 historical tests

的新鲜回归覆盖。

新增断言后实际 test 数应：

纯文本
>= 653

且不得靠 skipped 测试达到 PASS。

11. Starter README / docs 的精确语义
README.md

不需要把历史 Git release provenance 重写掉。

增加一个明确区块：

纯文本
V2.7 WS-02 development lineage

记录：

纯文本
source = accepted A3 b067e8d...
branch = v2.7/evolution
canonical V2.7 Contract = SOP-owned exact identity

并明确：

纯文本
working-tree candidate != V2.7 release

默认 Game Atlas：

纯文本
is an intentionally unadopted example

推荐本地 Core verification：

纯文本
npm run check
npm run verify:unadopted-final
npm run verify:adopted-final

而真实项目仍然最终执行：

纯文本
npm run validate
npm run check
npm run build

不能用 synthetic Field Notes fixture 替代真实采用。

docs/PP02_PRODUCTION_RESIDUE.md

增加：

纯文本
Dual CI adoption contract

说明：

纯文本
unadopted failure is expected and asserted
!= ignored failure

neutral fixture PASS
!= project approval

并继续明确：

纯文本
build:evidence cannot satisfy canonical final
docs/QA_CHECKLIST.md

“Starter adoption smoke” 增加自动化双路径；

保留 manual real-project adoption/human QA。

不要删除浏览器检查，而是继续注明：

纯文本
AX-01 actual browser evidence belongs WS-06A
12. ALL_THREE 同步：SOP

Canonical Contract：

纯文本
NO CHANGE

只修改三个现有 SOP files。

文件	修改
docs/NEW_GAME_SITE_SOP_v2.7.md	增加 reusable-template final-readiness / dual CI 方法边界
docs/QA_CHECKLIST.md	增加 exact unadopted/adopted CI evidence 方法
docs/EXECUTION_PROMPT.md	在实际 Starter scripts 已存在后引用它们，并要求先确认命令确实存在

SOP 要写清：

纯文本
Starter template state
!= project final readiness

以及：

纯文本
expected PP-02 failure
= reusable Starter CI negative proof

not
= production project failure exemption

不得修改：

纯文本
COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md
CAPABILITY_EVIDENCE_TEMPLATE_V2.7.md
PACKAGE_MANIFEST file set
41 IDs

Canonical SHA 必须仍为：

纯文本
1ff2bd...
13. ALL_THREE 同步：Master Prompt

只修改：

纯文本
Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE/
CodexMasterPrompt_v2.7Candidate.md

不改：

纯文本
CONTRACT_REFERENCE.json

因为 canonical Contract 身份没有变化。

在 Phase 0 / QA execution policy 中增加：

先读取实际选中的 Starter package.json；
只有命令真实存在，才能运行：
纯文本
npm run verify:unadopted-final
npm run verify:adopted-final
如果命令不存在：
纯文本
HARD STOP

不得根据 Roadmap 猜命令。

verify:unadopted-final 的成功含义只是：
纯文本
expected PP-02 rejection correctly observed
verify:adopted-final 的成功只是：
纯文本
portable synthetic adoption pipeline PASS

不能变成：

纯文本
real-game PASS
human PASS
AX browser PASS
V2.7 release PASS
真正项目的：
纯文本
npm run build

依旧是 canonical final build。

14. WS-02 evidence：不污染 WS-01 baseline

不要修改：

纯文本
template/codex/executions/v2.7-ws01/
capability-evidence-baseline.json

它属于已关闭 WS-01。

新建：

纯文本
template/codex/prompts/v2.7-ws02/prompt.md

template/codex/executions/v2.7-ws02/
├── result.md
├── provenance.json
├── check.log
├── starter.diff
├── sop.diff
├── master-prompt.diff
├── rollback-manifest.json
└── preimages/

preimages/ 只保存本轮会修改、但目前属于未提交 WS-01 accepted working tree的 SOP/Prompt 文件原始字节。

Starter 不需要复制 preimage：它当前 clean，原文可从：

纯文本
b067e8d...

精确恢复。

provenance 必须记录

Starter：

纯文本
source branch
source HEAD/tree
created branch
current HEAD remains b067e8d...
tracked changes
untracked WS02 files
package.json hash
package-lock before/after hash

SOP/Prompt：

纯文本
WS01 accepted pre-hashes
WS02 post-hashes
exact WS02-only files

以及：

纯文本
canonical contract unchanged
no commits
no push
no tag
no merge
no browser dependency
no Starter src/** product implementation changes

Repo-scoped diff 必须包含 untracked 新文件内容，不能只保存普通 git diff。

15. Fresh execution sequence

Codex 完成修改后，至少执行：

纯文本
1. npm run check
2. npm run verify:unadopted-final
3. npm run verify:adopted-final
4. git diff --check

并验证：

纯文本
package-lock byte-identical

verify:adopted-final 内部必须提供三个真实子结果：

纯文本
validate = 0
check    = 0
build    = 0

而 unadopted：

纯文本
validate != 0, PP-02
build    != 0, PP-02
meta verifier = 0

此外静态检查：

纯文本
@playwright/test absent
playwright absent
browser dependency delta = 0
src/** delta = 0
canonical Contract delta = 0
16. WS-02 不能声称的东西

即使所有上述命令 PASS，也只能说明：

纯文本
Stable Core continuity implementation checkpoint
+
adoption/final CI contract works

不能写：

纯文本
AX-01 PROVEN
AX-03 PASS
GI/VF complete
real-game adoption PASS
REF-A/B/C PASS
War of Genesis PASS
Bomb Farm PASS
V2.7 release candidate

AX-01 browser evidence仍然：

纯文本
PENDING WS-06A

IA-03 在 WS-02 只能证明：

现有 search/Pagefind seam 没回归。

不能提前把 WS-03D 的完整 IA-03 义务写成 PASS。

17. STOP 条件

出现以下任一情况立即停止：

纯文本
Starter preflight not CLEAN
Starter HEAD/tree != accepted A3
v2.7/evolution already exists unexpectedly

SOP/Prompt working tree != accepted WS01 snapshot

canonical Contract changes
41 Registry rows change

package-lock changes
new dependency required
browser package appears

any src/** runtime modification becomes necessary

neutral adopted fixture requires disabling PP-02
neutral fixture requires skipping existing tests
neutral fixture check cannot pass without broad product refactor

default final failure is not specifically PP-02
adopted validate/check/build fails

A1/A2/A3 negative test must be weakened
evidence mode must be widened to make final work

scope reaches WS-03/A4/browser
real project/reference source changes

不要“先修到绿再解释”。

18. Rollback contract
Starter

因为源状态是 clean b067e8d...：

如果 WS-02 最终被 REJECT/BLOCKED，rollback 只能针对本计划文件：

tracked files恢复至 b067e8d...；
新增 scripts/verify-adoption.ts 只有在 hash 与 WS-02 provenance 完全一致时才可删除；
不使用 git reset --hard；
不使用 git clean -fd；
v2.7/evolution branch 不自动删除。
SOP / Prompt

它们含已 ACCEPT、尚未 commit 的 WS-01 工作。

所以绝对禁止：

纯文本
git reset --hard
git checkout .

rollback 必须仅用：

纯文本
template/codex/executions/v2.7-ws02/preimages/

恢复本轮碰过的 4 个文件，且恢复前核对 current hash 与 WS-02 provenance。

这样不会把 WS-01 一起抹掉。

19. WS-02 Exit Criteria

Codex 只有在下面全部满足后才能发送 STATE: EXECUTED：

YAML
WS02:

  starter_lineage:
    source_head: b067e8d4050478072f25a1dc78a8526cdd128cfd
    source_tree: 1df0ade30b1eaf51a76820c8d8b83337786f0dc1
    branch: v2.7/evolution
    commit_created: false

  stable_core:
    src_runtime_delta: NONE
    A1_A2_A3_weakened: false

  unadopted_contract:
    validate: EXPECTED_PP02_FAIL
    final_build: EXPECTED_PP02_FAIL
    verifier: PASS

  neutral_adoption:
    identity: Field Notes synthetic fixture
    validate: PASS
    check: PASS
    final_build: PASS
    evidence_marker: ABSENT
    legal_routes: ABSENT

  regression:
    existing_test_files_removed: 0
    skipped_to_pass: 0
    historical_653_coverage_reduced: false
    full_check: PASS

  CI:
    root_check: PRESENT
    expected_unadopted_gate: PRESENT
    adopted_final_gate: PRESENT
    raw_unadopted_build_success_gate: ABSENT

  triad:
    SOP_sync: COMPLETE
    Master_Prompt_sync: COMPLETE
    Starter_sync: COMPLETE
    canonical_contract_changed: false
    registry_changed: false

  dependencies:
    browser_dependencies: 0
    lockfile_delta: NONE

  prohibited:
    A4: NOT_STARTED
    WS03: NOT_STARTED
    real_adoption: NOT_STARTED
    commit: NONE
    push: NONE
    tag: NONE
    merge: NONE
    release: NONE

  independent_review:
    status: PENDING

完成后 Codex 停止，不开始 WS-06A 或 WS-03，并发送：

纯文本
[C2C]
STATE: EXECUTED
TASK_ID: c2c_a765
ITERATION: 10
WORKSTREAM: WS-02

我随后会通过 connector 独立读取实际 Starter/SOP/Prompt diff、untracked verifier、CI 和完整 execution output，再给 WS-02 ACCEPT / REVISE / BLOCKED。

Codex 现在可以按本 PLAN 执行 WS-02；除此之外没有新的实施授权。
