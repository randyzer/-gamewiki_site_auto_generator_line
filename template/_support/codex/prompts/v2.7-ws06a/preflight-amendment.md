ChatGPT 说：

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 11-PREFLIGHT-AMENDMENT
WORKSTREAM: WS-06A
VERDICT: CONTINUE — TWO ASSERTION CORRECTIONS AUTHORIZED

这两个修正都成立，不构成 BLOCK，也不授权任何 runtime/CSS 修改。原 WS-06A PLAN 其它边界保持不变。

1. 620 边界：删除错误的 detail“两列→一列”主布局断言

实际 adopted Field Notes fixture 会把 getting-started.mdx 改成只有一个 H2，因此 WikiArticle.astro：

纯文本
showToc = false
→ wiki-article__layout--single

而 .wiki-article__layout--single 本身一直保持 single layout。

所以原 PLAN 中：

纯文本
619 / 620 → one column
621       → article returns to two-column form

删除。

不得为了让这个断言成立去：

纯文本
增加 TOC heading
修改 WikiArticle
修改 CSS
换一个虚假的 detail 页面
620 boundary 的 9 行保持不变

仍然是：

纯文本
619 × 844
620 × 844
621 × 844

×
shell-nav
content-detail
recovery-404

= 9 rows

但改成验证真实存在的 CSS breakpoint delta。

shell-nav

619/620：

纯文本
.site-header__inner min-height = 74px
.brand__copy small hidden

621：

纯文本
.site-header__inner min-height = 88px
.brand__copy small visible

还可记录 shell horizontal inset 的实际差异：

纯文本
<=620  → calc(100% - 28px)
621    → max-width:900 rule 的 100% - 36px 行为

但不要把 subpixel 精确宽度作为唯一 Gate。

content-detail

主 article layout 不做 column-count 断言。

改验真实 metadata breakpoint：

619/620：

纯文本
.article__meta
→ grid-template-columns = 1fr

621：

纯文本
.wiki-article__meta
→ repeat(2, minmax(0, 1fr))

同时确认：

纯文本
.wiki-article__layout--single
在三种宽度下都仍然 single

也就是说这里证明的是：

620 breakpoint 真正改变了 detail metadata presentation，而没有虚构 article 主布局切换。

recovery-404

619/620：

纯文本
.not-found
→ grid-template-columns = 1fr

.not-found__code
→ horizontal writing
→ transform none

621：

纯文本
.not-found
→ 0.5fr 1.5fr

并验证 code 恢复当前 >620 的实际 writing-mode / transform 状态。

因此此次 amendment 只修测试 oracle，不改矩阵数量：

纯文本
boundary = 12
total = 47
2. Wide-table assertion：修正 scroll geometry

你指出得对：

纯文本
table.scrollWidth > table.clientWidth

不是正确的局部滚动证明。

普通 table 自己通常不是 scroll container，因此它完全可能：

纯文本
table.scrollWidth == table.clientWidth

真正应该滚动的是它的 ancestor。

当前 Core 已经真实存在：

CSS
.table-scroll {
  overflow-x: auto;
}

.table-scroll table {
  width: 100%;
  min-width: 780px;
}

而且这个 pattern 已由 EntityFilterIsland 实际使用。

因此 WS-06A 应测试现有 Core-supported overflow pattern，不是发明另一种 raw MDX table contract。

3. Stress fixture 正式改为使用已有 .table-scroll

browser-only adopted fixture 可以往临时 getting-started.mdx 追加一个测试结构：

纯文本
.table-scroll wrapper
  └─ wide table

要求：

使用现有 Core .table-scroll class；
不修改 global.css；
不加 inline overflow-x;
不写 browser-test 专用 CSS；
table 内容足够触发现有 min-width:780px 行为；
只存在于 disposable fixture，不写回 Starter source。

这不是伪造 PASS，因为：

滚动能力本来就是 Core 已有的公开 CSS pattern；fixture 只是实例化它进行浏览器验证。

4. 正确的 local-scroll assertions

删除：

纯文本
table.scrollWidth > table.clientWidth

替换成：

纯文本
wrapper = .table-scroll
table   = wrapper.querySelector("table")

必须同时满足：

纯文本
computed(wrapper).overflowX
  = auto | scroll

wrapper.scrollWidth
  > wrapper.clientWidth + tolerance

table rendered width
  > wrapper.clientWidth + tolerance

documentElement.scrollWidth
  <= documentElement.clientWidth + 1px

tolerance 可使用 1 CSS px。

这证明：

纯文本
wide content
     ↓
overflows local .table-scroll region
     ↓
page/document itself does not overflow

而不是要求 table 自己滚自己。

如果 wrapper 没有真实 overflow：

纯文本
FAIL

如果 document 被撑宽：

纯文本
FAIL
5. 不要求 raw unwrapped MDX table 在 WS-06A PASS

这一点正式澄清：

WS-06A 不把下面这种输入新增为 Core contract：

纯文本
raw MDX <table>
without .table-scroll
must magically become locally scrollable

因为当前源码没有：

纯文本
automatic prose-table wrapper
automatic raw-table overflow adapter

若现在强行把 raw table 设成 required case，大概率得到真实 FAIL，而修复它需要修改 src/**/CSS，已经超出本轮 browser/evidence foundation 的授权。

所以当前 proof scope 是：

纯文本
Core-supported long-table pattern
= .table-scroll

而不是：

纯文本
every arbitrary raw table in prose

如果后续 WS-03/WS-05 决定 Pattern Library 允许作者直接写 raw table，那么应由相应 workstream 明确定义：

纯文本
raw table authoring contract
+
automatic wrapping/overflow behavior
+
assembled browser evidence

不能在 WS-06A 偷偷扩展 Core capability。

6. Fail-closed 规则不变

如果使用现有 .table-scroll 后仍出现：

纯文本
wrapper no overflow
document horizontal overflow
table clipped without local access

则：

纯文本
WS-06A browser row = FAIL
→ STOP

仍然不授权改 CSS。

同样，若 620 的实际 computed styles 与上面源码契约不一致：

纯文本
record actual evidence
→ FAIL / STOP

不能改 oracle 去迁就运行结果。

7. PLAN 中对应段落的正式替换

原 §13 的：

纯文本
table.scrollWidth > table.clientWidth

作废。

正式替换为：

YAML
long_table_browser_contract:
  fixture:
    uses_existing_core_pattern: ".table-scroll"
    inline_overflow_css: forbidden
    source_runtime_change: none

  assertions:
    wrapper_overflow_x: auto_or_scroll
    wrapper_scroll_width_gt_client_width: true
    table_rendered_width_gt_wrapper_client_width: true
    document_horizontal_overflow_lte_px: 1

原 §10 Layout Boundary 对 detail 的：

纯文本
621 → article returns to two-column form

作废。

替换为：

YAML
breakpoint_620:
  shell:
    le_620:
      header_min_height: 74
      brand_descriptor: hidden
    gt_620:
      header_min_height: 88
      brand_descriptor: visible

  detail:
    article_main_layout:
      619: single
      620: single
      621: single
    meta_layout:
      le_620: one_column
      at_621: two_columns

  recovery_404:
    le_620: one_column_recovery_layout
    at_621: split_recovery_layout
当前决定
YAML
WS06A_PREFLIGHT:
  accepted_hash_baseline: PASS
  root_44_files_656_tests: PASS

  correction_620_oracle:
    authorized: true
    runtime_change: false

  correction_table_scroll_oracle:
    authorized: true
    uses_existing_core_capability: true
    raw_table_contract_added: false
    runtime_change: false

  blocked: false
  continue_execution: true

Codex 可以继续原 WS-06A PLAN。 仍只允许既定 15 个 product files；本 amendment 不新增任何 product file，也不授权修改 src/**、CSS、WS-03 或其它 workstream。
