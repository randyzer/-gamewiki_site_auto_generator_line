#!/usr/bin/env python3
"""Host-side M3 binary validation of a favicon.io bundle.

This is structural validation, NOT a claim about the website or icon authorship.
It rejects previously accepted 7-member placeholder/fake ZIP files.
"""
import json
import stat
import struct
import sys
import zipfile
import zlib
from pathlib import Path

SIZES = {
    "apple-touch-icon.png": (180, 180),
    "favicon-32x32.png": (32, 32),
    "favicon-16x16.png": (16, 16),
    "android-chrome-192x192.png": (192, 192),
    "android-chrome-512x512.png": (512, 512),
}
EXPECTED = set(SIZES) | {"favicon.ico", "site.webmanifest"}
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def png_dimensions(raw, name, expected):
    if not raw.startswith(PNG_SIGNATURE) or len(raw) < 57:
        raise ValueError(f"{name}: invalid PNG signature/length")
    if raw[12:16] != b"IHDR" or struct.unpack(">I", raw[8:12])[0] != 13:
        raise ValueError(f"{name}: malformed PNG IHDR")
    width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", raw[16:29])
    if (width, height) != expected or (depth, compression, filtering, interlace) != (8, 0, 0, 0) or color not in (2, 6):
        raise ValueError(f"{name}: invalid PNG format or dimensions")
    offset = 8
    have_idat = False
    have_iend = False
    compressed_size = 0
    compressed_chunks = []
    while offset < len(raw):
        if offset + 12 > len(raw):
            raise ValueError(f"{name}: truncated PNG")
        size = struct.unpack(">I", raw[offset:offset+4])[0]
        if size > 8*1024*1024 or offset + size + 12 > len(raw):
            raise ValueError(f"{name}: oversized PNG chunk")
        kind = raw[offset+4:offset+8]
        payload = raw[offset+8:offset+8+size]
        crc = struct.unpack(">I", raw[offset+8+size:offset+12+size])[0]
        if zlib.crc32(kind+payload) & 0xffffffff != crc:
            raise ValueError(f"{name}: invalid PNG CRC")
        if kind == b"IDAT":
            have_idat = True
            compressed_size += size
            compressed_chunks.append(payload)
        if kind == b"IEND":
            if size != 0 or offset + 12 + size != len(raw):
                raise ValueError(f"{name}: trailing or invalid PNG IEND")
            have_iend = True
        offset += 12+size
    if not have_idat or not have_iend or compressed_size == 0:
        raise ValueError(f"{name}: incomplete PNG")
    pixel_bytes = 4 if color == 6 else 3
    expected_length = height * (1 + width * pixel_bytes)
    if expected_length > 2*1024*1024:
        raise ValueError(f"{name}: oversized decoded PNG")
    try:
        inflater = zlib.decompressobj()
        inflated = inflater.decompress(b"".join(compressed_chunks), expected_length + 1)
        if len(inflated) > expected_length:
            raise ValueError(f"{name}: decoded PNG output exceeded expected bounds")
        inflated += inflater.flush(expected_length + 1 - len(inflated))
    except zlib.error:
        raise ValueError(f"{name}: invalid compressed pixels")
    if len(inflated) != expected_length or not inflater.eof or inflater.unused_data or inflater.unconsumed_tail:
        raise ValueError(f"{name}: invalid decoded PNG dimensions")
    stride = 1 + width * pixel_bytes
    if any(inflated[row*stride] > 4 for row in range(height)):
        raise ValueError(f"{name}: invalid PNG scanline filter")
    return width, height


def validate_ico(raw):
    if len(raw) < 22:
        raise ValueError("favicon.ico: incomplete ICO")
    reserved, kind, count = struct.unpack("<HHH", raw[:6])
    if (reserved, kind) != (0, 1) or not 1 <= count <= 20:
        raise ValueError("favicon.ico: invalid header")
    end = 6 + count*16
    if end > len(raw):
        raise ValueError("favicon.ico: truncated icon directory")
    for index in range(count):
        entry = raw[6 + index*16:6+(index+1)*16]
        size, offset = struct.unpack("<II", entry[8:16])
        if size < 40 or offset < end or offset + size > len(raw):
            raise ValueError("favicon.ico: invalid icon payload")
        image = raw[offset:offset+size]
        if image.startswith(PNG_SIGNATURE):
            if image[12:16] != b"IHDR":
                raise ValueError("favicon.ico: malformed embedded PNG")
        elif image[:4] != b"\x28\x00\x00\x00":
            raise ValueError("favicon.ico: unexpected icon payload")


def verify(path):
    if path.is_symlink() or not path.is_file() or not 0 < path.stat().st_size <= 16*1024*1024:
        raise ValueError("favicon ZIP: invalid file")
    with zipfile.ZipFile(path) as archive:
        files = archive.infolist()
        names = [item.filename for item in files]
        if len(names) != len(EXPECTED) or set(names) != EXPECTED or len(names) != len(set(names)):
            raise ValueError("favicon ZIP: exact seven canonical members required")
        total = 0
        for item in files:
            name = item.filename
            mode = item.external_attr >> 16
            if (item.flag_bits & 1) or item.is_dir() or stat.S_ISLNK(mode) or "\\" in name or "/" in name:
                raise ValueError("favicon ZIP: unsafe member path/type")
            if item.file_size <= 0 or item.file_size > 8*1024*1024:
                raise ValueError("favicon ZIP: empty or oversized member")
            total += item.file_size
            if total > 20*1024*1024:
                raise ValueError("favicon ZIP: uncompressed size limit exceeded")
            raw = archive.read(item)  # ZIP CRC verified here
            if len(raw) != item.file_size:
                raise ValueError("favicon ZIP: truncated member")
            if name in SIZES:
                png_dimensions(raw, name, SIZES[name])
            elif name == "favicon.ico":
                validate_ico(raw)
            elif name == "site.webmanifest":
                if len(raw) > 16384:
                    raise ValueError("site.webmanifest: too large")
                data = json.loads(raw)
                if not isinstance(data, dict) or not isinstance(data.get("icons"), list):
                    raise ValueError("site.webmanifest: missing icons")
                srcs = {icon.get("src") for icon in data["icons"] if isinstance(icon, dict)}
                if not {"android-chrome-192x192.png", "android-chrome-512x512.png"} <= {s.lstrip("/") for s in srcs if isinstance(s,str)}:
                    raise ValueError("site.webmanifest: missing Chrome icon references")
    return {"status":"VALIDATED_BINARY_STRUCTURE", "members":sorted(EXPECTED), "provenanceVerified":False}


if __name__ == "__main__":
    try:
        output=verify(Path(sys.argv[1]))
        print(json.dumps(output,sort_keys=True))
    except (OSError,ValueError,IndexError,KeyError,zipfile.BadZipFile,RuntimeError,struct.error,zlib.error) as error:
        print(json.dumps({"status":"REJECTED","reason":str(error)[:220]}))
        sys.exit(2)
