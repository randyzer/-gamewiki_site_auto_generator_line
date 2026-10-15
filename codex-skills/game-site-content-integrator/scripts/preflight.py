#!/usr/bin/env python3
"""Read-only preflight for integrating researched content into a copied game site."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Any


REQUIRED_FAVICONS = {
    "apple-touch-icon.png",
    "favicon-32x32.png",
    "favicon-16x16.png",
    "favicon.ico",
    "site.webmanifest",
    "android-chrome-192x192.png",
    "android-chrome-512x512.png",
}
STATUS_RE = re.compile(r"^- 状态: (COMPLETED|PARTIAL|BLOCKED)$", re.MULTILINE)
INVALID_FILENAME = re.compile(r'[\\/:*?"<>|\x00]')


def safe_material_name(keyword: str) -> str:
    return INVALID_FILENAME.sub("-", keyword) + "素材.md"


def is_within(path: Path, parent: Path) -> bool:
    return path == parent or parent in path.parents


def resolve_explicit(path_text: str | None, label: str, errors: list[str]) -> Path | None:
    if not path_text:
        return None
    path = Path(path_text).expanduser()
    if not path.is_absolute():
        errors.append(f"{label} must be an absolute path: {path}")
        return None
    return path.resolve(strict=False)


def resolve_background(
    workspace: Path,
    explicit: str | None,
    errors: list[str],
) -> Path:
    explicit_path = resolve_explicit(explicit, "background directory", errors)
    if explicit_path is not None:
        if not explicit_path.is_dir():
            errors.append(f"background directory does not exist: {explicit_path}")
        elif not is_within(explicit_path, workspace):
            errors.append(f"background directory must be inside workspace: {explicit_path}")
        return explicit_path

    candidates = [
        path.resolve()
        for path in (
            workspace / "backgroundinformation",
            workspace / "background_information",
        )
        if path.is_dir()
    ]
    if len(candidates) == 1:
        return candidates[0]
    if not candidates:
        errors.append(
            "research directory is missing; expected backgroundinformation/ "
            "or legacy background_information/"
        )
        return workspace / "backgroundinformation"
    errors.append(
        "research directory is ambiguous; both backgroundinformation/ and "
        "background_information/ exist; provide --background-dir"
    )
    return workspace / "backgroundinformation"


def resolve_unique_file(
    label: str,
    explicit: str | None,
    expected: Path,
    search_root: Path,
    pattern: str,
    errors: list[str],
) -> Path | None:
    explicit_path = resolve_explicit(explicit, label, errors)
    if explicit_path is not None:
        if not explicit_path.is_file():
            errors.append(f"{label} does not exist: {explicit_path}")
            return None
        return explicit_path

    if expected.is_file():
        return expected.resolve()

    candidates = sorted(
        path.resolve()
        for path in search_root.rglob(pattern)
        if path.is_file() and "__MACOSX" not in path.parts
    ) if search_root.is_dir() else []

    if len(candidates) == 1:
        return candidates[0]
    if not candidates:
        errors.append(f"{label} not found; expected {expected}")
    else:
        errors.append(
            f"{label} is ambiguous; found {len(candidates)} candidates: "
            + ", ".join(str(path) for path in candidates)
        )
    return None


def load_json(path: Path, label: str, errors: list[str]) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"{label} is not valid readable JSON: {path}: {exc}")
        return None
    if not isinstance(value, dict):
        errors.append(f"{label} JSON root must be an object: {path}")
        return None
    return value


def parse_keywords(data: dict[str, Any], errors: list[str]) -> list[dict[str, str]]:
    categories = data.get("categories")
    if not isinstance(categories, list):
        errors.append("keywords.json must contain a categories array")
        return []

    rows: list[dict[str, str]] = []
    seen: dict[str, str] = {}
    for index, category in enumerate(categories, start=1):
        if not isinstance(category, dict):
            errors.append(f"keywords.json category {index} is not an object")
            continue
        name = category.get("category")
        keywords = category.get("keywords")
        if not isinstance(name, str) or not name.strip():
            errors.append(f"keywords.json category {index} has no valid name")
            continue
        if not isinstance(keywords, list):
            errors.append(f"keywords.json category {name} has no keywords array")
            continue
        for keyword in keywords:
            if not isinstance(keyword, str) or not keyword.strip():
                errors.append(f"keywords.json category {name} contains an invalid keyword")
                continue
            canonical = keyword.strip()
            folded = canonical.casefold()
            if folded in seen:
                errors.append(
                    f"duplicate final keyword: {canonical} duplicates {seen[folded]}"
                )
                continue
            seen[folded] = canonical
            rows.append({"category": name.strip(), "keyword": canonical})
    if not rows:
        errors.append("keywords.json contains no final keywords")
    return rows


def validate_zip(path: Path, errors: list[str]) -> dict[str, Any]:
    try:
        with zipfile.ZipFile(path) as archive:
            bad_member = archive.testzip()
            members = [item for item in archive.infolist() if not item.is_dir()]
    except (OSError, zipfile.BadZipFile) as exc:
        errors.append(f"icon ZIP is invalid: {path}: {exc}")
        return {"members": [], "missing": sorted(REQUIRED_FAVICONS)}

    if bad_member:
        errors.append(f"icon ZIP integrity failure: {bad_member}")

    basenames: list[str] = []
    for item in members:
        member_path = Path(item.filename)
        if member_path.is_absolute() or ".." in member_path.parts:
            errors.append(f"icon ZIP contains unsafe path: {item.filename}")
            continue
        basenames.append(member_path.name)

    duplicates = sorted({name for name in basenames if basenames.count(name) > 1})
    if duplicates:
        errors.append("icon ZIP has duplicate basenames: " + ", ".join(duplicates))

    missing = sorted(REQUIRED_FAVICONS - set(basenames))
    if missing:
        errors.append("icon ZIP is missing required members: " + ", ".join(missing))
    return {"members": sorted(basenames), "missing": missing}


def git_state(workspace: Path) -> dict[str, Any]:
    root = subprocess.run(
        ["git", "-C", str(workspace), "rev-parse", "--show-toplevel"],
        text=True,
        capture_output=True,
        check=False,
    )
    if root.returncode:
        return {"is_repo": False, "root": None, "changes": []}

    status = subprocess.run(
        ["git", "-C", str(workspace), "status", "--porcelain", "--", "."],
        text=True,
        capture_output=True,
        check=False,
    )
    changes = [line for line in status.stdout.splitlines() if line.strip()]
    return {
        "is_repo": True,
        "root": root.stdout.strip(),
        "changes": changes,
    }


def write_result(result: dict[str, Any], output: str | None, workspace: Path) -> None:
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if not output:
        print(rendered, end="")
        return
    path = Path(output).expanduser()
    if not path.is_absolute():
        raise SystemExit("--output must be an absolute path")
    resolved = path.resolve(strict=False)
    if is_within(resolved, workspace):
        raise SystemExit("Preflight output must be outside the target workspace")
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(rendered, encoding="utf-8")
    print(str(resolved))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game", required=True)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--background-dir")
    parser.add_argument("--homepage-research")
    parser.add_argument("--icon-zip")
    parser.add_argument("--keywords")
    parser.add_argument("--materials-dir")
    parser.add_argument(
        "--template-root",
        required=True,
        help="Template subtree of the commit-pinned GitHub snapshot used by template-selector",
    )
    parser.add_argument("--allow-dirty-after-confirmation", action="store_true")
    parser.add_argument("--output")
    args = parser.parse_args()

    errors: list[str] = []
    warnings: list[str] = []
    game = args.game.strip()
    if not game:
        errors.append("game name is empty")

    workspace_input = Path(args.workspace).expanduser()
    if not workspace_input.is_absolute():
        errors.append(f"workspace must be an absolute path: {workspace_input}")
    workspace = workspace_input.resolve(strict=False)
    if not workspace.is_dir():
        errors.append(f"workspace does not exist: {workspace}")

    template_root = Path(args.template_root).expanduser().resolve(strict=False)
    if is_within(workspace, template_root):
        errors.append("workspace is inside the immutable template library")

    package_json = workspace / "package.json"
    if not package_json.is_file():
        errors.append("workspace is missing package.json")

    page_roots = [
        path for path in (
            workspace / "app",
            workspace / "src" / "app",
            workspace / "pages",
            workspace / "src" / "pages",
        )
        if path.is_dir()
    ]
    if not page_roots:
        errors.append(
            "workspace has no recognized page root; expected app/, src/app/, pages/, or src/pages/"
        )

    background = resolve_background(workspace, args.background_dir, errors)

    safe_game = INVALID_FILENAME.sub("-", game)
    homepage = resolve_unique_file(
        "homepage research",
        args.homepage_research,
        background / f"{safe_game}攻略站首页调研信息.md",
        background,
        "*攻略站首页调研信息.md",
        errors,
    )
    icon_zip = resolve_unique_file(
        "icon ZIP",
        args.icon_zip,
        background / f"{safe_game}图标.zip",
        background,
        "*图标.zip",
        errors,
    )
    keywords = resolve_unique_file(
        "keywords.json",
        args.keywords,
        background / "keyword-materials" / "keywords.json",
        background,
        "keywords.json",
        errors,
    )

    materials_explicit = resolve_explicit(args.materials_dir, "materials directory", errors)
    materials_dir = materials_explicit or (keywords.parent if keywords else None)
    if materials_dir is None or not materials_dir.is_dir():
        errors.append(f"keyword materials directory does not exist: {materials_dir}")

    selection_report = workspace / "docs" / "TEMPLATE_SELECTION_REPORT.md"
    copy_manifest_path = workspace / "docs" / "template-copy-manifest.json"
    if not selection_report.is_file():
        errors.append(f"template selection report is missing: {selection_report}")
    if not copy_manifest_path.is_file():
        errors.append(f"template copy manifest is missing: {copy_manifest_path}")

    copy_manifest = (
        load_json(copy_manifest_path, "template copy manifest", errors)
        if copy_manifest_path.is_file()
        else None
    )
    if copy_manifest:
        manifest_destination = copy_manifest.get("destination")
        if not isinstance(manifest_destination, str):
            errors.append("template copy manifest has no destination")
        elif Path(manifest_destination).expanduser().resolve(strict=False) != workspace:
            errors.append(
                "template copy manifest destination does not match workspace: "
                f"{manifest_destination} != {workspace}"
            )

    zip_result = validate_zip(icon_zip, errors) if icon_zip else {"members": [], "missing": []}

    keyword_rows: list[dict[str, str]] = []
    material_rows: list[dict[str, str]] = []
    if keywords:
        keyword_data = load_json(keywords, "keywords.json", errors)
        if keyword_data:
            keyword_rows = parse_keywords(keyword_data, errors)

    if materials_dir and materials_dir.is_dir():
        for row in keyword_rows:
            material = materials_dir / safe_material_name(row["keyword"])
            if not material.is_file():
                errors.append(f"missing material file for {row['keyword']}: {material}")
                continue
            text = material.read_text(encoding="utf-8")
            statuses = STATUS_RE.findall(text)
            if len(statuses) != 1:
                errors.append(
                    f"material file must contain exactly one valid status: {material}"
                )
                continue
            material_rows.append({
                **row,
                "file": str(material.resolve()),
                "status": statuses[0],
            })
            if not row["keyword"].casefold().startswith(game.casefold()):
                warnings.append(
                    f"keyword does not start with the supplied game name: {row['keyword']}"
                )

    git = git_state(workspace) if workspace.is_dir() else {"is_repo": False, "root": None, "changes": []}
    confirmation_required = bool(git["changes"]) and not args.allow_dirty_after_confirmation
    if confirmation_required:
        warnings.append("Git worktree has uncommitted changes; user confirmation is required before writes")
    if not git["is_repo"]:
        warnings.append("workspace is not inside a Git repository")

    result = {
        "schema_version": 1,
        "game": game,
        "workspace": str(workspace),
        "page_roots": [str(path.resolve()) for path in page_roots],
        "resolved_inputs": {
            "background_dir": str(background),
            "homepage_research": str(homepage) if homepage else None,
            "icon_zip": str(icon_zip) if icon_zip else None,
            "keywords": str(keywords) if keywords else None,
            "materials_dir": str(materials_dir) if materials_dir else None,
            "template_selection_report": str(selection_report),
            "template_copy_manifest": str(copy_manifest_path),
        },
        "keyword_count": len(keyword_rows),
        "materials": material_rows,
        "icon_zip": zip_result,
        "git": git,
        "confirmation_required": confirmation_required,
        "errors": errors,
        "warnings": warnings,
        "ready": not errors and not confirmation_required,
    }
    write_result(result, args.output, workspace)

    if errors:
        raise SystemExit(2)
    if confirmation_required:
        raise SystemExit(3)


if __name__ == "__main__":
    main()
