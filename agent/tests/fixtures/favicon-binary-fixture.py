#!/usr/bin/env python3
"""Synthetic binary fixture ONLY, not an actual generated brand icon or favicon.io ZIP."""
import json
import struct
import sys
import zipfile
import zlib

def chunk(kind, body):
    return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind+body) & 0xffffffff)

def png(width, height):
    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    # A transparent test image: zero filter, zero RGBA pixels.
    scan = (b"\x00" + b"\x00" * (width*4)) * height
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR",header) + chunk(b"IDAT",zlib.compress(scan,1)) + chunk(b"IEND",b"")

def make_zip(path):
    icons = {
        "apple-touch-icon.png":png(180,180),
        "favicon-32x32.png":png(32,32),
        "favicon-16x16.png":png(16,16),
        "android-chrome-192x192.png":png(192,192),
        "android-chrome-512x512.png":png(512,512),
    }
    embed=png(32,32)
    ico=struct.pack("<HHH",0,1,1)+struct.pack("<BBBBHHII",32,32,0,0,1,32,len(embed),22)+embed
    icons["favicon.ico"]=ico
    icons["site.webmanifest"]=json.dumps({"name":"Fixture","icons":[{"src":"/android-chrome-192x192.png","sizes":"192x192","type":"image/png"},
        {"src":"/android-chrome-512x512.png","sizes":"512x512","type":"image/png"}]}).encode()
    with zipfile.ZipFile(path,"w",compression=zipfile.ZIP_DEFLATED) as z:
        for name,payload in icons.items():z.writestr(name,payload)

if __name__=="__main__":
    make_zip(sys.argv[1])
