#!/usr/bin/env python3
"""Inventory and health-check temp-prefixed game-site templates without modifying them."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any


EXCLUDED_DIRS = {".git", ".next", "node_modules", ".turbo", "coverage", "__pycache__"}
MEDIA_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif", ".mp4", ".webm"}
CONTENT_SUFFIXES = {".md", ".mdx"}
TEST_MARKERS = (".test.", ".spec.")
NAME_PATTERN = re.compile(r"^temp(\d+)_based_.+$")
REQUIRED_ENTRIES = ("package.json", "app", "components")


def visible_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        relative = path.relative_to(root)
        if any(part in EXCLUDED_DIRS for part in relative.parts):
            continue
        if path.is_file():
            files.append(path)
    return sorted(files)


def relative_strings(root: Path, paths: list[Path]) -> list[str]:
    return [path.relative_to(root).as_posix() for path in paths]


def read_package(template: Path) -> dict[str, Any]:
    package_path = template / "package.json"
    if not package_path.is_file():
        return {"_error": "missing package.json"}
    try:
        parsed = json.loads(package_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return {"_error": f"invalid package.json: {exc}"}
    if not isinstance(parsed, dict):
        return {"_error": "package.json root is not an object"}
    return parsed


def inspect_template(template: Path) -> dict[str, Any]:
    files = visible_files(template)
    package = read_package(template)
    routes = [
        path for path in files
        if "app" in path.relative_to(template).parts
        and path.name in {"page.tsx", "page.jsx", "layout.tsx", "layout.jsx", "route.ts"}
    ]
    components = [
        path for path in files
        if path.relative_to(template).parts
        and path.relative_to(template).parts[0] == "components"
        and path.suffix in {".tsx", ".ts", ".jsx", ".js"}
    ]
    content = [
        path for path in files
        if path.relative_to(template).parts
        and path.relative_to(template).parts[0] == "content"
        and path.suffix.lower() in CONTENT_SUFFIXES
    ]
    media = [
        path for path in files
        if path.relative_to(template).parts
        and path.relative_to(template).parts[0] == "public"
        and path.suffix.lower() in MEDIA_SUFFIXES
    ]
    tests = [
        path for path in files
        if any(marker in path.name for marker in TEST_MARKERS)
        or (path.relative_to(template).parts and path.relative_to(template).parts[0] == "tests")
    ]

    return {
        "directory": template.name,
        "absolute_path": str(template),
        "package_name": package.get("name"),
        "package_version": package.get("version"),
        "package_manager": package.get("packageManager"),
        "package_error": package.get("_error"),
        "scripts": package.get("scripts", {}),
        "dependencies": sorted((package.get("dependencies") or {}).keys()),
        "eligible_file_count": len(files),
        "routes": relative_strings(template, routes),
        "components": relative_strings(template, components),
        "content_file_count": len(content),
        "content_examples": relative_strings(template, content[:20]),
        "public_media_count": len(media),
        "public_media": relative_strings(template, media[:50]),
        "test_file_count": len(tests),
        "test_files": relative_strings(template, tests[:50]),
        "has_readme": (template / "README.md").is_file(),
        "transient_directories_present": sorted(
            name for name in EXCLUDED_DIRS if (template / name).exists()
        ),
    }


def check_health(candidates: list[Path]) -> list[str]:
    issues: list[str] = []
    if not candidates:
        issues.append("no immediate temp* template directories were found")

    numbers: dict[str, str] = {}
    for template in candidates:
        match = NAME_PATTERN.fullmatch(template.name)
        if not match:
            issues.append(
                f"{template.name}: name must match temp<number>_based_<reference>"
            )
        else:
            number = match.group(1)
            if number in numbers:
                issues.append(
                    f"{template.name}: duplicate template number {number} also used by {numbers[number]}"
                )
            numbers[number] = template.name

        if template.is_symlink():
            issues.append(f"{template.name}: candidate directory is a symlink")

        for entry in REQUIRED_ENTRIES:
            path = template / entry
            if entry == "package.json":
                valid_type = path.is_file()
            else:
                valid_type = path.is_dir()
            if not valid_type:
                issues.append(f"{template.name}: missing required {entry}")
            elif not os.access(path, os.R_OK):
                issues.append(f"{template.name}: required {entry} is not readable")

        package = read_package(template)
        if package.get("_error"):
            issues.append(f"{template.name}: {package['_error']}")

    return issues


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--template-root", required=True)
    parser.add_argument("--output")
    args = parser.parse_args()

    root_input = Path(args.template_root).expanduser()
    if not root_input.is_absolute():
        raise SystemExit("Template root must be an absolute path")
    root = root_input.resolve()
    if not root.is_dir():
        raise SystemExit(f"Template root does not exist: {root}")
    if not os.access(root, os.R_OK | os.X_OK):
        raise SystemExit(f"Template root is not readable: {root}")

    candidates = sorted(
        path for path in root.iterdir()
        if path.is_dir() and path.name.startswith("temp")
    )
    issues = check_health(candidates)
    result = {
        "schema_version": 3,
        "template_root": str(root),
        "candidate_count": len(candidates),
        "healthy": not issues,
        "issues": issues,
        "templates": [inspect_template(path) for path in candidates],
    }
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"

    if args.output:
        output = Path(args.output).expanduser()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered, encoding="utf-8")
        print(str(output.resolve()))
    else:
        print(rendered, end="")

    if issues:
        for issue in issues:
            print(f"HEALTH ERROR: {issue}", file=sys.stderr)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
