# 验证记录 — 2026-10-12

三个核心参考页面均实际通过用户 Chrome/CDP 读取与操作。检查了整页桌面 1440px 和移动 390px、所有图片、菜单、语言选择、搜索、Header、Footer 和主要交互。截图保存于 `artifacts/reference/`、`artifacts/browser/`；对照图位于 `artifacts/comparison/`。这些截图属于验证证据，不作为站点图片资源使用。

参考来源：[首页](https://theskinstapler.com/)、[列表](https://theskinstapler.com/guides)、[详情](https://theskinstapler.com/guides/the-skin-stapler-developer)。

实际完成一轮整页对照、定位差异、修正、重新截图。发现旧 Hero 额外使用 brightness(.18)，已按参考页的 saturate(.86)、contrast(1.08) 与渐变覆盖修正；首页图片卡、概览小节、模块顺序已补齐。未通过空白或固定 spacer 人为匹配页面高度。

| 页面 | 视口 | 参考高度 | 实现高度 | 差异 |
|---|---:|---:|---:|---:|
| 首页 | 1440 | 7717 | 7880 | +2.11% |
| 首页 | 390 | 12971 | 13264 | +2.26% |
| 列表 | 1440 | 5009 | 5051 | +0.84% |
| 列表 | 390 | 9390 | 9554 | +1.75% |
| 文章 | 1440 | 5010 | 5093 | +1.66% |
| 文章 | 390 | 7965 | 8188 | +2.80% |

高度仅为辅助证据。首页概览文字长度、文章的原创正文、品牌字宽、预览标记和页脚文案带来差异。模块数量、顺序、容器比例、网格、图片比例及核心间距均逐段核对。原创 SVG 配图的画面细节和色彩与参考截图显著不同，不能宣称像素级相同。

## 实际执行结果

- `pnpm install --prefer-offline`：成功，pnpm lockfile 已生成。
- `pnpm test`：5 项通过，覆盖唯一默认语言路径、语言切换路径、预览与文章链接区别、临时新增 MDX 的自动发现、非法元数据，以及五语言内容结构和最小文章规模。
- `pnpm typecheck`：成功。
- `pnpm build`：成功。15 个内容页全部 SSG；robots、sitemap、icon 为静态产物。
- `pnpm verify:routes`：成功。15 页 HTTP 200，canonical 与每条 hreflang/x-default 路径正确；内部链接及锚点可达；sitemap 恰好 15 个真实页面；预览隔离；英文别名 308；未知路径、无效 locale、未发布预览详情返回 404；robots 存在。
- `CAPTURE_REFERENCE=true pnpm verify:browser`：成功。六张核心页面完整截图及参考截图，其他四语言各三页移动截图；全部图片加载；无横向溢出；首页与列表模块数正确；MDX 表格和七个正文标题渲染；菜单键盘、Esc、aria 状态、搜索结果、Enter 跳转、关闭后焦点返回、语言切换通过；无 console error。
- `pnpm verify:browser`：最终复验成功，退出码 0。五种语言 × 三个核心页面 × 桌面 1440px / 移动 390px，共 30 张完整页面截图；全部图片加载、无横向溢出；模块数量、键盘菜单与 aria 状态、搜索及焦点返回、文章路由、语言切换均通过，无 console error。`artifacts/browser/result.json` 的 `passed` 为 `true`，`errors` 为空。

## 调试过程

假设一：菜单键盘交互失败是状态更新延迟。实验在 Enter 后等待 300ms，状态仍未变化；DOM 点击可正常改变状态。确认 CDP 输入缺少 Enter 字符信息，属于验证脚本的事件模拟问题。最小修复为补充 `text`/`unmodifiedText` 的回车字符；键盘断言随后通过。没有给按钮添加多余的键盘处理。

参考补采曾等待后台图片 decode 超时。实际加载状态显示图片可访问；在自身参考标签切到前台后成功解码并截图。Proxy 的闲置标签曾被自动回收，重新创建自己的参考标签恢复访问，未切换访问渠道。新增 WebSocket 调试连接曾未获当前进程授权；用户确认允许 Chrome 远程调试后继续，未据此推断用户账号未登录。

模板仍为 noindex。没有部署、GA4/GSC、后台服务或额外内容批量生成。索引开关配置已保留，上线时需提供正式域名、设置开关、重新构建。
