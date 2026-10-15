# S1 TL-01 FINAL PROVENANCE VERIFICATION

核验日期：2026-10-01（Asia/Taipei）。范围：只读核验提交来源及状态，仅创建本外部报告。

## Verdict

PASS — S1 TL-01 COMMIT PROVENANCE VERIFIED

## Candidate repository

`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`

`pwd` 输出与指定工作区精确一致。

## Branch

`phase1/core-safety-s1-tl01`

## S1 commit

`a691661b330896f81f28fcac855f0ef9cc1dfccb`

Commit subject: `feat: implement TL-01 legal projection safety`

## Parent commit

`29b25559cf2af859bca359c7f7fda686a4803c95`

与指定 frozen parent 及冻结源 HEAD 精确一致。

## Commit tree

S1_COMMIT_TREE = `ca23ecfa36b6dcf5977fdd2ca3b348ab855aab01`

实测 `git rev-parse 'HEAD^{tree}'` 与既有证据报告的 S1 commit tree、S1_REVIEWED_STAGED_TREE 精确一致。Reviewed staged tree 为既有报告记录，本次未重建或改动 index。

## Exact committed files

`git diff --name-only HEAD^ HEAD` 返回恰好 **20 个路径**，逐项与既有证据报告 K 节的 20 路径集合比对，无缺失、无额外文件。

- `scripts/validate-site.ts`
- `src/components/LegalPage.astro`
- `src/core/catalog.ts`
- `src/core/legal-safety.ts`
- `src/core/site-data.ts`
- `src/core/site-validation.ts`
- `src/core/static-page-copy.ts`
- `src/data/legal-content.ts`
- `src/data/page-inventory.json`
- `src/data/schemas/page-inventory.ts`
- `src/pages/privacy.astro`
- `src/pages/privacy/[...path].astro`
- `src/pages/terms.astro`
- `src/pages/terms/[...path].astro`
- `tests/catalog.test.ts`
- `tests/legal-safety.test.ts`
- `tests/output-reconciliation.test.ts`
- `tests/site-data.test.ts`
- `tests/site-validation.test.ts`
- `tests/static-page-copy.test.ts`

## Frozen source verification

Repository: `/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.6.5`

- HEAD: `29b25559cf2af859bca359c7f7fda686a4803c95`，匹配预期。
- Tree: `0920c9de216ada5601f681d81e4345cf69fb65e8`，匹配预期。
- Working tree: CLEAN；`git status --porcelain=v1` 输出为空，exit 0。

## Evidence report checksum

File: `/Users/randyz/work/coding/hot_words_web/template/PHASE1_S1_TL01_COMMIT_VERIFICATION.md`

SHA-256: `b6e52ffec36415dab1cf117594b6d62467509d67c39512659338acc8a7a1fad6`

通过 `shasum -a 256` 实测，exit 0；报告可读取，所列提交、tree 和精确文件集合与本次检查一致。用户未提供预期 checksum，本项记录当前文件校验和，不声称与独立冻结校验值比对。

既有报告披露此前提交任务的首次命令顺序偏差。本次 PASS 仅针对当前提交来源核验，不撤销该披露，也不认定此前所有流程步骤完全合规。

## Working tree status

Candidate: CLEAN；`git status --porcelain=v1` 输出为空，exit 0。

Frozen source: CLEAN；同一命令输出为空，exit 0。

本次未修改源码、测试、配置或既有证据。唯一写入为候选仓库之外的本报告；未执行暂存、commit、tag、push 或其他 Git 写入操作。未运行构建或测试，本次范围仅为 provenance verification。

## Push status

本次 push：NO。既有证据报告亦记录此前 push：NO。

本地远端跟踪记录：

```text
refs/remotes/origin/HEAD 29b25559cf2af859bca359c7f7fda686a4803c95
refs/remotes/origin/main 29b25559cf2af859bca359c7f7fda686a4803c95
```

上述记录均指向 frozen parent，未显示 S1 commit。仅检查本地记录，未执行 fetch、pull 或远端查询；因此不声称独立验证了实时远端状态或历史上绝无 push。

## Tag status

本次创建 tag：NO。既有证据报告亦记录此前创建 tag：NO。

`git tag --points-at HEAD` 和 `git tag --contains HEAD` 均输出为空，exit 0；本地不存在指向或包含 S1 commit 的 tag。未查询远端 tag。

## S2 status

本次 S2：NOT STARTED。

本次 TL-02：NOT STARTED。

既有证据报告记录 S2 未开始。当前 HEAD 仍为指定 S1 commit，且工作区干净。本任务在本报告创建后停止，不继续 S2 或 TL-02。

## Verification results

| Check | Result |
| --- | --- |
| candidate pwd | PASS |
| candidate branch | PASS |
| candidate status | PASS |
| candidate HEAD | PASS |
| candidate parent | PASS |
| candidate subject | PASS |
| frozen HEAD | PASS |
| frozen tree | PASS |
| frozen status | PASS |
| exact committed scope | PASS |
| commit tree consistency | PASS |
| evidence readable and SHA-256 recorded | PASS |
| local tags at/containing S1 | PASS |
| remote tracking refs readable | PASS |

本次列出的 Git 核验及证据读取命令均 exit 0；额外 `rg --files --hidden -g AGENTS.md -g '!node_modules' -g '!.git'` 返回 exit 1、无输出，表示未找到仓库内 AGENTS.md，使用用户提供的规则。

