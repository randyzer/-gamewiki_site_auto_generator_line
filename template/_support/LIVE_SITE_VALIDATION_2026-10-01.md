# 原站验证与五案例提炼：2026-10-01

本记录为 c2c_a765 的一手观察输入。真实站验证与本地代码审计分别记录；观察到一个组件不等于组件无缺陷，也不证明流量、SEO 排名或商业收入。

| 案例 | 原站样本 | 本地模式审计 | 状态 |
| --- | --- | --- | --- |
| VV: ULTIMATUM | 首页、/races、/races/best-race | temp1，既有 5_SITE_PATTERN_CAPABILITY_AUDIT.md | 原站三页已读取 |
| Farever | 首页连接 ERR_CONNECTION_CLOSED | temp2，既有本地代码审计 | 原站未取得；等待用户协助 |
| Gamble With Your Friends | 首页、/games/、/games/blackjack/ | temp3，既有本地代码审计 | 原站三页已读取 |
| Mini Wars | 首页、/guides、/guides/beginner-opening-guide | temp4，既有本地代码审计 | 原站三页已读取 |
| Bomb Farm | 首页、/guides/、/guides/getting-started/ | temp5，既有本地代码审计 | 原站三页已读取；TOC 实际滚动待前台复测 |

Farever 失败发生在当前 Chrome 与原站的连接，工具连接和 DOM 操作正常，未看到登录墙或验证码；不能据此认定用户未登录。没有使用公开搜索、第三方 API 或匿名下载替代。**站内数据未取得，不能下市场判断。** 已请求可访问站内链接或用户确认原站能在 Chrome 打开。

## 提炼为可验证的 Starter 能力

- 首页按玩家目标与阶段组织入口；主题 hub 提供阅读路径与覆盖边界，数量从已发布目录计算。
- 真实游戏图片、参考图、插画、视频分别表达用途；来源、授权和游戏识别需要对应证据。CSS 或合成 QA 图片不能代替真实游戏媒体。
- 文章提供快速结论、决策比较、语义日期、目录、FAQ 和下一步阅读；跨页游戏事实复用结构化来源，避免 FAQ 与详情漂移。
- 无统计时用“编辑推荐”，不标造假的热门；日期不自动代表内容仍适用，更新状态须关联证据。
- 商业槽显式配置；空填充不默认占据首屏。原站空 iframe/广告位只证明集成和布局存在。
- 继承统一 SEO 与内容发布机制，避免复制无日期 Article、实现命令泄露、无 title 广告 iframe等原站缺陷。

## 证据与限制

- [VV 观察](case-evidence/case-vv.md)、[结构化记录](case-evidence/case-vv.json)
- [GWYF 与 Farever 观察](case-evidence/cases-a.md)、[结构化记录](case-evidence/cases-a.json)
- [Mini Wars 与 Bomb Farm 观察](case-evidence/cases-b.md)、[结构化记录](case-evidence/cases-b.json)
- [五个本地提炼版的能力审计](5_SITE_PATTERN_CAPABILITY_AUDIT.md)

观察范围为桌面少量页面及 FAQ 点击；移动端、键盘、媒体权利、游戏事实、视频播放、广告收入和用户转化未经本记录验证。需要进一步验收的交互不得填 PASS。真实游戏站 War of Genesis 的既有验收失败记录仍是下一代 Starter 的必要回归输入，不能用本次四站观察替代。
