/* ============================================================================
   mirl-map · SITE CONFIGURATION
   ----------------------------------------------------------------------------
   This is the ONE file you edit to make this map your own. Everything else is
   the reusable engine. Change the values below, drop your photos in photos/
   (and run the scripts in scripts/), fill in js/data/*.js, and you have your
   own documentary photo-map. No build step: just edit and reload.

   This file is loaded FIRST, before anything else, so every other script can
   read `CONFIG`. Keep it valid JavaScript (watch the commas and quotes).

   Look for "EDIT ME" markers for the things most projects change.
   ============================================================================ */

const CONFIG = {

  /* ── Identity ──────────────────────────────────────────────────────────
     Names, author, and the public URL. The visible title bar, the browser
     tab title, and the citation/KML exports all read from here. */
  site: {
    title:     "The Managed Edge",                         // EDIT ME — shown in the header and tab
    subtitle:  "A walk where UC Santa Barbara meets the Pacific",          // EDIT ME — small line under the title
    titleAlt:  "",                                 // optional second-script title (e.g. Arabic); "" hides it

    storagePrefix: "mirlmap",                       // localStorage key prefix (a11y + language). Keep it short and unique.

    // Credit + citation identity
    author:          "Jeff O'Brien",                // EDIT ME — photographer / author, natural order
    authorLastFirst: "O'Brien, Jeff",               // "Last, First" for MLA/Chicago
    authorAPA:       "O'Brien, J.",                 // "Last, F." for APA
    org:             "Material / Image Research Lab (MIRL), UC Santa Barbara",
    rights:          "All rights reserved.",        // shown in the footer/credit line

    // Public address of the deployed site. Used by permalinks in citations and
    // the KML export so shared links keep working. Set this before you deploy.
    baseUrl:  "https://YOUR-USER.github.io/mirl-map/",   // EDIT ME (trailing slash)

    // Social-preview + SEO. NOTE: these also live as <meta> tags in index.html
    // and gallery.html, which is what social/link crawlers actually read — edit
    // them there too when you change a project.
    ogImage:      "photos/web/sample-1.jpeg",       // EDIT ME — 1200x630-ish hero image
    description:  "A documentary photo-map: geolocated photographs paired with per-photo narratives.",
    keywords:     "documentary, photo map, MIRL, archive, fieldwork"
  },

  /* ── Map ───────────────────────────────────────────────────────────────
     Where the map opens. center is [latitude, longitude] in decimal degrees;
     get one by right-clicking a spot in Google Maps. The default below is
     UC Santa Barbara (MIRL's home). */
  map: {
    center:      [34.4114, -119.8434],   // EDIT ME — [lat, lon] (centroid of the sample photos)
    zoom:        14,                       // EDIT ME — 1 (world) .. 19 (street)
    defaultBase: "satellite",              // id of the baseLayers entry shown first
    minZoom:     3
  },

  /* Locator inset (the little map in the bottom-left that shows where you are
     in the wider region). Set enabled:false to remove it. */
  miniMap: { enabled: true, width: 160, height: 120, zoomOffset: -5 },

  /* ── Base layers ───────────────────────────────────────────────────────
     The map-style buttons. Any XYZ raster tile URL works. The safe, no-key,
     terms-clean defaults are OpenStreetMap (streets) + Esri World Imagery
     (satellite) + Esri World Topo. Add/remove entries freely; `defaultBase`
     above must match one `id`.

     Fields: id (unique), label (button text), url, attribution (required —
     credit the source), maxZoom. Optional: subdomains:["a","b","c"] when the
     url has {s}; langVariants for localized tiles (see the commented example). */
  baseLayers: [
    {
      id: "osm", label: "Map",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      subdomains: ["a", "b", "c"],
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      maxZoom: 19
    },
    {
      id: "satellite", label: "Satellite",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
      maxZoom: 19
    },
    {
      id: "topo", label: "Topo",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Map &copy; Esri, HERE, Garmin, FAO, NOAA, USGS",
      maxZoom: 19
    }

    /* Localized-tile example (one button, tiles swap with the language toggle):
    ,{
      id: "road", label: "Road",
      langVariants: {
        en: "https://example.com/tiles/en/{z}/{x}/{y}.png",
        ar: "https://example.com/tiles/ar/{z}/{x}/{y}.png"
      },
      attribution: "&copy; Your provider", maxZoom: 20
    }
    */
  ],

  /* ── Historical / overlay layers (optional) ────────────────────────────
     Georeferenced historical map tiles or image overlays that sit on top of
     the base layer, each with its own button and (if features.compare is on)
     a slot in the side-by-side compare control. Empty by default.

     The Lifta project used the public-domain Palestine Open Maps layers, kept
     here as a worked example. Uncomment + adapt, then set features.compare:true. */
  historicalLayers: [
    /*
    {
      id: "mandate", label: "1942 Survey",
      url: "https://palopenmaps.org/tiles/pal20k-1940s/{z}/{x}/{y}.jpg",
      attribution: 'Survey of Palestine 1942-48 &middot; <a href="https://palopenmaps.org/" target="_blank" rel="noopener">Palestine Open Maps</a> &middot; public domain',
      maxNativeZoom: 16, maxZoom: 21, minZoom: 10,
      bounds: [[31.2173, 34.1367], [33.2944, 35.7471]]
    },
    {
      id: "aerial", label: "1944 Aerial",
      url: "https://cdn.jsdelivr.net/gh/bothness/pom-tiles@2d154a81/aerial1940s/{z}/{x}/{y}.png",
      attribution: 'Royal Air Force, 1944 &middot; <a href="https://palopenmaps.org/" target="_blank" rel="noopener">Palestine Open Maps</a>',
      maxNativeZoom: 16, maxZoom: 21, minZoom: 10
    }
    */
  ],

  /* ── Languages ─────────────────────────────────────────────────────────
     The interface ships bilingual-capable. `second:null` means English only:
     the language toggle disappears and RTL never engages. To add a second
     language, set `second` and fill the `ar`/second-language strings in
     js/data/i18n.js (and, for right-to-left scripts, set rtl:true). */
  languages: {
    default:      "en",
    defaultLabel: "English",
    second:       null
    // second: { code: "ar", rtl: true, label: "العربية" }   // example (rtl:true for right-to-left scripts)
  },

  /* ── Features ──────────────────────────────────────────────────────────
     Turn modules on/off. A false flag hides that button/panel/layer-row and
     skips its build, so an empty or absent data file is never an error.
     Turn one on, add its data in js/data/, and it appears. */
  features: {
    // On by default (content-light, universally useful)
    sources:          true,    // citation tokens [ABC] + the Sources colophon (js/data/sources.js)
    sightlines:       true,    // camera view-cones from photo bearing+fov
    search:           true,    // full-text search across captions + narratives
    kmlExport:        true,    // "Download .kml" for Google Earth
    miniMap:          true,    // the locator inset (also see miniMap.enabled)
    gallery:          true,    // the photo-essay page (gallery.html)
    wander:           true,    // "Wander" — jump to a random photo
    intro:            true,    // the opening intro/about splash
    lightbox:         true,    // full-size photo overlay

    // Off by default (domain-specific; add data, then flip on)
    landmarks:        false,   // named points of interest (js/data/landmarks.js)
    timeline:         false,   // js/data/timeline.js
    statistics:       false,   // js/data/stats.js
    testimonies:      false,   // first-person voice pins (js/data/testimonies.js)
    historicalPhotos: false,   // before/after archival pins (js/data/matson.js)
    compare:          false,   // side-by-side layer compare (needs historicalLayers)
    walkingTrail:     false,   // animate the photographer's path (needs taken_at on photos)
    polygons:         false,   // area overlays (js/data/geodata.js)
    regionalPlaces:   false,   // nearby places layer (js/data/places.js)
    greenLine:        false    // a polyline overlay (js/data/greenline.js)
  },

  /* ── Image folders ─────────────────────────────────────────────────────
     The three tiers make-thumbs.py generates. Keep the trailing slashes. */
  images: { full: "photos/", web: "photos/web/", thumb: "photos/thumb/" },

  /* ── Citation export ───────────────────────────────────────────────────
     Powers the "Cite this photograph" modal. placeLabel is appended to each
     citation (e.g. "Lifta, Palestine"); leave "" to omit. */
  citation: {
    project:      "MIRL Map",          // EDIT ME — title of the project as cited
    projectPlain: "MIRL Map",          // plain-text variant (no diacritics/scripts)
    placeLabel:   "",                  // e.g. "Santa Barbara, California"; "" = omit
    bibtexPrefix: "mirlmap"            // BibTeX key prefix, e.g. mirlmap_sample_01
  },

  /* ── KML / Google Earth export ─────────────────────────────────────────── */
  kml: {
    filename:    "mirl-map.kml",
    docName:     "MIRL Map — photographs",
    attribution: "Photographs and data assembled with mirl-map. Map sources cited per layer."
  }
};

/* Expose on window for the inline pre-paint scripts in <head>. */
if (typeof window !== "undefined") window.CONFIG = CONFIG;
