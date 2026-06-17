/* ── Narrative loading ──────────────────────────────────
   Each photo's historical narrative lives in
   narratives/<basename>.md  (one file per photo).
   loadNarrative(filename) returns a Promise<string>.
   renderNarrative(text)    splits on blank lines and
                            wraps each paragraph in <p>.
   ────────────────────────────────────────────────────── */

/* ── Narrative visibility ──────────────────────────────
   Narratives are visible by default. To hide them (for a
   preview without the long historical passages), load the
   site with ?narratives=off appended to the URL, or run
   toggleNarratives() from the browser console.
   ────────────────────────────────────────────────────── */
var NARRATIVES_HIDDEN = (function () {
  try {
    var params = new URLSearchParams(window.location.search);
    return params.get('narratives') === 'off';
  } catch (e) { return false; }
})();

var _narrativeCache = {};

/* Kick off fetches for every photo's narrative in the background.
   Fills _narrativeCache. Returns a Promise that resolves when all
   are done — useful if a caller wants to know when search is fully
   indexed. */
function prefetchNarratives(photos) {
  return Promise.all(photos.map(function (p) { return loadNarrative(p.file); }));
}

function loadNarrative(photoFile) {
  // photoFile is e.g. "IMG_1595.JPG"  →  narratives/IMG_1595.md
  if (NARRATIVES_HIDDEN) return Promise.resolve('');     // skip the fetch entirely
  var base = photoFile.replace(/\.[^.]+$/, '');
  var lang = (typeof siteLang !== 'undefined') ? siteLang : 'en';
  var ck = lang + ':' + base;
  if (_narrativeCache[ck] !== undefined) return Promise.resolve(_narrativeCache[ck]);

  // Arabic: try narratives/ar/<base>.md, fall back to English when the
  // Arabic file is absent or empty. English narratives are never replaced
  // by a machine translation — only by a supplied Arabic file.
  if (lang === 'ar') {
    return fetch('narratives/ar/' + base + '.md')
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (text) {
        if (text && text.trim()) { _narrativeCache[ck] = text; return text; }
        return _loadEnglishNarrative(base).then(function (en) { _narrativeCache[ck] = en; return en; });
      })
      .catch(function () { return _loadEnglishNarrative(base); });
  }
  return _loadEnglishNarrative(base);
}

function _loadEnglishNarrative(base) {
  var ck = 'en:' + base;
  if (_narrativeCache[ck] !== undefined) return Promise.resolve(_narrativeCache[ck]);
  return fetch('narratives/' + base + '.md')
    .then(function (r) { return r.ok ? r.text() : ''; })
    .then(function (text) { _narrativeCache[ck] = text; return text; })
    .catch(function () { return ''; });
}

function renderNarrative(text) {
  // Editing mode: don't show narrative text at all
  if (NARRATIVES_HIDDEN) {
    return '<p style="color:#74859a;font-style:italic;">Historical narratives are being edited and will be restored shortly.</p>';
  }
  if (!text) return '';
  // Split on one or more blank lines; render each paragraph
  var paras = text
    .split(/\n[ \t]*\n+/)
    .map(function (para) {
      var t = para.trim();
      if (!t) return '';
      // Preserve internal single-newlines as spaces (line wraps in source)
      var safe = escapeHtml(t).replace(/\n+/g, ' ');
      // Inline Markdown: **bold** then *italic*
      safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      // Citation tokens — see renderCitations() below
      safe = renderCitations(safe);
      return '<p>' + safe + '</p>';
    })
    .filter(Boolean)
    .join('');
  return paras + renderSourceList(text);
}

/* ── Source list ─────────────────────────────────────────
   Collects every citation token from the narrative text,
   deduplicates, and renders a small source list below the
   narrative paragraphs. Only tokens present in srcLib are
   shown; only the first occurrence of each token is listed.
   ──────────────────────────────────────────────────────── */
function renderSourceList(text) {
  if (!text || typeof srcLib === 'undefined') return '';
  var pattern = /\[([A-Z]{2,8})(?:\s+pp?\.\s*\d+(?:[–-]\d+)?)?\]/g;
  var seen = {};
  var items = [];
  var match;
  while ((match = pattern.exec(text)) !== null) {
    var id = match[1];
    if (seen[id] || !srcLib[id]) continue;
    seen[id] = true;
    var src = srcLib[id];
    var label = (src.label || id).replace(/"/g, '&quot;');
    if (src.url) {
      items.push('<a href="' + src.url + '" target="_blank" rel="noopener">' + label + '</a>');
    } else {
      items.push('<span>' + label + '</span>');
    }
  }
  if (!items.length) return '';
  return '<div class="narrative-sources"><ul>' +
    items.map(function (i) { return '<li>' + i + '</li>'; }).join('') +
    '</ul></div>';
}

/* ── Citation tokens ─────────────────────────────────────
   Inline references in narrative Markdown use the syntax
   [ID] or [ID p.42] where ID matches a key in srcLib (see
   js/data/sources.js). The token is rendered as a small
   superscript link to the source's URL, with the source's
   full label as a hover tooltip. Examples:

     [KH]            →  superscript "KH" linking to Khalidi
     [GOR p.27]      →  superscript "GOR p.27"
     [JUB pp.42-44]  →  superscript "JUB pp.42-44"

   Unrecognised IDs are left in place untouched (so other
   bracketed content like "[Arabs]" or "[the spring]" is
   preserved exactly as written, since it doesn't match the
   strict all-caps ID pattern).
   ──────────────────────────────────────────────────────── */
function renderCitations(html) {
  if (typeof srcLib === 'undefined') return html;
  return html.replace(
    /\[([A-Z]{2,8})((?:\s+pp?\.\s*\d+(?:[–-]\d+)?)?)\]/g,
    function (match, id, pageRef) {
      var src = srcLib[id];
      if (!src) return match;
      var label = id + (pageRef || '');
      var title = (src.label || '').replace(/"/g, '&quot;');
      if (src.url) {
        return '<sup class="cite"><a href="' + src.url + '" target="_blank" rel="noopener" title="' + title + '">' + label + '</a></sup>';
      }
      return '<sup class="cite" title="' + title + '">' + label + '</sup>';
    }
  );
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ── Developer toggle ──────────────────────────────────
   Call toggleNarratives() from the browser console to
   flip visibility on or off. Reloads the page with the
   appropriate query parameter so narratives load/unload.
   ────────────────────────────────────────────────────── */
function toggleNarratives() {
  var url = new URL(window.location.href);
  if (NARRATIVES_HIDDEN) {
    url.searchParams.delete('narratives');     // back to default (visible)
  } else {
    url.searchParams.set('narratives', 'off'); // hide
  }
  window.location.href = url.toString();
}
