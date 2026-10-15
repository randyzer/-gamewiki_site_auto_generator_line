ChatGPT 说：

[C2C]
STATE: PLAN
TASK_ID: c2c_a765
ITERATION: 10-PREFLIGHT-AMENDMENT
WORKSTREAM: WS-02
VERDICT: CONTINUE — NOT BLOCKED

已核对当前 A3 package-lock.json。你说的情况属实：

纯文本
vitest -> peerDependencies:
  @vitest/browser-playwright: 4.1.11

peerDependenciesMeta:
  @vitest/browser-playwright:
    optional: true

同时我确认 lockfile 中不存在这些实际 resolved package entries：

纯文本
node_modules/@vitest/browser-playwright   NONE
node_modules/@playwright/test             NONE
node_modules/playwright                   NONE

所以之前 PLAN 中的“playwright absent / browser package appears”需要收窄定义。不能再使用 lockfile 全文不得出现 playwright 字符串这种断言。

WS-02 PLAN 正式修订

浏览器依赖约束改成以下四项：

YAML
browser_dependency_gate:

  direct_dependencies:
    package.json:
      "@playwright/test": ABSENT
      "playwright": ABSENT
      "@vitest/browser-playwright": ABSENT

  resolved_packages:
    package-lock.json:
      node_modules/@playwright/test: ABSENT
      node_modules/playwright: ABSENT
      node_modules/@vitest/browser-playwright: ABSENT

  installed_top_level:
    npm_ls_depth_0:
      "@playwright/test": EMPTY
      playwright: EMPTY
      "@vitest/browser-playwright": EMPTY

  dependency_delta:
    package.json: NONE
    package-lock.json: BYTE_IDENTICAL_TO_A3

明确允许：

Vitest 自己在其 peerDependencies / peerDependenciesMeta 中声明的 optional upstream browser peer metadata。

这属于 A3 原始 lockfile 的既存元数据，不等于 WS-02 引入 browser tooling。

原 STOP 条件相应修改

删除：

纯文本
lockfile contains any "playwright" text
→ STOP

替换为：

纯文本
new direct browser dependency appears
→ STOP

new resolved browser package entry appears
→ STOP

new installed top-level browser package appears
→ STOP

package-lock differs from exact A3 preimage
→ STOP

也就是说，我们判断的是：

纯文本
有没有实际新增 dependency / resolution / installation

而不是：

纯文本
字符串 "playwright" 是否存在
Lockfile处理

本轮仍然要求：

纯文本
package-lock.json
before hash == after hash

并且：

不要删除、修改或“清理” Vitest 原有 optional peer metadata。

否则反而会制造无关 dependency delta。

当前决定
YAML
WS02_PREFLIGHT:
  optional_vitest_peer_metadata: ACCEPTED_EXISTING_BASELINE
  direct_browser_dependency: NONE
  resolved_browser_package: NONE
  installed_top_level_browser_package: NONE
  lockfile_change_required: NO

  plan_blocked: false
  continue_same_scope: true

因此 Codex 可以继续原 WS-02 PLAN 的剩余 preflight。Fresh baseline npm run check 完成并满足原计划条件后，可以继续：

纯文本
preflight
→ create v2.7/evolution branch
→ WS-02 bounded edits
→ regression/adoption/CI verification
→ STOP for independent review

其余边界全部不变：不恢复 A4、不加 browser dependency、不进入 WS-03、不 commit/push/tag/merge/release。
