# 两个游戏站的一手观察

观察日期：2026-10-01（Asia/Taipei）。使用现成 Chrome 浏览器自有后台 tab，读取真实 DOM 与截图。没有外部搜索，也未核实流量、收入或编辑宣称。

## Mini Wars

- 已观察 [首页](https://miniwars.art/)、[指南目录](https://miniwars.art/guides)、[新手文章](https://miniwars.art/guides/beginner-opening-guide)。
- 战术主题一致；首页以玩家任务、策略等级、数据库与版本更新串联发现路径；目录有按玩家水平的阅读次序，文章有实体内链和关联文章。
- 三个样本页没有 img；视觉依赖排版与 CSS。文章有作者、日期、阅读时长、标签，但缺页内目录和媒体。发布日期与修改日期都为 2026-05-06，首页仍称 May 2026 为 live/current。
- 三页未发现广告组件；不能推断商业成绩。SEO 基础齐全，文章有 Article/BreadcrumbList，目录没有 JSON-LD。

## Bomb Farm

- 已观察 [首页](https://bombfarm.wiki/)、[指南目录](https://bombfarm.wiki/guides/)、[入门文章](https://bombfarm.wiki/guides/getting-started/)。
- 首页有两张实际游戏 UI 图片、六个内容 hub、最新列表和编号 Popular、五步入门。目录是带阅读顺序/工具/FAQ 的文章式 hub。
- 文章有题材插画、视频点击预览、可见更新时间、面包屑、sticky TOC、FAQ 与关联阅读。FAQ 点击展开成功。目录点击只确认 hash 改变；后台 tab 中实际滚动未成功确认，需前台复测。
- 三页均有约 91 px 高的空广告横幅预留，未见 creative；Steam CTA 不等于联盟收入。首页 Popular 无统计来源，不能当作流量证据。
- 文章有 Article/BreadcrumbList/FAQPage 与多语 hreflang；首页语言 FAQ 的 JSON-LD 暴露内部生成命令，属于模板残留。

## 可落实到 Starter 的提炼

1. 分类 hub 应提供玩家任务和阅读路径；首页、数据库、文章、版本日志互相链接。
2. 媒体按实机截图、插画、视频预览分别建模，要求来源与用途。
3. 日期与热门声明需有明确数据语义；无统计时显示编辑推荐。
4. 商业 slot 显式开关，空 slot 默认不占首屏空间。
5. 文章模板复用作者/时间/面包屑/TOC/FAQ/相关阅读，并验证真实滚动；清除公开实现残留。

边界：桌面观察；移动端、键盘操作、媒体授权、视频播放、游戏事实、流量、搜索表现、收入均未验证。完整自有结构化观察见同名 JSON。

