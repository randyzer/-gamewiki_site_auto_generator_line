ChatGPT 说：

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 11-CI-INPUT-AMENDMENT
WORKSTREAM: WS-06A
VERDICT: CONTINUE — NARROW CI CONTRACT-INPUT AMENDMENT AUTHORIZED

这个问题确认存在：当前 .github/workflows/ci.yml 把

纯文本
${{ github.workspace }}/../GAME_SOP_V2.7_CANDIDATE/...

作为 Contract 输入，但 standalone Starter checkout 并不会包含 sibling SOP candidate，因此该 CI 设计不可成立。

正确修复是：

Contract reference identity 与 本次实际 Contract-file verification 分离。

不复制 Contract、不复制 41 条规则、不虚构 CI 读到了 SOP 文件。

1. 两种 Contract binding mode

在现有 scripts/core-browser-evidence.ts 内定义唯一 Starter-side reference：

TypeScript
export const canonicalContractReference = {
  version: "2.7",
  owningArtifact: "GAME_SOP",
  canonicalPath: "docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md",
  sha256: "1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c",
} as const;

这只是规范身份引用，不是第二份 Registry。

不得加入：

纯文本
41 capability rows
Requirement text
Applicability
Severity
owners
§V / §W rules
2. Evidence schema 改为明确区分 reference 与 verification

当前：

纯文本
canonicalContract:
  version
  path
  sha256

改为类似：

纯文本
canonicalContract:
  reference:
    version
    owningArtifact
    canonicalPath
    sha256

  verification:
    mode: FILE_SHA256 | PINNED_REFERENCE
    filePath: string | null
    observedSha256: string | null
FILE_SHA256

含义：

纯文本
本次 runner 实际读取了一个 Contract 文件
+
其 SHA256 与 pinned canonical identity 完全相等

必须：

纯文本
filePath != null
observedSha256 == reference.sha256

这是本地 C2C / 独立验收使用的强模式。

PINNED_REFERENCE

含义仅为：

纯文本
本次 Core technical browser run
绑定到 Starter 源码中声明的 canonical identity reference

必须：

纯文本
filePath = null
observedSha256 = null

它不能声称：

纯文本
Contract file bytes verified
SOP candidate verified
triad compatibility verified
3. Mode 必须显式选择，绝不允许缺文件自动降级

环境变量：

纯文本
CORE_BROWSER_CONTRACT_MODE

只接受：

纯文本
FILE_SHA256
PINNED_REFERENCE

建议默认：

纯文本
FILE_SHA256

即本地原行为仍 fail-closed。

FILE_SHA256

允许：

纯文本
CORE_BROWSER_CONTRACT_PATH=<actual SOP Contract file>

如果没指定，可继续使用当前 workspace sibling 默认路径。

然后：

纯文本
file missing
hash mismatch
read failure
→ FAIL
PINNED_REFERENCE

明确不读取 Contract 文件。

并建议：

纯文本
PINNED_REFERENCE
+
CORE_BROWSER_CONTRACT_PATH 同时存在
→ FAIL

避免一个 run 同时声称两种输入方式。

最重要：

纯文本
FILE_SHA256 file missing

绝不能自动切到：

纯文本
PINNED_REFERENCE
4. Standalone GitHub CI 改法

删除当前假的 sibling path：

YAML
CORE_BROWSER_CONTRACT_PATH: ${{ github.workspace }}/../GAME_SOP...

改成：

YAML
- name: Verify Core browser evidence
  run: npm run check:browser
  env:
    CORE_BROWSER_CONTRACT_MODE: PINNED_REFERENCE

因此 Starter-only CI 的真实声明变成：

纯文本
Starter Core technical browser matrix
bound to pinned V2.7 Contract reference identity

而不是：

纯文本
real SOP Contract file independently verified

这是允许的。

5. 本次 WS-06A 的正式独立证据必须使用 FILE_SHA256

虽然 CI 可用 reference-only，本轮最终提交给我独立 review 的 47-row evidence 必须是强模式：

Bash
CORE_BROWSER_CONTRACT_MODE=FILE_SHA256 \
CORE_BROWSER_CONTRACT_PATH=<actual GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md> \
CORE_BROWSER_EVIDENCE_DIR=<ws06a execution folder> \
npm run check:browser

最终 evidence 必须显示：

纯文本
verification.mode = FILE_SHA256
observedSha256 =
1ff2bd01...

这样可以同时满足：

纯文本
standalone CI 可运行
+
本次 C2C WS-06A 验收真实核对了 SOP bytes
6. Validator 必须增加 mode 负例

仍在现有：

纯文本
tests/core-browser-evidence.test.ts

不新增文件。

增加至少这些 rejection cases：

情况	必须拒绝
canonical reference hash 被修改	FAIL
canonicalPath 被修改	FAIL
owningArtifact != GAME_SOP	FAIL
unknown verification mode	FAIL
FILE_SHA256 + filePath=null	FAIL
FILE_SHA256 + observedSha=null	FAIL
FILE_SHA256 + observedSha != reference hash	FAIL
PINNED_REFERENCE + observedSha 非 null	FAIL
PINNED_REFERENCE + filePath 非 null	FAIL

正例至少：

纯文本
FILE_SHA256 + exact observed hash
PINNED_REFERENCE + null/null

但 synthetic validator fixture 仍只是 unit fixture，不是 browser evidence。

7. Runner 的 fail-closed 行为

run-core-browser-evidence.ts preflight 改成：

纯文本
read mode
↓
FILE_SHA256?
  → resolve actual path
  → read bytes
  → hash
  → exact match
  → evidence records FILE_SHA256

PINNED_REFERENCE?
  → do not touch filesystem Contract path
  → evidence records PINNED_REFERENCE/null/null

如果 mode 非法：

纯文本
FAIL before browser execution

如果 FILE 模式 hash mismatch：

纯文本
FAIL before browser execution

依然要生成 failure evidence / NOT_RUN rows。

8. 文档必须明确证据强度差异

修改已经在 15-file scope 内的：

纯文本
docs/CORE_BROWSER_EVIDENCE.md

把当前：

“Starter-only CI checkout must provision the same SOP input”

删除。

改成：

纯文本
Local audited/C2C run:
  FILE_SHA256
  → actual canonical SOP bytes independently checked

Standalone Starter CI:
  PINNED_REFERENCE
  → exact canonical identity reference only
  → no claim that SOP bytes were present or verified

并明确：

纯文本
PINNED_REFERENCE PASS
!= triad compatibility PASS
!= Contract-file verification PASS
9. SOP / Prompt sync 同样区分两个层次

仍只使用原计划中的 3 SOP + 1 Prompt 文件，不新增 product file。

SOP

写清：

纯文本
Core technical CI can use PINNED_REFERENCE

但：

纯文本
independent V2.7 acceptance requiring cross-artifact identity
must use FILE_SHA256 or equivalent real-artifact verification
Master Prompt

必须要求执行者先看 evidence mode。

禁止：

纯文本
PINNED_REFERENCE
→ 宣称 SOP verified

如果阶段要求 triad/Contract byte verification，而证据只有 reference-only：

纯文本
HARD STOP / evidence insufficient
10. CI 与 capability claim 边界

CI 的 browser step成功最多证明：

纯文本
Core browser technical matrix PASS
against the Starter-pinned canonical identity reference

不能提升：

纯文本
SOP bytes verified
triad synchronized
AX-02 full PASS
AX-03 assembled PASS
PA-01 PASS
release PASS

本轮独立 review 则会看：

纯文本
CI definition = PINNED_REFERENCE
+
C2C audited run = FILE_SHA256

二者各司其职。

11. 不增加第 16 个 product file

此次 amendment 只允许修改已经在原 15-file scope 中的文件，主要是：

纯文本
scripts/core-browser-evidence.ts
scripts/run-core-browser-evidence.ts
tests/core-browser-evidence.test.ts
.github/workflows/ci.yml
docs/CORE_BROWSER_EVIDENCE.md

以及原本尚待完成的：

纯文本
3 SOP files
1 Master Prompt file

仍然总计不超过原 15 个 product files。

不允许新增：

纯文本
CONTRACT_REFERENCE copy
contract.json
vendored SOP file
CI artifact downloader
remote repo checkout
12. 本 amendment 的验证要求

在继续 47-row browser run 前：

纯文本
npm run check

必须通过新增 mode validator tests。

然后至少验证 runner preflight：

纯文本
invalid mode → FAIL

FILE_SHA256 + bad/missing path → FAIL

FILE_SHA256 + actual accepted Contract → proceeds

PINNED_REFERENCE → does not access Contract path

最后正式 C2C browser evidence只跑一次强模式：

纯文本
FILE_SHA256
47/47 required

不要求为了模拟 GitHub CI 再完整跑第二遍 47 cases。

PINNED_REFERENCE 的 CI 输入行为用 unit/preflight tests证明即可；真正远端 GitHub Actions 仍因无 commit/push 而不能声称已运行。

当前状态
YAML
WS06A_CI_INPUT_AMENDMENT:
  standalone_ci_problem: CONFIRMED

  design:
    FILE_SHA256:
      actual_contract_bytes_verified: true

    PINNED_REFERENCE:
      actual_contract_bytes_verified: false
      technical_core_ci_allowed: true

  silent_fallback: FORBIDDEN
  contract_copy_into_starter: FORBIDDEN
  registry_duplication: FORBIDDEN
  remote_sop_provisioning_invented: false

  product_file_scope:
    unchanged: true
    max_files: 15

  runtime_src_change:
    authorized: false

  continue_execution:
    authorized: true

Codex 可以按此 amendment 继续 WS-06A。 最终交给我验收的真实 browser evidence必须是 FILE_SHA256 模式；standalone CI 则明确使用 PINNED_REFERENCE，两者不得混称。
