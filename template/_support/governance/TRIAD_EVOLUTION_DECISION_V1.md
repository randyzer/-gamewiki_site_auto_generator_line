# 三件套同步演进决定

日期：2026-10-01。范围：同步责任判定，不是实现授权、架构蓝图或正式版本定义。

**结论：本次最终产品需要 SOP、Starter、Master Prompt 协同演进并声明兼容组合。** 仅增加技术组件不足以修复真实项目中流程、证据和完成声明的失效。

依据：[权威盘点](../audit/TRIAD_AUTHORITY_INVENTORY_V1.md)、[真实项目与参考证据](../audit/REAL_PROJECT_AND_REFERENCE_EVIDENCE_CROSSWALK_V1.md)、两处资产清单与 [清理清单](../cleanup/CLEANUP_MANIFEST_V1.md)。

| 能力/变化 | 同步分类 | V2.6.5 已有基础与兼容性 | 所需 Next 增量与交付耦合 |
| --- | --- | --- | --- |
| TL-01 法律安全 | ALL_THREE | 人工法律责任保留；技术默认已由 S1 改进 | SOP 说明激活要求，Prompt 执行停止条件，Starter 明确 safe default/adoption；发布组合一致 |
| TL-02 身份安全 | ALL_THREE | 真实声明与来源原则保留；A1 新默认未在旧流程中明确映射 | 显式角色与可见署名/结构化证据协调；不把配置当主体真实性证明 |
| PP-02 残留检查 | ALL_THREE | 原 SOP/Prompt 已要求清除模板；A2 加入自动安全边界 | 同步采用步骤、已知/未知残留边界、final/evidence 区别与检查命令 |
| AX-01 导航验收 | ALL_THREE | 原生导航与可访问性原则保留；A3 仅实现接受 | 行为与真实浏览器证据、支持范围、缺项失败协调；完成 A4 前保持未证明 |
| AX-03 测试命令与证据 | ALL_THREE | 已执行才可 PASS 的规则保留 | 技术 runner/结果、方法要求及执行 Gate 一致；本轮不实现 |
| 游戏适配与模式选择 | ALL_THREE | Official Visual Evidence/Game Recognition 已有 | 技术提供受约束接口，SOP 定义选型与人工依据，Prompt 防止泛化套皮和复制游戏事实 |
| 媒体与分享能力 | ALL_THREE | 来源≠权利，lifecycle/NO MEDIA NEEDED 保留 | 新 schema/renderer 与采用步骤、证据责任、fallback 要求同步；具体方案待蓝图 |
| 标题承诺、内容深度、事实/更新验收 | SOP + PROMPT | 事实层与 Human Content Gate 保留 | 强化玩家任务和可核验答案，不擅自创造数值；若新增通用渲染模块则另行分类其 Starter 增量 |
| 纯 CSS 或既有组件内部缺陷修复 | STARTER_ONLY | 不改变生产方法、流程与责任时可保持兼容 | 只修实现并验证；若改变可见行为/验收要求，重新判断分类 |
| 证据阶段与完成声明治理 | SOP + PROMPT | evidence≠final、人类决定保留 | 防止旧报告 PASS 覆盖后来的 BLOCK/PENDING；维持技术机制，不机械改源码 |
| Inventory SSOT、禁用过滤、准确路由 reconciliation | NO_CHANGE | 已有有效机制 | 作为回归基线保留；目前没有依据重写 |
| Pagefind 产物归一化、静态 SEO 基础 | NO_CHANGE | 已有可验证实现 | 保留并继续回归；不制造项目级绕过 |
| 三件套兼容性与最终验收记录 | ALL_THREE | 现有 exact-provenance 原则保留 | 各工件标明适用版本，兼容性清单绑定准确 commit/tree/hash 与独立验收 |

上述每一行只有一种同步分类；一个能力内部的纯技术补丁与方法变化不能混成“所有工件机械更新”。新模块和新增需求在蓝图阶段再逐项归属，不在本轮越权改写产品契约或能力 ID。

原 V2.6.5 三处保持冻结。现有候选的“技术接受”不表示可以配原 SOP/Prompt 直接发布 Next。具体候选位置和迁移顺序待重新建立路线；最终产品位置见 [DELIVERY_LAYOUT.md](../DELIVERY_LAYOUT.md)。
