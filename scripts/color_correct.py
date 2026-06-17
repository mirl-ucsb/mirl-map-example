#!/usr/bin/env python3
"""
Natural / documentary colour correction (OPTIONAL).

This is the image-prep pass mirl-map's reference project used. It assumes your
untouched originals live in photos_backup/ and writes corrected, upright copies
to photos/. It is entirely optional: if your photos are already web-ready, skip
straight to make_thumbs.py.

Philosophy: most documentary originals are well-exposed daylight photographs.
They need a restrained hand, not punchy auto-levels or aggressive white
balance. This pass:

  - Bakes EXIF orientation into the pixels (portrait shots shot at
    orientation 6 become upright), then resets the tag to 1, so every
    photo displays correctly in any browser, Leaflet popup, or lightbox.
  - Applies a GENTLE luminance-based black/white point and a small
    midtone nudge, the SAME linear transform across R, G, B so the
    colour balance and the character of the light are preserved.
  - Does NOT perform global white balance (which neutralises authentic
    warm afternoon light and green/golden scenes) and does NOT boost
    saturation.
  - Preserves GPS and all other EXIF so map placement is unchanged.

Usage:
  python3 color_correct.py            # backup/ -> photos/  (in place)
  python3 color_correct.py /tmp/out   # backup/ -> /tmp/out (preview)
"""

import os
import sys
import glob
import numpy as np
from PIL import Image, ImageOps, ImageFilter

# Repo root is the parent of this scripts/ directory (no absolute paths).
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, "photos_backup")
EXTS = ("jpg", "jpeg", "png", "JPG", "JPEG", "PNG")


def luminance(arr):
    return 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]


def correct(img):
    """Return a gently tone-corrected copy. img must already be upright RGB."""
    arr = np.asarray(img, dtype=np.float64)
    L = luminance(arr)

    # --- 1. Gentle black/white point from luminance percentiles ---------
    # Conservative clip; blended so it never looks harsh. Applied as one
    # linear transform to all channels (no per-channel = no colour shift).
    lo = np.percentile(L, 0.4)
    hi = np.percentile(L, 99.6)
    if hi - lo > 20:
        # Target a near-but-not-pure black/white so highlights/shadows
        # keep some texture.
        tlo, thi = 4.0, 251.0
        scale = (thi - tlo) / (hi - lo)
        # Blend toward the stretch (0 = none, 1 = full).
        blend = 0.6
        scale = 1.0 + (scale - 1.0) * blend
        offset = (tlo - lo * scale) * blend
        arr = arr * scale + offset

    # --- 2. Mild midtone exposure nudge toward a documentary mid --------
    # Only nudges outliers; keeps moody interiors moody, bright scenes bright.
    L2 = luminance(np.clip(arr, 0, 255))
    mean = L2.mean()
    target = 120.0
    # how far to move, capped and partial
    if mean > 1:
        gamma = np.log(target / 255.0) / np.log(max(mean, 1.0) / 255.0)
        gamma = float(np.clip(gamma, 0.82, 1.18))   # never aggressive
        # apply only partially
        gamma = 1.0 + (gamma - 1.0) * 0.5
        if abs(gamma - 1.0) > 0.005:
            arr = 255.0 * np.power(np.clip(arr, 0, 255) / 255.0, gamma)

    arr = np.clip(arr, 0, 255).astype(np.uint8)
    out = Image.fromarray(arr)

    # --- 3. Minimal output sharpening for web display -------------------
    out = out.filter(ImageFilter.UnsharpMask(radius=1.2, percent=55, threshold=2))
    return out


def stats(img):
    arr = np.asarray(img, dtype=np.float64)
    L = luminance(arr)
    return L.mean(), L.std(), arr[:, :, 0].mean() - arr[:, :, 2].mean()


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "photos")
    os.makedirs(out_dir, exist_ok=True)
    if not os.path.isdir(SRC):
        print(f"ERROR: source directory not found: {SRC}\n"
              f"Put your untouched originals in photos_backup/ (it is gitignored), "
              f"or skip this step if your photos are already web-ready.")
        sys.exit(1)
    files = sorted({p for e in EXTS for p in glob.glob(os.path.join(SRC, "*." + e))})
    print(f"Processing {len(files)} photos  {SRC} -> {out_dir}\n")

    for f in files:
        name = os.path.basename(f)
        original = Image.open(f)
        exif = original.getexif()
        orient = exif.get(0x0112)

        # Bake EXIF orientation into pixels, then drop the tag.
        img = ImageOps.exif_transpose(original).convert("RGB")

        b0, c0, w0 = stats(img)
        out = correct(img)
        b1, c1, w1 = stats(out)

        # Preserve EXIF (GPS, datetime, etc.) but reset orientation to 1
        # since the rotation is now baked into the pixels.
        exif_bytes = None
        if 0x0112 in exif:
            exif[0x0112] = 1
        try:
            exif_bytes = exif.tobytes()
        except Exception:
            exif_bytes = None

        save_kw = {"quality": 92, "subsampling": "4:4:4"}
        if exif_bytes:
            save_kw["exif"] = exif_bytes
        out.save(os.path.join(out_dir, name), "JPEG", **save_kw)

        rot = " [rotated upright]" if orient not in (None, 1) else ""
        print(f"  {name}  bright {b0:5.1f}->{b1:5.1f}  contrast {c0:4.1f}->{c1:4.1f}  warm {w0:+5.1f}->{w1:+5.1f}{rot}")

    print("\nDone.")


if __name__ == "__main__":
    main()
