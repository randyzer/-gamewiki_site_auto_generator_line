ChatGPT 说：

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 10-SCOPE-AMENDMENT
WORKSTREAM: WS-02
VERDICT: CONTINUE — NARROW AMENDMENT AUTHORIZED

这个修改是合理的，而且保留了原测试意图。不是 runtime defect，也不是 PP-02/identity 规则退化。

实际 collector 的 legacy ID 是：

TypeScript
const siteUrl = buildCanonicalUrl(config, "/");
const legacyOrganizationId = `${siteUrl}#organization`;

所以在 adopted fixture 里，当前站点已经变成：

纯文本
https://field-notes.example/

原来的硬编码：

纯文本
https://gameatlas.example/#organization

已经不属于当前 siteConfig 的受控 legacy identity namespace，因此返回空错误是正确行为。

授权的唯一新增 Starter 文件范围

在原 WS-02 PLAN 上只增加：

纯文本
tests/seo.test.ts

只改这一条 legacy negative fixture。

推荐直接复用测试已经 import 的 buildCanonicalUrl：

TypeScript
const legacyOrganizationId =
  `${buildCanonicalUrl(siteConfig, "/")}#organization`;

expect(
  collectStructuredIdentityErrors(
    siteConfig,
    guidePage,
    [{ "@id": legacyOrganizationId }],
  ).join("\n"),
).toMatch(/dangling|legacy/i);

这比直接字符串拼：

TypeScript
`${siteConfig.site.url}/#organization`

更稳妥，因为它与 production collector 使用同一个 canonical URL 规则，避免未来 site.url 是否带尾斜杠造成测试漂移。

必须保持不动的其它 identity negatives

这一条修改不能顺手泛化整个测试。

特别是前面的：

纯文本
unconfigured Person injection
→ /unconfigured controlled identity/

必须原样保留。

因此本轮证明仍然是两种不同攻击/遗留状态：

纯文本
1. 新增未配置 Person/Organization node
   → unconfigured controlled identity

2. 当前站点 namespace 下旧 #organization reference
   → dangling or legacy controlled identity

第二条从“绑定 Game Atlas 示例”改成“绑定当前 siteConfig”，语义更准确，不是放宽断言。

不允许修改

仍然禁止：

纯文本
src/core/seo.ts
collectStructuredIdentityErrors()
game.config.ts
default Inventory
identity schema
runtime
PP-02
TL-02

也不得：

纯文本
删掉 /dangling|legacy/ assertion
改成仅 expect errors.length > 0
skip 该测试
给 adopted fixture 特殊关闭 identity 检查
修改后的验证顺序

Codex 修改 tests/seo.test.ts 后，继续原 WS-02 执行，不再扩 scope。

必须重新完整执行：

纯文本
npm run check
npm run verify:unadopted-final
npm run verify:adopted-final

其中 adopted verifier 必须重新得到：

纯文本
validate = 0
check    = 0
build    = 0

而不是只重跑：

纯文本
seo.test.ts

同时继续验证：

纯文本
44+ test files all PASS
tests >= 656
no skipped-to-pass
package-lock byte-identical
no direct/resolved/installed browser dependency delta
src/** runtime delta = none
canonical Contract unchanged

保留这次失败的 adopted-final.log 和 execution output，不要覆盖；新的成功 run 追加到 provenance checkRuns，这样能清楚证明：

纯文本
first full adopted run
→ exposed stale test fixture
→ STOP

narrow test-fixture correction
→ rerun complete pipeline

这是正确的证据链。

当前结论
YAML
WS02:
  blocked: false
  scope_amendment:
    add_file: tests/seo.test.ts
    type: TEST_FIXTURE_ONLY
    runtime_change: false

  proof_intent:
    preserved: true

  continue_execution:
    authorized: true

Codex 可以按这个窄修正继续 WS-02，然后完成原 PLAN 的全量复测并停下等待独立 review。
