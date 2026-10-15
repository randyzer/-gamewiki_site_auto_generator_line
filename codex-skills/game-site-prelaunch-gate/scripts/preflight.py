#!/usr/bin/env python3
"""Read-only input and project preflight for game-site-prelaunch-gate."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys


LOCKFILES = {
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
    "package-lock.json": "npm",
    "bun.lockb": "bun",
    "bun.lock": "bun",
}


def git_status(path: Path) -> tuple[bool | None, list[str]]:
    try:
        result = subprocess.run(
            ["git", "-C", str(path), "status", "--short"],
            capture_output=True, text=True, check=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None, []
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    return not lines, lines


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--game", required=True)
    ap.add_argument("--project", required=True, help="Absolute project directory")
    ap.add_argument("--domain", help="Expected production origin, e.g. https://example.com")
    ap.add_argument("--domain-unconfirmed", action="store_true", help="Allow local assessment only")
    ap.add_argument("--mode", choices=("audit-only", "audit-and-repair"), default="audit-only")
    ap.add_argument("--preview-url", help="Existing production-preview URL")
    ap.add_argument("--allow-start-preview", action="store_true", help="User authorized documented preview startup")
    args = ap.parse_args()

    errors: list[str] = []
    if not args.game.strip():
        errors.append("game name is empty")
    project = Path(args.project).expanduser()
    if not project.is_absolute():
        errors.append("project path must be absolute")
    elif not project.is_dir():
        errors.append("project directory does not exist or is not a directory")
    if bool(args.domain) == bool(args.domain_unconfirmed):
        errors.append("provide exactly one of --domain or --domain-unconfirmed")
    if args.domain and not args.domain.startswith(("https://", "http://")):
        errors.append("domain must include http:// or https://")
    if not args.preview_url and not args.allow_start_preview:
        errors.append("provide --preview-url or explicitly authorize documented preview startup")
    if args.preview_url and not args.preview_url.startswith(("https://", "http://")):
        errors.append("preview URL must include http:// or https://")
    if errors:
        print(json.dumps({"ready": False, "errors": errors}, ensure_ascii=False, indent=2))
        return 2

    project = project.resolve()
    package_file = project / "package.json"
    package = None
    if package_file.is_file():
        try:
            package = json.loads(package_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            errors.append("package.json exists but cannot be parsed")

    locks = [name for name in LOCKFILES if (project / name).is_file()]
    managers = sorted({LOCKFILES[name] for name in locks})
    if len(managers) > 1:
        errors.append("multiple package-manager lockfiles found; resolve intended manager before commands")

    scripts = (package or {}).get("scripts", {})
    framework = "unknown"
    deps = {**(package or {}).get("dependencies", {}), **(package or {}).get("devDependencies", {})}
    if "next" in deps:
        framework = "Next.js"
    elif "astro" in deps:
        framework = "Astro"
    elif package:
        framework = "other JavaScript project"

    clean, changed_paths = git_status(project)
    if args.mode == "audit-and-repair" and clean is False:
        errors.append("Git worktree has changes; do not repair until the user confirms how to preserve them")

    routes = []
    for candidate in ("app", "src/app", "pages", "src/pages"):
        if (project / candidate).is_dir():
            routes.append(candidate)
    if framework == "Astro" and "src/pages" in routes:
        pass
    report = {
        "ready": not errors,
        "errors": errors,
        "game": args.game,
        "project": str(project),
        "domain": args.domain or None,
        "domain_unconfirmed": args.domain_unconfirmed,
        "mode": args.mode,
        "preview": args.preview_url or "authorized documented startup required",
        "framework": framework,
        "package_manager": managers[0] if len(managers) == 1 else None,
        "lockfiles": locks,
        "scripts": scripts,
        "route_directories": routes,
        "git_clean": clean,
        "git_changed_paths": changed_paths,
        "manifests": [name for name in ("CONTENT_PAGE_MANIFEST.json", "sitemap.xml", "robots.txt") if (project / name).is_file()],
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not errors else 2


if __name__ == "__main__":
    sys.exit(main())
