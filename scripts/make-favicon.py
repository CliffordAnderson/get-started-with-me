#!/usr/bin/env python3
"""Draw favicon.ico and favicon.svg from the site's own class markers.
No packages required.

The mark is the pair drawPoint() puts on every scatter plot in the lessons:
class 0 as a blue ring, class 1 as a brown square, on the paper colour the
pages are printed on. Proportions follow assets/lesson.js — a ring stroke of
0.325r and a square corner radius of 0.3125 of its half-width — so the icon
and the plots are drawn to one specification. Both files come from the
constants below, so the vector and the bitmap cannot drift apart. Run it
after changing either.
"""
from pathlib import Path
import struct, sys, zlib

ROOT = Path(__file__).resolve().parents[1]
SIZES = (16, 32, 48)
SS = 16                                   # supersampling factor per axis

FIELD = (0xEF, 0xED, 0xE5)                # --field, the paper
OFF   = (0x27, 0x4B, 0x8F)                # --off, class 0
ON    = (0x8A, 0x52, 0x06)                # --on,  class 1

RING_C, RING_R = 0.347, 0.213             # centre and radius, in unit squares
RING_W = 0.098                            # stroke; drawPoint's 0.325r comes to
                                          # barely one pixel at 16px and greys
                                          # out, so the ring is thickened here
SQ_C, SQ_H = 0.732, 0.183                 # centre and half-width; the square is
                                          # set smaller than the ring because a
                                          # solid shape carries more weight
SQ_R = 0.3125 * SQ_H                      # corner radius, as drawPoint's 2.5 at r=8

def ring_hit(x, y):
    d = ((x - RING_C) ** 2 + (y - RING_C) ** 2) ** 0.5
    return abs(d - RING_R) <= RING_W / 2

def square_hit(x, y):
    dx, dy = abs(x - SQ_C) - (SQ_H - SQ_R), abs(y - SQ_C) - (SQ_H - SQ_R)
    if dx <= 0 and dy <= 0:
        return True
    dx, dy = max(dx, 0.0), max(dy, 0.0)
    return (dx * dx + dy * dy) ** 0.5 <= SQ_R

def render(n):
    """Coverage-sampled RGB rows, top row first."""
    rows = []
    for py in range(n):
        row = []
        for px in range(n):
            ring = sq = 0
            for sy in range(SS):
                y = (py + (sy + 0.5) / SS) / n
                for sx in range(SS):
                    x = (px + (sx + 0.5) / SS) / n
                    if square_hit(x, y):
                        sq += 1
                    elif ring_hit(x, y):
                        ring += 1
            total = SS * SS
            r, g, b = FIELD
            for hits, colour in ((ring, OFF), (sq, ON)):
                if hits:
                    a = hits / total
                    r = round(r + (colour[0] - r) * a)
                    g = round(g + (colour[1] - g) * a)
                    b = round(b + (colour[2] - b) * a)
            row.append((r, g, b))
        rows.append(row)
    return rows

def ico(images):
    """Pack RGB images as a Windows .ico of 32-bit BMP entries."""
    head = struct.pack('<HHH', 0, 1, len(images))
    entries, blobs, offset = b'', b'', 6 + 16 * len(images)
    for n, rows in images:
        dib = struct.pack('<IiiHHIIiiII', 40, n, n * 2, 1, 32, 0, 0, 0, 0, 0, 0)
        pixels = b''.join(
            b''.join(struct.pack('<BBBB', b, g, r, 255) for r, g, b in row)
            for row in reversed(rows))                 # BMP rows run bottom-up
        mask = b'\x00' * (((n + 31) // 32) * 4 * n)    # every pixel opaque
        blob = dib + pixels + mask
        entries += struct.pack('<BBBBHHII', n % 256, n % 256, 0, 0, 1, 32,
                               len(blob), offset)
        blobs += blob
        offset += len(blob)
    return head + entries + blobs

def svg(box=64):
    """The same mark as vector, from the same constants.

    The palette is fixed rather than following prefers-color-scheme: the site
    has one theme, and a favicon that changed colour would be the only part of
    it that did. The paper background keeps the two dark inks legible on a dark
    tab strip, which a transparent version would not.
    """
    hexes = tuple('#%02X%02X%02X' % c for c in (FIELD, OFF, ON))
    n = lambda v: f'{v * box:.4g}'
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {box} {box}">\n'
        f'  <title>getstartedwith.me</title>\n'
        f'  <rect width="{box}" height="{box}" fill="{hexes[0]}"/>\n'
        f'  <circle cx="{n(RING_C)}" cy="{n(RING_C)}" r="{n(RING_R)}"\n'
        f'    fill="none" stroke="{hexes[1]}" stroke-width="{n(RING_W)}"/>\n'
        f'  <rect x="{n(SQ_C - SQ_H)}" y="{n(SQ_C - SQ_H)}"\n'
        f'    width="{n(2 * SQ_H)}" height="{n(2 * SQ_H)}"\n'
        f'    rx="{n(SQ_R)}" fill="{hexes[2]}"/>\n'
        f'</svg>\n')

def png(rows, scale=1):
    """A preview PNG, so the mark can be looked at rather than assumed."""
    n = len(rows)
    raw = b''
    for row in rows:
        line = b''.join(bytes(px) for px in row for _ in range(scale))
        raw += (b'\x00' + line) * scale
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c))
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', n * scale, n * scale, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))

if __name__ == '__main__':
    images = [(n, render(n)) for n in SIZES]
    target, vector = ROOT / 'favicon.ico', ROOT / 'favicon.svg'
    data, markup = ico(images), svg()
    if '--check' in sys.argv:
        assert target.read_bytes() == data, 'favicon.ico is stale: run python3 scripts/make-favicon.py'
        assert vector.read_text() == markup, 'favicon.svg is stale: run python3 scripts/make-favicon.py'
        print(f'favicon.ico is current ({", ".join(f"{n}x{n}" for n in SIZES)}); favicon.svg matches it.')
    else:
        target.write_bytes(data)
        vector.write_text(markup)
        print(f'Wrote favicon.ico: {", ".join(f"{n}x{n}" for n in SIZES)}, {len(data):,} bytes.')
        print(f'Wrote favicon.svg: {len(markup):,} bytes, from the same constants.')
        if '--preview' in sys.argv:
            out = Path(sys.argv[sys.argv.index('--preview') + 1])
            for n, rows in images:
                (out / f'favicon-{n}.png').write_bytes(png(rows, scale=max(1, 192 // n)))
            print(f'Wrote blown-up previews to {out}. Look at them before shipping a change.')
