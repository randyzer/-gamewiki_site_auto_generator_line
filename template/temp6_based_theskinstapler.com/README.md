# Midnight Evidence — reference template V3.2

按 The Skin Stapler 的三个核心参考页面还原布局的内容站模板。品牌、游戏、工作室和正文均为原创虚构占位内容，图片为本地原创 SVG；没有复制参考站源码或专有素材。

## 运行

要求 Node.js 22+、pnpm 12.6.0。

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm start --port 3000
pnpm verify:routes
pnpm verify:browser
```

浏览器验证依赖用户现有 Chrome 的远程调试授权和已安装的 `web-access` 技能，直接连接该 Chrome，不启用匿名浏览器。默认技能目录为 `~/.codex/skills/web-access`；其他安装位置可通过 `WEB_ACCESS_SKILL_DIR` 指定。连接失败会报错，不自动降级。验证只创建并关闭自己的标签。`VERIFY_BASE_URL` 可指定本地服务地址；截图位于 `artifacts/browser/`。可选 `CAPTURE_REFERENCE=true pnpm verify:browser` 会实际访问三个已授权参考 URL，并保存参考截图。默认验证不访问外站。

## 页面与语言

- 首页：`/`
- 指南列表：`/guides`
- 完整开发者文章：`/guides/midnight-evidence-developer`

英文不带语言前缀；`/en` 和 `/en/*` 以 308 跳转到唯一英文地址。德文、巴西葡萄牙文、西班牙文、简体中文分别使用 `/de`、`/pt-BR`、`/es`、`/zh-CN` 前缀。每种语言都有上述三类页面，合计 15 个真实内容页面。

Header、Footer、卡片、概览提示、文章模板和页面实现共用一套。`messages/<locale>.json` 保存 UI、首页及 SEO 文案；`messages/<locale>-topics.json` 只保存未发布主题预览。语言切换保留对应路径及查询、锚点。搜索索引来自当前语言的 MDX 元数据与预览数据，预览结果明确标记，进入列表对应条目。

## MDX 内容

`content/<locale>/<slug>.mdx` 是文章真实内容源。不同语言独立保存；本次只有一篇完整文章的五语言版本。元数据格式：

```mdx
export const metadata = {
  "title": "Article title",
  "description": "Article description",
  "category": "Guide",
  "publishedAt": "2026-10-12"
};

## Heading

Original article content.
```

`lib/content-files.ts` 自动发现文件，`lib/guides.ts` 加载并验证元数据，`generateStaticParams` 在构建时生成真实路由。新增 MDX 后重新构建即可自动接入列表、分类数据、搜索和 sitemap；无需维护文章注册表。新增文件只存在于某种语言时，hreflang 和 sitemap 不会指向未翻译的文章。

列表固定展示 35 个主题，其中 34 个为明确的 Preview。预览不创建详情页，不进入 sitemap；从首页或搜索点击预览只进入本地列表锚点。新增同 slug 的 MDX 会自动替换该预览。

## SEO 与生成策略

所有攻略页面使用 SSG；无请求级 SSR、账户、数据库或分析埋点。canonical、五语言 hreflang、x-default、robots 和 sitemap 已实现。文章的 alternate 只包含实际存在的翻译；sitemap 只包含真实页面。

`.env.example` 提供公开站点 URL 和索引开关。`NEXT_PUBLIC_SITE_URL` 默认为 `http://localhost:3000`；`SITE_INDEXABLE` 只有值为 `true` 才开放索引，默认 noindex 且 robots 禁止抓取。修改这些构建配置后须重新 `pnpm build` 并重启服务。本次保持模板的 noindex 状态，未部署。

## 范围与差异

保留参考首页全部核心模块、4 张引导卡、6 个概览小节、8 个事实块、4 张机制卡、4 张热门卡、6 条 FAQ、侧栏、CTA 和页脚。列表保留 35 个条目；详情包含大图、7 个正文小节、6 行表格、列表、6 条文字 FAQ、3 个相关预览和底部提示区。移动菜单展开会推下正文，搜索支持键盘导航、Enter 和 Esc。

原创 SVG 与参考游戏画面的细节和色彩不同；正文、品牌字宽、语言文本和预览标记造成小幅换行及页面高度差。虚构项目没有真实 Discord、Steam 或预告片，原位置使用本地项目链接与资料库入口。未创建额外 Walkthrough、Story、Legal 页面，未伪造游戏下载或官方账户；Legal 区只保留不可用文字入口。当前目录原本为空，不存在需要保留的既有 Legal、Search 或验证能力；复用了相邻 V3.1 中经检查的本地五语言基础、MDX 和原创素材，未修改相邻目录。

完整文件清单见 `docs/files-changed.md`，验证及尺寸记录见 `docs/verification.md`。
