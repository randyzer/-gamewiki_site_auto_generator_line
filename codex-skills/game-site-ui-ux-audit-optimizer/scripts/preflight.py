#!/usr/bin/env python3
"""Read-only preflight for game-guide UI/UX audit and optimization."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


TEMPLATE_ROOT = Path("/Users/randyz/work/coding/hot_words_web/template")
PAGE_ROOTS = ("app", "pages", "src/pages")
UPSTREAM_DOCS = (
    "docs/TEMPLATE_SELECTION_REPORT.md",
    "docs/template-copy-manifest.json",
    "docs/CONTENT_INTEGRATION_REPORT.md",
    "docs/CONTENT_PAGE_MANIFEST.json",
    "docs/CONTENT_PROVENANCE.md",
    "docs/CONTENT_GAPS.md",
)


def is_within(path: Path, parent: Path) -> bool:
    return path == parent or parent in path.parents


def load_json(path: Path, label: str, errors: list[str]) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"{label} is unreadable or invalid JSON: {path}: {exc}")
        return None
    if not isinstance(value, dict):
        errors.append(f"{label} JSON root must be an object: {path}")
        return None
    return value


def git_state(workspace: Path) -> dict[str, Any]:
    root = subprocess.run(
        ["git", "-C", str(workspace), "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
        check=False,
    )
    if root.returncode:
        return {"is_repo": False, "root": None, "changes": []}
    status = subprocess.run(
        ["git", "-C", str(workspace), "status", "--porcelain", "--", "."],
        capture_output=True,
        text=True,
        check=False,
    )
    return {
        "is_repo": True,
        "root": root.stdout.strip(),
        "changes": [line for line in status.stdout.splitlines() if line.strip()],
    }


def detect_framework(package: dict[str, Any]) -> str:
    deps: dict[str, Any] = {}
    for key in ("dependencies", "devDependencies"):
        value = package.get(key)
        if isinstance(value, dict):
            deps.update(value)
    if "next" in deps:
        return "nextjs"
    if "astro" in deps:
        return "astro"
    if "react" in deps:
        return "react"
    return "unknown"


def detect_playwright(workspace: Path) -> bool:
    result = subprocess.run(
        ["node", "-e", "try{require.resolve('playwright');process.exit(0)}catch(e){process.exit(1)}"],
        cwd=workspace,
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0


def valid_url(value: str | None) -> bool:
    if not value:
        return False
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def classify_route(route: str) -> str:
    clean = route.lower()
    if route == "/":
        return "home"
    if "code" in clean:
        return "codes"
    if "tier" in clean:
        return "tier-list"
    if "beginner" in clean:
        return "beginner-guide"
    if clean.rstrip("/") in {"/guides", "/wiki", "/classes", "/races", "/builds", "/bosses", "/items"}:
        return "list"
    if any(token in clean for token in ("/guides/", "/wiki/", "/classes/", "/races/", "/builds/", "/bosses/", "/items/")):
        return "detail"
    if "privacy" in clean or "terms" in clean:
        return "legal"
    return "other"


def discover_manifest_routes(workspace: Path, warnings: list[str]) -> list[dict[str, str]]:
    path = workspace / "docs" / "CONTENT_PAGE_MANIFEST.json"
    if not path.is_file():
        return []
    errors: list[str] = []
    data = load_json(path, "content page manifest", errors)
    if errors:
        warnings.extend(errors)
        return []
    pages = data.get("pages") if data else None
    if not isinstance(pages, list):
        warnings.append("content page manifest has no pages array")
        return []
    routes: list[dict[str, str]] = []
    seen: set[str] = set()
    for page in pages:
        if not isinstance(page, dict) or page.get("outcome") != "PUBLISHED":
            continue
        route = page.get("route")
        if not isinstance(route, str) or not route.startswith("/") or route in seen:
            continue
        seen.add(route)
        routes.append({
            "route": route,
            "archetype": classify_route(route),
            "reason": "published content manifest",
        })
    return routes


def choose_representatives(
    manifest_routes: list[dict[str, str]],
    explicit_routes: list[str],
) -> list[dict[str, str]]:
    chosen: list[dict[str, str]] = [
        {"route": "/", "archetype": "home", "reason": "required"}
    ]
    seen = {"/"}

    for route in explicit_routes:
        normalized = route if route.startswith("/") else "/" + route
        if normalized not in seen:
            seen.add(normalized)
            chosen.append({
                "route": normalized,
                "archetype": classify_route(normalized),
                "reason": "explicit",
            })

    if explicit_routes:
        return chosen

    preferred = ("list", "codes", "tier-list", "beginner-guide", "detail")
    for archetype in preferred:
        match = next(
            (item for item in manifest_routes if item["archetype"] == archetype),
            None,
        )
        if match and match["route"] not in seen:
            seen.add(match["route"])
            chosen.append(match)

    if len(chosen) == 1 and manifest_routes:
        first = manifest_routes[0]
        if first["route"] not in seen:
            chosen.append(first)
    return chosen


def write_result(
    result: dict[str, Any],
    output: str | None,
    workspace: Path,
) -> None:
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if not output:
        print(rendered, end="")
        return
    path = Path(output).expanduser()
    if not path.is_absolute():
        raise SystemExit("--output must be an absolute path")
    path = path.resolve(strict=False)
    if is_within(path, workspace):
        raise SystemExit("preflight output must be outside the target workspace")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(rendered, encoding="utf-8")
    print(path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game", required=True)
    parser.add_argument("--workspace", required=True)
    parser.add_argument(
        "--mode",
        choices=("audit-only", "audit-and-optimize"),
        default="audit-only",
    )
    parser.add_argument("--authorize-optimize", action="store_true")
    parser.add_argument("--allow-dirty-after-confirmation", action="store_true")
    parser.add_argument("--browser-tool-available", action="store_true")
    parser.add_argument("--url")
    parser.add_argument("--route", action="append", default=[])
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

    if is_within(workspace, TEMPLATE_ROOT.resolve(strict=False)):
        errors.append("workspace is inside the immutable template library")

    package_path = workspace / "package.json"
    package = load_json(package_path, "package.json", errors) if package_path.is_file() else None
    if not package_path.is_file():
        errors.append(f"workspace is missing package.json: {package_path}")

    roots = [
        str((workspace / root).resolve())
        for root in PAGE_ROOTS
        if (workspace / root).is_dir()
    ]
    if not roots:
        errors.append("no recognized page root; expected app/, pages/, or src/pages/")

    scripts = package.get("scripts", {}) if package else {}
    if not isinstance(scripts, dict):
        scripts = {}
    launch_script = next(
        (name for name in ("preview", "dev", "start") if isinstance(scripts.get(name), str)),
        None,
    )
    framework = detect_framework(package or {})

    if args.url and not valid_url(args.url):
        errors.append(f"invalid audit URL: {args.url}")
    dependencies_installed = (workspace / "node_modules").is_dir()
    if not args.url and not launch_script:
        errors.append("no audit URL and no preview/dev/start package script")
    if not args.url and not dependencies_installed:
        errors.append(
            "no audit URL and project dependencies are not installed; "
            "provide a running URL or decide how dependencies will be prepared"
        )

    playwright_available = detect_playwright(workspace) if dependencies_installed else False
    browser_ready = args.browser_tool_available or playwright_available
    if not browser_ready:
        errors.append(
            "no browser automation is available; provide an agent browser tool "
            "or approve a project-local Playwright setup"
        )

    present_docs = []
    missing_docs = []
    for relative in UPSTREAM_DOCS:
        if (workspace / relative).is_file():
            present_docs.append(relative)
        else:
            missing_docs.append(relative)
    if missing_docs:
        warnings.append(
            "optional upstream context is missing: " + ", ".join(missing_docs)
        )

    manifest_routes = discover_manifest_routes(workspace, warnings)
    audit_routes = choose_representatives(manifest_routes, args.route)
    archetypes = {item["archetype"] for item in audit_routes}
    if "list" not in archetypes:
        warnings.append("no representative list/category route was resolved")
    if not ({"detail", "beginner-guide", "codes", "tier-list"} & archetypes):
        warnings.append("no representative detail/specialized content route was resolved")

    git = git_state(workspace) if workspace.is_dir() else {
        "is_repo": False, "root": None, "changes": []
    }
    if not git["is_repo"]:
        warnings.append("workspace is not inside a Git repository")

    optimization_authorized = (
        args.mode == "audit-and-optimize" and args.authorize_optimize
    )
    if args.mode == "audit-and-optimize" and not args.authorize_optimize:
        errors.append("optimization mode requires --authorize-optimize")
    dirty_confirmation_required = (
        args.mode == "audit-and-optimize"
        and bool(git["changes"])
        and not args.allow_dirty_after_confirmation
    )
    if dirty_confirmation_required:
        errors.append(
            "Git worktree has uncommitted changes; user confirmation is required "
            "before optimization"
        )

    result = {
        "schema_version": 1,
        "game": game,
        "mode": args.mode,
        "workspace": str(workspace),
        "framework": framework,
        "page_roots": roots,
        "url": args.url,
        "launch_script": launch_script,
        "dependencies_installed": dependencies_installed,
        "playwright_available": playwright_available,
        "browser_tool_available": args.browser_tool_available,
        "browser_ready": browser_ready,
        "upstream_docs": {
            "present": present_docs,
            "missing": missing_docs,
        },
        "audit_routes": audit_routes,
        "git": git,
        "optimization_authorized": optimization_authorized,
        "dirty_confirmation_required": dirty_confirmation_required,
        "errors": errors,
        "warnings": warnings,
        "ready": not errors,
    }
    write_result(result, args.output, workspace)
    if errors:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
