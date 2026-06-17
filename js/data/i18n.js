/* ============================================================================
   i18n.js — interface dictionary  (the second language only)
   ----------------------------------------------------------------------------
   The DEFAULT language comes straight from the live DOM, so you never translate
   it here. This dictionary supplies the SECOND language (set CONFIG.languages.second
   in js/config.js, e.g. { code:"es", rtl:false, label:"Español" }). For each key
   below, add a field named with that language code:

       "nav.search": { en: "Search", es: "Buscar" }

   The `en` values are only a reference for translators — the runtime ignores
   them. Any key without a second-language field falls back to the on-screen
   default. HTML elements opt in with data-i18n / data-i18n-html /
   data-i18n-placeholder / data-i18n-aria-label / data-i18n-title.

   The single Spanish ("es") example below shows the pattern; the rest are
   English-only stubs for a fluent translator to complete. See CONTENT-GUIDE.md.
   ============================================================================ */
var siteI18N = {

  /* Header */
  "head.sub":        { en: "A documentary map", es: "Un mapa documental" },

  /* Navigation / top bar */
  "nav.layers":      { en: "Layers" },
  "nav.search":      { en: "Search", es: "Buscar" },
  "nav.wander":      { en: "Wander" },
  "nav.gallery":     { en: "Gallery" },
  "nav.timeline":    { en: "Timeline" },
  "nav.stats":       { en: "Statistics" },
  "nav.sources":     { en: "Sources" },
  "nav.compare":     { en: "Compare" },
  "nav.map":         { en: "Map" },

  /* Accessibility panel */
  "a11y.title":      { en: "Accessibility" },
  "a11y.textsize":   { en: "Text size" },
  "a11y.hc":         { en: "High contrast" },
  "a11y.rm":         { en: "Reduce motion" },
  "a11y.hint":       { en: "Settings are saved and persist across pages." },

  /* Search panel */
  "search.placeholder": { en: "Search captions and narratives…" },
  "search.status":      { en: "Type to search across the photos and their narratives." },

  /* Compare bar */
  "cmp.label":       { en: "Compare" },
  "cmp.exit":        { en: "Exit" },
  "cmp.hint":        { en: "drag the handle &nbsp;&middot;&nbsp; pan/zoom shared" },

  /* Layers panel */
  "lp.title":        { en: "Map Layers" },
  "lp.photos":       { en: "Photo markers" },
  "lp.landmarks":    { en: "Landmarks" },
  "lp.sightlines":   { en: "Sightlines (all photos)" },
  "lp.area1":        { en: "Area 1" },
  "lp.area2":        { en: "Area 2" },
  "lp.area3":        { en: "Area 3" },
  "lp.area4":        { en: "Area 4" },
  "lp.places":       { en: "Places" },
  "lp.line":         { en: "Line overlay" },
  "lp.voices":       { en: "Voices" },
  "lp.historical":   { en: "Historical photographs" },
  "lp.trail":        { en: "Walking trail" },
  "lp.pace":         { en: "Walking pace" },

  /* Panels */
  "tl.title":        { en: "Timeline" },
  "tl.foot":         { en: "Each entry is sourced; superscripts link to the reference." },
  "st.title":        { en: "In numbers" },
  "st.foot":         { en: "Figures are sourced; superscripts link to the reference." },
  "src.title":       { en: "Sources" },
  "src.foot":        { en: "Every figure, date, and quotation is tied to one of these sources." },

  /* Photo drawer */
  "drawer.prev":     { en: "← Prev" },
  "drawer.next":     { en: "Next →" },
  "status.count":    { en: "photographs &nbsp;&middot;&nbsp; About &#9432;" },
  "cite.title":      { en: "Cite this photograph" },

  /* Intro splash */
  "intro.title":     { en: "MIRL Map", es: "Mapa MIRL" },
  "intro.subtitle":  { en: "A documentary photo-map" },
  "intro.p1":        { en: "EDIT ME — introduce your project here." },
  "intro.tip":       { en: "Click any photograph on the map for its caption and narrative." },
  "intro.enter":     { en: "Enter the map →" },
  "intro.essay":     { en: "View as photo essay" },
  "intro.credit":    { en: "EDIT ME — your credit line." },

  /* Gallery page */
  "g.sub":           { en: "Photographs" },
  "g.intro.h2":      { en: "MIRL Map" },
  "g.intro.p":       { en: "EDIT ME — a short introduction to the essay." },
  "g.sources":       { en: "Sources" },
  "g.onmap":         { en: "on the map ↗" }
};
