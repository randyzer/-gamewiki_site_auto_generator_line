# Output contract

## `keywords.json`

The file contains only the category structure below. Keep exact final-keyword spelling consistent across every output.

```json
{
  "categories": [
    {
      "category": "Guide",
      "keywords": ["Game Name beginner guide"]
    },
    {
      "category": "Codes",
      "keywords": ["Game Name codes"]
    }
  ]
}
```

Rules:

- Valid UTF-8 JSON; no comments or trailing commas.
- 10–20 keywords when the input provides that many valid intents.
- `Guide` category is mandatory.
- Category names are specific and mutually exclusive.
- No keyword appears more than once.
- `Codes`, when present, has exactly one keyword.
- Keywords are English, prefixed with the canonical game name, and ordered by expected demand.

## `关键词处理记录.md`

Use this structure:

```markdown
# 关键词处理记录

- 游戏名: ...
- 原始关键词文件: ...
- 处理日期: YYYY-MM-DD
- 原始关键词数: ...
- 最终关键词数: ...

## 保留与规范化

| 原始关键词 | 最终关键词 | 处理 | 依据 |
| --- | --- | --- | --- |
| ... | ... | 保留/翻译/纠错/统一主题名 | ... |

## 同义词合并

| 被合并关键词 | 保留关键词 | 依据 |
| --- | --- | --- |
| ... | ... | ... |

## 排除项

| 原始关键词 | 原因 |
| --- | --- |
| ... | 核心主词/非本游戏主题 |
```

Every source entry from the raw file must appear exactly once in one of these sections, allowing multiple raw terms to map to one final keyword.

## `{keyword}素材.md`

Use the exact final keyword plus `素材.md` as the filename. Preserve spaces. If a keyword contains a filesystem-forbidden character, replace only that character with `-` and record the filename mapping in the audit file.

```markdown
# {keyword} 素材

- 游戏名: ...
- 关键词: ...
- 状态: COMPLETED | PARTIAL | BLOCKED
- 调研日期: YYYY-MM-DD
- 建议复核日期: YYYY-MM-DD or 按版本更新复核

## 搜索意图

用 1–3 句说明玩家要解决的问题，不写最终文章。

## Google / 网页素材

### 来源 1：页面标题

- URL: https://...
- 来源类型: 官方/Wiki/攻略
- 发布或更新日期: YYYY-MM-DD / 页面未标注
- 访问日期: YYYY-MM-DD
- 适用版本: ... / 未标注
- 关键信息:
  - ...
- 可靠性备注: ...

## YouTube 素材

### 来源 1：视频标题

- URL: https://www.youtube.com/watch?v=...
- 频道: ...
- 发布日期: YYYY-MM-DD
- 访问日期: YYYY-MM-DD
- 字幕类型: 人工字幕/自动字幕/无可用字幕
- 适用版本: ... / 未标注
- 字幕时间点:
  - `00:00:00` ...
- 关键信息:
  - ...
- 可靠性备注: ...

## 官方素材

同网页来源字段。没有有效官方材料时明确写“未找到与该关键词直接相关的公开官方说明”。

## 交叉验证结果

### 已确认

- 事实：...
  - 证据：来源 1 + 来源 2

### 存在差异

- 争议点：...
  - 来源 1：...
  - 来源 2：...
  - 当前处理：采用... / 待确认

### 待确认

- ...

## 可用于内页的内容框架

- H2 主题建议：...
- 可回答的问题：...

## 调研限制

- ...
```

Omit empty repeated source subsections, but keep the major headings. Do not turn the outline into finished page prose.

## `关键词素材汇总.md`

```markdown
# 关键词素材汇总

| 关键词 | 分类 | 状态 | 网页来源数 | YouTube来源数 | 官方来源数 | 待确认项 | 文件 |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| ... | ... | COMPLETED | 2 | 1 | 1 | 0 | ...素材.md |

## 运行级问题

- 无 / Serper quota / YouTube throttling / 其他...
```

Counts include only sources actually opened and used, not search-result snippets.
