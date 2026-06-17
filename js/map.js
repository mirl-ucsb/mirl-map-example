/* ── Intro screen dismissal ───────────────────────────── */
function dismissIntro(){
  var el=document.getElementById('intro-screen');
  if(!el) return;
  el.classList.add('is-leaving');
  setTimeout(function(){ el.classList.add('is-gone'); if(typeof map!=='undefined') map.invalidateSize(); }, 380);
}
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape') return;
  var intro=document.getElementById('intro-screen');
  if(intro && !intro.classList.contains('is-gone') && !intro.classList.contains('is-leaving')){
    dismissIntro();
  }
});

const SC = {extant:'#4CAF50',ruins:'#FF9800',destroyed:'#F44336',occupied:'#2196F3'};
const SL = {extant:'Still standing',ruins:'Ruins',destroyed:'Destroyed',occupied:'Occupied by others'};

const map = L.map('map',{zoomControl:true, minZoom:(CONFIG.map.minZoom||0)}).setView(CONFIG.map.center, CONFIG.map.zoom);

/* \u2500\u2500 Base + historical tile layers, built from CONFIG \u2500\u2500\u2500\u2500\u2500
   Each CONFIG.baseLayers / CONFIG.historicalLayers entry becomes one or more
   L.tileLayer instances in `tileLayers`, keyed by id (or id-<code> when the
   entry carries langVariants). curLang selects the active variant. */
var curLang = (typeof siteLang !== 'undefined' ? siteLang : ((CONFIG.languages && CONFIG.languages.default) || 'en'));
var tileLayers = {};
var _baseIds = [];          // base-layer ids, in CONFIG order (buttons + compare)
var _histIds = [];          // historical-layer ids
var noLangLayers = {};      // ids with no language variant

function _mkTile(spec, url){
  var opts = { attribution: spec.attribution || '', maxZoom: spec.maxZoom || 21 };
  if (spec.subdomains)    opts.subdomains    = spec.subdomains;
  if (spec.maxNativeZoom) opts.maxNativeZoom = spec.maxNativeZoom;
  if (spec.minZoom)       opts.minZoom       = spec.minZoom;
  if (spec.bounds)        opts.bounds        = spec.bounds;
  return L.tileLayer(url, opts);
}
function _registerLayers(list, idSink){
  (list || []).forEach(function(spec){
    idSink.push(spec.id);
    if (spec.langVariants){
      Object.keys(spec.langVariants).forEach(function(code){
        tileLayers[spec.id + '-' + code] = _mkTile(spec, spec.langVariants[code]);
      });
    } else {
      tileLayers[spec.id] = _mkTile(spec, spec.url);
      noLangLayers[spec.id] = 1;
    }
  });
}
_registerLayers(CONFIG.baseLayers, _baseIds);
_registerLayers(CONFIG.historicalLayers, _histIds);

var curBase = CONFIG.map.defaultBase || _baseIds[0];
applyLayer();   // add the default base layer (applyLayer is hoisted below)

/* Low-density base layer for the locator inset: prefer topo/osm, else default. */
function _pickMiniSpec(){
  var byId = {}; (CONFIG.baseLayers||[]).forEach(function(s){ byId[s.id]=s; });
  var pref = byId['topo'] || byId['osm'] || byId[CONFIG.map.defaultBase] || CONFIG.baseLayers[0];
  if (pref && pref.langVariants){
    pref = (CONFIG.baseLayers||[]).filter(function(s){ return !s.langVariants; })[0] || pref;
  }
  return pref;
}

/* ── Mini-map / locator inset ────────────────────────────
   Bottom-left corner shows the current viewport's position
   in a wider regional context (Jerusalem corridor, the West
   Bank, surrounding areas). Helps non-locals orient — Lifta
   sits at the western edge of West Jerusalem, which isn't
   obvious from a tightly-zoomed satellite view alone.

   Uses Esri's World Topo Map as the inset's base layer
   (lower visual density than satellite imagery — easier to
   read at small size). Toggle button collapses it; the
   plugin handles synchronization with the main map.
   ──────────────────────────────────────────────────────── */
if (CONFIG.miniMap && CONFIG.miniMap.enabled && typeof L.Control.MiniMap === 'function') {
  // A separate tile-layer instance is required — Leaflet won't share a layer
  // between two map instances. Use a low-density base from CONFIG.
  var _miniSpec = _pickMiniSpec();
  var miniMapTiles = _mkTile(_miniSpec, _miniSpec.url);
  L.control.minimap(miniMapTiles, {
    position: 'bottomleft',
    width:  CONFIG.miniMap.width  || 160,
    height: CONFIG.miniMap.height || 120,
    zoomLevelOffset: (typeof CONFIG.miniMap.zoomOffset === 'number' ? CONFIG.miniMap.zoomOffset : -5),
    toggleDisplay: true,
    minimized: false,
    aimingRectOptions:    { color: '#0f766e', weight: 2, opacity: 0.85 },
    shadowRectOptions:    { color: '#0f766e', weight: 1, opacity: 0.4, fillOpacity: 0.15 }
  }).addTo(map);
}

function getKey(){ return noLangLayers[curBase] ? curBase : curBase+'-'+curLang; }
function applyLayer(){
  Object.values(tileLayers).forEach(function(l){ if(map.hasLayer(l)) map.removeLayer(l); });
  var key = getKey();
  if (tileLayers[key]) tileLayers[key].addTo(map);
}
function _allLayerIds(){ return _baseIds.concat(_histIds); }
function setLayer(b){
  curBase=b; applyLayer();
  _allLayerIds().forEach(function(id){
    var el=document.getElementById('btn-'+id); if(el) el.classList.remove('active');
  });
  var act=document.getElementById('btn-'+b); if(act) act.classList.add('active');
}
/* The language toggle switches the whole interface language (see js/i18n.js)
   and, on base layers that carry langVariants, the basemap labels too. */
function setLang(l){
  curLang=l; applyLayer();
  if (typeof applyLang === 'function') applyLang(l);   // UI text, direction, persistence
}

/* Compare state (used by the compare functions further down). Declared here so
   the dropdowns built below can read the initial keys. */
var compareMode = false, sideBySideCtrl = null, preCompareBase = null;
var compareLeftKey  = (_histIds[0] || _baseIds[1] || _baseIds[0]);
var compareRightKey = (CONFIG.map.defaultBase || _baseIds[0]);

/* Build the base- and historical-layer buttons (and the compare dropdowns)
   from CONFIG into the header containers in index.html. */
function buildLayerControls(){
  var baseWrap = document.getElementById('base-layer-btns');
  if (baseWrap){
    baseWrap.innerHTML = (CONFIG.baseLayers||[]).map(function(s){
      return '<button class="layer-btn'+(s.id===curBase?' active':'')+'" id="btn-'+s.id+'" onclick="setLayer(\''+s.id+'\')">'+s.label+'</button>';
    }).join('');
  }
  var histWrap = document.getElementById('hist-layer-btns');
  if (histWrap){
    var html = (CONFIG.historicalLayers||[]).map(function(s){
      return '<button class="layer-btn" id="btn-'+s.id+'" onclick="setLayer(\''+s.id+'\')">'+s.label+'</button>';
    }).join('');
    if (CONFIG.features.compare){
      html += '<button class="layer-btn" id="btn-compare" onclick="toggleCompare()" aria-pressed="false" aria-label="Toggle side-by-side comparison" title="Side-by-side comparison: drag the handle to compare two map layers">⇆ <span data-i18n="nav.compare">Compare</span></button>';
    }
    histWrap.innerHTML = html;
  }
  // Hide the whole historical group (and its divider) when there is nothing in it.
  var histGroup = document.getElementById('hist-layer-group');
  if (histGroup && !(CONFIG.historicalLayers||[]).length && !CONFIG.features.compare){
    histGroup.style.display = 'none';
    var d = histGroup.previousElementSibling;
    if (d && d.classList && d.classList.contains('h-div')) d.style.display = 'none';
  }
  // Compare dropdown options (only when compare is enabled)
  if (CONFIG.features.compare){
    var all  = (CONFIG.baseLayers||[]).concat(CONFIG.historicalLayers||[]);
    var opts = all.map(function(s){ return '<option value="'+s.id+'">'+s.label+'</option>'; }).join('');
    var cl=document.getElementById('cmp-left'), cr=document.getElementById('cmp-right');
    if(cl){ cl.innerHTML=opts; cl.value=compareLeftKey; }
    if(cr){ cr.innerHTML=opts; cr.value=compareRightKey; }
  }
}
buildLayerControls();
/* When the language changes, re-render an open photo so its narrative
   reloads in the new language (Arabic file if present, else English). */
window.onLangChange = function(){
  if (typeof drawerIdx !== 'undefined' && drawerIdx >= 0) openPhotoDrawer(drawerIdx);
};

/* ── Side-by-side compare mode ───────────────────────────
   The leaflet-side-by-side plugin renders two tile layers
   simultaneously with a draggable vertical handle, masking
   each to one side of the map. Both panes share pan/zoom,
   so dragging the handle directly compares the same view
   under different sources (e.g. RAF 1944 ↔ modern satellite).

   While compare mode is active the regular base-layer
   buttons are disabled — single-layer browsing returns when
   the user exits compare mode.

   The default comparison opens with Aerial 1944 on the left
   and modern satellite on the right: the headline before /
   after of the village's destruction. The two <select>
   dropdowns let the visitor swap either side independently.
   ──────────────────────────────────────────────────────── */
/* compareMode / sideBySideCtrl / compareLeftKey / compareRightKey /
   preCompareBase are declared up in the layer-build section. */
function _setBaseBtnsDisabled(disabled) {
  var ids = _allLayerIds().map(function(id){ return 'btn-' + id; }).concat(['btn-lang-en','btn-lang-ar']);
  ids.forEach(function(id){
    var el = document.getElementById(id); if(!el) return;
    el.disabled = disabled;
    el.style.opacity = disabled ? '0.4' : '';
    el.style.cursor  = disabled ? 'not-allowed' : '';
  });
}

function toggleCompare(){
  if (compareMode) exitCompare();
  else enterCompare();
}

function enterCompare(){
  if (compareMode) return;
  if (typeof L.control.sideBySide !== 'function') {
    console.warn('leaflet-side-by-side plugin not loaded'); return;
  }
  compareMode = true;
  preCompareBase = curBase;
  // Drop the single base layer
  Object.values(tileLayers).forEach(function(l){ if(map.hasLayer(l)) map.removeLayer(l); });
  // Add the two compare panes
  var L1 = tileLayers[compareLeftKey], L2 = tileLayers[compareRightKey];
  L1.addTo(map);
  L2.addTo(map);
  sideBySideCtrl = L.control.sideBySide(L1, L2).addTo(map);
  // UI state
  var panel = document.getElementById('compare-panel');
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  var btn = document.getElementById('btn-compare');
  btn.classList.add('active');
  btn.setAttribute('aria-pressed', 'true');
  _setBaseBtnsDisabled(true);
  // Sync dropdowns to current state
  document.getElementById('cmp-left').value  = compareLeftKey;
  document.getElementById('cmp-right').value = compareRightKey;
}

function exitCompare(){
  if (!compareMode) return;
  compareMode = false;
  if (sideBySideCtrl) {
    sideBySideCtrl.remove();
    sideBySideCtrl = null;
  }
  Object.values(tileLayers).forEach(function(l){ if(map.hasLayer(l)) map.removeLayer(l); });
  // Restore single-layer mode
  curBase = preCompareBase || CONFIG.map.defaultBase || _baseIds[0];
  applyLayer();
  // UI state
  var panel = document.getElementById('compare-panel');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  var btn = document.getElementById('btn-compare');
  btn.classList.remove('active');
  btn.setAttribute('aria-pressed', 'false');
  _setBaseBtnsDisabled(false);
}

function setComparePane(side, key){
  if (!compareMode || !tileLayers[key] || !sideBySideCtrl) return;
  var oldKey  = (side === 'left')  ? compareLeftKey  : compareRightKey;
  var otherKey= (side === 'left')  ? compareRightKey : compareLeftKey;
  // Remove the previous layer for this side, unless it's still in use on the other side
  if (oldKey !== key && oldKey !== otherKey && tileLayers[oldKey] && map.hasLayer(tileLayers[oldKey])) {
    map.removeLayer(tileLayers[oldKey]);
  }
  if (!map.hasLayer(tileLayers[key])) tileLayers[key].addTo(map);
  if (side === 'left')  { compareLeftKey  = key; sideBySideCtrl.setLeftLayers(tileLayers[key]); }
  else                  { compareRightKey = key; sideBySideCtrl.setRightLayers(tileLayers[key]); }
}

/* Polygon overlays (CONFIG.features.polygons), wired to js/data/geodata.js
   (vBound/vResid/vOlive/vTerr) and the four Layers-panel rows. Guarded so a
   missing geodata.js never errors. Repurpose labels/colours for your own zones
   (see CONTENT-GUIDE.md). Defined here but NOT added by default. */
var polyLayers = {};
if (typeof vBound !== 'undefined') polyLayers = {
  boundary:    L.polygon(vBound,  {color:'#c8a050',weight:1.5,dashArray:'7 4',fillColor:'#d4aa60',fillOpacity:.07}).bindTooltip('Area 1',{sticky:true}),
  residential: L.polygon(vResid,  {color:'#a07040',weight:1.5,fillColor:'#c89060',fillOpacity:.22}).bindTooltip('Area 2',{sticky:true}),
  olives:      L.polygon(vOlive,  {color:'#507030',weight:1.5,fillColor:'#6a9040',fillOpacity:.32}).bindTooltip('Area 3',{sticky:true}),
  terraces:    L.polygon(vTerr,   {color:'#907840',weight:1,  fillColor:'#b09858',fillOpacity:.18}).bindTooltip('Area 4',{sticky:true})
};
// Polygon layers (village boundary, residential core, olive groves, agricultural
// terraces) are defined here but NOT added to the map by default — visitors opt
// in via the Layers panel.

/* ── Photo viewshed wedge (active photo only) ──────────────
   A single translucent angular wedge drawn at the location of
   whichever photo is currently shown in the drawer. Oriented
   to that photo's bearing and spread by its actual horizontal
   field of view (computed from EXIF FocalLengthIn35mmFilm,
   adjusted for portrait vs. landscape orientation).

   The wedge length is a fixed 50 m, NOT a measured subject
   distance. EXIF doesn't carry subject distance, so the wedge
   shows direction and angular spread — what the camera saw —
   but not how far it saw.

   Visibility is gated by both the "Photo viewshed" toggle in
   the Layers panel AND the drawer being open on a photo:

       toggle off                     →  never shown
       toggle on,  drawer closed      →  not yet shown
       toggle on,  drawer open        →  shown for that photo only
   ──────────────────────────────────────────────────────── */
function _offsetLatLon(lat, lon, bearingDeg, distMeters) {
  // Bearing is measured clockwise from north (matches GPSImgDirection).
  // For small distances (< 1 km) on a near-spherical Earth, the simple
  // flat-Earth approximation is accurate to ~0.1 m at this latitude.
  var rad = bearingDeg * Math.PI / 180;
  var dN  = distMeters * Math.cos(rad);   // metres north
  var dE  = distMeters * Math.sin(rad);   // metres east
  var dLat = dN / 111194;
  var dLon = dE / (111194 * Math.cos(lat * Math.PI / 180));
  return [lat + dLat, lon + dLon];
}

function _wedgeCoordsFor(p) {
  if (typeof p.bearing !== 'number' || typeof p.fov !== 'number') return null;
  var halfFov = p.fov / 2;
  var lenM    = 50;
  var arc = [];
  for (var i = 0; i <= 5; i++) {
    var t = i / 5;
    var b = p.bearing - halfFov + t * p.fov;
    arc.push(_offsetLatLon(p.lat, p.lon, b, lenM));
  }
  return [[p.lat, p.lon]].concat(arc);
}

// Single reusable polygon — repositioned as the active photo changes.
var activeViewshed = L.polygon([], {
  color:       '#d97706',
  weight:      1.1,
  opacity:     0.75,
  fillColor:   '#f59e0b',
  fillOpacity: 0.22,
  interactive: false,
  pane:        'overlayPane'
});

function showActiveViewshed(p) {
  if (!p) return;
  var coords = _wedgeCoordsFor(p);
  if (!coords) return;
  activeViewshed.setLatLngs(coords);
  if (!map.hasLayer(activeViewshed)) activeViewshed.addTo(map);
}

function hideActiveViewshed() {
  if (map.hasLayer(activeViewshed)) map.removeLayer(activeViewshed);
}

/* ── Hover wedge ───────────────────────────────────────────
   A second reusable wedge, shown while the pointer is over a
   photo marker (or it is keyboard-focused), so a visitor can
   sweep the hillside and read what each standpoint was aimed
   at without opening anything. Brighter than the all-at-once
   overview, lighter than the active (open-photo) wedge. */
var hoverViewshed = L.polygon([], {
  color:       '#d97706',
  weight:      1.0,
  opacity:     0.7,
  fillColor:   '#f59e0b',
  fillOpacity: 0.26,
  interactive: false,
  pane:        'overlayPane'
});
function showHoverViewshed(p) {
  var coords = _wedgeCoordsFor(p);
  if (!coords) return;
  hoverViewshed.setLatLngs(coords);
  if (!map.hasLayer(hoverViewshed)) hoverViewshed.addTo(map);
}
function hideHoverViewshed() {
  if (map.hasLayer(hoverViewshed)) map.removeLayer(hoverViewshed);
}

/* ── All sightlines (overview) ─────────────────────────────
   Every photo's wedge drawn at once, fill only and very faint,
   so where many photographs converge on the same ruin the
   overlapping wedges build into a warm glow. This is the
   landscape read as a single field of attention: dozens of
   standpoints, the same walls seen from several angles.
   Toggled from the Layers panel ("Sightlines"). */
var allViewsheds = L.layerGroup(
  photoInfo.map(function (p) {
    var coords = _wedgeCoordsFor(p);
    if (!coords) return null;
    return L.polygon(coords, {
      stroke:      true,
      color:       '#d97706',
      weight:      0.4,
      opacity:     0.3,
      fillColor:   '#f59e0b',
      fillOpacity: 0.10,
      interactive: false,
      pane:        'overlayPane'
    });
  }).filter(Boolean)
);

// 1949 Armistice ("Green") Line — the boundary that ran east of Lifta from
// 1949 until the 1967 war put the West Bank under Israeli occupation.
// Source: OpenStreetMap relation 12331025 (boundary=historic).
var greenLineLayer = L.layerGroup(
  (typeof greenLine !== 'undefined' ? greenLine : []).map(function (coords) {
    return L.polyline(coords, {
      color: '#2a8a3a',
      weight: 2.4,
      opacity: 0.9,
      dashArray: '7 4',
      lineCap: 'round',
      lineJoin: 'round',
      interactive: true
    }).bindTooltip('1949 Armistice Line ("Green Line")', { sticky: true });
  })
);

var layerOpen = false;
function toggleLayerPanel(){
  layerOpen = !layerOpen;
  document.getElementById('layer-panel').classList.toggle('open', layerOpen);
  document.getElementById('btn-layers').classList.toggle('active', layerOpen);
}
var layerState = {photos:true,landmarks:true,places:false,trail:false,pace:false,greenline:false,testimonies:false,matson:false,viewsheds:false,boundary:false,residential:false,olives:false,terraces:false};
function togLayer(key){
  layerState[key] = !layerState[key];
  var chk = document.getElementById('ck-'+key);
  if(chk) chk.classList.toggle('on', layerState[key]);
  if(key==='photos'){ layerState.photos ? map.addLayer(mcg) : map.removeLayer(mcg); }
  else if(key==='landmarks'){ lmMarkersArr.forEach(function(m){ layerState.landmarks ? m.addTo(map) : map.removeLayer(m); }); }
  else if(key==='places'){ placesMarkersArr.forEach(function(m){ layerState.places ? m.addTo(map) : map.removeLayer(m); }); }
  else if(key==='trail'){
    if(layerState.trail){ setTrailFull(); trailPolyline.addTo(map); }
    else                { stopTrailAnim(); map.removeLayer(trailPolyline); }
  }
  else if(key==='pace'){ layerState.pace ? paceHeatLayer.addTo(map) : map.removeLayer(paceHeatLayer); }
  else if(key==='greenline'){ layerState.greenline ? greenLineLayer.addTo(map) : map.removeLayer(greenLineLayer); }
  else if(key==='testimonies'){ testimonyMarkersArr.forEach(function(m){ layerState.testimonies ? m.addTo(map) : map.removeLayer(m); }); }
  else if(key==='matson'){ matsonMarkersArr.forEach(function(m){ layerState.matson ? m.addTo(map) : map.removeLayer(m); }); }
  else if(key==='viewsheds'){
    // "Sightlines": draw every photo's wedge at once so overlaps reveal
    // the same ruin seen from several standpoints. (The hover wedge and
    // the open-photo wedge are always-on, independent of this toggle.)
    layerState.viewsheds ? allViewsheds.addTo(map) : map.removeLayer(allViewsheds);
  }
  else if(polyLayers[key]){ layerState[key] ? polyLayers[key].addTo(map) : map.removeLayer(polyLayers[key]); }
}

var aboutOpen = false;
function toggleAbout(){
  aboutOpen = !aboutOpen;
  document.getElementById('about-panel').classList.toggle('open', aboutOpen);
}

/* ── Timeline panel ────────────────────────────────────────
   A documented chronology (js/data/timeline.js). Built once on
   first open. Each entry's [TOKEN] is rendered as a superscript
   source link via renderCitations (js/narratives.js). */
var timelineOpen = false, _timelineBuilt = false;
function buildTimeline(){
  if (_timelineBuilt || typeof siteTimeline === 'undefined') return;
  var html = siteTimeline.map(function(e){
    var t = (typeof renderCitations === 'function') ? renderCitations(e.text) : e.text;
    return '<li class="tl-item"><span class="tl-date">' + e.date + '</span>' +
           '<div class="tl-text">' + t + '</div></li>';
  }).join('');
  document.getElementById('timeline-list').innerHTML = html;
  _timelineBuilt = true;
}
function toggleTimeline(){
  buildTimeline();
  timelineOpen = !timelineOpen;
  if (timelineOpen){ if (statsOpen) toggleStats(); if (sourcesOpen) toggleSources(); }  // they share screen position
  document.getElementById('timeline-panel').classList.toggle('open', timelineOpen);
  var btn = document.getElementById('btn-timeline');
  if (btn){ btn.classList.toggle('active', timelineOpen); btn.setAttribute('aria-expanded', timelineOpen); }
}

/* ── Statistics panel ──────────────────────────────────────
   Village statistics from Palestinian and pre-state sources
   (js/data/stats.js). Built once on first open; each figure's
   [TOKEN] becomes a superscript source link. */
var statsOpen = false, _statsBuilt = false;
function buildStats(){
  if (_statsBuilt || typeof siteStats === 'undefined') return;
  var cite = (typeof renderCitations === 'function') ? renderCitations : function(s){ return s; };
  document.getElementById('stats-list').innerHTML = siteStats.map(function(sec){
    var rows = sec.rows.map(function(r){
      return '<div class="st-row"><span class="st-k">' + r[0] + '</span>' +
             '<span class="st-v">' + r[1] + ' ' + cite('[' + r[2] + ']') + '</span></div>';
    }).join('');
    return '<div class="st-sec"><h4>' + sec.heading + '</h4>' + rows + '</div>';
  }).join('');
  _statsBuilt = true;
}
function toggleStats(){
  buildStats();
  statsOpen = !statsOpen;
  if (statsOpen){ if (timelineOpen) toggleTimeline(); if (sourcesOpen) toggleSources(); }
  document.getElementById('stats-panel').classList.toggle('open', statsOpen);
  var btn = document.getElementById('btn-stats');
  if (btn){ btn.classList.toggle('active', statsOpen); btn.setAttribute('aria-expanded', statsOpen); }
}

/* ── Sources colophon (js/data/sources.js) ─────────────────
   The full citation apparatus: every [TOKEN] used across the
   narratives, timeline, and statistics, with its source and a
   link where one exists. Built once on first open. */
var sourcesOpen = false, _sourcesBuilt = false;
function buildSources(){
  if (_sourcesBuilt || typeof srcLib === 'undefined') return;
  document.getElementById('sources-list').innerHTML = Object.keys(srcLib).map(function(k){
    var s = srcLib[k] || {};
    var lbl = s.label || k;
    var inner = s.url
      ? '<a href="' + s.url + '" target="_blank" rel="noopener">' + lbl + '</a>'
      : '<span>' + lbl + '</span>';
    return '<div class="src-row"><span class="src-tok">' + k + '</span>' +
           '<span class="src-lbl">' + inner + '</span></div>';
  }).join('');
  _sourcesBuilt = true;
}
function toggleSources(){
  buildSources();
  sourcesOpen = !sourcesOpen;
  if (sourcesOpen){ if (timelineOpen) toggleTimeline(); if (statsOpen) toggleStats(); }
  document.getElementById('sources-panel').classList.toggle('open', sourcesOpen);
  var btn = document.getElementById('btn-sources');
  if (btn){ btn.classList.toggle('active', sourcesOpen); btn.setAttribute('aria-expanded', sourcesOpen); }
}

function fmtCoords(lat,lon){ return lat.toFixed(6)+'\u00b0N,\u2009'+lon.toFixed(6)+'\u00b0E'; }

/* ── Citation export ────────────────────────────────────────
   Generates Chicago, MLA, APA, and BibTeX citation strings for
   a given photo and presents them in a modal with copy buttons.
   Sources used for the photo's narrative remain credited
   separately via the [ID] tokens and the source library; this
   is for citing the photograph itself as a documentary artifact.
   ──────────────────────────────────────────────────────── */
var CITE_AUTHOR        = CONFIG.site.author;
var CITE_AUTHOR_LASTF  = CONFIG.site.authorLastFirst;
var CITE_AUTHOR_APA    = CONFIG.site.authorAPA;
var CITE_BIBTEX_AUTHOR = CONFIG.site.author;
var CITE_PROJECT       = CONFIG.citation.project;
var CITE_PROJECT_PLAIN = CONFIG.citation.projectPlain;
var CITE_BASE_URL      = CONFIG.site.baseUrl;
var CITE_PLACE         = CONFIG.citation.placeLabel || "";

function _photoBase(file)   { return file.replace(/\.[^.]+$/, ''); }
function _photoUrl(file)    { return CITE_BASE_URL + '?photo=' + _photoBase(file); }
function _bibtexKey(file)   { return (CONFIG.citation.bibtexPrefix || 'photo') + '_' + _photoBase(file).toLowerCase().replace(/[^a-z0-9]/g, '_'); }
function _todayISO()        { var d = new Date(); return d.toISOString().slice(0,10); }
function _formatTakenDate(taken_at, style) {
  // taken_at: "2017:04:23 12:43:45"
  if (!taken_at) return { full: 'n.d.', short: 'n.d.', chicago: 'n.d.', year: 'n.d.', month: '' };
  var parts = taken_at.split(' ')[0].split(':');
  var y = parts[0], m = parseInt(parts[1], 10), d = parts[2];
  var months_full  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var months_short = ['Jan.','Feb.','Mar.','Apr.','May','June','July','Aug.','Sept.','Oct.','Nov.','Dec.'];
  var months_bib   = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  return {
    full:  parseInt(d,10) + ' ' + months_full[m-1] + ' ' + y,
    short: months_short[m-1] + ' ' + y,
    chicago: months_full[m-1] + ' ' + parseInt(d,10) + ', ' + y,
    year:  y,
    month: months_bib[m-1]
  };
}

function buildCitations(idx) {
  var p = photoInfo[idx];
  var date = _formatTakenDate(p.taken_at);
  var url = _photoUrl(p.file);
  var caption = (p.caption || '').replace(/\s+$/, '');
  var captionShort = caption.length > 90 ? caption.slice(0, 87).replace(/\s+\S*$/, '') + '…' : caption;
  var fileId = _photoBase(p.file);
  var today = _todayISO();

  var _place = CITE_PLACE ? (', ' + CITE_PLACE) : '';

  // Chicago — author-date / notes-bibliography blended for a photograph
  var chicago = CITE_AUTHOR + ', "' + caption + ',” photograph, ' + date.chicago +
                _place + ', in ' + CITE_PROJECT + ', accessed ' + today + ', ' + url + '.';

  // MLA 9th edition
  var mla = CITE_AUTHOR_LASTF + '. "' + caption + '." Photograph, ' + date.full + _place + '. ' +
            CITE_PROJECT + ', ' + url + '. Accessed ' + today + '.';

  // APA 7th
  var apa = CITE_AUTHOR_APA + ' (' + date.year + '). ' + captionShort +
            ' [Photograph]. ' + CITE_PROJECT + '. ' + url;

  // BibTeX
  var bibtex =
    '@misc{' + _bibtexKey(p.file) + ',\n' +
    '  author       = {' + CITE_BIBTEX_AUTHOR + '},\n' +
    '  title        = {' + captionShort.replace(/&/g, '\\&') + '},\n' +
    '  year         = {' + date.year + '},\n' +
    (date.month ? '  month        = ' + date.month + ',\n' : '') +
    '  note         = {Photograph' + _place + '. File ' + fileId + '.},\n' +
    '  howpublished = {\\url{' + url + '}}\n' +
    '}';

  return [
    { name: 'Chicago', text: chicago },
    { name: 'MLA',     text: mla     },
    { name: 'APA',     text: apa     },
    { name: 'BibTeX',  text: bibtex  }
  ];
}

function openCiteModal(idx) {
  var p = photoInfo[idx];
  var citations = buildCitations(idx);
  document.getElementById('cite-subtitle').textContent =
    p.file + '  ·  ' + (p.taken_at ? p.taken_at.split(' ')[0].replace(/:/g, '-') : 'n.d.');
  var listEl = document.getElementById('cite-list');
  listEl.innerHTML = '';
  citations.forEach(function (c) {
    var row = document.createElement('div');
    row.className = 'cite-row';
    row.innerHTML =
      '<div class="cite-row-head">' +
        '<span class="cite-style">' + c.name + '</span>' +
        '<button class="cite-copy" type="button">Copy</button>' +
      '</div>' +
      '<pre class="cite-text"></pre>';
    row.querySelector('.cite-text').textContent = c.text;
    row.querySelector('.cite-copy').addEventListener('click', function () { copyCitation(c.text, this); });
    listEl.appendChild(row);
  });
  document.getElementById('cite-modal').classList.add('open');
}

function closeCiteModal() {
  document.getElementById('cite-modal').classList.remove('open');
  var toast = document.getElementById('cite-toast');
  toast.textContent = ''; toast.classList.remove('show');
}

function copyCitation(text, btn) {
  var done = function () {
    var toast = document.getElementById('cite-toast');
    toast.textContent = 'Copied to clipboard';
    toast.classList.add('show');
    btn.textContent = 'Copied ✓';
    setTimeout(function () { btn.textContent = 'Copy'; }, 1800);
    setTimeout(function () { toast.classList.remove('show'); }, 2200);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(function () {
      _legacyCopy(text); done();
    });
  } else {
    _legacyCopy(text); done();
  }
}

function _legacyCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
}

// Close modal on Escape; close on outside click
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && document.getElementById('cite-modal').classList.contains('open')) {
    closeCiteModal();
  }
});
document.getElementById('cite-modal').addEventListener('click', function (e) {
  if (e.target === this) closeCiteModal();
});

function buildSrcHTML(ids){
  if(!ids||!ids.length) return '';
  var h='<div style="margin-top:8px;padding-top:8px;border-top:1px solid #cdd7df;">';
  h+='<div style="font-size:.62rem;color:#2c3a49;letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px;">Sources</div>';
  ids.forEach(function(id){
    var s=srcLib[id]; if(!s) return;
    if(s.url){ h+='<div style="margin-bottom:4px;"><a href="'+s.url+'" target="_blank" rel="noopener" style="font-size:.68rem;color:#0f766e;line-height:1.45;text-decoration:none;"><span style="margin-right:3px;opacity:.7;">&#8599;</span>'+s.label+'</a></div>'; }
    else { h+='<div style="margin-bottom:4px;font-size:.68rem;color:#3c4b5c;line-height:1.45;">'+s.label+'</div>'; }
  });
  return h+'</div>';
}

var drawerIdx = -1;  // index of the photo currently shown in the drawer; -1 if landmark or closed

/* Active-photo halo — a ring drawn at the lat/lon of whichever
   photo is currently shown in the drawer. Sits in the overlay
   pane (under the photo thumbnails), and pulses briefly each
   time the drawer changes photos so the visitor can see at a
   glance which marker on the map corresponds to the open photo. */
var activeHalo = L.circleMarker([0, 0], {
  radius: 32,
  color: '#0f766e',
  weight: 3,
  fillOpacity: 0,
  opacity: 0.9,
  pane: 'overlayPane',
  interactive: false,
  className: 'active-halo'
});

function _pulseActiveHalo() {
  var path = activeHalo._path;
  if (!path) return;
  path.classList.remove('halo-pulsing');
  void path.offsetWidth;       // force reflow → restarts the CSS animation
  path.classList.add('halo-pulsing');
}

function showActiveHalo(lat, lon) {
  activeHalo.setLatLng([lat, lon]);
  if (!map.hasLayer(activeHalo)) activeHalo.addTo(map);
  _pulseActiveHalo();
}

function hideActiveHalo() {
  if (map.hasLayer(activeHalo)) map.removeLayer(activeHalo);
}

function openPhotoDrawer(idx){
  var p=photoInfo[idx];
  drawerIdx=idx;
  document.getElementById('info-drawer-meta').innerHTML='<strong style="color:#5e6f82;font-size:.72rem;">'+p.file+'</strong><br><span style="font-family:monospace;">'+fmtCoords(p.lat,p.lon)+'</span>';
  var img=document.getElementById('info-drawer-img');
  img.src=CONFIG.images.web+photoInfo[idx].file; img.style.display='block';
  document.getElementById('info-drawer-caption').textContent=p.caption;
  var ctxEl=document.getElementById('info-drawer-context');
  ctxEl.innerHTML='<p style="color:#74859a;font-style:italic;">Loading…</p>';
  loadNarrative(p.file).then(function(text){ ctxEl.innerHTML = renderNarrative(text) || '<p style="color:#74859a;font-style:italic;">No narrative yet.</p>'; });
  document.getElementById('info-drawer-source').innerHTML=buildSrcHTML(p.source_ids);
  // Citation export button
  var citeEl = document.getElementById('info-drawer-cite');
  citeEl.innerHTML = '<button class="cite-button" type="button" onclick="openCiteModal(' + idx + ')">&#128221; Cite this photograph</button>';
  // Photo nav row
  document.getElementById('idn-counter').textContent=(idx+1)+' / '+photoInfo.length;
  document.getElementById('info-drawer-nav').style.display='flex';
  // Reset scroll to top so visitors see the start of each new entry
  document.getElementById('info-drawer-body').scrollTop=0;
  document.getElementById('info-drawer').classList.add('open');
  setPhotoInURL(p.file);
  showActiveHalo(p.lat, p.lon);
  showActiveViewshed(p);
}

function stepDrawer(dir){
  if(drawerIdx<0) return;
  var n=photoInfo.length;
  openPhotoDrawer((drawerIdx+dir+n)%n);
}

/* ── Wander: open a random photograph ────────────────────────
   Pan to a random photo's location and open its drawer. Avoids
   re-picking the photo currently shown so consecutive presses
   always land somewhere new.
   ────────────────────────────────────────────────────────── */
function wanderToRandomPhoto(){
  if(!CONFIG.features.wander) return;
  if(!photoInfo || photoInfo.length===0) return;
  var idx;
  if(photoInfo.length===1){
    idx = 0;
  } else {
    do { idx = Math.floor(Math.random()*photoInfo.length); }
    while (idx === drawerIdx);
  }
  var p = photoInfo[idx];
  // Dismiss the intro splash if it's still up
  if (typeof dismissIntro === 'function') {
    var intro = document.getElementById('intro-screen');
    if (intro && !intro.classList.contains('is-gone')) dismissIntro();
  }
  map.setView([p.lat, p.lon], Math.max(map.getZoom(), 17), { animate: !document.documentElement.classList.contains('rm') });
  // Briefly delay the drawer open so the pan starts visibly
  setTimeout(function(){ openPhotoDrawer(idx); }, 120);
}
function openLandmarkDrawer(lm){
  var col=SC[lm.status]||'#888';
  drawerIdx=-1;
  document.getElementById('info-drawer-meta').innerHTML=
    '<div style="font-size:.9rem;color:#1b2733;direction:rtl;text-align:right;margin-bottom:2px;">'+lm.name_ar+'</div>'+
    '<div style="font-size:.72rem;color:#46566a;margin-bottom:4px;">'+lm.name_en+'</div>'+
    '<span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:'+col+';display:inline-block;"></span><span style="font-size:.67rem;color:'+col+';">'+(SL[lm.status]||lm.status)+'</span></span>';
  var img=document.getElementById('info-drawer-img'); img.style.display='none'; img.src='';
  document.getElementById('info-drawer-caption').textContent='';
  document.getElementById('info-drawer-context').textContent=lm.desc;
  document.getElementById('info-drawer-source').innerHTML='';
  document.getElementById('info-drawer-nav').style.display='none';
  document.getElementById('info-drawer-body').scrollTop=0;
  document.getElementById('info-drawer').classList.add('open');
  clearPhotoFromURL();
  hideActiveHalo();
  hideActiveViewshed();
  hideHoverViewshed();
}
function closeDrawer(){
  drawerIdx=-1;
  document.getElementById('info-drawer').classList.remove('open');
  document.getElementById('info-drawer-img').src='';
  clearPhotoFromURL();
  hideActiveHalo();
  hideActiveViewshed();
  hideHoverViewshed();
}

var curIdx=0;
function openLightbox(idx){
  curIdx=idx; var p=photoInfo[idx];
  document.getElementById('lightbox-img').src=CONFIG.images.full+photoInfo[idx].file;
  document.getElementById('lightbox-caption-txt').textContent=p.caption;
  document.getElementById('lightbox-meta').textContent=p.file+'  \u00b7  '+fmtCoords(p.lat,p.lon)+'  \u00b7  '+(idx+1)+' of '+photoInfo.length;
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox(){
  document.getElementById('lightbox').classList.remove('open');
  document.getElementById('lightbox-img').src='';
}
document.getElementById('lightbox-close').onclick=closeLightbox;
document.getElementById('lightbox').onclick=function(e){ if(e.target===this) closeLightbox(); };
document.getElementById('prev-btn').onclick=function(e){ e.stopPropagation(); curIdx=(curIdx-1+photoInfo.length)%photoInfo.length; openLightbox(curIdx); };
document.getElementById('next-btn').onclick=function(e){ e.stopPropagation(); curIdx=(curIdx+1)%photoInfo.length; openLightbox(curIdx); };
document.addEventListener('keydown',function(e){
  // Skip when the user is typing in an input/textarea
  var ae=document.activeElement;
  if(ae && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA')) return;

  var lbOpen     = document.getElementById('lightbox').classList.contains('open');
  var drawerOpen = document.getElementById('info-drawer').classList.contains('open') && drawerIdx >= 0;

  // "W" wanders to a random photo from anywhere except the lightbox
  if((e.key==='w' || e.key==='W') && !lbOpen){ wanderToRandomPhoto(); return; }

  if(lbOpen){
    if(e.key==='Escape')     closeLightbox();
    if(e.key==='ArrowLeft'){  curIdx=(curIdx-1+photoInfo.length)%photoInfo.length; openLightbox(curIdx); }
    if(e.key==='ArrowRight'){ curIdx=(curIdx+1)%photoInfo.length; openLightbox(curIdx); }
  } else if(drawerOpen){
    if(e.key==='Escape')     closeDrawer();
    if(e.key==='ArrowLeft')  stepDrawer(-1);
    if(e.key==='ArrowRight') stepDrawer(1);
  }
});

document.addEventListener('click',function(e){
  var pel=e.target.closest('[data-idx]');
  if(pel){ var idx=parseInt(pel.dataset.idx,10); if(pel.classList.contains('popup-btn-info')||pel.classList.contains('popup-img')){ openPhotoDrawer(idx); } else { openLightbox(idx); } return; }
  var lel=e.target.closest('[data-lmid]');
  if(lel && typeof landmarks!=='undefined'){ var lm=landmarks.find(function(l){ return l.id===lel.dataset.lmid; }); if(lm) openLandmarkDrawer(lm); return; }
});

/* ── Walking trail ────────────────────────────────────────────
   A polyline connecting all photos in chronological order
   (sorted by EXIF DateTimeOriginal). Shows the path the
   photographer walked on the afternoon of 23 April 2017.
   Default off; toggled in the Layers panel. The "▶" button
   next to the toggle plays the trail back as a progressive
   reveal — segment by segment in time order.
   ──────────────────────────────────────────────────────────── */
var trailPoints = photoInfo
  .map(function (p, i) { return { idx: i, taken: p.taken_at, lat: p.lat, lon: p.lon }; })
  .filter(function (p) { return p.taken; })
  .sort(function (a, b) { return a.taken < b.taken ? -1 : 1; });

var trailLatLngs = trailPoints.map(function (p) { return [p.lat, p.lon]; });

var trailPolyline = L.polyline([], {
  color:       '#0f766e',
  weight:      2.5,
  opacity:     0.85,
  dashArray:   '6 5',
  lineCap:     'round',
  lineJoin:    'round',
  interactive: false
});

/* ── Walking-pace heatmap ───────────────────────────────────
   Each photo becomes a translucent circle weighted by how
   much time the photographer spent near it: half of (time
   from the previous photo) + (time to the next photo). Long
   gaps cap at 6 minutes so a single outlier doesn't dominate.

   Multiple overlapping low-opacity circles add up to a
   heatmap-like visual: areas with dense, dwelt-on photos
   become deeply coloured; sparse passage areas stay pale.

   Implementation note — earlier versions tried Leaflet.heat
   (the canonical heat plugin), but its 0.2.0 release dates
   from 2015 and is unreliable with Leaflet 1.9. Native
   CircleMarkers are robust and look right.
   ──────────────────────────────────────────────────────── */
function _parseExifTimestamp(s) {
  if (!s) return null;
  var parts = s.split(' ');
  if (parts.length !== 2) return null;
  var d = parts[0].split(':');
  var t = parts[1].split(':');
  return new Date(+d[0], +d[1] - 1, +d[2], +t[0], +t[1], +t[2]).getTime();
}

function _paceColor(w) {
  // Pale gold → amber → burnt orange → deep red-brown
  if (w < 0.30) return '#f0c068';
  if (w < 0.55) return '#e09848';
  if (w < 0.80) return '#c06030';
  return '#a03820';
}

function buildPaceHeatLayer() {
  var sorted = photoInfo
    .map(function (p, i) { return { idx: i, p: p, ms: _parseExifTimestamp(p.taken_at) }; })
    .filter(function (x) { return x.ms !== null; })
    .sort(function (a, b) { return a.ms - b.ms; });

  var CAP_SEC = 360;
  var circles = sorted.map(function (x, i) {
    var prev = sorted[i - 1], next = sorted[i + 1];
    var before = prev ? Math.min(CAP_SEC, (x.ms - prev.ms) / 1000) : null;
    var after  = next ? Math.min(CAP_SEC, (next.ms - x.ms) / 1000) : null;
    var weight = (before !== null && after !== null)
                 ? (before + after) / 2
                 : (before !== null ? before : (after !== null ? after : 0));
    var w = Math.max(0.1, weight / CAP_SEC);
    var color = _paceColor(w);
    var radius = 28 + w * 18;

    // Minimal options only — no interactive/pane/opacity tricks.
    // This intentionally renders in the default path pane.
    return L.circleMarker([x.p.lat, x.p.lon], {
      radius:      radius,
      fillColor:   color,
      fillOpacity: 0.40,    // bumped from 0.22 — overlapping discs were too pale
      color:       color,
      weight:      0,       // no stroke
      stroke:      false
    });
  });
  return L.layerGroup(circles);
}

var paceHeatLayer = buildPaceHeatLayer();

var trailAnimTimer = null;
var trailIsAnimating = false;

function setTrailFull() { trailPolyline.setLatLngs(trailLatLngs); }
function clearTrail()   { trailPolyline.setLatLngs([]); }

function stopTrailAnim() {
  if (trailAnimTimer) { clearTimeout(trailAnimTimer); trailAnimTimer = null; }
  trailIsAnimating = false;
  var btn = document.getElementById('btn-trail-play');
  if (btn) btn.classList.remove('is-playing');
}

function animateTrail() {
  // If already animating, stop and reset to full
  if (trailIsAnimating) {
    stopTrailAnim();
    setTrailFull();
    return;
  }
  // Ensure trail layer is on
  if (!layerState.trail) togLayer('trail');
  trailIsAnimating = true;
  var btn = document.getElementById('btn-trail-play');
  if (btn) btn.classList.add('is-playing');
  clearTrail();
  var i = 0;
  var stepMs = Math.max(60, Math.floor(8000 / trailLatLngs.length));   // ~8 s for full trail
  function step() {
    i++;
    if (i > trailLatLngs.length) { stopTrailAnim(); return; }
    trailPolyline.setLatLngs(trailLatLngs.slice(0, i));
    trailAnimTimer = setTimeout(step, stepMs);
  }
  step();
}

/* ── Depopulated Palestinian villages (Palestine Open Maps) ──
   15 depopulated villages within ~8 km of Lifta. Default off;
   toggled in the Layers panel. Status drives the colour, with
   a bold white outline and larger radius for visibility against
   any of the basemap layers (modern satellite, 1940s Mandate
   survey, RAF aerial).
   ──────────────────────────────────────────────────────────── */
var STATUS_COLORS = {
  'Depopulated':                '#c0392b',  // red — emptied, often still in ruins
  'Depopulated & built over':   '#1f1f1f',  // near-black — physically erased
  'Depopulated & appropriated': '#d68a32'   // amber-gold — taken over, intact
};

var placesMarkersArr = [];
if (typeof places !== 'undefined') places.forEach(function(p){
  var color = STATUS_COLORS[p.status] || '#888888';
  var radius = (p.type === 'City') ? 12 : 9;
  var m = L.circleMarker([p.lat, p.lon], {
    radius: radius,
    fillColor: color,
    color: '#ffffff',
    weight: 2.5,
    fillOpacity: 0.92,
    opacity: 1,
    pane: 'overlayPane'
  });
  var endTxt = p.end ? ' · ' + p.end : '';
  m.bindTooltip(
    '<div style="text-align:right;direction:rtl;font-size:.95rem;line-height:1.2;">' + p.name_ar + '</div>' +
    '<div style="font-size:.75rem;color:#46566a;">' + p.name_en + '</div>',
    {sticky:true, direction:'top', offset:[0,-6]}
  );
  m.bindPopup(
    '<div style="padding:8px 4px 2px;min-width:210px;">' +
      '<div style="font-size:1.05rem;color:#1b2733;direction:rtl;text-align:right;margin-bottom:3px;">' + p.name_ar + '</div>' +
      '<div style="font-size:.86rem;color:#2c3a49;margin-bottom:10px;">' + p.name_en + '</div>' +
      '<div style="display:inline-flex;align-items:center;gap:6px;margin-bottom:5px;">' +
        '<span style="width:11px;height:11px;border-radius:50%;background:' + color + ';display:inline-block;border:1.5px solid #fff;box-shadow:0 0 0 1px ' + color + ';"></span>' +
        '<span style="font-size:.78rem;color:' + color + ';font-weight:bold;">' + p.status + endTxt + '</span>' +
      '</div>' +
      '<div style="font-size:.7rem;color:#5e6f82;letter-spacing:.02em;">' + p.type + ' · ' + p.group + '</div>' +
    '</div>'
  );
  placesMarkersArr.push(m);
});

/* ── Oral history testimonies ────────────────────────────
   Builds one marker per entry in js/data/testimonies.js,
   with a popup that shows speaker, role, paraphrased
   notes, and a link to the full source. If audio_url is
   set, an inline <audio controls> is rendered. The layer
   is hidden by default; toggle on via the layer panel.
   ──────────────────────────────────────────────────────── */
var testimonyMarkersArr = [];
function buildTestimonyPopup(t) {
  var src = (typeof srcLib !== 'undefined') ? srcLib[t.source_id] : null;
  var srcUrl = t.source_url || (src && src.url) || '';
  // source_label overrides srcLib label — useful when citing a specific
  // article on a site we already index at a different URL.
  var srcLabel = t.source_label || (src && src.label) || (t.source_id || 'source');
  var html = '<div class="oh-pop">';
  html += '<div class="oh-speaker-ar" dir="rtl">' + (t.speaker_ar || '') + '</div>';
  html += '<div class="oh-speaker-en">' + t.speaker_en + '</div>';
  if (t.role_en) html += '<div class="oh-role">' + t.role_en + '</div>';
  if (t.excerpt) {
    html += '<blockquote class="oh-excerpt">&ldquo;' + t.excerpt + '&rdquo;</blockquote>';
  }
  if (t.notes) {
    html += '<p class="oh-notes">' + t.notes + '</p>';
  }
  if (t.audio_url) {
    html += '<audio class="oh-audio" controls preload="none" src="' + t.audio_url + '">Your browser does not support audio playback.</audio>';
  }
  if (srcUrl) {
    html += '<a class="oh-source-link" href="' + srcUrl + '" target="_blank" rel="noopener">Read full account at ' + srcLabel + ' &rsaquo;</a>';
  } else if (srcLabel) {
    html += '<div class="oh-source-link">Source: ' + srcLabel + '</div>';
  }
  if (t.location_note) {
    html += '<div class="oh-loc-note">' + t.location_note + '</div>';
  }
  html += '</div>';
  return html;
}

if (typeof testimonies !== 'undefined' && Array.isArray(testimonies)) {
  testimonies.forEach(function (t) {
    var m = L.circleMarker([t.lat, t.lon], {
      radius: 9,
      fillColor: '#2e7080',
      color: '#ffffff',
      weight: 2.5,
      fillOpacity: 0.92,
      opacity: 1,
      pane: 'overlayPane'
    });
    m.bindTooltip(
      '<div style="text-align:right;direction:rtl;font-size:.95rem;line-height:1.2;">' + (t.speaker_ar || '') + '</div>' +
      '<div style="font-size:.75rem;color:#46566a;">' + t.speaker_en + '</div>',
      { sticky: true, direction: 'top', offset: [0, -6] }
    );
    m.bindPopup(buildTestimonyPopup(t), { maxWidth: 320 });
    testimonyMarkersArr.push(m);
  });
}

/* ── Matson Collection historical photos ─────────────────
   Builds one sepia-amber marker per entry in
   js/data/matson.js. The popup shows the historical
   photograph, its LoC catalog metadata, and a "View
   nearest modern photograph" button that opens whichever
   2017 photo is spatially closest — the heart of the
   before/after comparison this layer exists to enable.
   ──────────────────────────────────────────────────────── */
var matsonMarkersArr = [];

function _findNearestModernPhoto(lat, lon) {
  if (typeof photoInfo === 'undefined' || !photoInfo.length) return -1;
  var best = -1, bestSq = Infinity;
  for (var i = 0; i < photoInfo.length; i++) {
    var p = photoInfo[i];
    if (typeof p.lat !== 'number' || typeof p.lon !== 'number') continue;
    var dLat = (p.lat - lat), dLon = (p.lon - lon);
    var sq = dLat * dLat + dLon * dLon;
    if (sq < bestSq) { bestSq = sq; best = i; }
  }
  return best;
}

// Approximate metric distance for the popup (good enough at this latitude
// for the < 500 m distances we display).
function _approxMeters(lat1, lon1, lat2, lon2) {
  var dLat = (lat2 - lat1) * 111194;
  var dLon = (lon2 - lon1) * 111194 * Math.cos(lat1 * Math.PI / 180);
  return Math.round(Math.sqrt(dLat * dLat + dLon * dLon));
}

function buildMatsonPopup(m) {
  // archive_url is the new field; loc_url kept as a fallback for older entries.
  var archiveUrl   = m.archive_url || m.loc_url || '';
  var sourceLabel  = m.source_label || 'Library of Congress';
  var nearestIdx = _findNearestModernPhoto(m.lat, m.lon);
  var nearestBtn = '';
  if (nearestIdx >= 0) {
    var np = photoInfo[nearestIdx];
    var dist = _approxMeters(m.lat, m.lon, np.lat, np.lon);
    nearestBtn =
      '<button class="mat-cta" data-idx="' + nearestIdx + '">' +
        '&rarr; View 2017 photo nearby (' + dist + ' m)' +
      '</button>';
  }
  return (
    '<div class="mat-pop">' +
      '<a class="mat-img-link" href="' + archiveUrl + '" target="_blank" rel="noopener" title="View at ' + sourceLabel + '">' +
        '<img class="mat-img" src="' + m.image_thumb + '" alt="' + m.title.replace(/"/g, '&quot;') + '" loading="lazy">' +
      '</a>' +
      '<div class="mat-title">' + m.title + '</div>' +
      '<div class="mat-meta">' +
        '<span class="mat-photog">' + m.photographer + '</span>' +
        ' &middot; <span class="mat-date">' + m.date + '</span>' +
      '</div>' +
      (m.location_note ? '<div class="mat-loc-note">' + m.location_note + '</div>' : '') +
      nearestBtn +
      '<div class="mat-links">' +
        '<a class="mat-loc-link" href="' + archiveUrl + '" target="_blank" rel="noopener">View at ' + sourceLabel + ' &rsaquo;</a>' +
      '</div>' +
      '<div class="mat-rights">' + m.rights + '</div>' +
    '</div>'
  );
}

if (typeof matsonPhotos !== 'undefined' && Array.isArray(matsonPhotos)) {
  matsonPhotos.forEach(function (m) {
    var marker = L.circleMarker([m.lat, m.lon], {
      radius: 8,
      fillColor: '#b45309',
      color: '#ffffff',
      weight: 2.5,
      fillOpacity: 0.92,
      opacity: 1,
      pane: 'overlayPane'
    });
    marker.bindTooltip(
      '<div style="font-size:.85rem;color:#1b2733;font-style:italic;">' + m.title + '</div>' +
      '<div style="font-size:.72rem;color:#74859a;">' + m.date + ' &middot; Matson</div>',
      { sticky: true, direction: 'top', offset: [0, -6] }
    );
    marker.bindPopup(function () { return buildMatsonPopup(m); }, { maxWidth: 340, minWidth: 280 });
    matsonMarkersArr.push(marker);
  });
}

// Delegated click for the "View 2017 photo nearby" button (markup is generated
// per-popup so individual onclicks are awkward; delegation handles re-renders).
document.addEventListener('click', function (e) {
  var btn = e.target.closest && e.target.closest('.mat-cta');
  if (!btn) return;
  var idx = parseInt(btn.getAttribute('data-idx'), 10);
  if (!isNaN(idx)) {
    map.closePopup();
    openPhotoDrawer(idx);
  }
});

var lmMarkersArr=[];
if (typeof landmarks !== 'undefined') landmarks.forEach(function(lm){
  var col=SC[lm.status]||'#888';
  var icon=L.divIcon({className:'',html:'<div class="lm-icon" style="background:'+col+'28;border-color:'+col+';">'+lm.emoji+'</div>',iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-20]});
  var mk=L.marker([lm.lat,lm.lon],{icon:icon,zIndexOffset:1000});
  mk.bindPopup('<div class="lm-wrap"><div class="lm-ar">'+lm.name_ar+'</div><div class="lm-en">'+lm.name_en+'</div><div class="lm-status"><div class="lm-dot" style="background:'+col+';"></div><span class="lm-status-txt" style="color:'+col+';">'+(SL[lm.status]||lm.status)+'</span></div><button class="lm-btn" data-lmid="'+lm.id+'">History &amp; context \u203a</button></div>',{maxWidth:250});
  mk.addTo(map); lmMarkersArr.push(mk);
});

var mcg=L.markerClusterGroup({
  maxClusterRadius:48,spiderfyOnMaxZoom:true,showCoverageOnHover:false,zoomToBoundsOnClick:true,
  iconCreateFunction:function(cluster){
    var n=cluster.getChildCount();
    return L.divIcon({html:'<div style="width:44px;height:44px;border-radius:4px;background:rgba(15,118,110,.92);border:2px solid rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.45);font-family:Inter,system-ui,sans-serif;font-size:.82rem;font-weight:600;color:#eef3f7;">'+n+'</div>',className:'',iconSize:[44,44],iconAnchor:[22,22]});
  }
});


photoInfo.forEach(function(p, idx){
  var arrowHTML = (typeof p.bearing === 'number')
    ? '<div class="marker-arrow" style="transform:translate(-50%,-50%) rotate(' + p.bearing + 'deg);"></div>'
    : '';
  var ic = L.divIcon({
    className: 'photo-marker',
    html: arrowHTML +
          '<div class="marker-inner"><img src="' + CONFIG.images.thumb + p.file + '" loading="lazy"><span class="marker-num">' + (idx+1) + '</span></div>',
    iconSize: [52,52], iconAnchor: [26,26], popupAnchor: [0,-30]
  });
  var mk = L.marker([p.lat, p.lon], {icon: ic});
  mk.bindPopup(
    '<img class="popup-img" src="' + CONFIG.images.web + p.file + '" data-idx="' + idx + '">' +
    '<div class="popup-caption">' + p.caption + '</div>' +
    '<div class="popup-coords">' + p.file + ' · ' + fmtCoords(p.lat, p.lon) + '</div>' +
    '<div class="popup-footer">' +
      '<button class="popup-btn popup-btn-full" data-idx="' + idx + '">Full size ↗</button>' +
      '<button class="popup-btn popup-btn-info" data-idx="' + idx + '">History &amp; context ›</button>' +
    '</div>',
    {maxWidth: 305}
  );
  // Hover (or keyboard-focus) a photo marker to reveal what its lens
  // was pointed at. The open-photo wedge persists separately.
  mk.on('mouseover focus', function(){ showHoverViewshed(p); });
  mk.on('mouseout blur',   function(){ if (drawerIdx !== idx) hideHoverViewshed(); });
  mcg.addLayer(mk);
});


map.addLayer(mcg);

/* ── Feature flags ─────────────────────────────────────────
   Hide any element tagged data-feature="X" whose CONFIG.features.X is false,
   and the language toggle when there is no second language. This is what makes
   an "off" module simply not there. Tag a new header button or Layers-panel row
   with data-feature="…" to gate it the same way. */
function applyFeatureFlags(){
  document.querySelectorAll('[data-feature]').forEach(function(el){
    var f = el.getAttribute('data-feature');
    if (!CONFIG.features[f]) el.style.display = 'none';
  });
  if (!(CONFIG.languages && CONFIG.languages.second)) {
    document.querySelectorAll('[data-lang-toggle]').forEach(function(el){ el.style.display = 'none'; });
  }
}
applyFeatureFlags();

function toggleFS(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen().catch(function(){});
  } else {
    document.exitFullscreen().catch(function(){});
  }
}
document.addEventListener('fullscreenchange',function(){
  var btn=document.getElementById('btn-fs');
  if(document.fullscreenElement){
    btn.classList.add('active'); btn.innerHTML='&#x29C9;';
    setTimeout(function(){ map.invalidateSize(); },300);
  } else {
    btn.classList.remove('active'); btn.innerHTML='&#x26F6;';
    setTimeout(function(){ map.invalidateSize(); },300);
  }
});

/* ── Permalink (?photo=IMG_1847) ──────────────────────
   When a photo's drawer opens, replace ?photo= in the
   URL with the photo's basename. When the drawer closes,
   remove it. On page load, if ?photo= is present, jump
   to that photo and open its drawer.
   ──────────────────────────────────────────────────── */

function _basename(filename){ return filename.replace(/\.[^.]+$/,''); }

function setPhotoInURL(filename){
  var url=new URL(window.location.href);
  url.searchParams.set('photo', _basename(filename));
  history.replaceState(null,'',url);
}

function clearPhotoFromURL(){
  var url=new URL(window.location.href);
  if(!url.searchParams.has('photo')) return;
  url.searchParams.delete('photo');
  history.replaceState(null,'',url);
}

function findPhotoIdxByBasename(basename){
  if(!basename) return -1;
  var lower=basename.toLowerCase();
  for(var i=0;i<photoInfo.length;i++){
    if(_basename(photoInfo[i].file).toLowerCase()===lower) return i;
  }
  return -1;
}

(function openFromPermalink(){
  var params=new URLSearchParams(window.location.search);
  var photoId=params.get('photo');
  if(!photoId) return;
  var idx=findPhotoIdxByBasename(photoId);
  if(idx<0) return;
  var p=photoInfo[idx];
  map.setView([p.lat,p.lon],18,{animate:false});
  // Small delay so cluster has rendered
  setTimeout(function(){ openPhotoDrawer(idx); }, 200);
})();

/* ══════════════════════════════════════════════════════
   Search panel
   Searches captions, filenames, and pre-loaded narratives.
   Never touches the marker cluster — that's deliberate;
   the previous attempt at search broke the map. Clicking
   a result calls openPhotoDrawer() and pans to the photo.
   ══════════════════════════════════════════════════════ */

var searchOpen = false;
var searchActiveResults = [];   // array of {idx, caption, narrative, score}

// Pre-load all narratives in the background so search is instant
prefetchNarratives(photoInfo).then(function () {
  // Once indexed, run any pending query
  if (searchOpen) runSearch();
});

function toggleSearchPanel() {
  searchOpen ? closeSearchPanel() : openSearchPanel();
}

function openSearchPanel() {
  if(!CONFIG.features.search) return;
  searchOpen = true;
  var panel = document.getElementById('search-panel');
  var btn   = document.getElementById('btn-search');
  panel.classList.add('open');
  btn.classList.add('active');
  btn.setAttribute('aria-expanded', 'true');
  setTimeout(function () { document.getElementById('search-input').focus(); }, 50);
}

function closeSearchPanel() {
  searchOpen = false;
  var panel = document.getElementById('search-panel');
  var btn   = document.getElementById('btn-search');
  panel.classList.remove('open');
  btn.classList.remove('active');
  btn.setAttribute('aria-expanded', 'false');
}

function escapeHtmlSafe(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(text, query) {
  if (!query) return escapeHtmlSafe(text);
  var safe = escapeHtmlSafe(text);
  var re = new RegExp('(' + escapeRegex(query) + ')', 'gi');
  return safe.replace(re, '<mark>$1</mark>');
}

function snippet(text, query, contextChars) {
  contextChars = contextChars || 80;
  var lower = text.toLowerCase();
  var i = lower.indexOf(query.toLowerCase());
  if (i < 0) return '';
  var start = Math.max(0, i - contextChars);
  var end   = Math.min(text.length, i + query.length + contextChars);
  var s = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  return highlightMatch(s, query).replace(/\n+/g, ' ');
}

function runSearch() {
  var input = document.getElementById('search-input');
  var status = document.getElementById('search-status');
  var resultsEl = document.getElementById('search-results');
  var q = input.value.trim();

  if (!q) {
    status.textContent = 'Type to search across the photos and their narratives.';
    resultsEl.innerHTML = '';
    searchActiveResults = [];
    return;
  }

  var qLower = q.toLowerCase();
  var hits = [];

  for (var idx = 0; idx < photoInfo.length; idx++) {
    var p = photoInfo[idx];
    var basename = p.file.replace(/\.[^.]+$/, '');
    var narrative = _narrativeCache[basename] || '';
    var captionMatch  = (p.caption  || '').toLowerCase().indexOf(qLower) >= 0;
    var fileMatch     = p.file.toLowerCase().indexOf(qLower) >= 0;
    var narrativeMatch = narrative.toLowerCase().indexOf(qLower) >= 0;

    if (captionMatch || fileMatch || narrativeMatch) {
      hits.push({
        idx: idx,
        // Caption matches rank highest, then filename, then narrative
        score: (captionMatch ? 3 : 0) + (fileMatch ? 2 : 0) + (narrativeMatch ? 1 : 0),
        captionMatch: captionMatch,
        fileMatch: fileMatch,
        narrativeMatch: narrativeMatch,
        narrative: narrative
      });
    }
  }

  hits.sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });
  searchActiveResults = hits;

  // Status text
  var indexedAll = Object.keys(_narrativeCache).length === photoInfo.length;
  var indexNote = indexedAll ? '' : ' (still indexing narratives…)';
  status.textContent = hits.length
    ? hits.length + ' result' + (hits.length === 1 ? '' : 's') + indexNote
    : 'No matches' + indexNote;

  // Render
  resultsEl.innerHTML = hits.map(function (h, n) {
    var p = photoInfo[h.idx];
    var captionHTML = highlightMatch(p.caption || '', q);
    var titleHTML   = highlightMatch(p.file + '   ·   #' + (h.idx + 1), q);
    var snippetHTML = h.narrativeMatch ? snippet(h.narrative, q) : '';
    return ''
      + '<div class="sr-item' + (n === 0 ? ' active' : '') + '" data-result-idx="' + h.idx + '" tabindex="0">'
      +   '<img class="sr-thumb" src="' + CONFIG.images.thumb + p.file + '" loading="lazy" alt="">'
      +   '<div class="sr-meta">'
      +     '<div class="sr-title">' + titleHTML + '</div>'
      +     '<div class="sr-caption">' + captionHTML + '</div>'
      +     (snippetHTML ? '<div class="sr-snippet">' + snippetHTML + '</div>' : '')
      +   '</div>'
      + '</div>';
  }).join('');
}

// Wire up the input and clicks
document.getElementById('search-input').addEventListener('input', runSearch);

document.getElementById('search-results').addEventListener('click', function (e) {
  var item = e.target.closest('.sr-item');
  if (!item) return;
  var idx = parseInt(item.getAttribute('data-result-idx'), 10);
  if (isNaN(idx)) return;
  var p = photoInfo[idx];
  // Pan to the photo (don't change zoom dramatically; keep current zoom but ensure ≥17)
  map.setView([p.lat, p.lon], Math.max(map.getZoom(), 17), { animate: !document.documentElement.classList.contains('rm') });
  openPhotoDrawer(idx);
});

// Keyboard support inside the search input
document.getElementById('search-input').addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    if (this.value) { this.value = ''; runSearch(); }
    else            { closeSearchPanel(); }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (searchActiveResults.length) {
      var first = searchActiveResults[0];
      var p = photoInfo[first.idx];
      map.setView([p.lat, p.lon], Math.max(map.getZoom(), 17), { animate: !document.documentElement.classList.contains('rm') });
      openPhotoDrawer(first.idx);
    }
  }
});

// "/" anywhere on the page focuses the search box
document.addEventListener('keydown', function (e) {
  if (e.key !== '/') return;
  var ae = document.activeElement;
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
  e.preventDefault();
  if (!searchOpen) openSearchPanel();
  else document.getElementById('search-input').focus();
});
