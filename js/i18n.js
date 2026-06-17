/* ── Bilingual UI runtime ────────────────────────────────
   The interface can run in two languages: CONFIG.languages.default and an
   optional CONFIG.languages.second ({ code, rtl, label }). The DEFAULT
   language is the source of truth, captured live from the DOM, so this layer
   can never alter it. The SECOND language is drawn from the dictionary in
   js/data/i18n.js (siteI18N), keyed by the second language's `code` (e.g.
   "ar", "es"). Elements opt in with data-i18n / data-i18n-html /
   data-i18n-{title,placeholder,aria-label}.

   When CONFIG.languages.second is null this is a no-op single-language runtime
   and the toggle buttons are hidden (see the language gating in map.js /
   gallery.js). RTL is engaged only when the second language sets rtl:true and
   is active.

   The chosen language persists in localStorage under
   "<storagePrefix>-lang" and is shared across both pages. Pages may set
   window.onLangChange(lang) to refresh dynamic content (e.g. re-render an open
   photo narrative in the new language).
   ─────────────────────────────────────────────────────── */

var _LANGS   = (typeof CONFIG !== 'undefined' && CONFIG.languages) || { default: 'en', second: null };
var _DEFAULT = _LANGS.default || 'en';
var _SECOND  = _LANGS.second || null;                 // { code, rtl, label } or null
var _SECOND_CODE = _SECOND ? _SECOND.code : null;

var LANG_KEY = ((typeof CONFIG !== 'undefined' && CONFIG.site && CONFIG.site.storagePrefix) || 'site') + '-lang';
var siteLang = _DEFAULT;

function _isSecond(l) { return !!_SECOND_CODE && l === _SECOND_CODE; }
function _dir(l)      { return (_isSecond(l) && _SECOND.rtl) ? 'rtl' : 'ltr'; }

(function () {
  try {
    var s = localStorage.getItem(LANG_KEY);
    if (s === _DEFAULT || _isSecond(s)) siteLang = s;
  } catch (e) {}
  // Set direction/lang immediately (the inline <head> script may have already
  // done this to avoid a flash; setting again is harmless).
  document.documentElement.setAttribute('lang', siteLang);
  document.documentElement.setAttribute('dir', _dir(siteLang));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { applySiteMeta(); buildLangButtons(); applyI18N(); syncLangButtons(); });
  } else {
    applySiteMeta();
    buildLangButtons();
    applyI18N();
    syncLangButtons();
  }
})();

/* Sync the visible chrome from CONFIG.site: the tab title, any element tagged
   data-site-title (the header H1), and data-site-title-alt (optional second
   script shown beside it). Keeps js/config.js the single source of truth. */
function applySiteMeta() {
  if (typeof CONFIG === 'undefined' || !CONFIG.site) return;
  if (CONFIG.site.title) document.title = CONFIG.site.title;
  document.querySelectorAll('[data-site-title]').forEach(function (el) { el.textContent = CONFIG.site.title; });
  document.querySelectorAll('[data-site-title-alt]').forEach(function (el) {
    el.textContent = CONFIG.site.titleAlt || '';
    if (!CONFIG.site.titleAlt) el.style.display = 'none';
  });
}

/* Build the language toggle from CONFIG into the #lang-btns container. With no
   second language, the whole toggle group is hidden. */
function buildLangButtons() {
  var wrap = document.getElementById('lang-btns');
  if (!wrap) return;
  if (!_SECOND) {
    var grp = wrap.closest('[data-lang-toggle]') || wrap;
    grp.style.display = 'none';
    return;
  }
  var langs = [{ code: _DEFAULT, label: (_LANGS.defaultLabel || _DEFAULT) },
               { code: _SECOND.code, label: (_SECOND.label || _SECOND.code) }];
  wrap.innerHTML = langs.map(function (l) {
    return '<button class="layer-btn' + (l.code === siteLang ? ' active' : '') +
           '" data-lang-btn="' + l.code + '" onclick="applyLang(\'' + l.code + '\')">' + l.label + '</button>';
  }).join('');
}

/* Second-language string for a key, or null (→ keep the default-language original). */
function _secondStr(key) {
  if (!_SECOND_CODE || typeof siteI18N === 'undefined') return null;
  var e = siteI18N[key];
  return (e && e[_SECOND_CODE]) ? e[_SECOND_CODE] : null;
}

/* Apply the current language across the DOM. The default language restores the
   captured original; the second language uses the dictionary (falling back to
   the original when no translation exists). */
function applyI18N() {
  var sec = _isSecond(siteLang);

  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    if (el._i18nText == null) el._i18nText = el.textContent;
    var v = sec ? _secondStr(el.getAttribute('data-i18n')) : null;
    el.textContent = (v != null) ? v : el._i18nText;
  });

  document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
    if (el._i18nHTML == null) el._i18nHTML = el.innerHTML;
    var v = sec ? _secondStr(el.getAttribute('data-i18n-html')) : null;
    el.innerHTML = (v != null) ? v : el._i18nHTML;
  });

  ['title', 'placeholder', 'aria-label'].forEach(function (attr) {
    var store = '_i18nAttr_' + attr;
    document.querySelectorAll('[data-i18n-' + attr + ']').forEach(function (el) {
      if (el[store] == null) el[store] = el.getAttribute(attr) || '';
      var v = sec ? _secondStr(el.getAttribute('data-i18n-' + attr)) : null;
      el.setAttribute(attr, (v != null) ? v : el[store]);
    });
  });
}

/* Reflect the active language on any language toggle buttons. */
function syncLangButtons() {
  document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
    var on = b.getAttribute('data-lang-btn') === siteLang;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

/* Shared language switch: persistence + direction + chrome.
   The map's setLang() calls this in addition to swapping tiles;
   the gallery's toggle calls it directly. */
function applyLang(l) {
  if (l !== _DEFAULT && !_isSecond(l)) return;
  siteLang = l;
  try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
  document.documentElement.setAttribute('lang', l);
  document.documentElement.setAttribute('dir', _dir(l));
  applyI18N();
  syncLangButtons();
  if (typeof window.onLangChange === 'function') {
    try { window.onLangChange(l); } catch (e) {}
  }
}
