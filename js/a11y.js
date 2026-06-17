/* ── Accessibility settings ──────────────────────────
   Persisted in localStorage under "<storagePrefix>-a11y".
   Applied as classes on <html> and a font-size on :root.
   ─────────────────────────────────────────────────── */

var A11Y_KEY = ((typeof CONFIG !== 'undefined' && CONFIG.site && CONFIG.site.storagePrefix) || 'site') + '-a11y';

var FONT_STEPS = [
  { label: 'A',  size: 14, key: 'small'  },
  { label: 'A',  size: 16, key: 'normal' },
  { label: 'A',  size: 19, key: 'large'  },
  { label: 'A',  size: 22, key: 'xlarge' }
];

var a11yState = {
  fontSize:     'normal',   // small | normal | large | xlarge
  highContrast: false,
  reduceMotion: false
};

/* ── Load & apply on page load ───────────────────────── */

(function () {
  try {
    var saved = JSON.parse(localStorage.getItem(A11Y_KEY));
    if (saved) Object.assign(a11yState, saved);
  } catch (e) {}
  applyAll();
})();

function applyAll() {
  applyFontSize();
  applyHighContrast();
  applyReduceMotion();
  syncPanel();
}

function saveState() {
  try { localStorage.setItem(A11Y_KEY, JSON.stringify(a11yState)); } catch (e) {}
}

/* ── Font size ───────────────────────────────────────── */

function applyFontSize() {
  var step = FONT_STEPS.find(function (s) { return s.key === a11yState.fontSize; }) || FONT_STEPS[1];
  document.documentElement.style.fontSize = step.size + 'px';
}

function setFontSize(key) {
  a11yState.fontSize = key;
  applyFontSize();
  saveState();
  syncPanel();
}

/* ── High contrast ───────────────────────────────────── */

function applyHighContrast() {
  document.documentElement.classList.toggle('hc', a11yState.highContrast);
}

function toggleHighContrast() {
  a11yState.highContrast = !a11yState.highContrast;
  applyHighContrast();
  saveState();
  syncPanel();
}

/* ── Reduce motion ───────────────────────────────────── */

function applyReduceMotion() {
  document.documentElement.classList.toggle('rm', a11yState.reduceMotion);
}

function toggleReduceMotion() {
  a11yState.reduceMotion = !a11yState.reduceMotion;
  applyReduceMotion();
  saveState();
  syncPanel();
}

/* ── Panel open/close ────────────────────────────────── */

var a11yOpen = false;

function toggleA11y() {
  a11yOpen = !a11yOpen;
  var panel = document.getElementById('a11y-panel');
  var btn   = document.getElementById('btn-a11y');
  panel.classList.toggle('open', a11yOpen);
  btn.classList.toggle('active', a11yOpen);
  btn.setAttribute('aria-expanded', String(a11yOpen));
  if (a11yOpen) {
    // Focus first interactive element inside panel
    var first = panel.querySelector('button:not([disabled])');
    if (first) first.focus();
  }
}

function closeA11y() {
  if (!a11yOpen) return;
  a11yOpen = false;
  document.getElementById('a11y-panel').classList.remove('open');
  var btn = document.getElementById('btn-a11y');
  btn.classList.remove('active');
  btn.setAttribute('aria-expanded', 'false');
  btn.focus();
}

/* ── Sync panel UI to state ──────────────────────────── */

function syncPanel() {
  // Font size buttons
  FONT_STEPS.forEach(function (step) {
    var el = document.getElementById('fs-btn-' + step.key);
    if (!el) return;
    var active = step.key === a11yState.fontSize;
    el.classList.toggle('active', active);
    el.setAttribute('aria-pressed', String(active));
  });

  // Toggles
  setToggleState('toggle-hc', a11yState.highContrast);
  setToggleState('toggle-rm', a11yState.reduceMotion);
}

function setToggleState(id, on) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('on', on);
  el.setAttribute('aria-checked', String(on));
  el.setAttribute('aria-pressed', String(on));
}

/* ── Close panel on outside click or Escape ─────────── */

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && a11yOpen) closeA11y();
});

document.addEventListener('click', function (e) {
  if (!a11yOpen) return;
  var panel = document.getElementById('a11y-panel');
  var btn   = document.getElementById('btn-a11y');
  if (panel && !panel.contains(e.target) && e.target !== btn) closeA11y();
});
