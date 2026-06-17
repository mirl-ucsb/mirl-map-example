#!/usr/bin/env python3
"""
add_photo.py — add a photograph to the map from the command line.

Usage:
    python3 add_photo.py photos/my-photo.jpg

Two modes, chosen automatically:

  * CMS / content model (this repo): if content/photos/ exists, it writes
    content/photos/<id>.md (the editable source the /admin CMS also uses, with
    coordinates / bearing / FOV / capture time filled from the photo's EXIF) and
    runs scripts/build_content.py to regenerate js/data/photos.js, the narrative
    file, and the web/thumb tiers.

  * Legacy model (a fork that hasn't enabled the CMS): if there is no
    content/photos/, it appends directly to js/data/photos.js (then you run
    scripts/make_thumbs.py yourself).

If the photo has no GPS EXIF, it asks you to type the coordinates.

Requires Pillow (and PyYAML for the content model): pip3 install Pillow PyYAML
"""

import sys, os, re, json
from pathlib import Path

REPO        = Path(__file__).resolve().parent
PHOTOS_DIR  = REPO / "photos"
PHOTOS_JS   = REPO / "js" / "data" / "photos.js"
CONTENT_DIR = REPO / "content" / "photos"
EXTS        = (".jpg", ".jpeg", ".png", ".heic", ".heif")


def dms_to_decimal(dms, ref):
    d, m, s = [float(x) for x in dms]
    v = d + m / 60 + s / 3600
    return round(-v if ref in ("S", "W") else v, 6)


def read_gps(filepath):
    """Return (lat, lon) from EXIF, or None."""
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS
    except ImportError:
        print("ERROR: Pillow not installed. Run: pip3 install Pillow")
        sys.exit(1)
    try:
        exif = Image.open(filepath)._getexif() or {}
    except Exception:
        return None
    named = {TAGS.get(k, k): v for k, v in exif.items()}
    gps = named.get("GPSInfo")
    if not gps:
        return None
    g = {GPSTAGS.get(k, k): v for k, v in gps.items()}
    if "GPSLatitude" in g and "GPSLongitude" in g:
        return (dms_to_decimal(g["GPSLatitude"], g.get("GPSLatitudeRef", "N")),
                dms_to_decimal(g["GPSLongitude"], g.get("GPSLongitudeRef", "E")))
    return None


def prompt(label):
    return input(f"{label} [Enter to skip]: ").strip()


def write_content_entry(filename, caption, manual_coords):
    """CMS/content model: write content/photos/<base>.md (EXIF-filled), then build."""
    sys.path.insert(0, str(REPO / "scripts"))
    import build_content
    import yaml

    def _q(dumper, data):
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="'")
    yaml.add_representer(str, _q, Dumper=yaml.SafeDumper)

    base = Path(filename).stem
    exif = build_content.read_exif(str(PHOTOS_DIR / filename))   # lat/lon/bearing/fov/taken_at
    fm = {"image": "/photos/" + filename, "caption": caption}
    for k in ("lat", "lon", "bearing", "fov", "taken_at"):
        if exif.get(k) is not None:
            fm[k] = exif[k]
    if "lat" not in fm and manual_coords:
        fm["lat"], fm["lon"] = manual_coords

    out = CONTENT_DIR / (base + ".md")
    out.write_text("---\n" + yaml.safe_dump(fm, sort_keys=False, allow_unicode=True) + "---\n\n",
                   encoding="utf-8")
    print(f"Wrote content/photos/{base}.md")
    print("Building (photos.js + narrative + tiers)...")
    build_content.main()
    print(f"\nDone. Edit the caption or add a narrative anytime in /admin, or by "
          f"editing content/photos/{base}.md.")


def append_photos_js(filename, caption, coords):
    """Legacy model: append directly to js/data/photos.js."""
    text = PHOTOS_JS.read_text()
    s, e = text.find("["), text.rfind("]")
    photos = json.loads(text[s:e + 1]) if s >= 0 else []
    if any(p["file"] == filename for p in photos):
        print(f"'{filename}' is already on the map. Nothing to do.")
        return
    photos.append({"file": filename, "lat": coords[0], "lon": coords[1],
                   "caption": caption, "source_ids": []})
    header = ""
    m = re.search(r"^(.*?)const\s+photoInfo\s*=", text, re.S)
    if m:
        header = m.group(1)
    PHOTOS_JS.write_text(header + "const photoInfo = " +
                         json.dumps(photos, ensure_ascii=False, indent=2) + ";\n")
    print(f"Added to js/data/photos.js as entry #{len(photos)}.")
    print("Next: python3 scripts/make_thumbs.py   (generate web/thumb tiers), then reload.")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    filepath = Path(sys.argv[1])
    if not filepath.is_absolute():
        filepath = REPO / filepath
    filepath = filepath.resolve()
    if not filepath.exists():
        print(f"ERROR: file not found: {filepath}")
        sys.exit(1)
    if filepath.suffix.lower() not in EXTS:
        print(f"ERROR: unsupported file type: {filepath.suffix}")
        sys.exit(1)

    filename = filepath.name
    PHOTOS_DIR.mkdir(exist_ok=True)
    dest = PHOTOS_DIR / filename
    if filepath != dest:
        import shutil
        shutil.copy2(filepath, dest)
        print(f"Copied {filename} -> photos/")

    coords = read_gps(dest)
    had_gps = coords is not None
    if had_gps:
        print(f"GPS found: {coords[0]:.6f}, {coords[1]:.6f}")
    else:
        print("No GPS in EXIF. Enter coordinates (right-click a spot in Google Maps to copy).")
        try:
            lat = float(prompt("Latitude  (e.g. 34.41386)") or "nan")
            lon = float(prompt("Longitude (e.g. -119.84905)") or "nan")
            if lat != lat or lon != lon:
                raise ValueError
            coords = (lat, lon)
        except ValueError:
            print("ERROR: latitude and longitude are required.")
            sys.exit(1)

    caption = prompt("Caption (one or two sentences)")

    if CONTENT_DIR.is_dir():
        write_content_entry(filename, caption, None if had_gps else coords)
    else:
        append_photos_js(filename, caption, coords)


if __name__ == "__main__":
    main()
