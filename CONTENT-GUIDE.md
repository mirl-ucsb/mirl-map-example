# Filling in your map: a friendly guide

This guide explains everything that goes into a MIRL Map: your photographs, their
captions, the stories you tell about them, your sources, and the optional extras.
It is written for people who are not programmers.

There are two ways to add content, and this guide works for both:

- **The web editor** (the gentle way). You log in to your map's editor page, fill
  in a simple form for each photograph, and click Publish. If you use the editor,
  read the parts below about *what* goes into each field, and feel free to skip
  the file details near the end.
- **Editing the files directly.** If you would rather work in plain text, the
  last section, "If you prefer to edit the files," shows you exactly how.

Either way, your changes appear on the live map within about a minute. And a
gentle reminder throughout: take your time, save often, and know that you can
always change anything later. There is no wrong move you cannot undo.

---

## The heart of it: photographs, captions, and stories

**Photographs.** Each photo becomes a marker on the map. The lovely part is that
most cameras and phones save the exact location inside the photo, so MIRL Map can
usually place it for you, with no coordinates to look up. If a photo has no saved
location (some phones remove it when you share a picture), you can simply type in
the latitude and longitude yourself.

The map also notices, when the photo recorded them, which way the camera was
facing and the moment it was taken, and uses them for two small touches: a faint
cone showing where the lens pointed, and an optional animation that retraces your
steps in the order you took the pictures.

**Captions.** A caption is the short line shown under the photograph, a sentence
or two. Think of it as the label beside a picture in an exhibition: what are we
looking at, and where?

**Narratives.** A narrative is the longer writing for a photograph, as short or
as long as you like, and entirely optional. This is where the real storytelling
happens: the history of the place, what changed, who lived there, what a small
detail means. A photograph with no narrative simply shows its caption.

A few tips for writing:

- You can make words **bold** or *italic*.
- Leave a blank line between paragraphs.
- Write in whatever voice suits your project. There is no house style to follow.

---

## Crediting your sources

If your work draws on books, archives, interviews, or websites, MIRL Map makes
crediting them tidy and automatic.

You keep a short list of your sources, and you give each one a little code of your
choosing, two to eight capital letters, for example `HARBOR` for a particular
local history. Then, anywhere in your writing, you mention that code in square
brackets:

> The pier was rebuilt after the storm of 1925. [HARBOR]

On the map, that becomes a small footnote-style link, and a neat list of sources
appears under the narrative. You can even cite a page: `[HARBOR p.27]`.

As a bonus, every photograph comes with a ready-made citation of its own, in
Chicago, MLA, APA, and BibTeX styles, that a visitor can copy with one click.

A good habit, especially for scholarly and heritage work: support each factual
claim with a source, and never invent a quotation. MIRL Map does not force this
on you, but it is a sound default.

---

## Optional extras

A new map is just your photographs and your words. When you are ready for more,
these can be switched on (a colleague can flip them on in the settings file, or
see the file section below):

- **Timeline.** A dated chronology of your subject, with sources.
- **In numbers.** A small panel of figures, such as population, dates, or
  measurements, each one sourced.
- **Voices.** First-person testimony or oral history, pinned to the places it
  speaks about. Please quote someone only when you have a real, citable source;
  otherwise, paraphrase in your own words.
- **Historical photographs.** Old photos placed on the map, each with a button to
  show the nearest present-day photograph beside it: a then-and-now.
- **Historical maps.** An old map laid over today's, with a slider to compare the
  two side by side.
- **Areas and routes.** Outlines of a boundary, a zone, or a path, drawn on the
  map.

Search, the photo-essay view, and a downloadable Google Earth file come included
as well. You never have to use any of these. They wait until you want them.

---

## Telling your story in another language

MIRL Map can run in two languages, with visitors choosing between them, and it
handles right-to-left scripts such as Arabic. Switching this on takes a couple of
small steps (translating the on-screen labels, and providing translated
narratives), described in the file section below. The language switch appears on
its own once a second language is set.

---

## If you prefer to edit the files

You do not need this section if you use the web editor. But everything in a MIRL
Map is plain text, and some people simply like to work that way. Here is how.

**One golden rule:** these files use a few quotation marks, colons, and commas to
stay organized. When you copy an example, keep that punctuation exactly as you
see it, and you will be fine.

### Your map's settings: `js/config.js`

This single file holds your map's title, where it opens, and which extras are on.
Open it and change the lines marked `EDIT ME`:

- the **title** shown at the top,
- the **center**, the latitude and longitude the map opens on (right-click a spot
  in Google Maps to copy its coordinates),
- the **zoom**, where 1 shows the whole world and around 16 shows a few streets,
- the **features**, each a simple `true` (on) or `false` (off).

### Each photograph

When the web editor is set up, every photograph is a small file in
`content/photos/`, for example `content/photos/old-pier.md`. It looks like this:

```
---
image: /photos/old-pier.jpg
caption: The old pier at low tide.
lat: 34.4100
lon: -119.8500
---
The longer narrative goes here, in plain writing.
You can cite a source like this. [HARBOR]
```

Leave `lat` and `lon` out and they are filled in from the photo automatically.
After you add or change one of these files, the map rebuilds itself and your
change appears on the live site within a minute. The file `js/data/photos.js` is
created for you from these, so there is no need to touch it by hand.

(If a map has not turned on the web editor, the photographs live directly in
`js/data/photos.js` instead, as one list you edit. The idea is the same.)

### Your sources: `js/data/sources.js`

A short list pairing each code with its full reference:

```
const srcLib = {
  "HARBOR": { "label": "A. Author, A Local History (Publisher, 1990)", "url": "https://..." }
};
```

Leave the `url` empty (`""`) for a source with no web link, such as a printed
book.

### A narrative in its own file

If you are not using the per-photograph files above, a narrative can live in a
file named after its photograph: a photo called `old-pier.jpg` gets a file
`narratives/old-pier.md`. Plain writing, a blank line between paragraphs,
`**bold**` and `*italic*`, and `[CODE]` citations just as above.

### The optional extras

Each extra has its own small file in `js/data/`, and every one contains an
example inside, shown as a comment, that you copy and fill in: `timeline.js`,
`stats.js`, `testimonies.js` (voices), `matson.js` (historical photographs),
`geodata.js` (areas), `greenline.js` (routes), and `landmarks.js` (named points).
Add your entries, set that feature to `true` in the settings file, and reload.

### A second language

In the settings file, set your second language (its code, its name, and whether
it reads right to left). Then add the translated wording in `js/data/i18n.js`, and
put any translated narratives in the `narratives/ar/` folder. Anything you have
not translated gently falls back to your main language.

---

## If you get stuck

The MIRL team is glad to help. And remember: you can change anything later, so
nothing here is a one-way door.
