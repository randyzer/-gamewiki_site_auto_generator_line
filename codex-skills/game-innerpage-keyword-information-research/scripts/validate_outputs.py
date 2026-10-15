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


def safe_filename(keyword: str) -> str:
    return re.sub(r'[\\/:*?"<>|\x00]', "-", keyword) + "素材.md"


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

    for warning in warnings:
        print(f"WARNING: {warning}")
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
    print(f"OK: {len(all_keywords)} keywords and material files passed structural validation")


if __name__ == "__main__":
    main()
