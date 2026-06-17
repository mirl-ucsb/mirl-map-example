var lbIdx = 0;

/* Localized chrome label: the second language from the dictionary when that
   language is active, otherwise the default-language fallback passed in. */
function gT(key, en) {
  var sc = (typeof CONFIG !== 'undefined' && CONFIG.languages && CONFIG.languages.second) ? CONFIG.languages.second.code : null;
  if (sc && typeof siteI18N !== 'undefined' && typeof siteLang !== 'undefined' &&
      siteLang === sc && siteI18N[key] && siteI18N[key][sc]) {
    return siteI18N[key][sc];
  }
  return en;
}

function fmtCoords(lat, lon) {
  return lat.toFixed(6) + '\u00b0N,\u2009' + lon.toFixed(6) + '\u00b0E';
}

function buildSources(ids) {
  if (!ids || !ids.length || typeof srcLib === 'undefined') return '';
  var links = ids.map(function(id) {
    var s = srcLib[id];
    if (!s) return '';
    if (s.url) {
      return '<a class="g-source-link" href="' + s.url + '" target="_blank" rel="noopener">' + s.label + '</a>';
    }
    return '<span class="g-source-plain">' + s.label + '</span>';
  }).filter(Boolean).join('');
  return '<div class="g-sources"><span class="g-source-label">' + gT('g.sources', 'Sources') + '</span>' + links + '</div>';
}

function openLb(idx) {
  lbIdx = idx;
  var p = photoInfo[idx];
  document.getElementById('lb-img').src = CONFIG.images.full + p.file;
  document.getElementById('lb-caption').textContent = p.caption;
  document.getElementById('lb').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLb() {
  document.getElementById('lb').classList.remove('open');
  document.getElementById('lb-img').src = '';
  document.body.style.overflow = '';
}

function stepLb(dir) {
  lbIdx = (lbIdx + dir + photoInfo.length) % photoInfo.length;
  var p = photoInfo[lbIdx];
  document.getElementById('lb-img').src = CONFIG.images.full + p.file;
  document.getElementById('lb-caption').textContent = p.caption;
}

document.addEventListener('keydown', function(e) {
  if (!document.getElementById('lb').classList.contains('open')) return;
  if (e.key === 'Escape')     closeLb();
  if (e.key === 'ArrowLeft')  stepLb(-1);
  if (e.key === 'ArrowRight') stepLb(1);
});

document.getElementById('lb').addEventListener('click', function(e) {
  if (e.target === this) closeLb();
});

// Build the gallery
var grid = document.getElementById('gallery-grid');

photoInfo.forEach(function(p, idx) {
  var entry = document.createElement('div');
  entry.className = 'g-entry';
  entry.id = 'g-entry-' + idx;

  entry.innerHTML =
    '<div class="g-photo-wrap" onclick="openLb(' + idx + ')">' +
      '<img src="' + CONFIG.images.web + p.file + '" alt="' + p.caption.replace(/"/g, '&quot;') + '" loading="lazy">' +
      '<span class="g-photo-num">' + (idx + 1) + ' / ' + photoInfo.length + '</span>' +
    '</div>' +
    '<div class="g-caption">' + p.caption + '</div>' +
    (p.lat ? '<div class="g-coords">' + fmtCoords(p.lat, p.lon) + ' &nbsp;&middot;&nbsp; ' + p.file + '</div>' : '') +
    '<div class="g-context"></div>' +
    buildSources(p.source_ids);

  grid.appendChild(entry);

  // Fetch narrative and populate when ready
  loadNarrative(p.file).then(function(text) {
    var ctx = entry.querySelector('.g-context');
    ctx.innerHTML = renderNarrative(text);
  });
});

/* When the interface language changes, re-render each entry's narrative
   (Arabic file if one has been supplied, otherwise the English fallback)
   and relabel its source list. The static chrome is handled by
   applyI18N in js/i18n.js. */
window.onLangChange = function () {
  photoInfo.forEach(function (p, idx) {
    var entry = document.getElementById('g-entry-' + idx);
    if (!entry) return;
    loadNarrative(p.file).then(function (text) {
      var ctx = entry.querySelector('.g-context');
      if (ctx) ctx.innerHTML = renderNarrative(text);
    });
    var lbl = entry.querySelector('.g-source-label');
    if (lbl) lbl.textContent = gT('g.sources', 'Sources');
  });
};

/* ── Permalink (?photo=IMG_1847) ──────────────────────
   On page load, if the URL has ?photo=IMG_xxxx, scroll
   that entry into view and briefly highlight it.
   ──────────────────────────────────────────────────── */

(function gotoFromPermalink(){
  var params=new URLSearchParams(window.location.search);
  var photoId=params.get('photo');
  if(!photoId) return;
  var lower=photoId.toLowerCase();
  for(var i=0;i<photoInfo.length;i++){
    var base=photoInfo[i].file.replace(/\.[^.]+$/,'').toLowerCase();
    if(base===lower){
      // Wait a tick so all entries are in the DOM and image layout settles
      setTimeout(function(idx){
        return function(){
          var el=document.getElementById('g-entry-'+idx);
          if(!el) return;
          el.scrollIntoView({behavior:'smooth',block:'start'});
          el.classList.add('g-highlight');
          setTimeout(function(){ el.classList.remove('g-highlight'); },2200);
        };
      }(i), 100);
      break;
    }
  }
})();

/* ── Scrollytelling mini-map ──────────────────────────────
   Binds the essay to the map: a fixed mini-map follows the
   photograph you are reading, flying to its standpoint and
   drawing its view cone (camera bearing x EXIF field of
   view). When a Lifta Voice is anchored near that standpoint,
   the voice surfaces beside the map: testimony returned to
   place. Degrades gracefully if Leaflet failed to load.
   ──────────────────────────────────────────────────────── */
(function scrollyMap(){
  var mapEl = document.getElementById('scrolly-map');
  if (!mapEl || typeof L === 'undefined' || typeof photoInfo === 'undefined') return;

  function offsetLatLon(lat, lon, bearingDeg, distM){
    var rad = bearingDeg * Math.PI / 180;
    var dLat = (distM * Math.cos(rad)) / 111194;
    var dLon = (distM * Math.sin(rad)) / (111194 * Math.cos(lat * Math.PI / 180));
    return [lat + dLat, lon + dLon];
  }
  function wedgeCoords(p){
    if (typeof p.bearing !== 'number' || typeof p.fov !== 'number') return null;
    var half = p.fov / 2, lenM = 50, arc = [];
    for (var i = 0; i <= 5; i++){
      var b = p.bearing - half + (i / 5) * p.fov;
      arc.push(offsetLatLon(p.lat, p.lon, b, lenM));
    }
    return [[p.lat, p.lon]].concat(arc);
  }
  function distM(la1, lo1, la2, lo2){
    var dy = (la1 - la2) * 111194;
    var dx = (lo1 - lo2) * 111194 * Math.cos(la1 * Math.PI / 180);
    return Math.sqrt(dx*dx + dy*dy);
  }
  function nearestVoice(p){
    if (typeof testimonies === 'undefined') return null;
    var best = null, bd = 1e9;
    testimonies.forEach(function(t){
      if (typeof t.lat !== 'number') return;
      var d = distM(p.lat, p.lon, t.lat, t.lon);
      if (d < bd){ bd = d; best = t; }
    });
    return (best && bd <= 120) ? best : null;   // within ~120 m of the standpoint
  }

  var smap = L.map(mapEl, {
    zoomControl: false, attributionControl: false,
    dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
    boxZoom: false, keyboard: false, touchZoom: false
  }).setView(CONFIG.map.center, Math.max(2, (CONFIG.map.zoom || 16) - 1));

  // Base layer from CONFIG (the default base, or the first non-localized base).
  // Google tiles are deliberately not used; OSM / Esri are the terms-clean defaults.
  var _sbl  = (CONFIG.baseLayers || []).filter(function(s){ return !s.langVariants; });
  var _sspec = _sbl.filter(function(s){ return s.id === CONFIG.map.defaultBase; })[0] || _sbl[0] ||
               { url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', subdomains:['a','b','c'], maxZoom:19 };
  var _sopts = { maxZoom: _sspec.maxZoom || 19 };
  if (_sspec.subdomains) _sopts.subdomains = _sspec.subdomains;
  L.tileLayer(_sspec.url, _sopts).addTo(smap);

  var cone = L.polygon([], {
    color: '#d97706', weight: 1, opacity: 0.85,
    fillColor: '#f59e0b', fillOpacity: 0.30, interactive: false
  }).addTo(smap);
  var dot = L.circleMarker(CONFIG.map.center, {
    radius: 5, color: '#fff', weight: 2, fillColor: '#0f766e', fillOpacity: 1, interactive: false
  }).addTo(smap);

  var panel  = document.getElementById('scrolly');
  var voiceEl= document.getElementById('scrolly-voice');
  var capTxt = document.getElementById('scrolly-cap-txt');
  var openLk = document.getElementById('scrolly-open');
  var curIdx = -1;

  function activate(idx){
    if (idx === curIdx) return;
    curIdx = idx;
    var p = photoInfo[idx];
    if (!p || typeof p.lat !== 'number') return;
    panel.classList.add('on');
    panel.setAttribute('aria-hidden', 'false');
    var rm = document.documentElement.classList.contains('rm');
    smap.setView([p.lat, p.lon], 17, { animate: !rm });
    var w = wedgeCoords(p);
    cone.setLatLngs(w || []);
    dot.setLatLng([p.lat, p.lon]);
    capTxt.textContent = (idx + 1) + ' / ' + photoInfo.length;
    openLk.href = 'index.html?photo=' + p.file.replace(/\.[^.]+$/, '');
    // Spatialized testimony
    var t = nearestVoice(p);
    if (t){
      var url = t.source_url || (typeof srcLib !== 'undefined' && srcLib[t.source_id] && srcLib[t.source_id].url) || '';
      var lbl = t.source_label || (typeof srcLib !== 'undefined' && srcLib[t.source_id] && srcLib[t.source_id].label) || 'source';
      voiceEl.innerHTML =
        '<div class="sv-mark">A voice, near here</div>' +
        (t.excerpt ? '<blockquote>“' + t.excerpt + '”</blockquote>' : '') +
        '<div class="sv-who">' + t.speaker_en + (t.role_en ? ', <span>' + t.role_en + '</span>' : '') + '</div>' +
        (url ? '<a class="sv-src" href="' + url + '" target="_blank" rel="noopener">' + lbl + '</a>' : '');
      voiceEl.classList.remove('sv-hidden');
    } else {
      voiceEl.classList.add('sv-hidden');
      voiceEl.innerHTML = '';
    }
    setTimeout(function(){ smap.invalidateSize(); }, 60);
  }

  // The entry crossing the central horizontal band is the active one.
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting){
        var idx = parseInt(e.target.id.replace('g-entry-', ''), 10);
        if (!isNaN(idx)) activate(idx);
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

  for (var i = 0; i < photoInfo.length; i++){
    var el = document.getElementById('g-entry-' + i);
    if (el) io.observe(el);
  }
  // Show the panel for the first photo on load, and fix sizing once laid out.
  setTimeout(function(){ smap.invalidateSize(); activate(0); }, 350);
})();
