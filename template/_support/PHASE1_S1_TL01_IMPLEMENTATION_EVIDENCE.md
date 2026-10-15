# Phase 1 S1 TL-01 Implementation Evidence

执行日期：2026-10-01，Asia/Taipei。仅实施已授权的 S1；没有开始 S2、S3、S4 或 Phase 2。

## A. Verdict

PASS — PHASE 1 S1 TL-01 IMPLEMENTATION COMPLETE

此结果是候选实施证据，尚需独立审查；不提升 TL-01 baseline 为 PROVEN，不代表 Phase 1 完成或候选可发布，不自动授权 S2。

## B. Candidate repository

`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`

`pwd` 和 `git rev-parse --show-toplevel` 均返回这个精确路径；没有 auto-cd。

## C. Branch

`phase1/core-safety-s1-tl01`

从已核验的 detached HEAD 执行 `git switch -c phase1/core-safety-s1-tl01`。创建后再次确认分支名、原 HEAD 和 clean working tree。最终只有这一个本地分支。

## D. Frozen source commit/tree

- Commit: `29b25559cf2af859bca359c7f7fda686a4803c95`
- Tree: `0920c9de216ada5601f681d81e4345cf69fb65e8`
- Tag: `starter-v2.6.5`，仍指向上述 commit。
- Candidate origin: `/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.6.5`。

## E. Pre-implementation candidate state

| Gate | 实测结果 |
| --- | --- |
| Workspace / Git top-level | EXACT MATCH |
| HEAD / tree | 与冻结值一致 |
| `git status --porcelain=v1` | 空，exit 0 |
| `git symbolic-ref -q HEAD` | 空，exit 1；detached 的预期结果 |
| `git diff --exit-code 29b25559cf2af859bca359c7f7fda686a4803c95 HEAD` | 空，exit 0 |
| Origin | 与指定源仓库路径一致 |
| 五份冻结文档 checksum | 实施前、最终均与预期一致 |

流程记录：由于完整任务位于附件，首次 shell 调用先读取了附件和 using-superpowers 技能，之后才获知“首条命令必须为 pwd”。这是字面首命令顺序的偏差；附件读取和技能读取均只读。第一个工作区检查命令是 `pwd`，随后单独执行 Git top-level 核验；任何分支或源码修改前，全部启动门禁均已通过。本报告保留此偏差供独立审查。

环境：`.nvmrc` 为 `22.22.0`，package engine 为 `>=22.19.0 <23`。初始进程为 Node `v22.16.0` / npm `10.9.2`，本机已有 `/Users/randyz/.nvm/versions/node/v22.22.0/bin`。使用该目录优先的 PATH 后，`command -v` 和版本复核为 Node `v22.22.0` / npm `10.9.4`。所有 npm 命令均在此 PATH 下执行。

`node_modules` 原不存在，已执行现有锁文件的 `npm ci`：exit 0，安装 397 packages。安装后 Git porcelain 为空，package.json / package-lock.json 无变化。npm 的既有依赖审计报告 5 个 high severity vulnerabilities；没有执行 audit fix 或改动依赖。

## F. Files changed

以下路径均相对 B 的候选根目录，仅 13 个已有文件被修改：

- `scripts/validate-site.ts`
- `src/components/LegalPage.astro`
- `src/core/catalog.ts`
- `src/core/site-data.ts`
- `src/core/site-validation.ts`
- `src/core/static-page-copy.ts`
- `src/data/page-inventory.json`
- `src/data/schemas/page-inventory.ts`
- `tests/catalog.test.ts`
- `tests/output-reconciliation.test.ts`
- `tests/site-data.test.ts`
- `tests/site-validation.test.ts`
- `tests/static-page-copy.test.ts`

## G. Files added

候选内 5 个新文件：

- `src/core/legal-safety.ts`（99 行）
- `src/data/legal-content.ts`（4 行）
- `src/pages/privacy/[...path].astro`（19 行）
- `src/pages/terms/[...path].astro`（19 行）
- `tests/legal-safety.test.ts`（276 行）

候选外唯一新增报告就是本文件。未新增其他外部 evidence、provenance 或 release 文件。

## H. Files removed/migrated

- 删除 `src/pages/privacy.astro`，迁移至 `src/pages/privacy/[...path].astro`。
- 删除 `src/pages/terms.astro`，迁移至 `src/pages/terms/[...path].astro`。

两个旧固定文件均不存在。没有全局 catch-all、别名或第二套 route registry。

## I. TL-01 implementation summary

法律页面 capability 保留，缺省 unavailable。只有明确 active、有效批准摘要、真实且符合 shape 的内容、摘要匹配及兼容 inventory 状态，才进入现有 enabled catalog。非法 active 在 catalog 抛出明确错误；validator 汇总 legal 错误后继续汇总独立配置错误，不能静默隐藏失败。

默认 privacy/terms 保留 pageId、route、pageType、source provenance；变为 private / draft / content draft / noindex / needsReview=true / unavailable，并移除无实际发布的 publishedAt。developmentStatus=ready 仍描述已经实现的页面 capability，不能使 draft policy 发布。

没有编造 Privacy、Terms、operator、审查日期或法律充分性，也没有律师要求、CMS、数据库、approval 用户/历史、jurisdiction 规则或通用 approval engine。

## J. Legal activation model

严格 discriminated union，unknown state / 多余字段拒绝：

```ts
legalActivation?:
  | { state: "unavailable" }
  | { state: "active"; approvedContentSha256: string };
```

摘要必须是 64 个 lowercase hex 字符。省略 activation 等同 unavailable；非 legal 类型不得声明 activation。每个 legal pageType 至多一条 inventory 记录；route 必须匹配该 capability 原有 `/privacy/` 或 `/terms/`。

Unavailable 的 public + published 或 index flag 是错误。Active 要求 public、published、publishedAt 存在、contentStatus/developmentStatus=ready、needsReview=false、needsUpdate=false、有效非空内容与匹配摘要。保留已有 inventory uniqueness/date/metadata/capability/feature 验证。

## K. Digest contract actually implemented

`SHA-256` 对固定字段顺序的 JSON 字符串以 UTF-8 计算：

1. 实际 inventory policy `title`
2. `intro`
3. 有序 `sections` 数组；每项先 `heading`，后有序 `paragraphs`
4. `notice`；未提供固定为 `null`，明确空字符串与缺省不同

项目 payload 仅含 intro、sections、可选 notice，严格拒绝额外字段；intro/heading/paragraph 必须是非空白 string，sections/paragraphs 非空。判断非空时使用 trim，但保留原文；规范化仅把 CRLF/CR 转 LF，不折叠空格、case、标点、Unicode 或数组顺序。固定构造顺序不依赖输入 object insertion order。

Renderer 与 validation 都使用同一个规范化 resolved payload。title、intro、heading、paragraph、顺序、notice 变更使旧 approval stale。updatedAt、publishedAt、description、route/canonical、activation/hash 自身、chrome、导航/Footer、build time 不进入 digest。技术 timestamp-only 变更保持批准有效。

`computeLegalContentSha256` 仅计算摘要，不写配置；build 没有自动批准。项目必须显式提供 approvedContentSha256。合成 build fixture 由测试显式设置摘要，未改动 shipped 配置。

## L. Route migration

两个 optional handler 的 `getStaticPaths` 只读取 `enabledPageCatalog`，筛选自身 legal pageType，复核原有 route；unavailable 返回零路径，active 恰好输出原路径。真实构建测试验证 Privacy-only、Terms-only、both-active，未新增 alias。

LegalPage 按 pageType 读取批准 payload，About 继续读取原有 editorial copy。Policy notice 只输出 payload 中的文本；legal 页面不再从 updatedAt 生成 Last reviewed，不再输出 starter disclosure/conditions 或强制 operator action。保留 BaseLayout、canonical、JSON-LD、related、metadata/indexability 行为；没有改动 structured identity。

`static-page-copy.ts` 历史 legal 字符串保留在不可访问的内部数据中供未来边界工作参考；`getStaticPageCopy("privacy" | "terms")` 明确抛错，不再是任何 renderer 的 fallback。About 内容保持。

## M. Catalog / validation integration

权威链仍为 Runtime Page Inventory → enabled catalog → consumers。

- `resolveLegalPageSafety` 提供 TL-01 解析内容、eligibility 与错误。
- Catalog 在任何过滤前校验全部 legal entries；无内容上下文不能接受 active。
- Runtime site-data 和 validate-site 显式传入同一个 project legalContent。
- Validator 使用同一 helper 汇总错误，然后继续现有独立检查。非法 legal entries 被排除仅用于下游错误聚合，已经记录的 legal 错误不会消失。
- validate-site 的 always-fixed routes 仅 `/`、`/about/`、`/404.html`；privacy/terms 仍是支持的 pageType。
- related 按 enabled IDs 投影；显式 navigation 和 homepage 不可用目的地仍为错误。Runtime homepage resolver 也对缺失 enabled ID 抛错。

未放宽 exact reconciliation、unknown routes、navigation、content 或 feature/capability 检查。

## N. Consumer projection behavior

Footer、related、navigation、home、sitemap、search、SEO 与 output reconciliation 沿用同一 catalog；没有在每个消费者增加独立 privacy/terms activation 判断。

真实 active 构建证明：Footer 仅链接 active 页；related 仅链接 active 对方；actual intro/paragraph/notice 输出；canonical/JSON-LD 保留；active noindex 路由存在但无 Pagefind body 且不在 sitemap；index legal 计入 Pagefind 和 sitemap。构建的 Pagefind indexed count 与 `getSitemapRoutes(enabled)` 一致。

默认候选 build 实测：

- 6 个 HTML：home、About、404、guides hub、getting-started、search。
- privacy/terms HTML 均不存在。
- 所有上述 HTML 和 sitemap 无 legal href、legal canonical/schema URL 或默认 starter policy 正文。
- 直接解压现有 Pagefind fragment 只检查 URL 投影，取得 `/`、`/about/`、`/guides/`、`/guides/getting-started/`；没有 privacy/terms。这是 TL-01 输出核验，没有实现 S3 textual residue scanner。
- stale privacy/terms HTML 在 exact output reconciliation 中被明确拒绝。

## O. Focused test results

测试先行证据：实施前第一轮 4 文件有 9 个预期行为失败（23 通过）；第二轮 navigation/homepage 与迁移断言有 6 个失败（15 通过，含重复 stale 用例）。新增 helper 最初导入缺失；随后用最小测试 stub 建立可运行的 RED：62 个 legal unit cases 中 52 失败、10 通过，3 个 build cases 仅因该轮 `-t` 选择暂未执行。没有将此选择运行的 skipped 计为最终证据。

最终要求命令：

```sh
export PATH=/Users/randyz/.nvm/versions/node/v22.22.0/bin:$PATH
npm exec -- vitest run tests/legal-safety.test.ts tests/catalog.test.ts tests/site-data.test.ts tests/site-validation.test.ts tests/static-page-copy.test.ts tests/output-reconciliation.test.ts
```

Exit 0；6 文件 / 113 tests 全部 PASS，无 skipped。耗时 7.20s。

| 文件 | Test count |
| --- | ---: |
| legal-safety | 65（62 unit + 3 real static builds） |
| catalog | 15 |
| site-data | 9 |
| site-validation | 14 |
| static-page-copy | 3 |
| output-reconciliation | 7 |

覆盖所有要求的 28 类 S1 行为：省略、双 unavailable、仅 Privacy、仅 Terms、both、缺实际内容/摘要、wrong/stale、title/intro/heading/paragraph/section order、LF/Unicode、技术 timestamp、unavailable flags、needsReview、content/development、非 legal activation、active noindex、Footer/related、nav、stale HTML、About/home/404 与无默认 legal fallback。还覆盖 notice、paragraph order、needsUpdate、strict extra fields、hash lowercase/shape、route identity、重复 legal capability、key order、不自动写 approval。

未写 S2 identity、S3 residue engine 或 S4 browser tests。没有修改上述六个测试之外的现有测试。

## P. Full npm run check result

固定 Node PATH 下运行 `npm run check`，exit 0。

- Astro：131 files，0 errors / 0 warnings / 0 hints。
- Vitest：39 文件，562 tests 全部 PASS，无 skipped；9.07s。
- 原 frozen baseline 为 38 文件 / 485 tests；本次实际执行为 39 / 562，增加 77 cases，旧 legal draft fallback 两条断言有意替换成拒绝 fallback。

## Q. npm run validate result

固定 Node PATH 下运行 `npm run validate`，exit 0：`Site validation passed: 6 enabled pages, 1 content entries.`

## R. npm run build result

固定 Node PATH 下运行 canonical `npm run build`，exit 0。未使用 evidence mode 替代。

- Final validation PASS。
- Astro 6 pages built。
- Exact output reconciliation：6 inventory routes matched。
- Pagefind 1 language / 4 pages / 271 words。
- Pagefind normalization / generated output audit PASS。
- Normalized Pagefind payload：233929 B。
- Largest HTML 10603 B；page CSS reference 52338 B；page JS reference 189143 B。
- 无 evidence marker。没有为使构建通过编造任何 approved legal 内容。

## S. Existing regression observations

About/home/404、existing optional routes、navigation、SEO、content、media、evidence/final、Pagefind artifacts 与 exact output 现有测试全部通过。未削弱原断言或修改原 build orchestration。

Content sync 仍有原有 meta/news 空目录 WARN；Astro check diagnostics 本身为零。依赖审计的 5 high vulnerabilities 未改。样例 brand/domain、默认身份图和 `dist/media/README.md` 仍属于尚未授权的后续 S2/S3 目标；未为了 S1 提前修复。S1 PASS 不宣称解决这些目标或项目法律适用性。

## T. Scope check

| 项目 | 结果 |
| --- | --- |
| S2 touched? | NO；无 config identity、author/publisher、SEO/structured identity 实施 |
| S3 touched? | NO；无 sentinel/residue engine、shared neutral helper、README migration |
| S4 touched? | NO；无导航行为修改、browser config/tests/dependency/CI |
| New runtime dependencies | 0 |
| New dev dependencies | 0 |
| Architecture reopen required | NO |
| Stage / commit / push / tag / merge | 均未执行 |

## U. Git status

最终全部差异未暂存；index 无差异。Working tree 有意不 clean。

```text
 M scripts/validate-site.ts
 M src/components/LegalPage.astro
 M src/core/catalog.ts
 M src/core/site-data.ts
 M src/core/site-validation.ts
 M src/core/static-page-copy.ts
 M src/data/page-inventory.json
 M src/data/schemas/page-inventory.ts
 D src/pages/privacy.astro
 D src/pages/terms.astro
 M tests/catalog.test.ts
 M tests/output-reconciliation.test.ts
 M tests/site-data.test.ts
 M tests/site-validation.test.ts
 M tests/static-page-copy.test.ts
?? src/core/legal-safety.ts
?? src/data/legal-content.ts
?? src/pages/privacy/[...path].astro
?? src/pages/terms/[...path].astro
?? tests/legal-safety.test.ts
```

package.json / package-lock.json 未变，未修改 frozen source checkout、CI、Header/MobileNav/DesktopNav、SEO 或 version。

## V. Diff stat

`git diff --check` exit 0。

```text
 scripts/validate-site.ts            |  6 +++---
 src/components/LegalPage.astro      | 19 +++++++++++--------
 src/core/catalog.ts                 |  9 ++++++++-
 src/core/site-data.ts               | 16 ++++++++++++++--
 src/core/site-validation.ts         | 11 ++++++++++-
 src/core/static-page-copy.ts        |  5 ++++-
 src/data/page-inventory.json        | 16 ++++++++--------
 src/data/schemas/page-inventory.ts  | 27 +++++++++++++++++++++++++++
 src/pages/privacy.astro             |  8 --------
 src/pages/terms.astro               |  8 --------
 tests/catalog.test.ts               | 26 ++++++++++++++++++++++++++
 tests/output-reconciliation.test.ts | 23 +++++++++++++++++++++++
 tests/site-data.test.ts             | 12 ++++++++++++
 tests/site-validation.test.ts       | 14 ++++++++++++++
 tests/static-page-copy.test.ts      |  8 ++------
 15 files changed, 162 insertions(+), 46 deletions(-)
```

以上 Git stat 不包含未跟踪新文件；5 个新文件另有 417 行。完整候选变化为 20 个文件路径，579 insertions / 46 deletions，包含旧路由删除和新路由添加，未暂存以供独立审查。

## W. Candidate HEAD

最终 HEAD 仍为 `29b25559cf2af859bca359c7f7fda686a4803c95`，HEAD tree 仍为 `0920c9de216ada5601f681d81e4345cf69fb65e8`。实现仅位于未提交 working-tree diff。

最终冻结源仓库 HEAD/tree/tag target 同 D；porcelain 为空，CLEAN。五份外部冻结文件的 before/after SHA-256 均完全一致：

| Frozen input | SHA-256 before = after |
| --- | --- |
| COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md | `3fe0c98d7e98f963de37fd80b3f2dbe33a822b810a1f268ec4aaef8dad90682a` |
| GAME_SITE_STARTER_V2.6.5_CAPABILITY_GAP_AUDIT_V0.2.md | `094d5980af15fffbf841a9001f8260b8745db22b721b876ad916dd1f919cf985` |
| CORE_SAFETY_CONTRACT_DESIGN_V0.1.md | `7fc4ccddc9522ce179005c29729a39e5efb09b5e522fef0ed83b26cd3b0d887c` |
| PHASE1_CORE_SAFETY_IMPLEMENTATION_CANDIDATE_PLAN_V0.1.md | `60a0c5f2c4432d5102378200f167c1d901caec26ba218167a473c3446760a32e` |
| PHASE1_CORE_SAFETY_CANDIDATE_CREATION_VERIFICATION.md | `85ed263f2345154e52bfbc607abb3602f099c7e81fc4cf8607654b6f484b179c` |

## X. New commits?

NO。未提交、未 merge、未 push，未命名 release/version。

## Y. New tags?

NO。最终 tag set 仍仅 starter-v2.6.2、starter-v2.6.3、starter-v2.6.4、starter-v2.6.5。

## Z. Exact Next Step

Independent review of S1 TL-01 implementation and evidence before S2 authorization.
