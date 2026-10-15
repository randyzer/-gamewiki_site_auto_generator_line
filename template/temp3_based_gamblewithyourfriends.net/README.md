# Co-op Fieldnotes

三个页面模板：首页 `/`、攻略列表 `/guide/`、MDX 详情 `/beginner-guide/`。参照 Gamble With Your Friends 攻略站的公共布局，替换为原创品牌、正文和素材。没有复制参考站源代码。

## 本地运行

使用 Node.js 22+ 和 pnpm。当前依赖锁定在 `pnpm-lock.yaml`。

```sh
pnpm install
pnpm dev
```

开发预览：`http://127.0.0.1:3000/`。生产预览：

```sh
pnpm build
pnpm start
```

## 语言和路由

默认英文只有无前缀地址；`/en/` 及其文章别名使用 308 跳转。其余语言使用 `/de/`、`/pt-BR/`、`/es/`、`/zh-CN/` 前缀，后接相同 slug。每种语言都有三类核心页面。参考站没有语言切换器，因此未新增可见切换 UI。

`lib/site.ts` 定义 locale 和路径规则，`lib/messages/*.json` 保存 UI 文案，`content/{locale}/` 保存独立 MDX 正文。所有语言共用 `components/` 和响应式样式。

## 新增 MDX

在 `content/{locale}/{slug}.mdx` 新建文件，支持子目录。slug 使用小写字母、数字和短横线；不能使用 locale 前缀或占用 `/guide/`。

```mdx
---
title: "An Original Guide"
description: "A useful description for the guide list and search metadata."
category: "Basics"
publishedAt: '2026-10-12'
---

## First steps

An original paragraph belongs here.
```

`title`、`description`、`category`、`publishedAt` 为必填项，`updatedAt` 可选。日期必须是合法的 `YYYY-MM-DD` 字符串。`lib/content.ts` 递归发现文件，生成文章、列表入口、分类数据、静态路由、翻译映射与 sitemap。对应语言的内容不存在时，不生成虚假的翻译链接。新增文章后重新构建即可，无需维护 registry。

MDX 可以使用共享的 `Section`、`Step`、`Grid`、`Panel`、`Callout`、`Figure`、`Quota`、`FaqItem`。例如 `<Step number="1" title="Prepare">` 或 `<Grid columns={3}>`。纯数值字面量属性会被安全转换；任意 JavaScript 表达式与导入执行保持禁用。

## 内容范围与素材

每种语言只有一篇完整原创新手文章。首页保留 14 张主题卡、列表保留 6 张主要入口，其余主题显示不可用 preview，无详情路由、无竞争对手跳转、不进 sitemap。新增真实 MDX 会自动补充可用入口。

`casino-original.png` 是生成的原创赌场插画；其他 SVG 是原创示意图，正文图注明确标识。插画替代版权截图，因此图像内容与参考不同，图片比例和视觉位置保留。所有资源及字体均保存在本地，未增加分析统计脚本。

## SEO 配置

参考 `.env.example` 设置环境变量：

```dotenv
SITE_URL=http://localhost:3000
SITE_INDEXABLE=false
```

`SITE_URL` 用于 canonical、hreflang、Open Graph、sitemap 和 robots 的站点来源；上线时替换为实际域名。默认页面 `noindex, follow`，有意开放索引时设置 `SITE_INDEXABLE=true`。robots 允许爬虫读取页面的索引指令。这些内容在构建时生成，修改配置后需要重新构建。`x-default` 优先指向英文，否则指向真实存在的翻译。sitemap 仅枚举实际页面。

## 验证

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm start
pnpm verify:routes
```

路由验证与应用共用 MDX/locale 数据源，检查实际 HTML、canonical、全部翻译映射、索引配置、sitemap、内部链接、图片、404 和英文别名。测试覆盖新增/嵌套 MDX、非法元数据、非法日期、路由冲突和实际 MDX 编译。

浏览器验证需要已授权的 Chrome CDP 连接。使用本机安装的 web-access 技能进行发现，桥接脚本不启动新的 Chrome profile，也不访问其他标签内容：

```sh
node scripts/chrome-cdp.mjs
```

在另一个终端、生产预览运行时执行：

```sh
pnpm verify:browser
```

可用 `WEB_ACCESS_DISCOVERY` 指定已安装的 `browser-discovery.mjs`，`CDP_ENDPOINT` 指定桥接服务，`VERIFY_BASE_URL` 指定本地预览来源。连接失败时先修复原浏览器连接，不自动降级。

验证动态遍历所有页面，在 1440px/390px 检查图片、溢出、页面异常、FAQ、菜单键盘操作和 ARIA，并验证每种语言的首页→列表→文章→首页键盘导航。超长截图分段捕获后合成。只有明确来自 `chrome-extension://` 的扩展错误单独记录，站点错误仍导致失败。

结果：`artifacts/screenshots/*.png` 与 `report.json`。截图是本地验证产物，未放入生产资源或版本控制。视觉对比记录见 `docs/visual-comparison.md`。

## 本次文件清单

- 工程配置：`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`tsconfig.json`、`next-env.d.ts`、`next.config.ts`、`postcss.config.mjs`、`.env.example`、`.gitignore`。
- 应用：`app/layout.tsx`、`app/[[...segments]]/page.tsx`、`app/not-found.tsx`、`app/globals.css`、`app/robots.ts`、`app/sitemap.ts`。
- 组件：`components/header.tsx`、`shared.tsx`、`home-page.tsx`、`guide-page.tsx`、`article-page.tsx`、`mdx-components.tsx`。
- 数据：`lib/site.ts`、`content.ts`、`messages.ts`、`mdx.ts`，以及 `lib/messages/{en,de,pt-BR,es,zh-CN}.json`。
- 正文：`content/{en,de,pt-BR,es,zh-CN}/beginner-guide.mdx`。
- 素材：`public/images/{mark,lobby,table,floors,cosmetics,challenges,recovery}.svg`、`casino-original.png`。
- 验证：`scripts/content.test.ts`、`mdx.test.ts`、`verify-routes.ts`、`verify-browser.ts`、`cdp.ts`、`chrome-cdp.mjs`。
- 文档：`README.md`、`docs/implementation-plan.md`、`docs/visual-comparison.md`。
