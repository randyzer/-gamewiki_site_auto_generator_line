# V2.6.5 三件套权威盘点

日期：2026-10-01。范围：一级本地文件、契约责任和已接受增量；不新建技术架构或实施路线。

## 权威入口

| 工件 | 当前本地 HEAD | 规范入口与已核对条款 |
| --- | --- | --- |
| SOP | `9a13b7314b9cb102b0c440d9677ab22400109e8f` | `PACKAGE_MANIFEST.json` → `docs/NEW_GAME_SITE_SOP_v2.6.5.md`；Step 0/研究/覆盖/视觉媒体/QA/发布维护；EXECUTION_PROMPT、QA、媒体与人工视觉模板 |
| Master Prompt | `f655a0e08529060be8b716330ffcecf489a4484d` | `CodexMasterPrompt_v2.6.5Final.md`；§0 权威、§2 项目边界、§12–15 媒体视觉与人工规划、§26–35 QA/人工/发布、§40–47 回流与证据规则 |
| Starter 冻结比较源 | `29b25559cf2af859bca359c7f7fda686a4803c95` | README、运行时配置/数据、构建审计、被生产流程引用的技术文档；功能按准确代码证明 |
| Starter 工程候选 | `b067e8d4050478072f25a1dc78a8526cdd128cfd` | S1/A1/A2/A3 的代码、测试及独立验收记录；A4 暂停，不是最终版本 |

上述 HEAD 是本地快照，不替代 release tag。V2.6.5 原文件仍明确继承已发布冻结 V2.6.4 的 provenance，不能把目录名理解为当前发布状态。

## 能力责任与冲突核对

| 能力/边界 | SOP 权威 | Master Prompt 权威 | Starter 权威 | 当前冲突或同步需求 |
| --- | --- | --- | --- | --- |
| 研究与覆盖 | 主 SOP 研究/Competitive Coverage/Minimum Wiki Coverage，来源模板 | §7–11、§15 执行及人工 Gate | 只渲染已批准内容 | 保留；不能由 Starter 自动决定覆盖 |
| 路由与出版状态 | 主 SOP Step 0，Page Inventory 模板 | §17、§32 统一 Inventory 与 reconciliation | catalog、page-resolution、reconcile-output | 保留单一 SSOT；不把媒体或参考模式变为第二发布数据库 |
| 法律激活 TL-01 | 法律准确性与人工责任 | 禁止虚构、人工发布 Gate | legal-safety、可选法律路由与 activation | 补齐新默认/激活要求；禁止旧模板默认公开 |
| 结构化身份 TL-02 | 来源与声明责任 | §0/§42–44、发布证据 | 显式 identity、SEO 图与公开署名审计 | Next 文档需反映候选新默认；技术配置不证明主体声明真实 |
| 生产残留 PP-02 | 视觉模板已有 Template Residue Audit，QA 已要求替换示例 | §21 已要求清除/中和残留，§38 上线复查 | 已接受的固定残留检查、source/output/assets/Pagefind 覆盖 | 已有原则，新增的是自动检查及 final/evidence 边界，不能误说旧 SOP 完全没有残留要求 |
| 导航 AX-01 | 导航覆盖与可访问性验收 | §18/§27/§28 执行检查 | 原生 details、Escape/focus 控制及窄 DOM 测试 | A3 只接受实现，真实浏览器证据未完成 |
| 浏览器 AX-03 | QA 支持范围与人工检查责任 | §27/§44/§45 只能报告已执行检查 | 后续测试命令和结果由实现提供 | 未完成；不能把计划矩阵或单元测试当浏览器 PASS |
| 游戏识别与视觉适配 | Official Visual Evidence、Game Recognition、人工视觉模板 | §13–15/§21/§28–30 | theme、page families、Core components | 旧要求有价值；未来适配能力与流程须协调，不能只换颜色 |
| 媒体 | 媒体需求、来源/权利、人类决定、生命周期 | §12/§20/§26.1 明确不推断权利或转化审批 | manifest/schema/render/validation/readiness | 现有 provider/尺寸等约束仍有效；新能力不能绕过 lifecycle 或挤入 Inventory |
| 搜索、SEO | SEO spec、QA、Pagefind 预算契约 | §26–27/§38/§41 | SEO/静态搜索/归一化与产物审计 | 保留；不恢复项目私有绕过脚本 |
| 商业槽 | monetization 方法、requested/rendered/viewable、Human Ads Review | §7.1/§16.1/§27.1 | disabled 零输出、semantic placement、ProjectAd seam | 集成不等于填充或收入；保留 provider 与 placement 分离 |
| 内容价值、更新 | 玩家任务、事实层、patch maintenance、Human Content Gate | §8/§28/§32/§39 | 内容模型、日期、关系、呈现 | 标题承诺、真实热门/最新需项目证据；不能生成虚假的完整度 |
| 发布与三件套版本 | 人工发布及维护 | §3/§34–38/§46 准确版本与授权 | 只提供可验证输出 | Next 必须声明三件套兼容组合，技术 PASS 不替代人工发布 |

## 文档有效性

- SOP manifest 的 27 个列入文件逐项存在；历史材料与当前方法权威分开。模板标题保留 v2.6.2 不自动判废，它们可能承载被 v2.6.5 继续采用的 subsystem 契约。
- Master Prompt 当前单一入口与 `archive/` 历史版本分开。
- Starter 的历史 2.0 架构、旧迁移和报告不能成为 Next 权威；其有效性与移出建议见 Candidate 资产清单。
- 本次与当前用户规则有冲突时，以用户授权/联网降级规则为准；旧版“approved fallback”不提供自动降级授权。

正式同步分类见 [TRIAD_EVOLUTION_DECISION_V1.md](../governance/TRIAD_EVOLUTION_DECISION_V1.md)。
