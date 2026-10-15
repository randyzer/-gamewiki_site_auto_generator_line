#!/usr/bin/env python3
"""M3 experimental local favicon generator. Scoped to agent/runs/RUN_ID only.

This generates a local ZIP, NOT favicon.io evidence or homepage Skill approval.
Requires a run-specific approval matching the source hash.
"""
import hashlib
import io
import json
import os
import re
import stat
import sys
import zipfile
from pathlib import Path

from PIL import Image, __version__ as pillow_version

AGENT = Path(__file__).resolve().parent.parent
BASE = AGENT / "runs"
MEMBERS = (
    "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png",
    "android-chrome-192x192.png", "android-chrome-512x512.png",
    "favicon.ico", "site.webmanifest",
)
SIZES = (
    ("favicon-16x16.png", 16), ("favicon-32x32.png", 32),
    ("apple-touch-icon.png", 180), ("android-chrome-192x192.png", 192),
    ("android-chrome-512x512.png", 512),
)
MAX_PNG = 8 * 1024 * 1024
MAX_ZIP = 16 * 1024 * 1024


def error(code):
    raise ValueError(code)


def read_regular(path, expected_parent, size_limit=MAX_PNG):
    if path.parent != expected_parent or not path.is_absolute():
        error("M3_UNSAFE_PATH")
    current = expected_parent
    while current != AGENT:
        if current.is_symlink() or not current.is_dir():
            error("M3_LINKED_DIRECTORY")
        current = current.parent
    if not path.exists() or path.is_symlink():
        error("M3_UNSAFE_INPUT")
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or not 0 < info.st_size <= size_limit:
        error("M3_UNSAFE_INPUT")
    with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW), "rb") as fp:
        data = fp.read(size_limit + 1)
    if not 0 < len(data) <= size_limit:
        error("M3_UNSAFE_INPUT")
    return data


def png(image, size):
    if size == 512:
        raise AssertionError("Source master must be used for 512px")
    thumbnail = image.resize((size, size), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    thumbnail.save(out, format="PNG", compress_level=9, optimize=False)
    return out.getvalue()


def manifest():
    return (json.dumps({
        "name": "", "short_name": "",
        "icons": [
            {"src": "android-chrome-192x192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "android-chrome-512x512.png", "sizes": "512x512", "type": "image/png"},
        ],
        "theme_color": "#ffffff", "background_color": "#ffffff",
        "display": "standalone",
    }, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def pack(image, original):
    items = {}
    for name, size in SIZES:
        items[name] = original if size == 512 else png(image, size)
    ico = io.BytesIO()
    image.save(ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)],
               bitmap_format="png")
    items["favicon.ico"] = ico.getvalue()
    items["site.webmanifest"] = manifest()
    if set(items) != set(MEMBERS):
        error("M3_PACKAGE_MEMBER_MISMATCH")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED,
                         compresslevel=9, allowZip64=False) as target:
        for name in MEMBERS:
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            info.flag_bits = 0
            target.writestr(info, items[name], compress_type=zipfile.ZIP_DEFLATED,
                            compresslevel=9)
    result = buf.getvalue()
    if len(result) > MAX_ZIP:
        error("M3_PACKAGE_TOO_LARGE")
    return result


def main(run_id):
    if pillow_version != "12.3.0":
        error("M3_PILLOW_VERSION_MISMATCH")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", run_id):
        error("M3_BAD_RUN_ID")
    run = BASE / run_id
    area = run / "m3-local-favicon"
    inp = area / "input"
    out = area / "output"
    request = json.loads(read_regular(area / "REQUEST.json", area, 65536))
    approval_bytes = read_regular(area / "USER_APPROVAL.json", area, 65536)
    approval = json.loads(approval_bytes)
    pipeline = json.loads(read_regular(run / "manifest.json", run, 1024 * 1024))
    if (pipeline.get("runId") != run_id or
        pipeline.get("stages", [{}])[0].get("skill") != "game-homepage-icon-research" or
        pipeline.get("stages", [{}])[0].get("status") == "PASSED"):
        error("M3_RUN_NOT_ELIGIBLE")
    game = pipeline.get("inputs", {}).get("gameIdentity")
    if (not isinstance(game, str) or not game or
        request.get("gameIdentity") != game or request.get("runId") != run_id or
        request.get("mode") != "LOCAL_FAVICON_CONVERSION_V1" or
        request.get("stageMayPass") is not False):
        error("M3_REQUEST_IDENTITY_MISMATCH")
    source = inp / "master-512.png"
    source_bytes = read_regular(source, inp)
    source_digest = hashlib.sha256(source_bytes).hexdigest()
    request_digest = hashlib.sha256(read_regular(area / "REQUEST.json", area, 65536)).hexdigest()
    if (approval.get("schemaVersion") != 1 or
        approval.get("gameIdentity") != game or approval.get("runId") != run_id or
        approval.get("requestSha256") != request_digest or
        approval.get("sourceSha256") != source_digest or
        approval.get("visualReviewApproved") is not True or
        approval.get("originalArtworkRightsApproved") is not True or
        approval.get("artworkSourceStatement") != "USER_ATTESTED_ORIGINAL_GENERATED_ARTWORK" or
        approval.get("imageGenerationIndependentlyVerified") is not False or
        approval.get("sourceClaim") != "USER_SUPPLIED_VISUALLY_REVIEWED" or
        approval.get("siteOriginIndependentlyVerified") is not False or
        approval.get("stageMayPass") is not False):
        error("M3_APPROVAL_MISSING_OR_STALE")
    if source_bytes[:8] != b"\x89PNG\r\n\x1a\n":
        error("M3_SOURCE_NOT_PNG")
    try:
        with Image.open(io.BytesIO(source_bytes)) as image:
            if image.format != "PNG" or image.mode != "RGBA" or image.size != (512, 512):
                error("M3_SOURCE_REQUIRES_512_RGBA")
            image.load()
            alpha = image.getchannel("A")
            minimum, maximum = alpha.getextrema()
            if (minimum != 0 or maximum != 255 or
                any(image.getpixel(point)[3] != 0
                    for point in [(0, 0), (511, 0), (0, 511), (511, 511)])):
                error("M3_SOURCE_REQUIRES_TRANSPARENT_BORDER_AND_VISIBLE_MARK")
            content = pack(image, source_bytes)
    except (OSError, SyntaxError):
        error("M3_UNREADABLE_IMAGE")
    archive = out / "favicon.zip"
    if archive.is_symlink() or archive.exists():
        error("M3_OUTPUT_ALREADY_EXISTS")
    if out.is_symlink() or not out.is_dir():
        error("M3_UNSAFE_OUTPUT_DIRECTORY")
    handle = os.open(archive, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(handle, "wb") as fp:
            fp.write(content)
            fp.flush()
            os.fsync(fp.fileno())
    except BaseException:
        archive.unlink(missing_ok=True)
        raise
    response = {
        "schemaVersion": 1, "runId": run_id, "gameIdentity": game,
        "status": "LOCAL_FAVICON_BINARY_CREATED_ORIGIN_USER_ATTESTED",
        "origin": "LOCAL_FAVICON_CONVERSION_V1",
        "sourceSha256": source_digest,
        "zipSha256": hashlib.sha256(content).hexdigest(),
        "zipBytes": len(content), "members": list(MEMBERS),
        "approvalSha256": hashlib.sha256(approval_bytes).hexdigest(),
        "artworkOriginalitySource": "USER_ATTESTED_ORIGINAL_GENERATED_ARTWORK",
        "imageGenerationIndependentlyVerified": False,
        "pillowVersion": pillow_version,
        "faviconIoUsed": False, "bskTransferUsed": False,
        "siteOriginIndependentlyVerified": False,
        "originalSkillConversionRuleUpdated": True,
        "stageMayPass": False,
    }
    receipt = area / "ENGINE_RECEIPT.json"
    with os.fdopen(os.open(receipt, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600), "w", encoding="utf-8") as fp:
        fp.write(json.dumps(response, ensure_ascii=False, sort_keys=True) + "\n")
        fp.flush()
        os.fsync(fp.fileno())
    print("M3_LOCAL_ENGINE_OUTPUT_WRITTEN")
    return response


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            error("M3_USAGE_RUN_ID")
        main(sys.argv[1])
    except (ValueError, OSError, KeyError, TypeError, json.JSONDecodeError,
            zipfile.BadZipFile, RuntimeError) as problem:
        reason = str(problem)
        print(reason if re.fullmatch(r"M3_[A-Z0-9_]+", reason)
              else "M3_LOCAL_CONVERSION_UNAVAILABLE", file=sys.stderr)
        sys.exit(2)
