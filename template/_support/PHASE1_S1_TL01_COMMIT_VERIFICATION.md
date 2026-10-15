# PHASE 1 S1 TL-01 COMMIT VERIFICATION

执行日期：2026-10-01（Asia/Taipei）。任务仅为已审查 S1 的显式暂存、提交及来源核验；本次未修改实现代码。

## A. Verdict

PASS — PHASE 1 S1 TL-01 COMMITTED AND PROVENANCE RECORDED

流程偏差：完整任务存于附件，首次 shell 调用读取附件的 `cat` 先于 `pwd`；因此字面上的“FIRST COMMAND MUST BE pwd”未满足。此偏差已向用户披露，不能声称首命令顺序完全符合。读取附件及规则均为只读；显式提交门禁随后单独运行 `pwd`，再运行 `git rev-parse --show-toplevel`，两者与指定工作区精确一致。没有 auto-cd。任何暂存或提交前，全部工作区、来源、冻结输入、范围及技术检查已完成并通过。PASS 指提交、来源与技术核验结果；保留上述顺序偏差供独立核验。

## B. Candidate repository

`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`

`pwd` / Git top-level：精确匹配。origin 仍仅为本地冻结源路径。

## C. Branch

`phase1/core-safety-s1-tl01`；提交前后均一致，没有创建或重命名分支。

## D. Frozen source commit/tree

- Source: `/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.6.5`
- Commit: `29b25559cf2af859bca359c7f7fda686a4803c95`
- Tree: `0920c9de216ada5601f681d81e4345cf69fb65e8`
- Tag: `starter-v2.6.5`，解析至上述 commit。
- 候选提交前 HEAD/tree 同上。
- 提交前 index 空：`git diff --cached --exit-code` exit 0。

## E. S1 parent commit

`29b25559cf2af859bca359c7f7fda686a4803c95`

## F. S1 commit hash

`a691661b330896f81f28fcac855f0ef9cc1dfccb`

相对冻结源新增提交数：1。未 amend。

## G. S1 commit tree

`ca23ecfa36b6dcf5977fdd2ca3b348ab855aab01`

## H. Reviewed staged tree

S1_REVIEWED_STAGED_TREE = `ca23ecfa36b6dcf5977fdd2ca3b348ab855aab01`

通过 `git write-tree` 于提交前记录；记录后未修改候选内容或 index，直接执行指定 commit。

## I. Commit tree == reviewed staged tree?

YES — 精确一致。提交后以 `git rev-parse 'HEAD^{tree}'` 核验。

## J. Staged patch SHA-256

S1_STAGED_PATCH_SHA256 = `92f597c20ce1ac54088bf90d4bc2c5dd9dfe7ab79c8de3ecf0854a6bceb6f25a`

对提交前 `git diff --cached --binary HEAD` 的完整原始输出字节计算 SHA-256；共 44483 bytes。提交后 `git diff --binary HEAD^ HEAD` 的 SHA-256 与之精确一致。

## K. Exact 20-file committed path list

以下 20 个路径同时等于：提交前 reviewed working-tree 集合、暂存集合、提交差异集合。无缺失、无额外路径。

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

## L. Added / Modified / Deleted classification

| Classification | Path |
| --- | --- |
| Modified | `scripts/validate-site.ts` |
| Modified | `src/components/LegalPage.astro` |
| Modified | `src/core/catalog.ts` |
| Added | `src/core/legal-safety.ts` |
| Modified | `src/core/site-data.ts` |
| Modified | `src/core/site-validation.ts` |
| Modified | `src/core/static-page-copy.ts` |
| Added | `src/data/legal-content.ts` |
| Modified | `src/data/page-inventory.json` |
| Modified | `src/data/schemas/page-inventory.ts` |
| Deleted | `src/pages/privacy.astro` |
| Added | `src/pages/privacy/[...path].astro` |
| Deleted | `src/pages/terms.astro` |
| Added | `src/pages/terms/[...path].astro` |
| Modified | `tests/catalog.test.ts` |
| Added | `tests/legal-safety.test.ts` |
| Modified | `tests/output-reconciliation.test.ts` |
| Modified | `tests/site-data.test.ts` |
| Modified | `tests/site-validation.test.ts` |
| Modified | `tests/static-page-copy.test.ts` |

合计：13 Modified / 5 Added / 2 Deleted；20 paths，600 insertions / 46 deletions。

显式使用 `git add --` 后逐个列出上述 20 个路径，包含删除的路径。未使用 `git add .`、`git add -A`、`git add -u` 或 `git commit -a`。

暂存后核验：

- `git diff --cached --name-status` 和 `--name-only`：精确 20 路径及预期分类。
- `git diff --cached --check`：PASS，exit 0。
- `git diff --exit-code`：exit 0，无剩余未暂存 tracked diff。
- `git ls-files --others --exclude-standard`：空，无未跟踪候选文件。

## M. Commit message

`feat: implement TL-01 legal projection safety`

提交命令：`git commit -m 'feat: implement TL-01 legal projection safety'`，exit 0。提交后 `git log -1 --format=%s` 精确匹配。

## N. Pre-commit test/check/validate/build results

初始进程 Node 为 v22.16.0。读取既有冻结证据后，核实本机已安装的 `/Users/randyz/.nvm/versions/node/v22.22.0/bin`；以此路径优先的 PATH 运行全部 npm 检查。没有安装或升级依赖。

| Check | Result |
| --- | --- |
| Pinned `node --version` | v22.22.0 |
| `git diff --check` | PASS，exit 0 |
| `npm run check` | PASS，exit 0 |
| Astro diagnostics | 131 files；0 errors / 0 warnings / 0 hints |
| Full Vitest | 39 test files；567/567 tests PASS，无 skipped |
| `npm run validate` | PASS，exit 0；6 enabled pages / 1 content entry |
| `npm run build` | PASS，exit 0；canonical final build |
| Static output reconciliation | PASS；6 inventory routes matched |
| Pagefind | 4 indexed pages，1 language，271 words |
| Pagefind normalization / generated audit | PASS |
| Default privacy / terms routes | ABSENT |

`dist/privacy`、`dist/terms`、`dist/privacy.html`、`dist/terms.html` 均不存在。未激活法律内容。

content sync 出现原有 meta/news 空目录 glob-loader notices；Astro diagnostics 的 warning 数为 0。未为这些 notices 修改代码。

微修复的两个文件 SHA-256 与冻结 micro-fix evidence 完全匹配：

- src/core/legal-safety.ts：`75ffe35dde7bfa296153621906a74fec999df4a669d515472702bfbbd19095d9`
- tests/legal-safety.test.ts：`2919cb9fa54dd4b9868403233362249798d4d850f9e868d0d6cc6ec0b120327d`

## O. Post-commit working tree status

CLEAN — `git status --porcelain=v1` 为空，exit 0。

已分段读取并检查完整 `git diff HEAD^`：14 个实现/数据/路由路径及 6 个测试路径；全部属于授权 S1。已核验 `git diff --name-only HEAD^ HEAD` 精确等于 K 的 20 路径。

本次没有修改实现；未 reset / restore / stash / clean / checkout / discard。报告在候选仓库之外，不进入 S1 commit。

## P. Frozen input checksums

全部于提交前和提交后实测，均精确匹配冻结值。未改写任何冻结文档或既有证据。

所有文件位于 `/Users/randyz/work/coding/hot_words_web/template/`。

| Frozen input | Filename | SHA-256 before = after |
| --- | --- | --- |
| Product Contract | `COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md` | `3fe0c98d7e98f963de37fd80b3f2dbe33a822b810a1f268ec4aaef8dad90682a` |
| Capability Baseline | `GAME_SITE_STARTER_V2.6.5_CAPABILITY_GAP_AUDIT_V0.2.md` | `094d5980af15fffbf841a9001f8260b8745db22b721b876ad916dd1f919cf985` |
| Core Safety Contract | `CORE_SAFETY_CONTRACT_DESIGN_V0.1.md` | `7fc4ccddc9522ce179005c29729a39e5efb09b5e522fef0ed83b26cd3b0d887c` |
| Implementation Plan | `PHASE1_CORE_SAFETY_IMPLEMENTATION_CANDIDATE_PLAN_V0.1.md` | `60a0c5f2c4432d5102378200f167c1d901caec26ba218167a473c3446760a32e` |
| Candidate Creation Verification | `PHASE1_CORE_SAFETY_CANDIDATE_CREATION_VERIFICATION.md` | `85ed263f2345154e52bfbc607abb3602f099c7e81fc4cf8607654b6f484b179c` |
| S1 Implementation Evidence | `PHASE1_S1_TL01_IMPLEMENTATION_EVIDENCE.md` | `bd57a306c8e61c0133918835535d59adf713d23252d8d23470cee5aac991135a` |
| S1 Micro-Fix Evidence | `PHASE1_S1_TL01_MICROFIX_EVIDENCE.md` | `6f0484e2cd50f4ead9d9f7adf0d8b8b4f0f98d485ce3ee16d8443ae00ddef519` |

## Q. Frozen source status

CLEAN — 提交前后 `git status --porcelain=v1 --untracked-files=all` 均为空。

HEAD/tree/tag target 均保持 D 的冻结值；origin 仍为该本地源仓库。候选 tag 集合保持 starter-v2.6.2、starter-v2.6.3、starter-v2.6.4、starter-v2.6.5。

## R. Push performed?

NO。无 push / fetch / pull / remote creation。

## S. Tag created?

NO。无新 tag、release version 或 branch。

## T. S2 started?

NO。S2 / S3 / S4 均未触及。未修改 TL-02、SEO identity、Organization/Person、author/publisher、媒体 README、CI、baseline、contracts；未安装 Playwright。无 merge / rebase。

本次唯一新外部文件：`/Users/randyz/work/coding/hot_words_web/template/PHASE1_S1_TL01_COMMIT_VERIFICATION.md`。报告完成并记录 SHA-256 后停止。

## U. Exact Next Step

Independent verification of the S1 TL-01 commit provenance and committed tree before S2 authorization.

