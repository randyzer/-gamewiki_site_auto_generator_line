# Bomb Farm — First-party source readiness (BF-R1)

日期：2026-10-09 Asia/Taipei。执行：Codex。依据：ChatGPT PLAN63；本次用户明确确认恢复原计划并使用同一官方页面的替代读取。SOURCE / READINESS ONLY；最终采用未接受。

## 本次真实读取

- 官方 URL：[Bomb Farm Steam listing](https://store.steampowered.com/app/4892010/Bomb_Farm/)。游戏名 Bomb Farm，App ID4892010；开发商和发行商均显示 Stream On。
- 本次内置网页读取工具直接打开官方 listing，成功返回正文；不是搜索摘要、第三方榜单或 ChatGPT 先前读取的替代记录。实际读取于2026-10-08 18:28 UTC附近，按项目时区为2026-10-09；不声称浏览器登录或本地 gameplay 验证。
- 工具正文位置：身份 L8–41；简介 L27；About This Game L105–119；版权声明 L147–149。行号仅定位本次工具文本，不是稳定页面锚点或新的运行时字段。
- 之前 Chrome 来源页返回 ERR_TIMED_OUT，未取得正文。失败保留在 `/var/folders/sx/0vw4jt396yj64d3ydl1qls9h0000gn/T/v27-plan63-0h_z6j6y/source-read-failure.log`。本次成功不改写该失败。外部临时日志不是最终交付的唯一长期证据。

## 必需事实盘点

以下为有限英文转述，不复制商店描述。DIRECTLY_SUPPORTED 表示这次官方页面明确描述，不等于实际试玩验证或 Human Approval。

| Question | Bounded claim in own words | Official location | Status | Historical comparison / next-content consequence |
| --- | --- | --- | --- | --- |
| A. Mine/resource loop | An idle RPG uses a bomber squad for resource collection. | Listing summary L27 | DIRECTLY_SUPPORTED | 与旧9月4日记录一致；可解释资源循环，不推导具体收益。 |
| B. Hero/squad roles | Heroes include Attacker, Support, Collector and Specialist roles. | About / squad L107–108 | DIRECTLY_SUPPORTED | 可采用这些真实术语；不编造人物排名、详细属性或最优配队。 |
| C. Team switching | Three teams can be switched to sustain mining. | About / squad L108 | DIRECTLY_SUPPORTED | 中央任务的依据已取得；三张示意卡是选择，不是恢复周期或强制顺序。 |
| D. Forge/equipment | Forging and upgrading equipment are stated game systems. | Summary / gear L27,110–111 | DIRECTLY_SUPPORTED | 可提示检查锻造或装备；不写资源成本、优先级、收益保证或最优顺序。 |
| E. Skill tree | Team progression includes a skill tree with build choices. | About / skill tree L112–113 | DIRECTLY_SUPPORTED | 可提示检查当前节点；不编造节点路线、重置规则或最佳 build。 |
| F. Strategy details | No supported cooldown, switch order or optimal strategy was found in this listing. | Limited read of summary and About L27,105–119 | UNSUPPORTED | 保留“不由此来源证明”的范围，不声称整个游戏不存在这些机制。 |

## 历史与未证明内容

- [旧 RESEARCH_SOURCES](/Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/docs/RESEARCH_SOURCES.md) 和 [旧 PROJECT_BRIEF](/Users/randyz/work/coding/hot_words_web/gameweb/game_bombfarm_v2/docs/PROJECT_BRIEF.md) 是2026-09-04观察记录；原 accessedAt 不变。
- [接受的 BF input diff](/Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-two-game-proof/proof-v2/bomb-farm-input-diff.patch) 与 [已有文章输出](/Users/randyz/work/coding/hot_words_web/template/codex/verifications/v2.7-two-game-proof/proof-v2/outputs/bomb-farm/guides/how-to-play/index.html) 是2026-10-08有限 proof。其发布日期不是来源复核日期。本轮不改旧 Inventory、文章或输出。
- 原指南的“观察→检查可用升级/队伍→观察结果”是编辑建议，不由商店证明为最佳玩法。保留条件语气和完成/停止判断。
- 旧能量恢复描述、具体时间、轮换最优顺序、伤害/成本/掉率或升级收益没有在本轮来源中建立；状态 UNSUPPORTED。旧社区问题、竞品入口与历史报告只能做发现或历史参考。
- 9月4日记录与本次中央任务没有发现直接冲突；这只是本轮有限文本比较，不是全站游戏事实审计。更深机制、确切 UI/输入操作、当前补丁与版本对应仍无证据。

## 媒体与权利

The listing reserves rights and requires written permission for game-content reproduction. No reuse authorization was acquired.

没有下载图片、视频或复制游戏 UI；可访问图片、官方 URL、本地旧文件及旧 PASS 都不是获准使用证据。现有项目原创 three-team diagram 的创建依据在冻结 proof adaptation record；本次不修改、复制或添加素材。Human semantic/visual/rights review 仍 PENDING。官方术语支持不等于对旧截图或视频的许可。

## 可交给下一有限内容切片的输入

仅 A–E 的有限事实及 F 的明确不确定性可支持 guide.how-to-play 的来源标注更新和更具体的人工下一次检查。Source accessedAt 可以在**新采用项目**记录为2026-10-09；它不能冒充 verifiedAt、Human Approval、patch/version 或文章发布日期。具体文章变化、Inventory 字段和 build 必须由下一有限计划批准；本轮只记录事实，不建立新 schema。

未解决：实际 UI/深机制、补丁对应、官方媒体复用许可、Human准确性/识别/权利/政策、实际广告适用及精确新构建审查。最终 PROJECT-BOMBFARM 未接受；WS07=0/3；WS06未关闭；Safari/AX未充分证明；Global PRODUCT/RELEASE未接受。
