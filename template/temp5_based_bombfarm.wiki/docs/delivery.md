# 交付记录

完成日期：2026-10-13（Asia/Taipei）。范围为 Bomb Farm 参考站首页、攻略概览、玩法详情及其五种语言版本。品牌与内容使用原创 Quarry Field 示例，未批量扩展其他页面。

## 1. 新增及修改文件

原目录为空且无 Git 仓库；以下文件均为本任务新增或修改。

- 工程配置：`.gitignore`、`.env.example`、`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`tsconfig.json`、`next.config.ts`、`postcss.config.mjs`；`next-env.d.ts` 为 Next 自动生成。
- 路由：`src/app/[[...path]]/layout.tsx`、`page.tsx`、`not-found.tsx`，`src/app/global-not-found.tsx`、`robots.ts`、`sitemap.ts`。
- 样式：`src/app/globals.css`，含 Tailwind 4 主题、参考站布局及响应式规则。
- 共享组件：`src/components/header.tsx`、`footer.tsx`、`home.tsx`、`document.tsx`、`primitives.tsx`。
- 数据与内容能力：`src/lib/i18n.ts`、`messages.ts`、`content.ts`、`seo.ts`、`guide-items.ts`。
- MDX：`content/{en,de,pt-BR,es,zh-CN}/guides/index.mdx` 与 `how-to-play.mdx`，共十个独立文件。
- 原创素材：`public/icon.svg`、`public/images/quarry-board.svg`。
- 验证：`tests/content.test.ts`、`scripts/verify-routes.ts`、`scripts/verify-browser.ts`、`scripts/browser-bridge.mjs`。
- 说明：`README.md`、`docs/implementation-plan.md`、本交付记录。
- 浏览器产物：`artifacts/browser/` 首轮截图，`artifacts/browser/final/` 复验截图与 `report.json`；产物目录被 `.gitignore` 排除。

## 2–4. 核心页面与多语言

英文为 `/`、`/guides/`、`/guides/how-to-play/`。其余语言分别使用 `/de/`、`/pt-BR/`、`/es/`、`/zh-CN/` 前缀，当前共十五个内容页面。默认英文无前缀；`/en/*` 永久跳转至规范英文地址。

五种语言共用一套路由、布局、页面模板、组件与响应式 CSS。界面字典在 `messages.ts`，不同语言正文独立保存。语言切换保留当前文章；缺少目标译文时返回该语言的攻略概览。

## 5–8. MDX、自动发现和 Preview

攻略概览与详情正文均由 MDX 渲染，包含 `title`、`description`、`category`、`publishedAt`；FAQ 可选。`discoverContent()` 递归发现 `content/{locale}/guides/**/*.mdx`，由文件路径生成 slug，校验 metadata、内容、路径与重复路由。H2 自动生成目录及唯一锚点。

同一发现结果驱动静态路由、相关内容、实际译文 alternates 和 sitemap。验证脚本也从 `discoverContent()`、`allRoutes()` 与 locale 配置计算真实集合，只固定断言本任务必需的三个核心页面，不固定文章总数。单元测试通过临时新增 MDX 验证自动扩展；无 FAQ 的合法新增文章不要求补 FAQ。添加内容后重新构建即可。

完整 MDX 生成真实页面及内部链接；范围外卡片、栏目与 Legal 条目明确为不可点击 Preview，保持参考密度，不创建虚假路由、不进入 sitemap、不跳转到对标站。Steam 外链指向参考游戏的官方商店，页脚说明其与原创示例的关系。

## 9–12. 渲染、SEO、共享与已有能力

十五个内容页面构建阶段 SSG；没有请求级 SSR。canonical 使用唯一规范地址，hreflang 仅列出实际译文，英文为 x-default。robots 和 sitemap 正常返回，sitemap 与发现的真实路由集合一致。

模板默认 `noindex, follow`。`SITE_URL` 配置站点源地址，`SITE_INDEXABLE=true` 开启索引；修改后重新构建。当前验证构建使用 `SITE_URL=http://localhost:3035`，未开启正式索引。

共享 Header、Footer、Logo、SteamButton、Cards、FAQ、正文模板、目录、Breadcrumb 和 Container。原目录没有 Legal、Search、内容库或测试能力；未删除已有能力，也没有添加额外 Legal、搜索、栏目或工具页面。

## 13. 全页视觉验收与差异

实际读取参考的三个页面及 1440/390px 全页截图和 DOM 样式。首页保留 Hero、四项统计、介绍与六项事实、六张 Hub、六张精选、六条更新、六条热门、五个步骤、十一条浏览入口、七项 FAQ、CTA 和 Footer。攻略概览保留五个正文 H2，详情保留七个正文 H2、八条界面列表及视频区域；两者都有四项 FAQ、六张相关推荐。

完成“参考 → 首轮本地全页截图 → 定位差异 → 修正 → 再截图”。修正了 Header 导航居中、下拉条目数量、卡片/页脚标题字体字号及五种语言概览六条列表的位置。1440px 三列卡片及正文 944px / TOC 256px 比例、390px 单列与隐藏侧栏、16:9 图片和主要纵向间距均保留。

| 页面 | 宽度 | 参考高度 | 最终高度 | 差值 |
| --- | ---: | ---: | ---: | ---: |
| 首页 | 1440 | 7466 | 7478 | +12 |
| 首页 | 390 | 12323 | 12356 | +33 |
| 攻略概览 | 1440 | 4474 | 4562 | +88 |
| 攻略概览 | 390 | 6746 | 7041 | +295 |
| 玩法详情 | 1440 | 5595 | 5830 | +235 |
| 玩法详情 | 390 | 7847 | 8431 | +584 |

高度仅为辅助证据，没有增加空白 Spacer 来匹配总高度。确认仍有以下差异：原创 Logo、品牌、插画和正文；更长的示例标题及正文使部分换行和文档高度增加；Preview 状态代替真实链接；语言菜单有五种语言。桌面参考首轮截图中的懒加载图片为空，但手机参考截图能确认图片位置与比例；本地原创图片均已加载。未宣称逐像素一致。

最终英文全页文件：`home-{1440,390}.png`、`guides-{1440,390}.png`、`guides-how-to-play-{1440,390}.png`，位于 `artifacts/browser/final/`。

## 14. 简化及未实现

视频区域为标注清楚的原创静态预览，不提供播放。广告区域只保留视觉占位，无广告网络脚本。范围外主题和 Legal 为 Preview。没有添加登录、数据库、评论或实时接口；没有部署或配置 GA4/GSC。

## 15. 实际验证

| 命令 | 最终结果 |
| --- | --- |
| `pnpm test` | 通过，5/5；MDX 扩展、非法 metadata、URL 规则、唯一标题锚点 |
| `pnpm typecheck` | 通过 |
| `SITE_URL=http://localhost:3035 pnpm build` | 通过；15 个内容路由 SSG，robots/sitemap 静态生成 |
| `pnpm start --port 3035` | 正常启动 |
| `VERIFY_BASE_URL=http://localhost:3035 pnpm verify:routes` | 通过；动态路由、canonical、实际 hreflang/x-default、索引配置、robots、sitemap、英文跳转与 404 |
| `VERIFY_BASE_URL=http://localhost:3035 pnpm verify:browser` | 首轮通过，15 路由 × 2 视口 |
| `VERIFY_BASE_URL=http://localhost:3035 BROWSER_ARTIFACT_DIR=artifacts/browser/final pnpm verify:browser` | 修正后复验通过，15 路由 × 2 视口，六张最终全页截图 |

浏览器检查包括 html lang、H1、图片加载、Unicode 目录锚点、真实内部链接、Preview、桌面下拉 Enter/Escape、语言菜单键盘和焦点恢复、手机菜单状态与辅助名称、FAQ 键盘展开/收起；无横向滚动、明显主内容溢出、console error 或 runtime exception。

早期 CDP 新连接握手超时，用户授权后恢复。首轮键盘检查曾失败，诊断确认验证桥后台页面焦点及 Enter 事件参数不完整；启用后台焦点模拟并补回车文本后，真实键盘事件与全部验收通过。没有忽略失败或未经授权降级工具。

## 16. 开发与构建

```sh
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
pnpm start
```

本地预览端口 3035 的完整运行方式：

```sh
SITE_URL=http://localhost:3035 pnpm build
pnpm start --port 3035
VERIFY_BASE_URL=http://localhost:3035 pnpm verify:routes
```

浏览器验证先运行 `node scripts/browser-bridge.mjs` 并保留连接，再在另一终端运行 `VERIFY_BASE_URL=http://localhost:3035 pnpm verify:browser`。技能路径与 CDP 配置说明见 README。本次结束后关闭验证桥，保留本地预览。
