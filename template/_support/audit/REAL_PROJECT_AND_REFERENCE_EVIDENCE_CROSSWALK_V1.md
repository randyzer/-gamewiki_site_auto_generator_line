# 真实项目问题与参考能力证据对应

日期：2026-10-01。此处核对已有本地报告与观察记录，没有重新联网实测，也不宣告商业成功或 Next 验收通过。

## 真实采用与失败反馈

| 观察问题/改进 | 所需系统能力 | 责任归属 | 证据来源与边界 |
| --- | --- | --- | --- |
| War of Genesis 构建与技术复验通过，但 Privacy/Terms 仍是草稿、主体/联系不全，上线结论为“不建议上线” | 法律安全默认、显式激活、已知生产残留检查及人工声明责任 | Starter + SOP + Prompt；实际主体由项目提供 | `gameweb/game_warofgenesis/docs/PRELAUNCH_ACCEPTANCE_2026-09-15.md` §结论、2、5；不能自动补造主体或邮箱 |
| War of Genesis 移动菜单 Enter/Space 可用，Escape 不关闭；只有部分减弱动画静态检查 | 真实键盘/focus/断点与 reduced-motion 验证 | Starter + SOP + Prompt | 同报告 §6；A3 已修实现，A4 未完成，不能写 PROVEN |
| War of Genesis 只有 logo、无游戏媒体，泛化表现、OG 图不足 | 有证据的游戏识别、媒体需求决定、分享图能力 | Starter + SOP + Prompt | 同报告 §2、5、人工项；不能为了数量插入无关素材 |
| Builds 没有具体配装、Best Items 正文并非当前物品排行 | 标题承诺与任务答案匹配、范围/时效/证据表达 | SOP + Prompt；通用内容模块由 Starter 提供 | 同报告 §4、人工项；不能通过关键词堆砌或虚构游戏数值解决 |
| Bomb Farm V2 19 条 P0 技术结构成熟，但最初 main 无图片/视频，泛化 hero 与重复卡片缺少游戏识别 | 游戏适配、页面媒体需求、文章节奏和覆盖验收 | Starter + SOP + Prompt | `gameweb/game_bombfarm_v2/docs/VISUAL_MEDIA_GAP_REPORT.md` §1–2；来源可查不等于复用权利 |
| Bomb Farm V2.1 项目层实现 22 个资产/23 个本地文件、真实截图、原始示意图、本地视频；4 路由明确无媒体需求 | 可复用的本地媒体/视频、语义映射、明确 no-media、组合能力 | Starter 实现；SOP/Prompt 约束选择与证据 | `V2_1_VISUAL_MEDIA_ENRICHMENT_REPORT.md` §3–7；其 PASS 是 READY FOR HUMAN VISUAL REVIEW，不是正式人工 PASS |
| Bomb Farm 旧 QA report PASS 与后续视觉 gap BLOCKED BY MEDIA RIGHTS 并存 | 证据时间/阶段/构建身份区分，禁止继承历史人工批准 | SOP + Prompt，Starter 维持 final/evidence 机制 | `PHASE_4_QA_RECONCILIATION_REPORT.md`、`VISUAL_MEDIA_GAP_REPORT.md`、`V2_1_HUMAN_VISUAL_REVIEW_EVIDENCE.md` 的 Review/Final State；不能从较旧 CURRENT_STATUS 的 None 断言现在无阻塞 |
| Bomb Farm 广告槽过深、空间未预留；自动化 Chrome 收到 provider 403，原因未证明 | provider/placement 分离、布局诊断、ordinary-browser/provider 证据与人工处理 | 已有三件套契约保留；未来按缺口增补 | `ADS_MONETIZATION_REPAIR_REPORT.md` §3–5；403 不是“无商业能力”的证据，更不是收入或 viewability 证明 |
| 两项目反复出现项目适配、媒体选择、人工结论与通用实现交错 | 将重复通用缺口提炼至 Starter，游戏内容/证据留在项目 | SOP + Prompt 的分类/回流规则；Starter 承接经验证通用修复 | Master Prompt §40–41；不直接把某个项目整套代码拷回 Starter |

## 五个参考案例的可借鉴能力

| 参考 | 已有观察/本地模式 | 可借鉴能力 | 归属与限制 |
| --- | --- | --- | --- |
| VV ULTIMATUM | 原站首页、races hub、决策比较文章；本地 archive/wiki 导航与 unavailable 状态 | 玩家决策入口、hub→详情→下一步、可解释未上线内容 | 项目 IA + 内容组合；通用发布与导航由 Starter 管理 |
| Farever | 原站连接失败；本地 fantasy 主题、字体层次与 MDX 目录 | 视觉识别与沉浸式组合候选 | 原站数据未取得，不能下市场判断；只记本地模式候选 |
| Gamble With Your Friends | 原站按玩家任务组织 games/blackjack，边界清晰；本地 Quick Answer/steps/mistakes/next step/figure | 面向任务的文章与信息模块 | 可组合能力与游戏内容分离；合成 SVG 不作为实际游戏截图 |
| Mini Wars | 原站学习路径与实体链接；本地 tag related、战术视觉及 Escape/focus 契约 | 阅读路径、关系推荐、系统内容组织与导航回归 | related 不等于 popular；静态 current/live 不是真正时效验证 |
| Bomb Farm 原站 | 原站游戏 UI 图片、视频 facade、TOC、FAQ、related；本地 cover/article shell/Browse Everything | 媒体丰富的文章组合与内容发现 | 原站 TOC 实际滚动仍待复测；广告占位、重复封面和实现命令泄露不可复制 |

来源：`5_SITE_PATTERN_CAPABILITY_AUDIT.md`（五份本地代码，测试未执行）；`LIVE_SITE_VALIDATION_2026-10-01.md` 与 `case-evidence/*`（四个原站桌面观察）。本地实现、原站观察和真实采用验收是三个证据层，不能互换。

临时截图可用性以 `case-evidence/SCREENSHOT_REGISTRY.json` 为准。缺失截图不填 PASS；已有文字观察保留为当时观察记录，不能冒充当前图像复验。

## 后续蓝图必须处理的依据

保留 V2.6.5 可靠的发布/SSOT/SEO/构建/搜索机制；保留已接受 S1/A1/A2/A3 增量。新增能力需能追溯到以上问题或模式，并区分通用机制、生产方法、执行约束、游戏适配和独立验收；本文件不预设阶段顺序或设计方案。
