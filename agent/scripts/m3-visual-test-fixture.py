#!/usr/bin/env python3
"""M3 synthetic test fixture; intentionally NOT a game logo or favicon.io output."""
import struct
import sys
import hashlib
import re
import zlib
from pathlib import Path

W = H = 512
FONT = {
    "T": ["11111","00100","00100","00100","00100","00100","00100"],
    "E": ["11111","10000","10000","11110","10000","10000","11111"],
    "S": ["01111","10000","10000","01110","00001","00001","11110"],
}

def chunk(kind, body):
    return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xffffffff)

def fixture_png(nonce=None):
    nonce_digest = hashlib.sha256(nonce.encode()).digest() if nonce else None
    buf = bytearray()
    for y in range(H):
        buf.append(0)  # PNG scanline no-filter
        for x in range(W):
            # Fully transparent padding outside central card.
            if 28 <= x < 484 and 28 <= y < 484:
                px = (19, 36, 62, 255)
                if 48 <= x < 464 and 48 <= y < 464:
                    px = (10, 177, 207, 255) if (x//32+y//32)%2 else (255, 127, 51, 255)
                if 72 <= x < 440 and 148 <= y < 364:
                    px = (19, 36, 62, 255)
                if nonce_digest is not None and 384 <= y < 400 and 180 <= x < 260:
                    bar = (x-180)//10
                    if (x-180)%10 < 8:
                        px=(nonce_digest[bar], 255-nonce_digest[bar], 100, 255)
                # Render TEST in a chunky, unmistakable test-only pixel font.
                for index, ch in enumerate("TEST"):
                    ox = 93 + index*83
                    if ox <= x < ox+60 and 190 <= y < 274:
                        glyph = FONT[ch]
                        gx,gy = (x-ox)//12,(y-190)//12
                        if gx<5 and gy<7 and glyph[gy][gx]=='1':
                            px=(255,255,255,255)
            else:
                px=(0,0,0,0)
            buf.extend(px)
    raw=b"\x89PNG\r\n\x1a\n"
    hdr=struct.pack(">IIBBBBB",W,H,8,6,0,0,0)
    return raw+chunk(b"IHDR",hdr)+chunk(b"IDAT",zlib.compress(bytes(buf),6))+chunk(b"IEND",b"")

if __name__=="__main__":
    if len(sys.argv) not in (2,4) or (len(sys.argv)==4 and sys.argv[2]!="--nonce"):
        raise SystemExit("Usage: python3 m3-visual-test-fixture.py ABSOLUTE_OUTPUT_PATH [--nonce RUN_ID]")
    nonce=sys.argv[3] if len(sys.argv)==4 else None
    if nonce is not None and not re.fullmatch(r"[a-zA-Z0-9_-]{1,100}",nonce):
        raise SystemExit("INVALID_NONCE")
    dst=Path(sys.argv[1])
    if not dst.is_absolute() or not dst.parent.is_dir() or dst.exists():raise SystemExit("unsafe or existing output path")
    dst.write_bytes(fixture_png(nonce))
    dst.chmod(0o600)
    print("M3_SYNTHETIC_TEST_PNG_PREPARED")
