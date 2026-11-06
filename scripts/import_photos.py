#!/usr/bin/env python3
"""
import_photos.py: turn a batch of photographs into map pins in one step.

Adding photographs one at a time through the editor is fine for a few, but tedious
for many. This takes a pile of images and creates a pin for each: a small
content/photos/<id>.md stub that points at the image with a blank caption. The
location, camera direction, and date fill in automatically from each photo's
GPS/EXIF when the map builds, so all you do afterwards is write the captions.

Two ways it runs:

  * In the browser:  upload a batch in the editor's Media library (which DOES let
    you select many files at once), then run the "Import photos" action on your
    repository's Actions tab. It scaffolds a pin for every newly uploaded image.

  * On your computer:  python3 scripts/import_photos.py [folder-or-image ...]
    With no argument it scans the photos/ folder already in the repo. Given a
    folder or files, it copies those images into photos/ first.

Deleting a pin later never brings it back: every image imported is recorded in
content/.import-log, and an image listed there is never imported again (even if
its pin was deleted and the image file is still sitting in photos/).

Requires:  pip3 install Pillow PyYAML
"""

import os, sys, re, glob, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
# Reuse the EXIF reader and frontmatter helpers, so this stays in lock-step with
# how the build reads photographs.
from build_content import read_exif, image_basename, parse_md

REPO        = os.path.dirname(HERE)
PHOTOS_DIR  = os.path.join(REPO, "photos")
CONTENT_DIR = os.path.join(REPO, "content", "photos")
LEDGER      = os.path.join(REPO, "content", ".import-log")
IMG_EXT     = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}


def slugify(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "photo"


def load_log(path):
    if not os.path.exists(path):
        return set()
    with open(path, encoding="utf-8") as f:
        return {ln.strip() for ln in f if ln.strip() and not ln.startswith("#")}


def referenced_basenames():
    """Image filenames that already have a pin, so we never duplicate one."""
    out = set()
    for f in glob.glob(os.path.join(CONTENT_DIR, "*.md")):
        try:
            fm, _ = parse_md(open(f, encoding="utf-8").read())
            b = image_basename(fm)
            if b:
                out.add(b)
        except Exception:
            pass
    return out


def existing_slugs():
    return {os.path.splitext(os.path.basename(f))[0]
            for f in glob.glob(os.path.join(CONTENT_DIR, "*.md"))}


def gather_images(args):
    """List (source_path, is_external). No args = the photos/ folder, in place."""
    imgs = []
    if not args:
        names = sorted(os.listdir(PHOTOS_DIR)) if os.path.isdir(PHOTOS_DIR) else []
        for name in names:
            p = os.path.join(PHOTOS_DIR, name)
            if (os.path.isfile(p) and not name.startswith(".")
                    and os.path.splitext(name)[1].lower() in IMG_EXT):
                imgs.append((p, False))
        return imgs
    for a in args:
        if os.path.isdir(a):
            for name in sorted(os.listdir(a)):
                p = os.path.join(a, name)
                if os.path.isfile(p) and os.path.splitext(name)[1].lower() in IMG_EXT:
                    imgs.append((p, True))
        elif os.path.isfile(a) and os.path.splitext(a)[1].lower() in IMG_EXT:
            imgs.append((a, True))
        else:
            print(f"  skip (not an image or folder): {a}")
    return imgs


def main(argv):
    os.makedirs(CONTENT_DIR, exist_ok=True)
    referenced = referenced_basenames()
    imported   = load_log(LEDGER)
    used_slugs = existing_slugs()

    created, located, unlocated, newly = [], [], [], []

    for src, external in gather_images(argv):
        base = os.path.basename(src)
        if base in referenced:
            continue                       # already a pin
        if base in imported:
            continue                       # imported before; do not resurrect a deleted pin

        dest = os.path.join(PHOTOS_DIR, base)
        if external:
            os.makedirs(PHOTOS_DIR, exist_ok=True)
            if os.path.exists(dest):
                print(f"  skip (a photo named {base} already exists): {src}")
                continue
            shutil.copy2(src, dest)

        slug = slugify(os.path.splitext(base)[0])
        s, i = slug, 2
        while s in used_slugs:
            s, i = f"{slug}-{i}", i + 1
        used_slugs.add(s)

        with open(os.path.join(CONTENT_DIR, s + ".md"), "w", encoding="utf-8") as fh:
            fh.write(f'---\nimage: "/photos/{base}"\ncaption: ""\nsources: []\n---\n')

        created.append(base)
        newly.append(base)
        (located if read_exif(dest).get("lat") is not None else unlocated).append(base)
        print(f"  + content/photos/{s}.md  ({base})")

    # Remember what we imported, so a later-deleted pin is never re-created.
    if newly:
        need_header = not os.path.exists(LEDGER) or os.path.getsize(LEDGER) == 0
        with open(LEDGER, "a", encoding="utf-8") as fh:
            if need_header:
                fh.write("# Images already imported as map pins. Do not edit by hand; this\n"
                         "# keeps a deleted pin from reappearing the next time you import.\n")
            for b in newly:
                fh.write(b + "\n")

    print()
    if not created:
        print("No new photographs to import. Everything in photos/ is already a pin, "
              "or was imported before.")
        return
    print(f"Imported {len(created)} photograph(s) as map pins.")
    if located:
        print(f"  {len(located)} located from GPS and will appear on the map.")
    if unlocated:
        print(f"  {len(unlocated)} have no GPS location; add one in the editor or they "
              f"stay off the map:")
        for b in unlocated:
            print(f"    - {b}")
    print("\nNext: write each caption in the editor. On your computer, run "
          "scripts/build_content.py to preview, then commit and push.")


if __name__ == "__main__":
    main(sys.argv[1:])
