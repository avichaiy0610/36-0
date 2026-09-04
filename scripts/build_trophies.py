"""Turn photographs of the five trophies into the art the game ships.

WHY THIS EXISTS. Three rounds of hand-written SVG got the shapes roughly right
and the likeness wrong, and the reason is structural: writing bezier coordinates
is drawing blind. A designer traces a photo with the reference underneath the
pen; this pipeline does the same thing the only way that actually works here —
it uses the photograph itself.

WHY DATA URIs AND NOT FILES. /js/ is cached for a year and already loaded, so
art embedded in trophies.js costs ZERO extra edge requests. Five PNG files would
cost five requests on every cold visit, and the free tier is metered in exactly
that (docs/CACHING.md). At 88x110 a cut-out trophy is a few KB; the SVG version
it replaces was 23KB for the set, so this is a fair trade for a real likeness.

USAGE
  1. drop the five photos in _trophy_refs/ named league/cup/ucl/uel/uecl
     (.png .jpg .jpeg .webp all fine)
  2. python scripts/build_trophies.py
  3. it writes js/trophy-art.js — trophies.js picks it up automatically

The background cut is a flood fill from the corners, so a photo on a plain white
or plain black studio background comes out clean. A photo taken against a CROWD
(the Europa League one) has no plain background to remove and must be cut out by
hand first, or replaced with a studio shot — the script says so rather than
quietly shipping a rectangle of stadium.
"""

import base64
import io
import os
import sys

try:
    from PIL import Image
    import numpy as np
except ImportError:
    sys.exit("needs Pillow and numpy: python -m pip install pillow numpy")

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
REFS = os.path.join(BASE, '_trophy_refs')
OUT = os.path.join(BASE, 'js', 'trophy-art.js')

KINDS = ['league', 'cup', 'ucl', 'uel', 'uecl']
EXTS = ('.png', '.jpg', '.jpeg', '.webp')
# 2x the largest place one is drawn (44px in the cabinet), so it stays sharp on
# a retina phone without paying for a full-resolution photo.
TARGET_H = 112
BG_TOL = 30          # how far from the corner colour still counts as background


def find(kind):
    for ext in EXTS:
        p = os.path.join(REFS, kind + ext)
        if os.path.exists(p):
            return p
    return None


def already_cut(im):
    """A source that arrived with its own alpha is already the artwork.

    Two of the five did, and flood-filling them AGAIN was actively destructive:
    the pass replaced a clean hand cut with its own guess and left a pale block
    of leftover backdrop down one side of the Champions League trophy. If the
    file says it is cut out, believe it."""
    a = np.array(im.convert('RGBA'))
    return (a[:, :, 3] < 250).mean() > 0.15


def has_plain_backdrop(im):
    """Is there a uniform background to remove at all?

    Measured on the whole border rather than the four corners: a studio shot is
    one flat colour all the way round (spread 0-7 on these), a photograph taken
    in a stadium is not (spread 255). This is the test that catches the picture
    with a crowd in it, which the earlier version waved through because the dark
    sky in its top corners happened to flood-fill far enough to pass."""
    a = np.array(im.convert('RGB')).astype(np.int16)
    b = np.concatenate([a[0, :, :], a[-1, :, :], a[:, 0, :], a[:, -1, :]])
    spread = int(b.max(axis=0).max() - b.min(axis=0).min())
    return spread <= 60, spread


def cut_background(im):
    """Flood fill inward from every border pixel that matches the border colour."""
    im = im.convert('RGBA')
    a = np.array(im).astype(np.int16)
    h, w = a.shape[:2]
    border = np.concatenate([a[0, :, :3], a[-1, :, :3], a[:, 0, :3], a[:, -1, :3]])
    bg = np.median(border, axis=0)

    close = (np.abs(a[:, :, :3] - bg).max(axis=2) <= BG_TOL)

    # only background CONNECTED to an edge is removed, so a white highlight in
    # the middle of a polished cup is never punched out
    seen = np.zeros((h, w), bool)
    stack = []
    for x in range(w):
        for y in (0, h - 1):
            if close[y, x]:
                stack.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if close[y, x]:
                stack.append((y, x))
    while stack:
        y, x = stack.pop()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x] or not close[y, x]:
            continue
        seen[y, x] = True
        stack.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))

    alpha = np.where(seen, 0, 255).astype(np.uint8)
    a[:, :, 3] = alpha
    out = Image.fromarray(a.astype(np.uint8), 'RGBA')

    removed = seen.mean()
    return out, removed


def process(kind, path):
    im = Image.open(path)
    if already_cut(im):
        im = im.convert('RGBA')
        note = 'kept its own alpha'
    else:
        plain, spread = has_plain_backdrop(im)
        if not plain:
            return None, ('no plain backdrop to remove (border varies by %d) — this is a '
                          'photograph of the trophy in a stadium, not a studio shot. '
                          'Replace it with one on white, or cut it out by hand and save '
                          'it as a PNG with transparency.' % spread), None
        im, removed = cut_background(im)
        if removed < 0.05:
            return None, 'the backdrop looked plain but almost nothing was removed', None
        note = 'cut %.0f%% backdrop' % (removed * 100)

    box = im.getbbox()
    if not box:
        return None, 'the cut removed everything', None
    im = im.crop(box)
    w, h = im.size
    im = im.resize((max(1, round(w * TARGET_H / h)), TARGET_H), Image.LANCZOS)

    # Silver is very nearly greyscale, so a full-colour PNG spends most of its
    # bytes on distinctions the eye never makes here. Quantising to a palette
    # keeps the metal and roughly halves the file; the alpha channel is preserved
    # separately because palette mode would otherwise flatten the cut edge.
    alpha = im.getchannel('A')
    rgb = im.convert('RGB').quantize(colors=96, method=Image.MEDIANCUT, dither=Image.NONE)
    out = rgb.convert('RGBA')
    out.putalpha(alpha)
    buf = io.BytesIO()
    out.save(buf, 'PNG', optimize=True)
    small = buf.getvalue()

    buf2 = io.BytesIO()
    im.save(buf2, 'PNG', optimize=True)
    full = buf2.getvalue()
    return (small if len(small) < len(full) else full), None, note


def main():
    if not os.path.isdir(REFS):
        os.makedirs(REFS, exist_ok=True)
        sys.exit('created %s — put the five photos in it and run again' % REFS)

    art, problems = {}, []
    for kind in KINDS:
        p = find(kind)
        if not p:
            problems.append('%-7s no file (looked for %s.{png,jpg,jpeg,webp})' % (kind, kind))
            continue
        data, err, note = process(kind, p)
        if err:
            problems.append('%-7s %s' % (kind, err))
            continue
        art[kind] = base64.b64encode(data).decode('ascii')
        print('  %-7s %6d B -> %6d B base64   (%s)' % (kind, len(data), len(art[kind]), note))

    if problems:
        print('\nnot built:')
        for x in problems:
            print('  ' + x)
    if not art:
        sys.exit('\nnothing to write.')

    body = ',\n'.join('  %s: "data:image/png;base64,%s"' % (k, art[k]) for k in KINDS if k in art)
    with io.open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(
            '// GENERATED by scripts/build_trophies.py — do not edit by hand.\n'
            '// Photographs of the five trophies, cut out and shrunk to %dpx tall, inlined\n'
            '// as data URIs so they cost no edge requests. js/trophies.js prefers these\n'
            '// over its drawn fallbacks whenever a kind is present here.\n'
            'const TROPHY_ART = {\n%s\n};\n' % (TARGET_H, body))
    total = sum(len(v) for v in art.values())
    print('\nwrote js/trophy-art.js — %d of 5 kinds, %.1f KB total' % (len(art), total / 1024))
    print('then: node scripts/stamp_assets.js')


if __name__ == '__main__':
    main()
