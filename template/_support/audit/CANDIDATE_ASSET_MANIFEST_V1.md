# Starter Candidate 全资产有效性清单

日期：2026-10-01。Candidate 保持 `phase-a/core-safety`，HEAD `b067e8d4050478072f25a1dc78a8526cdd128cfd`，工作树 CLEAN。逐文件清单见 [ASSET_MANIFEST_V1.json](ASSET_MANIFEST_V1.json) 的 `candidate` scope。

## 已接受链与当前技术依据

| 快照/增量 | 提交 | 验证边界 |
| --- | --- | --- |
| Frozen V2.6.5 | `29b25559cf2af859bca359c7f7fda686a4803c95` | 原始比较源，原处 CLEAN |
| S1 TL-01 | `a691661b330896f81f28fcac855f0ef9cc1dfccb` | 20 文件，600 additions / 46 deletions，法律投影安全 |
| A1 TL-02 | `a3c1bd31d87321ae40c44933fad8f8649e7f017d` | 15 文件，934 additions / 28 deletions，身份安全 |
| A2 PP-02 | `aad6464b6be1584297866518e2ac036fbd0bd1a4` | 23 文件含 rename，803 additions / 77 deletions，生产残留 |
| A3 AX-01 | `b067e8d4050478072f25a1dc78a8526cdd128cfd` | 3 文件，243 additions，导航实现接受；真实浏览器未证明 |

本次恢复后检查：Astro 0 errors/warnings/hints，Vitest 44 files / 653 tests PASS。此为工程检查，不代表 Next 或真实项目商业验收。

## A. 可复用运行与构建资产

| 路径/组 | 归属 | Next 判断 | 理由与风险 |
| --- | --- | --- | --- |
| src/core/、src/data/schemas/、entity-modules、catalog、Inventory | publication/config/fact/SEO SSOT 与解析/验证 | KEEP IN NEXT STARTER | 防止第二出版数据库、缺数据路由与禁用模块泄露 |
| src/components/、layouts/、pages/ | 已解析数据呈现、实际路由、可选功能 | KEEP IN NEXT STARTER；新增适配在后续审查 | 不复制“参考导航”代替真实 Core；不开启虚构功能 |
| src/styles/ | 已有主题与家族 token、响应式/基础交互 | REVIEW FOR NEXT STARTER | 保留有效样式；字体、密度、形状与适配机制需从问题/案例确认，当前不重写 |
| src/config/ads.ts、ads components | disabled 零输出 + project provider seam | KEEP IN NEXT STARTER | 不把 provider 账户/秘密或多框架搬入 Core |
| scripts/ | validate/build/reconcile/audit/media/Pagefind/patch 工具 | KEEP IN NEXT STARTER | 包含已接受 S1/A1/A2，不恢复项目私有绕过；已知 residue 检查不是所有语言/未知残留的保证 |
| astro.config.ts、tsconfig、vitest、package/lock、.nvmrc | 静态构建、运行与测试契约 | KEEP IN NEXT STARTER | 维持已验证 Node/锁定依赖；package 0.1.0 不表示 Starter 正式版本 |
| game.config.ts、src/data/page-inventory.json、示例内容、logo/favicon | 采用范例与可禁用示例数据 | REVIEW FOR NEXT STARTER | 作为采用/负面测试输入保留；示例不可直接当成生产站 |

## B. 开发说明、测试与发布边界

| 路径/组 | Next 判断 | 当前用途与注意 |
| --- | --- | --- |
| tests/（44 test suites + fixtures/helpers） | KEEP IN NEXT STARTER | 真正回归约束；QA SVG 为合成测试图，不是游戏媒体；新 A4 测试已移出 |
| README、docs/CONTENT_AND_DATA_GUIDE、media/README、PP02、QA、PATCH_WORKFLOW、DEPLOYMENT | REVIEW FOR NEXT STARTER | 当前可用的技术说明，继承版本标题不自动作废；后续需要与 Next 三件套同步 |
| .github/workflows/ci.yml | REVIEW FOR NEXT STARTER | 当前 check 可通过，但 build 仍构建未采用示例，和 A2 新采用契约有冲突；不宣称 CI 全绿，暂停期间不改 |
| wrangler.jsonc | REVIEW FOR NEXT STARTER | 一个部署示例，不表示绑定用户生产资源或唯一平台；最终部署另经授权 |
| .gitignore | KEEP IN NEXT STARTER | 分离依赖/输出/环境值；之后新增测试产物须明确忽略 |

## C. 历史与非交付物

- 16 份 docs 历史架构/迁移/报告 + 2 份根实现报告具有 provenance 价值，提议 **ARCHIVE OUTSIDE STARTER**；目前不改候选，见迁移提案清单。
- `archive/v2.6/` 的两个历史文件保留追溯，最终交付不成为活跃生产指导。
- `.git/` 保留工程历史，不纳入产品文件盘点；不能删除。
- `node_modules/` 是开发缓存，非有效源/交付物；本轮保留现有缓存，离线移除本轮新增 3 个包。
- `dist/`、`.astro/` 为 REMOVE GENERATED；检查可能再生成缓存，最终清理后不冒充验收输出。

所有路径和静态引用见机器清单。当前并未按文件名判断代码无用，也不使用“零引用”作为删除机制。最终产品由准确、已验证版本导出；此目录仍是开发候选。
