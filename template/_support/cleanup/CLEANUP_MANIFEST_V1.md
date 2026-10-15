# 目录清理清单与实际动作

日期：2026-10-01。用户已要求盘点并清除不需要的文件。已执行范围限于未完成的本轮 A4、可再生成输出与状态入口纠正；原始源码/历史提交/独立审查证据不删除。

| 路径/资产 | 动作 | 状态 | 原因、风险与保存证据 |
| --- | --- | --- | --- |
| Candidate 的 A4 package.json / lock 增量 | ARCHIVE | 已保存补丁后恢复 A3 | 仅本轮 Playwright dev delta；归档 manifest 提供哈希，原依赖字节一致 |
| Candidate/tests/core-browser/coverage.test.ts | ARCHIVE | 已移出测试发现范围 | 未完成、依赖不存在；正文与 RED 日志存 `archive/paused-a4/2026-10-01/`，不误计为测试 PASS |
| Candidate/dist/ | DELETE | 已清除 | 未跟踪的旧生成输出；不保留为当前验收证据 |
| Candidate/.astro/ | DELETE | 已清除；检查会再生成缓存 | 可再生成；检查完成后再清除，不纳入有效文件或交付 |
| A4 新装的 3 个开发包 | DELETE | npm prune --offline 已完成 | 依赖清单恢复 A3 后离线清理；不清除既有开发依赖缓存 |
| 系统浏览器缓存 | KEEP | 系统缓存，不属产品 | 没有删除用户共享浏览器资源；不纳入任何浏览器 PASS 声明 |
| 三处原 V2.6.5、Candidate/.git/、A1/A2/A3 提交 | KEEP | 原样保留 | 比较基线和有效成果，不是垃圾 |
| 五份提炼源码、Mini Wars/.git/ | KEEP | 保持路径与内容 | 有追溯价值，不破坏仓库；进入最终包时排除研究源码 |
| case-evidence / 原站观察 | KEEP | 保留文字记录，登记截图可用性 | 不以缺失截图或本地重建图片伪造原站证据 |
| 真实游戏项目文件/验收记录 | KEEP | 原样保留 | 当前只读取，不在其他项目中做清理 |
| Product Contract / 五站审计 / Gap Audit / Core Safety Design | KEEP | 输入，待重规划核对 | 有价值，但文中历史“approved”或“next”不覆盖最新用户要求 |
| S1/A1/A2/A3 execution / verification | KEEP | 原样保留 | provenance 必要，不能删除或改写历史验收正文 |
| 旧 PROJECT_STATE / 三件套关系 / 15 份相关计划快照 | ARCHIVE | 原文保存在 before-goal-reset 归档 | 当前入口已纠正，原文 hash 可核验；历史状态不冒充当前 |
| 旧 V1 蓝图/路线/Phase A prompts | KEEP | 已标暂停/历史 | 引用较多，原路径保留；重审前不能自动执行 |
| Candidate 内 18 份历史架构/迁移/实现报告 | MOVE | **提案，尚未执行** | 从当前生产指导中移出，最终 Starter 包排除；候选此刻保持 CLEAN at A3。提案为逐字节副本与 RELOCATION_MANIFEST，不变更历史正文 |
| Candidate node_modules/ | KEEP | 开发缓存，非交付 | 当前需运行既有检查；依赖由锁文件控制，最终包排除 |

文档搬移曾短暂实施为可逆本地动作，随后按独立审计计划恢复到 A3；不存在已搬移而未记录的源文件。迁移提案位于 `cleanup/proposed-starter-docs-2026-10-01/`。提案正文副本和原文件字节一致，不构成新的权威。

## 不可删除清单

原始输入、有效代码、提交历史、真实项目与参考证据、独立审查记录、Product Contract、仍在用的运行/采用文档。没有按名字“老”“temp”“demo”就删除源码或测试。默认游戏范例和测试夹具具有采用/负面回归用途，不属于可任意删除的生产残留。

## 关闭证据

- A4 patch/test/log 均有 SHA-256；依赖恢复后离线 prune 移除 3 个新增包。
- Candidate 回到 accepted A3，源代码/依赖/文档均无工作树改动。
- 最快文档身份检查：5 tests PASS。
- 完整检查：Astro 0 errors/warnings/hints；44 files / 653 tests PASS。
- 对历史源码、提交或外部状态没有 destructive cleanup；候选历史文档迁移要先独立 review，再按后续任务实施。

本清单及目录有效性结论提交 ChatGPT 独立审查；尚未审查的 proposed MOVE 不记为完成。
