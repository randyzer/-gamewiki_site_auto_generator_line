#!/usr/bin/env python3
"""Validate content-integration outputs without changing the game project."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit
from typing import Any


OUTCOMES = {"PUBLISHED", "DRAFT", "BLOCKED"}
TEXT_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".md", ".mdx", ".json", ".css", ".html", ".txt", ".xml", ".webmanifest"}
REQUIRED_DOCS = {
    "CONTENT_INTEGRATION_REPORT.md",
    "CONTENT_PAGE_MANIFEST.json",
    "CONTENT_PROVENANCE.md",
    "CONTENT_GAPS.md",
}
SKIP_DIRS = {".git", ".next", "node_modules", ".turbo", "coverage", "__pycache__"}


def is_within(path: Path, parent: Path) -> bool:
    return path == parent or parent in path.parents


def load_json(path: Path, label: str, errors: list[str]) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"{label} is invalid JSON: {path}: {exc}")
        return None
    if not isinstance(value, dict):
        errors.append(f"{label} root must be an object: {path}")
        return None
    return value


def resolve_background(
    workspace: Path,
    explicit: str | None,
    errors: list[str],
) -> Path | None:
    if explicit:
        root = Path(explicit).expanduser()
        if not root.is_absolute():
            errors.append("background directory must be an absolute path")
            return None
        root = root.resolve(strict=False)
        if not root.is_dir():
            errors.append(f"background directory does not exist: {root}")
            return None
        if not is_within(root, workspace):
            errors.append(f"background directory must be inside workspace: {root}")
            return None
        return root

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
    else:
        errors.append(
            "research directory is ambiguous; provide --background-dir"
        )
    return None


def find_unique_keywords(root: Path | None, errors: list[str]) -> Path | None:
    candidates = sorted(
        path for path in root.rglob("keywords.json")
        if path.is_file() and not any(part in SKIP_DIRS for part in path.parts)
    ) if root and root.is_dir() else []
    if len(candidates) == 1:
        return candidates[0]
    if not candidates:
        errors.append("no keywords.json found under the resolved research directory")
    else:
        errors.append("multiple keywords.json files found: " + ", ".join(map(str, candidates)))
    return None


def keyword_set(data: dict[str, Any], errors: list[str]) -> set[str]:
    categories = data.get("categories")
    if not isinstance(categories, list):
        errors.append("keywords.json has no categories array")
        return set()
    values: set[str] = set()
    folded: set[str] = set()
    for category in categories:
        if not isinstance(category, dict) or not isinstance(category.get("keywords"), list):
            errors.append("keywords.json contains an invalid category")
            continue
        for keyword in category["keywords"]:
            if not isinstance(keyword, str) or not keyword.strip():
                errors.append("keywords.json contains an invalid keyword")
                continue
            clean = keyword.strip()
            if clean.casefold() in folded:
                errors.append(f"keywords.json contains duplicate keyword: {clean}")
            folded.add(clean.casefold())
            values.add(clean)
    return values


def public_text_files(workspace: Path, published_sources: list[Path]) -> list[Path]:
    paths: set[Path] = set(published_sources)
    for directory in ("app", "pages", "src", "components", "lib", "public"):
        root = workspace / directory
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if any(part in SKIP_DIRS for part in path.relative_to(workspace).parts):
                continue
            if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES:
                paths.add(path)
    return sorted(paths)


def normalize_origin(value: str) -> str | None:
    parsed = urlsplit(value.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    if parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
        return None
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"


def inspect_static_robots_sitemaps(
    workspace: Path,
    site_origin: str | None,
    published_routes: list[str],
    errors: list[str],
    warnings: list[str],
) -> dict[str, Any]:
    artifacts: list[Path] = []
    for base in (workspace, workspace / "public", workspace / "app", workspace / "src"):
        if not base.is_dir():
            continue
        for current, dirs, names in os.walk(base):
            dirs[:] = [name for name in dirs if name not in SKIP_DIRS]
            for name in names:
                lower = name.lower()
                if lower == "robots.txt" or (
                    lower.startswith("sitemap") and lower.endswith(".xml")
                ):
                    path = Path(current) / name
                    if path not in artifacts:
                        artifacts.append(path)

    urls: list[dict[str, str]] = []
    sitemap_routes: set[str] = set()
    for path in sorted(artifacts):
        try:
            content = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            warnings.append(f"SEO URL artifact could not be read: {path.relative_to(workspace)}")
            continue
        relative = str(path.relative_to(workspace))
        if path.name.lower() == "robots.txt":
            values = [
                match.group(1).strip()
                for match in re.finditer(r"(?im)^\s*sitemap\s*:\s*(\S+)", content)
            ]
            for value in values:
                urls.append({"file": relative, "kind": "robots-sitemap", "url": value})
        else:
            values = [
                match.group(1).strip()
                for match in re.finditer(r"(?is)<loc>\s*(.*?)\s*</loc>", content)
            ]
            if not values:
                errors.append(f"sitemap has no <loc> URLs: {relative}")
            for value in values:
                urls.append({"file": relative, "kind": "sitemap-loc", "url": value})
                parsed = urlsplit(value)
                if parsed.path:
                    sitemap_routes.add(parsed.path.rstrip("/") or "/")

    expected = normalize_origin(site_origin) if site_origin else None
    if site_origin and expected is None:
        errors.append("--site-origin must be an absolute http(s) origin without a path/query/fragment")
    mismatches: list[dict[str, str]] = []
    for item in urls:
        parsed = urlsplit(item["url"])
        actual = f"{parsed.scheme.lower()}://{parsed.netloc.lower()}" if parsed.scheme and parsed.netloc else None
        if actual is None:
            errors.append(f"{item['kind']} URL is not absolute: {item['file']}: {item['url']}")
        elif expected is None:
            warnings.append(f"site origin unconfirmed; cannot verify SEO host in {item['file']}")
        elif actual != expected:
            mismatch = {**item, "actual_origin": actual, "expected_origin": expected}
            mismatches.append(mismatch)
            errors.append(f"stale or mismatched SEO origin in {item['file']}: {actual} != {expected}")
    if urls and expected is None:
        errors.append("site origin is required to validate absolute sitemap/robots URLs")

    missing_routes: list[str] = []
    if any(item["kind"] == "sitemap-loc" for item in urls):
        for route in published_routes:
            normalized = route.rstrip("/") or "/"
            if normalized not in sitemap_routes:
                missing_routes.append(route)
                errors.append(f"published route missing from static sitemap: {route}")

    return {
        "status": "FAIL" if any("sitemap" in error or "SEO origin" in error for error in errors)
        else ("UNVERIFIED" if warnings else "PASS"),
        "site_origin": expected,
        "artifacts": [str(path.relative_to(workspace)) for path in sorted(artifacts)],
        "urls_checked": urls,
        "domain_mismatches": mismatches,
        "missing_published_routes": missing_routes,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game", required=True)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--background-dir")
    parser.add_argument("--site-origin", help="Confirmed canonical origin for the new site")
    parser.add_argument("--demo-term", action="append", default=[])
    parser.add_argument("--output")
    args = parser.parse_args()

    errors: list[str] = []
    warnings: list[str] = []
    workspace_input = Path(args.workspace).expanduser()
    if not workspace_input.is_absolute():
        errors.append("workspace must be an absolute path")
    workspace = workspace_input.resolve(strict=False)
    if not workspace.is_dir():
        errors.append(f"workspace does not exist: {workspace}")

    docs = workspace / "docs"
    for name in REQUIRED_DOCS:
        path = docs / name
        if not path.is_file():
            errors.append(f"missing required output: {path}")
        elif path.stat().st_size == 0:
            errors.append(f"required output is empty: {path}")

    background = resolve_background(workspace, args.background_dir, errors)
    keywords_path = find_unique_keywords(background, errors)
    keywords: set[str] = set()
    if keywords_path:
        data = load_json(keywords_path, "keywords.json", errors)
        if data:
            keywords = keyword_set(data, errors)

    page_manifest_path = docs / "CONTENT_PAGE_MANIFEST.json"
    page_manifest = (
        load_json(page_manifest_path, "content page manifest", errors)
        if page_manifest_path.is_file()
        else None
    )

    pages: list[dict[str, Any]] = []
    published_sources: list[Path] = []
    outcomes = {"PUBLISHED": 0, "DRAFT": 0, "BLOCKED": 0}
    manifest_keywords: set[str] = set()
    manifest_folded: set[str] = set()

    if page_manifest:
        raw_pages = page_manifest.get("pages")
        if not isinstance(raw_pages, list):
            errors.append("content page manifest has no pages array")
        else:
            pages = [page for page in raw_pages if isinstance(page, dict)]
            if len(pages) != len(raw_pages):
                errors.append("content page manifest contains a non-object page entry")

        for index, page in enumerate(pages, start=1):
            keyword = page.get("keyword")
            outcome = page.get("outcome")
            if not isinstance(keyword, str) or not keyword.strip():
                errors.append(f"page {index} has no valid keyword")
                continue
            keyword = keyword.strip()
            if keyword.casefold() in manifest_folded:
                errors.append(f"page manifest has duplicate keyword: {keyword}")
            manifest_folded.add(keyword.casefold())
            manifest_keywords.add(keyword)

            if outcome not in OUTCOMES:
                errors.append(f"{keyword}: invalid outcome {outcome!r}")
                continue
            outcomes[outcome] += 1

            route = page.get("route")
            source_file = page.get("source_file")
            notes = page.get("notes")
            has_notes = isinstance(notes, list) and bool(notes)

            if outcome == "PUBLISHED":
                if not isinstance(route, str) or not route.startswith("/"):
                    errors.append(f"{keyword}: published page has no valid route")
                if not isinstance(source_file, str) or not source_file:
                    errors.append(f"{keyword}: published page has no source_file")
                else:
                    source = (workspace / source_file).resolve(strict=False)
                    if not is_within(source, workspace):
                        errors.append(f"{keyword}: source_file escapes workspace")
                    elif not source.is_file():
                        errors.append(f"{keyword}: source_file does not exist: {source}")
                    else:
                        published_sources.append(source)
            elif outcome == "BLOCKED" and (route or source_file):
                errors.append(f"{keyword}: blocked page must not have a public route or source_file")

            title_length = page.get("title_length")
            description_length = page.get("description_length")
            if outcome == "PUBLISHED":
                if not isinstance(title_length, int):
                    errors.append(f"{keyword}: missing integer title_length")
                elif not 40 <= title_length <= 60:
                    message = f"{keyword}: title length {title_length} is outside 40-60"
                    (warnings if has_notes else errors).append(message)
                if not isinstance(description_length, int):
                    errors.append(f"{keyword}: missing integer description_length")
                elif not 140 <= description_length <= 160:
                    message = (
                        f"{keyword}: description length {description_length} is outside 140-160"
                    )
                    (warnings if has_notes else errors).append(message)

        counts = page_manifest.get("counts")
        if not isinstance(counts, dict):
            errors.append("content page manifest has no counts object")
        else:
            expected = {
                "keywords": len(pages),
                "published": outcomes["PUBLISHED"],
                "draft": outcomes["DRAFT"],
                "blocked": outcomes["BLOCKED"],
            }
            for key, value in expected.items():
                if counts.get(key) != value:
                    errors.append(
                        f"content page manifest count mismatch for {key}: "
                        f"{counts.get(key)!r} != {value}"
                    )

    if keywords and {value.casefold() for value in keywords} != manifest_folded:
        missing = sorted(
            value for value in keywords if value.casefold() not in manifest_folded
        )
        extra = sorted(
            value for value in manifest_keywords
            if value.casefold() not in {item.casefold() for item in keywords}
        )
        if missing:
            errors.append("keywords missing from page manifest: " + ", ".join(missing))
        if extra:
            errors.append("unexpected keywords in page manifest: " + ", ".join(extra))

    unresolved = "待确认"
    href_placeholder = re.compile(r'''href\s*=\s*["']#["']''')
    demo_terms = [term for term in args.demo_term if term.strip()]
    residue_scan_path = docs / "TEMPLATE_RESIDUE_SCAN.json"
    residue_scan = None
    if residue_scan_path.is_file():
        residue_scan = load_json(residue_scan_path, "template residue scan", errors)
        identities = (residue_scan or {}).get("candidate_source_identities", {})
        if isinstance(identities, dict):
            for key in ("game_names", "brands", "domains"):
                values = identities.get(key, [])
                if isinstance(values, list):
                    demo_terms.extend(
                        value.strip() for value in values
                        if isinstance(value, str) and len(value.strip()) >= 4
                    )
        if residue_scan and residue_scan.get("scan_status") != "COMPLETE":
            warnings.append("template residue scan is incomplete; repeat source identity checks manually")
    else:
        warnings.append("TEMPLATE_RESIDUE_SCAN.json is absent; source-template residue must be scanned manually")
    demo_terms = list(dict.fromkeys(demo_terms))
    for path in public_text_files(workspace, published_sources):
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        relative = path.relative_to(workspace)
        if unresolved in text:
            errors.append(f"public implementation contains 待确认: {relative}")
        if href_placeholder.search(text):
            warnings.append(f"placeholder href found: {relative}")
        folded = text.casefold()
        for term in demo_terms:
            if term.casefold() in folded:
                errors.append(f"demo residue {term!r} found in public file: {relative}")

    published_routes = [
        page["route"] for page in pages
        if page.get("outcome") == "PUBLISHED" and isinstance(page.get("route"), str)
    ]
    seo_url_audit = inspect_static_robots_sitemaps(
        workspace, args.site_origin, published_routes, errors, warnings
    )

    result = {
        "schema_version": 1,
        "game": args.game,
        "workspace": str(workspace),
        "seo_url_audit": seo_url_audit,
        "template_residue_scan": str(residue_scan_path) if residue_scan else None,
        "keywords": len(keywords),
        "outcomes": outcomes,
        "published_source_files": [
            str(path.relative_to(workspace)) for path in published_sources
        ],
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
        print(str(output.resolve()))
    else:
        print(rendered, end="")

    if errors:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
