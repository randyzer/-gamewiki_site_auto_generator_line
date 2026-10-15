# WS-06A 有限开发准入修订提案 V1

日期：2026-10-07，Asia/Taipei。状态：PROPOSAL ONLY / ACTIVE ROADMAP UNCHANGED。依据[实际 PLAN19](../../codex/prompts/v2.7-ws06a/iteration19-development-readiness-alternative-plan.md)，本轮仅设计；实际独立审查状态见[执行结果](../../codex/executions/v2.7-ws06a/iteration19/result.md)。

## 问题与选择

原目标仍是基于 V2.6.5 三件套、真实游戏项目缺口和五案例能力，交付商业 V2.7。工具不能提供当前被允许的真实 Safari 控制，用户没有时间手工取证。原路线 §3 明确 WS-03 实施依赖 WS-06A ACCEPT；现有验收器正确拒绝缺失 Safari 证据。目前这个前置也阻止局部工程开发。

| 方案 | 能解决什么 | 代价/决定 |
| --- | --- | --- |
| 完全等待 Safari | 保持原先所有前置 | 工程持续停滞；作为正式验收路径保留，当前不作为唯一开发路径 |
| Chromium/Firefox 直接替代 Safari | 表面可关闭失败 | 跨引擎推断，无法证明 Safari；拒绝 |
| 分离有限开发准入与完整验收 | 有据可查地推进 WS-03 候选；正式验收仍受阻 | 需要失效、逐切片回归与最终复验；本提案推荐 |

此方案解决近期开发停滞，不能保证未来 Safari 通过，也不解决全部人审/权利/真实采用/商业发布问题。以后若真实 Safari 失败，必须修产品并复验，候选可能返工。

## 两条分别记录的路径

现行完整验收路径不变：WS-02 → WS-06A完整ACCEPT → 正式后续Gate → WS-06B → WS-07 → WS-08。

未来拟增加开发入口：WS-02已接受＋精确来源的47矩阵/控制证据 → 单独独立接受的有限开发准入 → 一个 WS-03 候选切片 → 新源的切片证据与47矩阵 → 独立续行决定 → 下一个 WS-03 切片。

这一新入口必须先实施[影响表](ROADMAP_AMENDMENT_IMPACT_MAP_V1.md)的治理修订并独立接受。目前没有生效；写出本提案或接受设计都不能凭本文件开工 WS-03。

## 拟议流程状态

`WS06A_DEVELOPMENT_READINESS` 只是治理记录定位名，不是 Contract ID、Registry字段、生产schema或新规范枚举。拟议记录值为 NOT_EVALUATED、BLOCKED、ACCEPTED_FOR_BOUNDED_DEVELOPMENT、STALE。当前实际值仍为 NOT_EVALUATED；本轮不签发准入。

准入一旦实际成立，可以与 WS-06A BLOCKED、raw37 PASS/10 FAIL、Safari proof0同时存在；不能用它生成 PASS、EXCEPTION、NOT_APPLICABLE、NOT_SELECTED、WAIVED 或 verifiedOutcome。

后续 `IMPLEMENTATION_ACCEPTED_FOR_CONTINUATION` 只描述某切片实现及续行，不关闭主任务/正式契约Gate。WORKSTREAM验收、能力、人审和发布分别记录。

## 第一阶段只允许什么

只允许制定并实施一个 WS-03 有限候选：03A主题、03B媒体/视频、03C分享图（仍依赖03B实际接口）、03D搜索与时效分别处理。顺序优先03A；每次只做一切片，未接受续行不能进入下一片。

不能由这个入口自动解锁04A契约、05组合、04B实例、06B实现/验收、07最终采用、08组装/发布。03B→03C等技术输入依赖仍保持。跨到后续开发范围必须另有具体修订与独立审查，不能称所有后续前置已通过。

## 准入与停止

按[证据要求](WS06A_DEVELOPMENT_READINESS_EVIDENCE_PROFILE_V1.md)与[切片规则](WS03_SLICE_CONTINUATION_RULES_V1.md)，来源可核实、47项完整、非WebKit无失败、每项遗留失败有两引擎对应PASS、已知遗留集合不扩张、准确控制身份且没有新错误，才可由独立审查给出有限准入。

源码/构建/配置或验证身份变化即失效。未知失败、新基础设施错误、漏测/skip、对应结果缺失、断言变弱、来源不匹配或清理失败都停止续行。不能靠按键注入、程序化focus/scroll、Option/Alt、偏好修改、换引擎迎合失败或更换工具绕过访问拒绝。

## 原义务与风险

[Safari阻塞与复验](SAFARI_RELEASE_HOLD_AND_RECONCILIATION_V1.md)持续有效；raw/CI严格规则不变，候选构建成功也不能称可以合并、发布或交付正式release。AX-01/02/03、PA-01状态不提升，所有适用P0/P1仍必须满足。旧Starter已要求商业发布前真实Safari/Chrome/Firefox检查，本方案不删除该义务。

## 有限执行顺序

1. 本轮五文档、实际证据重算及独立设计审查；不改现行路线。
2. 后续有限治理修订：路线＋SOP三个方法入口＋Master Prompt，独立审查；不改Contract/Registry/Starter/runner。
3. 核验当时来源、证据时效和准确40条遗留集合，独立裁定开发准入；不是用本轮审查自动批准。
4. 准入成立后执行03A候选，先定文件和正负例，再定向检查、全量回归、采用/拒绝验证、新47、切片浏览器证据、独立续行；依次推进03切片。
5. 来源稳定且通道允许后，对当时准确构建取得真实Safari证据，完整06A独立验收，并重新核实所有开发态结果，恢复正式路线。

无需用户操作Safari即可完成前三步与获准的候选开发。本方案不能承诺无Safari证据完成商业发布。
