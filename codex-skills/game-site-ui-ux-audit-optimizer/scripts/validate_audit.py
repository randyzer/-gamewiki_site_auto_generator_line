#!/usr/bin/env python3
"""Validate completed game-site UI/UX audit artifacts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


SEVERITIES = {"BLOCKER", "HIGH", "MEDIUM", "LOW", "NOTE"}
VERDICTS = {"SHIP", "SHIP_WITH_FIXES", "NEEDS_WORK", "BLOCKED"}
MODES = {"audit-only", "audit-and-optimize"}
STATUSES = {
    "OPEN",
    "FIXED",
    "PARTIALLY_FIXED",
    "NOT_FIXED",
    "NOT_RETESTED",
    "ACCEPTED_RISK",
}


def is_within(path: Path, parent: Path) -> bool:
    return path == parent or parent in path.parents


def load_json(path: Path, label: str, errors: list[str]) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"{label} is unreadable or invalid JSON: {path}: {exc}")
        return None
    if not isinstance(value, dict):
        errors.append(f"{label} root must be an object: {path}")
        return None
    return value


def require_nonempty(path: Path, errors: list[str]) -> None:
    if not path.is_file():
        errors.append(f"missing required artifact: {path}")
    elif path.stat().st_size == 0:
        errors.append(f"required artifact is empty: {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--expect-optimization", action="store_true")
    parser.add_argument("--output")
    args = parser.parse_args()

    errors: list[str] = []
    warnings: list[str] = []

    workspace_input = Path(args.workspace).expanduser()
    run_input = Path(args.run_dir).expanduser()
    if not workspace_input.is_absolute():
        errors.append("workspace must be an absolute path")
    if not run_input.is_absolute():
        errors.append("run directory must be an absolute path")

    workspace = workspace_input.resolve(strict=False)
    run_dir = run_input.resolve(strict=False)
    audit_root = (workspace / "docs" / "ui-ux-audit").resolve(strict=False)

    if not workspace.is_dir():
        errors.append(f"workspace does not exist: {workspace}")
    if not run_dir.is_dir():
        errors.append(f"run directory does not exist: {run_dir}")
    if not is_within(run_dir, audit_root) or run_dir == audit_root:
        errors.append(f"run directory must be a child of {audit_root}")

    required = (
        "UI_UX_AUDIT_REPORT.md",
        "UI_UX_AUDIT.json",
        "UI_UX_OPTIMIZATION_PLAN.md",
    )
    for name in required:
        require_nonempty(run_dir / name, errors)

    screenshots = run_dir / "screenshots"
    if not screenshots.is_dir():
        errors.append(f"missing screenshots directory: {screenshots}")

    if args.expect_optimization:
        for name in ("UI_UX_CHANGE_MANIFEST.md", "UI_UX_RETEST_REPORT.md"):
            require_nonempty(run_dir / name, errors)
        after = run_dir / "screenshots-after"
        if not after.is_dir():
            errors.append(f"missing post-optimization screenshots: {after}")

    latest = audit_root / "LATEST"
    if not latest.is_file():
        errors.append(f"missing LATEST pointer: {latest}")
    else:
        pointer = latest.read_text(encoding="utf-8").strip()
        expected = str(run_dir.relative_to(audit_root))
        if pointer != expected:
            errors.append(f"LATEST points to {pointer!r}; expected {expected!r}")
        if Path(pointer).is_absolute() or ".." in Path(pointer).parts:
            errors.append("LATEST must contain a safe relative run path")

    audit_path = run_dir / "UI_UX_AUDIT.json"
    audit = load_json(audit_path, "UI_UX_AUDIT.json", errors) if audit_path.is_file() else None

    counts = {severity: 0 for severity in SEVERITIES}
    screenshot_refs: set[str] = set()
    routes: list[dict[str, Any]] = []
    findings: list[dict[str, Any]] = []

    if audit:
        if audit.get("schema_version") != 1:
            errors.append("audit schema_version must be 1")
        if audit.get("mode") not in MODES:
            errors.append(f"invalid audit mode: {audit.get('mode')!r}")
        if audit.get("verdict") not in VERDICTS:
            errors.append(f"invalid audit verdict: {audit.get('verdict')!r}")

        raw_routes = audit.get("routes")
        if not isinstance(raw_routes, list) or not raw_routes:
            errors.append("audit routes must be a non-empty array")
        else:
            routes = [item for item in raw_routes if isinstance(item, dict)]
            if len(routes) != len(raw_routes):
                errors.append("audit routes contains a non-object entry")
            route_values = [item.get("route") for item in routes]
            if "/" not in route_values:
                errors.append("audit routes must include the homepage")
            if len(route_values) != len(set(route_values)):
                errors.append("audit routes contain duplicates")
            for item in routes:
                if not isinstance(item.get("route"), str) or not item["route"].startswith("/"):
                    errors.append(f"invalid audit route: {item!r}")
                if not isinstance(item.get("archetype"), str) or not item["archetype"]:
                    errors.append(f"route has no archetype: {item!r}")
                if not isinstance(item.get("reason"), str) or not item["reason"]:
                    errors.append(f"route has no selection reason: {item!r}")

        viewports = audit.get("viewports")
        expected_viewports = [360, 390, 768, 1024, 1440, 1920]
        if viewports != expected_viewports:
            warnings.append(
                f"viewports differ from the standard set: {viewports!r}; "
                "the report must explain omissions"
            )

        raw_findings = audit.get("findings")
        if not isinstance(raw_findings, list):
            errors.append("audit findings must be an array")
        else:
            findings = [item for item in raw_findings if isinstance(item, dict)]
            if len(findings) != len(raw_findings):
                errors.append("audit findings contains a non-object entry")

        seen_ids: set[str] = set()
        route_set = {
            item["route"] for item in routes
            if isinstance(item.get("route"), str)
        }
        for index, finding in enumerate(findings, start=1):
            finding_id = finding.get("id")
            severity = finding.get("severity")
            if not isinstance(finding_id, str) or not finding_id:
                errors.append(f"finding {index} has no stable id")
            elif finding_id in seen_ids:
                errors.append(f"duplicate finding id: {finding_id}")
            else:
                seen_ids.add(finding_id)

            if severity not in SEVERITIES:
                errors.append(f"{finding_id or index}: invalid severity {severity!r}")
            else:
                counts[severity] += 1

            route = finding.get("route")
            if route not in route_set:
                errors.append(f"{finding_id or index}: route is not in audit routes: {route!r}")

            for field in ("category", "evidence", "impact", "recommendation", "verification"):
                if not isinstance(finding.get(field), str) or not finding[field].strip():
                    errors.append(f"{finding_id or index}: missing {field}")

            status = finding.get("status")
            if status not in STATUSES:
                errors.append(f"{finding_id or index}: invalid status {status!r}")

            screenshot = finding.get("screenshot")
            if screenshot is not None:
                if not isinstance(screenshot, str) or not screenshot:
                    errors.append(f"{finding_id or index}: invalid screenshot reference")
                else:
                    screenshot_refs.add(screenshot)

        summary = audit.get("summary")
        if not isinstance(summary, dict):
            errors.append("audit summary must be an object")
        else:
            key_map = {
                "blocker": "BLOCKER",
                "high": "HIGH",
                "medium": "MEDIUM",
                "low": "LOW",
                "note": "NOTE",
            }
            for key, severity in key_map.items():
                if summary.get(key) != counts[severity]:
                    errors.append(
                        f"summary mismatch for {key}: "
                        f"{summary.get(key)!r} != {counts[severity]}"
                    )

        if args.expect_optimization and audit.get("mode") != "audit-and-optimize":
            errors.append("optimization artifacts require mode audit-and-optimize")

    for reference in sorted(screenshot_refs):
        path = (run_dir / reference).resolve(strict=False)
        if not is_within(path, run_dir):
            errors.append(f"screenshot reference escapes run directory: {reference}")
        elif not path.is_file():
            errors.append(f"referenced screenshot does not exist: {reference}")

    screenshot_count = (
        sum(1 for path in screenshots.rglob("*") if path.is_file())
        if screenshots.is_dir()
        else 0
    )
    if screenshots.is_dir() and screenshot_count == 0:
        errors.append("screenshots directory is empty")

    result = {
        "schema_version": 1,
        "workspace": str(workspace),
        "run_dir": str(run_dir),
        "routes": len(routes),
        "findings": len(findings),
        "screenshots": screenshot_count,
        "counts": counts,
        "errors": errors,
        "warnings": warnings,
        "valid": not errors,
    }
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        output = Path(args.output).expanduser()
        if not output.is_absolute():
            raise SystemExit("--output must be an absolute path")
        output.resolve(strict=False).write_text(rendered, encoding="utf-8")
        print(output.resolve())
    else:
        print(rendered, end="")

    if errors:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
