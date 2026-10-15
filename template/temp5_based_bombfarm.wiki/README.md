# Quarry Field Guide

使用 Next.js、TypeScript、Tailwind CSS 与真实 MDX 实现的游戏攻略站模板。复刻范围仅为首页、攻略概览、玩法详情；品牌、正文、Logo 和插画均为原创示例。

## 运行

要求 Node.js 22+、pnpm。运行前按 `.env.example` 设置 `.env.local`；模板默认 `noindex, follow`。`SITE_URL` 使用实际站点源地址，`SITE_INDEXABLE=true` 才开启索引；修改后重新构建。

```sh
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
pnpm start
VERIFY_BASE_URL=http://localhost:3000 pnpm verify:routes
```

当前本地生产预览使用 3035 端口，验证命令相应设置 `VERIFY_BASE_URL=http://localhost:3035`。构建时需同时设置正确的 `SITE_URL`。所有字体与图片由本地提供，无广告、分析或追踪脚本。

## 路由与多语言

英文规范地址为 `/`、`/guides/`、`/guides/how-to-play/`；`/en/*` 永久跳转至无前缀英文地址。德语、巴西葡萄牙语、西班牙语和简体中文使用 `/de/`、`/pt-BR/`、`/es/`、`/zh-CN/` 前缀。五种语言共用页面、布局和组件；界面翻译在 `src/lib/messages.ts`，正文独立保存在 MDX 中。

## 添加内容

现有十个 MDX 文件为 `content/{en,de,pt-BR,es,zh-CN}/guides/{index,how-to-play}.mdx`。`index.mdx` 对应概览；其他文件按文件路径生成 slug。支持在 `guides/` 下递归添加小写英文短横线命名的 MDX：

```mdx
---
title: Your guide title
description: A useful description of this guide.
category: Guides
publishedAt: "2026-10-13"
---

## Your first section

Write your original guide here.

<GuideLink slug="guides/how-to-play">Read the starting guide</GuideLink>
```

`faq` 为可选的 `question` / `answer` 数组。不要在正文中执行 JavaScript。构建会校验必需字段、路径、重复路由及非空正文；H2 自动生成锚点和目录。

`discoverContent()` 自动驱动 SSG 路由、相关内容列表、canonical、实际译文 hreflang、x-default 和 sitemap。新文章无需修改 Registry 或路由数量，添加后重新构建即可。预览条目独立于 MDX，为不可点击的 Preview，保留视觉密度但不生成页面、不进入 sitemap。

## 浏览器验证

`pnpm verify:browser` 使用 `scripts/browser-bridge.mjs`，复用 web-access 技能所选择的用户 Chrome 调试端口。它只操作自己创建的后台标签页，结束后关闭这些标签；首次连接可能需要用户在 Chrome 中授权。若无法连接，命令会报错，不会擅自换用另一浏览器。

```sh
node scripts/browser-bridge.mjs
# 保留以上连接，在另一个终端执行：
VERIFY_BASE_URL=http://localhost:3000 pnpm verify:browser
```

可通过 `WEB_ACCESS_SKILL_DIR` 指定技能目录，或 `BROWSER_CDP_URL` 指定已授权的 CDP WebSocket。`BROWSER_BRIDGE_URL` 默认 `http://localhost:3457`。

验证依据同一 MDX / locale 数据源枚举全部真实页面，在 1440px 和 390px 检查语言、图片、目录锚点、内部链接、Preview、菜单状态、键盘操作、FAQ、横向滚动和浏览器错误。英文三个核心页面的全页截图与全部页面的报告保存到 `artifacts/browser/`，该目录不纳入源文件。

## 范围与素材

所有内容页构建阶段静态生成，无请求级 SSR。参考站的广告位仅保留视觉区域；详情页的视频区域是明确标注的原创插画预览，没有伪造可播放视频。原目录为空，未有 Legal、Search 或其他能力需要迁移；未新增额外 Legal、工具或栏目页面。Steam 外链指向参考游戏官方商店，页脚明确说明与原创示例世界的区别。

Logo 为 `public/icon.svg`，矿场插画为 `public/images/quarry-board.svg`。需要替换品牌时请同时修改共享组件、界面字典、MDX、metadata 和插画中的文字。
