#!/usr/bin/env python3
import argparse
import json
import re
import sys
import zipfile
from pathlib import Path

EXPECTED_ZIP = {
    "apple-touch-icon.png",
    "favicon-32x32.png",
    "favicon-16x16.png",
    "favicon.ico",
    "site.webmanifest",
    "android-chrome-192x192.png",
    "android-chrome-512x512.png",
}


def fail(errors, message):
    errors.append(message)


def extract_json(markdown):
    matches = re.findall(r"(?:~~~|\x60\x60\x60)json\s*(\{.*?\})\s*(?:~~~|\x60\x60\x60)", markdown, re.S)
    if not matches:
        raise ValueError("No fenced JSON object found")
    for candidate in matches:
        try:
            payload = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict) and "home" in payload and "metadata" in payload:
            return payload
    raise ValueError("No valid homepage JSON object found")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--markdown", required=True)
    parser.add_argument("--zip", required=True)
    parser.add_argument("--game-name", required=True)
    args = parser.parse_args()

    md_path = Path(args.markdown)
    zip_path = Path(args.zip)
    errors = []

    if md_path.parent.name != "backgroundinformation":
        fail(errors, "Markdown is not inside backgroundinformation")
    if zip_path.parent.name != "backgroundinformation":
        fail(errors, "ZIP is not inside backgroundinformation")
    if md_path.name != f"{args.game_name}攻略站首页调研信息.md":
        fail(errors, f"Unexpected Markdown filename: {md_path.name}")
    if zip_path.name != f"{args.game_name}图标.zip":
        fail(errors, f"Unexpected ZIP filename: {zip_path.name}")

    if not md_path.is_file() or md_path.stat().st_size == 0:
        fail(errors, "Markdown is missing or empty")
    else:
        try:
            data = extract_json(md_path.read_text(encoding="utf-8"))
            home = data["home"]
            metadata = data["metadata"]
            home_title = home["meta"]["title"]
            metadata_title = metadata["title"]
            metadata_description = metadata["description"]
            metadata_keywords = metadata["keywords"]
            hero_stats = home["hero"]["stats"]
            cards = home["start"]["cards"]
            about_stats = home["aboutGame"]["stats"]

            if len(home_title) > 60:
                fail(errors, f"home.meta.title is {len(home_title)} characters")
            if len(metadata_title) > 60:
                fail(errors, f"metadata.title is {len(metadata_title)} characters")
            if not 140 <= len(metadata_description) <= 160:
                fail(errors, f"metadata.description is {len(metadata_description)} characters")
            if len(metadata_keywords) > 100:
                fail(errors, f"metadata.keywords is {len(metadata_keywords)} characters")
            if not isinstance(hero_stats, list) or not all(isinstance(x, str) for x in hero_stats):
                fail(errors, "home.hero.stats must contain strings only")
            if not isinstance(cards, list) or len(cards) != 4 or not all(isinstance(x, dict) for x in cards):
                fail(errors, "home.start.cards must contain exactly four objects")
            if not isinstance(about_stats, list) or not all(
                isinstance(x, dict) and x.get("label") and x.get("value") for x in about_stats
            ):
                fail(errors, "home.aboutGame.stats entries need label and value")
            if "sidebarCodes" not in data:
                fail(errors, "sidebarCodes is missing")
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            fail(errors, f"Homepage JSON validation failed: {exc}")

    if not zip_path.is_file() or zip_path.stat().st_size == 0:
        fail(errors, "ZIP is missing or empty")
    else:
        try:
            with zipfile.ZipFile(zip_path) as archive:
                members = {Path(name).name for name in archive.namelist() if not name.endswith("/")}
                missing = EXPECTED_ZIP - members
                if missing:
                    fail(errors, "ZIP missing: " + ", ".join(sorted(missing)))
                corrupt = archive.testzip()
                if corrupt:
                    fail(errors, f"ZIP CRC failed: {corrupt}")
        except zipfile.BadZipFile:
            fail(errors, "Invalid ZIP archive")

    if errors:
        for error in errors:
            print(f"[ERROR] {error}")
        return 1

    print("[OK] Markdown schema and SEO constraints passed")
    print("[OK] Favicon ZIP members and CRC passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
