# 两站一手观察（2026-10-01，Asia/Taipei）

通过用户 Chrome 会话和 web-access 本地浏览器操作完成；没有使用公开搜索或第三方降级。

## farevergame.wiki

原站 https://farevergame.wiki 导航返回 ERR_CONNECTION_CLOSED。后台 tab 和 DOM 操作正常，失败环节是 Chrome 与原站的连接；未确定是原站还是网络链路关闭。没有观察到登录墙/验证码。首页、目录、文章均未取得，因此“站内数据未取得，不能下市场判断”。

## Gamble With Your Friends

观察 [首页](https://gamblewithyourfriends.net/)、由首页 Games 导航进入的[目录](https://gamblewithyourfriends.net/games/)、由目录第一张卡片进入的[文章](https://gamblewithyourfriends.net/games/blackjack/)。

- 首页使用真实游戏场景图、版本状态、四项游戏信息、14 个按玩家意图分类的指南卡片、游戏入口、六项编号提示、12 个可展开 FAQ。首个 FAQ 点击后确实展开。
- 目录展示 14 篇已覆盖指南，用 Floor 分类；页面明确说明官方总数 17 不等于已发布覆盖数。没有观察到目录筛选或搜索。
- 文章有面包屑、Floor/Tier 标记、规则/策略区块、成就、提醒、FAQ、后续入口和可点击原图的策略速查图。该图滚入附近后完成懒加载，尺寸为 2940 像素宽。未观察到文章目录、复制工具或发布时间。
- SEO 有各页 title、description、canonical、OG/Twitter 大图。首页结构化类型为 Organization、WebSite、VideoGame、FAQPage；文章为 Article，但无发布日期/修改日期。目录无 JSON-LD。
- Popular/Rising 是页面标签；未取得支撑热度的统计。AdSense 元素存在，但状态 unfilled 且 0×0，不能描述为可见广告或收入证据。Steam CTA 已观察，未验证联盟收益。

可提炼的产品模式：围绕玩家意图组织入口，目录分类与导航保持一致，文章增加实用参考资产，真实区分总条目与已覆盖条目。应补齐日期/维护来源，并为流行标签、广告状态设显式证据边界。此观察不证明流量、收入、排名或游戏内容准确性。

结构化结果：/tmp/hot-words-c2c-a765-cases-a.json
