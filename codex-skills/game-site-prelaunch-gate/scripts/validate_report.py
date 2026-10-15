#!/usr/bin/env python3
"""Validate a completed PRELAUNCH_ACCEPTANCE.json against basic report invariants."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

SEVERITIES = {"P0", "P1", "P2", "NOTE"}
STATUSES = {"OPEN", "FIXED", "NEEDS_CONFIRMATION", "ACCEPTED_WITH_REASON"}
DISPOSITIONS = {
    "可以上线", "可以上线，但有P2待办", "完成指定修复后可上线", "暂不建议上线"
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    try:
        data = json.loads(args.report.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: cannot read JSON report: {exc}")
        return 2

    errors = []
    for key in ("schema_version", "run_id", "game", "project_path", "mode", "coverage", "pages", "checks", "seo_url_audit", "findings", "disposition"):
        if key not in data:
            errors.append(f"missing top-level field: {key}")
    if data.get("mode") not in {"audit-only", "audit-and-repair"}:
        errors.append("mode must be audit-only or audit-and-repair")
    if data.get("disposition") not in DISPOSITIONS:
        errors.append("unknown disposition")
    ids = [f.get("id") for f in data.get("findings", [])]
    if len(ids) != len(set(ids)):
        errors.append("finding IDs must be unique")
    for finding in data.get("findings", []):
        if finding.get("severity") not in SEVERITIES:
            errors.append(f"{finding.get('id')}: invalid severity")
        if finding.get("status") not in STATUSES:
            errors.append(f"{finding.get('id')}: invalid status")
        for key in ("page", "evidence", "recommendation"):
            if not finding.get(key):
                errors.append(f"{finding.get('id')}: missing {key}")
    seo_audit = data.get("seo_url_audit")
    if not isinstance(seo_audit, dict):
        errors.append("seo_url_audit must be an object")
    else:
        seo_failed = False
        for key in ("robots", "sitemap"):
            item = seo_audit.get(key)
            if not isinstance(item, dict):
                errors.append(f"seo_url_audit.{key} must be an object")
                seo_failed = True
                continue
            status = item.get("status")
            if status not in {"PASS", "FAIL", "BLOCKED", "NOT CONFIGURED", "NOT APPLICABLE"}:
                errors.append(f"seo_url_audit.{key} has invalid status")
            if status in {"FAIL", "BLOCKED"}:
                seo_failed = True
            for list_key in ("domain_mismatches", "missing_published_routes", "draft_or_blocked_routes"):
                values = item.get(list_key, [])
                if values:
                    seo_failed = True
        if seo_failed and data.get("disposition") != "暂不建议上线":
            errors.append("failed or blocked robots/sitemap validation requires disposition 暂不建议上线")

    unresolved_blockers = any(
        f.get("severity") in {"P0", "P1"} and f.get("status") != "FIXED"
        for f in data.get("findings", [])
    )
    if unresolved_blockers and data.get("disposition") != "暂不建议上线":
        errors.append("unresolved P0/P1 findings require disposition 暂不建议上线")
    has_p2_todo = any(
        f.get("severity") == "P2" and f.get("status") in {"OPEN", "NEEDS_CONFIRMATION"}
        for f in data.get("findings", [])
    )
    if data.get("disposition") == "可以上线" and has_p2_todo:
        errors.append("open P2 findings require disposition 可以上线，但有P2待办")
    if errors:
        print("REPORT INVALID")
        for err in errors:
            print(f"- {err}")
        return 1
    print("REPORT VALID")
    return 0


if __name__ == "__main__":
    sys.exit(main())
