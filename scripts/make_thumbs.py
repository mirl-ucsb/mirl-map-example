#!/usr/bin/env python3
"""
Generate the web-delivery image tiers for mirl-map.

The site serves three sizes of every photo so pages stay light (a full-res
set can be hundreds of MB; a 52px map marker should not download 4 MB). From
each full-resolution image in photos/ this writes two downscaled tiers:

  photos/thumb/  ~480px longest side  (map markers, search results)
  photos/web/   ~1400px longest side  (gallery grid, map drawer, popups)

photos/ (full resolution) is left untouched and served only in the lightbox
"Full size" view. EXIF is stripped from the derivatives (map placement comes
from js/data/photos.js, not image EXIF; orientation is baked into the pixels
by color_correct.py if you use it).

Run this whenever you add or change photos. It is a REQUIRED step, not optional.

Usage:
  python3 scripts/make_thumbs.py            # uses ./photos
  python3 scripts/make_thumbs.py /path/to/photos

Requires Pillow:  pip3 install Pillow

The (name, max-longest-side, JPEG-quality) tiers below must match
CONFIG.images in js/config.js (photos/, photos/web/, photos/thumb/).
"""

import os, sys, glob
from PIL import Image, ImageOps

# Repo root is the parent of this scripts/ directory.
REPO   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "photos")
TIERS  = [("thumb", 480, 80), ("web", 1400, 82)]
EXTS   = ("jpg", "jpeg", "png", "JPG", "JPEG", "PNG")


def find_images(directory):
    found = []
    for ext in EXTS:
        found += glob.glob(os.path.join(directory, "*." + ext))
    return sorted(set(found))


def main():
    if not os.path.isdir(PHOTOS):
        print(f"ERROR: photos directory not found: {PHOTOS}")
        sys.exit(1)
    for name, _, _ in TIERS:
        os.makedirs(os.path.join(PHOTOS, name), exist_ok=True)

    files = find_images(PHOTOS)
    print(f"Generating derivatives for {len(files)} photos in {PHOTOS}\n")
    totals = {name: 0 for name, _, _ in TIERS}

    for f in files:
        base = os.path.basename(f)
        img = ImageOps.exif_transpose(Image.open(f)).convert("RGB")  # no-op if already upright
        for name, maxdim, q in TIERS:
            d = img.copy()
            d.thumbnail((maxdim, maxdim), Image.LANCZOS)
            out = os.path.join(PHOTOS, name, base)
            d.save(out, "JPEG", quality=q, optimize=True, progressive=True)
            totals[name] += os.path.getsize(out)

    for name, maxdim, _ in TIERS:
        print(f"  photos/{name}/  ({maxdim}px)  total {totals[name] / 1048576:.1f} MB")
    print("\nDone. Full-resolution photos/ left untouched.")


if __name__ == "__main__":
    main()
