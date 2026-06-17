/* ============================================================================
   geodata.js — area polygon overlays  (CONFIG.features.polygons)
   ----------------------------------------------------------------------------
   Four generic area slots, one const each, wired to the four rows in the Layers
   panel and to colours in js/map.js. Each is a closed ring of [lat, lon] pairs.
   Empty by default. Rename / repurpose / drop as needed (if you change the
   number of slots, update js/map.js and the Layers-panel rows in index.html).
   See CONTENT-GUIDE.md.
   ============================================================================ */
const vBound = [];   // Area 1  (e.g. an outer boundary)
const vResid = [];   // Area 2
const vOlive = [];   // Area 3
const vTerr  = [];   // Area 4
