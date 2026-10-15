#!/usr/bin/env python3
"""Compare decoded 512px RGBA PNG pixels for manually handed-off favicon packages.

The ZIP structural validator runs first. This script only compares two vetted
512px PNGs, with strict decompression bounds and PNG filter reconstruction.
"""
import struct
import sys
import zipfile
import zlib
from pathlib import Path

MAX_INPUT = 8 * 1024 * 1024
WIDTH = HEIGHT = 512
STRIDE = WIDTH * 4


def pixels(blob):
    if not (57 <= len(blob) <= MAX_INPUT) or blob[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("M3_INVALID_512_RGBA_PNG")
    pos = 8
    data = []
    header = False
    finished = False
    while pos < len(blob):
        if pos + 12 > len(blob):
            raise ValueError("M3_TRUNCATED_PNG")
        length = struct.unpack(">I", blob[pos:pos + 4])[0]
        end = pos + length + 12
        if length > MAX_INPUT or end > len(blob):
            raise ValueError("M3_BAD_PNG_CHUNK_SIZE")
        kind = blob[pos + 4:pos + 8]
        chunk = blob[pos + 8:end - 4]
        crc = struct.unpack(">I", blob[end - 4:end])[0]
        if zlib.crc32(kind + chunk) & 0xFFFFFFFF != crc:
            raise ValueError("M3_PNG_CHUNK_CRC_MISMATCH")
        if kind == b"IHDR":
            if header or length != 13 or pos != 8:
                raise ValueError("M3_INVALID_PNG_HEADER")
            dimensions = struct.unpack(">IIBBBBB", chunk)
            if dimensions != (WIDTH, HEIGHT, 8, 6, 0, 0, 0):
                raise ValueError("M3_INVALID_PNG_DIMENSIONS")
            header = True
        elif kind == b"IDAT":
            if not header or finished:
                raise ValueError("M3_INVALID_PNG_DATA")
            data.append(chunk)
        elif kind == b"IEND":
            if length != 0 or end != len(blob):
                raise ValueError("M3_INVALID_PNG_END")
            finished = True
        elif kind not in (b"sRGB", b"gAMA", b"cHRM", b"pHYs"):
            raise ValueError("M3_UNEXPECTED_PNG_CHUNK")
        pos = end
    if not header or not finished or not data:
        raise ValueError("M3_INCOMPLETE_PNG")
    compressed = b"".join(data)
    output_size = HEIGHT * (STRIDE + 1)
    decoder = zlib.decompressobj()
    raw = decoder.decompress(compressed, output_size + 1)
    if len(raw) > output_size or decoder.unconsumed_tail:
        raise ValueError("M3_PNG_DECODE_BOUND")
    raw += decoder.flush()
    if len(raw) != output_size or not decoder.eof or decoder.unused_data:
        raise ValueError("M3_PNG_DECODE_LENGTH")
    out = bytearray()
    before = bytearray(STRIDE)
    offset = 0
    for _ in range(HEIGHT):
        method = raw[offset]
        offset += 1
        row = bytearray(raw[offset:offset + STRIDE])
        offset += STRIDE
        if method > 4:
            raise ValueError("M3_BAD_PNG_FILTER")
        for idx in range(STRIDE):
            left = row[idx - 4] if idx >= 4 else 0
            upper = before[idx]
            upper_left = before[idx - 4] if idx >= 4 else 0
            if method == 0:
                predictor = 0
            elif method == 1:
                predictor = left
            elif method == 2:
                predictor = upper
            elif method == 3:
                predictor = (left + upper) // 2
            else:
                estimate = left + upper - upper_left
                a, b, c = abs(estimate-left), abs(estimate-upper), abs(estimate-upper_left)
                predictor = left if a <= b and a <= c else upper if b <= c else upper_left
            row[idx] = (row[idx] + predictor) & 255
        out.extend(row)
        before = row
    return bytes(out)


def compare(source, archive):
    src = Path(source).read_bytes()
    with zipfile.ZipFile(archive) as z:
        output = z.read("android-chrome-512x512.png")
    if pixels(src) != pixels(output):
        raise ValueError("M3_FAVICON_PIXEL_MISMATCH")
    return True


if __name__ == "__main__":
    try:
        if len(sys.argv) != 3:
            raise ValueError("M3_USAGE_SOURCE_AND_ZIP")
        compare(sys.argv[1], sys.argv[2])
        print("M3_PIXEL_MATCH_VERIFIED")
    except (OSError, ValueError, zipfile.BadZipFile, RuntimeError, zlib.error) as error:
        code = str(error)
        print(code if code.startswith("M3_") else "M3_PIXEL_COMPARISON_FAILED")
        sys.exit(2)
