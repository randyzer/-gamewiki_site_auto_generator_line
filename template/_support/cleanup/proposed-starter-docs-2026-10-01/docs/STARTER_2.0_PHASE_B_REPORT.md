# Starter 2.0 — Phase B Implementation Report

完成时间：2026-09-03，Asia/Taipei。范围：**Media Foundation ONLY**。

状态：实现及验证完成，等待人工评审。未进入 Phase C。

## Approved Phase A baseline

- 仓库：`/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_BASED_gamesop2.2`。
- 开始时 `main` 工作区干净；基线为 `6f1b5bd5a7c79ae776c49ae5272ca098c6177e83`（`phaseA,feat: complete starter 2.0 phase A player-facing foundation`）。
- 本阶段工作分支：`codex/phase-b-media-foundation`。`main` 与当前 HEAD 仍指向同一批准基线，没有新提交。
- `docs/STARTER_2.0_ARCHITECTURE_PROPOSAL.md` 已在基线 Git 中，本阶段未修改。SHA-256：`ada7abb0743843e3d4fe0f66d6c7dffc20076ef4403fa73b3f887ce5a4bb1beb`。
- 开工前实测：25 个测试文件、115 项测试通过；`validate` 通过（8 enabled pages / 1 content entry）；Astro check 93 文件、0 errors / warnings / hints；build 通过，8/8 路由精确对账。
- 基线 Pagefind：4 页、330 词、653297 B；最大 HTML 10795 B，引用 CSS 47908 B，引用 JS 189143 B。
- 未发现需要改变 Phase A 架构的阻塞，故未调整导航、发布模型、事实层、SEO、路由或搜索架构。

## 1. Files added

| 文件 | 职责 |
| --- | --- |
| `src/data/schemas/media.ts` | 严格固定媒体 schema、唯一性、引用和 placement 类型校验 |
| `src/data/media/media.json` | 默认空清单，不预置假游戏素材 |
| `src/data/media/catalog.ts` | 按现有 pageId 连接媒体；不决定页面发布状态 |
| `src/components/media/GameMedia.astro` | 本地图片/视频分派、caption 与来源链接 |
| `src/components/media/VideoEmbed.astro` | 带标题的 lazy、nocookie、16:9 YouTube iframe |
| `src/components/media/ScreenshotGallery.astro` | 自适应图片网格；空数组不输出 markup |
| `scripts/media-validation.ts` | 文件真实路径验证及媒体产物审计，隔离 Node 文件系统依赖 |
| `public/media/README.md` | 素材接入、alt、provenance、人工权利审核与 V1 边界 |
| `tests/media.test.ts` | schema/catalog 合同测试 |
| `tests/media-rendering.test.ts` | 真实 Astro 组件渲染与样式合同测试 |
| `tests/media-audit.test.ts` | 文件、符号链接和输出审计测试 |
| `tests/media-build.test.ts` | 临时目录中的媒体丰富站点完整构建及负向验证 |
| `tests/fixtures/media/media-rich.json` | 仅测试使用的 hero/gallery/trailer 映射 |
| `tests/fixtures/media/qa-overview.svg` | 明确标注为合成 QA 插图，不是游戏截图 |
| `tests/fixtures/media/qa-detail.svg` | 不同比例的合成 QA 插图 |
| `vitest.config.ts` | 使用已安装 Astro/Vite 能力测试真实 Astro 组件；无新依赖 |
| `docs/STARTER_2.0_PHASE_B_REPORT.md` | 本实施报告；不是第二套架构决策 SSOT |

共 17 个新增文件；未删除文件。

## 2. Files modified

| 文件 | 最小变更 |
| --- | --- |
| `scripts/validate-site.ts` | 在既有校验中接入清单、pageId 与本地文件验证 |
| `scripts/audit-build.ts` | 在既有 enabled-page 审计循环中接入媒体输出检查 |
| `src/components/wiki/WikiArticle.astro` | 增加三个可选媒体输入，默认按 pageId 消费 manifest；条件渲染 |
| `src/components/EntityDetail.astro` | 同样接入可选媒体，保留事实、Sources、Related Pages |
| `src/styles/global.css` | 仅增加媒体流式尺寸、网格、caption 与 16:9 iframe 样式 |

共 5 个已跟踪文件修改，均为增量接入，无组件重设计。

## 3. Stable Core files touched

**NONE**。`src/core/*` 无修改。导航仍由 `src/core/site-data.ts` 唯一解析并导出 `resolvedNavigationGroups`。

两个 scripts 是既有验证流程的接入点：仅调用新增媒体校验，不重写发布、导航、SEO 或 exact output reconciliation 算法。

## 4. Page Inventory changes

**NONE**。`src/data/page-inventory.json` 与其 schema 均未改动，未添加 media/layout/FAQ/navigation 字段。

Media Catalog 仅读取已有 Page ID。Manifest 映射不会创建路由、发布页面、改变 visibility/indexability 或启用 feature。允许提前为已存在但未发布的页面准备素材；这些素材仍接受完整校验，不因此产生页面。

## 5. Final Media schema

```ts
type MediaAsset = {
  id: string;
  type: "image" | "video";
  src: string;
  alt: string;
  caption?: string;
  sourceUrl: string;
};

type PageMedia = {
  pageId: string;
  hero?: string;      // image asset ID
  gallery?: string[]; // image asset IDs
  trailer?: string;   // video asset ID
};

type MediaManifest = {
  assets: MediaAsset[];
  pages: PageMedia[];
};
```

实际 schema 使用 image/video discriminated union，拒绝未知字段。仅允许 hero/gallery/trailer，不存在任意 placement DSL。

## 6. Final Media V1 supported types

- 本地图片：`public/media/`，使用 `/media/...` 路径；扩展名支持 PNG/JPG/JPEG/WebP/AVIF/GIF/SVG。
- YouTube：`src` 保存规范 11 字符视频 ID；只渲染 `https://www.youtube-nocookie.com/embed/<id>`。
- 不提供 remote image、上传视频、任意 iframe URL、处理管线、尺寸/crop/移动端素材变体。

## 7. Media validation rules implemented

1. Asset ID 唯一；PageMedia 的 pageId 映射唯一。
2. pageId 必须已存在于 Runtime Page Inventory；所有资产引用必须存在。
3. hero/gallery 仅 image；trailer 仅 video。
4. image src 必须是 `/media/` 下受支持的本地路径；拒绝 HTTP/HTTPS 图片、空目录段、dot/dot-dot、反斜杠、编码路径、query/hash 等非合同输入。
5. CLI 验证所有登记的图片文件，包括尚未使用或只映射到未发布页面的图片；文件必须存在且为普通文件，真实路径不能通过符号链接逃出 media 目录。
6. sourceUrl 必须为绝对 `https://` 来源；拒绝 `https:`/`https:/` 简写以及无效 URL。不探测远端可用性，也不把 provenance 当作法律许可。
7. YouTube ID 格式严格验证；video alt 必须为非空描述性标题。
8. Image alt 必填，排除空白、占位符、泛称与文件名式文本；遵循批准 Proposal，精确的 `alt: ""` 仅表示有意装饰图，由人工确认是否合理。
9. 构建产物检查本地文件、asset ID、图片 src/alt/loading/decoding、caption 来源链接及响应式容器。
10. iframe 检查 nocookie 注册视频、可访问标题、lazy、fullscreen、限定 allow、referrer policy，并拒绝 srcdoc。
11. WikiArticle/EntityDetail 的 hero/gallery/trailer 输出与 pageId 映射数量、顺序一致；拒绝空 wrapper、遗漏或重复 placement。
12. 引号内的 `>`、`&` 和双引号不会导致有效组件输出被审计误判。

NO MEDIA 有效；BROKEN MEDIA REFERENCE 无效。所有构建校验均为确定性本地检查，不发起网络可用性探测。

## 8. Tests added/modified

原 Phase A 的 25 个测试文件未修改，115 项测试全部保留。

| 新增测试文件 | 数量 | 主要覆盖 |
| --- | ---: | --- |
| `tests/media.test.ts` | 129 | schema、唯一性、空清单、ID/类型引用、本地路径、remote 拒绝、YouTube ID、alt、provenance、catalog |
| `tests/media-rendering.test.ts` | 14 | 真实 Astro HTML、图片/视频/gallery、空媒体、WikiArticle/EntityDetail、TOC 边界、转义及审计联合测试 |
| `tests/media-audit.test.ts` | 12 | 文件缺失、symlink 越界、iframe 合同、产物映射与重复 wrapper |
| `tests/media-build.test.ts` | 4 | 隔离媒体丰富构建、路由/Pagefind、导航不变、禁用 entity 不发布、missing-file CLI fail |

TDD：schema/catalog、组件和媒体审计均先观察失败再实现；最终复核的 5 项边界回归也验证了 RED → GREEN。

## 9. Total test result

**PASS：29 个测试文件 / 274 项测试（115 既有 + 159 新增）**。

最终完整执行：2026-09-03 21:03，`npm run check` 中的 `vitest run`。不存在 skip/todo。独立规格审查通过；质量复核发现的 1 项 Important、2 项 Minor 已修复并复验关闭。

## 10. npm run validate result

**PASS**：8 enabled pages，1 content entry。

## 11. npm run check result

**PASS**：Astro 检查 104 个文件，0 errors / 0 warnings / 0 hints；274 项测试通过。

内容同步仍会提示未启用的空 `meta` / `news` 集合没有匹配文件；与基线一致，不是新增类型诊断。

## 12. npm run build result

**PASS**。执行既有管线：validate → Astro static build → reconcile-output → Pagefind → audit-build。

最终生产清单为空。最大 HTML 10795 B；引用 CSS 48957 B；引用 JS 189143 B；既有预算全部通过。

测试隔离副本显式用 `NODE_ENV=production` 构建，避免 Vitest 的 `NODE_ENV=test` 选择开发版 React；未改变产品依赖、构建命令或性能预算。

## 13. Route/output reconciliation result

**PASS：8/8 inventory routes 精确匹配，空媒体与媒体丰富构建均通过。**

原路由不变：`/`、`/404.html`、`/about/`、`/guides/`、`/guides/getting-started/`、`/privacy/`、`/search/`、`/terms/`。

Canonical、sitemap、robots、indexability 及 publication/feature 过滤沿用既有测试与审计。媒体测试额外确认：带媒体映射的禁用 `hero.demo-sentinel` 不生成页面；所有 8 页的桌面/移动导航仍逐项匹配唯一 resolver 输出。

## 14. Pagefind result

**PASS**。生产构建仍索引 4 页 / 330 词 / 1 language，产物 653297 B，与基线相同。

媒体丰富隔离构建仍索引 4 页；沿用既有 search/pagefind 边界，未改变架构或发布规则。

## 15. Empty-manifest result

**PASS**。交付 `media.json` 为 `{"assets":[],"pages":[]}`。实际完整生产构建已验证空清单，不是仅 mock。

## 16. No-media page result

**PASS**。实际 WikiArticle 与 EntityDetail 渲染保留正文/事实、标题、Sources、Related Pages；没有图片、iframe、空媒体 wrapper 或占位符。

生产 guide 在三个视口均无横向溢出；1 个 H1、4 个正文 TOC 条目，媒体 wrapper 数量为 0。媒体代码未改变 body H2/H3 的 TOC 规则。

## 17. Media-rich page result

**PASS**。隔离副本将测试 manifest 和两张合成 SVG 接入 `/guides/getting-started/`：1 张 hero + 2 张 gallery 图片 + 1 个 trailer，三种固定 placement 都正常输出。

Hero eager，gallery lazy；caption/source 可见。实际 EntityDetail 也通过有媒体/无媒体两种 Astro 渲染测试；浏览器代表页为 guide，不声称已浏览未启用的 entity 路由。

测试素材未加入生产 manifest，也未修改正文、Page Inventory 或 feature flags。

## 18. 390 / 768 / 1440 responsive QA result

使用真实静态构建预览与浏览器截图/DOM 尺寸检查；媒体丰富 guide 与空清单 guide 均检查。

| 视口 | Hero 宽度 | Gallery | iframe 宽 × 高 | 结果 |
| --- | ---: | --- | --- | --- |
| 390 × 844 | 347 px | 单列，347 px | 347 × 195.1875 px | PASS |
| 768 × 1024 | 717 px | 双列，各 344.5 px | 717 × 403.3125 px | PASS |
| 1440 × 1000 | 1180 px | 双列，各 576 px | 1180 × 663.75 px | PASS |

- 图片实际加载成功，按自然比例缩放；三个 iframe 都保持 16:9，未越出内容宽度。
- Caption 与 source 链接可阅读、可换行；来源链接最小高度 44 px；未发现横向溢出或空媒体间隙。
- 移动菜单/子组展开正常；无媒体页不生成媒体 markup。
- 浏览器检查未发现 console error/warning；YouTube 测试播放器标题/控件可见。未做视频播放时长、网络稳定性或跨地区可用性承诺。
- 仅验收显示与交互合同；视觉品质、版权、真实游戏事实及隐私合规仍由 Human/SOP 负责。
- 预览服务已停止、视口已恢复；本次两个保留的临时 QA 副本已删除，可由测试重新生成，未删除项目文件。

## 19. Remote Images

**UNSUPPORTED**。HTTP 与 HTTPS remote image src 均拒绝；HTTPS sourceUrl 仅记录本地资产来源。

## 20. FAQ

**NOT ADDED**。没有新增 FAQ.astro，也未改 `src/content.config.ts`。

## 21. Homepage

**NOT REPLACED**。`src/pages/index.astro` 未改；没有 Wiki Portal homepage 实现。

## 22. Phase C

**NOT STARTED**。没有 page-family tokens、视觉变体或 Theme Engine；CSS 仅消费原 token 做媒体基础布局。

## 23. Dependency/package/lockfile status

**UNCHANGED**。未安装依赖，`package.json`、`package-lock.json` 无变更。使用本机既有 Node 22.22.0；测试配置仅启用已安装 Astro 的 Vite/Container 支持。

## 24. git diff --check result

**PASS**。既有修改无空白错误；新增文件另行做等价 whitespace 检查。

## 25. Git status

分支：`codex/phase-b-media-foundation`。5 个已跟踪文件修改 + 17 个新增、未跟踪文件，尚未暂存。

全部文件见第 1、2 节。批准 Proposal、Stable Core、Page Inventory、导航、content schema、homepage、theme tokens、依赖/lockfile 无差异。

## 26. Commit status

**NO**。本阶段没有 commit；Phase A 基线提交保持原样。

## 27. Push status

**NO**。

## 28. Deploy status

**NO**。仅本地测试/临时预览，未部署。

Phase B 到此停止，等待人工评审。下一阶段未获本报告自动授权。
