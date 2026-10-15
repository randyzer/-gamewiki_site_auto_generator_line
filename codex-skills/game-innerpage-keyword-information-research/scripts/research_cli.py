#!/usr/bin/env python3
"""Deterministic Serper and yt-dlp helpers for the research skill."""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path


SERPER_ENDPOINT = "https://google.serper.dev/search"


def die(message: str, code: int = 2) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(code)


def redact(text: str, secrets: list[str]) -> str:
    for secret in secrets:
        if secret:
            text = text.replace(secret, "[REDACTED]")
    return text


def run(cmd: list[str], secrets: list[str] | None = None) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(cmd, text=True, capture_output=True, check=False)
    if proc.returncode:
        msg = redact((proc.stderr or proc.stdout).strip(), secrets or [])
        die(msg or f"Command failed with exit code {proc.returncode}", proc.returncode)
    return proc


def command_check(_: argparse.Namespace) -> None:
    status: dict[str, object] = {
        "serper_api_key": "present" if os.environ.get("SERPER_API_KEY") else "missing",
        "yt_dlp": "missing",
        "javascript_runtimes": {},
        "cookie_file": "configured" if os.environ.get("YTDLP_COOKIES_FILE") else "not configured",
    }
    ytdlp = shutil.which("yt-dlp")
    if ytdlp:
        proc = subprocess.run([ytdlp, "--version"], text=True, capture_output=True, check=False)
        status["yt_dlp"] = proc.stdout.strip() if proc.returncode == 0 else "error"
    for name in ("deno", "node", "bun", "qjs"):
        status["javascript_runtimes"][name] = shutil.which(name) or "missing"  # type: ignore[index]
    print(json.dumps(status, ensure_ascii=False, indent=2))


def command_serper(args: argparse.Namespace) -> None:
    api_key = os.environ.get("SERPER_API_KEY")
    if not api_key:
        die("SERPER_API_KEY is not set")
    payload = {"q": args.query, "gl": args.gl, "hl": args.hl, "num": args.num}
    request = urllib.request.Request(
        SERPER_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            data = response.read()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:500]
        die(f"Serper HTTP {exc.code}: {body}")
    except urllib.error.URLError as exc:
        die(f"Serper request failed: {exc.reason}")
    try:
        parsed = json.loads(data)
    except json.JSONDecodeError as exc:
        die(f"Serper returned invalid JSON: {exc}")
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(parsed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(str(output))


def ytdlp_base() -> list[str]:
    executable = shutil.which("yt-dlp")
    if not executable:
        die("yt-dlp is not installed")
    return [executable, "--ignore-config", "--no-warnings"]


def add_cookie_args(cmd: list[str], browser: str | None) -> tuple[list[str], list[str]]:
    secrets: list[str] = []
    if browser:
        cmd.extend(["--cookies-from-browser", browser])
        return cmd, secrets
    cookie_file = os.environ.get("YTDLP_COOKIES_FILE")
    if cookie_file:
        path = Path(cookie_file).expanduser()
        if not path.is_file():
            die("YTDLP_COOKIES_FILE does not point to a readable file")
        cmd.extend(["--cookies", str(path)])
        secrets.append(str(path))
    return cmd, secrets


def command_youtube_search(args: argparse.Namespace) -> None:
    cmd = ytdlp_base() + ["--skip-download", "--dump-json", f"ytsearch{args.limit}:{args.query}"]
    cmd, secrets = add_cookie_args(cmd, args.cookies_from_browser)
    proc = run(cmd, secrets)
    rows = []
    for line in proc.stdout.splitlines():
        if not line.strip():
            continue
        raw = json.loads(line)
        rows.append({
            "id": raw.get("id"),
            "title": raw.get("title"),
            "url": raw.get("webpage_url") or raw.get("original_url"),
            "channel": raw.get("channel") or raw.get("uploader"),
            "upload_date": raw.get("upload_date"),
            "duration": raw.get("duration"),
            "view_count": raw.get("view_count"),
            "availability": raw.get("availability"),
            "subtitles": sorted((raw.get("subtitles") or {}).keys()),
            "automatic_captions": sorted((raw.get("automatic_captions") or {}).keys()),
        })
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(str(output))


def subtitle_files(directory: Path) -> dict[Path, tuple[int, int]]:
    """Return size and mtime so repeated downloads count as fresh output."""
    return {
        path: (path.stat().st_size, path.stat().st_mtime_ns)
        for path in directory.glob("*.vtt")
    }


def changed_subtitles(
    before: dict[Path, tuple[int, int]], after: dict[Path, tuple[int, int]]
) -> set[Path]:
    return {path for path, fingerprint in after.items() if before.get(path) != fingerprint}


def command_youtube_subs(args: argparse.Namespace) -> None:
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    before = subtitle_files(output_dir)
    common = ytdlp_base() + [
        "--no-playlist", "--skip-download", "--sub-langs", "en.*,en",
        "--sub-format", "vtt/best", "-P", str(output_dir), "-o", "%(id)s.%(ext)s",
    ]
    common, secrets = add_cookie_args(common, args.cookies_from_browser)

    manual = subprocess.run(common + ["--write-subs", args.url], text=True, capture_output=True, check=False)
    created = changed_subtitles(before, subtitle_files(output_dir))
    subtitle_type = "manual"
    if not created:
        auto = subprocess.run(common + ["--write-auto-subs", args.url], text=True, capture_output=True, check=False)
        created = changed_subtitles(before, subtitle_files(output_dir))
        subtitle_type = "automatic"
        if auto.returncode and not created:
            message = auto.stderr or manual.stderr or auto.stdout or manual.stdout
            die(redact(message.strip(), secrets) or "No English subtitles were downloaded", auto.returncode)
    if not created:
        message = manual.stderr or manual.stdout
        die(redact(message.strip(), secrets) or "No English subtitles are available")
    result = {"subtitle_type": subtitle_type, "files": sorted(str(path) for path in created)}
    print(json.dumps(result, ensure_ascii=False, indent=2))


TIMING = re.compile(r"^(\d{2}:)?\d{2}:\d{2}[.,]\d{3}\s+-->")
TAG = re.compile(r"<[^>]+>")


def parse_vtt(path: Path) -> list[tuple[str, str]]:
    cues: list[tuple[str, str]] = []
    timestamp = ""
    text_lines: list[str] = []

    def flush() -> None:
        nonlocal text_lines
        if not timestamp or not text_lines:
            text_lines = []
            return
        clean = " ".join(text_lines)
        clean = html.unescape(TAG.sub("", clean))
        clean = re.sub(r"\s+", " ", clean).strip()
        if clean and (not cues or clean != cues[-1][1]):
            cues.append((timestamp, clean))
        text_lines = []

    for raw in path.read_text(encoding="utf-8-sig", errors="replace").splitlines():
        line = raw.strip()
        if TIMING.match(line):
            flush()
            timestamp = line.split("-->", 1)[0].strip().replace(",", ".")
        elif not line:
            flush()
        elif timestamp and not line.isdigit() and line != "WEBVTT" and not line.startswith(("NOTE", "Kind:", "Language:")):
            text_lines.append(line)
    flush()
    return cues


def command_vtt_to_md(args: argparse.Namespace) -> None:
    source = Path(args.input)
    if not source.is_file():
        die(f"VTT file does not exist: {source}")
    cues = parse_vtt(source)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    lines = [f"# Transcript: {source.stem}", "", f"- Source file: `{source.name}`", ""]
    lines.extend(f"- `{timestamp}` {caption}" for timestamp, caption in cues)
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(str(output))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    check = sub.add_parser("check", help="Check environment without exposing secrets")
    check.set_defaults(func=command_check)

    serper = sub.add_parser("serper", help="Run one Serper search")
    serper.add_argument("--query", required=True)
    serper.add_argument("--output", required=True)
    serper.add_argument("--gl", default="us")
    serper.add_argument("--hl", default="en")
    serper.add_argument("--num", type=int, default=10, choices=range(1, 101), metavar="1..100")
    serper.add_argument("--timeout", type=int, default=30)
    serper.set_defaults(func=command_serper)

    yt_search = sub.add_parser("youtube-search", help="Search YouTube with yt-dlp")
    yt_search.add_argument("--query", required=True)
    yt_search.add_argument("--output", required=True)
    yt_search.add_argument("--limit", type=int, default=10, choices=range(1, 51), metavar="1..50")
    yt_search.add_argument("--cookies-from-browser")
    yt_search.set_defaults(func=command_youtube_search)

    yt_subs = sub.add_parser("youtube-subs", help="Download English subtitles with yt-dlp")
    yt_subs.add_argument("--url", required=True)
    yt_subs.add_argument("--output-dir", required=True)
    yt_subs.add_argument("--cookies-from-browser")
    yt_subs.set_defaults(func=command_youtube_subs)

    vtt = sub.add_parser("vtt-to-md", help="Convert VTT captions to timestamped Markdown")
    vtt.add_argument("--input", required=True)
    vtt.add_argument("--output", required=True)
    vtt.set_defaults(func=command_vtt_to_md)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
