# 当前工作区盘点入口

日期：2026-10-01。任务：先理清三件套及两处目录，再重新建立架构蓝图和演进路线。A4 暂停。

- [三件套权威盘点](../audit/TRIAD_AUTHORITY_INVENTORY_V1.md)
- [template 全资产清单](../audit/TEMPLATE_ASSET_MANIFEST_V1.md)
- [Candidate 全资产清单](../audit/CANDIDATE_ASSET_MANIFEST_V1.md)
- [逐文件机器清单](../audit/ASSET_MANIFEST_V1.json)：路径、字节数、哈希、分类、用途、来源、状态、明确引用、动作、删除风险；动态依赖不作完整性保证。
- [真实项目与参考能力证据对应](../audit/REAL_PROJECT_AND_REFERENCE_EVIDENCE_CROSSWALK_V1.md)
- [清理动作清单](../cleanup/CLEANUP_MANIFEST_V1.md)
- [三件套同步决定](../governance/TRIAD_EVOLUTION_DECISION_V1.md)
- [最终交付目录约定](../DELIVERY_LAYOUT.md)

清理前：template 279 + Candidate 189 = 468 个非生成文件，见 [清理前快照](WORKSPACE_INVENTORY_BEFORE_2026-10-01.json)。Candidate 的第 189 个包括未完成 A4 coverage test，现已移出；当前有效源以实时清单为准。

清理后：Candidate 保持 CLEAN at accepted A3；所有源代码、依赖和文档与 A3 一致。旧 dist/.astro 已清除，A4 补丁/测试/RED 日志归档，离线 prune 3 个新增开发包。18 份历史文档迁移只保留提案，待独立审查，不记为已实施。

三处 V2.6.5 HEAD 与清洁状态保持。653 个工程测试与类型检查通过，不代表 A4 浏览器完成、最终版本发布或真实站商业验收。

新蓝图与新路线尚未建立；现存 V1 提案已标历史/暂停。独立审查已 ACCEPT，见 [verification.md](../codex/verifications/goal-reset-2026-10-01/verification.md)。机器清单保留为已审查快照，关闭记录的新增文件/状态更新见 execution closure.json；18 份历史文档当前不搬动。
