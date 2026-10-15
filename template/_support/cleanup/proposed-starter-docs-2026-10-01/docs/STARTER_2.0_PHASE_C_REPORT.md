# Starter 2.0 — Phase C Implementation Report

完成时间：2026-09-03，Asia/Taipei。范围：**Visual Richness ONLY**。

状态：实现、自动化验证及响应式视觉 QA 完成，等待人工评审。未进入 Phase D。

## Approved working baseline

- 仓库：`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.2`。
- 批准基线：`cc2cde87b7e5b93934e9fd18ed2e42e3e585ab71`（`feat: complete starter 2.0 phase B media foundation`）。该提交包含 Phase A、Phase B、Architecture Proposal 及 Phase B Report。
- 本阶段分支：`codex/phase-c-visual-richness`；从批准基线创建，未产生新提交。
- 开工前 `npm run check`：104 个 Astro 文件零诊断，29 个测试文件 / 274 项测试通过。
- Phase C 未发现需要改变 Phase A Navigation/WikiArticle 或 Phase B Media 架构的阻塞。

## 1. Files added

| 文件 | 目的 |
| --- | --- |
| `src/styles/page-families.css` | 将全部受控 Runtime Page Inventory module 映射为唯一 `--page-accent` |
| `docs/STARTER_2.0_PHASE_C_REPORT.md` | 本实施报告；不是新的架构决策 SSOT |

## 2. Files modified

| 文件 | 最小变更 |
| --- | --- |
| `src/styles/theme.css` | 新增 8 个获批 family-role token，默认均回退至主 accent |
| `src/layouts/BaseLayout.astro` | 在 body 输出 `data-page-family={page.module}`；移除硬编码 browser theme-color |
| `src/styles/global.css` | 导入 family mapping；让非文字规则线、导航下划线和媒体边框消费 `--page-accent` |
| `tests/theme.test.ts` | 扩展 module/token/selector/raw-color/layout boundary 回归测试 |

没有修改组件结构，没有删除文件。

## 3. Stable Core files touched

**NONE**。`src/core/*` 无变化。

## 4. Page Inventory changes

**NONE**。Runtime Page Inventory 及其 schema 无变化；没有新增 family 或 page-specific style 字段。

## 5. Final module → token mapping

| `pageModuleSchema` module | 映射决定 |
| --- | --- |
| `core` | 直接 `var(--color-accent)` |
| `guides` | `var(--color-guides, var(--color-accent))` |
| `heroes` | `var(--color-heroes, var(--color-accent))` |
| `weapons` | `var(--color-weapons, var(--color-accent))` |
| `items` | `var(--color-items, var(--color-accent))` |
| `maps` | `var(--color-maps, var(--color-accent))` |
| `tierLists` | `var(--color-meta, var(--color-accent))` |
| `news` | `var(--color-updates, var(--color-accent))` |
| `search` | 直接 `var(--color-accent)` |
| `tools` | `var(--color-tools, var(--color-accent))` |

Theme role tokens 为 `--color-guides`、`--color-heroes`、`--color-weapons`、`--color-items`、`--color-maps`、`--color-updates`、`--color-meta`、`--color-tools`。它们在默认 Starter 中全部指向 `var(--color-accent)`。

测试从真实 `pageModuleSchema.options` 推导完整性。新增 module 而未同步 mapping decision 与 selector 时会失败；`beginner-guides`、`early-game`、`hero-detail` 等任意值仍不是合法 module/family。

## 6. Final `--page-accent` flow

```text
Runtime Page Inventory page.module
  → BaseLayout body[data-page-family]
  → page-families.css explicit selector
  → --page-accent
  → global presentation hooks
```

`BaseLayout` 不接受第二个 family prop，不从 route、slug、cluster、tag、pageType、title 或组件标签派生 family。

当前 `--page-accent` 仅用于非文字视觉钩子：

- desktop active/hover navigation underline；
- Wiki/Editorial article header 3px top rule；
- Guide Hub、Search、Static、Entity Database/Detail、Tool header 3px top rule；
- GameMedia image frame。

小字号 mobile active-nav 与 article eyebrow 保留 `--color-accent-strong`；Guide index number 保留既有 `--color-accent`。因此任意 game family token 不会绕过现有文字对比度。固定 3px rule 对所有相关 family 恒定存在，family override 只改变颜色，不改变几何。

## 7. Raw-color boundary result

**PASS**。

- Game-specific/raw 色值仍只在 `theme.css`。
- `page-families.css` 只包含 10 个受控 selector 和 token/fallback 引用，不含 hex、rgb/hsl、color/lab/lch/oklab/oklch 或 named color。
- 测试对去注释、规范化空白后的 `page-families.css` 全文做唯一结构等价检查，任何额外 selector、rule、declaration 或颜色都会失败，而不依赖一种 selector 写法。
- 已移除 `BaseLayout` 中旧的 `#ee4b20` theme-color meta；没有引入第二个 palette source。

## 8. Tests added/modified

仅修改 `tests/theme.test.ts`：由 2 项扩展到 11 项（新增 9 项）。覆盖：

1. 既有 semantic theme tokens 保留；
2. 全部 approved family token 默认回退主 accent；
3. global stylesheet 导入 theme 与 family mapping；
4. mapping decision 对 `pageModuleSchema` 穷尽；
5. family stylesheet 为唯一纯映射结构；
6. `core` / `search` 明确直接 fallback；
7. raw colors 与任意 family key 被拒绝；
8. `BaseLayout` exact 绑定 `page.module`；
9. stale browser theme-color 移除；
10. 仅受控非文字 hook 消费 `--page-accent`；
11. 小字号文本保持 contrast-safe token。

TDD 证据：初始 10 项中 8 项因 Phase C 能力不存在而 RED，最小实现后 GREEN；对比度回归测试先 RED 再恢复安全 token；测试护栏用临时 rogue selector/raw-color mutation 验证 RED，撤销 mutation 后 GREEN。临时 mutation 无残留。

独立 Spec Review 与 Code Quality Review 均最终 PASS，Critical / Important / Minor 为零。

## 9. Total test result

**PASS：29 个测试文件 / 283 项测试（274 既有 + 9 Phase C）**。

## 10. `npm run validate` result

**PASS**：8 enabled pages，1 content entry。

## 11. `npm run check` result

**PASS**：Astro 检查 104 个文件，0 errors / 0 warnings / 0 hints；29 个测试文件、283 项测试全部通过。

内容同步仍提示默认未启用的空 `meta` / `news` 集合没有匹配文件；与批准基线一致，不是新增诊断。

## 12. `npm run build` result

**PASS**。既有管线 validate → Astro static build → reconcile-output → Pagefind → audit-build 全部通过。

- 8 pages built；
- 最大 HTML 10778 B；
- 引用 CSS 50318 B；
- 引用 JS 189143 B；
- Pagefind output 653297 B；
- 既有构建预算通过。

## 13. Route/output reconciliation result

**PASS：8/8 Runtime Page Inventory routes 精确匹配。** 没有新增或移除正式路由，publication/feature filtering、canonical、sitemap、robots 及 build audit 保持原流程。

## 14. Pagefind result

**PASS**：1 language，4 pages，330 words，0 filters，0 sorts；与 Phase B 基线一致。

## 15. Phase A regression result

**PASS**。原 115 项 Phase A 测试保留并通过；Navigation、WikiArticle、TOC、player-facing metadata、Sources、Related Pages、QuickFacts 与输出规则未改。

浏览器复验 desktop/mobile navigation；390 px 下 menu 和 child group 可展开，1440 px 下 active family underline 正确继承 body token。

## 16. Phase B regression result

**PASS**。原 159 项 Phase B 测试保留并通过；Media schema/catalog/components/validation 未改，Remote Image 仍不支持。

媒体丰富 QA Guide 在 390/768/1440 下保持响应式：390 px hero 347 px，gallery 单列 347 px，iframe 347 × 195.1875 px；更宽视口沿用 Phase B 的自适应 grid 和 16:9 frame。图片加载成功，无媒体正式页面仍不生成媒体 wrapper。

## 17. 390 / 768 / 1440 visual QA result

使用真实生产静态预览，以及不修改正式 Inventory/feature flags 的一次性组件夹具。夹具仅在临时副本把 `--color-guides` 覆盖为 `#176e78` 并接入既有合成媒体，用于证明配置后的 family 差异；生产 theme 默认值未改。

| 视口 | 页面/夹具 | 验证结果 |
| --- | --- | --- |
| 390 × 844 | Media-rich Guide、Tool fixture | Guide 显示克制的 teal header rule；媒体不溢出、iframe 16:9；Tool workspace 347 px、Planner control 成功 hydrate；mobile nav 可展开 |
| 768 × 1024 | Guide Hub、Update fixture、生产 Search | Hub rule 为 teal、Update 使用 `news` fallback、Search 使用 `search` fallback；内容宽度 717 px，无横向溢出 |
| 1440 × 1000 | Homepage、Guide、Entity fixture | Homepage `core` 为主 accent；Guide `guides` 使用 teal；Entity `heroes` 使用默认 fallback；desktop nav 和媒体 frame 正常 |

- Guide override 与默认 fallback 在同一 1440 视口的 article header rect 都为 `[122.5, 175.921875, 1180, 649.328125]`；只改变 `--page-accent` 与规则线/underline 颜色，未产生 layout movement。
- Homepage/Guide/Hub/Entity/Update/Search/Tool 均观察到正确受控 family；默认禁用页面用临时组件 route 检查，没有更改正式 Page Inventory 或 feature flags。
- 小字号 article eyebrow 实测继续使用 `rgb(169, 39, 9)`（`--color-accent-strong`），未被测试用 teal family token覆盖。
- 390/768/1440 检查均无横向溢出；fresh Guide、Search、Tool 浏览器复验没有 console error/warning。
- 临时服务已停止、浏览器视口已恢复、临时目录已删除；没有保留 QA route 或 theme override。

## 18. Homepage

**NOT REPLACED**。`src/pages/index.astro` 与 homepage composition 未改；仅从 BaseLayout 继承 `core` family。

## 19. FAQ

**NOT ADDED**。没有 FAQ component/schema，`src/content.config.ts` 未改。

## 20. Media scope

**NOT EXPANDED**。没有新媒体类型、placement、remote image、尺寸/crop、处理管线或上传能力；仅允许既有媒体图片边框消费 `--page-accent`。

## 21. Dependency/package/lockfile status

**UNCHANGED**。未安装依赖，`package.json`、`package-lock.json` 无变化。

## 22. `git diff --check` result

**PASS**。

## 23. Git status

分支：`codex/phase-c-visual-richness`。

- 4 个已跟踪文件修改：`src/layouts/BaseLayout.astro`、`src/styles/global.css`、`src/styles/theme.css`、`tests/theme.test.ts`；
- 2 个新增文件：`src/styles/page-families.css`、本报告；
- 未暂存。

Stable Core、Page Inventory/schema、Navigation、WikiArticle、Media architecture、Homepage、FAQ/content schema、依赖与 lockfile 无差异。

## 24. Commit status

**NO**。Phase C 未 commit；批准的 Phase B 基线提交保持不变。

## 25. Push status

**NO**。

## 26. Deploy status

**NO**。仅本地验证，没有部署。

Phase C 到此停止，等待人工评审。不得由本报告推定 Phase D 授权。
