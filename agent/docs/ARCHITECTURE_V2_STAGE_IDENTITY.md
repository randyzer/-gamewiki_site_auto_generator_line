# Agent V2 Stage Identity 规范

状态：P5 编码前冻结候选。本文只定义身份映射，不启用 V2 生产路径。

## 1. 目的

当前代码同时使用 Skill 名称、零基数组序号和 `stage-N` 影子标识。P5 必须先建立唯一、显式、可版本化的映射，避免审批、状态、交接和发布按数组位置各自推断阶段身份。

## 2. 权威身份

V2 的权威键为 `canonicalStageId`。它不包含数组位置，也不直接复用 Skill 名称。

| canonicalStageId | 核心顺序 | Legacy Skill 名称 | 旧数组序号 | 旧 Shadow 别名 | P5 范围 |
| --- | ---: | --- | ---: | --- | --- |
| `homepage-research` | 0 | `game-homepage-icon-research` | 0 | `stage-1` | 核心七阶段 |
| `keyword-research` | 1 | `game-innerpage-keyword-information-research` | 1 | `stage-2` | 核心七阶段 |
| `template-selection` | 2 | `game-site-template-selector` | 2 | `stage-3` | 核心七阶段 |
| `content-integration` | 3 | `game-site-content-integrator` | 3 | `stage-4` | 核心七阶段 |
| `ui-ux-audit` | 4 | `game-site-ui-ux-audit-optimizer` | 4 | `stage-5` | 核心七阶段 |
| `prelaunch-acceptance` | 5 | `game-site-prelaunch-gate` | 5 | `stage-6` | 核心七阶段 |
| `deployment-plan` | 6 | `game-site-deploy-and-measurement` | 6 | `stage-7` | 核心七阶段 |
| `advertising-plan` | 7 | `game-site-adsterra-ad-integration` | 7 | `stage-8` | 明确排除，后续独立迁移 |

映射版本固定为 `stage-identity-v1`。核心七阶段只能从 `STAGES` 建立，广告扩展只能从 `ALL_STAGES` 的显式扩展项建立，二者不得混用。

## 3. 接受边界

### 3.1 新 V2 对象

新 V2 Contract、Commit、Approval、Handoff、Publication 和 Migration Record 只接受 `canonicalStageId`。任何新对象出现 Skill 名称、整数或 `stage-N` 都返回 `STAGE_ID_NON_CANONICAL`。

### 3.2 Legacy Adapter

只有 `stage-identity.mjs` 的兼容入口可以接受以下旧表示：

- Legacy Manifest 的 `stage.skill`：按完整 Skill 名称查表。
- 旧审批票据整数：按明确的零基 `legacyArrayIndex` 查表。
- P3/P4 Shadow fixture 的 `stage-N`：按明确的一基 `shadowAlias` 查表。

调用者必须声明输入命名空间：`legacy-skill-name`、`legacy-array-index` 或 `p3-shadow-alias`。禁止提供一个值后让 Adapter 猜测命名空间。

### 3.3 双向规则

正向转换返回完整身份对象：

```json
{
  "mappingVersion": "stage-identity-v1",
  "canonicalStageId": "keyword-research",
  "legacySkillName": "game-innerpage-keyword-information-research",
  "legacyArrayIndex": 1,
  "shadowAlias": "stage-2",
  "coreStage": true
}
```

反向转换必须指定目标命名空间。任何一对多、缺失、重复或超出版本表的结果都 Fail Closed：

- `STAGE_ID_UNKNOWN`
- `STAGE_ID_AMBIGUOUS`
- `STAGE_ID_MAPPING_VERSION_MISMATCH`
- `STAGE_ID_NAMESPACE_REQUIRED`

## 4. 上下文与摘要

`ExecutionContextDigest`、Approval purpose、Stage Commit、Handoff 和 Publication 的新版本全部绑定：

- `mappingVersion`
- `canonicalStageId`
- `legacySkillName` 仅作为兼容 lineage，不作为授权键

改变映射版本或 canonical ID 必须使相关审批、事务 Intent、Handoff 和发布证明失效。旧对象保留原摘要，不原地重算。

## 5. 依赖规则

P5 的依赖图使用 canonical ID：

```text
homepage-research -> keyword-research -> template-selection
template-selection -> content-integration -> ui-ux-audit
ui-ux-audit -> prelaunch-acceptance -> deployment-plan
```

Stage 2 的受控 PARTIAL 例外固定为：

- `keyword-research -> template-selection / PARTIAL_HANDOFF`
- `keyword-research -> content-integration / PARTIAL_HANDOFF_DRAFT`

其他阶段不得从这两条规则推导 PARTIAL 权限。广告阶段不属于核心依赖图。

## 6. 迁移规则

1. P5-A 先实现只读映射和 Contract 测试，不改 `agent/src/stages.mjs` 的现有输出。
2. P5-C 适配 Attempt 10 时，把 `stage-2` 转为 `keyword-research`，并在新快照记录映射版本与原始值。
3. Shadow 比较同时展示 canonical ID 和 Legacy Skill 名称，但 Legacy 继续权威。
4. V2 Commit 一旦使用 canonical ID 成立，同一 Run/Stage 禁止回到 Legacy 写入。
5. 历史 `wallpaper-engine-002` Manifest 和 fixture 不改写。

## 7. 验收

- 八个定义项的四种身份表示一一对应。
- `0` 与 `stage-1` 都映射首页，但必须通过不同命名空间入口。
- `1` 与 `stage-2` 都映射关键词，但禁止字符串/数字自动猜测。
- 重复 Skill、重复 alias、未知整数和错误 mapping version 全部拒绝。
- 核心 E2E 只枚举七个 `coreStage=true` 项。
- 广告阶段无法因七阶段 gate 变化获得执行、发布或部署权限。
