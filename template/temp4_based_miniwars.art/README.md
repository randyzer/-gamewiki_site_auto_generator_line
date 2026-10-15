# Frontier Codex 模板

参照 miniwars.art 的首页、攻略列表和攻略正文布局，使用原创虚构品牌 Frontier Ops 与独立文案。技术栈：Next.js 16.4、React 19、TypeScript、Tailwind CSS 4、MDX、pnpm。

## 本地运行

```sh
pnpm install --frozen-lockfile
pnpm dev --port 3104
```

生产预览：

```sh
pnpm build
pnpm start --port 3105
```

默认开发端口为 3000；本次为避开已有进程，分别使用 3104 / 3105。只更新源码后需重新构建生产预览。

## 页面与语言

| 页面 | 默认英文 | 其他语言示例 |
| --- | --- | --- |
| 首页 | `/` | `/de` |
| 攻略列表 | `/guides` | `/de/guides` |
| 开局正文 | `/guides/beginner-opening-guide` | `/de/guides/beginner-opening-guide` |

支持 `en`、`de`、`pt-BR`、`es`、`zh-CN`。英语不加前缀，`/en/*` 永久重定向到唯一英语地址；未知语言与未知文章返回 404。参考站没有语言切换器，因此没有新增可见切换器。

`messages/<locale>.json` 存放界面文案、预览卡片；五种语言共用 `src/components/` 中的三个页面模板、Header、Footer 和卡片，不复制 JSX。

## MDX 内容

完整文章保存在 `content/<locale>/<slug>.mdx`。目前每种语言一篇独立翻译的完整开局指南，其余攻略条目是明确标记的 preview，不生成路由、不进入 sitemap。

新增内容只需在对应语言目录添加 MDX，并重新构建。例如：

```mdx
---
title: A new field report
description: A concise description of this guide.
category: Economy
publishedAt: "2026-10-12"
author: Frontier Codex Team
tags: [economy, planning]
minutes: 5
---

Your complete original article goes here.
```

必需字段为 `title`、`description`、`category`、`publishedAt`，正文不能为空。文件名采用小写英文与连字符。正文经 MDX 编译，禁止可执行 JavaScript；无需二级标题才能成为合法文章。

`src/lib/content.ts` 扫描文件并校验元数据，自动生成文章集合和路由。列表、相关文章、静态参数、sitemap 与 hreflang 复用该集合。仅有翻译文件的语言进入该篇文章的 hreflang；`x-default` 优先英文，否则使用现存语言。新增较新的文章不会改变固定开局入口。

新增语言时，在 `src/lib/i18n.ts` 配置语言并提供同结构字典与完整开局 MDX；验证自动遍历配置语言。

## SEO 与静态生成

复制 `.env.example` 到 `.env.local` 后按部署环境配置：

```dotenv
NEXT_PUBLIC_SITE_URL=https://your-domain.example
SITE_INDEXABLE=false
```

模板默认 `noindex, follow`，robots 禁止抓取；正式索引时将 `SITE_INDEXABLE=true` 并重新构建。站点域名同样在构建时读取。脚本验证时应使用与构建一致的环境值。

所有内容页面通过 `generateStaticParams` 预生成，`dynamicParams=false`，没有请求级 SSR。canonical、hreflang、x-default、robots、sitemap 和文章 JSON-LD 已接入。sitemap 仅包括真实存在的首页、列表和 MDX 正文。

## 验证

```sh
pnpm test
pnpm typecheck
pnpm build
VERIFY_BASE_URL=http://localhost:3105 pnpm verify:routes
```

浏览器验证使用已授权 Chrome 的本机 CDP 连接。先找到当前调试端口，再另开终端启动桥接；如现有桥接仍在运行，直接执行验证即可：

```sh
CHROME_DEBUG_PORT=<当前端口> node scripts/browser-bridge.mjs
VERIFY_BASE_URL=http://localhost:3105 VERIFY_OUTPUT_DIR=docs/verification/final pnpm verify:browser
```

如 Chrome 弹出远程调试授权，需要在 Chrome 点击 Allow。`CHROME_DEBUG_WS_PATH` 可指定实际浏览器 WebSocket 路径，默认 `/devtools/browser`；桥接默认只监听 `127.0.0.1:3467`。可通过 `CDP_BRIDGE_PORT` / `CDP_BRIDGE_URL` 调整两端地址。验证结束后可关闭该桥接进程。

验证从 `discoverRoutes()` 动态枚举内容，未固定文章数或 sitemap 总数。测试会在临时目录添加 MDX 检查自动发现与入口稳定性。浏览器逐篇比较编译后的 MDX 文本，检查全部页面在 1440px / 390px 下的溢出、错误、图像、菜单键盘和 aria 状态，以及首页 → 列表 → 正文跳转。截图仅保留指定三个英文核心页面，新增文章不会覆盖核心截图。

## 交付边界

仅实现三个页面类型。建筑、策略、系统、榜单、兑换码、新闻、补丁及 FAQ 的栏目入口保留参考视觉结构，并标记为不可用预览；搜索保留禁用视觉，没有伪造搜索结果。FAQ 是参考页上的静态问答。没有新增登录、数据库、统计、Legal 页面或发布部署。

项目开始时只有 `.gitignore`，没有旧路由、Legal、搜索或测试可复用；原文件已保留。图标为原创简单 SVG，参考三个页面没有内容图片。

视觉与工程验收详见 `docs/verification/acceptance.md`。完整文件清单见 `docs/changed-files.txt`。
