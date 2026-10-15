# 交付与验收记录

## 修改文件

当前目录原为空目录，以下均为新增文件：

- `.env.example`
- `.gitignore`
- `README.md`
- `app/[[...segments]]/layout.tsx`
- `app/[[...segments]]/page.tsx`
- `app/global-not-found.tsx`
- `app/globals.css`
- `app/robots.ts`
- `app/sitemap.ts`
- `components/article-page.tsx`
- `components/header.tsx`
- `components/home-page.tsx`
- `components/icon.tsx`
- `components/interactive.tsx`
- `components/shared.tsx`
- `content/en/guide/install-and-setup.mdx`
- `content/zh-CN/guide/install-and-setup.mdx`
- `docs/implementation-plan.md`
- `lib/content.ts`
- `lib/headings.ts`
- `lib/i18n.ts`
- `lib/previews.ts`
- `lib/seo.ts`
- `next-env.d.ts`
- `next.config.ts`
- `package.json`
- `pnpm-lock.yaml`
- `postcss.config.mjs`
- `public/images/background.svg`
- `public/images/editor.svg`
- `public/images/galaxy.svg`
- `public/images/helix.svg`
- `public/images/install.svg`
- `public/images/neon.svg`
- `public/images/particles.svg`
- `public/images/performance.svg`
- `public/images/phone.svg`
- `public/images/space.svg`
- `public/images/video.svg`
- `public/images/windows.svg`
- `public/images/workshop.svg`
- `public/logo.svg`
- `scripts/browser-session.ts`
- `scripts/generate-assets.py`
- `scripts/verify-browser.ts`
- `scripts/verify-routes.ts`
- `tests/content.test.ts`
- `tests/routes.test.ts`
- `tests/seo.test.ts`
- `tsconfig.json`

## 核心路由

| 类型 | English | 简体中文 |
| --- | --- | --- |
| 首页 | `/` | `/zh-cn/` |
| 列表 | `/guide/` | `/zh-cn/guide/` |
| 详情 | `/guide/install-and-setup/` | `/zh-cn/guide/install-and-setup/` |

## 已执行验收

- `pnpm test`：14 项通过，包含真实临时 MDX、新分类、译文缺失、无效 metadata、代码块、Setext、重复标题 ID 和真实 MDX 渲染。
- `pnpm typecheck`：通过。
- `pnpm build`：通过，六个核心页面均为 SSG。
- `VERIFY_BASE_URL=http://localhost:4177 pnpm verify:routes`：通过。
- `VERIFY_BASE_URL=http://localhost:4177 pnpm verify:browser`：通过，动态枚举六条路由 × 两个视口；图片、溢出、原生键盘、aria、语言下拉、搜索、焦点恢复、主题、目录锚点和视频预览均检查。
- 代码审查指出的 MDX 目录和新分类展示问题均修复并复核。

浏览器脚本单独记录 17 条 `chrome-extension://invalid/` 请求失败（用户现有浏览器扩展），不隐藏本站的资源错误、异常或 console.error。记录位于 `artifacts/screenshots/environment-warnings.json`。Node 22 的实验性 Type Stripping 警告仍正常输出，不影响退出码。

## 视觉对照

已实际检查三个参考页的完整 Desktop / Mobile，保存首轮截图，定位间距、字体平滑、文案换行和摘要截断差异，修改后重新截图。以下高度仅为辅助证据，没有通过 spacer 或无意义空白补高度。

| 页面 / 视口 | 参考高度 | 首轮实现 | 最终实现 |
| --- | ---: | ---: | ---: |
| home / 1440px | 5729 | 5801 | 5773 |
| home / 390px | 10584 | 10732 | 10580 |
| guide / 1440px | 1561 | 1564 | 1564 |
| guide / 390px | 2501 | 2512 | 2512 |
| guide-install-and-setup / 1440px | 5198 | 5752 | 5276 |
| guide-install-and-setup / 390px | 6677 | 7913 | 6941 |

核对了模块顺序、数量、网格、正文宽度、侧栏、页脚与响应式变化。所有图片均为本地原创素材；Logo、品牌名称、背景、文章和图片主题因内容替换与参考站不同。英文详情页仍因原创段落与表格换行，比参考站长约 78px（桌面）/ 264px（移动）；没有减少原有正文模块。中文文案与英文视觉长度也有自然差异。

完整截图：`artifacts/reference/`（参考）、`artifacts/visual-before/`（修正前）、`artifacts/screenshots/`（最终），完整指标见 `report.json`。这些是本地验收文件，不属于公开网站内容。

## 简化与边界

- 视频保留 16:9 海报与预览弹窗，明确显示未提供原创视频，未实现真实播放。
- 广告保留参考站空间和顶部关闭行为，不加载广告服务。
- Legal 条目标记 Preview，不生成未请求的法律页面。初始目录没有既有 Legal 能力。
- 第三方浮动扩展按钮、跟踪与分析脚本不引入项目。
- 只发布一篇双语完整文章，其余十四个主题是明确标识的静态 Preview，无文章路由、无搜索条目、无 sitemap URL。
- 默认 noindex，`SITE_INDEXABLE=true` 与 `SITE_URL` 在构建前明确配置可切换。未部署、未设置 GSC/GA4。

## 实现方式

多语言共享根布局、页面模板与交互组件；不同 locale 只提供文本、MDX 与 SEO。MDX 递归发现驱动文章、分类、可用译文、路由、搜索和 sitemap；目录与正文 ID 共用 MDX AST 和全局去重规则。验证脚本使用相同真实数据源，不固定文章数、路由数或 sitemap 总数。`/en/` 永久跳转默认英文，缺失页面真实返回 404。canonical、hreflang、x-default、robots 与 sitemap 均经 HTTP 验证。

原项目没有任何代码与既有能力。新增共享组件为 Header、Footer、Breadcrumb、Card、SectionHeading、ArticlePage、FAQ、MobileContents、VideoPreview、AdSlot、ArticleTools、BackToTop、CookieSettings 与 Icon。

开发：`pnpm dev`；生产：`pnpm build`，然后 `pnpm start`。本次验收预览使用 `pnpm start --port 4177`。配置和内容操作详见 `README.md`。
