> 2026-10-01 用户目标重确认：历史提案/快照，当前暂停。文中当时的状态和下一步不代表当前进度或执行授权。当前入口见 `template/PROJECT_STATE.md`；完成关系核对和目录清理后再重新建立蓝图与路线。

# PHASE1 S2 TL-02 Structured Identity Safety — Implementation Plan V0.1

> **For agentic workers:** 后续只有在用户另行授权实施后，才使用 `superpowers:executing-plans` 按任务执行。本文 checkbox 均为未来任务，不表示已执行，不授权分支、提交、推送或安装依赖。

**Goal:** 消除品牌到 Organization/Person 与 author/publisher 的自动身份推断，只允许经显式配置和机械校验的身份及独立角色进入结构化数据。

**Architecture:** 沿用现有 Zod 配置边界、SEO helpers、BaseLayout graph 拼装及 HTML audit。可选 identity 输入经单一纯 resolver 映射到本页受控身份节点与角色；渲染前和输出审计复用同一窄检查，保留原 SEO pipeline，不建立新 schema framework。

**Tech Stack:** 仓库现有 Astro/TypeScript/Zod/Vitest、Node 内置 `node:crypto`。本地 manifest 锁定 Astro `7.2.10`、Zod `4.5.4`、Vitest `4.1.11`；`.nvmrc` 为 `22.22.0`。不添加 runtime/dev dependency。

---

## 1. 状态、基线与本次权限

- 日期：2026-10-01，Asia/Taipei。
- 工作区：`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE`。
- S1 TL-01：**CLOSED**，不重开法律投影设计。
- S1 / 当前 HEAD：`a691661b330896f81f28fcac855f0ef9cc1dfccb`。
- 当前 commit tree：`ca23ecfa36b6dcf5977fdd2ca3b348ab855aab01`。
- 当前分支（只读观察）：`phase1/core-safety-s1-tl01`；本任务没有创建或切换分支。
- S1 parent / V2.6.5 baseline：`29b25559cf2af859bca359c7f7fda686a4803c95`。
- 规划前 `git status --porcelain=v1` 为空；源码中的身份路径仍为 V2.6.5 的自动生成逻辑。
- 本次仅读取仓库与既有规划依据，创建本文；未运行测试/构建，未修改源码、测试、配置、依赖、Git index 或任何既有文档。
- **S2 TL-02 IMPLEMENTATION: NOT STARTED。本文是设计计划，不是实施证据或 release readiness 结论。**

唯一允许的新文件：

`/Users/randyz/work/coding/hot_words_web/template/PHASE1_S2_TL02_IMPLEMENTATION_PLAN_V0.1.md`

规划依据：

1. 当前候选仓库的真实代码与测试。
2. `/Users/randyz/work/coding/hot_words_web/template/PHASE1_CORE_SAFETY_IMPLEMENTATION_CANDIDATE_PLAN_V0.1.md`，尤其 J 节 TL-02、E 节文件边界及 S2 切片。
3. `/Users/randyz/work/coding/hot_words_web/template/PHASE1_S1_TL01_FINAL_PROVENANCE_VERIFICATION.md`；本文另以只读 Git 命令确认当前 HEAD/tree/clean 状态。

没有联网查询或身份真实性核验；以下判断是仓库行为分析，不是外部市场或搜索引擎政策调研。

## 2. V2.6.5 Starter 的当前问题

| 实际位置（基线行号） | 当前行为 | 问题 |
| --- | --- | --- |
| `src/config/schema.ts:87–136` | strict config 只有 brand/site/seo 等，没有独立身份声明 | 品牌配置不能区分展示名称、组织存在、出版角色和作者角色 |
| `src/core/seo.ts:45–79` | `buildBaseSeoGraph` 每页生成 `Organization`，name 来自 `brand.name`，url 来自站点 URL | 品牌存在被自动升级为组织身份与站点归属 |
| `src/core/seo.ts:66` | WebSite.publisher 固定引用 `${siteUrl}#organization` | 无显式出版关系也输出 publisher |
| `src/core/seo.ts:98–116` | Article.author、Article.publisher 都固定引用同一 Organization | 无作者声明和可见署名也产生 author；author/publisher 被混为一体 |
| `src/layouts/BaseLayout.astro:25–32` | base graph 与任意 structuredData 直接合并 | 删除默认 Organization 后，扩展入口仍可重新注入身份或角色 |
| `src/components/wiki/WikiArticle.astro`、`src/components/EditorialArticle.astro` | 都调用 `buildArticleSchema(config,page)`，header 没有作者署名 | 目前 structured author 无相应可见归属 |
| `src/core/html-audit.ts:146–163` | 所有 JSON-LD script 只检查 JSON.parse 成功 | 语法正确的额外 script 可以绕过 layout 检查 |
| `tests/seo.test.ts` | 完整 article graph 固定期待五节点，第一项为 Organization | 测试把不安全默认当作既定正常行为 |

S1 改动没有改变这些身份行为。现有代码未自动生成 Person；TL-02 要确保 Person 也只能从受控显式输入产生。

### 为什么不安全

品牌名称可以是游戏名、站点标题或展示标签，不能证明组织存在、运营主体、出版责任或文章作者。站点 canonical 也不能证明该主体拥有网站。当前 helper 不经任何身份/角色输入便向所有页面发布这些关系，克隆 Starter 或只修改品牌就会继续继承这种断言。

风险是**未经支持的身份归属与角色声明**，并非 JSON 语法错误。JSON-LD 能解析，不表示身份事实正确；`projectConfirmed: true` 将来也只代表项目显式声明，不意味着 Core 核验了真实实体。

## 3. 必须实现的行为

### 3.1 默认：非断言输出

```text
brand exists
    ↓
NO Organization
NO Person
NO publisher
NO author
    ↓
WebSite + WebPage 保留
Article + BreadcrumbList 在原有适用页面保留
canonical 与原 SEO pipeline 保留
```

- 省略身份节点和角色属性；不输出 null、空字符串、空对象、空数组或匿名团队代替值。
- `brand.name` 仍可用于 WebSite.name、OG site name、首页/导航/页脚等现有显示用途。
- 不从 brand、logo、domain、X handle、copyright、About 文案、legal copy 或 Sources 推断身份。
- 默认 base graph：`WebSite`、`WebPage` 两节点。
- 默认 article graph：`WebSite`、`WebPage`、`BreadcrumbList`、`Article` 四节点。
- 不是给所有页面新增 Article/Breadcrumb；沿用原 consumer 适用范围。

### 3.2 显式输入：实体与角色独立

```text
explicit identity configuration
    ↓
strict shape + project confirmation + evidence references
    ↓
pageId / consumer / graph consistency checks
    ↓
validated Organization / Person
    ↓
allowed structured data output
```

| 输入 | 允许输出 | 不得自动输出 |
| --- | --- | --- |
| 没有 identity，或 `identity: {}` | 原非身份节点 | 任何 Organization/Person/author/publisher |
| 只有 organization | 明确 Organization 节点 | WebSite.publisher、Article.author、Article.publisher |
| 只有 sitePublisher | 其 Organization/Person 节点及 WebSite.publisher | 任意 Article author/publisher |
| 只有某 article author | 本页身份节点、Article.author、同一身份的可见署名 | site publisher 或 article publisher |
| 只有某 article publisher | 本页身份节点及 Article.publisher | author、可见作者署名、全站 publisher |
| author/publisher 均显式声明 | 两个独立角色；同一实体可复用单一节点 | 角色继承或自动合并不同实体 |

实体存在不授予任何角色。sitePublisher 不传给 Article；Article.publisher 不变成 author；author 不变成 publisher。organization slot 只允许 Organization；每个 role 可以明确声明 Organization 或 Person。

## 4. 最小配置与解析设计

以下类型、字段及 helper 名称均为 **proposed API**，不是现有仓库 API。正式实施时在列出的现有文件里定义，不另造 identity registry。

### 4.1 独立 optional identity 块

```ts
// 设计契约；由现有 Zod schema 推导 input/output 类型。
type ConfirmedIdentity = {
  kind: "Organization" | "Person";
  name: string;
  projectConfirmed: true;
  evidenceRef: string;
};

type ConfirmedRole = {
  identity: ConfirmedIdentity;
  evidenceRef: string;
};

type IdentityConfig = {
  organization?: ConfirmedIdentity & { kind: "Organization" };
  sitePublisher?: ConfirmedRole;
  articles?: Record<string, {
    author?: ConfirmedRole;
    publisher?: ConfirmedRole;
  }>;
};
```

- `identity` 可省略；不添加默认 entity 或默认 role。
- 每层 object 均 strict；`kind` 只允许上面两个 literal；organization.kind 固定 Organization。
- name 与两个层级的 evidenceRef 都执行 trim 后 min(1)；拒绝纯空白。
- `projectConfirmed` 为 `z.literal(true)`，拒绝 false、缺失和字符串 `"true"`，不用 coercion。
- identity.evidenceRef 支持实体身份声明；role.evidenceRef 支持具体关系，不能由 resolver 自动代填或继承。
- article key 复用现有 pageId 正则；所有 key 必须在实际 inventory 中存在，且对应 `guide` / `meta` / `patch` Article consumer。
- 空 identity/articles/单页 role map 视为没有声明；存在的 role 必须完整，不能接受 `{ author: {} }`。
- 不接受自定义 `@id`、url、logo、address、contactPoint、sameAs、social、任意 schema 字段或外部 registry key。
- evidenceRef 是项目内部证据引用字符串；不下载、不验证文件存在、不调用第三方服务。不放凭据或敏感个人信息。
- `game.config.ts` 保持缺省 identity；不得补一个 `Game Atlas` + confirmed=true 的伪确认例子。

### 4.2 本页单一 resolver，留在 `src/core/seo.ts`

建议纯函数 `resolveStructuredIdentity(config, page)` 返回：

```ts
interface ResolvedStructuredIdentity {
  nodes: StructuredDataNode[];
  sitePublisher?: { "@id": string };
  articleAuthor?: { "@id": string };
  articlePublisher?: { "@id": string };
  authorAttribution?: { id: string; name: string };
}
```

解析步骤：

1. 收集显式 organization、显式 sitePublisher，以及当前 pageId 的 article roles；不收集其他文章的身份作为本页节点。
2. 使用 `[kind, trimmedName, trimmedIdentityEvidenceRef]` 的固定顺序 JSON 串作为内部 fingerprint。大小写和内部空格不做模糊同一化；同名不同证据不推断成同一实体。
3. 用 Node 内置 SHA-256 生成完整 hex suffix，节点 ID 为 `${buildCanonicalUrl(config, "/")}#identity-${digest}`。输入不接受自定义 ID，角色 evidenceRef 不参与实体 ID。
4. 以内部 Map 去重明确相同 fingerprint；同 ID 不同 fingerprint/节点字段必须报错，不依赖碰撞概率来省略检查。
5. identity 节点仅输出 `@type`、`@id`、`name`。不把网站 URL、品牌 logo 或社交账号填入实体字段。
6. author/publisher 仅从其各自 role slot 建立 reference。authorAttribution.name/id 从相同 resolved author 取得。
7. evidenceRef、projectConfirmed 和完整内部解析对象不得序列化到公开 graph、HTML 属性、署名或错误日志中。错误只标 pageId/JSON path/问题类别。

不引入全站目录、持久 cache、数据库、服务类或新 singleton。保留现有 `(config,page)` helper 调用形状；多个 helper 可以调用同一个确定性纯 resolver，不能各写一套身份推断。

### 4.3 inventory 与启用边界

在 `collectSiteValidationErrors` 的现有 string[] 聚合中加入配置/inventory 关系检查：

- unknown pageId、route 作为 key、非 Article pageType：报错，不自动忽略。
- shape 校验对所有显式输入生效；disabled/draft 对应的合法未来 article 配置可以保留。
- inactive article roles 不进入当前 public graph，不把未输出声明当作已发布身份。
- enabled Article 页面须满足现有 content/route capability 检查；身份错误与原有导航、内容、legal 错误共同汇总。
- 不修改 enabled catalog 的发布规则，不给 identity 加 publicationStatus、activation、审批状态或法律 digest。

## 5. SEO helpers、署名与窄防绕过检查

### 5.1 graph 生成

- `buildBaseSeoGraph` 输出 resolver.nodes + 原 WebSite/WebPage；WebSite 仅在显式 sitePublisher 存在时增加 publisher。
- 本页 article 身份节点由同一 base graph 纳入，确保随后 `buildArticleSchema` 的 reference 有节点目标。
- `buildArticleSchema` 保留原非身份字段，独立条件添加本页 author/publisher。
- 同一实体在 organization/sitePublisher/article roles 中明确复用，只输出一次；不同实体各自输出。
- `#website`、`#webpage`、`#article`、`#breadcrumb` 的生成方式保持原样。旧自动 `#organization` 不保留兼容假节点。

### 5.2 author 的最小可见署名

两个 Article consumer 都从 resolver.authorAttribution 读取输入，在现有 header metadata 的 `<dl>` 内追加可选 Author 项，设计形状为：

```astro
{authorAttribution && (
  <div>
    <dt>Author</dt>
    <dd data-structured-author-id={authorAttribution.id}>
      {authorAttribution.name}
    </dd>
  </div>
)}
```

`data-structured-author-id` 是新增窄审计标记，只含公开 opaque node ID。真实姓名按 Astro 默认文本转义，不能 set:html。无 author 时不渲染该项；publisher-only 不新增任何作者项或 `Published by` UI。

输出检查要求标记位于本页实际 Article header，ID/解码后的文本等于 resolver 的值，不能用页脚、Sources 或正文里的同名文本充当署名。拒绝缺失、重复、不同 name/ID，以及显式 hidden/aria-hidden 的署名或祖先。沿用 HTML audit 的标签/属性读取方法，补所需有限实体解码与 header 定位，不新增 DOM/浏览器依赖或全局 HTML parser。

该检查验证受控模板中的机械归属，不声称能分析全部 CSS 可见性。两个真实 consumer 的渲染测试须证明署名正常可见、无隐藏样式；assembled-site 的实际展示与作者事实仍由项目核验。

### 5.3 BaseLayout 最终 graph 检查

建议在 `seo.ts` 增加 `collectStructuredIdentityErrors(config,page,values): string[]`，供 layout 与 HTML audit 复用。输入为 unknown JSON values；layout 传最终 `{ "@graph": graph }`，检查在 serializeJsonLd 前执行。有错误则抛出安全摘要并停止构建，不静默删节点后继续成功。

检查只对有限的受控身份构造负责：

1. 递归遍历 JSON object/array，包括嵌套 `@graph`、inline entity、`@type` 数组；识别 Organization、Person、author、publisher。
2. 受控类型识别包含短名及明确的 `https://schema.org/`、`http://schema.org/` 完整类型 IRI；不引入 JSON-LD expansion/context resolver。
3. 每个 identity 节点必须匹配本页 resolver 生成的 type/ID/name 与字段白名单；拒绝额外身份、字段注入、改变 name/type/ID、混合附加 type。
4. 角色仅可放在原 WebSite 的 `#website` owner.publisher，或本页 Article 的 `#article` owner.author/publisher；owner type、ID、角色和值都必须匹配本页独立 role mapping。
5. emitted role 的允许值为单一 `{ "@id": expectedId }`；字符串、数组、空值、未批准 inline identity 形式均拒绝，不自动转换成受控 reference。
6. 比对实际受控投影与预期投影：显式要求的节点/角色不得缺失；同 ID 的重复 identity 声明（即使内容相同）拒绝，resolver 已负责合法复用；重复或冲突角色 owner 拒绝。
7. 检查所有显式受控 ID reference 均指向本页唯一正确节点；识别内部 `#identity-` namespace、已配置 identity ID 与历史 `#organization`。未声明旧默认节点的 reference 不得悬空残留。
8. 当普通 extension 的 sponsor/affiliation 等字段显式引用受控 ID 时，只检查 reference 完整性，不推断该关系真实性。
9. 非身份 extension（例如不带身份/角色的普通 CreativeWork 节点）继续通过，不能因为缺 identity 禁止全部 structuredData。

不做 Schema.org ontology 解释、远端 context 获取、任意 alias 展开或通用 domain/range 检查。不声称能发现所有形式的身份断言。sponsor/founder/employee/member/affiliation/parentOrganization/subOrganization 的通用关系规则不属于 TL-02。

### 5.4 所有输出 script 再检查

`html-audit.ts` 保留每个 JSON-LD script 的 JSON.parse 错误检查；成功解析的 values 按**同一页面、所有 script 的联合集合**送入上述 guard：

- 防止第二个 script 注入 Person/Organization、角色或覆盖同 ID。
- 同页 reference 可以在另一个 script 中引用唯一合法节点；不能逐 script 丢失 reference 上下文，也不能把不同页面合并成可借用的节点集合。
- parse 失败仍报错，不能把失败 script 排除后得到 PASS。
- 验证本页 author role 与可见 attribution 一致。
- final 与 evidence 都将 invalid identity 作为 error；不添加 warning/waiver/CLI bypass。

现有 `scripts/audit-build.ts` 已调用 `collectBuildHtmlAuditErrors`，`scripts/validate-site.ts` 已调用 `collectSiteValidationErrors`，final/evidence 共用 technical stages；S2 可通过 collector 内部接入，不改 orchestrator。

## 6. 精确的未来文件范围

本节路径均相对于第 1 节的唯一候选工作区，可与该绝对工作区前缀直接拼接。**所有变更均为后续实施计划；本任务不修改表内任何文件。**

### 6.1 预计必需的既有源码修改（7 个）

| 文件 | 最小改动 | 不允许扩大到 |
| --- | --- | --- |
| `src/config/schema.ts` | optional strict identity/entity/role schema，复用 pageId 正则与类型推导 | 全站身份 registry、通用 schema 配置、法律审批 |
| `src/core/seo.ts` | 纯 resolver、受控 ID/去重、conditional roles、窄 guard；保留 helpers 签名 | SEO helper 重写、通用 Schema.org/JSON-LD validator |
| `src/core/site-validation.ts` | 在原 string[] 中添加 article pageId/consumer 矛盾检查 | 改 S1 legal flow、catalog 或 route policy |
| `src/layouts/BaseLayout.astro` | final graph 在原 serialization 前调用 guard | 修改 meta、canonical、robots、布局/导航 |
| `src/components/wiki/WikiArticle.astro` | 可选作者署名读取同一 resolver，放入既有 header metadata | author card、profile、publisher badge、TOC/media 重构 |
| `src/components/EditorialArticle.astro` | 同上，覆盖 meta/patch consumer | 新文章模板、publisher UI、正文或 Sources 改写 |
| `src/core/html-audit.ts` | 每页所有 parsed scripts 联合检查、窄署名检查与所需解码 | audit framework、S3 residue/coverage 系统、CSS 可见性引擎 |

不新增 runtime 源码文件。`src/core/site-data.ts` 在总 Phase1 计划中有候选用途，但本 S2 方案直接消费现有 siteConfig + 纯 helper，**不需修改它**。

### 6.2 测试范围

| 文件 | 操作 | 必须覆盖 |
| --- | --- | --- |
| `tests/config.test.ts` | 修改 | 默认兼容、strict identity、confirmation/evidence/type/role negatives |
| `tests/seo.test.ts` | 修改 | 默认四节点、各独立 role、去重/稳定 ID、guard、原 serializer/canonical/breadcrumb/robots |
| `tests/site-validation.test.ts` | 修改 | unknown/non-Article pageId、inactive 边界、多个错误仍聚合 |
| `tests/html-audit.test.ts` | 修改 | 多 script/inline/type-array/string roles、conflicting ID、dangling reference、署名错误；保留原 SEO/ad negatives |
| `tests/wiki-article.test.ts` | 修改 | 默认无署名、显式作者与 structured author 一致；保持 TOC/FAQ/media 断言 |
| `tests/editorial-article.test.ts` | 新增，当前不存在 | EditorialArticle 的独立 author/publisher 和默认显示契约 |
| `tests/core-safety-build.test.ts` | 新增，当前不存在 | 少量隔离真实 build/audit permutations、绕过和 S1 回归 |
| `tests/helpers/core-build-fixture.ts` | 新增，当前不存在 | 显式 projectRoot、临时目录创建/cleanup、既有依赖复用、测试配置/内容准备；无 Playwright |

helper 是既有 Phase1 计划指定的测试/build plumbing，限定为显式文件清单和临时输入，不做 plugin API、fixture framework、workspace generator。现有 `tests/media-build.test.ts`、`tests/evidence-build.test.ts` 在 S2 **优先只运行不修改**；身份新增 permutation 放在新的 core-safety build 测试，S3 的中性数据/残留迁移不提前实施。

### 6.3 使用与迁移说明

后续实施时允许窄增补：`README.md`、`docs/CONTENT_AND_DATA_GUIDE.md`、`docs/QA_CHECKLIST.md`。

仅写身份默认、显式配置格式、独立角色、内部证据边界、作者署名及验证步骤。使用说明示例需明确为测试/格式示例，禁止在 Starter 默认配置伪造身份确认。保留现有 release identity/provenance、SOP、Pagefind 与 evidence 文案，不命名新版本。

## 7. 明确禁止触碰的文件与范围

### 7.1 本次规划任务

除本文外全部只读，包括源码、测试、配置、已有计划/证据、package/lock、Git index/refs、构建输出。不得创建 branch/worktree、commit/push/tag、安装依赖、实施 TL-02 或其他切片。

### 7.2 后续 S2 实施的禁止范围

S2 默认只有第 6 节 allowlist。以下重要路径不得修改；不得因身份任务重开已关闭的 S1：

- `src/core/legal-safety.ts`、`src/data/legal-content.ts`、`src/data/schemas/page-inventory.ts`、`src/data/page-inventory.json`。
- `src/core/catalog.ts`、`src/core/site-data.ts`、`src/core/static-page-copy.ts`、`src/components/LegalPage.astro`。
- `src/pages/privacy/[...path].astro`、`src/pages/terms/[...path].astro`；不得恢复已删除的 `src/pages/privacy.astro`、`src/pages/terms.astro`。
- `tests/legal-safety.test.ts`、`tests/catalog.test.ts`、`tests/site-data.test.ts`、`tests/static-page-copy.test.ts`、`tests/output-reconciliation.test.ts`：运行保护 S1，不能删改断言让身份变更通过。
- `game.config.ts`、`src/config/load-config.ts`、`src/content.config.ts`、`src/content/**`、`src/data/facts/**`、`src/data/tools/**`、`src/data/media/**`。
- `src/core/page-models.ts`、`src/core/page-resolution.ts`、`src/core/optional-routes.ts`、`src/core/output-reconciliation.ts`、`src/core/pagefind-artifacts.ts`。
- `src/pages/**` 的所有 routes，包括 guides/meta/news consumer 路由、robots；Article 署名在既有组件完成。
- `src/components/Header.astro`、`src/components/Footer.astro`、home/navigation/media/ads/islands 组件、`src/core/brand.ts`、`src/config/ads.ts`、`src/styles/**`、`public/**`。
- `scripts/build-site.ts`、`scripts/validate-site.ts`、`scripts/audit-build.ts`、`scripts/reconcile-output.ts`、`scripts/normalize-pagefind-output.ts`、其他现有 scripts。
- `package.json`、`package-lock.json`、`.nvmrc`、`astro.config.ts`、`vitest.config.ts`、`tsconfig.json`、`wrangler.jsonc`、`.github/workflows/**`。
- `tests/media-build.test.ts`、`tests/evidence-build.test.ts`、`tests/release-identity.test.ts`、`tests/runtime-contract.test.ts`：保持现有保护，不提前做 S3/CI/release 迁移。
- `archive/**`、既有历史 reports/architecture plans、本文以外的 `/Users/randyz/work/coding/hot_words_web/template/` 文档。
- 冻结源 `/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.6.5` 及其他仓库全部只读。

若实施时确有 allowlist 之外的必要变更，先给出具体阻塞证据与最小范围修订，不能顺带扩大 S2。不得修改测试期望来掩盖原有安全/SEO 回归。

## 8. 迁移策略

1. **旧配置无需新增字段。** 新 identity 块 optional，旧 `defineGameConfig` 输入继续通过；品牌/UI、feature/navigation/homepage 解析不变。
2. **输出安全 delta 明确披露。** 默认 Organization、WebSite.publisher、Article.author/publisher 消失是预期行为变化；不提供 `legacyAutoIdentity` compatibility flag。
3. **需要真实身份的项目显式迁移。** 项目自行确认实体与各关系，提供独立 evidenceRef；仅需 entity 不选 role，仅需 publisher 不补 author。
4. **Article 按 pageId 逐页配置。** 无全站 article fallback，无把 disabled 配置挪到别页的逻辑。作者署名由同一输入渲染，不能扫描已有文案猜作者。
5. **旧引用删除。** 停用默认 `#organization`，显式 identity 使用受控 opaque ID；外部手写 extension 若引用旧默认，须按显式配置修复，不能保留虚构节点满足 reference。
6. **不批量改项目内容。** 所有正向身份数据先放测试/临时构建项目；正式 Starter inventory、legal copy、About/footer 和品牌默认保持原样。
7. **迁移核验以差异为准。** 默认输出只删除身份节点/角色；显式 author 时增加最小署名。对剩余 graph、metadata、routes、sitemap、robots、Pagefind 做等值保护。

projectConfirmed/evidenceRef 不复用 TL-01 的 `approvedContentSha256` 或 legal activation。无审批流程、全站 approved 状态、网络身份认证或证据管理 UI。

## 9. 测试策略与预期结果

全部为未来测试；本次没有创建测试文件、fixture 或执行命令。

### 9.1 最小测试矩阵

| 类别 | 阳性 | 必须失败的近邻阴性 |
| --- | --- | --- |
| 默认配置 | identity 省略/空块，默认品牌照常显示，四节点 article graph | brand/logo/social 被自动解释为身份或角色 |
| 实体校验 | confirmed Organization/Person，trim 后名字非空 | unknown kind、false/missing/string confirmation、空 name/evidence、unknown keys、partial role |
| 独立角色 | org-only、sitePublisher-only、author-only、articlePublisher-only、author+publisher 不同实体 | site publisher 继承给 Article、publisher 变 author、organization 自动获得角色 |
| 实体复用 | 同 fingerprint 多 slot 一节点、ID 稳定、角色 evidence 改变不换实体 ID | 同名不同 evidence 自动合并、重复/冲突 ID、内部证据泄露 |
| 页范围 | guide/meta/patch 正确 pageId、合法 inactive article 配置不输出 | unknown pageId、route key、home/about/entity 等非 Article key、跨页身份引用 |
| graph guard | 正常受控 graph；普通非身份 extension | nested graph、inline Person/Organization、type-array/full IRI、字符串/数组 author/publisher、extra fields、额外角色 owner、缺必需节点/角色、dangling legacy/controlled reference |
| 所有输出 script | 多 script 联合解析、唯一合法跨 script reference | 第二 script 注入、跨 script 重复/冲突 ID、无效 JSON 被跳过、不同页面借用身份 |
| 可见署名 | WikiArticle 与 EditorialArticle name/ID 等于 structured author、特殊字符正常转义 | 缺署名、同 ID 不同 name、同名不同 ID、重复/hidden attribution、正文同名冒充署名 |
| 无作者 / publisher-only | 两个 consumer 都没有 Author UI，publisher mapping 正确 | 默认作者、额外 publisher UI、从页面内容推断 author |
| 现有安全 | `</script>` attack 转义、canonical/robots/metadata/links/ads 原 negative fixtures | 删除 serializer 或放宽 HTML audit 让旧 negatives 成功 |
| build modes | final/evidence 的合法默认/显式配置成功 | 两模式对 invalid identity 均 nonzero；evidence 无豁免 |
| S1 回归 | unavailable/draft legal 不进 enabled routes/输出/search/sitemap | 为测试身份恢复 privacy/terms 默认公开或绕过 digest |

纯 helper/config/guard 使用单元测试。consumer 使用仓库既有 Astro Container 和受控模块 mock/临时配置方式，测试同一输入的真实 rendered HTML，不仅检查源码字符串。真实 build/audit 用少量临时项目覆盖默认、author+distinct publisher、publisher-only；同时启用 guide 和至少一个 EditorialArticle fixture，证明两条 consumer 路径。

临时项目可拥有 synthetic inventory/content/config；不得因此改正式 Starter 数据。沿用现有 cpSync/mkdtempSync、node_modules symlink、`NODE_ENV=production` 与 Astro 独立 cache 的测试做法。若执行环境缺 Node/已有依赖，报告具体环境阻塞，不能在本规划任务安装任何依赖。

绕过 negative 优先复用已有成功 dist，注入额外 script、角色或移除/篡改署名，再运行真实 `scripts/audit-build.ts`；每次还原 fixture。至少一次身份 preflight failure 证明 technical stages 不再继续，一次 rendering guard failure 证明不能生成被接受的输出。失败构建不得留下新成功 evidence marker，保留原 marker 闭合规则。

### 9.2 核心断言示例

下面仅使用已经存在的 helpers 展示默认契约；后续添加到 `tests/seo.test.ts`，本次不写入测试：

```ts
const trail = buildBreadcrumbTrail(siteConfig, guidePage, guideCatalog);
const graph = [
  ...buildBaseSeoGraph(siteConfig, guidePage),
  buildBreadcrumbSchema(buildCanonicalUrl(siteConfig, guidePage.route), trail),
  buildArticleSchema(siteConfig, guidePage),
];
expect(graph.map((node) => node["@type"])).toEqual([
  "WebSite", "WebPage", "BreadcrumbList", "Article",
]);
expect(new Set(graph.map((node) => node["@id"])).size).toBe(4);
expect(graph.find((node) => node["@type"] === "WebSite"))
  .not.toHaveProperty("publisher");
expect(graph.find((node) => node["@type"] === "Article"))
  .not.toHaveProperty("author");
expect(graph.find((node) => node["@type"] === "Article"))
  .not.toHaveProperty("publisher");
```

该默认测试在 S1 基线应因五节点/默认角色而失败；它描述目标行为，不是当前 PASS 声明。显式身份测试必须分别比对节点内容、role owner/reference 和 consumer attribution，不能仅以 JSON 字符串 contains 判断。

### 9.3 后续执行命令（先快后全）

正式实施另获授权后，从指定候选工作区运行；使用现有 Node `22.22.0` 和已有 locked dependencies。命令不包含安装、Git 写入或部署。

| 顺序 | 精确命令 | 目的 / 预期 |
| --- | --- | --- |
| 1 | `npm exec -- vitest run tests/config.test.ts tests/seo.test.ts tests/site-validation.test.ts tests/html-audit.test.ts` | 最快验证配置、默认 graph、角色关系及输出 guard；新行为测试先 RED，最小实现后 PASS |
| 2 | `npm exec -- vitest run tests/wiki-article.test.ts tests/editorial-article.test.ts` | 两个真实 Article consumer 的署名/默认/publisher-only PASS |
| 3 | `npm exec -- vitest run tests/legal-safety.test.ts tests/catalog.test.ts tests/site-data.test.ts tests/site-validation.test.ts tests/static-page-copy.test.ts tests/output-reconciliation.test.ts tests/optional-routes.test.ts` | S1 和 enabled route 保护；原断言全部 PASS |
| 4 | `npm exec -- vitest run tests/core-safety-build.test.ts tests/media-build.test.ts tests/evidence-build.test.ts` | 隔离 real build/audit、final/evidence failure 和现有媒体/marker 回归 PASS |
| 5 | `npm run check` | 现有 `astro check && vitest run`；类型检查与全测试通过 |
| 6 | `npm run validate` | 当前正式 Starter 配置的现有 final-only preflight 通过，含身份默认安全检查 |
| 7 | `npm run build` | 完整 canonical final pipeline 通过；输出核对默认无身份、保留 SEO/TL-01 |

身份失败案例的预期是被测 build/audit 非零，Vitest 测试本身通过。`build:evidence` 的身份 permutation 在临时 fixture 内执行，不在当前仓库留下 evidence dist。上述命令全部 **NOT RUN**。

## 10. 回归保护与允许的差异

| 必须保留 | 等值保护 / 审查要求 |
| --- | --- |
| WebSite | type、`#website`、url、brand name、description、inLanguage 原值；默认仅删除 publisher |
| WebPage | type、`#webpage`、url/name/description/dates/language/isPartOf 原值 |
| Article | type、`#article`、headline/description/dates/language/mainEntityOfPage 原值；默认仅删 author/publisher |
| Breadcrumb | BreadcrumbList/`#breadcrumb`、ListItem 顺序/position/name/item、enabled ancestor 逻辑原样 |
| canonical | `buildCanonicalUrl` 不改，inventory route + production HTTPS URL、head canonical/OG URL 原样 |
| metadata | title/description/robots/OG/Twitter、favicon、brand chrome 默认原样 |
| 路由与索引 | enabled catalog、route reconciliation、sitemap inclusion、robots、Pagefind exactness/normalization/budget 不改 |
| 现有 SEO pipeline | final/evidence preflight → Astro build → reconciliation → Pagefind generation → normalization → audit 的同一 stage 定义、顺序、首错停止保持 |
| JSON 安全 | `serializeJsonLd` 的 `<` 转义保留，graph 仍是现有单 script 的 context/@graph 输出 |
| S1 TL-01 | legal activation/digest、安全 absent 状态、optional routes、链接与输出一致性保持 |
| 其他既有体系 | media placement/readiness、ads disabled defaults/provider isolation、导航、FAQ、TOC、related/sources 与 budgets 不改 |

差异审查应比较移除身份/角色后的剩余 graph 与原期望，避免仅检查“四个 type 存在”漏掉字段回归。作者明确启用时，额外可见差异仅为既有 metadata 的 Author 项。

当前 HTML audit 的最小合法 JSON-LD 测试输入不应被迫满足整套 Schema.org 必填字段。TL-02 只增加受控身份/角色一致性要求；非身份节点完整性通过既有 SEO helper/build 回归验证，不扩大为全 schema validator。

## 11. 风险与控制

| 风险 | 触发方式 | 控制措施 / 剩余边界 |
| --- | --- | --- |
| SEO regression | 删除默认 identity 时误删 WebSite/Article、改变 IDs/canonical 或索引 | 非身份字段等值断言、真实 build、pipeline 原 stage 保护；无身份时 Article 保留。缺少 author/publisher 可能影响某些 consumer 的 rich-result 信息，不承诺资格或排名，不恢复虚构关系补字段 |
| overengineering | 单一可选配置变成 registry/service/cache、跨切片框架 | 七个现有源码文件内实现；0 新依赖；独立 slot + 纯 resolver + string[]；测试 helper 只做有限临时项目准备 |
| identity inference | brand、域名、logo、social、legal 文案或同名实体被自动映射 | 明确禁止 fallback；实体 fingerprint 不做模糊合并；实体和角色各有 evidenceRef；negative fixtures 覆盖近邻输入 |
| schema framework expansion | guard 开始解释全部 JSON-LD、任意 Schema.org 关系、context 或 validator hooks | 仅受控 types/role properties/IDs 和有限 reference 检查；普通非身份 extension 保留；不造 ontology/context/validator engine |
| extension bypass | nested node、type array、string role、第二 script、冲突 ID | 同一 resolver 驱动 layout guard 和所有脚本联合输出 guard；拒绝错误而非静默清理；两 build modes 同样失败 |
| byline drift | 结构作者与页面归属分离，测试只 mock schema | 两个 consumer 同源 name/ID，真实 HTML/fixture 检查；显式 hidden 检查。真实身份与最终 CSS 展示仍需项目核验 |
| confirmation 被误当认证 | confirmed=true / evidenceRef 被描述为已验证真人/公司 | 文档明确 Core 只做机械校验，证据不联网验证；不增加 approval workflow 或法律 hash |
| migration surprise | 旧手写 extension 继续引用 `#organization` | 明确告知 intentional safety delta；拒绝 dangling legacy reference，不新增兼容自动身份开关 |
| S1 regression | 修改共享 validation 时破坏 legal 聚合/eligibility | 保持原 legal flow 和 sentinel tests；禁止修改 S1 核心文件，原 negatives 保持 |

## 12. 实施任务顺序（仅供未来授权后执行）

### Task 1 — 配置契约与默认 RED

**Files:** `tests/config.test.ts`、`tests/seo.test.ts`、`src/config/schema.ts`。

- [ ] 固化第 3 节默认 graph 断言、strict shape/confirmation/evidence negatives 与旧配置兼容断言。
- [ ] 运行第 9.3 节第一条命令，记录与当前自动 Organization/角色直接对应的 RED，区分环境/语法失败。
- [ ] 按第 4.1 节增加独立 optional identity schema；不修改默认 `game.config.ts`。
- [ ] 重跑 config tests，确认旧配置正常且坏身份输入拒绝；默认 graph RED 留给下一任务。

### Task 2 — 单一 resolver、独立角色与 graph guard

**Files:** `src/core/seo.ts`、`tests/seo.test.ts`。

- [ ] 添加 org-only/sitePublisher-only/author-only/publisher-only/distinct/reuse/inactive-page fixtures，并保持原 serializer 攻击测试。
- [ ] 按第 4.2、5.1 节实现确定性 opaque ID 与 conditional nodes/roles，保留现有 helper signatures。
- [ ] 按第 5.3 节添加窄 unknown-value traversal 与受控投影比对，测试 nested/type-array/full IRI/string role/冲突/缺失/dangling/普通 extension。
- [ ] 运行 `npm exec -- vitest run tests/config.test.ts tests/seo.test.ts`；所有上述行为 PASS，无 evidence metadata 泄露。

### Task 3 — inventory 机械矛盾聚合

**Files:** `src/core/site-validation.ts`、`tests/site-validation.test.ts`。

- [ ] 添加 unknown key、非 Article key、route key，以及合法 inactive article 输入的测试。
- [ ] 在原聚合函数内接入 pageId/consumer checks；保留原 legalResults/导航/内容验证逻辑。
- [ ] 运行第 9.3 节第一条和第三条命令，确认身份与其他错误共同报告，S1 原保护 PASS。

### Task 4 — layout 与同源可见作者

**Files:** `src/layouts/BaseLayout.astro`、`src/components/wiki/WikiArticle.astro`、`src/components/EditorialArticle.astro`、`tests/wiki-article.test.ts`、新增 `tests/editorial-article.test.ts`。

- [ ] 在最终 graph serialization 前使用共享 guard；invalid graph 直接失败。
- [ ] 两个 Article header 按第 5.2 节增加同源 optional Author metadata；publisher-only 不输出 Author。
- [ ] 使用真实 consumer 渲染证明 name/ID 对应 graph；包括转义、无 identity、作者与出版社不同的输入。
- [ ] 运行第 9.3 节第一、第二条命令；原 TOC/FAQ/media/date/source 等断言保持。

### Task 5 — all-script 输出与署名审计

**Files:** `src/core/html-audit.ts`、`tests/html-audit.test.ts`。

- [ ] 先添加第二 script 注入、跨 script 冲突、missing/mismatched/hidden attribution 的 RED。
- [ ] 每页解析全部 JSON-LD，再调用同一 guard；按第 5.2、5.4 节定位并检查有限署名 surface。
- [ ] 保留无效 JSON/metadata/canonical/robots/link/ads 原错误；不添加 purpose 豁免或新 orchestrator 参数。
- [ ] 运行 `npm exec -- vitest run tests/html-audit.test.ts tests/seo.test.ts`；阳性与攻击 negatives 均得到预期结果。

### Task 6 — 最少隔离 build 与说明

**Files:** 新增 `tests/core-safety-build.test.ts`、`tests/helpers/core-build-fixture.ts`；窄增补 `README.md`、`docs/CONTENT_AND_DATA_GUIDE.md`、`docs/QA_CHECKLIST.md`。

- [ ] 按第 9.1 节建立少量临时 fixture，真实验证 guide + EditorialArticle、default/author/publisher、final/evidence 及 post-render bypass；复用已有依赖并 cleanup。
- [ ] 保留 legal unavailable 默认，assert privacy/terms 不回到 routes/dist/sitemap/search；不得修改正式 inventory。
- [ ] 写明迁移安全 delta 与独立 role 契约，不改 release provenance 或 S3 residue 文案。
- [ ] 顺序运行第 9.3 节第四至第七条命令；类型/全测/validate/canonical build 全部有真实结果。
- [ ] 核对 diff 只在第 6 节 allowlist；单独 review 原 WebSite/WebPage/Article/Breadcrumb/canonical 与 S1 不变量。

### Task 7 — S2 完成门槛与停止

- [ ] 默认全输出无 Organization/Person/author/publisher，同时保留适用 SEO graph 与 pipeline。
- [ ] 显式身份/独立角色有阳性证据，非法 shape/pageId/extension/output/attribution 有失败证据。
- [ ] 两个 Article consumer 的 author 与可见归属相同；publisher-only 无作者/新增 publisher UI。
- [ ] S1 与现有 SEO/media/evidence/marker 回归测试保持通过；文档不声称网络身份认证或 rich-result 保证。
- [ ] 交付 reviewable 文件列表、实际运行的测试/构建结果与剩余事实核验边界。未授权的 branch/commit/push/tag/install/deploy 不执行；不自动进入 S3/S4。

上述任务没有在本次执行，也不把本文生成作为任何 Task 的实施完成。

## 13. Out of scope

明确不做：

- CMS、用户系统、账号、登录、编辑器、个人档案、多人角色管理。
- approval workflow、数据库、身份认证服务、证据抓取/证据存储 UI、联网真伪核验。
- schema validator engine、Schema.org ontology、JSON-LD remote context/alias expansion、通用 graph framework、schema plugin/registry。
- author card、editor profile、publisher badge、company box、article footer framework、自动 publisher 文章 UI。
- 从品牌、canonical、logo、社交账号、文案推断 Organization/Person 或 author/publisher。
- SEO-02 扩展、FAQPage、新 schema 类型、搜索引擎专项 rich-result 优化、SEO pipeline 重构。
- S1 TL-01 重开、S3 PP-02 residue/coverage 系统、S4 AX-01/AX-03、Playwright/CI 扩展。
- media README 迁移、媒体/ads/provider/token/theme 模型调整、CMS/业务内容创作。
- Release Governance、版本命名、打包、branch/worktree、commit/push/tag、依赖安装、部署。

## 14. 本次交付与硬停止

**PLAN CREATED ONLY — S2 TL-02 NOT IMPLEMENTED。**

本次唯一写入为本文。计划覆盖：V2.6.5 问题、不安全原因、默认与显式行为、精确影响/禁改文件、迁移、测试、SEO 回归保护、四项指定风险及全部排除项。没有将拟议 API 或未来测试写成已存在/已通过。

**创建本文后 STOP。不得开始 TL-02 实施，不执行计划中的测试/构建，不创建分支，不提交、不推送、不安装依赖。**
