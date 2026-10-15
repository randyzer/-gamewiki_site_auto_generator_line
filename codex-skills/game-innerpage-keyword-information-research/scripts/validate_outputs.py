#!/usr/bin/env python3
"""Validate the structural output contract for keyword research."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


REQUIRED_HEADINGS = (
    "## 搜索意图",
    "## Google / 网页素材",
    "## YouTube 素材",
    "## 官方素材",
    "## 交叉验证结果",
    "## 可用于内页的内容框架",
    "## 调研限制",
)
STATUS_RE = re.compile(r"^- 状态: (COMPLETED|PARTIAL|BLOCKED)$", re.MULTILINE)
# Deliberately broad: a lookalike must still be recorded (as 非盗版意图) rather than silently pass.
PIRACY_RE = re.compile(
    r"\b(crack(?:ed|s)?|keygen|hack(?:ed)?|pirat(?:ed|e|es)?|torrent|steamunlocked|mediafire|"
    r"free download|full gratis|gratis|descargar|repack|warez)\b|破解|盗版|免费下载|пират|взлом",
    re.IGNORECASE,
)
DOWNLOAD_HOST_RE = re.compile(
    r"https?://[^\s)]*(mediafire\.com|mega\.nz|steamunlocked|thepiratebay|1337x|rutracker|"
    r"igg-games|fitgirl|uploadhaven|zippyshare|torrent)[^\s)]*",
    re.IGNORECASE,
)


def safe_filename(keyword: str) -> str:
    return re.sub(r'[\\/:*?"<>|\x00]', "-", keyword) + "素材.md"


def raw_terms(text: str) -> list[str]:
    """Keyword-like lines of the raw file: list items and first table cells, minus headers."""
    terms: list[str] = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith(("- ", "* ")):
            terms.append(line[2:].strip())
        elif line.startswith("|") and not re.fullmatch(r"\|[\s:|-]+\|", line):
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            terms.extend(cell for cell in cells[:2] if cell)
    return [term.replace("*", "").strip() for term in terms if term]


def piracy_rows(audit: str) -> dict[str, str]:
    """Map raw keyword -> target keyword from the ## 盗版意图处理 table."""
    section = audit.split("## 盗版意图处理", 1)
    if len(section) < 2:
        return {}
    rows: dict[str, str] = {}
    for line in section[1].split("\n## ", 1)[0].splitlines():
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) >= 2 and cells[0] and cells[0] != "原始关键词" and not set(cells[0]) <= set("-: "):
            rows[cells[0].casefold()] = cells[1]
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workdir", required=True)
    parser.add_argument("--raw-keywords", required=True)
    args = parser.parse_args()

    root = Path(args.workdir)
    errors: list[str] = []
    warnings: list[str] = []
    raw = Path(args.raw_keywords)
    if not raw.is_file():
        errors.append(f"Raw keyword file is missing: {raw}")

    keywords_path = root / "keywords.json"
    if not keywords_path.is_file():
        errors.append("Missing keywords.json")
        data = {"categories": []}
    else:
        try:
            data = json.loads(keywords_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            errors.append(f"Invalid keywords.json: {exc}")
            data = {"categories": []}

    categories = data.get("categories") if isinstance(data, dict) else None
    if not isinstance(categories, list):
        errors.append("keywords.json must contain a categories array")
        categories = []

    all_keywords: list[str] = []
    category_names: list[str] = []
    for idx, category in enumerate(categories):
        if not isinstance(category, dict):
            errors.append(f"Category {idx + 1} is not an object")
            continue
        name = category.get("category")
        keywords = category.get("keywords")
        if not isinstance(name, str) or not name.strip():
            errors.append(f"Category {idx + 1} has no valid name")
            continue
        category_names.append(name.strip())
        if not isinstance(keywords, list) or not all(isinstance(x, str) and x.strip() for x in keywords):
            errors.append(f"Category {name} has an invalid keywords array")
            continue
        if name.casefold() == "codes" and len(keywords) != 1:
            errors.append("Codes category must contain exactly one keyword")
        all_keywords.extend(x.strip() for x in keywords)

    if not any(name.casefold() == "guide" for name in category_names):
        errors.append("Guide category is required")
    folded = [keyword.casefold() for keyword in all_keywords]
    if len(folded) != len(set(folded)):
        errors.append("Duplicate final keywords found")
    if not 10 <= len(all_keywords) <= 20:
        warnings.append(f"Final keyword count is {len(all_keywords)}; confirm the raw input has fewer than 10 or more than 20 valid intents")

    for required in ("关键词处理记录.md", "关键词素材汇总.md"):
        if not (root / required).is_file():
            errors.append(f"Missing {required}")

    for keyword in all_keywords:
        material = root / safe_filename(keyword)
        if not material.is_file():
            errors.append(f"Missing material file for: {keyword}")
            continue
        content = material.read_text(encoding="utf-8")
        if f"- 关键词: {keyword}" not in content:
            errors.append(f"Keyword metadata mismatch in {material.name}")
        if not STATUS_RE.search(content):
            errors.append(f"Missing valid status in {material.name}")
        for heading in REQUIRED_HEADINGS:
            if heading not in content:
                errors.append(f"Missing heading '{heading}' in {material.name}")

    audit_path = root / "关键词处理记录.md"
    if raw.is_file() and audit_path.is_file():
        audit = audit_path.read_text(encoding="utf-8")
        rows = piracy_rows(audit)
        finals = {keyword.casefold(): keyword for keyword in all_keywords}
        for term in raw_terms(raw.read_text(encoding="utf-8")):
            if not PIRACY_RE.search(term):
                continue
            target = rows.get(term.casefold())
            if target is None:
                errors.append(f"Piracy-intent raw keyword '{term}' is missing from the ## 盗版意图处理 table")
                continue
            if "非盗版意图" in audit.split(term, 1)[-1].split("\n", 1)[0]:
                continue
            final = finals.get(target.casefold())
            if final is None:
                errors.append(f"Piracy-intent raw keyword '{term}' points to '{target}', which is not a final keyword")
                continue
            material = root / safe_filename(final)
            if material.is_file() and "## 盗版风险提示" not in material.read_text(encoding="utf-8"):
                errors.append(f"Material for '{final}' needs a ## 盗版风险提示 section (target of '{term}')")
    for keyword in all_keywords:
        material = root / safe_filename(keyword)
        if material.is_file():
            for match in DOWNLOAD_HOST_RE.finditer(material.read_text(encoding="utf-8")):
                errors.append(f"Download or file-hosting link in {material.name}: {match.group(0)}")

    for warning in warnings:
        print(f"WARNING: {warning}")
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
    print(f"OK: {len(all_keywords)} keywords and material files passed structural validation")


if __name__ == "__main__":
    main()
