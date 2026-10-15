#!/usr/bin/env python3
"""Safely copy one temp* template into a new, empty game workspace."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path


EXCLUDED_DIRS = {".git", ".next", "node_modules", ".turbo", "coverage", "__pycache__"}
EXCLUDED_FILES = {".DS_Store"}
EXCLUDED_SUFFIXES = {".tsbuildinfo"}
EXCLUDED_PATTERNS = [
    ".git/",
    ".next/",
    "node_modules/",
    ".turbo/",
    "coverage/",
    "__pycache__/",
    ".DS_Store",
    "*.tsbuildinfo",
    ".env",
    ".env.*",
]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(2)


def is_excluded(relative: Path) -> bool:
    if any(part in EXCLUDED_DIRS for part in relative.parts):
        return True
    name = relative.name
    if name in EXCLUDED_FILES or relative.suffix in EXCLUDED_SUFFIXES:
        return True
    if name == ".env" or name.startswith(".env."):
        return True
    return False


def ensure_not_nested(source: Path, destination: Path, template_root: Path) -> None:
    if source == destination:
        fail("Source and destination are identical")
    if source in destination.parents:
        fail("Destination cannot be inside the selected source template")
    if destination in source.parents:
        fail("Source cannot be inside the destination")
    if destination == template_root or template_root in destination.parents:
        fail("Destination cannot be inside the template library")


def ensure_destination_available(destination: Path) -> None:
    if not destination.is_absolute():
        fail("Destination must be an absolute path")
    if destination.exists():
        if not destination.is_dir():
            fail("Destination exists and is not a directory")
        try:
            next(destination.iterdir())
        except StopIteration:
            return
        fail("Destination exists and is not empty; refusing to merge or overwrite")


def collect_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for current, dirs, names in os.walk(root, topdown=True, followlinks=False):
        current_path = Path(current)
        relative_current = current_path.relative_to(root)
        dirs[:] = sorted(
            name for name in dirs
            if not is_excluded(relative_current / name)
        )
        for name in sorted(names):
            path = current_path / name
            relative = path.relative_to(root)
            if is_excluded(relative):
                continue
            if path.is_symlink():
                fail(f"Eligible source contains a symlink: {relative}")
            if path.is_file():
                files.append(path)
    return files


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def tree_manifest(root: Path) -> tuple[dict[str, str], str]:
    manifest: dict[str, str] = {}
    for path in collect_files(root):
        manifest[path.relative_to(root).as_posix()] = file_sha256(path)

    aggregate = hashlib.sha256()
    for relative, digest in sorted(manifest.items()):
        aggregate.update(relative.encode("utf-8"))
        aggregate.update(b"\0")
        aggregate.update(digest.encode("ascii"))
        aggregate.update(b"\n")
    return manifest, aggregate.hexdigest()


def copy_files(source: Path, staging: Path, manifest: dict[str, str]) -> None:
    staging.mkdir(parents=True, exist_ok=False)
    for relative in manifest:
        source_file = source / relative
        destination_file = staging / relative
        destination_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_file, destination_file)


def finalize(staging: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        try:
            next(destination.iterdir())
        except StopIteration:
            destination.rmdir()
        else:
            fail("Destination became non-empty during copy; refusing to finalize")
    staging.replace(destination)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--template-root", required=True)
    parser.add_argument("--source", required=True, help="Immediate temp* directory name")
    parser.add_argument("--destination", required=True)
    parser.add_argument("--game", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    template_root = Path(args.template_root).expanduser().resolve()
    if not template_root.is_dir():
        fail(f"Template root does not exist: {template_root}")

    if Path(args.source).name != args.source or not args.source.startswith("temp"):
        fail("Source must be one immediate temp* directory name")

    source = (template_root / args.source).resolve()
    if source.parent != template_root or not source.is_dir():
        fail(f"Selected source is not an immediate template directory: {source}")

    destination_input = Path(args.destination).expanduser()
    if not destination_input.is_absolute():
        fail("Destination must be an absolute path")
    destination = destination_input.resolve(strict=False)

    ensure_not_nested(source, destination, template_root)
    ensure_destination_available(destination)

    source_files_before, source_hash_before = tree_manifest(source)
    preview = {
        "game": args.game,
        "source": str(source),
        "destination": str(destination),
        "excluded_patterns": EXCLUDED_PATTERNS,
        "eligible_file_count": len(source_files_before),
        "source_tree_sha256": source_hash_before,
        "dry_run": args.dry_run,
    }

    if args.dry_run:
        print(json.dumps(preview, ensure_ascii=False, indent=2))
        return

    staging = destination.parent / f".{destination.name}.template-copy-{uuid.uuid4().hex}"
    if staging.exists():
        fail(f"Unexpected staging collision: {staging}")

    try:
        copy_files(source, staging, source_files_before)
        destination_files, destination_hash = tree_manifest(staging)
        source_files_after, source_hash_after = tree_manifest(source)

        source_unchanged = (
            source_hash_before == source_hash_after
            and source_files_before == source_files_after
        )
        destination_verified = (
            source_files_before == destination_files
            and source_hash_before == destination_hash
        )
        if not source_unchanged:
            fail("Source template changed during copying")
        if not destination_verified:
            fail("Copied destination does not match eligible source files")

        manifest = {
            "schema_version": 1,
            "game": args.game,
            "source": str(source),
            "destination": str(destination),
            "copied_at": datetime.now(timezone.utc).isoformat(),
            "excluded_patterns": EXCLUDED_PATTERNS,
            "file_count": len(source_files_before),
            "source_tree_sha256_before": source_hash_before,
            "source_tree_sha256_after": source_hash_after,
            "destination_tree_sha256": destination_hash,
            "source_unchanged": source_unchanged,
            "destination_verified": destination_verified,
            "files": source_files_before,
        }
        docs = staging / "docs"
        docs.mkdir(parents=True, exist_ok=True)
        (docs / "template-copy-manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        finalize(staging, destination)
    except BaseException:
        print(f"Staging path retained for diagnosis if present: {staging}", file=sys.stderr)
        raise

    print(json.dumps({
        **preview,
        "dry_run": False,
        "manifest": str(destination / "docs/template-copy-manifest.json"),
        "source_unchanged": True,
        "destination_verified": True,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
